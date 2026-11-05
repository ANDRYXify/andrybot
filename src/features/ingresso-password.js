// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PASSWORD di chi si registra con la mail (docs/ACCESSO-SICURO.md, passo 4).
// Facoltativa: da 8 a 128 caratteri, nessuna regola su maiuscole e simboli (le
// propone e le salva il portachiavi). Si conserva solo il suo calco scrypt, con
// un sale suo, nella forma `scrypt:N:r:p:<sale>:<calco>`; la stringa poi va
// nella busta (CAMPI_SEGRETI). Si confronta a tempo costante.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

// asincrono: un calco costa qualche decina di millisecondi, e non deve fermare il server
const scrypt = promisify(crypto.scrypt);

export const MIN = 8;
export const MAX = 128;
const N = 2 ** 15, R = 8, P = 1, LUNGO = 64;
const MEM = 64 * 1024 * 1024;

// In caratteri veri (un'emoji vale uno), non in byte.
export const lunghezzaOk = (s) => typeof s === 'string' && [...s].length >= MIN && [...s].length <= MAX;

export async function calco(parola) {
  if (!lunghezzaOk(parola)) throw new Error('password fuori misura');
  const sale = crypto.randomBytes(16);
  const h = await scrypt(String(parola).normalize('NFC'), sale, LUNGO, { N, r: R, p: P, maxmem: MEM });
  return `scrypt:${N}:${R}:${P}:${sale.toString('base64url')}:${h.toString('base64url')}`;
}

export const eCalco = (v) => /^scrypt:\d+:\d+:\d+:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{86}$/.test(String(v || ''));

export async function combacia(parola, salvato) {
  if (!eCalco(salvato) || typeof parola !== 'string' || [...parola].length > MAX) return false;
  const [, n, r, p, sale, atteso] = String(salvato).split(':');
  const a = Buffer.from(atteso, 'base64url');
  const h = await scrypt(parola.normalize('NFC'), Buffer.from(sale, 'base64url'), a.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: MEM });
  return h.length === a.length && crypto.timingSafeEqual(h, a);
}
