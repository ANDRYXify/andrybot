// IL BOT RISPONDE ANCHE A CHI LO HA INSTALLATO.
//
// Su Twitch il bot scrive con l'account dello streamer — e' il motivo per cui
// esiste. Quindi `isSelf` non vuol dire «l'ha scritto il bot»: vuol dire «l'ha
// scritto il nostro account», che e' quello del padrone di casa.
//
// Un gestore di comandi che scarta `isSelf` sta dicendo «a lui non rispondere».
// E' un difetto che nessuno segnala, perche' il bot funziona per tutti tranne
// che per chi lo ha messo su — e lui pensa di aver sbagliato la configurazione.
// E' successo con !discord, e c'era in sei moduli.
//
// Il loop da cui ci si voleva difendere non esiste: su Twitch gli echi non
// tornano indietro, su Kick li filtra il tubo, su YouTube `isSelf` non si
// accende mai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Dove la domanda «e' il nostro account?» ha ancora senso: non sono comandi,
// sono cose ambientali — contare, imparare, decidere se intromettersi.
const AMBIENTALI = new Set(['contatori.js', 'momenti.js']);

test('nessun gestore di comandi scarta chi scrive col nostro account', () => {
  const dir = join(RAD, 'src/features');
  const colpevoli = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js') || AMBIENTALI.has(f)) continue;
    const codice = senzaCommenti(readFileSync(join(dir, f), 'utf8'));
    // Solo dentro un gestore di comandi: altrove `isSelf` e' legittimo.
    const i = codice.indexOf('export function tryComando');
    const j = codice.indexOf('export async function tryComando');
    const da = [i, j].filter((x) => x >= 0).sort((a, b) => a - b)[0];
    if (da === undefined) continue;
    if (/if \(!?msg\??\.?\w*\s*\|\|\s*msg\??\.?isSelf\)|if \(msg\??\.isSelf\)/.test(codice.slice(da, da + 600))) colpevoli.push(f);
  }
  assert.deepEqual(colpevoli, [], 'questi non rispondono allo streamer');
});

test('e il motivo per cui si puo\' fare sta scritto dove si guarda', () => {
  const chat = readFileSync(join(RAD, 'src/twitch/chat.js'), 'utf8');
  assert.match(chat, /gli echi del bot non tornano mai indietro/,
    'su Twitch non c\'e\' loop: e\' quello che rende sicura la scelta');
  const kick = senzaCommenti(readFileSync(join(RAD, 'src/kick/rotte.js'), 'utf8'));
  assert.match(kick, /!msg\.isSelf && !nostro\(canale, msg\.text\)/,
    'su Kick l\'eco lo filtra il tubo, prima che un comando lo veda');
  const yt = senzaCommenti(readFileSync(join(RAD, 'src/youtube/chat.js'), 'utf8'));
  assert.ok(!/canaleBotId/.test(yt), 'e su YouTube isSelf non si accende: non c\'e\' niente da filtrare');
});
