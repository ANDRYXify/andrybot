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
  durate: Object.freeze({ chat: 'mai', giochi: 'mai', premi: 'mai', staff: 'mai' }),
  giocoOgni: 0, giochiScorta: 3,
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
    durate: Object.fromEntries(DA_DOVE.map((k) => [k, DURATE.includes(q.durate?.[k]) ? q.durate[k] : DEFAULT.durate[k]])),
    giocoOgni: intero(q.giocoOgni, DEFAULT.giocoOgni, 0, 50),
    giochiScorta: intero(q.giochiScorta, DEFAULT.giochiScorta, 1, 20),
  };
}

// QUANTO DURANO LE MONETE (docs/ECONOMIA.md, «Quanto durano le monete»).
//
// Una moneta prende la scadenza quando nasce, dal modo in cui nasce: stando in
// chat, giocando (la parte in piu' oltre la posta, e i premi dei giochi), da un
// premio o da un Modulo, dallo staff. Poi si muove con la sua data.
export const DA_DOVE = Object.freeze(['chat', 'giochi', 'premi', 'staff']);
// «dopo»: a fine giornata, N giorni dopo quello in cui si guadagna. «fine»:
// all'inizio della settimana (lunedi'), del mese, della stagione (aprile,
// luglio, ottobre, gennaio) o dell'anno dopo. Sempre nel fuso del canale, e
// sempre a mezzanotte: due monete che scadono lo stesso giorno sono lo stesso
// lotto.
export const DURATE = Object.freeze(['mai', 'sett', 'mese', 'tre', 'anno', 'fine-sett', 'fine-mese', 'fine-stagione', 'fine-anno']);
const GIORNI = { sett: 7, mese: 30, tre: 91, anno: 365 };

const fusoOk = (fuso) => { try { new Intl.DateTimeFormat('en-US', { timeZone: fuso }); return fuso; } catch { return 'UTC'; } };
function partiIn(ora, fuso) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: fuso, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
  const p = {};
  for (const x of f.formatToParts(new Date(ora))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return p;
}
// L'istante in cui, nel fuso, scocca la mezzanotte del giorno a-m-g (anche un
// mese 13 o un giorno 32: si normalizzano da soli). Due passi bastano anche
// nelle notti in cui cambia l'ora.
function mezzanotte(a, m, g, fuso) {
  const voluto = Date.UTC(a, m - 1, g);
  let t = voluto;
  for (let i = 0; i < 2; i++) {
    const p = partiIn(t, fuso);
    t -= Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - voluto;
  }
  return t;
}

// Quando scade una moneta che nasce adesso con questa durata: un istante, o 0
// se non scade.
export function scadenza(durata, ora = Date.now(), fuso = 'Europe/Rome') {
  if (!DURATE.includes(durata) || durata === 'mai') return 0;
  const z = fusoOk(fuso);
  const p = partiIn(ora, z);
  if (GIORNI[durata]) return mezzanotte(p.year, p.month, p.day + GIORNI[durata] + 1, z);
  if (durata === 'fine-sett') {
    const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    return mezzanotte(p.year, p.month, p.day + (((8 - dow) % 7) || 7), z);
  }
  if (durata === 'fine-mese') return mezzanotte(p.year, p.month + 1, 1, z);
  if (durata === 'fine-stagione') return mezzanotte(p.year, (Math.floor((p.month - 1) / 3) + 1) * 3 + 1, 1, z);
  return mezzanotte(p.year + 1, 1, 1, z);
}

// Il giorno di adesso nel fuso del canale, «AAAA-MM-GG».
export function giornoIn(ora = Date.now(), fuso = 'Europe/Rome') {
  const p = partiIn(ora, fusoOk(fuso));
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// L'ultimo giorno in cui vale una moneta che scade all'istante `scade` (una
// mezzanotte nel fuso): fra quanti giorni da oggi, e che giorno e'.
export function ultimoGiorno(scade, ora = Date.now(), fuso = 'Europe/Rome') {
  const z = fusoOk(fuso);
  const u = partiIn(scade - 1, z);
  const o = partiIn(ora, z);
  const giorno = Date.UTC(u.year, u.month - 1, u.day);
  return {
    fra: Math.round((giorno - Date.UTC(o.year, o.month - 1, o.day)) / 86_400_000),
    anno: u.year, mese: u.month, giorno: u.day, settimana: new Date(giorno).getUTCDay(), annoOggi: o.year,
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

// LE REGOLE DETTE COI NUMERI, per il pannello (docs/ECONOMIA.md, «Il pannello
// le rilegge»): quanto prende in cinque minuti chi scrive, un abbonato e un VIP
// che scrivono, e la storia di chi resta in chat senza scrivere. Non sono una
// spiegazione scritta a parte: sono quotaGiro e fattoreSilenzio del bot, con i
// loro arrotondamenti (con 1 di presenza, il 40% fa zero e non 0,4).
//
// La storia del silenzio e' a pezzi: dal `minuto` (di silenzio) in poi, ogni
// cinque minuti arrivano `monete`, fino al pezzo dopo. Il primo giro senza
// scrivere e' il giro 1, come nel bot (economia.giro). Il fattore non cresce
// mai, quindi i pezzi scendono soltanto; dopo l'ultimo giro in cui puo' ancora
// cambiare (la fine della presenza intera, i passi fino al minimo, il fermo)
// resta uguale per sempre.
export function storiaSilenzio(cfgGrezza) {
  const cfg = normalizza(cfgGrezza);
  const pieni = Math.floor(cfg.pienoMin / GIRO_MIN);
  const passi = cfg.lurkPasso > 0 ? Math.ceil((1 - cfg.lurkMinimo) / cfg.lurkPasso) : 0;
  const fermo = cfg.stopMin > 0 ? Math.ceil(cfg.stopMin / GIRO_MIN) : 0;
  const ultimo = Math.max(pieni + passi, fermo) + 1;
  const pezzi = [];
  for (let g = 1; g <= ultimo; g++) {
    const monete = cfg.auto ? quotaGiro({ attivo: false, giriFermo: g }, cfg) : 0;
    if (!pezzi.length || pezzi.at(-1).monete !== monete) pezzi.push({ minuto: g * GIRO_MIN, monete });
  }
  return pezzi;
}
export function quoteDette(cfgGrezza) {
  const cfg = normalizza(cfgGrezza);
  const q = (p) => (cfg.auto ? quotaGiro(p, cfg) : 0);
  return {
    scrive: q({ attivo: true }), abbonato: q({ attivo: true, sub: true }), vip: q({ attivo: true, vip: true }),
    silenzio: storiaSilenzio(cfg),
  };
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
