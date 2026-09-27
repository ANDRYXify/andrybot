// IL SEGNO DEGLI AUGURI IN CHAT, SU UN DATABASE DI PRIMA.
//
// Il segno della chat e' una colonna nuova. Su un database che ha gia' i
// compleanni nasce copiando il segno di prima per chi si era segnato dalla
// chat: se quel giorno aveva gia' ricevuto gli auguri, non li riceve di nuovo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-compleanni-segno-');
test.after(() => usaEGetta.pulisci());

// il database com'era: la tabella dei compleanni senza il segno della chat
const vecchio = new Database(join(usaEGetta.dir, 'andrybot.db'));
vecchio.exec(`CREATE TABLE compleanni (
  channel TEXT NOT NULL, tg_user_id TEXT NOT NULL, nome TEXT NOT NULL DEFAULT '',
  giorno INTEGER NOT NULL, mese INTEGER NOT NULL, last_auguri INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL, PRIMARY KEY (channel, tg_user_id))`);
const riga = vecchio.prepare('INSERT INTO compleanni VALUES (?,?,?,?,?,?,?)');
riga.run('canale', 'chat:marco', 'Marco', 1, 1, 2026, 1);
riga.run('canale', '12345', 'Gianni', 1, 1, 2026, 1);
vecchio.close();

const { compleanni } = await import('../../src/db.js');

test('chi si era segnato dalla chat porta con se\' il segno di prima, gli altri partono da zero', () => {
  assert.equal(compleanni.get('canale', 'chat:marco').last_auguri_chat, 2026);
  assert.equal(compleanni.get('canale', '12345').last_auguri_chat, 0, 'un membro del gruppo in chat non scrive');
  assert.equal(compleanni.get('canale', 'chat:marco').last_auguri, 2026, 'e il segno del gruppo resta com\'era');
});
