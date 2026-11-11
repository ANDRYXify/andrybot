// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL MENU SU MISURA: GLI INVARIANTI STANNO NELLA FUNZIONE (docs/MENU.md).
//
// Sopra il menu di fabbrica c'e' quello di chi usa il pannello: le sue voci in
// cima, quelle nascoste, l'ordine, la barra del telefono. Lo calcola una
// funzione pura, `menuSuMisura(fabbrica, scelte)`, e qui la si prende dal
// pannello cosi' com'e' e la si prova sulle tabelle vere: qualunque cosa uno
// abbia scelto (o qualunque cosa sia rimasta salvata da una versione di prima),
// nessuna voce si perde, nessuna si doppia, e una voce nuova ha il suo posto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-menu-misura-');

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const DOC = readFileSync(join(RAD, 'docs/MENU.md'), 'utf8');
const { pulisci, diSerie, menuDi, salvaMenu, MIE_MAX, BARRA_MAX } = await import('../../src/features/menu-persona.js');
const { streamers } = await import('../../src/db.js');

function corpo(nome) {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `manca ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i) + 2);
}
function valore(inizio, fine) {
  const i = APP.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  return new Function(`return (${APP.slice(i + inizio.length - 1, APP.indexOf(fine, i) + fine.length)});`)();
}
const { menuPulito, menuOrdina, menuSuMisura } = new Function(
  `${corpo('menuPulito')}\n${corpo('menuOrdina')}\n${corpo('menuSuMisura')}\nreturn { menuPulito, menuOrdina, menuSuMisura };`)();
const GRUPPI = valore('const GRUPPI = [', '\n]');
const T_GRUPPO = valore('const T_GRUPPO = {', '\n}');
const TUTTE = GRUPPI.flatMap((g) => g.schede.map(([id]) => id));
const voci = (m) => m.gruppi.flatMap((g) => g.schede.map(([id]) => id));
const nascoste = (m) => m.nascoste.map(([id]) => id);
const ordinate = (x) => x.slice().sort().join();

test('senza scelte, o con scelte guaste, il menu e\' quello di fabbrica', () => {
  for (const guasto of [undefined, null, 7, 'x', [], { mie: 'no', nascoste: { a: 1 }, ordine: [1, 2], gruppi: 3, barra: null, modo: 'boh', righe: 9, apre: {} }]) {
    const m = menuSuMisura(GRUPPI, guasto);
    assert.deepEqual(voci(m), TUTTE);
    assert.deepEqual(m.gruppi.map((g) => g.id), GRUPPI.map((g) => g.id));
    assert.deepEqual([m.mie, nascoste(m), m.barra, m.modo, m.righe, m.apre], [[], [], [], 'uno', 'comode', 'stato']);
  }
});

test('ogni voce esce una volta sola, nel suo gruppo o fra le nascoste, qualunque cosa si scelga', () => {
  const casi = [
    { nascoste: ['consolify', 'telegram', 'ruoli', 'stato', 'inventata'] },
    { gruppi: ['account', 'inventato', 'diretta'], ordine: { diretta: ['musica', 'inventata', 'regia'], inventato: ['x'], gioca: ['penitenze'] } },
    { mie: ['clip', 'clip', 'monete', 'inventata'], nascoste: ['clip', 'giochi'] },
    { nascoste: TUTTE },
    { mie: TUTTE, nascoste: TUTTE, gruppi: GRUPPI.map((g) => g.id).reverse(), barra: TUTTE },
  ];
  for (const scelte of casi) {
    const m = menuSuMisura(GRUPPI, scelte);
    assert.equal(ordinate([...voci(m), ...nascoste(m)]), ordinate(TUTTE), JSON.stringify(scelte).slice(0, 80));
    for (const g of m.gruppi) {
      const fabbrica = GRUPPI.find((x) => x.id === g.id);
      assert.ok(g.schede.length > 0, `il gruppo «${g.id}» vuoto non si disegna`);
      for (const [id] of g.schede) assert.ok(fabbrica.schede.some(([f]) => f === id), `«${id}» ha cambiato gruppo`);
    }
    assert.ok(m.mie.every((id) => TUTTE.includes(id)) && new Set(m.mie).size === m.mie.length && m.mie.length <= MIE_MAX);
    assert.ok(m.barra.every((id) => TUTTE.includes(id)) && m.barra.length <= BARRA_MAX);
  }
});

test('Stato non si nasconde, e una voce fra le mie non e\' nascosta', () => {
  const m = menuSuMisura(GRUPPI, { nascoste: TUTTE, mie: ['clip'] });
  assert.ok(voci(m).includes('stato') && !nascoste(m).includes('stato'));
  assert.ok(voci(m).includes('clip') && !nascoste(m).includes('clip'));
  assert.equal(voci(m).length, 2);
});

test('l\'ordine scelto vale, per i gruppi e per le voci', () => {
  // il pannello scrive sempre l'elenco intero del gruppo; un elenco a meta'
  // resta solo quando una voce nasce dopo, e allora segue chi la precede
  const intero = GRUPPI.find((g) => g.id === 'diretta').schede.map(([id]) => id).filter((id) => id !== 'musica' && id !== 'regia');
  const m = menuSuMisura(GRUPPI, { gruppi: ['account', 'diretta'], ordine: { diretta: ['musica', 'regia', ...intero] } });
  assert.deepEqual(menuOrdina(['a', 'b', 'c', 'd'], ['c', 'a']), ['c', 'd', 'a', 'b']);
  assert.deepEqual(menuOrdina(['a', 'b', 'c'], ['z', 'c']), ['a', 'b', 'c']);
  const ids = m.gruppi.map((g) => g.id);
  assert.ok(ids.indexOf('account') < ids.indexOf('diretta'), 'account sta prima di diretta');
  assert.deepEqual(m.gruppi.find((g) => g.id === 'diretta').schede.map(([id]) => id).slice(0, 2), ['musica', 'regia']);
});

test('una voce e un gruppo nati dopo le scelte compaiono al loro posto di fabbrica', () => {
  const scelte = { gruppi: GRUPPI.map((g) => g.id).reverse(), ordine: { diretta: ['consolify', 'musica', 'clip', 'regia'] } };
  const domani = GRUPPI.map((g) => (g.id === 'diretta' ? { ...g, schede: [g.schede[0], ['nuova', 'Nuova'], ...g.schede.slice(1)] } : g))
    .concat([{ id: 'altro', nome: 'Altro gruppo', schede: [['a1', 'A1'], ['a2', 'A2']] }]);
  const m = menuSuMisura(domani, scelte);
  const diretta = m.gruppi.find((g) => g.id === 'diretta').schede.map(([id]) => id);
  assert.equal(diretta[diretta.indexOf('regia') + 1], 'nuova', 'la voce nuova segue la voce che la precede in fabbrica');
  assert.ok(m.gruppi.some((g) => g.id === 'altro'), 'il gruppo nuovo c\'e\'');
  assert.equal(voci(m).length, TUTTE.length + 3);
});

test('la ripulitura del server e quella del pannello sono la stessa', () => {
  const casi = [undefined, null, 'x', [], {}, { mie: ['clip', 'CLIP', 'a b', 'clip', 7, 'x'.repeat(30)], nomeMie: '  Le <b>mie</b>\u0007 preferite di sempre e per sempre  ' },
    { nascoste: TUTTE.concat(TUTTE), gruppi: ['a', 'b', 'a'], ordine: { diretta: ['x', 'x', 'y'], 'no no': ['z'], vuoto: 'x' }, barra: ['a', 'b', 'c', 'd', 'e'] },
    { modo: 'tutti', righe: 'fitte', apre: 'ultima' }, { modo: 'ricorda', apre: 'clip' }, { modo: 1, righe: null, apre: 'Non Valida' },
    { mie: Array.from({ length: 40 }, (_, i) => 'v' + i) }];
  for (const c of casi) assert.deepEqual(pulisci(c), menuPulito(c), JSON.stringify(c)?.slice(0, 60));
  const p = pulisci(casi[5]);
  assert.deepEqual(p.mie, ['clip']);
  assert.ok(!/[<>\u0000-\u001f]/.test(p.nomeMie) && p.nomeMie.length <= 24);
  assert.equal(pulisci(casi[10]).mie.length, MIE_MAX);
  assert.ok(diSerie(undefined) && diSerie({ modo: 'boh' }) && !diSerie({ mie: ['clip'] }) && !diSerie({ righe: 'fitte' }));
});

test('le scelte sono della persona: stanno nel conto di chi e\' entrato, non nel canale gestito', () => {
  const SERVER = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(SERVER, /menu: menuPersona\.menuDi\(ident\),/);
  assert.match(SERVER, /app\.post\('\/api\/persona\/menu', requireLogin, \(req, res\) => \{\n\s+const salvate = menuPersona\.salvaMenu\(identitaDi\(currentUser\(req\)\), req\.body\?\.menu\);/);
});

test('salvare e rileggere: le scelte tornano ripulite, il resto delle impostazioni non si tocca, «di serie» non lascia niente', () => {
  streamers.upsertApproved('menuprova', 'MenuProva');
  streamers.setSettings('menuprova', { tono: 'allegro' });
  assert.equal(menuDi('menuprova'), null, 'senza scelte: il menu di serie');
  const salvate = salvaMenu('MenuProva', { mie: ['clip', 'no no'], nascoste: ['consolify'], righe: 'fitte', estranea: 1 });
  assert.deepEqual([salvate.mie, salvate.nascoste, salvate.righe, 'estranea' in salvate], [['clip'], ['consolify'], 'fitte', false]);
  assert.deepEqual(menuDi('menuprova'), salvate);
  assert.equal(streamers.get('menuprova').settings.tono, 'allegro');
  salvaMenu('menuprova', {});
  assert.equal(menuDi('menuprova'), null);
  assert.ok(!('menu' in streamers.get('menuprova').settings), '«di serie» toglie la chiave');
  assert.equal(salvaMenu('chi-non-ha-un-conto', { mie: ['clip'] }), null, 'senza un conto suo si salva nel browser');
});

test('la fabbrica resta una: info, percorsi e lente leggono GRUPPI, il cassetto e la barra il menu su misura', () => {
  assert.match(corpo('navDrawerHtml'), /const m = menuMio\(\);/);
  assert.match(corpo('barraGiuHtml'), /const scelte = menuMio\(\)\.barra\.filter\(/);
  assert.match(corpo('barraGiuHtml'), /voce\('altro', _icoAltro, !coperta, 'data-apri-menu="1"'\)/, '«Altro» c\'e\' sempre');
  for (const f of ['infoScheda', 'percorso', 'novScheda']) assert.ok(!corpo(f).includes('menuMio('), `${f} deve dire il posto di fabbrica`);
  assert.match(APP, /get gruppi\(\) \{ return GRUPPI; \}/, 'la lente cerca nella fabbrica');
});

test('l\'elenco «Il menu» del documento e\' quello del pannello', () => {
  const blocco = DOC.slice(DOC.indexOf('## Il menu\n'), DOC.indexOf('## Come si misura'));
  const righe = blocco.split('\n').filter((r) => r.startsWith('- ')).map((r) => r.slice(2));
  const attese = GRUPPI.map((g) => (g.schede.length === 1 ? g.schede[0][1] : `${T_GRUPPO[g.id][0]}: ${g.schede.map(([, n]) => n).join(', ')}`));
  assert.deepEqual(righe, attese);
});
