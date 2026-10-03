// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// AL POSTO DEI PEZZI: un'immagine, una GIF o un'emote al posto dei coriandoli,
// delle scintille, dei cuori... (docs/EFFETTI-SCHERMO.md, «Al posto dei pezzi»).
//
// Le regole, ognuna provata:
//   - il moto non cambia: cambia solo quello che si disegna. Fra lo stesso
//     pezzo con e senza immagine sono uguali tempi, velocita', oscillazioni;
//     cambia solo quello che dipende dalla grandezza di cio' che si disegna;
//   - l'ingombro e' quello disegnato: con le immagini, con la grandezza al
//     massimo e da ogni partenza, ogni pezzo nasce e finisce fuori dallo
//     schermo o trasparente, mai tagliato;
//   - un'immagine non si somma alla luce: si posa normale anche nei fuochi;
//   - uno scoppio di immagini ha meno pezzi, e ogni fuoco e' tutto immagini o
//     tutto scintille;
//   - la scelta e' deterministica, e il pannello e il server la leggono uguale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { DISEGNI, normDisegno, ORIGINI_DISEGNO, MAX_PEZZI_DISEGNO, GRANDEZZA_DISEGNO } from '../../src/web/stile.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const finestra = {};
vm.runInNewContext(readFileSync(join(RAD, 'src/web/public/disegnati.js'), 'utf8'), { window: finestra });
const S = finestra.SB_DISEGNATI;
const js = (x) => JSON.parse(JSON.stringify(x));
const EPS = 1e-6;
const fuori = (b, W, H) => b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H;
const finte = (n) => Array.from({ length: n }, (_, i) => ({ w: 100 + i * 20, h: 100, durata: 0, img: () => ({}) }));
const PRINCIPALI = { coriandoli: ['pezzo'], fuochi: ['scintilla'], cuori: ['cuore'], neve: ['fiocco'], palloncini: ['palloncino'], bolle: ['bolla'], stelle: ['stella', 'cadente'], lampo: ['vista'] };

test('il motore e il server leggono le stesse scelte, anche scritte male', () => {
  assert.deepEqual(js(S.ORIGINI), ORIGINI_DISEGNO);
  assert.equal(S.MAX_PEZZI, MAX_PEZZI_DISEGNO);
  assert.deepEqual(js(S.GRANDEZZA), GRANDEZZA_DISEGNO);
  const prove = [
    {},
    { nome: 'stelle', grandezza: 999, gira: false, misto: true, origine: 'alto' },
    { nome: 'coriandoli', grandezza: '7', origine: 'centro', pezzi: [{ fonte: 'mio', comando: 'logo' }, { fonte: 'mio', comando: 'logo' }, { fonte: 'mio', comando: 'Logo' }] },
    { nome: 'fuochi', pezzi: [{ fonte: '7tv', id: '01F6MZGCNG000255K4X1K0Q0B1', nome: '<img src=x>pepe' }, { fonte: 'twitch', id: 'emotesv2_abc123', nome: 'Kappa' }, { fonte: 'twitch', id: '../../etc' }, { fonte: '7tv', id: '01F6MZ/../../GCNG000255K4X1K' }, { fonte: '7tv', id: 'corto' }, { fonte: 'http', url: 'https://x' }, null, 'testo'] },
    { nome: 'neve', pezzi: Array.from({ length: 20 }, (_, i) => ({ fonte: 'mio', comando: 'e' + i })) },
    { nome: 'lampo', gira: 'no', misto: 'si', grandezza: null },
  ];
  for (const x of prove) {
    const server = normDisegno(x);
    delete server.suono;
    assert.deepEqual(js(S.parametri(x)), server, JSON.stringify(x));
  }
  const p = S.parametri(prove[3]);
  assert.deepEqual(js(p.pezzi), [{ fonte: '7tv', id: '01F6MZGCNG000255K4X1K0Q0B1', nome: 'imgsrcxpepe' }, { fonte: 'twitch', id: 'emotesv2_abc123', nome: 'Kappa' }], 'mai un indirizzo, mai un id che esce dalla sua forma, mai un nome con dei tag');
  assert.equal(S.parametri(prove[4]).pezzi.length, MAX_PEZZI_DISEGNO);
  assert.equal(S.parametri(prove[2]).pezzi.length, 1, 'niente doppi, e il comando ha la sua forma');
});

