// L'immagine di chi dona: nasce col modulo, vive con la donazione, muore con lei.
//
// Da un importo in su (lo decide lo streamer) chi dona puo' allegare un'immagine
// o una GIF che va in onda come un effetto della libreria. Il file entra dalla
// porta pubblica del modulo, quindi i limiti sono stretti per costruzione: solo
// immagini, un tetto di byte in ingresso, ricompressione come per gli effetti
// (l'originale non si conserva mai), un tetto di file in attesa per canale, lo
// spazio del canale. Sta nella cartella degli effetti del canale, cosi' lo
// serve la porta dell'overlay che c'e' gia' (con la chiave) e conta nello
// spazio come tutto il resto; sparisce con la riga della donazione e con il
// canale.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { comprimi as comprimiDiSerie } from './compress.js';

export const MIME_OK = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
export const MAX_BYTE = 8 * 1024 * 1024;
export const MAX_IN_ATTESA = 30;
export const PREFISSO = 'dn_';
export const FILE_OK = /^dn_[A-Za-z0-9._-]{1,80}$/;

export const cartella = (login) => join(config.dataDir, 'effects', String(login || '').toLowerCase());

export const mimeOk = (mime) => Object.prototype.hasOwnProperty.call(MIME_OK, String(mime || '').toLowerCase());

// Salva il file di chi dona: lo ricomprime (che cancella sempre il temporaneo)
// e torna { file, tipo, durata }. `comprimi` si puo' sostituire nel collaudo.
export async function salva(login, tempPath, mime, { comprimi = comprimiDiSerie, ora = Date.now() } = {}) {
  if (!mimeOk(mime)) throw new Error('serve un\'immagine (PNG, JPG, WEBP o GIF)');
  const dir = cartella(login);
  mkdirSync(dir, { recursive: true });
  const id = PREFISSO + ora + '_' + crypto.randomBytes(4).toString('hex');
  const e = await comprimi(tempPath, mime, dir, id);
  if (!e?.file || !FILE_OK.test(e.file)) throw new Error('immagine non salvata');
  return { file: e.file, tipo: e.tipo === 'video' ? 'video' : 'immagine', durata: Math.max(0, Math.round(Number(e.durata) || 0)) };
}

// Toglie il file di una donazione. Solo nomi nostri: niente altro si tocca.
export async function togli(login, file) {
  if (!FILE_OK.test(String(file || ''))) return false;
  try { await unlink(join(cartella(login), file)); return true; } catch { return false; }
}

// Toglie in blocco i file delle righe che il registro ha cancellato.
export async function togliTutti(righe) {
  let n = 0;
  for (const r of righe || []) if (await togli(r.login, r.media)) n++;
  return n;
}

// Quello che l'overlay riceve: come un effetto della libreria, con la durata
// scelta dallo streamer per le immagini (una GIF, diventata video muto, dura
// quanto e' lunga). Nessuna etichetta: il nome lo dice gia' l'avviso.
export function payload(mediaUrl, login, r, proprio = {}) {
  const immagine = r.media_tipo !== 'video';
  return {
    comando: '',
    tipo: immagine ? 'immagine' : 'video',
    url: mediaUrl(login, r.media),
    volume: 0,
    durata: immagine ? Math.round(Math.max(2, Math.min(15, Number(proprio.durata) || 6)) * 1000) : Math.max(1000, Number(r.media_durata) || 6000),
    posizione: null,
  };
}
