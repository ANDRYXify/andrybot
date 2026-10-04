// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PRENDERE DA NIGHTBOT, FOSSABOT E MOOBOT SENZA CHIAVI (docs/PONTE.md, «Dagli
// altri bot»). Le stesse regole di StreamElements (streamelements.js):
//
// IL CANALE E' QUELLO DELLA SESSIONE, NON UNO SCRITTO A MANO. Si cerca col nome
// Twitch di chi e' entrato, e si controlla che quel canale sia legato allo
// stesso account Twitch (l'id Twitch che ognuno dei tre dichiara): un nome
// passato a un altro, o un canale omonimo, non entra.
//
// SI LEGGE SOLO QUELLO CHE OGNUNO MOSTRA A TUTTI, e solo quando lo streamer
// preme il tasto: nessuna chiave, nessun accesso al suo account.
//  · Nightbot: i comandi con chi puo' usarli, l'attesa e il conto;
//  · Fossabot: i comandi con i ruoli che possono usarli, gli alias, se valgono
//    in diretta o fuori. I suoi comandi di serie (!uptime, !game…) restano la':
//    nell'elenco pubblico c'e' la loro descrizione, non una risposta;
//  · Moobot: solo nome e risposta. Chi poteva usarli non lo dice, quindi
//    entrano tutti «da rivedere» e solo per lo streamer, finche' non sceglie.
//
// MAI PIU' ACCESSO DI PRIMA. I ruoli di Fossabot sono insiemi (abbonati, VIP,
// moderatori, ruoli suoi), la scala di qui e' una fila (tutti, abbonati, VIP,
// moderatori, tu): si prende il gradino piu' largo che non fa entrare nessuno
// che la' restava fuori, e si dice chi resta fuori in piu'.
//
// NE ESCE UN JSON CHE IL LETTORE DI SEMPRE CAPISCE (importacomandi.js), con
// l'impronta di quello che si e' letto: «Importa» rilegge tutto e applica solo
// se e' quello che lo streamer ha visto.

import { createHash } from 'node:crypto';

const NOME = /^[a-z0-9_]{2,30}$/;
const ID_NIGHTBOT = /^[a-f0-9]{24}$/;
const ID_NUMERO = /^\d{1,20}$/;
export const MAX_COMANDI = 1000;

export const BOT = {
  nightbot: { nome: 'Nightbot', base: 'https://api.nightbot.tv/1' },
  fossabot: { nome: 'Fossabot', base: 'https://api.fossabot.com/v2' },
  moobot: { nome: 'Moobot', base: 'https://api.moo.bot/1' },
};
export const QUALI_BOT = Object.keys(BOT);

export const firmaDi = (comandi) => createHash('sha256').update(JSON.stringify(comandi)).digest('hex').slice(0, 32);

// ── Fossabot: dai ruoli al gradino ──────────────────────────────────────────
// I ruoli di serie di Fossabot e il gradino di qui che ognuno e'. I fondatori
// sono abbonati. Un ruolo fatto dallo streamer (non di serie) qui non c'e'.
const RUOLI_FOSSABOT = new Map([['subscriber', 'sub'], ['founder', 'sub'], ['vip', 'vip'], ['moderator', 'mod'], ['broadcaster', 'tu']]);
const FILA = ['tutti', 'sub', 'vip', 'mod', 'tu'];
const PAROLA = { tutti: 'everyone', sub: 'subscriber', vip: 'vip', mod: 'moderator', tu: 'owner' };
const DETTO = { sub: 'gli abbonati', vip: 'i VIP', mod: 'i moderatori', tu: 'te' };

