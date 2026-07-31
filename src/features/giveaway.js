// Giveaway / sorteggi. Uno per canale alla volta, tenuto IN MEMORIA: è legato
// alla diretta e non ha senso farlo sopravvivere ai riavvii. Si comanda sia dalla
// CHAT (mod/streamer: !giveaway/!estrai; spettatori: !join) sia dalla DASHBOARD
// (le funzioni apri/stato/estrai/annulla, usate dagli endpoint del server, che
// gira nello stesso processo → stessa mappa in memoria).
//
// PROBABILITÀ VARIABILI: ogni partecipante ha un numero di "biglietti" (peso).
// I sub, i VIP e i mod possono avere più biglietti (moltiplicatori configurabili)
// e si possono regalare biglietti bonus a mano (!biglietti @nome N). L'estrazione
// è pesata: più biglietti = più probabilità, ma nessuno è mai certo di vincere.
// Si possono estrarre anche più vincitori in un colpo (!estrai N), senza ripescare.
//
// Gating: segue l'add-on "Giochi" (settings.giochi), come i minigiochi.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('giveaway');

// channel → {
//   premio, soloSub, keyword,
//   molt: { sub, vip, mod },
//   partecipanti: Map(user → { display, base, bonus }),   // biglietti = base + bonus
//   apertoDa, vincitori: [display,...]
// }
const attivi = new Map();
const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);
const abilitato = (channel) => streamers.get(channel)?.settings?.giochi !== false;

// Valori di default dei moltiplicatori e della parola d'ingresso. Si possono
// sovrascrivere all'apertura (dal pannello) o via settings.giveaway del canale.
export const GIVEAWAY_DEFAULT = {
  moltSub: 2,      // i sub hanno il DOPPIO delle possibilità
  moltVip: 2,      // idem i VIP
  moltMod: 1,      // i mod come tutti (di solito gestiscono, non partecipano)
  keyword: 'join', // parola per entrare (senza il ! iniziale)
};

const intero = (v, def, lo, hi) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
};

// Config del canale: default globali + eventuale settings.giveaway salvato.
function cfg(channel) {
  const s = streamers.get(channel)?.settings?.giveaway || {};
  return {
    moltSub: intero(s.moltSub, GIVEAWAY_DEFAULT.moltSub, 1, 20),
    moltVip: intero(s.moltVip, GIVEAWAY_DEFAULT.moltVip, 1, 20),
    moltMod: intero(s.moltMod, GIVEAWAY_DEFAULT.moltMod, 1, 20),
    keyword: String(s.keyword || GIVEAWAY_DEFAULT.keyword).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'join',
  };
}

// Biglietti "di ruolo" per chi scrive: il massimo tra i moltiplicatori applicabili
// (un sub-VIP prende il migliore, non la somma → niente valori fuori scala).
// `molt` è l'oggetto { sub, vip, mod } salvato nel giveaway aperto.
export function pesoDaMsg(msg, molt) {
  const m = molt || {};
  let t = 1;
  if (msg?.isMod || msg?.isBroadcaster) t = Math.max(t, Number(m.mod) || 1);
  if (msg?.isVip) t = Math.max(t, Number(m.vip) || 1);
  if (msg?.isSub) t = Math.max(t, Number(m.sub) || 1);
  return intero(t, 1, 1, 50);
}

const bigliettiDi = (p) => Math.max(1, (Number(p?.base) || 1) + (Number(p?.bonus) || 0));
function bigliettiTotali(g) {
  let n = 0;
  for (const p of g.partecipanti.values()) n += bigliettiDi(p);
  return n;
}

// ── API condivisa (chat + dashboard) ────────────────────────────────────────
export function stato(channel) {
  const g = attivi.get(channel);
  if (!g) return { aperto: false };
  return {
    aperto: true,
    premio: g.premio,
    soloSub: g.soloSub,
    keyword: g.keyword,
    partecipanti: g.partecipanti.size,
    biglietti: bigliettiTotali(g),
    molt: { ...g.molt },
    vincitori: [...g.vincitori],
  };
}

// Apre un giveaway. { ok, premio, soloSub, keyword, molt } oppure { ok:false, errore }.
export function apri(channel, opts = {}) {
  if (!abilitato(channel)) return { ok: false, errore: 'add-on' };
  const g = attivi.get(channel);
  if (g && g.partecipanti.size > 0) return { ok: false, errore: 'gia-aperto' };   // uno vuoto si può rimpiazzare

  const base = cfg(channel);
  const molt = {
    sub: opts.moltSub != null ? intero(opts.moltSub, base.moltSub, 1, 20) : base.moltSub,
    vip: opts.moltVip != null ? intero(opts.moltVip, base.moltVip, 1, 20) : base.moltVip,
    mod: opts.moltMod != null ? intero(opts.moltMod, base.moltMod, 1, 20) : base.moltMod,
  };
  const keyword = String(opts.keyword || base.keyword).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'join';
  const premio = String(opts.premio || '').trim().slice(0, 120) || 'un premio a sorpresa';

  attivi.set(channel, {
    premio, soloSub: !!opts.soloSub, keyword, molt,
    partecipanti: new Map(), apertoDa: Date.now(), vincitori: [],
  });
  return { ok: true, premio, soloSub: !!opts.soloSub, keyword, molt };
}

