// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// L'ARENA DELLE EMOTE, la parte del bot.
//
// Chi scrive in chat entra nell'arena con la sua emote, i combattenti si
// scontrano da soli e vince l'ultimo rimasto. La partita la calcola il motore
// (src/web/public/arena.js), lo stesso che gira nell'overlay; qui si decide chi
// entra, quando si parte, chi paga e chi prende. Il piano sta in docs/ARENA.md.
// Sei regole.
//
//  · LA PARTITA E' UNA FUNZIONE. Seme, combattenti e regole la decidono tutta:
//    alla chiusura delle iscrizioni il server la fa correre fino in fondo e sa
//    gia' chi vince, e ogni overlay che riceve gli stessi tre dati disegna la
//    stessa partita. Il server non manda posizioni: manda i dati.
//  · IL SEME NASCE ALLA CHIUSURA. Prima dell'ultimo ingresso non esiste, quindi
//    nessuno puo' calcolare l'esito ed entrare solo se vince. E' un dato
//    casuale (crypto), non un caso che regge la partita: da li' in poi e'
//    tutto determinato.
//  · SI DICE QUANDO SI VEDE. Il vincitore e' noto al primo istante della
//    battaglia, ma il bot lo dice e paga solo quando l'overlay ci arriva:
//    t0 + passi / PASSO secondi, arrotondato in su, cosi' la chat non precede
//    mai lo schermo.
//  · LE REGOLE SI FERMANO ALL'APERTURA. Quelle del pannello si leggono una
//    volta: se lo streamer le cambia a partita aperta, la partita resta quella
//    che il server e gli overlay stanno giocando.
//  · L'INGRESSO SI PAGA SUBITO, E NON SI PERDE. Come la puntata del blackjack:
//    chi entra paga all'ingresso (una volta sola), e la quota e' scritta nello
//    stato che sopravvive a un riavvio. Se l'arena si annulla, o il bot si
//    riavvia nel mezzo, torna a chi l'aveva pagata.
//  · L'EMOTE E' UNA FUNZIONE ANCHE LEI. Quella scelta con !emote; se no la
//    prima emote del messaggio con cui si entra (Twitch dal tag, poi 7TV);
//    se no una delle emote del canale, sempre la stessa per la stessa
//    persona; se no niente, e l'overlay disegna l'iniziale del nome.
import crypto from 'node:crypto';
import '../web/public/arena.js';
import { points, streamers, statoVivo, arenaEmote, EMOTE_URL_OK } from '../db.js';
import * as economia from './economia.js';
import { valoriDi, regoleDa } from './giochi-conf.js';
import { nomeIn, puoUsare, vivo, moduloAcceso } from './comandi-registro.js';
import { BOT_NOTI } from './muro.js';
import { twitchInMessaggio } from './emotes.js';
import { aspetta, giocato } from './attese-giochi.js';
import { aChi } from './risposte.js';
import { nomeMoneta } from './moneta.js';

const A = globalThis.SB_ARENA;

