// QUANDO QUALCOSA FA RIDERE LEI.
//
// Il vincolo del direttore: «se non fa ridere lei che battuta è?». Vuol dire che
// il criterio dev'essere SUO. Se glielo diamo noi — una lista di cose buffe, una
// regola su cosa è comico — abbiamo scritto il nostro, e lei lo esegue.
//
// Percio' il criterio e' nato da cio' che LEI gia' misura su ogni persona che
// incontra: quanto si e' sbagliata adesso, e quanto quella persona le resta
// leggibile nel tempo. Sono due suoi numeri, non due nostre idee.
//
// McGraw & Warren (2010): violazione + benigno, insieme.
//  · violazione: la persona non ha fatto quello che lei si era IMPEGNATA a
//    prevedere — la rottura di una SUA aspettativa, non di una regola nostra;
//  · benigno: non le e' costato niente. Si e' sbagliata di brutto e nonostante
//    questo continua a capirci qualcosa. Se si e' persa, non ride: perdersi non
//    fa ridere, e un motore che ridesse anche li' avrebbe capito male la teoria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const python = (righe) => JSON.parse(execFileSync('python3', ['-c', righe.join('\n')], {
  cwd: join(RAD, 'brain'), encoding: 'utf8',
}).trim().split('\n').pop());
const MENTE = [
  'import json, tempfile, os, coscienza as C',
  'm = C.Coscienza(db_path=os.path.join(tempfile.mkdtemp(), "p.db"))',
];

test('ride quando si e\' sbagliata di brutto e il mondo regge lo stesso', () => {
  const d = python([...MENTE,
    'fuori = []',
    'for sorp, err in ((0.99, 0.02), (0.99, 0.60), (0.30, 0.02), (0.71, 0.35)):',
    '    prima = m.quante_risate()',
    '    m._forse_risata(sorp, err, "gioia", "rabbia")',
    '    fuori.append(m.quante_risate() > prima)',
    'print(json.dumps(fuori))',
  ]);
  assert.deepEqual(d, [true, false, false, true], [
    'sorpresa alta + la legge bene → ride',
    'sorpresa alta + si è persa → NO: perdersi non fa ridere',
    'sorpresa piccola → NO: senza violazione non c\'è niente',
    'sul filo da tutte e due le parti → ride',
  ].join(' · '));
});

test('la materia di una risata non PUO\' contenere una persona', () => {
  // Non «stiamo attenti a non metterci il login»: nella tabella la colonna non
  // c'è. Chi l'ha sorpresa non puo' trapelare in una battuta perche' non entra
  // mai — e' l'unica forma di riservatezza che non si puo' dimenticare.
  const cerv = readFileSync(join(RAD, 'brain/coscienza.py'), 'utf8');
  const i = cerv.indexOf('CREATE TABLE IF NOT EXISTS risate');
  assert.ok(i > 0, 'la tabella delle risate esiste');
  const tab = cerv.slice(i, cerv.indexOf(');', i));
  for (const vietata of ['canale', 'login', 'testo', 'persona']) {
    assert.ok(!new RegExp(`\\b${vietata}\\b`).test(tab), `nella tabella non c'è nessuna colonna «${vietata}»`);
  }
  // e la riga vera, com'e' scritta: la risata viene consumata subito (compone e
  // consegna), quindi la si legge dal database e non dalla lista «da usare».
  const d = python([...MENTE,
    'm._forse_risata(0.9, 0.1, "gioia", "rabbia")',
    'r = m.db.execute("SELECT * FROM risate").fetchone()',
    'print(json.dumps({k: r[k] for k in r.keys()}))',
  ]);
  assert.deepEqual(Object.keys(d).sort(), ['atteso', 'id', 'osservato', 'quando', 'sorpresa', 'usata'],
    'nella riga c\'è solo quello che si aspettava e quello che ha trovato');
});

