// Le recensioni di SocialBot: chi puo' lasciarla, cosa si pubblica e quando,
// la media, i dati strutturati. Tutto quello che decide sta qui, senza database
// e senza pagina, cosi' si prova da solo. Il modello e il perche' stanno in
// docs/RECENSIONI.md.

import { linkDi } from './antispam.js';
import { piattaformaDi } from '../identita.js';

export const STELLE_MIN = 1;
export const STELLE_MAX = 5;
export const TESTO_MAX = 400;
export const GIORNI_MINIMI = 7;
export const DIRETTE_MINIME = 2;
export const RIMANDA_GIORNI = 30;
export const MINIMO_STRISCIA = 3;
export const MASSIMO_STRISCIA = 12;
export const LINGUE = ['it', 'en', 'es'];
export const STATI = ['attesa', 'pubblicata', 'nascosta'];

const GIORNO = 86_400_000;

// Chi puo' recensire. Il proprietario del canale (non chi lo modera), approvato
// da almeno una settimana, che lo usa davvero: due dirette col bot acceso, o per
// chi usa solo Discord il bot che ha gia' lavorato sul suo server. Mai il
// proprietario del sito: chi fa SocialBot non si recensisce da solo.
export function puoRecensire({ streamer, proprietario, admin, dirette = 0, lavoroDiscord = false, ora = Date.now() }) {
  if (!proprietario) return { puo: false, perche: 'proprietario' };
  if (admin) return { puo: false, perche: 'autore' };
  if (!streamer || streamer.status !== 'approved') return { puo: false, perche: 'approvato' };
  const da = streamer.approved_at || streamer.requested_at || ora;
  if (ora - da < GIORNI_MINIMI * GIORNO) return { puo: false, perche: 'presto' };
  const discord = piattaformaDi(streamer.login) === 'discord';
  if (discord ? !lavoroDiscord : dirette < DIRETTE_MINIME) return { puo: false, perche: 'uso' };
  return { puo: true, perche: '' };
}

// Il testo come si pubblica: niente caratteri di controllo, spazi normali, al
// massimo TESTO_MAX caratteri, e niente link.
export function pulisciTesto(v) {
  const testo = String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .split('\n').map((riga) => riga.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (testo.length > TESTO_MAX) return { ok: false, errore: 'lungo', testo: '' };
  if (linkDi(testo).length) return { ok: false, errore: 'link', testo: '' };
  return { ok: true, errore: '', testo };
}

export function validaRecensione(corpo = {}) {
  const stelle = Number(corpo.stelle);
  if (!Number.isInteger(stelle) || stelle < STELLE_MIN || stelle > STELLE_MAX) return { ok: false, errore: 'stelle' };
  const t = pulisciTesto(corpo.testo);
  if (!t.ok) return { ok: false, errore: t.errore };
  const lingua = LINGUE.includes(corpo.lingua) ? corpo.lingua : 'it';
  return { ok: true, dato: { stelle, testo: t.testo, lingua, conNome: corpo.conNome === true } };
}

// Lo stato dopo un salvataggio. Le stelle da sole non hanno niente da
// controllare e si pubblicano subito. Un testo nuovo, o cambiato, aspetta che
// qualcuno lo legga; lo stesso testo di una recensione gia' pubblicata resta
// pubblicato, anche se cambiano le stelle. Una recensione nascosta resta
// nascosta finche' il testo non cambia: nasconderla e' stata una decisione su
// quel testo, non sul voto.
export function statoDopo(prima, nuova) {
  if (!nuova.testo) return 'pubblicata';
  if (prima && prima.testo === nuova.testo) return prima.stato === 'nascosta' ? 'nascosta' : prima.stato;
  return 'attesa';
}

// L'invito compare solo a chi puo' recensire, non l'ha fatto, non ha detto
// «mai» e non l'ha rimandato da poco.
export function invitoAperto({ puo, mia, invito = {}, ora = Date.now() }) {
  if (!puo || mia) return false;
  if (invito.mai) return false;
  return !(invito.rimandaFino && invito.rimandaFino > ora);
}

export function rimandaFino(ora = Date.now()) {
  return ora + RIMANDA_GIORNI * GIORNO;
}

const NOME_PIATTAFORMA = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube', discord: 'Discord' };
export function piattaformaLeggibile(login) {
  return NOME_PIATTAFORMA[piattaformaDi(login)] || 'Twitch';
}

// Quello che la pagina iniziale mostra: la media e il numero di TUTTE le
// recensioni pubblicate (il riepilogo), e le ultime MASSIMO_STRISCIA con testo
// (la striscia: la lista arriva dalla piu' recente). Se le recensioni con testo
// sono meno di MINIMO_STRISCIA la striscia non c'e', e con lei nemmeno i dati
// strutturati. Il tetto tiene la striscia a un giro che si guarda (sette
// secondi a carta), e da' a vetrina.css un numero finito di durate da scrivere:
// la durata segue il numero di carte senza stili scritti nella pagina.
export function vetrinaDi(pubblicate = []) {
  const valide = pubblicate.filter((r) => r && r.stato === 'pubblicata' && Number.isInteger(r.stelle));
  const conTesto = valide.filter((r) => r.testo);
  if (conTesto.length < MINIMO_STRISCIA) return null;
  const somma = valide.reduce((t, r) => t + r.stelle, 0);
  return {
    media: Math.round((somma / valide.length) * 10) / 10,
    quanti: valide.length,
    voci: conTesto.slice(0, MASSIMO_STRISCIA).map((r) => ({
      stelle: r.stelle, testo: r.testo, lingua: r.lingua || 'it',
      nome: r.conNome && r.display ? r.display : '', piattaforma: piattaformaLeggibile(r.login),
    })),
  };
}

// I dati strutturati, calcolati dalla stessa cosa che la pagina mostra.
// `review` porta solo le recensioni con un autore: quelle anonime contano nella
// media, che il riepilogo visibile dichiara, ma un autore senza nome non e' un
// autore.
export function datiStrutturati(v) {
  if (!v) return null;
  const fuori = {
    aggregateRating: { '@type': 'AggregateRating', ratingValue: v.media, ratingCount: v.quanti, bestRating: STELLE_MAX, worstRating: STELLE_MIN },
  };
  const firmate = v.voci.filter((r) => r.nome);
  if (firmate.length) {
    fuori.review = firmate.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.nome },
      reviewRating: { '@type': 'Rating', ratingValue: r.stelle, bestRating: STELLE_MAX, worstRating: STELLE_MIN },
      reviewBody: r.testo,
      inLanguage: r.lingua,
    }));
  }
  return fuori;
}

// JSON dentro un <script>: un «</script>» nel testo di una recensione non deve
// poter chiudere il blocco.
export function jsonSicuro(o) {
  return JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
