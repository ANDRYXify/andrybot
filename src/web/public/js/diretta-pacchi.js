// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
export const TESTA_PACCO = 16;
const TIPI = { video: 1, audio: 2, vod: 3 }, NOMI = ['', 'video', 'audio', 'vod'];

export function scriviPacchi(pacchi) {
  const totale = pacchi.reduce((n, p) => n + TESTA_PACCO + p.dati.byteLength, 0);
  const fuori = new Uint8Array(totale);
  const vista = new DataView(fuori.buffer);
  let i = 0;
  for (const p of pacchi) {
    fuori[i] = TIPI[p.tipo] || 2;
    fuori[i + 1] = p.chiave ? 1 : 0;
    vista.setFloat64(i + 4, p.us);
    vista.setUint32(i + 12, p.dati.byteLength);
    fuori.set(p.dati instanceof Uint8Array ? p.dati : new Uint8Array(p.dati), i + TESTA_PACCO);
    i += TESTA_PACCO + p.dati.byteLength;
  }
  return fuori;
}

export function leggiPacchi(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const vista = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const fuori = [];
  let i = 0;
  while (i + TESTA_PACCO <= b.length) {
    const tipo = b[i];
    const us = vista.getFloat64(i + 4);
    const n = vista.getUint32(i + 12);
    if (!NOMI[tipo] || !Number.isFinite(us) || i + TESTA_PACCO + n > b.length) throw new Error('pacco storto');
    fuori.push({ tipo: NOMI[tipo], chiave: (b[i + 1] & 1) === 1, us, dati: b.subarray(i + TESTA_PACCO, i + TESTA_PACCO + n) });
    i += TESTA_PACCO + n;
  }
  if (i !== b.length) throw new Error('pacco tronco');
  return fuori;
}

export const SCALA = { giu: 0.7, su: 1.15, minimoKbps: 800, ritardoGiuMs: 2000, ritardoSoloAudioMs: 6000, rientroMs: 500, calmaPerSalireMs: 20000, pausaFraCambiMs: 3000 };

export function decidi({ codaMs, kbps, kbpsMeta, soloAudio, calmaMs, dalCambioMs }) {
  const tieni = { kbps, soloAudio, chiave: false, cambio: false };
  if (codaMs > SCALA.ritardoSoloAudioMs) return soloAudio ? tieni : { kbps: Math.max(SCALA.minimoKbps, Math.round(kbps * SCALA.giu)), soloAudio: true, chiave: false, cambio: true };
  if (soloAudio) return codaMs < SCALA.rientroMs ? { kbps, soloAudio: false, chiave: true, cambio: true } : tieni;
  if (dalCambioMs < SCALA.pausaFraCambiMs) return tieni;
  if (codaMs > SCALA.ritardoGiuMs && kbps > SCALA.minimoKbps) return { kbps: Math.max(SCALA.minimoKbps, Math.round(kbps * SCALA.giu)), soloAudio: false, chiave: false, cambio: true };
  if (codaMs < 300 && calmaMs > SCALA.calmaPerSalireMs && kbps < kbpsMeta) return { kbps: Math.min(kbpsMeta, Math.round(kbps * SCALA.su)), soloAudio: false, chiave: false, cambio: true };
  return tieni;
}

export function livelloH264(larghezza, altezza, fps) {
  const fotogramma = Math.ceil(larghezza / 16) * Math.ceil(altezza / 16);
  const mbs = fotogramma * fps;
  if (fotogramma <= 8192 && mbs <= 245760) return '28';
  if (fotogramma <= 8704 && mbs <= 522240) return '2a';
  if (fotogramma <= 22080 && mbs <= 589824) return '32';
  return '33';
}
