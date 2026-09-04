// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

'use strict';

const parti = location.pathname.split('/').filter(Boolean);
const login = parti[1] || '';
const urlStream = '/overlay/' + encodeURIComponent(login) + '/stream' + location.search;

const MIO = { mostra: { alert: true, chat: true, wf: true, ws: true, effetti: true }, xy: {}, stile: { alert: null, chat: null }, widget: {} };
const mostra = (k) => MIO.mostra[k] !== false;

const palco = document.getElementById('palco');
const etichette = document.getElementById('etichette');
const testi = document.getElementById('testi');
const penBox = document.getElementById('penitenze');
const alertBox = document.getElementById('alert');
const chatBox = document.getElementById('chatlive');

const codaVisiva = [];
let occupato = false;

function mostraProssimo() {
  if (occupato || !codaVisiva.length) return;
  occupato = true;
  const ev = codaVisiva.shift();
  if (ev.tipo === 'immagine') mostraImmagine(ev);
  else if (ev.tipo === 'video') mostraVideo(ev);
  else finito();
}

function finito() {
  occupato = false;

  setTimeout(mostraProssimo, 120);
}

function durataMs(ev, fallback) {
  const n = Number(ev.durata);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function volume01(ev) {
  const n = Number(ev.volume);
  const v = Number.isFinite(n) ? n : 100;
  return Math.min(1, Math.max(0, v / 100));
}

const tiraXY = (v, f) => Math.round((50 * (f - 1) - v * f) * 100) / 100;

function posizionaEffetto(el, pos) {
  if (!pos || pos.x == null) return;
  el.classList.add('libero');
  el.style.left = pos.x + '%'; el.style.top = pos.y + '%';

  const f = (Number(pos.s) || 100) / 100;
  el.style.setProperty('--fx-ax', tiraXY(pos.x, f) + '%');
  el.style.setProperty('--fx-ay', tiraXY(pos.y, f) + '%');
  el.style.setProperty('--fx-s', f);
  el.style.setProperty('--fx-r', (Number(pos.r) || 0) + 'deg');
}

function suonaAbbinato(ev) {
  if (!ev || !ev.suonoUrl) return;
  try { const a = new Audio(ev.suonoUrl); a.volume = volume01(ev); a.play().catch(() => {}); } catch (e) {  }
}

function mostraImmagine(ev) {
  const img = document.createElement('img');
  img.className = 'effetto';
  img.src = ev.url;
  posizionaEffetto(img, ev.posizione);
  palco.appendChild(img);
  suonaAbbinato(ev);
  requestAnimationFrame(() => img.classList.add('dentro'));
  etichettaVolatile(ev.comando, durataMs(ev, 5000));
  setTimeout(() => {
    img.classList.remove('dentro');
    setTimeout(() => { img.remove(); finito(); }, 320);
  }, durataMs(ev, 5000));
}

function mostraVideo(ev) {

  if (ev.chroma && ev.chroma.colore) return mostraVideoChroma(ev);
  const v = document.createElement('video');
  v.className = 'effetto';
  v.src = ev.url;
  v.autoplay = true;
  v.playsInline = true;
  v.volume = volume01(ev);
  posizionaEffetto(v, ev.posizione);
  palco.appendChild(v);
  suonaAbbinato(ev);
  requestAnimationFrame(() => v.classList.add('dentro'));
  etichettaVolatile(ev.comando, 1800);

  let chiuso = false;
  const chiudi = () => {
    if (chiuso) return;
    chiuso = true;
    v.classList.remove('dentro');
    setTimeout(() => { try { v.pause(); } catch (e) {} v.remove(); finito(); }, 320);
  };
  v.addEventListener('ended', chiudi);
  v.addEventListener('error', chiudi);
  v.play().catch(() => {});

  setTimeout(chiudi, durataMs(ev, 8000) + 600);
}

function hexToRgb(h) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(h || '').trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 255, 0];
}

function mostraVideoChroma(ev) {
  const v = document.createElement('video');
  v.src = ev.url; v.autoplay = true; v.playsInline = true; v.volume = volume01(ev);
  const canvas = document.createElement('canvas');
  canvas.className = 'effetto';
  posizionaEffetto(canvas, ev.posizione);
  palco.appendChild(canvas);
  suonaAbbinato(ev);
  requestAnimationFrame(() => canvas.classList.add('dentro'));
  etichettaVolatile(ev.comando, 1800);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const [kr, kg, kb] = hexToRgb(ev.chroma.colore);
  const soglia = Math.max(20, Math.min(300, Number(ev.chroma.soglia) || 140));
  let raf = 0, chiuso = false;
  const disegna = () => {
    if (chiuso) return;
    if (v.videoWidth) {
      if (!canvas.width) {
        const sc = Math.min(1, 640 / v.videoWidth);
        canvas.width = Math.max(2, Math.round(v.videoWidth * sc));
        canvas.height = Math.max(2, Math.round(v.videoHeight * sc));
      }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      try {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.abs(d[i] - kr) + Math.abs(d[i + 1] - kg) + Math.abs(d[i + 2] - kb) < soglia) d[i + 3] = 0;
        }
        ctx.putImageData(img, 0, 0);
      } catch (e) {  }
    }
    raf = requestAnimationFrame(disegna);
  };
  const chiudi = () => {
    if (chiuso) return; chiuso = true;
    cancelAnimationFrame(raf);
    canvas.classList.remove('dentro');
    setTimeout(() => { try { v.pause(); } catch (e) {} canvas.remove(); finito(); }, 320);
  };
  v.addEventListener('ended', chiudi);
  v.addEventListener('error', chiudi);
  v.play().catch(() => {});
  disegna();
  setTimeout(chiudi, durataMs(ev, 8000) + 600);
}

