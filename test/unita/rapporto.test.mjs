// IL RAPPORTO DI FINE DIRETTA: la sessione in memoria (picco e media), la
// raccolta dal database nella finestra della diretta, il testo con le sole
// righe che hanno qualcosa da dire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-rapporto-');
const { db, streamers, memory, presenze: store } = await import('../../src/db.js');
const r = await import('../../src/features/rapporto.js');
process.on('exit', () => usaEGetta.pulisci());

const CH = 'canale';
const MIN = 60_000;
const T0 = Date.parse('2026-09-17T20:00:00Z');
streamers.upsertApproved(CH, 'Canale');

test('la sessione: apre, conta i giri, chiude con picco, media e durata; ripartito a meta\' riparte dalle presenze', () => {
  assert.equal(r.chiudi(CH), null, 'senza sessione niente rapporto');
  r.apri(CH, { ora: T0, inizio: T0 - 3 * MIN });
  r.osservaGiro(CH, { spettatori: 10, ora: T0 + 5 * MIN });
  r.osservaGiro(CH, { spettatori: 40, ora: T0 + 10 * MIN });
  r.osservaGiro(CH, { spettatori: 'boh', ora: T0 + 15 * MIN });
  const c = r.chiudi(CH, { ora: T0 + 120 * MIN });
  assert.equal(c.inizio, T0 - 3 * MIN); assert.equal(c.durataMs, 123 * MIN); assert.equal(c.picco, 40); assert.equal(c.media, 25); assert.equal(c.giri, 2);
  assert.equal(r.aperta(CH), false);
  store.setDiretta(CH, { corrente: 'd9', corrente_ts: T0 + 200 * MIN, precedente: '', ultimo_tick: T0 + 205 * MIN });
  r.osservaGiro(CH, { spettatori: 7, ora: T0 + 210 * MIN });
  const c2 = r.chiudi(CH, { ora: T0 + 260 * MIN });
  assert.equal(c2.inizio, T0 + 200 * MIN, 'l\'inizio lo ricordano le presenze');
  assert.equal(c2.picco, 7);
});

