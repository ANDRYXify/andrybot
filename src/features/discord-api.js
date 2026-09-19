// IL FILO CON DISCORD: solo quello che serve per dare e togliere un ruolo.
//
// La REGOLA sta in `discord-ruoli.js` e non sa cosa sia Discord. Qui c'e' il
// contrario: nessuna decisione, solo le chiamate — leggere i ruoli del server,
// leggere un membro, dare un ruolo, toglierlo — e la traduzione degli errori in
// qualcosa che il pannello possa dire a una persona.
//
// Cose che non devono poter succedere, e come sono chiuse:
//
//  · PARLARE CON UN ALTRO HOST. L'indirizzo non arriva mai da fuori: la base e'
//    fissa (`API`), e dentro il percorso ci vanno solo numeri. Un id che non e'
//    fatto di sole cifre non parte nemmeno: e' l'unico modo per uscire dal
//    percorso, e si chiude prima della chiamata, non dopo.
//  · IL TOKEN NEL REGISTRO. Il token del bot e' un segreto dello streamer: non
//    finisce mai in un log, nemmeno in un pezzo. Quando una chiamata va male si
//    scrive cosa e' successo, non con cosa ci si e' autenticati.
//  · RESTARE APPESI. Ogni chiamata ha il suo tempo massimo.
//  · INSISTERE DA SOLI. Se Discord dice «troppe richieste» si aspetta il tempo
//    che dice LUI, una volta sola. Il resto lo decide il giro che chiama: un
//    modulo che riprova per conto suo, in silenzio, e' un modulo che non si
//    riesce piu' a fermare.
//
// «Non e' nel server» NON e' un errore: e' una risposta. Un ruolo non si puo'
// dare a chi non c'e', e va detto cosi', non come un guasto.
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('discord-api');

const API = 'https://discord.com/api/v10';
const TIMEOUT_MS = 8000;
const ATTESA_MAX_MS = 5000;   // oltre questa, «troppe richieste» si dice e basta
const UA = 'SocialBot (https://socialbot.live, 1.0)';

export const ID_RE = /^[0-9]{5,24}$/;
export const idOk = (v) => ID_RE.test(String(v || ''));

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

// Il messaggio che leggera' una persona. Il codice di Discord conta piu' dello
// stato HTTP: 50013 e' «non ho il permesso», e capita anche con un 403 generico.
function spiega(stato, corpo) {
  const cod = Number(corpo?.code) || 0;
  if (stato === 401) return 'il token del bot non vale piu\': rigeneralo su Discord e rimettilo qui';
  if (cod === 50013 || cod === 50001) return 'al bot manca il permesso «Gestire i ruoli», oppure il ruolo sta piu\' in alto di lui';
  if (stato === 403) return 'Discord non lascia fare questa cosa al bot: controlla i suoi permessi e la sua posizione';
  if (stato === 404) return 'non trovato: il server, la persona o il ruolo non ci sono piu\'';
  if (stato >= 500) return 'Discord non sta bene in questo momento';
  return corpo?.message ? String(corpo.message).slice(0, 140) : ('HTTP ' + stato);
}

