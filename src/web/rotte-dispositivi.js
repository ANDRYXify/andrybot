// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PIU' DISPOSITIVI, UNA REGIA (docs/DIRETTA.md): le rotte.
//
// Telefoni, tablet e altri computer si collegano come fotocamere della regia:
// il video va dall'uno all'altro in WebRTC, cifrato; qui passano solo i
// segnali per trovarsi. La regia e' una finestra dello Studio del proprietario;
// i dispositivi entrano con un invito (QR o codice di sei cifre) o, il
// telefono del proprietario, con la sua sessione. La chiave del dispositivo
// non si conserva: se ne tiene l'impronta (features/studio-dispositivi.js).
//
// Le rotte stanno in un modulo loro perche' le monta anche il collaudo da
// browser (scripts/verifica-studio-dispositivi.mjs): il collaudo prova queste,
// non una copia scritta a parte.

export const MOTIVI_CAM = Object.freeze({
  invito: 'Questo invito è scaduto o è già stato usato: scrivi il codice che vedi sul computer, o chiedi un invito nuovo.',
  troppi: 'Alla regia ci sono già tutti i dispositivi che può tenere: scollegane uno dal computer.',
  sconosciuto: 'Questo dispositivo è stato scollegato dalla regia: serve un codice nuovo.',
  'nessuna-regia': 'La regia non è aperta: apri lo Studio sul computer.',
  scollegato: 'Il dispositivo non è collegato.',
  messaggio: 'Messaggio non valido.',
  fretta: 'Troppi tentativi in poco tempo: aspetta un minuto e riprova, o inquadra il QR.',
  'non-regia': 'Questa finestra non è più la regia.',
  occupata: 'La regia è in diretta da un\'altra finestra.',
  chiuso: 'Lo Studio di questo canale non è aperto.',
});