for (const nome of Object.keys(DISEGNI)) {
  test(`${nome}: con le immagini, grande o piccolo, da ogni partenza, ogni pezzo nasce e finisce senza strappi`, () => {
    const d = DISEGNI[nome];
    let controllati = 0;
    const origini = nome === 'coriandoli' ? ORIGINI_DISEGNO : ['angoli'];
    for (const [W, H] of [[1920, 1080], [1080, 1920]]) for (const durata of [d.min, d.max]) for (const quanti of ['pochi', 'tanti'])
      for (const grandezza of [GRANDEZZA_DISEGNO.min, 100, GRANDEZZA_DISEGNO.max]) for (const origine of origini) for (const [n, misto] of [[0, false], [1, false], [3, true]]) for (const seme of [3, 2026]) {
        const pn = S.piano({ nome, quanti, durata, grandezza, origine, misto }, seme, W, H, finte(n));
        const scoppi = new Set(pn.parti.filter((q) => q.k === 'bagliore').map((q) => `${q.t0.toFixed(6)}|${q.x.toFixed(3)}|${q.y.toFixed(3)}`));
        for (const q of pn.parti) {
          const dove = `${nome} ${W}x${H} ${durata}s ${quanti} ${grandezza}% ${origine} immagini ${n} seme ${seme} ${q.k}${q.im >= 0 ? ' (immagine)' : ''}`;
          assert.ok(q.t0 >= -EPS && q.vita > 0 && q.t0 + q.vita <= durata + EPS, `${dove}: vive da ${q.t0} per ${q.vita}`);
          assert.ok(q.im === undefined || (q.im >= -1 && q.im < Math.max(1, n)), `${dove}: immagine ${q.im} su ${n}`);
          const nasce = S.stato(pn, q, q.t0 + 1e-4), muore = S.stato(pn, q, q.t0 + q.vita - 1e-4);
          for (const s of [nasce, muore]) for (const v of [s.x, s.y, s.a, ...s.b]) assert.ok(Number.isFinite(v), `${dove}: ${JSON.stringify(s)}`);
          if (q.k === 'razzo' || q.k === 'lampo') continue;
          if (q.k === 'scintilla' || q.k === 'bagliore') {
            assert.ok(scoppi.has(`${q.t0.toFixed(6)}|${q.x.toFixed(3)}|${q.y.toFixed(3)}`), `${dove}: nasce da uno scoppio`);
            assert.ok(muore.a <= 0.05, `${dove}: si spegne (${muore.a})`);
            controllati++;
            continue;
          }
          assert.ok(nasce.a <= 0.05 || fuori(nasce.b, W, H), `${dove}: compare di colpo in ${JSON.stringify(nasce.b)} con ${nasce.a}`);
          assert.ok(muore.a <= 0.05 || fuori(muore.b, W, H), `${dove}: sparisce di colpo in ${JSON.stringify(muore.b)} con ${muore.a}`);
          controllati++;
        }
      }
    assert.ok(controllati > 50);
  });
}

test('con le immagini il moto e\' lo stesso: cambia solo quello che dipende dalla grandezza di cio\' che si disegna', () => {
  const DIPENDE = new Set(['im', 'fase', 'dritto', 'w', 'h', 'tondo', 'e', 's', 'r', 'rag', 'ex', 'y0', 'ys', 'ye', 'vita', 'sale', 'S', 'bh', 'filo', 'stella', 'alone']);
  for (const nome of ['coriandoli', 'cuori', 'neve', 'palloncini', 'bolle', 'stelle']) {
    for (const seme of [1, 77, 4242]) {
      const senza = S.piano({ nome, quanti: 'normale' }, seme, 1920, 1080).parti;
      const con = S.piano({ nome, quanti: 'normale' }, seme, 1920, 1080, finte(2)).parti;
      assert.equal(con.length, senza.length, `${nome}: stessi pezzi`);
      let cambiati = 0;
      con.forEach((q, i) => {
        const p = senza[i];
        assert.equal(q.k, p.k);
        if (q.im >= 0) cambiati++;
        for (const k of Object.keys(p)) {
          if (DIPENDE.has(k) || ['fronte', 'retro', 'col', 'luce', 'scuro', 'c'].includes(k)) continue;
          // la partenza e' calcolata perche' il viaggio stia nella durata: cambia
          // solo se cambia il viaggio, cioe' la vita
          if (k === 't0' && q.vita !== p.vita) continue;
          assert.equal(q[k], p[k], `${nome} seme ${seme} pezzo ${i}: ${k} cambia (${p[k]} -> ${q[k]})`);
        }
      });
      assert.ok(cambiati > 0, `${nome}: le immagini ci sono`);
    }
  }
  const senza = S.piano({ nome: 'fuochi' }, 9, 1920, 1080).parti, con = S.piano({ nome: 'fuochi' }, 9, 1920, 1080, finte(2)).parti;
  for (const k of ['razzo', 'bagliore']) assert.deepEqual(js(con.filter((q) => q.k === k)), js(senza.filter((q) => q.k === k)), `fuochi: ${k} uguali`);
});

