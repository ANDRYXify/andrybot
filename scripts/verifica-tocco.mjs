// Cancello del TOCCO: quello che si accende passandoci sopra col mouse non deve
// restare acceso dopo averlo toccato con un dito.
//
// Perche' esiste. Su un telefono non esiste il "passare sopra": esiste il
// tocco. Ma il browser, dopo un tocco, lascia l'elemento in `:hover` finche' non
// se ne tocca un altro — e nessuno ci esce mai davvero. Con un tema che al
// passaggio del mouse alza la cosa di un pixel e le mette un timbro sotto, il
// risultato e' un contorno che resta acceso sull'ultimo tasto premuto. Sembra un
// difetto, e in effetti lo e'.
//
// Non e' una cosa che si vede provando il sito: sul portatile e' corretto.
//
// La regola. Ogni regola con `:hover` sta dentro `@media (hover: hover)`, cioe'
// vale solo dove un puntatore c'e' davvero. Non e' una convenzione da ricordare:
// una regola nuova scritta fuori fa diventare rosso questo cancello.
//
// Si legge il CSS con un piccolo analizzatore invece che a espressioni regolari,
// perche' bisogna sapere se una regola sta DENTRO un @media o fuori — e questo
// una ricerca per testo non lo sa.
//
// Uso: node scripts/verifica-tocco.mjs             (esce 1 se qualcuna e' fuori)
//      node scripts/verifica-tocco.mjs --selftest  (ne scrive una fuori apposta)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = ['style.css', 'anime.css', 'vetrina.css', 'tema.css', 'pagina.css', 'overlay-skin.css'];

// Le pseudo-classi che il dito lascia accese. `:active` no: dura quanto il tocco.
const APPICCICOSE = [':hover'];

function pezzi(css) {
  const nodi = [];
  let i = 0;
  let inizio = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') { const f = css.indexOf('*/', i); i = f < 0 ? css.length : f + 2; continue; }
    if (css[i] === '{') {
      const prelude = css.slice(inizio, i);
      let liv = 1;
      let j = i + 1;
      while (j < css.length && liv > 0) {
        if (css[j] === '/' && css[j + 1] === '*') { const f = css.indexOf('*/', j); j = f < 0 ? css.length : f + 2; continue; }
        if (css[j] === '{') liv++;
        else if (css[j] === '}') liv--;
        j++;
      }
      nodi.push({ prelude: prelude.trim(), corpo: css.slice(i + 1, j - 1) });
      i = j; inizio = i;
      continue;
    }
    i++;
  }
  return nodi;
}

const fuori = [];
function guarda(css, file, protetto) {
  for (const n of pezzi(css)) {
    if (n.prelude.startsWith('@')) {
      if (/^@(keyframes|font-face|property|counter-style)/.test(n.prelude)) continue;
      guarda(n.corpo, file, protetto || /\(\s*hover\s*:\s*hover\s*\)/.test(n.prelude));
      continue;
    }
    if (protetto) continue;
    for (const p of APPICCICOSE) {
      if (n.prelude.includes(p)) { fuori.push({ file, sel: n.prelude.replace(/\s+/g, ' ').slice(0, 70) }); break; }
    }
  }
}

// L'autoprova: si scrive una regola fuori dal riparo e si pretende il rosso. Un
// cancello che non si e' mai visto rosso non dice niente.
const SELFTEST = process.argv.includes('--selftest');
const VIA_PROVA = join(RAD, 'src/web/public/style.css');
const ORIG = SELFTEST ? readFileSync(VIA_PROVA, 'utf8') : null;
if (SELFTEST) writeFileSync(VIA_PROVA, ORIG + '\n.prova-del-cancello:hover { color: red; }\n');

let dentro = 0;
for (const f of FILE) {
  let css;
  try { css = readFileSync(join(RAD, 'src/web/public', f), 'utf8'); } catch { continue; }
  dentro += (css.match(/@media \(hover: hover\)/g) || []).length;
  guarda(css, f, false);
}

if (SELFTEST) writeFileSync(VIA_PROVA, ORIG);

for (const x of fuori.slice(0, 12)) console.log(`  ✗ ${x.file}: ${x.sel}`);
if (fuori.length > 12) console.log(`  … e altre ${fuori.length - 12}`);
console.log(`\n${dentro} regole al riparo dietro «c'e' un puntatore».`);
if (fuori.length) {
  console.log(`${fuori.length} ${fuori.length === 1 ? 'e\' rimasta fuori' : 'sono rimaste fuori'}: sul telefono resterebbero accese dopo il tocco.`);
} else {
  console.log('Niente resta acceso dopo un tocco. ✓');
}
if (SELFTEST) {
  const visto = fuori.some((x) => x.sel.includes('prova-del-cancello'));
  console.log(visto ? '\nL\'autoprova e\' stata vista. Il cancello e\' vero. ✓' : '\nL\'autoprova NON e\' stata vista: il cancello non guarda dove dice.');
  process.exit(visto ? 0 : 1);
}
process.exit(fuori.length ? 1 : 0);
