// L'ANTEPRIMA DEI LINK: una pagina che si può condividere deve presentarsi.
//
// Quando si incolla un link in una chat, l'app va a leggere la pagina e mostra
// una cartolina. Se la pagina non dice niente — niente titolo social, niente
// immagine — l'app si arrangia: prende quello che ha in cache per quel dominio,
// e può tirare fuori una cartolina di anni prima. È successo: cinque pagine
// pubbliche (privacy, termini, invito moderatori, sblocco, mini app) non avevano
// una sola riga di metadati, e nell'anteprima usciva il marchio vecchio.
//
// La regola non si scrive in un elenco: una pagina è condivisibile se il server
// la dichiara pubblica E ha una rotta stabile sua. Le pagine dell'overlay in OBS
// non ce l'hanno — si aprono solo con la chiave — e infatti restano fuori da
// sole, senza doverle nominare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = join(RAD, 'src/web/public');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const VET = readFileSync(join(RAD, 'src/web/vetrina.js'), 'utf8');

// le pagine che il server serve senza sessione
const PAGINE = [...SRV.matchAll(/guscio\.pagina\('([^']+)'\)/g)].map((m) => m[1]);
// le rotte stabili che il cancello lascia passare
const bloccoRotte = VET.slice(VET.indexOf('const ROTTE = new Set(['), VET.indexOf('// Famiglie di rotte'));
const ROTTE = new Set([...bloccoRotte.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]));

// Una pagina è condivisibile se esiste una rotta che porta a lei.
const rottaDi = (nome) => (nome === 'index.html' ? '/' : '/' + nome.replace(/\.html$/, ''));
const condivisibili = PAGINE.filter((n) => ROTTE.has(rottaDi(n)));

test('le pagine condivisibili si riconoscono dalle rotte', () => {
  assert.ok(condivisibili.length >= 5, `condivisibili: ${condivisibili.join(', ')}`);
  assert.ok(condivisibili.includes('index.html'));
  assert.ok(condivisibili.includes('privacy.html'));
  // le pagine dell'overlay non hanno una rotta stabile: restano fuori da sole
  assert.equal(condivisibili.includes('overlay.html'), false);
  assert.equal(condivisibili.includes('tracking-overlay.html'), false);
});

const RICHIESTI = [
  ['<title>', /<title>[^<]{5,}<\/title>/],
  ['description', /<meta name="description" content="[^"]{40,}"/],
  ['canonical', /<link rel="canonical" href="https:\/\/socialbot\.live[^"]*"/],
  ['robots', /<meta name="robots" content="[^"]+"/],
  ['og:title', /<meta property="og:title" content="[^"]{10,}"/],
  ['og:description', /<meta property="og:description" content="[^"]{40,}"/],
  ['og:url', /<meta property="og:url" content="https:\/\/socialbot\.live[^"]*"/],
  ['og:image', /<meta property="og:image" content="(https:\/\/socialbot\.live\/icons\/[^"]+)"/],
  ['twitter:card', /<meta name="twitter:card" content="summary_large_image"/],
  ['twitter:image', /<meta name="twitter:image" content="https:\/\/socialbot\.live\/icons\/[^"]+"/],
];

test('ogni pagina condivisibile ha la sua cartolina', () => {
  const mancanti = [];
  for (const nome of condivisibili) {
    const h = readFileSync(join(PUB, nome), 'utf8');
    for (const [che, re] of RICHIESTI) if (!re.test(h)) mancanti.push(`${nome}: ${che}`);
  }
  assert.deepEqual(mancanti, [], 'nessuna pagina condivisibile senza anteprima');
});

test("l'immagine dell'anteprima esiste davvero", () => {
  for (const nome of condivisibili) {
    const h = readFileSync(join(PUB, nome), 'utf8');
    const via = h.match(/<meta property="og:image" content="https:\/\/socialbot\.live(\/icons\/[^"?]+)/)[1];
    assert.ok(existsSync(join(PUB, via)), `${nome} → ${via}`);
  }
});

// Le pagine che servono a fare una cosa (entrare, gestire un canale) non sono
// contenuto: se finissero nei motori farebbero concorrenza alla home con due
// righe di testo.
test('le pagine di servizio non finiscono nei motori', () => {
  for (const nome of ['mod.html', 'sblocca.html', 'tgapp.html']) {
    const h = readFileSync(join(PUB, nome), 'utf8');
    assert.match(h, /<meta name="robots" content="noindex/, nome);
  }
  for (const nome of ['index.html', 'privacy.html', 'termini.html']) {
    const h = readFileSync(join(PUB, nome), 'utf8');
    assert.doesNotMatch(h, /content="noindex/, `${nome} deve restare indicizzabile`);
  }
});

// L'anteprima dice quello che dice la pagina. Il titolo social È il titolo
// della pagina, in ogni lingua: quando l'apertura cambia, la cartolina cambia
// con lei — altrimenti nelle chat continua a girare una pagina che non esiste
// più (è successo: «scrive col tuo account» per settimane dopo la riscrittura).
const VISTA = readFileSync(join(RAD, 'src/web/vetrina-vista.js'), 'utf8');
const daH1 = VISTA.indexOf('<h1 class="vt-titolo">');
const rigaH1 = VISTA.slice(daH1, VISTA.indexOf('</h1>', daH1));
const pezziH1 = [...rigaH1.matchAll(/L\('([^']*)', '([^']*)', '([^']*)'\)/g)];
const h1Di = (i) => pezziH1.map((m) => m[i + 1]).join(' ').replace(/\s+/g, ' ').trim();
const bloccoLingua = (codice) => {
  const da = SRV.indexOf(`    ${codice}: {`, SRV.indexOf('const META_LINGUA'));
  return SRV.slice(da, SRV.indexOf('    },', da));
};
const campo = (codice, nome) => bloccoLingua(codice).match(new RegExp(`${nome}: '([^']*)'`))[1];

test("il titolo dell'anteprima è il titolo della pagina, in ogni lingua", () => {
  assert.equal(pezziH1.length, 2, 'l\'h1 è fatto di due pezzi tradotti');
  for (const [codice, i] of [['it', 0], ['en', 1], ['es', 2]]) {
    assert.equal(campo(codice, 'ogTitolo'), h1Di(i), `og:title ${codice}`);
    assert.equal(campo(codice, 'twTitolo'), h1Di(i), `twitter:title ${codice}`);
  }
  const home = readFileSync(join(PUB, 'index.html'), 'utf8');
  assert.ok(home.includes(`<meta property="og:title" content="${h1Di(0)}">`), 'index.html porta il titolo italiano');
});
