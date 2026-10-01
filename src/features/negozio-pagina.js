// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEL NEGOZIO (docs/NEGOZIO.md, «La pagina»): negozio.<dominio>/<canale>,
// e sempre anche /u/<canale>/negozio.
//
// E' la terza pagina pubblica dopo quella dei link e quella delle donazioni, e
// ne prende tutto: lo store (paginaNegozio in db.js), il disegno
// (renderLinkPage), i temi, lo sfondo, i caratteri, l'editor del pannello e la
// carta dell'anteprima del link. Qui sta solo quello che e' suo: i pezzi da
// negozio, le parole nelle tre lingue della chat, e la porta pubblica delle
// immagini degli articoli.
//
// UNA PAGINA E' DI UN CANALE SOLO. Tutto quello che si legge qui parte dal
// canale dell'indirizzo: gli articoli sono quelli di inVetrina(canale), la
// moneta e il nome del comando sono i suoi, l'aspetto e' il suo. Nessuna
// funzione di questo file prende un articolo, un'immagine o un'impostazione
// senza il canale accanto. Un canale che non c'e', o col negozio chiuso, ha la
// stessa pagina «qui non c'e' un negozio», nella lingua di chi la apre: cosi'
// da fuori non si distingue nemmeno quale dei due casi sia.
import { effects as effectsDb, linkPage, paginaNegozio } from '../db.js';
import { renderLinkPage, aspettoDi, iconaMarchio } from './linkpagina.js';
import { inVetrina, aperto, frase, cifra, monetaIn, scorteDi, urlPaginaNegozio } from './negozio.js';
import { accordaMoneta } from './moneta.js';
import { preferenzeDi, data } from './preferenze.js';
import { nomeIn } from './comandi-registro.js';
import { urlCanale, piattaformaDi } from '../identita.js';
import { viaLegale } from '../web/legali.js';

const LINGUE = ['it', 'en', 'es'];
const lin = (l) => (LINGUE.includes(l) ? l : 'it');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const maiuscola = (s) => { const t = String(s || ''); return t.charAt(0).toUpperCase() + t.slice(1); };

// I pezzi di una pagina appena nata: tutti e cinque, nell'ordine in cui si
// legge un negozio. Lo streamer li toglie, li sposta e li veste dall'editor.
export const PEZZI_DI_SERIE = [
  { tipo: 'intestazione' },
  { tipo: 'vetrina', titolo: '', articolo: 0 },
  { tipo: 'articoli', titolo: '', colonne: 2, formato: 'quadrato', prezzo: true, scorte: true, requisiti: true },
  { tipo: 'comecompra', titolo: '', testo: '' },
  { tipo: 'piede', link: true, canale: true },
];
// Una griglia di articoli vuole spazio: la colonna di partenza e' piu' larga
// di quella della pagina link (30rem), che e' fatta per una fila di bottoni.
export const LARGHEZZA_DI_SERIE = 44;

