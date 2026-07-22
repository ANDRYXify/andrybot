// La "riflessione" di SocialBot: ogni tanto il cervello si ferma a
// consolidare quello che ha visto (statistiche → fatti e lezioni,
// pulizia della memoria). Primo giro dopo 10 minuti dall'avvio, poi
// ogni 6 ore, un canale alla volta per non stressare il DB.
import { makeLog } from '../logger.js';
import { streamers } from '../db.js';

const log = makeLog('reflection');

const PRIMO_GIRO = 10 * 60_000;          // 10 minuti dopo l'avvio
const OGNI = 6 * 60 * 60_000;            // poi ogni 6 ore

// Avvia i timer di riflessione. Ritorna una funzione che li ferma.
export function scheduleReflection({ brain }) {
  let inCorso = false;   // evita giri sovrapposti se uno dura tanto

  const giro = async () => {
    if (inCorso) return;
    inCorso = true;
    try {
      const attivi = streamers.active();
      log.debug(`riflessione su ${attivi.length} canali`);
      for (const s of attivi) {
        try {
          await brain.reflect(s.login);
        } catch (e) {
          log.error(`riflessione #${s.login}:`, e?.message || e);
        }
      }
    } finally {
      inCorso = false;
    }
  };

  const primo = setTimeout(() => { giro().catch(() => {}); }, PRIMO_GIRO);
  const periodico = setInterval(() => { giro().catch(() => {}); }, OGNI);

  return () => {
    clearTimeout(primo);
    clearInterval(periodico);
  };
}
