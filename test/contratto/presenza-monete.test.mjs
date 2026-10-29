// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PRESENZA, MONETE E GIOCHI: UNA STRADA SOLA (docs/MENU.md).
//
// Il difetto: le monete stavano in una parte di Giochi («Monete e
// classifica»), e la presenza in tre posti, con «!presente» dentro i Pew. Qui
// si leggono le tabelle vere del pannello e si fissa la strada: Presenza, poi
// Monete, poi Giochi; ogni carta nella sua scheda; i Pew con il solo effetto;
// i tasti che collegano le schede; i vecchi indirizzi che arrivano ancora.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const valore = (inizio, fine) => {
  const i = APP.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  return new Function(`return (${APP.slice(i + inizio.length - 1, APP.indexOf(fine, i) + fine.length)});`)();
};
const corpo = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `manca ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i) + 2);
};
const GRUPPI = valore('const GRUPPI = [', '\n]');
const SCHEDA_FUNZ = valore('const SCHEDA_FUNZ = {', '}');
const SOLO_TWITCH = valore('const SOLO_TWITCH = [', ']');

test('nel menu, l\'ordine della strada: Presenza, Monete, Giochi, Partite, poi il resto', () => {
  const g = GRUPPI.find((x) => x.id === 'gioca');
  assert.deepEqual(g.schede.slice(0, 4).map(([id]) => id), ['presenza', 'monete', 'giochi', 'partite']);
  assert.deepEqual(g.schede.slice(0, 2), [['presenza', 'Presenza'], ['monete', 'Monete']]);
});

test('Monete sta nel piano dei giochi; la Presenza no, e non e\' solo di Twitch', () => {
  assert.equal(SCHEDA_FUNZ.monete, 'giochi');
  assert.equal(SCHEDA_FUNZ.giochi, 'giochi');
  assert.ok(!('presenza' in SCHEDA_FUNZ), 'la presenza e\' una regola del canale');
  assert.ok(!SOLO_TWITCH.includes('presenza') && !SOLO_TWITCH.includes('monete'));
});

test('ogni carta nella sua scheda; Giochi non ha piu\' la parte delle monete', () => {
  const pres = corpo('pannelloPresenza'), mon = corpo('pannelloMonete'), gio = corpo('pannelloGiochi');
  for (const id of ['ps-frase', 'ps-premi', 'ps-dopo', 'ps-po-attiva', 'ps-po-ricorda', 'ps-po-conferma', 'ps-risposta', 'btn-salva-presente', 'pr-attivo', 'btn-salva-presenze'])
    assert.ok(pres.includes(`id="${id}"`), `Presenza senza #${id}`);
  for (const id of ['inp-monete', 'forma-monete', 'btn-salva-nome-monete', 'pt-perPresenza', 'btn-salva-punti', 'carta-registro-monete', 'btn-salva-premio', 'lista-vip'])
    assert.ok(mon.includes(`id="${id}"`), `Monete senza #${id}`);
  for (const id of ['inp-monete', 'pt-perPresenza', 'carta-registro-monete', 'pr-attivo', 'lista-vip', 'ps-frase'])
    assert.ok(!gio.includes(`id="${id}"`), `#${id} e' rimasto in Giochi`);
  assert.ok(!gio.includes('data-zona="monete"'));
  const sotto = APP.slice(APP.indexOf('const SOTTO_SCHEDE = {'), APP.indexOf('\n};', APP.indexOf('const SOTTO_SCHEDE = {')));
  assert.match(sotto, /voci: \[\['giochi', \['I giochi', 'Games', 'Los juegos'\]\], \['automatici',/);
  assert.match(corpo('pannelloPresenza'), /Presenze e saluti/, 'e la presenza che si conta da sola sta con quella dichiarata');
  assert.match(pres, /È diversa da «Presenze e saluti», più giù/, 'una frase dice la differenza fra le due');
});

test('ai Pew resta solo l\'effetto della presenza, con un tasto che porta alla Presenza', () => {
  const pew = corpo('pannelloColpi');
  const carta = pew.slice(pew.indexOf('<div class="carta" id="cl-presenza">'), pew.indexOf('<div class="carta" id="cl-bitpew">'));
  for (const id of ['cl-pr-attiva', 'cl-pr-testo', 'cl-pr-comando', 'cl-pr-scala', 'cl-pr-minuto', 'cl-pr-quadro', 'cl-pr-salva', 'cl-pr-prova']) assert.ok(carta.includes(`id="${id}"`), id);
  assert.doesNotMatch(carta, /id="cl-(pr-frase|pr-premi|pr-dopo|pr-rispondi|pr-risposta|po-[a-z-]+)"/, 'frase, serie, porta e risposte non sono dei Pew');
  assert.ok(carta.includes('data-scheda="presenza"'));
  assert.deepEqual(Object.keys(new Function(`return ${corpo('_clPresenzaLeggi').match(/return (\{[\s\S]*?\n {2}\});/)[1].replace(/v\('[^']+'\)\?\.[a-z]+|v\('[^']+'\)/g, '0').replace(/_clPunto\.[xy]/g, '0')}`)()).sort(),
    ['alMinuto', 'attiva', 'comando', 'scala', 'testo', 'x', 'y'], 'i Pew salvano solo l\'effetto');
});

test('i tasti che collegano la strada', () => {
  for (const f of ['pannelloGiochi', 'pannelloNegozio', 'pannelloColpi']) assert.ok(corpo(f).includes('data-scheda="monete"'), `${f}: da dove vengono le monete`);
  assert.ok(corpo('pannelloMonete').includes('data-scheda="presenza"'), 'Monete: chi conta come presente');
  assert.ok(corpo('pannelloPresenza').includes('data-scheda="colpi"'), 'Presenza: l\'effetto a schermo');
});

test('un vecchio link alla parte delle monete di Giochi porta alla scheda Monete', () => {
  assert.match(APP, /const SOTTO_TRASLOCATE = \{ 'giochi\/monete': 'monete' \};/);
  assert.match(APP, /const via = traslocata\(id, b\.dataset\.vaiSotto\);\n\s*if \(via\) \{ vaiAScheda\(via\); return; \}/);
});

test('le schede caricano i loro dati, e la presenza la salva la sua scheda', () => {
  const c = corpo('caricaDatiScheda');
  assert.match(c, /if \(id === 'monete'\) \{ caricaClassifica\(\); _disegnaFormaMonete\(\); contiPunti\(\); caricaRegistroMonete\(\); \}/);
  assert.match(c, /if \(id === 'presenza'\) _presDice\(\);/);
  assert.match(corpo('salvaPresente'), /await salvaImpostazioni\(\{ presente: p \}/);
  assert.match(APP, /presente: \(s\.presente && typeof s\.presente === 'object'\) \? s\.presente : null,/, 'il pannello la prende come gliela da\' il server, gia\' letta');
});
