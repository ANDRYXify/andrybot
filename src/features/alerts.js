// AlertsEngine: il "regista" dell'overlay in tempo reale.
// - ALERT animati per gli eventi (follow, sub, cheer, raid) con stile completo;
// - CHAT a schermo;
// - WIDGET persistenti (ultimo follower, ultimo sub) aggiornati dagli eventi.
// Riusa il canale SSE degli effetti (EffectsEngine.emit) e i suoni PRESET.
// Tutta la configurazione (e lo stato dei widget) vive in streamers.settings.
import { streamers, effects as effectsDb } from '../db.js';
import * as stemmi from './badges.js';
import * as emote from './emotes.js';
import { makeLog } from '../logger.js';

const log = makeLog('alerts');

const MAPPA = {
  'channel.follow': 'follow',
  'channel.subscribe': 'sub',
  'channel.subscription.message': 'sub',
  'channel.subscription.gift': 'sub',
  'channel.cheer': 'cheer',
  'channel.raid': 'raid',
};

const DEFAULT_TESTO = {
  follow: '{user} ha seguito il canale!',
  sub: '{user} si è abbonato! ({mesi} mesi)',
  cheer: '{user} ha lanciato {bits} bit!',
  raid: '{user} è arrivato in raid con {viewers} spettatori!',
};
const DEFAULT_SUONO = { follow: 'campanello', sub: 'tada', cheer: 'moneta', raid: 'trombetta' };
const DEFAULT_ACC = { follow: '#9146ff', sub: '#ffb020', cheer: '#38d39f', raid: '#ff4d4d' };

// stile alert di default (usato se lo streamer non lo tocca)
const STILE_ALERT = { animazione: 'slide', dimTesto: 27, sfondo: '#0f0f14', opacita: 88, testo: '#ffffff', bordoRaggio: 18, bordoSpessore: 2, glow: true, icona: true, font: 'sistema' };
const STILE_CHAT = { dim: 'media', sfondo: '#0f0f14', opacita: 78, testo: '#f2f2f5', username: 'twitch', bordoRaggio: 10, ombra: true, font: 'sistema', larghezza: 30, animazione: 'slide', grassettoUser: true };

const esc = (s) => String(s ?? '');
function riempi(tpl, vars) {
  return esc(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).slice(0, 200);
}

export class AlertsEngine {
  constructor({ effects } = {}) {
    this.effects = effects || null;
  }

  cfg(channel) { return streamers.get(channel)?.settings || null; }

  _stileAlert(s) { return { ...STILE_ALERT, ...((s?.alerts?.stile && typeof s.alerts.stile === 'object') ? s.alerts.stile : {}) }; }
  _stileChat(s) { return { ...STILE_CHAT, ...((s?.chatOverlay?.stile && typeof s.chatOverlay.stile === 'object') ? s.chatOverlay.stile : {}) }; }

  _vars(d = {}) {
    const raider = d.from_broadcaster_user_name || '';
    return {
      user: d.user_name || d.user_login || raider || 'qualcuno',
      mesi: d.cumulative_months ?? d.duration_months ?? 1,
      bits: d.bits ?? 0,
      viewers: d.viewers ?? 0,
    };
  }

  // Evento Twitch → aggiorna i widget (ultimo follower/sub) e, se abilitato, spara l'alert.
  onEvent(ev) {
    try {
      const { channel, type, data } = ev || {};
      const kind = MAPPA[type];
      if (!kind) return;
      const s = this.cfg(channel);
      const vars = this._vars(data);
      // widget persistenti: si aggiornano a prescindere dall'alert
      if (kind === 'follow') this._aggiornaWidget(channel, 'ultimoFollower', vars.user);
      if (kind === 'sub') this._aggiornaWidget(channel, 'ultimoSub', vars.user);
      // alert
      const a = s?.alerts;
      if (!a || a.attivo === false) return;
      const conf = a[kind];
      if (!conf || conf.attivo === false) return;
      if (kind === 'cheer' && Number(vars.bits) < (Number(conf.minBits) || 0)) return;
      if (kind === 'raid' && Number(vars.viewers) < (Number(conf.minViewers) || 0)) return;
      this._spara(channel, a, kind, conf, vars);
    } catch (e) { log.debug('onEvent:', e?.message || e); }
  }

