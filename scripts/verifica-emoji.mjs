// Cancello delle EMOJI nell'interfaccia.
//
// La regola del direttore: nell'interfaccia del sito non ci vanno emoji. Non e'
// gusto — il sito e' disegnato come una tavola a china, e un'emoji la disegna il
// sistema operativo di chi guarda: cambia forma su ogni piattaforma, non ha il
// nostro tratto, e in mezzo a icone fatte a mano si vede che e' un corpo
// estraneo. Dove un'emoji portava un SENSO (un lucchetto che dice «bloccato»)
// quel senso non si butta: si ridisegna, con le icone che il progetto ha gia'.
//
// Ma non tutte le emoji del prodotto sono interfaccia, e toglierle a tappeto
// romperebbe delle cose. Restano fuori, di proposito:
//  · i MESSAGGI IN CHAT che il bot scrive (src/features/, src/bot.js): e' la sua
//    voce dove le emoji sono la lingua del posto, e non e' roba nostra;
//  · i PROMPT del modello (src/ai/, brain/): li' un'emoji e' un'istruzione;
//  · i DATI: i gesti che la telecamera riconosce, le espressioni, i simboli dei
//    rulli. Li' l'emoji E' il dato, non un ornamento.
//
// Percio' questo cancello guarda solo cio' che arriva al browser come SITO, e
// tiene un inventario: per ogni file, quali pittogrammi sono ammessi e perche'.
// Un'emoji nuova in uno di quei file lo fa diventare rosso. Allargare
// l'inventario si puo', ma e' un gesto deliberato — che e' esattamente il punto.
//
// Uso: node scripts/verifica-emoji.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { emojiIn } from './_emoji.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');

// L'inventario: file per file, i pittogrammi che restano e la loro ragione.
// Chi non e' qui dentro non puo' avere emoji.
const AMMESSI = {
  'app.js': {
    perche: 'messaggi che il bot scrive in chat, simboli dei rulli della slot, e le didascalie che lo streamer incolla sui social',
    segni: '🎮👉🔴🗓️💜😂😱🤬😭😨🤢🎰🍀💸🎁🕵️🚨💰✨💀🍒⭐💎🔥🎲',
  },
  'tracking-games.js': {
    perche: 'i gesti che la telecamera riconosce e le espressioni: qui l\'emoji E\' il dato, non un ornamento',
    segni: '✋✊✌️☝️👍😂💪😈🧩🎉🎮👀🏁🏆',
  },
  'tracking-play.js': {
    perche: 'le espressioni facciali riconosciute, come sopra',
    segni: '😂😱🤬😭😨🤢',
  },
};

const guai = [];
let file = 0, ammesse = 0;

for (const f of readdirSync(PUB).filter((x) => /\.(js|css|html)$/.test(x)).sort()) {
  file++;
  const trovate = emojiIn(readFileSync(join(PUB, f), 'utf8'));
  if (!trovate.length) continue;
  const voce = AMMESSI[f];
  if (!voce) {
    guai.push(`${f}: ${trovate.length} pittogrammi dove non ne vanno (${trovate.slice(0, 6).join(' ')})`);
    continue;
  }
  const nuove = trovate.filter((e) => !voce.segni.includes(e));
  if (nuove.length) guai.push(`${f}: pittogrammi nuovi, non nell'inventario: ${nuove.join(' ')}`);
  ammesse += trovate.length;
}

// Le pagine COSTRUITE dal server sono servite quanto quelle statiche.
const costruite = [];
{
  const { renderLinkPage } = await import('../src/features/linkpagina.js');
  costruite.push(['pagina link', renderLinkPage(
    { attiva: true, titolo: 'Collaudo', tema: {}, blocchi: [{ tipo: 'link', label: 'X', url: 'https://x.tv/x', icona: 'link' }] },
    { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' })]);
  const { vetrinaHtml } = await import('../src/web/vetrina-vista.js');
  for (const l of ['it', 'en', 'es']) costruite.push([`vetrina ${l}`, vetrinaHtml(l)]);
  const { paginaGuida, GUIDE } = await import('../src/web/guide.js');
  costruite.push(['una guida', paginaGuida(GUIDE[0].slug)]);
}
for (const [nome, testo] of costruite) {
  const t = emojiIn(testo);
  if (t.length) guai.push(`${nome}: ${t.join(' ')}`);
}

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nL\'interfaccia la disegniamo noi, non il sistema di chi guarda.\n');
let verde = true;
verde = dice(guai.length === 0, `file serviti controllati: ${file} · pagine costruite: ${costruite.length}`, guai.slice(0, 5).join(' · ')) && verde;
verde = dice(true, `pittogrammi ammessi perche' sono dato o voce del bot, non interfaccia: ${ammesse}`) && verde;
if (guai.length > 5) console.error(`  …e altri ${guai.length - 5}`);
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
