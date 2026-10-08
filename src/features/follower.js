// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// I TUOI FOLLOWER: la lista intera, chi sembra una macchina, e la pulizia.
// Il giudizio sta in follower-giudizio.js (puro); qui c'e' quello che si muove:
// il giro che legge la lista da Twitch, il lavoro che toglie in massa, le
// azioni una per una, e la vista che il pannello legge. Il modello per esteso:
// docs/FOLLOWER.md.
//
// TRE REGOLE CHE TENGONO IN PIEDI TUTTO IL RESTO.
//
// 1. Togliere il follow e' BLOCCARE E SBLOCCARE, mai bannare. Twitch non ha
//    un'altra strada per togliere un follower: il blocco lo toglie, lo sblocco
//    subito dopo gli lascia la porta aperta. Il ban non toglie il follow e
//    non e' una pulizia: qui non c'e', nemmeno come ripiego.
//
// 2. CHI SI TOCCA SI DECIDE DUE VOLTE. Quando lo streamer conferma (il numero
//    scritto deve essere il numero che il server conta), e di nuovo un attimo
//    prima di toccare ciascuno, coi ruoli appena riletti: chi nel frattempo si
//    e' abbonato, e' diventato VIP o e' stato segnato «a posto», resta fuori.
//
// 3. GLI USCITI SI SEGNANO SOLO A GIRO COMPLETO. Un giro a meta' non sa chi e'
//    uscito: sa solo chi non ha ancora letto. Chi non e' stato visto diventa
//    «uscito» solo se il giro e' arrivato in fondo e ha letto (quasi) quanti
//    Twitch dice che sono.
import { followerElenco as store, statoVivo } from '../db.js';
import { makeLog } from '../logger.js';
import * as G from './follower-giudizio.js';
import { inListaBot, nomePromozionale, BOT_DI_SERVIZIO, scudoDi, registra, almeno } from './antibot.js';
import { diMolti, DI_CASA } from './reputazione.js';
import { quantiLoSegnalano, CONFERME } from './rete.js';
import { precedenti } from './incidenti.js';
import { rigaCsv } from './csv.js';

const log = makeLog('follower');
const norm = (s) => String(s || '').toLowerCase().trim();

export const GIRO = 'follower-giro';
export const LAVORO = 'follower-lavoro';
export const PAUSA_PAGINE_MS = 1000;     // fra una pagina e l'altra della lista
export const PASSO_LAVORO_MS = 600;      // fra un account e l'altro del lavoro in massa
export const LAVORO_MAX = 20_000;        // quanti in un lavoro solo
export const USCITI_GIORNI = 30;         // quanto resta in lista chi non segue piu'
export const COMPLETO_SE = 0.95;         // un giro e' completo se ha letto almeno questa parte del totale
const RUOLI_OGNI_MS = 10 * 60_000;       // nel lavoro in massa, ogni quanto si rileggono i ruoli
const RICALCOLO_MIN_MS = 15_000;         // mentre la lista cambia, i conti si rifanno al piu' cosi' spesso
const VISTA_MAX_MS = 60_000;             // e comunque almeno ogni minuto
const VISTE_TENUTE = 5;
const ATTESA_SCUDO_MS = 30_000;

let helix = null;
let attesa = (ms) => new Promise((r) => setTimeout(r, ms));
let scudoAlto = (ch) => almeno(ch, 'attacco');
// Chi lavora con Twitch: il bot all'avvio, e le prove con un Twitch finto (e
// con uno scudo che dicono loro).
export function configura({ helix: h, attesa: a, scudoAlto: s } = {}) {
  if (h) helix = h;
  if (a) attesa = a;
  if (s) scudoAlto = s;
}

const vivi = new Map();                  // canale -> { giro, lavoro, fermaGiro, fermaLavoro }
const stato = (ch) => { let v = vivi.get(ch); if (!v) { v = { giro: null, lavoro: null, fermaGiro: false, fermaLavoro: false }; vivi.set(ch, v); } return v; };
const versioni = new Map();              // canale -> numero che sale a ogni scrittura grossa
const tocca = (ch) => versioni.set(ch, (versioni.get(ch) || 0) + 1);
const viste = new Map();                 // canale -> vista calcolata

