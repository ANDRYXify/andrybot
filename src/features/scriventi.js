// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI HA SCRITTO, PIATTAFORMA PER PIATTAFORMA (docs/PIATTAFORME.md, «Ore
// guardate, presenze e monete su Kick»). Su Twitch chi e' in chat lo dice
// Twitch, anche chi sta zitto (getChatters). Kick un elenco cosi' non lo da':
// li' e' presente chi scrive.
//
// Un messaggio tiene presente per DUE giri delle ore: quello in cui cade e il
// successivo, cosi' chi scrive ogni tanto non sparisce a ogni giro, e un solo
// messaggio basta alla presenza della diretta (presenze.js, due giri di fila).
// Due giri contati sui giri veri, non su un orologio: ogni giro ricorda quando
// e' passato, e chiede chi ha scritto dopo il penultimo. Un giro che arriva in
// ritardo non toglie e non aggiunge niente.
//
// Non contano lo streamer (chi trasmette non guarda la sua diretta) e il bot.
// I bot noti li toglie chi conta (ePersona, in ore, presenze ed economia): la
// regola sta in un posto solo. Il registro vive in memoria come quello di chi
// e' in chat (games.js, segnaPresenza): un riavvio lo svuota, e al piu' si perde
// un giro, finche' qualcuno non riscrive.
export const GIRI = 2;
export const PASSO_MS = 5 * 60_000;           // il passo del giro delle ore (bot.js)
const TAGLIA = 3000;

// canale → piattaforma → { scritti: utente → ultima volta, giri: [quando] }
const registro = new Map();
const norm = (x) => String(x || '').trim().toLowerCase();

function voce(ch, p) {
  let perCanale = registro.get(ch);
  if (!perCanale) { perCanale = new Map(); registro.set(ch, perCanale); }
  let v = perCanale.get(p);
  if (!v) { v = { scritti: new Map(), giri: [] }; perCanale.set(p, v); }
  return v;
}

export function segna(msg, { ora = Date.now() } = {}) {
  const ch = norm(msg?.channel);
  const u = norm(msg?.user);
  if (!ch || !u || u.startsWith('[') || msg.isBroadcaster || msg.isSelf) return false;
  const v = voce(ch, norm(msg.piattaforma) || 'twitch');
  v.scritti.set(u, ora);
  if (v.scritti.size > TAGLIA) {
    // prima di questo non lo chiede piu' nessun giro
    const limite = Math.min(v.giri[0] ?? ora, ora) - GIRI * PASSO_MS;
    for (const [k, t] of v.scritti) if (t <= limite) v.scritti.delete(k);
  }
  return true;
}

// UN GIRO: chi ha scritto dopo il penultimo giro (al primo giro, o dopo un
// buco, negli ultimi due passi), in ordine di nome. Il giro si ricorda: lo
// chiama il giro delle ore, una volta per canale e piattaforma.
export function giro(channel, piattaforma, { ora = Date.now() } = {}) {
  const ch = norm(channel);
  const p = norm(piattaforma);
  if (!ch || !p) return [];
  const v = voce(ch, p);
  // giri interrotti (il canale era fuori onda): si ricomincia, e quello che e'
  // stato scritto prima non conta per questa diretta
  const g = v.giri.length && ora - v.giri[v.giri.length - 1] > GIRI * PASSO_MS ? [] : v.giri;
  const da = g.length >= GIRI ? g[g.length - GIRI] : (g[0] ?? ora) - (GIRI - g.length) * PASSO_MS;
  v.giri = [...g, ora].slice(-GIRI);
  return [...v.scritti].filter(([, t]) => t > da && t <= ora).map(([u]) => u).sort();
}

// LA LISTA DEL GIRO: chi c'e' su ogni piattaforma, unito per nome (la chiave
// dell'economia del canale e' il nome, minuscolo). Chi sta su Twitch e su Kick
// con lo stesso nome e' una persona sola e conta una volta.
export function unisci(...liste) {
  const visti = new Set();
  for (const l of liste) for (const x of l || []) { const u = norm(x); if (u) visti.add(u); }
  return [...visti];
}

// Per i collaudi.
export function _svuota() { registro.clear(); }