function suona(ev) {
  try {
    const a = new Audio(ev.url);
    a.volume = volume01(ev);
    a.play().catch(() => {});
  } catch (e) {  }
  etichettaVolatile(ev.comando, 1600);
}

function suonaPreset(ev) {
  try { window.SUONI_PRESET && window.SUONI_PRESET.suona(ev.preset, ev.volume); } catch (e) {  }
  etichettaVolatile(ev.comando, 1600, false);
}

function mostraTesto(ev) {
  const t = String(ev.testo || '').slice(0, 400);
  if (!t) return;
  const durata = durataMs(ev, 5000);
  const el = document.createElement('div');
  el.className = 'testo-overlay';
  el.textContent = t;
  testi.appendChild(el);
  requestAnimationFrame(() => el.classList.add('dentro'));
  setTimeout(() => {
    el.classList.remove('dentro');
    setTimeout(() => el.remove(), 320);
  }, durata);
}

const penCard = {};

function penitenza(ev) {
  if (ev.azione === 'start') penStart(ev);
  else if (ev.azione === 'hit') penHit(ev);
  else if (ev.azione === 'end') penEnd(ev);
}

function penStart(ev) {
  penBox.className = ev.posizione || 'alto-destra';
  if (ev.colore) penBox.style.setProperty('--pen-colore', ev.colore);
  const parola = String(ev.valore || '').toUpperCase();
  const eti = ev.modo === 'solo' ? 'dì solo' : 'vietata';
  const card = document.createElement('div');
  card.className = 'pen-card';
  card.innerHTML = '<span class="pen-parola"><small>' + eti + '</small>' + escHtml(parola) + '</span><span class="pen-num">0</span>';
  penBox.appendChild(card);
  penCard[ev.id] = card;
  requestAnimationFrame(() => card.classList.add('dentro'));
}

function penHit(ev) {
  const card = penCard[ev.id];
  if (!card) return;
  const num = card.querySelector('.pen-num');
  if (num) num.textContent = String(ev.count);
  card.classList.remove('colpito');
  void card.offsetWidth;
  card.classList.add('colpito');
  const piu = document.createElement('div');
  piu.className = 'pen-piu';
  piu.textContent = '+' + (ev.inc || 1);
  card.appendChild(piu);
  setTimeout(() => piu.remove(), 1000);
}