// ── Chi scrive ──────────────────────────────────────────────────────────────
// Un giro, un lavoro o un'azione durano: fra una chiamata a Twitch e l'altra
// lo streamer puo' cancellare l'account. Ogni scrittura di questo modulo passa
// da uno scrittore preso quando il flusso parte, legato all'EPOCA del canale:
// `dimentica` la fa salire, e da quel momento quello che era in volo non scrive
// piu' niente, nemmeno «fermo». L'epoca non torna mai indietro, cosi' un flusso
// vecchio non si risveglia se lo stesso canale si iscrive di nuovo.
const epoche = new Map();
const epoca = (ch) => epoche.get(ch) || 0;
export const SCRITTURE = ['dallaPagina', 'nascite', 'segnaUsciti', 'ruoli', 'fiducie', 'segnaStato', 'segnaStatoMolti'];
function scrittore(ch) {
  const e = epoca(ch);
  const vivo = () => epoca(ch) === e;
  const se = (f) => (...a) => (vivo() ? f(...a) : undefined);
  const w = {
    vivo,
    giro: se((st) => statoVivo.scrivi(ch, GIRO, st)),
    lavoro: se((l) => statoVivo.scrivi(ch, LAVORO, l)),
    registra: se((voce) => registra(ch, voce)),
    tocca: se(() => tocca(ch)),
  };
  for (const k of SCRITTURE) w[k] = se((...a) => store[k](ch, ...a));
  return w;
}

// La cancellazione dell'account (cancella.js): quello che era in volo per
// questo canale tace, e la memoria del canale si svuota.
export function dimentica(channel) {
  const ch = norm(channel);
  epoche.set(ch, epoca(ch) + 1);
  vivi.delete(ch); viste.delete(ch); versioni.delete(ch);
}

// ── La vista ────────────────────────────────────────────────────────────────
// Ogni riga col suo giudizio, i conti e le ondate. Si ricalcola quando la
// lista e' cambiata (al piu' ogni quindici secondi mentre un giro la riempie)
// e comunque ogni minuto, perche' la lista pubblica e la rete cambiano da sole.
function contestoDi(ch, righe, segnali, ora = Date.now()) {
  const cfg = scudoDi(ch);
  return {
    canale: ch,
    esenti: new Set((cfg.esenti || []).map(norm)),
    extra: new Set((cfg.extra || []).map(norm).filter(Boolean)),
    servizio: BOT_DI_SERVIZIO,
    diCasa: DI_CASA,
    conferme: CONFERME,
    nomeNoto: (l) => inListaBot(l, cfg),
    nomePattern: nomePromozionale,
    rete: quantiLoSegnalano,
    precedenti: precedenti(ch, righe.map((r) => r.login)),
    segnali,
    ora,
  };
}

export function vista(channel, { ora = Date.now(), fresca = false } = {}) {
  const ch = norm(channel);
  const c = viste.get(ch);
  const v = versioni.get(ch) || 0;
  if (c && !fresca) {
    const eta = ora - c.ts;
    if (eta < VISTA_MAX_MS && (c.versione === v || eta < RICALCOLO_MIN_MS)) return c;
  }
  const righe = store.tutte(ch);
  const segnali = G.segnaliLista(righe);
  const ctx = contestoDi(ch, righe, segnali, ora);
  const tutte = righe.map((r) => ({ ...r, ...G.giudizioFollower(r, ctx) }));
  const perId = new Map(tutte.map((x, i) => [x.user_id, i]));
  const fuori = { versione: v, ts: ora, viste: tutte, perId, ctx, segnali, conti: G.contiDi(tutte), ondate: G.ondateDi(tutte, segnali) };
  viste.set(ch, fuori);
  if (viste.size > VISTE_TENUTE) viste.delete(viste.keys().next().value);
  return fuori;
}

