// IL CONTO DELLO STREAMER E I PAGAMENTI, con uno Stripe finto: la chiave con
// restrizioni si verifica per intero (prodotto + sessione di prova) e si
// salva solo se Stripe la accetta; la chiave segreta non si accetta mai; il
// pagamento nasce SUL SUO conto con la sua chiave, senza Connect e senza
// quote; la conferma conta una volta sola e tiene il riferimento del
// pagamento; una chiave revocata si scopre e si spiega; il rimborso passa
// dalla sua chiave e spiega il permesso che manca; la ronda trova le pagate
// e lascia scadere le vecchie; il registro scarta i doppioni e fa i conti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

// il database si apre in una cartella usa e getta: queste prove non toccano i dati veri
const usaEGetta = cartellaUsaEGetta('andrybot-donazioni-stripe-');
const { config } = await import('../../src/config.js');
config.baseUrl = 'https://prova.example';
const ds = await import('../../src/features/donazioni-stripe.js');
const { contiDonazioni, registroDonazioni } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

const CHIAVE = 'rk_test_' + 'a1b2c3d4e5f6g7h8i9j0';
// uno Stripe finto: `risposte(c)` decide; ogni chiamata resta annotata
function stripeFinto(risposte) {
  const chiamate = [];
  globalThis.fetch = async (url, opz = {}) => {
    const u = new URL(url);
    const corpo = opz.body ? Object.fromEntries(new URLSearchParams(String(opz.body))) : null;
    const c = { metodo: opz.method || 'GET', path: u.pathname, corpo, intestazioni: opz.headers || {} };
    chiamate.push(c);
    const r = risposte(c);
    if (!r) throw new Error('chiamata non prevista ' + c.metodo + ' ' + c.path);
    return { ok: (r.status || 200) < 400, status: r.status || 200, json: async () => r.body };
  };
  return chiamate;
}
const fetchVero = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = fetchVero; });
const rifiuto = (status, message, code = '') => ({ status, body: { error: { message, code } } });

test('la chiave si verifica per intero e si salva solo se Stripe la accetta; la chiave segreta non entra', async () => {
  assert.match((await ds.collegaConto('andry', 'sk_live_qualcosa1234567890')).errore, /chiave segreta/, 'una sk_ non si accetta');
  assert.match((await ds.collegaConto('andry', 'rk_live_corta')).errore, /forma giusta/);
  let permessi = { prodotti: false, sessioni: true };
  const chiamate = stripeFinto((c) => {
    assert.equal(c.intestazioni.Authorization, 'Bearer ' + CHIAVE, 'la SUA chiave');
    assert.ok(!('Stripe-Account' in c.intestazioni), 'nessun Connect: niente conto collegato');
    if (c.metodo === 'POST' && c.path === '/v1/products') return permessi.prodotti ? { body: { id: 'prod_1' } } : rifiuto(403, 'This API key does not have the required permissions: rak_product_write');
    if (c.metodo === 'POST' && c.path === '/v1/checkout/sessions') return permessi.sessioni ? { body: { id: 'cs_prova', url: 'https://checkout.stripe.com/c/x' } } : rifiuto(403, 'This API key does not have the required permissions: rak_checkout_session_write');
    return null;
  });
  const senzaProdotti = await ds.collegaConto('andry', CHIAVE);
  assert.match(senzaProdotti.errore, /Products, in scrittura/); assert.match(senzaProdotti.errore, /rak_product_write/, 'la frase di Stripe si dice: e\' la sua chiave');
  assert.equal(contiDonazioni.get('andry'), null, 'niente salvato');
  permessi = { prodotti: true, sessioni: false };
  const senzaSessioni = await ds.collegaConto('andry', CHIAVE);
  assert.match(senzaSessioni.errore, /Checkout Sessions, in scrittura/);
  assert.equal(contiDonazioni.get('andry'), null, 'niente salvato nemmeno adesso');
  permessi = { prodotti: true, sessioni: true };
  const ok = await ds.collegaConto('andry', CHIAVE);
  assert.deepEqual(ok, { ok: true, coda: 'i9j0' });
  const prova = chiamate.filter((c) => c.path === '/v1/checkout/sessions').pop();
  assert.equal(prova.corpo['line_items[0][price_data][product]'], 'prod_1', 'la sessione di prova usa il prodotto appena creato');
  assert.equal(prova.corpo['line_items[0][price_data][unit_amount]'], '100');
  const c = contiDonazioni.get('andry');
  assert.equal(c.chiave, CHIAVE); assert.equal(c.prodotto, 'prod_1'); assert.equal(c.pronto, 1); assert.equal(c.nota, '');
  assert.equal(ds.statoDi(c), 'pronto');
  assert.equal(ds.statoDi(null), 'nessuno');
  // con una chiave rifiutata per 401, il messaggio e' un altro
  stripeFinto(() => rifiuto(401, 'Invalid API Key provided'));
  assert.match((await ds.collegaConto('altro', CHIAVE)).errore, /non riconosce questa chiave/);
});

