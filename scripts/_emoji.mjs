// Che cos'e' un'emoji, deciso una volta sola.
//
// Serve a due cancelli — quello delle novita' e quello del prodotto — e prima
// ognuno se la sarebbe scritta a modo suo. Peggio: la definizione a portata di
// mano e' quella SBAGLIATA in tutti e due i versi. Elencare i blocchi Unicode
// «dove stanno le emoji» (1F300-1FAFF, 2600-27BF, FE0F) prende in mezzo le
// spunte ✓ ✗, la crocetta ✕, le stelline ★ ✦ — che sono segni tipografici, non
// pittogrammi — e insieme si perde le bandiere, che stanno in un blocco suo.
//
// Un'emoji non e' «un carattere che sta in quel blocco»: e' un carattere che il
// sistema disegna A COLORI invece che come lettera. Unicode lo dice con una
// proprieta' sua, `Emoji_Presentation`, ed e' quella la domanda giusta. Il
// secondo pezzo prende i pittogrammi che di norma sarebbero testo ma che il
// selettore U+FE0F promuove a emoji — il caso del triangolo d'avviso.
//
// Misurato su 17 emoji e 22 segni tipografici: nessuna mancata, nessun falso.

// La definizione sta in UN posto solo, e quel posto e' il motore che disegna le
// locandine (`src/features/carta-disegno.js`): li' serve nel browser, e quel
// file non puo' importare niente. Quindi e' lui la fonte, e qui la si prende.
// Due copie della stessa domanda vorrebbe dire che un giorno un cancello dice
// «emoji» e l'altro no, sullo stesso carattere.
import { EMOJI_G as SORGENTE } from '../src/features/carta-disegno.js';

export const EMOJI = new RegExp(SORGENTE.source, 'u');
export const EMOJI_G = new RegExp(SORGENTE.source, 'gu');

// I pittogrammi trovati in un testo, senza doppioni e in ordine di apparizione.
export const emojiIn = (testo) => [...new Set(String(testo).match(EMOJI_G) || [])];
