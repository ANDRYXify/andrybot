// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CARTELLA DEI DATI DI UN CANCELLO: sempre nuova, e scelta PRIMA di tutto.
//
// Un cancello che scriveva «DATA_DIR = DATA_DIR || cartella nuova» nel suo
// corpo la sceglieva troppo tardi: gli import statici girano prima del corpo,
// e _sito.mjs porta con se' moduli che aprono la configurazione e il
// database. Senza DATA_DIR la configurazione prende «./data», che sul server
// (il collaudo di aggiorna.sh gira nella radice del progetto) e' la cartella
// VERA: a ogni aggiornamento i canali di prova del cancello dello scudo di
// Telegram (prova, proven, spento) finivano nel database vero, col loro
// Telegram finto.
//
// Questo file si importa per PRIMO, e gli import si eseguono nell'ordine in
// cui sono scritti: quando qualunque altro modulo apre i dati, la cartella e'
// gia' questa. Sempre nuova, anche se fuori ce n'e' gia' una: un cancello non
// lavora mai sui dati di qualcun altro. SB_COLLAUDO accende la guardia di
// config.js, che rifiuta la cartella vera anche se qualcuno sbaglia l'ordine.
//
// E se ne va con lui. Prima restava: ottomila cartelle «cancello-» in /tmp
// dopo qualche giorno di collaudi, e sul server il collaudo di ogni
// aggiornamento riempiva il disco un po' di piu'. All'uscita (anche con
// process.exit) la cartella si toglie; un processo ucciso a forza la lascia,
// ma i giri di `npm test` e `npm run cancelli` girano gia' con TMPDIR in una
// cartella loro, che si toglie a giro finito (package.json).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cartella = mkdtempSync(join(tmpdir(), 'cancello-'));
process.env.DATA_DIR = cartella;
process.env.SB_COLLAUDO = '1';
process.on('exit', () => { try { rmSync(cartella, { recursive: true, force: true }); } catch { /* gia' andata */ } });
