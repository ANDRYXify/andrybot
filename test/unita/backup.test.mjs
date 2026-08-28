// IL BACKUP, e soprattutto il RIPRISTINO. Le copie c'erano già; quello che non
// c'era è la prova che siano riapribili — e un backup che nessuno ha mai
// riaperto è una speranza, non un backup. Qui il giro si chiude davvero: si
// scrive, si copia, si rovina l'originale, si ripristina, si ritrova tutto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('backup-');
const { db, streamers, effects } = await import('../../src/db.js');
const { backupOra, provaCopia, elencoCopie, cartellaCopie } = await import('../../src/backup.js');
test.after(() => casa.pulisci());

const DB = join(casa.dir, 'andrybot.db');

streamers.upsertRequest?.({ login: 'alfa', display: 'Alfa', userId: '1' });
if (!streamers.get('alfa')) db.prepare('INSERT OR IGNORE INTO streamers (login, display, user_id, status, requested_at) VALUES (?,?,?,?,?)')
  .run('alfa', 'Alfa', '1', 'approved', Date.now());
effects.add('alfa', { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });

test('una copia si fa e si riapre', async () => {
  const r = await backupOra();
  assert.equal(r.ok, true, r.errore);
  assert.equal(r.prova.ok, true, 'la copia appena fatta si riapre: ' + r.prova.errore);
  assert.ok(r.prova.streamer >= 1, 'e dentro ci sono gli streamer');
  assert.equal(elencoCopie().length, 1);
});

test('una copia rovinata viene riconosciuta come tale', () => {
  const finto = join(cartellaCopie(), 'andrybot-19700101-000000.db');
  writeFileSync(finto, 'questo non è un database');
  const p = provaCopia(finto);
  assert.equal(p.ok, false);
  assert.ok(p.errore, 'e dice perché');
  rmSync(finto);
});

test('un file che non esiste non passa per buono', () => {
  assert.equal(provaCopia(join(cartellaCopie(), 'non-esiste.db')).ok, false);
  assert.equal(provaCopia('').ok, false);
  assert.equal(provaCopia(null).ok, false);
});

test('un database senza le tabelle vitali non è un backup', async () => {
  const Database = (await import('better-sqlite3')).default;
  const vuoto = join(casa.dir, 'vuoto.db');
  const c = new Database(vuoto);
  c.exec('CREATE TABLE qualcosa (a INTEGER)');
  c.close();
  const p = provaCopia(vuoto);
  assert.equal(p.ok, false);
  assert.match(p.errore, /tabelle mancanti/);
});

test('il giro completo: si perde tutto e si ritrova tutto', async () => {
  // quello che c'è adesso
  const primaEffetti = effects.list('alfa').length;
  const primaStreamer = db.prepare('SELECT COUNT(*) n FROM streamers').get().n;
  assert.ok(primaEffetti >= 1 && primaStreamer >= 1);

  const copia = elencoCopie()[0];
  assert.ok(copia, 'la copia del primo test è lì');

  // disastro: il database viene distrutto
  db.close();
  writeFileSync(DB, 'disastro');
  for (const s of ['-wal', '-shm']) { try { if (existsSync(DB + s)) rmSync(DB + s); } catch { /* */ } }
  assert.equal(provaCopia(DB).ok, false, 'il database rovinato non si apre più');

  // ripristino: la stessa sequenza dello script (controlla, copia, ricontrolla)
  assert.equal(provaCopia(copia.percorso).ok, true, 'la copia si controlla PRIMA di scrivere');
  copyFileSync(copia.percorso, DB);
  const dopo = provaCopia(DB);
  assert.equal(dopo.ok, true, 'e si ricontrolla DOPO: ' + dopo.errore);

  // e i dati ci sono davvero
  const Database = (await import('better-sqlite3')).default;
  const ripreso = new Database(DB, { readonly: true });
  assert.equal(ripreso.prepare('SELECT COUNT(*) n FROM streamers').get().n, primaStreamer);
  assert.equal(ripreso.prepare('SELECT COUNT(*) n FROM effects WHERE channel=?').get('alfa').n, primaEffetti);
  assert.equal(ripreso.prepare('SELECT comando FROM effects WHERE channel=?').get('alfa').comando, 'airhorn');
  ripreso.close();
});
