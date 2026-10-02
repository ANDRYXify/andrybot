// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE ATTESE DEI GIOCHI, IN UN POSTO SOLO.
//
// Ogni gioco ha due attese, dichiarate nel catalogo (giochi-conf.js, ATTESE):
//
//   a testa    dopo che una persona ha giocato, aspetta lei
//   per tutti  dopo che qualcuno ha giocato, aspetta tutto il canale
//
// Prima ogni gioco aveva la sua, scritta a modo suo: una sola, a volte a testa
// e a volte per tutti, due fisse nel codice (!trivia, !manche), e quasi tutte
// mute. Soprattutto si consumavano al TENTATIVO: un «!roulette» scritto male
// bloccava per cinque secondi quello giusto. Qui le regole sono tre, uguali per
// tutti i giochi.
//
//  · SI CONTROLLA PRIMA, SI SEGNA DOPO. `aspetta` guarda se c'e' da aspettare;
//    `giocato` fa partire l'attesa, e il gioco lo chiama solo quando si e'
//    giocato davvero. Un comando sbagliato non costa niente.
//  · SI DICE UNA VOLTA. Chi trova il gioco in attesa se lo sente dire, con
//    quanto manca; se riscrive durante la stessa attesa il bot tace. Per
//    l'attesa di tutti lo si dice una volta sola per tutto il canale.
//  · I COMANDI A RAFFICA TACCIONO SEMPRE (`muta`): chi picchia il boss scrive
//    !colpisci di continuo, e una riga per ogni colpo in attesa sarebbe spam.
//
// PER GIOCARE BISOGNA ESSERCI (docs/ECONOMIA.md). Se il canale lo chiede, una
// partita costa dei messaggi scritti in chat, e vale la stessa regola: `aspetta`
// guarda se ci sono, e chi non li ha non gioca; si pagano quando si gioca
// davvero. Paga chi apre o entra in una partita con un comando dei giochi (un
// gruppo dell'elenco: da solo, contro qualcuno, tutti insieme, con la webcam);
// le mosse, il saldo e le coccole no, e lo staff mai. Il gioco che parte subito
// da' a `giocato` il messaggio con cui si e' giocato, e la partita si paga li';
// quello che si chiude dopo (il colpo, la corsa, la patata) chiama `entra`
// quando la persona entra, e a fine partita `giocato` col nome, per le attese.
//
// Il ragionamento sta in docs/GIOCHI.md.
import { streamers, statoVivo } from '../db.js';
import { valoriDi } from './giochi-conf.js';
import { nomeIn, IN_CHAT, puoUsare } from './comandi-registro.js';
import { aChi } from './risposte.js';
import * as economia from './economia.js';
import * as voce from './voce.js';
import { linguaChat } from './lingua-canale.js';

const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const chiave = (channel, gioco, chi) => `${channel}|${gioco}|${chi}`;

const fine = new Map();     // canale|gioco|chi (chi vuoto = per tutti) → quando finisce
const detta = new Map();    // stessa chiave → la fine per cui l'attesa e' gia' stata detta
const TROPPE = 20000;

