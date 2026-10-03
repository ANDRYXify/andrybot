// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  const MIN_CS = 2;
  const RIDUZIONI = [[256, 1], [128, 1], [64, 1], [128, 2], [64, 2], [32, 2], [64, 3], [32, 3], [32, 4], [16, 4]];

  const msVero = (x) => (Number.isFinite(x) && x >= 20 ? x : 100);

  function ricampiona(durateMs, max) {
    const d = durateMs.map(msVero);
    const T = d.reduce((a, b) => a + b, 0);
    let piano;
    if (d.length <= max) piano = d.map((ms, i) => ({ da: i, ms }));
    else {
      const m = Math.max(1, Math.min(max, Math.floor(T / 20)));
      const passo = T / m, inizi = [];
      let t = 0;
      for (const x of d) { inizi.push(t); t += x; }
      piano = [];
      for (let k = 0, i = 0; k < m; k++) {
        const tk = k * passo;
        while (i + 1 < d.length && inizi[i + 1] <= tk) i++;
        piano.push({ da: i, ms: passo });
      }
    }
    let fatto = 0, cum = 0;
    return piano.map((f) => {
      cum += f.ms;
      const cs = Math.max(MIN_CS, Math.round(cum / 10) - fatto);
      fatto += cs;
      return { da: f.da, cs };
    });
  }

  function sfoltisci(piano, passo) {
    if (passo <= 1) return piano.slice();
    const fuori = [];
    for (let i = 0; i < piano.length; i += passo) {
      const gruppo = piano.slice(i, i + passo);
      fuori.push({ da: gruppo[0].da, cs: gruppo.reduce((s, f) => s + f.cs, 0) });
    }
    return fuori;
  }

  const lin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const LIN = Array.from({ length: 256 }, (_, i) => lin(i));

  function luminanza(dati, sfondo, unBit) {
    const fr = LIN[sfondo[0]], fg = LIN[sfondo[1]], fb = LIN[sfondo[2]];
    let somma = 0;
    const n = dati.length / 4;
    for (let i = 0; i < dati.length; i += 4) {
      const a = unBit ? (dati[i + 3] >= 128 ? 1 : 0) : dati[i + 3] / 255;
      const r = LIN[dati[i]] * a + fr * (1 - a), g = LIN[dati[i + 1]] * a + fg * (1 - a), b = LIN[dati[i + 2]] * a + fb * (1 - a);
      somma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    return n ? somma / n : 0;
  }

  function lampeggi(lum, cs) {
    const n = lum.length;
    if (n < 2) return 0;
    const giro = cs.reduce((s, x) => s + x * 10, 0);
    const cambi = [];
    let ext = lum[0], verso = 0, t = 0;
    for (let passata = 0; passata < 2; passata++) {
      for (let i = 0; i < n; i++, t += cs[i - 1] * 10) {
        if (passata === 0 && i === 0) continue;
        const v = lum[i];
        if ((verso === 1 && v > ext) || (verso === -1 && v < ext)) { ext = v; continue; }
        const salto = v - ext;
        if (Math.abs(salto) >= 0.1 && Math.min(v, ext) < 0.8) {
          verso = salto > 0 ? 1 : -1;
          cambi.push(t);
          ext = v;
        }
      }
    }
    let massimo = 0;
    for (let a = 0, b = 0; b < cambi.length; b++) {
      while (cambi[b] - cambi[a] >= 1000) a++;
      massimo = Math.max(massimo, b - a + 1);
    }
    return giro > 0 ? Math.floor(massimo / 2) : 0;
  }

  radice.SB_EMOTE = { ricampiona, sfoltisci, RIDUZIONI, luminanza, lampeggi, msVero };
})(typeof window !== 'undefined' ? window : globalThis);
