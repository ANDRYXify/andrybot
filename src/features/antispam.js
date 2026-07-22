// Antispam: elimina i messaggi di spam (link di altri canali, copypasta,
// TUTTO MAIUSCOLO, valanghe di menzioni, flood) e, ai recidivi, dà un timeout
// crescente. Mod e broadcaster sono SEMPRE esenti; VIP/sub secondo le regole.
// Tutto procedurale: nessuna IA, solo euristiche veloci. Non deve MAI bloccare
// il flusso dei messaggi né lanciare: ogni cosa è in try/catch a monte.
import { makeLog } from '../logger.js';
import { streamers } from '../db.js';

const log = makeLog('antispam');

// -------------------------------------------------------- config di default
export const ANTISPAM_DEFAULT = {
  attivo: false,          // acceso? (serve il permesso Twitch: si accende dalla dashboard)
  link: true,             // blocca i link di chi non è autorizzato
  linkTier: 'sub',        // chi PUÒ postare link: 'tutti' | 'sub' | 'vip' | 'mod'
  whitelist: [],          // domini sempre permessi (oltre a quelli del canale)
  ripetizioni: true,      // copypasta / stesso messaggio ripetuto
  maiuscole: true,        // messaggi TUTTI MAIUSCOLI
  menzioni: true,         // troppe @menzioni in un colpo
  flood: true,            // troppi messaggi in pochi secondi
  timeoutRecidivi: true,  // timeout crescente a chi insiste
  avvisa: true,           // avvisa in chat quando elimina
};

const RANK = { tutti: 0, sub: 1, vip: 2, mod: 3 };

// -------------------------------------------------------- rilevatori
// URL o dominio "nudo" (es. twitch.tv/tizio, discord.gg/xyz, sito.com)
const TLD = 'com|net|org|it|tv|gg|io|me|co|xyz|link|live|shop|online|store|info|app|club|tk|ml|ga|ly|to|be|us|dev|site|fun|top|vip|win|bet|cam';
const RE_URL = new RegExp(`(https?:\\/\\/|www\\.|\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:${TLD})\\b(?:\\/[^\\s]*)?)`, 'i');

