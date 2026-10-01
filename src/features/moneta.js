// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL NOME DELLA MONETA, E COME SE NE PARLA.
//
// Il nome lo sceglie lo streamer, e in italiano (e in spagnolo) un nome si porta
// dietro un genere e un numero: «le tue monete», ma «i tuoi Semi di girasole»,
// «il tuo Oro», «la tua Energia». Le frasi scritte per «monete» li davano tutti
// al femminile plurale, e in chat usciva «Le tue Semi di girasole».
//
// LA FORMA e' una di quattro: fp (femminile plurale), mp, fs, ms. Lo streamer la
// sceglie a orecchio, vedendo le quattro frasi gia' scritte col suo nome, senza
// bisogno di sapere cos'e' un genere. Finche' non sceglie vale una base:
//  · per il nome di serie («monete») e' fp, perche' lo e';
//  · per un nome suo, la fine della prima parola: -e o -a femminile, tutto il
//    resto maschile (anche le parole straniere, che in italiano lo sono), e
//    plurale, perche' una moneta si conta. E' una base visibile nel pannello,
//    non una verita': la scelta dello streamer vince sempre.
//
// Nelle frasi l'accordo si scrive %[le tue|i tuoi|la tua|il tuo]%, sempre in
// quest'ordine (fp, mp, fs, ms). Una frase sola, quattro modi: non ci sono
// quattro copie da tenere allineate.
//
// La regola della base e lo scioglimento degli accordi stanno in
// src/web/public/formati.js, lo stesso file che usa il pannello: la base che
// vede lo streamer mentre scrive il nome e' quella che usera' il bot.
import '../web/public/formati.js';
import { streamers } from '../db.js';

const F = globalThis.SB_FORMATI;

export const FORME_MONETA = F.FORME_MONETA;
export const NOME_BASE = F.NOME_MONETA_BASE;
export const NOME_MAX = 20;

export const nomePulito = (nome) => String(nome ?? '').trim().slice(0, NOME_MAX);
export const formaBase = (nome) => F.formaMonetaBase(nomePulito(nome));
export const formaValida = (f) => FORME_MONETA.includes(f);
export const accordaMoneta = (testo, forma) => F.accordaMoneta(testo, forma);

// La moneta di un canale: il nome da scrivere, la forma con cui se ne parla, e
// se quella forma l'ha scelta lo streamer o e' la base.
export function monetaDi(canale) {
  return monetaDa(streamers.get(String(canale || '').toLowerCase())?.settings || {});
}
// La stessa cosa da impostazioni gia' lette: la usa anche la demo, che il
// canale non ce l'ha nel database.
export function monetaDa(s = {}) {
  const nome = nomePulito(s?.nomeMonete) || NOME_BASE;
  const scelta = formaValida(s?.formaMonete) ? s.formaMonete : '';
  return { nome, forma: scelta || formaBase(nome), scelta: !!scelta };
}

export const nomeMoneta = (canale) => monetaDi(canale).nome;
