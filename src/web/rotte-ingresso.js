// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE ROTTE DELL'ACCESSO SICURO (docs/ACCESSO-SICURO.md): la porta d'ingresso
// (/ingresso, la sfida della prova di lavoro), la pagina del secondo fattore
// (/seconda-prova e le sue chiamate) e la carta «Accesso e sicurezza» del
// pannello. In un file loro, che le prove montano su un'app vera.
//
// Tre guardie, e nient'altro:
//  · `inSecondaProva(req)`: la persona entrata da una porta e che non ha ancora dato
//    il secondo fattore. La dice SOLO la riga sul server (req.ingresso, letta da
//    features/ingresso.js prima di ogni rotta), mai il corpo della richiesta;
//  · `requireLogin`: chi e' dentro, per la carta del pannello;
//  · nessuna, dichiarata in scripts/verifica-porte.mjs: la sfida e lo stato
//    della porta, che non leggono e non scrivono niente di nessuno.
// Nessuna risposta contiene un codice, un segreto o un indirizzo intero, tranne
// le due che li consegnano alla persona stessa una volta sola: il segreto
// dell'app mentre lo attiva e i codici di riserva appena fatti.
import { creaSfida, verificaSfida, bitPer, SCOPI } from '../features/ingresso-prova.js';
import { indirizzoOtp } from '../features/ingresso-totp.js';
import crypto from 'node:crypto';
import { tetto, normMail, improntaMail, DURATE, mailGiaDiCasa } from '../features/ingresso.js';
import { calco, lunghezzaOk } from '../features/ingresso-password.js';
import { eMail } from '../identita.js';

export const LINGUE = ['it', 'en', 'es'];
const lingua = (x) => (LINGUE.includes(String(x || '')) ? String(x) : 'it');

