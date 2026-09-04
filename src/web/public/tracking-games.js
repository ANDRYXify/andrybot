// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(() => {
  'use strict';
  const T = window.SB_TRACKING;
  if (!T || !T.registraMinigioco) return;

  const font = (ctx, peso, size) => { ctx.font = `${peso} ${size}px system-ui, "Segoe UI", sans-serif`; };
  function testo(ctx, s, x, y, size, col, align = 'center', peso = 800) {
    ctx.save(); font(ctx, peso, size); ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size / 7); ctx.strokeStyle = 'rgba(0,0,0,.72)'; ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function pannello(ctx, x, y, w, h, r, bg = 'rgba(12,12,20,.72)', bordo = 'rgba(139,92,246,.85)') {
    ctx.save(); rrect(ctx, x, y, w, h, r); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = bordo; ctx.stroke(); ctx.restore();
  }
  function anello(ctx, cx, cy, rad, frac, col, sfondo = 'rgba(255,255,255,.18)') {
    ctx.save(); ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.strokeStyle = sfondo; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, frac))); ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
  }
  const nowMs = () => performance.now();

  const GESTI = [
    { id: 'openpalm', emoji: '✋', nome: 'Mano aperta' },
    { id: 'fist', emoji: '✊', nome: 'Pugno' },
    { id: 'victory', emoji: '✌️', nome: 'Vittoria' },
    { id: 'point', emoji: '☝️', nome: 'Indice' },
    { id: 'thumbup', emoji: '👍', nome: 'Pollice su' },
  ];
  const byId = (id) => GESTI.find((g) => g.id === id) || GESTI[0];
  const record = (g) => Number(localStorage.getItem('sb-trk-rec-' + g) || 0);
  const salvaRecord = (g, v) => { if (v > record(g)) { try { localStorage.setItem('sb-trk-rec-' + g, String(v)); } catch {  } return true; } return false; };

  let holdG = '', holdT = 0;
  function aggiornaHold(g) { if (g !== holdG) { holdG = g; holdT = nowMs(); } }
  const tenutoDa = () => (holdG ? nowMs() - holdT : 0);

  let modo = 'idle';
  let G = null;
  let finePunti = 0, fineTit = '', fineSott = '', fineT0 = 0;

  function vaiFine(titolo, punti, sott) { modo = 'fine'; fineTit = titolo; finePunti = punti; fineSott = sott || ''; fineT0 = nowMs(); }

  function giocoMima() {
    let punti = 0, round = 0, bersaglio = null, tRound = 0, durata = 4000, colpito = 0;
    const prossimo = () => { round++; durata = Math.max(1500, 4000 - round * 220); bersaglio = pick(bersaglio && bersaglio.id); tRound = nowMs(); colpito = 0; };
    let bagK = 0;
    const pick = (esc) => { const l = GESTI.filter((x) => x.id !== esc); bagK = (bagK + 3) % l.length; return l[bagK]; };
    prossimo();
    return {
      nome: 'Mima',
      tick({ g, dt, ctx, W, H }) {
        const rimasto = durata - (nowMs() - tRound);

        if (g === bersaglio.id) { colpito += dt; if (colpito >= 280) { punti++; prossimo(); } }
        else colpito = 0;
        if (rimasto <= 0) { const rec = salvaRecord('mima', punti); vaiFine('MIMA', punti, rec ? 'nuovo record!' : 'record: ' + record('mima')); return; }

        testo(ctx, 'MIMA IL GESTO', W / 2, H * 0.12, Math.round(H * 0.05), '#fff');
        testo(ctx, bersaglio.emoji, W / 2, H * 0.42, Math.round(H * 0.26), '#fff');
        testo(ctx, bersaglio.nome, W / 2, H * 0.62, Math.round(H * 0.06), '#c4b5fd');
        anello(ctx, W / 2, H * 0.42, Math.round(H * 0.2), rimasto / durata, '#22d3ee');
        testo(ctx, 'punti ' + punti, W / 2, H * 0.8, Math.round(H * 0.06), '#a7f3d0');
        if (colpito > 0) anello(ctx, W / 2, H * 0.42, Math.round(H * 0.16), colpito / 280, '#34d399');
      },
    };
  }

  function giocoReaction() {
    let punti = 0, bersaglio = null, tFine = nowMs() + 30000, colpito = 0, bagK = 0;
    const pick = (esc) => { const l = GESTI.filter((x) => x.id !== esc); bagK = (bagK + 2) % l.length; return l[bagK]; };
    bersaglio = pick('');
    return {
      nome: 'Reaction',
      tick({ g, dt, ctx, W, H }) {
        const rimasto = tFine - nowMs();
        if (rimasto <= 0) { const rec = salvaRecord('reaction', punti); vaiFine('REACTION RUSH', punti, rec ? 'nuovo record!' : 'record: ' + record('reaction')); return; }
        if (g === bersaglio.id) { colpito += dt; if (colpito >= 220) { punti++; bersaglio = pick(bersaglio.id); colpito = 0; } }
        else colpito = 0;
        testo(ctx, 'REACTION RUSH', W / 2, H * 0.12, Math.round(H * 0.05), '#fff');
        testo(ctx, bersaglio.emoji, W / 2, H * 0.44, Math.round(H * 0.24), '#fff');

        const bw = W * 0.6, bx = W * 0.2, by = H * 0.66;
        ctx.save(); rrect(ctx, bx, by, bw, 16, 8); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
        rrect(ctx, bx, by, bw * (rimasto / 30000), 16, 8); ctx.fillStyle = '#f59e0b'; ctx.fill(); ctx.restore();
        testo(ctx, 'punti ' + punti + '  ·  ' + Math.ceil(rimasto / 1000) + 's', W / 2, H * 0.8, Math.round(H * 0.055), '#fde68a');
      },
    };
  }

  function giocoNonRidere() {
    const t0 = nowMs(); let ridendo = 0; let miglior = record('nonridere');
    const battute = ['tieni duro', 'non ci pensare…', 'seri seri', 'resisti!', 'quasi quasi ridi'];
    return {
      nome: 'Non ridere',
      tick({ emo, dt, ctx, W, H }) {
        const secondi = (nowMs() - t0) / 1000;
        const felice = emo === 'happy' || emo === 'surprise';
        if (felice) { ridendo += dt; if (ridendo >= 400) { const v = Math.round(secondi * 10) / 10; salvaRecord('nonridere', v); vaiFine('HAI RISO! 😂', v, 'record: ' + miglior + 's'); return; } }
        else ridendo = Math.max(0, ridendo - dt * 1.5);
        testo(ctx, 'NON RIDERE', W / 2, H * 0.16, Math.round(H * 0.07), felice ? '#f87171' : '#fff');
        testo(ctx, secondi.toFixed(1) + 's', W / 2, H * 0.44, Math.round(H * 0.18), '#fff');
        testo(ctx, battute[Math.floor(secondi / 3) % battute.length], W / 2, H * 0.66, Math.round(H * 0.05), '#c4b5fd');
        anello(ctx, W / 2, H * 0.44, Math.round(H * 0.16), ridendo / 400, '#f87171');
        testo(ctx, 'record ' + miglior + 's', W / 2, H * 0.82, Math.round(H * 0.045), '#a7f3d0');
      },
    };
  }

  function giocoBattaglia() {
    let puntiTu = 0, puntiChat = 0, sfida = null, colpito = 0;
    const coda = [], META = 5;
    return {
      nome: 'Battaglia',
      sfida(c) {
        const g = GESTI.some((x) => x.id === c.gesto) ? c.gesto : '';
        if (g && coda.length < 12) coda.push({ gesto: g, user: String(c.user || 'chat').slice(0, 20) });
      },
      tick({ g, dt, ctx, W, H }) {
        if (!sfida && coda.length) { sfida = { ...coda.shift(), tScad: nowMs() + 5000 }; colpito = 0; }
        if (sfida) {
          if (g === sfida.gesto) { colpito += dt; if (colpito >= 280) { puntiTu++; try { T.annuncia && T.annuncia('💪 Battuto @' + sfida.user + '! Tu ' + puntiTu + ' – Chat ' + puntiChat); } catch {  } sfida = null; } }
          else colpito = 0;
          if (sfida && sfida.tScad - nowMs() <= 0) { puntiChat++; try { T.annuncia && T.annuncia('😈 @' + sfida.user + ' ti frega! Tu ' + puntiTu + ' – Chat ' + puntiChat); } catch {  } sfida = null; }
        }
        testo(ctx, 'TU ' + puntiTu + '  –  ' + puntiChat + ' CHAT', W / 2, H * 0.14, Math.round(H * 0.06), '#fff');
        if (sfida) {
          const b = byId(sfida.gesto);
          testo(ctx, '@' + sfida.user + ' ti sfida:', W / 2, H * 0.34, Math.round(H * 0.048), '#c4b5fd');
          testo(ctx, b.emoji, W / 2, H * 0.53, Math.round(H * 0.22), '#fff');
          anello(ctx, W / 2, H * 0.53, Math.round(H * 0.17), Math.max(0, (sfida.tScad - nowMs()) / 5000), '#22d3ee');
          if (colpito > 0) anello(ctx, W / 2, H * 0.53, Math.round(H * 0.13), colpito / 280, '#34d399');
        } else {
          testo(ctx, 'La chat ti sfida — scrivete:', W / 2, H * 0.44, Math.round(H * 0.046), '#c4b5fd');
          testo(ctx, '!sfida ✌️ 👍 ✋ ☝️ ✊', W / 2, H * 0.56, Math.round(H * 0.06), '#e5e7eb');
        }
        if (puntiTu >= META || puntiChat >= META) vaiFine(puntiTu >= META ? 'HAI VINTO! 💪' : 'VINCE LA CHAT 😈', puntiTu + '–' + puntiChat, '');
      },
    };
  }

  function giocoPuzzle() {
    const N = 3;
    let W0 = 0, H0 = 0, side = 0, cell = 0, ox = 0, oy = 0, img = null;
    const pezzi = [];
    const LATO_FOTO = 720;
    let held = -1, prevGiu = false, vinto = false, tVinto = 0, started = nowMs(), conFoto = false, foto = null;
    function sorgenteFoto() {
      const f = window.SB_PUZZLE_FOTO;
      if (f && f.width && f.height) return f;
      const v = document.getElementById('cam');
      if (v && v.videoWidth > 0 && v.videoHeight > 0 && v.readyState >= 2) return v;
      return null;
    }
    function disegnaFoto(c, fonte, lato) {
      const fw = fonte.videoWidth || fonte.width, fh = fonte.videoHeight || fonte.height;
      const l = Math.min(fw, fh), sx = (fw - l) / 2, sy = (fh - l) / 2;
      const specchia = window.SB_SPECCHIO !== false && !(fonte.width && !fonte.videoWidth);
      c.save();
      if (specchia) { c.translate(lato, 0); c.scale(-1, 1); }
      c.drawImage(fonte, sx, sy, l, l, 0, 0, lato, lato);
      c.restore();
      return true;
    }
    function scattaUnaVolta() {
      if (foto) return;
      foto = document.createElement('canvas'); foto.width = LATO_FOTO; foto.height = LATO_FOTO;
      const c = foto.getContext('2d');
      const fonte = sorgenteFoto();
      conFoto = false;
      if (fonte) { try { conFoto = disegnaFoto(c, fonte, LATO_FOTO); } catch (e) { conFoto = false; } }
      if (conFoto) return;
      const g = c.createLinearGradient(0, 0, LATO_FOTO, LATO_FOTO);
      g.addColorStop(0, '#8b5cf6'); g.addColorStop(0.5, '#22d3ee'); g.addColorStop(1, '#f59e0b');
      c.fillStyle = g; c.fillRect(0, 0, LATO_FOTO, LATO_FOTO);
      for (let k = 0; k < 9; k++) { c.globalAlpha = 0.18; c.fillStyle = ['#fff', '#000'][k % 2]; c.beginPath(); c.arc(Math.random() * LATO_FOTO, Math.random() * LATO_FOTO, LATO_FOTO * (0.07 + Math.random() * 0.12), 0, 7); c.fill(); }
      c.globalAlpha = 1;
    }
    function costruisci(W, H) {
      const oldOx = ox, oldOy = oy, oldCell = cell;
      side = Math.min(W, H) * 0.72; cell = side / N; ox = (W - side) / 2; oy = (H - side) / 2; W0 = W; H0 = H;
      scattaUnaVolta();
      img = document.createElement('canvas'); img.width = side; img.height = side;
      const c = img.getContext('2d');
      c.drawImage(foto, 0, 0, LATO_FOTO, LATO_FOTO, 0, 0, side, side);
      if (pezzi.length && oldCell) {
        for (const p of pezzi) {
          p.x = ox + ((p.x - oldOx) / oldCell) * cell;
          p.y = oy + ((p.y - oldOy) / oldCell) * cell;
        }
      }
      const dim = Math.round(cell * (conFoto ? 0.2 : 0.42));
      c.fillStyle = conFoto ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.92)';
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = conFoto ? 3 : 4;
      c.textAlign = conFoto ? 'left' : 'center'; c.textBaseline = conFoto ? 'top' : 'middle';
      c.font = `800 ${dim}px system-ui`;
      for (let r = 0; r < N; r++) for (let col = 0; col < N; col++) {
        const n = r * N + col + 1;
        const tx = conFoto ? col * cell + cell * 0.08 : col * cell + cell / 2;
        const ty = conFoto ? r * cell + cell * 0.06 : r * cell + cell / 2;
        c.strokeText(n, tx, ty); c.fillText(n, tx, ty);
      }
      if (pezzi.length) return;
      const celle = []; for (let r = 0; r < N; r++) for (let col = 0; col < N; col++) celle.push({ col, r });
      const perm = celle.slice(); for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
      for (let i = 0; i < celle.length; i++) { const cc = celle[i], sc = perm[i]; pezzi.push({ cc: cc.col, cr: cc.r, x: ox + sc.col * cell + cell / 2, y: oy + sc.r * cell + cell / 2, held: false, offx: 0, offy: 0 }); }
    }
    const cellaVicina = (x, y) => ({ col: Math.max(0, Math.min(N - 1, Math.round((x - ox - cell / 2) / cell))), r: Math.max(0, Math.min(N - 1, Math.round((y - oy - cell / 2) / cell))) });
    const inCella = (p) => { const c = cellaVicina(p.x, p.y); return c.col === p.cc && c.r === p.cr && Math.hypot(p.x - (ox + p.cc * cell + cell / 2), p.y - (oy + p.cr * cell + cell / 2)) < cell * 0.5; };
    return {
      nome: 'Puzzle', puzzle: true,
      tick({ dt, ctx, W, H }) {
        if (!img || W !== W0 || H !== H0) costruisci(W, H);
        const P = window.SB_PUNTATORE, valido = P && (nowMs() - (P.t || 0) < 400);
        const spx = window.SB_SPECCHIO !== false;
        const px = valido ? (spx ? (1 - P.x) : P.x) * W : -999, py = valido ? P.y * H : -999, giu = valido && P.giu;

        ctx.save(); ctx.globalAlpha = 0.12; ctx.drawImage(img, ox, oy, side, side); ctx.restore();
        for (let r = 0; r < N; r++) for (let col = 0; col < N; col++) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.strokeRect(ox + col * cell, oy + r * cell, cell, cell); }

        if (giu && !prevGiu && held < 0) {
          for (let i = pezzi.length - 1; i >= 0; i--) { const p = pezzi[i]; if (Math.abs(px - p.x) < cell / 2 && Math.abs(py - p.y) < cell / 2) { p.held = true; p.offx = p.x - px; p.offy = p.y - py; pezzi.splice(i, 1); pezzi.push(p); held = pezzi.length - 1; break; } }
        }
        if (held >= 0) {
          const p = pezzi[held];
          if (giu) { const k = Math.min(1, 0.02 * dt), tx = px + p.offx, ty = py + p.offy; p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; }
          else { const c = cellaVicina(p.x, p.y); p.x = ox + c.col * cell + cell / 2; p.y = oy + c.r * cell + cell / 2; p.held = false; held = -1; }
        }
        prevGiu = giu;

        for (const p of pezzi) {
          const ok = inCella(p);
          ctx.save(); if (p.held) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; }
          ctx.drawImage(img, p.cc * cell, p.cr * cell, cell, cell, p.x - cell / 2, p.y - cell / 2, cell, cell);
          ctx.shadowBlur = 0; ctx.lineWidth = p.held ? 4 : 3; ctx.strokeStyle = ok ? 'rgba(52,211,153,.95)' : (p.held ? 'rgba(255,255,255,.95)' : 'rgba(139,92,246,.8)');
          ctx.strokeRect(p.x - cell / 2, p.y - cell / 2, cell, cell); ctx.restore();
        }

        if (valido) { ctx.save(); ctx.beginPath(); ctx.arc(px, py, giu ? 11 : 16, 0, 7); ctx.fillStyle = giu ? 'rgba(52,211,153,.9)' : 'rgba(255,255,255,.5)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke(); ctx.restore(); }
        else testo(ctx, 'muovi la mano e pizzica (pollice+indice)', W / 2, oy + side + H * 0.06, Math.round(H * 0.04), '#c4b5fd');
        const fatti = pezzi.filter(inCella).length;
        testo(ctx, 'PUZZLE  ' + fatti + '/' + (N * N), W / 2, Math.max(H * 0.06, oy - H * 0.04), Math.round(H * 0.05), '#fff');
        if (!vinto && fatti === N * N) { vinto = true; tVinto = nowMs(); try { T.annuncia && T.annuncia('🧩 Puzzle completato in ' + Math.round((nowMs() - started) / 1000) + 's! 🎉'); } catch {  } }
        if (vinto) { testo(ctx, 'COMPLETATO!', W / 2, H * 0.5, Math.round(H * 0.09), '#34d399'); if (nowMs() - tVinto > 3500) { modo = 'idle'; G = null; } }
      },
    };
  }

  const GIOCHI = { mima: giocoMima, reaction: giocoReaction, nonridere: giocoNonRidere, battaglia: giocoBattaglia, puzzle: giocoPuzzle };

  const ATTIVO = (id) => (window.SB_GIOCHI_ATTIVI ? window.SB_GIOCHI_ATTIVI[id] !== false : true);
  function avviaGioco(id) {
    const f = GIOCHI[id]; if (!f) return;

    if (id === 'puzzle') { if (window.SB_PUZZLE_ON === false) return; }
    else if (!ATTIVO(id) || window.SB_GIOCHI_MASTER === false) return;
    G = f(); modo = 'gioca';
    try { T.annuncia && T.annuncia('🎮 Via al gioco: ' + G.nome + '! Guardate lo schermo 👀'); } catch {  }
  }

  const VOCI = [
    { g: 'victory', id: 'mima', et: '✌️ Mima il gesto' },
    { g: 'thumbup', id: 'nonridere', et: '👍 Non ridere' },
    { g: 'point', id: 'reaction', et: '☝️ Reaction rush' },
  ];
  function disegnaMenu(ctx, g, W, H) {
    const voci = VOCI.filter((v) => ATTIVO(v.id));
    pannello(ctx, W * 0.14, H * 0.14, W * 0.72, H * 0.72, 26);
    testo(ctx, 'SCEGLI COL GESTO', W / 2, H * 0.24, Math.round(H * 0.055), '#fff');
    voci.forEach((v, i) => {
      const y = H * (0.38 + i * 0.15);
      const on = g === v.g;
      testo(ctx, v.et, W / 2, y, Math.round(H * 0.055), on ? '#34d399' : '#e5e7eb');
      if (on) anello(ctx, W * 0.24, y, Math.round(H * 0.03), Math.min(1, tenutoDa() / 800), '#34d399');
    });
    testo(ctx, '✊ esci', W / 2, H * 0.8, Math.round(H * 0.042), '#9ca3af');
    const sel = voci.find((v) => v.g === g);
    if (sel && tenutoDa() >= 800) { avviaGioco(sel.id); return; }
    if (g === 'fist' && tenutoDa() >= 700) modo = 'idle';
  }

  if (T.onComando) T.onComando((c) => {
    if (!c) return;
    if (c.azione === 'start' && GIOCHI[c.gioco]) avviaGioco(c.gioco);
    else if (c.azione === 'stop') { modo = 'idle'; G = null; }
    else if (c.azione === 'sfida' && G && G.sfida) G.sfida(c);
  });

  let _lastTick = nowMs();
  T.registraMinigioco(({ hands, faces, ctx, W, H }) => {
    const dt = Math.min(120, nowMs() - _lastTick); _lastTick = nowMs();

    if (window.SB_GIOCHI_MASTER === false && !(G && G.puzzle)) { modo = 'idle'; G = null; return; }
    const g = hands && hands[0] ? (T.rilevaGesto ? T.rilevaGesto(hands[0]) : '') : '';
    const emo = (T.emozione && faces) ? T.emozione(faces[0]) : '';
    aggiornaHold(g);

    if (modo === 'idle') {

      if (g === 'openpalm') {
        const f = Math.min(1, tenutoDa() / 1200);
        if (f > 0.05) {
          anello(ctx, W / 2, H / 2, Math.round(H * 0.09), f, '#8b5cf6');
          testo(ctx, 'tieni ✋ per giocare', W / 2, H * 0.5 + H * 0.16, Math.round(H * 0.045), '#c4b5fd');
        }
        if (tenutoDa() >= 1200) modo = 'menu';
      }
      return;
    }
    if (modo === 'menu') { disegnaMenu(ctx, g, W, H); return; }
    if (modo === 'gioca' && G) { try { G.tick({ g, emo, dt, ctx, W, H }); } catch {  } return; }
    if (modo === 'fine') {
      pannello(ctx, W * 0.14, H * 0.28, W * 0.72, H * 0.44, 26, 'rgba(10,10,18,.8)', '#34d399');
      testo(ctx, fineTit, W / 2, H * 0.4, Math.round(H * 0.07), '#fff');
      testo(ctx, String(finePunti), W / 2, H * 0.54, Math.round(H * 0.12), '#fde68a');
      if (fineSott) testo(ctx, fineSott, W / 2, H * 0.65, Math.round(H * 0.045), '#a7f3d0');
      if (nowMs() - fineT0 > 4500) {
        try { T.annuncia && T.annuncia('🏁 ' + fineTit + ' — risultato: ' + finePunti + (fineSott ? ' (' + fineSott.replace(/[🏆]/g, '').trim() + ')' : '')); } catch {  }
        modo = 'idle'; G = null;
      }
      return;
    }
  });
})();
