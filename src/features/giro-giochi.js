// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL GIRO DEI GIOCHI AUTOMATICI, IL MOTORE (docs/GIOCHI.md). Le regole e i
// conti stanno in giro-regole.js; qui si guarda il canale e si fa partire.
//
// Quando il giro scatta si mettono in fila le voci che possono partire adesso
// (peso, distanza, niente in corso, quello che il gioco chiede), se ne pesca
// una coi pesi, e si prova a farla partire. Se non parte (una manche senza
// domande da fare) esce dalla fila e si pesca di nuovo fra le altre: e' la
// stessa probabilita' di prima, condizionata a quelle che possono davvero.
//
// Le ultime partenze stanno nel database: un riavvio non fa arrivare il boss
// due volte nella stessa ora.
import { streamers, statoVivo } from '../db.js';
import { VOCI, voceDi, giroDi, pesca } from './giro-regole.js';
import { vivo } from './comandi-registro.js';
import * as games from './games.js';
import * as bossFeat from './boss.js';
import * as arenaFeat from './arena.js';
import * as catenaFeat from './catena.js';
import * as contaFeat from './conta.js';
import * as corsaFeat from './corsa.js';

const ULTIMI = 'giro-ultimi';

// C'e' gia' un gioco aperto: due giochi non si sovrappongono mai.
export const inCorso = (channel) => !!(games.chiLeggeLaChat(channel) || bossFeat.bossInCorso(channel)
  || arenaFeat.arenaInCorso(channel) || corsaFeat.corsaInCorso(channel));

// Quello che il gioco chiede per poter partire.
const RICHIESTE = {
  manche: () => true,
  boss: (ch) => vivo(ch, 'colpisci'),
  arena: (ch) => arenaFeat.giocabile(ch),
  catena: (ch) => vivo(ch, 'catena'),
  conta: (ch) => vivo(ch, 'conta'),
  corsa: (ch) => vivo(ch, 'corsa'),
};
const AVVIA = {
  manche: (ch, say, id) => !!games.avviaManche(ch, say, id),
  boss: (ch, say) => bossFeat.arriva(ch, say) === true,
  arena: (ch, say) => !!arenaFeat.apri(ch, say),
  catena: (ch, say) => catenaFeat.apri(ch, say) === true,
  conta: (ch, say) => contaFeat.apri(ch, say) === true,
  corsa: (ch, say) => corsaFeat.apri(ch, say) === true,
};

export const ultimi = (channel) => {
  const u = statoVivo.leggi(channel, ULTIMI);
  return u && typeof u === 'object' ? u : {};
};

// Le voci che possono partire adesso, coi loro pesi.
export function candidati(channel, g, { live, ora = Date.now() } = {}) {
  if (inCorso(channel)) return [];
  const u = ultimi(channel);
  return VOCI.filter((v) => {
    const s = g.voci[v.id];
    if (!(s.peso > 0)) return false;
    if (s.distanza > 0 && Number(u[v.id]) > 0 && ora - Number(u[v.id]) < s.distanza * 60_000) return false;
    if (v.soloLive && !live) return false;
    return RICHIESTE[v.gioco](channel);
  }).map((v) => ({ id: v.id, peso: g.voci[v.id].peso }));
}

// UN GIOCO SCELTO, fatto partire da un Modulo (l'azione «Avvia un gioco»): una
// voce del giro (un tipo di manche, il boss, l'arena...) o «caso», uno a caso
// fra quelli che possono partire adesso. Le stesse regole del giro: i giochi
// spenti nel canale non partono, uno gia' aperto non si interrompe, quello che
// vive nell'overlay vuole la diretta. Torna { ok, id } o { ok:false, motivo }.
export function avviaVoce(channel, voce, { live = false, dire, ora = Date.now(), caso = Math.random } = {}) {
  const ch = String(channel || '').toLowerCase();
  if (streamers.get(ch)?.settings?.giochi === false) return { ok: false, motivo: 'spenti' };
  if (inCorso(ch)) return { ok: false, motivo: 'inCorso' };
  const puo = (v) => v && (!v.soloLive || live) && RICHIESTE[v.gioco](ch);
  let fila;
  if (voce === 'caso') fila = VOCI.filter(puo);
  else {
    const v = voceDi(voce);
    if (!v) return { ok: false, motivo: 'sconosciuto' };
    if (!puo(v)) return { ok: false, motivo: v.soloLive && !live ? 'live' : 'nonPuo' };
    fila = [v];
  }
  while (fila.length) {
    const v = fila[Math.min(fila.length - 1, Math.floor(caso() * fila.length))];
    if (AVVIA[v.gioco](ch, dire, v.id)) {
      const tutte = Object.fromEntries(Object.entries(ultimi(ch)).filter(([k]) => voceDi(k)));
      statoVivo.scrivi(ch, ULTIMI, { ...tutte, [v.id]: ora });
      return { ok: true, id: v.id };
    }
    fila = fila.filter((x) => x.id !== v.id);
  }
  return { ok: false, motivo: 'nonPuo' };
}

// Il giro scatta: sceglie e fa partire un gioco. `dire(gioco)` da' la funzione
// che parla per quel gioco. Torna l'id partito, o null se non e' partito niente.
export function scatta(channel, { live = false, dire, ora = Date.now(), caso = Math.random } = {}) {
  const g = giroDi(streamers.get(channel)?.settings);
  let fila = candidati(channel, g, { live, ora });
  while (fila.length) {
    const id = pesca(fila, caso());
    const v = voceDi(id);
    if (AVVIA[v.gioco](channel, dire(v.gioco), id)) {
      const tutte = Object.fromEntries(Object.entries(ultimi(channel)).filter(([k]) => voceDi(k)));
      statoVivo.scrivi(channel, ULTIMI, { ...tutte, [id]: ora });
      return id;
    }
    fila = fila.filter((c) => c.id !== id);
  }
  return null;
}
