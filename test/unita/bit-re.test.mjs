// IL PREMIO DEI BIT, E IL RE CHE RESTA.
//
// Due cose che si tengono per mano. Il premio prende la classifica dei Bit —
// che e' di Twitch — e incorona chi sta in cima; la corona e il saluto sono
// quel premio visto da fuori, e vivono e muoiono con lui.
//
// Il punto delicato non e' chi vince: e' cosa succede quando Twitch tace. La
// classifica dei Bit puo' tornare `null`, e `null` non e' «non ha cheerato
// nessuno». Se si trattassero uguali, un permesso mancante brucerebbe il
// premio del mese senza che nessuno se ne accorga.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-bitre-');
const { points, vips, streamers } = await import('../../src/db.js');
const vip = await import('../../src/features/vip.js');
const bit = await import('../../src/features/bit.js');
process.on('exit', () => usaEGetta.pulisci());

// Il blocco della gara dei Bit: i posti in palio, ognuno con la sua durata in
// dirette e il suo titolo.
const GARA = { posti: [{ dirette: 4, titolo: 're' }, { dirette: 2, titolo: 'principe' }], saltaPerenni: true };
const unPosto = { posti: [{ dirette: 4, titolo: 're' }], saltaPerenni: true };
const finto = ({ vipDelCanale = [], rifiuta = new Set() } = {}) => {
  const dati = [];
  return {
    dati,
    getUserByLogin: async (l) => ({ id: 'id_' + l, display_name: l.charAt(0).toUpperCase() + l.slice(1) }),
    getVips: async () => vipDelCanale.map((u) => ({ user_login: u })),
    addVip: async (_ch, id) => {
      const l = String(id).replace(/^id_/, '');
      if (rifiuta.has(l)) return { ok: false, motivo: 'non posso (forse è mod o sei tu)' };
      dati.push(l); return { ok: true };
    },
    removeVip: async () => ({ ok: true }),
  };
};
const righe = (...coppie) => coppie.map(([login, b], i) => ({ login, nome: login, posto: i + 1, bit: b }));
const acceso = (ch, extra = {}) => {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { premioVip: { bit: { attivo: true, periodo: 'mese', posti: GARA.posti } }, ...extra });
};

test('il premio dei Bit va a chi ne ha messi di piu\', e lo dice con il suo numero', async () => {
  const ch = 'b1';
  const h = finto();
  const detto = [];
  const v = await vip.premiaTopBit(h, ch, righe(['giada', 4500], ['ludo', 1200]), unPosto, (t) => detto.push(t));
  assert.deepEqual(h.dati, ['giada']);
  assert.equal(v[0].login, 'giada');
  assert.equal(v[0].bit, 4500);
  assert.match(detto[0], /Re: Giada con 4\.500 Bit — VIP per 4 dirette\./);
});

test('e nemmeno qui si prova a dare il VIP a chi Twitch lo rifiuterebbe', async () => {
  const ch = 'b2';
  points.add(ch, 'capo', 1, 'staff');
  const h = finto({ rifiuta: new Set(['capo']) });
  // la classifica dei Bit e' di Twitch: dentro ci sono tutti, staff compreso
  const v = await vip.premiaTopBit(h, ch, righe(['capo', 9000], ['ludo', 100]), unPosto, null);
  assert.deepEqual(h.dati, ['ludo'], 'il posto scorre al primo che puo\' vincerlo');
  assert.equal(v.length, 1);
  assert.ok(!h.dati.includes('capo'), 'e contro il rifiuto certo non ci ha nemmeno provato');
});

test('una classifica vuota non premia nessuno e non dice niente', async () => {
  const detto = [];
  const v = await vip.premiaTopBit(finto(), 'b3', [], unPosto, (t) => detto.push(t));
  assert.deepEqual(v, []);
  assert.deepEqual(detto, []);
  assert.deepEqual(await vip.premiaTopBit(finto(), 'b3', null, unPosto, null), [], 'e nemmeno un «non lo so» inventa un vincitore');
});

test('chi puo\' vincere: non il padrone di casa, non lo staff', () => {
  const ch = 'b4';
  points.add(ch, 'capo', 1, 'staff');
  points.add(ch, 'anna', 1);
  assert.equal(vip.puoVincere(ch, 'anna'), true);
  assert.equal(vip.puoVincere(ch, 'capo'), false);
  assert.equal(vip.puoVincere(ch, ch), false, 'il padrone di casa non corre nella sua gara');
  assert.equal(vip.puoVincere(ch, 'MaiVisto'), true, 'chi non e\' in classifica non e\' staff: e\' solo uno che non ha monete');
  assert.equal(vip.puoVincere(ch, ''), false);
});

