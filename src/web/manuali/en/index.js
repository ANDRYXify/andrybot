// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I manuali in inglese: uno per file in questa cartella, legati all'italiano dallo
// stesso `id` (lo slug italiano). Schede e data si ereditano dalla voce
// italiana quando qui non ci sono. Vedi docs/LINGUE.md.
//
// L'elenco non si scrive a mano: e' la cartella. Un file che c'e' e' una
// traduzione, e una traduzione non puo' restare fuori perche' qualcuno si e'
// dimenticato di aggiungerla qui. L'ordine lo decide l'elenco italiano.
import { readdirSync } from 'node:fs';

const QUI = new URL('./', import.meta.url);
const file = readdirSync(QUI).filter((f) => f.endsWith('.js') && f !== 'index.js').sort();
export default (await Promise.all(file.map((f) => import(new URL(f, QUI).href)))).map((m) => m.default);
