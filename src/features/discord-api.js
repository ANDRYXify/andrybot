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
  })).filter((x) => x.id);
  return { ok: true, ruoli: lista };
}

// Il server: il nome, per far vedere allo streamer che si e' collegato al suo.
export async function server(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}`);
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || guild), nome: String(r.dati?.name || '') };
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
