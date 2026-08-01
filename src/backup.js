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
//    riempie il disco.
import { mkdirSync, readdirSync, statSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './db.js';
import { config } from './config.js';
import { makeLog } from './logger.js';

const log = makeLog('backup');

const ATTIVO = process.env.BACKUP !== '0';
const OGNI_MS = Math.max(1, parseInt(process.env.BACKUP_OGNI_ORE || '8', 10) || 8) * 3600_000;
const TIENI = Math.max(2, parseInt(process.env.BACKUP_TIENI || '10', 10) || 10);
const PREFISSO = 'andrybot-';
const dir = () => join(config.dataDir, 'backup');

// nome file col timestamp (ordinabile): andrybot-YYYYMMDD-HHmmss.db
function nomeFile(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${PREFISSO}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.db`;
}

function elenco(d) {
  try {
    return readdirSync(d)
      .filter((f) => f.startsWith(PREFISSO) && f.endsWith('.db'))
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

// Esegue UN backup adesso. Ritorna { ok, file } o { ok:false, errore }.
export async function backupOra() {
  try {
    const d = dir();
    mkdirSync(d, { recursive: true });
    try { chmodSync(d, 0o700); } catch { /* best-effort */ }
    const dest = join(d, nomeFile(new Date()));
    await db.backup(dest);                 // backup online coerente
    try { chmodSync(dest, 0o600); } catch { /* best-effort */ }
    ruota(d);
    log.info(`backup salvato (${elenco(d).length} copie totali)`);
    return { ok: true, file: dest };
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
