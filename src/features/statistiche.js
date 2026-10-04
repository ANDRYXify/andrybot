// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE STATISTICHE DEL CANALE, IN UN POSTO SOLO.
//
// Prima erano sparse in tre schede con tre stili: i numeri dei sette giorni in
// cima a Memoria, la classifica delle monete dentro la carta del premio VIP in
// Giochi, le serie di presenze ancora in Memoria, i rapporti in Dirette. Tre
// posti, nessun periodo scegliibile, nessun confronto possibile.
//
// Qui si decide cos'e' un periodo e da dove viene ogni numero, e ogni numero ha
// UNA fonte sola. La chat e il bot dai messaggi; le dirette, le ore in onda, il
// picco, i follower e i sub dai RAPPORTI gia' salvati a fine diretta — cioe'
// esattamente quello che lo streamer legge nella scheda Dirette, non un secondo
// conto che col tempo diverge; le presenze e le ore guardate dai loro registri.
// Il periodo taglia tutto allo stesso modo, e «da sempre» non taglia niente.
import { db, rapporti, watchtime, padroneDi } from '../db.js';
import * as presenze from './presenze.js';
import { regaliDaRaffica } from './regali.js';

const GIORNO_MS = 24 * 3600_000;
// Le finestre sono tre e si chiamano come si dicono. Zero vuol dire «da
// sempre»: non e' un caso particolare, e' l'inizio del tempo.
export const PERIODI = { 7: 7 * GIORNO_MS, 30: 30 * GIORNO_MS, tutto: 0 };

export function periodoValido(p) {
  const s = String(p ?? '7');
  return Object.prototype.hasOwnProperty.call(PERIODI, s) ? s : '7';
}

const intero = (v) => Math.trunc(Number(v)) || 0;
const norm = (s) => String(s || '').toLowerCase();

// LA DIRETTA IN CORSO NON ESISTEVA NEI NUMERI.
//
// I numeri delle dirette si sommano dai RAPPORTI, e un rapporto si scrive quando
// la serata finisce. Finche' eri in onda la scheda diceva zero dirette, zero
// minuti, zero picco — mentre i messaggi in chat, che sono righe nel database,
// salivano. Da fuori sembrava rotta.
//
// La serata in corso arriva da FUORI (`inCorso`), da chi la sta gia' tenendo in
// mano: il rapporto. Qui non si apre una seconda contabilita' della stessa cosa,
// che poi sarebbe un secondo posto in cui il picco puo' essere diverso.
//
// Quello che aggiunge e' solo la sua PARTE DENTRO LA FINESTRA: una serata
// cominciata prima dei sette giorni e ancora accesa non porta dentro le ore di
// prima, porta quelle da quando comincia il periodo.
function conInCorso(ch, dirette, inCorso, da, ora) {
  if (!inCorso || !(Number(inCorso.inizio) > 0)) return dirette;
  const dentro = Math.max(Number(da) || 0, Number(inCorso.inizio));
  if (dentro > ora) return dirette;
  const ev = db.prepare(`SELECT text FROM messages WHERE channel=? AND user='[evento]' AND ts>=? AND ts<=?`).all(ch, dentro, ora);
  let follow = 0, sub = 0, raid = 0;
  for (const r of ev) {
    const t = String(r.text || '');
    const tipo = t.slice(0, t.indexOf(' ') > 0 ? t.indexOf(' ') : t.length);
    if (tipo === 'channel.follow') follow++;
    else if (tipo === 'channel.subscribe') sub++;
    else if (tipo === 'channel.subscription.gift') {
      // la raffica conta solo fuori da Twitch: li' ogni regalo e' gia' un
      // channel.subscribe (regali.js)
      let d2 = {};
      try { d2 = JSON.parse(t.slice(t.indexOf(' ') + 1)) || {}; } catch { d2 = {}; }
      if (regaliDaRaffica(d2)) sub += Number(d2.total) || 1;
    } else if (tipo === 'channel.raid') raid++;
  }
  return {
    ...dirette,
    n: dirette.n + 1,
    oreMs: dirette.oreMs + Math.max(0, ora - dentro),
    picco: Math.max(dirette.picco, intero(inCorso.picco)),
    follow: dirette.follow + follow,
    sub: dirette.sub + sub,
    raid: dirette.raid + raid,
    inCorso: { da: intero(inCorso.inizio), picco: intero(inCorso.picco), durataMs: Math.max(0, ora - intero(inCorso.inizio)) },
  };
}

