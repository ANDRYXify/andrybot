// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE LARGHEZZE DELLE LETTERE dei caratteri della carta (docs/CARTA-LIVE.md, «I testi
// si misurano»).
//
// La carta disegna i testi con tre caratteri che sono file nostri
// (assets/font). Quanto e' larga ogni lettera e' scritto dentro il file: la
// tabella `hmtx` da' l'avanzamento di ogni glifo, la tabella `cmap` dice quale
// glifo fa quale lettera, `head` dice in che unita'. Questo script le legge e
// scrive in src/features/carta-disegno.js, fra due segni, una tabella per
// carattere: l'avanzamento di ogni lettera in millesimi di corpo. Cosi' il
// pannello e il server misurano un testo con gli stessi numeri, e la carta puo'
// far stare un testo nella sua larghezza invece di tagliarlo a un numero di
// segni.
//
// Il crenamento (le coppie di lettere che si avvicinano) non si conta: si
// stringe sempre, mai allarga, quindi la misura e' un tetto. Un testo misurato
// ci sta sempre.
//
// Uso: node scripts/misura-caratteri.mjs             (riscrive la tabella)
//      node scripts/misura-caratteri.mjs --verifica  (esce 1 se la tabella non e' quella dei file)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = join(RAD, 'assets/font');
const CARTA = join(RAD, 'src/features/carta-disegno.js');
const VERIFICA = process.argv.includes('--verifica');

// Le lettere che si misurano: l'ASCII stampabile, il Latin-1 e il Latin
// Extended-A (i nomi europei), e la punteggiatura tipografica. Le altre
// (cirillico, ideogrammi) i nostri caratteri non le hanno: il browser e il
// server le prendono da un altro carattere, e la carta le conta larghe un
// corpo intero, che e' il tetto di quasi ogni scrittura.
const BLOCCHI = [[32, 126], [160, 383], [0x2010, 0x2027], [0x20ac, 0x20ac], [0x2122, 0x2122]];

function tabelle(buf) {
  const n = buf.readUInt16BE(4);
  const t = {};
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    t[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) };
  }
  return t;
}

function mappa(buf, cmap) {
  const n = buf.readUInt16BE(cmap.off + 2);
  let sub = null;
  for (let i = 0; i < n; i++) {
    const o = cmap.off + 4 + i * 8;
    const pid = buf.readUInt16BE(o), eid = buf.readUInt16BE(o + 2), off = buf.readUInt32BE(o + 4);
    const fmt = buf.readUInt16BE(cmap.off + off);
    if (pid === 3 && eid === 10 && fmt === 12) { sub = { off: cmap.off + off, fmt }; break; }
    if (pid === 3 && eid === 1 && fmt === 4 && !sub) sub = { off: cmap.off + off, fmt };
  }
  if (!sub) throw new Error('nessuna tabella cmap Unicode');
  const glifo = new Map();
  if (sub.fmt === 12) {
    const gruppi = buf.readUInt32BE(sub.off + 12);
    for (let g = 0; g < gruppi; g++) {
      const o = sub.off + 16 + g * 12;
      const a = buf.readUInt32BE(o), b = buf.readUInt32BE(o + 4), id = buf.readUInt32BE(o + 8);
      for (let c = a; c <= b && c <= 0x2fff; c++) glifo.set(c, id + c - a);
    }
    return glifo;
  }
  const seg = buf.readUInt16BE(sub.off + 6) / 2;
  const fine = sub.off + 14, inizio = fine + seg * 2 + 2, delta = inizio + seg * 2, rango = delta + seg * 2;
  for (let s = 0; s < seg; s++) {
    const a = buf.readUInt16BE(inizio + s * 2), b = buf.readUInt16BE(fine + s * 2);
    const d = buf.readInt16BE(delta + s * 2), r = buf.readUInt16BE(rango + s * 2);
    for (let c = a; c <= b && c !== 0xffff; c++) {
      let id;
      if (!r) id = (c + d) & 0xffff;
      else {
        id = buf.readUInt16BE(rango + s * 2 + r + (c - a) * 2);
        if (id) id = (id + d) & 0xffff;
      }
      if (id) glifo.set(c, id);
    }
  }
  return glifo;
}

export function misuraCarattere(file) {
  const buf = readFileSync(join(FONT, file));
  const t = tabelle(buf);
  const em = buf.readUInt16BE(t.head.off + 18);
  const nMetriche = buf.readUInt16BE(t.hhea.off + 34);
  const avanza = (id) => buf.readUInt16BE(t.hmtx.off + Math.min(id, nMetriche - 1) * 4);
  const glifo = mappa(buf, t.cmap);
  // Il peso con cui il carattere si disegna da solo: per un carattere variabile
  // e' quello di partenza dell'asse `wght` (fvar), ed e' quello che usa il
  // disegnatore del server; per uno fisso e' quello dichiarato in OS/2.
  let peso = buf.readUInt16BE(t['OS/2'].off + 4);
  if (t.fvar) {
    const o = t.fvar.off, assi = buf.readUInt16BE(o + 4), n = buf.readUInt16BE(o + 8);
    for (let i = 0; i < n; i++) {
      const q = o + assi + i * 20;
      if (buf.toString('latin1', q, q + 4) === 'wght') peso = Math.round(buf.readInt32BE(q + 8) / 65536);
    }
  }
  const out = { peso };
  for (const [a, b] of BLOCCHI) {
    out[a] = [];
    for (let c = a; c <= b; c++) out[a].push(glifo.has(c) ? Math.round(avanza(glifo.get(c)) * 1000 / em) : 0);
  }
  return out;
}

const CARATTERI = [...readFileSync(CARTA, 'utf8').match(/export const CARATTERI = \[([\s\S]*?)\];/)[1].matchAll(/\['([^']+)', '([^']+)'\]/g)].map((m) => [m[1], m[2]]);
const tabella = Object.fromEntries(CARATTERI.map(([nome, file]) => [nome, misuraCarattere(file)]));
const corpo = 'export const LETTERE = {\n' + Object.entries(tabella).map(([nome, { peso, ...blocchi }]) =>
  `  '${nome}': {\n    peso: ${peso},\n` + Object.entries(blocchi).map(([da, v]) => `    ${da}: [${v.join(',')}],`).join('\n') + '\n  },').join('\n') + '\n};';
const INIZIO = '// ── le lettere (scritto da scripts/misura-caratteri.mjs, non a mano) ──';
const FINE = '// ── fine delle lettere ──';
const sorgente = readFileSync(CARTA, 'utf8');
const a = sorgente.indexOf(INIZIO), b = sorgente.indexOf(FINE);
if (a < 0 || b < 0) { console.log(`In ${CARTA} mancano i segni della tabella.`); process.exit(1); }
const nuovo = sorgente.slice(0, a + INIZIO.length) + '\n' + corpo + '\n' + sorgente.slice(b);
if (VERIFICA) {
  const ok = nuovo === sorgente;
  console.log(ok ? 'La tabella delle lettere e\' quella dei file dei caratteri. ✓' : '  ✗ la tabella delle lettere non e\' quella dei file: node scripts/misura-caratteri.mjs');
  process.exit(ok ? 0 : 1);
}
writeFileSync(CARTA, nuovo);
console.log(`Tabella delle lettere riscritta: ${CARATTERI.map(([n]) => n).join(', ')}.`);
