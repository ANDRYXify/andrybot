// I NOMI DIVENTANO ID QUANDO LE COSE ESISTONO.
//
// La traccia nomina i canali e i ruoli della porta d'ingresso per NOME, perche'
// li sta creando lei nello stesso giro: un id scritto li' sarebbe l'id di un
// canale che non c'e'. Il momento in cui quei nomi diventano id e' uno solo —
// dopo aver creato canali e ruoli, prima di cancellare niente — e questo
// collaudo guarda proprio quello, con un Discord finto che ricorda cosa gli
// hai creato e quali id gli ha dato.
//
// I difetti che non devono poter esistere:
//  · un canale nato in questo giro deve finire nella porta col suo id vero;
//  · un nome che non si risolve cade e SI DICE, invece di diventare un id a caso;
//  · se Discord direbbe di no, non si chiama: si dice perche';
//  · applicare due volte non deve riscrivere la porta, perche' riscriverla
//    cancella le risposte che le persone hanno gia' dato.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/features/discord-costruisci.js';
import * as api from '../../src/features/discord-api.js';

const GUILD = '900000000000000001';
const BOT = '700000000000000001';
const RUOLO_BOT = '800000000000000001';
const vero = globalThis.fetch;
const ripulisci = () => { globalThis.fetch = vero; };

// Un Discord finto con la memoria, compresa la porta d'ingresso.
function casa({ features = ['COMMUNITY'], canali = [], porta = null, benvenuto = null } = {}) {
  const st = {
    canali: canali.map((c) => ({ topic: '', parent_id: null, permission_overwrites: [], last_message_id: null, ...c })),
    ruoli: [], chiamate: [], corpi: [], prossimo: 700000000000000000n,
    porta: porta || { enabled: false, mode: 0, default_channel_ids: [], prompts: [] },
    benvenuto: benvenuto || { description: '', welcome_channels: [] },
  };
  globalThis.fetch = async (url, opz = {}) => {
    const u = String(url).replace('https://discord.com/api/v10', '');
    const metodo = opz.method || 'GET';
    const corpo = opz.body ? JSON.parse(opz.body) : null;
    st.chiamate.push(metodo + ' ' + u);
    if (corpo) st.corpi.push({ via: metodo + ' ' + u, corpo });
    const di = (stato, dati) => ({ status: stato, ok: stato >= 200 && stato < 300, json: async () => dati });

    if (metodo === 'GET' && u === `/guilds/${GUILD}`) return di(200, { id: GUILD, name: 'Casa', features });
    if (metodo === 'GET' && u === '/users/@me') return di(200, { id: BOT, username: 'SocialBot' });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/members/${BOT}`) return di(200, { roles: [RUOLO_BOT] });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/roles`) {
      return di(200, [
        { id: GUILD, name: '@everyone', position: 0, permissions: String((1n << 10n) | (1n << 11n)) },
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
        parent_id: corpo.parent_id || null, topic: corpo.topic || '',
        permission_overwrites: corpo.permission_overwrites || [], last_message_id: null };
      st.canali.push(c);
      return di(201, c);
    }
    if (u === `/guilds/${GUILD}/onboarding`) {
      if (metodo === 'PUT') { st.porta = corpo; return di(200, corpo); }
      return di(200, st.porta);
    }
    if (u === `/guilds/${GUILD}/welcome-screen`) {
      if (metodo === 'PATCH') { st.benvenuto = { ...st.benvenuto, ...corpo }; return di(200, st.benvenuto); }
      return di(200, st.benvenuto);
    }
    const p = /^\/channels\/(\d+)$/.exec(u);
    if (p && metodo === 'PATCH') {
      const c = st.canali.find((x) => x.id === p[1]);
      if (c && corpo.permission_overwrites !== undefined) c.permission_overwrites = corpo.permission_overwrites;
      return di(200, c || {});
    }
    return di(404, { message: 'boh' });
  };
  return st;
}

const SETTE = ['generale', 'giochi', 'musica', 'foto', 'aiuto', 'off-topic', 'annunci'];
const TRACCIA = {
  ruoli: [{ nome: 'Giocatori' }],
  categorie: [{ nome: 'Chiacchiere', canali: SETTE.map((n) => ({ nome: n })) }],
  ingresso: {
    acceso: true,
    canaliDiPartenza: SETTE,
    benvenuto: { testo: 'Casa di chi guarda le mie dirette.', canali: [{ canale: 'generale', testo: 'si parla qui', emoji: '👋' }] },
    domande: [{ titolo: 'Cosa ti interessa?', risposte: [
      { titolo: 'I giochi', canali: ['giochi'], ruoli: ['Giocatori'] },
      { titolo: 'La musica', canali: ['musica'] },
    ] }],
  },
};
const opz = (x = {}) => ({ pausa: 0, ...x });
const ultimo = (st, via) => [...st.corpi].reverse().find((c) => c.via === via)?.corpo || null;

