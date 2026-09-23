// OGNI ERRORE DICE SU COSA.
//
// Il difetto da cui nasce, visto dal vivo: dopo una costruzione il pannello
// diceva «Invalid Form Body · non trovato: quella cosa non c'e' piu'». Due
// guasti veri, e nessuno dei due diceva su COSA — quale canale, quale regola,
// quale porta. Chi legge non sa nemmeno dove andare a guardare.
//
// La causa non era una frase scritta male: era che l'elenco che ricava il
// soggetto dal percorso conosceva solo i percorsi di quando il bot faceva i
// ruoli e i canali. Tutto quello arrivato dopo — la prima schermata, la porta
// d'ingresso, il filtro, gli appuntamenti, le impostazioni del server —
// finiva su «quella cosa».
//
// LA MISURA. Si prendono tutti i percorsi che `discord-api.js` chiama davvero,
// e si pretende che l'elenco li riconosca tutti. Cosi' una funzione nuova che
// dimentica la sua riga non passa: il difetto non puo' tornare.
//
// Uso: node scripts/verifica-insegne.mjs   (--selftest pretende il rosso)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');
const API = readFileSync(join(RAD, 'src/features/discord-api.js'), 'utf8');

const esiti = [];
const chiedi = (ok, t) => { esiti.push({ ok: !!ok, t }); console.log((ok ? '  ✓ ' : '  ✗ ') + t); };

// Le insegne, lette dal codice invece che ricopiate qui.
const blocco = API.slice(API.indexOf('const INSEGNE = ['), API.indexOf('];', API.indexOf('const INSEGNE = [')));
const righe = [...blocco.matchAll(/\[(\/[^,]+\/),\s*'([^']*(?:\\'[^']*)*)'/g)];
chiedi(righe.length >= 8, `insegne dichiarate: ${righe.length}`);
const insegne = righe.map(([, re]) => new RegExp(re.slice(1, re.lastIndexOf('/'))));

// I percorsi che il bot chiama davvero, con le parti variabili rese numeriche.
const vie = [...new Set([...API.matchAll(/chiama\(token, `([^`]+)`/g)]
  .map((m) => m[1].replace(/\$\{[^}]*\}/g, '1234567890123456')))];
chiedi(vie.length >= 12, `percorsi chiamati: ${vie.length}`);

const orfani = vie.filter((v) => !insegne.some((re) => re.test(v.split('?')[0])));
if (SELFTEST) orfani.push('/guilds/1/finta-strada');
chiedi(!orfani.length, orfani.length
  ? `questi percorsi non hanno un soggetto, e i loro errori diranno «quella cosa»: ${orfani.join(', ')}`
  : 'ogni percorso che il bot chiama ha il suo soggetto');

// E il dettaglio del «Invalid Form Body»: senza, resta una frase in inglese
// che non dice niente a chi legge il pannello.
chiedi(/function dettaglioForm\(corpo\)/.test(API), 'il dettaglio del rifiuto si va a prendere dentro «errors»');
chiedi(/if \(stato === 400\) \{/.test(API), 'e il 400 non passa piu\' per la frase generica');

const rossi = esiti.filter((x) => !x.ok).length;
console.log('\n' + (rossi ? 'cancello ROSSO ✗' : 'Ogni errore dice su cosa. ✓'));
process.exit(rossi ? 1 : 0);