// Una riga sola, riletta dal disco e rigiudicata adesso: e' quella che conta
// un attimo prima di toccare qualcuno. Se la vista c'e', la riga si aggiorna
// anche li', coi conti, senza ricalcolare tutta la lista.
function rigiudica(ch, userId) {
  const r = store.una(ch, userId);
  if (!r) return null;
  const c = viste.get(ch) || vista(ch);
  const x = { ...r, ...G.giudizioFollower(r, contestoDi(ch, [r], c.segnali)) };
  if (c.perId.has(userId)) {
    c.viste[c.perId.get(userId)] = x;
    c.conti = G.contiDi(c.viste);
  }
  return x;
}

// ── Il giro ─────────────────────────────────────────────────────────────────
export const statoGiro = (channel) => statoVivo.leggi(norm(channel), GIRO) || null;

// Parte, o riprende da dove si era fermato. Un giro solo per canale.
export function avviaGiro(channel, { daCapo = false } = {}) {
  const ch = norm(channel);
  if (!helix) return { ok: false, errore: 'twitch' };
  const v = stato(ch);
  if (v.giro) return { ok: true, gia: true };
  const w = scrittore(ch);
  const prima = statoGiro(ch);
  const riprendo = !daCapo && prima && prima.stato !== 'finito' && prima.cursore;
  const st = riprendo
    ? { ...prima, stato: 'in corso', motivo: '' }
    : { stato: 'in corso', motivo: '', cursore: '', letti: 0, totale: 0, avvio: Date.now(), fine: 0, completo: false, ruoli: prima?.ruoli || null, ultimoCompleto: prima?.ultimoCompleto || 0 };
  w.giro(st);
  v.fermaGiro = false;
  v.giro = giro(ch, st, w)
    .catch((e) => { log.error(`#${ch} giro dei follower:`, e?.message || e); w.giro({ ...st, stato: 'errore', motivo: 'twitch' }); })
    .finally(() => { v.giro = null; });
  return { ok: true, avviato: true, ripreso: !!riprendo };
}

export function fermaGiro(channel) {
  const v = stato(norm(channel));
  if (!v.giro) return false;
  v.fermaGiro = true;
  return true;
}

const aspettaReset = (riprova) => attesa(Math.min(60_000, Math.max(1000, (Number(riprova) || 0) - Date.now())));

async function giro(ch, st, w) {
  let riprove = 0, daCapo = false;
  for (;;) {
    if (!w.vivo()) return;
    if (stato(ch).fermaGiro) { st.stato = 'fermo'; w.giro(st); return; }
    const p = await helix.paginaFollower(ch, { dopo: st.cursore });
    if (!p.ok) {
      if (p.motivo === 'troppe') { await aspettaReset(p.riprova); continue; }
      // Un segnaposto scaduto (un giro ripreso dopo giorni): si riparte da
      // capo, una volta. Le righe gia' viste restano viste: l'avvio non cambia.
      if (p.motivo === 'cursore' && !daCapo) { daCapo = true; st.cursore = ''; st.letti = 0; continue; }
      if (p.motivo === 'twitch' && riprove < 3) { riprove++; await attesa(2000 * 2 ** riprove); continue; }
      st.stato = 'errore'; st.motivo = p.motivo === 'permesso' ? 'permesso' : 'twitch';
      w.giro(st);
      return;
    }
    riprove = 0;
    const ora = Date.now();
    w.dallaPagina(p.righe, ora);
    st.letti += p.righe.length;
    if (p.totale) st.totale = p.totale;
    const ignoti = store.senzaNascita(ch, p.righe.map((r) => r.user_id));
    if (ignoti.length) {
      const pr = await helix.profiliPerId(ignoti);
      if (pr.ok) w.nascite(ignoti, pr.utenti);
    }
    st.cursore = p.cursore || '';
    w.giro(st);
    w.tocca();
    if (!p.cursore || !p.righe.length) break;
    await attesa(PAUSA_PAGINE_MS);
  }
  const fine = Date.now();
  st.completo = !st.totale || st.letti >= Math.floor(st.totale * COMPLETO_SE);
  if (st.completo) { w.segnaUsciti(st.avvio, fine); st.ultimoCompleto = fine; }
  st.ruoli = await aggiornaRuoli(ch, w);
  aggiornaFiducia(ch, w);
  Object.assign(st, { stato: 'finito', motivo: '', cursore: '', fine });
  w.giro(st);
  w.tocca();
  viste.delete(ch);
  log.info(`#${ch}: lista dei follower letta, ${st.letti} su ${st.totale}${st.completo ? '' : ' (non completa: gli usciti non si segnano)'}`);
}

