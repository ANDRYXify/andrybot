// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I DISPOSITIVI DELLO STUDIO (docs/DIRETTA.md, «Più dispositivi, una regia»).
//
// Il computer con lo Studio aperto e' la REGIA: compone, codifica e manda la
// diretta. Telefoni, tablet e altri computer si collegano come FOTOCAMERE: il
// loro video e il loro audio vanno alla regia direttamente, in WebRTC, cifrati
// da un capo all'altro. Qui passano solo i segnali per trovarsi (l'offerta, la
// risposta, i candidati di rete), mai le immagini.
//
// Gli invarianti, ognuno provato in test/unita/studio-dispositivi.test.mjs:
//  · un segnale passa solo fra la regia di un canale e i dispositivi di quel
//    canale: mai da un canale all'altro, mai da una finestra che non e' piu'
//    la regia;
//  · una regia in diretta non si ruba: un'altra finestra aspetta che finisca;
//  · un invito vale una volta e per dieci minuti; la chiave di un dispositivo
//    non si conserva, se ne tiene l'impronta, e toglierlo la spegne subito;
//  · i dispositivi ricordati sono al massimo 8, quelli collegati insieme 4:
//    il nono entra al posto di quello visto meno di recente e non collegato;
//  · ogni regia ha un suo «giro»: la stessa finestra che si ricollega dopo un
//    buco dei segnali tiene il suo (il video, che va da pari a pari, non si
//    tocca), una finestra nuova ne ha uno nuovo (e i dispositivi rifanno il
//    collegamento da capo, perche' quella regia la loro sessione non l'ha
//    mai vista). Il giro e' l'impronta della finestra, non un numero tenuto
//    in memoria: anche dopo un riavvio del server (un aggiornamento) la
//    stessa finestra ha lo stesso giro, e il video che passa non si stacca;
//  · i codici sbagliati sono al massimo 200 al minuto in tutto, non solo per
//    indirizzo: chi prova da mille indirizzi non indovina un codice di sei
//    cifre nei dieci minuti in cui vale.
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const LIMITI_DISPOSITIVI = Object.freeze({
  ricordati: 8, collegati: 4, invitoMs: 10 * 60_000, bigliettoMs: 60_000,
  segnaleByte: 24_000, nome: 40, messaggiMinuto: 600, messaggiRegiaMinuto: 1200, codiciSbagliatiMinuto: 200,
});
export const TIPI_DAL_DISPOSITIVO = Object.freeze(['offerta', 'ice', 'fine']);
export const TIPI_DALLA_REGIA = Object.freeze(['risposta', 'ice', 'fine']);
export const STUN_PUBBLICI = Object.freeze(['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478']);

const ID = /^[a-z0-9]{10}$/;
const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const nomeDispositivo = (v) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LIMITI_DISPOSITIVI.nome);
export const improntaChiave = (chiave) => createHash('sha256').update(String(chiave)).digest('hex');

function stessaImpronta(a, b) {
  const x = Buffer.from(String(a || ''), 'hex'), y = Buffer.from(String(b || ''), 'hex');
  return x.length === 32 && y.length === 32 && timingSafeEqual(x, y);
}

// Le credenziali a tempo per un server TURN (coturn con «use-auth-secret»):
// il nome dice fino a quando valgono, la parola e' la firma del nome. Nessuna
// parola fissa esce dal server.
export function credenzialiTurn(turn, login, ora) {
  if (!turn?.url || !turn?.segreto) return null;
  const urls = String(turn.url).split(',').map((s) => s.trim()).filter((s) => /^turns?:/.test(s));
  if (!urls.length) return null;
  const username = `${Math.floor(ora / 1000) + (Number(turn.ttlS) || 6 * 3600)}:${String(login).toLowerCase()}`;
  return { urls, username, credential: createHmac('sha1', String(turn.segreto)).update(username).digest('base64') };
}

