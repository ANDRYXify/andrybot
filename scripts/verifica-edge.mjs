// Il lucchetto e' sulla porta? — confronta gli header di sicurezza SCRITTI nel
// Caddyfile con quelli che il sito manda DAVVERO.
//
// Perche' esiste: il Caddyfile e' un file montato nel container dell'edge, non
// una cosa che si aggiorna quando si aggiorna il bot. Si puo' irrobustire la
// politica nel repo e lasciarla la' per mesi, convinti di essere protetti,
// mentre in rete gira ancora quella vecchia. E' successo: script-src aveva
// perso 'unsafe-inline' nel repo e ce l'aveva ancora in produzione.
//
// Gira fuori da `npm run cancelli` perche' esce in rete: i cancelli devono
// restare statici e istantanei.
//
// Uso: node scripts/verifica-edge.mjs [https://socialbot.live]

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITO = process.argv.find((a) => a.startsWith('http')) || 'https://socialbot.live';
const caddy = readFileSync(join(RAD, 'Caddyfile'), 'utf8');

// La CSP del gruppo «tutto il resto»: e' quella che copre la dashboard e le
// pagine pubbliche, cioe' quello che vede un visitatore qualunque.
const blocco = caddy.slice(caddy.indexOf('# --- Tutto il resto'));
const attesa = {};
const csp = /Content-Security-Policy "([^"]+)"/.exec(blocco);
if (csp) attesa['content-security-policy'] = csp[1];
for (const nome of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy',
  'Cross-Origin-Opener-Policy', 'Permissions-Policy']) {
  const m = new RegExp(nome + ' "([^"]+)"').exec(caddy);
  if (m) attesa[nome.toLowerCase()] = m[1];
}
const xfo = /X-Frame-Options "([^"]+)"/.exec(blocco);
if (xfo) attesa['x-frame-options'] = xfo[1];

let r;
try { r = await fetch(SITO + '/', { redirect: 'follow' }); }
catch (e) { console.log('Non riesco a raggiungere ' + SITO + ': ' + (e?.message || e)); process.exit(0); }

const pezzi = (v) => new Set(String(v || '').split(';').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean));
const guai = [];
const righe = [];

for (const [nome, valeva] of Object.entries(attesa)) {
  const vero = r.headers.get(nome);
  if (!vero) { guai.push(`${nome}: il sito non lo manda affatto`); righe.push([nome, 'MANCA']); continue; }
  if (nome === 'content-security-policy') {
    const a = pezzi(valeva), b = pezzi(vero);
    const diverse = [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x)));
    if (diverse.length) {
      for (const d of [...a].filter((x) => !b.has(x))) guai.push(`CSP: in rete manca «${d}»`);
      for (const d of [...b].filter((x) => !a.has(x))) guai.push(`CSP: in rete c'e' in piu' «${d}»`);
      righe.push([nome, 'DIVERSA']);
    } else righe.push([nome, 'uguale']);
    continue;
  }
  if (String(vero).trim() !== String(valeva).trim()) {
    guai.push(`${nome}: in rete «${vero}», nel Caddyfile «${valeva}»`);
    righe.push([nome, 'DIVERSO']);
  } else righe.push([nome, 'uguale']);
}

// e l'header che rivela il server non deve esserci
if (r.headers.get('server')) guai.push(`il sito dice che server e': «${r.headers.get('server')}»`);

console.log('\nQuel che e\' scritto nel Caddyfile e quel che il sito manda davvero.\n');
for (const [n, s] of righe) console.log(`  ${s === 'uguale' ? '✓' : '✗'} ${n}: ${s}`);
if (guai.length) {
  console.log('\nDifferenze:');
  for (const g of guai) console.log('  - ' + g);
  console.log('\nIl Caddyfile e\' montato nel container dell\'edge come SINGOLO FILE, e un mount\n' +
    'di file punta all\'inode, non al percorso. «git pull» non modifica il file sul\n' +
    'posto: ne scrive uno nuovo e lo rinomina sopra, quindi cambia inode — e il\n' +
    'container continua a vedere quello VECCHIO. Per sempre. Ne consegue che:\n\n' +
    '  - «caddy reload» riesce e non cambia niente (rilegge il file vecchio);\n' +
    '  - «docker compose restart caddy» nemmeno (stesso container, stesso mount);\n' +
    '  - «docker compose up -d caddy» dice «up-to-date» e non fa nulla, perche\'\n' +
    '    la configurazione del SERVIZIO non e\' cambiata.\n\n' +
    'Si controlla cosi\', e se risponde 0 e\' proprio questo:\n\n' +
    '    docker compose exec caddy grep -c inline-speculation-rules /etc/caddy/Caddyfile\n\n' +
    'E si cura ricreando il container, che e\' l\'unica cosa che rilegge il percorso:\n\n' +
    '    docker compose up -d --force-recreate caddy\n\n' +
    'Poi rigira questo collaudo: deve dire «edge allineato».\n');
  console.log('edge NON allineato ✗\n');
  process.exit(1);
}
console.log('\nedge allineato ✓\n');
