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
  simboli: false,         // ASCII-art, "zalgo" e muri di simboli/caratteri strani
  lungo: false,           // messaggi troppo lunghi (muri di testo)
  lungoMax: 350,          // oltre quanti caratteri scatta "troppo lungo"
  emoji: false,           // raffiche di emoji
  emojiMax: 8,            // quante emoji al massimo in un messaggio
  timeoutRecidivi: true,  // timeout crescente a chi insiste
  avvisa: true,           // avvisa in chat quando elimina
};

const RANK = { tutti: 0, sub: 1, vip: 2, mod: 3 };

// -------------------------------------------------------- i link
//
// Un link si guarda per quello che è: un HOST e un PERCORSO. Guardare il
// messaggio invece del link lasciava passare tutto — bastava nominare da
// qualche parte un dominio permesso («niente a che vedere con andryxify.it»),
// o metterne uno permesso prima di quello vero, e il filtro si spegneva. Anche
// «clips.twitch.tv-truffa.com» passava, perché il messaggio conteneva
// «clips.twitch.tv» come pezzo di un altro dominio.
//
// E i link si guardano TUTTI. Prima si guardava solo il primo: un link buono
// all'inizio faceva passare quello cattivo dopo.

// TLD che accettiamo anche in un dominio NUDO (senza schema, senza «www.» e
// senza percorso). Gli altri li accettiamo solo se il link si dichiara come
// tale, perché in chat italiana il punto si scrive attaccato: «lascia stare.io
// ci provo» non è un indirizzo, è la parola dopo il punto. Misurato su frasi
// di chat vere: con la lista intera aperta ai domini nudi, dieci messaggi
// normali su quindici finivano cancellati.
const TLD_NUDI = 'com|net|org|tv|gg|xyz|tk|ml|ga|ly';
const TLD = `${TLD_NUDI}|it|io|me|co|be|us|to|link|live|shop|online|store|info|app|club|dev|site|fun|top|vip|win|bet|cam`;
// Al massimo otto pezzi prima del dominio: nessun indirizzo vero ne ha di piu',
// e senza tetto una riga fatta apposta di «a.a.a.a.…» fa lavorare il motore
// molto piu' del necessario per ogni messaggio che arriva.
const ETICHETTE = '(?:[a-z0-9][a-z0-9-]{0,62}\\.){1,8}';
const RE_LINK = new RegExp(
  '(?:https?://|www\\.)[^\\s]+'                    // dichiarato: schema o «www.»
  + `|\\b${ETICHETTE}(?:${TLD})/[^\\s]*`            // dominio con un percorso
  + `|\\b${ETICHETTE}(?:${TLD_NUDI})\\b`,           // dominio nudo, solo i TLD non ambigui
  'gi');

// Tutti i link di un messaggio, come li ha scritti chi scrive.
export function linkDi(testo) {
  return String(testo || '').match(RE_LINK) || [];
}

// L'host di un indirizzo: senza schema, senza credenziali, senza porta, senza
// percorso, senza «www.». Stringa vuota se non è un host.
export function hostDi(link) {
  let t = String(link || '').trim().toLowerCase();
  t = t.replace(/^https?:\/\//, '');
  t = t.replace(/^[^/?#]*@/, '');                    // utente:password@host
  t = t.split(/[/?#\\]/)[0].split(':')[0];
  t = t.replace(/^www\./, '').replace(/\.$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(t) ? t : '';
}

// Il percorso, senza lo slash iniziale e senza query.
export function percorsoDi(link) {
  const t = String(link || '').replace(/^https?:\/\//, '').replace(/^[^/?#]*@/, '');
  const i = t.search(/[/?#\\]/);
  if (i === -1 || t[i] !== '/') return '';
  return t.slice(i + 1).split(/[?#]/)[0].toLowerCase().replace(/\/$/, '');
}

// Un permesso è «dominio» oppure «dominio/inizio-del-percorso». Il dominio vale
// anche per i suoi sottodomini (clips.twitch.tv sotto twitch.tv), MAI per un
// dominio che se lo porta dentro come pezzo di nome (twitch.tv-truffa.com).
export function linkPermesso(link, permessi) {
  const h = hostDi(link);
  if (!h) return false;
  const p = percorsoDi(link);
  for (const voce of permessi) {
    const v = String(voce || '').toLowerCase().trim();
    if (!v) continue;
    const taglio = v.indexOf('/');
    const dom = taglio === -1 ? v : v.slice(0, taglio);
    const via = taglio === -1 ? '' : v.slice(taglio + 1).replace(/\/$/, '');
    if (!dom || (h !== dom && !h.endsWith('.' + dom))) continue;
    if (!via) return true;
    if (p === via || p.startsWith(via + '/')) return true;
  }
  return false;
}

// domini permessi "di base": il canale stesso, le clip e il sito
function whitelistBase(channel, cfg) {
  const l = String(channel || '').toLowerCase();
  const extra = (Array.isArray(cfg.whitelist) ? cfg.whitelist : [])
    .map((d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').trim())
    .filter(Boolean);
  return ['twitch.tv/' + l, 'clips.twitch.tv', 'andryxify.it', ...extra];
}

function haLinkNonPermesso(testo, channel, cfg) {
  const permessi = whitelistBase(channel, cfg);
  for (const l of linkDi(testo)) if (!linkPermesso(l, permessi)) return true;
  return false;
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

// ASCII-art, "zalgo" (testo pieno di segni combinanti), muri di caratteri o
// messaggi fatti quasi solo di simboli. Le frasi corte sono lasciate stare.
function troppiSimboli(testo) {
  const t = String(testo || '');
  if (t.length < 8) return false;
  const combinanti = (t.match(/\p{M}/gu) || []).length;
  if (combinanti >= 8) return true;                              // zalgo
  if (t.split(/\s+/).some((w) => w.length >= 40)) return true;   // muro di caratteri / link offuscato
  const strani = (t.match(/[^\p{L}\p{N}\s.,!?'"()@#%$€:;/_\-]/gu) || []).length;
  return strani >= 6 && strani / t.length >= 0.5;
}

// quante emoji vere ci sono (per la raffica di emoji)
function contaEmoji(testo) {
  return (String(testo || '').match(/\p{Extended_Pictographic}/gu) || []).length;
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
  // ASCII-art / zalgo / muri di simboli
  if (cfg.simboli && troppiSimboli(testo)) return { motivo: 'troppi simboli / caratteri strani' };
  // muro di testo troppo lungo
  if (cfg.lungo && testo.length > (Number(cfg.lungoMax) || 350)) return { motivo: 'messaggio troppo lungo' };
  // raffica di emoji
  if (cfg.emoji && contaEmoji(testo) > (Number(cfg.emojiMax) || 8)) return { motivo: 'troppe emoji' };

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
