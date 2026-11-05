// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ACCESSO SICURO, la parte che decide (docs/ACCESSO-SICURO.md). Le garanzie
// stanno nello schema (db.js, ingressoDb); qui c'e' chi le usa.
//
// LA SESSIONE LEGATA, per costruzione. Il cookie firmato porta la persona
// (`session.user`) e il numero della riga sul server (`session.sid`); l'oggetto
// della persona porta a sua volta `legato`, il sid a cui e' stato legato.
//  · Ogni risposta, prima di partire, lega una persona appena messa in sessione
//    (`lega`, chiamata da server.js sull'intestazione): qualunque porta la metta
//    li' — Twitch, Kick, YouTube, Discord, Telegram, il pass, un domani un'altra —
//    nasce una riga «in attesa del secondo fattore». Una porta nuova che si
//    dimenticasse del secondo fattore non lo salta: non sa nemmeno di doverlo fare.
//  · Ogni richiesta, prima di tutto, legge la riga (`leggi`): vale solo se c'e',
//    e' aperta, non e' scaduta, e' della stessa persona e la famiglia del browser
//    non e' cambiata. Se no la persona esce dalla sessione, subito.
//  · Solo `apri(…, { prova: true })` (la passkey) e `provata` (il secondo fattore
//    dato) mettono la riga a prova=1.
import crypto from 'node:crypto';
import { impronta } from '../segreti.js';
import { improntaDi, giudica } from './ingresso-impronta.js';
import * as totp from './ingresso-totp.js';
import * as parola from './ingresso-password.js';
import { eMail } from '../identita.js';

// IL CONTO APRE IL PANNELLO? Una regola sola, che server.js usa in haAccesso (la
// sola fonte dei contesti del pannello): un conto nato con la mail solo approvato.
export const contoApribile = (login, streamer) => !!login && (!eMail(login) || streamer?.status === 'approved');

export const PRIMA_MS = 30 * 86_400_000;          // i cookie senza sid: ancora 30 giorni dal primo avvio
export const DURATE = [1, 7, 14, 30];
export const CODICE_MAIL_MS = 10 * 60_000;
export const TENTATIVI_CODICE = 5;
export const RISERVE = 10;
export const ALFABETO_RISERVA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // senza 0/O, 1/I/L
export const MOTIVI_CHIUSURA = ['anomalia', 'uscita', 'cambio', 'scaduta', 'altrove', 'vecchia'];

// I TETTI della porta: una finestra per chiave (indirizzo o conto). In memoria:
// un riavvio li azzera, e la difesa vera sta nello schema e nella prova di lavoro.
const finestre = new Map();
export function tetto(chiave, max, finestraMs, ora = Date.now()) {
  if (finestre.size > 20_000) for (const [k, v] of finestre) if (ora >= v.fine) finestre.delete(k);
  let r = finestre.get(chiave);
  if (!r || ora >= r.fine) { r = { n: 0, fine: ora + finestraMs }; finestre.set(chiave, r); }
  r.n++;
  return r.n <= max;
}
export const azzeraTetti = () => finestre.clear();

// Confronto di un'impronta con un elenco, a tempo costante e senza fermarsi.
export function trovaImpronta(cercata, righe) {
  const a = Buffer.from(String(cercata));
  let trovata = null;
  for (const r of righe) {
    const b = Buffer.from(String(r.impronta));
    const uguale = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (uguale && !trovata) trovata = r;
  }
  return trovata;
}

export const normMail = (s) => String(s || '').trim().toLowerCase();
export const mailNascosta = (m) => {
  const [n, d] = String(m || '').split('@');
  if (!d) return '';
  return (n.length <= 2 ? n[0] + '*' : n.slice(0, 2) + '***') + '@' + d;
};
export const codiceMailNuovo = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const codiceRiservaNuovo = () => {
  let c = '';
  for (let i = 0; i < 8; i++) c += ALFABETO_RISERVA[crypto.randomInt(ALFABETO_RISERVA.length)];
  return c.slice(0, 4) + '-' + c.slice(4);
};
const pulisciCodice = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const improntaCodice = (tipo, login, codice) => impronta(pulisciCodice(codice), `ingresso-${tipo}|${String(login).toLowerCase()}`);
export const improntaMail = (mail) => impronta(normMail(mail), 'ingresso-mail');