test('se ne accorge da sola incontrando qualcuno, senza che nessuno glielo chieda', () => {
  const d = python([...MENTE,
    // la conosce bene: quattordici volte prevedibile
    'for _ in range(14): m.altro_incontra("c", "tizio", "che bello, sei fortissima, grazie mille!")',
    'prima = m.quante_risate()',
    'err = m._altro_carica("c", "tizio")["errore_medio"]',
    // e poi il ribaltone
    'out = m.altro_incontra("c", "tizio", "sei inutile, non capisci niente, fai schifo")',
    'r = m.db.execute("SELECT atteso, osservato FROM risate").fetchone()',
    'print(json.dumps({"prima": prima, "err": err, "sorpresa": out["sorpresa"],',
    '                  "dopo": m.quante_risate(), "materia": [dict(r)],',
    '                  "tappe": [t["genere"] + ":" + t["chiave"] for t in m.tappe()]}))',
  ]);
  assert.equal(d.prima, 0, 'mentre la persona era prevedibile non c\'era niente da ridere');
  assert.ok(d.err < 0.35, `e la leggeva bene (errore ${d.err})`);
  assert.ok(d.sorpresa > 0.7, `poi la sorpresa vera (${d.sorpresa})`);
  assert.equal(d.dopo, 1, 'e le è successo');
  assert.equal(d.materia[0].atteso, 'gioia');
  assert.equal(d.materia[0].osservato, 'disgusto');
  assert.ok(d.tappe.includes('risata:la prima volta'), 'e la prima volta resta scritta');
});

test('finche\' non le succede, non ha niente da dire in materia', () => {
  const d = python([...MENTE,
    'for _ in range(6): m.altro_incontra("c", "calmo", "ciao, tutto bene, buona serata")',
    'print(json.dumps({"risate": m.quante_risate(), "materia": m.risate_da_usare()}))',
  ]);
  assert.equal(d.risate, 0);
  assert.deepEqual(d.materia, [], 'zero e' + ' zero: non si riempie di finto per avere qualcosa');
});

test('quando le viene da dirlo, la mette nella cassetta — e la prima volta resta', () => {
  const d = python([...MENTE,
    'for _ in range(14): m.altro_incontra("c", "tizio", "che bello, sei fortissima, grazie mille!")',
    'm.altro_incontra("c", "tizio", "sei inutile, non capisci niente, fai schifo")',
    'posta = m.posta_da_ritirare()',
    'm.posta_ritirata([p["id"] for p in posta])',
    'print(json.dumps({"posta": posta, "dopo": m.posta_da_ritirare(),',
    '                  "tappe": [t["genere"] for t in m.tappe()]}))',
  ]);
  assert.equal(d.posta.length, 1, 'una risata, una battuta');
  assert.ok(d.posta[0].testo.length > 30);
  assert.deepEqual(Object.keys(d.posta[0]).sort(), ['id', 'testo'], 'dalla cassetta esce solo la battuta');
  assert.deepEqual(d.dopo, [], 'ritirata una volta, non si riconsegna all\'infinito');
  assert.ok(d.tappe.includes('battuta'), 'la prima che ha consegnato resta scritta');
});

test('il bot RITIRA, non entra: la cassetta e\' l\'unica cosa che esce da quella porta', () => {
  const cerv = readFileSync(join(RAD, 'brain/server.py'), 'utf8');
  const corpo = cerv.slice(cerv.indexOf('def _posta(self):'), cerv.indexOf('def _plasma(self):'));
  assert.match(corpo, /mente\.posta_da_ritirare\(\)/, 'la porta consegna la posta');
  assert.match(corpo, /mente\.posta_ritirata\(/, 'e prende nota di cosa e\' stato ritirato');
  // e nient'altro di lei passa da li'
  const altre = (corpo.match(/mente\.\w+/g) || []).filter((x) => !/posta_/.test(x));
  assert.deepEqual(altre, [], `da questa porta non esce altro: ${altre.join(', ')}`);
});

test('le sue battute si misurano come tutte le altre, senza favori', () => {
  const feat = readFileSync(join(RAD, 'src/features/battute.js'), 'utf8');
  const corpo = feat.slice(feat.indexOf('export function accogliDaLei'), feat.indexOf('export function prossimaDa'));
  assert.match(corpo, /'lei', 'sua'/, 'entrano con la loro fonte e il loro schema');
  // niente scorciatoie: non si aggiunge credito, non si salta la scelta
  assert.ok(!/risate|punteggio|priorit/i.test(corpo), 'nessun vantaggio scritto a mano');
});
