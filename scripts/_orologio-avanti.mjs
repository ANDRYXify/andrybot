// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'OROLOGIO SPOSTATO IN AVANTI, per verifica-orologio.mjs: caricato prima di
// ogni prova (node --import), fa dire a Date.now() e a new Date() un giorno di
// SPOSTA_GIORNI giorni dopo. Le date scritte (new Date(x), Date.UTC) restano
// quelle: si sposta solo «adesso».
const SPOSTA = Number(process.env.SPOSTA_GIORNI || 0) * 86400000;
const Vero = Date;
class Spostato extends Vero {
  constructor(...a) { if (a.length === 0) super(Vero.now() + SPOSTA); else super(...a); }
  static now() { return Vero.now() + SPOSTA; }
}
globalThis.Date = Spostato;