// I RUOLI: moderatori, VIP, abbonati. Ognuno si riscrive solo se si e' potuto
// leggere: «non lo so» non cancella quello che si sapeva. Torna cosa si e'
// letto, perche' il lavoro in massa parte solo se si sono letti tutti.
export async function aggiornaRuoli(channel, w = scrittore(norm(channel))) {
  const ch = norm(channel);
  const [mods, vips, subs] = await Promise.all([
    helix.getModerators(ch).catch(() => null),
    helix.getVips(ch).catch(() => null),
    helix.elencoAbbonati(ch).catch(() => null),
  ]);
  const ids = (l) => (l ? new Set(l.map((x) => String(x.user_id || x.id || ''))) : null);
  const mappa = { sub: subs, vip: ids(vips), mod: ids(mods) };
  w.ruoli(mappa);
  w.tocca();
  const letti = { mod: !!mods, vip: !!vips, sub: !!subs };
  return { ...letti, tutti: letti.mod && letti.vip && letti.sub, ts: Date.now() };
}

// La fiducia di ciascuno nel canale (chi scrive qui da tempo e' di casa).
function aggiornaFiducia(ch, w) {
  const logins = store.tutte(ch).map((r) => r.login).filter(Boolean);
  const m = new Map();
  for (let i = 0; i < logins.length; i += 2000) {
    for (const [l, f] of diMolti(ch, logins.slice(i, i + 2000))) m.set(l, Math.max(0, Number(f.sconto) || 0));
  }
  w.fiducie(m);
}

// ── Le azioni ───────────────────────────────────────────────────────────────
// Una per una, sempre da qui: il lavoro in massa e il tasto della riga fanno
// esattamente la stessa cosa.
async function esegui(ch, x, azione, w) {
  const ora = Date.now();
  if (azione === 'togli' || azione === 'blocca') {
    const b = await helix.bloccaUtente(ch, x.user_id, 'follower');
    if (!b?.ok) return b || { ok: false, motivo: 'errore Twitch' };
    if (azione === 'blocca') { w.segnaStato(x.user_id, 'bloccato', ora, { uscito: true }); return { ok: true }; }
    // Lo sblocco subito dopo: tre tentativi. Se non passa, la persona resta
    // bloccata e lo si dice, con il tasto per sbloccarla: un «tolto» scritto
    // su un blocco vero sarebbe una bugia.
    let s = null;
    for (let k = 0; k < 3; k++) {
      s = await helix.sbloccaUtente(ch, x.user_id);
      if (s?.ok) break;
      await (s?.motivo === 'troppe richieste' ? aspettaReset(s.riprova) : attesa(1000 * (k + 1)));
    }
    if (!s?.ok) { w.segnaStato(x.user_id, 'bloccato', ora, { uscito: true }); return { ok: true, bloccatoRimasto: true }; }
    w.segnaStato(x.user_id, 'tolto', ora, { uscito: true });
    return { ok: true };
  }
  if (azione === 'sblocca') {
    const s = await helix.sbloccaUtente(ch, x.user_id);
    if (!s?.ok) return s || { ok: false, motivo: 'errore Twitch' };
    w.segnaStato(x.user_id, '', ora);
    return { ok: true };
  }
  if (azione === 'apposto') { w.segnaStato(x.user_id, 'apposto', ora); return { ok: true }; }
  if (azione === 'nonapposto') { w.segnaStato(x.user_id, '', ora); return { ok: true }; }
  return { ok: false, motivo: 'azione' };
}

