// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PRESENZA COME PORTA (docs/COLPI.md, «La presenza come porta: «!presente»»).
//
// Un posto solo dice chi e' presente a questa diretta, e chi lo chiede (le
// monete, i Bit da spendere, i giochi) chiede qui. La diretta la sa il bot
// (l'inizio della diretta su Twitch): la consegna con `usa`, all'avvio. Un nome
// e' «piattaforma:id» o «piattaforma:@login»: il giro delle monete di chi
// guarda sa solo il login.
import { streamers, presenti } from '../db.js';
import { normalizza, portaChiede } from './colpi.js';

const norm = (s) => String(s || '').toLowerCase();
let occasioneDi = () => '';
export function usa({ occasione }) { occasioneDi = occasione; }

export const cfgDi = (channel) => normalizza(streamers.get(norm(channel))?.settings?.colpi);

// I nomi di una persona: quelli che si sanno.
export function nomi({ piattaforma = 'twitch', id = '', user = '' } = {}) {
  const p = norm(piattaforma) || 'twitch';
  return [id && `${p}:${id}`, user && `${p}:@${norm(user).replace(/^@/, '')}`].filter(Boolean);
}

// Chi scrive la frase: presente a questa diretta. Torna se e' la prima volta.
export function segna(channel, chi, ora = Date.now()) {
  const occ = occasioneDi(norm(channel));
  if (!occ) return false;
  return presenti.segna(channel, nomi(chi), occ, ora);
}

export function presente(channel, chi) {
  const occ = occasioneDi(norm(channel));
  return !!occ && presenti.e(channel, nomi(chi), occ);
}

// La porta lascia passare? `cosa`: «monete», «bit» o «giochi». Lo streamer non
// ci passa mai. Senza la diretta di adesso (nessuno l'ha consegnata con `usa`)
// la porta resta aperta: chiusa, non ci si potrebbe nemmeno presentare.
export function lascia(channel, chi, cosa) {
  const ch = norm(channel);
  if (!portaChiede(cfgDi(ch), cosa)) return true;
  if (chi?.user && norm(chi.user).replace(/^@/, '') === ch) return true;
  if (!occasioneDi(ch)) return true;
  return presente(ch, chi);
}

// Il ricordo: una volta per diretta a testa, e al piu' uno ogni 20 secondi nel
// canale. In memoria: dopo un riavvio, al piu' uno in piu'.
export const RIPOSO_CANALE_MS = 20_000;
const ricordati = new Map();      // canale|nome|diretta → ts
const ultimoCanale = new Map();   // canale → ts
export function ricordo(channel, chi, ora = Date.now()) {
  const ch = norm(channel);
  if (!cfgDi(ch).presenza.porta.ricorda) return false;
  const occ = occasioneDi(ch);
  const k = `${ch}|${nomi(chi)[0] || ''}|${occ}`;
  if (ricordati.has(k) || ora - (ultimoCanale.get(ch) || 0) < RIPOSO_CANALE_MS) return false;
  if (ricordati.size > 20_000) ricordati.clear();
  ricordati.set(k, ora);
  ultimoCanale.set(ch, ora);
  return true;
}
