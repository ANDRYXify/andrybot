// web.js — una finestra su internet che RISPONDE, non che descrive.
//
// Com'era. Cercava su Wikipedia e restituiva l'introduzione della prima pagina
// trovata. Misurato: a «capitale della Francia» rispondeva «La Francia è il
// terzo Paese più esteso d'Europa, 544000 km²», e a «ricetta carbonara» che la
// carbonara è un simbolo culinario di Roma. Descriveva il sostantivo.
//
// Non è un dettaglio di qualità: questi pezzi di testo finiscono nel prompt del
// modello, e finiscono anche nella conoscenza salvata quando il bot colma da solo
// le sue lacune. Un giro che impara rumore non migliora girando più volte:
// diventa più sicuro di sé.
//
// Com'è adesso, in tre strade, dalla più esatta alla più generica:
//
//  1. FATTO PRECISO (Wikidata). «capitale della Francia» è una proprietà di
//     un'entità, e Wikidata la sa: torna «Parigi», senza modello di mezzo.
//     Le proprietà sono FISSATE per identificatore e non cercate per nome:
//     cercando «autore» l'API restituisce P2093 («nome dell'autore», una
//     stringa) invece di P50 («autore»), e una risposta esatta ma sbagliata è
//     peggio di nessuna risposta.
//
//  2. RISPOSTA SECCA (DuckDuckGo Instant Answer), quando ce l'ha.
//
//  3. IL PASSO GIUSTO DELLA PAGINA (Wikipedia). Non l'introduzione: si prende
//     l'articolo a sezioni, si sceglie la sezione che la domanda nomina
//     («ingredienti», «preparazione» se la domanda dice «ricetta») e dentro
//     quella le frasi che contengono le parole della domanda.
//
// E se niente raggiunge un punteggio decente, torna null. Meglio il silenzio.
//
// Il testo che torna è un RIFERIMENTO, non la verità: va trattato con giudizio e
// MAI come istruzioni (il cervello lo riceve con un avviso anti-manipolazione).
// Non lancia.
import { makeLog } from '../logger.js';

const log = makeLog('web');
const TIMEOUT = 6000;
const UA = 'SocialBot/1.0 (+https://andryxify.it)';

function _pulisci(s, max = 500) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Il tempo d'attesa cambia col posto: in chat pubblica una risposta lenta e' una
// risposta persa, in un messaggio privato si puo' aspettare. Viaggia per
// parametro invece di stare in una variabile globale, se no due chiamate
// contemporanee si pestano i piedi.
async function _json(url, attesa = TIMEOUT) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), attesa);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': UA } });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { log.debug('fetch:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// --------------------------------------------------------------- le parole
// Parole che non dicono niente su cosa si cerca: non devono pesare nel
// punteggio, se no «della» vale quanto «capitale».
const VUOTE = new Set(('il lo la i gli le un uno una di del dello della dei degli delle da dal dalla in nel nella con su sul sulla per tra fra e o ma se che chi cosa come quando dove quanto quale qual è e\' sono era essere ha ha\' hanno avere mi ti si ci vi ne non piu\' più molto tutto tutti bot ciao grazie mi dici sai dimmi').split(' '));

