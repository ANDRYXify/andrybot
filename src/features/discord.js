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
import * as api from './discord-api.js';

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

// POST al webhook. `payload` è il body JSON. Ritorna { ok, id } | { ok:false, errore }.
//
// `?wait=true` serve a farsi restituire il messaggio appena scritto: senza,
// Discord risponde «204, fatto» e basta, e senza il suo id l'avviso non si puo'
// togliere quando la diretta finisce. La levetta ci sarebbe e non farebbe niente.
async function invia(webhook, payload, { voglioIndietro = true } = {}) {
  if (!webhookValido(webhook)) return { ok: false, errore: 'webhook non valido' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(webhook + (voglioIndietro ? '?wait=true' : ''), {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'SocialBot/1.0' },
      body: JSON.stringify(payload),
    });
    if (r.status === 200) {
      let d = null; try { d = await r.json(); } catch { /* niente */ }
      return { ok: true, id: String(d?.id || '') };
    }
    if (r.status === 204) return { ok: true, id: '' };
    if (r.status === 404 || r.status === 401) return { ok: false, errore: 'webhook inesistente o revocato', morto: true };
    if (r.status === 429) return { ok: false, errore: 'troppe richieste, riprova tra poco' };
    let d = null; try { d = await r.json(); } catch { /* niente */ }
    return { ok: false, errore: d?.message || ('HTTP ' + r.status) };
  } catch (e) { log.warn('invia:', e?.message || e); return { ok: false, errore: 'Discord irraggiungibile' }; }
  finally { clearTimeout(to); }
}

// DUE STRADE PER DIRE LA STESSA COSA, e una sola che le sceglie.
//
// Il webhook e' la strada vecchia: lo streamer lo crea a mano nelle
// impostazioni del canale e incolla qui un indirizzo segreto. Funziona, ma e'
// un passaggio a carico suo — e da quando il bot sta DENTRO il server non
// serve piu': puo' scrivere lui.
//
// Il webhook non si spegne per questo. Chi ce l'ha continua a funzionare senza
// fare niente: togliere una strada che gira vorrebbe dire spegnere gli avvisi
// a qualcuno in cambio di un miglioramento che non ha chiesto.
//
// Il nome e la faccia per messaggio sono del webhook e restano suoi: un bot
// parla col nome che ha. Chi passa al canale lo deve sapere prima, non
// scoprirlo dalla prima diretta.
export const configurato = (c) => !!(c && ((c.canale && c.token) || c.webhook));

