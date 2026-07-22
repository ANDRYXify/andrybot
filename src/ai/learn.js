// Apprendimento statistico dalla chat: nessuna IA esterna, solo
// conteggi, catene di Markov e buon senso procedurale.
// - observe(): guarda passare OGNI messaggio e impara coppie
//   Domanda→Risposta quando lo streamer (o un mod) risponde a un viewer.
// - generate(): inventa frasi "nello stile della chat" con bigrammi.
// - emotiTop() / topChatters(): statistiche di canale usate dal cervello.
import { makeLog } from '../logger.js';
import { db, memory, knowledge, streamers } from '../db.js';

const log = makeLog('learn');

// ------------------------------------------------------------ normalizza

// Stopword italiane: parole troppo comuni per essere utili nel matching.
// Sono già senza accenti perché normalizza() li toglie prima del filtro.
const STOPWORDS = new Set([
  'il', 'lo', 'la', 'le', 'li', 'gli', 'i', 'l', 'un', 'uno', 'una',
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'che', 'chi', 'cosa', 'come', 'quando', 'dove', 'perche', 'quale', 'quali',
  'e', 'ed', 'o', 'ma', 'se', 'non', 'mi', 'ti', 'si', 'ci', 'vi', 'ne',
  'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'del', 'dello', 'della', 'dei', 'degli', 'delle',
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'col', 'coi',
  'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro',
  'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue', 'suo', 'sua', 'suoi', 'sue',
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
  'qui', 'qua', 'gia', 'piu', 'anche', 'pure', 'ecco',
  'sono', 'sei', 'siamo', 'siete', 'era', 'ero', 'essere', 'stato', 'stata',
  'ho', 'hai', 'ha', 'hanno', 'abbiamo', 'avete', 'avere',
  'fa', 'fare', 'fai', 'faccio', 'va', 'vai', 'sto', 'stai', 'sta',
  'molto', 'poco', 'tanto', 'troppo', 'proprio', 'davvero', 'solo',
  'sempre', 'mai', 'ora', 'adesso', 'poi', 'prima', 'dopo', 'oggi', 'ieri', 'domani',
  'cioe', 'quindi', 'allora', 'pero', 'comunque', 'me', 'te', 'de', 'c',
]);

