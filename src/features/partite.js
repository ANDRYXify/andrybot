// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PARTITE CON LA CHAT.
//
// Lo streamer gioca CON la chat: una custom di Fortnite, Among Us, un quiz.
// Chi vuole giocare si mette in fila (!gioco); a ogni manche lo streamer
// sceglie chi gioca (in fila, a caso o per nome); finita la manche dice
// com'e' andata (!vince @primo @secondo …) e le monete arrivano da sole,
// secondo lo schema scelto. Una partita e' una serata di manche.
//
// Chi comanda: sempre lo streamer. I moderatori solo se lui lo accende
// (`regole.staff`), in chat e dal pannello (i moderatori delegati).
//
// GLI INVARIANTI, che le funzioni qui sotto tengono da sole:
//  - una persona e' al massimo una volta in fila, e chi gioca la manche aperta
//    non e' in fila: esce quando e' scelto, e con la rotazione torna in fondo
//    quando la manche si chiude;
//  - una manche aperta alla volta: scegliere di nuovo prima dell'esito e'
//    un errore detto, non una sovrascrittura;
//  - le monete di una manche restano scritte nella manche: annullare l'esito
//    toglie esattamente quelle, una volta sola, e la manche torna aperta;
//  - il costo d'ingresso si paga entrando (una posta: tutto o niente) e torna
//    coi suoi lotti a chi esce senza aver giocato e a chi e' ancora in fila
//    quando la partita finisce. Chi e' stato scelto l'ha speso;
//  - le monete si muovono solo da economia.js (dai «giochi», punta, rendi,
//    togli): nessun lotto si tocca da qui.
//
// La partita aperta sta in statoVivo ('partita'), come il giveaway: un riavvio
// a meta' serata non si porta via la fila ne' i conti.
import { streamers, statoVivo } from '../db.js';
import { makeLog } from '../logger.js';
import * as economia from './economia.js';
import { nomeMoneta } from './moneta.js';
import { aChi } from './risposte.js';
import { nomeIn } from './comandi-registro.js';
const log = makeLog('partite');

const CHIAVE = 'partita';
const SCADE_MS = 2 * 24 * 60 * 60 * 1000;   // una partita dimenticata non resta aperta per sempre
export const LIMITI = Object.freeze({ costoMax: 100000, maxFila: 500, puntiMax: 100000, posti: 20, nomeMax: 60, nickMax: 40, scegliMax: 100 });
export const PARTITA_DEFAULT = Object.freeze({
  costo: 0,              // monete per entrare in fila (0 = gratis)
  nick: false,           // chiede il nome nel gioco: !gioco NomeNelGioco
  max: 0,                // posti in fila (0 = senza limite)
  soloSub: false,        // in fila solo chi e' abbonato (e lo staff)
  staff: false,          // i moderatori possono comandare la partita
  punti: [100, 50, 25],  // monete per posto: primo, secondo, terzo…
  partecipazione: 0,     // monete a chiunque giochi una manche
  rotazione: true,       // chi ha giocato torna in fondo alla fila
});

const norm = (x) => String(x || '').toLowerCase().trim();
const persona = (x) => norm(x).replace(/^@/, '');
const intero = (v, d, min, max) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };

export function normRegole(r = {}) {
  const b = r && typeof r === 'object' ? r : {};
  const punti = (Array.isArray(b.punti) ? b.punti : PARTITA_DEFAULT.punti)
    .slice(0, LIMITI.posti).map((p) => intero(p, 0, 0, LIMITI.puntiMax));
  return {
    costo: intero(b.costo, 0, 0, LIMITI.costoMax),
    nick: b.nick === true,
    max: intero(b.max, 0, 0, LIMITI.maxFila),
    soloSub: b.soloSub === true,
    staff: b.staff === true,
    punti,
    partecipazione: intero(b.partecipazione, 0, 0, LIMITI.puntiMax),
    rotazione: b.rotazione !== false,
  };
}

// Le regole di partenza: le ultime che lo streamer ha usato, cosi' la partita
// di stasera si apre come quella di ieri.
export const regoleDi = (channel) => normRegole(streamers.get(norm(channel))?.settings?.partite || PARTITA_DEFAULT);
const abilitato = (channel) => streamers.get(norm(channel))?.settings?.giochi !== false;

