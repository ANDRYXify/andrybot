// IL MOTORE DEL MURO DELLE EMOTE: le regole che devono restare vere.
//
// Il ragionamento sta in docs/MURO-EMOTE.md. Ogni traiettoria e' una funzione
// pura del tempo: qui la si campiona fitta e si controlla la regola della sua
// animazione, sotto aree diverse (larga, alta, piccola, una fascia bassa, una
// colonna stretta) e con generatori ai due estremi e con molti semi. Il caso
// sceglie dentro intervalli gia' giusti: se una regola cade con un seme, il
// difetto e' nel modo di scegliere, non nel seme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const finestra = {};
vm.runInNewContext(readFileSync(join(RAD, 'src/web/public/muro.js'), 'utf8'), { window: finestra });
const M = finestra.SB_MURO;
const js = (x) => JSON.parse(JSON.stringify(x));

const AREE = [
  { nome: 'schermo', w: 1920, h: 1080 },
  { nome: 'verticale', w: 1080, h: 1920 },
  { nome: 'riquadro piccolo', w: 400, h: 300 },
  { nome: 'fascia bassa', w: 1600, h: 140 },
  { nome: 'colonna stretta', w: 130, h: 900 },
];

function seme(n) {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const GENERATORI = [['sempre 0', () => 0], ['quasi 1', () => 0.999999], ...Array.from({ length: 60 }, (_, i) => ['seme ' + i, seme(i + 1)])];

const EPS = 1e-6;
const campioni = (tr, n = 400) => {
  const t = new Set(M.tempi(tr));
  for (let i = 0; i <= n; i++) t.add(i / n);
  return [...t].sort((a, b) => a - b);
};

function perOgni(nome, fn) {
  for (const area of AREE) {
    for (const [gen, rnd] of GENERATORI) {
      for (const grandezza of [3, 8, 30]) {
        const s = M.lato(area, { grandezza, varia: 40, minPx: 12, maxPx: 400 }, rnd);
        const tr = M.anima(nome, area, s, rnd, { durata: 6 });
        fn({ area, s, h: s / 2, q: (s / 2) * Math.SQRT2, tr, dove: `${nome} in ${area.nome} (${gen}, s=${s.toFixed(1)})` });
      }
    }
  }
}

test('la grandezza sta nei limiti scelti, e mai oltre meta\' del lato corto', () => {
  for (const area of AREE) {
    for (const [, rnd] of GENERATORI) {
      const s = M.lato(area, { grandezza: 40, varia: 100, minPx: 20, maxPx: 300 }, rnd);
      assert.ok(s <= Math.min(area.w, area.h) / 2 + EPS, `${area.nome}: ${s}`);
      assert.ok(s <= 300 + EPS);
    }
  }
});

test('nessuna animazione salta: fra due istanti vicinissimi l\'emote si sposta di pochissimo', () => {
  for (const nome of M.ANIMAZIONI) {
    perOgni(nome, ({ tr, dove }) => {
      const passo = 1e-6;
      for (const t of campioni(tr, 300)) {
        if (t + passo > 1) continue;
        const a = tr.p(t), b = tr.p(t + passo);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 2, `${dove}: salto a t=${t}`);
      }
    });
  }
});