// { parola, avvisi } per un comando: `ruoli` sono i ruoli del canale ({id, name,
// default}), `ids` quelli che il comando ammette. Nessun ruolo: tutti.
export function gradinoFossabot(ids, ruoli) {
  const lista = Array.isArray(ids) ? ids.map(String) : [];
  if (!lista.length) return { parola: PAROLA.tutti, avvisi: [] };
  const perId = new Map((Array.isArray(ruoli) ? ruoli : []).map((r) => [String(r?.id), r]));
  const ammessi = new Set(['tu']); // lo streamer usa sempre i suoi comandi
  const estranei = [];
  for (const id of lista) {
    const r = perId.get(id);
    const g = r?.default !== false ? RUOLI_FOSSABOT.get(String(r?.name || '').trim().toLowerCase()) : undefined;
    if (g) ammessi.add(g);
    else estranei.push(String(r?.name || 'un ruolo che non conosco').slice(0, 40));
  }
  // il gradino piu' largo la cui fila verso l'alto sta tutta dentro gli ammessi
  let g = 'tu';
  for (let i = FILA.length - 1; i >= 1; i--) {
    if (!ammessi.has(FILA[i])) break;
    g = FILA[i];
  }
  const avvisi = [];
  const fuori = FILA.slice(1, FILA.indexOf(g)).filter((x) => ammessi.has(x));
  const per = g === 'tu' ? 'solo per te' : `per ${DETTO[g]} e chi sta sopra`;
  if (fuori.length) avvisi.push(`lo usavano anche ${fuori.map((x) => DETTO[x]).join(' e ')}: qui i permessi vanno a gradini (abbonati, VIP, moderatori), quindi entra ${per}. Allarga in «Per chi» se vuoi`);
  if (estranei.length) avvisi.push(`era anche per ${estranei.length === 1 ? 'il ruolo' : 'i ruoli'} «${estranei.slice(0, 3).join('», «')}» di Fossabot, che qui non ${estranei.length === 1 ? 'c\'è' : 'ci sono'}: scegli tu in «Per chi»`);
  return { parola: PAROLA[g], avvisi };
}

// ── Moobot: le parti della risposta ─────────────────────────────────────────
// Moobot scrive le sue parti fra < e >. Chi scrive il comando diventa la
// stessa parte che usano Nightbot e Fossabot, e il lettore di sempre la
// traduce; le altre restano scritte come sono, e lo si dice.
const PARTI_MOOBOT = new Map([['username', '$(user)'], ['display_name', '$(user)'], ['displayname', '$(user)']]);
export function rispostaMoobot(testo) {
  const ignote = new Set();
  const fuori = String(testo ?? '').replace(/<([A-Za-z_]{1,30})>/g, (tutto, k) => {
    const v = PARTI_MOOBOT.get(k.toLowerCase());
    if (v) return v;
    ignote.add(tutto);
    return tutto;
  });
  return { testo: fuori, ignote: [...ignote] };
}