// ---- il re -------------------------------------------------------------
test('la corona e\' il premio visto da fuori: spento il premio, niente re', () => {
  const ch = 'b5';
  acceso(ch, { reBit: { login: 'giada', nome: 'Giada', bit: 4500, da: 1000, salutato: 0 } });
  assert.equal(bit.re(ch).login, 'giada');
  assert.equal(bit.portaCorona(ch, 'Giada'), true, 'il nome si confronta senza badare alle maiuscole');
  assert.equal(bit.portaCorona(ch, 'ludo'), false);

  streamers.setSettings(ch, { premioVip: { bit: { attivo: false }, monete: { attivo: true } }, reBit: { login: 'giada', nome: 'Giada', bit: 4500, da: 1000 } });
  assert.equal(bit.re(ch), null, 'spenta la gara dei Bit, il re non regna piu\' — anche se quella delle monete e\' accesa');
  assert.equal(bit.portaCorona(ch, 'giada'), false);
});

test('la corona vale su Twitch: altrove lo stesso nome e\' un\'altra persona', () => {
  const ch = 'b6';
  acceso(ch, { reBit: { login: 'giada', nome: 'Giada', bit: 900, da: 1000 } });
  assert.equal(bit.portaCorona(ch, 'giada', 'twitch'), true);
  assert.equal(bit.portaCorona(ch, 'giada', 'kick'), false);
  assert.equal(bit.portaCorona(ch, 'giada', 'youtube'), false);
});

test('il re si saluta una volta per regno, e un regno nuovo si saluta di nuovo', () => {
  const ch = 'b7';
  acceso(ch, { reBit: { login: 'giada', nome: 'Giada', bit: 4500, da: 1000, salutato: 0 } });
  const detto = [];
  const msg = (user, text) => ({ channel: ch, user, display: user === 'giada' ? 'Giada' : user, text, piattaforma: 'twitch' });
  const say = (t) => detto.push(t);

  assert.equal(bit.salutaIlRe(msg('ludo', 'ciao'), say), false, 'chi non e\' il re non si saluta');
  assert.equal(bit.salutaIlRe(msg('giada', 'ciao a tutti'), say), true);
  assert.match(detto[0], /Giada è il re dei Bit, con 4\.500 Bit\. Bentornato\./);
  assert.equal(bit.salutaIlRe(msg('giada', 'ancora qui'), say), false, 'una volta per regno, non a ogni messaggio');
  assert.equal(detto.length, 1);

  // stessa persona, regno nuovo: si ricomincia
  const s = streamers.get(ch).settings;
  streamers.setSettings(ch, { ...s, reBit: { ...s.reBit, bit: 7000, da: 2000, salutato: 0 } });
  assert.equal(bit.salutaIlRe(msg('giada', 'rieccomi'), say), true);
  assert.match(detto[1], /7\.000 Bit/);
});

test('un comando non e\' un ritorno, e una frase vuota e\' un «non dirlo»', () => {
  const ch = 'b8';
  acceso(ch, { reBit: { login: 'giada', nome: 'Giada', bit: 100, da: 5, salutato: 0 } });
  const detto = [];
  const say = (t) => detto.push(t);
  const base = { channel: ch, user: 'giada', display: 'Giada', piattaforma: 'twitch' };
  assert.equal(bit.salutaIlRe({ ...base, text: '!bit' }, say), false);
  assert.equal(bit.salutaIlRe({ ...base, text: 'ciao', isSelf: true }, say), false, 'e il bot non saluta se stesso');
  assert.equal(detto.length, 0);
  assert.equal(bit.re(ch).salutato, 0, 'e nessuna di queste due cose brucia il saluto');

  const ch2 = 'b9';
  acceso(ch2, { reBit: { login: 'giada', nome: 'Giada', bit: 100, da: 5, salutato: 0 } });
  const s = streamers.get(ch2).settings;
  streamers.setSettings(ch2, { ...s, premioVip: { ...s.premioVip, bit: { ...s.premioVip.bit, saluto: '   ' } } });
  assert.equal(bit.salutaIlRe({ channel: ch2, user: 'giada', display: 'Giada', text: 'ciao', piattaforma: 'twitch' }, say), false);
  assert.equal(detto.length, 0);
  assert.equal(bit.re(ch2).salutato, 5, 'chi ha svuotato la frase ha detto «non dirlo», non «riprovaci sempre»');
});
