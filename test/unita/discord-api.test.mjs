// IL FILO CON DISCORD, provato senza Discord.
//
// Quello che si misura qui non e' «la chiamata funziona» — quello lo dice
// Discord — ma le quattro cose che devono essere vere PRIMA di chiamare, e che
// nessuno vedrebbe guardando una risposta andata bene:
//
//  · dentro il percorso ci vanno solo cifre, quindi da li' non si esce;
//  · il token viaggia nell'intestazione, mai nell'indirizzo;
//  · chi non e' nel server e' una risposta, non un guasto;
//  · «troppe richieste» si aspetta una volta sola, e per il tempo che dice lui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ruoli, server, io, membro, dai, togli, prova, idOk } from '../../src/features/discord-api.js';

const vero = globalThis.fetch;
const chiamate = [];

// `risposte` e' una funzione (url, opzioni) -> { stato, corpo } | un elenco da
// consumare in ordine.
function finto(risposte) {
  chiamate.length = 0;
  const coda = Array.isArray(risposte) ? [...risposte] : null;
  globalThis.fetch = async (url, opz = {}) => {
    chiamate.push({ url: String(url), metodo: opz.method || 'GET', testate: opz.headers || {} });
    const r = coda ? (coda.shift() || { stato: 500, corpo: {} }) : risposte(String(url), opz);
    return {
      status: r.stato,
      ok: r.stato >= 200 && r.stato < 300,
      json: async () => { if (r.corpo === undefined) throw new Error('niente json'); return r.corpo; },
    };
  };
}
const ripulisci = () => { globalThis.fetch = vero; };

test('un id che non e\' fatto di cifre non parte nemmeno', async () => {
  finto(() => ({ stato: 200, corpo: {} }));
  try {
    for (const cattivo of ['../../users/@me', '123/roles', 'abc', '', '1'.repeat(30), '12 34']) {
      assert.equal(idOk(cattivo), false, `«${cattivo}» non e' un id`);
    }
    assert.deepEqual(await ruoli('t', '../../users/@me'), { ok: false, errore: 'id del server non valido' });
    assert.equal((await membro('t', '111111111', 'x/y')).ok, false);
    assert.equal((await dai('t', '111111111', '222222222', 'tutti')).ok, false);
    assert.equal(chiamate.length, 0, 'nessuna di queste e\' uscita dalla macchina');
  } finally { ripulisci(); }
});

test('si parla solo con Discord, e il token sta nell\'intestazione', async () => {
  finto(() => ({ stato: 200, corpo: [] }));
  try {
    await ruoli('segretissimo', '123456789');
    const c = chiamate[0];
    assert.ok(c.url.startsWith('https://discord.com/api/v10/'), c.url);
    assert.ok(!c.url.includes('segretissimo'), 'il token non finisce nell\'indirizzo');
    assert.equal(c.testate.Authorization, 'Bot segretissimo');
  } finally { ripulisci(); }
});

test('i ruoli arrivano con posizione e provenienza, che servono a sapere cosa si puo\' toccare', async () => {
  finto(() => ({ stato: 200, corpo: [
    { id: '100000000000000010', name: 'Sub Twitch', position: 7, managed: true, color: 10181046 },
    { id: '100000000000000011', name: 'Affezionati', position: 3 },
    { name: 'senza id' },
  ] }));
  try {
    const r = await ruoli('t', '123456789');
    assert.equal(r.ok, true);
    assert.deepEqual(r.ruoli, [
      { id: '100000000000000010', nome: 'Sub Twitch', position: 7, managed: true, colore: 10181046 },
      { id: '100000000000000011', nome: 'Affezionati', position: 3, managed: false, colore: 0 },
    ], 'chi non ha id non e\' un ruolo');
  } finally { ripulisci(); }
});

test('chi non e\' nel server non e\' un guasto: e\' una risposta', async () => {
  finto(() => ({ stato: 404, corpo: { code: 10007, message: 'Unknown Member' } }));
  try {
    const m = await membro('t', '123456789', '987654321');
    assert.deepEqual(m, { ok: true, dentro: false, ruoli: [] });
  } finally { ripulisci(); }
});

test('e chi c\'e\' arriva con i suoi ruoli e un nome da mostrare', async () => {
  finto(() => ({ stato: 200, corpo: { roles: ['100000000000000010', '100000000000000011'], nick: '', user: { global_name: 'Ludo', username: 'ludo_' } } }));
  try {
    const m = await membro('t', '123456789', '987654321');
    assert.equal(m.dentro, true);
    assert.deepEqual(m.ruoli, ['100000000000000010', '100000000000000011']);
    assert.equal(m.nome, 'Ludo');
  } finally { ripulisci(); }
});

