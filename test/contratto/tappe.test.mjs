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

test('se la parte nuova si rompe, la via resta contata lo stesso', () => {
  // Le tappe sono arrivate dopo i contatori. Una cosa nuova non deve poter rompere
  // una vecchia: il conteggio e' scritto e chiuso PRIMA che si parli di tappe, e
  // qui si rompe la parte nuova apposta per vederlo.
  const d = python([
    'import json, tempfile, os, coscienza as C',
    'm = C.Coscienza(db_path=os.path.join(tempfile.mkdtemp(), "p.db"))',
    'm.segna_tappa = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("rotta"))',
    'alzata = False',
    'try:',
    '    m.conta_via("memoria")',
    'except Exception:',
    '    alzata = True',
    'print(json.dumps({"vie": m.vie(), "alzata": alzata}))',
  ]);
  assert.equal(d.vie.memoria, 1, 'la via e\' contata comunque');
  assert.equal(d.alzata, false, 'e l\'errore non esce a disturbare chi stava rispondendo');
});

test('il conteggio non dipende da nessuna funzione SQL in piu\'', () => {
  // Il rischio vero non e' un errore rumoroso: e' che un giorno la base cambi e
  // l'istruzione che conta fallisca INTERA, in silenzio, fermando tutte le barre.
  // L'istruzione che conta e' quella di sempre.
  const cervello = leggi('brain/coscienza.py');
  const corpo = cervello.slice(cervello.indexOf('    def conta_via(self, via):'), cervello.indexOf('    def segna_tappa('));
  const conteggio = corpo.slice(corpo.indexOf('INSERT INTO vie'), corpo.indexOf('self.db.commit()'));
  assert.ok(!/RETURNING/i.test(conteggio), 'niente RETURNING nella riga che conta');
  assert.match(corpo, /SELECT n FROM vie WHERE via=\?/, 'la prima volta si chiede a parte');
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

test('dal sito non parte nessun ordine che la faccia crescere', () => {
  // LA PRIMA VERSIONE DI QUESTA PROVA ERA VERDE E SBAGLIATA. Cercava il nome del
  // cervello (`costruisci_strumento`) dentro la pagina, mentre il bottone chiamava
  // la rotta del sito (`/api/admin/strumenti/costruisci`): due nomi per la stessa
  // leva, e la prova guardava quello che non c'era. Un verde falso e' peggio di un
  // rosso — garantiva un'assenza che non c'era.
  //
  // Ora si guarda il COLLO DI BOTTIGLIA. Ogni strada dal sito verso di lei passa da
  // brainpy.js: se li' non c'e' il ponte, nessuna rotta puo' esistere altrove,
  // comunque la si chiami. Non e' una ricerca di nomi, e' l'unico passaggio.
  const ponte = leggi('src/ai/brainpy.js');
  const CRESCITA = ['/vita', '/sogna', '/costruisci_strumento'];
  for (const via of CRESCITA) {
    for (const m of ponte.matchAll(new RegExp(`fetch\\(BASE \\+ '${via}'([^)]*)\\)`, 'g'))) {
      assert.ok(!/POST/.test(m[1]), `nessuno puo' ordinarle ${via} dal sito`);
    }
  }
  // e le due strade che restano verso quegli indirizzi sono letture, non ordini
  assert.match(ponte, /fetch\(BASE \+ '\/vita', \{ signal/, 'di /vita resta solo la lettura');
  assert.match(ponte, /fetch\(BASE \+ '\/sogno', \{ signal/, 'e dei sogni resta solo il racconto');

  const pagina = leggi('src/web/public/app.js');
  const dove = pagina.indexOf('function _menteCruscotto(d)');
  const cruscotto = pagina.slice(dove, pagina.indexOf('function _menteFirma(d)', dove));
  assert.ok(!/<button/.test(cruscotto), 'e il cruscotto di come ragiona si legge e basta');
});

test('guardare le tappe non le costa un comando nel suo computer', () => {
  // Se leggere la finestra facesse partire qualcosa nella sua sandbox, guardarla
  // sarebbe gia' interferire — e piu' spesso guardi, piu' la disturbi.
  const cervello = leggi('brain/coscienza.py');
  const corpo = cervello.slice(cervello.indexOf('    def tappe(self'), cervello.indexOf('    def vie(self)'));
  assert.match(corpo, /SELECT quando, genere, chiave, nota FROM tappe/, 'legge dal suo database e basta');
  assert.ok(!/ambiente|esegui|AMB\./.test(corpo), 'e non tocca il suo computer nemmeno di striscio');
});
