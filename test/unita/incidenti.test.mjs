// GLI INCIDENTI: un attacco è una cosa sola, non trecento righe di registro.
//
// Il registro c'era già. Dopo un'ondata restavano quattrocento righe in fila e
// per capire cos'era successo bisognava rimetterle insieme a mano: quando è
// cominciato, quanto è durato, quanto forte è andato, chi c'era, cosa abbiamo
// fatto, quanto ha funzionato. Le domande sono sempre quelle sei.
//
// Il modello sta in docs/INCIDENTI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('incidenti-');
const { streamers } = await import('../../src/db.js');
const I = await import('../../src/features/incidenti.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

// ─────────────────────────────────────────── aprire, chiudere, riaprire

test('un attacco si apre, si racconta e si chiude', () => {
  I.azzera();
  const a = I.apri('tizio', { tipo: 'ondata-follow', motivo: '40 follow in 30s' });
  assert.match(a.id, /^INC-\d{4}-\d{6}$/);
  assert.equal(I.aperto('tizio').id, a.id);
  I.racconta('tizio', 'serranda alzata');
  const c = I.chiudi('tizio', 'passata');
  assert.ok(c.chiuso > 0);
  assert.equal(I.aperto('tizio'), null);
  assert.equal(c.timeline.length, 3, 'apertura, serranda, chiusura');
});

test('due allarmi di fila non fanno due incidenti', () => {
  I.azzera();
  const a = I.apri('tizio', { tipo: 'ondata-follow' });
  const b = I.apri('tizio', { tipo: 'coro' });
  assert.equal(a.id, b.id, 'finché è aperto, è quello');
});

test('un attacco che riprende poco dopo è lo stesso attacco', () => {
  // Sennò un\'ondata a ondate diventa dieci incidenti da niente invece di uno
  // grosso, e il conto dei danni è sbagliato in tutti e dieci.
  I.azzera();
  const a = I.apri('tizio', { tipo: 'ondata-follow' });
  I.chiudi('tizio');
  const b = I.apri('tizio', { tipo: 'coro', motivo: 'riprende' });
  assert.equal(b.id, a.id);
  assert.equal(b.riaperture, 1);
  assert.equal(b.chiuso, null);
  assert.equal(b.tipo, 'misto', 'due facce diverse: l\'attacco è misto');
});

test('ma dopo abbastanza silenzio è un attacco nuovo', () => {
  I.azzera();
  const a = I.apri('tizio', {});
  I.chiudi('tizio');
  a.chiuso = Date.now() - I.RIAPRE_MS - 1000;    // il tempo è passato davvero
  const b = I.apri('tizio', {});
  assert.notEqual(b.id, a.id);
  assert.equal(b.riaperture, 0);
});

test('due canali, due incidenti, e non si mescolano', () => {
  I.azzera();
  const a = I.apri('uno', {});
  const b = I.apri('due', {});
  assert.notEqual(a.id, b.id);
  I.coinvolto('uno', 'bot1', I.GIUDIZI.CERTO);
  assert.equal(Object.keys(I.uno(b.id).coinvolti).length, 0);
});

// ─────────────────────────────────────────── chi c'era

test('chi c\'era ha un giudizio, e il giudizio peggiore vince', () => {
  I.azzera();
  I.apri('tizio', {});
  I.coinvolto('tizio', 'bot1', I.GIUDIZI.SOSPETTO);
  I.coinvolto('tizio', 'bot1', I.GIUDIZI.CERTO);
  I.coinvolto('tizio', 'bot1', I.GIUDIZI.LEGITTIMO);   // durante un attacco si scopre, non si dimentica
  I.coinvolto('tizio', 'fan1', I.GIUDIZI.LEGITTIMO);
  const s = I.sintesi(I.aperto('tizio'));
  assert.equal(s.per.certo, 1);
  assert.equal(s.per.legittimo, 1);
  assert.equal(s.coinvolti, 2);
});

test('chi arriva durante un attacco non è per ciò stesso un bot', async () => {
  // È la prova che protegge la bonifica: dentro un'ondata ci finisce anche
  // gente vera, ed è quella che non si deve toccare dopo.
  I.azzera();
  const ch = 'misto1';
  streamers.upsertApproved(ch, 'Misto', '51');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, aVuoto: true } });
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }),
    shieldMode: async () => ({ ok: true }),
  } });
  // dodici follow con arrivi da persone: l'assetto sale, ma non si condanna
  let t = 0;
  for (let i = 0; i < 12; i++) {
    await scudo.onFollow({ channel: ch, data: { user_id: 'p' + i, user_login: 'andrea' + i } });
    await new Promise((r) => setTimeout(r, 20 + (i % 5) * 12));
  }
  const s = I.sintesi(I.aperto(ch));
  assert.ok(s, 'l\'incidente c\'è');
  assert.equal(s.per.certo, 0, 'nessuno condannato');
  assert.ok(s.per.legittimo > 0, 'e chi è arrivato resta scritto come legittimo');
});

