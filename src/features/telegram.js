// Notifiche Telegram: ogni streamer collega il PROPRIO bot (creato con
// @BotFather, con la sua chiave) e il PROPRIO gruppo. Quando va live, il bot
// manda un messaggio nel gruppo. Nessun bot condiviso, nessuna chiave nostra:
// il token e il gruppo vivono solo nel DB di questo streamer.
//
// Scelta di progetto: SOLO chiamate HTTP "una tantum" (getMe, getUpdates,
// sendMessage). Niente long-poll, niente processi in ascolto perenne → non
// si può incastrare nulla. Il gruppo si "rileva" leggendo gli ultimi update.
import { makeLog } from '../logger.js';

const log = makeLog('telegram');

const API = 'https://api.telegram.org';
const TIMEOUT_MS = 10_000;   // ogni chiamata ha un tetto: mai restare appesi

// Messaggio di default (modificabile dallo streamer). Segnaposto disponibili:
// {nome} {titolo} {gioco} {spettatori} {link} {login}
export const MESSAGGIO_DEFAULT =
  '🔴 <b>{nome}</b> è in diretta!\n\n{titolo}\n🎮 {gioco}\n\n👉 {link}';

// --------------------------------------------------------- chiamata all'API
async function tgCall(token, metodo, { params = {}, post = false } = {}) {
  if (!token) return { ok: false, errore: 'token mancante' };
  const url = `${API}/bot${token}/${metodo}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res;
    if (post) {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: ctrl.signal,
      });
    } else {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      res = await fetch(url + (qs ? `?${qs}` : ''), { signal: ctrl.signal });
    }
    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, errore: `risposta non valida (HTTP ${res.status})` };
    if (!data.ok) return { ok: false, errore: data.description || `errore Telegram ${res.status}` };
    return { ok: true, result: data.result };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Telegram non risponde (timeout)' : (e?.message || 'errore di rete');
    return { ok: false, errore: msg };
  } finally {
    clearTimeout(to);
  }
}

// --------------------------------------------------------- validazione token
// Controlla che il token sia buono e restituisce lo @username del bot.
export async function validaToken(token) {
  const r = await tgCall(String(token || '').trim(), 'getMe');
  if (!r.ok) return { ok: false, errore: r.errore };
  return { ok: true, username: r.result?.username || '', nome: r.result?.first_name || '' };
}

// --------------------------------------------------------- scelta del gruppo
// Fra le chat che il bot ha visto, quale collegare. Regola: vince il GRUPPO (o
// canale) piu recente; se non ce n'e' nessuno, la chat privata piu recente.
// Funzione pura: l'elenco arriva da chi sa come procurarselo (il webhook, o
// getUpdates quando il webhook e spento). Cosi la REGOLA si puo provare senza
// Telegram, ed e una sola per tutti i pulsanti che collegano qualcosa.
const GRUPPI = new Set(['group', 'supergroup', 'channel']);
export function scegliGruppo(destinazioni) {
  const d = Array.isArray(destinazioni) ? destinazioni.filter((x) => x && x.chatId) : [];
  // solo il "generale" del gruppo: un topic non e' un gruppo da collegare
  const senzaTopic = d.filter((x) => !x.threadId);
  return senzaTopic.find((x) => GRUPPI.has(x.tipo))
    || senzaTopic.find((x) => x.tipo === 'private')
    || null;
}

// --------------------------------------------------------- invio
export async function inviaMessaggio(token, chatId, testo, { anteprima = true, threadId = '' } = {}) {
  const params = {
    chat_id: chatId,
    text: testo,
    parse_mode: 'HTML',
    disable_web_page_preview: !anteprima,
  };
  // topic dei gruppi in modalita forum: senza questo il messaggio finisce nel
  // «Generale» anche se lo streamer ha scelto un argomento preciso.
  const t = String(threadId || '').trim();
  if (t) params.message_thread_id = t;
  return tgCall(token, 'sendMessage', { post: true, params });
}

// Manda lo STESSO testo a piu destinazioni (gruppo, canale, topic). Sequenziale
// di proposito: Telegram limita la frequenza, e una destinazione che fallisce
// non deve impedire alle altre di ricevere. Ritorna un esito per destinazione.
export async function diffondi(token, destinazioni, testo, { anteprima = true } = {}) {
  const out = [];
  for (const d of (destinazioni || [])) {
    const r = await inviaMessaggio(token, d.chat_id, testo, { anteprima, threadId: d.thread_id })
      .catch((e) => ({ ok: false, errore: e?.message || String(e) }));
    if (!r.ok) log.warn(`telegram → ${d.titolo || d.chat_id}${d.thread_nome ? ' / ' + d.thread_nome : ''}: ${r.errore}`);
    out.push({ dest: d, ...r });
  }
  return out;
}

// Che cosa dice TELEGRAM sullo stato del webhook. Il flag nel nostro database
// puo essere disallineato (webhook messo altrove, flag azzerato, ripristino di
// un backup): l'unica fonte attendibile e chiedere a Telegram.
export async function infoWebhook(token) {
  const r = await tgCall(String(token || '').trim(), 'getWebhookInfo');
  if (!r.ok) return { ok: false, errore: r.errore };
  const url = String(r.result?.url || '');
  return {
    ok: true,
    attivo: !!url,
    url,
    inAttesa: Number(r.result?.pending_update_count || 0),
    ultimoErrore: r.result?.last_error_message || '',
  };
}

// Elenca TUTTE le destinazioni che il bot ha visto di recente: gruppi, canali e
// i singoli topic dei gruppi in modalita forum. Telegram non ha un'API per
// elencare i topic, quindi l'unico modo onesto e guardare cosa e passato:
// chi vuole un topic ci scrive dentro una volta, e da li lo troviamo.
export async function rilevaDestinazioni(token) {
  const r = await tgCall(String(token || '').trim(), 'getUpdates', {
    params: { timeout: 0, offset: -100, allowed_updates: '["message","my_chat_member","channel_post"]' },
  });
  if (!r.ok) return { ok: false, errore: r.errore };
  const updates = Array.isArray(r.result) ? r.result : [];
  const viste = new Map();
  const aggiungi = (chat, threadId, threadNome) => {
    if (!chat || !chat.id) return;
    const tid = threadId ? String(threadId) : '';
    const k = chat.id + ':' + tid;
    const prec = viste.get(k);
    viste.set(k, {
      chatId: String(chat.id),
      titolo: chat.title || chat.first_name || chat.username || '(chat)',
      tipo: chat.type || 'group',
      forum: !!chat.is_forum,
      threadId: tid,
      threadNome: threadNome || prec?.threadNome || (tid ? 'topic ' + tid : ''),
    });
  };
  for (const u of updates) {
    const m = u?.message || u?.channel_post;
    if (m?.chat) {
      const nome = m.reply_to_message?.forum_topic_created?.name || m.forum_topic_created?.name || '';
      aggiungi(m.chat, m.is_topic_message ? m.message_thread_id : '', nome);
      // il gruppo «Generale» resta comunque una destinazione valida
      if (m.is_topic_message) aggiungi(m.chat, '', '');
    }
    if (u?.my_chat_member?.chat) aggiungi(u.my_chat_member.chat, '', '');
  }
  const lista = [...viste.values()].filter((d) => d.tipo !== 'private' || d.chatId);
  if (!lista.length) {
    return { ok: false, errore: 'niente da collegare: aggiungi il bot al gruppo o al canale, scrivi un messaggio (nel topic giusto, se usi i topic) e riprova' };
  }
  return { ok: true, destinazioni: lista };
}

// --------------------------------------------------------- webhook (interattivo)
// Attiva il webhook: Telegram consegnerà gli update (messaggi) al nostro URL.
// `secret` viaggia sia nel path dell'URL sia nell'header di verifica.
export async function impostaWebhook(token, url, secret) {
  return tgCall(token, 'setWebhook', {
    post: true,
    params: { url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true },
  });
}
// Spegne il webhook (torna possibile getUpdates → rilevamento gruppo classico).
export async function rimuoviWebhook(token) {
  return tgCall(token, 'deleteWebhook', { post: true, params: { drop_pending_updates: true } });
}

// --------------------------------------------------------- membri (amministratori)
// L'API dei bot NON permette di elencare tutti i membri: gli amministratori sì.
// Utile per "seminare" il roster (il resto si riempie da chi scrive).
export async function membriAdmin(token, chatId) {
  const r = await tgCall(token, 'getChatAdministrators', { post: true, params: { chat_id: chatId } });
  if (!r.ok) return { ok: false, errore: r.errore };
  const membri = (Array.isArray(r.result) ? r.result : [])
    .map((a) => a.user)
    .filter((u) => u && !u.is_bot)
    .map((u) => ({ id: String(u.id), nome: u.first_name || u.username || '', username: u.username || '' }));
  return { ok: true, membri };
}

// --------------------------------------------------------- fissa / elimina
// Fissa in cima al gruppo l'avviso della live. Richiede che il bot sia
// AMMINISTRATORE con il permesso di fissare i messaggi: se non lo è, Telegram
// rifiuta e noi ce ne accorgiamo dal .ok (il messaggio resta comunque inviato).
export async function fissaMessaggio(token, chatId, messageId, { silenzioso = true } = {}) {
  if (!messageId) return { ok: false, errore: 'nessun messaggio da fissare' };
  return tgCall(token, 'pinChatMessage', {
    post: true,
    params: { chat_id: chatId, message_id: messageId, disable_notification: silenzioso },
  });
}

// Elimina un messaggio (il bot può cancellare i PROPRI messaggi entro 48h,
// anche senza essere amministratore). Toglie di fatto anche il "fissato".
export async function eliminaMessaggio(token, chatId, messageId) {
  if (!messageId) return { ok: false, errore: 'nessun messaggio da eliminare' };
  return tgCall(token, 'deleteMessage', {
    post: true,
    params: { chat_id: chatId, message_id: messageId },
  });
}

// --------------------------------------------------------- messaggio live
const escHtml = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function costruisciMessaggioLive(streamer, info, template) {
  const login = String(streamer?.login || '').toLowerCase();
  const link = `https://twitch.tv/${login}`;
  const valori = {
    nome: escHtml(streamer?.display || login),
    titolo: escHtml(info?.title || 'In diretta ora!'),
    gioco: escHtml(info?.game_name || 'Just Chatting'),
    spettatori: String(info?.viewer_count ?? 0),
    link,                       // il link resta "grezzo": lo linkifica Telegram
    login: escHtml(login),
  };
  const t = (template && String(template).trim()) || MESSAGGIO_DEFAULT;
  return t.replace(/\{(nome|titolo|gioco|spettatori|link|login)\}/g, (_, k) => valori[k]);
}

