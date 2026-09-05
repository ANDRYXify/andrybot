// QUELLO CHE STA NEL DATABASE, se il database te lo rubano.
//
// La prova che conta non è che la funzione di cifratura funzioni: è che il
// segreto NON SIA nel file. Qui si scrive con gli accessori veri e poi si
// rilegge la colonna grezza con SQL, come farebbe chi ha il file in mano.
//
// Il modello è in docs/SEGRETI.md.

import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('segreti-riposo-');
const { db, tokens, tgConf, spotifyTokens, tiktokTokens, seventvTokens, CAMPI_SEGRETI, migraSegreti } = await import('../../src/db.js');
test.after(() => casa.pulisci());

const grezzo = (tabella, colonna, dove, val) =>
  db.prepare(`SELECT ${colonna} v FROM ${tabella} WHERE ${dove}=?`).get(val)?.v || '';

test('il token del bot Telegram non è nel database in chiaro', () => {
  const vero = '7654321:AAH-questo-e-il-token-del-bot-di-andryx';
  tgConf.set('andryx', { token: vero, attivo: 1 });
  const dentro = grezzo('telegram', 'token', 'channel', 'andryx');
  assert.ok(!dentro.includes(vero), 'il token si legge nel file: chi lo ruba comanda il bot');
  assert.ok(dentro.startsWith('enc:2:'), 'dev’essere nella busta di adesso');
  assert.equal(tgConf.get('andryx').token, vero, 'e noi lo dobbiamo poter rileggere');
});

test('Spotify: access, refresh e il client_secret dell’app', () => {
  spotifyTokens.setConfig('andryx', { clientId: 'idpubblico', clientSecret: 'SEGRETO-DELL-APP' });
  spotifyTokens.set('andryx', { access: 'ACCESS-SPOTIFY', refresh: 'REFRESH-SPOTIFY', scadenza: 1 });
  for (const [col, val] of [['access', 'ACCESS-SPOTIFY'], ['refresh', 'REFRESH-SPOTIFY'], ['client_secret', 'SEGRETO-DELL-APP']]) {
    assert.ok(!grezzo('spotify_tokens', col, 'login', 'andryx').includes(val), col + ' è in chiaro');
  }
  const r = spotifyTokens.get('andryx');
  assert.equal(r.access, 'ACCESS-SPOTIFY');
  assert.equal(r.client_secret, 'SEGRETO-DELL-APP');
});

test('TikTok e 7TV', () => {
  tiktokTokens.set('andryx', { access: 'ACCESS-TIKTOK', refresh: 'REFRESH-TIKTOK', openId: 'x' });
  seventvTokens.set('andryx', { token: 'JWT-DI-SETTETIVU', userId: 'u', setId: 's' });
  assert.ok(!grezzo('tiktok_tokens', 'access', 'login', 'andryx').includes('ACCESS-TIKTOK'));
  assert.ok(!grezzo('seventv_tokens', 'token', 'login', 'andryx').includes('JWT-DI-SETTETIVU'));
  assert.equal(tiktokTokens.get('andryx').access, 'ACCESS-TIKTOK');
  assert.equal(seventvTokens.get('andryx').token, 'JWT-DI-SETTETIVU');
});

test('i token OAuth non si possono spostare da un account all’altro', () => {
  tokens.save('twitch', 'andryx', { userId: '1', accessToken: 'TOKEN-DI-ANDRYX', refreshToken: 'R', scopes: [] });
  tokens.save('twitch', 'unaltro', { userId: '2', accessToken: 'TOKEN-DELL-ALTRO', refreshToken: 'R2', scopes: [] });
  // chi riesce a scrivere nel database si copia la busta dell'altro nella sua riga
  const rubata = grezzo('tokens', 'access_token', 'login', 'andryx');
  db.prepare("UPDATE tokens SET access_token=? WHERE login='unaltro'").run(rubata);
  assert.equal(tokens.get('twitch', 'unaltro').accessToken, '',
    'la busta è legata alla sua riga: spostata non si apre');
  assert.equal(tokens.get('twitch', 'andryx').accessToken, 'TOKEN-DI-ANDRYX');
});

test('la migrazione porta nella busta quello che trova in chiaro', () => {
  db.prepare("UPDATE telegram SET token='token-vecchio-in-chiaro' WHERE channel='andryx'").run();
  assert.equal(grezzo('telegram', 'token', 'channel', 'andryx'), 'token-vecchio-in-chiaro');
  assert.ok(migraSegreti() >= 1);
  assert.ok(grezzo('telegram', 'token', 'channel', 'andryx').startsWith('enc:2:'));
  assert.equal(tgConf.get('andryx').token, 'token-vecchio-in-chiaro');
  assert.equal(migraSegreti(), 0, 'ripassare non deve rifare niente');
});

test('l’elenco dei campi segreti copre le colonne che esistono davvero', () => {
  for (const [tabella, campi] of Object.entries(CAMPI_SEGRETI)) {
    const colonne = db.prepare(`PRAGMA table_info(${tabella})`).all().map((c) => c.name);
    for (const c of campi) assert.ok(colonne.includes(c), `${tabella}.${c} non esiste più: l’elenco mente`);
  }
});