// Le parole della pagina. Le scrive il negozio, non lo streamer: per questo
// stanno qui nelle tre lingue della chat, e la pagina usa quella del canale.
const T = {
  it: {
    titolo: 'il negozio',
    partenza: (nome) => `Il negozio di ${nome}`,
    descrizione: (nome) => `Il negozio di ${nome}: cosa si compra in chat, e quanto costa.`,
    vuota: 'Il negozio per ora è vuoto: torna a trovarlo presto.',
    creata: 'Pagina creata con',
    privacy: 'Privacy',
    vetrina: 'In vetrina',
    come: 'Come si compra',
    comeTesto: (d, a) => a`Scrivi in chat ${d.cmd} e la parola dell'articolo. Si paga con %[le tue|i tuoi|la tua|il tuo]% ${d.moneta}, %[quelle|quelli|quella|quello]% che guadagni stando in chat.`,
    esempio: 'Per esempio',
    copia: 'Copia',
    copiato: 'Copiato',
    copiaCome: (cmd) => `Copia il comando ${cmd}`,
    soloDiretta: 'Solo in diretta',
    fino: (d) => `Fino al ${d}`,
    link: (nome) => `I link di ${nome}`,
    canale: (nome, dove) => `${nome} su ${dove}`,
    segnaVuota: 'Qui compaiono gli articoli in vendita: il negozio adesso non ne ha.',
    nonCe: 'Qui non c\'è un negozio',
    nonCeTesto: 'L\'indirizzo è sbagliato, oppure questo negozio è chiuso.',
    nonCeVai: 'Vai a SocialBot',
    tipi: { oggetto: 'Da collezione', effetto: 'Effetto in diretta', modulo: 'Azione in diretta', mano: 'Consegnato in diretta',
      vip: 'VIP su Twitch', discord: 'Ruolo su Discord', musica: 'Canzone in coda', evidenza: 'Messaggio in evidenza' },
  },
  en: {
    titolo: 'shop',
    partenza: (nome) => `${nome}'s shop`,
    descrizione: (nome) => `${nome}'s shop: what you can buy in chat, and what it costs.`,
    vuota: 'The shop is empty for now: come back soon.',
    creata: 'Page made with',
    privacy: 'Privacy',
    vetrina: 'Featured',
    come: 'How to buy',
    comeTesto: (d, a) => a`Type ${d.cmd} and the item's word in chat. You pay with your ${d.moneta}, which you earn by hanging out in chat.`,
    esempio: 'For example',
    copia: 'Copy',
    copiato: 'Copied',
    copiaCome: (cmd) => `Copy the command ${cmd}`,
    soloDiretta: 'Live only',
    fino: (d) => `Until ${d}`,
    link: (nome) => `${nome}'s links`,
    canale: (nome, dove) => `${nome} on ${dove}`,
    segnaVuota: 'The items on sale show up here: the shop has none right now.',
    nonCe: 'There\'s no shop here',
    nonCeTesto: 'The address is wrong, or this shop is closed.',
    nonCeVai: 'Go to SocialBot',
    tipi: { oggetto: 'Collectible', effetto: 'On-stream effect', modulo: 'On-stream action', mano: 'Delivered on stream',
      vip: 'VIP on Twitch', discord: 'Discord role', musica: 'Song in the queue', evidenza: 'Highlighted message' },
  },
  es: {
    titolo: 'la tienda',
    partenza: (nome) => `La tienda de ${nome}`,
    descrizione: (nome) => `La tienda de ${nome}: qué se compra en el chat, y cuánto cuesta.`,
    vuota: 'La tienda por ahora está vacía: vuelve pronto.',
    creata: 'Página creada con',
    privacy: 'Privacidad',
    vetrina: 'Destacado',
    come: 'Cómo se compra',
    comeTesto: (d, a) => a`Escribe en el chat ${d.cmd} y la palabra del artículo. Se paga con %[tus|tus|tu|tu]% ${d.moneta}, %[las|los|la|el]% que ganas estando en el chat.`,
    esempio: 'Por ejemplo',
    copia: 'Copiar',
    copiato: 'Copiado',
    copiaCome: (cmd) => `Copiar el comando ${cmd}`,
    soloDiretta: 'Solo en directo',
    fino: (d) => `Hasta el ${d}`,
    link: (nome) => `Los enlaces de ${nome}`,
    canale: (nome, dove) => `${nome} en ${dove}`,
    segnaVuota: 'Aquí salen los artículos a la venta: ahora la tienda no tiene ninguno.',
    nonCe: 'Aquí no hay ninguna tienda',
    nonCeTesto: 'La dirección está mal, o esta tienda está cerrada.',
    nonCeVai: 'Ir a SocialBot',
    tipi: { oggetto: 'De colección', effetto: 'Efecto en directo', modulo: 'Acción en directo', mano: 'Entregado en directo',
      vip: 'VIP en Twitch', discord: 'Rol en Discord', musica: 'Canción en la cola', evidenza: 'Mensaje destacado' },
  },
};
export const testiPagina = (l) => T[lin(l)];

