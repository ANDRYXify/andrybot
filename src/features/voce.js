// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA VOCE DI UN CANALE (docs/VOCE.md).
//
// COME SI USA, per chi deve far dire qualcosa al bot:
//
//   import * as voce from './voce.js';
//   const testo = voce.di(canale, 'follow', { nome: 'Luna' });
//   if (testo) say(canale, testo);
//
//   voce.di(canale, momento, dati)       la frase, oppure '' se il momento e'
//                                        spento o se nessuna frase ha i dati che
//                                        le servono. Ogni chiamata ne consuma una.
//   voce.acceso(canale, momento)         false se lo streamer l'ha spento.
//   voce.anteprima(canale, momento, dati, quante)
//                                        le prossime, senza consumarle («Prova»).
//   voce.frasi(canale, momento)          le frasi che uscirebbero adesso, grezze.
//
// Un momento nuovo si scrive nel frasario (frasario/<gruppo>.js): tre lingue,
// tre toni, i segnaposti che usa. `node scripts/verifica-voce.mjs` dice se
// manca qualcosa. Il quarto argomento di `di` serve solo a chi scrive fuori
// dalla chat (Telegram, Discord): `{ forma }` sfugge il testo della frase, e i
// dati entrano come li passa lui, gia' messi in forma.
//
// IL MODELLO. Una frase esce da quattro cose, e nessuna e' il caso:
//
//  1. IL SEME DEL CANALE. L'ordine del giro e' un ordinamento per impronta
//     (sha256 di canale, momento, numero del giro e frase): due canali partono
//     da frasi diverse e le girano in ordine diverso. Dentro un giro una frase
//     non torna finche' ci sono frasi adatte non ancora uscite, e il giro dopo
//     non comincia dall'ultima detta. A che punto e' il giro sta nel database
//     (voce_giri): dopo un riavvio il canale riprende dalla frase dopo.
//     Aggiungere una frase non rimescola le altre: ognuna ha la sua impronta.
//  2. IL TONO della scheda Personalita' (`settings.tono`, come il cervello).
//  3. LA LINGUA, e solo da `linguaChat` (lingua-canale.js): un posto solo.
//  4. GLI INGREDIENTI: il nome della community (`{community}`), le emote che la
//     chat usa di piu' al posto delle faccine (`{:💜}` nel frasario), e le
//     frasi dello streamer, che si mescolano alle nostre o le sostituiscono.
//
// UNA FRASE E' ADATTA se ha tutti i dati che nomina. «Grazie per {bit} bit»
// senza i bit non esce: esce un'altra frase, o niente. Per questo in chat non
// puo' finire un `{nome}`: non e' tolto dopo, non c'e' mai entrato. I nostri
// momenti hanno per costruzione abbastanza frasi che chiedono solo i dati che
// arrivano sempre (lo controlla il cancello), quindi un dato che a volte manca
// toglie una variante, non la voce.
//
// I SEGNI dentro una frase:
//   {nome}                 un dato del momento;
//   {bit|# bit|# bits}     un numero col suo singolare e plurale, # e' il numero;
//   {o/a}                  il genere di chi parla (ai/genere.js);
//   {:💜}                  una faccina: l'emote del canale se la chat ne ha una
//                          allegra, se no quella scritta.
import { createHash } from 'node:crypto';
import { streamers, voceGiri } from '../db.js';
import { linguaChat } from './lingua-canale.js';
import { accorda, dichiaraGenere, genereDi } from '../ai/genere.js';
import { emotiTop } from '../ai/learn.js';
import { MOMENTI, GRUPPI } from './frasario/index.js';

export { MOMENTI, GRUPPI };

export const LINGUE = ['it', 'en', 'es'];
export const TONI = ['scherzoso', 'amichevole', 'serio'];
export const TONO_BASE = 'scherzoso';
export const MODI = ['nostre', 'miste', 'sue', 'spento'];

export const MAX_FRASI_SUE = 20;
export const MAX_LUNGHEZZA_SUA = 200;
export const MAX_COMMUNITY = 40;

const LOCALE = { it: 'it-IT', en: 'en-US', es: 'es-ES' };

const SEGNO = /\{([^{}]*)\}/g;
const DATO = /^[a-z][a-z0-9]*$/;
const PLURALE = /^([a-z][a-z0-9]*)\|([^|]*)\|([^|]*)$/;
const FACCINA = /^:(.+)$/;

