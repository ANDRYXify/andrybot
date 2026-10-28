// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ARCHIVIO DEI MEDIA DEGLI EFFETTI (docs/ARCHIVIO.md).
//
// Un file si salva UNA volta: il suo nome viene dal contenuto
// (`a_<impronta>.<est>`), quindi due canali che hanno lo stesso effetto (uno
// l'ha preso dalla libreria dell'altro) hanno lo stesso file, non due copie.
// L'impronta non e' lo sha256 nudo: e' un segno del server su quello sha256,
// cosi' chi ha il disco non puo' nemmeno controllare se c'e' un file che conosce.
//
// Un file sta sul disco CIFRATO. Ha una chiave sua, casuale, chiusa con la
// maestra di adesso (segreti.chiudiChiave, legata al nome del file: una chiave
// spostata su un altro file non si apre). Il contenuto e' a blocchi da 64 KB,
// ognuno col suo sigillo (AES-256-GCM, nonce = base del file + numero del
// blocco, e nel dato autenticato il numero del blocco e se e' l'ultimo):
//  · un video si serve anche a pezzi (i salti avanti e indietro del lettore),
//    leggendo solo i blocchi che servono, e ogni pezzo e' verificato;
//  · un blocco spostato, cambiato o tolto non si apre; un file troncato
//    nemmeno, perche' l'ultimo blocco dice di esserlo (anche uno vuoto).
//
// Il formato: "SBA1" | chiave chiusa (62) | base del nonce (8) | byte in chiaro (8)
//             | per ogni blocco: testo cifrato (fino a 64 KB) | sigillo (16)
//
// Qui ci sono solo il disco e la cifratura. Chi usa quale file, e quando un file
// non serve piu' a nessuno, lo sa il database (db.archivio).
import crypto from 'node:crypto';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { open, rename, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';

export const BLOCCO = 64 * 1024;
const SIGILLO = 16;
const MAGIA = Buffer.from('SBA1', 'ascii');
const TESTA = 4 + 62 + 8 + 8;
export const NOME = /^a_([0-9a-f]{64})\.([a-z0-9]{1,5})$/;
export const eNomeArchivio = (nome) => NOME.test(String(nome || ''));

// `cartella`: dove stanno i file. `chiudiChiave` / `apriChiave`: le buste della
// maestra (segreti.js). `impronta(sha256hex)`: il segno del server, 64 cifre esadecimali.
export function creaArchivio({ cartella, chiudiChiave, apriChiave, impronta }) {
  const posto = (hex) => 'archivio|' + hex;
  const percorso = (hex) => join(cartella, hex.slice(0, 2), hex);
  const hexDi = (nome) => NOME.exec(String(nome || ''))?.[1] || '';
  const nonce = (base, i) => { const n = Buffer.alloc(12); base.copy(n, 0); n.writeUInt32BE(i, 8); return n; };
  const aad = (hex, i, ultimo) => Buffer.from(`${hex}|${i}|${ultimo ? 1 : 0}`, 'utf8');
  const blocchi = (byte) => Math.max(1, Math.ceil(byte / BLOCCO));

  // Mette un file nell'archivio e lo toglie da dove era. Torna { nome, byte, nuovo }:
  // `nuovo` falso se lo stesso contenuto c'era gia' (resta quello).
  async function metti(sorgente, est) {
    const e = String(est || '').toLowerCase().replace(/^\./, '');
    if (!/^[a-z0-9]{1,5}$/.test(e)) throw new Error('archivio: estensione non valida');
    const h = crypto.createHash('sha256');
    for await (const pezzo of createReadStream(sorgente)) h.update(pezzo);
    const hex = impronta(h.digest('hex'));
    if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('archivio: impronta non valida');
    const nome = `a_${hex}.${e}`;
    const dest = percorso(hex);
    const byte = (await stat(sorgente)).size;
    if (existsSync(dest)) { await unlink(sorgente).catch(() => {}); return { nome, byte, nuovo: false }; }
    const chiave = crypto.randomBytes(32);
    const chiusa = chiudiChiave(chiave, posto(hex));
    if (!chiusa) throw new Error('archivio: senza il segreto del server non si cifra');
    const base = crypto.randomBytes(8);
    const quanti = Buffer.alloc(8);
    quanti.writeBigUInt64BE(BigInt(byte));
    mkdirSync(join(cartella, hex.slice(0, 2)), { recursive: true });
    const tmp = `${dest}.tmp-${crypto.randomBytes(6).toString('hex')}`;
    const da = await open(sorgente, 'r');
    const a = await open(tmp, 'w');
    try {
      await a.write(Buffer.concat([MAGIA, chiusa, base, quanti]));
      const n = blocchi(byte), buf = Buffer.alloc(BLOCCO);
      for (let i = 0; i < n; i++) {
        const { bytesRead } = await da.read(buf, 0, Math.min(BLOCCO, byte - i * BLOCCO), i * BLOCCO);
        const c = crypto.createCipheriv('aes-256-gcm', chiave, nonce(base, i));
        c.setAAD(aad(hex, i, i === n - 1));
        await a.write(Buffer.concat([c.update(buf.subarray(0, bytesRead)), c.final(), c.getAuthTag()]));
      }
      await a.sync();
    } catch (err) {
      await a.close().catch(() => {}); await da.close().catch(() => {});
      await unlink(tmp).catch(() => {});
      throw err;
    }
    await a.close(); await da.close();
    await rename(tmp, dest);
    await unlink(sorgente).catch(() => {});
    return { nome, byte, nuovo: true };
  }

  // la testa di un file: { byte, chiave, base } o null (non c'e', o non si apre)
  async function testa(fh, hex) {
    const t = Buffer.alloc(TESTA);
    const { bytesRead } = await fh.read(t, 0, TESTA, 0);
    if (bytesRead !== TESTA || !t.subarray(0, 4).equals(MAGIA)) return null;
    const chiave = apriChiave(t.subarray(4, 66), posto(hex));
    if (!chiave) return null;
    return { chiave, base: t.subarray(66, 74), byte: Number(t.readBigUInt64BE(74)) };
  }

  // Quanti byte ha in chiaro: null se il file non c'e' o non si apre.
  async function byteDi(nome) {
    const hex = hexDi(nome);
    if (!hex || !existsSync(percorso(hex))) return null;
    const fh = await open(percorso(hex), 'r');
    try { return (await testa(fh, hex))?.byte ?? null; } finally { await fh.close(); }
  }

  // I byte in chiaro da `inizio` a `fine` (compresi), un blocco alla volta,
  // ognuno verificato. Un blocco che non si apre ferma il flusso con un errore.
  function leggiDa(nome, inizio = 0, fine = Infinity) {
    const hex = hexDi(nome);
    return Readable.from((async function* () {
      if (!hex) throw new Error('archivio: nome non valido');
      const fh = await open(percorso(hex), 'r');
      try {
        const t = await testa(fh, hex);
        if (!t) throw new Error('archivio: il file non si apre');
        const ultimoByte = Math.min(t.byte - 1, fine);
        if (t.byte === 0 || inizio > ultimoByte) return;
        const n = blocchi(t.byte), buf = Buffer.alloc(BLOCCO + SIGILLO);
        for (let i = Math.floor(inizio / BLOCCO); i <= Math.floor(ultimoByte / BLOCCO); i++) {
          const lung = Math.min(BLOCCO, t.byte - i * BLOCCO);
          const { bytesRead } = await fh.read(buf, 0, lung + SIGILLO, TESTA + i * (BLOCCO + SIGILLO));
          if (bytesRead !== lung + SIGILLO) throw new Error('archivio: file troncato');
          const d = crypto.createDecipheriv('aes-256-gcm', t.chiave, nonce(t.base, i));
          d.setAAD(aad(hex, i, i === n - 1));
          d.setAuthTag(buf.subarray(lung, lung + SIGILLO));
          const chiaro = Buffer.concat([d.update(buf.subarray(0, lung)), d.final()]);
          const da = i * BLOCCO;
          yield chiaro.subarray(Math.max(0, inizio - da), Math.min(lung, ultimoByte - da + 1));
        }
      } finally { await fh.close(); }
    })());
  }

  async function leggi(nome) {
    const parti = [];
    for await (const p of leggiDa(nome)) parti.push(p);
    return Buffer.concat(parti);
  }

  const esiste = (nome) => !!hexDi(nome) && existsSync(percorso(hexDi(nome)));
  async function togli(nome) { const hex = hexDi(nome); if (hex) await unlink(percorso(hex)).catch(() => {}); }

  return { metti, leggiDa, leggi, byteDi, esiste, togli };
}

// Il tipo di contenuto di un file dell'archivio, dalla sua estensione.
export const TIPI = Object.freeze({
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', avif: 'image/avif',
  webm: 'video/webm', mp4: 'video/mp4', opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
});
export const tipoDi = (nome) => TIPI[NOME.exec(String(nome || ''))?.[2]] || 'application/octet-stream';

// Serve un file dell'archivio a una risposta HTTP, coi pezzi (Range) che il
// lettore chiede. `res` e `req` di Express (o di node:http).
export async function servi(archivio, nome, req, res, { maxAge = 300 } = {}) {
  const byte = await archivio.byteDi(nome);
  if (byte == null) { res.statusCode = 404; res.end(); return false; }
  res.setHeader('Content-Type', tipoDi(nome));
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
  let inizio = 0, fine = byte - 1;
  const r = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers?.range || ''));
  if (r && byte > 0) {
    if (r[1] === '' && r[2] !== '') { inizio = Math.max(0, byte - Number(r[2])); }
    else { inizio = Number(r[1] || 0); if (r[2] !== '') fine = Math.min(byte - 1, Number(r[2])); }
    if (!(inizio <= fine) || inizio >= byte) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${byte}`); res.end(); return false; }
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${inizio}-${fine}/${byte}`);
  } else res.statusCode = 200;
  res.setHeader('Content-Length', String(Math.max(0, fine - inizio + 1)));
  if (req.method === 'HEAD' || byte === 0) { res.end(); return true; }
  const flusso = archivio.leggiDa(nome, inizio, fine);
  flusso.on('error', () => res.destroy());
  flusso.pipe(res);
  return true;
}
