// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI ARRIVA IN CHAT, I GESTI (docs/moduli.md, «Quando arriva in chat»).
//
// La regola sta in arrivi-regola.js; qui si guarda il messaggio, si segna
// l'accoglienza e la si mette in fila. A eseguirla e' il motore dei Moduli,
// lo stesso di ogni altro modulo: un'accoglienza sa fare tutto quello che sa
// fare un modulo, e niente di diverso.
//
// L'ordine conta, ed e' fissato qui:
//  1. chi riguarda: la persona batte il gruppo (chiVince);
//  2. il segno, prima di ogni attesa: un'occasione, un'accoglienza;
//  3. la fila: una alla volta, con la pausa del canale, e mai dopo tre minuti.
// Telegram, il database e il motore arrivano da fuori (_con), cosi' l'ordine si
// prova con dei finti.
import { modules as modulesDb, arrivi as segniDb, statoVivo, streamers, presenze as presenzeDb } from '../db.js';
import * as R from './arrivi-regola.js';
import { ePersona } from './antibot.js';
import { giornoIn } from './economia-regole.js';
import { preferenzeDi } from './preferenze.js';
import { makeLog } from '../logger.js';

const log = makeLog('arrivi');
const norm = (s) => String(s || '').toLowerCase();
const dormi = (ms) => new Promise((ok) => setTimeout(ok, Math.max(0, ms)));

function _con(deps = {}) {
  return {
    moduli: deps.moduli || modulesDb,
    segni: deps.segni || segniDb,
    stato: deps.stato || statoVivo,
    ePersona: deps.ePersona || ePersona,
    ora: deps.ora || (() => Date.now()),
    dormi: deps.dormi || dormi,
    giorno: deps.giorno || ((ch, ora) => giornoIn(ora, preferenzeDi(ch).fuso)),
    pausa: deps.pausa || ((ch) => R.pausaDi(streamers.get(ch)?.settings?.arrivi?.pausa)),
    presenza: deps.presenza || ((ch, u) => presenzeDb.get(ch, u)),
    helix: deps.helix || null,
  };
}

export const moduliArrivo = (channel, deps) => _con(deps).moduli.list(norm(channel))
  .filter((m) => m.attivo && m.trigger?.tipo === 'arrivo');

// L'occasione di adesso, nei pezzi che la fanno: la diretta su Twitch (il suo
// inizio, che non cambia con un riavvio), quella su Kick (segnata all'inizio),
// il giorno nel fuso del canale.
function pezziOccasione(ch, d, twitchInizio) {
  const ora = d.ora();
  const kick = d.stato.leggi(ch, 'diretta:kick');
  return { twitchInizio: Number(twitchInizio) || 0, kickDa: kick?.live === true ? Number(kick.da) || 0 : 0, giorno: d.giorno(ch, ora), ora };
}

// ── la fila ────────────────────────────────────────────────────────────────
const file = new Map();   // canale → { fila, gira, fine }

function metti(ch, voce, d) {
  const f = file.get(ch) || { fila: [], gira: false, fine: 0 };
  const r = R.inFila(f.fila, voce, { ora: d.ora() });
  if (r.saltate) log.info(`#${ch}: ${r.saltate} accoglienze saltate, aspettavano da troppo`);
  if (!r.entrata) log.info(`#${ch}: fila delle accoglienze piena, ${voce.ctx?.user || '?'} salta`);
  f.fila = r.fila;
  file.set(ch, f);
  if (!f.gira) gira(ch, d).catch((e) => log.debug(`#${ch} fila:`, e?.message || e));
  return r.entrata;
}

async function gira(ch, d) {
  const f = file.get(ch);
  if (!f || f.gira) return;
  f.gira = true;
  try {
    while (f.fila.length) {
      const v = f.fila.shift();
      const ora = d.ora();
      // prima risponde a quello che la persona ha scritto, poi l'accoglie; e
      // fra due accoglienze, la pausa del canale. Se a quel punto sarebbero
      // passati piu' di tre minuti da quando e' arrivata, il momento e' passato.
      const da = Math.max(ora, v.ts + R.LIMITI.ritardoMs, f.fine ? f.fine + d.pausa(ch) * 1000 : 0);
      if (da - v.ts > R.LIMITI.attesaMaxMs) { log.info(`#${ch}: accoglienza di ${v.ctx?.user || '?'} saltata, aspettava da troppo`); continue; }
      if (da > ora) await d.dormi(da - ora);
      try { await v.esegui(); } catch (e) { log.debug(`#${ch} accoglienza:`, e?.message || e); }
      f.fine = d.ora();
    }
  } finally {
    f.gira = false;
  }
}

// Per le prove: la fila di un canale, e aspettare che si svuoti.
export const _fila = (ch) => file.get(norm(ch))?.fila || [];
export async function _finita(ch) {
  for (let i = 0; i < 500 && (file.get(norm(ch))?.gira || _fila(ch).length); i++) await new Promise((ok) => setImmediate(ok));
}
export const _azzera = () => file.clear();

