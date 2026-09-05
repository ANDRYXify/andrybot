// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// I SEGRETI A RIPOSO. Il criterio, e il perche' di ogni pezzo, stanno in
// docs/SEGRETI.md. Qui c'e' il meccanismo.
//
// Un database o un backup rubato dev'essere INUTILE senza il segreto del
// server. E se una chiave trapela, deve valere per UNA COSA SOLA.
//
// LA BUSTA (formato v2)
//   enc:2:<kid>:<chiave-avvolta>:<iv>:<tag>:<testo>
//
// Ogni valore ha una chiave sua, casuale, usata per quel valore e per
// nient'altro. Quella chiave non si conserva in chiaro: e' chiusa in una
// seconda busta con la chiave maestra. Due giri, uno dentro l'altro — e la
// maestra non tocca mai il testo del segreto. Rompere una busta non apre le
// altre: e' il motivo per cui la chiave e' per valore e non per tutti.
//
// DOVE ABITA
//   La busta e' legata al suo posto (tabella, colonna, riga) come dato
//   autenticato. Una busta spostata da una riga all'altra non si apre. Senza
//   questo, chi puo' scrivere nel database si copia il token di un altro nella
//   propria riga e diventa lui, senza rompere nessuna cifratura.
//
// L'ANELLO
//   Le chiavi maestre hanno un numero (`kid`) e si ricavano dal segreto del
//   server piu' quel numero. La piu' recente cifra; le precedenti aprono solo
//   quello che avevano chiuso. Ruotare = alzare il numero.
//
// COSA NON FA
//   Non lancia mai. Una decifratura fallita torna stringa vuota: il chiamante
//   la tratta come «segreto mancante» e rifa' login/refresh. Un bot che cade
//   per colpa della cifratura sarebbe un modo elegante di spegnere il servizio.
import crypto from 'node:crypto';
import { config } from './config.js';

const SEGRETO = String(config.sessionSecret || '');
const ATTIVA = SEGRETO.length >= 16;

// Il numero dell'anello con cui si CIFRA adesso. Le chiavi precedenti restano
// buone in lettura. Si alza da .env quando si vuole voltare pagina.
const KID = Math.max(1, Math.min(999, parseInt(process.env.SEGRETI_KID || '1', 10) || 1));

const PREF1 = 'enc:1:';
const PREF2 = 'enc:2:';

// Le maestre si ricavano, non si conservano: una per numero d'anello. `info`
// diverso da quello che firma le sessioni, cosi' le due chiavi non coincidono
// mai nemmeno per sbaglio.
const _maestre = new Map();
function maestra(kid) {
  if (!ATTIVA) return null;
  if (!_maestre.has(kid)) {
    _maestre.set(kid, Buffer.from(crypto.hkdfSync(
      'sha256', Buffer.from(SEGRETO, 'utf8'), Buffer.alloc(0),
      Buffer.from('andrybot:segreti:maestra:v2:' + kid), 32)));
  }
  return _maestre.get(kid);
}

// La chiave del formato vecchio, che serve ancora ad aprire quello che c'e' gia'.
const CHIAVE_V1 = ATTIVA
  ? Buffer.from(crypto.hkdfSync('sha256', Buffer.from(SEGRETO, 'utf8'), Buffer.alloc(0), Buffer.from('andrybot:token-at-rest:v1'), 32))
  : null;

export function eCifrato(v) {
  return typeof v === 'string' && (v.startsWith(PREF2) || v.startsWith(PREF1));
}

// Il posto in cui la busta abita, in una forma stabile. Se cambia il posto,
// cambia il conto: la busta non si apre.
function posto(dove) {
  if (!dove) return 'senza-posto';
  if (typeof dove === 'string') return dove;
  return [dove.tabella || '', dove.colonna || '', dove.riga == null ? '' : String(dove.riga)].join('|');
}

export function cifra(testo, dove) {
  const s = String(testo == null ? '' : testo);
  if (!s || !ATTIVA || eCifrato(s)) return s;
  const chiave = crypto.randomBytes(32);              // la chiave DI QUESTO valore
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chiave, iv);
  c.setAAD(Buffer.from(posto(dove), 'utf8'));
  const ct = Buffer.concat([c.update(s, 'utf8'), c.final()]);

  // la chiave del valore, chiusa a sua volta
  const ivk = crypto.randomBytes(12);
  const w = crypto.createCipheriv('aes-256-gcm', maestra(KID), ivk);
  w.setAAD(Buffer.from('chiave|' + posto(dove), 'utf8'));
  const wrapped = Buffer.concat([ivk, w.update(chiave), w.final(), w.getAuthTag()]);

  return PREF2 + KID + ':' + wrapped.toString('base64url') + ':'
    + iv.toString('base64url') + ':' + c.getAuthTag().toString('base64url') + ':'
    + ct.toString('base64url');
}

function apriV1(s) {
  try {
    const p = s.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', CHIAVE_V1, Buffer.from(p[2], 'base64url'));
    d.setAuthTag(Buffer.from(p[3], 'base64url'));
    return Buffer.concat([d.update(Buffer.from(p[4], 'base64url')), d.final()]).toString('utf8');
  } catch { return ''; }
}

