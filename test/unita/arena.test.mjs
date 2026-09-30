// L'ARENA DELLE EMOTE (src/web/public/arena.js, docs/ARENA.md): la partita e'
// una funzione del seme, dei combattenti, delle regole. Il server la fa girare
// per sapere chi vince, ogni overlay per disegnarla: se due giri dello stesso
// seme non danno la stessa partita, due overlay mostrano due partite diverse e
// il bot annuncia un vincitore che nessuno ha visto vincere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

await import('../../src/web/public/arena.js');
const A = globalThis.SB_ARENA;

const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `u${i}`, nome: `Utente ${i}` }));
const impronta = (s) => s.corpi.map((c) => `${c.id}:${c.x.toFixed(6)},${c.y.toFixed(6)},${c.vita.toFixed(6)},${c.uccisioni},${c.oggetti.join('+')}`).join('|');

test('lo stesso seme fa la stessa partita, passo per passo', () => {
  const a = A.nuova('partita-1', gente(12), {}), b = A.nuova('partita-1', gente(12), {});
  const ea = [], eb = [];
  while (!a.fine) {
    ea.push(...A.passo(a).map((e) => JSON.stringify(e)));
    eb.push(...A.passo(b).map((e) => JSON.stringify(e)));
    if (a.passo % 30 === 0) assert.equal(impronta(a), impronta(b), `passo ${a.passo}`);
  }
  assert.deepEqual(ea, eb);
  assert.deepEqual(A.esito(a), A.esito(b));
});

test('un altro seme fa un\'altra partita', () => {
  const a = A.corri(A.nuova('seme-a', gente(8), {}), 90), b = A.corri(A.nuova('seme-b', gente(8), {}), 90);
  assert.notEqual(impronta(a), impronta(b));
});

// Un overlay che si apre a meta' parte da quello che sa e corre fino ad adesso:
// deve arrivare esattamente dove sono gli altri.
test('ripresa da una copia a meta\', la partita continua identica', () => {
  const intera = A.nuova('ripresa', gente(10), {});
  A.corri(intera, 700);
  const meta = A.corri(A.nuova('ripresa', gente(10), {}), 311);
  const ripresa = A.corri(A.copia(meta), 700);
  assert.equal(impronta(ripresa), impronta(intera));
  assert.deepEqual(A.esito(A.corri(ripresa, 1e9)), A.esito(A.corri(intera, 1e9)));
});

test('ogni partita finisce, entro la durata massima', () => {
  for (const n of [2, 3, 5, 9, 17, 30]) {
    for (let k = 0; k < 6; k++) {
      const s = A.corri(A.nuova(`fine-${n}-${k}`, gente(n), {}), 1e9);
      assert.ok(s.fine, `${n} combattenti, seme ${k}`);
      assert.ok(s.passo <= A.BASE.durataMax * A.PASSO, `${n}/${k}: ${s.passo} passi`);
      const e = A.esito(s);
      assert.equal(e.classifica.length, n);
      assert.deepEqual(e.classifica.map((x) => x.posto), Array.from({ length: n }, (_, i) => i + 1));
      assert.equal(e.vincitore, e.classifica[0].id);
      if (!e.aTempo) assert.equal(e.classifica.filter((x) => x.vivo).length <= 1, true);
      assert.equal(e.classifica.reduce((t, x) => t + x.uccisioni, 0) >= n - 1 - e.classifica.filter((x) => x.vivo).length, true, 'ogni uscita ha chi l\'ha causata');
    }
  }
});

