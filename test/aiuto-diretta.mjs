// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Materiale per le prove del tramite: pacchetti H.264 e AAC veri, come li
// darebbe WebCodecs a un dispositivo (H.264 in forma AVCC con la sua avcC, AAC
// senza ADTS con la sua AudioSpecificConfig). Li fa ffmpeg; senza ffmpeg le
// prove che ne hanno bisogno si saltano, e lo dicono.
import { spawnSync } from 'node:child_process';

export const FFMPEG = process.env.SB_FFMPEG || (spawnSync('ffmpeg', ['-version']).status === 0 ? 'ffmpeg' : null);
export const FFPROBE = FFMPEG ? FFMPEG.replace(/ffmpeg$/, 'ffprobe') : null;

function nal(buf) {
  const fuori = [];
  let i = 0, inizio = -1;
  while (i + 3 <= buf.length) {
    const tre = buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1;
    const quattro = i + 4 <= buf.length && buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 1;
    if (tre || quattro) {
      if (inizio >= 0) fuori.push(buf.subarray(inizio, i));
      i += quattro ? 4 : 3;
      inizio = i;
    } else i++;
  }
  if (inizio >= 0) fuori.push(buf.subarray(inizio));
  return fuori.map((n) => { let f = n.length; while (f > 0 && n[f - 1] === 0) f--; return n.subarray(0, f); });
}

export function materiale({ secondi = 4, fps = 30, larghezza = 320, altezza = 180, gop = 60 } = {}) {
  if (!FFMPEG) return null;
  const v = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${larghezza}x${altezza}:rate=${fps}`,
    '-t', String(secondi), '-c:v', 'libx264', '-profile:v', 'main', '-bf', '0', '-g', String(gop), '-x264-params', 'aud=1',
    '-pix_fmt', 'yuv420p', '-f', 'h264', 'pipe:1'], { maxBuffer: 1 << 28 });
  const a = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-t', String(secondi), '-ac', '2', '-c:a', 'aac', '-b:a', '128k', '-f', 'adts', 'pipe:1'], { maxBuffer: 1 << 26 });
  if (v.status !== 0 || a.status !== 0) throw new Error('ffmpeg non ha prodotto il materiale: ' + (v.stderr || a.stderr));
  let sps = null, pps = null, corrente = [];
  const fotogrammi = [];
  const chiudi = () => { if (corrente.length) fotogrammi.push(corrente); corrente = []; };
  for (const n of nal(v.stdout)) {
    const tipo = n[0] & 0x1f;
    if (tipo === 9) { chiudi(); continue; }
    if (tipo === 7) { sps = Buffer.from(n); continue; }
    if (tipo === 8) { pps = Buffer.from(n); continue; }
    if (tipo === 6) continue;
    corrente.push(n);
  }
  chiudi();
  const avcc = Buffer.concat([Buffer.from([1, sps[1], sps[2], sps[3], 0xff, 0xe1]), Buffer.from([sps.length >> 8, sps.length & 0xff]), sps,
    Buffer.from([1, pps.length >> 8, pps.length & 0xff]), pps]);
  const video = fotogrammi.map((nals, i) => ({
    tipo: 'video', us: Math.round(i * 1e6 / fps), chiave: nals.some((n) => (n[0] & 0x1f) === 5),
    dati: Buffer.concat(nals.flatMap((n) => { const l = Buffer.alloc(4); l.writeUInt32BE(n.length); return [l, n]; })),
  }));
  const audio = [];
  let asc = null;
  for (let i = 0, k = 0; i + 7 <= a.stdout.length; k++) {
    const h = a.stdout.subarray(i, i + 9);
    const protezione = (h[1] & 1) === 0;
    const lung = ((h[3] & 3) << 11) | (h[4] << 3) | (h[5] >> 5);
    if (!asc) {
      const profilo = (h[2] >> 6) + 1, freq = (h[2] >> 2) & 0xf, canali = ((h[2] & 1) << 2) | (h[3] >> 6);
      const x = (profilo << 11) | (freq << 7) | (canali << 3);
      asc = Buffer.from([x >> 8, x & 0xff]);
    }
    audio.push({ tipo: 'audio', us: Math.round(k * 1024 * 1e6 / 48000), chiave: true, dati: Buffer.from(a.stdout.subarray(i + (protezione ? 9 : 7), i + lung)) });
    i += lung;
  }
  return {
    video, audio,
    config: {
      video: { codec: 'avc1', config: avcc, larghezza, altezza, fps },
      audio: { codec: 'aac', config: asc, frequenza: 48000, canali: 2 },
    },
  };
}

// Le due tracce in ordine di tempo, come le manderebbe il dispositivo.
export const inOrdine = (m) => [...m.video, ...m.audio].sort((x, y) => x.us - y.us);

export function sonda(file) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,sample_rate:format=duration', '-of', 'json', file]);
  return r.status === 0 ? JSON.parse(String(r.stdout)) : { errore: String(r.stderr) };
}
export function pacchetti(file, flusso = 'v') {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-select_streams', flusso, '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', file], { maxBuffer: 1 << 26 });
  return String(r.stdout).trim().split('\n').filter(Boolean).map((l) => { const [t, f] = l.split(','); return { t: Number(t), chiave: String(f).includes('K') }; });
}
