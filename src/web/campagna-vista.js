// LA PAGINA DEL QR: socialbot.live/<id>, dove si prende il regalo di una campagna.
//
// Chi arriva dal QR di una pubblicità legge cosa gli si regala, a che
// condizioni, e cosa gli succede adesso: un caso alla volta, con una frase
// sola che dice dove si trova (aperta, piena, chiusa, già sua...). Il tasto per
// prenderlo è un modulo POST: un link che si apre (un'anteprima, un
// controllo antivirus della posta) non regala niente a nessuno.
//
// Le parole nascono dalle regole della campagna (quanti giorni, quali
// pacchetti, quanti canali, fino a quando), nella sua lingua: cambiata una
// regola dall'admin, la pagina la dice giusta senza toccare un testo. Titolo e
// frase d'apertura l'admin li può riscrivere. Resta fuori dai motori di
// ricerca: è una pagina che scade.
import { paginaServizio } from './guide.js';
import { finestra, tuttiIPacchetti } from '../features/campagne.js';
import { ADDON } from '../features/abbonamenti.js';

const SITO = 'https://socialbot.live';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nomi = (c) => c.pacchetti.map((id) => ADDON.find((a) => a.id === id)?.nome || id);
const elenco = (v, e) => (v.length < 2 ? v.join('') : `${v.slice(0, -1).join(', ')} ${e} ${v[v.length - 1]}`);

// L'anteprima di chi non ne ha una sua: quella del sito, nella lingua giusta.
export const ANTEPRIMA_SITO = { it: '/icons/og.png?v=9', en: '/icons/og-en.png?v=9', es: '/icons/og-es.png?v=9' };

