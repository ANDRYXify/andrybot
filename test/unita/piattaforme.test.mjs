// LE PIATTAFORME: una tabella sola, e tutto il resto derivato da lì.
//
// Il difetto che questo collaudo esiste per impedire non è "il prefisso
// sbagliato": è la quarta piattaforma scritta a mano in tre funzioni su quattro.
// Qui si prova la REGOLA, non i tre casi che oggi conosciamo — quindi il giorno
// che se ne aggiunge una il collaudo la copre già.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PIATTAFORME, LOGIN_RE, eLoginNostro, loginSu, nomeSu, piattaformaDi, eSu } from '../../src/identita.js';

const NOMI = ['pippo', 'a', 'nome_con_trattino', 'x9', 'a'.repeat(30)];

test('una sola piattaforma è "casa", tutte le altre hanno un prefisso col punto', () => {
  const casa = PIATTAFORME.filter((p) => !p.prefisso);
  assert.equal(casa.length, 1, 'la casa è una sola: due prefissi vuoti sarebbero ambigui');
  for (const p of PIATTAFORME.filter((x) => x.prefisso)) {
    assert.match(p.prefisso, /^[a-z0-9]+\.$/, `${p.id}: il prefisso finisce col punto ed è fatto di lettere e cifre`);
  }
});

test('nessun prefisso è il principio di un altro', () => {
  const con = PIATTAFORME.filter((p) => p.prefisso);
  for (const a of con) for (const b of con) {
    if (a === b) continue;
    assert.ok(!b.prefisso.startsWith(a.prefisso), `${b.id} comincia come ${a.id}: un canale finirebbe sulla piattaforma sbagliata`);
  }
});

test('un canale torna sempre alla sua piattaforma e al suo nome', () => {
  for (const p of PIATTAFORME) for (const n of NOMI) {
    const login = loginSu(p.id, n);
    assert.ok(login, `${p.id}/${n}: il canale esiste`);
    assert.equal(piattaformaDi(login), p.id, `${login} vive su ${p.id}`);
    assert.equal(nomeSu(login), n, `${login} si chiama ${n}`);
    assert.equal(eSu(p.id, login), true);
    assert.equal(eLoginNostro(login), true, `${login} è un canale nostro`);
  }
});

test('due piattaforme non possono darsi lo stesso canale', () => {
  for (const n of NOMI) {
    const visti = new Set();
    for (const p of PIATTAFORME) {
      const login = loginSu(p.id, n);
      assert.ok(!visti.has(login), `${login}: due piattaforme si contendono la stessa riga`);
      visti.add(login);
    }
  }
});

test('un nome sporco non diventa un percorso', () => {
  for (const cattivo of ['..', '../etc', 'a/b', 'kick.', '.pippo', 'pippo.', 'a..b', '', 'con spazio', 'a'.repeat(31)]) {
    assert.equal(eLoginNostro(cattivo), false, `${JSON.stringify(cattivo)} non è un canale`);
  }
  // e ciò che si ricava da un nome sporco è comunque un canale valido
  for (const p of PIATTAFORME) {
    const login = loginSu(p.id, '../../etc/passwd');
    if (login) assert.match(login, LOGIN_RE, `${login} resta una forma valida`);
  }
});

test('una piattaforma che non esiste non produce canali', () => {
  assert.equal(loginSu('myspace', 'pippo'), '');
  assert.equal(loginSu('', 'pippo'), '');
  assert.equal(loginSu('twitch', ''), '');
});
