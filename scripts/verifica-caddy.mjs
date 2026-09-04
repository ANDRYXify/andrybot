// Cancello dell'INGRESSO: la configurazione di Caddy deve essere VALIDA.
//
// Perche' esiste. Il Caddyfile non e' un file di contorno: e' l'unica cosa in
// ascolto sulla 443. Se non si adatta, Caddy non si avvia, e se Caddy non si
// avvia il sito non e' "un po' rotto": non risponde affatto, ERR_FAILED su
// tutto, comprese le pagine che con la modifica non c'entravano niente. Il
// difetto non ha nessun sintomo intermedio — passa da "tutto bene" a "niente".
//
// E non e' un errore che si vede leggendo. `handle_errors` dentro un `handle`
// e' scritto in modo perfettamente sensato e si legge benissimo; semplicemente
// il parser non lo ammette li'. L'unico che puo' dire la verita' su un
// Caddyfile e' Caddy.
//
// Come funziona. Se qui c'e' un binario di Caddy, si valida per davvero, e la
// risposta e' la sua. Se non c'e' (il caso normale in CI e in molte macchine),
// allora il file deve essere IDENTICO a quello che qualcuno ha gia' validato
// con Caddy vero: l'impronta di quel file sta in `Caddyfile.validato`. Cosi'
// non si puo' cambiare il Caddyfile senza che qualcuno l'abbia provato — non
// c'e' la scorciatoia "salto la verifica perche' qui non ho lo strumento".
//
// Il binario si trova cosi': $CADDY_BIN, oppure `caddy` nel PATH.
//
// Per registrare una nuova versione validata:
//   CADDY_BIN=/percorso/caddy node scripts/verifica-caddy.mjs --registra
//
// Uso: node scripts/verifica-caddy.mjs   (esce 1 se qualcosa non torna)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONF = join(RAD, 'Caddyfile');
const TIMBRO = join(RAD, 'Caddyfile.validato');
const REGISTRA = process.argv.includes('--registra');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const testo = readFileSync(CONF, 'utf8');
const impronta = createHash('sha256').update(testo).digest('hex');

// --- 1. il file si adatta? ---------------------------------------------
// La domanda ha una sola risposta vera, e la da' Caddy.
function trovaCaddy() {
  if (process.env.CADDY_BIN && existsSync(process.env.CADDY_BIN)) return process.env.CADDY_BIN;
  try {
    return execFileSync('sh', ['-c', 'command -v caddy'], { encoding: 'utf8' }).trim() || null;
  } catch { return null; }
}

const bin = trovaCaddy();
let versione = null;

if (bin) {
  versione = execFileSync(bin, ['version'], { encoding: 'utf8' }).trim().split(/\s+/)[0];
  let uscita = '';
  let ok = true;
  try {
    execFileSync(bin, ['validate', '--config', CONF, '--adapter', 'caddyfile'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // le variabili d'ambiente entrano nel file: senza, l'adattamento
      // fallirebbe per un motivo che non e' il nostro
      env: { ...process.env, EDGE_KEY: process.env.EDGE_KEY || 'x' },
    });
  } catch (e) {
    ok = false;
    uscita = String(e.stderr || e.stdout || e.message).split('\n').filter((r) => /Error|error/.test(r)).join(' | ');
  }
  dice(ok, `Caddy ${versione} adatta il file`, uscita);
  if (ok && REGISTRA) {
    writeFileSync(TIMBRO, `${impronta}  caddy ${versione}\n`);
    console.log(`  · registrata l'impronta validata in Caddyfile.validato`);
  }
} else if (REGISTRA) {
  dice(false, 'per registrare serve Caddy', 'CADDY_BIN=/percorso/caddy node scripts/verifica-caddy.mjs --registra');
} else {
  // Nessun Caddy qui: allora il file dev'essere quello gia' provato.
  const timbro = existsSync(TIMBRO) ? readFileSync(TIMBRO, 'utf8').trim() : '';
  const uguale = timbro.startsWith(impronta);
  dice(uguale,
    uguale
      ? `il file e' quello gia' validato (${timbro.split(/\s+/).slice(1).join(' ')})`
      : 'il Caddyfile e\' cambiato e qui non c\'e\' Caddy per provarlo',
    'scarica caddy (github.com/caddyserver/caddy/releases) e fai: '
    + 'CADDY_BIN=./caddy node scripts/verifica-caddy.mjs --registra');
}

// --- 2. la pagina di manutenzione: tre punti, un fatto solo ------------
// Il Caddyfile dice DOVE la cerca (root) e QUALE file (rewrite); il compose
// dice quale cartella nostra finisce in quel posto. Sono tre scritture dello
// stesso fatto, e basta che una scivoli perche' la pagina che deve comparire
// proprio quando tutto il resto e' giu' sia un 404. Qui non si riscrive il
// fatto: si legge dai tre file e si guarda se combaciano.
{
  const radice = (testo.match(/^\s*root \* (\/\S+)\s*$/m) || [])[1];
  const pagina = (testo.match(/^\s*rewrite \* (\/\S+)\s*$/m) || [])[1];
  dice(!!radice && !!pagina, 'il Caddyfile dice dove sta la pagina di servizio',
    `root=${radice || '?'} rewrite=${pagina || '?'}`);

  if (radice && pagina) {
    const compose = readFileSync(join(RAD, 'docker-compose.yml'), 'utf8');
    const monte = new RegExp(`^\\s*-\\s*\\./([^:\\s]+):${radice}(?::\\w+)?\\s*$`, 'm').exec(compose);
    dice(!!monte, `qualcosa di nostro e' montato su ${radice}`,
      'nel docker-compose il volume non c\'e\', quindi la cartella sarebbe vuota');
    if (monte) {
      const via = join(RAD, monte[1], pagina.replace(/^\//, ''));
      dice(existsSync(via), `e dentro c'e' ${monte[1]}${pagina}`, `manca ${via}`);
    }
  }
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
// Le due meta' non pesano uguale, e dirlo uguale sarebbe falso: la prima riga
// e' il file che si adatta (se e' rossa, Caddy non parte e non c'e' il sito);
// le altre sono la pagina di servizio (se sono rosse, il sito c'e' ma quella
// pagina non comparirebbe proprio nel momento in cui serve).
const conta = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
if (rossi.length) {
  const quanto = esiti[0].ok
    ? 'il sito regge, ma la pagina di servizio non comparirebbe quando serve'
    : "cosi' Caddy non parte, e senza Caddy non c'e' il sito";
  console.log(`\n${conta(rossi.length, 'cosa non torna', 'cose non tornano')}: ${quanto}.`);
} else {
  console.log("\nL'ingresso e' valido e la pagina di servizio e' al suo posto. ✓");
}
process.exit(rossi.length ? 1 : 0);
