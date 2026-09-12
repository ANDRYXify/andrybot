// IL RIQUADRO: un perimetro a cui l'elemento si adatta.
//
// Due modi di posare: il punto ({x, y, s, r}) e il riquadro ({x, y, w, h, r}).
// La presenza di w e h decide il modo, in un posto solo per il dato (xyOk) e in
// un posto solo per la resa (riquadro.js, letto da tutte e due le pagine). Le
// misure vere le prende scripts/verifica-anteprima.mjs; qui si tiene fermo il
// disegno: la posa avviene dopo il contenuto (la misura vuole il contenuto), la
// chat taglia dall'alto, l'editor converte senza salti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const S = await import('../../src/web/stile.js');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const RQ = leggi('src/web/public/riquadro.js');
const SKIN = leggi('src/web/public/overlay-skin.css');

test('il dato: un riquadro ha w e h e non esce dalla tela; una posa ha s', () => {
  assert.deepEqual(S.xyOk({ x: 10, y: 10, w: 16.67, h: 25, r: 0 }), { x: 10, y: 10, w: 16.67, h: 25, r: 0 });
  assert.deepEqual(S.xyOk({ x: 95, y: 95, w: 20, h: 20 }), { x: 80, y: 80, w: 20, h: 20, r: 0 }, 'x + w e y + h non superano 100');
  assert.deepEqual(S.xyOk({ x: 0, y: 0, w: 0.5, h: 150, r: 400 }), { x: 0, y: 0, w: 2, h: 100, r: 180 }, 'mai sotto due centesimi, mai oltre la tela');
  assert.deepEqual(S.xyOk({ x: 10, y: 10, w: 0, h: 10 }), { x: 10, y: 10, s: 100, r: 0 }, 'senza una misura vera e\' un punto');
  assert.ok(!('s' in S.xyOk({ x: 1, y: 1, w: 5, h: 5 })), 'un riquadro non porta la scala');
});

test('una resa sola, letta da tutte e due le pagine, e dopo il contenuto', () => {
  for (const [pagina, app] of [['overlay.html', 'overlay-app.js'], ['index.html', 'app.js']]) {
    const h = leggi('src/web/public/' + pagina);
    const iR = h.search(/<script src="\/?riquadro\.js"/), iA = h.search(new RegExp('<script src="/?' + app.replace('.', '\\.') + '"'));
    assert.ok(iR >= 0 && iA > iR, `${pagina}: riquadro.js prima di ${app}`);
  }
  assert.ok(/var k = Math\.min\(\(w \/ 100\) \* t\.w \/ W, \(h \/ 100\) \* t\.h \/ H\);/.test(RQ), 'un fattore solo, il minimo dei due: niente deformazioni');
  assert.ok(/window\.SB_RIQUADRO = \{ posa: posa, togli: togli, ritaglia: ritaglia, trabocca: trabocca, e: eRiquadro \}/.test(RQ));
  assert.ok(/return primo\.offsetTop < -1 \|\| \(ultimo\.offsetTop \+ ultimo\.offsetHeight\) > box\.clientHeight \+ 1;/.test(RQ),
    'il trabocco si misura sulle righe, non su scrollHeight: quel che sta sopra il bordo scrollHeight non lo vede');
  const dopo = (fn, prima, poi) => {
    const i = OVL.indexOf(`function ${fn}(`);
    const corpo = OVL.slice(i, OVL.indexOf('\n}\n', i));
    assert.ok(corpo.indexOf(prima) >= 0 && corpo.indexOf(poi) > corpo.indexOf(prima), `${fn}: la posa viene dopo il contenuto`);
  };
  dopo('widget', ".querySelector('.w-testo').innerHTML", 'posaElemento(el,');
  dopo('unGoal', "classList.toggle('pieno'", "posaElemento(el, 'goal:'");
  dopo('disegnaTimer', ".querySelector('.t-num').textContent", "vestiElemento(el, cfg, 'nessuna', 'timer')");
  dopo('disegnaMusica', "scrivi(el.querySelector('.m-scorri2')", "vestiElemento(el, cfg, 'nessuna', 'musica')");
  dopo('mostraAlertProssimo', 'alertBox.appendChild(card);', 'posizionaContenitore(alertBox,');
  dopo('contatore', 'el.style.fontFamily = fontStackCont(d.font);', 'window.SB_RIQUADRO.posa(el, mio, {})');
  assert.ok(/if \(chatBox\.classList\.contains\('riquadro'\)\) window\.SB_RIQUADRO\.ritaglia\(chatBox\);/.test(OVL), 'la chat nel riquadro taglia dall\'alto');
  assert.ok(/if \(st\.larghezza && !chatBox\.classList\.contains\('riquadro'\)\)/.test(OVL), 'nel riquadro la larghezza e\' quella del riquadro');
});

test('l\'editor: la stessa resa, la conversione senza salti, i bordi che si agganciano', () => {
  assert.ok(/window\.SB_RIQUADRO\.posa\(el, xy, \{ tela: \{ w: OVL_W, h: OVL_H \}, chat, dentro: chat \|\| el\.classList\.contains\('alert-card'\) \? null : el\.firstElementChild \}\);/.test(APP),
    'la tela passa le sue misure, e il tetto di larghezza va sull\'elemento dentro l\'involucro, come in diretta sta sull\'elemento');
  assert.ok(/if \(o\.dentro\) \{ o\.dentro\.style\.maxWidth = '100%'; el\._rqDentro = o\.dentro; \}/.test(RQ), 'riquadro.js lo applica prima di misurare');
  assert.ok(/const rett = _rettDi\(k\);\n\s*if \(!rett\) return;\n\s*st = \{ x: rett\.x, y: rett\.y, w: rett\.w, h: rett\.h, r: Number\(st\.r\) \|\| 0 \};/.test(APP), 'tirare un bordo di un punto lo fa riquadro dal rettangolo che occupa');
  assert.ok(/for \(let i = 0; i <= 12; i\+\+\) cand\.push\(\{ v: _arr\(i \* 100 \/ 12\)/.test(APP), 'i bordi si agganciano alle dodici caselle della griglia');
  assert.ok(/id="insp-w"/.test(APP) && /id="insp-h"/.test(APP) && /id="insp-riq"/.test(APP), 'larghezza, altezza e la spunta nelle proprieta\'');
  assert.ok(/if \(window\.SB_RIQUADRO\.e\(_posCorrente\(chiave\) \|\| \{\}\)\) \{ _trascinaRiquadro\(chiave, e\); return; \}/.test(APP), 'trascinare un riquadro sposta il riquadro');
  assert.ok(/#ap-riquadro:not\(\.attivo\) \.ap-rq-no/.test(SKIN) && /\.ap-stage \.ap-el\.nel-riquadro \.ap-handle \{ display: none; \}/.test(SKIN), 'sul punto solo i lati, sul riquadro otto maniglie e niente maniglia di scala');
  assert.ok(/#chatlive\.riquadro, \.ap-chat\.riquadro \{ justify-content: flex-end; overflow: hidden; \}/.test(SKIN) && /\.riquadro \.chat-riga \{ max-width: 100%; white-space: normal; overflow-wrap: anywhere; \}/.test(SKIN), 'il testo va a capo, la chat non trabocca');
});
