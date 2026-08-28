// Database di SocialBot (SQLite): qui vivono token, streamer abilitati,
// memoria del bot (messaggi, ricordi sugli utenti, lezioni imparate),
// comandi personalizzati e registro delle clip.
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { cifra, decifra, eCifrato } from './segreti.js';

mkdirSync(config.dataDir, { recursive: true });
export const db = new Database(join(config.dataDir, 'andrybot.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS tokens (
  kind TEXT NOT NULL,              -- 'bot' | 'broadcaster'
  login TEXT NOT NULL,             -- login twitch (minuscolo) del proprietario del token
  user_id TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL DEFAULT '',
  scopes TEXT NOT NULL DEFAULT '', -- separati da spazio
  expires_at INTEGER NOT NULL DEFAULT 0,  -- epoch ms (0 = sconosciuto)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (kind, login)
);

CREATE TABLE IF NOT EXISTS streamers (
  login TEXT PRIMARY KEY,          -- login twitch minuscolo
  display TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | disabled
  bot_enabled INTEGER NOT NULL DEFAULT 1,  -- lo streamer può spegnere il bot senza perdere l'abilitazione
  settings TEXT NOT NULL DEFAULT '{}',     -- JSON: personalità, soglie clip, ecc.
  avatar TEXT NOT NULL DEFAULT '',         -- foto profilo Twitch, la riempie il server da sé
  requested_at INTEGER NOT NULL,
  approved_at INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  user TEXT NOT NULL,
  display TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  from_bot INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_channel_ts ON messages(channel, ts);

CREATE TABLE IF NOT EXISTS user_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  user TEXT NOT NULL,
  note TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_memories ON user_memories(channel, user, ts);

CREATE TABLE IF NOT EXISTS lessons (            -- "lezioni" della riflessione periodica
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  text TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lessons ON lessons(channel, ts);

CREATE TABLE IF NOT EXISTS facts (              -- fatti stabili sul canale (chiave→valore)
  channel TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, key)
);

CREATE TABLE IF NOT EXISTS commands (           -- comandi personalizzati (!nome → risposta)
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  response TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, name)
);

CREATE TABLE IF NOT EXISTS contatori (         -- contatori a comando (morti, tentativi, parole…)
  channel TEXT NOT NULL,
  comando TEXT NOT NULL,                         -- trigger in chat (senza '!'): es. "morti"
  etichetta TEXT NOT NULL DEFAULT '',            -- nome mostrato: es. "Morti"
  emoji TEXT NOT NULL DEFAULT '',                -- emoji facoltativa nell'annuncio
  valore INTEGER NOT NULL DEFAULT 0,
  step INTEGER NOT NULL DEFAULT 1,               -- di quanto sale con +
  auto_parola TEXT NOT NULL DEFAULT '',          -- se valorizzata: +1 quando appare in chat
  reward_id TEXT NOT NULL DEFAULT '',            -- premio punti canale collegato (riscatto → +step)
  overlay TEXT NOT NULL DEFAULT '',              -- JSON: aspetto/posizione del widget a schermo
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, comando)
);

-- Visite alla pagina pubblica, contate per giorno. Nessun indirizzo IP, nessun
-- cookie, niente su chi c'era: solo QUANTE volte è stata aperta. È il dato che
-- serve davvero ("la mia pagina la guarda qualcuno?") ed è anche l'unico che si
-- può raccogliere senza chiedere il consenso a nessuno.
CREATE TABLE IF NOT EXISTS link_page_visite (
  channel TEXT NOT NULL,
  giorno TEXT NOT NULL,                      -- AAAA-MM-GG
  viste INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, giorno)
);

