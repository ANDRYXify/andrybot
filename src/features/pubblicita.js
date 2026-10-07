// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
//
// LE PAROLE NON STANNO QUI. Qui si decide QUANDO parlare e con quali dati; la
// frase la sceglie la voce del canale (features/voce.js), dai momenti
// `pubblicita-prima`, `pubblicita-parte` e `pubblicita-dopo` del frasario,
// nella lingua e nel tono del canale. Lo streamer che vuole le sue, o nessuna,
// lo dice nella carta «Le frasi del bot».

export const COLORI = Object.freeze(['primary', 'blue', 'green', 'orange', 'purple']);
export const MOMENTI = Object.freeze(['prima', 'durante', 'dopo']);

// Quanto sposta la pausa uno snooze di Twitch. Da qui scendono due cose: il
// preavviso piu' lontano che si puo' dare, e la finestra in cui il conto
// sull'overlay rilegge il programma a ogni giro (vedi `vaGuardatoPerOverlay`).
export const SNOOZE_MS = 5 * 60_000;
// Quanto prima si avvisa. Il minimo e' quindici secondi — meno non e' un
// preavviso, e' un annuncio in ritardo — e il massimo e' uno snooze: oltre, il
// preavviso potrebbe parlare di una pausa che non arrivera'.
export const PREAVVISO_MIN = 15;
export const PREAVVISO_MAX = SNOOZE_MS / 1000;
// Oltre questi secondi di ritardo il «sono tornato» non si dice piu'.
export const TOLLERANZA_MAX = 600;
// Una pausa non dura piu' di tre minuti (Twitch). Un numero fuori da 1..300
// non e' una durata: non si taglia a 300, si tratta come una durata che non si
// sa. Tagliarlo vorrebbe dire annunciare in chat un numero che Twitch non ha
// mai detto.
export const DURATA_MAX = 300;
// IL LANCIO DALLA REGIA. Una pubblicita' lanciata a mano dura da 30 a 180
// secondi (Twitch), e l'anticipo con cui la si programma va da zero allo stesso
// tetto del preavviso: piu' in la' sarebbe un programma, e quello lo fa gia'
// Twitch. Vedi docs/PUBBLICITA.md, «Le pubblicita' lanciate a mano».
export const LANCIO_MIN_DURATA = 30;
export const LANCIO_MAX_DURATA = 180;
export const LANCIO_MAX_S = PREAVVISO_MAX;
// Ogni quanto il bot guarda il programma. Serve anche al modello: la finestra
// in cui il programma va letto si ricava da qui (vedi `vaGuardato`).
export const GIRO_MS = 30_000;
// Una lettura del programma piu' vecchia di cosi' si rifa' comunque: il
// programma puo' cambiare senza nessun evento (lo streamer tocca le
// impostazioni della pubblicita' a diretta accesa).
export const RILETTURA_MS = 5 * 60_000;

// Il momento del frasario di ogni istante della pausa.
export const MOMENTO = Object.freeze({ prima: 'pubblicita-prima', durante: 'pubblicita-parte', dopo: 'pubblicita-dopo' });

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

// Ogni momento ha la sua levetta, per tacere una sera. Per non usarlo mai lo
// si spegne nelle frasi del bot, e chi chiama lo mette qui dentro (vedi
// `siDice`): la levetta di qui e quella della voce sono due modi di dire di no.
const unMomento = (v) => ({ acceso: v?.acceso !== false });

export function normalizzaPubblicita(v) {
  const p = {
    acceso: !!v?.acceso,
    colore: COLORI.includes(v?.colore) ? v.colore : 'primary',
    quanto: numero(v?.quanto, PREAVVISO_MIN, PREAVVISO_MAX, 60),
    tolleranza: numero(v?.tolleranza, 0, TOLLERANZA_MAX, 120),
  };
  for (const m of MOMENTI) p[m] = unMomento(v?.[m]);
  return p;
}

// Un momento si dice se la pubblicita' in chat e' accesa e quel momento anche.
export const siDice = (conf, quale) => !!(conf?.acceso && conf?.[quale]?.acceso);

