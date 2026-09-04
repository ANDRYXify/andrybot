// Moderazione dei messaggi: controlli semplici e veloci, senza regex
// complesse. Le regole arrivano dalle impostazioni dello streamer
// (dashboard): per ora l'unica regola è la lista di parole vietate.

/**
 * Controlla un messaggio contro le impostazioni del canale.
 * @param {string} text testo del messaggio da valutare
 * @param {object} settings impostazioni dello streamer
 *   (settings.paroleVietate: array di stringhe, default [])
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function checkMessage(text, settings = {}) {
  const vietate = Array.isArray(settings?.paroleVietate) ? settings.paroleVietate : [];
  if (!vietate.length) return { ok: true };

  const testo = String(text || '').toLowerCase();
  for (const parola of vietate) {
    const p = String(parola || '').trim().toLowerCase();
    // confronto come sottostringa, case-insensitive: copre sia la parola
    // isolata sia i tentativi di "incollarla" ad altro testo
    if (p && testo.includes(p)) return { ok: false, reason: 'parola vietata: ' + p };
  }
  return { ok: true };
}

// ------------------------------------------------------- risposte del bot

// Accenti via, minuscolo: «Nàpoli» e «napoli» sono la stessa cosa per chi
// legge, e devono esserlo anche per il confronto.
const SEGNI = /[\u0300-\u036f]/g;
const piatto = (s) => String(s || '').normalize('NFD').replace(SEGNI, '').toLowerCase();

/**
 * Controlla una risposta che sta per dire IL BOT. Piu' severo di checkMessage:
 * oltre alle parole vietate del canale, blocca le parole che lo streamer ha
 * indicato come da non far mai uscire (il cognome, la citta', il nome della
 * scuola). Quelle non moderano nessuno: un utente che scrive il cognome dello
 * streamer non ha fatto niente di male. Per questo stanno in una funzione a
 * parte, che usa solo chi manda in chat le parole del bot.
 *
 * Il motivo del blocco NON contiene la parola: finisce nei log.
 *
 * @param {string} text la risposta che il bot vorrebbe mandare
 * @param {object} settings impostazioni dello streamer (settings.maiDire)
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function checkRisposta(text, settings = {}) {
  const base = checkMessage(text, settings);
  if (!base.ok) return base;

  const mai = Array.isArray(settings?.maiDire) ? settings.maiDire : [];
  if (!mai.length) return { ok: true };

  const testo = piatto(text);
  for (const parola of mai) {
    const p = piatto(parola).trim();
    // sottostringa, come per le parole vietate: attaccarla ad altro testo non
    // la rende meno detta.
    if (p && testo.includes(p)) return { ok: false, reason: 'parola che non deve uscire' };
  }
  return { ok: true };
}
