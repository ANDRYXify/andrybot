// LA PORTA DEI GIOCHI CHE PARLANO DA SOLI.
//
// Qui non bussa un browser con la sua sessione: bussa un gioco, con dentro una
// chiave letta da un file di testo su un disco. Percio' le cose da provare non
// sono quelle solite.
//
//  · La chiave e' A PARTE da quella della consolle. Quella finisce in una
//    cartella che si condivide fra mod, guide e pacchetti di configurazione che
//    girano in rete: se fosse la stessa, chi la trova cambierebbe scena, sparerebbe
//    effetti e muoverebbe ogni contatore. Questa porta un numero e basta.
//  · Canale che non c'e' e chiave sbagliata rispondono UGUALE. Quell'indirizzo sta
//    scritto in chiaro in un file: non deve raccontare a chi lo legge se il canale
//    esiste.
//  · Il corpo del messaggio non finisce da nessuna parte. Dentro c'e'
//    l'identificativo del suo account di gioco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifica, CLASSI } from '../../src/web/argine.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const rotta = srv.slice(srv.indexOf("app.post('/api/gsi/:login'"), srv.indexOf("app.get('/api/streamer/morti/gsi'"));

test('la porta c\'e\', e non chiede una sessione a un gioco', () => {
  assert.ok(rotta.length > 200, 'la porta dei giochi non esiste');
  assert.ok(!/requireLogin/.test(rotta), 'un gioco non ha un browser con cui accedere');
});

// Il tetto giusto lo sa chi conosce il ritmo del gioco. Quello generale, che
// davanti a una porta senza sessione conta per indirizzo, deve stargli sopra:
// sotto, deciderebbe lui, e dallo stesso indirizzo bussa anche la tastiera.
test('il tetto che conta e\' quello del gioco: quello generale gli sta sopra', () => {
  const tetto = Number(/export const MAX_AL_MINUTO = (\d+);/.exec(readFileSync(join(RAD, 'src/features/gsi.js'), 'utf8'))?.[1]);
  assert.ok(tetto > 0, 'il tetto del gioco non si trova');
  const classe = classifica('POST', '/api/gsi/alfa');
  assert.ok(classe, 'senza nessun tetto generale, una chiave rubata fonderebbe il server');
  assert.ok(CLASSI[classe].max > tetto, `il tetto generale (${classe}, ${CLASSI[classe].max}) taglierebbe prima di quello del gioco (${tetto})`);
});

test('canale sconosciuto e chiave sbagliata rispondono la stessa cosa', () => {
  assert.match(rotta, /if \(!streamers\.get\(login\) \|\| !gsi\.chiaveOk\([^)]*\)\) return res\.status\(403\)/,
    'due risposte diverse direbbero a chi trova il file se quel canale esiste');
  assert.ok(!/status\(404\)/.test(rotta), 'un 404 e\' gia\' una risposta di troppo');
});

test('la chiave dei giochi non e\' quella della consolle', () => {
  const gsi = readFileSync(join(RAD, 'src/features/gsi.js'), 'utf8');
  assert.match(gsi, /gsiKey/, 'la chiave dei giochi deve avere un posto suo');
  assert.ok(!/consoleKey/.test(gsi), 'la chiave della consolle apre troppe cose per stare in un file di gioco');
  assert.match(gsi, /timingSafeEqual/, 'un confronto normale racconta quanti caratteri erano giusti');
});

test('il messaggio del gioco non si scrive da nessuna parte', () => {
  assert.ok(!/log\.[a-z]+\([^)]*req\.body/.test(rotta), 'dentro al corpo c\'e\' il suo account di gioco');
  assert.ok(!/JSON\.stringify\(req\.body/.test(rotta));
});

test('si passa dall\'unica strada che muove un contatore, e solo in diretta', () => {
  assert.match(rotta, /consolle\.esegui\(login, 'contatore:piu:'/, 'un secondo modo sarebbe un secondo posto dove si rompe');
  assert.match(rotta, /if \(!rapporto\.inCorso\(login\)\) return/, 'le partite del pomeriggio finirebbero nel numero della serata');
  assert.match(rotta, /gsi\.troppiColpi\(login\)/, 'senza tetto quella porta e\' aperta a chiunque abbia la chiave');
});

test('quello che si ricorda sta nel database, non in memoria', () => {
  assert.match(rotta, /gsiStato\.prendi\(login\)/);
  assert.match(rotta, /gsiStato\.metti\(login, r\.stato\)/);
  const db = readFileSync(join(RAD, 'src/db.js'), 'utf8');
  assert.match(db, /CREATE TABLE IF NOT EXISTS gsi_stato/,
    'in memoria, il primo messaggio dopo un riavvio conterebbe tutte le morti della partita');
});

test('il file per il gioco lo compone il server: la chiave non passa dal pannello', () => {
  const file = srv.slice(srv.indexOf("app.get('/api/streamer/morti/gsi/file'"), srv.indexOf("app.post('/api/streamer/morti/gsi/revoca'"));
  assert.match(file, /gsi\.configurazione\(/);
  assert.match(file, /content-disposition/, 'deve scaricarsi come file, non aprirsi come pagina');
  // La chiave non torna MAI al pannello: il pannello sa l'indirizzo e i giochi,
  // e per il file manda il browser a scaricarlo. Cosi' non c'e' una copia della
  // chiave in una pagina aperta tutta la sera su un computer che va in onda.
  const elenco = srv.slice(srv.indexOf("app.get('/api/streamer/morti/gsi'"), srv.indexOf("app.get('/api/streamer/morti/gsi/file'"));
  assert.ok(!/gsi\.chiave\(/.test(elenco), 'quello che il pannello chiede non deve contenere la chiave');
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const carta = app.slice(app.indexOf('function _mortiCarta'), app.indexOf('function pannelloRegia'));
  assert.ok(!/gsiKey/.test(carta), 'la chiave non deve nemmeno comparire nel pannello');
});
