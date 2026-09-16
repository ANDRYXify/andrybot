// GLI ACCESSI DECISI A MANO: si sommano al piano o gli tolgono, scadono da
// soli, lasciano storia, e la risposta «questo canale ha X?» resta una sola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-accesso-');
const { config } = await import('../../src/config.js');
config.stripe.attivo = false; config.stripe.prezzi = {};
const { accessi, subscriptions, MODI_ACCESSO } = await import('../../src/db.js');
const ab = await import('../../src/features/abbonamenti.js');
const { funzioniCanale, funzioniDelPiano, applicaAccesso, concessioneDi } = await import('../../src/features/accesso.js');
process.on('exit', () => usaEGetta.pulisci());

const ha = (login, k) => ab.abilitata(funzioniCanale(login), k);

test('applicaAccesso e\' pura: tutto, scelte in unione, blocco totale o parziale, il resto com\'era', () => {
  const base = ab.funzioniDi({ tier: 'free' });
  assert.deepEqual(applicaAccesso(base, null), base);
  assert.deepEqual(applicaAccesso(base, { modo: 'tutto' }), ab.TIER_COMMUNITY.funzioni);
  const s = applicaAccesso(base, { modo: 'scelte', funzioni: { notifiche: true, moderatori: 3, boh: true } });
  assert.equal(s.notifiche, true); assert.equal(s.moderatori, 3); assert.equal(s.studio, false); assert.ok(!('boh' in s), 'una chiave che non e\' del catalogo non entra');
  assert.equal(applicaAccesso(base, { modo: 'scelte', funzioni: { moderatori: true } }).moderatori, Infinity, 'vero su un numero = illimitato');
  const baseB = ab.funzioniDi({ tier: 'base' });
  assert.equal(applicaAccesso(baseB, { modo: 'scelte', funzioni: { moderatori: 0 } }).moderatori, 1, 'le scelte non tolgono mai');
  const tutto = applicaAccesso(baseB, { modo: 'blocco', funzioni: {} });
  assert.ok(Object.values(tutto).every((v) => v === false || v === 0), 'blocco senza chiavi = tutto chiuso');
  const parte = applicaAccesso(baseB, { modo: 'blocco', funzioni: { notifiche: true } });
  assert.equal(parte.notifiche, false); assert.equal(parte.studio, true); assert.equal(parte.moduli, Infinity);
  assert.deepEqual(applicaAccesso(base, { modo: 'boh' }), base);
});

test('lo store: si salva ripulito, scade da solo, si toglie, e ogni passo va in storia', () => {
  assert.equal(accessi.get('andry'), null);
  assert.throws(() => accessi.set('andry', { modo: 'boh' }), /modo/);
  assert.throws(() => accessi.set('non valido!', { modo: 'tutto' }), /login/);
  const r = accessi.set('Andry', { modo: 'scelte', funzioni: { notifiche: true, moderatori: 2.6, 'x y': true, giochi: 'si' }, scade: 0, nota: 'prova', motivo: 'boh' }, 'andryxify');
  assert.deepEqual(r.funzioni, { notifiche: true, moderatori: 3 }); assert.equal(r.motivo, 'manuale'); assert.equal(r.chi, 'andryxify'); assert.equal(r.nota, 'prova');
  assert.ok(accessi.attiva(r));
  assert.ok(ha('andry', 'notifiche')); assert.equal(funzioniCanale('andry').moderatori, 3);
  assert.equal(funzioniDelPiano('andry').notifiche, false, 'il piano da solo non ce l\'ha');
  const scaduta = accessi.set('andry', { modo: 'tutto', scade: Date.now() - 1000 }, 'andryxify');
  assert.equal(accessi.attiva(scaduta), false); assert.equal(concessioneDi('andry'), null);
  assert.equal(ha('andry', 'notifiche'), false, 'scaduta: si torna al piano');
  accessi.set('andry', { modo: 'tutto', scade: Date.now() + 60_000 }, 'andryxify');
  assert.ok(ha('andry', 'clipAuto') && ha('andry', 'studio'), 'tutto = accesso pieno');
  accessi.set('andry', { modo: 'blocco', funzioni: {}, nota: 'sospeso' }, 'andryxify');
  assert.equal(ha('andry', 'moduli'), false, 'blocco totale');
  assert.equal(accessi.togli('andry', 'andryxify'), true); assert.equal(accessi.get('andry'), null); assert.equal(accessi.togli('andry'), false);
  const st = accessi.storia('andry');
  assert.equal(st.length, 5); assert.equal(st[0].dopo, null); assert.equal(st[0].prima.modo, 'blocco'); assert.equal(st[4].prima, null); assert.equal(st[4].dopo.modo, 'scelte');
  assert.deepEqual(MODI_ACCESSO, ['tutto', 'scelte', 'blocco']);
  assert.equal(accessi.elenco().length, 0);
});

test('con un abbonamento vero le scelte si sommano e il blocco toglie', () => {
  subscriptions.set('paga', { tier: 'base', pacchetti: ['clip'], status: 'active' });
  assert.ok(ha('paga', 'clipAuto') && ha('paga', 'studio') && !ha('paga', 'voce'));
  accessi.set('paga', { modo: 'scelte', funzioni: { voce: true } }, 'andryxify');
  assert.ok(ha('paga', 'voce') && ha('paga', 'clipAuto'), 'quello che paga resta, in piu\' la voce');
  accessi.set('paga', { modo: 'blocco', funzioni: { studio: true } }, 'andryxify');
  assert.ok(!ha('paga', 'studio') && ha('paga', 'clipAuto'), 'chiuso solo lo Studio');
});