test('uno scoppio di immagini ha meno pezzi, e ogni fuoco e\' tutto immagini o tutto scintille', () => {
  for (const seme of [1, 5, 99]) {
    const conta = (x) => { const m = new Map(); for (const q of x.parti) if (q.k === 'scintilla') { const k = q.t0 + '|' + q.x; m.set(k, (m.get(k) || []).concat(q.im)); } return [...m.values()]; };
    const tutti = conta(S.piano({ nome: 'fuochi', quanti: 'tanti' }, seme, 1920, 1080, finte(2)));
    for (const sc of tutti) { assert.ok(sc.every((im) => im >= 0)); assert.ok(sc.length <= 26); }
    const senza = conta(S.piano({ nome: 'fuochi', quanti: 'tanti' }, seme, 1920, 1080));
    for (const sc of senza) { assert.ok(sc.every((im) => im === -1)); assert.ok(sc.length >= 70); }
    const misti = conta(S.piano({ nome: 'fuochi', quanti: 'tanti', misto: true }, seme, 1920, 1080, finte(2)));
    for (const sc of misti) assert.ok(sc.every((im) => im >= 0) || sc.every((im) => im === -1), 'un fuoco solo di un tipo');
  }
});

test('mescola: circa meta\' immagini; senza, tutti i pezzi principali sono immagini', () => {
  for (const nome of ['coriandoli', 'neve', 'cuori', 'stelle']) {
    const tutti = S.piano({ nome, quanti: 'tanti' }, 31, 1920, 1080, finte(3)).parti.filter((q) => PRINCIPALI[nome].includes(q.k));
    assert.ok(tutti.every((q) => q.im >= 0 && q.im < 3), nome);
    assert.ok(new Set(tutti.map((q) => q.im)).size === 3, `${nome}: tutte e tre le immagini`);
    const misti = S.piano({ nome, quanti: 'tanti', misto: true }, 31, 1920, 1080, finte(3)).parti.filter((q) => PRINCIPALI[nome].includes(q.k));
    const quota = misti.filter((q) => q.im >= 0).length / misti.length;
    assert.ok(quota > 0.25 && quota < 0.75, `${nome}: meta' e meta' (${quota})`);
  }
});

test('un\'immagine si posa normale, la luce dei fuochi e delle stelle resta luce', () => {
  for (const nome of ['fuochi', 'stelle']) {
    const pn = S.piano({ nome, quanti: 'normale', misto: true }, 12, 1920, 1080, finte(2));
    const modi = [];
    let modo = '', primo = '';
    const DIPINGE = new Set(['drawImage', 'fill', 'stroke', 'fillRect']);
    const ctx = new Proxy({}, {
      set(o, k, v) { if (k === 'globalCompositeOperation') modo = v; o[k] = v; return true; },
      get(o, k) {
        if (k in o) return o[k];
        if (DIPINGE.has(k)) return () => { if (!primo) primo = modo; };
        return () => ({ addColorStop() {} });
      },
    });
    for (const q of pn.parti) {
      if (!PRINCIPALI[nome].includes(q.k)) continue;
      const s = S.stato(pn, q, q.t0 + q.vita / 2);
      if (!s || s.a <= 0.003) continue;
      primo = '';
      S.disegna(ctx, { ...pn, parti: [q] }, q.t0 + q.vita / 2, 1);
      modi.push([q.im >= 0, primo]);
    }
    assert.ok(modi.some(([im]) => im) && modi.some(([im]) => !im), nome);
    for (const [im, m] of modi) assert.equal(m, im ? 'source-over' : 'lighter', `${nome}: ${im ? 'immagine' : 'luce'}`);
  }
});

test('la grandezza conta per le forme e per le immagini', () => {
  const misura = { coriandoli: (q) => q.w, cuori: (q) => q.s, neve: (q) => q.rag, palloncini: (q) => q.w, bolle: (q) => q.rag, stelle: (q) => q.s, fuochi: (q) => q.r };
  for (const [nome, m] of Object.entries(misura)) for (const n of [0, 1]) {
    const media = (g) => { const x = S.piano({ nome, grandezza: g }, 3, 1920, 1080, finte(n)).parti.filter((q) => q.k === PRINCIPALI[nome][0]); return x.reduce((a, q) => a + m(q), 0) / x.length; };
    assert.ok(media(50) < media(100) && media(100) < media(200), `${nome} ${n ? 'immagini' : 'forme'}`);
  }
});

test('il lampo con un\'immagine: uno solo, e l\'immagine segue il lampo', () => {
  const pn = S.piano({ nome: 'lampo', durata: 2 }, 4, 1920, 1080, finte(2));
  assert.equal(pn.parti.filter((q) => q.k === 'lampo').length, 1);
  const v = pn.parti.find((q) => q.k === 'vista');
  assert.ok(v && v.im >= 0 && v.im < 2);
  assert.ok(S.stato(pn, v, 0).a <= 0.001, 'nasce trasparente');
  assert.ok(Math.abs(S.stato(pn, v, 0.06).a - 1) < 1e-9, 'al picco del lampo e\' piena');
  assert.ok(S.stato(pn, v, 2 - 1e-4).a < 0.01, 'finisce col lampo');
});

test('lo stesso seme con le stesse immagini da\' lo stesso disegno', () => {
  for (const nome of Object.keys(DISEGNI)) {
    const a = js(S.piano({ nome, misto: true }, 777, 1920, 1080, finte(4)));
    assert.deepEqual(js(S.piano({ nome, misto: true }, 777, 1920, 1080, finte(4))), a, nome);
  }
});
