// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

export const CODA_LUNGA = 54;
export const SBIECO = 0.74;
export const CODA_LARGA = 0.82;
export const MARGINE = Math.ceil(CODA_LUNGA * (1 + CODA_LARGA / 2)) + 6;
export const QUOTA_CODA = 0.55;
export const CODA_SU_BOLLA = 0.5;

export const misuraCoda = (stacco, altezza) =>
  Math.round(Math.min(stacco * QUOTA_CODA, altezza * CODA_SU_BOLLA));

const arr = (n) => Math.round(n * 100) / 100;

function corpoTondo(x, y, w, h, r) {
  const R = Math.max(4, Math.min(r, h / 2, w / 2));
  return { R, prima: `M ${arr(x + R)} ${arr(y)} H ${arr(x + w - R)} A ${R} ${R} 0 0 1 ${arr(x + w)} ${arr(y + R)} V ${arr(y + h - R)} A ${R} ${R} 0 0 1 ${arr(x + w - R)} ${arr(y + h)}`,
    dopo: `H ${arr(x + R)} A ${R} ${R} 0 0 1 ${arr(x)} ${arr(y + h - R)} V ${arr(y + R)} A ${R} ${R} 0 0 1 ${arr(x + R)} ${arr(y)} Z` };
}

function stella(x, y, w, h, punte, dentro) {
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
  const p = [];
  for (let k = 0; k < punte * 2; k++) {
    const t = Math.PI * k / punte - Math.PI / 2;
    const f = k % 2 === 0 ? 1 : dentro;
    p.push([cx + rx * f * Math.cos(t), cy + ry * f * Math.sin(t)]);
  }
  return p;
}

function codaVerso(bx, by, largo, lungo, giro, verso) {
  const a = giro * Math.PI / 180;
  const dx = Math.sin(a) * verso;
  const dy = Math.cos(a) * verso;
  const px = -dy, py = dx;
  const p1 = [bx - px * largo * SBIECO, by - py * largo * SBIECO];
  const p2 = [bx + px * largo * (1 - SBIECO), by + py * largo * (1 - SBIECO)];
  const punta = [bx + dx * lungo, by + dy * lungo];
  const piega = largo * 0.22;
  const meta = (a1, b1, f) => [(a1[0] + b1[0]) / 2 + px * f, (a1[1] + b1[1]) / 2 + py * f];
  return { p1, p2, punta, q1: meta(p1, punta, -piega), q2: meta(punta, p2, piega) };
}

const vp = (p) => `${arr(p[0])} ${arr(p[1])}`;