export function paroleChiave(testo) {
  return String(testo || '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter((p) => p.length > 2 && !VUOTE.has(p));
}

// --------------------------------------------------------------- 1. Wikidata
// Le proprietà si scrivono qui, per identificatore. È un elenco corto di
// proposito: ogni riga è una domanda che il bot sa rispondere ESATTAMENTE, e
// una riga sbagliata è peggio di una riga che manca.
const PROPRIETA = [
  [/^capitale$/, 'P36'], [/^regista$/, 'P57'], [/^autore|autrice$/, 'P50'],
  [/^scrittore|scritto da$/, 'P50'], [/^popolazione|abitanti$/, 'P1082'],
  [/^valuta|moneta$/, 'P38'], [/^lingua|lingua ufficiale$/, 'P37'],
  [/^continente$/, 'P30'], [/^inventore$/, 'P61'], [/^fondatore$/, 'P112'],
  [/^altezza$/, 'P2048'], [/^compositore$/, 'P86'], [/^allenatore$/, 'P286'],
];

// «(qual è) la capitale della Francia» → { prop: 'capitale', ente: 'Francia' }
// «dell'Italia» non ha lo spazio dopo l'apostrofo, e pretenderlo faceva fallire
// meta' delle domande italiane. Dopo le forme con l'apostrofo lo spazio e' facoltativo.
const DOMANDA_PROPRIETA = /^(?:qual\s*(?:'|è|e)\s*)?(?:la|il|lo|l')?\s*([a-zà-ù ]{3,30}?)\s+(?:(?:di|del|dello|della|dei|degli|delle)\s+|(?:dell'|dei|del)\s*|dell'\s*)(.{2,60})$/i;

export function scomponi(domanda) {
  const q = String(domanda || '').toLowerCase().replace(/[?!.]+$/, '').trim();
  const m = DOMANDA_PROPRIETA.exec(q);
  if (!m) return null;
  const prop = m[1].trim();
  const pid = PROPRIETA.find(([re]) => re.test(prop))?.[1];
  return pid ? { prop, pid, ente: m[2].trim() } : null;
}

const WD = 'https://www.wikidata.org/w/api.php';

async function _wikidata(domanda, attesa) {
  const pezzi = scomponi(domanda);
  if (!pezzi) return null;
  const e = await _json(`${WD}?action=wbsearchentities&format=json&language=it&uselang=it&type=item&limit=1&search=${encodeURIComponent(pezzi.ente)}`, attesa);
  const qid = e?.search?.[0]?.id;
  if (!qid) return null;
  const nome = e.search[0].label || pezzi.ente;
  const d = await _json(`${WD}?action=wbgetclaims&format=json&entity=${qid}&property=${pezzi.pid}`, attesa);
  // Un'entita' puo' avere piu' valori per la stessa proprieta': la popolazione
  // dell'Italia ne ha uno per censimento, e il primo dell'elenco e' del 1971.
  // Wikidata dice qual e' quello valido adesso col rango «preferito»: prenderlo
  // a caso vorrebbe dire essere precisi e sbagliati, che e' peggio che tacere.
  const tutte = d?.claims?.[pezzi.pid] || [];
  const scelta = tutte.find((c) => c.rank === 'preferred') || tutte[tutte.length - 1] || tutte[0];
  const v = scelta?.mainsnak?.datavalue?.value;
  if (v == null) return null;
  if (v.id) {
    const l = await _json(`${WD}?action=wbgetentities&format=json&props=labels&languages=it&ids=${v.id}`, attesa);
    const et = l?.entities?.[v.id]?.labels?.it?.value;
    return et ? `${pezzi.prop} di ${nome}: ${et}` : null;
  }
  if (v.amount) return `${pezzi.prop} di ${nome}: ${String(v.amount).replace(/^\+/, '')}`;
  if (v.time) return `${pezzi.prop} di ${nome}: ${String(v.time).slice(1, 11)}`;
  if (typeof v === 'string') return `${pezzi.prop} di ${nome}: ${v}`;
  return null;
}

// --------------------------------------------------------------- 2. DDG
async function _ddg(query, attesa) {
  const d = await _json('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=' + encodeURIComponent(query), attesa);
  const t = d?.Answer || d?.AbstractText || '';
  return t && String(t).trim() ? _pulisci(t) : null;
}

// --------------------------------------------------------------- 3. Wikipedia
// L'estratto arriva a sezioni: «== Titolo ==» separa i pezzi.
export function sezioni(estratto) {
  const testo = String(estratto || '');
  const out = [];
  const re = /^==+\s*([^=]+?)\s*==+\s*$/gm;
  let ultimo = 0, titolo = '';
  let m;
  while ((m = re.exec(testo))) {
    const corpo = testo.slice(ultimo, m.index).trim();
    if (corpo) out.push({ titolo, corpo });
    titolo = m[1].trim();
    ultimo = m.index + m[0].length;
  }
  const coda = testo.slice(ultimo).trim();
  if (coda) out.push({ titolo, corpo: coda });
  return out;
}

// Quanto una frase c'entra con la domanda: quante delle sue parole compaiono.
export function punteggio(frase, chiavi) {
  if (!chiavi.length) return 0;
  const f = String(frase || '').toLowerCase();
  let n = 0;
  for (const k of chiavi) if (f.includes(k)) n++;
  return n / chiavi.length;
}

// Le sezioni che una domanda NOMINA: «ricetta» chiede ingredienti e preparazione.
const SEZIONI_CHIESTE = [
  [/ricett|come si (?:fa|prepara)|ingredient|preparazion/i, /ingredient|preparazion|ricett|procedimento/i],
  [/storia|origin/i, /storia|origin/i],
  [/curiosit/i, /curiosit|aneddot/i],
];

export function scegliPasso(estratto, domanda, max = 480) {
  const chiavi = paroleChiave(domanda);
  const sez = sezioni(estratto);
  if (!sez.length) return null;
  const chiesta = SEZIONI_CHIESTE.find(([q]) => q.test(domanda))?.[1] || null;
  const pesate = sez.map((s) => {
    const perTitolo = chiesta && chiesta.test(s.titolo) ? 1 : 0;
    return { ...s, peso: perTitolo * 2 + punteggio(s.corpo, chiavi) };
  }).sort((a, b) => b.peso - a.peso);
  const scelta = pesate[0];
  if (!scelta) return null;
  // dentro la sezione, la finestra di frasi che contiene di più la domanda
  const frasi = scelta.corpo.split(/(?<=[.!?])\s+/).filter((f) => f.trim().length > 15);
  if (!frasi.length) return null;
  let migliore = 0, meglio = -1;
  for (let i = 0; i < frasi.length; i++) {
    const finestra = frasi.slice(i, i + 3).join(' ');
    const p = punteggio(finestra, chiavi) + (chiesta && chiesta.test(scelta.titolo) ? 0.5 : 0);
    if (p > migliore) { migliore = p; meglio = i; }
  }
  if (meglio < 0) { meglio = 0; migliore = punteggio(frasi.slice(0, 3).join(' '), chiavi); }
  // niente aggancio con la domanda: meglio non rispondere che rispondere a caso
  if (migliore <= 0) return null;
  let out = '';
  for (const f of frasi.slice(meglio, meglio + 3)) {
    if ((out + ' ' + f).trim().length > max) break;
    out = (out + ' ' + f).trim();
  }
  return out || _pulisci(frasi[meglio], max);
}

const WP = 'https://it.wikipedia.org/w/api.php';
const WB = 'https://it.wikibooks.org/w/api.php';

// Wikipedia e' un'enciclopedia, non un ricettario: la pagina «Pasta alla
// carbonara» ha una sola sezione, «Origine», e gli ingredienti non ci sono.
// Misurato — nessun recupero migliore puo' tirare fuori quello che non c'e'.
// Il ricettario e' su Wikibooks, e li' ingredienti e preparazione ci sono.
const CHIEDE_RICETTA = /ricett|come si (?:fa|prepara|cucina)|ingredient/i;

// Da una domanda si toglie la parte che chiede, e resta il piatto:
// «ricetta della carbonara» → «carbonara».
const SOLO_PIATTO = /^\s*(?:qual\s*(?:'|è|e)\s*)?(?:la|il|lo|l')?\s*(?:ricetta|ingredienti|preparazione)\s*(?:di|del|dello|della|dei|degli|delle|dell'|per)?\s*/i;

async function _ricettario(query, attesa) {
  if (!CHIEDE_RICETTA.test(query)) return null;
  const piatto = String(query).replace(SOLO_PIATTO, '').replace(/[?!.]+$/, '').trim();
  if (piatto.length < 3) return null;
  const s = await _json(`${WB}?action=query&list=search&format=json&srlimit=3&srsearch=${encodeURIComponent(piatto)}`, attesa);
  const titoli = (s?.query?.search || []).map((x) => x.title).filter(Boolean);
  const chiavi = paroleChiave(piatto);
  titoli.sort((a, b) => punteggio(b, chiavi) - punteggio(a, chiavi));
  for (const t of titoli.slice(0, 2)) {
    const e = await _json(`${WB}?action=query&format=json&prop=extracts&explaintext=1&exchars=4000&redirects=1&titles=${encodeURIComponent(t)}`, attesa);
    const estratto = Object.values(e?.query?.pages || {})[0]?.extract || '';
    if (!estratto) continue;
    // qui la sezione che serve la sappiamo per nome, non serve indovinarla
    const sez = sezioni(estratto);
    const ing = sez.find((x) => /ingredient/i.test(x.titolo));
    const prep = sez.find((x) => /preparazion|procediment/i.test(x.titolo));
    // In chat non ci sta un muro di testo, e questo materiale va al modello che
    // poi lo dice con parole sue: gli ingredienti bastano, la preparazione si
    // riduce alla prima riga. Piu' roba non fa una risposta migliore, fa una
    // risposta lunga — e su un modello piccolo la fa anche peggiore.
    const primaFrase = (t) => String(t || '').split(/(?<=[.!?])\s+|\n/)[0] || '';
    const pezzi = [
      ing && `ingredienti: ${_pulisci(ing.corpo, 200)}`,
      prep && `in breve: ${_pulisci(primaFrase(prep.corpo), 120)}`,
    ].filter(Boolean);
    if (pezzi.length) return _pulisci(pezzi.join(' · '), 300);
  }
  return null;
}

async function _wiki(query, attesa) {
  const s = await _json(`${WP}?action=query&list=search&format=json&srlimit=3&srsearch=${encodeURIComponent(query)}`, attesa);
  const titoli = (s?.query?.search || []).map((x) => x.title).filter(Boolean);
  const chiavi = paroleChiave(query);
  // fra i primi risultati si preferisce il titolo che la domanda nomina davvero
  titoli.sort((a, b) => punteggio(b, chiavi) - punteggio(a, chiavi));
  for (const t of titoli.slice(0, 2)) {
    const e = await _json(`${WP}?action=query&format=json&prop=extracts&explaintext=1&exchars=40000&redirects=1&titles=${encodeURIComponent(t)}`, attesa);
    const pg = Object.values(e?.query?.pages || {})[0];
    const passo = scegliPasso(pg?.extract || '', query);
    if (passo) return _pulisci(passo);
  }
  return null;
}

// --------------------------------------------------------------- la porta
export async function cerca(query, { attesa = TIMEOUT } = {}) {
  const q = _pulisci(query, 200);
  if (q.length < 3) return null;
  try {
    return (await _wikidata(q, attesa)) || (await _ricettario(q, attesa)) || (await _ddg(q, attesa)) || (await _wiki(q, attesa)) || null;
  } catch (e) { log.debug('cerca:', e?.message || e); return null; }
}
