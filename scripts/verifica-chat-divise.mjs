// Cancello delle CHAT DIVISE O UNITE in overlay.
//
// La promessa: un overlay mostra le chat che gli si dice. Unite in un riquadro
// solo, oppure divise mettendo l'altra sorgente su un secondo overlay. E chi
// trasmette su due piattaforme ma a schermo ne vuole una sola, deve poterlo
// fare senza spegnere la chat.
//
// Il difetto che questo cancello impedisce non e' «non funziona»: e' piu'
// subdolo. Se l'origine non viaggia col messaggio, due chat diverse diventano
// la stessa cosa appena entrano nel riquadro, e nessuna scelta a valle puo'
// piu' dividerle. Percio' qui si guarda il RISULTATO in una pagina overlay
// vera: quante righe compaiono, quali, e col segno giusto.
//
//   node scripts/verifica-chat-divise.mjs                  → esce 1 se qualcosa non torna
//   node scripts/verifica-chat-divise.mjs --selftest       → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const ROTTURE = [
  ['src/web/public/overlay-app.js', "  if (!mostra('chat:' + da)) return;\n",  '',
    'spegnere una chat non la spegne: le righe arrivano lo stesso'],
  ['src/web/public/overlay-app.js', "  const da = String(ev.piattaforma || 'twitch').toLowerCase();", "  const da = 'twitch';",
    "l'origine si perde per strada: una riga di Kick passa per Twitch"],
  ['src/web/public/overlay-app.js', '  if (st.segnaDaDove) segnaOrigine(riga, da);\n', '',
    'il segno dell\'origine non compare nemmeno quando lo si chiede'],
  ['src/web/public/overlay-app.js', "  kick: [['path', { d: 'M4 14a1", "  kick: [['rect', { width: '20', height: '15', x: '2', y: '7', rx: '2' }], ['polyline', { points: '17 2 12 7 7 2' }]], _kick: [['path', { d: 'M4 14a1",
    'due chat diverse portano il medesimo segno'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }

let TEMA = {};
const ovl = overlayFinto({ tema: () => TEMA });
const { base, chiudi } = await apriSito({ overlay: ovl });
const errori = [];

// Un giro: si decide cosa mostra l'overlay, si apre la pagina, si mandano i
// messaggi e si guarda cosa e' rimasto a schermo.
// La FIRMA del tema: aspettare che il server l'abbia SERVITO non basta, perche'
// fra il servito e l'applicato ci sta una risposta da leggere — e in quella
// fessura i messaggi arriverebbero mentre la pagina mostra ancora tutto. Qui si
// aspetta un segno che solo `applicaTema` puo' aver lasciato nella pagina.
const FIRMA = '.tema-applicato';

async function giro(mostra, chatStile, messaggi) {
  TEMA = { css: FIRMA, widget: {}, goals: [], conti: {}, musica: null, timer: null, stato: {}, mostra, xy: {}, alertStile: null, chatStile };
  const page = await browser.newPage();
  page.on('pageerror', (e) => errori.push(String(e.message || e)));
  await page.goto(base + '/overlay/prova?key=x');
  await page.waitForFunction((f) => document.getElementById('css-utente')?.textContent.includes(f), FIRMA, { timeout: 15000 });
  for (let i = 0; i < 100 && ovl.st.stream.length < 1; i++) await attesa(50);
  for (const m of messaggi) ovl.manda({ tipo: 'chat', max: 8, ...m });
  await attesa(400);
  const righe = await page.$$eval('#chatlive .chat-riga', (l) => l.map((r) => ({
    testo: r.textContent.trim(),
    segno: r.querySelector('.chat-da') ? r.querySelector('.chat-da').innerHTML : '',
  })));
  await page.close();
  return righe;
}

const T = { piattaforma: 'twitch', user: 'luca', testo: 'da casa' };
const K = { piattaforma: 'kick', user: 'giada', testo: 'da fuori' };
const VECCHIO = { user: 'marco', testo: 'senza origine' };

try {
  // 1. UNITE: nessuna scelta scritta = tutte, ed e' come si comportava prima.
  let r = await giro({}, {}, [T, K, VECCHIO]);
  dice(r.length === 3, 'unite: senza scelte scritte arrivano tutte e tre le righe', `ne sono arrivate ${r.length}`);
  dice(r.every((x) => !x.segno), 'e senza segno: chi non lo chiede non se lo ritrova', 'c\'e\' un segno che nessuno ha chiesto');

  // 2. UNA SOLA A SCHERMO: spegnere Kick lascia Twitch, e non spegne la chat.
  r = await giro({ 'chat:kick': false }, {}, [T, K]);
  dice(r.length === 1 && r[0].testo.includes('da casa'), 'spenta Kick, resta solo la riga di Twitch',
    r.length ? `e' rimasto: ${r.map((x) => x.testo).join(' | ')}` : 'non e\' rimasto niente: ha spento tutta la chat');

  // 3. Un messaggio SENZA origine e' di casa: i canali di prima non cambiano.
  r = await giro({ 'chat:kick': false }, {}, [VECCHIO]);
  dice(r.length === 1, 'un messaggio senza origine vale Twitch e resta a schermo', 'e\' sparito: i canali nati prima perderebbero la chat');

  // 4. L'ALTRA META': lo stesso overlay con la scelta opposta. E' cosi' che si
  //    tengono divise — due overlay, uno per sorgente.
  r = await giro({ 'chat:twitch': false }, { segnaDaDove: true }, [T, K]);
  dice(r.length === 1 && r[0].testo.includes('da fuori'), 'spenta Twitch, resta solo la riga di Kick',
    r.length ? `e' rimasto: ${r.map((x) => x.testo).join(' | ')}` : 'non e\' rimasto niente');

  // 5. IL SEGNO: quando le chat stanno insieme, ogni riga dice da dove viene, e
  //    due sorgenti diverse non possono portare lo stesso disegno.
  r = await giro({}, { segnaDaDove: true }, [T, K]);
  dice(r.length === 2 && r.every((x) => x.segno), 'unite col segno: ogni riga porta il suo', 'qualche riga e\' senza segno');
  dice(r.length === 2 && r[0].segno !== r[1].segno, 'e le due sorgenti hanno segni diversi', 'lo stesso disegno per tutte e due: non distingue niente');

  // 6. La famiglia spenta spegne tutto: la scelta delle sorgenti non la scavalca.
  r = await giro({ chat: false }, {}, [T, K]);
  dice(r.length === 0, 'chat spenta in questo overlay: non arriva niente', `sono arrivate ${r.length} righe`);

  dice(errori.length === 0, 'nessun errore nella pagina', errori.join(' · '));
} finally {
  await chiudi();
  await browser.close();
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.ok || !e.extra ? '' : `\n      → ${e.extra}`));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nLe chat si dividono e si uniscono come gli si dice. ✓');
process.exit(rossi.length ? 1 : 0);
