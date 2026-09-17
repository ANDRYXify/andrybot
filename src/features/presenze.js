// LE PRESENZE: chi c'e', diretta dopo diretta. E il bot che riconosce chi torna.
//
// Le ore guardate dicono QUANTO uno ha guardato; qui si dice QUANTE VOLTE e' venuto,
// e se viene di fila. E' la meccanica che fa tornare la gente: una serie che cresce,
// un bonus che cresce con lei, e una parola dal bot quando arrivi la prima volta o
// quando torni dopo settimane.
//
// UNA DIRETTA e' una sessione live del canale. Al primo giro prende come etichetta
// l'id dello stream (Helix). E' una diretta nuova quando l'id e' diverso da quello
// corrente E sono passati almeno trenta minuti dall'ultimo giro: un crash con
// riavvio entro trenta minuti e' la stessa diretta, e uno stesso id resta la
// stessa diretta anche dopo un buco (il bot era giu', non lo streamer).
//
// UNA PRESENZA conta quando la persona compare nella lista di chi e' in chat in
// almeno due giri (dieci minuti) della stessa diretta, e conta una volta sola per
// diretta. La lista e' quella che Twitch da' al giro delle ore guardate: chi c'e' e
// sta zitto conta, chi passa un minuto no.
//
// LA SERIE sono le dirette di fila: presente a questa e all'ultima prima di questa
// → serie+1, altrimenti si riparte da uno. Il record resta. Il bonus in monete
// e' `bonus × min(serie, tetto)`: cresce per chi c'e' sempre, e si ferma a un tetto
// perche' una serie lunga non deve diventare una rendita.
//
// I SALUTI stanno sul primo messaggio che una persona scrive. «Prima volta»: su
// Twitch lo dice Twitch (tag first-msg), sulle altre piattaforme la memoria dei
// messaggi. «Ritorno»: l'ultimo segno di vita (messaggio o presenza) e' piu' vecchio
// di N giorni. Il bot tace se lo streamer si e' costruito un Modulo sul primo
// messaggio (quello che ti sei costruito vince), e non saluta a raffica: un riposo
// fra un saluto e l'altro e un tetto ogni dieci minuti, perche' un raid porta
// cinquanta persone nuove in un colpo e cinquanta saluti sono spam.
import { streamers, presenze as store, points, memory, modules as modulesDb } from '../db.js';
import { NON_CONTARE } from './watchtime.js';
import { makeLog } from '../logger.js';

const log = makeLog('presenze');
const norm = (s) => String(s || '').toLowerCase().trim();
const GIORNO = 86_400_000;

export const RIPRESA_MS = 30 * 60_000;       // entro mezz'ora e' la stessa diretta
export const GIRI_MINIMI = 2;                // due giri da cinque minuti: dieci minuti
export const TRAGUARDI = [3, 5, 10, 25, 50, 100];
export const RIPOSO_ANNUNCIO_MS = 60_000;    // al piu' un annuncio di traguardo al minuto
export const RIPOSO_SALUTO_MS = 45_000;      // e un saluto ogni tre quarti di minuto
export const SALUTI_MAX = 6;                 // al piu' sei saluti...
export const SALUTI_FINESTRA_MS = 10 * 60_000;   // ...ogni dieci minuti

export const DEFAULT = Object.freeze({
  attivo: true, bonus: 10, tetto: 10, annuncia: true,
  saluti: Object.freeze({
    attivo: true, giorniAssenza: 21, soloLive: true,
    primaVolta: 'Ciao {user}, è la tua prima volta qui: fai come a casa tua.',
    bentornato: 'Ehi {user}, sono passati {giorni} giorni: che bello rivederti.',
  }),
});

