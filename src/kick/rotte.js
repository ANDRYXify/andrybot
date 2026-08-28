// LE ROTTE DI KICK: collegare un account, e ricevere gli eventi.
//
// Stanno in un file loro e non dentro server.js per una ragione che abbiamo già
// pagato: un file da seimila righe è dove si perdono le cose. Qui c'è una cosa
// sola, e si legge tutta in un colpo.
//
// Il giro, per intero:
//   1. lo streamer preme «collega Kick» → /auth/kick: nasce un segreto usa-e-getta
//      (PKCE) che resta nella SUA sessione, e va da Kick;
//   2. torna su /auth/kick/callback con un codice → si scambia col token, si
//      salva cifrato, si chiede a Kick chi è, e ci si iscrive ai suoi eventi;
//   3. da lì in poi Kick spinge tutto su /kick/webhook, che verifica la FIRMA
//      prima di credere a qualunque cosa.
import crypto from 'node:crypto';
import { makeLog } from '../logger.js';
import { config } from '../config.js';
import * as auth from './auth.js';
import * as api from './api.js';
import { chiavePubblica, verificaFirma } from './firma.js';
import { daChatMessage, daEvento } from './messaggio.js';

const log = makeLog('kick');

// Quanto vale un giro di autorizzazione: oltre, il tentativo è scaduto.
const GIRO_MS = 10 * 60 * 1000;

export function montaKick(app, { requireLogin, currentUser, wrap, suMessaggio, suEvento }) {
  // --- 1. si parte -----------------------------------------------------
  app.get('/auth/kick', requireLogin, (req, res) => {
    if (!auth.configurato()) return res.status(503).send('Kick non è configurato su questo server.');
    const { verifier, challenge } = auth.creaPkce();
    const state = crypto.randomBytes(16).toString('hex');
    req.session.kick = { verifier, state, nato: Date.now() };
    res.redirect(auth.urlAutorizzazione({ challenge, state, conModerazione: req.query.mod === '1' }));
  });

  // --- 2. si torna -----------------------------------------------------
  app.get('/auth/kick/callback', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const giro = req.session.kick || null;
    req.session.kick = null;                        // usa-e-getta, sempre

    const male = (m) => res.redirect('/?kick=' + encodeURIComponent(m));
    if (req.query.error) return male(String(req.query.error).slice(0, 80));
    if (!giro?.verifier) return male('giro scaduto, riprova');
    if (Date.now() - giro.nato > GIRO_MS) return male('giro scaduto, riprova');
    // Lo state confrontato in tempo costante: è l'unica cosa che lega questa
    // risposta alla NOSTRA richiesta.
    const a = Buffer.from(String(req.query.state || ''));
    const b = Buffer.from(String(giro.state || ''));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return male('richiesta non riconosciuta');
    if (!req.query.code) return male('Kick non ha dato il codice');

    let token;
    try { token = await auth.scambiaCodice(req.query.code, giro.verifier); }
    catch (e) { log.error(`@${login}: scambio codice Kick fallito — ${e?.message || e}`); return male('Kick ha rifiutato il collegamento'); }

    api.salvaToken(login, token);

    // Senza l'id Kick il collegamento e' INUTILE: ogni evento in arrivo dice
    // «broadcaster 12345» e noi non sapremmo di chi e' il canale, quindi lo
    // butteremmo via in silenzio. Meglio dirlo subito che sembrare collegati e
    // non fare niente.
    const io = await api.ioSuKick(login);
    if (!io.ok || !io.userId) {
      api.scollega(login);
      log.error(`@${login}: Kick non dice chi sono — ${io.errore || 'nessun id'}`);
      return male('Kick non ha detto chi sei: riprova');
    }
    api.salvaToken(login, token, io.userId);

    const isc = await api.iscrivi(login);
    if (!isc.ok) {
      log.error(`@${login}: iscrizione agli eventi Kick fallita — ${isc.errore}`);
      return male('collegato, ma gli eventi non arrivano: ' + String(isc.errore || '').slice(0, 60));
    }
    log.info(`@${login}: Kick collegato (@${io.nome || '?'}, id ${io.userId}) e iscritto agli eventi`);
    res.redirect('/?kick=ok');
  }));

  // --- 3. gli eventi ---------------------------------------------------
  // Prima la firma, poi tutto il resto. Un evento non firmato non viene nemmeno
  // guardato: l'indirizzo è pubblico, e senza questa verifica chiunque potrebbe
  // far dire al bot quello che vuole, a nome di uno streamer.
  app.post('/kick/webhook', wrap(async (req, res) => {
    const pem = await chiavePubblica();
    const v = verificaFirma({
      chiavePubblica: pem,
      id: req.get('Kick-Event-Message-Id'),
      timestamp: req.get('Kick-Event-Message-Timestamp'),
      corpo: req.rawBody ? req.rawBody.toString('utf8') : '',
      firma: req.get('Kick-Event-Signature'),
    });
    if (!v.ok) {
      log.warn('evento Kick rifiutato: ' + v.motivo);
      return res.status(401).json({ errore: 'firma non valida' });
    }

    // Si risponde SUBITO: Kick non deve aspettare che il bot lavori, altrimenti
    // ritenta e ci arriva tutto due volte.
    res.json({ ok: true });

    try {
      const tipo = String(req.get('Kick-Event-Type') || '');
      const p = req.body || {};
      const canale = api.loginPerKickId(p?.broadcaster?.user_id);
      if (!canale) return;                        // evento di un canale che non è nostro

      if (tipo === 'chat.message.sent') {
        const msg = daChatMessage(p, { canale });
        if (msg && !msg.isSelf) await suMessaggio?.(msg);
        return;
      }
      const ev = daEvento(tipo, p, { canale });
      if (ev) await suEvento?.(ev);
    } catch (e) {
      log.error('evento Kick:', e?.message || e);
    }
  }));

  // --- stato e scollegamento (per la dashboard) ------------------------
  app.get('/api/streamer/kick', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const t = api.tokenDi(login);
    if (!auth.configurato()) return res.json({ disponibile: false });
    if (!t?.accessToken) return res.json({ disponibile: true, collegato: false });
    const isc = await api.iscrizioni(login);
    res.json({
      disponibile: true,
      collegato: true,
      userId: t.userId || '',
      scadenza: t.expiresAt || 0,
      eventi: isc.ok ? (Array.isArray(isc.dati) ? isc.dati.length : 0) : null,
      erroreEventi: isc.ok ? '' : (isc.errore || ''),
      webhook: config.baseUrl.replace(/\/$/, '') + '/kick/webhook',
    });
  }));

  app.delete('/api/streamer/kick', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const isc = await api.iscrizioni(login);
    if (isc.ok && Array.isArray(isc.dati)) {
      await api.disiscrivi(login, isc.dati.map((x) => x?.id).filter(Boolean)).catch(() => {});
    }
    api.scollega(login);
    log.info(`@${login}: Kick scollegato`);
    res.json({ ok: true });
  }));
}
