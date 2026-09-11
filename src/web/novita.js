// Le novità: come una cosa nuova arriva a chi usa il bot.
//
// «Non ha senso aggiungere funzioni che l'utente manco sa che esistano.» Il
// difetto non e' che manchi un changelog: e' che una funzione nuova e il modo
// di dirlo nascono in due momenti diversi, e il secondo si dimentica sempre.
//
// Quindi la riga si scrive NELLO STESSO COMMIT della cosa, in NOVITA.md, e un
// cancello (verifica-novita.mjs) rifiuta un commit che tocca il prodotto senza
// dire cosa cambia per chi lo usa — o senza dichiarare che non cambia niente.
// Da li' in poi e' tutto automatico: la pagina pubblica, la scheda nel
// pannello, il pallino di "c'e' qualcosa di nuovo" e la sitemap leggono questo
// file. Nessuno deve ricordarsi di pubblicare niente.
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
// crescita del cervello privato, il suo computer, il suo modo di ragionare sono cose del
// direttore, non della vetrina. Si marcano cosi':
//
//     - [privato] Il suo browser adesso resta aperto fra un gesto e l'altro.
//
// e da li' in poi non escono piu' di casa. La strada pubblica non le FILTRA:
// non le vede proprio — `pubbliche()` e' l'unica forma che arriva alla pagina,
// all'API aperta e alla sitemap, e chi la usa non ha modo di farsi dare una
// voce privata nemmeno sbagliando.
const PRIVATA = /^\[privat[oa]\]\s*/i;

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

export function analizza(testo) {
  const gruppi = [];
  for (const riga of String(testo).split('\n')) {
    const g = riga.match(GIORNO);
    if (g) { gruppi.push({ data: g[1], voci: [] }); continue; }
    const v = riga.match(VOCE);
    if (v && gruppi.length) {
      const privata = PRIVATA.test(v[1]);
      const dove = v[1].match(VAI);
      const testo = v[1].replace(VAI, '').replace(PRIVATA, '');
      gruppi[gruppi.length - 1].voci.push({ testo, privata, vai: dove ? dove[1].toLowerCase() : null });
    }
  }
  return gruppi.filter((g) => g.voci.length);
}

// Quello che può uscire di casa: le voci pubbliche, come stringhe, e senza i
// giorni che restano vuoti perché parlavano solo di lei.
export function pubbliche(gruppi) {
  return gruppi
    .map((g) => ({ data: g.data, voci: g.voci.filter((v) => !v.privata).map((v) => ({ testo: v.testo, vai: v.vai || null })) }))
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
// tutto quello che arriva dopo — e lo butta PER SEMPRE, perche' il confronto e'
// «giorno piu' recente di quello segnato» e quel giorno non lo sara' mai piu'.
//
// Quindi il segnaposto non e' un giorno: e' un PUNTO NELLA LISTA. La data in
// cima e QUANTE righe aveva quando l'hai vista. Le righe nuove di una giornata
// entrano in cima, percio' quelle che non hai visto sono le prime (ora - allora).
//
// Lo calcola chi mostra, sulla STESSA forma che mostra: a chi vede anche le
// righe sue il conto le comprende, a chi vede solo le pubbliche no. Leggere e
// segnare contano le stesse righe perche' passano di qui tutte e due.
const SEGNO = /^(\d{4}-\d{2}-\d{2})(?:#(\d{1,5}))?$/;

export function segnalibro(gruppi) {
  return gruppi.length ? `${gruppi[0].data}#${gruppi[0].voci.length}` : null;
}

export function segnoValido(s) {
  return SEGNO.test(String(s || ''));
}

// Quello che non hai ancora visto, nella stessa forma dei gruppi.
//
// Un segnaposto VECCHIO — la sola data, senza il conto — non dice quante righe
// c'erano, e non si puo' inventare. Quella giornata si rimostra intera una volta
// sola: rivedere qualche riga e' una seccatura, perderne ventinove no.
// IL TETTO. Chi torna dopo mesi — o chi aveva il segnaposto vecchio e si rivede
// una giornata intera — non deve trovarsi un muro di quaranta righe: un muro non
// si legge, e una finestra che non si legge vale zero. Si mostra quanto si legge
// davvero, si dice quante ne restano, e restano tutte in «Tutte le novita'», che
// e' la pagina fatta per quello. Il tetto e' sulle RIGHE, perche' e' quello che
// si legge: una giornata da trenta righe e' un muro anche se e' una sola.
export function taglia(gruppi, { righe = 12, giorni = 6 } = {}) {
  const fuori = [];
  let messe = 0;
  let altre = 0;
  for (const g of gruppi) {
    const spazio = fuori.length >= giorni ? 0 : Math.max(0, righe - messe);
    if (spazio <= 0) { altre += g.voci.length; continue; }
    const prese = g.voci.slice(0, spazio);
    altre += g.voci.length - prese.length;
    messe += prese.length;
    fuori.push({ data: g.data, voci: prese });
  }
  return { gruppi: fuori, altre };
}

export function daVedere(gruppi, segno) {
  const m = String(segno || '').match(SEGNO);
  if (!m) return gruppi.slice();
  const data = m[1];
  const viste = m[2] === undefined ? null : Number(m[2]);
  const fuori = [];
  for (const g of gruppi) {
    if (g.data > data) { fuori.push(g); continue; }
    if (g.data < data) break;
    const nuove = viste === null ? g.voci : g.voci.slice(0, Math.max(0, g.voci.length - viste));
    if (nuove.length) fuori.push({ data: g.data, voci: nuove });
    break;
  }
  return fuori;
}
