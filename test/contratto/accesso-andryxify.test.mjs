// CHI APRE E CHIUDE A MANO E' ANDRYXIFY. Le concessioni e i blocchi decisi a
// mano (Admin → «Accessi») li decide chi gestisce SocialBot, non il
// proprietario del canale: il pannello diceva «Il proprietario ti ha aperto»
// al proprietario stesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync('src/web/public/app.js', 'utf8');
const funzione = (nome) => {
  const i = APP.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, nome);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('le concessioni e i blocchi a mano nominano andryxify', () => {
  const riga = funzione('_rigaAccessoHtml');
  for (const f of ['andryxify ti ha aperto <strong>tutto</strong>', "L('andryxify ti ha aperto'", '<strong>Accesso sospeso</strong> da andryxify', "L('andryxify ha chiuso'"]) {
    assert.ok(riga.includes(f), f);
  }
  assert.ok(funzione('muroPacchetto').includes("L('andryxify ha chiuso questa parte'"), 'il muro dice chi ha chiuso: andryxify');
  assert.ok(funzione('paginaBloccata').includes("L('Chiusa da andryxify'"));
  for (const vecchio of ['Il proprietario ti ha aperto', 'Il proprietario ha chiuso', 'Accesso sospeso</strong> dal proprietario', 'è chiuso dal proprietario', 'Chiusa dal proprietario']) {
    assert.ok(!APP.includes(vecchio), vecchio);
  }
});
