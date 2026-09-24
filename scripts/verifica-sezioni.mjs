// LE SEZIONI DEL PANNELLO: quando una cosa merita una stanza sua.
//
// Il difetto da cui nasce: Telegram era una SOTTO-VOCE di «Notifiche social»,
// accanto a TikTok e Instagram, come se fossero cose della stessa taglia. Non
// lo erano: Telegram aveva 29 porte sul server e quattordici cose da gestire
// (gruppo, destinazioni, topic, membri, amici, community, compleanni, rapporto,
// privato, token...), TikTok ne aveva una. Nessuno se n'era accorto perche' una
// sotto-voce che cresce non fa rumore: diventa solo una pagina piu' lunga.
//
// Quindi la regola, e una misura che la tiene onesta nel tempo.
//
// LA REGOLA. Una cosa e' una SEZIONE a se' quando ha tutte e tre queste:
//   1. un'identita' che si collega e si scollega (un bot, un account, un server);
//   2. della gente dentro, su cui fa qualcosa in base a chi e';
//   3. roba sua da tenere in ordine, che non vive altrove.
// Chi ne ha una sola (un indirizzo dove mandare «sono live») e' un AVVISO, e sta
// con gli altri avvisi.
//
// LA MISURA. La regola in parole serve a decidere; questo serve a non
// dimenticarsene. Le PORTE del server sono il conto di quante cose un'area
// gestisce davvero, e si contano da sole. Una sotto-voce che supera il tetto e'
// una sezione mascherata: il cancello lo dice prima che diventi un mappazzone.
//
// E la seconda meta': una sezione nuova non puo' nascere registrata a meta'.
// Nome, icona, descrizione e aiuto sono quattro elenchi diversi in due file, e
// dimenticarne uno non da' nessun errore — da' un pannello con un buco.
//
// Uso: node scripts/verifica-sezioni.mjs   (--selftest rompe e pretende il rosso)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { aiutiPerScheda } from '../src/web/manuali.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

// Oltre questo numero di porte, una sotto-voce non e' piu' una sotto-voce.
// Dieci e' largo: la mediana delle aree sta fra due e quattro.
const TETTO_SOTTOVOCE = 10;

const ROTTURE = [
  ['src/web/public/app.js', "    ['tiktok', 'TikTok'], ['youtube', 'YouTube'],", "    ['telegram', 'Telegram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'],", 'una sezione grossa rimessa fra le sotto-voci'],
  ['src/web/public/cerca.js', "    telegram: 'telegram bot gruppo", "    telegramXX: 'telegram bot gruppo", 'una sezione che dalla ricerca non si trova'],
  ['src/web/public/app.js', '  telegram:    _ico(', '  telegramXX: _ico(', 'una sezione senza icona nel menu'],
];

if (process.argv.includes('--selftest')) {
  const { execFileSync } = await import('node:child_process');
  const { writeFileSync } = await import('node:fs');
  let visti = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const prima = readFileSync(via, 'utf8');
    if (!prima.includes(da)) { console.log(`  ! non trovo da rompere: ${che}`); continue; }
    writeFileSync(via, prima.replace(da, a));
    let ok = true;
    try { execFileSync(process.execPath, [join(RAD, 'scripts/verifica-sezioni.mjs')], { stdio: 'pipe' }); }
    catch { ok = false; }
    writeFileSync(via, prima);
    // il cancello che esce rosso E' il risultato voluto: vuol dire che ha visto
    console.log(`  ${ok ? '✗ NON visto' : '✓ visto'}: ${che}`);
    if (!ok) visti++;
  }
  if (visti < ROTTURE.length) { console.log(`\nAutoprova: ${ROTTURE.length - visti} rotture passano inosservate.\n`); process.exit(1); }
  console.log('\nAutoprova: ogni rottura si vede. ✓\n');
  process.exit(0);
}

