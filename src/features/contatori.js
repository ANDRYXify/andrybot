// Contatori configurabili (morti, tentativi, parole…). Lo streamer/moderatori li
// gestiscono da comandi chat; tutti possono leggerne il valore. Tre modi di far
// salire un contatore:
//   1) comando chat (mod/streamer):  !morti+   !morti +3   !morti-   !morti reset   !morti set 10
//   2) parola automatica: ogni volta che una parola appare in chat → +1 (silenzioso)
//   3) riscatto di un premio a punti canale collegato → +step (con annuncio)
import { contatori as store } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('contatori');

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);

// emette l'aggiornamento del contatore sull'overlay OBS (stesso feed SSE di
// alert/effetti/chat). Best-effort.
function verso(emit, canale, comando) {
  try { if (typeof emit !== 'function') return; const c = store.get(canale, comando); if (c) emit(store.payloadOverlay(c)); }
  catch { /* niente */ }
}
// come verso(), ma solo se il widget è impostato "mostra" (per auto-parola/riscatto)
function versoSeMostra(emit, riga) {
  try { if (typeof emit !== 'function' || !riga) return; const o = store.overlayDi(riga); if (o.mostra) emit(store.payloadOverlay(riga)); }
  catch { /* niente */ }
}

// Comando chat "!<comando> [op] [arg]". Ritorna true se il messaggio era un
// comando di un contatore (così il chiamante può fermarsi). `emit` (opzionale)
// aggiorna l'overlay OBS. Op: (nulla)=leggi · + - reset set N · on/off (mostra il
// widget da 0 / lo nasconde).
export function tryComando(msg, say, emit) {
  try {
    const testo = String(msg?.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const canale = String(msg.channel || '').toLowerCase();
    const parti = testo.slice(1).split(/\s+/);
    let primo = parti[0].toLowerCase();
    let opInline = '';
    const attaccato = primo.match(/^([a-z0-9_]+?)([+-])$/);   // "morti+" / "morti-"
    if (attaccato) { primo = attaccato[1]; opInline = attaccato[2]; }
    const c = store.get(canale, primo);
    if (!c) return false;

    const emoji = c.emoji ? c.emoji + ' ' : '';
    const nome = c.etichetta || c.comando;
    const annuncia = (v) => { try { say(`${emoji}${nome}: ${v}`); } catch { /* niente */ } };

    // parole per ACCENDERE/SPEGNERE il widget: un set di default ampio + quelle
    // personalizzate dallo streamer per QUESTO contatore (campo parolaOn/parolaOff).
    const cfg = store.overlayDi(c);
    const extra = (s) => String(s || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
    const onWords = new Set(['on', 'acceso', 'accendi', 'accendilo', 'ok', 'okay', 'vai', 'via', 'start', 'avvia', 'parti', 'go', 'mostra', 'attiva', ...extra(cfg.parolaOn)]);
    const offWords = new Set(['off', 'spento', 'spegni', 'spegnilo', 'stop', 'ferma', 'basta', 'nascondi', 'disattiva', 'down', ...extra(cfg.parolaOff)]);

    // interpreta operatore e argomento
    let op = opInline, arg = null;
    if (!op && parti[1]) {
      const p1 = parti[1].toLowerCase();
      if (p1 === '+' || p1 === 'add' || p1 === 'more') op = '+';
      else if (p1 === '-' || p1 === 'meno') op = '-';
      else if (p1 === 'reset' || p1 === 'azzera' || p1 === 'zero') op = 'reset';
      else if (onWords.has(p1)) op = 'on';
      else if (offWords.has(p1)) op = 'off';
      else if (p1 === 'set' || p1 === '=') { op = 'set'; arg = parti[2]; }
      else if (/^[+-]\d+$/.test(p1)) { op = p1[0]; arg = p1.slice(1); }
      else if (/^\d+$/.test(p1)) { op = 'set'; arg = p1; }
    }

    if (!op) { annuncia(c.valore); return true; }   // sola lettura: per tutti
    if (!puoGestire(msg)) return true;              // modifiche solo mod/streamer (in silenzio)

    const passo = arg && /^\d+$/.test(arg) ? Math.max(1, parseInt(arg, 10)) : (c.step || 1);
    let nuovo = null;
    if (op === '+') nuovo = store.incrementa(canale, primo, passo);
    else if (op === '-') nuovo = store.incrementa(canale, primo, -passo);
    else if (op === 'reset') nuovo = store.setValore(canale, primo, 0);
    else if (op === 'set') nuovo = store.setValore(canale, primo, arg ? (parseInt(arg, 10) || 0) : 0);
    else if (op === 'on') { store.setValore(canale, primo, 0); nuovo = store.patchOverlay(canale, primo, { mostra: true }); }   // avvia da 0 e mostra a schermo
    else if (op === 'off') { nuovo = store.patchOverlay(canale, primo, { mostra: false }); }
    if (nuovo) { annuncia(nuovo.valore); verso(emit, canale, primo); }   // aggiorna sempre l'overlay (mostra/valore)
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
export function perRiscatto(channel, data, say, emit) {
  try {
    const rewardId = data?.reward?.id; if (!rewardId) return false;
    const c = store.getByReward(channel, rewardId); if (!c) return false;
    const nuovo = store.incrementa(channel, c.comando, c.step || 1);
    if (nuovo) {
      if (typeof say === 'function') { const emoji = c.emoji ? c.emoji + ' ' : ''; say(`${emoji}${c.etichetta || c.comando}: ${nuovo.valore}`); }
      versoSeMostra(emit, nuovo);
    }
    return true;
  } catch (e) { log.debug('perRiscatto:', e?.message || e); return false; }
}
