// Super-compressione degli effetti caricati dallo streamer.
// Usa il binario di sistema `ffmpeg` (niente dipendenze npm): audio, immagini
// e video vengono ridotti a file piccolissimi, adatti a un overlay per OBS.
// Obiettivo: qualità "sufficiente" e peso minimo, così l'overlay resta fluido.
import { spawn } from 'node:child_process';
import { stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { makeLog } from '../logger.js';

const log = makeLog('effects');

// -------------------------------------------------- costanti di compressione
const AUDIO_BITRATE = '64k';    // opus per gli effetti audio (mono)
const AUDIO_MAX_S = 10;         // durata massima di un audio (secondi)
const IMG_MAX_LATO = 800;       // lato massimo di un'immagine (px)
const IMG_QUALITA = 75;         // qualità webp (0..100)
const IMG_DURATA_MS = 5000;     // quanto resta a schermo un'immagine (ms)
const VIDEO_MAX_S = 8;          // durata massima di un video (secondi)
const VIDEO_MAX_ALTEZZA = 720;  // altezza massima di un video (px)
const VIDEO_CRF = 34;           // qualità VP9 (più alto = più compresso)
const TIMEOUT_MS = 60_000;      // oltre questo tempo il processo ffmpeg viene ucciso

// Riconosce la famiglia del file dal mimetype (con qualche estensione di scorta).
// Le GIF (spesso animate) vengono trattate come video → webm.
function rilevaTipo(tipoDichiarato) {
  const m = String(tipoDichiarato || '').toLowerCase();
  if (m === 'image/gif' || m.endsWith('.gif')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('image/')) return 'immagine';
  // scorta su estensioni note (se ci arriva un percorso/nome invece del mime)
  if (/\.(mp3|wav|ogg|m4a|opus)$/.test(m)) return 'audio';
  if (/\.(png|jpe?g|webp)$/.test(m)) return 'immagine';
  if (/\.(mp4|webm|mov)$/.test(m)) return 'video';
  throw new Error('tipo di file non supportato (usa audio, immagine o video)');
}

// Esegue ffmpeg con gli argomenti dati. Risolve se esce con codice 0,
// altrimenti lancia un errore chiaro. Uccide il processo se supera il timeout.
function eseguiFfmpeg(args) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch {
      return reject(new Error('ffmpeg non disponibile'));
    }
    let stderr = '';
    let ucciso = false;
    let concluso = false;   // 'error' e 'close' possono arrivare entrambi: risolviamo una volta sola
    const timer = setTimeout(() => {
      ucciso = true;
      try { proc.kill('SIGKILL'); } catch { /* già morto */ }
    }, TIMEOUT_MS);
    const chiudi = (fn, arg) => { if (concluso) return; concluso = true; clearTimeout(timer); fn(arg); };

    proc.stderr?.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);   // non accumulare all'infinito
    });
    proc.on('error', (e) => {
      if (e?.code === 'ENOENT') chiudi(reject, new Error('ffmpeg non disponibile'));
      else chiudi(reject, new Error('compressione fallita: ' + (e?.message || e)));
    });
    proc.on('close', (code) => {
      if (ucciso) return chiudi(reject, new Error('compressione fallita: timeout ffmpeg'));
      if (code === 0) return chiudi(resolve);
      if (!concluso) log.warn('ffmpeg ha fallito:', stderr.split('\n').slice(-3).join(' ').slice(0, 300));
      chiudi(reject, new Error('compressione fallita (ffmpeg ha risposto ' + code + ')'));
    });
  });
}

// Legge la durata reale di un file in ms usando ffprobe. Se ffprobe non c'è
// o fallisce, ritorna null (il chiamante userà un valore di default).
function sondaDurataMs(percorso) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        percorso,
      ], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return resolve(null);
    }
    let out = '';
    proc.stdout?.on('data', (d) => { out += d.toString(); });
    proc.on('error', () => resolve(null));
    proc.on('close', () => {
      const sec = parseFloat(out.trim());
      resolve(Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : null);
    });
  });
}

// Verifica che il file di output esista e non sia vuoto.
async function verificaOutput(percorso) {
  let st;
  try { st = await stat(percorso); } catch { throw new Error('compressione fallita: nessun output prodotto'); }
  if (!st.size) throw new Error('compressione fallita: output vuoto');
}

// Comprime `tempPath` (file appena caricato) in `destDir` con nome basato su `id`.
// `tipoDichiarato` è il mimetype (o un nome file) usato per capire audio/immagine/video.
// Ritorna { tipo, file, durata } oppure lancia un errore. Cancella SEMPRE il tempPath.
export async function comprimi(tempPath, tipoDichiarato, destDir, id) {
  try {
    const tipo = rilevaTipo(tipoDichiarato);

    if (tipo === 'audio') {
      const file = `${id}.ogg`;
      const out = join(destDir, file);
      await eseguiFfmpeg([
        '-y', '-i', tempPath,
        '-t', String(AUDIO_MAX_S),
        '-vn',
        '-ac', '1',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-c:a', 'libopus', '-b:a', AUDIO_BITRATE,
        out,
      ]);
      await verificaOutput(out);
      const reale = await sondaDurataMs(out);
      const durata = Math.min(reale ?? AUDIO_MAX_S * 1000, AUDIO_MAX_S * 1000);
      return { tipo, file, durata };
    }

    if (tipo === 'immagine') {
      const file = `${id}.webp`;
      const out = join(destDir, file);
      await eseguiFfmpeg([
        '-y', '-i', tempPath,
        '-vf', `scale='min(${IMG_MAX_LATO},iw)':-2`,
        '-frames:v', '1',
        '-c:v', 'libwebp', '-quality', String(IMG_QUALITA),
        out,
      ]);
      await verificaOutput(out);
      return { tipo, file, durata: IMG_DURATA_MS };
    }

    // video (anche le GIF finiscono qui) → webm VP9 + audio opus
    const file = `${id}.webm`;
    const out = join(destDir, file);
    await eseguiFfmpeg([
      '-y', '-i', tempPath,
      '-t', String(VIDEO_MAX_S),
      '-vf', `scale=-2:'min(${VIDEO_MAX_ALTEZZA},ih)'`,
      '-c:v', 'libvpx-vp9', '-crf', String(VIDEO_CRF), '-b:v', '0',
      '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
      '-c:a', 'libopus', '-b:a', AUDIO_BITRATE,
      out,
    ]);
    await verificaOutput(out);
    const reale = await sondaDurataMs(out);
    const durata = Math.min(reale ?? VIDEO_MAX_S * 1000, VIDEO_MAX_S * 1000);
    return { tipo, file, durata };
  } finally {
    // il file temporaneo caricato non serve più, in ogni caso
    try { await unlink(tempPath); } catch { /* già rimosso */ }
  }
}
