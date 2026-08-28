// LA FIRMA DEI WEBHOOK DI KICK.
//
// Il nostro indirizzo webhook è pubblico per forza: Kick deve poterlo
// raggiungere. Quindi chiunque lo trovi può mandarci finti eventi — un finto
// messaggio in chat, un finto follow, un finto comando eseguito a nome di uno
// streamer. L'unica cosa che distingue Kick da un impostore è la FIRMA.
//
// Kick firma con RSA-SHA256. La cosa che si firma NON è solo il corpo: è
// «id.timestamp.corpo» concatenato con dei punti, dove id e timestamp arrivano
// dagli header. Firmare solo il corpo lascerebbe passare il REPLAY: un evento
// vero, catturato e rispedito mille volte.
//
// La chiave pubblica si prende una volta da Kick e si tiene in cache: è pubblica
// per definizione, ma è comunque l'unica cosa che regge tutto, quindi si scarica
// solo in HTTPS dal dominio di Kick e mai da un indirizzo che arriva da fuori.
import crypto from 'node:crypto';
import { makeLog } from '../logger.js';

const log = makeLog('kick');

export const URL_CHIAVE = 'https://api.kick.com/public/v1/public-key';

// Quanto può essere vecchio un evento prima di essere considerato un replay.
// Largo abbastanza da sopravvivere a un orologio storto e a una consegna lenta,
// stretto abbastanza da non lasciare una finestra comoda a nessuno.
export const FINESTRA_MS = 10 * 60 * 1000;

// Cosa viene firmato: id.timestamp.corpo — il corpo GREZZO, byte per byte, non
// il JSON riserializzato (riserializzare cambia gli spazi e la firma non torna).
export function daFirmare({ id, timestamp, corpo }) {
  return `${id}.${timestamp}.${corpo}`;
}

// Verifica pura: niente rete, niente stato. Ritorna { ok } oppure { ok:false, motivo }.
export function verificaFirma({ chiavePubblica, id, timestamp, corpo, firma, ora = Date.now() }) {
  if (!chiavePubblica) return { ok: false, motivo: 'chiave pubblica di Kick non disponibile' };
  if (!id || !timestamp || !firma) return { ok: false, motivo: 'mancano gli header della firma' };

  const t = Date.parse(timestamp);
  if (!Number.isFinite(t)) return { ok: false, motivo: 'timestamp non leggibile' };
  const eta = Math.abs(ora - t);
  if (eta > FINESTRA_MS) return { ok: false, motivo: `evento troppo vecchio o nel futuro (${Math.round(eta / 1000)}s)` };

  let firmaBin;
  try { firmaBin = Buffer.from(String(firma), 'base64'); } catch { return { ok: false, motivo: 'firma non in base64' }; }
  if (!firmaBin.length) return { ok: false, motivo: 'firma vuota' };

  try {
    const v = crypto.createVerify('RSA-SHA256');
    v.update(daFirmare({ id, timestamp, corpo }));
    v.end();
    return v.verify(chiavePubblica, firmaBin) ? { ok: true } : { ok: false, motivo: 'firma non valida' };
  } catch (e) {
    return { ok: false, motivo: 'verifica fallita: ' + (e?.message || e) };
  }
}

// La chiave pubblica di Kick, presa una volta e tenuta in cache. Si ritenta con
// calma se fallisce: senza chiave NON si accetta niente, quindi è meglio
// riprovare che accettare alla cieca.
let _chiave = null;
let _presaAlle = 0;
const RIPROVA_MS = 5 * 60 * 1000;

export async function chiavePubblica({ fetchImpl = fetch } = {}) {
  if (_chiave) return _chiave;
  if (Date.now() - _presaAlle < RIPROVA_MS) return null;
  _presaAlle = Date.now();
  try {
    const r = await fetchImpl(URL_CHIAVE, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const pem = j?.data?.public_key || j?.public_key || '';
    if (!/BEGIN PUBLIC KEY/.test(pem)) throw new Error('risposta senza chiave PEM');
    _chiave = pem;
    log.info('chiave pubblica di Kick presa e messa da parte');
    return _chiave;
  } catch (e) {
    log.error('non riesco a prendere la chiave pubblica di Kick:', e?.message || e);
    return null;
  }
}

// Solo per il collaudo: rimette lo stato come appena avviato.
export function _azzeraChiave(pem = null) { _chiave = pem; _presaAlle = 0; }
