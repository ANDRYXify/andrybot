// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SCHEDA GIOCHI IN QUATTRO PARTI, E UN GIOCO IN UN POSTO SOLO
// (docs/GIOCHI.md, «La scheda in quattro parti, e un gioco in un posto solo»).
//
// Al telefono la scheda era lunga trenta schermate, e un gioco stava in due
// carte: la sua riga fra i comandi e la sua voce fra le regole. Le promesse:
//  · ogni carta sta in una parte della scheda, e ogni parte ha le sue carte;
//  · «Gioco per gioco» mette insieme un gioco col registro dei comandi, non con
//    un elenco suo: !carta nel blackjack, !colpisci nel boss, la trivia che
//    rimanda alla manche, e ogni regola del catalogo in un foglio solo;
//  · le famiglie sono quelle di !giochi, ognuna con la sua etichetta;
//  · un tasto solo salva comandi e regole, prima i comandi;
//  · cercare un gioco non sporca la pagina, e la ricerca apre la parte giusta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('giochi-sezioni-');
const R = await import('../../src/features/comandi-registro.js');
const G = await import('../../src/features/giochi-conf.js');
test.after(() => casa.pulisci());

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const CERCA = readFileSync(join(RAD, 'src/web/public/cerca.js'), 'utf8');

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
function oggetto(nome) {
  const i = APP.indexOf(`const ${nome} = {`);
  assert.ok(i >= 0, `manca ${nome}`);
  let d = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') d++;
    else if (APP[j] === '}' && --d === 0) return new Function(`return (${APP.slice(APP.indexOf('{', i), j + 1)})`)();
  }
  throw new Error(`${nome} non si chiude`);
}
const scheda = () => {
  const i = APP.indexOf("return pannello('giochi', `");
  return APP.slice(i, APP.indexOf('\n}', i));
};

