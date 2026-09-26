// LE PUBBLICAZIONI AUTOMATICHE: la storia prima della diretta e la settimana,
// da sole, quando lo streamer le accende. Il ragionamento sta in
// docs/AUTOMATICHE.md; qui le regole che ne discendono.
//
//  · IL SERVER NON DISEGNA. Le immagini le prepara il pannello, con lo stesso
//    motore dell'anteprima, e qui si tengono fino al momento giusto. Ognuna
//    porta da dove e' nata: l'impronta della settimana e la versione delle
//    grafiche. Se nel frattempo una delle due e' cambiata, l'immagine
//    racconterebbe una settimana che non c'e' piu': non esce, e lo si dice.
//  · UNA VOLTA SOLA. Lo stato ricorda cosa e' uscito, per chiave: l'istante
//    d'inizio della diretta, l'istante d'uscita della settimana. Un giro che
//    ripassa, o due giri che si accavallano, non pubblicano due volte.
//  · NEL SUO TEMPO. La storia prima della diretta esce da «anticipo» prima
//    dell'inizio fino all'inizio, la settimana entro un'ora dall'ora scelta.
//    Un server fermo nel momento giusto non recupera fuori tempo.
//  · LA CONFERMA E' UNA SCELTA. Vale per un'uscita sola, si da' da un link
//    personale o dal pannello, e un salvataggio della settimana non la da'.
//
// Lo stato sta in un file per streamer, come la storia della diretta: le
// impostazioni si riscrivono da altre strade, e un interruttore che un
// salvataggio altrui potesse spegnere in silenzio sarebbe peggio di nessuno.
import crypto from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { prossimaDiretta, chiaveAtt } from './settimana.js';
import { fusoValido, prossimaVolta } from './discord-eventi.js';
import { guscioHtml, tastoHtml, codiceTesto } from './posta.js';

export const ANTICIPI = [15, 30, 60, 120, 180, 240, 360, 480, 720];
export const ANTICIPO_BASE = 120;
export const FINESTRA_SETTIMANA_MS = 3600_000;
export const RICHIESTA_PRIMA_MS = 24 * 3600_000;
export const IMMAGINI = ['prima-0', 'prima-1', 'prima-2', 'prima-3', 'prima-4', 'prima-5', 'prima-6', 'settimana-post', 'settimana-storia'];
const FATTE_MAX = 30;
const LOGIN_RE = /^[a-z0-9_]{1,40}$/;
const ORA_OK = /^([01]\d|2[0-3]):[0-5]\d$/;

export const cartella = () => join(config.dataDir, 'automatiche');

function via(login, cosa = '') {
  const l = String(login || '').toLowerCase();
  if (!LOGIN_RE.test(l)) throw new Error('nome non valido');
  return cosa ? join(cartella(), l, cosa) : join(cartella(), `${l}.json`);
}

function scriviFile(p, dati) {
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p + '.tmp', dati);
  renameSync(p + '.tmp', p);
}

// Quello che si puo' accendere, con i valori di serie. Tutto quello che arriva
// dal pannello passa di qui.
export function confDi(v = {}) {
  const p = v?.prima || {}, s = v?.settimana || {};
  const anticipo = Number(p.anticipo);
  const giorno = Number(s.giorno);
  return {
    prima: { attiva: p.attiva === true, anticipo: ANTICIPI.includes(anticipo) ? anticipo : ANTICIPO_BASE },
    settimana: {
      attiva: s.attiva === true,
      giorno: Number.isInteger(giorno) && giorno >= 0 && giorno <= 6 ? giorno : 6,
      ora: ORA_OK.test(String(s.ora || '')) ? String(s.ora) : '18:00',
      chiedi: s.chiedi !== false,
    },
  };
}

export function leggi(login) {
  let s = {};
  try { s = JSON.parse(readFileSync(via(login), 'utf8')) || {}; } catch { s = {}; }
  return {
    conf: confDi(s.conf),
    immagini: s.immagini && typeof s.immagini === 'object' ? s.immagini : {},
    prima: { fatte: Array.isArray(s.prima?.fatte) ? s.prima.fatte : [], ultima: s.prima?.ultima || null },
    settimana: {
      fatte: Array.isArray(s.settimana?.fatte) ? s.settimana.fatte : [],
      chiesta: Number(s.settimana?.chiesta) || 0,
      chiave: String(s.settimana?.chiave || ''),
      confermata: Number(s.settimana?.confermata) || 0,
      fermata: Number(s.settimana?.fermata) || 0,
      ultima: s.settimana?.ultima || null,
    },
  };
}