test('sale, linea, coriandoli, salto: entrano ed escono del tutto, e di lato restano dentro', () => {
  perOgni('sale', ({ area, h, q, tr, dove }) => {
    assert.ok(Math.abs(tr.p(0).y - (area.h + q)) < EPS && Math.abs(tr.p(1).y + q) < EPS, dove);
    for (const t of campioni(tr)) { const f = tr.p(t); assert.ok(f.x >= h - EPS && f.x <= area.w - h + EPS, `${dove} x=${f.x}`); }
  });
  perOgni('linea', ({ area, h, q, tr, dove }) => {
    assert.ok([-q, area.w + q].some((x) => Math.abs(tr.p(0).x - x) < EPS), dove);
    for (const t of campioni(tr)) { const f = tr.p(t); assert.ok(f.y >= h - EPS && f.y <= area.h - h + EPS, `${dove} y=${f.y}`); }
  });
  perOgni('coriandoli', ({ area, q, tr, dove }) => {
    assert.ok(Math.abs(tr.p(0).y + q) < EPS && Math.abs(tr.p(1).y - area.h - q) < EPS, dove);
    let prima = -Infinity;
    for (const t of campioni(tr)) {
      const f = tr.p(t);
      assert.ok(f.x >= q - EPS && f.x <= area.w - q + EPS, `${dove} x=${f.x}`);
      assert.ok(f.y >= prima - EPS, `${dove}: risale a t=${t}`);
      prima = f.y;
    }
  });
  perOgni('salto', ({ area, q, tr, dove }) => {
    assert.ok(Math.abs(tr.p(0).y - area.h - q) < EPS && Math.abs(tr.p(1).y - area.h - q) < EPS, dove);
    for (const t of campioni(tr)) {
      const f = tr.p(t);
      assert.ok(f.y - q >= -EPS, `${dove}: esce dalla cima a t=${t}`);
      assert.ok(f.x >= q - EPS && f.x <= area.w - q + EPS, `${dove} x=${f.x}`);
    }
  });
});

test('rimbalzo e lancio: toccano il fondo a ogni urto, non lo passano, e non escono dalla cima', () => {
  for (const nome of ['rimbalzo', 'lancio']) {
    perOgni(nome, ({ area, h, tr, dove }) => {
      assert.ok(tr.urti.length >= 1, `${dove}: nessun urto`);
      for (const t of campioni(tr, 1200)) {
        const f = tr.p(t);
        assert.ok(f.y + h * f.sy <= area.h + 1e-6, `${dove}: sotto il fondo a t=${t} (${f.y + h * f.sy} > ${area.h})`);
        assert.ok(f.y - h >= -1e-6, `${dove}: oltre la cima a t=${t}`);
      }
      for (const t of tr.urti) {
        const f = tr.p(t);
        assert.ok(Math.abs(f.y + h * f.sy - area.h) < 1e-6, `${dove}: all'urto non tocca il fondo`);
        assert.ok(f.sy < 1, `${dove}: all'urto non si schiaccia`);
      }
    });
  }
});

test('rimbalzo: rotola senza strisciare, e non risale oltre la quota di partenza', () => {
  perOgni('rimbalzo', ({ h, tr, dove }) => {
    const p0 = tr.p(0);
    for (const t of campioni(tr)) {
      const f = tr.p(t);
      assert.ok(Math.abs(f.r - ((f.x - p0.x) / h) * (180 / Math.PI)) < 1e-6, `${dove}: rotazione non da rotolamento`);
      assert.ok(f.y >= p0.y - 1e-6, `${dove}: risale oltre la partenza`);
    }
  });
});

test('sfreccia: allungata e inclinata, il suo ingombro sta nell\'altezza', () => {
  perOgni('sfreccia', ({ area, h, tr, dove }) => {
    for (const t of campioni(tr)) {
      const f = tr.p(t);
      const th = (f.r * Math.PI) / 180;
      const e = h * Math.hypot(f.sx * Math.sin(th), f.sy * Math.cos(th));
      assert.ok(f.y - e >= -1e-6 && f.y + e <= area.h + 1e-6, `${dove}: ingombro fuori a t=${t}`);
      assert.ok(Math.abs(th) <= (12 * Math.PI) / 180 + 1e-9, `${dove}: troppo inclinata`);
    }
  });
});

