// Minigiochi con la webcam per l'overlay tracking. Girano TUTTI client-side:
// leggono gesti (dai landmark) ed espressioni del volto, disegnano sul canvas
// dell'overlay e annunciano i risultati in chat via il bot. Nessuna immagine
// lascia il PC. Si agganciano a window.SB_TRACKING.registraMinigioco.
//
// Avvio A GESTO (comodo in OBS): tieni ✋ per ~1,2s → menu; poi scegli col gesto
// (✌️ Mima · 👍 Non ridere · ☝️ Reaction). ✊ esce. L'avvio DA CHAT (comandi) e la
// "Battaglia con la chat" arrivano dal canale di ritorno (SB_TRACKING.onComando).
(() => {
  'use strict';
  const T = window.SB_TRACKING;
  if (!T || !T.registraMinigioco) return;

  // ────────────────────────────────────────────────────────── util di disegno
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

  // ─────────────────────────────────────────────────────────────── i gesti
  const GESTI = [
    { id: 'openpalm', emoji: '✋', nome: 'Mano aperta' },
    { id: 'fist', emoji: '✊', nome: 'Pugno' },
    { id: 'victory', emoji: '✌️', nome: 'Vittoria' },
    { id: 'point', emoji: '☝️', nome: 'Indice' },
    { id: 'thumbup', emoji: '👍', nome: 'Pollice su' },
  ];
  const byId = (id) => GESTI.find((g) => g.id === id) || GESTI[0];
  const record = (g) => Number(localStorage.getItem('sb-trk-rec-' + g) || 0);
  const salvaRecord = (g, v) => { if (v > record(g)) { try { localStorage.setItem('sb-trk-rec-' + g, String(v)); } catch { /* niente */ } return true; } return false; };

  // ─────────────────────────────────────────────── stato "gesto tenuto" (hold)
  // Si AGGIORNA una sola volta per frame col gesto corrente, poi si interroga da
  // quanto è tenuto. (Interrogarlo più volte a frame con gesti diversi lo
  // azzererebbe: per questo aggiornamento e interrogazione sono separati.)
  let holdG = '', holdT = 0;
  function aggiornaHold(g) { if (g !== holdG) { holdG = g; holdT = nowMs(); } }
  const tenutoDa = () => (holdG ? nowMs() - holdT : 0);

  // ───────────────────────────────────────────────────────── macchina a stati
  let modo = 'idle';   // idle | menu | gioca | fine
  let G = null;        // gioco attivo
  let finePunti = 0, fineTit = '', fineSott = '', fineT0 = 0;

  function vaiFine(titolo, punti, sott) { modo = 'fine'; fineTit = titolo; finePunti = punti; fineSott = sott || ''; fineT0 = nowMs(); }

  // ───────────────────────────────────────────────────────────────── GIOCHI
  // Ogni gioco: { nome, tick({g,emo,dt,ctx,W,H}) }. `dt` = ms dall'ultimo frame
  // (Human in OBS non gira a 60fps, quindi gli accumuli usano il tempo REALE).

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
        // colpito: gesto = bersaglio tenuto ~280ms
        if (g === bersaglio.id) { colpito += dt; if (colpito >= 280) { punti++; prossimo(); } }
        else colpito = 0;
        if (rimasto <= 0) { const rec = salvaRecord('mima', punti); vaiFine('MIMA', punti, rec ? '🏆 nuovo record!' : 'record: ' + record('mima')); return; }
        // disegno
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
        if (rimasto <= 0) { const rec = salvaRecord('reaction', punti); vaiFine('REACTION RUSH', punti, rec ? '🏆 nuovo record!' : 'record: ' + record('reaction')); return; }
        if (g === bersaglio.id) { colpito += dt; if (colpito >= 220) { punti++; bersaglio = pick(bersaglio.id); colpito = 0; } }
        else colpito = 0;
        testo(ctx, '⚡ REACTION RUSH', W / 2, H * 0.12, Math.round(H * 0.05), '#fff');
        testo(ctx, bersaglio.emoji, W / 2, H * 0.44, Math.round(H * 0.24), '#fff');
        // barra tempo
        const bw = W * 0.6, bx = W * 0.2, by = H * 0.66;
        ctx.save(); rrect(ctx, bx, by, bw, 16, 8); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
        rrect(ctx, bx, by, bw * (rimasto / 30000), 16, 8); ctx.fillStyle = '#f59e0b'; ctx.fill(); ctx.restore();
        testo(ctx, 'punti ' + punti + '  ·  ' + Math.ceil(rimasto / 1000) + 's', W / 2, H * 0.8, Math.round(H * 0.055), '#fde68a');
      },
    };
  }

  function giocoNonRidere() {
    const t0 = nowMs(); let ridendo = 0; let miglior = record('nonridere');
    const battute = ['tieni duro 😤', 'non ci pensare…', 'seri seri', 'resisti!', 'quasi quasi ridi 👀'];
    return {
      nome: 'Non ridere',
      tick({ emo, dt, ctx, W, H }) {
        const secondi = (nowMs() - t0) / 1000;
        const felice = emo === 'happy' || emo === 'surprise';
        if (felice) { ridendo += dt; if (ridendo >= 400) { const v = Math.round(secondi * 10) / 10; salvaRecord('nonridere', v); vaiFine('HAI RISO! 😂', v, 'record: ' + miglior + 's'); return; } }
        else ridendo = Math.max(0, ridendo - dt * 1.5);
        testo(ctx, '😐  NON RIDERE', W / 2, H * 0.16, Math.round(H * 0.07), felice ? '#f87171' : '#fff');
        testo(ctx, secondi.toFixed(1) + 's', W / 2, H * 0.44, Math.round(H * 0.18), '#fff');
        testo(ctx, battute[Math.floor(secondi / 3) % battute.length], W / 2, H * 0.66, Math.round(H * 0.05), '#c4b5fd');
        anello(ctx, W / 2, H * 0.44, Math.round(H * 0.16), ridendo / 400, '#f87171');
        testo(ctx, 'record ' + miglior + 's', W / 2, H * 0.82, Math.round(H * 0.045), '#a7f3d0');
      },
    };
  }

  const GIOCHI = { mima: giocoMima, reaction: giocoReaction, nonridere: giocoNonRidere };
  function avviaGioco(id) {
    const f = GIOCHI[id]; if (!f) return;
    G = f(); modo = 'gioca';
    try { T.annuncia && T.annuncia('🎮 Via al gioco: ' + G.nome + '! Guardate lo schermo 👀'); } catch { /* niente */ }
  }

  // ─────────────────────────────────────────────────────────────── MENU a gesti
  const VOCI = [
    { g: 'victory', id: 'mima', et: '✌️ Mima il gesto' },
    { g: 'thumbup', id: 'nonridere', et: '👍 Non ridere' },
    { g: 'point', id: 'reaction', et: '☝️ Reaction rush' },
  ];
  function disegnaMenu(ctx, g, W, H) {
    pannello(ctx, W * 0.14, H * 0.14, W * 0.72, H * 0.72, 26);
    testo(ctx, '🎮 SCEGLI COL GESTO', W / 2, H * 0.24, Math.round(H * 0.055), '#fff');
    VOCI.forEach((v, i) => {
      const y = H * (0.38 + i * 0.15);
      const on = g === v.g;
      testo(ctx, v.et, W / 2, y, Math.round(H * 0.055), on ? '#34d399' : '#e5e7eb');
      if (on) anello(ctx, W * 0.24, y, Math.round(H * 0.03), Math.min(1, tenutoDa() / 800), '#34d399');
    });
    testo(ctx, '✊ esci', W / 2, H * 0.8, Math.round(H * 0.042), '#9ca3af');
    const sel = VOCI.find((v) => v.g === g);
    if (sel && tenutoDa() >= 800) { avviaGioco(sel.id); return; }
    if (g === 'fist' && tenutoDa() >= 700) modo = 'idle';
  }

  // ─────────────────────────────────────────────────── comandi da chat (ret.)
  if (T.onComando) T.onComando((c) => {
    if (!c) return;
    if (c.azione === 'start' && GIOCHI[c.gioco]) avviaGioco(c.gioco);
    else if (c.azione === 'stop') { modo = 'idle'; G = null; }
    else if (c.azione === 'sfida' && G && G.sfida) G.sfida(c);
  });

  // ──────────────────────────────────────────────────────── loop del controller
  let _lastTick = nowMs();
  T.registraMinigioco(({ hands, faces, ctx, W, H }) => {
    const dt = Math.min(120, nowMs() - _lastTick); _lastTick = nowMs();   // ms reali dall'ultimo frame (cap anti-scatti)
    const g = hands && hands[0] ? (T.rilevaGesto ? T.rilevaGesto(hands[0]) : '') : '';
    const emo = (T.emozione && faces) ? T.emozione(faces[0]) : '';
    aggiornaHold(g);

    if (modo === 'idle') {
      // avvio a gesto: tieni ✋ per aprire il menu (mostra un anello di caricamento)
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
    if (modo === 'gioca' && G) { try { G.tick({ g, emo, dt, ctx, W, H }); } catch { /* niente */ } return; }
    if (modo === 'fine') {
      pannello(ctx, W * 0.14, H * 0.28, W * 0.72, H * 0.44, 26, 'rgba(10,10,18,.8)', '#34d399');
      testo(ctx, fineTit, W / 2, H * 0.4, Math.round(H * 0.07), '#fff');
      testo(ctx, String(finePunti), W / 2, H * 0.54, Math.round(H * 0.12), '#fde68a');
      if (fineSott) testo(ctx, fineSott, W / 2, H * 0.65, Math.round(H * 0.045), '#a7f3d0');
      if (nowMs() - fineT0 > 4500) {
        try { T.annuncia && T.annuncia('🏁 ' + fineTit + ' — risultato: ' + finePunti + (fineSott ? ' (' + fineSott.replace(/[🏆]/g, '').trim() + ')' : '')); } catch { /* niente */ }
        modo = 'idle'; G = null;
      }
      return;
    }
  });
})();
