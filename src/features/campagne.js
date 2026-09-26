// LE CAMPAGNE: chi arriva dal QR di una pubblicità prende un regalo (docs/CAMPAGNE.md).
//
// Una pubblicità (per strada, su uno schermo, dove capita) porta un QR verso
// socialbot.live/<id>. Lì chi ha un canale prende, una volta sola, un periodo con
// dei pacchetti accesi. Le campagne le crea l'admin dalla scheda «Promo»: ognuna
// ha le sue regole (quanti giorni, quali pacchetti, quanti canali, per quanto
// resta aperta, da quando), la sua lingua, il suo fuso e la sua anteprima.
// Le tre di partenza (New York, Milano, Napoli) nascono al primo avvio con le
// regole decise per loro: un anno di tutto, i primi 500, 30 giorni.
//
// IL REGALO È LA PROVA, lunga quanto dice la campagna. È la stessa cosa della
// promo del primo accesso (server.js, `primoAccesso`): Base più i pacchetti, in
// stato «trialing», con la sua fine scritta nella riga. Scade da sé, perché
// `subscriptions.attivo` guarda la data; niente carta, niente Stripe, niente da
// disdire. Non si inventa un secondo modo di «avere i pacchetti».
//
// CHI NON LA PUÒ PRENDERE, e perché, detto per quello che è:
//   · chi paga già un piano (status «active»): il regalo scriverebbe sopra al suo
//     abbonamento, e Stripe continuerebbe a incassare. Se vuole il regalo, prima
//     disdice;
//   · chi è della community: ha già tutto, per sempre;
//   · chi l'ha già presa (una per canale, per campagna).
// Una prova in corso invece sì: diventa il regalo.
//
// Tutto qui è puro: la campagna, il tempo e il conteggio entrano da fuori. Il
// posto dove il conteggio non può sbagliare è la transazione del database
// (db.js, `campagneDb.prendi`): qui si decide, lì si tiene il tetto.
import { ADDON_IDS } from './abbonamenti.js';

const GIORNO = 86_400_000;
export const LINGUE = ['it', 'en', 'es'];
export const REGOLE = { giorni: 365, tetto: 500, finestra: 30 };
export const LIMITI = { giorni: [1, 3650], tetto: [1, 1_000_000], finestra: [1, 365] };
export const RE_ID = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

// Le campagne di partenza. L'anteprima e' il file che c'era gia' per loro.
export const SEME = [
  { id: 'nyc', lingua: 'en', fuso: 'America/New_York', luogo: 'Times Square', anteprima: '/icons/campagna-nyc.png?v=9' },
  { id: 'milano', lingua: 'it', fuso: 'Europe/Rome', luogo: 'Milano', anteprima: '/icons/campagna-milano.png?v=9' },
  { id: 'napoli', lingua: 'it', fuso: 'Europe/Rome', luogo: 'Napoli', anteprima: '/icons/campagna-napoli.png?v=9' },
];

// Di quanto il fuso è avanti rispetto a UTC in quell'istante, in millisecondi.
function scarto(ms, fuso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms)).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

export function fusoOk(fuso) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: String(fuso || '') }); return !!fuso; } catch { return false; }
}

// La mezzanotte di un giorno ('AAAA-MM-GG') nel fuso della campagna, in ms.
export function mezzanotte(data, fuso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data || '').trim());
  if (!m || !fusoOk(fuso)) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(utc);
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  let t = utc - scarto(utc, fuso);
  t = utc - scarto(t, fuso);
  return t;
}

const intero = (v, [min, max], def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const testo = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Una campagna come la si tiene: si tiene solo quello che ha forma, e ogni campo
// che manca prende la regola di partenza. `errori` dice cosa e' stato scartato.
export function norm(grezza = {}) {
  const g = grezza && typeof grezza === 'object' ? grezza : {};
  const errori = [];
  const lingua = LINGUE.includes(g.lingua) ? g.lingua : 'it';
  if (g.lingua !== undefined && g.lingua !== lingua) errori.push('lingua');
  const fuso = fusoOk(g.fuso) ? String(g.fuso) : 'Europe/Rome';
  if (g.fuso !== undefined && g.fuso !== fuso) errori.push('fuso');
  const dal = mezzanotte(g.dal, fuso) != null ? String(g.dal).trim() : '';
  if (g.dal && !dal) errori.push('dal');
  const pacchetti = Array.isArray(g.pacchetti) ? ADDON_IDS.filter((a) => g.pacchetti.includes(a)) : [...ADDON_IDS];
  const c = {
    lingua, fuso, dal, pacchetti,
    luogo: testo(g.luogo, 40),
    giorni: intero(g.giorni, LIMITI.giorni, REGOLE.giorni),
    tetto: intero(g.tetto, LIMITI.tetto, REGOLE.tetto),
    finestra: intero(g.finestra, LIMITI.finestra, REGOLE.finestra),
    attiva: g.attiva !== false,
    testi: { titolo: testo(g.testi?.titolo, 80), frase: testo(g.testi?.frase, 400) },
    anteprima: /^\/(icons|campagne)\/[a-z0-9-]+\.png(\?v=[a-z0-9]{1,16})?$/.test(String(g.anteprima || '')) ? String(g.anteprima) : '',
    grafica: g.grafica && typeof g.grafica === 'object' ? g.grafica : null,
  };
  return { campagna: c, errori };
}

// Un indirizzo nuovo: forma giusta, e non già preso da una pagina del sito.
// `occupati` sono i primi pezzi degli indirizzi del sito, letti dal router e
// dalla cartella pubblica: non un elenco scritto a mano che invecchia.
export function idNuovo(id, occupati = new Set(), esistenti = new Set()) {
  const s = String(id || '');
  if (!RE_ID.test(s)) return 'forma';
  if (occupati.has(s)) return 'occupato';
  if (esistenti.has(s)) return 'esiste';
  return '';
}

// Quando si apre e quando si chiude: dal giorno di messa in onda, per `finestra` giorni.
export function finestra(c) {
  const apre = c ? mezzanotte(c.dal, c.fuso) : null;
  return apre == null ? null : { apre, chiude: apre + c.finestra * GIORNO };
}

// Lo stato della campagna, per tutti: spenta | prima | aperta | piena | chiusa.
export function stato(c, { adesso = Date.now(), presi = 0 } = {}) {
  if (!c || !c.attiva) return 'spenta';
  const w = finestra(c);
  if (!w || adesso < w.apre) return 'prima';
  if (adesso >= w.chiude) return 'chiusa';
  return presi >= c.tetto ? 'piena' : 'aperta';
}

// Perché QUESTO canale non la può prendere adesso, o null se può.
export function perche({ statoCampagna, abbonamento, community, gia }) {
  if (gia) return 'gia';
  if (community) return 'tutto';
  if (abbonamento?.status === 'active') return 'abbonato';
  if (statoCampagna !== 'aperta') return statoCampagna;
  return null;
}

// Il regalo, come riga di abbonamento: la prova coi pacchetti della campagna.
export function regalo(c, adesso = Date.now()) {
  return { tier: 'base', pacchetti: [...c.pacchetti], status: 'trialing', periodEnd: adesso + c.giorni * GIORNO };
}

export const tuttiIPacchetti = (c) => ADDON_IDS.every((a) => c.pacchetti.includes(a));
