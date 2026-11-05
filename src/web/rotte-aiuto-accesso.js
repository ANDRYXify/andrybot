// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO NON SI RIESCE A ENTRARE (docs/ACCESSO-SICURO.md, passo 5): la pagina
// della richiesta di aiuto, l'elenco del proprietario, lo sblocco e il suo link.
//
// Una richiesta non apre niente da sola. Sblocca solo l'amministratore
// (requireAdmin), una volta (UPDATE … WHERE stato='aperta'), e il link vale una
// volta, per un conto, per 24 ore (UPDATE … WHERE usato=0 AND scade > ora). Il
// link usato apre solo una sessione in attesa, che deve attivare un fattore
// nuovo prima del pannello. Chi chiede riceve la stessa risposta per un conto
// che c'e' e per uno che non c'e'; il proprietario non riceve mai password,
// codici o segreti, ne' la mail del conto in chiaro.
import crypto from 'node:crypto';
import { verificaSfida } from '../features/ingresso-prova.js';
import { tetto, normMail, improntaMail, mailNascosta } from '../features/ingresso.js';
import { PROBLEMI, PERSI, LINK_MS, TESTI, praticaNuova, praticaOk, contattiPuliti, confronta, daiSocial } from '../features/ingresso-aiuto.js';
import { impronta } from '../segreti.js';

