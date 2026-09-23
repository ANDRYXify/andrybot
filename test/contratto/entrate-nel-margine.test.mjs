// LE ENTRATE DI LATO NON PARTONO DA FUORI SCHERMO.
//
// Cambiando scheda le carte entrano scivolando di lato (32 px), la scheda che
// esce scivola via (7%) e i pezzi della nuova arrivano spostati (14 px). Sul
// computer il margine della pagina e' piu' largo di cosi' e non si nota niente.
// Su un telefono il margine e' 17,6 px: la carta partiva 14 px oltre il bordo
// destro, la pagina per un istante scorreva di lato e la carta entrava tagliata.
// Il collaudo della larghezza l'ha visto sulla scheda Telegram, dove una carta
// entra piu' tardi delle altre.
//
// La regola: nessuno spostamento orizzontale d'entrata o d'uscita dentro le
// schede supera il margine della pagina (`--margine-pagina`, lo stesso che fa
// da imbottitura a `.contenuto`). Cosi' parte al piu' dal bordo, mai oltre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const STILE = readFileSync(new URL('../../src/web/public/style.css', import.meta.url), 'utf8');
const ANIME = readFileSync(new URL('../../src/web/public/anime.css', import.meta.url), 'utf8');
const CSS = STILE + '\n' + ANIME;

function fotogrammi(nome) {
  const i = CSS.indexOf(`@keyframes ${nome} {`);
  assert.ok(i >= 0, `c'e' @keyframes ${nome}`);
  let d = 0, j = CSS.indexOf('{', i);
  const inizio = j;
  for (; j < CSS.length; j++) { if (CSS[j] === '{') d++; else if (CSS[j] === '}' && --d === 0) break; }
  return CSS.slice(inizio, j + 1);
}

const regole = [...CSS.replace(/@keyframes[\s\S]*?\}\s*\}/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim(), corpo: m[2] }));

test('il margine della pagina e\' uno solo, e fa da imbottitura a .contenuto', () => {
  assert.match(STILE, /\.contenuto \{\n  --margine-pagina: clamp\([^;]+\);[\s\S]*?padding: [^;]+ var\(--margine-pagina\) [^;]+;/);
  const ai = regole.filter((r) => /\.contenuto\s*$/.test(r.sel) && /padding-(left|right)\s*:/.test(r.corpo));
  assert.ok(ai.length >= 2, 'le schede a tutta larghezza hanno il loro margine');
  for (const r of ai) {
    assert.match(r.corpo, /--margine-pagina:/, `${r.sel.split('\n').pop()} dice il suo margine`);
    for (const m of r.corpo.matchAll(/padding-(?:left|right)\s*:\s*([^;]+);/g)) {
      assert.equal(m[1].trim(), 'var(--margine-pagina)', `${r.sel.split('\n').pop()}: l'imbottitura e' il margine`);
    }
  }
});

test('lo scivolo delle carte non supera il margine', () => {
  const valori = [...CSS.matchAll(/--rev-x:\s*([^;]+);/g)].map((m) => m[1].trim().replace(/\s*!important$/, ''));
  assert.ok(valori.length >= 3, 'trovo gli scivoli');
  for (const v of valori) {
    if (v === '0px') continue;
    assert.match(v, /^(?:calc\(-1 \* )?min\([\d.]+px, var\(--margine-pagina, [\d.]+px\)\)\)?$/, `--rev-x: ${v}`);
  }
});

// Lo spostamento orizzontale di ogni translate dei fotogrammi: il primo
// argomento di translate() e translate3d(), l'unico di translateX().
function orizzontali(testo) {
  const out = [];
  for (const m of testo.matchAll(/translate(X|3d)?\(/g)) {
    let d = 1, j = m.index + m[0].length;
    const args = [''];
    for (; j < testo.length && d > 0; j++) {
      const c = testo[j];
      if (c === '(') d++;
      else if (c === ')' && --d === 0) break;
      if (c === ',' && d === 1) args.push(''); else args[args.length - 1] += c;
    }
    const x = args[0].trim();
    if (!/^0(?:px)?$/.test(x)) out.push({ x, tutto: `translate${m[1] || ''}(${args.join(',')})` });
  }
  return out;
}

test('le schede che entrano ed escono di lato non passano il margine', () => {
  const nomi = new Set();
  for (const r of regole.filter((x) => x.sel.includes('pannello-scheda'))) {
    for (const m of r.corpo.matchAll(/animation(?:-name)?\s*:\s*([\w-]+)/g)) if (m[1] !== 'none') nomi.add(m[1]);
  }
  const laterali = [...nomi].filter((n) => orizzontali(fotogrammi(n)).length);
  assert.ok(laterali.length >= 4, `trovo le entrate di lato: ${laterali.join(', ')}`);
  for (const n of laterali) {
    for (const { x, tutto } of orizzontali(fotogrammi(n))) {
      assert.match(x, /^(?:calc\(-1 \* )?min\([\d.]+(?:px|%), var\(--margine-pagina, [\d.]+(?:px|%)\)\)\)?$|^var\(--rev-x, 0(?:px)?\)$/, `${n}: ${tutto} e' legato al margine`);
    }
  }
});
