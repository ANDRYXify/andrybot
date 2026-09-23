// DA OGNI SCHEDA SI ARRIVA ALLE SORELLE, SENZA TORNARE AL MENU.
//
// Il difetto da cui nasce, misurato: la barra che fa saltare da una scheda a
// quella accanto c'era in sei gruppi su nove. Dentro «Scena», «Vetrina» e
// «Community» per passare da «Effetti» a «Emote» si doveva risalire al menu;
// dentro «Discord» no. La stessa azione, due modi diversi a seconda di dove
// eri — e nessuno se n'era accorto perche' una barra che manca non fa rumore,
// fa solo un clic in piu' ogni volta.
//
// LA REGOLA, una sola: una scheda ha sempre delle sorelle. Quelle della sua
// famiglia se ne ha una (Discord: ruoli, avvisi, server, chi entra, filtro),
// se no le altre del suo gruppo nel menu. Cosi' «la barra c'e'» non e' una cosa
// da ricordarsi gruppo per gruppo: e' una conseguenza di `sorelleDi`.
//
// LA MISURA. Non si legge il codice: si APRE il pannello, si va su ogni scheda
// e si guarda se la barra c'e' e porta da qualche parte. Una regola scritta
// bene e una barra che non compare sono due cose diverse, e conta la seconda.
//
// Le uniche fuori dal conto sono quelle che il pannello non mostra a nessuno:
// le schede da admin, e lo Studio Web, nascosto apposta (vedi 5437e2f).
//
// E una sta da sola per costruzione: Stato, la prima scheda. E' l'inizio, da
// li' il menu porta dappertutto, e una barra di «sorelle» la rimetterebbe
// dentro un gruppo che non e' il suo: stava sotto «Account», ed era proprio
// quello che la rendeva confusa (docs/STATO.md). Qui si pretende che NON abbia
// la barra, e che le schede da sole non diventino un'abitudine.
//
// Uso: node scripts/verifica-sorelle.mjs   (--selftest pretende il rosso)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const SELFTEST = process.argv.includes('--selftest');
const esiti = [];
const chiedi = (ok, t) => { esiti.push({ ok: !!ok, t }); console.log((ok ? '  ✓ ' : '  ✗ ') + t); };

const FUORI = new Set(['admin', 'avatar', 'studio']);
const DA_SOLE = new Set(['stato']);

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const pg = await br.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
const guai = [];
pg.on('pageerror', (e) => guai.push('pageerror: ' + e.message));

try {
  await pg.goto(sito.base + '/?demo=1', { waitUntil: 'networkidle' });
  await pg.click('#cookie-ok').catch(() => {});
  await pg.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
  await pg.waitForTimeout(600);

  // L'elenco delle schede lo dice il pannello, non questo file: si legge da
  // quelle che DISEGNA davvero, cosi' una scheda nuova entra nel conto da sola
  // senza che nessuno se lo ricordi.
  const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const schede = [...new Set([...APP.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]))]
    .filter((s) => !FUORI.has(s));
  chiedi(schede.length >= 25, `schede da controllare: ${schede.length}`);

  const senza = [];
  const sola = [];
  const conBarra = [];
  for (const s of schede) {
    if (SELFTEST && s === 'emote') continue;   // il selftest finge di averne saltata una
    await pg.evaluate((x) => window.vaiAScheda(x), s);
    await pg.waitForTimeout(140);
    // La barra delle sorelle sta nella testata; quella con un id e' un'altra
    // cosa — le sotto-schede DENTRO una scheda — e qui non c'entra.
    const voci = await pg.$$eval('.pagina-testata > .fam-barra:not([id]) .fam-scheda',
      (n) => n.map((x) => x.dataset.scheda)).catch(() => []);
    if (DA_SOLE.has(s)) { if (voci.length) conBarra.push(s); continue; }
    if (!voci.length) senza.push(s);
    else if (voci.length < 2) sola.push(s);
    else if (!voci.includes(s)) senza.push(s + ' (la barra non nomina se stessa)');
  }
  const finte = SELFTEST ? ['emote'] : [];
  chiedi(!senza.length && !finte.length, senza.length || finte.length
    ? `queste schede non hanno una barra: ${[...senza, ...finte].join(', ')}`
    : 'ogni scheda porta alle sue sorelle, senza passare dal menu');
  chiedi(!sola.length, sola.length ? `barra con una voce sola: ${sola.join(', ')}` : 'e nessuna barra ha una voce sola, che non porterebbe da nessuna parte');
  chiedi(!conBarra.length && DA_SOLE.size <= 1, conBarra.length
    ? `stanno da sole e hanno una barra: ${conBarra.join(', ')}`
    : `da sola per costruzione, e senza barra: ${[...DA_SOLE].join(', ')}`);

  // E la barra funziona: cliccando una sorella ci si arriva davvero.
  await pg.evaluate(() => window.vaiAScheda('effetti'));
  await pg.waitForTimeout(200);
  await pg.click('.pagina-testata > .fam-barra:not([id]) .fam-scheda[data-scheda="emote"]');
  await pg.waitForTimeout(300);
  const dove = await pg.evaluate(() => document.querySelector('.pannello-scheda.visibile')?.id || '');
  chiedi(dove === 'scheda-emote', `e cliccando una sorella ci si arriva: ${dove}`);

  chiedi(!guai.length, guai.length ? guai.slice(0, 2).join(' · ') : 'e il browser non si e\' lamentato');
} finally {
  await br.close();
  sito.chiudi();
}

const rossi = esiti.filter((x) => !x.ok).length;
console.log('\n' + (rossi ? 'cancello ROSSO ✗' : 'Da ogni scheda si arriva alle sorelle. ✓'));
process.exit(rossi ? 1 : 0);
