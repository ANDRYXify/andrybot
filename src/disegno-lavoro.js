// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL FILO DEL DISEGNO (vedi src/disegno.js). Qui si rasterizza e si codifica il
// PNG: il filo del bot non si ferma mai per un'immagine.
import { parentPort } from 'node:worker_threads';
import { Resvg } from '@resvg/resvg-js';

parentPort.on('message', ({ id, svg, opzioni, voglio }) => {
  try {
    const r = new Resvg(svg, opzioni).render();
    const fuori = { id, width: r.width, height: r.height };
    const passa = [];
    if (voglio?.png) { fuori.png = new Uint8Array(r.asPng()); passa.push(fuori.png.buffer); }
    if (voglio?.pixels) { fuori.pixels = new Uint8Array(r.pixels); passa.push(fuori.pixels.buffer); }
    parentPort.postMessage(fuori, passa);
  } catch (e) {
    parentPort.postMessage({ id, errore: String(e?.message || e) });
  }
});
