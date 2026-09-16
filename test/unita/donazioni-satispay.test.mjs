// IL CONTO SATISPAY DELLO STREAMER, con un Satispay finto: il codice di
// attivazione registra una chiave pubblica nostra e Satispay risponde con un
// KeyId; da li' ogni richiesta e' firmata, e la firma si verifica QUI con la
// chiave pubblica mandata alla registrazione (non si crede alla firma: la si
// controlla). Il pagamento nasce con ritorno e callback, si conferma una
// volta sola, la callback risale alla riga dal suo id, il rimborso e' un
// pagamento REFUND, e una firma rifiutata si spiega.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-donazioni-satispay-');
const { config } = await import('../../src/config.js');
config.baseUrl = 'https://prova.example';
config.satispay = { host: 'https://staging.authservices.satispay.com' };
const sp = await import('../../src/features/donazioni-satispay.js');
const { contiSatispay, registroDonazioni } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

let pubblica = '';   // la chiave pubblica che il modulo registra: con questa si verifica ogni firma
function verificaFirma(c) {
  const a = /keyId="([^"]+)", algorithm="rsa-sha256", headers="\(request-target\) host date digest", signature="([^"]+)"/.exec(c.intestazioni.Authorization || '');
  assert.ok(a, 'l\'intestazione Authorization ha la forma di Satispay');
  const u = new URL(c.url);
  const stringa = `(request-target): ${c.metodo.toLowerCase()} ${u.pathname}${u.search}\nhost: ${u.host}\ndate: ${c.intestazioni.Date}\ndigest: ${c.intestazioni.Digest}`;
  assert.ok(crypto.verify('sha256', Buffer.from(stringa, 'utf8'), pubblica, Buffer.from(a[2], 'base64')), 'la firma torna con la chiave pubblica registrata');
  assert.equal(c.intestazioni.Digest, 'SHA-256=' + crypto.createHash('sha256').update(c.corpoTesto || '', 'utf8').digest('base64'), 'il digest e\' del corpo');
  assert.match(c.intestazioni.Date, /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0000$/, 'la data nel formato della firma');
  return a[1];
}
function satispayFinto(risposte) {
  const chiamate = [];
  globalThis.fetch = async (url, opz = {}) => {
    const corpoTesto = opz.body ? String(opz.body) : '';
    const c = { url: String(url), metodo: opz.method || 'GET', corpoTesto, corpo: corpoTesto ? JSON.parse(corpoTesto) : null, intestazioni: opz.headers || {} };
    chiamate.push(c);
    const r = risposte(c);
    if (!r) throw new Error('chiamata non prevista ' + c.metodo + ' ' + c.url);
    return { ok: (r.status || 200) < 400, status: r.status || 200, json: async () => r.body };
  };
  return chiamate;
}
const fetchVero = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = fetchVero; });

test('il codice di attivazione registra la nostra chiave pubblica, Satispay da\' il KeyId, e la firma si verifica subito', async () => {
  assert.match((await sp.collegaConto('andry', 'x')).errore, /altra forma/);
  const chiamate = satispayFinto((c) => {
    if (c.metodo === 'POST' && c.url.endsWith('/g_business/v1/authentication_keys')) {
      assert.equal(c.corpo.token, '6N3ECU'); assert.ok(c.corpo.public_key.startsWith('-----BEGIN PUBLIC KEY-----'));
      pubblica = c.corpo.public_key;
      return { body: { key_id: 'key_abc123' } };
    }
    if (c.metodo === 'GET' && c.url.includes('/g_business/v1/payments?limit=1')) { assert.equal(verificaFirma(c), 'key_abc123'); return { body: { data: [] } }; }
    return null;
  });
  const r = await sp.collegaConto('andry', '6n3ecu');
  assert.deepEqual(r, { ok: true, coda: 'c123' });
  assert.equal(chiamate.length, 2, 'registrazione, poi una richiesta firmata di prova');
  assert.ok(!('Authorization' in chiamate[0].intestazioni), 'la registrazione non e\' firmata: la chiave nasce li\'');
  const c = contiSatispay.get('andry');
  assert.equal(c.key_id, 'key_abc123'); assert.equal(c.pronto, 1); assert.ok(c.chiave.includes('PRIVATE KEY'));
  assert.equal(sp.statoDi(c), 'pronto');
  // un codice gia' usato: Satispay dice 403, e niente si salva per l'altro canale
  satispayFinto((c) => (c.url.endsWith('/authentication_keys') ? { status: 403, body: { code: 45, message: 'Token already paired' } } : null));
  assert.match((await sp.collegaConto('altro', 'ABCDEF')).errore, /una volta sola/);
  assert.equal(contiSatispay.get('altro'), null);
});