// ─────────────────────────────────────────── cosa abbiamo fatto

test('le azioni si contano, non si raccontano una per una', () => {
  I.azzera();
  const ch = 'conta1';
  streamers.upsertApproved(ch, 'Conta', '52');
  streamers.setEnabled(ch, true);
  I.apri(ch, {});
  for (let i = 0; i < 40; i++) ab.registra(ch, { login: 'b' + i, azione: 'blocca', motivo: 'ondata', esito: i < 37 ? 'fatto' : 'fallito' });
  ab.registra(ch, { azione: 'assetto', motivo: 'serranda alzata', esito: 'avviso' });
  const i2 = I.aperto(ch);
  assert.deepEqual(i2.azioni.blocca, { fatte: 37, fallite: 3, aVuoto: 0 });
  assert.equal(i2.timeline.length, 2, 'quaranta righe «bloccato» non raccontano niente; un numero sì');
  assert.match(i2.timeline[1].cosa, /serranda/);
});

test('il picco dice quanto è stato grave, non com\'è adesso', () => {
  I.azzera();
  I.apri('tizio', { livello: 'sospetto' });
  I.segnaPicco('tizio', { livello: 'attacco', quanti: 90 });
  I.segnaPicco('tizio', { livello: 'sospetto', quanti: 20 });
  assert.equal(I.aperto('tizio').picco.quanti, 90);
  assert.equal(I.aperto('tizio').picco.livello, 'attacco');
});

// ─────────────────────────────────────────── il riavvio

test('un incidente rimasto aperto si chiude al riavvio, e non si cancella', async () => {
  I.azzera();
  I.apri('tizio', { tipo: 'ondata-follow', motivo: 'prova' });
  I.coinvolto('tizio', 'bot1', I.GIUDIZI.CERTO);
  await I.salva();
  I.azzera();
  await I.carica();
  const u = I.ultimoDi('tizio');
  assert.ok(u, 'quello che è successo è successo, e resta scritto');
  assert.ok(u.chiuso, 'ma il bot non ha prove che l\'attacco continui');
  assert.equal(I.aperto('tizio'), null);
  assert.equal(Object.keys(u.coinvolti).length, 1);
  assert.match(u.timeline[u.timeline.length - 1].cosa, /ripartito/);
});

test('e i numeri degli incidenti non ricominciano da capo', async () => {
  I.azzera();
  I.apri('tizio', {});
  I.chiudi('tizio');
  const primo = I.ultimoDi('tizio').id;
  await I.salva();
  I.azzera();
  await I.carica();
  const secondo = I.apri('altro', {}).id;
  assert.notEqual(secondo, primo, 'sennò due attacchi diversi avrebbero lo stesso nome');
});

// ─────────────────────────────────────────── lo scudo lo apre da solo

test('l\'assetto che sale apre l\'incidente, il rientro lo chiude', async () => {
  I.azzera();
  const ch = 'auto1';
  streamers.upsertApproved(ch, 'Auto', '53');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  await scudo._alza(ch, 'attacco', '30 follow in 30s: cadenza da macchina', scudo.cfg(ch));
  const a = I.aperto(ch);
  assert.ok(a, 'l\'incidente nasce quando sale l\'assetto');
  assert.equal(a.tipo, 'ondata-follow', 'il tipo si legge da come l\'ha descritto chi ha dato l\'allarme');
  await scudo._abbassa(ch);
  assert.equal(I.aperto(ch), null);
  assert.ok(I.ultimoDi(ch).chiuso);
});
