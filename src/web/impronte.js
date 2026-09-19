// L'IMPRONTA NEL NOME, E LA CACHE CHE NE SEGUE.
//
// Il difetto da cui nasce, misurato sul sito vero: ogni file statico usciva con
// `Cache-Control: public, max-age=0`. Il browser quindi RIVALIDAVA tutto a ogni
// apertura — app.js (464 KB compressi), sei fogli di stile, gli script minori:
// una decina di andate-e-ritorni prima di poter disegnare qualcosa, anche
// quando non era cambiato niente da una settimana. Da telefono e' proprio il
// mezzo secondo che si sente.
//
// La cura NON e' «alziamo i tempi e speriamo»: quella e' una scommessa, e la
// perdi il giorno che pubblichi. E' legare il NOME al CONTENUTO.
//
// Un file il cui indirizzo cambia quando cambia il contenuto si puo' tenere per
// sempre senza rischiare di servire roba vecchia. Non e' una promessa: e' una
// proprieta'. `app.js?v=1a2b3c4d` o e' quel file li', o non esiste.
//
// Da qui scendono tre cose, e nessuna e' una scelta di gusto:
//
//  · l'impronta si calcola dal CONTENUTO (sha1 → otto caratteri), non da una
//    versione scritta a mano. Una versione a mano e' una cosa da ricordarsi, e
//    quella che si dimentica e' sempre quella importante;
//  · `immutable` si da' solo a chi chiede con l'impronta GIUSTA. Chi arriva con
//    una vecchia, o senza, riceve quello di prima — cosi' un indirizzo salvato
//    nei preferiti un anno fa non resta incastrato su una pagina morta;
//  · i gusci HTML escono col nome marcato. Li costruisce il server all'avvio,
//    quindi e' li' che l'impronta entra: non c'e' un passo di build da
//    ricordarsi di far girare, e non nasce una cartella `dist` che puo' andare
//    fuori sincrono con i sorgenti.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import express from 'express';

// Un anno: il massimo che valga la pena dire. `immutable` e' la parte che conta
// — dice al browser di non chiedere NEMMENO quando la persona preme ricarica.
export const CACHE_ETERNA = 'public, max-age=31536000, immutable';
export const CACHE_FRESCA = 'public, max-age=0';

// Quello che si marca: i file che cambiano quando cambiamo noi. I caratteri
// stanno fuori di proposito — hanno gia' un nome che porta la versione dentro,
// e li serviamo eterni per conto loro.
const MARCABILI = new Set(['.js', '.css', '.png', '.svg', '.webp', '.ico', '.json', '.webmanifest']);

const RIF = /(\s(?:src|href)\s*=\s*["'])([^"']+)(["'])/g;

export function creaImpronte(publicDir) {
  const cache = new Map();   // via → { impronta, mtime }

  const fileDi = (via) => {
    const dentro = normalize(join(publicDir, via));
    return dentro.startsWith(publicDir + '/') ? dentro : null;
  };

  // L'impronta di un file. Si ricalcola se il file e' cambiato sotto i piedi
  // (in sviluppo succede a ogni salvataggio); in produzione il processo riparte
  // a ogni pubblicazione, quindi si calcola una volta e basta.
  const di = (via) => {
    const file = fileDi(via);
    if (!file) return '';
    let st;
    try { st = statSync(file); } catch { return ''; }
    if (!st.isFile()) return '';
    const avuta = cache.get(via);
    if (avuta && avuta.mtime === st.mtimeMs) return avuta.impronta;
    let impronta = '';
    try {
      impronta = createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8);
    } catch { return ''; }
    cache.set(via, { impronta, mtime: st.mtimeMs });
    return impronta;
  };

  // Il percorso come lo chiede il browser, a partire da un riferimento scritto
  // nella pagina. Relativo o assoluto; tutto il resto (http:, data:, #, //) non
  // e' roba nostra e non si tocca.
  const viaDi = (rif, da = '/') => {
    const grezzo = String(rif || '').trim();
    if (!grezzo || grezzo.startsWith('#') || grezzo.startsWith('//')) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(grezzo)) return null;
    let via;
    try { via = new URL(grezzo, 'http://impronte' + da).pathname; } catch { return null; }
    return MARCABILI.has(extname(via).toLowerCase()) ? via : null;
  };

  // Marca i riferimenti di una pagina. Una query che c'era gia' si SOSTITUISCE:
  // il `?v=8` scritto a mano sulle icone era la stessa cosa fatta a memoria, e
  // la memoria e' la parte che si rompe.
  const marca = (html, da = '/') => String(html || '').replace(RIF, (tutto, apre, rif, chiude) => {
    const via = viaDi(rif, da);
    if (!via) return tutto;
    const imp = di(via);
    if (!imp) return tutto;
    return apre + rif.split('?')[0].split('#')[0] + '?v=' + imp + chiude;
  });

  // Chi chiede con l'impronta giusta ha in mano una cosa che non puo' cambiare.
  const eterna = (via, v) => !!v && di(via) === String(v);

  return { di, marca, eterna };
}

// Il montaggio degli statici, in un posto solo: cosi' quello che prova il
// collaudo e' esattamente quello che gira in produzione, non una copia che gli
// somiglia.
export function montaStatici(app, publicDir, { minifica = null, impronte = null } = {}) {
  const imp = impronte || creaImpronte(publicDir);

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let via;
    try { via = decodeURIComponent(req.path); } catch { return next(); }
    if (imp.eterna(via, req.query?.v)) res.locals.eterno = true;
    // I caratteri non cambiano mai col nome che hanno: sono eterni per natura,
    // senza bisogno di un'impronta. E l'intestazione la mette UNA parte sola —
    // due `Cache-Control` in contraddizione sono due risposte alla stessa
    // domanda, e nessuno sa quale vince.
    else if (via.startsWith('/vendor/font/')) res.locals.eterno = true;
    next();
  });

  if (minifica) app.use(minifica);
  app.use(express.static(publicDir, {
    setHeaders: (res) => { if (res.locals?.eterno) res.setHeader('Cache-Control', CACHE_ETERNA); },
  }));
  return imp;
}
