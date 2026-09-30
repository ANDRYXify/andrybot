// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PANNELLI DI TWITCH (docs/STRUMENTI.md, «Pannelli»): quello che si salva in
// `settings.pannelli`, ripulito. Lo stile e' della serie, i pannelli portano
// solo titolo, icona, link e descrizione. Il disegno e i testi precompilati
// stanno in src/web/public/pannelli.js; le costanti sono le stesse, e
// test/unita/pannelli.test.mjs controlla che restino uguali.

export const W = 320;
export const ALTEZZE = [80, 100, 160];
export const TEMI = ['pagina', 'carta', 'notte'];
export const FORME = ['penna', 'netta', 'piena'];
export const CARATTERI = ['archivo', 'serif', 'pennarello', 'gothic'];
export const TIPI = ['chi', 'programma', 'social', 'discord', 'dona', 'comandi', 'regole', 'libero'];
export const ICONE = { chi: 'utente', programma: 'calendario', social: 'globo', discord: 'chat', dona: 'cuore', comandi: 'lista', regole: 'scudo', libero: 'stella' };
// Le icone fra cui si sceglie: tutte chiavi del set del pannello (ICO in app.js).
export const ICONE_SCELTA = ['utente', 'faccina', 'calendario', 'globo', 'chat', 'cuore', 'lista', 'scudo', 'stella',
  'giochi', 'musica', 'cuffie', 'monitor', 'fotocamera', 'video', 'trofeo', 'corona', 'megafono', 'dado', 'fulmine', 'libro', 'telefono', 'giveaway'];
export const MAX = { voci: 12, titolo: 40, link: 300, testo: 1000, comandi: 12 };

const riga = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const testo = (x, n) => String(x == null ? '' : x).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
function indirizzo(u) {
  const s = String(u || '').trim();
  if (!s || s.length > MAX.link) return '';
  try { const x = new URL(s); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; }
}

export function normPannelli(v) {
  const s = v && typeof v === 'object' ? v : {};
  const st = s.stile && typeof s.stile === 'object' ? s.stile : {};
  const stile = {
    tema: TEMI.includes(st.tema) ? st.tema : 'pagina',
    forma: FORME.includes(st.forma) ? st.forma : 'penna',
    carattere: CARATTERI.includes(st.carattere) ? st.carattere : 'archivo',
    altezza: ALTEZZE.includes(Number(st.altezza)) ? Number(st.altezza) : 100,
    icone: st.icone !== false,
  };
  const voci = [], ids = new Set();
  for (const x of Array.isArray(s.voci) ? s.voci : []) {
    if (voci.length >= MAX.voci) break;
    if (!x || typeof x !== 'object') continue;
    const tipo = TIPI.includes(x.tipo) ? x.tipo : 'libero';
    // l'id tiene il seme della penna: lo stesso pannello, lo stesso bordo
    const base = String(x.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || tipo;
    let id = base, n = 2;
    while (ids.has(id)) id = `${base}-${n++}`;
    ids.add(id);
    voci.push({
      id, tipo,
      titolo: riga(x.titolo, MAX.titolo),
      icona: ICONE_SCELTA.includes(x.icona) ? x.icona : ICONE[tipo],
      link: indirizzo(x.link),
      testo: testo(x.testo, MAX.testo),
    });
  }
  return { stile, voci };
}