// Un requisito come si scrive su un cartellino: corto, senza verbo. In chat lo
// stesso requisito finisce una frase («è per chi è abbonato da almeno tre
// mesi», requisitoAParole); qui sta da solo accanto al prezzo.
export function requisitoBreve(r, pf) {
  const l = lin(pf?.lingua);
  const n = Number(r?.soglia) || 0;
  const c = cifra(n, pf);
  const R = {
    it: {
      mesi: n === 1 ? 'Abbonati da almeno un mese' : `Abbonati da almeno ${c} mesi`,
      tier: n <= 1 ? 'Solo abbonati' : `Abbonati di tier ${n} o più`,
      bit: `Almeno ${c} Bit nel canale`,
      ore: n === 1 ? 'Almeno un\'ora guardata' : `Almeno ${c} ore guardate`,
      serie: `Almeno ${c} dirette di fila`,
      follower: n <= 0 ? 'Solo follower' : n === 1 ? 'Follower da almeno un giorno' : `Follower da almeno ${c} giorni`,
      ruolo: n >= 2 ? 'Solo moderatori' : 'Solo VIP e moderatori',
    },
    en: {
      mesi: n === 1 ? 'Subscribed for at least a month' : `Subscribed for at least ${c} months`,
      tier: n <= 1 ? 'Subscribers only' : `Tier ${n} subscribers or higher`,
      bit: `At least ${c} Bits in the channel`,
      ore: n === 1 ? 'At least an hour watched' : `At least ${c} hours watched`,
      serie: `At least ${c} streams in a row`,
      follower: n <= 0 ? 'Followers only' : n === 1 ? 'Following for at least a day' : `Following for at least ${c} days`,
      ruolo: n >= 2 ? 'Moderators only' : 'VIPs and moderators only',
    },
    es: {
      mesi: n === 1 ? 'Suscritos desde hace al menos un mes' : `Suscritos desde hace al menos ${c} meses`,
      tier: n <= 1 ? 'Solo suscriptores' : `Suscriptores de tier ${n} o superior`,
      bit: `Al menos ${c} Bits en el canal`,
      ore: n === 1 ? 'Al menos una hora vista' : `Al menos ${c} horas vistas`,
      serie: `Al menos ${c} directos seguidos`,
      follower: n <= 0 ? 'Solo seguidores' : n === 1 ? 'Seguidores desde hace al menos un día' : `Seguidores desde hace al menos ${c} días`,
      ruolo: n >= 2 ? 'Solo moderadores' : 'Solo VIP y moderadores',
    },
  }[l];
  return R[r?.tipo] || '';
}

// L'immagine di un articolo, dalla porta pubblica di QUEL canale. L'articolo
// tiene «effetto:<comando>» della libreria del canale; l'indirizzo porta il
// numero del media e la sua data, cosi' un'immagine cambiata si rivede subito.
// Nell'anteprima del pannello la pagina la prende dalla libreria, dietro la
// sessione: il negozio puo' essere ancora chiuso, e la porta pubblica no.
function immagineDi(ch, ref, anteprima) {
  const m = /^effetto:(.+)$/.exec(ref || '');
  const e = m ? effectsDb.get(ch, m[1]) : null;
  if (!e || e.channel !== ch || e.tipo !== 'immagine') return '';
  return anteprima ? `/api/streamer/libreria/media/${e.id}` : `/u/${ch}/negozio/media/${e.id}?v=${e.ts || 0}`;
}

// La porta pubblica delle immagini: un media esce solo se e' di questo canale,
// e' un'immagine, e la usa un articolo che la pagina mostra adesso (aperto, in
// vendita, visibile a tutti, nelle sue date). Tutto il resto e' «non c'e'»:
// anche un media vero, di questo canale, che nessun articolo in vetrina usa.
export function mediaPubblico(canale, id, ora = Date.now()) {
  const ch = String(canale || '').toLowerCase();
  const n = Number.parseInt(String(id), 10);
  if (!ch || !Number.isFinite(n) || n <= 0 || !aperto(ch)) return null;
  const e = effectsDb.anyById(n);
  if (!e || e.channel !== ch || e.tipo !== 'immagine' || !/^[A-Za-z0-9._-]+$/.test(String(e.file || ''))) return null;
  if (!inVetrina(ch, ora).some((a) => a.immagine === `effetto:${e.comando}`)) return null;
  return { channel: ch, file: e.file };
}

