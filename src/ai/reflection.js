// La "riflessione" di SocialBot: ogni tanto il cervello si ferma a
// consolidare quello che ha visto (statistiche → fatti e lezioni,
// pulizia della memoria). Primo giro dopo 10 minuti dall'avvio, poi
// ogni 6 ore, un canale alla volta per non stressare il DB.
import { makeLog } from '../logger.js';
import { streamers } from '../db.js';

const log = makeLog('reflection');

const PRIMO_GIRO = 10 * 60_000;          // 10 minuti dopo l'avvio
const OGNI = 6 * 60 * 60_000;            // poi ogni 6 ore

// SEEDING del "manuale umano": costruisce il set base (le emozioni) una pagina
// alla volta, in fretta all'inizio, poi da sé si azzittisce quando è completo.
const SEED_PRIMO = 3 * 60_000;           // 3 min dopo l'avvio: inizia a costruire il manuale
const SEED_OGNI = 25 * 60_000;           // poi una pagina ogni 25 min (finché il set base non è completo)

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

  // Seeding del manuale umano: una pagina per giro finché il set base è completo
  // (poi seminaProssimoModulo non fa più nulla, solo una lettura leggera).
  const semina = () => { brain.seminaProssimoModulo?.().catch(() => {}); };
  const seedPrimo = setTimeout(semina, SEED_PRIMO);
  const seedTimer = setInterval(semina, SEED_OGNI);

  return () => {
    clearTimeout(primo);
    clearInterval(periodico);
    clearTimeout(seedPrimo);
    clearInterval(seedTimer);
  };
}