const T = {
  it: {
    locale: 'it-IT',
    durata: (g) => (g === 365 ? 'un anno' : g % 365 === 0 ? `${g / 365} anni` : `${g} giorni`),
    cosa: (c) => (tuttiIPacchetti(c) ? 'di tutto' : `di ${elenco(nomi(c), 'e')}`),
    h1: (c, T) => `${T.maiuscola(T.durata(c.giorni))} ${T.cosa(c)}, gratis`,
    desc: (c, h1) => `SocialBot è il bot per Twitch e Kick che in chat scrive con il tuo nome. ${h1}, per i primi ${c.tetto} canali.`,
    chi: (c) => `${c.luogo ? `L'hai visto per strada a ${c.luogo}.` : 'L\'hai visto in una pubblicità.'} SocialBot è il bot che in chat scrive con il tuo nome, con overlay, alert, pagina link e grafiche social nello stesso pannello.`,
    regole: (c, fino) => `${tuttiIPacchetti(c) ? 'Tutti i pacchetti sbloccati' : `${elenco(nomi(c), 'e')} sbloccati`} per ${c.giorni} giorni, per i primi ${c.tetto} canali che lo prendono${fino ? ` entro il ${fino}` : ` nei ${c.finestra} giorni dopo l'uscita della pubblicità`}. Alla fine il canale torna all'Essenziale, che resta gratis per sempre. Niente carta, niente da disdire.`,
    prima: 'Si apre il giorno in cui esce la pubblicità. Torna quel giorno: il QR resta questo.',
    aperta: (n, c) => `Ne restano ${n} su ${c.tetto}.`,
    piena: (c) => `Sono stati presi tutti e ${c.tetto}. L'Essenziale resta gratis per sempre: puoi cominciare lo stesso.`,
    chiusa: (fino) => `L'offerta si è chiusa${fino ? ` il ${fino}` : ''}. L'Essenziale resta gratis per sempre: puoi cominciare lo stesso.`,
    sbloccato: (c) => (tuttiIPacchetti(c) ? 'hai tutto sbloccato' : 'hai i pacchetti sbloccati'),
    gia: (s, fino) => `È tuo: ${s}${fino ? ` fino al ${fino}` : ''}.`,
    presa: (s, fino) => `Fatto: ${s}${fino ? ` fino al ${fino}` : ''}.`,
    abbonato: 'Il tuo canale ha già un piano a pagamento. Se preferisci il regalo, prima disdici il piano da Abbonamento nel pannello, poi torna qui.',
    tutto: 'Il tuo canale ha già tutto sbloccato.',
    moderatore: 'Lo può prendere solo il proprietario del canale: chiedigli di aprire questa pagina.',
    prendi: (c) => (c.giorni === 365 ? 'Prendo il mio anno' : `Prendo i miei ${c.giorni} giorni`),
    twitch: 'Prendilo con Twitch',
    kick: 'Prendilo con Kick',
    pannello: 'Apri il tuo pannello',
    inizia: 'Comincia con l\'Essenziale',
    home: '/',
  },
  en: {
    locale: 'en-US',
    durata: (g) => (g === 365 ? 'one year' : g % 365 === 0 ? `${g / 365} years` : `${g} days`),
    cosa: (c) => (tuttiIPacchetti(c) ? 'of everything' : `of ${elenco(nomi(c), 'and')}`),
    h1: (c, T) => `${T.maiuscola(T.durata(c.giorni))} ${T.cosa(c)}, free`,
    desc: (c, h1) => `SocialBot is the Twitch and Kick bot that writes in chat under your own name. ${h1}, for the first ${c.tetto} channels.`,
    chi: (c) => `${c.luogo ? `You saw it in ${c.luogo}.` : 'You saw it in an ad.'} SocialBot is the bot that writes in chat under your own name, with overlay, alerts, a link page and social graphics in the same panel.`,
    regole: (c, fino) => `${tuttiIPacchetti(c) ? 'Every package' : elenco(nomi(c), 'and')} unlocked for ${c.giorni} days, for the first ${c.tetto} channels that claim it${fino ? ` by ${fino}` : ` within ${c.finestra} days of the ad going live`}. When it ends your channel goes back to Essenziale, which stays free forever. No card, nothing to cancel.`,
    prima: 'It opens the day the ad goes live. Come back then, the QR will still be here.',
    aperta: (n, c) => `${n} of ${c.tetto} still free.`,
    piena: (c) => `All ${c.tetto} have been claimed. Essenziale stays free forever: you can still start today.`,
    chiusa: (fino) => `This offer closed${fino ? ` on ${fino}` : ''}. Essenziale stays free forever: you can still start today.`,
    sbloccato: (c) => (tuttiIPacchetti(c) ? 'everything is unlocked' : 'your packages are unlocked'),
    gia: (s, fino) => `It's yours: ${s}${fino ? ` until ${fino}` : ''}.`,
    presa: (s, fino) => `Done. ${s.charAt(0).toUpperCase() + s.slice(1)}${fino ? ` until ${fino}` : ''}.`,
    abbonato: 'Your channel already pays for a plan. If you want the gift instead, cancel the plan first from Subscription in your panel, then come back here.',
    tutto: 'Your channel already has everything unlocked.',
    moderatore: 'Only the owner of the channel can claim it: ask them to open this page.',
    prendi: (c) => (c.giorni === 365 ? 'Claim my year' : `Claim my ${c.giorni} days`),
    twitch: 'Claim it with Twitch',
    kick: 'Claim it with Kick',
    pannello: 'Open your panel',
    inizia: 'Start with Essenziale',
    home: '/en',
  },
  es: {
    locale: 'es-ES',
    durata: (g) => (g === 365 ? 'un año' : g % 365 === 0 ? `${g / 365} años` : `${g} días`),
    cosa: (c) => (tuttiIPacchetti(c) ? 'de todo' : `de ${elenco(nomi(c), 'y')}`),
    h1: (c, T) => `${T.maiuscola(T.durata(c.giorni))} ${T.cosa(c)}, gratis`,
    desc: (c, h1) => `SocialBot es el bot para Twitch y Kick que escribe en el chat con tu nombre. ${h1}, para los primeros ${c.tetto} canales.`,
    chi: (c) => `${c.luogo ? `Lo viste en ${c.luogo}.` : 'Lo viste en un anuncio.'} SocialBot es el bot que escribe en el chat con tu nombre, con overlay, alertas, página de enlaces y gráficas sociales en el mismo panel.`,
    regole: (c, fino) => `${tuttiIPacchetti(c) ? 'Todos los paquetes desbloqueados' : `${elenco(nomi(c), 'y')} desbloqueados`} durante ${c.giorni} días, para los primeros ${c.tetto} canales que lo pidan${fino ? ` antes del ${fino}` : ` en los ${c.finestra} días después de que salga el anuncio`}. Al terminar tu canal vuelve a Essenziale, que sigue gratis para siempre. Sin tarjeta, nada que cancelar.`,
    prima: 'Se abre el día en que sale el anuncio. Vuelve ese día: el QR seguirá aquí.',
    aperta: (n, c) => `Quedan ${n} de ${c.tetto}.`,
    piena: (c) => `Ya se han llevado los ${c.tetto}. Essenziale sigue gratis para siempre: puedes empezar igual.`,
    chiusa: (fino) => `La oferta se cerró${fino ? ` el ${fino}` : ''}. Essenziale sigue gratis para siempre: puedes empezar igual.`,
    sbloccato: (c) => (tuttiIPacchetti(c) ? 'tienes todo desbloqueado' : 'tienes los paquetes desbloqueados'),
    gia: (s, fino) => `Es tuyo: ${s}${fino ? ` hasta el ${fino}` : ''}.`,
    presa: (s, fino) => `Hecho: ${s}${fino ? ` hasta el ${fino}` : ''}.`,
    abbonato: 'Tu canal ya paga un plan. Si prefieres el regalo, primero cancela el plan desde Suscripción en tu panel y luego vuelve aquí.',
    tutto: 'Tu canal ya tiene todo desbloqueado.',
    moderatore: 'Solo el propietario del canal puede pedirlo: dile que abra esta página.',
    prendi: (c) => (c.giorni === 365 ? 'Quiero mi año' : `Quiero mis ${c.giorni} días`),
    twitch: 'Pídelo con Twitch',
    kick: 'Pídelo con Kick',
    pannello: 'Abre tu panel',
    inizia: 'Empieza con Essenziale',
    home: '/es',
  },
};
for (const t of Object.values(T)) t.maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const giorno = (ms, t, fuso) => (ms ? new Date(ms).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: fuso }) : '');

