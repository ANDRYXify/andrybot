// ── Esche, melassa, canarini e argine ai flood ──────────────────────────────
//
// Difesa del NOSTRO servizio, e SOLO difesa. Qui:
//   • non si attacca nessuno,
//   • non si rimanda traffico indietro a chi ci colpisce,
//   • non si prova a capire chi c'è dietro.
// Un "contrattacco" (reverse-DDoS) sarebbe inutile e dannoso: un DDoS arriva da
// indirizzi falsificati e da computer altrui infettati, quindi rispedire
// traffico indietro colpisce vittime innocenti e raddoppia la banda in uscita
// DAL nostro server, peggiorando proprio il disservizio che si vuole evitare.
// La strategia giusta è l'opposto: rendere ogni richiesta ostile la più
// ECONOMICA possibile da buttare via, così un flood rimbalza per niente.
//
// QUATTRO PEZZI.
//
// 1. LE ESCHE. Un elenco lungo di indirizzi che una persona vera non digiterà
//    mai e che nessun collegamento porta: /wp-login.php, /.env, /phpmyadmin,
//    /.git/config, /.aws/credentials, pannelli, webshell, backup… Sono i primi
//    che prova qualunque scanner. Chi li chiede non si è perso.
//
// 2. LA MELASSA. All'esca non si risponde "non esiste": si risponde LENTAMENTE
//    e con una pagina che sembra vera. Uno scanner lavora a migliaia di
//    bersagli l'ora: un sito che ci mette secondi e gli dà risultati inutili è
//    il modo più economico per farsi cancellare dalla sua lista. È lo stivale
//    al posto del pesce.
//
// 3. I CANARINI. Nelle finte credenziali c'è una stringa che nel nostro codice
//    non esiste da nessun'altra parte. Se torna indietro in una richiesta,
//    qualcuno ha letto l'esca e la sta provando: allarme nel registro.
//
// 4. L'ARGINE. La melassa da sola, sotto un flood, sarebbe un autogol: tenere
//    migliaia di connessioni aperte consuma le NOSTRE risorse. Quindi:
//      • gli utenti veri hanno la precedenza. Quando il sito è sotto carico
//        vero, le esche NON vengono più trattenute: si risponde loro al volo,
//        così le risorse restano a chi usa davvero il bot;
//      • c'è un tetto alle connessioni tenute in melassa insieme: oltre quello,
//        stessa cosa, risposta immediata;
//      • un indirizzo che martella le esche viene messo in castigo per qualche
//        minuto: da lì in poi riceve un rifiuto secco e a costo quasi zero (è
//        il "blocco" del flood, fatto in modo che non costi niente a noi).
//    Il castigo è breve e in memoria: le liste nere eterne colpiscono gli
//    indirizzi condivisi e chi ci finisce dietro senza colpa.
//
// Niente di tutto questo tocca il traffico legittimo, e niente viene scritto su
// disco: solo contatori in memoria, con un tetto e una potatura automatica.

import { existsSync, statSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLog } from '../logger.js';

const log = makeLog('esche');

// Il canarino: esiste SOLO dentro le finte credenziali. Se torna, hanno abboccato.
const CANARINO = 'sb_ck_9f2ad41c7e0b4d16';