// ── lo stato, copia di lavoro di quello che sta nel database ──────────────
const attive = new Map();
let _idratato = false;
function idrata() {
  if (_idratato) return;
  _idratato = true;
  try {
    for (const r of statoVivo.tutti(CHIAVE, SCADE_MS)) {
      const d = r.dato || {};
      attive.set(r.channel, {
        nome: String(d.nome || ''), aperta: d.aperta !== false, creata: Number(d.creata) || r.ts,
        regole: normRegole(d.regole), fila: Array.isArray(d.fila) ? d.fila : [], manche: Array.isArray(d.manche) ? d.manche : [],
      });
    }
  } catch (e) { log.debug('riapertura:', e?.message || e); }
}
function viva(channel) { idrata(); return attive.get(norm(channel)) || null; }
function salva(channel) {
  const ch = norm(channel);
  const p = attive.get(ch);
  try {
    if (p) statoVivo.scrivi(ch, CHIAVE, p);
    else statoVivo.togli(ch, CHIAVE);
  } catch (e) { log.warn(`#${ch} partita non salvata:`, e?.message || e); }
}
// Solo per le prove: il processo che riparte da capo e rilegge il database.
export function _dimentica() { attive.clear(); _idratato = false; }

const mancheAperta = (p) => { const m = p.manche[p.manche.length - 1]; return m && !m.esito ? m : null; };

// ── la vista ────────────────────────────────────────────────────────────────
export function classifica(channel) {
  const p = viva(channel);
  if (!p) return [];
  const tot = new Map();
  for (const m of p.manche) {
    for (const g of m.giocatori) { const t = tot.get(g.user) || { user: g.user, display: g.display, monete: 0, vittorie: 0, manche: 0 }; t.manche++; tot.set(g.user, t); }
    for (const d of m.dati || []) { const t = tot.get(d.user); if (t) t.monete += d.monete; }
    if (m.esito?.[0]) { const t = tot.get(m.esito[0]); if (t) t.vittorie++; }
  }
  return [...tot.values()].sort((a, b) => b.monete - a.monete || b.vittorie - a.vittorie || a.user.localeCompare(b.user));
}

export function stato(channel) {
  const p = viva(channel);
  if (!p) return { aperta: false, attiva: false, regole: regoleDi(channel) };
  const m = mancheAperta(p);
  return {
    attiva: true, aperta: p.aperta, nome: p.nome, creata: p.creata, regole: { ...p.regole },
    fila: p.fila.map((x, i) => ({ posto: i + 1, user: x.user, display: x.display, nick: x.nick || '', pagato: !!x.ricevuta })),
    manche: p.manche.length,
    inGioco: m ? { n: m.n, giocatori: m.giocatori.map((g) => ({ user: g.user, display: g.display, nick: g.nick || '' })) } : null,
    ultima: p.manche.length && p.manche[p.manche.length - 1].esito ? p.manche[p.manche.length - 1] : null,
    classifica: classifica(channel),
  };
}

// ── le mosse ────────────────────────────────────────────────────────────────
export function apri(channel, { nome = '', regole = null } = {}) {
  const ch = norm(channel);
  if (!abilitato(ch)) return { ok: false, errore: 'giochi-spenti' };
  if (viva(ch)) return { ok: false, errore: 'gia-aperta' };
  const r = normRegole(regole || regoleDi(ch));
  // le regole usate diventano quelle di partenza della prossima volta
  const s = streamers.get(ch);
  if (s) streamers.setSettings(ch, { ...(s.settings || {}), partite: r });
  attive.set(ch, { nome: String(nome || '').trim().slice(0, LIMITI.nomeMax), aperta: true, creata: Date.now(), regole: r, fila: [], manche: [] });
  salva(ch);
  return { ok: true, nome: attive.get(ch).nome, regole: r };
}

export function iscrizioni(channel, aperte) {
  const p = viva(channel);
  if (!p) return { ok: false, errore: 'nessuna' };
  p.aperta = !!aperte;
  salva(channel);
  return { ok: true, aperta: p.aperta };
}