// Una chiamata sola. Torna { ok, dati } oppure { ok:false, errore, stato, assente }.
async function chiama(token, via, { metodo = 'GET', corpo = null, riprova = true } = {}) {
  const t = String(token || '').trim();
  if (!t) return { ok: false, errore: 'manca il token del bot' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API + via, {
      method: metodo,
      signal: ac.signal,
      headers: {
        Authorization: 'Bot ' + t,
        'User-Agent': UA,
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    if (r.status === 429) {
      const d = await r.json().catch(() => null);
      const ms = Math.round((Number(d?.retry_after) || 1) * 1000);
      if (riprova && ms <= ATTESA_MAX_MS) {
        clearTimeout(to);
        await attendi(ms);
        return chiama(token, via, { metodo, corpo, riprova: false });
      }
      return { ok: false, errore: 'troppe richieste: riprovo piu\' tardi', stato: 429, attesa: ms };
    }
    if (r.status === 204) return { ok: true, dati: null };
    const d = await r.json().catch(() => null);
    if (r.ok) return { ok: true, dati: d };
    if (r.status === 404) return { ok: false, errore: spiega(404, d), stato: 404, assente: true };
    log.warn('chiamata', metodo, via.replace(/\d{5,}/g, '#'), '→', r.status);
    return { ok: false, errore: spiega(r.status, d), stato: r.status };
  } catch (e) {
    return { ok: false, errore: 'Discord irraggiungibile' };
  } finally { clearTimeout(to); }
}

// I ruoli del server, come li vede il bot. `position` serve a sapere cosa e'
// fuori dalla sua portata, `managed` a riconoscere quelli di un'integrazione
// (il ruolo dei sub di Twitch, per dirne uno) che non si danno a mano.
export async function ruoli(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/roles`);
  if (!r.ok) return r;
  const lista = (Array.isArray(r.dati) ? r.dati : []).map((x) => ({
    id: String(x?.id || ''),
    nome: String(x?.name || ''),
    position: Number(x?.position) || 0,
    managed: !!x?.managed,
    colore: Number(x?.color) || 0,
    // Un ruolo non e' solo quello che puo' fare: e' anche come si vede. Chi sta
    // «a parte» compare in cima all'elenco delle persone col suo nome sopra, ed
    // e' tutto il senso di un ruolo decorativo come «Streamer». Senza questi
    // due, il costruttore ricreerebbe ogni volta un ruolo che sembra diverso.
    separato: !!x?.hoist,
    citabile: !!x?.mentionable,
    permessi: String(x?.permissions || '0'),
  })).filter((x) => x.id);
  return { ok: true, ruoli: lista };
}

// Il server: il nome, per far vedere allo streamer che si e' collegato al suo.
// E con lui i quattro canali che Discord tiene per se' nei server Community: non
// sono un elenco che manteniamo noi, e' il server stesso a dire quali sono, e
// per questo non possono finire fra quelli da togliere.
export async function server(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}`);
  if (!r.ok) return r;
  const d = r.dati || {};
  const forse = (v) => (v ? String(v) : null);
  return {
    ok: true,
    id: String(d.id || guild),
    nome: String(d.name || ''),
    guild: {
      id: String(d.id || guild),
      nome: String(d.name || ''),
      rules_channel_id: forse(d.rules_channel_id),
      public_updates_channel_id: forse(d.public_updates_channel_id),
      safety_alerts_channel_id: forse(d.safety_alerts_channel_id),
      system_channel_id: forse(d.system_channel_id),
      community: (d.features || []).includes('COMMUNITY'),
    },
  };
}

// Chi e' il bot e che ruoli ha DENTRO quel server: da qui esce la sua altezza.
export async function io(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const me = await chiama(token, '/users/@me');
  if (!me.ok) return me;
  const id = String(me.dati?.id || '');
  if (!id) return { ok: false, errore: 'Discord non dice chi e\' il bot' };
  const m = await chiama(token, `/guilds/${guild}/members/${id}`);
  if (!m.ok) {
    if (m.assente) return { ok: false, errore: 'il bot non e\' dentro quel server: invitalo prima' };
    return m;
  }
  return { ok: true, id, nome: String(me.dati?.username || ''), ruoli: (m.dati?.roles || []).map(String) };
}

// Un membro. Chi non c'e' non e' un guasto: torna { ok:true, dentro:false }.
export async function membro(token, guild, utente) {
  if (!idOk(guild) || !idOk(utente)) return { ok: false, errore: 'id non valido' };
  const r = await chiama(token, `/guilds/${guild}/members/${utente}`);
  if (r.assente) return { ok: true, dentro: false, ruoli: [] };
  if (!r.ok) return r;
  return {
    ok: true,
    dentro: true,
    ruoli: (r.dati?.roles || []).map(String),
    nome: String(r.dati?.nick || r.dati?.user?.global_name || r.dati?.user?.username || ''),
  };
}

export async function dai(token, guild, utente, ruolo) {
  if (!idOk(guild) || !idOk(utente) || !idOk(ruolo)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/members/${utente}/roles/${ruolo}`, { metodo: 'PUT' });
}

export async function togli(token, guild, utente, ruolo) {
  if (!idOk(guild) || !idOk(utente) || !idOk(ruolo)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/members/${utente}/roles/${ruolo}`, { metodo: 'DELETE' });
}

// IL TOKEN CON CUI SI PARLA. Il suo, se se n'e' portato uno; sennò il nostro.
// Un campo vuoto non vuol dire «niente bot»: vuol dire «quello della casa».
export const tokenDi = (riga) => String(riga?.token || '').trim() || String(config.discordApp?.botToken || '').trim();

// ------------------------------------------------------------ invitare il bot
// Il giro che toglie di mezzo il tutorial: lo streamer clicca, Discord gli mostra
// LA SUA scelta del server (solo quelli dove e' amministratore), lui conferma il
// permesso e il bot entra.
//
// Chiediamo un permesso solo, «Gestire i ruoli», perche' e' l'unico che serve:
// una lista lunga di permessi su una schermata di conferma e' il modo migliore
// per farsi dire di no, e sarebbe anche potere che non ci serve.
//
// L'ID DEL SERVER NON ARRIVA DALLA QUERY. Discord lo rimanda anche li'
// (`guild_id`), ma quella query passa dal browser di chi autorizza e si
// riscrive: chi volesse potrebbe puntare le proprie regole al server di un
// altro streamer dove il nostro bot e' gia' dentro. Quello buono sta nella
// RISPOSTA dello scambio del codice, che arriva da Discord a noi.
// I permessi che chiediamo all'invito. Erano solo «Gestire i ruoli»; col
// costruttore serve anche «Gestire i canali» — e chi ha gia' invitato il bot
// deve ripassare dal tasto, perche' reinvitare aggiorna i permessi. Non lo si
// lascia scoprire da un errore: `puoCanali()` lo dice prima.
export const MANAGE_ROLES = 1n << 28n;      // 268435456
export const MANAGE_CHANNELS = 1n << 4n;    // 16
export const ADMINISTRATOR = 1n << 3n;      // 8
// I tre che servono al bot per DIRE una cosa. Da quando sta dentro il server,
// l'avviso di diretta non ha piu' bisogno di un webhook creato a mano: lo
// scrive lui nel canale scelto. Per farlo deve vedere il canale, poterci
// scrivere, e poter far comparire il riquadro — un avviso senza anteprima e'
// una riga di testo.
export const VIEW_CHANNEL = 1n << 10n;      // 1024
export const SEND_MESSAGES = 1n << 11n;     // 2048
export const EMBED_LINKS = 1n << 14n;       // 16384
export const PERMESSI_BOT = String(MANAGE_ROLES | MANAGE_CHANNELS | VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS);

// I permessi che il bot ha nel server: l'unione di quelli dei suoi ruoli. Si
// calcolano da cose che chiediamo GIA' (l'elenco dei ruoli e quelli del bot),
// senza una chiamata in piu'. Chi e' amministratore li ha tutti per definizione,
// ed e' la regola di Discord, non una nostra semplificazione.
export function permessiBot(ruoli, ruoliBot) {
  const miei = new Set((ruoliBot || []).map(String));
  let bits = 0n;
  for (const r of (ruoli || [])) {
    if (!miei.has(String(r?.id))) continue;
    try { bits |= BigInt(r?.permessi ?? r?.permissions ?? 0); } catch { /* niente */ }
  }
  return bits;
}

export const puo = (bits, flag) => {
  const b = typeof bits === 'bigint' ? bits : BigInt(bits || 0);
  return (b & ADMINISTRATOR) === ADMINISTRATOR || (b & flag) === flag;
};
export const puoCanali = (bits) => puo(bits, MANAGE_CHANNELS);
export const puoRuoli = (bits) => puo(bits, MANAGE_ROLES);
export const puoVedere = (bits) => puo(bits, VIEW_CHANNEL);
export const puoScrivere = (bits) => puo(bits, SEND_MESSAGES);
export const puoIncorniciare = (bits) => puo(bits, EMBED_LINKS);

// COSA PUO' IL BOT DENTRO UN CANALE, che non e' quello che puo' nel server.
//
// Le regole del singolo canale battono quelle generali: un ruolo che nel
// server puo' scrivere, in un canale dove «tutti» ha il divieto, sta zitto. E'
// il motivo per cui guardare i soli permessi del server direbbe di si' e poi
// l'avviso non partirebbe.
//
// L'ordine qui sotto e' quello di Discord, non uno nostro: si parte dai
// permessi dei ruoli, poi la riga di @everyone (prima il divieto, poi il
// permesso), poi le righe dei ruoli tutte insieme, e in fondo quella della
// persona — che vince su tutto. Chi e' amministratore salta la fila.
export function permessiNelCanale({ ruoli = [], guildId, bot = {}, bits } = {}, canale) {
  let base = 0n;
  try { base = typeof bits === 'bigint' ? bits : BigInt(bits || 0); } catch { base = 0n; }
  if ((base & ADMINISTRATOR) === ADMINISTRATOR) return base;
  const righe = new Map((canale?.overwrites || []).map((o) => [String(o.id), o]));
  const leggi = (o) => {
    let a = 0n; let d = 0n;
    try { a = BigInt(o?.allow || 0); } catch { a = 0n; }
    try { d = BigInt(o?.deny || 0); } catch { d = 0n; }
    return { a, d };
  };
  const tutti = righe.get(String(guildId));
  if (tutti) { const { a, d } = leggi(tutti); base = (base & ~d) | a; }
  let nega = 0n; let da = 0n;
  for (const id of (bot.ruoli || []).map(String)) {
    const o = righe.get(id);
    if (!o) continue;
    const { a, d } = leggi(o);
    nega |= d; da |= a;
  }
  base = (base & ~nega) | da;
  const mia = righe.get(String(bot.id));
  if (mia) { const { a, d } = leggi(mia); base = (base & ~d) | a; }
  return base;
}

// QUANDO, da un id. Dentro uno snowflake di Discord c'e' il momento in cui e'
// nato: e' cosi' che si sa «questo canale non parla da otto mesi» SENZA leggere
// un solo messaggio — l'ultimo messaggio di un canale e' un id, e l'id porta la
// sua data. Niente occhi sulle conversazioni di nessuno, e nemmeno il permesso
// per averli.
const EPOCA = 1420070400000n;
export function quandoDa(snowflake) {
  const t = String(snowflake || '');
  if (!/^[0-9]{5,24}$/.test(t)) return 0;
  try { return Number((BigInt(t) >> 22n) + EPOCA); } catch { return 0; }
}

export function urlInvitoBot({ clientId, redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: String(clientId || ''),
    scope: 'bot',
    permissions: PERMESSI_BOT,
    response_type: 'code',
    redirect_uri: String(redirectUri || ''),
    state: String(state || ''),
  });
  return 'https://discord.com/oauth2/authorize?' + p.toString();
}

