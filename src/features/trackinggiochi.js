// Comandi chat per i minigiochi webcam (P6). Avviano i giochi NELL'overlay
// tracking passando dal canale di ritorno degli effetti (effects.emitTrk). La
// "Battaglia con la chat": gli spettatori scrivono !sfida <gesto> e l'overlay
// mette alla prova lo streamer. Deterministico, mai IA. Rispetta l'interruttore
// tracking.giochi e funziona solo se un overlay tracking è davvero collegato.
import { streamers } from '../db.js';

// gesto canonico ← sinonimi/emoji che la chat può scrivere
const GESTI = {
  victory: ['victory', 'vittoria', 'v', 'pace', 'peace', '✌️', '✌'],
  thumbup: ['thumbup', 'thumbsup', 'pollice', 'pollicesu', 'like', 'ok', '👍'],
  openpalm: ['openpalm', 'mano', 'manoaperta', 'aperta', 'palmo', 'palm', 'five', 'high5', '✋', '🖐️', '🖐', '🤚'],
  point: ['point', 'indice', 'uno', 'dito', 'one', '☝️', '☝', '👆'],
  fist: ['fist', 'pugno', 'chiuso', 'punch', '✊', '👊'],
};
function normGesto(s) {
  s = String(s || '').toLowerCase().replace(/\s+/g, '');
  if (!s) return '';
  for (const [id, syn] of Object.entries(GESTI)) if (id === s || syn.includes(s)) return id;
  return '';
}
// alias comando → id gioco
const CMD = { mima: 'mima', mimo: 'mima', nonridere: 'nonridere', nonrido: 'nonridere', reaction: 'reaction', reactionrush: 'reaction', rush: 'reaction', battaglia: 'battaglia', battle: 'battaglia' };

const _ultimoSfida = new Map();   // "canale|user" → ts (anti-spam !sfida per utente)

export function tryComando(effects, msg, say) {
  try {
    if (!msg || msg.isSelf) return false;
    const testo = String(msg.text || '').trim();
    if (testo[0] !== '!') return false;
    const ch = msg.channel;
    const trk = streamers.get(ch)?.settings?.tracking || {};
    if (trk.attivo === false) return false;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti[0] || '').toLowerCase();

    // PUZZLE: dipende dall'interruttore effetti.puzzle (non dal flag giochi). Avvio
    // solo streamer/mod; serve un overlay tracking collegato.
    if (cmd === 'puzzle' || cmd === 'puzzlestop') {
      if (trk.effetti?.puzzle !== true) return false;
      if (!(msg.isMod || msg.isBroadcaster)) return true;
      if (!effects?.hasTrkClients?.(ch)) { say('Per il puzzle apri prima l\'overlay tracking in OBS 🎥 (scheda «Effetti» → Link OBS del tracking) e attiva il Puzzle nel pannello.'); return true; }
      effects.emitTrk(ch, cmd === 'puzzlestop' ? { azione: 'stop' } : { azione: 'start', gioco: 'puzzle' });
      return true;
    }

    if (trk.giochi === false) return false;   // altri giochi: rispettano il flag giochi

    if (cmd === 'giochi' || cmd === 'gioca') {
      say('🎮 Giochi webcam: !mima · !nonridere · !reaction · !battaglia — nella Battaglia la chat sfida con !sfida ✌️/👍/✋/☝️/✊');
      return true;
    }

    // Sfida della chat (per la "Battaglia"): la può mandare CHIUNQUE.
    if (cmd === 'sfida') {
      const g = normGesto(parti.slice(1).join(''));
      if (!g) return false;                                // non è un gesto valido: lascia stare
      if (!effects?.hasTrkClients?.(ch)) return false;     // nessun overlay: silenzio
      const k = ch + '|' + (msg.user || '');
      const ora = Date.now();
      if (ora - (_ultimoSfida.get(k) || 0) < 4000) return true;   // anti-spam per utente
      _ultimoSfida.set(k, ora);
      effects.emitTrk(ch, { azione: 'sfida', gesto: g, user: String(msg.display || msg.user || 'chat').slice(0, 20) });
      return true;
    }

    const gioco = CMD[cmd];
    if (!gioco) return false;
    // AVVIO solo da streamer o mod (altrimenti chiunque potrebbe spammare i giochi)
    if (!(msg.isMod || msg.isBroadcaster)) return true;
    if (!effects?.hasTrkClients?.(ch)) { say('Per giocare apri prima l\'overlay tracking in OBS 🎥 (scheda «Effetti» → Link OBS del tracking).'); return true; }
    effects.emitTrk(ch, { azione: 'start', gioco });
    return true;
  } catch { return false; }
}
