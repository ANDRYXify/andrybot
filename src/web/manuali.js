// I manuali: cosa fa cosa, e come.
//
// Le guide servono a chi non ha ancora il bot; questi servono a chi ce l'ha e
// sta configurando. Sono materiale di consultazione: tabelle, numeri veri,
// nessuna presentazione. Vivono come contenuto pubblico — stessa forma delle
// guide, stesso guscio — perche' chi valuta il bot deve poter vedere PRIMA cosa
// sa fare davvero, e perche' una pagina che risponde a "come funziona !slot"
// vale piu' di dieci righe di vetrina.
//
// I numeri qui dentro non sono decorativi: sono quelli del motore. Se cambiano
// li', qui devono cambiare — e il cancello verifica-manuali.mjs controlla che
// non manchi niente di quello che il motore sa fare.
import { GUIDE, DENTRO, indirizzoDi, paginaDoc, paginaManuali, guideIn, VIE, LINGUE_DOC } from './guide.js';
import { DENTRO as DENTRI } from './guide/comune.js';
import MANUALI_EN from './manuali/en/index.js';
import MANUALI_ES from './manuali/es/index.js';

// Un manuale per file, in src/web/manuali/<lingua>/: si scrivono e si traducono
// uno per volta senza toccare gli altri.
import GIOCHI from './manuali/it/giochi.js';
import MODULI from './manuali/it/moduli.js';
import BOT from './manuali/it/bot.js';
import MODERAZIONE from './manuali/it/moderazione.js';
import INTERAZIONE from './manuali/it/interazione.js';
import CONSOLIFY from './manuali/it/consolify.js';
import DIRETTA from './manuali/it/diretta.js';
import VETRINA from './manuali/it/vetrina.js';
import ACCOUNT from './manuali/it/account.js';
import EMOTE from './manuali/it/emote.js';
import OVERLAY from './manuali/it/overlay.js';

export const MANUALI = [GIOCHI, MODULI, BOT, MODERAZIONE, INTERAZIONE, DIRETTA, CONSOLIFY, VETRINA, ACCOUNT, EMOTE, OVERLAY];

// A QUALE SCHEDA DEL PANNELLO SERVE OGNI PAGINA.
//
// Non e' un elenco a parte: ogni guida e ogni manuale dichiara le schede a cui
// serve, accanto al proprio contenuto. Chi scrive una pagina nuova sa a chi
// serve — meglio di chiunque la legga sei mesi dopo — e il pannello la trova da
// se'. Il manuale vince sulla guida: chi e' gia' dentro il prodotto vuole il
// riferimento, non l'introduzione.
const SITO = 'https://socialbot.live';
const TRADOTTI = { en: MANUALI_EN, es: MANUALI_ES };
const lin = (l) => (LINGUE_DOC.includes(l) ? l : 'it');

// I manuali in una lingua, nello stesso ordine e nella stessa forma di MANUALI.
export function manualiIn(l = 'it') {
  const x = lin(l);
  if (x === 'it') return MANUALI.map((m) => ({ id: m.slug, ...m }));
  return MANUALI.map((m) => {
    const t = TRADOTTI[x].find((v) => v.id === m.slug);
    return t ? { schede: m.schede, aggiornata: m.aggiornata, ...t, id: m.slug } : null;
  }).filter(Boolean);
}

export const urlManuale = (l, slug) => `${SITO}${VIE[lin(l)].manuali}/${slug}`;

export function alternativeManuale(id) {
  const alt = {};
  for (const l of LINGUE_DOC) {
    const m = manualiIn(l).find((x) => x.id === id);
    if (m) alt[l] = urlManuale(l, m.slug);
  }
  return alt;
}

// La sezione di un manuale che parla di una scheda: il blocco h2 che lo
// dichiara (`scheda: 'id'`). L'indirizzo e' quello che la pagina da' a quel
// titolo, quindi punta sempre a una sezione che c'e'.
const sezioneDi = (m, s) => indirizzoDi(m.corpo, (x) => x.h2 && x.scheda === s);
// La sezione di una guida che parla del pannello.
const dentroDi = (g, titolo) => indirizzoDi(g.corpo, (x) => x.h2 === titolo);

const altIndice = () => Object.fromEntries(LINGUE_DOC.filter((l) => manualiIn(l).length).map((l) => [l, `${SITO}${VIE[l].manuali}`]));

//
// Nella lingua chiesta: il «?» del pannello apre la pagina nella lingua del
// pannello. Dove una pagina non e' ancora tradotta resta quella italiana, che
// e' meglio di niente.
export function aiutiPerScheda(l = 'it') {
  const x = lin(l);
  if (x !== 'it') {
    const out = { ...aiutiPerScheda('it') };
    for (const g of guideIn(x)) {
      for (const s of g.schede || []) out[s] = { titolo: g.h1, via: `${VIE[x].guide}/${g.slug}${dentroDi(g, DENTRI[x])}`, tipo: 'guida' };
    }
    for (const m of manualiIn(x)) {
      for (const s of m.schede || []) out[s] = { titolo: m.h1, via: `${VIE[x].manuali}/${m.slug}${sezioneDi(m, s)}`, tipo: 'manuale' };
    }
    return out;
  }
  const out = {};
  // Una guida si apre sulla sezione che parla del pannello, non dall'inizio:
  // chi la chiede da dentro vuole sapere cosa si fa QUI. Il pezzo di indirizzo
  // e' quello che la pagina da' a quel titolo, quindi non puo' puntare al nulla.
  for (const g of GUIDE) {
    for (const s of g.schede || []) out[s] = { titolo: g.h1, via: `/guide/${g.slug}${dentroDi(g, DENTRO)}`, tipo: 'guida' };
  }
  for (const m of MANUALI) {
    for (const s of m.schede || []) out[s] = { titolo: m.h1, via: `/manuale/${m.slug}${sezioneDi(m, s)}`, tipo: 'manuale' };
  }
  return out;
}

export function paginaManuale(slug, l = 'it') {
  const x = lin(l);
  const m = manualiIn(x).find((y) => y.slug === slug);
  return m ? paginaDoc(m, x, alternativeManuale(m.id)) : null;
}

export function paginaIndiceManuali(l = 'it') {
  const x = lin(l);
  const lista = manualiIn(x);
  return lista.length ? paginaManuali(lista, x, altIndice()) : null;
}

// Le voci per la sitemap: ogni manuale in ogni lingua in cui esiste, con le
// sue alternative. Una fonte sola, come per le guide.
export function urlManuali() {
  const voci = [];
  const indici = altIndice();
  for (const l of Object.keys(indici)) {
    voci.push({ loc: indici[l], lastmod: manualiIn(l).map((m) => m.aggiornata).sort().pop(), freq: 'monthly', prio: '0.7', alt: indici });
  }
  for (const m of MANUALI) {
    const alt = alternativeManuale(m.slug);
    for (const [l, loc] of Object.entries(alt)) {
      voci.push({ loc, lastmod: manualiIn(l).find((x) => x.id === m.slug).aggiornata, freq: 'monthly', prio: '0.7', alt });
    }
  }
  return voci;
}
