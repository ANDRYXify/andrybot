// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE PROSSIME DIRETTE, DA UNA FONTE SOLA (docs/PREFERENZE.md).
//
// Due posti possono dire quando si va in diretta: la settimana di SocialBot e
// il Programma di Twitch. Chi chiede «quando sei in diretta?» deve avere una
// risposta sola, quindi per ogni canale la fonte e' UNA:
//
//  · quella scelta dallo streamer (`preferenze.fonteProssime`);
//  · di base, la settimana se ha almeno una sera in onda; altrimenti il
//    Programma, se il canale e' su Twitch; altrimenti la settimana (vuota).
//
// La forma e' sempre la stessa, qualunque sia la fonte:
// { inizio, fine, titolo, categoria } con i tempi in millisecondi.
//
// Se la fonte e' il Programma, la settimana non ci scrive sopra: sarebbe il
// cane che si morde la coda (la settimana scrive il Programma, il Programma
// dice la settimana). E non ci toglie niente: il Programma e' dello streamer.
// I segmenti scritti prima restano ricordati come nostri, per il giorno in
// cui torna alla settimana.
import { streamers } from '../db.js';
import { preferenzeDi } from './preferenze.js';
import { settimanaDi, inOnda, duraOk, chiaveAtt, FUSO_BASE } from './settimana.js';
import { fusoValido, prossimaVolta } from './discord-eventi.js';
import { eSu } from '../identita.js';

export const QUANTE_MAX = 10;
const CACHE_MS = 15 * 60 * 1000;
const _programmi = new Map();   // login -> { ts, segmenti }

// Un canale e' «su Twitch» se e' entrato con Twitch: la piattaforma si
// ricava dal nome in un posto solo (identita.js). Su Kick e YouTube un
// Programma da leggere non c'e'.
export const suTwitch = (login) => !!login && eSu('twitch', login);

export function fonteDi(login) {
  const ch = String(login || '').toLowerCase();
  const scelta = preferenzeDi(ch).fonteProssime;
  if (scelta === 'twitch' && suTwitch(ch)) return 'twitch';
  if (scelta === 'settimana') return 'settimana';
  const sett = settimanaDi(streamers.get(ch)?.settings || {});
  if ((sett.giorni || []).some(inOnda)) return 'settimana';
  return suTwitch(ch) ? 'twitch' : 'settimana';
}

// Il Programma e' dello streamer solo se l'ha DETTO lui, scegliendolo come
// fonte. Non la fonte di base: una settimana svuotata farebbe del Programma la
// fonte, e allora i segmenti scritti da noi non si toglierebbero piu', proprio
// quando «non scriverla piu'» vuol dire «togli quella che c'e'».
export const programmaDelloStreamer = (login) => suTwitch(login) && preferenzeDi(login).fonteProssime === 'twitch';

// Le prossime `quante` dalla settimana: la prossima volta di ogni sera in onda,
// poi da li' in avanti, un minuto dopo l'ultima trovata. Ogni passo richiede la
// prossima volta nel fuso della settimana, quindi l'ora legale non la sposta.
export function daSettimana(sett, quante, adesso = Date.now()) {
  const fuso = fusoValido(sett?.fuso) ? sett.fuso : FUSO_BASE;
  const cat = sett?.twitch?.categorie || {};
  const sere = (sett?.giorni || []).map((g, i) => ({ g, i })).filter(({ g }) => inOnda(g));
  const out = [];
  let cursore = adesso;
  while (sere.length && out.length < quante) {
    let prima = null;
    for (const { g, i } of sere) {
      const t = prossimaVolta(fuso, [i], g.ora, new Date(cursore));
      if (t && (!prima || t.getTime() < prima.t)) prima = { t: t.getTime(), g };
    }
    if (!prima) break;
    out.push({
      inizio: prima.t,
      fine: prima.t + duraOk(sett.dura) * 60000,
      titolo: String(prima.g.att || ''),
      categoria: String(cat[chiaveAtt(prima.g.att)]?.name || ''),
    });
    cursore = prima.t + 60000;
  }
  return out;
}

// Dal Programma di Twitch: i segmenti annullati non ci sono, quelli gia'
// finiti nemmeno. Tenuti da parte un quarto d'ora per canale.
export function daProgramma(segmenti, quante, adesso = Date.now()) {
  return (segmenti || [])
    .filter((s) => s && !s.canceled_until)
    .map((s) => {
      const inizio = Date.parse(s.start_time);
      const fine = Date.parse(s.end_time);
      return { inizio, fine: Number.isFinite(fine) ? fine : inizio, titolo: String(s.title || ''), categoria: String(s.category?.name || '') };
    })
    .filter((d) => Number.isFinite(d.inizio) && d.fine > adesso)
    .sort((a, b) => a.inizio - b.inizio)
    .slice(0, quante);
}

async function segmentiDi(helix, login, adesso) {
  const c = _programmi.get(login);
  if (c && adesso - c.ts < CACHE_MS) return { ok: true, segmenti: c.segmenti };
  const r = await helix?.programma?.(login, { da: new Date(adesso), giorni: 14 });
  if (!r?.ok) return { ok: false, errore: r?.errore || 'Programma non leggibile', permesso: !!r?.permesso };
  _programmi.set(login, { ts: adesso, segmenti: r.segmenti || [] });
  return { ok: true, segmenti: r.segmenti || [] };
}

// Il Programma tenuto da parte va dimenticato quando lo streamer lo cambia
// dal pannello: chi lo guarda subito dopo deve vedere quello nuovo.
export const dimenticaProgramma = (login) => _programmi.delete(String(login || '').toLowerCase());

// { fonte, dirette, errore? }. Un Programma che non si legge non diventa una
// settimana: lo si dice, invece di rispondere con un'altra fonte.
export async function prossimeDirette(login, quante = 1, { helix = null, adesso = Date.now() } = {}) {
  const ch = String(login || '').toLowerCase();
  const n = Math.max(1, Math.min(QUANTE_MAX, Math.round(Number(quante)) || 1));
  const fonte = fonteDi(ch);
  if (fonte === 'twitch') {
    const r = await segmentiDi(helix, ch, adesso);
    if (!r.ok) return { fonte, dirette: [], errore: r.errore, permesso: r.permesso };
    return { fonte, dirette: daProgramma(r.segmenti, n, adesso) };
  }
  return { fonte, dirette: daSettimana(settimanaDi(streamers.get(ch)?.settings || {}), n, adesso) };
}
