// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'APP DEI CODICI (TOTP, RFC 6238), in casa con node:crypto. SHA-1, 6 cifre,
// 30 secondi: e' quello che Google Authenticator, Authy e i portachiavi leggono
// dal QR `otpauth://`. Si accetta un passo prima o dopo, per un orologio un po'
// storto. Il passo accettato lo ricorda la riga del database (ingressoDb.usaPasso):
// qui si dice solo QUALE passo combacia, il «una volta sola» lo dice lo schema.
import crypto from 'node:crypto';

export const PERIODO_S = 30;
export const CIFRE = 6;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(buf) {
  let bit = 0, valore = 0, out = '';
  for (const b of buf) {
    valore = (valore << 8) | b; bit += 8;
    while (bit >= 5) { out += ALFABETO[(valore >>> (bit - 5)) & 31]; bit -= 5; }
  }
  if (bit > 0) out += ALFABETO[(valore << (5 - bit)) & 31];
  return out;
}
export function daBase32(s) {
  const t = String(s || '').toUpperCase().replace(/[\s=-]/g, '');
  let bit = 0, valore = 0; const out = [];
  for (const c of t) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) return null;
    valore = (valore << 5) | i; bit += 5;
    if (bit >= 8) { out.push((valore >>> (bit - 8)) & 255); bit -= 8; }
  }
  return Buffer.from(out);
}

export const nuovoSegreto = () => base32(crypto.randomBytes(20));
export const passoDi = (ora = Date.now()) => Math.floor(ora / 1000 / PERIODO_S);

export function codiceAlPasso(segreto, passo) {
  const chiave = daBase32(segreto);
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(passo));
  const h = crypto.createHmac('sha1', chiave).update(c).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** CIFRE).padStart(CIFRE, '0');
}

// Il passo che combacia (fra -1, 0, +1), o 0. Si guardano sempre tutti e tre,
// a tempo costante: non si esce al primo che torna.
export function passoCheCombacia(segreto, codice, ora = Date.now()) {
  const scritto = Buffer.from(String(codice || '').replace(/\s/g, '').padEnd(CIFRE, 'x').slice(0, CIFRE));
  if (!/^\d{6}$/.test(String(codice || '').replace(/\s/g, ''))) return 0;
  const p = passoDi(ora);
  let trovato = 0;
  for (const q of [p - 1, p, p + 1]) {
    const atteso = Buffer.from(codiceAlPasso(segreto, q));
    if (crypto.timingSafeEqual(atteso, scritto) && !trovato) trovato = q;
  }
  return trovato;
}

export function indirizzoOtp({ segreto, conto, emittente = 'SocialBot' }) {
  const e = encodeURIComponent(emittente);
  return `otpauth://totp/${e}:${encodeURIComponent(conto)}?secret=${segreto}&issuer=${e}&algorithm=SHA1&digits=${CIFRE}&period=${PERIODO_S}`;
}
