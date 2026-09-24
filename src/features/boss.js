// IL BOSS DA BATTERE INSIEME.
//
// Arriva un boss, la chat lo colpisce con `!colpisci`, e se cade prima che
// scappi il bottino si divide fra chi l'ha colpito. Quattro regole.
//
//  · LA VITA E' QUELLA DELLA CHAT. I punti vita sono `vitaPerPersona` per ogni
//    persona che ha scritto negli ultimi dieci minuti (mai meno di `minimo`
//    persone). Chi guarda in silenzio non conta: un boss tarato sugli
//    spettatori collegati sarebbe imbattibile in ogni canale grande.
//  · OGNI PUNTO DI DANNO VALE LO STESSO. Chi colpisce prende
//    bottino × danno / vitaPerPersona: se tutti colpiscono uguale ognuno prende
//    `bottino`, chi colpisce di piu' prende di piu'. Il colpo finale conta solo
//    la vita che restava, cosi' la somma dei danni e' la vita del boss.
//  · NIENTE SI PERDE. Colpire non costa: se il boss scappa non si prende
//    niente, e un riavvio nel mezzo lo fa sparire senza che nessuno ci rimetta.
//  · CHI COLPISCE LO SA. Un colpo non ha una riga sua, che in una chat viva
//    sarebbero decine: i colpi si raccolgono in un bollettino. Il primo arriva
//    quattro secondi dopo il primo colpo (chi comincia vede subito che conta),
//    poi al piu' uno ogni venti secondi, solo se nel frattempo qualcuno ha
//    colpito; la meta' e il quarto lo fanno uscire subito. Dice chi ha colpito e
//    quanto, la vita che resta e i secondi che mancano.
//  · IL MASSIMO SI CONOSCE PRIMA. Una persona colpisce al piu' una volta ogni
//    `attesa` per `durata` secondi, sempre col danno piu' alto: e' il massimo a
//    boss che il pannello mostra (`valutaResa`, tipo «boss»), e con il boss
//    automatico diventa un massimo all'ora da confrontare con la presenza.
//
// Il ragionamento sta in docs/GIOCHI.md.
import { points, streamers, memory } from '../db.js';
import { valoriDi } from './giochi-conf.js';
import { nomeIn } from './comandi-registro.js';
import { aspetta, giocato } from './attese-giochi.js';

const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'boss');
const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const ATTIVI_MS = 10 * 60 * 1000;
export const BOLLETTINO_PRIMO_MS = 4_000;
export const BOLLETTINO_MS = 20_000;
const SILENZIO_MS = 30_000;
const ELENCO_MAX = 10;

let spinta = null;
export function impostaSpinta(fn) { spinta = typeof fn === 'function' ? fn : null; }
let modalita = null;
export function impostaModalita(m) { modalita = m || null; }
function manda(channel, p) {
  try { spinta?.(channel, { tipo: 'boss', ...p }); } catch { /* l'overlay e' un di piu' */ }
}

const bossi = new Map();     // canale → { nome, vita, vitaMax, danni: Map(chi → { nome, danno }), soglia, timer, say }
const silenzi = new Map();   // canale → fino a quando «nessun boss» non si ripete

export function personeAttive(channel) {
  return memory.recentChatters(channel, ATTIVI_MS, 100000).length;
}

export const bossInCorso = (channel) => {
  const b = bossi.get(channel);
  return b ? { nome: b.nome, vita: b.vita, vitaMax: b.vitaMax } : null;
};

export function arriva(channel, say, { annuncio = '' } = {}) {
  if (bossi.has(channel)) return false;
  const c = conf(channel);
  const vitaMax = Math.max(c.minimo, personeAttive(channel)) * c.vitaPerPersona;
  const b = { nome: scegli(c.nomi), vita: vitaMax, vitaMax, danni: new Map(), soglia: 0, say,
    fine: Date.now() + c.durata * 1000, nuovi: new Map(), ultimo: 0, bollettino: null };
  b.timer = setTimeout(() => scappa(channel), c.durata * 1000);
  b.timer.unref?.();
  bossi.set(channel, b);
  say(`⚔️ ${annuncio}Arriva ${b.nome} con ${vitaMax} punti vita! Scrivete !${nomeIn(channel, 'colpisci')} per colpire: avete ${c.durata} secondi.`);
  manda(channel, { azione: 'arriva', nome: b.nome, vita: vitaMax, vitaMax, durata: c.durata });
  return true;
}

function via(channel) {
  const b = bossi.get(channel);
  if (!b) return null;
  bossi.delete(channel);
  clearTimeout(b.timer);
  clearTimeout(b.bollettino);
  return b;
}

