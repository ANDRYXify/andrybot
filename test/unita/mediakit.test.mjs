// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MEDIA KIT (src/features/mediakit.js, docs/STRUMENTI.md): ogni numero dai
// rapporti degli ultimi trenta giorni, la media pesata sul tempo, le soglie
// sotto le quali un numero non esce, le percentuali che sommano a cento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-mediakit-');
const { streamers, rapporti, memory } = await import('../../src/db.js');
const K = await import('../../src/features/mediakit.js');
process.on('exit', () => usaEGetta.pulisci());

const ORA = Date.parse('2026-09-26T12:00:00Z');
const GIORNO = 86_400_000, ORA_MS = 3_600_000;
streamers.upsertApproved('pieno', 'Pieno');
streamers.upsertApproved('poco', 'Poco');

const diretta = (ch, giorniFa, { ore = 2, media = 0, giri = 0, picco = 0, follow = 0, categorie } = {}) => {
  const fine = ORA - giorniFa * GIORNO;
  rapporti.salva(ch, { inizio: fine - ore * ORA_MS, fine, dati: { durataMs: ore * ORA_MS, media, giri, picco, follow, ...(categorie ? { categorie } : {}) } });
};

test('le percentuali sono intere e sommano esattamente a cento', () => {
  assert.deepEqual(K.percentuali([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(K.percentuali([2, 1]), [67, 33]);
  assert.deepEqual(K.percentuali([0, 0]), [0, 0]);
  for (const pesi of [[7, 3, 5, 11, 2], [1, 2, 3, 4, 5, 6], [999, 1], [13, 13, 13, 13, 13, 13, 13]]) {
    assert.equal(K.percentuali(pesi).reduce((a, b) => a + b, 0), 100, pesi.join(','));
  }
});

test('la media e\' pesata sul tempo, il picco e\' il massimo, le ore e i follow si sommano', () => {
  diretta('pieno', 1, { ore: 6, media: 100, giri: 72, picco: 180, follow: 10, categorie: [{ nome: 'Minecraft', giri: 72 }] });
  diretta('pieno', 5, { ore: 1, media: 30, giri: 12, picco: 45, follow: 2, categorie: [{ nome: 'Just Chatting', giri: 12 }] });
  diretta('pieno', 9, { ore: 2, media: 50, giri: 24, picco: 70, follow: 3, categorie: [{ nome: 'Minecraft', giri: 12 }, { nome: 'Just Chatting', giri: 12 }] });
  diretta('pieno', 40, { ore: 9, media: 9999, giri: 9, picco: 9999, follow: 999 });
  memory.logMessage('pieno', 'marco', 'Marco', 'ciao', false, ORA - 2 * GIORNO);
  memory.logMessage('pieno', 'giada', 'Giada', 'ciao', false, ORA - 3 * GIORNO);
  memory.logMessage('pieno', 'marco', 'Marco', 'ancora', false, ORA - 4 * GIORNO);
  memory.logMessage('pieno', 'pieno', 'Pieno', 'io', false, ORA - 4 * GIORNO);
  memory.logMessage('pieno', 'vecchio', 'Vecchio', 'prima', false, ORA - 45 * GIORNO);
  const n = K.numeri('pieno', { ora: ORA });
  assert.equal(n.dirette, 3, 'la diretta di quaranta giorni fa resta fuori');
  assert.equal(n.ore, 9);
  assert.equal(n.media, Math.round((100 * 72 + 30 * 12 + 50 * 24) / (72 + 12 + 24)), 'sei ore pesano sei volte un\'ora');
  assert.notEqual(n.media, Math.round((100 + 30 + 50) / 3), 'la media delle medie sarebbe un altro numero');
  assert.equal(n.picco, 180);
  assert.equal(n.follow, 15);
  assert.equal(n.persone, 2, 'chi ha scritto nel periodo, senza lo streamer');
  assert.deepEqual(n.categorie, [{ nome: 'Minecraft', quota: 78 }, { nome: 'Just Chatting', quota: 22 }]);
  assert.deepEqual(n.basta, { numeri: true, media: true, categorie: true });
});

test('sotto le tre dirette media, picco e categorie non escono', () => {
  diretta('poco', 2, { ore: 3, media: 40, giri: 36, picco: 60, categorie: [{ nome: 'Fortnite', giri: 36 }] });
  diretta('poco', 4, { ore: 2, media: 20, giri: 24, picco: 30 });
  const n = K.numeri('poco', { ora: ORA });
  assert.equal(n.dirette, 2);
  assert.deepEqual([n.media, n.picco, n.categorie], [null, null, []]);
  assert.deepEqual(n.basta, { numeri: false, media: false, categorie: false });
  diretta('poco', 6, { ore: 1, media: 10, giri: 0, picco: 12 });
  const m = K.numeri('poco', { ora: ORA });
  assert.equal(m.basta.numeri, true);
  assert.equal(m.basta.categorie, false, 'le categorie vogliono tre dirette che le abbiano');
  assert.equal(m.media, Math.round((40 * 36 + 20 * 24) / 60), 'una diretta senza campioni non entra nella media');
});

test('le categorie oltre la quarta vanno in «Altro»', () => {
  const c = K.categorieDi(new Map([['A', 50], ['B', 20], ['C', 10], ['D', 10], ['E', 5], ['F', 5]]));
  assert.deepEqual(c.map((x) => x.nome), ['A', 'B', 'C', 'D', '']);
  assert.equal(c[4].altro, true);
  assert.equal(c.reduce((a, x) => a + x.quota, 0), 100);
});

test('i social vengono dalla pagina link: una volta sola, solo piattaforme, solo indirizzi web', () => {
  const pagina = { blocchi: [
    { tipo: 'social', voci: [{ icona: 'instagram', url: 'https://instagram.com/andryx' }, { icona: 'tiktok', url: 'javascript:alert(1)' }] },
    { tipo: 'link', icona: 'youtube', url: 'https://youtube.com/@andryx', label: 'YouTube' },
    { tipo: 'link', icona: 'caffe', url: 'https://ko-fi.com/andryx', label: 'Un caffè' },
    { tipo: 'link', icona: 'instagram', url: 'https://instagram.com/andryx', label: 'Doppio' },
  ] };
  assert.deepEqual(K.socialDaPagina(pagina), [
    { icona: 'instagram', url: 'https://instagram.com/andryx' },
    { icona: 'youtube', url: 'https://youtube.com/@andryx' },
  ]);
  assert.deepEqual(K.socialDaPagina(null), []);
});

test('quello che si salva ha forma: email vera, collaborazioni corte, niente numeri scritti a mano', () => {
  const k = K.normKit({ presentazione: '  Gioco   a tutto\n\n\n\ne parlo ', email: 'lavoro@andryx.it', collaborazioni: 'Nebbia Audio, , Pixelforno,Nebbia Audio', mostra: { media: false }, tema: 'notte', media: 99999 });
  assert.deepEqual(k, {
    presentazione: 'Gioco a tutto\n\ne parlo', email: 'lavoro@andryx.it', collaborazioni: ['Nebbia Audio', 'Pixelforno'],
    mostra: Object.fromEntries(K.MOSTRA.map((x) => [x, x !== 'media'])), tema: 'notte',
  });
  assert.equal(K.normKit({ email: 'non una mail' }).email, '');
  assert.equal(K.normKit({ email: 'a@b.c"<script>' }).email, '');
  assert.equal(K.normKit({ tema: 'rosa' }).tema, 'pagina');
  assert.equal(K.normKit({ collaborazioni: Array.from({ length: 20 }, (_, i) => `M${i}`) }).collaborazioni.length, 8);
  assert.equal('media' in K.normKit({ media: 5 }), false, 'un numero non si scrive a mano');
});
