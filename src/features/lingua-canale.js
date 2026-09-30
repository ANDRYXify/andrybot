// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA LINGUA IN CUI IL BOT PARLA IN UN CANALE.
//
// Un posto solo, perche' la decidono due piani (docs/PREFERENZE.md, dove lo
// streamer la sceglie, e docs/VOCE.md, dove si usa) e due posti vorrebbero dire
// due risposte. Vale, in quest'ordine:
//
//  1. la scelta dello streamer (`settings.preferenze.lingua`);
//  2. la lingua che il canale ha su Twitch, se il bot l'ha letta
//     (`settings.linguaTwitch`, scritta da chi legge le informazioni del canale);
//  3. l'italiano.
//
// «Di base» non e' un valore scritto: e' quello che si legge quando lo streamer
// non ha scelto niente. Cosi' un canale che non tocca nulla ha gia' una
// risposta giusta, e quando sceglie vale la sua scelta.
import { streamers } from '../db.js';

export const LINGUE_CHAT = ['it', 'en', 'es'];

const breve = (x) => String(x || '').trim().slice(0, 2).toLowerCase();

export function linguaChat(canale) {
  const s = streamers.get(String(canale || '').toLowerCase())?.settings || {};
  const scelta = breve(s.preferenze?.lingua);
  if (LINGUE_CHAT.includes(scelta)) return scelta;
  const twitch = breve(s.linguaTwitch);
  if (LINGUE_CHAT.includes(twitch)) return twitch;
  return 'it';
}

// Da dove viene la lingua di adesso: al pannello serve per dire «di base,
// perche' su Twitch il canale e' in inglese» invece di un valore senza motivo.
export function origineLinguaChat(canale) {
  const s = streamers.get(String(canale || '').toLowerCase())?.settings || {};
  if (LINGUE_CHAT.includes(breve(s.preferenze?.lingua))) return 'scelta';
  if (LINGUE_CHAT.includes(breve(s.linguaTwitch))) return 'twitch';
  return 'base';
}
