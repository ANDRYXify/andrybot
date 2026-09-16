// LA RICERCA DEI PREZZI, DA CAPO A FONDO, con uno Stripe finto: due pagine di
// prezzi, un id forzato dal .env che non sta nell'elenco degli attivi, un prodotto
// con l'importo sbagliato. Si guarda cosa il server mette in vendita dopo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../src/config.js';
import * as ab from '../../src/features/abbonamenti.js';

const prezzo = (id, nomeProd, cent, extra = {}) => ({
  id, unit_amount: cent, currency: 'eur', active: true, created: 100, recurring: { interval: 'month', interval_count: 1 },
  product: { id: 'prod_' + id, name: nomeProd, active: true, metadata: {} }, ...extra,
});
const cent = (v) => Math.round(v.prezzo * 100);

test('all\'avvio il server chiede a Stripe, pagina per pagina, e vende solo cio\' che coincide', async () => {
  const salva = { attivo: config.stripe.attivo, key: config.stripe.secretKey, prezzi: { ...config.stripe.prezzi }, fetch: globalThis.fetch };
  config.stripe.attivo = true; config.stripe.secretKey = 'sk_test_finta';
  config.stripe.prezzi.addon_voce = 'price_voce_forzato';          // forzato dal .env, archiviato: non sta fra gli attivi
  const pagina1 = [prezzo('price_base', 'Base', cent(ab.BASE)), prezzo('price_clip', 'Clip Automatiche', cent(ab.addonById('clip')))];
  const pagina2 = [prezzo('price_sq', 'Squadra', 299), prezzo('price_tutto', 'Bundle Tutto', cent(ab.bundleById('tutto')))];
  const chiamate = [];
  globalThis.fetch = async (url, opz) => {
    chiamate.push(String(url));
    assert.equal(opz.headers.Authorization, 'Bearer sk_test_finta');
    const u = new URL(url);
    let corpo;
    if (u.pathname === '/v1/prices') {
      assert.equal(u.searchParams.get('active'), 'true'); assert.equal(u.searchParams.get('type'), 'recurring');
      assert.equal(u.searchParams.get('expand[]'), 'data.product');
      corpo = u.searchParams.get('starting_after') ? { data: pagina2, has_more: false } : { data: pagina1, has_more: true };
    } else if (u.pathname === '/v1/prices/price_voce_forzato') {
      corpo = prezzo('price_voce_forzato', 'Comandi Vocali', cent(ab.addonById('voce')), { active: false });
    } else throw new Error('chiamata non prevista ' + url);
    return { ok: true, json: async () => corpo };
  };
  try {
    const esiti = await ab.verificaPrezziStripe();
    assert.equal(chiamate.length, 3, 'due pagine di prezzi e l\'id forzato a parte');
    const per = Object.fromEntries(esiti.map((e) => [e.id, e]));
    assert.deepEqual([per.base.ok, per.clip.ok, per.tutto.ok], [true, true, true]);
    assert.equal(ab.priceDi(ab.BASE), 'price_base');
    assert.equal(ab.priceDi(ab.bundleById('tutto')), 'price_tutto');
    assert.equal(per.squadra.ok, false, 'Squadra a 2,99 in Stripe contro 1,99 di listino: non si vende');
    assert.match(per.squadra.motivo, /299 eur\/month ≠ listino 199/);
    assert.equal(ab.vendibile(ab.addonById('squadra')), false);
    assert.equal(per.voce.ok, false, 'l\'id forzato esiste ma e\' archiviato: non si vende');
    assert.equal(ab.pianiPubblici().addon.map((a) => a.id).join(','), 'clip', 'il listino pubblico mostra solo quel che Stripe conferma');
    assert.equal(ab.pianiPubblici().bundle.length, 1);
  } finally {
    globalThis.fetch = salva.fetch;
    config.stripe.attivo = salva.attivo; config.stripe.secretKey = salva.key;
    Object.assign(config.stripe.prezzi, salva.prezzi);
  }
});

test('se Stripe non risponde non si vende niente, e quel che c\'era prima resta com\'era', async () => {
  const salva = { attivo: config.stripe.attivo, key: config.stripe.secretKey, fetch: globalThis.fetch };
  config.stripe.attivo = true; config.stripe.secretKey = 'sk_test_finta';
  globalThis.fetch = async () => { throw new Error('rete giu\''); };
  try {
    const prima = ab.priceDi(ab.BASE);
    assert.equal(await ab.verificaPrezziStripe(), null);
    assert.equal(ab.priceDi(ab.BASE), prima, 'niente cancellato: l\'esito precedente resta');
  } finally { globalThis.fetch = salva.fetch; config.stripe.attivo = salva.attivo; config.stripe.secretKey = salva.key; }
});
