// Kit di partenza: al primo ingresso, uno streamer trova SocialBot già con una
// personalità sensata, i giochi accesi e un paio di automazioni di benvenuto.
//
// PIENA LIBERTÀ: NON creiamo comandi "prestabiliti" (niente !social, !discord,
// !gioco… calati dall'alto). I comandi li crea lo streamer come vuole, partendo
// — se gli va — dai "modelli pronti" della dashboard (Saluto, Shoutout, Social,
// Timer…), che precompilano l'editor e sono totalmente modificabili. Restano
// solo automazioni NON-comando (benvenuto ai nuovi, promemoria follow), anch'esse
// modificabili/eliminabili.
//
// Si semina UNA SOLA VOLTA (flag settings.seeded) e NON sovrascrive mai ciò che
// lo streamer ha già impostato: i default riempiono solo i buchi.
import { streamers, modules } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('seed');

// Impostazioni di default sensate (attive da subito).
const SETTINGS_DEFAULT = {
  tono: 'scherzoso',
  spontaneita: 0.05,          // un po' vivace, non invadente
  rispostaMenzioni: true,
  proattivo: true,
  promoSocial: true,
  adattaCanale: true,
  giochi: true,
  nomeMonete: 'monete',
  clipAuto: true,
  clipAutoSoglia: 25,
};

// SOLO automazioni NON-comando (benvenuto, promemoria): niente comandi "!"
// prestabiliti. I comandi li crea lo streamer dai modelli pronti, come vuole.
const MODULI_DEFAULT = [
  {
    nome: 'Benvenuto ai nuovi', attivo: true,
    trigger: { tipo: 'evento', evento: 'first' },
    condizioni: { tier: 'tutti' },
    azioni: [{ tipo: 'messaggio', testo: 'Benvenutə in chat, $user! 👋 mettiti comodə 💜' }],
  },
  {
    nome: 'Promemoria follow', attivo: true,
    trigger: { tipo: 'timer', minuti: 20, minMessaggi: 8 },
    condizioni: {},
    azioni: [{ tipo: 'messaggio', testo: 'Ti stai divertendo? Lascia un follow al canale, ci fa piacere! 💜' }],
  },
];

// Semina i default per uno streamer (idempotente). Ritorna true se ha seminato.
export function seedStreamer(login) {
  try {
    const s = streamers.get(login);
    if (!s || s.settings?.seeded) return false;   // inesistente o già seminato

    // impostazioni: i default riempiono solo i buchi (ciò che c'è già vince)
    streamers.setSettings(login, { ...SETTINGS_DEFAULT, ...(s.settings || {}), seeded: true });

    // moduli di partenza SOLO se non ne ha ancora nessuno
    if (!modules.list(login).length) {
      for (const m of MODULI_DEFAULT) {
        try { modules.save(login, m); } catch (e) { log.warn('modulo default:', e?.message || e); }
      }
      log.info(`Kit di partenza creato per #${login} (${MODULI_DEFAULT.length} moduli)`);
    }
    return true;
  } catch (e) {
    log.warn('seedStreamer:', e?.message || e);
    return false;
  }
}