// ── la lettura ──────────────────────────────────────────────────────────────
// Ritorna { testo, firma, canale, conti } oppure { errore, stato }.
export async function leggi(bot, { login, twitchId, fetch: prendi = globalThis.fetch } = {}) {
  const B = BOT[bot];
  if (!B) return { errore: 'questo bot non lo conosco', stato: 400 };
  const chiedi = async (via, headers = {}) => {
    let r;
    try {
      r = await prendi(B.base + via, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15_000) });
    } catch { return { stato: 0 }; }
    if (!r.ok) return { stato: r.status };
    try { return { stato: r.status, dati: await r.json() }; } catch { return { stato: 0 }; }
  };
  const giu = (stato) => (stato === 429
    ? { errore: `${B.nome} chiede di rallentare: riprova fra un minuto.`, stato: 429 }
    : { errore: `${B.nome} adesso non risponde come dovrebbe: riprova fra poco.`, stato: 502 });
  const nonCe = (nome) => ({ errore: `Su ${B.nome} non c'è un canale «${nome}».`, stato: 404 });
  const nonTuo = (nome) => ({ errore: `Il canale «${nome}» di ${B.nome} non è legato al tuo account Twitch: non lo leggo.`, stato: 403 });

  const nome = String(login || '').trim().toLowerCase();
  if (!NOME.test(nome)) return { errore: `non so con che nome cercarti su ${B.nome}`, stato: 400 };
  const tw = String(twitchId || '').trim();
  if (!tw) return { errore: 'Non so ancora l\'id del tuo account Twitch: esci, rientra con Twitch e riprova.', stato: 409 };

  let comandi = [], saltati = 0, mostra = nome;

  if (bot === 'nightbot') {
    const ch = await chiedi(`/channels/t/${encodeURIComponent(nome)}`);
    if (ch.stato === 404) return nonCe(nome);
    const c = ch.dati?.channel;
    if (!c) return giu(ch.stato);
    if (c.provider !== 'twitch' || String(c.providerId) !== tw || !ID_NIGHTBOT.test(String(c._id || ''))) return nonTuo(nome);
    mostra = String(c.displayName || nome);
    const cm = await chiedi('/commands', { 'Nightbot-Channel': String(c._id) });
    if (!Array.isArray(cm.dati?.commands)) return giu(cm.stato);
    comandi = cm.dati.commands.slice(0, MAX_COMANDI).map((x) => {
      const nomeCmd = String(x?.name ?? '');
      const voce = { name: nomeCmd, message: String(x?.message ?? ''), userLevel: x?.userLevel, coolDown: x?.coolDown, count: x?.count };
      // Nightbot accetta nomi con un segno davanti diverso dal punto
      // esclamativo («~ciao»): qui un comando parte col «!»
      const segno = /^([^!A-Za-z0-9_])/.exec(nomeCmd.trim());
      if (segno) voce.avvisi = [`su Nightbot partiva con «${nomeCmd.trim().slice(0, 30)}»: qui si scrive col punto esclamativo`];
      return voce;
    });
  } else if (bot === 'fossabot') {
    const ch = await chiedi(`/cached/channels/by-slug/${encodeURIComponent(nome)}`);
    if (ch.stato === 404) return nonCe(nome);
    const c = ch.dati?.channel;
    if (!c) return giu(ch.stato);
    if (c.provider !== 'twitch' || String(c.provider_id) !== tw || !ID_NUMERO.test(String(c.id || ''))) return nonTuo(nome);
    mostra = String(c.display_name || nome);
    const cm = await chiedi(`/cached/channels/${encodeURIComponent(String(c.id))}/commands`);
    if (!Array.isArray(cm.dati?.commands)) return giu(cm.stato);
    const ruoli = cm.dati.roles;
    for (const x of cm.dati.commands) {
      if (x?.type !== 'custom') { saltati++; continue; }
      if (comandi.length >= MAX_COMANDI) break;
      const lv = gradinoFossabot(x.role_ids, ruoli);
      comandi.push({
        command: String(x.name ?? ''), reply: String(x.response ?? ''), accessLevel: lv.parola,
        aliases: Array.isArray(x.aliases) ? x.aliases.map(String) : [],
        enabledOnline: x.enabled_online !== false, enabledOffline: x.enabled_offline !== false,
        ...(lv.avvisi.length ? { avvisi: lv.avvisi } : {}),
      });
    }
  } else {
    const ch = await chiedi(`/channel/meta?name=${encodeURIComponent(nome)}`);
    const c = ch.dati?.channel;
    if (ch.dati && !c) return nonCe(nome);
    if (!c) return giu(ch.stato);
    if (String(c.userid) !== tw || !ID_NUMERO.test(String(c.userid || ''))) return nonTuo(nome);
    mostra = String(c.username || nome);
    const cm = await chiedi(`/channel/public/commands/list?channel=${encodeURIComponent(String(c.userid))}`);
    if (!Array.isArray(cm.dati?.list)) return giu(cm.stato);
    // gli alias di Moobot sono comandi a parte («Alias for !x»): diventano alias
    // del comando a cui puntano, se quello entra
    const alias = new Map();
    for (const x of cm.dati.list) {
      const m = /^Alias for !([A-Za-z0-9_]{1,30})$/i.exec(String(x?.response ?? '').trim());
      if (x?.type === 'alias' && m) {
        const k = m[1].toLowerCase();
        alias.set(k, [...(alias.get(k) || []), String(x.identifier ?? '')]);
      }
    }
    for (const x of cm.dati.list) {
      if (x?.type !== 'custom') { if (x?.type !== 'alias') saltati++; continue; }
      if (comandi.length >= MAX_COMANDI) break;
      const r = rispostaMoobot(x.response);
      const avvisi = ['Moobot non dice chi poteva usarlo: per ora solo tu, scegli in «Per chi»'];
      if (r.ignote.length) avvisi.push(`dentro c'è ${r.ignote.slice(0, 3).join(', ')} di Moobot, che qui non c'è: resta scritto così`);
      const id = String(x.identifier ?? '');
      comandi.push({ command: id, reply: r.testo, accessLevel: PAROLA.tu, aliases: alias.get(id.toLowerCase()) || [], avvisi });
    }
  }

  return {
    testo: JSON.stringify({ commands: comandi }),
    firma: firmaDi(comandi),
    canale: { nome: mostra.slice(0, 40) },
    conti: { comandi: comandi.length, saltati },
  };
}