// Gli articoli come li mostra la pagina, gia' scritti nella lingua del canale.
export function vetrinaPagina(canale, { ora = Date.now(), anteprima = false } = {}) {
  const ch = String(canale || '').toLowerCase();
  const pf = preferenzeDi(ch);
  const l = lin(pf.lingua);
  const t = T[l];
  const scorte = (a) => {
    const s = scorteDi(a);
    if (s.modo === 'tutto') return frase(ch, 'restano', { n: s.n, cifra: cifra(s.n, pf) });
    if (s.modo === 'persona') return frase(ch, 'aTesta', { n: s.n, cifra: cifra(s.n, pf) });
    return '';
  };
  const articoli = inVetrina(ch, ora).map((a) => ({
    id: a.id, nome: a.nome, descrizione: a.descrizione, parola: a.parola, tipo: a.tipo,
    tipoNome: t.tipi[a.tipo] || '',
    prezzo: cifra(a.prezzo, pf),
    immagine: immagineDi(ch, a.immagine, anteprima),
    scorte: scorte(a),
    requisiti: (a.requisiti || []).map((r) => requisitoBreve(r, pf)).filter(Boolean),
    quando: a.quando === 'diretta' ? t.soloDiretta : a.quando === 'date' && a.al ? t.fino(data(a.al, pf)) : '',
  }));
  return { lingua: l, articoli, cmd: '!' + nomeIn(ch, 'compra'), moneta: monetaIn(ch, l) };
}

const SEGNAPOSTO = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
const FORME = { quadrato: '1 / 1', largo: '16 / 9', alto: '3 / 4', libero: 'auto' };

// I pezzi del negozio e il loro foglio di stile, da dare a renderLinkPage. Il
// foglio usa le variabili del tema (--acc, --r, --testo, --tenue) e i colori
// che il tema decide per i bottoni: una scheda articolo e' vestita come un
// bottone della pagina link, con lo stesso bordo e la stessa ombra.
export function opzioniNegozio(canale, { baseUrl = '', display = '', ora = Date.now(), anteprima = false } = {}) {
  return opzioniDaDati(datiPagina(canale, { baseUrl, display, ora, anteprima }));
}

// Tutto quello che la pagina di un canale legge, in un posto: la vetrina, la
// moneta, il comando, i suoi link. Da qui in giu' (opzioniDaDati) non si legge
// piu' niente: si scrive solo quello che c'e' qui dentro.
export function datiPagina(canale, { baseUrl = '', display = '', ora = Date.now(), anteprima = false } = {}) {
  const ch = String(canale || '').toLowerCase();
  const v = vetrinaPagina(ch, { ora, anteprima });
  const link = linkPage.get(ch);
  return {
    ...v,
    nome: display || ch,
    url: urlPaginaNegozio(ch),
    privacy: `${baseUrl}${viaLegale('privacy', v.lingua)}#negozio`,
    urlLink: link?.attiva ? `${baseUrl}/u/${ch}` : '',
    urlTv: urlCanale(ch) || '',
    piattaforma: piattaformaDi(ch),
  };
}