const app = leggi('src/web/public/app.js');
const server = leggi('src/web/server.js');
const cerca = leggi('src/web/public/cerca.js');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// ---- quello che il menu offre ---------------------------------------------
const bloccoGruppi = /const GRUPPI = \[([\s\S]*?)\n\];/.exec(app);
if (!bloccoGruppi) { console.log('  ✗ non trovo GRUPPI'); process.exit(1); }
const gruppi = [...bloccoGruppi[1].matchAll(/\{ id: '([a-z]+)', nome: '[^']*', schede: \[([\s\S]*?)\] \},/g)]
  .map((m) => ({ id: m[1], schede: [...m[2].matchAll(/\['([a-z0-9]+)'/g)].map((x) => x[1]) }));
const schede = gruppi.flatMap((g) => g.schede);
dice(gruppi.length >= 5 && schede.length >= 15, `gruppi ${gruppi.length} · sezioni ${schede.length}`);

// ---- 1. nessuna sezione nasce registrata a meta' ---------------------------
const chiaviDi = (testo, nome) => {
  const m = new RegExp(`const ${nome} = \\{([\\s\\S]*?)\\n\\};`).exec(testo);
  return m ? new Set([...m[1].matchAll(/^\s{2}([a-z0-9]+):/gm)].map((x) => x[1])) : new Set();
};
// Il nome non si controlla: ce l'ha per forza, sta scritto in GRUPPI accanto
// all'id. T_SCHEDA porta solo le traduzioni, e una traduzione che manca fa
// vedere l'italiano — brutto, non rotto.
const icone = chiaviDi(app, 'ICONA');
const desc = chiaviDi(app, 'DESC');
// L'aiuto di una sezione e' quello che il «?» apre: lo dice manuali.js, che
// raccoglie le schede dichiarate da ogni guida e da ogni manuale.
const aiuti = new Set(Object.keys(aiutiPerScheda()));
const trova = new Set([...(/const PAROLE = \{([\s\S]*?)\n  \};/.exec(cerca)?.[1] || cerca).matchAll(/^\s{4}([a-z0-9]+):/gm)].map((m) => m[1]));

for (const [cosa, insieme] of [['un\'icona', icone], ['una descrizione', desc], ['un aiuto', aiuti], ['le parole per trovarla', trova]]) {
  const senza = schede.filter((s) => !insieme.has(s));
  dice(senza.length === 0, `ogni sezione del menu ha ${cosa}`, senza.join(' '));
}

// ---- 2. quanto pesa davvero ogni area --------------------------------------
// Le PORTE del server, contate per area. Non e' una stima: e' quante cose di
// quell'area si possono davvero chiedere al server.
const porte = [...server.matchAll(/app\.(?:get|post|put|patch|delete)\('(\/api\/[^']+)'/g)].map((m) => m[1]);
const quante = (nome) => porte.filter((u) => new RegExp(`(^|/)${nome}(/|$|\\.)`).test(u)).length;

const bloccoSotto = /const SOTTO_SCHEDE = \{([\s\S]*?)\n\};/.exec(app);
const sottoVoci = bloccoSotto ? [...bloccoSotto[1].matchAll(/\['([a-z0-9]+)',/g)].map((m) => m[1]) : [];
dice(sottoVoci.length > 0, `sotto-voci in giro: ${sottoVoci.join(' ') || '(nessuna)'}`);

const gonfie = sottoVoci.filter((v) => quante(v) > TETTO_SOTTOVOCE);
dice(gonfie.length === 0,
  `nessuna sotto-voce e\' piu\' grossa di una sezione (tetto ${TETTO_SOTTOVOCE} porte)`,
  gonfie.map((v) => `${v}: ${quante(v)} porte, merita una sezione sua`).join(' · '));

// ---- 3. e il quadro, scritto, cosi' si vede a occhio ----------------------
const pesi = [...new Set([...schede, ...sottoVoci])].map((s) => ({ s, n: quante(s) })).filter((x) => x.n > 0);
pesi.sort((a, b) => b.n - a.n);
dice(true, 'aree per numero di porte: ' + pesi.slice(0, 8).map((x) => `${x.s} ${x.n}`).join(' · '));

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nOgni cosa sta nella stanza della sua taglia. ✓');
process.exit(rossi.length ? 1 : 0);