// Il tasto di una riga. Un protetto si tocca solo con `forza` (il pannello
// chiede prima: «e' un tuo abbonato, sei sicuro?»).
export const AZIONI_SINGOLE = [...G.AZIONI_FOLLOWER, 'nonapposto'];
export async function azione(channel, { azione: a, userId, forza = false } = {}) {
  const ch = norm(channel);
  const w = scrittore(ch);
  if (!AZIONI_SINGOLE.includes(a)) return { ok: false, errore: 'azione' };
  if (!helix && a !== 'apposto' && a !== 'nonapposto') return { ok: false, errore: 'twitch' };
  const x = rigiudica(ch, String(userId || ''));
  if (!x) return { ok: false, errore: 'sconosciuto' };
  if ((a === 'togli' || a === 'blocca') && x.livello === 'protetto' && !forza) return { ok: false, errore: 'protetto', motivi: x.motivi };
  if (a === 'togli' && x.uscito) return { ok: false, errore: 'uscito' };
  if (a === 'sblocca' && x.stato !== 'bloccato') return { ok: false, errore: 'stato' };
  const r = await esegui(ch, x, a, w);
  if (a !== 'apposto' && a !== 'nonapposto') {
    w.registra({ login: x.login, userId: x.user_id, azione: a, motivo: 'dalla lista dei follower', esito: r.ok ? 'fatto' : 'fallito', fuoriAttacco: true });
  }
  const dopo = rigiudica(ch, x.user_id);
  return { ok: !!r.ok, motivo: r.motivo || '', bloccatoRimasto: !!r.bloccatoRimasto, riga: dopo };
}

// ── Il lavoro in massa ──────────────────────────────────────────────────────
export const statoLavoro = (channel) => statoVivo.leggi(norm(channel), LAVORO) || null;
// Come si dice nel registro: quello da fare quando parte, quello fatto alla fine.
const DA_FARE = { togli: 'a cui togliere il follow', blocca: 'da bloccare', sblocca: 'da sbloccare', apposto: 'da segnare a posto' };
const FATTI = { togli: 'senza piu\' il follow', blocca: 'bloccati', sblocca: 'sbloccati', apposto: 'segnati a posto' };

// Chi toccherebbe un'azione su questo filtro (o su questi id): la stessa
// regola per il conto che vede lo streamer e per il lavoro che parte.
export function bersagli(channel, { azione: a, filtro = {}, ids = null } = {}) {
  const v = vista(channel);
  let scelti;
  if (Array.isArray(ids) && ids.length) {
    const voglio = new Set(ids.map(String));
    scelti = v.viste.filter((x) => voglio.has(x.user_id));
  } else scelti = G.filtra(v.viste, G.filtroDa(filtro));
  const tocca = scelti.filter((x) => G.azionabile(x, a));
  return { tocca, fuori: scelti.length - tocca.length, protetti: scelti.filter((x) => x.livello === 'protetto').length };
}

