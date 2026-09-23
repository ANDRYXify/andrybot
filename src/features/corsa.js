// LA CORSA.
//
// `!corsa` apre le puntate su una corsa di corridori, dal favorito al piu'
// lento; `!corsa 2 50` punta 50 sul secondo (o `!corsa lepre 50`, col nome).
// Allo scadere si parte, e qualche secondo dopo l'arrivo. Tre regole.
//
//  · OGNI CORRIDORE RENDE UGUALE. Il favorito vince spesso e paga poco,
//    l'ultimo vince di rado e paga tanto: le quote (giochi-conf.js,
//    quoteCorsa) sono fatte perche' su ogni corridore, in media, tornino al
//    piu' `rende` monete ogni 100. Non esiste la puntata furba.
//  · L'ARRIVO SEGUE LE QUOTE. Il vincitore si estrae con le stesse
//    probabilita' su cui sono calcolate le quote; secondo e terzo con la
//    stessa regola fra chi resta, per raccontare un podio coerente.
//  · LE MONETE SI MUOVONO SOLO ALL'ARRIVO. Puntare non toglie niente, e fra
//    la partenza e l'arrivo non si dice niente che faccia capire come va:
//    chi all'arrivo non ha piu' la sua puntata resta fuori senza perdere
//    niente, e un riavvio nel mezzo fa sparire la corsa senza danni.
//
// Il ragionamento sta in docs/GIOCHI.md.
import { points, streamers } from '../db.js';
import { valoriDi, quoteCorsa } from './giochi-conf.js';
import { nomeIn } from './comandi-registro.js';
import { aspetta, giocato } from './attese-giochi.js';

const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'corsa');
const lettere = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');

// Come nel colpo, chi punta non riceve una riga a testa: le puntate si dicono
// insieme. Il giro parte con la prima puntata non ancora detta e si chiude da
// solo: quando nessuno punta non gira niente.
const GIRO_MS = 5000;
const GARA_MS = 6000;
const ELENCO_MAX = 10;

let caso = Math.random;
export function impostaCaso(f) { caso = typeof f === 'function' ? f : Math.random; }

const corse = new Map();   // canale → { nomi, quote, puntate: Map(chi → { nome, i, posta }), nuovi, giro, partita, timer, say }

// L'ordine d'arrivo: si estrae il primo coi pesi n, n−1, …, 1, poi il secondo
// fra chi resta con gli stessi pesi, e cosi' via. Il primo esce con la
// probabilita' esatta di quoteCorsa.
export function ordineArrivo(n, estrai = caso) {
  const restano = Array.from({ length: n }, (_, i) => i);
  const ordine = [];
  while (restano.length) {
    const somma = restano.reduce((s, i) => s + (n - i), 0);
    let x = estrai() * somma;
    let k = 0;
    while (k < restano.length - 1 && x >= n - restano[k]) { x -= n - restano[k]; k++; }
    ordine.push(restano.splice(k, 1)[0]);
  }
  return ordine;
}

// Il corridore detto in chat: il numero, o l'inizio del nome (senza faccine).
export function corridoreDetto(detto, nomi) {
  const t = String(detto || '').trim();
  if (/^[1-9]\d*$/.test(t)) return Number(t) <= nomi.length ? Number(t) - 1 : -1;
  const d = lettere(t);
  if (d.length < 2) return -1;
  const trovati = nomi.map((n, i) => (lettere(n).startsWith(d) ? i : -1)).filter((i) => i >= 0);
  return trovati.length === 1 ? trovati[0] : -1;
}

