// LA QUOTA DI YOUTUBE, CHE E' UNA SOLA PER TUTTI.
//
// Questa e' la cosa che rende la chat di YouTube diversa da Kick e da Twitch, e
// va capita prima di leggere il resto: la quota giornaliera non e' dello
// streamer, e' del PROGETTO GOOGLE — cioe' di SocialBot. Un progetto ha 10.000
// unita' al giorno (developers.google.com/youtube/v3/determine_quota_cost), e
// tutti i canali che accendono la chat spendono dalla stessa borsa. Non c'e'
// modo di farsi pagare la quota da ciascuno: le chiamate le fa il nostro client
// OAuth, e Google le addebita a noi.
//
// Quanto costa una chiamata di chat, Google non lo scrive nella tabella
// pubblica. Non sapendolo, si sceglie la stima ALTA (5 unita'): sbagliare in
// questa direzione spreca margine, sbagliare nell'altra finisce la quota di
// tutti a meta' pomeriggio e la chat muore per chiunque, senza che nessuno
// capisca perche'. Fra i due errori non sono equivalenti.
//
// Cosa fa questo file: tiene il conto, e quando la borsa e' vuota lo dice
// invece di continuare a bussare. Il conto sopravvive ai riavvii (sta in
// stato_vivo, come tutto il resto che deve sopravvivere), se no bastava un
// deploy per ricominciare a spendere da zero.
//
// Il giorno di Google finisce a mezzanotte del Pacifico, non a mezzanotte qui.
import { statoVivo } from '../db.js';

const CASA = '__socialbot__';
const CHIAVE = 'quota-youtube';

export const COSTO_STIMATO = 5;         // per chiamata, stima alta e dichiarata
export const TETTO = 8000;              // su 10.000: il resto e' margine per il resto del bot

let _cache = null;

export function giornoPacifico(ora = Date.now()) {
  try { return new Date(ora).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); }
  catch { return new Date(ora).toISOString().slice(0, 10); }
}

function borsa(ora = Date.now()) {
  const oggi = giornoPacifico(ora);
  if (_cache && _cache.giorno === oggi) return _cache;
  let salvata = null;
  try { salvata = statoVivo.leggi(CASA, CHIAVE); } catch { salvata = null; }
  _cache = (salvata && salvata.giorno === oggi)
    ? { giorno: oggi, spese: Math.max(0, Number(salvata.spese) || 0) }
    : { giorno: oggi, spese: 0 };
  return _cache;
}

function scrivi() {
  try { statoVivo.scrivi(CASA, CHIAVE, _cache); } catch { /* il conto vale comunque per questa sessione */ }
}

// Chiedere di spendere. Ritorna false se la borsa e' vuota: chi riceve false
// non deve chiamare YouTube, non deve riprovare subito, e deve dirlo.
export function chiedi(chiamate = 1, ora = Date.now()) {
  const b = borsa(ora);
  const costo = Math.max(1, Math.round(chiamate)) * COSTO_STIMATO;
  if (b.spese + costo > TETTO) return false;
  b.spese += costo;
  scrivi();
  return true;
}

export function stato(ora = Date.now()) {
  const b = borsa(ora);
  return { giorno: b.giorno, spese: b.spese, tetto: TETTO, restano: Math.max(0, TETTO - b.spese), finita: b.spese >= TETTO };
}

// Quanto manca a mezzanotte del Pacifico, per aspettare il rinnovo invece di
// ribussare ogni minuto a una porta che oggi non si apre piu'.
export function fraQuantoRinnova(ora = Date.now()) {
  const oggi = giornoPacifico(ora);
  let ms = 60 * 60 * 1000;
  for (let i = 1; i <= 26; i += 1) {
    const p = ora + i * 60 * 60 * 1000;
    if (giornoPacifico(p) !== oggi) { ms = p - ora; break; }
  }
  return Math.min(ms, 26 * 60 * 60 * 1000);
}

export function _azzeraPerProva() { _cache = null; }