test('i canali nati adesso finiscono nella porta col loro id vero', async () => {
  const st = casa();
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(e.ok, true, e.errore);
    assert.equal(e.ingressoSistemato, 2, 'la schermata e le domande');
    assert.deepEqual(e.ingressoPersi, [], 'nessun nome perso per strada');

    const perNome = new Map(st.canali.map((c) => [c.name, c.id]));
    const p = ultimo(st, `PUT /guilds/${GUILD}/onboarding`);
    assert.ok(p, 'la porta e\' stata scritta');
    assert.equal(p.enabled, true);
    assert.equal(p.mode, 1, 'con le domande contano anche i canali che aprono');
    assert.deepEqual([...p.default_channel_ids].sort(), SETTE.map((n) => perNome.get(n)).sort());
    assert.deepEqual(p.prompts[0].options[0].channel_ids, [perNome.get('giochi')]);
    assert.deepEqual(p.prompts[0].options[0].role_ids, [st.ruoli.find((r) => r.name === 'Giocatori').id],
      'anche il ruolo nato in questo giro');
    assert.deepEqual(p.prompts[0].options[1].channel_ids, [perNome.get('musica')]);

    const b = ultimo(st, `PATCH /guilds/${GUILD}/welcome-screen`);
    assert.equal(b.description, 'Casa di chi guarda le mie dirette.');
    assert.deepEqual(b.welcome_channels, [{ channel_id: perNome.get('generale'), description: 'si parla qui', emoji_name: '👋', emoji_id: null }]);
  } finally { ripulisci(); }
});

test('la porta si scrive dopo i canali e i ruoli, e prima di cancellare', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, TRACCIA, opz());
    const q = st.chiamate;
    const porta = q.indexOf(`PUT /guilds/${GUILD}/onboarding`);
    assert.ok(porta > q.lastIndexOf(`POST /guilds/${GUILD}/channels`), 'dopo l\'ultimo canale');
    assert.ok(porta > q.lastIndexOf(`POST /guilds/${GUILD}/roles`), 'dopo l\'ultimo ruolo');
  } finally { ripulisci(); }
});

test('la seconda volta la porta non si riscrive', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, TRACCIA, opz());
    const quante = st.chiamate.filter((c) => c.startsWith('PUT')).length;
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(st.chiamate.filter((c) => c.startsWith('PUT')).length, quante,
      'riscriverla cancellerebbe le risposte che le persone hanno gia\' dato');
    assert.equal(e.niente, true, 'e non c\'e\' proprio niente da fare');
  } finally { ripulisci(); }
});

test('un nome che non si risolve cade, e si dice quale', async () => {
  const st = casa();
  const traccia = { ...TRACCIA, ingresso: { ...TRACCIA.ingresso,
    domande: [{ titolo: 'Cosa ti interessa?', risposte: [
      { titolo: 'I giochi', canali: ['giochi', 'un-canale-che-non-esiste'], ruoli: ['Un Ruolo Fantasma'] },
    ] }] } };
  try {
    const e = await C.applica('tok', GUILD, traccia, opz());
    assert.deepEqual(e.ingressoPersi.sort(), ['Un Ruolo Fantasma', 'un-canale-che-non-esiste']);
    const p = ultimo(st, `PUT /guilds/${GUILD}/onboarding`);
    assert.equal(p.prompts[0].options[0].channel_ids.length, 1, 'passa solo quello vero');
    assert.deepEqual(p.prompts[0].options[0].role_ids, [], 'e nessun id inventato');
  } finally { ripulisci(); }
});

test('senza Community non si chiama, e il motivo arriva fra gli inciampi', async () => {
  const st = casa({ features: [] });
  try {
    const e = await C.applica('tok', GUILD, TRACCIA, opz());
    assert.equal(e.ok, true, 'il resto della costruzione va avanti');
    assert.ok(e.creati > 0, 'i canali nascono lo stesso');
    assert.equal(e.ingressoSistemato, 0);
    assert.ok(!st.chiamate.some((c) => c.includes('onboarding') && c.startsWith('PUT')));
    assert.ok(!st.chiamate.some((c) => c.includes('welcome-screen') && c.startsWith('PATCH')));
    assert.ok(e.errori.some((x) => /Community/.test(x)), e.errori.join(' · '));
  } finally { ripulisci(); }
});

test('con pochi canali si dice il conto, e non si prova ad accendere', async () => {
  const st = casa();
  const traccia = { categorie: [{ nome: 'Chiacchiere', canali: [{ nome: 'generale' }] }],
    ingresso: { acceso: true, canaliDiPartenza: ['generale'] } };
  try {
    const e = await C.applica('tok', GUILD, traccia, opz());
    assert.equal(e.ingressoSistemato, 0);
    assert.ok(!st.chiamate.some((c) => c.startsWith('PUT')));
    assert.ok(e.errori.some((x) => /almeno 7/.test(x)), e.errori.join(' · '));
  } finally { ripulisci(); }
});

test('una traccia che non parla di ingresso non chiede niente a Discord', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, { categorie: [{ nome: 'Chiacchiere', canali: [{ nome: 'generale' }] }] }, opz());
    assert.ok(!st.chiamate.some((c) => c.includes('onboarding')), 'nemmeno per leggerla');
    assert.ok(!st.chiamate.some((c) => c.includes('welcome-screen')));
  } finally { ripulisci(); }
});