// Entra in fila. `chi` = { user, display, nick, isSub, isMod, isBroadcaster }.
export function entra(channel, chi = {}) {
  const ch = norm(channel);
  const p = viva(ch);
  const u = persona(chi.user);
  if (!p) return { ok: false, errore: 'nessuna' };
  if (!u) return { ok: false, errore: 'chi' };
  const gia = p.fila.findIndex((x) => x.user === u);
  if (gia >= 0) return { ok: false, errore: 'gia-dentro', posto: gia + 1 };
  if (mancheAperta(p)?.giocatori.some((g) => g.user === u)) return { ok: false, errore: 'sta-giocando' };
  if (!p.aperta) return { ok: false, errore: 'chiusa' };
  if (p.regole.soloSub && !(chi.isSub || chi.isMod || chi.isBroadcaster)) return { ok: false, errore: 'solo-sub' };
  if (p.regole.max && p.fila.length >= p.regole.max) return { ok: false, errore: 'piena', max: p.regole.max };
  const nick = String(chi.nick || '').trim().slice(0, LIMITI.nickMax);
  if (p.regole.nick && !nick) return { ok: false, errore: 'nick' };
  let ricevuta = null;
  if (p.regole.costo > 0) {
    const r = economia.punta(ch, u, p.regole.costo);
    if (!r) return { ok: false, errore: 'monete', costo: p.regole.costo };
    ricevuta = r.ricevuta;
  }
  p.fila.push({ user: u, display: String(chi.display || u).slice(0, 40), nick, ts: Date.now(), ricevuta });
  salva(ch);
  return { ok: true, posto: p.fila.length, pagato: p.regole.costo > 0 ? p.regole.costo : 0 };
}

// Esce dalla fila (da se', o tolto dallo staff): chi aveva pagato e non ha
// giocato si riprende le sue monete.
export function esci(channel, user) {
  const ch = norm(channel);
  const p = viva(ch);
  const u = persona(user);
  if (!p) return { ok: false, errore: 'nessuna' };
  const i = p.fila.findIndex((x) => x.user === u);
  if (i < 0) return { ok: false, errore: mancheAperta(p)?.giocatori.some((g) => g.user === u) ? 'sta-giocando' : 'non-in-fila' };
  const [x] = p.fila.splice(i, 1);
  const reso = rendi(ch, x);
  salva(ch);
  return { ok: true, reso };
}

function rendi(ch, x) {
  if (!x?.ricevuta) return 0;
  try { economia.rendi(ch, x.user, x.ricevuta); } catch (e) { log.warn(`#${ch} rimborso a ${x.user}:`, e?.message || e); return 0; }
  return (x.ricevuta || []).reduce((a, l) => a + (Number(l?.quanti) || 0), 0);
}

// Sceglie chi gioca la prossima manche: { quanti, modo: 'fila'|'caso' } o
// { chi: [nomi] } (per nome, solo fra chi e' in fila).
export function scegli(channel, { quanti = 0, modo = 'fila', chi = null } = {}, caso = Math.random) {
  const ch = norm(channel);
  const p = viva(ch);
  if (!p) return { ok: false, errore: 'nessuna' };
  if (mancheAperta(p)) return { ok: false, errore: 'manche-aperta', n: mancheAperta(p).n };
  if (!p.fila.length) return { ok: false, errore: 'fila-vuota' };
  let presi;
  if (Array.isArray(chi) && chi.length) {
    const voluti = [...new Set(chi.map(persona).filter(Boolean))];
    const fuori = voluti.filter((u) => !p.fila.some((x) => x.user === u));
    if (fuori.length) return { ok: false, errore: 'non-in-fila', chi: fuori };
    presi = voluti.map((u) => p.fila.find((x) => x.user === u));
  } else {
    const n = intero(quanti, 1, 1, LIMITI.scegliMax);
    if (modo === 'caso') {
      const mazzo = [...p.fila];
      for (let i = mazzo.length - 1; i > 0; i--) { const j = Math.floor(caso() * (i + 1)); [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]]; }
      presi = mazzo.slice(0, n);
    } else presi = p.fila.slice(0, n);
  }
  const scelti = new Set(presi.map((x) => x.user));
  p.fila = p.fila.filter((x) => !scelti.has(x.user));
  // il costo l'hanno speso giocando: la ricevuta non serve piu'
  const giocatori = presi.map((x) => ({ user: x.user, display: x.display, nick: x.nick || '' }));
  p.manche.push({ n: p.manche.length + 1, giocatori, esito: null, dati: [], scelta: Date.now() });
  salva(ch);
  return { ok: true, n: p.manche.length, giocatori };
}

