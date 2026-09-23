// IL COLPO DI GRUPPO.
//
// Uno organizza con `!colpo`, gli altri entrano con la loro posta, e allo
// scadere della raccolta ognuno scappa o viene preso. Tre regole.
//
//  · PIU' SIETE, PIU' E' FACILE. La riuscita parte da `riuscita`, ogni persona
//    in piu' aggiunge `perPersona`, e non supera mai `riuscitaMax`. Poi ognuno
//    tira per se': una banda grande puo' finire a meta'.
//  · LE MONETE SI MUOVONO SOLO ALLA FINE. Entrare non toglie niente: quando il
//    colpo parte si guarda chi ha ancora la sua posta, e chi non l'ha piu' resta
//    fuori. Un riavvio nel mezzo fa sparire il colpo, e nessuno perde niente.
//  · IL BANCO VINCE UN PO'. Con la banda piu' grande, su 100 di posta ne
//    tornano in media riuscitaMax × vincita / 100: di serie 96. E' la resa che
//    il pannello mostra (`valutaResa`, tipo «colpo»).
//
// Il ragionamento sta in docs/GIOCHI.md.
import { points, streamers } from '../db.js';
import { valoriDi } from './giochi-conf.js';
import { nomeIn } from './comandi-registro.js';

const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'colpo');

function aParole(ms) {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s} second${s === 1 ? 'o' : 'i'}`;
  const m = Math.ceil(s / 60);
  return `${m} minut${m === 1 ? 'o' : 'i'}`;
}

// Chi entra non riceve una riga a testa: in una chat viva sarebbero venti
// righe in un minuto. Gli ingressi si dicono insieme, a giri fissi: ogni
// cinque secondi, se nel frattempo e' entrato qualcuno.
const GIRO_MS = 5000;
const ELENCO_MAX = 10;

const colpi = new Map();   // canale → { banda: Map(chi → { nome, posta }), nuovi, giro, timer, say }
const dopo = new Map();    // canale → da quando si puo' organizzare il prossimo

export function probabilitaColpo(n, c) {
  return Math.min(c.riuscitaMax, c.riuscita + (n - 1) * c.perPersona) / 100;
}

// Chi scappa riprende la posta per `vincita` / 100; chi e' preso la perde.
export function esitoColpo(banda, c, caso = Math.random) {
  const p = probabilitaColpo(banda.length, c);
  return banda.map(([chi, m]) => {
    const scappa = caso() < p;
    return { chi, nome: m.nome, posta: m.posta, scappa, netto: scappa ? Math.round(m.posta * c.vincita / 100) - m.posta : -m.posta };
  });
}

function elenca(voci) {
  return voci.length > ELENCO_MAX ? `${voci.slice(0, ELENCO_MAX).join(', ')} e altri ${voci.length - ELENCO_MAX}` : voci.join(', ');
}

export function testoColpo(esiti, c) {
  const liberi = esiti.filter((e) => e.scappa).length;
  const testa = scegli(liberi === esiti.length ? c.riuscito : liberi === 0 ? c.fallito : c.meta);
  const voci = [...esiti].sort((a, b) => b.netto - a.netto).map((e) => `${e.nome} ${e.netto < 0 ? '−' : '+'}${Math.abs(e.netto)}`);
  return `${testa} ${elenca(voci)}.`;
}

export const colpoInCorso = (channel) => {
  const k = colpi.get(channel);
  return k ? [...k.banda].map(([chi, m]) => ({ chi, posta: m.posta })) : null;
};

function diIngressi(k) {
  if (!k.nuovi.length) return;
  const nuovi = k.nuovi.splice(0);
  try { k.say(`🦹 ${nuovi.length === 1 ? 'Entra' : 'Entrano'} ${elenca(nuovi)}: la banda è di ${k.banda.size}.`); } catch { /* niente */ }
}

function chiudi(channel) {
  const k = colpi.get(channel);
  if (!k) return;
  colpi.delete(channel);
  clearTimeout(k.timer);
  clearInterval(k.giro);
  const c = conf(channel);
  dopo.set(channel, Date.now() + c.attesa * 1000);
  const banda = [...k.banda].filter(([chi, m]) => points.get(channel, chi) >= m.posta);
  const fuori = k.banda.size - banda.length;
  const nota = fuori === 0 ? '' : fuori === 1 ? ' Una persona resta fuori: non ha più la sua posta.' : ` ${fuori} persone restano fuori: non hanno più la loro posta.`;
  try {
    if (banda.length < c.minimo) {
      k.say(`🚓 Il colpo salta: servono almeno ${c.minimo} persone con la loro posta. Nessuno perde niente.${nota}`);
      return;
    }
    const esiti = esitoColpo(banda, c);
    for (const e of esiti) if (e.netto) points.add(channel, e.chi, e.netto);
    k.say(testoColpo(esiti, c) + nota);
  } catch { /* la chat e' andata via: le monete sono gia' al loro posto */ }
}

export function colpo(channel, msg, args, say, { moneta = 'monete' } = {}) {
  const c = conf(channel);
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  const cmd = nomeIn(channel, 'colpo');
  if (args[0] !== undefined && !/^[1-9]\d*$/.test(String(args[0]))) {
    say(`🦹 Si entra così: !${cmd}, oppure !${cmd} 100 per scegliere la posta.`);
    return;
  }
  const posta = args[0] === undefined ? c.posta : Number(args[0]);
  if (c.massimo > 0 && posta > c.massimo) { say(`🦹 Qui la posta massima è ${c.massimo} ${moneta}.`); return; }
  const k = colpi.get(channel);
  if (k?.banda.has(io)) { say(`🦹 ${nome}, sei già nella banda.`); return; }
  const saldo = points.get(channel, io);
  if (saldo < posta) { say(`🦹 ${nome}, per entrare con ${posta} ${moneta} non basta quello che hai (${saldo}).`); return; }

  if (k) {
    k.banda.set(io, { nome, posta });
    k.nuovi.push(nome);
    return;
  }
  const fra = (dopo.get(channel) || 0) - Date.now();
  if (fra > 0) { say(`🚓 La polizia gira ancora: il prossimo colpo fra ${aParole(fra)}.`); return; }
  const nuovo = { banda: new Map([[io, { nome, posta }]]), nuovi: [], say };
  nuovo.timer = setTimeout(() => chiudi(channel), c.raccolta * 1000);
  nuovo.timer.unref?.();
  nuovo.giro = setInterval(() => diIngressi(nuovo), GIRO_MS);
  nuovo.giro.unref?.();
  colpi.set(channel, nuovo);
  say(`🦹 ${nome} organizza un colpo con ${posta} ${moneta}! Chi entra scrive !${cmd}, o !${cmd} 100 per scegliere la posta: si parte fra ${c.raccolta} secondi.`);
}
