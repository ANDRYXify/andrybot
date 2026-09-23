// NELLA LIBRERIA I TASTI RESTANO DENTRO LA LORO CARTA.
//
// Ogni carta della libreria degli effetti ha in fondo i suoi tasti: «Ascolta»
// (solo icona) e quello principale, con la scritta («Usa», «Condividi», «Non
// condividere», in spagnolo «Dejar de compartir»). Erano tutti costretti su una
// riga e liberi di stringersi sotto il loro contenuto (`white-space: nowrap`,
// `min-width: 0`): fra 1024 e 1280 px le colonne scendevano a 150 px e «Non
// condividere» usciva dal bordo della carta.
//
// Su una riga ci resta solo chi ha un'icona e basta. Il tasto con la scritta va
// a capo se serve, e la colonna parte da 11rem: la scritta piu' lunga, con la
// sua icona, ci sta in due righe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../../src/web/public/style.css', import.meta.url), 'utf8');

test('su una riga ci resta solo il tasto a icona', () => {
  const regole = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corpo: m[2] }));
  const forzati = regole.filter((r) => /\.lib-azioni \.btn/.test(r.sel) && /white-space:\s*nowrap/.test(r.corpo));
  assert.ok(forzati.length >= 1, 'c\'e\' chi resta su una riga');
  for (const r of forzati) assert.match(r.sel, /\.lib-azioni \.btn\.ico-sola$/, `${r.sel}: solo i tasti a icona`);
});

test('le colonne della libreria partono da 11rem', () => {
  const colonne = [...CSS.matchAll(/\.lib-griglia \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(([^,]+), 1fr\)\)/g)].map((m) => m[1]);
  assert.ok(colonne.length >= 2, 'la griglia nella scheda e nella finestra');
  for (const c of colonne) assert.equal(c, '11rem');
});
