// LE SUE PRIME VOLTE — una finestra, non una leva.
//
// Lia deve crescere da sola. Vederla crescere e' un'altra cosa dal farla crescere,
// e la differenza va tenuta nel codice, non nelle intenzioni: qui si controlla che
// guardarla non la muova, che non ci sia nessun bottone per spingerla, e che
// guardare non le costi un comando nel suo computer.
//
// E si controlla la cosa piu' facile da sbagliare: una prima volta e' unica. Non
// perche' qualcuno verifica prima di scrivere — perche' l'indice unico non lascia
// entrare la seconda. Un controllo si puo' dimenticare; un vincolo no.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const python = (righe) => JSON.parse(execFileSync('python3', ['-c', righe.join('\n')], {
  cwd: join(RAD, 'brain'), encoding: 'utf8',
}).trim().split('\n').pop());

test('la prima volta si segna una volta sola, anche pensandoci cento', () => {
  const d = python([
    'import json, tempfile, os, coscienza as C',
    'm = C.Coscienza(db_path=os.path.join(tempfile.mkdtemp(), "p.db"))',
    'for _ in range(20): m.conta_via("calcolo")',
    'm.conta_via("esecuzione")',
    'm.conta_via("via-inventata")',
    'print(json.dumps({"vie": m.vie(), "tappe": [(t["genere"], t["chiave"]) for t in m.tappe()]}))',
  ]);
  assert.equal(d.vie.calcolo, 20, 'il contatore conta tutte');
  assert.equal(d.tappe.filter(([, k]) => k === 'calcolo').length, 1, 'la tappa e\' una sola');
  assert.ok(d.tappe.some(([, k]) => k === 'esecuzione'), 'ogni via nuova lascia la sua tappa');
  assert.ok(!d.tappe.some(([, k]) => k === 'via-inventata'), 'una via che non esiste non inventa una tappa');
});

test('lo stesso strumento non diventa due tappe', () => {
  const d = python([
    'import json, tempfile, os, coscienza as C',
    'm = C.Coscienza(db_path=os.path.join(tempfile.mkdtemp(), "p.db"))',
    'm.segna_tappa("strumento", "contapar", "conta le parole")',
    'm.segna_tappa("strumento", "contapar", "riscritto")',
    'm.segna_tappa("strumento", "altro", "")',
    'print(json.dumps([(t["chiave"], t["nota"]) for t in m.tappe()]))',
  ]);
  assert.equal(d.length, 2, 'due strumenti, due tappe');
  const contapar = d.find(([k]) => k === 'contapar');
  assert.equal(contapar[1], 'conta le parole', 'vince la prima volta, non l\'ultima');
});

test('quello che succedeva gia\' prima entra senza una data inventata', () => {
  // Il conteggio dice quanto, non quando: di una via gia' a mille non sappiamo il
  // giorno della prima volta. `quando = 0` non e' una data, e' «da prima».
  const d = python([
    'import json, sqlite3, tempfile, os, coscienza as C',
    'db = os.path.join(tempfile.mkdtemp(), "vecchio.db")',
    'm = C.Coscienza(db_path=db)',
    'for _ in range(9): m.conta_via("modello")',
    'del m',
    'con = sqlite3.connect(db); con.execute("DELETE FROM tappe"); con.commit(); con.close()',
    'm2 = C.Coscienza(db_path=db)',
    'prima = [(t["quando"], t["chiave"], t["nota"]) for t in m2.tappe()]',
    'm3 = C.Coscienza(db_path=db)',
    'print(json.dumps({"prima": prima, "dopo": len(m3.tappe())}))',
  ]);
  assert.equal(d.prima.length, 1);
  assert.equal(d.prima[0][0], 0, 'nessuna data finta su una prima volta che non abbiamo visto');
  assert.match(d.prima[0][2], /prima/, 'e lo dice, invece di far finta');
  assert.equal(d.dopo, 1, 'riaprire il database non moltiplica le tappe');
});

test('il ponte porta le tappe, e non ne inventa quando il cervello tace', async () => {
  const vero = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ plasma: {}, attivita: {}, tappe: [{ quando: 12, genere: 'via', chiave: 'calcolo', nota: '' }] }),
  });
  const { plasma } = await import('../../src/ai/brainpy.js');
  try {
    const d = await plasma();
    assert.equal(d.tappe.length, 1);
    assert.equal(d.tappe[0].chiave, 'calcolo');
  } finally { globalThis.fetch = vero; }

  globalThis.fetch = async () => { throw new Error('muto'); };
  try {
    const d = await plasma();
    assert.deepEqual(d.tappe, [], 'silenzio vuol dire lista vuota, non undefined');
  } finally { globalThis.fetch = vero; }
});

test('il nome arriva intero dal suo database alla pagina', () => {
  const cervello = leggi('brain/server.py');
  const corpo = cervello.slice(cervello.indexOf('def _plasma(self):'), cervello.indexOf('def _moduli(self):'));
  assert.match(corpo, /"tappe": mente\.tappe\(\)/);

  const rotta = leggi('src/web/server.js');
  const mente3d = rotta.slice(rotta.indexOf("'/api/admin/mente3d'"), rotta.indexOf("'/api/streamer/forgia'"));
  assert.match(mente3d, /tappe: plx\.tappe/);

  const pagina = leggi('src/web/public/app.js');
  const dove = pagina.indexOf('function _menteCruscotto(d)');
  const cruscotto = pagina.slice(dove, pagina.indexOf('function _menteFirma(d)', dove));
  assert.match(cruscotto, /d\?\.tappe/, 'la pagina legge quel nome');
  assert.match(cruscotto, /Le sue prime volte/, 'e lo mostra');
});

test('guardarla non la muove: nessuna leva accanto alla finestra', () => {
  // Il punto della richiesta: vedere i progressi SENZA interferire. Un bottone
  // «fatti uno strumento» sarebbe comodo e sbagliato — la crescita smetterebbe di
  // essere sua. Qui si verifica che non ci sia, e che non ci finisca domani.
  const pagina = leggi('src/web/public/app.js');
  const dove = pagina.indexOf('function _menteCruscotto(d)');
  const cruscotto = pagina.slice(dove, pagina.indexOf('function _menteFirma(d)', dove));
  assert.ok(!/<button/.test(cruscotto), 'il cruscotto di come ragiona si legge e basta');

  // e da nessuna parte, nel sito, si puo' ordinarle di costruirsi uno strumento
  assert.ok(!/costruisci_strumento/.test(pagina), 'la pagina non sa nemmeno come chiederglielo');
  assert.ok(!/costruisci_strumento/.test(leggi('src/web/server.js')), 'e il server non le apre la strada');
});

test('guardare le tappe non le costa un comando nel suo computer', () => {
  // Se leggere la finestra facesse partire qualcosa nella sua sandbox, guardarla
  // sarebbe gia' interferire — e piu' spesso guardi, piu' la disturbi.
  const cervello = leggi('brain/coscienza.py');
  const corpo = cervello.slice(cervello.indexOf('    def tappe(self'), cervello.indexOf('    def vie(self)'));
  assert.match(corpo, /SELECT quando, genere, chiave, nota FROM tappe/, 'legge dal suo database e basta');
  assert.ok(!/ambiente|esegui|AMB\./.test(corpo), 'e non tocca il suo computer nemmeno di striscio');
});
