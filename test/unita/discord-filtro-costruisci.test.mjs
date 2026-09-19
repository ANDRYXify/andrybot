// IL FILTRO, COSTRUITO: i nomi diventano id quando le cose esistono.
//
// Una regola puo' avvisare in un canale e risparmiare dei ruoli, e quei canali
// e quei ruoli la traccia li sta creando nello stesso giro. Vale la stessa
// regola della porta d'ingresso — nella traccia si nomina per NOME — e lo
// stesso momento per tradurre: dopo aver creato, prima di cancellare.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/features/discord-costruisci.js';
import * as api from '../../src/features/discord-api.js';

const GUILD = '900000000000000001';
const BOT = '700000000000000001';
const RUOLO_BOT = '800000000000000001';
const vero = globalThis.fetch;
const ripulisci = () => { globalThis.fetch = vero; };

function casa({ regole = [] } = {}) {
  const st = { canali: [], ruoli: [], regole: [...regole], chiamate: [], corpi: [], prossimo: 700000000000000000n };
  globalThis.fetch = async (url, opz = {}) => {
    const u = String(url).replace('https://discord.com/api/v10', '');
    const metodo = opz.method || 'GET';
    const corpo = opz.body ? JSON.parse(opz.body) : null;
    st.chiamate.push(metodo + ' ' + u);
    if (corpo) st.corpi.push({ via: metodo + ' ' + u, corpo });
    const di = (s, d) => ({ status: s, ok: s >= 200 && s < 300, json: async () => d });

    if (metodo === 'GET' && u === `/guilds/${GUILD}`) return di(200, { id: GUILD, name: 'Casa', features: [] });
    if (metodo === 'GET' && u === '/users/@me') return di(200, { id: BOT, username: 'SocialBot' });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/members/${BOT}`) return di(200, { roles: [RUOLO_BOT] });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/roles`) {
      return di(200, [
        { id: GUILD, name: '@everyone', position: 0, permissions: '0' },
        { id: RUOLO_BOT, name: 'SocialBot', position: 9, permissions: api.PERMESSI_BOT, managed: true },
        ...st.ruoli,
      ]);
    }
    if (metodo === 'POST' && u === `/guilds/${GUILD}/roles`) {
      const r = { id: String(st.prossimo += 1n), name: corpo.name, position: 1, permissions: corpo.permissions || '0' };
      st.ruoli.push(r);
      return di(200, r);
    }
    if (metodo === 'GET' && u === `/guilds/${GUILD}/channels`) return di(200, st.canali);
    if (metodo === 'POST' && u === `/guilds/${GUILD}/channels`) {
      const c = { id: String(st.prossimo += 1n), name: corpo.name, type: corpo.type,
        parent_id: corpo.parent_id || null, topic: '', permission_overwrites: [], last_message_id: null };
      st.canali.push(c);
      return di(201, c);
    }
    if (u === `/guilds/${GUILD}/auto-moderation/rules`) {
      if (metodo === 'GET') return di(200, st.regole);
      if (metodo === 'POST') { const r = { ...corpo, id: String(st.prossimo += 1n) }; st.regole.push(r); return di(201, r); }
    }
    const m = /^\/guilds\/\d+\/auto-moderation\/rules\/(\d+)$/.exec(u);
    if (m) {
      const i = st.regole.findIndex((r) => String(r.id) === m[1]);
      if (i < 0) return di(404, { message: 'boh' });
      if (metodo === 'DELETE') { st.regole.splice(i, 1); return di(204, null); }
      if (metodo === 'PATCH') { st.regole[i] = { ...st.regole[i], ...corpo }; return di(200, st.regole[i]); }
    }
    const p = /^\/channels\/(\d+)$/.exec(u);
    if (p && metodo === 'PATCH') return di(200, {});
    return di(404, { message: 'boh' });
  };
  return st;
}

const TRACCIA = {
  ruoli: [{ nome: 'Moderatori' }],
  categorie: [{ nome: 'Casa', canali: [{ nome: 'generale' }, { nome: 'staff' }] }],
  filtro: [
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto'],
      azioni: { blocca: true, avvisaIn: 'staff', pausa: 600 },
      esentiRuoli: ['Moderatori'], esentiCanali: ['staff'] },
    { tipo: 'spam' },
  ],
};
const opz = (x = {}) => ({ pausa: 0, ...x });

