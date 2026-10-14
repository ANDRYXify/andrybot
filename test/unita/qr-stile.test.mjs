// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO STILE DEL QR SALVATO NEL CANALE (src/features/qr-stile.js): si tiene la
// forma, e quello che non e' una scelta conosciuta torna quello di serie. E
// la sua firma, che dice da quale QR e' nata un'immagine delle Grafiche.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normStileQr, DI_SERIE, LOGO_MAX, DISEGNO_QR, FIRMA_RE, firmaStileQr, firmaMandata } from '../../src/features/qr-stile.js';

test('niente, o una cosa storta, e\' lo stile di serie', () => {
  for (const x of [undefined, null, 'ciao', [], 7]) assert.deepEqual(normStileQr(x), { ...DI_SERIE });
});

test('le scelte conosciute restano, le altre no', () => {
  const s = normStileQr({ moduli: 'penna', occhi: 'tondi', scuro: '#1D2A6B', chiaro: '#FBFAF5', occhio: '#BA007A', cornice: '  Inquadrami   qui ', logoLato: 64.4, testo: ' https://socialbot.live/u/x ' });
  assert.deepEqual(s, { moduli: 'penna', occhi: 'tondi', scuro: '#1d2a6b', chiaro: '#fbfaf5', occhio: '#ba007a', cornice: 'Inquadrami qui', logo: 'no', logoImg: '', logoLato: 64, testo: 'https://socialbot.live/u/x' });
  const b = normStileQr({ moduli: 'stelline', occhi: '<b>', scuro: 'red', chiaro: '#fff', occhio: 'javascript:1', logoLato: 5000 });
  assert.deepEqual([b.moduli, b.occhi, b.scuro, b.chiaro, b.occhio, b.logoLato], ['quadrati', 'quadrati', DI_SERIE.scuro, DI_SERIE.chiaro, '', 100]);
  assert.equal(normStileQr({ logoLato: 3 }).logoLato, 20);
});

test('il logo caricato e\' un\'immagine vera e piccola, altrimenti niente logo', () => {
  const png = 'data:image/png;base64,' + 'A'.repeat(100);
  assert.deepEqual(normStileQr({ logo: 'immagine', logoImg: png }).logoImg, png);
  assert.equal(normStileQr({ logo: 'immagine', logoImg: 'data:image/svg+xml;base64,AAAA' }).logo, 'no', 'niente SVG: puo\' portare script');
  assert.equal(normStileQr({ logo: 'immagine', logoImg: 'data:image/png;base64,' + 'A'.repeat(LOGO_MAX) }).logo, 'no', 'troppo pesante');
  assert.equal(normStileQr({ logo: 'immagine', logoImg: 'https://altro.sito/x.png' }).logo, 'no', 'un indirizzo di fuori sporcherebbe la tela');
  assert.deepEqual(normStileQr({ logo: 'foto', logoImg: png }), { ...DI_SERIE, logo: 'foto' }, 'con la foto l\'immagine caricata non si tiene');
});

// LA FIRMA DELLO STILE NELLE GRAFICHE: dice da quale QR e' nata un'immagine
// salvata. Uguale per due stili che si disegnano uguali, diversa per due che
// si disegnano diversi; testo e cornice non contano, perche' le Grafiche
// mettono sempre l'indirizzo del canale e niente cornice.
const PNG = 'data:image/png;base64,' + 'A'.repeat(100);
const PNG2 = 'data:image/png;base64,' + 'B'.repeat(100);
const FOTO = 'https://static-cdn.jtvnw.net/jtv_user_pictures/uno-profile_image-300x300.png';
const BASE = { moduli: 'penna', occhi: 'tondi', scuro: '#1d2a6b', chiaro: '#fbfaf5', occhio: '#ba007a', cornice: 'Inquadrami', logo: 'no', logoImg: '', logoLato: 80, testo: 'https://socialbot.live/u/x' };

test('la firma: sedici cifre, sempre le stesse per lo stesso stile, in qualunque ordine', () => {
  assert.ok(Number.isInteger(DISEGNO_QR) && DISEGNO_QR >= 1);
  const f = firmaStileQr(BASE);
  assert.match(f, FIRMA_RE);
  assert.equal(firmaStileQr(BASE), f, 'deterministica');
  const rovescio = Object.fromEntries(Object.entries(BASE).reverse());
  assert.equal(firmaStileQr(rovescio), f, 'l\'ordine delle chiavi non conta');
  assert.equal(firmaStileQr(normStileQr(BASE)), f, 'normalizzato o no, e\' lo stesso stile');
  assert.equal(firmaStileQr(undefined), firmaStileQr({ ...DI_SERIE }), 'niente e\' lo stile di serie');
  assert.equal(firmaStileQr('ciao'), firmaStileQr(null));
});

