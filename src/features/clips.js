// ClipEngine: crea le clip Twitch e riconosce da solo i "momenti da clip".
//
// Non basta più "tanti messaggi al minuto": il bot capisce un momento hype
// combinando più segnali, e si ADATTA al ritmo normale del canale (un picco su
// una chat piccola conta quanto un picco su una grande):
//   · PICCO vs BASELINE — la chat accelera di colpo rispetto al suo normale;
//   · REAZIONI — risate/hype (ahah, LOL, KEKW, POG, "clip", "pazzesco"…);
//   · PERSONE — reagiscono in tanti (non un solo utente che floida);
//   · EVENTI — sub, valanghe di bit, raid: momenti forti che spesso vanno clippati.
import { makeLog } from '../logger.js';
import { clips, streamers } from '../db.js';

const log = makeLog('clips');

const BURST = 12_000;            // finestra "adesso" su cui misurare il picco (ms)
const BASELINE = 150_000;        // storico su cui stimare il ritmo normale del canale
const BOOST_TTL = 20_000;        // quanto resta "caldo" un evento (sub/bit/raid)
const PAUSA_BASE = 4 * 60_000;   // pausa minima tra due clip automatiche
const PAUSA_RAPIDA = 90_000;     // pausa ridotta quando c'è un evento forte
const MAX_BUF = 2000;            // tetto di sicurezza del buffer per canale