function penEnd(ev) {
  const card = penCard[ev.id];
  if (!card) return;
  const esito = ev.count > 0
    ? 'PENITENZA: ' + escHtml(String(ev.penitenza || '')) + (ev.count > 1 ? ' ×' + ev.count : '')
    : 'Salvo!';
  card.innerHTML = '<span class="pen-esito">' + esito + '</span>';
  setTimeout(() => {
    card.classList.remove('dentro');
    setTimeout(() => { card.remove(); delete penCard[ev.id]; }, 400);
  }, ev.count > 0 ? 6000 : 2500);
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const codaAlert = [];
let alertOccupato = false;
const ALERT_ICO = {
  follow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  sub: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  cheer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-3 7h5l-3 7"/><circle cx="12" cy="12" r="9"/></svg>',
  raid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
};

const FONT = { sistema: 'var(--font-sistema)', rotondo: 'var(--font-rotondo)', condensato: 'var(--font-condensato)', mono: 'var(--font-mono)', serif: 'var(--font-serif)', manga: 'var(--font-manga)' };

const _gfont = new Set();
function caricaFontGoogle(nome) {
  const n = String(nome || '').trim();
  if (!n) return null;
  if (!_gfont.has(n.toLowerCase())) {
    _gfont.add(n.toLowerCase());
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + '&display=swap';
    document.head.appendChild(l);
  }
  return "'" + n + "', var(--font-sistema)";
}
const _mieiFont = new Set();
function montaFontMio(nome, url) {
  if (!nome || !url || _mieiFont.has(nome)) return;
  _mieiFont.add(nome);
  const st = document.createElement('style');
  st.textContent = '@font-face{font-family:"' + nome + '";src:url("' + url + '");font-display:swap}';
  document.head.appendChild(st);
}
const fontDi = (st) => {
  const f = String((st || {}).font || '');
  if (f.startsWith('mio:')) return '"' + f.slice(4) + '", var(--font-sistema)';
  return st && st.googleFont ? caricaFontGoogle(st.googleFont) : (FONT[f] || null);
};

function applicaVars(el, vars) { for (const k in vars) { if (vars[k] != null && vars[k] !== '') el.style.setProperty(k, String(vars[k])); } }

function trasformaXY(xy) {
  const s = (Number(xy.s) || 100) / 100, r = Number(xy.r) || 0;
  return 'translate(' + tiraXY(xy.x, s) + '%,' + tiraXY(xy.y, s) + '%) scale(' + s + ') rotate(' + r + 'deg)';
}

function posizionaContenitore(el, xy, corner) {
  if (xy && xy.x != null) {
    el.className = '';
    el.style.left = xy.x + '%'; el.style.top = xy.y + '%';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.width = 'auto';
    el.style.transform = trasformaXY(xy);
  } else {
    el.className = corner;
    el.style.left = el.style.top = el.style.right = el.style.bottom = el.style.width = el.style.transform = '';
  }
}

function alert(ev) { if (!mostra('alert')) return; codaAlert.push(ev); mostraAlertProssimo(); }

const _AX = {
  forma: ['carta', 'pillola', 'squadrata', 'taglio', 'insegna', 'esagono', 'nastro', 'fumetto'],
  materia: ['piatta', 'sfumata', 'vetro', 'carta', 'neon', 'crt', 'griglia'],
  cornice: ['linea', 'nessuna', 'spessa', 'angoli', 'barra'],
  comp: ['colonna', 'riga', 'riga-inv', 'sovrapposta'],
};
function classiIdentita(st, corniceDef) {
  const p = (k, v, d) => 'forma' === k || 'materia' === k || 'cornice' === k
    ? k + '-' + (_AX[k].indexOf(v) >= 0 ? v : d) : '';
  st = st || {};
  return [p('forma', st.forma, 'carta'), p('materia', st.materia, 'piatta'),
    p('cornice', st.cornice, corniceDef || 'linea')].join(' ');
}
function classeComp(st) {
  const v = (st || {}).composizione;
  return 'comp-' + (_AX.comp.indexOf(v) >= 0 ? v : 'colonna');
}

function mostraAlertProssimo() {
  if (alertOccupato || !codaAlert.length) return;
  alertOccupato = true;
  const ev = codaAlert.shift();

  const st = MIO.stile.alert || ev.stile || {};
  posizionaContenitore(alertBox, MIO.xy.alert || ev.xy, ev.posizione || 'alto-centro');
  const card = document.createElement('div');
  card.className = 'alert-card anim-' + (st.animazione || 'slide') + (st.glow ? ' glow' : '') + (st.icona === false ? ' senza-ico' : '')
    + (st.evidenziaNome === false ? ' senza-evid' : '') + ' maiusc-' + (st.maiuscolo || 'no')
    + ' ' + classiIdentita(st) + ' ' + classeComp(st);
  applicaVars(card, {
    '--acc': ev.colore, '--bg': st.sfondo, '--op': st.opacita != null ? st.opacita + '%' : null,
    '--fg': st.testo, '--radius': st.bordoRaggio != null ? st.bordoRaggio + 'px' : null,
    '--bordo-px': st.bordoSpessore != null ? st.bordoSpessore + 'px' : null,
    '--size': st.dimTesto != null ? st.dimTesto + 'px' : null, '--font': fontDi(st) || null,
    '--dim-ico': (st.dimIcona != null ? st.dimIcona : 46) + 'px',
    '--peso': String(st.peso || '700'),
    '--spaz': (Number(st.spaziatura) || 0) + 'px',
    '--ombra-testo': st.ombraTesto === false ? 'none' : '0 2px 10px rgba(0,0,0,.45)',
  });
  const testoHtml = escHtml(ev.testo || '').replace(/^(\S+)/, '<b>$1</b>');

  let mediaHtml = '';
  if (ev.mediaUrl) {
    mediaHtml = ev.mediaTipo === 'video'
      ? '<video class="alert-media" src="' + escHtml(ev.mediaUrl) + '" autoplay playsinline></video>'
      : '<img class="alert-media" src="' + escHtml(ev.mediaUrl) + '">';
  }
  const libro = window.ICONE_OVL;
  const icoScelta = ev.icona === '' ? ''
    : (ev.iconaUrl ? '<img src="' + escHtml(ev.iconaUrl) + '" alt="">'
      : (libro && ev.icona ? libro.svg(ev.icona) : (ALERT_ICO[ev.kind] || ALERT_ICO.follow)));
  card.innerHTML = mediaHtml + '<div class="alert-ico">' + icoScelta + '</div><div class="alert-testo">' + testoHtml + '</div>';
  alertBox.appendChild(card);
  const vol01 = (ev.volume != null ? ev.volume : 100) / 100;
  const vid = card.querySelector('video.alert-media'); if (vid) { try { vid.volume = vol01; } catch (e) {  } }
  requestAnimationFrame(() => card.classList.add('dentro'));

  try {
    if (ev.suonoUrl) { const au = new Audio(ev.suonoUrl); au.volume = vol01; au.play().catch(() => {}); }
    else if (ev.suono && window.SUONI_PRESET) window.SUONI_PRESET.suona(ev.suono, ev.volume != null ? ev.volume : 100);
  } catch (e) {  }
  const durata = Math.max(2000, Number(ev.durata) || 6000);
  setTimeout(() => {
    card.classList.remove('dentro');
    setTimeout(() => { card.remove(); alertOccupato = false; setTimeout(mostraAlertProssimo, 250); }, 450);
  }, durata);
}

let EMOTE = {};
async function caricaEmote() {
  try {
    const r = await fetch('/overlay/' + encodeURIComponent(login) + '/emotes' + location.search);
    if (r.ok) { const m = await r.json(); if (m && typeof m === 'object') EMOTE = m; }
  } catch (e) {  }
}

let BADGE = {};
async function caricaBadge() {
  try {
    const r = await fetch('/overlay/' + encodeURIComponent(login) + '/badges' + location.search);
    if (r.ok) { const m = await r.json(); if (m && typeof m === 'object') BADGE = m; }
  } catch (e) {  }
}

function aggiungiStemmi(riga, ev) {
  const img = (src, alt) => {
    if (!src) return;
    const i = document.createElement('img');
    i.className = 'chat-badge'; i.alt = ''; i.decoding = 'async';
    i.referrerPolicy = 'no-referrer';
    i.title = alt || '';
    i.addEventListener('error', () => { i.remove(); }, { once: true });
    i.src = src;
    riga.appendChild(i);
  };
  if (ev.badges) for (const b of String(ev.badges).split(',')) { const u = BADGE[b.trim()]; if (u) img(u, b); }
  if (ev.badge7tv) img(ev.badge7tv, '7tv');
}

function testoConEmote(riga, testo, extra) {
  const pezzi = String(testo || '').split(/(\s+)/);
  for (const p of pezzi) {

    const url = p && (EMOTE[p] || (extra && extra[p]));
    if (url) {
      const img = document.createElement('img');
      img.className = 'emote';
      img.alt = '';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.title = p;
      img.addEventListener('error', () => { img.replaceWith(document.createTextNode(p)); }, { once: true });
      img.src = url;
      riga.appendChild(img);
    } else if (p) {
      riga.appendChild(document.createTextNode(p));
    }
  }
}

function chat(ev) {
  if (!mostra('chat')) return;
  const st = MIO.stile.chat || ev.stile || {};
  posizionaContenitore(chatBox, MIO.xy.chat || ev.xy, ev.posizione || 'basso-sinistra');
  if (st.larghezza) chatBox.style.maxWidth = st.larghezza + 'vw';
  const destra = !ev.xy && /destra/.test(ev.posizione || '');
  const riga = document.createElement('div');
  riga.className = 'chat-riga dim-' + (st.dim || 'media') + ' anim-' + (st.animazione || 'slide') + (st.ombra !== false ? ' ombra' : '') + (st.grassettoUser !== false ? ' user-bold' : '')
    + ' maiusc-' + (st.maiuscolo || 'no') + ' ' + classiIdentita(st, 'nessuna');
  applicaVars(riga, { '--peso': String(st.peso || '700'), '--spaz': (Number(st.spaziatura) || 0) + 'px',
    '--ombra-testo': st.ombraTesto === true ? '0 2px 8px rgba(0,0,0,.6)' : 'none' });
  applicaVars(riga, {
    '--bg': st.sfondo, '--op': st.opacita != null ? st.opacita + '%' : null,
    '--fg': st.testo, '--radius': st.bordoRaggio != null ? st.bordoRaggio + 'px' : null, '--font': fontDi(st) || null,
  });
  if (destra) riga.style.transform = 'translateX(10px)';
  aggiungiStemmi(riga, ev);
  const u = document.createElement('span');
  u.className = 'chat-user';
  u.textContent = ev.user || '';

  const cu = (st.username && st.username !== 'twitch') ? st.username : ev.colore;
  if (cu) u.style.color = cu;
  riga.appendChild(u);
  testoConEmote(riga, ev.testo || '', ev.emotiTwitch);
  chatBox.appendChild(riga);
  requestAnimationFrame(() => { riga.style.transform = ''; riga.classList.add('dentro'); });
  const max = Math.max(1, Number(ev.max) || 8);
  while (chatBox.children.length > max) chatBox.firstChild.remove();
  const fade = Math.max(0, Number(ev.fadeSec) || 0);
  if (fade > 0) setTimeout(() => {
    riga.classList.add('uscita');
    setTimeout(() => riga.remove(), 400);
  }, fade * 1000);
}

const WIDGET_ICO = {
  ultimoFollower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  ultimoSub: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
};
const wboxes = {};
document.querySelectorAll('.wbox').forEach((b) => { wboxes[b.dataset.ang] = b; });
const widgetEl = {};

function widget(id, cfg, valore) {
  cfg = cfg || {};

  if (!cfg.attivo) { if (widgetEl[id]) { widgetEl[id].remove(); delete widgetEl[id]; } return; }
  const ang = cfg.posizione || 'basso-destra';
  let el = widgetEl[id];
  if (!el) {
    el = document.createElement('div');
    el.className = 'ovl-widget';
    el.innerHTML = '<span class="w-ico"></span><span class="w-testo"></span>';
    widgetEl[id] = el;
  }
  (wboxes[ang] || wboxes['basso-destra']).appendChild(el);

  const xyEff = MIO.xy[id === 'ultimoSub' ? 'ws' : 'wf'] || cfg.xy;
  if (xyEff && xyEff.x != null) {
    el.style.position = 'fixed'; el.style.left = xyEff.x + '%'; el.style.top = xyEff.y + '%';
    el.style.transform = trasformaXY(xyEff);
  } else { el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.transform = ''; }
  const st = cfg.stile || {};
  el.className = 'ovl-widget dim-' + (st.dim || 'media') + ' ' + classiIdentita(st, 'nessuna');
  applicaVars(el, { '--dim-ico': (st.dimIcona != null ? st.dimIcona : 20) + 'px' });
  applicaVars(el, {
    '--bg': st.sfondo, '--op': st.opacita != null ? st.opacita + '%' : null, '--fg': st.testo,
    '--acc': st.accento, '--radius': st.bordoRaggio != null ? st.bordoRaggio + 'px' : null, '--font': fontDi(st) || null,
  });
  const libroW = window.ICONE_OVL;
  el.querySelector('.w-ico').innerHTML = st.icona === '' ? ''
    : (cfg.iconaUrl ? '<img src="' + escHtml(cfg.iconaUrl) + '" alt="">'
      : (libroW && st.icona ? libroW.svg(st.icona) : (WIDGET_ICO[id] || '')));
  const tpl = cfg.testo || '{nome}';
  el.querySelector('.w-testo').innerHTML = escHtml(tpl).replace(/\{nome\}/g, '<b>' + escHtml(valore || '—') + '</b>');
}

function etichettaVolatile(comando, durata, conPrefisso = true) {
  if (!comando) return;
  const el = document.createElement('div');
  el.className = 'pillola';
  el.textContent = (conPrefisso ? '!' : '') + comando;
  etichette.appendChild(el);
  requestAnimationFrame(() => el.classList.add('dentro'));
  setTimeout(() => {
    el.classList.remove('dentro');
    setTimeout(() => el.remove(), 300);
  }, Math.max(800, durata));
}

function connetti() {
  const es = new EventSource(urlStream);
  es.onmessage = (m) => {
    let dati;
    try { dati = JSON.parse(m.data); } catch (e) { return; }
    if (!dati || !dati.tipo) return;

    if (dati.tipo === 'audio') { if (mostra('effetti')) suona(dati); }
    else if (dati.tipo === 'preset') { if (mostra('effetti')) suonaPreset(dati); }
    else if (dati.tipo === 'penitenza') { if (mostra('effetti')) penitenza(dati); }
    else if (dati.tipo === 'alert') alert(dati);
    else if (dati.tipo === 'chat') chat(dati);
    else if (dati.tipo === 'widget') { if (mostra(dati.id === 'ultimoSub' ? 'ws' : 'wf')) widget(dati.id, (MIO.widget && MIO.widget[dati.id]) || dati.cfg, dati.valore); }
    else if (dati.tipo === 'goal') { MIO.goals = Array.isArray(dati.goals) ? dati.goals : MIO.goals; goal(MIO.goals, dati.conti || {}); }
    else if (dati.tipo === 'tema') caricaTema();
    else if (dati.tipo === 'testo') { if (mostra('effetti')) mostraTesto(dati); }
    else if (dati.tipo === 'contatore') contatore(dati);
    else if (dati.tipo === 'immagine' || dati.tipo === 'video') { if (mostra('effetti')) { codaVisiva.push(dati); mostraProssimo(); } }
  };

  es.onerror = () => {};
}

const CONT_BASE = 40;

function fontStackCont(f) {
  const m = window.FONT_CONT || {};
  return m[f] || m.system || 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
}
function contatore(d) {
  const id = 'cont-' + String(d.comando || '').replace(/[^a-z0-9_]/gi, '').slice(0, 30);
  let el = document.getElementById(id);
  const cmd = String(d.comando || '').toLowerCase();
  if (!d.mostra || !mostra('cont') || !mostra('cont:' + cmd)) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = id; el.className = 'contatore-widget ovl-widget forma-carta materia-piatta cornice-nessuna'; document.body.appendChild(el); }
  el.textContent = String(d.testo || '');
  const mio = (MIO.xy || {})['cont:' + cmd] || null;
  const x = mio ? Number(mio.x) : (isFinite(Number(d.x)) ? Number(d.x) : 6);
  const y = mio ? Number(mio.y) : (isFinite(Number(d.y)) ? Number(d.y) : 84);
  el.style.left = x + '%';
  el.style.top = y + '%';

  const r = Number(mio ? mio.r : d.r) || 0;
  el.style.transform = 'translate(-' + x + '%,-' + y + '%)' + (r ? ' rotate(' + r + 'deg)' : '');
  el.style.setProperty('--fg', d.colore || '#ffffff');
  if (d.sfondo) el.style.setProperty('--bg', d.sfondo);
  el.style.color = d.colore || '#ffffff';
  const corpo = mio ? (CONT_BASE * (Number(mio.s) || 100)) / 100 : (Number(d.dim) || CONT_BASE);
  el.style.fontSize = Math.max(8, Math.min(200, Math.round(corpo))) + 'px';
  el.style.fontWeight = d.grassetto ? '800' : '500';
  el.style.fontFamily = fontStackCont(d.font);
}

