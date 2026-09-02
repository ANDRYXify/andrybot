// Cancello delle RISORSE: quello che le pagine chiedono deve esistere.
//
// Un `src` sbagliato di una lettera non da' nessun errore da nessuna parte: da'
// un'immagine che non compare, un foglio di stile che non si applica, una icona
// che resta quella di prima. Se ne accorge chi guarda il sito, e spesso tardi.
//
// Qui si legge cosa chiedono le pagine servite e il manifest, e si guarda se
// quel file c'e'. Niente elenchi scritti a mano: si ricava tutto dai file.
//
// Uso: node scripts/verifica-risorse.mjs   (esce 1 se manca qualcosa)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// Tutti i sorgenti sotto src/: alcuni COMPONGONO pagine (le guide, la link-page
// pubblica) e chiedono risorse esattamente come un file .html.
function sorgentiJs(dir) {
  const fuori = [];
  for (const n of readdirSync(dir)) {
    const via = join(dir, n);
    if (statSync(via).isDirectory()) fuori.push(...sorgentiJs(via));
    else if (n.endsWith('.js')) fuori.push([n, via]);
  }
  return fuori;
}

// Quello che il browser deve trovare: sorgenti e collegamenti locali.
const RE = /(?:src|href)\s*=\s*"(\/[^"]+)"/g;
const chieste = new Map();     // percorso → chi lo chiede

for (const f of readdirSync(PUB).filter((x) => x.endsWith('.html'))) {
  const s = readFileSync(join(PUB, f), 'utf8');
  for (const m of s.matchAll(RE)) {
    const via = m[1].split('?')[0].split('#')[0];
    if (via.startsWith('//')) continue;                       // altro dominio
    if (!chieste.has(via)) chieste.set(via, new Set());
    chieste.get(via).add(f);
  }
}

const man = JSON.parse(readFileSync(join(PUB, 'manifest.webmanifest'), 'utf8'));
for (const i of man.icons || []) {
  const via = String(i.src).split('?')[0];
  if (!chieste.has(via)) chieste.set(via, new Set());
  chieste.get(via).add('manifest');
}

// ---- UN TIMBRO SOLO PER LE ICONE -----------------------------------------
// Il marchio cambia e le pagine chiedono ancora la vecchia icona: il file nuovo
// e' li', il browser tiene la sua copia e nella linguetta resta il logo di
// prima. Il timbro (?v=N) e' quello che dice al browser "e' un'altra cosa,
// riscaricala" — ma vale solo se lo hanno TUTTE le pagine. privacy.html e
// termini.html erano rimaste senza, e mostravano il logo vecchio.
//
// La regola non e' "ricordarsi di aggiornarle": e' che il timbro sia UNO SOLO.
// Qui si guarda che tutte le pagine e il manifest dicano lo stesso numero.
//
// E non solo le pagine-file: anche quelle che il server COMPONE (le guide, la
// link-page pubblica dello streamer). Guardando solo i .html erano rimaste
// fuori — e infatti le guide chiedevano un /favicon.svg che non e' mai
// esistito, e la link-page l'icona senza timbro.
const timbri = new Map();      // timbro → chi lo usa
const RE_ICONE = /(?:src|href|content)\s*=\s*"[^"]*?(\/(?:icons\/|favicon)[^"]*)"/g;
const paginate = [
  ...readdirSync(PUB).filter((x) => x.endsWith('.html')).map((f) => [f, join(PUB, f)]),
  ...sorgentiJs(join(RAD, 'src')),
];
for (const [nome, via] of paginate) {
  for (const m of readFileSync(via, 'utf8').matchAll(RE_ICONE)) {
    const [percorso, query = ''] = m[1].split('?');
    const t = query.match(/v=([^&]+)/)?.[1] || 'nessuno';
    if (!timbri.has(t)) timbri.set(t, new Set());
    timbri.get(t).add(`${nome} → ${m[1]}`);
    if (!chieste.has(percorso)) chieste.set(percorso, new Set());
    chieste.get(percorso).add(nome);
  }
}
for (const i of man.icons || []) {
  const t = (String(i.src).split('?')[1] || '').match(/v=([^&]+)/)?.[1] || 'nessuno';
  if (!timbri.has(t)) timbri.set(t, new Set());
  timbri.get(t).add('manifest → ' + i.src);
}
dice(timbri.size === 1 && !timbri.has('nessuno'),
  `le icone hanno un timbro solo: ${[...timbri.keys()].map((t) => 'v=' + t).join(' e ')}`);
if (timbri.size > 1 || timbri.has('nessuno')) {
  // si mostrano solo le pecore nere: il timbro buono e' quello della maggioranza
  const buono = [...timbri.entries()].sort((x, y) => y[1].size - x[1].size)[0][0];
  for (const [t, chi] of timbri) if (t !== buono) for (const c of chi) dice(false, `  usa v=${t}: ${c}`);
}

// Le rotte del server non sono file: si riconoscono perche' non hanno un
// punto nell'ultimo pezzo del percorso (/auth/twitch, /entra, /privacy).
const eFile = (via) => /\.[a-z0-9]+$/i.test(via);
const mancanti = [];
let file = 0;
for (const [via, chi] of chieste) {
  if (!eFile(via)) continue;
  file++;
  if (!existsSync(join(PUB, via))) mancanti.push(`${via} (chiesto da ${[...chi].join(', ')})`);
}
dice(file > 10, `file chiesti dalle pagine e dal manifest: ${file}`);
dice(mancanti.length === 0, 'esistono tutti');
for (const m of mancanti) dice(false, '  manca ' + m);

// Il marchio si genera dai disegni: se sparisce la sorgente, nessuno puo' piu'
// rifare le misure e il giorno che il logo cambia si e' fermi.
for (const s of ['assets/marchio/sbot.png', 'assets/marchio/socialbot.png']) {
  dice(existsSync(join(RAD, s)), `la sorgente del marchio c'e': ${s}`);
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nOgni file che le pagine chiedono esiste. ✓');
process.exit(rossi.length ? 1 : 0);
