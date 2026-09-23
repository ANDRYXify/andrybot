// IL BLACKJACK CONTRO IL BANCO.
//
// `!bj 50` da' due carte a te e due al banco (una coperta). Poi `!carta` o
// `!stai`; il banco sta su ogni 17. Il blackjack servito paga `vincitaBJ` ogni
// 100 (di serie 3 a 2), la vittoria il doppio, il pari rende la puntata.
//
// Quattro regole.
//
//  · IL MAZZO E' QUELLO DELLA RESA. Ogni carta esce con la probabilita' del
//    mazzo vero, pescata da capo ogni volta (mazzo infinito): e' lo stesso
//    modello su cui giochi-conf.js calcola la resa, quindi il numero del
//    pannello e' quello di questo tavolo, non una stima.
//  · IL BANCO GUARDA SUBITO. Se ha blackjack lo dice alla prima mano, e chi non
//    ce l'ha perde senza giocare: e' la regola su cui e' calcolata la resa.
//  · LA PUNTATA ESCE SUBITO. Qui, a differenza del colpo e del duello, non puo'
//    aspettare la fine: chi vede di perdere potrebbe regalare le monete a
//    qualcuno e annullare la mano. Ma per non far perdere niente a un riavvio,
//    ogni mano aperta sta nel database (`bj-mani`), e all'avvio le puntate
//    delle mani rimaste aperte tornano a chi le aveva messe.
//  · CHI NON DECIDE STA. Dopo `tempo` secondi senza una mossa, la mano si
//    chiude come se avesse scritto !stai.
//
// Il ragionamento sta in docs/GIOCHI.md.
import { points, streamers, statoVivo } from '../db.js';
import { valoriDi } from './giochi-conf.js';
import { nomeIn } from './comandi-registro.js';

const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'blackjack');
const CHIAVE = 'bj-mani';
const SEMI = ['♠', '♥', '♦', '♣'];
const NOMI = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let caso = Math.random;
export function impostaCaso(f) { caso = typeof f === 'function' ? f : Math.random; }

const mani = new Map();   // canale|chi → { nome, posta, io: [carte], banco: [carte], timer, say }

// Una carta: il grado da 1 a 13 con la stessa probabilita' (13 gradi, quattro
// valgono 10), il seme solo per vederla.
function pesca() {
  const grado = 1 + Math.floor(caso() * 13);
  return { grado, valore: Math.min(grado, 10), seme: SEMI[Math.floor(caso() * 4)] };
}

export function punti(carte) {
  const tot = carte.reduce((s, c) => s + c.valore, 0);
  const soft = carte.some((c) => c.valore === 1) && tot + 10 <= 21;
  return { tot: soft ? tot + 10 : tot, soft, duro: tot };
}
const naturale = (carte) => carte.length === 2 && punti(carte).tot === 21;

// LE REGOLE, IN UN POSTO. Le usa il tavolo in chat e le usa la simulazione che
// confronta il tavolo con la resa calcolata: se cambiasse una, cambierebbe
// anche l'altra.
export function esitoNaturale(io, banco) {
  const suo = naturale(io);
  const delBanco = naturale(banco);
  if (!suo && !delBanco) return null;
  return suo && delBanco ? 'pari' : suo ? 'bj' : 'perdi';
}
export function esitoFinale(io, banco) {
  const a = punti(io).tot;
  const b = punti(banco).tot;
  if (a > 21) return 'perdi';
  return b > 21 || a > b ? 'vinci' : a === b ? 'pari' : 'perdi';
}
export function rende(esito, posta, vincitaBJ) {
  return esito === 'bj' ? Math.floor(posta * vincitaBJ / 100) : esito === 'vinci' ? posta * 2 : esito === 'pari' ? posta : 0;
}
function giocaBanco(banco, pescaFn = pesca) {
  while (punti(banco).tot < 17) banco.push(pescaFn());
}

// Una mano intera, giocata da `decidi(duro, asso, scoperta)`: per la simulazione.
export function simulaMano(decidi, vincitaBJ, posta = 100, pescaFn = pesca) {
  const io = [pescaFn(), pescaFn()];
  const banco = [pescaFn(), pescaFn()];
  const n = esitoNaturale(io, banco);
  if (n) return rende(n, posta, vincitaBJ) - posta;
  for (;;) {
    const p = punti(io);
    if (p.tot >= 21) break;
    if (decidi(p.duro, io.some((c) => c.valore === 1), banco[0].valore) !== 'carta') break;
    io.push(pescaFn());
  }
  giocaBanco(banco, pescaFn);
  return rende(esitoFinale(io, banco), posta, vincitaBJ) - posta;
}
const scrivi = (carte) => carte.map((c) => `${NOMI[c.grado]}${c.seme}`).join(' ');
const conto = (carte) => {
  const p = punti(carte);
  return p.soft ? `${p.duro}/${p.tot}` : String(p.tot);
};

function ricorda(channel, chi, posta) {
  const d = statoVivo.leggi(channel, CHIAVE) || {};
  if (posta) d[chi] = posta; else delete d[chi];
  if (Object.keys(d).length) statoVivo.scrivi(channel, CHIAVE, d);
  else statoVivo.togli(channel, CHIAVE);
}