test('cade: appesa dentro l\'area, poi esce dal fondo; di lato mai fuori', () => {
  perOgni('cade', ({ area, q, tr, dove }) => {
    for (const t of campioni(tr)) {
      const f = tr.p(t);
      assert.ok(f.x >= q - EPS && f.x <= area.w - q + EPS, `${dove} x=${f.x}`);
      if (t <= tr.eventi[0]) assert.ok(f.y - q >= -EPS, `${dove}: appesa fuori dalla cima`);
    }
    assert.ok(Math.abs(tr.p(1).y - area.h - q) < EPS, dove);
  });
});

test('pulsa e orbita: il disco dell\'emote resta nell\'area anche al massimo del battito', () => {
  for (const nome of ['pulsa', 'orbita']) {
    perOgni(nome, ({ area, h, tr, dove }) => {
      for (const t of campioni(tr)) {
        const f = tr.p(t);
        const r = h * Math.max(f.sx, f.sy);
        assert.ok(f.x - r >= -EPS && f.x + r <= area.w + EPS && f.y - r >= -EPS && f.y + r <= area.h + EPS, `${dove} a t=${t}`);
      }
    });
  }
});

test('i fotogrammi hanno gli istanti in ordine, da 0 a 1, e contengono gli urti per nome', () => {
  const rnd = seme(7);
  for (const nome of M.ANIMAZIONI) {
    const area = AREE[0];
    const tr = M.anima(nome, area, 80, rnd, { durata: 6 });
    const f = M.fotogrammi(tr, 80, { entrata: 'zoom' });
    assert.equal(f[0].offset, 0); assert.equal(f[f.length - 1].offset, 1);
    for (let i = 1; i < f.length; i++) assert.ok(f[i].offset > f[i - 1].offset, nome);
    for (const k of f) assert.match(k.transform, /^translate\(-?[\d.]+px,-?[\d.]+px\) rotate\(-?[\d.]+deg\) scale\(-?[\d.]+,-?[\d.]+\)$/);
    for (const u of tr.urti || []) assert.ok(f.some((k) => k.offset === u), `${nome}: urto non campionato`);
  }
});

test('entrata a zoom o in dissolvenza: parte da niente solo chi nasce dentro l\'area', () => {
  const area = AREE[0];
  const rnd = seme(3);
  for (const nome of M.ANIMAZIONI) {
    const tr = M.anima(nome, area, 80, rnd, { durata: 6 });
    const zoom = M.fotogrammi(tr, 80, { entrata: 'zoom' })[0];
    const sfuma = M.fotogrammi(tr, 80, { entrata: 'dissolvenza' })[0];
    const niente = M.fotogrammi(tr, 80, { entrata: 'nessuna' })[0];
    if (tr.nasceDentro) {
      assert.match(zoom.transform, /scale\(0,0\)$/, nome);
      assert.equal(sfuma.opacity, 0, nome);
    } else {
      assert.doesNotMatch(zoom.transform, /scale\(0,0\)$/, nome);
    }
    assert.equal(niente.opacity, tr.nasceDentro ? 1 : niente.opacity);
  }
});

const figura = (nome, area, n, rnd, opz) => M.figura(nome, area, Math.min(area.w, area.h) / 12, n, rnd, { durata: 6, ...(opz || {}) });

test('fuochi: il razzo sale al punto dello scoppio, e le direzioni sono equidistanti', () => {
  for (const area of AREE) {
    for (const [, rnd] of GENERATORI.slice(0, 12)) {
      const F = figura('fuochi', area, 24, rnd);
      const [razzo, ...scoppio] = F.membri;
      assert.equal(razzo.ruolo, 'razzo');
      const o = scoppio[0].origine;
      const fine = razzo.tr.p(1);
      assert.ok(Math.hypot(fine.x - o.x, fine.y - o.y) < EPS, 'il razzo non arriva allo scoppio');
      scoppio.forEach((m) => { const p = m.tr.p(0); assert.ok(Math.hypot(p.x - o.x, p.y - o.y) < EPS); });
      for (let i = 1; i < scoppio.length; i++) assert.ok(Math.abs(scoppio[i].angolo - scoppio[i - 1].angolo - (Math.PI * 2) / scoppio.length) < 1e-9);
    }
  }
});

