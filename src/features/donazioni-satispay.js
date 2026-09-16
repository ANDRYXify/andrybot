// IL CONTO SATISPAY BUSINESS DELLO STREAMER, e le donazioni che ci arrivano.
//
// Il conto e' SUO. Nel suo pannello Business apre un «negozio online» di tipo
// API e genera un codice di attivazione, che vale una volta sola. Con quel
// codice registriamo presso Satispay una chiave pubblica nostra, fatta apposta
// per lui: Satispay ci risponde con un KeyId, e da li' in poi ogni richiesta
// sul suo conto si firma con la chiave privata (che sta nella busta del
// database). Niente password, niente accesso al suo pannello: solo pagamenti
// e rimborsi, firmati. Il negozio online lo disattiva lui quando vuole.
//
// Il pagamento: si crea con flusso MATCH_CODE, si manda il donatore alla
// pagina di Satispay (dal telefono si apre l'app, dal computer un QR), e al
// ritorno sulla pagina link si rilegge il pagamento: ACCEPTED e' pagato. La
// callback di Satispay (un GET con l'id) e la ronda coprono chi non torna.
// Una donazione si conta una volta sola, nel registro comune.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { contiSatispay, registroDonazioni } from '../db.js';
import { urlPaginaDona } from './donazioni.js';

const log = makeLog('satispay');
const HOST = () => String(config.satispay?.host || 'https://authservices.satispay.com').replace(/\/+$/, '');
export const SCADENZA_MS = 60 * 60 * 1000;
export const CODICE_OK = /^[A-Z0-9]{4,12}$/;

// «Mon, 18 Mar 2019 15:10:24 +0000»: la data come la vuole la firma
export function dataFirma(d = new Date()) {
  const G = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n) => String(n).padStart(2, '0');
  return `${G[d.getUTCDay()]}, ${p(d.getUTCDate())} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

// La firma di Satispay: la stringa «(request-target) host date digest»,
// firmata RSA-SHA256 con la chiave privata, in base64.
export function firma({ keyId, chiavePrivata, metodo, path, host, corpo = '', quando = new Date() }) {
  const digest = 'SHA-256=' + crypto.createHash('sha256').update(corpo, 'utf8').digest('base64');
  const date = dataFirma(quando);
  const stringa = `(request-target): ${metodo.toLowerCase()} ${path}\nhost: ${host}\ndate: ${date}\ndigest: ${digest}`;
  const signature = crypto.sign('sha256', Buffer.from(stringa, 'utf8'), chiavePrivata).toString('base64');
  return {
    Host: host, Date: date, Digest: digest,
    Authorization: `Signature keyId="${keyId}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`,
  };
}

async function chiama(c, metodo, path, corpo = null) {
  const url = new URL(HOST() + path);
  const testo = corpo ? JSON.stringify(corpo) : '';
  const headers = { ...firma({ keyId: c.key_id, chiavePrivata: c.chiave, metodo, path: url.pathname + url.search, host: url.host, corpo: testo }), Accept: 'application/json' };
  if (corpo) headers['Content-Type'] = 'application/json';
  try {
    const r = await fetch(url.href, { method: metodo, headers, body: corpo ? testo : undefined });
    const dati = await r.json().catch(() => null);
    if (!r.ok) {
      const errore = dati?.message || dati?.error || String(r.status);
      log.warn(`satispay ${metodo} ${path}: ${errore}`);
      return { ok: false, errore, codice: dati?.code, stato: r.status };
    }
    return { ok: true, dati };
  } catch (e) {
    log.warn(`satispay ${metodo} ${path}: irraggiungibile`, e?.message || e);
    return { ok: false, errore: 'irraggiungibile', stato: 0 };
  }
}
function spiegaRifiuto(r) {
  if (r.stato === 401 || r.stato === 403) return 'Satispay non accetta piu\' la firma: forse hai disattivato il negozio online. Genera un codice nuovo e ricollega.';
  return '';
}
function chiaveMorta(login, r) {
  const nota = spiegaRifiuto(r);
  if (nota) contiSatispay.set(login, { pronto: false, nota });
}