// domini permessi "di base": il canale stesso, le clip e il sito
function whitelistBase(channel, cfg) {
  const l = String(channel || '').toLowerCase();
  const extra = (Array.isArray(cfg.whitelist) ? cfg.whitelist : [])
    .map((d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').trim())
    .filter(Boolean);
  return ['twitch.tv/' + l, 'clips.twitch.tv', 'andryxify.it', ...extra];
}

function haLinkNonPermesso(testo, channel, cfg) {
  const m = RE_URL.exec(testo);
  if (!m) return false;
  const t = testo.toLowerCase();
  for (const dom of whitelistBase(channel, cfg)) if (dom && t.includes(dom)) return false; // link permesso
  return true;
}

const tierUtente = (msg) => (msg.isBroadcaster || msg.isMod) ? 3 : msg.isVip ? 2 : msg.isSub ? 1 : 0;

function troppeMaiuscole(testo) {
  const lettere = testo.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (lettere.length < 12) return false;                 // frasi corte: lasciamo stare
  const maiusc = (testo.match(/[A-ZÀ-Þ]/g) || []).length;
  return maiusc / lettere.length >= 0.8;
}

function troppeMenzioni(testo) {
  return (testo.match(/@[a-z0-9_]{2,}/gi) || []).length >= 4;
}

// -------------------------------------------------------- stato volatile
// per rilevare flood e ripetizioni servono gli ultimi messaggi per utente
const recenti = new Map();    // 'canale|user' → [{ testo, ts }]
const reati = new Map();      // 'canale|user' → { n, ts }  (recidività, con decadimento)
const FIN_FLOOD = 8_000;      // finestra flood
const MAX_FLOOD = 6;          // oltre N messaggi in FIN_FLOOD = flood
const FIN_RIPET = 40_000;     // finestra per "stesso messaggio"
const DECADE_REATI = 10 * 60_000;  // dopo 10 min senza reati, si riparte da capo
let ultimaPulizia = 0;

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function registraMessaggio(chiave, testo) {
  const ora = Date.now();
  const lista = (recenti.get(chiave) || []).filter((r) => ora - r.ts < FIN_RIPET);
  lista.push({ testo: norm(testo), ts: ora });
  recenti.set(chiave, lista);
  return lista;
}

function pulisci() {
  const ora = Date.now();
  if (ora - ultimaPulizia < 60_000) return;
  ultimaPulizia = ora;
  for (const [k, lista] of recenti) {
    const v = lista.filter((r) => ora - r.ts < FIN_RIPET);
    if (v.length) recenti.set(k, v); else recenti.delete(k);
  }
  for (const [k, r] of reati) if (ora - r.ts > DECADE_REATI) reati.delete(k);
}

// -------------------------------------------------------- valutazione
// Ritorna null (ok) oppure { motivo } se il messaggio è spam.
export function valuta(msg, cfg) {
  const testo = String(msg.text || '');
  if (!testo) return null;

  // esenzioni: mod e broadcaster sempre; VIP esenti da tutto (fidati)
  if (msg.isBroadcaster || msg.isMod || msg.isVip) return null;

  const chiave = msg.channel + '|' + msg.user;
  const lista = registraMessaggio(chiave, testo);

  // link non autorizzati (in base al tier consentito)
  if (cfg.link && tierUtente(msg) < (RANK[cfg.linkTier] ?? 1) && haLinkNonPermesso(testo, msg.channel, cfg)) {
    return { motivo: 'link non consentito' };
  }
  // copypasta / stesso messaggio ripetuto da poco
  if (cfg.ripetizioni) {
    const n = norm(testo);
    if (n.length >= 6 && lista.filter((r) => r.testo === n).length >= 3) return { motivo: 'messaggio ripetuto (spam)' };
  }
  // flood: troppi messaggi in pochi secondi
  if (cfg.flood) {
    const ora = Date.now();
    if (lista.filter((r) => ora - r.ts < FIN_FLOOD).length >= MAX_FLOOD) return { motivo: 'flood (troppi messaggi)' };
  }
  // TUTTO MAIUSCOLO
  if (cfg.maiuscole && troppeMaiuscole(testo)) return { motivo: 'troppe maiuscole' };
  // valanga di menzioni
  if (cfg.menzioni && troppeMenzioni(testo)) return { motivo: 'troppe menzioni' };

  return null;
}

// timeout crescente per i recidivi: 1º reato solo cancellazione, poi 60s, 5m, 10m
function durataTimeout(chiave, cfg) {
  const ora = Date.now();
  const r = reati.get(chiave);
  const n = (r && ora - r.ts < DECADE_REATI) ? r.n + 1 : 1;
  reati.set(chiave, { n, ts: ora });
  if (!cfg.timeoutRecidivi) return 0;
  return [0, 0, 60, 300, 600][Math.min(n, 4)];   // n=1 → 0 (solo delete), poi cresce
}

// -------------------------------------------------------- azione completa
// Valuta il messaggio e, se è spam, lo elimina (e timeout ai recidivi).
// Ritorna true se ha agito. Non lancia mai.
export async function tryAntispam(helix, msg, say) {
  try {
    if (!msg || msg.isSelf || !msg.id) return false;
    const cfg = { ...ANTISPAM_DEFAULT, ...(streamers.get(msg.channel)?.settings?.antispam || {}) };
    if (!cfg.attivo) return false;

    if (Date.now() - ultimaPulizia > 60_000) pulisci();

    const esito = valuta(msg, cfg);
    if (!esito) return false;

    // elimina il messaggio
    await helix.deleteMessage(msg.channel, msg.id).catch(() => {});
    // timeout crescente ai recidivi
    const durata = durataTimeout(msg.channel + '|' + msg.user, cfg);
    if (durata > 0 && msg.userId) {
      await helix.timeoutUser(msg.channel, msg.userId, durata, 'antispam: ' + esito.motivo).catch(() => {});
    }
    if (cfg.avvisa && typeof say === 'function') {
      const nome = msg.display || msg.user;
      say(durata > 0
        ? `@${nome} niente spam qui 🚫 (${esito.motivo}) — pausa di ${durata >= 60 ? Math.round(durata / 60) + ' min' : durata + 's'}`
        : `@${nome} occhio: ${esito.motivo} 🚫 (messaggio rimosso)`);
    }
    log.info(`#${msg.channel} antispam: rimosso a ${msg.user} (${esito.motivo})${durata ? ` +timeout ${durata}s` : ''}`);
    return true;
  } catch (e) { log.error('tryAntispam:', e?.message || e); return false; }
}
