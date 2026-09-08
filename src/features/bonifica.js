// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA BONIFICA: ripulire dopo, senza rifare il danno.
//
// La difesa in tempo reale ferma quello che arriva adesso. Ma un attacco lascia
// sempre uno strascico: gli account che sono passati prima che lo scudo si
// convincesse, quelli su cui il blocco è fallito, e i follower finti rimasti
// nella lista. Il numero gonfiato è il danno vero di un follow-bot — il rapporto
// follower/spettatori conta per Affiliato e Partner, e chi arriva sul canale lo
// legge.
//
// LA REGOLA, E VIENE PRIMA DI TUTTO IL RESTO:
//
//   NON SI TOGLIE UN FOLLOWER SOLO PERCHÉ È ARRIVATO DURANTE L'ATTACCO.
//
// È la cosa più facile da fare e la più sbagliata: «prendi l'intervallo e
// cancella tutto» ripulisce in un colpo e si porta via i fan veri arrivati in
// quei minuti — che sono proprio quelli che una clip virale o un raid hanno
// appena portato. Un fan vero rimosso non torna, e non sa nemmeno perché.
//
// Quindi si lavora sui GIUDIZI che l'incidente ha già scritto mentre succedeva,
// non sull'orologio. Chi è stato misurato come parte della fabbrica è «certo»;
// chi è arrivato mentre il canale era in allarme senza nessun segnale contro è
// «legittimo», e resta lì.
//
// E LA CONFERMA È IL NUMERO. Per eseguire bisogna riscrivere quanti account si
// stanno per togliere: se nel frattempo il numero è cambiato — altri follow,
// un altro giudizio — la conferma non vale più e si guarda di nuovo. Non è un
// fastidio: è l'unico modo perché «ho letto» significhi davvero «ho letto».
//
// Il modello per esteso: docs/BONIFICA.md.
import * as inc from './incidenti.js';
import { dominante } from './gruppi.js';

const norm = (s) => String(s || '').toLowerCase().trim();

// Cosa si può proporre di togliere, e cosa no. I «legittimi» non sono qui: non
// è una dimenticanza, è che non devono poter finire in un'operazione di massa
// nemmeno per sbaglio. Chi vuole toccarne uno lo fa a mano, uno per volta.
export const TOGLIBILI = [inc.GIUDIZI.CERTO, inc.GIUDIZI.PROBABILE, inc.GIUDIZI.SOSPETTO];

// Il rapporto: cosa è rimasto in casa dopo l'attacco.
export function rapporto(incidente) {
  const i = typeof incidente === 'string' ? inc.uno(incidente) : incidente;
  if (!i) return null;
  const per = { certo: [], probabile: [], sospetto: [], legittimo: [] };
  for (const [login, v] of Object.entries(i.coinvolti || {})) {
    (per[v.giudizio] || per.sospetto).push({ login, userId: v.userId || '', punti: v.punti || 0, ts: v.ts });
  }
  const g = dominante(per.certo.concat(per.probabile).map((x) => ({ login: x.login })));
  return {
    incidente: i.id, canale: i.canale, tipo: i.tipo,
    aperto: i.aperto, chiuso: i.chiuso,
    ricevuti: Object.keys(i.coinvolti || {}).length,
    quanti: { certo: per.certo.length, probabile: per.probabile.length, sospetto: per.sospetto.length, legittimo: per.legittimo.length },
    // Quanti si possono davvero togliere: senza l'id di Twitch non si tocca
    // nessuno, e dirlo prima evita di promettere un numero che non si mantiene.
    conId: TOGLIBILI.reduce((n, g2) => n + per[g2].filter((x) => x.userId).length, 0),
    gruppo: g ? { motivo: g.motivo, quanti: g.quanti } : null,
    per,
    // La proposta di partenza è la più prudente che abbia senso: i certi, e
    // basta. Il resto lo aggiunge chi guarda, se vuole.
    proposta: [inc.GIUDIZI.CERTO],
  };
}

// Chi verrebbe tolto con questi giudizi. Sempre la stessa funzione per il conto
// e per l'esecuzione: due strade separate finirebbero per dire numeri diversi,
// e allora la conferma non varrebbe più niente.
export function candidati(incidente, giudizi = [inc.GIUDIZI.CERTO]) {
  const r = rapporto(incidente);
  if (!r) return [];
  const scelti = giudizi.filter((g) => TOGLIBILI.includes(g));
  const fuori = [];
  for (const g of scelti) for (const x of r.per[g] || []) if (x.userId) fuori.push({ ...x, giudizio: g });
  return fuori;
}

// L'anteprima: cosa succederebbe, senza che succeda niente.
export function anteprima(incidente, giudizi) {
  const r = rapporto(incidente);
  if (!r) return null;
  const chi = candidati(incidente, giudizi);
  return {
    incidente: r.incidente, canale: r.canale,
    quanti: chi.length,
    // Il numero da riscrivere per confermare. Cambia quando cambia la lista, ed
    // è esattamente il punto.
    conferma: String(chi.length),
    risparmiati: r.quanti.legittimo,
    esempi: chi.slice(0, 12).map((x) => x.login),
    giudizi: (giudizi || []).filter((g) => TOGLIBILI.includes(g)),
  };
}

// L'esecuzione. Non tocca Twitch: produce i verdetti e li dà all'esecutore, che
// ha la coda, il ritmo e la coda dei falliti. Qui si decide chi, non come.
export function verdettiPer(incidente, giudizi, { aVuoto = false } = {}) {
  const r = rapporto(incidente);
  if (!r) return [];
  return candidati(incidente, giudizi).map((x) => ({
    canale: r.canale, login: x.login, userId: x.userId,
    motivi: [`bonifica ${r.incidente}: giudicato ${x.giudizio} durante l'attacco`],
    origine: 'bonifica', incidente: r.incidente, punti: x.punti, confidenza: x.giudizio === inc.GIUDIZI.CERTO ? 0.99 : 0.7,
    aVuoto,
  }));
}

// La conferma è il numero, e va confrontata con quello di ADESSO — non con
// quello che chi guarda aveva sotto gli occhi un minuto fa.
export function confermaValida(incidente, giudizi, conferma) {
  const a = anteprima(incidente, giudizi);
  if (!a) return { ok: false, motivo: 'incidente non trovato' };
  if (!a.quanti) return { ok: false, motivo: 'non c\'è niente da togliere' };
  if (String(conferma || '').trim() !== a.conferma) {
    return { ok: false, motivo: `adesso sono ${a.quanti}: riscrivi questo numero`, quanti: a.quanti };
  }
  return { ok: true, quanti: a.quanti };
}
