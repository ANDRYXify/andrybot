// console.js — le AZIONI del canale, e la porta da cui si premono.
//
// CONSOLify (la webapp) e uno Stream Deck fisico guardano la stessa cosa: questo
// registro. Non e' una scelta di eleganza — un elenco di bottoni scritto a mano
// sarebbe un SECONDO elenco accanto a quello dei comandi e dei contatori, e i due
// si scollerebbero al primo contatore nuovo. Qui il registro si RICAVA da cio' che
// il canale ha davvero: aggiungi un contatore e il tasto compare da solo.
//
// COSA HO IMPARATO GUARDANDO COS'E' DAVVERO UNO STREAM DECK. Non e' una tastiera
// di scorciatoie: e' un tasto che DICE cosa fa e si aggiorna. Percio' ogni azione
// porta con se' `mostra` — la riga corta che il tasto stampa — e chi la esegue
// risponde con quella. I plugin HTTP generici (API Ninja e simili) la stampano sul
// tasto: da li' viene il valore, non dal fatto che il tasto esista.
//
// La porta funziona con qualunque superficie che sappia fare una chiamata web:
// Stream Deck con un plugin HTTP, Bitfocus Companion, Touch Portal, Loupedeck, il
// browser di un telefono. Nessuna dipendenza da nessuno.
import { contatori as storeContatori, streamers } from '../db.js';
import * as contatori from './contatori.js';
import { makeLog } from '../logger.js';
import crypto from 'node:crypto';

const log = makeLog('console');
const norm = (c) => String(c || '').toLowerCase().trim();

// ── La chiave del canale ────────────────────────────────────────────────────
// Stessa forma collaudata dell'overlay, con una differenza che conta: da questa
// porta non si GUARDA, si AGISCE. Quindi si puo' revocare, e c'e' un tetto di
// frequenza — una chiave finita in una clip non deve poter diventare un giocattolo.
// Se il canale non esiste, NON c'e' una chiave — e si dice. La prima versione ne
// generava una nuova a ogni chiamata: `setSettings` su una riga che non c'e' non
// scrive niente, e la funzione tornava una chiave fresca fingendo di averla
// salvata. In produzione non si sarebbe visto (lo streamer c'e' sempre) e nessuna
// chiave emessa avrebbe piu' combaciato con se stessa. Una funzione che non puo'
// mantenere la promessa deve dirlo, non restituire qualcosa che ha l'aria giusta.
function scrivi(login, k) {
  const s = streamers.get(login);
  if (!s) return null;
  streamers.setSettings(login, { ...(s.settings || {}), consoleKey: k });
  return streamers.get(login)?.settings?.consoleKey === k ? k : null;   // c'e' rimasta?
}

export function chiave(channel) {
  const login = norm(channel);
  const s = streamers.get(login);
  if (!s) return null;
  if (s.settings?.consoleKey) return s.settings.consoleKey;
  return scrivi(login, crypto.randomBytes(24).toString('hex'));
}

export function revoca(channel) {
  const login = norm(channel);
  const k = scrivi(login, crypto.randomBytes(24).toString('hex'));
  if (k) log.info(`#${login}: chiave della console rigenerata (quella vecchia non vale piu')`);
  return k;
}

// Confronto a tempo costante: due chiavi diverse devono metterci lo stesso tempo a
// essere rifiutate, se no la differenza racconta quanti caratteri erano giusti.
export function chiaveOk(channel, data) {
  const k = chiave(channel);
  if (!k) return false;                       // nessun canale, nessuna chiave, nessun sì
  const vera = Buffer.from(k);
  const arrivata = Buffer.from(String(data || ''));
  if (vera.length !== arrivata.length) return false;
  return crypto.timingSafeEqual(vera, arrivata);
}

// ── Il tetto di frequenza ───────────────────────────────────────────────────
const MAX_AL_MINUTO = 40;
const _colpi = new Map();
export function troppiColpi(channel) {
  const login = norm(channel);
  const adesso = Date.now();
  const suoi = (_colpi.get(login) || []).filter((t) => adesso - t < 60_000);
  suoi.push(adesso);
  _colpi.set(login, suoi);
  return suoi.length > MAX_AL_MINUTO;
}

// ── Il registro, RICAVATO ───────────────────────────────────────────────────
// `id` e' stabile e sta in un indirizzo: gruppo:cosa[:parametro].
export function azioni(channel) {
  const login = norm(channel);
  const fuori = [];
  let cont = [];
  try { cont = storeContatori.list(login) || []; } catch (e) { log.debug('contatori:', e?.message || e); }
  for (const c of cont) {
    const nome = c.etichetta || c.comando;
    const passo = Number(c.step) || 1;
    fuori.push({
      id: `contatore:piu:${c.comando}`, gruppo: 'contatori',
      titolo: `${nome} +${passo}`, icona: c.emoji || '➕',
      mostra: `${nome}: ${c.valore}`, valore: Number(c.valore) || 0,
    });
    fuori.push({
      id: `contatore:meno:${c.comando}`, gruppo: 'contatori',
      titolo: `${nome} −${passo}`, icona: c.emoji || '➖',
      mostra: `${nome}: ${c.valore}`, valore: Number(c.valore) || 0,
    });
    fuori.push({
      id: `contatore:azzera:${c.comando}`, gruppo: 'contatori',
      titolo: `${nome} a zero`, icona: '⟲',
      mostra: `${nome}: ${c.valore}`, valore: Number(c.valore) || 0,
      conferma: true,
    });
  }
  return fuori;
}

// ── Premere un tasto ────────────────────────────────────────────────────────
// `dipendenze` porta dentro cio' che serve per agire davvero (dire in chat,
// aggiornare l'overlay) senza che questo file conosca il bot: cosi' si puo'
// provare per davvero, con un finto `say` e un finto `emit`.
export function esegui(channel, id, { say, emit } = {}) {
  const login = norm(channel);
  const pezzi = String(id || '').split(':');
  if (pezzi[0] === 'contatore') {
    const [, cosa, comando] = pezzi;
    const c = storeContatori.get(login, comando);
    if (!c) return { ok: false, mostra: 'non c\'è' };
    const passo = Number(c.step) || 1;
    const delta = cosa === 'piu' ? passo : cosa === 'meno' ? -passo : cosa === 'azzera' ? null : undefined;
    if (delta === undefined) return { ok: false, mostra: 'non so farlo' };
    const nuovo = contatori.cambia(login, comando, delta, say, emit);
    if (!nuovo) return { ok: false, mostra: 'non riuscito' };
    return { ok: true, mostra: `${c.etichetta || c.comando}: ${nuovo.valore}`, valore: nuovo.valore };
  }
  return { ok: false, mostra: 'azione sconosciuta' };
}
