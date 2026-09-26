// LO STILE DEL QR SALVATO NEL CANALE (src/features/qr-stile.js): si tiene la
// forma, e quello che non e' una scelta conosciuta torna quello di serie.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normStileQr, DI_SERIE, LOGO_MAX } from '../../src/features/qr-stile.js';

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
