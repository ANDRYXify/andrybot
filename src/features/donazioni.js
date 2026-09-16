// LE DONAZIONI VERSO LO STREAMER.
//
// Una configurazione sola: dove si dona (il link della pagina Ko-fi, PayPal,
// Streamlabs… dello streamer), come si chiama il tasto, una frase, la valuta,
// l'avviso in chat. Del token con cui Ko-fi firma i suoi avvisi si conserva
// l'IMPRONTA, mai il token: chi legge il database non puo' fingersi Ko-fi.
//
// Una donazione e' un evento come un follow: arriva dal webhook di Ko-fi (o da
// una automazione dello streamer via /api/ext), fa crescere l'obiettivo in
// euro, spara l'alert e, se acceso, scrive in chat. Il tasto sulla pagina link
// e' un blocco che legge questa configurazione: si imposta una volta sola.
import { impronta } from '../segreti.js';

export const VALUTE = ['EUR', 'USD', 'GBP'];
const SIMBOLO = { EUR: '€', USD: '$', GBP: '£' };
const L = { link: 400, etichetta: 40, messaggio: 160, testoChat: 200 };

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
function urlOk(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  try {
    const x = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    if (x.protocol !== 'https:') return '';
    return x.href.slice(0, L.link);
  } catch { return ''; }
}

// «5,00 €», «$5», «£12.50»: in euro si scrive all'italiana, nelle altre valute
// con il simbolo davanti e il punto, com'e' d'uso.
export function formattaImporto(n, valuta = 'EUR') {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const cifra = Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (valuta === 'EUR') return cifra.replace('.', ',') + ' €';
  return (SIMBOLO[valuta] || valuta + ' ') + cifra;
}

// La configurazione, ripulita. `prima` e' quella salvata: il token arriva in
// chiaro una volta sola e diventa impronta; senza un token nuovo resta quella
// di prima; `kofiTokenClear` la toglie.
export function normDonazioni(d, prima = {}, login = '') {
  d = (d && typeof d === 'object') ? d : {};
  const p = (prima && typeof prima === 'object') ? prima : {};
  const nuovo = str(d.kofiToken, 200);
  return {
    attivo: d.attivo === true,
    link: urlOk(d.link),
    etichetta: str(d.etichetta, L.etichetta),
    messaggio: str(d.messaggio, L.messaggio),
    valuta: VALUTE.includes(d.valuta) ? d.valuta : 'EUR',
    annunciaChat: d.annunciaChat === true,
    testoChat: str(d.testoChat, L.testoChat),
    kofiImp: d.kofiTokenClear === true ? '' : (nuovo ? impronta(nuovo, login) : String(p.kofiImp || '')),
  };
}

// Il corpo che manda Ko-fi: un modulo con il campo `data`, dentro un JSON.
// Torna la donazione letta, o null se non e' una donazione leggibile.
export function leggiKofi(body) {
  const grezzo = body && body.data;
  if (!grezzo) return null;
  let j;
  try { j = typeof grezzo === 'string' ? JSON.parse(grezzo) : grezzo; } catch { return null; }
  if (!j || typeof j !== 'object') return null;
  const importo = Math.round(Number(j.amount) * 100) / 100;
  if (!Number.isFinite(importo) || importo <= 0) return null;
  return {
    token: String(j.verification_token || ''),
    id: String(j.message_id || j.kofi_transaction_id || '').slice(0, 80),
    tipo: String(j.type || 'Donation'),
    user: str(j.from_name, 60) || 'qualcuno',
    importo,
    valuta: String(j.currency || 'EUR').toUpperCase().slice(0, 3),
    messaggio: j.is_public === false ? '' : str(j.message, 200),
  };
}

// Ko-fi ritenta se non riceve 200 in tempo, e allo stesso avviso da' sempre lo
// stesso message_id: la seconda volta non si conta. Un'ora di memoria basta.
const _visti = new Map();
export function nuova(id, ora = Date.now()) {
  if (!id) return true;
  for (const [k, t] of _visti) if (ora - t > 3600_000) _visti.delete(k);
  if (_visti.has(id)) return false;
  if (_visti.size >= 1000) _visti.delete(_visti.keys().next().value);
  _visti.set(id, ora);
  return true;
}

// Quello che serve al blocco «Sostieni» della pagina link: il link, il tasto,
// la frase e, se c'e' un obiettivo in euro acceso, dove sta.
export function datiSostieni(settings) {
  const s = settings || {};
  const d = s.donazioni;
  if (!d || d.attivo !== true || !d.link) return null;
  const goals = Array.isArray(s.overlayGoals) ? s.overlayGoals : [];
  const g = goals.find((x) => x && x.attivo !== false && x.tipo === 'euro');
  const conti = (s.overlayStato && s.overlayStato.goals) || {};
  const ora = g ? Math.round(((Number(g.partenza) || 0) + (Number(conti[g.id]) || 0)) * 100) / 100 : 0;
  return {
    link: d.link,
    etichetta: d.etichetta || 'Sostieni',
    messaggio: d.messaggio || '',
    valuta: d.valuta || 'EUR',
    goal: g ? { ora, meta: Math.max(1, Number(g.obiettivo) || 100), titolo: g.titolo || '' } : null,
  };
}

// Una mancia mandata con la chiave API del canale: un'automazione dello
// streamer (Streamlabs, StreamElements, PayPal…) che ci passa importo e nome.
export function leggiEsterna(body) {
  const b = body && typeof body === 'object' ? body : {};
  const importo = Math.round(Number(b.importo ?? b.amount) * 100) / 100;
  if (!Number.isFinite(importo) || importo <= 0) return null;
  const val = String(b.valuta || b.currency || '').toUpperCase();
  return {
    id: str(b.id, 80),
    user: str(b.user || b.nome || b.from_name, 60) || 'qualcuno',
    importo,
    valuta: VALUTE.includes(val) ? val : '',
    messaggio: str(b.messaggio || b.message, 200),
  };
}
