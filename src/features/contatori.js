// Contatori configurabili (morti, tentativi, parole…). Lo streamer/moderatori li
// gestiscono da comandi chat; tutti possono leggerne il valore. Tre modi di far
// salire un contatore:
//   1) comando chat: i VERBI sono del contatore, non del motore — quali parole
//      fanno cosa e chi puo' farlo lo decide lo streamer (vedi VERBI_CONT)
//   2) parola automatica: ogni volta che una parola appare in chat → +1 (silenzioso)
//   3) riscatto di un premio a punti canale collegato → +step (con annuncio)
import { contatori as store, VERBI_CONT } from '../db.js';
import { puoUsare, rifiutoDi } from './comandi-registro.js';
import { makeLog } from '../logger.js';

const log = makeLog('contatori');

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// emette l'aggiornamento del contatore sull'overlay OBS (stesso feed SSE di
// alert/effetti/chat). Best-effort.
function verso(emit, canale, comando) {
  try { if (typeof emit !== 'function') return; const c = store.get(canale, comando); if (c) emit(store.payloadOverlay(c)); }
  catch { /* niente */ }
}
// come verso(), ma solo se il widget e' impostato "mostra" (per auto-parola/riscatto)
function versoSeMostra(emit, riga) {
  try { if (typeof emit !== 'function' || !riga) return; const o = store.overlayDi(riga); if (o.mostra) emit(store.payloadOverlay(riga)); }
  catch { /* niente */ }
}

// Quando uno non puo', glielo si dice UNA volta ogni tanto: un rifiuto muto
// sembra un bot rotto, un rifiuto a ogni tentativo diventa un modo per farlo
// parlare a raffica.
const PAUSA_RIFIUTO_MS = 60_000;
const rifiutato = new Map();

function diciNo(say, canale, comando, verbo, utente, livello) {
  const chiave = `${canale}|${comando}|${verbo}|${String(utente || '').toLowerCase()}`;
  const ora = Date.now();
  if (ora < (rifiutato.get(chiave) || 0)) return;
  rifiutato.set(chiave, ora + PAUSA_RIFIUTO_MS);
  if (rifiutato.size > 5000) rifiutato.clear();
  try { say(rifiutoDi(comando, livello)); } catch { /* niente */ }
}

// TROVA IL VERBO. Una regola sola per tutti: la parola puo' essere scritta da
// sola («reset») o con il numero attaccato («+3», «set10»), e vale lo stesso se
// il numero arriva staccato dopo. Prima «+3» funzionava e «+ 3» no, mentre
// «set 10» funzionava e «set10» no: due grammatiche dentro lo stesso comando.
function trovaVerbo(verbi, parola) {
  const p = String(parola || '').toLowerCase();
  if (!p) return null;
  for (const id of VERBI_CONT) {
    for (const w of (verbi[id]?.parole || [])) {
      if (!w) continue;
      if (p === w) return { id, arg: '' };
      if (p.startsWith(w) && /^\d+$/.test(p.slice(w.length))) return { id, arg: p.slice(w.length) };
    }
  }
  return null;
}

// Il nome del contatore puo' avere il verbo ATTACCATO, ma solo se e' un simbolo
// («morti+», «morti-2»): una parola attaccata («mortireset») non la scrive
// nessuno, e cercarla vorrebbe dire interrogare il database a ogni «!» che passa.
const ATTACCATO = /^([a-z0-9_]+?)([+\-=]+\d*)$/;