const GOAL_ETICHETTA = { follower: 'follower', sub: 'sub', bit: 'bit' };

const goalEl = {};

function unGoal(cfg, valore) {
  const id = cfg.id;
  let el = goalEl[id];
  if (!cfg.attivo || !mostra('goal') || !mostra('goal:' + id)) { if (el) { el.remove(); delete goalEl[id]; } return; }
  if (!el) {
    el = document.createElement('div');
    el.innerHTML = '<div class="g-testa"><span class="g-tit"></span><span class="g-num"></span></div>'
      + '<div class="g-barra"><i></i></div>';
    goalEl[id] = el;
  }
  (wboxes[cfg.posizione] || wboxes['alto-sinistra'] || document.body).appendChild(el);
  const st = cfg.stile || {};
  el.className = 'ovl-widget ovl-goal dim-' + (st.dim || 'media') + ' ' + classiIdentita(st, 'nessuna');
  posaElemento(el, 'goal:' + id, cfg);
  applicaVars(el, {
    '--bg': st.sfondo, '--op': st.opacita != null ? st.opacita + '%' : null, '--fg': st.testo,
    '--acc': st.accento, '--radius': st.bordoRaggio != null ? st.bordoRaggio + 'px' : null, '--font': fontDi(st) || null,
  });
  const meta = Math.max(1, Number(cfg.obiettivo) || 100);
  const ora = Math.max(0, (Number(cfg.partenza) || 0) + (Number(valore) || 0));
  el.querySelector('.g-tit').textContent = cfg.titolo || GOAL_ETICHETTA[cfg.tipo] || '';
  el.querySelector('.g-num').textContent = ora + ' / ' + meta;
  el.querySelector('.g-barra i').style.setProperty('--q', Math.min(1, (ora / meta) || 0).toFixed(4));
  el.classList.toggle('pieno', ora >= meta);
}

