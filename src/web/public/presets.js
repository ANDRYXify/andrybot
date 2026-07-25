// Libreria di SUONI PRESET sintetizzati con la Web Audio API: niente file da
// caricare, niente copyright. La usano sia l'overlay (per farli partire in
// diretta) sia la dashboard (per l'anteprima). Espone:
//   window.SUONI_PRESET = { lista: [{id, nome}], suona(id, volume) }
// `volume` è 0..100. Se un id non esiste, non fa nulla.
(function () {
  'use strict';

  let AC = null;
  function ctx() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!AC) AC = new C();
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) { /* niente */ } }
    return AC;
  }

  // Un tono con rampa di frequenza e inviluppo esponenziale in chiusura.
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

  // Un colpo di rumore (per tamburi, applausi, whoosh) filtrato.
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

  // Ogni preset: (c, dest, t0) → disegna il suono a partire da t0.
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

  // Etichette leggibili (ordine = ordine nel menu).
  const NOMI = {
    campanello: 'Campanello', campana: 'Campana', acqua: 'Goccia d\'acqua', moneta: 'Moneta',
    tamburo: 'Tamburo', trombetta: 'Trombetta', errore: 'Errore / buzzer', tada: 'Ta-daa!',
    pop: 'Pop', whoosh: 'Whoosh', applausi: 'Applausi', laser: 'Laser', salita: 'Power-up',
  };

  const lista = Object.keys(RICETTE).map((id) => ({ id, nome: NOMI[id] || id }));

  function suona(id, volume) {
    const ricetta = RICETTE[id];
    if (!ricetta) return false;
    const c = ctx();
    if (!c) return false;
    const master = c.createGain();
    const v = Math.min(1, Math.max(0, (Number(volume) || 100) / 100));
    master.gain.value = v;
    master.connect(c.destination);
    try { ricetta(c, master, c.currentTime + 0.01); } catch (e) { return false; }
    return true;
  }

  window.SUONI_PRESET = { lista, suona, nomi: NOMI };
})();
