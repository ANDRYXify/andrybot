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
  const carta = app.slice(app.indexOf('function _mortiCarte'), app.indexOf('function pannelloModuli'));
  assert.match(carta, /id="morti-condividi" checked/, 'di suo si condivide');
  assert.match(app, /_g\('morti-condividi'\)\?\.checked/, 'ma la spunta deve contare davvero');
});

// IL NOME DEL GIOCO, E DA DOVE ARRIVA.
//
// Lo prendeva dal DOM della scheda Regia, dove la categoria e' scritta a schermo.
// Finche' la carta stava li' funzionava; spostandola nei Comandi quell'elemento
// non c'e' piu', e pubblicare in libreria avrebbe smesso di funzionare IN
// SILENZIO — nessun errore, solo schede che non nascono. Adesso la categoria si
// chiede al server, che la sa comunque, e la carta non dipende piu' da nessun'altra
// scheda.
test('il nome del gioco lo chiede al server, non lo legge da un\'altra scheda', () => {
  const g = app.slice(app.indexOf('async function _mortiGioco()'), app.indexOf('async function _mortiPubblica'));
  assert.ok(g.length > 50, 'la funzione che trova il gioco non c\'e\' piu\'');
  assert.match(g, /api\('\/api\/streamer\/regia'\)/, 'la categoria va chiesta a chi la sa');
  assert.ok(!/getElementById/.test(g), 'leggerla dal DOM la lega alla scheda in cui quel DOM vive');
  assert.match(g, /startsWith\('—'\)/, 'e un trattino non e\' un gioco: finirebbe in libreria come se lo fosse');
});

test('CONTATORify e\' una sotto-voce dei Comandi, e si identifica come le sue rotte', () => {
  const sotto = app.slice(app.indexOf('const SOTTO_SCHEDE = {'), app.indexOf('function sottoScelta'));
  assert.match(sotto, /\['morti', 'CONTATORify'\]/,
    'il nome e\' CONTATORify, ma l\'identificativo deve restare quello delle rotte: se no il cancello delle sezioni la pesa zero');
  assert.match(app, /<div data-zona="morti">/, 'la zona che la contiene non c\'e\'');
  assert.match(app, /<div data-zona="comandi">/, 'e senza la zona dei comandi si vedrebbero tutte e due insieme');
});
