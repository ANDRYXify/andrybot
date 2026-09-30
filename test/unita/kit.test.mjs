// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL DISEGNO DEL MEDIA KIT (src/web/public/kit.js): i pezzi che decidono cosa
// ci sta e come, provati con una misura del testo finta ma coerente (ogni
// carattere largo 10). Il foglio intero si guarda nel browser.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/web/public/kit.js');
const K = globalThis.SB_KIT;
const g = { measureText: (s) => ({ width: String(s).length * 10 }) };

test('il contrasto e\' quello della norma: nero su bianco 21, uguale su uguale 1', () => {
  assert.equal(Math.round(K.contrasto('#000000', '#ffffff')), 21);
  assert.equal(K.contrasto('#777', '#777777'), 1);
  assert.ok(K.contrasto('rgba(255, 255, 255, .5)', '#000') > 20, 'rgba si legge per il colore');
  assert.equal(K.contrasto('non un colore', '#fff'), 1, 'un colore illeggibile non passa per buono');
});

test('bianco o nero puro, quello che contrasta di piu\': su qualunque colore arriva a 4,5', () => {
  // col nero puro il caso peggiore e' 4,58; con un nero morbido (#111) un
  // accento come #6666ff restava sotto con tutti e due
  const passi = [0, 51, 102, 153, 204, 255];
  for (const r of passi) for (const g of passi) for (const b of passi) {
    const c = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    assert.ok(K.contrasto(K.inchiostro(c), c) >= 4.5, c);
  }
  assert.equal(K.inchiostro('#6666ff'), '#000000');
  assert.equal(K.inchiostro('#1a1919'), '#ffffff');
});

test('taglia: sta o si accorcia coi puntini, e lo dice', () => {
  assert.deepEqual(K.taglia(g, 'ciao', 40), { testo: 'ciao', tagliato: false });
  const t = K.taglia(g, 'buongiorno', 50);
  assert.equal(t.tagliato, true);
  assert.ok(g.measureText(t.testo).width <= 50 && t.testo.endsWith('…'));
});

test('le righe vanno a capo fra le parole, rispettano gli a capo, e oltre il massimo lo dicono', () => {
  assert.deepEqual(K.righe(g, 'uno due tre quattro', 80, 4).righe, ['uno due', 'tre', 'quattro']);
  assert.deepEqual(K.righe(g, 'uno\ndue', 200, 4).righe, ['uno', 'due']);
  const r = K.righe(g, 'a b c d e f g h', 30, 2);
  assert.equal(r.righe.length, 2);
  assert.equal(r.tagliato, true);
  assert.ok(r.righe[1].endsWith('…'), 'chi legge vede che continua');
  assert.equal(K.righe(g, 'corto', 200, 4).tagliato, false);
});

test('l\'elenco va a capo fra le voci, mai dentro una voce, e il separatore non resta da solo', () => {
  const r = K.elenco(g, ['Ghiro Gear Italia', 'Nebbia', 'Forno'], 260, 3, ' · ');
  assert.deepEqual(r.righe, ['Ghiro Gear Italia · Nebbia', 'Forno']);
  const lunghi = K.elenco(g, ['M'.repeat(40), 'N'.repeat(40)], 200, 3, ' · ');
  assert.equal(lunghi.righe.length, 2);
  assert.ok(lunghi.righe.every((x) => x !== '·' && x.trim() !== '·'), 'nessuna riga fatta del solo separatore');
  assert.equal(lunghi.tagliato, true, 'una voce accorciata si dice');
  const troppi = K.elenco(g, Array.from({ length: 12 }, (_, i) => `Marca${i}`), 150, 2, ' · ');
  assert.equal(troppi.righe.length, 2);
  assert.equal(troppi.tagliato, true);
});

test('le misure del foglio sono quelle di un A4 a 150 punti per pollice', () => {
  assert.deepEqual([K.W, K.H], [1240, 1754]);
  assert.ok(Math.abs(K.W / K.H - 210 / 297) < 0.001);
});
