// Dashboard web di AndryBot (bot.andryxify.it).
// Qui lo streamer: fa login con Twitch, chiede l'abilitazione, concede i
// permessi (il bot parla CON IL SUO ACCOUNT), configura personalità,
// conoscenza, clip e regole, e consulta memoria e statistiche.
// L'amministratore (andryxify) approva e gestisce gli streamer.
import express from 'express';
import cookieSession from 'cookie-session';
import multer from 'multer';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config, SCOPES, missingConfig } from '../config.js';
import { makeLog } from '../logger.js';
import { db, tokens, streamers, memory, clips, knowledge, effects as effectsDb, normComando, modules as modulesDb } from '../db.js';
import { comprimi } from '../features/compress.js';
import { pretrain } from '../ai/pretrain.js';
import { redeemPass } from './gate.js';

const log = makeLog('web');

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;
const TONI_VALIDI = ['scherzoso', 'amichevole', 'serio'];
const STATI_VALIDI = ['pending', 'approved', 'disabled'];
const TIER_VALIDI = ['tutti', 'sub', 'vip', 'mod'];
const UPLOAD_MAX = 30 * 1024 * 1024;   // 30 MB in ingresso (l'output sarà molto più piccolo)

// Moduli: tipi di innesco e di azione ammessi (validazione lato API)
const MOD_TRIGGER = ['comando', 'parola', 'evento', 'timer', 'manuale'];
const MOD_AZIONI = ['messaggio', 'effetto', 'contatore', 'webhook', 'attendi', 'overlayTesto', 'timeout'];
const EXT_MAX_MIN = 30;   // ingresso esterno: max richieste al minuto per login

