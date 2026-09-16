// IL PAYWALL NEL TEMPO: una prova vale finche' dura, la ronda del cancello
// governa solo il flag community (l'Essenziale non scade), chi ha gia' una
// sottoscrizione riceve gli extra dentro quella, e il ritorno dal Checkout
// si legge da Stripe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-paywall-');
const { config } = await import('../../src/config.js');
config.stripe.attivo = false; config.stripe.prezzi = {};
const { streamers, subscriptions } = await import('../../src/db.js');
const ab = await import('../../src/features/abbonamenti.js');
const { funzioniDelPiano } = await import('../../src/features/accesso.js');
const { giroCancello } = await import('../../src/web/gate.js');
process.on('exit', () => usaEGetta.pulisci());

const G = 86_400_000;
const T = Date.parse('2026-09-16T12:00:00Z');

test('una prova vale finche\' dura: lo decide la data, non la ronda', () => {
  subscriptions.set('prova', { tier: 'base', pacchetti: ab.ADDON_IDS, status: 'trialing', periodEnd: T + 3 * G });
  assert.equal(subscriptions.attivo('prova', T), true);
  assert.equal(subscriptions.attivo('prova', T + 4 * G), false, 'finita la prova, finito l\'accesso');
  assert.equal(ab.abilitata(funzioniDelPiano('prova'), 'clipAuto'), true, 'adesso la prova e\' in corso');
  subscriptions.set('pagante', { tier: 'base', pacchetti: ['clip'], status: 'active', periodEnd: T - G });
  assert.equal(subscriptions.attivo('pagante', T), true, 'un pagante lo chiude il webhook, non la data');
  subscriptions.set('spento', { tier: 'base', status: 'canceled' });
  assert.equal(subscriptions.attivo('spento', T), false);
  assert.equal(subscriptions.attivo('mai', T), false);
});

test('la ronda: la prova finita torna all\'Essenziale senza extra, e con il sito muto non si tocca altro', () => {
  subscriptions.set('finita', { tier: 'base', pacchetti: ab.ADDON_IDS, status: 'trialing', periodEnd: T - G });
  streamers.upsertApproved('finita', 'Finita');
  assert.equal(giroCancello(null, { ora: T }), true);
  const s = subscriptions.get('finita');
  assert.equal(s.status, 'none'); assert.equal(s.tier, 'free'); assert.equal(s.pacchetti, '', 'niente extra da mostrare come attivi');
  assert.equal(s.current_period_end, T - G, 'la data resta: la scheda dice quando e\' finita');
  assert.equal(giroCancello(new Set(), { ora: T }), false, 'lista vuota = sito muto');
  assert.equal(streamers.get('finita').status, 'approved');
});

test('la ronda: la lista del sito governa il flag community, non l\'esistenza del canale', () => {
  streamers.upsertApproved('comm', 'Comm'); streamers.markCommunity('comm');
  streamers.upsertApproved('libero', 'Libero');                       // iscritto dalla vetrina: mai in lista
  streamers.upsertApproved('spento', 'Spento'); streamers.setStatus('spento', 'disabled'); streamers.setGrazia('spento', -1);   // spento dalla regola vecchia
  streamers.upsertApproved('mano', 'Mano'); streamers.setStatus('mano', 'disabled'); streamers.setManuale('mano', true);
  streamers.upsertApproved('nuovo', 'Nuovo');                         // in lista, senza flag

  const lista = new Set(['mano', 'nuovo']);
  assert.equal(giroCancello(lista, { ora: T }), true);
  let c = streamers.get('comm');
  assert.equal(c.community, true); assert.equal(c.status, 'approved'); assert.ok(c.grazia_fino > T, 'parte la grazia');
  const l = streamers.get('libero');
  assert.equal(l.status, 'approved'); assert.equal(l.community, false); assert.equal(l.grazia_fino, 0, 'chi non e\' mai stato in lista non si tocca');
  const sp = streamers.get('spento');
  assert.equal(sp.status, 'approved'); assert.equal(sp.grazia_fino, 0, 'spento da una grazia scaduta → riapprovato, sull\'Essenziale');
  assert.equal(streamers.get('mano').status, 'disabled', 'a mano: intoccabile');
  assert.equal(streamers.get('nuovo').community, true, 'in lista → community');

  giroCancello(lista, { ora: T + 8 * G });
  c = streamers.get('comm');
  assert.equal(c.community, false, 'grazia scaduta → torna all\'Essenziale');
  assert.equal(c.status, 'approved', 'ma il canale resta, e il bot con lui');
  assert.equal(c.grazia_fino, -1);
  assert.equal(ab.abilitata(funzioniDelPiano('comm'), 'notifiche'), false);

  giroCancello(new Set(['comm']), { ora: T + 9 * G });
  c = streamers.get('comm');
  assert.equal(c.community, true, 'rientra in lista → community di nuovo');
  assert.equal(c.grazia_fino, 0);
  assert.equal(ab.abilitata(funzioniDelPiano('comm'), 'notifiche'), true);
});