export const scrivi = (login, s) => scriviFile(via(login), JSON.stringify(s));

export function salvaConf(login, v) {
  const s = leggi(login);
  s.conf = confDi(v);
  scrivi(login, s);
  return s;
}

// Chi ha qualcosa di acceso: il giro passa solo da loro.
export function accese() {
  let nomi = [];
  try { nomi = readdirSync(cartella()).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)); } catch { nomi = []; }
  return nomi.filter((l) => LOGIN_RE.test(l)).filter((l) => { const c = leggi(l).conf; return c.prima.attiva || c.settimana.attiva; });
}

// ── le immagini ────────────────────────────────────────────────────────────
// L'impronta della settimana per le immagini: i giorni, il fuso e le
// categorie (che portano le copertine). La durata e il Programma di Twitch non
// cambiano cosa c'e' disegnato.
export function improntaImmagini(sett) {
  const dati = JSON.stringify([sett?.giorni || [], sett?.fuso || '', sett?.twitch?.categorie || {}]);
  return crypto.createHash('sha256').update(dati).digest('hex').slice(0, 16);
}

export function salvaImmagine(login, nome, byte, meta) {
  if (!IMMAGINI.includes(nome)) throw new Error('immagine sconosciuta');
  scriviFile(via(login, `${nome}.jpg`), byte);
  const s = leggi(login);
  s.immagini[nome] = {
    impronta: String(meta?.impronta || ''), rev: Number(meta?.rev) || 0,
    anticipo: Number(meta?.anticipo) || 0, testo: String(meta?.testo || '').slice(0, 2000), ts: Date.now(),
  };
  scrivi(login, s);
}

export function immagine(login, nome) {
  try { return readFileSync(via(login, `${nome}.jpg`)); } catch { return null; }
}

export function togliImmagini(login) {
  const s = leggi(login);
  for (const nome of IMMAGINI) { try { unlinkSync(via(login, `${nome}.jpg`)); } catch { /* non c'era */ } }
  s.immagini = {};
  scrivi(login, s);
}

// I perche' di un'uscita mancata che dipendono da noi: il codice va al
// pannello, che lo dice nella lingua di chi lo usa; la frase va su Telegram.
export const MOTIVI = {
  'non-pronta': 'la grafica non e\' pronta: apri le Grafiche, si prepara da sola',
  'settimana-cambiata': 'la settimana e\' cambiata dopo che la grafica e\' stata preparata: apri le Grafiche, si ripreparano da sole',
  'grafiche-cambiate': 'le grafiche sono cambiate dopo che l\'immagine e\' stata preparata: apri le Grafiche, si ripreparano da sole',
  'anticipo-cambiato': 'l\'anticipo e\' cambiato dopo che la grafica e\' stata preparata: apri le Grafiche, si ripreparano da sole',
  'in-diretta': 'eri gia\' in diretta: e\' uscita «Live ora», se l\'hai accesa',
  'non-confermata': 'non l\'hai confermata, quindi non l\'ho pubblicata',
  fermata: 'l\'hai fermata tu, quindi non l\'ho pubblicata',
  'nessun-posto': 'nella Settimana non c\'e\' nessun posto dove mandarla',
};

// Un'immagine e' buona se e' nata dalla settimana e dalle grafiche di adesso
// (e, per la storia prima della diretta, dall'anticipo di adesso: il testo
// «Stasera» o «Domani» dipende da quando esce). Se no, il codice del perche'.
export function motivoVecchia(meta, { impronta, rev, anticipo = null }) {
  if (!meta) return 'non-pronta';
  if (meta.impronta !== impronta) return 'settimana-cambiata';
  if (Number(meta.rev) !== Number(rev)) return 'grafiche-cambiate';
  if (anticipo !== null && Number(meta.anticipo) !== Number(anticipo)) return 'anticipo-cambiato';
  return '';
}
const esito = (r) => ({ ok: !!r.ok, saltata: !!r.saltata, codice: r.codice || '', errore: r.ok ? '' : String(r.codice ? MOTIVI[r.codice] : r.errore || '') });

// ── quando ─────────────────────────────────────────────────────────────────
const fusoDi = (sett) => (fusoValido(sett?.fuso) ? sett.fuso : 'Europe/Rome');

