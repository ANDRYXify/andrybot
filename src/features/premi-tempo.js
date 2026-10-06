// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE CHE DURANO (docs/PREMI-A-TEMPO.md).
//
// «Solo emote per 5 minuti», «Parla in inglese per 10 minuti», «VIP per un
// giorno»: il tempo scritto nel nome di un premio qui diventa vero. Parte
// quando qualcuno lo riscatta, si vede sull'overlay, il bot lo dice in chat e
// finisce da solo.
//
// IL MODELLO, in breve:
//  · la durata e' DEL PREMIO: la scelta dello streamer per quel premio, se no
//    il nome, se no la descrizione. Il nome si legge solo se e' senza dubbi;
//  · COSA DURA lo sceglie solo lo streamer. Una durata letta dal nome vale
//    sempre «solo il tempo»: il bot non accende una modalita' della chat e non
//    da' un VIP perche' un nome lo fa pensare;
//  · UN POSTO SOLO PER OGNI TEMPO: il conto di un premio sta nella sua riga
//    (stati vivi, `premi-tempo`), quello di una modalita' della chat nella riga
//    della modalita' (che ricorda il premio e chi), il VIP fra i VIP. Overlay,
//    pannello e !tempi leggono da li' (inCorso), e nessuno tiene una copia.
import { statoVivo, pointAlerts } from '../db.js';
import { makeLog } from '../logger.js';
import * as voce from './voce.js';
import { linguaChat } from './lingua-canale.js';
import { MODI as MODI_CHAT, chiaveModo, DURATA_MAX as MAX_MODO } from './modalita-chat.js';

const log = makeLog('premi-tempo');

export const DURATA_MIN = 10;
export const DURATA_MAX = 30 * 86_400;
export const VIP_MIN = 60;
export const COSE = Object.freeze(['tempo', 'emote', 'unici', 'sub', 'vip']);
export const SOLO_TWITCH = Object.freeze(['emote', 'unici', 'sub', 'vip']);
export const DOPPI = Object.freeze(['somma', 'adesso']);
export const MAX_TESTO_FINE = 200;
const CHIAVE = 'premi-tempo';
const SONNO_MAX = 3_600_000;          // un setTimeout piu' lungo di 24 giorni scatta subito
const VECCHIA_MS = 15 * 60_000;       // scaduta da piu' di un quarto d'ora: finisce in silenzio
const RIPRESA_MS = 10_000;            // all'avvio la chat ha bisogno di un attimo
const MAX_CHI = 5;

const cosaPermessa = (cosa, piattaforma) => COSE.includes(cosa) && (piattaforma === 'twitch' || !SOLO_TWITCH.includes(cosa));
export const COSE_DI = (piattaforma) => COSE.filter((c) => cosaPermessa(c, piattaforma));

// ── la durata scritta in un testo ─────────────────────────────────────────

