// IL BOT NON CAMBIA GENERE A OGNI FRASE.
//
// Scrive con l'account dello streamer, e in italiano non si puo' dire «sono
// apparso» senza dichiarare un genere. Lo dichiarava a caso: le frasi scritte a
// mano erano al maschile, quelle del modello cambiavano da una risposta
// all'altra. In un canale di una streamer stona.
//
// Le tre cose che questo collaudo tiene ferme:
//  1. l'accordo funziona e non tocca i segnaposto;
//  2. «neutro» e' una scelta possibile DAVVERO, cioe' ogni gruppo di frasi ne ha
//     almeno una che non dichiara niente — altrimenti «neutro» sarebbe solo il
//     maschile con un altro nome;
//  3. i tubi sono attaccati: l'impostazione si salva, arriva al modello e
//     l'accordo si applica all'uscita. La logica funzionava anche prima dei
//     collegamenti, ed e' il collegamento che manca in silenzio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { accorda, scegliAccordando, dichiaraGenere, istruzioneGenere, GENERI, normalizza } from '../../src/ai/genere.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

test('l\'accordo risolve il marcatore nei due sensi', () => {
  assert.equal(accorda('sono appars{o/a}', 'femminile'), 'sono apparsa');
  assert.equal(accorda('sono appars{o/a}', 'maschile'), 'sono apparso');
  assert.equal(accorda('sono {tutto/tutta} orecchie', 'femminile'), 'sono tutta orecchie');
});

test('l\'accordo non tocca i segnaposto', () => {
  assert.equal(accorda('ciao {user}, sono appars{o/a}', 'femminile'), 'ciao {user}, sono apparsa');
  assert.equal(accorda('{nome} ha fatto {viewers} punti', 'maschile'), '{nome} ha fatto {viewers} punti');
});

test('applicare l\'accordo due volte non cambia niente', () => {
  const una = accorda('sono appars{o/a}', 'femminile');
  assert.equal(accorda(una, 'maschile'), una, 'dopo la prima passata non restano marcatori');
});

test('un genere sconosciuto non rompe niente', () => {
  assert.equal(normalizza('boh'), 'neutro');
  assert.equal(accorda('sono appars{o/a}', undefined), 'sono apparso');
  for (const g of GENERI) assert.ok(istruzioneGenere(g).length > 10, `${g} ha la sua istruzione`);
});

test('con «neutro» si sceglie la frase che non dichiara niente', () => {
  const gruppo = ['sono appars{o/a}', 'eccomi', 'sono {tutto/tutta} orecchie'];
  for (let i = 0; i < 50; i++) assert.equal(scegliAccordando(gruppo, 'neutro'), 'eccomi');
});

test('nessun marcatore esce mai dallo scegli', () => {
  const gruppo = ['sono appars{o/a}', 'sono {tutto/tutta} orecchie'];
  for (const g of GENERI) {
    for (let i = 0; i < 30; i++) {
      assert.equal(dichiaraGenere(scegliAccordando(gruppo, g)), false, `${g} lascia passare un marcatore`);
    }
  }
});

test('«neutro» e\' una scelta possibile: ogni gruppo ha una frase senza genere', () => {
  // I gruppi sono array di stringhe fra apici singoli, come stanno scritti.
  const src = leggi('src/ai/brain.js');
  const gruppi = src.match(/\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)+'(?:[^'\\]|\\.)*'\s*,?\s*\]/g) || [];
  assert.ok(gruppi.length > 10, `gruppi di frasi trovati: ${gruppi.length}`);
  const senzaScampo = [];
  for (const g of gruppi) {
    const frasi = g.match(/'(?:[^'\\]|\\.)*'/g) || [];
    if (!frasi.some((f) => dichiaraGenere(f))) continue;      // gruppo senza generi: niente da chiedere
    if (!frasi.some((f) => !dichiaraGenere(f))) senzaScampo.push(frasi[0]);
  }
  assert.deepEqual(senzaScampo, [], 'un gruppo tutto marcato lascia «neutro» senza via d\'uscita');
});

test('l\'impostazione arriva al modello dalle regole, in un posto solo', () => {
  const db = leggi('src/db.js');
  const i = db.indexOf('applicabili(channel');
  assert.ok(i > 0, 'le regole applicabili si trovano');
  const regione = db.slice(i, i + 1800);
  assert.ok(regione.includes('istruzioneGenere'), 'la riga sul genere parte da qui');
  assert.ok(/\[\s*suo\s*,\s*\.\.\.sue\s*\]/.test(regione), 'sta in testa e non consuma il posto delle regole dello streamer');
});

test('l\'accordo si applica all\'uscita, non solo quando si sceglie', () => {
  const bot = leggi('src/bot.js');
  const say = bot.slice(bot.indexOf('  say(channel, text, opzioni)'), bot.indexOf('  say(channel, text, opzioni)') + 300);
  assert.ok(say.includes('accorda('), 'say accorda il testo');
  const voce = bot.slice(bot.indexOf('  vocePer(msg)'), bot.indexOf('  vocePer(msg)') + 900);
  assert.ok(voce.includes('accorda('), 'la voce accorda anche per Kick e YouTube');
});

test('il pannello lo offre e il salvataggio non lo butta via', () => {
  const app = leggi('src/web/public/app.js');
  assert.ok(app.includes('id="sel-genere"'), 'il pannello ha il comando');
  assert.ok(/genere:\s*document\.getElementById\('sel-genere'\)\.value/.test(app), 'e il salvataggio lo manda');
  const srv = leggi('src/web/server.js');
  assert.equal((srv.match(/b\.genere !== undefined/g) || []).length, 2, 'tutte e due le strade di salvataggio lo accettano');
  assert.ok(srv.includes('GENERI_VALIDI.includes(b.genere)'), 'e lo validano');
});
