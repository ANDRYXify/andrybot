// Backup automatico del database. Tutto (comandi, temi, monete, moderatori,
// pagine link, token) vive in un solo file SQLite: un incidente e sparisce
// tutto. Qui ne teniamo copie periodiche, in sicurezza.
//
// SICUREZZA ("blindato"):
//  · usiamo il backup ONLINE di SQLite (db.backup): copia coerente anche mentre
//    il bot scrive, niente file mezzo-scritto e corrotto;
//  · le copie stanno in dataDir/backup, FUORI da qualsiasi cartella servita sul
//    web (public/ ed effects/): non sono scaricabili da internet;
//  · cartella 0700 e file 0600 (li legge solo l'utente del processo);
//  · nessun endpoint di download: le copie contengono dati sensibili (token,
//    ecc.), quindi non creiamo una porta per tirarle fuori via web — si
//    recuperano dal server. Esponiamo solo un piccolo "stato" (quante e quando).
//  · rotazione: teniamo le ultime N e cancelliamo le più vecchie, così non si
//    riempie il disco;
//  · CIFRATE. Una copia del database vale il database: finché stava in chiaro,
//    il backup rubato consegnava tutto quello che il database non consegnava
//    più. Ora ogni copia ha la sua chiave (docs/SEGRETI.md), e sul disco resta
//    solo la busta. Si verifica aprendola davvero: si decifra in un file
//    temporaneo, si controlla, e il temporaneo sparisce subito — così «il
//    backup è buono» resta una cosa provata, non sperata.
import { mkdirSync, readdirSync, statSync, rmSync, chmodSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import crypto from 'node:crypto';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { db } from './db.js';
import { config } from './config.js';
import { makeLog } from './logger.js';
import { cifraBytes, decifraBytes, eBytesCifrati } from './segreti.js';

const log = makeLog('backup');

const ATTIVO = process.env.BACKUP !== '0';
const OGNI_MS = Math.max(1, parseInt(process.env.BACKUP_OGNI_ORE || '8', 10) || 8) * 3600_000;
const TIENI = Math.max(2, parseInt(process.env.BACKUP_TIENI || '10', 10) || 10);
const PREFISSO = 'andrybot-';
// L'estensione delle copie cifrate. Le vecchie `.db` in chiaro restano
// leggibili: si ripristinano e basta, ma non se ne creano più.
const CIF = '.db.cif';
// Il «dove abita» della busta di una copia: il suo nome. Una copia rinominata
// non si apre — che è quello che si vuole, perché il nome porta la data.
const postoDi = (file) => 'backup|' + String(file).split('/').pop();
const dir = () => join(config.dataDir, 'backup');

// nome file col timestamp (ordinabile): andrybot-YYYYMMDD-HHmmss.db
function nomeFile(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${PREFISSO}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.db`;
}

function elenco(d) {
  try {
    return readdirSync(d)
      .filter((f) => f.startsWith(PREFISSO) && (f.endsWith('.db') || f.endsWith(CIF)))
      .map((f) => ({ f, s: statSync(join(d, f)) }))
      .sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  } catch { return []; }
}

// tiene le ultime TIENI copie, cancella le più vecchie.
function ruota(d) {
  try {
    for (const { f } of elenco(d).slice(TIENI)) {
      try { rmSync(join(d, f)); } catch { /* niente */ }
    }
  } catch (e) { log.debug('rotazione:', e?.message || e); }
}

// Le tabelle che DEVONO esserci in una copia buona. Se una copia si apre ma è
// vuota di queste, non è un backup: è un file.
const TABELLE_VITALI = ['streamers', 'tokens', 'effects', 'commands', 'subscriptions'];

// APRE DAVVERO una copia e la controlla. Un backup mai riaperto è una speranza,
// non un backup: qui si verifica che si apra, che SQLite la dichiari integra e
// che dentro ci siano le tabelle che contano. In sola lettura, quindi non può
// rovinare nulla.
export function provaCopia(file) {
  if (!file || !existsSync(file)) return { ok: false, errore: 'copia non trovata' };
  let c = null;
  let temporaneo = null;
  try {
    // Una copia cifrata non si apre: si apre quello che ci sta dentro, e per un
    // attimo solo. Il temporaneo nasce con i permessi stretti e muore nel finally.
    if (file.endsWith(CIF)) {
      const chiaro = decifraBytes(readFileSync(file), postoDi(file));
      if (!chiaro) return { ok: false, errore: 'copia non decifrabile (segreto del server diverso?)' };
      temporaneo = join(tmpdir(), 'sb-prova-' + crypto.randomBytes(8).toString('hex') + '.db');
      writeFileSync(temporaneo, chiaro, { mode: 0o600 });
      file = temporaneo;
    }
    c = new Database(file, { readonly: true, fileMustExist: true });
    const integro = c.pragma('integrity_check', { simple: true });
    if (integro !== 'ok') return { ok: false, errore: 'integrity_check: ' + integro };
    const tabelle = new Set(c.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));
    const mancanti = TABELLE_VITALI.filter((t) => !tabelle.has(t));
    if (mancanti.length) return { ok: false, errore: 'tabelle mancanti: ' + mancanti.join(', ') };
    const streamer = c.prepare('SELECT COUNT(*) n FROM streamers').get().n;
    return { ok: true, tabelle: tabelle.size, streamer };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  } finally {
    try { c?.close(); } catch { /* niente */ }
    if (temporaneo) { try { unlinkSync(temporaneo); } catch { /* niente */ } }
  }
}

// Esito dell'ultima prova, per lo stato in dashboard.
let _ultimaProva = null;
export function ultimaProvaCopia() { return _ultimaProva; }

// Prova l'ultima copia disponibile.
export function provaUltimaCopia() {
  const l = elenco(dir());
  if (!l.length) { _ultimaProva = { ok: false, errore: 'nessuna copia', ts: Date.now() }; return _ultimaProva; }
  const r = provaCopia(join(dir(), l[0].f));
  _ultimaProva = { ...r, file: l[0].f, ts: Date.now() };
  if (!r.ok) log.error(`la copia ${l[0].f} NON e' ripristinabile: ${r.errore}`);
  return _ultimaProva;
}

// Elenco delle copie (nome, quando, quanto): lo usa lo script di ripristino.
export function elencoCopie() {
  return elenco(dir()).map(({ f, s }) => ({ file: f, percorso: join(dir(), f), ts: s.mtimeMs, bytes: s.size }));
}
export function cartellaCopie() { return dir(); }

// Rimette una copia al posto del database. Sta QUI e non nello script perche'
// la prova del ripristino deve poter fare la stessa identica cosa: se il giro e'
// scritto in due posti, quello provato non e' quello che gira il giorno del
// disastro. Ritorna { ok } o { ok:false, errore }.
export function ripristinaCopia(percorso, dest) {
  try {
    const dati = readFileSync(percorso);
    if (!eBytesCifrati(dati)) { writeFileSync(dest, dati, { mode: 0o600 }); return { ok: true, cifrata: false }; }
    const chiaro = decifraBytes(dati, postoDi(percorso));
    if (!chiaro) return { ok: false, errore: 'la copia non si apre: il segreto del server non e\' quello con cui era stata chiusa' };
    writeFileSync(dest, chiaro, { mode: 0o600 });
    return { ok: true, cifrata: true };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// Esegue UN backup adesso. Ritorna { ok, file } o { ok:false, errore }.
export async function backupOra() {
  try {
    const d = dir();
    mkdirSync(d, { recursive: true });
    try { chmodSync(d, 0o700); } catch { /* best-effort */ }
    const nome = nomeFile(new Date());
    const chiaro = join(d, nome);
    await db.backup(chiaro);               // backup online coerente
    try { chmodSync(chiaro, 0o600); } catch { /* best-effort */ }

    // Si prova SUBITO, e si prova il file IN CHIARO: un backup che non si
    // riapre va saputo adesso, non il giorno del disastro.
    const prova = provaCopia(chiaro);
    if (!prova.ok) {
      log.error(`backup salvato ma NON ripristinabile: ${prova.errore}`);
      _ultimaProva = { ...prova, file: nome, ts: Date.now() };
      ruota(d);
      return { ok: true, file: chiaro, prova };
    }

    // Poi si chiude nella busta e il chiaro sparisce. In quest'ordine: cifrare
    // prima di aver verificato vorrebbe dire scoprire il giorno del disastro che
    // si è conservata con cura una copia rotta.
    const dest = join(d, nome + '.cif');
    const busta = cifraBytes(readFileSync(chiaro), postoDi(dest));
    if (busta) {
      writeFileSync(dest, busta, { mode: 0o600 });
      try { unlinkSync(chiaro); } catch { /* niente */ }
    } else {
      log.warn('backup non cifrato: manca il segreto del server (SESSION_SECRET)');
    }
    ruota(d);
    const file = busta ? dest : chiaro;
    _ultimaProva = { ...prova, file: file.split('/').pop(), ts: Date.now() };
    log.info(`backup salvato${busta ? ' e cifrato' : ''}, riaperto ok (${elenco(d).length} copie, ${prova.streamer} streamer dentro)`);
    return { ok: true, file, prova };
  } catch (e) {
    log.error('backup fallito:', e?.message || e);
    return { ok: false, errore: e?.message || String(e) };
  }
}

// Stato leggero per la dashboard: quante copie e quando è l'ultima. Nessun
// contenuto, nessun percorso completo (solo il nome file dell'ultima).
export function statoBackup() {
  const l = elenco(dir());
  return {
    attivo: ATTIVO,
    conteggio: l.length,
    ultimo: l[0]?.s.mtimeMs || 0,
    ultimoNome: l[0]?.f || '',
    bytes: l.reduce((n, x) => n + (x.s.size || 0), 0),
    ogniOre: OGNI_MS / 3600_000,
    tieni: TIENI,
    prova: _ultimaProva,
  };
}

let timer = null;
// Avvia il backup periodico. Uno subito dopo l'avvio (con un piccolo ritardo per
// non appesantire il boot), poi ogni OGNI_MS. Ritorna una funzione stop().
export function avviaBackupAuto() {
  if (!ATTIVO) { log.info('backup automatico DISATTIVATO (BACKUP=0)'); return () => {}; }
  if (timer) return () => stopBackupAuto();
  setTimeout(() => backupOra().catch(() => {}), 90_000);
  timer = setInterval(() => backupOra().catch(() => {}), OGNI_MS);
  timer.unref?.();
  log.info(`backup automatico ogni ${OGNI_MS / 3600_000}h · conservo le ultime ${TIENI} copie`);
  return () => stopBackupAuto();
}

export function stopBackupAuto() { if (timer) { clearInterval(timer); timer = null; } }