test('ogni carta della scheda sta in una parte, e ogni parte ha le sue carte', () => {
  const parti = oggetto('SOTTO_SCHEDE').giochi.voci.map(([id]) => id);
  assert.deepEqual(parti, ['giochi', 'monete', 'automatici', 'battute']);
  const carte = [...scheda().matchAll(/<div class="carta"([^>]*)>\s*<h2>[^\n]*?L\('([^']+)'/g)].map((m) => ({ zona: m[1].match(/data-zona="([^"]+)"/)?.[1], nome: m[2] }));
  assert.ok(carte.length >= 11, `le carte si trovano (${carte.length})`);
  for (const c of carte) assert.ok(parti.includes(c.zona), `«${c.nome}» ha una parte: ${c.zona}`);
  for (const p of parti) assert.ok(carte.some((c) => c.zona === p), `la parte «${p}» ha almeno una carta`);
  assert.equal(carte.find((c) => c.nome === 'Gioco per gioco')?.zona, 'giochi');
  assert.ok(!scheda().includes('lista-gcmd'), 'la carta dei comandi non c\'è più: i comandi stanno nei giochi');
});

test('ogni famiglia di !giochi ha la sua etichetta, in tre lingue', () => {
  const etichette = oggetto('RG_GRUPPI');
  for (const g of R.GRUPPI) {
    assert.ok(Array.isArray(etichette[g.id]) && etichette[g.id].length === 3 && etichette[g.id].every(Boolean), `etichetta per «${g.id}»`);
  }
});

// I fogli, coi dati veri: le righe come le manda il server e il catalogo come
// lo manda il server.
const fogliDi = (comandi, regole = G.catalogoPerPannello({}).giochi) =>
  new Function('_regole', '_rgCmd', '_g', `${funzione('_rgFogli')}\nreturn _rgFogli();`)(
    { giochi: regole }, comandi ? { comandi, gruppi: R.GRUPPI.map((g) => g.id) } : null,
    () => ({ dataset: { moduli: 'giochi,webcam,puzzle,sorteggi,sito' } }));

test('i fogli nascono dal registro: le mosse nel loro gioco, la trivia che rimanda alla manche', () => {
  const righe = R.elenco('canale-che-non-esiste');
  const gruppi = fogliDi(righe);
  const fogli = gruppi.flatMap((g) => g.fogli);
  const di = (id) => fogli.find((f) => f.id === id);
  assert.deepEqual(di('blackjack').cmd.map((r) => r.id), ['blackjack', 'carta', 'stai'], 'il comando del gioco per primo, poi le mosse');
  assert.deepEqual(di('boss').cmd.map((r) => r.id), ['boss', 'colpisci']);
  assert.deepEqual(di('duello').cmd.map((r) => r.id), ['duello', 'accetta', 'rifiuta']);
  assert.ok(di('abbraccio').cmd.some((r) => r.id === 'nococcole'));
  assert.equal(di('trivia').regola, null, 'la trivia non ha regole sue');
  assert.deepEqual(di('trivia').segue, ['manche'], 'e dice di seguire la manche');
  assert.equal(di('boss').regola?.id, 'boss', 'le regole del boss stanno col suo comando');
  assert.deepEqual(di('slot').segue, [], 'un gioco con le sue regole non rimanda a se stesso');
  const rovescio = fogliDi([...righe].reverse()).flatMap((g) => g.fogli);
  assert.deepEqual(rovescio.find((f) => f.id === 'blackjack').cmd.map((r) => r.id)[0], 'blackjack', 'il comando del gioco resta primo anche se il registro cambia ordine');

  assert.deepEqual(gruppi.map((g) => g.gruppo), [...R.GRUPPI.map((g) => g.id), null], 'le famiglie nell\'ordine di !giochi, poi gli altri comandi');
  assert.deepEqual(gruppi.at(-1).fogli.map((f) => f.id), ['giochi', 'giveaway', 'join', 'biglietti', 'estrai', 'ag']);

  const tutte = fogli.flatMap((f) => f.cmd.map((r) => r.id));
  const attese = righe.filter((r) => ['giochi', 'webcam', 'puzzle', 'sorteggi', 'sito'].includes(r.modulo)).map((r) => r.id);
  assert.deepEqual([...tutte].sort(), [...attese].sort(), 'ogni comando della scheda in un foglio, una volta sola');
  for (const g of G.CATALOGO) {
    const qui = fogli.filter((f) => f.regola?.id === g.id);
    assert.equal(qui.length, 1, `le regole di «${g.id}» in un foglio solo`);
    assert.equal(qui[0].id, g.id, `e nel foglio del suo gioco`);
    assert.ok(qui[0].gruppo, `«${g.id}» sta in una famiglia di !giochi`);
  }
});

test('senza i comandi le regole restano: ogni gioco del catalogo ha comunque il suo foglio', () => {
  const fogli = fogliDi(null).flatMap((g) => g.fogli);
  assert.deepEqual(fogli.map((f) => f.id).sort(), G.CATALOGO.map((g) => g.id).sort());
});

test('un tasto solo salva i comandi e poi le regole', () => {
  const i = APP.indexOf("document.getElementById('btn-salva-regole-giochi')");
  const salva = APP.slice(i, APP.indexOf('}));', i));
  assert.match(salva, /_gcScelte\(righe, \(li\) => li\.querySelector\('\[data-gc-on\]'\) \|\| box\.querySelector\(`\[data-gc-on\]\[data-gc-di="\$\{CSS\.escape\(li\.dataset\.gc\)\}"\]`\)\)/, 'l\'interruttore del gioco sta nel titolo, fuori dalla sua riga');
  const comandi = salva.indexOf("api('/api/streamer/comandi-pronti', { method: 'POST'");
  const regole = salva.indexOf("api('/api/streamer/giochi/regole', { method: 'POST'");
  assert.ok(comandi > 0 && regole > comandi, 'prima i comandi: se un nome è già preso non si salva niente');
});

test('cercare un gioco non sporca la pagina', () => {
  assert.match(funzione('_rgDisegna'), /<input type="search" data-rg-filtro/);
  assert.match(APP, /const NON_SALVA = '[^']*\[data-rg-filtro\]/, 'la ricerca non e\' un\'impostazione: resta fuori dalla firma');
});

test('la ricerca ha una funzione sola per scoprire dove sta una cosa, e apre la parte giusta', () => {
  assert.equal(CERCA.split('function scopri(').length - 1, 1, 'una seconda «scopri» coprirebbe la prima, come succedeva');
  assert.match(CERCA, /function scopri\(el\) \{\s*if \(!el\.closest\) return;\s*if \(window\.SB_APP && window\.SB_APP\.mostraZonaDi && window\.SB_APP\.mostraZonaDi\(el\)\) return;/);
});