// I DATI DELLA FRASE. `{secondi}` e `{durata}` vogliono dire una cosa sola in
// tutti e tre i momenti: QUANTO DURA LA PAUSA. Prima la dice il programma,
// durante e dopo l'evento di partenza. Se la durata non si sa, i due dati non
// ci sono, e la voce sceglie una frase che non li chiede: un numero inventato
// in chat e' peggio di una frase senza numero.
//
// `{durata}` e' scritta in cifre e non a parole apposta: «un minuto e mezzo»
// e' di una lingua sola, 1:30 di tutte.
export function datiDi({ secondi = 0, canale = '' } = {}) {
  const s = durataValida(secondi);
  const out = { canale: String(canale || '') };
  if (s) {
    out.secondi = s;
    out.durata = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  return out;
}

// ── Le letture del programma ──────────────────────────────────────────────
//
// Del programma lo stato di un canale tiene `prossima` (la pausa secondo
// l'ultima lettura RIUSCITA, 0 se Twitch ha detto «nessuna»), `letto` (quando
// quella lettura e' stata CHIESTA, 0 se mai) e `falliti`/`fallitoA` (quante
// letture di fila sono andate male, e quando l'ultima).
//
// NON SO NON VUOL DIRE NESSUNA. Una lettura fallita non tocca ne' `prossima` ne'
// `letto`: cambia solo il conto degli errori. Le condizioni che l'avevano
// chiesta restano vere, e la lettura si rifa'. Prima un errore scriveva
// «nessuna pausa, letto adesso»: un intoppo di un attimo toglieva il conto
// dalla scena, e per cinque minuti nessuno lo richiedeva.
//
// L'ATTESA DOPO GLI ERRORI. Dopo n errori di fila si aspetta GIRO_MS · 2^(n-1),
// mai oltre RILETTURA_MS: il primo errore si riprova al giro dopo, un permesso
// tolto non diventa una chiamata ogni mezzo minuto per tutta la sera. La soglia
// sta a meta' giro: setInterval non e' un metronomo, e un giro che arriva un
// attimo prima del suo istante non deve slittare di un giro intero.
export function attesaDopoErrori(falliti) {
  const n = Math.floor(Number(falliti) || 0);
  return n > 0 ? Math.min(GIRO_MS * 2 ** (n - 1), RILETTURA_MS) : 0;
}

export function inAttesa(stato, adesso = Date.now()) {
  const attesa = attesaDopoErrori(stato?.falliti);
  return attesa > 0 && adesso - (Number(stato?.fallitoA) || 0) < attesa - GIRO_MS / 2;
}

// COSA FA UNA LETTURA ALLO STATO. `chiesto` e' l'istante in cui e' stata chiesta,
// `pausa` la pausa che lo stato conosceva in quell'istante (`ultimaPausa`).
// Torna i campi da scrivere, e se la lettura e' stata applicata.
//
// Una lettura riuscita si applica solo se e' ancora vera: se mentre la si
// aspettava e' cominciata una pausa, racconta il programma di prima, e
// scriverla sopra rimetterebbe in scena una pausa gia' partita; se e' piu'
// vecchia di quella che si ha (due giri sovrapposti), scriverebbe il passato
// sopra il presente. In tutti e due i casi la chiamata pero' e' andata: il
// conto degli errori si azzera.
export function dopoLettura(stato, programma, { chiesto = Date.now(), pausa = '' } = {}) {
  if (!programma) return { applicata: false, falliti: (Number(stato?.falliti) || 0) + 1, fallitoA: chiesto };
  const vecchia = String(stato?.ultimaPausa || '') !== String(pausa || '') || chiesto < (Number(stato?.letto) || 0);
  if (vecchia) return { applicata: false, falliti: 0, fallitoA: 0 };
  return { applicata: true, prossima: Number(programma.prossima) || 0, letto: chiesto, falliti: 0, fallitoA: 0 };
}

// La fine dell'ultima pausa: quella contata all'evento, o, se e' gia' stata
// consumata dal «sono tornato», inizio + durata.
export function fineDellaPausa(stato) {
  const inizio = Number(stato?.ultimaPausa) || 0;
  return Number(stato?.finisceA) || (inizio ? inizio + durataValida(stato?.secondi) * 1000 : 0);
}

// DOPO UNA PAUSA IL PROGRAMMA NON SI SA, finche' una lettura chiesta dopo la
// fine non porta una pausa ancora da venire: Twitch mette in programma la
// prossima, ma non ci dice quando. Una lettura fallita, o che dice ancora 0,
// non chiude niente. Vale per RILETTURA_MS dalla fine, poi si torna al passo di
// sempre: un canale che non ha piu' pause in programma non va richiesto ogni
// mezzo minuto per tutta la sera. Prima si leggeva una volta sola, e se quella
// lettura andava male il conto spariva per cinque minuti dopo ogni pausa.
export function dopoLaPausa(stato, adesso = Date.now()) {
  const fine = fineDellaPausa(stato);
  if (!fine || fine > adesso || adesso - fine >= RILETTURA_MS) return false;
  const letto = Number(stato?.letto) || 0;
  return !(letto >= fine && (Number(stato?.prossima) || 0) > letto);
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
// l'ultima lettura e' vecchia. E dopo un errore non prima che l'attesa sia
// passata: la chiamata e' una, per la chat e per la scena.
export function vaGuardato(conf, stato, adesso = Date.now()) {
  if (!siDice(conf, 'prima')) return false;
  if (inAttesa(stato, adesso)) return false;
  const prossima = Number(stato?.prossima) || 0;
  if (!prossima) return true;
  if (prossima <= adesso) return true;
  if (adesso - (Number(stato?.letto) || 0) >= RILETTURA_MS) return true;
  return prossima - adesso <= conf.quanto * 1000 + 2 * GIRO_MS;
}

// IL CONTO SULL'OVERLAY. Gli serve sempre sapere la prossima pausa, ma con meno
// fretta degli annunci: il programma si rilegge ogni cinque minuti, e piu'
// spesso solo quando puo' essere cambiato. Cambia in tre momenti: vicino alla
// pausa (uno snooze la sposta, e il conto deve seguirla), quando la pausa
// doveva essere gia' partita, e alla fine di una pausa, quando Twitch mette in
// programma la prossima. Senza nessuna pausa in programma, e senza una pausa
// appena finita, non si chiede ogni mezzo minuto: la risposta non cambia.
//
// LA FINESTRA DELLO SNOOZE. Dentro SNOOZE_MS un conto lasciato indietro da uno
// snooze arriverebbe a zero per una pausa che non c'e': li' si legge a ogni
// giro, e lo snooze si vede entro un giro. Piu' in la', uno snooze non ancora
// letto sposta un conto che ha ancora piu' di SNOOZE_MS + 2 GIRO_MS davanti, e
// lo corregge al piu' tardi la prima lettura dentro la finestra, che si misura
// sulla pausa che si sapeva: quella lettura c'e' per costruzione. I due giri di
// margine sono quelli del preavviso: in due giri ne cade almeno uno anche
// quando un giro tarda. Prima la finestra era di due giri e basta, e uno
// snooze premuto quattro minuti prima restava invisibile per piu' di tre.
export function vaGuardatoPerOverlay(stato, adesso = Date.now()) {
  if (inAttesa(stato, adesso)) return false;
  const prossima = Number(stato?.prossima) || 0;
  const letto = Number(stato?.letto) || 0;
  if (!letto) return true;
  if (adesso - letto >= RILETTURA_MS) return true;
  if (dopoLaPausa(stato, adesso)) return true;
  if (!prossima) return false;
  if (prossima <= adesso) return true;
  return prossima - adesso <= SNOOZE_MS + 2 * GIRO_MS;
}

// DOPO UN RIAVVIO. Il conto dei secondi non sopravvive (vedi `_pub` nel bot),
// ma la fine di una pausa in corso e' un fatto, sta fra gli stati vivi, e
// l'overlay la sta gia' mostrando: ripartire senza vorrebbe dire togliergli il
// conto del ritorno a meta'. Si riprende solo quella. Il «sono tornato» in chat
// no: lo dice una sveglia, e nessuna sveglia la punta.
//
// Il lancio programmato dalla regia invece si riprende: e' una cosa che lo
// streamer ha chiesto e che il bot deve fare. Ma solo se il suo istante non e'
// passato mentre il bot era fermo: una pubblicita' che parte in ritardo, senza
// che nessuno l'abbia chiesta in quel momento, e' peggio di niente.
export function riprendi(salvato, adesso = Date.now(), lancio = null) {
  const fine = Number(salvato?.pausaFino) || 0;
  const out = fine > adesso ? { finisceA: fine } : {};
  const l = lancioDa(lancio);
  if (l && l.quando > adesso) out.lancio = l;
  return out;
}

// Un appuntamento di lancio letto da dove sta (gli stati vivi), o null.
export function lancioDa(v) {
  const quando = Number(v?.quando) || 0;
  const secondi = durataValida(v?.secondi);
  if (!quando || !secondi) return null;
  return { quando, secondi, detto: v?.detto === true };
}

// Quello che l'overlay deve sapere, e basta: la prossima pausa e la fine di
// quella in corso. Fuori diretta niente: Twitch non ne programma, e un conto a
// canale spento sarebbe inventato. La prossima e' la prima fra quella in
// programma e quella lanciata con anticipo dalla regia.
export function perOverlay(stato, live, adesso = Date.now()) {
  if (!live) return { prossima: 0, pausaFino: 0 };
  const pausaFino = Number(stato?.finisceA) > adesso ? Number(stato.finisceA) : 0;
  const futuri = [Number(stato?.prossima), Number(stato?.lancio?.quando)].filter((t) => t > adesso);
  const prossima = futuri.length ? Math.min(...futuri) : 0;
  return { prossima: pausaFino ? 0 : prossima, pausaFino };
}

// UN LANCIO DALLA REGIA, controllato prima di partire: quanto dura (30..180,
// come vuole Twitch), fra quanto (0..LANCIO_MAX_S), e se Twitch lo permette in
// quell'istante (`prossimoLancioDa`, dall'attesa che Twitch ha detto al lancio
// di prima). Torna { secondi, fra, quando } o { errore, da? }: l'errore e' un
// codice, che il server e il pannello dicono a parole.
//
// Il lancio di adesso lo decide Twitch, che risponde subito e sa piu' di noi:
// il bot puo' non vedere ancora la diretta (la vede entro un minuto), e un «non
// sei in diretta» falso e' peggio di un tentativo. Un appuntamento invece si
// controlla qui, perche' il no di Twitch arriverebbe solo all'istante fissato,
// a streamer distratto: serve che il bot veda la diretta (fuori diretta il giro
// lo toglierebbe subito) e che l'istante cada dopo la pausa in corso.
export function lancioValido({ secondi, fra } = {}, { live = false, prossimoLancioDa = 0, pausaFino = 0 } = {}, adesso = Date.now()) {
  const s = numero(secondi, LANCIO_MIN_DURATA, LANCIO_MAX_DURATA, 60);
  const f = numero(fra, 0, LANCIO_MAX_S, 0);
  const quando = adesso + f * 1000;
  if (Number(prossimoLancioDa) > quando) return { errore: 'presto', da: Number(prossimoLancioDa) };
  if (!f) return { secondi: s, fra: 0, quando };
  if (!live) return { errore: 'senza-diretta' };
  if (Number(pausaFino) > quando) return { errore: 'in-pausa', da: Number(pausaFino) };
  return { secondi: s, fra: f, quando };
}

// L'istante a cui puntare la sveglia del preavviso, o 0 se e' ancora presto.
// Si punta solo dentro la finestra: piu' in la' il programma si rilegge, e uno
// snooze nel frattempo si vede.
export function quandoAvvisare(conf, stato, programma, adesso = Date.now()) {
  if (!siDice(conf, 'prima')) return 0;
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
//
// UN PREAVVISO PER LA PRIMA PAUSA. Se prima di quella in programma c'e' un
// lancio della regia, il preavviso e' il suo (`preavvisoLancio`): dopo quella
// pausa Twitch sposta il programma, e due «fra poco la pubblicita'» per un
// minuto solo sarebbero uno di troppo. Lo stesso al contrario.
export function preavviso(conf, stato, programma, adesso = Date.now()) {
  if (!siDice(conf, 'prima')) return null;
  const quando = Number(programma?.prossima) || 0;
  if (!quando || quando <= adesso) return null;
  if (quando - adesso > conf.quanto * 1000) return null;
  if (String(stato?.dettoPer || '') === String(quando)) return null;
  const lancio = Number(stato?.lancio?.quando) || 0;
  if (lancio > adesso && lancio <= quando) return null;
  return { quando, secondi: durataValida(programma?.durata) };
}

// Il preavviso del lancio dalla regia, una volta, se la chat lo dice. La pausa
// in programma che viene prima lo toglie: quando comincia consuma il lancio.
export function preavvisoLancio(conf, stato, adesso = Date.now()) {
  const l = stato?.lancio;
  if (!l || l.detto || !(Number(l.quando) > adesso) || !siDice(conf, 'prima')) return null;
  const prossima = Number(stato?.prossima) || 0;
  if (prossima > adesso && prossima < l.quando) return null;
  return { quando: l.quando, secondi: l.secondi };
}

// ── La pausa che comincia ─────────────────────────────────────────────────
// LA PAUSA IN SE', senza nessuna frase: quando e' cominciata, quanto dura e
// quando finisce. Serve a due cose che non dipendono l'una dall'altra: gli
// annunci in chat e il conto sull'overlay. Tutte e due la registrano anche se
// l'altra e' spenta.
//
// LA STIMA E IL DATO. La pausa lanciata dalla regia si registra subito, con
// l'inizio stimato (`stima`); l'evento di Twitch della stessa pausa arriva
// prima o dopo. Le due cose sono la stessa pausa quando si sovrappongono
// (`stessaPausa`): Twitch non ne fa partire una seconda mentre la prima va.
// L'evento che arriva sopra la stima ne prende il posto (`stessa`: inizio e
// durata di Twitch, e niente annuncio); la stima che arriva sopra l'evento non
// tocca niente. Fra due eventi di Twitch decide l'inizio, come sempre: lo stesso
// inizio e' il messaggio rimandato, un inizio diverso e' Twitch che dice una
// cosa nuova, e vale.
export function stessaPausa(stato, p) {
  const inizio0 = Number(stato?.ultimaPausa) || 0;
  if (!inizio0 || !p?.inizio) return false;
  const fine0 = Math.max(inizio0, fineDellaPausa(stato));
  const fine = Math.max(p.inizio, Number(p.finisceA) || 0);
  return p.inizio < fine0 && fine >= inizio0;
}

export function pausaDa(evento, stato, adesso = Date.now(), { stima = false } = {}) {
  // L'istante dichiarato. Nei documenti si chiama `started_at`; c'e' chi l'ha
  // ricevuto come `timestamp`, e sono la stessa cosa.
  const inizio = istante(evento?.started_at ?? evento?.timestamp);
  // Senza un istante non si sa distinguere una pausa da un doppione, e senza
  // saperlo distinguere non si puo' promettere di non annunciarla due volte.
  if (!inizio) return null;
  const secondi = durataValida(evento?.duration_seconds);
  const finisceA = secondi ? Math.min(inizio, adesso) + secondi * 1000 : 0;
  const p = { inizio, secondi, finisceA, stima, stessa: false };
  const nota = !!stato?.stima;
  if (nota === stima) return String(stato?.ultimaPausa || '') === String(inizio) ? null : p;
  if (!stessaPausa(stato, p)) return p;
  return stima ? null : { ...p, stessa: true };
}

export function allaPartenza(conf, stato, evento, adesso = Date.now(), { stima = false } = {}) {
  const p = pausaDa(evento, stato, adesso, { stima });
  if (!p) return null;
  const { inizio, secondi, stessa } = p;
  // LA PAUSA FINISCE A INIZIO + DURATA, qualunque sia il momento in cui
  // l'evento arriva: un evento in ritardo ha gia' consumato parte della pausa,
  // e contare da quando arriva sposterebbe la fine di tutto quel ritardo. Il
  // minimo con adesso copre un orologio di Twitch avanti rispetto al nostro:
  // la pausa non puo' essere cominciata dopo che ce l'hanno detto.
  // Senza durata non c'e' una fine da contare, quindi nessun «sono tornato».
  const finisceA = p.finisceA;
  // A pausa gia' finita, «pubblicita' per 90 secondi» sarebbe falso. E la
  // stessa pausa, gia' annunciata con la stima, non si annuncia di nuovo.
  const inCorso = !secondi || finisceA > adesso;
  return { inizio, secondi, finisceA, stima, stessa, dire: !stessa && inCorso && siDice(conf, 'durante') };
}

// ── La pausa che finisce, che e' un conto e non un evento ────────────────
export function allaFine(conf, stato, adesso = Date.now()) {
  if (!siDice(conf, 'dopo')) return null;
  const finisceA = Number(stato?.finisceA) || 0;
  if (!finisceA || stato?.dettoDopo) return null;
  if (adesso < finisceA) return null;
  // In ritardo oltre la tolleranza non si dice niente: il bot si e' riavviato,
  // o l'evento e' arrivato tardi, e «sono tornato» dieci minuti dopo e' una
  // bugia detta in diretta. Meglio zitti.
  if (adesso - finisceA > conf.tolleranza * 1000) return { scaduto: true, dire: false };
  return { scaduto: false, dire: true, secondi: durataValida(stato?.secondi) };
}
