// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  const nz = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  function shade(col, amt) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(col || ''));
    if (!m) return col;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.min(1, Math.abs(amt));
    r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
    return `rgb(${r},${g},${b})`;
  }

  function crea(canvas, dati, opts = {}) {
    if (!canvas) return { destroy() {}, aggiorna() {}, tema() {}, seleziona() {} };
    const ctx = canvas.getContext('2d');
    let dark = !!opts.dark;
    const onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : () => {};

    let nodi = [];
    const perId = new Map();
    let archi = [];
    let alpha = 1;
    let yaw = 0.5, pitch = -0.35, zoom = 1;
    let selId = null, hoverId = null;
    let raf = 0, running = true;
    let autoRot = true;
    const caldo = new Map();
    const CALDO_MS = 5000;
    const orologio = () => { try { return Date.now(); } catch (e) { return 0; } };

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

    function carica(d) {
      const nuovi = Array.isArray(d?.nodes) ? d.nodes : [];
      const vecchie = perId;
      nodi = nuovi.map((n) => {
        const p = vecchie.get(n.id);

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
      for (const n of nodi) n._adj = new Set();
      for (const l of ls) {
        const a = perId.get(l.source), b = perId.get(l.target);
        if (a && b && a !== b) { archi.push({ a, b, rest: nz(l.rest, 78) }); a._adj.add(b.id); b._adj.add(a.id); }
      }
      alpha = 1;
    }

    function passo() {
      if (alpha < 0.02) { alpha = 0; return; }
      const n = nodi.length;
      const kRep = 2100, kSpring = 0.02, kCenter = 0.0055, damping = 0.86;

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

      for (const l of archi) {
        const a = l.a, b = l.b;
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const f = kSpring * (d - l.rest);
        const ux = dx / d, uy = dy / d, uz = dz / d;
        a.vx += ux * f; a.vy += uy * f; a.vz += uz * f;
        b.vx -= ux * f; b.vy -= uy * f; b.vz -= uz * f;
      }

      for (const a of nodi) {
        a.vx -= a.x * kCenter; a.vy -= a.y * kCenter; a.vz -= a.z * kCenter;
        a.vx *= damping; a.vy *= damping; a.vz *= damping;
        a.x += a.vx * alpha; a.y += a.vy * alpha; a.z += a.vz * alpha;
      }
      alpha *= 0.985;
    }

    const FOCAL = 460;
    function proietta() {
      const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
      const cx0 = Math.cos(pitch), sx0 = Math.sin(pitch);
      for (const a of nodi) {

        const x1 = a.x * cy0 + a.z * sy0;
        const z1 = -a.x * sy0 + a.z * cy0;
        const y1 = a.y;

        const y2 = y1 * cx0 - z1 * sx0;
        const z2 = y1 * sx0 + z1 * cx0;
        const x2 = x1;
        const persp = FOCAL / Math.max(60, FOCAL - z2);
        const s = persp * zoom;
        a.sx = cx + x2 * s;
        a.sy = cy + y2 * s;
        a.sr = Math.max(1.5, a.size * s);
        a.depth = z2;
      }
    }

    function colori() {
      return dark
        ? { vin0: '#191627', vin1: '#100e1b', edge: '150,145,180', edgeHi: '205,198,240',
            testo: '#edecf5', testoSoft: 'rgba(237,236,245,0.62)', outline: 'rgba(14,12,24,0.9)',
            ombra: 'rgba(0,0,0,0.5)', anelloSel: '#ffffff', coreRing: 'rgba(255,255,255,0.55)', bordo: -0.34 }
        : { vin0: '#f7f6fc', vin1: '#eae8f4', edge: '120,112,150', edgeHi: '70,58,120',
            testo: '#26223c', testoSoft: 'rgba(38,34,60,0.6)', outline: 'rgba(248,247,253,0.92)',
            ombra: 'rgba(60,52,92,0.20)', anelloSel: '#26223c', coreRing: 'rgba(80,62,150,0.5)', bordo: -0.16 };
    }
    function disegna() {
      const C = colori();

      const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.1, cx, cy, Math.max(W, H) * 0.72);
      g.addColorStop(0, C.vin0); g.addColorStop(1, C.vin1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const focus = hoverId || selId;
      const fnode = focus ? perId.get(focus) : null;
      const fset = fnode ? new Set([focus, ...fnode._adj]) : null;

      for (const l of archi) {
        const a = l.a, b = l.b;
        const attivo = !fset || (a.id === focus || b.id === focus);
        const near = (a.depth + b.depth) / 2;
        let al = clamp(0.05 + (near + 160) / 1150, 0.035, 0.3);
        if (fset) al = attivo ? clamp(al * 2.6, 0.2, 0.75) : al * 0.22;
        ctx.strokeStyle = `rgba(${attivo && fset ? C.edgeHi : C.edge},${al.toFixed(3)})`;
        ctx.lineWidth = attivo && fset ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }

      const ord = nodi.slice().sort((p, q) => p.depth - q.depth);
      for (const a of ord) {
        const sel = a.id === selId, hov = a.id === hoverId;
        const dim = fset && !fset.has(a.id);
        const prof = clamp(0.55 + (a.depth + 180) / 820, 0.4, 1);
        const fade = prof * (dim ? 0.24 : 1);

        ctx.globalAlpha = fade;
        if (!dim) { ctx.save(); ctx.shadowColor = C.ombra; ctx.shadowBlur = 9; ctx.shadowOffsetY = 2; }
        ctx.beginPath(); ctx.arc(a.sx, a.sy, a.sr, 0, TAU);
        ctx.fillStyle = a.color; ctx.fill();
        if (!dim) ctx.restore();

        if (!dim) {
          const t0 = caldo.get(a.id);
          if (t0) {
            const dt = orologio() - t0;
            if (dt >= 0 && dt < CALDO_MS) {
              const vita = 1 - dt / CALDO_MS;
              const battito = 0.5 + 0.5 * Math.sin(dt / 130);
              const rr = a.sr + 3 + battito * (5 + a.sr * 0.5);
              ctx.save();
              ctx.globalAlpha = fade * vita * (0.35 + 0.35 * battito);
              ctx.lineWidth = 2; ctx.strokeStyle = a.color;
              ctx.shadowColor = a.color; ctx.shadowBlur = 12 + battito * 10;
              ctx.beginPath(); ctx.arc(a.sx, a.sy, rr, 0, TAU); ctx.stroke();
              ctx.restore();
              ctx.globalAlpha = fade;
            }
          }
        }

        ctx.lineWidth = 1; ctx.strokeStyle = shade(a.color, C.bordo);
        ctx.beginPath(); ctx.arc(a.sx, a.sy, a.sr, 0, TAU); ctx.stroke();

        if (a.group === 'core') {
          ctx.lineWidth = 1.4; ctx.strokeStyle = C.coreRing;
          ctx.beginPath(); ctx.arc(a.sx, a.sy, a.sr + 4.5, 0, TAU); ctx.stroke();
        }

        if (a.data && a.data.ring && !dim) {
          ctx.lineWidth = 2; ctx.strokeStyle = a.data.ring;
          ctx.beginPath(); ctx.arc(a.sx, a.sy, a.sr + 2.6, 0, TAU); ctx.stroke();
        }

        if (sel || hov) {
          ctx.lineWidth = sel ? 2.4 : 1.6; ctx.strokeStyle = C.anelloSel;
          ctx.beginPath(); ctx.arc(a.sx, a.sy, a.sr + (sel ? 4 : 3), 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        const hub = a.group === 'core' || a.group === 'emozione' || a.group === 'logica';
        if (!dim && (sel || hov || hub || (fset && fset.has(a.id)))) etichetta(a, C, sel || hov, fade);
      }
    }
    function etichetta(a, C, forte, fade) {
      const t = a.label;
      const size = Math.round(clamp(a.sr + 4.5, 10.5, 14));
      ctx.font = (forte ? '600 ' : '500 ') + size + 'px ui-sans-serif, system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      const x = a.sx + a.sr + 6, y = a.sy;
      ctx.globalAlpha = forte ? 1 : clamp(0.9 * fade, 0.4, 1);

      ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = C.outline;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = forte ? C.testo : C.testoSoft;
      ctx.fillText(t, x, y);
      ctx.globalAlpha = 1;
    }

    function tick() {
      if (!running) return;

      if (!canvas.isConnected) { running = false; stacca(); return; }
      passo();
      if (autoRot && !trascino) yaw += 0.0009;
      proietta();
      disegna();
      raf = requestAnimationFrame(tick);
    }

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
      setTimeout(() => { if (!trascino) autoRot = true; }, 4000);
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

    let staccato = false;
    function stacca() {
      if (staccato) return;
      staccato = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      canvas.removeEventListener('mousedown', giu);
      window.removeEventListener('mousemove', muovi);
      window.removeEventListener('mouseup', su);
      canvas.removeEventListener('touchstart', giu);
      canvas.removeEventListener('touchmove', muovi);
      canvas.removeEventListener('touchend', su);
      canvas.removeEventListener('wheel', rotella);
    }

    return {
      aggiorna(d) { carica(d || {}); },

      attivita(ids) {
        if (!Array.isArray(ids)) return;
        const now = orologio();
        for (const id of ids) if (id != null && perId.has(id)) caldo.set(String(id), now);
        for (const k of caldo.keys()) if (now - caldo.get(k) > CALDO_MS + 500) caldo.delete(k);
      },
      tema(d) { dark = !!d; },
      seleziona(id) { selId = id || null; alpha = Math.max(alpha, 0.2); },
      destroy() { running = false; stacca(); },
    };
  }

  window.SB_MENTE = { crea };
})();