// Iscrive (o aggiorna) un partecipante con i suoi biglietti "di ruolo".
// I biglietti bonus eventualmente ricevuti restano.
export function partecipa(channel, user, display, base = 1) {
  const g = attivi.get(channel);
  if (!g) return false;
  const u = String(user || '').toLowerCase();
  if (!u) return false;
  const cur = g.partecipanti.get(u) || { display: display || u, base: 0, bonus: 0 };
  cur.display = display || cur.display;
  cur.base = Math.max(Number(cur.base) || 0, intero(base, 1, 1, 50));
  g.partecipanti.set(u, cur);
  return true;
}

// Regala (o toglie, con n negativo) biglietti bonus a un partecipante già iscritto.
// Ritorna il totale di biglietti dell'utente, o null se non è in gara.
export function bonus(channel, user, n) {
  const g = attivi.get(channel);
  if (!g) return null;
  const u = String(user || '').toLowerCase().replace(/^@/, '');
  const cur = g.partecipanti.get(u);
  if (!cur) return null;
  cur.bonus = Math.max(0, Math.min(100, (Number(cur.bonus) || 0) + (Math.round(Number(n)) || 0)));
  g.partecipanti.set(u, cur);
  return bigliettiDi(cur);
}

// Estrae fino a `quanti` vincitori DISTINTI, in modo PESATO (più biglietti = più
// probabilità). I vincitori escono dal pool (si può ri-estrarre per altri). Ritorna
// { vincitori:[display...], rimasti, biglietti } — vincitori vuoto se pool vuoto.
export function estrai(channel, quanti = 1) {
  const g = attivi.get(channel);
  if (!g || g.partecipanti.size === 0) return { vincitori: [], rimasti: 0, biglietti: 0 };

  let pool = [...g.partecipanti.entries()].map(([u, p]) => ({ u, display: p.display, peso: bigliettiDi(p) }));
  const n = Math.max(1, Math.min(intero(quanti, 1, 1, 50), pool.length));
  const vincitori = [];

  for (let k = 0; k < n; k++) {
    const tot = pool.reduce((s, x) => s + x.peso, 0);
    if (tot <= 0 || !pool.length) break;
    let r = Math.random() * tot;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) { r -= pool[i].peso; if (r < 0) { idx = i; break; } }
    const win = pool[idx];
    vincitori.push(win.display);
    g.partecipanti.delete(win.u);
    g.vincitori.push(win.display);
    pool.splice(idx, 1);
  }
  return { vincitori, rimasti: g.partecipanti.size, biglietti: bigliettiTotali(g) };
}

// Compat: estrae UN vincitore. { vincitore, rimasti } o null se vuoto.
export function estraiUno(channel) {
  const r = estrai(channel, 1);
  if (!r.vincitori.length) return null;
  return { vincitore: r.vincitori[0], rimasti: r.rimasti };
}

export function annulla(channel) { return attivi.delete(channel); }

// ── Ingresso CHAT ────────────────────────────────────────────────────────────
function frase(vincitori, premio) {
  const conPremio = premio && premio !== 'un premio a sorpresa' ? ` di "${premio}"` : '';
  if (vincitori.length === 1) return `🎉🎉 Il vincitore${conPremio} è… ${vincitori[0]}! Congratulazioni! 🏆`;
  return `🎉🎉 I vincitori${conPremio} sono… ${vincitori.join(', ')}! Congratulazioni! 🏆`;
}

function estraiChat(channel, msg, say, quanti) {
  if (!puoGestire(msg)) return true;
  const s = stato(channel);
  if (!s.aperto) { say('🎁 Non c\'è nessun giveaway aperto. Aprine uno con !giveaway <premio>.'); return true; }
  const r = estrai(channel, quanti);
  if (!r.vincitori.length) { say('🎁 Nessun partecipante ancora: scrivete !join per entrare!'); return true; }
  say(`${frase(r.vincitori, s.premio)}${r.rimasti ? ` (${r.rimasti} ancora in gara — !estrai per un altro)` : ''}`);
  return true;
}

// Riepilogo dei moltiplicatori per l'annuncio ("sub ×2 · vip ×2"), vuoto se tutti a 1.
function riepilogoMolt(molt) {
  const parti = [];
  if (molt.sub > 1) parti.push(`sub ×${molt.sub}`);
  if (molt.vip > 1) parti.push(`vip ×${molt.vip}`);
  if (molt.mod > 1) parti.push(`mod ×${molt.mod}`);
  return parti.length ? ` 🎫 ${parti.join(' · ')} (più possibilità!)` : '';
}

