// Dashboard web di SocialBot (bot.andryxify.it).
// Qui lo streamer: fa login con Twitch, chiede l'abilitazione, concede i
// permessi (il bot parla CON IL SUO ACCOUNT), configura personalità,
// conoscenza, clip e regole, e consulta memoria e statistiche.
// L'amministratore (andryxify) approva e gestisce gli streamer.
import express from 'express';
import cookieSession from 'cookie-session';
import multer from 'multer';
import crypto from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync, unlinkSync, renameSync, copyFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { config, SCOPES, missingConfig } from '../config.js';
import { makeLog } from '../logger.js';
import { db, tokens, streamers, memory, clips, knowledge, effects as effectsDb, normComando, modules as modulesDb, friends } from '../db.js';
import { points, vips, tgConf, passkeys, managers, quotes, compleanni, membri, subscriptions, giochi as giochiDb, guide, pointAlerts } from '../db.js';
import * as abbonamenti from '../features/abbonamenti.js';
import * as spotify from '../features/spotify.js';
import * as giveaway from '../features/giveaway.js';
import * as webauthn from './webauthn.js';
import { comprimi } from '../features/compress.js';
import { StudioEngine } from '../features/studio.js';
import { seedStreamer } from '../features/seed.js';
import * as vip from '../features/vip.js';
import * as telegram from '../features/telegram.js';
import * as categoria from '../features/categoria.js';
import * as compleanniFeat from '../features/compleanni.js';
import * as tiktok from '../features/tiktok.js';
import * as instagram from '../features/instagram.js';
import * as emotes from '../features/emotes.js';
import * as badges from '../features/badges.js';
import * as quotesImport from '../features/quotesimport.js';
import { pretrain } from '../ai/pretrain.js';
import * as persona from '../ai/persona.js';
import * as brainpy from '../ai/brainpy.js';
import { redeemPass } from './gate.js';

const log = makeLog('web');

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;
// Id dei suoni PRESET sintetizzati (deve combaciare con public/presets.js).
const SUONI_PRESET = new Set(['campanello', 'campana', 'acqua', 'moneta', 'tamburo',
  'trombetta', 'errore', 'tada', 'pop', 'whoosh', 'applausi', 'laser', 'salita']);
// Font disponibili per l'overlay (deve combaciare con overlay-skin.css/overlay.html).
const FONT_OVL = ['sistema', 'rotondo', 'condensato', 'mono', 'serif', 'manga'];
// helper di validazione riusati dal "gestionale overlay"
const clampInt = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
const hexOk = (v, def) => (/^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : def);
const unoDi = (v, lista, def) => (lista.includes(v) ? v : def);
// posizione libera (drag): coordinate in % del canvas + dimensione (s = scala %,
// 30–300) e rotazione (r = gradi, -180…180). null → si usa l'angolo predefinito.
const xyOk = (v) => (v && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y)))
  ? { x: clampInt(v.x, 0, 100, 50), y: clampInt(v.y, 0, 100, 50), s: clampInt(v.s, 30, 300, 100), r: clampInt(v.r, -180, 180, 0) } : null;

// --- PIÙ OVERLAY: ogni overlay ha un suo LAYOUT (quali elementi mostra e dove)
// e un suo CSS, con un link OBS a sé. Lo STILE/TESTO restano condivisi a livello
// di canale (alerts/chatOverlay/overlayWidget). Retro-compatibile: se non c'è
// una lista `overlays`, ne ricaviamo uno solo ("principale") con tutto visibile
// e le posizioni attuali → chi ha già l'overlay lo vede identico.
const _mostraDefault = () => ({ alert: true, chat: true, wf: true, ws: true, effetti: true });
function overlaysDi(settings) {
  const s = settings || {};
  if (Array.isArray(s.overlays) && s.overlays.length) return s.overlays;
  return [{
    id: 'principale', nome: 'Overlay principale',
    mostra: _mostraDefault(),
    xy: {
      alert: s.alerts?.xy || null, chat: s.chatOverlay?.xy || null,
      wf: s.overlayWidget?.ultimoFollower?.xy || null, ws: s.overlayWidget?.ultimoSub?.xy || null,
    },
    css: s.overlayCss || '',
  }];
}
function overlayById(settings, id) {
  const lista = overlaysDi(settings);
  return lista.find((o) => String(o.id) === String(id)) || lista[0];
}
// nome overlay → "slug" per i link belli (/o/<nick>/<slug>): minuscolo, senza
// accenti, solo lettere/numeri/trattini.
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'overlay';
}
const TONI_VALIDI = ['scherzoso', 'amichevole', 'serio'];
const STATI_VALIDI = ['pending', 'approved', 'disabled'];
const TIER_VALIDI = ['tutti', 'sub', 'vip', 'mod'];
const UPLOAD_MAX = 60 * 1024 * 1024;   // 60 MB in ingresso (per clip fino a ~30s; l'output sarà molto più piccolo)

// Moduli: tipi di innesco e di azione ammessi (validazione lato API)
const MOD_TRIGGER = ['comando', 'parola', 'evento', 'timer', 'manuale', 'voce'];
const MOD_AZIONI = ['messaggio', 'effetto', 'contatore', 'webhook', 'attendi', 'overlayTesto', 'timeout', 'clip', 'categoria', 'titolo', 'musica'];
const EXT_MAX_MIN = 30;   // ingresso esterno: max richieste al minuto per login

// Comando integrato /compleanno nel gruppo Telegram. Registra/mostra/rimuove la
// data del membro che scrive. Ritorna il testo di risposta (HTML) o null se il
// messaggio non è un comando compleanno.
function gestisciComandoCompleanno(login, msg, testo) {
  const m = String(testo).trim().toLowerCase().match(/^[\/!]?compleanno(?:@\S+)?(?:\s+(.*))?$/);
  if (!m) return null;
  const arg = (m[1] || '').trim();
  const from = msg.from || {};
  const nome = from.first_name || from.username || 'amico';
  if (!arg) {
    const cur = compleanni.get(login, from.id);
    return cur
      ? `🎂 Il tuo compleanno è segnato per il <b>${compleanniFeat.fmtData(cur.giorno, cur.mese)}</b>. Per cambiarlo: <code>/compleanno GG/MM</code>.`
      : 'Scrivi <code>/compleanno GG/MM</code> (es. <code>/compleanno 25/12</code>) e ti farò gli auguri il giorno giusto! 🎉';
  }
  if (/^(rimuovi|cancella|togli)$/.test(arg)) {
    compleanni.remove(login, from.id);
    return '👍 Ho tolto il tuo compleanno.';
  }
  const d = compleanniFeat.parseData(arg);
  if (!d) return 'Non ho capito la data. Usa <code>/compleanno GG/MM</code>, es. <code>/compleanno 25/12</code>.';
  compleanni.set(login, from.id, nome, d.giorno, d.mese);
  return `🎂 Segnato! Ti farò gli auguri il <b>${compleanniFeat.fmtData(d.giorno, d.mese)}</b>. 🎉`;
}

