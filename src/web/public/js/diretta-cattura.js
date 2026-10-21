// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
class Cattura extends AudioWorkletProcessor {
  constructor(o) { super(); this.canali = o?.processorOptions?.canali === 4 ? 4 : 2; }
  process(ingressi, uscite) {
    const ingresso = ingressi[0];
    if (ingresso && ingresso.length) {
      const canali = ingresso.length >= 4 ? ingresso.map((c) => c.slice(0)) : [ingresso[0].slice(0), (ingresso[1] || ingresso[0]).slice(0)];
      this.port.postMessage(canali, canali.map((c) => c.buffer));
    } else {
      const zero = Array.from({ length: this.canali }, () => new Float32Array(128));
      this.port.postMessage(zero, zero.map((c) => c.buffer));
    }
    return true;
  }
}
registerProcessor('diretta-cattura', Cattura);
