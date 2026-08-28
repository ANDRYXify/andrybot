// ModulesEngine: il motore dei "Moduli", le automazioni componibili
// QUANDO → SE → ALLORA che ogni streamer costruisce dalla dashboard.
//
// Filosofia: LIBERTÀ TOTALE ma SICUREZZA su un server condiviso. I moduli
// sono DATI (JSON nel DB), MAI codice: qui non si esegue nulla di arbitrario
// scritto dallo streamer. Le uniche "azioni" possibili sono quelle previste
// (messaggio, effetto, contatore, webhook, attesa, testo overlay, timeout) e
// il webhook è protetto da una guardia anti-SSRF (vedi fetchWebhook).
//
// Le variabili nei testi ($user, $uptime, $count(...), ...) sono sostituite
// con un semplice replace: NIENTE eval, niente template engine.
import dns from 'node:dns';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { modules as modulesDb, counters, memory, streamers, clips, quotes, watchtime } from '../db.js';
import { risolviCategoria } from './categoria.js';
import { canaleHa } from './accesso.js';
import * as spotify from './spotify.js';
import { makeLog } from '../logger.js';

const log = makeLog('moduli');

const MAX_AZIONI = 8;              // azioni eseguite al massimo per modulo
const MAX_TESTO = 400;             // troncatura dei messaggi
const MAX_ATTESA_S = 30;           // secondi massimi per l'azione "attendi"
const CACHE_STREAM_MS = 30_000;    // cache dello stato live per canale
const WEBHOOK_TIMEOUT_MS = 5000;   // timeout della chiamata webhook
const WEBHOOK_MAX_BYTES = 10 * 1024; // lettura massima della risposta webhook
const TIMER_TICK_MS = 30_000;      // ogni quanto il timer controlla i moduli

// Scala dei ruoli (tier): tutti < sub < vip < mod.
const TIER_SCALA = { tutti: 0, sub: 1, vip: 2, mod: 3 };

