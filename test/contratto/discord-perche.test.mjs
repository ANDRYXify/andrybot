// IL BOT RENDE CONTO DI QUELLO CHE FA IN CASA D'ALTRI.
//
// Discord tiene 45 giorni di registro, e accanto a ogni azione puo' scriverci
// PERCHE' e' stata fatta — se chi la fa glielo dice. Senza, chi apre il registro
// del suo server legge «SocialBot ha dato Abbonati» e non sa in nome di cosa:
// un bot che muove ruoli e non rende conto. Peggio col costruttore, dove la
// riga e' «SocialBot ha cancellato un canale».
//
// Il perche' nasce DENTRO la funzione che decide, non da una seconda lettura
// fatta al momento di scrivere: due conti sulla stessa cosa sono due conti che
// un giorno non coincidono, e il registro direbbe una ragione mentre il ruolo
// ne aveva avuta un'altra.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { differenza, perche } from '../../src/features/discord-ruoli.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

test('ogni ruolo dato porta con se\' la condizione che l\'ha deciso', () => {
  const regole = [
    { tipo: 'sub', ruolo: '111' },
    { tipo: 'ore', soglia: 10, ruolo: '222' },
    { tipo: 'follower', ruolo: '222' },
  ];
  const d = differenza({ regole, dati: { sub: true, ore: 12, follower: true }, attuali: [], fuoriPortata: [] });
  assert.deepEqual(d.dare, ['111', '222']);
  assert.equal(d.perche['111'], 'è abbonato');
  // due regole per lo stesso ruolo: si dicono tutte e due, non la prima che capita
  assert.match(d.perche['222'], /ti ha guardato almeno 10 ore/);
  assert.match(d.perche['222'], /ti segue/);
});

test('e un ruolo tolto dice che non c\'e\' piu\' nessuna condizione a reggerlo', () => {
  const regole = [{ tipo: 'sub', ruolo: '111' }];
  const d = differenza({ regole, dati: { sub: false }, attuali: ['111'], fuoriPortata: [] });
  assert.deepEqual(d.togliere, ['111']);
  assert.match(d.perche['111'], /nessuna condizione/);
});

test('una soglia finisce nel motivo col suo numero, non «almeno tanto»', () => {
  assert.equal(perche({ tipo: 'monete', soglia: 500 }), 'ha almeno 500 monete');
  assert.equal(perche({ tipo: 'serie', soglia: 3 }), 'è di fila da 3 dirette');
  assert.equal(perche({ tipo: 'boh' }), '', 'una condizione che non esiste non inventa un motivo');
});

test('il motivo arriva davvero a Discord, in tutte le porte che cambiano qualcosa', () => {
  const api = leggi('src/features/discord-api.js');
  assert.match(api, /'X-Audit-Log-Reason': encodeURIComponent\(/,
    'il motivo non viaggia nell\'intestazione che Discord legge');
  // deve essere sfuggito: un accento crudo in un\'intestazione HTTP e' un errore
  assert.match(api, /encodeURIComponent\('SocialBot · ' \+ t\)/);
  for (const f of ['dai', 'togli', 'creaCanale', 'sistemaCanale', 'togliCanale',
    'creaRuolo', 'sistemaRuolo', 'togliRuolo']) {
    const m = new RegExp(`export async function ${f}\\([^)]*perche`);
    assert.match(api, m, `«${f}» cambia qualcosa e non sa dire perche'`);
  }
});

test('chi chiama lo passa: il giro dei ruoli e il costruttore', () => {
  const giro = leggi('src/features/discord-giro.js');
  assert.match(giro, /verbo\(token, conf\.guild, g\.dc_id, id, d\.perche\?\.\[id\] \|\| ''\)/,
    'il giro muove ruoli senza dire in nome di cosa');
  const cos = leggi('src/features/discord-costruisci.js');
  for (const chiave of ['creato', 'sistemato', 'tolto', 'ruoloCreato', 'ruoloSistemato', 'ruoloTolto']) {
    assert.ok(cos.includes(`MOTIVO.${chiave}`), `il costruttore non dice perche' per «${chiave}»`);
  }
  assert.ok(cos.includes("tolto: 'non e\\' nella traccia"),
    'cancellare e\' la cosa che piu\' di tutte ha bisogno di un perche\' scritto');
});
