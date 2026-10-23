// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Lo scontorno di un video (green screen): il colore da togliere e quanto
// largo. null = niente. Lo stesso normalizzatore per quello salvato
// sull'effetto, per quello di un premio e per l'anteprima della pagina di
// Pewpewify: sta qui da solo, senza database, perche' lo leggono tutti e tre.
export function normChroma(o) {
  if (!o || o.attivo === false) return null;
  const colore = /^#[0-9a-f]{6}$/i.test(String(o.colore || '')) ? String(o.colore).toLowerCase() : '#00ff00';
  const soglia = Math.max(20, Math.min(300, Math.round(Number(o.soglia)) || 140));
  return { colore, soglia };
}
export const chromaDi = (eff) => { if (!eff?.chroma) return null; try { return normChroma(JSON.parse(eff.chroma)); } catch { return null; } };