export async function avviaLavoro(channel, { azione: a, filtro = {}, ids = null, conferma } = {}) {
  const ch = norm(channel);
  const w = scrittore(ch);
  if (!G.AZIONI_FOLLOWER.includes(a)) return { ok: false, errore: 'azione' };
  if (stato(ch).lavoro) return { ok: false, errore: 'in-corso' };
  const { tocca: chi } = bersagli(ch, { azione: a, filtro, ids });
  const n = chi.length;
  if (!n) return { ok: false, errore: 'nessuno' };
  if (n > LAVORO_MAX) return { ok: false, errore: 'troppi', quanti: n, massimo: LAVORO_MAX };
  if (Number(conferma) !== n) return { ok: false, errore: 'conferma', quanti: n };
  // «A posto» non chiede niente a Twitch: si scrive e basta.
  if (a === 'apposto') {
    w.segnaStatoMolti(chi.map((x) => x.user_id), 'apposto', Date.now());
    w.tocca(); viste.delete(ch);
    return { ok: true, fatti: n };
  }
  if (!helix) return { ok: false, errore: 'twitch' };
  if (a !== 'sblocca') {
    const r = await aggiornaRuoli(ch, w);
    if (!r.tutti) return { ok: false, errore: 'ruoli', letti: r };
  }
  const lav = {
    id: Date.now().toString(36), azione: a, ids: chi.map((x) => x.user_id), i: 0, totale: n,
    fatti: 0, nFalliti: 0, falliti: [], saltati: 0, bloccatiRimasti: [],
    stato: 'in corso', motivo: '', attesaScudo: false, avvio: Date.now(), fine: 0,
  };
  w.lavoro(lav);
  w.registra({ login: '', azione: 'pulizia', motivo: `lista dei follower: ${n} ${DA_FARE[a]}`, esito: 'avviso', fuoriAttacco: true });
  partiLavoro(ch, lav, w);
  return { ok: true, lavoro: sintesiLavoro(lav) };
}

function partiLavoro(ch, lav, w = scrittore(ch)) {
  const v = stato(ch);
  v.fermaLavoro = false;
  v.lavoro = lavora(ch, lav, w)
    .catch((e) => { log.error(`#${ch} lavoro sui follower:`, e?.message || e); w.lavoro({ ...lav, stato: 'errore', motivo: 'twitch' }); })
    .finally(() => { v.lavoro = null; });
}

export function fermaLavoro(channel) {
  const v = stato(norm(channel));
  if (!v.lavoro) return false;
  v.fermaLavoro = true;
  return true;
}

export function riprendiLavoro(channel) {
  const ch = norm(channel);
  if (stato(ch).lavoro) return { ok: true, gia: true };
  const lav = statoLavoro(ch);
  if (!lav || lav.stato === 'finito' || lav.i >= lav.ids.length) return { ok: false, errore: 'nessuno' };
  if (!helix) return { ok: false, errore: 'twitch' };
  lav.stato = 'in corso'; lav.motivo = '';
  const w = scrittore(ch);
  w.lavoro(lav);
  partiLavoro(ch, lav, w);
  return { ok: true };
}

async function lavora(ch, lav, w) {
  let ruoliTs = Date.now();
  while (lav.i < lav.ids.length) {
    if (!w.vivo()) return;
    if (stato(ch).fermaLavoro) { lav.stato = 'fermo'; w.lavoro(lav); return; }
    // Lo scudo prima di tutto: durante un attacco il secchio delle chiamate
    // serve alla difesa, e la pulizia si mette in fila dietro.
    if (scudoAlto(ch)) {
      if (!lav.attesaScudo) { lav.attesaScudo = true; w.lavoro(lav); }
      await attesa(ATTESA_SCUDO_MS);
      continue;
    }
    if (lav.attesaScudo) { lav.attesaScudo = false; w.lavoro(lav); }
    if (lav.azione !== 'sblocca' && Date.now() - ruoliTs > RUOLI_OGNI_MS) { await aggiornaRuoli(ch, w); ruoliTs = Date.now(); }
    const id = lav.ids[lav.i];
    const x = rigiudica(ch, id);
    if (!x || !G.azionabile(x, lav.azione)) { lav.saltati++; lav.i++; continue; }
    const r = await esegui(ch, x, lav.azione, w);
    if (!r.ok && r.motivo === 'troppe richieste') { await aspettaReset(r.riprova); continue; }
    if (!r.ok && r.motivo === 'permesso mancante') {
      Object.assign(lav, { stato: 'errore', motivo: 'permesso' });
      w.lavoro(lav);
      w.registra({ login: '', azione: 'pulizia', motivo: `lista dei follower: fermata, manca il permesso (${lav.fatti} fatti)`, esito: 'fallito', fuoriAttacco: true });
      return;
    }
    // la riga cambiata si vede subito nella lista, senza ricalcolarla tutta
    rigiudica(ch, id);
    if (r.ok) lav.fatti++;
    else { lav.nFalliti++; if (lav.falliti.length < 200) lav.falliti.push({ id, login: x.login, motivo: r.motivo || '' }); }
    if (r.bloccatoRimasto && lav.bloccatiRimasti.length < 200) lav.bloccatiRimasti.push({ id, login: x.login });
    lav.i++;
    if (lav.i % 20 === 0) w.lavoro(lav);
    if (lav.i < lav.ids.length) await attesa(PASSO_LAVORO_MS);
  }
  Object.assign(lav, { stato: 'finito', fine: Date.now() });
  w.lavoro(lav);
  w.tocca();
  w.registra({
    login: '', azione: 'pulizia',
    motivo: `lista dei follower: ${lav.fatti} ${FATTI[lav.azione]}, ${lav.nFalliti} non riusciti, ${lav.saltati} lasciati stare`,
    esito: lav.nFalliti ? 'fallito' : 'fatto', fuoriAttacco: true,
  });
}