// Indirizzi-esca. Lista lunga di proposito: sono i bersagli veri degli scanner.
const ESCHE = new Set([
  // WordPress
  '/wp-login.php', '/wp-admin', '/wp-admin/', '/wordpress', '/wp', '/wp-content', '/xmlrpc.php',
  '/wp-config.php', '/wp-config.php.bak', '/wp-config.php.old', '/wp-config.php.save', '/wp-config.php~',
  '/wp-content/debug.log', '/wp-json/wp/v2/users', '/wlwmanifest.xml', '/wp-includes/',
  '/wp-content/uploads/', '/wp-content/plugins/', '/wp-content/themes/',
  // file di ambiente e configurazione
  '/.env', '/.env.local', '/.env.production', '/.env.dev', '/.env.bak', '/.env.save', '/.env.old',
  '/config.json', '/config.php', '/configuration.php', '/config/database.yml', '/config.yml',
  '/application.properties', '/appsettings.json', '/web.config', '/.htaccess', '/.htpasswd',
  '/settings.py', '/local.settings.json', '/parameters.yml', '/secrets.json', '/credentials.json',
  // controllo versione
  '/.git/config', '/.git/HEAD', '/.git/logs/HEAD', '/.git/index', '/.gitignore',
  '/.svn/entries', '/.svn/wc.db', '/.hg/store', '/.bzr/', '/.DS_Store', '/CVS/Root',
  // credenziali cloud e chiavi
  '/.aws/credentials', '/.aws/config', '/.ssh/id_rsa', '/.ssh/authorized_keys', '/id_rsa', '/id_dsa',
  '/.docker/config.json', '/.kube/config', '/.npmrc', '/.pypirc', '/.netrc',
  // pannelli di amministrazione e DB
  '/phpmyadmin', '/phpMyAdmin', '/pma', '/myadmin', '/mysql', '/sqladmin', '/pgadmin', '/dbadmin',
  '/adminer.php', '/adminer', '/admin.php', '/administrator', '/admin/login', '/admin/', '/admin',
  '/cpanel', '/webmail', '/plesk', '/whm', '/manager/html', '/host-manager/html',
  '/jenkins', '/jenkins/login', '/grafana/login', '/kibana', '/_cat/indices',
  // webshell e caricamenti
  '/shell', '/shell.php', '/cmd.php', '/c99.php', '/r57.php', '/alfa.php', '/wso.php',
  '/up.php', '/upload.php', '/uploads.php', '/file.php', '/eval.php', '/gel4y.php',
  // spie di PHP
  '/info.php', '/phpinfo.php', '/php.php', '/test.php', '/i.php', '/pi.php', '/1.php',
  // backup
  '/backup.zip', '/backup.tar.gz', '/backup.sql', '/backup.sql.gz', '/dump.sql', '/db.sql',
  '/database.sql', '/www.zip', '/site.zip', '/web.zip', '/public_html.zip', '/htdocs.zip',
  // framework e strumenti
  '/actuator/env', '/actuator/health', '/actuator/heapdump', '/actuator/gateway/routes',
  '/solr/admin/info/system', '/struts2-showcase/', '/_ignition/execute-solution',
  '/telescope/requests', '/_profiler/phpinfo', '/server-status', '/server-info', '/.well-known/traffic-advice',
  '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php', '/vendor/composer/installed.json',
  // apparati di rete e vpn (bersagli classici delle botnet)
  '/boaform/admin/formLogin', '/HNAP1', '/setup.cgi', '/cgi-bin/luci', '/cgi-bin/', '/goform/set_LimitClient_cfg',
  '/remote/login', '/remote/fgt_lang', '/+CSCOE+/logon.html', '/dana-na/auth/url_default/welcome.cgi',
  '/owa/auth/logon.aspx', '/autodiscover/autodiscover.xml', '/ecp/Current/exporttool/',
  // api "a naso"
  '/api/v1/keys', '/api/keys', '/api/admin', '/api/token', '/api/tokens', '/api/secrets',
  '/api/config', '/api/.env', '/api/swagger.json', '/api/v2/keys', '/actuator', '/debug/pprof/',
]);
// Anche per prefisso: /wp-content/plugins/qualcosa, /.git/refs/…
const PREFISSI = ['/wp-', '/wordpress/', '/.git/', '/.svn/', '/.hg/', '/.aws/', '/.ssh/', '/.docker/',
  '/.kube/', '/phpmyadmin/', '/phpmyadmin', '/vendor/', '/cgi-bin/', '/actuator/', '/administrator/',
  '/wp-content/', '/wp-includes/', '/wp-admin/', '/goform/', '/boaform/', '/solr/'];