function goal(lista, conti) {
  const vivi = new Set();
  for (const g of (Array.isArray(lista) ? lista : [])) { vivi.add(g.id); unGoal(g, (conti || {})[g.id]); }
  for (const id of Object.keys(goalEl)) if (!vivi.has(id)) { goalEl[id].remove(); delete goalEl[id]; }
}

const musicaEl = {};
let musicaVista = { stato: 'ignoto', suona: false };
let musicaVuoti = 0;
let musicaLetta = 0;
let musicaInVolo = false;

const MUSICA_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

function posaElemento(el, chiave, cfg) {
  const xy = (MIO.xy && MIO.xy[chiave]) || (cfg && cfg.xy);
  if (xy && xy.x != null) {
    el.style.position = 'fixed'; el.style.left = xy.x + '%'; el.style.top = xy.y + '%';
    el.style.transform = trasformaXY(xy);
  } else { el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.transform = ''; }
}

function vestiElemento(el, cfg, corniceDef, chiave) {
  const st = cfg.stile || {};
  applicaVars(el, {
    '--bg': st.sfondo, '--op': st.opacita != null ? st.opacita + '%' : null, '--fg': st.testo,
    '--acc': st.accento, '--radius': st.bordoRaggio != null ? st.bordoRaggio + 'px' : null,
    '--font': fontDi(st) || null, '--dim-ico': (st.dimIcona != null ? st.dimIcona : 20) + 'px',
  });
  posaElemento(el, chiave, cfg);
}

