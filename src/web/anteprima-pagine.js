// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'anteprima delle pagine dell'editor: link, donazioni, negozio, la porta del
// gruppo Telegram e quelle dietro i pannelli di Twitch (docs/DEMO.md,
// docs/STRUMENTI.md, docs/TELEGRAM.md).
//
// L'editor mostra la pagina vera, resa dal server da quello che c'e'
// nell'editor, senza salvarla. Qui sta come si compone, una volta sola:
// htmlAnteprima prende il testo dell'editor e il canale gia' letto, e da qui
// in giu' non si legge piu' niente. Le rotte del pannello leggono il canale dal
// database; la demo, che il canale ce l'ha nel browser, lo manda, e
// anteprimaDemo lo pulisce con le stesse funzioni del salvataggio. Il disegno
// e' uno: la demo non puo' mostrare una pagina diversa da quella vera.

import { linkPage, paginaDona, paginaNegozio, paginaPannello, paginaTelegram } from '../db.js';
import { renderLinkPage, aspettoDi } from '../features/linkpagina.js';
import { normDonazioni, cosaManca, datiSostieni, urlPaginaDona } from '../features/donazioni.js';
import { normArticolo, vetrinaDi, monetaPerLingua, urlPaginaNegozio } from '../features/negozio.js';
import { vetrinaDa, opzioniDaDati } from '../features/negozio-pagina.js';
import { opzioniDaDati as opzioniPortaDa } from '../features/tg-porta.js';
import { monetaDa } from '../features/moneta.js';
import { normalizzaSettimana, prossimaDiretta } from '../features/settimana.js';
import { F } from '../features/preferenze.js';
import { urlCanale, piattaformaDi } from '../identita.js';
import { viaLegale } from './legali.js';

export const QUALI = ['link', 'dona', 'negozio', 'pannello', 'telegram'];

// La pagina dell'anteprima. `editor` e' quello che l'editor manda, e passa
// dalla stessa pulizia del salvataggio. `c` e' il canale gia' letto: login,
// nome, foto, indirizzo del sito, l'aspetto scelto e la pagina link (per chi
// la segue), le impostazioni e i conti per il tasto delle donazioni, chi ha
// donato (una funzione dei pezzi, perche' si leggono solo se la pagina li
// mostra), i pezzi del negozio (opzioniDaDati), i pezzi vivi (`vivi`: anche
// questi una funzione dei pezzi) e l'indirizzo della pagina di un pannello.
export function htmlAnteprima(quale, editor, c) {
  const p = editor && typeof editor === 'object' ? editor : {};
  const testo = { headline: p.headline, tagline: p.tagline, template: p.template, avatar: p.avatar, tema: p.tema, blocchi: p.blocchi };
  const comune = { login: c.login, display: c.display, avatar: c.avatar, baseUrl: c.baseUrl, anteprima: true };
  if (quale === 'negozio') {
    const pagina = aspettoDi(paginaNegozio.pulisci({ ...testo, aspetto: c.aspetto }), c.link);
    return renderLinkPage(pagina, { ...comune, negozio: c.negozio });
  }
  if (quale === 'telegram') {
    const pagina = aspettoDi(paginaTelegram.pulisci({ ...testo, aspetto: c.aspetto }), c.link);
    return renderLinkPage(pagina, { ...comune, fuori: c.fuori });
  }
  const dona = quale === 'dona', dietro = quale === 'pannello';
  const archivio = dona ? paginaDona : dietro ? paginaPannello : null;
  const pagina = archivio ? aspettoDi(archivio.pulisci({ ...testo, aspetto: c.aspetto }), c.link) : linkPage.pulisci(testo);
  return renderLinkPage(pagina, {
    ...comune, dona,
    dietro: dietro ? { url: c.urlPannello || '' } : null,
    sostieni: datiSostieni(c.settings, c.conti), manca: cosaManca(c.settings, c.conti),
    urlDona: urlPaginaDona(c.login),
    donatori: c.donatori ? c.donatori(pagina.blocchi) : null,
    vivi: c.vivi ? c.vivi(pagina.blocchi) : null,
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
    // i pezzi vivi: la settimana con la stessa pulizia del salvataggio, e i
    // comandi pubblici nella forma di comandiPubblici (features/pannelli.js)
    settimana: c.settimana ? normalizzaSettimana(oggetto(c.settimana)) : null,
    comandi: (Array.isArray(c.comandi) ? c.comandi : []).slice(0, 40).map((x) => ({
      comando: riga(x?.comando, 30).toLowerCase().replace(/[^a-z0-9_]/g, ''),
      alias: (Array.isArray(x?.alias) ? x.alias : []).slice(0, 5).map((a) => riga(a, 30).toLowerCase().replace(/[^a-z0-9_]/g, '')).filter(Boolean),
      cosa: riga(x?.cosa, 200),
    })).filter((x) => x.comando),
    // la porta del gruppo Telegram: il nome del gruppo, se lo scudo e' acceso e
    // le sue regole, come le salverebbe il pannello
    telegram: {
      gruppo: riga(oggetto(c.telegram).gruppo, 128),
      scudo: oggetto(c.telegram).scudo === true,
      regole: String(oggetto(c.telegram).regole ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 1500),
    },
  };
}

// I dati della porta del canale finto: gli stessi che datiPorta (tg-porta.js)
// legge dal database per un canale vero. Il link d'invito e' un esempio: la
// demo non ha un bot che lo possa fare.
export function datiPortaDemo(ch, { baseUrl = '' } = {}) {
  return {
    lingua: ch.lingua,
    nome: ch.display,
    url: `${baseUrl}/telegram/${ch.login}`,
    privacy: `${baseUrl}${viaLegale('privacy', ch.lingua)}#telegram`,
    gruppo: ch.telegram.gruppo,
    invito: 'https://t.me/+esempio',
    scudo: ch.telegram.scudo,
    regole: ch.telegram.regole,
    urlLink: ch.link ? `${baseUrl}/u/${ch.login}` : '',
    urlTv: urlCanale(ch.login) || '',
    piattaforma: piattaformaDi(ch.login),
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
// delle pagine. Niente database e niente rete: i canali YouTube scritti come
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
      fuori: b.quale === 'telegram' ? opzioniPortaDa(datiPortaDemo(ch, { baseUrl })) : null,
      urlPannello: '',
      vivi: () => ({
        programma: ch.settimana ? { giorni: ch.settimana.giorni, fuso: ch.settimana.fuso, prossima: prossimaDiretta(ch.settimana, new Date(ora)) } : null,
        comandi: ch.comandi,
      }),
    }),
  };
}
