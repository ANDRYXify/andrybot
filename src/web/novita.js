// Le novità: come una cosa nuova arriva a chi usa il bot.
//
// «Non ha senso aggiungere funzioni che l'utente manco sa che esistano.» Il
// difetto non e' che manchi un changelog: e' che una funzione nuova e il modo
// di dirlo nascono in due momenti diversi, e il secondo si dimentica sempre.
//
// Quindi la riga si scrive NELLO STESSO COMMIT della cosa, in NOVITA.md, e un
// cancello (verifica-novita.mjs) rifiuta un commit che tocca il prodotto senza
// dire cosa cambia per chi lo usa — o senza dichiarare che non cambia niente.
// Da li' in poi e' tutto automatico: la pagina pubblica, la finestra delle
// novita' all'ingresso del pannello e la sitemap leggono questo file. Nessuno
// deve ricordarsi di pubblicare niente.
//
// Il file resta scritto a mano di proposito. Il messaggio di un commit racconta
// il lavoro; la riga qui racconta cosa cambia per chi trasmette, e sono due
// cose diverse. Generarla dai commit darebbe un elenco tecnico travestito.
import { readFileSync, statSync } from 'node:fs';

// `## 2026-09-02` apre un gruppo, `- ...` e' una voce. Il resto e' prosa per
// chi apre il file su git, e non entra nella pagina.
const GIORNO = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const VOCE = /^[-*]\s+(.+?)\s*$/;

// LE NOVITÀ PRIVATE. Non tutto quello che cambia riguarda chi usa il bot: la
// crescita del cervello privato, il suo computer, il suo modo di ragionare sono cose
// private, non della vetrina. Si marcano cosi':
//
//     - [privato] Il suo browser adesso resta aperto fra un gesto e l'altro.
//
// e da li' in poi non escono piu' di casa. La strada pubblica non le FILTRA:
// non le vede proprio — `pubbliche()` e' l'unica forma che arriva alla pagina,
// all'API aperta e alla sitemap, e chi la usa non ha modo di farsi dare una
// voce privata nemmeno sbagliando.
const PRIVATA = /^\[privat[oa]\]\s*/i;

// LE NOVITÀ IMPORTANTI. Non tutte le righe pesano uguale: una funzione nuova
// che cambia cosa puoi fare non e' una correzione di una virgola, e mostrarle
// allo stesso modo vuol dire che la prima si perde fra le seconde. Il peso lo
// decide chi scrive la riga, nello stesso commit, con un segno in testa:
//
//     - [importante] Instagram si collega con un tasto. [vai: notifiche]
//
// Si puo' mettere insieme a [privato], in qualunque ordine. Chi mostra le
// importanti le mette prima e le fa vedere diverse; non finiscono mai sotto il
// taglio di chi mostra poche righe.
const IMPORTANTE = /^\[importante\]\s*/i;

// DOVE E' SUCCESSA. Una riga dice cosa e' cambiato; da sola non dice dove
// andare a vederlo, e chi legge deve mettersi a cercare la scheda giusta. La
// destinazione si scrive IN FONDO ALLA RIGA, nello stesso commit della cosa:
//
//     - I menu' con tante voci non si schiacciano piu'. [vai: consolify]
//
// e' l'unico modo perche' non si scolli. Da li' ognuno la dice a modo suo: il
// pannello apre quella scheda, la pagina pubblica manda alla guida che la
// spiega. Il nome della scheda NON si scrive qui: si ricava, cosi' non esiste
// una riga che chiama una cosa con un nome che nel pannello non c'e' piu'.
const VAI = /\s*\[vai:\s*([a-z0-9-]{2,40})\]\s*$/i;

