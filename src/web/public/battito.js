// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

'use strict';

var giro = 0;

onmessage = function (e) {
  clearInterval(giro);
  giro = 0;
  var ms = Number(e && e.data) || 0;
  if (ms > 0) giro = setInterval(function () { postMessage(0); }, ms);
};