test('la raccolta legge la finestra giusta: chat, eventi, presenze, clip, donazioni', () => {
  const da = T0, a = T0 + 60 * MIN;
  memory.logMessage(CH, 'marco', 'Marco', 'ciao', false, da + MIN);
  memory.logMessage(CH, 'marco', 'Marco', 'ancora', false, da + 2 * MIN);
  memory.logMessage(CH, 'giada', 'Giada', 'ehi', false, da + 3 * MIN);
  memory.logMessage(CH, 'fuori', 'Fuori', 'prima', false, da - 10 * MIN);
  memory.logMessage(CH, '[evento]', '', 'channel.follow {"user_login":"x"}', true, da + 4 * MIN);
  memory.logMessage(CH, '[evento]', '', 'channel.follow {"user_login":"y"}', true, da + 5 * MIN);
  memory.logMessage(CH, '[evento]', '', 'channel.subscribe {"is_gift":true}', true, da + 6 * MIN);
  memory.logMessage(CH, '[evento]', '', 'channel.subscription.gift {"total":3}', true, da + 7 * MIN);
  memory.logMessage(CH, '[evento]', '', 'channel.raid {"viewers":35}', true, da + 8 * MIN);
  memory.logMessage(CH, '[evento]', '', 'channel.follow {"user_login":"tardi"}', true, a + MIN);
  db.prepare('INSERT INTO clips (channel, clip_id, url, reason, ts) VALUES (?,?,?,?,?)').run(CH, 'c1', 'u', 'hype', da + 9 * MIN);
  db.prepare('INSERT INTO clips (channel, clip_id, url, reason, ts) VALUES (?,?,?,?,?)').run(CH, 'c0', 'u', 'hype', da - MIN);
  db.prepare("INSERT INTO donazioni (id, login, fonte, stato, importo, valuta, nome, messaggio, created_at, pagata_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run('stripe:1', CH, 'stripe', 'pagata', 500, 'EUR', 'a', '', da, da + 10 * MIN);
  db.prepare("INSERT INTO donazioni (id, login, fonte, stato, importo, valuta, nome, messaggio, created_at, pagata_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run('stripe:2', CH, 'stripe', 'pagata', 1000, 'EUR', 'b', '', da, da + 11 * MIN);
  db.prepare("INSERT INTO donazioni (id, login, fonte, stato, importo, valuta, nome, messaggio, created_at, pagata_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run('stripe:3', CH, 'stripe', 'attesa', 7000, 'EUR', 'c', '', da, 0);
  store.setDiretta(CH, { corrente: 'd1', corrente_ts: da, precedente: '', ultimo_tick: a });
  store.set(CH, 'marco', { dirette: 5, serie: 5, record: 5, ultima: 'd1', ultima_ts: da + 10 * MIN, prima_ts: da - 30 * 86_400_000 });
  store.set(CH, 'giada', { dirette: 1, serie: 1, record: 1, ultima: 'd1', ultima_ts: da + 10 * MIN, prima_ts: da + 3 * MIN });
  store.set(CH, 'assente', { dirette: 2, serie: 0, record: 2, ultima: 'd0', ultima_ts: da - 86_400_000, prima_ts: da - 86_400_000 });
  const d = r.raccogli(CH, { inizio: da, fine: a });
  assert.equal(d.messaggi, 3); assert.equal(d.persone, 2);
  assert.deepEqual(d.top, [{ user: 'Marco', n: 2 }, { user: 'Giada', n: 1 }]);
  assert.equal(d.follow, 2, 'il follow fuori finestra non conta');
  assert.equal(d.sub, 4); assert.equal(d.regali, 4);
  assert.equal(d.raid, 1); assert.equal(d.raidSpettatori, 35);
  assert.equal(d.presenti, 2); assert.equal(d.primeVolte, 1);
  assert.equal(d.clip, 1);
  assert.equal(d.donazioni, 2); assert.equal(d.donazioniCent, 1500);
  const t = r.testo({ durataMs: 134 * MIN, picco: 48, media: 31, giri: 20, ...d });
  assert.equal(t, [
    '<b>Diretta finita</b>: 2h 14m',
    'Spettatori: picco 48, in media 31',
    'Chat: 3 messaggi da 2 persone',
    'Più attivi: Marco (2), Giada (1)',
    'Nuovi follower: 2 · Sub: 4 (4 regalati) · Raid: 1 (35 spettatori)',
    'Presenti: 2, di cui 1 alla prima volta',
    'Clip: 1 · Donazioni: 2 (15,00 €)',
  ].join('\n'));
  const vuoto = r.testo({ durataMs: 5 * MIN, giri: 0, messaggi: 0, persone: 0, top: [], follow: 0, sub: 0, regali: 0, raid: 0 });
  assert.equal(vuoto, '<b>Diretta finita</b>: 5m\nChat: 0 messaggi da 0 persone\nNuovi follower: 0 · Sub: 0', 'senza spettatori misurati e senza extra, niente righe vuote');
  assert.equal(r.testo({ durataMs: 0, top: [{ user: '<b>x', n: 1 }] }).includes('&lt;b&gt;x'), true, 'il nome non rompe l\'HTML di Telegram');
});

test('si spegne dalle impostazioni, e di serie e\' acceso', () => {
  assert.deepEqual(r.cfg(CH), { telegram: true, mail: false });
  streamers.setSettings(CH, { rapporto: { attivo: false } });
  assert.equal(r.cfg(CH).telegram, false, 'il nome della prima versione spegne Telegram');
  streamers.setSettings(CH, { rapporto: { telegram: true, mail: true } });
  assert.deepEqual(r.cfg(CH), { telegram: true, mail: true });
  assert.equal(r.durata(59 * MIN + 29_000), '59m'); assert.equal(r.durata(3 * 3600_000 + 5 * MIN), '3h 05m');
});

test('lo store: il rapporto si salva, si elenca, si segna letto e inviato; l\'indirizzo vale solo confermato', async () => {
  const { rapporti, postaStreamer } = await import('../../src/db.js');
  const id = rapporti.salva(CH, { inizio: T0, fine: T0 + 60 * MIN, dati: { durataMs: 60 * MIN, messaggi: 3, top: [{ user: 'a', n: 1 }] } });
  assert.ok(id > 0);
  assert.equal(rapporti.nuovi(CH), 1);
  const e = rapporti.elenco(CH);
  assert.equal(e.length, 1); assert.equal(e[0].dati.messaggi, 3); assert.equal(e[0].letto, false); assert.equal(e[0].inviato, '');
  rapporti.segnaInviato(id, 'telegram'); rapporti.segnaInviato(id, 'mail'); rapporti.segnaInviato(id, 'mail');
  assert.equal(rapporti.elenco(CH)[0].inviato, 'telegram,mail');
  rapporti.segnaLetti(CH);
  assert.equal(rapporti.nuovi(CH), 0); assert.equal(rapporti.elenco(CH)[0].letto, true);
  assert.equal(postaStreamer.get(CH), null);
  postaStreamer.proponi(CH, ' Io@Esempio.IT ', 'calco1', T0 + 86_400_000);
  let p = postaStreamer.get(CH);
  assert.equal(p.email, 'io@esempio.it'); assert.equal(p.confermata, 0);
  assert.equal(postaStreamer.conferma('calco-sbagliato', T0), null);
  assert.equal(postaStreamer.conferma('calco1', T0 + 2 * 86_400_000), null, 'scaduto');
  p = postaStreamer.conferma('calco1', T0 + 3600_000);
  assert.equal(p.confermata, 1); assert.equal(p.impronta, '', 'il calco si consuma');
  assert.equal(postaStreamer.conferma('calco1', T0 + 3600_000), null, 'una volta sola');
  postaStreamer.togli(CH);
  assert.equal(postaStreamer.get(CH), null);
});

test('i canali si normalizzano, e la versione mail ha le stesse voci nel guscio del prodotto', () => {
  assert.deepEqual(r.normalizza({ attivo: false }), { telegram: false, mail: false }, 'il nome della prima versione vale ancora');
  assert.deepEqual(r.normalizza({ telegram: true, mail: 'si' }), { telegram: true, mail: false });
  assert.deepEqual(r.normalizza(undefined), { telegram: true, mail: false });
  const d = { durataMs: 134 * MIN, picco: 48, media: 31, giri: 20, messaggi: 3, persone: 2, top: [{ user: 'Marco', n: 2 }], follow: 2, sub: 4, regali: 4, raid: 1, raidSpettatori: 35, presenti: 2, primeVolte: 1, clip: 1, donazioni: 2, donazioniCent: 1500 };
  assert.equal(r.oggetto(d), 'Diretta finita: 2h 14m');
  const h = r.html(d, { display: 'Canale', quando: 'ieri sera' });
  for (const pezzo of ['Diretta finita: 2h 14m', 'picco 48, in media 31', '3 messaggi da 2 persone', 'Marco (2)', '4 (4 regalati)', '1 (35 spettatori)', '2, di cui 1 alla prima volta', '2 (15,00 €)', 'ieri sera', 'per il canale Canale', 'scheda Dirette']) {
    assert.ok(h.includes(pezzo), `manca «${pezzo}»`);
  }
  assert.ok(!/<script/i.test(h));
  assert.equal(r.testoPiano(d).split('\n')[0], 'Diretta finita: 2h 14m');
});
