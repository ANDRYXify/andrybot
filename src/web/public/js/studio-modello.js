// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
export const FORMATI = Object.freeze({ o: Object.freeze({ W: 1280, H: 720 }), v: Object.freeze({ W: 720, H: 1280 }) });
export const TIPI = Object.freeze(['webcam', 'schermo', 'immagine', 'video', 'testo', 'overlay', 'remota']);
export const LIMITI = Object.freeze({ scene: 30, fonti: 40, preset: 20, nome: 40, testo: 120, byte: 262144, tracce: 8 });
export const TRACCE = Object.freeze(['ingresso', 'file']);
export const TRANSIZIONI = Object.freeze(['taglio', 'dissolvenza']);
export const DESTINAZIONI_SOLO_ORIZZONTALI = Object.freeze(['twitch']);
export const FACCE = Object.freeze(['user', 'environment']);
export const AUDIO = Object.freeze({
  voce: Object.freeze({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }),
  musica: Object.freeze({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }),
});
export const SCENARI = Object.freeze({
  giro: Object.freeze({ disponibile: true, facing: 'user', audio: 'voce', voce: false, categorie: Object.freeze(['IRL', 'Travel & Outdoors']), scene: Object.freeze(['io', 'vedo', 'pausa', 'privacy']) }),
  camera: Object.freeze({ disponibile: true, facing: 'user', audio: 'voce', voce: false, categorie: Object.freeze(['Just Chatting']), scene: Object.freeze(['camera', 'tornosubito']) }),
  mani: Object.freeze({ disponibile: true, facing: 'environment', audio: 'voce', voce: true, categorie: Object.freeze(['Food & Drink', 'Art', 'Makers & Crafting']), scene: Object.freeze(['lavoro', 'io', 'pausa']) }),
  musica: Object.freeze({ disponibile: true, facing: 'user', audio: 'musica', voce: false, categorie: Object.freeze(['Music']), scene: Object.freeze(['palco', 'pausa']) }),
  gioco: Object.freeze({ disponibile: false, facing: '', audio: 'voce', voce: false, categorie: Object.freeze([]), scene: Object.freeze([]) }),
});
export const CHAT_GRANDEZZE = Object.freeze(['s', 'm', 'l']);
export const ADATTA = Object.freeze(['auto', 'ritaglia', 'intera']);
export const INQUADRABILI = Object.freeze(['webcam', 'schermo', 'video', 'immagine', 'remota']);
export const SFUMATE = Object.freeze(['webcam', 'schermo', 'video', 'remota']);
export const AUDIO_SCENA = Object.freeze(['computer', 'dispositivi', 'tutti']);
const ID_DISPOSITIVO = /^[a-z0-9]{10}$/;
export const TAGLIO_MAX = 1.5;
export const ZOOM_DIGITALE_MAX = 3;
export const PASSI_ZOOM = Object.freeze([1, 2, 3]);

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
  if (tipo === 'remota') return f === 'o' ? { x: W - 384 - 28, y: 28, w: 384, h: 216, vis: true } : { x: W - 240 - 24, y: 24, w: 240, h: 427, vis: true };
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

const centro = (v) => Math.round(num(v, -1, 1, 0) * 1000) / 1000;

function inq(q, tipo) {
  const o = q && typeof q === 'object' ? q : {};
  return { adatta: ADATTA.includes(o.adatta) ? o.adatta : (tipo === 'immagine' ? 'intera' : 'auto'), cx: centro(o.cx), cy: centro(o.cy) };
}

export function modoAdatta(vw, vh, bw, bh, adatta) {
  if (adatta === 'ritaglia' || adatta === 'intera') return adatta;
  const taglio = Math.max(bw / vw, bh / vh) / Math.min(bw / vw, bh / vh);
  return taglio <= TAGLIO_MAX + 1e-9 ? 'ritaglia' : 'intera';
}

export function inquadra(vw, vh, box, q = {}, { zoom = 1, specchio = false } = {}) {
  if (!(vw > 0 && vh > 0 && box && box.w > 0 && box.h > 0)) return null;
  const modo = modoAdatta(vw, vh, box.w, box.h, q?.adatta);
  const z = num(zoom, 1, 64, 1);
  const s = (modo === 'ritaglia' ? Math.max(box.w / vw, box.h / vh) : Math.min(box.w / vw, box.h / vh)) * z;
  const sw = Math.min(vw, box.w / s), sh = Math.min(vh, box.h / s);
  const cx = num(q?.cx, -1, 1, 0), cy = num(q?.cy, -1, 1, 0);
  const sx = (vw - sw) / 2 * (1 + (specchio ? -cx : cx)), sy = (vh - sh) / 2 * (1 + cy);
  const dw = sw * s, dh = sh * s;
  return { modo, s, sx, sy, sw, sh, dx: box.x + (box.w - dw) / 2, dy: box.y + (box.h - dh) / 2, dw, dh, bande: dw < box.w - 0.5 || dh < box.h - 0.5, specchio: !!specchio };
}

