// Studio Web: "vai live dal browser, senza OBS".
// Il browser compone (webcam + schermo + overlay) su un canvas, lo registra con
// MediaRecorder e invia i pezzi al server; qui li diamo in pasto a UN processo
// ffmpeg per streamer, che li transcodifica e li SPINGE verso l'ingest RTMP di
// Twitch. La stream key resta sul server: al browser non arriva mai.
import { spawn } from 'node:child_process';
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('studio');

// Preset di qualità dello streaming. La RISOLUZIONE la decide il canvas del
// browser (ffmpeg fa passthrough, nessun -s): qui scegliamo bitrate video e
// frame-rate coerenti. "2K" = 1440p. Le chiavi devono combaciare con quelle del
// client (app.js, STUDIO_QUAL). Nota: oltre il 1080p Twitch accetta l'ingest ma
// applica il transcoding/limiti in base al livello dell'account dello streamer.
export const QUALITA = {
  '720p30':  { vBitrate: 4500, fps: 30, etichetta: '720p 30fps' },
  '1080p30': { vBitrate: 6000, fps: 30, etichetta: '1080p 30fps' },
  '1080p60': { vBitrate: 8000, fps: 60, etichetta: '1080p 60fps' },
  '1440p30': { vBitrate: 9000, fps: 30, etichetta: '2K (1440p) 30fps' },
  '1440p60': { vBitrate: 12000, fps: 60, etichetta: '2K (1440p) 60fps' },
};
const QUALITA_DEFAULT = '720p30';

// argomenti ffmpeg: legge il webm/mp4 dallo stdin, esce in FLV h264/aac su RTMP.
function argomenti(rtmpUrl, q) {
  const vb = q.vBitrate, fps = q.fps;
  return [
    '-hide_banner', '-loglevel', 'error',
    '-fflags', '+genpts',
    '-i', 'pipe:0',
    // video → H.264 (compatibile Twitch), basso ritardo
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-b:v', `${vb}k`, '-maxrate', `${vb}k`, '-bufsize', `${vb * 2}k`,
    // keyframe ogni 2s (requisito Twitch) → g = 2 × fps
    '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-r', String(fps),
    // audio → AAC
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-f', 'flv', rtmpUrl,
  ];
}

export class StudioEngine {
  constructor() {
    this.sessioni = new Map();   // login → { ff, startedAt, bytes }
  }

  attiva(login) { return this.sessioni.has(String(login).toLowerCase()); }

  stato(login) {
    const s = this.sessioni.get(String(login).toLowerCase());
    return s ? { live: true, startedAt: s.startedAt, bytes: s.bytes, qualita: s.qualita } : { live: false };
  }

  // Avvia la diretta: apre ffmpeg verso rtmp://…/app/<streamKey>. `qualita` è una
  // chiave di QUALITA (default 720p30 se assente/ignota). Ritorna { ok } oppure
  // { ok:false, motivo }. Non lancia mai.
  start(login, streamKey, qualita) {
    const ch = String(login).toLowerCase();
    if (this.sessioni.has(ch)) return { ok: false, motivo: 'sei già in diretta dallo studio' };
    if (!streamKey) return { ok: false, motivo: 'stream key non disponibile (ri-concedi i permessi)' };

    const chiave = QUALITA[qualita] ? qualita : QUALITA_DEFAULT;
    const q = QUALITA[chiave];
    const rtmpUrl = `${config.twitchRtmp}/${streamKey}`;
    let ff;
    try {
      ff = spawn('ffmpeg', argomenti(rtmpUrl, q), { stdio: ['pipe', 'ignore', 'pipe'] });
    } catch {
      return { ok: false, motivo: 'streaming non disponibile su questo server (manca ffmpeg)' };
    }

    const sess = { ff, startedAt: Date.now(), bytes: 0, qualita: chiave };
    this.sessioni.set(ch, sess);

    let errBuf = '';
    ff.stderr?.on('data', (d) => { errBuf = (errBuf + d.toString()).slice(-2000); });
    // se lo stdin si rompe (ffmpeg morto) non deve buttare giù il processo Node
    ff.stdin?.on('error', (e) => log.debug(`stdin #${ch}:`, e?.code || e?.message || e));
    ff.on('error', (e) => { log.warn(`ffmpeg #${ch} non partito:`, e?.message || e); this._chiudi(ch); });
    ff.on('exit', (code, signal) => {
      if (code && code !== 255) log.warn(`ffmpeg #${ch} uscito (code ${code}): ${errBuf.trim().slice(-300)}`);
      this._chiudi(ch);
    });
    log.info(`studio LIVE #${ch} (${q.etichetta})`);
    return { ok: true };
  }

  // Scrive un pezzo di media (Buffer) nello stdin di ffmpeg. Ritorna true se
  // accettato. Best-effort: se non c'è sessione o lo stdin è chiuso, ignora.
  write(login, buf) {
    const ch = String(login).toLowerCase();
    const s = this.sessioni.get(ch);
    if (!s || !buf || !buf.length) return false;
    const w = s.ff.stdin;
    if (!w || w.destroyed || !w.writable) return false;
    try { w.write(buf); s.bytes += buf.length; return true; }
    catch (e) { log.debug(`write #${ch}:`, e?.message || e); return false; }
  }

  // Ferma la diretta: chiude lo stdin (flush) e, se serve, uccide ffmpeg.
  stop(login) {
    const ch = String(login).toLowerCase();
    const s = this.sessioni.get(ch);
    if (!s) return false;
    try { s.ff.stdin?.end(); } catch { /* niente */ }
    // grazia: se ffmpeg non esce da solo entro 3s, lo terminiamo
    setTimeout(() => { try { if (!s.ff.killed) s.ff.kill('SIGKILL'); } catch { /* niente */ } }, 3000);
    log.info(`studio STOP #${ch}`);
    return true;
  }

  _chiudi(ch) {
    const s = this.sessioni.get(ch);
    if (!s) return;
    this.sessioni.delete(ch);
    try { if (!s.ff.killed) s.ff.kill('SIGKILL'); } catch { /* niente */ }
  }

  // Spegnimento del bot: chiude tutte le dirette in corso.
  stopAll() { for (const ch of [...this.sessioni.keys()]) this.stop(ch); }
}