export async function scambiaInvito({ clientId, clientSecret, redirectUri, codice }) {
  if (!clientId || !clientSecret || !codice) return { ok: false, errore: 'collegamento non configurato' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API + '/oauth2/token', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: new URLSearchParams({
        client_id: String(clientId),
        client_secret: String(clientSecret),
        grant_type: 'authorization_code',
        code: String(codice),
        redirect_uri: String(redirectUri || ''),
      }).toString(),
    });
    if (!r.ok) return { ok: false, errore: 'Discord non ha riconosciuto il codice' };
    const d = await r.json().catch(() => null);
    const id = String(d?.guild?.id || '');
    if (!idOk(id)) return { ok: false, errore: 'Discord non dice in quale server e\' entrato' };
    return { ok: true, guild: id, nome: String(d?.guild?.name || '').slice(0, 100) };
  } catch (e) {
    log.warn('scambiaInvito:', e?.message || e);
    return { ok: false, errore: 'Discord irraggiungibile' };
  } finally { clearTimeout(to); }
}

// ---------------------------------------------------------------- riconoscere
// L'altra meta' del filo, e ha un'autorita' diversa: qui non parla il bot di
// uno streamer, parla l'applicazione che chiede a una persona «sei tu?». Puo'
// leggere il suo id e il suo nome, e nient'altro: lo scope e' `identify`, e non
// entra in nessun server.
export function urlAutorizzazione({ clientId, redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: String(clientId || ''),
    redirect_uri: String(redirectUri || ''),
    response_type: 'code',
    scope: 'identify',
    state: String(state || ''),
    prompt: 'none',
  });
  return 'https://discord.com/oauth2/authorize?' + p.toString();
}

