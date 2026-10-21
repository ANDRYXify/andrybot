// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
export const FPS_MAX = 30;
export const MAX_QUADRI = 120;
export const LATO_VIDEO = 960;
const SALTA = new Set(['offset', 'easing', 'composite', 'computedOffset']);
const VIA = new Set(['script', 'noscript', 'template', 'audio', 'iframe', 'link', 'style', 'meta', 'object', 'embed']);
const VUOTA = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const FERMA = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

export const kebab = (p) => (p === 'cssFloat' ? 'float' : p === 'cssOffset' ? 'offset' : p.startsWith('--') ? p : p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));

export function selettore(s) {
  return String(s)
    .replace(/:root(?![\w-])/gi, '.sbf-html')
    .replace(/(^|[\s,>+~(])(html|body)(?![\w-])/gi, (m, prima, chi) => prima + (chi.toLowerCase() === 'html' ? '.sbf-html' : '.sbf-body'));
}

export function emoteDi(url) {
  let u;
  try { u = new URL(url); } catch (e) { return null; }
  let m = u.host === 'cdn.7tv.app' && /^\/emote\/([A-Za-z0-9]{20,32})\//.exec(u.pathname);
  if (m) return { fonte: '7tv', id: m[1] };
  m = u.host === 'static-cdn.jtvnw.net' && /^\/emoticons\/v2\/([A-Za-z0-9_]{1,64})\//.exec(u.pathname);
  if (m) return { fonte: 'twitch', id: m[1] };
  return null;
}

export function quadroAl(tempi, tot, t) {
  if (!tot || !tempi.length) return 0;
  const x = ((t % tot) + tot) % tot;
  let lo = 0, hi = tempi.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (tempi[mid] > x) hi = mid; else lo = mid + 1; }
  return lo;
}

export const LATINO = /U\+0{0,2}(0000|0100)/i;
export const CARATTERI = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const URL_CSS = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

