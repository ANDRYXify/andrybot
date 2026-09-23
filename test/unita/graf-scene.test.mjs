// IL MOTORE DELLE SCENE: i difetti che non devono esistere.
//
// Il ragionamento sta in docs/GRAFICHE.md. Qui le cose che devono restare
// vere, senza browser:
//  · il synthwave e' una camera sopra un pavimento finito: le linee escono da
//    tutto l'orizzonte e vanno al punto di fuga, che sta dentro il sole;
//  · le trasversali si infittiscono verso l'orizzonte, e un giro le rimette
//    dove erano;
//  · niente dado nelle scene: ogni fotogramma si rifa' identico;
//  · ogni opzione di ogni scena parla le tre lingue, e ha la forma che il
//    server accetta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CODICE = readFileSync(join(RAD, 'src/web/public/graf-scene.js'), 'utf8');
const finestra = {};
vm.runInNewContext(CODICE, { window: finestra, document: {} });
const S = finestra.SB_SCENE;

const FORMATI = [['la settimana', 1080, 1350, 430], ['il «Live ora»', 1080, 1080, 560]];

test('il punto di fuga sta dentro il sole, in tutte e due le composizioni', () => {
  for (const [nome, W, H, orizzonte] of FORMATI) {
    for (const composizione of ['poster', 'classica']) {
      const g = S.geometriaSynth(W, H, { lay: { orizzonte }, op: { composizione } });
      assert.ok(g.yV > g.cy - g.R && g.yV < g.yOr, `${nome}, ${composizione}: il punto di fuga e' fuori dal sole`);
      if (composizione === 'poster') assert.equal(g.yOr, orizzonte, 'nel poster l\'orizzonte e\' quello che dicono i testi');
    }
  }
});

test('le linee del pavimento escono da tutto l\'orizzonte e vanno al punto di fuga', () => {
  for (const [nome, W, H, orizzonte] of FORMATI) {
    const g = S.geometriaSynth(W, H, { lay: { orizzonte }, op: {} });
    const rete = S.grigliaSynth(g.cam, 0.37, g.passo, g.n);
    for (const l of rete.lon) {
      const x = l.x1 + (l.x2 - l.x1) * (g.yV - l.y1) / (l.y2 - l.y1);
      assert.ok(Math.abs(x - W / 2) < 1e-6, `${nome}: una linea prolungata non passa dal punto di fuga`);
      assert.equal(l.y1, g.yOr, 'ogni linea comincia sull\'orizzonte, non sotto il sole');
      assert.equal(l.y2, H);
    }
    const suOrizzonte = rete.lon.map((l) => l.x1).sort((a, b) => a - b);
    const passi = suOrizzonte.slice(1).map((x, i) => x - suOrizzonte[i]);
    assert.ok(Math.min(...passi) >= 8, `${nome}: all'orizzonte le linee sono distanziate, non un fascio da un punto solo`);
    assert.ok(Math.max(...passi) - Math.min(...passi) < 1e-6, 'e a passo costante');
    assert.ok(suOrizzonte[0] <= 0 && suOrizzonte[suOrizzonte.length - 1] >= W, 'e coprono tutto l\'orizzonte');
  }
});

test('le trasversali si infittiscono verso l\'orizzonte, e un giro le rimette dove erano', () => {
  for (const [nome, W, H, orizzonte] of FORMATI) {
    const g = S.geometriaSynth(W, H, { lay: { orizzonte }, op: {} });
    for (const fase of [0, 0.25, 0.5, 0.75]) {
      const ys = S.grigliaSynth(g.cam, fase, g.passo, g.n).tr.map((t) => t.y).sort((a, b) => a - b);
      assert.ok(ys.length >= g.n, `${nome}: mancano trasversali`);
      for (const y of ys) assert.ok(y >= g.yOr - 1e-9 && y <= H + 1e-9, `${nome}: una trasversale fuori dal pavimento`);
      for (let i = 2; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= ys[i - 1] - ys[i - 2] - 1e-9, `${nome}: verso chi guarda le trasversali si allargano`);
    }
    const k = (fase) => S.grigliaSynth(g.cam, fase, g.passo, g.n).tr.map((t) => t.y.toFixed(6)).sort().join(' ');
    assert.equal(k(1), k(0), `${nome}: dopo un giro intero la griglia e' la stessa`);
    assert.notEqual(k(0.5), k(0), 'e a meta\' giro si e\' mossa');
  }
});

test('niente dado nelle scene: ogni fotogramma si rifa\' identico', () => {
  assert.ok(!/Math\.random|Date\.now|new Date|performance\.now/.test(CODICE), 'le scene si muovono solo col tempo che ricevono');
});

test('ogni opzione di ogni scena parla le tre lingue, e ha la forma che il server accetta', () => {
  const parola = /^[a-z]{1,20}$/;
  for (const [id, sc] of Object.entries(S.SCENE)) {
    assert.match(id, parola);
    assert.equal(typeof sc.disegna, 'function');
    for (const o of sc.opzioni) {
      assert.match(o.id, parola, `${id}.${o.id}`);
      assert.equal(o.nome.length, 3, `${id}.${o.id} senza le tre lingue`);
      assert.ok(o.nome.every(Boolean));
      if (o.tipo === 'scelta') for (const v of o.voci) { assert.match(v[0], parola); assert.equal(v.length, 4, `${id}.${o.id}.${v[0]} senza le tre lingue`); }
      else assert.equal(o.tipo, 'si');
    }
  }
});

test('un colore che non regge si sposta quanto basta, e poi regge', () => {
  const sotto = [[30, 20, 60]];
  const nuovo = S.coloreCheRegge('#8b5cf6', sotto, 4.5, '#ffffff');
  assert.ok(S.regge(nuovo, sotto, 4.5));
  assert.ok(!S.regge('#8b5cf6', sotto, 4.5), 'il viola di partenza da solo non bastava');
  assert.notEqual(nuovo, '#ffffff', 'non si butta il colore: si schiarisce');
});