// Il codice di ritorno diventa un nome e un id. Il segreto dell'applicazione
// viaggia nel corpo, come vuole Discord, e non esce mai di qui.
export async function scambiaCodice({ clientId, clientSecret, redirectUri, codice }) {
  if (!clientId || !clientSecret || !codice) return { ok: false, errore: 'collegamento non configurato' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API + '/oauth2/token', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: new URLSearchParams({
        client_id: String(clientId),
        client_secret: String(clientSecret),
        grant_type: 'authorization_code',
        code: String(codice),
        redirect_uri: String(redirectUri || ''),
      }).toString(),
    });
    if (!r.ok) return { ok: false, errore: 'Discord non ha riconosciuto il codice' };
    const d = await r.json().catch(() => null);
    const tok = String(d?.access_token || '');
    if (!tok) return { ok: false, errore: 'Discord non ha dato un permesso' };
    const u = await fetch(API + '/users/@me', {
      signal: ac.signal,
      headers: { Authorization: 'Bearer ' + tok, 'User-Agent': UA },
    });
    if (!u.ok) return { ok: false, errore: 'Discord non dice chi sei' };
    const me = await u.json().catch(() => null);
    const id = String(me?.id || '');
    if (!idOk(id)) return { ok: false, errore: 'Discord non dice chi sei' };
    return { ok: true, id, nome: String(me?.global_name || me?.username || '') };
  } catch (e) {
    log.warn('scambiaCodice:', e?.message || e);
    return { ok: false, errore: 'Discord irraggiungibile' };
  } finally { clearTimeout(to); }
}

