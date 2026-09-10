#!/usr/bin/env node
// Un bottone che si preme e non fa niente.
//
// E' il difetto che torna piu' spesso: il bottone c'e', il testo promette una
// cosa, il giro guidato ci punta — e non e' attaccato a niente. Da fuori non si
// distingue da uno rotto, e chi lo preme resta li' a chiedersi se ha funzionato.
//
// Qui si guarda ogni <button id="..."> servito al browser e si chiede: quell'id
// qualcuno lo va a prendere? Valgono tutte le forme in uso: _g('x'),
// getElementById('x'), closest('#x'), querySelector('#x'), id === 'x'.
//
// NON vale il solo '#x' scritto in una tappa del giro guidato: quello e' un
// dito puntato, non un gestore — ed e' proprio cosi' che l'ultimo bottone morto
// era passato inosservato.
//
// Fuori portata: input e select. Li' l'id fa spesso da aggancio all'etichetta
// (<label for>) o vive in una tabella di corrispondenze, e un campo che si
// limita a mostrare un valore non ha niente da agganciare. Il difetto "premo e
// non succede niente" e' dei bottoni.
import { readFileSync } from 'node:fs';

const FILE = [
  'src/web/public/app.js',
  'src/web/public/carta-editor.js',
  'src/web/public/cerca.js',
  'src/web/public/pilota.js',
  'src/web/public/plancia.js',
  'src/web/public/tgapp.js',
];

// Bottoni che l'id ce l'hanno per essere raggiunti da fuori (stile, prove,
// ancore), non per essere premuti. Ognuno con il perche' scritto.
const ESENTI = new Map([]);

let rotti = 0;
let contati = 0;

for (const f of FILE) {
  let s;
  try { s = readFileSync(f, 'utf8'); } catch { continue; }
  const ids = new Set();
  for (const m of s.matchAll(/<button[^>]*?\bid="([a-zA-Z0-9_-]+)"/g)) ids.add(m[1]);

  for (const id of [...ids].sort()) {
    contati++;
    if (ESENTI.has(id)) continue;
    const preso = [
      `('${id}')`, `("${id}")`,
      `('#${id}')`, `("#${id}")`,
      `=== '${id}'`, `=== "${id}"`,
    ].some((p) => s.includes(p));
    if (!preso) {
      rotti++;
      console.error(`✗ ${f}: il bottone «${id}» non e' attaccato a niente — premerlo non fa nulla.`);
    }
  }
}

if (rotti) {
  console.error(`\n${rotti} bottone/i morto/i su ${contati}.`);
  console.error('Attaccalo a un gestore, oppure toglilo: un bottone che non fa niente e\' peggio di un bottone che non c\'e\'.');
  process.exit(1);
}
console.log(`Tutti i ${contati} bottoni sono attaccati a qualcosa. ✓`);
