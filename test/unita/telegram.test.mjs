// TELEGRAM: quale chat si collega, e la regola che impedisce il «Conflict».
//
// Il difetto vero: con il bot interattivo acceso Telegram VIETA getUpdates, e
// il pulsante «Rileva gruppo» lo chiamava lo stesso — quindi falliva ogni volta
// con «Conflict: can't use getUpdates method while webhook is active». Il suo
// gemello «rileva destinazioni» il controllo ce l'aveva: lo stesso fatto scritto
// in due posti, e uno se n'era dimenticato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scegliGruppo } from '../../src/features/telegram.js';

const chat = (id, tipo, extra = {}) => ({ chatId: String(id), tipo, titolo: 'chat ' + id, threadId: '', ...extra });

test('vince il gruppo più recente', () => {
  const d = [chat(1, 'group'), chat(2, 'supergroup')];
  assert.equal(scegliGruppo(d).chatId, '1', 'l’elenco arriva già dal più recente');
});

test('un canale vale come gruppo', () => {
  assert.equal(scegliGruppo([chat(9, 'channel')]).chatId, '9');
});

test('la chat privata è il ripiego, non la prima scelta', () => {
  assert.equal(scegliGruppo([chat(5, 'private'), chat(6, 'group')]).chatId, '6');
  const soloPrivata = scegliGruppo([chat(5, 'private')]);
  assert.equal(soloPrivata.chatId, '5');
  assert.equal(soloPrivata.tipo, 'private');
});

test('un topic non è un gruppo da collegare', () => {
  const d = [chat(7, 'supergroup', { threadId: '12' }), chat(7, 'supergroup')];
  const scelto = scegliGruppo(d);
  assert.equal(scelto.threadId, '', 'si collega il gruppo, non il singolo topic');
});

test('niente da collegare non inventa niente', () => {
  assert.equal(scegliGruppo([]), null);
  assert.equal(scegliGruppo(null), null);
  assert.equal(scegliGruppo([{ tipo: 'group' }]), null, 'senza chatId non è una chat');
  assert.equal(scegliGruppo([chat(1, 'boh')]), null, 'un tipo sconosciuto non passa per gruppo');
});

// --- il cancello vero: una sola porta su getUpdates, e chi la apre controlla ---
const tg = readFileSync('src/features/telegram.js', 'utf8');
const srv = readFileSync('src/web/server.js', 'utf8');

test('getUpdates si chiama da UN posto solo', () => {
  const chiamate = (tg.match(/tgCall\([^,]+,\s*'getUpdates'/g) || []).length;
  assert.equal(chiamate, 1, `ci sono ${chiamate} porte su getUpdates: due si dimenticano, una no`);
});

test('chi guarda cosa ha visto il bot controlla PRIMA il webhook', () => {
  // rilevaDestinazioni è l'unica che parla con getUpdates: deve essere chiamata
  // soltanto da chatViste(), che il webhook lo controlla.
  const usi = (srv.match(/telegram\.rilevaDestinazioni\(/g) || []).length;
  assert.equal(usi, 1, 'rilevaDestinazioni va chiamata da un posto solo (chatViste)');

  const corpo = srv.slice(srv.indexOf('async function chatViste('), srv.indexOf('const erroreWebhookAltrove'));
  assert.ok(corpo.includes('telegram.infoWebhook('), 'chatViste deve chiedere a Telegram lo stato del webhook');
  assert.ok(corpo.indexOf('infoWebhook') < corpo.indexOf('rilevaDestinazioni'),
    'lo stato del webhook si controlla PRIMA di chiamare getUpdates');
  assert.ok(/if \(!webhookAttivo\)/.test(corpo), 'e getUpdates si chiama solo se il webhook è spento');
});

test('la funzione che si era dimenticata del webhook non esiste più', () => {
  assert.ok(!/export async function rilevaGruppo/.test(tg), 'rilevaGruppo era la seconda porta: rimossa');
  assert.ok(!/rilevaGruppo/.test(srv), 'e nessuno la chiama più');
});
