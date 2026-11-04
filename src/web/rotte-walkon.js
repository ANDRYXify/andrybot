// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE ROTTE DEL WALK-ON (docs/WALKON.md): la pagina won/<canale> e le sue
// chiamate, la moderazione nel pannello (streamer e mod con la delega), il file
// per l'overlay. In un file loro, che si legge tutto in un colpo e che le prove
// montano su un'app vera con dei finti attorno.
//
// Chi e' la persona lo dice SOLO la sessione (l'accesso con Twitch o Kick),
// mai il corpo della richiesta. Le risposte di tutte le rotte passano da
// `rigaPubblica` (features/walkon.js): la mail non sta nelle righe, e nessuna
// rotta qui legge walkon_posta (lo fa solo `decidi` del database, per mandare
// l'esito).
import multer from 'multer';
import crypto from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { normWalkon, requisiti, effettoOfferto, fileAperti, formaComando, rigaPubblica, mailOk, motivoIn, TIPI_EFFETTO, LINGUE, mailEsito } from '../features/walkon.js';
import * as walkonFile from '../features/walkon-file.js';
import { htmlPaginaWalkon, linguaDi } from '../features/walkon-pagina.js';

export const MAX_IN_ATTESA = 200;
const NOME_FILE = walkonFile.NOME_FILE;

