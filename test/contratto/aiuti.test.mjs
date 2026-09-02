// «C'è una guida per questa scheda»: chi la dichiara, e a chi serve.
//
// La striscia in fondo al pannello compare quando qualcuno resta fermo su una
// scheda — ma solo se per quella scheda esiste davvero qualcosa da leggere.
// L'associazione non è un elenco a parte: ogni guida e ogni manuale dichiara le
// schede a cui serve, accanto al proprio contenuto. Chi scrive la pagina sa a
// chi serve meglio di chiunque la legga sei mesi dopo.
//
// Qui si controlla che quelle dichiarazioni puntino a schede vere e a pagine
// vere: una scheda scritta male non spegnerebbe niente, mostrerebbe un aiuto che
// non si apre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GUIDE, DENTRO, ancora, paginaGuida } from '../../src/web/guide.js';
import { MANUALI, aiutiPerScheda } from '../../src/web/manuali.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const AIUTI = aiutiPerScheda();

// Le schede vere del pannello sono quelle che il pannello DISEGNA — non quelle
// elencate nella barra in alto: sotto-schede come «Conoscenza» o «Scudo» si
// aprono da una scheda madre e nella barra non compaiono. Leggendo la barra si
// otteneva un elenco piu' corto del vero, e un aiuto legittimo sembrava rotto.
const SCHEDE = [...new Set([...APP.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]))]
  .filter((id) => id !== 'admin');

test('qualche scheda ha la sua pagina', () => {
  assert.ok(SCHEDE.length >= 10, `schede del pannello: ${SCHEDE.length}`);
  assert.ok(Object.keys(AIUTI).length >= 4, `schede con un aiuto: ${Object.keys(AIUTI).length}`);
});

test('ogni aiuto punta a una scheda che esiste', () => {
  for (const id of Object.keys(AIUTI)) {
    assert.ok(SCHEDE.includes(id), `la scheda «${id}» esiste`);
  }
});

test('e a una pagina che esiste', () => {
  const slugGuide = GUIDE.map((g) => `/guide/${g.slug}`);
  const slugManuali = MANUALI.map((m) => `/manuale/${m.slug}`);
  for (const [id, a] of Object.entries(AIUTI)) {
    const pagina = a.via.split('#')[0];
    assert.ok(a.titolo && a.titolo.length > 5, `${id}: ha un titolo`);
    assert.ok(['guida', 'manuale'].includes(a.tipo), `${id}: tipo sensato`);
    assert.ok([...slugGuide, ...slugManuali].includes(pagina), `${id} → ${pagina} esiste`);
    assert.equal(a.tipo === 'manuale', slugManuali.includes(pagina), `${id}: il tipo dice la verità`);
  }
});

// Una guida spiega il mondo; il pannello la propone a chi e' gia' dentro. Se non
// dicesse cosa si fa QUI sarebbe troppo generica — quindi chi dichiara di
// servire una scheda deve avere quella sezione, e il collegamento ci porta.
test('una guida proposta dal pannello dice cosa si fa in SocialBot', () => {
  const conScheda = GUIDE.filter((g) => (g.schede || []).length);
  assert.ok(conScheda.length >= 3, `guide agganciate a una scheda: ${conScheda.length}`);
  for (const g of conScheda) {
    const sezione = (g.corpo || []).find((b) => b.h2 === DENTRO);
    assert.ok(sezione, `${g.slug}: ha la sezione «${DENTRO}»`);
    assert.ok((sezione.passi || []).length >= 3, `${g.slug}: e dice come, passo per passo`);
    const testo = JSON.stringify(sezione);
    assert.match(testo, /scheda|manuale/i, `${g.slug}: manda a un posto preciso del pannello`);
  }
});

test('e il collegamento apre proprio quella sezione', () => {
  const atteso = '#' + ancora(DENTRO);
  for (const [id, a] of Object.entries(AIUTI)) {
    if (a.tipo !== 'guida') continue;
    assert.ok(a.via.endsWith(atteso), `${id} → ${a.via} apre la sezione giusta`);
    const g = GUIDE.find((x) => a.via.startsWith(`/guide/${x.slug}`));
    const h = paginaGuida(g.slug);
    assert.ok(h.includes(`<h2 id="${ancora(DENTRO)}">`), `${g.slug}: l’ancora esiste nella pagina`);
  }
});

test('dove c’è un manuale, vince lui sulla guida', () => {
  // «Comandi» ha sia la guida sui comandi della chat sia il manuale dei moduli:
  // chi è già dentro il prodotto vuole il riferimento, non l'introduzione.
  const conGuida = GUIDE.filter((g) => (g.schede || []).includes('moduli'));
  assert.ok(conGuida.length >= 1, 'la guida che parla di comandi dichiara «moduli»');
  assert.equal(AIUTI.moduli.tipo, 'manuale');
  assert.equal(AIUTI.moduli.via, '/manuale/moduli');
});

