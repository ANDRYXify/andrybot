// Cancello delle PORTE: chi puo' bussare, e a cosa.
//
// La domanda giusta non e' «si vedono le chiamate col tasto destro?» — quelle si
// vedono sempre, sono le chiamate che fa il TUO browser, e nessun sito al mondo
// puo' nasconderle a chi le sta facendo. La domanda giusta e': se bussa qualcun
// altro, gli si apre?
//
// Quindi ogni rotta deve avere un guardiano — sessione, ruolo, chiave
// dell'overlay, chiave dell'estensione, firma del pagamento — oppure stare
// nell'elenco qui sotto, dove ogni voce ha scritto PERCHE' e' pubblica. Una
// rotta nuova senza guardiano nasce ROSSA: non serve accorgersene, si accorge il
// cancello.
//
// L'elenco non puo' nemmeno marcire: se una voce non corrisponde piu' a nessuna
// rotta, e' rossa uguale.
//
// Uso: node scripts/verifica-porte.mjs
//      node scripts/verifica-porte.mjs --selftest   (deve diventare rosso)

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');

// Tutto cio' che, dentro il corpo di una rotta, dimostra che qualcuno controlla
// chi sta bussando.
const GUARDIANI = [
  'requireAdmin', 'requireLogin', 'requireMod', 'requireOwner',
  'chiaveOk',        // chiave dell'overlay: il link e' il segreto
  'chiaveUguale',    // chiave dell'estensione, confronto a tempo costante
  'apiKeyValida',    // chiave dell'estensione: dell'impronta salvata, a tempo costante
  'verificaWebhook', // firma di Stripe
  'currentUser',     // legge la sessione: senza, non c'e' niente da leggere
  'soloProprietario',
];

// Le porte aperte, una per una, col motivo. Sono la faccia pubblica del sito:
// pagine che chiunque deve poter leggere, ritorni dei login esterni, e i due
// passaggi della passkey (che il segreto se lo verificano da soli).
const PUBBLICHE = new Map([
  ['GET /entra', 'la pagina di ingresso'],
  ['GET /accedi', 'la pagina di ingresso'],
  ['GET /privacy', 'informativa: pubblica per obbligo'],
  ['GET /.well-known/security.txt', 'come segnalare un problema di sicurezza'],
  ['GET /health', 'battito del servizio: solo ok, stato e da quanto e acceso'],
  ['GET /sitemap.xml', 'per i motori di ricerca'],
  ['GET /llms.txt', 'per i motori di ricerca'],
  ['GET /guide', 'le guide sono pubbliche'],
  ['GET /guide/:slug', 'le guide sono pubbliche'],
  ['GET /manuale', 'il manuale e pubblico'],
  ['GET /manuale/:slug', 'il manuale e pubblico'],
  ['GET /novita', 'le novita sono pubbliche'],
  ['GET /api/novita', 'le novita sono pubbliche'],
  ['GET /api/abbonamento/piani', 'il listino e pubblico'],
  ['GET /u/:user', 'la pagina link di uno streamer e pubblica per definizione'],
  ['GET /u/:user/avatar', 'immagine della pagina link'],
  ['GET /u/:user/img/:file', 'immagini della pagina link'],
  ['GET /u/:user/privacy', 'informativa della pagina link'],
  ['GET /api/streamer-verify', 'lo stesso servizio della pagina link, origine fissa'],
  ['GET /o/:login/:slug', 'scorciatoia verso un overlay: rimanda al link con la chiave'],
  ['GET /auth/callback', 'ritorno del login Twitch'],
  ['GET /auth/mod', 'ingresso dei moderatori'],
  ['GET /auth/logout', 'uscita'],
  ['GET /spotify/callback', 'ritorno del collegamento Spotify'],
  ['GET /tiktok/callback', 'ritorno del collegamento TikTok'],
  ['GET /telegram/oidc/callback', 'ritorno del collegamento Telegram'],
  ['GET /tgapp', 'la mini-app dentro Telegram'],
  ['POST /api/tgapp/auth', 'verifica da se la firma di Telegram'],
  ['POST /tg/:secret', 'segreto nel percorso piu header segreto di Telegram'],
  ['POST /api/passkey/login/inizio', 'il login non puo chiedere di essere gia loggati'],
  ['POST /api/passkey/login/fine', 'il login non puo chiedere di essere gia loggati'],
]);

