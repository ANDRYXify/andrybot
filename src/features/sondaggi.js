// Sondaggi (Polls) e Predizioni (Predictions) di Twitch, gestiti dalla chat dai
// mod/streamer. Usano l'API Helix col token del broadcaster (scope
// channel:manage:polls / channel:manage:predictions). Fanno parte dell'add-on
// "Effetti & Punti canale": se il piano non lo include, i comandi sono inerti.
//
// Comandi (mod/streamer):
//   !sondaggio Domanda | opzione 1 | opzione 2 [| …]   apre un sondaggio (2 min)
//   !sondaggio chiudi                                  chiude il sondaggio attivo
//   !predizione Titolo | esito 1 | esito 2 [| …]       apre una predizione (2 min)
//   !predizione vince <esito|numero>                   risolve sull'esito scelto
//   !predizione annulla                                annulla e rimborsa i punti
import { canaleHa } from './accesso.js';
import { makeLog } from '../logger.js';

const log = makeLog('sondaggi');

const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);
const taglia = (s) => String(s || '').trim();

// Ritorna true se il messaggio era un comando di sondaggio/predizione (gestito).
export async function trySondaggio(helix, msg, say) {
  try {
    if (!msg) return false;
    const testo = taglia(msg.text);
    if (!testo.startsWith('!')) return false;
    const sp = testo.indexOf(' ');
    const cmd = (sp < 0 ? testo.slice(1) : testo.slice(1, sp)).toLowerCase();
    if (!['sondaggio', 'poll', 'predizione', 'prediction', 'pronostico'].includes(cmd)) return false;
    if (!puoGestire(msg)) return true;                       // solo mod/streamer
    const channel = msg.channel;
    if (!canaleHa(channel, 'effetti')) return true;          // richiede l'add-on Effetti & Punti canale
    const resto = sp < 0 ? '' : taglia(testo.slice(sp + 1));
    const primo = (resto.split(/\s+/)[0] || '').toLowerCase();
    const err403 = (cosa, scope) => say(`⚠️ Per ${cosa} concedi al bot il permesso "${scope}" da /auth/permessi, poi riprova.`);

    // ── SONDAGGI ──────────────────────────────────────────────────────────
    if (cmd === 'sondaggio' || cmd === 'poll') {
      if (['chiudi', 'stop', 'fine', 'termina'].includes(primo)) {
        const att = await helix.sondaggioAttivo(channel).catch(() => null);
        if (!att) { say('📊 Nessun sondaggio attivo.'); return true; }
        await helix.chiudiSondaggio(channel, att.id).catch(() => {});
        say('📊 Sondaggio chiuso — ecco i risultati!');
        return true;
      }
      const parti = resto.split('|').map(taglia).filter(Boolean);
      const titolo = parti.shift();
      if (!titolo || parti.length < 2) { say('📊 Uso: !sondaggio Domanda | opzione 1 | opzione 2 [| …]'); return true; }
      try {
        const p = await helix.creaSondaggio(channel, { titolo, opzioni: parti, durata: 120 });
        say(p ? `📊 Sondaggio aperto: "${p.titolo}" — votate su Twitch! (2 min)` : '📊 Sondaggio non creato (sei in diretta?).');
      } catch (e) {
        if (e.status === 401 || e.status === 403) err403('creare sondaggi', 'channel:manage:polls');
        else if (e.status === 400) say('📊 Twitch ha rifiutato il sondaggio (ne hai già uno attivo?).');
        else say('📊 Errore nel creare il sondaggio.');
      }
      return true;
    }

    // ── PREDIZIONI ────────────────────────────────────────────────────────
    if (['annulla', 'cancella', 'rimborsa'].includes(primo)) {
      const att = await helix.predizioneAttiva(channel).catch(() => null);
      if (!att) { say('🔮 Nessuna predizione attiva.'); return true; }
      await helix.risolviPredizione(channel, att.id, null).catch(() => {});
      say('🔮 Predizione annullata: punti rimborsati.');
      return true;
    }
    if (['vince', 'risolvi', 'esito', 'win'].includes(primo)) {
      const scelto = taglia(resto.slice(primo.length));
      const att = await helix.predizioneAttiva(channel).catch(() => null);
      if (!att) { say('🔮 Nessuna predizione da risolvere.'); return true; }
      let win = null;
      if (/^\d+$/.test(scelto)) win = att.esiti[parseInt(scelto, 10) - 1];
      if (!win && scelto) win = att.esiti.find((o) => o.titolo.toLowerCase() === scelto.toLowerCase())
        || att.esiti.find((o) => o.titolo.toLowerCase().startsWith(scelto.toLowerCase()));
      if (!win) { say(`🔮 Esito non trovato. Esiti: ${att.esiti.map((o, i) => `${i + 1}) ${o.titolo}`).join(' · ')}`); return true; }
      await helix.risolviPredizione(channel, att.id, win.id).catch(() => {});
      say(`🔮 Predizione risolta: ha vinto "${win.titolo}"! 🎉`);
      return true;
    }
    const parti = resto.split('|').map(taglia).filter(Boolean);
    const titolo = parti.shift();
    if (!titolo || parti.length < 2) { say('🔮 Uso: !predizione Titolo | esito 1 | esito 2 [| …] · poi !predizione vince <esito>'); return true; }
    try {
      const p = await helix.creaPredizione(channel, { titolo, esiti: parti, finestra: 120 });
      say(p ? `🔮 Predizione aperta: "${p.titolo}" — puntate i punti canale! Esiti: ${p.esiti.map((o, i) => `${i + 1}) ${o.titolo}`).join(' · ')} (2 min)` : '🔮 Predizione non creata.');
    } catch (e) {
      if (e.status === 401 || e.status === 403) err403('creare predizioni', 'channel:manage:predictions');
      else if (e.status === 400) say('🔮 Twitch ha rifiutato la predizione (ne hai già una attiva?).');
      else say('🔮 Errore nel creare la predizione.');
    }
    return true;
  } catch (e) {
    log.error('trySondaggio:', e?.message || e);
    return false;
  }
}
