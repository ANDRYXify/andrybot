// Cancello della CSP e di quello che il sito dichiara al mondo.
//
// L'invariante: NESSUNA pagina servita ha uno <script> scritto dentro l'HTML,
// e nessun elemento ha un attributo on-qualcosa. Percio' `script-src` non ha
// bisogno di 'unsafe-inline' — che e' il permesso che rende una CSP quasi
// inutile contro l'XSS, perche' un pezzo di HTML iniettato puo' portarsi
// dietro il suo <script>.
//
// Il verso giusto e' questo: se domani rientra uno script inline, smette di
// funzionare e questo cancello diventa rosso. Non si allarga la CSP per farlo
// tornare a funzionare: si porta lo script in un file.
//
// Due permessi restano, ed entrambi hanno una ragione misurata:
//  · 'inline-speculation-rules' — serve SOLO al blocco <script
//    type="speculationrules"> del prefetch. Senza, Chrome lo rifiuta
//    ("Refused to apply inline speculation rules", riprodotto sul banco).
//    Non abilita nessun altro script inline.
//  · 'unsafe-inline' su style-src — l'app scrive stili al volo (posizioni,
//    colori scelti dallo streamer). Togliere quello e' un lavoro a se'.
//
// Uso: node scripts/verifica-csp.mjs   (esce 1 se qualcosa non torna)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');
const caddy = readFileSync(join(RAD, 'Caddyfile'), 'utf8');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
// Un controllo ripetuto su N file non merita N righe: se filano tutti se ne
// stampa una sola, e i nomi compaiono solo quando qualcosa non torna.
const perOgnuno = (cose, prova, riassunto) => {
  const rotte = cose.map((c, i) => [c, i]).filter(([c]) => !prova(c));
  if (rotte.length) {
    for (const [c, i] of rotte) dice(false, riassunto(1) + `: ${typeof c === 'string' ? c : `politica ${i + 1}`}`);
  } else dice(true, riassunto(cose.length));
};

// ---- le politiche, lette dal Caddyfile ----------------------------------
const politiche = [...caddy.matchAll(/Content-Security-Policy\s+"([^"]+)"/g)].map((m) => {
  const d = {};
  for (const pezzo of m[1].split(';')) {
    const [nome, ...fonti] = pezzo.trim().split(/\s+/);
    if (nome) d[nome] = fonti;
  }
  return d;
});
dice(politiche.length > 0, `politiche CSP lette dal Caddyfile: ${politiche.length}`);

// ---- 1. nessun script-src si fida degli script inline --------------------
const srcDi = (p) => p['script-src'] || p['default-src'] || [];
perOgnuno(politiche, (p) => !srcDi(p).includes("'unsafe-inline'"),
  (n) => `script-src non si fida degli script inline (${n} politiche)`);
perOgnuno(politiche, (p) => !srcDi(p).includes("'unsafe-eval'"),
  (n) => `script-src non permette eval (${n} politiche)`);

// ---- 2. le difese di base ci sono in tutte -------------------------------
for (const [dir, atteso] of [['object-src', "'none'"], ['base-uri', "'self'"]]) {
  perOgnuno(politiche, (p) => (p[dir] || []).includes(atteso), (n) => `${dir} ${atteso} (${n} politiche)`);
}
perOgnuno(politiche, (p) => !!p['frame-ancestors'], (n) => `ogni politica dice chi puo' incorniciarla (${n})`);

// ---- 3. nessuno script scritto dentro l'HTML -----------------------------
// Ammessi solo i blocchi che il browser NON esegue come JavaScript: il JSON-LD
// (dati per i motori di ricerca) e le regole di prefetch, che hanno un permesso
// CSP tutto loro.
const TIPI_NON_ESEGUITI = ['application/ld+json', 'speculationrules', 'importmap'];
let conSpeculation = false;
const html = readdirSync(PUB).filter((f) => f.endsWith('.html'));
dice(html.length > 0, `pagine controllate: ${html.length}`);
const senzaInline = (f) => {
  const s = readFileSync(join(PUB, f), 'utf8');
  const inline = [...s.matchAll(/<script([^>]*)>/g)]
    .map((m) => m[1])
    .filter((attr) => !/\bsrc\s*=/.test(attr))
    .filter((attr) => {
      const t = /type\s*=\s*["']([^"']+)["']/.exec(attr);
      if (t && t[1] === 'speculationrules') conSpeculation = true;
      return !(t && TIPI_NON_ESEGUITI.includes(t[1]));
    });
  return inline.length === 0;
};
perOgnuno(html, senzaInline, (n) => `niente <script> scritto dentro la pagina (${n} pagine)`);

// ---- 4. e nemmeno un attributo on-qualcosa (anche nel markup generato) ----
// Il markup che app.js scrive a runtime conta quanto quello dei file .html:
// un onerror="" in una stringa e' un attributo inline a tutti gli effetti.
const RE_ON = /<[a-z][^>]*?\son(?:click|error|load|change|input|submit|mouseover|focus|blur|keydown|keyup)\s*=\s*["']/i;
const serviti = readdirSync(PUB).filter((x) => /\.(html|js)$/.test(x));
perOgnuno(serviti, (f) => !RE_ON.test(readFileSync(join(PUB, f), 'utf8')),
  (n) => `nessun attributo on-qualcosa (${n} file, HTML e JS)`);

// ---- 5. se c'e' il prefetch inline, dev'esserci il suo permesso ----------
if (conSpeculation) {
  dice(politiche.some((p) => (p['script-src'] || []).includes("'inline-speculation-rules'")),
    "il prefetch inline ha il suo permesso ('inline-speculation-rules')");
}

// ---- 6. security.txt: c'e', ed e' ancora valido --------------------------
const sec = join(PUB, 'well-known/security.txt');
dice(existsSync(sec), 'security.txt esiste (RFC 9116)');
if (existsSync(sec)) {
  const t = readFileSync(sec, 'utf8');
  dice(/^Contact:\s*\S+/m.test(t), 'security.txt dice a chi scrivere');
  const scad = /^Expires:\s*(\S+)/m.exec(t);
  dice(!!scad, 'security.txt ha una scadenza (lo standard la vuole)');
  if (scad) {
    const q = Date.parse(scad[1]);
    dice(Number.isFinite(q) && q > Date.now(),
      'la scadenza di security.txt non e\' passata', scad[1]);
    dice(Number.isFinite(q) && q < Date.now() + 400 * 86400_000,
      'la scadenza di security.txt sta entro l\'anno', scad[1]);
  }
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nNiente script inline, e la CSP non ha bisogno di fidarsi. ✓');
process.exit(rossi.length ? 1 : 0);
