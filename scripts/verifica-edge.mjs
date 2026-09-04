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
  console.log('\nIl Caddyfile e\' MONTATO nel container dell\'edge. Attenzione: «docker compose\n' +
    'up -d caddy» NON basta — ricrea il container solo se cambia la configurazione del\n' +
    'servizio, e un file montato che cambia non conta: risponde «up-to-date» e non fa\n' +
    'niente. Il comando che rilegge davvero il file e\':\n\n' +
    '    docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile\n\n' +
    'Se l\'API di amministrazione di Caddy e\' spenta e «reload» non passa:\n\n' +
    '    docker compose restart caddy\n\n' +
    'Poi rigira questo collaudo: deve dire «edge allineato».\n');
  console.log('edge NON allineato ✗\n');
  process.exit(1);
}
console.log('\nedge allineato ✓\n');
