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
// Una pausa non dura piu' di tre minuti (Twitch). Un numero fuori da 1..300
// non e' una durata: non si taglia a 300, si tratta come una durata che non si
// sa. Tagliarlo vorrebbe dire annunciare in chat un numero che Twitch non ha
// mai detto.
export const DURATA_MAX = 300;
// Ogni quanto il bot guarda il programma. Serve anche al modello: la finestra
// in cui il programma va letto si ricava da qui (vedi `vaGuardato`).
export const GIRO_MS = 30_000;
// Una lettura del programma piu' vecchia di cosi' si rifa' comunque: il
// programma puo' cambiare senza nessun evento (lo streamer tocca le
// impostazioni della pubblicita' a diretta accesa).
export const RILETTURA_MS = 5 * 60_000;

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

// Quanto dura una pausa, in secondi, o 0 se non si sa.
export function durataValida(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return 0;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= DURATA_MAX ? n : 0;
}

// UN ISTANTE DI TWITCH, IN MILLISECONDI. Il programma della pubblicita' e' il
// caso storto: i documenti dicono RFC3339, e Twitch manda SECONDI UNIX interi,
// 0 quando non c'e' niente. Lo staff l'ha confermato sul forum degli
// sviluppatori, e non lo cambia perche' l'endpoint e' in uso da tutti. Qui si
// leggono le due forme, e da qui in poi gli istanti sono solo millisecondi:
// un posto che sa com'e' fatto il dato, invece di tre che lo indovinano.
export function istante(v) {
  if (v === null || v === undefined || typeof v === 'boolean') return 0;
  const t = String(v).trim();
  if (!t) return 0;
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    return n > 0 ? Math.round(n * 1000) : 0;
  }
  const ms = Date.parse(t);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

// La riga di GET /helix/channels/ads, detta nei nostri termini.
export function programmaDa(riga) {
  if (!riga || typeof riga !== 'object') return null;
  return {
    prossima: istante(riga.next_ad_at),
    durata: durataValida(riga.duration),
    ultima: istante(riga.last_ad_at),
    snooze: numero(riga.snooze_count, 0, 99, 0),
  };
}

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

// `{secondi}` e `{durata}` vogliono dire una cosa sola in tutti e tre i
// momenti: QUANTO DURA LA PAUSA. Prima la dice il programma, durante e dopo
// l'evento di partenza. Se la durata non si sa, una frase che la chiede non si
// dice: meglio zitti che un numero inventato in chat.
const CHIEDE_DURATA = /\{(secondi|durata)\}/;