// I pezzi del negozio e il loro foglio di stile, da dei dati gia' letti. E'
// una funzione pura: la usa la pagina vera, e i collaudi che misurano la
// pagina senza un database.
export function opzioniDaDati(v) {
  const t = T[lin(v.lingua)];
  const nome = v.nome;
  const moneta = maiuscola(v.moneta.nome);
  // L'accordo con la moneta (moneta.js) si scioglie solo nei pezzi scritti qui:
  // il nome del comando e quello della moneta restano come li ha scelti lo streamer.
  const accorda = (pezzi, ...valori) => pezzi.reduce((s, p, i) => s + accordaMoneta(p, v.moneta.forma) + (i < valori.length ? valori[i] : ''), '');
  const { urlLink, urlTv } = v;
  const dove = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube' }[v.piattaforma] || '';

  const scheda = (a, { formato = 'quadrato', prezzo = true, scorte = true, requisiti = true } = {}) => {
    const cmd = `${v.cmd} ${a.parola}`;
    const forma = FORME[formato] || FORME.quadrato;
    const img = a.immagine
      ? `<img class="ng-img" src="${esc(a.immagine)}" alt="" loading="lazy">`
      : `<span class="ng-segnaposto" aria-hidden="true">${SEGNAPOSTO}</span>`;
    const chip = [
      ...(a.quando ? [`<span class="ng-chip">${esc(a.quando)}</span>`] : []),
      ...(requisiti ? a.requisiti.map((r) => `<span class="ng-chip req">${esc(r)}</span>`) : []),
    ].join('');
    return `<article class="ng-art f-${esc(formato)}" style="--ng-forma:${forma}">
      ${img}
      <div class="ng-corpo">
        ${a.tipoNome ? `<span class="ng-tipo">${esc(a.tipoNome)}</span>` : ''}
        <h3 class="ng-nome">${esc(a.nome)}</h3>
        ${a.descrizione ? `<p class="ng-desc">${esc(a.descrizione)}</p>` : ''}
        ${chip ? `<div class="ng-righe">${chip}</div>` : ''}
        ${scorte && a.scorte ? `<p class="ng-scorte">${esc(a.scorte)}</p>` : ''}
        ${prezzo ? `<p class="ng-prezzo"><span class="ng-prezzo-m">${esc(moneta)}</span> <span class="ng-prezzo-n">${esc(a.prezzo)}</span></p>` : ''}
        <div class="ng-cmd"><code>${esc(cmd)}</code><button type="button" class="ng-copia" data-copia="${esc(cmd)}" data-fatto="${esc(t.copiato)}" aria-label="${esc(t.copiaCome(cmd))}">${esc(t.copia)}</button></div>
      </div>
    </article>`;
  };
  const segna = (testo, ritardo) => `<div class="segna" ${ritardo}>${esc(testo)}</div>`;

  const blocco = (b, { anteprima, ritardo }) => {
    if (b.tipo === 'vetrina') {
      const a = v.articoli.find((x) => x.id === b.articolo) || v.articoli[0];
      if (!a) return anteprima ? segna(t.segnaVuota, ritardo) : '';
      return `<section class="ng-vetrina" ${ritardo}>
        <h2 class="ng-sez-t">${esc(b.titolo || t.vetrina)}</h2>
        ${scheda(a, { formato: 'largo' })}
      </section>`;
    }
    if (b.tipo === 'articoli') {
      const titolo = b.titolo ? `<h2 class="ng-sez-t">${esc(b.titolo)}</h2>` : '';
      if (!v.articoli.length) return `<section class="ng-articoli" ${ritardo}>${titolo}<p class="ng-vuoto">${esc(t.vuota)}</p></section>`;
      return `<section class="ng-articoli" ${ritardo}>${titolo}
        <div class="ng-griglia c${b.colonne}" style="--ng-col:${b.colonne}">${v.articoli.map((a) => scheda(a, b)).join('')}</div>
      </section>`;
    }
    if (b.tipo === 'comecompra') {
      const es = v.articoli[0] ? `${v.cmd} ${v.articoli[0].parola}` : '';
      return `<section class="ng-come" ${ritardo}>
        <h2 class="ng-sez-t">${esc(b.titolo || t.come)}</h2>
        <p>${esc(t.comeTesto({ cmd: v.cmd, moneta: v.moneta.nome }, accorda))}</p>
        ${b.testo ? `<p>${esc(b.testo)}</p>` : ''}
        ${es ? `<div class="ng-cmd"><span class="ng-es">${esc(t.esempio)}</span><code>${esc(es)}</code><button type="button" class="ng-copia" data-copia="${esc(es)}" data-fatto="${esc(t.copiato)}" aria-label="${esc(t.copiaCome(es))}">${esc(t.copia)}</button></div>` : ''}
      </section>`;
    }
    if (b.tipo === 'piede') {
      const voce = (href, ico, testo) => `<a class="voce" href="${esc(href)}" target="_blank" rel="noopener"><span class="ico">${iconaMarchio(ico)}</span><span class="tx"><span class="et">${esc(testo)}</span></span><span class="fre" aria-hidden="true">›</span></a>`;
      const voci = [
        b.link && urlLink ? voce(urlLink, 'link', t.link(nome)) : '',
        b.canale && urlTv && dove ? voce(urlTv, v.piattaforma, t.canale(nome, dove)) : '',
      ].filter(Boolean).join('');
      return voci ? `<nav class="ng-piede" ${ritardo}>${voci}</nav>` : '';
    }
    return null;
  };

  const css = ({ c, stileBtn, ombra, aSinistra }) => `
  .solo-lettori{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .testa-b{display:flex;flex-direction:column;align-items:${aSinistra ? 'flex-start' : 'center'};text-align:${aSinistra ? 'left' : 'center'};gap:.3rem;width:100%;margin-bottom:.4rem}
  .ng-sez-t{font-family:var(--fd);font-weight:var(--pm);font-size:1.15rem;letter-spacing:-.01em;margin:.6rem 0 .5rem}
  .ng-griglia{display:grid;gap:var(--aria);grid-template-columns:repeat(var(--ng-col),minmax(0,1fr))}
  @media (max-width:40rem){.ng-griglia.c3{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:27rem){.ng-griglia{grid-template-columns:minmax(0,1fr)}}
  .ng-art{display:flex;flex-direction:column;min-width:0;border-radius:var(--r);overflow:hidden;${stileBtn};${ombra};color:var(--btxt);text-align:left}
  .ng-img{display:block;width:100%;aspect-ratio:var(--ng-forma);object-fit:cover;background:${c.bg2}}
  .ng-art.f-libero .ng-img{height:auto}
  .ng-segnaposto{display:grid;place-items:center;width:100%;aspect-ratio:var(--ng-forma);background:${c.bg2};color:var(--acc)}
  .ng-art.f-libero .ng-segnaposto{aspect-ratio:16 / 9}
  .ng-corpo{display:flex;flex-direction:column;gap:.45rem;padding:.85rem .95rem .95rem;flex:1}
  .ng-tipo{font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;color:var(--tenue);font-weight:var(--pm)}
  .ng-nome{font-family:var(--fd);font-weight:var(--pf);font-size:1.1rem;line-height:1.2;letter-spacing:-.01em}
  .ng-vetrina .ng-nome{font-size:1.35rem}
  .ng-desc{font-size:.92rem;color:var(--tenue);font-weight:var(--pt)}
  .ng-righe{display:flex;flex-wrap:wrap;gap:.35rem}
  .ng-chip{font-size:.76rem;line-height:1.3;padding:.2rem .6rem;border-radius:999px;border:1px solid ${c.bordo};color:var(--testo)}
  .ng-chip.req{border-color:var(--acc)}
  .ng-scorte{font-size:.84rem;color:var(--tenue)}
  .ng-prezzo{display:flex;align-items:baseline;flex-wrap:wrap;gap:.45rem;margin-top:auto}
  .ng-prezzo-m{font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--tenue);font-weight:var(--pm)}
  .ng-prezzo-n{font-family:var(--fd);font-weight:var(--pf);font-size:1.3rem;color:var(--testo)}
  .ng-cmd{display:flex;align-items:center;gap:.5rem;border-top:1px solid ${c.bordo};padding-top:.6rem;margin-top:.25rem}
  .ng-cmd code{flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ng-es{flex:0 0 auto;font-size:.8rem;color:var(--tenue)}
  .ng-copia{flex:0 0 auto;font:inherit;font-size:.82rem;font-weight:var(--pm);min-height:2.25rem;padding:.35rem .8rem;border-radius:calc(var(--r) * .6);border:1px solid var(--acc);background:transparent;color:var(--testo);cursor:pointer}
  .ng-copia:hover,.ng-copia:focus-visible{background:var(--acc);color:var(--suacc)}
  .ng-copia.fatto{background:var(--acc);color:var(--suacc)}
  .ng-vuoto{color:var(--tenue);font-size:.95rem;padding:.5rem 0}
  .ng-come{width:100%;padding:1rem 1.1rem;border-radius:var(--r);${stileBtn};${ombra};color:var(--btxt)}
  .ng-come .ng-sez-t{margin-top:0}
  .ng-come p{font-size:.95rem;margin-bottom:.45rem}
  .ng-come .ng-cmd{border-top:0;padding-top:0}
  .ng-piede{display:flex;flex-direction:column;gap:var(--aria);width:100%}`;

  return {
    lingua: lin(v.lingua),
    url: v.url,
    privacy: v.privacy,
    testi: { titolo: t.titolo, descrizione: t.descrizione(nome), vuota: t.vuota, creata: t.creata, privacy: t.privacy },
    blocco,
    css,
    articoli: v.articoli,
  };
}