// Il flusso degli eventi (SSE), nella forma che apre flusso.js (l'unico modo
// del sito di aprire un flusso: riapre dopo un 502 e sente il battito): un
// messaggio senza nome, {e: evento, d: dati}, e un battito vero ogni 25
// secondi, perche' un commento la pagina non lo vede. Un evento che chiude il
// discorso («tolto», «altrove», «troppi», «occupata») chiude anche il flusso:
// chi non ascolta piu' non resta appeso al server.
const FINALI = new Set(['tolto', 'altrove', 'troppi', 'occupata']);
function flussoSse(req, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.();
  res.write('retry: 2000\n\n');
  const scrivi = (evento, dati) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify({ e: evento, d: dati ?? {} })}\n\n`);
    if (FINALI.has(evento)) { clearInterval(battito); res.end(); }
  };
  const battito = setInterval(() => { try { scrivi('battito', {}); } catch { /* chiuso */ } }, 25_000);
  battito.unref?.();
  return { scrivi, allaFine: (f) => req.on('close', () => { clearInterval(battito); f(); }) };
}

// `proprietario` sono i cancelli di chi fa la regia (sessione da proprietario e
// Studio aperto); `loginDi(req)` il suo canale; `studioPerMe(login)` se lo
// Studio di quel canale e' aperto (per i dispositivi, che una sessione non ce
// l'hanno).
export function montaDispositivi(app, { salotto, proprietario, loginDi, studioPerMe, eLoginNostro, camHtml, baseUrl, turnAcceso = false }) {
  const camDi = (req, res) => {
    const b = req.body || {};
    const login = String(b.canale || '').toLowerCase();
    const r = eLoginNostro(login) ? salotto.riconosci(login, b.id, b.chiave) : null;
    if (!r) { res.status(401).json({ errore: MOTIVI_CAM.sconosciuto, tolto: true }); return null; }
    if (!studioPerMe(login)) { res.status(403).json({ errore: MOTIVI_CAM.chiuso }); return null; }
    return { login, id: r.id };
  };
  const ipOk = (req, cosa, max) => salotto.permesso(`ip:${cosa}:${req.ip || ''}`, max);
  const rifiuto = (res, r) => res.status(r.motivo === 'fretta' ? 429 : 409).json({ errore: MOTIVI_CAM[r.motivo] || 'Segnale rifiutato.', motivo: r.motivo });

  // ---- il dispositivo
  app.get(['/cam', '/cam/:token'], (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    res.sendFile(camHtml);
  });
  app.get('/api/cam/invito/:token', (req, res) => {
    if (!ipOk(req, 'invito', 60)) return res.status(429).json({ errore: MOTIVI_CAM.fretta });
    const i = salotto.invito(req.params.token);
    if (!i) return res.status(404).json({ errore: MOTIVI_CAM.invito });
    res.json({ canale: i.login, scade: i.scade });
  });
  app.post('/api/cam/entra', (req, res) => {
    if (!ipOk(req, 'entra', 10)) return res.status(429).json({ errore: MOTIVI_CAM.fretta, motivo: 'fretta' });
    const b = req.body || {};
    const r = salotto.entra({ token: String(b.token || ''), codice: String(b.codice || ''), nome: b.nome });
    if (!r.ok) return res.status(r.motivo === 'invito' ? 404 : (r.motivo === 'fretta' ? 429 : 409)).json({ errore: MOTIVI_CAM[r.motivo] || 'Non riesco a collegare il dispositivo.', motivo: r.motivo });
    if (!studioPerMe(r.login)) { salotto.togli(r.login, r.id); return res.status(403).json({ errore: MOTIVI_CAM.chiuso }); }
    const d = salotto.elenco(r.login).find((x) => x.id === r.id);
    res.json({ canale: r.login, id: r.id, chiave: r.chiave, nome: d?.nome || '', comanda: !!d?.comanda });
  });
  // Il telefono dello streamer: prima chiede di chi e' il canale (per riusare
  // la chiave che ha gia'), poi, se non ce l'ha, entra con la sessione.
  app.get('/api/cam/io', ...proprietario, (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ canale: loginDi(req) });
  });
  app.post('/api/cam/io', ...proprietario, (req, res) => {
    const login = loginDi(req);
    const r = salotto.entra({ login, nome: req.body?.nome });
    if (!r.ok) return res.status(409).json({ errore: MOTIVI_CAM[r.motivo] || 'Non riesco a collegare il dispositivo.', motivo: r.motivo });
    const d = salotto.elenco(login).find((x) => x.id === r.id);
    res.json({ canale: login, id: r.id, chiave: r.chiave, nome: d?.nome || '', comanda: true });
  });
  app.post('/api/cam/biglietto', (req, res) => {
    const c = camDi(req, res); if (!c) return;
    res.set('Cache-Control', 'private, no-store');
    res.json({ biglietto: salotto.biglietto(c.login, c.id) });
  });
  app.get('/api/cam/eventi', (req, res) => {
    const b = salotto.usaBiglietto(req.query.b);
    if (!b) return res.status(401).json({ errore: MOTIVI_CAM.sconosciuto });
    const { scrivi, allaFine } = flussoSse(req, res);
    const r = salotto.apriDispositivo(b.login, b.id, scrivi);
    if (!r.ok) { scrivi(r.motivo === 'troppi' ? 'troppi' : 'tolto', {}); return; }
    scrivi('pronto', { regia: r.regia, giro: r.giro, live: r.live, nome: r.nome, comanda: r.comanda });
    allaFine(() => salotto.chiudiDispositivo(b.login, b.id, scrivi));
  });
  app.post('/api/cam/segnale', (req, res) => {
    const c = camDi(req, res); if (!c) return;
    const r = salotto.dalDispositivo(c.login, c.id, { tipo: req.body?.tipo, dati: req.body?.dati });
    if (!r.ok) return rifiuto(res, r);
    res.json({ ok: true });
  });
  app.post('/api/cam/ice', (req, res) => {
    const c = camDi(req, res); if (!c) return;
    res.set('Cache-Control', 'private, no-store');
    res.json(salotto.ice(c.login));
  });
  app.post('/api/cam/esci', (req, res) => {
    const c = camDi(req, res); if (!c) return;
    salotto.togli(c.login, c.id);
    res.json({ ok: true });
  });

  // ---- la regia
  app.get('/api/studio/dispositivi', ...proprietario, (req, res) => {
    const login = loginDi(req);
    res.set('Cache-Control', 'private, no-store');
    res.json({ elenco: salotto.elenco(login), presenza: salotto.presenza(login), turn: turnAcceso });
  });
  app.post('/api/studio/dispositivi/invito', ...proprietario, (req, res) => {
    const i = salotto.invita(loginDi(req));
    res.set('Cache-Control', 'private, no-store');
    res.json({ ...i, url: `${baseUrl}/cam/${i.token}` });
  });
  app.post('/api/studio/dispositivi/:id', ...proprietario, (req, res) => {
    const v = salotto.cambia(loginDi(req), req.params.id, { nome: req.body?.nome, comanda: typeof req.body?.comanda === 'boolean' ? req.body.comanda : undefined });
    if (!v) return res.status(404).json({ errore: 'Dispositivo non trovato.' });
    res.json(v);
  });
  app.post('/api/studio/dispositivi/:id/togli', ...proprietario, (req, res) => {
    salotto.togli(loginDi(req), req.params.id);
    res.json({ ok: true });
  });
  app.get('/api/studio/regia/presenza', ...proprietario, (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json(salotto.presenza(loginDi(req)));
  });
  app.get('/api/studio/regia/eventi', ...proprietario, (req, res) => {
    const login = loginDi(req), id = String(req.query.r || '');
    if (!/^[a-z0-9]{8,24}$/.test(id)) return res.status(400).json({ errore: 'regia senza nome' });
    const { scrivi, allaFine } = flussoSse(req, res);
    const r = salotto.apriRegia(login, { id, scrivi, live: req.query.live === '1' });
    if (!r.ok) { scrivi('occupata', {}); return; }
    scrivi('pronto', { turn: turnAcceso });
    allaFine(() => salotto.chiudiRegia(login, id));
  });
  app.post('/api/studio/regia/segnale', ...proprietario, (req, res) => {
    const b = req.body || {};
    const r = salotto.dallaRegia(loginDi(req), String(b.r || ''), { a: b.a, tipo: b.tipo, dati: b.dati });
    if (!r.ok) return rifiuto(res, r);
    res.json({ ok: true });
  });
  app.post('/api/studio/regia/stato', ...proprietario, (req, res) => {
    res.json({ ok: salotto.statoRegia(loginDi(req), String(req.body?.r || ''), { live: req.body?.live === true }) });
  });
  app.get('/api/studio/regia/ice', ...proprietario, (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json(salotto.ice(loginDi(req)));
  });
}
