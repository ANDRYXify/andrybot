// Configurazione di SocialBot: legge le variabili d'ambiente (.env)
// e le espone con valori di default sensati. Il bot parte anche a
// configurazione incompleta ("modalità setup"): la dashboard guida
// l'amministratore a completare ciò che manca.
//
// Filosofia "zero segreti condivisi": l'accesso alla dashboard usa
// chiavi monouso generate dal sito al momento del passaggio (vedi
// web/gate.js) e il segreto dei cookie si auto-genera al primo
// avvio. Nel .env restano solo le credenziali dell'app Twitch.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';

// mini-parser .env (niente dipendenze): KEY=valore, # commenti
function loadDotEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv();

const env = (k, def = '') => (process.env[k] ?? def).trim();

const dataDir = resolve(process.cwd(), env('DATA_DIR', './data'));
mkdirSync(dataDir, { recursive: true });

// Segreto di sessione: da .env se impostato, altrimenti generato al
// primo avvio e conservato in data/ (sopravvive ai riavvii, mai su git).
function sessionSecret() {
  const fromEnv = env('SESSION_SECRET');
  if (fromEnv) return fromEnv;
  const file = join(dataDir, '.session-secret');
  try {
    if (existsSync(file)) return readFileSync(file, 'utf8').trim();
    const s = randomBytes(32).toString('hex');
    writeFileSync(file, s, { mode: 0o600 });
    return s;
  } catch {
    // filesystem in sola lettura? segreto effimero (le sessioni non
    // sopravvivono al riavvio, ma il bot funziona comunque)
    return randomBytes(32).toString('hex');
  }
}

export const config = {
  // web
  port: parseInt(env('PORT', '8090'), 10),
  baseUrl: env('BASE_URL', 'http://localhost:8090').replace(/\/$/, ''),
  sessionSecret: sessionSecret(),

  // twitch
  twitchClientId: env('TWITCH_CLIENT_ID'),
  twitchClientSecret: env('TWITCH_CLIENT_SECRET'),
  adminLogins: env('ADMIN_LOGINS', 'andryxify')
    .toLowerCase().split(',').map(s => s.trim()).filter(Boolean),

  // sito "madre": pre-addestramento, verifica streamer abilitati e
  // conferma delle chiavi d'accesso monouso
  siteUrl: env('SITE_URL', 'https://andryxify.it').replace(/\/$/, ''),

  // dati
  dataDir,

  // ascolto live lato server: quanti canali possiamo ascoltare in AUDIO
  // contemporaneamente (cap globale, il server è piccolo). 0 = disattivato.
  maxListeners: Math.max(0, parseInt(env('MAX_LISTENERS', '2'), 10)),
};

// Scope OAuth richiesti.
// - login dashboard: nessuno scope (solo identità)
// - streamer: permessi concessi quando abilita il bot. Il bot scrive
//   in chat CON L'ACCOUNT DELLO STREAMER (chat:read/chat:edit), quindi
//   non serve nessun account bot separato.
export const SCOPES = {
  broadcaster: [
    'chat:read',                  // leggere la chat del proprio canale
    'chat:edit',                  // scrivere in chat (come lo streamer)
    'clips:edit',                 // creare clip
    'channel:read:subscriptions', // eventi sub
    'moderator:read:followers',   // eventi follow
    'channel:read:redemptions',   // riscatti punti canale
  ],
};

// Ritorna l'elenco delle voci di configurazione critiche mancanti
// (usato dalla dashboard per la "modalità setup").
export function missingConfig() {
  const missing = [];
  if (!config.twitchClientId) missing.push('TWITCH_CLIENT_ID');
  if (!config.twitchClientSecret) missing.push('TWITCH_CLIENT_SECRET');
  return missing;
}
