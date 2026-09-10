// OGNI PORTA DEVE DARE SU UNA STANZA.
//
// Nata da un difetto vero: le rotte `/posta` erano registrate e i metodi che
// avrebbero dovuto rispondere NON ESISTEVANO — uno script si era interrotto a
// meta' e aveva scritto le rotte ma non gli handler. Python non se ne lamenta al
// caricamento: la porta c'e', si apre, e dietro non c'e' niente. Si scopre in
// diretta, con un errore, quando qualcuno bussa.
//
// E' esattamente la forma di difetto che si ripete: una cosa che SEMBRA esserci.
// Questa prova la rende impossibile — la lista delle rotte e la lista dei metodi
// devono combaciare, e basta una che non combacia perche' diventi rossa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('ogni rotta del cervello chiama un metodo che esiste davvero', () => {
  const src = readFileSync(join(RAD, 'brain/server.py'), 'utf8');
  const metodi = new Set([...src.matchAll(/^    def (\w+)\(/gm)].map((m) => m[1]));
  assert.ok(metodi.size > 20, `metodi trovati: ${metodi.size}`);

  const rotte = [...src.matchAll(/self\.path\.startswith\("([^"]+)"\):\s*\n\s*return self\.(\w+)\(/g)];
  assert.ok(rotte.length > 30, `rotte trovate: ${rotte.length}`);

  const rotte_ = [];
  for (const [, percorso, metodo] of rotte) {
    if (!metodi.has(metodo)) rotte_.push(`${percorso} → self.${metodo}() che non esiste`);
  }
  assert.deepEqual(rotte_, [], `porte che danno sul vuoto:\n  ${rotte_.join('\n  ')}`);
});

test('e nessun metodo-rotta resta senza porta', () => {
  // Il verso opposto: un handler scritto e mai collegato e' lavoro che non gira
  // mai, e nessuno se ne accorge perche' non fallisce niente.
  const src = readFileSync(join(RAD, 'brain/server.py'), 'utf8');
  const collegati = new Set([...src.matchAll(/return self\.(\w+)\(/g)].map((m) => m[1]));
  const orfani = [...src.matchAll(/^    def (_\w+)\(self\):/gm)]
    .map((m) => m[1])
    .filter((n) => /^_(?!json|leggi|set_|log_|end_|send_|do_)/.test(n))
    .filter((n) => !collegati.has(n) && !new RegExp(`self\\.${n}\\(`).test(src));
  assert.deepEqual(orfani, [], `metodi scritti e mai chiamati: ${orfani.join(', ')}`);
});
