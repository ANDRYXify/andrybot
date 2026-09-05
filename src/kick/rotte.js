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
import express from 'express';
import { makeLog } from '../logger.js';
import { config } from '../config.js';
import * as giro from '../giro.js';
import * as auth from './auth.js';
import * as api from './api.js';
import { chiavePubblica, verificaFirma } from './firma.js';
import { daChatMessage, daEvento } from './messaggio.js';
import { nostro } from './eco.js';
import * as diario from './diario.js';

const log = makeLog('kick');

export function montaKick(app, { requireLogin, currentUser, wrap, suMessaggio, suEvento, registra }) {
  // --- 1. si parte -----------------------------------------------------
  // Due porte, lo stesso giro. `/auth/kick` e' lo streamer che gia' e' dentro e
  // collega il suo Kick al canale che ha; `/accedi/kick` e' chi su Twitch non
  // c'e' proprio e entra da qui. Cambia solo cosa si fa al ritorno, quindi il
  // giro OAuth e' scritto una volta sola.
  const parti = (req, res, { registrazione }) => {
    if (!auth.configurato()) return res.status(503).send('Kick non è configurato su questo server.');
    const { challenge, state } = giro.apri(req, 'kick', { registrazione });
    res.redirect(auth.urlAutorizzazione({ challenge, state, conModerazione: req.query.mod === '1' }));
  };

  app.get('/auth/kick', requireLogin, (req, res) => parti(req, res, { registrazione: false }));

  // Entrare con Kick: chi trasmette solo li' non ha un account Twitch da usare,
  // e chiedergliene uno per usare il bot sarebbe chiedergli di iscriversi a un
  // servizio che non gli serve. La stessa autorizzazione dice chi e' E da' al
  // bot il permesso di parlare: un giro solo invece di due.
  app.get('/accedi/kick', (req, res) => {
    if (typeof registra !== 'function') return res.redirect('/');
    if (currentUser(req)) return res.redirect('/');       // gia' dentro: si collega da /auth/kick
    parti(req, res, { registrazione: true });
  });

  // --- 2. si torna -----------------------------------------------------
  // Niente `requireLogin` qui: in registrazione la sessione NON c'e' ancora, e
  // cio' che lega questa risposta alla nostra richiesta e' lo `state` del giro,
  // non il cookie. Chi arriva senza un giro in corso non passa comunque.
  app.get('/auth/kick/callback', wrap(async (req, res) => {
    const esito = giro.chiudi(req, 'kick', req.query, { chi: 'Kick' });
    const registrazione = !!esito.giro?.registrazione;
    const login = registrazione ? '' : (currentUser(req)?.login || '');

    const male = (m) => res.redirect((registrazione ? '/?accesso=' : '/?kick=') + encodeURIComponent(m));
    if (!registrazione && !login) return male('devi entrare prima di collegare Kick');
    if (!esito.ok) return male(esito.errore);

    let token;
    try { token = await auth.scambiaCodice(esito.codice, esito.giro.verifier); }
    catch (e) { log.error(`${login || 'registrazione'}: scambio codice Kick fallito — ${e?.message || e}`); return male('Kick ha rifiutato il collegamento'); }

    // REGISTRAZIONE: prima si chiede a Kick chi e', poi nasce (o si ritrova) il
    // canale. Si chiede col token in mano perche' un canale sotto cui cercarlo
    // non c'e' ancora.
    if (registrazione) {
      const io = await api.chiSono(token.accessToken);
      if (!io.ok || !io.userId) {
        log.error(`registrazione Kick: Kick non dice chi sono — ${io.errore || 'nessun id'}`);
        return male('Kick non ha detto chi sei: riprova');
      }
      let esito;
      try { esito = await registra(req, { userId: io.userId, nome: io.nome, token }); }
      catch (e) { log.error('registrazione Kick fallita:', e?.message || e); return male('non sono riuscito a crearti il canale'); }
      if (!esito?.login) return male(esito?.errore || 'non sono riuscito a crearti il canale');

      const isc = await api.iscrivi(esito.login);
      if (!isc.ok) log.error(`@${esito.login}: iscrizione agli eventi Kick fallita — ${isc.errore}`);
      log.info(`@${esito.login}: entrato con Kick (@${io.nome || '?'}, id ${io.userId})`);
      return res.redirect(esito.dove || '/');
    }

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
  // `express.raw` con type: () => true prende i byte QUALUNQUE sia l'etichetta
  // che Kick mette sul corpo. Il lettore JSON globale ne prende una sola
  // (application/json): se un giorno Kick scrivesse `application/json;
  // charset=utf-8` in un modo che non riconosce, o cambiasse etichetta, il corpo
  // grezzo sarebbe vuoto — e la firma, che si calcola SUI BYTE, non tornerebbe
  // mai piu'. Un difetto muto per una virgola in un'intestazione.
  app.post('/kick/webhook', express.raw({ type: () => true, limit: '1mb' }), wrap(async (req, res) => {
    // I byte veri, comunque siano arrivati: dal lettore JSON globale, o da qui.
    const grezzo = req.rawBody ? req.rawBody.toString('utf8')
      : (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '');

    const pem = await chiavePubblica();
    const v = verificaFirma({
      chiavePubblica: pem,
      id: req.get('Kick-Event-Message-Id'),
      timestamp: req.get('Kick-Event-Message-Timestamp'),
      corpo: grezzo,
      firma: req.get('Kick-Event-Signature'),
    });
    if (!v.ok) {
      diario.segnaRifiuto(v.motivo);
      log.warn('evento Kick rifiutato: ' + v.motivo);
      return res.status(401).json({ errore: 'firma non valida' });
    }

    // Si risponde SUBITO: Kick non deve aspettare che il bot lavori, altrimenti
    // ritenta e ci arriva tutto due volte.
    res.json({ ok: true });

    try {
      const tipo = String(req.get('Kick-Event-Type') || '');
      let p = req.body || {};
      if (Buffer.isBuffer(p)) { try { p = JSON.parse(grezzo || '{}'); } catch { p = {}; } }
      const canale = api.loginPerKickId(p?.broadcaster?.user_id);
      // Si segna comunque: un evento firmato che arriva e non trova un canale
      // nostro e' un'informazione — vuol dire che Kick bussa e che il legame fra
      // l'id del canale e il nostro si e' perso.
      diario.segnaArrivo({ tipo, canale: canale || '' });
      if (!canale) return;                        // evento di un canale che non è nostro

      if (tipo === 'chat.message.sent') {
        const msg = daChatMessage(p, { canale });
        // L'eco di quello che ha appena detto il bot non e' un messaggio della
        // chat: su Kick non c'e' un `isSelf`, quindi lo riconosciamo da cio' che
        // abbiamo mandato noi (vedi eco.js).
        if (msg && !msg.isSelf && !nostro(canale, msg.text)) await suMessaggio?.(msg);
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
      diario: diario.stato(login),
    });
  }));

  // Ri-iscriversi agli eventi senza scollegare e ricollegare tutto. Serve dopo
  // un periodo in cui il webhook non rispondeva: Kick smette di provarci, e
  // l'unico modo per ripartire era rifare tutto il giro OAuth.
  app.post('/api/streamer/kick/eventi', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    const isc = await api.iscrivi(login);
    if (!isc.ok) return res.status(502).json({ errore: isc.errore || 'Kick ha rifiutato l\'iscrizione' });
    const ora = await api.iscrizioni(login);
    res.json({ ok: true, eventi: ora.ok && Array.isArray(ora.dati) ? ora.dati.length : 0 });
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