const quota = (q) => (q.ritorno / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const elenca = (voci) => (voci.length > ELENCO_MAX ? `${voci.slice(0, ELENCO_MAX).join(', ')} e altri ${voci.length - ELENCO_MAX}` : voci.join(', '));
const tabellone = (k) => k.nomi.map((n, i) => `${i + 1} ${n} ×${quota(k.quote[i])}`).join(' · ');

export const corsaInCorso = (channel) => {
  const k = corse.get(channel);
  return k ? { partita: k.partita, puntate: [...k.puntate].map(([chi, p]) => ({ chi, corridore: p.i, posta: p.posta })) } : null;
};

function diPuntate(k) {
  k.giro = null;
  if (!k.nuovi.length) return;
  const nuovi = k.nuovi.splice(0);
  try { k.say(`🏁 ${nuovi.length === 1 ? 'Punta' : 'Puntano'} anche ${elenca(nuovi)}.`); } catch { /* niente */ }
}

function arrivo(channel, k) {
  corse.delete(channel);
  // All'arrivo c'e' sempre qualcuno che ha puntato, e la sua attesa segna
  // anche quella di tutti.
  for (const chi of k.puntate.keys()) giocato(channel, 'corsa', chi);
  const ordine = ordineArrivo(k.nomi.length);
  const primo = ordine[0];
  const dentro = [...k.puntate].filter(([chi, p]) => points.get(channel, chi) >= p.posta);
  const fuori = k.puntate.size - dentro.length;
  const esiti = dentro.map(([chi, p]) => ({ chi, nome: p.nome, netto: p.i === primo ? Math.floor(p.posta * k.quote[primo].ritorno / 100) - p.posta : -p.posta }));
  for (const e of esiti) if (e.netto) points.add(channel, e.chi, e.netto);
  const podio = ordine.slice(0, 3).map((i, n) => `${['Primo', 'secondo', 'terzo'][n]} ${k.nomi[i]}`).join(', ');
  const voci = esiti.sort((a, b) => b.netto - a.netto).map((e) => `${e.nome} ${e.netto < 0 ? '−' : '+'}${Math.abs(e.netto)}`);
  const nota = fuori === 0 ? '' : fuori === 1 ? ' Una persona resta fuori: non ha più la sua puntata.' : ` ${fuori} persone restano fuori: non hanno più la loro puntata.`;
  try { k.say(`🏁 Arrivo! ${podio}.${voci.length ? ` ${elenca(voci)}.` : ''}${nota}`); } catch { /* la chat e' andata via: le monete sono gia' al loro posto */ }
}

function parti(channel, k) {
  diPuntate(k);
  if (!k.puntate.size) {
    corse.delete(channel);
    giocato(channel, 'corsa', null);
    try { k.say('🏁 Nessuno ha puntato: la corsa non parte.'); } catch { /* niente */ }
    return;
  }
  k.partita = true;
  try { k.say('🏁 Puntate chiuse: partiti!'); } catch { /* niente */ }
  k.timer = setTimeout(() => arrivo(channel, k), GARA_MS);
  k.timer.unref?.();
}

export function corsa(channel, msg, args, say, { moneta = 'monete' } = {}) {
  const c = conf(channel);
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  const cmd = nomeIn(channel, 'corsa');
  const k = corse.get(channel);
  if (k?.partita) { say('🏁 La corsa è già partita: si punta alla prossima.'); return; }
  const nomi = k?.nomi || c.corridori;
  const come = `Punta con !${cmd} 2 ${c.posta}: il corridore, col numero o col nome, e la puntata.`;
  if (args[0] === undefined && k) { say(`🏁 Si punta ancora: ${tabellone(k)}. ${come}`); return; }
  let i = -1;
  let posta = 0;
  if (args[0] !== undefined) {
    i = corridoreDetto(args[0], nomi);
    posta = args[1] === undefined ? c.posta : /^[1-9]\d*$/.test(String(args[1])) ? Number(args[1]) : 0;
    if (i < 0 || !posta) { say(`🏁 Si punta così: !${cmd} 2 ${c.posta}, col numero o col nome del corridore.`); return; }
    if (k?.puntate.has(io)) { say(`🏁 ${nome}, hai già puntato su ${k.nomi[k.puntate.get(io).i]}.`); return; }
    if (c.massimo > 0 && posta > c.massimo) { say(`🏁 Qui si punta al massimo ${c.massimo} ${moneta}.`); return; }
  }
  if (aspetta(channel, 'corsa', msg, say, { dire: ({ nome: chi, tempo, perTutti }) => (perTutti ? `🏁 La prossima corsa fra ${tempo}.` : `🏁 ${chi}, puoi puntare di nuovo fra ${tempo}.`) })) return;
  if (i >= 0) {
    const saldo = points.get(channel, io);
    if (saldo < posta) { say(`🏁 ${nome}, per puntare ${posta} ${moneta} non basta quello che hai (${saldo}).`); return; }
  }
  if (k) {
    k.puntate.set(io, { nome, i, posta });
    k.nuovi.push(`${nome} su ${k.nomi[i]}`);
    if (!k.giro) {
      k.giro = setTimeout(() => diPuntate(k), GIRO_MS);
      k.giro.unref?.();
    }
    return;
  }
  const nuova = { nomi: [...nomi], quote: quoteCorsa(nomi.length, c.rende), puntate: new Map(), nuovi: [], giro: null, partita: false, say };
  if (i >= 0) nuova.puntate.set(io, { nome, i, posta });
  nuova.timer = setTimeout(() => parti(channel, nuova), c.raccolta * 1000);
  nuova.timer.unref?.();
  corse.set(channel, nuova);
  const chi = i >= 0 ? `${nome} punta ${posta} ${moneta} su ${nomi[i]} e apre la corsa` : `${nome} apre la corsa`;
  say(`🏁 ${chi}: si parte fra ${c.raccolta} secondi! ${tabellone(nuova)}. ${come}`);
}
