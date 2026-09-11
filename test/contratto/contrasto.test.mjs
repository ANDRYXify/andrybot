// IL CONTRASTO DEL TEMA, contato invece che guardato.
//
// «Forte» non e' «leggibile»: un grigio che sul bianco sembra elegante puo'
// stare a 3.2:1, e chi legge da un telefono al sole non lo vede. Lo standard
// (WCAG AA) chiede 4.5:1 per il testo normale, e questo e' un CONTO, non
// un'opinione — quindi si fa qui, non a occhio.
//
// Le coppie elencate sono quelle che il sito mette DAVVERO a schermo: misurate
// sulle pagine vere (pannello e vetrina, tema chiaro e scuro) prima di
// scriverle. Non ci sono coppie immaginarie: un cancello che pretende cose che
// non succedono fa cambiare la tavolozza per niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const css = readFileSync(join(RAD, 'src/web/public/tema.css'), 'utf8');

function blocco(chiave) {
  const i = css.indexOf(chiave);
  assert.ok(i >= 0, `il blocco ${chiave} esiste`);
  const out = {};
  for (const m of css.slice(i, css.indexOf('}', i)).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const CHIARO = blocco(':root {');
const SCURO = { ...CHIARO, ...blocco(':root[data-theme="dark"]') };

const hx = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const canale = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const luce = (c) => 0.2126 * canale(c[0]) + 0.7152 * canale(c[1]) + 0.0722 * canale(c[2]);
export function contrasto(a, b) {
  const l1 = luce(hx(a)), l2 = luce(hx(b));
  const [x, y] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (x + 0.05) / (y + 0.05);
}

// Le carte e la pagina. Qui sopra ci sta il testo lungo: la soglia e' piena.
const FONDI = ['--bg', '--surface', '--surface-2-tinta'];
const INCHIOSTRI = ['--testo', '--testo-2', '--testo-3', '--g-bot'];

for (const [nome, t] of [['chiaro', CHIARO], ['scuro', SCURO]]) {
  test(`tema ${nome}: ogni inchiostro si legge su ogni carta`, () => {
    for (const i of INCHIOSTRI) {
      assert.ok(t[i], `${i} esiste`);
      for (const f of FONDI) {
        const r = contrasto(t[i], t[f]);
        assert.ok(r >= 4.5, `${i} (${t[i]}) su ${f} (${t[f]}) = ${r.toFixed(2)} — serve 4.5`);
      }
    }
  });

  test(`tema ${nome}: quello che sta SOPRA un colore pieno si legge`, () => {
    // Un bottone colorato: la scritta ci sta dentro, non accanto. Il rosso del
    // «cancella tutto» chiaro vuole bianco e scuro vuole inchiostro — un colore
    // solo per tutti e due i temi fallisce per forza da una parte.
    for (const [sopra, sotto] of [['--su-acc', '--acc'], ['--su-rosso', '--rosso']]) {
      assert.ok(t[sopra] && t[sotto], `${sopra}/${sotto} esistono`);
      const r = contrasto(t[sopra], t[sotto]);
      assert.ok(r >= 4.5, `${sopra} (${t[sopra]}) su ${sotto} (${t[sotto]}) = ${r.toFixed(2)} — serve 4.5`);
    }
  });

  test(`tema ${nome}: le targhette di stato si leggono sul loro fondo`, () => {
    for (const c of ['verde', 'rosso', 'ambra']) {
      const r = contrasto(t[`--${c}`], t[`--${c}-soft`]);
      assert.ok(r >= 4.5, `--${c} (${t[`--${c}`]}) su --${c}-soft (${t[`--${c}-soft`]}) = ${r.toFixed(2)}`);
    }
  });
}

test('il conto e\' quello vero, non uno che dice sempre di si\'', () => {
  // Se questo conto fosse sbagliato, tutte le prove qui sopra sarebbero verdi
  // per finta. I due estremi e un caso noto lo inchiodano.
  assert.equal(Math.round(contrasto('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(contrasto('#777777', '#777777'), 1);
  assert.ok(contrasto('#8a8378', '#f2efe8') < 4.5, 'il grigio di prima non passava');
  assert.ok(contrasto('#68625a', '#f2efe8') >= 4.5, 'quello di adesso passa');
});
