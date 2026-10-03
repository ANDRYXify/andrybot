// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MEDIA KIT (docs/STRUMENTI.md): il foglio che uno streamer manda a un
// marchio. Qui si decide da dove viene ogni numero e quando un numero puo'
// uscire; il disegno sta in src/web/public/kit.js.
//
// Ogni numero ha UNA fonte: i rapporti di fine diretta degli ultimi GIORNI
// giorni (dirette concluse), e per le persone in chat i messaggi dello stesso
// periodo. Niente si scrive a mano: lo streamer puo' solo nascondere.
import { db, padroneDi } from '../db.js';

export const GIORNI = 30;
export const MIN_DIRETTE = 3;
const GIORNO_MS = 86_400_000;
const norm = (s) => String(s || '').toLowerCase().trim();
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

// Percentuali intere che sommano esattamente a 100: si arrotonda per difetto e
// il resto va a chi ha perso di piu' nell'arrotondamento (a parita', al primo).
export function percentuali(pesi) {
  const tot = pesi.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) return pesi.map(() => 0);
  const esatte = pesi.map((p) => (p * 100) / tot);
  const giu = esatte.map(Math.floor);
  let resto = 100 - giu.reduce((a, b) => a + b, 0);
  const ordine = esatte.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of ordine) { if (resto <= 0) break; giu[i]++; resto--; }
  return giu;
}

