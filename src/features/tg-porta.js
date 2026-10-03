// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PORTA DEL GRUPPO TELEGRAM (docs/TELEGRAM.md, «La porta»):
// telegram.<dominio>/<canale>, e sempre anche /telegram/<canale>.
//
// E' una pagina pubblica come quella dei link, delle donazioni e del negozio, e
// ne prende tutto: lo store (paginaTelegram in db.js), il disegno
// (renderLinkPage, con `fuori`), i temi, lo sfondo, i caratteri, l'editor del
// pannello. Qui sta solo quello che e' suo: i pezzi della porta, le parole nelle
// tre lingue della chat, e la pagina della prova (la verifica dello scudo), che
// si veste come la porta.
//
// UNA PORTA E' DI UN CANALE SOLO, e c'e' solo se lo streamer l'ha pubblicata e
// il bot ha un link per far entrare. Un canale che non c'e', una porta non
// pubblicata e un gruppo senza link hanno la stessa pagina «qui non c'e' un
// gruppo», nella lingua del browser: da fuori non si distingue quale dei tre.
//
// Il tasto «Entra nel gruppo» porta al link d'invito del BOT (tg-scudo-gesti.js,
// `invito`): con lo scudo acceso quel link chiede l'approvazione, quindi chi
// entra dalla porta passa per forza dalla prova.
import { linkPage, paginaTelegram, tgConf } from '../db.js';
import { renderLinkPage, aspettoDi, iconaMarchio, vesteDi, coloriDi } from './linkpagina.js';
import { preferenzeDi } from './preferenze.js';
import { urlCanale, piattaformaDi } from '../identita.js';
import { viaLegale } from '../web/legali.js';
import { paginaMancante } from '../web/pagine-servizio.js';
import { VIA_LINGUA } from '../web/vetrina-vista.js';
import { scudoDi, invitoDi, urlPorta } from './tg-scudo-gesti.js';
import { coloriProva } from './tg-scudo.js';

const LINGUE = ['it', 'en', 'es'];
const lin = (l) => (LINGUE.includes(l) ? l : 'it');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// I pezzi di una porta appena nata, nell'ordine in cui si legge: chi e' il
// gruppo e il tasto, come si entra, le regole, il piede. Lo streamer li toglie,
// li sposta e li veste dall'editor.
export const PEZZI_DI_SERIE = [
  { tipo: 'intestazione' },
  { tipo: 'gruppo', titolo: '', testo: '', tasto: '' },
  { tipo: 'scudo', titolo: '', testo: '' },
  { tipo: 'regole', titolo: '' },
  { tipo: 'piede', link: true, canale: true },
];

