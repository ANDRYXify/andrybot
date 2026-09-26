// LA PAGINA DEL QR: socialbot.live/<città>, dove si prende l'anno di tutto.
//
// Chi arriva dal QR di una pubblicità legge cosa gli si regala, a che
// condizioni, e cosa gli succede adesso: un caso alla volta, con una frase
// sola che dice dove si trova (aperta, piena, chiusa, già sua...). Il tasto per
// prenderla è un modulo POST: un link che si apre (un'anteprima, un
// controllo antivirus della posta) non regala niente a nessuno.
//
// È in inglese per Times Square e in italiano per Milano e Napoli, come la
// pubblicità da cui si arriva. Resta fuori dai motori di ricerca: è una pagina
// che scade.
import { paginaServizio } from './guide.js';
import { TETTO, GIORNI } from '../features/campagne.js';

const SITO = 'https://socialbot.live';
// L'anteprima di ogni città, scritta per intero: il cancello delle risorse
// controlla che il file esista e che il timbro sia quello di tutte le icone.
export const COPERTINA = {
  nyc: '/icons/campagna-nyc.png?v=8',
  milano: '/icons/campagna-milano.png?v=8',
  napoli: '/icons/campagna-napoli.png?v=8',
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const T = {
  en: {
    locale: 'en-US',
    titolo: 'One year of everything, free | SocialBot',
    desc: 'SocialBot is the Twitch and Kick bot that writes in chat under your own name. From the Times Square ad: one year with every package, for the first 500 channels.',
    h1: 'One year of everything, free',
    alt: 'SocialBot: one year of everything, free',
    chi: 'You saw it in Times Square. SocialBot is the bot that writes in chat under your own name, with overlay, alerts, a link page and social graphics in the same panel.',
    regole: (fino) => `Every package unlocked for ${GIORNI} days, for the first ${TETTO} channels that claim it${fino ? ` by ${fino}` : ' within 30 days of the ad going live'}. When the year ends your channel goes back to Essenziale, which stays free forever. No card, nothing to cancel.`,
    prima: 'It opens the day the ad goes live. Come back then, the QR will still be here.',
    aperta: (n) => `${n} of ${TETTO} still free.`,
    piena: `All ${TETTO} have been claimed. Essenziale stays free forever: you can still start today.`,
    chiusa: (fino) => `This offer closed${fino ? ` on ${fino}` : ''}. Essenziale stays free forever: you can still start today.`,
    gia: (fino) => `It's yours: everything is unlocked${fino ? ` until ${fino}` : ''}.`,
    presa: (fino) => `Done. Everything is unlocked${fino ? ` until ${fino}` : ''}.`,
    abbonato: 'Your channel already pays for a plan. If you want the free year instead, cancel the plan first from Subscription in your panel, then come back here.',
    tutto: 'Your channel already has everything unlocked.',
    moderatore: 'Only the owner of the channel can claim it: ask them to open this page.',
    prendi: 'Claim my year',
    twitch: 'Claim it with Twitch',
    kick: 'Claim it with Kick',
    pannello: 'Open your panel',
    inizia: 'Start with Essenziale',
    home: '/en',
  },
  it: {
    locale: 'it-IT',
    titolo: 'Un anno di tutto, gratis | SocialBot',
    desc: 'SocialBot è il bot per Twitch e Kick che in chat scrive con il tuo nome. Dalla pubblicità in città: un anno con tutti i pacchetti, per i primi 500 canali.',
    h1: 'Un anno di tutto, gratis',
    alt: 'SocialBot: un anno di tutto, gratis',
    chi: (luogo) => `L'hai visto per strada a ${luogo}. SocialBot è il bot che in chat scrive con il tuo nome, con overlay, alert, pagina link e grafiche social nello stesso pannello.`,
    regole: (fino) => `Tutti i pacchetti sbloccati per ${GIORNI} giorni, per i primi ${TETTO} canali che lo prendono${fino ? ` entro il ${fino}` : ' nei 30 giorni dopo l\'uscita della pubblicità'}. Finito l'anno il canale torna all'Essenziale, che resta gratis per sempre. Niente carta, niente da disdire.`,
    prima: 'Si apre il giorno in cui esce la pubblicità. Torna quel giorno: il QR resta questo.',
    aperta: (n) => `Ne restano ${n} su ${TETTO}.`,
    piena: `Sono stati presi tutti e ${TETTO}. L'Essenziale resta gratis per sempre: puoi cominciare lo stesso.`,
    chiusa: (fino) => `L'offerta si è chiusa${fino ? ` il ${fino}` : ''}. L'Essenziale resta gratis per sempre: puoi cominciare lo stesso.`,
    gia: (fino) => `È tuo: hai tutto sbloccato${fino ? ` fino al ${fino}` : ''}.`,
    presa: (fino) => `Fatto: hai tutto sbloccato${fino ? ` fino al ${fino}` : ''}.`,
    abbonato: 'Il tuo canale ha già un piano a pagamento. Se preferisci l\'anno gratis, prima disdici il piano da Abbonamento nel pannello, poi torna qui.',
    tutto: 'Il tuo canale ha già tutto sbloccato.',
    moderatore: 'Lo può prendere solo il proprietario del canale: chiedigli di aprire questa pagina.',
    prendi: 'Prendo il mio anno',
    twitch: 'Prendilo con Twitch',
    kick: 'Prendilo con Kick',
    pannello: 'Apri il tuo pannello',
    inizia: 'Comincia con l\'Essenziale',
    home: '/',
  },
};

const giorno = (ms, t, fuso) => (ms ? new Date(ms).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: fuso }) : '');