export function spostaCentro(r, vw, vh, q, ddx, ddy) {
  const mx = (vw - r.sw) / 2, my = (vh - r.sh) / 2;
  return {
    cx: mx > 0.5 ? centro(num(q?.cx, -1, 1, 0) - ddx / r.s / mx) : centro(q?.cx),
    cy: my > 0.5 ? centro(num(q?.cy, -1, 1, 0) - ddy / r.s / my) : centro(q?.cy),
  };
}

export function prossimoZoom(z, max) {
  const passi = PASSI_ZOOM.filter((p) => p <= max + 1e-9);
  return passi.find((p) => p > z + 0.05) ?? 1;
}

export function orientamentoStorto(vw, vh, f) {
  if (!(vw > 0 && vh > 0)) return '';
  if (f === 'v' && vw > vh * 1.05) return 'dritto';
  if (f === 'o' && vh > vw * 1.05) return 'lato';
  return '';
}

export function nomeCamera(label, i, t) {
  const m = /camera2 (\d+), facing (front|back)/i.exec(String(label || ''));
  if (m) return `${m[2].toLowerCase() === 'front' ? t.davanti : t.dietro} ${Number(m[1]) + 1}`;
  return String(label || '').trim().slice(0, 60) || `${t.fotocamera} ${i + 1}`;
}

const LATO_DAVANTI = /\b(front|frontale|anteriore|delantera|frontal|user)\b/i;
const LATO_DIETRO = /\b(back|rear|posteriore|trasera|environment)\b/i;
const PAROLE_VUOTE = /\b(fotocamera|camera|cámara|camara|front|frontale|anteriore|delantera|frontal|back|rear|posteriore|trasera|environment|user)\b/gi;

export function nomeBreveCamera(label, i, t) {
  const pieno = nomeCamera(label, i, t), l = String(label || '');
  if (/camera2 \d+, facing/i.test(l) || !l.trim()) return { lato: '', obiettivo: pieno, nome: pieno };
  const lato = LATO_DAVANTI.test(l) ? t.davanti : (LATO_DIETRO.test(l) ? t.dietro : '');
  const resto = l.replace(PAROLE_VUOTE, ' ').replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
  const obiettivo = resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
  return { lato, obiettivo, nome: obiettivo || lato || pieno };
}

const CANALE = /^(mic|desk|media|sfx|rem:[A-Za-z0-9_-]{1,40}|aud:[a-z0-9]{1,24})$/;

function audio(a) {
  const o = a && typeof a === 'object' ? a : {};
  const usati = new Set(), canali = [];
  for (const c of Array.isArray(o.canali) ? o.canali : []) {
    if (canali.length >= LIMITI.tracce || !c || typeof c !== 'object' || !TRACCE.includes(c.tipo)) continue;
    let id = ID.test(String(c.id || '')) ? String(c.id) : nuovoId('a');
    while (usati.has(id)) id = nuovoId('a');
    usati.add(id);
    const file = c.tipo === 'file' ? media(c.file) : null;
    canali.push({ id, tipo: c.tipo, nome: testo(c.nome, LIMITI.nome) || file?.nome.slice(0, LIMITI.nome) || '', dispositivo: c.tipo === 'ingresso' ? testo(c.dispositivo, 200) : '', file, giro: c.giro !== false });
  }
  const vod = {};
  for (const [k, v] of Object.entries(o.vod && typeof o.vod === 'object' ? o.vod : {})) if (v === false && CANALE.test(k) && (!k.startsWith('aud:') || usati.has(k.slice(4)))) vod[k] = false;
  return { canali, vod };
}