// ── un messaggio ───────────────────────────────────────────────────────────
//
// Torna { riguarda, accolte }: `riguarda` dice se questa persona ha
// un'accoglienza che la riguarda (scattata adesso o gia' fatta in questa
// occasione), ed e' quello che fa tacere il saluto generico (presenze).
// `arrivo` e' quello che presenze.segnaArrivo ha letto PRIMA di questo
// messaggio: da li' viene da quanto mancava.
export function suMessaggio(msg, { engine, say, arrivo = null, twitchInizio = 0 } = {}, deps) {
  const fuori = { riguarda: false, accolte: 0 };
  if (!msg || msg.isSelf || msg.from_bot || !engine) return fuori;
  const d = _con(deps);
  const ch = norm(msg.channel), u = norm(msg.user);
  if (!ch || !u || u === ch || u.startsWith('[')) return fuori;
  let lista = moduliArrivo(ch, deps);
  if (!lista.length) return fuori;
  const chi = R.chiDi(msg);
  const gruppi = R.gruppiDi(msg);
  // un bot noto si accoglie solo se e' stato scelto per nome
  if (!d.ePersona(ch, u)) lista = lista.filter((m) => R.livello(m.condizioni?.chi || null, chi, gruppi) === 2);
  const { livello, moduli } = R.chiVince(lista, chi, gruppi);
  if (livello < 0) return fuori;
  if (livello === 2) appunta(ch, moduli, chi, msg, d);

  const pezzi = pezziOccasione(ch, d, twitchInizio);
  const prima = Math.max(Number(arrivo?.r?.ultimo_msg) || 0, Number(arrivo?.r?.ultima_ts) || 0);
  let accolte = 0;
  for (const m of moduli) {
    if (!R.eAssente(m.trigger, prima, pezzi.ora)) continue;
    const volte = d.segni.segna(ch, m.id, R.chiaveDi(chi), R.occasione(m.trigger.quando, pezzi), pezzi.ora);
    if (!volte) continue;
    const vars = { assenza: prima > 0 ? String(R.assenteDa(prima, pezzi.ora)) : '', volte: String(volte) };
    const ctx = engine.ctxArrivo(msg, vars);
    if (metti(ch, { ts: pezzi.ora, ctx, esegui: () => engine.esegui(m, ctx, say) }, d)) accolte++;
  }
  return { riguarda: true, accolte };
}

// La persona scelta per nome, vista adesso: se nel modulo manca il suo id lo
// si appunta, e se ha cambiato nome il nome si aggiorna. Da li' in poi la si
// riconosce per id.
function appunta(ch, moduli, chi, msg, d) {
  if (!chi.id) return;
  for (const m of moduli) {
    for (const q of m.condizioni?.chi?.persone || []) {
      if (!R.stessa(q, chi)) continue;
      if (q.id === chi.id && q.login === chi.login) continue;
      try { d.moduli.appuntaPersona(ch, m.id, q, { p: chi.p, id: chi.id, login: chi.login, nome: msg.display || '' }); } catch (e) { log.debug(`#${ch} appunta:`, e?.message || e); }
    }
  }
}

// ── chi entra senza scrivere ───────────────────────────────────────────────
//
// Solo Twitch (e' l'unico che dice chi c'e'), solo nel giro da cinque minuti,
// e solo per le persone scelte per nome con «anche se non scrive»: un gruppo
// intero salutato mentre guarda in silenzio sarebbe troppo. Per non accogliere
// due volte la stessa persona (in silenzio e poi al primo messaggio) la chiave
// e' sempre l'id: se manca, lo si chiede a Twitch e lo si appunta.
export async function suGiro(channel, chatters, { engine, say, twitchInizio = 0 } = {}, deps) {
  const d = _con(deps);
  const ch = norm(channel);
  if (!ch || !engine) return 0;
  const presenti = new Set((chatters || []).map(norm));
  const lista = moduliArrivo(ch, deps).filter((m) => m.trigger?.zitti === true && m.condizioni?.chi?.modo !== 'tranne');
  if (!lista.length || !presenti.size) return 0;
  const pezzi = pezziOccasione(ch, d, twitchInizio);
  let accolte = 0;
  for (const m of lista) {
    for (const q of m.condizioni?.chi?.persone || []) {
      if (q.p !== 'twitch' || !q.login || !presenti.has(q.login) || q.login === ch) continue;
      let id = q.id;
      if (!id && d.helix?.getUsersByLogin) {
        const u = (await d.helix.getUsersByLogin([q.login]).catch(() => []))?.[0];
        id = String(u?.id || '');
        if (id) try { d.moduli.appuntaPersona(ch, m.id, q, { p: 'twitch', id, login: q.login, nome: u?.display_name || q.nome }); } catch { /* al prossimo giro */ }
      }
      if (!id) continue;
      // Una regola per nome e' sempre del livello piu' alto: qui non c'e' un
      // gruppo che possa batterla. Le altre sue regole senza «anche se non
      // scrive» aspettano che scriva, ognuna col suo segno.
      const chi = { p: 'twitch', id, login: q.login };
      const r = d.presenza(ch, q.login);
      const prima = Math.max(Number(r?.ultimo_msg) || 0, Number(r?.ultima_ts) || 0);
      if (!R.eAssente(m.trigger, prima, pezzi.ora)) continue;
      const volte = d.segni.segna(ch, m.id, R.chiaveDi(chi), R.occasione(m.trigger.quando, pezzi), pezzi.ora);
      if (!volte) continue;
      const vars = { assenza: prima > 0 ? String(R.assenteDa(prima, pezzi.ora)) : '', volte: String(volte) };
      const ctx = engine.ctxPersona(ch, { ...q, id }, vars);
      if (metti(ch, { ts: pezzi.ora, ctx, esegui: () => engine.esegui(m, ctx, say) }, d)) accolte++;
    }
  }
  return accolte;
}
