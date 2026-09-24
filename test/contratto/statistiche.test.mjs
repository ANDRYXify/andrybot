// LE STATISTICHE STANNO IN UN POSTO SOLO, E OGNI NUMERO HA UNA FONTE SOLA.
//
// Erano sparse in tre schede: i sette giorni in Memoria, le classifiche delle
// monete dentro la carta del premio VIP in Giochi, le serie ancora in Memoria.
// Il rischio, ora che sono insieme, e' l'opposto: che qualcuno rifaccia un conto
// gia' fatto altrove e i due numeri si scollino. Percio' si controlla che le
// dirette vengano dai RAPPORTI e non da un secondo giro sul database.
import test from 'node:test';
import { testoManuali } from '../aiuto.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

test('il calcolo sta in un modulo, e la porta si limita a servirlo', () => {
  const srv = leggi('src/web/server.js');
  const riga = srv.split('\n').filter((r) => r.includes('statistiche.riassunto('));
  assert.equal(riga.length, 1, 'una sola riga lo chiama');
  assert.match(riga[0], /statistiche\.riassunto\(login, \{ periodo: req\.query\.periodo, inCorso: rapporto\.inCorso\(login\) \}\)/,
    'il canale viene da chi e\' entrato, il periodo dalla richiesta, e la diretta in corso da chi la sta gia\' seguendo');
  const st0 = leggi('src/features/statistiche.js');
  assert.ok(!/from '\.\/rapporto\.js'/.test(st0), 'i numeri non vanno a prendersi la sessione da soli: arriva da fuori');
  const porta = srv.slice(srv.indexOf("app.get('/api/streamer/statistiche'"), srv.indexOf("app.get('/api/streamer/statistiche'") + 220);
  assert.match(porta, /requireLogin/, 'e ha il suo guardiano');
});

// LA DIRETTA IN CORSO. Un rapporto nasce quando la serata finisce: finche' eri
// in onda la scheda diceva zero dirette, zero minuti, zero picco, mentre i
// messaggi salivano. Adesso la serata in corso si aggiunge — e solo per la parte
// che sta DENTRO la finestra del periodo.
test('la diretta in corso entra nei numeri, per la parte dentro il periodo', () => {
  const st = leggi('src/features/statistiche.js');
  assert.match(st, /function conInCorso\(ch, dirette, inCorso, da, ora\)/, 'c\'e\' un posto solo che la aggiunge');
  assert.match(st, /const dentro = Math\.max\(Number\(da\) \|\| 0, Number\(inCorso\.inizio\)\);/,
    'una serata cominciata prima del periodo porta dentro solo la sua parte di adesso');
  assert.match(st, /n: dirette\.n \+ 1/);
  assert.match(st, /picco: Math\.max\(dirette\.picco, intero\(inCorso\.picco\)\)/, 'il picco e\' il piu\' alto fra i due, non la somma');
  const rap = leggi('src/features/rapporto.js');
  assert.match(rap, /export function inCorso\(channel/, 'e la sessione la espone chi gia\' la tiene');
});

test('le dirette vengono dai rapporti, non da un secondo conto', () => {
  const st = leggi('src/features/statistiche.js');
  assert.match(st, /FROM rapporti WHERE channel=\? AND fine>=\?/, 'i numeri delle dirette si leggono dai rapporti salvati');
  assert.match(st, /json_extract\(dati,'\$\.picco'\)/, 'e si sommano nel database, non aprendo un JSON per diretta');
  assert.ok(!/FROM dirette_viste/.test(st), 'niente conti paralleli sulle dirette');
  assert.match(st, /rapporti\.elenco\(ch, n\)/, 'le ultime dirette sono le ultime, non quelle del periodo');
  assert.match(st, /presenze\.classifica\(ch, n\)/);
  assert.match(st, /watchtime\.top\(ch, n\)/);
});

test('il periodo e\' una delle tre finestre, e quello che non si conosce ricade sui sette giorni', async () => {
  const { periodoValido, PERIODI } = await import('../../src/features/statistiche.js');
  assert.deepEqual(Object.keys(PERIODI), ['7', '30', 'tutto']);
  assert.equal(PERIODI.tutto, 0, '«da sempre» non taglia niente');
  for (const brutto of ['90', '', null, undefined, 'tutto2', '../etc']) assert.equal(periodoValido(brutto), '7');
  assert.equal(periodoValido('30'), '30');
});

test('la scheda c\'e\', il menu la porta, e le classifiche non restano anche dove stavano', () => {
  const app = leggi('src/web/public/app.js');
  assert.match(app, /\['statistiche', 'Statistiche'\]/, 'sta nel menu');
  assert.match(app, /\$\{pannelloStatistiche\(\)\}/, 'e il pannello la disegna');
  assert.match(app, /if \(id === 'statistiche'\) \{ caricaStatistiche\(\); caricaClassifica\(\); \}/);
  for (const id of ['stat-periodo', 'griglia-stat', 'lista-classifica', 'lista-classifica-staff', 'lista-presenze', 'lista-chatters', 'lista-ore', 'stat-dirette']) {
    assert.ok(app.includes(`id="${id}"`), `manca #${id}`);
  }
  // una volta sola, se no due liste con lo stesso nome e una resta vuota
  for (const id of ['lista-presenze', 'lista-chatters', 'lista-classifica', 'griglia-stat']) {
    assert.equal(app.split(`id="${id}"`).length - 1, 1, `#${id} compare due volte`);
  }
  assert.ok(!/Classifica del pubblico/.test(app), 'la classifica non e\' rimasta anche in Giochi');
});

test('il manuale e la vetrina la raccontano, e la novita\' dice dove andare', () => {
  const man = testoManuali();
  assert.match(man, /schede: \['regia', 'dirette', 'statistiche', 'ascolto', 'clip', 'musica'\]/);
  assert.match(man, /\{ h2: 'Le statistiche e le classifiche' \}/);
  const vet = leggi('src/web/vetrina-vista.js');
  assert.match(vet, /scheda: 'statistiche', pacc: 'free'/);
  assert.match(leggi('NOVITA.md'), /scheda «Statistiche».*\[vai: statistiche\]/);
});
