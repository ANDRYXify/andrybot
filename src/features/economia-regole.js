// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE REGOLE DELL'ECONOMIA, SENZA STATO (docs/ECONOMIA.md).
//
// Qui ci sono solo conti: niente database, niente rete. Le usa la porta
// (economia.js) per dare le monete, il server per ripulire quello che il
// pannello salva, e il pannello stesso, che riceve questo file
// (/js/economia-regole.js, economia-servita.js) e ci fa i conti di una diretta
// con le regole che si stanno scegliendo: le stesse funzioni, non una copia.

const norm = (s) => String(s || '').toLowerCase().trim().replace(/^@/, '');

export const GIRO_MS = 5 * 60_000;
export const GIRO_MIN = GIRO_MS / 60_000;
// In diretta vuol dire: l'ultimo giro di presenza e' di meno di undici minuti
// fa. Due giri saltati sono un canale spento, non un ritardo.
export const VIVO_MS = 2 * GIRO_MS + 60_000;
// Il silenzio si conta di giro in giro: un giro che arriva oltre questo tempo
// dal precedente vuol dire che in mezzo la persona non c'era, e si riparte.
export const STESSO_FILO_MS = Math.round(GIRO_MS * 1.5);

// Uguali a quelli di sempre, e tutto il nuovo spento: un canale che non tocca
// niente non cambia (tranne i bot, che non ricevono piu').
export const DEFAULT = Object.freeze({
  perMessaggio: 2, ogniSecondi: 60, topN: 5,
  perPresenza: 5, perAttivita: 5, moltSub: 1.5, moltVip: 1.25,
  lurkPasso: 0.15, lurkMinimo: 0.35,
  auto: true, msgSpento: true, esclusi: Object.freeze([]),
  noComandi: false, noRipetuti: false, minLettere: 0,
  pienoMin: 0, stopMin: 0,
  tettoDiretta: 0, saldoMax: 0,
});
export const ESCLUSI_MAX = 200;
export const DOPPIO = Object.freeze({ min: 5, max: 240, xMin: 1.5, xMax: 5 });

