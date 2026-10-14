// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL DISEGNO FUORI DAL FILO DEL BOT (docs/RISORSE.md, «Alleggerimento»).
//
// Una carta della diretta (1200×630) fermava il bot circa 30 ms: metà per
// rasterizzare, metà per codificare il PNG, tutte e due sul filo che tiene la
// chat e gli alert. Qui l'SVG va a un filo suo e torna come PNG o come pixel:
// da questo modulo in su nessuno rasterizza piu' sul filo del bot, e un
// collaudo tiene fermo che `new Resvg(` esista solo nel lavoratore.
import { Worker } from 'node:worker_threads';

export function creaDisegnatore() {
  let w = null;
  let n = 0;
  const attese = new Map();
  const tutteFallite = (e) => {
    for (const a of attese.values()) a.no(e instanceof Error ? e : new Error(String(e)));
    attese.clear();
    w = null;
  };
  const avvia = () => {
    w = new Worker(new URL('./disegno-lavoro.js', import.meta.url));
    w.unref();
    w.on('message', ({ id, errore, width, height, png, pixels }) => {
      const a = attese.get(id);
      if (!a) return;
      attese.delete(id);
      if (!attese.size) w?.unref();
      if (errore) return a.no(new Error(errore));
      a.si({
        width, height,
        png: png ? Buffer.from(png.buffer, png.byteOffset, png.byteLength) : null,
        pixels: pixels || null,
      });
    });
    w.on('error', tutteFallite);
    w.on('exit', () => tutteFallite(new Error('il filo del disegno si e\' fermato')));
  };
  // Mentre qualcuno aspetta un disegno il filo tiene vivo il processo; a vuoto no.
  const disegna = (svg, opzioni = {}, voglio = { png: true }) => new Promise((si, no) => {
    if (!w) avvia();
    const id = ++n;
    attese.set(id, { si, no });
    w.ref();
    w.postMessage({ id, svg: String(svg), opzioni, voglio });
  });
  disegna.chiudi = () => { const x = w; w = null; return x ? x.terminate() : Promise.resolve(); };
  return disegna;
}

export const disegna = creaDisegnatore();