let sorgente = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
if (SELFTEST) {
  sorgente = sorgente.replace(
    "  app.get('/health',",
    "  app.get('/api/segreti-di-tutti', wrap(async (req, res) => res.json({ tutto: 1 })));\n  app.get('/health',");
}

const rotte = [];
const re = /app\.(get|post|put|patch|delete|all)\(\s*('[^']*'|"[^"]*")/g;
let m;
while ((m = re.exec(sorgente))) {
  const via = m[2].replace(/['"]/g, '');
  let i = sorgente.indexOf('(', m.index + 4), d = 0, k = i;
  for (; k < sorgente.length; k++) {
    if (sorgente[k] === '(') d++;
    else if (sorgente[k] === ')') { d--; if (!d) { k++; break; } }
  }
  const corpo = sorgente.slice(i, k);
  const guardia = GUARDIANI.find((g) => new RegExp('\\b' + g + '\\b').test(corpo)) || null;
  rotte.push({ chiave: m[1].toUpperCase() + ' ' + via, via, guardia, corpo });
}

const guai = [];

// 1) niente porte senza guardiano che non siano dichiarate
const senza = rotte.filter((r) => !r.guardia);
for (const r of senza) {
  if (!PUBBLICHE.has(r.chiave)) guai.push(`${r.chiave}: nessun guardiano e non e' dichiarata pubblica`);
}

// 2) l'elenco delle pubbliche non deve marcire
const viste = new Set(senza.map((r) => r.chiave));
for (const k of PUBBLICHE.keys()) {
  if (!viste.has(k)) guai.push(`«${k}» e' nell'elenco delle pubbliche ma non esiste piu' (o ora ha un guardiano): toglila`);
}

// 3) quel che e' di amministrazione vuole il guardiano dell'amministrazione,
//    non basta essere entrati
for (const r of rotte) {
  if (/^\/api\/admin\b/.test(r.via) && r.guardia !== 'requireAdmin') {
    guai.push(`${r.chiave}: e' una porta di amministrazione ma il guardiano e' «${r.guardia || 'nessuno'}»`);
  }
}

const conta = {};
for (const r of rotte) conta[r.guardia || 'pubblica'] = (conta[r.guardia || 'pubblica'] || 0) + 1;

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nOgni porta ha il suo guardiano, o un motivo scritto per non averlo.\n');
console.log('  ' + Object.entries(conta).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(' · ') + '\n');

let verde = true;
verde = dice(!guai.some((g) => /nessun guardiano/.test(g)), `rotte lette: ${rotte.length}`, guai.filter((g) => /nessun guardiano/.test(g)).slice(0, 5).join(' · ')) && verde;
verde = dice(!guai.some((g) => /marcire|toglila/.test(g)), `porte dichiarate pubbliche: ${PUBBLICHE.size}, tutte ancora vere`, guai.filter((g) => /toglila/.test(g)).slice(0, 5).join(' · ')) && verde;
verde = dice(!guai.some((g) => /amministrazione/.test(g)), `porte di amministrazione: ${rotte.filter((r) => /^\/api\/admin\b/.test(r.via)).length}`, guai.filter((g) => /amministrazione/.test(g)).slice(0, 5).join(' · ')) && verde;

if (SELFTEST) {
  if (!verde) { console.log('\nAutoprova: una porta nuova senza guardiano fa diventare rosso il cancello. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non si accorge di una porta aperta.\n');
  process.exit(1);
}
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