const intero = (v, def, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const frazione = (v, def, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const si = (v, def) => (v === undefined || v === null || v === '' ? def : v === true || v === 'true' || v === 1 || v === '1' || v === 'on');

// Le regole di un canale, ripulite. La usano il bot, il server quando salva e
// il pannello quando fa i conti.
export function normalizza(p = {}) {
  const q = p && typeof p === 'object' ? p : {};
  const grezzi = Array.isArray(q.esclusi) ? q.esclusi : String(q.esclusi || '').split(/[\s,;]+/);
  const esclusi = [...new Set(grezzi.map(norm).filter((u) => /^[a-z0-9_]{1,25}$/.test(u)))].slice(0, ESCLUSI_MAX);
  return {
    perMessaggio: intero(q.perMessaggio, DEFAULT.perMessaggio, 0, 1000),
    ogniSecondi: intero(q.ogniSecondi, DEFAULT.ogniSecondi, 5, 3600),
    topN: intero(q.topN, DEFAULT.topN, 3, 10),
    perPresenza: intero(q.perPresenza, DEFAULT.perPresenza, 0, 10000),
    perAttivita: intero(q.perAttivita, DEFAULT.perAttivita, 0, 10000),
    moltSub: frazione(q.moltSub, DEFAULT.moltSub, 1, 10),
    moltVip: frazione(q.moltVip, DEFAULT.moltVip, 1, 10),
    lurkPasso: frazione(q.lurkPasso, DEFAULT.lurkPasso, 0, 1),
    lurkMinimo: frazione(q.lurkMinimo, DEFAULT.lurkMinimo, 0, 1),
    auto: si(q.auto, DEFAULT.auto),
    msgSpento: si(q.msgSpento, DEFAULT.msgSpento),
    esclusi,
    noComandi: si(q.noComandi, DEFAULT.noComandi),
    noRipetuti: si(q.noRipetuti, DEFAULT.noRipetuti),
    minLettere: intero(q.minLettere, DEFAULT.minLettere, 0, 100),
    pienoMin: intero(q.pienoMin, DEFAULT.pienoMin, 0, 600),
    stopMin: intero(q.stopMin, DEFAULT.stopMin, 0, 1440),
    tettoDiretta: intero(q.tettoDiretta, DEFAULT.tettoDiretta, 0, 10_000_000),
    saldoMax: intero(q.saldoMax, DEFAULT.saldoMax, 0, 1_000_000_000),
  };
}

// Quanto vale la presenza di chi sta in silenzio da `giri` giri: piena per i
// primi `pienoMin` minuti, poi scende di un passo a giro fino al minimo, e dopo
// `stopMin` minuti (se c'e') non vale piu' niente. Con i valori di partenza e'
// esattamente la curva di prima: piena solo al giro in cui si scrive.
export function fattoreSilenzio(giri, cfg) {
  const g = Math.max(0, Math.floor(Number(giri) || 0));
  if (cfg.stopMin > 0 && g > 0 && g * GIRO_MIN >= cfg.stopMin) return 0;
  const pieni = Math.floor((cfg.pienoMin || 0) / GIRO_MIN);
  if (g <= pieni) return 1;
  return Math.max(cfg.lurkMinimo, 1 - (g - pieni) * cfg.lurkPasso);
}

// Quante monete spettano a una persona in un giro di presenza.
export function quotaGiro({ attivo, giriFermo, sub, vip }, cfg, x = 1) {
  const base = (cfg.perPresenza || 0) * fattoreSilenzio(attivo ? 0 : giriFermo, cfg);
  const extra = attivo ? (cfg.perAttivita || 0) : 0;
  const molt = sub ? (cfg.moltSub || 1) : (vip ? (cfg.moltVip || 1) : 1);
  return Math.round((base + extra) * molt * x);
}

// Un messaggio CONTA (per le monete per messaggio, per la partecipazione e per
// rompere il silenzio) se non e' un comando, non e' lo stesso di prima e non e'
// troppo corto, quando lo streamer ha scelto di guardarlo. Una definizione sola:
// chi scrive «!monete» ogni cinque minuti non partecipa, e non torna pieno.
const testoNorm = (t) => String(t || '').toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();
export function contaMessaggio(testo, precedente, cfg) {
  const t = String(testo || '').trim();
  if (!t) return false;
  if (cfg.noComandi && /^[!/]/.test(t)) return false;
  if (cfg.noRipetuti && precedente !== undefined && precedente !== null && testoNorm(t) === testoNorm(precedente)) return false;
  if (cfg.minLettere > 0 && [...t.replace(/\s+/g, '')].length < cfg.minLettere) return false;
  return true;
}

// I tetti tagliano la quota a quello che manca: chi e' a 990 col tetto a 1000
// prende 10, non zero.
export function taglia(quota, { monete = 0, gia = 0 } = {}, cfg) {
  let q = Math.max(0, Math.round(Number(quota) || 0));
  if (cfg.tettoDiretta > 0) q = Math.min(q, Math.max(0, cfg.tettoDiretta - gia));
  if (cfg.saldoMax > 0) q = Math.min(q, Math.max(0, cfg.saldoMax - monete));
  return q;
}

// I CONTI DI UNA DIRETTA, per il pannello: quanto prende in `minuti` di diretta
// chi scrive spesso (un messaggio che conta al minuto), chi ogni tanto (uno ogni
// venti minuti) e chi guarda in silenzio. Non sono una stima a parte: sono le
// stesse quotaGiro e taglia che usa il bot, giro per giro, col tetto per diretta.
export function contiDiretta(cfgGrezza, { minuti = 120, x = 1 } = {}) {
  const cfg = normalizza(cfgGrezza);
  const giri = Math.max(1, Math.round(minuti / GIRO_MIN));
  const persona = (ogniMin) => {
    if (!cfg.auto) return 0;
    let tot = 0, zitto = 0, ultimoMsg = -Infinity;
    for (let g = 1; g <= giri; g++) {
      const fine = g * GIRO_MIN;
      let scritto = false;
      if (ogniMin > 0) {
        for (let m = fine - GIRO_MIN + 1; m <= fine; m++) {
          if (m % ogniMin !== 0) continue;
          scritto = true;
          if (cfg.perMessaggio > 0 && (m - ultimoMsg) * 60 >= cfg.ogniSecondi) {
            tot += taglia(Math.round(cfg.perMessaggio * x), { gia: tot }, cfg);
            ultimoMsg = m;
          }
        }
      }
      zitto = scritto ? 0 : zitto + 1;
      tot += taglia(quotaGiro({ attivo: scritto, giriFermo: zitto }, cfg, x), { gia: tot }, cfg);
    }
    return tot;
  };
  return { spesso: persona(1), ogniTanto: persona(20), silenzio: persona(0) };
}