// Stripe finto: il listino confermato, una sottoscrizione con il solo Base,
// e si guarda cosa viene chiesto a Stripe.
const prezzo = (id, nomeProd, cent) => ({
  id, unit_amount: cent, currency: 'eur', active: true, created: 100, recurring: { interval: 'month', interval_count: 1 },
  product: { id: 'prod_' + id, name: nomeProd, active: true, metadata: {} },
});
const cent = (v) => Math.round(v.prezzo * 100);
async function conStripeFinto(fn) {
  const salva = { attivo: config.stripe.attivo, key: config.stripe.secretKey, fetch: globalThis.fetch, base: config.baseUrl };
  config.stripe.attivo = true; config.stripe.secretKey = 'sk_test_finta'; config.baseUrl = 'https://prova.example';
  const listino = [prezzo('price_base', 'Base', cent(ab.BASE)), prezzo('price_clip', 'Clip Automatiche', cent(ab.addonById('clip'))),
    prezzo('price_sq', 'Squadra', cent(ab.addonById('squadra'))), prezzo('price_voce', 'Comandi Vocali', cent(ab.addonById('voce'))),
    prezzo('price_tutto', 'Bundle Tutto', cent(ab.bundleById('tutto')))];
  const chiamate = [];
  globalThis.fetch = async (url, opz = {}) => {
    const u = new URL(url);
    const corpo = opz.body ? Object.fromEntries(new URLSearchParams(String(opz.body))) : null;
    chiamate.push({ via: u.pathname, metodo: opz.method || 'GET', corpo });
    if (u.pathname === '/v1/prices') return { ok: true, json: async () => ({ data: listino, has_more: false }) };
    if (u.pathname === '/v1/subscriptions/sub_1' && !opz.method) return { ok: true, json: async () => ({ id: 'sub_1', status: 'active', items: { data: [{ id: 'si_base', price: { id: 'price_base' } }] } }) };
    if (u.pathname === '/v1/subscriptions/sub_1') return { ok: true, json: async () => ({ id: 'sub_1', metadata: corpo }) };
    if (u.pathname === '/v1/subscription_items') return { ok: true, json: async () => ({ id: 'si_' + corpo.price }) };
    if (u.pathname === '/v1/checkout/sessions' && opz.method === 'POST') return { ok: true, json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/cs_test_1' }) };
    if (u.pathname === '/v1/checkout/sessions/cs_test_pagata') return { ok: true, json: async () => ({ id: 'cs_test_pagata', status: 'complete', payment_status: 'paid', metadata: { login: 'andry' } }) };
    if (u.pathname === '/v1/checkout/sessions/cs_test_aperta') return { ok: true, json: async () => ({ id: 'cs_test_aperta', status: 'open', payment_status: 'unpaid' }) };
    if (u.pathname.startsWith('/v1/checkout/sessions/')) return { ok: false, status: 404, json: async () => ({ error: { message: 'no' } }) };
    throw new Error('chiamata non prevista ' + url);
  };
  try { await ab.verificaPrezziStripe(); chiamate.length = 0; await fn(chiamate); }
  finally { config.stripe.attivo = salva.attivo; config.stripe.secretKey = salva.key; config.baseUrl = salva.base; globalThis.fetch = salva.fetch; }
}

test('chi ha gia\' il Base riceve gli extra dentro la sua sottoscrizione, mai un secondo Base', async () => {
  await conStripeFinto(async (chiamate) => {
    const r = await ab.aggiungiAlAbbonamento({ subId: 'sub_1', login: 'andry', pacchetti: ['squadra'], gia: [] });
    assert.deepEqual(r, { pacchetti: ['squadra'], aggiunti: ['squadra'] });
    const voci = chiamate.filter((c) => c.via === '/v1/subscription_items');
    assert.equal(voci.length, 1); assert.equal(voci[0].corpo.price, 'price_sq'); assert.equal(voci[0].corpo.subscription, 'sub_1');
    assert.equal(voci[0].corpo.proration_behavior, 'create_prorations', 'i giorni che restano vanno nella prossima fattura');
    const meta = chiamate.find((c) => c.via === '/v1/subscriptions/sub_1' && c.metodo === 'POST');
    assert.equal(meta.corpo['metadata[pacchetti]'], 'squadra'); assert.equal(meta.corpo['metadata[login]'], 'andry');
    assert.ok(!chiamate.some((c) => c.via === '/v1/checkout/sessions'), 'nessun Checkout nuovo');

    chiamate.length = 0;
    const doppio = await ab.aggiungiAlAbbonamento({ subId: 'sub_1', login: 'andry', pacchetti: ['squadra'], gia: ['squadra'] });
    assert.deepEqual(doppio, { pacchetti: ['squadra'], aggiunti: [] });
    assert.equal(chiamate.filter((c) => c.metodo === 'POST').length, 0, 'quello che hai gia\' non si ricompra');

    chiamate.length = 0;
    const tutto = await ab.aggiungiAlAbbonamento({ subId: 'sub_1', login: 'andry', bundle: 'tutto', gia: [] });
    assert.deepEqual(tutto.pacchetti, ab.bundleById('tutto').addon);
    assert.deepEqual(chiamate.filter((c) => c.via === '/v1/subscription_items').map((c) => c.corpo.price), ['price_tutto'], 'senza extra il pacchetto curato vale il suo prezzo unico');

    chiamate.length = 0;
    const misto = await ab.aggiungiAlAbbonamento({ subId: 'sub_1', login: 'andry', bundle: 'tutto', gia: ['clip'] });
    assert.deepEqual(misto, { pacchetti: ab.normalizzaPacchetti(['clip', 'squadra', 'voce']), aggiunti: ab.normalizzaPacchetti(['squadra', 'voce']) });
    assert.deepEqual(chiamate.filter((c) => c.via === '/v1/subscription_items').map((c) => c.corpo.price).sort(), ['price_sq', 'price_voce'], 'con un extra gia\' suo, il pacchetto diventa i mancanti uno per uno');
  });
});

test('il Checkout torna con l\'id della sessione, e la sessione si rilegge da Stripe', async () => {
  await conStripeFinto(async (chiamate) => {
    const url = await ab.creaCheckout({ login: 'andry', pacchetti: ['clip'] });
    assert.equal(url, 'https://checkout.stripe.com/c/cs_test_1');
    const c = chiamate.find((x) => x.via === '/v1/checkout/sessions');
    assert.equal(c.corpo.success_url, 'https://prova.example/abbonamento/ritorno?sessione={CHECKOUT_SESSION_ID}');
    assert.equal(c.corpo.cancel_url, 'https://prova.example/?abbonamento=annullato');
    assert.equal(ab.esitoCheckout(await ab.leggiCheckout('cs_test_pagata')), 'ok');
    assert.equal(ab.esitoCheckout(await ab.leggiCheckout('cs_test_aperta')), 'attesa');
    assert.equal(ab.esitoCheckout(await ab.leggiCheckout('cs_test_boh')), 'no');
    chiamate.length = 0;
    assert.equal(await ab.leggiCheckout('../prices'), null, 'un id che non ha la forma di una sessione non arriva a Stripe');
    assert.equal(await ab.leggiCheckout(''), null);
    assert.equal(chiamate.length, 0);
  });
  assert.equal(ab.esitoCheckout({ id: 'cs_x', status: 'complete', payment_status: 'no_payment_required' }), 'ok');
  assert.equal(ab.esitoCheckout({ id: 'cs_x', status: 'complete', payment_status: 'unpaid' }), 'attesa', 'bonifico in arrivo: si aspetta il webhook');
  assert.equal(ab.esitoCheckout({ id: 'cs_x', status: 'expired' }), 'no');
  assert.equal(ab.esitoCheckout(null), 'no');
});
