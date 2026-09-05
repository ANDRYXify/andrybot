// LE ROTTE DI YOUTUBE: entrare, e collegare un canale.
//
// Il giro, per intero:
//   1. si preme «entra con YouTube» → /accedi/youtube (o /auth/youtube se si è
//      già dentro e si sta collegando): nasce un segreto usa-e-getta che resta
//      nella SUA sessione, e si va da Google;
//   2. si torna su /auth/youtube/callback con un codice → si scambia col token,
//      si salva cifrato, e si chiede a YouTube quale canale ha autorizzato.
//
// Cosa NON c'è, e va detto invece di lasciarlo intuire: il bot in chat su
// YouTube. Le API della chat in diretta si leggono a interrogazioni ripetute e
// la quota giornaliera di Google non regge un canale acceso tutto il giorno,
// figurarsi cento. Qui c'è l'accesso e l'identità — dashboard, link page,
// overlay, community — e la dashboard lo dice chiaro invece di far credere che
// il bot stia per parlare.
import { makeLog } from '../logger.js';
import * as giro from '../giro.js';
import * as auth from './auth.js';
import * as api from './api.js';

const log = makeLog('youtube');

export function montaYoutube(app, { requireLogin, currentUser, wrap, registra }) {
  // --- 1. si parte -----------------------------------------------------
  const parti = (req, res, { registrazione }) => {
    if (!auth.aperto()) return res.status(503).send('L’accesso con YouTube non è ancora aperto.');
    const { challenge, state } = giro.apri(req, 'youtube', { registrazione });
    res.redirect(auth.urlAutorizzazione({ challenge, state }));
  };

  app.get('/auth/youtube', requireLogin, (req, res) => parti(req, res, { registrazione: false }));

  app.get('/accedi/youtube', (req, res) => {
    if (typeof registra !== 'function') return res.redirect('/');
    if (currentUser(req)) return res.redirect('/');       // già dentro: si collega da /auth/youtube
    parti(req, res, { registrazione: true });
  });

  // --- 2. si torna -----------------------------------------------------
  // Niente `requireLogin`: in registrazione la sessione non c'è ancora, e ciò
  // che lega questa risposta alla nostra richiesta è lo `state` del giro, non il
  // cookie. Chi arriva senza un giro in corso non passa comunque.
  app.get('/auth/youtube/callback', wrap(async (req, res) => {
    const esito = giro.chiudi(req, 'youtube', req.query, { chi: 'Google' });
    const registrazione = !!esito.giro?.registrazione;
    const login = registrazione ? '' : (currentUser(req)?.login || '');

    const male = (m) => res.redirect((registrazione ? '/?accesso=' : '/?youtube=') + encodeURIComponent(m));
    if (!registrazione && !login) return male('devi entrare prima di collegare YouTube');
    if (!esito.ok) return male(esito.errore);

    let token;
    try { token = await auth.scambiaCodice(esito.codice, esito.giro.verifier); }
    catch (e) { log.error(`${login || 'registrazione'}: scambio codice YouTube fallito — ${e?.message || e}`); return male('Google ha rifiutato il collegamento'); }

    // Quale canale ha autorizzato. Si chiede SEMPRE, anche collegando: senza
    // l'id del canale il collegamento sarebbe un token e basta, e non sapremmo
    // nemmeno a chi appartiene.
    const io = await api.chiSono(token.accessToken);
    if (!io.ok) {
      log.error(`${login || 'registrazione'}: YouTube non dice quale canale — ${io.errore}`);
      return male(io.senzaCanale ? 'questo account Google non ha un canale YouTube' : 'YouTube non ha detto chi sei: riprova');
    }

    if (registrazione) {
      let creato;
      try { creato = await registra(req, { canaleId: io.canaleId, nome: io.nome, maniglia: io.maniglia, token }); }
      catch (e) { log.error('registrazione YouTube fallita:', e?.message || e); return male('non sono riuscito a crearti il canale'); }
      if (!creato?.login) return male(creato?.errore || 'non sono riuscito a crearti il canale');
      log.info(`@${creato.login}: entrato con YouTube (${io.nome || '?'}, canale ${io.canaleId})`);
      return res.redirect(creato.dove || '/');
    }

    api.salvaToken(login, token, io.canaleId);
    log.info(`@${login}: YouTube collegato (${io.nome || '?'}, canale ${io.canaleId})`);
    res.redirect('/?youtube=ok');
  }));

  // --- stato e scollegamento (per la dashboard) ------------------------
  app.get('/api/streamer/youtube', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    if (!auth.aperto()) return res.json({ disponibile: false, inArrivo: true });
    const t = api.tokenDi(login);
    if (!t?.accessToken) return res.json({ disponibile: true, collegato: false });
    res.json({
      disponibile: true,
      collegato: true,
      canaleId: t.userId || '',
      scadenza: t.expiresAt || 0,
      // Onestà: qui non si dice «collegato» e basta, si dice cosa fa e cosa no.
      chat: false,
    });
  }));

  app.delete('/api/streamer/youtube', requireLogin, wrap(async (req, res) => {
    const login = currentUser(req).login;
    await api.scollega(login);
    log.info(`@${login}: YouTube scollegato`);
    res.json({ ok: true });
  }));
}
