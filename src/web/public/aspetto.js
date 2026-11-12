// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const PRESET = {
    minimal:  { bg: '#ffffff', bg2: '#eceef3', testo: '#0d0d12', tenue: '#4a4a58', card: '#ffffff', bordo: '#dcdce4', acc: '#5b2ee5' },
    neon:     { bg: '#05040a', bg2: '#1b0b3d', testo: '#f6f3ff', tenue: '#a99ed0', card: 'rgba(255,255,255,.07)', bordo: 'rgba(170,110,255,.42)', acc: '#b072ff' },
    retro:    { bg: '#f7ecd6', bg2: '#dcbd8e', testo: '#241a12', tenue: '#63503b', card: '#fffbf3', bordo: '#cbb08a', acc: '#c2451a' },
    sunset:   { bg: '#160b24', bg2: '#5f1f45', testo: '#fff3ec', tenue: '#dcb0c4', card: 'rgba(255,255,255,.09)', bordo: 'rgba(255,170,130,.38)', acc: '#ff7a45' },
    glass:    { bg: '#080f1c', bg2: '#173a63', testo: '#f0f6ff', tenue: '#a6bdda', card: 'rgba(255,255,255,.10)', bordo: 'rgba(255,255,255,.22)', acc: '#3fc0ff' },
    brutal:   { bg: '#f5f5ef', bg2: '#e2e2d8', testo: '#000000', tenue: '#3d3d3d', card: '#ffffff', bordo: '#000000', acc: '#ff3b16' },
    pastello: { bg: '#fff7fb', bg2: '#e6eaff', testo: '#2f2b3d', tenue: '#6a647f', card: '#ffffff', bordo: '#e6d7ea', acc: '#b4489a' },
    cyber:    { bg: '#05070d', bg2: '#0a1a2b', testo: '#d7fbff', tenue: '#6f93a8', card: 'rgba(0,229,255,.06)', bordo: 'rgba(0,229,255,.34)', acc: '#00e5ff' },
    vapor:    { bg: '#1a0b2e', bg2: '#3a1a6b', testo: '#ffe8fb', tenue: '#c9a0dc', card: 'rgba(255,255,255,.08)', bordo: 'rgba(255,113,206,.42)', acc: '#ff71ce' },
    oro:      { bg: '#0a0a0a', bg2: '#1c1608', testo: '#f8f1dc', tenue: '#b8a878', card: 'rgba(232,196,99,.07)', bordo: 'rgba(212,175,55,.42)', acc: '#e8c463' },
    oceano:   { bg: '#04121f', bg2: '#06304f', testo: '#e6f6ff', tenue: '#8fb8cf', card: 'rgba(255,255,255,.07)', bordo: 'rgba(70,180,230,.32)', acc: '#3bb0e6' },
    foresta:  { bg: '#08130d', bg2: '#102a1b', testo: '#e8f5ec', tenue: '#93b7a1', card: 'rgba(255,255,255,.06)', bordo: 'rgba(120,210,140,.30)', acc: '#6ad48b' },
    ghiaccio: { bg: '#eef4fb', bg2: '#d6e6f5', testo: '#10222f', tenue: '#4a6274', card: '#ffffff', bordo: '#c2d6e8', acc: '#2a8fd8' },
    lava:     { bg: '#100604', bg2: '#3a1005', testo: '#ffe9df', tenue: '#c99a8a', card: 'rgba(255,110,60,.08)', bordo: 'rgba(255,110,60,.36)', acc: '#ff5a2c' },
    bubblegum:{ bg: '#fff0f6', bg2: '#ffe0ef', testo: '#3d0b28', tenue: '#8a5a72', card: '#ffffff', bordo: '#ffc2dd', acc: '#ff3d8b' },
  };

  const PILE = {
    system: {
      d: 'system-ui, -apple-system, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      t: 'system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    inter: {
      d: 'Inter, "Inter Tight", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      t: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    },
    mono: {
      d: 'ui-monospace, "SF Mono", SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace',
      t: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    },
    serif: {
      d: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
      t: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    condensato: {
      d: '"Oswald", "Haettenschweiler", "Arial Narrow Bold", "Arial Narrow", "Helvetica Neue Condensed", Impact, sans-serif',
      t: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    tondo: {
      d: '"SF Pro Rounded", ui-rounded, "Varela Round", "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
      t: '"SF Pro Rounded", ui-rounded, "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    },
    manga: {
      d: '"Permanent Marker", "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
      t: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  };

  const FABBRICA = {
    chiaro: { pagina: '#f2efe8', carta: '#fdfbf6', testo: '#1a1919', tenue: '#5c5852', bordo: '#ddd6c8', acc: '#ba007a', inchiostro: '#150910', verde: '#497852', rosso: '#a8382b', ambra: '#926317' },
    scuro: { pagina: '#0f0a0e', carta: '#1a141a', testo: '#f1e9ee', tenue: '#b0a2aa', bordo: '#362a34', acc: '#f72fa7', inchiostro: '#f4ecf1', verde: '#7bae86', rosso: '#e0674f', ambra: '#cf9a52' },
  };
  const TEMI = ['chiaro', 'scuro'];
  const RUOLI = ['pagina', 'carta', 'testo', 'tenue', 'bordo', 'acc', 'inchiostro'];
  const PILE_SCELTE = Object.keys(PILE).filter((k) => k !== 'manga');
  const PILE_TESTO = PILE_SCELTE.filter((k) => k !== 'condensato');
  const pilaTesto = (k) => (k === 'serif' ? PILE.serif.d : PILE[k].t);
  const MANOPOLE = {
    carattere: ['serie'].concat(PILE_TESTO),
    titoli: ['serie', 'testo'].concat(PILE_SCELTE),
    angoli: ['serie', 'vivi', 'tondi'],
    tratto: ['serie', 'sottile', 'marcato'],
    ombre: ['serie', 'corte', 'nessuna'],
    trama: ['serie', 'liscia'],
    puntatore: ['serie', 'sistema'],
    moto: ['serie', 'leggero', 'pieno'],
  };
  const GRANDEZZA = { min: 85, max: 130, passo: 5, serie: 100 };
  const CSS_MAX = 6000;
  const SOGLIE = { testo: 7, minimo: 4.5, rampa: 3 };
  const BIANCO = '#ffffff', NERO = '#000000', INCHIOSTRO_SCURO = '#150910';
  const LATO = { scuro: 0.11, chiaro: 0.26 }, VELO = 0.14;

  const oggetto = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const suo = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const due = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  const scrivi = (v) => '#' + due(v[0]) + due(v[1]) + due(v[2]);

  function leggi(c) {
    const s = String(c == null ? '' : c).trim().toLowerCase();
    let m = /^#([0-9a-f]{3})$/.exec(s);
    if (m) return m[1].split('').map((x) => parseInt(x + x, 16)).concat(1);
    m = /^#([0-9a-f]{6})$/.exec(s);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
    m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/.exec(s);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Math.min(1, Number(m[4]))];
    return null;
  }
  function esa(c) {
    const s = String(c == null ? '' : c).trim();
    const v = s.charAt(0) === '#' ? leggi(s) : null;
    return v ? scrivi(v) : '';
  }
  function mescola(a, b, t) {
    const x = leggi(a), y = leggi(b);
    return scrivi([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t));
  }
  function posa(sopra, sotto) {
    const s = leggi(sopra), f = leggi(sotto);
    return scrivi([0, 1, 2].map((i) => s[i] * s[3] + f[i] * (1 - s[3])));
  }
  function luce(c) {
    const v = leggi(c);
    const k = (n) => { const s = n / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * k(v[0]) + 0.7152 * k(v[1]) + 0.0722 * k(v[2]);
  }
  function contrasto(a, b) {
    const x = luce(a), y = luce(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  const peggiore = (c, fondi) => Math.min.apply(null, fondi.map((f) => contrasto(c, f)));

  function leggibile(c, fondi, soglia) {
    if (peggiore(c, fondi) >= soglia) return c;
    let scelto = null, ripiego = c, quanto = peggiore(c, fondi);
    for (const polo of [NERO, BIANCO]) {
      for (let i = 1; i <= 25; i++) {
        const p = mescola(c, polo, i / 25), q = peggiore(p, fondi);
        if (q > quanto) { quanto = q; ripiego = p; }
        if (q >= soglia) { if (!scelto || i < scelto.i) scelto = { i, p }; break; }
      }
    }
    return scelto ? scelto.p : ripiego;
  }
  function dallaParte(c, scuro) {
    const polo = scuro ? NERO : BIANCO;
    for (let i = 0; i <= 25; i++) {
      const p = mescola(c, polo, i / 25), l = luce(p);
      if (scuro ? l <= LATO.scuro : l >= LATO.chiaro) return p;
    }
    return polo;
  }
  function sopra(c) {
    if (contrasto(BIANCO, c) >= contrasto(NERO, c)) return BIANCO;
    return contrasto(INCHIOSTRO_SCURO, c) >= SOGLIE.minimo ? INCHIOSTRO_SCURO : NERO;
  }
  function ruota(c, gradi, piu) {
    const v = leggi(c).slice(0, 3).map((n) => n / 255);
    const mx = Math.max(v[0], v[1], v[2]), mn = Math.min(v[0], v[1], v[2]), d = mx - mn;
    let h = 0;
    const l = (mx + mn) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === v[0]) h = ((v[1] - v[2]) / d) % 6;
      else if (mx === v[1]) h = (v[2] - v[0]) / d + 2;
      else h = (v[0] - v[1]) / d + 4;
    }
    h = (((h * 60 + gradi) % 360) + 360) % 360;
    const l2 = Math.max(0, Math.min(1, l + piu));
    const k = (1 - Math.abs(2 * l2 - 1)) * s, x = k * (1 - Math.abs(((h / 60) % 2) - 1)), m = l2 - k / 2;
    const t = h < 60 ? [k, x, 0] : h < 120 ? [x, k, 0] : h < 180 ? [0, k, x] : h < 240 ? [0, x, k] : h < 300 ? [x, 0, k] : [k, 0, x];
    return scrivi(t.map((n) => (n + m) * 255));
  }

  function ruoliDi(p) {
    const pagina = mescola(p.bg, p.bg2, 0.5);
    const carta = posa(p.card, pagina);
    return { pagina, carta, testo: p.testo, tenue: p.tenue, bordo: posa(p.bordo, carta), acc: p.acc };
  }

  const VIETATI = /@import|url\s*\(|image-set\s*\(|src\s*\(|image\s*\(|expression\s*\(|javascript:|<\/?style|\\/gi;
  function cssSicuro(css) {
    let s = (typeof css === 'string' ? css : '').replace(/\u0000/g, '').slice(0, CSS_MAX).replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (let i = 0; i < 20; i++) {
      const d = s.replace(VIETATI, '');
      if (d === s) return s.trim();
      s = d;
    }
    return '';
  }

  function pulisci(grezze) {
    const o = oggetto(grezze);
    const tema = (t) => {
      const q = oggetto(o[t]), out = { preset: suo(PRESET, q.preset) ? q.preset : '' };
      for (const r of RUOLI) out[r] = esa(q[r]);
      return out;
    };
    const out = { chiaro: tema('chiaro'), scuro: tema('scuro') };
    for (const k of Object.keys(MANOPOLE)) out[k] = MANOPOLE[k].indexOf(o[k]) >= 0 ? o[k] : 'serie';
    const g = Math.round(Number(o.grandezza) / GRANDEZZA.passo) * GRANDEZZA.passo;
    out.grandezza = g >= GRANDEZZA.min && g <= GRANDEZZA.max ? g : GRANDEZZA.serie;
    out.css = cssSicuro(o.css);
    return out;
  }
  const temaVuoto = (t) => !t.preset && RUOLI.every((r) => !t[r]);
  function diSerie(s) {
    const p = pulisci(s);
    return temaVuoto(p.chiaro) && temaVuoto(p.scuro) && Object.keys(MANOPOLE).every((k) => p[k] === 'serie')
      && p.grandezza === GRANDEZZA.serie && !p.css;
  }

  function colori(t) {
    if (temaVuoto(t.scelte)) return null;
    const s = t.scelte, pre = s.preset ? ruoliDi(PRESET[s.preset]) : {}, fab = FABBRICA[t.posto];
    const P = {};
    for (const r of RUOLI) P[r] = s[r] || pre[r] || fab[r];
    const scuro = luce(P.pagina) < 0.18, polo = scuro ? BIANCO : NERO;
    const lato = FABBRICA[scuro ? 'scuro' : 'chiaro'];
    const pagina = dallaParte(P.pagina, scuro), carta = dallaParte(P.carta, scuro);
    const s2 = dallaParte(ruota(carta, 0, scuro ? 0.035 : -0.04), scuro);
    const s3 = dallaParte(ruota(carta, 0, scuro ? 0.075 : -0.085), scuro);
    const fondi = [pagina, carta, s2, s3];
    const veli = (col) => fondi.map((f) => mescola(f, col, VELO));
    const colVelo = (c) => {
      let col = leggibile(c, fondi, SOGLIE.minimo);
      for (let i = 0; i < 6 && peggiore(col, veli(col)) < SOGLIE.minimo; i++) col = leggibile(col, fondi.concat(veli(col)), SOGLIE.minimo);
      return col;
    };
    const testo = leggibile(P.testo, fondi, SOGLIE.testo);
    const tenue = leggibile(P.tenue, fondi, SOGLIE.minimo);
    const acc = colVelo(P.acc);
    const inchiostro = leggibile(s.inchiostro || mescola(scuro ? BIANCO : NERO, acc, scuro ? 0.06 : 0.09), fondi, SOGLIE.minimo);
    const vars = {
      '--bg': pagina, '--surface': carta, '--surface-2-tinta': s2, '--surface-3-tinta': s3,
      '--border': P.bordo, '--border-2': mescola(P.bordo, polo, 0.12),
      '--testo': testo, '--testo-2': tenue, '--testo-3': tenue,
      '--acc': acc, '--acc-600': mescola(acc, polo, 0.2), '--su-acc': sopra(acc),
      '--acc-soft': mescola(carta, acc, scuro ? 0.1 : 0.08),
      '--acc-vivo': leggibile(ruota(acc, -14, 0.04), fondi, SOGLIE.rampa),
      '--acc-caldo': leggibile(ruota(acc, 12, 0), fondi, SOGLIE.rampa),
      '--acc-vino': leggibile(ruota(acc, 23, scuro ? 0 : -0.06), fondi, SOGLIE.rampa),
      '--contorno': inchiostro, '--didascalia-testo': sopra(inchiostro),
      '--tono-carta': 'radial-gradient(color-mix(in srgb, var(--contorno) 14%, transparent) 1.05px, transparent 1.1px)',
    };
    for (const k of ['verde', 'rosso', 'ambra']) {
      const col = colVelo(lato[k]);
      vars['--' + k] = col;
      vars['--' + k + '-soft'] = mescola(carta, col, 0.09);
      vars['--' + k + '-bordo'] = mescola(carta, col, 0.28);
    }
    vars['--su-rosso'] = sopra(vars['--rosso']);
    for (const g of ['def', 'bot', 'pubblico', 'diretta', 'scena', 'vetrina', 'account']) vars['--g-' + g] = tenue;
    const ruoli = { pagina, carta, testo, tenue, bordo: P.bordo, acc, inchiostro };
    return { scuro, vars, ruoli, corretti: RUOLI.filter((r) => s[r] && ruoli[r] !== s[r]) };
  }

  const FORME = {
    angoli: {
      vivi: { '--r-xs': '0px', '--r-s': '0px', '--r-m': '0px', '--r-l': '0px', '--ang-mano': '0px', '--ang-mano-l': '0px' },
      tondi: { '--r-xs': '6px', '--r-s': '9px', '--r-m': '12px', '--r-l': '16px', '--ang-mano': '12px', '--ang-mano-l': '9px' },
    },
    tratto: {
      sottile: { '--contorno-sp': '1px', '--tratto-1': '1px', '--tratto-2': '1px 1.5px 1.5px 1px', '--tratto-3': '2px 2.5px 2.5px 2px', '--orlo-3': '2px', '--tratto-4': '3px 3.5px 3.5px 3px' },
      marcato: { '--contorno-sp': '3px', '--tratto-1': '2px 2.5px 2.5px 2px', '--tratto-2': '3px 3.5px 3.5px 3px', '--tratto-3': '4.5px 5px 5px 4.5px', '--orlo-3': '4.5px', '--tratto-4': '6px 6.5px 6.5px 6px' },
    },
    ombre: {
      corte: { '--ombra-ink': '2px 2px 0 var(--contorno)', '--ombra-ink-alta': '3px 3px 0 var(--contorno)', '--salto': '5px' },
      nessuna: { '--ombra-ink': '0 0 0 transparent', '--ombra-ink-alta': '0 0 0 transparent', '--ombra-ink-timbro': '0 0 0 transparent', '--salto': '0px' },
    },
    trama: {
      liscia: { '--tono-carta': 'linear-gradient(transparent, transparent)', '--retino-forza': '0', '--cinetiche-forza': '0' },
    },
    puntatore: {
      sistema: { '--cursore': 'auto', '--cursore-mano': 'pointer' },
    },
  };
  function forma(p) {
    const vars = {};
    if (p.carattere !== 'serie') vars['--testo-font'] = pilaTesto(p.carattere);
    if (p.titoli === 'testo') vars['--mano'] = 'var(--testo-font)';
    else if (p.titoli !== 'serie') vars['--mano'] = PILE[p.titoli].d;
    for (const k of Object.keys(FORME)) Object.assign(vars, FORME[k][p[k]] || {});
    return vars;
  }

  function veste(scelte, posto) {
    const p = pulisci(scelte), dove = posto === 'scuro' ? 'scuro' : 'chiaro';
    const c = colori({ scelte: p[dove], posto: dove });
    const ruoli = {};
    for (const r of RUOLI) ruoli[r] = c ? c.ruoli[r] : FABBRICA[dove][r];
    return {
      tema: (c ? c.scuro : dove === 'scuro') ? 'dark' : 'light',
      vars: Object.assign({}, c ? c.vars : {}, forma(p)),
      grandezza: p.grandezza, ruoli, corretti: c ? c.corretti : [], vestita: !!c,
    };
  }

  const NOMI = (function () {
    const tutti = {};
    const pieno = { chiaro: { preset: 'minimal' }, scuro: { preset: 'neon' }, carattere: 'system', titoli: 'system' };
    for (const n of Object.keys(veste(pieno, 'chiaro').vars)) tutti[n] = 1;
    for (const k of Object.keys(FORME)) for (const v of Object.keys(FORME[k])) for (const n of Object.keys(FORME[k][v])) tutti[n] = 1;
    return Object.keys(tutti);
  })();

  function copia(scelte) {
    if (diSerie(scelte)) return null;
    const pulite = pulisci(scelte), out = { v: 1, grandezza: pulite.grandezza, scelte: pulite };
    for (const t of TEMI) { const v = veste(scelte, t); out[t] = { tema: v.tema, vars: v.vars }; }
    return out;
  }

  const CHIAVE = 'aspetto';
  function cifra(t) {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  let foglio = null;
  function scriviCss(css) {
    try {
      if (!foglio) {
        foglio = new CSSStyleSheet();
        document.adoptedStyleSheets = document.adoptedStyleSheets.concat([foglio]);
      }
      foglio.replaceSync(css);
    } catch (e) {
      let el = document.getElementById('aspetto-css');
      if (!el && css) { el = document.createElement('style'); el.id = 'aspetto-css'; document.head.appendChild(el); }
      if (el) el.textContent = css;
    }
  }
  function dipingi(scelte, posto, opzioni) {
    const o = oggetto(opzioni), el = document.documentElement, v = veste(scelte, posto);
    for (const n of NOMI) if (!suo(v.vars, n)) el.style.removeProperty(n);
    for (const n of Object.keys(v.vars)) el.style.setProperty(n, v.vars[n]);
    el.setAttribute('data-theme', v.tema);
    const firma = Object.keys(v.vars).length ? v.tema + ':' + cifra(JSON.stringify(v.vars)) : '';
    if (firma) el.setAttribute('data-veste', firma); else el.removeAttribute('data-veste');
    el.style.fontSize = v.grandezza === GRANDEZZA.serie ? '' : v.grandezza + '%';
    const barre = document.querySelectorAll('meta[name="theme-color"]');
    for (let i = 0; i < barre.length; i++) {
      const m = barre[i];
      if (!m.hasAttribute('data-serie')) m.setAttribute('data-serie', m.getAttribute('content') || '');
      m.setAttribute('content', v.vestita ? v.ruoli.carta : m.getAttribute('data-serie'));
    }
    scriviCss(o.css ? pulisci(scelte).css : '');
    return v;
  }
  function conserva(scelte) {
    try {
      const c = copia(scelte);
      if (c) localStorage.setItem(CHIAVE, JSON.stringify(c)); else localStorage.removeItem(CHIAVE);
    } catch (e) { return false; }
    return true;
  }

  const ASPETTO = {
    PRESET, PILE, FABBRICA, TEMI, RUOLI, MANOPOLE, GRANDEZZA, CSS_MAX, SOGLIE, NOMI, CHIAVE,
    pulisci, diSerie, veste, copia, cssSicuro, contrasto, luce, mescola, ruoliDi, dipingi, conserva,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ASPETTO;
  else radice.SB_ASPETTO = ASPETTO;
})(typeof window !== 'undefined' ? window : globalThis);