// L'esito della manche aperta: `ordine` e' chi e' arrivato primo, secondo…
// (anche vuoto: nessun piazzamento, solo la partecipazione). Le monete
// arrivano adesso e restano scritte nella manche.
export function esito(channel, ordine = []) {
  const ch = norm(channel);
  const p = viva(ch);
  if (!p) return { ok: false, errore: 'nessuna' };
  const m = mancheAperta(p);
  if (!m) return { ok: false, errore: 'nessuna-manche' };
  const posti = [...new Set((ordine || []).map(persona).filter(Boolean))];
  const fuori = posti.filter((u) => !m.giocatori.some((g) => g.user === u));
  if (fuori.length) return { ok: false, errore: 'non-giocava', chi: fuori };
  const dati = [];
  for (const g of m.giocatori) {
    const i = posti.indexOf(g.user);
    const n = (i >= 0 ? (p.regole.punti[i] || 0) : 0) + p.regole.partecipazione;
    if (n > 0) { economia.dai(ch, g.user, n, 'giochi'); dati.push({ user: g.user, monete: n }); }
  }
  m.esito = posti;
  m.dati = dati;
  m.chiusa = Date.now();
  // con la rotazione chi ha giocato torna in fondo, senza pagare di nuovo
  if (p.regole.rotazione) {
    for (const g of m.giocatori) if (!p.fila.some((x) => x.user === g.user)) p.fila.push({ user: g.user, display: g.display, nick: g.nick || '', ts: Date.now(), ricevuta: null });
  }
  salva(ch);
  return { ok: true, n: m.n, dati, esito: posti };
}

// Torna indietro di un passo. Se l'ultima manche ha l'esito, le sue monete si
// tolgono (esattamente quelle) e la manche torna aperta, per dare l'esito
// giusto. Se non ce l'ha, la scelta si annulla e i giocatori tornano in testa
// alla fila, nell'ordine in cui erano.
export function annulla(channel) {
  const ch = norm(channel);
  const p = viva(ch);
  if (!p) return { ok: false, errore: 'nessuna' };
  const m = p.manche[p.manche.length - 1];
  if (!m) return { ok: false, errore: 'nessuna-manche' };
  if (m.esito) {
    const tolte = [];
    for (const d of m.dati || []) {
      const r = economia.togli(ch, d.user, d.monete);
      tolte.push({ user: d.user, monete: Number(r?.tolte) || 0 });
    }
    if (p.regole.rotazione) {
      const giocato = new Set(m.giocatori.map((g) => g.user));
      p.fila = p.fila.filter((x) => !(giocato.has(x.user) && !x.ricevuta && x.ts >= (m.chiusa || 0)));
    }
    m.esito = null; m.dati = []; delete m.chiusa;
    salva(ch);
    return { ok: true, cosa: 'esito', n: m.n, tolte };
  }
  p.manche.pop();
  const gia = new Set(p.fila.map((x) => x.user));
  p.fila = [...m.giocatori.filter((g) => !gia.has(g.user)).map((g) => ({ user: g.user, display: g.display, nick: g.nick || '', ts: Date.now(), ricevuta: null })), ...p.fila];
  salva(ch);
  return { ok: true, cosa: 'scelta', n: m.n };
}

// Fine della serata: chi e' ancora in fila e aveva pagato si riprende le
// monete; resta la classifica, che si dice e si restituisce.
export function fine(channel) {
  const ch = norm(channel);
  const p = viva(ch);
  if (!p) return { ok: false, errore: 'nessuna' };
  const top = classifica(ch);
  let resi = 0;
  for (const x of p.fila) if (rendi(ch, x) > 0) resi++;
  attive.delete(ch);
  salva(ch);
  return { ok: true, nome: p.nome, manche: p.manche.filter((m) => m.esito).length, classifica: top, resi };
}

// Le regole di una partita aperta si cambiano (non il costo: chi ha gia'
// pagato ha pagato quello).
export function cambiaRegole(channel, regole = {}) {
  const ch = norm(channel);
  const p = viva(ch);
  if (!p) return { ok: false, errore: 'nessuna' };
  const r = normRegole({ ...p.regole, ...regole, costo: p.regole.costo });
  p.regole = r;
  const s = streamers.get(ch);
  if (s) streamers.setSettings(ch, { ...(s.settings || {}), partite: r });
  salva(ch);
  return { ok: true, regole: r };
}

// ── la chat ─────────────────────────────────────────────────────────────────
// Chi comanda: lo streamer sempre, i moderatori se le regole lo dicono.
export function puoComandare(channel, chi = {}) {
  if (chi.isBroadcaster) return true;
  if (!chi.isMod) return false;
  const p = viva(channel);
  return (p ? p.regole : regoleDi(channel)).staff === true;
}

