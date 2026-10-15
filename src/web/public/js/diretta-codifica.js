// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
import { scriviPacchi, decidi, livelloH264 } from './diretta-pacchi.js';

const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const copia = (x) => { const b = x instanceof ArrayBuffer ? x : (x.buffer ? x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength) : x); return new Uint8Array(b.slice(0)); };
const base64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };

export async function supporto({ larghezza, altezza, fps, kbps }) {
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined' || typeof VideoFrame === 'undefined' || typeof AudioData === 'undefined') return { ok: false, motivo: 'webcodecs' };
  const livello = livelloH264(larghezza, altezza, fps);
  let video = null;
  for (const [profilo, vincoli] of [['64', '00'], ['4d', '00'], ['42', 'e0']]) {
    for (const hw of ['prefer-hardware', 'no-preference']) {
      const cfg = { codec: `avc1.${profilo}${vincoli}${livello}`, width: larghezza, height: altezza, bitrate: kbps * 1000, framerate: fps, hardwareAcceleration: hw, latencyMode: 'realtime', avc: { format: 'avc' } };
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) { video = { cfg, hardware: hw === 'prefer-hardware' }; break; } } catch { }
    }
    if (video) break;
  }
  if (!video) return { ok: false, motivo: 'h264' };
  let audio = null;
  for (const cfg of [
    { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000, aac: { format: 'aac' } },
    { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 },
  ]) {
    try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) { audio = { cfg, nome: cfg.codec === 'opus' ? 'opus' : 'aac' }; break; } } catch { }
  }
  if (!audio) return { ok: false, motivo: 'audio' };
  return { ok: true, video, audio };
}

