// Database di SocialBot (SQLite): qui vivono token, streamer abilitati,
// memoria del bot (messaggi, ricordi sugli utenti, lezioni imparate),
// comandi personalizzati e registro delle clip.
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';

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
  attivo INTEGER NOT NULL DEFAULT 1,
  ts INTEGER NOT NULL
);
-- indice UNIVOCO su (channel, comando): serve anche all'UPSERT (ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_effects_channel_comando ON effects(channel, comando);

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
  ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, reward_id)
);
`);

// --- migrazioni leggere: aggiunge colonne nuove a DB già esistenti ------------
// CREATE TABLE IF NOT EXISTS non tocca le tabelle già create, quindi le colonne
// aggiunte dopo il primo avvio vanno inserite a mano (idempotente).
function aggiungiColonna(tabella, colonna, definizione) {
  const cols = db.prepare(`PRAGMA table_info(${tabella})`).all();
  if (!cols.some((c) => c.name === colonna)) {
    db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${definizione}`);
  }
}
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
aggiungiColonna('quotes', 'autore', "TEXT NOT NULL DEFAULT ''");   // chi ha DETTO la citazione (import x.la: nome utente)
aggiungiColonna('quotes', 'data', "TEXT NOT NULL DEFAULT ''");     // data della citazione (ISO YYYY-MM-DD, se nota)
// linee guida: ambito (dove valgono + con chi) — regole contestuali di "lia"
aggiungiColonna('linee_guida', 'dove', "TEXT NOT NULL DEFAULT 'ovunque'");     // ovunque | twitch | tg | tg-privato
aggiungiColonna('linee_guida', 'con_chi', "TEXT NOT NULL DEFAULT 'tutti'");    // tutti | solo-me | tranne-me
// abbonamenti modulari: pacchetti add-on à la carte attivi (CSV di id)
aggiungiColonna('subscriptions', 'pacchetti', "TEXT NOT NULL DEFAULT ''");
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
      .run(kind, login.toLowerCase(), t.userId || '', t.accessToken, t.refreshToken || '', (t.scopes || []).join(' '), t.expiresAt || 0, now());
  },
  get(kind, login) {
    const r = db.prepare('SELECT * FROM tokens WHERE kind=? AND login=?').get(kind, login.toLowerCase());
    if (!r) return null;
    return { userId: r.user_id, accessToken: r.access_token, refreshToken: r.refresh_token,
      scopes: r.scopes ? r.scopes.split(' ') : [], expiresAt: r.expires_at };
  },
  // il token del bot è unico: il primo (e unico) con kind='bot'
  getBot() {
    const r = db.prepare("SELECT * FROM tokens WHERE kind='bot' ORDER BY updated_at DESC LIMIT 1").get();
    if (!r) return null;
    return { login: r.login, userId: r.user_id, accessToken: r.access_token, refreshToken: r.refresh_token,
      scopes: r.scopes ? r.scopes.split(' ') : [], expiresAt: r.expires_at };
  },
  delete(kind, login) { db.prepare('DELETE FROM tokens WHERE kind=? AND login=?').run(kind, login.toLowerCase()); },
};

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
  // canali dove il bot deve stare adesso: approvati + accesi
  active() {
    return db.prepare("SELECT * FROM streamers WHERE status='approved' AND bot_enabled=1").all()
      .map(r => ({ ...r, settings: safeJson(r.settings), botEnabled: true }));
  },
  setStatus(login, status) {
    db.prepare('UPDATE streamers SET status=?, approved_at=CASE WHEN ?=\'approved\' THEN ? ELSE approved_at END WHERE login=?')
      .run(status, status, now(), login.toLowerCase());
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
      chat_titolo: campi.chatTitolo !== undefined ? String(campi.chatTitolo) : cur.chat_titolo,
      bot_username: campi.botUsername !== undefined ? String(campi.botUsername) : cur.bot_username,
      attivo: campi.attivo !== undefined ? (campi.attivo ? 1 : 0) : cur.attivo,
      messaggio: campi.messaggio !== undefined ? String(campi.messaggio) : cur.messaggio,
      ultima_live: campi.ultimaLive !== undefined ? String(campi.ultimaLive) : cur.ultima_live,
      pin_live: campi.pinLive !== undefined ? (campi.pinLive ? 1 : 0) : (cur.pin_live ?? 1),
      msg_id: campi.msgId !== undefined ? String(campi.msgId) : (cur.msg_id ?? ''),
      msg_id_tk: campi.msgIdTk !== undefined ? String(campi.msgIdTk) : (cur.msg_id_tk ?? ''),
    };
    db.prepare(`INSERT INTO telegram (channel, token, chat_id, chat_titolo, bot_username, attivo, messaggio, ultima_live, pin_live, msg_id, msg_id_tk, ts)
      VALUES (@channel, @token, @chat_id, @chat_titolo, @bot_username, @attivo, @messaggio, @ultima_live, @pin_live, @msg_id, @msg_id_tk, @ts)
      ON CONFLICT(channel) DO UPDATE SET token=excluded.token, chat_id=excluded.chat_id, chat_titolo=excluded.chat_titolo,
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
    return db.prepare('SELECT reward_id, titolo, costo, effetto, testo, ts FROM point_alerts WHERE channel=? ORDER BY ts DESC')
      .all(String(channel).toLowerCase());
  },
  getByReward(channel, rewardId) {
    return db.prepare('SELECT reward_id, titolo, costo, effetto, testo FROM point_alerts WHERE channel=? AND reward_id=?')
      .get(String(channel).toLowerCase(), String(rewardId)) || null;
  },
  add(channel, { rewardId, titolo, costo, effetto, testo }) {
    db.prepare(`INSERT INTO point_alerts(channel, reward_id, titolo, costo, effetto, testo, ts)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(channel, reward_id) DO UPDATE SET titolo=excluded.titolo, costo=excluded.costo,
        effetto=excluded.effetto, testo=excluded.testo`)
      .run(String(channel).toLowerCase(), String(rewardId), String(titolo || '').slice(0, 60),
           Math.max(0, Math.round(Number(costo) || 0)), String(effetto || '').slice(0, 24), String(testo || '').slice(0, 300), now());
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
  // Elimina un effetto e ritorna il nome file da cancellare dal disco (o null).
  remove(channel, id) {
    const r = db.prepare('SELECT file FROM effects WHERE channel=? AND id=?').get(channel, id);
    if (!r) return null;
    db.prepare('DELETE FROM effects WHERE channel=? AND id=?').run(channel, id);
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
