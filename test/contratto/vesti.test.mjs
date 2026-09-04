// Le VESTI dell'overlay.
//
// Erano nove, complete, e si potevano scegliere in un momento solo: quando si
// creava un overlay nuovo. Dopo restavano ventitré manopole per l'alert,
// diciannove per la chat e dodici per ogni widget — undici delle quali sono le
// stesse ripetute tre volte. Adesso la veste si sceglie sempre, da ogni barra,
// e veste anche obiettivi e player.
//
// Qui si tiene fermo che ogni valore scritto in una veste sia un valore che
// ESISTE: un refuso in `forma: 'fumeto'` non rompe niente, semplicemente non
// veste — ed è il modo peggiore di sbagliare, perché non lo dice nessuno.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  FORME_OVL, MATERIE_OVL, CORNICI_OVL, COMP_OVL, FONT_OVL, PESO_OVL, MAIUSC_OVL,
  ANIM_ALERT, ANIM_CHAT, DIM_CHAT, DIM_WIDGET, USCITA_OVL,
  TEMA_MUS, SFONDO_MUS, CORPO_MUS, ENTRATA_MUS,
} from '../../src/web/stile.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

// L'elenco vive in app.js, che è uno script classico: lo si legge di lì invece
// di tenerne una seconda copia qui, che è il difetto che questo file combatte.
const VESTI = (() => {
  const i = APP.indexOf('const TEMPLATE_BUILTIN = [');
  assert.ok(i >= 0, 'non trovo l\'elenco delle vesti in app.js');
  const j = APP.indexOf('\n];', i);
  assert.ok(j > i, 'l\'elenco delle vesti non si chiude');
  // eslint-disable-next-line no-new-func
  return new Function(`return ${APP.slice(i + 'const TEMPLATE_BUILTIN = '.length, j + 2)}`)();
})();

const ENUM = {
  forma: FORME_OVL, materia: MATERIE_OVL, cornice: CORNICI_OVL, composizione: COMP_OVL,
  font: FONT_OVL, peso: PESO_OVL.concat(PESO_OVL.map(Number)), maiuscolo: MAIUSC_OVL,
  uscita: ['come'].concat(USCITA_OVL),
};
const ENUM_PARTE = {
  al: { ...ENUM, animazione: ANIM_ALERT },
  ch: { ...ENUM, animazione: ANIM_CHAT, dim: DIM_CHAT },
  go: { ...ENUM, dim: DIM_WIDGET },
  mu: { tema: TEMA_MUS, sfondo: SFONDO_MUS, corpo: CORPO_MUS, entrata: ENTRATA_MUS },
};
const COLORE = /^#[0-9a-fA-F]{6}$/;

test('ci sono le vesti, e ognuna veste tutto', () => {
  assert.ok(VESTI.length >= 9, `vesti trovate: ${VESTI.length}`);
  for (const v of VESTI) {
    assert.ok(v.nome, 'una veste senza nome');
    for (const parte of ['al', 'ch', 'go', 'mu']) {
      assert.ok(v.dati[parte], `«${v.nome}» non veste ${parte}`);
    }
    assert.match(v.dati.acc, COLORE, `«${v.nome}»: accento non è un colore`);
  }
});

test('ogni valore scritto in una veste è un valore che esiste', () => {
  for (const v of VESTI) {
    for (const [parte, ammessi] of Object.entries(ENUM_PARTE)) {
      for (const [campo, val] of Object.entries(v.dati[parte] || {})) {
        if (ammessi[campo]) {
          assert.ok(ammessi[campo].includes(val),
            `«${v.nome}» → ${parte}.${campo} = «${val}», che non è fra: ${ammessi[campo].join(', ')}`);
        }
        if (/^(sfondo|testo|accento)$/.test(campo) && parte !== 'mu') {
          assert.match(String(val), COLORE, `«${v.nome}» → ${parte}.${campo} non è un colore`);
        }
      }
    }
  }
});

test('la veste si può scegliere da ogni barra, non solo creando un overlay', () => {
  assert.ok(APP.includes('function vesteRiga('), 'manca la riga della veste');
  assert.ok(APP.includes('function mettiVesti('), 'la riga della veste non viene messa da nessuna parte');
  assert.ok(APP.includes("querySelectorAll('.asp-blocco')"), 'la riga non arriva a tutti i blocchi d\'aspetto');
});

test('c\'è la veste manga, e veste anche il player', () => {
  const manga = VESTI.find((v) => /manga/i.test(v.nome));
  assert.ok(manga, 'la veste manga non c\'è più');
  assert.equal(manga.dati.al.font, 'manga');
  assert.equal(manga.dati.ch.font, 'manga');
  assert.equal(manga.dati.go.font, 'manga');
  assert.equal(manga.dati.mu.tema, 'manga');
});