test('fontana: ogni getto parte dall\'ugello e ci ricade alla stessa quota', () => {
  for (const area of AREE) {
    const F = figura('fontana', area, 20, seme(5));
    for (const m of F.membri) {
      const a = m.tr.p(0), b = m.tr.p(1);
      assert.ok(Math.hypot(a.x - m.origine.x, a.y - m.origine.y) < EPS);
      assert.ok(Math.abs(b.y - m.origine.y) < EPS);
    }
  }
});

test('spirale: ogni emote sta su una spirale d\'Archimede, e finisce dentro l\'area', () => {
  for (const area of AREE) {
    const F = figura('spirale', area, 18, seme(9));
    const s = Math.min(area.w, area.h) / 12;
    const cx = area.w / 2, cy = area.h / 2, rx = area.w / 2 - s / 2, ry = area.h / 2 - s / 2;
    for (const m of F.membri) {
      for (let i = 1; i <= 50; i++) {
        const t = i / 50;
        const p = m.tr.p(t);
        const u = (p.x - cx) / rx, v = (p.y - cy) / ry;
        const rho = Math.hypot(u, v);
        assert.ok(Math.abs(rho - t) < 1e-9, 'il raggio non cresce con l\'angolo');
        const atteso = m.braccio + m.verso * m.PHI * rho;
        const diff = Math.atan2(v, u) - atteso;
        assert.ok(Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) < 1e-6, 'fuori dalla spirale');
      }
    }
  }
});

test('pioggia: ogni goccia sta nella sua colonna, e le colonne dividono la larghezza in parti uguali', () => {
  for (const area of AREE) {
    const s = Math.min(area.w, area.h) / 12, h = s / 2;
    const F = figura('pioggia', area, 16, seme(11));
    for (const m of F.membri) {
      const x = m.tr.p(0.5).x;
      assert.ok(Math.abs(m.larghezza - (area.w - 2 * h) / 16) < EPS);
      assert.ok(x >= h + m.colonna * m.larghezza - EPS && x <= h + (m.colonna + 1) * m.larghezza + EPS);
    }
  }
});

test('trenino: ogni vagone fa la strada del primo, in ritardo, e sta nell\'altezza', () => {
  for (const area of AREE) {
    const s = Math.min(area.w, area.h) / 12, h = s / 2;
    const F = figura('trenino', area, 12, seme(13));
    const primo = F.membri[0];
    F.membri.forEach((m, i) => {
      assert.equal(m.tr.p, primo.tr.p);
      if (i) assert.ok(m.ritardo > F.membri[i - 1].ritardo);
      for (let k = 0; k <= 40; k++) { const y = m.tr.p(k / 40).y; assert.ok(y >= h - EPS && y <= area.h - h + EPS); }
    });
  }
});

test('piramide: i gradini hanno una emote in meno a ogni fila, e ognuna poggia sulle due sotto', () => {
  for (const area of AREE) {
    for (const n of [1, 3, 10, 30, 44]) {
      const F = figura('piramide', area, n, seme(n));
      const k = Math.max(...F.membri.map((m) => m.fila)) + 1;
      assert.equal(F.membri.length, (k * (k + 1)) / 2);
      assert.ok(F.membri.length <= n && ((k + 1) * (k + 2)) / 2 > n, `${area.nome} n=${n}`);
      const lato = F.membri[0].lato;
      for (let r = 0; r < k; r++) assert.equal(F.membri.filter((m) => m.fila === r).length, k - r);
      for (const m of F.membri) {
        assert.ok(m.posto.x - lato / 2 >= -EPS && m.posto.x + lato / 2 <= area.w + EPS);
        assert.ok(m.posto.y - lato / 2 >= -EPS);
        if (m.fila === 0) { assert.ok(Math.abs(m.posto.y + lato / 2 - area.h) < 1e-9, 'la base non tocca il fondo'); continue; }
        const sotto = F.membri.filter((x) => x.fila === m.fila - 1 && (x.j === m.j || x.j === m.j + 1));
        assert.equal(sotto.length, 2);
        assert.ok(Math.abs(m.posto.x - (sotto[0].posto.x + sotto[1].posto.x) / 2) < 1e-9);
        for (const x of sotto) assert.ok(Math.abs(Math.hypot(m.posto.x - x.posto.x, m.posto.y - x.posto.y) - lato) < 1e-9, 'non tocca quella sotto');
      }
    }
  }
});

