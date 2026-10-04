// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PORTA DEL GRUPPO TELEGRAM (docs/TELEGRAM.md, «La porta»):
// telegram.<dominio>/<canale>, e sempre anche /telegram/<canale>.
//
// E' una pagina pubblica come quella dei link, delle donazioni e del negozio, e
// ne prende tutto: lo store (paginaTelegram in db.js), il disegno
// (renderLinkPage, con `fuori`), i temi, lo sfondo, i caratteri, l'editor del
// pannello. Qui sta solo quello che e' suo: i pezzi della porta, le parole nelle
// tre lingue della chat, e la prova dello scudo, che e' un suo pezzo.
//
// UNA PORTA E' DI UN CANALE SOLO, e c'e' solo se lo streamer l'ha pubblicata e
// il bot ha un link per far entrare. Un canale che non c'e', una porta non
// pubblicata e un gruppo senza link hanno la stessa pagina «qui non c'e' un
// gruppo», nella lingua del browser: da fuori non si distingue quale dei tre.
//
// UNA PORTA SOLA (docs/TELEGRAM.md, «Una porta sola»). La porta e' l'unica
// pagina del gruppo, e dove porta «Entra nel gruppo» lo decide lo scudo, non
// un'impostazione:
//  · scudo spento (niente, o solo il cancello): il tasto e' il link d'invito
//    del BOT (tg-scudo-gesti.js, `invito`), e si entra subito;
//  · scudo acceso: il tasto apre la prova QUI, nella carta del gruppo, col
//    vestito della pagina (telegram-porta.js). Chi la supera riceve un link
//    personale ed entra senza chiedere. Senza JavaScript il tasto resta il link
//    del bot, che con lo scudo acceso chiede l'approvazione: si passa dalla
//    prova dentro Telegram. Nessuna strada entra senza prova.
// Chi chiede di entrare da un altro link vede, dentro Telegram, questa stessa
// pagina con la prova gia' aperta (modo 'telegram'): una pagina, due strade.
import { linkPage, paginaTelegram, tgConf } from '../db.js';
import { renderLinkPage, aspettoDi, iconaMarchio, coloriDi } from './linkpagina.js';
import { preferenzeDi } from './preferenze.js';
import { urlCanale, piattaformaDi } from '../identita.js';
import { viaLegale } from '../web/legali.js';
import { paginaMancante } from '../web/pagine-servizio.js';
import { VIA_LINGUA } from '../web/vetrina-vista.js';
import { scudoDi, invitoDi, urlPorta, acceso } from './tg-scudo-gesti.js';
import { coloriProva } from './tg-scudo.js';
import { testiPorta } from './tg-scudo-testi.js';

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
    scudoTesto: 'Premi «Entra nel gruppo» e fai una prova veloce, qui sulla pagina: niente da installare, niente dati in più. Superata, Telegram ti fa entrare con un link tutto tuo.',
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
    scudoTesto: 'Tap «Join the group» and take a quick check, right on this page: nothing to install, no extra data. Pass it and Telegram lets you in with a link of your own.',
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
    scudoTesto: 'Pulsa «Entrar en el grupo» y haz una prueba rápida, aquí en la página: nada que instalar, ningún dato de más. Superada, Telegram te deja entrar con un enlace propio.',
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
// (opzioniDaDati) non si legge piu' niente. `modo`: 'web' (la porta), o
// 'telegram' (la stessa pagina aperta da una richiesta, con la prova gia'
// aperta). `prova` dice se «Entra» apre la prova: lo scudo acceso e in grado
// di lavorare (acceso: bot, gruppo interattivo, interruttore).
export function datiPorta(canale, { baseUrl = '', display = '', invito = '', modo = 'web' } = {}) {
  const ch = String(canale || '').toLowerCase();
  const l = lin(preferenzeDi(ch).lingua);
  const conf = tgConf.get(ch);
  const s = scudoDi(conf);
  const link = linkPage.get(ch);
  return {
    canale: ch,
    modo: modo === 'telegram' ? 'telegram' : 'web',
    lingua: l,
    nome: display || ch,
    url: urlPorta(ch),
    privacy: `${baseUrl}${viaLegale('privacy', l)}#telegram`,
    gruppo: conf?.chat_titolo || '',
    invito: invito || invitoDi(conf)?.url || '',
    scudo: s.attivo,
    prova: acceso(conf),
    coloriScudo: s.colori,
    regole: s.regole.testo,
    urlLink: link?.attiva ? `${baseUrl}/u/${ch}` : '',
    urlTv: urlCanale(ch) || '',
    piattaforma: piattaformaDi(ch),
  };
}

