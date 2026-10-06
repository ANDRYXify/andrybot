// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// COSA SUONA, PER IL PLAYER DELL'OVERLAY (docs/OVERLAY.md, «Il player non si
// blocca»). La chiede l'overlay ogni pochi secondi; qui si decide quando
// chiederla a Spotify e cosa rispondere. Quattro regole:
//
//  · QUELLO CHE SI RISPONDE VALE PER ADESSO. Una lettura dice a che punto era la
//    canzone quando e' stata letta: rimandata uguale (dalla cache, o come
//    ultima lettura buona quando Spotify non risponde) riportava indietro la
//    barra, e dopo la fine vera faceva ripartire sullo schermo la canzone
//    vecchia. Un brano che suona va avanti col tempo, fino alla sua durata.
//  · UNA LETTURA ALLA VOLTA. Dieci sorgenti OBS che chiedono insieme fanno una
//    chiamata sola: si aspetta quella in corso invece di partirne un'altra.
//  · UNA CANZONE FINITA NON SI RIPETE. La cache vale quattro secondi, ma non oltre
//    la fine del brano che dice: a canzone finita si chiede subito la prossima.
//  · IL BATTITO NON RITARDA IL BRANO. Le onde a tempo sono un dettaglio: si
//    aspetta il battito un attimo, poi si risponde senza, e arrivera' dopo.
//
// `spotify` ha collegato(login), oraSuona(login), battito(login, id).
export const CACHE_MS = 4000;
export const MEMORIA_MS = 60_000;
export const BATTITO_MS = 400;
export const RILETTURA_MS = 1000;

// La lettura detta ADESSO: un brano che suona e' andato avanti da quando e'
// stato letto, e non oltre la sua fine.
export function adesso(dati, ts, ora) {
  if (!dati?.suona || !Number(dati.durata)) return dati;
  return { ...dati, ms: Math.min(Number(dati.durata), (Number(dati.ms) || 0) + Math.max(0, ora - ts)) };
}

const finito = (dati, ts, ora) => !!(dati?.suona && Number(dati.durata) && (Number(dati.ms) || 0) + (ora - ts) >= Number(dati.durata));

export function lettore({ spotify, orologio = () => Date.now(), attesa = (ms) => new Promise((r) => { const t = setTimeout(r, ms); t.unref?.(); }) } = {}) {
  const cache = new Map();    // login → { ts, dati }
  const ultima = new Map();   // login → { ts, dati }  l'ultima lettura CERTA
  const inVolo = new Map();   // login → Promise della lettura in corso

  async function leggi(login) {
    let dati = { stato: 'niente', suona: false };
    try {
      if (spotify.collegato(login)) {
        dati = await spotify.oraSuona(login);
        if (dati?.id) {
          const b = await Promise.race([
            Promise.resolve(spotify.battito(login, dati.id)).catch(() => null),
            attesa(BATTITO_MS).then(() => null),
          ]);
          if (b) dati = { ...dati, bpm: b.bpm, energia: b.energia };
        }
      }
    } catch { dati = { stato: 'ignoto', suona: false }; }
    const ts = orologio();
    // Quando non lo sappiamo si risponde con l'ultima cosa certa, se e'
    // fresca, portata ad adesso: un intoppo di un attimo non deve spegnere un
    // player che sta suonando, e nemmeno riportarlo indietro.
    if (dati?.stato === 'ignoto') {
      const u = ultima.get(login);
      if (u && ts - u.ts < MEMORIA_MS) dati = adesso(u.dati, u.ts, ts);
    } else {
      ultima.set(login, { ts, dati });
    }
    cache.set(login, { ts, dati });
    return { ts, dati };
  }

  return {
    async musica(login) {
      const ora = orologio();
      const c = cache.get(login);
      if (c && ora - c.ts < CACHE_MS && !(finito(c.dati, c.ts, ora) && ora - c.ts >= RILETTURA_MS)) return adesso(c.dati, c.ts, ora);
      let p = inVolo.get(login);
      if (!p) {
        p = leggi(login).finally(() => inVolo.delete(login));
        inVolo.set(login, p);
      }
      const r = await p;
      return adesso(r.dati, r.ts, orologio());
    },
  };
}