// LE FRASI, TUTTE QUI. Arrivera' la voce del canale (docs/VOCE.md): chi la
// porta cambia questo oggetto e basta. {x} si riempie con `di`.
export const FRASI = {
  apre: '⚔️ {annuncio}Si apre l\'arena delle emote! {entrare}, avete {secondi} secondi.{costo} Con !{emote} e un\'emote scegliete la vostra.',
  entrareScrivi: 'Scrivete in chat per entrare',
  entrareComando: 'Scrivete !{combatti} per entrare',
  costo: ' L\'ingresso costa {costo} {monete}.',
  gia: '⚔️ C\'è già un\'arena in corso.',
  nessuna: '⚔️ Nessuna arena aperta adesso.',
  piena: '⚔️ L\'arena è piena, {massimo} combattenti: si entra la prossima volta.',
  riservata: '⚔️ {nome}, quest\'arena è riservata {chi}.',
  senzaMonete: '⚔️ {nome}, per entrare servono {costo} {monete} e ne hai {saldo}.',
  nessunoDentro: '⚔️ Nell\'arena non è entrato nessuno: sarà per la prossima.',
  unoSolo: '⚔️ Nell\'arena c\'è solo {nome}, e per combattere servono due persone: sarà per la prossima.{resi}',
  fermata: '⚔️ Arena fermata.{resi}',
  resi: ' L\'ingresso è tornato a chi l\'aveva pagato.',
  parte: '⚔️ Si combatte! {n} combattenti nell\'arena.',
  vince: '🏆 {nome} vince l\'arena {come}!{premi}',
  vinceATempo: '🏆 Tempo scaduto: vince {nome}, ancora in piedi con più vita di tutti.{premi}',
  conEliminazioni: 'con {k} eliminazioni',
  conUna: 'con un\'eliminazione',
  senzaEliminare: 'senza eliminare nessuno',
  premi: ' Premi: {elenco}.',
  emoteScelta: '⚔️ {nome}, nell\'arena combatterai con {emote}.',
  emoteRicordata: '⚔️ {nome}, nell\'arena combatti con {emote}. Per cambiarla: !{cmd} e un\'altra emote.',
  emoteNessuna: '⚔️ {nome}, non hai ancora scelto un\'emote: scrivi !{cmd} e l\'emote che vuoi.',
  emoteNonTrovata: '⚔️ {nome}, in quel messaggio non vedo un\'emote di Twitch o del canale.',
  riavvio: '⚔️ Il bot si è riavviato durante l\'arena: l\'ingresso è tornato a {chi}.',
  // Le due righe in alto nell'overlay, durante le iscrizioni.
  schermoScrivi: 'Scrivi in chat per entrare!',
  schermoComando: 'Scrivi !{combatti} per entrare!',
  schermoEmote: '!{emote} nome per scegliere la tua',
  // Sotto il vincitore, grande al centro.
  schermoVince: 'vince l\'arena!',
  schermoATempo: 'resta in piedi e vince!',
};
const A_CHI = { sub: 'a chi è abbonato', vip: 'ai VIP', mod: 'ai moderatori' };

const di = (frase, v = {}) => String(frase).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''));
const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'arena');
const monete = (channel) => nomeMoneta(channel);
const ELENCO_MAX = 10;
const elenca = (voci) => (voci.length > ELENCO_MAX ? `${voci.slice(0, ELENCO_MAX).join(', ')} e altri ${voci.length - ELENCO_MAX}` : voci.join(', '));
const SILENZIO_MS = 30_000;
const EMOTE_ATTESA_MS = 5_000;
const PAROLE_MAX = 30;
const CHIAVE_QUOTE = 'arena-quote';

// ── cose che le prove sostituiscono ─────────────────────────────────────

let spinta = null;
export function impostaSpinta(fn) { spinta = typeof fn === 'function' ? fn : null; }
function manda(channel, p) {
  try { spinta?.(channel, { tipo: 'arena', ...p }); } catch { /* l'overlay e' un di piu' */ }
}

// L'orologio e le sveglie. Letti a ogni chiamata, non fotografati: chi prova
// col tempo finto di node li trova gia' finti, chi inietta il suo usa il suo.
const OROLOGIO = {
  ora: () => Date.now(),
  dopo: (fn, ms) => { const t = setTimeout(fn, ms); t.unref?.(); return t; },
  annulla: (t) => clearTimeout(t),
};
let orologio = OROLOGIO;
export function impostaOrologio(o) { orologio = o ? { ...OROLOGIO, ...o } : OROLOGIO; }

// Il caso dell'ingresso (la probabilita' delle chat grandi) e il seme della
// battaglia. Tutti e due vengono da crypto: sono dati, non dadi che reggono la
// partita.
const CASO = () => crypto.randomBytes(4).readUInt32BE(0) / 4294967296;
const SEME = () => crypto.randomBytes(8).toString('hex');
let caso = CASO;
let nuovoSeme = SEME;
export function impostaCaso(f) { caso = typeof f === 'function' ? f : CASO; }
export function impostaSeme(f) { nuovoSeme = typeof f === 'function' ? f : SEME; }

