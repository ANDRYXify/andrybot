// IL CONTO DELLO STREAMER E I PAGAMENTI, con uno Stripe finto: il conto si
// crea Standard nel paese scelto e la registrazione ha i due ritorni; il
// pagamento nasce SUL SUO conto con l'importo, la quota e il ritorno giusti;
// la conferma conta una volta sola; la sessione scaduta si chiude; la ronda
// trova le pagate e lascia scadere le vecchie; il registro scarta i doppioni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

// il database si apre in una cartella usa e getta: queste prove non toccano i dati veri
const usaEGetta = cartellaUsaEGetta('andrybot-donazioni-stripe-');
const { config } = await import('../../src/config.js');
config.stripe.secretKey = 'sk_test_finta';
config.donazioni.attivo = true;
config.donazioni.quotaPct = 0;
config.baseUrl = 'https://prova.example';
const ds = await import('../../src/features/donazioni-stripe.js');
const { contiDonazioni, registroDonazioni } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

// uno Stripe finto: `risposte(metodo, path, corpo, intestazioni)` decide; ogni chiamata resta annotata
function stripeFinto(risposte) {
  const chiamate = [];
  globalThis.fetch = async (url, opz = {}) => {
    const u = new URL(url);
    const corpo = opz.body ? Object.fromEntries(new URLSearchParams(String(opz.body))) : null;
    const c = { metodo: opz.method || 'GET', path: u.pathname, corpo, intestazioni: opz.headers || {} };
    chiamate.push(c);
    assert.equal(c.intestazioni.Authorization, 'Bearer sk_test_finta');
    const r = risposte(c);
    if (!r) throw new Error('chiamata non prevista ' + c.metodo + ' ' + c.path);
    return { ok: (r.status || 200) < 400, status: r.status || 200, json: async () => r.body };
  };
  return chiamate;
}
const fetchVero = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = fetchVero; });

test('il conto si crea Standard nel paese scelto, una volta sola, e la registrazione torna da noi', async () => {
  const chiamate = stripeFinto((c) => {
    if (c.metodo === 'POST' && c.path === '/v1/accounts') return { body: { id: 'acct_1' } };
    if (c.metodo === 'POST' && c.path === '/v1/account_links') return { body: { url: 'https://connect.stripe.com/setup/x' } };
    return null;
  });
  const r = await ds.collegaConto('Andry', 'DE');
  assert.equal(r.url, 'https://connect.stripe.com/setup/x');
  assert.deepEqual(chiamate[0].corpo, { type: 'standard', country: 'DE', 'metadata[login]': 'andry' }, 'un conto Standard, nel suo paese, col suo nome');
  assert.equal(chiamate[1].corpo.account, 'acct_1');
  assert.equal(chiamate[1].corpo.type, 'account_onboarding');
  assert.equal(chiamate[1].corpo.refresh_url, 'https://prova.example/api/donazioni/conto/riprendi');
  assert.equal(chiamate[1].corpo.return_url, 'https://prova.example/api/donazioni/conto/ritorno');
  const c = contiDonazioni.get('andry');
  assert.equal(c.stripe_account, 'acct_1'); assert.equal(c.paese, 'DE'); assert.equal(c.pronto, 0);
  assert.equal(ds.statoDi(c), 'incompleto');
  // la seconda volta il conto c'e' gia': solo la pagina di registrazione
  await ds.collegaConto('andry', 'FR');
  assert.equal(chiamate.filter((x) => x.path === '/v1/accounts').length, 1);
  assert.equal(contiDonazioni.get('andry').paese, 'DE', 'il paese non cambia dopo');
  assert.equal(ds.paeseOk('XX'), 'IT', 'un paese sconosciuto diventa Italia');
});