// Il bollettino: i colpi dall'ultimo, la vita, il tempo. `soglia` e' la meta'
// (1) o il quarto (2) appena passati, che si dicono una volta.
function bollettino(channel, soglia = 0) {
  const b = bossi.get(channel);
  if (!b) return;
  clearTimeout(b.bollettino);
  b.bollettino = null;
  if (!b.nuovi.size) return;
  const colpi = `Colpi: ${elenca([...b.nuovi.values()].map((d) => `${d.nome} ${d.danno}`))}.`;
  const mancano = `mancano ${Math.max(0, Math.round((b.fine - Date.now()) / 1000))} secondi`;
  b.nuovi.clear();
  b.ultimo = Date.now();
  const nome = maiuscola(b.nome);
  try {
    b.say(soglia === 1 ? `🩸 ${nome} è a metà: ${b.vita} punti vita su ${b.vitaMax}, ${mancano}! ${colpi}`
      : soglia === 2 ? `🩸 Ancora poco! ${nome}: ${b.vita} punti vita, ${mancano}! ${colpi}`
        : `⚔️ ${nome}: ${b.vita} punti vita su ${b.vitaMax}, ${mancano}. ${colpi}`);
  } catch { /* niente */ }
}

// Quanto prende ognuno: il danno fatto, al cambio fisso del bottino.
export function spartisci(danni, c) {
  return [...danni]
    .map(([chi, d]) => ({ chi, nome: d.nome, danno: d.danno, monete: Math.round(c.bottino * d.danno / c.vitaPerPersona) }))
    .sort((a, b) => b.danno - a.danno);
}

function elenca(voci) {
  return voci.length > ELENCO_MAX ? `${voci.slice(0, ELENCO_MAX).join(', ')} e altri ${voci.length - ELENCO_MAX}` : voci.join(', ');
}

function cade(channel) {
  const b = via(channel);
  const c = conf(channel);
  const quote = spartisci(b.danni, c);
  for (const q of quote) if (q.monete > 0) points.add(channel, q.chi, q.monete);
  const coda = c.bottino > 0
    ? `Bottino: ${elenca(quote.map((q) => `${q.nome} +${q.monete}`))}.`
    : `Colpi andati a segno: ${elenca(quote.map((q) => `${q.nome} ${q.danno}`))}.`;
  try { b.say(`🏆 ${maiuscola(b.nome)} va al tappeto! ${coda}`); } catch { /* niente */ }
  manda(channel, { azione: 'fine', vinto: true, nome: b.nome });
  if (c.festa > 0 && modalita) {
    modalita.accendiPer(channel, 'emote', c.festa * 60, { annuncia: false }).then((r) => {
      if (r?.ok && r.esito !== 'gia') b.say(`🎉 Festa! Chat in solo emote per ${c.festa} minut${c.festa === 1 ? 'o' : 'i'}.`);
    }).catch(() => {});
  }
}

function scappa(channel) {
  const b = via(channel);
  if (!b) return;
  try { b.say(`💨 ${maiuscola(b.nome)} scappa con ${b.vita} punti vita su ${b.vitaMax}. Niente bottino: sarà per la prossima.`); } catch { /* niente */ }
  manda(channel, { azione: 'fine', vinto: false, nome: b.nome });
}

export function colpisci(channel, msg, say, caso = Math.random) {
  const b = bossi.get(channel);
  if (!b) {
    if ((silenzi.get(channel) || 0) > Date.now()) return;
    silenzi.set(channel, Date.now() + SILENZIO_MS);
    say('⚔️ Nessun boss in giro adesso.');
    return;
  }
  const c = conf(channel);
  const io = pulito(msg.user);
  if (aspetta(channel, 'boss', msg, say, { comando: 'colpisci', muta: true })) return;
  giocato(channel, 'boss', io);

  const basso = Math.min(c.dannoMin, c.dannoMax);
  const alto = Math.max(c.dannoMin, c.dannoMax);
  const danno = Math.min(b.vita, basso + Math.floor(caso() * (alto - basso + 1)));
  b.vita -= danno;
  const d = b.danni.get(io) || { nome: msg.display || msg.user, danno: 0 };
  d.danno += danno;
  b.danni.set(io, d);
  const n = b.nuovi.get(io) || { nome: d.nome, danno: 0 };
  n.danno += danno;
  b.nuovi.set(io, n);
  manda(channel, { azione: 'colpo', chi: d.nome, danno, vita: b.vita, vitaMax: b.vitaMax });
  if (b.vita === 0) { cade(channel); return; }

  // Meta' e un quarto escono subito, una volta sola, e un colpo grosso che le
  // passa tutte e due dice solo l'ultima. Il resto aspetta il suo turno.
  const soglia = b.vita * 4 <= b.vitaMax ? 2 : b.vita * 2 <= b.vitaMax ? 1 : 0;
  if (soglia > b.soglia) { b.soglia = soglia; bollettino(channel, soglia); return; }
  if (!b.bollettino) {
    const fra = b.ultimo ? Math.max(0, b.ultimo + BOLLETTINO_MS - Date.now()) : BOLLETTINO_PRIMO_MS;
    b.bollettino = setTimeout(() => bollettino(channel), fra);
    b.bollettino.unref?.();
  }
}

// Le due strade automatiche, decise qui perche' le regole stanno qui.
export function vieneDaSolo(channel) {
  return conf(channel).ogni;
}
export function vieneColRaid(channel, persone) {
  const soglia = conf(channel).dopoRaid;
  return soglia > 0 && Number(persone) >= soglia;
}