test('il pagamento nasce con ritorno e callback, il registro tiene il nostro id e quello di Satispay', async () => {
  const chiamate = satispayFinto((c) => {
    if (c.metodo === 'POST' && c.url.endsWith('/g_business/v1/payments')) { verificaFirma(c); return { body: { id: 'pay_1', status: 'PENDING', redirect_url: 'https://online.satispay.com/pay/pay_1?redirect_url=x' } }; }
    return null;
  });
  const r = await sp.apriPagamento({ login: 'andry', display: 'Andry', importoCent: 500, nome: 'Luca', messaggio: 'grande live' });
  assert.equal(r.url, 'https://online.satispay.com/pay/pay_1?redirect_url=x');
  assert.match(r.id, /^[0-9a-f]{16}$/);
  const b = chiamate[0].corpo;
  assert.equal(b.flow, 'MATCH_CODE'); assert.equal(b.amount_unit, 500); assert.equal(b.currency, 'EUR');
  assert.equal(b.external_code, 'Donazione a Andry');
  assert.equal(b.callback_url, 'https://prova.example/dona/satispay/andry?payment_id={uuid}');
  assert.equal(b.redirect_url, 'https://prova.example/u/andry?dona=sp_' + r.id);
  assert.ok(new Date(b.expiration_date).getTime() > Date.now() + 3000_000, 'scade fra un\'ora');
  assert.equal(b.metadata.nome, 'Luca');
  const riga = registroDonazioni.get('satispay:' + r.id);
  assert.equal(riga.stato, 'attesa'); assert.equal(riga.fonte, 'satispay'); assert.equal(riga.riferimento, 'pay_1'); assert.equal(riga.importo, 500);
  assert.deepEqual(await sp.apriPagamento({ login: 'nessuno', importoCent: 500 }), { errore: 'conto' });
});

test('la conferma rilegge il pagamento firmando: ACCEPTED si conta una volta, la callback risale alla riga, CANCELED si chiude', async () => {
  const token = registroDonazioni.inAttesa().find((r) => r.id.startsWith('satispay:')).id.slice('satispay:'.length);
  let stato = 'PENDING';
  const chiamate = satispayFinto((c) => {
    if (c.metodo === 'GET' && c.url.includes('/g_business/v1/payments/pay_1')) { verificaFirma(c); return { body: { id: 'pay_1', status: stato, amount_unit: 500 } }; }
    if (c.metodo === 'GET' && c.url.includes('/g_business/v1/payments/pay_2')) { verificaFirma(c); return { body: { id: 'pay_2', status: 'CANCELED', amount_unit: 300 } }; }
    return null;
  });
  assert.equal(await sp.conferma('andry', token), null, 'ancora in attesa');
  stato = 'ACCEPTED';
  const cb = await sp.confermaPerRiferimento('andry', 'pay_1');
  assert.equal(cb.nuova, true, 'la callback, con l\'id di Satispay, conferma');
  assert.deepEqual(cb.d, { id: 'satispay:' + token, fonte: 'satispay', user: 'Luca', importo: 5, valuta: 'EUR', messaggio: 'grande live' });
  assert.equal((await sp.conferma('andry', token)).nuova, false, 'il ritorno dopo la callback rivede il grazie, non riconta');
  assert.equal(chiamate.length, 2, 'una pagata non si rilegge');
  assert.equal(await sp.confermaPerRiferimento('andry', 'pay_mai'), null);
  assert.equal(await sp.confermaPerRiferimento('altro', 'pay_1'), null, 'un altro canale non vede la riga');
  registroDonazioni.apri('satispay:aaaa', { login: 'andry', fonte: 'satispay', importo: 300, riferimento: 'pay_2' });
  assert.equal(await sp.conferma('andry', 'aaaa'), null);
  assert.equal(registroDonazioni.get('satispay:aaaa').stato, 'scaduta');
});

test('il rimborso e\' un pagamento REFUND figlio dell\'originale; una firma rifiutata spegne il conto e lo spiega', async () => {
  const id = registroDonazioni.ultime('andry', 1)[0].id;
  const chiamate = satispayFinto((c) => (c.metodo === 'POST' && c.url.endsWith('/g_business/v1/payments') ? { body: { id: 'pay_r', status: 'ACCEPTED' } } : null));
  assert.deepEqual(await sp.rimborsa('andry', id), { ok: true });
  assert.deepEqual(chiamate[0].corpo, { flow: 'REFUND', amount_unit: 500, currency: 'EUR', parent_payment_uid: 'pay_1', external_code: 'Rimborso donazione' });
  assert.ok(registroDonazioni.get(id).rimborsata_at > 0);
  assert.match((await sp.rimborsa('andry', id)).errore, /Gia' rimborsata/);
  satispayFinto(() => ({ status: 401, body: { message: 'Signature not valid' } }));
  const c = await sp.verificaChiave('andry');
  assert.equal(c.pronto, 0); assert.equal(sp.statoDi(c), 'incompleto'); assert.match(c.nota, /firma/);
  satispayFinto(() => ({ body: { data: [] } }));
  assert.equal((await sp.verificaChiave('andry')).pronto, 1);
  sp.scollega('andry');
  assert.equal(contiSatispay.get('andry'), null);
});
