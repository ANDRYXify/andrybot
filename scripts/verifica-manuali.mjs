// Cancello dei MANUALI: quello che il bot sa fare, il manuale lo dice.
//
// Un manuale invecchia in silenzio. Si aggiunge un'azione, un gioco, una
// variabile — e la pagina che dovrebbe spiegarli resta quella di prima: chi la
// legge conclude che quella cosa non esiste, ed e' peggio che non avere il
// manuale, perche' ci ha creduto.
//
// Qui l'elenco non si scrive: si legge dal motore e dal pannello, e si guarda
// che nel manuale ci sia. Se domani nasce un'azione nuova, questo cancello
// diventa rosso finche' qualcuno non la spiega.
//
// Uso: node scripts/verifica-manuali.mjs   (esce 1 se manca qualcosa)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MANUALI, aiutiPerScheda } from '../src/web/manuali.js';
import { GIOCHI } from '../src/features/giochi-tabella.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const app = leggi('src/web/public/app.js');
const srv = leggi('src/web/server.js');
const giochiJs = leggi('src/features/games.js');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// Il testo di un manuale, tutto insieme: titoli, paragrafi, elenchi, tabelle,
// esempi e domande. Quello che il lettore ha davanti.
function testoDi(m) {
  const pezzi = [m.h1, m.desc];
  const giu = (x) => {
    if (x == null) return;
    if (Array.isArray(x)) { for (const y of x) giu(y); return; }
    if (typeof x === 'object') { for (const y of Object.values(x)) giu(y); return; }
    pezzi.push(String(x));
  };
  giu(m.corpo); giu(m.faq);
  return pezzi.join('\n');
}
const testi = Object.fromEntries(MANUALI.map((m) => [m.slug, testoDi(m)]));
dice(!!testi.giochi && !!testi.moduli, `manuali: ${MANUALI.map((m) => m.slug).join(', ')}`);

// Un termine c'e' se compare, senza badare a maiuscole e accenti.
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const cerca = (dove, ago) => norm(testi[dove]).includes(norm(ago));

function copre(dove, cosa, elenco) {
  const persi = elenco.filter((x) => !cerca(dove, x));
  dice(persi.length === 0, `${cosa}: ${elenco.length} · nel manuale ${elenco.length - persi.length}`,
    persi.join(', '));
}

// ---- le azioni: il pannello le offre, il manuale le spiega ----------------
const AZIONI = [...app.matchAll(/\['([a-zA-Z]+)',\s*'((?:[^'\\]|\\.)+)'\],?\s*(?=\n)/g)];
const bloccoAzioni = app.slice(app.indexOf('const AZIONI = ['), app.indexOf('const VARIABILI = ['));
const etichette = [...bloccoAzioni.matchAll(/\[\s*'[a-zA-Z]+',\s*'((?:[^'\\]|\\.)+)'\s*\]/g)]
  .map((m) => m[1].replace(/\\'/g, "'"));
const idAzioni = (srv.match(/const MOD_AZIONI = \[([^\]]*)\]/) || [])[1];
const idElenco = idAzioni ? [...idAzioni.matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]) : [];
dice(etichette.length === idElenco.length && etichette.length > 0,
  `azioni del motore: ${idElenco.length} · voci nel pannello: ${etichette.length}`);
copre('moduli', 'azioni spiegate', etichette);

