// CHI SE NE VA NON PAGA PIU'. Prima di cancellare un account si disdice il suo
// abbonamento su Stripe; se non si riesce, la cancellazione non parte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('disdetta-');
const { config } = await import('../../src/config.js');
const { subscriptions } = await import('../../src/db.js');
const ab = await import('../../src/features/abbonamenti.js');
test.after(() => casa.pulisci());

const chiamate = [];
let risposta = () => ({ status: 200, corpo: { id: 'sub_1', status: 'canceled' } });
const fetchVero = globalThis.fetch;
test.before(() => {
  globalThis.fetch = async (url, opz = {}) => {
    chiamate.push({ url: String(url), metodo: opz.method || 'GET' });
    const r = risposta();
    return { ok: r.status < 400, status: r.status, json: async () => r.corpo };
  };
});
test.after(() => { globalThis.fetch = fetchVero; });

const conStripe = (acceso) => { config.stripe.attivo = acceso; config.stripe.secretKey = 'sk_test_finto'; };

test('senza abbonamento, o gia\' finito, non si chiama nessuno', async () => {
  conStripe(true);
  chiamate.length = 0;
  assert.deepEqual(await ab.disdiciPerSempre(subscriptions.get('nessuno')), { ok: true, disdetto: false });
  subscriptions.set('finito', { tier: 'base', status: 'canceled', subId: 'sub_9', customerId: 'cus_9' });
  assert.deepEqual(await ab.disdiciPerSempre(subscriptions.get('finito')), { ok: true, disdetto: false });
  assert.equal(chiamate.length, 0);
});

test('un abbonamento attivo si disdice subito, su Stripe', async () => {
  conStripe(true);
  chiamate.length = 0;
  subscriptions.set('paga', { tier: 'base', status: 'active', subId: 'sub_1', customerId: 'cus_1' });
  assert.deepEqual(await ab.disdiciPerSempre(subscriptions.get('paga')), { ok: true, disdetto: true });
  assert.deepEqual(chiamate, [{ url: 'https://api.stripe.com/v1/subscriptions/sub_1', metodo: 'DELETE' }]);
});

test('se Stripe non lo trova piu\' e\' gia\' disdetto; se risponde male, si ferma tutto', async () => {
  conStripe(true);
  subscriptions.set('sparito', { tier: 'base', status: 'active', subId: 'sub_2', customerId: 'cus_2' });
  risposta = () => ({ status: 404, corpo: { error: { code: 'resource_missing', message: 'No such subscription' } } });
  assert.deepEqual(await ab.disdiciPerSempre(subscriptions.get('sparito')), { ok: true, disdetto: true });
  risposta = () => ({ status: 500, corpo: { error: { code: 'api_error', message: 'boom' } } });
  assert.deepEqual(await ab.disdiciPerSempre(subscriptions.get('sparito')), { ok: false, motivo: 'stripe' });
});

test('con Stripe spento e un abbonamento attivo non si fa finta di niente', async () => {
  conStripe(false);
  subscriptions.set('spento', { tier: 'base', status: 'active', subId: 'sub_3', customerId: 'cus_3' });
  assert.deepEqual(await ab.disdiciPerSempre(subscriptions.get('spento')), { ok: false, motivo: 'stripe-spento' });
});