test('i canali e i ruoli nati adesso finiscono nella regola col loro id vero', async () => {
  const st = casa();
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(e.ok, true, e.errore);
    assert.equal(e.filtroCreate, 2, 'le due regole della traccia');
    const perNome = new Map(st.canali.map((c) => [c.name, c.id]));
    const r = st.regole.find((x) => x.name === 'Insulti');
    assert.ok(r, 'la regola c\'e\'');
    assert.equal(r.actions.find((a) => a.type === 2).metadata.channel_id, perNome.get('staff'),
      'l\'avviso va nel canale nato adesso');
    assert.deepEqual(r.exempt_channels, [perNome.get('staff')]);
    assert.deepEqual(r.exempt_roles, [st.ruoli.find((x) => x.name === 'Moderatori').id]);
    assert.equal(r.actions.find((a) => a.type === 3).metadata.duration_seconds, 600);
  } finally { ripulisci(); }
});

test('la seconda volta non si riscrive niente', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, TRACCIA, opz());
    const conta = () => st.chiamate.filter((c) => c.includes('auto-moderation') && !c.startsWith('GET')).length;
    const prima = conta();
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(conta(), prima, 'in casa d\'altri, una riga di registro al giorno per non aver fatto niente');
    assert.equal(e.niente, true);
    assert.equal(st.regole.length, 2, 'e soprattutto nessun doppione');
  } finally { ripulisci(); }
});

test('un nome che non si trova cade, e si dice', async () => {
  const st = casa();
  const traccia = { ...TRACCIA, filtro: [
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto'], azioni: { avvisaIn: 'un-canale-mai-visto' }, esentiRuoli: ['Fantasma'] },
  ] };
  try {
    const e = await C.applica('tok', GUILD, traccia, opz());
    assert.ok(e.errori.some((x) => /un-canale-mai-visto/.test(x)), e.errori.join(' · '));
    assert.ok(e.errori.some((x) => /Fantasma/.test(x)));
    const r = st.regole.find((x) => x.name === 'Insulti');
    assert.ok(!r.actions.some((a) => a.type === 2), 'nessun avviso verso un id inventato');
    assert.deepEqual(r.exempt_roles, []);
  } finally { ripulisci(); }
});

const SUA = { id: '55555555555555555', name: 'Sua', trigger_type: 5, enabled: true,
  trigger_metadata: { mention_total_limit: 9 }, actions: [{ type: 1, metadata: {} }], exempt_roles: [], exempt_channels: [] };

test('andando solo in avanti, una regola fuori dalla traccia non si tocca', async () => {
  const st = casa({ regole: [{ ...SUA }] });
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(e.filtroTolte, 0);
    assert.ok(st.regole.some((r) => r.id === SUA.id), 'e\' ancora li\'');
    assert.ok(!st.chiamate.some((c) => c.startsWith('DELETE /guilds/' + GUILD + '/auto-moderation')));
  } finally { ripulisci(); }
});

test('facendo piazza pulita invece sparisce, e ne resta il nome', async () => {
  const st = casa({ regole: [{ ...SUA }] });
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz({ togliere: true }));
    assert.equal(e.filtroTolte, 1);
    assert.deepEqual(e.nomiFiltroTolte, ['Sua']);
    assert.ok(!st.regole.some((r) => r.id === SUA.id));
  } finally { ripulisci(); }
});

test('una traccia che di filtro non parla non chiede niente a Discord', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, { categorie: [{ nome: 'Casa', canali: [{ nome: 'generale' }] }] }, opz());
    assert.ok(!st.chiamate.some((c) => c.includes('auto-moderation')), 'nemmeno per leggerlo');
  } finally { ripulisci(); }
});

test('il filtro si scrive dopo i canali e i ruoli', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, TRACCIA, opz());
    const q = st.chiamate;
    const prima = q.findIndex((c) => c === `POST /guilds/${GUILD}/auto-moderation/rules`);
    assert.ok(prima > q.lastIndexOf(`POST /guilds/${GUILD}/channels`), 'dopo l\'ultimo canale');
    assert.ok(prima > q.lastIndexOf(`POST /guilds/${GUILD}/roles`), 'dopo l\'ultimo ruolo');
  } finally { ripulisci(); }
});
