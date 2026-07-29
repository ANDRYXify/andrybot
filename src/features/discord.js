// Notifiche Discord: ogni streamer collega un WEBHOOK di un canale del PROPRIO
// server Discord (Impostazioni canale → Integrazioni → Webhook → copia URL).
// Quando va in diretta, il bot posta lì un avviso con un embed ricco (titolo,
// gioco, spettatori, miniatura). Nessun bot da creare, nessun token da gestire,
// nessuna connessione gateway: il webhook è il modo più semplice e robusto per
// scrivere in un canale Discord, e può avere nome + avatar personalizzati.
//
// Sicurezza: parliamo SOLO con host Discord fissi (discord.com / discordapp.com,
// anche canary/ptb). L'URL è fornito dallo streamer: la regex stretta evita che
// venga usato per SSRF verso host arbitrari. Timeout su ogni chiamata.
import { makeLog } from '../logger.js';

const log = makeLog('discord');

const TIMEOUT_MS = 8000;
const VIOLA = 0x9146ff;   // colore Twitch (barra dell'embed)
// webhook Discord valido: https://<discord(app).com|canary/ptb>/api/webhooks/<id>/<token>
const WEBHOOK_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+$/;

export function webhookValido(url) { return WEBHOOK_RE.test(String(url || '').trim()); }

// Messaggio di default (modificabile). Segnaposto: {nome} {titolo} {gioco} {spettatori} {link}
export const MESSAGGIO_DEFAULT = '🔴 **{nome}** è in diretta ora! 👉 {link}';

function risolvi(streamer, info, template) {
  const login = String(streamer?.login || '').toLowerCase();
  const valori = {
    nome: streamer?.display || login,
    titolo: info?.title || 'In diretta ora!',
    gioco: info?.game_name || 'Just Chatting',
    spettatori: String(info?.viewer_count ?? 0),
    link: `https://twitch.tv/${login}`,
    login,
  };
  const t = (template && String(template).trim()) || MESSAGGIO_DEFAULT;
  return t.replace(/\{(nome|titolo|gioco|spettatori|link|login)\}/g, (_, k) => valori[k]);
}

// Miniatura dello stream (helix dà un url con {width}x{height} da riempire).
function miniatura(info) {
  const u = info?.thumbnail_url;
  if (!u || typeof u !== 'string') return '';
  return u.replace('{width}', '1280').replace('{height}', '720');
}

// Embed "è live" per l'avviso.
function embedLive(streamer, info) {
  const login = String(streamer?.login || '').toLowerCase();
  const emb = {
    title: `🔴 ${streamer?.display || login} è in diretta!`,
    url: `https://twitch.tv/${login}`,
    description: info?.title || undefined,
    color: VIOLA,
    fields: [
      { name: '🎮 Gioco', value: String(info?.game_name || 'Just Chatting').slice(0, 100), inline: true },
      { name: '👥 Spettatori', value: String(info?.viewer_count ?? 0), inline: true },
    ],
    footer: { text: 'SocialBot • Twitch' },
  };
  const img = miniatura(info);
  if (img) emb.image = { url: img + `?t=${Math.floor(Date.now() / 1000)}` };   // cache-buster
  return emb;
}

// POST al webhook. `payload` è il body JSON. Ritorna { ok } | { ok:false, errore }.
async function invia(webhook, payload) {
  if (!webhookValido(webhook)) return { ok: false, errore: 'webhook non valido' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(webhook, {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'SocialBot/1.0' },
      body: JSON.stringify(payload),
    });
    if (r.status === 204 || r.status === 200) return { ok: true };
    if (r.status === 404 || r.status === 401) return { ok: false, errore: 'webhook inesistente o revocato', morto: true };
    if (r.status === 429) return { ok: false, errore: 'troppe richieste, riprova tra poco' };
    let d = null; try { d = await r.json(); } catch { /* niente */ }
    return { ok: false, errore: d?.message || ('HTTP ' + r.status) };
  } catch (e) { log.warn('invia:', e?.message || e); return { ok: false, errore: 'Discord irraggiungibile' }; }
  finally { clearTimeout(to); }
}

// Verifica che il webhook esista davvero (GET). Ritorna { ok, nomeCanale } | { ok:false }.
export async function verifica(webhook) {
  if (!webhookValido(webhook)) return { ok: false, errore: 'URL non valido: incolla il webhook completo del canale Discord' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(webhook, { signal: ac.signal, headers: { 'User-Agent': 'SocialBot/1.0' } });
    if (!r.ok) return { ok: false, errore: r.status === 404 ? 'webhook inesistente (ricrealo nel canale)' : ('HTTP ' + r.status) };
    const d = await r.json().catch(() => null);
    return { ok: true, nome: d?.name || '', canale: d?.channel_id || '' };
  } catch (e) { return { ok: false, errore: 'Discord irraggiungibile' }; }
  finally { clearTimeout(to); }
}

// Avviso "è live". `conf` = { webhook, messaggio, nome_bot, avatar }.
export async function notificaLive(conf, streamer, info) {
  if (!conf?.webhook) return { ok: false, errore: 'discord non configurato' };
  const payload = {
    content: risolvi(streamer, info, conf.messaggio),
    embeds: [embedLive(streamer, info)],
    allowed_mentions: { parse: ['roles', 'everyone'] },   // permette @everyone/@role SOLO se scritti dallo streamer nel messaggio
  };
  if (conf.nome_bot) payload.username = String(conf.nome_bot).slice(0, 80);
  if (conf.avatar && /^https:\/\//.test(conf.avatar)) payload.avatar_url = conf.avatar;
  const r = await invia(conf.webhook, payload);
  if (!r.ok) log.warn(`notifica live #${streamer?.login}: ${r.errore}`);
  return r;
}

// Messaggio di prova (dalla dashboard).
export async function prova(conf, streamer) {
  if (!conf?.webhook) return { ok: false, errore: 'discord non configurato' };
  const payload = {
    content: '✅ Collegamento riuscito! Qui arriveranno i tuoi avvisi **quando vai in diretta**.',
    embeds: [embedLive(streamer, { title: 'Esempio di avviso live', game_name: 'Just Chatting', viewer_count: 0 })],
  };
  if (conf.nome_bot) payload.username = String(conf.nome_bot).slice(0, 80);
  if (conf.avatar && /^https:\/\//.test(conf.avatar)) payload.avatar_url = conf.avatar;
  return invia(conf.webhook, payload);
}