// All'avvio: le mani rimaste aperte da prima del riavvio si chiudono rendendo
// la puntata. Nessuno le puo' piu' giocare, e nessuno deve perderci.
export function rimborsaDopoRiavvio() {
  const rese = [];
  for (const { channel, dato } of statoVivo.tutti(CHIAVE)) {
    for (const [chi, posta] of Object.entries(dato || {})) {
      points.add(channel, chi, Number(posta));
      rese.push({ channel, chi, posta: Number(posta) });
    }
    statoVivo.togli(channel, CHIAVE);
  }
  return rese;
}

export const manoDi = (channel, chi) => {
  const m = mani.get(`${channel}|${pulito(chi)}`);
  return m ? { io: m.io.map((c) => c.valore), banco: m.banco.map((c) => c.valore), posta: m.posta } : null;
};

function chiudi(channel, chi, m, esito) {
  mani.delete(`${channel}|${chi}`);
  clearTimeout(m.timer);
  const torna = rende(esito, m.posta, conf(channel).vincitaBJ);
  points.add(channel, chi, torna);
  ricorda(channel, chi, 0);
  return torna - m.posta;
}

function finisci(channel, chi, m) {
  giocaBanco(m.banco);
  const io = punti(m.io).tot;
  const lui = punti(m.banco).tot;
  const esito = esitoFinale(m.io, m.banco);
  const netto = chiudi(channel, chi, m, esito);
  const banco = `banco: ${scrivi(m.banco)} = ${lui}${lui > 21 ? ', sballa' : ''}`;
  const dice = { vinci: `vince! +${netto}`, pari: 'pari: la puntata torna', perdi: `perde, −${m.posta}` }[esito];
  try { m.say(`🃏 ${m.nome} sta a ${io} · ${banco} → ${dice}`); } catch { /* niente */ }
}

function arma(channel, chi, m) {
  clearTimeout(m.timer);
  m.timer = setTimeout(() => finisci(channel, chi, m), conf(channel).tempo * 1000);
  m.timer.unref?.();
}

// `!bj 50`: la mano parte. Torna true se e' partita (per far scattare l'attesa).
export function apri(channel, msg, args, say, { moneta = 'monete' } = {}) {
  const c = conf(channel);
  const chi = pulito(msg.user);
  const nome = msg.display || msg.user;
  const cmd = nomeIn(channel, 'blackjack');
  if (mani.has(`${channel}|${chi}`)) {
    say(`🃏 ${nome}, hai già una mano aperta: !${nomeIn(channel, 'carta')} o !${nomeIn(channel, 'stai')}.`);
    return false;
  }
  if (!/^[1-9]\d*$/.test(String(args[0] || ''))) { say(`🃏 Si gioca così: !${cmd} 50 (la puntata).`); return false; }
  const posta = Number(args[0]);
  if (c.massimo > 0 && posta > c.massimo) { say(`🃏 Qui si punta al massimo ${c.massimo} ${moneta}.`); return false; }
  const saldo = points.get(channel, chi);
  if (saldo < posta) { say(`🃏 ${nome}, per puntare ${posta} ${moneta} non basta quello che hai (${saldo}).`); return false; }
  points.add(channel, chi, -posta);
  const m = { nome, posta, io: [pesca(), pesca()], banco: [pesca(), pesca()], timer: null, say };
  mani.set(`${channel}|${chi}`, m);
  ricorda(channel, chi, posta);
  const esito = esitoNaturale(m.io, m.banco);
  if (esito) {
    const netto = chiudi(channel, chi, m, esito);
    const dice = { pari: 'blackjack tutti e due: la puntata torna', bj: `BLACKJACK! +${netto}`, perdi: `il banco ha blackjack, −${posta}` }[esito];
    say(`🃏 ${nome}: ${scrivi(m.io)} · banco: ${scrivi(m.banco)} → ${dice}`);
    return true;
  }
  arma(channel, chi, m);
  say(`🃏 ${nome}: ${scrivi(m.io)} (${conto(m.io)}) · banco: ${scrivi([m.banco[0]])} e una coperta. !${nomeIn(channel, 'carta')} o !${nomeIn(channel, 'stai')}?`);
  return true;
}

export function carta(channel, msg, say) {
  const chi = pulito(msg.user);
  const m = mani.get(`${channel}|${chi}`);
  if (!m) { say(`🃏 ${msg.display || msg.user}, non hai una mano aperta: !${nomeIn(channel, 'blackjack')} 50 per giocare.`); return; }
  m.say = say;
  m.io.push(pesca());
  const p = punti(m.io);
  if (p.tot > 21) {
    chiudi(channel, chi, m, 'perdi');
    say(`🃏 ${m.nome}: ${scrivi(m.io)} = ${p.tot}, sballa! −${m.posta}`);
    return;
  }
  if (p.tot === 21) { finisci(channel, chi, m); return; }
  arma(channel, chi, m);
  say(`🃏 ${m.nome}: ${scrivi(m.io)} (${conto(m.io)}). !${nomeIn(channel, 'carta')} o !${nomeIn(channel, 'stai')}?`);
}

export function stai(channel, msg, say) {
  const chi = pulito(msg.user);
  const m = mani.get(`${channel}|${chi}`);
  if (!m) { say(`🃏 ${msg.display || msg.user}, non hai una mano aperta: !${nomeIn(channel, 'blackjack')} 50 per giocare.`); return; }
  m.say = say;
  finisci(channel, chi, m);
}