function valida(msg, tipi) {
  if (!msg || typeof msg !== 'object' || !tipi.includes(msg.tipo)) return null;
  let testo;
  try { testo = JSON.stringify(msg.dati ?? null); } catch { return null; }
  if (testo.length > LIMITI_DISPOSITIVI.segnaleByte) return null;
  return { tipo: msg.tipo, dati: JSON.parse(testo) };
}

export function creaSalotto({ archivio, ora = () => Date.now(), casuale = randomBytes, turn = null } = {}) {
  const inviti = new Map();
  const biglietti = new Map();
  const canali = new Map();
  const conti = new Map();

  const manda = (scrivi, evento, dati) => { try { scrivi(evento, dati); } catch { /* chi non ascolta piu' se ne va da solo */ } };
  const parola = (n) => casuale(n).toString('base64url');
  const nuovoId = () => [...casuale(10)].map((b) => ALFABETO[b % 36]).join('');
  const canale = (login) => {
    let c = canali.get(login);
    if (!c) { c = { regia: null, disp: new Map() }; canali.set(login, c); }
    return c;
  };
  const vuoto = (login) => { const c = canali.get(login); if (c && !c.regia && !c.disp.size) canali.delete(login); };
  const pulisci = () => {
    const t = ora();
    for (const [k, v] of inviti) if (v.scade <= t) inviti.delete(k);
    for (const [k, v] of biglietti) if (v.scade <= t) biglietti.delete(k);
    for (const [k, v] of conti) if (t - v.da >= 60_000) conti.delete(k);
  };
  const permesso = (chiave, max, finestraMs = 60_000) => {
    const t = ora();
    let c = conti.get(chiave);
    if (!c || t - c.da >= finestraMs) { c = { n: 0, da: t }; conti.set(chiave, c); }
    c.n++;
    return c.n <= max;
  };
  const vestito = (login, r) => ({ id: r.id, nome: r.nome, comanda: !!r.comanda, creato: r.creato, visto: r.visto, collegato: !!canali.get(login)?.disp.has(r.id) });

  return {
    permesso,

    invita(login) {
      pulisci();
      const l = String(login).toLowerCase();
      let codice;
      do { codice = String(casuale(4).readUInt32BE(0) % 1_000_000).padStart(6, '0'); } while ([...inviti.values()].some((i) => i.codice === codice));
      const token = parola(18);
      const scade = ora() + LIMITI_DISPOSITIVI.invitoMs;
      inviti.set(token, { login: l, codice, scade });
      return { token, codice, scade };
    },

    invito(token) {
      pulisci();
      const i = inviti.get(String(token || ''));
      return i ? { login: i.login, scade: i.scade } : null;
    },

    entra({ token = '', codice = '', nome = '', login: diSessione = '' } = {}) {
      pulisci();
      let login = String(diSessione || '').toLowerCase();
      if (!login) {
        let t = token && inviti.has(String(token)) ? String(token) : '';
        if (!t && /^\d{6}$/.test(String(codice))) {
          const sbagliati = conti.get('codici-sbagliati');
          if (sbagliati && ora() - sbagliati.da < 60_000 && sbagliati.n >= LIMITI_DISPOSITIVI.codiciSbagliatiMinuto) return { ok: false, motivo: 'fretta' };
          t = [...inviti].find(([, v]) => v.codice === String(codice))?.[0] || '';
          if (!t) permesso('codici-sbagliati', Infinity);
        }
        if (!t) return { ok: false, motivo: 'invito' };
        login = inviti.get(t).login;
        inviti.delete(t);
      }
      const ricordati = archivio.elenco(login);
      if (ricordati.length >= LIMITI_DISPOSITIVI.ricordati) {
        const via = ricordati.filter((r) => !canali.get(login)?.disp.has(r.id)).sort((a, b) => a.visto - b.visto)[0];
        if (!via) return { ok: false, motivo: 'troppi' };
        archivio.togli(login, via.id);
      }
      const id = nuovoId(), chiave = parola(24), t = ora();
      archivio.salva(login, { id, nome: nomeDispositivo(nome) || 'Dispositivo', impronta: improntaChiave(chiave), comanda: !!diSessione, creato: t, visto: t });
      return { ok: true, login, id, chiave };
    },

    riconosci(login, id, chiave) {
      const l = String(login || '').toLowerCase();
      if (!ID.test(String(id || '')) || !chiave) return null;
      const r = archivio.trova(l, String(id));
      return r && stessaImpronta(r.impronta, improntaChiave(chiave)) ? r : null;
    },

    biglietto(login, id) {
      pulisci();
      const b = parola(18);
      biglietti.set(b, { login: String(login).toLowerCase(), id: String(id), scade: ora() + LIMITI_DISPOSITIVI.bigliettoMs });
      return b;
    },

    usaBiglietto(b) {
      pulisci();
      const v = biglietti.get(String(b || ''));
      if (!v) return null;
      biglietti.delete(String(b));
      return { login: v.login, id: v.id };
    },

    apriRegia(login, { id, scrivi, live = false }) {
      pulisci();
      const l = String(login).toLowerCase(), c = canale(l), rid = String(id);
      if (c.regia && c.regia.id !== rid && c.regia.live) return { ok: false, motivo: 'occupata' };
      if (c.regia && c.regia.id !== rid) manda(c.regia.scrivi, 'altrove', {});
      const giro = createHash('sha256').update(l + '/' + rid).digest('base64url').slice(0, 12);
      c.regia = { id: rid, scrivi, live: !!live, giro };
      for (const [did, d] of c.disp) {
        manda(d.scrivi, 'regia', { c: true, giro });
        manda(scrivi, 'presenza', { id: did, nome: d.nome, comanda: d.comanda, collegato: true });
      }
      return { ok: true, giro };
    },

    chiudiRegia(login, id) {
      const l = String(login).toLowerCase(), c = canali.get(l);
      if (!c?.regia || c.regia.id !== String(id)) return false;
      c.regia = null;
      for (const d of c.disp.values()) manda(d.scrivi, 'regia', { c: false });
      vuoto(l);
      return true;
    },

    statoRegia(login, id, { live }) {
      const c = canali.get(String(login).toLowerCase());
      if (!c?.regia || c.regia.id !== String(id)) return false;
      c.regia.live = !!live;
      return true;
    },

    apriDispositivo(login, id, scrivi) {
      const l = String(login).toLowerCase(), r = archivio.trova(l, String(id));
      if (!r) return { ok: false, motivo: 'sconosciuto' };
      const c = canale(l), gia = c.disp.get(r.id);
      if (!gia && c.disp.size >= LIMITI_DISPOSITIVI.collegati) { vuoto(l); return { ok: false, motivo: 'troppi' }; }
      if (gia) manda(gia.scrivi, 'altrove', {});
      c.disp.set(r.id, { scrivi, nome: r.nome, comanda: !!r.comanda });
      archivio.visto(l, r.id, ora());
      if (c.regia) manda(c.regia.scrivi, 'presenza', { id: r.id, nome: r.nome, comanda: !!r.comanda, collegato: true });
      return { ok: true, regia: !!c.regia, giro: c.regia?.giro || '', live: !!c.regia?.live, nome: r.nome, comanda: !!r.comanda };
    },

    chiudiDispositivo(login, id, scrivi) {
      const l = String(login).toLowerCase(), c = canali.get(l), d = c?.disp.get(String(id));
      if (!d || d.scrivi !== scrivi) return false;
      c.disp.delete(String(id));
      if (c.regia) manda(c.regia.scrivi, 'presenza', { id: String(id), nome: d.nome, comanda: d.comanda, collegato: false });
      vuoto(l);
      return true;
    },

    dalDispositivo(login, id, msg) {
      const l = String(login).toLowerCase(), c = canali.get(l);
      if (!c?.disp.has(String(id))) return { ok: false, motivo: 'scollegato' };
      const v = valida(msg, TIPI_DAL_DISPOSITIVO);
      if (!v) return { ok: false, motivo: 'messaggio' };
      if (!permesso(`d:${l}:${id}`, LIMITI_DISPOSITIVI.messaggiMinuto)) return { ok: false, motivo: 'fretta' };
      if (!c.regia) return { ok: false, motivo: 'nessuna-regia' };
      manda(c.regia.scrivi, 'segnale', { da: String(id), tipo: v.tipo, dati: v.dati });
      return { ok: true };
    },

    dallaRegia(login, regiaId, msg) {
      const l = String(login).toLowerCase(), c = canali.get(l);
      if (!c?.regia || c.regia.id !== String(regiaId)) return { ok: false, motivo: 'non-regia' };
      const d = c.disp.get(String(msg?.a || ''));
      if (!d) return { ok: false, motivo: 'scollegato' };
      const v = valida(msg, TIPI_DALLA_REGIA);
      if (!v) return { ok: false, motivo: 'messaggio' };
      if (!permesso(`r:${l}`, LIMITI_DISPOSITIVI.messaggiRegiaMinuto)) return { ok: false, motivo: 'fretta' };
      manda(d.scrivi, 'segnale', { tipo: v.tipo, dati: v.dati });
      return { ok: true };
    },

    presenza(login) {
      const c = canali.get(String(login).toLowerCase());
      return { regia: !!c?.regia, live: !!c?.regia?.live, collegati: c ? c.disp.size : 0 };
    },

    elenco(login) {
      const l = String(login).toLowerCase();
      return archivio.elenco(l).sort((a, b) => a.creato - b.creato).map((r) => vestito(l, r));
    },

    cambia(login, id, { nome, comanda } = {}) {
      const l = String(login).toLowerCase(), r = archivio.trova(l, String(id));
      if (!r) return null;
      const campi = {};
      if (nome !== undefined && nomeDispositivo(nome)) campi.nome = nomeDispositivo(nome);
      if (comanda !== undefined) campi.comanda = !!comanda;
      archivio.aggiorna(l, r.id, campi);
      const nuovo = { ...r, ...campi }, c = canali.get(l), d = c?.disp.get(r.id);
      if (d) {
        d.nome = nuovo.nome; d.comanda = !!nuovo.comanda;
        manda(d.scrivi, 'tu', { nome: nuovo.nome, comanda: !!nuovo.comanda });
        if (c.regia) manda(c.regia.scrivi, 'presenza', { id: r.id, nome: nuovo.nome, comanda: !!nuovo.comanda, collegato: true });
      }
      return vestito(l, nuovo);
    },

    togli(login, id) {
      const l = String(login).toLowerCase(), c = canali.get(l), d = c?.disp.get(String(id));
      archivio.togli(l, String(id));
      if (d) {
        manda(d.scrivi, 'tolto', {});
        c.disp.delete(String(id));
        if (c.regia) manda(c.regia.scrivi, 'presenza', { id: String(id), nome: d.nome, comanda: d.comanda, collegato: false });
        vuoto(l);
      }
      return true;
    },

    ice(login) {
      const t = credenzialiTurn(turn, login, ora());
      return { iceServers: [{ urls: [...STUN_PUBBLICI] }, ...(t ? [t] : [])], turn: !!t };
    },

    dimentica(login) {
      const l = String(login).toLowerCase(), c = canali.get(l);
      if (c) {
        for (const d of c.disp.values()) manda(d.scrivi, 'tolto', {});
        if (c.regia) manda(c.regia.scrivi, 'altrove', {});
        canali.delete(l);
      }
      for (const [k, v] of inviti) if (v.login === l) inviti.delete(k);
      for (const [k, v] of biglietti) if (v.login === l) biglietti.delete(k);
    },
  };
}