// toglie gli accenti (perché → perche, città → citta)
const senzaAccenti = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Normalizza un testo per il matching: minuscolo, niente URL, niente
// punteggiatura né accenti, stopword eliminate. Ritorna l'array di parole.
export function normalizza(testo) {
  return senzaAccenti(String(testo || '').toLowerCase())
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

// ------------------------------------------------------------ observe

// Stato in memoria (volatile: se il processo riparte, si riparte da zero
// senza danni — la conoscenza vera è nel DB).
const domandeAperte = new Map();   // canale → { user, testo, ts } ultima domanda di un viewer
const vociChatRecenti = new Map(); // canale → [ts...] voci 'chat' aggiunte nell'ultima ora
const canaliSporchi = new Set();   // canali con messaggi nuovi (invalida la cache markov)

const FINESTRA_RISPOSTA = 90_000;  // la risposta vale se arriva entro 90s dalla domanda
const MAX_VOCI_CHAT_ORA = 3;       // massimo 3 voci 'chat' nuove all'ora per canale

const INIZIO_DOMANDA = /^(chi|che|cosa|come|quando|dove|perch[eé]|quale|quali)\b/i;

// Una "domanda" è un testo con '?' o che inizia con una parola interrogativa,
// abbastanza lungo da avere un contenuto.
function pareDomanda(testo) {
  const t = String(testo || '').trim();
  if (t.length <= 10) return false;
  return t.includes('?') || INIZIO_DOMANDA.test(t);
}

// DISATTIVATO. Prima imparava una coppia domanda→risposta dalla chat e la
// salvava come conoscenza 'chat'; poi il bot RIPETEVA quelle frasi (messaggi
// veri degli utenti) verbatim, cosa sgradevole. Ora la conoscenza del bot
// arriva solo dal profilo del sito e da ciò che lo streamer insegna dalla
// dashboard. Lasciato come no-op per non toccare il chiamante (observe).
// eslint-disable-next-line no-unused-vars
function registraCoppia(channel, domanda, risposta) { /* no-op: niente eco degli utenti */ }

// Chiamata per OGNI messaggio (anche quelli dello streamer, isSelf=true).
export function observe(msg) {
  try {
    if (!msg?.channel || !msg?.text) return;
    const { channel, user } = msg;
    const testo = String(msg.text).trim();

    // il canale ha materiale nuovo: la cache markov andrà ricostruita
    canaliSporchi.add(channel);

    // le domande scadute si dimenticano
    const aperta = domandeAperte.get(channel);
    if (aperta && Date.now() - aperta.ts > FINESTRA_RISPOSTA) domandeAperte.delete(channel);

    const puoRispondere = !!(msg.isSelf || msg.isBroadcaster || msg.isMod);

    // 1) è la RISPOSTA dello streamer/mod alla domanda in sospeso?
    const inSospeso = domandeAperte.get(channel);
    if (puoRispondere && inSospeso && inSospeso.user !== user
        && testo.length > 10 && !testo.startsWith('!') && !pareDomanda(testo)) {
      domandeAperte.delete(channel);
      registraCoppia(channel, inSospeso.testo, testo);
      return;
    }

    // 2) è una DOMANDA di un viewer? (lo streamer non "chiede a se stesso")
    if (!msg.isSelf && !msg.isBroadcaster && !testo.startsWith('!') && pareDomanda(testo)) {
      domandeAperte.set(channel, { user, testo, ts: Date.now() });
    }
  } catch (e) {
    log.error('observe:', e?.message || e);
  }
}

// ------------------------------------------------------------ generate

const FINE = '\u0000';                 // token speciale di fine frase
const modelli = new Map();             // canale → modello markov (o {vuoto:true})
const RICOSTRUZIONE_MIN = 5 * 60_000;  // il modello si rifà al massimo ogni 5 minuti
const CORPUS_MIN = 150;                // sotto questa soglia il canale "non ha voce"

function incrementa(mappa, chiave) { mappa.set(chiave, (mappa.get(chiave) || 0) + 1); }

// estrazione pesata da una Map(valore → conteggio)
function pescaPesato(mappa) {
  let totale = 0;
  for (const v of mappa.values()) totale += v;
  if (!totale) return null;
  let r = Math.random() * totale;
  for (const [k, v] of mappa) { r -= v; if (r <= 0) return k; }
  return null;
}

// Costruisce il modello a bigrammi dagli ultimi messaggi "buoni" del canale.
function costruisciModello(channel) {
  const righe = memory.recentMessages(channel, 3000).filter((r) =>
    !r.from_bot
    && !r.text.startsWith('!')
    && !/https?:\/\/|www\./i.test(r.text)
    && !String(r.user).includes('[')
    && r.text.trim().split(/\s+/).length >= 3);

  if (righe.length < CORPUS_MIN) return { costruito: Date.now(), vuoto: true };

  const inizi = new Map();     // prima parola di frase → frequenza
  const bigrammi = new Map();  // parola → Map(parola successiva → frequenza)
  for (const r of righe) {
    const parole = r.text.trim().split(/\s+/).filter(Boolean);
    incrementa(inizi, parole[0]);
    for (let i = 0; i < parole.length; i++) {
      const successiva = i + 1 < parole.length ? parole[i + 1] : FINE;
      let seguiti = bigrammi.get(parole[i]);
      if (!seguiti) bigrammi.set(parole[i], (seguiti = new Map()));
      incrementa(seguiti, successiva);
    }
  }
  return { costruito: Date.now(), inizi, bigrammi };
}

// una passeggiata sul modello: da un inizio reale, avanti di bigramma in bigramma
function cammina(m, maxParole) {
  const frase = [];
  let parola = pescaPesato(m.inizi);
  while (parola && parola !== FINE && frase.length < maxParole) {
    frase.push(parola);
    const seguiti = m.bigrammi.get(parola);
    if (!seguiti) break;
    parola = pescaPesato(seguiti);
  }
  return frase;
}

// Genera una frase "nello stile della chat" del canale, o null se il
// corpus è troppo piccolo o non esce niente di decente.
export function generate(channel, { maxParole = 16 } = {}) {
  try {
    let m = modelli.get(channel);
    const daRifare = !m
      || (canaliSporchi.has(channel) && Date.now() - m.costruito > RICOSTRUZIONE_MIN);
    if (daRifare) {
      m = costruisciModello(channel);
      modelli.set(channel, m);
      canaliSporchi.delete(channel);
    }
    if (!m || m.vuoto) return null;

    const vietate = (streamers.get(channel)?.settings?.paroleVietate || [])
      .map((p) => String(p || '').trim().toLowerCase())
      .filter(Boolean);

    for (let tentativo = 0; tentativo < 5; tentativo++) {
      const parole = cammina(m, maxParole);
      if (parole.length < 4) continue;                    // troppo corta: riprova
      const testo = parole.join(' ');
      const minuscolo = testo.toLowerCase();
      if (vietate.some((p) => minuscolo.includes(p))) continue;
      return testo.charAt(0).toUpperCase() + testo.slice(1);
    }
    return null;
  } catch (e) {
    log.error('generate:', e?.message || e);
    return null;
  }
}

// ------------------------------------------------------------ emotiTop

// Emote "globali" note di Twitch/BTTV/7TV: se le vediamo, sono emote.
const EMOTE_NOTE = [
  'Kappa', 'LUL', 'LULW', 'KEKW', 'OMEGALUL', 'PogChamp', 'Pog', 'PogU', 'POGGERS',
  'monkaS', 'monkaW', 'Sadge', 'EZ', 'Clap', 'GG', 'PepeLaugh', 'Pepega', '5Head',
  'FeelsBadMan', 'FeelsGoodMan', 'FeelsStrongMan', 'catJAM', 'widepeepoHappy',
  'peepoClap', 'NotLikeThis', 'BibleThump', 'HeyGuys', 'VoHiYo', 'SeemsGood',
  'ResidentSleeper', 'Jebaited', 'CoolStoryBob', 'KappaPride', 'TriHard', '4Head',
  'DansGame', 'WutFace', 'PJSalt', 'Kreygasm', 'SwiftRage', 'AYAYA', 'Prayge',
  'Copium', 'Madge', 'Bedge', 'xdd',
];
const emoteNotePerMinuscolo = new Map(EMOTE_NOTE.map((e) => [e.toLowerCase(), e]));

const cacheEmote = new Map();          // canale → { ts, lista }
const CACHE_EMOTE_MS = 5 * 60_000;

// Le n "emote" più usate del canale: parole nella lista globale, oppure
// parole CamelCase / TUTTE-MAIUSCOLE (≥3 lettere) che compaiono almeno
// 5 volte negli ultimi 1000 messaggi. Cache di 5 minuti.
export function emotiTop(channel, n = 5) {
  try {
    const c = cacheEmote.get(channel);
    if (c && Date.now() - c.ts < CACHE_EMOTE_MS) return c.lista.slice(0, n);

    const conteggi = new Map();
    for (const r of memory.recentMessages(channel, 1000)) {
      if (r.from_bot) continue;
      for (const grezza of String(r.text).split(/\s+/)) {
        const parola = grezza.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
        if (parola.length < 2) continue;
        const nota = emoteNotePerMinuscolo.get(parola.toLowerCase());
        if (nota) { incrementa(conteggi, nota); continue; }
        // CamelCase (minuscola seguita da maiuscola) o tutta maiuscola ≥3 lettere
        if (parola.length >= 3 && /^[A-Za-z]+$/.test(parola)
            && (/[a-z][A-Z]/.test(parola) || /^[A-Z]{3,}$/.test(parola))
            && !STOPWORDS.has(parola.toLowerCase())) {
          incrementa(conteggi, parola);
        }
      }
    }

    const lista = [...conteggi.entries()]
      .filter(([, quante]) => quante >= 5)
      .sort((a, b) => b[1] - a[1])
      .map(([parola]) => parola);
    cacheEmote.set(channel, { ts: Date.now(), lista });
    return lista.slice(0, n);
  } catch (e) {
    log.error('emotiTop:', e?.message || e);
    return [];
  }
}

// ------------------------------------------------------------ topChatters

// I viewer più attivi degli ultimi giorni (esclusi bot ed eventi '[...]').
export function topChatters(channel, giorni = 7, n = 5) {
  try {
    const da = Date.now() - giorni * 24 * 3_600_000;
    return db.prepare(`SELECT user, COUNT(*) AS conteggio FROM messages
        WHERE channel=? AND from_bot=0 AND ts>=? AND user NOT LIKE '%[%'
        GROUP BY user ORDER BY conteggio DESC LIMIT ?`)
      .all(channel, da, n)
      .map((r) => ({ user: r.user, count: r.conteggio }));
  } catch (e) {
    log.error('topChatters:', e?.message || e);
    return [];
  }
}
