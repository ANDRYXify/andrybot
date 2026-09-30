// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PRIVACY E TERMINI NELLE TRE LINGUE (src/web/legali.js, docs/LINGUE.md).
//
// La tabella di legali.js e' la fonte: indirizzo e file di ogni pagina in ogni
// lingua. Il server le serve con righe scritte per esteso (le legge il cancello
// delle porte), quindi qui si controlla che quelle righe dicano la tabella, e che
// ogni pagina dica di se' quello che la tabella dice di lei.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LEGALI } from '../../src/web/legali.js';
import { VIE } from '../../src/web/guide.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = join(RAD, 'src/web/public');
const SERVER = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const SITO = 'https://socialbot.live';
const LANG = { it: 'it', en: 'en', es: 'es' };

const voci = Object.entries(LEGALI).flatMap(([pagina, lingue]) => Object.entries(lingue).map(([l, x]) => ({ pagina, l, ...x })));

test('ogni pagina legale ha il suo file, in ogni lingua', () => {
  for (const v of voci) assert.ok(existsSync(join(PUB, v.file)), `${v.pagina} ${v.l}: manca ${v.file}`);
});

test('il server serve ogni indirizzo col file della tabella, e lo apre a chi e\' senza sessione', () => {
  const rotte = (SERVER.match(/app\.get\(\[('\/privacy'[^\]]*)\]/) || [])[1] || '';
  const servite = new Set([...rotte.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  for (const v of voci) {
    assert.ok(servite.has(v.via), `${v.via}: nessuna rotta`);
    assert.ok(SERVER.includes(`guscio.pagina('${v.file}', '${v.via}'`), `${v.via}: non dichiara ${v.file} al guscio`);
  }
  assert.ok(servite.has('/terms'), '/terms resta per le app di terzi');
  assert.equal(servite.size, voci.length + 1, 'nessun indirizzo in piu\' o in meno della tabella');
});

test('il piede delle pagine collega la pagina legale della sua lingua', () => {
  for (const l of Object.keys(LANG)) {
    assert.equal(VIE[l].privacy, LEGALI.privacy[l].via);
    assert.equal(VIE[l].termini, LEGALI.termini[l].via);
  }
});

test('ogni pagina dice di se\' lingua, indirizzo e gruppo delle traduzioni', () => {
  for (const v of voci) {
    const h = readFileSync(join(PUB, v.file), 'utf8');
    assert.match(h, new RegExp(`<html lang="${LANG[v.l]}"`), `${v.file}: lingua`);
    assert.ok(h.includes(`<link rel="canonical" href="${SITO}${v.via}">`), `${v.file}: canonical`);
    assert.ok(h.includes(`<meta property="og:url" content="${SITO}${v.via}">`), `${v.file}: og:url`);
    for (const [k, y] of Object.entries(LEGALI[v.pagina])) {
      assert.ok(h.includes(`<link rel="alternate" hreflang="${k}" href="${SITO}${y.via}">`), `${v.file}: hreflang ${k}`);
    }
    assert.ok(h.includes(`<link rel="alternate" hreflang="x-default" href="${SITO}${LEGALI[v.pagina].it.via}">`), `${v.file}: x-default`);
    const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.ok(ld.some((o) => o.url === `${SITO}${v.via}`), `${v.file}: i dati strutturati dicono il suo indirizzo`);
  }
});

test('le traduzioni dicono che il testo di riferimento e\' l\'italiano, e ci portano', () => {
  for (const v of voci.filter((x) => x.l !== 'it')) {
    const h = readFileSync(join(PUB, v.file), 'utf8');
    const corpo = h.slice(h.indexOf('<body'));
    assert.ok(corpo.includes(`href="${LEGALI[v.pagina].it.via}"`), `${v.file}: collega l'italiano`);
  }
});

test('la data di una traduzione e\' quella del testo italiano che traduce', () => {
  const data = (f) => (readFileSync(join(PUB, f), 'utf8').match(/class="aggiornato-il" datetime="(\d{4}-\d{2}-\d{2})"/) || [])[1];
  for (const [pagina, lingue] of Object.entries(LEGALI)) {
    for (const x of Object.values(lingue)) assert.equal(data(x.file), data(lingue.it.file), `${pagina}: ${x.file}`);
  }
});