test('la firma e\' la stessa per due stili che si disegnano uguali', () => {
  const f = firmaStileQr(BASE);
  const uguali = [
    { ...BASE, scuro: '#1D2A6B', chiaro: '#FBFAF5', occhio: '#BA007A' },
    { ...BASE, logoLato: 80.4 },
    { ...BASE, testo: 'https://altro.sito/qualcosa', cornice: 'Tutt\'altro' },
    { ...BASE, testo: '', cornice: '' },
    { ...BASE, logoLato: 20 },
    { ...BASE, logoImg: PNG },
  ];
  uguali.forEach((x, i) => assert.equal(firmaStileQr(x), f, `variante ${i}`));
  assert.equal(firmaStileQr({ ...BASE, moduli: 'stelline' }), firmaStileQr({ ...BASE, moduli: 'quadrati' }), 'una forma sconosciuta e\' quella di serie');
  assert.equal(firmaStileQr({ ...BASE, occhio: BASE.scuro }), firmaStileQr({ ...BASE, occhio: '' }), 'occhi del colore dei quadratini = nessun colore: qr.js li disegna uguali');
  assert.equal(firmaStileQr({ ...BASE, logo: 'immagine' }), f, 'il logo «immagine» senza immagine non c\'e\'');
  assert.equal(firmaStileQr({ ...BASE, logo: 'foto', logoImg: PNG }, { avatar: FOTO }), firmaStileQr({ ...BASE, logo: 'foto' }, { avatar: FOTO }), 'con la foto l\'immagine caricata non conta');
  assert.equal(firmaStileQr(BASE, { avatar: FOTO }), f, 'senza il logo «la tua foto» la foto non conta');
  assert.equal(firmaStileQr({ ...BASE, logo: 'immagine', logoImg: PNG }, { avatar: FOTO }), firmaStileQr({ ...BASE, logo: 'immagine', logoImg: PNG }), 'nemmeno col logo caricato');
});

test('la firma cambia per tutto quello che cambia il QR disegnato', () => {
  const varianti = {
    base: [BASE],
    moduli: [{ ...BASE, moduli: 'morbidi' }],
    occhi: [{ ...BASE, occhi: 'quadrati' }],
    scuro: [{ ...BASE, scuro: '#000000' }],
    chiaro: [{ ...BASE, chiaro: '#ffffff' }],
    occhio: [{ ...BASE, occhio: '' }],
    'logo foto': [{ ...BASE, logo: 'foto' }, { avatar: FOTO }],
    'altra foto': [{ ...BASE, logo: 'foto' }, { avatar: FOTO.replace('uno', 'due') }],
    'foto che non c\'e\'': [{ ...BASE, logo: 'foto' }, { avatar: '' }],
    'logo immagine': [{ ...BASE, logo: 'immagine', logoImg: PNG }],
    'altra immagine': [{ ...BASE, logo: 'immagine', logoImg: PNG2 }],
    'lato del logo': [{ ...BASE, logo: 'immagine', logoImg: PNG, logoLato: 50 }],
    'lato della foto': [{ ...BASE, logo: 'foto', logoLato: 50 }, { avatar: FOTO }],
    disegno: [BASE, { disegno: DISEGNO_QR + 1 }],
  };
  const firme = Object.entries(varianti).map(([nome, [stile, opz]]) => [nome, firmaStileQr(stile, opz)]);
  const viste = new Map();
  for (const [nome, f] of firme) {
    assert.ok(!viste.has(f), `«${nome}» ha la stessa firma di «${viste.get(f)}»`);
    viste.set(f, nome);
  }
});

test('la firma rimandata dal pannello: assente si accetta vuota, uguale si tiene, diversa o storta no', () => {
  const adesso = firmaStileQr(BASE);
  for (const v of [undefined, null, '']) assert.deepEqual(firmaMandata(v, adesso), { ok: true, firma: '' }, String(v));
  assert.deepEqual(firmaMandata(adesso, adesso), { ok: true, firma: adesso });
  assert.deepEqual(firmaMandata(firmaStileQr({ ...BASE, scuro: '#000000' }), adesso), { ok: false }, 'un altro stile');
  assert.deepEqual(firmaMandata('zz' + adesso.slice(2), adesso), { ok: false }, 'storta');
  assert.deepEqual(firmaMandata(adesso.toUpperCase(), adesso), { ok: false }, 'la firma si scrive in un modo solo');
  assert.deepEqual(firmaMandata('abc', 'abc'), { ok: false }, 'e quella di adesso dev\'essere una firma vera');
});