// ROBA NOSTRA: un indirizzo che corrisponde a un file che pubblichiamo davvero
// NON e mai un attacco, e la trappola non deve nemmeno guardarlo.
//
// Serve perche i prefissi qui sopra sono per forza larghi: `/vendor/` c'e
// perche `/vendor/phpunit/...` e fra gli indirizzi piu scansionati al mondo. Ma
// sotto `/vendor/` ci stanno anche le NOSTRE librerie e i NOSTRI caratteri
// (human.js, i modelli, pixi, il QR, i .woff2). Risultato: la difesa serviva la
// pagina-esca al posto di human.js, e dopo dodici file l'utente finiva in
// castigo con 429 su tutto il resto. Il tracking non poteva funzionare.
//
// La regola giusta non e togliere `/vendor/` dalla lista — riaprirebbe la
// superficie vera — ma dire una volta sola che cio che serviamo non e un'esca.
// Cosi qualunque cosa si vendorizzi domani e al sicuro da se, e tutto cio che
// NON pubblichiamo resta in trappola. Nessuna scappatoia: per passare di qui un
// indirizzo deve corrispondere a un file che abbiamo messo noi.
const RADICE_PUB = join(dirname(fileURLToPath(import.meta.url)), 'public');
const nostri = new Map();
const MAX_NOSTRI = 4000;
function eNostro(percorso) {
  const cache = nostri.get(percorso);
  if (cache !== undefined) return cache;
  let ok = false;
  try {
    if (!percorso.includes('..') && !percorso.includes('\0')) {
      const f = normalize(join(RADICE_PUB, decodeURIComponent(percorso)));
      ok = f.startsWith(RADICE_PUB + '/') && existsSync(f) && statSync(f).isFile();
    }
  } catch { ok = false; }
  if (nostri.size >= MAX_NOSTRI) nostri.clear();
  nostri.set(percorso, ok);
  return ok;
}

const eEsca = (percorso) => {
  const p = percorso.toLowerCase();
  if (!ESCHE.has(p) && !PREFISSI.some((x) => p.startsWith(x))) return false;
  return !eNostro(percorso);
};

// ── Stato in memoria ─────────────────────────────────────────────────────────
const visti = new Map();          // ip → { n, ultimo, castigo }
const TETTO = 20000;
const ORE = 3600000;

// Quante connessioni sono tenute in melassa ADESSO. Oltre il tetto non si
// trattiene più: si risponde al volo, così un flood non esaurisce le nostre
// connessioni (sarebbe un autogol).
let inMelassa = 0;
const MAX_MELASSA = 80;

// Carico VERO: quante richieste legittime sono passate di recente. Decade da
// solo ogni secondo. Se è alto, gli utenti veri hanno la precedenza e le esche
// non vengono trattenute — le risorse restano a chi usa il bot.
let caricoVero = 0;
const CARICO_ALTO = 150;
const decadi = setInterval(() => { caricoVero = Math.floor(caricoVero * 0.5); }, 1000);
if (decadi.unref) decadi.unref();

// Un indirizzo che supera questa soglia di tentativi va in castigo: da lì in
// poi rifiuto secco a costo quasi zero, per qualche minuto.
const SOGLIA_CASTIGO = 12;
const CASTIGO = 8 * 60000;

function chi(req) {
  const avanti = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return avanti || req.ip || req.socket?.remoteAddress || '?';
}

function segna(ip) {
  const ora = Date.now();
  const v = visti.get(ip) || { n: 0, ultimo: ora, castigo: 0 };
  if (ora - v.ultimo > 6 * ORE) v.n = 0;      // ha smesso da un pezzo: si riparte
  v.n += 1; v.ultimo = ora;
  if (v.n >= SOGLIA_CASTIGO && !v.castigo) { v.castigo = ora + CASTIGO; log.warn(`castigo: ${ip} messo in castigo dopo ${v.n} tentativi sulle esche`); }
  visti.set(ip, v);
  if (visti.size > TETTO) {
    const ordinati = [...visti.entries()].sort((a, b) => a[1].ultimo - b[1].ultimo);
    for (let i = 0; i < ordinati.length - TETTO + 2000; i++) visti.delete(ordinati[i][0]);
  }
  return v;
}
const inCastigo = (v) => v.castigo && Date.now() < v.castigo;

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const melassa = (n) => Math.min(8000, 900 + n * 700);

