// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CARTA «LE REGOLE DI OGNI GIOCO» SI CAPISCE LEGGENDOLA (docs/GIOCHI.md,
// «Le attese uguali per tutti i giochi»).
//
// Chi la usava la trovava confusionaria: le caselle del gioco e quelle delle
// attese in fila, senza unita', i tris della slot in frazioni, una riga rossa
// che non diceva perche'. Le promesse:
//  · dentro ogni gioco, «Il gioco» e «Le attese» separati, e sotto una riga
//    che dice coi numeri cosa succede davvero (tempi in parole, insistenze
//    raddoppiate, tris in monete);
//  · le attese uguali per tutti in cima, e in ogni gioco «Attese sue»;
//  · le caselle hanno i valori DEL GIOCO, mai quelli per tutti: salvare non li
//    deve scrivere sopra a quelli del gioco;
//  · i valori veri li fa la funzione del bot (regole-comuni.js), non una copia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const G = await import('../../src/features/giochi-conf.js');

function funzione(nome) {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `non trovo ${nome}`);
  let liv = 0;
  for (let j = APP.indexOf(') {', i) + 2; j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) return APP.slice(i, j + 1);
  }
  throw new Error(`${nome} non si chiude`);
}
const L = (it) => it;
const numero = (x) => Number(x).toLocaleString('it-IT');
// eslint-disable-next-line no-new-func
const pezzi = new Function('L', '_rgNumero', `${funzione('_rgTempo')}\n${funzione('_rgFrasiAttese')}\n${funzione('_rgDiceGioco')}\nreturn { _rgTempo, _rgFrasiAttese, _rgDiceGioco };`)(L, numero);
const slot = G.catalogoPerPannello({}).giochi.find((g) => g.id === 'slot');
const dice = (cambi) => pezzi._rgDiceGioco(slot, { ...slot.valori, ...cambi });

test('i tempi si dicono a parole', () => {
  assert.equal(pezzi._rgTempo(5), '5 secondi');
  assert.equal(pezzi._rgTempo(60), 'un minuto');
  assert.equal(pezzi._rgTempo(90), 'un minuto e 30 secondi');
  assert.equal(pezzi._rgTempo(3725), 'un\'ora, 2 minuti e 5 secondi');
  assert.equal(pezzi._rgTempo(7200), '2 ore');
});

test('la slot detta coi numeri: i tris in monete, le attese, chi insiste', () => {
  assert.equal(dice({}), 'Così: il tris di 💎 paga 200, il tris di 7 150, gli altri tris 80, una coppia 15. Chi ha giocato aspetta 5 secondi prima di rigiocare; chi insiste prima del tempo non aspetta di più.', 'i premi in una frase, le attese nella sua');
  assert.equal(dice({ insisti: 30, insistiMax: 5 }).split('; ').at(-1),
    'chi insiste prima del tempo aspetta 30 secondi in più, poi un minuto, poi 2 minuti, e alla 5ª volta è fuori fino a fine diretta.');
  assert.equal(dice({ insisti: 30, insistiMax: 2 }).split('; ').at(-1), 'chi insiste prima del tempo aspetta 30 secondi in più, e alla 2ª volta è fuori fino a fine diretta.');
  assert.equal(dice({ insisti: 30, insistiMax: 1 }).split('; ').at(-1), 'chi insiste prima del tempo è subito fuori fino a fine diretta.');
  assert.equal(dice({ insisti: 30, insistiMax: 0 }).split('; ').at(-1), 'chi insiste prima del tempo aspetta 30 secondi in più, poi un minuto, poi 2 minuti.');
  assert.match(dice({ attesaTesta: 0, attesaTutti: 0 }), /\. Si può rigiocare subito;/);
  assert.match(dice({ attesaTesta: 0, attesaTutti: 300 }), /\. Dopo ogni partita tutto il canale aspetta 5 minuti;/);
  const pesca = G.catalogoPerPannello({}).giochi.find((g) => g.id === 'pesca');
  assert.equal(pezzi._rgDiceGioco(pesca, pesca.valori), 'Così: chi ha giocato aspetta 5 minuti prima di rigiocare; chi insiste prima del tempo non aspetta di più.', 'un gioco senza premi da dire: solo le attese');
  assert.match(dice({ jackpot: 1000 }), /il tris di 7 750, gli altri tris 400/, 'i tris coi fattori del motore');
});

test('le caselle hanno i valori del gioco, e i valori veri li fa la funzione del bot', () => {
  const gioco = funzione('_rgGioco');
  assert.ok(!/g\.valori\[p\.k\]/.test(gioco), 'nessuna casella col valore vero: salvando, la regola per tutti finirebbe dentro il gioco');
  assert.equal((gioco.match(/_rgCampo\(g, p, g\.propri\[p\.k\]\)/g) || []).length, 3, 'il gioco, le attese e i testi: tutti coi valori del gioco');
  assert.match(funzione('_rgAggiorna'), /R\.effettivi\(\{ \.\.\.g\.propri, \.\.\._rgBozza\(box, g\.id\) \}, t, \{ segue: g\.segue, suo \}\)/);
  assert.match(funzione('_demoRegole'), /R\.effettivi\(g\.propri, base\.tutti, \{ segue: g\.segue, suo: g\.suo \}\)/, 'anche la demo');
  assert.match(funzione('caricaRegoleGiochi'), /_rgComuni \|\|= await import\('\/js\/regole-comuni\.js'\);/);
});

test('salvare porta le attese per tutti e i giochi che fanno a modo loro', () => {
  const i = APP.indexOf("document.getElementById('btn-salva-regole-giochi')");
  const salva = APP.slice(i, APP.indexOf('}));', i));
  assert.match(salva, /box\.querySelectorAll\('\[data-rg-suo\]'\)\.forEach\(\(el\) => \{ \(giochiConf\[el\.dataset\.rgSuo\] \|\|= \{\}\)\.suo = el\.checked; \}\);/);
  assert.match(salva, /giochiConf\._tutti = _rgTuttiBozza\(box\);/);
});

test('la riga rossa dice perché è rossa', () => {
  const f = new Function('L', '_rgNumero', `${funzione('_rgPresenza')}\nreturn _rgPresenza;`)(L, numero);
  assert.equal(f({ perOra: 118 }, { presenzaOraria: 72 }), ' È più dei 72 all\'ora che dà la presenza: si guadagna più giocando che stando in chat.');
  assert.equal(f({ perOra: 50 }, { presenzaOraria: 72 }), ' La presenza ne dà 72 all\'ora.');
});