const numero = (v, def, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const testo = (v, def) => (typeof v === 'string' ? v.trim().slice(0, 200) : def);

// Le impostazioni come le salva il server: pura, e vale anche a meta' (quello
// che non arriva prende il valore di prima, e senza prima quello di serie).
export function normalizza(b, prima = {}) {
  const p = (b && typeof b === 'object') ? b : {};
  const q = (prima && typeof prima === 'object') ? prima : {};
  const ps = (p.saluti && typeof p.saluti === 'object') ? p.saluti : {};
  const qs = (q.saluti && typeof q.saluti === 'object') ? q.saluti : {};
  const pick = (k, def) => (p[k] !== undefined ? p[k] : (q[k] !== undefined ? q[k] : def));
  const pickS = (k, def) => (ps[k] !== undefined ? ps[k] : (qs[k] !== undefined ? qs[k] : def));
  return {
    attivo: pick('attivo', DEFAULT.attivo) !== false,
    bonus: numero(pick('bonus', DEFAULT.bonus), DEFAULT.bonus, 0, 100000),
    tetto: numero(pick('tetto', DEFAULT.tetto), DEFAULT.tetto, 1, 365),
    annuncia: pick('annuncia', DEFAULT.annuncia) !== false,
    saluti: {
      attivo: pickS('attivo', DEFAULT.saluti.attivo) !== false,
      giorniAssenza: numero(pickS('giorniAssenza', DEFAULT.saluti.giorniAssenza), DEFAULT.saluti.giorniAssenza, 2, 365),
      soloLive: pickS('soloLive', DEFAULT.saluti.soloLive) !== false,
      primaVolta: testo(pickS('primaVolta', DEFAULT.saluti.primaVolta), DEFAULT.saluti.primaVolta),
      bentornato: testo(pickS('bentornato', DEFAULT.saluti.bentornato), DEFAULT.saluti.bentornato),
    },
  };
}

export function cfg(channel) {
  return normalizza(streamers.get(norm(channel))?.settings?.presenze);
}

// Un modello scritto dallo streamer: tutte le occorrenze, e un segnaposto che
// non conosciamo resta com'e' (e' un testo suo, non un errore da lanciare).
export function riempi(modello, valori) {
  let t = String(modello || '');
  for (const [k, v] of Object.entries(valori)) t = t.split('{' + k + '}').join(String(v));
  return t.trim();
}

const nomeMonete = (ch) => { const n = streamers.get(ch)?.settings?.nomeMonete; return (typeof n === 'string' && n.trim()) || 'monete'; };
const ordinale = (n) => `${n}ª`;

// ---------------------------------------------------------------- il giro
// giri di questa diretta: canale → Map(utente → quanti giri di fila)
const giri = new Map();

// Qual e' la diretta di questo giro: quella corrente, o una nuova. Pura sui
// dati che riceve; scrive solo lo stato del canale.
export function direttaDelGiro(prima, { streamId = '', ora = Date.now() } = {}) {
  const d = prima || { corrente: '', corrente_ts: 0, precedente: '', ultimo_tick: 0 };
  const id = String(streamId || '');
  const buco = ora - (d.ultimo_tick || 0);
  const nuova = !d.corrente || (id !== d.corrente && buco >= RIPRESA_MS) || (!id && buco >= RIPRESA_MS);
  if (nuova) return { corrente: id || ('t' + ora), corrente_ts: ora, precedente: d.corrente || '', ultimo_tick: ora, nuova: true };
  return { ...d, ultimo_tick: ora, nuova: false };
}

// La presenza di una persona a una diretta: la riga nuova, o null se questa
// diretta era gia' contata.
export function contaPresenza(riga, diretta, { ora = Date.now(), bonus = 0, tetto = 1 } = {}) {
  const r = riga || { dirette: 0, serie: 0, record: 0, ultima: '', prima_ts: 0 };
  if (r.ultima && r.ultima === diretta.corrente) return null;
  const consecutiva = !!(r.ultima && diretta.precedente && r.ultima === diretta.precedente);
  const serie = consecutiva ? (r.serie || 0) + 1 : 1;
  const dirette = (r.dirette || 0) + 1;
  const record = Math.max(r.record || 0, serie);
  const premio = bonus > 0 ? Math.round(bonus * Math.min(serie, Math.max(1, tetto))) : 0;
  return { dirette, serie, record, ultima: diretta.corrente, ultima_ts: ora, prima_ts: r.prima_ts || ora, bonus: premio, traguardo: TRAGUARDI.includes(serie) };
}

// Chiamata dal giro delle ore guardate (ogni cinque minuti, solo in diretta) con
// la stessa lista di chi e' in chat. Ritorna chi e' diventato presente in questo
// giro e chi ha toccato un traguardo.
export function giroDiretta(channel, { streamId = '', chatters = [], ora = Date.now() } = {}) {
  const ch = norm(channel);
  const esito = { diretta: '', nuova: false, presenze: [], traguardi: [] };
  if (!ch) return esito;
  const c = cfg(ch);
  if (!c.attivo) return esito;
  const d = direttaDelGiro(store.diretta(ch), { streamId, ora });
  store.setDiretta(ch, d);
  esito.diretta = d.corrente; esito.nuova = d.nuova;
  if (d.nuova) giri.delete(ch);
  let m = giri.get(ch);
  if (!m) { m = new Map(); giri.set(ch, m); }
  const presenti = new Set();
  for (const grezzo of chatters || []) {
    const u = norm(grezzo);
    if (!u || u.startsWith('[') || NON_CONTARE.has(u) || u === ch) continue;
    presenti.add(u);
    const n = (m.get(u) || 0) + 1;
    m.set(u, n);
    if (n !== GIRI_MINIMI) continue;
    const nuovo = contaPresenza(store.get(ch, u), d, { ora, bonus: c.bonus, tetto: c.tetto });
    if (!nuovo) continue;
    const { bonus, traguardo, ...campi } = nuovo;
    store.set(ch, u, campi);
    if (bonus > 0) { try { points.add(ch, u, bonus); } catch (e) { log.debug(`#${ch} bonus a ${u}:`, e?.message || e); } }
    const voce = { user: u, serie: nuovo.serie, dirette: nuovo.dirette, record: nuovo.record, bonus, traguardo };
    esito.presenze.push(voce);
    if (traguardo) esito.traguardi.push(voce);
  }
  // chi e' uscito ricomincia da zero: la presenza vuole due giri di fila
  for (const k of m.keys()) if (!presenti.has(k)) m.delete(k);
  return esito;
}

// Cosa dire in chat dopo un giro: i traguardi, al piu' una riga al minuto.
const annunci = new Map();
export function annunciDi(channel, esito, { ora = Date.now() } = {}) {
  const ch = norm(channel);
  if (!esito?.traguardi?.length || !cfg(ch).annuncia) return [];
  if (ora - (annunci.get(ch) || 0) < RIPOSO_ANNUNCIO_MS) return [];
  annunci.set(ch, ora);
  const t = esito.traguardi;
  if (t.length === 1) {
    const x = t[0];
    return [`📅 ${ordinale(x.serie)} diretta di fila per @${x.user}! Grazie di esserci sempre${x.bonus ? `: +${x.bonus} ${nomeMonete(ch)}` : ''}.`];
  }
  return [`📅 Serie di presenze: ${t.slice(0, 4).map((x) => `@${x.user} (${x.serie})`).join(', ')} dirette di fila. Grazie di esserci sempre!`];
}

// ---------------------------------------------------------------- i saluti
const riposi = new Map();   // canale → { ultimo, finestra: [ts] }
function riposoOk(ch, ora) {
  const r = riposi.get(ch) || { ultimo: 0, finestra: [] };
  r.finestra = r.finestra.filter((t) => ora - t < SALUTI_FINESTRA_MS);
  if (ora - r.ultimo < RIPOSO_SALUTO_MS || r.finestra.length >= SALUTI_MAX) { riposi.set(ch, r); return false; }
  r.ultimo = ora; r.finestra.push(ora); riposi.set(ch, r);
  return true;
}

export function moduloSulPrimoMessaggio(channel) {
  try { return modulesDb.list(norm(channel)).some((m) => m.attivo && m.trigger?.tipo === 'evento' && m.trigger?.evento === 'first'); }
  catch { return false; }
}

// Chiamata per ogni messaggio. Aggiorna «visto» e, se e' il caso, saluta.
// Ritorna 'prima' | 'ritorno' | null (cosa ha detto).
export function suMessaggio(msg, say, { ora = Date.now(), live = true } = {}) {
  if (!msg || msg.isSelf || msg.from_bot) return null;
  const ch = norm(msg.channel), u = norm(msg.user);
  if (!ch || !u || u === ch || u.startsWith('[') || NON_CONTARE.has(u)) return null;
  const c = cfg(ch);
  const r = store.get(ch, u);
  const suTwitch = !msg.piattaforma || msg.piattaforma === 'twitch';
  const prima = suTwitch
    ? msg.tags?.['first-msg'] === '1'
    : (!r?.prima_ts && !r?.ultimo_msg && memory.storiaDi(ch, u).quanti <= 1);
  const ultimoSegno = Math.max(r?.ultimo_msg || 0, r?.ultima_ts || 0);
  const giorni = ultimoSegno ? Math.floor((ora - ultimoSegno) / GIORNO) : 0;
  const ritorno = !prima && ultimoSegno > 0 && giorni >= c.saluti.giorniAssenza;
  // «visto adesso»: una scrittura al minuto per persona basta, e la prima volta subito
  if (!r || prima || ora - (r.ultimo_msg || 0) >= 60_000) store.set(ch, u, { ultimo_msg: ora, prima_ts: r?.prima_ts || ora, salutato: r?.salutato || (prima ? 1 : 0) });
  if (!c.attivo || !c.saluti.attivo) return null;
  if (String(msg.text || '').trim().startsWith('!')) return null;
  if (c.saluti.soloLive && !live) return null;
  const tipo = prima ? (r?.salutato || moduloSulPrimoMessaggio(ch) ? null : 'prima') : (ritorno ? 'ritorno' : null);
  if (!tipo) return null;
  const modello = tipo === 'prima' ? c.saluti.primaVolta : c.saluti.bentornato;
  if (!modello) return null;
  if (!riposoOk(ch, ora)) return null;
  const frase = riempi(modello, { user: msg.display || u, giorni, serie: r?.serie || 0, dirette: r?.dirette || 0 });
  if (frase) say(frase);
  return tipo;
}

// ---------------------------------------------------------------- comandi e variabili
export function di(channel, user) {
  const r = store.get(norm(channel), norm(user));
  return r ? { serie: r.serie | 0, dirette: r.dirette | 0, record: r.record | 0 } : { serie: 0, dirette: 0, record: 0 };
}

export function classifica(channel, n = 5) {
  return store.top(norm(channel), n).map((r) => ({ user: r.user, serie: r.serie, dirette: r.dirette, record: r.record }));
}

const plurale = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
export function testoSerie(channel, user, nome) {
  const p = di(channel, user);
  const chi = nome || user;
  if (!p.dirette) return `📅 @${chi} non risulta ancora a nessuna diretta: si conta dopo dieci minuti in chat.`;
  return `📅 @${chi}: ${plurale(p.serie, 'diretta di fila', 'dirette di fila')} (record ${p.record}), presente a ${plurale(p.dirette, 'diretta', 'dirette')} in tutto.`;
}
const medaglia = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}°`;
export function testoClassifica(channel, n = 5) {
  const top = classifica(channel, n);
  if (!top.length) return '📅 Nessuna serie ancora: la prima diretta si conta dopo dieci minuti in chat.';
  return '📅 Serie di presenze: ' + top.map((r, i) => `${medaglia(i)} ${r.user} ${r.serie}`).join(' · ');
}

// !serie [@nome] · !classificaserie — i nomi canonici sono nel registro dei comandi.
export function tryComando(msg, say) {
  try {
    if (!msg) return false;
    const t = String(msg.text || '').trim();
    if (!t.startsWith('!')) return false;
    const ch = norm(msg.channel);
    const parti = t.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    if (cmd !== 'serie' && cmd !== 'classificaserie') return false;
    if (!cfg(ch).attivo) return false;
    if (cmd === 'classificaserie') { say(testoClassifica(ch)); return true; }
    const altro = String(parti[0] || '').replace(/^@/, '').toLowerCase();
    const chi = /^[a-z0-9_]{2,25}$/.test(altro) ? altro : norm(msg.user);
    say(testoSerie(ch, chi, chi === norm(msg.user) ? (msg.display || chi) : chi));
    return true;
  } catch (e) { log.debug('tryComando:', e?.message || e); return false; }
}
