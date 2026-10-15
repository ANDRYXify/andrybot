// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
class Cattura extends AudioWorkletProcessor {
  process(ingressi, uscite) {
    const ingresso = ingressi[0];
    if (ingresso && ingresso.length) {
      const canali = [ingresso[0].slice(0), (ingresso[1] || ingresso[0]).slice(0)];
      this.port.postMessage(canali, canali.map((c) => c.buffer));
    } else {
      const zero = [new Float32Array(128), new Float32Array(128)];
      this.port.postMessage(zero, zero.map((c) => c.buffer));
    }
    return true;
  }
}
registerProcessor('diretta-cattura', Cattura);
