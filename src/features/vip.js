// Gestione VIP: assegna/toglie i VIP di Twitch, con predizione del nick (dal
// parlato: "vip a chiara" → chiara_3008), durata (default 1 settimana, o quella
// che dici tu) e scadenza automatica. Serve lo scope 'channel:manage:vips'.
import { vips, memory, points } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('vip');

const GIORNO = 24 * 3600_000;
const SEMPRE = { ms: 0, txt: 'sempre' };

// --------------------------------------------------------- durata dal parlato/testo
export function parseDurata(testo) {
  const t = String(testo || '').toLowerCase();
  if (/\b(per sempre|sempre|permanente|fisso|definitivo)\b/.test(t)) return { ms: 0, txt: 'sempre' };
  const num = (re, def = 1) => { const m = re.exec(t); return m && m[1] ? parseInt(m[1], 10) : def; };
  if (/\bmes[ei]\b|mensile/.test(t)) { const n = num(/(\d+)\s*mes/); return { ms: n * 30 * GIORNO, txt: n > 1 ? `${n} mesi` : 'un mese' }; }
  if (/settiman|settimanale/.test(t)) { const n = num(/(\d+)\s*settiman/); return { ms: n * 7 * GIORNO, txt: n > 1 ? `${n} settimane` : 'una settimana' }; }
  if (/\bgiorn[oi]\b|oggi/.test(t)) { const n = num(/(\d+)\s*giorn/); return { ms: n * GIORNO, txt: n > 1 ? `${n} giorni` : 'un giorno' }; }
  return { ms: 7 * GIORNO, txt: 'una settimana' };   // default
}

