// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// QUANTO È GRAVE, ADESSO. Il livello del canale, e cosa cambia a ogni scalino.
//
// Prima i livelli erano tre — calma, sospetto, attacco — e in mezzo non c'era
// niente. Il difetto non era il numero: era che «sospetto» NON FACEVA NIENTE.
// Si alzava, si scriveva nel registro, e il canale restava esattamente com'era.
// Un livello che non cambia niente non è un livello, è un'etichetta.
//
// E dall'altra parte il salto era brutale: da «non faccio niente» a «chiudo la
// chat, alzo lo Shield Mode e blocco l'ondata». Fra il nulla e la serranda ci
// sono almeno tre cose sensate da fare, e non farle vuol dire che il bot o
// dorme o esagera.
//
// SEI LIVELLI, E OGNUNO FA UNA COSA CHE GLI ALTRI NON FANNO. Non sono sei nomi
// per tre comportamenti: se due livelli facessero lo stesso, sarebbero un
// livello solo con un sinonimo.
//
//   0 CALMA     il canale normale.
//   1 OSSERVO   si guarda di più e non si tocca niente: i controlli sui nomi si
//               accendono, quello che si vede finisce nel registro.
//   2 ALLERTA   la soglia si abbassa e gli account appena nati che scrivono
//               vengono SEGNALATI ai mod. Ancora nessuna azione automatica.
//   3 DIFESA    chat lenta, e i messaggi degli account nati da poche ore vengono
//               trattenuti. Si tocca il messaggio, non la persona.
//   4 ATTACCO   la serranda: chat ai soli follower, Shield Mode, e l'ondata
//               riconosciuta come artificiale viene bloccata.
//   5 SERRATA   come sopra, ma la porta è più stretta: follower da più tempo,
//               chat più lenta. È l'ultima cosa prima di chiudere del tutto.
//
// SI SALE IN FRETTA E SI SCENDE PIANO, che è la forma giusta per una difesa: il
// costo di alzare un livello di troppo per qualche minuto è basso, il costo di
// restare indietro durante un'ondata è alto.
//
// Il modello per esteso: docs/LIVELLI.md.

export const LIVELLI = ['calma', 'osservo', 'allerta', 'difesa', 'attacco', 'serrata'];
export const N = Object.fromEntries(LIVELLI.map((l, i) => [l, i]));

// Le soglie del punteggio d'attacco a cui si sale, per ciascuna modalità. Non
// sono numeri diversi per il gusto di esserlo: cambiano SOLO dove si passa da
// un comportamento all'altro, e la scala del punteggio resta la stessa.
export const MODI = {
  prudente:   { osservo: 25, allerta: 45, difesa: 65, attacco: 80, serrata: 95 },
  bilanciata: { osservo: 20, allerta: 35, difesa: 50, attacco: 70, serrata: 90 },
  aggressiva: { osservo: 15, allerta: 25, difesa: 40, attacco: 55, serrata: 80 },
};
export const MODO_PREDEFINITO = 'bilanciata';

export function livelloDa(punteggio, modo = MODO_PREDEFINITO) {
  const s = MODI[modo] || MODI[MODO_PREDEFINITO];
  const p = Math.max(0, Math.min(100, Number(punteggio) || 0));
  let fuori = 'calma';
  for (const l of LIVELLI.slice(1)) if (p >= s[l]) fuori = l;
  return fuori;
}

export const almeno = (livello, quale) => (N[livello] ?? 0) >= (N[quale] ?? 0);

// ── Il punteggio d'attacco ──────────────────────────────────────────────────
//
// Continuo, non a scalini, perché a scalini si perde tutto quello che sta in
// mezzo: «nove follow quando la soglia è dieci» e «zero follow» non sono la
// stessa cosa, e col booleano lo diventano.
//
// I pesi dicono quanto conta ciascuna cosa, e sono quelli che si tarano col
// simulatore. La somma si ferma a cento: oltre non c'è niente di più grave.
// I pesi non sono opinioni: si tarano su cosa deve SUCCEDERE. Un'ondata
// misurata come macchina deve portare alla serranda, quindi la somma dei suoi
// segnali deve arrivare alla soglia dell'attacco; un coro confermato è già un
// attacco in corso e deve arrivarci da solo; il gocciolamento con la fabbrica
// riconosciuta pure, perché lì si blocca. Il primo giro li aveva sbagliati in
// due punti — l'ondata artificiale finiva dritta in serrata, il coro si fermava
// a «osservo» — e i conti qui sotto lo hanno mostrato prima del codice.
export const PESI = {
  raffica: 45,        // quanti follow rispetto alla soglia di questo canale
  // Un'ondata MISURATA come macchina non è un indizio, è una certezza: da sola,
  // sommata alla raffica che l'ha fatta scattare, deve bastare per la serranda.
  // Col peso di prima un'ondata artificiale da sedici follow si fermava a
  // «difesa» — chat lenta e nient'altro — cioè si misurava un attacco e non lo
  // si trattava da attacco.
  artificiale: 50,
  gruppo: 10,         // e i nomi vengono da una fabbrica sola
  coro: 70,           // lo stesso messaggio da molte bocche: è già un attacco
  ondaLenta: 45,      // il gocciolamento, che è lento ma non meno vero
  nuovi: 20,          // quanta parte di chi scrive ha l'account di ieri
};

export function punteggioAttacco(s = {}) {
  let p = 0;
  // La raffica entra in proporzione, e satura al doppio della soglia: da lì in
  // poi «molto più del normale» non aggiunge informazione.
  const quanti = Math.max(0, Number(s.follow) || 0);
  const soglia = Math.max(1, Number(s.soglia) || 1);
  p += PESI.raffica * Math.min(1, quanti / (soglia * 2));

  if (s.artificiale) p += PESI.artificiale;
  if (s.gruppo) p += PESI.gruppo;
  // Il coro conta pieno già alle bocche che lo confermano: oltre non è «più
  // attacco», è lo stesso attacco con più gente.
  if (s.coro) p += PESI.coro * Math.min(1, Math.max(0, Number(s.coroBocche) || 0) / 4);
  if (s.ondaLenta) p += PESI.ondaLenta;
  p += PESI.nuovi * Math.min(1, Math.max(0, Number(s.frazioneNuovi) || 0));

  return Math.round(Math.min(100, p));
}

// ── Cosa cambia a ogni scalino ──────────────────────────────────────────────
// Una funzione sola: dato il livello, come si comporta lo scudo. Sta qui e non
// sparsa in venti `if`, così «cosa fa il livello 3» si risponde leggendo sei
// righe invece di cercare per tutto il file.
export function assettoDi(livello) {
  const l = N[livello] ?? 0;
  return {
    livello,
    numero: l,
    guardaNomi: l >= N.osservo,
    guardaPresenze: l >= N.osservo,
    segnalaNuovi: l >= N.allerta,
    sogliaPiuBassa: l >= N.allerta,
    trattieniNuovi: l >= N.difesa,
    chatLenta: l >= N.difesa ? (l >= N.serrata ? 30 : 10) : 0,
    serranda: l >= N.attacco,
    followerDaMinuti: l >= N.serrata ? 60 : 10,
    shieldMode: l >= N.attacco,
    bloccaOndata: l >= N.attacco,
    // Quante ore deve avere un account per non essere «appena nato». Più si
    // sale, più la porta è stretta.
    oreMinime: l >= N.serrata ? 168 : l >= N.difesa ? 72 : 24,
  };
}
