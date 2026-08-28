// Cancello delle DIPENDENZE: package.json e package-lock.json devono dire la
// stessa cosa.
//
// Il difetto vero che questo impedisce: `node-llama-cpp` era stato messo fra le
// dipendenze opzionali e mai installato, quindi non è mai entrato nel lock. Da
// lì `npm ci` falliva OVUNQUE — sul server, nel collaudo, in qualunque macchina
// pulita — mentre in locale non se ne accorgeva nessuno, perché chi ha già
// node_modules non lancia mai `npm ci`. Un difetto invisibile a chi sviluppa e
// fatale a chi installa.
//
// Il controllo costa un millisecondo, quindi può stare nel gancio pre-push,
// dove `npm ci` (che ci mette secondi e scarica) non starebbe mai.

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const radice = lock.packages?.[''] || {};

const CAMPI = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const problemi = [];

for (const campo of CAMPI) {
  const dichiarate = pkg[campo] || {};
  const nelLock = radice[campo] || {};
  for (const [nome, versione] of Object.entries(dichiarate)) {
    if (!(nome in nelLock)) { problemi.push(`${campo}: "${nome}" è in package.json ma non nel lock`); continue; }
    if (nelLock[nome] !== versione) problemi.push(`${campo}: "${nome}" vuole ${versione} nel package.json ma ${nelLock[nome]} nel lock`);
  }
  for (const nome of Object.keys(nelLock)) {
    if (!(nome in dichiarate)) problemi.push(`${campo}: "${nome}" è nel lock ma non in package.json`);
  }
}

if (lock.name !== pkg.name) problemi.push(`il lock è di "${lock.name}", il package.json di "${pkg.name}"`);

const quante = CAMPI.reduce((n, c) => n + Object.keys(pkg[c] || {}).length, 0);
console.log(`dipendenze   ${quante} dichiarate, tutte nel lock  ${problemi.length ? '' : '✓'}`);
if (problemi.length) {
  console.error('\npackage.json e package-lock.json non dicono la stessa cosa:');
  for (const p of problemi) console.error('  · ' + p);
  console.error('\n`npm ci` fallirà su ogni macchina pulita. Rimetti in pari il lock con `npm install`,');
  console.error('oppure togli da package.json quello che non serve davvero.');
  process.exit(1);
}