// Le parole della mail col codice, nella lingua di chi lo chiede.
export const TESTI_MAIL = {
  it: { oggetto: 'Il tuo codice per entrare in SocialBot', titolo: 'Il tuo codice', vale: 'Vale 10 minuti, una volta sola.', non: 'Se non sei stato tu, non fare niente: senza questo codice non entra nessuno.', piede: 'SocialBot · socialbot.live · questa mail arriva solo quando qualcuno chiede un codice.' },
  en: { oggetto: 'Your code to get into SocialBot', titolo: 'Your code', vale: 'It works for 10 minutes, once.', non: 'If it was not you, do nothing: without this code nobody gets in.', piede: 'SocialBot · socialbot.live · this email only arrives when someone asks for a code.' },
  es: { oggetto: 'Tu código para entrar en SocialBot', titolo: 'Tu código', vale: 'Vale 10 minutos, una sola vez.', non: 'Si no fuiste tú, no hagas nada: sin este código no entra nadie.', piede: 'SocialBot · socialbot.live · este correo solo llega cuando alguien pide un código.' },
};
export function mailCodice(codice, lingua = 'it', posta = null) {
  const t = TESTI_MAIL[lingua] || TESTI_MAIL.it;
  const bello = codice.slice(0, 3) + ' ' + codice.slice(3);
  const corpo = `<p style="margin:0 0 14px;font-size:30px;font-weight:bold;letter-spacing:.14em;">${bello}</p><p style="margin:0 0 10px;">${t.vale}</p><p style="margin:0;">${t.non}</p>`;
  return {
    oggetto: t.oggetto,
    testo: `${t.titolo}: ${bello}\n${t.vale}\n${t.non}`,
    html: posta?.guscioHtml ? posta.guscioHtml({ titolo: t.titolo, corpo, piede: t.piede }) : '',
  };
}

// Chi prova a registrarsi con una mail che e' gia' di casa riceve questa, al
// posto del codice: la porta risponde uguale, e la mail dice a chi e' davvero.
export const TESTI_GIA = {
  it: { oggetto: 'Hai già un accesso a SocialBot', titolo: 'Hai già un accesso', testo: 'Qualcuno ha provato a registrarsi con questa mail, ma un accesso con questa mail c’è già. Per entrare usa «Entra con un codice per mail». Se non sei stato tu, non fare niente.' },
  en: { oggetto: 'You already have a SocialBot sign-in', titolo: 'You already have a sign-in', testo: 'Someone tried to sign up with this email, but there is already a sign-in with it. To get in, use «Sign in with an email code». If it was not you, do nothing.' },
  es: { oggetto: 'Ya tienes un acceso a SocialBot', titolo: 'Ya tienes un acceso', testo: 'Alguien ha intentado registrarse con este correo, pero ya hay un acceso con él. Para entrar usa «Entra con un código por correo». Si no fuiste tú, no hagas nada.' },
};
export function mailGiaDiCasa(lingua = 'it', posta = null) {
  const t = TESTI_GIA[lingua] || TESTI_GIA.it;
  return { oggetto: t.oggetto, testo: t.testo, html: posta?.guscioHtml ? posta.guscioHtml({ titolo: t.titolo, corpo: `<p style="margin:0;">${t.testo}</p>` }) : '' };
}