test('lo stato si rilegge da Stripe; un conto che Stripe non conosce piu\' si dimentica', async () => {
  let vivo = true;
  stripeFinto((c) => {
    if (c.metodo === 'GET' && c.path === '/v1/accounts/acct_1') return vivo
      ? { body: { id: 'acct_1', charges_enabled: true, details_submitted: true } }
      : { status: 404, body: { error: { code: 'account_invalid', message: 'No such account' } } };
    return null;
  });
  const c = await ds.aggiornaStato('andry');
  assert.equal(c.pronto, 1); assert.equal(c.dettagli, 1); assert.ok(c.verificato_at > 0);
  assert.equal(ds.statoDi(c), 'pronto');
  vivo = false;
  assert.equal(await ds.aggiornaStato('andry'), null);
  assert.equal(contiDonazioni.get('andry'), null, 'dimenticato');
  assert.equal(ds.statoDi(null), 'nessuno');
  contiDonazioni.set('andry', { account: 'acct_1', paese: 'DE', pronto: true, dettagli: true });
});

test('il pagamento nasce sul conto dello streamer, con importo, quota e ritorno giusti, e il registro lo aspetta', async () => {
  config.donazioni.quotaPct = 5;
  const chiamate = stripeFinto((c) => {
    if (c.metodo === 'POST' && c.path === '/v1/checkout/sessions') return { body: { id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' } };
    return null;
  });
  const r = await ds.apriPagamento({ login: 'andry', display: 'Andry', importoCent: 500, valuta: 'EUR', nome: 'Luca', messaggio: 'grande live' });
  assert.deepEqual(r, { url: 'https://checkout.stripe.com/c/cs_1', id: 'cs_1' });
  const c = chiamate[0];
  assert.equal(c.intestazioni['Stripe-Account'], 'acct_1', 'sul SUO conto');
  assert.equal(c.corpo.mode, 'payment'); assert.equal(c.corpo.submit_type, 'donate');
  assert.equal(c.corpo['line_items[0][price_data][currency]'], 'eur');
  assert.equal(c.corpo['line_items[0][price_data][unit_amount]'], '500');
  assert.equal(c.corpo['line_items[0][price_data][product_data][name]'], 'Donazione a Andry');
  assert.equal(c.corpo['payment_intent_data[application_fee_amount]'], '25', 'il 5% di 5 €');
  assert.equal(c.corpo['metadata[nome]'], 'Luca'); assert.equal(c.corpo['metadata[messaggio]'], 'grande live');
  assert.equal(c.corpo.success_url, 'https://prova.example/u/andry?dona={CHECKOUT_SESSION_ID}');
  assert.equal(c.corpo.cancel_url, 'https://prova.example/u/andry?dona=annullata');
  assert.ok(Number(c.corpo.expires_at) > Date.now() / 1000 + 3000, 'scade fra un\'ora');
  const riga = registroDonazioni.get('stripe:cs_1');
  assert.equal(riga.stato, 'attesa'); assert.equal(riga.importo, 500); assert.equal(riga.nome, 'Luca');
  // senza quota, niente application fee
  config.donazioni.quotaPct = 0;
  await ds.apriPagamento({ login: 'andry', display: 'Andry', importoCent: 300 });
  assert.ok(!('payment_intent_data[application_fee_amount]' in chiamate[1].corpo));
  assert.equal(ds.quota(500), 0);
  // un conto non pronto non apre niente, e Stripe non si chiama
  contiDonazioni.set('andry', { pronto: false });
  assert.deepEqual(await ds.apriPagamento({ login: 'andry', importoCent: 500 }), { errore: 'conto' });
  assert.equal(chiamate.length, 2);
  contiDonazioni.set('andry', { pronto: true });
});

test('la conferma: Stripe dice pagata, si conta una volta sola; la scaduta si chiude; quel che non e\' nostro non esiste', async () => {
  let stato = 'paid';
  const chiamate = stripeFinto((c) => {
    if (c.metodo === 'GET' && c.path.startsWith('/v1/checkout/sessions/')) {
      assert.equal(c.intestazioni['Stripe-Account'], 'acct_1');
      return { body: stato === 'paid' ? { id: 'cs_1', payment_status: 'paid', status: 'complete', amount_total: 500 } : { id: 'cs_x', payment_status: 'unpaid', status: stato } };
    }
    return null;
  });
  const prima = await ds.conferma('andry', 'cs_1');
  assert.equal(prima.nuova, true);
  assert.deepEqual(prima.d, { id: 'stripe:cs_1', fonte: 'stripe', user: 'Luca', importo: 5, valuta: 'EUR', messaggio: 'grande live' });
  const seconda = await ds.conferma('andry', 'cs_1');
  assert.equal(seconda.nuova, false, 'chi ricarica rivede il grazie, non fa partire un altro avviso');
  assert.equal(chiamate.length, 1, 'una pagata non si richiede a Stripe');
  assert.equal(await ds.conferma('altro', 'cs_1'), null, 'la sessione di un altro canale non esiste');
  assert.equal(await ds.conferma('andry', 'cs_mai_vista'), null, 'un id che non abbiamo aperto noi non si chiede nemmeno');
  assert.equal(chiamate.length, 1);
  // una aperta ma non ancora pagata: niente; una scaduta: si chiude
  registroDonazioni.apri('stripe:cs_2', { login: 'andry', importo: 200 });
  stato = 'open';
  assert.equal(await ds.conferma('andry', 'cs_2'), null);
  assert.equal(registroDonazioni.get('stripe:cs_2').stato, 'attesa');
  stato = 'expired';
  assert.equal(await ds.conferma('andry', 'cs_2'), null);
  assert.equal(registroDonazioni.get('stripe:cs_2').stato, 'scaduta');
});

test('la ronda trova le pagate e avvisa, lascia scadere le vecchie, ignora il resto', async () => {
  registroDonazioni.apri('stripe:cs_3', { login: 'andry', importo: 1000, nome: 'Giada' });
  registroDonazioni.apri('stripe:cs_4', { login: 'andry', importo: 100 });
  registroDonazioni.segna('kofi:andry:m1', { login: 'andry', fonte: 'kofi', importo: 300 });
  const chiamate = stripeFinto((c) => {
    if (c.path === '/v1/checkout/sessions/cs_3') return { body: { payment_status: 'paid', status: 'complete', amount_total: 1000 } };
    if (c.path === '/v1/checkout/sessions/cs_4') return { body: { payment_status: 'unpaid', status: 'open' } };
    return null;
  });
  const avvisi = [];
  const n = await ds.ronda((login, d) => avvisi.push([login, d.user, d.importo]));
  assert.equal(n, 1);
  assert.deepEqual(avvisi, [['andry', 'Giada', 10]]);
  assert.equal(chiamate.length, 2, 'solo le due in attesa: la mancia di Ko-fi e\' gia\' pagata');
  assert.equal(registroDonazioni.get('stripe:cs_4').stato, 'attesa');
  // due ore dopo, quella ancora aperta e' scaduta senza chiedere niente
  const dopo = await ds.ronda(() => { throw new Error('non deve avvisare'); }, Date.now() + 2 * 3600_000);
  assert.equal(dopo, 0);
  assert.equal(registroDonazioni.get('stripe:cs_4').stato, 'scaduta');
  assert.equal(chiamate.length, 2);
});

test('il registro: i doppioni non entrano, si paga una volta sola, le ultime e i totali', () => {
  assert.equal(registroDonazioni.segna('kofi:andry:m2', { login: 'andry', fonte: 'kofi', importo: 250, nome: 'Zoe' }), true);
  assert.equal(registroDonazioni.segna('kofi:andry:m2', { login: 'andry', fonte: 'kofi', importo: 250, nome: 'Zoe' }), false, 'il ritentativo di Ko-fi si scarta');
  assert.equal(registroDonazioni.paga('kofi:andry:m2'), false, 'una gia\' pagata non si paga di nuovo');
  assert.equal(registroDonazioni.apri('stripe:cs_1', { login: 'andry', importo: 1 }), false, 'una sessione gia\' nota non si riapre');
  const ultime = registroDonazioni.ultime('andry', 3);
  assert.equal(ultime.length, 3);
  assert.ok(ultime.every((r) => r.stato === 'pagata'));
  assert.equal(ultime[0].nome, 'Zoe', 'la piu\' recente per prima');
  const tot = registroDonazioni.totali('andry');
  assert.deepEqual(tot, [{ valuta: 'EUR', somma: 500 + 1000 + 300 + 250, quante: 4 }]);
  assert.equal(registroDonazioni.ultime('nessuno').length, 0);
});