// Collega: si genera una coppia di chiavi, si registra la pubblica con il
// codice di attivazione, e si verifica subito la firma con una richiesta vera.
export async function collegaConto(login, codice) {
  login = String(login || '').toLowerCase();
  const tok = String(codice || '').trim().toUpperCase();
  if (!CODICE_OK.test(tok)) return { errore: 'Il codice di attivazione ha un\'altra forma: sono poche lettere e cifre, per esempio 6N3ECU.' };
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  let r;
  try {
    const x = await fetch(HOST() + '/g_business/v1/authentication_keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ public_key: publicKey, token: tok }),
    });
    const dati = await x.json().catch(() => null);
    r = x.ok ? { ok: true, dati } : { ok: false, errore: dati?.message || dati?.error || String(x.status), stato: x.status };
  } catch (e) { r = { ok: false, errore: 'irraggiungibile', stato: 0 }; }
  if (!r.ok || !r.dati?.key_id) {
    log.warn(`satispay attivazione @${login}: ${r.errore}`);
    return {
      errore: r.stato === 403 || r.stato === 400 ? 'Satispay non accetta questo codice: forse e\' gia\' stato usato (vale una volta sola) o e\' scaduto. Generane uno nuovo dal tuo pannello.'
        : 'Satispay non ha risposto come dovrebbe: riprova fra poco.',
      dettaglio: r.errore,
    };
  }
  let c = contiSatispay.set(login, { keyId: r.dati.key_id, chiave: privateKey, pronto: false, nota: '' });
  const v = await chiama(c, 'GET', '/g_business/v1/payments?limit=1');
  if (!v.ok) {
    contiSatispay.set(login, { pronto: false, nota: 'La chiave e\' registrata ma Satispay non accetta la firma: riprova fra un minuto, o genera un codice nuovo.' });
    return { errore: 'La chiave e\' registrata ma Satispay non accetta ancora la firma: riprova fra un minuto.', dettaglio: v.errore };
  }
  c = contiSatispay.set(login, { pronto: true, verificato: true, nota: '' });
  log.info(`conto Satispay collegato per @${login} (KeyId …${c.coda})`);
  return { ok: true, coda: c.coda };
}

export async function verificaChiave(login) {
  login = String(login || '').toLowerCase();
  const c = contiSatispay.get(login);
  if (!c?.chiave) return null;
  const r = await chiama(c, 'GET', '/g_business/v1/payments?limit=1');
  if (r.ok) return contiSatispay.set(login, { pronto: true, verificato: true, nota: '' });
  const nota = spiegaRifiuto(r);
  if (nota) return contiSatispay.set(login, { pronto: false, nota });
  return c;
}

export function statoDi(c) {
  if (!c?.chiave) return 'nessuno';
  return c.pronto ? 'pronto' : 'incompleto';
}
export function scollega(login) { contiSatispay.togli(login); }

// Apre il pagamento: la riga del registro nasce col NOSTRO id (satispay:<token>),
// che sta nel ritorno; l'id di Satispay va in `riferimento`, e la callback lo porta.
export async function apriPagamento({ login, display, importoCent, nome = '', messaggio = '', ritorno = 'link' }) {
  login = String(login || '').toLowerCase();
  const c = contiSatispay.get(login);
  if (!c?.chiave || !c.pronto) return { errore: 'conto' };
  const cent = Math.round(Number(importoCent) || 0);
  if (cent <= 0) return { errore: 'importo' };
  const token = crypto.randomBytes(8).toString('hex');
  const base = config.baseUrl;
  const chi = display || login;
  const r = await chiama(c, 'POST', '/g_business/v1/payments', {
    flow: 'MATCH_CODE',
    amount_unit: cent,
    currency: 'EUR',
    external_code: ('Donazione a ' + chi).slice(0, 50),
    callback_url: `${base}/dona/satispay/${login}?payment_id={uuid}`,
    redirect_url: `${ritorno === 'dona' ? urlPaginaDona(login) : base + '/u/' + login}?dona=sp_${token}`,
    expiration_date: new Date(Date.now() + SCADENZA_MS).toISOString(),
    metadata: { login, nome, messaggio, token },
  });
  if (!r.ok || !r.dati?.id || !r.dati?.redirect_url) { chiaveMorta(login, r); return { errore: 'satispay' }; }
  registroDonazioni.apri('satispay:' + token, { login, fonte: 'satispay', importo: cent, valuta: 'EUR', nome, messaggio, riferimento: r.dati.id });
  return { url: r.dati.redirect_url, id: token };
}

