// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I FILE DEL WALK-ON (docs/WALKON.md, «Il file»). Un posto loro,
// DATA_DIR/walkon/<canale>/, fuori dalla libreria dello streamer. Il nome lo fa
// il server; il tipo lo dicono i byte; la durata vera sta nel tetto dello
// streamer; su disco va solo quello che ffmpeg ha rifatto. Un file che nessuna
// riga nomina se ne va.
import { join } from 'node:path';
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { unlink, open } from 'node:fs/promises';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { comprimi as comprimiDiSerie, durataFile as durataDiSerie } from './compress.js';
import { tipoDaiByte } from './walkon.js';

export const NOME_FILE = /^wo_\d{13}_[a-f0-9]{12}\.(webp|webm|ogg|avif)$/;
const CANALE = /^[a-z0-9_.]{1,60}$/;
// un file appena fatto e non ancora scritto in una riga non e' orfano: la
// pulizia guarda solo quelli piu' vecchi di cosi'
export const ORFANO_DOPO_MS = 10 * 60_000;

export const radice = () => join(config.dataDir, 'walkon');
export function cartella(login) {
  const l = String(login || '').toLowerCase();
  if (!CANALE.test(l) || l.includes('..')) throw new Error('canale');
  return join(radice(), l);
}
export function percorso(login, file) {
  if (!NOME_FILE.test(String(file || ''))) return '';
  const p = join(cartella(login), file);
  return existsSync(p) ? p : '';
}

const errore = (codice) => Object.assign(new Error(codice), { codice });
async function testa(p, n = 32) {
  const f = await open(p, 'r');
  try { const b = Buffer.alloc(n); const { bytesRead } = await f.read(b, 0, n, 0); return b.subarray(0, bytesRead); } finally { await f.close(); }
}

// Un file arrivato: torna { file, tipo, durata, famiglia } o lancia un errore
// col suo `codice` (tipo, tipo-no, illeggibile, lungo, salvataggio). Il
// temporaneo se ne va in ogni caso.
export async function accogli(login, temp, { tipi = [], maxSec = 10, chi = '', ora = Date.now(), comprimi = comprimiDiSerie, durata = durataDiSerie } = {}) {
  try {
    const t = tipoDaiByte(await testa(temp));
    if (!t) throw errore('tipo');
    if (!tipi.includes(t.famiglia)) throw errore('tipo-no');
    if (t.famiglia !== 'immagine') {
      const ms = await durata(temp);
      if (ms == null) throw errore('illeggibile');
      if (ms > maxSec * 1000 + 500) throw errore('lungo');
    }
    const dir = cartella(login);
    mkdirSync(dir, { recursive: true });
    const id = 'wo_' + String(Math.trunc(ora)).padStart(13, '0') + '_' + crypto.randomBytes(6).toString('hex');
    let e;
    try { e = await comprimi(temp, t.mime, dir, id, { chi }); } catch (x) { throw x?.occupato ? x : errore('illeggibile'); }
    if (!e?.file || !NOME_FILE.test(e.file)) { if (e?.file) await unlink(join(dir, String(e.file).replace(/[^\w.-]/g, ''))).catch(() => {}); throw errore('salvataggio'); }
    return { file: e.file, tipo: e.tipo, durata: Math.max(0, Math.round(Number(e.durata) || 0)), famiglia: t.famiglia };
  } finally {
    await unlink(temp).catch(() => {});
  }
}

export async function togli(login, file) {
  if (!NOME_FILE.test(String(file || ''))) return false;
  try { await unlink(join(cartella(login), file)); return true; } catch { return false; }
}

// I file della cartella che nessuna riga nomina, piu' vecchi di ORFANO_DOPO_MS: via.
export async function pulisci(login, usati, { ora = Date.now() } = {}) {
  let dir, nomi = [];
  try { dir = cartella(login); nomi = readdirSync(dir); } catch { return 0; }
  let n = 0;
  for (const f of nomi) {
    if (!NOME_FILE.test(f) || usati.has(f)) continue;
    try { if (ora - statSync(join(dir, f)).mtimeMs < ORFANO_DOPO_MS) continue; } catch { continue; }
    if (await togli(login, f)) n++;
  }
  return n;
}
// tutti i canali che hanno una cartella
export async function pulisciTutti(usatiDi, opz) {
  let canali = [];
  try { canali = readdirSync(radice()).filter((c) => CANALE.test(c)); } catch { return 0; }
  let n = 0;
  for (const c of canali) n += await pulisci(c, usatiDi(c), opz);
  return n;
}
