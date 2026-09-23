// Cambio categoria/gioco su Twitch a voce.
//
// Lo streamer dice «<parola chiave> <nome gioco>» (es. "categoria Fortnite") e il
// bot imposta quella categoria sul canale. Il riconoscimento vocale è spesso
// impreciso: invece di arrendersi, il bot PROVA a risalire al gioco giusto con
// più tentativi di ricerca su Twitch e un confronto per somiglianza, scegliendo
// il candidato più vicino a ciò che ha sentito.
//
// Tutto personalizzabile dalla dashboard: on/off, parola chiave, annuncio in chat.
//
// IL CONFRONTO SI FA PER PAROLE, e non era cosi'. Prima si confrontavano le
// lettere, con un premio a chi «cominciava uguale»: e il premio andava anche al
// nome PIU' CORTO, cioe' a quello che lasciava fuori una parola che avevi
// detto. «diablo 4» diventava «Diablo», «counter strike 2» diventava il
// Counter-Strike vecchio — proprio la parola che distingue un gioco dall'altro
// era quella che il confronto buttava. Adesso vale una regola sola: le parole
// che hai detto devono esserci. Il ragionamento completo sta in
// docs/CATEGORIA.md.
import { makeLog } from '../logger.js';

const log = makeLog('categoria');

// normalizza per il confronto: minuscole, senza accenti/punteggiatura, spazi
// singoli. L'APOSTROFO SI TOGLIE invece di diventare uno spazio: «Baldur's»
// deve essere «baldurs», che e' come lo scrive chi lo scrive senza — non
// «baldur s», una parola in piu' che nessuno ha detto.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// parole di riempimento che il riconoscitore aggiunge e che non fanno parte del
// nome del gioco (le togliamo prima di cercare, ma NON dal confronto finale).
const RIEMPI = new Set([
  'a', 'al', 'allo', 'alla', 'ai', 'agli', 'su', 'di', 'da', 'the', 'il', 'lo', 'la', 'i', 'gli', 'le',
  'gioco', 'game', 'per', 'favore', 'grazie', 'ok', 'okay', 'ora', 'adesso', 'poi',
  'passa', 'passo', 'metti', 'cambia', 'cambio', 'in', 'e', 'che', 'un', 'uno', 'una',
]);

// I NUMERI SONO L'IDENTITA' DI UN GIOCO, e si scrivono in tre modi: «4», «IV»,
// «quattro». Si riportano tutti alle cifre, da tutte e due le parti del
// confronto. Le parole sono nelle tre lingue in cui il bot ascolta, perche' a
// voce il numero arriva come lo dici. Restano fuori apposta «i» (e' un
// articolo) e «uno»/«one» (articoli anche loro): leggerli come numeri
// rovinerebbe piu' nomi di quanti ne aggiusta. «V» e «X» invece si leggono:
// «GTA V» e «Final Fantasy X» sono molti piu' di quelli in cui la X e' solo una
// lettera.
const ROMANI = { ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13,
  xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20 };
const A_PAROLE = { due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
const canonica = (w) => {
  const n = ROMANI[w] ?? A_PAROLE[w];
  return n == null ? w : String(n);
};
const eNumero = (w) => /^\d+$/.test(w);

// LE SIGLE che si usano in chat. E' un vocabolario, non una regola: aggiunge
// una FORMA di quello che hai scritto, che si cerca e si confronta come le
// altre — non decide niente da sola. Per questo «fifa 23» resta «FIFA 23»: la
// forma letterale combacia meglio di quella allargata, e vince lei.
export const SIGLE = Object.freeze({
  gta: 'grand theft auto', cod: 'call of duty', lol: 'league of legends', wow: 'world of warcraft',
  cs: 'counter strike', cs2: 'counter strike 2', csgo: 'counter strike global offensive',
  rdr: 'red dead redemption', rdr2: 'red dead redemption 2', r6: 'rainbow six siege',
  ff: 'final fantasy', ffxiv: 'final fantasy xiv', ffxvi: 'final fantasy xvi', ffvii: 'final fantasy vii',
  tft: 'teamfight tactics', dbd: 'dead by daylight', poe: 'path of exile', poe2: 'path of exile 2',
  botw: 'breath of the wild', totk: 'tears of the kingdom', ow: 'overwatch', ow2: 'overwatch 2',
  eft: 'escape from tarkov', sot: 'sea of thieves', fifa: 'ea sports fc', mc: 'minecraft',
  bg3: 'baldurs gate 3', hs: 'hearthstone', aoe: 'age of empires', aoe2: 'age of empires ii',
});

// Le parole di una frase, rese confrontabili.
const parole = (s) => norm(s).split(' ').filter(Boolean).map(canonica);

// distanza di Levenshtein
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

// Due parole sono la stessa se sono uguali, o se differiscono per un errore di
// voce o di battitura. Un numero no: «2» e «3» sono due giochi diversi, e una
// lettera di distanza fra due cifre non e' un errore, e' un altro capitolo.
function stessaParola(a, b) {
  if (a === b) return true;
  if (eNumero(a) || eNumero(b)) return false;
  const corta = Math.min(a.length, b.length);
  if (corta < 4) return false;
  return lev(a, b) <= Math.floor(Math.max(a.length, b.length) / 4);
}

// Quante parole di `da` si ritrovano in `in`, ognuna usata una volta sola.
function ritrovate(da, dentro) {
  const libere = [...dentro];
  let n = 0;
  for (const w of da) {
    const i = libere.findIndex((x) => stessaParola(w, x));
    if (i >= 0) { n++; libere.splice(i, 1); }
  }
  return n;
}

// QUANTO SOMIGLIA un nome di Twitch a una forma di quello che hai detto.
//
//  · pesano di piu' le parole TUE che il nome contiene (0.7): dimenticarne una
//    e' il difetto da cui nasce questo file;
//  · pesano di meno quelle del nome che hai detto tu (0.3): non dire il
//    sottotitolo e' normale, nessuno scrive «Call of Duty: Black Ops 6» intero;
//  · per chi scrive tutto attaccato («counterstrike») c'e' anche il confronto a
//    lettere unite — ma senza nessun premio a chi comincia uguale, che era il
//    guasto;
//  · e i NUMERI: se ne hai detto uno, un nome che non ce l'ha vale la meta'.
//    «diablo 4» non puo' diventare «Diablo» solo perche' le lettere sono vicine.
export function somiglianza(forma, nome) {
  const q = Array.isArray(forma) ? forma : parole(forma);
  const c = parole(nome);
  if (!q.length || !c.length) return 0;
  if (q.join(' ') === c.join(' ')) return 1;
  const tue = ritrovate(q, c) / q.length;
  const sue = ritrovate(c, q) / c.length;
  let s = 0.7 * tue + 0.3 * sue;
  const qu = q.join(''), cu = c.join('');
  s = Math.max(s, 1 - lev(qu, cu) / Math.max(qu.length, cu.length));
  const numeriTuoi = q.filter(eNumero);
  if (numeriTuoi.some((n) => !c.includes(n))) s *= 0.5;
  return Math.min(1, s);
}

// LE FORME di quello che hai detto: com'e', senza le parole di riempimento, e
// con le sigle sciolte. Il punteggio di un nome e' il migliore fra le forme:
// cosi' «A Way Out» non perde la sua «a» (la forma intera la tiene), e «gta 5»
// trova «Grand Theft Auto V» (la forma sciolta ce l'ha).
export function formeDi(query) {
  const base = parole(query);
  const pulita = base.filter((w) => !RIEMPI.has(w));
  const sciolta = (ws) => ws.flatMap((w) => (SIGLE[w] ? parole(SIGLE[w]) : [w]));
  const forme = [base, pulita.length ? pulita : base, sciolta(pulita.length ? pulita : base)];
  const viste = new Set();
  return forme.filter((f) => { const k = f.join(' '); if (!k || viste.has(k)) return false; viste.add(k); return true; });
}

// Fra i nomi che Twitch ha restituito, quello che somiglia di piu'. A parita'
// vince il primo: Twitch li restituisce gia' in ordine di quanto sono seguiti,
// e fra due nomi che somigliano uguale e' il piu' probabile.
export function scegli(query, candidati) {
  const forme = formeDi(query);
  let meglio = null;
  for (const c of candidati || []) {
    if (!c?.id || !c?.name) continue;
    const s = Math.max(...forme.map((f) => somiglianza(f, c.name)));
    if (!meglio || s > meglio.score) meglio = { id: c.id, name: c.name, score: s };
  }
  return meglio;
}

// Estrae la parte "nome gioco" dopo la parola chiave. La chiave dev'essere una
// parola intera; il gioco è tutto ciò che segue. Ritorna la query o null.
export function parseComandoCategoria(frase, trigger = 'categoria') {
  const t = norm(frase);
  const trig = norm(trigger);
  if (!t || !trig) return null;
  const m = t.match(new RegExp('(?:^|\\s)' + escRe(trig) + '\\s+(.+)$'));
  if (!m) return null;
  const q = m[1].trim();
  return q || null;
}

// Estrae il testo GREZZO dopo la parola chiave (NON normalizza: preserva
// maiuscole e punteggiatura). Utile per il titolo, che è testo libero.
export function estraiDopoTrigger(frase, trigger) {
  const f = String(frase || '').trim();
  const trig = String(trigger || '').trim();
  if (!f || !trig) return null;
  const m = f.match(new RegExp('(?:^|\\s)' + escRe(trig) + '\\s+(.+)$', 'i'));
  return m ? m[1].trim() : null;
}

// Sotto questo punteggio non si cambia niente: una categoria sbagliata in onda
// e' peggio di un «non l'ho trovata», che almeno si puo' ridire meglio.
export const SOGLIA = 0.5;
// Da qui in su si e' sicuri, e non serve chiedere altro a Twitch.
const SICURO = 0.95;

// Sceglie la miglior categoria Twitch per la query "sentita". Best-effort: prova
// più ricerche (le forme di quello che hai detto, poi per pezzi) e sceglie il
// candidato che somiglia di più. Ritorna { id, name, score } oppure null se
// davvero non trova nulla di sensato.
export async function risolviCategoria(helix, query) {
  const forme = formeDi(query);
  if (!forme.length) return null;
  const ricerche = forme.map((f) => f.join(' '));
  const principale = forme[forme.length - 1];
  if (principale.length > 1) {
    ricerche.push(principale.slice(-2).join(' '));   // ultime due parole
    ricerche.push(principale[0]);                     // prima parola
  }
  // PER ULTIMA, L'INIZIO DELLA PRIMA PAROLA. Una parola storpiata dalla voce
  // («fortnait») o scritta tutta attaccata («counterstrike») puo' non far
  // tornare niente da Twitch, e senza candidati non c'e' niente da confrontare.
  // Il principio si sbaglia di rado: cercando quello, Twitch restituisce la
  // famiglia di nomi giusta, e a scegliere ci pensa il confronto. Arriva per
  // ultima perche' ci si ferma appena si e' sicuri: costa una chiamata solo
  // quando le altre non sono bastate.
  if (principale[0] && principale[0].length > 5) ricerche.push(principale[0].slice(0, 5));

  const visti = new Map();   // id → { id, name }
  const fatte = new Set();
  for (const q of ricerche) {
    if (!q || q.length < 2 || fatte.has(q)) continue;
    fatte.add(q);
    let ris = [];
    try { ris = await helix.searchCategories(q); } catch (e) { log.debug('search:', e?.message || e); }
    for (const c of ris || []) if (c?.id && c?.name && !visti.has(c.id)) visti.set(c.id, { id: c.id, name: c.name });
    const top = scegli(query, [...visti.values()]);
    if (top && top.score >= SICURO) return top;
  }
  const best = scegli(query, [...visti.values()]);
  if (!best || best.score < SOGLIA) return null;
  return best;
}