const evento = (r) => ({
  id: r.id, fonte: r.fonte, user: r.nome || 'qualcuno', importo: Math.round(r.importo) / 100,
  valuta: r.valuta, messaggio: r.messaggio || '',
});

// Conferma dal nostro id (quello del ritorno): rilegge il pagamento di Satispay
// e, se ACCEPTED, lo segna una volta sola. CANCELED o scaduto: si chiude.
export async function conferma(login, token) {
  login = String(login || '').toLowerCase();
  const id = 'satispay:' + token;
  const r = registroDonazioni.get(id);
  if (!r || r.login !== login) return null;
  if (r.stato === 'pagata') return { nuova: false, d: evento(r) };
  if (r.stato !== 'attesa' || !r.riferimento) return null;
  const c = contiSatispay.get(login);
  if (!c?.chiave) return null;
  const s = await chiama(c, 'GET', '/g_business/v1/payments/' + encodeURIComponent(r.riferimento));
  if (!s.ok) { chiaveMorta(login, s); return null; }
  if (s.dati.status === 'ACCEPTED') {
    const importo = Number.isFinite(s.dati.amount_unit) ? s.dati.amount_unit : r.importo;
    const nuova = registroDonazioni.paga(id, importo);
    return { nuova, d: evento({ ...r, importo }) };
  }
  if (s.dati.status === 'CANCELED' || s.dati.expired === true) registroDonazioni.scadi(id);
  return null;
}

// La callback porta l'id di Satispay: si risale alla riga e si conferma.
export async function confermaPerRiferimento(login, paymentId) {
  const r = registroDonazioni.perRiferimento(login, paymentId);
  if (!r || !r.id.startsWith('satispay:')) return null;
  return conferma(login, r.id.slice('satispay:'.length));
}

// Il rimborso e' un pagamento con flusso REFUND, figlio di quello originale.
export async function rimborsa(login, id) {
  login = String(login || '').toLowerCase();
  const r = registroDonazioni.getDi(login, id);
  if (!r || r.stato !== 'pagata') return { errore: 'Questa donazione non c\'e\' piu\'.' };
  if (r.rimborsata_at) return { errore: 'Gia\' rimborsata.' };
  if (r.fonte !== 'satispay' || !r.riferimento) return { errore: 'Questa donazione non e\' passata da Satispay.' };
  const c = contiSatispay.get(login);
  if (!c?.chiave) return { errore: 'Il conto Satispay non e\' collegato.' };
  const s = await chiama(c, 'POST', '/g_business/v1/payments', {
    flow: 'REFUND', amount_unit: r.importo, currency: 'EUR', parent_payment_uid: r.riferimento, external_code: 'Rimborso donazione',
  });
  if (!s.ok) {
    if (s.stato === 401) chiaveMorta(login, s);
    return { errore: 'Satispay non ha accettato il rimborso: riprova fra poco, o fallo dal tuo pannello Business.', dettaglio: s.errore };
  }
  registroDonazioni.rimborsa(login, id);
  log.info(`donazione Satispay rimborsata su #${login}: ${r.importo / 100} EUR`);
  return { ok: true };
}
