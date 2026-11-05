// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SUBATHON: la diretta dura quanto dice l'orologio (docs/SUBATHON.md).
//
// HA UN OROLOGIO SUO, nella sua sessione (overlayStato.subathon: inizio, fine,
// pausa, felice, finita), e non tocca il conto alla rovescia dello streamer:
// sono due significati diversi («si comincia tra» e «quanto dura la diretta»),
// e un orologio solo per tutti e due mostrava l'uno al posto dell'altro
// (docs/SUBATHON.md, «Novembre 2026: un orologio suo»). Tutto quello che lo
// muove passa da qui, e passa in un modo solo:
//
//  · OGNI MOSSA E' UNA RIGA DEL LIBRO (subathon_righe), con l'id dell'evento
//    che l'ha fatta. La riga si scrive nella stessa transazione in cui si
//    muove l'orologio: un id gia' visto non entra, e allora l'orologio non si
//    muove. Lo stesso evento non allunga due volte, per costruzione.
//  · NIENTE SI CANCELLA. «Annulla» scrive una riga che storna, con id
//    «annulla:<riga>»: la stessa riga non si storna due volte.
//  · L'OROLOGIO SI MUOVE IN UNA FUNZIONE SOLA (SB_SUBATHON.applica, pura e
//    condivisa): tetto su quanto manca, mai sotto adesso, e in pausa si sposta
//    quello che resta invece della fine.
//  · I CONTI SONO SUL LIBRO (SB_SUBATHON.conti): totale, contributori, ultimi.
//
// E UNA COSA CHE NON FA: non fa RIPARTIRE un conto finito. Se l'orologio e'
// arrivato a zero la diretta e' finita, e un sub arrivato dopo non la resuscita
// di soppiatto. Riaprirla e' una scelta dello streamer, col tasto che ha gia'.
//
// Le parti che parlano (chat, overlay, alert) le fa il motore degli alert
// (alerts.js), che ha la voce e la scena: qui si decide e si scrive, e si
// torna quello che e' successo.
import crypto from 'node:crypto';
import '../web/public/subathon.js';
import { streamers, subathonLibro } from '../db.js';
import { regoleSubathon } from '../web/stile.js';
import { linguaChat } from './lingua-canale.js';
import { makeLog } from '../logger.js';

const log = makeLog('subathon');
export const S = globalThis.SB_SUBATHON;

const MIN = 60_000;
const ORA = 60 * MIN;
// una fine passata da piu' di cosi' mentre il bot era spento si segna e basta
export const FINE_VECCHIA_MS = 10 * MIN;
// l'ora felice: al piu' sei ore
export const FELICE_MAX_MS = 6 * ORA;
// quanto si puo' scrivere a mano in una volta, o far partire
export const RESTA_MAX_MS = 72 * ORA;

export const regoleDi = (settings) => regoleSubathon(settings);
const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const statoDi = (settings) => (obj(settings?.overlayStato) ? settings.overlayStato : {});
// L'OROLOGIO DELLA SUBATHON e' la sua sessione: { inizio, fine, pausa, felice, finita }.
export const sessioneDi = (settings) => (obj(statoDi(settings).subathon) ? statoDi(settings).subathon : {});
// L'orologio corre (o e' in pausa con del tempo dentro): solo allora il libro scrive.
export const inCorsa = (orologio, ora) => S.inPausa(orologio) || Number(orologio?.fine) > ora;
// Accesa: regole accese e l'orologio della subathon in corsa o in pausa.
export const accesa = (settings, ora = Date.now()) => !!(regoleDi(settings).attivo && inCorsa(sessioneDi(settings), ora));
// L'orologio nella forma che `applica` conosce.
const orologio = (sb) => ({ fine: Number(sb?.fine) || 0, pausa: S.inPausa(sb) ? { resta: Number(sb.pausa.resta) } : null });

// ── dagli eventi alle righe ────────────────────────────────────────────────