test('gli errori diventano frasi che una persona puo\' leggere', async () => {
  finto(() => ({ stato: 401, corpo: { message: 'Unauthorized' } }));
  try {
    const a = await ruoli('t', '123456789');
    assert.match(a.errore, /token/, a.errore);
  } finally { ripulisci(); }

  finto(() => ({ stato: 403, corpo: { code: 50013, message: 'Missing Permissions' } }));
  try {
    const b = await dai('t', '123456789', '987654321', '100000000000000010');
    assert.match(b.errore, /permesso|piu' in alto/, b.errore);
  } finally { ripulisci(); }

  finto(() => ({ stato: 503, corpo: {} }));
  try {
    const c = await ruoli('t', '123456789');
    assert.match(c.errore, /Discord non sta bene/, c.errore);
  } finally { ripulisci(); }
});

test('senza token non si chiama nessuno', async () => {
  finto(() => ({ stato: 200, corpo: [] }));
  try {
    const r = await ruoli('   ', '123456789');
    assert.equal(r.ok, false);
    assert.equal(chiamate.length, 0);
  } finally { ripulisci(); }
});

test('«troppe richieste»: si aspetta quanto dice lui, e una volta sola', async () => {
  finto([
    { stato: 429, corpo: { retry_after: 0.01 } },
    { stato: 204, corpo: undefined },
  ]);
  try {
    const r = await dai('t', '123456789', '987654321', '100000000000000010');
    assert.equal(r.ok, true, 'al secondo colpo passa');
    assert.equal(chiamate.length, 2);
  } finally { ripulisci(); }

  finto([
    { stato: 429, corpo: { retry_after: 0.01 } },
    { stato: 429, corpo: { retry_after: 0.01 } },
    { stato: 204, corpo: undefined },
  ]);
  try {
    const r = await dai('t', '123456789', '987654321', '100000000000000010');
    assert.equal(r.ok, false, 'due no di fila non diventano un terzo tentativo');
    assert.equal(chiamate.length, 2);
  } finally { ripulisci(); }

  finto([{ stato: 429, corpo: { retry_after: 120 } }]);
  try {
    const r = await dai('t', '123456789', '987654321', '100000000000000010');
    assert.equal(r.ok, false);
    assert.equal(r.attesa, 120000, 'un\'attesa lunga si dice, non si dorme');
    assert.equal(chiamate.length, 1);
  } finally { ripulisci(); }
});

test('dare e togliere sono due verbi diversi, e si vedono', async () => {
  finto(() => ({ stato: 204, corpo: undefined }));
  try {
    await dai('t', '123456789', '987654321', '100000000000000010');
    await togli('t', '123456789', '987654321', '100000000000000010');
    assert.equal(chiamate[0].metodo, 'PUT');
    assert.equal(chiamate[1].metodo, 'DELETE');
    assert.equal(chiamate[0].url, chiamate[1].url);
    assert.ok(chiamate[0].url.endsWith('/guilds/123456789/members/987654321/roles/100000000000000010'));
  } finally { ripulisci(); }
});

test('l\'altezza del bot si chiede a Discord, non si indovina', async () => {
  finto([
    { stato: 200, corpo: { id: '55555555', username: 'SocialBot' } },
    { stato: 200, corpo: { roles: ['100000000000000011'] } },
  ]);
  try {
    const r = await io('t', '123456789');
    assert.deepEqual(r, { ok: true, id: '55555555', nome: 'SocialBot', ruoli: ['100000000000000011'] });
  } finally { ripulisci(); }
});

test('e se il bot non e\' nel server lo dice con parole sue', async () => {
  finto([
    { stato: 200, corpo: { id: '55555555', username: 'SocialBot' } },
    { stato: 404, corpo: { code: 10007 } },
  ]);
  try {
    const r = await io('t', '123456789');
    assert.equal(r.ok, false);
    assert.match(r.errore, /non e' dentro quel server/, r.errore);
  } finally { ripulisci(); }
});

test('la prova del pannello guarda tre cose: il server, il bot, i ruoli', async () => {
  finto([
    { stato: 200, corpo: { id: '123456789', name: 'Casa mia' } },
    { stato: 200, corpo: { id: '55555555', username: 'SocialBot' } },
    { stato: 200, corpo: { roles: ['100000000000000011'] } },
    { stato: 200, corpo: [{ id: '100000000000000011', name: 'Bot', position: 9 }] },
  ]);
  try {
    const r = await prova('t', '123456789');
    assert.equal(r.ok, true);
    assert.equal(r.server, 'Casa mia');
    assert.equal(r.bot, 'SocialBot');
    assert.deepEqual(r.ruoliBot, ['100000000000000011']);
    assert.equal(r.ruoli.length, 1);
  } finally { ripulisci(); }

  finto([{ stato: 404, corpo: { code: 10004 } }]);
  try {
    const r = await prova('t', '123456789');
    assert.equal(r.ok, false, 'se il server non c\'e\' non si va avanti a chiedere il resto');
    assert.equal(chiamate.length, 1);
  } finally { ripulisci(); }
});

test('il nome del server torna indietro, cosi\' si vede a cosa ci si e\' attaccati', async () => {
  finto(() => ({ stato: 200, corpo: { id: '123456789', name: 'Il salotto' } }));
  try {
    assert.deepEqual(await server('t', '123456789'), { ok: true, id: '123456789', nome: 'Il salotto' });
  } finally { ripulisci(); }
});
