// LE ANIMAZIONI SONO DEL TEMA. Un tema del player è tre cose nel foglio, dentro
// il suo blocco: la texture della carta, la figura dietro o attorno alla
// copertina, e il suo moto. Il codice non sa niente: mette la classe.
//
// Qui si fissa quello che rende sicuro aggiungerne uno. Ciò che si muove vive
// in uno pseudo-elemento o nel velo, mai in un nodo che l'anteprima misura:
// una rotazione cambia il rettangolo che getBoundingClientRect legge, e il
// cancello «editor = diretta» smetterebbe di essere vero. Ciò che gira parte
// in pausa, si accende con «suona» e con «riduci animazioni» si ferma. E ogni
// tema passa dal cancello dell'anteprima e ha un nome nella tendina.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEMA_MUS } from '../../src/web/stile.js';

const CSS = readFileSync('src/web/public/overlay-skin.css', 'utf8');
const APP = readFileSync('src/web/public/app.js', 'utf8');
const GATE = readFileSync('scripts/verifica-anteprima.mjs', 'utf8');
const regole = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corpo: m[2] }));
const diTema = (t) => regole.filter((r) => r.sel.includes(`.tema-${t}`));
const nomeMoto = (r) => (r.corpo.match(/animation(?:-name)?\s*:\s*([a-z][\w-]*)/) || [])[1];
const anima = (r) => { const n = nomeMoto(r); return !!n && n !== 'none'; };
const chiaveDi = (nome) => CSS.slice(CSS.indexOf(`@keyframes ${nome} `), CSS.indexOf('}\n', CSS.indexOf(`@keyframes ${nome} `)) + 2);

test('ogni tema ha il suo blocco nel foglio, e CD ed esagono ci sono', () => {
  for (const t of TEMA_MUS) assert.ok(diTema(t).length >= 1, t);
  assert.ok(TEMA_MUS.includes('cd') && TEMA_MUS.includes('esagono'));
});

test('quello che si muove in un tema vive in uno pseudo-elemento o nel velo', () => {
  for (const t of TEMA_MUS) for (const r of diTema(t)) {
    if (!anima(r)) continue;
    for (const s of r.sel.split(',').map((x) => x.trim())) {
      if (!s.includes(`.tema-${t}`)) continue;
      assert.match(s, /(::before|::after|\.m-velo)$/, `${t}: «${s}» anima un nodo che l'anteprima misura`);
    }
  }
});

test('ciò che gira parte in pausa, si accende con «suona» e si spegne con «riduci animazioni»', () => {
  const ridotto = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
  for (const s of ['.ovl-musica .m-cover::before', '.ovl-musica .m-cover::after', '.ovl-musica .m-velo']) assert.ok(ridotto.includes(s), s);
  for (const t of TEMA_MUS) for (const r of diTema(t)) {
    if (!anima(r) || r.sel.includes('--battito')) continue;
    if (!/transform/.test(chiaveDi(nomeMoto(r)))) continue;   // un lampeggio può restare; una rotazione no
    assert.match(r.corpo, /animation-play-state\s*:\s*paused/, `${t}: «${r.sel}» gira anche da fermo`);
    assert.ok(regole.some((x) => x.sel.includes(`.tema-${t}.suona`) && /running/.test(x.corpo)), `${t}: niente lo accende con .suona`);
  }
});

test('ogni tema passa dal cancello dell\'anteprima e ha un nome nella tendina', () => {
  const lista = GATE.match(/for \(const tema of \[([^\]]*)\]\)/)[1];
  const da = APP.indexOf('const TEMA_OPTS = () => [');
  const opts = APP.slice(da, APP.indexOf('];', da));
  for (const t of TEMA_MUS) {
    assert.ok(lista.includes(`'${t}'`), `${t} manca dal cancello`);
    assert.ok(opts.includes(`['${t}',`), `${t} manca dalla tendina`);
  }
});

test('la veste «Esagoni» è un esagono, come «Nastro» è una cassetta', () => {
  const riga = APP.slice(APP.indexOf("nome: 'Esagoni'"), APP.indexOf('\n', APP.indexOf("nome: 'Esagoni'")));
  assert.match(riga, /mu: \{ tema: 'esagono'/);
});
