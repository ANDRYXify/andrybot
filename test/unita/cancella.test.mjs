// ANDARSENE DAVVERO.
//
// L'esportazione c'era, la cancellazione no: si poteva portare via la propria
// roba, non toglierla di mezzo. Una cancellazione a meta' pero' e' peggio del
// niente — la persona crede di essere sparita e invece e' rimasta — quindi la
// cosa da provare non e' «cancella qualcosa», e' «NON RESTA NIENTE».
//
// L'elenco delle tabelle si ricava dallo schema, dallo stesso posto da cui lo
// ricava l'esportazione. Cosi' una tabella nuova viene cancellata da sola e
// nessuno se ne deve ricordare. Questa prova lo pretende: dopo la cancellazione
// si guarda TUTTO lo schema, non un elenco scritto qui.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('cancella-');
const { db, streamers, commands, points, modules } = await import('../../src/db.js');
const { cancella, restiDi, cartelleDiCanale } = await import('../../src/features/cancella.js');
const { tabelleDiCanale } = await import('../../src/features/esporta.js');
test.after(() => casa.pulisci());

const MIO = 'alfa';
const ALTRO = 'beta';

function riempi(login) {
  streamers.upsertApproved(login, login, '1');
  streamers.setEnabled(login, true);
  commands.set(login, 'ciao', 'ciao a tutti');
  points.add(login, 'lucia', 50);
  modules.save(login, { nome: 'x', trigger: { tipo: 'comando', comando: 'x' }, condizioni: {}, azioni: [] });
  const dir = path.join(process.env.DATA_DIR, 'effects', login);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'suono.mp3'), 'x');
}

test('senza il nome del canale scritto a mano non si cancella niente', () => {
  riempi(MIO);
  assert.throws(() => cancella(MIO, { conferma: '' }), /conferma/);
  assert.throws(() => cancella(MIO, { conferma: 'altro' }), /conferma/);
  assert.ok(Object.keys(restiDi(MIO).righe).length, 'e la roba e\' ancora tutta li\'');
});

test('un login inventato non passa: niente puo\' uscire dalla cartella dei dati', () => {
  assert.throws(() => cancella('../../etc', { conferma: '../../etc' }), /non valido/);
  assert.throws(() => cancella('', { conferma: '' }), /non valido/);
});

test('dopo la cancellazione non resta NIENTE in nessuna tabella dello schema', () => {
  riempi(MIO);
  const prima = restiDi(MIO);
  assert.ok(Object.keys(prima.righe).length >= 3, 'la prova parte da un canale pieno');

  const esito = cancella(MIO, { conferma: MIO });
  assert.ok(esito.tabelleGuardate >= 40, 'ha guardato tutto lo schema, non un elenco scritto a mano');

  // il controllo vero: si rigira TUTTO lo schema, non le tabelle che mi ricordo
  const rimasti = [];
  for (const { tabella, colonna } of tabelleDiCanale()) {
    const n = db.prepare(`SELECT COUNT(*) c FROM "${tabella}" WHERE "${colonna}"=?`).get(MIO).c;
    if (n) rimasti.push(`${tabella} (${n})`);
  }
  assert.deepEqual(rimasti, [], 'una cancellazione a meta\' e\' peggio del niente');
});

test('e i file caricati vanno via con il resto', () => {
  riempi(MIO);
  assert.equal(cartelleDiCanale(MIO).length, 1, 'la cartella c\'e\' prima');
  cancella(MIO, { conferma: MIO });
  assert.deepEqual(cartelleDiCanale(MIO), [], 'e non c\'e\' dopo');
});

test('il canale di un altro non si tocca', () => {
  riempi(MIO);
  riempi(ALTRO);
  cancella(MIO, { conferma: MIO });

  assert.ok(streamers.get(ALTRO), 'l\'altro streamer esiste ancora');
  assert.equal(commands.get(ALTRO, 'ciao'), 'ciao a tutti');
  assert.equal(cartelleDiCanale(ALTRO).length, 1);
  assert.equal(streamers.get(MIO), null, 'mentre il mio non c\'e\' piu\'');
});

test('l\'affinita\' con la persona sparisce con la persona', () => {
  riempi(MIO);
  db.prepare('INSERT OR REPLACE INTO friends (user, affinity, interactions, first_seen, last_seen) VALUES (?,?,?,?,?)')
    .run(MIO, 42, 10, 1, 2);
  assert.ok(restiDi(MIO).righe.friends, 'la riga c\'e\'');
  cancella(MIO, { conferma: MIO });
  assert.equal(db.prepare('SELECT COUNT(*) c FROM friends WHERE user=?').get(MIO).c, 0);
});

test('cancellare due volte non si lamenta: la seconda non trova niente', () => {
  riempi(MIO);
  cancella(MIO, { conferma: MIO });
  const secondo = cancella(MIO, { conferma: MIO });
  assert.deepEqual(secondo.righe, {}, 'niente da cancellare, e nessun errore');
});