// Il titolo della campagna com'è scritto sulla pagina: serve anche all'admin.
export const titoloDi = (c) => { const t = T[c.lingua] || T.it; return c.testi?.titolo || t.h1(c, t); };

// c: la campagna (id + regole normalizzate); stato: spenta|prima|aperta|piena|chiusa;
// persona: { chi: fuori|moderatore|proprietario, no, fino }; esito: dal ritorno del POST.
export function paginaCampagna(c, { stato, presi = 0, persona = { chi: 'fuori' }, esito = '', kick = false }) {
  const t = T[c.lingua] || T.it;
  const id = c.id;
  const url = `${SITO}/${id}`;
  const w = finestra(c);
  const chiude = w ? giorno(w.chiude - 1, t, c.fuso) : '';
  const fino = persona.fino ? giorno(persona.fino, t, c.fuso) : '';
  const h1 = titoloDi(c);
  const chi = c.testi?.frase || t.chi(c);
  const immagine = c.anteprima || ANTEPRIMA_SITO[c.lingua] || ANTEPRIMA_SITO.it;
  const tasto = (href, testo) => `<p><a class="g-cta" href="${esc(href)}">${esc(testo)}</a></p>`;
  const inizia = tasto(t.home, t.inizia);

  let qui;
  if (esito === 'presa') qui = `<p><strong>${esc(t.presa(t.sbloccato(c), fino))}</strong></p>${tasto('/', t.pannello)}`;
  else if (persona.chi === 'proprietario' && persona.no === 'gia') qui = `<p><strong>${esc(t.gia(t.sbloccato(c), fino))}</strong></p>${tasto('/', t.pannello)}`;
  else if (persona.chi === 'proprietario' && persona.no === 'tutto') qui = `<p>${esc(t.tutto)}</p>${tasto('/', t.pannello)}`;
  else if (persona.chi === 'proprietario' && persona.no === 'abbonato') qui = `<p>${esc(t.abbonato)}</p>${tasto('/#sottoscrizione', t.pannello)}`;
  else if (stato === 'prima') qui = `<p>${esc(t.prima)}</p>`;
  else if (stato === 'piena') qui = `<p>${esc(t.piena(c))}</p>${inizia}`;
  else if (stato === 'chiusa' || stato === 'spenta') qui = `<p>${esc(t.chiusa(stato === 'chiusa' ? chiude : ''))}</p>${inizia}`;
  else if (persona.chi === 'moderatore') qui = `<p>${esc(t.aperta(c.tetto - presi, c))}</p><p>${esc(t.moderatore)}</p>`;
  else if (persona.chi === 'proprietario') {
    qui = `<p>${esc(t.aperta(c.tetto - presi, c))}</p><form method="post" action="/${esc(id)}/prendi"><button type="submit">${esc(t.prendi(c))}</button></form>`;
  } else {
    qui = `<p>${esc(t.aperta(c.tetto - presi, c))}</p>${tasto(`/entra?nuovo=1&campagna=${id}`, t.twitch)}${kick ? tasto(`/accedi/kick?campagna=${id}`, t.kick) : ''}`;
  }

  const corpo = `<h1>${esc(h1)}</h1>
<p><img src="${esc(immagine)}" alt="${esc('SocialBot: ' + h1)}" width="1200" height="630" class="g-copertina"></p>
<p>${esc(chi)}</p>
<p>${esc(t.regole(c, chiude))}</p>
${qui}`;
  return paginaServizio({ titolo: `${h1} | SocialBot`, url, corpo, l: c.lingua, desc: t.desc(c, h1), immagine: SITO + immagine, immagineAlt: 'SocialBot: ' + h1 });
}
