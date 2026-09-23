// A CHI VANNO, COSTRUITO: il ruolo tuo finisce addosso a te.
//
// Il modello puo' dire giusto e il fare sbagliare. Qui Discord e' finto ma con
// la memoria — i ruoli nascono, le persone li prendono — e si guarda la cosa
// che il proprietario ha visto mancare: dopo aver costruito, «Streamer» ce l'ha
// il proprietario. E la seconda volta non si rifa' niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/features/discord-costruisci.js';
import * as api from '../../src/features/discord-api.js';

const GUILD = '900000000000000001';
const BOT = '700000000000000001';
const RUOLO_BOT = '800000000000000001';
const PROPRIETARIO = '600000000000000001';
const vero = globalThis.fetch;
const ripulisci = () => { globalThis.fetch = vero; };

function casa({ proprietario = PROPRIETARIO } = {}) {
  const st = { ruoli: [], membri: new Map([[PROPRIETARIO, []]]), chiamate: [], prossimo: 700000000000000000n };
  globalThis.fetch = async (url, opz = {}) => {
    const u = String(url).replace('https://discord.com/api/v10', '');
    const metodo = opz.method || 'GET';
    const corpo = opz.body ? JSON.parse(opz.body) : null;
    st.chiamate.push(metodo + ' ' + u);
    const di = (s, d) => ({ status: s, ok: s >= 200 && s < 300, json: async () => d });
    if (metodo === 'GET' && u === `/guilds/${GUILD}`) return di(200, { id: GUILD, name: 'Casa', features: [], owner_id: proprietario });
    if (metodo === 'GET' && u === '/users/@me') return di(200, { id: BOT, username: 'SocialBot' });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/members/${BOT}`) return di(200, { roles: [RUOLO_BOT] });
    const mm = /^\/guilds\/\d+\/members\/(\d+)$/.exec(u);
    if (metodo === 'GET' && mm) return st.membri.has(mm[1]) ? di(200, { roles: st.membri.get(mm[1]) }) : di(404, { code: 10007 });
    const dr = /^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/.exec(u);
    if (metodo === 'PUT' && dr) {
      const cur = st.membri.get(dr[1]) || [];
      if (!cur.includes(dr[2])) cur.push(dr[2]);
      st.membri.set(dr[1], cur);
      return di(204, null);
    }
    if (metodo === 'GET' && u === `/guilds/${GUILD}/roles`) {
      return di(200, [
        { id: GUILD, name: '@everyone', position: 0, permissions: '0' },
        { id: RUOLO_BOT, name: 'SocialBot', position: 9, permissions: api.PERMESSI_BOT, managed: true },
        ...st.ruoli,
      ]);
    }
    if (metodo === 'POST' && u === `/guilds/${GUILD}/roles`) {
      const r = { id: String(st.prossimo += 1n), name: corpo.name, position: 1, permissions: corpo.permissions || '0',
        color: corpo.color || 0, hoist: !!corpo.hoist, mentionable: !!corpo.mentionable };
      st.ruoli.push(r);
      return di(200, r);
    }
    if (metodo === 'GET' && u === `/guilds/${GUILD}/channels`) return di(200, []);
    return di(404, { message: 'boh' });
  };
  return st;
}

const TRACCIA = { ruoli: [
  { nome: 'Streamer', aChi: 'tu' },
  { nome: 'Moderatori', aChi: 'mod' },
  { nome: 'Abbonati', aChi: 'sub' },
] };
const opz = (x = {}) => ({ pausa: 0, ...x });

test('dopo aver costruito, «Streamer» ce l\'ha chi ha il server', async () => {
  const st = casa();
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(e.ok, true, e.errore);
    const streamer = st.ruoli.find((r) => r.name === 'Streamer');
    assert.ok(streamer, 'il ruolo e\' nato');
    assert.ok(st.membri.get(PROPRIETARIO).includes(streamer.id), 'e il proprietario ce l\'ha addosso');
    assert.equal(e.aTeDato, 1);
  } finally { ripulisci(); }
});

test('gli altri ruoli portano la loro regola, con l\'id vero di quello appena nato', async () => {
  const st = casa();
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    const id = (n) => st.ruoli.find((r) => r.name === n).id;
    assert.deepEqual(e.regoleNuove.map((x) => `${x.tipo}:${x.ruolo}`).sort(),
      [`mod:${id('Moderatori')}`, `sub:${id('Abbonati')}`].sort());
    // E non si da' niente a nessuno di nascosto: quei ruoli passano per la
    // scheda dei Ruoli, che li da' a chi si e' collegato.
    const dati = st.chiamate.filter((c) => c.startsWith('PUT ') && c.includes('/members/'));
    assert.equal(dati.length, 1, 'l\'unico ruolo dato qui e\' quello del proprietario');
  } finally { ripulisci(); }
});

test('la seconda volta non si rifa\' niente: ne\' il ruolo ne\' le regole', async () => {
  const st = casa();
  try {
    const prima = await C.applica('tok', GUILD, TRACCIA, opz());
    const regoleOra = prima.regoleNuove.map((x) => ({ tipo: x.tipo, ruolo: x.ruolo }));
    const put = () => st.chiamate.filter((c) => c.startsWith('PUT ')).length;
    const quanti = put();
    const e = await C.applica('tok', GUILD, TRACCIA, opz({ regoleOra }));
    assert.equal(e.niente, true, 'un server gia\' a posto non ha niente da fare');
    assert.equal(put(), quanti, 'e il proprietario non riceve di nuovo il ruolo che ha');
  } finally { ripulisci(); }
});

test('senza un proprietario che Discord dica, non si da\' il ruolo a nessuno', async () => {
  const st = casa({ proprietario: '' });
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(e.ok, true, e.errore);
    assert.equal(e.aTeDato, 0);
    assert.equal(st.chiamate.filter((c) => c.startsWith('PUT ')).length, 0);
  } finally { ripulisci(); }
});
