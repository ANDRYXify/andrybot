// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// TITOLO E CATEGORIA SU KICK (src/kick/api.js, docs/PIATTAFORME.md «Titolo e
// categoria su Kick»), con le chiamate nella forma di docs.kick.com:
//  · cambiare: PATCH /public/v1/channels con stream_title e category_id
//    (intero), permesso channel:write, risposta 204;
//  · cercare la categoria: GET /public/v1/categories?q=, e se Kick non la da'
//    piu', GET /public/v2/categories?name= (che vuole almeno tre lettere);
//  · senza channel:write non si chiama niente, e l'errore ha la forma di helix
//    (.status 403), cosi' chi cambia il canale non sa con chi parla;
//  · il motore dei moduli chiede alla piattaforma da cui si scrive; timer,
//    voce, API, Telegram e prova a tutte quelle del canale: la sua, e Kick su
//    un canale di Twitch se lo streamer l'ha collegato; YouTube a nessuno;
//  · un esito per piattaforma: una dice di no, l'altra cambia lo stesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-titolo-');
const K = await import('../../src/kick/api.js');
const { SCOPE } = await import('../../src/kick/auth.js');
const { risolviCategoria } = await import('../../src/features/categoria.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
process.on('exit', () => casa.pulisci());

const TOK = (scopes) => ({ accessToken: 'tok', refreshToken: '', scopes, expiresAt: Date.now() + 3_600_000 });
const conCanale = (login) => K.salvaToken(login, TOK(SCOPE), '123');
const senzaCanale = (login) => K.salvaToken(login, TOK(SCOPE.filter((s) => s !== 'channel:write')), '123');
function rete(risposte = [[204, null]]) {
  const chiamate = [];
  const fetchImpl = async (url, o = {}) => {
    chiamate.push({ url: String(url), metodo: o.method, corpo: o.body ? JSON.parse(o.body) : null });
    const [stato, corpo] = risposte[Math.min(chiamate.length - 1, risposte.length - 1)];
    return new Response(stato === 204 ? null : JSON.stringify(corpo), { status: stato });
  };
  return { chiamate, fetchImpl };
}

test('il collegamento di Kick chiede channel:write, e solo chi ce l\'ha puo\' cambiare il canale', () => {
  assert.ok(SCOPE.includes('channel:write'));
  conCanale('kick.uno');
  senzaCanale('kick.due');
  assert.equal(K.puoCambiareCanale('kick.uno'), true);
  assert.equal(K.puoCambiareCanale('KICK.UNO'), true, 'il login si legge in minuscolo');
  assert.equal(K.puoCambiareCanale('kick.due'), false);
  assert.equal(K.puoCambiareCanale('kick.nessuno'), false);
});

test('titolo e categoria con la chiamata di Kick: PATCH /channels, titolo fino a 140, categoria intera', async () => {
  conCanale('kick.tre');
  const r = rete();
  assert.deepEqual(await K.cambiaCanale('kick.tre', { titolo: '  Si gioca  ', categoria: '42' }, r), { ok: true });
  assert.deepEqual([r.chiamate[0].metodo, r.chiamate[0].url], ['PATCH', 'https://api.kick.com/public/v1/channels']);
  assert.deepEqual(r.chiamate[0].corpo, { stream_title: 'Si gioca', category_id: 42 });
  await K.cambiaCanale('kick.tre', { titolo: 'x'.repeat(300) }, r);
  assert.deepEqual(r.chiamate[1].corpo, { stream_title: 'x'.repeat(140) }, 'senza categoria non si manda la categoria');
  await K.cambiaCanale('kick.tre', { categoria: 7 }, r);
  assert.deepEqual(r.chiamate[2].corpo, { category_id: 7 }, 'senza titolo non si tocca il titolo');
  assert.deepEqual(await K.cambiaCanale('kick.tre', { titolo: '   ', categoria: 'fortnite' }, r), { ok: false, motivo: 'dati mancanti' });
  assert.equal(r.chiamate.length, 3, 'una categoria che non e\' un id non parte');
});

test('senza channel:write non si chiama Kick; gli errori di Kick hanno le parole di helix', async () => {
  senzaCanale('kick.quattro');
  const r = rete();
  assert.deepEqual(await K.cambiaCanale('kick.quattro', { titolo: 'ciao' }, r), { ok: false, stato: 403, motivo: 'permesso mancante' });
  assert.equal(r.chiamate.length, 0);
  conCanale('kick.cinque');
  assert.deepEqual(await K.cambiaCanale('kick.cinque', { titolo: 'ciao' }, rete([[403, { message: 'no' }]])), { ok: false, stato: 403, motivo: 'permesso mancante' });
  assert.deepEqual(await K.cambiaCanale('kick.cinque', { titolo: 'ciao' }, rete([[429, { message: 'piano' }]])), { ok: false, stato: 429, motivo: 'troppe richieste' });
});

test('la ricerca delle categorie: prima la v1, poi la v2 per nome; le categorie tornano come quelle di Twitch', async () => {
  conCanale('kick.sei');
  const v1 = rete([[200, { data: [{ id: 101, name: 'Fortnite', thumbnail: 'x' }, { id: null, name: 'senza id' }, { id: 5 }] }]]);
  assert.deepEqual(await K.cercaCategorie('kick.sei', ' fortnite ', v1), [{ id: '101', name: 'Fortnite' }]);
  assert.equal(v1.chiamate.length, 1);
  assert.equal(v1.chiamate[0].url, 'https://api.kick.com/public/v1/categories?q=fortnite');
  const v2 = rete([[404, { message: 'gone' }], [200, { data: [{ id: 202, name: 'Elden Ring' }] }]]);
  assert.deepEqual(await K.cercaCategorie('kick.sei', 'elden', v2), [{ id: '202', name: 'Elden Ring' }]);
  assert.equal(v2.chiamate[1].url, 'https://api.kick.com/public/v2/categories?name=elden');
  const corta = rete([[404, { message: 'gone' }]]);
  assert.deepEqual(await K.cercaCategorie('kick.sei', 'fo', corta), []);
  assert.equal(corta.chiamate.length, 1, 'la v2 vuole almeno tre lettere: non si chiede');
  const vuota = rete();
  assert.deepEqual(await K.cercaCategorie('kick.sei', '   ', vuota), []);
  assert.equal(vuota.chiamate.length, 0);
});

test('canaleKick ha la forma di helix: risolviCategoria e setChannelInfo non sanno con chi parlano', async () => {
  conCanale('kick.sette');
  const r = rete([[200, { data: [{ id: 101, name: 'Fortnite' }] }], [204, null]]);
  const c = K.canaleKick('kick.sette', r);
  assert.equal(c.piattaforma, 'kick');
  assert.ok(Object.isFrozen(c));
  assert.equal(c.collegato, true, 'Kick collegato');
  assert.equal(K.canaleKick('mai.collegato').collegato, false, 'senza token, non collegato');
  const cat = await risolviCategoria(c, 'fortnite');
  assert.equal(cat?.name, 'Fortnite');
  assert.equal(await c.setChannelInfo('kick.sette', { gameId: cat.id }), true);
  assert.deepEqual(r.chiamate.at(-1), { url: 'https://api.kick.com/public/v1/channels', metodo: 'PATCH', corpo: { category_id: 101 } });
  senzaCanale('kick.otto');
  await assert.rejects(K.canaleKick('kick.otto', rete()).setChannelInfo('kick.otto', { title: 'x' }),
    (e) => e.status === 403, 'senza permesso, l\'errore di helix: .status 403');
});

// --- il motore dei moduli: chi cambia il canale --------------------------------

// collegati: i canali di Twitch che hanno collegato anche Kick. nomi: il nome
// della categoria su ciascuna piattaforma; nega: chi risponde 403.
function motore({ collegati = [], nomi = {}, nega = [] } = {}) {
  const fatti = [];
  const finto = (dove, collegato = true) => ({
    collegato,
    searchCategories: async () => [{ id: dove === 'kick' ? '77' : '9', name: nomi[dove] || 'Fortnite' }],
    setChannelInfo: async (canale, patch) => {
      if (nega.includes(dove)) throw Object.assign(new Error('permesso mancante'), { status: 403 });
      fatti.push([dove, canale, patch]);
      return true;
    },
  });
  const chiesti = [];
  const m = new ModulesEngine({ helix: finto('twitch'), canali: { kick: (canale) => { chiesti.push(canale); return finto('kick', canale.startsWith('kick.') || collegati.includes(canale)); } } });
  return { m, fatti, chiesti };
}
const titolo = { id: 1, attivo: true, trigger: { tipo: 'comando', comando: 'titolo' }, azioni: [{ tipo: 'titolo', testo: 'Nuovo titolo', annuncia: true }] };
const categoria = { id: 2, attivo: true, trigger: { tipo: 'comando', comando: 'categoria' }, azioni: [{ tipo: 'categoria', gioco: 'fortnite', annuncia: true }] };
const ctx = (extra = {}) => ({ channel: 'canale', user: 'Mod', userLogin: 'mod', userId: '42', display: 'Mod', args: [], argsRaw: '', _livello: 3, staff: true, _vars: {}, ...extra });
const esegui = (m, modulo, c, detto = []) => m.esegui(modulo, c, (t) => detto.push(t), { saltaCondizioni: true });

test('un comando scritto su Kick cambia Kick, uno scritto su Twitch cambia Twitch', async () => {
  const { m, fatti, chiesti } = motore();
  const detto = [];
  await esegui(m, titolo, ctx({ piattaforma: 'kick' }), detto);
  await esegui(m, categoria, ctx({ piattaforma: 'kick' }), detto);
  await esegui(m, titolo, ctx({ piattaforma: 'twitch' }), detto);
  assert.deepEqual(fatti, [
    ['kick', 'canale', { title: 'Nuovo titolo' }],
    ['kick', 'canale', { gameId: '77' }],
    ['twitch', 'canale', { title: 'Nuovo titolo' }],
  ]);
  assert.deepEqual(chiesti, ['canale', 'canale'], 'il canale di Kick si chiede per il canale nostro');
  assert.deepEqual(detto, ['📝 Titolo aggiornato: Nuovo titolo', '🎮 Categoria aggiornata: Fortnite', '📝 Titolo aggiornato: Nuovo titolo']);
});

test('timer, voce, API e Telegram valgono per il canale: un canale nato su Kick non chiede a Twitch, uno di Twitch senza Kick non chiede a Kick', async () => {
  const { m, fatti } = motore();
  await esegui(m, titolo, ctx({ channel: 'kick.nato' }));
  await esegui(m, titolo, ctx({ channel: 'canaletwitch' }));
  assert.deepEqual(fatti.map((f) => f.slice(0, 2)), [['kick', 'kick.nato'], ['twitch', 'canaletwitch']]);
});

test('su un canale di Twitch con Kick collegato, quello che non arriva da una chat cambia tutte e due; la chat cambia la sua', async () => {
  const { m, fatti } = motore({ collegati: ['canale'] });
  const detto = [];
  await esegui(m, titolo, ctx(), detto);
  await esegui(m, categoria, ctx(), detto);
  assert.deepEqual(fatti, [
    ['twitch', 'canale', { title: 'Nuovo titolo' }], ['kick', 'canale', { title: 'Nuovo titolo' }],
    ['twitch', 'canale', { gameId: '9' }], ['kick', 'canale', { gameId: '77' }],
  ], 'su Kick la categoria e\' quella di Kick, con il suo id');
  assert.deepEqual(detto, ['📝 Titolo aggiornato: Nuovo titolo', '🎮 Categoria aggiornata: Fortnite'], 'riuscito ovunque: una riga, come sempre');
  fatti.length = 0;
  await esegui(m, titolo, ctx({ piattaforma: 'twitch' }));
  await esegui(m, titolo, ctx({ piattaforma: 'kick' }));
  assert.deepEqual(fatti.map((f) => f[0]), ['twitch', 'kick'], 'da una chat, solo la sua piattaforma');
  fatti.length = 0;
  await m.espandi('$titolo(Da un timer)', ctx());
  assert.deepEqual(fatti.map((f) => f[0]), ['twitch', 'kick'], 'le azioni in linea con la stessa regola');
});

test('un esito per piattaforma: una dice di no e l\'altra cambia lo stesso; dove serve si dice dove', async () => {
  const detto = [];
  const a = motore({ collegati: ['canale'], nega: ['kick'] });
  await esegui(a.m, titolo, ctx(), detto);
  assert.deepEqual(a.fatti.map((f) => f[0]), ['twitch'], 'il no di Kick non ferma Twitch');
  assert.equal(detto[0], '📝 Titolo aggiornato: Nuovo titolo (su Twitch)');
  assert.match(detto[1], /permesso di Kick/, 'col rimedio di Kick');
  assert.equal(detto.length, 2);
  detto.length = 0;
  const b = motore({ collegati: ['canale'], nomi: { kick: 'Fortnite: Battle Royale' } });
  await esegui(b.m, categoria, ctx(), detto);
  assert.deepEqual(detto, ['🎮 Categoria aggiornata: Fortnite su Twitch, Fortnite: Battle Royale su Kick']);
  detto.length = 0;
  const c = new ModulesEngine({
    helix: { searchCategories: async () => [], setChannelInfo: async () => true },
    canali: { kick: () => ({ collegato: true, searchCategories: async () => [{ id: '77', name: 'Fortnite' }], setChannelInfo: async () => true }) },
  });
  await esegui(c, categoria, ctx(), detto);
  assert.deepEqual(detto, ['🎮 Categoria aggiornata: Fortnite (su Kick)', '🤔 Non ho trovato la categoria "fortnite" su Twitch.']);
});

test('la voce e il privato Telegram cambiano con la stessa regola, e il permesso si chiede prima per piattaforma', async () => {
  const { m, fatti, chiesti } = motore({ collegati: ['canaletwitch'] });
  assert.deepEqual(await m.cambiaCanale('KICK.Nato', 'titolo', 'x'), [{ dove: 'kick', ok: true, nome: 'x' }]);
  assert.deepEqual(chiesti, ['kick.nato'], 'il canale si legge in minuscolo');
  assert.deepEqual((await m.cambiaCanale('canaletwitch', 'categoria', 'fortnite')).map((e) => [e.dove, e.ok]), [['twitch', true], ['kick', true]]);
  assert.deepEqual(await m.cambiaCanale('yt.uc123', 'titolo', 'x'), [], 'YouTube: nessuno');
  fatti.length = 0;
  const esiti = await m.cambiaCanale('canaletwitch', 'titolo', 'y', { permesso: (dove) => dove === 'twitch' });
  assert.deepEqual(esiti, [{ dove: 'twitch', ok: true, nome: 'y' }, { dove: 'kick', permesso: true }]);
  assert.deepEqual(fatti.map((f) => f[0]), ['twitch'], 'senza permesso, Kick non si chiama');
  assert.deepEqual(await new ModulesEngine({ helix: { setChannelInfo: async () => true } }).cambiaCanale('kick.nato', 'titolo', 'x'), [], 'senza adattatore di Kick, nessuno: mai helix');
});

test('su YouTube non c\'e\' chi cambia il canale: nessuna chiamata, e allo staff si dice dove si puo\'', async () => {
  const { m, fatti } = motore();
  const detto = [];
  await esegui(m, titolo, ctx({ piattaforma: 'youtube' }), detto);
  await esegui(m, categoria, ctx({ piattaforma: 'youtube', staff: false }), detto);
  await esegui(m, titolo, ctx({ piattaforma: 'youtube', staff: false }), detto);
  assert.equal(fatti.length, 0);
  assert.equal(detto.length, 1, 'al pubblico non si spiega niente');
  assert.match(detto[0], /Su YouTube il titolo non si cambia ancora/);
  assert.match(detto[0], /Twitch e su Kick/);
});

test('il permesso che manca su Kick si dice con il rimedio di Kick, e al pubblico senza dashboard', async () => {
  const detto = [];
  const nega = { searchCategories: async () => [], setChannelInfo: async () => { throw Object.assign(new Error('permesso mancante'), { status: 403 }); } };
  const m = new ModulesEngine({ helix: nega, canali: { kick: () => nega } });
  await esegui(m, titolo, ctx({ piattaforma: 'kick' }), detto);
  await esegui(m, titolo, ctx({ piattaforma: 'kick', staff: false }), detto);
  await esegui(m, titolo, ctx({ piattaforma: 'twitch' }), detto);
  assert.equal(detto.length, 3);
  assert.match(detto[0], /permesso di Kick/);
  assert.match(detto[0], /ricollega Kick/);
  assert.doesNotMatch(detto[1], /dashboard|Kick/);
  assert.doesNotMatch(detto[2], /Kick/, 'su Twitch il rimedio e\' quello di Twitch');
});

test('le azioni inline $titolo() e $categoria() seguono la stessa strada, e il token non esce mai in chat', async () => {
  const { m, fatti } = motore();
  const t1 = await m.espandi('Ecco $titolo(Da Kick) fatto', ctx({ piattaforma: 'kick' }));
  const t2 = await m.espandi('$categoria(fortnite)ok', ctx({ piattaforma: 'twitch' }));
  const t3 = await m.espandi('Su YouTube $titolo(niente) resta', ctx({ piattaforma: 'youtube' }));
  assert.deepEqual(fatti, [['kick', 'canale', { title: 'Da Kick' }], ['twitch', 'canale', { gameId: '9' }]]);
  assert.equal(t1, 'Ecco  fatto');
  assert.equal(t2, 'ok');
  assert.equal(t3, 'Su YouTube  resta');
});
