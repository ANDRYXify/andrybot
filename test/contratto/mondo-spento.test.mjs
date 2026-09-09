// QUANDO IL SUO MONDO E' SPENTO, VA DETTO.
//
// Nel cruscotto «Come ragiona» le vie «strumento» ed «esecuzione» restavano a
// zero per sempre e sembrava che non ci provasse. Non ci provava perche' la
// porta non c'era: senza AMBIENTE_KEY il suo computer e' chiuso, e questo non
// lo diceva nessuno — ne' un log all'avvio, ne' una riga sotto le barre.
//
// Il difetto che questa prova impedisce non e' «manca la nota»: e' la nota che
// SEMBRA esserci. La riga nel cruscotto legge un campo che nessuno spediva, e
// una condizione sempre falsa non si vede mai fallire. Percio' qui si segue il
// NOME lungo tutta la catena — cervello → ponte → rotta → pagina — e basta un
// anello che lo lascia cadere perche' la prova diventi rossa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

test('senza chiave, lei stessa sa dire perche\' il mondo e\' spento', () => {
  const fuori = execFileSync('python3', ['-c', [
    'import json, ambiente as A',
    'print(json.dumps({"perche": A.perche_spento(), "stato": A.stato_ecosistema()}))',
  ].join('\n')], {
    cwd: join(RAD, 'brain'),
    env: { ...process.env, AMBIENTE_KEY: '' },
    encoding: 'utf8',
  });
  const d = JSON.parse(fuori.trim().split('\n').pop());
  assert.ok(d.perche.length > 10, 'il motivo e\' una frase, non un flag');
  assert.match(d.perche, /AMBIENTE_KEY/, 'e dice quale chiave manca, cosi\' si sa cosa fare');
  assert.equal(d.stato.attivo, false);
  assert.equal(d.stato.perche, d.perche, 'una sola fonte del motivo, non due che si smentiscono');
});

test('chiave messa ma computer muto: il consiglio cambia, non ripete «metti la chiave»', () => {
  // Con la chiave gia' nel .env, dire «imposta AMBIENTE_KEY» manderebbe a cercare
  // un guasto dove non c'e'. Il ramo si sceglie da un campo, non leggendo la frase.
  const fuori = execFileSync('python3', ['-c', [
    'import json, ambiente as A',
    'print(json.dumps(A.stato_ecosistema()))',
  ].join('\n')], {
    cwd: join(RAD, 'brain'),
    env: { ...process.env, AMBIENTE_KEY: 'prova-non-vera', AMBIENTE_URL: 'http://127.0.0.1:9' },
    encoding: 'utf8',
  });
  const st = JSON.parse(fuori.trim().split('\n').pop());
  assert.equal(st.attivo, false);
  assert.equal(st.chiave, true, 'la chiave c\'era: il cruscotto deve saperlo');
  assert.doesNotMatch(st.perche, /AMBIENTE_KEY/, 'il motivo e\' un altro, e lo dice');

  const pagina = leggi('src/web/public/app.js');
  const dove = pagina.indexOf("const e = (d && d.ecosistema)");
  assert.notEqual(dove, -1, 'la scheda dell\'ecosistema esiste ancora');
  const scheda = pagina.slice(dove, pagina.indexOf('const riga = (k, v) =>', dove));
  assert.match(scheda, /e\.chiave !== true/, 'la scheda sceglie il consiglio da quel campo');
  assert.match(scheda, /esc\(e\.perche\)/, 'e mostra il motivo vero, non solo il consiglio');
});

test('il ponte non lascia cadere il motivo per strada', async () => {
  const vero = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ plasma: { a: 1 }, attivita: {}, ambiente: { spento: true, perche: 'porta chiusa' } }),
  });
  try {
    const { plasma } = await import('../../src/ai/brainpy.js');
    const d = await plasma();
    assert.equal(d.ambiente?.spento, true);
    assert.equal(d.ambiente?.perche, 'porta chiusa');
  } finally { globalThis.fetch = vero; }
});

test('il ponte non inventa un mondo spento quando il cervello tace', async () => {
  const vero = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('spento'); };
  try {
    const { plasma } = await import('../../src/ai/brainpy.js');
    const d = await plasma();
    assert.equal(d.ambiente, null, 'non lo so ≠ e\' spento: la nota non deve uscire per un timeout');
  } finally { globalThis.fetch = vero; }
});

test('il nome arriva intero dal cervello alla pagina', () => {
  const cervello = leggi('brain/server.py');
  const corpo = cervello.slice(cervello.indexOf('def _plasma(self):'), cervello.indexOf('def _moduli(self):'));
  assert.match(corpo, /"ambiente": \{"spento":/, 'il cervello lo spedisce insieme al plasma');

  const rotta = leggi('src/web/server.js');
  const mente3d = rotta.slice(rotta.indexOf("'/api/admin/mente3d'"), rotta.indexOf("'/api/streamer/forgia'"));
  assert.match(mente3d, /ambiente: plx\.ambiente/, 'la rotta lo mette nel piatto del cruscotto');

  const pagina = leggi('src/web/public/app.js');
  const cruscotto = pagina.slice(pagina.indexOf('function _menteCruscotto(d)'), pagina.indexOf('function _menteCruscotto(d)') + 4000);
  assert.match(cruscotto, /d\.ambiente\.spento/, 'e la pagina legge esattamente quel nome, non uno simile');
});
