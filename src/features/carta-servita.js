// QUELLO CHE RICEVE IL BROWSER del disegno della carta.
//
// L'editor disegna l'anteprima con la STESSA funzione che disegna l'immagine
// che parte. Perché possa, il browser deve ricevere `carta-disegno.js` — quel
// file, non una copia da riallineare a mano.
//
// Esce senza commenti: quel file ne ha, e le spiegazioni non devono arrivare a
// chi apre F12. Lo spoglio sta qui, in una funzione sola, perché non deve
// esserci un posto in cui qualcuno possa dimenticarselo: chi serve il modulo e
// chi lo verifica chiamano questa, e non c'è una seconda strada.
//
// E sta in un file suo, separato da `cartalive.js`, per una ragione pratica:
// così lo può chiamare anche il sito dei collaudi, che deve servire le stesse
// cose del server vero ma non può tirarsi dietro il database.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spoglia } from '../spoglia.js';
import { CARATTERI } from './carta-disegno.js';

const QUI = dirname(fileURLToPath(import.meta.url));

export const CARTELLA_CARATTERI = join(QUI, '../../assets/font');

// I caratteri che il browser può chiedere: solo questi nomi, e sono gli stessi
// file che carica il rasterizzatore. Un carattere diverso fra anteprima e
// immagine vera sposterebbe ogni testo di qualche pixel.
export const CARATTERI_AMMESSI = new Set(CARATTERI.map(([, file]) => file));

let _servito = null;
export function disegnoPerIlBrowser() {
  if (_servito === null) {
    try { _servito = spoglia(readFileSync(join(QUI, 'carta-disegno.js'), 'utf8'), 'js'); } catch { _servito = ''; }
  }
  return _servito;
}
