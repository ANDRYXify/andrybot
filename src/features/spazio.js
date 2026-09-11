// Quanto spazio occupa un canale sul disco, e quanto puo' occuparne.
//
// Ogni caricamento passa per un limite di GRANDEZZA del singolo file, ma nessuno
// contava QUANTI file. Un account abilitato poteva caricare all'infinito, e il
// disco e' uno solo per tutti: quando finisce, finisce per tutti — il database
// non scrive piu', le copie di sicurezza falliscono, e il sintomo arriva a chi
// non ha fatto niente. Il tetto e' per canale, generoso, e si dice prima di
// rifiutare: chi lo raggiunge sa cosa fare (togliere qualcosa), non si trova
// un «errore interno».
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function spazioCartella(dir) {
  let totale = 0;
  let voci = [];
  try { voci = readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const v of voci) {
    if (!v.isFile()) continue;
    try { totale += statSync(join(dir, v.name)).size; } catch { /* sparito nel frattempo */ }
  }
  return totale;
}

export function inMega(byte) { return Math.round((byte / (1024 * 1024)) * 10) / 10; }
