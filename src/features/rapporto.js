// IL RAPPORTO DI FINE DIRETTA: com'e' andata, in poche righe, allo streamer in
// privato, appena chiude.
//
// Niente cervello e niente aggettivi: numeri. Quello che il bot ha gia' in casa
// (messaggi, eventi, clip, presenze, donazioni) si legge dal database al momento
// di chiudere, con la finestra della diretta; quello che passa e non resta (gli
// spettatori a ogni giro) si tiene in memoria durante la diretta. Cosi' un
// riavvio del bot a meta' serata perde al massimo il picco, non il rapporto.
//
// L'inizio della diretta e' l'istante in cui il bot l'ha vista partire; se e'
// ripartito a diretta in corso, e' l'inizio della diretta corrente delle
// presenze (dirette_viste), che sopravvive ai riavvii. La fine e' adesso.
import { db, streamers, presenze as store } from '../db.js';

const norm = (s) => String(s || '').toLowerCase().trim();
const sessioni = new Map();   // canale → { inizio, picco, somma, giri }

export function cfg(channel) {
  const r = streamers.get(norm(channel))?.settings?.rapporto;
  return { attivo: !(r && r.attivo === false) };
}

export function apri(channel, { ora = Date.now(), inizio = 0 } = {}) {
  const ch = norm(channel);
  if (!ch) return null;
  const s = { inizio: inizio > 0 && inizio <= ora ? inizio : ora, picco: 0, somma: 0, giri: 0 };
  sessioni.set(ch, s);
  return s;
}

// Un giro da cinque minuti, con gli spettatori di quel momento. Senza una
// sessione aperta (bot ripartito a diretta in corso) se ne apre una che parte
// dall'inizio che le presenze ricordano.
export function osservaGiro(channel, { spettatori = null, ora = Date.now() } = {}) {
  const ch = norm(channel);
  if (!ch) return null;
  let s = sessioni.get(ch);
  if (!s) s = apri(ch, { ora, inizio: store.diretta(ch)?.corrente_ts || 0 });
  const n = Number(spettatori);
  if (Number.isFinite(n) && n >= 0) { s.picco = Math.max(s.picco, n); s.somma += n; s.giri++; }
  return s;
}

export function chiudi(channel, { ora = Date.now() } = {}) {
  const ch = norm(channel);
  const s = sessioni.get(ch);
  sessioni.delete(ch);
  if (!s) return null;
  return { inizio: s.inizio, fine: ora, durataMs: Math.max(0, ora - s.inizio), picco: s.picco, media: s.giri ? Math.round(s.somma / s.giri) : 0, giri: s.giri };
}

export function aperta(channel) { return sessioni.has(norm(channel)); }

// Quello che e' successo fra inizio e fine, letto dal database. Pura sui dati.
function evento(testo) {
  const t = String(testo || '');
  const i = t.indexOf(' ');
  const tipo = i > 0 ? t.slice(0, i) : t;
  let dati = {};
  if (i > 0) { try { dati = JSON.parse(t.slice(i + 1)); } catch { dati = {}; } }
  return { tipo, dati };
}

export function raccogli(channel, { inizio, fine }) {
  const ch = norm(channel);
  const da = Number(inizio) || 0, a = Number(fine) || Date.now();
  const chat = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT user) p FROM messages
    WHERE channel=? AND ts>=? AND ts<=? AND from_bot=0 AND user NOT LIKE '[%'`).get(ch, da, a);
  const top = db.prepare(`SELECT user, MAX(display) display, COUNT(*) n FROM messages
    WHERE channel=? AND ts>=? AND ts<=? AND from_bot=0 AND user NOT LIKE '[%'
    GROUP BY user ORDER BY n DESC, user LIMIT 3`).all(ch, da, a).map((r) => ({ user: r.display || r.user, n: r.n }));
  const out = { messaggi: chat.n | 0, persone: chat.p | 0, top, follow: 0, sub: 0, regali: 0, raid: 0, raidSpettatori: 0 };
  for (const r of db.prepare(`SELECT text FROM messages WHERE channel=? AND user='[evento]' AND ts>=? AND ts<=?`).all(ch, da, a)) {
    const { tipo, dati } = evento(r.text);
    if (tipo === 'channel.follow') out.follow++;
    else if (tipo === 'channel.subscribe') { out.sub++; if (dati.is_gift) out.regali++; }
    else if (tipo === 'channel.subscription.gift') { const n = Number(dati.total) || 1; out.sub += n; out.regali += n; }
    else if (tipo === 'channel.raid') { out.raid++; out.raidSpettatori += Number(dati.viewers) || 0; }
  }
  const d = store.diretta(ch);
  out.presenti = d?.corrente
    ? db.prepare('SELECT COUNT(*) c FROM presenze WHERE channel=? AND ultima=?').get(ch, d.corrente).c
    : db.prepare('SELECT COUNT(*) c FROM presenze WHERE channel=? AND ultima_ts>=? AND ultima_ts<=?').get(ch, da, a).c;
  out.primeVolte = db.prepare('SELECT COUNT(*) c FROM presenze WHERE channel=? AND prima_ts>=? AND prima_ts<=?').get(ch, da, a).c;
  out.clip = db.prepare('SELECT COUNT(*) c FROM clips WHERE channel=? AND ts>=? AND ts<=?').get(ch, da, a).c;
  const don = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(importo),0) s FROM donazioni
    WHERE login=? AND stato='pagata' AND pagata_at>=? AND pagata_at<=? AND rimborsata_at=0`).get(ch, da, a);
  out.donazioni = don.n | 0; out.donazioniCent = don.s | 0;
  return out;
}

export function durata(ms) {
  const min = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`;
}
const euro = (cent) => (cent / 100).toFixed(2).replace('.', ',') + ' €';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Il messaggio, in HTML di Telegram. Solo le righe che hanno qualcosa da dire.
export function testo(dati) {
  const d = dati || {};
  const righe = [`<b>Diretta finita</b>: ${durata(d.durataMs || 0)}`];
  if (d.giri > 0) righe.push(`Spettatori: picco ${d.picco}, in media ${d.media}`);
  righe.push(`Chat: ${d.messaggi | 0} messaggi da ${d.persone | 0} ${d.persone === 1 ? 'persona' : 'persone'}`);
  if (d.top?.length) righe.push('Più attivi: ' + d.top.map((t) => `${esc(t.user)} (${t.n})`).join(', '));
  const conto = [`Nuovi follower: ${d.follow | 0}`, `Sub: ${d.sub | 0}${d.regali ? ` (${d.regali} regalat${d.regali === 1 ? 'o' : 'i'})` : ''}`];
  if (d.raid) conto.push(`Raid: ${d.raid} (${d.raidSpettatori} spettatori)`);
  righe.push(conto.join(' · '));
  if (d.presenti) righe.push(`Presenti: ${d.presenti}${d.primeVolte ? `, di cui ${d.primeVolte} alla prima volta` : ''}`);
  const extra = [];
  if (d.clip) extra.push(`Clip: ${d.clip}`);
  if (d.donazioni) extra.push(`Donazioni: ${d.donazioni} (${euro(d.donazioniCent || 0)})`);
  if (extra.length) righe.push(extra.join(' · '));
  return righe.join('\n');
}
