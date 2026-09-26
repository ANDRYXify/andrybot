// SOSTENERE IL PROGETTO: quello che deve essere vero PRIMA di parlare con Stripe.
//
// Qui non si prova che il pagamento funziona — quello lo dice Stripe. Si prova
// che un importo scritto da un browser non diventa mai una cifra che non
// volevamo, che senza un conto la pagina lo dice invece di aprire un pagamento
// impossibile, e che lo stesso pagamento non si conta due volte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-sostegno-');
const { config } = await import('../../src/config.js');
config.baseUrl = 'https://socialbot.live';
const { sostegni } = await import('../../src/db.js');
const S = await import('../../src/features/sostegno.js');
process.on('exit', () => usaEGetta.pulisci());

const vero = globalThis.fetch;
const ripulisci = () => { globalThis.fetch = vero; };
const chiamate = [];
function finto(risposta) {
  chiamate.length = 0;
  globalThis.fetch = async (url, opz = {}) => {
    const corpo = {};
    if (opz.body) for (const [k, v] of new URLSearchParams(String(opz.body))) corpo[k] = v;
    chiamate.push({ url: String(url), metodo: opz.method || 'GET', corpo, testate: opz.headers || {} });
    const r = typeof risposta === 'function' ? risposta(String(url)) : risposta;
    return { ok: r.stato >= 200 && r.stato < 300, status: r.stato, json: async () => r.dati };
  };
}

test('un importo scritto a mano diventa centesimi, o niente', () => {
  assert.equal(S.centesimiDa('5'), 500);
  assert.equal(S.centesimiDa('7,50'), 750, 'la virgola e\' come si scrive in italiano');
  assert.equal(S.centesimiDa('7.50'), 750);
  assert.equal(S.centesimiDa(3), 300);
  for (const cattivo of ['', '  ', 'tanti', '-5', '0', '0,5', '99999', 'NaN', '1e9', null, undefined, {}]) {
    assert.equal(S.centesimiDa(cattivo), 0, `«${cattivo}» non e' un importo`);
  }
  assert.equal(S.centesimiDa('1'), 100, 'il minimo passa');
  assert.equal(S.centesimiDa('500'), 50000, 'e il massimo pure');
});

test('senza un conto su cui incassare non si apre niente, e lo si dice', async () => {
  const prima = config.stripe.secretKey;
  config.stripe.secretKey = '';
  finto({ stato: 200, dati: { id: 'cs_x', url: 'https://stripe/x' } });
  try {
    assert.equal(S.attivo(), false);
    const r = await S.apri({ importo: 5 });
    assert.ok(r.errore, 'una frase da leggere, non un silenzio');
    assert.equal(chiamate.length, 0, 'e non si e\' provato a chiamare Stripe lo stesso');
  } finally { config.stripe.secretKey = prima; ripulisci(); }
});

test('un importo fuori misura non arriva mai a Stripe', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { id: 'cs_x', url: 'https://stripe/x' } });
  try {
    for (const cattivo of ['0', '0,50', '9999999', 'gratis']) {
      const r = await S.apri({ importo: cattivo });
      assert.ok(r.errore, `«${cattivo}» doveva fermarsi qui`);
    }
    assert.equal(chiamate.length, 0);
  } finally { ripulisci(); }
});

test('il pagamento si apre sul conto di CASA, e descrive il prodotto senza averne uno', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { id: 'cs_uno', url: 'https://stripe/uno' } });
  try {
    const r = await S.apri({ importo: '5', nome: 'Tizio', messaggio: 'bravo' });
    assert.equal(r.url, 'https://stripe/uno');
    const c = chiamate[0];
    assert.equal(c.metodo, 'POST');
    assert.match(c.url, /\/checkout\/sessions$/);
    assert.equal(c.testate.Authorization, 'Bearer sk_test_prova', 'la chiave della piattaforma, non quella di uno streamer');
    assert.equal(c.corpo['line_items[0][price_data][unit_amount]'], '500');
    assert.equal(c.corpo['line_items[0][price_data][product_data][name]'], 'Sostegno a SocialBot',
      'il prodotto si descrive al volo: niente id da creare a mano su Stripe');
    assert.ok(!('line_items[0][price_data][product]' in c.corpo), 'e infatti nessun id di prodotto');
    assert.equal(c.corpo.mode, 'payment', 'un sostegno e\' una volta sola, non un abbonamento');
    assert.match(c.corpo.success_url, /^https:\/\/socialbot\.live\/sostieni\?ok=/);
    assert.equal(sostegni.get('stripe:cs_uno').stato, 'attesa', 'e resta scritto che quel pagamento lo abbiamo aperto noi');
  } finally { ripulisci(); }
});

