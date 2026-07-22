// Import citazioni da un link (best-effort). Serve per chi tiene le proprie
// quotes su una pagina esterna. Estrae frasi "citazione-simili" dall'HTML e le
// propone in anteprima: è lo streamer a curarle prima di salvarle, quindi va
// bene anche qualche candidato di troppo. Difesa anti-SSRF: mai verso l'interno.
import dns from 'node:dns/promises';
import { makeLog } from '../logger.js';

const log = makeLog('import');

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;   // non scarichiamo pagine enormi
const UA = 'Mozilla/5.0 (compatible; SocialBot/1.0; +https://bot.andryxify.it)';

// true se l'IP è privato/loopback/link-local/riservato → da bloccare
function ipPrivato(ip) {
  const s = String(ip || '');
  if (s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80')) return true;
  const p = s.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return s.includes(':') ? true : true; // formato strano → blocca
  const [a, b] = p;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;   // CGNAT 100.64/10
  if (a >= 224) return true;                            // multicast/riservato
  return false;
}

async function fetchSicuro(url) {
  let u;
  try { u = new URL(url); } catch { throw new Error('link non valido'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('solo link http/https');
  // risolvi l'host e blocca gli IP privati (anti-SSRF)
  let indirizzi = [];
  try { indirizzi = await dns.lookup(u.hostname, { all: true }); }
  catch { throw new Error('host non raggiungibile'); }
  if (!indirizzi.length || indirizzi.some((a) => ipPrivato(a.address))) throw new Error('host non consentito');

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u.href, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'text/html,application/json,text/plain,*/*' } });
    if (!r.ok) throw new Error('la pagina ha risposto ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.subarray(0, MAX_BYTES).toString('utf8');
  } finally { clearTimeout(to); }
}

// decodifica le entità HTML più comuni
const deent = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(+d); } catch { return ''; } });

function pulisci(t) {
  return deent(t).replace(/\s+/g, ' ').replace(/^[“"'«\s]+|[”"'»\s]+$/g, '').trim();
}

// una riga "sembra una citazione"? né troppo corta né spazzatura di navigazione
function pareCitazione(t) {
  if (t.length < 6 || t.length > 300) return false;
  if (/^https?:\/\//i.test(t)) return false;                 // solo un link
  if (!/[a-zà-ÿ]/i.test(t)) return false;                     // niente lettere
  if (t.split(/\s+/).length < 2) return false;                // parola singola
  const simboli = (t.match(/[^\w\sà-ÿ.,!?'"()«»“”…-]/gi) || []).length;
  if (simboli > t.length * 0.25) return false;                // troppa fuffa
  return true;
}

// Estrae candidati citazione da un testo (HTML/JSON/plain). Pura e testabile.
export function estraiDaTesto(testo) {
  const candidati = new Set();

  // 1) se è JSON, raccogli le stringhe (spesso le quote stanno in un array)
  const trimmed = String(testo || '').trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const raccogli = (v) => {
        if (typeof v === 'string') { const t = pulisci(v); if (pareCitazione(t)) candidati.add(t); }
        else if (Array.isArray(v)) v.forEach(raccogli);
        else if (v && typeof v === 'object') Object.values(v).forEach(raccogli);
      };
      raccogli(JSON.parse(trimmed));
    } catch { /* non era JSON pulito */ }
  }

  // via PRIMA di tutto script e style: le loro stringhe non sono citazioni
  const senzaCodice = String(testo).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');

  // 2) frasi tra virgolette (“…” "…" «…»)
  for (const m of senzaCodice.matchAll(/[“"«]([^“”"«»]{6,300})[”"»]/g)) {
    const t = pulisci(m[1]); if (pareCitazione(t)) candidati.add(t);
  }

  // 3) testo dei blocchi (li, blockquote, p): togli i tag e spezza per blocco
  const soloTesto = senzaCodice
    .replace(/<\/(li|p|blockquote|div|h[1-6]|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  for (const riga of soloTesto.split('\n')) {
    const t = pulisci(riga); if (pareCitazione(t)) candidati.add(t);
  }

  return [...candidati].slice(0, 300);
}

// Estrae candidati citazione da un URL. Ritorna { ok, citazioni } o { ok:false, errore }.
export async function estrai(url) {
  try {
    const testo = await fetchSicuro(url);
    return { ok: true, citazioni: estraiDaTesto(testo) };
  } catch (e) {
    log.debug('estrai:', e?.message || e);
    return { ok: false, errore: e?.message || 'import non riuscito' };
  }
}
