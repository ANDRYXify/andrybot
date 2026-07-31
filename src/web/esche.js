// ── Esche, melassa e canarini ────────────────────────────────────────────────
//
// Difesa del NOSTRO servizio, e solo difesa: qui non si attacca nessuno, non si
// risponde con niente di dannoso, non si prova a identificare chi c'è dietro.
// Si fa una cosa sola: far perdere tempo a chi cerca porte che qui non esistono,
// e accorgersene subito.
//
// COME FUNZIONA, in tre pezzi.
//
// 1. LE ESCHE. Un elenco di indirizzi che una persona vera non digiterà mai e
//    che nessun collegamento sulla pagina porta: /wp-login.php, /.env,
//    /phpmyadmin, /.git/config… Sono i primi che prova qualunque scanner
//    automatico. Chi li chiede non si è perso: sta bussando a tutte le porte.
//    Non stanno nel robots.txt di proposito: un motore di ricerca non deve
//    finirci dentro.
//
// 2. LA MELASSA. All'esca non si risponde "non esiste": si risponde LENTAMENTE
//    (e ogni tentativo successivo più lentamente del precedente) e con una
//    pagina che sembra vera — una finta schermata di accesso WordPress, un
//    finto file di configurazione. Uno scanner automatico lavora a migliaia di
//    bersagli l'ora: un sito che risponde in otto secondi e gli dà risultati
//    inutili è il modo più economico per farsi cancellare dalla sua lista. È lo
//    stivale al posto del pesce.
//
// 3. I CANARINI. Nel finto file di configurazione ci sono credenziali finte,
//    con dentro una parola d'ordine che nel nostro codice non esiste da nessuna
//    altra parte. Se un giorno arriva una richiesta che contiene quella parola,
//    vuol dire che qualcuno ha letto l'esca e la sta provando: lo scriviamo nel
//    registro col massimo rilievo. È un allarme che non può suonare per sbaglio.
//
// Cosa NON fa, di proposito: non blocca in eterno (le liste nere permanenti
// colpiscono gli indirizzi condivisi e gli innocenti che ci finiscono dietro),
// non salva nulla su disco, non tiene traccia delle persone. Solo un contatore
// in memoria che si svuota da solo.

import { makeLog } from '../logger.js';

const log = makeLog('esche');

// Il canarino: una stringa che esiste SOLO dentro le finte credenziali. Se
// torna indietro in una richiesta, qualcuno ha abboccato.
const CANARINO = 'sb_ck_9f2ad41c7e0b4d16';

// Indirizzi che qui non esistono e che nessun collegamento porta: chi li chiede
// sta provando le porte a caso. Elenco tenuto corto e ovvio di proposito — sono
// i bersagli veri degli scanner, non un catalogo per fare scena.
const ESCHE = [
  '/wp-login.php', '/wp-admin', '/wp-admin/', '/wordpress', '/wp-content', '/xmlrpc.php',
  '/.env', '/.env.local', '/.env.production', '/config.json', '/configuration.php',
  '/.git/config', '/.git/HEAD', '/.svn/entries', '/.DS_Store',
  '/phpmyadmin', '/pma', '/myadmin', '/adminer.php', '/dbadmin',
  '/admin.php', '/administrator', '/admin/login', '/cpanel', '/webmail',
  '/.aws/credentials', '/.ssh/id_rsa', '/id_rsa', '/backup.zip', '/backup.sql', '/dump.sql',
  '/actuator/env', '/actuator/health', '/solr/admin/info/system',
  '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
  '/cgi-bin/luci', '/shell', '/telescope/requests', '/server-status',
  '/api/v1/keys', '/api/keys', '/api/admin', '/api/token', '/api/secrets',
];
// Anche per prefisso: /wp-content/plugins/qualcosa, /.git/refs/…
const PREFISSI = ['/wp-', '/.git/', '/.svn/', '/.aws/', '/.ssh/', '/phpmyadmin/', '/vendor/', '/cgi-bin/'];

const eEsca = (percorso) => {
  const p = percorso.toLowerCase();
  return ESCHE.includes(p) || PREFISSI.some((x) => p.startsWith(x));
};

// Contatore in memoria: indirizzo → { n, ultimo }. Si pota da solo, e ha un
// tetto: un flusso di indirizzi diversi non deve poter far crescere la memoria.
const visti = new Map();
const TETTO = 5000;
const ORE = 3600000;

function chi(req) {
  const avanti = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return avanti || req.ip || req.socket?.remoteAddress || '?';
}

