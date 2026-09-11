// L'AUTONOMIA DEL BOT, letta nel codice: la decisione sta in un posto solo, il
// pannello e il manuale dicono lo stesso numero, e quello che dice da solo si vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BOT = readFileSync(join(RAD, 'src/bot.js'), 'utf8');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const MAN = readFileSync(join(RAD, 'src/web/manuali.js'), 'utf8');

test('la decisione di parlare da solo passa da una funzione sola, senza dadi nel battito', () => {
  const f = BOT.slice(BOT.indexOf('  _battitoAnima() {'), BOT.indexOf('  async _controllaPremi() {'));
  assert.match(f, /spontanea\.decidiSpontanea\(\{/, 'il battito chiede alla funzione');
  assert.doesNotMatch(f, /Math\.random\(\) < auto \* 0\.4/, 'la vecchia sorte in linea non c\'e\' piu\'');
  assert.match(f, /this\._ultimaSpontanea\.set\(login, ora\)/, 'il tetto si segna quando si decide');
  assert.match(f, /soloLive: s\.settings\?\.proattivoSoloLive === true/, 'la spunta «solo in diretta» arriva alla decisione');
  for (const tipo of ['promo', 'battuta', 'iniziativa']) assert.match(f, new RegExp(`_dettaDaSolo\\(login, '${tipo}'`), `${tipo} finisce nel registro`);
});

test('anche la manche automatica finisce nel registro, ma solo il suo annuncio', () => {
  const f = BOT.slice(BOT.indexOf('  _manche() {'), BOT.indexOf('  _distilla() {'));
  assert.match(f, /_dettaDaSolo\(login, 'manche', t\)/);
  assert.match(f, /if \(prima\) \{ prima = false;/, 'le righe successive del gioco sono risposte, non iniziative');
});

test('il cursore parte da zero: pannello, manuale e bot dicono lo stesso numero', () => {
  assert.match(APP, /spontaneita: typeof s\.spontaneita === 'number' \? s\.spontaneita : 0,/, 'il pannello mostra 0 a chi non ha mai salvato');
  assert.match(MAN, /\['Chat autonoma', '0%', '0–50%'/, 'il manuale dice 0%');
  const sp = readFileSync(join(RAD, 'src/features/spontanea.js'), 'utf8');
  assert.match(sp, /Number\(dose\) \|\| 0/, 'e il bot legge «non impostata» come zero');
});

test('«solo mentre sono in diretta» si disegna, si salva e si accetta', () => {
  assert.match(APP, /id="chk-proattivo-live" \$\{s\.proattivoSoloLive \? 'checked' : ''\}/);
  assert.match(APP, /proattivoSoloLive: s\.proattivoSoloLive === true,/, 'e il pannello lo normalizza come il codice: spento se non detto');
  assert.match(APP, /proattivoSoloLive: document\.getElementById\('chk-proattivo-live'\)\.checked,/);
  assert.match(SRV, /if \(b\.proattivoSoloLive !== undefined\) out\.proattivoSoloLive = !!b\.proattivoSoloLive;/);
  assert.match(MAN, /\['Solo mentre sono in diretta', 'spento'/);
});

test('cosa ha detto da solo si vede, e solo a chi e\' entrato', () => {
  const i = SRV.indexOf("app.get('/api/streamer/autonomia'");
  assert.ok(i > 0, 'la porta esiste');
  const r = SRV.slice(i, SRV.indexOf('}));', i));
  assert.match(r, /requireLogin/);
  assert.match(r, /manager\.spontanee\?\.\(login\)/);
  assert.match(r, /private, no-store/, 'e non finisce in nessuna cache condivisa');
  assert.match(APP, /api\('\/api\/streamer\/autonomia'\)/, 'il pannello la chiede');
  assert.match(APP, /id="lista-spontanee"/, 'e la disegna');
  assert.match(APP, /if \(id === 'personalita'\) \{ caricaGuide\(\); caricaSpontanee\(\); \}/, 'quando si apre la scheda');
});

test('ogni checkbox della scheda del bot mostra lo stesso default che il codice usa', () => {
  // Il pannello normalizza in impostazioni(): «acceso se non detto» per le cose
  // che il codice legge con `=== false`, «spento se non detto» per quelle che il
  // codice legge con `=== true`. Se una nuova manopola sbaglia verso, il
  // pannello mentirebbe a chi non ha mai salvato — e salvando il tono si
  // porterebbe a casa lo stato che vede.
  const norm = APP.slice(APP.indexOf('function impostazioni() {'), APP.indexOf('\n}\n', APP.indexOf('function impostazioni() {')));
  const accese = ['battuteAuto', 'rispostaMenzioni', 'iaLocale', 'proattivo', 'proattivoTg', 'internet', 'adattaCanale', 'giochi', 'promoSocial', 'clipAuto'];
  for (const k of accese) assert.match(norm, new RegExp(`${k}: s\\.${k} !== false,`), `${k}: acceso se non detto`);
  for (const k of ['ascoltoLive', 'proattivoSoloLive']) assert.match(norm, new RegExp(`${k}: s\\.${k} === true,`), `${k}: spento se non detto`);
  const codice = BOT + readFileSync(join(RAD, 'src/features/clips.js'), 'utf8') + readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  for (const k of ['proattivo', 'iaLocale', 'clipAuto', 'proattivoTg']) assert.match(codice, new RegExp(`settings\\??\\.${k} === false`), `il codice legge ${k} come acceso se non detto`);
  assert.match(codice, /settings\?\.ascoltoLive === true/);
  assert.match(codice, /settings\?\.proattivoSoloLive === true/);
});