  // Risolve "effetto:<comando>" in { url, tipo } usando la libreria Effetti &
  // suoni del canale (così un alert può usare un suono/immagine/video caricati).
  _risolviEffetto(channel, ref) {
    const m = /^effetto:(.+)$/i.exec(String(ref || ''));
    if (!m) return null;
    try {
      const eff = effectsDb.get(channel, m[1]);
      if (!eff || !this.effects?.mediaUrl) return null;
      return { url: this.effects.mediaUrl(channel, eff.file), tipo: eff.tipo };
    } catch { return null; }
  }

  _spara(channel, a, kind, conf, vars) {
    const s = this.cfg(channel);
    // font per-alert: se impostato, sovrascrive quello condiviso dello stile
    const stileBase = this._stileAlert(s);
    const stile = conf.font ? { ...stileBase, font: conf.font } : stileBase;
    const payload = {
      tipo: 'alert', kind,
      testo: riempi(conf.testo || DEFAULT_TESTO[kind] || '{user}', vars),
      colore: conf.accento || conf.colore || DEFAULT_ACC[kind],
      volume: conf.volume != null ? Math.max(0, Math.min(100, Number(conf.volume))) : 100,
      durata: Math.max(2000, Math.min(20000, Number(a.durata) || 6000)),
      posizione: a.posizione || 'alto-centro',
      xy: a.xy || null,
      stile,
    };
    // SUONO: un effetto audio caricato (suonoUrl) oppure un preset sintetizzato.
    if (String(conf.suono || '').toLowerCase().startsWith('effetto:')) {
      const sfx = this._risolviEffetto(channel, conf.suono);
      if (sfx && sfx.tipo === 'audio') payload.suonoUrl = sfx.url;    // altrimenti: niente suono
    } else {
      payload.suono = conf.suono || DEFAULT_SUONO[kind] || '';
    }
    // MEDIA: un'immagine o un video caricato, mostrato insieme all'alert.
    const media = this._risolviEffetto(channel, conf.media);
    if (media && (media.tipo === 'immagine' || media.tipo === 'video')) {
      payload.mediaUrl = media.url; payload.mediaTipo = media.tipo;
    }
    this.effects?.emit?.(channel, payload);
    log.debug(`alert ${kind} su #${channel}`);
  }

  // Registra lo stato del widget e lo spinge subito nell'overlay.
  // persisti=false → mostra il valore SENZA salvarlo: serve alla "Prova", così i
  // nomi finti (MarioRossi/GiadaTTV) NON restano nell'overlay dal vivo.
  _aggiornaWidget(channel, id, valore, persisti = true) {
    try {
      const s = streamers.get(channel);
      if (!s) return;
      const val = String(valore || '').slice(0, 40);
      if (persisti) {
        const stato = { ...(s.settings?.overlayStato || {}), [id]: val };
        streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      }
      const cfg = s.settings?.overlayWidget?.[id];
      this.effects?.emit?.(channel, { tipo: 'widget', id, cfg: cfg || {}, valore: val });
    } catch (e) { log.debug('widget:', e?.message || e); }
  }