test('il pagamento nasce sul conto dello streamer con la sua chiave, senza quote, e il registro lo aspetta', async () => {
  const chiamate = stripeFinto((c) => (c.metodo === 'POST' && c.path === '/v1/checkout/sessions' ? { body: { id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' } } : null));
  const r = await ds.apriPagamento({ login: 'andry', display: 'Andry', importoCent: 500, valuta: 'EUR', nome: 'Luca', messaggio: 'grande live' });
  assert.deepEqual(r, { url: 'https://checkout.stripe.com/c/cs_1', id: 'cs_1' });
  const c = chiamate[0];
  assert.equal(c.intestazioni.Authorization, 'Bearer ' + CHIAVE);
  assert.equal(c.corpo.mode, 'payment'); assert.equal(c.corpo.submit_type, 'donate');
  assert.equal(c.corpo['line_items[0][price_data][currency]'], 'eur');
  assert.equal(c.corpo['line_items[0][price_data][unit_amount]'], '500');
  assert.equal(c.corpo['line_items[0][price_data][product]'], 'prod_1', 'sul suo prodotto «Donazione»');
  assert.ok(!Object.keys(c.corpo).some((k) => k.includes('application_fee')), 'nessuna quota per la piattaforma');
  assert.equal(c.corpo['metadata[nome]'], 'Luca'); assert.equal(c.corpo['metadata[messaggio]'], 'grande live');
  assert.equal(c.corpo.success_url, 'https://prova.example/u/andry?dona={CHECKOUT_SESSION_ID}');
  assert.equal(c.corpo.cancel_url, 'https://prova.example/u/andry?dona=annullata');
  assert.ok(Number(c.corpo.expires_at) > Date.now() / 1000 + 3000, 'scade fra un\'ora');
  const riga = registroDonazioni.get('stripe:cs_1');
  assert.equal(riga.stato, 'attesa'); assert.equal(riga.importo, 500); assert.equal(riga.nome, 'Luca');
  // un conto non pronto non apre niente, e Stripe non si chiama
  contiDonazioni.set('andry', { pronto: false });
  assert.deepEqual(await ds.apriPagamento({ login: 'andry', importoCent: 500 }), { errore: 'conto' });
  assert.equal(chiamate.length, 1);
  contiDonazioni.set('andry', { pronto: true });
});

test('la conferma: Stripe dice pagata, si conta una volta sola e si tiene il riferimento; la scaduta si chiude; quel che non e\' nostro non esiste', async () => {
  let stato = 'paid';
  const chiamate = stripeFinto((c) => {
    if (c.metodo === 'GET' && c.path.startsWith('/v1/checkout/sessions/')) {
      assert.equal(c.intestazioni.Authorization, 'Bearer ' + CHIAVE);
      return { body: stato === 'paid' ? { id: 'cs_1', payment_status: 'paid', status: 'complete', amount_total: 500, payment_intent: 'pi_1' } : { id: 'cs_x', payment_status: 'unpaid', status: stato } };
    }
    return null;
  });
  const prima = await ds.conferma('andry', 'cs_1');
  assert.equal(prima.nuova, true);
  assert.deepEqual(prima.d, { id: 'stripe:cs_1', fonte: 'stripe', user: 'Luca', importo: 5, valuta: 'EUR', messaggio: 'grande live' });
  assert.equal(registroDonazioni.get('stripe:cs_1').riferimento, 'pi_1', 'il pagamento di Stripe, per rimborsare da qui');
  const seconda = await ds.conferma('andry', 'cs_1');
  assert.equal(seconda.nuova, false, 'chi ricarica rivede il grazie, non fa partire un altro avviso');
  assert.equal(chiamate.length, 1, 'una pagata non si richiede a Stripe');
  assert.equal(await ds.conferma('altro', 'cs_1'), null, 'la sessione di un altro canale non esiste');
  assert.equal(await ds.conferma('andry', 'cs_mai_vista'), null, 'un id che non abbiamo aperto noi non si chiede nemmeno');
  assert.equal(chiamate.length, 1);
  registroDonazioni.apri('stripe:cs_2', { login: 'andry', importo: 200 });
  stato = 'open';
  assert.equal(await ds.conferma('andry', 'cs_2'), null);
  assert.equal(registroDonazioni.get('stripe:cs_2').stato, 'attesa');
  stato = 'expired';
  assert.equal(await ds.conferma('andry', 'cs_2'), null);
  assert.equal(registroDonazioni.get('stripe:cs_2').stato, 'scaduta');
});

test('una chiave revocata si scopre alla verifica e si spiega; una che risponde torna pronta', async () => {
  stripeFinto((c) => (c.path === '/v1/products/prod_1' ? rifiuto(401, 'Invalid API Key provided: rk_test_******') : null));
  const c = await ds.verificaChiave('andry');
  assert.equal(c.pronto, 0); assert.equal(ds.statoDi(c), 'incompleto');
  assert.match(c.nota, /revocata/);
  stripeFinto((c) => (c.path === '/v1/products/prod_1' ? { body: { id: 'prod_1' } } : null));
  const d = await ds.verificaChiave('andry');
  assert.equal(d.pronto, 1); assert.equal(d.nota, '');
  assert.equal(await ds.verificaChiave('nessuno'), null);
});

test('il rimborso passa dalla sua chiave: senza il permesso lo dice, con il permesso segna la riga', async () => {
  let permesso = false;
  const chiamate = stripeFinto((c) => (c.metodo === 'POST' && c.path === '/v1/refunds'
    ? (permesso ? { body: { id: 're_1', status: 'succeeded' } } : rifiuto(403, 'This API key does not have the required permissions: rak_refund_write'))
    : null));
  const no = await ds.rimborsa('andry', 'stripe:cs_1');
  assert.match(no.errore, /permesso «Refunds»/);
  assert.equal(registroDonazioni.get('stripe:cs_1').rimborsata_at, 0);
  assert.equal(contiDonazioni.get('andry').pronto, 1, 'un permesso in meno per i rimborsi non ferma le donazioni');
  permesso = true;
  assert.deepEqual(await ds.rimborsa('andry', 'stripe:cs_1'), { ok: true });
  assert.equal(chiamate.pop().corpo.payment_intent, 'pi_1');
  assert.ok(registroDonazioni.get('stripe:cs_1').rimborsata_at > 0);
  assert.match((await ds.rimborsa('andry', 'stripe:cs_1')).errore, /Gia' rimborsata/);
  registroDonazioni.segna('kofi:andry:m1', { login: 'andry', fonte: 'kofi', importo: 300 });
  assert.match((await ds.rimborsa('andry', 'kofi:andry:m1')).errore, /non e' passata dal tuo conto Stripe/);
  assert.match((await ds.rimborsa('andry', 'stripe:mai')).errore, /non c'e' piu'/);
});

test('la ronda trova le pagate e avvisa, lascia scadere le vecchie, ignora il resto', async () => {
  registroDonazioni.apri('stripe:cs_3', { login: 'andry', importo: 1000, nome: 'Giada' });
  registroDonazioni.apri('stripe:cs_4', { login: 'andry', importo: 100 });
  const chiamate = stripeFinto((c) => {
    if (c.path === '/v1/checkout/sessions/cs_3') return { body: { payment_status: 'paid', status: 'complete', amount_total: 1000, payment_intent: 'pi_3' } };
    if (c.path === '/v1/checkout/sessions/cs_4') return { body: { payment_status: 'unpaid', status: 'open' } };
    return null;
  });
  const avvisi = [];
  const n = await ds.ronda((login, d) => avvisi.push([login, d.user, d.importo]));
  assert.equal(n, 1);
  assert.deepEqual(avvisi, [['andry', 'Giada', 10]]);
  assert.equal(chiamate.length, 2, 'solo le due in attesa: la mancia di Ko-fi e\' gia\' pagata');
  assert.equal(registroDonazioni.get('stripe:cs_4').stato, 'attesa');
  const dopo = await ds.ronda(() => { throw new Error('non deve avvisare'); }, Date.now() + 2 * 3600_000);
  assert.equal(dopo, 0);
  assert.equal(registroDonazioni.get('stripe:cs_4').stato, 'scaduta');
  assert.equal(chiamate.length, 2);
});

test('il registro: doppioni fuori, una sola volta pagata, elenco a pagine, riepilogo senza le rimborsate, cancellazione', () => {
  assert.equal(registroDonazioni.segna('kofi:andry:m2', { login: 'andry', fonte: 'kofi', importo: 250, nome: 'Zoe' }), true);
  assert.equal(registroDonazioni.segna('kofi:andry:m2', { login: 'andry', fonte: 'kofi', importo: 250, nome: 'Zoe' }), false, 'il ritentativo di Ko-fi si scarta');
  assert.equal(registroDonazioni.paga('kofi:andry:m2'), false, 'una gia\' pagata non si paga di nuovo');
  assert.equal(registroDonazioni.apri('stripe:cs_1', { login: 'andry', importo: 1 }), false, 'una sessione gia\' nota non si riapre');
  const tutte = registroDonazioni.elenco('andry', { n: 2 });
  assert.equal(tutte.length, 2); assert.equal(tutte[0].nome, 'Zoe', 'la piu\' recente per prima');
  const dopo = registroDonazioni.elenco('andry', { n: 10, prima: tutte[1].pagata_at });
  assert.ok(dopo.length >= 1 && dopo.every((r) => r.pagata_at < tutte[1].pagata_at), 'la pagina dopo continua da dove si era');
  const rp = registroDonazioni.riepilogo('andry');
  // pagate: cs_1 (500, rimborsata), cs_3 (1000), kofi m1 (300), kofi m2 (250) → senza la rimborsata: 1550 in 3
  assert.deepEqual(rp.oggi, [{ valuta: 'EUR', somma: 1550, quante: 3 }]);
  assert.deepEqual(rp.sempre, rp.oggi);
  assert.equal(registroDonazioni.elimina('altro', 'kofi:andry:m2'), false, 'un altro canale non cancella le mie');
  assert.equal(registroDonazioni.elimina('andry', 'kofi:andry:m2'), true);
  assert.equal(registroDonazioni.getDi('andry', 'kofi:andry:m2'), null);
  assert.equal(registroDonazioni.elenco('nessuno').length, 0);
});