const NORM = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’`´]/g, "'");

// [secondi, singolari, plurali, abbreviazioni (anche staccate), lettere (solo attaccate)]
const UNITA = [
  [2_592_000, ['mese', 'month', 'mes'], ['mesi', 'months', 'meses'], [], []],
  [604_800, ['settimana', 'week', 'semana'], ['settimane', 'weeks', 'semanas'], ['sett', 'wk', 'wks'], []],
  [86_400, ['giorno', 'day', 'dia'], ['giorni', 'days', 'dias'], ['gg'], ['d']],
  [3_600, ['ora', 'hour', 'hora'], ['ore', 'hours', 'horas'], ['hr', 'hrs'], ['h']],
  [60, ['minuto', 'minute'], ['minuti', 'minutes', 'minutos'], ['min', 'mins'], ['m']],
  [1, ['secondo', 'second', 'segundo'], ['secondi', 'seconds', 'segundos'], ['sec', 'secs', 'seg', 'segs'], ['s']],
];
const PAROLA = new Map();     // parola → { s, singolare }
const LETTERA = new Map();    // lettera attaccata → s
for (const [s, sing, plur, abbr, lettere] of UNITA) {
  for (const p of sing) PAROLA.set(p, { s, singolare: true });
  for (const p of [...plur, ...abbr]) PAROLA.set(p, { s, singolare: false });
  for (const l of [...abbr, ...lettere]) LETTERA.set(l, s);
}

const NUMERI = {
  "un'": 1, un: 1, uno: 1, una: 1, one: 1,
  due: 2, two: 2, dos: 2, tre: 3, three: 3, tres: 3, quattro: 4, four: 4, cuatro: 4,
  cinque: 5, five: 5, cinco: 5, sei: 6, six: 6, seis: 6, sette: 7, seven: 7, siete: 7,
  otto: 8, eight: 8, ocho: 8, nove: 9, nine: 9, nueve: 9, dieci: 10, ten: 10, diez: 10,
  quindici: 15, fifteen: 15, quince: 15, venti: 20, twenty: 20, veinte: 20,
  trenta: 30, thirty: 30, treinta: 30, quaranta: 40, forty: 40, cuarenta: 40,
  quarantacinque: 45, cinquanta: 50, fifty: 50, cincuenta: 50, sessanta: 60, sixty: 60, sesenta: 60,
};
// «a minute», «an hour»: l'articolo inglese vale uno solo davanti alle unita'
// inglesi al singolare. «a minuti» e' italiano e vuol dire «presto».
const ARTICOLO = new Set(['a', 'an']);
const INGLESI_SINGOLARI = new Set(['minute', 'hour', 'day', 'week', 'month']);
const MEZZO = /^(mezzo|mezza|medio|media)$/;

// Le forme fatte: si riscrivono una volta in numero e unita'.
const FATTE = [
  [/\bun\s*quarto\s+d'?\s*ora\b|\bquarto\s+d'?\s*ora\b|\bun\s+cuarto\s+de\s+hora\b|\bcuarto\s+de\s+hora\b|\ba\s+quarter\s+(?:of\s+an\s+)?hour\b/g, ' 15 min '],
  [/\bmezz'?\s*ora\b|\bmezza\s+ora\b|\bmedia\s+hora\b|\bhalf\s+an?\s+hour\b|\bhalf\s+hour\b/g, ' 30 min '],
  [/\btre\s+quarti\s+d'?\s*ora\b|\bthree\s+quarters\s+of\s+an\s+hour\b|\btres\s+cuartos\s+de\s+hora\b/g, ' 45 min '],
];

function gettoni(testo) {
  let t = NORM(testo);
  for (const [re, con] of FATTE) t = t.replace(re, con);
  t = t.replace(/'/g, "' ");
  return t.match(/\d+(?:[.,]\d+)?[a-z]*|[a-z]+'?|[,&]/g) || [];
}

// Legge «quanto + unita'» a partire da i. Ritorna { s, unita, fine } o null.
function leggiPezzo(g, i) {
  const t = g[i];
  if (!t) return null;
  const num = /^(\d+(?:[.,]\d+)?)([a-z]*)$/.exec(t);
  let n = null; let unita = null; let j = i + 1;
  if (num) {
    n = Number(num[1].replace(',', '.'));
    if (num[2]) {
      // attaccata al numero: «5m», «30s», «10min», «2ore»
      const p = PAROLA.get(num[2]);
      unita = LETTERA.get(num[2]) ?? (p ? p.s : null);
      if (!unita) return null;
      if (p?.singolare && n >= 2) return null;
    }
  } else if (NUMERI[t] != null) n = NUMERI[t];
  else if (ARTICOLO.has(t) && INGLESI_SINGOLARI.has(g[i + 1])) n = 1;
  else return null;
  if (!unita) {
    // staccata: solo una parola o un'abbreviazione, mai una lettera («100 m»
    // sono metri). Un'unita' al singolare vuole uno: «sei ora» non sono sei ore.
    const p = PAROLA.get(g[j]);
    if (!p) return null;
    if (p.singolare && n >= 2) return null;
    unita = p.s; j++;
  }
  let s = n * unita;
  // «e mezzo», «and a half», «y media»
  if (['e', 'and', 'y'].includes(g[j]) && (MEZZO.test(g[j + 1] || '') || (g[j + 1] === 'a' && g[j + 2] === 'half'))) {
    s += unita / 2; j += g[j + 1] === 'a' ? 3 : 2;
  }
  return { s, unita, fine: j };
}

// Una durata scritta in un testo, in secondi, oppure null. Solo se e' senza
// dubbi: due durate diverse non sono una durata. Pezzi vicini con unita' che
// scendono sono una durata sola («1 ora e 30 minuti», «1h 30m», «1h30»).
export function durataDalTesto(testo) {
  const g = gettoni(testo);
  const trovate = [];
  for (let i = 0; i < g.length;) {
    const p = leggiPezzo(g, i);
    if (!p) { i++; continue; }
    let { s, unita, fine } = p;
    for (;;) {
      let k = fine;
      while (['e', 'and', 'y', ',', '&'].includes(g[k])) k++;
      const dopo = leggiPezzo(g, k);
      // «1h 30»: dopo le ore un numero nudo sotto i 60 sono minuti
      if (!dopo && unita === 3_600 && /^\d{1,2}$/.test(g[k] || '') && Number(g[k]) < 60 && !PAROLA.has(g[k + 1])) {
        s += Number(g[k]) * 60; unita = 60; fine = k + 1; continue;
      }
      if (!dopo || dopo.unita >= unita) break;
      s += dopo.s; unita = dopo.unita; fine = dopo.fine;
    }
    trovate.push(Math.round(s));
    i = fine;
  }
  const diverse = [...new Set(trovate)];
  if (diverse.length !== 1) return null;
  const s = diverse[0];
  return s >= DURATA_MIN && s <= DURATA_MAX ? s : null;
}

// Cosa fa pensare il nome. Solo un SUGGERIMENTO per il pannello: non si
// applica mai da se'.
export function cosaDalNome(testo) {
  const t = NORM(testo);
  if (/\b(togli|toglie|rimuov|leva|remove|quita|quitar|unvip)\w*/.test(t)) return null;
  if (/\bsolo\s+(?:le\s+|los\s+)?emot|\bemotes?[\s-]*only\b|\bemote[\s-]*mode\b|\bmodo\s+emot/.test(t)) return 'emote';
  if (/messaggi\s+unici|unique\s+(?:chat|messages|mode)|mensajes\s+unicos|\br9k\b/.test(t)) return 'unici';
  if (/\bsolo\s+(?:abbonati|sub|subs|suscriptores)\b|\bsub(?:scriber)?s?[\s-]*only\b/.test(t)) return 'sub';
  if (/\bvip\b/.test(t)) return 'vip';
  return null;
}

// ── le parole del tempo, nella lingua della chat ──────────────────────────

const PAROLE = {
  it: { w: ['settimana', 'settimane'], d: ['giorno', 'giorni'], h: ['ora', 'ore'], m: ['minuto', 'minuti'], s: ['secondo', 'secondi'], e: ' e ' },
  en: { w: ['week', 'weeks'], d: ['day', 'days'], h: ['hour', 'hours'], m: ['minute', 'minutes'], s: ['second', 'seconds'], e: ' and ' },
  es: { w: ['semana', 'semanas'], d: ['día', 'días'], h: ['hora', 'horas'], m: ['minuto', 'minutos'], s: ['segundo', 'segundos'], e: ' y ' },
};

// «10 minuti», «1 ora e 30 minuti», «2 giorni e 3 ore». Le due unita' piu'
// grandi che ci sono: in chat «1 giorno, 2 ore, 3 minuti e 4 secondi» non lo
// legge nessuno.
export function durataAParole(secondi, lingua = 'it') {
  const P = PAROLE[lingua] || PAROLE.it;
  const tot = Math.max(0, Math.round(Number(secondi) || 0));
  const una = (n, [s, p]) => `${n} ${n === 1 ? s : p}`;
  if (tot >= 604_800 && tot % 604_800 === 0) return una(tot / 604_800, P.w);
  const pezzi = [[Math.floor(tot / 86_400), P.d], [Math.floor(tot % 86_400 / 3_600), P.h], [Math.floor(tot % 3_600 / 60), P.m], [tot % 60, P.s]];
  const ci = pezzi.filter(([n]) => n > 0).slice(0, 2).map(([n, u]) => una(n, u));
  return ci.length ? ci.join(P.e) : una(0, P.s);
}

// Quanto manca, da orologio: «6:12», «1:02:03»; da un giorno in su, a parole.
export function orologio(ms, lingua = 'it') {
  const t = Math.max(0, Math.ceil(Number(ms) / 1000) || 0);
  if (t >= 86_400) return durataAParole(t - t % 60, lingua);
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  const due = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${due(m)}:${due(s)}` : `${m}:${due(s)}`;
}