// Col sottodominio acceso la pagina vive li', e /sostieni ci rimanda. Il ritorno
// da Stripe ci arriva diretto: il rimando buttava via ?ok=<sessione>, e chi
// aveva appena donato si ritrovava la pagina senza grazie e senza esito.
test('il pagamento torna all\'indirizzo vero della pagina, con la sua sessione', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  config.sostieniHost = 'sostieni.socialbot.live';
  finto({ stato: 200, dati: { id: 'cs_sotto', url: 'https://stripe/sotto' } });
  try {
    await S.apri({ importo: '5' });
    assert.equal(chiamate[0].corpo.success_url, 'https://sostieni.socialbot.live/?ok={CHECKOUT_SESSION_ID}');
    assert.equal(chiamate[0].corpo.cancel_url, 'https://sostieni.socialbot.live/?ok=annullato');
  } finally { config.sostieniHost = ''; ripulisci(); }
});

test('lo stesso pagamento non si conta due volte', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { id: 'cs_due', url: 'https://stripe/due' } });
  try {
    await S.apri({ importo: '10' });
    finto({ stato: 200, dati: { payment_status: 'paid', amount_total: 1000, payment_intent: 'pi_1' } });
    const a = await S.conferma('cs_due');
    assert.deepEqual([a.nuovo, a.importo], [true, 1000], 'il primo che lo vede pagato lo segna');
    const b = await S.conferma('cs_due');
    assert.equal(b.nuovo, false, 'il secondo lo trova gia\' segnato');
    assert.equal(sostegni.quanto().quanti, 1, 'e in cassa ne risulta uno');
  } finally { ripulisci(); }
});

test('una sessione che non abbiamo aperto noi non esiste', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { payment_status: 'paid', amount_total: 100000 } });
  try {
    assert.equal(await S.conferma('cs_inventata'), null, 'chi scrive un id a mano non si regala niente');
    assert.equal(chiamate.length, 0, 'e non si va nemmeno a chiederlo a Stripe');
  } finally { ripulisci(); }
});

test('una sessione non pagata resta in attesa, e una scaduta si chiude', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { id: 'cs_tre', url: 'https://stripe/tre' } });
  try {
    await S.apri({ importo: '3' });
    finto({ stato: 200, dati: { payment_status: 'unpaid', status: 'open' } });
    assert.equal(await S.conferma('cs_tre'), null);
    assert.equal(sostegni.get('stripe:cs_tre').stato, 'attesa');
    finto({ stato: 200, dati: { payment_status: 'unpaid', status: 'expired' } });
    assert.equal(await S.conferma('cs_tre'), null);
    assert.equal(sostegni.get('stripe:cs_tre').stato, 'scaduto');
  } finally { ripulisci(); }
});

test('chi paga e chiude la scheda non sparisce: lo trova la ronda', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { id: 'cs_quattro', url: 'https://stripe/quattro' } });
  try {
    await S.apri({ importo: '25' });
    finto({ stato: 200, dati: { payment_status: 'paid', amount_total: 2500, payment_intent: 'pi_4' } });
    // La ronda ripassa su TUTTE le sessioni rimaste in attesa, non solo su
    // questa: contarne una sola vorrebbe dire aspettarsi che le prove qui
    // sopra non abbiano lasciato niente indietro, che e' un'ipotesi sulle
    // prove e non sul codice.
    const contati = await S.ronda(Date.now() + 120_000);
    assert.ok(contati >= 1, 'la ronda trova chi ha pagato senza tornare sulla pagina');
    assert.equal(sostegni.get('stripe:cs_quattro').stato, 'pagato');
  } finally { ripulisci(); }
});

test('il nome e il messaggio si accorciano prima di partire, non dopo', async () => {
  config.stripe.secretKey = 'sk_test_prova';
  finto({ stato: 200, dati: { id: 'cs_cinque', url: 'https://stripe/cinque' } });
  try {
    await S.apri({ importo: '5', nome: 'x'.repeat(500), messaggio: 'y'.repeat(5000) });
    const c = chiamate[0];
    assert.equal(c.corpo['metadata[nome]'].length, 60);
    assert.equal(c.corpo['metadata[messaggio]'].length, 300);
  } finally { ripulisci(); }
});
