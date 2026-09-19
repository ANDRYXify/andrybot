// UNA PAGINA CHE SPIEGA SEMPRE TUTTO E' UNA PAGINA CHE NON SA NIENTE.
//
// La scheda di Discord diceva tutto a tutti: come invitare il bot, come dargli
// i permessi, come alzargli il ruolo — anche a chi aveva gia' fatto tutte e tre
// le cose. Da li' venivano due difetti che sembrano diversi e sono lo stesso:
// la pagina lunga e ripetitiva, e il riquadro che continuava a chiedere un
// permesso gia' dato.
//
// E lo stesso vale per il silenzio di `!discord`: il comando tace quando manca
// una delle tre condizioni, e se il pannello non le guarda quel silenzio
// sembra un comando rotto.
//
// Qui si fissa la forma: il pannello LEGGE come sta messo il bot, e scrive solo
// le righe che valgono adesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const SRV = senzaCommenti(readFileSync(join(RAD, 'src/web/server.js'), 'utf8'));
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const fetta = (t, da, a) => {
  const i = t.indexOf(da);
  assert.ok(i > 0, `manca nel sorgente: ${da}`);
  const j = a ? t.indexOf(a, i) : -1;
  return t.slice(i, j > 0 ? j : i + 3000);
};

test('il pannello chiede a Discord com\'e\' messo il bot, con due letture sole', () => {
  const f = fetta(SRV, 'const poteriDelBot = async (token, guild)', '\n  };');
  assert.match(f, /dcApi\.io\(token, guild\)/);
  assert.match(f, /dcApi\.ruoli\(token, guild\)/);
  assert.ok(!/fotografia\(/.test(f), 'la fotografia intera sarebbe quattro letture per rispondere a una domanda');
  for (const k of ['pieni', 'canali', 'ruoli', 'farEntrare', 'sopra']) {
    assert.match(f, new RegExp(`\\b${k}[,:]`), `manca ${k}: il pannello non potrebbe dirlo`);
  }
});

test('e sa dire PERCHE\' il comando in chat tace', () => {
  const f = fetta(SRV, 'const comando = {', '\n    };');
  assert.match(f, /risponde: dcCollega\.apertoA\(login\)/, 'la stessa domanda che si fa il comando, non una copia');
  assert.match(f, /manca: !guild \? 'server' : \(!token \? 'bot' : \(!c\?\.attivo \? 'interruttore' : ''\)\)/,
    'le tre condizioni, una per una, nell\'ordine in cui si sistemano');
  const p = fetta(APP, 'function _dcComandoHtml()', '\n}');
  for (const k of ['server', 'bot', 'interruttore']) assert.ok(p.includes(k + ':'), `il pannello non sa dire «${k}»`);
});

test('niente si spiega a chi ha gia\' fatto: ogni riga ha la sua condizione', () => {
  const f = fetta(APP, 'function _dcServeHtml()', '\n}');
  const quante = (f.match(/righe\.push\(/g) || []).length;
  const condizioni = (f.match(/\n  if \(/g) || []).length;
  assert.ok(quante >= 4, 'le righe che puo\' dire');
  assert.equal(quante, condizioni, 'e ognuna sta dentro un «se»: nessuna riga fissa');
});

test('il permesso non si richiede a chi ce l\'ha gia\' dato', () => {
  assert.match(APP, /pieni\.hidden = !_dc\?\.configurato \|\| !!_dc\?\.poteri\?\.pieni;/,
    'il riquadro dei pieni poteri sparisce quando li ha gia\'');
  assert.match(APP, /id="dc-pieni-box" hidden/, 'e nasce nascosto, non lampeggia al caricamento');
});

test('il confronto dei ruoli sta dentro «Chi e\' chi», non in una carta in piu\'', () => {
  const carta = fetta(APP, 'id="dcs-carta-ruoli"', '</div>\n\n    <div class="carta"');
  assert.ok(carta.includes('id="dcs-confronto"'), 'una pagina gia\' lunga non si allunga per aggiungere una cosa');
  assert.ok(!APP.includes('dcs-carta-confronto'), 'e la carta a parte non deve tornare');
});
