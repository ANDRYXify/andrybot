// Cifratura a riposo dei segreti (token) nel DB. Scopo: un DB/backup rubato deve
// essere INUTILE senza il segreto del server. La chiave si deriva da
// config.sessionSecret (che vive nell'ambiente/.env, MAI dentro il DB) con HKDF e
// un "info" distinto, così non coincide con la chiave che firma le sessioni.
//
// AES-256-GCM (autenticato). Formato: "enc:1:<iv>:<tag>:<ciphertext>" in base64url.
// Retrocompatibile: un valore SENZA il prefisso è in chiaro (pre-migrazione) e
// viene restituito così com'è. Una decifratura fallita (chiave sbagliata/valore
// corrotto) NON lancia: torna stringa vuota → il token è trattato come mancante e
// il chiamante rifà login/refresh. Mai un crash per colpa della cifratura.
import crypto from 'node:crypto';
import { config } from './config.js';

const SEGRETO = String(config.sessionSecret || '');
const ATTIVA = SEGRETO.length >= 16;
const CHIAVE = ATTIVA
  ? Buffer.from(crypto.hkdfSync('sha256', Buffer.from(SEGRETO, 'utf8'), Buffer.alloc(0), Buffer.from('andrybot:token-at-rest:v1'), 32))
  : null;
const PREF = 'enc:1:';

export function eCifrato(v) { return typeof v === 'string' && v.startsWith(PREF); }

export function cifra(testo) {
  const s = String(testo == null ? '' : testo);
  if (!s || !ATTIVA || eCifrato(s)) return s;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', CHIAVE, iv);
  const ct = Buffer.concat([c.update(s, 'utf8'), c.final()]);
  return PREF + iv.toString('base64url') + ':' + c.getAuthTag().toString('base64url') + ':' + ct.toString('base64url');
}

export function decifra(v) {
  const s = String(v == null ? '' : v);
  if (!eCifrato(s)) return s;
  if (!ATTIVA) return '';
  try {
    const p = s.split(':');
    const iv = Buffer.from(p[2], 'base64url');
    const tag = Buffer.from(p[3], 'base64url');
    const ct = Buffer.from(p[4], 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', CHIAVE, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch (e) { return ''; }
}
