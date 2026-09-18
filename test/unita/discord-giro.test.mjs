// IL GIRO, provato senza Discord e senza Twitch.
//
// La prova che conta piu' di tutte e' la terza: se di una persona NON SAPPIAMO
// se e' abbonata, il suo ruolo dei sub non si tocca. Un silenzio di Twitch letto
// come «no» sarebbe un guasto di lettura che diventa una scrittura su casa di
// qualcun altro — e a quel punto i ruoli li ridai a mano, uno per uno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-dcgiro-');
const { dcRuoli, dcLink, points, watchtime, presenze } = await import('../../src/db.js');
const { giro, datiDi, sappiamo } = await import('../../src/features/discord-giro.js');
process.on('exit', () => usaEGetta.pulisci());

const G = '123456789012345678';        // il server
const BOT = '111111111111111111';      // il bot
const R_BOT = '900000000000000000';    // il ruolo del bot, in alto
const R_SUB = '800000000000000000';    // sotto di lui: si puo' dare
const R_ALTO = '950000000000000000';   // sopra di lui: non si puo'
const DC = '222222222222222222';       // lo spettatore su Discord

const vero = globalThis.fetch;
let scritture = [];

// Un server finto che risponde come risponderebbe Discord. `membro` sono i
// ruoli che la persona ha adesso; `speciali` permette di far rispondere male
// una chiamata precisa.
function discordFinto({ membro = [], ruoli = null, speciali = null } = {}) {
  scritture = [];
  const elenco = ruoli || [
    { id: R_BOT, name: 'SocialBot', position: 9 },
    { id: R_SUB, name: 'Abbonati', position: 3 },
    { id: R_ALTO, name: 'Capi', position: 12 },
  ];
  globalThis.fetch = async (url, opz = {}) => {
    const via = String(url).replace('https://discord.com/api/v10', '');
    const metodo = opz.method || 'GET';
    const s = speciali && speciali(via, metodo);
    if (s) return risposta(s.stato, s.corpo);
    if (metodo === 'GET') {
      if (via === `/guilds/${G}/roles`) return risposta(200, elenco);
      if (via === '/users/@me') return risposta(200, { id: BOT, username: 'SocialBot' });
      if (via === `/guilds/${G}/members/${BOT}`) return risposta(200, { roles: [R_BOT] });
      if (via.startsWith(`/guilds/${G}/members/`)) return risposta(200, { roles: membro, user: { username: 'ludo' } });
      if (via === `/guilds/${G}`) return risposta(200, { id: G, name: 'Casa' });
    }
    scritture.push({ metodo, via });
    return risposta(204, undefined);
  };
}
const risposta = (stato, corpo) => ({
  status: stato, ok: stato >= 200 && stato < 300,
  json: async () => { if (corpo === undefined) throw new Error('niente'); return corpo; },
});
const ripulisci = () => { globalThis.fetch = vero; };

function prepara(canale, regole) {
  dcRuoli.set(canale, { token: 'tok', guild: G, attivo: true, regole });
  dcLink.metti(canale, { login: 'ludo', userId: '77', dcId: DC });
}

