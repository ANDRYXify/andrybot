// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Una pagina delle donazioni da misurare, senza database.
//
// I collaudi che guardano le pagine pubbliche nel browser (la larghezza, le
// scelte) la compongono con la stessa funzione della pagina vera,
// renderLinkPage, col blocco «Sostienimi» e un conto collegato: le pillole
// degli importi, le offerte con un nome lungo, il campo per un altro importo,
// il nome e il messaggio. Sono le cose che uno streamer mette davvero.
import { renderLinkPage } from '../src/features/linkpagina.js';

const DATI = {
  modo: 'conto', mezzi: ['stripe', 'satispay'], link: '', importi: [2, 5, 10, 20, 50], minimo: 1, massimo: 500,
  livelli: [{ da: 3, nome: 'Un caffè', effetto: '' }, { da: 5, nome: 'Applauso della chat', effetto: 'effetto:clap' }, { da: 10, nome: '', effetto: '' },
    { da: 25, nome: 'Coriandoli su tutto lo schermo', effetto: '' }, { da: 50, nome: 'Il boss', effetto: '' }],
  conMessaggio: true, etichetta: 'Dona', messaggio: '', valuta: 'EUR', goal: null,
};

export function paginaDonaEsempio({ template = 'minimal', tema = {} } = {}) {
  return renderLinkPage({ attiva: true, headline: 'Andry', template, blocchi: [{ tipo: 'sostieni', titolo: 'Sostieni la diretta' }], tema },
    { login: 'prova', display: 'Andry', baseUrl: 'http://127.0.0.1', sostieni: DATI, dona: true });
}