test('l\'arena si stringe fino alla misura minima, e i combattenti restano dentro', () => {
  const R = { strettaDopo: 10, strettaDurata: 10, strettaMin: 0.4, vita: 1000, danno: 1 };
  const s = A.nuova('stretta', gente(6), R);
  assert.deepEqual(A.muri(s), { x0: 0, y0: 0, x1: A.W, y1: A.H }, 'prima della stretta, tutta l\'arena');
  const m = A.muri({ ...s, passo: 25 * A.PASSO });
  assert.ok(Math.abs((m.x1 - m.x0) - A.W * 0.4) < 1e-9 && Math.abs((m.y1 - m.y0) - A.H * 0.4) < 1e-9, 'dopo, la misura minima');
  const lunga = A.nuova('stretta-lunga', gente(6), R);
  while (!lunga.fine && lunga.passo < 30 * A.PASSO) {
    A.passo(lunga);
    const w = A.muri(lunga);
    for (const c of lunga.corpi.filter((x) => x.vivo)) assert.ok(c.x >= w.x0 && c.x <= w.x1 && c.y >= w.y0 && c.y <= w.y1, `passo ${lunga.passo}: ${c.id} fuori`);
  }
  assert.ok(lunga.passo >= 30 * A.PASSO, 'la partita lunga arriva oltre la stretta');
});

// Due difetti trovati guardando la partita disegnata: un oggetto caduto quando
// l'arena era larga restava fuori dai muri che si stringevano, e i combattenti
// lo inseguivano spingendo contro il muro; e con combattenti grandi e misura
// minima piccola l'arena finiva piu' stretta di un combattente, che usciva dai
// muri. Qui ogni passo guarda i cerchi interi e gli oggetti interi.
test('l\'arena che si stringe non lascia oggetti fuori dai muri', () => {
  const s = A.nuova('oggetti-fuori', gente(6), { ogniOggetto: 1, strettaDopo: 5, strettaDurata: 20, strettaMin: 0.3, vita: 1000, danno: 1 });
  let persi = 0;
  while (!s.fine && s.passo < 40 * A.PASSO) {
    persi += A.passo(s).filter((e) => e.tipo === 'perso').length;
    const m = A.muri(s);
    for (const o of s.oggetti) {
      assert.ok(o.x - A.R_OGGETTO >= m.x0 && o.x + A.R_OGGETTO <= m.x1 && o.y - A.R_OGGETTO >= m.y0 && o.y + A.R_OGGETTO <= m.y1, `passo ${s.passo}: ${o.tipo} fuori dai muri`);
    }
  }
  assert.ok(persi > 0, 'la stretta ha davvero lasciato fuori qualcosa da togliere');
});

// Un urto spinge i due cerchi l'uno via dall'altro, e prima poteva spingerne
// uno oltre il muro: i cerchi interi restano dentro dopo ogni passo, urti
// compresi. E l'arena piu' stretta tiene ancora due combattenti affiancati.
test('un combattente ci sta sempre tutto, urti compresi, anche grande nell\'arena piu\' stretta', () => {
  for (const [raggio, strettaMin] of [[30, 0.3], [60, 0.15], [45, 0.15], [14, 0.15]]) {
    const R = { raggio, strettaMin, strettaDopo: 5, strettaDurata: 5, vita: 1000, danno: 1, durataMax: 60 };
    const r = A.regole(R);
    assert.ok(r.strettaMin * A.W >= 4 * raggio && r.strettaMin * A.H >= 2 * raggio, `raggio ${raggio}: nell'arena piu' stretta ci stanno due combattenti affiancati`);
    for (const n of [3, 12]) {
      const s = A.nuova(`grandi-${raggio}-${n}`, gente(n), R);
      while (!s.fine) {
        A.passo(s);
        const m = A.muri(s);
        for (const c of s.corpi.filter((x) => x.vivo)) {
          assert.ok(c.x - raggio >= m.x0 - 1e-9 && c.x + raggio <= m.x1 + 1e-9 && c.y - raggio >= m.y0 - 1e-9 && c.y + raggio <= m.y1 + 1e-9,
            `raggio ${raggio}, ${n} combattenti, passo ${s.passo}: ${c.id} esce dai muri`);
        }
      }
    }
  }
});

