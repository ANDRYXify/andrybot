// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const PASSO = 30;
  const W = 1000;
  const H = 600;
  const OGGETTI = ['spada', 'scudo', 'cuore', 'stivali'];
  const R_OGGETTO = 16;

  const BASE = {
    vita: 100,
    velocita: 150,
    danno: 5,
    raggio: 30,
    rinculo: 1,
    attesaColpo: 1.2,
    caccia: 0.03,
    ogniOggetto: 6,
    oggetti: { spada: 1.5, scudo: 0.5, cuore: 0.4, stivali: 1.4 },
    spenti: [],
    corona: true,
    strettaDopo: 40,
    strettaDurata: 30,
    strettaMin: 0.3,
    durataMax: 150,
  };

  const numero = (v, min, max, base) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : base;
  };

  function regole(r) {
    const x = r && typeof r === 'object' ? r : {};
    const o = x.oggetti && typeof x.oggetti === 'object' ? x.oggetti : {};
    const durataMax = numero(x.durataMax, 30, 900, BASE.durataMax);
    return {
      vita: numero(x.vita, 10, 1000, BASE.vita),
      velocita: numero(x.velocita, 40, 400, BASE.velocita),
      danno: numero(x.danno, 1, 200, BASE.danno),
      raggio: numero(x.raggio, 14, 60, BASE.raggio),
      rinculo: numero(x.rinculo, 0, 3, BASE.rinculo),
      attesaColpo: numero(x.attesaColpo, 0.1, 3, BASE.attesaColpo),
      caccia: numero(x.caccia, 0, 0.2, BASE.caccia),
      ogniOggetto: numero(x.ogniOggetto, 1, 60, BASE.ogniOggetto),
      oggetti: {
        spada: numero(o.spada, 1, 5, BASE.oggetti.spada),
        scudo: numero(o.scudo, 0.1, 1, BASE.oggetti.scudo),
        cuore: numero(o.cuore, 0.05, 1, BASE.oggetti.cuore),
        stivali: numero(o.stivali, 1, 3, BASE.oggetti.stivali),
      },
      spenti: Array.isArray(x.spenti) ? OGGETTI.filter((k) => x.spenti.includes(k)) : [],
      corona: x.corona !== false,
      strettaDopo: Math.min(numero(x.strettaDopo, 5, 600, BASE.strettaDopo), durataMax),
      strettaDurata: numero(x.strettaDurata, 5, 300, BASE.strettaDurata),
      strettaMin: numero(x.strettaMin, 0.15, 1, BASE.strettaMin),
      durataMax,
    };
  }

  function seme(testo) {
    let a = 0;
    for (const c of String(testo)) a = (Math.imul(a ^ c.charCodeAt(0), 2654435761) >>> 0);
    return a >>> 0;
  }

  function caso(s) {
    s.a = (s.a + 0x6D2B79F5) | 0;
    let t = Math.imul(s.a ^ (s.a >>> 15), 1 | s.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function direzione(s) {
    for (;;) {
      const x = caso(s) * 2 - 1, y = caso(s) * 2 - 1, d = x * x + y * y;
      if (d > 0.01 && d <= 1) { const l = Math.sqrt(d); return [x / l, y / l]; }
    }
  }

  function muri(s) {
    const R = s.regole, t = s.passo / PASSO;
    const k = Math.min(1, Math.max(0, (t - R.strettaDopo) / R.strettaDurata));
    const mx = (W * (1 - R.strettaMin) / 2) * k, my = (H * (1 - R.strettaMin) / 2) * k;
    return { x0: mx, y0: my, x1: W - mx, y1: H - my };
  }

  function nuova(testoSeme, combattenti, r) {
    const R = regole(r);
    const s = { a: seme(testoSeme), passo: 0, regole: R, corpi: [], oggetti: [], prossimoOggetto: Math.round(R.ogniOggetto * PASSO), corona: null, fine: null, prossimoId: 1 };
    const elenco = (Array.isArray(combattenti) ? combattenti : []).filter((c) => c && c.id != null);
    const lato = Math.ceil(Math.sqrt(elenco.length || 1));
    const cw = W / lato, ch = H / Math.ceil((elenco.length || 1) / lato);
    elenco.forEach((c, i) => {
      const gx = i % lato, gy = Math.floor(i / lato);
      const x = cw * gx + cw / 2 + (caso(s) - 0.5) * Math.max(0, cw - 2 * R.raggio) * 0.6;
      const y = ch * gy + ch / 2 + (caso(s) - 0.5) * Math.max(0, ch - 2 * R.raggio) * 0.6;
      const [dx, dy] = direzione(s);
      s.corpi.push({ id: String(c.id), x, y, px: x, py: y, vx: dx * R.velocita, vy: dy * R.velocita, vita: R.vita, max: R.vita, uccisioni: 0, oggetti: [], vivo: true, fuori: -1, colpi: {} });
    });
    return s;
  }

  function copia(s) {
    return JSON.parse(JSON.stringify(s));
  }

  const q = (v) => v * v;
  const vivi = (s) => s.corpi.filter((c) => c.vivo);
  const ha = (c, o) => c.oggetti.includes(o);
  const velocitaDi = (s, c) => s.regole.velocita * (ha(c, 'stivali') ? s.regole.oggetti.stivali : 1);

  function metti(s, eventi) {
    const R = s.regole, m = muri(s);
    const scelti = OGGETTI.filter((k) => !R.spenti.includes(k));
    if (!scelti.length) return;
    const tipo = scelti[Math.floor(caso(s) * scelti.length)];
    const x = m.x0 + R_OGGETTO + caso(s) * Math.max(0, m.x1 - m.x0 - 2 * R_OGGETTO);
    const y = m.y0 + R_OGGETTO + caso(s) * Math.max(0, m.y1 - m.y0 - 2 * R_OGGETTO);
    const o = { id: s.prossimoId++, tipo, x, y };
    s.oggetti.push(o);
    eventi.push({ tipo: 'oggetto', oggetto: o.id, cosa: tipo, x, y });
  }

  function mira(s, c) {
    let meta = null, dm = Infinity;
    for (const o of s.oggetti) {
      if (o.tipo !== 'cuore' && ha(c, o.tipo)) continue;
      if (o.tipo === 'cuore' && c.vita >= c.max) continue;
      const d = q(o.x - c.x) + q(o.y - c.y);
      if (d < dm) { dm = d; meta = o; }
    }
    const vicinoOggetto = meta && dm < (220 * 220);
    if (vicinoOggetto) return meta;
    let nemico = null, dn = Infinity;
    for (const x of s.corpi) {
      if (!x.vivo || x === c) continue;
      const d = q(x.x - c.x) + q(x.y - c.y);
      if (d < dn) { dn = d; nemico = x; }
    }
    return nemico || meta;
  }

  function colpisci(s, a, b, eventi) {
    const R = s.regole;
    const chiave = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
    const ultimo = a.colpi[chiave];
    if (ultimo != null && s.passo - ultimo < R.attesaColpo * PASSO) return;
    a.colpi[chiave] = s.passo; b.colpi[chiave] = s.passo;
    const danno = (da, su) => R.danno * (ha(da, 'spada') ? R.oggetti.spada : 1) * (ha(su, 'scudo') ? R.oggetti.scudo : 1);
    const da = danno(b, a), db = danno(a, b);
    a.vita -= da; b.vita -= db;
    eventi.push({ tipo: 'colpo', a: a.id, b: b.id, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    for (const [morto, da2] of [[a, b], [b, a]]) {
      if (morto.vita <= 0 && morto.vivo) {
        morto.vivo = false; morto.vita = 0; morto.fuori = s.passo;
        da2.uccisioni += 1;
        eventi.push({ tipo: 'eliminato', chi: morto.id, da: da2.id });
      }
    }
  }

  function passo(s) {
    const eventi = [];
    if (s.fine) return eventi;
    const R = s.regole, dt = 1 / PASSO;
    s.passo += 1;
    const m = muri(s);
    if (s.passo >= s.prossimoOggetto) { metti(s, eventi); s.prossimoOggetto = s.passo + Math.round(R.ogniOggetto * PASSO); }
    for (const c of s.corpi) {
      c.px = c.x; c.py = c.y;
      if (!c.vivo) continue;
      const meta = mira(s, c), v = velocitaDi(s, c);
      if (meta) {
        const dx = meta.x - c.x, dy = meta.y - c.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
        c.vx += (dx / l) * v * R.caccia; c.vy += (dy / l) * v * R.caccia;
      }
      const l = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1;
      c.vx = (c.vx / l) * v; c.vy = (c.vy / l) * v;
      c.x += c.vx * dt; c.y += c.vy * dt;
      const r = R.raggio;
      if (c.x < m.x0 + r) { c.x = m.x0 + r; c.vx = Math.abs(c.vx); }
      if (c.x > m.x1 - r) { c.x = m.x1 - r; c.vx = -Math.abs(c.vx); }
      if (c.y < m.y0 + r) { c.y = m.y0 + r; c.vy = Math.abs(c.vy); }
      if (c.y > m.y1 - r) { c.y = m.y1 - r; c.vy = -Math.abs(c.vy); }
      for (let i = s.oggetti.length - 1; i >= 0; i--) {
        const o = s.oggetti[i];
        if (q(o.x - c.x) + q(o.y - c.y) > q(r + R_OGGETTO)) continue;
        if (o.tipo === 'cuore') c.vita = Math.min(c.max, c.vita + c.max * R.oggetti.cuore);
        else if (!ha(c, o.tipo)) c.oggetti.push(o.tipo);
        else continue;
        s.oggetti.splice(i, 1);
        eventi.push({ tipo: 'preso', chi: c.id, oggetto: o.id, cosa: o.tipo });
      }
    }
    const lista = vivi(s);
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        if (!a.vivo || !b.vivo) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = 2 * R.raggio;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d, entra = (min - d) / 2;
        a.x -= nx * entra; a.y -= ny * entra; b.x += nx * entra; b.y += ny * entra;
        const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny, k = 1 + R.rinculo;
        a.vx += (vb - va) * nx * k / 2 - nx * R.velocita * 0.2 * R.rinculo;
        a.vy += (vb - va) * ny * k / 2 - ny * R.velocita * 0.2 * R.rinculo;
        b.vx += (va - vb) * nx * k / 2 + nx * R.velocita * 0.2 * R.rinculo;
        b.vy += (va - vb) * ny * k / 2 + ny * R.velocita * 0.2 * R.rinculo;
        colpisci(s, a, b, eventi);
      }
    }
    if (R.corona) {
      const prima = s.corona;
      let re = prima ? s.corpi.find((c) => c.id === prima) : null;
      for (const c of s.corpi) if (c.uccisioni > 0 && (!re || c.uccisioni > re.uccisioni)) re = c;
      s.corona = re ? re.id : null;
      if (s.corona !== prima) eventi.push({ tipo: 'corona', chi: s.corona });
    }
    const restano = vivi(s);
    if (restano.length <= 1 || s.passo >= R.durataMax * PASSO) {
      s.fine = { passo: s.passo, vincitore: vincitore(s), aTempo: restano.length > 1 };
      eventi.push({ tipo: 'fine', vincitore: s.fine.vincitore });
    }
    return eventi;
  }

  function classifica(s) {
    return s.corpi.map((c, i) => ({ c, i }))
      .sort((p, q) => (q.c.vivo - p.c.vivo) || (q.c.fuori - p.c.fuori) || (q.c.vita - p.c.vita) || (q.c.uccisioni - p.c.uccisioni) || (p.i - q.i))
      .map((x, posto) => ({ id: x.c.id, posto: posto + 1, uccisioni: x.c.uccisioni, vivo: x.c.vivo }));
  }

  function vincitore(s) {
    return classifica(s)[0]?.id ?? null;
  }

  function corri(s, finoA, suEventi) {
    while (!s.fine && s.passo < finoA) {
      const e = passo(s);
      if (suEventi && e.length) suEventi(e, s);
    }
    return s;
  }

  function esito(s) {
    return { fine: !!s.fine, passo: s.passo, vincitore: s.fine ? s.fine.vincitore : null, aTempo: s.fine ? s.fine.aTempo : false, corona: s.corona, classifica: classifica(s) };
  }

  const ARENA = { PASSO, W, H, OGGETTI, R_OGGETTO, BASE, regole, nuova, copia, passo, corri, esito, muri };
  if (typeof module !== 'undefined' && module.exports) module.exports = ARENA;
  else radice.SB_ARENA = ARENA;
})(typeof window !== 'undefined' ? window : globalThis);
