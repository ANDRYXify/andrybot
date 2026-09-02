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

export function analizza(testo) {
  const gruppi = [];
  for (const riga of String(testo).split('\n')) {
    const g = riga.match(GIORNO);
    if (g) { gruppi.push({ data: g[1], voci: [] }); continue; }
    const v = riga.match(VOCE);
    if (v && gruppi.length) gruppi[gruppi.length - 1].voci.push(v[1]);
  }
  return gruppi.filter((g) => g.voci.length);
}

// La data come la direbbe una persona: «2 settembre 2026».
export function inItaliano(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString('it-IT',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Si rilegge solo quando il file cambia davvero.
let cache = { quando: 0, gruppi: [] };
export function leggi(via) {
  let mtime = 0;
  try { mtime = statSync(via).mtimeMs; } catch { return []; }
  if (mtime !== cache.quando) {
    try { cache = { quando: mtime, gruppi: analizza(readFileSync(via, 'utf8')) }; } catch { return cache.gruppi; }
  }
  return cache.gruppi;
}

// L'ultima novità: e' la data che il pannello confronta con «l'hai gia' vista».
export function ultima(gruppi) {
  return gruppi.length ? gruppi[0].data : null;
}
