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
import dns from 'node:dns/promises';
import net from 'node:net';
import { modules as modulesDb, counters, memory, streamers, clips } from '../db.js';
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

  // Vero se `testo` combacia col trigger 'parola' (modo + opzioni case/punt).
  _confrontaParola(tr, testo) {
    const needle = this._preparaConfronto(tr.testo, tr);
    if (!needle) return false;
    const hay = this._preparaConfronto(testo, tr);
    const modo = tr.modo || 'contiene';
    if (modo === 'esatto') return hay === needle;
    if (modo === 'inizia') return hay.startsWith(needle);
    return hay.includes(needle);
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
  async espandi(testo, ctx) {
    let s = String(testo ?? '');
    if (!s) return '';

    // variabili "costose": risolvile solo se davvero citate
    let stream = null;
    if (/\$uptime|\$gioco|\$titolo/.test(s)) {
      try { stream = await this._stream(ctx.channel); } catch { stream = null; }
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
      touser: (ctx.args && ctx.args[0]) ? ctx.args[0] : (ctx.user || ''),
      args: ctx.argsRaw || '',
      canale: ctx.channel || '',
      uptime: stream?.started_at ? this._formattaUptime(stream.started_at) : '',
      gioco: stream?.game_name || '',
      titolo: stream?.title || '',
      // variabili evento
      raider: ev.raider || '',
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

  _formattaUptime(startedAt) {
    const start = new Date(startedAt).getTime();
    if (!Number.isFinite(start)) return '';
    const min = Math.max(0, Math.floor((Date.now() - start) / 60_000));
    const h = Math.floor(min / 60);
    return h > 0 ? `${h}h ${min % 60}m` : `${min}m`;
  }

  // ============================================================ CONTESTI

  _ctxDaMessaggio(msg, channel, livello, args, argsRaw) {
    const nome = msg.display || msg.user || '';
    return {
      channel,
      user: nome,                   // nome visualizzato (per $user/$touser)
      userLogin: msg.user || '',    // login (per moderazione/timeout)
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
        viewers: d.viewers,
        mesi: d.cumulative_months ?? d.duration_months,
        bits: d.bits,
        premio: d.reward?.title || '',
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
  async fetchWebhook(url, payload) {
    let u;
    try { u = new URL(String(url)); } catch { throw new Error('URL webhook non valido'); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocollo webhook non ammesso');

    const host = u.hostname;
    if (net.isIP(host)) {
      if (this._ipPrivato(host)) throw new Error('webhook verso IP privato: bloccato');
    } else {
      let indirizzi;
      try { indirizzi = await dns.lookup(host, { all: true }); }
      catch { throw new Error('host webhook non risolvibile'); }
      for (const a of indirizzi) {
        if (this._ipPrivato(a.address)) throw new Error('host webhook risolve a IP privato: bloccato');
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      const res = await fetch(u.toString(), {
        method: 'POST',
        redirect: 'manual',     // un redirect potrebbe puntare all'interno: lo neghiamo
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SocialBot-Webhook/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload || {}),
        signal: controller.signal,
      });
      const testo = await this._leggiLimitato(res, WEBHOOK_MAX_BYTES);
      try { return JSON.parse(testo); } catch { return null; }
    } finally {
      clearTimeout(timer);
    }
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

  // Legge al massimo `max` byte dal corpo della risposta (protezione da risposte
  // enormi), poi tronca. Tollerante: mai lanciare.
  async _leggiLimitato(res, max) {
    if (!res?.body || typeof res.body.getReader !== 'function') {
      const t = await res.text().catch(() => '');
      return t.slice(0, max);
    }
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (size < max) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
        size += value.length;
      }
    } catch { /* fine o errore stream */ }
    try { await reader.cancel(); } catch { /* ignora */ }
    return Buffer.concat(chunks).slice(0, max).toString('utf8');
  }
}