// Manda la notifica "è live" nel gruppo configurato. `conf` è la riga tgConf.
export async function notificaLive(conf, streamer, info) {
  if (!conf?.token || !conf?.chat_id) return { ok: false, errore: 'telegram non configurato' };
  const testo = costruisciMessaggioLive(streamer, info, conf.messaggio);
  const r = await inviaMessaggio(conf.token, conf.chat_id, testo, { anteprima: true });
  if (!r.ok) log.warn(`notifica live #${streamer?.login}: ${r.errore}`);
  return r;
}

// Messaggio TikTok di default (modificabile dallo streamer). Segnaposto:
// {nome} {link} {username}
export const MESSAGGIO_TIKTOK_DEFAULT =
  '🎵 <b>{nome}</b> è in diretta su <b>TikTok</b>!\n\n👉 {link}';

export function costruisciMessaggioTikTok(streamer, username, template) {
  const u = String(username || '').replace(/^@/, '');
  const valori = {
    nome: escHtml(streamer?.display || streamer?.login || u),
    link: `https://www.tiktok.com/@${u}/live`,   // grezzo: lo linkifica Telegram
    username: escHtml('@' + u),
  };
  const t = (template && String(template).trim()) || MESSAGGIO_TIKTOK_DEFAULT;
  return t.replace(/\{(nome|link|username)\}/g, (_, k) => valori[k]);
}

