// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CHAT E L'ACCESSO NELLA PAGINA DEI COLPI (docs/COLPI.md): la chat gira a
// chi ha la pagina aperta solo le righe del suo canale, con un tetto; l'accesso
// chiede un permesso solo e tiene il token lontano dal cookie.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creaChatColpi, rigaDi, RIGHE_TENUTE, PER_CANALE } from '../../src/features/colpi-chat.js';
import { creaAccessi, mandaInChat, PERMESSI, DURATA_MS, creaPonti, PONTE_MS, MAX_PONTI } from '../../src/features/colpi-accesso.js';

const lettore = () => { const scritto = []; return { scritto, write: (s) => scritto.push(s), righe: () => scritto.filter((s) => s.startsWith('data: ')).map((s) => JSON.parse(s.slice(6))).filter((r) => r.tipo !== 'battito') }; };

test('la riga: il testo pulito, un colore vero, solo le emote che ci sono e con un indirizzo https', () => {
  const r = rigaDi({ id: 'm1', display: 'Marta', text: '  ciao Kappa LUL javascript:x ' }, { colore: '#FF00aa', emote: { Kappa: 'https://e/k.png', LUL: 'http://e/l.png', Pog: 'https://e/p.png' } });
  assert.deepEqual(r, { id: 'm1', chi: 'Marta', colore: '#FF00aa', testo: 'ciao Kappa LUL javascript:x', emote: { Kappa: 'https://e/k.png' } });
  assert.equal(rigaDi({ text: '  ' }), null);
  assert.equal(rigaDi({ text: 'x' }, { colore: 'red;background:url(x)' }).colore, '');
  assert.deepEqual(Object.keys(rigaDi({ text: 'toString constructor' }, { emote: {} }).emote), [], 'le parole della lingua non sono emote');
});

test('chi arriva vede le ultime righe del suo canale, poi le nuove; gli altri canali no', () => {
  const chat = creaChatColpi();
  for (let i = 0; i < RIGHE_TENUTE + 5; i++) chat.messaggio('Uno', { id: String(i), chi: 'a', testo: 't' + i, emote: {} });
  const a = lettore(), b = lettore();
  assert.equal(chat.apri('uno', a), true);
  assert.equal(chat.apri('due', b), true);
  assert.equal(a.righe().length, RIGHE_TENUTE);
  assert.equal(a.righe()[0].testo, 't5', 'le piu\' vecchie se ne vanno');
  chat.messaggio('uno', { id: 'n', chi: 'b', testo: 'nuova', emote: {} });
  assert.equal(a.righe().at(-1).testo, 'nuova');
  assert.equal(b.righe().length, 0);
  chat.battito();
  assert.deepEqual(JSON.parse(a.scritto.at(-1).slice(6)), { tipo: 'battito' }, 'il battito e\' un evento che la pagina riconosce e non mostra');
  chat.chiudi('uno', a);
  chat.messaggio('uno', { id: 'm', chi: 'b', testo: 'dopo', emote: {} });
  assert.notEqual(a.righe().at(-1).testo, 'dopo', 'chi ha chiuso non riceve piu\'');
  assert.equal(chat.quanti('uno'), 0);
  chat.dimentica('uno');
  assert.deepEqual(chat.ultime('uno'), []);
});

test('un canale ha un tetto di lettori; chi rompe la linea non ferma gli altri', () => {
  const chat = creaChatColpi();
  for (let i = 0; i < PER_CANALE; i++) assert.equal(chat.apri('pieno', lettore()), true);
  assert.equal(chat.apri('pieno', lettore()), false);
  const chat2 = creaChatColpi();
  const rotto = { write: () => { throw new Error('chiuso'); } }, buono = lettore();
  chat2.apri('c', rotto); chat2.apri('c', buono);
  chat2.messaggio('c', { id: '1', chi: 'x', testo: 'ok', emote: {} });
  assert.equal(buono.righe().length, 1);
});

test('l\'accesso chiede un permesso solo: scrivere in chat', () => {
  assert.deepEqual([...PERMESSI], ['user:write:chat']);
});

