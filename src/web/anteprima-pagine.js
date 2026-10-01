// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'anteprima delle tre pagine dell'editor: link, donazioni, negozio
// (docs/DEMO.md).
//
// L'editor mostra la pagina vera, resa dal server da quello che c'e'
// nell'editor, senza salvarla. Qui sta come si compone, una volta sola:
// htmlAnteprima prende il testo dell'editor e il canale gia' letto, e da qui
// in giu' non si legge piu' niente. Le rotte del pannello leggono il canale dal
// database; la demo, che il canale ce l'ha nel browser, lo manda, e
// anteprimaDemo lo pulisce con le stesse funzioni del salvataggio. Il disegno
// e' uno: la demo non puo' mostrare una pagina diversa da quella vera.

import { linkPage, paginaDona, paginaNegozio } from '../db.js';
import { renderLinkPage, aspettoDi } from '../features/linkpagina.js';
import { normDonazioni, cosaManca, datiSostieni, urlPaginaDona } from '../features/donazioni.js';
import { normArticolo, vetrinaDi, monetaPerLingua, urlPaginaNegozio } from '../features/negozio.js';
import { vetrinaDa, opzioniDaDati } from '../features/negozio-pagina.js';
import { monetaDa } from '../features/moneta.js';
import { F } from '../features/preferenze.js';
import { urlCanale, piattaformaDi } from '../identita.js';
import { viaLegale } from './legali.js';

export const QUALI = ['link', 'dona', 'negozio'];

// La pagina dell'anteprima. `editor` e' quello che l'editor manda, e passa
// dalla stessa pulizia del salvataggio. `c` e' il canale gia' letto: login,
// nome, foto, indirizzo del sito, l'aspetto scelto e la pagina link (per chi
// la segue), le impostazioni e i conti per il tasto delle donazioni, chi ha
// donato (una funzione dei pezzi, perche' si leggono solo se la pagina li
// mostra), e i pezzi del negozio (opzioniDaDati).
export function htmlAnteprima(quale, editor, c) {
  const p = editor && typeof editor === 'object' ? editor : {};
  const testo = { headline: p.headline, tagline: p.tagline, template: p.template, avatar: p.avatar, tema: p.tema, blocchi: p.blocchi };
  const comune = { login: c.login, display: c.display, avatar: c.avatar, baseUrl: c.baseUrl, anteprima: true };
  if (quale === 'negozio') {
    const pagina = aspettoDi(paginaNegozio.pulisci({ ...testo, aspetto: c.aspetto }), c.link);
    return renderLinkPage(pagina, { ...comune, negozio: c.negozio });
  }
  const dona = quale === 'dona';
  const pagina = dona ? aspettoDi(paginaDona.pulisci({ ...testo, aspetto: c.aspetto }), c.link) : linkPage.pulisci(testo);
  return renderLinkPage(pagina, {
    ...comune, dona,
    sostieni: datiSostieni(c.settings, c.conti), manca: cosaManca(c.settings, c.conti),
    urlDona: urlPaginaDona(c.login),
    donatori: c.donatori ? c.donatori(pagina.blocchi) : null,
  });
}

// ---------------------------------------------------------------- la demo

const LINGUE = ['it', 'en', 'es'];
// quanti articoli al massimo: quelli che un negozio vero puo' avere
const MAX_ARTICOLI = 60;
const oggetto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const riga = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Il canale finto come lo manda la demo, pulito: un nome da canale, la lingua
// della chat fra le tre, l'aspetto della pagina link, le donazioni come le
// salverebbe il pannello (senza la chiave di Ko-fi, che la demo non ha), la
// moneta, la parola del comando per comprare e gli articoli che si potrebbero
// salvare.
export function canaleDemo(grezzo) {
  const c = oggetto(grezzo);
  const login = /^[a-z0-9_]{2,25}$/.test(String(c.login || '')) ? String(c.login) : 'demo';
  const a = oggetto(c.aspettoLink);
  const articoli = [];
  const venduti = new Map();
  for (const x of (Array.isArray(c.articoli) ? c.articoli : []).slice(0, MAX_ARTICOLI)) {
    const r = normArticolo(x);
    if (!r.ok || !r.articolo.id) continue;
    articoli.push(r.articolo);
    venduti.set(r.articolo.id, Math.max(0, Math.trunc(Number(x.venduti) || 0)));
  }
  return {
    login,
    display: riga(c.display, 40) || login,
    lingua: LINGUE.includes(c.lingua) ? c.lingua : 'it',
    link: c.aspettoLink ? linkPage.pulisci({ template: a.template, tema: a.tema }) : null,
    donazioni: normDonazioni({ ...oggetto(c.donazioni), kofiToken: '' }, {}, login),
    moneta: monetaDa(oggetto(c.moneta)),
    compra: /^[a-z0-9]{1,20}$/.test(String(c.compra || '')) ? String(c.compra) : 'compra',
    articoli, venduti,
  };
}

// I dati della pagina del negozio del canale finto: gli stessi che
// datiPagina (negozio-pagina.js) legge dal database per un canale vero.
export function datiNegozioDemo(ch, { baseUrl = '', ora = Date.now() } = {}) {
  const pf = F.valori({ lingua: ch.lingua });
  const v = vetrinaDa(vetrinaDi(ch.articoli, ch.venduti, ora), { pf, moneta: monetaPerLingua(ch.moneta, ch.lingua), cmd: '!' + ch.compra });
  return {
    ...v,
    nome: ch.display,
    url: urlPaginaNegozio(ch.login),
    privacy: `${baseUrl}${viaLegale('privacy', v.lingua)}#negozio`,
    urlLink: ch.link ? `${baseUrl}/u/${ch.login}` : '',
    urlTv: urlCanale(ch.login) || '',
    piattaforma: piattaformaDi(ch.login),
  };
}

// L'anteprima della demo: { html }, oppure { errore } se `quale` non e' una
// delle tre. Niente database e niente rete: i canali YouTube scritti come
// @nome restano come sono, invece di chiederli a YouTube.
export function anteprimaDemo(corpo, { baseUrl = '', ora = Date.now() } = {}) {
  const b = oggetto(corpo);
  if (!QUALI.includes(b.quale)) return { errore: 'quale' };
  const ch = canaleDemo(b.canale);
  const p = oggetto(b.pagina);
  return {
    html: htmlAnteprima(b.quale, p, {
      login: ch.login, display: ch.display, avatar: '', baseUrl,
      aspetto: p.aspetto, link: ch.link,
      settings: { donazioni: ch.donazioni, overlayGoals: [] }, conti: {},
      negozio: b.quale === 'negozio' ? opzioniDaDati(datiNegozioDemo(ch, { baseUrl, ora })) : null,
    }),
  };
}
