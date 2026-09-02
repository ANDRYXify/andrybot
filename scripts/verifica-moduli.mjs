// Cancello dei MODULI: il motore e il pannello devono sapere le stesse cose.
//
// Un Modulo attraversa quattro posti — il motore che lo esegue, il server che
// lo valida, l'editor che lo disegna e lo rilegge, il riassunto che lo racconta
// in una frase. Aggiungere un pezzo in tre posti su quattro non da' errore: da'
// una funzione che c'e' a meta'. E' successo davvero: le variabili delle monete
// avevano la pillola da cliccare ma nessuna spiegazione nella legenda, cioe'
// erano offerte a chi non poteva sapere cosa fossero.
//
// Niente elenchi scritti a mano qui dentro: le liste si RICAVANO dai file. Un
// pezzo nuovo entra nel controllo il giorno che nasce.
//
// Uso: node scripts/verifica-moduli.mjs   (esce 1 se qualcosa non torna)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const motore = readFileSync(join(RAD, 'src/features/modules.js'), 'utf8');
const server = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// Il corpo di una funzione. Si parte a contare le graffe DOPO la parentesi che
// chiude i parametri: un parametro con valore di default (`opts = {}`) e' una
// graffa che si apre e si chiude subito, e conterebbe come corpo vuoto.
const corpoDi = (testo, nome) => {
  const i = testo.indexOf(nome);
  if (i < 0) return '';
  let tonde = 0, dopoParametri = -1;
  for (let j = testo.indexOf('(', i); j < testo.length; j++) {
    if (testo[j] === '(') tonde++;
    else if (testo[j] === ')') { tonde--; if (tonde === 0) { dopoParametri = j + 1; break; } }
  }
  if (dopoParametri < 0) return '';
  let liv = 0, dentro = false;
  for (let j = testo.indexOf('{', dopoParametri); j < testo.length; j++) {
    if (testo[j] === '{') { liv++; dentro = true; }
    else if (testo[j] === '}') { liv--; if (dentro && liv === 0) return testo.slice(i, j + 1); }
  }
  return '';
};
const casiDi = (corpo) => new Set([...corpo.matchAll(/case '([a-zA-Z]+)':/g)].map((m) => m[1]));
const listaDi = (testo, nome) => {
  const m = new RegExp(`const ${nome} = \\[([\\s\\S]*?)\\];`).exec(testo);
  return m ? m[1] : '';
};

// ---- 1. le azioni che il motore sa eseguire ------------------------------
const azioniMotore = casiDi(corpoDi(motore, 'async _eseguiAzione('));
dice(azioniMotore.size > 5, `azioni che il motore sa eseguire: ${azioniMotore.size}`);

// ---- 2. il server le conosce tutte (altrimenti le rifiuta come "non valida")
const permesse = new Set([...listaDi(server, 'MOD_AZIONI').matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]));
const nonPermesse = [...azioniMotore].filter((a) => !permesse.has(a));
dice(nonPermesse.length === 0, 'ogni azione del motore e\' accettata dal server', nonPermesse.join(', '));
const fantasma = [...permesse].filter((a) => !azioniMotore.has(a));
dice(fantasma.length === 0, 'e il server non ne accetta di inesistenti', fantasma.join(', '));

