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
const DEFAULT_ACC = { follow: '#f72fa7', sub: '#ffb020', cheer: '#38d39f', raid: '#ff4d4d' };

// stile alert di default (usato se lo streamer non lo tocca)
const STILE_ALERT = { animazione: 'slide', dimTesto: 27, sfondo: '#0f0f14', opacita: 88, testo: '#ffffff', bordoRaggio: 18, bordoSpessore: 2, glow: true, icona: true, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea', composizione: 'colonna', dimIcona: 46, uscita: 'come', peso: '700', spaziatura: 0, maiuscolo: 'no', ombraTesto: true, evidenziaNome: true };
const STILE_CHAT = { dim: 'media', sfondo: '#0f0f14', opacita: 78, testo: '#f2f2f5', username: 'twitch', bordoRaggio: 10, ombra: true, font: 'sistema', larghezza: 30, animazione: 'slide', grassettoUser: true, forma: 'carta', materia: 'piatta', cornice: 'nessuna', peso: '700', spaziatura: 0, maiuscolo: 'no', ombraTesto: false };

const esc = (s) => String(s ?? '');
function riempi(tpl, vars) {
  return esc(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).slice(0, 200);
}

// Quale evento fa crescere quale obiettivo. Un evento che non compare qui non
// ne fa crescere nessuno: e' l'elenco, non un caso particolare nel codice.
const GOAL_DI = { follow: 'follower', sub: 'sub', cheer: 'bit' };

// Gli obiettivi del canale. Chi aveva l'obiettivo singolo di prima se lo ritrova
// come primo della lista, col suo conto: nessuno perde niente cambiando forma.
export function goalDi(settings) {
  const s = settings || {};
  if (Array.isArray(s.overlayGoals)) return s.overlayGoals;
  const vecchio = s.overlayGoal;
  if (!vecchio || typeof vecchio !== 'object') return [];
  return [{ id: 'g1', attivo: !!vecchio.attivo, tipo: vecchio.tipo || 'follower',
    obiettivo: Number(vecchio.obiettivo) || 100, titolo: vecchio.titolo || '',
    posizione: 'alto-sinistra', xy: null, stile: {} }];
}

export function contiGoal(settings) {
  const st = settings?.overlayStato || {};
  if (st.goals && typeof st.goals === 'object') return st.goals;
  const vecchio = st.goal;
  const lista = goalDi(settings);
  if (!vecchio || !lista.length) return {};
  return { [lista[0].id]: Number(vecchio[lista[0].tipo]) || 0 };
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
      // l'obiettivo conta gli eventi veri, non una stima: passano tutti di qui
      this._contaGoal(channel, kind, kind === 'cheer' ? Number(vars.bits) || 0 : 1);
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

  // L'OBIETTIVO. Conta gli eventi che lo riguardano e li rende disponibili
  // all'overlay. Il conto sta nelle impostazioni del canale, quindi sopravvive a
  // un riavvio: un obiettivo che si azzera da solo la notte non e' un obiettivo.
  _contaGoal(channel, kind, quanti = 1) {
    try {
      const g = GOAL_DI[kind];
      if (!g || quanti <= 0) return;
      const s = streamers.get(channel);
      const lista = goalDi(s?.settings);
      const tocca = lista.filter((x) => x.attivo !== false && x.tipo === g);
      if (!tocca.length) return;
      const stato = { ...(s.settings?.overlayStato || {}) };
      const conti = { ...(stato.goals || {}) };
      for (const x of tocca) conti[x.id] = (Number(conti[x.id]) || 0) + quanti;
      stato.goals = conti;
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'goal', goals: lista, conti });
    } catch (e) { log.debug('goal:', e?.message || e); }
  }

  // Riporta un obiettivo a zero — o tutti. E' un'azione dello streamer, non del
  // tempo: un obiettivo che si azzera da solo la notte non e' un obiettivo.
  azzeraGoal(channel, id = '') {
    try {
      const s = streamers.get(channel);
      if (!s) return 0;
      const stato = { ...(s.settings?.overlayStato || {}) };
      const conti = { ...(stato.goals || {}) };
      if (id) conti[id] = 0; else for (const k of Object.keys(conti)) conti[k] = 0;
      stato.goals = conti;
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'goal', goals: goalDi(s.settings), conti });
      return 0;
    } catch (e) { return 0; }
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
    // ICONA: la chiave di una icona della libreria, oppure un'immagine caricata.
    payload.icona = conf.icona != null ? String(conf.icona) : undefined;
    if (String(conf.icona || '').toLowerCase().startsWith('effetto:')) {
      const ico = this._risolviEffetto(channel, conf.icona);
      if (ico && ico.tipo === 'immagine') payload.iconaUrl = ico.url;
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
    const w = (s.overlayWidget && typeof s.overlayWidget === 'object') ? s.overlayWidget : {};
    // le icone caricate arrivano all'overlay gia' risolte in indirizzo: la
    // pagina non sa niente della libreria Effetti, e non deve saperlo
    const conIcone = {};
    for (const [k, cfg] of Object.entries(w)) {
      if (!cfg || typeof cfg !== 'object') { conIcone[k] = cfg; continue; }
      const rif = cfg.stile && cfg.stile.icona;
      const ico = String(rif || '').toLowerCase().startsWith('effetto:') ? this._risolviEffetto(channel, rif) : null;
      conIcone[k] = (ico && ico.tipo === 'immagine') ? { ...cfg, iconaUrl: ico.url } : cfg;
    }
    const fontMiei = (Array.isArray(s.fontPersonali) ? s.fontPersonali : [])
      .filter((f) => f && f.nome && f.file)
      .map((f) => ({ nome: f.nome, url: this.effects?.mediaUrl ? this.effects.mediaUrl(channel, f.file) : '' }))
      .filter((f) => f.url);
    return {
      css: String(s.overlayCss || '').slice(0, 8000),
      fontPersonali: fontMiei,
      widget: conIcone,
      goals: goalDi(s),
      conti: contiGoal(s),
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
