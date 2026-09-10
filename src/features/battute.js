// battute.js — il serbatoio delle battute del canale.
//
// Perché un serbatoio e non solo il modello. Una battuta non ha una risposta
// giusta, quindi il modello va benissimo per inventarne — ma un 7B su CPU ne
// inventa una decente ogni tanto, ci mette quindici secondi, e quando è spento
// non ne inventa nessuna. Le battute che funzionano in QUEL canale le conosce lo
// streamer, non il modello.
//
// Quindi: prima il serbatoio, che è istantaneo e sicuro; il modello quando il
// serbatoio è vuoto o quando gliela si chiede apposta. E quello che il modello
// inventa di buono si può tenere, così il serbatoio cresce invece di ricominciare
// da capo ogni sera.
//
// Non si pesca a caso: si prende la meno detta di recente. È la differenza fra un
// serbatoio e un sacchetto in cui si rimette dentro il biglietto appena pescato —
// pescando a caso, in una serata la stessa battuta esce tre volte.
//
// Il testo esce dalla voce del bot come tutto il resto, quindi l'accordo di
// genere si applica: una battuta può contenere `{o/a}`.
import { battute } from '../db.js';
import { makeLog } from '../logger.js';
import { preparaComando, comandoDi } from './comandi-registro.js';

const log = makeLog('battute');

const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);
const MAX = 500;

// ---------------------------------------------------------- la presa sul pubblico
//
// «Ha fatto ridere» non e' un'impressione: si misura. Dopo che il bot dice una
// battuta si sta in ascolto per un po', e si conta chi ride. Servono DUE persone
// diverse: una sola puo' essere educazione, e potrebbe essere lo streamer.
//
// Non si conta il volume della chat — in una chat veloce riderebbe sempre — ma
// quante PERSONE diverse hanno reagito con qualcosa che e' una risata.
const RISATA = /(?:^|\s)(?:ah(?:ah)+|eh(?:eh)+|ih(?:ih)+|lol|lmao|rotfl|kekw|lul|omegalul|icant|xd+|😂|🤣|😆|😹)(?:\s|$|!|\.)/i;
const FINESTRA_MS = 45_000;
const RIDENTI_MINIMI = 2;

const inAscolto = new Map();   // canale → { n, fino, chi:Set }

export function stoAscoltando(channel) {
  const a = inAscolto.get(String(channel || '').toLowerCase());
  return !!a && Date.now() < a.fino;
}

// Il bot ha appena detto la battuta n. E' l'UNICO posto che sa che e' successo, e
// da qui pendono tutte e due le cose: la finestra in cui si ascolta chi ride, e il
// conto di quante volte e' stata detta. Tenerle separate voleva dire che una delle
// due strade per dire una battuta si dimenticava di contare — ed e' successo.
export function detta(channel, n) {
  if (!n) return;
  inAscolto.set(String(channel || '').toLowerCase(), { n, fino: Date.now() + FINESTRA_MS, chi: new Set() });
  try { battute.segnaDetta(channel, n); } catch (e) { log.debug('segnaDetta:', e?.message || e); }
}

// Ogni messaggio di chat passa di qui. Ritorna true quando la battuta viene
// segnata come riuscita (una volta sola, poi la finestra si chiude).
export function ascolta(msg) {
  try {
    const ch = String(msg?.channel || '').toLowerCase();
    const a = inAscolto.get(ch);
    if (!a) return false;
    if (Date.now() >= a.fino) { inAscolto.delete(ch); return false; }
    if (!RISATA.test(String(msg?.text || ''))) return false;
    const chi = String(msg?.user || '').toLowerCase();
    if (!chi || a.chi.has(chi)) return false;
    a.chi.add(chi);
    if (a.chi.size < RIDENTI_MINIMI) return false;
    battute.haFattoRidere(ch, a.n);
    inAscolto.delete(ch);      // segnata una volta: il resto della risata non conta due volte
    return true;
  } catch (e) { log.debug('ascolta:', e?.message || e); return false; }
}

// Per l'iniziativa del bot: la stessa scelta del comando, senza il numero
// attaccato in coda — una battuta detta di sua spontanea volonta' non e' una voce
// di catalogo, e «(#7)» in fondo la fa sembrare tale.
// QUELLO CHE ARRIVA DA LEI. Non lo scrive il bot e non glielo chiede: lo trova
// nella sua cassetta. Entra con schema «sua», che vuol dire una cosa precisa —
// ogni canale misurera' il suo umorismo come misura ogni altro modo di costruire
// battute, con le risate vere. Nessun trattamento di favore: se in quel canale non
// fa ridere, smette di uscire da sola, esattamente come le altre.
// UNA BATTUTA, DETTA. La sequenza e' sempre la stessa da qualunque parte arrivi la
// spinta — chat, iniziativa del bot, tasto della console: prima il serbatoio (che
// pesa riposo e presa sul pubblico), se e' vuoto la si COSTRUISCE con la materia
// del canale, poi si dice e si segna che e' stata detta (che apre la finestra in
// cui si contano le risate). Tre copie di questa sequenza avrebbero voluto dire che
// prima o poi una si dimentica di segnare, e quella battuta non impara piu' niente.
// Ritorna {testo, n} o null.
export function diUna(canale, say, motore = null) {
  const b = prossimaDa(canale);
  if (b) { say(fmt(b)); detta(canale, b.n); return { testo: b.testo, n: b.n }; }
  if (typeof motore?.costruisci !== 'function') return null;
  let fatta = null;
  try { fatta = motore.costruisci(canale); } catch (e) { log.debug('motore:', e?.message || e); }
  if (!fatta?.testo) return null;
  const n = battute.add(canale, fatta.testo, 'motore', 'motore', fatta.schema);
  if (n) { say(fmt({ testo: fatta.testo, n })); detta(canale, n); return { testo: fatta.testo, n }; }
  say(fatta.testo);
  return { testo: fatta.testo, n: 0 };
}

export function accogliDaLei(canali, testo) {
  let messe = 0;
  for (const ch of canali || []) {
    try { if (battute.add(ch, testo, 'lia', 'lei', 'sua')) messe++; }
    catch (e) { log.debug('accogliDaLei:', e?.message || e); }
  }
  return messe;
}

export function prossimaDa(channel) {
  try { return battute.prossima(channel); } catch (e) { log.debug('prossimaDa:', e?.message || e); return null; }
}

export function fmt(b) {
  return `${b.testo} (#${b.n})`;
}

// !battuta                → ne dice una
// !battuta N              → dice la numero N
// !battuta aggiungi <testo>  (mod/streamer)
// !battuta togli N           (mod/streamer)
// !battuta quante
//
// A serbatoio vuoto il bot non resta a bocca aperta, e l'ordine conta:
//
//  · `motore` COSTRUISCE una battuta con la materia di questo canale (i suoi
//    numeri veri) e uno schema che dichiara cosa viola. E' istantaneo, non chiede
//    niente a nessuno e funziona col cervello spento;
//  · `inventa` chiede al cervello, ed e' l'ultima spiaggia: serve quando il canale
//    non ha ancora materia propria — niente contatori, niente da cui partire.
//
// Nessuna delle due e' obbligatoria: senza, con il serbatoio vuoto si dice che e'
// vuoto, che e' la verita'.
export function tryBattuta(msg, say, { inventa = null, motore = null } = {}) {
  try {
    // I nomi li tiene il REGISTRO, non questa riga: cosi' un comando rinominato
    // risponde al nome nuovo, uno spento non parte, e uno riservato lo dice
    // invece di tacere. Scriverli qui a mano vorrebbe dire due elenchi da tenere
    // d'accordo, e uno dei due sarebbe sempre indietro.
    const nomi = (comandoDi('battuta')?.nomi || ['battuta']).join('|');
    if (!new RegExp(`^!(?:${nomi})\\b`, 'i').test(String(msg?.text || '').trim())) return false;
    const vaglio = preparaComando(msg.channel, msg);
    if (vaglio?.rifiuta) { say(vaglio.messaggio); return true; }
    if (vaglio?.salta) return false;
    const testo = String(vaglio?.testo || msg.text || '').trim();
    const m = new RegExp(`^!(?:${nomi})\\b\\s*([\\s\\S]*)$`, 'i').exec(testo);
    if (!m) return false;
    const resto = m[1].trim();
    const canale = msg.channel;

    // aggiungi
    const add = /^(?:aggiungi|add|\+)\s+([\s\S]+)$/i.exec(resto);
    if (add) {
      if (!puoGestire(msg)) { say('Solo mod e streamer possono aggiungere battute 🙂'); return true; }
      if (battute.count(canale) >= MAX) { say(`Il serbatoio è pieno (${MAX}). Togline qualcuna prima.`); return true; }
      const n = battute.add(canale, add[1], msg.user, 'mano');
      say(n ? `Battuta #${n} salvata 😄` : 'Questa c\'è già, o è troppo corta.');
      return true;
    }

    // togli
    const del = /^(?:togli|rimuovi|del|-)\s*(\d+)$/i.exec(resto);
    if (del) {
      if (!puoGestire(msg)) { say('Solo mod e streamer possono togliere battute 🙂'); return true; }
      const n = Number(del[1]);
      if (!battute.get(canale, n)) { say(`Non esiste la battuta #${n}.`); return true; }
      battute.remove(canale, n);
      say(`Battuta #${n} tolta.`);
      return true;
    }

    if (/^(?:quante|count)$/i.test(resto)) {
      const c = battute.count(canale);
      say(c ? `Nel serbatoio ci sono ${c} battute.` : 'Il serbatoio è vuoto: aggiungine con !battuta aggiungi <testo>');
      return true;
    }

    // una precisa
    if (/^\d+$/.test(resto)) {
      const b = battute.get(canale, Number(resto));
      say(b ? fmt(b) : `Non esiste la battuta #${resto}.`);
      return true;
    }

    if (resto) { say('Uso: !battuta · !battuta N · !battuta aggiungi <testo> · !battuta togli N'); return true; }

    // una qualsiasi: serbatoio prima, costruita poi. La sequenza sta in `diUna`,
    // una sola volta: qui, nell'iniziativa del bot e nel tasto della console.
    if (diUna(canale, say, typeof motore === 'function' ? { costruisci: motore } : null)) return true;
    // se il canale non ha ancora materia propria, si chiede al cervello. Se non c'è,
    // si dice com'è — un bot che promette e non consegna è peggio di uno che ammette.
    if (typeof inventa === 'function') {
      inventa()
        .then((t) => {
          const pulito = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 300);
          if (!pulito) { say('Non me ne viene una. Aggiungine tu con !battuta aggiungi <testo> 🙂'); return; }
          say(pulito);
        })
        .catch((e) => { log.debug('inventa:', e?.message || e); });
      return true;
    }
    say('Il serbatoio è vuoto: aggiungine con !battuta aggiungi <testo> 🙂');
    return true;
  } catch (e) { log.error('battute:', e?.message || e); return false; }
}
