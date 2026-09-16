// LA CARTA DELL'ANTEPRIMA DEL LINK: due preset fatti di dati, che tornano
// identici dal giro della ripulitura e dalla tinta col proprio segnale; la
// tinta con un altro colore veste il disegno senza toccare il resto; la carta
// rifatta vince sullo standard; l'immagine si rende e il testo disegna davvero;
// e la carta di ognuna delle due pagine si salva e si toglie per conto suo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-carta-pagina-');
const { cartePagina } = await import('../../src/db.js');
const {
  TEMI_PAGINA, NOMI_TEMI_PAGINA, SEGNALE_PAGINA, MISURA_PAGINA,
  tintaCarta, cartaPaginaDi, normCarta, svgCarta, resaCarta, disegnabile, mescola, suColore,
} = await import('../../src/features/cartalive.js');
process.on('exit', () => usaEGetta.pulisci());

const DATI = { nome: 'ANDRYXify', titolo: 'Dirette, giochi e chiacchiere', login: 'andryxify', link: 'socialbot.live/u/andryxify', avatar: '' };

test('due preset, fatti di dati, nella misura dell\'anteprima', () => {
  assert.deepEqual(NOMI_TEMI_PAGINA, ['link', 'dona']);
  for (const q of NOMI_TEMI_PAGINA) {
    const t = TEMI_PAGINA[q];
    assert.equal(t.larghezza, MISURA_PAGINA.larghezza); assert.equal(t.altezza, 630);
    assert.ok(t.elementi.length >= 5);
    for (const e of t.elementi) assert.ok(e.id && e.tipo && !JSON.stringify(e).includes('<'), `${q}/${e.id}`);
    assert.ok(t.elementi.some((e) => e.tipo === 'avatar') && t.elementi.some((e) => e.testo === '{nome}') && t.elementi.some((e) => e.testo === '{link}'), `${q}: faccia, nome e indirizzo`);
  }
});

test('ripulire un preset non lo cambia, e tingerlo col suo segnale nemmeno', () => {
  for (const q of NOMI_TEMI_PAGINA) {
    const t = TEMI_PAGINA[q];
    const salvata = JSON.parse(JSON.stringify(normCarta(t)));
    assert.deepEqual(normCarta(salvata), salvata, `${q}: ripulirla due volte da\' due carte diverse`);
    assert.deepEqual(normCarta(tintaCarta(t, SEGNALE_PAGINA[q], SEGNALE_PAGINA[q])), salvata, `${q}: la tinta col segnale e\' l\'identita\'`);
    assert.deepEqual(cartaPaginaDi({ quale: q, accento: SEGNALE_PAGINA[q] }), salvata, `${q}: lo standard col suo colore e\' il preset`);
  }
});

test('la tinta veste il disegno col colore della pagina e lascia il resto', () => {
  const t = tintaCarta(TEMI_PAGINA.link, SEGNALE_PAGINA.link, '#00c853');
  assert.equal(t.fondo.alone, '#00C853'); assert.equal(t.fondo.alone2, mescola('#00c853', '#000000', 0.55));
  assert.equal(t.elementi.find((e) => e.id === 'avatar').bordo, '#00C853');
  assert.equal(t.elementi.find((e) => e.id === 'trattino').colore, '#00C853');
  const targa = t.elementi.find((e) => e.id === 'targhetta');
  assert.equal(targa.sfondo, '#00C853'); assert.equal(targa.colore, suColore('#00c853'), 'il testo della targhetta resta leggibile');
  assert.equal(t.elementi.find((e) => e.id === 'nome').colore, '#FFFFFF', 'il nome non era del segnale: non si tocca');
  const d = tintaCarta(TEMI_PAGINA.dona, SEGNALE_PAGINA.dona, '#fff');
  assert.equal(d.fondo.alone, mescola('#ffffff', '#000000', 0.72)); assert.equal(d.elementi.find((e) => e.id === 'striscia').colore, '#FFFFFF');
  assert.equal(d.elementi.find((e) => e.id === 'targhetta').colore, '#000000', 'su un chiaro il testo va nero');
  assert.equal(d.elementi.find((e) => e.id === 'filo').colore, '#2E1F2A', 'il filo non era del segnale');
  assert.deepEqual(tintaCarta(TEMI_PAGINA.link, SEGNALE_PAGINA.link, 'boh'), TEMI_PAGINA.link, 'un colore che non e\' un colore non tinge');
  assert.equal(suColore('#ffeb3b'), '#000000'); assert.equal(suColore('#1a1a1a'), '#FFFFFF');
});

