// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
  assert.ok(prep.includes('rev: v.rev') && prep.includes('impronta: v.impronta') && prep.includes("firmaQr: v.firmaQr || ''"), 'ogni immagine porta da dove e\' nata, firma del QR compresa');
  assert.ok(prep.includes('const stile = _autoStile(v);') && prep.includes('await grafEsporta(cc, { stile })'), 'e il suo QR si disegna con lo stile che il server ha dato, non con quello in memoria');
});

// Quello che le immagini disegnano sono tre cose: le Grafiche, la Settimana e
// lo stile del QR. Salvarne una le riprepara tutte quelle accese (la storia
// «Live ora» compresa), e il pannello del proprietario le riprepara anche da
// solo quando si apre, se il server le dice non pronte o da rifare.
test('si ripreparano quando cambia quello che disegnano', () => {
  const salvaGr = APP.slice(APP.indexOf("document.getElementById('gr-salva')?.addEventListener"), APP.indexOf("document.querySelectorAll('[data-gr-dest]')"));
  assert.ok(salvaGr.includes('await ripreparaGrafiche();'), 'salvando le Grafiche');
  const salvaSett = APP.slice(APP.indexOf("_g('sett-salva')?.addEventListener"), APP.indexOf("_g('sett-manda')?.addEventListener"));
  assert.ok(salvaSett.includes('await autoPrepara().catch(() => {});'), 'salvando la Settimana');
  const qrSalva = APP.slice(APP.indexOf("if (b.id === 'qr-salva'"), APP.indexOf("document.getElementById('qr-file').addEventListener"));
  assert.ok(qrSalva.includes('await qrSalvaERiprepara();'), 'salvando lo stile del QR');
  const salvaQr = APP.slice(APP.indexOf('async function qrSalvaERiprepara('), APP.indexOf('function autoAllAvvio('));
  assert.ok(salvaQr.indexOf('salvaImpostazioni({ qr: qrStileDalModulo() }') >= 0 && salvaQr.indexOf('salvaImpostazioni({ qr: qrStileDalModulo() }') < salvaQr.indexOf('await ripreparaGrafiche()'), 'prima si salva, poi si riprepara');
  const rip = APP.slice(APP.indexOf('async function ripreparaGrafiche('), APP.indexOf('async function qrSalvaERiprepara('));
  assert.ok(rip.includes('await livePrepara(v);') && rip.includes('await autoPrepara(v);'), 'la storia della diretta e le automatiche');
  const avvio = APP.slice(APP.indexOf('function autoAllAvvio('), APP.indexOf('\n}\n', APP.indexOf('function autoAllAvvio(')));
  assert.ok(avvio.includes('DEMO') && avvio.includes("stato?.ruolo === 'moderatore'") && avvio.includes('autoRiprendi(v)') && avvio.includes('requestIdleCallback'), 'all\'avvio, solo per il proprietario, in un momento di quiete');
  const avvioPannello = APP.slice(APP.indexOf('async function caricaStato('), APP.indexOf('\n}\n', APP.indexOf('async function caricaStato(')));
  assert.ok(avvioPannello.includes('\n  autoAllAvvio();\n'), 'e lo chiama l\'avvio del pannello');
  assert.match(SRV, /rev: \(Number\(s\.settings\?\.grafiche\?\.rev\) \|\| 0\) \+ 1,/, 'e ogni salvataggio delle Grafiche alza la versione');
});

test('la conferma dal link vale solo premendo, e il link non si inventa', () => {
  const get = rotta("app.get('/settimana/conferma'", 400);
  assert.ok(!/confermaConChiave|fermaConChiave|decidiConChiave/.test(get), 'aprire il link non decide niente: i programmi della posta lo aprono da soli');
  const post = rotta("app.post('/settimana/conferma'", 900);
  assert.ok(post.includes('automatiche.decidiConChiave(u, t, come).ok'));
  assert.ok(post.includes("const come = req.body?.fai === 'ferma' ? 'ferma' : 'conferma';"), 'le risposte sono due, e una sola alla volta');
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

// «Non pubblicare»: chi ha confermato e poi vede un errore, o legge tardi, la
// ferma dalla mail o da Telegram senza aprire il pannello. Stessa pagina, stessa
// chiave, un tasto da premere; e il pannello ha lo stesso tasto.
test('la settimana si ferma dalla mail, da Telegram e dal pannello', () => {
  const chiedi = rotta('const chiediLaSettimana = async', 1400);
  assert.ok(chiedi.includes('ferma: `${link}&fai=ferma`'), 'la mail ha il suo «Non pubblicare»');
  assert.ok(chiedi.includes('<a href="${link}&fai=ferma">Non pubblicare</a>'), 'e Telegram anche');
  assert.match(AUTO, /Non deve uscire\? <a href="\$\{escH\(ferma\)\}">Non pubblicare<\/a>/);
  const pagina = rotta('const paginaConferma = ', 2600);
  assert.ok(pagina.includes("tastoDecidi(u, chiave, 'ferma', 'Non pubblicare')"), 'la pagina del link la ferma premendo');
  assert.ok(pagina.includes("tastoDecidi(u, chiave, 'conferma', 'Pubblicala lo stesso')"), 'e ferma, la si puo\' ancora confermare');
  assert.ok(SRV.includes("app.post('/api/streamer/automatiche/ferma', requireOwner"), 'il pannello ha la sua porta, solo per lo streamer');
  assert.match(APP, /'\/api\/streamer\/automatiche\/ferma'/, 'e il pannello la usa');
});