// --------------------------------------------------------- predizione del nick
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function distanza(a, b) {   // Levenshtein
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// Trova il chatter che somiglia di più al nome detto. Ritorna {user, display} o null.
export function trovaNick(channel, nome) {
  const q = norm(nome);
  if (q.length < 2) return null;
  const chatters = memory.recentChatters(channel);
  let best = null, bestScore = 0;
  for (const c of chatters) {
    for (const campo of [c.user, c.display]) {
      const cand = norm(campo);
      if (!cand) continue;
      let score = 0;
      if (cand === q) score = 1000;
      else if (cand.startsWith(q)) score = 850 - (cand.length - q.length);   // "chiara" → "chiara3008"
      else if (cand.includes(q)) score = 650 - (cand.length - q.length);
      else {
        const dist = distanza(q, cand);
        const sim = 1 - dist / Math.max(q.length, cand.length);
        if (sim >= 0.6) score = Math.round(sim * 500);
      }
      // a parità, preferisci chi ha scritto più di recente (chatters è già ordinato)
      if (score > bestScore) { bestScore = score; best = { user: c.user, display: c.display || c.user }; }
    }
  }
  return bestScore >= 400 ? best : null;
}

// --------------------------------------------------------- comando VIP dal parlato/testo
// Riconosce: "vip a chiara [per un mese]" · "togli vip a chiara" · "unvip chiara"
export function parseComandoVip(frase) {
  const t = String(frase || '').toLowerCase().trim();
  let m = /(?:togli|rimuovi|leva)\s+(?:il\s+)?vip\s+(?:a|da)?\s*([a-z0-9_]+)/.exec(t) || /\bunvip\s+@?([a-z0-9_]+)/.exec(t);
  if (m) return { azione: 'remove', nome: m[1] };
  m = /\bvip\s+(?:a|per|al|allo|alla)?\s*@?([a-z0-9_]+)/.exec(t);
  if (m) return { azione: 'add', nome: m[1], durata: parseDurata(t) };
  return null;
}

// --------------------------------------------------------- azioni
export async function assegnaVip(helix, channel, { nome, durata, motivo = 'comando' }, say) {
  try {
    const match = trovaNick(channel, nome);
    if (!match) { say?.(`Non trovo nessuno che somigli a "${nome}" in chat 🤔`); return { ok: false }; }
    const u = await helix.getUserByLogin(match.user).catch(() => null);
    if (!u?.id) { say?.(`Non riesco a trovare ${match.display} su Twitch.`); return { ok: false }; }
    const r = await helix.addVip(channel, u.id);
    if (!r.ok) { say?.(`Niente VIP per ${u.display_name}: ${r.motivo} 😕`); return { ok: false, motivo: r.motivo }; }
    const d = durata || parseDurata('');
    const until = d.ms > 0 ? Date.now() + d.ms : 0;
    vips.set(channel, { user: match.user, userId: u.id, display: u.display_name || match.display, until, motivo });
    say?.(`👑 VIP a ${u.display_name} per ${d.txt}!` + (r.gia ? ' (scadenza aggiornata)' : ''));
    return { ok: true, user: match.user, display: u.display_name };
  } catch (e) { log.error('assegnaVip:', e?.message || e); return { ok: false }; }
}

export async function togliVip(helix, channel, nome, say) {
  try {
    // prova prima tra i VIP dati dal bot, poi tra i chatter
    let login = null, display = nome;
    const match = trovaNick(channel, nome);
    if (match) { login = match.user; display = match.display; }
    if (!login) { say?.(`Non trovo "${nome}".`); return { ok: false }; }
    const u = await helix.getUserByLogin(login).catch(() => null);
    if (u?.id) await helix.removeVip(channel, u.id);
    vips.remove(channel, login);
    say?.(`VIP tolto a ${u?.display_name || display}.`);
    return { ok: true };
  } catch (e) { log.error('togliVip:', e?.message || e); return { ok: false }; }
}

// assegnazione diretta per login esatto (usata dai premi automatici)
//
// Un VIP SENZA scadenza non si accorcia mai. Scrivergli sopra `until` lo
// trasformerebbe in un VIP a tempo, e una settimana dopo controllaScadenze
// glielo toglierebbe: un premio che revoca cio' che premia.
export async function assegnaVipLogin(helix, channel, login, durata, motivo = 'premio', say) {
  try {
    const u = await helix.getUserByLogin(login).catch(() => null);
    if (!u?.id) return { ok: false };
    const gia = vips.get(channel, login);
    if (gia && !gia.until && durata.ms > 0) return { ok: false, perenne: true, display: gia.display || login };
    const r = await helix.addVip(channel, u.id);
    if (!r.ok) return { ok: false, motivo: r.motivo };
    const until = durata.ms > 0 ? Date.now() + durata.ms : 0;
    vips.set(channel, { user: login.toLowerCase(), userId: u.id, display: u.display_name || login, until, motivo });
    say?.(`👑 ${u.display_name} ha vinto il VIP ${motivo === 'premio' ? 'come premio' : ''} per ${durata.txt}! 🎉`);
    return { ok: true, display: u.display_name };
  } catch (e) { log.error('assegnaVipLogin:', e?.message || e); return { ok: false }; }
}

// comandi in chat (solo mod/streamer): !vip @nome [durata] · !unvip @nome · !viplista
export async function tryVipCommand(helix, msg, say) {
  try {
    // Niente skip su isSelf: lo streamer (che il bot impersona) deve poter dare
    // i comandi VIP dal suo account. È comunque riservato a mod/broadcaster.
    if (!msg) return false;
    if (!(msg.isMod || msg.isBroadcaster)) return false;
    const t = String(msg.text || '').trim();
    if (!/^!(vip|unvip|viplista|viplist)\b/i.test(t)) return false;
    const parti = t.slice(1).split(/\s+/);
    const cmd = parti.shift().toLowerCase();
    if (cmd === 'viplista' || cmd === 'viplist') {
      const l = vips.list(msg.channel);
      say(l.length
        ? '👑 VIP a tempo: ' + l.map((v) => v.display + (v.until ? ` (fino al ${new Date(v.until).toLocaleDateString('it-IT')})` : ' (sempre)')).join(', ')
        : 'Nessun VIP a tempo assegnato dal bot.');
      return true;
    }
    const nome = (parti[0] || '').replace(/^@/, '');
    if (!nome) { say(cmd === 'unvip' ? 'Uso: !unvip @nome' : 'Uso: !vip @nome [settimana/mese]'); return true; }
    if (cmd === 'unvip') { await togliVip(helix, msg.channel, nome, say); return true; }
    await assegnaVip(helix, msg.channel, { nome, durata: parseDurata(parti.join(' ')), motivo: 'comando' }, say);
    return true;
  } catch (e) { log.error('tryVipCommand:', e?.message || e); return false; }
}

// rimozione automatica dei VIP scaduti (su tutti i canali)
export async function controllaScadenze(helix) {
  try {
    for (const v of vips.scaduti()) {
      try { if (v.user_id) await helix.removeVip(v.channel, v.user_id); } catch { /* niente */ }
      vips.remove(v.channel, v.user);
      log.info(`VIP scaduto rimosso: ${v.user} (#${v.channel})`);
    }
  } catch (e) { log.error('controllaScadenze:', e?.message || e); }
}

// Chi ha gia' il premio PER SEMPRE. Due sorgenti, perche' un VIP perenne puo'
// venire da noi (riga senza scadenza) o dallo streamer, che lo ha dato a mano
// su Twitch e di cui non sappiamo niente: quello lo chiediamo a Twitch.
// Non e' la stessa cosa di un VIP a tempo ancora in corso — quello il premio
// lo prolunga, ed e' giusto cosi'.
export async function giaPerSempre(helix, channel) {
  const perenni = new Set();
  const nostri = new Map();
  for (const v of vips.list(channel)) {
    nostri.set(v.user, v);
    if (!v.until) perenni.add(v.user);
  }
  try {
    for (const v of await helix.getVips(channel)) {
      const u = String(v.user_login || '').toLowerCase();
      if (u && !nostri.has(u)) perenni.add(u);   // VIP del canale, non nostro: per noi e' per sempre
    }
  } catch (e) { log.debug('giaPerSempre:', e?.message || e); }
  return perenni;
}

// Premio periodico: il VIP a chi ha piu' monete.
//
// Tre regole, e ognuna nasce da un fatto, non da un gusto:
//
//  · pesca dalla classifica del PUBBLICO. Twitch rifiuta di dare il VIP a un
//    moderatore ("non posso, forse e' mod o sei tu"): mettendo lo staff fra i
//    candidati il premio si bruciava contro un rifiuto certo.
//  · SALTA chi ce l'ha gia' per sempre (a meno che non lo si voglia lo stesso):
//    dargli il VIP non aggiunge niente a lui e toglie il posto a chi verrebbe
//    dopo — e, peggio, gli metterebbe una scadenza addosso.
//  · SCORRE: se qualcuno viene saltato o rifiutato, il posto va al successivo.
//    I posti promessi sono `quanti`, e `quanti` devono essere assegnati finche'
//    c'e' gente in classifica.
export async function premiaTopMonete(helix, channel, quanti, durata, say, opzioni = {}) {
  try {
    const saltaPerenni = opzioni.saltaPerenni !== false;
    const posti = Math.max(1, Number(quanti) || 1);
    // profondita': serve gente in piu' da cui pescare quando si scorre.
    const candidati = points.top(channel, posti * 4 + 10, 'pubblico');
    // L'elenco serve in ogni caso, non solo quando si salta: l'interruttore
    // decide se uno puo' VINCERE un posto, non se ci sia permesso rovinargli
    // quello che ha. Un VIP per sempre non prende mai una scadenza.
    const perenni = await giaPerSempre(helix, channel);
    const vincitori = [];
    const saltati = [];
    for (const t of candidati) {
      if (vincitori.length >= posti) break;
      const perenne = perenni.has(t.user);
      if (perenne && saltaPerenni) { saltati.push(t.user); continue; }
      const r = await assegnaVipLogin(helix, channel, t.user, perenne ? SEMPRE : durata, 'premio');
      if (r.ok) vincitori.push(r.display || t.user);
      else if (r.perenne) saltati.push(t.user);
    }
    if (saltati.length) log.info(`premio VIP #${channel}: saltati (ce l'hanno gia' per sempre) ${saltati.join(', ')}`);
    if (vincitori.length) say?.(`🏆 Premio ${durata.txt}: VIP a ${vincitori.join(', ')} — i più affezionati! 💜`);
    return vincitori;
  } catch (e) { log.error('premiaTopMonete:', e?.message || e); return []; }
}
