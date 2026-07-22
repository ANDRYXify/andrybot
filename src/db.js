// Database di AndryBot (SQLite): qui vivono token, streamer abilitati,
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
`);

const now = () => Date.now();

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
    return { ...r, settings: safeJson(r.settings), botEnabled: !!r.bot_enabled };
  },
  list() {
    return db.prepare('SELECT * FROM streamers ORDER BY requested_at DESC').all()
      .map(r => ({ ...r, settings: safeJson(r.settings), botEnabled: !!r.bot_enabled }));
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
  setSettings(login, settings) {
    db.prepare('UPDATE streamers SET settings=? WHERE login=?').run(JSON.stringify(settings || {}), login.toLowerCase());
  },
  remove(login) { db.prepare('DELETE FROM streamers WHERE login=?').run(login.toLowerCase()); },
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

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }
