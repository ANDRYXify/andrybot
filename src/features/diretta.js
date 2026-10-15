// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL TRAMITE DELLA DIRETTA (docs/DIRETTA.md, «La beta»).
//
// L'invariante: il video lo codifica il dispositivo, qui non si decodifica e
// non si ricodifica mai. Il server riceve pacchetti H.264 gia' pronti, li scrive
// in un flusso Matroska e li passa a UN ffmpeg che li copia verso tutte le
// destinazioni insieme (`-c:v copy`, `-f tee`). L'unica conversione ammessa e'
// l'audio Opus in AAC, perche' le piattaforme non accettano Opus.
//
// La riserva: prima di partire il dispositivo consegna due secondi della sua
// immagine «torno subito» e un secondo di silenzio, codificati con lo stesso
// codificatore. Quando una traccia smette di arrivare, qui la si riempie con la
// riserva, nel tempo giusto, e la diretta non cade. Al ritorno il video
// riprende solo da un fotogramma chiave.
//
// Lo scudo: ogni diretta e' un permesso della classe `diretta` (src/risorse.js),
// entra solo se la banda dichiarata del server la regge, e chi manda piu' di
// quanto ha dichiarato viene fermato.
import { randomBytes } from 'node:crypto';
import { risorse as risorseDiSerie } from '../risorse.js';
import { testata, creaScrittore, TRACCIA, leggiPacchi } from './diretta-mkv.js';

export const ATTESA_RISERVA_MS = 1_500;
export const ASSENZA_MAX_MS = 10 * 60_000;
export const FINESTRA_BYTE_MS = 10_000;
export const BITRATE_MAX_KBPS = 12_000;
export const CODA_MAX_BYTE = 16 * 1024 * 1024;

const TEE_VIETATI = /[|[\]\s\\]/;
export function indirizzoBuono(url) {
  const u = String(url || '');
  return /^rtmps?:\/\/[^/]+\/.+/i.test(u) && !TEE_VIETATI.test(u) && u.length <= 600;
}