test('scritta: le caselle occupate sono esattamente i punti delle lettere', () => {
  const area = AREE[0];
  const F = figura('scritta', area, 30, seme(2), { parola: 'hi' });
  assert.equal(F.membri.length, 17 + 11);
  const P = M.punti('HI');
  const chiave = (c) => c.col + ':' + c.riga;
  assert.deepEqual(new Set(F.membri.map((m) => chiave(m.casella))), new Set(P.punti.map(chiave)));
  assert.equal(M.parola('Però!'), 'PERO!');
  assert.equal(M.parola(''), 'GG');
  for (const a of AREE) {
    const G = figura('scritta', a, 30, seme(4), { parola: 'HYPE' });
    const lato = G.membri[0].lato;
    for (const m of G.membri) assert.ok(m.posto.x - lato / 2 >= -EPS && m.posto.x + lato / 2 <= a.w + EPS && m.posto.y - lato / 2 >= -EPS && m.posto.y + lato / 2 <= a.h + EPS, a.nome);
    for (let i = 0; i < G.membri.length; i++) {
      for (let j = i + 1; j < G.membri.length; j++) {
        const d = Math.hypot(G.membri[i].posto.x - G.membri[j].posto.x, G.membri[i].posto.y - G.membri[j].posto.y);
        assert.ok(d >= lato - 1e-9, `${a.nome}: due emote della scritta si sovrappongono`);
      }
    }
  }
});

test('cuore: i punti stanno sulla curva, e nemmeno al battito due emote si toccano', () => {
  for (const area of AREE) {
    for (const n of [7, 24, 60]) {
      const F = figura('cuore', area, n, seme(n));
      assert.equal(F.membri.length % 2, 0);
      const { scala: sc, centro: c, lato } = F.membri[0];
      for (const m of F.membri) {
        assert.ok(Math.abs((m.posto.x - c.x) / sc - M.cuoreX(m.u)) < 1e-9);
        assert.ok(Math.abs(-(m.posto.y - c.y) / sc - 2.5 - M.cuoreY(m.u)) < 1e-9);
        assert.ok(m.posto.x - lato >= 0 && m.posto.x + lato <= area.w && m.posto.y - lato >= 0 && m.posto.y + lato <= area.h, area.nome);
      }
      for (let i = 0; i < F.membri.length; i++) {
        for (let j = i + 1; j < F.membri.length; j++) {
          const a = F.membri[i].posto, b = F.membri[j].posto;
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= lato * 1.22 - 1e-9, `${area.nome} n=${n}: si toccano`);
        }
      }
    }
  }
});