const posizione = (n) => `${n}°`;
const elencoNomi = (xs) => xs.map((g) => (g.nick ? `${g.display} (${g.nick})` : g.display)).join(', ');

// QUELLO CHE SI DICE IN CHAT, in un posto solo: lo dicono i comandi e il
// pannello, con le stesse parole e i nomi dei comandi come li ha scelti lo
// streamer.
export const FRASI = {
  apertura(channel, r) {
    const n = (id) => nomeIn(channel, id);
    const g = r.regole;
    const extra = [g.costo ? `costa ${g.costo} ${nomeMoneta(channel)}` : '', g.soloSub ? 'solo abbonati' : '', g.max ? `${g.max} posti` : ''].filter(Boolean).join(', ');
    return `🎮 Si gioca${r.nome ? ` a ${r.nome}` : ''} con la chat! Entra in fila con !${n('gioco')}${g.nick ? ' TuoNomeNelGioco' : ''}${extra ? ` (${extra})` : ''}. Esci con !${n('esco')}, la fila con !${n('lista')}.`;
  },
  iscrizioni(channel, aperta) {
    const p = viva(channel);
    return aperta ? `🎮 Fila aperta: entra con !${nomeIn(channel, 'gioco')}${p?.regole.nick ? ' TuoNome' : ''}.` : '🎮 Fila chiusa: si gioca con chi c\'è.';
  },
  scelta: (channel, r) => `🎮 Manche ${r.n}: tocca a ${elencoNomi(r.giocatori)}!`,
  esito(channel, r) {
    const premi = r.dati.filter((d) => r.esito.includes(d.user)).map((d) => `${d.user} +${d.monete}`).join(' · ');
    return `🏆 Manche ${r.n}: ${r.esito.length ? r.esito.map((u, i) => `${i + 1}° ${u}`).join(', ') : 'nessun piazzamento'}.${premi ? ` ${premi} ${nomeMoneta(channel)}.` : ''}`;
  },
  annullo: (channel, r) => (r.cosa === 'esito'
    ? `↩️ Esito della manche ${r.n} annullato: le monete sono tornate indietro. Ridai l'esito con !${nomeIn(channel, 'vince')}.`
    : `↩️ Scelta della manche ${r.n} annullata: i giocatori sono tornati in testa alla fila.`),
  fine(channel, r) {
    const podio = r.classifica.slice(0, 3).map((t, i) => `${i + 1}° ${t.display} ${t.monete}`).join(' · ');
    return `🏁 Partita finita${r.nome ? ` (${r.nome})` : ''}: ${r.manche} manche.${podio ? ` Classifica: ${podio} ${nomeMoneta(channel)}.` : ''} Grazie a tutti!`;
  },
};

