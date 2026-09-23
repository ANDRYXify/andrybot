// LA TUA SETTIMANA: i giorni in cui vai in onda, in un posto solo.
//
// Il ragionamento completo sta in docs/SETTIMANA.md. Qui le regole che ne
// discendono.
//
//  · LA SETTIMANA HA UNA CASA SUA, `settings.settimana`. Prima i giorni stavano
//    nelle grafiche e la durata col calendario di Discord: due pannelli che
//    scrivevano pezzi della stessa cosa, e il salvataggio di uno poteva
//    riscrivere l'altro con quello che aveva in mano. Adesso chi legge passa da
//    `settimanaDi`, e chi scrive la settimana e' uno solo.
//  · I POSTI VECCHI RESTANO COME RIPIEGO finche' la settimana non si salva la
//    prima volta. Nessuna migrazione da far girare: la prima lettura dopo
//    l'aggiornamento dice gia' la cosa giusta.
//  · LA DURATA VALE PER I DUE CALENDARI, quindi sta dentro quello che accettano
//    tutti e due: Twitch vuole fra 30 minuti e 23 ore.
//  · CHI E' NOSTRO SUL PROGRAMMA DI TWITCH lo sappiamo solo noi: Twitch non
//    dice chi ha scritto un segmento. Nostro e' uno slot (giorno, ora) che
//    abbiamo scritto noi, e quella lista la tiene il server: dal pannello non
//    arriva, quindi nessuno puo' convincerci che un segmento scritto a mano sia
//    nostro.
import { fusoValido, oraNel, giornoNel, prossimaVolta } from './discord-eventi.js';
import { risolviCategoria } from './categoria.js';
import { makeLog } from '../logger.js';

const log = makeLog('settimana');

export const GIORNI = 7;
export const DURA_MIN = 30;
export const DURA_MAX = 23 * 60;
export const DURA_BASE = 120;
export const ATT_MAX = 40;
export const TITOLO_MAX = 140;
export const FUSO_BASE = 'Europe/Rome';
// Il cambio d'ora sposta di un'ora esatta: e' lo scarto massimo con cui uno dei
// nostri si riconosce ancora, e insieme al titolo non basta a scambiare per
// nostra una diretta diversa della stessa sera.
const SLITTA_MAX = 60;

const ORA_OK = /^([01]?\d|2[0-3]):[0-5]\d$/;
const dueCifre = (v) => { const [h, m] = String(v).trim().split(':'); return `${String(+h).padStart(2, '0')}:${m}`; };
const inMinuti = (v) => { const [h, m] = String(v).split(':'); return (+h) * 60 + (+m); };
const testo = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function normalizzaGiorni(v) {
  const lista = Array.isArray(v) ? v : [];
  return Array.from({ length: GIORNI }, (_, i) => {
    const x = lista[i] || {};
    const ora = String(x.ora || '').trim();
    return { ora: ORA_OK.test(ora) ? dueCifre(ora) : '', att: testo(x.att, ATT_MAX), off: !!x.off };
  });
}

export const duraOk = (v) => Math.max(DURA_MIN, Math.min(DURA_MAX, Math.round(Number(v)) || DURA_BASE));

const soloId = (v, max = 40) => (Array.isArray(v) ? v : [])
  .map((x) => String(x ?? '').replace(/[^0-9]/g, '')).filter(Boolean).slice(0, max);

// Quello che arriva dal pannello. `prima` e' quello che c'era: la parte di
// Twitch che dice cosa abbiamo scritto noi non si prende MAI dal corpo.
export function normalizzaSettimana(v, prima = {}) {
  const fuso = testo(v?.fuso, 64);
  const tw = prima?.twitch || {};
  return {
    giorni: normalizzaGiorni(v?.giorni),
    dura: duraOk(v?.dura),
    fuso: fusoValido(fuso) ? fuso : (fusoValido(prima?.fuso) ? prima.fuso : FUSO_BASE),
    dove: {
      tg: soloId(v?.dove?.tg),
      dc: soloId(v?.dove?.dc),
      ig: !!v?.dove?.ig,
    },
    twitch: {
      acceso: !!v?.twitch?.acceso,
      scritti: Array.isArray(tw.scritti) ? tw.scritti : [],
      categorie: tw.categorie && typeof tw.categorie === 'object' ? tw.categorie : {},
    },
  };
}

// QUAL E' LA SETTIMANA. L'unica domanda, e l'unica risposta: la leggono la
// grafica, il calendario di Discord, il Programma di Twitch e il giro delle sei
// ore.
export function settimanaDi(settings) {
  const s = settings?.settimana;
  if (s && Array.isArray(s.giorni)) return normalizzaSettimana(s, s);
  const ev = settings?.discordEventi || {};
  return normalizzaSettimana({
    giorni: settings?.grafiche?.giorni,
    dura: ev.dura,
    fuso: ev.fuso,
  });
}