function togliMusica() {
  const el = musicaEl.n;
  if (!el) return;
  const cfg = MIO.musica;
  const via = () => { el.remove(); if (musicaEl.n === el) musicaEl.n = null; musicaEl.uscita = 0; musicaEl.tinta = ''; musicaEl.chi = ''; };
  if (!cfg || cfg.entrata === 'niente' || fermiIMotori()) return via();
  if (musicaEl.uscita) return;
  el.classList.remove('dentro');
  el.classList.add('esce');
  musicaEl.uscita = setTimeout(via, 520);
}

function restaMusica(el) {
  if (!musicaEl.uscita) return;
  clearTimeout(musicaEl.uscita);
  musicaEl.uscita = 0;
  el.classList.remove('esce');
  el.classList.add('dentro');
}

const tinteNote = new Map();
function tintaDaCopertina(url, poi) {
  if (!url) return;
  const gia = tinteNote.get(url);
  if (gia) return poi(gia[0], gia[1]);
  if (musicaEl.tinta === url) return;
  musicaEl.tinta = url;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const n = 24;
      const c = document.createElement('canvas');
      c.width = n; c.height = n;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, n, n);
      const d = x.getImageData(0, 0, n, n).data;
      const spicchi = new Array(12).fill(null).map(() => ({ r: 0, g: 0, b: 0, peso: 0 }));
      for (let k = 0; k < d.length; k += 4) {
        const r = d[k], g = d[k + 1], b = d[k + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx < 40 || mn > 225 || mx - mn < 22) continue;
        const sp = spicchi[Math.min(11, Math.floor(tonalita(r, g, b) / 30))];
        const peso = (mx - mn) / 255;
        sp.peso += peso; sp.r += r * peso; sp.g += g * peso; sp.b += b * peso;
      }
      const forti = spicchi.filter((sp) => sp.peso > 0).sort((a, b) => b.peso - a.peso);
      if (!forti.length) return;
      const tinta = (sp) => vivace(sp.r / sp.peso, sp.g / sp.peso, sp.b / sp.peso);
      const uno = tinta(forti[0]), due = forti[1] ? tinta(forti[1]) : uno;
      if (tinteNote.size > 200) tinteNote.clear();
      tinteNote.set(url, [uno, due]);
      poi(uno, due);
    } catch (e) {  }
  };
  img.src = url;
}

function tonalita(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const R = r / 255, G = g / 255, B = b / 255, D = d / 255;
  let h = mx === r ? ((G - B) / D) % 6 : mx === g ? (B - R) / D + 2 : (R - G) / D + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function vivace(r, g, b) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
  const l = (mx + mn) / 2, d = mx - mn;
  const h = tonalita(r, g, b);
  const sat = Math.min(1, (d ? d / (1 - Math.abs(2 * l - 1)) : 0) * 1.35 + 0.28);
  const luce = Math.min(0.7, Math.max(0.5, l));
  return 'hsl(' + Math.round(h) + ' ' + Math.round(sat * 100) + '% ' + Math.round(luce * 100) + '%)';
}