// L'aspetto e i pezzi della pagina come li vede chi la apre: quelli salvati, o
// quelli di partenza per chi non l'ha mai toccata. Con `aspetto: 'link'` lo
// stile e il tema vengono dalla pagina link, come per le donazioni.
export function paginaDi(canale, display) {
  const ch = String(canale || '').toLowerCase();
  const p = paginaNegozio.get(ch);
  if (p) return aspettoDi(p, linkPage.get(ch));
  return paginaDiPartenza(ch, display);
}
export function paginaDiPartenza(canale, display) {
  const ch = String(canale || '').toLowerCase();
  const base = paginaNegozio.conDefault(ch, display);
  const t = T[lin(preferenzeDi(ch).lingua)];
  return { ...base, headline: t.partenza(display || ch), aspetto: 'suo',
    tema: { ...base.tema, larghezza: LARGHEZZA_DI_SERIE }, blocchi: PEZZI_DI_SERIE.map((b) => ({ ...b })) };
}

// La pagina intera. `pagina` serve all'anteprima del pannello (quella che si
// sta scrivendo, non ancora salvata); senza, quella del canale. Torna null se
// il negozio e' chiuso: chi chiama mostra «qui non c'e' un negozio».
export function htmlPaginaNegozio(canale, { pagina = null, anteprima = false, display = '', avatar = '', baseUrl = '', immagineAnteprima = '', ora = Date.now() } = {}) {
  const ch = String(canale || '').toLowerCase();
  if (!anteprima && !aperto(ch)) return null;
  const p = pagina || paginaDi(ch, display);
  const negozio = opzioniNegozio(ch, { baseUrl, display, ora, anteprima });
  const og = immagineAnteprima || (negozio.articoli.find((a) => a.immagine)?.immagine ? baseUrl + negozio.articoli.find((a) => a.immagine).immagine : '');
  return renderLinkPage(p, {
    login: ch, display: display || ch, avatar, baseUrl, anteprima,
    immagineAnteprima: og, negozio,
  });
}