export function montaWalkon(app, d) {
  const { requireLogin, currentUser, wrap, notFound, extRateOk, eLoginNostro, streamers, store, servizio, effettoDi, effetti, mediaEffetti, firmaDi,
    posta, spazioEsaurito, tmpDir, chiaveOk, accessi, spettatorePew, accessoTwitch, accessoKick, authUrl, apriKick, abbonamento,
    linkPage = () => null, avatarDi = async () => '', baseUrl = '', log = null, chiDecide = (u) => u?.display || u?.login || '' } = d;

  const canaleDi = (req) => { const l = String(req.params.canale || '').toLowerCase(); return eLoginNostro(l) ? l : ''; };
  const cfgDi = (l) => normWalkon(streamers.get(l)?.settings?.walkon);
  const aperto = (l) => !!l && cfgDi(l).attivo && streamers.get(l)?.status === 'approved';
  // la persona: la chiave del walk-on, o quella dei Pew (la stessa persona)
  const ioDi = (req) => {
    const io = accessi.chi(req.session?.spettatoreWon);
    if (!io && req.session?.spettatoreWon) delete req.session.spettatoreWon;
    return io || spettatorePew(req) || null;
  };
  const urlPagina = (l) => `${baseUrl}/won/${l}`;
  const offerti = (l, cfg) => (cfg.effetti.attivo ? cfg.effetti.voci : [])
    .map((c) => ({ c, e: effettoDi(l, c) })).filter((x) => effettoOfferto(cfg, x.c, x.e))
    .map((x) => ({ comando: x.c, tipo: x.e.tipo, anteprima: `/won/${l}/effetto/${encodeURIComponent(x.c)}` }));

  // Chi puo', per la pagina: Helix per la sottoscrizione su Twitch, i
  // distintivi visti per il resto. Si chiede al piu' una volta al minuto a testa.
  const subVisti = new Map();
  async function provaDi(l, io) {
    let sub = null;
    if (io.piattaforma !== 'kick') {
      const k = l + '|' + io.id, v = subVisti.get(k);
      if (v && Date.now() - v.ts < 60_000) sub = v.sub;
      else {
        sub = await abbonamento(l, io.id).catch(() => null);
        if (subVisti.size > 5000) subVisti.clear();
        subVisti.set(k, { sub, ts: Date.now() });
      }
    }
    return servizio.provaPerPagina(l, io.id, { piattaforma: io.piattaforma === 'kick' ? 'kick' : 'twitch', login: io.login, sub });
  }
  // il segno di sospeso si guarda anche quando la persona apre la pagina
  function segna(l, io, esito) {
    const r = store.get(l, io.id);
    if (!r) return;
    if (esito === 'no' && r.stato !== 'rifiutato') store.sospendi(l, io.id, true);
    if (esito === 'si') { if (r.sospeso) store.sospendi(l, io.id, false); store.verificato(l, io.id); }
  }
  const pubblicaMia = (l, r) => (r ? { ...rigaPubblica(r), mail: store.haPosta(l, r.persona, r.versione) } : null);

  // ── LA PAGINA ──────────────────────────────────────────────────────────
  app.get('/won/:canale', wrap(async (req, res) => {
    const l = canaleDi(req);
    if (!aperto(l)) return notFound(res);
    const s = streamers.get(l);
    const io = ioDi(req);
    const link = linkPage(l);
    res.set('Cache-Control', 'private, no-store');
    res.type('html').send(htmlPaginaWalkon({
      login: l, display: s.display || l, avatar: await avatarDi(l), pagina: link || {}, baseUrl, url: urlPagina(l),
      lingua: linguaDi(req.get('accept-language')), cfg: cfgDi(l), io: io ? { nome: io.nome, piattaforma: io.piattaforma || 'twitch' } : null,
      accesso: accessoTwitch(), accessoKick: accessoKick(l), privacy: link?.attiva ? `/u/${l}/privacy` : '/privacy.html',
    }));
  }));

  app.get('/won/:canale/dati', wrap(async (req, res) => {
    const l = canaleDi(req);
    res.set('Cache-Control', 'private, no-store');
    if (!aperto(l)) return res.status(404).json({ errore: 'spento' });
    const cfg = cfgDi(l);
    const io = ioDi(req);
    let puo = null;
    if (io) { puo = requisiti(cfg, await provaDi(l, io)); segna(l, io, puo); }
    res.json({
      regole: {
        chi: { subTwitch: cfg.chi.subTwitch, livello: cfg.chi.livello, subKick: cfg.chi.subKick, vip: cfg.chi.vip, mod: cfg.chi.mod, aMano: cfg.chi.persone.length > 0 },
        file: { attivo: fileAperti(cfg), tipi: cfg.file.tipi, pesoMb: cfg.file.pesoMb, durataSec: cfg.file.durataSec },
        testo: cfg.testo, partenza: cfg.partenza, senzaApprovazione: cfg.effetti.senzaApprovazione, perDiretta: cfg.perDiretta,
      },
      effetti: offerti(l, cfg),
      posta: !!posta.attiva(),
      io: io ? { nome: io.nome, piattaforma: io.piattaforma || 'twitch' } : null,
      puo,
      mio: io ? pubblicaMia(l, store.get(l, io.id)) : null,
    });
  }));

  // l'anteprima di un effetto offerto: solo quelli che lo streamer ha scelto, firmato come sulla pagina dei Pew
  app.get('/won/:canale/effetto/:comando', (req, res) => {
    const l = canaleDi(req);
    if (!aperto(l)) return notFound(res);
    const cfg = cfgDi(l), c = formaComando(req.params.comando), e = effettoDi(l, c);
    if (!effettoOfferto(cfg, c, e)) return notFound(res);
    mediaEffetti.servi(req, res, l, e.file, { maxAge: 300, firmato: firmaDi(l) }).catch(() => { if (!res.headersSent) notFound(res); });
  });

  // il proprio file, a chi l'ha fatto (la persona dalla sessione)
  app.get('/won/:canale/mio/file', (req, res) => {
    const l = canaleDi(req);
    const io = l ? ioDi(req) : null;
    const r = io ? store.get(l, io.id) : null;
    const p = r ? walkonFile.percorso(l, r.file) : '';
    if (!p) return notFound(res);
    res.set('Cache-Control', 'private, no-store');
    res.sendFile(p, (err) => { if (err && !res.headersSent) notFound(res); });
  });

  // L'ACCESSO: nessun permesso su Twitch (basta sapere chi sei), user:read su
  // Kick. Il ritorno passa da /auth/callback e /auth/kick/callback (server.js),
  // che lo riconoscono da `wonFlow` e dal giro.
  app.get('/won/:canale/accedi', (req, res) => {
    const l = canaleDi(req);
    if (!aperto(l) || !accessoTwitch()) return notFound(res);
    const state = crypto.randomBytes(16).toString('hex');
    req.session.wonFlow = { state, canale: l, ts: Date.now() };
    res.redirect(authUrl(state));
  });
  app.get('/won/:canale/accedi-kick', (req, res) => {
    const l = canaleDi(req);
    if (!aperto(l) || !accessoKick(l)) return notFound(res);
    res.redirect(apriKick(req, l));
  });
  app.post('/won/:canale/esci', (req, res) => {
    accessi.togli(req.session?.spettatoreWon);
    if (req.session) delete req.session.spettatoreWon;
    res.json({ ok: true });
  });

  // SALVARE: un file solo, col peso dello streamer, e il resto in pochi campi.
  const upload = (pesoMb) => multer({
    storage: multer.diskStorage({ destination: (r, f, cb) => cb(null, tmpDir), filename: (r, f, cb) => cb(null, `wo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`) }),
    limits: { fileSize: pesoMb * 1024 * 1024, files: 1, fields: 8, fieldSize: 2048 },
  }).single('file');
  app.post('/won/:canale/salva', wrap(async (req, res) => {
    const l = canaleDi(req);
    if (!aperto(l)) return res.status(404).json({ ok: false, errore: 'spento' });
    const io = ioDi(req);
    if (!io) return res.status(401).json({ ok: false, errore: 'accesso' });
    if (!extRateOk('won-salva:' + l + ':' + io.id) || !extRateOk('won-ip:' + String(req.ip || ''))) return res.status(429).json({ ok: false, errore: 'troppi' });
    const cfg = cfgDi(l);
    const puo = requisiti(cfg, await provaDi(l, io));
    segna(l, io, puo);
    if (puo === 'no') return res.status(403).json({ ok: false, errore: 'requisiti' });
    const err = await new Promise((ok) => upload(cfg.file.pesoMb)(req, res, (e) => ok(e || null)));
    const temp = req.file?.path || '';
    const via = () => (temp ? unlink(temp).catch(() => {}) : null);
    const fuori = async (stato, errore) => { await via(); return res.status(stato).json({ ok: false, errore }); };
    if (err) return fuori(400, err.code === 'LIMIT_FILE_SIZE' ? 'peso' : 'errore');
    const b = req.body || {};
    const lingua = LINGUE.includes(b.lingua) ? b.lingua : 'it';
    const testo = cfg.testo.attivo ? String(b.testo || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    if (testo.length > cfg.testo.max) return fuori(400, 'testo');
    const mail = String(b.mail || '').trim();
    if (mail && (!posta.attiva() || !mailOk(mail))) return fuori(400, 'mail');
    const prima = store.get(l, io.id);
    const dati = { piattaforma: io.piattaforma === 'kick' ? 'kick' : 'twitch', login: io.login, nome: io.nome, lingua, testo, verificato: puo === 'si' };
    let nuovo = null;
    if (b.scelta === 'effetto') {
      const c = formaComando(b.effetto);
      if (!effettoOfferto(cfg, c, effettoDi(l, c))) return fuori(400, 'effetto');
      Object.assign(dati, { scelta: 'effetto', effetto: c, file: '', fileTipo: '', fileDurata: 0 });
      await via();
    } else if (b.scelta === 'file') {
      if (!fileAperti(cfg)) return fuori(400, 'tipo-no');
      if (temp) {
        if (spazioEsaurito(l) || store.inAttesa(l) >= MAX_IN_ATTESA) return fuori(400, 'spazio');
        try { nuovo = await walkonFile.accogli(l, temp, { tipi: cfg.file.tipi, maxSec: cfg.file.durataSec, chi: 'walkon:' + l + ':' + io.id }); } catch (e) {
          if (e?.occupato) return res.status(503).json({ ok: false, errore: 'occupato' });
          return res.status(400).json({ ok: false, errore: e?.codice || 'illeggibile' });
        }
        if (!TIPI_EFFETTO.includes(nuovo.tipo)) { await walkonFile.togli(l, nuovo.file); return res.status(400).json({ ok: false, errore: 'tipo-no' }); }
        Object.assign(dati, { scelta: 'file', effetto: '', file: nuovo.file, fileTipo: nuovo.tipo, fileDurata: nuovo.durata });
      } else if (prima?.scelta === 'file' && prima.file && walkonFile.percorso(l, prima.file)) {
        Object.assign(dati, { scelta: 'file', effetto: '', file: prima.file, fileTipo: prima.file_tipo, fileDurata: prima.file_durata });
      } else return fuori(400, 'vuoto');
    } else return fuori(400, 'vuoto');
    let esito;
    try {
      esito = store.salva(l, io.id, dati, { approvato: dati.scelta === 'effetto' && cfg.effetti.senzaApprovazione, chi: 'regola', mail });
    } catch (e) {
      if (nuovo) await walkonFile.togli(l, nuovo.file);
      log?.warn?.(`walk-on #${l}:`, e?.message || e);
      return res.status(500).json({ ok: false, errore: 'errore' });
    }
    if (esito?.vecchioFile) await walkonFile.togli(l, esito.vecchioFile);
    res.json({ ok: true, stato: esito.riga.stato, mio: pubblicaMia(l, esito.riga) });
  }));

  app.post('/won/:canale/togli', wrap(async (req, res) => {
    const l = canaleDi(req);
    const io = l ? ioDi(req) : null;
    if (!io) return res.status(401).json({ ok: false, errore: 'accesso' });
    if (!extRateOk('won-salva:' + l + ':' + io.id)) return res.status(429).json({ ok: false, errore: 'troppi' });
    const r = store.togli(l, io.id, { chi: io.nome });
    if (r?.file) await walkonFile.togli(l, r.file);
    res.json({ ok: true });
  }));

  // la mail, data o tolta dalla persona: solo per il suo walk-on di adesso
  app.post('/won/:canale/mail', wrap(async (req, res) => {
    const l = canaleDi(req);
    const io = l ? ioDi(req) : null;
    if (!io) return res.status(401).json({ ok: false, errore: 'accesso' });
    if (!extRateOk('won-salva:' + l + ':' + io.id)) return res.status(429).json({ ok: false, errore: 'troppi' });
    const r = store.get(l, io.id);
    if (!r) return res.status(404).json({ ok: false, errore: 'vuoto' });
    const mail = String(req.body?.mail || '').trim();
    if (mail && (!posta.attiva() || !mailOk(mail))) return res.status(400).json({ ok: false, errore: 'mail' });
    store.mettiPosta(l, io.id, r.versione, mail);
    res.json({ ok: true });
  }));

  // ── LA MODERAZIONE (pannello: lo streamer e i mod con la delega) ──────────
  const perPannello = (l) => {
    const cfg = cfgDi(l);
    return {
      cfg, pagina: urlPagina(l), posta: !!posta.attiva(), conta: store.conta(l),
      voci: store.elenco(l).map((r) => ({ ...rigaPubblica(r, { file: r.file ? `/api/streamer/walkon/${r.id}/file?v=${r.versione}` : '' }) })),
      registro: store.registro(l, 80),
      effetti: effetti(l).filter((e) => TIPI_EFFETTO.includes(e.tipo) && e.file).map((e) => ({ comando: e.comando, tipo: e.tipo, offerto: cfg.effetti.voci.includes(e.comando) })),
    };
  };
  app.get('/api/streamer/walkon', requireLogin, wrap(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json(perPannello(currentUser(req).login));
  }));
  app.get('/api/streamer/walkon/:id/file', requireLogin, (req, res) => {
    const l = currentUser(req).login;
    const r = store.perId(l, req.params.id);
    const p = r ? walkonFile.percorso(l, r.file) : '';
    if (!p) return notFound(res);
    res.set('Cache-Control', 'private, no-store');
    res.sendFile(p, (err) => { if (err && !res.headersSent) notFound(res); });
  });
  app.post('/api/streamer/walkon/:id/decidi', requireLogin, wrap(async (req, res) => {
    const u = currentUser(req), l = u.login;
    const b = req.body || {};
    const prima = store.perId(l, req.params.id);
    if (!prima) return res.status(404).json({ ok: false, perche: 'manca' });
    const cfg = cfgDi(l);
    const pronto = Number.isInteger(b.pronto) ? cfg.motivi[b.pronto] : null;
    const motivo = b.esito === 'rifiutato' ? (pronto ? motivoIn(pronto, prima.lingua) : String(b.motivo || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300)) : '';
    const r = store.decidi(l, prima.id, b.versione, b.esito, { motivo, chi: chiDecide(u) });
    if (!r.ok) return res.status(409).json({ ok: false, perche: r.perche, ...perPannello(l) });
    if (r.vecchioFile) await walkonFile.togli(l, r.vecchioFile);
    if (r.mail) {
      const m = mailEsito({ esito: b.esito, motivo, lingua: r.riga.lingua, canale: streamers.get(l)?.display || l, nome: r.riga.nome, link: urlPagina(l) });
      Promise.resolve().then(() => posta.invia({ a: r.mail, oggetto: m.oggetto, testo: m.testo }))
        .catch((e) => log?.warn?.(`walk-on #${l}: la mail dell'esito non e' partita:`, e?.message || e));
    }
    res.json({ ok: true, ...perPannello(l) });
  }));

  // ── IL FILE PER L'OVERLAY (con la chiave): solo di un walk-on approvato ──
  app.get('/overlay/:login/walkon/:file', (req, res) => {
    if (!chiaveOk(req)) return notFound(res);
    const l = String(req.params.login || '').toLowerCase();
    const f = String(req.params.file || '');
    if (!NOME_FILE.test(f) || !store.inScena(l, f)) return notFound(res);
    const p = walkonFile.percorso(l, f);
    if (!p) return notFound(res);
    res.set('Cache-Control', 'private, max-age=300');
    res.sendFile(p, (err) => { if (err && !res.headersSent) notFound(res); });
  });

  return { perPannello, ioDi };
}
