// IL CONTATORE DELLE MORTI, ATTACCATO A QUALCOSA.
//
// Il riconoscimento e' provato altrove: qui si prova che sia COLLEGATO. Un
// riconoscitore perfetto che nessuno chiama non conta nessuna morte, e il difetto
// non si vede da nessuna parte — la carta compare, i tasti ci sono, e il numero
// non si muove.
//
// La seconda cosa che si prova e' che la carta si basti da sola. Le due liste
// che le servono — le fonti del programma della diretta e i contatori del canale
// — venivano da altre schede: chi non aveva mai aperto l'Overlay Studio trovava
// il menu dei contatori vuoto e il tasto spento, senza capire perche'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const app = leggi('src/web/public/app.js');
const html = leggi('src/web/public/index.html');
const pubblico = leggi('src/web/public/morti.js');

test('le regole del riconoscimento arrivano davvero alla pagina', () => {
  assert.match(html, /<script src="morti\.js" defer><\/script>/, 'index.html non carica morti.js');
  assert.match(pubblico, /window\.SB_MORTI\s*=/, 'morti.js non si affaccia da nessuna parte');
  for (const nome of ['impronta', 'distanza', 'vicina', 'guarda']) {
    assert.ok(app.includes(`window.SB_MORTI.${nome}`) || nome === 'distanza',
      `il pannello non usa ${nome}: la regola c'e' ma non la chiama nessuno`);
  }
});

test('qualcuno accende la guardia, e qualcuno collega la carta', () => {
  assert.match(app, /if \(id === 'regia'\) \{[^}]*collegaMorti\(\)/,
    'aprendo la scheda Regia nessuno collega la carta delle morti');
  assert.match(app, /collegaRegiaRicordata\(\);\s*\n\s*_mortiRiavvia\(\);/,
    'la guardia non riparte all\'avvio: contarebbe solo con la scheda Regia aperta');
});

test('il giro guarda, conta una volta sola e solo in onda', () => {
  const giro = app.slice(app.indexOf('async function _mortiGiro'), app.indexOf('function _mortiSpia'));
  assert.ok(giro.includes('if (!r.conta) return;'), 'conta anche quando la scena non e\' appena entrata');
  assert.ok(giro.includes('if (!await _mortiInOnda()) return;'), 'conta anche fuori diretta');
  assert.ok(giro.includes("'/api/streamer/azione'"), 'non passa dall\'azione che muove il contatore');
});

test('la carta si basta da sola: fonti e contatori se li prende lei', () => {
  const carta = app.slice(app.indexOf('function _mortiCarta'), app.indexOf('function pannelloRegia'));
  assert.ok(!/_cons\.fonti/.test(carta), 'la carta si scrive dentro le fonti: se arrivano dopo, resta vuota');
  assert.ok(!/_conta/.test(carta), 'la carta si scrive dentro i contatori di un\'altra scheda');
  assert.match(app, /async function _mortiConti\(\)[\s\S]*?api\('\/api\/contatori'\)/,
    'i contatori non se li va a prendere nessuno');
  assert.match(app, /_mortiFonti\(\);\s*\n\}\s*\n\s*function segnaScenaViva/,
    'quando le fonti del programma arrivano, il menu non si aggiorna');
});

test("l'immagine non esce dal computer: al server si manda un +1 e basta", () => {
  assert.ok(!/imageData/.test(app.slice(app.indexOf('async function _mortiGiro'), app.indexOf('function _mortiSpia'))),
    'il giro maneggia l\'immagine dove non deve');
  const scatta = app.slice(app.indexOf('async function _mortiScatta'), app.indexOf('async function _mortiInOnda'));
  assert.ok(!/api\(/.test(scatta), 'lo scatto parla col server: l\'immagine potrebbe uscire di li\'');
});
