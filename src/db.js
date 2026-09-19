// Database di SocialBot (SQLite): qui vivono token, streamer abilitati,
// memoria del bot (messaggi, ricordi sugli utenti, lezioni imparate),
// comandi personalizzati e registro delle clip.
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { cifra, decifra, eCifrato, anello, anelloCorrente } from './segreti.js';
import { istruzioneGenere } from './ai/genere.js';
import { nomeSu } from './identita.js';

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

CREATE TABLE IF NOT EXISTS pagina_dona (     -- la pagina delle donazioni /u/<login>/dona: stessa forma della pagina link
  channel TEXT PRIMARY KEY,
  headline TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  template TEXT NOT NULL DEFAULT 'minimal',
  accent TEXT NOT NULL DEFAULT '',
  bg TEXT NOT NULL DEFAULT '',
  links TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  tema TEXT NOT NULL DEFAULT '',
  blocchi TEXT NOT NULL DEFAULT '',
  attiva INTEGER NOT NULL DEFAULT 1,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dirette_annunciate (  -- l'ultima diretta gia' annunciata, per piattaforma
  channel TEXT NOT NULL,
  piattaforma TEXT NOT NULL,     -- twitch | kick | youtube | tiktok
  diretta_id TEXT NOT NULL,      -- id della diretta secondo quella piattaforma
  ts INTEGER NOT NULL,
  PRIMARY KEY (channel, piattaforma)
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

CREATE TABLE IF NOT EXISTS presenze (      -- chi c'e', diretta dopo diretta, per canale
  channel TEXT NOT NULL,
  user TEXT NOT NULL,                        -- login minuscolo
  dirette INTEGER NOT NULL DEFAULT 0,        -- a quante dirette e' stato presente
  serie INTEGER NOT NULL DEFAULT 0,          -- dirette di fila, adesso
  record INTEGER NOT NULL DEFAULT 0,         -- la serie piu' lunga
  ultima TEXT NOT NULL DEFAULT '',           -- l'ultima diretta contata
  ultima_ts INTEGER NOT NULL DEFAULT 0,
  prima_ts INTEGER NOT NULL DEFAULT 0,       -- la prima volta che si e' visto (giro o messaggio)
  ultimo_msg INTEGER NOT NULL DEFAULT 0,     -- l'ultimo messaggio
  salutato INTEGER NOT NULL DEFAULT 0,       -- ha gia' avuto il benvenuto
  PRIMARY KEY (channel, user)
);

CREATE TABLE IF NOT EXISTS dirette_viste (  -- la diretta corrente e la precedente, per canale
  channel TEXT PRIMARY KEY,
  corrente TEXT NOT NULL DEFAULT '',
  corrente_ts INTEGER NOT NULL DEFAULT 0,
  precedente TEXT NOT NULL DEFAULT '',
  ultimo_tick INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rapporti (      -- il rapporto di ogni diretta finita
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  inizio INTEGER NOT NULL DEFAULT 0,
  fine INTEGER NOT NULL DEFAULT 0,
  dati TEXT NOT NULL DEFAULT '{}',           -- i numeri, come li ha raccolti features/rapporto.js
  letto INTEGER NOT NULL DEFAULT 0,
  inviato TEXT NOT NULL DEFAULT '',          -- dove e' stato mandato: telegram, mail
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rapporti_channel ON rapporti(channel, fine);

CREATE TABLE IF NOT EXISTS posta_streamer ( -- l'indirizzo scelto dallo streamer per i rapporti
  channel TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  confermata INTEGER NOT NULL DEFAULT 0,
  impronta TEXT NOT NULL DEFAULT '',         -- il calco del codice di conferma, mai il codice
  scade INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vips (          -- VIP assegnati dal bot (con scadenza)
  channel TEXT NOT NULL,
  user TEXT NOT NULL,                       -- login minuscolo
  user_id TEXT NOT NULL DEFAULT '',
  display TEXT NOT NULL DEFAULT '',
  until INTEGER NOT NULL DEFAULT 0,         -- epoch ms di scadenza (0 = permanente)
  dirette INTEGER NOT NULL DEFAULT 0,       -- dirette che restano (0 = non si conta a dirette)
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

CREATE TABLE IF NOT EXISTS discord_dest (   -- DOVE notificare su Discord: piu canali, ognuno coi suoi filtri
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,                   -- login che possiede la configurazione
  canale TEXT NOT NULL,                    -- id del canale Discord (vuoto se e' un webhook)
  canale_nome TEXT NOT NULL DEFAULT '',    -- nome leggibile (solo per mostrarlo)
  webhook TEXT NOT NULL DEFAULT '',        -- la strada vecchia: un indirizzo invece di un canale
  eventi TEXT NOT NULL DEFAULT '',         -- CSV degli eventi ammessi (vuoto = tutti)
  streamer TEXT NOT NULL DEFAULT '',       -- CSV di login ammessi (vuoto = tutti)
  messaggio TEXT NOT NULL DEFAULT '',      -- il testo di QUESTA destinazione (vuoto = quello di casa)
  ruolo TEXT NOT NULL DEFAULT '',          -- id del ruolo da menzionare (vuoto = nessuno)
  chiudi INTEGER NOT NULL DEFAULT 0,       -- togli l'avviso quando la diretta finisce
  attivo INTEGER NOT NULL DEFAULT 1,
  msg_id TEXT NOT NULL DEFAULT '',         -- ultimo avviso mandato QUI (per toglierlo dopo)
  ts INTEGER NOT NULL DEFAULT 0,
  UNIQUE(channel, canale)
);
CREATE INDEX IF NOT EXISTS idx_dcdest_ch ON discord_dest(channel);

CREATE TABLE IF NOT EXISTS discord_msg (   -- avvisi mandati su Discord: uno per destinazione E per streamer
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

CREATE TABLE IF NOT EXISTS accessi (      -- accessi decisi a mano: si sommano al piano (tutto, scelte) o gli tolgono qualcosa (blocco)
  login TEXT PRIMARY KEY,
  modo TEXT NOT NULL,                     -- tutto | scelte | blocco
  funzioni TEXT NOT NULL DEFAULT '',      -- JSON {chiave: true | numero}: le scelte aperte, o le chiavi chiuse
  scade INTEGER NOT NULL DEFAULT 0,       -- 0 = mai
  nota TEXT NOT NULL DEFAULT '',
  motivo TEXT NOT NULL DEFAULT 'manuale', -- manuale | norme
  chi TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS accessi_storia (  -- ogni cambio agli accessi: chi, quando, prima e dopo
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL,
  chi TEXT NOT NULL DEFAULT '',
  motivo TEXT NOT NULL DEFAULT 'manuale',
  prima TEXT NOT NULL DEFAULT '',
  dopo TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_accessi_storia ON accessi_storia(login, ts);

CREATE TABLE IF NOT EXISTS carte_live (  -- la grafica con cui si annuncia «sono live»
  channel TEXT PRIMARY KEY,
  attiva INTEGER NOT NULL DEFAULT 0,
  dati TEXT NOT NULL DEFAULT '',          -- la carta intera, come la scrive l'editor
  ts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS carte_pagina (  -- l'anteprima del link (pagina link, pagina delle donazioni), se lo streamer l'ha rifatta
  channel TEXT NOT NULL,
  quale TEXT NOT NULL,                     -- link | dona
  dati TEXT NOT NULL DEFAULT '',           -- la carta intera, come la scrive l'editor
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, quale)
);

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

CREATE TABLE IF NOT EXISTS battute (     -- il serbatoio delle battute del canale (!battuta)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  n INTEGER NOT NULL,                     -- numero stabile per canale: !battuta 7 punta sempre a quella
  testo TEXT NOT NULL,
  added_by TEXT NOT NULL DEFAULT '',
  fonte TEXT NOT NULL DEFAULT 'mano',     -- 'mano' = scritta dallo streamer, 'ia' = inventata e tenuta
  usata_ts INTEGER NOT NULL DEFAULT 0,    -- quando e' stata detta l'ultima volta: per non ripetersi
  dette INTEGER NOT NULL DEFAULT 0,       -- quante volte e' stata detta
  risate INTEGER NOT NULL DEFAULT 0,      -- quante volte la chat ha riso davvero (misurato, non stimato)
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_battute_channel ON battute(channel, n);

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
CREATE TABLE IF NOT EXISTS tg_attesa (    -- chi e' entrato nel gruppo e deve ancora premere il tasto
  channel TEXT NOT NULL,                   -- login twitch (proprietario del bot)
  chat_id TEXT NOT NULL,                   -- gruppo in cui e' entrato
  tg_user_id TEXT NOT NULL,                -- chi e' entrato
  nome TEXT NOT NULL DEFAULT '',
  msg_id TEXT NOT NULL DEFAULT '',         -- il messaggio col tasto, da cancellare quando finisce
  scad INTEGER NOT NULL DEFAULT 0,         -- quando scade l'attesa
  PRIMARY KEY (channel, chat_id, tg_user_id)
);
CREATE INDEX IF NOT EXISTS idx_tgattesa_scad ON tg_attesa(scad);
CREATE TABLE IF NOT EXISTS morti_schede (   -- la libreria delle schermate, di tutti
  id TEXT PRIMARY KEY,
  radice TEXT NOT NULL DEFAULT '',         -- la prima versione di questa cosa: e' lei che si segue
  da TEXT NOT NULL DEFAULT '',             -- da quale versione viene
  versione INTEGER NOT NULL DEFAULT 1,
  gioco TEXT NOT NULL DEFAULT '',          -- chiave: minuscolo, senza accenti, spazi singoli
  gioco_nome TEXT NOT NULL DEFAULT '',     -- come l'ha scritto chi l'ha pubblicata
  lingua TEXT NOT NULL DEFAULT 'nessuna',
  firme TEXT NOT NULL DEFAULT '[]',
  autore TEXT NOT NULL DEFAULT '',
  nato INTEGER NOT NULL DEFAULT 0,
  presa INTEGER NOT NULL DEFAULT 0,        -- quante volte qualcuno se l'e' copiata
  tolta INTEGER NOT NULL DEFAULT 0         -- il proprietario puo' togliere qualunque scheda
);
CREATE INDEX IF NOT EXISTS idx_mortischede_gioco ON morti_schede(gioco, lingua);
CREATE INDEX IF NOT EXISTS idx_mortischede_radice ON morti_schede(radice, versione);
CREATE INDEX IF NOT EXISTS idx_mortischede_autore ON morti_schede(autore, nato);
CREATE TABLE IF NOT EXISTS gsi_stato (     -- l'ultimo numero che il gioco ha detto di se'
  channel TEXT PRIMARY KEY,                -- login twitch
  partita TEXT NOT NULL DEFAULT '',        -- gioco + partita: quando cambia, si ribasa
  morti INTEGER NOT NULL DEFAULT 0,        -- il TOTALE di quella partita, non un conto nostro
  quando INTEGER NOT NULL DEFAULT 0        -- l'ultima volta che il gioco ha parlato
);
CREATE TABLE IF NOT EXISTS discord_ruoli (   -- il gestore dei privilegi: il bot DELLO STREAMER sul SUO server
  channel TEXT PRIMARY KEY,                  -- login twitch minuscolo
  token TEXT NOT NULL DEFAULT '',            -- token del bot Discord dello streamer (cifrato)
  guild TEXT NOT NULL DEFAULT '',            -- id del server Discord
  guild_nome TEXT NOT NULL DEFAULT '',       -- nome del server (solo per mostrarlo)
  bot_nome TEXT NOT NULL DEFAULT '',         -- nome del bot (solo per mostrarlo)
  attivo INTEGER NOT NULL DEFAULT 0,         -- il giro gira?
  regole TEXT NOT NULL DEFAULT '[]',         -- JSON: [{tipo, ruolo, soglia}]
  ultimo_giro INTEGER NOT NULL DEFAULT 0,    -- quando e' passato l'ultima volta
  ultimo_esito TEXT NOT NULL DEFAULT '{}',   -- JSON: cosa ha fatto e cosa non ha potuto fare
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS discord_link (    -- chi ha detto «questo account Discord sono io»
  channel TEXT NOT NULL,                     -- il consenso vale per UN canale: non e' una rubrica globale
  login TEXT NOT NULL,                       -- login twitch dello spettatore
  user_id TEXT NOT NULL DEFAULT '',          -- id twitch (per chiedere a Twitch chi e')
  dc_id TEXT NOT NULL,                       -- id Discord
  dc_nome TEXT NOT NULL DEFAULT '',          -- nome Discord (solo per mostrarlo)
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, login)
);
CREATE INDEX IF NOT EXISTS idx_dclink_dc ON discord_link(channel, dc_id);
CREATE TABLE IF NOT EXISTS discord_attesa (  -- chi ha detto a Discord chi e', e aspetta di dirlo in chat
  codice TEXT PRIMARY KEY,                   -- sei caratteri, vivono dieci minuti
  channel TEXT NOT NULL,                     -- vale per un canale solo
  dc_id TEXT NOT NULL,                       -- l'account Discord che ha autorizzato
  dc_nome TEXT NOT NULL DEFAULT '',          -- il suo nome (solo per mostrarlo)
  scad INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dcattesa_dc ON discord_attesa(channel, dc_id);
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
CREATE TABLE IF NOT EXISTS discord_accesso ( -- «entra con Discord»: id Discord → canale dc.<nome>
  dc_id TEXT PRIMARY KEY,                     -- id numerico dell'account Discord
  login TEXT NOT NULL,                        -- il canale che gli appartiene
  nome TEXT NOT NULL DEFAULT '',              -- come si chiama su Discord (per la UI)
  created_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dcaccesso_login ON discord_accesso(login);
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

CREATE TABLE IF NOT EXISTS stato_vivo (      -- lo stato dei motori che deve sopravvivere a un riavvio
  channel TEXT NOT NULL,
  chiave TEXT NOT NULL,                      -- 'giveaway' | 'penitenza' | 'assetto' | 'ritmo'
  dato TEXT NOT NULL DEFAULT '{}',           -- JSON dello stato, letto solo dal motore che l'ha scritto
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, chiave)
);
CREATE TABLE IF NOT EXISTS conti_donazioni (   -- il conto Stripe dello streamer (suo, aperto e gestito da lui) con cui riceve le donazioni
  login TEXT PRIMARY KEY,
  stripe_account TEXT NOT NULL DEFAULT '',     -- non usata: resta per i database gia' creati
  paese TEXT NOT NULL DEFAULT 'IT',            -- non usata: resta per i database gia' creati
  pronto INTEGER NOT NULL DEFAULT 0,           -- 1 finche' la chiave risponde
  dettagli INTEGER NOT NULL DEFAULT 0,         -- non usata: resta per i database gia' creati
  verificato_at INTEGER NOT NULL DEFAULT 0,    -- ultima volta che la chiave ha risposto
  updated_at INTEGER NOT NULL DEFAULT 0,
  chiave TEXT NOT NULL DEFAULT '',             -- la chiave con restrizioni che lo streamer ci affida (nella busta)
  prodotto TEXT NOT NULL DEFAULT '',           -- prod_… «Donazione», creato nel suo conto quando la chiave si verifica
  nota TEXT NOT NULL DEFAULT ''                -- cosa non va con la chiave, con le parole di Stripe (vuota = tutto bene)
);
CREATE TABLE IF NOT EXISTS conti_satispay (    -- il conto Satispay Business dello streamer (suo), per le donazioni
  login TEXT PRIMARY KEY,
  key_id TEXT NOT NULL DEFAULT '',             -- il KeyId che Satispay ha dato alla nostra chiave pubblica
  chiave TEXT NOT NULL DEFAULT '',             -- la chiave privata RSA con cui si firmano le richieste (nella busta)
  pronto INTEGER NOT NULL DEFAULT 0,           -- 1 finche' la firma viene accettata
  nota TEXT NOT NULL DEFAULT '',               -- cosa non va, con le parole di Satispay (vuota = tutto bene)
  verificato_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS donazioni (         -- il registro delle donazioni: quelle in attesa di pagamento e quelle pagate
  id TEXT PRIMARY KEY,                         -- 'stripe:cs_…' | 'satispay:<nostro id>' | 'kofi:<login>:<message_id>' | 'ext:<login>:<id>'
  login TEXT NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'stripe',        -- stripe | satispay | kofi | ext
  stato TEXT NOT NULL DEFAULT 'attesa',        -- attesa | pagata | scaduta
  importo INTEGER NOT NULL DEFAULT 0,          -- in centesimi
  valuta TEXT NOT NULL DEFAULT 'EUR',
  nome TEXT NOT NULL DEFAULT '',
  messaggio TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT 0,
  pagata_at INTEGER NOT NULL DEFAULT 0,
  riferimento TEXT NOT NULL DEFAULT '',        -- il pagamento presso chi lo ha mosso (pi_… di Stripe, id di Satispay), per rimborsare da qui
  rimborsata_at INTEGER NOT NULL DEFAULT 0,
  media TEXT NOT NULL DEFAULT '',              -- l'immagine allegata da chi dona (file nella cartella degli effetti del canale), '' = nessuna
  media_tipo TEXT NOT NULL DEFAULT '',         -- immagine | video (una GIF diventa video)
  media_durata INTEGER NOT NULL DEFAULT 0,     -- ms, per i video
  media_stato TEXT NOT NULL DEFAULT '',        -- attesa (aspetta l'ok) | ok (mandata in onda) | no (scartata o sotto la soglia)
  media_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_donazioni_login ON donazioni(login, stato, pagata_at);

-- I SOSTEGNI AL PROGETTO, che non sono donazioni a uno streamer.
--
-- Stanno in una tabella loro e non in «donazioni» con un login finto. La
-- tentazione c'era: la forma e' la stessa. Ma quella tabella e' fatta per un
-- CANALE — da li' passano l'avviso in diretta, l'obiettivo in overlay,
-- l'immagine da approvare, il rimborso, il blocco «chi ha donato» sulla pagina
-- di qualcuno. Un login finto la' dentro vorrebbe dire ricordarsi di escluderlo
-- in sei posti, e il settimo sarebbe quello che un giorno fa comparire il
-- sostegno di uno sconosciuto nel pannello di uno streamer.
CREATE TABLE IF NOT EXISTS sostegni (
  id TEXT PRIMARY KEY,                         -- 'stripe:cs_…'
  stato TEXT NOT NULL DEFAULT 'attesa',        -- attesa | pagato | scaduto
  importo INTEGER NOT NULL DEFAULT 0,          -- in centesimi
  valuta TEXT NOT NULL DEFAULT 'EUR',
  nome TEXT NOT NULL DEFAULT '',               -- come si firma chi sostiene, o vuoto
  messaggio TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT 0,
  pagato_at INTEGER NOT NULL DEFAULT 0,
  riferimento TEXT NOT NULL DEFAULT ''         -- il pagamento presso Stripe (pi_…)
);
CREATE INDEX IF NOT EXISTS idx_sostegni_stato ON sostegni(stato, created_at);

-- IL REGISTRO DEI GIRI DEL COSTRUTTORE DISCORD.
--
-- Non serve a noi: serve a lui, il giorno che qualcuno chiede «chi ha
-- cancellato #generale». Un giro distruttivo e' l'unica cosa irreversibile che
-- questo prodotto sa fare, e una cosa irreversibile senza una riga che dica
-- quando e cosa e' successa a nessuno.
--
-- Ci finiscono i NOMI di quello che e' stato tolto, non gli id: fra sei mesi
-- un id non dice niente a una persona, e quello che si vuole ricordare e'
-- «c'era un canale che si chiamava cosi'».
CREATE TABLE IF NOT EXISTS dcserver_giri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  quando INTEGER NOT NULL DEFAULT 0,
  chi TEXT NOT NULL DEFAULT '',                -- l'identita' che ha premuto: il costruttore e' del proprietario, i moderatori non ci arrivano
  distruttivo INTEGER NOT NULL DEFAULT 0,
  impronta TEXT NOT NULL DEFAULT '',
  creati INTEGER NOT NULL DEFAULT 0,
  sistemati INTEGER NOT NULL DEFAULT 0,
  tolti INTEGER NOT NULL DEFAULT 0,
  ruoli_creati INTEGER NOT NULL DEFAULT 0,
  ruoli_sistemati INTEGER NOT NULL DEFAULT 0,
  ruoli_tolti INTEGER NOT NULL DEFAULT 0,
  nomi TEXT NOT NULL DEFAULT '',               -- cosa e' sparito, per nome (canali e ruoli)
  errori TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_dcserver_giri ON dcserver_giri(channel, quando);
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

// Guarda-e-poi-agisci, e fra il guardare e l'agire ci sta un altro processo.
// Il collaudo apre lo stesso database da piu' processi in parallelo: due
// guardano, tutti e due non vedono la colonna, tutti e due la aggiungono, e il
// secondo muore con «duplicate column name». Non e' un caso di laboratorio —
// e' successo davvero su CI, e il guasto e' arrivato travestito da tutt'altro
// (un cancello che non riusciva piu' a comporre le pagine servite).
//
// Il contratto di questa funzione non e' «esegui l'ALTER»: e' «dopo di me la
// colonna c'e'». Se ce l'ha messa qualcun altro un istante fa, il contratto e'
// comunque rispettato. Qualunque ALTRO errore invece esce.
function aggiungiColonna(tabella, colonna, definizione) {
  const cols = db.prepare(`PRAGMA table_info(${tabella})`).all();
  if (cols.some((c) => c.name === colonna)) return;
  try {
    db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${definizione}`);
  } catch (e) {
    if (!/duplicate column name/i.test(e?.message || '')) throw e;
  }
}
// La presa sul pubblico si e' aggiunta dopo il serbatoio: CREATE TABLE IF NOT
// EXISTS non tocca una tabella che c'e' gia', e senza queste due righe un
// database che aveva gia' visto le battute restava senza le colonne — con
// l'errore inghiottito dal try/catch, quindi muto.
// Il cancello del gruppo Telegram: spento finche' non lo accendi tu. Un bot che
// silenzia le persone senza che gliel'abbia chiesto nessuno e' un danno.
aggiungiColonna('telegram', 'ingresso', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('telegram', 'ingresso_minuti', 'INTEGER NOT NULL DEFAULT 5');
aggiungiColonna('telegram', 'ingresso_scaduto', "TEXT NOT NULL DEFAULT 'caccia'");
aggiungiColonna('telegram', 'ingresso_testo', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('telegram', 'ingresso_tasto', "TEXT NOT NULL DEFAULT ''");
// Il premio in VIP non scade piu' a calendario ma a DIRETTE: un premio che
// evapora mentre lo streamer sta fermo non e' un premio. `until` resta per i
// VIP dati a mano, che sono un'altra cosa.
aggiungiColonna('vips', 'dirette', 'INTEGER NOT NULL DEFAULT 0');
// Il server che lo streamer vuole, scritto a parole. Vuoto vuol dire «non ne
// ho ancora scelto uno», e allora il pannello gli fa vedere il catalogo.
aggiungiColonna('discord_ruoli', 'preset', "TEXT NOT NULL DEFAULT ''");
// Le frasi con cui il bot risponde in chat al comando dei ruoli: sono dello
// streamer, non nostre. Vuoto = quelle di casa (vedi features/discord-collega.js).
aggiungiColonna('discord_ruoli', 'frasi', "TEXT NOT NULL DEFAULT ''");
// I ruoli nel registro del costruttore sono arrivati dopo i canali: su un
// database gia' in piedi le colonne non ci sono, e CREATE TABLE IF NOT EXISTS
// non le aggiunge.
aggiungiColonna('dcserver_giri', 'ruoli_creati', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('dcserver_giri', 'ruoli_sistemati', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('dcserver_giri', 'ruoli_tolti', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('battute', 'dette', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('battute', 'risate', 'INTEGER NOT NULL DEFAULT 0');
// Quale SCHEMA l'ha costruita. Senza, si potrebbe sapere se una battuta ha fatto
// ridere ma non se ha funzionato il MODO di costruirla — e il modo e' la cosa che
// si impara: una battuta serve una sera, uno schema serve tutte le altre.
aggiungiColonna('battute', 'schema', "TEXT NOT NULL DEFAULT ''");
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
// Quando un modulo a tempo ha parlato l'ultima volta. Stava in memoria, e la
// memoria muore col processo: al riavvio ogni timer risultava "mai partito" e
// partivano tutti insieme, a ogni deploy. Zero vuol dire mai visto: il motore
// non lo fa parlare, segna l'ora e gli fa aspettare un giro intero.
aggiungiColonna('modules', 'timer_last', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('points', 'ruolo', "TEXT NOT NULL DEFAULT ''");  // '' = pubblico · 'staff' = mod/streamer
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
// conoscenza: l'AMBITO di una voce. `quando` la lega al momento della diretta (il
// codice sconto vale finché sei live, l'orario della prossima serve quando sei
// offline); `sempre` la FISSA, cioè entra nel prompt anche se non c'entra con la
// domanda — è il posto per le due o tre cose che il bot non deve mai non sapere.
aggiungiColonna('knowledge', 'quando', "TEXT NOT NULL DEFAULT 'sempre'");   // sempre | live | offline
aggiungiColonna('knowledge', 'fissata', 'INTEGER NOT NULL DEFAULT 0');      // 1 = entra comunque
// moderatori: la porta si apre da due lati. Oltre all'invito dello streamer
// esiste la RICHIESTA di chi modera già il canale sulla piattaforma. Una
// richiesta non è un moderatore: è una domanda in attesa di risposta, e finché
// non ha risposta non occupa nessun posto e non dà nessun accesso.
aggiungiColonna('managers', 'chiesto_at', 'INTEGER NOT NULL DEFAULT 0');    // quando è arrivata la richiesta
aggiungiColonna('managers', 'deciso_at', 'INTEGER NOT NULL DEFAULT 0');     // quando lo streamer ha risposto
aggiungiColonna('managers', 'nota', "TEXT NOT NULL DEFAULT ''");            // due righe di chi chiede
aggiungiColonna('managers', 'verificata', 'INTEGER NOT NULL DEFAULT 0');    // 1 = la piattaforma conferma che modera davvero
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
aggiungiColonna('conti_donazioni', 'chiave', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('conti_donazioni', 'prodotto', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('conti_donazioni', 'nota', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('donazioni', 'riferimento', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('donazioni', 'rimborsata_at', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('donazioni', 'media', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('donazioni', 'media_tipo', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('donazioni', 'media_durata', 'INTEGER NOT NULL DEFAULT 0');
aggiungiColonna('donazioni', 'media_stato', "TEXT NOT NULL DEFAULT ''");
aggiungiColonna('donazioni', 'media_at', 'INTEGER NOT NULL DEFAULT 0');

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

// RINNOVO UNA-TANTUM DELLE CHIAVI DEGLI OVERLAY. Una scorciatoia pubblica ha
// consegnato per mesi il link dell'overlay con la chiave dentro a chiunque
// conoscesse il nome di uno streamer. Una chiave che e' stata pubblica non
// torna segreta chiudendo la porta: va cambiata. Si cambia qui, al primo avvio
// della versione che ha chiuso la porta, una volta sola, per ogni canale che
// ne aveva una — e senza che nessuno debba scrivere un comando su un server.
// Il link nuovo va rimesso nelle sorgenti del programma di regia: lo dicono
// le novita' all'ingresso e il manuale.
export function rinnovaChiaviOverlayUnaTantum() {
  const FLAG = 'overlay_key_rinnovo_v1';
  try {
    const gia = db.prepare("SELECT 1 FROM facts WHERE channel='__migrazioni__' AND key=?").get(FLAG);
    if (gia) return 0;
    const righe = db.prepare('SELECT login, settings FROM streamers').all();
    const scrivi = db.prepare('UPDATE streamers SET settings=? WHERE login=?');
    let n = 0;
    const giro = db.transaction(() => {
      for (const r of righe) {
        const s = safeJson(r.settings) || {};
        if (!s.overlayKey) continue;
        scrivi.run(JSON.stringify({ ...s, overlayKey: crypto.randomBytes(16).toString('hex') }), r.login);
        n++;
      }
      db.prepare(`INSERT INTO facts (channel, key, value, ts) VALUES ('__migrazioni__', ?, ?, ?)
        ON CONFLICT(channel, key) DO UPDATE SET value=excluded.value, ts=excluded.ts`).run(FLAG, String(n), Date.now());
    });
    giro();
    if (n > 0) {
      // eslint-disable-next-line no-console
      console.log(`[db] chiavi degli overlay rinnovate una tantum: ${n} canali (il link va rimesso nelle sorgenti di regia)`);
    }
    return n;
  } catch { return 0; /* best-effort: non blocca l'avvio */ }
}
rinnovaChiaviOverlayUnaTantum();

// Contatori: colonna `overlay` (JSON aspetto/posizione del widget) sui DB esistenti.
(() => {
  try {
    const cols = db.prepare('PRAGMA table_info(contatori)').all();
    if (!cols.some((c) => c.name === 'overlay')) db.exec("ALTER TABLE contatori ADD COLUMN overlay TEXT NOT NULL DEFAULT ''");
    if (!cols.some((c) => c.name === 'verbi')) db.exec("ALTER TABLE contatori ADD COLUMN verbi TEXT NOT NULL DEFAULT ''");
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
// Le due gare. Non sono due economie: le monete si guadagnano allo stesso modo
// per tutti. E' il CONFRONTO a essere diverso — un moderatore e' in chat ogni
// sera per mestiere, quindi in una classifica mista sta in cima sempre e la
// classifica smette di dire qualcosa a chi guarda.
// 'tutti' resta disponibile per chi vuole la vecchia vista unica.
export const CLASSIFICHE = ['pubblico', 'staff', 'tutti'];
const FILTRO_CLASSIFICA = { pubblico: " AND ruolo=''", staff: " AND ruolo='staff'", tutti: '' };

// IL PADRONE NON CORRE NELLA SUA GARA.
//
// Una classifica del canale che mette primo lo streamer non dice niente a
// nessuno: lui c'e' sempre, per mestiere, e le ore guardate le vince per
// definizione. Il nome da lasciar fuori e' quello con cui scrive IN CHAT, che
// non e' sempre il login del canale: un canale Kick si chiama `kick.giada` ma
// in chat lei e' `giada`.
export const padroneDi = (channel) => nomeSu(String(channel || '').toLowerCase());

export const points = {
  get(channel, user) {
    const r = db.prepare('SELECT monete FROM points WHERE channel=? AND user=?').get(channel, String(user).toLowerCase());
    return r ? r.monete : 0;
  },
  // aggiunge (o toglie, con delta negativo) monete; non scende sotto 0. Ritorna il nuovo saldo.
  // `ruolo` va passato SOLO quando lo si conosce davvero ('' o 'staff'): null
  // lascia intatto quello gia' registrato, cosi' un accredito che non sa nulla
  // del ruolo non declassa nessuno.
  add(channel, user, delta, ruolo = null) {
    const u = String(user).toLowerCase();
    const r = ruolo === null || ruolo === undefined ? null : (ruolo === 'staff' ? 'staff' : '');
    db.prepare(`INSERT INTO points (channel, user, monete, ruolo, ts) VALUES (?,?,MAX(0,?),COALESCE(?,''),?)
      ON CONFLICT(channel, user) DO UPDATE SET monete = MAX(0, points.monete + ?), ruolo = COALESCE(?, points.ruolo), ts=?`)
      .run(channel, u, delta, r, now(), delta, r, now());
    return this.get(channel, u);
  },
  ruoloDi(channel, user) {
    const r = db.prepare('SELECT ruolo FROM points WHERE channel=? AND user=?').get(channel, String(user).toLowerCase());
    return r ? (r.ruolo || '') : '';
  },
  // Riscrive il ruolo di TUTTE le righe di un canale da un elenco autorevole
  // (i moderatori secondo Twitch, piu' lo streamer). Retroattivo di proposito:
  // un moderatore che non scrive da mesi deve stare nella gara giusta lo stesso.
  // Chi non e' nell'elenco torna pubblico, che e' l'altra meta' della verita'.
  riallineaRuoli(channel, staff) {
    const elenco = [...new Set((staff || []).map((u) => String(u).toLowerCase()).filter(Boolean))];
    const segnaposto = elenco.length ? elenco.map(() => '?').join(',') : "''";
    const su = db.prepare(`UPDATE points SET ruolo='staff' WHERE channel=? AND ruolo!='staff' AND user IN (${segnaposto})`);
    const giu = db.prepare(`UPDATE points SET ruolo='' WHERE channel=? AND ruolo='staff' AND user NOT IN (${segnaposto})`);
    const dentro = db.transaction(() => ({
      saliti: su.run(channel, ...elenco).changes,
      scesi: giu.run(channel, ...elenco).changes,
    }));
    return dentro();
  },
  // A che posto sta uno NELLA SUA gara. 0 = non e' in classifica (nessuna
  // moneta). Confrontarlo con chi corre in un'altra gara non direbbe niente.
  posizione(channel, user) {
    const u = String(user).toLowerCase();
    const r = db.prepare('SELECT monete, ruolo FROM points WHERE channel=? AND user=?').get(channel, u);
    if (!r) return 0;
    const q = db.prepare("SELECT COUNT(*) c FROM points WHERE channel=? AND ruolo=? AND user<>? AND user NOT LIKE '[%' AND monete>?")
      .get(channel, r.ruolo || '', padroneDi(channel), r.monete);
    return q.c + 1;
  },
  top(channel, n = 5, chi = 'pubblico') {
    const filtro = FILTRO_CLASSIFICA[chi] ?? FILTRO_CLASSIFICA.pubblico;
    return db.prepare(`SELECT user, monete, ruolo FROM points WHERE channel=? AND user<>? AND user NOT LIKE '[%'${filtro} ORDER BY monete DESC LIMIT ?`).all(channel, padroneDi(channel), n);
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
    return db.prepare("SELECT user, display, seconds FROM watchtime WHERE channel=? AND user<>? AND user NOT LIKE '[%' ORDER BY seconds DESC LIMIT ?").all(channel, padroneDi(channel), n);
  },
};

// ---------------------------------------------------------------- PRESENZE (diretta dopo diretta)
// Lo store e' muto: la regola (cos'e' una diretta, quando una presenza conta,
// come cresce la serie) sta in features/presenze.js. I tempi sono millisecondi:
// un `| 0` li avrebbe schiacciati a 32 bit, e una data del 2026 sarebbe
// diventata un numero negativo.
const msIntero = (v) => Math.trunc(Number(v)) || 0;
export const presenze = {
  get(channel, user) {
    return db.prepare('SELECT * FROM presenze WHERE channel=? AND user=?').get(String(channel).toLowerCase(), String(user).toLowerCase()) || null;
  },
  // scrive solo i campi passati; la riga nasce se non c'e'
  set(channel, user, campi = {}) {
    const ch = String(channel).toLowerCase(), u = String(user).toLowerCase();
    const prima = this.get(ch, u) || { dirette: 0, serie: 0, record: 0, ultima: '', ultima_ts: 0, prima_ts: 0, ultimo_msg: 0, salutato: 0 };
    const r = { ...prima, ...campi };
    db.prepare(`INSERT INTO presenze (channel, user, dirette, serie, record, ultima, ultima_ts, prima_ts, ultimo_msg, salutato)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(channel, user) DO UPDATE SET dirette=excluded.dirette, serie=excluded.serie, record=excluded.record,
        ultima=excluded.ultima, ultima_ts=excluded.ultima_ts, prima_ts=excluded.prima_ts, ultimo_msg=excluded.ultimo_msg, salutato=excluded.salutato`)
      .run(ch, u, msIntero(r.dirette), msIntero(r.serie), msIntero(r.record), String(r.ultima || ''), msIntero(r.ultima_ts), msIntero(r.prima_ts), msIntero(r.ultimo_msg), r.salutato ? 1 : 0);
    return this.get(ch, u);
  },
  top(channel, n = 5) {
    const ch = String(channel).toLowerCase();
    return db.prepare(`SELECT user, dirette, serie, record FROM presenze WHERE channel=? AND user<>? AND serie>0 AND user NOT LIKE '[%'
      ORDER BY serie DESC, dirette DESC, record DESC, user LIMIT ?`).all(ch, padroneDi(ch), n);
  },
  diretta(channel) {
    return db.prepare('SELECT * FROM dirette_viste WHERE channel=?').get(String(channel).toLowerCase()) || null;
  },
  setDiretta(channel, { corrente = '', corrente_ts = 0, precedente = '', ultimo_tick = 0 } = {}) {
    db.prepare(`INSERT INTO dirette_viste (channel, corrente, corrente_ts, precedente, ultimo_tick) VALUES (?,?,?,?,?)
      ON CONFLICT(channel) DO UPDATE SET corrente=excluded.corrente, corrente_ts=excluded.corrente_ts, precedente=excluded.precedente, ultimo_tick=excluded.ultimo_tick`)
      .run(String(channel).toLowerCase(), String(corrente || ''), msIntero(corrente_ts), String(precedente || ''), msIntero(ultimo_tick));
  },
  azzera(channel) {
    const ch = String(channel).toLowerCase();
    db.prepare('DELETE FROM presenze WHERE channel=?').run(ch);
    db.prepare('DELETE FROM dirette_viste WHERE channel=?').run(ch);
  },
};

// ---------------------------------------------------------------- RAPPORTI di fine diretta
export const rapporti = {
  salva(channel, { inizio = 0, fine = 0, dati = {} } = {}) {
    const r = db.prepare('INSERT INTO rapporti (channel, inizio, fine, dati, letto, inviato, ts) VALUES (?,?,?,?,0,\'\',?)')
      .run(String(channel).toLowerCase(), msIntero(inizio), msIntero(fine), JSON.stringify(dati || {}), now());
    return Number(r.lastInsertRowid);
  },
  elenco(channel, n = 30) {
    return db.prepare('SELECT * FROM rapporti WHERE channel=? ORDER BY fine DESC, id DESC LIMIT ?').all(String(channel).toLowerCase(), n)
      .map((r) => ({ ...r, dati: safeJson(r.dati) || {}, letto: !!r.letto }));
  },
  nuovi(channel) {
    return db.prepare('SELECT COUNT(*) c FROM rapporti WHERE channel=? AND letto=0').get(String(channel).toLowerCase()).c;
  },
  segnaLetti(channel) {
    db.prepare('UPDATE rapporti SET letto=1 WHERE channel=? AND letto=0').run(String(channel).toLowerCase());
  },
  segnaInviato(id, via) {
    const r = db.prepare('SELECT inviato FROM rapporti WHERE id=?').get(id);
    if (!r) return;
    const lista = new Set(String(r.inviato || '').split(',').filter(Boolean)); lista.add(String(via));
    db.prepare('UPDATE rapporti SET inviato=? WHERE id=?').run([...lista].join(','), id);
  },
};

// ---------------------------------------------------------------- POSTA dello streamer
// Un indirizzo vale solo confermato: il codice della conferma non si conserva,
// si conserva il suo calco (sha256), e scade.
export const postaStreamer = {
  get(channel) { return db.prepare('SELECT * FROM posta_streamer WHERE channel=?').get(String(channel).toLowerCase()) || null; },
  proponi(channel, email, impronta, scade) {
    db.prepare(`INSERT INTO posta_streamer (channel, email, confermata, impronta, scade, ts) VALUES (?,?,0,?,?,?)
      ON CONFLICT(channel) DO UPDATE SET email=excluded.email, confermata=0, impronta=excluded.impronta, scade=excluded.scade, ts=excluded.ts`)
      .run(String(channel).toLowerCase(), String(email).trim().toLowerCase(), String(impronta), msIntero(scade), now());
    return this.get(channel);
  },
  conferma(impronta, ora = now()) {
    const r = db.prepare('SELECT * FROM posta_streamer WHERE impronta=? AND impronta<>\'\' AND scade>=?').get(String(impronta), ora);
    if (!r) return null;
    db.prepare("UPDATE posta_streamer SET confermata=1, impronta='', scade=0, ts=? WHERE channel=?").run(now(), r.channel);
    return this.get(r.channel);
  },
  togli(channel) { db.prepare('DELETE FROM posta_streamer WHERE channel=?').run(String(channel).toLowerCase()); },
};

// ---------------------------------------------------------------- VIP (con scadenza)
export const vips = {
  set(channel, { user, userId = '', display = '', until = 0, dirette = 0, motivo = '' }) {
    const u = String(user).toLowerCase();
    db.prepare(`INSERT INTO vips (channel, user, user_id, display, until, dirette, motivo, ts)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(channel, user) DO UPDATE SET user_id=excluded.user_id, display=excluded.display,
        until=excluded.until, dirette=excluded.dirette, motivo=excluded.motivo, ts=excluded.ts`)
      .run(channel, u, userId, display, until, msIntero(dirette), motivo, now());
  },
  get(channel, user) { return db.prepare('SELECT * FROM vips WHERE channel=? AND user=?').get(channel, String(user).toLowerCase()) || null; },
  remove(channel, user) { db.prepare('DELETE FROM vips WHERE channel=? AND user=?').run(channel, String(user).toLowerCase()); },
  list(channel) { return db.prepare('SELECT * FROM vips WHERE channel=? ORDER BY ts DESC').all(channel); },
  // VIP scaduti su TUTTI i canali (until>0 e già passato): per la rimozione automatica
  scaduti() { return db.prepare('SELECT * FROM vips WHERE until>0 AND until<?').all(now()); },
  // UNA DIRETTA E' FINITA, e il conto di chi ha vinto un premio scende di uno.
  //
  // Si scala alla FINE della diretta, non all'inizio: scalando all'inizio un
  // premio da una diretta sparirebbe la sera dopo, prima di essere stato
  // addosso a qualcuno per una serata intera.
  //
  // Chi era all'ultima diretta non si cancella qui: diventa SCADUTO (una
  // scadenza nel passato), e da li' in poi se ne occupa la ronda che toglie i
  // VIP scaduti — che sa gia' parlare con Twitch e sa gia' riprovare se Twitch
  // non risponde. Una strada sola per togliere un VIP, non due che devono
  // restare d'accordo.
  scalaDiretta(channel) {
    const ch = String(channel).toLowerCase();
    const giro = db.transaction(() => {
      const finiti = db.prepare('UPDATE vips SET dirette=0, until=1 WHERE channel=? AND dirette=1').run(ch).changes;
      db.prepare('UPDATE vips SET dirette = dirette - 1 WHERE channel=? AND dirette>1').run(ch);
      return finiti;
    });
    return giro();
  },
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

// ------------------------------------------------------- i campi segreti
//
// Ogni segreto entra ed esce dalla BUSTA (src/segreti.js): chiave propria per
// ogni valore, chiusa a sua volta con la maestra, e legata al posto in cui
// abita — tabella, colonna, riga. Una busta spostata da una riga all'altra non
// si apre, quindi chi riesce a scrivere nel database non puo' copiarsi addosso
// il segreto di un altro. Il modello per esteso: docs/SEGRETI.md.
//
// Sta qui e non nei singoli accessori perche' il posto va costruito dove si sa
// qual e' la riga, e perche' scritto una volta non puo' divergere.
const _dove = (tabella, colonna, riga) => ({ tabella, colonna, riga: String(riga == null ? '' : riga).toLowerCase() });

function chiudiSegreti(tabella, riga, dati, campi) {
  const out = { ...dati };
  for (const c of campi) if (out[c] != null) out[c] = cifra(String(out[c]), _dove(tabella, c, riga));
  return out;
}

function apriSegreti(tabella, riga, r, campi) {
  if (!r) return r;
  const out = { ...r };
  for (const c of campi) if (out[c]) out[c] = decifra(out[c], _dove(tabella, c, riga));
  return out;
}

// ---------------------------------------------------------------- token
export const tokens = {
  save(kind, login, t) {
    db.prepare(`INSERT INTO tokens (kind, login, user_id, access_token, refresh_token, scopes, expires_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(kind, login) DO UPDATE SET user_id=excluded.user_id, access_token=excluded.access_token,
        refresh_token=excluded.refresh_token, scopes=excluded.scopes, expires_at=excluded.expires_at, updated_at=excluded.updated_at`)
      .run(kind, login.toLowerCase(), t.userId || '',
        cifra(t.accessToken, _dove('tokens', 'access_token', kind + '/' + login)),
        cifra(t.refreshToken || '', _dove('tokens', 'refresh_token', kind + '/' + login)),
        (t.scopes || []).join(' '), t.expiresAt || 0, now());
  },
  get(kind, login) {
    const r = db.prepare('SELECT * FROM tokens WHERE kind=? AND login=?').get(kind, login.toLowerCase());
    if (!r) return null;
    return { userId: r.user_id,
      accessToken: decifra(r.access_token, _dove('tokens', 'access_token', kind + '/' + login)),
      refreshToken: decifra(r.refresh_token, _dove('tokens', 'refresh_token', kind + '/' + login)),
      scopes: r.scopes ? r.scopes.split(' ') : [], expiresAt: r.expires_at };
  },
  // il token del bot è unico: il primo (e unico) con kind='bot'
  getBot() {
    const r = db.prepare("SELECT * FROM tokens WHERE kind='bot' ORDER BY updated_at DESC LIMIT 1").get();
    if (!r) return null;
    return { login: r.login, userId: r.user_id,
      accessToken: decifra(r.access_token, _dove('tokens', 'access_token', 'bot/' + r.login)),
      refreshToken: decifra(r.refresh_token, _dove('tokens', 'refresh_token', 'bot/' + r.login)),
      scopes: r.scopes ? r.scopes.split(' ') : [], expiresAt: r.expires_at };
  },
  delete(kind, login) { db.prepare('DELETE FROM tokens WHERE kind=? AND login=?').run(kind, login.toLowerCase()); },
  // Chi è, da noi, l'utente con QUESTO id sulla piattaforma. Serve ai webhook:
  // l'evento dice «broadcaster 12345», e noi dobbiamo sapere di chi è il canale.
  loginPerUserId(kind, userId) {
    const u = String(userId || '');
    if (!u) return '';
    return db.prepare('SELECT login FROM tokens WHERE kind=? AND user_id=? LIMIT 1').get(kind, u)?.login || '';
  },
  // Tutti i collegati a una piattaforma (per iscrizioni e manutenzione).
  logins(kind) {
    return db.prepare('SELECT login FROM tokens WHERE kind=? ORDER BY login').all(kind).map((r) => r.login);
  },
};

// I segreti che devono stare nella busta, tabella per tabella. È anche l'elenco
// che il cancello (scripts/verifica-segreti.mjs) confronta con lo schema: una
// colonna nuova che sa di segreto e non è qui dentro non passa.
export const CAMPI_SEGRETI = {
  tokens: ['access_token', 'refresh_token'],
  telegram: ['token'],
  spotify_tokens: ['access', 'refresh', 'client_secret'],
  tiktok_tokens: ['access', 'refresh'],
  seventv_tokens: ['token'],
  conti_donazioni: ['chiave'],
  conti_satispay: ['chiave'],
  discord_ruoli: ['token'],
};

// Come si chiama la riga, tabella per tabella. Serve alla busta: è il «dove
// abita», e senza non si potrebbe né chiudere né riaprire.
const RIGA_SEGRETI = {
  tokens: (r) => r.kind + '/' + r.login,
  telegram: (r) => r.channel,
  spotify_tokens: (r) => r.login,
  tiktok_tokens: (r) => r.login,
  seventv_tokens: (r) => r.login,
  conti_donazioni: (r) => r.login,
  conti_satispay: (r) => r.login,
  discord_ruoli: (r) => r.channel,
};
const CHIAVE_SEGRETI = {
  tokens: ['kind', 'login'],
  telegram: ['channel'],
  spotify_tokens: ['login'],
  tiktok_tokens: ['login'],
  seventv_tokens: ['login'],
  conti_donazioni: ['login'],
  conti_satispay: ['login'],
  discord_ruoli: ['channel'],
};

// Porta nella busta di ADESSO tutto quello che è rimasto indietro: il chiaro di
// prima, e le buste di un anello precedente. Idempotente, e non lancia mai —
// un avvio che cade per colpa di una migrazione della cifratura sarebbe il modo
// più elegante di spegnere il servizio. Ritorna quante righe ha riscritto.
export function migraSegreti() {
  let n = 0;
  for (const [tabella, campi] of Object.entries(CAMPI_SEGRETI)) {
    try {
      const chiave = CHIAVE_SEGRETI[tabella];
      const nomeRiga = RIGA_SEGRETI[tabella];
      const righe = db.prepare(`SELECT ${[...chiave, ...campi].join(', ')} FROM ${tabella}`).all();
      const upd = db.prepare(`UPDATE ${tabella} SET ${campi.map((c) => c + '=?').join(', ')} `
        + `WHERE ${chiave.map((c) => c + '=?').join(' AND ')}`);
      for (const r of righe) {
        const riga = nomeRiga(r);
        let daFare = false;
        const nuovi = campi.map((c) => {
          const v = r[c] || '';
          if (!v) return v;
          if (anello(v) === anelloCorrente) return v;      // già nella busta di adesso
          daFare = true;
          return cifra(decifra(v, _dove(tabella, c, riga)), _dove(tabella, c, riga));
        });
        if (!daFare) continue;
        upd.run(...nuovi, ...chiave.map((c) => r[c]));
        n++;
      }
    } catch { /* una tabella che non c'è ancora non è un errore */ }
  }
  return n;
}

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
  // il sito non lo conferma piu': torna all'Essenziale, il canale resta
  unmarkCommunity(login) {
    db.prepare('UPDATE streamers SET community=0 WHERE login=?').run(login.toLowerCase());
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
// Gli accessi decisi a mano dal proprietario (e, domani, dal controllo delle
// norme): una riga per canale che si SOMMA al piano («tutto», «scelte») o gli
// TOGLIE qualcosa («blocco»), con scadenza facoltativa, nota e motivo. Ogni
// cambio lascia una riga di storia: chi, quando, prima e dopo. Cosa ne fa il
// calcolo dei diritti sta in features/accesso.js, in un posto solo.
export const MODI_ACCESSO = ['tutto', 'scelte', 'blocco'];
export const accessi = {
  _riga(r) {
    if (!r) return null;
    let funzioni = {};
    try { funzioni = r.funzioni ? JSON.parse(r.funzioni) : {}; } catch { funzioni = {}; }
    return { login: r.login, modo: r.modo, funzioni: funzioni && typeof funzioni === 'object' ? funzioni : {},
      scade: r.scade || 0, nota: r.nota || '', motivo: r.motivo || 'manuale', chi: r.chi || '', ts: r.ts || 0 };
  },
  get(login) { return this._riga(db.prepare('SELECT * FROM accessi WHERE login=?').get(String(login || '').toLowerCase())); },
  // vale adesso? (c'e', ha un modo noto, e non e' scaduta)
  attiva(r, ora = now()) { return !!r && MODI_ACCESSO.includes(r.modo) && (!r.scade || r.scade > ora); },
  elenco() { return db.prepare('SELECT * FROM accessi ORDER BY ts DESC').all().map((r) => this._riga(r)); },
  set(login, { modo, funzioni, scade, nota, motivo } = {}, chi = '') {
    const l = String(login || '').toLowerCase();
    if (!/^[a-z0-9_]{1,30}$/.test(l)) throw new Error('login non valido');
    if (!MODI_ACCESSO.includes(modo)) throw new Error('modo non valido');
    const prima = this.get(l);
    const f = {};
    for (const [k, v] of Object.entries(funzioni && typeof funzioni === 'object' ? funzioni : {})) {
      if (!/^[a-zA-Z]{1,30}$/.test(k)) continue;
      if (v === true) f[k] = true;
      else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) f[k] = Math.round(v);
    }
    const riga = { modo, funzioni: f, scade: Math.max(0, Math.round(Number(scade) || 0)), nota: String(nota || '').slice(0, 300),
      motivo: motivo === 'norme' ? 'norme' : 'manuale', chi: String(chi || '').slice(0, 60), ts: now() };
    db.prepare(`INSERT INTO accessi (login, modo, funzioni, scade, nota, motivo, chi, ts) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET modo=excluded.modo, funzioni=excluded.funzioni, scade=excluded.scade,
        nota=excluded.nota, motivo=excluded.motivo, chi=excluded.chi, ts=excluded.ts`)
      .run(l, riga.modo, JSON.stringify(riga.funzioni), riga.scade, riga.nota, riga.motivo, riga.chi, riga.ts);
    this._storia(l, riga.chi, riga.motivo, prima, { ...riga, login: l });
    return this.get(l);
  },
  togli(login, chi = '', motivo = 'manuale') {
    const l = String(login || '').toLowerCase();
    const prima = this.get(l);
    if (!prima) return false;
    db.prepare('DELETE FROM accessi WHERE login=?').run(l);
    this._storia(l, chi, motivo, prima, null);
    return true;
  },
  _storia(login, chi, motivo, prima, dopo) {
    db.prepare('INSERT INTO accessi_storia (login, chi, motivo, prima, dopo, ts) VALUES (?,?,?,?,?,?)')
      .run(login, String(chi || '').slice(0, 60), motivo === 'norme' ? 'norme' : 'manuale', prima ? JSON.stringify(prima) : '', dopo ? JSON.stringify(dopo) : '', now());
    db.prepare('DELETE FROM accessi_storia WHERE login=? AND id NOT IN (SELECT id FROM accessi_storia WHERE login=? ORDER BY ts DESC, id DESC LIMIT 50)').run(login, login);
  },
  storia(login, n = 20) {
    const j = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
    return db.prepare('SELECT * FROM accessi_storia WHERE login=? ORDER BY ts DESC, id DESC LIMIT ?')
      .all(String(login || '').toLowerCase(), Math.max(1, Math.min(50, n | 0)))
      .map((r) => ({ id: r.id, chi: r.chi, motivo: r.motivo, prima: j(r.prima), dopo: j(r.dopo), ts: r.ts }));
  },
};

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
  // abbonamento operativo (accesso attivo). Una prova vale finche' dura: lo
  // decide la data, non la ronda che poi la chiude.
  attivo(login, ora = now()) {
    const s = this.get(login);
    if (!s) return false;
    if (s.status === 'active') return true;
    return s.status === 'trialing' && !(s.current_period_end > 0 && s.current_period_end < ora);
  },
  // trial (promo) scaduti da revocare: quelli in prova con periodo finito.
  // I paganti (active) li gestisce il webhook Stripe, non questo.
  scaduti(ora = now()) {
    return db.prepare("SELECT * FROM subscriptions WHERE status='trialing' AND current_period_end>0 AND current_period_end<?")
      .all(ora);
  },
};

// ---------------------------------------------------------------- Donazioni (conto Stripe e registro)
// Il conto Stripe dello streamer: suo, aperto da solo e gestito da solo. Qui
// sta solo la chiave con restrizioni che ci ha affidato, nella busta come
// ogni altro token, e l'id del prodotto «Donazione» creato nel suo conto.
export const contiDonazioni = {
  get(login) {
    const l = String(login).toLowerCase();
    const r = db.prepare('SELECT * FROM conti_donazioni WHERE login=?').get(l);
    if (!r) return null;
    const chiave = decifra(r.chiave, _dove('conti_donazioni', 'chiave', l));
    return { ...r, chiave, coda: chiave.slice(-4) };
  },
  set(login, { chiave, prodotto, pronto, verificato, nota } = {}) {
    const l = String(login).toLowerCase();
    const prima = this.get(l) || {};
    const ch = chiave !== undefined ? String(chiave || '') : (prima.chiave || '');
    db.prepare(`INSERT INTO conti_donazioni (login, chiave, prodotto, pronto, verificato_at, updated_at, nota)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET chiave=excluded.chiave, prodotto=excluded.prodotto,
        pronto=excluded.pronto, verificato_at=excluded.verificato_at, updated_at=excluded.updated_at, nota=excluded.nota`)
      .run(l, cifra(ch, _dove('conti_donazioni', 'chiave', l)), prodotto ?? prima.prodotto ?? '',
        (pronto ?? !!prima.pronto) ? 1 : 0, verificato ? now() : (prima.verificato_at || 0), now(),
        nota !== undefined ? String(nota || '').slice(0, 300) : (prima.nota || ''));
    return this.get(l);
  },
  togli(login) { db.prepare('DELETE FROM conti_donazioni WHERE login=?').run(String(login).toLowerCase()); },
};

// Il conto Satispay Business dello streamer: il KeyId e la chiave privata con
// cui si firmano le richieste, nella busta. Il conto e' suo; noi firmiamo.
export const contiSatispay = {
  get(login) {
    const l = String(login).toLowerCase();
    const r = db.prepare('SELECT * FROM conti_satispay WHERE login=?').get(l);
    if (!r) return null;
    return { ...r, chiave: decifra(r.chiave, _dove('conti_satispay', 'chiave', l)), coda: String(r.key_id || '').slice(-4) };
  },
  set(login, { keyId, chiave, pronto, verificato, nota } = {}) {
    const l = String(login).toLowerCase();
    const prima = this.get(l) || {};
    const ch = chiave !== undefined ? String(chiave || '') : (prima.chiave || '');
    db.prepare(`INSERT INTO conti_satispay (login, key_id, chiave, pronto, nota, verificato_at, updated_at)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET key_id=excluded.key_id, chiave=excluded.chiave, pronto=excluded.pronto,
        nota=excluded.nota, verificato_at=excluded.verificato_at, updated_at=excluded.updated_at`)
      .run(l, keyId ?? prima.key_id ?? '', cifra(ch, _dove('conti_satispay', 'chiave', l)), (pronto ?? !!prima.pronto) ? 1 : 0,
        nota !== undefined ? String(nota || '').slice(0, 300) : (prima.nota || ''), verificato ? now() : (prima.verificato_at || 0), now());
    return this.get(l);
  },
  togli(login) { db.prepare('DELETE FROM conti_satispay WHERE login=?').run(String(login).toLowerCase()); },
};

// I giri del costruttore Discord. Si scrive SEMPRE, anche quando non si e'
// tolto niente: un registro che compare solo quando si cancella e' un registro
// che non dice se quel giorno era stato fatto anche altro.
export const dcGiri = {
  segna(channel, { chi = '', distruttivo = false, impronta = '', creati = 0, sistemati = 0, tolti = 0,
    ruoliCreati = 0, ruoliSistemati = 0, ruoliTolti = 0, nomi = [], errori = [] }) {
    db.prepare(`INSERT INTO dcserver_giri (channel, quando, chi, distruttivo, impronta, creati, sistemati, tolti,
        ruoli_creati, ruoli_sistemati, ruoli_tolti, nomi, errori)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(String(channel).toLowerCase(), now(), String(chi || '').slice(0, 40), distruttivo ? 1 : 0,
        String(impronta || '').slice(0, 32), creati | 0, sistemati | 0, tolti | 0,
        ruoliCreati | 0, ruoliSistemati | 0, ruoliTolti | 0,
        (Array.isArray(nomi) ? nomi : []).slice(0, 80).join(', ').slice(0, 2000),
        (Array.isArray(errori) ? errori : []).join(' · ').slice(0, 500));
  },
  ultimi(channel, quanti = 20) {
    return db.prepare('SELECT * FROM dcserver_giri WHERE channel=? ORDER BY quando DESC LIMIT ?')
      .all(String(channel).toLowerCase(), Math.max(1, Math.min(100, quanti | 0)));
  },
};

// Il registro dei sostegni al progetto. Piccolo apposta: apri, paga, scadi,
// leggi. Niente rimborsi da qui (si fanno dal Dashboard di Stripe, dove i
// soldi stanno davvero) e niente media: un sostegno non va in onda da nessuna
// parte, quindi non c'e' niente da approvare.
export const sostegni = {
  apri(id, { importo = 0, valuta = 'EUR', nome = '', messaggio = '' }) {
    return db.prepare(`INSERT OR IGNORE INTO sostegni (id, stato, importo, valuta, nome, messaggio, created_at)
      VALUES (?, 'attesa', ?, ?, ?, ?, ?)`)
      .run(String(id), Math.max(0, Math.round(Number(importo) || 0)),
        String(valuta || 'EUR').toUpperCase().slice(0, 3), String(nome || '').slice(0, 60),
        String(messaggio || '').slice(0, 300), now()).changes > 0;
  },
  get(id) { return db.prepare('SELECT * FROM sostegni WHERE id=?').get(String(id)) || null; },
  // Il passaggio attesa → pagato avviene UNA volta sola: torna vero solo a chi
  // ci arriva per primo, cosi' il ritorno sulla pagina e la ronda non contano
  // due volte lo stesso pagamento.
  paga(id, importo, riferimento = '') {
    const r = db.prepare("UPDATE sostegni SET stato='pagato', pagato_at=?, importo=?, riferimento=? WHERE id=? AND stato='attesa'")
      .run(now(), Math.max(0, Math.round(Number(importo) || 0)), String(riferimento || '').slice(0, 80), String(id));
    return r.changes > 0;
  },
  scadi(id) { db.prepare("UPDATE sostegni SET stato='scaduto' WHERE id=? AND stato='attesa'").run(String(id)); },
  inAttesa(prima) {
    return db.prepare("SELECT * FROM sostegni WHERE stato='attesa' AND created_at<? ORDER BY created_at LIMIT 40").all(msIntero(prima));
  },
  ultimi(quanti = 50) {
    return db.prepare("SELECT * FROM sostegni WHERE stato='pagato' ORDER BY pagato_at DESC LIMIT ?").all(Math.max(1, Math.min(200, quanti | 0)));
  },
  quanto() {
    const r = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(importo),0) tot FROM sostegni WHERE stato='pagato'").get();
    return { quanti: Number(r?.n) || 0, totale: Number(r?.tot) || 0 };
  },
};

// Il registro delle donazioni. Una riga per pagamento, con l'id che gli da' chi
// lo porta (la sessione di Stripe, l'avviso di Ko-fi): la stessa donazione
// non entra due volte, e il passaggio attesa → pagata avviene una volta sola,
// qualunque sia il numero di richieste che lo chiedono nello stesso istante.
export const registroDonazioni = {
  _riga(id, { login, fonte = 'stripe', importo = 0, valuta = 'EUR', nome = '', messaggio = '', riferimento = '', media = null }, stato) {
    const t = now();
    const m = media && media.file ? media : null;
    return db.prepare(`INSERT OR IGNORE INTO donazioni (id, login, fonte, stato, importo, valuta, nome, messaggio, created_at, pagata_at, riferimento, media, media_tipo, media_durata, media_stato)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(String(id), String(login).toLowerCase(), fonte, stato, Math.max(0, Math.round(Number(importo) || 0)),
        String(valuta || 'EUR').toUpperCase().slice(0, 3), String(nome || '').slice(0, 60), String(messaggio || '').slice(0, 200),
        t, stato === 'pagata' ? t : 0, String(riferimento || '').slice(0, 80),
        m ? String(m.file).slice(0, 120) : '', m ? (m.tipo === 'video' ? 'video' : 'immagine') : '',
        m ? Math.max(0, Math.round(Number(m.durata) || 0)) : 0, m ? 'attesa' : '').changes > 0;
  },
  // la riga di un pagamento, dal suo id presso chi lo ha mosso (la callback di Satispay porta solo quello)
  perRiferimento(login, riferimento) {
    if (!riferimento) return null;
    return db.prepare('SELECT * FROM donazioni WHERE login=? AND riferimento=?').get(String(login).toLowerCase(), String(riferimento)) || null;
  },
  // una sessione di pagamento aperta: entra in attesa
  apri(id, dati) { return this._riga(id, dati, 'attesa'); },
  // una donazione gia' avvenuta altrove (Ko-fi, chiave API): entra pagata; false se era gia' entrata
  segna(id, dati) { return this._riga(id, dati, 'pagata'); },
  get(id) { return db.prepare('SELECT * FROM donazioni WHERE id=?').get(String(id)) || null; },
  // attesa → pagata, in un passaggio solo: true per chi ci riesce, false per tutti gli altri
  paga(id, importo, riferimento) {
    return db.prepare(`UPDATE donazioni SET stato='pagata', pagata_at=?, importo=COALESCE(?, importo), riferimento=COALESCE(?, riferimento) WHERE id=? AND stato='attesa'`)
      .run(now(), Number.isFinite(importo) ? Math.round(importo) : null, riferimento ? String(riferimento).slice(0, 80) : null, String(id)).changes > 0;
  },
  getDi(login, id) {
    return db.prepare('SELECT * FROM donazioni WHERE id=? AND login=?').get(String(id), String(login).toLowerCase()) || null;
  },
  // le pagate, dalla piu' recente, a pagine: `prima` e' il pagata_at dell'ultima riga vista
  elenco(login, { prima = 0, n = 50 } = {}) {
    const l = String(login).toLowerCase();
    const lim = Math.max(1, Math.min(200, n | 0));
    return prima > 0
      ? db.prepare("SELECT * FROM donazioni WHERE login=? AND stato='pagata' AND pagata_at<? ORDER BY pagata_at DESC LIMIT ?").all(l, prima, lim)
      : db.prepare("SELECT * FROM donazioni WHERE login=? AND stato='pagata' ORDER BY pagata_at DESC LIMIT ?").all(l, lim);
  },
  // quanto e' arrivato oggi, negli ultimi trenta giorni, nell'anno e da sempre,
  // valuta per valuta (centesimi), senza le rimborsate
  riepilogo(login, ora = now()) {
    const l = String(login).toLowerCase();
    const mezzanotte = new Date(ora); mezzanotte.setHours(0, 0, 0, 0);
    const q = db.prepare("SELECT valuta, SUM(importo) AS somma, COUNT(*) AS quante FROM donazioni WHERE login=? AND stato='pagata' AND rimborsata_at=0 AND pagata_at>=? GROUP BY valuta");
    return {
      oggi: q.all(l, mezzanotte.getTime()),
      mese: q.all(l, ora - 30 * 86400_000),
      anno: q.all(l, ora - 365 * 86400_000),
      sempre: q.all(l, 0),
    };
  },
  rimborsa(login, id) {
    return db.prepare("UPDATE donazioni SET rimborsata_at=? WHERE id=? AND login=? AND stato='pagata' AND rimborsata_at=0")
      .run(now(), String(id), String(login).toLowerCase()).changes > 0;
  },
  elimina(login, id) {
    return db.prepare('DELETE FROM donazioni WHERE id=? AND login=?').run(String(id), String(login).toLowerCase()).changes > 0;
  },
  // una sessione mai pagata: scade, e l'immagine allegata non ha piu' ragione di restare
  // (il file lo toglie chi chiama, che ha la riga in mano)
  scadi(id) {
    return db.prepare("UPDATE donazioni SET stato='scaduta', media='', media_stato='' WHERE id=? AND stato='attesa'").run(String(id)).changes > 0;
  },
  // ── l'immagine di chi dona ──
  // quante aspettano (un pagamento o una decisione) su un canale: il tetto vale per costruzione
  mediaInAttesa(login) {
    return db.prepare("SELECT COUNT(*) AS n FROM donazioni WHERE login=? AND media!='' AND media_stato='attesa'").get(String(login).toLowerCase()).n;
  },
  // le pagate con un'immagine che aspetta l'ok dello streamer, dalla piu' vecchia
  mediaDaApprovare(login) {
    return db.prepare("SELECT * FROM donazioni WHERE login=? AND stato='pagata' AND media!='' AND media_stato='attesa' ORDER BY pagata_at ASC LIMIT 50").all(String(login).toLowerCase());
  },
  // mandata in onda (dallo streamer, o da sola): attesa → ok, una volta sola
  mediaOk(login, id) {
    return db.prepare("UPDATE donazioni SET media_stato='ok', media_at=? WHERE id=? AND login=? AND stato='pagata' AND media!='' AND media_stato='attesa'")
      .run(now(), String(id), String(login).toLowerCase()).changes > 0;
  },
  // scartata (dallo streamer, o sotto la soglia pagata): la riga resta, il file
  // no. Torna { login, media } a chi deve cancellare il file, null se non c'era.
  mediaVia(id) {
    const r = db.prepare("SELECT login, media FROM donazioni WHERE id=? AND media!=''").get(String(id));
    if (!r) return null;
    db.prepare("UPDATE donazioni SET media='', media_stato='no', media_at=? WHERE id=?").run(now(), String(id));
    return r;
  },
  inAttesa() {
    return db.prepare("SELECT * FROM donazioni WHERE stato='attesa' ORDER BY created_at ASC LIMIT 200").all();
  },
  ultime(login, n = 10) {
    return db.prepare("SELECT * FROM donazioni WHERE login=? AND stato='pagata' ORDER BY pagata_at DESC LIMIT ?")
      .all(String(login).toLowerCase(), Math.max(1, Math.min(50, n | 0)));
  },
  // Il blocco «Chi ha donato» della pagina: gli ultimi (senza le rimborsate;
  // chi non ha scritto un nome compare come qualcuno) e i primi per somma
  // (solo con un nome, stesso nome in maiuscolo o minuscolo = stessa persona),
  // del mese o di sempre. Centesimi, come tutto il registro.
  donatori(login, n = 20) {
    const l = String(login).toLowerCase();
    const lim = Math.max(1, Math.min(50, n | 0));
    const ultimi = db.prepare("SELECT nome, importo, valuta, pagata_at FROM donazioni WHERE login=? AND stato='pagata' AND rimborsata_at=0 ORDER BY pagata_at DESC LIMIT ?").all(l, lim);
    const primi = (da) => db.prepare("SELECT MIN(nome) AS nome, valuta, SUM(importo) AS somma, COUNT(*) AS quante FROM donazioni WHERE login=? AND stato='pagata' AND rimborsata_at=0 AND nome!='' AND pagata_at>=? GROUP BY lower(nome), valuta ORDER BY somma DESC, quante DESC LIMIT ?").all(l, da, lim);
    return { ultimi, mese: primi(now() - 30 * 86400_000), sempre: primi(0) };
  },
  // quanto e' arrivato, valuta per valuta (centesimi), e quante donazioni
  totali(login) {
    return db.prepare("SELECT valuta, SUM(importo) AS somma, COUNT(*) AS quante FROM donazioni WHERE login=? AND stato='pagata' GROUP BY valuta")
      .all(String(login).toLowerCase());
  },
  // le sessioni scadute non dicono piu' niente dopo un giorno; le donazioni si tengono un anno
  // Torna { login, media } delle righe tolte che avevano ancora un file: il
  // file lo cancella chi chiama.
  pulisci() {
    const t = now();
    const via = db.prepare("SELECT login, media FROM donazioni WHERE media!='' AND ((stato='scaduta' AND created_at<?) OR (stato='pagata' AND pagata_at<?))").all(t - 86400_000, t - 365 * 86400_000);
    db.prepare("DELETE FROM donazioni WHERE stato='scaduta' AND created_at<?").run(t - 86400_000);
    db.prepare("DELETE FROM donazioni WHERE stato='pagata' AND pagata_at<?").run(t - 365 * 86400_000);
    return via;
  },
  rimuovi(login) { db.prepare('DELETE FROM donazioni WHERE login=?').run(String(login).toLowerCase()); },
};

// ---------------------------------------------------------------- Spotify (richieste musicali)
// Token OAuth di Spotify per canale (connettore "richieste musicali"). Solo per
// aggiungere brani alla coda del broadcaster: nessun dato personale oltre ai token.
export const spotifyTokens = {
  get(login) {
    const l = String(login).toLowerCase();
    const r = db.prepare('SELECT * FROM spotify_tokens WHERE login=?').get(l) || null;
    return apriSegreti('spotify_tokens', l, r, ['access', 'refresh', 'client_secret']);
  },
  set(login, { access = '', refresh = '', scadenza = 0 } = {}) {
    const l = String(login).toLowerCase();
    ({ access, refresh } = chiudiSegreti('spotify_tokens', l, { access, refresh }, ['access', 'refresh']));
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
    clientSecret = cifra(String(clientSecret || ''), _dove('spotify_tokens', 'client_secret', l));
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
    const l = String(login).toLowerCase();
    const r = db.prepare('SELECT * FROM tiktok_tokens WHERE login=?').get(l) || null;
    return apriSegreti('tiktok_tokens', l, r, ['access', 'refresh']);
  },
  set(login, { access = '', refresh = '', scadenza = 0, refreshScadenza = 0, openId, username } = {}) {
    const l = String(login).toLowerCase();
    ({ access, refresh } = chiudiSegreti('tiktok_tokens', l, { access, refresh }, ['access', 'refresh']));
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
    const l = String(login).toLowerCase();
    const r = db.prepare('SELECT * FROM seventv_tokens WHERE login=?').get(l) || null;
    return apriSegreti('seventv_tokens', l, r, ['token']);
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
        cifra(token !== undefined ? String(token || '') : (cur.token || ''), _dove('seventv_tokens', 'token', l)),
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

// CHI ENTRA CON DISCORD E BASTA.
//
// Il canale si chiama `dc.<nome>`, ma chi torna si riconosce dall'ID, non dal
// nome: su Discord il nome si cambia, e chi lo cambia deve ritrovare il suo
// server, non trovarne uno nuovo e vuoto. E' la stessa regola di Kick e
// YouTube, scritta dove serve per Discord.
export const dcAccesso = {
  perDc(dcId) {
    return db.prepare('SELECT * FROM discord_accesso WHERE dc_id=?').get(String(dcId)) || null;
  },
  perLogin(login) {
    return db.prepare('SELECT * FROM discord_accesso WHERE login=?').get(String(login).toLowerCase()) || null;
  },
  lega(dcId, login, { nome = '' } = {}) {
    db.prepare(`INSERT INTO discord_accesso (dc_id, login, nome, created_at)
      VALUES (?,?,?,?)
      ON CONFLICT(dc_id) DO UPDATE SET login=excluded.login, nome=excluded.nome`)
      .run(String(dcId), String(login).toLowerCase(), String(nome || '').slice(0, 120), now());
    return this.perDc(dcId);
  },
  scorda(login) { db.prepare('DELETE FROM discord_accesso WHERE login=?').run(String(login).toLowerCase()); },
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
// Le battute del canale. Come le citazioni per la forma, diverse per il verso:
// una citazione la si cerca, una battuta la si tira fuori — e non due volte di
// fila. Per questo qui c'e' `usata_ts`: si pesca fra quelle dette meno di
// recente invece che a caso, se no in una serata la stessa esce tre volte.
export const battute = {
  add(channel, testo, by = '', fonte = 'mano', schema = '') {
    const ch = String(channel).toLowerCase();
    const t = String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (t.length < 3) return null;
    const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const testi = db.prepare('SELECT testo FROM battute WHERE channel=?').all(ch).map((r) => norm(r.testo));
    if (testi.includes(norm(t))) return null;          // gia' c'e': non si duplica
    const n = (db.prepare('SELECT MAX(n) m FROM battute WHERE channel=?').get(ch).m || 0) + 1;
    // Le fonti sono un ELENCO, non un si'/no. Prima qui c'era `fonte === 'ia' ? 'ia'
    // : 'mano'`: una fonte nuova sarebbe diventata 'mano' in silenzio, e le battute
    // del motore avrebbero detto di essere state scritte a mano.
    const FONTI = new Set(['mano', 'ia', 'motore', 'lei']);
    const f = FONTI.has(String(fonte)) ? String(fonte) : 'mano';
    db.prepare('INSERT INTO battute (channel, n, testo, added_by, fonte, schema, usata_ts, ts) VALUES (?,?,?,?,?,?,?,?)')
      .run(ch, n, t, String(by).toLowerCase(), f, String(schema || '').slice(0, 40), 0, now());
    return n;
  },
  // Come sta andando un MODO di costruire battute su questo canale: quante volte
  // le sue battute sono state dette e quante hanno fatto ridere davvero.
  perSchema(channel, schema) {
    const r = db.prepare(
      'SELECT COALESCE(SUM(dette),0) dette, COALESCE(SUM(risate),0) risate FROM battute WHERE channel=? AND schema=?',
    ).get(String(channel).toLowerCase(), String(schema || ''));
    return { dette: Number(r?.dette) || 0, risate: Number(r?.risate) || 0 };
  },
  get(channel, n) {
    return db.prepare('SELECT * FROM battute WHERE channel=? AND n=?').get(String(channel).toLowerCase(), Number(n) || 0) || null;
  },
  // Quale battuta esce. Due cose insieme, e nessuna delle due e' il caso:
  //
  //  · la meno detta di RECENTE, se no in una serata la stessa esce tre volte e
  //    sembra che il bot ne sappia una sola;
  //  · quella che ha fatto ridere DAVVERO. La presa sul pubblico non e'
  //    un'impressione: dopo averla detta si conta chi ride, e il conto resta.
  //
  // Una battuta mai provata parte con un credito (le si da' il beneficio del
  // dubbio, se no le nuove non uscirebbero mai e il serbatoio si fossilizza sulle
  // prime tre). Una che e' stata detta piu' volte e non ha fatto ridere nessuno
  // scende in fondo da sola, senza che nessuno debba toglierla.
  prossima(channel) {
    const ch = String(channel).toLowerCase();
    const tutte = db.prepare('SELECT * FROM battute WHERE channel=?').all(ch);
    if (!tutte.length) return null;
    const adesso = now();
    const voto = (b) => {
      const presa = (b.risate + 1) / (b.dette + 2);          // credito iniziale per le mai provate
      const riposo = Math.min(1, (adesso - b.usata_ts) / (6 * 3600_000));   // sei ore per tornare fresca
      return presa * (0.25 + 0.75 * riposo);
    };
    const scelta = tutte.map((b) => ({ b, v: voto(b) })).sort((x, y) => y.v - x.v)[0].b;
    return scelta;
  },
  // IL BOT L'HA DETTA. Il conto sta QUI e non dentro `prossima`, perche' `prossima`
  // e' solo una delle strade: quella del serbatoio. Le battute che il motore
  // costruisce sul momento non passano di li', e col conto dentro `prossima`
  // sarebbero rimaste «mai dette» per sempre — con le loro risate divise per zero,
  // cioe' con lo schema che le ha fatte che non imparava niente. Un evento solo,
  // un posto solo: chi dice una battuta chiama questa, da qualunque strada venga.
  segnaDetta(channel, n) {
    db.prepare('UPDATE battute SET usata_ts=?, dette=dette+1 WHERE channel=? AND n=?')
      .run(now(), String(channel).toLowerCase(), Number(n) || 0);
  },
  // La chat ha riso: si segna sulla battuta, non da qualche parte in generale.
  haFattoRidere(channel, n) {
    db.prepare('UPDATE battute SET risate=risate+1 WHERE channel=? AND n=?')
      .run(String(channel).toLowerCase(), Number(n) || 0);
  },
  list(channel) { return db.prepare('SELECT * FROM battute WHERE channel=? ORDER BY n').all(String(channel).toLowerCase()); },
  remove(channel, n) { db.prepare('DELETE FROM battute WHERE channel=? AND n=?').run(String(channel).toLowerCase(), Number(n) || 0); },
  count(channel) { return db.prepare('SELECT COUNT(*) c FROM battute WHERE channel=?').get(String(channel).toLowerCase()).c; },
};

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
  // I moderatori del canale: chi c'è (attivo) e chi è stato chiamato (invitato).
  // Le richieste non stanno qui: sono domande, non moderatori, e mescolarle
  // all'elenco vorrebbe dire mostrare come staff qualcuno a cui non si è ancora
  // detto sì. Si leggono con `richiesteByChannel`.
  listByChannel(channel) {
    return db.prepare("SELECT * FROM managers WHERE channel=? AND status IN ('attivo','invitato') ORDER BY status DESC, created_at")
      .all(String(channel).toLowerCase());
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

  // --- la porta che si apre dall'altro lato: le richieste ------------------
  //
  // Un moderatore può chiedere lui l'accesso, invece di aspettare il link. La
  // richiesta NON è un moderatore: non dà accesso, non compare nei contesti (che
  // guardano solo `attivo`) e non occupa un posto del piano. È una domanda.
  //
  // `verificata` dice se la piattaforma ha confermato che quella persona modera
  // davvero quel canale. È un fatto, non una speranza: dove non si può chiedere,
  // resta 0 e lo streamer decide guardando il nome.

  // I posti del piano: attivi e invitati. Una richiesta in attesa non occupa
  // niente — se contasse, tre sconosciuti potrebbero riempire il piano di uno
  // streamer senza che lui abbia detto sì a nessuno.
  contaPosti(channel) { return this.listByChannel(channel).length; },

  // Quanto si aspetta prima di poter richiedere un canale che ha già detto no.
  ATTESA_DOPO_RIFIUTO: 30 * 86400000,

  // Si può chiedere? Ritorna il motivo per cui NON si può, oppure ''.
  perchePuoiNo(channel, login, ora = now()) {
    const m = this.get(channel, login);
    if (!m) return '';
    if (m.status === 'attivo') return 'gestisci già questo canale';
    if (m.status === 'invitato') return 'hai già un invito per questo canale: aprilo dal link che ti ha mandato';
    if (m.status === 'richiesto') return 'la tua richiesta è già in attesa';
    if (m.status === 'rifiutato') {
      const quando = m.deciso_at + this.ATTESA_DOPO_RIFIUTO;
      if (ora < quando) return 'questo canale ha già risposto di no: puoi richiedere più avanti';
    }
    return '';
  },

  // La riga di chi è già dentro (attivo) o già chiamato (invitato) NON viene
  // toccata: una richiesta non può retrocedere un accesso che c'è già. Sta nella
  // scrittura e non in un controllo prima, perché un controllo lo si può
  // dimenticare in una strada nuova — questo no.
  chiedi(channel, login, { display = '', nota = '', verificata = false } = {}) {
    const ch = String(channel).toLowerCase(), l = String(login).toLowerCase();
    db.prepare(`INSERT INTO managers (channel, login, display, role, status, invite_token, invite_expires, invited_by, created_at, chiesto_at, nota, verificata)
      VALUES (?,?,?,'moderatore','richiesto','',0,'',?,?,?,?)
      ON CONFLICT(channel, login) DO UPDATE SET
        display=CASE WHEN excluded.display!='' THEN excluded.display ELSE managers.display END,
        status='richiesto', chiesto_at=excluded.chiesto_at, deciso_at=0,
        nota=excluded.nota, verificata=excluded.verificata
        WHERE managers.status NOT IN ('attivo','invitato')`)
      .run(ch, l, display, now(), now(), String(nota).slice(0, 300), verificata ? 1 : 0);
    return this.get(ch, l);
  },

  richiesteByChannel(channel) {
    return db.prepare("SELECT * FROM managers WHERE channel=? AND status='richiesto' ORDER BY chiesto_at")
      .all(String(channel).toLowerCase());
  },

  // Le richieste di una persona, in qualunque stato siano finite: chi ha chiesto
  // deve poter vedere anche il no, altrimenti aspetta per sempre una risposta
  // che è già arrivata.
  richiesteByLogin(login) {
    return db.prepare("SELECT * FROM managers WHERE login=? AND status IN ('richiesto','rifiutato') ORDER BY chiesto_at DESC")
      .all(String(login).toLowerCase());
  },

  contaRichiesteDi(login) {
    return db.prepare("SELECT COUNT(*) n FROM managers WHERE login=? AND status='richiesto'")
      .get(String(login).toLowerCase()).n;
  },

  rifiuta(channel, id) {
    db.prepare("UPDATE managers SET status='rifiutato', deciso_at=?, invite_token='', invite_expires=0 WHERE channel=? AND id=? AND status='richiesto'")
      .run(now(), String(channel).toLowerCase(), id);
    return this.byId(channel, id);
  },

  // Ritirare la propria richiesta: sparisce e basta. Chi ritira non ha ricevuto
  // un no, quindi non deve aspettare trenta giorni per riprovare.
  ritira(channel, login) {
    db.prepare("DELETE FROM managers WHERE channel=? AND login=? AND status='richiesto'")
      .run(String(channel).toLowerCase(), String(login).toLowerCase());
  },
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
    // `canale` e' la strada nuova: il bot sta gia' nel server, quindi l'avviso
    // lo scrive lui li' dentro. `webhook` resta per chi ce l'ha gia' — toglierlo
    // vorrebbe dire spegnere gli avvisi a chi li aveva, per un miglioramento.
    const cur = (s && s.settings && s.settings.discord) || { webhook: '', canale: '', messaggio: '', nome_bot: '', avatar: '', attivo: 0, ultima_live: '' };
    const v = {
      webhook: campi.webhook !== undefined ? String(campi.webhook) : cur.webhook,
      canale: campi.canale !== undefined ? String(campi.canale || '').replace(/[^0-9]/g, '') : (cur.canale || ''),
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

// ---------------------------------------------------------------- Discord: i ruoli
// Il gestore dei privilegi ha una tabella sua e non `settings` per una ragione
// sola: dentro c'e' un TOKEN, e i segreti stanno nella busta (src/segreti.js).
// Il token non esce mai verso il browser (vedi la porta, non manda mai `token`).
export const dcRuoli = {
  get(channel) {
    const c = String(channel).toLowerCase();
    const r = db.prepare('SELECT * FROM discord_ruoli WHERE channel=?').get(c) || null;
    if (!r) return null;
    const v = apriSegreti('discord_ruoli', c, r, ['token']);
    return { ...v, regole: safeJson(v.regole) || [], ultimo_esito: safeJson(v.ultimo_esito) || {}, preset: safeJson(v.preset) || null, frasi: safeJson(v.frasi) || {} };
  },
  set(channel, campi = {}) {
    const c = String(channel).toLowerCase();
    const cur = this.get(c) || { token: '', guild: '', guild_nome: '', bot_nome: '', attivo: 0, regole: [], ultimo_giro: 0, ultimo_esito: {}, preset: null, frasi: {} };
    const v = {
      token: cifra(campi.token !== undefined ? String(campi.token) : String(cur.token || ''), _dove('discord_ruoli', 'token', c)),
      guild: campi.guild !== undefined ? String(campi.guild).replace(/[^0-9]/g, '').slice(0, 24) : cur.guild,
      guild_nome: campi.guildNome !== undefined ? String(campi.guildNome).slice(0, 120) : cur.guild_nome,
      bot_nome: campi.botNome !== undefined ? String(campi.botNome).slice(0, 120) : cur.bot_nome,
      attivo: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : (cur.attivo ? 1 : 0),
      regole: JSON.stringify(campi.regole !== undefined ? (campi.regole || []) : (cur.regole || [])),
      ultimo_giro: campi.ultimoGiro !== undefined ? msIntero(campi.ultimoGiro) : msIntero(cur.ultimo_giro),
      ultimo_esito: JSON.stringify(campi.ultimoEsito !== undefined ? (campi.ultimoEsito || {}) : (cur.ultimo_esito || {})),
      preset: campi.preset !== undefined ? (campi.preset ? JSON.stringify(campi.preset) : '') : (cur.preset ? JSON.stringify(cur.preset) : ''),
      frasi: campi.frasi !== undefined ? JSON.stringify(campi.frasi || {}) : JSON.stringify(cur.frasi || {}),
    };
    db.prepare(`INSERT INTO discord_ruoli (channel, token, guild, guild_nome, bot_nome, attivo, regole, ultimo_giro, ultimo_esito, preset, frasi, ts)
      VALUES (@channel, @token, @guild, @guild_nome, @bot_nome, @attivo, @regole, @ultimo_giro, @ultimo_esito, @preset, @frasi, @ts)
      ON CONFLICT(channel) DO UPDATE SET token=excluded.token, guild=excluded.guild, guild_nome=excluded.guild_nome,
        bot_nome=excluded.bot_nome, attivo=excluded.attivo, regole=excluded.regole,
        ultimo_giro=excluded.ultimo_giro, ultimo_esito=excluded.ultimo_esito, preset=excluded.preset,
        frasi=excluded.frasi, ts=excluded.ts`)
      .run({ channel: c, ...v, ts: now() });
    return this.get(c);
  },
  // I canali su cui il giro ha davvero qualcosa da fare.
  attivi() {
    return db.prepare("SELECT channel FROM discord_ruoli WHERE attivo=1 AND token<>'' AND guild<>''").all().map((r) => r.channel);
  },
  esito(channel, esito) { this.set(channel, { ultimoGiro: now(), ultimoEsito: esito || {} }); },
  scorda(channel) {
    const c = String(channel).toLowerCase();
    db.prepare('DELETE FROM discord_ruoli WHERE channel=?').run(c);
    db.prepare('DELETE FROM discord_link WHERE channel=?').run(c);
  },
};

// CHI HA DETTO «QUESTO ACCOUNT DISCORD SONO IO», e per QUALE canale.
//
// Il consenso e' per canale apposta: collegarsi al server di uno streamer non
// vuol dire farsi riconoscere da tutti gli altri. Chi si scollega sparisce da
// qui, e da quel momento il giro non lo tocca piu' — ne' per dare ne' per
// togliere: i ruoli che ha restano suoi.
export const dcLink = {
  metti(channel, { login, userId = '', dcId, dcNome = '' } = {}) {
    const c = String(channel).toLowerCase(), l = String(login || '').toLowerCase();
    const d = String(dcId || '');
    if (!c || !l || !d) return null;
    db.prepare(`INSERT INTO discord_link (channel, login, user_id, dc_id, dc_nome, ts) VALUES (?,?,?,?,?,?)
      ON CONFLICT(channel, login) DO UPDATE SET user_id=excluded.user_id, dc_id=excluded.dc_id, dc_nome=excluded.dc_nome, ts=excluded.ts`)
      .run(c, l, String(userId || ''), d, String(dcNome || '').slice(0, 64), now());
    return this.prendi(c, l);
  },
  prendi(channel, login) {
    return db.prepare('SELECT * FROM discord_link WHERE channel=? AND login=?')
      .get(String(channel).toLowerCase(), String(login || '').toLowerCase()) || null;
  },
  perDc(channel, dcId) {
    return db.prepare('SELECT * FROM discord_link WHERE channel=? AND dc_id=?')
      .get(String(channel).toLowerCase(), String(dcId || '')) || null;
  },
  lista(channel, limite = 500) {
    return db.prepare('SELECT * FROM discord_link WHERE channel=? ORDER BY ts ASC LIMIT ?')
      .all(String(channel).toLowerCase(), Math.max(1, Math.min(2000, limite | 0)));
  },
  quanti(channel) {
    return db.prepare('SELECT COUNT(*) n FROM discord_link WHERE channel=?').get(String(channel).toLowerCase())?.n || 0;
  },
  togli(channel, login) {
    db.prepare('DELETE FROM discord_link WHERE channel=? AND login=?')
      .run(String(channel).toLowerCase(), String(login || '').toLowerCase());
  },
};

// CHI STA PER COLLEGARSI. Un codice vive dieci minuti, vale per un canale solo
// e muore appena viene usato. Sta nel database e non in memoria per lo stesso
// motivo del cancello di Telegram: un riavvio non deve lasciare una persona a
// meta' strada con un codice che non vale piu' niente e nessuno che glielo dica.
export const dcAttesa = {
  metti({ codice, channel, dcId, dcNome = '', scad = 0 }) {
    db.prepare(`INSERT INTO discord_attesa (codice, channel, dc_id, dc_nome, scad) VALUES (?,?,?,?,?)
      ON CONFLICT(codice) DO UPDATE SET channel=excluded.channel, dc_id=excluded.dc_id, dc_nome=excluded.dc_nome, scad=excluded.scad`)
      .run(String(codice), String(channel).toLowerCase(), String(dcId), String(dcNome || '').slice(0, 64), msIntero(scad));
  },
  prendi(codice) { return db.prepare('SELECT * FROM discord_attesa WHERE codice=?').get(String(codice || '')) || null; },
  consuma(codice) { db.prepare('DELETE FROM discord_attesa WHERE codice=?').run(String(codice || '')); },
  scordaDi(channel, dcId) {
    db.prepare('DELETE FROM discord_attesa WHERE channel=? AND dc_id=?').run(String(channel).toLowerCase(), String(dcId || ''));
  },
  pulisci(ora = now()) { db.prepare('DELETE FROM discord_attesa WHERE scad<=?').run(msIntero(ora)); },
};

// L'impronta corta di un indirizzo, per usarla come chiave del posto. Non e'
// un segreto da proteggere: e' solo un modo perche' lo stesso webhook messo due
// volte resti UN posto, e due diversi restino due.
const _improntaCorta = (t) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
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

// E la stessa cosa per Discord. La gemella sta QUI, attaccata alla sorella, e
// non nel quartiere di Discord: un avviso e' il prodotto di CHI va in diretta
// per DOVE deve arrivare, e quel prodotto non cambia forma a seconda del
// trasporto. Due modelli vorrebbero dire due matrici nel pannello e due posti
// dove ricordarsi le stesse regole — cioe' uno dove dimenticarsele.
export const dcDest = {
  lista(channel) {
    return db.prepare('SELECT * FROM discord_dest WHERE channel=? ORDER BY id').all(String(channel).toLowerCase());
  },
  get(channel, id) {
    return db.prepare('SELECT * FROM discord_dest WHERE channel=? AND id=?')
      .get(String(channel).toLowerCase(), Number(id) || 0) || null;
  },
  perEvento(channel, evento, streamerLogin) {
    return this.lista(channel).filter((d) => d.attivo
      && _inCsv(d.eventi, evento)
      && _inCsv(d.streamer, streamerLogin || channel));
  },
  // Un posto e' un canale del server OPPURE un webhook: chi aveva la strada
  // vecchia non deve rifare niente, e non ha senso tenergli un binario a parte.
  // La chiave resta `canale`, e per un webhook e' la sua impronta: due webhook
  // diversi sono due posti diversi, lo stesso due volte e' lo stesso posto.
  aggiungi({ channel, canale, canaleNome = '', webhook = '', eventi = '', streamer = '', messaggio = '', ruolo = '', chiudi = 0, attivo = 1 }) {
    const ch = String(channel).toLowerCase();
    const wh = String(webhook || '').trim();
    const cn = wh ? 'w' + _improntaCorta(wh) : String(canale || '').replace(/[^0-9]/g, '');
    if (!ch || !cn) return 0;
    const info = db.prepare(`INSERT INTO discord_dest (channel, canale, canale_nome, webhook, eventi, streamer, messaggio, ruolo, chiudi, attivo, ts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(channel, canale) DO UPDATE SET canale_nome=excluded.canale_nome, webhook=excluded.webhook, attivo=excluded.attivo, ts=excluded.ts`)
      .run(ch, cn, String(canaleNome || '').slice(0, 120), wh.slice(0, 300), _csv(eventi).join(','), _csv(streamer).join(','),
        String(messaggio || '').slice(0, 1800), String(ruolo || '').replace(/[^0-9]/g, ''),
        chiudi ? 1 : 0, attivo ? 1 : 0, Date.now());
    return info.lastInsertRowid
      || (db.prepare('SELECT id FROM discord_dest WHERE channel=? AND canale=?').get(ch, cn)?.id || 0);
  },
  aggiorna(channel, id, campi = {}) {
    const d = this.get(channel, id);
    if (!d) return null;
    const v = {
      canale_nome: campi.canaleNome !== undefined ? String(campi.canaleNome).slice(0, 120) : d.canale_nome,
      eventi: campi.eventi !== undefined ? _csv(campi.eventi).join(',') : d.eventi,
      streamer: campi.streamer !== undefined ? _csv(campi.streamer).join(',') : d.streamer,
      messaggio: campi.messaggio !== undefined ? String(campi.messaggio).slice(0, 1800) : d.messaggio,
      ruolo: campi.ruolo !== undefined ? String(campi.ruolo || '').replace(/[^0-9]/g, '') : d.ruolo,
      chiudi: campi.chiudi !== undefined ? (campi.chiudi ? 1 : 0) : d.chiudi,
      attivo: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : d.attivo,
    };
    db.prepare(`UPDATE discord_dest SET canale_nome=@canale_nome, eventi=@eventi, streamer=@streamer,
      messaggio=@messaggio, ruolo=@ruolo, chiudi=@chiudi, attivo=@attivo, ts=@ts WHERE id=@id`)
      .run({ ...v, id: d.id, ts: Date.now() });
    return this.get(channel, id);
  },
  rimuovi(channel, id) {
    return db.prepare('DELETE FROM discord_dest WHERE channel=? AND id=?')
      .run(String(channel).toLowerCase(), Number(id) || 0).changes > 0;
  },
  setMsgId(id, msgId) {
    db.prepare('UPDATE discord_dest SET msg_id=? WHERE id=?').run(String(msgId || ''), Number(id) || 0);
  },
  // Chi aveva gia' l'avviso acceso se lo ritrova come destinazione numero uno,
  // senza rifare niente — sia che avesse un canale, sia che avesse un webhook.
  // Il webhook era la strada vecchia e continua a funzionare: toglierlo
  // vorrebbe dire spegnere gli avvisi a qualcuno in cambio di un miglioramento
  // che non ha chiesto. Idempotente: gira a ogni lettura senza duplicare.
  migra(channel, conf) {
    const ch = String(channel).toLowerCase();
    if (!conf?.canale && !conf?.webhook) return;
    const n = db.prepare('SELECT COUNT(*) c FROM discord_dest WHERE channel=?').get(ch)?.c || 0;
    if (n > 0) return;
    this.aggiungi({
      channel: ch,
      canale: conf.canale || '',
      webhook: conf.canale ? '' : (conf.webhook || ''),
      canaleNome: conf.canale ? '' : 'webhook',
      messaggio: conf.messaggio || '',
      attivo: conf.attivo ? 1 : 0,
    });
  },
};

// Gli avvisi mandati su Discord, per destinazione E per streamer: senza questo,
// la diretta di un amico che finisce cancellerebbe l'avviso della mia.
export const dcMsg = {
  segna(channel, destId, streamer, msgId) {
    db.prepare(`INSERT INTO discord_msg (channel, dest_id, streamer, msg_id, ts) VALUES (?,?,?,?,?)
      ON CONFLICT(channel, dest_id, streamer) DO UPDATE SET msg_id=excluded.msg_id, ts=excluded.ts`)
      .run(String(channel).toLowerCase(), Number(destId) || 0, String(streamer).toLowerCase(), String(msgId || ''), Date.now());
  },
  perStreamer(channel, streamer) {
    return db.prepare('SELECT * FROM discord_msg WHERE channel=? AND streamer=? AND msg_id<>\'\'')
      .all(String(channel).toLowerCase(), String(streamer).toLowerCase());
  },
  pulisci(channel, streamer) {
    db.prepare('DELETE FROM discord_msg WHERE channel=? AND streamer=?')
      .run(String(channel).toLowerCase(), String(streamer).toLowerCase());
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

// LE PREFERENZE DEGLI AVVISI che non appartengono a nessun trasporto.
//
// «Segui le dirette della community» stava dentro la configurazione di Telegram,
// e li' dentro voleva dire una cosa sola: chi non aveva un bot Telegram non
// poteva accenderla. Chi ha solo Discord non ha nemmeno la riga — quindi per lui
// la levetta non esisteva proprio, ed e' esattamente la persona a cui serve.
//
// La migrazione si fa LEGGENDO: finche' nessuno salva qui, vale la vecchia
// levetta di Telegram. Nessun dato si sposta, e chi l'aveva accesa la ritrova accesa.
//
// La levetta e' PER TRASPORTO, non una sola per tutti: accenderla su Discord non
// deve far partire gli annunci anche nel gruppo Telegram. Le due sezioni si
// guardano la stessa lista ma decidono da sole chi far entrare.
export const TRASPORTI = ['telegram', 'discord'];

export const avvisiConf = {
  get(channel) {
    const c = String(channel).toLowerCase();
    const a = streamers.get(c)?.settings?.avvisi;
    const vecchia = !!tgConf.get(c)?.community_live;
    const com = a && a.community && typeof a.community === 'object' ? a.community : null;
    return {
      community: {
        // finche' nessuno salva qui, per Telegram vale la vecchia levetta
        telegram: com && com.telegram !== undefined ? !!com.telegram : vecchia,
        discord: com && com.discord !== undefined ? !!com.discord : false,
      },
    };
  },
  // `community` e' l'oggetto per trasporto: si passa solo quello che cambia.
  set(channel, campi = {}) {
    const c = String(channel).toLowerCase();
    const cur = this.get(c).community;
    const settings = streamers.get(c)?.settings || {};
    const com = campi.community || {};
    const v = { community: {} };
    for (const t of TRASPORTI) v.community[t] = (com[t] !== undefined ? !!com[t] : !!cur[t]) ? 1 : 0;
    streamers.setSettings(c, { ...settings, avvisi: v });
    return this.get(c);
  },
  // qualcuno, da qualche parte, vuole le dirette della community?
  vuoleCommunity(channel) {
    const com = this.get(channel).community;
    return TRASPORTI.some((t) => com[t]);
  },
};

// ALTRI streamer di cui annunciare la diretta (oltre alla propria).
//
// La tabella si chiama ancora `telegram_amico` perche' i dati stanno li' dentro
// da sempre e spostarli non aggiungerebbe niente. Il NOME invece contava: questa
// lista non e' di Telegram, e' di chiunque annunci — Telegram, Discord, e quel
// che verra'. Chiamarla `tgAmici` faceva dire una bugia a ogni richiamo.
export const amici = {
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
  // Da dove viene questo amico: l'ha aggiunto lui a mano, o e' entrato con la
  // community? Serve a ogni sezione per decidere se annunciarlo: la lista e'
  // una sola, ma «anche la community» lo si accende dove si vuole.
  fonteDi(channel, login) {
    return db.prepare('SELECT fonte FROM telegram_amico WHERE channel=? AND login=?')
      .get(String(channel).toLowerCase(), String(login || '').toLowerCase())?.fonte || '';
  },
  // Tutti gli streamer da guardare per questo canale: quelli a mano + la community
  // (se il canale l'ha accesa). La distinzione la porta la colonna `fonte`.
  daGuardare(channel) {
    return this.attivi(channel);
  },
};

// LA CARTA DELLA DIRETTA. Ha un posto suo e non una colonna dentro la riga di
// Telegram: la stessa immagine servirà a Discord e a chiunque altro annunci la
// diretta, e una grafica che vive dentro la configurazione di UN canale di
// annuncio è una grafica che il secondo canale dovrà copiarsi.
// La locandina è ACCESA finché nessuno dice il contrario. Non è una preferenza
// nascosta: è che una riga in questa tabella nasce solo quando qualcuno tocca la
// levetta o salva un disegno, e prima di allora «non ho deciso» e «no» sono due
// cose diverse. Trattarle uguali vorrebbe dire che la grafica esiste ma non la
// vede nessuno finché non la scopre nel pannello.
//
// Il valore sta scritto QUI e in nessun altro posto: il DEFAULT della colonna
// non viene mai letto, perché `set` passa sempre un valore esplicito.
export const ACCESA_SENZA_RISPOSTA = true;

export const carteLive = {
  get(channel) {
    const r = db.prepare('SELECT * FROM carte_live WHERE channel=?').get(String(channel).toLowerCase());
    if (!r) return { attiva: ACCESA_SENZA_RISPOSTA, dati: null, ts: 0, mai: true };
    let dati = null;
    try { dati = r.dati ? JSON.parse(r.dati) : null; } catch { dati = null; }
    return { attiva: !!r.attiva, dati, ts: r.ts, mai: false };
  },
  set(channel, { attiva, dati }) {
    const c = String(channel).toLowerCase();
    const cur = this.get(c);
    const a = attiva !== undefined ? (attiva ? 1 : 0) : (cur.attiva ? 1 : 0);
    const d = dati !== undefined ? JSON.stringify(dati || null) : (cur?.dati ? JSON.stringify(cur.dati) : '');
    db.prepare(`INSERT INTO carte_live (channel, attiva, dati, ts) VALUES (?,?,?,?)
      ON CONFLICT(channel) DO UPDATE SET attiva=excluded.attiva, dati=excluded.dati, ts=excluded.ts`)
      .run(c, a, d, now());
    return this.get(c);
  },
  cancella(channel) { db.prepare('DELETE FROM carte_live WHERE channel=?').run(String(channel).toLowerCase()); },
};

// L'anteprima del link, rifatta dallo streamer: una per pagina (link, dona).
// Niente riga = standard (la carta vestita col colore della pagina).
export const cartePagina = {
  _quale: (q) => (q === 'dona' ? 'dona' : 'link'),
  get(channel, quale) {
    const r = db.prepare('SELECT * FROM carte_pagina WHERE channel=? AND quale=?').get(String(channel).toLowerCase(), this._quale(quale));
    if (!r) return null;
    let dati = null;
    try { dati = r.dati ? JSON.parse(r.dati) : null; } catch { dati = null; }
    return dati && Array.isArray(dati.elementi) && dati.elementi.length ? { dati, ts: r.ts } : null;
  },
  set(channel, quale, dati) {
    const c = String(channel).toLowerCase(), q = this._quale(quale);
    if (!dati) { db.prepare('DELETE FROM carte_pagina WHERE channel=? AND quale=?').run(c, q); return null; }
    db.prepare(`INSERT INTO carte_pagina (channel, quale, dati, ts) VALUES (?,?,?,?)
      ON CONFLICT(channel, quale) DO UPDATE SET dati=excluded.dati, ts=excluded.ts`).run(c, q, JSON.stringify(dati), now());
    return this.get(c, q);
  },
};

export const tgConf = {
  get(channel) {
    const c = String(channel).toLowerCase();
    const r = db.prepare('SELECT * FROM telegram WHERE channel=?').get(c) || null;
    return apriSegreti('telegram', c, r, ['token']);
  },
  set(channel, campi = {}) {
    const c = String(channel).toLowerCase();
    const cur = this.get(c) || { token: '', chat_id: '', chat_titolo: '', bot_username: '', attivo: 0, messaggio: '', ultima_live: '', pin_live: 1, msg_id: '', msg_id_tk: '' };
    const v = {
      token: cifra(campi.token !== undefined ? String(campi.token) : String(cur.token || ''), _dove('telegram', 'token', c)),
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
  // Il cancello del gruppo. Un setter suo: il salvataggio grande di qui sopra
  // riscrive ogni campo che tocca, e infilarci dentro anche questi vorrebbe dire
  // che ogni salvataggio di un'altra cosa passa di qui.
  setIngresso(channel, campi = {}) {
    const c = String(channel).toLowerCase();
    const cur = db.prepare('SELECT ingresso, ingresso_minuti, ingresso_scaduto, ingresso_testo, ingresso_tasto FROM telegram WHERE channel=?').get(c) || {};
    const v = {
      ingresso: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : (cur.ingresso || 0),
      minuti: campi.minuti !== undefined ? Math.max(1, Math.min(60, Math.round(Number(campi.minuti) || 5))) : (cur.ingresso_minuti || 5),
      scaduto: campi.scaduto !== undefined ? (campi.scaduto === 'muto' ? 'muto' : 'caccia') : (cur.ingresso_scaduto || 'caccia'),
      testo: campi.testo !== undefined ? String(campi.testo).slice(0, 400) : (cur.ingresso_testo || ''),
      tasto: campi.tasto !== undefined ? String(campi.tasto).slice(0, 64) : (cur.ingresso_tasto || ''),
    };
    db.prepare('UPDATE telegram SET ingresso=?, ingresso_minuti=?, ingresso_scaduto=?, ingresso_testo=?, ingresso_tasto=? WHERE channel=?')
      .run(v.ingresso, v.minuti, v.scaduto, v.testo, v.tasto, c);
    return this.get(c);
  },
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
    const r = db.prepare('SELECT * FROM telegram WHERE webhook_secret=? AND interattivo=1').get(s) || null;
    return apriSegreti('telegram', r?.channel, r, ['token']);
  },
  // tutti i canali con la modalità interattiva accesa e un token: servono per
  // ri-registrare il webhook all'avvio (es. dopo un cambio di dominio/baseUrl).
  listInterattivi() {
    return db.prepare("SELECT * FROM telegram WHERE interattivo=1 AND token<>'' AND webhook_secret<>''").all()
      .map((r) => apriSegreti('telegram', r.channel, r, ['token']));
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

// CHI E' IN ATTESA AL CANCELLO del gruppo Telegram.
//
// Sta nel database e non in memoria per una ragione sola: un riavvio non deve
// lasciare della gente muta per sempre. Chi e' entrato l'abbiamo silenziato noi,
// e il dovere di riaprirgli la bocca non puo' dipendere dal fatto che il
// processo sia rimasto acceso.
export const tgAttesa = {
  metti({ channel, chatId, userId, nome = '', msgId = '', scad = 0 }) {
    db.prepare(`INSERT INTO tg_attesa (channel, chat_id, tg_user_id, nome, msg_id, scad)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(channel, chat_id, tg_user_id) DO UPDATE SET
        nome=excluded.nome, msg_id=excluded.msg_id, scad=excluded.scad`)
      .run(String(channel).toLowerCase(), String(chatId), String(userId), String(nome || '').slice(0, 64), String(msgId || ''), Number(scad) || 0);
  },
  prendi(channel, chatId, userId) {
    return db.prepare('SELECT * FROM tg_attesa WHERE channel=? AND chat_id=? AND tg_user_id=?')
      .get(String(channel).toLowerCase(), String(chatId), String(userId)) || null;
  },
  // chi preme il tasto puo' averlo premuto in un gruppo qualsiasi fra i suoi: il
  // dato del tasto porta l'id della persona, il gruppo arriva dal messaggio.
  togli(channel, chatId, userId) {
    db.prepare('DELETE FROM tg_attesa WHERE channel=? AND chat_id=? AND tg_user_id=?')
      .run(String(channel).toLowerCase(), String(chatId), String(userId));
  },
  scaduti(ora = now(), limite = 50) {
    return db.prepare('SELECT * FROM tg_attesa WHERE scad>0 AND scad<=? ORDER BY scad LIMIT ?')
      .all(Number(ora) || now(), limite | 0);
  },
  quanti(channel) {
    return db.prepare('SELECT COUNT(*) n FROM tg_attesa WHERE channel=?').get(String(channel).toLowerCase())?.n || 0;
  },
};

// LA LIBRERIA DELLE SCHERMATE. E' l'unica cosa in tutto il bot che uno streamer
// scrive e un altro legge, quindi qui c'e' una regola che altrove non serve: una
// riga non si aggiorna MAI. Chi migliora una scheda ne scrive una nuova che
// dichiara da quale viene, e la vecchia resta dov'e'. Non c'e' un UPDATE sulle
// firme perche' non deve esistere: se esistesse, un giorno qualcuno lo userebbe e
// romperebbe le dirette di chi quella scheda ce l'aveva gia' e gli funzionava.
export const mortiSchede = {
  pubblica({ id, radice = '', da = '', versione = 1, gioco, giocoNome = '', lingua = 'nessuna', firme = [], autore = '' }) {
    const rad = radice || id;
    db.prepare(`INSERT INTO morti_schede (id, radice, da, versione, gioco, gioco_nome, lingua, firme, autore, nato)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(String(id), String(rad), String(da || ''), Number(versione) || 1, String(gioco || ''),
        String(giocoNome || '').slice(0, 60), String(lingua || 'nessuna'), JSON.stringify(firme || []),
        String(autore || '').toLowerCase(), now());
    return this.prendi(id);
  },
  _riga(r) {
    if (!r) return null;
    let firme = [];
    try { firme = JSON.parse(r.firme); } catch { firme = []; }
    return { id: r.id, radice: r.radice, da: r.da, versione: r.versione, gioco: r.gioco,
      giocoNome: r.gioco_nome, lingua: r.lingua, firme: Array.isArray(firme) ? firme : [],
      autore: r.autore, nato: r.nato, presa: r.presa };
  },
  prendi(id) {
    return this._riga(db.prepare('SELECT * FROM morti_schede WHERE id=? AND tolta=0').get(String(id || '')));
  },
  // L'ultima versione di una cosa. Se l'ultima e' stata tolta, vale quella prima:
  // una scheda tolta non deve portarsi dietro anche le versioni buone.
  ultima(radice) {
    return this._riga(db.prepare('SELECT * FROM morti_schede WHERE radice=? AND tolta=0 ORDER BY versione DESC LIMIT 1')
      .get(String(radice || '')));
  },
  versioni(radice) {
    return db.prepare('SELECT * FROM morti_schede WHERE radice=? AND tolta=0 ORDER BY versione DESC')
      .all(String(radice || '')).map((r) => this._riga(r));
  },
  // Cerca per nome. Solo l'ultima versione di ogni cosa: le vecchie esistono per
  // chi ce l'ha gia', non per chi sta scegliendo adesso.
  cerca({ gioco = '', lingua = '', limite = 40 } = {}) {
    const q = String(gioco || '').trim();
    const righe = db.prepare(`SELECT * FROM morti_schede m WHERE tolta=0
        AND (? = '' OR m.gioco LIKE ?)
        AND (? = '' OR m.lingua = ?)
        AND m.versione = (SELECT MAX(versione) FROM morti_schede v WHERE v.radice = m.radice AND v.tolta=0)
      ORDER BY m.presa DESC, m.nato DESC LIMIT ?`)
      .all(q, `%${q}%`, String(lingua || ''), String(lingua || ''), limite | 0);
    return righe.map((r) => this._riga(r));
  },
  // Tutte le impronte in giro, per cercare una schermata senza sapere che gioco e'.
  impronte(limite = 4000) {
    return db.prepare(`SELECT * FROM morti_schede m WHERE tolta=0
        AND m.versione = (SELECT MAX(versione) FROM morti_schede v WHERE v.radice = m.radice AND v.tolta=0)
      ORDER BY m.presa DESC LIMIT ?`).all(limite | 0).map((r) => this._riga(r));
  },
  quante(autore) {
    return db.prepare('SELECT COUNT(*) n FROM morti_schede WHERE autore=? AND tolta=0').get(String(autore || '').toLowerCase())?.n || 0;
  },
  daQuando(autore, da) {
    return db.prepare('SELECT COUNT(*) n FROM morti_schede WHERE autore=? AND nato>=?').get(String(autore || '').toLowerCase(), Number(da) || 0)?.n || 0;
  },
  usata(id) {
    db.prepare('UPDATE morti_schede SET presa=presa+1 WHERE id=?').run(String(id || ''));
  },
  togli(id) {
    db.prepare('UPDATE morti_schede SET tolta=1 WHERE id=?').run(String(id || ''));
  },
  ultime(limite = 50) {
    return db.prepare('SELECT * FROM morti_schede WHERE tolta=0 ORDER BY nato DESC LIMIT ?').all(limite | 0).map((r) => this._riga(r));
  },
};

// I GIOCHI CHE PARLANO DA SOLI: dove ci si ricorda a che punto erano.
//
// Sta nel database e non in memoria per un motivo solo, ed e' quello che conta:
// se stesse in memoria, il primo messaggio dopo un riavvio del bot troverebbe un
// ricordo vuoto e conterebbe di colpo tutte le morti della partita in corso.
export const gsiStato = {
  prendi(channel) {
    const r = db.prepare('SELECT partita, morti, quando FROM gsi_stato WHERE channel=?')
      .get(String(channel).toLowerCase());
    return r ? { partita: r.partita, morti: r.morti, quando: r.quando } : null;
  },
  metti(channel, { partita = '', morti = 0, quando = now() } = {}) {
    db.prepare(`INSERT INTO gsi_stato (channel, partita, morti, quando) VALUES (?,?,?,?)
      ON CONFLICT(channel) DO UPDATE SET partita=excluded.partita, morti=excluded.morti, quando=excluded.quando`)
      .run(String(channel).toLowerCase(), String(partita || ''), Number(morti) || 0, Number(quando) || now());
  },
  scorda(channel) {
    db.prepare('DELETE FROM gsi_stato WHERE channel=?').run(String(channel).toLowerCase());
  },
};

// ---------------------------------------------------------------- memoria
export const memory = {
  // `quando` serve a chi ricostruisce una storia invece di viverla: il
  // simulatore che rigioca un attacco, un'importazione. Senza, ogni messaggio
  // nasce adesso e «da quanto uno sta qui» non si può nemmeno mettere alla
  // prova.
  logMessage(channel, user, display, text, fromBot = false, quando = 0) {
    db.prepare('INSERT INTO messages (channel, user, display, text, from_bot, ts) VALUES (?,?,?,?,?,?)')
      .run(channel, user, display, text, fromBot ? 1 : 0, Number(quando) || now());
  },
  recentMessages(channel, limit = 40) {
    return db.prepare('SELECT * FROM messages WHERE channel=? ORDER BY ts DESC LIMIT ?').all(channel, limit).reverse();
  },

  // Da quanto una persona sta in questo canale, e quanto ci ha parlato. È la
  // materia prima della fiducia: chi scrive qui da mesi non è un account che
  // si giudica con un'euristica sui nomi.
  storiaDi(channel, user) {
    const r = db.prepare('SELECT COUNT(*) quanti, MIN(ts) primo, MAX(ts) ultimo FROM messages WHERE channel=? AND user=? AND from_bot=0')
      .get(channel, String(user || '').toLowerCase());
    return { quanti: r?.quanti || 0, primo: r?.primo || 0, ultimo: r?.ultimo || 0 };
  },

  // La stessa cosa per molte persone insieme. Durante un'ondata i nomi da
  // guardare sono centinaia, e una query per ciascuno sarebbe un modo di
  // rallentare la difesa proprio mentre serve.
  storiaDiMolti(channel, users = []) {
    const l = [...new Set(users.map((u) => String(u || '').toLowerCase()).filter(Boolean))];
    const fuori = new Map();
    if (!l.length) return fuori;
    for (let i = 0; i < l.length; i += 400) {
      const pezzo = l.slice(i, i + 400);
      const segni = pezzo.map(() => '?').join(',');
      const righe = db.prepare(
        `SELECT user, COUNT(*) quanti, MIN(ts) primo, MAX(ts) ultimo FROM messages
         WHERE channel=? AND from_bot=0 AND user IN (${segni}) GROUP BY user`,
      ).all(channel, ...pezzo);
      for (const r of righe) fuori.set(r.user, { quanti: r.quanti, primo: r.primo, ultimo: r.ultimo });
    }
    return fuori;
  },

  // Ha scritto, questa persona, dopo un certo momento? Serve allo scudo per
  // misurare i propri errori: un account segnato come «probabile macchina» che
  // poi si mette a parlare in chat era una persona, e quel conto va tenuto.
  haScrittoDopo(channel, user, da) {
    const r = db.prepare('SELECT 1 FROM messages WHERE channel=? AND user=? AND from_bot=0 AND ts>? LIMIT 1')
      .get(channel, String(user || '').toLowerCase(), Number(da) || 0);
    return !!r;
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
export const PESI_LINKPAGE = ['leggero', 'medio', 'marcato'];

// IL CSS LIBERO DELLA PAGINA LINK.
//
// Serve perche' nessun elenco di manopole sara' mai abbastanza: sotto c'e'
// sempre una cosa che chi la usa vuole spostare di due pixel. Questa e' la via
// d'uscita, e non ha fondo.
//
// Ma la pagina link e' PUBBLICA — la aprono sconosciuti — e per questo qui non
// vale la regola dell'overlay, che invece e' la pagina privata dello streamer
// dentro OBS e puo' permettersi tutto. Si toglie quello che smette di essere
// stile e diventa altro:
//   @import        tira dentro un foglio intero di un altro sito, e quel foglio
//                  puo' tirarne altri: una catena che non si vede e non finisce
//   javascript:    esecuzione travestita da valore
//   expression(    la stessa cosa, con il nome vecchio
//   </style        la porta per uscire dal tag e scrivere HTML
//
// `url()` verso https resta ammesso di proposito: la pagina mostra gia'
// immagini di altri siti (la foto profilo, le copertine, lo sfondo). Vietarlo
// qui e permetterlo la' sarebbe una regola che non protegge niente e in cambio
// confonde chi la incontra.
//
// E si ripassa FINO A CHE NON CAMBIA PIU' NIENTE. Una passata sola non basta e
// non e' un dettaglio: `</sty</stylele>` non contiene `</style`, ma togliendo
// quello che c'e' in mezzo i due monconi si ricompongono ed esce `</style>`
// bello intero. Vale uguale per `@im@import;port` e per `javajavascript:script:`.
// Ogni passata accorcia, quindi il giro finisce; se dopo venti non si e' fermato
// non e' CSS di nessuno, e si butta via tutto.
const VIA_DAL_CSS = [/@import[^;{}]*[;{}]?/gi, /javascript\s*:/gi, /expression\s*\(/gi, /<\s*\/\s*style/gi];
export const cssPaginaSicuro = (s) => {
  let out = String(s || '').slice(0, 8000);
  for (let giro = 0; giro < 20; giro++) {
    const prima = out;
    for (const re of VIA_DAL_CSS) out = out.replace(re, '');
    if (out === prima) return out;
  }
  return '';
};
export const FONT_LINKPAGE = ['system', 'inter', 'mono', 'serif', 'condensato', 'tondo', 'manga'];
export const ICONE_LINKPAGE = ['link', 'twitch', 'youtube', 'instagram', 'tiktok', 'discord', 'spotify',
  'x', 'telegram', 'kick', 'github', 'reddit', 'threads', 'facebook', 'whatsapp', 'twitter',
  'cuore', 'stella', 'regalo', 'carrello', 'calendario', 'mail', 'musica', 'video', 'scarica', 'gioco', 'caffe', 'soldi'];
export const TIPI_BLOCCO = ['link', 'titolo', 'testo', 'badge', 'separatore', 'spazio', 'social', 'embed', 'immagine', 'diretta', 'eroe', 'griglia', 'scritta', 'numeri', 'faq', 'conto', 'sostieni', 'donatori'];
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

// Le pagine pubbliche hanno una forma sola (testa, tema, blocchi) e due
// tavoli: la pagina link e la pagina delle donazioni. Lo store e' uno,
// costruito sul nome della tabella: stessa pulizia, stesso salvataggio.
const storePagina = (tabella) => ({
  tabella,
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
    const r = db.prepare(`SELECT * FROM ${this.tabella} WHERE channel=?`).get(String(channel).toLowerCase());
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
        'synthwave', 'neonpulse', 'particelle', 'matrix', 'nebulosa', 'scanline', 'raggi',
        // il retino stampato e le linee di concentrazione: due segni del disegno
        // a china, non due effetti di luce come quelli qui sopra
        'retino', 'concentrazione'], 'nessuno'),
      testo: hex(t.testo), accent: hex(t.accent), card: hex(t.card), bordo: hex(t.bordo),
      font: scelta(t.font, FONT_LINKPAGE, 'system'),
      fontTitoli: scelta(t.fontTitoli, FONT_LINKPAGE, ''),
      corpo: num(t.corpo, 80, 130, 100),
      peso: scelta(t.peso, PESI_LINKPAGE, 'marcato'),
      interlinea: num(t.interlinea, 120, 200, 150),
      spaziatura: num(t.spaziatura, 40, 220, 100),
      maiuscolo: scelta(t.maiuscolo, ['no', 'titoli', 'bottoni', 'tutto'], 'no'),
      testoBtn: hex(t.testoBtn),
      bordoSp: num(t.bordoSp, 0, 8, 0),
      css: cssPaginaSicuro(t.css),
      raggio: num(t.raggio, 0, 999, 14),
      stileBtn: scelta(t.stileBtn, ['pieno', 'contorno', 'vetro', 'inchiostro'], 'pieno'),
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
      // Il puntatore disegnato. Spento di norma: una pagina gia' pubblicata non
      // deve cambiare sotto il dito di nessuno perche' e' uscita una novita'.
      cursore: scelta(t.cursore, ['sistema', 'disegnato'], 'sistema'),
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
          sfondo: hex(b.sfondo), titolo: str(b.titolo, L.label) });
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
      } else if (tipo === 'sostieni') {
        // il tasto delle donazioni: dove si dona e la valuta stanno nelle
        // impostazioni del canale (una configurazione sola); qui solo come si presenta
        out.push({ tipo, titolo: str(b.titolo, L.label), testo: str(b.testo, L.sotto), etichetta: str(b.etichetta, L.label), obiettivo: b.obiettivo !== false,
          icona: scelta(b.icona, ICONE_LINKPAGE, null) || 'cuore', pagina: b.pagina === true });
      } else if (tipo === 'donatori') {
        // chi ha donato: gli ultimi, o i primi per somma; i nomi arrivano dal
        // registro quando la pagina si stampa, qui solo come si presenta
        const quanti = Math.round(Number(b.quanti));
        out.push({ tipo, titolo: str(b.titolo, L.label), quanti: quanti >= 3 && quanti <= 20 ? quanti : 5,
          modo: scelta(b.modo, ['ultimi', 'top'], 'ultimi'), periodo: scelta(b.periodo, ['mese', 'sempre'], 'sempre') });
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
    db.prepare(`INSERT INTO ${this.tabella} (channel, headline, tagline, template, accent, bg, links, avatar, tema, blocchi, attiva, ts)
      VALUES (@channel,@headline,@tagline,@template,@accent,@bg,@links,@avatar,@tema,@blocchi,@attiva,@ts)
      ON CONFLICT(channel) DO UPDATE SET headline=excluded.headline, tagline=excluded.tagline,
        template=excluded.template, accent=excluded.accent, bg=excluded.bg, links=excluded.links,
        avatar=excluded.avatar, tema=excluded.tema, blocchi=excluded.blocchi,
        attiva=excluded.attiva, ts=excluded.ts`).run(v);
    return this.get(c);
  },
  rimuovi(channel) { db.prepare(`DELETE FROM ${this.tabella} WHERE channel=?`).run(String(channel).toLowerCase()); },
});
export const linkPage = storePagina('link_page');
export const paginaDona = storePagina('pagina_dona');

// NB: distinto dai `counters` di sotto (store low-level usato dalle azioni dei moduli).
// I VERBI DI UN CONTATORE: quali parole fanno cosa, e chi puo'.
//
// Prima la grammatica stava scritta dentro il motore e la indovinava: «+», «-»,
// «reset», «set», piu' un elenco di una ventina di parole (ok, vai, via, go,
// start, stop, basta, ferma, down...) che accendevano e spegnevano il widget
// senza che nessuno le avesse mai viste. Chi voleva un comando diverso non
// poteva, e chi scriveva «!morti stop» si ritrovava il widget sparito.
//
// Adesso i verbi sono DEL CONTATORE. Il motore non conosce nessuna parola: legge
// queste e fa quello che dicono. I valori di partenza fanno esattamente quello
// che si faceva prima, cosi' chi i contatori ce li ha gia' non si accorge di
// niente — tranne che le cose rotte smettono di esserlo.
export const VERBI_CONT = ['leggi', 'piu', 'meno', 'azzera', 'imposta', 'mostra', 'nascondi'];
const VERBI_DEF = {
  leggi:    { parole: [], chi: 'tutti' },          // parole vuote = il nome nudo
  piu:      { parole: ['+', 'add'], chi: 'mod' },
  meno:     { parole: ['-', 'meno'], chi: 'mod' },
  azzera:   { parole: ['reset', 'azzera'], chi: 'mod' },
  imposta:  { parole: ['set'], chi: 'mod' },
  mostra:   { parole: ['on', 'mostra'], chi: 'mod' },
  nascondi: { parole: ['off', 'nascondi'], chi: 'mod' },
};
const LIV_CONT = ['tutti', 'sub', 'vip', 'mod'];

// Ripulisce quello che manda il pannello. Una parola vuota o doppia sparisce; un
// livello inventato torna a quello di fabbrica. Un verbo SENZA parole e senza
// default (cioe' tutti tranne «leggi») non si puo' piu' chiamare: e' spento, ed
// e' un modo legittimo di toglierlo.
export function normVerbiCont(x) {
  const out = {};
  const dato = (x && typeof x === 'object') ? x : {};
  for (const v of VERBI_CONT) {
    const d = VERBI_DEF[v];
    const r = (dato[v] && typeof dato[v] === 'object') ? dato[v] : null;
    const parole = r && Array.isArray(r.parole)
      ? [...new Set(r.parole.map((w) => String(w || '').toLowerCase().trim().slice(0, 20)).filter(Boolean))].slice(0, 6)
      : d.parole;
    const chi = r && LIV_CONT.includes(r.chi) ? r.chi : d.chi;
    out[v] = { parole, chi };
  }
  return out;
}

export const contatori = {
  list(channel) { return db.prepare('SELECT * FROM contatori WHERE channel=? ORDER BY comando').all(String(channel).toLowerCase()); },
  get(channel, comando) { return db.prepare('SELECT * FROM contatori WHERE channel=? AND comando=?').get(String(channel).toLowerCase(), String(comando).toLowerCase()) || null; },
  getByReward(channel, rewardId) {
    const r = String(rewardId || ''); if (!r) return null;
    return db.prepare('SELECT * FROM contatori WHERE channel=? AND reward_id=?').get(String(channel).toLowerCase(), r) || null;
  },
  autoParola(channel) { return this.list(channel).filter((c) => c.auto_parola); },
  // i verbi di questo contatore, con i valori di partenza dove non ha scelto.
  //
  // Chi aveva scritto delle parole sue per accendere e spegnere le trova al
  // posto giusto senza fare niente: erano nella configurazione del widget
  // (parolaOn/parolaOff) perche' li' era finita la vecchia lista magica, e da
  // qui in poi sono parole del verbo come tutte le altre. Si travasano solo
  // finche' i verbi non sono stati scritti a mano: dopo, comanda la sua scelta.
  verbiDi(row) {
    let v = {}; try { v = row && row.verbi ? JSON.parse(row.verbi) : {}; } catch { v = {}; }
    const fatti = normVerbiCont(v);
    if (row && !row.verbi) {
      const o = this.overlayDi(row);
      const extra = (x) => String(x || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
      const piu = (verbo, parole) => {
        if (!parole.length) return;
        fatti[verbo].parole = [...new Set([...fatti[verbo].parole, ...parole])].slice(0, 6);
      };
      piu('mostra', extra(o.parolaOn));
      piu('nascondi', extra(o.parolaOff));
    }
    return fatti;
  },
  // config del widget a schermo, con default sensati
  overlayDi(row) {
    const def = { mostra: false, x: 4, y: 94, r: 0, colore: '#ffffff', sfondo: 'rgba(0,0,0,0.55)', dim: 40, grassetto: true, font: 'system', formato: '{emoji} {etichetta}: {valore}', parolaOn: '', parolaOff: '' };
    let o = {}; try { o = row && row.overlay ? JSON.parse(row.overlay) : {}; } catch { o = {}; }
    return { ...def, ...(o && typeof o === 'object' ? o : {}) };
  },
  // payload SSE per l'overlay (testo formattato + stile)
  payloadOverlay(row) {
    const o = this.overlayDi(row);
    const testo = String(o.formato || '{emoji} {etichetta}: {valore}')
      .replace(/\{emoji\}/g, row.emoji || '').replace(/\{etichetta\}/g, row.etichetta || row.comando).replace(/\{valore\}/g, String(row.valore ?? 0))
      .replace(/\s+/g, ' ').trim();
    return { tipo: 'contatore', comando: row.comando, mostra: !!o.mostra, testo, x: o.x, y: o.y, r: o.r, colore: o.colore, sfondo: o.sfondo, dim: o.dim, grassetto: !!o.grassetto, font: o.font };
  },
  // aggiorna SOLO la config overlay (merge), es. mostra on/off da chat
  patchOverlay(channel, comando, patch) {
    const c = String(channel).toLowerCase(), cmd = String(comando).toLowerCase();
    const cur = this.get(c, cmd); if (!cur) return null;
    const o = { ...this.overlayDi(cur), ...(patch || {}) };
    db.prepare('UPDATE contatori SET overlay=?, ts=? WHERE channel=? AND comando=?').run(JSON.stringify(o), now(), c, cmd);
    return this.get(c, cmd);
  },
  upsert(channel, { comando, etichetta, emoji, step, autoParola, rewardId, valore, overlay, verbi } = {}) {
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
      verbi: verbi !== undefined ? JSON.stringify(normVerbiCont(verbi)) : (cur?.verbi || ''),
    };
    db.prepare(`INSERT INTO contatori (channel, comando, etichetta, emoji, valore, step, auto_parola, reward_id, overlay, verbi, ts)
      VALUES (@channel,@comando,@etichetta,@emoji,@valore,@step,@auto_parola,@reward_id,@overlay,@verbi,@ts)
      ON CONFLICT(channel,comando) DO UPDATE SET etichetta=excluded.etichetta, emoji=excluded.emoji, valore=excluded.valore,
        step=excluded.step, auto_parola=excluded.auto_parola, reward_id=excluded.reward_id, overlay=excluded.overlay,
        verbi=excluded.verbi, ts=excluded.ts`)
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
// Quante volte sono cambiati i comandi di un canale. Serve a chi tiene una
// copia in memoria per non rileggere il database a ogni riga di chat: invece di
// una scadenza a tempo (che lascia una finestra in cui si risponde ancora alla
// vecchia maniera) si confronta questo numero. Vive QUI, accanto alle uniche
// funzioni che possono cambiarli, cosi' non c'e' un punto di aggiornamento da
// ricordarsi di chiamare.
const _revComandi = new Map();
const _cambiati = (channel) => {
  const ch = String(channel || '').toLowerCase();
  _revComandi.set(ch, (_revComandi.get(ch) || 0) + 1);
};
export function revisioneComandi(channel) {
  return _revComandi.get(String(channel || '').toLowerCase()) || 0;
}

export const commands = {
  list(channel) { return db.prepare('SELECT name, response FROM commands WHERE channel=? ORDER BY name').all(channel); },
  get(channel, name) { return db.prepare('SELECT response FROM commands WHERE channel=? AND name=?').get(channel, name.toLowerCase())?.response ?? null; },
  set(channel, name, response, by = '') {
    db.prepare(`INSERT INTO commands (channel, name, response, created_by, ts) VALUES (?,?,?,?,?)
      ON CONFLICT(channel, name) DO UPDATE SET response=excluded.response, created_by=excluded.created_by, ts=excluded.ts`)
      .run(channel, name.toLowerCase(), response, by, now());
    _cambiati(channel);
  },
  remove(channel, name) { db.prepare('DELETE FROM commands WHERE channel=? AND name=?').run(channel, name.toLowerCase()); _cambiati(channel); },
};

// ------------------------------------------------- dirette gia' annunciate
// A cosa serve: un avviso «e' live» non deve partire due volte per la stessa
// diretta. Il conteggio e' PER PIATTAFORMA, perche' si puo' essere in diretta
// su Twitch e su Kick insieme: se il ricordo fosse uno solo, il secondo avviso
// cancellerebbe il ricordo del primo e la prossima volta si ripeterebbe.
export const dirette = {
  gia(channel, piattaforma, direttaId) {
    const id = String(direttaId || '');
    if (!id) return false;                        // senza id non si puo' sapere: meglio avvisare
    const r = db.prepare('SELECT diretta_id FROM dirette_annunciate WHERE channel=? AND piattaforma=?')
      .get(String(channel).toLowerCase(), String(piattaforma));
    return r?.diretta_id === id;
  },
  segna(channel, piattaforma, direttaId) {
    const id = String(direttaId || '');
    if (!id) return;
    db.prepare(`INSERT INTO dirette_annunciate (channel, piattaforma, diretta_id, ts) VALUES (?,?,?,?)
      ON CONFLICT(channel, piattaforma) DO UPDATE SET diretta_id=excluded.diretta_id, ts=excluded.ts`)
      .run(String(channel).toLowerCase(), String(piattaforma), id, now());
  },
  dimentica(channel, piattaforma) {
    db.prepare('DELETE FROM dirette_annunciate WHERE channel=? AND piattaforma=?')
      .run(String(channel).toLowerCase(), String(piattaforma));
  },
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
// -------------------------------------------------- la SCHEDA dello streamer
// Chi è, detto da lui. Non è conoscenza fra le altre: è il fondo su cui tutto il
// resto si appoggia, e per questo sta SEMPRE nel prompt in un blocco suo, senza
// gareggiare con le domande e risposte per un posto.
//
// Un campo per domanda vera, con un tetto stretto: due righe che il bot legge
// davvero valgono più di una biografia che gli riempie il contesto. `dove` è
// l'unico che va riportato alla lettera — dentro ci sono gli indirizzi.
export const SCHEDA_CAMPI = {
  chi: 240,
  faccio: 240,
  orari: 160,
  dove: 240,
  chiamami: 40,
  evita: 240,
};

export function schedaPulita(grezza) {
  const out = {};
  for (const [campo, max] of Object.entries(SCHEDA_CAMPI)) {
    const v = String((grezza || {})[campo] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    if (v) out[campo] = v;
  }
  return out;
}

export const QUANDO_CONOSCENZA = ['sempre', 'live', 'offline'];

export const knowledge = {
  add(channel, { domanda, risposta, fonte = 'manuale', quando = 'sempre', fissata = false }) {
    const q = QUANDO_CONOSCENZA.includes(quando) ? quando : 'sempre';
    db.prepare('INSERT INTO knowledge (channel, domanda, risposta, fonte, quando, fissata, ts) VALUES (?,?,?,?,?,?,?)')
      .run(channel, String(domanda).slice(0, 300), String(risposta).slice(0, 450), fonte, q, fissata ? 1 : 0, now());
    // massimo 500 voci per canale: si scartano le più vecchie non manuali, poi le più vecchie
    db.prepare(`DELETE FROM knowledge WHERE channel=? AND id NOT IN (
      SELECT id FROM knowledge WHERE channel=? ORDER BY (fonte='manuale') DESC, ts DESC LIMIT 500)`)
      .run(channel, channel);
  },
  list(channel) {
    // `ts` è in millisecondi: due voci aggiunte nello stesso istante hanno la
    // stessa data, e ordinare solo per data lascerebbe decidere al caso quale
    // viene prima. L'id spareggia, e "più recente" resta una cosa sola.
    return db.prepare('SELECT * FROM knowledge WHERE channel=? ORDER BY ts DESC, id DESC').all(channel)
      .map((r) => ({ ...r, fissata: !!r.fissata, quando: r.quando || 'sempre' }));
  },
  // Cambia l'AMBITO di una voce senza riscriverla: capita di sbagliare il
  // «quando», non la risposta — e riscrivere tutto per correggere un menù è il
  // modo di non correggerlo mai.
  setAmbito(channel, id, { quando, fissata } = {}) {
    const r = db.prepare('SELECT id FROM knowledge WHERE channel=? AND id=?').get(channel, Number(id) || 0);
    if (!r) return false;
    if (quando !== undefined && QUANDO_CONOSCENZA.includes(quando)) {
      db.prepare('UPDATE knowledge SET quando=? WHERE id=?').run(quando, r.id);
    }
    if (fissata !== undefined) db.prepare('UPDATE knowledge SET fissata=? WHERE id=?').run(fissata ? 1 : 0, r.id);
    return true;
  },
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
    const sue = this.list(channel).filter((g) => {
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
    // Il genere con cui il bot parla di se' non e' una regola che lo streamer
    // scrive: e' un'impostazione, e vale sempre. Sta QUI perche' qui nascono le
    // regole che arrivano al modello, e i punti che le chiedono sono sei: messa
    // in uno solo vale anche per il settimo, quando ci sara'.
    // In testa e fuori dal conto delle sue: se consumasse un posto, la
    // dodicesima regola dello streamer sparirebbe per far spazio a questa.
    const imp = streamers.get(channel)?.settings || {};
    const testa = [];
    // Il CARATTERE, scritto dallo streamer con parole sue: «sei tagliente e
    // sarcastica», «sei dolcissima e chiami tutti tesoro». Sta prima delle regole
    // perche' e' chi il bot E', mentre quelle sono cosa deve fare. Passa dalla
    // stessa strada del genere per la stessa ragione: sei punti chiedono le
    // regole al modello, e una cosa messa qui vale anche per il settimo.
    const car = String(imp.carattere || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (car) testa.push(`Il tuo carattere, deciso da chi ti ha creato: ${car}`);
    testa.push(istruzioneGenere(imp.genere));
    // In testa e fuori dal conto delle sue: se consumassero un posto, le ultime
    // regole dello streamer sparirebbero per far spazio a queste.
    return [...testa.filter(Boolean), ...sue];
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

export const MAX_MODULI = 100;   // tetto di moduli per canale

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
    altrimenti: Array.isArray(cfg.altrimenti) ? cfg.altrimenti : [],
    timerLast: Number(r.timer_last) || 0,
  };
}

// Le CONDIZIONI di un modulo, ripulite prima di finire nel database. Non e'
// pignoleria: qui dentro passa quello che manda il browser, e un elenco di
// piattaforme inventate renderebbe un comando muto senza che si capisca
// perche'. Assente o vuoto = tutte le piattaforme, che e' come si comportano
// tutti i moduli creati finora.
export const PIATTAFORME_MODULO = ['twitch', 'kick', 'youtube'];
// Limita i numeri delle condizioni a valori che hanno senso. Non e' pignoleria:
// un costo negativo REGALEREBBE monete a ogni uso, e un cooldown enorme
// spegnerebbe un comando senza che si capisca perche'.
const intero = (v, lo, hi) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};

function normCondizioni(c) {
  const out = { ...(c && typeof c === 'object' ? c : {}) };
  // `costo` puo' essere un numero fisso oppure un'espressione ($arg1): senza
  // questo non si potrebbe scrivere "!scommetti 100", che e' meta' dei giochi a
  // punti. Resta comunque un solo valore, letto e limitato al momento dell'uso.
  if (typeof out.costo === 'string' && out.costo.includes('$')) {
    const t = out.costo.trim().slice(0, 60);
    if (t) out.costo = t; else delete out.costo;
  } else if (out.costo !== undefined) {
    const n = intero(out.costo, 0, 1_000_000);
    if (n === null || n === 0) delete out.costo; else out.costo = n;
  }
  // `minQuantita`/`maxQuantita` sono la scala degli eventi che portano un numero
  // (i Bit di un cheer, gli spettatori di una raid, i mesi di un abbonamento).
  // Zero vuol dire «nessun limite» e sparisce: un massimo a zero fermerebbe
  // tutto invece di non fermare niente.
  for (const [campo, lo, hi] of [['minPunti', 0, 1_000_000], ['cooldownUtente', 0, 86_400],
    ['minQuantita', 0, 10_000_000], ['maxQuantita', 0, 10_000_000]]) {
    if (out[campo] === undefined || out[campo] === '' || out[campo] === null) { delete out[campo]; continue; }
    const n = intero(out[campo], lo, hi);
    if (n === null || n === 0) delete out[campo]; else out[campo] = n;
  }
  // Un tetto piu' basso del pavimento non e' una fascia: e' un refuso, e
  // lascerebbe un modulo che non puo' scattare mai senza che si capisca perche'.
  // Il pavimento e' la parte voluta di una scala («da N in su»), il tetto la
  // rifinitura: la rifinitura che contraddice la base si butta.
  if (out.maxQuantita !== undefined && out.minQuantita !== undefined
      && out.maxQuantita < out.minQuantita) delete out.maxQuantita;
  if (out.costoMessaggio !== undefined) {
    const t = String(out.costoMessaggio).slice(0, 300).trim();
    if (t) out.costoMessaggio = t; else delete out.costoMessaggio;
  }
  if (out.piattaforme !== undefined) {
    const scelte = (Array.isArray(out.piattaforme) ? out.piattaforme : [])
      .map((x) => String(x).toLowerCase())
      .filter((x) => PIATTAFORME_MODULO.includes(x));
    // tutte scelte = come non aver scelto: si tiene la forma piu' semplice
    if (!scelte.length || scelte.length === PIATTAFORME_MODULO.length) delete out.piattaforme;
    else out.piattaforme = [...new Set(scelte)];
  }
  return out;
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
    const altrimenti = Array.isArray(m?.altrimenti) ? m.altrimenti : [];
    const config = JSON.stringify({
      trigger: m?.trigger || {},
      condizioni: normCondizioni(m?.condizioni),
      azioni: Array.isArray(m?.azioni) ? m.azioni : [],
      // il ramo del "no": assente quando e' vuoto, cosi' i moduli che non lo
      // usano restano esattamente com'erano
      ...(altrimenti.length ? { altrimenti } : {}),
      telegram: m?.telegram === true,
    });
    const attivo = m?.attivo === false ? 0 : 1;
    const id = Number(m?.id);
    if (Number.isFinite(id) && id > 0 &&
        db.prepare('SELECT 1 FROM modules WHERE channel=? AND id=?').get(channel, id)) {
      db.prepare('UPDATE modules SET nome=?, attivo=?, config=?, ts=? WHERE channel=? AND id=?')
        .run(nome, attivo, config, now(), channel, id);
      _cambiati(channel);
      return id;
    }
    const n = db.prepare('SELECT COUNT(*) c FROM modules WHERE channel=?').get(channel).c;
    if (n >= MAX_MODULI) throw new Error(`hai raggiunto il massimo di ${MAX_MODULI} moduli`);
    const info = db.prepare('INSERT INTO modules (channel, nome, attivo, config, ts) VALUES (?,?,?,?,?)')
      .run(channel, nome, attivo, config, now());
    _cambiati(channel);
    return Number(info.lastInsertRowid);
  },
  remove(channel, id) { db.prepare('DELETE FROM modules WHERE channel=? AND id=?').run(channel, id); _cambiati(channel); },
  // L'ora dell'ultimo giro di un modulo a tempo. Non tocca la revisione dei
  // comandi: qui non cambia niente di cio' che il bot risponde, e si scrive
  // ogni volta che un timer parte.
  segnaTimer(channel, id, quando) {
    db.prepare('UPDATE modules SET timer_last=? WHERE channel=? AND id=?')
      .run(Math.floor(Number(quando) || 0), channel, Number(id));
  },
  setAttivo(channel, id, attivo) {
    db.prepare('UPDATE modules SET attivo=? WHERE channel=? AND id=?').run(attivo ? 1 : 0, channel, id);
    _cambiati(channel);
  },
  // Tutti i moduli ATTIVI di TUTTI i canali (usato dal motore timer). Ogni voce
  // porta con sé il proprio channel.
  all() {
    return db.prepare('SELECT * FROM modules WHERE attivo=1').all()
      .map(r => ({ channel: r.channel, ...rowToModule(r) }));
  },
};

// ------------------------------------------------------------- stato vivo
// Un deploy dura pochi secondi, una diretta dura ore: il processo muore, la
// diretta no. Tutto quello che un motore tiene acceso mentre la diretta va —
// un giveaway aperto, una penitenza in corso, il livello dello scudo, il ritmo
// che il canale ha imparato — se sta solo in memoria sparisce a ogni
// pubblicazione. Qui c'e' la casa comune: una riga per canale e chiave, dentro
// il JSON che il motore si e' scritto da se'. Nessuno legge il JSON di un altro.

export const statoVivo = {
  leggi(channel, chiave) {
    const r = db.prepare('SELECT dato FROM stato_vivo WHERE channel=? AND chiave=?')
      .get(String(channel || '').toLowerCase(), String(chiave || ''));
    return r ? safeJson(r.dato) : null;
  },
  scrivi(channel, chiave, dato) {
    db.prepare(`INSERT INTO stato_vivo (channel, chiave, dato, ts) VALUES (?,?,?,?)
      ON CONFLICT(channel, chiave) DO UPDATE SET dato=excluded.dato, ts=excluded.ts`)
      .run(String(channel || '').toLowerCase(), String(chiave || ''), JSON.stringify(dato ?? {}), now());
  },
  togli(channel, chiave) {
    db.prepare('DELETE FROM stato_vivo WHERE channel=? AND chiave=?')
      .run(String(channel || '').toLowerCase(), String(chiave || ''));
  },
  // Tutte le righe di una chiave, per rimettere in piedi i motori all'avvio.
  // `piuVecchieDi` (ms) butta quelle rimaste indietro invece di riaprirle: un
  // giveaway di tre settimane fa non va riaperto, va dimenticato.
  tutti(chiave, piuVecchieDi = 0) {
    const righe = db.prepare('SELECT channel, dato, ts FROM stato_vivo WHERE chiave=?').all(String(chiave || ''));
    const limite = piuVecchieDi > 0 ? now() - piuVecchieDi : 0;
    const vive = [];
    for (const r of righe) {
      if (limite && Number(r.ts) < limite) {
        try { db.prepare('DELETE FROM stato_vivo WHERE channel=? AND chiave=?').run(r.channel, String(chiave || '')); } catch (e) {  }
        continue;
      }
      vive.push({ channel: r.channel, dato: safeJson(r.dato), ts: Number(r.ts) || 0 });
    }
    return vive;
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