// Un evento del bot nella forma della subathon: { fonte, quanti, livello, id,
// premio, chi }, o null se non e' una fonte. `chi` lo passa chi chiama
// (alerts.js lo ricava come per l'alert). La raffica dei regali non conta: ogni
// regalo e' gia' un abbonamento che arriva da se' (docs/SUBATHON.md).
export function daEvento(ev, chi = '') {
  const type = ev?.type;
  const d = ev?.data || {};
  const id = ev?.id ? 'evento:' + ev.id : '';
  if (type === 'channel.subscribe' || type === 'channel.subscription.message') {
    const tier = Number(d.tier) || 1000;
    return { fonte: 'sub', quanti: 1, livello: tier >= 3000 ? 3 : tier >= 2000 ? 2 : 1, id, chi };
  }
  if (type === 'channel.cheer') return { fonte: 'bit', quanti: Number(d.bits) || 0, id, chi };
  if (type === 'kicks.gifted') return { fonte: 'kicks', quanti: Number(d.kicks) || 0, id: d.evento ? 'kicks:' + d.evento : id, chi };
  if (type === 'channel.follow') return { fonte: 'follow', quanti: 1, id, chi };
  if (type === 'channel.raid') return { fonte: 'raid', quanti: Number(d.viewers) || 0, id, chi };
  if (type === 'channel.channel_points_custom_reward_redemption.add') {
    return { fonte: 'premio', quanti: 1, premio: String(d.reward?.id || ''), id: d.id ? 'riscatto:' + (d.piattaforma || 'twitch') + ':' + d.id : '', chi };
  }
  return null;
}

// Quanti millisecondi chiede un evento con queste regole, ora felice compresa.
export function chiesti(regole, ev, felice, ora) {
  if (!regole || !ev) return { ms: 0, per: 1 };
  if (ev.fonte === 'premio' && (!regole.premio || ev.premio !== regole.premio)) return { ms: 0, per: 1 };
  const base = S.msPer(regole, ev);
  const per = S.per(felice, ora);
  return { ms: base * per, per };
}

// ── la scrittura ───────────────────────────────────────────────────────────

const idNuovo = (pre) => pre + ':' + crypto.randomUUID();

// LA SOLA PORTA DEL LIBRO. Dentro una transazione: legge le impostazioni,
// muove l'orologio con `applica` (se la riga chiede del tempo: `r.ms`, o una
// funzione (orologio, ora) → ms), scrive la riga e, solo se e' entrata, le
// impostazioni. `cambia(sb, ora)` cambia il resto della sessione (pausa,
// ripresa, ora felice) e puo' rifiutare tornando false.
// Torna { esito, riga, orologio, prima, dopo, totalePrima, totaleDopo, regole }.
//   esito: 'ok' · 'doppio' (id gia' visto) · 'spenta' · 'ferma' (orologio non in corsa) · 'no' (cambia ha rifiutato)
export function scrivi(channel, r, { ora = Date.now(), cambia = null } = {}) {
  try {
    return subathonLibro.insieme(() => {
      const s = streamers.get(channel);
      if (!s) return { esito: 'spenta' };
      const regole = regoleDi(s.settings);
      if (!regole.attivo) return { esito: 'spenta', regole };
      const stato = { ...statoDi(s.settings) };
      const sb = { ...sessioneDi(s.settings) };
      const prima0 = orologio(sb);
      if (!inCorsa(prima0, ora)) return { esito: 'ferma', regole };
      const ms = Math.round(Number(typeof r.ms === 'function' ? r.ms(prima0, ora) : r.ms) || 0);
      const mossa = ms ? S.applica(prima0, ms, { ora, tetto: regole.tettoOre * ORA }) : null;
      if (ms && !mossa) return { esito: 'ferma', regole };
      if (mossa && mossa.messi !== 0) Object.assign(sb, { fine: mossa.orologio.fine, pausa: mossa.orologio.pausa || null });
      if (cambia && cambia(sb, ora) === false) return { esito: 'no', regole };
      stato.subathon = sb;
      const sessione = Number(sb.inizio) || 0;
      const prima = S.conti(subathonLibro.sessione(channel, sessione)).totale;
      const riga = {
        id: r.id || idNuovo('senza-id'), sessione, ts: ora, fonte: r.fonte, chi: r.chi || '', quanti: r.quanti || 0,
        livello: r.livello || 0, per: r.per || 1, chiesti: ms, messi: mossa ? mossa.messi : 0, tagliati: mossa ? mossa.tagliati : 0,
        mano: r.mano || '', perche: r.perche || '', storno: r.storno || '',
      };
      if (!subathonLibro.scrivi(channel, riga)) return { esito: 'doppio', regole };
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      return {
        esito: 'ok', riga, regole, orologio: orologio(sb), sessione: sb,
        prima: S.resta(prima0, ora), dopo: S.resta(orologio(sb), ora),
        totalePrima: prima, totaleDopo: prima + riga.messi,
      };
    });
  } catch (e) { log.debug('scrivi:', e?.message || e); return { esito: 'errore' }; }
}

// Un evento delle fonti (sub, bit, euro, kicks, follow, raid, premio).
export function suEvento(channel, ev, { ora = Date.now() } = {}) {
  const s = streamers.get(channel);
  if (!s || !ev || !accesa(s.settings)) return null;
  const regole = regoleDi(s.settings);
  const { ms, per } = chiesti(regole, ev, sessioneDi(s.settings).felice, ora);
  if (!ms) return null;
  return scrivi(channel, { ...ev, id: ev.id || idNuovo('senza-id'), ms, per }, { ora });
}

// ── le azioni a mano: comandi e tasti del pannello ─────────────────────────

const numero = (testo) => { const n = Number(String(testo || '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };

// Il comando in parole → un'azione. null se non e' un comando della subathon.
//   { azione: 'resta' }                         «!subathon» da solo
//   { azione: 'piu'|'meno', ms, perche }
//   { azione: 'unita', fonte, quanti, livello }
//   { azione: 'imposta', ms } · 'pausa' · 'riprendi' · 'annulla' · { azione: 'felice', ms, per } · 'felice-stop'
//   { azione: 'parti', ms }                     apre una subathon nuova
//   { azione: 'uso' }                           un argomento che non si capisce
export function leggiComando(testo) {
  const t = String(testo || '').trim();
  if (!t.startsWith('!')) return null;
  const parole = t.slice(1).split(/\s+/);
  if ((parole[0] || '').toLowerCase() !== 'subathon') return null;
  const a = parole.slice(1);
  if (!a.length) return { azione: 'resta' };
  const primo = a[0].toLowerCase();
  const segno = /^([+-])(.+)$/.exec(primo);
  if (segno) {
    const ms = S.durata(segno[2]);
    if (!ms) return { azione: 'uso' };
    return { azione: segno[1] === '+' ? 'piu' : 'meno', ms, perche: a.slice(1).join(' ').slice(0, 120) };
  }
  if (['sub', 'bit', 'euro', 'kicks', 'follow', 'raid'].includes(primo)) {
    const n = numero(a[1]);
    if (!n) return { azione: 'uso' };
    const livello = primo === 'sub' ? Math.max(1, Math.min(3, Math.round(Number(a[2]) || 1))) : 0;
    return { azione: 'unita', fonte: primo, quanti: primo === 'euro' ? Math.round(n * 100) / 100 : Math.round(n), livello };
  }
  if (primo === 'resta') { const ms = S.durata(a[1]); return ms ? { azione: 'imposta', ms } : { azione: 'uso' }; }
  if (primo === 'parti') { const ms = S.durata(a[1]); return ms ? { azione: 'parti', ms } : { azione: 'uso' }; }
  if (primo === 'pausa') return { azione: 'pausa' };
  if (primo === 'riprendi') return { azione: 'riprendi' };
  if (primo === 'annulla') return { azione: 'annulla' };
  if (primo === 'felice') {
    if (['stop', 'basta', 'off', 'fine'].includes(String(a[1] || '').toLowerCase())) return { azione: 'felice-stop' };
    const ms = S.durata(a[1]);
    const x = /^[x×*]?(\d)$/i.exec(String(a[2] || 'x2'));
    const per = x ? Number(x[1]) : 0;
    if (!ms || per < 2 || per > 5) return { azione: 'uso' };
    return { azione: 'felice', ms: Math.min(ms, FELICE_MAX_MS), per };
  }
  return { azione: 'uso' };
}

// Chi puo' usare i comandi che muovono l'orologio. «!subathon» da solo e' di tutti.
export function puoComandare(msg, regole) {
  if (!msg) return false;
  if (regole?.comandi === 'streamer') return msg.isBroadcaster === true;
  return msg.isBroadcaster === true || msg.isMod === true;
}

// L'ultima riga a mano della sessione che ha mosso l'orologio, non e' uno
// storno e non e' gia' stata stornata.
export function ultimaAMano(channel, sessione) {
  const righe = subathonLibro.sessione(channel, sessione);
  const stornate = new Set(righe.filter((r) => r.storno).map((r) => r.storno));
  for (let i = righe.length - 1; i >= 0; i--) {
    const r = righe[i];
    if (r.mano && !r.storno && r.messi !== 0 && !stornate.has(r.id)) return r;
  }
  return null;
}

// Storna una riga della sessione in corso: copia chi e fonte, vale -messi.
// Una riga si storna una volta sola: lo dice il database (un indice unico su
// `storno`), non un controllo che si puo' dimenticare. L'id della riga di
// storno e' quello del comando o del tasto, se c'e': ripetere lo stesso
// «annulla» non storna la riga dopo.
export function storna(channel, idRiga, { mano = '', id = '', ora = Date.now() } = {}) {
  const r = subathonLibro.riga(channel, idRiga);
  const s = streamers.get(channel);
  if (!r || !s || r.storno || !r.messi) return { esito: 'nessuna' };
  if (r.sessione !== (Number(sessioneDi(s.settings).inizio) || 0)) return { esito: 'nessuna' };
  return scrivi(channel, { id: id || 'annulla:' + r.id, fonte: 'storno', chi: r.chi, quanti: r.quanti, livello: r.livello, ms: -r.messi, mano, perche: r.fonte, storno: r.id }, { ora });
}

// UN'AZIONE A MANO, dal comando o dal pannello. `id` e' quello del messaggio o
// del tasto: ripetuta con lo stesso id, non fa niente la seconda volta.
// Torna l'esito di `scrivi` piu' `azione`.
export function azione(channel, a, { mano = '', id = '', ora = Date.now() } = {}) {
  const s = streamers.get(channel);
  if (!s || !a) return { esito: 'no', azione: a?.azione };
  const regole = regoleDi(s.settings);
  const rid = (pre) => (id ? pre + ':' + id : idNuovo(pre));
  const base = { mano: String(mano || '').slice(0, 40) };
  let out;
  if (a.azione === 'piu' || a.azione === 'meno') {
    const ms = Math.min(RESTA_MAX_MS, Math.max(0, Number(a.ms) || 0));
    if (!ms) return { esito: 'no', azione: a.azione };
    out = scrivi(channel, { ...base, id: rid('mano'), fonte: a.azione, ms: a.azione === 'piu' ? ms : -ms, perche: a.perche || '' }, { ora });
  } else if (a.azione === 'unita') {
    const ev = { fonte: a.fonte, quanti: a.quanti, livello: a.livello || 0 };
    const { ms, per } = chiesti(regole, ev, sessioneDi(s.settings).felice, ora);
    if (!ms) return { esito: 'fonte', azione: a.azione, fonte: a.fonte };
    out = scrivi(channel, { ...base, ...ev, id: rid('mano'), ms, per, perche: a.perche || '' }, { ora });
  } else if (a.azione === 'imposta') {
    const voluto = Math.min(RESTA_MAX_MS, Math.max(1000, Number(a.ms) || 0));
    out = scrivi(channel, { ...base, id: rid('mano'), fonte: 'resta', ms: (o, t) => voluto - S.resta(o, t), perche: a.perche || '' }, { ora });
  } else if (a.azione === 'pausa') {
    out = scrivi(channel, { ...base, id: rid('mano'), fonte: 'pausa' }, {
      ora, cambia: (sb, t) => { if (S.inPausa(sb)) return false; Object.assign(sb, { fine: 0, pausa: { resta: Math.round(S.resta(orologio(sb), t)) } }); return true; },
    });
  } else if (a.azione === 'riprendi') {
    out = scrivi(channel, { ...base, id: rid('mano'), fonte: 'riprendi' }, {
      ora, cambia: (sb, t) => { if (!S.inPausa(sb)) return false; Object.assign(sb, { fine: t + Math.round(Number(sb.pausa.resta) || 0), pausa: null }); return true; },
    });
  } else if (a.azione === 'felice') {
    const ms = Math.min(FELICE_MAX_MS, Math.max(MIN, Number(a.ms) || 0));
    const per = Math.max(2, Math.min(5, Math.round(Number(a.per) || 2)));
    out = scrivi(channel, { ...base, id: rid('mano'), fonte: 'felice', quanti: per, perche: S.orologio(ms) }, {
      ora, cambia: (sb, t) => { sb.felice = { fino: t + ms, per }; return true; },
    });
    if (out?.esito === 'ok') out.felice = { fino: ora + ms, per, ms };
  } else if (a.azione === 'felice-stop') {
    out = scrivi(channel, { ...base, id: rid('mano'), fonte: 'felice', quanti: 0, perche: 'stop' }, {
      ora, cambia: (sb, t) => { if (S.per(sb.felice, t) <= 1) return false; sb.felice = null; return true; },
    });
  } else if (a.azione === 'annulla') {
    if (id && subathonLibro.riga(channel, 'annulla:' + id)) return { esito: 'doppio', azione: a.azione };
    const sessione = Number(sessioneDi(s.settings).inizio) || 0;
    const r = a.riga ? subathonLibro.riga(channel, a.riga) : ultimaAMano(channel, sessione);
    if (!r) return { esito: 'nessuna', azione: a.azione };
    out = storna(channel, r.id, { ...base, id: id ? 'annulla:' + id : '', ora });
    if (out?.esito === 'ok') out.stornata = r;
  } else if (a.azione === 'parti') {
    out = avvia(channel, a.ms, { id, ora });
  } else return { esito: 'no', azione: a.azione };
  return { ...(out || { esito: 'no' }), azione: a.azione };
}

// ── l'orologio che parte, e la fine ────────────────────────────────────────

// FAR PARTIRE LA SUBATHON: una sessione nuova con l'orologio a `ms` (da un
// minuto a 72 ore). Totale, ultimi e traguardi ricominciano da qui. Il conto
// alla rovescia non si tocca. `id` (del comando o del tasto) fa si' che lo
// stesso «parti» ripetuto non apra una seconda sessione. Non scrive righe: il
// libro e' delle mosse dell'orologio che corre.
export function avvia(channel, ms, { id = '', ora = Date.now() } = {}) {
  try {
    return subathonLibro.insieme(() => {
      const s = streamers.get(channel);
      if (!s) return { esito: 'spenta' };
      const regole = regoleDi(s.settings);
      if (!regole.attivo) return { esito: 'spenta', regole };
      if (id && sessioneDi(s.settings).da === id) return { esito: 'doppio', regole };
      const durata = Math.max(MIN, Math.min(RESTA_MAX_MS, Math.round(Number(ms) || 0)));
      const sb = { inizio: ora, fine: ora + durata, pausa: null, felice: null, finita: 0, ...(id ? { da: id } : {}) };
      streamers.setSettings(channel, { ...s.settings, overlayStato: { ...statoDi(s.settings), subathon: sb } });
      return { esito: 'ok', regole, orologio: orologio(sb), sessione: sb, riga: { messi: 0, fonte: 'parti' } };
    });
  } catch (e) { log.debug('avvia:', e?.message || e); return { esito: 'errore' }; }
}

// FERMARE LA SUBATHON (dal pannello): l'orologio a zero, senza pausa. La
// sessione resta, e il libro si legge ancora. Non e' la fine: non si festeggia.
export function ferma(channel) {
  const s = streamers.get(channel);
  if (!s) return { esito: 'no' };
  const sb = { ...sessioneDi(s.settings), fine: 0, pausa: null };
  streamers.setSettings(channel, { ...s.settings, overlayStato: { ...statoDi(s.settings), subathon: sb } });
  return { esito: 'ok', orologio: orologio(sb), sessione: sb };
}

// L'orologio e' arrivato a zero? Una volta sola per istante di fine: torna
// { festeggia, vecchia, fine } la prima volta, null le altre (e se non e'
// finito: in pausa, fermo, o ancora in corsa).
export function fineArrivata(channel, { ora = Date.now() } = {}) {
  try {
    return subathonLibro.insieme(() => {
      const s = streamers.get(channel);
      if (!s || !regoleDi(s.settings).attivo) return null;
      const sb = sessioneDi(s.settings);
      const fine = Number(sb.fine) || 0;
      if (S.inPausa(sb) || !fine || fine > ora) return null;
      if (Number(sb.finita) === fine) return null;
      const stato = { ...statoDi(s.settings), subathon: { ...sb, finita: fine } };
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      return { festeggia: ora - fine <= FINE_VECCHIA_MS, vecchia: ora - fine > FINE_VECCHIA_MS, fine };
    });
  } catch (e) { log.debug('fine:', e?.message || e); return null; }
}

// ── quello che si vede ─────────────────────────────────────────────────────

// LA VISTA della subathon, per l'overlay e per il pannello: l'orologio, la
// sessione e i conti sul libro. Solo lettura.
export function vista(channel, { ora = Date.now(), quanti = 10 } = {}) {
  const s = streamers.get(channel);
  const settings = s?.settings || {};
  const regole = regoleDi(settings);
  const sb = sessioneDi(settings);
  const o = orologio(sb);
  const sessione = Number(sb.inizio) || 0;
  const c = S.conti(subathonLibro.sessione(channel, sessione), quanti);
  return {
    accesa: accesa(settings, ora), fine: o.fine, pausa: o.pausa,
    inizio: sessione, felice: S.per(sb.felice, ora) > 1 ? sb.felice : null, finita: Number(sb.finita) || 0,
    totale: c.totale, ultimi: c.ultimi, migliori: c.migliori, traguardi: regole.traguardi,
  };
}

// Le ultime righe del libro della sessione in corso, per il pannello.
export const libro = (channel, n = 40) => subathonLibro.ultime(channel, Number(sessioneDi(streamers.get(channel)?.settings).inizio) || 0, n);

// ── le parole ──────────────────────────────────────────────────────────────

export const lingua = (channel) => S.lingua(linguaChat(channel));
// Un testo della subathon nella lingua della chat, o quello dello streamer.
export const testo = (channel, regole, chiave, dati) => S.testo(regole?.testi, chiave, lingua(channel), dati);
export const parole = (channel, ms) => S.inParole(Math.abs(Number(ms) || 0), lingua(channel));

// La risposta in chat a un'azione a mano. '' se non c'e' niente da dire.
export function risposta(channel, esito, { ora = Date.now() } = {}) {
  if (!esito) return '';
  const regole = esito.regole || regoleDi(streamers.get(channel)?.settings);
  const t = (k, d) => testo(channel, regole, k, d);
  const resta = parole(channel, S.resta(esito.orologio || orologio(sessioneDi(streamers.get(channel)?.settings)), ora));
  if (esito.esito === 'spenta') return t('spenta');
  if (esito.esito === 'ferma') return Number(sessioneDi(streamers.get(channel)?.settings).fine) > 0 ? t('finita') : t('non-partita');
  if (esito.esito === 'nessuna') return t('niente');
  if (esito.esito === 'fonte' || esito.esito === 'no') return t('uso');
  if (esito.esito !== 'ok') return '';
  const q = parole(channel, esito.riga?.messi);
  switch (esito.azione) {
    case 'piu': case 'unita': return t('piu', { quanto: q, resta });
    case 'meno': return t('meno', { quanto: q, resta });
    case 'imposta': return t('resta-messo', { resta });
    case 'pausa': return t('pausa', { resta });
    case 'riprendi': return t('ripresa', { resta });
    case 'annulla': return t('annullato', { quanto: (Number(esito.riga?.messi) < 0 ? '−' : '+') + q, resta });
    case 'felice': return t('felice', { quanto: parole(channel, esito.felice?.ms), per: esito.felice?.per });
    case 'felice-stop': return t('felice-stop');
    case 'parti': return t('partita', { resta });
    default: return '';
  }
}

// «!subathon» per tutti: quanto manca. Tace a subathon spenta: un comando che
// risponde «non c'e' nessun subathon» a ogni curioso e' un modo per far dire al
// bot cose che non servono a nessuno.
export function quantoManca(channel, { ora = Date.now() } = {}) {
  const s = streamers.get(channel);
  if (!s) return '';
  const regole = regoleDi(s.settings);
  const sb = sessioneDi(s.settings);
  if (!regole.attivo) return '';
  if (S.inPausa(sb)) return testo(channel, regole, 'resta-pausa', { resta: parole(channel, S.resta(sb, ora)) });
  const fine = Number(sb.fine) || 0;
  if (!fine) return '';
  return fine > ora ? testo(channel, regole, 'resta', { resta: parole(channel, fine - ora) }) : testo(channel, regole, 'finita');
}

// Il comando in chat: torna { detto, esito } o null se non era suo. Chi non
// puo' muovere l'orologio riceve quello che riceve chiunque: quanto manca.
// `msg.id` e' l'id del messaggio: lo stesso messaggio non allunga due volte.
export function comando(msg, { ora = Date.now() } = {}) {
  if (!msg) return null;   // lo streamer scrive col NOSTRO account: scartarlo scarta lui (docs/COMANDI.md)
  const a = leggiComando(msg.text);
  if (!a) return null;
  const ch = String(msg.channel || '').toLowerCase();
  const s = streamers.get(ch);
  if (!s) return null;
  const regole = regoleDi(s.settings);
  if (a.azione === 'resta' || !puoComandare(msg, regole)) {
    const d = quantoManca(ch, { ora });
    return d ? { detto: d, esito: null } : null;
  }
  if (!regole.attivo) return { detto: testo(ch, regole, 'spenta'), esito: null };
  if (a.azione === 'uso') return { detto: testo(ch, regole, 'uso'), esito: null };
  const esito = azione(ch, a, { mano: msg.display || msg.user || '', id: msg.id ? 'cmd:' + msg.id : '', ora });
  return { detto: esito.esito === 'doppio' ? '' : risposta(ch, esito, { ora }), esito };
}