// LE DIRETTE PER PIATTAFORMA (docs/STATISTICHE.md, «Una serata, piu'
// piattaforme»). Un rapporto con dentro piu' piattaforme si conta una volta
// nelle dirette del canale e una volta in ognuna delle sue; ogni piattaforma
// porta le SUE ore e il SUO picco, che il rapporto ha gia' tenuto da parte. I
// rapporti scritti prima che il rapporto le distinguesse sono di Twitch per
// costruzione: allora solo Twitch li scriveva.
const PIATTAFORMA_DI_PRIMA = 'twitch';
function perPiattaforma(ch, da, totali, inCorso, ora) {
  const per = new Map();
  const somma = (p, n, oreMs, picco) => {
    const x = per.get(p) || { piattaforma: p, n: 0, oreMs: 0, picco: 0 };
    x.n += n; x.oreMs += oreMs; x.picco = Math.max(x.picco, picco);
    per.set(p, x);
  };
  const righe = db.prepare(`SELECT json_extract(p.value,'$.piattaforma') piattaforma, COUNT(*) n,
      COALESCE(SUM(json_extract(p.value,'$.durataMs')), 0) oreMs, COALESCE(MAX(json_extract(p.value,'$.picco')), 0) picco
    FROM rapporti r, json_each(r.dati, '$.piattaforme') p WHERE r.channel=? AND r.fine>=? GROUP BY 1`).all(ch, da);
  for (const x of righe) if (x.piattaforma) somma(String(x.piattaforma), intero(x.n), intero(x.oreMs), intero(x.picco));
  const vecchi = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(json_extract(dati,'$.durataMs')), 0) oreMs, COALESCE(MAX(json_extract(dati,'$.picco')), 0) picco
    FROM rapporti WHERE channel=? AND fine>=? AND json_type(dati, '$.piattaforme') IS NULL`).get(ch, da);
  if (intero(vecchi.n)) somma(PIATTAFORMA_DI_PRIMA, intero(vecchi.n), intero(vecchi.oreMs), intero(vecchi.picco));
  for (const x of (inCorso?.piattaforme || [])) {
    const dentro = Math.max(Number(da) || 0, Number(x.inizio) || 0);
    if (!x.piattaforma || dentro > ora) continue;
    somma(String(x.piattaforma), 1, Math.min(intero(x.durataMs), Math.max(0, ora - dentro)), intero(x.picco));
  }
  return [...per.values()].sort((a, b) => b.oreMs - a.oreMs || (a.piattaforma < b.piattaforma ? -1 : 1));
}

export function riassunto(channel, { periodo = '7', ora = Date.now(), n = 10, inCorso = null } = {}) {
  const ch = norm(channel);
  const p = periodoValido(periodo);
  const da = PERIODI[p] ? ora - PERIODI[p] : 0;

  const chat = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT user) p FROM messages
    WHERE channel=? AND ts>=? AND from_bot=0 AND user NOT LIKE '[%'`).get(ch, da);
  const bot = db.prepare('SELECT COUNT(*) c FROM messages WHERE channel=? AND ts>=? AND from_bot=1').get(ch, da).c;
  // il padrone non corre nella sua gara: i messaggi del canale li conta tutti
  // (sopra), ma in classifica ci va chi guarda
  const topChatters = db.prepare(`SELECT user, COUNT(*) c FROM messages
    WHERE channel=? AND ts>=? AND from_bot=0 AND user<>? AND user NOT LIKE '[%'
    GROUP BY user ORDER BY c DESC, user LIMIT ?`).all(ch, da, padroneDi(ch), n).map((r) => ({ user: r.user, n: intero(r.c) }));
  const clip = db.prepare('SELECT COUNT(*) c FROM clips WHERE channel=? AND ts>=?').get(ch, da).c;

  // I rapporti si sommano nel database, non in JavaScript: leggerli tutti per
  // sommarli qui vorrebbe dire aprire un JSON per ogni diretta mai fatta.
  const r = db.prepare(`SELECT COUNT(*) n,
      COALESCE(SUM(json_extract(dati,'$.durataMs')), 0) oreMs,
      COALESCE(MAX(json_extract(dati,'$.picco')), 0) picco,
      COALESCE(SUM(json_extract(dati,'$.follow')), 0) follow,
      COALESCE(SUM(json_extract(dati,'$.sub')), 0) sub,
      COALESCE(SUM(json_extract(dati,'$.raid')), 0) raid,
      COALESCE(SUM(json_extract(dati,'$.donazioni')), 0) donazioni,
      COALESCE(SUM(json_extract(dati,'$.donazioniCent')), 0) donazioniCent
    FROM rapporti WHERE channel=? AND fine>=?`).get(ch, da);
  const dirette = conInCorso(ch, {
    n: intero(r.n), oreMs: intero(r.oreMs), picco: intero(r.picco), follow: intero(r.follow),
    sub: intero(r.sub), raid: intero(r.raid), donazioni: intero(r.donazioni), donazioniCent: intero(r.donazioniCent),
  }, inCorso, da, ora);
  dirette.piattaforme = perPiattaforma(ch, da, dirette, inCorso, ora);

  // Le ultime dirette NON dipendono dal periodo: sono l'elenco di com'e' andata
  // le ultime volte, e se uno guarda «sette giorni» dopo una pausa di un mese
  // una tabella vuota non gli direbbe niente.
  const ultime = rapporti.elenco(ch, n).map((x) => ({
    id: x.id, inizio: intero(x.inizio), fine: intero(x.fine),
    durataMs: intero(x.dati?.durataMs), picco: intero(x.dati?.picco), media: intero(x.dati?.media),
    messaggi: intero(x.dati?.messaggi), persone: intero(x.dati?.persone),
    follow: intero(x.dati?.follow), clip: intero(x.dati?.clip),
    piattaforme: Array.isArray(x.dati?.piattaforme) ? x.dati.piattaforme.map((q) => String(q?.piattaforma || '')).filter(Boolean) : [PIATTAFORMA_DI_PRIMA],
  }));

  return {
    periodo: p, da,
    messaggi: intero(chat.n), persone: intero(chat.p), messaggiBot: intero(bot), clip: intero(clip),
    dirette,
    topChatters,
    presenze: presenze.classifica(ch, n),
    ore: watchtime.top(ch, n).map((x) => ({ user: x.display || x.user, secondi: intero(x.seconds) })),
    ultime,
  };
}