test('le emote di un messaggio: Twitch, 7TV, emoji se accese, esclusi, doppioni e tetto', () => {
  const mappe = { twitch: { Kappa: 'k.png' }, canale: { catJAM: 'c.webp', Kappa: 'altro' } };
  const nomi = (l) => js(l).map((e) => e.nome);
  assert.deepEqual(js(M.emoteDi('ciao Kappa catJAM Kappa', mappe, {})), [{ nome: 'Kappa', url: 'k.png' }, { nome: 'catJAM', url: 'c.webp' }, { nome: 'Kappa', url: 'k.png' }]);
  assert.deepEqual(nomi(M.emoteDi('Kappa catJAM Kappa', mappe, { doppioni: false })), ['Kappa', 'catJAM']);
  assert.deepEqual(nomi(M.emoteDi('Kappa catJAM', mappe, { esclusi: ['catJAM'] })), ['Kappa']);
  assert.deepEqual(nomi(M.emoteDi('Kappa catJAM', mappe, { fonti: { twitch: false, settetv: true } })), ['Kappa', 'catJAM']);
  assert.equal(M.emoteDi('Kappa catJAM', mappe, { fonti: { twitch: false, settetv: true } })[0].url, 'altro');
  assert.deepEqual(nomi(M.emoteDi('Kappa '.repeat(30), mappe, { perMessaggio: 4 })), ['Kappa', 'Kappa', 'Kappa', 'Kappa']);
  assert.deepEqual(js(M.emoteDi('ciao 🔥🔥', mappe, {})), []);
  assert.deepEqual(nomi(M.emoteDi('ciao 🔥🔥 ok', mappe, { fonti: { emoji: true } })), ['🔥', '🔥']);
  assert.deepEqual(js(M.emoteDi('constructor __proto__ toString', mappe, {})), [], 'i nomi di sistema non sono emote');
});

test('combo: dalla soglia l\'emote resta una e cresce; chiusa la finestra esplode', () => {
  const c = M.combo({ soglia: 3, finestra: 6, diverse: true });
  const K = { nome: 'Kappa', url: 'k' };
  assert.equal(c.passo(K, 'a', 0).azione, 'lancia');
  assert.deepEqual(js(c.passo(K, 'a', 1000)), { azione: 'lancia', n: 1 }, 'la stessa persona non conta due volte');
  assert.equal(c.passo(K, 'b', 2000).azione, 'lancia');
  assert.deepEqual(js(c.passo(K, 'c', 3000)), { azione: 'apri', n: 3 });
  assert.deepEqual(js(c.passo(K, 'd', 4000)), { azione: 'cresci', n: 4 });
  assert.deepEqual(js(c.passo(K, 'd', 5000)), { azione: 'niente', n: 4 }, 'aperta, un doppione non lancia un\'altra emote uguale');
  assert.deepEqual(js(c.scadute(9900)), []);
  assert.deepEqual(js(c.scadute(10001)), [{ nome: 'Kappa', url: 'k', emoji: false, n: 4 }]);
  assert.deepEqual(js(c.aperte()), []);
  assert.equal(c.passo(K, 'a', 20000).azione, 'lancia', 'dopo lo scoppio si riparte da capo');
  assert.deepEqual(js(c.scadute(30000)), [], 'una serie sotto la soglia non esplode');
  const tutti = M.combo({ soglia: 2, finestra: 6, diverse: false });
  tutti.passo(K, 'a', 0);
  assert.equal(tutti.passo(K, 'a', 100).azione, 'apri', 'senza «persone diverse» conta anche la stessa');
  assert.equal(M.crescita(3, 3), 1);
  assert.ok(M.crescita(10, 3) > M.crescita(9, 3));
  assert.equal(M.crescita(999, 3), 3);
});

test('la coda: oltre il massimo aspettano poche, perde le piu\' vecchie, e scarta quelle scadute', () => {
  const q = M.coda({ maxSchermo: 2, coda: 2, scade: 8 });
  assert.ok(q.entra('a', 0).parti); assert.ok(q.entra('b', 0).parti);
  assert.deepEqual(js(q.entra('c', 100)), { parti: false, perse: [] });
  assert.deepEqual(js(q.entra('d', 200)), { parti: false, perse: [] });
  assert.deepEqual(js(q.entra('e', 300)), { parti: false, perse: ['c'] });
  assert.equal(q.esce(1000), 'd');
  assert.equal(q.vive, 2);
  assert.equal(q.esce(20000), null, 'e aspetta da troppo: non dice piu\' niente');
  assert.equal(q.vive, 1);
});
