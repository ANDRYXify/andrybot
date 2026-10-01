// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUELLO CHE RICEVE IL BROWSER delle regole dell'economia (docs/ECONOMIA.md).
//
// Il pannello mostra quanto rende una diretta con le regole che si stanno
// scegliendo. Quei conti li fa con `economia-regole.js` — quel file, lo stesso
// con cui il bot da' le monete, non una copia: cosi' il pannello non puo' dire
// una cosa e il bot farne un'altra. Esce senza commenti, come il disegno della
// carta (carta-servita.js), e in un file senza database, perche' lo serve anche
// il sito dei collaudi.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spoglia } from '../spoglia.js';

const QUI = dirname(fileURLToPath(import.meta.url));

const _serviti = new Map();
const servito = (file) => {
  if (!_serviti.has(file)) {
    let t = '';
    try { t = spoglia(readFileSync(join(QUI, file), 'utf8'), 'js'); } catch { t = ''; }
    _serviti.set(file, t);
  }
  return _serviti.get(file);
};
export const regolePerIlBrowser = () => servito('economia-regole.js');
// Lo stesso per le regole del giro dei giochi automatici (giro-regole.js): il
// pannello mostra le percentuali e i tempi coi conti del bot.
export const giroPerIlBrowser = () => servito('giro-regole.js');