// Quello che vede il pannello: tutto tranne la memoria di cosa e' nostro su
// Twitch, che serve solo al server.
export function vistaSettimana(sett) {
  return {
    giorni: sett.giorni, dura: sett.dura, fuso: sett.fuso, dove: sett.dove,
    twitch: { acceso: sett.twitch.acceso, categorie: sett.twitch.categorie },
  };
}

// IL CALENDARIO DI DISCORD legge la settimana da qui. I giorni, la durata e il
// fuso sono della settimana; il titolo, il link e l'interruttore restano suoi.
export function perIlCalendario(settings) {
  const w = settimanaDi(settings);
  return { conf: { ...(settings?.discordEventi || {}), dura: w.dura, fuso: w.fuso }, giorni: w.giorni };
}

// Quello che, se cambia, cambia cosa va scritto sui calendari. Serve al giro
// delle sei ore per accorgersi che nel frattempo la settimana e' stata salvata.
export const improntaSettimana = (sett) => JSON.stringify([sett?.giorni, sett?.dura, sett?.fuso, !!sett?.twitch?.acceso]);

// Il giorno che ha qualcosa da dire a un calendario: un'ora, e non e' riposo.
export const inOnda = (g) => !!g && !g.off && !!g.ora;

// ── Twitch: il Programma del canale ────────────────────────────────────────

const chiaveAtt = (att) => testo(att, ATT_MAX).toLowerCase();

// GLI SLOT VOLUTI: uno per giorno. Twitch ripete un segmento ogni settimana
// nello stesso giorno, e non ha una regola «lunedi', mercoledi' e venerdi'»:
// tre sere sono tre segmenti.
export function slotVoluti(sett) {
  const cat = sett?.twitch?.categorie || {};
  return (sett?.giorni || []).map((g, i) => (inOnda(g) ? {
    g: i,
    ora: g.ora,
    titolo: testo(g.att, TITOLO_MAX),
    categoria: cat[chiaveAtt(g.att)]?.id || '',
    dura: duraOk(sett.dura),
  } : null)).filter(Boolean);
}

// QUELLI CHE CI SONO, letti NEL FUSO: e' questo che fa accorgere del cambio
// d'ora, come per Discord.
export function slotPresenti(segmenti, fuso) {
  return (segmenti || []).map((x) => {
    const inizio = new Date(x?.start_time);
    if (!x?.id || Number.isNaN(inizio.getTime())) return null;
    const fine = new Date(x?.end_time);
    return {
      id: String(x.id),
      g: giornoNel(fuso, inizio),
      ora: oraNel(fuso, inizio),
      titolo: String(x.title || ''),
      categoria: String(x.category?.id || ''),
      dura: Number.isNaN(fine.getTime()) ? 0 : Math.round((fine - inizio) / 60000),
      ricorrente: !!x.is_recurring,
    };
  }).filter(Boolean);
}

const vicino = (a, b) => Math.abs(inMinuti(a) - inMinuti(b)) <= SLITTA_MAX;

// LA DIFFERENZA fra quello che vuoi e quello che c'e'. Pura: niente rete.
//
// Un segmento e' NOSTRO se e' ricorrente e sta in uno slot che abbiamo scritto
// noi; o se sta a un'ora da uno dei nostri col titolo che gli avevamo dato
// (e' lo stesso, slittato col cambio d'ora). Tutto il resto e' dello streamer:
// non si tocca, e se occupa uno slot che vorremmo, lo si dice.
export function differenzaProgramma(sett, presenti) {
  const scritti = Array.isArray(sett?.twitch?.scritti) ? sett.twitch.scritti : [];
  const nostro = (p) => p.ricorrente && scritti.some((s) => s.g === p.g
    && (s.ora === p.ora || (vicino(s.ora, p.ora) && s.titolo === p.titolo)));
  const voluti = sett?.twitch?.acceso ? slotVoluti(sett) : [];
  const resta = [...(presenti || [])];
  const crea = [];
  const sistema = [];
  const togli = [];
  const occupati = [];
  const prendi = (p) => resta.splice(resta.indexOf(p), 1);
  for (const v of voluti) {
    const qui = resta.find((p) => p.g === v.g && p.ora === v.ora);
    if (qui && !nostro(qui)) { occupati.push({ g: v.g, ora: v.ora, titolo: qui.titolo }); prendi(qui); continue; }
    if (qui) {
      prendi(qui);
      // Un titolo o una categoria che non sappiamo dire non si cancella: vuol
      // dire «non lo so», non «toglilo». Riscriverlo a vuoto a ogni giro
      // sarebbe una chiamata per niente, per sempre.
      const cambia = {};
      if (v.titolo && qui.titolo !== v.titolo) cambia.titolo = v.titolo;
      if (v.categoria && qui.categoria !== v.categoria) cambia.categoria = v.categoria;
      if (qui.dura !== v.dura) cambia.dura = v.dura;
      if (Object.keys(cambia).length) sistema.push({ id: qui.id, g: v.g, ora: v.ora, ...cambia });
      continue;
    }
    // Uno dei nostri slittato: un ricorrente non si sposta, si toglie e si
    // rimette all'ora giusta.
    const slittato = resta.find((p) => nostro(p) && p.g === v.g && vicino(p.ora, v.ora));
    if (slittato) { prendi(slittato); togli.push({ id: slittato.id, g: slittato.g, ora: slittato.ora }); }
    crea.push(v);
  }
  for (const p of resta) if (nostro(p)) togli.push({ id: p.id, g: p.g, ora: p.ora });
  return { crea, sistema, togli, occupati, vuota: !crea.length && !sistema.length && !togli.length };
}