// ------------------------------------------------------------ i canali
// Di un canale si prende la FORMA, mai il contenuto: come si chiama, di che
// tipo e', dove sta, che permessi ha scritti sopra. E una data: quella
// dell'ultimo messaggio.
//
// Quella data non arriva da un messaggio letto. Arriva dall'ID dell'ultimo
// messaggio, e dentro un id di Discord c'e' l'istante in cui e' nato. Cosi' il
// costruttore puo' dire «questo canale non parla da otto mesi» senza aprire una
// conversazione di nessuno — e senza chiedere il permesso per poterlo fare.
// Non e' discrezione: e' che quel permesso non ce l'abbiamo proprio.
const pulisciCanale = (x) => ({
  id: String(x?.id || ''),
  nome: String(x?.name || ''),
  tipo: Number(x?.type) || 0,
  parent_id: x?.parent_id ? String(x.parent_id) : null,
  posizione: Number(x?.position) || 0,
  argomento: String(x?.topic || ''),
  overwrites: (Array.isArray(x?.permission_overwrites) ? x.permission_overwrites : []).map((o) => ({
    id: String(o?.id || ''),
    tipo: Number(o?.type) || 0,
    allow: String(o?.allow || '0'),
    deny: String(o?.deny || '0'),
  })).filter((o) => o.id),
  nato: quandoDa(x?.id),
  ultimoMessaggio: quandoDa(x?.last_message_id),
});