// Le emote del canale: `tutte` (7TV del canale e globali, per riconoscerle in
// un messaggio) e `proprie` (solo quelle del canale, per sceglierne una a chi
// non ne porta). Il bot le collega a emotes.js; senza, non ce ne sono.
const NESSUNA = async () => ({});
let caricaEmote = { tutte: NESSUNA, proprie: NESSUNA };
export function impostaEmote(x) {
  caricaEmote = { tutte: typeof x?.tutte === 'function' ? x.tutte : NESSUNA, proprie: typeof x?.proprie === 'function' ? x.proprie : NESSUNA };
}

// ── l'emote di un combattente ───────────────────────────────────────────

const paroleDi = (testo) => String(testo || '').split(/\s+/).filter(Boolean).slice(0, PAROLE_MAX);
const suo = (m, k) => !!m && Object.prototype.hasOwnProperty.call(m, k) && typeof m[k] === 'string' && EMOTE_URL_OK.test(m[k]);

// La prima emote del messaggio, per posizione: per ogni parola prima Twitch
// (dal tag del messaggio), poi 7TV (la mappa del canale).
export function primaEmote(parole, twitch, mappa) {
  for (const w of parole || []) {
    if (suo(twitch, w)) return { nome: w, url: twitch[w] };
    if (suo(mappa, w)) return { nome: w, url: mappa[w] };
  }
  return null;
}