// Riconosce un messaggio di "reazione" (risата/hype), IT+EN + emote comuni.
const RE_REAZIONE = /(ah(a|h){2,}|\bah ?ah\b|\blol\b|\blma?o\b|\blmfao\b|\brofl\b|\bxd\b|kek|\blul\b|pog|poggers|omeg|\bomg\b|\bomfg\b|\bwtf\b|insane|\bgg\b|ggwp|clipp?|sheesh|no ?way|let'?s ?go|lesgo|pazzesc|assurd|incredibil|madonn|nooo+|siii+|daiii+|grandeee|w in chat|\bwww+\b)/i;
function isReaction(text) {
  const t = String(text || '');
  if (!t) return false;
  if (RE_REAZIONE.test(t)) return true;
  const lettere = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (lettere.length >= 4 && lettere === lettere.toUpperCase()) return true;   // TUTTO MAIUSCOLO = urlo
  if ((t.match(/!/g) || []).length >= 3) return true;                          // !!!
  return false;
}

// Soglie derivate dalla sensibilità (1 = prudente, 10 = trigger facile).
function soglie(sens) {
  return {
    minUnique: Math.max(2, Math.round(8 - sens * 0.6)),   // quante persone diverse devono reagire
    minSpike: Math.max(1.5, 3.4 - sens * 0.19),           // quanto sopra il normale (×)
    minBurst: Math.max(3, Math.round(9 - sens * 0.6)),    // messaggi minimi nel picco
    minReaz: Math.max(3, Math.round(8 - sens * 0.5)),     // reazioni per scattare "a risate"
  };
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const ANNUNCI = ['Momento da clip! 🎬', 'Questo lo salvo! 🎬', 'Clip salvata, roba epica 🔥', 'Ci faccio una clip! 🎬'];

export class ClipEngine {
  constructor({ helix, say }) {
    this.helix = helix;
    this.say = say;              // say(channel, text): manda un messaggio in chat
    this._inCorso = new Set();   // canali con una clip automatica già "in volo"
    this._buf = new Map();       // channel → [{ ts, user, reaz }]  (ritmo recente in memoria)
    this._boost = new Map();     // channel → { ts, tipo, chi, forza }  (evento recente)
  }

  // Crea una clip sul canale e la registra nel DB. Ritorna l'URL o null.
  async createClip(channel, reason = '') {
    try {
      const clip = await this.helix.createClip(channel);
      if (!clip) return null;
      clips.log(channel, clip.id, clip.url, reason);
      log.info(`clip su #${channel}: ${clip.url} (${reason})`);
      return clip.url;
    } catch (e) {
      log.error(`createClip #${channel}:`, e?.message || e);
      return null;
    }
  }

  // Sensibilità del canale (1–10). Retrocompatibile con la vecchia "soglia" in
  // messaggi/minuto: soglia bassa ≈ sensibilità alta.
  _sensibilita(settings) {
    const s = settings || {};
    if (typeof s.clipAutoSensibilita === 'number') return clamp(s.clipAutoSensibilita, 1, 10);
    if (typeof s.clipAutoSoglia === 'number') return clamp(Math.round(11 - s.clipAutoSoglia / 5), 1, 10);
    return 5;
  }

  _boostAttivo(channel, ora) {
    const b = this._boost.get(channel);
    return (b && ora - b.ts <= BOOST_TTL) ? b : null;
  }

  // Prova a creare una clip rispettando "in corso" e pausa minima. `minGap` = ms.
  _clippa(channel, reason, minGap) {
    if (this._inCorso.has(channel)) return;
    if (Date.now() - clips.lastTs(channel) <= minGap) return;
    this._inCorso.add(channel);
    (async () => {
      try {
        const url = await this.createClip(channel, reason);
        if (url) this.say(channel, scegli(ANNUNCI) + ' ' + url);
      } catch (e) {
        log.error(`clip automatica #${channel}:`, e?.message || e);
      } finally {
        this._inCorso.delete(channel);
      }
    })();
  }

  // Rilevatore di hype: chiamato a OGNI messaggio → resta leggero (buffer in
  // memoria, niente query). `msg` = { channel, user, text, isSelf }.
  onActivity(msg) {
    if (!msg || !msg.channel) return;
    const channel = msg.channel;
    const streamer = streamers.get(channel);
    if (!streamer || streamer.settings.clipAuto === false) return;   // funzione spenta

    const ora = Date.now();
    let buf = this._buf.get(channel);
    if (!buf) { buf = []; this._buf.set(channel, buf); }
    buf.push({ ts: ora, user: String(msg.user || '').toLowerCase(), reaz: isReaction(msg.text) ? 1 : 0 });
    const cutoff = ora - BASELINE;
    while (buf.length && buf[0].ts < cutoff) buf.shift();
    if (buf.length > MAX_BUF) buf.splice(0, buf.length - MAX_BUF);

    if (this._inCorso.has(channel)) return;

    const boost = this._boostAttivo(channel, ora);
    const minGap = boost && boost.forza >= 2 ? PAUSA_RAPIDA : PAUSA_BASE;
    if (ora - clips.lastTs(channel) <= minGap) return;               // clippato da poco

    // misura il PICCO (ultimi BURST) e la BASELINE (il periodo prima)
    const inizioBurst = ora - BURST;
    let burst = 0, reaz = 0, base = 0;
    const utenti = new Set();
    for (const e of buf) {
      if (e.ts >= inizioBurst) {
        burst++; if (e.reaz) reaz++;
        if (e.user && !e.user.startsWith('[')) utenti.add(e.user);
      } else base++;
    }
    const attesi = base * (BURST / (BASELINE - BURST));             // msg attesi nel burst a ritmo normale
    const spike = burst / Math.max(attesi, 1);
    const unici = utenti.size;

    const th = soglie(this._sensibilita(streamer.settings));
    // con un evento "caldo" bastano meno gente e un picco più modesto
    const minBurst = boost ? Math.max(3, th.minBurst - 3) : th.minBurst;
    const minUnique = boost ? Math.max(2, th.minUnique - 2) : th.minUnique;

    if (burst < minBurst || unici < minUnique) return;

    let motivo = null;
    if (boost) motivo = boost.tipo === 'raid' ? `raid di ${boost.chi}` : boost.tipo === 'bits' ? 'valanga di bit' : 'nuovo sub';
    else if (reaz >= th.minReaz) motivo = 'la chat esplode di reazioni';
    else if (spike >= th.minSpike) motivo = 'la chat è impazzita all’improvviso';
    if (!motivo) return;

    this._clippa(channel, `momento hype: ${motivo}`, minGap);
  }

  // Segnali dagli EVENTI Twitch (sub/bit/raid): scaldano il canale per qualche
  // secondo (abbassano le soglie della chat) e, se molto forti, clippano subito.
  onEvent(ev) {
    try {
      const type = ev?.type || '';
      const channel = ev?.channel;
      if (!channel) return;
      const streamer = streamers.get(channel);
      if (!streamer || streamer.settings.clipAuto === false) return;
      const d = ev.data || {};
      let tipo = null, chi = '', forza = 0;
      if (type === 'channel.raid') {
        tipo = 'raid'; chi = d.from_broadcaster_user_name || d.from_broadcaster_user_login || 'qualcuno';
        const v = Number(d.viewers) || 0; forza = v >= 20 ? 3 : v >= 5 ? 2 : 1;
      } else if (type === 'channel.subscribe' || type === 'channel.subscription.gift' || type === 'channel.subscription.message') {
        tipo = 'sub'; forza = 1;
      } else if (type === 'channel.cheer') {
        tipo = 'bits'; const b = Number(d.bits) || 0; forza = b >= 1000 ? 3 : b >= 300 ? 2 : 1;
      } else return;

      this._boost.set(channel, { ts: Date.now(), tipo, chi, forza });
      // eventi molto forti (raid grosso, bomba di bit): clippa subito
      if (forza >= 3) {
        const motivo = tipo === 'raid' ? `raid di ${chi}` : 'valanga di bit';
        this._clippa(channel, `momento hype: ${motivo}`, PAUSA_RAPIDA);
      }
    } catch (e) {
      log.debug(`clip onEvent #${ev?.channel}:`, e?.message || e);
    }
  }
}
