// LE TRE NUVOLETTE, e perché sono tre.
//
// Una forma sola per ogni spiegazione sarebbe una decorazione. Tre forme che
// dicono tre cose diverse sono informazione: il fumetto normale spiega un
// comando, quello squadrato e rosso avvisa che qualcosa fa danni, la nuvola di
// pensiero spiega un valore o una parola.
//
// La cosa che conta: il tipo si RICAVA da quello che stai puntando, non lo
// dichiara chi scrive la pagina. Una regola che vale solo se qualcuno si ricorda
// di scriverla, prima o poi cede — e cede in silenzio, perché una nuvoletta
// della forma sbagliata funziona lo stesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const JS = leggi('src/web/public/aiuto.js');
const CSS = leggi('src/web/public/style.css');

test('il tipo si ricava da quello che si punta, non da un\u2019etichetta scritta a mano', () => {
  assert.match(JS, /function tipoDi\(el\)/, 'manca chi decide la forma');
  assert.match(JS, /b\.className = 'aiuto-bolla ' \+ tipoDi\(el\)/, 'la forma non arriva alla bolla');
  // e la decisione guarda FATTI dell'elemento: se fa danni, e se si puo' usare
  assert.match(JS, /PERICOLO/, 'niente riconosce le cose che fanno danni');
  assert.match(JS, /TOCCABILE/, 'niente distingue un comando da una spiegazione');
  assert.doesNotMatch(JS, /data-aiuto-tipo|dataset\.aiutoTipo/,
    'il tipo non deve dipendere da un attributo che qualcuno si deve ricordare di mettere');
});

test('ognuna delle tre ha una forma sua, non solo un colore', () => {
  for (const tipo of ['attenzione', 'dritta']) {
    assert.ok(CSS.includes(`.aiuto-bolla.${tipo}`), `manca la forma «${tipo}»`);
    const i = CSS.indexOf(`.aiuto-bolla.${tipo} {`);
    const blocco = CSS.slice(i, CSS.indexOf('}', i));
    assert.match(blocco, /border-radius/, `«${tipo}» cambia solo colore: la forma è la cosa che si riconosce`);
  }
  // e la coda cambia con la forma: nel pensiero sono pallini, non un triangolo
  assert.match(CSS, /\.aiuto-bolla\.dritta::before[\s\S]{0,220}border-radius: 50%/,
    'la nuvola di pensiero ha la coda a triangolo: allora non è una nuvola di pensiero');
});

test('le tre forme restano leggibili anche a chi tocca lo schermo', () => {
  // La bolla non si accende col dito, e non deve rubare i tocchi.
  assert.match(JS, /pointerType === 'touch'/, 'col dito la nuvoletta non deve comparire');
  assert.match(CSS, /\.aiuto-bolla \{[\s\S]{0,900}pointer-events: none/, 'la bolla intercetta i clic');
});
