// LE CAMPAGNE IN CITTÀ: chi arriva dal QR di una pubblicità prende un anno di tutto.
//
// Una pubblicità per strada (Times Square a New York, Milano, Napoli) porta un
// QR verso socialbot.live/<città>. Lì chi ha un canale prende, una volta sola,
// un anno con TUTTI i pacchetti accesi. Le regole le ha decise il proprietario
// del prodotto e valgono uguali per ogni città:
//   · 365 giorni di tutto, poi il canale torna all'Essenziale, gratis per sempre;
//   · i primi 500 canali per città;
//   · si prende entro 30 giorni da quando la pubblicità va in onda.
//
// IL REGALO È LA PROVA COMPLETA, lunga un anno. È la stessa cosa della promo del
// primo accesso (server.js, `primoAccesso`): Base più tutti i pacchetti, in
// stato «trialing», con la sua fine scritta nella riga. Scade da sé, perché
// `subscriptions.attivo` guarda la data; niente carta, niente Stripe, niente da
// disdire. Non si inventa un secondo modo di «avere tutto».
//
// CHI NON LA PUÒ PRENDERE, e perché, detto per quello che è:
//   · chi paga già un piano (status «active»): il regalo scriverebbe sopra al suo
//     abbonamento, e Stripe continuerebbe a incassare. Se vuole l'anno gratis,
//     prima disdice;
//   · chi è della community: ha già tutto, per sempre;
//   · chi l'ha già presa (una per canale, per città).
// Una prova in corso invece sì: diventa un anno.
//
// Il tempo e il conteggio entrano da fuori (adesso, presi): stessi dati, stessa
// risposta. Il posto dove il conteggio non può sbagliare è la transazione del
// database (db.js, `campagneDb.prendi`): qui si decide, lì si tiene il tetto.
import { ADDON_IDS } from './abbonamenti.js';

export const CAMPAGNE = {
  nyc: { lingua: 'en', fuso: 'America/New_York', luogo: 'Times Square' },
  milano: { lingua: 'it', fuso: 'Europe/Rome', luogo: 'Milano' },
  napoli: { lingua: 'it', fuso: 'Europe/Rome', luogo: 'Napoli' },
};
export const ID = Object.keys(CAMPAGNE);
export const GIORNI = 365;
export const TETTO = 500;
export const FINESTRA = 30;
const GIORNO = 86_400_000;

export const eCampagna = (id) => ID.includes(String(id || ''));

// Di quanto il fuso è avanti rispetto a UTC in quell'istante, in millisecondi.
function scarto(ms, fuso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms)).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// La mezzanotte di un giorno ('AAAA-MM-GG') nel fuso della città, in ms.
export function mezzanotte(data, fuso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data || '').trim());
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (new Date(utc).getUTCDate() !== +m[3]) return null;
  let t = utc - scarto(utc, fuso);
  t = utc - scarto(t, fuso);
  return t;
}

// Quando si apre e quando si chiude: dal giorno di messa in onda, per FINESTRA giorni.
export function finestra(id, dal) {
  const c = CAMPAGNE[id];
  const apre = c ? mezzanotte(dal, c.fuso) : null;
  return apre == null ? null : { apre, chiude: apre + FINESTRA * GIORNO };
}

// Lo stato della campagna, per tutti: prima | aperta | piena | chiusa.
export function stato(id, { dal, adesso = Date.now(), presi = 0 }) {
  const w = finestra(id, dal);
  if (!w || adesso < w.apre) return 'prima';
  if (adesso >= w.chiude) return 'chiusa';
  return presi >= TETTO ? 'piena' : 'aperta';
}

// Perché QUESTO canale non la può prendere adesso, o null se può.
// abbonamento: la riga di subscriptions (o null); community: booleano; gia: l'ha già presa.
export function perche({ statoCampagna, abbonamento, community, gia }) {
  if (gia) return 'gia';
  if (community) return 'tutto';
  if (abbonamento?.status === 'active') return 'abbonato';
  if (statoCampagna !== 'aperta') return statoCampagna;
  return null;
}

// Il regalo, come riga di abbonamento: la prova completa, lunga GIORNI.
export function regalo(adesso = Date.now()) {
  return { tier: 'base', pacchetti: ADDON_IDS, status: 'trialing', periodEnd: adesso + GIORNI * GIORNO };
}
