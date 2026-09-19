// COSTRUIRE UN SERVER SENZA AVERNE UNO.
//
// Qui Discord e' finto, ma finto al punto giusto: non si sostituisce il filo
// con una bugia, si sostituisce la RETE. Le chiamate vere partono davvero,
// passano da `discord-api.js` com'e' scritto, e trovano dall'altra parte un
// server di bugia che pero' si comporta come uno vero — tiene i canali che
// gli crei, li sposta, li cancella.
//
// E' l'unico modo perche' la prova che conta sia onesta: applicare il preset
// DUE VOLTE e vedere che la seconda non fa niente. Con un finto piu' comodo
// (uno che dice sempre «fatto») la seconda passata sembrerebbe funzionare
// anche se raddoppiasse tutto.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/features/discord-costruisci.js';
import { TIPI, improntaDi } from '../../src/features/discord-preset.js';

const GUILD = '900000000000000001';
const BOT = '700000000000000001';
const RUOLO_BOT = '800000000000000001';
const ALTRO = '810000000000000002';
const MANAGE_ROLES = 1n << 28n;
const MANAGE_CHANNELS = 1n << 4n;
const TUTTI = String(MANAGE_ROLES | MANAGE_CHANNELS);
const C1 = '111111111111111111';
const C2 = '222222222222222222';
const C3 = '333333333333333333';
const REGOLE_DC = '444444444444444444';
const AVVISI_DC = '555555555555555555';

const vero = globalThis.fetch;
const ripulisci = () => { globalThis.fetch = vero; };

