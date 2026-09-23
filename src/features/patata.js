// LA PATATA BOLLENTE.
//
// `!patata` la lancia: ce l'ha in mano chi l'ha lanciata. Chi ce l'ha la passa
// con `!passa @nome`, o con `!passa` a qualcuno a caso fra chi e' in chat. Dopo
// un tempo che nessuno conosce, scoppia in mano a chi ce l'ha. Tre regole.
//
//  · LA MICCIA SI DECIDE AL LANCIO. Un numero a caso fra `miccia` e
//    `micciaMax` secondi, estratto una volta: passarla non la allunga e non la
//    accorcia. Il caso qui serve a variare, non regge niente.
//  · SI PASSA SOLO A UNA PERSONA IN CHAT. Non a se stessi, non a chi non c'e',
//    non a un bot: un bot non puo' ripassarla, e diventerebbe il cestino dove
//    buttarla per chiudere il gioco senza rischio.
//  · LA MULTA LA PAGA SOLO CHI GIOCA. Se `multa` e' piu' di zero, chi resta con
//    la patata ne da' tante (fino a quante ne ha) a chi gliel'ha passata. Ma
//    solo se aveva gia' giocato, cioe' l'aveva lanciata o passata: chi la
//    riceve senza averla mai toccata si brucia e basta. Le monete passano di
//    tasca, non se ne creano.
//
// Il ragionamento sta in docs/GIOCHI.md.
import { points, streamers } from '../db.js';
import { valoriDi } from './giochi-conf.js';
import { nomeIn } from './comandi-registro.js';
import { aspetta, giocato } from './attese-giochi.js';
import { NON_CONTARE } from './watchtime.js';

const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'patata');

let caso = Math.random;
export function impostaCaso(f) { caso = typeof f === 'function' ? f : Math.random; }

const patate = new Map();   // canale → { chi, nome, da, daNome, lanciata, giocatori: Set, passaggi, moneta, timer, say }

export const patataInCorso = (channel) => {
  const p = patate.get(channel);
  return p ? { chi: p.chi, da: p.da, passaggi: p.passaggi } : null;
};

function scoppia(channel, p) {
  patate.delete(channel);
  giocato(channel, 'patata', p.lanciata);
  const multa = conf(channel).multa;
  let dato = 0;
  if (multa > 0 && p.da && p.giocatori.has(p.chi)) {
    dato = Math.min(multa, points.get(channel, p.chi));
    if (dato > 0) { points.add(channel, p.chi, -dato); points.add(channel, p.da, dato); }
  }
  const giri = p.passaggi === 0 ? 'senza che nessuno la passasse' : p.passaggi === 1 ? 'dopo un passaggio' : `dopo ${p.passaggi} passaggi`;
  const paga = dato > 0 ? ` ${p.daNome} incassa ${dato} ${p.moneta} da ${p.nome}.` : '';
  try { p.say(`💥 BOOM! La patata scoppia fra le mani di ${p.nome}, ${giri}.${paga}`); } catch { /* le monete sono gia' al loro posto */ }
}

export function lancia(channel, msg, say, { moneta = 'monete' } = {}) {
  const c = conf(channel);
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  const passa = nomeIn(channel, 'passa');
  const q = patate.get(channel);
  if (q) { say(`🥔 La patata ce l'ha già ${q.nome}: !${passa} @nome, e in fretta.`); return; }
  if (aspetta(channel, 'patata', msg, say, { dire: ({ nome: chi, tempo, perTutti }) => (perTutti ? `🥔 La prossima patata fra ${tempo}.` : `🥔 ${chi}, puoi lanciarne un'altra fra ${tempo}.`) })) return;
  const corta = Math.min(c.miccia, c.micciaMax);
  const lunga = Math.max(c.miccia, c.micciaMax);
  const p = { chi: io, nome, da: '', daNome: '', lanciata: io, giocatori: new Set([io]), passaggi: 0, moneta, say };
  p.timer = setTimeout(() => scoppia(channel, p), (corta + caso() * (lunga - corta)) * 1000);
  p.timer.unref?.();
  patate.set(channel, p);
  say(`🥔 ${nome} lancia la patata bollente e ce l'ha in mano! !${passa} @nome per passarla, o !${passa} e va a qualcuno a caso, prima che scoppi.`);
}

export function passa(channel, msg, args, say, { inChat, chiInChat }) {
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  const p = patate.get(channel);
  if (!p) { say(`🥔 Nessuna patata in giro: !${nomeIn(channel, 'patata')} per lanciarne una.`); return; }
  if (p.chi !== io) { say(`🥔 ${nome}, la patata non ce l'hai tu: ce l'ha ${p.nome}.`); return; }
  let a = pulito(args[0]);
  if (!a) {
    const altri = chiInChat(channel).filter((u) => u !== io && !NON_CONTARE.has(u));
    if (!altri.length) { say('🥔 Non c\'è nessun altro in chat a cui passarla: tienila stretta!'); return; }
    a = altri[Math.floor(caso() * altri.length)];
  }
  if (a === io) { say('🥔 A te stesso non vale: passala a qualcun altro.'); return; }
  if (NON_CONTARE.has(a)) { say(`🥔 ${a} è un bot: passala a una persona.`); return; }
  if (!inChat(channel, a)) { say(`🥔 ${a} non è in chat adesso.`); return; }
  p.da = io;
  p.daNome = nome;
  p.chi = a;
  p.nome = a;
  p.giocatori.add(io);
  p.passaggi++;
  say(`🥔 ${nome} → ${a}! Scotta, passala!`);
}
