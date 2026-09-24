// LE PAGINE PUBBLICHE DI UN CANALE VALGONO PER OGNI PIATTAFORMA. Un canale di
// Kick, di YouTube o solo di Discord ha un login col prefisso (kick.nome,
// yt.nome, dc.nome): la pagina link, la pagina delle donazioni, le loro
// informative, le anteprime, i ritorni dei pagamenti e l'avviso di Ko-fi
// rispondevano 404 a quei nomi, perche' ogni rotta si era scritta la sua
// regola con i soli nomi di Twitch. La regola e' una, LOGIN_RE di identita.js,
// e qui si controlla che nessuna rotta se ne scriva un'altra.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eLoginNostro, LOGIN_RE } from '../../src/identita.js';

const SERVER = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');

test('i canali di ogni piattaforma sono nomi nostri, e i percorsi strani no', () => {
  for (const x of ['andryxify', 'kick.nome', 'yt.nome_1', 'dc.nome']) assert.ok(eLoginNostro(x), x);
  for (const x of ['..', 'kick..nome', 'a.b', 'kick.', 'nome/x', '']) assert.ok(!eLoginNostro(x), x);
});

test('nessuna rotta controlla un canale con una regola sua', () => {
  const proprie = [...SERVER.matchAll(/\/\^\[a-z0-9_\]\{\d+,\d+\}\$\/\.test\((login|user|canale)\)/g)].map((m) => m[0]);
  assert.deepEqual(proprie, [], 'un canale si controlla con eLoginNostro');
  const inVia = [...SERVER.matchAll(/\/\^\\\/\(\[a-z0-9_\]\{1,30\}\)/g)].map((m) => m[0]);
  assert.deepEqual(inVia, [], 'un canale in un indirizzo corto si legge con la stessa regola');
  assert.ok(SERVER.includes("const CANALE_IN_VIA = LOGIN_RE.source.replace(/^\\^|\\$$/g, '');"));
});

test('gli indirizzi corti riconoscono i canali di ogni piattaforma', () => {
  const via = LOGIN_RE.source.replace(/^\^|\$$/g, '');
  const dona = new RegExp(`^/(${via})(/privacy)?/?$`, 'i');
  assert.deepEqual(dona.exec('/kick.nome')?.slice(1), ['kick.nome', undefined]);
  assert.deepEqual(dona.exec('/yt.nome/privacy')?.slice(1), ['yt.nome', '/privacy']);
  assert.equal(dona.exec('/../privacy'), null);
});