// Le categorie si cercano QUANDO SI SALVA, una volta per attivita': il giro
// delle sei ore non deve fare ricerche, e una scelta che si vede nel pannello
// e' una scelta che si puo' correggere cambiando il testo.
//
// Una categoria TROVATA non si ricerca; una NON trovata si': «nessuna» puo'
// voler dire che Twitch quella volta non ha risposto, e ricordarla per sempre
// vorrebbe dire scrivere il segmento senza categoria mentre il pannello, che
// cerca adesso, la mostra.
export async function categorieDi(helix, sett) {
  const vecchie = sett?.twitch?.categorie || {};
  const nuove = {};
  for (const g of sett?.giorni || []) {
    if (!inOnda(g) || !g.att) continue;
    const k = chiaveAtt(g.att);
    if (k in nuove) continue;
    if (vecchie[k]) { nuove[k] = vecchie[k]; continue; }
    const c = await risolviCategoria(helix, g.att).catch(() => null);
    nuove[k] = c ? { id: String(c.id), name: String(c.name) } : null;
  }
  return nuove;
}

// IL GIRO: legge, confronta, scrive. Torna quello che e' successo e i nuovi
// `scritti` da salvare: sono la memoria di cosa e' nostro.
export async function sincronizzaProgramma(helix, login, sett, { adesso = new Date() } = {}) {
  const fuso = sett.fuso;
  const letti = await helix.programma(login, { da: adesso, giorni: 7 });
  if (!letti.ok) return { ok: false, errore: letti.errore };
  const d = differenzaProgramma(sett, slotPresenti(letti.segmenti, fuso));
  const esito = { ok: true, creati: 0, sistemati: 0, tolti: 0, occupati: d.occupati, errori: [] };
  const scritti = new Map((sett.twitch?.scritti || []).map((s) => [`${s.g}|${s.ora}`, s]));
  const sbaglio = (r) => { if (r?.errore && !esito.errori.includes(r.errore) && esito.errori.length < 3) esito.errori.push(r.errore); };
  // Chi non si e' riusciti a togliere resta nostro: dimenticarlo vorrebbe dire
  // lasciarlo sul Programma per sempre, scambiato per uno scritto a mano.
  const daRiprovare = new Set();
  for (const t of d.togli) {
    const r = await helix.togliSegmento(login, t.id);
    if (r.ok) { esito.tolti++; scritti.delete(`${t.g}|${t.ora}`); } else { sbaglio(r); daRiprovare.add(`${t.g}|${t.ora}`); }
  }
  for (const v of d.crea) {
    const inizio = prossimaVolta(fuso, [v.g], v.ora, adesso);
    if (!inizio) continue;
    const r = await helix.creaSegmento(login, { inizio, fuso, dura: v.dura, titolo: v.titolo, categoria: v.categoria });
    if (r.ok) { esito.creati++; scritti.set(`${v.g}|${v.ora}`, { g: v.g, ora: v.ora, titolo: v.titolo }); } else sbaglio(r);
  }
  for (const v of d.sistema) {
    const r = await helix.sistemaSegmento(login, v.id, v);
    if (r.ok) {
      esito.sistemati++;
      const s = scritti.get(`${v.g}|${v.ora}`);
      if (s && v.titolo !== undefined) scritti.set(`${v.g}|${v.ora}`, { ...s, titolo: v.titolo });
    } else sbaglio(r);
  }
  // Uno slot che non vogliamo piu' e che su Twitch non c'e' gia' piu' (tolto a
  // mano) si dimentica: ricordarlo vorrebbe dire, un giorno, chiamare nostro
  // un segmento nuovo scritto dallo streamer nello stesso posto.
  const voluti = new Set(slotVoluti(sett).map((v) => `${v.g}|${v.ora}`));
  for (const k of [...scritti.keys()]) if (!voluti.has(k) && !daRiprovare.has(k)) scritti.delete(k);
  esito.scritti = [...scritti.values()];
  if (esito.errori.length) log.debug('programma con inciampi:', esito.errori.join(' · '));
  return esito;
}
