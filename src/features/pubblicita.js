// I TRE MOMENTI DELLA PUBBLICITA'.
//
// Quando parte una pausa pubblicitaria la chat resta sola. Chi guarda non sa
// se sei sparito o se e' Twitch, e chi arriva in quel momento vede uno schermo
// che non sei tu. Tre righe in chat cambiano la serata: «fra poco», «adesso»,
// «sono tornato».
//
// TRE MOMENTI, E SOLO UNO E' UN EVENTO. E' il fatto che decide tutto il resto:
//
//  · PRIMA — non esiste nessun evento di preavviso. L'unica fonte e'
//    `next_ad_at`, che Twitch riempie SOLO mentre sei in onda. Va chiesto, e
//    chiederlo ogni mezzo minuto a tutti sarebbe una telefonata continua per
//    una risposta che per un'ora non cambia: si chiede quando serve.
//  · QUANDO PARTE — `channel.ad_break.begin`, e porta con se' quanto dura.
//  · QUANDO FINISCE — **non esiste un evento**. Verificato sui documenti di
//    Twitch: c'e' solo l'inizio. Percio' il «sono tornato» e' un CONTO sui
//    secondi che l'evento ha dichiarato, e va detto per quello che e'.
//
// DA CUI DUE COSE CHE NON SONO PRUDENZA, SONO CONSEGUENZE.
//
//  · Se il bot si riavvia nel mezzo di una pausa, il conto si perde. Allora: o
//    si dice subito, o non si dice. «Sono tornato» dieci minuti dopo e' peggio
//    del silenzio, perche' e' una bugia detta dal vivo. Per questo c'e' una
//    tolleranza, non un recupero.
//  · Il preavviso sta VICINO alla pausa. Lo snooze di Twitch la sposta di
//    cinque minuti: un «fra poco pubblicita'» dato dieci minuti prima verrebbe
//    smentito, e un annuncio in chat non si ritira. Sessanta secondi prima, no.
//
// E una pausa si annuncia UNA VOLTA. EventSub puo' consegnare due volte lo
// stesso messaggio: a distinguerle e' l'istante d'inizio, non il fatto di aver
// ricevuto qualcosa.

export const COLORI = Object.freeze(['primary', 'blue', 'green', 'orange', 'purple']);
export const MOMENTI = Object.freeze(['prima', 'durante', 'dopo']);

// Quanto prima si avvisa. Il minimo e' quindici secondi — meno non e' un
// preavviso, e' un annuncio in ritardo — e il massimo cinque minuti, che e'
// esattamente quanto sposta uno snooze: oltre, il preavviso potrebbe parlare di
// una pausa che non arrivera'.
export const PREAVVISO_MIN = 15;
export const PREAVVISO_MAX = 300;
// Oltre questi secondi di ritardo il «sono tornato» non si dice piu'.
export const TOLLERANZA_MAX = 600;
// Una pausa non dura piu' di tre minuti (Twitch), ma il conto non si fida di
// quello che arriva: un numero storto non deve poter lasciare un timer appeso.
export const DURATA_MAX = 300;

const TESTI = Object.freeze({
  prima: 'Fra poco parte la pubblicità: restate qui, torno subito.',
  durante: 'Pubblicità per {secondi} secondi. Non andate via, ci vediamo fra poco.',
  dopo: 'Eccomi, sono tornato.',
});

const numero = (v, meno, piu, difetto) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return difetto;
  return Math.max(meno, Math.min(piu, n));
};

// Un testo vuoto NON e' «usa quello di sempre»: e' «non dire niente». Chi
// svuota la casella sta spegnendo quel momento, e riempirgliela con il nostro
// testo vorrebbe dire fare il contrario di quello che ha chiesto. Per spegnere
// c'e' anche la levetta; questo e' il secondo modo, quello che viene naturale.
const unMomento = (v, quale) => ({
  acceso: v?.acceso !== false,
  testo: v?.testo === undefined ? TESTI[quale] : String(v.testo || '').slice(0, 480),
});

export function normalizzaPubblicita(v) {
  const p = {
    acceso: !!v?.acceso,
    colore: COLORI.includes(v?.colore) ? v.colore : 'primary',
    quanto: numero(v?.quanto, PREAVVISO_MIN, PREAVVISO_MAX, 60),
    tolleranza: numero(v?.tolleranza, 0, TOLLERANZA_MAX, 120),
  };
  for (const m of MOMENTI) p[m] = unMomento(v?.[m], m);
  return p;
}

