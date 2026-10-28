// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA FIRMA SUGLI EFFETTI PRIVATI (docs/ARCHIVIO.md, «La firma»).
//
// Chiesto così: «se qualcuno cercasse di rubarli fa si' che ci sia una firma
// indelebile e visibile dello streamer, cosi' che non possa utilizzarlo in
// semplicita'». E scelto: la firma si vede FUORI dalla diretta; nell'overlay
// l'effetto resta pulito.
//
// Un media privato che esce da una porta pubblica (l'anteprima della pagina
// dei colpi, l'immagine di un articolo del negozio) esce FIRMATO:
//  · immagini e video: la scritta «© <streamer> · socialbot.live» ripetuta in
//    diagonale su tutto il quadro, piu' un bollino nell'angolo. Ritagliare un
//    bordo non la toglie; un video trasparente resta trasparente;
//  · audio: un segno udibile ogni tre secondi;
//  · quello che ffmpeg non sa riscrivere (un WebP animato, un AVIF) NON esce in
//    chiaro: esce una tessera firmata al suo posto.
// La copia firmata si fa una volta (alla prima richiesta, una sola anche se le
// richieste sono tante) e resta nella cartella del canale (`<cartella>/<canale>`:
// quando l'account se ne va, se ne va con lui), col nome che dipende dal file e
// dalla firma: cambiare nome allo streamer fa una copia nuova.
import crypto from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSIONE_FIRMA = 1;
const CANALE = /^[a-z0-9_]{1,40}$/;
const CARATTERE = join(dirname(fileURLToPath(import.meta.url)), '../../assets/font/Archivo-Variable.ttf');
const xml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