// Ritorna true se il messaggio era un comando/azione del giveaway (gestito).
export function tryGiveaway(msg, say) {
  try {
    if (!msg) return false;
    const channel = msg.channel;
    const testo = String(msg.text || '').trim();
    const g = attivi.get(channel);

    // ENTRATA con parola-chiave personalizzata SENZA "!" (es. keyword "vinci"):
    // solo messaggio di UNA parola esatta, così non scatta dentro le frasi.
    if (g && !testo.startsWith('!')) {
      const parola = testo.toLowerCase();
      if (g.keyword !== 'join' && parola === g.keyword && !/\s/.test(testo)) {
        if (g.soloSub && !(msg.isSub || msg.isMod || msg.isBroadcaster)) return true;
        partecipa(channel, msg.user, msg.display || msg.user, pesoDaMsg(msg, g.molt));
        return true;
      }
      return false;
    }
    if (!testo.startsWith('!')) return false;

    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    const nome = msg.display || msg.user;

    // entrata: !join (o alias) sempre, oppure !<keyword> personalizzata
    const entrataDefault = ['join', 'partecipa', 'entra'].includes(cmd) && (!g || g.keyword === 'join' || g.keyword === cmd);
    const entrataKeyword = g && g.keyword !== 'join' && cmd === g.keyword;
    if (entrataDefault || entrataKeyword) {
      if (!g) return false;                                  // nessun giveaway: non è roba nostra
      if (g.soloSub && !(msg.isSub || msg.isMod || msg.isBroadcaster)) return true;   // riservato ai sub
      partecipa(channel, msg.user, nome, pesoDaMsg(msg, g.molt));   // niente conferma singola: non floodiamo
      return true;
    }

    switch (cmd) {
      case 'estrai':
      case 'draw':
      case 'vincitore':
        return estraiChat(channel, msg, say, parseInt(parti[0], 10) || 1);

      // biglietti bonus a un partecipante: !biglietti @nome [N] (default +1). Solo mod.
      case 'biglietti':
      case 'ticket':
      case 'tickets': {
        if (!puoGestire(msg)) return true;
        if (!g) { say('🎁 Non c\'è nessun giveaway aperto.'); return true; }
        const chi = (parti[0] || '').replace(/^@/, '').toLowerCase();
        const quanti = parti[1] != null ? (parseInt(parti[1], 10) || 1) : 1;
        if (!chi) { say('🎫 Uso: !biglietti @nome [quantità].'); return true; }
        const tot = bonus(channel, chi, quanti);
        if (tot == null) say(`🎫 @${chi} non è (ancora) in gara: deve entrare con !${g.keyword}.`);
        else say(`🎫 @${chi} ora ha ${tot} biglietti nel giveaway.`);
        return true;
      }

      case 'giveaway':
      case 'sorteggio':
      case 'gw': {
        const sub0 = (parti[0] || '').toLowerCase();
        if (['annulla', 'stop', 'cancella', 'chiudi'].includes(sub0)) {
          if (!puoGestire(msg)) return true;
          if (!annulla(channel)) { say('🎁 Non c\'è nessun giveaway aperto.'); return true; }
          say('🎁 Giveaway annullato.'); return true;
        }
        if (['estrai', 'draw', 'vincitore'].includes(sub0)) return estraiChat(channel, msg, say, parseInt(parti[1], 10) || 1);
        if (!puoGestire(msg) || ['stato', 'info'].includes(sub0)) {
          const s = stato(channel);
          say(s.aperto
            ? `🎁 Giveaway "${s.premio}" in corso — ${s.partecipanti} partecipanti (${s.biglietti} biglietti). Scrivi !${s.keyword} per entrare${s.soloSub ? ' (solo sub)' : ''}!`
            : '🎁 Nessun giveaway al momento.');
          return true;
        }
        // aprire: solo mod/streamer. Flag opzionali in testa: "sub" (solo sub) e
        // "parola=XYZ" (parola d'ingresso). Il resto è il premio.
        const rest = [...parti];
        let soloSub = false;
        let keyword = null;
        while (rest.length) {
          const w = String(rest[0]).toLowerCase();
          if (w === 'sub' || w === 'solosub') { soloSub = true; rest.shift(); continue; }
          const m = w.match(/^(?:parola|keyword|key)[=:](\w{2,20})$/);
          if (m) { keyword = m[1]; rest.shift(); continue; }
          break;
        }
        const r = apri(channel, { premio: rest.join(' '), soloSub, keyword });
        if (!r.ok) {
          if (r.errore === 'gia-aperto') say('🎁 C\'è già un giveaway aperto: !estrai per il vincitore o !giveaway annulla.');
          return true;   // add-on assente → silenzio
        }
        say(`🎁 GIVEAWAY APERTO: ${r.premio}! Scrivete !${r.keyword} per partecipare${r.soloSub ? ' (riservato ai sub)' : ''}.${riepilogoMolt(r.molt)} In bocca al lupo! 🍀`);
        return true;
      }

      default:
        return false;
    }
  } catch (e) {
    log.error('tryGiveaway:', e?.message || e);
    return false;
  }
}