// Un server di Discord finto ma con la memoria: quello che gli crei resta.
function casa({ canali = [], permessi = TUTTI, guild = {}, dopo = null } = {}) {
  const st = {
    canali: canali.map((c) => ({ topic: '', parent_id: null, permission_overwrites: [], last_message_id: null, ...c })),
    chiamate: [],
    prossimo: 700000000000000000n,
    permessi,
  };
  globalThis.fetch = async (url, opz = {}) => {
    const u = String(url).replace('https://discord.com/api/v10', '');
    const metodo = opz.method || 'GET';
    const corpo = opz.body ? JSON.parse(opz.body) : null;
    st.chiamate.push(metodo + ' ' + u);
    const di = (stato, dati) => ({ status: stato, ok: stato >= 200 && stato < 300, json: async () => dati });
    const forzato = dopo ? dopo(metodo, u, corpo, st) : null;
    if (forzato) return di(forzato.stato, forzato.corpo);

    if (metodo === 'GET' && u === `/guilds/${GUILD}`) return di(200, { id: GUILD, name: 'Casa', features: [], ...guild });
    if (metodo === 'GET' && u === '/users/@me') return di(200, { id: BOT, username: 'SocialBot' });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/members/${BOT}`) return di(200, { roles: [RUOLO_BOT] });
    if (metodo === 'GET' && u === `/guilds/${GUILD}/roles`) {
      return di(200, [
        { id: GUILD, name: '@everyone', position: 0, permissions: '0' },
        { id: RUOLO_BOT, name: 'SocialBot', position: 9, permissions: st.permessi, managed: true },
        { id: ALTRO, name: 'Staff', position: 5, permissions: '0' },
      ]);
    }
    if (metodo === 'GET' && u === `/guilds/${GUILD}/channels`) return di(200, st.canali);
    if (metodo === 'POST' && u === `/guilds/${GUILD}/channels`) {
      const c = {
        id: String(st.prossimo += 1n), name: corpo.name, type: corpo.type,
        parent_id: corpo.parent_id || null, topic: corpo.topic || '',
        permission_overwrites: corpo.permission_overwrites || [], last_message_id: null,
      };
      st.canali.push(c);
      return di(201, c);
    }
    const p = /^\/channels\/(\d+)$/.exec(u);
    if (p) {
      const i = st.canali.findIndex((c) => c.id === p[1]);
      if (i < 0) return di(404, { message: 'Unknown Channel' });
      if (metodo === 'DELETE') { st.canali.splice(i, 1); return di(204, null); }
      if (metodo === 'PATCH') {
        const c = st.canali[i];
        if (corpo.name !== undefined) c.name = corpo.name;
        if (corpo.topic !== undefined) c.topic = corpo.topic;
        if (corpo.parent_id !== undefined) c.parent_id = corpo.parent_id;
        if (corpo.permission_overwrites !== undefined) c.permission_overwrites = corpo.permission_overwrites;
        return di(200, c);
      }
    }
    return di(404, { message: 'boh' });
  };
  return st;
}

const PRESET = {
  categorie: [
    { nome: 'Benvenuto', canali: [{ nome: 'regole' }, { nome: 'annunci' }] },
    { nome: 'Chiacchiere', canali: [{ nome: 'generale' }, { nome: 'Salotto', tipo: 'voce' }] },
  ],
};
const opz = (x = {}) => ({ pausa: 0, ...x });

test('un server vuoto diventa il preset, e la seconda volta non succede niente', async () => {
  const st = casa();
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz());
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.creati, 6, 'due categorie e quattro canali');
    assert.equal(a.errori.length, 0);
    assert.equal(a.fermo, '');

    const b = await C.applica('tok', GUILD, PRESET, opz());
    assert.equal(b.niente, true, 'la seconda passata non ha niente da fare');
    assert.equal(b.creati, 0);
    assert.equal(st.canali.length, 6, 'e soprattutto non ha creato doppioni');
  } finally { ripulisci(); }
});

test('le categorie nascono prima dei canali, sennò i canali nascerebbero fuori da tutto', async () => {
  const st = casa();
  try {
    await C.applica('tok', GUILD, PRESET, opz());
    const tipi = st.canali.map((c) => c.type);
    assert.deepEqual(tipi.slice(0, 2), [TIPI.categoria, TIPI.categoria], 'prima le due categorie');
    const perNome = new Map(st.canali.map((c) => [c.name, c]));
    const benvenuto = perNome.get('Benvenuto').id;
    const chiacchiere = perNome.get('Chiacchiere').id;
    assert.equal(perNome.get('regole').parent_id, benvenuto);
    assert.equal(perNome.get('annunci').parent_id, benvenuto);
    assert.equal(perNome.get('generale').parent_id, chiacchiere);
    assert.equal(perNome.get('Salotto').parent_id, chiacchiere, 'anche il vocale finisce dentro');
  } finally { ripulisci(); }
});

test('senza «Gestire i canali» non si comincia nemmeno, e lo si dice con la cura', async () => {
  const st = casa({ permessi: String(MANAGE_ROLES) });
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz());
    assert.equal(a.ok, false);
    assert.equal(a.reinvito, true, 'la cura e\' ripassare dal tasto dell\'invito');
    assert.match(a.errore, /Gestire i canali/);
    assert.equal(st.canali.length, 0, 'e non si e\' provato lo stesso a scrivere');
    assert.ok(!st.chiamate.some((c) => c.startsWith('POST')), st.chiamate.join(' · '));
  } finally { ripulisci(); }
});

test('chi e\' amministratore puo\' tutto, e non serve che lo elenchi', async () => {
  casa({ permessi: String(1n << 3n) });
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz());
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.creati, 6);
  } finally { ripulisci(); }
});

test('se il server cambia fra il «guarda» e il «fallo», ci si ferma e non si tocca niente', async () => {
  const st = casa();
  try {
    const guardo = await C.anteprima('tok', GUILD, PRESET, { togliere: true });
    assert.equal(guardo.ok, true);
    // qualcuno, nel frattempo, crea una categoria del preset a mano
    st.canali.push({ id: C1, name: 'Benvenuto', type: TIPI.categoria, parent_id: null, topic: '', permission_overwrites: [], last_message_id: null });
    const a = await C.applica('tok', GUILD, PRESET, opz({ togliere: true, impronta: guardo.impronta }));
    assert.equal(a.ok, false);
    assert.equal(a.cambiato, true);
    assert.notEqual(a.impronta, guardo.impronta, 'e torna l\'impronta nuova, cosi\' si puo\' riguardare');
    assert.equal(st.canali.length, 1, 'non e\' stato creato niente sulla fiducia');
    assert.ok(a.differenza, 'e si rimostra cosa succederebbe adesso');
  } finally { ripulisci(); }
});

test('l\'impronta e\' di quello che si FA, non di quando lo si e\' guardato', async () => {
  const st = casa();
  try {
    const uno = await C.anteprima('tok', GUILD, PRESET, { togliere: true });
    const due = await C.anteprima('tok', GUILD, PRESET, { togliere: true });
    assert.equal(uno.impronta, due.impronta, 'guardare due volte la stessa cosa da\' la stessa impronta');
    const a = await C.applica('tok', GUILD, PRESET, opz({ togliere: true, impronta: uno.impronta }));
    assert.equal(a.ok, true, a.errore);
    assert.equal(st.canali.length, 6);
  } finally { ripulisci(); }
});

test('il modo normale non cancella niente, nemmeno quello che il preset non nomina', async () => {
  const st = casa({ canali: [
    { id: C1, name: 'vecchio-canale', type: TIPI.testo },
    { id: C2, name: 'Roba Mia', type: TIPI.categoria },
  ] });
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz());
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.tolti, 0);
    assert.ok(!st.chiamate.some((c) => c.startsWith('DELETE')), 'nel modo normale la parola DELETE non esce proprio');
    assert.ok(st.canali.some((c) => c.id === C1), 'il canale di prima e\' ancora li\'');
  } finally { ripulisci(); }
});

test('il modo distruttivo toglie prima i canali e poi le categorie, per non lasciare orfani', async () => {
  const st = casa({ canali: [
    { id: C1, name: 'Roba Mia', type: TIPI.categoria },
    { id: C2, name: 'vecchio', type: TIPI.testo, parent_id: C1 },
    { id: C3, name: 'altro', type: TIPI.testo, parent_id: C1 },
  ] });
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz({ togliere: true }));
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.tolti, 3);
    const cancellati = st.chiamate.filter((c) => c.startsWith('DELETE')).map((c) => c.split('/').pop());
    assert.deepEqual(cancellati.slice(-1), [C1], 'la categoria va per ultima');
    assert.equal(st.canali.length, 6, 'e resta esattamente il preset');
  } finally { ripulisci(); }
});

test('quando Discord dice di aspettare a lungo, il giro si ferma e lo dice', async () => {
  let fatte = 0;
  const st = casa({ dopo: (metodo) => {
    if (metodo !== 'POST') return null;
    fatte++;
    return fatte > 2 ? { stato: 429, corpo: { retry_after: 30 } } : null;
  } });
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz());
    assert.equal(a.ok, true);
    assert.equal(a.fermo, 'attesa', 'non si insiste contro un limite dichiarato');
    assert.equal(a.creati, 2);
    assert.ok(a.fatte < 6, 'e si smette davvero, non si arriva in fondo lo stesso');
    assert.equal(st.canali.length, 2);
  } finally { ripulisci(); }
});

test('il limite delle mosse non tronca in silenzio: si vede che ci si e\' fermati', async () => {
  casa();
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz({ max: 3 }));
    assert.equal(a.fermo, 'limite');
    assert.equal(a.fatte, 3);
  } finally { ripulisci(); }
});

test('i permessi si mandano FUSI con quelli che c\'erano, non al posto loro', async () => {
  // Discord, quando gli mandi l'elenco dei permessi, sostituisce quello che
  // c'era. Mandargli solo quelli del preset cancellerebbe il permesso che lo
  // streamer aveva messo a mano per un altro ruolo.
  const st = casa({ canali: [
    { id: C1, name: 'Riservato', type: TIPI.categoria },
    { id: C2, name: 'staff', type: TIPI.testo, parent_id: C1,
      permission_overwrites: [{ id: ALTRO, type: 0, allow: '2048', deny: '0' }] },
  ] });
  try {
    const a = await C.applica('tok', GUILD, {
      categorie: [{ nome: 'Riservato', canali: [{ nome: 'staff', permessi: [{ chi: 'tutti', nega: ['vedere'] }] }] }],
    }, opz());
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.sistemati, 1);
    const ow = st.canali.find((c) => c.id === C2).permission_overwrites;
    const ids = ow.map((o) => o.id).sort();
    assert.deepEqual(ids, [ALTRO, GUILD].sort(), 'restano tutti e due: quello di prima e quello nuovo');
    assert.equal(ow.find((o) => o.id === GUILD).deny, '1024');
    assert.equal(ow.find((o) => o.id === ALTRO).allow, '2048', 'quello di prima non si tocca');
  } finally { ripulisci(); }
});

test('un canale non finisce fuori da tutto quando la sua categoria non si e\' potuta creare', async () => {
  // Il canale c'e' gia' ma sta fuori; la categoria dove dovrebbe andare non si
  // crea. Spostarlo «da qualche parte» lo farebbe sparire dalla vista: meglio
  // lasciarlo dov'e', che e' sbagliato in un modo che si vede.
  const st = casa({
    canali: [{ id: C2, name: 'generale', type: TIPI.testo, parent_id: null }],
    dopo: (metodo, u, corpo) => (metodo === 'POST' && corpo?.type === TIPI.categoria
      ? { stato: 403, corpo: { code: 50013 } } : null),
  });
  try {
    const a = await C.applica('tok', GUILD, { categorie: [{ nome: 'Chiacchiere', canali: [{ nome: 'generale' }] }] }, opz());
    assert.equal(a.ok, true);
    assert.equal(a.sistemati, 0, 'non lo si sposta senza sapere dove');
    assert.equal(st.canali.find((c) => c.id === C2).parent_id, null, 'ed e\' rimasto dov\'era');
    assert.ok(a.errori.length, 'ma il motivo si dice');
  } finally { ripulisci(); }
});

test('un canale trascinato fuori dalla sua categoria si rimette dentro, non si duplica', async () => {
  const st = casa({ canali: [
    { id: C1, name: 'Chiacchiere', type: TIPI.categoria },
    { id: C2, name: 'generale', type: TIPI.testo, parent_id: null },
  ] });
  try {
    const a = await C.applica('tok', GUILD, { categorie: [{ nome: 'Chiacchiere', canali: [{ nome: 'generale' }] }] }, opz());
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.creati, 0, 'non ne nasce un secondo');
    assert.equal(a.sistemati, 1);
    assert.equal(st.canali.find((c) => c.id === C2).parent_id, C1);
  } finally { ripulisci(); }
});

test('l\'anteprima e l\'impronta si calcolano senza scrivere una riga', async () => {
  const st = casa({ canali: [{ id: C1, name: 'vecchio', type: TIPI.testo }] });
  try {
    const g = await C.anteprima('tok', GUILD, PRESET, { togliere: true });
    assert.equal(g.ok, true);
    assert.equal(g.vuota, false);
    assert.equal(g.impronta, improntaDi(g.differenza));
    assert.equal(g.differenza.togli.length, 1);
    assert.ok(!st.chiamate.some((c) => /POST|PATCH|DELETE/.test(c)), 'guardare non scrive: ' + st.chiamate.join(' · '));
  } finally { ripulisci(); }
});

test('i canali che Discord gestisce da se\' non si toccano nemmeno nel modo distruttivo', async () => {
  const st = casa({
    canali: [{ id: REGOLE_DC, name: 'regolamento', type: TIPI.testo }, { id: AVVISI_DC, name: 'moderatori', type: TIPI.testo }],
    guild: { rules_channel_id: REGOLE_DC, public_updates_channel_id: AVVISI_DC, features: ['COMMUNITY'] },
  });
  try {
    const a = await C.applica('tok', GUILD, PRESET, opz({ togliere: true }));
    assert.equal(a.ok, true, a.errore);
    assert.equal(a.tolti, 0);
    assert.ok(st.canali.some((c) => c.id === REGOLE_DC), 'il canale delle regole di Discord resta');
    assert.ok(st.canali.some((c) => c.id === AVVISI_DC));
  } finally { ripulisci(); }
});

test('cosa resta fuori dal preset si sa anche quando non si tocca niente', async () => {
  // E' la frase che serve a decidere: «il tuo server ha due cose che questo
  // preset non prevede». Saperlo non e' un'offerta di cancellarle.
  const st = casa({ canali: [
    { id: C1, name: 'roba-vecchia', type: TIPI.testo },
    { id: C2, name: 'Altra Roba', type: TIPI.categoria },
  ] });
  try {
    const avanti = await C.anteprima('tok', GUILD, PRESET, { togliere: false });
    assert.equal(avanti.fuori.length, 2, 'si vedono lo stesso');
    assert.deepEqual(avanti.differenza.togli, [], 'ma non sono fra le cose da fare');

    // e l'impronta di «vado avanti» non e' quella di «faccio piazza pulita»:
    // sennò una conferma data per una cosa varrebbe per l'altra
    const pulizia = await C.anteprima('tok', GUILD, PRESET, { togliere: true });
    assert.notEqual(avanti.impronta, pulizia.impronta);

    await C.applica('tok', GUILD, PRESET, opz({ impronta: avanti.impronta }));
    assert.ok(st.canali.some((c) => c.id === C1), 'e andando avanti non si e\' cancellato niente');
    assert.ok(!st.chiamate.some((c) => c.startsWith('DELETE')));
  } finally { ripulisci(); }
});
