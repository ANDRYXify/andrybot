// LE IMMAGINI LEGGERE. Un'anteprima di link va tenuta leggera: WhatsApp non
// mostra quelle troppo pesanti. Il canvas esce a colori pieni (un'anteprima
// 1200x630 disegnata a mano pesa circa 800 KB); ridotta a 256 colori resta
// uguale all'occhio e pesa un quinto.
//
// Senza ffmpeg, se ffmpeg sbaglia o ci mette troppo, o se il risultato non e'
// piu' leggero o non e' piu' un PNG della stessa misura, torna l'immagine di
// partenza: la riduzione puo' solo migliorare, mai rompere.
import { spawn } from 'node:child_process';

const FIRMA_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export const pngDi = (b, w, h) => Buffer.isBuffer(b) && b.length > 24 && b.subarray(0, 8).equals(FIRMA_PNG)
  && b.readUInt32BE(16) === w && b.readUInt32BE(20) === h;

export function alleggerisci(b, { w, h, ffmpeg = 'ffmpeg', entro = 20_000 } = {}) {
  return new Promise((ok) => {
    const pezzi = [];
    let fatto = false, p;
    const fine = (x) => { if (!fatto) { fatto = true; ok(x); } };
    try {
      p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'png_pipe', '-i', 'pipe:0',
        '-vf', 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a',
        '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { stdio: ['pipe', 'pipe', 'ignore'] });
    } catch { return fine(b); }
    const t = setTimeout(() => { p.kill('SIGKILL'); fine(b); }, entro);
    p.on('error', () => { clearTimeout(t); fine(b); });
    p.stdout.on('data', (d) => pezzi.push(d));
    p.on('close', (code) => {
      clearTimeout(t);
      const r = Buffer.concat(pezzi);
      fine(code === 0 && r.length < b.length && pngDi(r, w, h) ? r : b);
    });
    p.stdin.on('error', () => {});
    p.stdin.end(b);
  });
}