  // Messaggio di chat → overlay "chat a schermo".
  onChat(channel, msg) {
    try {
      const s = this.cfg(channel);
      const c = s?.chatOverlay;
      if (!c || !c.attivo) return;
      const testo = String(msg?.text || '').trim();
      if (!testo || testo.startsWith('!')) return;
      this.effects?.emit?.(channel, {
        tipo: 'chat',
        user: msg.display || msg.user || '',
        colore: msg?.tags?.color || '',
        testo: testo.slice(0, 200),
        // stemmi: Twitch (stringa "setId/version,…" risolta nell'overlay) + 7TV (url già risolto)
        badges: msg?.tags?.badges || '',
        badge7tv: stemmi.badge7tv(msg?.userId || msg?.tags?.['user-id']),
        // emote NATIVE di Twitch presenti in QUESTO messaggio: nome→url (dal tag "emotes")
        emotiTwitch: emote.twitchInMessaggio(msg?.tags?.emotes, msg?.text),
        posizione: c.posizione || 'basso-sinistra',
        xy: c.xy || null,
        max: Math.max(1, Math.min(20, Number(c.max) || 8)),
        fadeSec: Math.max(0, Math.min(120, Number(c.fadeSec) || 0)),
        stile: this._stileChat(s),
      });
    } catch (e) { log.debug('onChat:', e?.message || e); }
  }

  // Come onChat, ma SENZA il gate "chat overlay attiva" e senza scartare i
  // comandi: serve al PANNELLO CHAT dello Studio Web, che vuole vedere TUTTA la
  // chat in tempo reale (con emote e badge) a prescindere dall'overlay a
  // schermo. L'overlay OBS ignora gli eventi 'chat_raw'. Emette solo se c'è
  // qualcuno collegato via SSE (Studio/overlay aperto), così non risolviamo
  // emote a ogni messaggio quando nessuno ascolta.
  onChatRaw(channel, msg) {
    try {
      if (!this.effects?.hasClients?.(channel)) return;
      const testo = String(msg?.text || '').trim();
      if (!testo) return;
      this.effects.emit(channel, {
        tipo: 'chat_raw',
        user: msg.display || msg.user || '',
        colore: msg?.tags?.color || '',
        testo: testo.slice(0, 300),
        badges: msg?.tags?.badges || '',
        badge7tv: stemmi.badge7tv(msg?.userId || msg?.tags?.['user-id']),
        emotiTwitch: emote.twitchInMessaggio(msg?.tags?.emotes, msg?.text),
      });
    } catch (e) { log.debug('onChatRaw:', e?.message || e); }
  }

  // Il TEMA globale letto dall'overlay al caricamento: CSS avanzato, config e
  // stato dei widget persistenti.
  tema(channel) {
    const s = this.cfg(channel) || {};
    return {
      css: String(s.overlayCss || '').slice(0, 8000),
      widget: (s.overlayWidget && typeof s.overlayWidget === 'object') ? s.overlayWidget : {},
      stato: (s.overlayStato && typeof s.overlayStato === 'object') ? s.overlayStato : {},
    };
  }

  // Prova dal pannello.
  prova(channel, kind = 'follow') {
    const s = this.cfg(channel) || {};
    if (kind === 'chat') {
      const c = s.chatOverlay || {};
      const st = this._stileChat(s);
      [{ user: 'lucaplays', colore: '#ff4d4d', testo: 'ciao a tutti! 👋' },
       { user: 'giada_ttv', colore: '#48b0ff', testo: 'che bella live oggi' },
       { user: 'marco99', colore: '#38d39f', testo: 'GG! 🔥' }].forEach((f, i) => setTimeout(() =>
        this.effects?.emit?.(channel, { tipo: 'chat', ...f, posizione: c.posizione || 'basso-sinistra', xy: c.xy || null,
          max: Math.max(1, Math.min(20, Number(c.max) || 8)), fadeSec: Math.max(0, Math.min(120, Number(c.fadeSec) || 0)), stile: st }), i * 500));
      return true;
    }
    if (kind === 'ultimoFollower' || kind === 'ultimoSub') {
      // Prova: mostra un nome finto SENZA salvarlo (niente placeholder nel live)
      this._aggiornaWidget(channel, kind, kind === 'ultimoSub' ? 'GiadaTTV' : 'MarioRossi', false);
      return true;
    }
    const a = s.alerts || {};
    const conf = a[kind] || {};
    this._spara(channel, a, kind, conf, { user: 'MarioRossi', mesi: 3, bits: 500, viewers: 42 });
    return true;
  }
}