// La lingua di chi apre una pagina che non c'e': quella del suo browser, fra
// le tre del sito. Non quella del canale, che direbbe se il canale esiste.
export function linguaDiChiApre(acceptLanguage) {
  const voci = String(acceptLanguage || '').toLowerCase().split(',').map((x) => x.trim().slice(0, 2));
  return voci.find((x) => LINGUE.includes(x)) || 'it';
}

// «Qui non c'e' un negozio»: la stessa per un canale che non esiste e per uno
// col negozio chiuso. Non nomina nessun canale e non porta a nessun altro
// negozio: solo al sito.
export function paginaNonCe(lingua, baseUrl = '') {
  const l = lin(lingua);
  const t = T[l];
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.nonCe)} · SocialBot</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0f0d16">
<link rel="icon" href="/icons/icon-192.png?v=9">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100dvh;display:grid;place-items:center;padding:1.5rem;background:#0f0d16;color:#f4f2fa;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.5;text-align:center}
  main{max-width:26rem;display:flex;flex-direction:column;align-items:center;gap:.8rem}
  svg{color:#a99ed0}
  h1{font-size:1.6rem;line-height:1.2;letter-spacing:-.02em}
  p{color:#c9c4d6}
  a{margin-top:.6rem;display:inline-block;padding:.7rem 1.2rem;border-radius:.8rem;background:#7c5cff;color:#ffffff;text-decoration:none;font-weight:600}
  a:focus-visible{outline:2px solid #ffffff;outline-offset:3px}
</style>
</head>
<body>
  <main>
    ${SEGNAPOSTO.replace('width="40" height="40"', 'width="56" height="56"')}
    <h1>${esc(t.nonCe)}</h1>
    <p>${esc(t.nonCeTesto)}</p>
    <a href="${esc(baseUrl)}/">${esc(t.nonCeVai)}</a>
  </main>
</body>
</html>`;
}