export async function canali(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/channels`);
  if (!r.ok) return r;
  return { ok: true, canali: (Array.isArray(r.dati) ? r.dati : []).map(pulisciCanale).filter((x) => x.id) };
}

// I permessi come li scrive Discord. Il `tipo` dice se quella riga parla di un
// ruolo (0) o di una persona (1); noi useremo quasi sempre i ruoli, ma la riga
// per la singola persona serve al varco d'ingresso.
const permessiVerso = (p) => (Array.isArray(p) ? p : []).filter((x) => idOk(x?.id)).map((x) => ({
  id: String(x.id),
  type: Number(x.tipo ?? x.type ?? 0) === 1 ? 1 : 0,
  allow: String(x.allow || '0'),
  deny: String(x.deny || '0'),
}));

export async function creaCanale(token, guild, c) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const nome = String(c?.nome || '').trim().slice(0, 100);
  if (!nome) return { ok: false, errore: 'un canale senza nome non si crea' };
  const corpo = { name: nome, type: Number(c?.tipo) || 0 };
  if (idOk(c?.dentroId)) corpo.parent_id = String(c.dentroId);
  if (c?.argomento) corpo.topic = String(c.argomento).slice(0, 1024);
  const ow = permessiVerso(c?.permessi);
  if (ow.length) corpo.permission_overwrites = ow;
  const r = await chiama(token, `/guilds/${guild}/channels`, { metodo: 'POST', corpo });
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || ''), nome: String(r.dati?.name || nome) };
}

// Sistemare non e' sovrascrivere: si manda solo quello che cambia. L'unica
// eccezione e' l'elenco dei permessi, che Discord sostituisce sempre per
// intero — per questo chi chiama deve passare l'elenco GIA' fuso con quello di
// adesso, e non solo i permessi nuovi (lo fa `fondiPermessi`).
export async function sistemaCanale(token, id, cambia) {
  if (!idOk(id)) return { ok: false, errore: 'id del canale non valido' };
  const corpo = {};
  if (cambia?.nome) corpo.name = String(cambia.nome).trim().slice(0, 100);
  if (cambia?.argomento !== undefined) corpo.topic = String(cambia.argomento || '').slice(0, 1024);
  if (cambia?.dentroId !== undefined) corpo.parent_id = idOk(cambia.dentroId) ? String(cambia.dentroId) : null;
  if (Array.isArray(cambia?.permessi)) corpo.permission_overwrites = permessiVerso(cambia.permessi);
  if (!Object.keys(corpo).length) return { ok: true, dati: null, niente: true };
  return chiama(token, `/channels/${id}`, { metodo: 'PATCH', corpo });
}

// Il bot dice una cosa in un canale. Niente nome ne' faccia per messaggio:
// quelli erano del webhook, e un bot non li puo' cambiare a ogni riga — parla
// col nome che ha. Va detto a chi ne aveva messo uno, invece di farglielo
// scoprire dalla prima diretta.
export async function mandaMessaggio(token, canale, messaggio) {
  if (!idOk(canale)) return { ok: false, errore: 'id del canale non valido' };
  const corpo = {};
  if (messaggio?.content) corpo.content = String(messaggio.content).slice(0, 2000);
  if (Array.isArray(messaggio?.embeds) && messaggio.embeds.length) corpo.embeds = messaggio.embeds.slice(0, 10);
  if (messaggio?.allowed_mentions) corpo.allowed_mentions = messaggio.allowed_mentions;
  if (!corpo.content && !corpo.embeds) return { ok: false, errore: 'un messaggio vuoto non si manda' };
  const r = await chiama(token, `/channels/${canale}/messages`, { metodo: 'POST', corpo });
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || '') };
}

export async function togliCanale(token, id) {
  if (!idOk(id)) return { ok: false, errore: 'id del canale non valido' };
  return chiama(token, `/channels/${id}`, { metodo: 'DELETE' });
}

// UN RUOLO SI SCRIVE COME UN CANALE, con una differenza che conta: il colore.
// Discord lo vuole come numero, e 0 non e' «nero», e' «nessun colore» — cioe'
// il grigio di chi non ne ha. Percio' si manda sempre, anche quando e' zero:
// non mandarlo vorrebbe dire «lascia quello di prima», e un ruolo che doveva
// tornare senza colore resterebbe colorato.
const corpoRuolo = (r, { nuovo = false } = {}) => {
  const c = {};
  if (r?.nome !== undefined) c.name = String(r.nome || '').trim().slice(0, 100);
  if (r?.colore !== undefined || nuovo) c.color = Math.max(0, Math.min(0xffffff, Number(r?.colore) || 0));
  if (r?.separato !== undefined || nuovo) c.hoist = !!r?.separato;
  if (r?.citabile !== undefined || nuovo) c.mentionable = !!r?.citabile;
  if (r?.permessi !== undefined || nuovo) c.permissions = String(r?.permessi ?? '0');
  return c;
};

export async function creaRuolo(token, guild, r) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const corpo = corpoRuolo(r, { nuovo: true });
  if (!corpo.name) return { ok: false, errore: 'un ruolo senza nome non si crea' };
  const x = await chiama(token, `/guilds/${guild}/roles`, { metodo: 'POST', corpo });
  if (!x.ok) return x;
  return { ok: true, id: String(x.dati?.id || ''), nome: String(x.dati?.name || corpo.name) };
}

export async function sistemaRuolo(token, guild, id, cambia) {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  const corpo = corpoRuolo(cambia);
  if (!Object.keys(corpo).length) return { ok: true, dati: null, niente: true };
  return chiama(token, `/guilds/${guild}/roles/${id}`, { metodo: 'PATCH', corpo });
}

export async function togliRuolo(token, guild, id) {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/roles/${id}`, { metodo: 'DELETE' });
}