const T = {
  it: {
    titolo: 'il gruppo Telegram',
    partenza: (nome) => `Il gruppo Telegram di ${nome}`,
    riga: 'Si chiacchiera anche quando la diretta è spenta',
    descrizione: (nome) => `Il gruppo Telegram di ${nome}: come si entra, e le regole.`,
    vuota: 'Questa pagina non ha ancora contenuti.',
    creata: 'Pagina creata con',
    privacy: 'Privacy',
    gruppo: 'Il gruppo',
    gruppoTesto: 'Avvisi delle dirette, chiacchiere e novità, anche quando la diretta è spenta.',
    entra: 'Entra nel gruppo',
    scudo: 'Come si entra',
    scudoTesto: 'Premi «Entra nel gruppo» e chiedi di entrare. Telegram apre una prova veloce, lì dentro: niente da installare, niente dati in più. Superata la prova, sei nel gruppo.',
    regole: 'Le regole del gruppo',
    link: (nome) => `I link di ${nome}`,
    canale: (nome, dove) => `${nome} su ${dove}`,
    segnaInvito: 'Qui va il tasto per entrare: compare quando il bot può fare il link del gruppo.',
    segnaScudo: 'Lo scudo è spento: questo pezzo compare quando lo accendi.',
    segnaRegole: 'Qui vanno le regole: le scrivi nello scudo, nella scheda Telegram.',
    nonCe: 'Qui non c’è un gruppo',
    nonCeTesto: 'Questa porta è chiusa, oppure l’indirizzo è sbagliato. Se il link ti è arrivato da una diretta, chiedi in chat.',
    nonCeVai: 'Cos’è SocialBot',
    nonCeTuo: 'È il tuo gruppo?',
    nonCeNota: 'La porta si apre dal pannello: Telegram, poi La porta del gruppo.',
    nonCePannello: 'Apri il pannello',
  },
  en: {
    titolo: 'the Telegram group',
    partenza: (nome) => `${nome}’s Telegram group`,
    riga: 'The chat goes on when the stream is off',
    descrizione: (nome) => `${nome}’s Telegram group: how to join, and the rules.`,
    vuota: 'This page has no content yet.',
    creata: 'Page made with',
    privacy: 'Privacy',
    gruppo: 'The group',
    gruppoTesto: 'Stream alerts, chat and news, even when the stream is off.',
    entra: 'Join the group',
    scudo: 'How to join',
    scudoTesto: 'Tap «Join the group» and ask to join. Telegram opens a quick check right there: nothing to install, no extra data. Pass the check and you are in.',
    regole: 'The group rules',
    link: (nome) => `${nome}’s links`,
    canale: (nome, dove) => `${nome} on ${dove}`,
    segnaInvito: 'The join button goes here: it shows up when the bot can make the group link.',
    segnaScudo: 'The shield is off: this piece shows up when you turn it on.',
    segnaRegole: 'The rules go here: you write them in the shield, in the Telegram tab.',
    nonCe: 'There’s no group here',
    nonCeTesto: 'This door is closed, or the address is wrong. If the link came from a stream, ask in chat.',
    nonCeVai: 'What SocialBot is',
    nonCeTuo: 'Is this your group?',
    nonCeNota: 'You open the door from the dashboard: Telegram, then The group door.',
    nonCePannello: 'Open the dashboard',
  },
  es: {
    titolo: 'el grupo de Telegram',
    partenza: (nome) => `El grupo de Telegram de ${nome}`,
    riga: 'Se charla también cuando el directo está apagado',
    descrizione: (nome) => `El grupo de Telegram de ${nome}: cómo se entra, y las normas.`,
    vuota: 'Esta página todavía no tiene contenido.',
    creata: 'Página creada con',
    privacy: 'Privacidad',
    gruppo: 'El grupo',
    gruppoTesto: 'Avisos de los directos, charla y novedades, también cuando el directo está apagado.',
    entra: 'Entrar en el grupo',
    scudo: 'Cómo se entra',
    scudoTesto: 'Pulsa «Entrar en el grupo» y pide entrar. Telegram abre una prueba rápida, ahí mismo: nada que instalar, ningún dato de más. Superada la prueba, estás en el grupo.',
    regole: 'Las normas del grupo',
    link: (nome) => `Los enlaces de ${nome}`,
    canale: (nome, dove) => `${nome} en ${dove}`,
    segnaInvito: 'Aquí va el botón para entrar: aparece cuando el bot puede crear el enlace del grupo.',
    segnaScudo: 'El escudo está apagado: esta pieza aparece cuando lo enciendes.',
    segnaRegole: 'Aquí van las normas: las escribes en el escudo, en la pestaña Telegram.',
    nonCe: 'Aquí no hay ningún grupo',
    nonCeTesto: 'Esta puerta está cerrada, o la dirección está mal. Si el enlace te llegó desde un directo, pregunta en el chat.',
    nonCeVai: 'Qué es SocialBot',
    nonCeTuo: '¿Es tu grupo?',
    nonCeNota: 'La puerta se abre desde el panel: Telegram, luego La puerta del grupo.',
    nonCePannello: 'Abrir el panel',
  },
};

// Tutto quello che la porta di un canale legge, in un posto. Da qui in giu'
// (opzioniDaDati) non si legge piu' niente.
export function datiPorta(canale, { baseUrl = '', display = '', invito = '' } = {}) {
  const ch = String(canale || '').toLowerCase();
  const l = lin(preferenzeDi(ch).lingua);
  const conf = tgConf.get(ch);
  const s = scudoDi(conf);
  const link = linkPage.get(ch);
  return {
    lingua: l,
    nome: display || ch,
    url: urlPorta(ch),
    privacy: `${baseUrl}${viaLegale('privacy', l)}#telegram`,
    gruppo: conf?.chat_titolo || '',
    invito: invito || invitoDi(conf)?.url || '',
    scudo: s.attivo,
    regole: s.regole.testo,
    urlLink: link?.attiva ? `${baseUrl}/u/${ch}` : '',
    urlTv: urlCanale(ch) || '',
    piattaforma: piattaformaDi(ch),
  };
}