// Le prime QUANTE categorie per tempo, e il resto insieme come «Altro».
export function categorieDi(conteggi, quante = 4) {
  const ord = [...conteggi].filter(([, g]) => g > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const prime = ord.slice(0, quante);
  const altro = ord.slice(quante).reduce((a, [, g]) => a + g, 0);
  const voci = prime.map(([nome, giri]) => ({ nome, giri }));
  if (altro > 0) voci.push({ nome: '', giri: altro, altro: true });
  const q = percentuali(voci.map((v) => v.giri));
  return voci.map((v, i) => ({ nome: v.nome, quota: q[i], ...(v.altro ? { altro: true } : {}) }));
}

export function numeri(channel, { ora = Date.now() } = {}) {
  const ch = norm(channel);
  const da = ora - GIORNI * GIORNO_MS;
  const righe = db.prepare('SELECT dati FROM rapporti WHERE channel=? AND fine>=? AND fine<=?').all(ch, da, ora);
  let oreMs = 0, picco = 0, follow = 0, giri = 0, somma = 0, conCategorie = 0;
  const cat = new Map();
  for (const r of righe) {
    let d = {};
    try { d = JSON.parse(r.dati || '{}') || {}; } catch { d = {}; }
    oreMs += num(d.durataMs);
    picco = Math.max(picco, num(d.picco));
    follow += num(d.follow);
    const g = Math.trunc(num(d.giri));
    if (g > 0) { giri += g; somma += num(d.media) * g; }
    const cc = Array.isArray(d.categorie) ? d.categorie.filter((c) => c && typeof c.nome === 'string' && num(c.giri) > 0) : [];
    if (cc.length) conCategorie++;
    for (const c of cc) cat.set(c.nome, (cat.get(c.nome) || 0) + Math.trunc(num(c.giri)));
  }
  const persone = db.prepare(`SELECT COUNT(DISTINCT user) p FROM messages
    WHERE channel=? AND ts>=? AND ts<=? AND from_bot=0 AND user NOT LIKE '[%' AND user<>?`).get(ch, da, ora, padroneDi(ch)).p | 0;
  const dirette = righe.length;
  const basta = { numeri: dirette >= MIN_DIRETTE, media: dirette >= MIN_DIRETTE && giri > 0, categorie: conCategorie >= MIN_DIRETTE };
  return {
    giorni: GIORNI, da, a: ora, dirette, ore: Math.round(oreMs / 3_600_000),
    media: basta.media ? Math.round(somma / giri) : null,
    picco: basta.numeri ? Math.trunc(picco) : null,
    follow: Math.trunc(follow), persone,
    categorie: basta.categorie ? categorieDi(cat) : [],
    conCategorie, basta,
  };
}

// I social dalla pagina link: i blocchi «social» e i link con l'icona di una
// piattaforma, una volta sola ciascuno, nell'ordine in cui stanno in pagina.
export const RETI = ['twitch', 'kick', 'youtube', 'instagram', 'tiktok', 'x', 'twitter', 'threads', 'facebook', 'discord', 'telegram', 'spotify', 'reddit'];
const indirizzo = (u) => { try { const x = new URL(String(u || '')); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
export function socialDaPagina(pagina) {
  const out = [], visti = new Set();
  const metti = (icona, url) => {
    const u = indirizzo(url);
    if (!u || !RETI.includes(icona) || visti.has(u)) return;
    visti.add(u); out.push({ icona, url: u });
  };
  for (const b of pagina?.blocchi || []) {
    if (b?.tipo === 'social') for (const v of b.voci || []) metti(v?.icona, v?.url);
    if (b?.tipo === 'link') metti(b.icona, b.url);
  }
  return out.slice(0, 8);
}

// Quello che lo streamer sceglie, come sta nelle impostazioni: si tiene solo
// quello che ha forma.
export const MOSTRA = ['follower', 'media', 'picco', 'ore', 'dirette', 'persone', 'follow', 'categorie', 'settimana', 'social'];
export const NUMERI = ['follower', 'media', 'picco', 'ore', 'dirette', 'persone', 'follow'];
export const TEMI = ['pagina', 'carta', 'notte', 'miei'];
export const CARATTERI = ['archivo', 'grazie', 'mono'];
const EMAIL = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[a-z]{2,}$/i;
const COLORE = /^#[0-9a-f]{6}$/i;
const riga = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const testo = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

// IL KIT E' UN DOCUMENTO DI SEZIONI (docs/STRUMENTI.md, «Media kit»): in
// ordine, ognuna col suo titolo, che si mostra o no, piena o a meta' pagina.
// La testa sta sempre per prima e i contatti sempre per ultimi; le sezioni
// che ci sono una volta sola ci sono SEMPRE (al massimo spente), cosi' il
// pannello le puo' sempre riaccendere; i testi liberi sono da zero a due.
// Ogni voce ha un tetto: una sezione non diventa mai piu' alta di una pagina.
export const UNICHE = ['testa', 'numeri', 'categorie', 'settimana', 'social', 'lavori', 'collaborazioni', 'offerte', 'link', 'contatti'];
export const TIPI_SEZIONE = [...UNICHE, 'testo'];
export const MAX_TESTI = 2;
export const LIMITI = {
  titolo: 40, riga: 80, presentazione: 600, testo: 800,
  lavori: 6, lavoroTitolo: 60, lavoroTesto: 200,
  collaborazioni: 12, marchio: 40,
  offerte: 6, offertaNome: 50, offertaTesto: 160, prezzo: 30,
  link: 8, etichetta: 40, url: 300,
};
const SEMPRE_PIENE = new Set(['testa', 'contatti']);

// Un indirizzo che il PDF puo' aprire: http(s), e un nome a dominio vero. Chi
// scrive «miosito.it» intende https://miosito.it.
export function urlKit(v) {
  const t = riga(v, LIMITI.url);
  if (!t) return '';
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    if (!/^https?:$/.test(u.protocol) || !/\.[a-z]{2,}$/i.test(u.hostname)) return '';
    return u.href.slice(0, LIMITI.url);
  } catch { return ''; }
}
const voci = (v, max, fn) => (Array.isArray(v) ? v : []).map((x) => (x && typeof x === 'object' ? fn(x) : null)).filter(Boolean).slice(0, max);

function normSezione(x) {
  const tipo = TIPI_SEZIONE.includes(x?.tipo) ? x.tipo : '';
  if (!tipo) return null;
  const base = { tipo, titolo: riga(x.titolo, LIMITI.titolo), visibile: x.visibile !== false, larghezza: !SEMPRE_PIENE.has(tipo) && x.larghezza === 'meta' ? 'meta' : 'piena' };
  switch (tipo) {
    case 'testa': return { ...base, visibile: true, riga: riga(x.riga, LIMITI.riga), presentazione: testo(x.presentazione, LIMITI.presentazione) };
    case 'numeri': {
      const mostra = {};
      for (const k of NUMERI) mostra[k] = x.mostra?.[k] !== false;
      return { ...base, mostra };
    }
    case 'lavori': return { ...base, voci: voci(x.voci, LIMITI.lavori, (v) => { const t = riga(v.titolo, LIMITI.lavoroTitolo); return t ? { titolo: t, testo: testo(v.testo, LIMITI.lavoroTesto), url: urlKit(v.url) } : null; }) };
    case 'collaborazioni': {
      const visti = new Set();
      return { ...base, voci: voci(x.voci, LIMITI.collaborazioni, (v) => { const n = riga(v.nome, LIMITI.marchio); if (!n || visti.has(n.toLowerCase())) return null; visti.add(n.toLowerCase()); return { nome: n, url: urlKit(v.url) }; }) };
    }
    case 'offerte': return { ...base, voci: voci(x.voci, LIMITI.offerte, (v) => { const n = riga(v.nome, LIMITI.offertaNome); return n ? { nome: n, testo: testo(v.testo, LIMITI.offertaTesto), prezzo: riga(v.prezzo, LIMITI.prezzo) } : null; }) };
    case 'testo': return { ...base, testo: testo(x.testo, LIMITI.testo) };
    case 'link': return { ...base, voci: voci(x.voci, LIMITI.link, (v) => { const u = urlKit(v.url); return u ? { etichetta: riga(v.etichetta, LIMITI.etichetta), url: u } : null; }) };
    case 'contatti': {
      const email = riga(x.email, 120);
      const altro = x.altro && typeof x.altro === 'object' ? { etichetta: riga(x.altro.etichetta, LIMITI.etichetta), url: urlKit(x.altro.url) } : { etichetta: '', url: '' };
      return { ...base, visibile: true, email: EMAIL.test(email) ? email : '', altro: altro.url ? altro : { etichetta: '', url: '' } };
    }
    default: return base;
  }
}

// Le sezioni di un kit salvato prima che le sezioni ci fossero: la stessa
// pagina di allora, scritta col modello nuovo. Cosi' chi l'aveva gia' fatto lo
// ritrova uguale, e niente va migrato nel database.
export function sezioniDi(vecchio) {
  const s = vecchio && typeof vecchio === 'object' ? vecchio : {};
  const m = s.mostra && typeof s.mostra === 'object' ? s.mostra : {};
  const marchi = (Array.isArray(s.collaborazioni) ? s.collaborazioni : String(s.collaborazioni ?? '').split(',')).map((c) => ({ nome: c }));
  return [
    { tipo: 'testa', presentazione: s.presentazione || '' },
    { tipo: 'numeri', mostra: m },
    { tipo: 'categorie', larghezza: 'meta', visibile: m.categorie !== false },
    { tipo: 'social', larghezza: 'meta', visibile: m.social !== false },
    { tipo: 'settimana', larghezza: 'meta', visibile: m.settimana !== false },
    { tipo: 'collaborazioni', larghezza: 'meta', voci: marchi },
    { tipo: 'contatti', email: s.email || '' },
  ];
}

export function normKit(x) {
  const s = x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const grezze = Array.isArray(s.sezioni) ? s.sezioni : sezioniDi(s);
  const viste = new Set();
  let testi = 0;
  const mezzo = [];
  let testa = null, contatti = null;
  for (const g of grezze) {
    const z = normSezione(g);
    if (!z) continue;
    if (z.tipo === 'testa') { testa ||= z; continue; }
    if (z.tipo === 'contatti') { contatti ||= z; continue; }
    if (z.tipo === 'testo') { if (testi++ < MAX_TESTI) mezzo.push(z); continue; }
    if (viste.has(z.tipo)) continue;
    viste.add(z.tipo);
    mezzo.push(z);
  }
  for (const t of UNICHE) {
    if (t === 'testa' || t === 'contatti' || viste.has(t)) continue;
    mezzo.push(normSezione({ tipo: t }));
  }
  const tema = TEMI.includes(s.tema) ? s.tema : 'pagina';
  const c = s.colori && typeof s.colori === 'object' ? s.colori : {};
  return {
    tema,
    colori: { fondo: COLORE.test(c.fondo) ? c.fondo : '#15121a', testo: COLORE.test(c.testo) ? c.testo : '#f4f1f8', accento: COLORE.test(c.accento) ? c.accento : '#b8237f' },
    carattere: CARATTERI.includes(s.carattere) ? s.carattere : 'archivo',
    titoli: s.titoli === 'normale' ? 'normale' : 'maiuscolo',
    sezioni: [testa || normSezione({ tipo: 'testa' }), ...mezzo, contatti || normSezione({ tipo: 'contatti' })],
  };
}
