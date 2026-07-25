// AlertsEngine: alert animati nell'overlay per gli EVENTI (follow, sub, cheer,
// raid) e la CHAT a schermo. Riusa il canale SSE degli effetti (EffectsEngine.emit)
// e i suoni PRESET (nessun file). Lo stato/config vive in streamers.settings.
//
// L'overlay riceve:
//   { tipo:'alert', kind, testo, colore, suono, durata, posizione }
//   { tipo:'chat',  user, colore, testo, badge, posizione, max, fadeSec, dim }
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('alerts');

// tipo evento Twitch → categoria alert
const MAPPA = {
  'channel.follow': 'follow',
  'channel.subscribe': 'sub',
  'channel.subscription.message': 'sub',
  'channel.subscription.gift': 'sub',
  'channel.cheer': 'cheer',
  'channel.raid': 'raid',
};

// testi di default per ogni tipo di alert (con segnaposto {…})
const DEFAULT_TESTO = {
  follow: '{user} ha seguito il canale!',
  sub: '{user} si è abbonato! ({mesi} mesi)',
  cheer: '{user} ha lanciato {bits} bit!',
  raid: '{user} è arrivato in raid con {viewers} spettatori!',
};
const DEFAULT_SUONO = { follow: 'campanello', sub: 'tada', cheer: 'moneta', raid: 'trombetta' };

const esc = (s) => String(s ?? '');
function riempi(tpl, vars) {
  return esc(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).slice(0, 200);
}

export class AlertsEngine {
  constructor({ effects } = {}) {
    this.effects = effects || null;
  }

  cfg(channel) { return streamers.get(channel)?.settings || null; }

  // Estrae le variabili dai dati dell'evento Twitch.
  _vars(kind, d = {}) {
    const raider = d.from_broadcaster_user_name || '';
    return {
      user: d.user_name || d.user_login || raider || 'qualcuno',
      mesi: d.cumulative_months ?? d.duration_months ?? 1,
      bits: d.bits ?? 0,
      viewers: d.viewers ?? 0,
    };
  }

  // Evento Twitch → alert nell'overlay (se abilitato).
  onEvent(ev) {
    try {
      const { channel, type, data } = ev || {};
      const kind = MAPPA[type];
      if (!kind) return;
      const s = this.cfg(channel);
      const a = s?.alerts;
      if (!a || a.attivo === false) return;
      const conf = a[kind];
      if (!conf || conf.attivo === false) return;
      const vars = this._vars(kind, data);
      // soglie minime
      if (kind === 'cheer' && Number(vars.bits) < (Number(conf.minBits) || 0)) return;
      if (kind === 'raid' && Number(vars.viewers) < (Number(conf.minViewers) || 0)) return;
      this._spara(channel, a, kind, conf, vars);
    } catch (e) { log.debug('onEvent:', e?.message || e); }
  }

  _spara(channel, a, kind, conf, vars) {
    const testo = riempi(conf.testo || DEFAULT_TESTO[kind] || '{user}', vars);
    const suono = conf.suono || DEFAULT_SUONO[kind] || '';
    this.effects?.emit?.(channel, {
      tipo: 'alert', kind, testo,
      colore: conf.colore || '#9146ff',
      suono,
      durata: Math.max(2000, Math.min(20000, Number(a.durata) || 6000)),
      posizione: a.posizione || 'alto-centro',
    });
    log.debug(`alert ${kind} su #${channel}: ${testo}`);
  }

  // Messaggio di chat → overlay "chat a schermo" (se abilitato).
  onChat(channel, msg) {
    try {
      const c = this.cfg(channel)?.chatOverlay;
      if (!c || !c.attivo) return;
      const testo = String(msg?.text || '').trim();
      if (!testo || testo.startsWith('!')) return;   // niente comandi a schermo
      this.effects?.emit?.(channel, {
        tipo: 'chat',
        user: msg.display || msg.user || '',
        colore: msg?.tags?.color || '',
        testo: testo.slice(0, 200),
        posizione: c.posizione || 'basso-sinistra',
        max: Math.max(1, Math.min(20, Number(c.max) || 8)),
        fadeSec: Math.max(0, Math.min(120, Number(c.fadeSec) || 0)),
        dim: c.dim || 'media',
      });
    } catch (e) { log.debug('onChat:', e?.message || e); }
  }

  // Prova dal pannello: un alert (o la chat) d'esempio nell'overlay.
  prova(channel, kind = 'follow') {
    const s = this.cfg(channel);
    if (kind === 'chat') {
      const c = s?.chatOverlay || {};
      const finti = [
        { user: 'lucaplays', colore: '#ff4d4d', testo: 'ciao a tutti! 👋' },
        { user: 'giada_ttv', colore: '#48b0ff', testo: 'che bella live oggi' },
        { user: 'marco99', colore: '#38d39f', testo: 'GG! 🔥' },
      ];
      finti.forEach((f, i) => setTimeout(() => this.effects?.emit?.(channel, {
        tipo: 'chat', ...f, posizione: c.posizione || 'basso-sinistra',
        max: Math.max(1, Math.min(20, Number(c.max) || 8)),
        fadeSec: Math.max(0, Math.min(120, Number(c.fadeSec) || 0)), dim: c.dim || 'media',
      }), i * 500));
      return true;
    }
    const a = s?.alerts || {};
    const conf = (a[kind]) || {};
    const vars = { user: 'MarioRossi', mesi: 3, bits: 500, viewers: 42 };
    this._spara(channel, a, kind, conf, vars);
    return true;
  }
}