// I pezzi della porta e il loro foglio di stile, da dei dati gia' letti: e'
// una funzione pura (la usano la pagina vera, l'anteprima e i collaudi).
export function opzioniDaDati(v) {
  const t = T[lin(v.lingua)];
  const nome = v.nome;
  const dove = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube' }[v.piattaforma] || '';
  const segna = (testo, ritardo) => `<div class="segna" ${ritardo}>${esc(testo)}</div>`;
  const righe = (s) => esc(s).replace(/\n/g, '<br>');

  const blocco = (b, { anteprima, ritardo }) => {
    if (b.tipo === 'gruppo') {
      const titolo = b.titolo || v.gruppo || t.gruppo;
      const tasto = v.invito
        ? `<a class="tg-entra" href="${esc(v.invito)}" target="_blank" rel="noopener">${esc(b.tasto || t.entra)}</a>`
        : (anteprima ? segna(t.segnaInvito, '') : '');
      return `<section class="tg-gruppo" ${ritardo}>
        <h2 class="tg-sez-t">${esc(titolo)}</h2>
        <p>${esc(b.testo || t.gruppoTesto)}</p>
        ${tasto}
      </section>`;
    }
    if (b.tipo === 'scudo') {
      if (!v.scudo) return anteprima ? segna(t.segnaScudo, ritardo) : '';
      return `<section class="tg-scudo" ${ritardo}>
        <h2 class="tg-sez-t">${esc(b.titolo || t.scudo)}</h2>
        <p>${esc(b.testo || t.scudoTesto)}</p>
      </section>`;
    }
    if (b.tipo === 'regole') {
      if (!v.regole) return anteprima ? segna(t.segnaRegole, ritardo) : '';
      return `<section class="tg-regole" ${ritardo}>
        <h2 class="tg-sez-t">${esc(b.titolo || t.regole)}</h2>
        <p>${righe(v.regole)}</p>
      </section>`;
    }
    if (b.tipo === 'piede') {
      const voce = (href, ico, testo) => `<a class="voce" href="${esc(href)}" target="_blank" rel="noopener"><span class="ico">${iconaMarchio(ico)}</span><span class="tx"><span class="et">${esc(testo)}</span></span><span class="fre" aria-hidden="true">›</span></a>`;
      const voci = [
        b.link && v.urlLink ? voce(v.urlLink, 'link', t.link(nome)) : '',
        b.canale && v.urlTv && dove ? voce(v.urlTv, v.piattaforma, t.canale(nome, dove)) : '',
      ].filter(Boolean).join('');
      return voci ? `<nav class="tg-piede" ${ritardo}>${voci}</nav>` : '';
    }
    return null;
  };

  const css = ({ stileBtn, ombra, aSinistra }) => `
  .solo-lettori{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .testa-b{display:flex;flex-direction:column;align-items:${aSinistra ? 'flex-start' : 'center'};text-align:${aSinistra ? 'left' : 'center'};gap:.3rem;width:100%;margin-bottom:.4rem}
  .tg-sez-t{font-family:var(--fd);font-weight:var(--pm);font-size:1.15rem;letter-spacing:-.01em;margin:0 0 .45rem}
  .tg-gruppo,.tg-scudo,.tg-regole{width:100%;padding:1rem 1.1rem;border-radius:var(--r);${stileBtn};${ombra};color:var(--btxt);text-align:left}
  .tg-gruppo p,.tg-scudo p,.tg-regole p{font-size:.95rem;margin-bottom:.45rem;overflow-wrap:anywhere}
  .tg-gruppo .tg-sez-t{font-size:1.35rem;font-weight:var(--pf)}
  .tg-entra{display:inline-flex;align-items:center;justify-content:center;min-height:3rem;padding:.7rem 1.4rem;margin-top:.35rem;border-radius:calc(var(--r) * .8);background:var(--acc);color:var(--suacc);font-weight:var(--pf);text-decoration:none}
  .tg-entra:hover,.tg-entra:focus-visible{filter:brightness(1.08)}
  .tg-entra:focus-visible{outline:3px solid var(--testo);outline-offset:3px}
  .tg-regole p{color:var(--btxt)}
  .tg-piede{display:flex;flex-direction:column;gap:var(--aria);width:100%}`;

  return {
    lingua: lin(v.lingua),
    url: v.url,
    privacy: v.privacy,
    testi: { titolo: t.titolo, descrizione: t.descrizione(nome), vuota: t.vuota, creata: t.creata, privacy: t.privacy },
    blocco,
    css,
  };
}

export const opzioniPorta = (canale, opz = {}) => opzioniDaDati(datiPorta(canale, opz));