test('la chiave dell\'accesso: chi e\' senza il token, rinnovo vicino alla scadenza, via dopo un giorno', async () => {
  let adesso = 1_000_000;
  const rinnovi = [];
  const acc = creaAccessi({ ora: () => adesso, rinnova: async (r) => { rinnovi.push(r); return r === 'buono' ? { accessToken: 'nuovo', refreshToken: 'buono2', expiresAt: adesso + 4 * 3600_000 } : null; } });
  const k = acc.metti({ id: 42, login: 'Marta', nome: 'Marta', token: 'vecchio', refresh: 'buono', scade: adesso + 3600_000 });
  assert.match(k, /^[A-Za-z0-9_-]{32}$/);
  assert.deepEqual(acc.chi(k), { id: '42', login: 'marta', nome: 'Marta' }, 'chi e\' non porta il token');
  assert.equal(await acc.token(k), 'vecchio');
  adesso += 3600_000 - 60_000;
  assert.equal(await acc.token(k), 'nuovo', 'a un minuto dalla scadenza si rinnova');
  assert.deepEqual(rinnovi, ['buono']);
  const k2 = acc.metti({ id: 7, login: 'luca', token: 't', refresh: 'cattivo', scade: adesso + 60_000 });
  assert.equal(await acc.token(k2), null, 'un rinnovo che non riesce chiude l\'accesso');
  assert.equal(acc.chi(k2), null);
  assert.equal(acc.chi('inventata'), null);
  assert.equal(acc.chi({}), null);
  adesso += DURATA_MS + 1;
  assert.equal(acc.chi(k), null, 'dopo un giorno si rientra');
  acc.togli(k);
  assert.equal(acc.quanti(), 0);
});

test('il messaggio in chat: l\'API di Twitch col token dello spettatore, e le sue parole quando rifiuta', async () => {
  const chiamate = [];
  const finto = (status, corpo) => async (url, o) => { chiamate.push({ url, o }); return { status, ok: status < 300, json: async () => corpo }; };
  assert.deepEqual(await mandaInChat({ clientId: 'cid', token: 'tok', broadcasterId: 1, senderId: 2, testo: ' ciao\nmondo ', fetcher: finto(200, { data: [{ is_sent: true }] }) }), { ok: true });
  const { url, o } = chiamate[0];
  assert.equal(url, 'https://api.twitch.tv/helix/chat/messages');
  assert.equal(o.headers.Authorization, 'Bearer tok');
  assert.equal(o.headers['Client-Id'], 'cid');
  assert.deepEqual(JSON.parse(o.body), { broadcaster_id: '1', sender_id: '2', message: 'ciao mondo' });
  assert.deepEqual(await mandaInChat({ token: 't', testo: 'x', fetcher: finto(200, { data: [{ is_sent: false, drop_reason: { message: 'Sei bannato' } }] }) }), { ok: false, motivo: 'Sei bannato' });
  assert.equal((await mandaInChat({ token: 't', testo: 'x', fetcher: finto(401, {}) })).scaduto, true);
  assert.equal((await mandaInChat({ token: 't', testo: 'x', fetcher: finto(429, { message: 'Too Many Requests' }) })).motivo, 'Too Many Requests');
  assert.equal((await mandaInChat({ token: 't', testo: '   ', fetcher: finto(200, {}) })).motivo, 'vuoto');
  assert.equal((await mandaInChat({ token: 't', testo: 'x', fetcher: async () => { throw new Error('rete giu\''); } })).motivo, 'rete giu\'');
});

test('il ponte dalla pagina corta: il biglietto vale una volta, per poco, per quel canale e per quel browser', () => {
  let adesso = 1_000;
  const ponti = creaPonti({ ora: () => adesso });
  const b = ponti.apri({ canale: 'prova', chiave: 'K', segno: 's1' });
  assert.match(b, /^[A-Za-z0-9_-]{32}$/, 'casuale, e sta in un indirizzo');
  assert.equal(ponti.prendi(b, { canale: 'prova', segno: 's1' }), 'K');
  assert.equal(ponti.prendi(b, { canale: 'prova', segno: 's1' }), null, 'una volta sola');
  const rubato = ponti.apri({ canale: 'prova', chiave: 'K2', segno: 's2' });
  assert.equal(ponti.prendi(rubato, { canale: 'prova', segno: 'altro' }), null, 'senza il segno di chi e\' partito non entra nessuno');
  assert.equal(ponti.prendi(rubato, { canale: 'prova', segno: 's2' }), null, 'e il biglietto provato si e\' bruciato');
  assert.equal(ponti.prendi(ponti.apri({ canale: 'prova', chiave: 'K3', segno: 's3' }), { canale: 'altro', segno: 's3' }), null, 'solo per quel canale');
  assert.equal(ponti.prendi(ponti.apri({ canale: 'prova', chiave: 'K4', segno: '' }), { canale: 'prova', segno: '' }), null, 'un segno vuoto non e\' un segno');
  const tardi = ponti.apri({ canale: 'prova', chiave: 'K5', segno: 's5' });
  adesso += PONTE_MS;
  assert.equal(ponti.prendi(tardi, { canale: 'prova', segno: 's5' }), null, 'scade');
  assert.equal(ponti.prendi(undefined, { canale: 'prova', segno: 's5' }), null);
  for (let i = 0; i < MAX_PONTI + 10; i++) ponti.apri({ canale: 'prova', chiave: 'k' + i, segno: 's' });
  assert.equal(ponti.quanti(), MAX_PONTI, 'con un tetto');
});