export function startWeb({ auth, helix, manager, effects, modules }) {
  const app = express();

  // dietro reverse proxy (nginx/caddy) serve per cookie "secure" e IP reali
  app.set('trust proxy', 1);

  app.use(cookieSession({
    name: 'andrybot',
    keys: [config.sessionSecret || 'dev-solo-locale'],
    maxAge: 30 * 24 * 60 * 60 * 1000,          // 30 giorni
    sameSite: 'lax',
    secure: config.baseUrl.startsWith('https'),
    httpOnly: true,
  }));
  app.use(express.json());

  // ------------------------------------------------------------ helper

  // utente loggato in sessione (o null)
  const currentUser = (req) => req.session?.user || null;
  const isAdmin = (user) => !!user && config.adminLogins.includes(user.login);

  // risposta "il sito non esiste": nessun indizio, nessun brand, nessun corpo utile
  const notFound = (res) => res.status(404).type('text/plain').send('Not Found');

  // ---- CANCELLO: senza sessione valida, bot.andryxify.it non esiste ----
  // Passano soltanto /health (per Caddy/Docker) e /entra (l'ingresso con il
  // pass monouso del sito). Tutto il resto — dashboard, file statici, API,
  // perfino le rotte OAuth — resta invisibile (404) finché non si è entrati
  // con un pass valido. È il "labirinto": chi non arriva da andryxify.it non
  // trova nulla da esplorare.
  // Eccezione per l'overlay OBS: /overlay/* è pubblico ma si protegge da solo
  // con la chiave (?key=...), perché OBS lo apre senza sessione/cookie.
  // Stessa logica per /api/ext/*: l'ingresso esterno si protegge con la chiave
  // API del canale (Authorization: Bearer ...), non con la sessione.
  const PUBBLICI = new Set(['/health', '/entra']);
  app.use((req, res, next) => {
    if (currentUser(req) || PUBBLICI.has(req.path)
        || req.path.startsWith('/overlay/') || req.path.startsWith('/api/ext/')) return next();
    return notFound(res);
  });

  // file statici della dashboard (serviti solo a chi ha superato il cancello)
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), 'public');
  app.use(express.static(publicDir));

  function requireLogin(req, res, next) {
    if (!currentUser(req)) return res.status(401).json({ errore: 'non autenticato' });
    next();
  }
  function requireAdmin(req, res, next) {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ errore: 'non autenticato' });
    if (!isAdmin(u)) return res.status(403).json({ errore: 'riservato ad andryxify' });
    next();
  }

  // wrapper per le route async: qualsiasi errore → 500 JSON (mai HTML)
  const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
    log.error(req.method, req.path, '→', e?.message || e);
    if (!res.headersSent) res.status(500).json({ errore: e?.message || 'errore interno' });
  });

  // Pre-addestramento "fire and forget": legge il profilo andryxify.it
  // dello streamer senza bloccare la richiesta HTTP in corso.
  function avviaPretrain(login) {
    Promise.resolve()
      .then(() => pretrain(login, helix))
      .then((esito) => log.info(`pretrain ${login}:`, JSON.stringify(esito ?? {}).slice(0, 300)))
      .catch((e) => log.warn(`pretrain ${login} fallito:`, e?.message || e));
  }

  // true se il pre-addestramento risulta fatto meno di 7 giorni fa
  function pretrainRecente(login) {
    const f = memory.facts(login).find((x) => x.key === 'preaddestramento_ts');
    if (!f) return false;
    const ts = Number(f.value);
    return Number.isFinite(ts) && Date.now() - ts < SETTE_GIORNI_MS;
  }

  // lo streamer ha concesso i permessi chat? (il bot parla col suo account)
  const permessiOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('chat:edit'));

  const sync = () => Promise.resolve(manager.syncChannels?.()).catch(() => {});

  // ------------------------------------------------------------ EFFETTI: cartelle e upload
  // gli effetti vivono in data/effects/<login>/, i file in arrivo in data/tmp/
  const effectsRoot = join(config.dataDir, 'effects');
  const tmpDir = join(config.dataDir, 'tmp');
  mkdirSync(tmpDir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, tmpDir),
      // nome temporaneo neutro (l'estensione vera non serve: usiamo il mimetype)
      filename: (req, file, cb) => cb(null, `up_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`),
    }),
    limits: { fileSize: UPLOAD_MAX, files: 1 },
  });

  // rimuove un file temporaneo (best-effort, non lancia mai)
  const pulisciTemp = async (p) => { if (p) { try { await unlink(p); } catch { /* già rimosso */ } } };

  // ------------------------------------------------------------ OVERLAY per OBS
  // Pubblico (nessuna sessione), ma protetto dalla chiave in ?key=...: OBS lo
  // apre come "Browser Source". La chiave è per canale (streamers.settings).
  const overlayHtml = join(publicDir, 'overlay.html');

  const chiaveOk = (req) => {
    const login = String(req.params.login || '').toLowerCase();
    return !!login && !!req.query.key && req.query.key === effects.overlayKey(login);
  };

  // la pagina dell'overlay
  app.get('/overlay/:login', (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    res.sendFile(overlayHtml);
  });

  // flusso SSE degli effetti in tempo reale
  app.get('/overlay/:login/stream', (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    const login = String(req.params.login).toLowerCase();
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',   // niente buffering lato proxy: gli eventi arrivano subito
    });
    res.flushHeaders?.();
    res.write(': connesso\n\n');   // commento iniziale: apre subito lo stream
    effects.addClient(login, res);
    req.on('close', () => effects.removeClient(login, res));
  });

  // i file media di un effetto (serviti dal disco)
  app.get('/overlay/:login/media/:file', (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    const login = String(req.params.login).toLowerCase();
    const file = String(req.params.file || '');
    // deve essere un basename semplice: niente separatori né risalite di cartella
    if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes('..')) return notFound(res);
    res.sendFile(join(effectsRoot, login, file), { maxAge: '60s' }, (err) => {
      if (err && !res.headersSent) notFound(res);
    });
  });

  // ------------------------------------------------------------ INGRESSO (pass del sito)

  // Unico ingresso pubblico. Lo streamer arriva qui da andryxify.it con un
  // pass usa-e-getta (bot.andryxify.it/entra?pass=...). Il bot lo "brucia"
  // chiamando il sito: se il sito conferma un login abilitato, si crea la
  // sessione. Nessun pass valido → 404, come se la pagina non esistesse.
  app.get('/entra', wrap(async (req, res) => {
    const who = await redeemPass(String(req.query.pass || ''));
    if (!who) return notFound(res);            // pass assente/scaduto/già usato

    // andryxify.it è la fonte di verità sull'abilitazione: lo registriamo
    // localmente come approvato (rispettando un eventuale on/off preesistente).
    streamers.upsertApproved(who.login, who.display, who.userId);
    req.session.user = { login: who.login, display: who.display };

    // primo giro di pre-addestramento dal profilo del sito (max 1 a settimana)
    if (!pretrainRecente(who.login)) avviaPretrain(who.login);
    sync();
    res.redirect('/');
  }));

  // ------------------------------------------------------------ OAuth permessi
  // (raggiungibile solo DOPO essere entrati: il cancello 404-a chi non ha sessione)

  // Concessione permessi: lo streamer autorizza gli scope broadcaster
  // (chat:read/chat:edit inclusi — il bot scriverà con il SUO account).
  app.get('/auth/permessi', requireLogin, (req, res) => {
    const state = crypto.randomUUID();
    req.session.oauthState = state;
    res.redirect(auth.authUrl(SCOPES.broadcaster, state));
  });

  app.get('/auth/callback', requireLogin, wrap(async (req, res) => {
    // l'utente ha negato l'autorizzazione (o Twitch ha segnalato un errore)
    if (req.query.error) {
      return res.redirect('/?errore=' + encodeURIComponent(String(req.query.error)));
    }
    // anti-CSRF: lo state deve combaciare con quello messo in sessione
    const state = req.session?.oauthState;
    delete req.session.oauthState;
    if (!state || req.query.state !== state) {
      return res.redirect('/?errore=state');
    }

    const t = await auth.exchangeCode(String(req.query.code || ''));
    const v = await auth.validate(t.accessToken);
    if (!v) return res.redirect('/?errore=validazione');

    // i permessi devono arrivare dallo STESSO account entrato col pass
    if (v.login !== req.session.user?.login) {
      return res.redirect('/?errore=account-diverso');
    }
    tokens.save('broadcaster', v.login, {
      userId: v.userId,
      accessToken: t.accessToken,
      refreshToken: t.refreshToken,
      scopes: t.scopes,
      expiresAt: t.expiresAt,
    });
    avviaPretrain(v.login);
    sync();
    res.redirect('/');
  }));

  app.get('/auth/logout', (req, res) => {
    req.session = null;
    res.redirect('/entra');            // uscendo si torna "fuori" (404 finché non si rientra col pass)
  });

  // ------------------------------------------------------------ API base

  app.get('/health', (req, res) => res.json({ ok: true }));

  // stato complessivo per la single-page
  app.get('/api/me', wrap(async (req, res) => {
    const user = currentUser(req);
    res.json({
      user,
      isAdmin: isAdmin(user),
      missing: missingConfig(),
      status: manager.status(),
      streamer: user ? streamers.get(user.login) : null,
      permessiOk: user ? permessiOk(user.login) : false,
      knowledgeCount: user ? knowledge.count(user.login) : 0,
      preaddestramento: user
        ? Object.fromEntries(memory.facts(user.login)
            .filter((f) => f.key.startsWith('preaddestramento'))
            .map((f) => [f.key, f.value]))
        : {},
    });
  }));

  // richiesta di abilitazione ("porta AndryBot nel tuo canale")
  app.post('/api/richiesta', requireLogin, wrap(async (req, res) => {
    const user = currentUser(req);
    streamers.request(user.login, user.display, '');
    // best-effort: recupera lo user_id Twitch (serve per clip ed eventi)
    try {
      const u = await helix.getUserByLogin(user.login);
      if (u?.id) streamers.request(user.login, u.display_name || user.display, u.id);
    } catch { /* pazienza: si riproverà */ }
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ API streamer

  // acceso/spento (senza perdere l'abilitazione)
  app.post('/api/streamer/toggle', requireLogin, wrap(async (req, res) => {
    const user = currentUser(req);
    if (streamers.get(user.login)?.status !== 'approved') {
      return res.status(403).json({ errore: 'non sei ancora abilitato' });
    }
    streamers.setEnabled(user.login, !!req.body.enabled);
    sync();
    res.json({ ok: true });
  }));

  // impostazioni: valida e salva SOLO le chiavi conosciute (merge con le esistenti)
  app.post('/api/streamer/impostazioni', requireLogin, wrap(async (req, res) => {
    const user = currentUser(req);
    const s = streamers.get(user.login);
    if (!s) return res.status(404).json({ errore: 'streamer sconosciuto' });

    const b = req.body || {};
    const out = { ...s.settings };

    if (b.tono !== undefined) {
      if (!TONI_VALIDI.includes(b.tono)) return res.status(400).json({ errore: 'tono non valido' });
      out.tono = b.tono;
    }
    if (b.spontaneita !== undefined) {
      const n = Number(b.spontaneita);
      if (!Number.isFinite(n)) return res.status(400).json({ errore: 'spontaneita non valida' });
      out.spontaneita = Math.min(0.3, Math.max(0, n));
    }
    if (b.rispostaMenzioni !== undefined) out.rispostaMenzioni = !!b.rispostaMenzioni;
    if (b.frasi !== undefined) {
      if (!Array.isArray(b.frasi)) return res.status(400).json({ errore: 'frasi deve essere una lista' });
      out.frasi = b.frasi
        .map((f) => String(f).trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 50);
    }
    if (b.clipAuto !== undefined) out.clipAuto = !!b.clipAuto;
    if (b.clipAutoSoglia !== undefined) {
      const n = Number(b.clipAutoSoglia);
      if (!Number.isFinite(n)) return res.status(400).json({ errore: 'soglia clip non valida' });
      out.clipAutoSoglia = Math.min(200, Math.max(5, Math.round(n)));
    }
    if (b.paroleVietate !== undefined) {
      if (!Array.isArray(b.paroleVietate)) return res.status(400).json({ errore: 'paroleVietate deve essere una lista' });
      out.paroleVietate = b.paroleVietate
        .map((p) => String(p).trim().toLowerCase().slice(0, 100))
        .filter(Boolean)
        .slice(0, 100);
    }

    streamers.setSettings(user.login, out);
    res.json({ ok: true });
  }));

  // conoscenza del bot
  app.get('/api/streamer/knowledge', requireLogin, wrap(async (req, res) => {
    res.json(knowledge.list(currentUser(req).login));
  }));

  app.post('/api/streamer/knowledge', requireLogin, wrap(async (req, res) => {
    const domanda = String(req.body?.domanda || '').trim();
    const risposta = String(req.body?.risposta || '').trim();
    if (!domanda || !risposta) {
      return res.status(400).json({ errore: 'domanda e risposta sono obbligatorie' });
    }
    knowledge.add(currentUser(req).login, { domanda, risposta, fonte: 'manuale' });
    res.json({ ok: true });
  }));

  app.delete('/api/streamer/knowledge/:id', requireLogin, wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    knowledge.remove(currentUser(req).login, id);
    res.json({ ok: true });
  }));

  // pre-addestramento SINCRONO: il bottone in dashboard mostra il risultato
  app.post('/api/streamer/preaddestra', requireLogin, wrap(async (req, res) => {
    const esito = await pretrain(currentUser(req).login, helix);
    res.json(esito);
  }));

  // memoria del bot: lezioni, fatti, clip
  app.get('/api/streamer/memoria', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    res.json({
      lezioni: memory.lessons(login, 50),
      fatti: memory.facts(login),
      clip: clips.recent(login, 20),
    });
  }));

  // azzera ciò che il bot ha imparato (NON la conoscenza manuale/dal sito)
  app.post('/api/streamer/memoria/reset', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    db.prepare('DELETE FROM lessons WHERE channel=?').run(login);
    db.prepare('DELETE FROM user_memories WHERE channel=?').run(login);
    db.prepare('DELETE FROM facts WHERE channel=?').run(login);
    db.prepare('DELETE FROM stream_context WHERE channel=?').run(login);
    db.prepare("DELETE FROM knowledge WHERE channel=? AND fonte='chat'").run(login);
    res.json({ ok: true });
  }));

  // statistiche degli ultimi 7 giorni
  app.get('/api/streamer/statistiche', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const da = Date.now() - SETTE_GIORNI_MS;
    const messaggi7g = db.prepare(
      'SELECT COUNT(*) c FROM messages WHERE channel=? AND ts>=? AND from_bot=0').get(login, da).c;
    const topChatters = db.prepare(
      `SELECT user, COUNT(*) c FROM messages
       WHERE channel=? AND ts>=? AND from_bot=0 AND user NOT LIKE '[%'
       GROUP BY user ORDER BY c DESC LIMIT 5`).all(login, da);
    const messaggiBot7g = db.prepare(
      'SELECT COUNT(*) c FROM messages WHERE channel=? AND ts>=? AND from_bot=1').get(login, da).c;
    const clipTotali = db.prepare(
      'SELECT COUNT(*) c FROM clips WHERE channel=?').get(login).c;
    res.json({ messaggi7g, topChatters, messaggiBot7g, clipTotali });
  }));

  // ------------------------------------------------------------ API effetti & suoni

  // elenco effetti + URL dell'overlay OBS (con la chiave del canale)
  app.get('/api/streamer/effetti', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const effetti = effectsDb.list(login).map((e) => ({
      id: e.id, comando: e.comando, tipo: e.tipo, tier: e.tier,
      cooldown: e.cooldown, volume: e.volume, durata: e.durata, attivo: !!e.attivo,
    }));
    res.json({ effetti, overlayUrl: effects.overlayUrl(login) });
  }));

  // caricamento di un nuovo effetto (multipart): file + comando/tier/cooldown/volume/durata.
  // Il file viene super-compresso con ffmpeg prima di essere salvato.
  app.post('/api/streamer/effetti', requireLogin, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'file troppo grande (max 30MB)' : 'caricamento non riuscito';
        return res.status(400).json({ errore: msg });
      }
      salvaEffetto(req, res).catch(async (e) => {
        log.error('POST /api/streamer/effetti →', e?.message || e);
        await pulisciTemp(req.file?.path);
        if (!res.headersSent) res.status(500).json({ errore: e?.message || 'errore interno' });
      });
    });
  });

  // logica di salvataggio (separata perché parte dopo il parsing multipart di multer)
  async function salvaEffetto(req, res) {
    const login = currentUser(req).login;

    if (streamers.get(login)?.status !== 'approved') {
      await pulisciTemp(req.file?.path);
      return res.status(403).json({ errore: 'non sei ancora abilitato' });
    }
    if (!req.file) return res.status(400).json({ errore: 'nessun file caricato' });

    const comando = normComando(req.body?.comando || '');
    const tier = String(req.body?.tier || 'tutti');
    const cooldown = Math.round(Number(req.body?.cooldown));
    const volume = Math.round(Number(req.body?.volume));
    const durata = Math.round(Number(req.body?.durata));

    // validazione: se qualcosa non va, si pulisce il temp e si risponde 400
    const errore = async (msg) => { await pulisciTemp(req.file?.path); return res.status(400).json({ errore: msg }); };
    if (!comando) return errore('comando non valido: usa lettere, numeri o "_"');
    if (!TIER_VALIDI.includes(tier)) return errore('permesso (chi può usarlo) non valido');
    if (!Number.isFinite(cooldown) || cooldown < 0 || cooldown > 3600) return errore('cooldown non valido (0..3600 s)');
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) return errore('volume non valido (0..100)');
    if (!Number.isFinite(durata) || durata < 500 || durata > 15000) return errore('durata non valida (500..15000 ms)');

    const destDir = join(effectsRoot, login);
    mkdirSync(destDir, { recursive: true });

    // compressione: comprimi() cancella comunque il file temporaneo
    let esito;
    try {
      esito = await comprimi(req.file.path, req.file.mimetype, destDir, `${Date.now()}_${comando}`);
    } catch (e) {
      return res.status(400).json({ errore: e?.message || 'compressione fallita' });
    }

    // durata a schermo: per le immagini vale la scelta dello streamer,
    // per audio/video usiamo la durata reale del media (già limitata).
    const durataFinale = esito.tipo === 'immagine' ? durata : esito.durata;

    let vecchioFile;
    try {
      vecchioFile = effectsDb.add(login, {
        comando, tipo: esito.tipo, file: esito.file, tier, cooldown, volume, durata: durataFinale,
      });
    } catch (e) {
      // salvataggio nel DB fallito (es. tetto effetti): niente orfani sul disco
      await pulisciTemp(join(destDir, esito.file));
      return res.status(400).json({ errore: e?.message || 'salvataggio non riuscito' });
    }

    // se stavamo sostituendo un effetto, cancelliamo il vecchio media
    if (vecchioFile && vecchioFile !== esito.file) {
      await pulisciTemp(join(destDir, vecchioFile));
    }
    res.json({ ok: true });
  }

  // eliminazione di un effetto (+ del suo file dal disco)
  app.delete('/api/streamer/effetti/:id', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    const file = effectsDb.remove(login, id);
    if (file) await pulisciTemp(join(effectsRoot, login, file));
    res.json({ ok: true });
  }));

  // "prova": manda l'effetto all'overlay come farebbe il trigger in chat
  app.post('/api/streamer/effetti/test', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const comando = normComando(req.body?.comando || '');
    const eff = comando ? effectsDb.get(login, comando) : null;
    if (!eff) return res.status(404).json({ errore: 'effetto non trovato' });
    effects.emit(login, effects.payload(login, eff));
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ API MODULI (automazioni)

  // Legge la chiave API in ingresso del canale (o null se non c'è).
  const leggiApiKey = (login) => streamers.get(login)?.settings?.apiKey || null;

  // Genera (e salva, mergiando le impostazioni) una nuova chiave API del canale.
  const generaApiKey = (login) => {
    const key = crypto.randomBytes(24).toString('base64url');
    const s = streamers.get(login);
    streamers.setSettings(login, { ...(s?.settings || {}), apiKey: key });
    return key;
  };

  // Ritorna la chiave esistente o ne crea una se manca.
  const apiKeyOrCrea = (login) => leggiApiKey(login) || generaApiKey(login);

  // Validazione di un modulo in arrivo dalla dashboard. Ritorna un messaggio
  // d'errore (stringa) o null se è valido.
  function validaModulo(m) {
    if (!m || typeof m !== 'object') return 'modulo mancante';
    if (!String(m.nome || '').trim()) return 'il nome è obbligatorio';
    const tipo = m.trigger?.tipo;
    if (!MOD_TRIGGER.includes(tipo)) return 'tipo di innesco non valido';
    if (!Array.isArray(m.azioni) || !m.azioni.length) return "serve almeno un'azione";
    for (const a of m.azioni) {
      if (!a || !MOD_AZIONI.includes(a.tipo)) return 'azione non valida';
      if (a.tipo === 'webhook' && !/^https?:\/\//i.test(String(a.url || ''))) {
        return 'il webhook accetta solo URL http/https';
      }
    }
    return null;
  }

  // elenco moduli + effetti disponibili (per il menu azioni) + chiave/URL API
  app.get('/api/streamer/moduli', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const effettiDisponibili = effectsDb.list(login).filter((e) => e.attivo).map((e) => e.comando);
    res.json({
      moduli: modulesDb.list(login),
      effettiDisponibili,
      apiKey: apiKeyOrCrea(login),
      apiUrl: `${config.baseUrl}/api/ext/${login}`,
    });
  }));

  // crea/aggiorna un modulo (id? nel body per la modifica)
  app.post('/api/streamer/moduli', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const errore = validaModulo(req.body);
    if (errore) return res.status(400).json({ errore });
    let id;
    try { id = modulesDb.save(login, req.body); }
    catch (e) { return res.status(400).json({ errore: e?.message || 'salvataggio non riuscito' }); }
    res.json({ ok: true, id });
  }));

  // elimina un modulo
  app.delete('/api/streamer/moduli/:id', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    modulesDb.remove(login, id);
    res.json({ ok: true });
  }));

  // "prova": esegue il modulo una volta lì per lì (contesto = streamer)
  app.post('/api/streamer/moduli/:id/prova', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    const ok = await modules.provaModulo(login, id, (t) => manager.say(login, t));
    if (!ok) return res.status(404).json({ errore: 'modulo non trovato' });
    res.json({ ok: true });
  }));

  // accende/spegne un modulo
  app.post('/api/streamer/moduli/:id/toggle', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    modulesDb.setAttivo(login, id, !!req.body?.attivo);
    res.json({ ok: true });
  }));

  // rigenera la chiave API in ingresso del canale
  app.post('/api/streamer/apikey', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    res.json({ apiKey: generaApiKey(login) });
  }));

  // ---- INGRESSO ESTERNO: un servizio dello streamer fa dire/fare cose al bot
  // Autenticazione con la chiave API del :login (Bearer o ?key=), confronto
  // timing-safe. Chiave errata → 404 (labirinto: nessun indizio). Solo POST.

  const extHits = new Map();   // login → { count, reset }
  function extRateOk(login) {
    const ora = Date.now();
    let r = extHits.get(login);
    if (!r || ora > r.reset) { r = { count: 0, reset: ora + 60_000 }; extHits.set(login, r); }
    r.count++;
    return r.count <= EXT_MAX_MIN;
  }

  // confronto costante: lunghezze diverse → false (senza toccare timingSafeEqual)
  function chiaveUguale(fornita, attesa) {
    const a = Buffer.from(String(fornita || ''), 'utf8');
    const b = Buffer.from(String(attesa || ''), 'utf8');
    if (a.length !== b.length) return false;
    try { return crypto.timingSafeEqual(a, b); } catch { return false; }
  }

  app.post('/api/ext/:login', wrap(async (req, res) => {
    const login = String(req.params.login || '').toLowerCase();
    const attesa = leggiApiKey(login);
    const fornita = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
      || String(req.query.key || '');
    // nessuna chiave configurata o chiave errata → 404 (nessun indizio)
    if (!attesa || !chiaveUguale(fornita, attesa)) return notFound(res);
    if (!extRateOk(login)) return res.status(429).json({ errore: 'troppe richieste' });
    const ok = await modules.eseguiPerApi(login, req.body || {}, (t) => manager.say(login, t));
    if (!ok) return res.status(400).json({ errore: 'azione non riconosciuta' });
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ API admin

  app.get('/api/admin/streamers', requireAdmin, wrap(async (req, res) => {
    res.json(streamers.list().map((s) => ({
      ...s,
      permessiOk: permessiOk(s.login),
      knowledgeCount: knowledge.count(s.login),
    })));
  }));

  app.post('/api/admin/stato', requireAdmin, wrap(async (req, res) => {
    const login = String(req.body?.login || '').toLowerCase().trim();
    const status = String(req.body?.status || '');
    if (!login || !STATI_VALIDI.includes(status)) {
      return res.status(400).json({ errore: 'login o stato non validi' });
    }
    streamers.setStatus(login, status);
    if (status === 'approved') avviaPretrain(login);
    sync();
    res.json({ ok: true });
  }));

  app.post('/api/admin/rimuovi', requireAdmin, wrap(async (req, res) => {
    const login = String(req.body?.login || '').toLowerCase().trim();
    if (!login) return res.status(400).json({ errore: 'login mancante' });
    streamers.remove(login);
    tokens.delete('broadcaster', login);
    sync();
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ avvio

  // qualsiasi rotta non gestita (anche per chi è dentro): 404 sobrio,
  // niente "Cannot GET /..." di Express che rivelerebbe la struttura
  app.use((req, res) => notFound(res));

  // error handler finale: sempre JSON, mai stack HTML
  // (i 4 parametri servono a Express per riconoscerlo come error handler)
  app.use((err, req, res, next) => {
    log.error('errore non gestito:', err?.message || err);
    if (res.headersSent) return next(err);
    res.status(500).json({ errore: 'errore interno' });
  });

  const server = app.listen(config.port, () => {
    log.info(`Dashboard in ascolto su ${config.baseUrl} (porta ${config.port})`);
  });
  return server;
}