// ── la scelta dello streamer per un premio ────────────────────────────────

// Quello che arriva dal pannello, pulito. `durata` 0 vuol dire «come dice il
// nome». Ritorna { tempo } oppure { errore } detto per chi lo legge.
export function normTempo(x, piattaforma = 'twitch') {
  x = x && typeof x === 'object' ? x : {};
  const spento = x.spento === true;
  const cosa = COSE.includes(x.cosa) ? x.cosa : 'tempo';
  if (!cosaPermessa(cosa, piattaforma)) return { errore: 'solo-twitch' };
  const d = Math.round(Number(x.durata) || 0);
  if (d && (d < DURATA_MIN || d > DURATA_MAX)) return { errore: 'durata' };
  if (d && cosa === 'vip' && d < VIP_MIN) return { errore: 'vip-corto' };
  if (d && MODI_CHAT[cosa] && d > MAX_MODO) return { errore: 'modo-lungo' };
  return {
    tempo: {
      spento,
      durata: d,
      cosa,
      doppio: DOPPI.includes(x.doppio) ? x.doppio : 'somma',
      fineChat: x.fineChat !== false,
      testoFine: String(x.testoFine ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TESTO_FINE),
    },
  };
}

// Una scelta uguale a quella di serie non e' una scelta: non si scrive, e il
// premio dura quanto dice il suo nome.
export const eDiSerie = (t) => !t || (!t.spento && !t.durata && t.cosa === 'tempo' && t.doppio === 'somma'
  && t.fineChat !== false && !t.testoFine);

export const leggiSalvato = (riga) => {
  if (!riga?.tempo) return null;
  try { const o = JSON.parse(riga.tempo); return o && typeof o === 'object' ? o : null; } catch { return null; }
};

// IL TEMPO DI UN PREMIO, come vale adesso: la scelta dello streamer, se no il
// nome, se no la descrizione. null: il premio non dura.
export function tempoDi(salvato, premio = {}, piattaforma = 'twitch') {
  if (salvato?.spento) return null;
  const dalNome = durataDalTesto(premio.title);
  const dallaDescrizione = dalNome ? null : durataDalTesto(premio.prompt);
  const scelta = Math.round(Number(salvato?.durata) || 0);
  const durata = scelta || dalNome || dallaDescrizione;
  if (!durata) return null;
  let cosa = COSE.includes(salvato?.cosa) ? salvato.cosa : 'tempo';
  if (!cosaPermessa(cosa, piattaforma)) cosa = 'tempo';
  let d = durata;
  if (MODI_CHAT[cosa]) d = Math.min(d, MAX_MODO);
  if (cosa === 'vip') d = Math.max(d, VIP_MIN);
  return {
    durata: d,
    origine: scelta ? 'scelta' : (dalNome ? 'nome' : 'descrizione'),
    cosa,
    doppio: DOPPI.includes(salvato?.doppio) ? salvato.doppio : 'somma',
    fineChat: salvato?.fineChat !== false,
    testoFine: String(salvato?.testoFine || ''),
  };
}

// Il tempo del premio di un riscatto: la sua riga, se c'e', e il premio.
export function tempoDelRiscatto(channel, data) {
  const id = String(data?.reward?.id || '');
  if (!id) return null;
  const riga = pointAlerts.getByReward(channel, id);
  return tempoDi(leggiSalvato(riga), { title: data?.reward?.title, prompt: data?.reward?.prompt }, data?.piattaforma || 'twitch');
}

// ── quello che corre adesso ───────────────────────────────────────────────

const NOMI_MODO = {
  emote: ['Solo emote', 'Emote only', 'Solo emotes'],
  unici: ['Messaggi unici', 'Unique chat', 'Mensajes únicos'],
  sub: ['Solo abbonati', 'Subscribers only', 'Solo suscriptores'],
};
const IDX = { it: 0, en: 1, es: 2 };

