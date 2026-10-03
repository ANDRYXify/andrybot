// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PRENDERE DA STREAMELEMENTS SENZA CHIAVI (docs/PONTE.md, «Da StreamElements»).
//
// StreamElements tiene pubblici, per ogni canale, i comandi (tranne quelli
// nascosti), i contatori e la classifica dei punti: li mostra a chiunque sulla
// pagina dei comandi del canale. Qui si leggono quelli, solo quando lo
// streamer preme il tasto: nessuna chiave, nessun accesso al suo account,
// niente che resti da noi prima che lui confermi.
//
// IL CANALE E' QUELLO DELLA SESSIONE, NON UNO SCRITTO A MANO. Si cerca su
// StreamElements col nome Twitch di chi e' entrato, e si controlla che quel
// canale sia legato allo stesso account Twitch (providerId = id Twitch): un
// nome passato a un altro, o un canale omonimo, non entra. Cosi' i saldi di un
// altro pubblico non finiscono mai nel tuo.
//
// NE ESCE LO STESSO JSON CHE LO STREAMER POTREBBE INCOLLARE (comandi,
// contatori, punti), e lo legge lo stesso lettore di sempre
// (importacomandi.js): una strada sola per capire, mostrare e importare.
//
// UNA CHIAMATA PER VOLTA, con una piccola pausa: sono i server di un altro, e
// una classifica di cinquantamila persone sono cinquanta pagine. Se una pagina
// dei punti non arriva ci si ferma e lo si dice: meta' classifica importata
// sembrerebbe tutta, e non lo e'.

import { createHash } from 'node:crypto';
import { MAX_PUNTI } from './importacomandi.js';

export const BASE = 'https://api.streamelements.com/kappa/v2';
export const PAGINA = 1000;
export const MAX_CONTATORI = 50;
const ID_SE = /^[a-f0-9]{24}$/;
const NOME = /^[a-z0-9_]{2,30}$/;

// I contatori che i comandi usano: ${count morti}, ${getcount morti},
// ${count.morti}, e ${count} da solo, che e' quello del comando stesso.
const RE_CONTATORE = /\$[({]\s*(?:get)?count(?:\s+|\.)([A-Za-z0-9_]{1,30})/g;
const RE_CONTA_SOLO = /\$[({]\s*count\s*[)}]/i;

export function contatoriCitati(comandi) {
  const nomi = new Map();
  for (const c of Array.isArray(comandi) ? comandi : []) {
    const r = String(c?.reply ?? '');
    for (const m of r.matchAll(RE_CONTATORE)) if (!nomi.has(m[1].toLowerCase())) nomi.set(m[1].toLowerCase(), m[1]);
    const proprio = String(c?.command ?? '');
    if (RE_CONTA_SOLO.test(r) && /^[A-Za-z0-9_]{1,30}$/.test(proprio) && !nomi.has(proprio.toLowerCase())) nomi.set(proprio.toLowerCase(), proprio);
  }
  return [...nomi.values()].slice(0, MAX_CONTATORI);
}

// L'IMPRONTA di quello che l'anteprima ha mostrato: comandi e contatori.
// «Importa» richiede tutto da capo a StreamElements e applica solo se
// l'impronta è la stessa: si scrive quello che lo streamer ha visto, senza
// tenere niente da parte fra i due passi. I punti restano fuori: in diretta
// cambiano di minuto in minuto, e il registro dell'import li porta comunque
// una volta sola.
export const firmaDi = (commands, counters) => createHash('sha256')
  .update(JSON.stringify({ commands, counters })).digest('hex').slice(0, 32);

// Ritorna { testo, firma, canale, conti } oppure { errore, stato }.
// `punti`: solo il proprietario porta i saldi (come in /comandi/importa), e
// solo allora la classifica si chiede.
export async function leggi({ login, twitchId, punti = false, fetch: prendi = globalThis.fetch,
  dormi = (ms) => new Promise((ok) => setTimeout(ok, ms)), pausa = 150, maxPunti = MAX_PUNTI } = {}) {
  const chiedi = async (via) => {
    let r;
    try {
      r = await prendi(BASE + via, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    } catch { return { stato: 0 }; }
    if (!r.ok) return { stato: r.status };
    try { return { stato: r.status, dati: await r.json() }; } catch { return { stato: 0 }; }
  };
  const giu = (stato) => (stato === 429
    ? { errore: 'StreamElements chiede di rallentare: riprova fra un minuto.', stato: 429 }
    : { errore: 'StreamElements adesso non risponde come dovrebbe: riprova fra poco.', stato: 502 });

  const nome = String(login || '').trim().toLowerCase();
  if (!NOME.test(nome)) return { errore: 'non so con che nome cercarti su StreamElements', stato: 400 };
  // Senza l'id Twitch della sessione nessun canale si può dire tuo: non si
  // chiede niente a StreamElements, e si dice come rimediare.
  if (!String(twitchId || '').trim()) return { errore: 'Non so ancora l\'id del tuo account Twitch: esci, rientra con Twitch e riprova.', stato: 409 };
  const ch = await chiedi(`/channels/${encodeURIComponent(nome)}`);
  if (ch.stato === 404) return { errore: `Su StreamElements non c'è un canale «${nome}».`, stato: 404 };
  if (!ch.dati) return giu(ch.stato);
  const id = String(ch.dati._id || '');
  if (ch.dati.provider !== 'twitch' || String(ch.dati.providerId) !== String(twitchId) || !ID_SE.test(id)) {
    return { errore: `Il canale «${nome}» di StreamElements non è legato al tuo account Twitch: non lo leggo.`, stato: 403 };
  }

  const cm = await chiedi(`/bot/commands/${id}/public`);
  if (!Array.isArray(cm.dati)) return giu(cm.stato);
  const commands = cm.dati;

  const counters = [];
  for (const n of contatoriCitati(commands)) {
    await dormi(pausa);
    const r = await chiedi(`/bot/${id}/counters/${encodeURIComponent(n)}`);
    const v = Number(r.dati?.count);
    if (r.dati && Number.isFinite(v)) counters.push({ counter: n, value: Math.trunc(v) });
  }

  const points = [];
  let puntiTotali = 0, nomePunti = '', puntiSpenti = false;
  if (punti) {
    await dormi(pausa);
    const ly = await chiedi(`/loyalty/${id}`);
    nomePunti = String(ly.dati?.loyalty?.name || '').slice(0, 40);
    puntiSpenti = ly.dati?.loyalty?.enabled === false;
    for (let offset = 0; !puntiSpenti && offset < maxPunti; offset += PAGINA) {
      await dormi(pausa);
      const r = await chiedi(`/points/${id}/top?limit=${Math.min(PAGINA, maxPunti - offset)}&offset=${offset}`);
      if (!r.dati) return giu(r.stato);
      puntiTotali = Math.max(puntiTotali, Number(r.dati._total) || 0);
      const users = Array.isArray(r.dati.users) ? r.dati.users : [];
      for (const u of users) points.push({ username: u?.username, points: u?.points });
      if (users.length < PAGINA) break;
    }
  }

  return {
    testo: JSON.stringify({ commands, counters, points }),
    firma: firmaDi(commands, counters),
    canale: { nome: String(ch.dati.displayName || nome).slice(0, 40) },
    conti: { comandi: commands.length, contatori: counters.length, punti: points.length, puntiTotali, nomePunti, puntiSpenti, puntiChiesti: !!punti },
  };
}