// L'aspetto e i pezzi della porta come li vede chi la apre: quelli salvati, o
// quelli di partenza per chi non l'ha mai toccata. Con `aspetto: 'link'` lo
// stile e il tema vengono dalla pagina link.
export function paginaDi(canale, display) {
  const ch = String(canale || '').toLowerCase();
  const p = paginaTelegram.get(ch);
  if (p) return aspettoDi(p, linkPage.get(ch));
  return paginaDiPartenza(ch, display);
}
export function paginaDiPartenza(canale, display) {
  const ch = String(canale || '').toLowerCase();
  const base = paginaTelegram.conDefault(ch, display);
  const t = T[lin(preferenzeDi(ch).lingua)];
  return { ...base, headline: t.partenza(display || ch), tagline: t.riga, aspetto: 'suo', attiva: false,
    blocchi: PEZZI_DI_SERIE.map((b) => ({ ...b })) };
}

// La porta c'e' se lo streamer l'ha pubblicata e il bot e' collegato a un
// gruppo. Il link d'invito lo porta chi chiama (lo fa il bot, con la rete).
export function aperta(canale) {
  const ch = String(canale || '').toLowerCase();
  const c = tgConf.get(ch);
  return !!(c?.token && c.chat_id && paginaTelegram.get(ch)?.attiva);
}

// La pagina intera. `pagina` serve all'anteprima del pannello; senza, quella
// del canale. Torna null se la porta e' chiusa o il gruppo non ha un link: chi
// chiama mostra «qui non c'e' un gruppo».
export function htmlPorta(canale, { pagina = null, anteprima = false, display = '', avatar = '', baseUrl = '', invito = '', immagineAnteprima = '' } = {}) {
  const ch = String(canale || '').toLowerCase();
  if (!anteprima && !aperta(ch)) return null;
  const fuori = opzioniPorta(ch, { baseUrl, display, invito });
  const dati = datiPorta(ch, { baseUrl, display, invito });
  if (!anteprima && !dati.invito) return null;
  const p = pagina || paginaDi(ch, display);
  return renderLinkPage(p, { login: ch, display: display || ch, avatar, baseUrl, anteprima, immagineAnteprima, fuori });
}

// La lingua di chi apre una pagina che non c'e': quella del suo browser.
export function linguaDiChiApre(acceptLanguage) {
  const voci = String(acceptLanguage || '').toLowerCase().split(',').map((x) => x.trim().slice(0, 2));
  return voci.find((x) => LINGUE.includes(x)) || 'it';
}

// «Qui non c'e' un gruppo»: la stessa per tutti i casi, col vestito del 404 del
// sito. Non nomina nessun canale.
export function paginaNonCe(lingua, baseUrl = '') {
  const l = lin(lingua);
  const t = T[l];
  return paginaMancante(l, { titolo: `${t.nonCe} · SocialBot`, dida: t.nonCeTesto, h1: t.nonCe,
    tuo: { titolo: t.nonCeTuo, testo: t.nonCeNota, via: { href: `${baseUrl}/#telegram`, testo: t.nonCePannello } },
    vie: [{ href: baseUrl + VIA_LINGUA[l], testo: t.nonCeVai, spento: true }] });
}

// ── la pagina della prova ───────────────────────────────────────────────────
//
// La verifica dello scudo si veste come la porta: stessi colori, stessi
// caratteri. I colori della prova sono quelli della pagina, o quelli scelti
// nello scudo se si leggono (coloriProva, tg-scudo.js). Questo e' solo il
// guscio: le parole nella lingua di chi chiede, le domande e la prova le porta
// lo script, dopo aver mostrato la firma di Telegram al server.
export function vestePorta(canale, display) {
  const p = paginaDi(canale, display);
  return { veste: vesteDi(p), colori: coloriDi(p) };
}