const leggiLista = (ch) => {
  const r = statoVivo.leggi(ch, CHIAVE);
  return Array.isArray(r?.lista) ? r.lista.filter((x) => x && x.chiave && Number(x.fino) > 0) : [];
};

// L'ELENCO DI QUELLO CHE CORRE, letto dai posti che lo tengono: i premi «solo
// il tempo» e le modalita' della chat accese a tempo, da un premio o da un
// mod. Ordinato da quello che finisce prima.
export function inCorso(channel, ora = Date.now()) {
  const ch = String(channel || '').toLowerCase();
  if (!ch) return [];
  const lingua = linguaChat(ch);
  const out = [];
  for (const r of leggiLista(ch)) {
    if (Number(r.fino) <= ora) continue;
    out.push({ chiave: r.chiave, cosa: 'tempo', titolo: r.titolo, chi: r.chi || [], da: Number(r.da) || ora, fino: Number(r.fino) });
  }
  for (const modo of Object.keys(MODI_CHAT)) {
    const st = statoVivo.leggi(ch, chiaveModo(modo));
    if (!(Number(st?.fino) > ora)) continue;
    out.push({
      chiave: 'm:' + modo,
      cosa: modo,
      titolo: st.premio?.titolo || NOMI_MODO[modo][IDX[lingua] ?? 0],
      chi: Array.isArray(st.premio?.chi) ? st.premio.chi : [],
      da: Number(st.da) || ora,
      fino: Number(st.fino),
    });
  }
  return out.sort((a, b) => a.fino - b.fino);
}

const aggiungiChi = (lista, nome) => [...(lista || []).filter((x) => x !== nome), nome].slice(-MAX_CHI);
const stendi = (testo, dati) => String(testo || '').replace(/\{(user|premio|durata)\}/g, (_, k) => String(dati[k] ?? ''));

// ── !tempi ────────────────────────────────────────────────────────────────
//
// Chiunque: cosa corre e quanto manca. Un mod: «!tempi stop» ferma tutto,
// «!tempi stop inglese» solo quello che si chiama cosi'. Il nome arriva gia'
// tradotto dal vaglio dei comandi (comandi-registro.js). Fermare un tempo e'
// farlo finire: la chat sente la sua fine, come quando scade.
export async function tryComando(istanza, msg, say) {
  const m = /^!tempi(?:\s+(.*))?$/i.exec(String(msg?.text || '').trim());
  if (!m) return false;
  const ch = String(msg.channel || '').toLowerCase();
  const stop = /^(stop|ferma|basta|off)\b\s*(.*)$/i.exec(String(m[1] || '').trim());
  const lista = inCorso(ch, istanza?.ora?.() ?? Date.now());
  if (stop && (msg.isMod || msg.isBroadcaster) && istanza) {
    const nome = NORM(stop[2]).trim();
    const quali = nome ? lista.filter((x) => NORM(x.titolo).includes(nome)) : lista;
    for (const x of quali) await istanza.ferma(ch, x.chiave);
    if (!quali.length) { const t = voce.di(ch, 'tempi-vuoto', {}); if (t) say(t); }
    return true;
  }
  if (!lista.length) { const t = voce.di(ch, 'tempi-vuoto', {}); if (t) say(t); return true; }
  const ora = istanza?.ora?.() ?? Date.now();
  const lingua = linguaChat(ch);
  const elenco = lista.map((x) => `${x.titolo} ${orologio(x.fino - ora, lingua)}`).join(', ');
  const t = voce.di(ch, 'tempi-elenco', { elenco });
  if (t) say(t);
  return true;
}

// ── il motore ─────────────────────────────────────────────────────────────

