// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE PREFERENZE DEL CANALE (docs/PREFERENZE.md).
//
// Come il canale parla e conta il tempo: lingua della chat, fuso, formato della
// data e dell'ora, primo giorno della settimana, durate, da dove si leggono le
// prossime dirette, come risponde il bot. Stanno in `settings.preferenze`, e
// qui ci sono le due sole porte: leggerle (con i valori di base) e salvarle
// (ripulite).
//
// Il disegno delle date sta in src/web/public/formati.js, lo stesso file che
// usa il pannello: una data scritta in chat e una scritta nel pannello escono
// dalla stessa funzione. Qui lo si importa e lo si riespone.
//
// «Di base» non e' un valore scritto: e' quello che si legge quando lo streamer
// non ha scelto niente. Salvare «di base» vuol dire togliere la chiave, non
// scriverci il valore di oggi: se domani la base cambia (per esempio la lingua
// di Twitch del canale), chi non ha scelto segue la base nuova.
import '../web/public/formati.js';
import { streamers } from '../db.js';
import { linguaChat } from './lingua-canale.js';
import { settimanaDi } from './settimana.js';

export const F = globalThis.SB_FORMATI;

export const FONTI_PROSSIME = ['settimana', 'twitch'];
export const RISPOSTE = ['nome', 'risposta'];

const CHIAVI = {
  lingua: (x) => (F.LINGUE.includes(x) ? x : ''),
  fuso: (x) => (F.fusoValido(x) ? x : ''),
  data: (x) => (F.DATE.includes(x) ? x : ''),
  ora: (x) => (F.ORE.includes(x) ? x : ''),
  settimana: (x) => (F.SETTIMANE.includes(x) ? x : ''),
  durate: (x) => (F.DURATE.includes(x) ? x : ''),
  fonteProssime: (x) => (FONTI_PROSSIME.includes(x) ? x : ''),
  risposta: (x) => (RISPOSTE.includes(x) ? x : ''),
};

// Quello che lo streamer ha scelto, ripulito: solo chiavi note e valori validi.
// Una chiave assente o vuota vuol dire «di base».
export function scelte(grezze) {
  const out = {};
  for (const [k, pulisci] of Object.entries(CHIAVI)) {
    const v = pulisci(String(grezze?.[k] ?? '').trim());
    if (v) out[k] = v;
  }
  return out;
}

// Le preferenze da usare adesso, per un canale: ogni chiave ha un valore.
// La lingua viene sempre da linguaChat, che e' il posto solo in cui si decide;
// il fuso, se lo streamer non l'ha scelto, e' quello della sua settimana.
export function preferenzeDi(canale) {
  const ch = String(canale || '').toLowerCase();
  const settings = streamers.get(ch)?.settings || {};
  const s = scelte(settings.preferenze);
  const fuso = s.fuso || settimanaDi(settings).fuso;
  const v = F.valori({ ...s, lingua: linguaChat(ch), fuso });
  return {
    ...v,
    fonteProssime: s.fonteProssime || '',
    risposta: s.risposta || 'nome',
  };
}

// Salva le scelte. Torna quelle salvate (ripulite).
export function salvaPreferenze(canale, grezze) {
  const ch = String(canale || '').toLowerCase();
  const s = streamers.get(ch);
  if (!s) return null;
  const pulite = scelte(grezze);
  streamers.setSettings(ch, { ...(s.settings || {}), preferenze: pulite });
  return pulite;
}

export const data = (ms, p) => F.data(ms, p);
export const ora = (ms, p) => F.ora(ms, p);
export const giorno = (ms, p) => F.giorno(ms, p);
export const quando = (ms, p, opz) => F.quando(ms, p, opz);
export const durata = (ms, p) => F.durata(ms, p);
export const numero = (n, p, opz) => F.numero(n, p, opz);
export const euro = (n, p) => F.euro(n, p);
