// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello delle CHIAVI: nessun file tracciato porta un segreto vero.
//
// La regola (docs/GUARDIA.md): una chiave finita in un file tracciato e' gia'
// persa nel momento in cui si spinge, perche' la storia di git non dimentica.
// Quindi si ferma prima: questo cancello gira prima di ogni spinta, sul server
// a ogni aggiornamento e nella guardia notturna.
//
// Cosa cerca:
//  · le forme note delle chiavi (una chiave privata PEM, Stripe, Telegram,
//    Twitch, GitHub, Google, AWS, Slack, Discord);
//  · i file che per nome sono un segreto (.env, .pem, .key, un database).
// Le eccezioni stanno in un elenco, col loro perche': una voce che non trova
// piu' il suo testo e' rossa anche lei, come negli altri cancelli.
//
// Uso: node scripts/verifica-chiavi.mjs [--selftest]
import './_dati-usa-e-getta.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

// Le forme. Ognuna e' stretta apposta: meglio non vedere una chiave strana che
// gridare a ogni stringa lunga, perche' un cancello che grida a vuoto si spegne.
export const FORME = [
  ['una chiave privata', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
  ['una chiave segreta di Stripe', /\b[sr]k_live_[0-9A-Za-z]{20,}\b/],
  ['il segreto di un webhook di Stripe', /\bwhsec_[0-9A-Za-z]{24,}\b/],
  ['il token di un bot Telegram', /\b\d{8,10}:AA[0-9A-Za-z_-]{33}\b/],
  ['un token OAuth di Twitch', /\boauth:[a-z0-9]{30}\b/],
  ['un token di GitHub', /\b(?:gh[pousr]_[0-9A-Za-z]{36,}|github_pat_[0-9A-Za-z_]{40,})\b/],
  ['una chiave di Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['una chiave di accesso di AWS', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['un token di Slack', /\bxox[abprs]-[0-9A-Za-z-]{20,}\b/],
  ['il token di un bot Discord', /\b[MNO][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}\b/],
];

// I nomi che sono gia' un segreto, qualunque cosa contengano.
export const NOMI = [
  ['un file .env', /(^|\/)\.env(\.[^/]*)?$/],
  ['una chiave o un certificato privato', /\.(pem|key|p12|pfx)$/i],
  ['un database', /\.(sqlite3?|db)(-wal|-shm)?$/i],
];
// .env.example e' un modello: si legge come gli altri file, ma il nome e' ammesso.
const NOMI_AMMESSI = [/(^|\/)\.env\.(example|esempio|modello)$/];

// Le eccezioni: [file, pezzo di testo che c'e' in quel file, perche'].
export const ECCEZIONI = [];

export function guaiDelTesto(file, testo, eccezioni = ECCEZIONI) {
  const guai = [];
  const mie = eccezioni.filter((e) => e[0] === file);
  String(testo).split('\n').forEach((riga, i) => {
    for (const [nome, forma] of FORME) {
      const m = forma.exec(riga);
      if (!m) continue;
      if (mie.some((e) => riga.includes(e[1]))) continue;
      guai.push(`${file}:${i + 1} ${nome}: «${m[0].slice(0, 12)}…»`);
    }
  });
  return guai;
}
export function guaiDelNome(file) {
  if (NOMI_AMMESSI.some((r) => r.test(file))) return [];
  return NOMI.filter(([, r]) => r.test(file)).map(([nome]) => `${file}: ${nome} non si traccia`);
}

if (process.argv.includes('--selftest')) {
  // Le chiavi di prova si compongono qui, a pezzi: scritte intere farebbero
  // scattare il cancello su se stesso.
  const c = (...p) => p.join('');
  const PROVE = [
    ['una chiave privata', c('-----BEGIN ', 'PRIVATE KEY-----')],
    ['Stripe', c('sk_', 'live_', 'a1B2c3D4e5F6g7H8i9J0k1L2')],
    ['il webhook di Stripe', c('whsec', '_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3')],
    ['Telegram', c('1234567890', ':AA', 'a'.repeat(33))],
    ['Twitch', c('oauth', ':', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5')],
    ['GitHub', c('gh', 'p_', 'a'.repeat(36))],
    ['Google', c('AI', 'za', 'a'.repeat(35))],
    ['AWS', c('AK', 'IA', 'ABCDEFGHIJKLMNOP')],
    ['Slack', c('xox', 'b-', '1234567890-abcdefghijkl')],
    ['Discord', c('M', 'a'.repeat(24), '.', 'abcdef', '.', 'a'.repeat(27))],
  ];
  let cieche = 0;
  const dice = (ok, che) => { console.log((ok ? '  ✓  ' : '  ✗  ') + che + (ok ? '' : '  → PASSA INOSSERVATO')); if (!ok) cieche++; };
  for (const [che, chiave] of PROVE) dice(guaiDelTesto('x.js', `const k = '${chiave}';`).length === 1, `${che} in un file`);
  for (const f of ['.env', 'server/.env.production', 'chiave.pem', 'data/bot.sqlite', 'data/bot.db-wal']) dice(guaiDelNome(f).length === 1, `${f} tracciato`);
  dice(guaiDelNome('.env.example').length === 0 && guaiDelNome('src/web/vetrina.js').length === 0, 'un modello e un file normale non sono segreti');
  dice(guaiDelTesto('x.js', 'const versione = "1.2.3"; // nessuna chiave qui').length === 0, 'una riga normale non fa gridare');
  const chiave = PROVE[1][1];
  dice(guaiDelTesto('x.js', `k = '${chiave}'`, [['x.js', chiave, 'prova']]).length === 0 && guaiDelTesto('y.js', `k = '${chiave}'`, [['x.js', chiave, 'prova']]).length === 1, 'un\'eccezione vale per il suo file e basta');
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

const tracciati = execFileSync('git', ['ls-files', '-z'], { cwd: RAD, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);
const guai = [];
let letti = 0;
const usate = new Set();
for (const f of tracciati) {
  guai.push(...guaiDelNome(f));
  let st;
  try { st = statSync(join(RAD, f)); } catch { continue; }
  if (!st.isFile() || st.size > 4 * 1024 * 1024) continue;
  const buf = readFileSync(join(RAD, f));
  if (buf.subarray(0, 8000).includes(0)) continue;
  letti++;
  const testo = buf.toString('utf8');
  for (const e of ECCEZIONI) if (e[0] === f && testo.includes(e[1])) usate.add(e);
  guai.push(...guaiDelTesto(f, testo));
}
for (const e of ECCEZIONI) if (!usate.has(e)) guai.push(`eccezione senza piu' il suo testo: ${e[0]} («${e[2]}»)`);

console.log(`\nNessun segreto nei file tracciati.\n\n  · file tracciati: ${tracciati.length}, letti come testo: ${letti}\n  · forme cercate: ${FORME.length}, nomi vietati: ${NOMI.length}, eccezioni: ${ECCEZIONI.length}`);
if (guai.length) {
  for (const g of guai.slice(0, 40)) console.log('  ✗ ' + g);
  console.log(`\n${guai.length} ${guai.length === 1 ? 'cosa non torna' : 'cose non tornano'}: una chiave vera si revoca SUBITO da chi l'ha emessa, poi si toglie dal file.`);
  process.exit(1);
}
console.log('\ncancello verde ✓');
