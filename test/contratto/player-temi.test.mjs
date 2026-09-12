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

test('quello che gira senza fine in un tema vive in uno pseudo-elemento o nel velo', () => {
  for (const t of TEMA_MUS) for (const r of diTema(t)) {
    if (!anima(r) || !/infinite/.test(r.corpo)) continue;
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
    if (!anima(r) || !/infinite/.test(r.corpo) || r.sel.includes('--battito')) continue;
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

test('ogni tema con una figura entra ed esce a modo suo, e l\'uscita finisce prima che il nodo sparisca', () => {
  const OVL = readFileSync('src/web/public/overlay-app.js', 'utf8');
  const tolto = Number(OVL.match(/musicaEl\.uscita = setTimeout\(via, (\d+)\)/)[1]);
  const secondi = (s) => (s.match(/(\d*\.?\d+)s/g) || []).reduce((a, x) => a + parseFloat(x), 0);
  for (const t of TEMA_MUS) {
    if (t === 'nessuno') continue;
    const dentro = regole.filter((r) => r.sel.includes(`.tema-${t}.dentro`) && /transition:/.test(r.corpo));
    const esce = regole.filter((r) => r.sel.includes(`.tema-${t}.esce`) && /transition:/.test(r.corpo));
    assert.ok(dentro.length, `${t}: nessuna entrata`);
    assert.ok(esce.length, `${t}: nessuna uscita`);
    for (const r of [...dentro, ...esce]) {
      for (const parte of r.corpo.match(/transition:\s*([^;]+)/)[1].split(/,(?![^(]*\))/)) {
        assert.match(parte.trim(), /^(translate|scale|opacity|rotate|transform|filter|clip-path)\b/, `${t}: «${parte.trim()}» non è un moto da compositor`);
      }
    }
    for (const r of esce) for (const parte of r.corpo.match(/transition:\s*([^;]+)/)[1].split(/,(?![^(]*\))/)) {
      assert.ok(secondi(parte) * 1000 <= tolto, `${t}: l'uscita «${parte.trim()}» dura più dei ${tolto} ms dopo cui il nodo sparisce`);
    }
  }
  const ridotto = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
  const ferme = [...ridotto.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /transition:\s*none/.test(m[2])).map((m) => m[1]).join(' ');
  for (const s of ['.ovl-musica .m-cover::after', '.ovl-musica .m-velo', '.ovl-musica .m-riga']) assert.ok(ferme.includes(s), `con «riduci animazioni» ${s} non fa gesti`);
});

test('la veste «Esagoni» è un esagono, come «Nastro» è una cassetta', () => {
  const riga = APP.slice(APP.indexOf("nome: 'Esagoni'"), APP.indexOf('\n', APP.indexOf("nome: 'Esagoni'")));
  assert.match(riga, /mu: \{ tema: 'esagono'/);
});

// L'entrata parte davvero solo se il primo stile del nodo è stato calcolato
// PRIMA di aggiungere «dentro». Il rAF che la aggiunge corre prima del ricalcolo
// di stile del fotogramma in cui il nodo è nato: senza una lettura di layout in
// mezzo, il nodo nasce già «dentro» e nessuna transizione ha un punto di partenza.
test('in diretta il primo stile del player è calcolato prima di aggiungere «dentro»', () => {
  const OVL = readFileSync('src/web/public/overlay-app.js', 'utf8');
  assert.match(OVL, /if \(nato\) \{ void el\.offsetWidth; requestAnimationFrame\(\(\) => el\.classList\.add\('dentro'\)\); \}/);
});

// Chi gira prende giri e frena: una rampa d'avvio e una di frenata sulla
// proprietà «rotate», sommate al giro costante che sta su «transform». L'angolo
// di frenata è ω·T/2 e vive in --frenata, per tema. E anche le animazioni finite
// dell'uscita (il tubo catodico che si spegne) finiscono prima che il nodo sparisca.
test('vinile, CD e cassetta prendono giri all\'entrata e frenano all\'uscita', () => {
  assert.ok(CSS.includes('@keyframes mus-avvia') && CSS.includes('@keyframes mus-frena'));
  for (const t of ['vinile', 'cd', 'cassetta']) {
    const dentro = diTema(t).filter((r) => r.sel.includes(`.tema-${t}.dentro`) && /mus-avvia/.test(r.corpo));
    const esce = diTema(t).filter((r) => r.sel.includes(`.tema-${t}.esce`) && /mus-frena/.test(r.corpo));
    assert.ok(dentro.length, `${t}: nessuna rampa d'avvio`);
    assert.ok(esce.length, `${t}: nessuna frenata`);
    for (const r of esce) assert.match(r.corpo, /animation-play-state:\s*paused,\s*running/, `${t}: alla frenata il giro di base resta in pausa e frena solo la rampa`);
    assert.ok(diTema(t).some((r) => /--frenata:\s*[\d.]+deg/.test(r.corpo)), `${t}: manca --frenata`);
  }
  const OVL = readFileSync('src/web/public/overlay-app.js', 'utf8');
  const tolto = Number(OVL.match(/musicaEl\.uscita = setTimeout\(via, (\d+)\)/)[1]);
  const secondi = (s) => (s.match(/(\d*\.?\d+)s/g) || []).reduce((a, x) => a + parseFloat(x), 0);
  for (const t of TEMA_MUS) for (const r of diTema(t)) {
    if (!r.sel.includes(`.tema-${t}.esce`) || !anima(r) || /infinite/.test(r.corpo)) continue;
    const dich = r.corpo.match(/animation:\s*([^;]+)/)[1];
    for (const parte of dich.split(/,(?![^(]*\))/)) if (!/infinite/.test(parte)) assert.ok(secondi(parte) * 1000 <= tolto, `${t}: «${parte.trim()}» finisce dopo i ${tolto} ms`);
  }
});