export function startWeb({ auth, helix, manager, effects, modules }) {
  const app = express();

  // dietro reverse proxy (nginx/caddy) serve per cookie "secure" e IP reali
  app.set('trust proxy', 1);

  // Le sessioni DEVONO essere firmate con un segreto reale. `config.sessionSecret`
  // è sempre valorizzato (env → file persistito → effimero casuale): se per
  // qualsiasi motivo fosse vuoto, ci fermiamo — MAI ripiegare su una chiave nota
  // e hard-coded (permetterebbe di forgiare cookie di sessione e impersonare
  // chiunque, admin compreso).
  if (!config.sessionSecret || config.sessionSecret.length < 16) {
    throw new Error('SESSION_SECRET assente o troppo debole: impossibile firmare le sessioni in sicurezza');
  }

  app.use(cookieSession({
    name: 'andrybot',
    keys: [config.sessionSecret],
    maxAge: 30 * 24 * 60 * 60 * 1000,          // 30 giorni
    sameSite: 'lax',
    secure: config.baseUrl.startsWith('https'),
    httpOnly: true,
  }));
  // Cattura il corpo RAW (serve al webhook Stripe per verificare la firma).
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

  // ------------------------------------------------------------ helper

  // utente loggato in sessione (o null)
  const currentUser = (req) => req.session?.user || null;
  // admin = il founder che agisce come sé stesso. Un MODERATORE delegato non è
  // mai admin, nemmeno se gestisce il canale del founder (user.login = canale).
  const isAdmin = (user) => !!user && user.role !== 'moderatore' && config.adminLogins.includes(user.login);

  // ── Identità & contesti (accesso unificato) ─────────────────────────────
  // L'identità è la PERSONA (login Twitch), fissa per la sessione; `login` è il
  // canale che sta gestendo ORA. Una stessa persona può gestire il proprio canale
  // (da proprietario, se streamer approvato) e i canali che modera (da mod). Il
  // ruolo si DERIVA dai contesti, così qualunque ingresso che prova l'identità
  // (pass, passkey, login mod) dà accesso a tutto ciò a cui si ha diritto.
  const identitaDi = (u) => String(u?.identita || u?.modLogin || u?.login || '').toLowerCase();

  function contestiPer(identita) {
    const l = String(identita || '').toLowerCase();
    if (!l) return [];
    const out = [];
    // il proprio canale: solo se ha accesso attivo (paga o è community verificata)
    if (haAccesso(l)) { const s = streamers.get(l); out.push({ canale: l, display: s?.display || l, role: 'proprietario' }); }
    for (const m of managers.attiviByLogin(l)) {
      if (m.channel === l) continue;                 // il proprio canale è già incluso sopra
      if (!haAccesso(m.channel)) continue;           // il canale moderato deve avere accesso attivo
      const st = streamers.get(m.channel);
      out.push({ canale: m.channel, display: st?.display || m.channel, role: 'moderatore' });
    }
    return out;
  }

  // Contesto di default: preferisce il proprio canale (proprietario), poi il primo
  // canale moderato. `preferito` forza un canale specifico (es. quello dell'invito).
  function contestoDefault(contesti, preferito) {
    if (preferito) { const c = contesti.find((x) => x.canale === preferito); if (c) return c; }
    return contesti.find((x) => x.role === 'proprietario') || contesti[0] || null;
  }

  // Costruisce l'oggetto sessione per un contesto scelto, mantenendo l'identità.
  function sessionePer(identita, identitaDisplay, ctx) {
    const idl = String(identita).toLowerCase();
    const u = { login: ctx.canale, display: ctx.display, role: ctx.role, identita: idl, identitaDisplay: identitaDisplay || idl };
    if (ctx.role === 'moderatore') { u.modLogin = idl; u.modDisplay = u.identitaDisplay; }   // retrocompat
    return u;
  }

  // Piano base d'accesso di una persona: l'abbonamento attivo (base/pro),
  // altrimenti 'community' se abilitata dal sito (accesso pieno di diritto),
  // altrimenti null (nessun accesso → deve abbonarsi). Con Stripe spento
  // esistono solo community.
  // Ha diritto d'accesso alla dashboard? Solo chi PAGA (abbonamento o trial
  // attivo) oppure è un MEMBRO COMMUNITY verificato da andryxify.it (flag
  // `community`, tenuto fresco dal sync col sito). Chi non è né l'uno né l'altro
  // resta fuori: niente sessione, niente dashboard.
  function haAccesso(login) {
    const l = String(login || '').toLowerCase();
    if (!l) return false;
    if (subscriptions.attivo(l)) return true;
    const s = streamers.get(l);
    return !!(s && s.status === 'approved' && s.community);
  }

  function tierDi(login) {
    const l = String(login || '').toLowerCase();
    if (!l) return null;
    if (subscriptions.attivo(l)) return subscriptions.get(l).tier || 'base';
    const s = streamers.get(l);
    if (s && s.status === 'approved' && s.community) return 'community';
    return null;
  }

  // Funzioni EFFETTIVE del canale di una persona: unione di piano base + add-on
  // à la carte attivi (o accesso pieno se community). È la matrice su cui si basa
  // tutto il gating: chi non ha un piano ricade su 'free'.
  function funzioniDi(login) {
    const l = String(login || '').toLowerCase();
    if (l && subscriptions.attivo(l)) {
      const s = subscriptions.get(l);
      return abbonamenti.funzioniDi({ tier: s.tier || 'base', pacchetti: s.pacchetti });
    }
    const st = l ? streamers.get(l) : null;
    if (st && st.status === 'approved' && st.community) return abbonamenti.funzioniDi({ tier: 'community' });
    return abbonamenti.funzioniDi({ tier: 'free' });
  }

  // Gating funzioni (endpoint a pagamento). Ritorna true se la funzione è inclusa
  // nelle funzioni effettive del canale gestito; altrimenti risponde 403 e ritorna
  // false. I membri community hanno tutto → non vengono mai bloccati.
  const funzioniReq = (req) => funzioniDi(currentUser(req)?.login);
  function esigiFunzione(req, res, chiave, etichetta) {
    if (abbonamenti.abilitata(funzioniReq(req), chiave)) return true;
    res.status(403).json({ errore: `${etichetta} non è incluso nel tuo piano — aggiungi il pacchetto giusto per sbloccarlo.`, upgrade: true });
    return false;
  }
  const limiteTier = (req, chiave) => abbonamenti.limite(funzioniReq(req), chiave);

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
  // Pubblici anche: i file "guscio" della PWA (manifest, service worker, icone)
  // e il flusso di login con passkey (per rientrare senza passare dal sito).
  // Non rivelano nulla di sensibile: la dashboard vera resta dietro la sessione.
  const PUBBLICI = new Set(['/health', '/entra', '/sblocca', '/sblocca.html', '/privacy', '/privacy.html',
    '/mod', '/mod.html', '/auth/mod', '/auth/callback', '/manifest.webmanifest', '/sw.js',
    // SEO: i motori di ricerca devono poter leggere robots e sitemap (nessun dato sensibile)
    '/robots.txt', '/sitemap.xml',
    // abbonamenti self-service: login con Twitch + webhook Stripe (firma verificata)
    '/accedi', '/stripe/webhook',
    // ritorno OAuth di Spotify: si protegge da sé con lo `state` monouso
    '/spotify/callback']);
  // "Vetrina" pubblica: il guscio del sito (pagina + asset) e la demo interattiva
  // sono visibili anche senza pass, per far conoscere il bot. NON espongono dati
  // reali: /api/me senza sessione risponde solo "nessun utente" e tutte le API
  // con i dati dello streamer restano chiuse dietro il pass.
  const VETRINA = new Set(['/', '/index.html', '/app.js', '/style.css', '/presets.js', '/overlay-skin.css']);
  app.use((req, res, next) => {
    // Rivalida la sessione a OGNI richiesta (regola: se non paghi e non sei un
    // membro community verificato+abilitato, NON entri). Ricava da zero i contesti
    // validi dell'identità: canale proprio SOLO se ha accesso attivo (abbonamento
    // o community) e canali moderati SOLO se il mod è ancora attivo e quel canale
    // ha accesso. Se il canale gestito non è più tra questi, sloggiamo subito —
    // così un abbonamento decaduto, una community revocata o un moderatore rimosso
    // perdono l'accesso alla richiesta successiva (non entro il 30° giorno). Admin esenti.
    const sessUser = currentUser(req);
    if (sessUser && !isAdmin(sessUser)
        && !contestiPer(identitaDi(sessUser)).some((c) => c.canale === sessUser.login)) {
      req.session.user = null;
    }
    if (currentUser(req) || PUBBLICI.has(req.path)
        || VETRINA.has(req.path) || req.path === '/api/me'
        || req.path.startsWith('/api/abbonamento/')   // piani/checkout/portale: auth propria
        || req.path.startsWith('/overlay/') || req.path.startsWith('/o/')   // overlay OBS + link "belli"
        || req.path.startsWith('/api/ext/')
        || req.path.startsWith('/tg/')       // webhook Telegram: si protegge col segreto nel path
        || req.path.startsWith('/icons/') || req.path.startsWith('/api/passkey/login/')) return next();
    return notFound(res);
  });

  // file statici della dashboard (serviti solo a chi ha superato il cancello)
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), 'public');
  app.use(express.static(publicDir));

  function requireLogin(req, res, next) {
    if (!currentUser(req)) return res.status(401).json({ errore: 'non autenticato' });
    next();
  }
  // è il PROPRIETARIO del canale (non un moderatore delegato)? Serve per le
  // azioni riservate: permessi Twitch, lista moderatori, disconnessione.
  const isOwner = (req) => { const u = currentUser(req); return !!u && u.role !== 'moderatore'; };
  function requireOwner(req, res, next) {
    if (!currentUser(req)) return res.status(401).json({ errore: 'non autenticato' });
    if (!isOwner(req)) return res.status(403).json({ errore: 'solo il proprietario del canale può farlo' });
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
  // ha concesso il permesso VIP? (aggiunto dopo: richiede una ri-autorizzazione)
  const vipOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:manage:vips'));
  // ha concesso i permessi di moderazione? (elimina messaggi / timeout)
  const moderazioneOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('moderator:manage:chat_messages'));
  // ha concesso il permesso di gestione canale? (cambiare categoria/titolo a voce;
  // aggiunto dopo → richiede una ri-autorizzazione da /auth/permessi)
  const canaleOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:manage:broadcast'));
  // ha concesso il permesso per creare/gestire i premi a punti canale?
  const redemptionsOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:manage:redemptions'));
  // Regia: permessi per raid / pubblicità / lettura programmazione ads (aggiunti
  // dopo → richiedono una ri-autorizzazione da /auth/permessi).
  const raidOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:manage:raids'));
  const commercialOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:edit:commercial'));
  const adsOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:read:ads'));
  // Studio Web: ha concesso la lettura della stream key? (per andare live dal browser)
  const studioKeyOk = (login) =>
    !!(tokens.get('broadcaster', login)?.scopes?.includes('channel:read:stream_key'));

  // stato Telegram per la dashboard — MAI il token (segreto): solo se è
  // configurato, lo @username del bot, il gruppo collegato e le impostazioni.
  const statoTelegram = (login) => {
    const c = tgConf.get(login);
    return {
      configurato: !!(c && c.token),
      botUsername: c?.bot_username || '',
      gruppo: c?.chat_titolo || '',
      gruppoOk: !!(c && c.chat_id),
      attivo: !!(c && c.attivo),
      messaggio: c?.messaggio || '',
      pinLive: c ? !!c.pin_live : true,
      interattivo: !!(c && c.interattivo),
      dmModo: c?.dm_modo || 'me',                 // chat privata: me | tutti | off
      dmCollegato: !!(c && c.owner_tg_id),        // proprietario legato al suo Telegram?
      dmNome: c?.owner_tg_nome || '',             // nome dell'account legato (solo per mostrarlo)
    };
  };

  // streamer "sicuro" per il browser: nasconde il segreto del ponte giochi
  // (resta solo nel DB del bot). Espone se è collegato e se è acceso.
  const streamerSicuro = (login) => {
    const s = streamers.get(login);
    if (!s) return null;
    const g = s.settings?.giochiSito;
    if (g && (g.secret || g.endpoint)) {
      s.settings = { ...s.settings, giochiSito: { attivo: g.attivo === true, collegato: !!(g.secret && g.endpoint) } };
    }
    // maschera i segreti delle API personali: mai al client, solo un flag "impostato"
    const yt = s.settings?.youtube;
    if (yt && yt.apiKey) s.settings = { ...s.settings, youtube: { ...yt, apiKey: '', apiKeySet: true } };
    const ig = s.settings?.instagram;
    if (ig && ig.token) s.settings = { ...s.settings, instagram: { ...ig, token: '', tokenSet: true } };
    return s;
  };

  const sync = () => Promise.resolve(manager.syncChannels?.()).catch(() => {});

  // Passkey (WebAuthn): l'RP ID è il dominio, l'origin è l'URL completo.
  const RP_ID = (() => { try { return new URL(config.baseUrl).hostname; } catch { return 'localhost'; } })();
  const ORIGIN = (() => { try { return new URL(config.baseUrl).origin; } catch { return config.baseUrl; } })();
  const RP_NAME = 'SocialBot';

  // ------------------------------------------------------------ EFFETTI: cartelle e upload
  // gli effetti vivono in data/effects/<login>/, i file in arrivo in data/tmp/
  const effectsRoot = join(config.dataDir, 'effects');
  const tmpDir = join(config.dataDir, 'tmp');
  mkdirSync(tmpDir, { recursive: true });

  // Studio Web: motore delle dirette dal browser (ffmpeg → RTMP Twitch).
  const studio = new StudioEngine();
  const chiudiStudio = () => { try { studio.stopAll(); } catch { /* niente */ } };
  process.once('SIGINT', chiudiStudio);
  process.once('SIGTERM', chiudiStudio);
  process.once('exit', chiudiStudio);

  const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tmpDir),
    // nome temporaneo neutro (l'estensione vera non serve: usiamo il mimetype)
    filename: (req, file, cb) => cb(null, `up_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`),
  });
  const upload = multer({ storage: uploadStorage, limits: { fileSize: UPLOAD_MAX, files: 1 } });
  // per gli effetti: fino a 2 file (media + eventuale suono abbinato = COMBO)
  const uploadEff = multer({ storage: uploadStorage, limits: { fileSize: UPLOAD_MAX, files: 2 } });

  // rimuove un file temporaneo (best-effort, non lancia mai)
  const pulisciTemp = async (p) => { if (p) { try { await unlink(p); } catch { /* già rimosso */ } } };

  // ------------------------------------------------------------ OVERLAY per OBS
  // Pubblico (nessuna sessione), ma protetto dalla chiave in ?key=...: OBS lo
  // apre come "Browser Source". La chiave è per canale (streamers.settings).
  const overlayHtml = join(publicDir, 'overlay.html');

  const chiaveOk = (req) => {
    const login = String(req.params.login || '').toLowerCase();
    // confronto a tempo costante (come per la chiave API), niente '===' che perde
    return !!login && !!req.query.key && chiaveUguale(String(req.query.key), effects.overlayKey(login));
  };

  // la pagina dell'overlay
  app.get('/overlay/:login', (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    res.sendFile(overlayHtml);
  });

  // Link "bello" per OBS: /o/<nick>/<nome-overlay>. Reindirizza al link reale con
  // la chiave (gestita dal server) e l'overlay giusto (?o=id). Comodo da copiare;
  // l'overlay funziona identico. Nota: è indovinabile (nick + nome), quindi meno
  // "segreto" del link con ?key — che resta valido come alternativa privata.
  app.get('/o/:login/:slug', (req, res) => {
    const login = String(req.params.login).toLowerCase();
    const s = streamers.get(login);
    if (!s) return notFound(res);
    const slug = slugify(req.params.slug);
    const lista = overlaysDi(s.settings);
    const ov = lista.find((o) => slugify(o.nome) === slug) || (slug === 'overlay' ? lista[0] : null);
    if (!ov) return notFound(res);
    const key = effects.overlayKey(login);
    res.redirect(`/overlay/${encodeURIComponent(login)}?key=${encodeURIComponent(key)}&o=${encodeURIComponent(ov.id)}`);
  });

  // tema dell'overlay (CSS avanzato + widget persistenti + loro stato): l'overlay
  // lo legge una volta al caricamento. Pubblico ma protetto dalla chiave.
  app.get('/overlay/:login/tema', (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    const login = String(req.params.login).toLowerCase();
    const base = manager.alerts?.tema(login) || { css: '', widget: {}, stato: {} };
    // layout dell'overlay richiesto (?o=id): cosa mostra + dove. Il CSS è quello
    // dell'overlay (per "principale" coincide con quello di canale).
    const ov = overlayById(streamers.get(login)?.settings, String(req.query.o || ''));
    // CSS avanzato condiviso (vale per tutti gli overlay); il layout è per-overlay
    res.json({ ...base, mostra: ov.mostra || _mostraDefault(), xy: ov.xy || {} });
  });

  // Mappa emote 7TV (globali + del canale) per la "chat a schermo": l'overlay la
  // legge al caricamento e la rinfresca ogni tanto, così le emote 7TV compaiono
  // come immagini. Pubblica ma protetta dalla chiave; risultato cache-ato lato
  // server (7tv.io), quindi niente carico anche con più fonti OBS aperte.
  app.get('/overlay/:login/emotes', async (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    const login = String(req.params.login).toLowerCase();
    try {
      const mappa = await emotes.mappaCanale(helix, login);
      res.set('Cache-Control', 'public, max-age=300');
      res.json(mappa || {});
    } catch { res.json({}); }
  });

  // Stemmi (badge) Twitch del canale: "setId/version" → url immagine. L'overlay li
  // usa per mettere gli stemmi accanto ai nick nella "chat a schermo".
  app.get('/overlay/:login/badges', async (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    const login = String(req.params.login).toLowerCase();
    try {
      const mappa = await badges.mappaBadge(helix, login);
      res.set('Cache-Control', 'public, max-age=600');
      res.json(mappa || {});
    } catch { res.json({}); }
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

  // Ingresso pubblico. Due modi, stesso URL:
  //  1) con pass usa-e-getta da andryxify.it (bot.andryxify.it/entra?pass=...):
  //     il bot lo "brucia" chiamando il sito e crea la sessione se abilitato;
  //  2) SENZA pass: login DIRETTO con Twitch ("Accedi con Twitch" dalla vetrina),
  //     pensato per chi è già abilitato (community) o abbonato. Il cancello resta
  //     invariato: il callback concede la dashboard SOLO se contestiPer(login) non
  //     è vuoto; altrimenti si vede solo la pagina dei piani. Nessuna scorciatoia.
  app.get('/entra', wrap(async (req, res) => {
    const passRaw = String(req.query.pass || '').trim();
    if (!passRaw) {
      // login diretto con Twitch (nessun `compra`: ingresso puro, gate al callback)
      const state = crypto.randomUUID();
      req.session.selfFlow = { state };
      return res.redirect(auth.authUrl([], state));
    }
    const who = await redeemPass(passRaw);
    if (!who) return notFound(res);            // pass presente ma scaduto/già usato

    // andryxify.it è la fonte di verità sull'abilitazione: lo registriamo
    // localmente come approvato (rispettando un eventuale on/off preesistente) e
    // lo marchiamo come MEMBRO COMMUNITY (accesso pieno di diritto, non a pagamento).
    streamers.upsertApproved(who.login, who.display, who.userId);
    streamers.markCommunity(who.login);
    // identità = lo streamer; contesto di default = il proprio canale (proprietario),
    // ma potrà passare anche ai canali che modera con lo switcher.
    const contesti = contestiPer(who.login);
    const ctx = contestoDefault(contesti, who.login) || { canale: who.login, display: who.display, role: 'proprietario' };
    req.session.user = sessionePer(who.login, who.display, ctx);
    // kit di partenza: al primo ingresso è già tutto pronto (idempotente)
    seedStreamer(who.login);

    // ponte "giochi del sito": il sito ci consegna endpoint + segreto al redeem;
    // li memorizziamo. L'interruttore 'attivo' qui è solo un master-switch del
    // ponte (SocialBot inoltra i comandi di gioco al sito): lo teniamo ACCESO di
    // default, così l'abilitazione vera e propria la comanda lo streamer dal
    // toggle sul gioco (sul sito). Un eventuale OFF esplicito scelto prima dallo
    // streamer viene comunque rispettato.
    if (who.bridge) {
      const s = streamers.get(who.login);
      const g = s?.settings?.giochiSito || {};
      streamers.setSettings(who.login, {
        ...s.settings,
        giochiSito: { attivo: g.attivo !== false, endpoint: who.bridge.endpoint, secret: who.bridge.secret },
      });
    }

    // primo giro di pre-addestramento dal profilo del sito (max 1 a settimana)
    if (!pretrainRecente(who.login)) avviaPretrain(who.login);
    sync();
    res.redirect('/');
  }));

  // Pagina "Sblocca con passkey": ingresso alternativo per chi ha registrato
  // una passkey (così può rientrare, o aprire l'app installata, senza pass del
  // sito). Se si è già loggati, si va dritti alla dashboard.
  app.get('/sblocca', (req, res) => {
    if (currentUser(req)) return res.redirect('/');
    res.sendFile(join(publicDir, 'sblocca.html'));
  });

  // Informativa privacy & sicurezza (pubblica: dev'essere sempre consultabile)
  app.get('/privacy', (req, res) => res.sendFile(join(publicDir, 'privacy.html')));

  // ------------------------------------------------------------ MODERATORI (gestori delegati)
  // Lo streamer invita un moderatore con un link; il moderatore accetta facendo
  // login con Twitch (l'identità la conferma Twitch, non c'è codice da copiare).
  const MOD_INVITE_TTL = 72 * 60 * 60 * 1000;                 // l'invito scade in 72 ore
  const MOD_INVITE_URL = (token) => `${config.baseUrl.replace(/\/$/, '')}/mod?invito=${token}`;

  // Pagina pubblica dell'invito: "accedi con Twitch per gestire il canale".
  app.get('/mod', (req, res) => {
    if (currentUser(req)) return res.redirect('/');
    res.sendFile(join(publicDir, 'mod.html'));
  });

  // Avvio del login moderatore: OAuth Twitch di sola IDENTITÀ (nessuno scope).
  app.get('/auth/mod', (req, res) => {
    const state = crypto.randomUUID();
    const invito = String(req.query.invito || '').trim() || null;
    req.session.modFlow = { state, invito };
    res.redirect(auth.authUrl([], state));
  });

  // ------------------------------------------------------------ OAuth callback
  // Gestisce TRE flussi: (a) il proprietario che concede i permessi broadcaster,
  // (b) il moderatore che fa login per gestire un canale, (c) il login
  // self-service per abbonarsi. Pubblico: il cancello lo lascia passare.
  app.get('/auth/callback', wrap(async (req, res) => {
    if (req.query.error) return res.redirect('/?errore=' + encodeURIComponent(String(req.query.error)));

    // ── (c) FLUSSO SELF-SERVICE (abbonamento) ──────────────────────
    if (req.session?.selfFlow) {
      const sf = req.session.selfFlow; delete req.session.selfFlow;
      if (!sf.state || req.query.state !== sf.state) return res.redirect('/?errore=state');
      let v = null;
      try { const t = await auth.exchangeCode(String(req.query.code || '')); v = await auth.validate(t.accessToken); }
      catch { /* sotto */ }
      if (!v?.login) return res.redirect('/?errore=validazione');
      const login = String(v.login).toLowerCase();
      const disp = v.display || login;
      const contesti = contestiPer(login);
      if (contesti.length) {                                  // ha già accesso → dashboard
        req.session.user = sessionePer(login, disp, contestoDefault(contesti));
        return res.redirect('/');
      }
      // PROMO "settimana gratis": chi non ha MAI avuto il bot (nessun abbonamento/
      // trial precedente) può ricevere, a caso, alcuni giorni di Pro. È un trial
      // temporaneo (non "community"), si revoca da sé alla scadenza.
      const maiAvuto = !subscriptions.get(login);
      if (maiAvuto && config.promo.probabilita > 0 && Math.random() < config.promo.probabilita) {
        const fine = Date.now() + config.promo.giorni * 86400000;
        subscriptions.set(login, { tier: 'pro', status: 'trialing', periodEnd: fine });
        streamers.upsertApproved(login, disp);
        seedStreamer(login);
        sync();
        req.session.user = sessionePer(login, disp, contestoDefault(contestiPer(login)));
        log.info(`promo: settimana gratis Pro a @${login} (${config.promo.giorni}g)`);
        return res.redirect('/?promo=1');
      }
      // nessun accesso: identità "in attesa di abbonarsi" — NIENTE session.user,
      // quindi niente dashboard né API dati. Vede solo i piani e può fare checkout.
      req.session.abbonando = { login, display: disp };
      // veniva da "attiva il bot" (Base + add-on scelti)? → dritti al checkout Stripe
      if (sf.compra && config.stripe.attivo) {
        const url = await abbonamenti.creaCheckout({ login, pacchetti: sf.pacchetti || [] }).catch(() => null);
        if (url) return res.redirect(url);
      }
      return res.redirect('/?abbonati=1');
    }

    // ── (b) FLUSSO MODERATORE ──────────────────────────────────────
    if (req.session?.modFlow) {
      const mf = req.session.modFlow; delete req.session.modFlow;
      if (!mf.state || req.query.state !== mf.state) return res.redirect('/mod?errore=state');
      let v = null;
      try { const t = await auth.exchangeCode(String(req.query.code || '')); v = await auth.validate(t.accessToken); }
      catch { /* sotto */ }
      if (!v?.login) return res.redirect('/mod?errore=validazione');
      const modLogin = String(v.login).toLowerCase();
      const disp = v.display || modLogin;

      let preferito = null;
      if (mf.invito) {
        const inv = managers.byInvite(mf.invito);
        if (!inv) return res.redirect('/mod?errore=invito');
        if (inv.invite_expires && Date.now() > inv.invite_expires) return res.redirect('/mod?errore=scaduto');
        if (inv.login !== modLogin) return res.redirect('/mod?errore=account-diverso');
        managers.attiva(inv.channel, modLogin, disp);
        preferito = inv.channel;                               // atterra sul canale dell'invito
      }
      // accesso unificato: l'identità dà accesso al proprio canale (se streamer
      // approvato) e a tutti i canali moderati; poi si cambia con lo switcher.
      const contesti = contestiPer(modLogin);
      if (!contesti.length) return res.redirect('/mod?errore=nonmod');
      const ctx = contestoDefault(contesti, preferito);
      if (ctx.role === 'moderatore') managers.touch(ctx.canale, modLogin);
      req.session.user = sessionePer(modLogin, disp, ctx);
      log.info(`login: @${modLogin} → gestisce #${ctx.canale} (${ctx.role})`);
      return res.redirect('/');
    }

    // ── (a) FLUSSO PROPRIETARIO (concessione permessi) ─────────────
    const u = req.session?.user;
    if (!u) return notFound(res);                              // nessun flusso valido
    const state = req.session?.oauthState; delete req.session.oauthState;
    if (!state || req.query.state !== state) return res.redirect('/?errore=state');
    const t = await auth.exchangeCode(String(req.query.code || ''));
    const v = await auth.validate(t.accessToken);
    if (!v) return res.redirect('/?errore=validazione');
    if (v.login !== u.login) return res.redirect('/?errore=account-diverso');
    tokens.save('broadcaster', v.login, {
      userId: v.userId, accessToken: t.accessToken, refreshToken: t.refreshToken, scopes: t.scopes, expiresAt: t.expiresAt,
    });
    avviaPretrain(v.login);
    sync();
    res.redirect('/');
  }));

  // Concessione permessi: SOLO il proprietario (un moderatore non tocca i permessi).
  app.get('/auth/permessi', requireOwner, (req, res) => {
    const state = crypto.randomUUID();
    req.session.oauthState = state;
    res.redirect(auth.authUrl(SCOPES.broadcaster, state));
  });

  // Elenco/invito/rimozione dei moderatori del proprio canale (solo proprietario).
  app.get('/api/moderatori', requireOwner, wrap(async (req, res) => {
    const ch = currentUser(req).login;
    res.json(managers.listByChannel(ch).map((m) => ({
      id: m.id, login: m.login, display: m.display || m.login, status: m.status,
      last_seen: m.last_seen, created_at: m.created_at,
      invito: m.status === 'invitato' ? { url: MOD_INVITE_URL(m.invite_token), scade: m.invite_expires } : null,
    })));
  }));

  app.post('/api/moderatori', requireOwner, wrap(async (req, res) => {
    const ch = currentUser(req).login;
    const login = String(req.body?.login || '').toLowerCase().trim().replace(/^@/, '');
    if (!/^[a-z0-9_]{3,25}$/.test(login)) return res.status(400).json({ errore: 'username Twitch non valido' });
    if (login === ch) return res.status(400).json({ errore: 'sei già il proprietario del canale' });
    const maxMod = limiteTier(req, 'moderatori');   // limite moderatori del piano
    if (!managers.get(ch, login) && managers.listByChannel(ch).length >= maxMod) {
      return res.status(400).json({ errore: maxMod === 0 ? 'Il tuo piano non include i moderatori.' : 'hai raggiunto il massimo di moderatori del tuo piano.' });
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const scade = Date.now() + MOD_INVITE_TTL;
    managers.invita(ch, login, { invitedBy: ch, token, expires: scade });
    res.json({ ok: true, invito: { url: MOD_INVITE_URL(token), login, scade } });
  }));

  app.post('/api/moderatori/:id/reinvita', requireOwner, wrap(async (req, res) => {
    const ch = currentUser(req).login;
    const m = managers.byId(ch, parseInt(req.params.id, 10) || 0);
    if (!m) return res.status(404).json({ errore: 'moderatore sconosciuto' });
    const token = crypto.randomBytes(32).toString('base64url');
    const scade = Date.now() + MOD_INVITE_TTL;
    managers.invita(ch, m.login, { invitedBy: ch, token, expires: scade });
    res.json({ ok: true, invito: { url: MOD_INVITE_URL(token), login: m.login, scade } });
  }));

  app.delete('/api/moderatori/:id', requireOwner, wrap(async (req, res) => {
    managers.remove(currentUser(req).login, parseInt(req.params.id, 10) || 0);
    res.json({ ok: true });
  }));

  // Cambio del canale gestito (switcher). Vale per chiunque: il proprietario può
  // passare anche ai canali che modera e viceversa. Il ruolo sul nuovo canale è
  // determinato dai contesti dell'identità → il sito capisce da sé chi sei lì.
  const cambiaCanale = wrap(async (req, res) => {
    const u = currentUser(req);
    const ident = identitaDi(u);
    const ch = String(req.body?.channel || '').toLowerCase().trim();
    const ctx = contestiPer(ident).find((c) => c.canale === ch);
    if (!ctx) return res.status(403).json({ errore: 'non gestisci questo canale' });
    if (ctx.role === 'moderatore') managers.touch(ch, ident);
    req.session.user = sessionePer(ident, u.identitaDisplay || u.modDisplay || u.display || ident, ctx);
    res.json({ ok: true, ruolo: ctx.role, canale: ch });
  });
  app.post('/api/cambia-canale', requireLogin, cambiaCanale);
  app.post('/api/mod/cambia-canale', requireLogin, cambiaCanale);   // alias retrocompatibile

  app.get('/auth/logout', (req, res) => {
    req.session = null;
    res.redirect('/entra');            // uscendo si torna "fuori" (404 finché non si rientra col pass)
  });

  // ------------------------------------------------------------ API base

  app.get('/health', (req, res) => res.json({ ok: true }));

  // stato complessivo per la single-page
  app.get('/api/me', wrap(async (req, res) => {
    const user = currentUser(req);
    // Vetrina pubblica: senza sessione niente dati reali, solo "nessun utente"
    // (la single-page mostra la vetrina/landing). Config e canali restano privati.
    if (!user) { res.json({ user: null }); return; }
    const ident = identitaDi(user);
    res.json({
      user,
      isAdmin: isAdmin(user),
      ruolo: user?.role || null,
      identita: ident,
      identitaDisplay: user.identitaDisplay || user.modDisplay || user.display || ident,
      // chi sta gestendo ora + TUTTI i canali gestibili dall'identità, con ruolo
      // (proprio canale da proprietario + canali moderati) → alimenta lo switcher.
      gestisce: { canale: user.login, streamer: user.display || user.login },
      mieiCanali: contestiPer(ident),
      missing: missingConfig(),
      status: manager.status(),
      streamer: user ? streamerSicuro(user.login) : null,
      permessiOk: user ? permessiOk(user.login) : false,
      vipOk: user ? vipOk(user.login) : false,
      moderazioneOk: user ? moderazioneOk(user.login) : false,
      canaleOk: user ? canaleOk(user.login) : false,
      // Regia (Vai live): quali permessi ha concesso per gestire la diretta dal bot
      regia: user ? { broadcast: canaleOk(user.login), raid: raidOk(user.login), commercial: commercialOk(user.login), ads: adsOk(user.login) } : null,
      // Studio Web: permesso stream key concesso? live in corso dallo studio?
      studio: user ? { keyOk: studioKeyOk(user.login), live: studio.attiva(user.login) } : null,
      telegram: user ? statoTelegram(user.login) : null,
      knowledgeCount: user ? knowledge.count(user.login) : 0,
      preaddestramento: user
        ? Object.fromEntries(memory.facts(user.login)
            .filter((f) => f.key.startsWith('preaddestramento'))
            .map((f) => [f.key, f.value]))
        : {},
      // abbonamento: piano base + add-on attivi del canale gestito + stato Stripe (per la UI)
      tier: tierDi(user.login),
      abbonamento: (() => {
        const s = subscriptions.get(user.login);
        return s ? { tier: s.tier, pacchetti: abbonamenti.normalizzaPacchetti(s.pacchetti), status: s.status, fine: s.current_period_end } : null;
      })(),
      stripeAttivo: config.stripe.attivo,
    });
  }));

  // richiesta di abilitazione ("porta SocialBot nel tuo canale")
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

  // ------------------------------------------------------------ ABBONAMENTI
  // Accesso self-service a SocialBot via abbonamento Stripe/Link, modello MODULARE
  // "Base + add-on à la carte". "Predisposto ma spento" finché non ci sono le chiavi
  // (config.stripe.attivo): i piani si vedono, il checkout non parte. Il login
  // self-service con Twitch (/accedi) si attiva solo con Stripe acceso, così
  // l'ingresso extra non si apre finché il paywall non è operativo. Il gating per
  // funzioni effettive (base ∪ add-on) è già attivo — vedi funzioniDi()/esigiFunzione();
  // i membri community restano con accesso pieno di diritto.

  // piani (Base + add-on) + stato del sistema (pubblico: la vetrina mostra i prezzi).
  // pianiPubblici() serializza Infinity come -1 ("illimitato"), che il client legge come ∞.
  app.get('/api/abbonamento/piani', (req, res) => {
    res.json({ attivo: config.stripe.attivo, ...abbonamenti.pianiPubblici() });
  });

  // avvia il checkout per un tier. Identità: la sessione, oppure chi ha fatto il
  // login self-service in attesa di abbonarsi (req.session.abbonando). Off → 503.
  app.post('/api/abbonamento/checkout', wrap(async (req, res) => {
    if (!config.stripe.attivo) return res.status(503).json({ errore: 'Gli abbonamenti non sono ancora attivi.' });
    const login = identitaDi(currentUser(req)) || String(req.session?.abbonando?.login || '').toLowerCase();
    if (!login) return res.status(401).json({ errore: 'non autenticato' });
    // canone Base + add-on scelti (à la carte). Retrocompat: 'pro' → base + tutti gli add-on.
    const pacchetti = String(req.body?.tier || '').toLowerCase() === 'pro'
      ? abbonamenti.ADDON_IDS
      : abbonamenti.normalizzaPacchetti(req.body?.pacchetti);
    const url = await abbonamenti.creaCheckout({ login, pacchetti });
    if (!url) return res.status(400).json({ errore: 'Piano non disponibile.' });
    res.json({ url });
  }));

  // portale clienti Stripe (gestione/disdetta). Serve un cliente Stripe esistente.
  app.post('/api/abbonamento/portale', requireLogin, wrap(async (req, res) => {
    const s = subscriptions.get(identitaDi(currentUser(req)));
    const url = s?.stripe_customer ? await abbonamenti.creaPortale({ customerId: s.stripe_customer }) : null;
    if (!url) return res.status(503).json({ errore: 'Gestione abbonamento non disponibile.' });
    res.json({ url });
  }));

  // webhook Stripe: unica fonte di verità sullo stato dell'abbonamento.
  app.post('/stripe/webhook', wrap(async (req, res) => {
    const ev = abbonamenti.verificaWebhook(req.rawBody, req.headers['stripe-signature']);
    if (!ev) return res.status(400).send('firma non valida');
    try { await gestisciEventoStripe(ev); } catch (e) { log.warn('webhook stripe:', e?.message || e); }
    res.json({ received: true });
  }));

  async function gestisciEventoStripe(ev) {
    const o = ev.data?.object || {};
    if (ev.type === 'checkout.session.completed') {
      const login = String(o.metadata?.login || o.client_reference_id || '').toLowerCase();
      if (!login) return;
      const tier = o.metadata?.tier || 'base';
      const pacchetti = abbonamenti.normalizzaPacchetti(o.metadata?.pacchetti);
      subscriptions.set(login, { tier, pacchetti, status: 'active', customerId: o.customer || '', subId: o.subscription || '' });
      streamers.upsertApproved(login, streamers.get(login)?.display || login);   // abbonato → abilitato
      seedStreamer(login);
      sync();
      log.info(`abbonamento attivo: @${login} (${tier}${pacchetti.length ? ' +' + pacchetti.join('+') : ''})`);
    } else if (ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.deleted') {
      const login = String(o.metadata?.login || '').toLowerCase();
      if (!login) return;
      const attivo = o.status === 'active' || o.status === 'trialing';
      const tier = o.metadata?.tier || subscriptions.get(login)?.tier || 'base';
      // i pacchetti restano quelli scelti al checkout: se i metadata non li portano,
      // non li tocchiamo (undefined = mantieni quelli già salvati).
      const pacchetti = o.metadata?.pacchetti !== undefined ? abbonamenti.normalizzaPacchetti(o.metadata.pacchetti) : undefined;
      subscriptions.set(login, { tier, pacchetti, status: o.status || 'canceled', subId: o.id || '', periodEnd: (o.current_period_end || 0) * 1000 });
      if (!attivo) streamers.setEnabled(login, false);   // disdetta/insoluto → bot spento (non cancella nulla)
      sync();
      log.info(`abbonamento @${login}: ${o.status}`);
    }
  }

  // (il login diretto con Twitch è gestito sopra da GET /entra senza ?pass)

  // Login self-service con Twitch per abbonarsi. Attivo solo con Stripe acceso.
  app.get('/accedi', (req, res) => {
    if (!config.stripe.attivo) return res.redirect('/');   // paywall spento: niente ingresso extra
    const state = crypto.randomUUID();
    // add-on scelti dalla vetrina (CSV). Retrocompat: ?tier=pro → base + tutti gli add-on.
    const pacchetti = String(req.query.tier || '').toLowerCase() === 'pro'
      ? abbonamenti.ADDON_IDS
      : abbonamenti.normalizzaPacchetti(req.query.pacchetti);
    // ricorda la scelta: dopo il login self-service si va DRITTI al checkout (Base + add-on)
    req.session.selfFlow = { state, compra: true, pacchetti };
    res.redirect(auth.authUrl([], state));
  });

  // ------------------------------------------------------------ SPOTIFY (richieste musicali)
  // Connettore OAuth: lo streamer collega il PROPRIO account Spotify. Lo `state`
  // monouso (login + scadenza) lega il ritorno OAuth al canale giusto, senza
  // dipendere dal cookie di sessione (il redirect arriva da accounts.spotify.com).
  const spotifyStati = new Map();   // state → { login, ts }
  const puliziaStati = () => { const ora = Date.now(); for (const [k, v] of spotifyStati) if (ora - v.ts > 600000) spotifyStati.delete(k); };

  // stato del connettore per il canale gestito (per la UI). Non espone mai i segreti.
  app.get('/api/spotify/stato', requireLogin, (req, res) => {
    const login = currentUser(req).login;
    res.json({
      attivo: spotify.attivo(login),           // c'è un'app usabile (propria o globale)
      proprio: spotify.haConfigProprio(login), // lo streamer ha messo le SUE credenziali
      collegato: spotify.collegato(login),     // account Spotify collegato (OAuth fatto)
      redirect: spotify.redirectUri(),         // da registrare nell'app Spotify dello streamer
    });
  });

  // salva le credenziali dell'app Spotify DELLO STREAMER (Client ID/Secret)
  app.post('/api/spotify/config', requireOwner, (req, res) => {
    const clientId = String(req.body?.clientId || '').trim();
    const clientSecret = String(req.body?.clientSecret || '').trim();
    if (!clientId || !clientSecret) return res.status(400).json({ errore: 'Servono Client ID e Client Secret.' });
    spotify.salvaConfig(currentUser(req).login, clientId, clientSecret);
    res.json({ ok: true });
  });

  // avvia il collegamento: solo il proprietario, solo se c'è un'app usabile
  app.get('/api/spotify/connect', requireOwner, (req, res) => {
    const login = currentUser(req).login;
    if (!spotify.attivo(login)) return res.status(503).json({ errore: 'Imposta prima le credenziali Spotify.' });
    puliziaStati();
    const state = crypto.randomUUID();
    spotifyStati.set(state, { login, ts: Date.now() });
    res.json({ url: spotify.urlAutorizzazione(login, state) });
  });

  // ritorno OAuth di Spotify: scambia il code e salva i token per il canale.
  app.get('/spotify/callback', wrap(async (req, res) => {
    puliziaStati();
    const st = spotifyStati.get(String(req.query.state || ''));
    spotifyStati.delete(String(req.query.state || ''));
    if (!st || !req.query.code) return res.redirect('/?spotify=errore');
    const ok = await spotify.collega(st.login, String(req.query.code)).catch(() => false);
    return res.redirect(ok ? '/?spotify=ok' : '/?spotify=errore');
  }));

  // scollega Spotify dal canale gestito
  app.post('/api/spotify/disconnect', requireOwner, (req, res) => {
    spotify.scollega(currentUser(req).login);
    res.json({ ok: true });
  });

  // Premi a punti canale per le richieste musicali: elenco (per capire quanti ne
  // hai già e quali nomi sono occupati) + creazione del premio dedicato.
  app.get('/api/musica/premi', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!redemptionsOk(login)) return res.json({ permessoOk: false, tutti: [], premio: '' });
    const tutti = await helix.listaRewardsTutti(login).catch(() => []);
    res.json({ permessoOk: true, tutti, premio: streamers.get(login)?.settings?.musica?.premio || '' });
  }));

  app.post('/api/musica/premio', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!redemptionsOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "punti canale" da /auth/permessi', permesso: true });
    const titolo = (String(req.body?.titolo || '').trim() || 'Richiesta musicale').slice(0, 45);
    const costo = Math.max(1, Math.round(Number(req.body?.costo) || 500));
    let reward;
    try {
      reward = await helix.creaReward(login, { titolo, costo, userInput: true, prompt: 'Scrivi la canzone (nome e artista)' });
    } catch (e) {
      if (e.status === 403) return res.status(403).json({ errore: 'Permesso mancante: concedi "punti canale" da /auth/permessi', permesso: true });
      if (e.status === 400) return res.status(400).json({ errore: 'Twitch ha rifiutato il premio: forse esiste già un premio con questo nome.' });
      return res.status(502).json({ errore: 'Twitch non ha creato il premio.' });
    }
    if (!reward?.id) return res.status(502).json({ errore: 'Twitch non ha creato il premio.' });
    // imposta subito la modalità "punti" con questo premio
    const s = streamers.get(login);
    const musica = { ...(s.settings?.musica || {}), modo: 'punti', premio: reward.title };
    streamers.setSettings(login, { ...s.settings, musica });
    res.json({ ok: true, reward });
  }));

  // Penitenze: elenco premi (per scegliere quello che le attiva) e creazione.
  app.get('/api/penitenze/premi', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!redemptionsOk(login)) return res.json({ permessoOk: false, tutti: [], premioVieta: '', premioSolo: '' });
    const tutti = await helix.listaRewardsTutti(login).catch(() => []);
    const pen = streamers.get(login)?.settings?.penitenze || {};
    // retrocompat: il vecchio premioTesto/premio diventa il premio "vieta"
    const premioVieta = pen.premioVieta || pen.premioTesto || (pen.modo === 'parola' ? pen.premio : '') || '';
    const premioSolo = pen.premioSolo || '';
    res.json({ permessoOk: true, tutti, premioVieta, premioSolo });
  }));

  app.post('/api/penitenze/premio', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!redemptionsOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "punti canale" da /auth/permessi', permesso: true });
    // campo = quale dei due premi (vieta = ban, solo = inverso)
    const campo = req.body?.campo === 'premioSolo' ? 'premioSolo' : 'premioVieta';
    const nomeDefault = campo === 'premioSolo' ? 'Dì solo questa parola' : 'Vietami una parola';
    const titolo = (String(req.body?.titolo || '').trim() || nomeDefault).slice(0, 45);
    const costo = Math.max(1, Math.round(Number(req.body?.costo) || 500));
    const prompt = campo === 'premioSolo'
      ? 'Scrivi la parola che lo streamer potrà dire (solo quella!)'
      : 'Scrivi la parola da vietare allo streamer';
    let reward;
    try {
      reward = await helix.creaReward(login, { titolo, costo, userInput: true, prompt });
    } catch (e) {
      if (e.status === 403) return res.status(403).json({ errore: 'Permesso mancante: concedi "punti canale" da /auth/permessi', permesso: true });
      if (e.status === 400) return res.status(400).json({ errore: 'Twitch ha rifiutato il premio: forse esiste già un premio con questo nome.' });
      return res.status(502).json({ errore: 'Twitch non ha creato il premio.' });
    }
    if (!reward?.id) return res.status(502).json({ errore: 'Twitch non ha creato il premio.' });
    const s = streamers.get(login);
    const penitenze = { ...(s.settings?.penitenze || {}), attivo: true, [campo]: reward.title };
    streamers.setSettings(login, { ...s.settings, penitenze });
    res.json({ ok: true, reward, campo });
  }));

  // Prova il contatore penitenze nell'overlay (start → +1 → +1 → fine).
  app.post('/api/penitenze/prova', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    try { manager.penitenze?.prova(login); } catch { /* niente */ }
    res.json({ ok: true });
  }));

  // Prova un alert / la chat / un widget nell'overlay.
  app.post('/api/alert/prova', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const kind = ['follow', 'sub', 'cheer', 'raid', 'chat', 'ultimoFollower', 'ultimoSub'].includes(req.body?.kind) ? req.body.kind : 'follow';
    try { manager.alerts?.prova(login, kind); } catch { /* niente */ }
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ SONDAGGI & PREDIZIONI (dal pannello)
  // Gli stessi di !sondaggio/!predizione, ma gestiti dalla dashboard via Helix.
  // Fanno parte dell'add-on "Effetti & Punti canale".
  app.get('/api/sondaggi/stato', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const [poll, pred] = await Promise.all([
      helix.sondaggioAttivo(login).catch(() => null),
      helix.predizioneAttiva(login).catch(() => null),
    ]);
    res.json({ poll, pred });
  }));

  app.post('/api/sondaggi/crea', requireOwner, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'I sondaggi')) return;
    const login = currentUser(req).login;
    const titolo = String(req.body?.titolo || '').trim();
    const opzioni = (Array.isArray(req.body?.opzioni) ? req.body.opzioni : []).map((x) => String(x || '').trim()).filter(Boolean);
    if (!titolo || opzioni.length < 2) return res.status(400).json({ errore: 'Serve una domanda e almeno 2 opzioni.' });
    let p;
    try { p = await helix.creaSondaggio(login, { titolo, opzioni, durata: Math.max(15, Math.min(1800, Number(req.body?.durata) || 120)) }); }
    catch (e) {
      if (e.status === 401 || e.status === 403) return res.status(403).json({ errore: 'Concedi il permesso "sondaggi" da /auth/permessi', permesso: true });
      if (e.status === 400) return res.status(400).json({ errore: 'Twitch ha rifiutato il sondaggio (ne hai già uno attivo?).' });
      return res.status(502).json({ errore: 'Twitch non ha creato il sondaggio.' });
    }
    if (!p) return res.status(502).json({ errore: 'Sondaggio non creato (sei in diretta?).' });
    manager.say(login, `📊 Sondaggio: "${p.titolo}" — votate su Twitch!`);
    res.json({ ok: true, poll: p });
  }));

  app.post('/api/sondaggi/chiudi', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const att = await helix.sondaggioAttivo(login).catch(() => null);
    if (!att) return res.status(404).json({ errore: 'Nessun sondaggio attivo.' });
    await helix.chiudiSondaggio(login, att.id).catch(() => {});
    res.json({ ok: true });
  }));

  app.post('/api/predizioni/crea', requireOwner, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Le predizioni')) return;
    const login = currentUser(req).login;
    const titolo = String(req.body?.titolo || '').trim();
    const esiti = (Array.isArray(req.body?.esiti) ? req.body.esiti : []).map((x) => String(x || '').trim()).filter(Boolean);
    if (!titolo || esiti.length < 2) return res.status(400).json({ errore: 'Serve un titolo e almeno 2 esiti.' });
    let p;
    try { p = await helix.creaPredizione(login, { titolo, esiti, finestra: Math.max(30, Math.min(1800, Number(req.body?.finestra) || 120)) }); }
    catch (e) {
      if (e.status === 401 || e.status === 403) return res.status(403).json({ errore: 'Concedi il permesso "predizioni" da /auth/permessi', permesso: true });
      if (e.status === 400) return res.status(400).json({ errore: 'Twitch ha rifiutato la predizione (ne hai già una attiva?).' });
      return res.status(502).json({ errore: 'Twitch non ha creato la predizione.' });
    }
    if (!p) return res.status(502).json({ errore: 'Predizione non creata.' });
    manager.say(login, `🔮 Predizione: "${p.titolo}" — puntate i punti canale!`);
    res.json({ ok: true, pred: p });
  }));

  app.post('/api/predizioni/risolvi', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const att = await helix.predizioneAttiva(login).catch(() => null);
    if (!att) return res.status(404).json({ errore: 'Nessuna predizione attiva.' });
    const esitoId = String(req.body?.esitoId || '');
    const vinc = att.esiti.find((o) => o.id === esitoId);
    if (!vinc) return res.status(400).json({ errore: 'Esito non valido.' });
    await helix.risolviPredizione(login, att.id, esitoId).catch(() => {});
    manager.say(login, `🔮 Predizione risolta: ha vinto "${vinc.titolo}"! 🎉`);
    res.json({ ok: true });
  }));

  app.post('/api/predizioni/annulla', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const att = await helix.predizioneAttiva(login).catch(() => null);
    if (!att) return res.status(404).json({ errore: 'Nessuna predizione attiva.' });
    await helix.risolviPredizione(login, att.id, null).catch(() => {});
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ GIVEAWAY (dal pannello)
  // Stato in memoria condiviso col bot (stesso processo). Gli spettatori entrano
  // con !join in chat; lo streamer apre/estrae/annulla da qui. Add-on "Giochi".
  app.get('/api/giveaway/stato', requireOwner, (req, res) => {
    res.json(giveaway.stato(currentUser(req).login));
  });

  app.post('/api/giveaway/apri', requireOwner, (req, res) => {
    const login = currentUser(req).login;
    const r = giveaway.apri(login, { premio: req.body?.premio, soloSub: !!req.body?.soloSub });
    if (!r.ok) return res.status(400).json({ errore: r.errore === 'gia-aperto' ? 'C\'è già un giveaway aperto.' : 'I giveaway non sono inclusi nel tuo piano.' });
    manager.say(login, `🎁 GIVEAWAY APERTO: ${r.premio}! Scrivete !join per partecipare${r.soloSub ? ' (riservato ai sub)' : ''}. In bocca al lupo! 🍀`);
    res.json({ ok: true });
  });

  app.post('/api/giveaway/estrai', requireOwner, (req, res) => {
    const login = currentUser(req).login;
    const r = giveaway.estraiUno(login);
    if (!r) return res.json({ ok: true, vincitore: null });
    manager.say(login, `🎉🎉 Il vincitore del giveaway è… ${r.vincitore}! Congratulazioni! 🏆`);
    res.json({ ok: true, vincitore: r.vincitore });
  });

  app.post('/api/giveaway/annulla', requireOwner, (req, res) => {
    const login = currentUser(req).login;
    giveaway.annulla(login);
    manager.say(login, '🎁 Giveaway annullato.');
    res.json({ ok: true });
  });

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
      out.spontaneita = Math.min(0.5, Math.max(0, n));
    }
    if (b.rispostaMenzioni !== undefined) out.rispostaMenzioni = !!b.rispostaMenzioni;
    // modalità di attivazione: 24/7, solo quando è in diretta, o manuale
    if (b.modalita !== undefined) {
      if (!['sempre', 'live', 'manuale'].includes(b.modalita)) return res.status(400).json({ errore: 'modalità non valida' });
      out.modalita = b.modalita;
    }
    if (b.frasi !== undefined) {
      if (!Array.isArray(b.frasi)) return res.status(400).json({ errore: 'frasi deve essere una lista' });
      out.frasi = b.frasi
        .map((f) => String(f).trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 50);
    }
    if (b.clipAuto !== undefined) out.clipAuto = !!b.clipAuto;
    // sensibilità del rilevatore clip (1–10): il bot si adatta al ritmo del canale
    if (b.clipAutoSensibilita !== undefined) {
      const n = Number(b.clipAutoSensibilita);
      if (!Number.isFinite(n)) return res.status(400).json({ errore: 'sensibilità clip non valida' });
      out.clipAutoSensibilita = Math.min(10, Math.max(1, Math.round(n)));
    }
    // legacy: vecchia soglia in messaggi/minuto (ancora accettata)
    if (b.clipAutoSoglia !== undefined) {
      const n = Number(b.clipAutoSoglia);
      if (!Number.isFinite(n)) return res.status(400).json({ errore: 'soglia clip non valida' });
      out.clipAutoSoglia = Math.min(200, Math.max(5, Math.round(n)));
    }
    // penitenze a punti canale (a CONTATORE): due premi (vieta / usa solo), la
    // penitenza scatta alla fine del tempo; contatore + "+1" nell'overlay.
    if (b.penitenze !== undefined) {
      const p = b.penitenze || {};
      const ov = (p.overlay && typeof p.overlay === 'object') ? p.overlay : {};
      const posizioni = ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra', 'alto-centro', 'basso-centro'];
      const colore = /^#[0-9a-fA-F]{6}$/.test(String(ov.colore)) ? String(ov.colore) : '#ff2d2d';
      out.penitenze = {
        attivo: !!p.attivo,
        // premio "vieta la parola" (ban) e premio "usa solo la parola" (inverso)
        premioVieta: String(p.premioVieta || '').trim().slice(0, 60),
        premioSolo: String(p.premioSolo || '').trim().slice(0, 60),
        durataMin: Math.max(1, Math.min(15, Math.round(Number(p.durataMin)) || 2)),
        parole: Array.isArray(p.parole) ? p.parole.map((x) => String(x).trim().toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 80) : [],
        // penitenza: dalla mia lista o scelta dall'IA
        penitenzeModo: ['lista', 'ia'].includes(p.penitenzeModo) ? p.penitenzeModo : 'lista',
        penitenze: Array.isArray(p.penitenze) ? p.penitenze.map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 60) : [],
        effetto: String(p.effetto || '').trim().slice(0, 40),
        // tolleranza al riconoscimento vocale (50..100 = più severo)
        fuzzy: Math.max(50, Math.min(100, Math.round(Number(p.fuzzy)) || 80)),
        overlay: { posizione: posizioni.includes(ov.posizione) ? ov.posizione : 'alto-destra', colore },
      };
    }
    // ALERT overlay (follow/sub/cheer/raid): notifiche animate + suono + stile
    if (b.alerts !== undefined) {
      const p = b.alerts || {};
      const posAlert = ['alto-centro', 'centro', 'basso-centro'];
      // suono: un preset OPPURE un effetto audio caricato ("effetto:<comando>").
      // media: niente OPPURE un'immagine/video caricato ("effetto:<comando>").
      const refEffetto = (x) => /^effetto:[a-z0-9_]{1,30}$/i.test(String(x)) ? String(x).toLowerCase() : '';
      const suonoOk = (x) => (SUONI_PRESET.has(String(x)) ? String(x) : refEffetto(x));
      const evt = (e) => {
        e = e || {};
        return {
          attivo: !!e.attivo,
          testo: String(e.testo || '').slice(0, 200),
          suono: suonoOk(e.suono),
          media: refEffetto(e.media),
          font: unoDi(e.font, FONT_OVL, ''),   // '' = usa il font condiviso dello stile
          volume: clampInt(e.volume, 0, 100, 100),
          accento: hexOk(e.accento || e.colore, '#9146ff'),
        };
      };
      const st = p.stile || {};
      out.alerts = {
        attivo: !!p.attivo,
        posizione: posAlert.includes(p.posizione) ? p.posizione : 'alto-centro',
        xy: xyOk(p.xy),
        durata: clampInt(p.durata, 2000, 20000, 6000),
        stile: {
          animazione: unoDi(st.animazione, ['slide', 'pop', 'zoom', 'fade', 'flip', 'bounce'], 'slide'),
          dimTesto: clampInt(st.dimTesto, 14, 56, 27),
          sfondo: hexOk(st.sfondo, '#0f0f14'),
          opacita: clampInt(st.opacita, 0, 100, 88),
          testo: hexOk(st.testo, '#ffffff'),
          bordoRaggio: clampInt(st.bordoRaggio, 0, 40, 18),
          bordoSpessore: clampInt(st.bordoSpessore, 0, 10, 2),
          glow: st.glow !== false,
          icona: st.icona !== false,
          font: unoDi(st.font, FONT_OVL, 'sistema'),
          googleFont: String(st.googleFont || '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50),
        },
        follow: evt(p.follow),
        sub: evt(p.sub),
        cheer: { ...evt(p.cheer), minBits: clampInt(p.cheer?.minBits, 0, 1e9, 0) },
        raid: { ...evt(p.raid), minViewers: clampInt(p.raid?.minViewers, 0, 1e6, 0) },
      };
    }
    // CHAT a schermo nell'overlay (con stile completo)
    if (b.chatOverlay !== undefined) {
      const c = b.chatOverlay || {};
      const posChat = ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra'];
      const st = c.stile || {};
      out.chatOverlay = {
        attivo: !!c.attivo,
        posizione: posChat.includes(c.posizione) ? c.posizione : 'basso-sinistra',
        xy: xyOk(c.xy),
        max: clampInt(c.max, 1, 20, 8),
        fadeSec: clampInt(c.fadeSec, 0, 120, 0),
        stile: {
          dim: unoDi(st.dim, ['piccola', 'media', 'grande', 'enorme'], 'media'),
          sfondo: hexOk(st.sfondo, '#0f0f14'),
          opacita: clampInt(st.opacita, 0, 100, 78),
          testo: hexOk(st.testo, '#f2f2f5'),
          username: (st.username === 'twitch' || /^#[0-9a-fA-F]{6}$/.test(String(st.username))) ? st.username : 'twitch',
          bordoRaggio: clampInt(st.bordoRaggio, 0, 30, 10),
          ombra: st.ombra !== false,
          font: unoDi(st.font, FONT_OVL, 'sistema'),
          googleFont: String(st.googleFont || '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50),
          larghezza: clampInt(st.larghezza, 18, 60, 30),
          animazione: unoDi(st.animazione, ['slide', 'fade', 'nessuna'], 'slide'),
          grassettoUser: st.grassettoUser !== false,
        },
      };
    }
    // WIDGET persistenti dell'overlay (ultimo follower / ultimo sub)
    if (b.overlayWidget !== undefined) {
      const w = b.overlayWidget || {};
      const posW = ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra'];
      const wid = (x, testoDef) => {
        x = x || {}; const st = x.stile || {};
        return {
          attivo: !!x.attivo,
          posizione: posW.includes(x.posizione) ? x.posizione : 'basso-destra',
          xy: xyOk(x.xy),
          testo: String(x.testo || testoDef).slice(0, 80),
          stile: {
            dim: unoDi(st.dim, ['piccola', 'media', 'grande'], 'media'),
            sfondo: hexOk(st.sfondo, '#0f0f14'),
            opacita: clampInt(st.opacita, 0, 100, 85),
            testo: hexOk(st.testo, '#ffffff'),
            accento: hexOk(st.accento, '#9146ff'),
            bordoRaggio: clampInt(st.bordoRaggio, 0, 30, 12),
            font: unoDi(st.font, FONT_OVL, 'sistema'),
          },
        };
      };
      out.overlayWidget = {
        ultimoFollower: wid(w.ultimoFollower, 'Ultimo follower: {nome}'),
        ultimoSub: wid(w.ultimoSub, 'Ultimo sub: {nome}'),
      };
    }
    // CSS avanzato dell'overlay (libertà totale sul proprio overlay)
    if (b.overlayCss !== undefined) out.overlayCss = String(b.overlayCss || '').slice(0, 8000);
    // PIÙ OVERLAY: lista di layout, ognuno col suo id/nome/visibilità/posizioni/css.
    if (b.overlays !== undefined) {
      const arr = Array.isArray(b.overlays) ? b.overlays : [];
      const puliti = arr.slice(0, 12).map((o, i) => {
        const m = o?.mostra || {};
        const xy = o?.xy || {};
        let id = String(o?.id || `ov${i}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || `ov${i}`;
        return {
          id, nome: String(o?.nome || 'Overlay').trim().slice(0, 40) || 'Overlay',
          mostra: { alert: m.alert !== false, chat: m.chat !== false, wf: m.wf !== false, ws: m.ws !== false, effetti: m.effetti !== false },
          xy: { alert: xyOk(xy.alert), chat: xyOk(xy.chat), wf: xyOk(xy.wf), ws: xyOk(xy.ws) },
          css: String(o?.css || '').slice(0, 8000),
        };
      });
      // id UNICI (l'url dell'overlay li usa)
      const visti = new Set();
      for (const o of puliti) { while (visti.has(o.id)) o.id += '_'; visti.add(o.id); }
      if (puliti.length) out.overlays = puliti;
    }
    // Template dell'overlay salvati dallo streamer (snapshot del proprio look).
    // Il `dati` viene ri-applicato solo attraverso il salvataggio validato qui
    // sopra, quindi lo conserviamo così com'è (limitato in numero e dimensione).
    if (b.overlayTemplates !== undefined) {
      const arr = Array.isArray(b.overlayTemplates) ? b.overlayTemplates : [];
      out.overlayTemplates = arr.slice(0, 16)
        .map((t) => ({ nome: String(t?.nome || 'Template').slice(0, 40), dati: (t?.dati && typeof t.dati === 'object') ? t.dati : {} }))
        .filter((t) => JSON.stringify(t.dati).length < 8000);
    }
    // ascolto live lato server (audio → clip nei momenti salienti): opt-in
    if (b.ascoltoLive !== undefined) out.ascoltoLive = !!b.ascoltoLive;
    if (b.ascoltoSensibilita !== undefined) {
      const n = Number(b.ascoltoSensibilita);
      if (!Number.isFinite(n)) return res.status(400).json({ errore: 'sensibilità ascolto non valida' });
      out.ascoltoSensibilita = Math.min(10, Math.max(1, Math.round(n)));
    }
    // cambio categoria a voce: parola chiave personalizzabile + annuncio in chat
    if (b.cambioCategoria !== undefined) {
      const cc = b.cambioCategoria || {};
      const trig = String(cc.trigger || 'categoria').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 30) || 'categoria';
      out.cambioCategoria = { attivo: !!cc.attivo, trigger: trig, annuncia: cc.annuncia !== false };
    }
    // cambio titolo a voce: stessa logica (parola chiave + annuncio)
    if (b.cambioTitolo !== undefined) {
      const ct = b.cambioTitolo || {};
      const trig = String(ct.trigger || 'titolo').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 30) || 'titolo';
      out.cambioTitolo = { attivo: !!ct.attivo, trigger: trig, annuncia: ct.annuncia !== false };
    }
    // "impara mentre parlo": il bot cresce ascoltando la voce dello streamer in diretta
    if (b.imparaVoce !== undefined) {
      out.imparaVoce = { attivo: !!(b.imparaVoce || {}).attivo };
    }
    if (b.paroleVietate !== undefined) {
      if (!Array.isArray(b.paroleVietate)) return res.status(400).json({ errore: 'paroleVietate deve essere una lista' });
      out.paroleVietate = b.paroleVietate
        .map((p) => String(p).trim().toLowerCase().slice(0, 100))
        .filter(Boolean)
        .slice(0, 100);
    }
    // anima: adatta la personalità al canale (autonomo) + proattività
    if (b.adattaCanale !== undefined) out.adattaCanale = !!b.adattaCanale;
    if (b.proattivo !== undefined) out.proattivo = !!b.proattivo;
    // proattività su Telegram: lei ti scrive per prima in privato (curiosa)
    if (b.proattivoTg !== undefined) out.proattivoTg = !!b.proattivoTg;
    // accesso a internet: può cercare online quando ha un dubbio
    if (b.internet !== undefined) out.internet = !!b.internet;
    // IA locale: risposte più naturali auto-addestrate (default accesa)
    if (b.iaLocale !== undefined) out.iaLocale = !!b.iaLocale;
    // notifica live TikTok (rilevamento best-effort + annuncio)
    if (b.tiktok !== undefined) {
      const tk = b.tiktok || {};
      const username = tiktok.pulisciUsername(tk.username).slice(0, 40);
      out.tiktok = {
        username,
        attivo: !!tk.attivo && !!username,
        annunciaChat: !!tk.annunciaChat,
        messaggio: String(tk.messaggio || '').slice(0, 800),   // testo Telegram personalizzato
      };
    }
    // avviso NUOVO VIDEO su YouTube (RSS gratis, oppure la TUA chiave API Data v3)
    if (b.youtube !== undefined) {
      const y = b.youtube || {};
      const canale = String(y.canale || '').trim().slice(0, 120);
      // apiKey (facoltativa): vuoto = mantieni quella salvata; apiKeyClear = rimuovi
      const apiKeyVecchia = s.settings?.youtube?.apiKey || '';
      const apiKey = y.apiKeyClear ? '' : (String(y.apiKey || '').trim() || apiKeyVecchia);
      out.youtube = {
        canale, apiKey,
        attivo: !!y.attivo && !!canale,
        annunciaChat: !!y.annunciaChat,
        messaggio: String(y.messaggio || '').slice(0, 800),
      };
    }
    // avviso NUOVO POST su Instagram (serve la TUA API: Graph API business)
    if (b.instagram !== undefined) {
      const g = b.instagram || {};
      const userId = String(g.userId || '').trim().replace(/[^0-9]/g, '').slice(0, 40);
      const tokenVecchio = s.settings?.instagram?.token || '';
      const token = g.tokenClear ? '' : (String(g.token || '').trim() || tokenVecchio);
      out.instagram = {
        userId, token,
        attivo: !!g.attivo && !!userId && !!token,
        annunciaChat: !!g.annunciaChat,
        messaggio: String(g.messaggio || '').slice(0, 800),
      };
    }
    // ponte "giochi del sito": dalla dashboard si può SOLO accendere/spegnere;
    // endpoint e segreto arrivano dal sito (redeem del pass), non dal client.
    if (b.giochiSito !== undefined) {
      const cur = s.settings?.giochiSito || {};
      out.giochiSito = { endpoint: cur.endpoint || '', secret: cur.secret || '', attivo: !!(b.giochiSito && b.giochiSito.attivo) };
    }
    // giochi + promo social automatica
    if (b.giochi !== undefined) out.giochi = !!b.giochi;
    if (b.promoSocial !== undefined) out.promoSocial = !!b.promoSocial;
    // manche automatiche: il bot lancia giochi a caso a intervalli casuali
    if (b.manche !== undefined) {
      const m = b.manche || {};
      const cm = (v, def, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
      const minMin = cm(m.minMin, 15, 1, 360);
      out.manche = { attivo: !!m.attivo, minMin, maxMin: Math.max(minMin, cm(m.maxMin, 45, 1, 360)), soloLive: !!m.soloLive };
    }
    if (b.nomeMonete !== undefined) out.nomeMonete = String(b.nomeMonete).trim().slice(0, 20);
    // personalizzazione punti/classifica: quanti punti per messaggio, premi dei
    // giochi, quanti in classifica. Valori limitati a range sensati.
    if (b.punti !== undefined) {
      const p = b.punti || {};
      const c = (v, def, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
      out.punti = {
        perMessaggio: c(p.perMessaggio, 2, 0, 1000),
        ogniSecondi:  c(p.ogniSecondi, 60, 5, 3600),
        trivia:       c(p.trivia, 25, 0, 100000),
        duello:       c(p.duello, 15, 0, 100000),
        slotCosto:    c(p.slotCosto, 10, 0, 100000),
        slotVinci:    c(p.slotVinci, 200, 0, 1000000),
        slotCoppia:   c(p.slotCoppia, 20, 0, 100000),
        topN:         c(p.topN, 5, 3, 10),
      };
    }
    // richieste musicali (!sr): modo di pagamento/permesso + costo + premio
    if (b.musica !== undefined) {
      const m = b.musica || {};
      const modo = ['libero', 'sub', 'monete', 'bit', 'punti'].includes(m.modo) ? m.modo : 'libero';
      out.musica = {
        modo,
        costo: Math.max(0, Math.min(1000000, Math.round(Number(m.costo)) || 0)),
        premio: String(m.premio || '').trim().slice(0, 60),
        disambigua: m.disambigua !== false,
      };
    }
    // antispam: elimina spam/link e timeout ai recidivi
    if (b.antispam !== undefined) {
      const a = b.antispam || {};
      out.antispam = {
        attivo: !!a.attivo,
        link: a.link !== false,
        linkTier: ['tutti', 'sub', 'vip', 'mod'].includes(a.linkTier) ? a.linkTier : 'sub',
        whitelist: Array.isArray(a.whitelist)
          ? a.whitelist.map((d) => String(d).trim().toLowerCase().slice(0, 100)).filter(Boolean).slice(0, 30)
          : [],
        ripetizioni: a.ripetizioni !== false,
        maiuscole: a.maiuscole !== false,
        menzioni: a.menzioni !== false,
        flood: a.flood !== false,
        timeoutRecidivi: a.timeoutRecidivi !== false,
        avvisa: a.avvisa !== false,
      };
    }
    // premio VIP periodico (top monete)
    if (b.premioVip !== undefined) {
      const p = b.premioVip || {};
      out.premioVip = {
        attivo: !!p.attivo,
        periodo: ['settimana', 'mese'].includes(p.periodo) ? p.periodo : 'settimana',
        quanti: Math.min(5, Math.max(1, Math.round(Number(p.quanti)) || 1)),
      };
    }

    // gating per funzioni effettive: ciò che non è incluso nel piano base + add-on
    // resta spento (i membri community hanno tutto attivo, quindi mai limitati).
    const F = funzioniDi(user.login);
    const A = (k) => abbonamenti.abilitata(F, k);
    if (!A('giochi')) { out.giochi = false; if (out.manche) out.manche.attivo = false; if (out.premioVip) out.premioVip.attivo = false; }
    if (!A('clipAuto')) out.clipAuto = false;
    if (!A('voce')) { out.ascoltoLive = false; if (out.cambioCategoria) out.cambioCategoria.attivo = false; if (out.cambioTitolo) out.cambioTitolo.attivo = false; if (out.imparaVoce) out.imparaVoce.attivo = false; }
    if (!A('notifiche') && out.tiktok) out.tiktok.attivo = false;
    if (!A('notifiche') && out.youtube) out.youtube.attivo = false;
    if (!A('notifiche') && out.instagram) out.instagram.attivo = false;
    // se cambi canale/account, riparto pulito (niente avviso del contenuto già presente)
    if (out.youtube && out.youtube.canale !== (s.settings?.youtube?.canale || '')) {
      try { tgConf.setYtUltimo(user.login, ''); } catch { /* niente */ }
    }
    if (out.instagram && out.instagram.userId !== (s.settings?.instagram?.userId || '')) {
      try { tgConf.setIgUltimo(user.login, ''); } catch { /* niente */ }
    }

    streamers.setSettings(user.login, out);
    // OVERLAY IN TEMPO REALE: se è cambiato qualcosa che l'overlay mostra
    // (CSS, widget, chat, alert, temi, stato), spingiamo SUBITO il nuovo tema
    // via SSE così la fonte OBS si aggiorna da sola, senza bisogno di refresh.
    if (['overlayCss', 'overlayWidget', 'chatOverlay', 'alerts', 'overlayTemplates', 'overlayStato', 'overlays'].some((k) => k in out)) {
      // segnale di RICARICA: ogni overlay ricarica il PROPRIO tema (per ?o=id),
      // così più overlay diversi si aggiornano ciascuno col suo layout.
      try { effects.emit(user.login, { tipo: 'tema' }); }
      catch (e) { log.debug('push tema live:', e?.message || e); }
    }
    // se è cambiata la modalità di attivazione, riconcilia subito i canali
    if (b.modalita !== undefined) sync();
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

  // stato della "piccola rete che impara" per questo canale (cruscotto Panoramica)
  app.get('/api/streamer/rete', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const r = await brainpy.reteStato(login).catch(() => null) || { nodi: 0, solidi: 0, curiosita: 0, fiducia: 0, lacune: 0, non_so: [] };
    r.pensiero = manager.brain?.pensiero?.(login)?.testo || null;   // "a cosa sto pensando" (dal diario)
    // corpus = la "mente" che si è costruita da sé (conoscenza distillata + studiata dal web)
    r.corpus = knowledge.list(login).filter((k) => k.fonte === 'distillato' || k.fonte === 'web').length;
    res.json(r);
  }));

  // FORGIA: le dice di lavorare ORA sulla sua mente (studia le lacune dal web +
  // distilla altro materiale nella rete). Torna subito; il lavoro va in background.
  app.post('/api/streamer/forgia', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    manager.brain?.forgia?.(login).catch(() => {});
    res.json({ ok: true });
  }));

  // CORPUS: scarica il DATASET della sua mente (JSONL istruzione→risposta), il
  // materiale con cui — su una macchina capace — si potrebbe forgiare un vero
  // modello fine-tunato tutto suo. Unisce la rete (motore veloce) e la conoscenza
  // distillata/studiata dal web.
  app.get('/api/streamer/corpus', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const coppie = await brainpy.reteCorpus(login).catch(() => []);
    const daRete = coppie.map((c) => ({ q: c.q, a: c.a }));
    const daConoscenza = knowledge.list(login)
      .filter((k) => k.fonte === 'distillato' || k.fonte === 'web' || k.fonte === 'manuale')
      .map((k) => ({ q: k.domanda, a: k.risposta }));
    // dedup su domanda normalizzata
    const visti = new Set();
    const righe = [];
    for (const p of [...daRete, ...daConoscenza]) {
      const q = String(p.q || '').trim();
      const a = String(p.a || '').trim();
      if (q.length < 2 || a.length < 1) continue;
      const key = q.toLowerCase();
      if (visti.has(key)) continue;
      visti.add(key);
      righe.push(JSON.stringify({ instruction: q, output: a }));
    }
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mente-${login}.jsonl"`);
    res.send(righe.join('\n') + (righe.length ? '\n' : ''));
  }));

  // LINEE GUIDA (le regole che dai a "lia"): le rispetta sempre, in ogni modo
  app.get('/api/streamer/guide', requireLogin, wrap(async (req, res) => {
    res.json({ guide: guide.list(currentUser(req).login) });
  }));
  app.post('/api/streamer/guide', requireLogin, wrap(async (req, res) => {
    const testo = String(req.body?.testo || '').trim();
    if (testo.length < 3) return res.status(400).json({ errore: 'scrivi una regola più chiara' });
    const b = req.body || {};
    // ambito esplicito dai menu, sennò dedotto dal testo
    const ambito = (b.dove || b.con_chi) ? { dove: b.dove, con_chi: b.con_chi } : guide.interpreta(testo);
    guide.add(currentUser(req).login, testo, ambito);
    res.json({ ok: true, guide: guide.list(currentUser(req).login) });
  }));
  app.delete('/api/streamer/guide/:id', requireLogin, wrap(async (req, res) => {
    guide.remove(currentUser(req).login, req.params.id);
    res.json({ ok: true, guide: guide.list(currentUser(req).login) });
  }));

  // ------------------------------------------------------------ API effetti & suoni

  // elenco effetti + URL dell'overlay OBS (con la chiave del canale)
  app.get('/api/streamer/effetti', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const effetti = effectsDb.list(login).map((e) => ({
      id: e.id, comando: e.comando, tipo: e.tipo, tier: e.tier,
      cooldown: e.cooldown, volume: e.volume, durata: e.durata, attivo: !!e.attivo,
      // posizione/dimensione/rotazione a schermo (gestita dall'Overlay Studio)
      xy: (e.posx != null && e.posy != null) ? { x: e.posx, y: e.posy, s: e.scala != null ? e.scala : 100, r: e.rot || 0 } : null,
      // libreria condivisa
      pubblico: !!e.pubblico, nome: e.nome || '', combo: !!e.suono_file,
    }));
    res.json({ effetti, overlayUrl: effects.overlayUrl(login) });
  }));

  // solo il link dell'overlay per OBS (lo usa l'Overlay Studio, senza scaricare
  // tutta la lista effetti).
  app.get('/api/streamer/overlay-url', requireLogin, wrap(async (req, res) => {
    res.json({ overlayUrl: effects.overlayUrl(currentUser(req).login) });
  }));

  // ---- REGIA: gestisci la diretta dal bot (senza aprire OBS per queste cose) ----
  // Stato diretta (live/spettatori/uptime) + info canale (titolo/categoria/tag) +
  // quali permessi la regia ha a disposizione + programmazione pubblicità.
  app.get('/api/streamer/regia', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const s = streamers.get(login);
    const permessi = { broadcast: canaleOk(login), raid: raidOk(login), commercial: commercialOk(login), ads: adsOk(login) };
    let live = { online: false };
    let canale = { title: '', gameId: '', gameName: '', tags: [], language: '' };
    let ads = null;
    try {
      const st = await helix.getStream(login);
      if (st) live = { online: true, title: st.title, gameName: st.game_name, viewers: st.viewer_count, startedAt: st.started_at };
    } catch { /* offline o errore: resta online:false */ }
    try {
      const ci = s?.user_id ? await helix.getChannelInfo(s.user_id) : null;
      if (ci) canale = { title: ci.title || '', gameId: ci.game_id || '', gameName: ci.game_name || '', tags: ci.tags || [], language: ci.broadcaster_language || '' };
    } catch { /* niente */ }
    if (permessi.ads) { try { ads = await helix.getAdSchedule(login); } catch { /* niente */ } }
    res.json({ permessi, live, canale, ads });
  }));

  // ricerca categorie/giochi (per il selettore della regia)
  app.get('/api/streamer/regia/giochi', requireLogin, wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ giochi: [] });
    const giochi = await helix.searchCategories(q).catch(() => []);
    res.json({ giochi });
  }));

  // aggiorna titolo / categoria / tag / lingua del canale
  app.post('/api/streamer/regia/canale', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!canaleOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "gestione canale" da /auth/permessi', permesso: true });
    const b = req.body || {};
    const patch = {};
    if (typeof b.titolo === 'string') patch.title = b.titolo;
    if (b.giocoId) patch.gameId = String(b.giocoId);
    else if (typeof b.giocoNome === 'string' && b.giocoNome.trim()) {
      const r = await helix.searchCategories(b.giocoNome.trim()).catch(() => []);
      if (r[0]) patch.gameId = r[0].id;
    }
    if (Array.isArray(b.tags)) patch.tags = b.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
    if (b.lingua) patch.language = String(b.lingua);
    if (!Object.keys(patch).length) return res.status(400).json({ errore: 'niente da aggiornare' });
    try {
      await helix.setChannelInfo(login, patch);
      res.json({ ok: true });
    } catch (e) {
      if (e.status === 401 || e.status === 403) return res.status(403).json({ errore: 'permesso mancante (ri-concedi i permessi)', permesso: true });
      res.status(400).json({ errore: e?.message || 'aggiornamento non riuscito' });
    }
  }));

  // crea una clip del momento (serve essere in diretta)
  app.post('/api/streamer/regia/clip', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const clip = await helix.createClip(login);
    if (!clip) return res.status(400).json({ errore: 'Nessuna clip: devi essere in diretta.' });
    res.json({ ok: true, url: clip.url, editUrl: clip.editUrl });
  }));

  // marker nel VOD
  app.post('/api/streamer/regia/marker', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!canaleOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "gestione canale" da /auth/permessi', permesso: true });
    const r = await helix.createStreamMarker(login, String(req.body?.descrizione || ''));
    if (!r.ok) return res.status(400).json({ errore: r.motivo || 'non riuscito' });
    res.json({ ok: true, position: r.position });
  }));

  // pubblicità (ad-break)
  app.post('/api/streamer/regia/pubblicita', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!commercialOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "pubblicità" da /auth/permessi', permesso: true });
    const r = await helix.startCommercial(login, req.body?.durata);
    if (!r.ok) return res.status(400).json({ errore: r.motivo || 'non riuscito' });
    res.json({ ok: true, length: r.length });
  }));

  // raid verso un altro canale
  app.post('/api/streamer/regia/raid', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!raidOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "raid" da /auth/permessi', permesso: true });
    const target = String(req.body?.canale || '').trim().replace(/^@/, '').toLowerCase();
    if (!target) return res.status(400).json({ errore: 'scrivi il canale da raidare' });
    const r = await helix.startRaid(login, target);
    if (!r.ok) return res.status(400).json({ errore: r.motivo || 'non riuscito' });
    res.json({ ok: true, target: r.target });
  }));

  // annulla la raid in preparazione
  app.post('/api/streamer/regia/raid/annulla', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!raidOk(login)) return res.status(403).json({ errore: 'permesso mancante', permesso: true });
    const r = await helix.cancelRaid(login);
    res.json({ ok: !!r.ok });
  }));

  // ---- STUDIO WEB: vai live dal browser, senza OBS (canvas → ffmpeg → RTMP) ----
  app.get('/api/studio', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    res.json({ keyOk: studioKeyOk(login), ...studio.stato(login) });
  }));

  // avvia la diretta: prende la stream key (che resta sul server) e apre ffmpeg
  app.post('/api/studio/start', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (streamers.get(login)?.status !== 'approved') return res.status(403).json({ errore: 'non sei ancora abilitato' });
    if (!studioKeyOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "stream key" da /auth/permessi', permesso: true });
    if (studio.attiva(login)) return res.status(409).json({ errore: 'sei già in diretta dallo studio' });
    const key = await helix.getStreamKey(login).catch(() => null);
    if (!key) return res.status(400).json({ errore: 'stream key non disponibile (ri-concedi i permessi)', permesso: true });
    const r = studio.start(login, key);
    if (!r.ok) return res.status(400).json({ errore: r.motivo || 'avvio non riuscito' });
    res.json({ ok: true });
  }));

  // riceve i pezzi di media (Buffer) dal browser: raw body, un ffmpeg per streamer.
  // express.raw con type:()=>true → qualsiasi content-type finisce in req.body come Buffer.
  app.post('/api/studio/chunk', requireLogin, express.raw({ type: () => true, limit: '30mb' }), (req, res) => {
    const login = currentUser(req).login;
    if (!studio.attiva(login)) return res.status(409).json({ errore: 'nessuna diretta in corso' });
    if (Buffer.isBuffer(req.body)) studio.write(login, req.body);
    res.json({ ok: true });
  });

  // ferma la diretta dallo studio
  app.post('/api/studio/stop', requireLogin, wrap(async (req, res) => {
    studio.stop(currentUser(req).login);
    res.json({ ok: true });
  }));

  // elenco dei PIÙ OVERLAY dello streamer: per ognuno id, nome, layout e il suo
  // link OBS (con ?o=id). Lo usa l'Overlay Studio per gestirli.
  app.get('/api/streamer/overlays', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const base = effects.overlayUrl(login);
    const sep = base.includes('?') ? '&' : '?';
    const root = config.baseUrl.replace(/\/$/, '');
    const overlays = overlaysDi(streamers.get(login)?.settings).map((o) => ({
      id: o.id, nome: o.nome, mostra: o.mostra || _mostraDefault(), xy: o.xy || {}, css: o.css || '',
      // link "bello" per OBS (senza ?key) + link privato con chiave, come alternativa
      url: `${root}/o/${encodeURIComponent(login)}/${slugify(o.nome)}`,
      urlKey: `${base}${sep}o=${encodeURIComponent(o.id)}`,
    }));
    res.json({ overlays });
  }));

  // Elenco COMPLETO dei font Google (per la ricerca nel menu font). Preso una
  // volta da fonts.google.com (host fisso, niente SSRF) e cache-ato 24h.
  let _gfontLista = null, _gfontTs = 0;
  app.get('/api/streamer/google-fonts', requireLogin, wrap(async (req, res) => {
    if (_gfontLista && Date.now() - _gfontTs < 86_400_000) return res.json({ fonts: _gfontLista });
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch('https://fonts.google.com/metadata/fonts', { headers: { Accept: 'application/json', 'User-Agent': 'SocialBot/1.0' }, signal: ctrl.signal }).finally(() => clearTimeout(t));
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) throw new Error('troppo grande');
      const j = JSON.parse(buf.toString('utf8').replace(/^[^[{]+/, ''));   // toglie il prefisso XSSI
      const lista = (j.familyMetadataList || []).map((f) => f.family).filter(Boolean).slice(0, 3000);
      if (lista.length) { _gfontLista = lista; _gfontTs = Date.now(); }
    } catch (e) { log.debug('google-fonts:', e?.message || e); }
    res.json({ fonts: _gfontLista || [] });
  }));

  // posizione/dimensione/rotazione di un effetto a schermo (dall'Overlay Studio).
  // Body: { comando, xy: {x,y,s,r} | null }. null = rimetti l'effetto al centro.
  app.post('/api/streamer/effetti/posizione', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Gli effetti')) return;
    const login = currentUser(req).login;
    const comando = normComando(req.body?.comando || '');
    if (!comando) return res.status(400).json({ errore: 'comando non valido' });
    const xy = req.body?.xy == null ? null : xyOk(req.body.xy);
    if (!effectsDb.setPos(login, comando, xy)) return res.status(404).json({ errore: 'effetto non trovato' });
    res.json({ ok: true });
  }));

  // caricamento di un nuovo effetto (multipart): file + comando/tier/cooldown/volume/durata.
  // Il file viene super-compresso con ffmpeg prima di essere salvato.
  app.post('/api/streamer/effetti', requireLogin, (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Gli effetti e i premi a punti canale')) return;
    // fino a 2 file: il media principale + un eventuale suono abbinato (COMBO).
    uploadEff.fields([{ name: 'file', maxCount: 1 }, { name: 'suono', maxCount: 1 }])(req, res, (err) => {
      const puliziaTutto = async () => { for (const f of _fileList(req)) await pulisciTemp(f.path); };
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'file troppo grande (max 30MB)' : 'caricamento non riuscito';
        return puliziaTutto().then(() => res.status(400).json({ errore: msg }));
      }
      salvaEffetto(req, res).catch(async (e) => {
        log.error('POST /api/streamer/effetti →', e?.message || e);
        await puliziaTutto();
        if (!res.headersSent) res.status(500).json({ errore: e?.message || 'errore interno' });
      });
    });
  });

  // tutti i file temporanei di una richiesta multipart (single o fields)
  const _fileList = (req) => (req.file ? [req.file] : []).concat(Object.values(req.files || {}).flat());

  // logica di salvataggio (separata perché parte dopo il parsing multipart di multer)
  async function salvaEffetto(req, res) {
    const login = currentUser(req).login;
    const fileMedia = req.files?.file?.[0];
    const fileSuono = req.files?.suono?.[0];
    const puliziaTutto = async () => { for (const f of _fileList(req)) await pulisciTemp(f.path); };

    if (streamers.get(login)?.status !== 'approved') {
      await puliziaTutto();
      return res.status(403).json({ errore: 'non sei ancora abilitato' });
    }
    if (!fileMedia) { await puliziaTutto(); return res.status(400).json({ errore: 'nessun file caricato' }); }

    const comando = normComando(req.body?.comando || '');
    const tier = String(req.body?.tier || 'tutti');
    const cooldown = Math.round(Number(req.body?.cooldown));
    const volume = Math.round(Number(req.body?.volume));
    const durata = Math.round(Number(req.body?.durata));
    const pubblico = /^(1|true|on|si|sì)$/i.test(String(req.body?.pubblico || ''));
    const nomePubblico = String(req.body?.nome || '').slice(0, 60).trim();

    // validazione: se qualcosa non va, si puliscono i temp e si risponde 400
    const errore = async (msg) => { await puliziaTutto(); return res.status(400).json({ errore: msg }); };
    if (!comando) return errore('comando non valido: usa lettere, numeri o "_"');
    if (!TIER_VALIDI.includes(tier)) return errore('permesso (chi può usarlo) non valido');
    if (!Number.isFinite(cooldown) || cooldown < 0 || cooldown > 3600) return errore('cooldown non valido (0..3600 s)');
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) return errore('volume non valido (0..100)');
    if (!Number.isFinite(durata) || durata < 500 || durata > 30000) return errore('durata non valida (500..30000 ms)');

    const destDir = join(effectsRoot, login);
    mkdirSync(destDir, { recursive: true });

    // effetto precedente con lo stesso comando (per pulire i vecchi file su sostituzione)
    const esistente = effectsDb.get(login, comando);

    // compressione del media principale: comprimi() cancella comunque il temp
    let esito;
    try {
      esito = await comprimi(fileMedia.path, fileMedia.mimetype, destDir, `${Date.now()}_${comando}`);
    } catch (e) {
      await pulisciTemp(fileSuono?.path);
      return res.status(400).json({ errore: e?.message || 'compressione fallita' });
    }

    // COMBO: suono abbinato — solo se il media è immagine/video e il file è audio.
    let esitoSuono = null;
    if (fileSuono) {
      if (esito.tipo !== 'immagine' && esito.tipo !== 'video') {
        await pulisciTemp(join(destDir, esito.file)); await pulisciTemp(fileSuono.path);
        return res.status(400).json({ errore: 'il suono abbinato si può mettere solo su immagini o video' });
      }
      try {
        esitoSuono = await comprimi(fileSuono.path, fileSuono.mimetype, destDir, `${Date.now()}_${comando}_snd`);
      } catch (e) {
        await pulisciTemp(join(destDir, esito.file));
        return res.status(400).json({ errore: e?.message || 'compressione suono fallita' });
      }
      if (esitoSuono.tipo !== 'audio') {
        await pulisciTemp(join(destDir, esito.file)); await pulisciTemp(join(destDir, esitoSuono.file));
        return res.status(400).json({ errore: 'il file da abbinare deve essere un AUDIO' });
      }
    }

    // durata a schermo: per le immagini vale la scelta dello streamer,
    // per audio/video usiamo la durata reale del media (già limitata).
    const durataFinale = esito.tipo === 'immagine' ? durata : esito.durata;

    try {
      effectsDb.add(login, { comando, tipo: esito.tipo, file: esito.file, tier, cooldown, volume, durata: durataFinale });
    } catch (e) {
      await pulisciTemp(join(destDir, esito.file));
      if (esitoSuono) await pulisciTemp(join(destDir, esitoSuono.file));
      return res.status(400).json({ errore: e?.message || 'salvataggio non riuscito' });
    }

    const eff = effectsDb.get(login, comando);   // riprende la riga (con id) appena salvata
    // COMBO: aggancia il nuovo suono (o lascia il precedente se non ne è arrivato uno nuovo)
    if (esitoSuono && eff) {
      effectsDb.attachSuono(login, eff.id, esitoSuono.file);
      if (esistente?.suono_file && esistente.suono_file !== esitoSuono.file) await pulisciTemp(join(destDir, esistente.suono_file));
    }
    // pubblicazione nella libreria condivisa (attribuzione: chi carica)
    if (eff) effectsDb.setPubblico(login, eff.id, { pubblico, nome: nomePubblico || comando, autore: login });

    // pulizia dei vecchi file su sostituzione
    if (esistente?.file && esistente.file !== esito.file) await pulisciTemp(join(destDir, esistente.file));

    res.json({ ok: true, pubblico, combo: !!esitoSuono });
  }

  // eliminazione di un effetto (+ del suo file dal disco)
  app.delete('/api/streamer/effetti/:id', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    const rimosso = effectsDb.remove(login, id);
    if (rimosso?.file) await pulisciTemp(join(effectsRoot, login, rimosso.file));
    if (rimosso?.suonoFile) await pulisciTemp(join(effectsRoot, login, rimosso.suonoFile));   // audio della combo
    res.json({ ok: true });
  }));

  // ---- Libreria CONDIVISA di effetti (gif/video/foto/audio + combo) ----
  // Ogni effetto può essere reso pubblico e importato dagli altri streamer.
  // Rende pubblico/privato un MIO effetto (+ titolo mostrato nella libreria).
  app.patch('/api/streamer/effetti/:id/pubblico', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'La libreria condivisa')) return;
    const login = currentUser(req).login;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ errore: 'id non valido' });
    const eff = effectsDb.byId(login, id);
    if (!eff) return res.status(404).json({ errore: 'effetto non trovato' });
    const pubblico = req.body?.pubblico === true || /^(1|true|on)$/i.test(String(req.body?.pubblico ?? ''));
    const nome = String(req.body?.nome || eff.nome || eff.comando).slice(0, 60);
    effectsDb.setPubblico(login, id, { pubblico, nome, autore: login });
    res.json({ ok: true, pubblico });
  }));

  // Elenca la libreria condivisa (pubblici, di default esclusi i miei). Filtri:
  // tipo (audio|immagine|video), q (ricerca), miei=1 per includere anche i miei.
  app.get('/api/streamer/libreria', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'La libreria condivisa')) return;
    const login = currentUser(req).login;
    const tipo = String(req.query.tipo || '');
    const q = String(req.query.q || '');
    const includiMiei = /^(1|true)$/i.test(String(req.query.miei || ''));
    const items = effectsDb.sharedList({ tipo, q, escludi: includiMiei ? null : login }).map((e) => ({
      id: e.id, nome: e.nome || e.comando, tipo: e.tipo,
      autore: e.autore || e.channel, combo: !!e.suono_file, usi: e.usi || 0,
      mio: e.channel === login,
      url: `/api/streamer/libreria/media/${e.id}`,
      suonoUrl: e.suono_file ? `/api/streamer/libreria/media/${e.id}/audio` : null,
    }));
    res.json({ items });
  }));

  // Serve il media di un effetto PUBBLICO (anteprima nella libreria). Sicuro:
  // solo se pubblico, e usa il nome file salvato nel DB (niente path dall'utente).
  const serviLibreria = (colonna) => (req, res) => {
    const id = parseInt(req.params.id, 10);
    const eff = Number.isFinite(id) ? effectsDb.pubblicoById(id) : null;
    const file = eff ? eff[colonna] : '';
    if (!eff || !file || !/^[A-Za-z0-9._-]+$/.test(file)) return notFound(res);
    res.sendFile(join(effectsRoot, eff.channel, file), { maxAge: '300s' }, (err) => { if (err && !res.headersSent) notFound(res); });
  };
  app.get('/api/streamer/libreria/media/:id', requireLogin, serviLibreria('file'));
  app.get('/api/streamer/libreria/media/:id/audio', requireLogin, serviLibreria('suono_file'));

  // Importa un effetto pubblico nella PROPRIA libreria (copia i file). Resta
  // privato di default; l'attribuzione all'autore originale viene conservata.
  app.post('/api/streamer/libreria/importa', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'La libreria condivisa')) return;
    const login = currentUser(req).login;
    if (streamers.get(login)?.status !== 'approved') return res.status(403).json({ errore: 'non sei ancora abilitato' });
    const id = parseInt(req.body?.id, 10);
    const src = Number.isFinite(id) ? effectsDb.pubblicoById(id) : null;
    if (!src) return res.status(404).json({ errore: 'effetto non trovato o non più pubblico' });
    if (src.channel === login) return res.status(400).json({ errore: 'questo effetto è già tuo' });

    const srcDir = join(effectsRoot, src.channel);
    const destDir = join(effectsRoot, login);
    mkdirSync(destDir, { recursive: true });
    if (!existsSync(join(srcDir, src.file))) return res.status(404).json({ errore: 'file di origine non trovato' });

    // comando univoco nel MIO canale, derivato dal nome/comando di origine
    const base = normComando(src.nome || src.comando) || 'effetto';
    let comando = base, n = 2;
    while (effectsDb.get(login, comando)) { comando = normComando(base + '_' + n) || (base + n); n++; if (n > 99) break; }

    const estens = (f) => { const i = String(f).lastIndexOf('.'); return i >= 0 ? String(f).slice(i) : ''; };
    const nuovoFile = `${Date.now()}_${comando}${estens(src.file)}`;
    copyFileSync(join(srcDir, src.file), join(destDir, nuovoFile));
    let nuovoSuono = '';
    if (src.suono_file && existsSync(join(srcDir, src.suono_file))) {
      nuovoSuono = `${Date.now()}_${comando}_snd${estens(src.suono_file)}`;
      copyFileSync(join(srcDir, src.suono_file), join(destDir, nuovoSuono));
    }

    try {
      effectsDb.add(login, { comando, tipo: src.tipo, file: nuovoFile, tier: 'tutti', cooldown: 0, volume: src.volume, durata: src.durata });
    } catch (e) {
      await pulisciTemp(join(destDir, nuovoFile));
      if (nuovoSuono) await pulisciTemp(join(destDir, nuovoSuono));
      return res.status(400).json({ errore: e?.message || 'importazione non riuscita' });
    }
    const eff = effectsDb.get(login, comando);
    if (eff && nuovoSuono) effectsDb.attachSuono(login, eff.id, nuovoSuono);
    // resta PRIVATO; conserva l'autore originale per l'attribuzione
    if (eff) effectsDb.setPubblico(login, eff.id, { pubblico: false, nome: src.nome || comando, autore: src.autore || src.channel });
    effectsDb.incUsi(src.id);
    res.json({ ok: true, comando });
  }));

  // "prova": manda l'effetto all'overlay come farebbe il trigger in chat
  app.post('/api/streamer/effetti/test', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Gli effetti e i premi a punti canale')) return;
    const login = currentUser(req).login;
    const comando = normComando(req.body?.comando || '');
    const eff = comando ? effectsDb.get(login, comando) : null;
    if (!eff) return res.status(404).json({ errore: 'effetto non trovato' });
    effects.emit(login, effects.payload(login, eff));
    res.json({ ok: true });
  }));

  // ---- Media/suono CARICATI DIRETTAMENTE da un blocco alert ----
  // Massima libertà: dallo stesso alert lo streamer carica un'immagine, un video
  // o un suono SUO (senza passare dalla scheda Effetti) e viene assegnato subito
  // all'evento. Riusa la pipeline effetti (compressione/limiti/storage) ma con un
  // NOME DETERMINISTICO per (evento, slot): un nuovo caricamento SOSTITUISCE il
  // precedente, così non restano effetti orfani a ogni cambio. Suono e media sono
  // due slot indipendenti → possono partire INSIEME (es. GIF + suono).
  const ALERT_KINDS = ['follow', 'sub', 'cheer', 'raid'];
  app.post('/api/streamer/alerts/media', requireLogin, (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Gli alert personalizzati')) return;
    upload.single('file')(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'file troppo grande (max 30MB)' : 'caricamento non riuscito';
        return res.status(400).json({ errore: msg });
      }
      salvaAlertMedia(req, res).catch(async (e) => {
        log.error('POST /api/streamer/alerts/media →', e?.message || e);
        await pulisciTemp(req.file?.path);
        if (!res.headersSent) res.status(500).json({ errore: e?.message || 'errore interno' });
      });
    });
  });

  async function salvaAlertMedia(req, res) {
    const login = currentUser(req).login;
    if (streamers.get(login)?.status !== 'approved') {
      await pulisciTemp(req.file?.path);
      return res.status(403).json({ errore: 'non sei ancora abilitato' });
    }
    if (!req.file) return res.status(400).json({ errore: 'nessun file caricato' });

    const kind = String(req.body?.kind || '').toLowerCase();
    const slot = String(req.body?.slot || '').toLowerCase();   // 'suono' | 'media'
    const errore = async (msg) => { await pulisciTemp(req.file?.path); return res.status(400).json({ errore: msg }); };
    if (!ALERT_KINDS.includes(kind)) return errore('evento non valido');
    if (slot !== 'suono' && slot !== 'media') return errore('slot non valido');

    const destDir = join(effectsRoot, login);
    mkdirSync(destDir, { recursive: true });
    const comando = `alert_${kind}_${slot}`;   // deterministico → sostituisce il precedente

    let esito;
    try {
      esito = await comprimi(req.file.path, req.file.mimetype, destDir, `${Date.now()}_${comando}`);
    } catch (e) {
      return res.status(400).json({ errore: e?.message || 'compressione fallita' });
    }
    // coerenza slot ↔ tipo del file
    if (slot === 'suono' && esito.tipo !== 'audio') {
      await pulisciTemp(join(destDir, esito.file));
      return res.status(400).json({ errore: 'per il Suono serve un file AUDIO (mp3, wav, ogg…)' });
    }
    if (slot === 'media' && esito.tipo !== 'immagine' && esito.tipo !== 'video') {
      await pulisciTemp(join(destDir, esito.file));
      return res.status(400).json({ errore: "qui serve un'IMMAGINE o un VIDEO" });
    }

    let vecchioFile;
    try {
      vecchioFile = effectsDb.add(login, {
        comando, tipo: esito.tipo, file: esito.file,
        tier: 'mod', cooldown: 0, volume: 100,
        durata: esito.tipo === 'immagine' ? 5000 : esito.durata,
      });
    } catch (e) {
      await pulisciTemp(join(destDir, esito.file));
      return res.status(400).json({ errore: e?.message || 'salvataggio non riuscito' });
    }
    if (vecchioFile && vecchioFile !== esito.file) await pulisciTemp(join(destDir, vecchioFile));

    // assegna al blocco alert e persisti (merge sulle impostazioni correnti)
    const s = streamers.get(login);
    const settings = { ...(s?.settings || {}) };
    const alerts = { ...(settings.alerts || {}) };
    alerts[kind] = { ...(alerts[kind] || {}), [slot === 'suono' ? 'suono' : 'media']: `effetto:${comando}` };
    settings.alerts = alerts;
    streamers.setSettings(login, settings);

    res.json({ ok: true, ref: `effetto:${comando}`, comando, tipo: esito.tipo, url: effects.mediaUrl(login, esito.file) });
  }

  // ---- Alert a PUNTI CANALE (Twitch Custom Rewards) ----
  app.get('/api/streamer/premi', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const permessoOk = redemptionsOk(login);
    // "tutti" = i premi a punti canale già esistenti su Twitch, così lo streamer
    // può attaccare un suono a QUALSIASI riscatto, non solo a quelli creati qui.
    const tutti = permessoOk ? await helix.listaRewardsTutti(login).catch(() => []) : [];
    res.json({
      premi: pointAlerts.list(login),
      effetti: effectsDb.list(login).map((e) => ({ comando: e.comando, tipo: e.tipo })),
      tutti,
      permessoOk,
    });
  }));

  // Attacca (o toglie) un SUONO PRESET a un premio a punti canale GIÀ ESISTENTE.
  // Non crea nulla su Twitch: mappa e basta. Se suono e testo sono vuoti, rimuove
  // la mappatura. L'eventuale effetto caricato già associato viene preservato.
  app.post('/api/streamer/premi/suono', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Gli effetti e i premi a punti canale')) return;
    const login = currentUser(req).login;
    if (!redemptionsOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "punti canale" da /auth/permessi', permesso: true });
    const b = req.body || {};
    const rewardId = String(b.rewardId || '').trim();
    if (!rewardId) return res.status(400).json({ errore: 'premio mancante' });
    const testo = String(b.testo || '').trim().slice(0, 300);
    // scelta dell'effetto sul riscatto: un suono PRESET ("<id>") OPPURE un effetto
    // caricato ("effetto:<comando>" → audio/immagine/video dalla libreria).
    const scelta = String(b.scelta ?? b.suono ?? '');
    let suono = '', effetto = '';
    const mEff = /^effetto:([a-z0-9_]{1,30})$/i.exec(scelta);
    if (mEff) effetto = mEff[1].toLowerCase();
    else if (SUONI_PRESET.has(scelta)) suono = scelta;
    // opzioni: posizione a schermo + green screen (chroma-key), salvate in JSON
    const o = b.opzioni || {};
    const xy = xyOk(o.xy);
    const chroma = (o.chroma && o.chroma.attivo)
      ? { attivo: true, colore: hexOk(o.chroma.colore, '#00ff00'), soglia: clampInt(o.chroma.soglia, 20, 300, 140) }
      : null;
    const opzioni = (xy || chroma) ? JSON.stringify({ xy: xy || null, chroma }) : '';
    const esistente = pointAlerts.getByReward(login, rewardId) || {};
    if (!suono && !effetto && !testo) {
      pointAlerts.remove(login, rewardId);
    } else {
      pointAlerts.add(login, {
        rewardId,
        titolo: String(b.titolo || esistente.titolo || '').slice(0, 60),
        costo: Number(b.costo || esistente.costo || 0),
        effetto, suono, testo, opzioni,
      });
    }
    res.json({ ok: true, premi: pointAlerts.list(login) });
  }));

  app.post('/api/streamer/premi', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'effetti', 'Gli effetti e i premi a punti canale')) return;
    const login = currentUser(req).login;
    if (!redemptionsOk(login)) return res.status(403).json({ errore: 'Concedi il permesso "punti canale" da /auth/permessi', permesso: true });
    const b = req.body || {};
    const titolo = String(b.titolo || '').trim().slice(0, 45);
    const costo = Math.max(1, Math.round(Number(b.costo) || 100));
    const effetto = normComando(b.effetto || '');
    const testo = String(b.testo || '').trim().slice(0, 300);
    if (titolo.length < 2) return res.status(400).json({ errore: 'dai un nome al premio' });
    if (!effetto && !testo) return res.status(400).json({ errore: 'scegli un effetto o scrivi un messaggio' });
    let reward;
    try {
      reward = await helix.creaReward(login, { titolo, costo });
    } catch (e) {
      if (e.status === 403) return res.status(403).json({ errore: 'Permesso mancante: concedi "punti canale" da /auth/permessi', permesso: true });
      if (e.status === 400) return res.status(400).json({ errore: 'Twitch ha rifiutato il premio (nome già usato?)' });
      return res.status(502).json({ errore: 'Twitch non ha creato il premio' });
    }
    if (!reward?.id) return res.status(502).json({ errore: 'Twitch non ha creato il premio' });
    pointAlerts.add(login, { rewardId: reward.id, titolo: reward.title, costo: reward.cost, effetto, testo });
    res.json({ ok: true, premi: pointAlerts.list(login) });
  }));

  app.delete('/api/streamer/premi/:rewardId', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const rid = String(req.params.rewardId || '');
    try { await helix.eliminaReward(login, rid); } catch { /* forse già tolto su Twitch */ }
    pointAlerts.remove(login, rid);
    res.json({ ok: true, premi: pointAlerts.list(login) });
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
      if (a.tipo === 'categoria' && !String(a.gioco || '').trim()) {
        return 'l\'azione "cambia categoria" ha bisogno di un gioco (o una variabile come $args)';
      }
      if (a.tipo === 'titolo' && !String(a.testo || '').trim()) {
        return 'l\'azione "cambia titolo" ha bisogno di un testo (anche con variabili come $args)';
      }
      if (a.tipo === 'musica' && !String(a.brano || '').trim()) {
        return 'l\'azione "metti in coda" ha bisogno di un brano (o una variabile come $args)';
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
    // limite moduli del piano (solo sui NUOVI moduli; le modifiche passano sempre)
    if (!req.body?.id) {
      const maxMod = limiteTier(req, 'moduli');
      if (modulesDb.list(login).length >= maxMod) {
        return res.status(403).json({ errore: `Il tuo piano include fino a ${maxMod} comandi/moduli. Passa a un piano superiore per crearne altri.`, upgrade: true });
      }
    }
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

  // ------------------------------------------------------------ API COMANDI VOCALI
  // I "comandi vocali" sono un innesco dei Moduli (trigger.tipo='voce'). La
  // trascrizione la fa il BROWSER (public/voce.html, Web Speech API): il PC
  // dello streamer tiene aperta quella scheda (loggata, col cookie di sessione),
  // sente le parole chiave e chiama queste due rotte. Nessun audio arriva qui.

  // elenco delle frasi da ascoltare (dei moduli 'voce' attivi del canale)
  app.get('/api/streamer/voce', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const frasi = modules.frasiVoce(login);   // include i moduli abilitati a Telegram
    // comandi "cambia categoria / titolo a voce": il browser deve conoscere le parole chiave
    const st = streamers.get(login)?.settings || {};
    const cat = { attivo: !!st.cambioCategoria?.attivo, trigger: (st.cambioCategoria?.trigger || 'categoria') };
    const tit = { attivo: !!st.cambioTitolo?.attivo, trigger: (st.cambioTitolo?.trigger || 'titolo') };
    // "impara mentre parlo": attivo SOLO per il proprietario (mai da un mod → solo da me)
    const impara = { attivo: !!(st.imparaVoce?.attivo && isOwner(req)) };
    res.json({ frasi, count: frasi.length, cat, tit, impara });
  }));

  // il browser ha sentito una frase: eseguiamo i moduli 'voce' che combaciano
  app.post('/api/streamer/voce', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'voce', 'Il comando a voce')) return;
    const login = currentUser(req).login;
    const frase = String(req.body?.frase || '').trim();
    if (!frase || frase.length >= 300) {
      return res.status(400).json({ errore: 'frase non valida (vuota o troppo lunga)' });
    }
    // comando vocale VIP: "vip a chiara [per un mese]" · "togli vip a chiara"
    const cmdVip = vip.parseComandoVip(frase);
    if (cmdVip) {
      const say = (t) => manager.say(login, t);
      if (cmdVip.azione === 'remove') await vip.togliVip(helix, login, cmdVip.nome, say);
      else await vip.assegnaVip(helix, login, { nome: cmdVip.nome, durata: cmdVip.durata, motivo: 'voce' }, say);
      return res.json({ ok: true, eseguito: true, vip: true });
    }
    // comando vocale CATEGORIA: "<parola chiave> <nome gioco>" → cambia categoria Twitch.
    // Best-effort: se il riconoscimento è impreciso, il bot prova comunque a
    // risalire al gioco più somigliante tra le categorie di Twitch.
    const cc = streamers.get(login)?.settings?.cambioCategoria;
    if (cc?.attivo) {
      const q = categoria.parseComandoCategoria(frase, cc.trigger || 'categoria');
      if (q) {
        if (!canaleOk(login)) {
          return res.json({ ok: true, eseguito: false, categoria: { errore: 'permesso', riautorizza: true } });
        }
        const cat = await categoria.risolviCategoria(helix, q).catch(() => null);
        if (!cat) return res.json({ ok: true, eseguito: false, categoria: { query: q, trovato: false } });
        try {
          await helix.setChannelInfo(login, { gameId: cat.id });
          if (cc.annuncia !== false) manager.say(login, `🎮 Categoria aggiornata: ${cat.name}`);
          return res.json({ ok: true, eseguito: true, categoria: { nome: cat.name } });
        } catch (e) {
          const permesso = e?.status === 401 || e?.status === 403;
          return res.json({ ok: true, eseguito: false, categoria: { errore: permesso ? 'permesso' : 'errore', riautorizza: permesso } });
        }
      }
    }
    // comando vocale TITOLO: "<parola chiave> <testo libero>" → cambia il titolo dello stream.
    const ct = streamers.get(login)?.settings?.cambioTitolo;
    if (ct?.attivo) {
      const nuovo = categoria.estraiDopoTrigger(frase, ct.trigger || 'titolo');
      if (nuovo) {
        if (!canaleOk(login)) {
          return res.json({ ok: true, eseguito: false, titolo: { errore: 'permesso', riautorizza: true } });
        }
        const testo = nuovo.slice(0, 140);
        try {
          await helix.setChannelInfo(login, { title: testo });
          if (ct.annuncia !== false) manager.say(login, `📝 Titolo aggiornato: ${testo}`);
          return res.json({ ok: true, eseguito: true, titolo: { testo } });
        } catch (e) {
          const permesso = e?.status === 401 || e?.status === 403;
          return res.json({ ok: true, eseguito: false, titolo: { errore: permesso ? 'permesso' : 'errore', riautorizza: permesso } });
        }
      }
    }
    // penitenze a punti canale: il bot "sente" se lo streamer dice una parola/
    // lettera vietata da un riscatto e fa scattare la penitenza.
    try { manager.penitenze?.controllaVoce(login, frase); } catch { /* niente */ }
    // la stessa risposta va anche nel gruppo Telegram se il modulo è abilitato
    const c = tgConf.get(login);
    const inviaTg = (t) => { if (c?.token && c.chat_id && t) telegram.inviaMessaggio(c.token, c.chat_id, t).catch(() => {}); };
    const eseguito = await modules.eseguiVoce(login, frase, (t) => manager.say(login, t), inviaTg);
    res.json({ ok: true, eseguito });
  }));

  // "impara mentre parlo": il browser (voce.html) manda qui le frasi che lo
  // streamer DICE in diretta, così il cervello lo sente parlare e cresce. La
  // trascrizione avviene sul PC: qui arriva solo il testo. SOLO il proprietario
  // (mai un mod) può alimentarla → è la voce di 'me', di nessun altro account.
  app.post('/api/streamer/ascolta', requireLogin, wrap(async (req, res) => {
    if (!isOwner(req)) return res.status(403).json({ errore: 'solo il proprietario del canale' });
    const login = currentUser(req).login;
    if (!streamers.get(login)?.settings?.imparaVoce?.attivo) return res.json({ ok: false });
    const testo = String(req.body?.testo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (testo.length >= 12) manager.brain?.imparaDaVoce({ channel: login, testo });
    res.json({ ok: true });
  }));

  // citazioni (!cita) — elenco/aggiungi/rimuovi dalla dashboard
  app.get('/api/streamer/citazioni', requireLogin, wrap(async (req, res) => {
    res.json(quotes.list(currentUser(req).login).map((q) => ({ n: q.n, text: q.text, added_by: q.added_by, ts: q.ts })));
  }));
  app.post('/api/streamer/citazioni', requireLogin, wrap(async (req, res) => {
    const testo = String(req.body?.testo || '').trim();
    if (!testo) return res.status(400).json({ errore: 'testo mancante' });
    const n = quotes.add(currentUser(req).login, testo, currentUser(req).login);
    res.json({ ok: true, n });
  }));
  app.delete('/api/streamer/citazioni/:n', requireLogin, wrap(async (req, res) => {
    quotes.remove(currentUser(req).login, parseInt(req.params.n, 10) || 0);
    res.json({ ok: true });
  }));
  // import in blocco (dalla textarea: una citazione per riga)
  app.post('/api/streamer/citazioni/importa', requireLogin, wrap(async (req, res) => {
    // accetta oggetti {testo, autore, data} (import x.la con nome+data) o stringhe
    const elementi = Array.isArray(req.body?.citazioni) ? req.body.citazioni
      : Array.isArray(req.body?.testi) ? req.body.testi : [];
    if (!elementi.length) return res.status(400).json({ errore: 'niente da importare' });
    const esito = quotes.addMany(currentUser(req).login, elementi.slice(0, 1000), currentUser(req).login);
    res.json({ ok: true, ...esito });
  }));
  // analizza il testo incollato (formato x.la): estrae testo + autore + data
  app.post('/api/streamer/citazioni/analizza', requireLogin, wrap(async (req, res) => {
    const testo = String(req.body?.testo || '');
    const citazioni = quotesImport.estraiConMeta(testo);
    // se non troviamo nulla ma sembra il guscio senza-JS di x.la, spieghiamo perché
    const avviso = (!citazioni.length && quotesImport.sembraGuscioJs(testo))
      ? 'Questo è il guscio di x.la <em>senza JavaScript</em>: non contiene le frasi. Apri la tua pagina x.la nel browser, aspetta che le quote compaiano e usa il bottone <strong>«Prendi le quote da x.la»</strong> qui sopra (o selezionale a mano e incolla QUELLE).'
      : '';
    res.json({ ok: true, citazioni, avviso });
  }));
  // anteprima: estrae citazioni da un link (best-effort, non salva)
  app.post('/api/streamer/citazioni/da-url', requireLogin, wrap(async (req, res) => {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ errore: 'link mancante' });
    const r = await quotesImport.estrai(url);
    if (!r.ok) return res.status(400).json({ errore: r.errore });
    // pagine che disegnano tutto col JavaScript (tipo x.la): il fetch vede solo il guscio
    const avviso = r.guscio
      ? 'Quel link disegna le frasi <strong>con JavaScript</strong> (come x.la): dal server vedo solo il guscio vuoto. Usa il bottone <strong>«Prendi le quote da x.la»</strong> qui sopra.'
      : '';
    res.json({ ok: true, citazioni: r.citazioni, avviso });
  }));

  // classifica monete + VIP attuali (per la dashboard)
  app.get('/api/streamer/classifica', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    res.json({
      monete: points.top(login, 10),
      vip: vips.list(login).map((v) => ({ user: v.user, display: v.display, until: v.until, motivo: v.motivo })),
    });
  }));

  // ---------------------------------------------------------- GIOCHI personalizzati
  app.get('/api/streamer/giochi', requireLogin, wrap(async (req, res) => {
    res.json(giochiDb.list(currentUser(req).login));
  }));

  // crea/aggiorna un gioco personalizzato (trivia = domande, parola = elenco parole)
  app.post('/api/streamer/giochi', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'giochi', 'I giochi personalizzati')) return;
    const login = currentUser(req).login;
    const b = req.body || {};
    const tipo = ['trivia', 'parola'].includes(b.tipo) ? b.tipo : null;
    if (!tipo) return res.status(400).json({ errore: 'tipo di gioco non valido' });
    const nome = String(b.nome || '').trim().slice(0, 60);
    let config = {};
    if (tipo === 'trivia') {
      const domande = (Array.isArray(b.domande) ? b.domande : [])
        .map((d) => ({ q: String(d?.q || '').trim().slice(0, 200), a: (Array.isArray(d?.a) ? d.a : []).map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 10) }))
        .filter((d) => d.q && d.a.length).slice(0, 200);
      if (!domande.length) return res.status(400).json({ errore: 'aggiungi almeno una domanda con una risposta' });
      config = { domande };
    } else {
      const parole = (Array.isArray(b.parole) ? b.parole : [])
        .map((p) => String(p).trim().slice(0, 60)).filter(Boolean).slice(0, 300);
      if (!parole.length) return res.status(400).json({ errore: 'aggiungi almeno una parola' });
      config = { parole };
    }
    if (!b.id && giochiDb.count(login) >= 50) return res.status(400).json({ errore: 'hai raggiunto il massimo di giochi' });
    const id = giochiDb.save(login, { id: b.id ? parseInt(b.id, 10) : undefined, tipo, nome, config, attivo: b.attivo !== false });
    res.json({ ok: true, id });
  }));

  app.post('/api/streamer/giochi/:id/toggle', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const g = giochiDb.list(login).find((x) => x.id === parseInt(req.params.id, 10));
    if (!g) return res.status(404).json({ errore: 'gioco sconosciuto' });
    giochiDb.save(login, { id: g.id, tipo: g.tipo, nome: g.nome, config: g.config, attivo: !!req.body?.attivo });
    res.json({ ok: true });
  }));

  app.delete('/api/streamer/giochi/:id', requireLogin, wrap(async (req, res) => {
    giochiDb.remove(currentUser(req).login, parseInt(req.params.id, 10) || 0);
    res.json({ ok: true });
  }));

  // ---------------------------------------------------------- NOTIFICHE TELEGRAM
  // Lo streamer collega il PROPRIO bot (token di @BotFather) e il PROPRIO gruppo.

  // stato attuale (senza il token)
  app.get('/api/streamer/telegram', requireLogin, wrap(async (req, res) => {
    res.json(statoTelegram(currentUser(req).login));
  }));

  // salva il token: lo validiamo con getMe e memorizziamo lo @username del bot
  app.post('/api/streamer/telegram/token', requireLogin, wrap(async (req, res) => {
    if (!esigiFunzione(req, res, 'notifiche', 'Le notifiche live')) return;
    const login = currentUser(req).login;
    const token = String(req.body?.token || '').trim();
    if (!token || !/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
      return res.status(400).json({ errore: 'token non valido (copialo esatto da @BotFather)' });
    }
    const v = await telegram.validaToken(token);
    if (!v.ok) return res.status(400).json({ errore: v.errore || 'token rifiutato da Telegram' });
    tgConf.set(login, { token, botUsername: v.username });
    res.json({ ok: true, botUsername: v.username });
  }));

  // rileva il gruppo dagli ultimi update (il bot dev'essere già nel gruppo)
  app.post('/api/streamer/telegram/rileva', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const c = tgConf.get(login);
    if (!c?.token) return res.status(400).json({ errore: 'prima collega il bot con il token' });
    const r = await telegram.rilevaGruppo(c.token);
    if (!r.ok) return res.status(400).json({ errore: r.errore });
    tgConf.set(login, { chatId: r.chatId, chatTitolo: r.titolo });
    // saluto di conferma nel gruppo appena collegato (best-effort)
    telegram.inviaMessaggio(c.token, r.chatId, '✅ Collegato! Vi avviserò qui quando parte la diretta.').catch(() => {});
    res.json({ ok: true, gruppo: r.titolo, privato: !!r.privato });
  }));

  // salva impostazioni notifica (accesa/spenta + testo)
  app.post('/api/streamer/telegram/impostazioni', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const c = tgConf.get(login);
    if (!c?.token) return res.status(400).json({ errore: 'prima collega il bot con il token' });
    const attivo = !!req.body?.attivo;
    const messaggio = String(req.body?.messaggio ?? '').slice(0, 800);
    const pinLive = !!req.body?.pinLive;
    if (attivo && !c.chat_id) return res.status(400).json({ errore: 'collega prima un gruppo (Rileva gruppo)' });
    tgConf.set(login, { attivo, messaggio, pinLive });
    res.json({ ok: true });
  }));

  // manda un messaggio di prova nel gruppo, adesso
  app.post('/api/streamer/telegram/prova', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const c = tgConf.get(login);
    if (!c?.token || !c.chat_id) return res.status(400).json({ errore: 'configura bot e gruppo prima' });
    const info = await helix.getStream(login).catch(() => null);
    const s = streamers.get(login);
    const testo = telegram.costruisciMessaggioLive({ login, display: s?.display || login }, info, c.messaggio);
    const r = await telegram.inviaMessaggio(c.token, c.chat_id, '🧪 <i>Anteprima notifica</i>\n\n' + testo);
    if (!r.ok) return res.status(400).json({ errore: r.errore });
    res.json({ ok: true });
  }));

  // scollega tutto (rimuove token e gruppo). Se il webhook era attivo, lo spegne.
  app.delete('/api/streamer/telegram', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const c = tgConf.get(login);
    if (c?.token && c.interattivo) telegram.rimuoviWebhook(c.token).catch(() => {});
    tgConf.remove(login);
    res.json({ ok: true });
  }));

  // ---- Telegram INTERATTIVO: il bot legge e risponde nel gruppo (webhook) ----
  // Accende/spegne. All'accensione genera un segreto e registra il webhook che
  // punta a /tg/<segreto>. Serve un URL pubblico HTTPS (in locale non funziona).
  app.post('/api/streamer/telegram/interattivo', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const c = tgConf.get(login);
    if (!c?.token) return res.status(400).json({ errore: 'prima collega il bot con il token' });
    const attivo = !!req.body?.attivo;
    if (attivo) {
      const secret = crypto.randomBytes(24).toString('hex');
      const url = `${config.baseUrl.replace(/\/$/, '')}/tg/${secret}`;
      const r = await telegram.impostaWebhook(c.token, url, secret);
      if (!r.ok) return res.status(400).json({ errore: r.errore || 'Telegram ha rifiutato il webhook (serve un URL pubblico HTTPS)' });
      tgConf.setInterattivo(login, true, secret);
      return res.json({ ok: true, interattivo: true });
    }
    if (c.token) telegram.rimuoviWebhook(c.token).catch(() => {});
    tgConf.setInterattivo(login, false, '');
    res.json({ ok: true, interattivo: false });
  }));

  // ---- Chat privata Telegram: chi può farsi rispondere + collegamento "solo me" ----
  const pendingLinkTg = new Map();   // canale → { code, scad } codice usa-e-getta per legare il proprietario

  // imposta la modalità: 'me' (solo il proprietario), 'tutti', 'off'
  app.post('/api/streamer/telegram/dm', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    tgConf.setDmModo(login, String(req.body?.modo || 'me'));
    res.json({ ok: true, telegram: statoTelegram(login) });
  }));

  // genera un codice usa-e-getta: il proprietario scrive "/collega CODICE" al bot in
  // privato e lega il PROPRIO account Telegram (così il "solo me" sa chi è 'me').
  app.post('/api/streamer/telegram/collega', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!tgConf.get(login)?.interattivo) return res.status(400).json({ errore: 'attiva prima il bot interattivo' });
    const code = String(crypto.randomInt(100000, 1000000));   // 6 cifre
    pendingLinkTg.set(login, { code, scad: Date.now() + 10 * 60_000 });
    res.json({ ok: true, code, username: tgConf.get(login)?.bot_username || '' });
  }));

  // slega l'account del proprietario
  app.post('/api/streamer/telegram/scollega', requireOwner, wrap(async (req, res) => {
    const login = currentUser(req).login;
    tgConf.setOwnerTg(login, '', '');
    pendingLinkTg.delete(login);
    res.json({ ok: true, telegram: statoTelegram(login) });
  }));

  // ---- Auguri di compleanno: configurazione + elenco dei compleanni ----
  app.get('/api/streamer/telegram/compleanni', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const cfg = streamers.get(login)?.settings?.telegramAuguri || {};
    const righe = compleanni.list(login);
    const lista = righe.map((c) => ({
      id: c.tg_user_id, nome: c.nome, giorno: c.giorno, mese: c.mese,
      manuale: String(c.tg_user_id).startsWith('man_'),
    }));
    // roster: membri visti nel gruppo che NON hanno ancora un compleanno segnato
    const conCompleanno = new Set(righe.map((c) => c.tg_user_id));
    const roster = membri.list(login).filter((m) => !conCompleanno.has(m.tg_user_id))
      .map((m) => ({ id: m.tg_user_id, nome: m.nome, username: m.username }));
    res.json({ attivo: !!cfg.attivo, messaggio: cfg.messaggio || '', lista, membri: roster });
  }));

  // carica gli amministratori del gruppo nel roster (unica lista che l'API concede)
  app.post('/api/streamer/telegram/membri/aggiorna', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const c = tgConf.get(login);
    if (!c?.token || !c.chat_id) return res.status(400).json({ errore: 'collega prima il bot e il gruppo' });
    const r = await telegram.membriAdmin(c.token, c.chat_id);
    if (!r.ok) return res.status(400).json({ errore: r.errore });
    for (const m of r.membri) membri.touch(login, m.id, m.nome, m.username);
    res.json({ ok: true, aggiunti: r.membri.length });
  }));
  app.post('/api/streamer/telegram/compleanni', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const s = streamers.get(login);
    if (!s) return res.status(404).json({ errore: 'streamer sconosciuto' });
    const attivo = !!req.body?.attivo;
    const messaggio = String(req.body?.messaggio || '').slice(0, 600);
    streamers.setSettings(login, { ...s.settings, telegramAuguri: { attivo, messaggio } });
    res.json({ ok: true });
  }));
  // aggiunge/modifica un compleanno. Se arriva un `id` (membro del roster) usa
  // quello reale → il festeggiato verrà TAGGATO; altrimenti crea un id "man_"
  // (aggiunta a mano, solo nome, niente tag).
  app.post('/api/streamer/telegram/compleanni/aggiungi', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const nome = String(req.body?.nome || '').trim().slice(0, 60);
    const d = compleanniFeat.parseData(`${req.body?.giorno}/${req.body?.mese}`);
    if (!nome) return res.status(400).json({ errore: 'metti un nome' });
    if (!d) return res.status(400).json({ errore: 'data non valida (giorno/mese)' });
    const idIn = String(req.body?.id || '').trim();
    const id = /^\d+$/.test(idIn) ? idIn : ('man_' + crypto.randomBytes(6).toString('hex'));
    compleanni.set(login, id, nome, d.giorno, d.mese);
    res.json({ ok: true });
  }));
  app.delete('/api/streamer/telegram/compleanni/:id', requireLogin, wrap(async (req, res) => {
    compleanni.remove(currentUser(req).login, req.params.id);
    res.json({ ok: true });
  }));

  // ---- WEBHOOK Telegram: qui arrivano i messaggi del gruppo (pubblico) ----
  // Si protegge col segreto nel path + header di verifica di Telegram. Risponde
  // SEMPRE 200 in fretta (Telegram lo pretende): l'elaborazione è best-effort.
  app.post('/tg/:secret', wrap(async (req, res) => {
    const conf = tgConf.getBySecret(req.params.secret);
    if (!conf) return res.status(404).type('text/plain').send('Not Found');
    // verifica l'header segreto (difesa in più oltre al path)
    if (req.get('X-Telegram-Bot-Api-Secret-Token') !== conf.webhook_secret) {
      return res.status(403).type('text/plain').send('Forbidden');
    }
    res.json({ ok: true });   // conferma subito a Telegram, poi elabora
    try {
      const msg = req.body?.message;
      const chat = msg?.chat;
      const testo = msg?.text;
      if (!chat || !testo) return;
      const login = conf.channel;
      const s = streamers.get(login);
      // auto-collega il gruppo: se non ne abbiamo ancora uno, prendi questo
      if (!conf.chat_id && (chat.type === 'group' || chat.type === 'supergroup')) {
        tgConf.set(login, { chatId: String(chat.id), chatTitolo: chat.title || '(gruppo)' });
      }
      // "/collega CODICE" in privato: lega l'account del proprietario (per il "solo me")
      if (chat.type === 'private' && /^\/collega\b/i.test(String(testo).trim())) {
        const code = String(testo).trim().split(/\s+/)[1] || '';
        const pend = pendingLinkTg.get(login);
        if (pend && pend.code && code === pend.code && Date.now() < pend.scad) {
          tgConf.setOwnerTg(login, msg.from?.id, msg.from?.first_name || msg.from?.username || '');
          pendingLinkTg.delete(login);
          telegram.inviaMessaggio(conf.token, chat.id, '✅ Collegato! Da ora ti risponderò qui in privato.').catch(() => {});
        } else {
          telegram.inviaMessaggio(conf.token, chat.id, '❌ Codice non valido o scaduto. Rigeneralo dalla dashboard (Notifiche → Telegram).').catch(() => {});
        }
        return;
      }
      // roster: annota il membro che ha scritto (così poi assegni il compleanno)
      if (msg.from && !msg.from.is_bot) {
        membri.touch(login, msg.from.id, msg.from.first_name || msg.from.username || '', msg.from.username || '');
      }
      const tgUser = msg.from?.username || (msg.from?.id ? 'tg' + msg.from.id : '');
      const utente = msg.from?.first_name || msg.from?.username || '';
      const sonoIoTg = conf.owner_tg_id && String(msg.from?.id) === String(conf.owner_tg_id);
      const inGruppo = chat.type === 'group' || chat.type === 'supergroup';

      // LINEE GUIDA (solo io, in privato): le do e lei le SALVA e le rispetterà
      // sempre. Le riconosce da un comando (/regola, /regole, /scorda) o dal
      // linguaggio naturale ("d'ora in poi…", "non essere…", "evita di…").
      if (chat.type === 'private' && sonoIoTg && !inGruppo) {
        const raw = String(testo).trim();
        const low = raw.toLowerCase();
        if (/^\/regole\b/.test(low)) {
          const l = guide.list(login);
          const out = l.length
            ? 'Le mie linee guida:\n' + l.map((g, i) => `${i + 1}. ${g.testo} — ${guide.descriviAmbito(g)}`).join('\n') + '\n\nPer toglierne una: /scorda numero'
            : 'Non mi hai ancora dato nessuna linea guida. Scrivimi ad es. «d\'ora in poi non essere troppo formale» oppure «con tutti tranne me non parlare di politica».';
          telegram.inviaMessaggio(conf.token, chat.id, out).catch(() => {});
          return;
        }
        if (/^\/scorda\b/.test(low)) {
          const n = parseInt(raw.split(/\s+/)[1], 10);
          const rem = Number.isFinite(n) ? guide.removeByIndex(login, n) : null;
          telegram.inviaMessaggio(conf.token, chat.id, rem ? `Ok, dimenticata: «${rem.testo}» 🗑️` : 'Numero non valido — vedi /regole.').catch(() => {});
          return;
        }
        let regola = null;
        if (/^\/regola\b/.test(low)) regola = raw.replace(/^\/regola\b\s*/i, '').trim();
        else {
          // linguaggio naturale: solo direttive chiare, mai domande o battute
          const marker = /^\s*(d'?ora in (poi|avanti)|da ora in poi|regola\s*[:\-]|linea guida\s*[:\-]|ricord(a|ati)\s+(di|che)|non (essere|devi|fare|dire|usare|parlare|chiamarti)|mai (essere|dire|fare)|evita(re)? (di|sempre)|voglio che (tu )?(non )?(sia|faccia|ti comporti)|comportati)/i;
          const scherzo = /\b(ahah|haha|ehe|lol|scherz)/i.test(low);
          if (marker.test(low) && !low.includes('?') && !scherzo && raw.length >= 6) regola = raw;
        }
        if (regola && regola.length >= 3) {
          const ambito = guide.interpreta(regola);
          guide.add(login, regola, ambito);
          telegram.inviaMessaggio(conf.token, chat.id,
            `Ok, me lo segno: «${regola.slice(0, 180)}» — vale ${guide.descriviAmbito(ambito)}. ✍️ (Se non intendevi questo: /scorda ${guide.count(login)})`).catch(() => {});
          return;
        }
      }
      // APPRENDIMENTO. Dai MIEI messaggi (account legato): stile + coscienza — è
      // l'apprendimento "duro", solo da me, ovunque su Telegram. Dagli altri: solo
      // nei GRUPPI (spazi pubblici, come la chat Twitch) e solo la coscienza
      // (persone/fatti), MAI lo stile. In privato, dagli altri non si impara nulla.
      if (!msg.from?.is_bot) {
        if (sonoIoTg) manager.brain?.imparaDaVoce({ channel: login, testo });
        else if (inGruppo) manager.brain?.imparaComunita({ channel: login, user: tgUser, nome: utente, testo });
      }
      // comando integrato /compleanno (solo se gli auguri sono accesi)
      if (s?.settings?.telegramAuguri?.attivo) {
        const risp = gestisciComandoCompleanno(login, msg, testo);
        if (risp) { telegram.inviaMessaggio(conf.token, chat.id, risp).catch(() => {}); return; }
      }
      // comandi: i moduli con "abilita anche su Telegram" (schermata Comandi)
      const invia = (t) => { if (t) telegram.inviaMessaggio(conf.token, chat.id, t).catch(() => {}); };
      const fattoDaModulo = await modules.eseguiTelegram(login, testo, invia, { utente }).catch(() => false);
      // CHAT PRIVATA col bot: risponde SOLO A ME (l'account legato), mai ad altri —
      // così non è un peso tenerlo acceso e resta privato. Si può spegnere del tutto
      // dalla dashboard (dm_modo='off'). Gli estranei che scrivono in privato non
      // ricevono nulla e non vengono "imparati".
      if (!fattoDaModulo && chat.type === 'private' && !/^[/!]/.test(String(testo).trim()) && !msg.from?.is_bot) {
        const acceso = (conf.dm_modo || 'me') !== 'off';
        if (acceso && sonoIoTg) {
          const risp = await manager.brain?.rispostaDiretta({ channel: login, user: tgUser || 'utente', nome: utente, testo, tono: s?.settings?.tono });
          if (risp) {
            telegram.inviaMessaggio(conf.token, chat.id, risp).catch(() => {});
          } else {
            // il cervello non ha prodotto nulla: invece di restare muti, spieghiamo
            // perché (così non sembra "rotto"). L'apprendimento avviene comunque.
            const st = await brainpy.stato().catch(() => null);
            const sc = st?.genera?.stato;
            const fb = sc === 'carico'
              ? '🧠 Sto ancora caricando il cervello (al primo avvio scarica il modello, ci vuole un po\'). Intanto imparo da ciò che scrivi — riprova tra un minuto!'
              : sc === 'pronto'
                ? 'Mmh, stavolta non mi è venuta la risposta 😅 riprova a scrivermelo?'
                : 'Il mio cervello (l\'IA locale) non è attivo su questo server, quindi in privato non riesco a rispondere. Però sto già imparando da ciò che scrivi. 🧠';
            telegram.inviaMessaggio(conf.token, chat.id, fb).catch(() => {});
          }
        }
      }
    } catch (e) { log.warn('webhook telegram:', e?.message || e); }
  }));

  // prova la notifica TikTok adesso (manda il messaggio nel gruppo Telegram)
  app.post('/api/streamer/tiktok/prova', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const s = streamers.get(login);
    const username = s?.settings?.tiktok?.username;
    if (!username) return res.status(400).json({ errore: 'imposta prima il tuo username TikTok' });
    const c = tgConf.get(login);
    if (!c?.token || !c.chat_id) return res.status(400).json({ errore: 'collega prima il bot Telegram e il gruppo' });
    const r = await telegram.notificaTikTok(c, { login, display: s?.display || login }, username, s?.settings?.tiktok?.messaggio);
    if (!r.ok) return res.status(400).json({ errore: r.errore });
    res.json({ ok: true });
  }));

  // prova le credenziali Instagram (ID account + token): legge l'ultimo post
  app.post('/api/streamer/instagram/prova', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const cfg = streamers.get(login)?.settings?.instagram || {};
    const b = req.body || {};
    const userId = String(b.userId || cfg.userId || '').trim();
    const token = String(b.token || '').trim() || cfg.token || '';
    if (!userId || !token) return res.status(400).json({ errore: 'servono ID account e token' });
    const r = await instagram.prova({ userId, token }).catch(() => null);
    res.json(r || { ok: false, motivo: 'errore' });
  }));

  // ---------------------------------------------------------- PASSKEY (WebAuthn)
  // Si CREA da loggati (proprietario O moderatore): la passkey è della PERSONA
  // (la sua identità Twitch), non del canale. Al login ridà accesso a tutti i
  // contesti a cui la persona ha diritto. Login (inizio/fine) è pubblico.

  app.post('/api/passkey/registra/inizio', requireLogin, wrap(async (req, res) => {
    const user = currentUser(req);
    const ident = identitaDi(user);
    const identDisp = user.identitaDisplay || user.modDisplay || user.display || ident;
    const challenge = webauthn.randomChallenge();
    req.session.pkReg = challenge;
    res.json({
      challenge,
      rp: { id: RP_ID, name: RP_NAME },
      user: { id: webauthn.bufToB64url(Buffer.from(ident)), name: ident, displayName: identDisp },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }, { type: 'public-key', alg: -8 }],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      excludeCredentials: passkeys.byLogin(ident).map((p) => ({ id: p.cred_id, type: 'public-key' })),
      timeout: 60000,
      attestation: 'none',
    });
  }));

  app.post('/api/passkey/registra/fine', requireLogin, wrap(async (req, res) => {
    const ident = identitaDi(currentUser(req));
    const challenge = req.session.pkReg; delete req.session.pkReg;
    if (!challenge) return res.status(400).json({ errore: 'sessione scaduta, riprova' });
    const { attestationObject, clientDataJSON, nome } = req.body || {};
    const v = webauthn.verifyRegistration({ attestationObject, clientDataJSON, challenge, origin: ORIGIN, rpId: RP_ID });
    if (!v.ok) return res.status(400).json({ errore: v.errore });
    if (passkeys.byCredId(v.credId)) return res.status(400).json({ errore: 'passkey già registrata' });
    passkeys.add({ login: ident, credId: v.credId, publicKey: v.jwk, alg: v.alg, signCount: v.signCount, nome: String(nome || 'Passkey').slice(0, 40) });
    res.json({ ok: true });
  }));

  app.get('/api/passkey', requireLogin, wrap(async (req, res) => {
    res.json(passkeys.byLogin(identitaDi(currentUser(req))).map((p) => ({ id: p.id, nome: p.nome, created_at: p.created_at, last_used: p.last_used })));
  }));

  app.delete('/api/passkey/:id', requireLogin, wrap(async (req, res) => {
    passkeys.remove(identitaDi(currentUser(req)), parseInt(req.params.id, 10) || 0);
    res.json({ ok: true });
  }));

  // --- login con passkey (PUBBLICO) ---
  app.post('/api/passkey/login/inizio', wrap(async (req, res) => {
    const challenge = webauthn.randomChallenge();
    req.session.pkLogin = challenge;
    res.json({ challenge, rpId: RP_ID, userVerification: 'preferred', timeout: 60000, allowCredentials: [] });
  }));

  app.post('/api/passkey/login/fine', wrap(async (req, res) => {
    const challenge = req.session?.pkLogin; delete req.session.pkLogin;
    if (!challenge) return res.status(400).json({ errore: 'sessione scaduta, riprova' });
    const { id, authenticatorData, clientDataJSON, signature } = req.body || {};
    const cred = id ? passkeys.byCredId(id) : null;
    if (!cred) return res.status(400).json({ errore: 'passkey sconosciuta' });
    const v = webauthn.verifyAuthentication({
      authenticatorData, clientDataJSON, signature,
      jwk: cred.publicKey, alg: cred.alg, challenge, origin: ORIGIN, rpId: RP_ID, storedSignCount: cred.sign_count,
    });
    if (!v.ok) return res.status(400).json({ errore: v.errore });
    // cred.login = identità della persona; ricostruiamo i suoi contesti attuali
    // (proprio canale + moderati). Se non ne ha più nessuno, accesso revocato.
    const contesti = contestiPer(cred.login);
    if (!contesti.length) return res.status(403).json({ errore: 'account non più abilitato' });
    passkeys.bumpCounter(id, v.newSignCount);
    const disp = streamers.get(cred.login)?.display || managers.attiviByLogin(cred.login)[0]?.display || cred.login;
    req.session.user = sessionePer(cred.login, disp, contestoDefault(contesti));
    log.info(`login con passkey: @${cred.login} → #${req.session.user.login} (${req.session.user.role})`);
    res.json({ ok: true });
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
    // azione 'clip': crea una clip a comando (usata dalla voce lato PC via companion)
    const azione = String(req.body?.azione || '').toLowerCase().trim();
    if (azione === 'clip') {
      await manager.creaClip(login, req.body?.motivo || 'comando vocale');
      return res.json({ ok: true });
    }
    // azione 'tiktok-live': via affidabile per avvisare "sono live su TikTok"
    // (una tua automazione la chiama quando vai in diretta su TikTok)
    if (azione === 'tiktok-live' || azione === 'tiktok') {
      const r = await manager.notificaTikTok(login);
      return res.json({ ok: !!r?.ok, motivo: r?.motivo });
    }
    // azioni per i NUOVI POST (via IFTTT/Zapier): affidabili anche per TikTok,
    // dove il rilevamento automatico dal server non è possibile.
    if (azione === 'youtube' || azione === 'youtube-post' || azione === 'tiktok-post' || azione === 'instagram-post') {
      const piattaforma = azione === 'tiktok-post' ? 'tiktok' : azione === 'instagram-post' ? 'instagram' : 'youtube';
      const s = streamers.get(login);
      const cfg = s?.settings?.[piattaforma] || {};
      const r = await manager.notificaPost(login, {
        piattaforma,
        titolo: String(req.body?.titolo || '').slice(0, 300),
        url: String(req.body?.url || req.body?.link || '').slice(0, 400),
        messaggio: cfg.messaggio || '',
        annunciaChat: !!cfg.annunciaChat,
      });
      return res.json({ ok: !!r?.ok });
    }
    // le altre azioni (messaggio/effetto/modulo) restano gestite dai moduli
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
    if (status === 'approved') { seedStreamer(login); avviaPretrain(login); }
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

  // ------------------------------------------------------------ Anima (operatore)
  // La personalità CONDIVISA di SocialBot: una sola, coerente su tutti i canali.
  // La modifica solo l'operatore (andryxify). Le persone restano a compartimenti
  // stagni: qui si vede solo QUANTI amici e i più affini, mai cosa/dove.

  app.get('/api/admin/anima', requireAdmin, wrap(async (req, res) => {
    res.json({
      profilo: persona.profilo(),
      amici: { totale: friends.count(), top: friends.top(8).map((f) => ({ user: f.user, affinita: Math.round(f.affinity), interazioni: f.interactions })) },
    });
  }));

  app.post('/api/admin/anima', requireAdmin, wrap(async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.nome !== undefined) patch.nome = String(b.nome).trim().slice(0, 40) || 'SocialBot';
    if (b.tono !== undefined) {
      if (!TONI_VALIDI.includes(b.tono)) return res.status(400).json({ errore: 'tono non valido' });
      patch.tono = b.tono;
    }
    if (b.umore !== undefined) patch.umore = Math.min(100, Math.max(0, Math.round(Number(b.umore)) || 0));
    if (b.energia !== undefined) patch.energia = Math.min(100, Math.max(0, Math.round(Number(b.energia)) || 0));
    const lista = (v, max, len) => Array.isArray(v)
      ? v.map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max) : undefined;
    if (b.tratti !== undefined) patch.tratti = lista(b.tratti, 12, 40) || [];
    if (b.valori !== undefined) patch.valori = lista(b.valori, 12, 60) || [];
    if (b.tormentoni !== undefined) patch.tormentoni = lista(b.tormentoni, 20, 40) || [];
    const profilo = persona.salvaProfilo(patch);
    res.json({ ok: true, profilo });
  }));

  // ---- ADMIN: gestione del MODELLO IA (globale: il cervello è condiviso) ----
  const LLM_MODELLI = [
    { id: 'auto', nome: 'Automatico (in base alla RAM del server)' },
    { id: 'qwen', nome: 'Qwen 2.5 3B — equilibrato' },
    { id: 'gemma', nome: 'Gemma 2 2B — veloce' },
    { id: 'gemma-uncensored', nome: 'Gemma 2 2B — senza freni (abliterated)' },
  ];
  const llmFile = join(config.dataDir, 'llm.json');
  const llmScelta = () => { try { return JSON.parse(readFileSync(llmFile, 'utf8')) || {}; } catch { return {}; } };

  // --- LIBRERIA dei modelli sul server (data/models): caricati o scaricati ---
  const modelsDir = join(config.dataDir, 'models');
  mkdirSync(modelsDir, { recursive: true });
  const nomeModelloSicuro = (s) => {
    let n = basename(String(s || '')).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^[._]+/, '').slice(-120);
    if (!/\.gguf$/i.test(n)) n += '.gguf';
    return n || 'modello.gguf';
  };
  const listaModelli = () => {
    try {
      return readdirSync(modelsDir)
        .filter((f) => /\.gguf$/i.test(f))
        .map((f) => { let mb = 0; try { mb = Math.round(statSync(join(modelsDir, f)).size / (1024 * 1024)); } catch { /* niente */ } return { nome: f, mb }; })
        .sort((a, b) => a.nome.localeCompare(b.nome));
    } catch { return []; }
  };
  const uploadModello = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, modelsDir),
      // carico con un suffisso: diventa .gguf solo a caricamento riuscito
      filename: (req, file, cb) => cb(null, nomeModelloSicuro(file.originalname) + '.uploading'),
    }),
    limits: { fileSize: 20 * 1024 * 1024 * 1024, files: 1 },   // fino a 20 GB
  });

  app.get('/api/admin/llm', requireAdmin, wrap(async (req, res) => {
    const st = await brainpy.stato().catch(() => null);
    res.json({ scelta: llmScelta(), modelli: LLM_MODELLI, modelliLocali: listaModelli(), stato: st?.genera || { stato: 'sconosciuto' } });
  }));

  // elenco dei modelli presenti sul server
  app.get('/api/admin/llm/files', requireAdmin, wrap(async (req, res) => {
    res.json({ files: listaModelli(), scelta: llmScelta() });
  }));

  // CARICA un GGUF dal tuo computer direttamente sul server (owner)
  app.post('/api/admin/llm/upload', requireAdmin, uploadModello.single('file'), wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ errore: 'nessun file' });
    const finale = req.file.filename.replace(/\.uploading$/, '');
    if (!/\.gguf$/i.test(finale)) { try { unlinkSync(req.file.path); } catch { /* niente */ } return res.status(400).json({ errore: 'serve un file .gguf' }); }
    try { renameSync(req.file.path, join(modelsDir, finale)); }
    catch (e) { return res.status(500).json({ errore: 'non riesco a salvare il file (spazio su disco?)' }); }
    res.json({ ok: true, caricato: finale, files: listaModelli() });
  }));

  // ELIMINA un modello dal server (per liberare spazio)
  app.delete('/api/admin/llm/files/:nome', requireAdmin, wrap(async (req, res) => {
    const safe = nomeModelloSicuro(req.params.nome);
    try { unlinkSync(join(modelsDir, safe)); } catch { /* già rimosso */ }
    const s = llmScelta();
    if (s.file === safe) {   // era quello in uso: torna all'automatico e ricarica
      delete s.file;
      try { if (Object.keys(s).length) writeFileSync(llmFile, JSON.stringify(s)); else rmSync(llmFile); } catch { /* niente */ }
      brainpy.ricarica().catch(() => {});
    }
    res.json({ ok: true, files: listaModelli() });
  }));

  app.post('/api/admin/llm', requireAdmin, wrap(async (req, res) => {
    const b = req.body || {};
    const scelta = llmScelta();                 // parto da ciò che c'è: aggiorno solo le parti indicate
    const primaSolo = !!(scelta.endpoint && scelta.endpoint.solo);
    let ricaricare = false;

    // --- MODELLO LOCALE di base (file caricato/scaricato | Qwen/Gemma | URL | auto) ---
    if ('modello' in b || 'url' in b || 'file' in b) {
      const file = String(b.file || '').trim();
      const url = String(b.url || '').trim();
      const modello = String(b.modello || '').trim().toLowerCase();
      delete scelta.url; delete scelta.modello; delete scelta.file;
      if (file) {
        const safe = nomeModelloSicuro(file);
        if (!existsSync(join(modelsDir, safe))) return res.status(400).json({ errore: 'modello non trovato sul server' });
        scelta.file = safe;
      } else if (url) {
        if (!/^https:\/\/\S+\.gguf(\?\S*)?$/i.test(url)) return res.status(400).json({ errore: 'URL non valido (dev\'essere https://…gguf)' });
        scelta.url = url;
      } else if (modello && modello !== 'auto') {
        if (!LLM_MODELLI.some((m) => m.id === modello)) return res.status(400).json({ errore: 'modello sconosciuto' });
        scelta.modello = modello;
      } // 'auto' → nessuna chiave: torna alla scaletta automatica
      ricaricare = true;   // cambiare il modello base richiede la ricarica del cervello
    }

    // --- ENDPOINT ESTERNO (LM Studio / Ollama / OpenAI-compatibile) ---
    if ('endpoint' in b) {
      const e = b.endpoint || {};
      const url = String(e.url || '').trim();
      if (url) {
        if (!/^https?:\/\/\S+/i.test(url)) return res.status(400).json({ errore: 'URL endpoint non valido (http(s)://host:porta)' });
        scelta.endpoint = {
          url,
          modello: String(e.modello || '').trim() || 'local-model',
          chiave: String(e.chiave || '').trim(),
          solo: !!e.solo,
        };
      } else {
        delete scelta.endpoint;   // url vuoto = scollega l'endpoint
      }
    }

    // ricarica il cervello solo se serve: modello base cambiato, o è cambiato se
    // caricare o no il modello locale (flag "solo" dell'endpoint).
    const dopoSolo = !!(scelta.endpoint && scelta.endpoint.solo);
    if (primaSolo !== dopoSolo) ricaricare = true;

    try {
      if (Object.keys(scelta).length) writeFileSync(llmFile, JSON.stringify(scelta));
      else { try { rmSync(llmFile); } catch { /* non c'era */ } }
    } catch (e) { return res.status(500).json({ errore: 'non riesco a salvare la scelta' }); }
    if (ricaricare) brainpy.ricarica().catch(() => {});   // cambio a caldo, in background
    res.json({ ok: true });
  }));

  // prova la raggiungibilità di un endpoint esterno (la verifica parte dal cervello)
  app.post('/api/admin/llm/prova', requireAdmin, wrap(async (req, res) => {
    const e = (req.body && req.body.endpoint) || req.body || {};
    const url = String(e.url || '').trim();
    const cfg = url ? {
      url,
      modello: String(e.modello || '').trim() || 'local-model',
      chiave: String(e.chiave || '').trim(),
      solo: !!e.solo,
    } : null;
    const r = await brainpy.provaEndpoint(cfg).catch(() => null);
    res.json(r || { ok: false, motivo: 'cervello non raggiungibile' });
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
