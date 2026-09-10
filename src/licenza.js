// licenza.js — questo software gira dove dice il proprietario, e in nessun altro posto.
//
// ONESTA' PRIMA DI TUTTO, perche' il resto sarebbe fumo. Se qualcuno ha il
// sorgente, NON esiste modo di rendere il codice ineseguibile: qualunque
// controllo si legge e si cancella. Non e' un limite di come e' scritto questo
// file, e' una proprieta' del sorgente. Chi promette il contrario mente.
//
// Quello che si puo' fare, ed e' molto:
//
//  1. NON FORGIABILE ≠ NON CANCELLABILE. La licenza e' firmata con una chiave
//     PRIVATA che non sta in nessun repository. Qui dentro c'e' solo la chiave
//     PUBBLICA, che si puo' pubblicare senza danno. Nessuno puo' FABBRICARSI una
//     licenza: e' matematica, non offuscamento. Puo' solo togliere il controllo —
//     che e' una cosa diversa, deliberata, e dimostrabile (l'impronta del
//     progetto cambia, e si vede quale file).
//  2. LEGATA AL POSTO. La licenza nomina il dominio, e scade. Copiata su un'altra
//     macchina non vale, e rifirmarla richiede la chiave privata.
//  3. E SE LA TOLGONO. Qui sta la parte che conta, ed e' il motivo per cui questo
//     non e' un `if`: chi cancella il controllo NON ottiene un software pulito.
//     Ottiene un software che dice di chi e', ad alta voce, in ogni punto in cui
//     si presenta — perche' il nome con cui si presenta lo prende DA QUI. Non c'e'
//     una riga da togliere: c'e' una sorgente da cui il software prende una cosa
//     che gli serve, e senza licenza quella cosa e' la firma del proprietario.
import { createPublicKey, verify } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { hostname } from 'node:os';
import { AUTORE, ALIAS, SITO, COPYRIGHT } from './watermark.js';

// La chiave PUBBLICA del proprietario. Si genera una volta sola, sulla sua
// macchina, con `node scripts/licenza.mjs --chiavi`: la privata resta li' e non
// entra mai in un repository; questa si incolla qui e puo' stare al sole.
// Finche' e' vuota il software parte lo stesso, ma dichiarando di chi e': non si
// blocca il proprietario prima che si sia fatto la chiave.
export const CHIAVE_PUBBLICA = '';

const ORA = () => Date.now();

// Base64url SEVERO. Quello di Node e' generoso: ignora i caratteri che non
// c'entrano e la coda che avanza, quindi due testi DIVERSI possono dare gli
// stessi byte. Su una firma vuol dire che una licenza ritoccata puo' risultare
// identica all'originale — e' come lo abbiamo scoperto: cambiato l'ultimo
// carattere della firma, «valida». Qui si pretende che i byte, ricodificati,
// tornino ESATTAMENTE il testo di partenza: una sola scrittura per ogni firma.
function b64u(s) {
  const t = String(s || '');
  if (!/^[A-Za-z0-9_-]+$/.test(t)) throw new Error('non e\' base64url');
  const b = Buffer.from(t.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== t) {
    throw new Error('scrittura non canonica');
  }
  return b;
}
// Una firma Ed25519 e' lunga 64 byte. Non «circa»: esattamente.
const FIRMA_BYTE = 64;

function testoLicenza() {
  const da = String(process.env.LICENZA || '').trim();
  if (da) return da;
  for (const f of ['licenza.txt', 'dati/licenza.txt']) {
    try { if (existsSync(f)) return readFileSync(f, 'utf8').trim(); } catch { /* niente */ }
  }
  return '';
}

// Verifica vera: firma, dominio, macchina, scadenza. Non lancia mai.
export function verifica({ dominio = '', adesso = ORA() } = {}) {
  if (!CHIAVE_PUBBLICA) return { stato: 'senza-chiave', motivo: 'il proprietario non ha ancora generato la sua chiave' };
  const testo = testoLicenza();
  if (!testo) return { stato: 'assente', motivo: 'nessuna licenza: serve quella firmata dal proprietario' };
  const [corpo, firma] = testo.split('.');
  if (!corpo || !firma) return { stato: 'rotta', motivo: 'la licenza non ha la forma di una licenza' };
  let dati;
  try {
    const f = b64u(firma);
    if (f.length !== FIRMA_BYTE) return { stato: 'rotta', motivo: 'la firma non ha la lunghezza di una firma' };
    const ok = verify(null, Buffer.from(corpo), createPublicKey(CHIAVE_PUBBLICA), f);
    if (!ok) return { stato: 'falsa', motivo: 'la firma non e\' del proprietario' };
    dati = JSON.parse(b64u(corpo).toString('utf8'));
  } catch (e) {
    return { stato: 'falsa', motivo: `la firma non regge: ${e?.message || e}` };
  }
  if (dati.scade && adesso > Date.parse(dati.scade)) {
    return { stato: 'scaduta', motivo: `scaduta il ${dati.scade}`, dati };
  }
  const atteso = String(dati.dominio || '').toLowerCase();
  const qui = String(dominio || '').toLowerCase();
  if (atteso && qui && atteso !== qui) {
    return { stato: 'altrove', motivo: `licenza per «${atteso}», qui siamo su «${qui}»`, dati };
  }
  if (dati.macchina && String(dati.macchina) !== hostname()) {
    return { stato: 'altrove', motivo: `licenza per la macchina «${dati.macchina}»`, dati };
  }
  return { stato: 'valida', dati };
}

let _esito = null;
export function esito(opz) {
  if (!_esito) _esito = verifica(opz);
  return _esito;
}
export const valida = (opz) => esito(opz).stato === 'valida';

// COME SI PRESENTA IL SOFTWARE. Non e' un messaggio d'errore: e' il nome che
// questo programma usa per dire chi e', e lo usano l'intestazione HTTP, le
// pagine servite e chiunque debba scrivere una riga di credito. Con licenza
// valida e' il nome dell'installazione autorizzata; senza, e' la proprieta', per
// esteso. Percio' togliere il controllo dell'avvio non serve a niente: il nome
// continua a uscire da qui, e senza licenza dice di chi e' questo software.
export function firma(opz) {
  const e = esito(opz);
  if (e.stato === 'valida' && e.dati?.proprietario) {
    return `${e.dati.proprietario} — licenza ${e.dati.dominio || SITO}`;
  }
  return `SENZA LICENZA — questo software è di ${AUTORE} (${ALIAS}) · ${SITO} · ${COPYRIGHT}`;
}

// Il cancello dell'avvio. Ritorna il motivo per cui NON si deve partire, o ''.
export function motivoPerNonPartire(opz) {
  const e = esito(opz);
  if (e.stato === 'valida' || e.stato === 'senza-chiave') return '';
  return e.motivo || 'licenza non valida';
}