// LA FOTOGRAFIA: com'e' il server adesso, nella forma esatta che il calcolo
// della differenza si aspetta. Quattro letture, una volta sola, e da qui in poi
// nessuno va piu' a chiedere niente a Discord per decidere: si decide su questa.
// Se si leggesse un pezzo alla volta mentre si costruisce, il server potrebbe
// cambiare a meta' strada e la differenza non sarebbe piu' quella mostrata.
export async function fotografia(token, guild) {
  const s = await server(token, guild);
  if (!s.ok) return s;
  const me = await io(token, guild);
  if (!me.ok) return me;
  const r = await ruoli(token, guild);
  if (!r.ok) return r;
  const c = await canali(token, guild);
  if (!c.ok) return c;
  const bits = permessiBot(r.ruoli, me.ruoli);
  // FIN DOVE ARRIVA IL BOT. Discord: un bot tocca solo i ruoli piu' in basso
  // del suo piu' alto. Non e' una cortesia da ricordarsi al momento giusto: e'
  // il numero che tiene fuori dall'elenco delle cose da fare tutto quello che
  // non e' suo da toccare.
  const miei = new Set((me.ruoli || []).map(String));
  const livello = r.ruoli.reduce((t, x) => (miei.has(String(x.id)) ? Math.max(t, Number(x.position) || 0) : t), 0);
  return {
    ok: true,
    guild: s.guild,
    ruoli: r.ruoli,
    canali: c.canali,
    bot: { id: me.id, nome: me.nome, ruoli: me.ruoli, livello },
    // I BIT COSI' COME SONO, e non solo i due «puo' / non puo'». Servono a
    // rispondere prima a una domanda che Discord pone e basta: un bot puo'
    // dare a un ruolo SOLO i privilegi che ha lui. Senza i bit in mano, quel
    // limite si scoprirebbe da un errore a meta' costruzione.
    bits: String(bits),
    puoCanali: puoCanali(bits),
    puoRuoli: puoRuoli(bits),
  };
}

// La prova che si fa dal pannello: il token vale, il bot e' dentro, e questi
// sono i ruoli che puo' davvero muovere.
export async function prova(token, guild) {
  const s = await server(token, guild);
  if (!s.ok) return s;
  const me = await io(token, guild);
  if (!me.ok) return me;
  const r = await ruoli(token, guild);
  if (!r.ok) return r;
  return { ok: true, server: s.nome, bot: me.nome, ruoliBot: me.ruoli, ruoli: r.ruoli };
}