CREATE TABLE IF NOT EXISTS link_page (       -- la pagina pubblica /u/<login>
  channel TEXT PRIMARY KEY,
  headline TEXT NOT NULL DEFAULT '',           -- titolo in cima
  tagline TEXT NOT NULL DEFAULT '',            -- sottotitolo
  template TEXT NOT NULL DEFAULT 'minimal',    -- preset di partenza
  accent TEXT NOT NULL DEFAULT '',             -- (storico) colore principale
  bg TEXT NOT NULL DEFAULT '',                 -- (storico) colore di sfondo
  links TEXT NOT NULL DEFAULT '',              -- (storico) JSON: [{icona,label,url}]
  avatar TEXT NOT NULL DEFAULT '',             -- '' = quello di Twitch · 'no' = nessuno · URL
  tema TEXT NOT NULL DEFAULT '',               -- JSON: colori, sfondo, font, forme, animazioni
  blocchi TEXT NOT NULL DEFAULT '',            -- JSON: contenuti in ordine (link, titoli, testi, social, embed…)
  attiva INTEGER NOT NULL DEFAULT 1,           -- 0 = pagina spenta (404)
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  clip_id TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stream_context (     -- cosa "vede" il bot nella live
  channel TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge (          -- la conoscenza del bot per canale
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  domanda TEXT NOT NULL,                        -- domanda / parole chiave a cui risponde
  risposta TEXT NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'manuale',        -- 'manuale' | 'auto' (dal sito) | 'chat' (imparata)
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge ON knowledge(channel, fonte);

CREATE TABLE IF NOT EXISTS effects (        -- "Effetti & Suoni": comandi chat → media a schermo
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  comando TEXT NOT NULL,                     -- senza '!', minuscolo, univoco per canale
  tipo TEXT NOT NULL,                        -- 'audio' | 'immagine' | 'video'
  file TEXT NOT NULL,                        -- nome file relativo (es. '<id>.webm')
  tier TEXT NOT NULL DEFAULT 'tutti',        -- 'tutti' | 'sub' | 'vip' | 'mod'
  cooldown INTEGER NOT NULL DEFAULT 0,       -- secondi tra un uso e il successivo
  volume INTEGER NOT NULL DEFAULT 100,       -- 0..100 (per audio/video)
  durata INTEGER NOT NULL DEFAULT 5000,      -- ms: quanto resta a schermo
  posx INTEGER,                              -- posizione a schermo in % (NULL = centrato)
  posy INTEGER,
  scala INTEGER NOT NULL DEFAULT 100,        -- dimensione in % (30..300)
  rot INTEGER NOT NULL DEFAULT 0,            -- rotazione in gradi (-180..180)
  attivo INTEGER NOT NULL DEFAULT 1,
  ts INTEGER NOT NULL
);
-- indice UNIVOCO su (channel, comando): serve anche all'UPSERT (ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_effects_channel_comando ON effects(channel, comando);

CREATE TABLE IF NOT EXISTS sfondi (        -- "Libreria sfondi" delle grafiche social
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  file TEXT NOT NULL,                        -- nome file relativo in data/sfondi/<channel>/
  nome TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sfondi_channel ON sfondi(channel);

CREATE TABLE IF NOT EXISTS modules (       -- "Moduli": automazioni QUANDO→SE→ALLORA per canale
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  attivo INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL DEFAULT '{}',        -- JSON dell'intero modulo: trigger/condizioni/azioni
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_modules_channel ON modules(channel);

CREATE TABLE IF NOT EXISTS counters (      -- contatori dei moduli (es. "morti"), per canale
  channel TEXT NOT NULL,
  nome TEXT NOT NULL,
  valore INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, nome)
);

CREATE TABLE IF NOT EXISTS friends (       -- AMICIZIA GLOBALE con le persone.
  -- COMPARTIMENTI STAGNI: qui NON si salva MAI cosa ha scritto un utente né
  -- in quale canale l'abbiamo visto — solo un'affinità che cresce interagendo.
  user TEXT PRIMARY KEY,                    -- login twitch minuscolo
  affinity REAL NOT NULL DEFAULT 0,         -- 0..100 (quanto è "amico")
  interactions INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS anima (         -- l'anima CONDIVISA di SocialBot (una riga)
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL DEFAULT '{}',          -- JSON: nome, tratti, valori, tono, umore, energia, tormentoni
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS points (        -- "monete" (punti fedeltà) dei minigiochi, per canale
  channel TEXT NOT NULL,
  user TEXT NOT NULL,
  monete INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, user)
);

CREATE TABLE IF NOT EXISTS watchtime (     -- ore guardate (secondi in chat mentre è live), per canale
  channel TEXT NOT NULL,
  user TEXT NOT NULL,                        -- login minuscolo
  display TEXT NOT NULL DEFAULT '',
  seconds INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, user)
);

CREATE TABLE IF NOT EXISTS vips (          -- VIP assegnati dal bot (con scadenza)
  channel TEXT NOT NULL,
  user TEXT NOT NULL,                       -- login minuscolo
  user_id TEXT NOT NULL DEFAULT '',
  display TEXT NOT NULL DEFAULT '',
  until INTEGER NOT NULL DEFAULT 0,         -- epoch ms di scadenza (0 = permanente)
  motivo TEXT NOT NULL DEFAULT '',          -- 'comando', 'voce', 'premio'
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, user)
);
CREATE INDEX IF NOT EXISTS idx_vips_until ON vips(until);

CREATE TABLE IF NOT EXISTS telegram (     -- notifiche Telegram: un bot+gruppo PROPRIO per streamer
  channel TEXT PRIMARY KEY,                -- login twitch minuscolo
  token TEXT NOT NULL DEFAULT '',          -- token del bot Telegram dello streamer (@BotFather)
  chat_id TEXT NOT NULL DEFAULT '',        -- id del gruppo dove notificare
  chat_titolo TEXT NOT NULL DEFAULT '',    -- nome del gruppo (solo per mostrarlo)
  bot_username TEXT NOT NULL DEFAULT '',   -- @username del bot (solo per mostrarlo)
  attivo INTEGER NOT NULL DEFAULT 0,       -- notifica "vado live" accesa?
  messaggio TEXT NOT NULL DEFAULT '',      -- testo con segnaposto (vuoto = default)
  ultima_live TEXT NOT NULL DEFAULT '',    -- id dell'ultima live notificata (anti-doppioni)
  pin_live INTEGER NOT NULL DEFAULT 1,     -- fissa l'avviso a live attiva e lo elimina a live spenta?
  msg_id TEXT NOT NULL DEFAULT '',         -- message_id dell'ultimo avviso live TWITCH (per fissarlo/eliminarlo)
  msg_id_tk TEXT NOT NULL DEFAULT '',      -- idem per l'avviso live TIKTOK (indipendente da Twitch)
  interattivo INTEGER NOT NULL DEFAULT 0,  -- il bot legge e risponde nel gruppo (webhook attivo)?
  webhook_secret TEXT NOT NULL DEFAULT '', -- segreto nel path del webhook (identifica il canale)
  ts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS telegram_dest (  -- DOVE notificare: piu gruppi/canali, anche per topic
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,                   -- login twitch che possiede la configurazione
  chat_id TEXT NOT NULL,                   -- id del gruppo o del canale Telegram
  titolo TEXT NOT NULL DEFAULT '',         -- nome leggibile (solo per mostrarlo)
  tipo TEXT NOT NULL DEFAULT 'group',      -- group | supergroup | channel | private
  thread_id TEXT NOT NULL DEFAULT '',      -- message_thread_id del topic (vuoto = generale)
  thread_nome TEXT NOT NULL DEFAULT '',    -- nome del topic (solo per mostrarlo)
  eventi TEXT NOT NULL DEFAULT '',         -- CSV degli eventi ammessi (vuoto = tutti)
  streamer TEXT NOT NULL DEFAULT '',       -- CSV di login ammessi (vuoto = tutti)
  pin INTEGER NOT NULL DEFAULT 0,          -- fissa qui l'avviso live?
  attivo INTEGER NOT NULL DEFAULT 1,
  msg_id TEXT NOT NULL DEFAULT '',         -- ultimo avviso live inviato QUI (per fissare/eliminare)
  ts INTEGER NOT NULL DEFAULT 0,
  UNIQUE(channel, chat_id, thread_id)
);
CREATE INDEX IF NOT EXISTS idx_tgdest_ch ON telegram_dest(channel);

CREATE TABLE IF NOT EXISTS feed_fonte (   -- feed da cui accorgersi dei post nuovi
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  evento TEXT NOT NULL DEFAULT 'ig',       -- quale avviso: ig | yt | tt
  url TEXT NOT NULL,
  messaggio TEXT NOT NULL DEFAULT '',      -- testo personalizzato (vuoto = standard)
  attivo INTEGER NOT NULL DEFAULT 1,
  ultimo_id TEXT NOT NULL DEFAULT '',      -- ultima voce gia annunciata
  ultimo_titolo TEXT NOT NULL DEFAULT '',
  ultimo_url TEXT NOT NULL DEFAULT '',
  visto_ts INTEGER NOT NULL DEFAULT 0,     -- quando l'abbiamo controllato l'ultima volta
  errore TEXT NOT NULL DEFAULT '',         -- perche l'ultimo controllo e fallito
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_feed_ch ON feed_fonte(channel);

CREATE TABLE IF NOT EXISTS telegram_msg (  -- avvisi live mandati: uno per destinazione E per streamer
  channel TEXT NOT NULL,
  dest_id INTEGER NOT NULL,
  streamer TEXT NOT NULL,
  msg_id TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, dest_id, streamer)
);

CREATE TABLE IF NOT EXISTS telegram_visto (  -- chat e topic che il bot ha VISTO passare
  channel TEXT NOT NULL,                   -- login twitch che possiede il bot
  chat_id TEXT NOT NULL,
  thread_id TEXT NOT NULL DEFAULT '',      -- message_thread_id del topic (vuoto = generale)
  titolo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'group',
  thread_nome TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, chat_id, thread_id)
);

CREATE TABLE IF NOT EXISTS telegram_amico (  -- ALTRI streamer di cui annunciare la diretta
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,                   -- login twitch che possiede la configurazione
  login TEXT NOT NULL,                     -- login twitch dell'amico
  display TEXT NOT NULL DEFAULT '',
  messaggio TEXT NOT NULL DEFAULT '',      -- template dedicato (vuoto = quello del canale)
  attivo INTEGER NOT NULL DEFAULT 1,
  ultima_live TEXT NOT NULL DEFAULT '',    -- id dell'ultima diretta annunciata (anti-doppioni)
  fonte TEXT NOT NULL DEFAULT 'mano',      -- mano = aggiunto da te · community = automatico
  ts INTEGER NOT NULL DEFAULT 0,
  UNIQUE(channel, login)
);
CREATE INDEX IF NOT EXISTS idx_tgamico_ch ON telegram_amico(channel);

CREATE TABLE IF NOT EXISTS brain_model (  -- IA locale: modello auto-addestrato per canale
  channel TEXT PRIMARY KEY,                -- login twitch minuscolo
  data TEXT NOT NULL DEFAULT '',           -- JSON: vocabolario + vettori semantici (base64)
  ts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS passkeys (     -- passkey (WebAuthn) per rientrare senza il pass del sito
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL,                     -- streamer proprietario
  cred_id TEXT NOT NULL UNIQUE,            -- credential id (base64url)
  public_key TEXT NOT NULL,                -- chiave pubblica in JWK (JSON)
  alg INTEGER NOT NULL DEFAULT -7,         -- algoritmo COSE (-7 ES256, -257 RS256, -8 EdDSA)
  sign_count INTEGER NOT NULL DEFAULT 0,   -- contatore anti-clone
  nome TEXT NOT NULL DEFAULT '',           -- etichetta (es. "iPhone")
  created_at INTEGER NOT NULL,
  last_used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_passkeys_login ON passkeys(login);

CREATE TABLE IF NOT EXISTS managers (     -- moderatori che possono gestire la dashboard di uno streamer
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,                   -- canale (streamer proprietario) minuscolo
  login TEXT NOT NULL,                      -- login twitch del moderatore
  display TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'moderatore',  -- per ora un solo ruolo; predisposto per livelli futuri
  status TEXT NOT NULL DEFAULT 'invitato',  -- 'invitato' (link non ancora accettato) | 'attivo'
  invite_token TEXT NOT NULL DEFAULT '',    -- token dell'invito finché non accettato
  invite_expires INTEGER NOT NULL DEFAULT 0,-- scadenza dell'invito (epoch ms)
  invited_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_managers_channel_login ON managers(channel, login);
CREATE INDEX IF NOT EXISTS idx_managers_login ON managers(login);

CREATE TABLE IF NOT EXISTS quotes (       -- citazioni della chat (!cita)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  n INTEGER NOT NULL,                       -- numero progressivo per canale (stabile: !cita 12)
  text TEXT NOT NULL,
  added_by TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotes_channel ON quotes(channel, n);

CREATE TABLE IF NOT EXISTS compleanni (   -- compleanni dei membri del gruppo Telegram
  channel TEXT NOT NULL,                   -- login twitch (proprietario del bot Telegram)
  tg_user_id TEXT NOT NULL,                -- id Telegram del membro (o "man_..." se aggiunto a mano)
  nome TEXT NOT NULL DEFAULT '',
  giorno INTEGER NOT NULL,
  mese INTEGER NOT NULL,
  last_auguri INTEGER NOT NULL DEFAULT 0,  -- anno dell'ultimo augurio inviato (anti-doppioni)
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, tg_user_id)
);
CREATE INDEX IF NOT EXISTS idx_compleanni_data ON compleanni(channel, mese, giorno);

CREATE TABLE IF NOT EXISTS tg_membri (    -- roster dei membri visti scrivere nel gruppo Telegram
  channel TEXT NOT NULL,                   -- login twitch (proprietario del bot)
  tg_user_id TEXT NOT NULL,                -- id Telegram del membro
  nome TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  ultimo INTEGER NOT NULL DEFAULT 0,       -- ultima volta visto (per ordinare)
  PRIMARY KEY (channel, tg_user_id)
);
CREATE INDEX IF NOT EXISTS idx_tgmembri_ch ON tg_membri(channel, ultimo);
CREATE TABLE IF NOT EXISTS giochi (          -- giochi personalizzati per canale (manche)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  tipo TEXT NOT NULL,                         -- 'trivia' | 'parola'
  nome TEXT NOT NULL DEFAULT '',
  config TEXT NOT NULL DEFAULT '{}',          -- domande/parole + opzioni (JSON)
  attivo INTEGER NOT NULL DEFAULT 1,
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_giochi_ch ON giochi(channel);
CREATE TABLE IF NOT EXISTS voce_streamer (   -- trascrizioni della voce PARLATA dello streamer (materiale di stile)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  testo TEXT NOT NULL,
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_voce_ch ON voce_streamer(channel, ts);
CREATE TABLE IF NOT EXISTS subscriptions (   -- abbonamenti self-service (Stripe/Link)
  login TEXT PRIMARY KEY,                     -- login twitch dello streamer abbonato
  tier TEXT NOT NULL DEFAULT 'free',          -- piano base: free|base|community (pro=legacy)
  pacchetti TEXT NOT NULL DEFAULT '',         -- add-on à la carte attivi (CSV di id)
  status TEXT NOT NULL DEFAULT 'none',        -- none|active|trialing|past_due|canceled
  stripe_customer TEXT NOT NULL DEFAULT '',   -- id cliente Stripe (per il portale)
  stripe_sub TEXT NOT NULL DEFAULT '',        -- id abbonamento Stripe
  current_period_end INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS spotify_tokens ( -- connettore Spotify per le richieste musicali (per canale)
  login TEXT PRIMARY KEY,                     -- login twitch del canale
  access TEXT NOT NULL DEFAULT '',            -- access token (breve durata)
  refresh TEXT NOT NULL DEFAULT '',           -- refresh token (lunga durata)
  scadenza INTEGER NOT NULL DEFAULT 0,        -- ms epoch di scadenza dell'access token
  client_id TEXT NOT NULL DEFAULT '',         -- app Spotify DELLO STREAMER (Client ID)
  client_secret TEXT NOT NULL DEFAULT '',     -- app Spotify dello streamer (Client Secret)
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tiktok_tokens ( -- connettore TikTok (Display API) per l'avviso "nuovo post", per canale
  login TEXT PRIMARY KEY,                     -- login twitch del canale
  access TEXT NOT NULL DEFAULT '',            -- access token (breve durata)
  refresh TEXT NOT NULL DEFAULT '',           -- refresh token (lunga durata, ~365g)
  scadenza INTEGER NOT NULL DEFAULT 0,        -- ms epoch di scadenza dell'access token
  refresh_scadenza INTEGER NOT NULL DEFAULT 0,-- ms epoch di scadenza del refresh token
  open_id TEXT NOT NULL DEFAULT '',           -- id opaco dell'account TikTok collegato
  username TEXT NOT NULL DEFAULT '',          -- @username TikTok (solo per mostrarlo nella UI)
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS seventv_tokens ( -- connettore 7TV: gestione emote del canale (per canale)
  login TEXT PRIMARY KEY,                     -- login twitch del canale
  token TEXT NOT NULL DEFAULT '',            -- JWT dell'account 7TV dello streamer (proprietario del set)
  user_id TEXT NOT NULL DEFAULT '',          -- id utente 7TV
  username TEXT NOT NULL DEFAULT '',          -- @username 7TV (solo per la UI)
  set_id TEXT NOT NULL DEFAULT '',           -- id dell'emote-set attivo del canale
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS telegram_login ( -- "Accedi con Telegram" / Mini App: id utente TG → canale twitch
  tg_id TEXT PRIMARY KEY,                     -- id numerico dell'utente Telegram
  login TEXT NOT NULL,                        -- login twitch (identità) collegato
  username TEXT NOT NULL DEFAULT '',          -- @username Telegram (per la UI)
  nome TEXT NOT NULL DEFAULT '',              -- nome mostrato Telegram (per la UI)
  created_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tglogin_login ON telegram_login(login);
CREATE TABLE IF NOT EXISTS linee_guida (     -- regole/limiti che lo streamer dà a "lia": lei le rispetta SEMPRE
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  testo TEXT NOT NULL,
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_guida_ch ON linee_guida(channel, ts);
CREATE TABLE IF NOT EXISTS diario (          -- diario di crescita di "lia": risvegli, obiettivi, cose capite
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'nota',
  testo TEXT NOT NULL,
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_diario_ch ON diario(channel, ts);
CREATE TABLE IF NOT EXISTS point_alerts (    -- premi a PUNTI CANALE Twitch → alert (effetto e/o messaggio)
  channel TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  titolo TEXT NOT NULL DEFAULT '',
  costo INTEGER NOT NULL DEFAULT 0,
  effetto TEXT NOT NULL DEFAULT '',          -- comando effetto da lanciare (overlay/suono)
  testo TEXT NOT NULL DEFAULT '',            -- messaggio in chat ({user} = chi riscatta)
  opzioni TEXT NOT NULL DEFAULT '',          -- JSON: posizione a schermo + green screen dell'effetto
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, reward_id)
);
`);

// --- migrazioni leggere: aggiunge colonne nuove a DB già esistenti ------------
// CREATE TABLE IF NOT EXISTS non tocca le tabelle già create, quindi le colonne
// aggiunte dopo il primo avvio vanno inserite a mano (idempotente).
function _colonneTelegram() {
  try {
    const c = db.prepare('PRAGMA table_info(telegram_amico)').all();
    if (!c.some((x) => x.name === 'fonte')) db.exec("ALTER TABLE telegram_amico ADD COLUMN fonte TEXT NOT NULL DEFAULT 'mano'");
    const t = db.prepare('PRAGMA table_info(telegram)').all();
    if (!t.some((x) => x.name === 'community_live')) db.exec('ALTER TABLE telegram ADD COLUMN community_live INTEGER NOT NULL DEFAULT 0');
  } catch (e) {  }
}
_colonneTelegram();

function aggiungiColonna(tabella, colonna, definizione) {
  const cols = db.prepare(`PRAGMA table_info(${tabella})`).all();
  if (!cols.some((c) => c.name === colonna)) {
    db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${definizione}`);
  }
}
aggiungiColonna('point_alerts', 'suono', "TEXT NOT NULL DEFAULT ''");   // suono PRESET sul riscatto (id preset)
aggiungiColonna('point_alerts', 'opzioni', "TEXT NOT NULL DEFAULT ''"); // posizione + green screen dell'effetto (JSON)
// Effetti a schermo: posizione/dimensione/rotazione, gestite dall'Overlay Studio.
aggiungiColonna('effects', 'posx', 'INTEGER');                          // % orizzontale (NULL = centrato)
aggiungiColonna('effects', 'posy', 'INTEGER');                          // % verticale
aggiungiColonna('effects', 'scala', 'INTEGER NOT NULL DEFAULT 100');    // dimensione %
aggiungiColonna('effects', 'rot', 'INTEGER NOT NULL DEFAULT 0');        // rotazione gradi
// Libreria condivisa: un effetto può essere reso PUBBLICO e importato dagli altri.
aggiungiColonna('effects', 'pubblico', 'INTEGER NOT NULL DEFAULT 0');   // 1 = visibile nella libreria condivisa
aggiungiColonna('effects', 'nome', "TEXT NOT NULL DEFAULT ''");         // titolo mostrato nella libreria
aggiungiColonna('effects', 'autore', "TEXT NOT NULL DEFAULT ''");       // login del creatore originale (attribuzione)
aggiungiColonna('effects', 'usi', 'INTEGER NOT NULL DEFAULT 0');        // quante volte è stato importato
aggiungiColonna('effects', 'suono_file', "TEXT NOT NULL DEFAULT ''");   // COMBO: audio abbinato a un'immagine/video
aggiungiColonna('telegram', 'pin_live', "INTEGER NOT NULL DEFAULT 1");
aggiungiColonna('telegram', 'msg_id', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('telegram', 'msg_id_tk', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('telegram', 'interattivo', "INTEGER NOT NULL DEFAULT 0");
aggiungiColonna('telegram', 'webhook_secret', "TEXT NOT NULL DEFAULT ''");
// chat privata: modalità ('me'|'tutti'|'off') e account Telegram legato al proprietario
aggiungiColonna('telegram', 'dm_modo', "TEXT NOT NULL DEFAULT 'me'");
aggiungiColonna('telegram', 'owner_tg_id', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('telegram', 'owner_tg_nome', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('telegram', 'yt_ultimo', "TEXT NOT NULL DEFAULT ''");   // id ultimo video YouTube annunciato (anti-doppioni)
aggiungiColonna('telegram', 'ig_ultimo', "TEXT NOT NULL DEFAULT ''");   // id ultimo post Instagram annunciato (anti-doppioni)
aggiungiColonna('telegram', 'tk_ultimo', "TEXT NOT NULL DEFAULT ''");   // id ultimo post TikTok annunciato (anti-doppioni)
aggiungiColonna('quotes', 'autore', "TEXT NOT NULL DEFAULT ''");   // chi ha DETTO la citazione (import x.la: nome utente)
aggiungiColonna('quotes', 'data', "TEXT NOT NULL DEFAULT ''");     // data della citazione (ISO YYYY-MM-DD, se nota)
// linee guida: ambito (dove valgono + con chi) — regole contestuali di "lia"
aggiungiColonna('linee_guida', 'dove', "TEXT NOT NULL DEFAULT 'ovunque'");     // ovunque | twitch | tg | tg-privato
aggiungiColonna('linee_guida', 'con_chi', "TEXT NOT NULL DEFAULT 'tutti'");    // tutti | solo-me | tranne-me
// abbonamenti modulari: pacchetti add-on à la carte attivi (CSV di id)
aggiungiColonna('subscriptions', 'pacchetti', "TEXT NOT NULL DEFAULT ''");
// Spotify per-streamer: credenziali dell'app dello streamer (Client ID/Secret)
aggiungiColonna('spotify_tokens', 'client_id', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('spotify_tokens', 'client_secret', "TEXT NOT NULL DEFAULT ''");
// FOTO PROFILO di Twitch. La pagina /u/<canale> mostrava l'iniziale del nome
// perché la foto non era salvata da nessuna parte: nessuno la scriveva. Ora c'è
// la colonna e la riempie il server (al login e alla prima visita della pagina).
aggiungiColonna('streamers', 'avatar', "TEXT NOT NULL DEFAULT ''");
// Distingue i MEMBRI COMMUNITY (verificati da andryxify.it) dagli abbonati/promo:
// serve per bloccare la dashboard a chi non paga e non è community. Alla PRIMA
// aggiunta della colonna, tutti gli approvati odierni sono community (Stripe non è
// mai stato attivo in produzione, quindi non esistono ancora abbonati né promo).
(() => {
  const cols = db.prepare('PRAGMA table_info(streamers)').all();
  if (!cols.some((c) => c.name === 'community')) {
    db.exec("ALTER TABLE streamers ADD COLUMN community INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE streamers SET community=1 WHERE status='approved'");
  }
})();

// Periodo di GRAZIA e controllo MANUALE (vedi gate.js): quando uno streamer sparisce
// dalla lista del sito NON lo spegniamo subito, ma dopo `grazia_fino` (timestamp ms;
// -1 = grazia già consumata). `manuale=1` = stato deciso dall'admin: il sync col sito
// lo rispetta e non lo sovrascrive più.
aggiungiColonna('streamers', 'grazia_fino', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('streamers', 'manuale', 'INTEGER NOT NULL DEFAULT 0');

// Migrazione dominio dei LINK PROFILO: chi ha dati vecchi (moduli/conoscenza)
// aveva "andryxify.it/u/<canale>" scritto nei testi; lo portiamo al dominio
// ufficiale "socialbot.live/u/<canale>". Idempotente (il WHERE non matcha più
// dopo la prima volta), così sistema anche chi non ha mai toccato i dati iniziali.
(() => {
  try {
    const a = db.prepare("UPDATE modules SET config = REPLACE(config, 'andryxify.it/u/', 'socialbot.live/u/') WHERE config LIKE '%andryxify.it/u/%'").run();
    const b = db.prepare("UPDATE knowledge SET risposta = REPLACE(risposta, 'andryxify.it/u/', 'socialbot.live/u/') WHERE risposta LIKE '%andryxify.it/u/%'").run();
    if ((a.changes || 0) + (b.changes || 0) > 0) {
      // eslint-disable-next-line no-console
      console.log(`[db] link profilo migrati: ${a.changes} moduli, ${b.changes} risposte → socialbot.live/u/`);
    }
  } catch { /* best-effort: non blocca l'avvio */ }
})();

// Migrazione del VECCHIO LINK DEL BOT nei testi salvati (comandi/auto-messaggi e risposte
// imparate): prima di socialbot.live il bot stava su un vecchio dominio (es. bot.andryxify.it
// / socialbot.it). Chi l'aveva scritto in un comando o auto-messaggio — o il bot che l'aveva
// imparato — ogni tanto lo ripeteva in chat. Lo portiamo al dominio ufficiale. NON tocca il
// sito principale andryxify.it (che è legittimo). Idempotente (il WHERE non matcha più dopo).
(() => {
  try {
    const vecchi = ['bot.andryxify.it', 'socialbot.it', 'andrybot.andryxify.it'];
    let tot = 0;
    for (const v of vecchi) {
      const a = db.prepare('UPDATE modules SET config = REPLACE(config, ?, ?) WHERE config LIKE ?').run(v, 'socialbot.live', '%' + v + '%');
      const b = db.prepare('UPDATE knowledge SET risposta = REPLACE(risposta, ?, ?) WHERE risposta LIKE ?').run(v, 'socialbot.live', '%' + v + '%');
      tot += (a.changes || 0) + (b.changes || 0);
    }
    if (tot > 0) {
      // eslint-disable-next-line no-console
      console.log(`[db] vecchio link del bot migrato → socialbot.live (${tot} testi)`);
    }
  } catch { /* best-effort */ }
})();

// Pulizia UNA-TANTUM della conoscenza 'auto' inquinata. Il vecchio
// pre-addestramento scaricava l'HTML della SPA (SITE_URL/u/<login>), che per
// qualsiasi login restituisce lo stesso guscio dell'app coi meta/social
// GENERICI del sito (di fatto del proprietario). Risultato: in OGNI canale
// erano finite come 'auto' la descrizione e i social dell'owner ("per il bot
// erano tutti andryxify"). Qui cancelliamo TUTTE le voci 'auto' una sola
// volta: il nuovo pre-addestramento (che legge l'API JSON per-streamer) le
// riseminerà corrette. Guardato da un flag persistente così gira una volta
// sola e non ricancella i dati appena riseminati ad ogni riavvio.
(() => {
  try {
    const FLAG = 'purge_auto_owner_v1';
    const gia = db.prepare("SELECT 1 FROM facts WHERE channel='__migrazioni__' AND key=?").get(FLAG);
    if (gia) return;
    const r = db.prepare("DELETE FROM knowledge WHERE fonte='auto'").run();
    db.prepare(`INSERT INTO facts (channel, key, value, ts) VALUES ('__migrazioni__', ?, ?, ?)
      ON CONFLICT(channel, key) DO UPDATE SET value=excluded.value, ts=excluded.ts`)
      .run(FLAG, String(r.changes || 0), Date.now());
    if ((r.changes || 0) > 0) {
      // eslint-disable-next-line no-console
      console.log(`[db] conoscenza 'auto' inquinata rimossa: ${r.changes} voci (verranno riseminate corrette per-streamer)`);
    }
  } catch { /* best-effort: non blocca l'avvio */ }
})();

// Contatori: colonna `overlay` (JSON aspetto/posizione del widget) sui DB esistenti.
(() => {
  try {
    const cols = db.prepare('PRAGMA table_info(contatori)').all();
    if (!cols.some((c) => c.name === 'overlay')) db.exec("ALTER TABLE contatori ADD COLUMN overlay TEXT NOT NULL DEFAULT ''");
  } catch { /* best-effort */ }
})();

// Pagina link: colonne del customizer completo sui DB che hanno già la tabella.
(() => {
  try {
    const cols = db.prepare('PRAGMA table_info(link_page)').all();
    if (cols.length) {
      for (const c of ['avatar', 'tema', 'blocchi']) {
        if (!cols.some((x) => x.name === c)) db.exec(`ALTER TABLE link_page ADD COLUMN ${c} TEXT NOT NULL DEFAULT ''`);
      }
    }
  } catch { /* best-effort */ }
})();

const now = () => Date.now();

// ---------------------------------------------------------------- amicizia (globale)
// L'unica cosa condivisa tra i canali sulle persone: un'affinità che cresce
// con le interazioni. MAI contenuti, MAI in quale canale (compartimenti stagni).
export const friends = {
  touch(user, peso = 0.3) {
    const u = String(user || '').toLowerCase();
    if (!u) return;
    const t = now();
    db.prepare(`INSERT INTO friends (user, affinity, interactions, first_seen, last_seen)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(user) DO UPDATE SET
        affinity = MIN(100, friends.affinity + ?),
        interactions = friends.interactions + 1,
        last_seen = ?`).run(u, peso, t, t, peso, t);
  },
  get(user) {
    const u = String(user || '').toLowerCase();
    const r = db.prepare('SELECT * FROM friends WHERE user=?').get(u);
    return r || { user: u, affinity: 0, interactions: 0, first_seen: 0, last_seen: 0 };
  },
  top(n = 10) { return db.prepare('SELECT * FROM friends ORDER BY affinity DESC LIMIT ?').all(n); },
  count() { return db.prepare('SELECT COUNT(*) c FROM friends').get().c; },
};

// ---------------------------------------------------------------- monete (minigiochi)
export const points = {
  get(channel, user) {
    const r = db.prepare('SELECT monete FROM points WHERE channel=? AND user=?').get(channel, String(user).toLowerCase());
    return r ? r.monete : 0;
  },
  // aggiunge (o toglie, con delta negativo) monete; non scende sotto 0. Ritorna il nuovo saldo.
  add(channel, user, delta) {
    const u = String(user).toLowerCase();
    db.prepare(`INSERT INTO points (channel, user, monete, ts) VALUES (?,?,MAX(0,?),?)
      ON CONFLICT(channel, user) DO UPDATE SET monete = MAX(0, points.monete + ?), ts=?`)
      .run(channel, u, delta, now(), delta, now());
    return this.get(channel, u);
  },
  top(channel, n = 5) {
    return db.prepare("SELECT user, monete FROM points WHERE channel=? AND user NOT LIKE '[%' ORDER BY monete DESC LIMIT ?").all(channel, n);
  },
};

// ---------------------------------------------------------------- ore guardate (watchtime)
export const watchtime = {
  get(channel, user) {
    const r = db.prepare('SELECT seconds FROM watchtime WHERE channel=? AND user=?').get(channel, String(user).toLowerCase());
    return r ? r.seconds : 0;
  },
  // aggiunge secondi (per un utente), aggiornando il nome mostrato se fornito.
  add(channel, user, deltaSec, display = '') {
    const u = String(user).toLowerCase();
    const d = String(display || '');
    db.prepare(`INSERT INTO watchtime (channel, user, display, seconds, ts) VALUES (?,?,?,MAX(0,?),?)
      ON CONFLICT(channel, user) DO UPDATE SET
        seconds = MAX(0, watchtime.seconds + ?),
        display = CASE WHEN ?<>'' THEN ? ELSE watchtime.display END,
        ts=?`)
      .run(channel, u, d, deltaSec, now(), deltaSec, d, d, now());
    return this.get(channel, u);
  },
  // accredita gli stessi secondi a una lista di utenti (una transazione).
  addMany(channel, users, deltaSec) {
    const tx = db.transaction((lista) => { for (const u of lista) this.add(channel, u, deltaSec); });
    tx(users || []);
  },
  top(channel, n = 5) {
    return db.prepare("SELECT user, display, seconds FROM watchtime WHERE channel=? AND user NOT LIKE '[%' ORDER BY seconds DESC LIMIT ?").all(channel, n);
  },
};

// ---------------------------------------------------------------- VIP (con scadenza)
export const vips = {
  set(channel, { user, userId = '', display = '', until = 0, motivo = '' }) {
    const u = String(user).toLowerCase();
    db.prepare(`INSERT INTO vips (channel, user, user_id, display, until, motivo, ts)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(channel, user) DO UPDATE SET user_id=excluded.user_id, display=excluded.display,
        until=excluded.until, motivo=excluded.motivo, ts=excluded.ts`)
      .run(channel, u, userId, display, until, motivo, now());
  },
  get(channel, user) { return db.prepare('SELECT * FROM vips WHERE channel=? AND user=?').get(channel, String(user).toLowerCase()) || null; },
  remove(channel, user) { db.prepare('DELETE FROM vips WHERE channel=? AND user=?').run(channel, String(user).toLowerCase()); },
  list(channel) { return db.prepare('SELECT * FROM vips WHERE channel=? ORDER BY ts DESC').all(channel); },
  // VIP scaduti su TUTTI i canali (until>0 e già passato): per la rimozione automatica
  scaduti() { return db.prepare('SELECT * FROM vips WHERE until>0 AND until<?').all(now()); },
};

// ---------------------------------------------------------------- anima (condivisa)
export const anima = {
  get() {
    const r = db.prepare('SELECT data FROM anima WHERE id=1').get();
    return r ? safeJson(r.data) : {};
  },
  set(obj) {
    db.prepare(`INSERT INTO anima (id, data, ts) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data=excluded.data, ts=excluded.ts`)
      .run(JSON.stringify(obj || {}), now());
  },
};

// ---------------------------------------------------------------- token
export const tokens = {
  save(kind, login, t) {
    db.prepare(`INSERT INTO tokens (kind, login, user_id, access_token, refresh_token, scopes, expires_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(kind, login) DO UPDATE SET user_id=excluded.user_id, access_token=excluded.access_token,
        refresh_token=excluded.refresh_token, scopes=excluded.scopes, expires_at=excluded.expires_at, updated_at=excluded.updated_at`)
      .run(kind, login.toLowerCase(), t.userId || '', cifra(t.accessToken), cifra(t.refreshToken || ''), (t.scopes || []).join(' '), t.expiresAt || 0, now());
  },
  get(kind, login) {
    const r = db.prepare('SELECT * FROM tokens WHERE kind=? AND login=?').get(kind, login.toLowerCase());
    if (!r) return null;
    return { userId: r.user_id, accessToken: decifra(r.access_token), refreshToken: decifra(r.refresh_token),
      scopes: r.scopes ? r.scopes.split(' ') : [], expiresAt: r.expires_at };
  },
  // il token del bot è unico: il primo (e unico) con kind='bot'
  getBot() {
    const r = db.prepare("SELECT * FROM tokens WHERE kind='bot' ORDER BY updated_at DESC LIMIT 1").get();
    if (!r) return null;
    return { login: r.login, userId: r.user_id, accessToken: decifra(r.access_token), refreshToken: decifra(r.refresh_token),
      scopes: r.scopes ? r.scopes.split(' ') : [], expiresAt: r.expires_at };
  },
  delete(kind, login) { db.prepare('DELETE FROM tokens WHERE kind=? AND login=?').run(kind, login.toLowerCase()); },
};

// Migrazione una-tantum: cifra a riposo i token ancora in chiaro. Idempotente
// (salta quelli già cifrati). Gira all'avvio, come le altre migrazioni del DB.
export function migraTokenCifratura() {
  try {
    const righe = db.prepare('SELECT kind, login, access_token, refresh_token FROM tokens').all();
    const upd = db.prepare('UPDATE tokens SET access_token=?, refresh_token=? WHERE kind=? AND login=?');
    let n = 0;
    for (const r of righe) {
      const a = r.access_token || '', b = r.refresh_token || '';
      if ((eCifrato(a) || !a) && (eCifrato(b) || !b)) continue;
      upd.run(cifra(a), cifra(b), r.kind, r.login);
      n++;
    }
    return n;
  } catch (e) { return 0; }
}

// ---------------------------------------------------------------- streamer
export const streamers = {
  request(login, display, userId) {
    db.prepare(`INSERT INTO streamers (login, display, user_id, status, requested_at) VALUES (?,?,?,'pending',?)
      ON CONFLICT(login) DO UPDATE SET display=excluded.display, user_id=excluded.user_id`)
      .run(login.toLowerCase(), display, userId, now());
  },
  get(login) {
    const r = db.prepare('SELECT * FROM streamers WHERE login=?').get(login.toLowerCase());
    if (!r) return null;
    return { ...r, settings: safeJson(r.settings), botEnabled: !!r.bot_enabled, community: !!r.community };
  },
  list() {
    return db.prepare('SELECT * FROM streamers ORDER BY requested_at DESC').all()
      .map(r => ({ ...r, settings: safeJson(r.settings), botEnabled: !!r.bot_enabled, community: !!r.community }));
  },
  // MEMBRI COMMUNITY CONFERMATI, adesso. È l'unico posto dove si decide chi
  // conta come membro: registrato su Twitch (user_id), approvato, verificato dal
  // pass di andryxify.it (community=1) e ANCORA nella lista del sito — chi è in
  // periodo di grazia è sparito dalla lista, quindi non conta più. Chi ha solo
  // comprato un piano o si e' iscritto gratis non ha community=1 e resta fuori.
  // Gli account gestiti a mano dall'admin (manuale=1) li decide l'admin.
  membriCommunity(escludi = '') {
    return db.prepare(`SELECT login, display, avatar FROM streamers
      WHERE community=1 AND status='approved' AND user_id<>'' AND login<>?
        AND (manuale=1 OR grazia_fino<=0)
      ORDER BY display COLLATE NOCASE, login`).all(String(escludi || '').toLowerCase());
  },
  // canali dove il bot deve stare adesso: approvati + accesi
  active() {
    return db.prepare("SELECT * FROM streamers WHERE status='approved' AND bot_enabled=1").all()
      .map(r => ({ ...r, settings: safeJson(r.settings), botEnabled: true }));
  },
  setStatus(login, status) {
    db.prepare('UPDATE streamers SET status=?, approved_at=CASE WHEN ?=\'approved\' THEN ? ELSE approved_at END WHERE login=?')
      .run(status, status, now(), login.toLowerCase());
  },
  // periodo di grazia: timestamp (ms) di scadenza; 0 = nessuna grazia, -1 = consumata
  setGrazia(login, ts) {
    db.prepare('UPDATE streamers SET grazia_fino=? WHERE login=?').run(Math.round(Number(ts) || 0), login.toLowerCase());
  },
  // controllo manuale dell'admin: 1 = il sync col sito non tocca più questo streamer
  setManuale(login, on) {
    db.prepare('UPDATE streamers SET manuale=? WHERE login=?').run(on ? 1 : 0, login.toLowerCase());
  },
  // Registra/aggiorna uno streamer già APPROVATO dal sito (andryxify.it è la
  // fonte di verità: chi arriva con un pass valido è per definizione abilitato).
  // Non tocca bot_enabled se lo streamer esiste già (rispetta il suo on/off).
  upsertApproved(login, display, userId = '') {
    const l = login.toLowerCase();
    db.prepare(`INSERT INTO streamers (login, display, user_id, status, requested_at, approved_at)
      VALUES (?,?,?,'approved',?,?)
      ON CONFLICT(login) DO UPDATE SET
        display=excluded.display,
        user_id=CASE WHEN excluded.user_id!='' THEN excluded.user_id ELSE streamers.user_id END,
        status='approved',
        approved_at=COALESCE(streamers.approved_at, excluded.approved_at)`)
      .run(l, display, userId, now(), now());
  },
  setEnabled(login, enabled) {
    db.prepare('UPDATE streamers SET bot_enabled=? WHERE login=?').run(enabled ? 1 : 0, login.toLowerCase());
  },
  // Marca uno streamer come MEMBRO COMMUNITY (verificato da andryxify.it): lo si
  // chiama solo dall'ingresso col pass del sito (/entra). Gli abbonati/promo NON
  // passano di qui, così restano distinguibili da chi ha accesso "di diritto".
  markCommunity(login) {
    db.prepare('UPDATE streamers SET community=1 WHERE login=?').run(login.toLowerCase());
  },
  setSettings(login, settings) {
    db.prepare('UPDATE streamers SET settings=? WHERE login=?').run(JSON.stringify(settings || {}), login.toLowerCase());
  },
  // Foto profilo di Twitch (profile_image_url). Accetta solo https e solo se il
  // record esiste già: è una cache, non un motivo per creare uno streamer.
  setAvatar(login, url) {
    const u = String(url || '').trim();
    if (u && !/^https:\/\/[^\s]+$/i.test(u)) return;
    db.prepare('UPDATE streamers SET avatar=? WHERE login=?').run(u.slice(0, 500), login.toLowerCase());
  },
  remove(login) { db.prepare('DELETE FROM streamers WHERE login=?').run(login.toLowerCase()); },
};

// ---------------------------------------------------------------- giochi (manche)
// Giochi personalizzati creati dallo streamer: set di trivia (domanda→risposte)
// o di "parole veloci". Vengono pescati a caso dalle manche automatiche.
function rowToGioco(r) { return { id: r.id, tipo: r.tipo, nome: r.nome, config: safeJson(r.config), attivo: !!r.attivo }; }
export const giochi = {
  list(channel) {
    return db.prepare('SELECT * FROM giochi WHERE channel=? ORDER BY ts DESC').all(String(channel).toLowerCase()).map(rowToGioco);
  },
  listAttivi(channel) { return this.list(channel).filter((g) => g.attivo); },
  save(channel, { id, tipo, nome, config, attivo = true }) {
    const ch = String(channel).toLowerCase();
    const cfg = JSON.stringify(config || {});
    if (id) {
      db.prepare('UPDATE giochi SET tipo=?, nome=?, config=?, attivo=? WHERE channel=? AND id=?')
        .run(tipo, String(nome || '').slice(0, 60), cfg, attivo ? 1 : 0, ch, id);
      return id;
    }
    const r = db.prepare('INSERT INTO giochi (channel, tipo, nome, config, attivo, ts) VALUES (?,?,?,?,?,?)')
      .run(ch, tipo, String(nome || '').slice(0, 60), cfg, attivo ? 1 : 0, now());
    return r.lastInsertRowid;
  },
  remove(channel, id) { db.prepare('DELETE FROM giochi WHERE channel=? AND id=?').run(String(channel).toLowerCase(), id); },
  count(channel) { return db.prepare('SELECT COUNT(*) c FROM giochi WHERE channel=?').get(String(channel).toLowerCase()).c; },
};

// ---------------------------------------------------------------- voce parlata
// Frasi che lo streamer DICE in diretta (trascritte dal suo microfono, nel suo
// browser: l'audio non arriva mai qui, solo il testo). Sono la sua voce vera →
// ottimo materiale di stile per il cervello. Teniamo solo le ultime per canale.
export const voceStreamer = {
  add(channel, testo) {
    const ch = String(channel).toLowerCase();
    const t = String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (t.length < 12) return;
    db.prepare('INSERT INTO voce_streamer (channel, testo, ts) VALUES (?,?,?)').run(ch, t, now());
    // oblio: tieni solo le ultime 60 frasi per canale
    db.prepare(`DELETE FROM voce_streamer WHERE channel=? AND id NOT IN
      (SELECT id FROM voce_streamer WHERE channel=? ORDER BY ts DESC LIMIT 60)`).run(ch, ch);
  },
  recent(channel, n = 8) {
    return db.prepare('SELECT testo FROM voce_streamer WHERE channel=? ORDER BY ts DESC LIMIT ?')
      .all(String(channel).toLowerCase(), n).map((r) => r.testo);
  },
};

// ---------------------------------------------------------------- abbonamenti
// Stato dell'abbonamento self-service (Stripe) di uno streamer. Il tier decide
// quali funzioni sono sbloccate; lo status se l'accesso è attivo. Aggiornato dal
// webhook Stripe. Chi è abilitato dal sito (community) non passa di qui.
export const subscriptions = {
  get(login) {
    return db.prepare('SELECT * FROM subscriptions WHERE login=?').get(String(login).toLowerCase()) || null;
  },
  set(login, { tier, pacchetti, status, customerId = '', subId = '', periodEnd = 0 } = {}) {
    const l = String(login).toLowerCase();
    // pacchetti: se non passato (undefined) NON lo tocchiamo; stringa/array → CSV normalizzato
    const csv = pacchetti === undefined ? null
      : (Array.isArray(pacchetti) ? pacchetti : String(pacchetti || '').split(','))
          .map((s) => String(s || '').trim().toLowerCase()).filter(Boolean).join(',');
    db.prepare(`INSERT INTO subscriptions (login, tier, pacchetti, status, stripe_customer, stripe_sub, current_period_end, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET
        tier=excluded.tier, status=excluded.status,
        pacchetti=CASE WHEN ? THEN excluded.pacchetti ELSE subscriptions.pacchetti END,
        stripe_customer=CASE WHEN excluded.stripe_customer!='' THEN excluded.stripe_customer ELSE subscriptions.stripe_customer END,
        stripe_sub=CASE WHEN excluded.stripe_sub!='' THEN excluded.stripe_sub ELSE subscriptions.stripe_sub END,
        current_period_end=excluded.current_period_end, updated_at=excluded.updated_at`)
      .run(l, tier || 'free', csv || '', status || 'none', customerId, subId, periodEnd, now(), csv === null ? 0 : 1);
    return this.get(l);
  },
  // abbonamento operativo (accesso attivo)
  attivo(login) {
    const s = this.get(login);
    return !!s && (s.status === 'active' || s.status === 'trialing');
  },
  // trial (promo) scaduti da revocare: quelli in prova con periodo finito.
  // I paganti (active) li gestisce il webhook Stripe, non questo.
  scaduti() {
    return db.prepare("SELECT * FROM subscriptions WHERE status='trialing' AND current_period_end>0 AND current_period_end<?")
      .all(now());
  },
};

// ---------------------------------------------------------------- Spotify (richieste musicali)
// Token OAuth di Spotify per canale (connettore "richieste musicali"). Solo per
// aggiungere brani alla coda del broadcaster: nessun dato personale oltre ai token.
export const spotifyTokens = {
  get(login) {
    return db.prepare('SELECT * FROM spotify_tokens WHERE login=?').get(String(login).toLowerCase()) || null;
  },
  set(login, { access = '', refresh = '', scadenza = 0 } = {}) {
    const l = String(login).toLowerCase();
    db.prepare(`INSERT INTO spotify_tokens (login, access, refresh, scadenza, updated_at)
      VALUES (?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET
        access=excluded.access,
        refresh=CASE WHEN excluded.refresh!='' THEN excluded.refresh ELSE spotify_tokens.refresh END,
        scadenza=excluded.scadenza, updated_at=excluded.updated_at`)
      .run(l, access, refresh, scadenza, now());
    return this.get(l);
  },
  // Salva le credenziali dell'app Spotify DELLO STREAMER (Client ID/Secret).
  // Cambiare app invalida i token OAuth esistenti: li azzeriamo (serve ri-collegare).
  setConfig(login, { clientId = '', clientSecret = '' } = {}) {
    const l = String(login).toLowerCase();
    db.prepare(`INSERT INTO spotify_tokens (login, client_id, client_secret, access, refresh, scadenza, updated_at)
      VALUES (?,?,?,'','',0,?)
      ON CONFLICT(login) DO UPDATE SET
        client_id=excluded.client_id, client_secret=excluded.client_secret,
        access='', refresh='', scadenza=0, updated_at=excluded.updated_at`)
      .run(l, clientId, clientSecret, now());
    return this.get(l);
  },
  // Scollega solo l'account (azzera i token OAuth), tenendo le credenziali dell'app.
  scollega(login) {
    db.prepare("UPDATE spotify_tokens SET access='', refresh='', scadenza=0, updated_at=? WHERE login=?")
      .run(now(), String(login).toLowerCase());
  },
  remove(login) { db.prepare('DELETE FROM spotify_tokens WHERE login=?').run(String(login).toLowerCase()); },
};

// ---------------------------------------------------------------- TikTok (Display API)
// Token OAuth per l'avviso "nuovo post su TikTok". L'app TikTok è UNICA (globale,
// dell'operatore): qui salviamo solo i token del singolo canale collegato.
export const tiktokTokens = {
  get(login) {
    return db.prepare('SELECT * FROM tiktok_tokens WHERE login=?').get(String(login).toLowerCase()) || null;
  },
  set(login, { access = '', refresh = '', scadenza = 0, refreshScadenza = 0, openId, username } = {}) {
    const l = String(login).toLowerCase();
    const cur = this.get(l) || {};
    db.prepare(`INSERT INTO tiktok_tokens (login, access, refresh, scadenza, refresh_scadenza, open_id, username, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET
        access=excluded.access,
        refresh=CASE WHEN excluded.refresh!='' THEN excluded.refresh ELSE tiktok_tokens.refresh END,
        scadenza=excluded.scadenza,
        refresh_scadenza=CASE WHEN excluded.refresh_scadenza>0 THEN excluded.refresh_scadenza ELSE tiktok_tokens.refresh_scadenza END,
        open_id=CASE WHEN excluded.open_id!='' THEN excluded.open_id ELSE tiktok_tokens.open_id END,
        username=CASE WHEN excluded.username!='' THEN excluded.username ELSE tiktok_tokens.username END,
        updated_at=excluded.updated_at`)
      .run(l, access, refresh, scadenza, refreshScadenza,
        openId !== undefined ? String(openId || '') : (cur.open_id || ''),
        username !== undefined ? String(username || '') : (cur.username || ''), now());
    return this.get(l);
  },
  scollega(login) { db.prepare('DELETE FROM tiktok_tokens WHERE login=?').run(String(login).toLowerCase()); },
};

// ---------------------------------------------------------------- 7TV (emote)
// Token dell'account 7TV dello streamer per gestire (aggiungere/togliere/rinominare)
// le emote del suo set attivo. Ogni campo passato con '' non tocca quello salvato,
// così possiamo aggiornare solo il set_id senza reincollare il token.
export const seventvTokens = {
  get(login) {
    return db.prepare('SELECT * FROM seventv_tokens WHERE login=?').get(String(login).toLowerCase()) || null;
  },
  set(login, { token, userId, username, setId } = {}) {
    const l = String(login).toLowerCase();
    const cur = this.get(l) || {};
    db.prepare(`INSERT INTO seventv_tokens (login, token, user_id, username, set_id, updated_at)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET
        token=CASE WHEN excluded.token!='' THEN excluded.token ELSE seventv_tokens.token END,
        user_id=CASE WHEN excluded.user_id!='' THEN excluded.user_id ELSE seventv_tokens.user_id END,
        username=CASE WHEN excluded.username!='' THEN excluded.username ELSE seventv_tokens.username END,
        set_id=CASE WHEN excluded.set_id!='' THEN excluded.set_id ELSE seventv_tokens.set_id END,
        updated_at=excluded.updated_at`)
      .run(l,
        token !== undefined ? String(token || '') : (cur.token || ''),
        userId !== undefined ? String(userId || '') : (cur.user_id || ''),
        username !== undefined ? String(username || '') : (cur.username || ''),
        setId !== undefined ? String(setId || '') : (cur.set_id || ''), now());
    return this.get(l);
  },
  scollega(login) { db.prepare('DELETE FROM seventv_tokens WHERE login=?').run(String(login).toLowerCase()); },
};

// ---------------------------------------------------------------- Login Telegram
// Mappa id-utente-Telegram → canale twitch, per "Accedi con Telegram" e la Mini
// App. Il collegamento si crea una volta sola da loggati (con un codice usa-e-getta).
export const tgLogin = {
  getByTg(tgId) {
    return db.prepare('SELECT * FROM telegram_login WHERE tg_id=?').get(String(tgId)) || null;
  },
  getByLogin(login) {
    return db.prepare('SELECT * FROM telegram_login WHERE login=? ORDER BY created_at DESC').get(String(login).toLowerCase()) || null;
  },
  // Collega tg_id ↔ login. Un tg_id → un solo canale (PK), un canale può avere
  // più tg_id (es. più dispositivi): sostituiamo l'eventuale tg_id già presente.
  link(tgId, login, { username = '', nome = '' } = {}) {
    db.prepare(`INSERT INTO telegram_login (tg_id, login, username, nome, created_at)
      VALUES (?,?,?,?,?)
      ON CONFLICT(tg_id) DO UPDATE SET login=excluded.login, username=excluded.username, nome=excluded.nome`)
      .run(String(tgId), String(login).toLowerCase(), String(username || ''), String(nome || ''), now());
    return this.getByTg(tgId);
  },
  unlinkByLogin(login) { db.prepare('DELETE FROM telegram_login WHERE login=?').run(String(login).toLowerCase()); },
  unlinkByTg(tgId) { db.prepare('DELETE FROM telegram_login WHERE tg_id=?').run(String(tgId)); },
};

// ---------------------------------------------------------------- IA locale (modello)
// Il modello auto-addestrato di ciascun canale (vocabolario + vettori semantici).
// Solo dati derivati dalla chat: si può cancellare senza perdere nulla di vero.
export const models = {
  get(channel) { return db.prepare('SELECT data FROM brain_model WHERE channel=?').get(String(channel).toLowerCase())?.data || null; },
  set(channel, data) {
    db.prepare(`INSERT INTO brain_model (channel, data, ts) VALUES (?,?,?)
      ON CONFLICT(channel) DO UPDATE SET data=excluded.data, ts=excluded.ts`)
      .run(String(channel).toLowerCase(), String(data || ''), now());
  },
  remove(channel) { db.prepare('DELETE FROM brain_model WHERE channel=?').run(String(channel).toLowerCase()); },
};

// ---------------------------------------------------------------- passkey (WebAuthn)
export const passkeys = {
  add({ login, credId, publicKey, alg = -7, signCount = 0, nome = '' }) {
    db.prepare(`INSERT INTO passkeys (login, cred_id, public_key, alg, sign_count, nome, created_at, last_used)
      VALUES (?,?,?,?,?,?,?,0)`)
      .run(String(login).toLowerCase(), credId, JSON.stringify(publicKey), alg, signCount, String(nome || '').slice(0, 40), now());
  },
  byLogin(login) {
    return db.prepare('SELECT * FROM passkeys WHERE login=? ORDER BY created_at DESC').all(String(login).toLowerCase());
  },
  byCredId(credId) {
    const r = db.prepare('SELECT * FROM passkeys WHERE cred_id=?').get(String(credId));
    if (!r) return null;
    return { ...r, publicKey: safeJson(r.public_key) };
  },
  bumpCounter(credId, signCount) {
    db.prepare('UPDATE passkeys SET sign_count=?, last_used=? WHERE cred_id=?').run(signCount, now(), String(credId));
  },
  remove(login, id) { db.prepare('DELETE FROM passkeys WHERE login=? AND id=?').run(String(login).toLowerCase(), id); },
  count(login) { return db.prepare('SELECT COUNT(*) c FROM passkeys WHERE login=?').get(String(login).toLowerCase()).c; },
};

// ---------------------------------------------------------------- citazioni (!cita)
export const quotes = {
  add(channel, text, by = '', meta = {}) {
    const ch = String(channel).toLowerCase();
    const n = (db.prepare('SELECT MAX(n) m FROM quotes WHERE channel=?').get(ch).m || 0) + 1;
    db.prepare('INSERT INTO quotes (channel, n, text, added_by, autore, data, ts) VALUES (?,?,?,?,?,?,?)')
      .run(ch, n, String(text).slice(0, 400), String(by).toLowerCase(),
           String(meta.autore || '').slice(0, 60), String(meta.data || '').slice(0, 20), now());
    return n;
  },
  get(channel, n) {
    return db.prepare('SELECT * FROM quotes WHERE channel=? AND n=?').get(String(channel).toLowerCase(), n) || null;
  },
  random(channel) {
    return db.prepare('SELECT * FROM quotes WHERE channel=? ORDER BY RANDOM() LIMIT 1').get(String(channel).toLowerCase()) || null;
  },
  list(channel) { return db.prepare('SELECT * FROM quotes WHERE channel=? ORDER BY n').all(String(channel).toLowerCase()); },
  remove(channel, n) { db.prepare('DELETE FROM quotes WHERE channel=? AND n=?').run(String(channel).toLowerCase(), n); },
  count(channel) { return db.prepare('SELECT COUNT(*) c FROM quotes WHERE channel=?').get(String(channel).toLowerCase()).c; },
  // import in blocco: salta i doppioni (confronto normalizzato) sia con l'esistente
  // sia dentro il lotto. Accetta stringhe OPPURE oggetti {testo, autore, data}
  // (per l'import x.la con nome utente e data). Ritorna { aggiunte, saltate }.
  addMany(channel, elementi, by = '') {
    const ch = String(channel).toLowerCase();
    const norm = (s) => String(s || '').toLowerCase().replace(/^[“"'«\s]+|[”"'»\s]+$/g, '').replace(/\s+/g, ' ').trim();
    const gia = new Set(this.list(ch).map((q) => norm(q.text)));
    const visti = new Set();
    let aggiunte = 0, saltate = 0;
    for (const raw of (Array.isArray(elementi) ? elementi : [])) {
      const o = (raw && typeof raw === 'object') ? raw : { testo: raw };
      const t = String(o.testo || o.text || '').replace(/^[“"'«\s]+|[”"'»\s]+$/g, '').trim().slice(0, 400);
      const k = norm(t);
      if (!k) { continue; }
      if (gia.has(k) || visti.has(k)) { saltate++; continue; }
      visti.add(k);
      this.add(ch, t, by, { autore: o.autore, data: o.data });
      aggiunte++;
    }
    return { aggiunte, saltate };
  },
};

// ---------------------------------------------------------------- moderatori (gestori delegati)
// Un moderatore è una persona che lo streamer autorizza a gestire il suo bot
// dalla dashboard. Si invita con un link (l'identità la conferma Twitch); ha
// pieno accesso di gestione TRANNE le azioni da proprietario (permessi, lista
// moderatori, disconnessione). Uno stesso moderatore può gestire più canali.
export const managers = {
  invita(channel, login, { display = '', invitedBy = '', token, expires, role = 'moderatore' }) {
    const ch = String(channel).toLowerCase(), l = String(login).toLowerCase();
    db.prepare(`INSERT INTO managers (channel, login, display, role, status, invite_token, invite_expires, invited_by, created_at)
      VALUES (?,?,?,?,'invitato',?,?,?,?)
      ON CONFLICT(channel, login) DO UPDATE SET
        display=CASE WHEN excluded.display!='' THEN excluded.display ELSE managers.display END,
        role=excluded.role, invite_token=excluded.invite_token, invite_expires=excluded.invite_expires,
        invited_by=excluded.invited_by,
        status=CASE WHEN managers.status='attivo' THEN 'attivo' ELSE 'invitato' END`)
      .run(ch, l, display, role, token, expires, String(invitedBy).toLowerCase(), now());
    return this.get(ch, l);
  },
  get(channel, login) {
    return db.prepare('SELECT * FROM managers WHERE channel=? AND login=?')
      .get(String(channel).toLowerCase(), String(login).toLowerCase()) || null;
  },
  byId(channel, id) {
    return db.prepare('SELECT * FROM managers WHERE channel=? AND id=?').get(String(channel).toLowerCase(), id) || null;
  },
  listByChannel(channel) {
    return db.prepare('SELECT * FROM managers WHERE channel=? ORDER BY status DESC, created_at').all(String(channel).toLowerCase());
  },
  // canali che questo login gestisce ATTIVAMENTE (per lo switcher / login mod)
  attiviByLogin(login) {
    return db.prepare("SELECT * FROM managers WHERE login=? AND status='attivo' ORDER BY last_seen DESC")
      .all(String(login).toLowerCase());
  },
  // Inviti a moderatore ANCORA PENDENTI (non accettati) e non scaduti per un
  // login: servono per abbinare un moderatore appena fa login con Twitch, anche
  // senza usare il link d'invito.
  pendentiByLogin(login) {
    return db.prepare("SELECT * FROM managers WHERE login=? AND status='invitato' AND (invite_expires=0 OR invite_expires>?)")
      .all(String(login).toLowerCase(), now());
  },
  byInvite(token) {
    if (!token) return null;
    return db.prepare('SELECT * FROM managers WHERE invite_token=?').get(String(token)) || null;
  },
  attiva(channel, login, display = '') {
    db.prepare(`UPDATE managers SET status='attivo', invite_token='', invite_expires=0,
      display=CASE WHEN ?!='' THEN ? ELSE display END, last_seen=? WHERE channel=? AND login=?`)
      .run(display, display, now(), String(channel).toLowerCase(), String(login).toLowerCase());
    return this.get(channel, login);
  },
  touch(channel, login) {
    db.prepare('UPDATE managers SET last_seen=? WHERE channel=? AND login=?')
      .run(now(), String(channel).toLowerCase(), String(login).toLowerCase());
  },
  remove(channel, id) { db.prepare('DELETE FROM managers WHERE channel=? AND id=?').run(String(channel).toLowerCase(), id); },
};

// ---------------------------------------------------------------- notifiche Telegram
// Config per canale del bot Telegram PROPRIO dello streamer (token + gruppo).
// Il token è un segreto: non esce MAI verso il browser (vedi /api/me).
// Config notifiche Discord (webhook) per canale. Vive dentro streamers.settings
// (chiave `discord`), così non serve una tabella dedicata. Campi:
//   { webhook, messaggio, nome_bot, avatar, attivo, ultima_live }
export const dcConf = {
  get(channel) {
    const s = streamers.get(channel);
    return (s && s.settings && s.settings.discord) ? s.settings.discord : null;
  },
  set(channel, campi = {}) {
    const c = String(channel).toLowerCase();
    const s = streamers.get(c);
    const cur = (s && s.settings && s.settings.discord) || { webhook: '', messaggio: '', nome_bot: '', avatar: '', attivo: 0, ultima_live: '' };
    const v = {
      webhook: campi.webhook !== undefined ? String(campi.webhook) : cur.webhook,
      messaggio: campi.messaggio !== undefined ? String(campi.messaggio) : cur.messaggio,
      nome_bot: campi.nomeBot !== undefined ? String(campi.nomeBot) : cur.nome_bot,
      avatar: campi.avatar !== undefined ? String(campi.avatar) : cur.avatar,
      attivo: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : cur.attivo,
      ultima_live: campi.ultimaLive !== undefined ? String(campi.ultimaLive) : (cur.ultima_live || ''),
    };
    const settings = (s && s.settings) || {};
    streamers.setSettings(c, { ...settings, discord: v });
    return v;
  },
  setUltimaLive(channel, streamId) { this.set(channel, { ultimaLive: String(streamId || '') }); },
};

const _csv = (x) => (Array.isArray(x) ? x : String(x || '').split(','))
  .map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
const _inCsv = (campo, valore) => {
  const l = _csv(campo);
  return !l.length || l.includes(String(valore || '').toLowerCase());
};

// DOVE mandare le notifiche: piu gruppi/canali, ognuno con il suo topic e i suoi
// filtri (quali eventi, quali streamer). Vuoto = nessun filtro, cioe tutto.
export const tgDest = {
  lista(channel) {
    return db.prepare('SELECT * FROM telegram_dest WHERE channel=? ORDER BY id').all(String(channel).toLowerCase());
  },
  get(channel, id) {
    return db.prepare('SELECT * FROM telegram_dest WHERE channel=? AND id=?').get(String(channel).toLowerCase(), Number(id) || 0) || null;
  },
  // le destinazioni a cui questo evento, per questo streamer, deve arrivare
  perEvento(channel, evento, streamerLogin) {
    return this.lista(channel).filter((d) => d.attivo
      && _inCsv(d.eventi, evento)
      && _inCsv(d.streamer, streamerLogin || channel));
  },
  aggiungi({ channel, chatId, titolo = '', tipo = 'group', threadId = '', threadNome = '', eventi = '', streamer = '', pin = 0, attivo = 1 }) {
    const ch = String(channel).toLowerCase();
    const info = db.prepare(`INSERT INTO telegram_dest (channel, chat_id, titolo, tipo, thread_id, thread_nome, eventi, streamer, pin, attivo, ts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(channel, chat_id, thread_id) DO UPDATE SET titolo=excluded.titolo, tipo=excluded.tipo,
        thread_nome=excluded.thread_nome, attivo=excluded.attivo, ts=excluded.ts`)
      .run(ch, String(chatId), String(titolo).slice(0, 120), String(tipo), String(threadId || ''), String(threadNome || '').slice(0, 80),
        _csv(eventi).join(','), _csv(streamer).join(','), pin ? 1 : 0, attivo ? 1 : 0, Date.now());
    return info.lastInsertRowid
      || (db.prepare('SELECT id FROM telegram_dest WHERE channel=? AND chat_id=? AND thread_id=?')
        .get(ch, String(chatId), String(threadId || ''))?.id || 0);
  },
  aggiorna(channel, id, campi = {}) {
    const d = this.get(channel, id);
    if (!d) return null;
    const v = {
      titolo: campi.titolo !== undefined ? String(campi.titolo).slice(0, 120) : d.titolo,
      thread_id: campi.threadId !== undefined ? String(campi.threadId || '') : d.thread_id,
      thread_nome: campi.threadNome !== undefined ? String(campi.threadNome || '').slice(0, 80) : d.thread_nome,
      eventi: campi.eventi !== undefined ? _csv(campi.eventi).join(',') : d.eventi,
      streamer: campi.streamer !== undefined ? _csv(campi.streamer).join(',') : d.streamer,
      pin: campi.pin !== undefined ? (campi.pin ? 1 : 0) : d.pin,
      attivo: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : d.attivo,
    };
    db.prepare(`UPDATE telegram_dest SET titolo=@titolo, thread_id=@thread_id, thread_nome=@thread_nome,
      eventi=@eventi, streamer=@streamer, pin=@pin, attivo=@attivo, ts=@ts WHERE id=@id`)
      .run({ ...v, id: d.id, ts: Date.now() });
    return this.get(channel, id);
  },
  rimuovi(channel, id) {
    return db.prepare('DELETE FROM telegram_dest WHERE channel=? AND id=?')
      .run(String(channel).toLowerCase(), Number(id) || 0).changes > 0;
  },
  setMsgId(id, msgId) {
    db.prepare('UPDATE telegram_dest SET msg_id=? WHERE id=?').run(String(msgId || ''), Number(id) || 0);
  },
  // Migrazione dal modello a UNA destinazione: se il canale non ne ha ancora
  // nessuna ma aveva un gruppo collegato, quello diventa la prima destinazione.
  // Idempotente: gira a ogni lettura senza duplicare nulla.
  migra(channel, conf) {
    const ch = String(channel).toLowerCase();
    if (!conf?.chat_id) return;
    const n = db.prepare('SELECT COUNT(*) c FROM telegram_dest WHERE channel=?').get(ch)?.c || 0;
    if (n > 0) return;
    this.aggiungi({ channel: ch, chatId: conf.chat_id, titolo: conf.chat_titolo || '', tipo: 'group', pin: conf.pin_live ? 1 : 0 });
  },
};

// Chat e topic che il bot ha visto passare. Serve quando il webhook e acceso:
// in quel caso getUpdates e vietato da Telegram, ma ogni messaggio arriva
// comunque a noi — quindi i posti li impariamo da li, senza spegnere niente.
export const tgVisti = {
  segna({ channel, chatId, threadId = '', titolo = '', tipo = 'group', threadNome = '' }) {
    if (!channel || !chatId) return;
    const ch = String(channel).toLowerCase();
    const tid = String(threadId || '');
    const prec = db.prepare('SELECT thread_nome FROM telegram_visto WHERE channel=? AND chat_id=? AND thread_id=?')
      .get(ch, String(chatId), tid);
    db.prepare(`INSERT INTO telegram_visto (channel, chat_id, thread_id, titolo, tipo, thread_nome, ts)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(channel, chat_id, thread_id) DO UPDATE SET titolo=excluded.titolo, tipo=excluded.tipo,
        thread_nome=excluded.thread_nome, ts=excluded.ts`)
      .run(ch, String(chatId), tid, String(titolo || '').slice(0, 120), String(tipo || 'group'),
        String(threadNome || prec?.thread_nome || (tid ? 'topic ' + tid : '')).slice(0, 80), Date.now());
  },
  lista(channel) {
    return db.prepare('SELECT * FROM telegram_visto WHERE channel=? ORDER BY ts DESC LIMIT 60')
      .all(String(channel).toLowerCase());
  },
  pulisci(channel) {
    db.prepare('DELETE FROM telegram_visto WHERE channel=?').run(String(channel).toLowerCase());
  },
};

// I feed da cui accorgersi dei post nuovi. Una PRESA generica: qualunque cosa
// sappia produrre un RSS, un Atom o un JSON Feed diventa una sorgente.
export const feedFonti = {
  lista(channel) {
    return db.prepare('SELECT * FROM feed_fonte WHERE channel=? ORDER BY id').all(String(channel).toLowerCase());
  },
  get(channel, id) {
    return db.prepare('SELECT * FROM feed_fonte WHERE channel=? AND id=?')
      .get(String(channel).toLowerCase(), Number(id) || 0) || null;
  },
  attivi() {
    return db.prepare('SELECT * FROM feed_fonte WHERE attivo=1').all();
  },
  aggiungi({ channel, nome = '', evento = 'ig', url, messaggio = '' }) {
    const info = db.prepare('INSERT INTO feed_fonte (channel, nome, evento, url, messaggio, attivo, ts) VALUES (?,?,?,?,?,1,?)')
      .run(String(channel).toLowerCase(), String(nome || '').slice(0, 60), String(evento || 'ig'),
        String(url).slice(0, 500), String(messaggio || '').slice(0, 600), Date.now());
    return info.lastInsertRowid;
  },
  aggiorna(channel, id, campi = {}) {
    const f = this.get(channel, id);
    if (!f) return null;
    db.prepare('UPDATE feed_fonte SET nome=?, evento=?, messaggio=?, attivo=?, ts=? WHERE id=?')
      .run(campi.nome !== undefined ? String(campi.nome).slice(0, 60) : f.nome,
        campi.evento !== undefined ? String(campi.evento) : f.evento,
        campi.messaggio !== undefined ? String(campi.messaggio).slice(0, 600) : f.messaggio,
        campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : f.attivo,
        Date.now(), f.id);
    return this.get(channel, id);
  },
  rimuovi(channel, id) {
    return db.prepare('DELETE FROM feed_fonte WHERE channel=? AND id=?')
      .run(String(channel).toLowerCase(), Number(id) || 0).changes > 0;
  },
  // esito di un controllo: cosa abbiamo visto e, se e andata male, perche
  segnaEsito(id, { ultimoId, titolo = '', url = '', errore = '' } = {}) {
    const f = db.prepare('SELECT * FROM feed_fonte WHERE id=?').get(Number(id) || 0);
    if (!f) return;
    db.prepare('UPDATE feed_fonte SET ultimo_id=?, ultimo_titolo=?, ultimo_url=?, visto_ts=?, errore=? WHERE id=?')
      .run(ultimoId !== undefined ? String(ultimoId || '') : f.ultimo_id,
        titolo ? String(titolo).slice(0, 200) : f.ultimo_titolo,
        url ? String(url).slice(0, 400) : f.ultimo_url,
        Date.now(), String(errore || '').slice(0, 200), f.id);
  },
};

// Gli avvisi live gia mandati, per destinazione E per streamer: senza questo,
// la diretta di un amico che finisce cancellerebbe l'avviso della mia.
export const tgMsg = {
  segna(channel, destId, streamer, msgId) {
    db.prepare(`INSERT INTO telegram_msg (channel, dest_id, streamer, msg_id, ts) VALUES (?,?,?,?,?)
      ON CONFLICT(channel, dest_id, streamer) DO UPDATE SET msg_id=excluded.msg_id, ts=excluded.ts`)
      .run(String(channel).toLowerCase(), Number(destId) || 0, String(streamer).toLowerCase(), String(msgId || ''), Date.now());
  },
  perStreamer(channel, streamer) {
    return db.prepare('SELECT * FROM telegram_msg WHERE channel=? AND streamer=? AND msg_id<>\'\'')
      .all(String(channel).toLowerCase(), String(streamer).toLowerCase());
  },
  pulisci(channel, streamer) {
    db.prepare('DELETE FROM telegram_msg WHERE channel=? AND streamer=?')
      .run(String(channel).toLowerCase(), String(streamer).toLowerCase());
  },
};

// ALTRI streamer di cui annunciare la diretta (oltre alla propria).
export const tgAmici = {
  lista(channel) {
    return db.prepare('SELECT * FROM telegram_amico WHERE channel=? ORDER BY login').all(String(channel).toLowerCase());
  },
  attivi(channel) { return this.lista(channel).filter((a) => a.attivo); },
  aggiungi({ channel, login, display = '', messaggio = '' }) {
    const ch = String(channel).toLowerCase();
    const lg = String(login || '').trim().toLowerCase().replace(/^@/, '');
    if (!lg) return 0;
    db.prepare(`INSERT INTO telegram_amico (channel, login, display, messaggio, attivo, ts) VALUES (?,?,?,?,1,?)
      ON CONFLICT(channel, login) DO UPDATE SET display=excluded.display, messaggio=excluded.messaggio, ts=excluded.ts`)
      .run(ch, lg, String(display || lg).slice(0, 60), String(messaggio || '').slice(0, 600), Date.now());
    return db.prepare('SELECT id FROM telegram_amico WHERE channel=? AND login=?').get(ch, lg)?.id || 0;
  },
  aggiorna(channel, id, campi = {}) {
    const ch = String(channel).toLowerCase();
    const a = db.prepare('SELECT * FROM telegram_amico WHERE channel=? AND id=?').get(ch, Number(id) || 0);
    if (!a) return null;
    db.prepare('UPDATE telegram_amico SET messaggio=?, attivo=?, ts=? WHERE id=?')
      .run(campi.messaggio !== undefined ? String(campi.messaggio).slice(0, 600) : a.messaggio,
        campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : a.attivo, Date.now(), a.id);
    return db.prepare('SELECT * FROM telegram_amico WHERE id=?').get(a.id);
  },
  rimuovi(channel, id) {
    return db.prepare('DELETE FROM telegram_amico WHERE channel=? AND id=?')
      .run(String(channel).toLowerCase(), Number(id) || 0).changes > 0;
  },
  setUltimaLive(channel, login, streamId) {
    db.prepare('UPDATE telegram_amico SET ultima_live=? WHERE channel=? AND login=?')
      .run(String(streamId || ''), String(channel).toLowerCase(), String(login).toLowerCase());
  },
  // tutti i canali che hanno almeno un amico attivo (per il giro di controllo)
  canaliConAmici() {
    return db.prepare('SELECT DISTINCT channel FROM telegram_amico WHERE attivo=1').all().map((r) => r.channel);
  },
  // Allinea la lista automatica ai membri della community: chi entra compare, chi
  // esce sparisce. Non tocca chi hai aggiunto a mano (fonte='mano'), e non
  // aggiunge mai te stesso. Idempotente: girarla mille volte non cambia nulla.
  sincronizzaCommunity(channel, membri) {
    const ch = String(channel).toLowerCase();
    const voluti = new Map();
    for (const m of (membri || [])) {
      const lg = String(m.login || '').toLowerCase();
      if (!lg || lg === ch) continue;
      voluti.set(lg, String(m.display || lg).slice(0, 60));
    }
    const ora = db.prepare("SELECT login FROM telegram_amico WHERE channel=? AND fonte='community'").all(ch).map((r) => r.login);
    for (const l of ora) if (!voluti.has(l)) db.prepare("DELETE FROM telegram_amico WHERE channel=? AND login=? AND fonte='community'").run(ch, l);
    for (const [lg, disp] of voluti) {
      db.prepare(`INSERT INTO telegram_amico (channel, login, display, messaggio, attivo, fonte, ts) VALUES (?,?,?,'',1,'community',?)
        ON CONFLICT(channel, login) DO UPDATE SET display=excluded.display`)
        .run(ch, lg, disp, Date.now());
    }
    return voluti.size;
  },
  // Tutti gli streamer da guardare per questo canale: quelli a mano + la community
  // (se il canale l'ha accesa). La distinzione la porta la colonna `fonte`.
  daGuardare(channel) {
    return this.attivi(channel);
  },
};

export const tgConf = {
  get(channel) {
    return db.prepare('SELECT * FROM telegram WHERE channel=?').get(String(channel).toLowerCase()) || null;
  },
  set(channel, campi = {}) {
    const c = String(channel).toLowerCase();
    const cur = this.get(c) || { token: '', chat_id: '', chat_titolo: '', bot_username: '', attivo: 0, messaggio: '', ultima_live: '', pin_live: 1, msg_id: '', msg_id_tk: '' };
    const v = {
      token: campi.token !== undefined ? String(campi.token) : cur.token,
      chat_id: campi.chatId !== undefined ? String(campi.chatId) : cur.chat_id,
      community_live: campi.communityLive !== undefined ? (campi.communityLive ? 1 : 0) : (cur.community_live || 0),
      chat_titolo: campi.chatTitolo !== undefined ? String(campi.chatTitolo) : cur.chat_titolo,
      bot_username: campi.botUsername !== undefined ? String(campi.botUsername) : cur.bot_username,
      attivo: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : cur.attivo,
      messaggio: campi.messaggio !== undefined ? String(campi.messaggio) : cur.messaggio,
      ultima_live: campi.ultimaLive !== undefined ? String(campi.ultimaLive) : cur.ultima_live,
      pin_live: campi.pinLive !== undefined ? (campi.pinLive ? 1 : 0) : (cur.pin_live ?? 1),
      msg_id: campi.msgId !== undefined ? String(campi.msgId) : (cur.msg_id ?? ''),
      msg_id_tk: campi.msgIdTk !== undefined ? String(campi.msgIdTk) : (cur.msg_id_tk ?? ''),
    };
    db.prepare(`INSERT INTO telegram (channel, token, chat_id, chat_titolo, bot_username, attivo, messaggio, ultima_live, pin_live, msg_id, msg_id_tk, community_live, ts)
      VALUES (@channel, @token, @chat_id, @chat_titolo, @bot_username, @attivo, @messaggio, @ultima_live, @pin_live, @msg_id, @msg_id_tk, @community_live, @ts)
      ON CONFLICT(channel) DO UPDATE SET token=excluded.token, chat_id=excluded.chat_id, chat_titolo=excluded.chat_titolo, community_live=excluded.community_live,
        bot_username=excluded.bot_username, attivo=excluded.attivo, messaggio=excluded.messaggio,
        ultima_live=excluded.ultima_live, pin_live=excluded.pin_live, msg_id=excluded.msg_id, msg_id_tk=excluded.msg_id_tk, ts=excluded.ts`)
      .run({ channel: c, ...v, ts: now() });
    return this.get(c);
  },
  setUltimaLive(channel, streamId) {
    db.prepare('UPDATE telegram SET ultima_live=? WHERE channel=?').run(String(streamId || ''), String(channel).toLowerCase());
  },
  setYtUltimo(channel, videoId) {
    db.prepare('UPDATE telegram SET yt_ultimo=? WHERE channel=?').run(String(videoId || ''), String(channel).toLowerCase());
  },
  setIgUltimo(channel, postId) {
    db.prepare('UPDATE telegram SET ig_ultimo=? WHERE channel=?').run(String(postId || ''), String(channel).toLowerCase());
  },
  setTkUltimo(channel, postId) {
    db.prepare('UPDATE telegram SET tk_ultimo=? WHERE channel=?').run(String(postId || ''), String(channel).toLowerCase());
  },
  // salva (o azzera) il message_id dell'avviso live Twitch, per poterlo eliminare
  setMsgId(channel, msgId) {
    db.prepare('UPDATE telegram SET msg_id=? WHERE channel=?').run(String(msgId || ''), String(channel).toLowerCase());
  },
  // idem per l'avviso live TikTok (message_id separato: Twitch e TikTok possono
  // essere live insieme, quindi non devono sovrascriversi a vicenda)
  setMsgIdTk(channel, msgId) {
    db.prepare('UPDATE telegram SET msg_id_tk=? WHERE channel=?').run(String(msgId || ''), String(channel).toLowerCase());
  },
  // modalità interattiva (webhook): accende/spegne e memorizza il segreto del path
  setInterattivo(channel, attivo, secret) {
    db.prepare('UPDATE telegram SET interattivo=?, webhook_secret=? WHERE channel=?')
      .run(attivo ? 1 : 0, String(secret || ''), String(channel).toLowerCase());
  },
  // chat privata: risponde SOLO al proprietario ('me') o è spenta ('off'). Mai ad
  // altri (in privato il bot è accessibile solo da me). Default 'me'.
  setDmModo(channel, modo) {
    const m = modo === 'off' ? 'off' : 'me';
    db.prepare('UPDATE telegram SET dm_modo=? WHERE channel=?').run(m, String(channel).toLowerCase());
  },
  // lega (o slega, con id vuoto) l'account Telegram del proprietario per il "solo me"
  setOwnerTg(channel, tgId, nome) {
    db.prepare('UPDATE telegram SET owner_tg_id=?, owner_tg_nome=? WHERE channel=?')
      .run(String(tgId || ''), String(nome || '').slice(0, 60), String(channel).toLowerCase());
  },
  // trova il canale dal segreto del webhook (per instradare gli update in arrivo)
  getBySecret(secret) {
    const s = String(secret || '');
    if (!s) return null;
    return db.prepare('SELECT * FROM telegram WHERE webhook_secret=? AND interattivo=1').get(s) || null;
  },
  // tutti i canali con la modalità interattiva accesa e un token: servono per
  // ri-registrare il webhook all'avvio (es. dopo un cambio di dominio/baseUrl).
  listInterattivi() {
    return db.prepare("SELECT * FROM telegram WHERE interattivo=1 AND token<>'' AND webhook_secret<>''").all();
  },
  remove(channel) { db.prepare('DELETE FROM telegram WHERE channel=?').run(String(channel).toLowerCase()); },
};

// ---------------------------------------------------------------- compleanni
// Compleanni dei membri del gruppo Telegram (per gli auguri automatici).
export const compleanni = {
  set(channel, tgUserId, nome, giorno, mese) {
    db.prepare(`INSERT INTO compleanni (channel, tg_user_id, nome, giorno, mese, last_auguri, ts)
      VALUES (?,?,?,?,?,0,?)
      ON CONFLICT(channel, tg_user_id) DO UPDATE SET nome=excluded.nome, giorno=excluded.giorno, mese=excluded.mese`)
      .run(String(channel).toLowerCase(), String(tgUserId), String(nome || ''), giorno | 0, mese | 0, now());
    return this.get(channel, tgUserId);
  },
  get(channel, tgUserId) {
    return db.prepare('SELECT * FROM compleanni WHERE channel=? AND tg_user_id=?')
      .get(String(channel).toLowerCase(), String(tgUserId)) || null;
  },
  list(channel) {
    return db.prepare('SELECT * FROM compleanni WHERE channel=? ORDER BY mese, giorno')
      .all(String(channel).toLowerCase());
  },
  oggi(channel, giorno, mese) {
    return db.prepare('SELECT * FROM compleanni WHERE channel=? AND giorno=? AND mese=?')
      .all(String(channel).toLowerCase(), giorno | 0, mese | 0);
  },
  remove(channel, tgUserId) {
    db.prepare('DELETE FROM compleanni WHERE channel=? AND tg_user_id=?')
      .run(String(channel).toLowerCase(), String(tgUserId));
  },
  markAuguri(channel, tgUserId, anno) {
    db.prepare('UPDATE compleanni SET last_auguri=? WHERE channel=? AND tg_user_id=?')
      .run(anno | 0, String(channel).toLowerCase(), String(tgUserId));
  },
};

// ---------------------------------------------------------------- membri Telegram
// Roster dei membri visti scrivere nel gruppo (Telegram non espone l'elenco
// completo: lo costruiamo dai messaggi + dagli amministratori su richiesta).
export const membri = {
  touch(channel, tgUserId, nome, username) {
    const id = String(tgUserId || '');
    if (!id) return;
    db.prepare(`INSERT INTO tg_membri (channel, tg_user_id, nome, username, ultimo)
      VALUES (?,?,?,?,?)
      ON CONFLICT(channel, tg_user_id) DO UPDATE SET
        nome=excluded.nome, username=excluded.username, ultimo=excluded.ultimo`)
      .run(String(channel).toLowerCase(), id, String(nome || ''), String(username || ''), now());
  },
  list(channel, limit = 200) {
    return db.prepare('SELECT * FROM tg_membri WHERE channel=? ORDER BY ultimo DESC LIMIT ?')
      .all(String(channel).toLowerCase(), limit | 0);
  },
};

// ---------------------------------------------------------------- memoria
export const memory = {
  logMessage(channel, user, display, text, fromBot = false) {
    db.prepare('INSERT INTO messages (channel, user, display, text, from_bot, ts) VALUES (?,?,?,?,?,?)')
      .run(channel, user, display, text, fromBot ? 1 : 0, now());
  },
  recentMessages(channel, limit = 40) {
    return db.prepare('SELECT * FROM messages WHERE channel=? ORDER BY ts DESC LIMIT ?').all(channel, limit).reverse();
  },
  messagesSince(channel, sinceTs) {
    return db.prepare('SELECT * FROM messages WHERE channel=? AND ts>=? ORDER BY ts').all(channel, sinceTs);
  },
  messageRate(channel, windowMs = 30000) {   // messaggi al minuto nell'ultima finestra (per rilevare hype)
    const n = db.prepare('SELECT COUNT(*) c FROM messages WHERE channel=? AND ts>=? AND from_bot=0').get(channel, now() - windowMs).c;
    return n * (60000 / windowMs);
  },
  // chatter recenti (persone che hanno scritto), più recenti prima: serve alla
  // predizione del nick del comando vocale ("vip a chiara" → chiara_3008).
  recentChatters(channel, sinceMs = 6 * 3600_000, limit = 400) {
    return db.prepare(`SELECT user, MAX(display) display, MAX(ts) ts FROM messages
      WHERE channel=? AND ts>=? AND from_bot=0 AND user NOT LIKE '[%'
      GROUP BY user ORDER BY ts DESC LIMIT ?`).all(channel, now() - sinceMs, limit);
  },
  addUserMemory(channel, user, note) {
    db.prepare('INSERT INTO user_memories (channel, user, note, ts) VALUES (?,?,?,?)').run(channel, user.toLowerCase(), note, now());
    // tiene al massimo 30 ricordi per utente per canale
    db.prepare(`DELETE FROM user_memories WHERE channel=? AND user=? AND id NOT IN
      (SELECT id FROM user_memories WHERE channel=? AND user=? ORDER BY ts DESC LIMIT 30)`)
      .run(channel, user.toLowerCase(), channel, user.toLowerCase());
  },
  userMemories(channel, user, limit = 10) {
    return db.prepare('SELECT note, ts FROM user_memories WHERE channel=? AND user=? ORDER BY ts DESC LIMIT ?')
      .all(channel, user.toLowerCase(), limit);
  },
  addLesson(channel, text) {
    db.prepare('INSERT INTO lessons (channel, text, ts) VALUES (?,?,?)').run(channel, text, now());
    db.prepare(`DELETE FROM lessons WHERE channel=? AND id NOT IN
      (SELECT id FROM lessons WHERE channel=? ORDER BY ts DESC LIMIT 50)`).run(channel, channel);
  },
  lessons(channel, limit = 15) {
    return db.prepare('SELECT text, ts FROM lessons WHERE channel=? ORDER BY ts DESC LIMIT ?').all(channel, limit);
  },
  setFact(channel, key, value) {
    db.prepare(`INSERT INTO facts (channel, key, value, ts) VALUES (?,?,?,?)
      ON CONFLICT(channel, key) DO UPDATE SET value=excluded.value, ts=excluded.ts`).run(channel, key, value, now());
  },
  facts(channel) { return db.prepare('SELECT key, value FROM facts WHERE channel=?').all(channel); },
  setStreamContext(channel, description) {
    db.prepare(`INSERT INTO stream_context (channel, description, ts) VALUES (?,?,?)
      ON CONFLICT(channel) DO UPDATE SET description=excluded.description, ts=excluded.ts`).run(channel, description, now());
  },
  streamContext(channel, maxAgeMs = 10 * 60 * 1000) {
    const r = db.prepare('SELECT description, ts FROM stream_context WHERE channel=?').get(channel);
    if (!r || now() - r.ts > maxAgeMs) return null;
    return r.description;
  },
};

// ---------------------------------------------------------------- contatori a comando
// Contatori configurabili (morti, tentativi, parole…): valore incrementabile da
// comando chat (mod/streamer), da parola automatica in chat, o da riscatto punti.
// ── Pagina link pubblica /u/<login> ─────────────────────────────────────────
// Vive QUI, non su andryxify.it: la pagina è di SocialBot, quindi i dati stanno
// nel nostro DB e la serviamo noi. Prima erano sul sito e servivano un token
// Twitch a ogni salvataggio, l'abilitazione "approved" e uno schema doppio
// v1/v2 — tre modi diversi di non funzionare per chi voleva solo dei link.
//
// Il contenuto è una lista di BLOCCHI in ordine (non solo link), e l'aspetto è
// un TEMA con colori, sfondo, font e forme: così lo streamer può costruire la
// pagina come la immagina invece di riempire cinque campi fissi.
export const TEMPLATE_LINKPAGE = ['minimal', 'neon', 'retro', 'sunset', 'glass', 'brutal', 'pastello',
  'cyber', 'vapor', 'oro', 'oceano', 'foresta', 'ghiaccio', 'lava', 'bubblegum'];
export const FONT_LINKPAGE = ['system', 'inter', 'mono', 'serif', 'condensato', 'tondo'];
export const ICONE_LINKPAGE = ['link', 'twitch', 'youtube', 'instagram', 'tiktok', 'discord', 'spotify',
  'x', 'telegram', 'kick', 'github', 'reddit', 'threads', 'facebook', 'whatsapp', 'twitter',
  'cuore', 'stella', 'regalo', 'carrello', 'calendario', 'mail', 'musica', 'video', 'scarica', 'gioco', 'caffe', 'soldi'];
export const TIPI_BLOCCO = ['link', 'titolo', 'testo', 'badge', 'separatore', 'spazio', 'social', 'embed', 'immagine', 'diretta', 'eroe', 'griglia', 'scritta', 'numeri', 'faq', 'conto'];
// Quanto si MUOVE la pagina mentre la si scorre. "dolce" = i contenuti
// compaiono entrando. "cinema" = in più: la foto della copertina va in
// parallasse, i titoli si rivelano parola per parola, le immagini si
// riavvicinano. Tutto in CSS (animation-timeline), zero JavaScript.
export const MOVIMENTI = ['nessuno', 'dolce', 'cinema', 'crawl'];
// Ogni blocco può occupare tutta la riga o dividerla: è così che si mettono le
// cose UNA ACCANTO ALL'ALTRA invece che una sotto l'altra.
// Sono FRAZIONI ESATTE di una riga a 12 colonne: un terzo occupa un terzo e
// basta, e se accanto non c'è nient'altro lo spazio resta libero. (Prima
// crescevano per riempire la riga, quindi "un terzo" diventava metà o due terzi
// a seconda di quanti erano: imprevedibile.)
export const LARGHEZZE_BLOCCO = ['piena', 'treQuarti', 'dueTerzi', 'meta', 'terzo', 'quarto'];
// ...e può entrare a modo suo, invece di seguire l'animazione della pagina.
// Allineamento di una SEZIONE. Una sezione è un gruppo di blocchi consecutivi:
// si chiude con una riga divisoria, oppure quando cambia il tipo di contenuto o
// l'allineamento. Non aggiunge spazio — è solo il modo di dire "questi vanno
// insieme, e vanno messi così".
export const ALLINEAMENTI_BLOCCO = ['auto', 'sinistra', 'centro', 'destra'];
export const ENTRATE_BLOCCO = ['auto', 'nessuna', 'sfuma', 'sali', 'scala', 'sinistra', 'destra', 'ruota'];
// Come sono disposti i contenuti. "colonna" è la classica lista di bottoni;
// "rivista" li affianca in una griglia su schermo largo; "sezioni" li distanzia
// e li ingrandisce, per una pagina che si SCORRE invece di leggersi in un colpo.
export const DISPOSIZIONI = ['colonna', 'rivista', 'sezioni'];
// Come si incorpora un contenuto: 'auto' lo decide il provider (un brano Spotify
// è basso, uno short è verticale, un video è 16:9), gli altri li forza chi
// costruisce la pagina.
export const FORMATI_EMBED = ['auto', 'video', 'quadrato', 'verticale', 'alto', 'medio', 'compatto', 'pagina'];
// Blocco "diretta": il player del canale sempre presente. Così non serve
// accendere e spegnere un "sono live": quando la diretta parte si vede, quando
// è finita il player mostra da sé che il canale è offline.
export const PIATTAFORME_DIRETTA = ['twitch', 'kick', 'youtube'];
export const LIMITI_LINKPAGE = {
  headline: 80, tagline: 200, label: 60, sotto: 90, url: 500,
  blocchi: 40, social: 12, testo: 500, titolo: 60,
};

// Riconosce la piattaforma dall'indirizzo: così l'icona giusta arriva da sé e
// nessuno deve scegliere un'emoji.
const DA_HOST = [
  [/(^|\.)twitch\.tv$/, 'twitch'], [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)discord\.(gg|com)$/, 'discord'], [/(^|\.)spotify\.com$/, 'spotify'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'x'], [/(^|\.)t\.me$|(^|\.)telegram\.(me|org)$/, 'telegram'],
  [/(^|\.)kick\.com$/, 'kick'], [/(^|\.)github\.com$/, 'github'],
  [/(^|\.)reddit\.com$/, 'reddit'], [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)facebook\.com$/, 'facebook'], [/(^|\.)wa\.me$|(^|\.)whatsapp\.com$/, 'whatsapp'],
  [/(^|\.)(paypal\.(me|com)|streamlabs\.com|streamelements\.com)$/, 'soldi'],
  [/(^|\.)(ko-fi\.com|buymeacoffee\.com|patreon\.com)$/, 'caffe'],
  [/(^|\.)(amazon\.[a-z.]+|amzn\.to|etsy\.com|shopify\.com)$/, 'carrello'],
  [/(^|\.)steam(community|powered)\.com$/, 'gioco'],
];
export function iconaDaUrl(u) {
  try { const h = new URL(String(u)).hostname.toLowerCase().replace(/^www\./, '');
    for (const [re, ico] of DA_HOST) if (re.test(h)) return ico;
  } catch { /* url non valido */ }
  return 'link';
}

const TEMA_DEF = {
  sfondoTipo: 'tinta',       // tinta | gradiente | immagine
  bg: '', bg2: '', angolo: 160, sfondoUrl: '',
  effetto: 'nessuno',        // nessuno | aurora | maglia | grana | bolle
  testo: '', accent: '', card: '', bordo: '',
  font: 'system',
  raggio: 14,                // spigoli (0) → pillola (999)
  stileBtn: 'pieno',         // pieno | contorno | vetro
  ombra: true,
  anim: 'rise',              // nessuna | fade | rise | pop
  avatarForma: 'cerchio',    // cerchio | quadrato | nessuno
  larghezza: 30,             // rem: quanto è larga la colonna
  allinea: 'centro',         // centro | sinistra
};

// Visite della pagina link: si contano e si riassumono, nient'altro.
export const visitePagina = {
  conta(channel) {
    const g = new Date().toISOString().slice(0, 10);
    db.prepare(`INSERT INTO link_page_visite (channel, giorno, viste) VALUES (?, ?, 1)
      ON CONFLICT(channel, giorno) DO UPDATE SET viste = viste + 1`).run(String(channel).toLowerCase(), g);
  },
  riassunto(channel) {
    const c = String(channel).toLowerCase();
    const giorno = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const somma = (da) => db.prepare('SELECT COALESCE(SUM(viste),0) v FROM link_page_visite WHERE channel=? AND giorno>=?').get(c, da).v;
    return {
      oggi: somma(giorno(0)),
      settimana: somma(giorno(6)),
      mese: somma(giorno(29)),
      totale: db.prepare('SELECT COALESCE(SUM(viste),0) v FROM link_page_visite WHERE channel=?').get(c).v,
      // gli ultimi 14 giorni in ordine, per disegnare la strisciolina
      giorni: Array.from({ length: 14 }, (_, i) => {
        const g = giorno(13 - i);
        return { giorno: g, viste: db.prepare('SELECT COALESCE(viste,0) v FROM link_page_visite WHERE channel=? AND giorno=?').get(c, g)?.v || 0 };
      }),
    };
  },
};

export const linkPage = {
  _riga(r) {
    const leggi = (s, def) => { try { const p = JSON.parse(s || 'null'); return p && typeof p === 'object' ? p : def; } catch { return def; } };
    const tema = { ...TEMA_DEF, ...leggi(r.tema, {}) };
    let blocchi = leggi(r.blocchi, null);
    if (!Array.isArray(blocchi)) {
      // pagina salvata prima dei blocchi: i vecchi `links` diventano blocchi link
      let vecchi = []; try { const p = JSON.parse(r.links || '[]'); if (Array.isArray(p)) vecchi = p; } catch { vecchi = []; }
      blocchi = vecchi.map((l) => ({ tipo: 'link', icona: l.icona || iconaDaUrl(l.url), label: l.label || '', url: l.url || '', sotto: '', evidenzia: false }));
      if (!tema.accent && r.accent) tema.accent = r.accent;
      if (!tema.bg && r.bg) tema.bg = r.bg;
    }
    return { ...r, tema, blocchi, attiva: r.attiva !== 0 };
  },
  get(channel) {
    const r = db.prepare('SELECT * FROM link_page WHERE channel=?').get(String(channel).toLowerCase());
    return r ? this._riga(r) : null;
  },
  conDefault(channel, display) {
    const r = this.get(channel);
    if (r) return r;
    return { channel: String(channel).toLowerCase(), headline: display || channel, tagline: '',
      template: 'minimal', avatar: '', tema: { ...TEMA_DEF }, blocchi: [], attiva: true, ts: 0, vuota: true };
  },
  esiste(channel) { return !!this.get(channel); },

  // Ripulisce e salva. È l'UNICO punto in cui si decide cosa è valido: se un
  // contenuto non passa da qui non finisce sulla pagina, e il chiamante può
  // dire quanti pezzi ha scartato invece di annunciare un successo che non c'è.
  // Sanifica SENZA scrivere: la usa l'anteprima, così vede esattamente ciò che
  // verrebbe salvato. salva() la richiama, quindi c'è una sola regola.
  pulisci(d = {}) {
    const L = LIMITI_LINKPAGE;
    const hex = (v) => (/^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? String(v) : '');
    const str = (v, max) => String(v ?? '').trim().slice(0, max);
    // Se manca lo schema lo mettiamo noi: chi incolla "twitch.tv/tizio" intende
    // un indirizzo, non un errore. Scartare la riga era il modo piu rapido di
    // fargli perdere il lavoro.
    const urlOk = (v) => {
      let u = String(v || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
      if (u.length > L.url || !/^https?:\/\/[^\s]+\.[^\s]/i.test(u)) return '';
      return u;
    };
    const scelta = (v, ammessi, def) => (ammessi.includes(v) ? v : def);
    const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def; };

    const t = d.tema && typeof d.tema === 'object' ? d.tema : {};
    const tema = {
      sfondoTipo: scelta(t.sfondoTipo, ['tinta', 'gradiente', 'immagine'], 'tinta'),
      bg: hex(t.bg), bg2: hex(t.bg2), angolo: num(t.angolo, 0, 360, 160), sfondoUrl: urlOk(t.sfondoUrl),
      effetto: scelta(t.effetto, ['nessuno', 'aurora', 'maglia', 'grana', 'bolle', 'stelle', 'onde', 'griglia',
        'synthwave', 'neonpulse', 'particelle', 'matrix', 'nebulosa', 'scanline', 'raggi'], 'nessuno'),
      testo: hex(t.testo), accent: hex(t.accent), card: hex(t.card), bordo: hex(t.bordo),
      font: scelta(t.font, FONT_LINKPAGE, 'system'),
      raggio: num(t.raggio, 0, 999, 14),
      stileBtn: scelta(t.stileBtn, ['pieno', 'contorno', 'vetro'], 'pieno'),
      ombra: t.ombra !== false,
      // "dura" = l'ombra piena e spostata, senza sfocatura: è la firma dei
      // bottoni delle pagine link (Linktree la chiama hard shadow).
      ombraTipo: scelta(t.ombraTipo, ['nessuna', 'morbida', 'dura'], t.ombra === false ? 'nessuna' : 'morbida'),
      ombraColore: hex(t.ombraColore),
      // Come si caricano i contenuti di altri siti. Di norma SUBITO: doverli
      // sbloccare uno a uno rende la pagina noiosa da sfogliare, ed è l'opposto
      // di quello che deve fare una pagina che sta in una bio. Chi preferisce
      // che partano solo su richiesta mette "chiedi"; l'informativa cambia da
      // sé e racconta quello che succede davvero nei due casi.
      consenso: scelta(t.consenso, ['chiedi', 'sempre'], 'sempre'),
      anim: scelta(t.anim, ['nessuna', 'fade', 'rise', 'pop'], 'rise'),
      avatarForma: scelta(t.avatarForma, ['cerchio', 'quadrato', 'nessuno'], 'cerchio'),
      larghezza: num(t.larghezza, 20, 46, 30),
      allinea: scelta(t.allinea, ['centro', 'sinistra'], 'centro'),
      disposizione: scelta(t.disposizione, DISPOSIZIONI, 'colonna'),
      movimento: scelta(t.movimento, MOVIMENTI, 'dolce'),
    };

    // I blocchi si CONSERVANO cosi come sono, anche se incompleti: quello che hai
    // scritto non si perde MAI salvando. E il renderer della pagina pubblica che
    // salta i blocchi non pubblicabili (vedi features/linkpagina.js), e l'editor
    // che te li segnala come "da completare".
    const blocchi = (Array.isArray(d.blocchi) ? d.blocchi : []).reduce((out, b) => {
      if (out.length >= L.blocchi || !b || typeof b !== 'object') return out;
      const tipo = scelta(b.tipo, TIPI_BLOCCO, null);
      if (!tipo) return out;
      const quanti = out.length;
      if (tipo === 'link') {
        const u = urlOk(b.url);
        out.push({ tipo, url: u, label: str(b.label, L.label), sotto: str(b.sotto, L.sotto),
          icona: scelta(b.icona, ICONE_LINKPAGE, null) || iconaDaUrl(u), evidenzia: b.evidenzia === true,
          // miniatura al posto dell'icona, e colori solo per QUESTO bottone
          img: urlOk(b.img), colore: hex(b.colore), coloreTesto: hex(b.coloreTesto) });
      } else if (tipo === 'titolo') {
        out.push({ tipo, testo: str(b.testo, L.titolo) });
      } else if (tipo === 'testo') {
        out.push({ tipo, testo: str(b.testo, L.testo) });
      } else if (tipo === 'badge') {
        out.push({ tipo, testo: str(b.testo, L.label) });
      } else if (tipo === 'separatore' || tipo === 'spazio') {
        out.push({ tipo });
      } else if (tipo === 'social') {
        const voci = (Array.isArray(b.voci) ? b.voci : []).slice(0, L.social).map((sv) => {
          const u = urlOk(sv?.url);
          return { url: u, icona: scelta(sv?.icona, ICONE_LINKPAGE, null) || iconaDaUrl(u) };
        });
        out.push({ tipo, voci });
      } else if (tipo === 'embed') {
        // "risolto": l'indirizzo che il server ha ricavato da quello scritto a
        // mano (oggi serve per i canali YouTube: nessuno conosce il proprio id
        // UC…, tutti incollano youtube.com/@nome). Lo scrive il server al
        // salvataggio, così la pagina pubblica non deve risolvere niente.
        // altezza: 0 = quella di partenza del formato. Le piattaforme non ci
        // dicono quanto e alto il loro contenuto (sono riquadri di un altro
        // sito, non li possiamo misurare), quindi la decide chi fa la pagina:
        // e l'unico modo per non lasciare mai spazio vuoto sotto.
        out.push({ tipo, url: urlOk(b.url), risolto: urlOk(b.risolto),
          formato: scelta(b.formato, FORMATI_EMBED, 'auto'), altezza: num(b.altezza, 0, 1200, 0),
          titolo: str(b.titolo, L.label) });
      } else if (tipo === 'diretta') {
        // il nome del canale, non un indirizzo: il player lo costruiamo noi.
        // Vuoto = il canale di chi possiede la pagina.
        const canale = String(b.canale || '').trim().replace(/^.*\//, '').slice(0, 60);
        out.push({ tipo,
          piattaforma: scelta(b.piattaforma, PIATTAFORME_DIRETTA, 'twitch'),
          canale: /^[\w.-]{0,60}$/.test(canale) ? canale : '',
          chat: b.chat === true, autoplay: b.autoplay === true, muto: b.muto !== false,
          titolo: str(b.titolo, L.label) });
      } else if (tipo === 'immagine') {
        out.push({ tipo, url: urlOk(b.url), alt: str(b.alt, 140) });
      } else if (tipo === 'eroe') {
        // copertina: l'apertura della pagina, con immagine di sfondo e un invito
        out.push({ tipo, titolo: str(b.titolo, L.headline), sotto: str(b.sotto, L.tagline),
          img: urlOk(b.img), url: urlOk(b.url), etichetta: str(b.etichetta, L.label),
          altezza: scelta(b.altezza, ['media', 'piena', 'bassa'], 'media'), fissa: b.fissa === true });
      } else if (tipo === 'scritta') {
        out.push({ tipo, testo: str(b.testo, L.titolo), velocita: scelta(b.velocita, ['lenta', 'media', 'veloce'], 'media') });
      } else if (tipo === 'numeri') {
        const voci = (Array.isArray(b.voci) ? b.voci : []).slice(0, 6)
          .map((v) => ({ n: str(v?.n, 16), etichetta: str(v?.etichetta, 40) }));
        out.push({ tipo, voci });
      } else if (tipo === 'faq') {
        const voci = (Array.isArray(b.voci) ? b.voci : []).slice(0, 12)
          .map((v) => ({ d: str(v?.d, L.titolo), r: str(v?.r, L.testo) }));
        out.push({ tipo, voci });
      } else if (tipo === 'conto') {
        // quando: data e ora ISO senza fuso (2026-08-12T21:00). Il fuso lo mette
        // il browser di chi guarda, che è l'unico che sappia il suo.
        const q = String(b.quando || '').trim();
        out.push({ tipo, titolo: str(b.titolo, L.label),
          quando: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(q) ? q : '',
          finito: str(b.finito, L.label) });
      } else if (tipo === 'griglia') {
        const voci = (Array.isArray(b.voci) ? b.voci : []).slice(0, 12).map((v) => ({
          img: urlOk(v?.img), titolo: str(v?.titolo, L.label), testo: str(v?.testo, L.sotto), url: urlOk(v?.url),
        }));
        out.push({ tipo, voci });
      }
      // valgono per QUALSIASI blocco: quanto è largo e come entra
      if (out.length > quanti) {
        const ul = out[out.length - 1];
        ul.larghezza = scelta(b.larghezza, LARGHEZZE_BLOCCO, 'piena');
        ul.entrata = scelta(b.entrata, ENTRATE_BLOCCO, 'auto');
        ul.allinea = scelta(b.allinea, ALLINEAMENTI_BLOCCO, 'auto');
      }
      return out;
    }, []);

    const av = String(d.avatar || '').trim();
    return {
      headline: str(d.headline, L.headline),
      tagline: str(d.tagline, L.tagline),
      template: scelta(d.template, TEMPLATE_LINKPAGE, 'minimal'),
      avatar: av === 'no' ? 'no' : (urlOk(av) || ''),
      tema, blocchi,
      attiva: d.attiva !== false,
    };
  },

  salva(channel, d = {}) {
    const c = String(channel).toLowerCase();
    const p = this.pulisci(d);
    const v = {
      channel: c,
      headline: p.headline,
      tagline: p.tagline,
      template: p.template,
      accent: p.tema.accent, bg: p.tema.bg,        // copia per compatibilità
      links: '',                                   // sostituito dai blocchi
      avatar: p.avatar,
      tema: JSON.stringify(p.tema),
      blocchi: JSON.stringify(p.blocchi),
      attiva: p.attiva === false ? 0 : 1,
      ts: now(),
    };
    db.prepare(`INSERT INTO link_page (channel, headline, tagline, template, accent, bg, links, avatar, tema, blocchi, attiva, ts)
      VALUES (@channel,@headline,@tagline,@template,@accent,@bg,@links,@avatar,@tema,@blocchi,@attiva,@ts)
      ON CONFLICT(channel) DO UPDATE SET headline=excluded.headline, tagline=excluded.tagline,
        template=excluded.template, accent=excluded.accent, bg=excluded.bg, links=excluded.links,
        avatar=excluded.avatar, tema=excluded.tema, blocchi=excluded.blocchi,
        attiva=excluded.attiva, ts=excluded.ts`).run(v);
    return this.get(c);
  },
  rimuovi(channel) { db.prepare('DELETE FROM link_page WHERE channel=?').run(String(channel).toLowerCase()); },
};

// NB: distinto dai `counters` di sotto (store low-level usato dalle azioni dei moduli).
export const contatori = {
  list(channel) { return db.prepare('SELECT * FROM contatori WHERE channel=? ORDER BY comando').all(String(channel).toLowerCase()); },
  get(channel, comando) { return db.prepare('SELECT * FROM contatori WHERE channel=? AND comando=?').get(String(channel).toLowerCase(), String(comando).toLowerCase()) || null; },
  getByReward(channel, rewardId) {
    const r = String(rewardId || ''); if (!r) return null;
    return db.prepare('SELECT * FROM contatori WHERE channel=? AND reward_id=?').get(String(channel).toLowerCase(), r) || null;
  },
  autoParola(channel) { return this.list(channel).filter((c) => c.auto_parola); },
  // config del widget a schermo, con default sensati
  overlayDi(row) {
    const def = { mostra: false, x: 4, y: 94, colore: '#ffffff', sfondo: 'rgba(0,0,0,0.55)', dim: 40, grassetto: true, font: 'system', formato: '{emoji} {etichetta}: {valore}', parolaOn: '', parolaOff: '' };
    let o = {}; try { o = row && row.overlay ? JSON.parse(row.overlay) : {}; } catch { o = {}; }
    return { ...def, ...(o && typeof o === 'object' ? o : {}) };
  },
  // payload SSE per l'overlay (testo formattato + stile)
  payloadOverlay(row) {
    const o = this.overlayDi(row);
    const testo = String(o.formato || '{emoji} {etichetta}: {valore}')
      .replace(/\{emoji\}/g, row.emoji || '').replace(/\{etichetta\}/g, row.etichetta || row.comando).replace(/\{valore\}/g, String(row.valore ?? 0))
      .replace(/\s+/g, ' ').trim();
    return { tipo: 'contatore', comando: row.comando, mostra: !!o.mostra, testo, x: o.x, y: o.y, colore: o.colore, sfondo: o.sfondo, dim: o.dim, grassetto: !!o.grassetto, font: o.font };
  },
  // aggiorna SOLO la config overlay (merge), es. mostra on/off da chat
  patchOverlay(channel, comando, patch) {
    const c = String(channel).toLowerCase(), cmd = String(comando).toLowerCase();
    const cur = this.get(c, cmd); if (!cur) return null;
    const o = { ...this.overlayDi(cur), ...(patch || {}) };
    db.prepare('UPDATE contatori SET overlay=?, ts=? WHERE channel=? AND comando=?').run(JSON.stringify(o), now(), c, cmd);
    return this.get(c, cmd);
  },
  upsert(channel, { comando, etichetta, emoji, step, autoParola, rewardId, valore, overlay } = {}) {
    const c = String(channel).toLowerCase();
    const cmd = String(comando || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    if (!cmd) return null;
    const cur = this.get(c, cmd);
    const v = {
      etichetta: etichetta !== undefined ? String(etichetta).slice(0, 40) : (cur?.etichetta || cmd),
      emoji: emoji !== undefined ? String(emoji).slice(0, 8) : (cur?.emoji || ''),
      step: step !== undefined ? Math.max(1, Math.min(1000, parseInt(step, 10) || 1)) : (cur?.step ?? 1),
      auto_parola: autoParola !== undefined ? String(autoParola).toLowerCase().slice(0, 40) : (cur?.auto_parola || ''),
      reward_id: rewardId !== undefined ? String(rewardId) : (cur?.reward_id || ''),
      valore: valore !== undefined ? (parseInt(valore, 10) || 0) : (cur?.valore ?? 0),
      // merge sulla config attuale (con default): così un overlay PARZIALE
      // (es. {mostra:true} da un pulsante) non azzera posizione/colori salvati.
      overlay: overlay !== undefined ? JSON.stringify({ ...this.overlayDi(cur), ...(overlay && typeof overlay === 'object' ? overlay : {}) }) : (cur?.overlay || ''),
    };
    db.prepare(`INSERT INTO contatori (channel, comando, etichetta, emoji, valore, step, auto_parola, reward_id, overlay, ts)
      VALUES (@channel,@comando,@etichetta,@emoji,@valore,@step,@auto_parola,@reward_id,@overlay,@ts)
      ON CONFLICT(channel,comando) DO UPDATE SET etichetta=excluded.etichetta, emoji=excluded.emoji, valore=excluded.valore,
        step=excluded.step, auto_parola=excluded.auto_parola, reward_id=excluded.reward_id, overlay=excluded.overlay, ts=excluded.ts`)
      .run({ channel: c, comando: cmd, ...v, ts: now() });
    return this.get(c, cmd);
  },
  remove(channel, comando) { db.prepare('DELETE FROM contatori WHERE channel=? AND comando=?').run(String(channel).toLowerCase(), String(comando).toLowerCase()); },
  incrementa(channel, comando, delta) {
    const c = String(channel).toLowerCase(), cmd = String(comando).toLowerCase();
    db.prepare('UPDATE contatori SET valore = MAX(-1000000000, MIN(1000000000, valore + ?)), ts=? WHERE channel=? AND comando=?')
      .run(parseInt(delta, 10) || 0, now(), c, cmd);
    return this.get(c, cmd);
  },
  setValore(channel, comando, valore) {
    const c = String(channel).toLowerCase(), cmd = String(comando).toLowerCase();
    db.prepare('UPDATE contatori SET valore=?, ts=? WHERE channel=? AND comando=?').run(parseInt(valore, 10) || 0, now(), c, cmd);
    return this.get(c, cmd);
  },
};

// ---------------------------------------------------------------- comandi custom
export const commands = {
  list(channel) { return db.prepare('SELECT name, response FROM commands WHERE channel=? ORDER BY name').all(channel); },
  get(channel, name) { return db.prepare('SELECT response FROM commands WHERE channel=? AND name=?').get(channel, name.toLowerCase())?.response ?? null; },
  set(channel, name, response, by = '') {
    db.prepare(`INSERT INTO commands (channel, name, response, created_by, ts) VALUES (?,?,?,?,?)
      ON CONFLICT(channel, name) DO UPDATE SET response=excluded.response, created_by=excluded.created_by, ts=excluded.ts`)
      .run(channel, name.toLowerCase(), response, by, now());
  },
  remove(channel, name) { db.prepare('DELETE FROM commands WHERE channel=? AND name=?').run(channel, name.toLowerCase()); },
};

// ---------------------------------------------------------------- clip
export const clips = {
  log(channel, clipId, url, reason) {
    db.prepare('INSERT INTO clips (channel, clip_id, url, reason, ts) VALUES (?,?,?,?,?)').run(channel, clipId, url, reason, now());
  },
  recent(channel, limit = 20) {
    return db.prepare('SELECT * FROM clips WHERE channel=? ORDER BY ts DESC LIMIT ?').all(channel, limit);
  },
  lastTs(channel) { return db.prepare('SELECT MAX(ts) t FROM clips WHERE channel=?').get(channel)?.t ?? 0; },
};

// ---------------------------------------------------------------- conoscenza
export const knowledge = {
  add(channel, { domanda, risposta, fonte = 'manuale' }) {
    db.prepare('INSERT INTO knowledge (channel, domanda, risposta, fonte, ts) VALUES (?,?,?,?,?)')
      .run(channel, String(domanda).slice(0, 300), String(risposta).slice(0, 450), fonte, now());
    // massimo 500 voci per canale: si scartano le più vecchie non manuali, poi le più vecchie
    db.prepare(`DELETE FROM knowledge WHERE channel=? AND id NOT IN (
      SELECT id FROM knowledge WHERE channel=? ORDER BY (fonte='manuale') DESC, ts DESC LIMIT 500)`)
      .run(channel, channel);
  },
  list(channel) { return db.prepare('SELECT * FROM knowledge WHERE channel=? ORDER BY ts DESC').all(channel); },
  remove(channel, id) { db.prepare('DELETE FROM knowledge WHERE channel=? AND id=?').run(channel, id); },
  clearBySource(channel, fonte) { db.prepare('DELETE FROM knowledge WHERE channel=? AND fonte=?').run(channel, fonte); },
  count(channel) { return db.prepare('SELECT COUNT(*) c FROM knowledge WHERE channel=?').get(channel).c; },
};

// -------------------------------------------------- linee guida (regole di "lia")
// I limiti/regole che lo streamer le dà (in privato o dalla dashboard): lei li
// SALVA e li rispetta sempre. Sono del proprietario, valgono su tutti i suoi modi.
const GUIDA_DOVE = ['ovunque', 'twitch', 'tg', 'tg-privato'];
const GUIDA_CONCHI = ['tutti', 'solo-me', 'tranne-me'];

export const guide = {
  list(channel) {
    return db.prepare('SELECT id, testo, dove, con_chi, ts FROM linee_guida WHERE channel=? ORDER BY ts ASC')
      .all(String(channel).toLowerCase());
  },
  testi(channel, max = 12) {
    return this.list(channel).slice(0, max).map((r) => r.testo);
  },
  // Solo le regole che valgono NEL CONTESTO attuale (piattaforma + con chi).
  // contesto = { piattaforma:'twitch'|'telegram', privato:bool, sonoIo:bool }
  applicabili(channel, contesto = {}, max = 12) {
    const { piattaforma = 'twitch', privato = false, sonoIo = false } = contesto;
    return this.list(channel).filter((g) => {
      const dove = g.dove || 'ovunque';
      let doveOk = true;
      if (dove === 'twitch') doveOk = piattaforma === 'twitch';
      else if (dove === 'tg') doveOk = piattaforma === 'telegram';
      else if (dove === 'tg-privato') doveOk = piattaforma === 'telegram' && privato && sonoIo;
      if (!doveOk) return false;
      const con = g.con_chi || 'tutti';
      if (con === 'solo-me') return sonoIo === true;
      if (con === 'tranne-me') return sonoIo === false;
      return true;
    }).slice(0, max).map((g) => g.testo);
  },
  add(channel, testo, ambito = {}) {
    const t = String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (t.length < 3) return null;
    const dove = GUIDA_DOVE.includes(ambito.dove) ? ambito.dove : 'ovunque';
    const con_chi = GUIDA_CONCHI.includes(ambito.con_chi) ? ambito.con_chi : 'tutti';
    const c = String(channel).toLowerCase();
    const gia = db.prepare('SELECT id FROM linee_guida WHERE channel=? AND lower(testo)=lower(?) LIMIT 1').get(c, t);
    if (gia) { db.prepare('UPDATE linee_guida SET dove=?, con_chi=? WHERE id=?').run(dove, con_chi, gia.id); return gia.id; }
    const info = db.prepare('INSERT INTO linee_guida(channel, testo, dove, con_chi, ts) VALUES(?,?,?,?,?)').run(c, t, dove, con_chi, now());
    db.prepare(`DELETE FROM linee_guida WHERE channel=? AND id NOT IN (
      SELECT id FROM linee_guida WHERE channel=? ORDER BY ts DESC LIMIT 40)`).run(c, c);
    return info.lastInsertRowid;
  },
  remove(channel, id) {
    db.prepare('DELETE FROM linee_guida WHERE channel=? AND id=?').run(String(channel).toLowerCase(), Number(id) || 0);
  },
  removeByIndex(channel, idx) {
    const item = this.list(channel)[Number(idx) - 1];
    if (item) this.remove(channel, item.id);
    return item || null;
  },
  count(channel) {
    return db.prepare('SELECT COUNT(*) c FROM linee_guida WHERE channel=?').get(String(channel).toLowerCase()).c;
  },
  // Deduce l'AMBITO da come è scritta la regola in linguaggio naturale.
  interpreta(testo) {
    const t = String(testo || '').toLowerCase();
    let dove = 'ovunque';
    const suTg = /\b(telegram|tg)\b/.test(t) || /\bqui\b/.test(t);
    const privato = /\bin privato\b|\bprivato\b|\bsolo (con|a) (me|te)\b/.test(t);
    if (/\btwitch\b|\bin diretta\b|\blive\b|\bin chat\b/.test(t)) dove = 'twitch';
    else if (suTg && privato) dove = 'tg-privato';
    else if (suTg) dove = 'tg';
    let con_chi = 'tutti';
    if (/\b(tranne|eccetto|a parte)\s+(me|te)\b|\bche non sia (io|me|te)\b|\bnon sia (io|me|te)\b|\ba nessun\w*\b|\b(gli|agli|con gli) altri\b|\bsconosciut\w*\b/.test(t)) con_chi = 'tranne-me';
    else if (/\b(solo|soltanto)\s+(con|a|per)\s+(me|te)\b|\bsolo io\b|\bsolo tu\b/.test(t)) con_chi = 'solo-me';
    if (con_chi === 'solo-me' && suTg && privato) dove = 'tg-privato';
    return { dove, con_chi };
  },
  // Descrizione umana dell'ambito (per la dashboard e le conferme su Telegram).
  descriviAmbito({ dove = 'ovunque', con_chi = 'tutti' } = {}) {
    const d = { ovunque: 'ovunque', twitch: 'in chat Twitch', tg: 'su Telegram', 'tg-privato': 'in privato su Telegram' }[dove] || 'ovunque';
    const c = { tutti: 'con tutti', 'solo-me': 'solo con te', 'tranne-me': 'con tutti tranne te' }[con_chi] || 'con tutti';
    return `${c}, ${d}`;
  },
};

// -------------------------------------------------- alert a punti canale (Twitch)
// Mappa un premio a punti canale (reward Twitch) a un alert: un effetto/suono e/o
// un messaggio in chat. Quando lo spettatore riscatta (spendendo i suoi punti),
// il bot spara l'alert. Per canale.
export const pointAlerts = {
  list(channel) {
    return db.prepare('SELECT reward_id, titolo, costo, effetto, suono, testo, opzioni, ts FROM point_alerts WHERE channel=? ORDER BY ts DESC')
      .all(String(channel).toLowerCase());
  },
  getByReward(channel, rewardId) {
    return db.prepare('SELECT reward_id, titolo, costo, effetto, suono, testo, opzioni FROM point_alerts WHERE channel=? AND reward_id=?')
      .get(String(channel).toLowerCase(), String(rewardId)) || null;
  },
  add(channel, { rewardId, titolo, costo, effetto, suono, testo, opzioni }) {
    db.prepare(`INSERT INTO point_alerts(channel, reward_id, titolo, costo, effetto, suono, testo, opzioni, ts)
      VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(channel, reward_id) DO UPDATE SET titolo=excluded.titolo, costo=excluded.costo,
        effetto=excluded.effetto, suono=excluded.suono, testo=excluded.testo, opzioni=excluded.opzioni`)
      .run(String(channel).toLowerCase(), String(rewardId), String(titolo || '').slice(0, 60),
           Math.max(0, Math.round(Number(costo) || 0)), String(effetto || '').slice(0, 24),
           String(suono || '').slice(0, 24), String(testo || '').slice(0, 300),
           String(opzioni || '').slice(0, 400), now());
  },
  remove(channel, rewardId) {
    db.prepare('DELETE FROM point_alerts WHERE channel=? AND reward_id=?').run(String(channel).toLowerCase(), String(rewardId));
  },
};

// -------------------------------------------------- diario di crescita di "lia"
// Il suo "percorso": a ogni risveglio (avvio del server) e ogni tanto si chiede
// cosa le manca per capire meglio, e se lo annota. È qui che tiene traccia dei
// suoi obiettivi e di ciò che via via impara. Solo del proprietario, per canale.
export const diario = {
  add(channel, tipo, testo) {
    const t = String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    if (t.length < 3) return;
    const c = String(channel).toLowerCase();
    db.prepare('INSERT INTO diario(channel, tipo, testo, ts) VALUES(?,?,?,?)')
      .run(c, String(tipo || 'nota').slice(0, 20), t, now());
    db.prepare(`DELETE FROM diario WHERE channel=? AND id NOT IN (
      SELECT id FROM diario WHERE channel=? ORDER BY ts DESC LIMIT 100)`).run(c, c);
  },
  latest(channel) {
    return db.prepare('SELECT tipo, testo, ts FROM diario WHERE channel=? ORDER BY ts DESC LIMIT 1')
      .get(String(channel).toLowerCase()) || null;
  },
  list(channel, n = 20) {
    return db.prepare('SELECT tipo, testo, ts FROM diario WHERE channel=? ORDER BY ts DESC LIMIT ?')
      .all(String(channel).toLowerCase(), n);
  },
};

// ---------------------------------------------------------------- effetti & suoni

// Normalizza un comando effetto: minuscolo, solo [a-z0-9_], 1..24 caratteri.
export function normComando(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

// Base di partenza per il comando, ricavata dal nome del file caricato: via
// l'estensione, i separatori diventano "_".
export function baseDaFile(nomeFile) {
  return normComando(String(nomeFile || '').replace(/\.[^.]+$/, '').replace(/[\s.\-]+/g, '_'));
}

const MAX_EFFETTI = 60;   // tetto di effetti per canale

export const effects = {
  list(channel) {
    return db.prepare('SELECT * FROM effects WHERE channel=? ORDER BY comando').all(channel);
  },
  // solo effetti ATTIVI (usato dal trigger in chat)
  get(channel, comando) {
    const c = normComando(comando);
    if (!c) return null;
    return db.prepare('SELECT * FROM effects WHERE channel=? AND comando=? AND attivo=1').get(channel, c) || null;
  },
  count(channel) {
    return db.prepare('SELECT COUNT(*) c FROM effects WHERE channel=?').get(channel).c;
  },
  // Ogni media caricato entra nella libreria con una PROPRIA identità: il comando.
  // Da una base (nome file, nome nella libreria, comando d'origine) si conia un
  // comando libero nel canale, così un caricamento non ne cancella mai un altro.
  // `tieni` = comando già assegnato a quel campo: se la base coincide, lo si
  // riusa (ricaricare lo stesso file lo sostituisce, non ne accumula copie).
  comandoLibero(channel, base, tieni = '') {
    const b = normComando(base) || 'media';
    if (tieni && normComando(tieni) === b) return b;
    let c = b, n = 2;
    while (this.get(channel, c)) { c = normComando(b + '_' + n) || (b + String(n)); n++; if (n > 99) break; }
    return c;
  },
  // Inserisce o SOSTITUISCE (UPSERT su channel+comando). Se esisteva già,
  // ritorna il vecchio nome file (così il chiamante può cancellarlo dal disco),
  // altrimenti null. Applica il tetto MAX_EFFETTI solo ai comandi nuovi.
  add(channel, { comando, tipo, file, tier, cooldown, volume, durata }) {
    const c = normComando(comando);
    if (!c) throw new Error('comando non valido');
    const esistente = db.prepare('SELECT file FROM effects WHERE channel=? AND comando=?').get(channel, c);
    if (!esistente && this.count(channel) >= MAX_EFFETTI) {
      throw new Error(`hai raggiunto il massimo di ${MAX_EFFETTI} effetti`);
    }
    db.prepare(`INSERT INTO effects (channel, comando, tipo, file, tier, cooldown, volume, durata, attivo, ts)
      VALUES (?,?,?,?,?,?,?,?,1,?)
      ON CONFLICT(channel, comando) DO UPDATE SET
        tipo=excluded.tipo, file=excluded.file, tier=excluded.tier,
        cooldown=excluded.cooldown, volume=excluded.volume, durata=excluded.durata,
        attivo=1, ts=excluded.ts`)
      .run(channel, c, tipo, file, tier, cooldown, volume, durata, now());
    return esistente?.file || null;
  },
  // Elimina un effetto e ritorna i nomi file da cancellare dal disco (media +
  // eventuale audio abbinato della COMBO), o null se non esisteva.
  remove(channel, id) {
    const r = db.prepare('SELECT file, suono_file FROM effects WHERE channel=? AND id=?').get(channel, id);
    if (!r) return null;
    db.prepare('DELETE FROM effects WHERE channel=? AND id=?').run(channel, id);
    return { file: r.file, suonoFile: r.suono_file || '' };
  },
  // Posizione/dimensione/rotazione a schermo di un effetto (gestite dall'Overlay
  // Studio). xy = { x, y, s, r } oppure null per rimetterlo al centro. Ritorna
  // true se l'effetto esiste. I valori arrivano già validati dal chiamante.
  setPos(channel, comando, xy) {
    const c = normComando(comando);
    if (!c) return false;
    const px = xy && xy.x != null ? Math.round(xy.x) : null;
    const py = xy && xy.y != null ? Math.round(xy.y) : null;
    const s = xy && xy.s != null ? Math.round(xy.s) : 100;
    const r = xy && xy.r != null ? Math.round(xy.r) : 0;
    const info = db.prepare('UPDATE effects SET posx=?, posy=?, scala=?, rot=? WHERE channel=? AND comando=?')
      .run(px, py, s, r, channel, c);
    return info.changes > 0;
  },

  // ---- Libreria condivisa ----------------------------------------------------
  // Rende un effetto pubblico/privato + titolo mostrato nella libreria. L'autore
  // (creatore originale) NON viene mai sovrascritto una volta impostato. true se esiste.
  setPubblico(channel, id, { pubblico, nome, autore } = {}) {
    const r = db.prepare('SELECT autore FROM effects WHERE channel=? AND id=?').get(channel, id);
    if (!r) return false;
    const aut = (r.autore && r.autore.trim()) ? r.autore : String(autore || channel).toLowerCase();
    db.prepare('UPDATE effects SET pubblico=?, nome=?, autore=? WHERE channel=? AND id=?')
      .run(pubblico ? 1 : 0, String(nome || '').slice(0, 60), aut, channel, id);
    return true;
  },
  // Aggancia (o toglie, con '') un audio abbinato a un'immagine/video (COMBO).
  attachSuono(channel, id, suonoFile) {
    const info = db.prepare('UPDATE effects SET suono_file=? WHERE channel=? AND id=?')
      .run(String(suonoFile || ''), channel, id);
    return info.changes > 0;
  },
  // Effetto per id in un canale (per pubblicare/combinare/eliminare da UI).
  byId(channel, id) {
    return db.prepare('SELECT * FROM effects WHERE channel=? AND id=?').get(channel, id) || null;
  },
  // Effetto PUBBLICO per id, di qualsiasi canale: per import e anteprima sicura.
  pubblicoById(id) {
    return db.prepare('SELECT * FROM effects WHERE id=? AND pubblico=1 AND attivo=1').get(id) || null;
  },
  // Elenco della LIBRERIA CONDIVISA: effetti pubblici, filtrabili per tipo/testo,
  // opzionalmente escludendo un canale (di norma il proprio). Prima i più usati.
  sharedList({ tipo, q, escludi, limit = 120 } = {}) {
    let sql = 'SELECT * FROM effects WHERE pubblico=1 AND attivo=1';
    const args = [];
    if (tipo && ['audio', 'immagine', 'video'].includes(tipo)) { sql += ' AND tipo=?'; args.push(tipo); }
    if (escludi) { sql += ' AND channel<>?'; args.push(String(escludi).toLowerCase()); }
    if (q && String(q).trim()) { sql += ' AND (comando LIKE ? OR nome LIKE ?)'; const p = '%' + String(q).trim() + '%'; args.push(p, p); }
    sql += ' ORDER BY usi DESC, ts DESC LIMIT ?';
    args.push(Math.max(1, Math.min(300, Math.round(limit) || 120)));
    return db.prepare(sql).all(...args);
  },
  incUsi(id) { db.prepare('UPDATE effects SET usi=usi+1 WHERE id=?').run(id); },
  // I MIEI effetti (di un canale), pubblici o privati, filtrabili per tipo. Servono
  // alla libreria delle grafiche: le tue immagini si riusano SEMPRE, anche se non
  // le hai rese pubbliche.
  myList({ channel, tipo, limit = 120 } = {}) {
    let sql = 'SELECT * FROM effects WHERE channel=? AND attivo=1';
    const args = [String(channel || '').toLowerCase()];
    if (tipo && ['audio', 'immagine', 'video'].includes(tipo)) { sql += ' AND tipo=?'; args.push(tipo); }
    sql += ' ORDER BY ts DESC LIMIT ?';
    args.push(Math.max(1, Math.min(300, Math.round(limit) || 120)));
    return db.prepare(sql).all(...args);
  },
  // Effetto per id di QUALSIASI canale (senza vincolo di pubblico): serve al media
  // server per lasciar vedere al PROPRIETARIO anche i propri media non pubblici.
  anyById(id) { return db.prepare('SELECT * FROM effects WHERE id=? AND attivo=1').get(id) || null; },
};

// ---------------------------------------------------------------- libreria sfondi (grafiche)
// Sfondi caricati dallo streamer per le grafiche social. Sono file su disco
// (in data/sfondi/<channel>/), NON dentro le impostazioni: così restano leggeri
// e riusabili, e le grafiche referenziano solo l'URL /media/<id>.
const MAX_SFONDI = 40;   // tetto di sfondi per canale (attento ai limiti di spazio)

export const sfondi = {
  list(channel) {
    return db.prepare('SELECT * FROM sfondi WHERE channel=? ORDER BY ts DESC').all(String(channel || '').toLowerCase());
  },
  count(channel) {
    return db.prepare('SELECT COUNT(*) c FROM sfondi WHERE channel=?').get(String(channel || '').toLowerCase()).c;
  },
  // Registra un nuovo sfondo (il file è già stato scritto su disco dal chiamante).
  // Applica il tetto MAX_SFONDI. Ritorna la riga appena creata (con id).
  add(channel, { file, nome }) {
    const ch = String(channel || '').toLowerCase();
    if (this.count(ch) >= MAX_SFONDI) throw new Error(`hai raggiunto il massimo di ${MAX_SFONDI} sfondi`);
    const info = db.prepare('INSERT INTO sfondi (channel, file, nome, ts) VALUES (?,?,?,?)')
      .run(ch, String(file), String(nome || '').slice(0, 60), now());
    return db.prepare('SELECT * FROM sfondi WHERE id=?').get(info.lastInsertRowid) || null;
  },
  // Sfondo per id nel canale del proprietario (per servire/eliminare in sicurezza).
  byId(channel, id) {
    return db.prepare('SELECT * FROM sfondi WHERE channel=? AND id=?').get(String(channel || '').toLowerCase(), id) || null;
  },
  // Elimina uno sfondo e ritorna il nome file da cancellare dal disco (o null).
  remove(channel, id) {
    const r = db.prepare('SELECT file FROM sfondi WHERE channel=? AND id=?').get(String(channel || '').toLowerCase(), id);
    if (!r) return null;
    db.prepare('DELETE FROM sfondi WHERE channel=? AND id=?').run(String(channel || '').toLowerCase(), id);
    return r.file;
  },
};

// ---------------------------------------------------------------- moduli (automazioni)

const MAX_MODULI = 100;   // tetto di moduli per canale

// Deserializza una riga della tabella modules nel modello completo del modulo.
function rowToModule(r) {
  if (!r) return null;
  const cfg = safeJson(r.config);
  return {
    id: r.id,
    nome: r.nome,
    attivo: !!r.attivo,
    telegram: !!cfg.telegram,          // il modulo risponde anche nel gruppo Telegram?
    trigger: cfg.trigger || {},
    condizioni: cfg.condizioni || {},
    azioni: Array.isArray(cfg.azioni) ? cfg.azioni : [],
  };
}

export const modules = {
  list(channel) {
    return db.prepare('SELECT * FROM modules WHERE channel=? ORDER BY id').all(channel).map(rowToModule);
  },
  get(channel, id) {
    return rowToModule(db.prepare('SELECT * FROM modules WHERE channel=? AND id=?').get(channel, id));
  },
  // Inserisce o aggiorna un modulo. Se m.id esiste (per questo canale) → UPDATE,
  // altrimenti INSERT (rispettando il tetto MAX_MODULI). Ritorna l'id.
  save(channel, m) {
    const nome = String(m?.nome || '').slice(0, 80);
    const config = JSON.stringify({
      trigger: m?.trigger || {},
      condizioni: m?.condizioni || {},
      azioni: Array.isArray(m?.azioni) ? m.azioni : [],
      telegram: m?.telegram === true,
    });
    const attivo = m?.attivo === false ? 0 : 1;
    const id = Number(m?.id);
    if (Number.isFinite(id) && id > 0 &&
        db.prepare('SELECT 1 FROM modules WHERE channel=? AND id=?').get(channel, id)) {
      db.prepare('UPDATE modules SET nome=?, attivo=?, config=?, ts=? WHERE channel=? AND id=?')
        .run(nome, attivo, config, now(), channel, id);
      return id;
    }
    const n = db.prepare('SELECT COUNT(*) c FROM modules WHERE channel=?').get(channel).c;
    if (n >= MAX_MODULI) throw new Error(`hai raggiunto il massimo di ${MAX_MODULI} moduli`);
    const info = db.prepare('INSERT INTO modules (channel, nome, attivo, config, ts) VALUES (?,?,?,?,?)')
      .run(channel, nome, attivo, config, now());
    return Number(info.lastInsertRowid);
  },
  remove(channel, id) { db.prepare('DELETE FROM modules WHERE channel=? AND id=?').run(channel, id); },
  setAttivo(channel, id, attivo) {
    db.prepare('UPDATE modules SET attivo=? WHERE channel=? AND id=?').run(attivo ? 1 : 0, channel, id);
  },
  // Tutti i moduli ATTIVI di TUTTI i canali (usato dal motore timer). Ogni voce
  // porta con sé il proprio channel.
  all() {
    return db.prepare('SELECT * FROM modules WHERE attivo=1').all()
      .map(r => ({ channel: r.channel, ...rowToModule(r) }));
  },
};

// ---------------------------------------------------------------- contatori

// Nome contatore normalizzato: minuscolo, senza spazi ai bordi, max 60 char.
const normContatore = (s) => String(s || '').trim().toLowerCase().slice(0, 60);

export const counters = {
  get(channel, nome) {
    const n = normContatore(nome);
    return db.prepare('SELECT valore FROM counters WHERE channel=? AND nome=?').get(channel, n)?.valore ?? 0;
  },
  // Incrementa (o decrementa con delta negativo) e ritorna il nuovo valore.
  inc(channel, nome, delta = 1) {
    const n = normContatore(nome);
    if (!n) return 0;
    const d = Math.trunc(Number(delta) || 0);
    db.prepare(`INSERT INTO counters (channel, nome, valore) VALUES (?,?,?)
      ON CONFLICT(channel, nome) DO UPDATE SET valore = valore + excluded.valore`)
      .run(channel, n, d);
    return this.get(channel, n);
  },
  set(channel, nome, valore) {
    const n = normContatore(nome);
    if (!n) return 0;
    const v = Math.trunc(Number(valore) || 0);
    db.prepare(`INSERT INTO counters (channel, nome, valore) VALUES (?,?,?)
      ON CONFLICT(channel, nome) DO UPDATE SET valore = excluded.valore`)
      .run(channel, n, v);
    return v;
  },
  all(channel) {
    return db.prepare('SELECT nome, valore FROM counters WHERE channel=? ORDER BY nome').all(channel);
  },
};

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }
