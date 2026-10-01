// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ECONOMIA DELLE MONETE: la porta da cui passa tutto quello che arriva da solo
// (docs/ECONOMIA.md).
//
// Le monete che nessuno decide in quel momento (il messaggio, la presenza, la
// partecipazione, la serie di presenze) passano tutte da qui, e le regole stanno
// qui in un ordine fisso:
//
//   1. chi e'        un bot non riceve mai; poi gli esclusi dello streamer
//   2. la fonte      la crescita automatica si spegne tutta insieme
//   3. il messaggio  i comandi, i ripetuti e i troppo corti possono non contare
//   4. il silenzio   pieno, poi cala, poi si ferma; riparte appena scrive
//   5. i moltiplicatori  abbonati, VIP, e l'ora doppia
//   6. i tetti       per diretta e sul saldo: tagliano la quota, non la buttano
//
// Nessuna di quelle fonti scrive sul saldo per conto suo, quindi nessuna puo'
// saltare una regola. Giochi, negozio e Moduli non passano di qui: sono scambi
// che qualcuno decide (punto, compro, il Modulo da' cinquanta monete).
//
// Le funzioni pure stanno in economia-regole.js, che il pannello riceve tale e
// quale (/js/economia-regole.js) per i conti che mostra: il pannello e il bot
// non possono dire due cose diverse.
import { points, streamers, statoVivo } from '../db.js';
import { ePersona } from './antibot.js';
import { GIRO_MS, VIVO_MS, STESSO_FILO_MS, DOPPIO, normalizza, quotaGiro, contaMessaggio, taglia, scadenza, giornoIn } from './economia-regole.js';
import { preferenzeDi } from './preferenze.js';

const norm = (s) => String(s || '').toLowerCase().trim().replace(/^@/, '');

export {
  GIRO_MS, GIRO_MIN, VIVO_MS, STESSO_FILO_MS, DEFAULT, ESCLUSI_MAX, DOPPIO,
  normalizza, fattoreSilenzio, quotaGiro, contaMessaggio, taglia, contiDiretta,
} from './economia-regole.js';
export const regole = (channel) => normalizza(streamers.get(norm(channel))?.settings?.punti);