// Comando chat di un contatore. Ritorna true se il messaggio era suo (cosi' chi
// chiama si ferma). `emit` aggiorna il widget sull'overlay.
export function tryComando(msg, say, emit) {
  try {
    const testo = String(msg?.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const canale = String(msg.channel || '').toLowerCase();
    const parti = testo.slice(1).split(/\s+/);
    let primo = parti[0].toLowerCase();
    let attaccato = '';
    let c = store.get(canale, primo);
    if (!c) {
      const m = ATTACCATO.exec(primo);
      if (!m) return false;
      c = store.get(canale, m[1]);
      if (!c) return false;
      primo = m[1];
      attaccato = m[2];
    }

    const verbi = store.verbiDi(c);
    const emoji = c.emoji ? c.emoji + ' ' : '';
    const nome = c.etichetta || c.comando;
    const annuncia = (v) => { try { say(`${emoji}${nome}: ${v}`); } catch { /* niente */ } };

    // che cosa ha chiesto
    let trovato = attaccato ? trovaVerbo(verbi, attaccato) : null;
    if (!trovato && !attaccato && parti[1]) {
      trovato = trovaVerbo(verbi, parti[1]);
      // «!morti 7»: un numero da solo vale «imposta», come prima
      if (!trovato && /^\d+$/.test(parti[1]) && verbi.imposta?.parole.length) trovato = { id: 'imposta', arg: parti[1] };
    }
    const verbo = trovato?.id || 'leggi';
    // l'argomento: attaccato al verbo o subito dopo, e' lo stesso
    let arg = trovato?.arg || '';
    if (!arg) {
      const dopo = attaccato ? parti[1] : parti[2];
      if (/^\d+$/.test(String(dopo || ''))) arg = dopo;
    }

    const chi = verbi[verbo]?.chi || 'mod';
    if (!puoUsare(chi, msg)) {
      if (verbo !== 'leggi') diciNo(say, canale, primo, verbo, msg.user, chi);
      return true;
    }

    if (verbo === 'leggi') { annuncia(c.valore); return true; }

    const passo = /^\d+$/.test(arg) ? Math.max(1, parseInt(arg, 10)) : (c.step || 1);
    let nuovo = null;
    if (verbo === 'piu') nuovo = store.incrementa(canale, primo, passo);
    else if (verbo === 'meno') nuovo = store.incrementa(canale, primo, -passo);
    else if (verbo === 'azzera') nuovo = store.setValore(canale, primo, 0);
    else if (verbo === 'imposta') nuovo = store.setValore(canale, primo, /^\d+$/.test(arg) ? parseInt(arg, 10) : 0);
    // MOSTRA NON AZZERA. Erano due verbi in uno: chi aveva quarantasette morti e
    // voleva solo farli comparire a schermo se li ritrovava a zero, in silenzio
    // e senza ritorno. Chi vuole tutte e due le cose scrive due comandi.
    else if (verbo === 'mostra') nuovo = store.patchOverlay(canale, primo, { mostra: true });
    else if (verbo === 'nascondi') nuovo = store.patchOverlay(canale, primo, { mostra: false });
    if (nuovo) { annuncia(nuovo.valore); verso(emit, canale, primo); }
    return true;
  } catch (e) { log.debug('tryComando:', e?.message || e); return false; }
}

// Auto-contatore parole: per ogni contatore con `auto_parola`, conta le occorrenze
// della parola nel messaggio e le somma. Silenzioso in chat; aggiorna il widget
// overlay solo se è impostato "mostra".
export function perParola(msg, emit) {
  try {
    if (msg?.isSelf) return;   // non contare i messaggi del bot/streamer (evita loop)
    const canale = String(msg.channel || '').toLowerCase();
    const testo = String(msg?.text || '').toLowerCase();
    if (!testo) return;
    const lista = store.autoParola(canale);
    if (!lista.length) return;
    for (const c of lista) {
      const re = new RegExp('(?:^|[^\\p{L}\\p{N}_])' + escapeRe(c.auto_parola) + '(?![\\p{L}\\p{N}_])', 'gu');
      const n = (testo.match(re) || []).length;
      if (n > 0) versoSeMostra(emit, store.incrementa(canale, c.comando, n));
    }
  } catch (e) { log.debug('perParola:', e?.message || e); }
}

// Riscatto punti canale collegato a un contatore → +step, con annuncio + overlay.
// UN CONTATORE E' CAMBIATO. Da qualunque parte arrivi la spinta — la chat, un
// premio riscattato, un tasto della console — succedono le stesse tre cose: il
// numero sale, il bot lo dice, il widget a schermo si aggiorna. Tenere tre copie
// di questa sequenza vorrebbe dire che prima o poi una delle tre dimentica il
// widget, e nessuno se ne accorge finche' non lo guarda.
// `delta` nullo = azzera. Ritorna la riga nuova, o null.
export function cambia(channel, comando, delta, say, emit) {
  try {
    const c = store.get(channel, comando);
    if (!c) return null;
    const nuovo = delta === null
      ? store.upsert(channel, { comando, valore: 0 })
      : store.incrementa(channel, comando, delta);
    if (!nuovo) return null;
    if (typeof say === 'function') {
      const emoji = c.emoji ? c.emoji + ' ' : '';
      say(`${emoji}${c.etichetta || c.comando}: ${nuovo.valore}`);
    }
    versoSeMostra(emit, nuovo);
    return nuovo;
  } catch (e) { log.debug('cambia:', e?.message || e); return null; }
}

export function perRiscatto(channel, data, say, emit) {
  try {
    const rewardId = data?.reward?.id; if (!rewardId) return false;
    const c = store.getByReward(channel, rewardId); if (!c) return false;
    cambia(channel, c.comando, c.step || 1, say, emit);
    return true;
  } catch (e) { log.debug('perRiscatto:', e?.message || e); return false; }
}
