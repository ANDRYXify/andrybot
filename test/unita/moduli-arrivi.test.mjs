// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PEZZI NUOVI DEI MODULI per chi arriva in chat (src/features/modules.js),
// che valgono per ogni modulo, non solo per le accoglienze:
//  · «Per chi»: un comando che risponde solo a Tizio, o a tutti tranne lui;
//  · «Esegui un comando»: un altro modulo come se l'avesse scritto la stessa
//    persona, mai se stesso, mai in giro; e i comandi semplici creati in chat;
//  · «Una frase a caso»: una riga per frase, ne esce una;
//  · «Avvia un gioco»: con le regole del giro (giochi spenti, uno gia' aperto);
//  · «Prova come se arrivasse…»: la persona scelta prende il posto di chi scrive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('moduli-arrivi-');
const db = await import('../../src/db.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
const giro = await import('../../src/features/giro-giochi.js');
test.after(() => casa.pulisci());

const CH = 'canalearrivi';
db.streamers.upsertApproved(CH, 'CanaleArrivi', '901');
const motore = new ModulesEngine({});
const msg = (user, id, text, extra = {}) => ({ channel: CH, user, display: user[0].toUpperCase() + user.slice(1), userId: id, text, piattaforma: 'twitch', tags: {}, ...extra });
const salva = (m) => db.modules.save(CH, m);

test('«Per chi» su un comando: solo Tizio, oppure tutti tranne lui; un nome cambiato resta lui', async () => {
  const soloTizio = salva({ nome: 'solo tizio', trigger: { tipo: 'comando', comando: 'saluto' }, condizioni: { chi: { persone: [{ id: '42', login: 'tizio' }] } }, azioni: [{ tipo: 'messaggio', testo: 'ciao capo' }] });
  const tranne = salva({ nome: 'tranne tizio', trigger: { tipo: 'comando', comando: 'saluto' }, condizioni: { chi: { modo: 'tranne', persone: [{ id: '42', login: 'tizio' }] } }, azioni: [{ tipo: 'messaggio', testo: 'ciao $user' }] });
  const detto = [];
  await motore.onMessage(msg('tizio', '42', '!saluto'), (t) => detto.push(t));
  await motore.onMessage(msg('caio', '7', '!saluto'), (t) => detto.push(t));
  await motore.onMessage(msg('nuovonome', '42', '!saluto'), (t) => detto.push(t));
  assert.deepEqual(detto, ['ciao capo', 'ciao Caio', 'ciao capo']);
  db.modules.remove(CH, soloTizio); db.modules.remove(CH, tranne);
});

test('«Per chi» coi gruppi: i VIP, e un timer senza nessuno davanti non e\' nessuno', async () => {
  const perVip = salva({ nome: 'vip', trigger: { tipo: 'parola', testo: 'buonasera' }, condizioni: { chi: { gruppi: ['vip'] } }, azioni: [{ tipo: 'messaggio', testo: 'buonasera vip' }] });
  const detto = [];
  await motore.onMessage(msg('tizio', '42', 'buonasera', { isVip: true }), (t) => detto.push(t));
  await motore.onMessage(msg('caio', '7', 'buonasera'), (t) => detto.push(t));
  assert.deepEqual(detto, ['buonasera vip']);
  const m = db.modules.get(CH, perVip);
  assert.equal((await motore._condizioniOk(m, { channel: CH, _vars: {} })).motivo, 'chi', 'con «solo» un contesto senza persona si ferma');
  db.modules.remove(CH, perVip);
});

test('«Esegui un comando»: come se l\'avesse scritto la stessa persona; mai se stesso, mai in giro', async () => {
  db.commands.set(CH, 'discord', 'Vieni su Discord, {user}!');
  const b = salva({ nome: 'b', trigger: { tipo: 'comando', comando: 'bbb' }, azioni: [{ tipo: 'messaggio', testo: 'B per $user' }] });
  const a = salva({ nome: 'a', trigger: { tipo: 'comando', comando: 'aaa' }, azioni: [{ tipo: 'messaggio', testo: 'A' }, { tipo: 'modulo', modulo: b }, { tipo: 'modulo', comando: '!discord' }] });
  // B richiama A: il giro si ferma qui, non ricomincia
  db.modules.save(CH, { ...db.modules.get(CH, b), azioni: [{ tipo: 'messaggio', testo: 'B per $user' }, { tipo: 'modulo', modulo: a }] });
  const detto = [];
  await motore.onMessage(msg('tizio', '42', '!aaa'), (t) => detto.push(t));
  assert.deepEqual(detto, ['A', 'B per Tizio', 'Vieni su Discord, Tizio!']);
  // una catena lunga si ferma a tre
  const c = salva({ nome: 'c', trigger: { tipo: 'manuale' }, azioni: [{ tipo: 'messaggio', testo: 'C' }] });
  const d = salva({ nome: 'd', trigger: { tipo: 'manuale' }, azioni: [{ tipo: 'messaggio', testo: 'D' }, { tipo: 'modulo', modulo: c }] });
  const e = salva({ nome: 'e', trigger: { tipo: 'manuale' }, azioni: [{ tipo: 'messaggio', testo: 'E' }, { tipo: 'modulo', modulo: d }] });
  const f = salva({ nome: 'f', trigger: { tipo: 'comando', comando: 'fff' }, azioni: [{ tipo: 'messaggio', testo: 'F' }, { tipo: 'modulo', modulo: e }] });
  detto.length = 0;
  await motore.onMessage(msg('tizio', '42', '!fff'), (t) => detto.push(t));
  assert.deepEqual(detto, ['F', 'E', 'D']);
  for (const id of [a, b, c, d, e, f]) db.modules.remove(CH, id);
});

test('«Una frase a caso»: ne esce una delle righe; senza la spunta il testo resta intero', async () => {
  const visti = new Set();
  for (let i = 0; i < 60; i++) {
    await motore._eseguiAzione({ tipo: 'messaggio', aCaso: true, testo: 'uno $user\n\n due $user \ntre' }, { channel: CH, user: 'Tizio', _vars: {} }, (t) => visti.add(t));
  }
  assert.deepEqual([...visti].sort(), ['due Tizio', 'tre', 'uno Tizio']);
  const intero = [];
  await motore._eseguiAzione({ tipo: 'messaggio', testo: 'riga uno\nriga due' }, { channel: CH, user: 'Tizio', _vars: {} }, (t) => intero.push(t));
  assert.deepEqual(intero, ['riga uno\nriga due']);
});

test('«Avvia un gioco»: parte, uno gia\' aperto non si interrompe, a giochi spenti niente', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_800_000_000_000 });
  const detto = [];
  assert.deepEqual(giro.avviaVoce(CH, 'nonesiste', { dire: (x) => detto.push(x) }), { ok: false, motivo: 'sconosciuto' });
  assert.equal(giro.avviaVoce(CH, 'boss', { live: false, dire: (x) => detto.push(x) }).motivo, 'live', 'il boss vive nell\'overlay: vuole la diretta');
  const r = giro.avviaVoce(CH, 'calcolo', { dire: (x) => detto.push(x) });
  assert.deepEqual(r, { ok: true, id: 'calcolo' });
  assert.ok(detto.length >= 1, 'il gioco si annuncia');
  assert.equal(giro.avviaVoce(CH, 'caso', { dire: () => {} }).motivo, 'inCorso');
  assert.ok(Number(giro.ultimi(CH).calcolo) > 0, 'e conta per il giro: la distanza vale anche per lui');
  t.mock.timers.tick(10 * 60_000);   // il round si chiude da solo
  db.streamers.setSettings(CH, { giochi: false });
  assert.equal(giro.avviaVoce(CH, 'calcolo', { dire: () => {} }).motivo, 'spenti');
  db.streamers.setSettings(CH, { giochi: true });
});

test('«Prova come se arrivasse…»: la persona scelta prende il posto di chi scrive', async () => {
  const id = salva({ nome: 'per tizio', trigger: { tipo: 'arrivo', quando: 'diretta' }, condizioni: { chi: { persone: [{ login: 'tizio' }] } }, azioni: [{ tipo: 'messaggio', testo: 'Bentornato $user ($volte)' }] });
  const detto = [];
  assert.equal(await motore.provaModulo(CH, id, (t) => detto.push(t), { persona: { p: 'twitch', login: 'tizio', nome: 'Tizio' } }), true);
  assert.deepEqual(detto, ['Bentornato Tizio (1)']);
  db.modules.remove(CH, id);
});

test('i moduli «arriva in chat» non scattano coi messaggi qualunque: li fa partire solo chi arriva', async () => {
  const id = salva({ nome: 'arrivo', trigger: { tipo: 'arrivo' }, azioni: [{ tipo: 'messaggio', testo: 'ciao' }] });
  const detto = [];
  await motore.onMessage(msg('tizio', '42', 'ciao a tutti'), (t) => detto.push(t));
  assert.deepEqual(detto, []);
  db.modules.remove(CH, id);
});