// Il fermo è solo uno dei modi in cui si vede che uno è in difficoltà. Gli altri
// tre si riconoscono da soli, e ognuno vale da solo.
test('i segnali di difficoltà sono quattro, e sono misurabili', () => {
  assert.match(APP, /const AIUTO_FERMO_MS = 20_000;/, 'venti secondi fermi');
  assert.match(APP, /const AIUTO_RITORNI = \d;/, 'quante volte torni sulla stessa scheda');
  assert.match(APP, /const AIUTO_INVERSIONI = \d;/, 'quante volte cambi verso con la rotella');
  assert.match(APP, /tipo === 'errore'.*aiutoDopoErrore/s, 'e un messaggio d’errore');
});

test('il cambio scheda si conta da tutte e due le strade', () => {
  // vaiAScheda non passa da render(): agganciarlo a una sola delle due
  // avrebbe fatto contare i ritorni solo a metà.
  const chiamate = [...APP.matchAll(/\n  riavviaAiuto\(\);/g)].length;
  assert.ok(chiamate >= 3, `riavviaAiuto è agganciato in ${chiamate} punti`);
});

test('mentre scorri la striscia resta: è scorrendo che l’hai chiesta', () => {
  const i = APP.indexOf("document.addEventListener('wheel'");
  const corpo = APP.slice(i, i + 600);
  assert.match(corpo, /if \(_aiutoStriscia\) return;/, 'una rotellata non se la porta via');
});

test('una striscia tolta da fuori non blocca quelle dopo', () => {
  const i = APP.indexOf('function mostraAiuto()');
  const corpo = APP.slice(i, i + 300);
  assert.match(corpo, /isConnected/, 'un riferimento appeso non vale come striscia viva');
});

// Il popup impara, ma ogni regola resta un se-allora su quello che il browser ha
// visto — niente statistica, niente profilo, e niente che esca dal dispositivo.
test('impara dalle uscite a vuoto, e si fa più svelto dove serve', () => {
  assert.match(APP, /const AIUTO_FERMO_UNA_USCITA_MS = 8_000;/, 'una uscita a vuoto: arriva prima');
  assert.match(APP, /const AIUTO_FERMO_DUE_USCITE_MS = 3_000;/, 'due: quasi subito');
  assert.match(APP, /function aiutoUscendo\(/, 'e sa riconoscere «entrato e uscito senza fare nulla»');
  for (const uscita of ['pagehide', 'visibilitychange']) {
    assert.ok(APP.includes(uscita), `guarda anche ${uscita}`);
  }
});

test('e smette di insistere con chi non lo vuole', () => {
  assert.match(APP, /const AIUTO_RIFIUTI_BASTA = 2;/, 'due «non serve» e tace ovunque');
  assert.match(APP, /const AIUTO_ZITTO_MS = 30 \* 24 \* 60 \* 60_000;/, 'per trenta giorni');
  assert.match(APP, /const AIUTO_PER_SESSIONE = 2;/, 'e mai più di due volte per sessione');
  assert.match(APP, /const AIUTO_SA_FARE = 2;/, 'e non lo propone a chi lì sa già fare');
});

test('la memoria resta nel browser: niente esce di lì', () => {
  const i = APP.indexOf('function aiutoScrivi(');
  const corpo = APP.slice(i, i + 400);
  assert.match(corpo, /localStorage\.setItem/, 'si scrive solo in locale');
  assert.doesNotMatch(corpo, /fetch|api\(/, 'e non si manda da nessuna parte');
});

test('da dentro il pannello si arriva a guide e manuali', () => {
  assert.match(APP, /function menuAiutoHtml\(\)/, 'c’è un menu di aiuto');
  for (const via of ['/guide', '/manuale', '/novita']) {
    assert.ok(APP.includes(`['${via}',`), `porta a ${via}`);
  }
  const i = APP.indexOf('const aiuto = menuAiutoHtml();');
  const corpo = APP.slice(i, i + 800);
  assert.match(corpo, /areaUtente\.innerHTML[^\n]*\$\{aiuto\}/, 'nella barra in alto');
  assert.match(corpo, /areaMob\.innerHTML[^\n]*\$\{aiuto\}/, 'e nel cassetto, per il telefono');
});

test('il pannello sa chiedere l’aiuto della scheda che stai guardando', () => {
  assert.match(APP, /stato\?\.aiuti\?\.\[id\]/, 'legge la mappa che arriva dal server');
  assert.match(APP, /aiuto-banner/, 'e la mostra con la stessa forma della striscia dei cookie');
  assert.match(APP, /localStorage\.setItem\('sb-aiuto-'/, 'e si ricorda di chi ha detto no');
});

test('non compare mentre c’è ancora la striscia dei cookie', () => {
  const i = APP.indexOf('function mostraAiuto()');
  const corpo = APP.slice(i, i + 700);
  assert.match(corpo, /cookie-banner/, 'due strisce insieme si coprirebbero');
});
