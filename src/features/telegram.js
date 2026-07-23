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

// --------------------------------------------------------- rilevamento gruppo
// Legge gli ultimi update del bot e trova la chat di gruppo più recente (il bot
// riceve un update sia quando viene AGGIUNTO a un gruppo sia quando qualcuno
// scrive /collega). Così lo streamer non deve cercare a mano il "chat id".
export async function rilevaGruppo(token) {
  const r = await tgCall(String(token || '').trim(), 'getUpdates', {
    params: { timeout: 0, offset: -20, allowed_updates: '["message","my_chat_member","channel_post"]' },
  });
  if (!r.ok) return { ok: false, errore: r.errore };
  const updates = Array.isArray(r.result) ? r.result : [];
  // dal più recente al più vecchio: vince l'ultima interazione in un gruppo
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i];
    const chat = u?.message?.chat || u?.my_chat_member?.chat || u?.channel_post?.chat;
    if (chat && (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel')) {
      return { ok: true, chatId: String(chat.id), titolo: chat.title || '(gruppo)' };
    }
  }
  // nessun gruppo: forse ha scritto solo in privato al bot
  for (let i = updates.length - 1; i >= 0; i--) {
    const chat = updates[i]?.message?.chat;
    if (chat && chat.type === 'private') {
      return { ok: true, chatId: String(chat.id), titolo: chat.first_name || chat.username || '(privato)', privato: true };
    }
  }
  return { ok: false, errore: 'nessun gruppo trovato: aggiungi il bot al gruppo e scrivi /collega, poi riprova' };
}

// --------------------------------------------------------- invio
export async function inviaMessaggio(token, chatId, testo, { anteprima = true } = {}) {
  return tgCall(token, 'sendMessage', {
    post: true,
    params: {
      chat_id: chatId,
      text: testo,
      parse_mode: 'HTML',
      disable_web_page_preview: !anteprima,
    },
  });
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

// Notifica "in diretta su TikTok" nel gruppo Telegram configurato.
export async function notificaTikTok(conf, streamer, username) {
  if (!conf?.token || !conf?.chat_id) return { ok: false, errore: 'telegram non configurato' };
  const u = String(username || '').replace(/^@/, '');
  const nome = escHtml(streamer?.display || streamer?.login || u);
  const testo = `🎵 <b>${nome}</b> è in diretta su <b>TikTok</b>!\n\n👉 https://www.tiktok.com/@${escHtml(u)}/live`;
  const r = await inviaMessaggio(conf.token, conf.chat_id, testo, { anteprima: true });
  if (!r.ok) log.warn(`notifica TikTok #${streamer?.login}: ${r.errore}`);
  return r;
}