test('cartaPaginaDi: la carta rifatta vince, sennò lo standard tinto e ripulito', () => {
  const std = cartaPaginaDi({ quale: 'dona', accento: '#ff0000' });
  assert.equal(std.nome, 'Sostienimi'); assert.equal(std.elementi.find((e) => e.id === 'striscia').colore, '#FF0000');
  assert.deepEqual(normCarta(std), std);
  const mia = { nome: 'La mia', larghezza: 1200, altezza: 630, fondo: { tipo: 'tinta', tinta: '#123456' }, elementi: [{ id: 'nome', tipo: 'testo', x: 100, y: 100, testo: '{nome}' }] };
  const c = cartaPaginaDi({ dati: mia, quale: 'link', accento: '#ff0000' });
  assert.equal(c.nome, 'La mia'); assert.equal(c.fondo.tinta, '#123456');
  assert.equal(cartaPaginaDi({ quale: 'boh' }).nome, 'I miei link', 'un quale sconosciuto e\' la pagina link');
});

test('il disegno porta nome, sottotitolo e indirizzo, e in PNG il testo disegna davvero', async () => {
  for (const q of NOMI_TEMI_PAGINA) {
    const svg = svgCarta(TEMI_PAGINA[q], DATI);
    assert.ok(svg.includes('ANDRYXify') || svg.includes('ANDRYXIFY')); assert.ok(svg.includes('socialbot.live/u/andryxify'));
    assert.ok(svg.includes('width="1200" height="630"'));
  }
  if (!disegnabile()) return;
  for (const q of NOMI_TEMI_PAGINA) {
    const piena = await resaCarta(TEMI_PAGINA[q], DATI);
    const muta = await resaCarta({ ...TEMI_PAGINA[q], elementi: TEMI_PAGINA[q].elementi.filter((e) => e.tipo !== 'testo' && e.tipo !== 'targhetta') }, DATI);
    const a = piena.pixels, b = muta.pixels;
    let diversi = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diversi++;
    assert.ok(diversi > 4000, `${q}: il testo cambia l'immagine (${diversi} pixel)`);
  }
});

test('una carta per pagina: si salva, si rilegge ripulita, si toglie senza toccare l\'altra', () => {
  assert.equal(cartePagina.get('andry', 'link'), null);
  const mia = { nome: 'Mia', larghezza: 1200, altezza: 630, fondo: { tipo: 'tinta', tinta: '#111111' }, elementi: [{ id: 'nome', tipo: 'testo', x: 10, y: 10, testo: '{nome}' }] };
  const r = cartePagina.set('Andry', 'link', mia);
  assert.equal(r.dati.nome, 'Mia'); assert.ok(r.ts > 0);
  assert.equal(cartePagina.get('andry', 'dona'), null, 'l\'altra pagina resta standard');
  cartePagina.set('andry', 'dona', mia);
  assert.equal(cartePagina.set('andry', 'link', null), null);
  assert.equal(cartePagina.get('andry', 'link'), null); assert.ok(cartePagina.get('andry', 'dona'));
  assert.equal(cartePagina.set('andry', 'dona', { elementi: [] }), null, 'senza elementi non e\' una carta: via');
});