const lingua = (x) => (['it', 'en', 'es'].includes(String(x || '')) ? String(x) : 'it');
const riga = (x, max) => String(x ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const improntaLink = (t) => impronta(String(t || ''), 'aiuto-link');

export function montaAiutoAccesso(app, d) {
  const { wrap, requireAdmin, currentUser, ingresso, store, posta, chiaveProva, passkeys, paginaAiuto, paginaSblocco,
    entraCome = () => false, collegatiDi = () => ({}), contoDi = () => null, avvisaAdmin = async () => {}, mailDelConto = () => '',
    linguaDi = () => 'it', baseUrl = '', ora = () => Date.now(), log = null } = d;
  const ip = (req) => String(req.ip || req.socket?.remoteAddress || '?');
  const no = (res, codice, stato = 400) => res.status(stato).json({ errore: codice, codice });
  const troppe = (res) => no(res, 'troppe', 429);

  // ── LE PAGINE ──────────────────────────────────────────────────────────
  app.get('/aiuto-accesso', (req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(paginaAiuto); });
  // Aprire il link non lo usa: Telegram e Discord lo aprono da soli per l'anteprima.
  app.get('/sblocca-accesso', (req, res) => { res.set('Cache-Control', 'no-store').set('Referrer-Policy', 'no-referrer'); res.sendFile(paginaSblocco); });

  // ── LA RICHIESTA ───────────────────────────────────────────────────────
  // Il conto: una mail fra le mail per entrare, o un nome fra i login e i nomi
  // da mostrare, solo se ne esce uno. La risposta e' la stessa in ogni caso.
  const contoScritto = (s) => {
    const t = String(s || '').trim();
    if (!t) return '';
    if (t.includes('@') && !t.startsWith('@')) return store.perMail(improntaMail(normMail(t))) || '';
    return store.contoDiNome(t);
  };
  app.post('/api/aiuto-accesso', wrap(async (req, res) => {
    if (!tetto('aiuto|' + ip(req), 3, 3_600_000, ora()) || !tetto('aiuto|tutti', 30, 3_600_000, ora())) return troppe(res);
    const p = verificaSfida({ sfida: req.body?.sfida, numero: req.body?.numero, chiave: chiaveProva, scopo: 'aiuto', brucia: (s, sc) => store.brucia(s, sc), ora: ora() });
    if (!p.ok) return no(res, 'prova');
    const b = req.body || {};
    const conto = riga(b.conto, 120);
    const contatti = contattiPuliti(b.contatti);
    if (!conto) return no(res, 'conto');
    if (!Object.keys(contatti).length) return no(res, 'contatti');
    const problema = PROBLEMI.includes(b.problema) ? b.problema : 'altro';
    const login = contoScritto(conto);
    let pratica = praticaNuova();
    while (store.aiutoPerPratica(pratica)) pratica = praticaNuova();
    const stato = store.nuovoAiuto({ pratica, login, scritto: { conto, riga: riga(b.riga, 200), contatti, lingua: lingua(b.lingua) }, problema, ora: ora() });
    if (login && stato === 'aperta') store.annota(login, 'aiuto', { nota: pratica }, ora());
    avvisaAdmin(TESTI.it.avviso(pratica)).catch((e) => log?.warn?.('aiuto per entrare, avviso non partito:', e?.message || e));
    res.json({ ok: true, pratica });
  }));
  // Com'e' andata, col numero di pratica. Il link non passa mai di qui.
  app.get('/api/aiuto-accesso/pratica', (req, res) => {
    if (!tetto('pratica|' + ip(req), 20, 3_600_000, ora())) return troppe(res);
    res.set('Cache-Control', 'no-store');
    const n = String(req.query.n || '').trim().toUpperCase();
    const r = praticaOk(n) ? store.aiutoPerPratica(n) : null;
    if (!r) return res.json({ stato: 'sconosciuta' });
    const stato = r.stato === 'doppione' ? 'aperta' : r.stato;
    res.json({ stato, risposta: stato === 'rifiutata' ? r.risposta : '' });
  });

  // ── IL LINK DI SBLOCCO ─────────────────────────────────────────────────
  app.post('/api/aiuto-accesso/usa', wrap(async (req, res) => {
    if (!tetto('usa|' + ip(req), 10, 3_600_000, ora())) return troppe(res);
    const t = String(req.body?.t || '');
    const login = /^[A-Za-z0-9_-]{43}$/.test(t) ? store.usaLink(improntaLink(t), ora()) : '';
    if (!login) return no(res, 'link');
    store.annota(login, 'sblocco', { nota: 'link usato' }, ora());
    if (!entraCome(req, login)) return no(res, 'conto', 403);
    ingresso.lega(req, { via: 'sblocco' });
    req.ingresso = { stato: 'attesa' };
    res.json({ ok: true, vai: '/seconda-prova' });
  }));

  // ── L'ELENCO DEL PROPRIETARIO ──────────────────────────────────────────
  const vista = (r) => {
    const c = r.login ? contoDi(r.login) : null;
    const coll = r.login ? collegatiDi(r.login) : {};
    const esiti = confronta(r.scritto.contatti || {}, coll);
    const mostrati = { ...coll, mail: (coll.mail || []).map(mailNascosta) };
    return {
      id: r.id, pratica: r.pratica, stato: r.stato, doppioneDi: r.doppione_di, problema: r.problema, creata: r.creata, decisa: r.decisa, chi: r.chi, nota: r.nota,
      risposta: r.risposta, persi: r.persi ? r.persi.split(',') : [], linkUsato: r.usato || 0, linkScade: r.scade || 0,
      scritto: { conto: r.scritto.conto || '', riga: r.scritto.riga || '' },
      contatti: Object.fromEntries(Object.entries(esiti).map(([k, v]) => [k, { ...v, collegati: mostrati[k] || [] }])),
      conto: c,
      accessi: r.login ? store.registro(r.login, 30).filter((x) => x.evento === 'prova').slice(0, 5) : [],
    };
  };
  app.get('/api/admin/aiuti', requireAdmin, wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ aiuti: store.aiuti(100).map(vista) });
  }));
  app.post('/api/admin/aiuti/:id/sblocca', requireAdmin, wrap(async (req, res) => {
    const r = store.aiuto(req.params.id);
    if (!r || r.stato !== 'aperta' || !r.login) return no(res, 'stato', 409);
    const nota = riga(req.body?.nota, 300);
    if (nota.length < 10) return no(res, 'nota');
    const persi = (Array.isArray(req.body?.persi) ? req.body.persi : []).filter((x) => PERSI.includes(x));
    const t = crypto.randomBytes(32).toString('base64url');
    const chi = currentUser(req)?.login || '';
    if (!store.sblocca(r.id, { chi, nota, persi: persi.join(','), impronta: improntaLink(t), scade: ora() + LINK_MS, ora: ora() })) return no(res, 'stato', 409);
    const login = r.login;
    store.chiudiAltre(login, '', 'sblocco', ora());
    if (persi.includes('passkey')) for (const k of passkeys.byLogin(login)) passkeys.remove(login, k.id);
    if (persi.includes('totp')) store.togliFattore(login, 'totp');
    if (persi.includes('password')) store.togliFattore(login, 'password');
    store.annota(login, 'sblocco', { nota: `${r.pratica} · ${chi}: ${nota}`.slice(0, 80) }, ora());
    const mail = mailDelConto(login);
    if (mail && posta.attiva()) {
      const m = TESTI[linguaDi(login)]?.sbloccato || TESTI.it.sbloccato;
      posta.invia({ a: mail, oggetto: m.oggetto, testo: m.testo, html: posta.guscioHtml ? posta.guscioHtml({ titolo: m.titolo, corpo: `<p style="margin:0;">${m.testo}</p>` }) : '' })
        .catch((e) => log?.warn?.('mail dello sblocco non partita:', e?.passo || 'errore'));
    }
    log?.info?.(`accesso: pratica ${r.pratica} sbloccata da @${chi}`);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, link: `${baseUrl.replace(/\/$/, '')}/sblocca-accesso?t=${t}`, scade: ora() + LINK_MS, aiuto: vista(store.aiuto(r.id)) });
  }));
  app.post('/api/admin/aiuti/:id/rifiuta', requireAdmin, wrap(async (req, res) => {
    const r = store.aiuto(req.params.id);
    if (!r) return no(res, 'stato', 409);
    const ok = store.rifiuta(r.id, { chi: currentUser(req)?.login || '', nota: riga(req.body?.nota, 300), risposta: riga(req.body?.risposta, 200), ora: ora() });
    if (!ok) return no(res, 'stato', 409);
    res.json({ ok: true, aiuto: vista(store.aiuto(r.id)) });
  }));
}
