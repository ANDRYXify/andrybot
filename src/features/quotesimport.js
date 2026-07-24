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

// Frammenti tipici del "guscio" di x.la (Rainmaker/Xsolla) quando il JavaScript
// non è ancora girato: NON sono citazioni. Se l'utente incolla la pagina prima
// che il JS disegni le frasi (o ne copia la sorgente), vede solo questi.
const FRASI_GUSCIO = [
  'please enable javascript', 'enable javascript', 'xsolla partner network',
  'shortcut icon', 'this site can', 'connection was reset', 'err_connection',
];
const eGuscio = (t) => { const s = String(t || '').toLowerCase(); return FRASI_GUSCIO.some((f) => s.includes(f)); };

// una riga "sembra una citazione"? né troppo corta né spazzatura di navigazione
function pareCitazione(t) {
  if (t.length < 6 || t.length > 300) return false;
  if (/^https?:\/\//i.test(t)) return false;                 // solo un link
  if (!/[a-zà-ÿ]/i.test(t)) return false;                     // niente lettere
  if (t.split(/\s+/).length < 2) return false;                // parola singola
  if (eGuscio(t)) return false;                               // rumore del guscio senza-JS
  const simboli = (t.match(/[^\w\sà-ÿ.,!?'"()«»“”…-]/gi) || []).length;
  if (simboli > t.length * 0.25) return false;                // troppa fuffa
  return true;
}

// Il testo incollato è (in sostanza) il guscio senza-JavaScript di x.la?
// Serve a spiegare all'utente perché non troviamo quote: ha copiato la pagina
// prima che il JavaScript la disegnasse. Vero solo se NON ci sono quote vere.
export function sembraGuscioJs(testo) {
  const s = String(testo || '');
  if (!eGuscio(s)) return false;
  return estraiConMeta(s).length === 0;
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

// Nome utente pulito: via la @ iniziale, spazi, e i caratteri strani ai bordi.
function pulisciAutore(s) {
  return String(s || '').trim().replace(/^@+/, '').replace(/[^\p{L}\p{N}_.\-]/gu, '').slice(0, 60);
}

// Data x.la (MM.DD.YYYY, formato USA) → ISO YYYY-MM-DD. Se non torna, stringa vuota.
function normalizzaData(s) {
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/.exec(String(s || '').trim());
  if (!m) return '';
  let [, mm, dd, yy] = m;
  mm = +mm; dd = +dd; yy = +yy;
  if (yy < 100) yy += 2000;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// Riga "autore | data" (come su x.la: `UnicornoFacinoroso | 06.09.2024`).
const RE_META = /^\s*(.{1,48}?)\s*[|·•–-]\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s*$/;

// Estrae citazioni CON metadati (autore + data) dal testo incollato — pensato
// per il formato x.la: una riga con la frase, la riga dopo con "autore | data".
// Gestisce anche l'HTML incollato. Ritorna [{ testo, autore, data }].
export function estraiConMeta(testo) {
  let t = String(testo || '');
  if (/<[a-z!][\s\S]*>/i.test(t)) {
    t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(div|p|li|blockquote|h[1-6]|tr)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');
    t = deent(t);
  }
  const righe = t.split(/\r?\n/).map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [];
  const visti = new Set();
  for (let i = 0; i < righe.length; i++) {
    if (RE_META.test(righe[i])) continue;                // riga di meta orfana: la salto
    const q = pulisci(righe[i]);
    if (!pareCitazione(q)) continue;
    const k = q.toLowerCase();
    if (visti.has(k)) continue;
    visti.add(k);
    let autore = '', data = '';
    const m = RE_META.exec(righe[i + 1] || '');           // la riga dopo è "autore | data"?
    if (m) { autore = pulisciAutore(m[1]); data = normalizzaData(m[2]); i++; }
    out.push({ testo: q.slice(0, 400), autore, data });
  }
  return out.slice(0, 800);
}

// Estrae candidati citazione da un URL. Ritorna { ok, citazioni } o { ok:false, errore }.
export async function estrai(url) {
  try {
    const testo = await fetchSicuro(url);
    const citazioni = estraiDaTesto(testo);
    // pagina che disegna tutto con JavaScript (tipo x.la): il fetch vede il guscio
    return { ok: true, citazioni, guscio: !citazioni.length && eGuscio(testo) };
  } catch (e) {
    log.debug('estrai:', e?.message || e);
    return { ok: false, errore: e?.message || 'import non riuscito' };
  }
}