// id: la città; campagna: { lingua, luogo, fuso }; stato: prima|aperta|piena|chiusa;
// persona: { chi: fuori|moderatore|proprietario, no, fino }; esito: dal ritorno del POST.
export function paginaCampagna(id, { campagna, stato, finestra, presi = 0, persona = { chi: 'fuori' }, esito = '', kick = false }) {
  const t = T[campagna.lingua];
  const url = `${SITO}/${id}`;
  const chiude = finestra ? giorno(finestra.chiude - 1, t, campagna.fuso) : '';
  const fino = persona.fino ? giorno(persona.fino, t, campagna.fuso) : '';
  const chi = typeof t.chi === 'function' ? t.chi(campagna.luogo) : t.chi;
  const tasto = (href, testo) => `<p><a class="g-cta" href="${esc(href)}">${esc(testo)}</a></p>`;
  const inizia = tasto(t.home, t.inizia);

  let qui;
  if (esito === 'presa') qui = `<p><strong>${esc(t.presa(fino))}</strong></p>${tasto('/', t.pannello)}`;
  else if (persona.chi === 'proprietario' && persona.no === 'gia') qui = `<p><strong>${esc(t.gia(fino))}</strong></p>${tasto('/', t.pannello)}`;
  else if (persona.chi === 'proprietario' && persona.no === 'tutto') qui = `<p>${esc(t.tutto)}</p>${tasto('/', t.pannello)}`;
  else if (persona.chi === 'proprietario' && persona.no === 'abbonato') qui = `<p>${esc(t.abbonato)}</p>${tasto('/#sottoscrizione', t.pannello)}`;
  else if (stato === 'prima') qui = `<p>${esc(t.prima)}</p>`;
  else if (stato === 'piena') qui = `<p>${esc(t.piena)}</p>${inizia}`;
  else if (stato === 'chiusa') qui = `<p>${esc(t.chiusa(chiude))}</p>${inizia}`;
  else if (persona.chi === 'moderatore') qui = `<p>${esc(t.aperta(TETTO - presi))}</p><p>${esc(t.moderatore)}</p>`;
  else if (persona.chi === 'proprietario') {
    qui = `<p>${esc(t.aperta(TETTO - presi))}</p><form method="post" action="/${id}/prendi"><button type="submit">${esc(t.prendi)}</button></form>`;
  } else {
    qui = `<p>${esc(t.aperta(TETTO - presi))}</p>${tasto(`/entra?nuovo=1&campagna=${id}`, t.twitch)}${kick ? tasto(`/accedi/kick?campagna=${id}`, t.kick) : ''}`;
  }

  const corpo = `<h1>${esc(t.h1)}</h1>
<p><img src="${COPERTINA[id]}" alt="${esc(t.alt)}" width="1200" height="630" class="g-copertina"></p>
<p>${esc(chi)}</p>
<p>${esc(t.regole(chiude))}</p>
${qui}`;
  return paginaServizio({ titolo: t.titolo, url, corpo, l: campagna.lingua, desc: t.desc, immagine: SITO + COPERTINA[id], immagineAlt: t.alt });
}
