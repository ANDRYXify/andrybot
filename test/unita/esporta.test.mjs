// PORTARSI VIA I PROPRI DATI. Due cose devono essere vere insieme: che ci sia
// tutto il proprio, e che NON ci sia niente che non è proprio o che non deve
// uscire. Un export che si porta dietro un token è peggio di nessun export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('esporta-');
const { db, tokens, effects, commands, quotes } = await import('../../src/db.js');
const { esporta, tabelleDiCanale, NEGATE } = await import('../../src/features/esporta.js');
test.after(() => casa.pulisci());

const ora = Date.now();
db.prepare('INSERT OR IGNORE INTO streamers (login, display, user_id, status, requested_at) VALUES (?,?,?,?,?)')
  .run('alfa', 'Alfa', '1', 'approved', ora);
db.prepare('INSERT OR IGNORE INTO streamers (login, display, user_id, status, requested_at) VALUES (?,?,?,?,?)')
  .run('beta', 'Beta', '2', 'approved', ora);
tokens.save('broadcaster', 'alfa', { userId: '1', accessToken: 'SEGRETISSIMO_DI_ALFA', refreshToken: 'RINNOVO_DI_ALFA', scopes: ['chat:read'] });
commands.set('alfa', 'discord', 'entra qui', 'alfa');
commands.set('beta', 'discord', 'roba di beta', 'beta');
effects.add('alfa', { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
db.prepare('INSERT INTO messages (channel, user, display, text, from_bot, ts) VALUES (?,?,?,?,?,?)')
  .run('alfa', 'alfa', 'Alfa', 'ciao ho detto io', 0, ora);
db.prepare('INSERT INTO messages (channel, user, display, text, from_bot, ts) VALUES (?,?,?,?,?,?)')
  .run('alfa', 'unospettatore', 'UnoSpettatore', 'roba scritta da un altro', 0, ora);

const e = esporta('alfa');
const tutto = JSON.stringify(e);

test('c’è dentro la roba propria', () => {
  assert.equal(e.canale, 'alfa');
  assert.ok(e.dati.commands?.some((c) => c.name === 'discord'), 'i comandi');
  assert.ok(e.dati.effects?.some((c) => c.comando === 'airhorn'), 'gli effetti');
  assert.ok(e.dati.streamers?.length, 'la propria scheda');
});

test('non c’è dentro la roba di un altro', () => {
  assert.doesNotMatch(tutto, /roba di beta/);
  assert.ok(!e.dati.commands.some((c) => c.channel === 'beta'));
});

test('NESSUNA chiave di accesso esce, in nessuna forma', () => {
  assert.doesNotMatch(tutto, /SEGRETISSIMO_DI_ALFA/);
  assert.doesNotMatch(tutto, /RINNOVO_DI_ALFA/);
  assert.equal(e.dati.tokens, undefined, 'la tabella dei token non esce proprio');
  assert.doesNotMatch(tutto, /"access_token"|"refresh_token"/);
});

test('i messaggi degli altri restano degli altri', () => {
  assert.doesNotMatch(tutto, /roba scritta da un altro/);
  assert.ok(e.dati.messages_miei?.some((m) => m.text.includes('ho detto io')), 'ma i propri escono');
  assert.equal(e.dati.messages, undefined);
});

test('dice cosa NON ha esportato, e perché', () => {
  assert.ok(e.saltate.length >= 5);
  for (const s of e.saltate) {
    assert.ok(s.tabella && s.perche, `${s.tabella}: manca il motivo`);
    assert.ok(s.perche.length > 15, `${s.tabella}: il motivo deve dire qualcosa`);
  }
  assert.ok(e.saltate.some((s) => s.tabella === 'tokens'));
});

// Questo è il cancello vero: impedisce che una TABELLA NUOVA finisca fuori
// dall'esportazione senza che nessuno ci abbia pensato.
test('ogni tabella di canale è guardata: esportata oppure negata di proposito', () => {
  const v = esporta('alfa', { limite: 1 });
  const decise = new Set([...v.considerate, ...v.saltate.map((s) => s.tabella)]);
  const senzaDecisione = tabelleDiCanale().map((t) => t.tabella).filter((t) => !decise.has(t));
  assert.deepEqual(senzaDecisione, [],
    'una tabella nuova sparirebbe dall’esportazione in silenzio: o si esporta, o si nega con un motivo');
  assert.ok(v.considerate.length >= 25, `guardate ${v.considerate.length} tabelle`);
});

test('una tabella nuova NON decisa fa diventare rosso il collaudo', () => {
  db.exec('CREATE TABLE IF NOT EXISTS roba_nuova (channel TEXT NOT NULL, valore TEXT)');
  try {
    const v = esporta('alfa', { limite: 1 });
    assert.ok(v.considerate.includes('roba_nuova'), 'entra da sola nell’esportazione');
    // e se contenesse segreti, il modo giusto è negarla con un motivo — non
    // dimenticarsene: il controllo qui sopra se ne accorgerebbe.
  } finally { db.exec('DROP TABLE roba_nuova'); }
});

test('ogni tabella negata ha un motivo scritto', () => {
  for (const [t, perche] of Object.entries(NEGATE)) {
    assert.ok(perche && perche.length > 15, `${t}: il motivo non dice niente`);
  }
});

test('un canale che non esiste non fa uscire niente e non cade', () => {
  const v = esporta('nonesiste');
  assert.equal(v.canale, 'nonesiste');
  assert.equal(Object.keys(v.dati).filter((k) => v.dati[k].length).length, 0);
  assert.throws(() => esporta(''), /serve un canale/);
});

test('un nome ostile non diventa SQL', () => {
  assert.doesNotThrow(() => esporta("alfa'; DROP TABLE commands; --"));
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='commands'").get(), 'la tabella è ancora lì');
});
