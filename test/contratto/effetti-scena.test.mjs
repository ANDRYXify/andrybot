// L'AREA DEGLI EFFETTI E' UN ELEMENTO DELLA SCENA (docs/OVERLAY.md, «Gli ultimi
// pezzi fuori dalla scena»). Immagini e video comparivano al centro, grandi al
// massimo l'80% dello schermo, e lo Studio non li mostrava. Ora la loro area
// si sposta e si ridimensiona come ogni elemento; le misure sono in unita' del
// contenitore, cosi' nello Studio valgono per la tela e in onda per lo
// schermo; un premio con una posizione sua sta su uno strato a tutto schermo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const SKIN = leggi('src/web/public/overlay-skin.css');

test('sulla tela c\'e\' la sua area, con un esempio fatto come un effetto vero', () => {
  assert.ok(/out\.push\(\{ k: 'effetti', ico: ICO\.effetti, n: L\('Effetti a schermo'[^}]*cfg: 'overlayEffetti' \}\);/.test(APP));
  assert.ok(/const VESTITORE = \{[^}]*\beffetti: _vestiEffetti\b/.test(APP));
  assert.ok(/box\.innerHTML = '<img class="effetto dentro" alt="" src="' \+ EFFETTO_ESEMPIO \+ '">';/.test(APP), 'senza misure fisse, come l\'immagine vera');
  assert.ok(/effetti: \['effetti', \[[^\]]+\], 'posto'\]/.test(APP), 'e l\'ispettore dice cosa si sceglie qui');
});

test('le misure sono del contenitore, e la stessa regola centra l\'area in onda e sulla tela', () => {
  assert.ok(/^\.effetto \{ display: block; max-width: 80cqw; max-height: 80cqh;/m.test(SKIN), 'unita\' del contenitore, non dello schermo');
  assert.ok(/container-type: size;/.test(SKIN.slice(SKIN.indexOf('.ap-stage {'), SKIN.indexOf('.ap-stage {') + 200)), 'la tela e\' il contenitore');
  assert.ok(/#palco, \.ap-stage \.ap-palco \{ display: flex; align-items: center; justify-content: center; \}/.test(SKIN));
  assert.ok(/\.riquadro > \.effetto \{ max-width: 100%; max-height: 100%; \}/.test(SKIN), 'in un riquadro si adatta');
  assert.ok(!/max-width: 80vw/.test(HTML) && /#palco\.centro \{ inset: 0; \}/.test(HTML));
});

test('in diretta si posa come gli altri, e un premio con un posto suo resta sullo schermo intero', () => {
  assert.ok(/function posaEffetti\(\) \{ posizionaContenitore\(palco, MIO\.xy\.effetti, 'centro'\); \}/.test(OVL));
  assert.ok(/\(libero \? palcoLibero : palco\)\.appendChild\(el\);/.test(OVL) && /<div id="palco-libero"><\/div>/.test(HTML));
  for (const f of ['mostraImmagine', 'mostraVideo', 'mostraVideoChroma']) {
    const i = OVL.indexOf(`function ${f}(`);
    const corpo = OVL.slice(i, OVL.indexOf('\n}\n', i));
    assert.ok(corpo.includes('metti(') && corpo.includes('togliEffetto('), `${f} passa dall'area`);
  }
  assert.ok(/if \(!misurata\) \{\n        misurata = true;/.test(OVL), 'il video col green screen prende la sua misura: una tela nuova e\' 300 per 150, non 0');
});
