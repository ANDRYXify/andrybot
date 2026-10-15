// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
export const FORMATI = Object.freeze({ o: Object.freeze({ W: 1280, H: 720 }), v: Object.freeze({ W: 720, H: 1280 }) });
export const TIPI = Object.freeze(['webcam', 'schermo', 'immagine', 'video', 'testo', 'overlay']);
export const LIMITI = Object.freeze({ scene: 30, fonti: 40, preset: 20, nome: 40, testo: 120, byte: 262144 });
export const TRANSIZIONI = Object.freeze(['taglio', 'dissolvenza']);
export const DESTINAZIONI_SOLO_ORIZZONTALI = Object.freeze(['twitch']);

const ID = /^[a-z0-9]{1,24}$/;
const IMPRONTA = /^[0-9a-f]{64}$/;
const COLORE = /^#[0-9a-f]{6}$/i;

const num = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const testo = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, max);

export function nuovoId(prefisso = 'x') {
  const b = new Uint8Array(6);
  globalThis.crypto.getRandomValues(b);
  return prefisso + [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

function adatta(prop, maxW, maxH) {
  if (!(prop > 0)) return { w: maxW, h: maxH };
  return maxW / maxH > prop ? { w: Math.round(maxH * prop), h: maxH } : { w: maxW, h: Math.round(maxW / prop) };
}

export function posizioneDiSerie(tipo, f, prop = 0) {
  const { W, H } = FORMATI[f];
  if (tipo === 'overlay') return { x: 0, y: 0, w: W, h: H, vis: true };
  if (f === 'o') {
    if (tipo === 'schermo') return { x: 0, y: 0, w: W, h: H, vis: true };
    if (tipo === 'webcam') return { x: W - 384 - 28, y: H - 216 - 28, w: 384, h: 216, vis: true };
    if (tipo === 'testo') return { x: 140, y: 560, w: 1000, h: 110, vis: true };
    const d = adatta(prop || 16 / 9, 640, 360);
    return { x: Math.round((W - d.w) / 2), y: Math.round((H - d.h) / 2), w: d.w, h: d.h, vis: true };
  }
  if (tipo === 'schermo') { const h = Math.round(W * 9 / 16); return { x: 0, y: Math.round((H - h) / 2), w: W, h, vis: true }; }
  if (tipo === 'webcam') return { x: 0, y: 0, w: W, h: H, vis: true };
  if (tipo === 'testo') return { x: 40, y: H - 300, w: W - 80, h: 110, vis: true };
  const d = adatta(prop || 16 / 9, W - 80, Math.round(H * 0.4));
  return { x: Math.round((W - d.w) / 2), y: Math.round((H - d.h) / 2), w: d.w, h: d.h, vis: true };
}

function posizione(p, tipo, f, prop) {
  const { W, H } = FORMATI[f];
  if (!p || typeof p !== 'object') return posizioneDiSerie(tipo, f, prop);
  const w = num(p.w, 20, W * 4, null), h = num(p.h, 20, H * 4, null);
  if (w == null || h == null) return posizioneDiSerie(tipo, f, prop);
  return { x: num(p.x, -w + 20, W - 20, 0), y: num(p.y, -h + 20, H - 20, 0), w, h, vis: p.vis !== false };
}

function media(m) {
  if (!m || typeof m !== 'object') return null;
  return {
    impronta: IMPRONTA.test(String(m.impronta || '')) ? String(m.impronta) : '',
    nome: testo(m.nome, 80), mime: testo(m.mime, 60),
    w: num(m.w, 0, 16384, 0), h: num(m.h, 0, 16384, 0), byte: num(m.byte, 0, 1e13, 0),
  };
}

export function normalizzaFonte(f, usati) {
  if (!f || typeof f !== 'object' || !TIPI.includes(f.tipo)) return null;
  let id = ID.test(String(f.id || '')) ? String(f.id) : nuovoId('f');
  while (usati.has(id)) id = nuovoId('f');
  usati.add(id);
  const m = (f.tipo === 'immagine' || f.tipo === 'video') ? media(f.media) : null;
  if ((f.tipo === 'immagine' || f.tipo === 'video') && !m) return null;
  const prop = m && m.w && m.h ? m.w / m.h : 0;
  const pos = { o: posizione(f.pos?.o, f.tipo, 'o', prop), v: posizione(f.pos?.v, f.tipo, 'v', prop) };
  if (f.tipo === 'overlay') { pos.o = { ...posizioneDiSerie('overlay', 'o'), vis: pos.o.vis }; pos.v = { ...posizioneDiSerie('overlay', 'v'), vis: pos.v.vis }; }
  const out = { id, tipo: f.tipo, nome: testo(f.nome, LIMITI.nome) || f.tipo, pos };
  if (m) out.media = m;
  if (f.tipo === 'testo') {
    out.testo = testo(f.testo, LIMITI.testo);
    out.colore = COLORE.test(String(f.colore || '')) ? String(f.colore) : '#ffffff';
    out.dim = num(f.dim, 12, 200, 56);
    out.grassetto = f.grassetto !== false;
    out.sfondo = COLORE.test(String(f.sfondo || '')) ? String(f.sfondo) : '';
  }
  return out;
}

export function normalizzaScena(s, usatiScene, usatiFonti) {
  if (!s || typeof s !== 'object') return null;
  let id = ID.test(String(s.id || '')) ? String(s.id) : nuovoId('s');
  while (usatiScene.has(id)) id = nuovoId('s');
  usatiScene.add(id);
  const fonti = [];
  let overlay = false;
  for (const f of (Array.isArray(s.fonti) ? s.fonti : [])) {
    if (fonti.length >= LIMITI.fonti) break;
    if (f?.tipo === 'overlay') { if (overlay) continue; overlay = true; }
    const n = normalizzaFonte(f, usatiFonti);
    if (n) fonti.push(n);
  }
  return { id, nome: testo(s.nome, LIMITI.nome) || 'Scena', fonti };
}

function scelte(c) {
  const o = c && typeof c === 'object' ? c : {};
  const formati = { o: o.formati?.o !== false, v: o.formati?.v === true };
  if (!formati.o && !formati.v) formati.o = true;
  const tr = o.transizione || {};
  return {
    formati,
    transizione: { tipo: TRANSIZIONI.includes(tr.tipo) ? tr.tipo : 'dissolvenza', ms: Math.round(num(tr.ms, 100, 3000, 300)) },
    modalitaStudio: o.modalitaStudio === true,
    lavoro: o.lavoro === 'v' && formati.v ? 'v' : (formati.o ? 'o' : 'v'),
    dest: Array.isArray(o.dest) ? [...new Set(o.dest.map(String).filter((k) => /^[a-z0-9]{1,24}$/.test(k)))].slice(0, 20) : ['twitch', 'kick'],
    destFormato: Object.fromEntries(Object.entries(o.destFormato && typeof o.destFormato === 'object' ? o.destFormato : {})
      .filter(([k, v]) => /^[a-z0-9]{1,24}$/.test(k) && (v === 'o' || v === 'v') && !(v === 'v' && DESTINAZIONI_SOLO_ORIZZONTALI.includes(k))).slice(0, 20)),
  };
}

export function normalizza(doc) {
  const d = doc && typeof doc === 'object' ? doc : {};
  const usatiScene = new Set(), usatiFonti = new Set();
  const scene = [];
  for (const s of (Array.isArray(d.scene) ? d.scene : [])) {
    if (scene.length >= LIMITI.scene) break;
    const n = normalizzaScena(s, usatiScene, usatiFonti);
    if (n) scene.push(n);
  }
  if (!scene.length) scene.push(normalizzaScena({ nome: 'Scena 1', fonti: [] }, usatiScene, usatiFonti));
  const esiste = (id) => scene.some((s) => s.id === id);
  const inOnda = esiste(d.inOnda) ? d.inOnda : scene[0].id;
  const anteprima = esiste(d.anteprima) ? d.anteprima : inOnda;
  const preset = [];
  for (const p of (Array.isArray(d.preset) ? d.preset : [])) {
    if (preset.length >= LIMITI.preset) break;
    if (!p || typeof p !== 'object') continue;
    const us = new Set(), uf = new Set();
    const ps = (Array.isArray(p.scene) ? p.scene : []).slice(0, LIMITI.scene).map((s) => normalizzaScena(s, us, uf)).filter(Boolean);
    if (ps.length) preset.push({ nome: testo(p.nome, LIMITI.nome) || 'Preset', scene: ps });
  }
  return { v: 1, scene, inOnda, anteprima, preset, scelte: scelte(d.scelte) };
}

export function pesa(doc) { return new TextEncoder().encode(JSON.stringify(doc)).length; }

export function nuovaFonte(tipo, { nome = '', media: m = null, testo: t = 'Testo' } = {}) {
  const usati = new Set();
  const base = { id: nuovoId('f'), tipo, nome: nome || tipo, media: m, testo: t, colore: '#ffffff', dim: 56, grassetto: true, sfondo: '' };
  return normalizzaFonte(base, usati);
}

export function migraVecchie(vecchie) {
  return (Array.isArray(vecchie) ? vecchie : []).map((s) => ({
    nome: s?.nome,
    fonti: (Array.isArray(s?.fonti) ? s.fonti : []).map((f) => ({
      ...f,
      pos: { o: { x: f.x, y: f.y, w: f.w, h: f.h, vis: f.visibile !== false }, v: null },
      media: (f.tipo === 'immagine' || f.tipo === 'video') ? { impronta: f.media?.impronta || '', nome: f.nome } : undefined,
    })),
  }));
}

export function impronteUsate(doc) {
  const out = new Set();
  const giro = (scene) => { for (const s of scene || []) for (const f of s.fonti || []) if (f.media?.impronta) out.add(f.media.impronta); };
  giro(doc?.scene);
  for (const p of doc?.preset || []) giro(p.scene);
  return out;
}

export function lega(doc, vecchia, nuova) {
  const giro = (scene) => { for (const s of scene || []) for (const f of s.fonti || []) if (f.media && (f.media.impronta === vecchia.impronta && (vecchia.impronta || f.id === vecchia.id))) Object.assign(f.media, nuova); };
  giro(doc.scene);
  for (const p of doc.preset || []) giro(p.scene);
  return doc;
}

export function mescola(inizio, ms, ora) {
  if (!(ms > 0)) return 1;
  return Math.min(1, Math.max(0, (ora - inizio) / ms));
}

export function dispostoRapido(scena, preset, f) {
  const { W, H } = FORMATI[f];
  const cam = scena.fonti.find((x) => x.tipo === 'webcam'), scr = scena.fonti.find((x) => x.tipo === 'schermo');
  const metti = (x, p) => { if (x) x.pos[f] = { ...p, vis: true }; };
  const nascondi = (x) => { if (x) x.pos[f] = { ...x.pos[f], vis: false }; };
  const davanti = (x) => { if (!x) return; const i = scena.fonti.indexOf(x); scena.fonti.splice(i, 1); scena.fonti.push(x); };
  if (preset === 'cam') { metti(cam, { x: 0, y: 0, w: W, h: H }); nascondi(scr); }
  else if (preset === 'schermo') { metti(scr, f === 'o' ? { x: 0, y: 0, w: W, h: H } : { x: 0, y: Math.round((H - W * 9 / 16) / 2), w: W, h: Math.round(W * 9 / 16) }); nascondi(cam); }
  else if (preset === 'pip') {
    if (f === 'o') { metti(scr, { x: 0, y: 0, w: W, h: H }); metti(cam, { x: W - 384 - 28, y: H - 216 - 28, w: 384, h: 216 }); }
    else { metti(scr, { x: 0, y: H - Math.round(W * 9 / 16) - 120, w: W, h: Math.round(W * 9 / 16) }); metti(cam, { x: 0, y: 0, w: W, h: H - Math.round(W * 9 / 16) - 120 }); }
    davanti(cam);
  } else if (preset === 'affianco') {
    if (f === 'o') { metti(scr, { x: 20, y: 150, w: 760, h: 428 }); metti(cam, { x: 800, y: 150, w: 460, h: 428 }); }
    else { metti(cam, { x: 0, y: 0, w: W, h: H / 2 }); metti(scr, { x: 0, y: H / 2, w: W, h: H / 2 }); }
  }
  return scena;
}

export function formatoDi(dest, scelteDoc) {
  if (DESTINAZIONI_SOLO_ORIZZONTALI.includes(dest)) return 'o';
  const f = scelteDoc?.destFormato?.[dest];
  return f === 'v' ? 'v' : 'o';
}

export function dirette(scelteGiuste, destinazioni) {
  const per = { o: [], v: [] };
  for (const d of destinazioni) {
    const f = formatoDi(d, scelteGiuste);
    if (scelteGiuste.formati[f]) per[f].push(d);
  }
  return per;
}
