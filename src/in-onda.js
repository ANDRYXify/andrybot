// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI E' IN ONDA, DETTO FUORI DAL PROCESSO (data/.in-onda), E IL RIAVVIO CHE
// SI ANNUNCIA (data/.riavvio). Vedi docs/AGGIORNARE.md.
//
// server/aggiorna.sh riavvia il bot solo quando nessuno e' in diretta. «In
// diretta» lo sanno due parti diverse dello stesso processo: il bot (Twitch,
// Kick, YouTube: dirette che passano da OBS, e un riavvio ferma per qualche
// secondo chat, avvisi e overlay) e il tramite dello Studio (dirette che
// passano DAL server: un riavvio le taglierebbe). Prima il file lo scriveva
// solo il bot, e una diretta dallo Studio verso una destinazione RTMP propria
// non c'era mai: aggiorna.sh la tagliava.
//
// Il file e' l'UNIONE di tutte le fonti, e si riscrive nello stesso giro in
// cui una fonte cambia: chi parte in diretta e' nel file prima che la sua
// richiesta abbia una risposta. E' questa la proprieta' su cui aggiorna.sh
// chiude la sua finestra (vedi `riavvioImminente`).
import { writeFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { log } from './logger.js';

// Il segnale vale per poco: un aggiorna.sh morto a meta' (corrente, ssh
// caduto) non deve impedire le dirette per sempre.
export const RIAVVIO_VALE_MS = 3 * 60_000;

export function creaInOnda({ dataDir, ora = () => Date.now(), log = null } = {}) {
  const fonti = new Map();   // nome → () => Iterable<login>
  const ascolta = new Set();
  let ultimi = new Set();
  const file = join(dataDir, '.in-onda');
  const segnale = join(dataDir, '.riavvio');

  const canali = () => {
    const tutti = new Set();
    for (const [nome, leggi] of fonti) {
      try { for (const c of leggi() || []) if (c) tutti.add(String(c).toLowerCase()); } catch (e) { log?.debug?.(`in onda (${nome}): ${e?.message || e}`); }
    }
    return tutti;
  };

  // Si scrive accanto e poi si rinomina: chi legge non trova mai meta' file.
  function scrivi() {
    const adesso = canali();
    try {
      writeFileSync(file + '.tmp', JSON.stringify({ canali: [...adesso].sort(), ts: ora() }));
      renameSync(file + '.tmp', file);
    } catch (e) { log?.debug?.('in onda: ' + (e?.message || e)); }
    const cambiati = [...new Set([...adesso, ...ultimi])].filter((c) => adesso.has(c) !== ultimi.has(c));
    ultimi = adesso;
    if (cambiati.length) for (const f of ascolta) { try { f(cambiati); } catch { /* chi ascolta non ferma chi scrive */ } }
  }

  return {
    // Una fonte si dichiara una volta; poi chiama `cambiato()` a ogni suo cambio.
    fonte(nome, leggi) { fonti.set(nome, leggi); scrivi(); },
    cambiato: scrivi,
    canali: () => [...canali()].sort(),
    inOnda: (login) => canali().has(String(login || '').toLowerCase()),
    suCambio(f) { ascolta.add(f); return () => ascolta.delete(f); },
    // aggiorna.sh scrive il segnale, POI rilegge il file. Da quel momento una
    // diretta nuova dallo Studio non parte (la pagina riprova da sola): quelle
    // partite prima sono gia' nel file, e aggiorna.sh le aspetta.
    riavvioImminente() {
      try { return ora() - statSync(segnale).mtimeMs < RIAVVIO_VALE_MS; } catch { return false; }
    },
    // Il processo nuovo: il riavvio annunciato e' questo, il segnale ha finito.
    dimenticaRiavvio() { try { unlinkSync(segnale); } catch { /* non c'era */ } },
  };
}

// Quello del processo: una lista sola, a cui si dichiarano il bot e lo Studio.
// Nasce al primo uso, non all'import: la cartella dei dati la sceglie chi
// avvia (un collaudo se ne prende una usa e getta prima di toccarla).
let _questo = null;
const questo = () => (_questo ||= creaInOnda({ dataDir: config.dataDir, log }));
export const inOnda = {
  fonte: (nome, leggi) => questo().fonte(nome, leggi),
  cambiato: () => questo().cambiato(),
  canali: () => questo().canali(),
  inOnda: (login) => questo().inOnda(login),
  suCambio: (f) => questo().suCambio(f),
  riavvioImminente: () => questo().riavvioImminente(),
  dimenticaRiavvio: () => questo().dimenticaRiavvio(),
};