// ---- inneschi ed eventi ---------------------------------------------------
const trigger = [...(srv.match(/const MOD_TRIGGER = \[([^\]]*)\]/) || ['', ''])[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
copre('moduli', 'inneschi', trigger);
const bloccoEventi = app.slice(app.indexOf('const EVENTI = ['), app.indexOf('const EVENTI_TXT'));
const eventi = [...bloccoEventi.matchAll(/\[\s*'[a-z]+',\s*'([^']+)'\s*\]/g)].map((m) => m[1]);
copre('moduli', 'eventi', eventi);

// ---- le variabili offerte dal pannello ------------------------------------
const bloccoVar = app.slice(app.indexOf('const VARIABILI = ['), app.indexOf('const LEGENDA_VAR'));
const variabili = [...bloccoVar.matchAll(/'(\$[^']+)'/g)].map((m) => m[1]);
copre('moduli', 'variabili offerte', variabili);

// ---- i comandi di gioco ---------------------------------------------------
// Non si leggono piu' dal `switch`: i giochi sono una tabella, e la tabella e'
// la stessa che il motore dispaccia e che il pannello disegna.
const comandi = GIOCHI.flatMap((g) => g.nomi);
copre('giochi', 'comandi di gioco', comandi.map((c) => '!' + c));

// E il motore deve sapere cosa fare per ogni riga: una riga senza il suo blocco
// sarebbe un gioco che il pannello mostra e la chat non conosce.
const casi = new Set([...giochiJs.slice(giochiJs.indexOf('switch (cmd) {')).matchAll(/case '([a-z0-9]+)':/g)].map((m) => m[1]));
const senzaMotore = GIOCHI.filter((g) => !casi.has(g.id)).map((g) => g.id);
dice(senzaMotore.length === 0, `ogni gioco della tabella ha il suo blocco nel motore: ${GIOCHI.length}`, senzaMotore.join(', '));
const senzaTabella = [...casi].filter((c) => !GIOCHI.some((g) => g.id === c));
dice(senzaTabella.length === 0, 'nessun blocco del motore resta fuori dalla tabella', senzaTabella.join(', '));

// ---- le manche ------------------------------------------------------------
const manche = [...giochiJs.matchAll(/nome: '([^']+)',\s*materiale:/g)].map((m) => m[1]);
copre('giochi', 'tipi di manche', manche);

// ---- le ricette a punti ---------------------------------------------------
const bloccoRicette = app.slice(app.indexOf('const RICETTE_PUNTI = ['), app.indexOf('const bottoniRicette'));
const ricette = [...bloccoRicette.matchAll(/L\('([^']+)'/g)].map((m) => m[1]);
copre('giochi', 'ricette a punti', ricette);

// ---- OGNI SCHEDA HA IL SUO AIUTO ------------------------------------------
// Il difetto: la copertura era un elenco scritto a mano dentro ogni pagina
// (schede: [...]), quindi era quel che qualcuno si era ricordato di digitare.
// Su ventiquattro schede ne coprivano sei: nelle altre diciotto il «?» in barra
// non aveva niente da offrire, l'avviso non usciva, il popup nemmeno — e chi
// era in difficolta' li' restava.
//
// L'elenco vero delle schede non si scrive: sono i pannelli che app.js disegna.
// Se domani ne nasce uno, questo cancello diventa rosso finche' qualcuno non lo
// spiega da qualche parte.
// Due schede restano fuori DI PROPOSITO, ed e' scritto qui perche' un buco
// silenzioso e un'esclusione decisa si somigliano troppo:
//   · 'admin'  non e' del prodotto, e' nostra;
//   · 'studio' (andare in diretta dal browser) non si documenta per scelta del
//              direttore: finche' resta cosi', una pagina pubblica che la
//              spiega prometterebbe una cosa che non vogliamo promettere.
const FUORI = new Set(['admin', 'studio']);
const schede = [...new Set([...app.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]))]
  .filter((s) => !FUORI.has(s));
const aiuti = aiutiPerScheda();
const scoperte = schede.filter((s) => !aiuti[s]);
dice(scoperte.length === 0, `ogni scheda ha una guida o un manuale: ${schede.length - scoperte.length} su ${schede.length}`, scoperte.join(', '));

// E il contrario: una pagina non puo' dichiarare di servire una scheda che non
// esiste piu'. Se un pannello viene rinominato, l'aiuto resterebbe agganciato a
// un fantasma — presente nell'elenco, invisibile nel prodotto.
const fantasmi = Object.keys(aiuti).filter((s) => !schede.includes(s));
dice(fantasmi.length === 0, 'nessun aiuto e\' agganciato a una scheda che non esiste', fantasmi.join(', '));

// ---- i due manuali si citano a vicenda ------------------------------------
dice(cerca('giochi', '/manuale/moduli'), 'dal manuale dei giochi si arriva a quello dei moduli');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `\n      manca: ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nI manuali dicono tutto quello che il bot sa fare. ✓');
process.exit(rossi.length ? 1 : 0);
