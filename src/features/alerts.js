// AlertsEngine: il "regista" dell'overlay in tempo reale.
// - ALERT animati per gli eventi (follow, sub, cheer, raid) con stile completo;
// - CHAT a schermo;
// - WIDGET persistenti (ultimo follower, ultimo sub) aggiornati dagli eventi.
// Riusa il canale SSE degli effetti (EffectsEngine.emit) e i suoni PRESET.
// Tutta la configurazione (e lo stato dei widget) vive in streamers.settings.
import { streamers, effects as effectsDb } from '../db.js';
import * as subathon from './subathon.js';
import * as treno from './treno.js';
import { comeSiChiama, portaCorona } from './bit.js';
import * as stemmi from './badges.js';
import * as emote from './emotes.js';
import { makeLog } from '../logger.js';
import { formattaImporto, livelloPer } from './donazioni.js';

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
  donazione: '{user} ha offerto {importo}! {messaggio}',
};
const DEFAULT_SUONO = { follow: 'campanello', sub: 'tada', cheer: 'moneta', raid: 'trombetta', donazione: 'moneta' };
const DEFAULT_ACC = { follow: '#f72fa7', sub: '#ffb020', cheer: '#38d39f', raid: '#ff4d4d', donazione: '#1d9e5e' };

// stile alert di default (usato se lo streamer non lo tocca)
const STILE_ALERT = { animazione: 'slide', dimTesto: 27, sfondo: '#0f0f14', opacita: 88, testo: '#ffffff', bordoRaggio: 18, bordoSpessore: 2, glow: true, icona: true, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea', composizione: 'colonna', dimIcona: 46, uscita: 'come', peso: '700', spaziatura: 0, maiuscolo: 'no', ombraTesto: true, evidenziaNome: true };
const STILE_CHAT = { dim: 'media', sfondo: '#0f0f14', opacita: 78, testo: '#f2f2f5', username: 'twitch', bordoRaggio: 10, ombra: true, font: 'sistema', larghezza: 30, animazione: 'slide', grassettoUser: true, forma: 'carta', materia: 'piatta', cornice: 'nessuna', peso: '700', spaziatura: 0, maiuscolo: 'no', ombraTesto: false };

const esc = (s) => String(s ?? '');
function riempi(tpl, vars) {
  return esc(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).slice(0, 200);
}

// Quale evento fa crescere quale obiettivo. Un evento che non compare qui non
// ne fa crescere nessuno: e' l'elenco, non un caso particolare nel codice.
const GOAL_DI = { follow: 'follower', sub: 'sub', cheer: 'bit', donazione: 'euro' };

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

// Da dove arriva un messaggio. Chi legge da Twitch non scrive la piattaforma
// (era l'unica quando il bot e' nato), quindi l'assenza vale 'twitch': cosi' i
// canali che non hanno mai collegato altro non cambiano di una virgola.
const piattaformaDi = (msg) => String(msg?.piattaforma || 'twitch').toLowerCase();

export class AlertsEngine {
  constructor({ effects, say } = {}) {
    this.effects = effects || null;
    this.say = say || null;
  }

  cfg(channel) { return streamers.get(channel)?.settings || null; }

  _stileAlert(s) { return { ...STILE_ALERT, ...((s?.alerts?.stile && typeof s.alerts.stile === 'object') ? s.alerts.stile : {}) }; }
  _stileChat(s) { return { ...STILE_CHAT, ...((s?.chatOverlay?.stile && typeof s.chatOverlay.stile === 'object') ? s.chatOverlay.stile : {}) }; }

  _vars(d = {}) {
    const raider = d.from_broadcaster_user_name || '';
    return {
      user: comeSiChiama(d, raider || 'qualcuno'),
      mesi: d.cumulative_months ?? d.duration_months ?? 1,
      bits: d.bits ?? 0,
      viewers: d.viewers ?? 0,
    };
  }

  // Evento Twitch → aggiorna i widget (ultimo follower/sub) e, se abilitato, spara l'alert.
  onEvent(ev) {
    try {
      const { channel, type, data } = ev || {};
      // IL TRENO PASSA PRIMA, E DA SOLO. Non e' un alert: non ha un suo suono,
      // non ha un suo testo da sparare in scena, e soprattutto NON conta — i
      // sub e i bit che lo fanno crescere sono gia' passati di qui uno per uno.
      // Vedi features/treno.js.
      if (treno.EVENTI[type]) {
        treno.suEvento(channel, type, data, {
          say: this.say,
          spingi: (ch, t) => this.effects?.emit?.(ch, { tipo: 'treno', treno: t }),
        });
        return;
      }
      const kind = MAPPA[type];
      if (!kind) return;
      const s = this.cfg(channel);
      const vars = this._vars(data);
      // widget persistenti: si aggiornano a prescindere dall'alert
      if (kind === 'follow') this._aggiornaWidget(channel, 'ultimoFollower', vars.user);
      if (kind === 'sub') this._aggiornaWidget(channel, 'ultimoSub', vars.user);
      // I SUB REGALATI ARRIVANO DUE VOLTE. Twitch manda un `channel.subscribe`
      // per OGNI abbonamento regalato, piu' un `channel.subscription.gift` per
      // la raffica: contarli tutti e due vuol dire contare venti regali
      // ventuno volte. L'annuncio della raffica serve all'alert, non al conto.
      const regalo = type === 'channel.subscription.gift';
      // l'obiettivo conta gli eventi veri, non una stima: passano tutti di qui
      if (!regalo) this._contaGoal(channel, kind, kind === 'cheer' ? Number(vars.bits) || 0 : 1);
      // il subathon allunga il conto alla rovescia, se lo streamer lo ha acceso
      if (!regalo && (kind === 'sub' || kind === 'cheer')) {
        subathon.suEvento(channel, {
          tipo: kind === 'cheer' ? 'bit' : 'sub',
          quanti: kind === 'cheer' ? Number(vars.bits) || 0 : 1,
          chi: vars.user,
        }, { say: this.say, spingi: (ch, fine) => this.effects?.emit?.(ch, { tipo: 'timer', fine }) });
      }
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

  // UNA DONAZIONE. Non viene da Twitch: la porta il webhook di Ko-fi o una
  // automazione dello streamer. Fa crescere l'obiettivo in euro, spara l'alert
  // (dall'importo minimo in su) e, se acceso, ringrazia in chat.
  // `soloAvviso`: l'avviso si rimanda in overlay dal registro, ma l'obiettivo
  // e la chat non si toccano: quella donazione e' gia' stata contata e ringraziata.
  donazione(channel, d, { soloAvviso = false } = {}) {
    try {
      const s = this.cfg(channel);
      if (!s || !d) return false;
      const importo = Math.round((Number(d.importo) || 0) * 100) / 100;
      if (importo <= 0) return false;
      const cfgD = s.donazioni || {};
      const vars = { user: d.user || 'qualcuno', importo: formattaImporto(importo, d.valuta || cfgD.valuta || 'EUR'), messaggio: d.messaggio || '' };
      if (!soloAvviso) {
        this._contaGoal(channel, 'donazione', importo);
        subathon.suEvento(channel, { tipo: 'euro', quanti: importo, chi: vars.user },
          { say: this.say, spingi: (ch, fine) => this.effects?.emit?.(ch, { tipo: 'timer', fine }) });
      }
      const a = s.alerts;
      const conf = a && a.attivo !== false ? a.donazione : null;
      if (conf && conf.attivo !== false && (soloAvviso || importo >= (Number(conf.minImporto) || 0))) this._spara(channel, a, 'donazione', conf, vars);
      if (!soloAvviso && cfgD.annunciaChat && this.say) this.say(channel, riempi(cfgD.testoChat || 'Grazie {user} per {importo}!', vars));
      // l'offerta raggiunta accende il suo effetto, un attimo dopo l'avviso
      if (!soloAvviso) { const liv = livelloPer(cfgD.livelli, importo); if (liv?.effetto) this._sparaEffetto(channel, liv.effetto, 1200); }
      log.info(`donazione su #${channel}: ${vars.importo} da ${vars.user}`);
      return true;
    } catch (e) { log.debug('donazione:', e?.message || e); return false; }
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
      for (const x of tocca) conti[x.id] = Math.round(((Number(conti[x.id]) || 0) + quanti) * 100) / 100;
      stato.goals = conti;
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'goal', goals: lista, conti });
    } catch (e) { log.debug('goal:', e?.message || e); }
  }

  // IL CONTO ALLA ROVESCIA. Non si tiene un contatore che scorre: si scrive
  // l'ISTANTE in cui scade, e chi lo mostra fa la sottrazione. Cosi' non c'e'
  // niente che possa andare fuori sincrono — ne' fra il server e l'overlay, ne'
  // fra due sorgenti aperte — e un riavvio del bot non lo azzera.
  // minuti = 0 lo spegne.
  impostaTimer(channel, minuti) {
    try {
      const s = streamers.get(channel);
      if (!s) return 0;
      const m = Math.max(0, Math.min(600, Math.round(Number(minuti) || 0)));
      const fine = m > 0 ? Date.now() + m * 60000 : 0;
      const stato = { ...(s.settings?.overlayStato || {}) };
      stato.timer = { fine };
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'timer', fine });
      return fine;
    } catch (e) { log.debug('timer:', e?.message || e); return 0; }
  }

  // L'OVERLAY DELL'ATTESA FA PARTIRE IL CONTO DA SE' (e lo stesso fa il pannello
  // nel momento in cui si accende «parte da solo»). Ma solo se non sta gia'
  // andando: due sorgenti aperte insieme chiederebbero tutte e due, e la seconda
  // farebbe ripartire da capo un conto gia' avviato — proprio mentre chi guarda
  // lo sta leggendo. Chi arriva secondo non trova niente da fare, ed e' giusto.
  avviaTimerSePronto(channel) {
    try {
      const s = streamers.get(channel);
      if (!s) return 0;
      const cfg = s.settings?.overlayTimer;
      if (!cfg || cfg.attivo !== true || cfg.partiDaSolo !== true) return 0;
      const fine = Number(s.settings?.overlayStato?.timer?.fine) || 0;
      if (fine > Date.now()) return fine;
      return this.impostaTimer(channel, cfg.minuti);
    } catch (e) { log.debug('timer da solo:', e?.message || e); return 0; }
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
  // Il player: la configurazione com'e', piu' l'indirizzo del video scelto fra
  // gli Effetti, risolto qui come le icone. Solo se e' davvero un video.
  _musicaConVideo(channel, m) {
    if (!m || typeof m !== 'object') return null;
    const v = m.video ? this._risolviEffetto(channel, m.video) : null;
    return { ...m, videoUrl: v && v.tipo === 'video' ? v.url : '' };
  }

  // Un effetto della libreria, mandato in overlay come lo manda il tasto
  // «Prova» del pannello: stesso payload (media, volume, durata, posizione).
  _sparaEffetto(channel, ref, ritardoMs = 0) {
    const m = /^effetto:(.+)$/i.exec(String(ref || ''));
    if (!m || !this.effects?.emit || !this.effects?.payload) return false;
    let eff = null;
    try { eff = effectsDb.get(channel, m[1]); } catch { eff = null; }
    if (!eff) return false;
    const manda = () => { try { this.effects.emit(channel, this.effects.payload(channel, eff)); } catch (e) { log.debug('effetto donazione:', e?.message || e); } };
    if (ritardoMs > 0) setTimeout(manda, ritardoMs).unref?.(); else manda();
    return true;
  }

  // L'immagine di chi dona, gia' pronta come payload dell'overlay (donazioni-media):
  // parte un attimo dopo l'avviso, come l'effetto di un'offerta.
  effettoDono(channel, p, ritardoMs = 0) {
    if (!p || !p.url || !this.effects?.emit) return false;
    const manda = () => { try { this.effects.emit(channel, p); } catch (e) { log.debug('effetto di chi dona:', e?.message || e); } };
    if (ritardoMs > 0) setTimeout(manda, ritardoMs).unref?.(); else manda();
    return true;
  }

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
        // DA DOVE ARRIVA. E' un dato del messaggio, non un'impostazione: se non
        // viaggia con lui, a schermo una riga di Kick e una di Twitch sono la
        // stessa cosa, e nessuna scelta a valle puo' piu' distinguerle.
        piattaforma: piattaformaDi(msg),
        // la corona del re dei Bit: anche questa e' del messaggio, perche' chi
        // regna puo' cambiare mentre l'overlay e' aperto.
        corona: portaCorona(channel, msg.user, piattaformaDi(msg)),
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
        piattaforma: piattaformaDi(msg),
        corona: portaCorona(channel, msg.user, piattaformaDi(msg)),
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
      musica: this._musicaConVideo(channel, s.overlayMusica),
      timer: (s.overlayTimer && typeof s.overlayTimer === 'object') ? s.overlayTimer : null,
      treno: (s.overlayTreno && typeof s.overlayTreno === 'object') ? s.overlayTreno : null,
      bit: (s.overlayBit && typeof s.overlayBit === 'object') ? s.overlayBit : null,
      // I CARTELLI arrivano all'overlay con l'immagine gia' risolta in
      // indirizzo, come le icone dei widget: la pagina non sa niente della
      // libreria Effetti, e non deve saperlo.
      cartelli: (Array.isArray(s.overlayCartelli) ? s.overlayCartelli : []).map((c) => {
        if (!c || c.tipo !== 'immagine' || !c.effetto) return c;
        const eff = this._risolviEffetto(channel, c.effetto);
        return (eff && eff.tipo === 'immagine') ? { ...c, url: eff.url } : c;
      }),
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
    this._spara(channel, a, kind, conf, { user: 'MarioRossi', mesi: 3, bits: 500, viewers: 42, importo: formattaImporto(5, s.donazioni?.valuta || 'EUR'), messaggio: 'grande live!' });
    return true;
  }
}
