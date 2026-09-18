// L'ANTISPAM. Due errori possibili, opposti e tutti e due gravi: lasciar
// passare lo spam, oppure colpire chi non c'entra. Le prove guardano
// soprattutto il secondo — un falso positivo su uno spettatore vero è il danno
// che non si recupera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANTISPAM_DEFAULT, valuta } from '../../src/features/antispam.js';

const cfg = { ...ANTISPAM_DEFAULT, attivo: true, link: true, maiuscole: true, menzioni: true, simboli: true, lungo: true, emoji: true };
let n = 0;
const msg = (text, extra = {}) => ({ channel: 'canale', user: 'utente' + (++n), text, ...extra });

test('chi ha i gradi non viene mai toccato', () => {
  const brutto = 'COMPRA SEGUACI SU spam-farm.xyz @a @b @c @d @e @f';
  assert.equal(valuta(msg(brutto, { isBroadcaster: true }), cfg), null);
  assert.equal(valuta(msg(brutto, { isMod: true }), cfg), null);
  assert.equal(valuta(msg(brutto, { isVip: true }), cfg), null);
});

test('i messaggi normali passano', () => {
  for (const t of [
    'ciao a tutti!', 'ma quanto è bello questo gioco', 'GG!', 'AHAHAH', 'ok', '?',
    'secondo me dovresti andare a sinistra, c’è la chiave',
    'buonasera, sono nuovo qui, mi sono appena iscritto al canale e volevo salutare tutti quanti',
  ]) {
    assert.equal(valuta(msg(t), cfg), null, `bloccato per sbaglio: "${t}"`);
  }
});

test('un link di chi non è sub viene fermato', () => {
  assert.ok(valuta(msg('guarda qui spam-farm.xyz/regalo'), cfg));
  assert.ok(valuta(msg('https://qualcosa.com'), cfg));
});

test('un sub può postare link se il livello è "sub"', () => {
  assert.equal(valuta(msg('https://qualcosa.com', { isSub: true }), { ...cfg, linkTier: 'sub' }), null);
});

test('spento, il controllo sui link non scatta', () => {
  assert.equal(valuta(msg('https://qualcosa.com'), { ...cfg, link: false }), null);
});

test('lo stesso messaggio ripetuto tre volte è spam', () => {
  const u = { channel: 'canale', user: 'ripetitore', text: 'compra follower adesso' };
  assert.equal(valuta({ ...u }, cfg), null);
  assert.equal(valuta({ ...u }, cfg), null);
  assert.ok(valuta({ ...u }, cfg), 'alla terza scatta');
});

test('un messaggio corto ripetuto NON è spam', () => {
  const u = { channel: 'canale', user: 'tifoso', text: 'gg' };
  for (let i = 0; i < 5; i++) assert.equal(valuta({ ...u }, cfg), null, 'gg si può ripetere');
});

test('un muro di maiuscole scatta, un acronimo no', () => {
  assert.ok(valuta(msg('QUESTO È UN MESSAGGIO TUTTO URLATO CHE NON FINISCE MAI'), cfg));
  assert.equal(valuta(msg('GG WP'), cfg), null);
  assert.equal(valuta(msg('LOL'), cfg), null);
});

test('una valanga di menzioni scatta, due amici no', () => {
  assert.ok(valuta(msg('@luca @giada @marco @sara @paolo @elena seguitemi'), cfg));
  assert.equal(valuta(msg('@luca @giada guardate qua'), cfg), null);
  assert.equal(valuta(msg('costa 3@ per uno'), cfg), null, 'una @ isolata non è una menzione');
});

test('i limiti configurabili si rispettano', () => {
  const corto = { ...cfg, lungoMax: 20 };
  assert.ok(valuta(msg('a'.repeat(30)), corto));
  assert.equal(valuta(msg('a'.repeat(10)), corto), null);
});

test('un messaggio vuoto non fa niente', () => {
  assert.equal(valuta(msg(''), cfg), null);
  assert.equal(valuta(msg(null), cfg), null);
});

// CHI MANDA BIT NON STA SPAMMANDO.
//
// «5 bit» cinque volte di fila sono cinque messaggi uguali per forza: il
// cheermote e' quello. Cancellarli e' il falso positivo piu' caro che ci sia.
test('cinque cheer uguali non sono spam, e non sporcano il conto degli altri', () => {
  const cfg = { ripetizioni: true, flood: true, link: false, maiuscole: false, menzioni: false, simboli: false, lungo: false };
  const cheer = (i) => ({ channel: '#c' + i, user: 'ada', text: 'Cheer5', bits: 5 });

  // cinque volte di fila nello stesso canale: nessuna deve essere toccata
  const canale = '#bit' + Date.now();
  for (let i = 0; i < 5; i++) {
    const r = valuta({ channel: canale, user: 'ada', text: 'Cheer5', bits: 5 }, cfg);
    assert.equal(r, null, `il cheer numero ${i + 1} e' stato preso per spam`);
  }
  // e i cheer non devono aver riempito la memoria delle ripetizioni: un
  // messaggio normale ripetuto due volte dopo di loro e' ancora sotto la soglia
  assert.equal(valuta({ channel: canale, user: 'ada', text: 'Cheer5' }, cfg), null, 'lo stesso testo senza bit, la prima volta, non e\' spam');
  void cheer;
});

test('qualche bit non e\' un lasciapassare per il contenuto', () => {
  const cfg = { ripetizioni: true, flood: true, link: true, linkTier: 'tutti', maiuscole: true, menzioni: true, simboli: true, lungo: true, lungoMax: 50 };
  const lungo = { channel: '#c-bit-lungo', user: 'ada', text: 'x'.repeat(200), bits: 5 };
  assert.ok(valuta(lungo, cfg), 'un muro di testo resta un muro di testo anche con i bit');
});