export function aParole(ms) {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s} second${s === 1 ? 'o' : 'i'}`;
  const m = Math.ceil(s / 60);
  return `${m} minut${m === 1 ? 'o' : 'i'}`;
}

// ── chi insiste aspetta di piu' ─────────────────────────────────────────────
//
// Il castigo di una persona su un gioco (docs/GIOCHI.md): a quale diretta
// appartiene (`d`, la chiave di economia.momento), a che gradino e' (`l`), se
// ha insistito dall'ultima partita (`i`) e fin quando aspetta (`f`, -1 = fino a
// fine diretta). Sta nel database, una voce per canale: un riavvio non lo
// azzera e non lo regala. In memoria c'e' la copia, letta una volta.
const CASTIGHI = 'giochi-insistenze';
const castighi = new Map();   // canale → Map(gioco|persona → { d, l, i, f })
const MAX_AGGIUNTA_S = 86400;

function castighiDi(channel) {
  let m = castighi.get(channel);
  if (!m) {
    const salvati = statoVivo.leggi(channel, CASTIGHI);
    m = new Map(Object.entries(salvati && typeof salvati === 'object' ? salvati : {}));
    castighi.set(channel, m);
  }
  return m;
}
// Si salva quello che vale in questa diretta; il resto si dimentica.
function salvaCastighi(channel, m, d) {
  for (const [k, c] of m) if (c.d !== d) m.delete(k);
  if (m.size) statoVivo.scrivi(channel, CASTIGHI, Object.fromEntries(m));
  else statoVivo.togli(channel, CASTIGHI);
}
function castigoDi(channel, gioco, chi) {
  const m = castighiDi(channel);
  if (!m.size) return null;
  const c = m.get(`${gioco}|${pulito(chi)}`);
  return c && c.d === economia.momento(channel).chiave ? c : null;
}

// Il tempo detto nella lingua della chat: le frasi della voce sono in tre lingue.
const UNITA = {
  it: { s: ['secondo', 'secondi'], m: ['minuto', 'minuti'], h: ['ora', 'ore'], e: 'e' },
  en: { s: ['second', 'seconds'], m: ['minute', 'minutes'], h: ['hour', 'hours'], e: 'and' },
  es: { s: ['segundo', 'segundos'], m: ['minuto', 'minutos'], h: ['hora', 'horas'], e: 'y' },
};
export function tempoIn(lingua, ms) {
  const u = UNITA[lingua] || UNITA.it;
  const n = (q, [uno, tanti]) => `${q} ${q === 1 ? uno : tanti}`;
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return n(s, u.s);
  const m = Math.ceil(s / 60);
  if (m < 120) return n(m, u.m);
  const h = Math.floor(m / 60);
  return m % 60 ? `${n(h, u.h)} ${u.e} ${n(m % 60, u.m)}` : n(h, u.h);
}
const FINO = {
  it: ['fino alla fine della diretta', 'fino a domani'],
  en: ['until the end of the stream', 'until tomorrow'],
  es: ['hasta el final del directo', 'hasta mañana'],
};

// Ha insistito: il castigo sale di un gradino, e lo si dice. true se ha
// castigato (e quindi ha gia' parlato lui), false se il gioco non castiga.
function insiste(channel, gioco, comando, msg, say, r) {
  if (puoUsare('mod', msg)) return false;
  const c = valoriDi(streamers.get(channel)?.settings, gioco);
  if (!(c.insisti > 0)) return false;
  if (r.basta) return true;
  const ora = Date.now();
  const mo = economia.momento(channel, ora);
  const m = castighiDi(channel);
  const k = `${gioco}|${pulito(msg.user)}`;
  const prima = m.get(k);
  const l = (prima && prima.d === mo.chiave ? prima.l : 0) + 1;
  const basta = c.insistiMax > 0 && l >= c.insistiMax;
  const f = basta ? -1 : ora + r.ms + Math.min(c.insisti * 2 ** (l - 1), MAX_AGGIUNTA_S) * 1000;
  m.set(k, { d: mo.chiave, l, i: 1, f });
  salvaCastighi(channel, m, mo.chiave);
  const lingua = linguaChat(channel);
  const dati = { nome: msg.display || msg.user, comando: '!' + nomeIn(channel, comando) };
  const frase = basta
    ? voce.di(channel, 'gioco-basta', { ...dati, quando: (FINO[lingua] || FINO.it)[mo.live ? 0 : 1] })
    : voce.di(channel, 'gioco-insisti', { ...dati, tempo: tempoIn(lingua, f - ora) });
  if (frase) aChi(msg, say)(frase);
  return true;
}

// Ha giocato: chi aveva aspettato senza insistere scende di un gradino.
function calma(channel, gioco, msg) {
  const m = castighiDi(channel);
  const k = `${gioco}|${pulito(msg.user)}`;
  const c = m.get(k);
  if (!c) return;
  const d = economia.momento(channel).chiave;
  if (c.d !== d) m.delete(k);
  else if (c.i) c.i = 0;
  else if (--c.l <= 0) m.delete(k);
  salvaCastighi(channel, m, d);
}

// IL PERDONO (docs/GIOCHI.md): lo staff toglie i castighi di una persona, su un
// gioco o su tutti. Toglie il castigo intero, non l'attesa del gioco. Torna
// quanti ne ha tolti in questa diretta.
export function perdona(channel, chi, gioco = null) {
  const m = castighiDi(channel);
  const d = economia.momento(channel).chiave;
  const p = pulito(chi);
  let tolti = 0;
  for (const [k, c] of m) {
    const i = k.lastIndexOf('|');
    if (k.slice(i + 1) !== p || (gioco && k.slice(0, i) !== gioco)) continue;
    if (c.d === d) tolti++;
    m.delete(k);
  }
  salvaCastighi(channel, m, d);
  return tolti;
}

// I castighi di questa diretta, per il pannello: chi, quale gioco, a che
// gradino, fin quando (null = fino a fine diretta), e da quanto non insiste piu'.
export function castighiInCorso(channel, ora = Date.now()) {
  const m = castighiDi(channel);
  if (!m.size) return [];
  const d = economia.momento(channel, ora).chiave;
  const out = [];
  for (const [k, c] of m) {
    if (c.d !== d) continue;
    const i = k.lastIndexOf('|');
    out.push({ chi: k.slice(i + 1), gioco: k.slice(0, i), gradino: c.l, fino: c.f < 0 ? null : c.f, aspetta: c.f < 0 || c.f > ora });
  }
  return out.sort((a, b) => b.gradino - a.gradino || a.chi.localeCompare(b.chi));
}

// Quanto manca, e di quale attesa: se ci sono tutte e due vale la piu' lunga,
// e il castigo di chi ha insistito conta come la sua attesa. Chi entra in una
// partita gia' aperta non guarda l'attesa per tutti (`tutti: false`), e in un
// invito nemmeno il castigo (`castigo: false`).
export function resta(channel, gioco, chi, { tutti: perTutti = true, castigo: colCastigo = true } = {}) {
  const ora = Date.now();
  const c = colCastigo ? castigoDi(channel, gioco, chi) : null;
  const castigo = !c ? 0 : c.f < 0 ? Infinity : c.f - ora;
  const testa = Math.max((fine.get(chiave(channel, gioco, pulito(chi))) || 0) - ora, castigo);
  const tutti = perTutti ? (fine.get(chiave(channel, gioco, '')) || 0) - ora : 0;
  if (testa <= 0 && tutti <= 0) return null;
  if (tutti >= testa) return { perTutti: true, ms: tutti };
  return { perTutti: false, ms: testa, basta: castigo === Infinity };
}

// CHI APRE DECIDE COS'E' LA PARTITA (docs/GIOCHI.md, «Gli inviti»). Una
// partita aperta dallo staff o dal giro dei giochi automatici e' un invito del
// canale: entrarci non e' insistere, e un castigo non tiene fuori e non scende,
// perche' non conta. Resta l'attesa a testa del gioco, che e' una sua regola e
// non un castigo. Entrare in una partita gia' aperta, chiunque l'abbia aperta,
// non guarda l'attesa per tutti: quella separa una partita dalla prossima.
export const invita = (msg) => puoUsare('mod', msg);

// true se bisogna aspettare (e il gioco si ferma li'). `dire` riceve
// { nome, tempo, perTutti, cmd } per chi vuole dirlo con parole sue.
// `aperta`: null per chi apre, { invito } per chi entra in una partita aperta.
export function aspetta(channel, gioco, msg, say, { comando = gioco, muta = false, dire = null, aperta = null } = {}) {
  const r = resta(channel, gioco, msg.user, aperta ? { tutti: false, castigo: !aperta.invito } : undefined);
  if (!r) return senzaMessaggi(channel, comando, msg, say, muta);
  if (muta) return true;
  if (!aperta?.invito && insiste(channel, gioco, comando, msg, say, r)) return true;
  const k = chiave(channel, gioco, r.perTutti ? '' : pulito(msg.user));
  const quando = fine.get(k);
  if (detta.get(k) === quando) return true;
  detta.set(k, quando);
  const nome = msg.display || msg.user;
  const tempo = aParole(r.ms);
  const cmd = nomeIn(channel, comando);
  aChi(msg, say)(dire ? dire({ nome, tempo, perTutti: r.perTutti, cmd })
    : r.perTutti ? `⏳ !${cmd} di nuovo fra ${tempo}.` : `⏳ ${nome}, !${cmd} di nuovo fra ${tempo}.`);
  return true;
}

// ── per giocare bisogna esserci ─────────────────────────────────────────────

const GRUPPI_GIOCO = new Set(['solo', 'sfide', 'insieme', 'webcam']);
export const eUnGioco = (id) => GRUPPI_GIOCO.has(IN_CHAT[id]?.gruppo);
const paga = (id, msg) => eUnGioco(id) && !puoUsare('mod', msg);

// canale|persona → quanti messaggi mancavano quando gliel'abbiamo detto: lo si
// ridice solo quando il numero cambia, cioe' dopo un messaggio che conta.
const dettoMancano = new Map();

function senzaMessaggi(channel, comando, msg, say, muta) {
  if (!paga(comando, msg)) return false;
  const quanti = economia.mancano(channel, msg.user);
  if (!quanti) return false;
  if (muta) return true;
  const k = `${channel}|${pulito(msg.user)}`;
  if (dettoMancano.get(k) === quanti) return true;
  if (dettoMancano.size > TROPPE) dettoMancano.clear();
  dettoMancano.set(k, quanti);
  const frase = voce.di(channel, 'gioco-parla-prima', { nome: msg.display || msg.user, quanti });
  if (frase) aChi(msg, say)(frase);
  return true;
}

// Chi entra in una partita (anche una che si chiude dopo): la paga adesso, e
// se aveva aspettato senza insistere il suo castigo scende. In un invito no:
// non conta, ne' in su ne' in giu'.
export function entra(channel, gioco, msg, { invito = false } = {}) {
  if (!invito) calma(channel, gioco, msg);
  if (!paga(gioco, msg)) return;
  economia.giocata(channel, msg.user);
  dettoMancano.delete(`${channel}|${pulito(msg.user)}`);
}

// Si e' giocato: partono le due attese. `chi` e' il messaggio con cui si e'
// giocato (e la partita si paga), oppure il nome di chi era in una partita
// che si chiude adesso. Torna un `annulla` per chi segna prima di sapere
// com'e' andata (lo sblocco della chat aspetta Twitch, e due sblocchi insieme
// non devono passare tutti e due mentre si aspetta).
export function giocato(channel, gioco, persona) {
  let chi = persona;
  let castigoPrima;
  if (persona && typeof persona === 'object') {
    chi = persona.user;
    castigoPrima = castighiDi(channel).get(`${gioco}|${pulito(chi)}`);
    if (castigoPrima) castigoPrima = { ...castigoPrima };
    entra(channel, gioco, persona);
  }
  const c = valoriDi(streamers.get(channel)?.settings, gioco);
  const ora = Date.now();
  const toccate = [];
  const segna = (k, secondi) => {
    if (!(secondi > 0)) return;
    toccate.push([k, fine.get(k)]);
    fine.set(k, ora + secondi * 1000);
  };
  if (chi) segna(chiave(channel, gioco, pulito(chi)), c.attesaTesta);
  segna(chiave(channel, gioco, ''), c.attesaTutti);
  if (fine.size > TROPPE) {
    for (const [k, t] of fine) if (t < ora) { fine.delete(k); detta.delete(k); }
  }
  return {
    annulla() {
      for (const [k, prima] of toccate) {
        if (prima === undefined) fine.delete(k);
        else fine.set(k, prima);
      }
      // il castigo torna com'era: quella partita non c'e' stata
      if (castigoPrima) {
        const m = castighiDi(channel);
        m.set(`${gioco}|${pulito(chi)}`, castigoPrima);
        salvaCastighi(channel, m, economia.momento(channel).chiave);
      }
    },
  };
}