// ffmpeg legge il Matroska dallo stdin e copia il video; l'audio si copia se
// e' AAC, si converte se e' Opus. Mai un codificatore video.
export function argomenti(destinazioni, audioCodec) {
  const tee = destinazioni.map((d) => `[f=flv:onfail=ignore:flvflags=no_duration_filesize]${d.url}`).join('|');
  return [
    '-hide_banner', '-loglevel', 'warning', '-nostats',
    '-f', 'matroska', '-i', 'pipe:0',
    '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'copy',
    ...(audioCodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000']),
    '-f', 'tee', tee,
  ];
}

const mascherato = (s, destinazioni) => destinazioni.reduce((t, d) => t.split(d.url).join(`[${d.nome || d.id}]`), String(s));

export function creaTramite({ risorse = risorseDiSerie, ffmpeg = 'ffmpeg', ora = () => Date.now(), bandaMbps = 300, log = null, ogniMs = 100 } = {}) {
  const sessioni = new Map();
  let giro = null;

  const kbpsImpegnati = () => [...sessioni.values()].reduce((n, s) => n + s.kbps * s.destinazioni.length, 0);

  function accendiGiro() {
    if (giro || !ogniMs) return;
    giro = setInterval(() => { for (const s of sessioni.values()) curaTempo(s); }, ogniMs);
    giro.unref?.();
  }
  function spegniGiroSeVuoto() { if (!sessioni.size && giro) { clearInterval(giro); giro = null; } }

  function scrivi(s, buf) {
    const w = s.ff.stdin;
    if (!w || w.destroyed || !w.writable) return;
    if (w.writableLength > CODA_MAX_BYTE) { fine(s, 'uscita-lenta'); return; }
    try { w.write(buf); } catch { /* ffmpeg gia' chiuso: lo dice l'uscita */ }
  }

  function emetti(s, tipo, ms, chiave, dati) {
    if (ms <= s.ultimo[tipo]) return false;
    s.ultimo[tipo] = ms;
    scrivi(s, s.blocco(TRACCIA[tipo], ms, chiave, dati));
    return true;
  }

  // L'orologio d'uscita: millisecondi di diretta, presi dal muro del server
  // dal primo pacchetto in poi.
  const orologio = (s) => (s.muro0 == null ? 0 : ora() - s.muro0);

  function curaTempo(s) {
    if (s.finita) return;
    const adesso = ora();
    const assenteV = adesso - s.arrivo.video, assenteA = adesso - s.arrivo.audio;
    if (Math.min(assenteV, assenteA) > s.assenzaMax) { fine(s, 'assente'); return; }
    if (s.muro0 == null || !s.riserva) return;
    const bersaglio = orologio(s) - 500;
    if (assenteA > ATTESA_RISERVA_MS) {
      if (!s.inRiserva.audio) { s.inRiserva.audio = true; s.giroA = 0; }
      while (s.ultimo.audio + s.riserva.durataA <= bersaglio) {
        const p = s.riserva.audio[s.giroA++ % s.riserva.audio.length];
        emetti(s, 'audio', s.ultimo.audio + s.riserva.durataA, true, p.dati);
      }
    }
    if (assenteV > ATTESA_RISERVA_MS) {
      if (!s.inRiserva.video) { s.inRiserva.video = true; s.giroV = 0; s.serveChiave = true; }
      const fino = s.inRiserva.audio ? bersaglio : Math.max(bersaglio, s.ultimo.audio);
      while (s.ultimo.video + s.riserva.durataV <= fino) {
        const i = s.giroV++ % s.riserva.video.length;
        const p = s.riserva.video[i];
        emetti(s, 'video', s.ultimo.video + s.riserva.durataV, p.chiave, p.dati);
      }
    }
  }

  // Al ritorno la riserva si completa fino al primo pacchetto vero: la riserva
  // corre mezzo secondo indietro rispetto all'orologio, e senza questo il
  // ritorno lascerebbe quel mezzo secondo vuoto.
  function riempiFino(s, tipo, ms) {
    if (!s.riserva) return;
    const video = tipo === 'video';
    const passo = video ? s.riserva.durataV : s.riserva.durataA;
    while (s.ultimo[tipo] + passo < ms - passo / 2) {
      const p = video ? s.riserva.video[s.giroV++ % s.riserva.video.length] : s.riserva.audio[s.giroA++ % s.riserva.audio.length];
      emetti(s, tipo, s.ultimo[tipo] + passo, video ? p.chiave : true, p.dati);
    }
  }

  function fine(s, motivo) {
    if (s.finita) return;
    s.finita = true;
    s.motivo = motivo;
    try { s.ff.stdin?.end(); } catch { /* niente */ }
    const ff = s.ff;
    setTimeout(() => { try { if (ff.exitCode == null) ff.kill('SIGKILL'); } catch { /* niente */ } }, 3_000).unref?.();
    s.rendi();
    if (sessioni.get(s.login) === s) sessioni.delete(s.login);
    s.ultimaFine = { motivo, alle: ora(), errore: s.errore };
    finite.set(s.login, s.ultimaFine);
    spegniGiroSeVuoto();
    log?.info?.(`diretta #${s.login} finita: ${motivo}`);
  }
  const finite = new Map();

  // Una diretta ha un mittente solo: il turno dell'ultimo avvio. Chi riprende
  // con la stessa codifica continua la stessa diretta (le piattaforme non
  // vedono interruzioni); con una codifica diversa il flusso gia' annunciato non
  // la potrebbe portare, e la diretta di prima si chiude per lasciare il posto.
  const stessaCodifica = (s, video, audio) => s.audio === audio?.codec && s.fps === video?.fps
    && s.misure === `${video?.larghezza}x${video?.altezza}` && Buffer.from(video?.config || []).equals(s.config.video)
    && Buffer.from(audio?.config || []).equals(s.config.audio);

  function avvia(login, { destinazioni, video, audio, kbps, assenzaMaxMs = ASSENZA_MAX_MS, riprendi = false } = {}) {
    const ch = String(login || '').toLowerCase();
    if (!ch) return { ok: false, motivo: 'chi' };
    const prima = sessioni.get(ch);
    if (prima && !riprendi) return { ok: false, motivo: 'gia' };
    if (prima && stessaCodifica(prima, video, audio)) {
      prima.turno = randomBytes(8).toString('hex');
      prima.riancora = true;
      prima.serveChiave = true;
      prima.ultimoN = -1;
      prima.assenzaMax = assenzaMaxMs;
      log?.info?.(`diretta #${ch} ripresa`);
      return { ok: true, turno: prima.turno, ripresa: true };
    }
    const dest = (destinazioni || []).filter((d) => indirizzoBuono(d.url));
    if (!dest.length) return { ok: false, motivo: 'destinazioni' };
    if (video?.codec !== 'avc1' || !video?.config?.length || !(video.larghezza > 0) || !(video.altezza > 0) || !(video.fps > 0)) return { ok: false, motivo: 'video' };
    if (!['aac', 'opus'].includes(audio?.codec) || !(audio.frequenza > 0) || !(audio.canali > 0) || (audio.codec === 'aac' && !audio.config?.length)) return { ok: false, motivo: 'audio' };
    const k = Math.min(BITRATE_MAX_KBPS, Math.max(300, Math.round(Number(kbps) || 0)));
    if (kbpsImpegnati() + k * dest.length > bandaMbps * 1000 * 0.8) return { ok: false, motivo: 'banda' };
    if (prima) fine(prima, 'sostituita');
    const rendi = risorse.prova('diretta', ch);
    if (!rendi) return { ok: false, motivo: 'carico' };
    let ff;
    try { ff = risorse.avvia(ffmpeg, argomenti(dest, audio.codec), { stdio: ['pipe', 'ignore', 'pipe'] }); }
    catch { rendi(); return { ok: false, motivo: 'ffmpeg' }; }
    const s = {
      login: ch, ff, rendi, destinazioni: dest, kbps: k, audio: audio.codec, fps: video.fps,
      misure: `${video.larghezza}x${video.altezza}`, turno: randomBytes(8).toString('hex'), riancora: false,
      config: { video: Buffer.from(video.config), audio: Buffer.from(audio.config || []) }, inizio: ora(), muro0: null, offset: null,
      ultimo: { video: -Infinity, audio: -Infinity }, arrivo: { video: ora(), audio: ora() },
      inRiserva: { video: false, audio: false }, serveChiave: true, riserva: null, giroV: 0, giroA: 0,
      blocco: creaScrittore(), byte: 0, finestra: [], ultimoN: -1, assenzaMax: assenzaMaxMs, finita: false, errore: '',
    };
    sessioni.set(ch, s);
    finite.delete(ch);
    let err = '';
    ff.stderr?.on('data', (d) => { err = (err + d).slice(-2000); s.errore = mascherato(err.trim().split('\n').pop() || '', dest).slice(0, 300); });
    ff.stdin?.on('error', () => {});
    ff.on('error', () => fine(s, 'ffmpeg'));
    ff.on('exit', () => fine(s, s.finita ? s.motivo : 'uscita'));
    scrivi(s, testata({ video: { ...video, config: s.config.video }, audio: { ...audio, config: audio.config ? Buffer.from(audio.config) : null } }));
    accendiGiro();
    log?.info?.(`diretta #${ch} partita verso ${dest.map((d) => d.nome || d.id).join(', ')}`);
    return { ok: true, turno: s.turno };
  }

  // La riserva: pacchetti della stessa codifica, il primo video e' chiave.
  function riserva(login, buf, turno) {
    const s = sessioni.get(String(login || '').toLowerCase());
    if (!s) return { ok: false, motivo: 'nessuna' };
    if (turno !== s.turno) return { ok: false, motivo: 'altrove' };
    let pacchi;
    try { pacchi = leggiPacchi(buf); } catch { return { ok: false, motivo: 'pacchi' }; }
    const v = pacchi.filter((p) => p.tipo === 'video'), a = pacchi.filter((p) => p.tipo === 'audio');
    if (!v.length || !v[0].chiave || !a.length) return { ok: false, motivo: 'riserva' };
    const passo = (xs, ripiego) => (xs.length > 1 ? Math.max(1, (xs[xs.length - 1].us - xs[0].us) / 1000 / (xs.length - 1)) : ripiego);
    s.riserva = {
      video: v.map((p) => ({ chiave: p.chiave, dati: Buffer.from(p.dati) })), audio: a.map((p) => ({ dati: Buffer.from(p.dati) })),
      durataV: passo(v, 1000 / s.fps), durataA: passo(a, s.audio === 'aac' ? 1024 / 48 : 20),
    };
    return { ok: true };
  }

  function pacchi(login, n, buf, turno) {
    const s = sessioni.get(String(login || '').toLowerCase());
    if (!s) return { ok: false, motivo: 'nessuna' };
    if (turno !== s.turno) return { ok: false, motivo: 'altrove' };
    const seq = Number(n);
    if (Number.isFinite(seq) && seq <= s.ultimoN) return { ok: true, doppio: true };
    let lista;
    try { lista = leggiPacchi(buf); } catch { return { ok: false, motivo: 'pacchi' }; }
    if (Number.isFinite(seq)) s.ultimoN = seq;
    const adesso = ora();
    s.byte += buf.length;
    s.finestra.push([adesso, buf.length]);
    while (s.finestra.length && adesso - s.finestra[0][0] > FINESTRA_BYTE_MS) s.finestra.shift();
    const inFinestra = s.finestra.reduce((t, [, b]) => t + b, 0);
    if (adesso - s.inizio > FINESTRA_BYTE_MS && inFinestra * 8 / FINESTRA_BYTE_MS > (s.kbps * 1.5 + 256)) { fine(s, 'troppo'); return { ok: false, motivo: 'troppo' }; }
    for (const p of lista) {
      // Il tempo del dispositivo si aggancia all'orologio d'uscita sul primo
      // fotogramma chiave: all'inizio, e di nuovo quando un dispositivo riprende
      // col suo orologio che riparte da capo.
      if (s.offset == null || s.riancora) {
        if (p.tipo !== 'video' || !p.chiave) continue;
        if (s.muro0 == null) s.muro0 = adesso;
        s.offset = (adesso - s.muro0) - p.us / 1000;
        s.riancora = false;
      }
      let ms = p.us / 1000 + s.offset;
      s.arrivo[p.tipo] = adesso;
      if (p.tipo === 'video') {
        if (s.serveChiave && !p.chiave) continue;
        if (s.inRiserva.video || s.serveChiave) {
          if (ms <= s.ultimo.video) { s.offset += s.ultimo.video - ms + 1000 / s.fps; ms = p.us / 1000 + s.offset; }
          if (s.inRiserva.video) riempiFino(s, 'video', ms);
          s.inRiserva.video = false;
          s.serveChiave = false;
        }
      } else if (s.inRiserva.audio) {
        if (ms <= s.ultimo.audio) continue;
        riempiFino(s, 'audio', ms);
        s.inRiserva.audio = false;
      }
      emetti(s, p.tipo, ms, p.chiave, p.dati);
    }
    curaTempo(s);
    return { ok: true };
  }

  function stato(login) {
    const ch = String(login || '').toLowerCase();
    const s = sessioni.get(ch);
    if (!s) return { live: false, ultimaFine: finite.get(ch) || null };
    const adesso = ora();
    const inFinestra = s.finestra.filter(([t]) => adesso - t <= FINESTRA_BYTE_MS).reduce((t, [, b]) => t + b, 0);
    return {
      live: true, da: s.inizio, byte: s.byte, kbpsVeri: Math.round(inFinestra * 8 / FINESTRA_BYTE_MS), kbpsDichiarati: s.kbps,
      destinazioni: s.destinazioni.map((d) => d.nome || d.id), ids: s.destinazioni.map((d) => d.id), riserva: !!s.riserva, inRiserva: { ...s.inRiserva }, errore: s.errore,
    };
  }

  return {
    avvia, riserva, pacchi, stato,
    ferma: (login, motivo = 'fermata', turno = null) => { const s = sessioni.get(String(login || '').toLowerCase()); if (!s || (turno && turno !== s.turno)) return false; fine(s, motivo); return true; },
    attiva: (login) => sessioni.has(String(login || '').toLowerCase()),
    chiudiTutto: () => { for (const s of [...sessioni.values()]) fine(s, 'spegnimento'); },
    curaTempo: (login) => { const s = sessioni.get(String(login || '').toLowerCase()); if (s) curaTempo(s); },
  };
}
