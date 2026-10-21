// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI ATTACCHI DEGLI SPETTATORI (docs/COLPI.md). Il modello, senza rete e
// senza database: le regole che il server, la pagina dello spettatore e le
// prove leggono da qui.
//
// Un attacco e' un EFFETTO del canale (un comando della tabella degli effetti)
// sparato nell'overlay nel PUNTO che lo spettatore ha mirato, col suo nome.
// Si paga in euro sul conto dello streamer, coi punti canale o coi Bit: i Bit
// fuori da Twitch non si incassano (solo chat, power-up ed estensioni), quindi
// per i Bit e per i punti la pagina da' un CODICE, e il codice arriva col cheer
// o col riscatto del premio.
//
// Le invarianti:
//  · IL PUNTO SI DECIDE ALLA MIRA. Il server lo controlla quando lo spettatore
//    lo sceglie (dentro il quadro, fuori dalle zone protette) e lo tiene: chi
//    paga dopo non puo' spostarlo, e uno sparo non si rifiuta piu' per il punto.
//  · IL PUNTO E' IL CENTRO. Le coordinate sono la percentuale del quadro 16:9 e
//    l'effetto ci si posa col suo centro: dove clicchi, colpisci.
//  · UNA MIRA SI SPARA UNA VOLTA SOLA, qualunque cosa la paghi (lo garantisce
//    il registro, con un passaggio di stato che vince una volta sola).
//  · IL PREZZO E' QUELLO DELLA MIRA. Si legge dal listino quando si mira e si
//    scrive nella mira: lo streamer che cambia il listino non cambia le mire gia'
//    fatte.

export const METODI = Object.freeze(['euro', 'punti', 'bit']);
export const LIMITI = Object.freeze({ voci: 20, zone: 8, nome: 40, chi: 25, attesaSec: [0, 600], alMinuto: [1, 60], scala: [20, 300], euroCent: [50, 50_000], punti: [1, 1_000_000], bit: [1, 100_000] });
export const SCADENZA_MS = 15 * 60_000;
// Niente 0/O, 1/I/L, 5/S, 2/Z: un codice si detta e si copia a mano.
export const ALFABETO = 'ABCDEFGHJKMNPQRTUVWXY346789';
export const LUNGHEZZA_CODICE = 5;

const num = (v, [a, b], d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const prezzo = (v, lim) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(lim[1], Math.max(lim[0], n)) : 0; };
const testo = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const pct = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : null; };
const ID = /^[a-z0-9]{1,24}$/;
const COMANDO = /^[a-z0-9_]{1,40}$/;

function zona(z) {
  if (!z || typeof z !== 'object') return null;
  const x = pct(z.x), y = pct(z.y), w = pct(z.w), h = pct(z.h);
  if (x == null || y == null || !w || !h) return null;
  return { x, y, w: Math.min(w, 100 - x), h: Math.min(h, 100 - y) };
}

export function normalizza(cfg) {
  const o = cfg && typeof cfg === 'object' ? cfg : {};
  const usati = new Set(), voci = [];
  for (const v of Array.isArray(o.voci) ? o.voci : []) {
    if (voci.length >= LIMITI.voci || !v || typeof v !== 'object') continue;
    const comando = String(v.comando || '').toLowerCase().replace(/^!/, '');
    if (!COMANDO.test(comando)) continue;
    let id = ID.test(String(v.id || '')) ? String(v.id) : comando.replace(/_/g, '').slice(0, 24) || 'a';
    for (let k = 2; usati.has(id); k++) id = (id.slice(0, 20) + k).slice(0, 24);
    usati.add(id);
    voci.push({
      id, comando, nome: testo(v.nome, LIMITI.nome) || comando,
      euro: prezzo(v.euro, LIMITI.euroCent), punti: prezzo(v.punti, LIMITI.punti), bit: prezzo(v.bit, LIMITI.bit),
      scala: num(v.scala, LIMITI.scala, 100), attiva: v.attiva !== false,
      premio: /^[0-9a-f-]{8,64}$/.test(String(v.premio || '')) ? String(v.premio) : '',
    });
  }
  return {
    attivo: o.attivo === true,
    voci,
    zone: (Array.isArray(o.zone) ? o.zone : []).map(zona).filter(Boolean).slice(0, LIMITI.zone),
    attesaSec: num(o.attesaSec, LIMITI.attesaSec, 30),
    alMinuto: num(o.alMinuto, LIMITI.alMinuto, 6),
    conNome: o.conNome !== false,
    pausa: o.pausa === true,
  };
}

// Il punto e' buono se sta nel quadro e fuori da ogni zona protetta.
export function puntoBuono(cfg, x, y) {
  const px = pct(x), py = pct(y);
  if (px == null || py == null) return { ok: false, motivo: 'punto' };
  for (const z of cfg.zone || []) if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return { ok: false, motivo: 'protetta' };
  return { ok: true, x: px, y: py };
}

export const voceDi = (cfg, id) => (cfg.voci || []).find((v) => v.id === id && v.attiva) || null;
export const prezzoDi = (voce, metodo) => (voce && METODI.includes(metodo) ? Number(voce[metodo]) || 0 : 0);
export const metodiDi = (voce) => METODI.filter((m) => prezzoDi(voce, m) > 0);

// Almeno una cifra e una lettera: una parola vera del messaggio («danke»,
// «ciaoo») non e' mai un codice, perche' le parole non hanno cifre.
const formaCodice = (c) => /\d/.test(c) && /[A-Z]/.test(c);
export function nuovoCodice(casuale = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  for (;;) {
    const b = casuale(LUNGHEZZA_CODICE);
    let s = '';
    for (let i = 0; i < LUNGHEZZA_CODICE; i++) s += ALFABETO[b[i] % ALFABETO.length];
    if (formaCodice(s)) return s;
  }
}

// Il codice dentro un testo (il messaggio del cheer, l'input del premio): una
// parola di cinque caratteri dell'alfabeto con almeno una cifra, ovunque,
// maiuscole o minuscole. «Cheer100 danke k7qx3!» → 'K7QX3'. Il primo che c'e'.
export function codiceIn(testoLibero) {
  const re = new RegExp(`(?:^|[^A-Za-z0-9])([${ALFABETO}${ALFABETO.toLowerCase()}]{${LUNGHEZZA_CODICE}})(?![A-Za-z0-9])`);
  const t = String(testoLibero || '');
  for (let m, da = 0; (m = re.exec(t.slice(da))); da += m.index + m[0].length) {
    const c = m[1].toUpperCase();
    if (formaCodice(c)) return c;
  }
  return '';
}

// Il nome che si legge sull'overlay: corto, senza a capo, senza link.
export function nomeChi(nome) {
  const n = testo(nome, LIMITI.chi).replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  return n || '';
}

// Il pagamento basta? Il prezzo scritto nella mira, nella sua moneta.
export function bastaPer(mira, metodo, pagato) {
  if (!mira) return false;
  const serve = Number(mira.prezzi?.[metodo]) || 0;
  return serve > 0 && Number(pagato) >= serve;
}
