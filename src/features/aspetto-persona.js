// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// L'ASPETTO SU MISURA (docs/ASPETTO.md).
//
// La veste che una persona da' al pannello: i colori dei due temi, i
// caratteri, la grandezza, gli angoli, il tratto, le ombre, il suo CSS. E'
// della PERSONA e non del canale, come il menu su misura: sta in
// `settings.aspetto` del conto di chi e' entrato.
//
// Il server qui non disegna niente: tiene le scelte ripulite e le rimanda. La
// ripulitura e' quella del pannello, lo STESSO file (public/aspetto.js): non ci
// sono due copie da tenere uguali. I colori li calcola il browser.
import '../web/public/aspetto.js';
import { streamers } from '../db.js';

const A = globalThis.SB_ASPETTO;

export const pulisci = (grezze) => A.pulisci(grezze);
export const diSerie = (scelte) => A.diSerie(scelte);

// Le scelte della persona, o null se non ne ha (o non ha un conto suo).
export function scelteDi(identita) {
  const a = streamers.get(String(identita || '').toLowerCase())?.settings?.aspetto;
  return a && typeof a === 'object' && !diSerie(a) ? pulisci(a) : null;
}

// Salva. Torna le scelte salvate, o null se la persona non ha un conto suo
// (un moderatore senza canale): il pannello allora le tiene nel browser.
export function salvaScelte(identita, grezze) {
  const chi = String(identita || '').toLowerCase();
  const s = streamers.get(chi);
  if (!s) return null;
  const pulite = pulisci(grezze);
  const settings = { ...(s.settings || {}) };
  if (diSerie(pulite)) delete settings.aspetto; else settings.aspetto = pulite;
  streamers.setSettings(chi, settings);
  return pulite;
}
