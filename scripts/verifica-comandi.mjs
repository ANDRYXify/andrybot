// Cancello dei COMANDI PRONTI.
//
// La regola che ha creato questo file: tutto quello che si chiama con un «!»
// deve essere modificabile. Prima non lo era, e i sintomi erano due — `!giochi`
// rispondeva DUE VOLTE (i giochi di chat e, sotto, quelli con la webcam, perche'
// due moduli tenevano ognuno il proprio elenco scritto a mano), e il pannello
// elencava dieci comandi su trenta.
//
// Qui si verifica che il registro e la realta' non possano separarsi:
//   · ogni riga ha un gestore che conosce quel nome (se no il pannello mostra
//     un comando che la chat non conosce);
//   · nessuna riga rivendica una parola gia' di un'altra (il secondo non
//     partirebbe mai e nessuno saprebbe perche');
//   · la copia finta della demo copre esattamente il registro (se no la demo
//     mostra un prodotto diverso da quello vero).
//
// Uso: node scripts/verifica-comandi.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMANDI, MODULI, collisioni, LIVELLI } from '../src/features/comandi-registro.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// ---- ogni riga ha il suo gestore ------------------------------------------
const senzaFile = [...new Set(COMANDI.map((c) => c.modulo))].filter((m) => !MODULI[m]?.file);
dice(senzaFile.length === 0, 'ogni famiglia dice in quale file vive', senzaFile.join(', '));

const orfani = [];
for (const c of COMANDI) {
  const f = MODULI[c.modulo]?.file;
  if (!f) continue;
  const src = leggi(join('src', 'features', f));
  if (!new RegExp(`['"\`]${c.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(src)) orfani.push(`${c.id} (${f})`);
}
dice(orfani.length === 0, `ogni comando del registro ha il suo gestore: ${COMANDI.length}`, orfani.join(', '));

// ---- nessuno si contende una parola ---------------------------------------
const scontri = collisioni({});
dice(scontri.length === 0, `nessuna parola rivendicata due volte: ${COMANDI.flatMap((c) => c.nomi).length} nomi`,
  scontri.map((s) => `${s.nome} fra ${s.fra.join(' e ')}`).join(', '));

// ---- il livello di serie e' un livello vero -------------------------------
const livelliStrani = COMANDI.filter((c) => c.chi && !LIVELLI.includes(c.chi)).map((c) => c.id);
dice(livelliStrani.length === 0, 'ogni livello di serie e\' uno di quelli previsti', livelliStrani.join(', '));

// ---- la demo mostra lo stesso prodotto ------------------------------------
const app = leggi('src/web/public/app.js');
const i = app.indexOf("'/api/streamer/comandi-pronti': { comandi: [");
dice(i >= 0, 'la demo ha la sua copia dei comandi');
if (i >= 0) {
  const blocco = app.slice(i, app.indexOf('], livelli:', i));
  const finti = [...blocco.matchAll(/\bid: "([a-z0-9]+)"/g)].map((m) => m[1]);
  const veri = COMANDI.map((c) => c.id);
  const mancanti = veri.filter((x) => !finti.includes(x));
  const inPiu = finti.filter((x) => !veri.includes(x));
  dice(mancanti.length === 0 && inPiu.length === 0,
    `la demo copre il registro: ${finti.length} su ${veri.length}`,
    [...mancanti.map((x) => '-' + x), ...inPiu.map((x) => '+' + x)].join(', '));
}

// ---- un solo elenco in chat -----------------------------------------------
// Il difetto originale: due moduli con due liste scritte a mano. La lista adesso
// la costruisce il registro, quindi nessun gestore deve tenersene una.
const conElenco = ['games.js', 'trackinggiochi.js']
  .filter((f) => /🎮 Giochi(?! del)|Giochi webcam:/.test(leggi(join('src', 'features', f))) && !/elencoGiochiInChat/.test(leggi(join('src', 'features', f))));
dice(conElenco.length === 0, 'l\'elenco dei giochi in chat lo costruisce il registro, non i gestori', conElenco.join(', '));

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `\n      ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nOgni «!» del prodotto e\' una riga che si puo\' cambiare. ✓');
process.exit(rossi.length ? 1 : 0);