// UN'IMPORTANTE SI PRESENTA PER INTERO. Una capacita' nuova detta con la stessa
// riga di una virgola corretta si perde lo stesso, anche messa per prima: chi la
// legge deve capire cos'e', perche' conta e dove si prova. Sotto la riga, due
// righe rientrate col segno della citazione:
//
//     - [importante] Il muro delle emote: ... [vai: alert]
//       > Il muro delle emote
//       > Le emote della chat diventano parte della scena, e la chat lo vede.
//
// La prima e' il titolo, le altre il perche'. La riga resta com'e' (e con lei
// l'impronta di «gia' vista»): il titolo e il perche' le si mettono accanto.
// Solo le importanti ce l'hanno, tutte: e' questo che le fa pesare di piu'
// (verifica-novita.mjs).
const CITA = /^\s+>\s?(.*?)\s*$/;

export function analizza(testo) {
  const gruppi = [];
  let ultima = null;
  for (const riga of String(testo).split('\n')) {
    const c = ultima && riga.match(CITA);
    if (c) {
      if (!c[1]) continue;
      if (ultima.titolo == null) ultima.titolo = c[1];
      else ultima.perche = ultima.perche ? `${ultima.perche} ${c[1]}` : c[1];
      continue;
    }
    ultima = null;
    const g = riga.match(GIORNO);
    if (g) { gruppi.push({ data: g[1], voci: [] }); continue; }
    const v = riga.match(VOCE);
    if (v && gruppi.length) {
      let resto = v[1];
      let privata = false;
      let importante = false;
      for (;;) {
        if (PRIVATA.test(resto)) { privata = true; resto = resto.replace(PRIVATA, ''); continue; }
        if (IMPORTANTE.test(resto)) { importante = true; resto = resto.replace(IMPORTANTE, ''); continue; }
        break;
      }
      const dove = resto.match(VAI);
      const testo = resto.replace(VAI, '');
      ultima = { testo, privata, importante, vai: dove ? dove[1].toLowerCase() : null };
      gruppi[gruppi.length - 1].voci.push(ultima);
    }
  }
  return gruppi.filter((g) => g.voci.length);
}

// Quello che può uscire di casa: le voci pubbliche, come stringhe, e senza i
// giorni che restano vuoti perché parlavano solo di lei.
export function pubbliche(gruppi) {
  return gruppi
    .map((g) => ({ data: g.data, voci: g.voci.filter((v) => !v.privata).map((v) => ({ testo: v.testo, vai: v.vai || null, importante: !!v.importante,
      ...(v.titolo ? { titolo: v.titolo } : {}), ...(v.perche ? { perche: v.perche } : {}) })) }))
    .filter((g) => g.voci.length);
}

// A SEZIONI. Le righe di una giornata parlano quasi sempre di due o tre punti
// del pannello: raccolte sotto il nome di quel punto si leggono come un discorso
// invece che come un elenco, e il nome diventa la porta per andarci.
//
// Si raggruppa per destinazione, nell'ordine in cui la destinazione compare la
// prima volta. Non per vicinanza: due blocchi della stessa sezione separati da
// una riga qualsiasi darebbero lo stesso titolo due volte a tre righe di
// distanza, e un titolo ripetuto sembra un difetto. Le righe che non dicono dove
// stanno insieme, senza titolo, dove compare la prima.
export function inSezioni(voci) {
  const per = new Map();
  for (const v of voci) {
    const dove = v && typeof v === 'object' ? (v.vai || null) : null;
    if (!per.has(dove)) per.set(dove, { vai: dove, voci: [] });
    per.get(dove).voci.push(v);
  }
  return [...per.values()];
}

// Le destinazioni nominate nel file, per chi deve controllare che esistano.
export function destinazioni(gruppi) {
  const out = new Set();
  for (const g of gruppi) for (const v of g.voci) if (v.vai) out.add(v.vai);
  return [...out];
}

// Tutto, per chi ha il diritto di vederlo. Le voci restano oggetti, così chi le
// mostra può dire quali sono solo sue.
export function tutte(gruppi) {
  return gruppi.map((g) => ({ data: g.data, voci: g.voci.map((v) => ({ ...v })) }));
}