function disegnaMusica() {
  const cfg = MIO.musica;
  if (!cfg || !cfg.attivo || !mostra('musica')) return togliMusica();
  const d = musicaVista;
  const stato = (d && d.stato) || 'niente';
  if (stato === 'ignoto') return;
  if (stato === 'niente' && musicaEl.n && musicaVuoti < 2) return;
  const fermo = stato !== 'suona';
  if (fermo && cfg.quandoFermo !== 'resta') return togliMusica();
  const vivo = stato === 'suona' || stato === 'pausa';

  let el = musicaEl.n;
  const nato = !el;
  if (!el) {
    el = document.createElement('div');
    el.innerHTML = '<span class="m-sfondo"></span>'
      + '<span class="m-cover"><span class="m-anello"><svg viewBox="0 0 40 40"><circle class="m-an-via" cx="20" cy="20" r="18"/>'
      + '<circle class="m-an-ora" cx="20" cy="20" r="18"/></svg></span><span class="m-disco"></span></span>'
      + '<span class="m-corpo"><span class="m-riga"><span class="m-scorri"></span></span>'
      + '<span class="m-riga m-riga2"><span class="m-scorri2"></span></span>'
      + '<span class="m-sotto"><span class="m-barra"><i></i></span><span class="m-tempi"></span></span></span>'
      + '<span class="m-onde"><i></i><i></i><i></i><i></i></span>';
    musicaEl.n = el;
  }
  (wboxes[cfg.posizione] || wboxes['basso-sinistra'] || document.body).appendChild(el);
  restaMusica(el);

  const st = cfg.stile || {};
  el.className = 'ovl-widget ovl-musica dim-' + (st.dim || 'media') + ' ' + classiIdentita(st, 'nessuna')
    + ' verso-' + cfg.verso + ' righe-' + cfg.righe
    + ' cover-' + cfg.cover + ' barra-' + cfg.barra + (cfg.onde ? ' con-onde' : '')
    + ' sfondo-' + cfg.sfondo + ' ritmo-' + cfg.ritmo
    + (vivo && d.suona ? ' suona' : ' in-pausa') + (vivo ? '' : ' fermo')
    + ' entra-' + cfg.entrata + (cfg.barra !== 'sotto' && cfg.tempi === 'no' ? ' senza-sotto' : '')
    + (el.classList.contains('dentro') ? ' dentro' : '');
  vestiElemento(el, cfg, 'nessuna', 'musica');
  if (nato) requestAnimationFrame(() => el.classList.add('dentro'));

  const disco = el.querySelector('.m-disco');
  const sfondo = el.querySelector('.m-sfondo');
  const foto = d.copertinaGrande || d.copertina;
  if (cfg.cover !== 'no' && foto) disco.style.backgroundImage = 'url("' + foto.replace(/"/g, '') + '")';
  else disco.style.backgroundImage = '';
  if (cfg.sfondo === 'copertina' && foto) sfondo.style.backgroundImage = 'url("' + foto.replace(/"/g, '') + '")';
  else sfondo.style.backgroundImage = '';

  if ((cfg.daCopertina || cfg.sfondo === 'colori') && d.copertina) {
    tintaDaCopertina(d.copertina, (uno, due) => {
      if (!musicaEl.n) return;
      if (cfg.daCopertina) musicaEl.n.style.setProperty('--acc', uno);
      musicaEl.n.style.setProperty('--acc2', due);
    });
    el.classList.toggle('tinta-viva', !!cfg.daCopertina);
  } else {
    el.classList.remove('tinta-viva');
    el.style.setProperty('--acc', st.accento || '#f72fa7');
    el.style.setProperty('--acc2', st.accento || '#f72fa7');
  }

  const scrivi = (dove, tpl) => {
    dove.innerHTML = escHtml(tpl || '')
      .replace(/\{titolo\}/g, '<b>' + escHtml(vivo ? (d.nome || '') : '—') + '</b>')
      .replace(/\{artista\}/g, escHtml(vivo ? (d.artisti || '') : ''))
      .replace(/\{album\}/g, escHtml(vivo ? (d.album || '') : ''));
  };
  scrivi(el.querySelector('.m-scorri'), cfg.testo || '{titolo} — {artista}');
  scrivi(el.querySelector('.m-scorri2'), cfg.testo2 || '{artista}');

  battitoDelBrano(el, cfg, d);

  const chi = (d.nome || '') + '|' + (d.artisti || '');
  if (chi !== musicaEl.chi) {
    const primo = musicaEl.chi === undefined || musicaEl.chi === '';
    musicaEl.chi = chi;
    if (cfg.cambio && !primo && !fermiIMotori()) {
      el.classList.remove('cambia'); void el.offsetWidth; el.classList.add('cambia');
    }
    misuraScorrimento(el, cfg);
  }
  avanzaBarra();
}

function battitoDelBrano(el, cfg, d) {
  if (cfg.ritmo === 'no' || !d || !d.bpm || !d.suona) {
    el.style.removeProperty('--battito');
    el.style.removeProperty('--battito-fase');
    el.style.removeProperty('--battito-forza');
    return;
  }
  const dur = 60 / Math.max(40, Math.min(220, d.bpm));
  const passato = ((Number(d.ms) || 0) + (Date.now() - musicaLetta)) / 1000;
  el.style.setProperty('--battito', dur.toFixed(4) + 's');
  el.style.setProperty('--battito-fase', '-' + (passato % dur).toFixed(4) + 's');
  el.style.setProperty('--battito-forza', String(0.6 + (Number(d.energia) || 0.5) * 0.8));
}

function misuraScorrimento(el, cfg) {
  el.classList.remove('scorre');
  if (!cfg.scorre || fermiIMotori()) return;
  requestAnimationFrame(() => {
    if (!musicaEl.n) return;
    let fuori = 0;
    for (const r of el.querySelectorAll('.m-riga')) {
      const dentro = r.firstElementChild;
      if (dentro) fuori = Math.max(fuori, dentro.scrollWidth - r.clientWidth);
    }
    if (fuori > 4) {
      el.style.setProperty('--m-fuori', fuori + 'px');
      el.style.setProperty('--m-durata', Math.max(6, fuori / 26) + 's');
      el.classList.add('scorre');
    }
  });
}

