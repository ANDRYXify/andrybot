// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL FILO DELLA MINIFICAZIONE (vedi creaLavoratore in minifica.js).
//
// Qui gira solo terser: il lavoro pesante sta in questo filo, e quello
// principale, che serve le pagine e tiene il bot in chat, non si ferma mai.
import { parentPort } from 'node:worker_threads';
import { minificaJs } from './minifica.js';

parentPort.on('message', async ({ id, sorgente }) => {
  try {
    parentPort.postMessage({ id, codice: await minificaJs(sorgente) });
  } catch (e) {
    parentPort.postMessage({ id, errore: String(e?.message || e) });
  }
});