function segna(ip) {
  const ora = Date.now();
  const v = visti.get(ip) || { n: 0, ultimo: ora };
  if (ora - v.ultimo > 6 * ORE) v.n = 0;      // ha smesso da un pezzo: si riparte
  v.n += 1; v.ultimo = ora;
  visti.set(ip, v);
  if (visti.size > TETTO) {
    // pota i più vecchi: la memoria non cresce all'infinito
    const ordinati = [...visti.entries()].sort((a, b) => a[1].ultimo - b[1].ultimo);
    for (let i = 0; i < ordinati.length - TETTO + 500; i++) visti.delete(ordinati[i][0]);
  }
  return v.n;
}

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

// Quanto si fa aspettare: cresce col numero di tentativi, ma si ferma a 8
// secondi. Più a lungo non serve — occupa una connessione nostra per niente.
const melassa = (n) => Math.min(8000, 900 + n * 700);

// ── Le finte risposte ───────────────────────────────────────────────────────
// Devono sembrare vere abbastanza da far continuare lo scanner (e quindi
// perdere altro tempo), e non contenere NIENTE di vero.
const FINTO_ENV = `APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:${CANARINO}==
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=app_prod
DB_USERNAME=app_ro
DB_PASSWORD=${CANARINO}
MAIL_HOST=smtp.internal
SESSION_DRIVER=file
`;

const FINTO_WP = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Log In &lsaquo; Blog &#8212; WordPress</title></head>
<body class="login js login-action-login wp-core-ui">
<div id="login"><h1><a href="#">Powered by WordPress</a></h1>
<form name="loginform" id="loginform" action="/wp-login.php" method="post">
<p><label for="user_login">Username or Email Address</label>
<input type="text" name="log" id="user_login" class="input" value="" size="20"></p>
<p><label for="user_pass">Password</label>
<input type="password" name="pwd" id="user_pass" class="input" value="" size="20"></p>
<p class="submit"><input type="submit" name="wp-submit" id="wp-submit" class="button button-primary" value="Log In"></p>
</form></div></body></html>`;

function finta(percorso) {
  const p = percorso.toLowerCase();
  // l'ordine conta: "/.git/config" contiene sia ".git" sia "config"
  if (p.includes('.git')) return { tipo: 'text/plain', corpo: '[core]\n\trepositoryformatversion = 0\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:app/app.git\n' };
  if (p.includes('.env') || p.includes('config')) return { tipo: 'text/plain', corpo: FINTO_ENV };
  if (p.includes('wp-') || p.includes('wordpress')) return { tipo: 'text/html', corpo: FINTO_WP };
  if (p.startsWith('/api/')) return { tipo: 'application/json', corpo: JSON.stringify({ ok: false, error: 'invalid_token', hint: 'use X-Api-Key' }) };
  return { tipo: 'text/html', corpo: '<!DOCTYPE html><title>401 Unauthorized</title><h1>401 Unauthorized</h1>' };
}

// ── Il pezzo che si monta ───────────────────────────────────────────────────
// Va montato PRIMA di tutto il resto, così le esche vengono prima di ogni altra
// regola, ma dopo il parser del corpo (serve per il canarino).
export function montaEsche(app) {
  app.use(async (req, res, next) => {
    // 1. il canarino: qualcuno sta usando le credenziali finte?
    try {
      const dove = JSON.stringify(req.body || {}).slice(0, 4000) + req.url.slice(0, 1000)
        + String(req.headers.authorization || '').slice(0, 300);
      if (dove.includes(CANARINO)) {
        log.error(`CANARINO: qualcuno sta usando le credenziali finte delle esche — ${chi(req)} su ${req.method} ${req.path}`);
        const n = segna(chi(req)) + 5;      // chi arriva fin qui non è passato di lì per caso
        await attesa(melassa(n));
        return res.status(401).type('application/json').send('{"ok":false,"error":"invalid_token"}');
      }
    } catch { /* corpo illeggibile: pazienza, si tira dritto */ }

    if (!eEsca(req.path)) return next();

    // 2. è un'esca: si segna, si aspetta, si risponde con lo stivale
    const ip = chi(req);
    const n = segna(ip);
    if (n === 1 || n % 25 === 0) log.warn(`esca: ${ip} ha provato ${req.method} ${req.path} (tentativo n. ${n})`);
    await attesa(melassa(n));
    const f = finta(req.path);
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).type(f.tipo).send(f.corpo);
  });
}

// Per la scheda admin: quanti stanno bussando, senza dire chi.
export function riepilogoEsche() {
  const ora = Date.now();
  let attivi = 0, tentativi = 0;
  for (const v of visti.values()) { if (ora - v.ultimo < 6 * ORE) { attivi++; tentativi += v.n; } }
  return { indirizziAttivi: attivi, tentativi, inMemoria: visti.size };
}