// Notifica "in diretta su TikTok" nel gruppo Telegram configurato. `template`
// è il testo personalizzato (vuoto = quello standard).
export async function notificaTikTok(conf, streamer, username, template) {
  if (!conf?.token || !conf?.chat_id) return { ok: false, errore: 'telegram non configurato' };
  const testo = costruisciMessaggioTikTok(streamer, username, template);
  const r = await inviaMessaggio(conf.token, conf.chat_id, testo, { anteprima: true });
  if (!r.ok) log.warn(`notifica TikTok #${streamer?.login}: ${r.errore}`);
  return r;
}

// Avviso di un NUOVO POST/VIDEO (YouTube o TikTok) nel gruppo Telegram.
// Segnaposto nel messaggio personalizzato: {nome} {titolo} {link}
export const MESSAGGIO_POST_YT_DEFAULT = '📺 <b>{nome}</b> ha caricato un nuovo video su <b>YouTube</b>!\n\n{titolo}\n👉 {link}';
export const MESSAGGIO_POST_TT_DEFAULT = '🎵 <b>{nome}</b> ha un nuovo post su <b>TikTok</b>!\n\n👉 {link}';
export const MESSAGGIO_POST_IG_DEFAULT = '📸 <b>{nome}</b> ha un nuovo post su <b>Instagram</b>!\n\n{titolo}\n👉 {link}';

export function costruisciMessaggioPost(streamer, { piattaforma, titolo, url, messaggio } = {}) {
  const nome = escHtml(streamer?.display || streamer?.login || '');
  const def = piattaforma === 'tiktok' ? MESSAGGIO_POST_TT_DEFAULT
    : piattaforma === 'instagram' ? MESSAGGIO_POST_IG_DEFAULT
    : MESSAGGIO_POST_YT_DEFAULT;
  const t = (messaggio && String(messaggio).trim()) || def;
  return t.replace(/\{(nome|titolo|link)\}/g, (_, k) => (k === 'nome' ? nome : k === 'titolo' ? escHtml(titolo || '') : (url || '')));
}

export async function notificaPost(conf, streamer, { piattaforma, titolo, url, messaggio } = {}) {
  if (!conf?.token || !conf?.chat_id) return { ok: false, errore: 'telegram non configurato' };
  const testo = costruisciMessaggioPost(streamer, { piattaforma, titolo, url, messaggio });
  const r = await inviaMessaggio(conf.token, conf.chat_id, testo, { anteprima: true });
  if (!r.ok) log.warn(`notifica post #${streamer?.login}: ${r.errore}`);
  return r;
}
