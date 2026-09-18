// I GIOCHI CHE LO DICONO DA SOLI: cosa c'e' scritto, e quante morti nuove sono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-gsi-');
const { leggi, salto, MAX_SALTO, configurazione, nomeFile, GIOCHI } = await import('../../src/features/gsi.js');

const cs = (morti, { io = '765611', chi = '765611', mappa = 'de_dust2', modo = 'competitive' } = {}) => ({
  provider: { name: 'Counter-Strike: Global Offensive', appid: 730, steamid: io },
  map: { mode: modo, name: mappa },
  player: { steamid: chi, match_stats: { kills: 4, deaths: morti, assists: 1 } },
});

const dota = (morti, { matchid = '7788' } = {}) => ({
  provider: { name: 'Dota 2', appid: 570 },
  map: { matchid },
  player: { kills: 2, deaths: morti, assists: 0 },
});

test('di Counter-Strike si legge il numero, e si sa se sei tu', () => {
  const r = leggi(cs(3));
  assert.equal(r.gioco, 'cs2');
  assert.equal(r.morti, 3);
  assert.equal(r.tuo, true);
});

test('le morti di chi stai guardando non sono le tue', () => {
  const r = leggi(cs(9, { io: '765611', chi: '999999' }));
  assert.equal(r.tuo, false, 'da spettatore il giocatore del messaggio e\' un altro');
  assert.deepEqual(salto({ partita: 'cs2|competitive|de_dust2', morti: 1 }, r).morti, 0,
    'e se non e\' tuo non si conta, per quanto salga');
});

test('di Dota si legge il numero, e la forma da spettatore non e\' la tua', () => {
  assert.equal(leggi(dota(2)).morti, 2);
  assert.equal(leggi(dota(2)).tuo, true);
  const spia = { provider: { name: 'Dota 2' }, map: { matchid: '1' }, player: { team2: { player0: { deaths: 7 } } } };
  assert.equal(leggi(spia), null, 'senza un numero tuo non c\'e\' niente da leggere');
});

test('un messaggio che non riconosciamo non si legge a caso', () => {
  for (const x of [null, undefined, 42, 'ciao', {}, { provider: { appid: 999 } }, { player: {} }]) {
    assert.equal(leggi(x), null);
  }
});

test('alla prima lettura non si conta niente: non si sa da dove si veniva', () => {
  const r = salto(null, leggi(cs(12)));
  assert.equal(r.morti, 0, 'dodici morti gia\' fatte non sono successe adesso');
  assert.deepEqual(r.stato, { partita: 'cs2|competitive|de_dust2', morti: 12 }, 'ma da adesso si sa');
});

test('si conta il salto in su, e solo quello', () => {
  let s = salto(null, leggi(cs(0))).stato;
  const passo = (n, opz) => { const r = salto(s, leggi(cs(n, opz))); s = r.stato; return r.morti; };
  assert.equal(passo(0), 0, 'fermo non e\' una morte');
  assert.equal(passo(1), 1);
  assert.equal(passo(1), 0, 'lo stesso numero due volte e\' lo stesso morto');
  assert.equal(passo(3), 2, 'due messaggi persi sono due morti, non una');
});

test('una partita nuova riparte da zero, e zero non e\' meno cinque', () => {
  let s = salto(null, leggi(cs(5))).stato;
  const r = salto(s, leggi(cs(0)));
  assert.equal(r.morti, 0, 'il numero che scende e\' una partita nuova, non una resurrezione');
  assert.deepEqual(r.stato, { partita: 'cs2|competitive|de_dust2', morti: 0 });
});

test('cambiare mappa ribasa, anche se il numero sale', () => {
  const s = salto(null, leggi(cs(2))).stato;
  const r = salto(s, leggi(cs(8, { mappa: 'de_mirage' })));
  assert.equal(r.morti, 0, 'e\' un\'altra partita: quelle otto non sono di stasera');
  assert.equal(r.stato.partita, 'cs2|competitive|de_mirage');
});

test('un salto impossibile in mezzo secondo si ribasa invece di contare trenta morti', () => {
  const s = salto(null, leggi(cs(1))).stato;
  const r = salto(s, leggi(cs(1 + MAX_SALTO + 1)));
  assert.equal(r.morti, 0);
  assert.equal(r.stato.morti, 1 + MAX_SALTO + 1, 'e da li\' in poi si riparte da quel numero');
  assert.equal(salto(salto(null, leggi(cs(1))).stato, leggi(cs(1 + MAX_SALTO))).morti, MAX_SALTO,
    'esattamente al limite invece si conta');
});

test('cambiare gioco ribasa: e\' un\'altra partita anche se non lo dice nessuno', () => {
  const s = salto(null, leggi(cs(4))).stato;
  const r = salto(s, leggi(dota(9)));
  assert.equal(r.morti, 0, 'le nove morti di Dota non sono le quattro di Counter-Strike piu\' cinque');
  assert.match(r.stato.partita, /^dota2\|/);
});

test('le partite di Dota si distinguono dal loro numero', () => {
  const s = salto(null, leggi(dota(3))).stato;
  assert.equal(salto(s, leggi(dota(4))).morti, 1);
  assert.equal(salto(s, leggi(dota(9, { matchid: '9999' }))).morti, 0, 'un\'altra partita non porta con se\' le sue morti');
});

test('il file per il gioco porta indirizzo e chiave, e non si fa storpiare', () => {
  const c = configurazione({ gioco: 'cs2', indirizzo: 'https://socialbot.live/api/gsi/abc', chiave: 'abc' });
  assert.match(c, /"uri"\s+"https:\/\/socialbot\.live\/api\/gsi\/abc"/);
  assert.match(c, /"token" "abc"/);
  assert.match(c, /"player_match_stats" "1"/, 'senza questo Counter-Strike non manda le morti');
  const d = configurazione({ gioco: 'dota2', indirizzo: 'x', chiave: 'y' });
  assert.match(d, /"player" "1"/);
  assert.ok(!/player_match_stats/.test(d), 'Dota non ha quella voce: chiedergliela non ha senso');
  const sporco = configurazione({ gioco: 'cs2', indirizzo: 'ht"tp://x', chiave: 'a"b\\c' });
  assert.ok(!/[\\]/.test(sporco), 'virgolette e barre uscirebbero dal formato di Valve');
  assert.equal(configurazione({ gioco: 'mai-visto', indirizzo: 'x', chiave: 'y' }), '');
  assert.equal(configurazione({ gioco: 'cs2', indirizzo: '', chiave: 'y' }), '', 'senza indirizzo non si scrive un file che non serve');
});

test('ogni gioco che diciamo di sapere ha un nome, una cartella e un file suo', () => {
  const nomi = new Set();
  for (const g of GIOCHI) {
    assert.ok(g.nome && g.cartella, `${g.id} senza nome o cartella non si sa dove metterlo`);
    assert.ok(!nomi.has(nomeFile(g.id)), 'due giochi non possono volere lo stesso file');
    nomi.add(nomeFile(g.id));
  }
  void usaEGetta;
});
