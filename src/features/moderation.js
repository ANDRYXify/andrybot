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