export async function manda(conf, payload) {
  if (conf?.canale && conf?.token) {
    const r = await api.mandaMessaggio(conf.token, conf.canale, payload);
    if (r.ok) return r;
    // 403 qui vuol dire una cosa sola e precisa: il canale c'e', il bot c'e',
    // ma li' dentro non puo' parlare. La cura non e' riprovare.
    if (r.stato === 403) return { ...r, muto: true, errore: 'il bot non puo\' scrivere in quel canale' };
    if (r.stato === 404) return { ...r, morto: true, errore: 'quel canale non c\'e\' piu\'' };
    return r;
  }
  if (!conf?.webhook) return { ok: false, errore: 'discord non configurato' };
  const conVeste = { ...payload };
  if (conf.nome_bot) conVeste.username = String(conf.nome_bot).slice(0, 80);
  if (conf.avatar && /^https:\/\//.test(conf.avatar)) conVeste.avatar_url = conf.avatar;
  return invia(conf.webhook, conVeste);
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
  if (!configurato(conf)) return { ok: false, errore: 'discord non configurato' };
  const payload = {
    content: risolvi(streamer, info, conf.messaggio),
    embeds: [embedLive(streamer, info)],
    allowed_mentions: { parse: ['roles', 'everyone'] },   // permette @everyone/@role SOLO se scritti dallo streamer nel messaggio
  };
  const r = await manda(conf, payload);
  if (!r.ok) log.warn(`notifica live #${streamer?.login}: ${r.errore}`);
  return r;
}

// AVVISO «È LIVE» PER QUALUNQUE PIATTAFORMA.
// `d` e' la diretta nella forma comune (vedi features/avvisi.js): Discord non
// deve sapere se dietro c'e' Twitch, Kick o YouTube. I campi che una piattaforma
// non fornisce (il gioco, gli spettatori) non diventano uno zero finto: la loro
// riga semplicemente non compare.
const COLORI = { twitch: VIOLA, kick: 0x53fc18, youtube: 0xff0000, tiktok: 0x000000 };
const NOMI = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube', tiktok: 'TikTok' };

// L'INCORNICIATO della diretta. Sta in una funzione sua perche' lo usano in
// due: l'avviso che parte da solo e quello che parte verso piu' canali. Due
// copie vorrebbero dire due incorniciati che col tempo diventano diversi.
export function incornicia(d) {
  const p = String(d?.piattaforma || 'twitch');
  const campi = [];
  if (d?.gioco) campi.push({ name: '🎮 Gioco', value: String(d.gioco).slice(0, 100), inline: true });
  if (d?.spettatori != null) campi.push({ name: '👥 Spettatori', value: String(d.spettatori), inline: true });

  const emb = {
    title: `🔴 ${d?.display || d?.login} è in diretta${p === 'twitch' ? '' : ' su ' + (NOMI[p] || p)}!`,
    url: d?.url,
    description: d?.titolo || undefined,
    color: COLORI[p] ?? VIOLA,
    ...(campi.length ? { fields: campi } : {}),
    footer: { text: 'SocialBot • ' + (NOMI[p] || p) },
  };
  if (d?.miniatura) emb.image = { url: d.miniatura + `?t=${Math.floor(Date.now() / 1000)}` };
  return emb;
}

// IL TESTO DI UN AVVISO, per qualunque piattaforma. Gli stessi segnaposto di
// Telegram: chi scrive il messaggio non deve imparare due lingue perche' lo
// manda in due posti. Quello che non c'e' non diventa uno zero finto — la sua
// riga sparisce, come di la'.
//
// Qui si sfugge per il markdown e non per l'HTML: un titolo con un asterisco
// dentro, su Discord, si porterebbe via meta' messaggio in corsivo.
const escMd = (s) => String(s ?? '').replace(/([\\`*_~|])/g, '\\$1');

export const TESTO_DEFAULT = '🔴 **{nome}** è in diretta · {link}';

export function testoDiretta(d, template = '') {
  if (!d) return '';
  const valori = {
    nome: escMd(d.display || d.login),
    titolo: escMd(d.titolo || ''),
    gioco: escMd(d.gioco || ''),
    spettatori: d.spettatori == null ? '' : String(d.spettatori),
    link: d.url || '',
    login: escMd(d.login || ''),
    piattaforma: NOMI[String(d.piattaforma || '')] || String(d.piattaforma || ''),
  };
  const t = (template && String(template).trim()) || TESTO_DEFAULT;
  return t.replace(/\{(nome|titolo|gioco|spettatori|link|login|piattaforma)\}/g, (_, k) => valori[k] ?? '')
    .split('\n')
    .filter((r, i, tutte) => r.trim() !== '' || (i > 0 && i < tutte.length - 1 && tutte[i - 1].trim() !== ''))
    .join('\n')
    .replace(/^[^\p{L}\p{N}]*$/gmu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1800);
}

// LO STESSO AVVISO A PIU' CANALI, ognuno col suo testo e il suo ruolo da
// chiamare. Sequenziale di proposito, come di la': Discord limita la frequenza,
// e un canale che rifiuta non deve impedire agli altri di ricevere.
//
// La menzione: `allowed_mentions` elenca SOLO il ruolo scelto per QUELLA
// destinazione. Prima era `parse: ['roles','everyone']` per tutti, cioe' un
// «@everyone» scritto per sbaglio nel testo svegliava l'intero server.
export async function diffondi(token, dest, d, { conIncorniciato = true } = {}) {
  const emb = conIncorniciato ? incornicia(d) : null;
  const out = [];
  for (const t of (dest || [])) {
    const testo = testoDiretta(d, t.messaggio);
    const ruolo = String(t.ruolo || '').replace(/[^0-9]/g, '');
    const payload = {
      content: ((ruolo ? `<@&${ruolo}> ` : '') + testo).slice(0, 1990),
      allowed_mentions: ruolo ? { roles: [ruolo] } : { parse: [] },
    };
    if (emb) payload.embeds = [emb];
    // Il posto e' un canale del server o un webhook: chi aveva la strada vecchia
    // continua a ricevere senza aver fatto niente. Cambia solo chi bussa.
    const r = await (t.webhook
      ? invia(t.webhook, payload)
      : api.mandaMessaggio(token, t.canale, payload))
      .catch((e) => ({ ok: false, errore: e?.message || String(e) }));
    if (!r.ok) log.warn(`discord → ${t.canale_nome || t.canale}: ${r.errore}`);
    out.push({ dest: t, ...r });
  }
  return out;
}

// CHIUDERE UN AVVISO: l'avviso non si cancella, si RISCRIVE.
//
// Cancellare vorrebbe dire usare la porta che, coi privilegi che il bot tiene
// per passarli, cancella il messaggio di chiunque. Riscrivere no: Discord
// rifiuta sempre la modifica di un messaggio di un altro, qualunque permesso si
// abbia — quindi questa strada, puntata altrove, non fa niente. E' anche piu'
// onesta verso chi c'era: la riga resta, e dice che la diretta e' finita.
export const TESTO_FINITA = '⚫ La diretta è finita.';

export function testoFinita(d, quando = null) {
  const nome = d?.display || d?.login || '';
  const ora = quando ? ` · ${quando}` : '';
  return nome ? `⚫ **${nome}** ha finito la diretta${ora}` : TESTO_FINITA + ora;
}

export async function chiudiMessaggio(token, dove, msgId, testo = TESTO_FINITA) {
  if (!msgId) return { ok: false, errore: 'nessun avviso da chiudere' };
  const corpo = { content: String(testo || TESTO_FINITA).slice(0, 1990), embeds: [], allowed_mentions: { parse: [] } };
  const wh = String(dove?.webhook || '').trim();
  if (wh) {
    if (!webhookValido(wh)) return { ok: false, errore: 'webhook non valido' };
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(`${wh}/messages/${encodeURIComponent(msgId)}`, {
        method: 'PATCH', signal: ac.signal,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'SocialBot/1.0' },
        body: JSON.stringify(corpo),
      });
      if (r.status === 200 || r.status === 204) return { ok: true };
      if (r.status === 404) return { ok: true, sparito: true };
      return { ok: false, errore: 'HTTP ' + r.status };
    } catch { return { ok: false, errore: 'Discord irraggiungibile' }; }
    finally { clearTimeout(to); }
  }
  return api.modificaMessaggio(token, String(dove?.canale || dove || ''), msgId, corpo);
}

export async function notificaDiretta(conf, d) {
  if (!configurato(conf)) return { ok: false, errore: 'discord non configurato' };
  if (!d?.login) return { ok: false, errore: 'diretta senza streamer' };
  const payload = {
    content: String(d.testo || '').slice(0, 1800) || undefined,
    embeds: [incornicia(d)],
    allowed_mentions: { parse: ['roles', 'everyone'] },
  };
  const r = await manda(conf, payload);
  if (!r.ok) log.warn(`avviso ${d.piattaforma || 'twitch'} #${d.login}: ${r.errore}`);
  return r;
}

// Messaggio di prova (dalla dashboard).
export async function prova(conf, streamer) {
  if (!configurato(conf)) return { ok: false, errore: 'discord non configurato' };
  return manda(conf, {
    content: '✅ Collegamento riuscito! Qui arriveranno i tuoi avvisi **quando vai in diretta**.',
    embeds: [embedLive(streamer, { title: 'Esempio di avviso live', game_name: 'Just Chatting', viewer_count: 0 })],
  });
}