export function testoDi(conf, quale, { secondi = 0, canale = '' } = {}) {
  const testo = String(conf?.[quale]?.testo || '');
  const s = durataValida(secondi);
  if (!s && CHIEDE_DURATA.test(testo)) return '';
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return testo
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
// IL PREAVVISO SI DICE A `quanto` SECONDI DALLA PAUSA, non «a un giro di
// distanza». Il giro serve solo a leggere il programma; il momento di parlare
// e' un istante, e a un istante si arriva con una sveglia.
//
// QUANDO VA LETTO IL PROGRAMMA. L'istante del preavviso e' W = prossima -
// quanto, e la sveglia va puntata prima di W. I giri sono distanti GIRO_MS:
// in [W - 2 GIRO_MS, W) ne cadono due, quindi almeno uno anche quando un giro
// tarda, e a quel giro alla pausa mancano al piu' quanto + 2 GIRO_MS. E' questa
// la finestra, ricavata dal passo del giro e non scelta a occhio. Fuori
// finestra si legge solo se non si sa niente, se la pausa e' passata, o se
// l'ultima lettura e' vecchia.
export function vaGuardato(conf, stato, adesso = Date.now()) {
  if (!parla(conf, 'prima')) return false;
  const prossima = Number(stato?.prossima) || 0;
  if (!prossima) return true;
  if (prossima <= adesso) return true;
  if (adesso - (Number(stato?.letto) || 0) >= RILETTURA_MS) return true;
  return prossima - adesso <= conf.quanto * 1000 + 2 * GIRO_MS;
}

// L'istante a cui puntare la sveglia del preavviso, o 0 se e' ancora presto.
// Si punta solo dentro la finestra: piu' in la' il programma si rilegge, e uno
// snooze nel frattempo si vede.
export function quandoAvvisare(conf, stato, programma, adesso = Date.now()) {
  if (!parla(conf, 'prima')) return 0;
  const quando = Number(programma?.prossima) || 0;
  if (!quando || quando <= adesso) return 0;
  if (String(stato?.dettoPer || '') === String(quando)) return 0;
  const dire = Math.max(adesso, quando - conf.quanto * 1000);
  return dire - adesso < 2 * GIRO_MS ? dire : 0;
}

// Alla sveglia: il programma si e' appena riletto, e il preavviso si da' solo
// se la pausa e' ancora dentro `quanto`. E' questa la conferma: uno snooze la
// sposta cinque minuti piu' in la', e alla sveglia ne mancano allora quanto +
// cinque minuti, fuori dalla finestra per qualunque preavviso. Una volta per
// pausa, e la pausa e' l'ISTANTE annunciato.
export function preavviso(conf, stato, programma, adesso = Date.now()) {
  if (!parla(conf, 'prima')) return null;
  const quando = Number(programma?.prossima) || 0;
  if (!quando || quando <= adesso) return null;
  if (quando - adesso > conf.quanto * 1000) return null;
  if (String(stato?.dettoPer || '') === String(quando)) return null;
  const testo = testoDi(conf, 'prima', { secondi: programma?.durata });
  return testo ? { quando, testo } : null;
}

// ── La pausa che comincia ─────────────────────────────────────────────────
export function allaPartenza(conf, stato, evento, adesso = Date.now()) {
  // L'istante dichiarato. Nei documenti si chiama `started_at`; c'e' chi l'ha
  // ricevuto come `timestamp`, e sono la stessa cosa.
  const inizio = istante(evento?.started_at ?? evento?.timestamp);
  // Senza un istante non si sa distinguere una pausa da un doppione, e senza
  // saperlo distinguere non si puo' promettere di non annunciarla due volte.
  if (!inizio) return null;
  if (String(stato?.ultimaPausa || '') === String(inizio)) return null;
  const secondi = durataValida(evento?.duration_seconds);
  // LA PAUSA FINISCE A INIZIO + DURATA, qualunque sia il momento in cui
  // l'evento arriva: un evento in ritardo ha gia' consumato parte della pausa,
  // e contare da quando arriva sposterebbe la fine di tutto quel ritardo. Il
  // minimo con adesso copre un orologio di Twitch avanti rispetto al nostro:
  // la pausa non puo' essere cominciata dopo che ce l'hanno detto.
  // Senza durata non c'e' una fine da contare, quindi nessun «sono tornato».
  const finisceA = secondi ? Math.min(inizio, adesso) + secondi * 1000 : 0;
  // A pausa gia' finita, «pubblicita' per 90 secondi» sarebbe falso.
  const inCorso = !secondi || finisceA > adesso;
  return {
    inizio,
    secondi,
    finisceA,
    testo: inCorso && parla(conf, 'durante') ? testoDi(conf, 'durante', { secondi }) : '',
  };
}

// ── La pausa che finisce, che e' un conto e non un evento ────────────────
export function allaFine(conf, stato, adesso = Date.now()) {
  if (!parla(conf, 'dopo')) return null;
  const finisceA = Number(stato?.finisceA) || 0;
  if (!finisceA || stato?.dettoDopo) return null;
  if (adesso < finisceA) return null;
  // In ritardo oltre la tolleranza non si dice niente: il bot si e' riavviato,
  // o l'evento e' arrivato tardi, e «sono tornato» dieci minuti dopo e' una
  // bugia detta in diretta. Meglio zitti.
  if (adesso - finisceA > conf.tolleranza * 1000) return { scaduto: true, testo: '' };
  return { scaduto: false, testo: testoDi(conf, 'dopo', { secondi: stato?.secondi }) };
}
