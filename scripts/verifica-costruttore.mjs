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
  // La striscia dei cookie si toglie di mezzo per prima, come fa chiunque apra
  // il sito: sta incollata in fondo, e un tasto che ci finisce sotto non si
  // preme. Lasciarla li' vorrebbe dire misurare un pannello che nessuno usa
  // cosi' — e prendere per rotto un tasto che invece funziona.
  await pg.click('#cookie-ok').catch(() => {});
  await pg.waitForTimeout(200);
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

  // I RUOLI, premuti davvero.
  //
  // L'editor dei ruoli ridisegna le righe a ogni modifica, e un ascoltatore
  // attaccato a mano a una riga morirebbe con lei: il tasto ci sarebbe, nel
  // sorgente la riga ci sarebbe, e premerlo non farebbe niente. E' successo
  // gia' una volta con «Leggi il mio server», e `verifica-bottoni` non puo'
  // vederlo — per questo qui si preme.
  await pg.click('#dcs-ricomincia');
  await pg.waitForTimeout(300);
  await pg.click('[data-dcs="traccia"][data-id="dirette"]');
  await pg.waitForTimeout(400);
  const ruoli = () => quanti('.dcs-ruolo');
  chiedi(await ruoli() >= 3, 'la traccia delle dirette porta i suoi ruoli');
  // Il titolo mostra il ruolo COME SI VEDRA' SU DISCORD: il segno e poi il
  // nome. Percio' qui si cerca dentro la riga, non la riga intera — e si
  // controlla anche che il segno ci sia, che e' la cosa nuova da guardare.
  const titoli = await pg.$$eval('.dcs-ruolo summary b', (n) => n.map((x) => x.textContent));
  const streamer = titoli.find((t) => t.includes('Streamer')) || '';
  chiedi(!!streamer, 'compreso quello che serve solo a farsi vedere');
  chiedi(streamer.trim().length > 'Streamer'.length, 'e porta il suo segno accanto al nome, come lo vedrai su Discord');

  await pg.click('.dcs-ruolo:first-child summary');
  await pg.waitForTimeout(200);
  await pg.fill('.dcs-ruolo:first-child [data-dcs="r-nome"]', 'Padrone di casa');
  await pg.click('.dcs-ruolo:nth-of-type(2) summary');
  await pg.waitForTimeout(200);
  chiedi(await pg.$eval('.dcs-ruolo:first-child [data-dcs="r-nome"]', (n) => n.value) === 'Padrone di casa',
    'quello che scrivi in un ruolo resta scritto quando tocchi altro');

  const spuntati = () => pg.$$eval('.dcs-ruolo:first-child [data-dcs="r-priv"]:checked', (n) => n.length);
  const primaSpunte = await spuntati();
  await pg.click('.dcs-ruolo:first-child [data-dcs="r-priv"]');
  await pg.waitForTimeout(200);
  chiedi(await spuntati() === primaSpunte + 1, 'un privilegio si spunta e resta spuntato');

  const quantiPrima = await ruoli();
  await pg.click('#dcs-ruolopiu');
  await pg.waitForTimeout(300);
  chiedi(await ruoli() === quantiPrima + 1, 'si aggiunge un ruolo');
  await pg.click('.dcs-ruolo:last-child summary');
  await pg.waitForTimeout(200);
  await pg.click('.dcs-ruolo:last-child [data-dcs="r-via"]');
  await pg.waitForTimeout(300);
  chiedi(await ruoli() === quantiPrima, 'e si toglie');

  await pg.click('#dcs-vedi');
  await pg.waitForTimeout(700);
  const dr = await pg.$eval('#dcs-diff', (n) => n.innerText);
  chiedi(/Crea i ruoli/.test(dr), 'la differenza dice anche cosa fa ai ruoli');
  chiedi(/piu' in alto del bot|più in alto del bot/.test(dr),
    'e dice quali non tocca, invece di far finta di averli fatti');
  chiedi(/non posso darli/.test(dr),
    'e quali privilegi non puo' + '’' + ' passare, con la cura: rifare l' + '’' + 'invito');

  // LA MODALITA' DISTRUTTIVA, DA FUORI.
  //
  // Qui non si guarda se il motore cancella bene: quello lo dicono le prove.
  // Si guarda la cosa che il motore non puo' garantire da solo — che uno CAPISCA
  // in che modalita' e'. Un pannello che cancella avendo l'aria di quello che
  // costruisce e' un pannello che tradisce, anche col motore giusto.
  const tinta = () => pg.$eval('#scheda-dcserver', (n) => n.dataset.distruttivo || '');
  const tasto = () => pg.$eval('#dcs-costruisci', (n) => n.textContent.trim());
  const diffOra = () => pg.$eval('#dcs-diff', (n) => n.innerText);

  chiedi(await pg.$eval('#dcs-fascia', (n) => n.hidden) && !(await tinta()),
    'di suo la scheda non e\' in modalita\' distruttiva');

  await pg.click('#dcs-entra');
  await pg.waitForTimeout(400);
  chiedi(!(await pg.$eval('#dcs-fascia', (n) => n.hidden)), 'si entra, e lo dice una fascia');
  chiedi(await tinta() === '1', 'e la scheda si tinge: non si puo\' non accorgersene');
  chiedi(await pg.$eval('#dcs-entra', (n) => n.hidden), 'e non si entra due volte');
  chiedi(/\d+ min/.test(await pg.$eval('#dcs-resta', (n) => n.textContent)), 'con scritto quanto le resta da vivere');
  chiedi(await pg.$eval('#dcs-costruisci', (n) => n.hidden),
    'l\'anteprima di prima non vale piu\': era di un\'altra modalita\'');

  await pg.click('#dcs-vedi');
  await pg.waitForTimeout(600);
  const diffD = await diffOra();
  chiedi(/Cancella \(\d+\)/.test(diffD), 'ora la differenza dice CANCELLA, col numero');
  chiedi(/Crea/.test(diffD), 'e intanto crea lo stesso: distruttivo non vuol dire «solo cancella»');
  chiedi(await tasto() === 'Fai piazza pulita', 'e il tasto non dice piu\' «Costruisci»');

  // DUE SCHEDE CHE SCRIVONO LA STESSA TRACCIA NON SONO DUE USCITE.
  //
  // «Il server» e «Chi entra» sono due meta' della stessa cosa: passare
  // dall'una all'altra non e' uscire, e chiedere «vuoi salvare?» in mezzo
  // sarebbe chiederlo per non aver lasciato niente — con in piu' una finestra
  // che si mette davanti ai tasti. La barra pero' non deve sparire: quello che
  // hai scritto e' ancora da salvare, e deve continuare a dirtelo.
  await pg.fill('.dcs-cat:first-child > .riga-flessibile > input', 'Cambiata a mano');
  await pg.waitForTimeout(300);
  await pg.evaluate(() => window.vaiAScheda('dcentra'));
  await pg.waitForTimeout(500);
  chiedi(await quanti('.mdl-chiedi') === 0,
    'passando all\'altra meta\' non chiede di salvare: non si sta uscendo da niente');
  // Ma non chiedere non vuol dire dimenticare: uscendo DAVVERO, quello che hai
  // scritto di la' dev'essere ancora li' a farsi valere.
  await pg.evaluate(() => window.vaiAScheda('ruoli'));
  await pg.waitForTimeout(500);
  chiedi(await quanti('.mdl-chiedi') === 1, 'uscendo per davvero lo chiede, perche\' non l\'ha dimenticato');
  await pg.click('.mdl-chiedi [data-mdl="resta"]');
  await pg.waitForTimeout(400);
  chiedi(await pg.$eval('#scheda-dcentra', (n) => n.classList.contains('visibile')),
    'e «Resta qui» resta dov\'eri');
  await pg.evaluate(() => window.vaiAScheda('dcserver'));
  await pg.waitForTimeout(500);
  await pg.click('#dcs-salva');
  await pg.waitForTimeout(400);

  // LA PORTA D'INGRESSO SI COSTRUISCE DA UN'ALTRA SCHEDA, e da li' si cancella
  // come da qui: la stessa traccia, lo stesso giro. Quindi anche li' la pagina
  // deve tingersi — un tasto che cancella con l'aria di un tasto che crea e'
  // il difetto peggiore di tutta questa scheda.
  await pg.evaluate(() => window.vaiAScheda('dcentra'));
  await pg.waitForTimeout(400);
  chiedi(!(await pg.$eval('#dce-fascia', (n) => n.hidden)), 'la fascia rossa si vede anche da dove si scrive la porta');
  chiedi(await pg.$eval('#scheda-dcentra', (n) => n.dataset.distruttivo || '') === '1', 'e anche quella scheda si tinge');
  chiedi(/\d+ min/.test(await pg.$eval('#dce-resta', (n) => n.textContent)), 'col tempo che resta, lo stesso di la\'');
  await pg.click('#dce-vedi');
  await pg.waitForTimeout(600);
  chiedi(await pg.$eval('#dce-costruisci', (n) => n.textContent.trim()) === 'Fai piazza pulita',
    'e il tasto dice quello che fa anche qui');
  await pg.evaluate(() => window.vaiAScheda('dcserver'));
  await pg.waitForTimeout(400);

  await pg.click('#dcs-esci');
  await pg.waitForTimeout(400);
  chiedi(await pg.$eval('#dcs-fascia', (n) => n.hidden) && !(await tinta()), 'si esce, e la tinta va via');
  chiedi(await pg.$eval('#dce-fascia', (n) => n.hidden), 'e va via da tutte e due, non da una sola');
  chiedi(await pg.$eval('#dcs-costruisci', (n) => n.hidden),
    'e anche l\'anteprima che cancellava se ne va: fuori dalla modalita\' non resta un tasto che cancella');

  await pg.click('#dcs-vedi');
  await pg.waitForTimeout(600);
  const diffN = await diffOra();
  chiedi(!/Cancella \(/.test(diffN) && /Resta dov/.test(diffN), 'e da fuori si torna a non cancellare niente');
  chiedi(await tasto() === 'Costruisci', 'col tasto che torna a dire quello che fa');
  await pg.click('#dcs-salva');
  await pg.waitForTimeout(300);
  chiedi(guai.length === 0, 'e in tutto questo il browser non si e\' lamentato' + (guai.length ? ': ' + guai.join(' · ') : ''));
} catch (e) {
  // Un tasto che non fa niente non da' un «falso»: da' un'attesa che non
  // finisce. Meglio dirlo come una cosa che non torna, che come una pila di
  // chiamate — chi legge il cancello deve capire COSA si e' rotto.
  await pg.screenshot({ path: '/tmp/gate-fallito.png' }).catch(() => {});
  chiedi(false, 'il giro si e\' interrotto: ' + String(e?.message || e).split('\n')[0]);
} finally {
  await br.close();
  sito.chiudi();
}

const rotti = esiti.filter((e) => !e.ok).length;
console.log(rotti ? `\n${rotti} cose non tornano.` : '\nOgni tasto del costruttore fa quello che promette. ✓');
process.exit(rotti ? 1 : 0);