export class PremiATempo {
  // say(canale, testo, dove)      parla nella chat della piattaforma `dove`
  // emit(canale, payload)         all'overlay
  // modalita                      ModalitaChat (modalita-chat.js)
  // vip(canale, login, ms, doppio) → { ok, esito, motivo }   (vip.js, vipPerPremio)
  // vipScade(ms)                  sveglia la ronda dei VIP quando ne scade uno
  // quandoFinisce(canale, riga)   per i Moduli: «finisce il tempo di un premio»
  constructor({ say, emit, modalita = null, vip = null, vipScade = null, quandoFinisce = null,
    orologio: oraDi = () => Date.now(), timer = setTimeout, annulla = clearTimeout } = {}) {
    this.say = say || (() => {});
    this.emit = emit || (() => {});
    this.modalita = modalita;
    this.vip = vip;
    this.vipScade = vipScade;
    this.quandoFinisce = quandoFinisce;
    this.ora = oraDi;
    this.timer = timer;
    this.annulla = annulla;
    this.sveglie = new Map();
  }

  manda(channel) {
    const ch = String(channel || '').toLowerCase();
    try { this.emit(ch, { tipo: 'tempi', elenco: inCorso(ch, this.ora()) }); } catch (e) { log.debug('overlay:', e?.message || e); }
  }

  _scrivi(ch, lista) {
    if (lista.length) statoVivo.scrivi(ch, CHIAVE, { lista });
    else statoVivo.togli(ch, CHIAVE);
  }

  _punta(ch, chiave, fino) {
    const k = `${ch}|${chiave}`;
    this.annulla(this.sveglie.get(k));
    const t = this.timer(() => { this.sveglie.delete(k); this._sveglia(ch, chiave); }, Math.min(SONNO_MAX, Math.max(0, fino - this.ora())));
    t?.unref?.();
    this.sveglie.set(k, t);
  }

  _sveglia(ch, chiave, { zitto = false } = {}) {
    const r = leggiLista(ch).find((x) => x.chiave === chiave);
    if (!r) return;
    if (Number(r.fino) > this.ora()) { this._punta(ch, chiave, Number(r.fino)); return; }
    this._fine(ch, r, { zitto });
  }

  // LA FINE di un premio «solo il tempo»: la riga se ne va, l'overlay lo sa, e
  // la chat lo sente se lo streamer lo vuole.
  _fine(ch, r, { zitto = false } = {}) {
    this._scrivi(ch, leggiLista(ch).filter((x) => x.chiave !== r.chiave));
    const k = `${ch}|${r.chiave}`;
    this.annulla(this.sveglie.get(k));
    this.sveglie.delete(k);
    this.manda(ch);
    const nome = (r.chi || []).at(-1) || '';
    if (zitto) { log.info(`#${ch} premio a tempo «${r.titolo}» finito mentre il bot era fermo`); return; }
    if (r.fineChat !== false) {
      const testo = r.testoFine
        ? stendi(r.testoFine, { user: nome, premio: r.titolo, durata: durataAParole(Number(r.durata) || 0, linguaChat(ch)) })
        : voce.di(ch, 'premio-tempo-fine', { premio: r.titolo, nome });
      const dove = r.dove || 'twitch';
      if (testo) this.say(ch, testo.slice(0, 400), dove);
    }
    if (!r.prova) { try { this.quandoFinisce?.(ch, r); } catch (e) { log.debug('fine premio:', e?.message || e); } }
    log.info(`#${ch} fine del premio a tempo «${r.titolo}»`);
  }