// Quello che il pannello vede di un lavoro: i numeri, non l'elenco degli id.
export const sintesiLavoro = (l) => (l ? {
  id: l.id, azione: l.azione, totale: l.totale, fatti: l.fatti, falliti: l.nFalliti, saltati: l.saltati,
  fatto: l.i, stato: l.stato, motivo: l.motivo, attesaScudo: !!l.attesaScudo, avvio: l.avvio, fine: l.fine,
  nonRiusciti: (l.falliti || []).slice(0, 50), bloccatiRimasti: (l.bloccatiRimasti || []).slice(0, 50),
} : null);

// ── Al riavvio ──────────────────────────────────────────────────────────────
// Un giro o un lavoro rimasti a meta' ripartono da dove erano. Quelli fermati
// a mano restano fermi; quelli fermati da un permesso aspettano lo streamer.
export function riprendiTutto() {
  if (!helix) return { giri: 0, lavori: 0 };
  let giri = 0, lavori = 0;
  for (const r of statoVivo.tutti(GIRO, 7 * 86_400_000)) {
    if (r.dato?.stato === 'in corso') { avviaGiro(r.channel); giri++; }
  }
  for (const r of statoVivo.tutti(LAVORO, 7 * 86_400_000)) {
    if (r.dato?.stato === 'in corso' && r.dato.i < (r.dato.ids || []).length) { partiLavoro(r.channel, r.dato); lavori++; }
  }
  if (giri || lavori) log.info(`ripresi ${giri} giri della lista follower e ${lavori} lavori`);
  return { giri, lavori };
}

// Quando arriva un follow: la riga c'e' subito, senza aspettare il prossimo giro.
export function arrivato(channel, { user_id: id, user_login: login, user_name: nome, followed_at: quando } = {}) {
  const ch = norm(channel);
  if (!ch || !id) return;
  const w = scrittore(ch);
  w.dallaPagina([{ user_id: id, user_login: login, user_name: nome, followed_at: quando }], Date.now());
  w.tocca();
}

// I conti per il pannello, in una domanda sola.
export function riepilogo(channel) {
  const ch = norm(channel);
  const v = vista(ch);
  const g = statoGiro(ch);
  return {
    giro: g ? { stato: g.stato, motivo: g.motivo, letti: g.letti, totale: g.totale, avvio: g.avvio, fine: g.fine, completo: !!g.completo, ultimoCompleto: g.ultimoCompleto || 0, ruoli: g.ruoli || null } : null,
    inCorso: { giro: !!stato(ch).giro, lavoro: !!stato(ch).lavoro },
    conti: v.conti,
    ondate: v.ondate,
    soglie: v.segnali.soglie,
    lavoro: sintesiLavoro(statoLavoro(ch)),
  };
}

