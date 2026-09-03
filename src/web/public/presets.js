// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(function () {
  'use strict';

  let AC = null;
  function ctx() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!AC) AC = new C();
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {  } }
    return AC;
  }

  function tono(c, dest, { tipo = 'sine', f0, f1, t0, dur, picco = 0.3 }) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(picco, t0 + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function rumore(c, dest, { t0, dur, picco = 0.3, tipoFiltro = 'bandpass', f0 = 1000, f1, q = 1 }) {
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const dati = buf.getChannelData(0);
    for (let i = 0; i < n; i++) dati[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filtro = c.createBiquadFilter();
    filtro.type = tipoFiltro;
    filtro.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) filtro.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    filtro.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(picco, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filtro).connect(g).connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const RICETTE = {
    campanello: (c, d, t) => { tono(c, d, { tipo: 'sine', f0: 1568, f1: 1568, t0: t, dur: 0.5, picco: 0.35 }); tono(c, d, { tipo: 'sine', f0: 2093, t0: t, dur: 0.35, picco: 0.15 }); },
    campana:    (c, d, t) => { tono(c, d, { tipo: 'sine', f0: 660, t0: t, dur: 1.4, picco: 0.32 }); tono(c, d, { tipo: 'sine', f0: 990, t0: t, dur: 1.0, picco: 0.14 }); tono(c, d, { tipo: 'sine', f0: 1980, t0: t, dur: 0.6, picco: 0.06 }); },
    acqua:      (c, d, t) => { tono(c, d, { tipo: 'sine', f0: 1400, f1: 480, t0: t, dur: 0.16, picco: 0.4 }); rumore(c, d, { t0: t, dur: 0.12, picco: 0.08, tipoFiltro: 'bandpass', f0: 900, q: 4 }); tono(c, d, { tipo: 'sine', f0: 700, f1: 300, t0: t + 0.13, dur: 0.14, picco: 0.2 }); },
    moneta:     (c, d, t) => { tono(c, d, { tipo: 'square', f0: 988, t0: t, dur: 0.08, picco: 0.22 }); tono(c, d, { tipo: 'square', f0: 1319, t0: t + 0.08, dur: 0.32, picco: 0.22 }); },
    tamburo:    (c, d, t) => { tono(c, d, { tipo: 'sine', f0: 180, f1: 55, t0: t, dur: 0.2, picco: 0.6 }); rumore(c, d, { t0: t, dur: 0.06, picco: 0.2, tipoFiltro: 'lowpass', f0: 2000 }); },
    trombetta:  (c, d, t) => { tono(c, d, { tipo: 'sawtooth', f0: 233, t0: t, dur: 0.55, picco: 0.28 }); tono(c, d, { tipo: 'sawtooth', f0: 235, t0: t, dur: 0.55, picco: 0.2 }); tono(c, d, { tipo: 'square', f0: 466, t0: t, dur: 0.5, picco: 0.08 }); },
    errore:     (c, d, t) => { tono(c, d, { tipo: 'sawtooth', f0: 160, t0: t, dur: 0.18, picco: 0.35 }); tono(c, d, { tipo: 'sawtooth', f0: 120, t0: t + 0.2, dur: 0.28, picco: 0.35 }); },
    tada:       (c, d, t) => { [523, 659, 784].forEach((f, i) => tono(c, d, { tipo: 'square', f0: f, t0: t + i * 0.09, dur: 0.14, picco: 0.2 })); [1046, 1319, 1568].forEach((f) => tono(c, d, { tipo: 'square', f0: f, t0: t + 0.3, dur: 0.5, picco: 0.14 })); },
    pop:        (c, d, t) => { tono(c, d, { tipo: 'sine', f0: 420, f1: 900, t0: t, dur: 0.09, picco: 0.4 }); },
    whoosh:     (c, d, t) => { rumore(c, d, { t0: t, dur: 0.45, picco: 0.3, tipoFiltro: 'bandpass', f0: 300, f1: 3200, q: 0.8 }); },
    applausi:   (c, d, t) => { for (let i = 0; i < 22; i++) { const j = t + i * 0.035 + Math.random() * 0.015; rumore(c, d, { t0: j, dur: 0.05, picco: 0.12 + Math.random() * 0.06, tipoFiltro: 'bandpass', f0: 1500 + Math.random() * 900, q: 1.2 }); } },
    laser:      (c, d, t) => { tono(c, d, { tipo: 'sawtooth', f0: 1600, f1: 180, t0: t, dur: 0.3, picco: 0.3 }); },
    salita:     (c, d, t) => { [392, 523, 659, 784, 1046].forEach((f, i) => tono(c, d, { tipo: 'square', f0: f, t0: t + i * 0.07, dur: 0.09, picco: 0.2 })); },
  };

  const NOMI = {
    campanello: 'Campanello', campana: 'Campana', acqua: 'Goccia d\'acqua', moneta: 'Moneta',
    tamburo: 'Tamburo', trombetta: 'Trombetta', errore: 'Errore / buzzer', tada: 'Ta-daa!',
    pop: 'Pop', whoosh: 'Whoosh', applausi: 'Applausi', laser: 'Laser', salita: 'Power-up',
  };

  const lista = Object.keys(RICETTE).map((id) => ({ id, nome: NOMI[id] || id }));

  function suona(id, volume, destino) {
    const ricetta = RICETTE[id];
    if (!ricetta) return false;
    const c = (destino && destino.ac) ? destino.ac : ctx();
    if (!c) return false;
    const master = c.createGain();
    const v = Math.min(1, Math.max(0, (Number(volume) || 100) / 100));
    master.gain.value = v;
    const nodi = (destino && Array.isArray(destino.nodi) && destino.nodi.length) ? destino.nodi : [c.destination];
    for (const n of nodi) { try { master.connect(n); } catch (e) {  } }
    try { if (c.state === 'suspended') c.resume(); } catch (e) {  }
    try { ricetta(c, master, c.currentTime + 0.01); } catch (e) { return false; }
    return true;
  }

  window.SUONI_PRESET = { lista, suona, nomi: NOMI };

  const D = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const ICONE = {
    stella: D('<path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'),
    cuore: D('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
    fulmine: D('<path d="m13 2-3 7h5l-3 7"/><circle cx="12" cy="12" r="9"/>'),
    megafono: D('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
    corona: D('<path d="m2 18 2-11 5 4 3-6 3 6 5-4-2 11z"/><path d="M4 21h16"/>'),
    fuoco: D('<path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 1.5 0 1-4-1-7.5Z"/><path d="M7.5 15.5A5.5 5.5 0 0 0 12 22a5.5 5.5 0 0 0 4.5-6.5"/>'),
    diamante: D('<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3 6 9l6 12M15 3l3 6-6 12"/>'),
    trofeo: D('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/><path d="M10 14h4l1 6H9z"/>'),
    regalo: D('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 13h18"/><path d="M12 8S9 3 7 4.5 9 8 12 8s5-5 3-3.5S12 8 12 8Z"/>'),
    razzo: D('<path d="M12 2c3.5 2.5 5.5 6.5 5.5 11l-2.5 3h-6l-2.5-3C6.5 8.5 8.5 4.5 12 2Z"/><circle cx="12" cy="10" r="2"/><path d="M9 19c-1 1.5-1 3 0 3s1.5-1.5 1-3M15 19c1 1.5 1 3 0 3s-1.5-1.5-1-3"/>'),
    scudo: D('<path d="M12 2 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6Z"/>'),
    cuffie: D('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="5" height="7" rx="2"/><rect x="17" y="14" width="5" height="7" rx="2"/>'),
    gamepad: D('<rect x="2" y="7" width="20" height="12" rx="5"/><path d="M7 11v4M5 13h4M16 12h.01M19 15h.01"/>'),
    nota: D('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    chat: D('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    campana: D('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
    scintille: D('<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="2.5"/>'),
    mano: D('<path d="M11 11V5a1.5 1.5 0 0 1 3 0v6M14 10V4a1.5 1.5 0 0 1 3 0v7M17 10V6a1.5 1.5 0 0 1 3 0v9a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L9 12"/>'),
    occhio: D('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    moneta: D('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.75 1.75 0 0 1 0 3.5h-3a1.75 1.75 0 0 0 0 3.5h4"/>'),
  };
  const NOMI_ICONE = {
    stella: ['Stella', 'Star', 'Estrella'], cuore: ['Cuore', 'Heart', 'Corazón'],
    fulmine: ['Fulmine', 'Bolt', 'Rayo'], megafono: ['Megafono', 'Megaphone', 'Megáfono'],
    corona: ['Corona', 'Crown', 'Corona'], fuoco: ['Fuoco', 'Fire', 'Fuego'],
    diamante: ['Diamante', 'Gem', 'Diamante'], trofeo: ['Trofeo', 'Trophy', 'Trofeo'],
    regalo: ['Regalo', 'Gift', 'Regalo'], razzo: ['Razzo', 'Rocket', 'Cohete'],
    scudo: ['Scudo', 'Shield', 'Escudo'], cuffie: ['Cuffie', 'Headphones', 'Auriculares'],
    gamepad: ['Controller', 'Controller', 'Mando'], nota: ['Nota', 'Note', 'Nota'],
    chat: ['Fumetto', 'Bubble', 'Bocadillo'], campana: ['Campana', 'Bell', 'Campana'],
    scintille: ['Scintille', 'Sparkles', 'Destellos'], mano: ['Saluto', 'Wave', 'Saludo'],
    occhio: ['Occhio', 'Eye', 'Ojo'], moneta: ['Moneta', 'Coin', 'Moneda'],
  };
  window.FONT_CONT = {
    system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    inter: 'Inter, system-ui, sans-serif',
    spaceGrotesk: '"Space Grotesk", Inter, sans-serif',
    jetBrainsMono: '"JetBrains Mono", ui-monospace, monospace',
    fraunces: 'Fraunces, Georgia, serif',
    bricolage: '"Bricolage Grotesque", Inter, sans-serif',
  };
  window.ICONE_OVL = {
    chiavi: Object.keys(ICONE),
    svg(k) { return ICONE[k] || ''; },
    nome(k, lang) { const n = NOMI_ICONE[k]; return n ? (n[{ it: 0, en: 1, es: 2 }[lang] ?? 0] || n[0]) : k; },
  };
})();
