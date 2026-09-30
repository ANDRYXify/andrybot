// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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

// Impostazioni di default sensate (attive da subito). Sono i valori «di base»
// che i manuali raccontano.
export const SETTINGS_DEFAULT = {
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

// UN MODULO DEL KIT LASCIATO COM'ERA. Chi conta «i comandi tuoi» (l'avviso
// «Non hai ancora un comando tuo») non deve contare quello che il kit ha messo
// da se': lo streamer non l'ha fatto. Si confronta quello che conta in un
// modulo: nome, innesco, condizioni, azioni, ramo del «no» e Telegram. Acceso
// o spento non conta: spegnerlo non lo fa diventare suo. Basta cambiare una
// parola, e il modulo e' suo.
const _ordinato = (x) => (Array.isArray(x) ? x.map(_ordinato)
  : (x && typeof x === 'object') ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, _ordinato(x[k])])) : x);
const _impronta = (m) => JSON.stringify(_ordinato({
  nome: String(m?.nome || ''), trigger: m?.trigger || {}, condizioni: m?.condizioni || {},
  azioni: Array.isArray(m?.azioni) ? m.azioni : [], altrimenti: Array.isArray(m?.altrimenti) ? m.altrimenti : [],
  telegram: m?.telegram === true,
}));
const _KIT = new Set(MODULI_DEFAULT.map(_impronta));
export function eDelKit(m) { return !!m && _KIT.has(_impronta(m)); }

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