// La storia prima della diretta: la prossima diretta, se la sua finestra e'
// aperta e non e' gia' uscita.
export function primaDaFare({ sett, conf, fatte = [], adesso }) {
  if (!conf?.prima?.attiva) return null;
  const p = prossimaDiretta(sett, new Date(adesso));
  if (!p) return null;
  const esce = p.quando - conf.prima.anticipo * 60_000;
  if (adesso < esce || fatte.includes(p.quando)) return null;
  return { per: p.quando, giorno: p.giorno, esce };
}

// La prossima uscita della settimana, da adesso.
export function prossimaUscita({ sett, conf, adesso }) {
  const t = prossimaVolta(fusoDi(sett), [conf.settimana.giorno], conf.settimana.ora, new Date(adesso));
  return t ? t.getTime() : 0;
}

// L'uscita della settimana la cui finestra (un'ora) e' aperta adesso.
export function settimanaDaFare({ sett, conf, fatte = [], adesso }) {
  if (!conf?.settimana?.attiva) return null;
  const t = prossimaVolta(fusoDi(sett), [conf.settimana.giorno], conf.settimana.ora, new Date(adesso - FINESTRA_SETTIMANA_MS));
  const per = t ? t.getTime() : 0;
  if (!per || per > adesso || fatte.includes(per)) return null;
  return { per };
}

// La richiesta di conferma: 24 ore prima dell'uscita, una volta.
export function richiestaDaFare({ sett, conf, stato, adesso }) {
  if (!conf?.settimana?.attiva || !conf.settimana.chiedi) return null;
  const per = prossimaUscita({ sett, conf, adesso });
  if (!per || adesso < per - RICHIESTA_PRIMA_MS) return null;
  if (stato.settimana.chiesta === per || stato.settimana.confermata === per || stato.settimana.fermata === per) return null;
  return { per };
}

// ── la conferma ────────────────────────────────────────────────────────────
const impronta = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// Prepara la richiesta: la chiave del link si restituisce una volta sola, e
// si tiene solo la sua impronta.
export function preparaRichiesta(login, per) {
  const chiave = crypto.randomBytes(24).toString('base64url');
  const s = leggi(login);
  s.settimana.chiesta = per;
  s.settimana.chiave = impronta(chiave);
  scrivi(login, s);
  return chiave;
}

// Confermata e fermata sono due risposte alla stessa domanda: per un'uscita ne
// vale una sola, l'ultima data. Chi ha confermato e poi vede un errore la
// ferma; chi l'ha fermata e ci ripensa la conferma.
function decidi(s, per, come) {
  s.settimana.confermata = come === 'conferma' ? per : (s.settimana.confermata === per ? 0 : s.settimana.confermata);
  s.settimana.fermata = come === 'ferma' ? per : (s.settimana.fermata === per ? 0 : s.settimana.fermata);
}

// Dal link della mail: vale per l'uscita per cui e' stato mandato, e solo
// finche' non e' passata. `come` e' 'conferma' o 'ferma'.
export function decidiConChiave(login, chiave, come, adesso = Date.now()) {
  const s = leggi(login);
  const atteso = s.settimana.chiave;
  const dato = impronta(chiave || '');
  if (!atteso || atteso.length !== dato.length || !crypto.timingSafeEqual(Buffer.from(atteso), Buffer.from(dato))) return { ok: false, motivo: 'link' };
  if (!s.settimana.chiesta || s.settimana.chiesta <= adesso) return { ok: false, motivo: 'scaduto' };
  decidi(s, s.settimana.chiesta, come === 'ferma' ? 'ferma' : 'conferma');
  scrivi(login, s);
  return { ok: true, per: s.settimana.chiesta };
}
export const confermaConChiave = (login, chiave, adesso = Date.now()) => decidiConChiave(login, chiave, 'conferma', adesso);
export const fermaConChiave = (login, chiave, adesso = Date.now()) => decidiConChiave(login, chiave, 'ferma', adesso);

// Il link porta a una pagina che chiede di premere: questa dice per quale
// uscita vale, senza confermare niente.
export function richiestaDi(login, chiave, adesso = Date.now()) {
  const s = leggi(login);
  const dato = impronta(chiave || '');
  const ok = s.settimana.chiave && s.settimana.chiave.length === dato.length && crypto.timingSafeEqual(Buffer.from(s.settimana.chiave), Buffer.from(dato));
  if (!ok) return null;
  return { per: s.settimana.chiesta, scaduta: !s.settimana.chiesta || s.settimana.chiesta <= adesso,
    confermata: s.settimana.confermata === s.settimana.chiesta, fermata: s.settimana.fermata === s.settimana.chiesta };
}