// La data come la direbbe una persona: «2 settembre 2026».
export function inItaliano(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString('it-IT',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Si rilegge solo quando il file cambia davvero. La cache e' PER FILE: le
// novita' arrivano da due file (quello pubblico e quello privato del cervello),
// e una cache sola con la data dell'ultimo letto restituirebbe i gruppi di un
// file sotto il nome dell'altro non appena le due date coincidono.
const cache = new Map();
export function leggi(via) {
  let mtime = 0;
  try { mtime = statSync(via).mtimeMs; } catch { return []; }
  const c = cache.get(via);
  if (!c || mtime !== c.quando) {
    try { cache.set(via, { quando: mtime, gruppi: analizza(readFileSync(via, 'utf8')) }); } catch { return c ? c.gruppi : []; }
  }
  return cache.get(via).gruppi;
}

// Due fonti, un solo elenco: le voci dello stesso giorno stanno insieme (prima
// quelle della prima fonte), i giorni in ordine dal piu' recente. E' cosi' che
// il pannello del proprietario vede le novita' pubbliche e quelle del cervello
// come una storia sola, senza che il file pubblico contenga le seconde.
export function unisci(a, b) {
  const perData = new Map();
  for (const g of [...(a || []), ...(b || [])]) {
    if (!perData.has(g.data)) perData.set(g.data, { data: g.data, voci: [] });
    perData.get(g.data).voci.push(...g.voci.map((v) => ({ ...v })));
  }
  return [...perData.values()].sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0));
}

// L'ultima novità: e' la data che il pannello confronta con «l'hai gia' vista».
export function ultima(gruppi) {
  return gruppi.length ? gruppi[0].data : null;
}

// IL SEGNAPOSTO. Una giornata non e' chiusa quando comincia: resta aperta e si
// allunga per tutto il giorno. Segnarla vista col solo NOME DEL GIORNO butta via
// tutto quello che arriva dopo, e lo butta per sempre.
//
// Il secondo tentativo contava le righe («2026-09-23#18») e supponeva che le
// nuove entrassero in cima alla giornata. La regola per scriverle diceva «in
// fondo», e chi guarda da amministratore ha le righe private accodate dopo le
// pubbliche: le righe «nuove» del conto erano le prime, cioe' quelle vecchie.
// Ogni riga aggiunta faceva rivedere una riga gia' vista e nascondeva per sempre
// quella nuova. Non era un conto sbagliato da correggere: era un conto che
// dipendeva da DOVE si scrive, e non deve dipenderne.
//
// Quindi ogni riga ha un'IDENTITA' sua — un'impronta della data e del testo — e
// il segnaposto e' l'insieme delle righe viste. La posizione non conta piu',
// pubbliche e private non si pestano i piedi, e una riga riscritta torna a
// vedersi (e' cambiata: va riletta).
//
// Per non portarsi dietro la storia intera, il segnaposto tiene le impronte
// delle ultime FINESTRA giornate e la data della piu' vecchia di queste: tutto
// quello che viene prima e' visto. Le righe si scrivono nella giornata di oggi,
// quindi la finestra copre sempre quelle che possono ancora cambiare.
//
//     v2:AAAA-MM-GG:impronta.impronta.impronta
//
// Lo calcola chi mostra, sulla STESSA forma che mostra, e la pagina lo ridà
// indietro com'era: fra il mostrare e il segnare non c'e' spazio per una riga
// che entra di nascosto.
const FINESTRA = 3;
const VECCHIO = /^(\d{4}-\d{2}-\d{2})(?:#(\d{1,5}))?$/;
const NUOVO = /^v2:(\d{4}-\d{2}-\d{2}):((?:[0-9a-z]{1,8})(?:\.[0-9a-z]{1,8})*)?$/;
export const SEGNO_MAX = 12000;

// FNV-1a a 32 bit: deterministica, senza dipendenze, e per le poche centinaia di
// righe di una finestra lo scontro fra due impronte non e' un caso reale.
export function idVoce(data, testo) {
  let h = 0x811c9dc5;
  const s = `${data}\n${testo}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const testoDi = (v) => (typeof v === 'string' ? v : v.testo);

export function segnalibro(gruppi) {
  if (!gruppi.length) return null;
  const dentro = gruppi.slice(0, FINESTRA);
  const ids = dentro.flatMap((g) => g.voci.map((v) => idVoce(g.data, testoDi(v))));
  return `v2:${dentro[dentro.length - 1].data}:${ids.join('.')}`;
}

export function segnoValido(s) {
  const t = String(s || '');
  return t.length <= SEGNO_MAX && (VECCHIO.test(t) || NUOVO.test(t));
}

// IL TETTO. Chi torna dopo mesi non deve trovarsi un muro di quaranta righe: un
// muro non si legge, e una finestra che non si legge vale zero. Si mostra quanto
// si legge davvero, si dice quante ne restano, e restano tutte in «Tutte le
// novita'». Il tetto e' sulle RIGHE, perche' e' quello che si legge.
//
// Le importanti non passano dal taglio delle altre: escono per prime, a parte
// (`evidenza`), fino a EVIDENZA_MAX. Il posto che resta sotto il tetto va alle
// altre. In tutte e due, dalla piu' recente: le giornate sono gia' in quell'ordine,
// e dentro una giornata le righe si scrivono in fondo, quindi la piu' nuova e'
// l'ultima. L'ordine decide solo cosa entra sotto il tetto; cosa hai visto lo
// decide l'impronta, non la posizione.
export const EVIDENZA_MAX = 12;
export function taglia(gruppi, { righe = 12, giorni = 6 } = {}) {
  const evidenza = [];
  let altre = 0;
  for (const g of gruppi) {
    for (const v of [...g.voci].reverse()) {
      if (!v.importante) continue;
      if (evidenza.length < EVIDENZA_MAX) evidenza.push({ ...v, data: g.data });
      else altre++;
    }
  }
  const fuori = [];
  let messe = evidenza.length;
  for (const g of gruppi) {
    const normali = g.voci.filter((v) => !v.importante).reverse();
    if (!normali.length) continue;
    const spazio = fuori.length >= giorni ? 0 : Math.max(0, righe - messe);
    if (spazio <= 0) { altre += normali.length; continue; }
    const prese = normali.slice(0, spazio);
    altre += normali.length - prese.length;
    messe += prese.length;
    fuori.push({ data: g.data, voci: prese });
  }
  return { evidenza, gruppi: fuori, altre };
}

// Quello che non hai ancora visto, nella stessa forma dei gruppi.
//
// Col segnaposto vecchio («giorno#quante» o il solo giorno) non si sa quali
// righe hai visto davvero: il conto, come si e' detto, indicava quelle
// sbagliate. Allora quella giornata si rimostra intera, una volta, e delle
// giornate della settimana prima si rimostrano le IMPORTANTI: sono proprio
// quelle che il conto sbagliato puo' aver nascosto, ed e' meglio rivedere
// qualche riga che perdere una cosa nuova.
const RECUPERO_GIORNI = 7;

function giorniFra(a, b) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

export function daVedere(gruppi, segno) {
  const t = String(segno || '');
  const nuovo = t.match(NUOVO);
  if (nuovo) {
    const fino = nuovo[1];
    const viste = new Set((nuovo[2] || '').split('.').filter(Boolean));
    const fuori = [];
    for (const g of gruppi) {
      if (g.data < fino) break;
      const voci = g.voci.filter((v) => !viste.has(idVoce(g.data, testoDi(v))));
      if (voci.length) fuori.push({ data: g.data, voci });
    }
    return fuori;
  }
  const vecchio = t.match(VECCHIO);
  if (!vecchio) return gruppi.slice();
  const data = vecchio[1];
  const fuori = [];
  for (const g of gruppi) {
    if (g.data >= data) { fuori.push(g); continue; }
    if (giorniFra(data, g.data) > RECUPERO_GIORNI) break;
    const importanti = g.voci.filter((v) => v.importante);
    if (importanti.length) fuori.push({ data: g.data, voci: importanti });
  }
  return fuori;
}