test('un fatto che non sappiamo non vale «no»: il ruolo resta dov\'e\'', async () => {
  prepara('nonso', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  discordFinto({ membro: [R_SUB] });
  try {
    const e = await giro('nonso', { quadro: async () => ({}) });   // Twitch muto
    assert.equal(e.tolti, 0, 'non sapere se e\' abbonata non e\' un motivo per spogliarla');
    assert.equal(scritture.length, 0, 'e non si e\' nemmeno provato');
    assert.equal(e.visti, 1);
  } finally { ripulisci(); }
});

test('e quando lo sappiamo, il ruolo si toglie davvero', async () => {
  prepara('so', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  discordFinto({ membro: [R_SUB] });
  try {
    const e = await giro('so', { quadro: async () => ({ sub: new Set() }) });   // sappiamo: non e' abbonata
    assert.equal(e.tolti, 1);
    assert.deepEqual(scritture, [{ metodo: 'DELETE', via: `/guilds/${G}/members/${DC}/roles/${R_SUB}` }]);
  } finally { ripulisci(); }
});

test('si scrive solo la differenza: se e\' gia\' a posto non si chiama nessuno', async () => {
  prepara('fermo', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  discordFinto({ membro: [R_SUB] });
  try {
    const e = await giro('fermo', { quadro: async () => ({ sub: new Set(['ludo']) }) });
    assert.equal(e.dati, 0);
    assert.equal(e.tolti, 0);
    assert.equal(scritture.length, 0);
  } finally { ripulisci(); }
});

test('un ruolo piu\' in alto del bot non si prova nemmeno, e si dice', async () => {
  prepara('alto', [{ tipo: 'sub', ruolo: R_ALTO, soglia: 0 }]);
  discordFinto({ membro: [] });
  try {
    const e = await giro('alto', { quadro: async () => ({ sub: new Set(['ludo']) }) });
    assert.deepEqual(e.bloccati, [R_ALTO]);
    assert.equal(e.dati, 0);
    assert.equal(scritture.length, 0, 'sapevamo gia\' che Discord avrebbe detto di no');
  } finally { ripulisci(); }
});

test('una regola che nomina un ruolo cancellato si scarta, e non tocca niente', async () => {
  prepara('scarto', [{ tipo: 'sub', ruolo: '700000000000000000', soglia: 0 }]);
  discordFinto({ membro: [] });
  try {
    const e = await giro('scarto', { quadro: async () => ({ sub: new Set(['ludo']) }) });
    assert.equal(e.scartate, 1);
    assert.equal(e.visti, 0, 'senza regole valide non si guarda nemmeno la gente');
    assert.equal(scritture.length, 0);
  } finally { ripulisci(); }
});

test('chi non e\' nel server si conta e si va avanti', async () => {
  prepara('fuori', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  discordFinto({ speciali: (via, m) => (m === 'GET' && via === `/guilds/${G}/members/${DC}` ? { stato: 404, corpo: { code: 10007 } } : null) });
  try {
    const e = await giro('fuori', { quadro: async () => ({ sub: new Set(['ludo']) }) });
    assert.equal(e.fuori, 1);
    assert.equal(e.visti, 0);
    assert.equal(scritture.length, 0);
  } finally { ripulisci(); }
});

test('«fammi vedere cosa faresti» conta e non scrive', async () => {
  prepara('prova', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  discordFinto({ membro: [] });
  try {
    const e = await giro('prova', { quadro: async () => ({ sub: new Set(['ludo']) }), prova: true });
    assert.equal(e.dati, 1, 'dice che lo darebbe');
    assert.equal(scritture.length, 0, 'ma non lo da\'');
    assert.deepEqual(dcRuoli.get('prova').ultimo_esito, {}, 'e non si segna come giro fatto');
  } finally { ripulisci(); }
});

test('l\'esito di un giro vero resta scritto nella riga del canale', async () => {
  prepara('esito', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  discordFinto({ membro: [] });
  try {
    await giro('esito', { quadro: async () => ({ sub: new Set(['ludo']) }), pausa: 0 });
    const c = dcRuoli.get('esito');
    assert.equal(c.ultimo_esito.dati, 1);
    assert.ok(c.ultimo_giro > 0);
  } finally { ripulisci(); }
});

test('se Discord chiede una lunga attesa, il giro si ferma invece di insistere', async () => {
  prepara('pieno', [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }]);
  dcLink.metti('pieno', { login: 'altro', dcId: '333333333333333333' });
  discordFinto({ membro: [], speciali: (via, m) => (m === 'PUT' ? { stato: 429, corpo: { retry_after: 120 } } : null) });
  try {
    const e = await giro('pieno', { quadro: async () => ({ sub: new Set(['ludo', 'altro']) }), pausa: 0 });
    assert.equal(e.dati, 0);
    assert.equal(e.visti, 1, 'si e\' fermato alla prima, non ha tirato dritto su tutti');
    assert.equal(e.errori.length, 1);
  } finally { ripulisci(); }
});

test('quello che sappiamo di una persona viene da casa nostra, e lo zero e\' un numero vero', () => {
  points.add('dati', 'ludo', 250);
  watchtime.add('dati', 'ludo', 3 * 3600 + 1800, '');
  presenze.set('dati', 'ludo', { serie: 4, dirette: 11 });
  const d = datiDi('dati', 'LUDO', { mod: new Set(['ludo']) });
  assert.equal(d.monete, 250);
  assert.equal(d.ore, 3, 'tre ore e mezza sono tre ore');
  assert.equal(d.serie, 4);
  assert.equal(d.dirette, 11);
  assert.equal(d.mod, true);
  assert.equal(d.sub, undefined, 'di questo non sappiamo niente, e si vede');
  assert.equal(sappiamo('sub', d), false);
  assert.equal(sappiamo('mod', d), true);
  assert.equal(sappiamo('monete', d), true, 'le monete le sappiamo sempre: zero monete sono zero, non «boh»');
});

test('senza configurazione, o da spento, il giro non parte', async () => {
  assert.equal(await giro('mai-visto', {}), null);
  dcRuoli.set('spento2', { token: 'tok', guild: G, attivo: false, regole: [{ tipo: 'sub', ruolo: R_SUB, soglia: 0 }] });
  assert.equal(await giro('spento2', {}), null);
});
