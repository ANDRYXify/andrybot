// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE ATTESE UGUALI PER TUTTI I GIOCHI (docs/GIOCHI.md). Qui solo conti: niente
// database, niente chat. Le usano il catalogo (valoriDi, quindi il bot, la resa
// e i castighi) e il pannello, che riceve questo file (/js/regole-comuni.js):
// la stessa funzione, non una copia.
//
// Le cose che tutti i giochi hanno sono quattro: quanto aspetta chi ha
// giocato, quanto aspetta tutto il canale, quanto in piu' aspetta chi insiste,
// e dopo quante insistenze e' fuori fino a fine diretta. La regola per tutti
// le puo' decidere una per una: quella lasciata vuota (null) resta gioco per
// gioco. E ogni gioco puo' fare a modo suo (`suo`), oppure non seguirla mai per
// natura (`segue: false`: i colpi al boss, che sono a raffica, e quello che non
// e' un gioco, come gli abbracci o lo sblocco della chat).

export const COMUNI = Object.freeze(['attesaTesta', 'attesaTutti', 'insisti', 'insistiMax']);
export const LIMITI = Object.freeze({ attesaTesta: [0, 86400], attesaTutti: [0, 86400], insisti: [0, 3600], insistiMax: [0, 20] });

const numero = (v, [lo, hi]) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};

// La regola per tutti, ripulita: accesa o spenta, e per ognuna delle quattro
// un numero nei suoi limiti, oppure null (ogni gioco la sua).
export function normalizzaTutti(t = {}) {
  const q = t && typeof t === 'object' ? t : {};
  return { attivo: q.attivo === true, ...Object.fromEntries(COMUNI.map((k) => [k, numero(q[k], LIMITI[k])])) };
}

// La regola per tutti dice davvero qualcosa: accesa, e con almeno un numero.
export const conta = (t) => {
  const n = normalizzaTutti(t);
  return n.attivo && COMUNI.some((k) => n[k] !== null);
};

// I valori veri di un gioco: i suoi, e sopra quelli per tutti quando la regola
// e' accesa, il gioco la segue e non fa a modo suo. Una cosa che il gioco non
// ha (il boss non ha l'insistenza) resta fuori.
export function effettivi(propri, tutti, { segue = true, suo = false } = {}) {
  const out = { ...propri };
  const t = normalizzaTutti(tutti);
  if (!t.attivo || !segue || suo) return out;
  for (const k of COMUNI) if (t[k] !== null && k in out) out[k] = t[k];
  return out;
}