const VIE = [
  [/^\/auth\/callback/, 'twitch'], [/^\/auth\/kick/, 'kick'], [/^\/auth\/youtube/, 'youtube'], [/^\/discord\//, 'discord'],
  [/^\/entra/, 'pass'], [/^\/api\/tgapp|^\/telegram\/oidc/, 'telegram'], [/^\/abbonamento/, 'abbonamento'],
];
export const viaDi = (percorso) => (VIE.find(([re]) => re.test(String(percorso || ''))) || [null, 'altro'])[1];

export function creaIngresso({ store, identitaDi, passkeyQuante = () => 0, posta = null, ora = () => Date.now(), log = null }) {
  const durataMs = (login) => {
    const g = Number(store.persona(login).durata);
    return (DURATE.includes(g) ? g : 30) * 86_400_000;
  };
  const improntaReq = (req) => improntaDi({ ua: req.get?.('user-agent') || req.headers?.['user-agent'] || '', ip: req.ip || req.socket?.remoteAddress || '' });

  // Fuori dalla sessione: la persona esce, il resto del cookie resta (una
  // prova di lavoro a meta', la lingua). Solo l'anomalia lascia il suo messaggio.
  function fuori(req, motivo) {
    const s = req.session;
    if (!s) return;
    s.user = null;
    delete s.sid;
    if (motivo === 'anomalia') s.avviso = 'anomalia';
  }

  function nuova(req, login, { via = 'altro', prova = false } = {}) {
    const imp = improntaReq(req);
    const sid = crypto.randomBytes(16).toString('base64url');
    const t = ora();
    store.apriSessione({ sid, login, ...imp, via, prova, ora: t, scade: t + durataMs(login) });
    store.annota(login, 'ingresso', { ...imp, nota: via }, t);
    req.session.sid = sid;
    req.session.user.legato = sid;
    return sid;
  }

  // LEGARE: la persona appena messa in sessione prende la sua riga. La stessa
  // persona con una riga ancora viva (cambiare canale, rientrare dallo stesso
  // browser) resta sulla sua; un'altra persona chiude quella di prima.
  function lega(req, { via = null, prova = false } = {}) {
    const s = req.session;
    const u = s?.user;
    if (!u) return null;
    const login = identitaDi(u);
    if (!login) return null;
    if (u.legato && u.legato === s.sid && !prova) return s.sid;
    const viva = store.sessioneViva(s.sid, ora());
    if (viva && viva.login === login) {
      u.legato = viva.sid;
      if (prova && !viva.prova) { store.provata(viva.sid); store.annota(login, 'prova', { ...improntaReq(req), nota: via || 'passkey' }, ora()); }
      return viva.sid;
    }
    if (viva) store.chiudi(viva.sid, 'cambio', ora());
    return nuova(req, login, { via: via || viaDi(req.path), prova });
  }

  // LEGGERE, a ogni richiesta. Ritorna lo stato della persona in sessione:
  // 'nessuno' | 'aperta' | 'attesa' | 'chiusa' (con il motivo).
  function leggi(req) {
    const s = req.session;
    const u = s?.user;
    if (!u) return { stato: 'nessuno' };
    const login = identitaDi(u);
    if (!u.legato) {
      // un cookie di prima di questa versione: vale ancora un po', e come un ingresso nuovo
      if (ora() > store.avvio(ora()) + PRIMA_MS) { fuori(req, 'vecchia'); return { stato: 'chiusa', motivo: 'vecchia' }; }
      nuova(req, login, { via: 'prima' });
      return { stato: 'attesa', login };
    }
    const riga = u.legato === s.sid ? store.sessione(s.sid) : null;
    if (!riga || riga.chiusa || riga.scade <= ora() || riga.login !== login) {
      const motivo = riga?.chiusa ? riga.motivo : 'scaduta';
      fuori(req, motivo);
      return { stato: 'chiusa', motivo };
    }
    const adesso = improntaReq(req);
    const g = giudica(riga, adesso);
    if (g.anomalia) {
      store.chiudi(riga.sid, 'anomalia', ora());
      store.annota(login, 'anomalia', { ...adesso, nota: g.perche }, ora());
      log?.warn?.(`accesso: sessione chiusa per anomalia (${g.perche}) di @${login}`);
      fuori(req, 'anomalia');
      return { stato: 'chiusa', motivo: 'anomalia' };
    }
    if (g.reteCambiata || ora() - riga.vista > 60_000) store.vista(riga.sid, adesso.rete, ora());
    return { stato: riga.prova ? 'aperta' : 'attesa', login, riga };
  }

  function esci(req, motivo = 'uscita') {
    const sid = req.session?.sid;
    if (!sid) return;
    const r = store.sessione(sid);
    if (store.chiudi(sid, motivo, ora()) && r) store.annota(r.login, 'uscita', { motore: r.motore, sistema: r.sistema, rete: r.rete }, ora());
  }

  // ── i fattori ──────────────────────────────────────────────────────────
  function fattoriDi(login) {
    const f = store.fattori(login);
    const mail = f.some((x) => x.tipo === 'mail') ? store.fattore(login, 'mail') : null;
    return {
      passkey: passkeyQuante(login),
      totp: f.some((x) => x.tipo === 'totp'),
      mail: mail ? mailNascosta(mail.segreto) : '',
      password: f.some((x) => x.tipo === 'password'),
      riserve: store.riserveRimaste(login),
    };
  }
  const quantiFattori = (f) => (f.passkey > 0 ? 1 : 0) + (f.totp ? 1 : 0) + (f.mail ? 1 : 0) + (f.password ? 1 : 0);
  const haFattore = (login) => quantiFattori(fattoriDi(login)) > 0;
  // LA SECONDA PROVA E' DI UN ALTRO TIPO DALLA PRIMA: chi e' entrato con la mail
  // non la riusa, chi e' entrato con la password nemmeno. Quello che resta e'
  // quello che si puo' usare adesso.
  function fattoriUsabili(login, via) {
    const f = fattoriDi(login);
    if (via === 'mail') f.mail = '';
    if (via === 'password') f.password = false;
    return f;
  }

  // La prova data: la riga in attesa diventa aperta. Vale solo per una riga viva.
  function provata(req, login, come) {
    const sid = req.session?.sid;
    const riga = store.sessioneViva(sid, ora());
    if (!riga || riga.login !== String(login).toLowerCase()) return false;
    store.provata(sid);
    store.annota(login, 'prova', { motore: riga.motore, sistema: riga.sistema, rete: riga.rete, nota: come }, ora());
    return true;
  }

  // Il codice per mail: uno nuovo brucia quello di prima.
  async function mandaCodice(login, indirizzo, scopo, lingua) {
    const codice = codiceMailNuovo();
    store.nuovoCodiceMail(login, scopo, improntaCodice('mail', login, codice), ora() + CODICE_MAIL_MS, ora());
    const m = mailCodice(codice, lingua, posta);
    await posta.invia({ a: indirizzo, oggetto: m.oggetto, testo: m.testo, html: m.html });
    return true;
  }
  // Giusto o sbagliato; lo sbagliato conta, e al quinto il codice e' bruciato.
  function usaCodiceMail(login, scopo, scritto) {
    const r = trovaImpronta(improntaCodice('mail', login, scritto), store.candidati(login, 'mail', scopo, ora()));
    if (r && store.usaCodice(r.id, ora())) return true;
    store.sbagliato(login, TENTATIVI_CODICE);
    return false;
  }
  function nuoveRiserve(login) {
    const codici = Array.from({ length: RISERVE }, codiceRiservaNuovo);
    store.nuoveRiserve(login, codici.map((c) => improntaCodice('riserva', login, c)), ora());
    return codici;
  }
  function usaRiserva(login, scritto) {
    if (pulisciCodice(scritto).length !== 8) return false;
    const r = trovaImpronta(improntaCodice('riserva', login, scritto), store.candidati(login, 'riserva', null, ora()));
    const ok = !!r && store.usaCodice(r.id, ora());
    if (ok) store.annota(login, 'riserva', { nota: `restano ${store.riserveRimaste(login)}` }, ora());
    return ok;
  }
  // L'app: il segreto si prepara (attivo=0), si conferma con un codice giusto.
  function preparaTotp(login) {
    const segreto = totp.nuovoSegreto();
    store.prepara(login, 'totp', segreto, '', ora());
    return segreto;
  }
  function usaTotp(login, codice, { attivo = 1 } = {}) {
    const f = store.fattore(login, 'totp', attivo);
    if (!f) return false;
    const passo = totp.passoCheCombacia(f.segreto, codice, ora());
    return passo > 0 && store.usaPasso(login, passo, attivo);
  }
  function confermaTotp(login, codice) {
    const f = store.fattore(login, 'totp', 0);
    if (!f) return false;
    const passo = totp.passoCheCombacia(f.segreto, codice, ora());
    if (!(passo > 0)) return false;
    return store.conferma(login, 'totp', passo);
  }
  function preparaMail(login, indirizzo) { store.prepara(login, 'mail', normMail(indirizzo), improntaMail(indirizzo), ora()); }
  // 'ok' | 'no' | 'presa' (la mail e' gia' di un'altra persona: l'indice dice di no)
  const confermaMail = (login) => store.confermaSeLibera(login, 'mail', 0);
  // Entrare con la mail: solo chi ha anche un'altra prova, perche' la mail sara'
  // la prima e il secondo fattore deve essere un altro.
  function chiPerMail(indirizzo) {
    const login = store.perMail(improntaMail(indirizzo));
    if (!login) return '';
    if (eMail(login)) return login;            // un conto nato con la mail: la mail e' il conto
    const f = fattoriDi(login);
    return f.passkey > 0 || f.totp ? login : '';
  }
  // LA PASSWORD: solo il calco, nella busta; confrontata a tempo costante.
  async function mettiPassword(login, chiara) {
    store.prepara(login, 'password', await parola.calco(chiara), '', ora());
    return store.conferma(login, 'password', 0);
  }
  function mettiCalco(login, calcoPronto) {
    if (!parola.eCalco(calcoPronto)) return false;
    store.prepara(login, 'password', calcoPronto, '', ora());
    return store.conferma(login, 'password', 0);
  }
  async function usaPassword(login, chiara) {
    const f = store.fattore(login, 'password');
    return !!f && await parola.combacia(String(chiara ?? ''), f.segreto);
  }

  // Togliere un fattore: mai l'ultimo (codici di riserva a parte).
  function puoTogliere(login, tipo) {
    if (tipo === 'mail' && eMail(login)) return false;   // la mail di un conto nato con la mail e' il conto
    const f = fattoriDi(login);
    const resta = { ...f, [tipo]: tipo === 'passkey' ? f.passkey - 1 : (tipo === 'mail' ? '' : false) };
    return quantiFattori(resta) > 0;
  }

  return { leggi, lega, esci, fuori, fattoriDi, haFattore, quantiFattori, provata, mandaCodice, usaCodiceMail, nuoveRiserve, usaRiserva,
    preparaTotp, usaTotp, confermaTotp, preparaMail, confermaMail, chiPerMail, puoTogliere, improntaReq, durataMs,
    fattoriUsabili, mettiPassword, mettiCalco, usaPassword };
}