export function decifra(v, dove) {
  const s = String(v == null ? '' : v);
  if (!eCifrato(s)) return s;
  if (!ATTIVA) return '';
  if (s.startsWith(PREF1)) return apriV1(s);
  try {
    const p = s.split(':');
    const kid = parseInt(p[2], 10);
    const m = maestra(kid);
    if (!m) return '';
    const wrapped = Buffer.from(p[3], 'base64url');
    const ivk = wrapped.subarray(0, 12);
    const tagk = wrapped.subarray(wrapped.length - 16);
    const ck = wrapped.subarray(12, wrapped.length - 16);
    const dw = crypto.createDecipheriv('aes-256-gcm', m, ivk);
    dw.setAAD(Buffer.from('chiave|' + posto(dove), 'utf8'));
    dw.setAuthTag(tagk);
    const chiave = Buffer.concat([dw.update(ck), dw.final()]);

    const d = crypto.createDecipheriv('aes-256-gcm', chiave, Buffer.from(p[4], 'base64url'));
    d.setAAD(Buffer.from(posto(dove), 'utf8'));
    d.setAuthTag(Buffer.from(p[5], 'base64url'));
    return Buffer.concat([d.update(Buffer.from(p[6], 'base64url')), d.final()]).toString('utf8');
  } catch { return ''; }
}

// Il numero d'anello di una busta, o 0 se non e' una busta v2. Serve a chi
// riavvolge: si riscrivono solo quelle rimaste indietro.
export function anello(v) {
  const s = String(v == null ? '' : v);
  if (!s.startsWith(PREF2)) return 0;
  const n = parseInt(s.split(':')[2], 10);
  return Number.isFinite(n) ? n : 0;
}

export const anelloCorrente = KID;

// --------------------------------------------------------------- impronte
//
// Di una chiave API non si conserva la chiave: si conserva l'impronta. Chi ruba
// il database trova impronte, e con quelle non entra. Il confronto e' a tempo
// costante: sennò si indovina una lettera per volta guardando quanto ci mette.

export function impronta(valore, sale = '') {
  const s = String(valore == null ? '' : valore);
  if (!s) return '';
  return 'imp:1:' + crypto.createHash('sha256')
    .update(String(sale) + '|' + s + '|' + SEGRETO).digest('base64url');
}

export function eImpronta(v) { return typeof v === 'string' && v.startsWith('imp:1:'); }

export function combacia(valore, attesa, sale = '') {
  if (!attesa) return false;
  const a = Buffer.from(impronta(valore, sale));
  const b = Buffer.from(String(attesa));
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

// ------------------------------------------------------------------ file
//
// La stessa busta, applicata a dei byte invece che a una stringa: serve ai
// backup. Un backup e' una copia del database, quindi vale il database — e
// finora era in chiaro. Formato binario, per non gonfiare il file di un terzo
// passando da base64:
//   "SBK1" | kid (2 byte) | chiave avvolta (60) | iv (12) | tag (16) | testo
const MAGIA = Buffer.from('SBK1', 'ascii');

export function cifraBytes(buf, dove) {
  if (!ATTIVA) return null;
  const chiave = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chiave, iv);
  c.setAAD(Buffer.from(posto(dove), 'utf8'));
  const ct = Buffer.concat([c.update(buf), c.final()]);

  const ivk = crypto.randomBytes(12);
  const w = crypto.createCipheriv('aes-256-gcm', maestra(KID), ivk);
  w.setAAD(Buffer.from('chiave|' + posto(dove), 'utf8'));
  const wrapped = Buffer.concat([ivk, w.update(chiave), w.final(), w.getAuthTag()]);   // 12+32+16 = 60

  const testa = Buffer.alloc(2);
  testa.writeUInt16BE(KID);
  return Buffer.concat([MAGIA, testa, wrapped, iv, c.getAuthTag(), ct]);
}

export function eBytesCifrati(buf) {
  return Buffer.isBuffer(buf) && buf.length > MAGIA.length && buf.subarray(0, 4).equals(MAGIA);
}

export function decifraBytes(buf, dove) {
  if (!ATTIVA || !eBytesCifrati(buf)) return null;
  try {
    const kid = buf.readUInt16BE(4);
    const m = maestra(kid);
    if (!m) return null;
    const wrapped = buf.subarray(6, 66);
    const dw = crypto.createDecipheriv('aes-256-gcm', m, wrapped.subarray(0, 12));
    dw.setAAD(Buffer.from('chiave|' + posto(dove), 'utf8'));
    dw.setAuthTag(wrapped.subarray(44, 60));
    const chiave = Buffer.concat([dw.update(wrapped.subarray(12, 44)), dw.final()]);

    const d = crypto.createDecipheriv('aes-256-gcm', chiave, buf.subarray(66, 78));
    d.setAAD(Buffer.from(posto(dove), 'utf8'));
    d.setAuthTag(buf.subarray(78, 94));
    return Buffer.concat([d.update(buf.subarray(94)), d.final()]);
  } catch { return null; }
}
