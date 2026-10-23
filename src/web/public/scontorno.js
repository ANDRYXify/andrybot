// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
(function () {
  function rgb(h) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(h || '').trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 255, 0];
  }
  function scontorna(video, chroma, tela, opz) {
    opz = opz || {};
    var g = tela.getContext('2d', { willReadFrequently: true });
    var k = rgb(chroma && chroma.colore);
    var soglia = Math.max(20, Math.min(300, Number(chroma && chroma.soglia) || 140));
    var raf = 0, fermo = false, misurata = false;
    function giro() {
      if (fermo) return;
      if (video.videoWidth) {
        if (!misurata) {
          misurata = true;
          var sc = Math.min(1, 640 / video.videoWidth);
          tela.width = Math.max(2, Math.round(video.videoWidth * sc));
          tela.height = Math.max(2, Math.round(video.videoHeight * sc));
          if (opz.misurata) opz.misurata(video.videoWidth, video.videoHeight);
        }
        g.drawImage(video, 0, 0, tela.width, tela.height);
        try {
          var img = g.getImageData(0, 0, tela.width, tela.height), d = img.data;
          for (var i = 0; i < d.length; i += 4) {
            if (Math.abs(d[i] - k[0]) + Math.abs(d[i + 1] - k[1]) + Math.abs(d[i + 2] - k[2]) < soglia) d[i + 3] = 0;
          }
          g.putImageData(img, 0, 0);
        } catch (e) {  }
      }
      raf = requestAnimationFrame(giro);
    }
    raf = requestAnimationFrame(giro);
    return function () { fermo = true; cancelAnimationFrame(raf); };
  }
  window.SB_SCONTORNO = { scontorna: scontorna };
})();
