// LA LIBRERIA, DAL LATO DELLE PORTE: chi scrive e chi legge sono due streamer
// diversi, ed e' l'unica cosa nel bot fatta cosi'.
//
// Le tre cose da provare non sono «funziona». Sono le tre che, se cedono, fanno
// danno a qualcuno che non ha fatto niente:
//
//  · PRENDERE E' COPIARE. Se la propria schermata puntasse alla libreria invece
//    di portarsi dentro le impronte, chiunque tocchi quella scheda toccherebbe la
//    diretta di chi se l'e' presa.
//  · NON SI SOVRASCRIVE. Niente, da nessuna parte, deve poter cambiare le firme
//    di una riga gia' pubblicata.
//  · NIENTE SI AGGIORNA DA SOLO.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const srv = leggi('src/web/server.js');
const db = leggi('src/db.js');
const app = leggi('src/web/public/app.js');

test('prendere una scheda vuol dire copiarsi le sue impronte', () => {
  const prendi = srv.slice(srv.indexOf("app.post('/api/streamer/morti/prendi'"), srv.indexOf("app.post('/api/admin/morti/togli'"));
  assert.match(prendi, /libreria\.copia\(/, 'non passa dalla regola che copia');
  assert.match(prendi, /streamers\.setSettings/, 'non finisce nelle impostazioni di chi la prende');
  const lib = leggi('src/features/morti-libreria.js');
  const copia = lib.slice(lib.indexOf('export function copia'));
  assert.match(copia, /firme: \[\.\.\.\(s\.firme \|\| \[\]\)\]/,
    'le impronte devono essere una COPIA, non lo stesso elenco della libreria');
});

test('una riga della libreria non si sovrascrive: non esiste la scrittura', () => {
  const dep = db.slice(db.indexOf('export const mortiSchede'), db.indexOf('// I GIOCHI CHE PARLANO DA SOLI'));
  assert.ok(!/UPDATE morti_schede SET (firme|gioco|lingua)/.test(dep),
    'esiste un modo di cambiare una scheda pubblicata: un giorno qualcuno lo userebbe');
  assert.match(dep, /UPDATE morti_schede SET presa=presa\+1/, 'gli usi si contano');
  assert.match(dep, /UPDATE morti_schede SET tolta=1/, 'e il proprietario puo\' toglierla');
  assert.match(srv, /app\.post\('\/api\/admin\/morti\/togli', requireAdmin/, 'togliere e\' roba del proprietario');
});

test('niente si aggiorna da solo: la versione nuova si annuncia e basta', () => {
  const guarda = app.slice(app.indexOf('async function _mortiGuardaVersioni'), app.indexOf('function _mortiLista'));
  assert.ok(!/_mortiSalva/.test(guarda), 'chi guarda le versioni non deve poter salvare niente');
  assert.match(app, /data-morti-aggiorna/, 'e ci deve essere un tasto per prenderla, se la vuoi');
  const agg = app.slice(app.indexOf("const agg = e.target.closest('[data-morti-aggiorna]')"), app.indexOf('function _mortiCarta'));
  assert.match(agg, /new Set\(\[\.\.\.\(s\.firme \|\| \[\]\), \.\.\.n\.firme\]\)/,
    'prendere la versione nuova non deve buttare via quello che avevi imparato tu');
});

test('un\'impronta piatta non entra, e non c\'e\' una seconda strada per scriverla', () => {
  const lib = leggi('src/features/morti-libreria.js');
  assert.match(lib, /export function normScheda/);
  assert.ok(/!piatta\(f\)/.test(lib), 'le piatte devono cadere nella normalizzazione');
  const pub = srv.slice(srv.indexOf("app.post('/api/streamer/morti/pubblica'"), srv.indexOf("app.post('/api/streamer/morti/prendi'"));
  assert.match(pub, /libreria\.normScheda\(/, 'la porta deve passare di li\'');
  assert.match(pub, /libreria\.perche\(/, 'e deve dire perche\', quando dice di no');
  assert.ok(!/mortiSchede\.pubblica\(/.test(srv.replace(pub, '')), 'una seconda porta che pubblica salterebbe le reti');
});

test('mettere in comune si sceglie, ed e\' segnato di suo', () => {
  const carta = app.slice(app.indexOf('function _mortiCarta'), app.indexOf('function pannelloRegia'));
  assert.match(carta, /id="morti-condividi" checked/, 'di suo si condivide');
  assert.match(app, /_g\('morti-condividi'\)\?\.checked/, 'ma la spunta deve contare davvero');
});

test('il nome del gioco non se lo inventa lo streamer: e\' la categoria che ha', () => {
  assert.match(app, /const _mortiGioco = \(\) => \{[\s\S]*?regia-gioco-sel/,
    'il gioco va preso dalla categoria di Twitch, se no ognuno lo scrive a modo suo');
  assert.match(app, /startsWith\('\\u2014'\)|startsWith\('—'\)/,
    'e un trattino non e\' un gioco: finirebbe in libreria come se lo fosse');
});