// Mappa dei tipi evento Twitch → nome breve usato nei moduli.
const MAPPA_EVENTI = {
  'channel.follow': 'follow',
  'channel.subscribe': 'subscribe',
  'channel.raid': 'raid',
  'channel.cheer': 'cheer',
  'channel.channel_points_custom_reward_redemption.add': 'redemption',
  'stream.online': 'online',
  'stream.offline': 'offline',
  // Gesti/espressioni dalla webcam (overlay tracking, libreria Human): un gesto
  // della mano o un'emozione del volto può far scattare un Modulo.
  'tracking.gesture': 'gesto',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').toLowerCase();

// Un utente è VIP se ha il badge 'vip/' o il tag vip=1 (come negli Effetti).
function isVip(msg) {
  const badges = msg?.tags?.badges || '';
  return badges.includes('vip/') || msg?.tags?.vip === '1';
}

// Livello (tier) dell'autore di un messaggio, per confrontarlo col minimo richiesto.
function livelloUtente(msg) {
  if (msg?.isMod || msg?.isBroadcaster) return TIER_SCALA.mod;
  if (isVip(msg)) return TIER_SCALA.vip;
  if (msg?.isSub) return TIER_SCALA.sub;
  return TIER_SCALA.tutti;
}

export class ModulesEngine {
  constructor({ effects, helix } = {}) {
    this.effects = effects || null;
    this.helix = helix || null;
    this.manager = null;                 // impostato da start(); serve per say() di default
    this._cooldown = new Map();          // 'channel|id' → epoch ms di fine cooldown
    this._streamCache = new Map();       // channel → { stream, ts }
    this._timerLast = new Map();         // 'channel|id' → epoch ms ultima esecuzione timer
    this._timer = null;
  }

  // ============================================================ ingresso: CHAT

  // Chiamato per ogni messaggio in chat. NON saltiamo `isSelf`: il bot parla
  // con l'account dello streamer, quindi i comandi/parole che scrive LUI stesso
  // devono innescare i Moduli (spesso è lui a usarli/testarli). L'innesco "primo
  // messaggio" non scatta comunque per lo streamer (non ha il tag first-msg), e
  // gli echi del bot non tornano su IRC → nessun loop. Solo `from_bot` è escluso.
  async onMessage(msg, say) {
    try {
      if (!msg || msg.from_bot) return;
      const channel = norm(msg.channel);
      if (!channel) return;
      const testo = String(msg.text || '');
      const lista = modulesDb.list(channel);
      if (!lista.length) return;

      const livello = livelloUtente(msg);
      // Twitch marca il primo messaggio in assoluto di un utente col tag first-msg=1.
      const primoMessaggio = msg.tags && msg.tags['first-msg'] === '1';

      let comandoScattato = false;
      for (const modulo of lista) {
        if (!modulo.attivo) continue;
        const tr = modulo.trigger || {};
        let ctx = null;

        if (tr.tipo === 'comando') {
          ctx = this._matchComando(tr, testo, msg, channel, livello);
        } else if (tr.tipo === 'parola') {
          ctx = this._matchParola(tr, testo, msg, channel, livello);
        } else if (tr.tipo === 'evento' && tr.evento === 'first' && primoMessaggio) {
          ctx = this._ctxDaMessaggio(msg, channel, livello, [], '');
          ctx.evento = 'first';
        }

        if (ctx) { await this.esegui(modulo, ctx, say); if (tr.tipo === 'comando') comandoScattato = true; }
      }

      // Diagnostica: se è un "!comando" e NESSUN modulo-comando ha risposto,
      // logghiamo cosa era disponibile. Così, se un alias "non dà segni di vita",
      // dai log del bot si vede subito se l'alias è davvero salvato nel modulo.
      const trimmed = testo.trim();
      if (!comandoScattato && trimmed.startsWith('!')) {
        const cmd = norm(trimmed.slice(1).split(/\s+/)[0] || '');
        const moduliCmd = lista.filter((m) => m.attivo && m.trigger?.tipo === 'comando');
        if (cmd && moduliCmd.length) {
          const disp = moduliCmd.map((m) => {
            const a = m.trigger.alias;
            const alist = Array.isArray(a) ? a : (typeof a === 'string' ? a.split(/[\s,]+/) : []);
            return [m.trigger.comando, ...alist].filter(Boolean).join('/');
          }).join(' | ');
          log.info(`comando "${cmd}" #${channel} non ha inneschi. Moduli-comando disponibili: ${disp}`);
        }
      }
    } catch (e) {
      log.debug('onMessage:', e?.message || e);
    }
  }

  // Verifica il trigger 'comando' (match su comando o alias). Ritorna il
  // contesto se combacia, altrimenti null.
  _matchComando(tr, testo, msg, channel, livello) {
    const t = testo.trim();
    if (!t) return null;
    // Alias ROBUSTO: accetta sia un array (['disc','dc']) sia una stringa
    // ("disc dc" / "disc, dc"). Prima gli alias salvati come stringa venivano
    // ignorati del tutto → il comando ! funzionava ma gli alias no.
    const aliasList = Array.isArray(tr.alias)
      ? tr.alias
      : (typeof tr.alias === 'string' ? tr.alias.split(/[\s,]+/) : []);
    const comandi = [tr.comando, ...aliasList]
      .map((c) => norm(c).replace(/^!/, '').trim())
      .filter(Boolean);
    if (!comandi.length) return null;

    if (t.startsWith('!')) {
      // forma esplicita: !comando [argomenti]
      const primo = norm(t.slice(1).split(/\s+/)[0] || '');
      if (!comandi.includes(primo)) return null;
      const dopo = t.slice(1).replace(/^\S+\s*/, '');   // testo dopo il comando
      const args = dopo.length ? dopo.split(/\s+/) : [];
      return this._ctxDaMessaggio(msg, channel, livello, args, dopo);
    }

    // forma SENZA "!": solo se il modulo l'ha abilitato (opt-in senzaBang) e
    // SOLO se il messaggio è ESATTAMENTE il comando/alias (una parola sola),
    // così non scatta a caso dentro le frasi normali della chat.
    if (tr.senzaBang) {
      const parole = t.split(/\s+/);
      if (parole.length === 1 && comandi.includes(norm(parole[0]))) {
        return this._ctxDaMessaggio(msg, channel, livello, [], '');
      }
    }
    return null;
  }

  // Normalizza un testo per il confronto del trigger 'parola', secondo le opzioni:
  //  • tr.maiuscole = true  → rispetta maiuscole/minuscole (di default no)
  //  • tr.ignoraPunt !== false → ignora la punteggiatura (di default sì)
  _preparaConfronto(s, tr) {
    let x = String(s || '');
    if (!tr.maiuscole) x = x.toLowerCase();
    if (tr.ignoraPunt !== false) x = x.replace(/[^\p{L}\p{N}\s]/gu, ' ');
    return x.replace(/\s+/g, ' ').trim();
  }

  // Le frasi/domande di un trigger 'parola': la LISTA `testi` (una per casella)
  // oppure, per compatibilità coi moduli vecchi, il singolo `testo`.
  _frasiTrigger(tr) {
    if (Array.isArray(tr.testi) && tr.testi.length) return tr.testi;
    return tr.testo ? [tr.testo] : [];
  }

  // Vero se `testo` combacia con ALMENO UNA delle frasi del trigger (modo +
  // opzioni case/punteggiatura).
  _confrontaParola(tr, testo) {
    const hay = this._preparaConfronto(testo, tr);
    const modo = tr.modo || 'contiene';
    for (const f of this._frasiTrigger(tr)) {
      const needle = this._preparaConfronto(f, tr);
      if (!needle) continue;
      const ok = modo === 'esatto' ? hay === needle
        : modo === 'inizia' ? hay.startsWith(needle)
        : hay.includes(needle);
      if (ok) return true;
    }
    return false;
  }

  // Verifica il trigger 'parola' (frase/domanda) secondo modo + opzioni.
  _matchParola(tr, testo, msg, channel, livello) {
    if (!this._confrontaParola(tr, testo)) return null;
    const parole = String(testo).trim();
    const args = parole.length ? parole.split(/\s+/) : [];
    return this._ctxDaMessaggio(msg, channel, livello, args, parole);
  }

  // ============================================================ ingresso: VOCE

  // I "comandi vocali" sono un tipo di innesco dei Moduli: la trascrizione la
  // fa il BROWSER (Web Speech API, vedi voce.html) e ci manda la frase sentita.
  // Qui NON si registra nulla: si confrontano solo le frasi-chiave configurate.

  // Normalizza una frase vocale: minuscolo, via la punteggiatura/simboli, spazi
  // compattati. Usata sia per confrontare i trigger sia per l'elenco frasiVoce.
  _normVoce(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // togli punteggiatura e simboli
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Esegue i moduli 'voce' ATTIVI del canale la cui frase-chiave combacia con
  // la frase sentita dal browser. Riusa esegui(), quindi rispetta i cooldown e
  // le altre condizioni come per ogni altro innesco. Ritorna true se almeno un
  // modulo è davvero scattato. Non lancia mai.
  async eseguiVoce(channel, frase, say, inviaTelegram) {
    try {
      const ch = norm(channel);
      const sentita = this._normVoce(frase);
      if (!ch || !sentita) return false;

      const parole = sentita.split(' ').filter(Boolean);
      const dire = typeof say === 'function' ? say : ((t) => this._say(ch, t));

      let scattato = false;
      for (const modulo of modulesDb.list(ch)) {
        if (!modulo.attivo) continue;
        const tr = modulo.trigger || {};
        if (tr.tipo !== 'voce') continue;
        const frasi = Array.isArray(tr.frasi) ? tr.frasi : [];

        const combacia = frasi.some((f) => {
          const chiave = this._normVoce(f);
          if (!chiave) return false;
          if (sentita.includes(chiave)) return true;   // la chiave è dentro la frase sentita
          // per le chiavi di UNA sola parola accettiamo anche il contrario: il
          // browser può mandare un frammento più corto ("clip" ⊂ "clippa").
          if (!chiave.includes(' ') && chiave.includes(sentita)) return true;
          return false;
        });
        if (!combacia) continue;

        const ctx = this._ctxVoce(ch, sentita, parole);
        // se il modulo è abilitato per Telegram, la stessa risposta va anche là
        const dai = (modulo.telegram && typeof inviaTelegram === 'function')
          ? (t) => { dire(t); inviaTelegram(t); }
          : dire;
        if (await this.esegui(modulo, ctx, dai)) scattato = true;
      }
      return scattato;
    } catch (e) {
      log.debug('eseguiVoce:', e?.message || e);
      return false;
    }
  }

  // Elenco UNICO (minuscolo, normalizzato) di tutte le frasi dei moduli 'voce'
  // attivi del canale: è ciò che il browser deve "ascoltare".
  frasiVoce(channel) {
    try {
      const ch = norm(channel);
      const set = new Set();
      for (const modulo of modulesDb.list(ch)) {
        if (!modulo.attivo) continue;
        const tr = modulo.trigger || {};
        if (tr.tipo !== 'voce') continue;
        for (const f of (Array.isArray(tr.frasi) ? tr.frasi : [])) {
          const chiave = this._normVoce(f);
          if (chiave) set.add(chiave);
        }
      }
      return [...set];
    } catch (e) {
      log.debug('frasiVoce:', e?.message || e);
      return [];
    }
  }

  // ============================================================ ingresso: TELEGRAM
  // Un messaggio è arrivato nel gruppo Telegram: cerca un modulo abilitato per
  // Telegram che combacia ed esegue solo le sue azioni "messaggio". Gestisce
  // sia gli inneschi 'comando' (anche dentro una frase) sia 'parola'.
  async eseguiTelegram(channel, testo, invia, { utente = '' } = {}) {
    try {
      const ch = norm(channel);
      const t = String(testo || '').trim();
      if (!ch || !t) return false;
      for (const modulo of modulesDb.list(ch)) {
        if (!modulo.attivo || !modulo.telegram) continue;
        const tr = modulo.trigger || {};
        let ctx = null;
        if (tr.tipo === 'comando') ctx = this._matchComandoTelegram(tr, t, ch, utente);
        else if (tr.tipo === 'parola') ctx = this._matchParolaTelegram(tr, t, ch, utente);
        if (!ctx) continue;
        await this.esegui(modulo, ctx, invia, { soloMessaggi: true });
        return true;   // primo match: basta (niente risposte doppie)
      }
      return false;
    } catch (e) {
      log.debug('eseguiTelegram:', e?.message || e);
      return false;
    }
  }

  // Contesto per un modulo eseguito da Telegram (nessun ruolo → tier passano).
  _ctxTelegram(ch, utente, args, argsRaw) {
    return {
      channel: ch, user: utente || '', userLogin: '', display: utente || '',
      args: args || [], argsRaw: argsRaw || '', evento: null,
      _livello: TIER_SCALA.mod, _vars: {},
    };
  }

  // Match del comando su Telegram. Combacia se:
  //  • il messaggio inizia con /cmd, !cmd o "cmd ..." (con argomenti), oppure
  //  • la parola-comando (o un alias) compare DENTRO la frase, come parola intera
  //    (es. "mandami i social" fa scattare il comando "social").
  // Gestisce "/cmd@nomebot".
  _matchComandoTelegram(tr, testo, ch, utente) {
    const t = String(testo).trim();
    if (!t) return null;
    const aliasList = Array.isArray(tr.alias) ? tr.alias : (typeof tr.alias === 'string' ? tr.alias.split(/[\s,]+/) : []);
    const comandi = [tr.comando, ...aliasList].map((c) => norm(c).replace(/^[/!]/, '').trim()).filter(Boolean);
    if (!comandi.length) return null;

    // forma esplicita in testa: /cmd, !cmd, oppure "cmd argomenti"
    const conPrefisso = /^[/!]/.test(t);
    const corpo = conPrefisso ? t.slice(1) : t;
    const primo = norm(corpo.split(/\s+/)[0] || '').split('@')[0];
    if (comandi.includes(primo)) {
      const resto = corpo.replace(/^\S+\s*/, '');
      return this._ctxTelegram(ch, utente, resto.length ? resto.split(/\s+/) : [], resto);
    }

    // forma "dentro la frase": una parola-comando compare come parola intera
    const parole = norm(t).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (comandi.some((c) => parole.includes(c))) {
      return this._ctxTelegram(ch, utente, [], '');
    }
    return null;
  }

  // Match del trigger 'parola' su Telegram (stessa logica di Twitch: modo +
  // opzioni maiuscole/punteggiatura).
  _matchParolaTelegram(tr, testo, ch, utente) {
    if (!this._confrontaParola(tr, testo)) return null;
    const grezzo = String(testo).trim();
    return this._ctxTelegram(ch, utente, grezzo ? grezzo.split(/\s+/) : [], grezzo);
  }

  // ============================================================ ingresso: EVENTI

  // Chiamato per ogni evento Twitch ({channel, type, data}).
  async onEvent(ev, say) {
    try {
      if (!ev || !ev.type) return;
      const evento = MAPPA_EVENTI[ev.type];
      if (!evento) return;
      const channel = norm(ev.channel);
      if (!channel) return;
      const lista = modulesDb.list(channel);
      if (!lista.length) return;

      const ctx = this._ctxDaEvento(ev, channel, evento);
      for (const modulo of lista) {
        if (!modulo.attivo) continue;
        const tr = modulo.trigger || {};
        if (tr.tipo !== 'evento') continue;
        if ((tr.evento || '') !== evento) continue;
        // per i gesti webcam: filtro opzionale sul gesto specifico (vuoto = qualsiasi)
        if (evento === 'gesto' && tr.gesto && norm(tr.gesto) !== norm(ctx._vars?.gesto)) continue;
        await this.esegui(modulo, ctx, say);
      }
    } catch (e) {
      log.debug('onEvent:', e?.message || e);
    }
  }

  // ============================================================ TIMER

  // Avvia il loop dei moduli a tempo (ogni 30s). Salva `manager` per il say di
  // default. Ritorna una funzione stop().
  start({ manager } = {}) {
    if (manager) this.manager = manager;
    if (this._timer) return () => this.stop();
    this._timer = setInterval(() => {
      this._tickTimer().catch((e) => log.debug('tick timer:', e?.message || e));
    }, TIMER_TICK_MS);
    this._timer.unref?.();
    log.info(`motore Moduli avviato (timer ogni ${TIMER_TICK_MS / 1000}s)`);
    return () => this.stop();
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  async _tickTimer() {
    const attivi = new Set(streamers.active().map((s) => norm(s.login)));
    if (!attivi.size) return;
    const ora = Date.now();

    for (const modulo of modulesDb.all()) {
      const tr = modulo.trigger || {};
      if (tr.tipo !== 'timer') continue;
      const channel = norm(modulo.channel);
      if (!attivi.has(channel)) continue;                 // solo canali con bot acceso

      const minuti = Math.max(1, Math.floor(Number(tr.minuti) || 0));
      if (!minuti) continue;
      const chiave = channel + '|' + modulo.id;
      const last = this._timerLast.get(chiave) || 0;
      if (ora - last < minuti * 60_000) continue;         // non è ancora ora

      // se richiesto, servono almeno N messaggi nuovi (umani) nella finestra
      const minMsg = Math.floor(Number(tr.minMessaggi) || 0);
      if (minMsg > 0) {
        const da = last || (ora - minuti * 60_000);
        const nuovi = memory.messagesSince(channel, da).filter((m) => !m.from_bot).length;
        if (nuovi < minMsg) continue;
      }

      this._timerLast.set(chiave, ora);
      const ctx = this._ctxTimer(channel);
      this.esegui(modulo, ctx, (t) => this._say(channel, t))
        .catch((e) => log.debug('timer esegui:', e?.message || e));
    }
  }

  // ============================================================ PROVA e API

  // Esegue un modulo una volta col contesto "di prova" (autore = streamer),
  // BYPASSANDO le condizioni (cooldown/probabilità/live): la "Prova" deve
  // sempre mostrare un risultato. Ritorna false se il modulo non esiste.
  async provaModulo(channel, id, say) {
    const ch = norm(channel);
    const modulo = modulesDb.get(ch, Number(id));
    if (!modulo) return false;
    await this.esegui(modulo, this._ctxProva(ch), say, { saltaCondizioni: true });
    return true;
  }

  // Ingresso via API esterna: 'messaggio' → say, 'effetto' → effects.fire,
  // 'modulo' → trova per id o nome ed esegui (rispettando le sue condizioni).
  async eseguiPerApi(channel, body, say) {
    const ch = norm(channel);
    const azione = norm(body?.azione);
    const dire = typeof say === 'function' ? say : ((t) => this._say(ch, t));
    const ctx = this._ctxApi(ch);

    if (azione === 'messaggio') {
      const t = await this.espandi(body?.testo, ctx);
      if (t) dire(t);
      return true;
    }
    if (azione === 'effetto') {
      this.effects?.fire(ch, body?.comando);
      return true;
    }
    if (azione === 'modulo') {
      const rif = body?.modulo;
      let modulo = null;
      const idNum = Number(rif);
      if (Number.isFinite(idNum) && idNum > 0) modulo = modulesDb.get(ch, idNum);
      if (!modulo) {
        const nome = norm(rif).trim();
        modulo = modulesDb.list(ch).find((m) => norm(m.nome) === nome) || null;
      }
      if (!modulo) return false;
      await this.esegui(modulo, ctx, dire);
      return true;
    }
    return false;
  }

  // ============================================================ ESECUZIONE

  // Valuta le CONDIZIONI e, se passano, esegue le AZIONI in sequenza. Ritorna
  // true se le azioni sono state eseguite (utile a chi vuole sapere se il
  // modulo è davvero scattato, es. eseguiVoce); false se saltato per condizioni.
  async esegui(modulo, ctx, say, opts = {}) {
    if (!modulo || !Array.isArray(modulo.azioni) || !modulo.azioni.length) return false;

    if (!opts.saltaCondizioni) {
      let ok = false;
      try { ok = await this._condizioniOk(modulo, ctx); } catch { ok = false; }
      if (!ok) return false;
    }

    const dire = typeof say === 'function' ? say : ((t) => this._say(ctx.channel, t));
    let eseguite = 0;
    for (const azione of modulo.azioni) {
      if (eseguite >= MAX_AZIONI) break;
      // su Telegram eseguiamo SOLO le azioni "messaggio" (le altre — effetti,
      // timeout, clip — sono cose di Twitch e non hanno senso in un gruppo).
      if (opts.soloMessaggi && azione?.tipo !== 'messaggio') continue;
      eseguite++;
      try {
        await this._eseguiAzione(azione, ctx, dire);
      } catch (e) {
        // un errore in un'azione NON blocca quelle successive
        log.debug(`azione ${azione?.tipo} fallita:`, e?.message || e);
      }
    }
    return true;
  }

  // Valuta il blocco SE. Ordine: ruolo → probabilità → live/offline → cooldown
  // (il cooldown si "consuma" solo se stiamo davvero per eseguire).
  async _condizioniOk(modulo, ctx) {
    const c = modulo.condizioni || {};

    // ruolo minimo (tier). I contesti di sistema (evento/timer/api/prova) hanno
    // _livello = mod, quindi passano sempre.
    if (c.tier && c.tier !== 'tutti') {
      const richiesto = TIER_SCALA[c.tier] ?? 0;
      const livello = ctx._livello ?? TIER_SCALA.mod;
      if (livello < richiesto) return false;
    }

    // SU QUALI PIATTAFORME. Assente o vuoto = TUTTE: e' cosi' che si comportano
    // i moduli creati prima che le piattaforme fossero piu' d'una, ed e' anche
    // quello che uno si aspetta da un comando nuovo. Un elenco che non contiene
    // la piattaforma da cui arriva il messaggio ferma il modulo qui.
    if (Array.isArray(c.piattaforme) && c.piattaforme.length) {
      const da = ctx.piattaforma || 'twitch';
      if (!c.piattaforme.includes(da)) return false;
    }

    // probabilità
    if (c.probabilita != null && Number(c.probabilita) < 100) {
      const p = Math.max(0, Math.min(100, Number(c.probabilita) || 0));
      if (Math.random() * 100 >= p) return false;
    }

    // solo se in live / solo se offline
    if (c.soloLive || c.soloOffline) {
      const live = !!(await this._stream(ctx.channel));
      if (c.soloLive && !live) return false;
      if (c.soloOffline && live) return false;
    }

    // cooldown per (channel, modulo.id)
    if (c.cooldown && Number(c.cooldown) > 0) {
      const chiave = ctx.channel + '|' + modulo.id;
      const ora = Date.now();
      if (ora < (this._cooldown.get(chiave) || 0)) return false;
      this._cooldown.set(chiave, ora + Number(c.cooldown) * 1000);
    }

    return true;
  }

  // Esegue una singola azione.
  async _eseguiAzione(azione, ctx, dire) {
    switch (azione?.tipo) {
      case 'messaggio': {
        const t = await this.espandi(azione.testo, ctx);
        if (t) dire(t);
        return;
      }
      case 'effetto': {
        this.effects?.fire(ctx.channel, azione.comando);
        return;
      }
      case 'contatore': {
        const nome = azione.nome;
        if (!nome) return;
        if (azione.op === 'incrementa') {
          counters.inc(ctx.channel, nome, azione.valore != null ? Number(azione.valore) : 1);
        } else if (azione.op === 'azzera') {
          counters.set(ctx.channel, nome, 0);
        } else if (azione.op === 'imposta') {
          counters.set(ctx.channel, nome, Number(azione.valore) || 0);
        }
        return;
      }
      case 'webhook': {
        if (!azione.url) return;
        const risposta = await this.fetchWebhook(azione.url, this._payloadWebhook(ctx));
        if (azione.usaRisposta && risposta && typeof risposta.reply === 'string') {
          const t = await this.espandi(risposta.reply, ctx);
          if (t) dire(t);
        }
        return;
      }
      case 'attendi': {
        const sec = Math.max(0, Math.min(MAX_ATTESA_S, Number(azione.secondi) || 0));
        if (sec > 0) await sleep(sec * 1000);
        return;
      }
      case 'overlayTesto': {
        const testo = await this.espandi(azione.testo, ctx);
        const durata = Math.max(500, Math.min(60_000, Number(azione.durata) || 5000));
        this.effects?.emit(ctx.channel, { tipo: 'testo', testo, durata });
        return;
      }
      case 'timeout': {
        await this._timeout(ctx, Number(azione.secondi) || 0);
        return;
      }
      case 'clip': {
        // crea una clip vera del momento (es. comando vocale "clippa")
        const clip = await this.helix?.createClip?.(ctx.channel).catch(() => null);
        if (clip?.url) {
          try { clips.log(ctx.channel, clip.id || '', clip.url, azione.motivo || 'modulo'); } catch { /* niente */ }
          const t = azione.testo
            ? await this.espandi(azione.testo, ctx)
            : 'Clip salvata! ' + clip.url;
          if (t) dire(t);
        }
        return;
      }
      case 'categoria': {
        // cambia la categoria/gioco del canale su Twitch. Il "gioco" può usare le
        // variabili ($args, $arg1, ...): così "!gioco fortnite" → categoria Fortnite.
        // Se il testo è impreciso, il bot sceglie la categoria Twitch più somigliante.
        const q = (await this.espandi(azione.gioco, ctx, { noAzioni: true })).trim();
        if (!q) return;
        const cat = await risolviCategoria(this.helix, q).catch(() => null);
        if (!cat) { if (azione.annuncia !== false) dire(`🤔 Non ho trovato la categoria "${q}".`); return; }
        try {
          await this.helix?.setChannelInfo?.(ctx.channel, { gameId: cat.id });
          if (azione.annuncia !== false) dire(`🎮 Categoria aggiornata: ${cat.name}`);
        } catch (e) {
          // scope mancante o errore Twitch: non blocca le altre azioni
          log.debug('categoria via modulo fallita:', e?.message || e);
          if (azione.annuncia !== false && (e?.status === 401 || e?.status === 403)) {
            dire('🔒 Mi manca il permesso per cambiare categoria: riautorizza dalla dashboard.');
          }
        }
        return;
      }
      case 'musica': {
        // mette un brano nella coda Spotify del canale. Il "brano" può usare le
        // variabili ($args): comando fisso (es. !sigla → un brano preciso) oppure
        // libero (es. !metti $args). Richiede l'add-on Musica e Spotify collegato.
        if (!canaleHa(ctx.channel, 'musica')) return;
        if (!spotify.collegato(ctx.channel)) { if (azione.annuncia !== false) dire('🎵 Spotify non è collegato: fallo dal pannello.'); return; }
        const q = (await this.espandi(azione.brano, ctx)).trim();
        if (!q) return;
        const brano = await spotify.cerca(ctx.channel, q).catch(() => null);
        if (!brano) { if (azione.annuncia !== false) dire(`🎵 Non ho trovato "${q}" su Spotify.`); return; }
        const r = await spotify.aggiungiInCoda(ctx.channel, brano.uri).catch(() => ({ ok: false, status: 0 }));
        if (azione.annuncia !== false) {
          if (r.ok) dire(`🎵 In coda: ${brano.nome} — ${brano.artisti} 🎶`);
          else if (r.status === 404) dire('🎵 Nessun dispositivo Spotify attivo.');
          else dire('🎵 Non sono riuscito ad aggiungere il brano.');
        }
        return;
      }
      case 'titolo': {
        // cambia il titolo dello stream su Twitch. Testo libero, con variabili
        // ($args, $gioco, ...): es. "In diretta: $gioco con la community!".
        const t = (await this.espandi(azione.testo, ctx, { noAzioni: true })).trim().slice(0, 140);
        if (!t) return;
        try {
          await this.helix?.setChannelInfo?.(ctx.channel, { title: t });
          if (azione.annuncia !== false) dire(`📝 Titolo aggiornato: ${t}`);
        } catch (e) {
          log.debug('titolo via modulo fallita:', e?.message || e);
          if (azione.annuncia !== false && (e?.status === 401 || e?.status === 403)) {
            dire('🔒 Mi manca il permesso per cambiare titolo: riautorizza dalla dashboard.');
          }
        }
        return;
      }
      case 'annuncia': {
        // annuncio evidenziato in chat (/announce), con colore opzionale.
        const t = (await this.espandi(azione.testo, ctx)).trim();
        if (!t) return;
        const r = await this.helix?.announce?.(ctx.channel, t, azione.colore || 'primary');
        if (r && !r.ok && (r.motivo || '').includes('permesso') && azione.annuncia !== false) {
          dire('🔒 Mi manca il permesso per gli annunci: riautorizza dalla dashboard.');
        }
        return;
      }
      case 'shoutout': {
        // shoutout ufficiale (banner). Destinatario: il login fisso in azione.canale,
        // altrimenti il nome dopo il comando ($touser), altrimenti chi ha raidato.
        let chi = String(azione.canale || '').replace(/^@/, '').trim().toLowerCase();
        if (!chi) chi = String((ctx.args && ctx.args[0]) || ctx._vars?.raiderLogin || ctx._vars?.raider || '').replace(/^@/, '').trim().toLowerCase();
        if (!chi) return;
        const r = await this.helix?.shoutout?.(ctx.channel, chi);
        if (r?.ok && azione.testo) { const t = await this.espandi(azione.testo, ctx); if (t) dire(t); }
        else if (r && !r.ok && (r.motivo || '').includes('permesso') && azione.annuncia !== false) {
          dire('🔒 Mi manca il permesso per lo shoutout: riautorizza dalla dashboard.');
        }
        return;
      }
      default:
        return;
    }
  }

  // Azione di moderazione "timeout": la proviamo SOLO se Helix espone un metodo
  // dedicato. Non inventiamo endpoint/scope: se manca, si logga e si salta.
  async _timeout(ctx, secondi) {
    const bersaglio = ctx.userLogin || ctx.user;
    if (typeof this.helix?.timeout === 'function') {
      try {
        await this.helix.timeout(ctx.channel, bersaglio, Math.max(1, Math.min(1_209_600, secondi || 1)));
      } catch (e) {
        log.debug('timeout via helix fallito:', e?.message || e);
      }
    } else {
      log.debug('azione timeout non supportata (helix.timeout assente): salto');
    }
  }

  // ============================================================ VARIABILI

  // Sostituisce le variabili nel testo. NIENTE eval: solo replace. Le variabili
  // che richiedono I/O (uptime/gioco/titolo) sono risolte con un await prima di
  // comporre il messaggio. Le sconosciute diventano stringa vuota.
  async espandi(testo, ctx, opts = {}) {
    let s = String(testo ?? '');
    if (!s) return '';

    // AZIONI inline nei comandi: $titolo(...) cambia il titolo, $categoria(...)
    // (alias $gioco(...)) cambia la categoria/gioco su Twitch. Sono effetti
    // collaterali: li eseguiamo qui e togliamo il token dal testo, così lo
    // streamer scrive la sua conferma attorno (es. "!fortnite → $categoria(Fortnite) Si gioca!").
    // opts.noAzioni evita il rientro quando espandiamo il contenuto interno.
    if (this.helix && !opts.noAzioni) {
      const azioni = [];
      s = s.replace(/\$(titolo|categoria|gioco)\(([^)]*)\)/gi, (_, tipo, inner) => {
        azioni.push({ tipo: tipo.toLowerCase() === 'titolo' ? 'titolo' : 'categoria', inner });
        return '';
      });
      for (const a of azioni) {
        const valore = (await this.espandi(a.inner, ctx, { noAzioni: true })).trim();
        if (!valore) continue;
        try {
          if (a.tipo === 'titolo') {
            await this.helix.setChannelInfo?.(ctx.channel, { title: valore.slice(0, 140) });
          } else {
            const cat = await risolviCategoria(this.helix, valore).catch(() => null);
            if (cat) await this.helix.setChannelInfo?.(ctx.channel, { gameId: cat.id });
          }
        } catch (e) { log.debug(`azione inline ${a.tipo} fallita:`, e?.message || e); }
      }
    }

    // variabili "costose": risolvile solo se davvero citate
    let stream = null;
    if (/\$uptime|\$gioco|\$titolo|\$spettatori/.test(s)) {
      try { stream = await this._stream(ctx.channel); } catch { stream = null; }
    }

    // FOLLOWAGE: da quanto un utente segue il canale. Senza destinatario ($touser)
    // vale per chi scrive; con "!followage @tizio" vale per il destinatario. Serve
    // lo scope moderator:read:followers sul token del broadcaster: se manca, resta
    // vuota (niente errori in chat).
    let followText = '';
    if (/\$followage/.test(s) && this.helix?.getFollowAge) {
      const chi = String((ctx.args && ctx.args[0]) || '').replace(/^@/, '').trim().toLowerCase();
      try {
        let uid = '';
        if (chi) {
          const u = await this.helix.getUserByLogin?.(chi);
          uid = u?.id || '';
        } else {
          uid = ctx.userId || '';
        }
        if (uid) {
          const iso = await this.helix.getFollowAge(ctx.channel, uid);
          if (iso) followText = this._formattaDurata(iso);
        }
      } catch (e) { log.debug('followage:', e?.message || e); }
    }

    // ORE GUARDATE: quanto tempo l'utente (o il destinatario "!ore @tizio") ha
    // passato in live sul canale. Dallo store locale watchtime (nessun I/O Twitch).
    // Si accumula col tick ore-guardate: serve lo scope moderator:read:chatters,
    // altrimenti resta a 0 e la variabile è vuota (niente errori in chat).
    let oreText = '';
    if (/\$ore\b|\$oreguardate|\$watchtime|\$tempoguardato/.test(s)) {
      try {
        const chi = String((ctx.args && ctx.args[0]) || ctx.userLogin || ctx.user || '').replace(/^@/, '').trim();
        const sec = chi ? watchtime.get(ctx.channel, chi) : 0;
        if (sec > 0) oreText = this._formattaOre(sec);
      } catch (e) { log.debug('ore:', e?.message || e); }
    }

    // CHATTER A CASO: un nome pescato tra chi ha scritto di recente (per i giochi:
    // "!abbraccia $chattercaso"). Esclude gli echi del bot e, se possibile, chi
    // ha lanciato il comando (così non pesca se stesso). Tutto dalla memoria locale.
    let chatterCaso = '';
    if (/\$chattercaso|\$randomchatter/.test(s)) {
      try {
        const recenti = memory.recent(ctx.channel, 80) || [];
        const io = norm(ctx.display || ctx.user);
        let nomi = [...new Set(recenti.filter((m) => !m.from_bot && m.display).map((m) => m.display))];
        const altri = nomi.filter((n) => norm(n) !== io);
        const pool = altri.length ? altri : nomi;   // se c'è solo l'autore, ripiega su di lui
        if (pool.length) chatterCaso = pool[Math.floor(Math.random() * pool.length)];
      } catch (e) { log.debug('chattercaso:', e?.message || e); }
    }

    // CITAZIONE a caso tra quelle salvate (per comandi tipo "!saggezza" → $cita).
    let citazione = '';
    if (/\$cita/.test(s)) {
      try {
        const q = quotes.random(ctx.channel);
        if (q && q.text) citazione = `“${q.text}”${q.autore ? ' — @' + q.autore : ''}`;
      } catch (e) { log.debug('cita:', e?.message || e); }
    }

    // data/ora locali (runtime del server): utili per comandi tipo "!ora" o "!oggi".
    const adesso = new Date();
    const dataOggi = adesso.toLocaleDateString('it-IT');
    const oraOra = adesso.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const giornoOggi = adesso.toLocaleDateString('it-IT', { weekday: 'long' });

    // SHOUTOUT: l'ultimo gioco/titolo del canale dell'utente citato DOPO il
    // comando ($touser = primo argomento). Es. "!so giorgiottv" →
    // "$touser stava streammando $giocotarget". Serve un destinatario: senza,
    // queste restano vuote (lo shoutout senza @nome non ha niente da dire).
    let bersaglioInfo = null;
    if (/\$giocotarget|\$titolotarget/.test(s) && this.helix) {
      const chi = String((ctx.args && ctx.args[0]) || '').replace(/^@/, '').trim().toLowerCase();
      if (chi) {
        try {
          const u = await this.helix.getUserByLogin?.(chi);
          if (u?.id && this.helix.getChannelInfo) bersaglioInfo = await this.helix.getChannelInfo(u.id);
        } catch (e) { log.debug('shoutout target:', e?.message || e); }
      }
    }

    const ri = (lo, hi) => { lo = Math.round(lo); hi = Math.round(hi); if (lo > hi) [lo, hi] = [hi, lo]; return lo + Math.floor(Math.random() * (hi - lo + 1)); };
    const scegli = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : '');

    // funzioni parametriche (prima delle variabili semplici)
    s = s.replace(/\$count\(([^)]*)\)/g, (_, nome) => String(counters.get(ctx.channel, nome)));
    // $random(a,b) intervallo · $random(n) da 1 a n · $random da solo 0-100
    s = s.replace(/\$random\(\s*(-?\d+)\s*(?:,\s*(-?\d+)\s*)?\)/g, (_, a, b) =>
      String(b != null ? ri(parseInt(a, 10), parseInt(b, 10)) : ri(1, parseInt(a, 10))));
    // $decimale(a,b): numero con 2 decimali (per metriche tipo 1,73)
    s = s.replace(/\$decimale\(\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*\)/g, (_, a, b) => {
      let lo = parseFloat(String(a).replace(',', '.')), hi = parseFloat(String(b).replace(',', '.'));
      if (lo > hi) [lo, hi] = [hi, lo];
      return (lo + Math.random() * (hi - lo)).toFixed(2).replace('.', ',');
    });
    // $misura(a,b,unità): numero casuale con un'unità a scelta → "23 cm"
    s = s.replace(/\$misura\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*([^)]*)\)/g, (_, a, b, u) =>
      `${ri(parseInt(a, 10), parseInt(b, 10))} ${String(u).trim()}`);
    // $pick(a|b|c) / $scegli(a|b|c): scelta a caso
    s = s.replace(/\$(?:pick|scegli)\(([^)]*)\)/g, (_, lista) =>
      scegli(String(lista).split('|').map((x) => x.trim()).filter(Boolean)));

    // $arg1..$argN (prima delle variabili semplici, così non collidono con $args)
    s = s.replace(/\$arg(\d+)/g, (_, n) => {
      const i = parseInt(n, 10) - 1;
      return (ctx.args && ctx.args[i] != null) ? String(ctx.args[i]) : '';
    });

    // variabili DINAMICHE (novelty): un valore fresco ad OGNI occorrenza, così
    // due $dado nella stessa frase danno numeri diversi → combinazioni infinite.
    const dinamiche = {
      random: () => String(ri(0, 100)),
      numero: () => String(ri(0, 100)),
      percentuale: () => ri(0, 100) + '%',
      percento: () => ri(0, 100) + '%',
      dado: () => String(ri(1, 6)),
      moneta: () => scegli(['testa', 'croce']),
      sino: () => scegli(['sì', 'no']),
      altezza: () => (1.40 + Math.random() * 0.70).toFixed(2).replace('.', ',') + ' m',
      peso: () => ri(40, 130) + ' kg',
      lunghezza: () => ri(1, 30) + ' cm',
      grandezza: () => ri(1, 50) + ' cm',
      eta: () => ri(1, 99) + ' anni',
      temperatura: () => ri(-10, 45) + '°C',
      velocita: () => ri(1, 320) + ' km/h',
      distanza: () => ri(1, 1000) + ' km',
      soldi: () => ri(0, 100000).toLocaleString('it-IT') + ' €',
      euro: () => ri(0, 100000).toLocaleString('it-IT') + ' €',
      livello: () => String(ri(1, 100)),
      colore: () => scegli(['rosso', 'blu', 'verde', 'giallo', 'viola', 'arancione', 'rosa', 'nero', 'celeste', 'turchese', 'fucsia', 'oro']),
      emoji: () => scegli(['😂', '🔥', '💀', '😎', '🤡', '👑', '💜', '🚀', '🎉', '🥶', '🤯', '😳', '🫡', '🧠', '⚡', '🍕', '🐐']),
      animale: () => scegli(['gatto', 'cane', 'panda', 'drago', 'lama', 'bradipo', 'procione', 'capibara', 'pinguino', 'koala', 'volpe', 'riccio']),
    };

    const ev = ctx._vars || {};
    const vars = {
      user: ctx.user || '',
      // destinatario del comando: il nome scritto dopo (@ opzionale, ripulito),
      // altrimenti chi scrive. È il "tag streamer" a cui si legano $giocotarget/$titolotarget.
      touser: String((ctx.args && ctx.args[0]) || ctx.user || '').replace(/^@/, ''),
      // $target = alias di $touser (chi arriva da altri bot lo conosce così)
      target: String((ctx.args && ctx.args[0]) || ctx.user || '').replace(/^@/, ''),
      args: ctx.argsRaw || '',
      canale: ctx.channel || '',
      uptime: stream?.started_at ? this._formattaUptime(stream.started_at) : '',
      gioco: stream?.game_name || '',
      titolo: stream?.title || '',
      // spettatori collegati adesso (vuoto se offline)
      spettatori: stream?.viewer_count != null ? String(stream.viewer_count) : '',
      // da quanto segue l'utente (o il destinatario) — vuoto se non segue / manca lo scope
      followage: followText,
      // ore guardate dell'utente (o del destinatario) — vuoto se 0 / manca lo scope
      ore: oreText,
      oreguardate: oreText,
      watchtime: oreText,
      tempoguardato: oreText,
      // un utente a caso tra chi ha scritto di recente (per i giochi)
      chattercaso: chatterCaso,
      randomchatter: chatterCaso,
      // una citazione a caso tra quelle salvate (!cita)
      cita: citazione,
      // data/ora locali
      data: dataOggi,
      ora: oraOra,
      giorno: giornoOggi,
      // SHOUTOUT: gioco/titolo dell'ULTIMA diretta del destinatario ($touser)
      giocotarget: bersaglioInfo?.game_name || '',
      titolotarget: bersaglioInfo?.title || '',
      // variabili evento
      raider: ev.raider || '',
      // tracking webcam: gesto della mano ed emozione dominante del volto
      gesto: ev.gesto || '',
      emozione: ev.emozione || '',
      viewers: ev.viewers != null && ev.viewers !== '' ? String(ev.viewers) : '',
      mesi: ev.mesi != null && ev.mesi !== '' ? String(ev.mesi) : '',
      bits: ev.bits != null && ev.bits !== '' ? String(ev.bits) : '',
      premio: ev.premio || '',
    };

    // variabili semplici $nome: prima le dinamiche (valore fresco), poi quelle di
    // contesto. Sconosciute → stringa vuota. Il primo carattere è una lettera:
    // così importi tipo "$5" restano intatti.
    s = s.replace(/\$([a-zA-Z]\w*)/g, (m, name) => {
      const k = name.toLowerCase();
      if (typeof dinamiche[k] === 'function') return String(dinamiche[k]());
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : '';
    });

    return s.slice(0, MAX_TESTO);
  }

  // Ore guardate in forma leggibile: "3h 20m" oppure "45m".
  _formattaOre(sec) {
    const min = Math.max(0, Math.floor((Number(sec) || 0) / 60));
    const h = Math.floor(min / 60);
    return h > 0 ? `${h}h ${min % 60}m` : `${min}m`;
  }

  _formattaUptime(startedAt) {
    const start = new Date(startedAt).getTime();
    if (!Number.isFinite(start)) return '';
    const min = Math.max(0, Math.floor((Date.now() - start) / 60_000));
    const h = Math.floor(min / 60);
    return h > 0 ? `${h}h ${min % 60}m` : `${min}m`;
  }

  // Durata "umana" da una data ISO a ORA (per $followage): "2 anni e 3 mesi",
  // "5 mesi", "12 giorni", "3 ore". Approssimazione mesi=30gg/anno=365gg: per un
  // "da quanto mi segui" in chat va più che bene.
  _formattaDurata(fromISO) {
    const start = new Date(fromISO).getTime();
    if (!Number.isFinite(start)) return '';
    const sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const giorniTot = Math.floor(sec / 86400);
    const anni = Math.floor(giorniTot / 365);
    const mesi = Math.floor((giorniTot % 365) / 30);
    const giorni = giorniTot % 30;
    const plur = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
    const parti = [];
    if (anni) parti.push(plur(anni, 'anno', 'anni'));
    if (mesi) parti.push(plur(mesi, 'mese', 'mesi'));
    if (giorni && !anni) parti.push(plur(giorni, 'giorno', 'giorni'));
    if (parti.length) return parti.join(' e ');
    const ore = Math.floor(sec / 3600);
    if (ore > 0) return plur(ore, 'ora', 'ore');
    return 'meno di un\'ora';
  }

  // ============================================================ CONTESTI

  _ctxDaMessaggio(msg, channel, livello, args, argsRaw) {
    const nome = msg.display || msg.user || '';
    return {
      channel,
      // Da dove arriva. Serve alla condizione «su quali piattaforme»: un
      // messaggio senza piattaforma e' Twitch, perche' Twitch c'era prima di
      // tutte e i moduli vecchi non hanno questo campo.
      piattaforma: msg.piattaforma || 'twitch',
      user: nome,                   // nome visualizzato (per $user/$touser)
      userLogin: msg.user || '',    // login (per moderazione/timeout)
      userId: msg.userId || (msg.tags && msg.tags['user-id']) || '', // id numerico (per $followage)
      display: nome,
      args,
      argsRaw,
      evento: null,
      _livello: livello,
      _vars: {},
    };
  }

  _ctxDaEvento(ev, channel, evento) {
    const d = ev.data || {};
    const raider = d.from_broadcaster_user_name || '';
    const user = d.user_name || d.user_login || raider || '';
    return {
      channel,
      user,
      userLogin: norm(d.user_login || d.user_name || ''),
      display: user,
      args: [],
      argsRaw: '',
      evento,
      _livello: TIER_SCALA.mod,     // contesto di sistema: le condizioni di ruolo passano
      _vars: {
        raider,
        raiderLogin: norm(d.from_broadcaster_user_login || ''),
        viewers: d.viewers,
        mesi: d.cumulative_months ?? d.duration_months,
        bits: d.bits,
        premio: d.reward?.title || '',
        // tracking webcam: gesto della mano ($gesto) ed emozione del volto ($emozione)
        gesto: d.gesto || '',
        emozione: d.emozione || '',
        user,
      },
    };
  }

  _ctxTimer(channel) {
    const nome = streamers.get(channel)?.display || channel;
    return {
      channel, user: nome, userLogin: channel, display: nome,
      args: [], argsRaw: '', evento: null,
      _livello: TIER_SCALA.mod, _vars: {},
    };
  }

  _ctxApi(channel) {
    const nome = streamers.get(channel)?.display || channel;
    return {
      channel, user: nome, userLogin: channel, display: nome,
      args: [], argsRaw: '', evento: 'api',
      _livello: TIER_SCALA.mod, _vars: {},
    };
  }

  // Contesto di un innesco 'voce': l'autore è lo streamer (contesto di sistema),
  // gli args sono le parole della frase sentita (così $arg1, $args funzionano).
  _ctxVoce(channel, frase, parole) {
    const nome = streamers.get(channel)?.display || channel;
    const args = Array.isArray(parole) ? parole : String(frase || '').split(' ').filter(Boolean);
    return {
      channel, user: nome, userLogin: channel, display: nome,
      args, argsRaw: String(frase || ''), evento: 'voce',
      _livello: TIER_SCALA.mod, _vars: {},
    };
  }

  _ctxProva(channel) {
    const nome = streamers.get(channel)?.display || channel;
    return {
      channel, user: nome, userLogin: channel, display: nome,
      args: ['esempio', 'prova'], argsRaw: 'esempio prova', evento: null,
      _livello: TIER_SCALA.mod,
      _vars: { raider: 'RaiderDiProva', viewers: 42, mesi: 3, bits: 100, premio: 'Premio di prova', user: nome },
    };
  }

  // ============================================================ SERVIZI

  // say di default via manager (quando non arriva un say esplicito).
  _say(channel, text) {
    try { this.manager?.say?.(channel, text); }
    catch (e) { log.debug('say:', e?.message || e); }
  }

  // Stato live del canale con cache 30s (anche il "null = offline" è cachato,
  // così soloLive/soloOffline non martellano Helix).
  async _stream(channel) {
    const ch = norm(channel);
    const c = this._streamCache.get(ch);
    const ora = Date.now();
    if (c && ora - c.ts < CACHE_STREAM_MS) return c.stream;
    let stream = null;
    try { stream = await this.helix?.getStream(ch); } catch { stream = null; }
    this._streamCache.set(ch, { stream, ts: ora });
    return stream;
  }

  _payloadWebhook(ctx) {
    return {
      channel: ctx.channel,
      user: ctx.user,
      display: ctx.display,
      args: ctx.args || [],
      argsRaw: ctx.argsRaw || '',
      evento: ctx.evento || null,
      variabili: ctx._vars || {},
    };
  }

  // ============================================================ WEBHOOK (guardia SSRF)

  // POST verso un URL esterno con DIFESA anti-SSRF: mai verso l'interno della
  // rete. Accetta solo http/https, rifiuta IP privati/loopback/link-local sia
  // se scritti direttamente sia dopo la risoluzione DNS del nome. Niente
  // redirect (eviterebbero la guardia), timeout 5s, risposta letta max ~10KB.
  //
  // ANTI-REBINDING: NON risolviamo il nome "prima" e poi ci colleghiamo (quella
  // finestra permette il DNS-rebinding: pubblico al controllo, privato alla
  // connessione). Usiamo un `lookup` personalizzato che valida e restituisce a
  // net.connect SOLO indirizzi pubblici: l'IP validato è ESATTAMENTE quello a
  // cui ci si lega, quindi non c'è alcuna finestra sfruttabile.
  async fetchWebhook(url, payload) {
    let u;
    try { u = new URL(String(url)); } catch { throw new Error('URL webhook non valido'); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocollo webhook non ammesso');
    // IP-letterale: controllalo subito (nessuna risoluzione DNS in gioco).
    if (net.isIP(u.hostname) && this._ipPrivato(u.hostname)) throw new Error('webhook verso IP privato: bloccato');

    const corpo = Buffer.from(JSON.stringify(payload || {}), 'utf8');
    const mod = u.protocol === 'https:' ? https : http;
    const opzioni = {
      method: 'POST',
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: (u.pathname || '/') + (u.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': corpo.length,
        'User-Agent': 'SocialBot-Webhook/1.0',
        'Accept': 'application/json',
      },
      // guardia al momento della connessione: chiude la finestra di rebinding.
      lookup: (h, o, cb) => this._lookupSicuro(h, o, cb),
      timeout: WEBHOOK_TIMEOUT_MS,
    };

    return await new Promise((resolve, reject) => {
      let fatto = false;
      const finisci = (v) => { if (!fatto) { fatto = true; resolve(v); } };
      const fallisci = (e) => { if (!fatto) { fatto = true; reject(e); } };
      const req = mod.request(opzioni, (res) => {
        // Redirect NEGATO: potrebbe puntare all'interno aggirando la guardia.
        if (res.statusCode >= 300 && res.statusCode < 400) { res.destroy(); return fallisci(new Error('redirect webhook non consentito')); }
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          if (size >= WEBHOOK_MAX_BYTES) return;      // già pieno: ignora il resto
          chunks.push(c); size += c.length;
          if (size >= WEBHOOK_MAX_BYTES) res.destroy(); // troppo grande: tronca e chiudi
        });
        const concludi = () => {
          const testo = Buffer.concat(chunks).slice(0, WEBHOOK_MAX_BYTES).toString('utf8');
          try { finisci(JSON.parse(testo)); } catch { finisci(null); }
        };
        res.on('end', concludi);
        res.on('close', concludi);          // scatta anche dopo destroy() per troncatura
        res.on('error', () => finisci(null));
      });
      req.on('timeout', () => req.destroy(new Error('timeout webhook')));
      req.on('error', (e) => fallisci(e));
      req.write(corpo);
      req.end();
    });
  }

  // `lookup` in stile dns.lookup usato da net.connect per il webhook: risolve il
  // nome e SCARTA ogni indirizzo privato/loopback/riservato, passando avanti solo
  // IP pubblici. Essendo lo stesso lookup che la connessione userà davvero, non
  // esiste finestra di DNS-rebinding tra "controllo" e "connessione".
  _lookupSicuro(hostname, options, callback) {
    const cb = typeof options === 'function' ? options : callback;
    const opts = (options && typeof options === 'object') ? options : {};
    dns.lookup(hostname, { ...opts, all: true }, (err, indirizzi) => {
      if (err) return cb(err);
      const buoni = (indirizzi || []).filter((a) => a && !this._ipPrivato(a.address));
      if (!buoni.length) return cb(new Error('host webhook risolve a IP privato: bloccato'));
      if (opts.all) return cb(null, buoni);
      return cb(null, buoni[0].address, buoni[0].family);
    });
  }

  // true se l'IP appartiene a un range privato/loopback/link-local/riservato.
  _ipPrivato(ip) {
    const v = String(ip || '');
    const tipo = net.isIP(v);
    if (tipo === 4) {
      const p = v.split('.').map(Number);
      if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
      const [a, b] = p;
      if (a === 0) return true;                          // 0.0.0.0/8
      if (a === 127) return true;                        // loopback 127/8
      if (a === 10) return true;                         // privato 10/8
      if (a === 172 && b >= 16 && b <= 31) return true;  // privato 172.16/12
      if (a === 192 && b === 168) return true;           // privato 192.168/16
      if (a === 169 && b === 254) return true;           // link-local 169.254/16
      if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
      if (a >= 224) return true;                         // multicast/riservati
      return false;
    }
    if (tipo === 6) {
      const s = v.toLowerCase();
      if (s === '::1' || s === '::') return true;        // loopback / unspecified
      if (s.startsWith('fe80')) return true;             // link-local
      if (s.startsWith('fc') || s.startsWith('fd')) return true; // fc00::/7 (ULA)
      const m = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
      if (m) return this._ipPrivato(m[1]);
      return false;
    }
    return true;   // non è un IP valido: per prudenza rifiuta
  }
}
