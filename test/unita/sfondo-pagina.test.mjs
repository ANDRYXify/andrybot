// L'IMMAGINE DI SFONDO DELLA PAGINA LINK, spostata e in scala (docs/SFONDO-PAGINA.md).
// Il punto (X, Y) dell'immagine sta sul punto (X, Y) dello schermo, la
// grandezza e' rispetto a «copre lo schermo», e dove l'immagine non arriva
// continuano i colori dei suoi bordi. Qui la regola scritta: che il salvataggio
// tenga solo valori buoni, e che la pagina scriva la geometria giusta. La misura
// sui pixel di un browser vero sta in scripts/verifica-pagina-link.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-sfondo-');
const { linkPage } = await import('../../src/db.js');
const { renderLinkPage, stratoSfondo } = await import('../../src/features/linkpagina.js');
process.on('exit', () => usaEGetta.pulisci());

const SEI = ['#101010', '#202020', '#303030', '#404040', '#505050', '#606060'];
const ANGOLI = ['#0a0a0a', '#0b0b0b', '#0c0c0c', '#0d0d0d'];
const BORDI = { su: SEI, giu: SEI, sx: SEI, dx: SEI, angoli: ANGOLI };
const tema = (t) => linkPage.pulisci({ tema: { sfondoTipo: 'immagine', sfondoUrl: 'https://cdn.esempio.it/a.jpg', ...t } }).tema;

test('il salvataggio tiene solo valori buoni', () => {
  const t = tema({ sfondoX: 140, sfondoY: -3, sfondoScala: 10, sfondoRapporto: 1.77777777, sfondoRiempi: 'boh', sfondoBordi: BORDI });
  assert.equal(t.sfondoX, 100);
  assert.equal(t.sfondoY, 0);
  assert.equal(t.sfondoScala, 40, 'piu\' piccola del 40% no');
  assert.equal(t.sfondoRapporto, 1.7778);
  assert.equal(t.sfondoRiempi, 'bordi');
  assert.deepEqual(t.sfondoBordi, BORDI);
  assert.equal(tema({ sfondoScala: 900 }).sfondoScala, 200);
  assert.equal(tema({}).sfondoScala, 100, 'di serie copre lo schermo');
  assert.equal(tema({}).sfondoX, 50);
  assert.equal(tema({ sfondoRapporto: 40 }).sfondoRapporto, 0, 'una forma impossibile non si tiene');
  assert.equal(tema({ sfondoBordi: { ...BORDI, su: [...SEI.slice(0, 5), 'red'] } }).sfondoBordi, null, 'un colore storto e i bordi non valgono');
  assert.equal(tema({ sfondoBordi: { ...BORDI, dx: SEI.slice(0, 4) } }).sfondoBordi, null, 'sei per lato, non meno');
  assert.equal(tema({ sfondoBordi: { ...BORDI, angoli: ANGOLI.slice(0, 3) } }).sfondoBordi, null, 'e i quattro angoli');
});

test('la pagina scrive il punto, la grandezza e la forma', () => {
  const s = stratoSfondo(tema({ sfondoX: 30, sfondoY: 100, sfondoScala: 60, sfondoRapporto: 1.5, sfondoBordi: BORDI }), { bg: '#000000' });
  assert.match(s.css, /:root\{--sf-x:0\.3;--sf-y:1;--sf-s:0\.6;--sf-r:1\.5;--sf-f:3%\}/);
  assert.ok(s.css.includes('--lc:max(100cqw,calc(100cqh * var(--sf-r)))'), 'la larghezza che copre lo schermo');
  assert.ok(s.css.includes('--sx:calc((100cqw - var(--li)) * var(--sf-x))'), 'il punto X dell\'immagine sul punto X dello schermo');
  assert.ok(s.css.includes('--sy:calc((100cqh - var(--ai)) * var(--sf-y))'));
  assert.equal(stratoSfondo(tema({ sfondoScala: 100, sfondoRapporto: 1.5 }), { bg: '#000000' }).css.includes('--sf-f:0%'), true,
    'coprendo lo schermo i bordi non sfumano: sarebbero i bordi dello schermo');
  assert.equal(stratoSfondo(tema({ sfondoRapporto: 0 }), { bg: '#000000' }), null, 'senza la forma non si calcola: la pagina copre come prima');
});