export function guscio({ larghezza, altezza, tipo = 'tondo', becco = 0.5, giro = 0, coda = true, sotto = false, raggio = 46, lungo: lungoDetto = 0, largo: largoDetto = 0 }) {
  const M = MARGINE;
  const w = Math.max(20, larghezza), h = Math.max(16, altezza);
  const x = M, y = M;
  const verso = sotto ? -1 : 1;
  const bordo = sotto ? y : y + h;
  const lungo = lungoDetto || Math.max(20, Math.min(h * 0.62, CODA_LUNGA));
  const largo = largoDetto || Math.max(16, Math.min(w * 0.34, lungo * CODA_LARGA));

  if (tipo === 'grido') {
    const punti = stella(x, y, w, h, 13, 0.8);
    if (!coda) return 'M ' + punti.map(vp).join(' L ') + ' Z';
    const bx = x + Math.max(largo, Math.min(becco * w, w - largo));
    const cy = y + h / 2;
    let scelto = -1, vicino = Infinity;
    for (let k = 0; k < punti.length; k++) {
      const dentro = verso > 0 ? punti[k][1] > cy : punti[k][1] < cy;
      if (!dentro) continue;
      const q = Math.abs(punti[k][0] - bx);
      if (q < vicino) { vicino = q; scelto = k; }
    }
    if (scelto < 0) scelto = 0;
    const t = codaVerso(punti[scelto][0], punti[scelto][1], largo, lungo, giro, verso);
    const fuori = punti.slice(0, scelto).concat([t.p1, t.punta, t.p2], punti.slice(scelto + 1));
    return 'M ' + fuori.map(vp).join(' L ') + ' Z';
  }

  const sporgeStima = Math.max(16, Math.min(w * 0.34, lungo * CODA_LARGA)) * Math.max(SBIECO, 1 - SBIECO) + 3;
  const raggioSicuro = Math.max(4, Math.min(raggio, h * 0.58, w / 2, (w - sporgeStima * 2) / 2));
  const { prima, dopo } = corpoTondo(x, y, w, h, raggioSicuro);
  const corpo = sotto
    ? `M ${arr(x + w)} ${arr(y + h)} H ${arr(x)} V ${arr(y)} H ${arr(x + w)} Z`
    : `${prima} ${dopo}`;
  if (!coda || tipo === 'pensiero') return sotto ? `${prima} ${dopo}` : corpo;

  const sporge0 = largo * Math.max(SBIECO, 1 - SBIECO) + 3;
  const R = raggioSicuro;
  const sporge = Math.min(sporge0, Math.max(0, (w - 2 * R) / 2));
  const bx = x + Math.max(R + sporge, Math.min(becco * w, w - R - sporge));
  const t = codaVerso(bx, bordo, largo, lungo, giro, verso);
  const dritta = sotto
    ? `M ${arr(x + R)} ${arr(y + h)} H ${arr(x + w - R)} A ${R} ${R} 0 0 0 ${arr(x + w)} ${arr(y + h - R)} V ${arr(y + R)} A ${R} ${R} 0 0 0 ${arr(x + w - R)} ${arr(y)} H ${vp(t.p1)}`
    : `${prima} H ${vp(t.p2)}`;
  const risalita = sotto
    ? `H ${arr(x + R)} A ${R} ${R} 0 0 0 ${arr(x)} ${arr(y + R)} V ${arr(y + h - R)} A ${R} ${R} 0 0 0 ${arr(x + R)} ${arr(y + h)} Z`
    : `${dopo}`;
  const daDestra = t.p1[0] >= t.p2[0];
  const primo = daDestra ? t.p1 : t.p2;
  const secondo = daDestra ? t.p2 : t.p1;
  const qa = daDestra ? t.q1 : t.q2;
  const qb = daDestra ? t.q2 : t.q1;
  const testa = sotto
    ? `M ${arr(x + R)} ${arr(y + h)} H ${arr(x + w - R)} A ${R} ${R} 0 0 0 ${arr(x + w)} ${arr(y + h - R)} V ${arr(y + R)} A ${R} ${R} 0 0 0 ${arr(x + w - R)} ${arr(y)} H ${arr(primo[0])}`
    : `${prima} H ${arr(primo[0])}`;
  const coda2 = ` Q ${vp(qa)} ${vp(t.punta)} Q ${vp(qb)} ${vp(secondo)}`;
  const chiusura = sotto
    ? ` H ${arr(x + R)} A ${R} ${R} 0 0 0 ${arr(x)} ${arr(y + R)} V ${arr(y + h - R)} A ${R} ${R} 0 0 0 ${arr(x + R)} ${arr(y + h)} Z`
    : ` ${dopo}`;
  return testa + coda2 + chiusura;
}

export function bollicine({ larghezza, altezza, becco = 0.5, giro = 0, sotto = false }) {
  const M = MARGINE;
  const bordo = sotto ? M : M + altezza;
  const verso = sotto ? -1 : 1;
  const a = giro * Math.PI / 180;
  const dx = Math.sin(a) * verso;
  const dy = Math.cos(a) * verso;
  const bx = M + Math.max(16, Math.min(becco * larghezza, larghezza - 16));
  return [[8, 6], [16, 5.5], [26, 4]].map(([d, r]) => ({ cx: arr(bx + dx * d * 1.6), cy: arr(bordo + dy * d * 1.6), r }));
}