// Un numero da un nome, sempre lo stesso (FNV-1a): serve a VARIARE l'emote di
// chi non ne porta una, non a decidere niente della partita.
function impronta(testo) {
  let h = 2166136261;
  for (const c of String(testo)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function emoteDi({ scelta, parole, twitch } = {}, mappe = {}, id = '') {
  if (scelta && scelta.nome && EMOTE_URL_OK.test(String(scelta.url))) return { nome: scelta.nome, url: scelta.url };
  const dalMessaggio = primaEmote(parole, twitch, mappe.tutte);
  if (dalMessaggio) return dalMessaggio;
  const nomi = Object.keys(mappe.proprie || {}).filter((k) => suo(mappe.proprie, k)).sort();
  if (!nomi.length) return null;
  const k = nomi[impronta(id) % nomi.length];
  return { nome: k, url: mappe.proprie[k] };
}

const COLORE_OK = /^#[0-9a-f]{6}$/i;
const pubblico = (c) => ({ id: c.id, nome: c.nome, colore: c.colore, emote: c.emote });

// ── la partita ──────────────────────────────────────────────────────────

const partite = new Map();   // canale → partita (vedi `apri`)
const silenzi = new Map();   // canale → fino a quando «nessuna arena» non si ripete
const ultimaEmote = new Map();  // canale|chi → quando ha scritto !emote l'ultima volta

export const arenaInCorso = (channel) => partite.get(channel)?.fase || null;

function righeSchermo(channel, c) {
  const nomi = { combatti: nomeIn(channel, 'combatti'), emote: nomeIn(channel, 'emote') };
  return [di(c.ingresso === 'comando' ? FRASI.schermoComando : FRASI.schermoScrivi, nomi), di(FRASI.schermoEmote, nomi)];
}

// Quello che sa chi apre l'overlay a meta': abbastanza per rifare la partita
// da capo fino ad adesso. `ora` e' l'istante del server in cui lo stato e'
// stato scritto: l'overlay lo confronta col suo orologio e traduce gli altri
// istanti, cosi' due orologi che non vanno d'accordo non spostano la partita.
export function stato(channel) {
  const p = partite.get(channel);
  if (!p) return null;
  return {
    fase: p.fase,
    ora: orologio.ora(),
    righe: p.righe,
    aperta: p.aperta,
    fineIscrizioni: p.chiude,
    combattenti: p.combattenti.map(pubblico),
    regole: p.regole,
    seme: p.seme,
    t0: p.t0,
    esito: p.fase === 'vittoria' ? p.esitoPubblico : null,
    fineVittoria: p.fineVittoria,
  };
}

export function apri(channel, say, { annuncio = '' } = {}) {
  if (partite.has(channel)) return false;
  const c = conf(channel);
  const ora = orologio.ora();
  const p = {
    fase: 'iscrizioni', c, say, regole: A.regole(regoleDa(c)),
    aperta: ora, chiude: ora + c.iscrizioni * 1000,
    combattenti: [], dentro: new Map(), visti: new Set(), detti: new Set(), quote: new Map(),
    mappe: { tutte: {}, proprie: {} }, seme: null, t0: null, esito: null, esitoPubblico: null, fineVittoria: null, timer: null,
  };
  p.righe = righeSchermo(channel, c);
  p.timer = orologio.dopo(() => chiudi(channel, p), c.iscrizioni * 1000);
  partite.set(channel, p);
  const nomi = { combatti: nomeIn(channel, 'combatti'), emote: nomeIn(channel, 'emote') };
  try {
    say(di(FRASI.apre, {
      annuncio, secondi: c.iscrizioni, emote: nomi.emote,
      entrare: di(c.ingresso === 'comando' ? FRASI.entrareComando : FRASI.entrareScrivi, nomi),
      costo: c.costo > 0 ? di(FRASI.costo, { costo: c.costo, monete: monete(channel) }) : '',
    }));
  } catch { /* niente */ }
  manda(channel, { azione: 'iscrizioni', ora, aperta: ora, fineIscrizioni: p.chiude, righe: p.righe, regole: p.regole });
  // Le emote 7TV arrivano quando arrivano: chi e' gia' entrato si ricalcola,
  // e il suo `entra` riparte con l'emote giusta. Dopo la chiusura non si tocca
  // piu' niente: la battaglia e' partita con quelle che c'erano.
  Promise.all([caricaEmote.tutte(channel), caricaEmote.proprie(channel)]).then(([tutte, proprie]) => {
    if (partite.get(channel) !== p || p.fase !== 'iscrizioni') return;
    p.mappe = { tutte: tutte || {}, proprie: proprie || {} };
    for (const x of p.combattenti) rivesti(channel, p, x);
  }).catch(() => {});
  return true;
}

function rivesti(channel, p, x) {
  const e = emoteDi(x, p.mappe, x.id);
  if (JSON.stringify(e) === JSON.stringify(x.emote)) return;
  x.emote = e;
  manda(channel, { azione: 'entra', combattente: pubblico(x) });
}

function ricordaQuote(channel, p) {
  try {
    if (p.quote.size) statoVivo.scrivi(channel, CHIAVE_QUOTE, Object.fromEntries(p.quote));
    else statoVivo.togli(channel, CHIAVE_QUOTE);
  } catch { /* il database e' giu': la quota e' comunque in memoria */ }
}

// Una quota e' { q, ricevuta }: torna coi lotti che erano stati spesi
// (docs/ECONOMIA.md). Una quota di prima dei lotti e' un numero, pagato con
// monete che non scadevano.
const ricevutaDi = (v) => (Array.isArray(v?.ricevuta) ? v.ricevuta : [{ scade: 0, quanti: Math.max(0, Math.round(Number(v?.q ?? v) || 0)) }]);

// Rende le quote d'ingresso di una partita che non si gioca fino in fondo.
function rendiQuote(channel, p) {
  const resi = [...p.quote];
  for (const [chi, v] of resi) economia.rendi(channel, chi, ricevutaDi(v));
  p.quote.clear();
  ricordaQuote(channel, p);
  return resi.length > 0;
}

// Le quote rimaste scritte da prima di un riavvio: la partita non c'e' piu', e
// chi aveva pagato l'ingresso non deve perderlo.
export const testoRimborso = ({ chi }) => di(FRASI.riavvio, { chi: elenca(chi) });
export function rimborsaDopoRiavvio() {
  const rese = [];
  for (const { channel, dato } of statoVivo.tutti(CHIAVE_QUOTE)) {
    if (partite.has(channel)) continue;
    const chi = [];
    for (const [u, v] of Object.entries(dato || {})) {
      const ricevuta = ricevutaDi(v);
      if (!ricevuta.some((l) => l.quanti > 0)) continue;
      economia.rendi(channel, u, ricevuta);
      chi.push(u);
    }
    statoVivo.togli(channel, CHIAVE_QUOTE);
    if (chi.length) rese.push({ channel, chi });
  }
  return rese;
}

// Chi entra, e come. Torna true se e' entrato adesso.
function entra(channel, p, msg, say, { comando = false } = {}) {
  const id = pulito(msg?.user);
  if (!id || msg.isSelf || BOT_NOTI.has(id)) return false;
  if (p.dentro.has(id) || p.visti.has(id)) return false;
  const c = p.c;
  const nome = String(msg.display || msg.user || id).slice(0, 25);
  // Chi scrive e basta non chiede niente: le risposte personali le riceve solo
  // chi ha scritto il comando. In una chat grande sarebbero una riga a testa.
  const dire = (t) => { if (comando) aChi(msg, say)(t); };
  if (!puoUsare(c.chi, msg)) { p.visti.add(id); dire(di(FRASI.riservata, { nome, chi: A_CHI[c.chi] || '' })); return false; }
  if (p.combattenti.length >= c.massimo) {
    p.visti.add(id);
    if (!p.detti.has('piena')) { p.detti.add('piena'); try { say(di(FRASI.piena, { massimo: c.massimo })); } catch { /* niente */ } }
    return false;
  }
  // Una estrazione a persona, non a messaggio: a messaggio entrerebbe chi
  // scrive di piu', e la probabilita' non sfoltirebbe niente.
  if (!comando && c.probabilita < 100 && !(caso() < c.probabilita / 100)) { p.visti.add(id); return false; }
  if (c.costo > 0) {
    const presa = economia.punta(channel, id, c.costo);
    if (!presa) { p.visti.add(id); dire(di(FRASI.senzaMonete, { nome, costo: c.costo, saldo: points.get(channel, id), monete: monete(channel) })); return false; }
    p.quote.set(id, { q: c.costo, ricevuta: presa.ricevuta });
    ricordaQuote(channel, p);
  }
  const testo = msg.testoScritto ?? msg.text;
  const x = {
    id, nome,
    colore: COLORE_OK.test(String(msg.tags?.color || '')) ? msg.tags.color : '',
    parole: paroleDi(testo),
    twitch: twitchInMessaggio(msg.tags?.emotes, testo),
    scelta: arenaEmote.get(channel, id),
  };
  x.emote = emoteDi(x, p.mappe, id);
  p.combattenti.push(x);
  p.dentro.set(id, x);
  manda(channel, { azione: 'entra', combattente: pubblico(x) });
  return true;
}

// Ogni messaggio passa di qui (games.js, prima dei comandi): nel modo
// «chi scrive» e' il messaggio stesso a far entrare. Non consuma niente: il
// messaggio prosegue per la sua strada.
export function suMessaggio(channel, msg, say) {
  const p = partite.get(channel);
  if (!p || p.fase !== 'iscrizioni' || p.c.ingresso !== 'scrivi') return false;
  return entra(channel, p, msg, say);
}

// Il comando d'ingresso. Nel modo «chi scrive» e' gia' entrato col messaggio.
export function combatti(channel, msg, say) {
  const p = partite.get(channel);
  if (!p || p.fase !== 'iscrizioni') {
    if (p) return false;
    const ora = orologio.ora();
    if ((silenzi.get(channel) || 0) > ora) return false;
    silenzi.set(channel, ora + SILENZIO_MS);
    aChi(msg, say)(FRASI.nessuna);
    return false;
  }
  if (p.c.ingresso !== 'comando') return false;
  return entra(channel, p, msg, say, { comando: true });
}

function chiudi(channel, p) {
  if (partite.get(channel) !== p || p.fase !== 'iscrizioni') return;
  if (p.combattenti.length < 2) { annulla(channel, p, 'pochi'); return; }
  p.fase = 'battaglia';
  p.seme = nuovoSeme();
  p.t0 = orologio.ora();
  const s = A.corri(A.nuova(p.seme, p.combattenti.map((x) => ({ id: x.id })), p.regole), Infinity);
  p.esito = A.esito(s);
  const fra = Math.ceil(p.esito.passo * 1000 / A.PASSO);
  p.timer = orologio.dopo(() => vittoria(channel, p), fra);
  try { p.say(di(FRASI.parte, { n: p.combattenti.length })); } catch { /* niente */ }
  manda(channel, { azione: 'battaglia', ora: p.t0, t0: p.t0, seme: p.seme, combattenti: p.combattenti.map(pubblico), regole: p.regole });
}

// I premi di una partita finita: al vincitore, a ogni eliminazione, alla
// corona se e' accesa. Il primo e' il vincitore, poi chi prende di piu'.
export function premiDi(esito, c) {
  const tot = new Map();
  const dai = (id, n) => { if (id != null && n > 0) tot.set(id, (tot.get(id) || 0) + n); };
  dai(esito.vincitore, c.premioVincitore);
  for (const r of esito.classifica || []) dai(r.id, r.uccisioni * c.premioEliminazione);
  if (c.corona !== 'no') dai(esito.corona, c.premioCorona);
  return [...tot].map(([id, monete]) => ({ id, monete }))
    .sort((a, b) => (b.id === esito.vincitore) - (a.id === esito.vincitore) || b.monete - a.monete);
}

function vittoria(channel, p) {
  if (partite.get(channel) !== p || p.fase !== 'battaglia') return;
  p.fase = 'vittoria';
  const e = p.esito;
  const nomeDi = (id) => p.dentro.get(id)?.nome || id;
  const premi = premiDi(e, p.c);
  for (const q of premi) economia.dai(channel, q.id, q.monete, 'giochi');
  // La quota era il prezzo della partita, giocata: non si rende piu'.
  p.quote.clear();
  ricordaQuote(channel, p);
  const vinc = e.classifica.find((r) => r.id === e.vincitore);
  const k = vinc?.uccisioni || 0;
  const coda = premi.length ? di(FRASI.premi, { elenco: elenca(premi.map((q) => `${nomeDi(q.id)} +${q.monete}`)) }) : '';
  try {
    p.say(e.aTempo ? di(FRASI.vinceATempo, { nome: nomeDi(e.vincitore), premi: coda })
      : di(FRASI.vince, { nome: nomeDi(e.vincitore), premi: coda, come: k === 0 ? FRASI.senzaEliminare : k === 1 ? FRASI.conUna : di(FRASI.conEliminazioni, { k }) }));
  } catch { /* niente */ }
  const ora = orologio.ora();
  p.fineVittoria = ora + p.c.vittoria * 1000;
  p.esitoPubblico = { vincitore: e.vincitore, aTempo: e.aTempo, corona: e.corona, passo: e.passo, classifica: e.classifica, premi,
    motto: e.aTempo ? FRASI.schermoATempo : FRASI.schermoVince };
  manda(channel, { azione: 'vittoria', ora, esito: p.esitoPubblico, fineVittoria: p.fineVittoria });
  p.timer = orologio.dopo(() => fine(channel, p), p.c.vittoria * 1000);
}

function fine(channel, p) {
  if (partite.get(channel) !== p) return;
  orologio.annulla(p.timer);
  partite.delete(channel);
  manda(channel, { azione: 'fine' });
}

function annulla(channel, p, perche) {
  orologio.annulla(p.timer);
  partite.delete(channel);
  const resi = rendiQuote(channel, p) ? FRASI.resi : '';
  const n = p.combattenti.length;
  try {
    p.say(perche === 'ferma' ? di(FRASI.fermata, { resi })
      : n === 0 ? FRASI.nessunoDentro : di(FRASI.unoSolo, { nome: p.combattenti[0].nome, resi }));
  } catch { /* niente */ }
  manda(channel, { azione: 'annullata', perche });
}

// «!arena ferma»: prima della vittoria la partita non conta e l'ingresso
// torna indietro; dopo, i premi sono gia' pagati e si toglie solo dallo schermo.
export function ferma(channel, say) {
  const p = partite.get(channel);
  if (!p) { say(FRASI.nessuna); return false; }
  if (p.fase === 'vittoria') { fine(channel, p); return true; }
  p.say = say;
  annulla(channel, p, 'ferma');
  return true;
}

// «!arena»: la apre un moderatore (lo dice il registro), con le attese del
// catalogo. «!arena ferma» la annulla.
export function comandoArena(channel, msg, args, say) {
  const sotto = String(args?.[0] || '').toLowerCase();
  if (['ferma', 'stop', 'annulla'].includes(sotto)) { ferma(channel, say); return; }
  if (partite.has(channel)) { aChi(msg, say)(FRASI.gia); return; }
  if (aspetta(channel, 'arena', msg, say)) return;
  if (apri(channel, say)) giocato(channel, 'arena', msg);
}

// «!emote Kappa»: la prima emote del messaggio diventa quella di chi scrive,
// per questa arena (se e' gia' dentro) e per le prossime. Senza emote dice
// quella ricordata.
export async function scegliEmote(channel, msg, say) {
  const id = pulito(msg?.user);
  if (!id) return;
  const ora = orologio.ora();
  const k = `${channel}|${id}`;
  if ((ultimaEmote.get(k) || 0) + EMOTE_ATTESA_MS > ora) return;
  ultimaEmote.set(k, ora);
  if (ultimaEmote.size > 20000) for (const [x, t] of ultimaEmote) if (t + EMOTE_ATTESA_MS < ora) ultimaEmote.delete(x);
  const nome = msg.display || msg.user;
  const cmd = nomeIn(channel, 'emote');
  const risposta = aChi(msg, say);
  const testo = msg.testoScritto ?? msg.text;
  const parole = paroleDi(testo).slice(1);
  if (!parole.length) {
    const mia = arenaEmote.get(channel, id);
    risposta(mia ? di(FRASI.emoteRicordata, { nome, emote: mia.nome, cmd }) : di(FRASI.emoteNessuna, { nome, cmd }));
    return;
  }
  const p = partite.get(channel);
  const gia = p?.mappe?.tutte;
  const tutte = gia && Object.keys(gia).length ? gia : await caricaEmote.tutte(channel).catch(() => ({}));
  const e = primaEmote(parole, twitchInMessaggio(msg.tags?.emotes, testo), tutte);
  if (!e) { risposta(di(FRASI.emoteNonTrovata, { nome })); return; }
  arenaEmote.scegli(channel, id, e);
  risposta(di(FRASI.emoteScelta, { nome, emote: e.nome }));
  const q = partite.get(channel);
  const x = q?.fase === 'iscrizioni' ? q.dentro.get(id) : null;
  if (x) { x.scelta = e; rivesti(channel, q, x); }
}

// ── le strade automatiche, decise qui perche' le regole stanno qui ─────

export function vieneColRaid(channel, persone) {
  const soglia = conf(channel).dopoRaid;
  return soglia > 0 && Number(persone) >= soglia;
}
// Un'arena in cui nessuno puo' entrare non si apre da sola: col comando serve
// il comando acceso, scrivendo basta che i giochi siano accesi.
export function giocabile(channel) {
  const c = conf(channel);
  if (c.ingresso === 'comando') return vivo(channel, 'combatti');
  return moduloAcceso('giochi', streamers.get(channel)?.settings || {});
}