// ── Finte risposte: sembrano vere, non contengono NIENTE di vero ─────────────
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
  if (p.includes('.git')) return { tipo: 'text/plain', corpo: '[core]\n\trepositoryformatversion = 0\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:app/app.git\n' };
  if (p.includes('.env') || p.includes('config') || p.includes('.properties') || p.includes('credentials')) return { tipo: 'text/plain', corpo: FINTO_ENV };
  if (p.includes('wp-') || p.includes('wordpress')) return { tipo: 'text/html', corpo: FINTO_WP };
  if (p.startsWith('/api/') || p.endsWith('.json')) return { tipo: 'application/json', corpo: JSON.stringify({ ok: false, error: 'invalid_token', hint: 'use X-Api-Key' }) };
  return { tipo: 'text/html', corpo: '<!DOCTYPE html><title>401 Unauthorized</title><h1>401 Unauthorized</h1>' };
}

// Rifiuto secco, a costo quasi zero: è quello che riceve chi è in castigo o chi
// arriva mentre il sito è sotto carico. Nessuna attesa, nessuna connessione
// tenuta aperta: un flood che finisce qui non ci costa niente.
function secco(res) {
  res.set('Connection', 'close');
  res.status(429).type('text/plain').send('Too Many Requests');
}

export function montaEsche(app) {
  app.use(async (req, res, next) => {
    // 1. il canarino, sempre e per primo
    try {
      const dove = JSON.stringify(req.body || {}).slice(0, 4000) + req.url.slice(0, 1000)
        + String(req.headers.authorization || '').slice(0, 300);
      if (dove.includes(CANARINO)) {
        log.error(`CANARINO: qualcuno sta usando le credenziali finte delle esche — ${chi(req)} su ${req.method} ${req.path}`);
        const v = segna(chi(req)); v.castigo = Date.now() + CASTIGO;
        return secco(res);
      }
    } catch { /* corpo illeggibile: si tira dritto */ }

    // 2. non è un'esca: è traffico normale. Conta come carico vero e passa.
    if (!eEsca(req.path)) { if (caricoVero < 100000) caricoVero++; return next(); }

    // 3. è un'esca.
    const ip = chi(req);
    const v = segna(ip);

    // già in castigo, o sotto carico vero, o troppe connessioni già in melassa:
    // rifiuto secco e via. Gli utenti veri vengono prima della beffa.
    if (inCastigo(v) || caricoVero >= CARICO_ALTO || inMelassa >= MAX_MELASSA) {
      if (v.n === 1 || v.n % 50 === 0) log.warn(`esca (rifiuto secco): ${ip} → ${req.method} ${req.path} (n. ${v.n}${inCastigo(v) ? ', in castigo' : caricoVero >= CARICO_ALTO ? ', sito occupato' : ', troppa melassa'})`);
      return secco(res);
    }

    // c'è margine: lo si tiene nella melassa e gli si serve lo stivale
    if (v.n === 1 || v.n % 25 === 0) log.warn(`esca: ${ip} → ${req.method} ${req.path} (tentativo n. ${v.n})`);
    inMelassa++;
    try { await attesa(melassa(v.n)); }
    finally { inMelassa--; }
    if (res.writableEnded) return;               // connessione già chiusa dal client
    const f = finta(req.path);
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).type(f.tipo).send(f.corpo);
  });
}

// Per la scheda admin: quanti stanno bussando, senza dire chi.
export function riepilogoEsche() {
  const ora = Date.now();
  let attivi = 0, tentativi = 0, castigati = 0;
  for (const v of visti.values()) {
    if (ora - v.ultimo < 6 * ORE) { attivi++; tentativi += v.n; }
    if (v.castigo && ora < v.castigo) castigati++;
  }
  return { indirizziAttivi: attivi, tentativi, castigati, inMelassaOra: inMelassa, caricoVero, inMemoria: visti.size };
}