// Le misure scritte nella testa di un WebP esteso (VP8X: larghezza e altezza
// meno uno, 24 bit ciascuna): ffmpeg non legge un WebP animato, la testa si'.
export function misureWebp(b) {
  if (!Buffer.isBuffer(b) || b.length < 30 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP' || b.toString('latin1', 12, 16) !== 'VP8X') return null;
  return { larghezza: b.readUIntLE(24, 3) + 1, altezza: b.readUIntLE(27, 3) + 1 };
}

export const testoFirma = (streamer) => `© ${String(streamer || '').replace(/[\u0000-\u001f]/g, '').slice(0, 40)} · socialbot.live`;

// La firma di un quadro largo `w` e alto `h`: righe diagonali ripetute che lo
// coprono tutto, e il bollino in basso a destra. Un SVG (lo rasterizza resvg).
export function svgFirma(w, h, testo) {
  const W = Math.max(16, Math.round(w)), H = Math.max(16, Math.round(h));
  const lato = Math.max(W, H);
  const corpo = Math.max(11, Math.round(lato / 28));
  const passoY = corpo * 4.2, passoX = corpo * (String(testo).length * 0.5 + 3);
  const diag = Math.ceil(Math.hypot(W, H));
  const righe = [];
  for (let y = -diag, k = 0; y < diag; y += passoY, k++) {
    const sposta = (k % 2) * passoX / 2;
    for (let x = -diag - sposta; x < diag; x += passoX) righe.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${xml(testo)}</text>`);
  }
  const bc = Math.max(12, Math.round(lato / 22));
  const bw = Math.round(bc * (String(testo).length * 0.47 + 1.6)), bh = Math.round(bc * 1.9);
  const bx = Math.max(0, W - bw - Math.round(bc * 0.6)), by = Math.max(0, H - bh - Math.round(bc * 0.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<g transform="translate(${W / 2} ${H / 2}) rotate(-28)" font-family="Archivo" font-weight="700" font-size="${corpo}" fill="#ffffff" fill-opacity="0.30" stroke="#000000" stroke-opacity="0.30" stroke-width="${Math.max(1, corpo / 14).toFixed(1)}">${righe.join('')}</g>`
    + `<rect x="${bx}" y="${by}" width="${Math.min(bw, W)}" height="${bh}" rx="${Math.round(bh / 3)}" fill="#000000" fill-opacity="0.62"/>`
    + `<text x="${bx + Math.round(bc * 0.8)}" y="${by + Math.round(bh * 0.68)}" font-family="Archivo" font-weight="800" font-size="${bc}" fill="#ffffff">${xml(testo)}</text></svg>`;
}

// `disegna(svg, opzioni)` → { png }: il disegnatore fuori dal filo del bot
// (src/disegno.js). `ffmpeg(args)` e `sonda(percorso)`: quelli di compress.js.
export function creaFirma({ cartella, disegna, ffmpeg, sonda, log = null }) {
  const inCorso = new Map();
  const nomeCopia = (nome, testo) => `${crypto.createHash('sha256').update(`${VERSIONE_FIRMA}|${nome}|${testo}`).digest('hex').slice(0, 40)}`;
  const png = async (w, h, testo) => (await disegna(svgFirma(w, h, testo), {
    font: { loadSystemFonts: false, fontFiles: existsSync(CARATTERE) ? [CARATTERE] : [], defaultFontFamily: 'Archivo' },
  })).png;

  // La copia firmata di un media di `canale`: { buf, est }. `leggi()` da' i byte
  // in chiaro (solo se serve farla), `est` l'estensione del media.
  async function copia(canale, nome, est, testo, leggi) {
    const ch = String(canale || '').toLowerCase();
    if (!CANALE.test(ch)) return null;
    const chiave = nomeCopia(nome, testo), sua = join(cartella, ch);
    if (inCorso.has(`${ch}/${chiave}`)) return inCorso.get(`${ch}/${chiave}`);
    const p = (async () => {
      mkdirSync(sua, { recursive: true });
      for (const e of [...new Set([est, 'webp', 'webm', 'ogg', 'png'])]) {
        const f = join(sua, `${chiave}.${e}`);
        if (existsSync(f)) return { buf: await readFile(f), est: e };
      }
      const chiaro = await leggi();
      if (!chiaro) return null;
      // quello che non si sa firmare esce come tessera firmata, grande come l'originale
      // (la pagina dei colpi misura l'anteprima per disegnare l'ombra della mira)
      const m = misureWebp(chiaro) || { larghezza: 640, altezza: 360 };
      const r = await firma(chiaro, est, testo).catch((e) => { log?.warn?.('firma:', e?.message || e); return null; })
        || { buf: await png(m.larghezza, m.altezza, testo), est: 'png' };
      const dest = join(sua, `${chiave}.${r.est}`), tmp = `${dest}.tmp-${crypto.randomBytes(4).toString('hex')}`;
      await writeFile(tmp, r.buf);
      await rename(tmp, dest);
      return r;
    })().finally(() => inCorso.delete(`${ch}/${chiave}`));
    inCorso.set(`${ch}/${chiave}`, p);
    return p;
  }

  // Firma dei byte: { buf, est } o null se non si sa firmare (allora la tessera).
  async function firma(chiaro, est, testo) {
    const dir = join(cartella, '.lavoro');
    mkdirSync(dir, { recursive: true });
    const id = crypto.randomBytes(6).toString('hex');
    const dentro = join(dir, `${id}-in.${est}`), segno = join(dir, `${id}-firma.png`);
    await writeFile(dentro, chiaro);
    try {
      const s = await sonda(dentro);
      if (!s) return null;
      if (s.audio && !s.codec) {
        const fuori = join(dir, `${id}-out.ogg`);
        await ffmpeg(['-y', '-i', dentro, '-f', 'lavfi', '-i', "aevalsrc='0.22*sin(2*PI*1320*t)*lt(mod(t\\,3)\\,0.14)':s=48000:d=31",
          '-filter_complex', '[0:a]aformat=sample_rates=48000:channel_layouts=mono[a];[1:a]aformat=channel_layouts=mono[b];[a][b]amix=inputs=2:duration=first:normalize=0',
          '-c:a', 'libopus', '-b:a', '64k', fuori]);
        return { buf: await readFile(fuori), est: 'ogg' };
      }
      if (!s.codec || !s.larghezza || !s.altezza) return null;
      await writeFile(segno, await png(s.larghezza, s.altezza, testo));
      const decod = s.alfa && s.codec === 'vp9' ? ['-c:v', 'libvpx-vp9'] : s.alfa && s.codec === 'vp8' ? ['-c:v', 'libvpx'] : [];
      if (!s.animato) {
        const fuori = join(dir, `${id}-out.webp`);
        await ffmpeg(['-y', ...decod, '-i', dentro, '-i', segno, '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', fuori]);
        return { buf: await readFile(fuori), est: 'webp' };
      }
      const fuori = join(dir, `${id}-out.webm`);
      await ffmpeg(['-y', ...decod, '-i', dentro, '-loop', '1', '-i', segno,
        '-filter_complex', `[0:v][1:v]overlay=0:0:shortest=1:format=auto,format=${s.alfa ? 'yuva420p' : 'yuv420p'}`,
        '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1',
        ...(s.audio ? ['-c:a', 'libopus', '-b:a', '64k'] : ['-an']), fuori]);
      return { buf: await readFile(fuori), est: 'webm' };
    } finally {
      for (const f of await readdir(dir).catch(() => [])) if (f.startsWith(id)) await unlink(join(dir, f)).catch(() => {});
    }
  }

  // le copie vecchie se ne vanno (si rifanno alla prossima richiesta): cosi'
  // non restano quelle di un file che non c'e' piu'
  async function pulisci(giorni = 30, ora = Date.now()) {
    const { stat } = await import('node:fs/promises');
    let n = 0;
    for (const ch of await readdir(cartella).catch(() => [])) {
      if (!CANALE.test(ch)) continue;
      for (const f of await readdir(join(cartella, ch)).catch(() => [])) {
        const p = join(cartella, ch, f);
        const st = await stat(p).catch(() => null);
        if (st?.isFile() && ora - st.mtimeMs > giorni * 86400_000) { await unlink(p).catch(() => {}); n++; }
      }
    }
    return n;
  }

  return { copia, firma, pulisci };
}

export const TIPI_FIRMATI = Object.freeze({ webp: 'image/webp', png: 'image/png', webm: 'video/webm', ogg: 'audio/ogg' });
