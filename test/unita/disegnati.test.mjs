// GLI EFFETTI DISEGNATI: le regole che devono restare vere
// (docs/EFFETTI-SCHERMO.md, «I disegni»).
//
// Ogni disegno e' una funzione pura del tempo. Qui si controlla, per ogni
// effetto, ogni quantita', durate agli estremi, schermi diversi e molti semi:
//   - ogni pezzo vive dentro la durata dell'effetto;
//   - nessun pezzo compare o sparisce di colpo: nasce fuori dallo schermo o
//     trasparente, e finisce fuori dallo schermo o trasparente. Le sole
//     eccezioni sono di costruzione: il razzo finisce nel punto dove nasce il
//     suo scoppio, e lo scoppio nasce li';
//   - lo stesso seme da' lo stesso disegno;
//   - il catalogo e' quello del server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { DISEGNI, QUANTI_DISEGNO, normDisegno } from '../../src/web/stile.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const finestra = {};
vm.runInNewContext(readFileSync(join(RAD, 'src/web/public/disegnati.js'), 'utf8'), { window: finestra });
const S = finestra.SB_DISEGNATI;
const js = (x) => JSON.parse(JSON.stringify(x));

const SCHERMI = [[1920, 1080], [480, 270], [1080, 1920]];
const SEMI = [1, 7, 42, 2026, 99991, 123456789];
const EPS = 1e-6;
const fuori = (b, W, H) => b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H;

test('il catalogo del disegno e quello del server sono lo stesso', () => {
  assert.deepEqual(js(S.CATALOGO), DISEGNI);
  assert.deepEqual(js(S.QUANTI), QUANTI_DISEGNO);
  for (const nome of Object.keys(DISEGNI)) {
    assert.deepEqual(js(S.parametri(normDisegno({ nome }))), (({ suono, ...r }) => r)(normDisegno({ nome })), nome);
  }
});

for (const nome of Object.keys(DISEGNI)) {
  test(`${nome}: ogni pezzo vive dentro l'effetto, e nasce e finisce senza strappi`, () => {
    const d = DISEGNI[nome];
    let controllati = 0;
    for (const [W, H] of SCHERMI) for (const durata of [d.min, d.durata, d.max]) for (const quanti of QUANTI_DISEGNO) for (const seme of SEMI) {
      const pn = S.piano({ nome, colori: d.colori, quanti, durata }, seme, W, H);
      assert.equal(pn.D, durata);
      assert.ok(pn.parti.length > 0);
      const scoppi = new Set(pn.parti.filter((q) => q.k === 'bagliore').map((q) => `${q.t0.toFixed(6)}|${q.x.toFixed(3)}|${q.y.toFixed(3)}`));
      for (const q of pn.parti) {
        const dove = `${nome} ${W}x${H} ${durata}s ${quanti} seme ${seme} ${q.k}`;
        assert.ok(q.t0 >= -EPS && q.vita > 0 && q.t0 + q.vita <= durata + EPS, `${dove}: vive da ${q.t0} per ${q.vita}`);
        assert.equal(S.stato(pn, q, q.t0 - 0.01), null, dove);
        assert.equal(S.stato(pn, q, q.t0 + q.vita + 0.01), null, dove);
        const nasce = S.stato(pn, q, q.t0 + 1e-4);
        const muore = S.stato(pn, q, q.t0 + q.vita - 1e-4);
        for (const s of [nasce, muore]) for (const v of [s.x, s.y, s.a, ...s.b]) assert.ok(Number.isFinite(v), `${dove}: ${JSON.stringify(s)}`);
        if (q.k === 'razzo') {
          assert.ok(fuori(nasce.b, W, H), `${dove}: il razzo parte da sotto lo schermo`);
          assert.ok(Math.abs(muore.x - q.xb) < 1 && Math.abs(muore.y - q.yb) < 1, `${dove}: il razzo finisce dove scoppia`);
          assert.ok(scoppi.has(`${(q.t0 + q.vita).toFixed(6)}|${q.xb.toFixed(3)}|${q.yb.toFixed(3)}`), `${dove}: e li' nasce il suo scoppio`);
        } else if (q.k === 'scintilla' || q.k === 'bagliore') {
          assert.ok(scoppi.has(`${q.t0.toFixed(6)}|${q.x.toFixed(3)}|${q.y.toFixed(3)}`), `${dove}: nasce da uno scoppio`);
          assert.ok(muore.a <= 0.05, `${dove}: si spegne (${muore.a})`);
        } else {
          assert.ok(nasce.a <= 0.05 || fuori(nasce.b, W, H), `${dove}: compare di colpo in ${JSON.stringify(nasce.b)} con ${nasce.a}`);
          assert.ok(muore.a <= 0.05 || fuori(muore.b, W, H), `${dove}: sparisce di colpo in ${JSON.stringify(muore.b)} con ${muore.a}`);
        }
        controllati++;
      }
      for (let t = 0; t <= durata; t += durata / 40) for (const q of pn.parti) { const s = S.stato(pn, q, t); if (s) assert.ok(s.a >= 0 && s.a <= 1 + EPS, `${nome}: trasparenza ${s.a}`); }
    }
    assert.ok(controllati > 100);
  });
}

