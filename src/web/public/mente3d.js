// mente3d.js — grafo 3D della "mente" di Lia, disegnato a mano su Canvas 2D.
//
// Perché non three.js: niente CDN (CSP), niente 600 KB da vendorizzare né catene di
// dipendenze. Per qualche decina di nodi basta e avanza un piccolo motore proprio:
// simulazione a forze (repulsione + molle + centro), proiezione prospettica 3D,
// rotazione col trascinamento, zoom con la rotella, click sul nodo. Leggero e nostro.
//
// API globale:
//   const ctrl = SB_MENTE.crea(canvas, { nodes, links }, { onSelect, dark });
//   ctrl.aggiorna({ nodes, links });   // nuovi dati (conserva le posizioni note)
//   ctrl.tema(dark);                   // cambia chiaro/scuro
//   ctrl.seleziona(id);               // seleziona un nodo da fuori
//   ctrl.destroy();                    // ferma tutto e libera i listener
//
//   node: { id, label, group, color, size, data }
//   link: { source, target }
(function () {
  'use strict';

  const nz = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function crea(canvas, dati, opts = {}) {
    if (!canvas) return { destroy() {}, aggiorna() {}, tema() {}, seleziona() {} };
    const ctx = canvas.getContext('2d');
    let dark = !!opts.dark;
    const onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : () => {};

    let nodi = [];         // { id, label, group, color, size, data, x,y,z, vx,vy,vz, sx,sy,sr,depth }
    const perId = new Map();
    let archi = [];        // { a: nodo, b: nodo, rest }
    let alpha = 1;         // "temperatura" della simulazione (si raffredda da sola)
    let yaw = 0.5, pitch = -0.35, zoom = 1;
    let selId = null, hoverId = null;
    let raf = 0, running = true;
    let autoRot = true;    // ruota piano da sola quando non interagisci

    // ---- dimensioni (DPR-aware) --------------------------------------------
    let W = 300, H = 300, cx = 150, cy = 150, dpr = 1;
    function ridimensiona() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(120, Math.round(r.width));
      H = Math.max(120, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
    }

    // ---- costruzione grafo -------------------------------------------------
    function carica(d) {
      const nuovi = Array.isArray(d?.nodes) ? d.nodes : [];
      const vecchie = perId;   // per conservare posizioni tra un aggiorna e l'altro
      nodi = nuovi.map((n) => {
        const p = vecchie.get(n.id);
        // posizione iniziale su una sfera (o riusa la vecchia, per continuità)
        const t = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1;
        const rr = 120 + Math.random() * 40;
        return {
          id: n.id,
          label: String(n.label || n.id),
          group: n.group || 'altro',
          color: n.color || '#8b5cf6',
          size: clamp(nz(n.size, 6), 3, 26),
          data: n.data || null,
          x: p ? p.x : rr * Math.sqrt(1 - u * u) * Math.cos(t),
          y: p ? p.y : rr * u,
          z: p ? p.z : rr * Math.sqrt(1 - u * u) * Math.sin(t),
          vx: 0, vy: 0, vz: 0, sx: cx, sy: cy, sr: 4, depth: 0,
        };
      });
      perId.clear();
      for (const n of nodi) perId.set(n.id, n);
      const ls = Array.isArray(d?.links) ? d.links : [];
      archi = [];
      for (const l of ls) {
        const a = perId.get(l.source), b = perId.get(l.target);
        if (a && b && a !== b) archi.push({ a, b, rest: nz(l.rest, 78) });
      }
      alpha = 1;   // ri-scalda: rilassa la nuova topologia
    }

    // ---- simulazione a forze (un passo) ------------------------------------
    function passo() {
      if (alpha < 0.02) { alpha = 0; return; }
      const n = nodi.length;
      const kRep = 1400, kSpring = 0.02, kCenter = 0.006, damping = 0.86;
      // repulsione O(n^2): va benissimo per qualche decina di nodi
      for (let i = 0; i < n; i++) {
        const a = nodi[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodi[j];
          let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
          let d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 1) d2 = 1;
          const d = Math.sqrt(d2);
          const f = kRep / d2;
          const ux = dx / d, uy = dy / d, uz = dz / d;
          a.vx += ux * f; a.vy += uy * f; a.vz += uz * f;
          b.vx -= ux * f; b.vy -= uy * f; b.vz -= uz * f;
        }
      }
      // molle lungo gli archi (verso la lunghezza a riposo)
      for (const l of archi) {
        const a = l.a, b = l.b;
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const f = kSpring * (d - l.rest);
        const ux = dx / d, uy = dy / d, uz = dz / d;
        a.vx += ux * f; a.vy += uy * f; a.vz += uz * f;
        b.vx -= ux * f; b.vy -= uy * f; b.vz -= uz * f;
      }
      // richiamo verso il centro + integrazione
      for (const a of nodi) {
        a.vx -= a.x * kCenter; a.vy -= a.y * kCenter; a.vz -= a.z * kCenter;
        a.vx *= damping; a.vy *= damping; a.vz *= damping;
        a.x += a.vx * alpha; a.y += a.vy * alpha; a.z += a.vz * alpha;
      }
      alpha *= 0.985;
    }

    // ---- proiezione 3D → 2D ------------------------------------------------
    const FOCAL = 460;
    function proietta() {
      const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
      const cx0 = Math.cos(pitch), sx0 = Math.sin(pitch);
      for (const a of nodi) {
        // yaw attorno a Y
        const x1 = a.x * cy0 + a.z * sy0;
        const z1 = -a.x * sy0 + a.z * cy0;
        const y1 = a.y;
        // pitch attorno a X
        const y2 = y1 * cx0 - z1 * sx0;
        const z2 = y1 * sx0 + z1 * cx0;
        const x2 = x1;
        const persp = FOCAL / Math.max(60, FOCAL - z2);
        const s = persp * zoom;
        a.sx = cx + x2 * s;
        a.sy = cy + y2 * s;
        a.sr = Math.max(1.5, a.size * s);
        a.depth = z2;   // più grande = più vicino
      }
    }

    // ---- disegno -----------------------------------------------------------
    function colori() {
      return dark
        ? { bg0: 'rgba(18,16,30,0)', linea: 'rgba(160,150,210,', testo: '#e8e6f5', alone: 'rgba(0,0,0,0.55)' }
        : { bg0: 'rgba(250,250,255,0)', linea: 'rgba(90,70,160,', testo: '#241f3a', alone: 'rgba(255,255,255,0.65)' };
    }
    function disegna() {
      const C = colori();
      ctx.clearRect(0, 0, W, H);
      // archi (dietro)
      ctx.lineWidth = 1;
      for (const l of archi) {
        const a = l.a, b = l.b;
        const near = (a.depth + b.depth) / 2;
        const al = clamp(0.10 + (near + 160) / 900, 0.05, 0.5);
        ctx.strokeStyle = C.linea + al.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }
      // nodi (ordinati dal più lontano al più vicino)
      const ord = nodi.slice().sort((p, q) => p.depth - q.depth);
      for (const a of ord) {
        const sel = a.id === selId, hov = a.id === hoverId;
        const fade = clamp(0.45 + (a.depth + 180) / 700, 0.35, 1);
        ctx.globalAlpha = fade;
        // alone
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, a.sr + (sel ? 6 : 3), 0, Math.PI * 2);
        ctx.fillStyle = C.alone; ctx.fill();
        // corpo
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, a.sr, 0, Math.PI * 2);
        ctx.fillStyle = a.color; ctx.fill();
        // anello di stato/evidenza
        if (sel || hov || (a.data && a.data.ring)) {
          ctx.lineWidth = sel ? 3 : 2;
          ctx.strokeStyle = sel ? '#ffffff' : (a.data && a.data.ring ? a.data.ring : 'rgba(255,255,255,0.7)');
          ctx.beginPath(); ctx.arc(a.sx, a.sy, a.sr + (sel ? 4 : 2.5), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // etichetta: hub, selezionato, hover, o nodi grandi
        if (sel || hov || a.group === 'core' || a.group === 'emozione' || a.group === 'logica' || a.size >= 12) {
          etichetta(a, C, sel || hov);
        }
      }
    }
    function etichetta(a, C, forte) {
      const t = a.label;
      ctx.font = (forte ? '600 ' : '') + Math.round(clamp(a.sr + 6, 10, 15)) + 'px system-ui, sans-serif';
      const w = ctx.measureText(t).width;
      const x = a.sx + a.sr + 5, y = a.sy + 4;
      ctx.globalAlpha = forte ? 1 : 0.85;
      ctx.fillStyle = C.alone;
      ctx.fillRect(x - 3, y - 12, w + 6, 16);
      ctx.fillStyle = C.testo;
      ctx.fillText(t, x, y);
      ctx.globalAlpha = 1;
    }

    // ---- loop --------------------------------------------------------------
    function tick() {
      if (!running) return;
      passo();
      if (autoRot && !trascino) yaw += 0.0016;
      proietta();
      disegna();
      raf = requestAnimationFrame(tick);
    }

    // ---- interazione -------------------------------------------------------
    let trascino = false, mosso = false, lx = 0, ly = 0;
    function pos(ev) {
      const r = canvas.getBoundingClientRect();
      const p = ev.touches ? ev.touches[0] : ev;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }
    function giu(ev) {
      trascino = true; mosso = false; autoRot = false;
      const p = pos(ev); lx = p.x; ly = p.y;
    }
    function muovi(ev) {
      const p = pos(ev);
      if (trascino) {
        const dx = p.x - lx, dy = p.y - ly; lx = p.x; ly = p.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) mosso = true;
        yaw += dx * 0.006;
        pitch = clamp(pitch + dy * 0.006, -1.4, 1.4);
      } else {
        const n = nodoVicino(p.x, p.y);
        const nuovo = n ? n.id : null;
        if (nuovo !== hoverId) { hoverId = nuovo; canvas.style.cursor = n ? 'pointer' : 'grab'; }
      }
    }
    function su(ev) {
      if (trascino && !mosso) {
        const p = pos(ev.changedTouches ? { touches: ev.changedTouches } : ev);
        const n = nodoVicino(p.x, p.y);
        selId = n ? n.id : null;
        onSelect(n ? { id: n.id, label: n.label, group: n.group, data: n.data } : null);
      }
      trascino = false;
      setTimeout(() => { if (!trascino) autoRot = true; }, 4000);   // riprende a ruotare da sola
    }
    function rotella(ev) {
      ev.preventDefault();
      zoom = clamp(zoom * (ev.deltaY < 0 ? 1.1 : 0.9), 0.4, 3.5);
    }
    function nodoVicino(x, y) {
      let best = null, bestD = 18 * 18;
      for (const a of nodi) {
        const dx = a.sx - x, dy = a.sy - y, d = dx * dx + dy * dy;
        const soglia = Math.max(12, a.sr + 6);
        if (d < Math.max(bestD, soglia * soglia) && d < soglia * soglia) { bestD = d; best = a; }
      }
      return best;
    }

    // ---- avvio / ciclo di vita --------------------------------------------
    const ro = ('ResizeObserver' in window) ? new ResizeObserver(() => ridimensiona()) : null;
    ridimensiona();
    carica(dati || {});
    ro?.observe(canvas);
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    canvas.addEventListener('mousedown', giu);
    window.addEventListener('mousemove', muovi);
    window.addEventListener('mouseup', su);
    canvas.addEventListener('touchstart', giu, { passive: true });
    canvas.addEventListener('touchmove', muovi, { passive: true });
    canvas.addEventListener('touchend', su);
    canvas.addEventListener('wheel', rotella, { passive: false });
    raf = requestAnimationFrame(tick);

    return {
      aggiorna(d) { carica(d || {}); },
      tema(d) { dark = !!d; },
      seleziona(id) { selId = id || null; alpha = Math.max(alpha, 0.2); },
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        ro?.disconnect();
        canvas.removeEventListener('mousedown', giu);
        window.removeEventListener('mousemove', muovi);
        window.removeEventListener('mouseup', su);
        canvas.removeEventListener('touchstart', giu);
        canvas.removeEventListener('touchmove', muovi);
        canvas.removeEventListener('touchend', su);
        canvas.removeEventListener('wheel', rotella);
      },
    };
  }

  window.SB_MENTE = { crea };
})();