test('gli oggetti fanno quello che dicono', () => {
  const due = (oggA) => {
    const s = A.nuova('duello', gente(2), { ogniOggetto: 60 });
    s.corpi[0].oggetti = oggA;
    const [a, b] = s.corpi;
    a.x = 400; a.y = 300; b.x = 400 + A.BASE.raggio * 1.5; b.y = 300;
    A.passo(s);
    return { a: A.BASE.vita - a.vita, b: A.BASE.vita - b.vita };
  };
  const nudo = due([]);
  assert.ok(nudo.a > 0 && nudo.b > 0, 'si toccano e si colpiscono');
  assert.equal(due(['spada']).b, nudo.b * A.BASE.oggetti.spada, 'la spada moltiplica il danno fatto');
  assert.equal(due(['scudo']).a, nudo.a * A.BASE.oggetti.scudo, 'lo scudo riduce il danno subito');
  const s = A.nuova('cuore', gente(1).concat({ id: 'x' }), { ogniOggetto: 60 });
  const c = s.corpi[0];
  c.vita = 10; s.oggetti.push({ id: 99, tipo: 'cuore', x: c.x, y: c.y });
  A.passo(s);
  assert.ok(c.vita > 10, 'il cuore cura');
});

test('gli oggetti spenti non cadono', () => {
  const s = A.corri(A.nuova('spenti', gente(4), { ogniOggetto: 1, spenti: ['spada', 'scudo', 'stivali'] }), 20 * A.PASSO);
  const presi = s.corpi.flatMap((c) => c.oggetti);
  assert.deepEqual(presi, []);
  assert.ok(s.oggetti.every((o) => o.tipo === 'cuore'));
});

test('le regole si leggono sempre dentro misure che hanno senso', () => {
  const r = A.regole({ vita: -5, velocita: 1e9, durataMax: 10, strettaDopo: 999, spenti: ['spada', 'boh'] });
  assert.equal(r.vita, 10);
  assert.equal(r.velocita, 400);
  assert.equal(r.durataMax, 30);
  assert.ok(r.strettaDopo <= r.durataMax, 'la stretta parte prima della fine');
  assert.deepEqual(r.spenti, ['spada']);
});

test('il motore non usa il caso del browser, ne\' il tempo, ne\' la trigonometria', () => {
  const src = readFileSync(fileURLToPath(new URL('../../src/web/public/arena.js', import.meta.url)), 'utf8');
  for (const vietato of ['Math.random', 'Date.now', 'performance.now', 'Math.sin', 'Math.cos', 'Math.atan', 'Math.pow', 'Math.hypot', '**']) {
    assert.ok(!src.includes(vietato), `${vietato} renderebbe la partita diversa da una macchina all'altra`);
  }
});

// La prova vera: la stessa partita calcolata da Node e da Chromium (il motore
// delle sorgenti browser di OBS) finisce nello stesso punto, bit per bit.
test('Node e il browser vedono la stessa partita', async (t) => {
  let chromium;
  try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); } catch { t.skip('Playwright non c\'e\''); return; }
  const src = readFileSync(fileURLToPath(new URL('../../src/web/public/arena.js', import.meta.url)), 'utf8');
  let b;
  try { b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); }
  catch { t.skip('Chromium non c\'e\''); return; }
  try {
    const p = await b.newPage();
    await p.addScriptTag({ content: src });
    for (const [semeP, n] of [['browser-1', 7], ['browser-2', 23]]) {
      const nelBrowser = await p.evaluate(([sm, k]) => {
        const A = window.SB_ARENA;
        const s = A.corri(A.nuova(sm, Array.from({ length: k }, (_, i) => ({ id: `u${i}` })), {}), 1e9);
        return { esito: A.esito(s), corpi: s.corpi.map((c) => [c.x, c.y, c.vita]) };
      }, [semeP, n]);
      const s = A.corri(A.nuova(semeP, gente(n), {}), 1e9);
      assert.deepEqual(nelBrowser.esito, A.esito(s));
      assert.deepEqual(nelBrowser.corpi, s.corpi.map((c) => [c.x, c.y, c.vita]));
    }
  } finally { await b.close(); }
});
