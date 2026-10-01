// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Una pagina del negozio da misurare, senza database (docs/NEGOZIO.md, «La pagina»).
//
// I collaudi che guardano le pagine pubbliche nel browser (la larghezza, il
// contrasto) la compongono con le stesse due funzioni della pagina vera:
// renderLinkPage per il disegno e opzioniDaDati per i pezzi del negozio. Gli
// articoli sono quelli che uno streamer scrive davvero, compreso un nome senza
// spazi lungo una riga e un requisito che non sta in una riga di telefono.
import { renderLinkPage } from '../src/features/linkpagina.js';
import { opzioniDaDati, PEZZI_DI_SERIE, LARGHEZZA_DI_SERIE, testiPagina } from '../src/features/negozio-pagina.js';

const ARTICOLI = {
  it: [
    { id: 1, nome: 'Coriandoli a schermo', descrizione: 'Partono sulla diretta appena li compri.', parola: 'coriandoli', tipo: 'effetto', prezzo: '150',
      immagine: '', scorte: '', requisiti: [], quando: 'Solo in diretta' },
    { id: 2, nome: 'Supercalifragilistichespiralidoso_della_settimana', descrizione: 'Resta nella tua borsa.', parola: 'super', tipo: 'oggetto', prezzo: '1',
      immagine: '', scorte: 'Ne resta solo 1.', requisiti: ['Abbonati da almeno 12 mesi', 'Follower da almeno 365 giorni'], quando: '' },
    { id: 3, nome: 'VIP per una diretta', descrizione: '', parola: 'vip', tipo: 'vip', prezzo: '5000',
      immagine: '', scorte: 'Una volta a testa.', requisiti: ['Almeno 10 ore guardate'], quando: '' },
  ],
  es: [
    { id: 1, nome: 'Confeti en pantalla', descrizione: 'Sale en el directo en cuanto lo compras.', parola: 'confeti', tipo: 'effetto', prezzo: '150',
      immagine: '', scorte: '', requisiti: [], quando: 'Solo en directo' },
    { id: 2, nome: 'VIP durante un directo', descrizione: '', parola: 'vip', tipo: 'vip', prezzo: '5000',
      immagine: '', scorte: 'Una vez por persona.', requisiti: ['Suscriptores de tier 2 o superior', 'Al menos 10 horas vistas'], quando: '' },
  ],
};

export function paginaNegozioEsempio({ lingua = 'it', template = 'minimal', tema = {}, colonne = 2 } = {}) {
  const t = testiPagina(lingua);
  const articoli = (ARTICOLI[lingua] || ARTICOLI.it).map((a) => ({ ...a, tipoNome: t.tipi[a.tipo] || '' }));
  const negozio = opzioniDaDati({
    lingua, articoli, cmd: '!compra', moneta: { nome: lingua === 'es' ? 'monedas' : 'Semi di girasole', forma: lingua === 'es' ? 'fp' : 'mp' },
    nome: 'Andry', url: 'http://127.0.0.1/u/prova/negozio', privacy: 'http://127.0.0.1/privacy#negozio',
    urlLink: 'http://127.0.0.1/u/prova', urlTv: 'https://twitch.tv/prova', piattaforma: 'twitch',
  });
  const blocchi = PEZZI_DI_SERIE.map((b) => (b.tipo === 'articoli' ? { ...b, colonne } : { ...b }));
  return renderLinkPage({ headline: t.partenza('Andry'), tagline: '', template, blocchi, tema: { larghezza: LARGHEZZA_DI_SERIE, ...tema } },
    { login: 'prova', display: 'Andry', baseUrl: 'http://127.0.0.1', negozio });
}