// Dal pannello: la prossima uscita.
function decidiDalPannello(login, sett, come, adesso) {
  const s = leggi(login);
  const per = prossimaUscita({ sett, conf: s.conf, adesso });
  if (!per) return { ok: false };
  decidi(s, per, come);
  scrivi(login, s);
  return { ok: true, per };
}
export const confermaDalPannello = (login, sett, adesso = Date.now()) => decidiDalPannello(login, sett, 'conferma', adesso);
export const fermaDalPannello = (login, sett, adesso = Date.now()) => decidiDalPannello(login, sett, 'ferma', adesso);

// ── il giro ────────────────────────────────────────────────────────────────
// Ogni minuto, per chi ha qualcosa di acceso. Quello che serve da fuori arriva
// come funzione, cosi' le prove lo sostituiscono senza toccare la rete.
const inCorso = new Set();
const ricorda = (lista, v) => [...lista.filter((x) => x !== v), v].slice(-FATTE_MAX);

export async function giro(login, { sett, rev, adesso = Date.now(), inDiretta = false, pubblicaStoria, mandaSettimana, chiediConferma, avvisa = async () => {} }) {
  if (inCorso.has(login)) return [];
  inCorso.add(login);
  const fatto = [];
  try {
    const imp = improntaImmagini(sett);
    let s = leggi(login);

    const p = primaDaFare({ sett, conf: s.conf, fatte: s.prima.fatte, adesso });
    if (p) {
      s.prima.fatte = ricorda(s.prima.fatte, p.per);
      scrivi(login, s);
      const nome = `prima-${p.giorno}`;
      let r;
      if (inDiretta) r = { ok: false, saltata: true, codice: 'in-diretta' };
      else {
        const motivo = motivoVecchia(s.immagini[nome], { impronta: imp, rev, anticipo: s.conf.prima.anticipo });
        const byte = motivo ? null : immagine(login, nome);
        r = byte ? await pubblicaStoria(byte) : { ok: false, codice: motivo || 'non-pronta' };
      }
      s = leggi(login);
      s.prima.ultima = { ts: adesso, per: p.per, ...esito(r) };
      scrivi(login, s);
      fatto.push({ cosa: 'prima', ...s.prima.ultima });
      if (!r.ok && !r.saltata) await avvisa('prima', s.prima.ultima);
    }

    const q = richiestaDaFare({ sett, conf: s.conf, stato: s, adesso });
    if (q) {
      const chiave = preparaRichiesta(login, q.per);
      await chiediConferma(q.per, chiave);
      s = leggi(login);
      fatto.push({ cosa: 'richiesta', per: q.per });
    }

    const w = settimanaDaFare({ sett, conf: s.conf, fatte: s.settimana.fatte, adesso });
    if (w) {
      s.settimana.fatte = ricorda(s.settimana.fatte, w.per);
      scrivi(login, s);
      let r;
      if (s.settimana.fermata === w.per) r = { ok: false, saltata: true, codice: 'fermata' };
      else if (s.conf.settimana.chiedi && s.settimana.confermata !== w.per) r = { ok: false, saltata: true, codice: 'non-confermata' };
      else {
        const motivo = motivoVecchia(s.immagini['settimana-post'], { impronta: imp, rev }) || motivoVecchia(s.immagini['settimana-storia'], { impronta: imp, rev });
        const post = motivo ? null : immagine(login, 'settimana-post'), storia = motivo ? null : immagine(login, 'settimana-storia');
        r = post && storia
          ? await mandaSettimana({ byte: post, storia, testo: s.immagini['settimana-post'].testo || '' })
          : { ok: false, codice: motivo || 'non-pronta' };
      }
      s = leggi(login);
      s.settimana.ultima = { ts: adesso, per: w.per, ...esito(r), esiti: r.esiti || [] };
      scrivi(login, s);
      fatto.push({ cosa: 'settimana', ...s.settimana.ultima });
      if (!r.ok) await avvisa('settimana', s.settimana.ultima);
    }
  } finally { inCorso.delete(login); }
  return fatto;
}

