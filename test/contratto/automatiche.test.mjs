// LE PUBBLICAZIONI AUTOMATICHE fra pannello e server (docs/AUTOMATICHE.md): le
// stesse scelte da tutte e due le parti, le immagini preparate dal motore
// dell'anteprima per il giorno giusto, e una conferma che vale solo se si preme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creaGuscio } from '../../src/web/vetrina.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const AUTO = leggi('src/features/automatiche.js');
const rotta = (inizio, n = 1500) => SRV.slice(SRV.indexOf(inizio), SRV.indexOf(inizio) + n);

test('pannello e server offrono gli stessi anticipi', () => {
  const lista = (testo, nome) => JSON.parse(new RegExp(`${nome} = (\\[[^\\]]+\\])`).exec(testo)[1]);
  assert.deepEqual(lista(APP, 'const AUTO_ANTICIPI'), lista(AUTO, 'export const ANTICIPI'));
});

test('le rotte sono dello streamer, e le immagini si riconoscono', () => {
  for (const r of ["app.get('/api/streamer/automatiche'", "app.post('/api/streamer/automatiche'", "app.post('/api/streamer/automatiche/immagine'", "app.post('/api/streamer/automatiche/conferma'"]) {
    assert.match(rotta(r, 200), /requireOwner/, `${r} senza guardiano`);
  }
  const img = rotta("app.post('/api/streamer/automatiche/immagine'");
  assert.ok(img.includes('automatiche.IMMAGINI.includes(nome)'), 'solo i nomi che il server conosce');
  assert.ok(img.includes('const byte = leggiJpeg(req.body?.immagine);'), 'un JPEG vero, come per «Manda»');
  assert.ok(img.includes('/^[0-9a-f]{16}$/.test(impronta)'), 'con la settimana da cui e\' nata');
  const nomi = JSON.parse(/export const IMMAGINI = (\[[^\]]+\])/.exec(AUTO)[1].replace(/'/g, '"'));
  const prep = APP.slice(APP.indexOf('async function autoPrepara('), APP.indexOf('function initGrafiche()'));
  assert.ok(prep.includes('await manda(`prima-${sl.giorno}`'), 'una storia per giorno in onda');
  for (const n of ['settimana-post', 'settimana-storia']) assert.ok(prep.includes(`manda('${n}'`) && nomi.includes(n), n);
  for (let g = 0; g < 7; g++) assert.ok(nomi.includes(`prima-${g}`));
});

test('la storia di ogni giorno si disegna per quel giorno, col testo di quando esce', () => {
  const prep = APP.slice(APP.indexOf('async function autoPrepara('), APP.indexOf('function initGrafiche()'));
  assert.ok(prep.includes("{ ...c, tipo: 'prossima', formato: 'storia', quandoTesto: '', _prossima: sl, _rif: sl.esce, _copertina: cop }"),
    'la sua diretta, la sua copertina, e il testo riferito al momento in cui esce; il «Quando» scritto a mano vale per un giorno solo');
  assert.ok(APP.includes('return p ? _quandoProssima(p, c._rif).giorno'), 'il testo del giorno sa rispetto a quando');
  assert.ok(APP.includes('const ora = Number(adesso) || _oraServer();'));
  assert.ok(prep.includes('rev: v.rev') && prep.includes('impronta: v.impronta'), 'ogni immagine porta da dove e\' nata');
});

test('si ripreparano quando cambia quello che disegnano', () => {
  const salvaGr = APP.slice(APP.indexOf("document.getElementById('gr-salva')?.addEventListener"), APP.indexOf("document.querySelectorAll('[data-gr-dest]')"));
  assert.ok(salvaGr.includes('await autoPrepara();'), 'salvando le Grafiche');
  const salvaSett = APP.slice(APP.indexOf("_g('sett-salva')?.addEventListener"), APP.indexOf("_g('sett-manda')?.addEventListener"));
  assert.ok(salvaSett.includes('await autoPrepara().catch(() => {});'), 'salvando la Settimana');
  assert.match(SRV, /rev: \(Number\(s\.settings\?\.grafiche\?\.rev\) \|\| 0\) \+ 1,/, 'e ogni salvataggio delle Grafiche alza la versione');
});

test('la conferma dal link vale solo premendo, e il link non si inventa', () => {
  const get = rotta("app.get('/settimana/conferma'", 400);
  assert.ok(!get.includes('confermaConChiave'), 'aprire il link non conferma: i programmi della posta lo aprono da soli');
  const post = rotta("app.post('/settimana/conferma'", 900);
  assert.ok(post.includes('automatiche.confermaConChiave(u, t).ok'));
  assert.ok(post.includes("extRateOk('settimana-conferma:' + u)"), 'con un tetto ai tentativi');
  assert.match(AUTO, /crypto\.timingSafeEqual/, 'la chiave si confronta a tempo costante');
  assert.match(AUTO, /s\.settimana\.chiave = impronta\(chiave\)/, 'e si tiene solo la sua impronta');
  const PUB = join(fileURLToPath(new URL('../../', import.meta.url)), 'src/web/public');
  assert.ok(creaGuscio(PUB).aperto('/settimana/conferma'), 'chi arriva dalla mail una sessione non ce l\'ha: il cancello lo lascia passare');
});

test('il giro gira ogni minuto, e pubblica dalle stesse strade di sempre', () => {
  const giro = SRV.slice(SRV.indexOf('const giroAutomatiche = async () => {'), SRV.indexOf('const giroAutomatiche = async () => {') + 1600);
  assert.ok(giro.includes('pubblicaStoria: (byte) => storiaIg.pubblicaStoria(login, byte)'), 'la storia come «Metti nella storia»');
  assert.ok(giro.includes('await mandaLaSettimana(login, { byte, storia, testo, dove: sett.dove })'), 'la settimana come «Manda»');
  assert.ok(giro.includes('inDiretta: !!manager?.inDiretta?.(login)'), 'e sa se sei gia\' in diretta');
  assert.match(SRV, /setInterval\(\(\) => \{ giroAutomatiche\(\)\.catch\(\(\) => \{\}\); \}, 60_000\)/);
});