// Una pagina della lista filtrata, per il pannello.
export function pagina(channel, filtro = {}, { da = 0, quanti = 100 } = {}) {
  const v = vista(channel);
  const f = G.filtroDa(filtro);
  const tutte = G.filtra(v.viste, f);
  const d = Math.max(0, Number(da) || 0);
  const q = Math.min(200, Math.max(1, Number(quanti) || 100));
  return { totale: tutte.length, righe: tutte.slice(d, d + q).map(rigaPerPannello), filtro: f };
}

// Quello che esce verso il pannello di una riga: niente di piu'.
export const rigaPerPannello = (x) => ({
  user_id: x.user_id, login: x.login, nome: x.nome, seguito: x.seguito, creato: x.creato,
  foto_base: !!x.foto_base, ruolo: x.ruolo, stato: x.stato, uscito: x.uscito, livello: x.livello,
  motivi: x.motivi, chiuso: !!x.chiuso,
});

// Il CSV della lista filtrata, coi motivi in parole.
export function csv(channel, filtro = {}, lingua = 'it') {
  const v = vista(channel);
  const tutte = G.filtra(v.viste, G.filtroDa(filtro));
  const iso = (t) => (Number(t) > 0 ? new Date(Number(t)).toISOString() : '');
  const righe = [rigaCsv(['login', 'nome', 'user_id', 'seguito', 'nato', 'livello', 'motivi', 'ruolo', 'stato', 'uscito'])];
  for (const x of tutte) {
    righe.push(rigaCsv([x.login, x.nome, x.user_id, iso(x.seguito), x.chiuso ? 'chiuso' : iso(x.creato), x.livello, x.motivi.map((m) => G.testoMotivo(m, lingua)).join('; '), x.ruolo, x.stato, iso(x.uscito)]));
  }
  return righe.join('\n') + '\n';
}

// «Controlla un nome»: il profilo vivo da Twitch (la foto e la bio si
// mostrano e non si tengono), se segue e da quando, e il giudizio.
export async function controlla(channel, nome) {
  const ch = norm(channel);
  const login = norm(nome).replace(/^@/, '');
  if (!/^[a-z0-9_]{2,30}$/.test(login)) return { ok: false, errore: 'nome' };
  if (!helix) return { ok: false, errore: 'twitch' };
  const u = await helix.getUserByLogin(login).catch(() => null);
  if (!u?.id) return { ok: true, trovato: false, login };
  const segue = await helix.seguitoDa(ch, u.id);
  const v = vista(ch);
  const inLista = v.perId.has(String(u.id)) ? v.viste[v.perId.get(String(u.id))] : null;
  const riga = {
    user_id: String(u.id), login: norm(u.login), nome: u.display_name || u.login,
    seguito: segue.ok && segue.segue ? segue.quando : (inLista?.seguito || 0),
    creato: Date.parse(u.created_at) || 0,
    foto_base: /user-default-pictures/i.test(u.profile_image_url || '') ? 1 : 0,
    bio_vuota: String(u.description || '').trim() ? 0 : 1,
    tipo: u.broadcaster_type || '', ruolo: inLista?.ruolo || '', fiducia: inLista?.fiducia || 0,
    stato: inLista?.stato || '', uscito: 0,
  };
  const g = G.giudizioFollower(riga, v.ctx);
  return {
    ok: true, trovato: true,
    profilo: { login: riga.login, nome: riga.nome, foto: String(u.profile_image_url || ''), bio: String(u.description || '').slice(0, 300), creato: riga.creato, tipo: riga.tipo },
    segue: segue.ok ? segue.segue : null, seguito: riga.seguito, inLista: !!inLista,
    livello: g.livello, motivi: g.motivi, stato: riga.stato, user_id: riga.user_id,
  };
}

export function pota(ora = Date.now()) {
  return store.pota(ora - USCITI_GIORNI * 86_400_000);
}

// Per le prove: dimentica cache e stati vivi in memoria. Le epoche no: un
// flusso rimasto in volo da una prova di prima non deve tornare a scrivere.
export function _azzera() { vivi.clear(); viste.clear(); versioni.clear(); }