export function tryPartita(msg, say) {
  try {
    if (!msg) return false;
    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const channel = norm(msg.channel);
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    if (!['gioco', 'esco', 'lista', 'partita', 'scegli', 'vince'].includes(cmd)) return false;
    const rispondi = aChi(msg, say);
    const p = viva(channel);
    const n = (id) => nomeIn(channel, id);
    const moneta = () => nomeMoneta(channel);

    if (cmd === 'gioco') {
      if (!p) return true;
      const r = entra(channel, { user: msg.user, display: msg.display || msg.user, nick: parti.join(' '), isSub: msg.isSub, isMod: msg.isMod, isBroadcaster: msg.isBroadcaster });
      if (r.ok) return true;   // niente conferma a testa: in una chat piena sarebbe un muro. La fila si legge con !lista
      const perche = {
        'gia-dentro': `sei già in fila, ${posizione(r.posto)}.`,
        'sta-giocando': 'stai già giocando questa manche.',
        chiusa: 'la fila è chiusa per ora.',
        'solo-sub': 'la fila è solo per chi è abbonato.',
        piena: `la fila è piena (${r.max} posti).`,
        nick: `scrivi anche il tuo nome nel gioco: !${n('gioco')} TuoNome`,
        monete: `per entrare servono ${r.costo} ${moneta()}.`,
      }[r.errore];
      if (perche) rispondi(`🎮 ${perche}`);
      return true;
    }
    if (cmd === 'esco') {
      if (!p) return true;
      const r = esci(channel, msg.user);
      if (r.ok) rispondi(`🎮 sei uscito dalla fila${r.reso ? `, ti ho reso ${r.reso} ${moneta()}` : ''}.`);
      else if (r.errore === 'sta-giocando') rispondi('🎮 stai giocando questa manche: esci alla fine.');
      return true;
    }
    if (cmd === 'lista') {
      if (!p) { rispondi('🎮 Nessuna partita aperta adesso.'); return true; }
      const i = p.fila.findIndex((x) => x.user === persona(msg.user));
      const quanti = p.fila.length;
      const mio = i >= 0 ? `sei ${posizione(i + 1)} su ${quanti}` : `${quanti} in fila${p.aperta ? `: entra con !${n('gioco')}${p.regole.nick ? ' TuoNome' : ''}` : ' (fila chiusa)'}`;
      const m = mancheAperta(p);
      rispondi(`🎮 ${p.nome ? p.nome + ': ' : ''}${mio}.${m ? ` In gioco ora: ${elencoNomi(m.giocatori)}.` : ''}`);
      return true;
    }

    // da qui comandi dello staff
    if (!puoComandare(channel, msg)) {
      if (cmd === 'partita' && p) rispondi(`🎮 ${p.nome || 'Partita'} aperta: ${p.fila.length} in fila. ${p.aperta ? `Entra con !${n('gioco')}.` : 'La fila è chiusa.'}`);
      else if (msg.isMod && !msg.isBroadcaster) rispondi('🎮 La partita la comanda lo streamer: può dare il permesso ai moderatori dal pannello.');
      return true;
    }

    if (cmd === 'partita') {
      const sotto = (parti[0] || '').toLowerCase();
      if (sotto === 'fine') {
        const r = fine(channel);
        if (!r.ok) { rispondi('🎮 Nessuna partita aperta.'); return true; }
        say(FRASI.fine(channel, r));
        return true;
      }
      if (sotto === 'chiudi' || sotto === 'apri') {
        if (!p) { rispondi('🎮 Nessuna partita aperta.'); return true; }
        iscrizioni(channel, sotto === 'apri');
        say(FRASI.iscrizioni(channel, sotto === 'apri'));
        return true;
      }
      if (sotto === 'annulla') {
        const r = annulla(channel);
        if (!r.ok) { rispondi('🎮 Non c\'è niente da annullare.'); return true; }
        say(FRASI.annullo(channel, r));
        return true;
      }
      if (p) { rispondi(`🎮 C'è già una partita aperta${p.nome ? ` (${p.nome})` : ''}: !${n('partita')} fine per chiuderla.`); return true; }
      const r = apri(channel, { nome: parti.join(' ') });
      if (!r.ok) return true;
      say(FRASI.apertura(channel, r));
      return true;
    }
    if (!p) { rispondi(`🎮 Nessuna partita aperta: aprila con !${n('partita')} nome del gioco.`); return true; }

    if (cmd === 'scegli') {
      const nomi = parti.filter((w) => w.startsWith('@'));
      const caso = (parti[0] || '').toLowerCase() === 'caso';
      const quanti = parseInt(caso ? parti[1] : parti[0], 10) || 1;
      const r = nomi.length ? scegli(channel, { chi: nomi }) : scegli(channel, { quanti, modo: caso ? 'caso' : 'fila' });
      if (!r.ok) {
        const perche = {
          'manche-aperta': `la manche ${r.n} è ancora aperta: dai l'esito con !${n('vince')} o annullala con !${n('partita')} annulla.`,
          'fila-vuota': 'la fila è vuota.',
          'non-in-fila': `non sono in fila: ${(r.chi || []).join(', ')}.`,
        }[r.errore];
        if (perche) rispondi(`🎮 ${perche}`);
        return true;
      }
      say(FRASI.scelta(channel, r));
      return true;
    }
    if (cmd === 'vince') {
      const nessuno = (parti[0] || '').toLowerCase() === 'nessuno';
      const r = esito(channel, nessuno ? [] : parti.filter((w) => w.startsWith('@') || /^\w+$/.test(w)));
      if (!r.ok) {
        const perche = {
          'nessuna-manche': `nessuna manche in corso: scegli chi gioca con !${n('scegli')}.`,
          'non-giocava': `non giocavano questa manche: ${(r.chi || []).join(', ')}.`,
        }[r.errore];
        if (perche) rispondi(`🎮 ${perche}`);
        return true;
      }
      say(FRASI.esito(channel, r));
      return true;
    }
    return false;
  } catch (e) {
    log.error('tryPartita:', e?.message || e);
    return false;
  }
}