export function montaIngresso(app, d) {
  const { wrap, requireLogin, currentUser, identitaDi, ingresso, store, passkeys, webauthn, rp, posta, chiaveProva,
    porte = () => ({}), entraCome = () => false, creaConto = () => '', statoConto = () => '', risposteDi = () => ({}), salvaDomande = () => {},
    abbonabile = () => false, paginaPrimo = '', paginaIngresso, paginaProva, ora = () => Date.now(), log = null } = d;

  const ip = (req) => String(req.ip || req.socket?.remoteAddress || '?');
  const inSecondaProva = (req) => (req.ingresso?.stato === 'attesa' && req.session?.user ? req.session.user : null);
  const chiDi = (u) => identitaDi(u);
  const nomeDi = (u) => u?.identitaDisplay || u?.modDisplay || u?.display || chiDi(u);
  const troppe = (res) => res.status(429).json({ errore: 'troppe', codice: 'troppe' });
  const no = (res, codice, stato = 400) => res.status(stato).json({ errore: codice, codice });
  // il tetto per conto: 5 codici per mail all'ora
  const gia = (mail, login) => { const di = store.perMail(improntaMail(mail)); return !!di && di !== login; };
  const tettoMail = (login) => tetto('mail|' + login, 5, 3_600_000, ora()) && store.codiciMailQuanti(login, ora() - 3_600_000) < 5;

  // ── LE PAGINE ──────────────────────────────────────────────────────────
  app.get('/ingresso', (req, res) => {
    if (currentUser(req)) return res.redirect('/');
    if (inSecondaProva(req)) return res.redirect('/seconda-prova');
    res.set('Cache-Control', 'no-store');
    res.sendFile(paginaIngresso);
  });
  app.get('/seconda-prova', (req, res) => {
    if (currentUser(req)) return res.redirect('/');
    if (!inSecondaProva(req)) return res.redirect('/ingresso');
    res.set('Cache-Control', 'no-store');
    res.sendFile(paginaProva);
  });

  // Lo stato della porta: quali modi ci sono, e il messaggio dell'anomalia, una volta.
  app.get('/api/ingresso/stato', (req, res) => {
    const avviso = req.session?.avviso || '';
    if (req.session && avviso) delete req.session.avviso;
    res.set('Cache-Control', 'no-store');
    res.json({ avviso, posta: !!posta.attiva(), ...porte(), dentro: req.ingresso?.stato || 'nessuno', conto: !!contoInAttesa(req) });
  });

  // La sfida: firmata, con la difficolta' che dicono i segnali. Niente di salvato.
  app.post('/api/ingresso/sfida', (req, res) => {
    const scopo = String(req.body?.scopo || '');
    if (!SCOPI.includes(scopo)) return no(res, 'scopo');
    if (!tetto('sfida|' + ip(req), 10, 60_000, ora())) return troppe(res);
    const bit = bitPer(req.body?.segni, req.get('user-agent'));
    res.set('Cache-Control', 'no-store');
    res.json(creaSfida({ chiave: chiaveProva, scopo, bit, ora: ora() }));
  });
  // Per le rotte dei moduli che partono dalla porta (mail, password, registrazione).
  const provaOk = (req, scopo) => verificaSfida({ sfida: req.body?.sfida, numero: req.body?.numero, chiave: chiaveProva, scopo, brucia: (s, scade) => store.brucia(s, scade), ora: ora() });

  // ── ENTRARE CON LA MAIL (la porta che parte dal sito: prova di lavoro e tetti) ──
  // Vale per chi ha confermato la mail nel pannello E ha un'altra prova: la mail
  // e' la prima, e il secondo fattore dev'essere un altro. La risposta e' la
  // stessa per un indirizzo che c'e' e per uno che non c'e': la porta non dice
  // chi e' di casa.
  app.post('/api/ingresso/mail/codice', wrap(async (req, res) => {
    if (!posta.attiva()) return no(res, 'mail');
    if (!tetto('modulo|' + ip(req), 10, 60_000, ora())) return troppe(res);
    const p = provaOk(req, 'mail');
    if (!p.ok) return no(res, 'prova');
    const mail = normMail(req.body?.mail);
    if (!posta.indirizzoOk(mail)) return no(res, 'indirizzo');
    const login = ingresso.chiPerMail(mail);
    // la mail parte in disparte: la risposta arriva nello stesso tempo per chi c'e' e per chi no
    if (login && tettoMail(login)) ingresso.mandaCodice(login, mail, 'entra', lingua(req.body?.lingua)).catch((e) => log?.warn?.('codice per mail non partito:', e?.passo || 'errore'));
    res.json({ ok: true });
  }));
  app.post('/api/ingresso/mail/entra', wrap(async (req, res) => {
    if (!tetto('modulo|' + ip(req), 10, 60_000, ora())) return troppe(res);
    const login = ingresso.chiPerMail(normMail(req.body?.mail));
    if (!login || !ingresso.usaCodiceMail(login, 'entra', req.body?.codice)) return sbagliato(res);
    return dentroOAttesa(req, res, login, 'mail');
  }));

  // Entrato con la prima prova: se il conto apre un pannello si va alla seconda
  // prova; un conto nato con la mail e non ancora approvato va alle sue domande.
  function dentroOAttesa(req, res, login, via) {
    if (entraCome(req, login)) {
      ingresso.lega(req, { via });
      req.ingresso = { stato: 'attesa' };
      return res.json({ ok: true, vai: '/seconda-prova' });
    }
    if (eMail(login)) { req.session.conto = { login, ts: ora() }; return res.json({ ok: true, vai: '/primo-ingresso' }); }
    return no(res, 'conto', 403);
  }

  // ── ENTRARE CON LA PASSWORD (solo i conti nati con la mail) ─────────────
  app.post('/api/ingresso/password', wrap(async (req, res) => {
    if (!tetto('modulo|' + ip(req), 10, 60_000, ora())) return troppe(res);
    const p = provaOk(req, 'password');
    if (!p.ok) return no(res, 'prova');
    const login = store.perMail(improntaMail(normMail(req.body?.mail)));
    const ok = !!login && eMail(login) && tetto('parola|' + login, 10, 3_600_000, ora()) && await ingresso.usaPassword(login, req.body?.password);
    if (!ok) return sbagliato(res);
    return dentroOAttesa(req, res, login, 'password');
  }));

  // ── LA REGISTRAZIONE CON LA MAIL (docs/ACCESSO-SICURO.md, passo 4) ──────
  // Prima della conferma non nasce niente: c'e' solo un'iscrizione di un'ora.
  // Una mail che e' gia' di qualcuno riceve una mail che glielo dice, e la porta
  // risponde nello stesso modo.
  app.post('/api/ingresso/registra', wrap(async (req, res) => {
    if (!posta.attiva()) return no(res, 'mail');
    if (!tetto('modulo|' + ip(req), 10, 60_000, ora())) return troppe(res);
    const p = provaOk(req, 'registra');
    if (!p.ok) return no(res, 'prova');
    const mail = normMail(req.body?.mail);
    if (!posta.indirizzoOk(mail)) return no(res, 'indirizzo');
    const chiara = req.body?.password;
    if (chiara !== undefined && chiara !== '' && !lunghezzaOk(chiara)) return no(res, 'misura');
    const l = lingua(req.body?.lingua);
    const imp = improntaMail(mail);
    if (!tetto('iscrivi|' + imp, 3, 3_600_000, ora())) return troppe(res);
    const id = crypto.randomBytes(16).toString('base64url');
    req.session.iscrizione = id;
    if (store.perMail(imp)) {
      const m = mailGiaDiCasa(l, posta);
      posta.invia({ a: mail, oggetto: m.oggetto, testo: m.testo, html: m.html }).catch((e) => log?.warn?.('mail di registrazione non partita:', e?.passo || 'errore'));
      return res.json({ ok: true });
    }
    store.nuovaIscrizione({ id, mail, impronta: imp, parola: chiara ? await calco(chiara) : '', lingua: l, scade: ora() + 3_600_000, ora: ora() });
    ingresso.mandaCodice('iscr.' + id, mail, 'iscrivi', l).catch((e) => log?.warn?.('codice di registrazione non partito:', e?.passo || 'errore'));
    res.json({ ok: true });
  }));
  app.post('/api/ingresso/registra/conferma', wrap(async (req, res) => {
    if (!tetto('modulo|' + ip(req), 10, 60_000, ora())) return troppe(res);
    const id = String(req.session?.iscrizione || '');
    const isc = store.iscrizione(id, ora());
    if (!isc || !ingresso.usaCodiceMail('iscr.' + id, 'iscrivi', req.body?.codice)) return sbagliato(res);
    if (!store.chiudiIscrizione(id)) return sbagliato(res);
    delete req.session.iscrizione;
    if (store.perMail(isc.impronta)) return no(res, 'presa', 409);
    const login = creaConto();
    ingresso.preparaMail(login, isc.mail);
    if (ingresso.confermaMail(login) !== 'ok') return no(res, 'presa', 409);
    if (isc.parola) ingresso.mettiCalco(login, isc.parola);
    store.annota(login, 'fattore', { nota: isc.parola ? 'mail e password' : 'mail' }, ora());
    req.session.conto = { login, ts: ora() };
    res.json({ ok: true, vai: '/primo-ingresso' });
  }));

  // ── IL PRIMO INGRESSO: le domande, e l'attesa dell'approvazione ──────────
  // `contoInAttesa`: il conto nato con la mail che questa sessione ha appena
  // confermato, o in cui e' appena entrata. Un giorno, poi si rientra.
  const contoInAttesa = (req) => {
    const c = req.session?.conto;
    const login = String(c?.login || '');
    if (!login || !eMail(login) || !(ora() - Number(c.ts) < 86_400_000)) return '';
    return statoConto(login) ? login : '';
  };
  app.get('/primo-ingresso', (req, res) => {
    if (!contoInAttesa(req)) return res.redirect('/ingresso');
    res.set('Cache-Control', 'no-store');
    res.sendFile(paginaPrimo);
  });
  app.get('/api/ingresso/conto', (req, res) => {
    const login = contoInAttesa(req);
    res.set('Cache-Control', 'no-store');
    if (!login) return res.json({ conto: null });
    res.json({ conto: { stato: statoConto(login), risposte: risposteDi(login) }, abbonamento: !!abbonabile() });
  });
  app.post('/api/ingresso/domande', wrap(async (req, res) => {
    const login = contoInAttesa(req);
    if (!login) return no(res, 'sessione', 401);
    salvaDomande(login, req.body?.risposte || {});
    res.json({ ok: true, risposte: risposteDi(login) });
  }));
  app.post('/api/ingresso/abbonati', wrap(async (req, res) => {
    const login = contoInAttesa(req);
    if (!login) return no(res, 'sessione', 401);
    if (!abbonabile()) return no(res, 'abbonamento');
    req.session.abbonando = { login, display: risposteDi(login).nome || login };
    res.json({ ok: true, vai: '/?abbonati=1' });
  }));

  // ── IL SECONDO FATTORE, per chi e' entrato da una porta ─────────────────
  // La seconda prova e' di un altro tipo dalla prima: chi e' entrato con la mail
  // non la riusa, chi e' entrato con la password nemmeno (ingresso.fattoriUsabili).
  const primaDi = (req) => store.sessione(req.session?.sid)?.via || '';
  const entratoConMail = (req) => primaDi(req) === 'mail';
  app.get('/api/ingresso/prova', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const u = inSecondaProva(req);
    if (!u) return res.json({ stato: req.ingresso?.stato || 'nessuno', vai: currentUser(req) ? '/' : '/ingresso' });
    const login = chiDi(u);
    const f = ingresso.fattoriUsabili(login, primaDi(req));
    res.json({ stato: 'attesa', chi: nomeDi(u), modo: ingresso.quantiFattori(f) ? 'verifica' : 'attiva', fattori: f, primo: primaDi(req), posta: !!posta.attiva() });
  });

  const fatto = (req, res, login, come, extra = {}) => {
    if (!ingresso.provata(req, login, come)) return no(res, 'sessione', 401);
    req.ingresso = { ...req.ingresso, stato: 'aperta' };
    return res.json({ ok: true, vai: '/', ...extra });
  };
  const sbagliato = (res) => no(res, 'sbagliato');

  // con la passkey che c'e' gia'
  app.post('/api/ingresso/prova/passkey/inizio', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const challenge = webauthn.randomChallenge();
    req.session.pkProva = challenge;
    res.json({ challenge, rpId: rp.id, userVerification: 'preferred', timeout: 60000,
      allowCredentials: passkeys.byLogin(chiDi(u)).map((p) => ({ id: p.cred_id, type: 'public-key' })) });
  }));
  app.post('/api/ingresso/prova/passkey/fine', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const challenge = req.session.pkProva; delete req.session.pkProva;
    if (!challenge) return no(res, 'scaduta');
    const { id, authenticatorData, clientDataJSON, signature } = req.body || {};
    const cred = id ? passkeys.byCredId(id) : null;
    if (!cred || cred.login !== chiDi(u)) return no(res, 'passkey');
    const v = webauthn.verifyAuthentication({ authenticatorData, clientDataJSON, signature, jwk: cred.publicKey, alg: cred.alg,
      challenge, origin: rp.origin, rpId: rp.id, storedSignCount: cred.sign_count });
    if (!v.ok) return no(res, 'passkey');
    passkeys.bumpCounter(id, v.newSignCount);
    return fatto(req, res, chiDi(u), 'passkey');
  }));

  // con il codice per mail, all'indirizzo che c'e' gia'
  app.post('/api/ingresso/prova/mail/manda', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const login = chiDi(u);
    const m = store.fattore(login, 'mail');
    if (!m || !posta.attiva() || entratoConMail(req)) return no(res, 'mail');
    if (!tettoMail(login)) return troppe(res);
    try { await ingresso.mandaCodice(login, m.segreto, 'prova', lingua(req.body?.lingua)); }
    catch (e) { log?.warn?.('codice per mail non partito:', e?.passo || 'errore'); return no(res, 'invio', 502); }
    res.json({ ok: true });
  }));
  app.post('/api/ingresso/prova/mail/verifica', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const login = chiDi(u);
    if (entratoConMail(req)) return no(res, 'mail');
    if (!ingresso.usaCodiceMail(login, 'prova', req.body?.codice)) return sbagliato(res);
    return fatto(req, res, login, 'mail');
  }));
  app.post('/api/ingresso/prova/totp', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const login = chiDi(u);
    if (!tetto('totp|' + login, 10, 600_000, ora())) return troppe(res);
    if (!ingresso.usaTotp(login, req.body?.codice)) return sbagliato(res);
    return fatto(req, res, login, 'totp');
  }));
  app.post('/api/ingresso/prova/password', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const login = chiDi(u);
    if (primaDi(req) === 'password') return no(res, 'password');
    if (!tetto('parola|' + login, 10, 3_600_000, ora())) return troppe(res);
    if (!(await ingresso.usaPassword(login, req.body?.password))) return sbagliato(res);
    return fatto(req, res, login, 'password');
  }));
  app.post('/api/ingresso/prova/riserva', wrap(async (req, res) => {
    const u = inSecondaProva(req);
    if (!u) return no(res, 'sessione', 401);
    const login = chiDi(u);
    if (!tetto('riserva|' + login, 10, 600_000, ora())) return troppe(res);
    if (!ingresso.usaRiserva(login, req.body?.codice)) return sbagliato(res);
    return fatto(req, res, login, 'riserva', { restano: ingresso.fattoriDi(login).riserve });
  }));

  // ── ATTIVARLO, per chi non ne ha nessuno (solo lui: se no non proverebbe niente) ──
  const daAttivare = (u, req) => {
    if (!u) return null;
    const login = chiDi(u);
    return ingresso.quantiFattori(ingresso.fattoriUsabili(login, primaDi(req))) ? null : { u, login };
  };
  const attivato = (req, res, login, come) => {
    store.annota(login, 'fattore', { nota: come }, ora());
    return fatto(req, res, login, come, { riserve: ingresso.nuoveRiserve(login) });
  };

  app.post('/api/ingresso/attiva/passkey/inizio', wrap(async (req, res) => {
    const a = daAttivare(inSecondaProva(req), req);
    if (!a) return no(res, 'sessione', 401);
    const challenge = webauthn.randomChallenge();
    req.session.pkAttiva = challenge;
    res.json({ challenge, rp: { id: rp.id, name: rp.nome }, user: { id: webauthn.bufToB64url(Buffer.from(a.login)), name: a.login, displayName: nomeDi(a.u) },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }, { type: 'public-key', alg: -8 }],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }, excludeCredentials: [], timeout: 60000, attestation: 'none' });
  }));
  app.post('/api/ingresso/attiva/passkey/fine', wrap(async (req, res) => {
    const a = daAttivare(inSecondaProva(req), req);
    if (!a) return no(res, 'sessione', 401);
    const challenge = req.session.pkAttiva; delete req.session.pkAttiva;
    if (!challenge) return no(res, 'scaduta');
    const { attestationObject, clientDataJSON, nome } = req.body || {};
    const v = webauthn.verifyRegistration({ attestationObject, clientDataJSON, challenge, origin: rp.origin, rpId: rp.id });
    if (!v.ok || passkeys.byCredId(v.credId)) return no(res, 'passkey');
    passkeys.add({ login: a.login, credId: v.credId, publicKey: v.jwk, alg: v.alg, signCount: v.signCount, nome: String(nome || 'Passkey').slice(0, 40) });
    return attivato(req, res, a.login, 'passkey');
  }));
  app.post('/api/ingresso/attiva/mail/manda', wrap(async (req, res) => {
    const a = daAttivare(inSecondaProva(req), req);
    if (!a) return no(res, 'sessione', 401);
    const mail = normMail(req.body?.mail);
    if (!posta.attiva() || entratoConMail(req)) return no(res, 'mail');
    if (!posta.indirizzoOk(mail)) return no(res, 'indirizzo');
    if (!tettoMail(a.login)) return troppe(res);
    if (gia(mail, a.login)) return no(res, 'presa', 409);
    ingresso.preparaMail(a.login, mail);
    try { await ingresso.mandaCodice(a.login, mail, 'attiva', lingua(req.body?.lingua)); }
    catch (e) { log?.warn?.('codice per mail non partito:', e?.passo || 'errore'); return no(res, 'invio', 502); }
    res.json({ ok: true });
  }));
  app.post('/api/ingresso/attiva/mail/verifica', wrap(async (req, res) => {
    const a = daAttivare(inSecondaProva(req), req);
    if (!a) return no(res, 'sessione', 401);
    if (!ingresso.usaCodiceMail(a.login, 'attiva', req.body?.codice)) return sbagliato(res);
    const c = ingresso.confermaMail(a.login);
    if (c !== 'ok') return no(res, c === 'presa' ? 'presa' : 'sbagliato', c === 'presa' ? 409 : 400);
    return attivato(req, res, a.login, 'mail');
  }));
  app.post('/api/ingresso/attiva/totp/inizio', wrap(async (req, res) => {
    const a = daAttivare(inSecondaProva(req), req);
    if (!a) return no(res, 'sessione', 401);
    const segreto = ingresso.preparaTotp(a.login);
    res.set('Cache-Control', 'no-store');
    res.json({ segreto, indirizzo: indirizzoOtp({ segreto, conto: nomeDi(a.u) }) });
  }));
  app.post('/api/ingresso/attiva/totp/verifica', wrap(async (req, res) => {
    const a = daAttivare(inSecondaProva(req), req);
    if (!a) return no(res, 'sessione', 401);
    if (!tetto('totp|' + a.login, 10, 600_000, ora())) return troppe(res);
    if (!ingresso.confermaTotp(a.login, req.body?.codice)) return sbagliato(res);
    return attivato(req, res, a.login, 'totp');
  }));

  // ── LA CARTA DEL PANNELLO: «Accesso e sicurezza», della persona ──────────
  const mio = (req) => chiDi(currentUser(req));
  const vista = (req) => {
    const login = mio(req);
    const p = store.persona(login);
    const sid = req.session?.sid;
    return {
      fattori: ingresso.fattoriDi(login), posta: !!posta.attiva(), conMail: eMail(login), durata: DURATE.includes(Number(p.durata)) ? Number(p.durata) : 30, durate: DURATE,
      sessioni: store.aperte(login, ora()).map((s) => ({ questa: s.sid === sid, motore: s.motore, sistema: s.sistema, rete: s.rete, via: s.via, creata: s.creata, vista: s.vista })),
      registro: store.registro(login, 30),
    };
  };
  app.get('/api/sicurezza', requireLogin, wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(vista(req));
  }));
  app.post('/api/sicurezza/totp/inizio', requireLogin, wrap(async (req, res) => {
    const u = currentUser(req);
    const segreto = ingresso.preparaTotp(mio(req));
    res.set('Cache-Control', 'no-store');
    res.json({ segreto, indirizzo: indirizzoOtp({ segreto, conto: nomeDi(u) }) });
  }));
  app.post('/api/sicurezza/totp/conferma', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    if (!tetto('totp|' + login, 10, 600_000, ora())) return troppe(res);
    if (!ingresso.confermaTotp(login, req.body?.codice)) return sbagliato(res);
    store.annota(login, 'fattore', { nota: 'totp' }, ora());
    res.json({ ok: true, ...vista(req) });
  }));
  app.post('/api/sicurezza/mail/manda', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    const mail = normMail(req.body?.mail);
    if (!posta.attiva()) return no(res, 'mail');
    if (!posta.indirizzoOk(mail)) return no(res, 'indirizzo');
    if (!tettoMail(login)) return troppe(res);
    if (gia(mail, login)) return no(res, 'presa', 409);
    ingresso.preparaMail(login, mail);
    try { await ingresso.mandaCodice(login, mail, 'attiva', lingua(req.body?.lingua)); }
    catch (e) { log?.warn?.('codice per mail non partito:', e?.passo || 'errore'); return no(res, 'invio', 502); }
    res.json({ ok: true });
  }));
  app.post('/api/sicurezza/mail/conferma', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    if (!ingresso.usaCodiceMail(login, 'attiva', req.body?.codice)) return sbagliato(res);
    const c = ingresso.confermaMail(login);
    if (c !== 'ok') return no(res, c === 'presa' ? 'presa' : 'sbagliato', c === 'presa' ? 409 : 400);
    store.annota(login, 'fattore', { nota: 'mail' }, ora());
    store.aggiornaPersona(login, { proposta_mail: ora() });
    res.json({ ok: true, ...vista(req) });
  }));
  app.delete('/api/sicurezza/fattore/:tipo', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    const tipo = String(req.params.tipo || '');
    if (!['totp', 'mail', 'password'].includes(tipo)) return no(res, 'tipo');
    if (!ingresso.puoTogliere(login, tipo)) return no(res, 'ultimo', 409);
    store.togliFattore(login, tipo);
    store.annota(login, 'tolto', { nota: tipo }, ora());
    res.json({ ok: true, ...vista(req) });
  }));
  // La password: solo per i conti nati con la mail. Si salva solo il suo calco.
  app.post('/api/sicurezza/password', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    if (!eMail(login)) return no(res, 'tipo');
    if (!lunghezzaOk(req.body?.nuova)) return no(res, 'misura');
    await ingresso.mettiPassword(login, req.body.nuova);
    store.annota(login, 'fattore', { nota: 'password' }, ora());
    res.json({ ok: true, ...vista(req) });
  }));
  app.post('/api/sicurezza/riserve', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    const codici = ingresso.nuoveRiserve(login);
    store.annota(login, 'fattore', { nota: 'riserve' }, ora());
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, riserve: codici });
  }));
  app.post('/api/sicurezza/sessioni/chiudi', requireLogin, wrap(async (req, res) => {
    const login = mio(req);
    const n = store.chiudiAltre(login, req.session?.sid, 'altrove', ora());
    store.annota(login, 'sessioni', { nota: String(n) }, ora());
    res.json({ ok: true, chiuse: n, ...vista(req) });
  }));
  app.post('/api/sicurezza/durata', requireLogin, wrap(async (req, res) => {
    const g = Number(req.body?.giorni);
    if (!DURATE.includes(g)) return no(res, 'durata');
    store.aggiornaPersona(mio(req), { durata: g });
    res.json({ ok: true, ...vista(req) });
  }));
  // I due avvisi del modello, una volta: «hai gia' la passkey» e la proposta della mail.
  app.post('/api/sicurezza/visto', requireLogin, wrap(async (req, res) => {
    const quale = String(req.body?.quale || '');
    if (quale === 'passkey') store.aggiornaPersona(mio(req), { avviso_passkey: ora() });
    else if (quale === 'mail') store.aggiornaPersona(mio(req), { proposta_mail: ora() });
    else return no(res, 'quale');
    res.json({ ok: true });
  }));

  return { inSecondaProva, provaOk };
}

