// Super-compressione degli effetti caricati dallo streamer.
// Usa il binario di sistema `ffmpeg` (niente dipendenze npm): audio, immagini
// e video vengono ridotti a file piccolissimi, adatti a un overlay per OBS.
// Obiettivo: qualità "sufficiente" e peso minimo, così l'overlay resta fluido.
import { spawn } from 'node:child_process';
import { stat, unlink, readFile, writeFile, copyFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import { makeLog } from '../logger.js';

const log = makeLog('effects');

// -------------------------------------------------- costanti di compressione
const AUDIO_BITRATE = '64k';    // opus per gli effetti audio (mono)
const AUDIO_MAX_S = 30;         // durata massima di un audio (secondi)
const IMG_MAX_LATO = 800;       // lato massimo di un'immagine (px), di serie
export const LATO_LIBRERIA = 1920; // lato massimo delle immagini della libreria: un effetto
                                   // puo' andare a tutto schermo anche dopo, e un'immagine
                                   // rimpicciolita non si ingrandisce piu' (docs/EFFETTI-SCHERMO.md)
const WEBP_ANIMATO_MAX = 8 * 1024 * 1024; // un WebP animato si tiene com'e': fino a qui
const IMG_QUALITA = 75;         // qualità webp (0..100)
const IMG_DURATA_MS = 5000;     // quanto resta a schermo un'immagine (ms)
const VIDEO_MAX_S = 30;         // durata massima di un video (secondi)
const VIDEO_MAX_ALTEZZA = 720;  // altezza massima di un video (px)
const VIDEO_CRF = 34;           // qualità VP9 (più alto = più compresso)
const TIMEOUT_MS = 150_000;     // oltre questo tempo il processo ffmpeg viene ucciso
                                // (video fino a 30s su CPU debole possono metterci)
// Emote 7TV: convertiamo QUALSIASI file (immagine, GIF trasparente, video) in un
// WebP adatto a 7TV (alpha preservata, piccolo). 7TV accetta immagini/GIF/WebP ma
// NON i video: per questo li trasformiamo noi in WebP animato. Tetti prudenti così
// il file resta ben sotto il limite di 7TV (~7MB) e l'emote si vede bene anche piccola.
const EMOTE_LATO = 384;         // lato massimo dell'emote (px)
const EMOTE_Q = 72;             // qualità webp (0..100)
const EMOTE_FPS = 20;           // fps massimo per le emote animate
const EMOTE_MAX_S = 6;          // durata massima di un'emote animata (secondi)
const EMOTE_MAX_BYTES = 7 * 1024 * 1024;   // limite lato 7TV

// Riconosce la famiglia del file dal mimetype (con qualche estensione di scorta).
// Le GIF (spesso animate) vengono trattate come video → webm.
function rilevaTipo(tipoDichiarato) {
  const m = String(tipoDichiarato || '').toLowerCase();
  if (m === 'image/gif' || m.endsWith('.gif')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('image/')) return 'immagine';
  // scorta su estensioni note (se ci arriva un percorso/nome invece del mime)
  if (/\.(mp3|wav|ogg|m4a|opus|flac|aac)$/.test(m)) return 'audio';
  if (/\.(png|jpe?g|webp|avif|heic|heif|tiff?|bmp)$/.test(m)) return 'immagine';
  if (/\.(mp4|m4v|webm|mov|mkv|avi)$/.test(m)) return 'video';
  throw new Error('tipo di file non supportato (usa audio, immagine o video)');
}

// Un file che il browser non sa nominare (un HEIC, un MKV su certi sistemi
// arriva come «application/octet-stream») si riconosce da quello che c'e'
// dentro, non dal nome: quello che si muove e' un video, un fotogramma solo e'
// un'immagine, solo audio e' un audio.
export function tipoDaSonda(s) {
  if (s && s.codec) return s.animato ? 'video' : 'immagine';
  if (s && s.audio) return 'audio';
  return '';
}

export const FORMATI_LETTI = 'PNG, JPG, WebP, AVIF, GIF, TIFF, MP4, WebM, MOV, MKV, AVI, MP3, WAV e OGG';

// COSA C'E' DENTRO UN FILE, detto da ffmpeg stesso: il codec del primo video e
// se dichiara un canale alfa. ffmpeg senza un file d'uscita esce con errore, ma
// prima stampa l'intestazione, ed e' quella che serve. `alpha_mode: 1` sta fra
// i metadati del flusso, nelle righe rientrate sotto la sua riga «Stream».
// Un flusso che ffmpeg non sa leggere ha il formato dei pixel «none» (il codec
// lo deduce dall'estensione): per noi e' come se non ci fosse, codec ''.
// La trasparenza DICHIARATA viene da due posti: l'alpha_mode dei WebM (dove i
// pixel sembrano yuv420p e l'alfa sta a parte) o un formato di pixel che ha il
// canale alfa (ProRes 4444, PNG, Animation, GIF, APNG, Ut Video, FFV1...).
const PIXEL_CON_ALFA = /^(yuva|rgba|argb|bgra|abgr|gbrap|ya[0-9]|rgba64|bgra64|pal8a)/;
export function leggiSonda(testo) {
  const t = String(testo || '');
  const righe = t.split(/\r?\n/);
  const audio = righe.some((r) => /Stream #\d+:\d+.*: Audio: /.test(r));
  const i = righe.findIndex((r) => /Stream #\d+:\d+.*: Video: /.test(r));
  if (i < 0) return { codec: '', alfa: false, formato: '', audio, animato: false };
  const m = /: Video: ([A-Za-z0-9_]+)[^,]*, ([A-Za-z0-9_]+)/.exec(righe[i]) || [];
  const formato = m[2] && m[2] !== 'none' ? m[2].toLowerCase() : '';
  const codec = formato ? m[1].toLowerCase() : '';
  let alfa = PIXEL_CON_ALFA.test(formato);
  for (let j = i + 1; j < righe.length && /^\s{4,}/.test(righe[j]) && !/Stream #/.test(righe[j]); j++) {
    if (/^\s*alpha_mode\s*:\s*1\s*$/.test(righe[j])) alfa = true;
  }
  const durata = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(t);
  const secondi = durata ? Number(durata[1]) * 3600 + Number(durata[2]) * 60 + Number(durata[3]) : 0;
  return { codec, alfa, formato, audio, animato: secondi > 0.1 && !/image2|_pipe/.test((/Input #0, ([^,]+)/.exec(t) || [])[1] || '') };
}

// Il decodificatore di ffmpeg per VP8 e VP9 ignora il canale alfa dei WebM:
// lo legge solo libvpx. Senza, un video trasparente arriva in onda col fondo
// nero. Si sceglie libvpx solo quando il file dichiara l'alfa.
export function decodificatore({ codec, alfa } = {}) {
  if (!alfa) return [];
  if (codec === 'vp9') return ['-c:v', 'libvpx-vp9'];
  if (codec === 'vp8') return ['-c:v', 'libvpx'];
  return [];
}

// Un WebP animato ha il blocco VP8X col bit dell'animazione. ffmpeg (fino alla
// 7) non lo sa leggere; il browser si', e il file e' gia' compresso.
export function webpAnimato(testa) {
  const b = Buffer.isBuffer(testa) ? testa : Buffer.alloc(0);
  return b.length >= 21 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP'
    && b.toString('latin1', 12, 16) === 'VP8X' && (b[20] & 0x02) !== 0;
}

// Un AVIF (fermo o animato) lo mostra il browser, trasparenza compresa: la
// trasparenza di un AVIF sta in un'immagine a parte che ricomprimendo si
// perderebbe. Si riconosce dal marchio del contenitore: «ftyp» e poi avif/avis.
export function eAvif(testa) {
  const b = Buffer.isBuffer(testa) ? testa : Buffer.alloc(0);
  return b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(b.toString('latin1', 8, 12));
}
const TENUTO_COM_E = (testa) => (webpAnimato(testa) ? 'webp' : eAvif(testa) ? 'avif' : '');

async function testaDi(percorso, n = 32) {
  const f = await open(percorso, 'r');
  try { const b = Buffer.alloc(n); const { bytesRead } = await f.read(b, 0, n, 0); return b.subarray(0, bytesRead); } finally { await f.close(); }
}

// null = ffmpeg non c'e' (lo dira' la compressione con parole sue)
function sonda(percorso) {
  return new Promise((resolve) => {
    let proc;
    try { proc = spawn('ffmpeg', ['-hide_banner', '-i', percorso], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch { return resolve(null); }
    let err = '';
    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* gia' morto */ } }, 20_000);
    proc.stderr?.on('data', (d) => { if (err.length < 20_000) err += d.toString(); });
    proc.on('error', () => { clearTimeout(timer); resolve(null); });
    proc.on('close', () => { clearTimeout(timer); resolve(leggiSonda(err)); });
  });
}

// Da dove leggere: il file, col decodificatore giusto davanti, e se un'immagine
// e' in realta' un'animazione (APNG, o un WebP animato a cui togliere lo
// sfondo) va per la strada dei video. `s` e' quello che la sonda ha visto:
// serve dopo, a controllare che la trasparenza arrivi.
const CODEC_ANIMATI = new Set(['apng', 'webp_anim']);
async function ingresso(tempPath, tipo) {
  if (tipo === 'audio') return { tipo, dentro: ['-i', tempPath], s: null };
  const s = await sonda(tempPath);
  if (s && !s.codec) throw new Error(`questo file non lo so leggere: vanno bene ${FORMATI_LETTI}`);
  const ritmo = s?.codec === 'apng' ? ['-default_fps', '10'] : [];
  return { tipo: tipo === 'immagine' && CODEC_ANIMATI.has(s?.codec) ? 'video' : tipo, dentro: [...decodificatore(s || {}), ...ritmo, '-i', tempPath], s };
}

// IL RITMO DI UN'IMMAGINE ANIMATA (docs/EFFETTI-SCHERMO.md). I browser tengono
// 100 ms ogni fotogramma di una GIF, di un PNG animato o di un WebP animato
// che dichiara 10 ms o meno (la regola di Firefox, WebKit e Chromium, WebKit
// bug 36082): e' cosi' che lo streamer quel file l'ha sempre visto. ffmpeg
// invece tiene il valore scritto, e una GIF da un centesimo andava in onda
// dieci volte piu' veloce. Diventando video i tempi si riscrivono con la stessa
// regola: il fotogramma n parte quando e' finito il precedente, con la durata
// del precedente corretta. Per un PNG animato con durata zero ffmpeg userebbe
// 1/15 di secondo: si chiede 1/10 (-default_fps 10), come il browser. I video
// veri non si toccano: a 120 fps un fotogramma dura 8 ms davvero.
const IMMAGINI_ANIMATE = new Set(['gif', 'apng', 'webp_anim']);
export const RITMO_BROWSER = "setpts='if(eq(N,0),0,PREV_OUTPTS+if(lte((PTS-PREV_INPTS)*TB,0.010001),0.1/TB,PTS-PREV_INPTS))'";

// Il tipo: dal nome che il browser da', e se non ne da' uno che conosciamo,
// da quello che c'e' dentro.
async function tipoDi(tempPath, tipoDichiarato) {
  try { return rilevaTipo(tipoDichiarato); } catch (e) {
    const t = tipoDaSonda(await sonda(tempPath));
    if (!t) throw new Error(`questo file non lo so leggere: vanno bene ${FORMATI_LETTI}`);
    return t;
  }
}

// Ogni uscita parte senza i metadati del file d'origine (-map_metadata -1).
// Con ffmpeg 9 il tag «alpha_mode» copiato dall'ingresso cancella il segno
// AlphaMode del WebM che il browser legge per sapere che c'e' la trasparenza:
// il video restava trasparente dentro e usciva nero in onda. E dai media
// caricati spariscono anche posizione, dispositivo e autore.

// TOGLIERE UNO SFONDO A TINTA UNITA (docs/EFFETTI-SCHERMO.md, «Lo sfondo da
// togliere»). Il filtro colorkey di ffmpeg: per ogni pixel la distanza dal
// colore scelto nello spazio RGB, d = sqrt((dr²+dg²+db²) / (3·255²)); sotto
// «simile» e' trasparente, fra simile e simile+morbido sfuma, sopra resta. Il
// pannello mostra l'anteprima con la stessa formula (chiaveColore in app.js),
// e un test la confronta con ffmpeg pixel per pixel.
// colorkey sovrascrive la trasparenza che c'e' gia': su un file gia'
// trasparente il fondo diventerebbe nero. Allora l'alfa finale e' la minore
// fra quella del file e quella del colore tolto, come nell'anteprima.
export function normChiave(x) {
  if (!x || typeof x !== 'object') return null;
  const colore = String(x.colore || '').toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(colore)) return null;
  const num = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.min(b, Math.max(a, n)) * 100) / 100 : d; };
  return { colore, simile: num(x.simile, 0.01, 0.6, 0.25), morbido: num(x.morbido, 0, 0.4, 0.08) };
}
export function filtroChiave(k, conAlfa) {
  const ck = `colorkey=0x${k.colore.slice(1)}:${k.simile}:${k.morbido}`;
  return conAlfa
    ? `format=rgba,split[o][k];[k]${ck},alphaextract[ka];[o]split[o1][o2];[o1]alphaextract[oa];[oa][ka]blend=all_mode=darken[a];[o2][a]alphamerge`
    : `format=rgba,${ck}`;
}

// VP9 in onda: 4:2:0 a 8 bit, con l'alfa o senza. La scelta non la fa il
// codificatore (ffmpeg 9 gli farebbe prendere un 4:4:4 a 12 bit, che poi
// rifiuta), e non la fa la sonda: la fa il grafo dei filtri guardando i
// fotogrammi veri, che scelgono yuva420p solo se hanno un canale alfa.
const PIXEL_VIDEO = 'format=pix_fmts=yuva420p|yuv420p';

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

// SE IL FILE ERA TRASPARENTE, LO E' ANCHE QUELLO CHE VA IN ONDA. Un video
// che dichiara l'alfa e ne esce senza sarebbe un riquadro nero sulla diretta:
// meglio fermarsi e dirlo. La sonda dell'uscita e' la stessa dell'ingresso.
export async function verificaAlfa(out, s) {
  if (!s || !s.alfa) return;
  const o = await sonda(out);
  if (o && !o.alfa) {
    try { await unlink(out); } catch { /* gia' tolto */ }
    throw new Error('la trasparenza di questo video si perderebbe: esportalo in WebM (VP9 con canale alfa) o in MOV ProRes 4444 e riprova');
  }
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
export async function comprimi(tempPath, tipoDichiarato, destDir, id, { latoImmagine = IMG_MAX_LATO, chiave = null } = {}) {
  try {
    const tipo0 = await tipoDi(tempPath, tipoDichiarato);
    // Con uno sfondo da togliere niente si tiene com'e'. Un WebP animato lo
    // legge ffmpeg 9 fotogramma per fotogramma, alfa compresa, e diventa un
    // video. Un AVIF no: ffmpeg ne legge la trasparenza come un flusso a parte
    // e non la applica, e togliendo il fondo si perderebbe quella del file.
    const k = normChiave(chiave);
    const tenuto = tipo0 === 'immagine' ? TENUTO_COM_E(await testaDi(tempPath)) : '';
    if (k && tenuto === 'avif') throw new Error('da un AVIF lo sfondo non si toglie: caricalo com\'è, o esportalo in PNG, WebP o video e riprova');
    if (tenuto && !k) {
      const { size } = await stat(tempPath);
      if (size > WEBP_ANIMATO_MAX) throw new Error(`${tenuto === 'webp' ? 'WebP animato' : 'AVIF'} troppo pesante: tienilo sotto gli 8 MB, o caricalo come GIF o video`);
      const file = `${id}.${tenuto}`;
      await copyFile(tempPath, join(destDir, file));
      return { tipo: 'immagine', file, durata: IMG_DURATA_MS };
    }
    const { tipo, dentro, s } = await ingresso(tempPath, tipo0);

    if (tipo === 'audio') {
      const file = `${id}.ogg`;
      const out = join(destDir, file);
      await eseguiFfmpeg([
        '-y', ...dentro, '-map_metadata', '-1',
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
        '-y', ...dentro, '-map_metadata', '-1',
        '-vf', `${k ? filtroChiave(k, !!s?.alfa) + ',' : ''}scale='min(${latoImmagine},iw)':'min(${latoImmagine},ih)':force_original_aspect_ratio=decrease`,
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
      '-y', ...dentro, '-map_metadata', '-1',
      '-t', String(VIDEO_MAX_S),
      '-vf', `${IMMAGINI_ANIMATE.has(s?.codec) ? RITMO_BROWSER + ',' : ''}${k ? filtroChiave(k, !!s?.alfa) + ',' : ''}scale=-2:'min(${VIDEO_MAX_ALTEZZA},ih)',${PIXEL_VIDEO}`,
      '-c:v', 'libvpx-vp9', '-crf', String(VIDEO_CRF), '-b:v', '0',
      '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
      '-c:a', 'libopus', '-b:a', AUDIO_BITRATE,
      out,
    ]);
    await verificaOutput(out);
    await verificaAlfa(out, k ? { ...s, alfa: true } : s);
    const reale = await sondaDurataMs(out);
    const durata = Math.min(reale ?? VIDEO_MAX_S * 1000, VIDEO_MAX_S * 1000);
    return { tipo, file, durata };
  } finally {
    // il file temporaneo caricato non serve più, in ogni caso
    try { await unlink(tempPath); } catch { /* già rimosso */ }
  }
}

// Converte un file caricato in un WebP pronto per 7TV (immagine → WebP statico;
// GIF/video → WebP ANIMATO con alpha preservata). Ritorna { file, animato, byte }
// oppure lancia. Cancella SEMPRE il tempPath.
export async function convertiPerEmote(tempPath, tipoDichiarato, destDir, id) {
  try {
    if (await tipoDi(tempPath, tipoDichiarato) === 'audio') throw new Error('un\'emote non può essere un audio');
    if (webpAnimato(await testaDi(tempPath))) {
      const { size } = await stat(tempPath);
      if (size > EMOTE_MAX_BYTES) throw new Error('animazione troppo pesante: prova un video più corto o più piccolo');
      const file = `${id}.webp`;
      await copyFile(tempPath, join(destDir, file));
      return { file, animato: true, byte: size };
    }
    const { tipo, dentro } = await ingresso(tempPath, await tipoDi(tempPath, tipoDichiarato));   // gif e apng → video
    const file = `${id}.webp`;
    const out = join(destDir, file);

    if (tipo === 'immagine') {
      await eseguiFfmpeg([
        '-y', ...dentro, '-map_metadata', '-1',
        '-vf', `scale='min(${EMOTE_LATO},iw)':-2:flags=lanczos`,
        '-frames:v', '1',
        '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(EMOTE_Q),
        out,
      ]);
      await verificaOutput(out);
      const { size } = await stat(out);
      if (size > EMOTE_MAX_BYTES) throw new Error('immagine troppo pesante anche dopo la conversione');
      return { file, animato: false, byte: size };
    }

    // GIF (anche trasparenti) e video → WebP ANIMATO (loop, alpha preservata)
    await eseguiFfmpeg([
      '-y', ...dentro, '-map_metadata', '-1',
      '-t', String(EMOTE_MAX_S),
      '-an',
      '-vf', `fps=${EMOTE_FPS},scale='min(${EMOTE_LATO},iw)':'min(${EMOTE_LATO},ih)':force_original_aspect_ratio=decrease:flags=lanczos`,
      '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(EMOTE_Q), '-compression_level', '5', '-loop', '0',
      out,
    ]);
    await verificaOutput(out);
    const { size } = await stat(out);
    if (size > EMOTE_MAX_BYTES) throw new Error('animazione troppo pesante: prova un video più corto o più piccolo');
    return { file, animato: true, byte: size };
  } finally {
    try { await unlink(tempPath); } catch { /* già rimosso */ }
  }
}

// UN'IMMAGINE CARICATA NON E' UN DOCUMENTO. Un SVG e' testo, e il testo puo'
// contenere script, collegamenti, riferimenti a risorse fuori: servito dal
// nostro dominio a chiunque ne conosca l'indirizzo, e' un documento nostro con
// dentro roba di qualcun altro. La CSP lo tiene a bada, ma una difesa che
// dipende da un header e' una difesa che una riga di configurazione puo'
// togliere. Quindi l'SVG non si conserva: si RASTERIZZA, e resta solo l'immagine.
export async function svgInPng(tempPath, destPath, lato = 256) {
  const { Resvg } = await import('@resvg/resvg-js');
  const sorgente = await readFile(tempPath, 'utf8');
  const r = new Resvg(sorgente, { fitTo: { mode: 'width', value: Math.max(16, Math.min(1024, lato | 0)) } });
  const png = Buffer.from(r.render().asPng());
  await writeFile(destPath, png);
  try { await unlink(tempPath); } catch { /* gia' tolto */ }
  return png.length;
}
