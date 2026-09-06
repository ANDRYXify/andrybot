// La tavolozza del prodotto sta in UN posto solo: `public/tema.css`.
//
// Le pagine composte dal server, l'immagine di anteprima e le icone dell'app
// avevano ognuna la propria copia dei colori scritta a mano, e le copie
// restavano indietro: si cliccava «Guide» dalla vetrina e si finiva in un altro
// prodotto, l'anteprima del link mostrava il marchio di due versioni prima.
// Adesso leggono tutte di qui, quindi il giorno che il marchio cambia cambia
// tutto insieme, senza che nessuno debba ricordarsene.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VIA = join(dirname(fileURLToPath(import.meta.url)), 'public', 'tema.css');

const SELETTORE = {
  chiaro: ':root {',
  scuro: ':root[data-theme="dark"]',
};

function blocco(css, selettore) {
  const i = css.indexOf(selettore);
  if (i < 0) throw new Error(`tavolozza: non trovo ${selettore} in tema.css`);
  const a = css.indexOf('{', i);
  return css.slice(a + 1, css.indexOf('}', a));
}

function leggi() {
  const css = readFileSync(VIA, 'utf8');
  const fuori = {};
  for (const [tema, sel] of Object.entries(SELETTORE)) {
    const b = blocco(css, sel);
    const voci = {};
    for (const m of b.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) voci[m[1]] = m[2].trim();
    fuori[tema] = voci;
  }
  // Lo scuro ridefinisce solo quel che cambia: il resto lo eredita dal chiaro.
  fuori.scuro = { ...fuori.chiaro, ...fuori.scuro };
  return fuori;
}

export const TAVOLOZZA = leggi();

export function tinta(nome, tema = 'chiaro') {
  const v = TAVOLOZZA[tema]?.[nome];
  if (!v) throw new Error(`tavolozza: manca --${nome} nel tema ${tema}`);
  return v;
}

// Il segno del marchio ha i contorni neri: sul fondo scuro si spegne. L'alone
// glielo ridà, e sta in tema.css perché deve valere OVUNQUE compaia il segno —
// la barra della dashboard, la testata della vetrina, le pagine di servizio, le
// guide. Legarlo a una classe voleva dire dimenticarlo alla pagina dopo, ed è
// esattamente quel che era successo alla vetrina. Le guide non caricano
// tema.css: si portano via la regola di qui, invece di riscriverla.
export const REGOLA_MARCHIO = (() => {
  const css = readFileSync(VIA, 'utf8');
  const i = css.indexOf(':root[data-theme="dark"] img[src*=');
  if (i < 0) throw new Error('tavolozza: manca la regola dell\'alone del marchio in tema.css');
  return css.slice(i, css.indexOf('}', i) + 1);
})();

// Un token puo' essere scritto in funzione di un altro (`--tratto-mano:
// var(--tratto-2)`). Chi chiede il primo e non sa del secondo si porta via una
// dichiarazione che punta nel vuoto: la regola non e' invalida, il browser la
// scarta e basta. Era successo alle pagine di servizio, che chiedevano
// `--tratto-mano` per il bordo: il bordo non c'era, e non c'era nessun errore.
// Quindi le dipendenze si seguono da sole, fin dove arrivano.
export function dichiarazioni(nomi, tema = 'chiaro') {
  const presi = [];
  const visti = new Set();
  const prendi = (n) => {
    if (visti.has(n)) return;
    visti.add(n);
    const v = tinta(n, tema);
    for (const m of v.matchAll(/var\(\s*--([a-z0-9-]+)/g)) prendi(m[1]);
    presi.push(`--${n}:${v}`);
  };
  for (const n of nomi) prendi(n);
  return presi.join(';');
}
