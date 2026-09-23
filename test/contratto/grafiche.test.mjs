// LE GRAFICHE SOCIAL: le cose che stanno fra le tabelle del pannello, il
// motore delle scene e il server, e che nessuno dei tre puo' dire da solo.
//
// Il ragionamento sta in docs/GRAFICHE.md; le misure sui pixel le fa
// scripts/verifica-grafiche.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const finestra = {};
vm.runInNewContext(leggi('src/web/public/graf-scene.js'), { window: finestra, document: {} });
const SCENE = finestra.SB_SCENE.SCENE;

const T = (() => {
  const i = APP.indexOf('const GR_TEMI = {');
  const j = APP.indexOf('function grafOpzioni(', i);
  assert.ok(i >= 0 && j > i, 'non trovo le tabelle delle grafiche');
  return vm.runInNewContext(`${APP.slice(i, j)}\n({ GR_TEMI, GR_PRONTI, GR_CARATTERI, GR_STILI_TITOLO, GR_STILI_RIGHE, GR_VELOCITA })`, { L: (it) => it, document: {}, window: {} });
})();
const HEX = /^#[0-9a-fA-F]{6}$/;

test('ogni tema animato ha la sua scena nel motore, e la sua seconda tinta', () => {
  let animati = 0;
  for (const [id, t] of Object.entries(T.GR_TEMI)) {
    assert.equal(t.nome.length, 3, `${id}: il nome nelle tre lingue`);
    if (!t.anima) continue;
    animati++;
    assert.ok(SCENE[t.anima], `${id}: la scena «${t.anima}» nel motore non c'e'`);
    assert.match(t.acc2, HEX, `${id}: senza seconda tinta`);
  }
  assert.ok(animati >= 14, 'i temi animati ci sono tutti');
  assert.ok(!Object.values(T.GR_TEMI).some((t) => /matrix/i.test(t.nome.join(' '))), 'niente marchi altrui nei nomi');
});

test('ogni stile pronto e\' fatto di scelte che esistono', () => {
  const nomiTemi = new Set(Object.values(T.GR_TEMI).flatMap((t) => t.nome.map((n) => n.toLowerCase())));
  const visti = new Set();
  for (const p of T.GR_PRONTI) {
    assert.ok(!visti.has(p.id), `${p.id} due volte`); visti.add(p.id);
    assert.equal(p.nome.length, 3, `${p.id}: il nome nelle tre lingue`);
    assert.ok(!p.nome.some((n) => nomiTemi.has(n.toLowerCase())), `${p.id}: si chiama come un tema, e sarebbe lo stesso tasto due volte`);
    const c = p.c, tema = T.GR_TEMI[c.tema];
    assert.ok(tema, `${p.id}: il tema «${c.tema}» non c'e'`);
    assert.ok(T.GR_CARATTERI[c.font], `${p.id}: il carattere`);
    assert.ok(T.GR_STILI_TITOLO[c.stileTitolo], `${p.id}: lo stile del titolo`);
    assert.ok(T.GR_STILI_RIGHE[c.stileRighe], `${p.id}: lo stile delle righe`);
    assert.ok(T.GR_VELOCITA[c.velocita], `${p.id}: la velocita'`);
    assert.ok(c.intensita >= 30 && c.intensita <= 100);
    for (const k of ['accento', 'accento2']) assert.ok(c[k] === '' || HEX.test(c[k]), `${p.id}.${k}`);
    for (const [scena, op] of Object.entries(c.op || {})) {
      assert.equal(scena, tema.anima, `${p.id}: opzioni di un'altra scena`);
      for (const [k, v] of Object.entries(op)) {
        const o = SCENE[scena].opzioni.find((x) => x.id === k);
        assert.ok(o, `${p.id}: l'opzione «${k}» la scena non ce l'ha`);
        if (o.tipo === 'si') assert.equal(typeof v, 'boolean');
        else assert.ok(o.voci.some((x) => x[0] === v), `${p.id}: «${v}» non e' una scelta di «${k}»`);
      }
    }
  }
  assert.ok(T.GR_PRONTI.length >= 12);
});

test('il server accetta esattamente le scelte che il pannello offre', () => {
  const r = SRV.slice(SRV.indexOf('if (b.grafiche !== undefined) {'), SRV.indexOf('giorni,', SRV.indexOf('if (b.grafiche !== undefined) {')));
  const elenco = (campo) => {
    const m = new RegExp(`${campo}: tra\\(gr\\.${campo}, \\[([^\\]]+)\\]`).exec(r);
    assert.ok(m, `il server non valida «${campo}»`);
    return m[1].split(',').map((x) => x.trim().replace(/'/g, '')).sort();
  };
  assert.deepEqual(elenco('font'), Object.keys(T.GR_CARATTERI).sort());
  assert.deepEqual(elenco('stileTitolo'), Object.keys(T.GR_STILI_TITOLO).sort());
  assert.deepEqual(elenco('stileRighe'), Object.keys(T.GR_STILI_RIGHE).sort());
  assert.deepEqual(elenco('velocita'), Object.keys(T.GR_VELOCITA).sort());
  assert.match(r, /accento2: \/\^#\[0-9a-fA-F\]\{6\}\$\/\.test/);
  assert.match(r, /intensita: Math\.max\(30, Math\.min\(100/);
  assert.ok(/\bop,/.test(r), 'e le opzioni delle scene');
  assert.ok(Math.max(...Object.keys(T.GR_TEMI).map((id) => id.length)) <= 20, 'il server tiene venti caratteri del nome del tema');
});

test('ogni velocita\' fa un numero intero di giri nella GIF, e GIF e video fanno un giro intero', () => {
  for (const [id, v] of Object.entries(T.GR_VELOCITA)) {
    assert.ok(Number.isInteger(v.vel) && v.vel >= 1, `${id}: la velocita' moltiplica i giri, e i giri devono restare interi`);
    assert.equal(v.durata % 80, 0, `${id}: la GIF va a 12,5 fotogrammi al secondo`);
  }
  assert.match(APP, /const nFrame = animato \? Math\.round\(grafVelocita\(c\)\.durata \/ dt\) : 1;/);
  assert.match(APP, /const dura = grafAnimato\(c\) \? grafVelocita\(c\)\.durata : 4000;/);
});

test('il motore arriva prima del pannello, e i caratteri prima di disegnare', () => {
  const html = leggi('src/web/public/index.html');
  assert.ok(html.indexOf('graf-scene.js') > 0 && html.indexOf('graf-scene.js') < html.indexOf('src="app.js"'));
  for (const f of ['Archivo', 'Instrument Serif', 'Permanent Marker', 'Zen Kaku Gothic New']) assert.ok(leggi('src/web/public/font.css').includes(`font-family: '${f}'`), `${f} non e' servito dal sito`);
  assert.equal([...APP.matchAll(/await grafFontPronti\(\);/g)].length >= 4, true, 'PNG, condividi, GIF e «Manda» aspettano i caratteri');
});

test('niente emoji di serie: il logo e\' l\'iniziale, e il vecchio 🎮 di serie si toglie', () => {
  assert.match(APP, /titolo: '', handle: '@' \+ canale, logo: '', logoImg: '',/);
  assert.match(APP, /if \(c\.logo === '\\u\{1F3AE\}'\) c\.logo = '';/);
  assert.ok(!/'🎮  ' \+/.test(APP), 'nella pillola del gioco niente emoji');
});

test('il cancello delle grafiche sta nella catena dei collaudi', () => {
  assert.match(leggi('package.json'), /node scripts\/verifica-grafiche\.mjs/);
});
