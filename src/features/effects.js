// EffectsEngine: il motore di "Effetti & Suoni".
// Tiene il registro degli overlay collegati (browser source di OBS) via SSE,
// riconosce i comandi in chat (es. !airhorn) rispettando ruoli e cooldown, e
// spinge l'effetto verso l'overlay giusto. Lo stato (chi può usare cosa) vive
// nel DB; qui c'è solo la parte "in tempo reale" e in memoria.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { effects as effectsDb, streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('effects');

// Un utente è VIP se ha il badge 'vip/' oppure il tag vip=1.
function isVip(msg) {
  const badges = msg?.tags?.badges || '';
  return badges.includes('vip/') || msg?.tags?.vip === '1';
}

const norm = (s) => String(s || '').toLowerCase();

export class EffectsEngine {
  constructor() {
    this._clients = new Map();    // channel → Set<res> (connessioni SSE degli overlay)
    this._cooldown = new Map();   // 'channel|comando' → epoch ms di fine cooldown
  }

  // ------------------------------------------------------ registro overlay (SSE)

  // Registra una connessione SSE dell'overlay per un canale.
  addClient(channel, res) {
    const ch = norm(channel);
    let set = this._clients.get(ch);
    if (!set) { set = new Set(); this._clients.set(ch, set); }
    set.add(res);
    log.debug(`overlay collegato a #${ch} (ora ${set.size})`);
  }

  // Rimuove una connessione SSE (chiamata alla chiusura della richiesta).
  removeClient(channel, res) {
    const ch = norm(channel);
    const set = this._clients.get(ch);
    if (!set) return;
    set.delete(res);
    if (!set.size) this._clients.delete(ch);
  }

  // Manda un payload a TUTTI gli overlay di quel canale (riga SSE `data: ...`).
  emit(channel, payload) {
    const ch = norm(channel);
    const set = this._clients.get(ch);
    if (!set || !set.size) return;
    const riga = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) {
      try { res.write(riga); } catch { /* client morto: verrà tolto su 'close' */ }
    }
  }

  // Keepalive: un commento SSE che non fa nulla, serve solo a tenere viva la
  // connessione dietro reverse proxy (Caddy). server.js lo chiama ogni ~15s.
  ping() {
    for (const set of this._clients.values()) {
      for (const res of set) {
        try { res.write(': ping\n\n'); } catch { /* ignora: il close pulirà */ }
      }
    }
  }

  // ------------------------------------------------------ chiavi e URL overlay

  // Chiave casuale per canale, salvata in streamers.settings.overlayKey.
  // Protegge l'overlay (chi ha il link può vederne gli effetti). Se manca,
  // la genera e la salva mergiando le impostazioni esistenti.
  overlayKey(channel) {
    const login = norm(channel);
    const s = streamers.get(login);
    const attuale = s?.settings?.overlayKey;
    if (attuale) return attuale;
    const key = crypto.randomBytes(16).toString('hex');
    streamers.setSettings(login, { ...(s?.settings || {}), overlayKey: key });
    return key;
  }

  // URL completo dell'overlay da incollare in OBS (con la chiave).
  overlayUrl(channel) {
    const login = norm(channel);
    return `${config.baseUrl}/overlay/${login}?key=${this.overlayKey(login)}`;
  }

  // URL del media di un singolo effetto (usato nel payload verso l'overlay).
  mediaUrl(channel, file) {
    const login = norm(channel);
    return `${config.baseUrl}/overlay/${login}/media/${file}?key=${this.overlayKey(login)}`;
  }

  // Costruisce il payload standard di un effetto (riusato da trigger e "prova").
  payload(channel, eff) {
    return {
      comando: eff.comando,
      tipo: eff.tipo,
      url: this.mediaUrl(channel, eff.file),
      volume: eff.volume,
      durata: eff.durata,
    };
  }

  // ------------------------------------------------------ trigger dalla chat

  // Verifica il tier (ruolo minimo) rispetto al messaggio.
  _autorizzato(tier, msg) {
    const mod = msg.isMod || msg.isBroadcaster;
    switch (tier) {
      case 'mod': return !!mod;
      case 'vip': return isVip(msg) || !!mod;
      case 'sub': return !!msg.isSub || !!mod;
      case 'tutti':
      default: return true;
    }
  }

  // Dato un messaggio di chat, se è un comando effetto lo attiva.
  // Ritorna:
  //   false → non è un comando effetto (lascia proseguire gli altri gestori)
  //   true  → comando riconosciuto (autorizzato o no, in cooldown o no: sempre silenzioso)
  tryTrigger(msg, _say) {
    if (!msg || typeof msg.text !== 'string' || !msg.text.startsWith('!')) return false;
    const channel = norm(msg.channel);
    const comando = (msg.text.slice(1).trim().split(/\s+/)[0] || '').toLowerCase();
    if (!comando) return false;

    const eff = effectsDb.get(channel, comando);
    if (!eff) return false;   // non è un effetto di questo canale

    // (i) controllo ruolo/tier: se non autorizzato, silenzio (niente spam in chat)
    if (!this._autorizzato(eff.tier, msg)) return true;

    // (ii) cooldown per (canale, comando): se non è ancora scaduto, silenzio
    const chiave = channel + '|' + comando;
    const ora = Date.now();
    if (ora < (this._cooldown.get(chiave) || 0)) return true;
    this._cooldown.set(chiave, ora + (eff.cooldown || 0) * 1000);

    // (iii) via all'overlay
    this.emit(channel, this.payload(channel, eff));
    log.debug(`effetto !${comando} su #${channel}`);
    return true;
  }
}
