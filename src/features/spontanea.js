// QUANDO IL BOT PARLA DA SOLO. Non Lia: il bot del canale, che ogni tanto dice
// una cosa senza che nessuno l'abbia chiamato — un promemoria dei link dello
// streamer, una battuta, una cosa sua sul discorso in corso.
//
// La decisione stava dentro al battito, sparsa in quattro condizioni e due dadi,
// e mancavano due cose che si vedono da fuori: un tetto a quanto spesso (poteva
// parlare a due giri di fila, cioe' a tre minuti di distanza) e un tetto al
// promemoria dei link (lo stesso indirizzo, nessun riposo: la cosa piu' da bot
// che un bot possa fare). Qui la decisione e' una funzione sola, senza dadi
// dentro — il caso arriva da fuori — cosi' si prova.
export const DOSE_MAX = 0.5;                 // il cursore arriva a 50%: di proposito
export const SPONTANEA_MIN_MS = 6 * 60_000;  // mai due volte in sei minuti (due giri del battito)
export const PROMO_MIN_MS = 45 * 60_000;     // il promemoria dei link, al piu' ogni tre quarti d'ora
export const REGISTRO_MAX = 30;              // quante voci si tengono per canale

// Ritorna { parla: false, perche } oppure { parla: true, tipo: 'promo' | 'altro' }.
//   dose        il cursore «chat autonoma» (0..0.5)
//   ritmo       messaggi al minuto in chat, i suoi esclusi
//   live        se lo streamer e' in diretta adesso
//   soloLive    la spunta «solo mentre sono in diretta»
//   ultimaSpontanea / ultimaPromo   quando ha parlato da solo / fatto promo l'ultima volta
//   promoAccesa la spunta della promo social
//   caso        { parla, promo } due numeri in [0,1): il caso, passato da fuori
export function decidiSpontanea({ ora, dose, ritmo, live, soloLive, ultimaSpontanea = 0, ultimaPromo = 0, promoAccesa = true, caso }) {
  const auto = Math.min(DOSE_MAX, Math.max(0, Number(dose) || 0));
  if (auto <= 0) return { parla: false, perche: 'dose a zero' };
  if (soloLive && live !== true) return { parla: false, perche: 'non in diretta' };
  if ((Number(ritmo) || 0) < 1) return { parla: false, perche: 'chat ferma' };
  if (ora - (Number(ultimaSpontanea) || 0) < SPONTANEA_MIN_MS) return { parla: false, perche: 'ha appena parlato da solo' };
  if (!(Number(caso?.parla) < auto * 0.4)) return { parla: false, perche: 'non stavolta' };
  const promo = promoAccesa !== false && ora - (Number(ultimaPromo) || 0) >= PROMO_MIN_MS && Number(caso?.promo) < 0.45;
  return { parla: true, tipo: promo ? 'promo' : 'altro' };
}

// Il registro di cosa ha detto da solo: una lista corta per canale, in memoria.
// E' di seduta — da quando il bot e' acceso — e il pannello lo dice.
export function registra(mappa, login, voce, max = REGISTRO_MAX) {
  const l = String(login || '').toLowerCase();
  const lista = mappa.get(l) || [];
  lista.push({ ts: Number(voce.ts) || Date.now(), tipo: String(voce.tipo || 'altro'), testo: String(voce.testo || '').slice(0, 300) });
  while (lista.length > max) lista.shift();
  mappa.set(l, lista);
  return lista.length;
}

export function elenco(mappa, login) {
  return (mappa.get(String(login || '').toLowerCase()) || []).map((v) => ({ ...v })).reverse();
}
