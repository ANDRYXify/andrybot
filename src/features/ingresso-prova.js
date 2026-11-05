// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PROVA DI LAVORO DELLA PORTA D'INGRESSO (docs/ACCESSO-SICURO.md, «La porta
// d'ingresso»). Niente CAPTCHA e niente servizi di altri: il server da' una
// sfida firmata, il browser trova un numero che la risolve, il server controlla
// e brucia. Una persona non se ne accorge; uno script che prova mille ingressi
// paga mille volte.
//
// La sfida e' `<dati>.<firma>`: i dati (base64url di un JSON) portano un numero
// casuale, la scadenza, la difficolta' e lo scopo; la firma e' un HMAC con una
// chiave che sa solo il server. Finche' la sfida non torna il server non tiene
// niente. Quando torna: forma, firma (a tempo costante), scadenza, scopo, lavoro,
// e solo alla fine si brucia (nello schema: la sfida e' una chiave primaria).
//
// Il lavoro: SHA-256(`<sfida>:<numero>`) deve cominciare con `bit` bit a zero.
// Servono in media 2^bit tentativi. Il browser lo fa con Web Crypto
// (crypto.subtle.digest), che e' asincrono: misurato sul banco (Chromium senza
// testa, scripts di foto dell'accesso), a gruppi da 64 fa circa 19 mila digest
// al secondo; un telefono di fascia media ne fa circa un quarto. Con 11 bit
// (2048 tentativi in media) sono circa un decimo di secondo su un computer e
// qualche centinaio di millisecondi su un telefono. Ogni segnale aggiunge 2 bit:
// quattro volte il lavoro, fino a 64 volte.
import crypto from 'node:crypto';

export const VALIDA_MS = 2 * 60_000;
export const BIT_BASE = 11;
export const BIT_SEGNALE = 2;
export const BIT_MAX_IN_PIU = 6;
export const SCOPI = ['mail', 'password', 'registra', 'aiuto'];

const b64u = (buf) => Buffer.from(buf).toString('base64url');

// I segnali del browser alzano la difficolta', non bloccano mai: un segnale non
// e' una prova. Quelli che manda la pagina, piu' quello che il server vede da se'
// nel nome del browser.
export const SEGNALI = ['webdriver', 'senzaTesta', 'senzaLingue', 'senzaMotore'];
export function bitPer(segni = {}, ua = '') {
  const visti = new Set(SEGNALI.filter((k) => segni && segni[k] === true));
  if (/HeadlessChrome|PhantomJS|Puppeteer|Playwright/i.test(String(ua || ''))) visti.add('senzaTesta');
  return BIT_BASE + Math.min(BIT_MAX_IN_PIU, visti.size * BIT_SEGNALE);
}

const firmaDi = (chiave, dati) => crypto.createHmac('sha256', chiave).update(dati).digest();

export function creaSfida({ chiave, scopo, bit = BIT_BASE, ora = Date.now() }) {
  const scade = ora + VALIDA_MS;
  const dati = b64u(JSON.stringify({ n: b64u(crypto.randomBytes(16)), s: scade, b: bit, p: scopo }));
  return { sfida: dati + '.' + b64u(firmaDi(chiave, dati)), bit, scade };
}

export function zeriIniziali(buf) {
  let n = 0;
  for (const byte of buf) {
    if (byte === 0) { n += 8; continue; }
    return n + Math.clz32(byte) - 24;
  }
  return n;
}

export const lavoroFatto = (sfida, numero, bit) =>
  zeriIniziali(crypto.createHash('sha256').update(`${sfida}:${numero}`).digest()) >= bit;

// Per le prove: la stessa ricerca che fa il browser.
export function risolvi(sfida, bit) {
  for (let i = 0; ; i++) if (lavoroFatto(sfida, String(i), bit)) return String(i);
}

// La verifica, in ordine; `brucia(sfida, scade)` risponde true solo la prima volta.
export function verificaSfida({ sfida, numero, chiave, scopo, brucia, ora = Date.now() }) {
  const s = String(sfida || ''), n = String(numero ?? '');
  const m = /^([A-Za-z0-9_-]{20,400})\.([A-Za-z0-9_-]{43})$/.exec(s);
  if (!m || !/^\d{1,12}$/.test(n)) return { ok: false, motivo: 'forma' };
  const attesa = firmaDi(chiave, m[1]);
  const data = Buffer.from(m[2], 'base64url');
  if (data.length !== attesa.length || !crypto.timingSafeEqual(data, attesa)) return { ok: false, motivo: 'firma' };
  let d;
  try { d = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); } catch { return { ok: false, motivo: 'forma' }; }
  if (!(Number(d.s) > ora)) return { ok: false, motivo: 'scaduta' };
  if (d.p !== scopo) return { ok: false, motivo: 'scopo' };
  if (!Number.isInteger(d.b) || d.b < BIT_BASE || !lavoroFatto(s, n, d.b)) return { ok: false, motivo: 'lavoro' };
  if (!brucia(s, Number(d.s))) return { ok: false, motivo: 'usata' };
  return { ok: true };
}