// Le parole della prova vanno alla pagina come dati (JSON in un <script> che non
// si esegue): `<` scritto come \u003c, cosi' nessuna parola chiude il blocco.
const jsonNellaPagina = (x) => JSON.stringify(x).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

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
      const modo = anteprima ? 'anteprima' : v.modo;
      // la prova c'e' se «Entra» la apre (scudo acceso), dentro Telegram, e
      // nell'anteprima (che la mostra anche a scudo spento, a richiesta)
      const conProva = modo !== 'web' || v.prova;
      const pr = b.prova && typeof b.prova === 'object' ? b.prova : {};
      // in Telegram non c'e' un tasto da premere: la prova e' gia' aperta
      const tasto = modo === 'telegram' ? ''
        : v.invito || anteprima
          ? `<a class="tg-entra" href="${esc(v.invito || '#')}" target="_blank" rel="noopener"${conProva ? ' data-apre-prova' : ''}>${esc(b.tasto || t.entra)}</a>`
          : '';
      const prova = conProva ? `
        <div class="tg-prova" data-prova="${modo}" data-canale="${esc(v.canale)}" data-lingua="${lin(v.lingua)}" data-scudo="${v.prova ? '1' : '0'}"${v.demo ? ' data-demo="1"' : ''}${pr.grandezza ? ` data-grandezza="${esc(pr.grandezza)}"` : ''}${modo === 'telegram' ? '' : ' hidden'}></div>
        <script type="application/json" class="tg-prova-testi">${jsonNellaPagina(testiPorta(lin(v.lingua), { gruppo: v.gruppo, su: pr }))}</script>` : '';
      return `<section class="tg-gruppo" ${ritardo}>
        <h2 class="tg-sez-t">${esc(titolo)}</h2>
        <p>${esc(b.testo || t.gruppoTesto)}</p>
        ${tasto || (anteprima ? segna(t.segnaInvito, '') : '')}${prova}
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
      return `<section class="tg-regole" id="tg-regole" ${ritardo}>
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

  // I colori dei puntini: quelli scelti nel pezzo del gruppo, se ci sono, se no
  // quelli dello scudo (dove si sceglievano prima); poi quelli della pagina, se
  // si leggono, e se no inchiostro su carta (coloriProva, tg-scudo.js).
  const coloriDellaProva = (blocchi, c) => {
    const g = (blocchi || []).find((x) => x?.tipo === 'gruppo');
    const scelti = g?.prova?.colori || v.coloriScudo;
    return coloriProva({ colori: scelti }, { testo: c.testo, bg: c.bg });
  };
  const css = ({ c, stileBtn, ombra, aSinistra, blocchi }) => {
    const cp = coloriDellaProva(blocchi, c);
    return `
  .solo-lettori{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .testa-b{display:flex;flex-direction:column;align-items:${aSinistra ? 'flex-start' : 'center'};text-align:${aSinistra ? 'left' : 'center'};gap:.3rem;width:100%;margin-bottom:.4rem}
  .tg-sez-t{font-family:var(--fd);font-weight:var(--pm);font-size:1.15rem;letter-spacing:-.01em;margin:0 0 .45rem}
  .tg-gruppo,.tg-scudo,.tg-regole{width:100%;padding:1rem 1.1rem;border-radius:var(--r);${stileBtn};${ombra};color:var(--btxt);text-align:left}
  .tg-gruppo p,.tg-scudo p,.tg-regole p{font-size:.95rem;margin-bottom:.45rem;overflow-wrap:anywhere}
  .tg-gruppo .tg-sez-t{font-size:1.35rem;font-weight:var(--pf)}
  .tg-entra{display:inline-flex;align-items:center;justify-content:center;min-height:3rem;padding:.7rem 1.4rem;margin-top:.35rem;border-radius:calc(var(--r) * .8);background:var(--acc);color:var(--suacc);font-weight:var(--pf);text-decoration:none}
  .tg-entra:hover,.tg-entra:focus-visible{filter:brightness(1.08)}
  .tg-entra:focus-visible{outline:3px solid var(--testo);outline-offset:3px}
  .tg-entra[hidden]{display:none}
  .tg-regole p{color:var(--btxt)}
  .tg-piede{display:flex;flex-direction:column;gap:var(--aria);width:100%}
  .tg-prova{--punti:${cp.punti};--fondo:${cp.fondo};--tela-w:22rem;--linea:currentColor;margin-top:.9rem;display:flex;flex-direction:column;gap:1rem}
  @supports (color:color-mix(in srgb,red 50%,blue)){.tg-prova{--linea:color-mix(in srgb,currentColor 35%,transparent)}}
  .tg-prova[hidden]{display:none}
  .tg-prova[data-grandezza=grande]{--tela-w:32rem}
  .tg-prova[data-grandezza=piena]{--tela-w:100%}
  .tg-prova form,.tg-prova .tgp-passo{display:flex;flex-direction:column;gap:.6rem}
  .tg-prova form{gap:1.1rem}
  .tg-prova h3{font-family:var(--fd);font-weight:var(--pm);font-size:1.05rem;letter-spacing:-.01em}
  .tg-prova p{margin:0}
  .tg-prova a:not(.tg-entra){color:inherit;text-decoration:underline;text-underline-offset:2px}
  .tgp-aiuto{font-size:.92rem;opacity:.85}
  .tgp-tela{display:block;width:100%;max-width:var(--tela-w);height:auto;aspect-ratio:160/56;image-rendering:pixelated;image-rendering:crisp-edges;border-radius:calc(var(--r) * .6);background:var(--fondo);border:1px solid var(--linea)}
  .tg-prova label{font-weight:700}
  .tg-prova input[type=text]{font:inherit;font-size:1.25rem;letter-spacing:.18em;text-transform:uppercase;color:inherit;background:transparent;border:1px solid var(--linea);border-radius:calc(var(--r) * .6);padding:.55rem .75rem;min-height:3rem;width:100%;max-width:var(--tela-w)}
  .tgp-regole{max-height:12rem;overflow:auto;padding:.6rem .75rem;border:1px solid var(--linea);border-radius:calc(var(--r) * .6);white-space:pre-wrap;font-size:.93rem}
  .tgp-spunta{display:flex;gap:.6rem;align-items:flex-start;font-weight:600}
  .tgp-spunta input,.tgp-voce input{width:1.25rem;height:1.25rem;margin-top:.2rem;accent-color:var(--acc);flex:0 0 auto}
  .tg-prova fieldset{border:0;display:flex;flex-direction:column;gap:.35rem;min-width:0}
  .tg-prova legend{font-weight:700;margin-bottom:.3rem}
  .tg-prova .tgp-voce{display:flex;gap:.6rem;align-items:flex-start;font-weight:400;min-height:2.75rem;padding:.35rem .1rem}
  .tgp-riga{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}
  .tg-prova .tg-entra{margin-top:0;border:0;font:inherit;font-weight:var(--pf);cursor:pointer;align-self:flex-start}
  .tg-sec{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:.55rem 1.1rem;border-radius:calc(var(--r) * .8);background:transparent;color:inherit;border:1px solid var(--linea);font:inherit;font-weight:600;cursor:pointer;text-decoration:none;align-self:flex-start}
  .tg-sec:focus-visible,.tg-prova input:focus-visible,.tgp-regole:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
  .tg-prova [disabled]{opacity:.55;cursor:default}
  .tgp-errore{font-weight:700;font-size:.92rem;padding-left:.6rem;border-left:3px solid var(--acc)}
  .tgp-errore:empty{display:none}
  .tgp-nota{font-size:.88rem;opacity:.85}
  .tgp-nascosto{display:none}
  .tg-prova [tabindex="-1"]:focus{outline:none}
  @media (prefers-reduced-motion:no-preference){
    .tg-prova.tgp-apre{animation:tgApre .32s cubic-bezier(.2,.8,.2,1) both}
    @keyframes tgApre{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  }`;
  };

  // Lo script della prova: solo se c'e' una prova da aprire. Dentro Telegram
  // prima lo script di Telegram, che porta la firma di chi chiede.
  const script = (anteprima) => {
    if (v.modo !== 'telegram' && !v.prova && !anteprima) return '';
    return `${v.modo === 'telegram' ? '<script src="https://telegram.org/js/telegram-web-app.js"></script>\n' : ''}<script src="/telegram-porta.js?v=1" defer></script>`;
  };

  return {
    lingua: lin(v.lingua),
    url: v.url,
    privacy: v.privacy,
    testi: { titolo: t.titolo, descrizione: t.descrizione(nome), vuota: t.vuota, creata: t.creata, privacy: t.privacy },
    blocco,
    css,
    script,
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

// Le righe della carta dell'anteprima del link (carta-disegno.js, TEMI_PAGINA.telegram),
// come quelle del negozio: il nome e' chi fa la diretta, sotto il sottotitolo
// della porta, o il titolo se e' suo (non quello di partenza), o la riga di
// partenza.
export function righeCarta(canale, display) {
  const ch = String(canale || '').toLowerCase();
  const p = paginaDi(ch, display);
  const t = T[lin(preferenzeDi(ch).lingua)];
  const nome = display || ch;
  const suo = p.headline && p.headline !== t.partenza(nome) ? p.headline : '';
  return { nome, titolo: p.tagline || suo || t.riga };
}

// I colori della porta, per chi la descrive da fuori (il pannello dice come
// esce la prova «coi colori della pagina»).
export const coloriPorta = (canale, display) => coloriDi(paginaDi(canale, display));

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
// Dentro Telegram (`modo: 'telegram'`) la pagina c'e' anche se la porta non e'
// pubblicata: lo scudo lavora su ogni richiesta, non solo su chi passa dalla
// porta, e chi chiede deve vedere la pagina del gruppo com'e'.
export function htmlPorta(canale, { pagina = null, anteprima = false, display = '', avatar = '', baseUrl = '', invito = '', immagineAnteprima = '', modo = 'web' } = {}) {
  const ch = String(canale || '').toLowerCase();
  const dentro = modo === 'telegram';
  if (!anteprima && !dentro && !aperta(ch)) return null;
  const fuori = opzioniPorta(ch, { baseUrl, display, invito, modo });
  const dati = datiPorta(ch, { baseUrl, display, invito, modo });
  if (!anteprima && !dentro && !dati.invito) return null;
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
