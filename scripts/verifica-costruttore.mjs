#!/usr/bin/env node
// I TASTI DEL COSTRUTTORE, PREMUTI DAVVERO.
//
// `verifica-bottoni.mjs` cerca il nome di ogni tasto nel sorgente e chiede «c'e'
// qualcuno che lo va a prendere?». E' un buon cancello, ma ha un punto cieco che
// qui e' successo per davvero: un tasto che vive dentro una parte di pagina
// RIDISEGNATA dopo, agganciato all'avvio con `_g('...')`. Nel sorgente la riga
// c'e', quindi quel cancello e' verde — solo che al momento dell'aggancio quel
// tasto non esisteva ancora, e premerlo non faceva niente.
//
// L'unico modo di accorgersene e' premerlo. Qui la scheda si apre in un browser
// vero, con i dati della demo, e ogni tasto viene premuto guardando COSA
// SUCCEDE: si apre l'editor, nasce una categoria, muore un canale, la
// differenza compare, il tasto che costruisce si spegne dopo.
//
// E si controlla anche la cosa che rompe un editor senza che nessuno lo noti:
// che quello che scrivi resti scritto quando tocchi altro. Un editor che si
// ridisegna troppo cancella le parole sotto le dita.
import { apriSito, apriBrowser } from './_sito.mjs';

const esiti = [];
const chiedi = (ok, t) => { esiti.push({ ok: !!ok, t }); console.log((ok ? '  ✓ ' : '  ✗ ') + t); };

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const pg = await br.newPage({ viewport: { width: 1280, height: 1200 } });
const guai = [];
pg.on('pageerror', (e) => guai.push('pageerror: ' + e.message));
pg.on('console', (m) => { if (m.type() === 'error') guai.push('console: ' + m.text()); });
pg.on('dialog', (d) => d.accept());

const quanti = (sel) => pg.$$(sel).then((n) => n.length);

try {
  await pg.goto(sito.base + '/?demo=1#dcserver', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(800);
  chiedi(await quanti('.dcs-traccia') >= 3, 'si parte da una scelta, non dal foglio bianco');

  await pg.click('#dcs-dalserver');
  await pg.waitForTimeout(500);
  chiedi(await pg.$eval('#dcs-carta-editor', (n) => !n.hidden), '«Leggi il mio server» apre l\'editor');
  chiedi(await quanti('.dcs-cat') === 2, 'e ci mette dentro le categorie lette');
  chiedi(await quanti('.dcs-cima .dcs-ch') === 1, 'compreso il canale che sta in cima, fuori da tutte');

  await pg.click('#dcs-ricomincia');
  await pg.waitForTimeout(300);
  chiedi(await quanti('.dcs-traccia') >= 3, 'e si puo\' tornare alla scelta');
  await pg.click('[data-dcs="traccia"]');
  await pg.waitForTimeout(300);
  const prima = await quanti('.dcs-cat');
  chiedi(prima > 0, 'una traccia scelta riempie l\'editor');

  await pg.click('#dcs-catpiu');
  await pg.waitForTimeout(200);
  chiedi(await quanti('.dcs-cat') === prima + 1, 'si aggiunge una categoria');
  await pg.click('.dcs-cat:last-child [data-dcs="ch-piu"]');
  await pg.waitForTimeout(200);
  chiedi(await quanti('.dcs-cat:last-child .dcs-ch') === 1, 'e un canale dentro');
  await pg.click('.dcs-cat:last-child > .dcs-permessi [data-dcs="p-piu"]');
  await pg.waitForTimeout(200);
  chiedi(await quanti('.dcs-cat:last-child > .dcs-permessi .dcs-perm') === 1, 'e una riga di «chi puo\' fare cosa»');

  await pg.fill('.dcs-cat:last-child [data-dcs="cat-nome"]', 'Prova Mia');
  await pg.click('.dcs-cat:last-child .dcs-ch > summary');
  await pg.waitForTimeout(200);
  chiedi(await pg.$eval('.dcs-cat:last-child [data-dcs="cat-nome"]', (n) => n.value) === 'Prova Mia',
    'quello che scrivi resta scritto quando tocchi altro');

  await pg.click('.dcs-cat:last-child > .riga-flessibile [data-dcs="cat-via"]');
  await pg.waitForTimeout(200);
  chiedi(await quanti('.dcs-cat') === prima, 'e si toglie');

  await pg.click('#dcs-vedi');
  await pg.waitForTimeout(500);
  chiedi(await pg.$eval('#dcs-costruisci', (n) => !n.hidden), '«Fammi vedere» accende il tasto che costruisce');
  const diff = await pg.$eval('#dcs-diff', (n) => n.innerText);
  chiedi(/Crea/.test(diff), 'e fa vedere cosa creerebbe');
  chiedi(/Resta dov/.test(diff), 'e dice chiaro che quello fuori dalla traccia resta dov\'e\'');

  await pg.click('#dcs-costruisci');
  await pg.waitForTimeout(500);
  chiedi((await pg.$eval('#dcs-esito', (n) => n.innerText)).length > 0, 'e dopo dice com\'e\' andata');
  chiedi(await pg.$eval('#dcs-costruisci', (n) => n.hidden), 'poi si spegne, cosi\' non si preme due volte');

  await pg.click('#dcs-salva');
  await pg.waitForTimeout(300);
  chiedi(guai.length === 0, 'e in tutto questo il browser non si e\' lamentato' + (guai.length ? ': ' + guai.join(' · ') : ''));
} catch (e) {
  // Un tasto che non fa niente non da' un «falso»: da' un'attesa che non
  // finisce. Meglio dirlo come una cosa che non torna, che come una pila di
  // chiamate — chi legge il cancello deve capire COSA si e' rotto.
  chiedi(false, 'il giro si e\' interrotto: ' + String(e?.message || e).split('\n')[0]);
} finally {
  await br.close();
  sito.chiudi();
}

const rotti = esiti.filter((e) => !e.ok).length;
console.log(rotti ? `\n${rotti} cose non tornano.` : '\nOgni tasto del costruttore fa quello che promette. ✓');
process.exit(rotti ? 1 : 0);
