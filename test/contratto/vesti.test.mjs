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
import { FONT_LINKPAGE } from '../../src/db.js';
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


// ── I temi della PAGINA LINK ──────────────────────────────────────────────
// Stesso difetto possibile, stessa cura: un valore che non esiste non rompe
// niente, semplicemente non veste.

const TEMI_LINK = (() => {
  const i = APP.indexOf('const TEMI_PRONTI = [');
  assert.ok(i >= 0, 'non trovo i temi della pagina link');
  const j = APP.indexOf('\n];', i);
  const testo = APP.slice(i + 'const TEMI_PRONTI = '.length, j + 2);
  const t = APP.slice(APP.indexOf('const _tema = ('), APP.indexOf('const TEMI_PRONTI'));
  // eslint-disable-next-line no-new-func
  return new Function(`${t} return ${testo}`)();
})();

const AMMESSI_LINK = {
  sfondoTipo: ['tinta', 'gradiente', 'immagine'],
  effetto: ['nessuno', 'aurora', 'maglia', 'grana', 'bolle', 'stelle', 'onde', 'griglia',
    'synthwave', 'neonpulse', 'particelle', 'matrix', 'nebulosa', 'scanline', 'raggi'],
  font: FONT_LINKPAGE,
  stileBtn: ['pieno', 'contorno', 'vetro'],
  ombraTipo: ['nessuna', 'morbida', 'dura'],
  anim: ['nessuna', 'fade', 'rise', 'pop'],
  avatarForma: ['cerchio', 'quadrato', 'nessuno'],
  allinea: ['centro', 'sinistra'],
};

test('ogni valore dei temi della pagina link è un valore che esiste', () => {
  assert.ok(TEMI_LINK.length >= 12, `temi trovati: ${TEMI_LINK.length}`);
  const visti = new Set();
  for (const t of TEMI_LINK) {
    assert.ok(t.id && t.nome, 'un tema senza id o nome');
    assert.ok(!visti.has(t.id), `due temi con lo stesso id: ${t.id}`);
    visti.add(t.id);
    for (const [campo, val] of Object.entries(t.tema)) {
      if (AMMESSI_LINK[campo]) {
        assert.ok(AMMESSI_LINK[campo].includes(val),
          `«${t.nome}» → ${campo} = «${val}», che non è fra: ${AMMESSI_LINK[campo].join(', ')}`);
      }
      if (/^(bg|bg2|testo|accent|card|bordo|ombraColore)$/.test(campo) && val) {
        assert.match(String(val), /^(#[0-9a-fA-F]{6}|rgba?\([\d.,\s]+\))$/, `«${t.nome}» → ${campo} non è un colore`);
      }
    }
  }
});

test('anche la pagina link ha il manga, e il suo carattere si carica solo lì', () => {
  const manga = TEMI_LINK.filter((t) => /manga/i.test(t.nome));
  assert.ok(manga.length >= 1, 'la pagina link non ha un tema manga');
  for (const m of manga) {
    assert.equal(m.tema.font, 'manga');
    assert.equal(m.tema.ombraTipo, 'dura', `«${m.nome}»: senza ombra dura non è inchiostro`);
    assert.equal(m.tema.stileBtn, 'contorno', `«${m.nome}»: i bottoni devono essere contornati`);
  }
  const LINK = readFileSync(join(RAD, 'src/features/linkpagina.js'), 'utf8');
  assert.ok(LINK.includes('const facciaFont ='), 'la faccia del carattere non è condizionata');
  assert.ok(/facciaFont = \(nome\) => \(nome !== 'manga'/.test(LINK),
    'la faccia deve arrivare SOLO a chi ha scelto il manga: le altre pagine link non caricano caratteri dal web');
});


// ── I temi delle GRAFICHE SOCIAL ──────────────────────────────────────────

const TEMI_GRAF = (() => {
  const i = APP.indexOf('const GR_TEMI = {');
  assert.ok(i >= 0, 'non trovo i temi delle grafiche');
  const j = APP.indexOf('\n};', i);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${APP.slice(i + 'const GR_TEMI = '.length, j + 2)}`)();
})();

test('ogni tema delle grafiche ha i colori che serve disegnare', () => {
  const col = /^(#[0-9a-fA-F]{6}|rgba?\([\d.,\s]+\))$/;
  for (const [id, t] of Object.entries(TEMI_GRAF)) {
    assert.ok(t.nome, `${id}: senza nome`);
    assert.ok(Array.isArray(t.bg) && t.bg.length === 2, `${id}: lo sfondo sono due colori`);
    for (const c of t.bg) assert.match(c, col, `${id}: sfondo non è un colore`);
    for (const k of ['testo', 'tenue', 'acc', 'riga']) {
      assert.match(String(t[k]), col, `${id}.${k} non è un colore`);
    }
  }
});

test('anche le grafiche social hanno il manga', () => {
  const manga = Object.entries(TEMI_GRAF).filter(([, t]) => /manga/i.test(t.nome));
  assert.ok(manga.length >= 1, 'le grafiche social non hanno un tema manga');
  // Carta chiara con inchiostro scuro: e' il verso giusto, e fra undici temi
  // quasi tutti scuri e' anche l'unico che stacca.
  const [, chiaro] = manga.find(([id]) => id === 'manga');
  assert.equal(chiaro.testo.toLowerCase(), '#0b0b0b');
  assert.ok(chiaro.bg.every((c) => parseInt(c.slice(1, 3), 16) > 200), 'il manga chiaro va su carta');
});
