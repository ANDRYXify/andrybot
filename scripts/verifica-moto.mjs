// Cancello del MOVIMENTO.
//
// Una regola sola, e non e' un'opinione: si animano `transform` e `opacity`, che
// il browser puo' dare alla scheda video. Muovere larghezza, altezza, margini o
// `inset` costringe a ricalcolare la disposizione della pagina a ogni fotogramma,
// e l'animazione perde colpi — e' esattamente il difetto che si sente come
// «lagga». (Chi scrive queste righe ci era appena cascato: la sagoma che si
// allarga sui pulsanti animava `inset`.)
//
// La seconda regola: chi ha chiesto meno movimento deve ottenerlo. Ogni
// animazione dichiarata deve avere il suo spegnimento in
// `prefers-reduced-motion`.
//
// Uso: node scripts/verifica-moto.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src', 'web', 'public');
const FOGLI = ['style.css', 'anime.css', 'vetrina.css', 'overlay-skin.css'];

// Quel che costringe a rifare i conti della disposizione, o a ridipingere tutto.
const LAYOUT = ['width', 'height', 'top', 'right', 'bottom', 'left', 'inset',
  'margin', 'padding', 'border-width', 'font-size', 'line-height', 'flex-basis',
  'min-width', 'max-width', 'min-height', 'max-height', 'grid-template-columns'];

const guai = [];
let transizioni = 0, fotogrammi = 0;

for (const nome of FOGLI) {
  const css = readFileSync(join(PUB, nome), 'utf8');

  // 1) le transizioni: si guarda cosa dichiarano di muovere
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)[;}]/g)) {
    transizioni++;
    const corpo = m[1];
    if (/\ball\b/.test(corpo)) { guai.push(`${nome}: «transition: all» muove qualunque cosa, anche il layout`); continue; }
    for (const p of LAYOUT) {
      if (new RegExp(`(^|[,\\s])${p}\\s+[\\d.]`).test(corpo) || new RegExp(`(^|[,\\s])${p}\\s*($|,)`).test(corpo)) {
        guai.push(`${nome}: una transizione muove «${p}», che rifà i conti della pagina a ogni fotogramma`);
      }
    }
  }

  // 2) i fotogrammi chiave: si guarda cosa cambiano davvero
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    fotogrammi++;
    const inizio = m.index + m[0].length;
    let d = 1, i = inizio;
    while (i < css.length && d > 0) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; }
    const corpo = css.slice(inizio, i - 1);
    for (const p of LAYOUT) {
      if (new RegExp(`(^|[;{\\s])${p}\\s*:`).test(corpo)) {
        guai.push(`${nome}: i fotogrammi «${m[1]}» cambiano «${p}», che rifà i conti della pagina`);
      }
    }
  }
}

// 3) chi chiede meno movimento lo ottiene
const conAnim = [];
for (const nome of FOGLI) {
  const css = readFileSync(join(PUB, nome), 'utf8');
  const nomi = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
  if (!nomi.length) continue;
  const i = css.indexOf('prefers-reduced-motion');
  conAnim.push({ nome, nomi: nomi.length, spegne: i >= 0 });
}
for (const f of conAnim) {
  if (!f.spegne) guai.push(`${f.nome}: dichiara ${f.nomi} animazioni e non le spegne per chi chiede meno movimento`);
}

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nIl movimento sta sulla scheda video, non sulla disposizione.\n');
let verde = true;
verde = dice(guai.length === 0, `transizioni lette: ${transizioni} · gruppi di fotogrammi: ${fotogrammi}`, guai.slice(0, 6).join(' · ')) && verde;
verde = dice(conAnim.every((f) => f.spegne), `chi chiede meno movimento lo ottiene: ${conAnim.length} fogli`) && verde;
if (guai.length > 6) console.error(`  …e altri ${guai.length - 6}`);
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