const fermiIMotori = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function avanzaBarra() {
  const el = musicaEl.n;
  if (!el) return;
  const d = musicaVista;
  const cfg = MIO.musica || {};
  const passato = (d && d.suona) ? (Date.now() - musicaLetta) : 0;
  const ms = d && d.durata ? Math.min(d.durata, (Number(d.ms) || 0) + passato) : 0;
  const q = d && d.durata ? Math.max(0, Math.min(1, ms / d.durata)) : 0;

  const i = el.querySelector('.m-barra i');
  if (i) i.style.setProperty('--q', Math.max(0, Math.min(1, q)).toFixed(4));
  const an = el.querySelector('.m-an-ora');
  if (an) { const giro = 2 * Math.PI * 18; an.style.strokeDasharray = giro; an.style.strokeDashoffset = giro * (1 - q); }

  const t = el.querySelector('.m-tempi');
  if (t) t.textContent = !d || !d.durata || cfg.tempi === 'no' ? ''
    : cfg.tempi === 'trascorso' ? orologio(ms)
      : cfg.tempi === 'restante' ? '-' + orologio(d.durata - ms)
        : orologio(ms) + ' / ' + orologio(d.durata);
}

function orologio(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
}

async function chiediMusica() {
  if (musicaInVolo) return;
  musicaInVolo = true;
  try {
    const r = await fetch('/overlay/' + encodeURIComponent(login) + '/musica' + location.search);
    if (r.ok) {
      const d = await r.json();
      if (d && d.stato === 'niente') musicaVuoti++; else musicaVuoti = 0;
      musicaVista = d;
      musicaLetta = Date.now();
    }
  } catch (e) { /* niente: alla prossima */ }
  musicaInVolo = false;
  disegnaMusica();
}

const timerEl = {};

function disegnaTimer() {
  const cfg = MIO.timer;
  const fine = Number(MIO.timerFine) || 0;
  const manca = fine - Date.now();
  const finito = manca <= 0;
  if (!cfg || !cfg.attivo || !mostra('timer') || !fine || (finito && cfg.aFine === 'sparisce')) return togliTimer();
  let el = timerEl.n;
  const nato = !el;
  if (!el) {
    el = document.createElement('div');
    el.innerHTML = '<span class="t-tit"></span><span class="t-num"></span>';
    timerEl.n = el;
  }
  if (timerEl.uscita) { clearTimeout(timerEl.uscita); timerEl.uscita = 0; el.classList.remove('esce'); }
  (wboxes[cfg.posizione] || wboxes['alto-destra'] || document.body).appendChild(el);
  el.className = 'ovl-widget ovl-timer dim-' + ((cfg.stile || {}).dim || 'media') + ' ' + classiIdentita(cfg.stile, 'nessuna')
    + (finito ? ' finito' : '') + (el.classList.contains('dentro') ? ' dentro' : '');
  vestiElemento(el, cfg, 'nessuna', 'timer');
  el.querySelector('.t-tit').textContent = finito ? '' : (cfg.titolo || '');
  el.querySelector('.t-num').textContent = finito ? (cfg.testoFine || '') : oreMinSec(manca);
  if (nato) requestAnimationFrame(() => el.classList.add('dentro'));
}

function togliTimer() {
  const el = timerEl.n;
  if (!el) return;
  const via = () => { el.remove(); if (timerEl.n === el) timerEl.n = null; timerEl.uscita = 0; };
  if (fermiIMotori()) return via();
  if (timerEl.uscita) return;
  el.classList.remove('dentro');
  el.classList.add('esce');
  timerEl.uscita = setTimeout(via, 520);
}

function oreMinSec(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const o = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const dd = (n) => (n < 10 ? '0' : '') + n;
  return (o ? o + ':' + dd(m) : String(m)) + ':' + dd(s);
}

setInterval(() => {
  if (MIO.timer && MIO.timer.attivo && mostra('timer')) disegnaTimer();
  const vivo = MIO.musica && MIO.musica.attivo && mostra('musica');
  if (!vivo) return;
  avanzaBarra();
  if (Date.now() - musicaLetta > 5000) chiediMusica();
}, 1000);

function applicaTema(t) {
  MIO.mostra = (t && t.mostra) ? t.mostra : MIO.mostra;
  MIO.xy = (t && t.xy) ? t.xy : {};

  MIO.stile = { alert: (t && t.alertStile) || null, chat: (t && t.chatStile) || null };
  for (const f of (t.fontPersonali || [])) montaFontMio(f.nome, f.url);
  try { document.getElementById('css-utente').textContent = String(t.css || '').slice(0, 8000); } catch (e) {  }
  const w = t.widget || {};
  MIO.widget = w;
  const stato = t.stato || {};

  widget('ultimoFollower', mostra('wf') ? w.ultimoFollower : { attivo: false }, stato.ultimoFollower);
  widget('ultimoSub', mostra('ws') ? w.ultimoSub : { attivo: false }, stato.ultimoSub);
  MIO.goals = Array.isArray(t.goals) ? t.goals : [];
  goal(MIO.goals, t.conti || stato.goals || {});

  MIO.musica = t.musica || null;
  MIO.timer = t.timer || null;
  MIO.timerFine = Number(stato.timer && stato.timer.fine) || 0;
  disegnaTimer();
  if (MIO.musica && MIO.musica.attivo && mostra('musica')) chiediMusica(); else togliMusica();
}

async function caricaTema() {
  try {
    const r = await fetch('/overlay/' + encodeURIComponent(login) + '/tema' + location.search);
    if (r.ok) applicaTema(await r.json());
  } catch (e) {  }
}

if (login) {
  connetti();
  caricaTema();
  caricaEmote();
  setInterval(caricaEmote, 10 * 60 * 1000);
  caricaBadge();
  setInterval(caricaBadge, 30 * 60 * 1000);
}
