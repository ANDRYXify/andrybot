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
// Il ragionamento sta in docs/GIOCHI.md.
import { streamers } from '../db.js';
import { valoriDi } from './giochi-conf.js';
import { nomeIn } from './comandi-registro.js';
import { aChi } from './risposte.js';

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

// Quanto manca, e di quale attesa: se ci sono tutte e due vale la piu' lunga.
export function resta(channel, gioco, chi) {
  const ora = Date.now();
  const testa = (fine.get(chiave(channel, gioco, pulito(chi))) || 0) - ora;
  const tutti = (fine.get(chiave(channel, gioco, '')) || 0) - ora;
  if (testa <= 0 && tutti <= 0) return null;
  return tutti >= testa ? { perTutti: true, ms: tutti } : { perTutti: false, ms: testa };
}

// true se bisogna aspettare (e il gioco si ferma li'). `dire` riceve
// { nome, tempo, perTutti, cmd } per chi vuole dirlo con parole sue.
export function aspetta(channel, gioco, msg, say, { comando = gioco, muta = false, dire = null } = {}) {
  const r = resta(channel, gioco, msg.user);
  if (!r) return false;
  if (muta) return true;
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

// Si e' giocato: partono le due attese. Torna un `annulla` per chi segna prima
// di sapere com'e' andata (lo sblocco della chat aspetta Twitch, e due sblocchi
// insieme non devono passare tutti e due mentre si aspetta).
export function giocato(channel, gioco, chi) {
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
    },
  };
}