// LA LETTURA E IL LEGAME, prima di ogni rotta (docs/ACCESSO-SICURO.md). Ogni
// richiesta legge la riga; ogni risposta, prima delle intestazioni (quindi
// prima che cookie-session scriva il cookie), lega la persona che una porta ha
// appena messo in sessione. Chi e' in attesa del secondo fattore va alla sua
// pagina; chi ha avuto la sessione chiusa per anomalia, alla porta col messaggio.
// Chi e' dentro il pannello: solo una persona la cui riga sul server dice «aperta».
// E' la sola fonte di `currentUser` (server.js): una sessione in attesa del
// secondo fattore, chiusa o scaduta non apre nessuna guardia.
export const utenteAperto = (req) => (req.ingresso?.stato === 'aperta' ? req.session?.user || null : null);
export const CASA_PANNELLO = new Set(['/', '/index.html', '/en', '/es', '/en/', '/es/']);
export function legaLeSessioni(app, { ingresso, aperto, log = null }) {
  app.use((req, res, next) => {
    const scrivi = res.writeHead;
    res.writeHead = function (...a) {
      try { ingresso.lega(req); } catch (e) { log?.warn?.('accesso, legare la sessione:', e?.message || e); }
      return scrivi.apply(this, a);
    };
    try { req.ingresso = ingresso.leggi(req); }
    catch (e) { log?.warn?.('accesso, leggere la sessione:', e?.message || e); req.ingresso = { stato: 'nessuno' }; if (req.session) req.session.user = null; }
    const { stato, motivo } = req.ingresso;
    if (stato !== 'attesa' && stato !== 'chiusa') return next();
    if (stato === 'attesa' && req.path === '/auth/logout') return next();
    if (!CASA_PANNELLO.has(req.path) && aperto(req.path)) return next();
    const dove = stato === 'attesa' ? '/seconda-prova' : '/ingresso';
    const pagina = req.method === 'GET' && String(req.headers.accept || '').includes('text/html');
    if (pagina) return stato === 'attesa' || motivo === 'anomalia' ? res.redirect(dove) : next();
    return res.status(401).json({ errore: stato === 'attesa' ? 'seconda-prova' : (motivo === 'anomalia' ? 'anomalia' : 'non autenticato'), vai: dove });
  });
}

// Cosa il pannello deve dire alla persona appena entrata, una volta.
export function avvisoPer(ingresso, store, login, postaAttiva) {
  const f = ingresso.fattoriDi(login);
  const p = store.persona(login);
  if (f.passkey > 0 && !p.avviso_passkey) return 'passkey';
  if (f.passkey > 0 && !f.totp && !f.mail && postaAttiva && !p.proposta_mail) return 'mail';
  return '';
}