// Quello che vede il pannello: cosa e' acceso, quando esce la prossima, com'e'
// andata l'ultima, e se la settimana aspetta una conferma.
export function vista(login, { sett, rev, adesso = Date.now() }) {
  const s = leggi(login);
  const imp = improntaImmagini(sett);
  const p = prossimaDiretta(sett, new Date(adesso));
  const uscita = prossimaUscita({ sett, conf: s.conf, adesso });
  const pronte = Object.fromEntries(IMMAGINI.map((n) => [n, !motivoVecchia(s.immagini[n], { impronta: imp, rev, anticipo: n.startsWith('prima') ? s.conf.prima.anticipo : null })]));
  // I giorni in onda con la loro prossima volta: il pannello ne prepara una
  // storia per giorno, col testo riferito al momento in cui uscira'.
  const cat = sett?.twitch?.categorie || {};
  const slot = (sett?.giorni || []).map((g, i) => {
    if (!g || g.off || !g.ora) return null;
    const t = prossimaVolta(fusoDi(sett), [i], g.ora, new Date(adesso));
    if (!t) return null;
    const c = cat[chiaveAtt(g.att)] || null;
    return { giorno: i, quando: t.getTime(), esce: t.getTime() - s.conf.prima.anticipo * 60_000, ora: g.ora, att: g.att,
      categoria: String(c?.name || ''), categoriaId: /^\d{1,12}$/.test(String(c?.id || '')) ? String(c.id) : '', fuso: fusoDi(sett) };
  }).filter(Boolean);
  return {
    conf: s.conf, impronta: imp, pronte,
    prima: { prossima: p ? { per: p.quando, esce: p.quando - s.conf.prima.anticipo * 60_000, giorno: p.giorno } : null, ultima: s.prima.ultima, slot },
    settimana: {
      prossima: uscita || null,
      confermata: !!uscita && s.settimana.confermata === uscita,
      fermata: !!uscita && s.settimana.fermata === uscita,
      chiesta: !!uscita && s.settimana.chiesta === uscita,
      ultima: s.settimana.ultima,
    },
  };
}

// ── la richiesta, a parole ─────────────────────────────────────────────────
export const GIORNI_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const escH = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const righeSettimana = (sett) => (sett?.giorni || []).map((g, i) => (g && !g.off && g.ora
  ? `${GIORNI_IT[i]} alle ${g.ora}${g.att ? ` · ${g.att}` : ''}` : `${GIORNI_IT[i]}: riposo`));
export const quandoEsce = (sett, per) => new Intl.DateTimeFormat('it-IT', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: fusoDi(sett),
}).format(new Date(per));

// La mail che chiede se la settimana va bene: cosa uscira', quando, il tasto
// per confermare e la strada per cambiarla. Senza conferma non esce: lo dice.
// E c'e' anche «Non pubblicare», per chi ha confermato e poi vede un errore, o
// legge tardi: la ferma fino all'ultimo minuto, senza aprire il pannello.
export function mailRichiesta({ display = '', sett, per, link, ferma, cambia, codice = '' }) {
  const quando = quandoEsce(sett, per);
  const righe = righeSettimana(sett);
  const corpo = `<p style="margin:0 0 14px;">${escH(quando.charAt(0).toUpperCase() + quando.slice(1))} la tua settimana esce nei posti che hai scelto, uguale a questa:</p>
<ul style="margin:0 0 18px;padding-left:20px;line-height:1.7;">${righe.map((r) => `<li>${escH(r)}</li>`).join('')}</ul>
<p style="margin:0 0 18px;">${tastoHtml('Va bene così', link)}</p>
<p style="margin:0 0 12px;">Vuoi cambiarla? <a href="${escH(cambia)}">Apri la tua Settimana</a>. Finché non confermi, non esce.</p>
<p style="margin:0;">Non deve uscire? <a href="${escH(ferma)}">Non pubblicare</a>: la fermi anche dopo averla confermata, fino al momento dell'uscita.</p>`;
  return {
    oggetto: 'La tua settimana esce domani: va bene così?',
    html: guscioHtml({ titolo: 'La tua settimana, domani', cappello: display, corpo, codice,
      piede: 'SocialBot · socialbot.live · questa mail arriva il giorno prima di ogni uscita, finché la settimana automatica è accesa.' }),
    testo: `${quando} la tua settimana esce, uguale a questa:\n${righe.join('\n')}\n\nVa bene così: ${link}\nPer cambiarla: ${cambia}\nFinché non confermi, non esce.\nNon deve uscire? Non pubblicare, anche dopo averla confermata: ${ferma}${codiceTesto(codice)}`,
  };
}