  // UN RISCATTO DI UN PREMIO CHE DURA. `cfg` e' tempoDi(...). `avviso(opz)`
  // fa partire effetto e messaggio del premio (bot._premioRiscattato) e dice
  // se il premio ha un messaggio suo. Prima si fa la cosa che dura, poi si
  // festeggia: se la cosa non si puo' fare, niente festa e i punti tornano.
  async daRiscatto(channel, data, cfg, { premiatore = null, avviso = () => ({}) } = {}) {
    const ch = String(channel || '').toLowerCase();
    const premio = String(data?.reward?.title || '').trim().slice(0, 60) || '?';
    const rewardId = String(data?.reward?.id || '');
    const nome = String(data?.user_name || data?.user_login || '').trim() || '?';
    const login = String(data?.user_login || '').toLowerCase();
    const dove = String(data?.piattaforma || 'twitch');
    const lingua = linguaChat(ch);
    const D = Math.round(Number(cfg?.durata) || 0);
    if (!ch || !D) return { esito: 'niente' };
    const ora = this.ora();
    let esito; let fino;

    if (cfg.cosa === 'tempo') {
      const lista = leggiLista(ch);
      const chiave = 'p:' + rewardId;
      const r = lista.find((x) => x.chiave === chiave && Number(x.fino) > ora && !x.prova);
      if (r) {
        fino = cfg.doppio === 'adesso' ? Math.max(Number(r.fino), ora + D * 1000) : Number(r.fino) + D * 1000;
        fino = Math.min(fino, ora + DURATA_MAX * 1000);
        // un riscatto che non sposta la fine non compra niente: i punti tornano
        if (fino <= Number(r.fino)) return this._noPuo(ch, data, { premio, nome, dove, premiatore, motivo: 'gia' });
        Object.assign(r, { fino, chi: aggiungiChi(r.chi, nome), dove, titolo: premio, durata: D, fineChat: cfg.fineChat, testoFine: cfg.testoFine });
        esito = 'piu';
      } else {
        fino = ora + D * 1000;
        lista.splice(0, lista.length, ...lista.filter((x) => x.chiave !== chiave));
        lista.push({ chiave, rewardId, titolo: premio, chi: [nome], login, dove, da: ora, fino, durata: D, fineChat: cfg.fineChat, testoFine: cfg.testoFine });
        esito = 'via';
      }
      this._scrivi(ch, lista);
      this._punta(ch, chiave, fino);
    } else if (MODI_CHAT[cfg.cosa]) {
      const st = statoVivo.leggi(ch, chiaveModo(cfg.cosa));
      const prima = Number(st?.fino) > ora ? Number(st.fino) : 0;
      const resta = prima ? (prima - ora) / 1000 : 0;
      const secondi = Math.min(MAX_MODO, cfg.doppio === 'somma' ? resta + D : D);
      // gia' al tetto, o «riparte da adesso» con piu' tempo davanti: non
      // cambierebbe niente, e i punti tornano senza toccare la chat
      if (prima && ora + secondi * 1000 <= prima) return this._noPuo(ch, data, { premio, nome, dove, premiatore, motivo: 'gia' });
      const r = await this.modalita?.accendiPer(ch, cfg.cosa, secondi, { annuncia: false, premio: { titolo: premio, chi: nome } })
        .catch((e) => ({ ok: false, esito: 'errore', motivo: e?.message }));
      if (!r?.ok || r.esito === 'gia') return this._noPuo(ch, data, { premio, nome, dove, premiatore, motivo: r?.esito === 'gia' ? 'gia' : (r?.motivo || 'errore') });
      fino = Number(r.fino) || ora + D * 1000;
      esito = r.esito === 'esteso' ? 'piu' : 'via';
    } else if (cfg.cosa === 'vip') {
      const r = dove === 'twitch' && login && this.vip
        ? await this.vip(ch, login, D * 1000, cfg.doppio).catch((e) => ({ ok: false, motivo: e?.message }))
        : { ok: false, motivo: 'piattaforma' };
      if (!r?.ok) return this._noPuo(ch, data, { premio, nome, dove, premiatore, motivo: r?.motivo || 'errore' });
      fino = Number(r.fino) || ora + D * 1000;
      esito = r.esito === 'piu' ? 'piu' : 'via';
      try { this.vipScade?.(Math.max(0, fino - ora)); } catch { /* la ronda dei cinque minuti */ }
    } else return { esito: 'niente' };

    // la cosa c'e': il riscatto e' fatto, e si festeggia
    Promise.resolve(premiatore?.aggiornaRedemption?.(ch, rewardId, data?.id, 'FULFILLED')).catch(() => {});
    let suo = false;
    try { suo = !!avviso({ chiudi: false, durata: durataAParole(D, lingua) })?.detto; } catch (e) { log.debug('avviso:', e?.message || e); }
    if (!suo) {
      const testo = esito === 'piu'
        ? voce.di(ch, 'premio-tempo-piu', { nome, premio, resta: durataAParole(Math.round((fino - ora) / 1000), lingua) })
        : voce.di(ch, 'premio-tempo-via', { nome, premio, durata: durataAParole(D, lingua) });
      if (testo) this.say(ch, testo, dove);
    }
    // le modalita' della chat lo dicono all'overlay da se' (quandoCambia)
    if (cfg.cosa === 'tempo') this.manda(ch);
    log.info(`#${ch} premio a tempo «${premio}» (${cfg.cosa}, ${esito}) da ${nome}: fino a ${new Date(fino).toISOString()}`);
    return { esito, fino };
  }