// I segni di una frase, divisi per specie. Serve al motore per sapere se una
// frase e' adatta, e al cancello per sapere se nomina dati che non esistono.
export function segniDi(testo) {
  const dati = new Set();
  let faccine = 0;
  let generi = 0;
  const strani = [];
  for (const m of String(testo || '').matchAll(SEGNO)) {
    const dentro = m[1];
    if (DATO.test(dentro)) dati.add(dentro);
    else if (PLURALE.test(dentro)) dati.add(dentro.match(PLURALE)[1]);
    else if (FACCINA.test(dentro)) faccine++;
    else if (dichiaraGenere(m[0])) generi++;
    else strani.push(m[0]);
  }
  return { dati: [...dati], faccine, generi, strani };
}

const impronta = (s) => createHash('sha256').update(String(s)).digest('hex');
const idDi = (chi, testo) => chi + ':' + impronta(testo).slice(0, 12);

const settingsDi = (canale) => streamers.get(String(canale || '').toLowerCase())?.settings || {};

export const tonoDi = (settings) => (TONI.includes(settings?.tono) ? settings.tono : TONO_BASE);

// IL NOME DELLA COMMUNITY, nella forma per chiamarla. Chi scrive «la ciurma»
// intende «ciurma»: una frase dice «Si parte, ciurma!», e l'articolo davanti
// a un nome con cui si chiama qualcuno non ci va, in nessuna delle tre lingue.
const ARTICOLI = /^(?:il|lo|la|i|gli|le|l['’]|the|el|los|las)\s*/i;
export function pulisciCommunity(x) {
  return String(x || '').replace(/[\u0000-\u001f{}<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_COMMUNITY);
}
export function communityDi(settings) {
  const scritto = pulisciCommunity(settings?.voce?.community);
  const senza = scritto.replace(ARTICOLI, '').trim();
  return senza || scritto;
}
export const community = (canale) => communityDi(settingsDi(canale));

// LE EMOTE DEL CANALE che possono stare al posto di una faccina. Solo quelle
// che si riconoscono allegre: tutte le faccine del frasario lo sono, e un
// «Sadge» o un «Kappa» dopo un grazie direbbe il contrario della frase. Una
// emote di cui non si capisce l'umore non si usa: meglio la faccina scritta.
const ALLEGRE = new Set(['PogChamp', 'Pog', 'PogU', 'POGGERS', 'Clap', 'catJAM', 'widepeepoHappy', 'peepoClap',
  'FeelsGoodMan', 'FeelsStrongMan', 'HeyGuys', 'VoHiYo', 'SeemsGood', 'AYAYA', 'CoolCat', 'GlitchCat',
  'bleedPurple', 'TwitchUnity', 'HypeHeart', 'peepoHappy', 'EZClap']);
const RADICI_ALLEGRE = /hype|love|heart|cuore|pog|clap|happy|hey|ciao|wave|yay|party|dance|jam|wow|cheer|smile|hug|fire|star|cool|hola|salut|win$/i;
const RADICI_STORTE = /sad|cry|rip|dead|mad|angry|rage|bad|sleep|bored|salt|cope|pain|sob|weep|monka|wut|nope|fail|kill|toxic|lul|kek|lol|laugh|pepega|trihard|kappa|jebait|stare|sus|smug|cringe|ban|lurk|what|ez$/i;
export function allegra(nome) {
  const n = String(nome || '');
  if (!/^[A-Za-z0-9_]{2,40}$/.test(n)) return false;
  if (ALLEGRE.has(n)) return true;
  return RADICI_ALLEGRE.test(n) && !RADICI_STORTE.test(n);
}
export function emoteDi(canale) {
  try { return emotiTop(String(canale || '').toLowerCase(), 10).filter(allegra).slice(0, 3); } catch { return []; }
}

// Le frasi dello streamer per un momento, e cosa ne vuole fare.
export function sceltaDi(settings, momento) {
  const m = MOMENTI[momento];
  const c = settings?.voce?.momenti?.[momento] || {};
  const frasi = (Array.isArray(c.frasi) ? c.frasi : []).map(String).filter((f) => f.trim());
  let modo = MODI.includes(c.modo) ? c.modo : 'nostre';
  if ((modo === 'sue' || modo === 'miste') && !frasi.length) modo = 'nostre';
  if (modo === 'spento' && m && !m.spegnibile) modo = 'nostre';
  return { modo, frasi };
}

export const acceso = (canale, momento) => !!MOMENTI[momento] && sceltaDi(settingsDi(canale), momento).modo !== 'spento';

// IL MAZZO di un momento per un canale: le frasi fra cui si sceglie adesso.
function mazzo(settings, canale, momento) {
  const m = MOMENTI[momento];
  if (!m) return { lingua: 'it', tono: TONO_BASE, frasi: [], modo: 'nostre' };
  const lingua = linguaChat(canale);
  const tono = tonoDi(settings);
  const { modo, frasi: sue } = sceltaDi(settings, momento);
  const nostre = modo === 'sue' || modo === 'spento' ? [] : (m.frasi?.[lingua]?.[tono] || []);
  const frasi = [
    ...nostre.map((t) => ({ id: idDi('n', t), testo: t, sua: false })),
    ...(modo === 'miste' || modo === 'sue' ? sue.map((t) => ({ id: idDi('s', t), testo: t, sua: true })) : []),
  ];
  return { lingua, tono, frasi, modo };
}

export function frasi(canale, momento) {
  const { frasi: tutte, modo, lingua, tono } = mazzo(settingsDi(canale), canale, momento);
  return { modo, lingua, tono, frasi: tutte.map((f) => ({ testo: f.testo, sua: f.sua })) };
}

const presente = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// I dati che ci sono davvero, con la community se il canale ne ha una.
function datiPieni(settings, dati) {
  const out = {};
  for (const [k, v] of Object.entries(dati || {})) if (presente(v)) out[k] = v;
  const c = communityDi(settings);
  if (c && !presente(out.community)) out.community = c;
  return out;
}

function adatta(f, pieni, genere) {
  if (genere === 'neutro' && !f.sua && dichiaraGenere(f.testo)) return false;
  return segniDi(f.testo).dati.every((k) => k in pieni);
}

// L'ORDINE DEL GIRO: le frasi messe in fila per impronta. E' una funzione del
// canale e del numero del giro, quindi e' la stessa a ogni riavvio.
function ordine(canale, momento, giro, frasiMazzo) {
  return frasiMazzo
    .map((f) => [f, impronta(`${canale}\n${momento}\n${giro}\n${f.id}`)])
    .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map((x) => x[0]);
}

// Un passo del giro. Torna la frase e lo stato dopo, o null se nessuna e' adatta.
function passo(canale, momento, frasiMazzo, stato, eAdatta) {
  const ci = new Set(frasiMazzo.map((f) => f.id));
  const usate = new Set((stato.usate || []).filter((id) => ci.has(id)));
  let giro = Number(stato.giro) || 0;
  let presa = ordine(canale, momento, giro, frasiMazzo).find((f) => !usate.has(f.id) && eAdatta(f));
  if (!presa) {
    giro += 1;
    usate.clear();
    const fila = ordine(canale, momento, giro, frasiMazzo).filter(eAdatta);
    presa = fila.find((f) => f.id !== stato.ultima) || fila[0];
  }
  if (!presa) return null;
  usate.add(presa.id);
  return { frase: presa, stato: { giro, usate: [...usate], ultima: presa.id } };
}

function numero(v, lingua) {
  const n = Number(v);
  if (typeof v === 'number' && Number.isFinite(n)) {
    try { return new Intl.NumberFormat(LOCALE[lingua] || LOCALE.it).format(n); } catch { return String(n); }
  }
  return String(v);
}

// La frase stesa: genere, faccine, plurali, dati. `forma` sfugge il testo
// della frase e lascia i dati come sono.
function stendi(testo, { pieni, lingua, genere, emote, forma }) {
  const t = accorda(testo, genere);
  const f = typeof forma === 'function' ? forma : (x) => x;
  let out = '';
  let ultimo = 0;
  for (const m of t.matchAll(SEGNO)) {
    out += f(t.slice(ultimo, m.index));
    ultimo = m.index + m[0].length;
    const dentro = m[1];
    if (DATO.test(dentro)) { out += dentro in pieni ? numero(pieni[dentro], lingua) : ''; continue; }
    const p = dentro.match(PLURALE);
    if (p) {
      const v = pieni[p[1]];
      const uno = Number(v) === 1;
      out += f(uno ? p[2] : p[3]).split('#').join(numero(typeof v === 'number' ? v : Number(v), lingua));
      continue;
    }
    const fc = dentro.match(FACCINA);
    if (fc) { out += emote || f(fc[1]); continue; }
  }
  out += f(t.slice(ultimo));
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

function emoteDelPasso(emote, canale, id, giro) {
  if (!emote.length) return '';
  const h = parseInt(impronta(`${canale}\n${id}\n${giro}`).slice(0, 8), 16);
  return emote[h % emote.length];
}

function prepara(canale, momento, dati, opzioni) {
  const c = String(canale || '').toLowerCase();
  const m = MOMENTI[momento];
  if (!c || !m) return null;
  const settings = settingsDi(c);
  const { frasi: fm, modo, lingua } = mazzo(settings, c, momento);
  if (modo === 'spento' || !fm.length) return null;
  const pieni = datiPieni(settings, dati);
  const genere = genereDi(settings);
  const fuori = m.dove === 'fuori';
  const emote = fuori ? [] : emoteDi(c);
  return { c, m, fm, lingua, pieni, genere, fuori, emote, forma: opzioni?.forma };
}

export function di(canale, momento, dati = {}, opzioni = {}) {
  try {
    const p = prepara(canale, momento, dati, opzioni);
    if (!p) return '';
    const prima = voceGiri.get(p.c, momento);
    const r = passo(p.c, momento, p.fm, prima, (f) => adatta(f, p.pieni, p.genere));
    if (!r) return '';
    voceGiri.salva(p.c, momento, r.stato);
    return stendi(r.frase.testo, { ...p, emote: emoteDelPasso(p.emote, p.c, r.frase.id, r.stato.giro) });
  } catch {
    return '';
  }
}

export function anteprima(canale, momento, dati = {}, quante = 3) {
  try {
    const p = prepara(canale, momento, dati, {});
    if (!p) return [];
    let stato = voceGiri.get(p.c, momento);
    const out = [];
    for (let i = 0; i < Math.max(1, Math.min(10, quante)); i++) {
      const r = passo(p.c, momento, p.fm, stato, (f) => adatta(f, p.pieni, p.genere));
      if (!r) break;
      out.push(stendi(r.frase.testo, { ...p, emote: emoteDelPasso(p.emote, p.c, r.frase.id, r.stato.giro) }));
      stato = r.stato;
    }
    return out;
  } catch {
    return [];
  }
}

// LA SCELTA DELLO STREAMER, ripulita. Una frase che nomina un dato che il
// momento non ha non entra: in chat uscirebbe monca. «Solo le sue» senza
// frasi non e' una scelta, e diventa «le nostre»; un momento che non si puo'
// spegnere non si spegne.
export function datiAmmessi(momento) {
  const m = MOMENTI[momento];
  return m ? [...Object.keys(m.dati || {}), 'community'] : [];
}

export function fraseSuaValida(momento, testo) {
  const s = segniDi(testo);
  if (s.strani.length) return false;
  const ok = new Set(datiAmmessi(momento));
  return s.dati.every((k) => ok.has(k));
}

export function normVoce(x) {
  const out = { community: pulisciCommunity(x?.community), momenti: {} };
  const dentro = x?.momenti && typeof x.momenti === 'object' ? x.momenti : {};
  for (const [id, v] of Object.entries(dentro)) {
    const m = MOMENTI[id];
    if (!m || !v || typeof v !== 'object') continue;
    const viste = new Set();
    const frasiSue = (Array.isArray(v.frasi) ? v.frasi : [])
      .map((f) => String(f ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_LUNGHEZZA_SUA))
      .filter((f) => f && fraseSuaValida(id, f) && !viste.has(f) && viste.add(f))
      .slice(0, MAX_FRASI_SUE);
    const { modo } = sceltaDi({ voce: { momenti: { [id]: { modo: v.modo, frasi: frasiSue } } } }, id);
    if (modo === 'nostre' && !frasiSue.length) continue;
    out.momenti[id] = { modo, frasi: frasiSue };
  }
  return out;
}
