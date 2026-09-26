// IL MOTORE DELLE GRAFICHE PROMO (docs/PROMO.md): le parti che non hanno
// bisogno di una tela. Il resto lo guarda il collaudo da browser.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/web/public/penna.js');
await import('../../src/web/public/promo.js');
const S = globalThis.SB_PROMO;

test('il titolo: asterischi per il colore, | per andare a capo', () => {
  assert.deepEqual(S.parole('Il bot che *con il tuo nome.*'), [
    { t: 'Il bot', em: false }, { t: 'che', em: false },
    { t: 'con', em: true }, { t: 'il tuo', em: true }, { t: 'nome.', em: true }]);
  assert.deepEqual(S.parole('Un | anno *gratis.*'), [{ t: 'Un', em: false }, { capo: true }, { t: 'anno', em: false }, { t: 'gratis.', em: true }]);
  assert.deepEqual(S.parole('  '), []);
  assert.deepEqual(S.parole('in~chat *con~il~tuo~nome.*'), [{ t: 'in chat', em: false }, { t: 'con il tuo nome.', em: true }], '~ tiene insieme le parole: un a capo non le separa');
});

test('una parola di una o due lettere non resta in fondo alla riga', () => {
  assert.deepEqual(S.parole('Scan it: one year of everything, free').map((p) => p.t), ['Scan', 'it:', 'one', 'year', 'of everything,', 'free'], 'la virgola o i due punti chiudono: «it:» puo\' stare in fondo');
  assert.deepEqual(S.parole('Inquadra: un anno di tutto, gratis').map((p) => p.t), ['Inquadra:', 'un anno', 'di tutto,', 'gratis']);
  assert.deepEqual(S.parole('e a te').map((p) => p.t), ['e a te'], 'le corte in fila vanno tutte con la prima lunga');
  assert.deepEqual(S.parole('di *tutto*'), [{ t: 'di', em: false }, { t: 'tutto', em: true }], 'non si incolla fra colori diversi');
});

test('gli a capo: le righe piu\' pari, e mai oltre la larghezza', () => {
  const larg = [3, 3, 3, 5, 5];
  assert.deepEqual(S.spezza(larg, 1, 11), [[0, 3], [3, 5]], '3+1+3+1+3 = 11 e 5+1+5 = 11');
  assert.deepEqual(S.spezza([4, 4, 4, 4], 1, 9), [[0, 2], [2, 4]], 'due e due, non tre e uno');
  assert.equal(S.spezza([12], 1, 10), null, 'una parola piu\' larga della riga non ci sta');
  for (const r of S.spezza([2, 7, 1, 1, 6, 3, 2, 5], 1, 12)) assert.ok(r[1] > r[0]);
});

test('le faccine involontarie si trovano, le frasi normali no', () => {
  for (const f of ['Scan it: 1 year', 'ciao :)', 'fatto ;P', 'ecco: D', 'Inquadra: 1 anno', 'x =)']) assert.ok(S.faccina(f), f);
  for (const f of ['Scan it: one year of everything', 'Inquadra: un anno di tutto', 'Twitch, Kick', 'socialbot.live/nyc', 'ore 21:00']) assert.equal(S.faccina(f), '', f);
});

test('i tempi: la grafica intera resta ferma almeno tre secondi', () => {
  assert.equal(S.FERMA, 3);
  for (const [v, t] of Object.entries(S.TEMPI)) {
    const ultimo = Math.max(...Object.entries(t).filter(([k]) => k !== 'durata').map(([, x]) => x));
    assert.ok(t.durata - ultimo > S.FERMA, `${v}: l'ultimo pezzo parte a ${ultimo} s su ${t.durata}`);
  }
  assert.ok(S.TEMPI.piena.titolo < S.TEMPI.piena.chat, 'prima il messaggio, poi la prova');
});

test('il contenitore del video: la testa e i fotogrammi come li legge ffmpeg', () => {
  const f = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
  const b = S.ivf(f, 3744, 2196, 30, 'VP90');
  const dv = new DataView(b.buffer);
  assert.equal(String.fromCharCode(...b.slice(0, 4)), 'DKIF');
  assert.equal(dv.getUint16(6, true), 32, 'testa di 32 byte');
  assert.equal(String.fromCharCode(...b.slice(8, 12)), 'VP90');
  assert.deepEqual([dv.getUint16(12, true), dv.getUint16(14, true)], [3744, 2196]);
  assert.deepEqual([dv.getUint32(16, true), dv.getUint32(20, true)], [30, 1], '30 fotogrammi al secondo');
  assert.equal(dv.getUint32(24, true), 2);
  assert.deepEqual([dv.getUint32(32, true), dv.getUint32(36, true)], [3, 0], 'il primo: 3 byte, tempo 0');
  assert.deepEqual([...b.slice(44, 47)], [1, 2, 3]);
  assert.deepEqual([dv.getUint32(47, true), dv.getUint32(51, true)], [2, 1], 'il secondo: 2 byte, tempo 1');
  assert.equal(b.length, 32 + 12 + 3 + 12 + 2);
});

test('i formati: quelli degli schermi, e l\'anteprima dei link', () => {
  const m = Object.fromEntries(S.FORMATI.map((f) => [f.id, [f.w, f.h]]));
  assert.deepEqual(m.orizzontale, [1920, 1080]);
  assert.deepEqual(m.verticale, [1080, 1920]);
  assert.deepEqual(m['times-square'], [3744, 2196]);
  assert.deepEqual(m.anteprima, [1200, 630]);
});
