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
export const TEMI = ['pagina', 'carta', 'notte'];
const EMAIL = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[a-z]{2,}$/i;
const riga = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function normKit(x) {
  const s = x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const email = riga(s.email, 120);
  const mostra = {};
  for (const k of MOSTRA) mostra[k] = s.mostra?.[k] !== false;
  const coll = (Array.isArray(s.collaborazioni) ? s.collaborazioni : String(s.collaborazioni ?? '').split(','))
    .map((c) => riga(c, 40)).filter(Boolean);
  return {
    presentazione: String(s.presentazione ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 280),
    email: EMAIL.test(email) ? email : '',
    collaborazioni: [...new Set(coll)].slice(0, 8),
    mostra,
    tema: TEMI.includes(s.tema) ? s.tema : 'pagina',
  };
}