test('lo stesso seme da\' lo stesso disegno, un altro seme un altro', () => {
  for (const nome of Object.keys(DISEGNI)) {
    const a = js(S.piano({ nome }, 12345, 1920, 1080)), b = js(S.piano({ nome }, 12345, 1920, 1080));
    assert.deepEqual(a, b, nome);
    if (nome !== 'lampo') assert.notDeepEqual(js(S.piano({ nome }, 54321, 1920, 1080)), a, nome);
  }
});

test('i colori sono quelli scelti', () => {
  const pn = S.piano({ nome: 'palloncini', colori: ['#123456'], quanti: 'tanti' }, 3, 1920, 1080);
  assert.ok(pn.parti.every((q) => q.col === 'rgb(18,52,86)'));
});

test('quanti conta: pochi meno di normale, normale meno di tanti', () => {
  for (const nome of Object.keys(DISEGNI).filter((n) => n !== 'lampo')) {
    const n = (quanti) => S.piano({ nome, quanti }, 5, 1920, 1080).parti.length;
    assert.ok(n('pochi') < n('normale') && n('normale') < n('tanti'), nome);
  }
});

test('il lampo e\' uno solo, sale in fretta e si spegne alla fine', () => {
  for (const durata of [1, 2, 3]) {
    const pn = S.piano({ nome: 'lampo', durata, quanti: 'tanti' }, 9, 1920, 1080);
    assert.equal(pn.parti.length, 1);
    const q = pn.parti[0];
    const picchi = [];
    let prima = -1, sale = true;
    for (let t = 0; t <= durata; t += 0.005) {
      const a = S.stato(pn, q, t).a;
      if (sale && a < prima) { picchi.push(t); sale = false; }
      if (!sale && a > prima + 1e-9) sale = true;
      prima = a;
    }
    assert.equal(picchi.length, 1, 'un solo picco: niente lampi a raffica');
    assert.ok(S.stato(pn, q, 0.06).a <= 0.85);
  }
});

test('i parametri scritti male tornano quelli di serie, senza rompere niente', () => {
  const p = S.parametri({ nome: 'boh', colori: ['rosso', '#zzzzzz'], quanti: 'mille', durata: 999 });
  assert.equal(p.nome, 'coriandoli');
  assert.deepEqual(js(p.colori), DISEGNI.coriandoli.colori);
  assert.equal(p.quanti, 'normale');
  assert.equal(p.durata, DISEGNI.coriandoli.max);
  assert.ok(S.piano(null, 0, 0, 0).parti.length > 0);
});