const intero = (v, def, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const frazione = (v, def, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };

// ── lo stato ─────────────────────────────────────────────────────────────────

// La diretta di adesso, o il giorno a canale spento (nel fuso del canale): e'
// la chiave del tetto, e del castigo di chi insiste nei giochi. Lo dice
// l'ultimo giro di presenza, che sta nel database: un riavvio a meta' diretta
// non apre una diretta nuova e non azzera il tetto.
export function momento(channel, ora = Date.now()) {
  const v = statoVivo.leggi(norm(channel), 'economia');
  if (v && v.diretta && ora - Number(v.ts) < VIVO_MS) return { live: true, chiave: 'd:' + v.diretta };
  return { live: false, chiave: 'f:' + giornoIn(ora, preferenzeDi(norm(channel)).fuso) };
}

// L'ORA DOPPIA: per un tempo scelto, tutto quello che arriva da solo vale x
// volte. Sta nel database, non nelle impostazioni: salvare il pannello non la
// spegne, e un riavvio non la allunga.
export function doppio(channel, ora = Date.now()) {
  const d = statoVivo.leggi(norm(channel), 'monete-doppie');
  return d && Number(d.fino) > ora ? { x: frazione(d.x, 2, DOPPIO.xMin, DOPPIO.xMax), fino: Number(d.fino) } : null;
}
export function accendiDoppio(channel, { minuti = 30, x = 2 } = {}, ora = Date.now()) {
  const d = { fino: ora + intero(minuti, 30, DOPPIO.min, DOPPIO.max) * 60_000, x: frazione(x, 2, DOPPIO.xMin, DOPPIO.xMax) };
  statoVivo.scrivi(norm(channel), 'monete-doppie', d);
  return d;
}
export const spegniDoppio = (channel) => statoVivo.togli(norm(channel), 'monete-doppie');

// Chi puo' ricevere monete che arrivano da sole (regole 1 e 2).
function puoRicevere(channel, u, cfg, s) {
  if (!u || u.startsWith('[')) return false;
  if (s?.settings?.giochi === false || !cfg.auto) return false;
  if (cfg.esclusi.includes(u)) return false;
  return ePersona(channel, u);
}

// ── quanto durano ───────────────────────────────────────────────────────────
//
// Una moneta prende la scadenza quando nasce, dal modo in cui nasce
// (docs/ECONOMIA.md, «Quanto durano le monete»). Le monete si muovono solo da
// qui: nessun altro file chiama le funzioni dei lotti di db.js.
export const scadePer = (channel, daDove, ora = Date.now()) =>
  scadenza(regole(channel).durate?.[daDove], ora, preferenzeDi(norm(channel)).fuso);
// Nascono: da un gioco (giochi), da un Modulo o da un premio (premi), dallo staff (staff).
export const dai = (channel, user, n, daDove, { ruolo = null, ora = Date.now() } = {}) =>
  points.dai(norm(channel), user, Math.max(0, Math.round(Number(n) || 0)), { scade: scadePer(channel, daDove, ora), ruolo, ora });
// Escono: quante ce ne sono fino a n ({ tolte, ricevuta }), o una posta tutta o niente.
export const togli = (channel, user, n) => points.togli(norm(channel), user, n);
export const punta = (channel, user, n) => points.punta(norm(channel), user, n);
// Una posta finita: torna coi suoi lotti, e solo il guadagno nasce «giocando».
export const chiudiPuntata = (channel, user, ricevuta, ritorno, { ora = Date.now() } = {}) =>
  points.chiudiPuntata(norm(channel), user, ricevuta, ritorno, { scade: scadePer(channel, 'giochi', ora), ora });
// Una posta presa e tolta in un colpo solo (la slot, la roulette): quanto torna.
export function gioca(channel, user, posta, ritorno) {
  const r = punta(channel, user, posta);
  if (!r) return null;
  return chiudiPuntata(channel, user, r.ricevuta, ritorno);
}
export const passa = (channel, da, a, n) => points.passa(norm(channel), da, a, n);
// Le monete importate da un altro bot nascono «dallo staff», con la sua durata.
export const importa = (channel, voci, { ora = Date.now() } = {}) =>
  points.importa(norm(channel), voci, { scade: scadePer(channel, 'staff', ora), ora });
// Le monete del canale che non scadono: { persone, monete }.
export const senzaScadenza = (channel) => points.senzaScadenza(norm(channel));
// Una scadenza anche a quelle: { persone, monete, scade }, o null se la durata
// non e' una data (non scadono, o una durata che non c'e').
export function scadenzaAlleVecchie(channel, durata, ora = Date.now()) {
  const scade = scadenza(durata, ora, preferenzeDi(norm(channel)).fuso);
  if (!scade) return null;
  return { ...points.scadenzaAlleVecchie(norm(channel), scade), scade };
}
// Le prime che scadono: { scade, quanti }, o null se nessuna scade.
export const primaScadenza = (channel, user) => points.prossimaScadenza(norm(channel), user);
export const rendi = (channel, user, ricevuta) => points.rendi(norm(channel), user, ricevuta);

// ── per giocare bisogna esserci ─────────────────────────────────────────────
//
// Una partita costa `giocoOgni` passi, e un passo lo mette da parte ogni
// messaggio che conta per le monete e non e' un comando: un comando non e'
// parlare in chat, e `!slot` si pagherebbe da solo. Chi paga e quando lo
// decide chi conosce il messaggio e il gioco (attese-giochi.js).
// Quanti messaggi mancano per giocare: 0 se si gioca.
export function mancano(channel, user) {
  const ch = norm(channel);
  const n = regole(ch).giocoOgni;
  return n > 0 ? Math.max(0, n - points.passi(ch, user)) : 0;
}
// La partita e' cominciata: si paga.
export function giocata(channel, user) {
  const ch = norm(channel);
  const n = regole(ch).giocoOgni;
  if (n > 0) points.spendiPassi(ch, user, n);
}

// ── la porta ─────────────────────────────────────────────────────────────────

// Una quota che arriva da sola a una persona (il messaggio, la serie di
// presenze, e poi gli eventi). Ritorna quante monete ha ricevuto davvero.
export function riceve(channel, user, quota, { fonte = 'messaggio', ruolo = null, ora = Date.now() } = {}) {
  const ch = norm(channel);
  const u = norm(user);
  const s = streamers.get(ch);
  const cfg = normalizza(s?.settings?.punti);
  if (!puoRicevere(ch, u, cfg, s)) return 0;
  const m = momento(ch, ora);
  const d = doppio(ch, ora);
  const r = points.economiaDi(ch, [u]).get(u);
  const gia = r && r.diretta === m.chiave ? r.guadagno_diretta : 0;
  const q = taglia(Math.round((Number(quota) || 0) * (d ? d.x : 1)), { monete: r?.monete || 0, gia }, cfg);
  if (q <= 0 && !r) return 0;
  points.economiaScrivi(ch, [{ user: u, delta: q, ruolo, visto: fonte === 'messaggio' ? ora : null, diretta: m.chiave, guadagno: gia + q }],
    { scade: scadePer(ch, 'chat', ora) });
  return q;
}

// Un messaggio in chat. Dice se il messaggio conta (lo usa il giro, per la
// partecipazione) e quante monete ha portato.
const ultimoAccredito = new Map();     // canale|utente → quando ha preso l'ultima volta
const ultimoTesto = new Map();         // canale|utente → il messaggio di prima
const TESTI_MAX = 20000;
export function messaggio(msg, ora = Date.now()) {
  const ch = norm(msg?.channel);
  const u = norm(msg?.user);
  if (!ch || !u || u.startsWith('[')) return { conta: false, dato: 0 };
  const k = ch + '|' + u;
  const prec = ultimoTesto.get(k);
  ultimoTesto.delete(k);
  ultimoTesto.set(k, String(msg.text || ''));
  if (ultimoTesto.size > TESTI_MAX) ultimoTesto.delete(ultimoTesto.keys().next().value);
  const cfg = regole(ch);
  const conta = contaMessaggio(msg.text, prec, cfg);
  if (conta && cfg.giocoOgni > 0 && !/^[!/]/.test(String(msg.text || '').trim())) points.passo(ch, u, cfg.giocoOgni * cfg.giochiScorta);
  if (!conta || cfg.perMessaggio <= 0) return { conta, dato: 0 };
  if (!cfg.msgSpento && !momento(ch, ora).live) return { conta, dato: 0 };
  if (ora - (ultimoAccredito.get(k) || 0) < cfg.ogniSecondi * 1000) return { conta, dato: 0 };
  ultimoAccredito.set(k, ora);
  if (ultimoAccredito.size > TESTI_MAX) ultimoAccredito.delete(ultimoAccredito.keys().next().value);
  const dato = riceve(ch, u, cfg.perMessaggio, { fonte: 'messaggio', ruolo: msg.isMod || msg.isBroadcaster ? 'staff' : '', ora });
  return { conta, dato };
}

// Un giro di presenza: `presenti` e' la lista di Twitch (anche chi sta zitto),
// `parlanti` chi ha scritto un messaggio che conta in questo giro, `ruoli` chi
// e' sub, VIP o mod. Il silenzio di ognuno sta nella sua riga, non in memoria.
export function giro(channel, presenti, { ruoli = {}, parlanti = new Set(), live = true, diretta = '', ora = Date.now() } = {}) {
  const ch = norm(channel);
  const esito = { accreditati: 0, monete: 0, saltati: 0, fermi: 0 };
  if (!ch || !live) return esito;
  if (diretta) statoVivo.scrivi(ch, 'economia', { diretta: String(diretta), ts: ora });
  const s = streamers.get(ch);
  const cfg = normalizza(s?.settings?.punti);
  if (s?.settings?.giochi === false) return esito;
  const gente = [];
  const visti = new Set();
  for (const grezzo of presenti || []) {
    const u = norm(grezzo);
    if (!u || visti.has(u)) continue;
    visti.add(u);
    if (u.startsWith('[') || cfg.esclusi.includes(u) || !ePersona(ch, u)) { esito.saltati++; continue; }
    gente.push(u);
  }
  if (!gente.length) return esito;
  const righe = points.economiaDi(ch, gente);
  const chiave = diretta ? 'd:' + diretta : momento(ch, ora).chiave;
  const x = doppio(ch, ora)?.x || 1;
  const scrivi = [];
  for (const u of gente) {
    const r = righe.get(u);
    const attivo = parlanti.has(u);
    const prima = r && r.zitto_ts && ora - r.zitto_ts <= STESSO_FILO_MS ? r.zitto_giri : 0;
    const giri = attivo ? 0 : prima + 1;
    const rr = ruoli[u] || {};
    const ruolo = rr.mod === undefined ? null : (rr.mod ? 'staff' : '');
    const gia = r && r.diretta === chiave ? r.guadagno_diretta : 0;
    const q = cfg.auto ? taglia(quotaGiro({ attivo, giriFermo: giri, sub: !!rr.sub, vip: !!rr.vip }, cfg, x), { monete: r?.monete || 0, gia }, cfg) : 0;
    if (q > 0) { esito.accreditati++; esito.monete += q; } else if (!attivo) esito.fermi++;
    if (!r && q <= 0) continue;
    scrivi.push({ user: u, delta: q, ruolo, visto: ora, zittoGiri: giri, zittoTs: ora, diretta: chiave, guadagno: gia + q });
  }
  points.economiaScrivi(ch, scrivi, { scade: scadePer(ch, 'chat', ora) });
  return esito;
}