// `scudo` sono le impostazioni da mostrare (l'anteprima del pannello manda
// quelle non ancora salvate); senza, quelle salvate.
export function htmlVerifica(canale, { display = '', anteprima = false, telegram = true, scudo = null } = {}) {
  const ch = String(canale || '').toLowerCase();
  const l = lin(preferenzeDi(ch).lingua);
  const { veste: v, colori: c } = vestePorta(ch, display);
  const prova = coloriProva(scudo || scudoDi(tgConf.get(ch)), c);
  const attendi = { it: 'Un momento…', en: 'One moment…', es: 'Un momento…' }[l];
  const senza = { it: 'Questa pagina ha bisogno di JavaScript: si apre dentro Telegram, quando chiedi di entrare nel gruppo.', en: 'This page needs JavaScript: it opens inside Telegram when you ask to join the group.', es: 'Esta página necesita JavaScript: se abre dentro de Telegram cuando pides entrar en el grupo.' }[l];
  const fd = v.font?.d || 'system-ui, sans-serif';
  const ft = v.font?.t || 'system-ui, sans-serif';
  const errCol = v.scuro === false ? '#a3231a' : '#ff9d94';
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${esc(attendi)}</title>
${telegram ? '<script src="https://telegram.org/js/telegram-web-app.js"></script>' : ''}
<style>${v.faccia || ''}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--acc:${c.acc};--suacc:${v.suAcc};--testo:${c.testo};--tenue:${c.tenue};--bordo:${c.bordo};--card:${c.card};--bg:${c.bg};--err:${errCol};--punti:${prova.punti};--fondo:${prova.fondo}}
html{background:${c.bg}}
body{min-height:100dvh;background:linear-gradient(180deg,${c.bg},${c.bg2});color:var(--testo);font-family:${ft};line-height:1.55;overflow-x:clip;overflow-wrap:anywhere;padding:clamp(1rem,4vw,2.5rem) 1rem 3rem;-webkit-font-smoothing:antialiased}
main{max-width:32rem;margin:0 auto;display:flex;flex-direction:column;gap:1.1rem}
header{display:flex;flex-direction:column;gap:.35rem}
#sv-corpo,#sv-corpo form{display:flex;flex-direction:column;gap:1rem}
h1{font-family:${fd};font-size:clamp(1.45rem,5.5vw,2rem);line-height:1.1;letter-spacing:-.02em;text-wrap:balance}
h2{font-family:${fd};font-size:1.1rem;letter-spacing:-.01em}
.sotto,.tenue,.aiuto{color:var(--tenue);font-size:.93rem}
.passo{display:flex;flex-direction:column;gap:.7rem;padding:1rem;border:1px solid var(--bordo);border-radius:16px;background:var(--card)}
.tela{display:block;width:100%;max-width:30rem;height:auto;aspect-ratio:160 / 56;image-rendering:pixelated;image-rendering:crisp-edges;border-radius:10px;background:var(--fondo);border:1px solid var(--bordo)}
label{font-weight:700}
input[type=text]{font:inherit;font-size:1.3rem;letter-spacing:.18em;text-transform:uppercase;color:var(--testo);background:var(--bg);border:1px solid var(--bordo);border-radius:10px;padding:.6rem .8rem;min-height:3rem;width:100%}
.regole{max-height:14rem;overflow:auto;padding:.7rem .8rem;border:1px solid var(--bordo);border-radius:10px;white-space:pre-wrap;font-size:.95rem}
.spunta{display:flex;gap:.6rem;align-items:flex-start;font-weight:600}
.spunta input,.voce input{width:1.25rem;height:1.25rem;margin-top:.2rem;accent-color:var(--acc);flex:0 0 auto}
fieldset{border:0;display:flex;flex-direction:column;gap:.45rem}
legend{font-weight:700;margin-bottom:.35rem}
.voce{display:flex;gap:.6rem;align-items:flex-start;font-weight:400;min-height:2.75rem;padding:.4rem .2rem}
.riga{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}
.btn{font:inherit;font-weight:700;border:0;border-radius:12px;background:var(--acc);color:var(--suacc);min-height:3rem;padding:.7rem 1.4rem;cursor:pointer}
.btn.secondario{background:transparent;color:var(--testo);border:1px solid var(--bordo);font-weight:600;min-height:2.75rem}
.btn[disabled]{opacity:.55;cursor:default}
input:focus-visible,button:focus-visible,.regole:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
[tabindex="-1"]:focus{outline:none}

.errore{color:var(--err);font-size:.92rem;font-weight:600}
.errore:empty{display:none}
.fine{display:flex;flex-direction:column;gap:.7rem;padding:1.2rem;border:1px solid var(--bordo);border-radius:16px;background:var(--card)}
.nascosto{display:none}
@media (prefers-reduced-motion:no-preference){.btn{transition:filter .15s}.btn:hover{filter:brightness(1.08)}}
</style>
</head>
<body>
<main id="sv" data-canale="${esc(ch)}" data-anteprima="${anteprima ? '1' : ''}">
  <header><h1 id="sv-titolo">${esc(attendi)}</h1><p class="sotto" id="sv-sotto"></p></header>
  <div id="sv-corpo"></div>
  <noscript><p class="passo">${esc(senza)}</p></noscript>
</main>
<script src="/telegram-verifica.js?v=1" defer></script>
</body>
</html>`;
}
