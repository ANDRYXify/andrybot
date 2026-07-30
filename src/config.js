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
  // Studio Web: server di ingest RTMP di Twitch (senza la stream key finale).
  twitchRtmp: env('TWITCH_RTMP', 'rtmp://live.twitch.tv/app').replace(/\/$/, ''),
  adminLogins: env('ADMIN_LOGINS', 'andryxify')
    .toLowerCase().split(',').map(s => s.trim()).filter(Boolean),

  // sito "madre": pre-addestramento, verifica streamer abilitati e
  // conferma delle chiavi d'accesso monouso
  siteUrl: env('SITE_URL', 'https://andryxify.it').replace(/\/$/, ''),

  // Dominio PUBBLICO dei link profilo/hub mostrati agli utenti (in chat, promo,
  // moduli). È SEPARATO da siteUrl (che serve a LEGGERE i dati del profilo per il
  // pre-addestramento): così i link che vedono gli spettatori usano il dominio
  // ufficiale (socialbot.live) e non il vecchio brand. socialbot.live/u/<login>
  // reindirizza alla link-page reale sul sito madre.
  hubUrl: env('HUB_URL', 'https://socialbot.live').replace(/\/$/, ''),

  // dati
  dataDir,

  // ascolto live lato server: quanti canali possiamo ascoltare in AUDIO
  // contemporaneamente (cap globale, il server è piccolo). 0 = disattivato.
  maxListeners: Math.max(0, parseInt(env('MAX_LISTENERS', '2'), 10)),

  // Abbonamenti self-service (Stripe / Link) — TUTTO OPZIONALE. Se le chiavi non
  // ci sono, gli abbonamenti restano "spenti": la struttura (tier, DB, endpoint,
  // UI) è pronta ma non si accettano pagamenti. Si accende mettendo le chiavi.
  stripe: (() => {
    const secretKey = env('STRIPE_SECRET_KEY');            // sk_test_... / sk_live_...
    const webhookSecret = env('STRIPE_WEBHOOK_SECRET');    // whsec_...
    return {
      secretKey,
      webhookSecret,
      // price-id (dal cruscotto Stripe). Vuoto = non acquistabile.
      //  · base        → il canone del piano Base
      //  · addon_*     → i pacchetti add-on à la carte (componibili sopra la Base)
      //  · pro         → LEGACY: vecchio tier "tutto incluso" (compat con abbonati storici)
      prezzi: {
        base: env('STRIPE_PRICE_BASE'),
        addon_giochi: env('STRIPE_PRICE_ADDON_GIOCHI'),
        addon_effetti: env('STRIPE_PRICE_ADDON_EFFETTI'),
        addon_notifiche: env('STRIPE_PRICE_ADDON_NOTIFICHE'),
        addon_clip: env('STRIPE_PRICE_ADDON_CLIP'),
        addon_voce: env('STRIPE_PRICE_ADDON_VOCE'),
        addon_squadra: env('STRIPE_PRICE_ADDON_SQUADRA'),
        addon_musica: env('STRIPE_PRICE_ADDON_MUSICA'),
        pro: env('STRIPE_PRICE_PRO'),
        // BUNDLE curati: un price-id Stripe DEDICATO per bundle (prezzo fisso
        //  scontato). Crea in Stripe un prezzo ricorrente per ciascuno:
        //  Creator €5,99 · Interazione €6,99 · Tutto €13,99 (esclusa la Base).
        bundle_creator: env('STRIPE_PRICE_BUNDLE_CREATOR'),
        bundle_interazione: env('STRIPE_PRICE_BUNDLE_INTERAZIONE'),
        bundle_tutto: env('STRIPE_PRICE_BUNDLE_TUTTO'),
      },
      // gli abbonamenti sono operativi solo con chiave segreta + segreto webhook
      attivo: !!(secretKey && webhookSecret),
    };
  })(),

  // Spotify (richieste musicali) — OPZIONALE. Serve un'app su
  // developer.spotify.com con Client ID/Secret e il redirect
  // https://socialbot.live/spotify/callback tra i "Redirect URIs". Senza
  // credenziali il connettore resta spento (nessun bottone "Connetti Spotify").
  spotify: (() => {
    const clientId = env('SPOTIFY_CLIENT_ID');
    const clientSecret = env('SPOTIFY_CLIENT_SECRET');
    return {
      clientId,
      clientSecret,
      // redirect esplicito o, se assente, dedotto dal BASE_URL
      redirectUri: env('SPOTIFY_REDIRECT_URI') || (env('BASE_URL', 'http://localhost:8090').replace(/\/$/, '') + '/spotify/callback'),
      attivo: !!(clientId && clientSecret),
    };
  })(),

  // TikTok (avviso "nuovo post") — OPZIONALE, via API ufficiale Display API.
  // Serve UN'app su developers.tiktok.com (una sola, dell'operatore) con Client
  // Key/Secret, gli scope user.info.basic + video.list e il redirect
  // https://socialbot.live/tiktok/callback tra i "Redirect URI". Ogni streamer
  // collega poi il PROPRIO account TikTok (OAuth). Senza credenziali il connettore
  // resta spento (nessun bottone "Collega TikTok").
  tiktok: (() => {
    const clientKey = env('TIKTOK_CLIENT_KEY');
    const clientSecret = env('TIKTOK_CLIENT_SECRET');
    return {
      clientKey,
      clientSecret,
      redirectUri: env('TIKTOK_REDIRECT_URI') || (env('BASE_URL', 'http://localhost:8090').replace(/\/$/, '') + '/tiktok/callback'),
      attivo: !!(clientKey && clientSecret),
    };
  })(),

  // Telegram Mini App + "Accedi con Telegram" (OIDC) — OPZIONALE. Un UNICO bot
  // operatore (creato con @BotFather) ospita la Mini App e fa da provider di
  // login. L'initData della Mini App si valida con il BOT TOKEN; l'accesso OIDC
  // dal browser usa Client ID (= id numerico del bot) e Client Secret (da
  // @BotFather → Bot Settings → Web Login → OpenID Connect), con Redirect URI
  // https://socialbot.live/telegram/oidc/callback tra quelli consentiti. Senza
  // il bot token la Mini App resta spenta; senza Client ID/Secret resta spento
  // solo l'accesso OIDC (la Mini App con initData funziona comunque).
  telegramApp: (() => {
    const botToken = env('TG_APP_BOT_TOKEN');
    const clientId = env('TG_CLIENT_ID');
    const clientSecret = env('TG_CLIENT_SECRET');
    const base = env('BASE_URL', 'http://localhost:8090').replace(/\/$/, '');
    return {
      botToken,
      botUsername: env('TG_APP_BOT_USERNAME').replace(/^@/, ''),   // solo per il link t.me/<bot>
      clientId,
      clientSecret,
      redirectUri: env('TG_REDIRECT_URI') || (base + '/telegram/oidc/callback'),
      attivo: !!botToken,
      oidcAttivo: !!(clientId && clientSecret),
    };
  })(),

  // Promo "settimana gratis": al primo accesso, con una certa probabilità, un
  // account che non ha MAI avuto il bot riceve alcuni giorni di accesso Pro (un
  // trial, non "community"). Si revoca da sé alla scadenza.
  //
  // SPENTA per default (0). Aveva senso quando chi si registrava NON aveva
  // accesso: era un'esca per far provare il bot. Ora esiste il pacchetto
  // ESSENZIALE gratuito, quindi un nuovo iscritto ha già un bot che funziona;
  // regalargli il Pro significherebbe fargli provare tutto per poi TOGLIERGLIELO
  // dopo una settimana — un declassamento che si nota, oltre al costo di server.
  // Accendila solo come leva di marketing consapevole: PROMO_PROBABILITA=0.2.
  promo: {
    probabilita: Math.min(1, Math.max(0, Number(env('PROMO_PROBABILITA', '0')) || 0)),
    giorni: Math.max(1, parseInt(env('PROMO_GIORNI', '7'), 10) || 7),
  },
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
    'channel:read:redemptions',   // riscatti punti canale (eventi)
    'channel:manage:redemptions', // creare/gestire i premi a punti canale (alert)
    'channel:manage:vips',        // assegnare/togliere i VIP (comando vocale, premi)
    'channel:manage:broadcast',   // cambiare categoria/titolo del canale (comando vocale)
    'channel:manage:polls',       // creare/chiudere sondaggi
    'channel:manage:predictions', // creare/risolvere predizioni
    'moderator:manage:chat_messages', // eliminare messaggi (antispam)
    'moderator:manage:banned_users',  // timeout ai recidivi (antispam)
    'channel:manage:raids',       // Regia: avviare/annullare una raid
    'channel:edit:commercial',    // Regia: lanciare una pubblicità (ad-break)
    'channel:read:ads',           // Regia: leggere la programmazione delle pubblicità
    'channel:read:stream_key',    // Studio Web: leggere la stream key (per andare live dal browser)
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