// ---- 3. l'editor la disegna, la rilegge e la racconta ---------------------
const posti = [
  ['si puo\' scegliere dal menu', new Set([...listaDi(app, 'AZIONI').matchAll(/\['([a-zA-Z]+)'/g)].map((m) => m[1]))],
  ['ha i suoi campi nell\'editor', casiDi(corpoDi(app, 'function disegnaCampiAzione('))],
  ['viene riletta dal modulo salvato', casiDi(corpoDi(app, 'function leggiAzioneRiga('))],
  ['compare nel riassunto in una frase', casiDi(corpoDi(app, 'function riassuntoAzione('))],
];
for (const [cosa, insieme] of posti) {
  const manca = [...azioniMotore].filter((a) => !insieme.has(a));
  dice(manca.length === 0, `ogni azione ${cosa}`, manca.join(', '));
}

// ---- 3-bis. ogni ricetta esiste davvero ---------------------------------
// Le ricette compaiono in due schede (Comandi e Giochi) e devono venire da una
// lista sola, altrimenti una delle due si dimentica per strada.
const ricette = [...listaDi(app, 'RICETTE_PUNTI').matchAll(/\['([a-z]+)'/g)].map((m) => m[1]);
const casiModello = casiDi(corpoDi(app, 'function modelloPronto('));
dice(ricette.length > 0, `ricette a punti offerte: ${ricette.length}`);
const senzaModello = ricette.filter((r) => !casiModello.has(r));
dice(senzaModello.length === 0, 'ogni ricetta ha il suo modello', senzaModello.join(' '));
const scritteAMano = [...app.matchAll(/data-(?:modello|ricetta)="([a-z]+)"/g)].map((m) => m[1]);
dice(scritteAMano.length === 0 || scritteAMano.every((r) => casiModello.has(r)),
  'nessun bottone rimanda a un modello che non c\'e\'', scritteAMano.filter((r) => !casiModello.has(r)).join(' '));

// ---- 4. ogni variabile offerta ha una spiegazione ------------------------
// La legenda raggruppa sotto "…" la famiglia delle variabili "a caso": quelle
// si ricavano dal motore, non si elencano qui.
const nome = (tok) => { const m = /^\$([a-zA-Z0-9_]+)(\()?/.exec(String(tok)); return m ? '$' + m[1] + (m[2] || '') : ''; };
const offerte = [...listaDi(app, 'VARIABILI').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const spiegate = new Set([...listaDi(app, 'LEGENDA_VAR').matchAll(/\['(\$[^']+)'/g)].map((m) => nome(m[1])));
const aCaso = new Set([...corpoDi(motore, 'const dinamiche = ').matchAll(/^\s{6}([a-zA-Z]+):/gm)].map((m) => '$' + m[1]));
dice(offerte.length > 10 && spiegate.size > 10 && aCaso.size > 5,
  `variabili offerte ${offerte.length} · spiegate ${spiegate.size} · famiglia "a caso" ${aCaso.size}`);
const mute = offerte.filter((v) => !spiegate.has(nome(v)) && !aCaso.has(nome(v)));
dice(mute.length === 0, 'ogni variabile offerta ha la sua spiegazione nella legenda', mute.join(' '));

// ---- 5. e ogni variabile spiegata esiste davvero nel motore --------------
// Una legenda che promette una variabile che il motore non conosce fa scrivere
// testi che restano vuoti.
const corpoEspandi = corpoDi(motore, 'async espandi(');
const note = new Set([
  // le chiavi dell'oggetto `vars` (le variabili semplici)
  ...[...corpoEspandi.matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map((m) => '$' + m[1]),
  // le funzioni: $nome( ... ) cercate nelle espressioni regolari del motore
  ...[...corpoEspandi.matchAll(/\\\$([a-zA-Z0-9_]+)\\?\(/g)].map((m) => '$' + m[1] + '('),
  // e quelle scritte come alternativa: $(titolo|categoria|gioco)\(
  ...[...corpoEspandi.matchAll(/\\\$\(\??:?([a-zA-Z0-9_|]+)\)\\\(/g)].flatMap((m) => m[1].split('|').map((x) => '$' + x + '(')),
  ...aCaso,
]);
// Le variabili NUMERATE ($arg1, $arg2, ...) il motore le prende con una sola
// regola ($arg seguito da cifre): la legenda ne mostra una d'esempio.
const conosciuta = (v) => note.has(v) || note.has(v.replace('(', ''))
  || note.has(v.replace(/\d+$/, '')) || note.has(v.replace(/\d+$/, '') + '(');
const promesseVuote = [...spiegate].filter((v) => v !== '$…' && !conosciuta(v));
dice(promesseVuote.length === 0, 'ogni variabile spiegata esiste davvero nel motore', promesseVuote.join(' '));

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nMotore e pannello sanno le stesse cose. ✓');
process.exit(rossi.length ? 1 : 0);