test('dove l\'immagine non arriva continuano i suoi bordi', () => {
  const s = stratoSfondo(tema({ sfondoScala: 60, sfondoRapporto: 1.5, sfondoBordi: BORDI }), { bg: '#000000' });
  assert.ok(s.html.includes('<div class="sf-su"></div><div class="sf-giu"></div><div class="sf-sx"></div><div class="sf-dx"></div><div class="sf-img"></div>'),
    'le fasce sotto, l\'immagine sopra');
  assert.ok(s.css.includes('.sf-su{left:0;right:0;top:0;height:max(0px,var(--sy));background:linear-gradient(90deg,#0a0a0a var(--sx),#101010 calc(var(--sx) + var(--li) * 0.0833),'),
    'la fascia sopra comincia col colore dell\'angolo alto a sinistra, e il primo colore sta al centro del primo sesto');
  assert.ok(s.css.includes('#606060 calc(var(--sx) + var(--li) * 0.9167),#0b0b0b calc(var(--sx) + var(--li)))'), 'e finisce con quello alto a destra');
  assert.ok(s.css.includes('.sf-sx{left:0;top:0;bottom:0;width:max(0px,var(--sx));background:linear-gradient(180deg,#0a0a0a var(--sy),'),
    'la fascia a sinistra comincia con lo stesso angolo: dove si sovrappongono hanno lo stesso colore');
  assert.ok(s.css.includes(',#0c0c0c calc(var(--sy) + var(--ai)))}'), 'e finisce con quello in basso a sinistra, come la fascia sotto');
  assert.ok(!/to top|to left/.test(s.css), 'niente sfumature verso la media: negli angoli farebbero una cucitura');
  assert.ok(s.css.includes('.sf-giu{left:0;right:0;top:calc(var(--sy) + var(--ai));bottom:0;'), 'quella sotto parte da dove l\'immagine finisce');
  const t = stratoSfondo(tema({ sfondoScala: 60, sfondoRapporto: 1.5, sfondoBordi: BORDI, sfondoRiempi: 'tema' }), { bg: '#000000', bg2: '#222222' });
  assert.ok(!t.html.includes('sf-su'), 'col colore dello sfondo, niente fasce');
  assert.match(t.fondo, /linear-gradient\(160deg,#000000,#222222\)/);
});

test('l\'indirizzo nel CSS resta un indirizzo', () => {
  const s = stratoSfondo(tema({ sfondoUrl: 'https://cdn.esempio.it/a.jpg?w=1&h=2', sfondoRapporto: 1 }), { bg: '#000000' });
  assert.ok(s.css.includes('url("https://cdn.esempio.it/a.jpg?w=1&h=2")'), 'dentro <style> le entita\' non si leggono: niente &amp;');
  const brutto = stratoSfondo(tema({ sfondoUrl: 'https://cdn.esempio.it/a(1).jpg', sfondoRapporto: 1 }), { bg: '#000000' });
  assert.ok(brutto.css.includes('a%281%29.jpg'), 'le parentesi non chiudono niente');
});

test('la pagina e il foglio sopra la copertina mostrano lo stesso sfondo', () => {
  const pagina = (blocchi) => renderLinkPage({ headline: 'x', template: 'minimal', blocchi,
    tema: tema({ sfondoScala: 80, sfondoRapporto: 1.5, sfondoBordi: BORDI }) }, { login: 'prova', baseUrl: 'https://socialbot.live' });
  const h = pagina([]);
  assert.match(h, /<body>\s*<div class="sf" aria-hidden="true">/, 'lo strato e\' il primo pezzo della pagina');
  assert.match(h, /body\{min-height:100dvh;background:#[0-9a-f]{3,8};/, 'e il corpo non porta piu\' l\'immagine');
  const f = pagina([{ tipo: 'eroe', titolo: 'Ciao', fissa: true }, { tipo: 'testo', testo: 'sotto' }]);
  assert.ok(f.includes('<div class="dopo"><div class="dopo-sf" aria-hidden="true"><div class="sf"'), 'il foglio ha la sua copia, ritagliata su di se\'');
  assert.ok(f.includes('.dopo-sf{position:absolute;inset:0;z-index:-1;border-radius:inherit;clip-path:inset(0 round 1.6rem 1.6rem 0 0)}'));
  const vecchia = renderLinkPage({ headline: 'x', template: 'minimal', blocchi: [], tema: tema({ sfondoX: 20, sfondoY: 80 }) }, { login: 'prova', baseUrl: 'https://socialbot.live' });
  assert.ok(vecchia.includes('url("https://cdn.esempio.it/a.jpg") 20% 80%/cover no-repeat fixed'), 'un\'immagine di prima copre, col punto scelto fermo');
});