  // NON SI PUO' FARE: il riscatto si annulla, e su Twitch annullare restituisce
  // i punti. Si dice «te li ho restituiti» solo se e' successo davvero.
  async _noPuo(ch, data, { premio, nome, dove, premiatore, motivo }) {
    let ridati = false;
    try { ridati = !!(await premiatore?.aggiornaRedemption?.(ch, String(data?.reward?.id || ''), data?.id, 'CANCELED')); } catch { ridati = false; }
    const testo = voce.di(ch, ridati && dove === 'twitch' ? 'premio-tempo-rimborso' : 'premio-tempo-no', { nome, premio });
    if (testo) this.say(ch, testo, dove);
    log.info(`#${ch} premio a tempo «${premio}» di ${nome} non fatto (${motivo})${ridati ? ', riscatto annullato' : ''}`);
    return { esito: 'no', motivo, ridati };
  }

  // LA PROVA DAL PANNELLO: il conto alla rovescia del premio, solo in scena.
  // Non scrive in chat, non tocca la chat e non da' VIP, non chiude nessun
  // riscatto e alla fine non e' un evento dei Moduli: si vede com'e', e basta.
  // Si ferma come gli altri, e un riscatto vero dello stesso premio la prende
  // al suo posto.
  prova(channel, { rewardId, titolo, durata, chi }) {
    const ch = String(channel || '').toLowerCase();
    const D = Math.round(Number(durata) || 0);
    if (!ch || !rewardId || D < DURATA_MIN) return null;
    const ora = this.ora();
    const chiave = 'p:' + rewardId;
    const lista = leggiLista(ch).filter((x) => x.chiave !== chiave);
    const fino = ora + Math.min(D, DURATA_MAX) * 1000;
    lista.push({ chiave, rewardId, titolo: String(titolo || '').slice(0, 60) || '?', chi: chi ? [String(chi)] : [], dove: 'twitch', da: ora, fino, durata: D, fineChat: false, prova: true });
    this._scrivi(ch, lista);
    this._punta(ch, chiave, fino);
    this.manda(ch);
    return { fino };
  }

  // FINIRE PRIMA, dal pannello o da un mod: «p:…» e' un premio, «m:…» una
  // modalita' della chat (che si spegne come con !soloemote off).
  async ferma(channel, chiave) {
    const ch = String(channel || '').toLowerCase();
    const k = String(chiave || '');
    if (k.startsWith('m:')) {
      const r = await this.modalita?.spegniOra(ch, k.slice(2)).catch(() => null);
      return !!r?.nostra;
    }
    const r = leggiLista(ch).find((x) => x.chiave === k);
    if (!r) return false;
    this._fine(ch, { ...r, fino: this.ora() });
    return true;
  }

  // ALL'AVVIO: si ripunta quello che corre. Quello che e' scaduto mentre il
  // bot era giu' finisce fra un attimo (la chat deve essere collegata); se e'
  // scaduto da piu' di un quarto d'ora, finisce in silenzio.
  riprendi() {
    let righe = [];
    try { righe = statoVivo.tutti(CHIAVE); } catch { righe = []; }
    const ora = this.ora();
    for (const { channel, dato } of righe) {
      for (const r of Array.isArray(dato?.lista) ? dato.lista : []) {
        if (!r?.chiave) continue;
        const fino = Number(r.fino) || 0;
        if (fino > ora) { this._punta(channel, r.chiave, fino); continue; }
        const zitto = ora - fino > VECCHIA_MS;
        const t = this.timer(() => this._sveglia(channel, r.chiave, { zitto }), RIPRESA_MS);
        t?.unref?.();
      }
    }
  }

  spegni() {
    for (const t of this.sveglie.values()) this.annulla(t);
    this.sveglie.clear();
  }
}
