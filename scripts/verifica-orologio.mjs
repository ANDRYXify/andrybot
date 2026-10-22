// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dell'OROLOGIO: le prove passano anche fra qualche mese.
//
// Perché esiste. Il 22 ottobre 2026 l'aggiornamento del server si è fermato
// su una prova che fino al mattino passava: il giudizio dei follower misurava
// «account di oggi» con l'ora della prova (8 ottobre), ma il punteggio dentro
// usava l'orologio vero. Dalle 11 del 22 ottobre, quattordici giorni dopo, il
// punteggio non contava più l'account come nuovo e la prova cambiava esito.
// Era un difetto del codice (due orologi nello stesso giudizio), e una prova
// che dipende dal giorno in cui gira blocca un aggiornamento a caso.
//
// Qui tutte le prove girano con «adesso» spostato in avanti
// (_orologio-avanti.mjs): una prova che dipende da che giorno è oggi esce rossa
// qui, subito, e non il giorno in cui il server si aggiorna.
//
// Uso: node scripts/verifica-orologio.mjs             (esce 1 se una prova cambia esito)
//      node scripts/verifica-orologio.mjs --selftest  (rimette i due orologi nel giudizio
//                                                      dei follower: lo vuole rosso)
import './_dati-usa-e-getta.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');
const GIORNI = 200;
const AVANTI = join(RAD, 'scripts', '_orologio-avanti.mjs');

function prove(file = []) {
  const dati = mkdtempSync(join(tmpdir(), 'orologio-'));
  try {
    const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--test', ...file], {
      cwd: RAD, encoding: 'utf8', timeout: 1_200_000, maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, SB_COLLAUDO: '1', DATA_DIR: dati, TMPDIR: dati, SPOSTA_GIORNI: String(GIORNI),
        NODE_OPTIONS: [process.env.NODE_OPTIONS || '', `--import=${AVANTI}`].join(' ').trim() },
    });
    const out = (r.stdout || '') + (r.stderr || '');
    const rosse = out.split('\n').filter((l) => /^not ok /.test(l)).map((l) => l.replace(/^not ok \d+ - /, ''));
    const fallite = Number((/^# fail (\d+)/m.exec(out) || [])[1] || 0);
    return { ok: r.status === 0 && fallite === 0, rosse, fallite, status: r.status };
  } finally { rmSync(dati, { recursive: true, force: true }); }
}

if (SELFTEST) {
  const f = join(RAD, 'src/features/follower-giudizio.js');
  const prima = readFileSync(f, 'utf8');
  const da = '    ora,\n  });';
  if (prima.split(da).length !== 2) { console.log('Autoprova: il punto da rompere non si trova una volta sola.'); process.exit(1); }
  writeFileSync(f, prima.replace(da, '  });'));
  let r;
  try { r = prove(['test/unita/follower-giudizio.test.mjs']); } finally { writeFileSync(f, prima); }
  if (r.ok) { console.log('Autoprova ROSSA: coi due orologi nel giudizio dei follower le prove passano lo stesso.'); process.exit(1); }
  console.log(`Autoprova: coi due orologi rimessi, ${r.fallite} prova rossa a ${GIORNI} giorni da oggi. ✓`);
  process.exit(0);
}

const r = prove();
for (const x of r.rosse.slice(0, 20)) console.log(`  ✗ ${x}`);
console.log(r.ok ? `\nLe prove passano anche fra ${GIORNI} giorni. ✓` : `\ncollaudo ROSSO: ${r.fallite || 'alcune'} prove cambiano esito fra ${GIORNI} giorni (uscita ${r.status}).`);
process.exit(r.ok ? 0 : 1);