// Un momento parla solo se e' acceso E ha qualcosa da dire. Sono due modi di
// dire di no, e uno solo dei due non basterebbe: la levetta serve a tacere per
// una sera, la casella vuota a non usarlo mai.
export const parla = (conf, quale) => !!(conf?.acceso && conf?.[quale]?.acceso && String(conf[quale].testo || '').trim());

export function testoDi(conf, quale, { secondi = 0, canale = '' } = {}) {
  const s = Math.max(0, Math.round(Number(secondi) || 0));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return String(conf?.[quale]?.testo || '')
    .replace(/\{secondi\}/g, String(s))
    // `{durata}` e' scritta in cifre e non a parole apposta: il testo lo scrive
    // lo streamer, nella lingua che vuole, e «un minuto e mezzo» dentro una
    // frase in inglese sarebbe una toppa.
    .replace(/\{durata\}/g, `${mm}:${ss}`)
    .replace(/\{canale\}/g, String(canale || ''))
    .slice(0, 500)
    .trim();
}

// ── Il preavviso ──────────────────────────────────────────────────────────
//
// QUANDO VALE LA PENA CHIEDERE IL PROGRAMMA. Una volta saputo che la prossima
// pausa e' fra quaranta minuti, richiederlo ogni mezzo minuto e' chiedere
// sessanta volte una cosa che non si muove. Si torna a chiedere quando ci si
// avvicina — e la finestra e' larga il doppio del preavviso, cosi' uno snooze
// arrivato nel frattempo si vede in tempo.
export function vaGuardato(conf, stato, adesso = Date.now()) {
  if (!parla(conf, 'prima')) return false;
  const prossima = Number(stato?.prossima) || 0;
  if (!prossima) return true;                       // non si sa niente: si guarda
  if (prossima <= adesso) return true;              // e' passata: si riguarda
  return prossima - adesso <= conf.quanto * 2000;
}

// Il preavviso si da' una volta per pausa, e la pausa e' identificata
// dall'ISTANTE annunciato: due letture dello stesso programma non sono due
// pause, e un annuncio ripetuto in chat si nota subito.
export function preavviso(conf, stato, programma, adesso = Date.now()) {
  if (!parla(conf, 'prima')) return null;
  const quando = Date.parse(programma?.nextAt || '') || Number(programma?.nextAt) || 0;
  if (!quando || quando <= adesso) return null;
  if (quando - adesso > conf.quanto * 1000) return null;
  if (String(stato?.dettoPer || '') === String(quando)) return null;
  return { quando, testo: testoDi(conf, 'prima', { secondi: Math.round((quando - adesso) / 1000) }) };
}

// ── La pausa che comincia ─────────────────────────────────────────────────
export function allaPartenza(conf, stato, evento, adesso = Date.now()) {
  const inizio = Date.parse(evento?.started_at || '') || 0;
  // Senza un istante non si sa distinguere una pausa da un doppione, e senza
  // saperlo distinguere non si puo' promettere di non annunciarla due volte.
  if (!inizio) return null;
  if (String(stato?.ultimaPausa || '') === String(inizio)) return null;
  const secondi = numero(evento?.duration_seconds, 0, DURATA_MAX, 0);
  return {
    inizio,
    secondi,
    // Quando il conto scade. Si calcola da ADESSO e non dall'istante dichiarato:
    // un evento che arriva in ritardo ha gia' consumato parte della pausa, e
    // partire dall'istante dichiarato farebbe aspettare due volte quel ritardo.
    finisceA: adesso + secondi * 1000,
    testo: parla(conf, 'durante') ? testoDi(conf, 'durante', { secondi }) : '',
  };
}

// ── La pausa che finisce, che e' un conto e non un evento ────────────────
export function allaFine(conf, stato, adesso = Date.now()) {
  if (!parla(conf, 'dopo')) return null;
  const finisceA = Number(stato?.finisceA) || 0;
  if (!finisceA || stato?.dettoDopo) return null;
  if (adesso < finisceA) return null;
  // In ritardo oltre la tolleranza non si dice niente: il bot si e' riavviato,
  // o il conto e' rimasto indietro, e «sono tornato» dieci minuti dopo e' una
  // bugia detta in diretta. Meglio zitti.
  if (adesso - finisceA > conf.tolleranza * 1000) return { scaduto: true, testo: '' };
  return { scaduto: false, testo: testoDi(conf, 'dopo', {}) };
}