export function creaSpedizione({ url = '/api/diretta/pacchi', ogniMs = 200, quandoFinisce, quandoRitenta } = {}) {
  const coda = [];
  let n = 0, inVoloDa = 0, fermata = false, turno = '';
  const giro = (async () => {
    while (!fermata) {
      await attendi(ogniMs);
      if (!coda.length) continue;
      const lotto = coda.splice(0, coda.length);
      inVoloDa = lotto[0].t;
      const corpo = scriviPacchi(lotto);
      const seq = n++;
      for (let tentativo = 0; !fermata; tentativo++) {
        try {
          const r = await fetch(`${url}?t=${encodeURIComponent(turno)}&n=${seq}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: corpo, credentials: 'same-origin' });
          if (r.ok) break;
          if (r.status === 409 || r.status === 403 || r.status === 400) {
            let dati = null; try { dati = await r.json(); } catch { }
            fermata = true;
            quandoFinisce?.(dati);
            break;
          }
        } catch { }
        quandoRitenta?.(tentativo + 1);
        await attendi(Math.min(4000, 250 * 2 ** tentativo));
      }
      inVoloDa = 0;
    }
  })();
  return {
    usaTurno(t) { turno = String(t || ''); },
    aggiungi(p) { if (!fermata) coda.push({ ...p, t: performance.now() }); },
    ritardoMs() { const piuVecchio = inVoloDa || (coda[0] && coda[0].t) || 0; return piuVecchio ? performance.now() - piuVecchio : 0; },
    togliVideo() { for (let i = coda.length - 1; i >= 0; i--) if (coda[i].tipo === 'video') coda.splice(i, 1); },
    ferma() { fermata = true; return giro; },
  };
}

export async function creaCodifica({ supporto: sup, canvas, contestoAudio, nodoAudio, fps, kbps, riserva, spedizione, quandoCambia, quandoErrore, disegnaSeNascosto }) {
  let configVideo = null, configAudio = null, verso = 'riserva', soloAudio = false, chiaveForzata = true, fermato = false;
  const raccoltaRiserva = [];
  const consegna = (p) => { if (verso === 'riserva') raccoltaRiserva.push(p); else spedizione.aggiungi(p); };
  const ve = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !configVideo) configVideo = copia(meta.decoderConfig.description);
      const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
      consegna({ tipo: 'video', chiave: chunk.type === 'key', us: chunk.timestamp, dati: d });
    },
    error: (e) => quandoErrore && quandoErrore(e),
  });
  ve.configure({ ...sup.video.cfg, bitrate: kbps * 1000 });
  const ae = new AudioEncoder({
    output: (chunk, meta) => {
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !configAudio) configAudio = copia(meta.decoderConfig.description);
      const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
      consegna({ tipo: 'audio', chiave: true, us: chunk.timestamp, dati: d });
    },
    error: (e) => quandoErrore && quandoErrore(e),
  });
  ae.configure(sup.audio.cfg);

  const passoUs = 1e6 / fps;
  for (let i = 0; i < fps * 2; i++) {
    const f = new VideoFrame(riserva, { timestamp: Math.round(i * passoUs) });
    ve.encode(f, { keyFrame: i === 0 });
    f.close();
  }
  for (let i = 0; i < 47; i++) {
    const silenzio = new Float32Array(1024 * 2);
    const a = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: 1024, numberOfChannels: 2, timestamp: Math.round(i * 1024 * 1e6 / 48000), data: silenzio });
    ae.encode(a); a.close();
  }
  await ve.flush(); await ae.flush();
  if (!configVideo) throw new Error('il codificatore video non ha dato la sua configurazione');

  const inizioUs = 2_000_000 + 1;
  let t0 = 0;
  const ora = () => Math.round(inizioUs + (performance.now() - t0) * 1000);
  let cattura = null, muto = null, giroQualita = 0;

  let kbpsOra = kbps, ultimoCambio = performance.now(), calmaDa = performance.now();
  async function parti() {
    t0 = performance.now();
    verso = 'diretta';
    await contestoAudio.audioWorklet.addModule('/js/diretta-cattura.js');
    if (contestoAudio.sampleRate !== 48000) throw new Error('audio-48k');
    cattura = new AudioWorkletNode(contestoAudio, 'diretta-cattura', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
    muto = contestoAudio.createGain();
    muto.gain.value = 0;
    nodoAudio.connect(cattura);
    cattura.connect(muto);
    muto.connect(contestoAudio.destination);
    const freq = contestoAudio.sampleRate;
    let accumulo = [new Float32Array(1024), new Float32Array(1024)], pieni = 0, campioniTotali = 0, inizioAudioUs = null;
    let prossimoFotogramma = 0;
    cattura.port.onmessage = (ev) => {
      if (fermato) return;
      if (inizioAudioUs === null) inizioAudioUs = ora();
      const [s, d] = ev.data;
      let i = 0;
      while (i < s.length) {
        const quanti = Math.min(1024 - pieni, s.length - i);
        accumulo[0].set(s.subarray(i, i + quanti), pieni);
        accumulo[1].set(d.subarray(i, i + quanti), pieni);
        pieni += quanti; i += quanti;
        if (pieni === 1024) {
          const dati = new Float32Array(2048); dati.set(accumulo[0], 0); dati.set(accumulo[1], 1024);
          const a = new AudioData({ format: 'f32-planar', sampleRate: freq, numberOfFrames: 1024, numberOfChannels: 2, timestamp: Math.round(inizioAudioUs + campioniTotali * 1e6 / freq), data: dati });
          try { ae.encode(a); } catch { }
          a.close();
          campioniTotali += 1024; pieni = 0;
        }
      }
      const adesso = performance.now();
      if (adesso >= prossimoFotogramma) {
        prossimoFotogramma = Math.max(prossimoFotogramma + 1000 / fps, adesso);
        if (!soloAudio && ve.encodeQueueSize <= 2) {
          if (document.hidden && disegnaSeNascosto) disegnaSeNascosto();
          const f = new VideoFrame(canvas, { timestamp: ora() });
          try { ve.encode(f, { keyFrame: chiaveForzata }); chiaveForzata = false; } catch { }
          f.close();
        }
      }
    };

    giroQualita = setInterval(() => {
      if (fermato) return;
      const coda = spedizione.ritardoMs();
      if (coda > 300) calmaDa = performance.now();
      const d = decidi({ codaMs: coda, kbps: kbpsOra, kbpsMeta: kbps, soloAudio, calmaMs: performance.now() - calmaDa, dalCambioMs: performance.now() - ultimoCambio });
      if (!d.cambio) return;
      ultimoCambio = performance.now();
      if (d.kbps !== kbpsOra) { kbpsOra = d.kbps; try { ve.configure({ ...sup.video.cfg, bitrate: kbpsOra * 1000 }); chiaveForzata = true; } catch { } }
      if (d.soloAudio && !soloAudio) spedizione.togliVideo();
      soloAudio = d.soloAudio;
      if (d.chiave) chiaveForzata = true;
      quandoCambia && quandoCambia({ kbps: kbpsOra, soloAudio });
    }, 1000);
  }

  return {
    config: {
      video: { codec: 'avc1', config: base64(configVideo), larghezza: sup.video.cfg.width, altezza: sup.video.cfg.height, fps },
      audio: { codec: sup.audio.nome, config: configAudio ? base64(configAudio) : '', frequenza: 48000, canali: 2 },
    },
    riserva: scriviPacchi(raccoltaRiserva),
    parti,
    forzaChiave() { chiaveForzata = true; },
    stato() { return { kbps: kbpsOra, soloAudio, ritardoMs: spedizione.ritardoMs() }; },
    async ferma() {
      fermato = true;
      clearInterval(giroQualita);
      if (cattura) { try { nodoAudio.disconnect(cattura); cattura.disconnect(); muto.disconnect(); } catch { } try { cattura.port.onmessage = null; } catch { } }
      try { await ve.flush(); } catch { }
      try { await ae.flush(); } catch { }
      try { ve.close(); ae.close(); } catch { }
    },
  };
}