export function creaFotoOverlay(o) {
  const W = o.W, H = o.H;
  const origine = o.origine || location.origin;
  const byteDi = o.byteDi || ((u) => {
    let x;
    try { x = new URL(u, origine); } catch (e) { return null; }
    if (x.origin === origine || CARATTERI.has(x.host)) return x.href;
    const e = emoteDi(x.href);
    return e ? origine + '/api/streamer/emote/' + e.fonte + '/' + e.id : null;
  });
  const leggi = o.leggi || ((u) => fetch(u, { credentials: 'same-origin' }));
  const sveglia = o.sveglia || (() => {});
  const avvisa = o.avvisa || (() => {});
  const ora = o.ora || (() => performance.now());

  const box = document.createElement('div');
  box.className = 'sbf-cornice';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;z-index:-1';
  const fr = document.createElement('iframe');
  fr.title = 'overlay';
  fr.tabIndex = -1;
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'width:' + W + 'px;height:' + H + 'px;border:0;background:transparent';
  box.appendChild(fr);

  let tela = document.createElement('canvas');
  tela.width = W; tela.height = H;
  let tx = tela.getContext('2d');
  const st = { pronta: false, sporco: true, vivo: false, inVolo: false, ultimo: 0, foto: 0, ms: 0, errori: 0, guasta: '', nuova: false, chiusa: false, caricata: false, suona: false, mancano: 0 };
  const dati = new Map();
  const animate = new Map();
  const fogli = new Map();
  let cssFirma = '', cssTesto = '', cssGiro = 0, cssFatto = -1;
  let oss = null;
  const t0 = ora();
  const scratch = document.createElement('canvas');
  const sx = scratch.getContext('2d');

  const sporca = () => { st.sporco = true; sveglia(); };

  function guasta(perche) {
    if (st.guasta) return;
    st.guasta = perche;
    tela = document.createElement('canvas');
    tela.width = W; tela.height = H;
    tx = tela.getContext('2d');
    st.pronta = false;
    avvisa(perche);
    sveglia();
  }

  function aggancia() {
    st.caricata = true;
    st.pronta = false;
    const doc = fr.contentDocument, win = fr.contentWindow;
    if (!doc || !win) return;
    if (oss) oss.disconnect();
    oss = new win.MutationObserver(sporca);
    oss.observe(doc, { subtree: true, childList: true, attributes: true, characterData: true });
    for (const t of ['load', 'loadeddata', 'playing', 'seeked']) doc.addEventListener(t, sporca, true);
    try { doc.fonts && doc.fonts.addEventListener('loadingdone', sporca); } catch (e) {  }
    sporca();
  }
  fr.addEventListener('load', aggancia);

  function comeDati(u) {
    if (!u || u.startsWith('data:')) return u || null;
    const c = dati.get(u);
    if (c !== undefined) return typeof c === 'string' ? c : null;
    dati.set(u, false);
    const via = byteDi(u);
    if (!via) { dati.set(u, null); return null; }
    leggi(via).then((r) => (r && r.ok ? r.blob() : null)).then((b) => {
      if (!b) { dati.set(u, null); return; }
      return new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result || '')); f.onerror = () => ok(null); f.readAsDataURL(b); })
        .then((d) => { dati.set(u, d || null); if (d) { cssGiro++; sporca(); } });
    }).catch(() => dati.set(u, null));
    return null;
  }

  function dentroUrl(testo, base) {
    return String(testo).replace(URL_CSS, (tutto, q, u) => {
      if (u.startsWith('data:')) return tutto;
      let abs;
      try { abs = new URL(u, base).href; } catch (e) { return tutto; }
      const d = comeDati(abs);
      if (d) return 'url("' + d + '")';
      st.mancano++;
      return 'url("' + abs + '")';
    });
  }

  function regole(lista, base, out) {
    for (const r of lista) {
      const tipo = r.constructor && r.constructor.name;
      if (tipo === 'CSSStyleRule') { out.push(selettore(r.selectorText) + dentroUrl(r.cssText.slice(r.selectorText.length), base)); continue; }
      if (tipo === 'CSSKeyframesRule') continue;
      if (tipo === 'CSSImportRule') { try { regole(r.styleSheet.cssRules, r.styleSheet.href || base, out); } catch (e) {  } continue; }
      if (tipo === 'CSSFontFaceRule') {
        const pezzo = r.style.getPropertyValue('unicode-range');
        if (pezzo && !LATINO.test(pezzo)) continue;
        out.push(dentroUrl(r.cssText, base));
        continue;
      }
      if (tipo === 'CSSMediaRule' || tipo === 'CSSSupportsRule' || tipo === 'CSSContainerRule' || tipo === 'CSSLayerBlockRule') {
        out.push(r.cssText.slice(0, r.cssText.indexOf('{')) + '{');
        regole(r.cssRules, base, out);
        out.push('}');
        continue;
      }
      out.push(r.cssText);
    }
  }

  function foglioFuori(href) {
    const c = fogli.get(href);
    if (c !== undefined) return c || [];
    fogli.set(href, null);
    leggi(href).then((r) => (r && r.ok ? r.text() : null)).then((t) => {
      if (!t) return;
      const s = new CSSStyleSheet();
      return s.replace(t).then(() => { fogli.set(href, s.cssRules); cssGiro++; sporca(); });
    }).catch(() => {  });
    return [];
  }

  function foglio(doc) {
    const firma = [...doc.styleSheets].map((s) => {
      let n = -1;
      try { n = s.cssRules.length; } catch (e) {  }
      const t = s.ownerNode && s.ownerNode.textContent;
      return (s.href || '') + ':' + n + ':' + (t ? t.length : 0) + ':' + (s.disabled ? 0 : 1);
    }).join('|');
    if (firma === cssFirma && cssFatto === cssGiro) return cssTesto;
    cssFirma = firma; cssFatto = cssGiro;
    st.mancano = 0;
    const out = [];
    for (const s of doc.styleSheets) {
      if (s.disabled) continue;
      let lista = null;
      try { lista = s.cssRules; } catch (e) { lista = s.href ? foglioFuori(s.href) : null; }
      if (lista) regole(lista, s.href || doc.baseURI, out);
    }
    cssTesto = out.join('\n');
    return cssTesto;
  }

  function quadriDi(u) {
    const a = animate.get(u);
    if (a !== undefined) return a;
    animate.set(u, null);
    const via = byteDi(u);
    if (!via || typeof ImageDecoder === 'undefined') return null;
    leggi(via).then((r) => (r && r.ok ? r.arrayBuffer().then((b) => ({ b, tipo: String(r.headers.get('content-type') || '').split(';')[0].trim() })) : null)).then(async (x) => {
      if (!x || !/^image\/(gif|webp|png|apng|avif)$/.test(x.tipo) || !(await ImageDecoder.isTypeSupported(x.tipo))) return;
      const dec = new ImageDecoder({ data: x.b, type: x.tipo });
      try {
        await dec.tracks.ready;
        const tr = dec.tracks.selectedTrack;
        if (!tr || !tr.animated || tr.frameCount < 2) return;
        const n = Math.min(tr.frameCount, MAX_QUADRI), quadri = [], tempi = [];
        let tot = 0;
        for (let i = 0; i < n; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          tot += Math.max(20, (image.duration || 100000) / 1000);
          const c = document.createElement('canvas');
          c.width = image.displayWidth; c.height = image.displayHeight;
          c.getContext('2d').drawImage(image, 0, 0);
          image.close();
          quadri.push(c.toDataURL());
          tempi.push(tot);
        }
        animate.set(u, { quadri, tempi, tot });
        sporca();
      } finally { try { dec.close(); } catch (e) {  } }
    }).catch(() => {  });
    return null;
  }

  function immagineDi(el, u) {
    if (!u) return null;
    if (u.startsWith('data:')) return u;
    const a = quadriDi(u);
    if (a) { st.vivo = true; return a.quadri[quadroAl(a.tempi, a.tot, ora() - t0)]; }
    const d = comeDati(u);
    if (d) return d;
    if (!el || !el.complete || !el.naturalWidth) return null;
    let x;
    try { x = new URL(u, origine); } catch (e) { return null; }
    if (x.origin !== origine && !el.crossOrigin) { el.crossOrigin = 'anonymous'; return null; }
    try {
      scratch.width = el.naturalWidth; scratch.height = el.naturalHeight;
      sx.clearRect(0, 0, scratch.width, scratch.height);
      sx.drawImage(el, 0, 0);
      const fatto = scratch.toDataURL();
      dati.set(u, fatto);
      return fatto;
    } catch (e) { dati.set(u, null); return null; }
  }

  function fotoDi(el, w, h, tipo) {
    if (!w || !h) return null;
    const k = Math.min(1, LATO_VIDEO / Math.max(w, h));
    scratch.width = Math.max(1, Math.round(w * k)); scratch.height = Math.max(1, Math.round(h * k));
    try {
      sx.clearRect(0, 0, scratch.width, scratch.height);
      sx.drawImage(el, 0, 0, scratch.width, scratch.height);
      return scratch.toDataURL(tipo, 0.9);
    } catch (e) { return null; }
  }

  function comeImg(doc, k, src, w, h) {
    const im = doc.createElement('img');
    for (const a of k.attributes) if (a.name !== 'src' && a.name !== 'width' && a.name !== 'height') im.setAttribute(a.name, a.value);
    im.setAttribute('src', src || VUOTA);
    if (w) im.setAttribute('width', w);
    if (h) im.setAttribute('height', h);
    k.replaceWith(im);
  }

  function clona(doc, win) {
    const anim = new Map();
    let pseudo = '', n = 0;
    for (const a of doc.getAnimations()) {
      const ef = a.effect, tg = ef && ef.target;
      if (!tg) continue;
      if (a.playState === 'running') st.vivo = true;
      let props;
      try { props = ef.getKeyframes().flatMap((f) => Object.keys(f)).filter((p) => !SALTA.has(p)); } catch (e) { props = []; }
      if (!props.length) continue;
      const chi = ef.pseudoElement || '';
      const m = anim.get(tg) || {};
      const s = m[chi] || (m[chi] = new Set());
      for (const p of props) s.add(kebab(p));
      anim.set(tg, m);
    }
    const body = doc.body, kb = body.cloneNode(true);
    const orig = [...body.getElementsByTagName('*')], copie = [...kb.getElementsByTagName('*')];
    for (let i = 0; i < orig.length; i++) {
      const el = orig[i], k = copie[i];
      if (!kb.contains(k)) continue;
      const tag = el.localName;
      if (VIA.has(tag)) { k.remove(); continue; }
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none') { k.remove(); continue; }
      const m = anim.get(el);
      if (m) {
        for (const chi in m) {
          const c = chi ? win.getComputedStyle(el, chi) : cs;
          const righe = [...m[chi]].map((p) => [p, c.getPropertyValue(p)]);
          if (!chi) { for (const [p, v] of righe) k.style.setProperty(p, v, 'important'); continue; }
          const id = 'a' + (++n);
          k.setAttribute('data-sbf', id);
          pseudo += '[data-sbf="' + id + '"]' + chi + '{' + righe.map(([p, v]) => p + ':' + v + '!important').join(';') + '}';
        }
      }
      const stile = k.getAttribute('style');
      if (stile && stile.includes('url(')) k.setAttribute('style', dentroUrl(stile, doc.baseURI));
      if (tag === 'img') {
        const src = immagineDi(el, el.currentSrc || el.src);
        for (const a of ['srcset', 'sizes', 'loading', 'crossorigin', 'decoding']) k.removeAttribute(a);
        k.setAttribute('src', src || VUOTA);
        if (!src) { k.setAttribute('width', el.offsetWidth); k.setAttribute('height', el.offsetHeight); }
        continue;
      }
      if (tag === 'canvas') {
        if (el.width && el.height && el.getClientRects().length) st.vivo = true;
        comeImg(doc, k, fotoDi(el, el.width, el.height, 'image/webp'), el.width, el.height);
        continue;
      }
      if (tag === 'video') {
        if (!el.paused && !el.ended) st.vivo = true;
        comeImg(doc, k, el.readyState >= 2 ? fotoDi(el, el.videoWidth, el.videoHeight, 'image/webp') : null, el.videoWidth, el.videoHeight);
        continue;
      }
      if (tag === 'image' && el.namespaceURI === 'http://www.w3.org/2000/svg') {
        const h = el.getAttribute('href') || el.getAttribute('xlink:href');
        if (h) { let abs = h; try { abs = new URL(h, doc.baseURI).href; } catch (e) {  } k.setAttribute('href', immagineDi(null, abs) || VUOTA); k.removeAttribute('xlink:href'); }
      }
    }
    const html = doc.documentElement;
    const r = doc.createElement('div'), b = doc.createElement('div');
    for (const a of html.attributes) if (a.name !== 'xmlns') r.setAttribute(a.name, a.value);
    for (const a of body.attributes) b.setAttribute(a.name, a.value);
    r.setAttribute('class', ('sbf-html ' + (html.getAttribute('class') || '')).trim());
    b.setAttribute('class', ('sbf-body ' + (body.getAttribute('class') || '')).trim());
    while (kb.firstChild) b.appendChild(kb.firstChild);
    const s = doc.createElement('style');
    s.textContent = foglio(doc) + '\n' + FERMA + '\n.sbf-html{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden}\n' + pseudo;
    r.appendChild(s);
    r.appendChild(b);
    return new win.XMLSerializer().serializeToString(r);
  }

  async function scatta() {
    const doc = fr.contentDocument, win = fr.contentWindow;
    if (!doc || !doc.body || !win) return;
    st.inVolo = true; st.sporco = false; st.vivo = false;
    const t = ora();
    try {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject x="0" y="0" width="' + W + '" height="' + H + '">' + clona(doc, win) + '</foreignObject></svg>';
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      if (st.chiusa || st.guasta) return;
      tx.clearRect(0, 0, W, H);
      tx.drawImage(img, 0, 0, W, H);
      try { tx.getImageData(0, 0, 1, 1); } catch (e) { guasta('sporca'); return; }
      st.pronta = true; st.nuova = true; st.foto++; st.errori = 0;
    } catch (e) {
      if (++st.errori >= 5) guasta('svg');
      else st.sporco = true;
    } finally {
      st.inVolo = false;
      st.ms = st.ms ? st.ms * 0.8 + (ora() - t) * 0.2 : ora() - t;
      if (st.sporco || st.vivo) sveglia();
    }
  }

  return {
    apri(url) {
      if (st.chiusa) return;
      if (!box.isConnected) document.body.appendChild(box);
      if (fr.getAttribute('src') !== url) { st.caricata = false; st.pronta = false; fr.setAttribute('src', url); }
    },
    tic() {
      if (st.chiusa || st.guasta || st.inVolo || !st.caricata) return;
      if (!st.sporco && !st.vivo) return;
      const t = ora();
      if (t - st.ultimo < 1000 / FPS_MAX) return;
      st.ultimo = t;
      scatta();
    },
    disegna(c, x, y, w, h) {
      st.nuova = false;
      if (!st.pronta || st.guasta) return false;
      c.drawImage(tela, 0, 0, W, H, x, y, w, h);
      return true;
    },
    vivo: () => !st.chiusa && !st.guasta && (st.sporco || st.vivo || st.nuova || st.inVolo),
    cornice: () => fr,
    set suona(v) { st.suona = !!v; },
    get suona() { return st.suona; },
    stato: () => ({ pronta: st.pronta, foto: st.foto, ms: Math.round(st.ms), guasta: st.guasta, caricata: st.caricata, mancano: st.mancano, vivo: st.vivo, W, H }),
    chiudi() {
      st.chiusa = true;
      if (oss) oss.disconnect();
      try { fr.src = 'about:blank'; } catch (e) {  }
      box.remove();
    },
  };
}
