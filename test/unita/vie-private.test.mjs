// LE VIE PRIVATE STAVANO SCRITTE IN DUE POSTI, E I DUE NON SI PARLAVANO.
//
// `index.html` ha le regole di prefetch: dicono al browser dove NON andare da
// solo — uscita, accesso, overlay, API. `robots.txt` dice a un crawler dove non
// andare. Sono la stessa lista, per due lettori diversi, e ne mancavano quattro
// da una parte: `/esci`, `/logout`, `/o/` (il link corto dell'overlay) e
// `/tracking/`.
//
// Il conto l'ha presentato Search Console: Google aveva crawlato
// `socialbot.live/esci*` — proprio la stringa-pattern delle regole di prefetch,
// letta come se fosse un indirizzo — e si era preso un 404.
//
// Quindi l'invariante, che non ha bisogno di un terzo elenco da tenere
// aggiornato: TUTTO QUELLO CHE TOGLIAMO AL PREFETCH E' ROBA DOVE UN CRAWLER NON
// DEVE ANDARE. Se domani si aggiunge una via privata alle regole di prefetch e
// ci si scorda di robots.txt, questa prova diventa rossa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HTML = readFileSync(join(RAD, 'src/web/public/index.html'), 'utf8');
const ROBOTS = readFileSync(join(RAD, 'src/web/public/robots.txt'), 'utf8');

function fuoriDalPrefetch() {
  const m = HTML.match(/"not":\s*\{\s*"href_matches":\s*\[([^\]]+)\]/);
  assert.ok(m, 'non trovo l\'elenco di quel che sta fuori dal prefetch');
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const chiusi = ROBOTS.split('\n')
  .map((r) => r.trim())
  .filter((r) => /^Disallow:/i.test(r))
  .map((r) => r.replace(/^Disallow:\s*/i, '').trim())
  .filter(Boolean);

test('quel che togliamo al prefetch e\' chiuso anche ai crawler', () => {
  const fuori = fuoriDalPrefetch();
  assert.ok(fuori.length >= 8, `solo ${fuori.length} vie fuori dal prefetch: l'elenco non e' quello`);
  const scoperte = fuori.filter((p) => {
    const via = p.replace(/\*+$/, '');
    return !chiusi.some((d) => via === d || via.startsWith(d) || d.startsWith(via));
  });
  assert.deepEqual(scoperte, [],
    'stanno fuori dal prefetch ma un crawler ci puo\' andare: mettile in robots.txt');
});

test('le vie che portano fuori dalla sessione non si crawlano', () => {
  // Un crawler che segue l'uscita si disconnette da solo e si prende un 404.
  for (const via of ['/esci', '/logout']) {
    assert.ok(chiusi.some((d) => via.startsWith(d)), `${via} non e' chiusa in robots.txt`);
  }
});

test('le superfici dell\'overlay restano fuori dall\'indice', () => {
  // /o/ e' il link corto dell'overlay, /tracking/ la sua tela: non sono pagine,
  // sono roba che gira dentro OBS. Indicizzarle non serve a nessuno.
  for (const via of ['/overlay/', '/o/', '/tracking/']) {
    assert.ok(chiusi.includes(via), `${via} non e' chiusa in robots.txt`);
  }
});

test('la vetrina pubblica invece resta aperta', () => {
  for (const via of ['/guide', '/manuale', '/novita', '/u/']) {
    assert.ok(!chiusi.some((d) => via.startsWith(d)),
      `${via} e' pubblica ma robots.txt la chiude`);
  }
  assert.match(ROBOTS, /^Allow:\s*\/$/m, 'manca l\'apertura del resto');
  assert.match(ROBOTS, /^Sitemap:\s*https:\/\//m, 'manca la sitemap');
});