export const nelVod = (scelte, canale) => scelte?.audio?.vod?.[canale] !== false;
export const vodServe = (scelte) => Object.keys(scelte?.audio?.vod || {}).length > 0;

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
  if (INQUADRABILI.includes(f.tipo)) out.inq = { o: inq(f.inq?.o, f.tipo), v: inq(f.inq?.v, f.tipo) };
  if (f.tipo === 'overlay') out.overlay = /^[A-Za-z0-9_-]{1,40}$/.test(String(f.overlay || '')) ? String(f.overlay) : '';
  if (f.tipo === 'remota') out.dispositivo = ID_DISPOSITIVO.test(String(f.dispositivo || '')) ? String(f.dispositivo) : '';
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
  return { id, nome: testo(s.nome, LIMITI.nome) || 'Scena', fonti, muta: s.muta === true, camera: FACCE.includes(s.camera) ? s.camera : '', audio: AUDIO_SCENA.includes(s.audio) ? s.audio : 'computer' };
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
    telefono: telefono(o.telefono),
    audio: audio(o.audio),
    overlay: /^[A-Za-z0-9_-]{1,40}$/.test(String(o.overlay || '')) ? String(o.overlay) : '',
  };
}

function telefono(t) {
  const o = t && typeof t === 'object' ? t : {};
  const scenario = Object.hasOwn(SCENARI, o.scenario) && SCENARI[o.scenario].disponibile ? o.scenario : '';
  return {
    scenario,
    chat: CHAT_GRANDEZZE.includes(o.chat) ? o.chat : 'm',
    voce: typeof o.voce === 'boolean' ? o.voce : (scenario ? SCENARI[scenario].voce : false),
    vibra: o.vibra !== false,
    segui: o.segui !== false,
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

export function nuovaFonte(tipo, { nome = '', media: m = null, testo: t = 'Testo', overlay = '', dispositivo = '' } = {}) {
  const usati = new Set();
  const base = { id: nuovoId('f'), tipo, nome: nome || tipo, media: m, testo: t, colore: '#ffffff', dim: 56, grassetto: true, sfondo: '', overlay, dispositivo };
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
  for (const c of doc?.scelte?.audio?.canali || []) if (c.file?.impronta) out.add(c.file.impronta);
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
  const fs = scelteDoc?.formati;
  if (fs && fs.o !== fs.v) return fs.v ? 'v' : 'o';
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

export function escluse(scelteGiuste, destinazioni) {
  return destinazioni.filter((d) => !scelteGiuste.formati[formatoDi(d, scelteGiuste)]);
}

export function vincoliAudio(scenario) {
  return { ...AUDIO[SCENARI[scenario]?.audio === 'musica' ? 'musica' : 'voce'] };
}

function pieno(tipo, extra = {}) {
  const f = nuovaFonte(tipo, extra);
  for (const k of ['o', 'v']) f.pos[k] = { x: 0, y: 0, w: FORMATI[k].W, h: FORMATI[k].H, vis: true };
  if (tipo === 'testo') Object.assign(f, { testo: testo(extra.testo, LIMITI.testo), dim: 72, sfondo: '#14141c', colore: '#ffffff', grassetto: true });
  return f;
}

const PRONTE = {
  io: (t) => ({ nome: t.io, camera: 'user', fonti: [pieno('webcam', { nome: t.camera }), pieno('overlay', { nome: 'Overlay' })] }),
  vedo: (t) => ({ nome: t.vedo, camera: 'environment', fonti: [pieno('webcam', { nome: t.camera }), pieno('overlay', { nome: 'Overlay' })] }),
  camera: (t) => ({ nome: t.inCamera, camera: 'user', fonti: [pieno('webcam', { nome: t.camera }), pieno('overlay', { nome: 'Overlay' })] }),
  lavoro: (t) => ({ nome: t.lavoro, camera: 'environment', fonti: [pieno('webcam', { nome: t.camera }), pieno('overlay', { nome: 'Overlay' })] }),
  palco: (t) => ({ nome: t.palco, camera: '', fonti: [pieno('webcam', { nome: t.camera }), pieno('overlay', { nome: 'Overlay' })] }),
  pausa: (t) => ({ nome: t.pausa, muta: true, fonti: [pieno('testo', { nome: t.pausa, testo: t.pausaTesto }), pieno('overlay', { nome: 'Overlay' })] }),
  tornosubito: (t) => ({ nome: t.tornosubito, muta: true, fonti: [pieno('testo', { nome: t.tornosubito, testo: t.tornosubitoTesto }), pieno('overlay', { nome: 'Overlay' })] }),
  privacy: (t) => ({ nome: t.privacy, fonti: [pieno('testo', { nome: t.privacy, testo: t.privacyTesto }), pieno('overlay', { nome: 'Overlay' })] }),
};
export const TESTI_PRONTE = Object.freeze(['io', 'vedo', 'inCamera', 'lavoro', 'palco', 'camera', 'pausa', 'pausaTesto', 'tornosubito', 'tornosubitoTesto', 'privacy', 'privacyTesto']);

export function scenePronte(scenario, testi) {
  const sc = SCENARI[scenario];
  if (!sc || !sc.disponibile) return [];
  const us = new Set(), uf = new Set();
  return sc.scene.map((k) => normalizzaScena(PRONTE[k](testi), us, uf));
}

export const sceneVuote = (doc) => !doc.scene.some((s) => s.fonti.some((f) => f.tipo !== 'overlay'));

export function applicaPronte(doc, scenario, testi, { aggiungi = false } = {}) {
  const pronte = scenePronte(scenario, testi);
  if (!pronte.length) return 0;
  if (sceneVuote(doc) && !aggiungi) {
    doc.scene = pronte;
    doc.inOnda = doc.anteprima = pronte[0].id;
  } else {
    if (!aggiungi) return 0;
    const nomi = new Set(doc.scene.map((s) => s.nome));
    const nuove = pronte.filter((s) => !nomi.has(s.nome)).slice(0, Math.max(0, LIMITI.scene - doc.scene.length));
    doc.scene.push(...nuove);
    return nuove.length;
  }
  return pronte.length;
}

export function scenaAccanto(doc, id, dir) {
  const i = doc.scene.findIndex((s) => s.id === id);
  if (i < 0 || doc.scene.length < 2) return null;
  return doc.scene[(i + (dir > 0 ? 1 : -1) + doc.scene.length) % doc.scene.length].id;
}

export function overlayDi(fonte, scelteDoc, elenco = []) {
  const ids = elenco.map((o) => o.id);
  for (const id of [fonte?.overlay, scelteDoc?.overlay]) if (id && (!ids.length || ids.includes(id))) return id;
  return ids[0] || '';
}

const vedeDispositivo = (f, id, formati) => f.tipo === 'remota' && f.dispositivo === id && formati.some((k) => f.pos[k]?.vis);

export function microfoniInOnda(scena, connessi = []) {
  if (!scena || scena.muta) return { computer: false, dispositivi: [] };
  const visti = [...new Set(scena.fonti.filter((f) => f.tipo === 'remota' && connessi.includes(f.dispositivo) && (f.pos.o.vis || f.pos.v.vis)).map((f) => f.dispositivo))];
  if (scena.audio === 'dispositivi') return { computer: false, dispositivi: visti };
  if (scena.audio === 'tutti') return { computer: true, dispositivi: visti };
  return { computer: true, dispositivi: [] };
}

export function copreTutto(f) {
  return ['o', 'v'].every((k) => { const p = f.pos[k], { W, H } = FORMATI[k]; return p.vis && p.x <= W * 0.025 && p.y <= H * 0.025 && p.x + p.w >= W * 0.975 && p.y + p.h >= H * 0.975; });
}

export function scenaProtagonista(nome, id) {
  const us = new Set(), uf = new Set();
  return normalizzaScena({ nome, audio: 'dispositivi', fonti: [pieno('remota', { nome, dispositivo: id }), pieno('overlay', { nome: 'Overlay' })] }, us, uf);
}

export const scenaDelProtagonista = (doc, id) => doc.scene.find((s) => s.fonti.some((f) => f.tipo === 'remota' && f.dispositivo === id && copreTutto(f))) || null;

export function tallyDi(doc, id, { live = false, lavoro = 'o', modalita = false } = {}) {
  const formati = live ? ['o', 'v'].filter((k) => doc.scelte.formati[k]) : [lavoro];
  const vede = (s) => !!s && s.fonti.some((f) => vedeDispositivo(f, id, formati));
  const onda = vede(doc.scene.find((s) => s.id === doc.inOnda));
  const anteprima = !!modalita && doc.anteprima !== doc.inOnda && vede(doc.scene.find((s) => s.id === doc.anteprima));
  return { onda, anteprima };
}

export function scenaDiRipiego(doc, id, prima) {
  const senza = (s) => !!s && !s.fonti.some((f) => f.tipo === 'remota' && f.dispositivo === id);
  const p = doc.scene.find((s) => s.id === prima);
  if (senza(p)) return p.id;
  return doc.scene.find(senza)?.id || '';
}
