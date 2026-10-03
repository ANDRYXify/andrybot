// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PROVA DELLO SCUDO: un codice che esiste solo nel movimento.
//
// Un codice disegnato, anche storto e attraversato da linee, oggi lo legge
// qualunque programma che guarda le immagini: un OCR, un'intelligenza
// artificiale, la fotocamera di un telefono puntata sullo schermo. Quindi qui
// il codice non sta in nessuna immagine.
//
// Come e' fatta. Due campi di puntini a caso, grandi quanto la prova: uno per
// le lettere, uno per il fondo. Ogni fotogramma prende i puntini del primo
// dentro le lettere e quelli del secondo fuori. I due campi scorrono in
// direzioni OPPOSTE, e la direzione cambia ogni terzo di secondo. L'occhio
// vede subito le lettere, perche' i puntini dentro vanno insieme da una parte e
// quelli fuori dall'altra (e' il «destino comune» della percezione: cio' che si
// muove insieme e' una cosa sola).
//
// Cosa NON si puo' fare, per costruzione:
//  · leggere un fotogramma. I due campi sono rumore uniforme e indipendente
//    dalle lettere, quindi ogni fotogramma e' rumore uniforme: non porta
//    nessuna informazione sul codice, nemmeno un bit. Uno screenshot, una foto,
//    Lens, un'IA a cui si da' l'immagine: vedono rumore, perche' c'e' rumore.
//  · leggere una foto a posa lunga. Mediare i fotogrammi da' grigio uniforme
//    dappertutto (i due campi hanno la stessa densita'); e il mosso di una foto
//    disegna una striscia che ha una direzione ma non un verso, e dentro e fuori
//    le strisce sono identiche, perche' i versi sono opposti.
//  · trovare il codice nella pagina. Alla pagina arrivano solo i fotogrammi; la
//    maschera delle lettere e il codice restano qui. Nel browser non c'e' un
//    testo, un seme o una forma da leggere.
//
// Cosa resta possibile, ed e' giusto dirlo: un programma scritto APPOSTA contro
// questa prova, che prende i fotogrammi in fila e calcola come si muovono i
// puntini, le lettere le ritrova (l'informazione c'e', se no nemmeno l'occhio
// la vedrebbe). Nessuno strumento comune lo fa; e ogni tentativo costa a chi lo
// fa un account Telegram, con tentativi contati e un'attesa dopo ogni no
// (tg-scudo.js).
//
// I puntini di ogni campo hanno anche una vita breve: a ogni fotogramma una
// piccola parte rinasce a caso. L'occhio non se ne accorge; chi volesse seguire
// un puntino per molti fotogrammi lo perde.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomInt } from 'node:crypto';
import { CARTELLA_CARATTERI } from './carta-servita.js';
import { larghezzaTesto } from './carta-disegno.js';

// La griglia dei puntini: ogni cella e' un puntino, due pixel sullo schermo.
export const LARGO = 160;
export const ALTO = 56;
export const QUADRI = 30;       // al secondo
export const DURATA = 3;        // secondi, poi ricomincia
export const TRATTO = 10;       // fotogrammi con la stessa direzione (un terzo di secondo)
export const VITA = 0.06;       // la parte di puntini che rinasce a ogni fotogramma
export const FOTOGRAMMI = QUADRI * DURATA;

// Un carattere solo, alto e pieno: Anton. Due caratteri con altezze diverse
// fanno sembrare minuscole le lettere del piu' basso.
const CARATTERE = 'Anton';
const FILE = 'Anton-Regular.ttf';
// L'altezza delle maiuscole di Anton, in corpi: misurata sui pixel accesi del
// rasterizzatore (0,86 per H, M, W, 4, 6, J, Y, 3).
const ALTEZZA = 0.86;
const MARGINE = 4;
const SPAZIO = 3;

const file = () => [join(CARTELLA_CARATTERI, FILE)];
export const disegnabile = () => file().every((p) => existsSync(p));

// Un numero fra 0 e 1 dal generatore del sistema (o da quello che passa il
// collaudo, per avere sempre lo stesso disegno).
const casoVero = () => randomInt(0, 1_000_000) / 1_000_000;
const fra = (caso, a, b) => a + (b - a) * caso();
const n1 = (x) => Math.round(x * 10) / 10;
const rad = (g) => (g * Math.PI) / 180;

// Dove va ogni lettera. La larghezza di una lettera girata e piegata e' quella
// della sua scatola: larga per il coseno, alta per il seno, piu' quanto la
// piega sposta la cima. Le scatole si mettono in fila con almeno SPAZIO fra
// l'una e l'altra; se non ci stanno, si rimpicciolisce tutto insieme. Cosi' due
// lettere non si toccano per costruzione, qualunque giro esca. Le lettere qui
// girano poco: una forma fatta di movimento e' gia' piu' faticosa di una
// disegnata, e storcerla non aggiunge niente contro chi la legge a macchina.
export function disponi(codice, caso = casoVero) {
  const pezzi = String(codice || '').split('').map((ch) => ({
    ch, corpo: fra(caso, 46, 52), giro: fra(caso, -9, 9), piega: fra(caso, -6, 6),
  }));
  const scatola = (p, k) => {
    const w = larghezzaTesto(p.ch, CARATTERE, p.corpo * k);
    const h = ALTEZZA * p.corpo * k;
    const a = Math.abs(rad(p.giro));
    return {
      w: w * Math.cos(a) + h * Math.sin(a) + h * Math.abs(Math.tan(rad(p.piega))),
      h: w * Math.sin(a) + h * Math.cos(a),
    };
  };
  const utile = LARGO - 2 * MARGINE;
  const somma = (k) => pezzi.reduce((t, p) => t + scatola(p, k).w, 0);
  const alta = (k) => Math.max(0, ...pezzi.map((p) => scatola(p, k).h));
  const kL = (utile - SPAZIO * (pezzi.length + 1)) / Math.max(1, somma(1));
  const kA = (ALTO - 2 * SPAZIO) / Math.max(1, alta(1));
  const k = Math.min(1, kL, kA);
  const aria = (utile - somma(k)) / (pezzi.length + 1);
  let x = MARGINE + aria;
  return pezzi.map((p) => {
    const b = scatola(p, k);
    // un poco di disordine dentro l'aria che c'e', mai oltre la meta' di essa
    const cx = x + b.w / 2 + fra(caso, -1, 1) * Math.max(0, (aria - SPAZIO) / 2);
    const cy = ALTO / 2 + fra(caso, -1, 1) * Math.max(0, (ALTO - b.h) / 2 - SPAZIO);
    x += b.w + aria;
    return { ch: p.ch, x: cx, y: cy, corpo: p.corpo * k, giro: p.giro, piega: p.piega, w: b.w, h: b.h };
  });
}

// Le lettere come SVG: serve solo a fare la maschera, e non esce di qui.
export function svgLettere(codice, caso = casoVero) {
  const t = disponi(codice, caso).map((l) => `<text x="0" y="${n1((ALTEZZA * l.corpo) / 2)}" transform="translate(${n1(l.x)} ${n1(l.y)}) rotate(${n1(l.giro)}) skewX(${n1(l.piega)})" text-anchor="middle" font-family="${CARATTERE}" font-size="${n1(l.corpo)}" fill="#000">${l.ch}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGO}" height="${ALTO}" viewBox="0 0 ${LARGO} ${ALTO}">${t.join('')}</svg>`;
}

// La maschera: 1 dove c'e' una lettera, 0 fuori. Una cella e' dentro se la
// lettera la copre per piu' di meta'.
export async function maschera(codice, caso) {
  if (!disegnabile()) return null;
  const { Resvg } = await import('@resvg/resvg-js');
  const r = new Resvg(svgLettere(codice, caso), {
    font: { loadSystemFonts: false, fontFiles: file(), defaultFontFamily: CARATTERE },
    fitTo: { mode: 'width', value: LARGO },
  }).render();
  // `pixels` e' una copia nuova a ogni lettura: si prende una volta sola
  const px = r.pixels;
  const m = new Uint8Array(LARGO * ALTO);
  for (let i = 0; i < m.length; i++) m[i] = px[i * 4 + 3] > 127 ? 1 : 0;
  return m;
}

// Le otto direzioni di un passo, una cella per fotogramma.
export const DIREZIONI = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// Il generatore di bit: byte del sistema, presi a blocchi.
function fonteBit(bytes = randomBytes) {
  let buf = Buffer.alloc(0), i = 0, bit = 8, cur = 0;
  const byte = () => {
    if (i >= buf.length) { buf = bytes(4096); i = 0; }
    return buf[i++];
  };
  return {
    bit() { if (bit >= 8) { cur = byte(); bit = 0; } return (cur >> bit++) & 1; },
    // un intero in [0, n), senza la distorsione del modulo
    sotto(n) {
      const lim = 65536 - (65536 % n);
      for (;;) { const v = (byte() << 8) | byte(); if (v < lim) return v % n; }
    },
  };
}

// I fotogrammi. Torna un elenco di griglie (Uint8Array di 0 e 1) e le
// direzioni usate: le direzioni servono al collaudo, che controlla che le
// lettere si muovano davvero insieme; alla pagina vanno solo i fotogrammi.
export function fotogrammi(m, { quanti = FOTOGRAMMI, tratto = TRATTO, vita = VITA, bytes } = {}) {
  const n = LARGO * ALTO;
  const fonte = fonteBit(bytes);
  const campo = () => { const c = new Uint8Array(n); for (let i = 0; i < n; i++) c[i] = fonte.bit(); return c; };
  let fig = campo();
  let fondo = campo();
  const sposta = (c, [dx, dy]) => {
    const o = new Uint8Array(n);
    for (let y = 0; y < ALTO; y++) {
      const sy = ((y - dy) % ALTO + ALTO) % ALTO;
      for (let x = 0; x < LARGO; x++) o[y * LARGO + x] = c[sy * LARGO + ((x - dx) % LARGO + LARGO) % LARGO];
    }
    return o;
  };
  const rinasci = (c) => {
    const k = Math.round(n * vita);
    for (let j = 0; j < k; j++) c[fonte.sotto(n)] = fonte.bit();
  };
  const out = [];
  const direzioni = [];
  let d = DIREZIONI[fonte.sotto(8)];
  for (let t = 0; t < quanti; t++) {
    if (t > 0 && t % tratto === 0) {
      // una direzione nuova, mai la stessa di prima: il cambio si vede
      let nuova;
      do { nuova = DIREZIONI[fonte.sotto(8)]; } while (nuova === d);
      d = nuova;
    }
    if (t > 0) {
      fig = sposta(fig, d);
      fondo = sposta(fondo, [-d[0], -d[1]]);
      rinasci(fig);
      rinasci(fondo);
    }
    direzioni.push(d);
    const f = new Uint8Array(n);
    for (let i = 0; i < n; i++) f[i] = m[i] ? fig[i] : fondo[i];
    out.push(f);
  }
  return { fotogrammi: out, direzioni };
}

// Il formato che va alla pagina: «SBM1», larghezza, altezza, fotogrammi e
// quadri al secondo, poi i fotogrammi uno dopo l'altro, un bit per puntino,
// riga per riga. Niente altro.
export function impacchetta(lista) {
  const n = LARGO * ALTO;
  const perFoto = Math.ceil(n / 8);
  const b = Buffer.alloc(11 + perFoto * lista.length);
  b.write('SBM1', 0, 'ascii');
  b.writeUInt16BE(LARGO, 4);
  b.writeUInt16BE(ALTO, 6);
  b.writeUInt16BE(lista.length, 8);
  b.writeUInt8(QUADRI, 10);
  lista.forEach((f, k) => {
    const base = 11 + k * perFoto;
    for (let i = 0; i < n; i++) if (f[i]) b[base + (i >> 3)] |= 1 << (i & 7);
  });
  return b;
}

// La prova pronta da mandare, o null se qui non si puo' disegnare.
export async function provaInMovimento(codice, { caso, bytes } = {}) {
  const m = await maschera(codice, caso);
  if (!m) return null;
  return impacchetta(fotogrammi(m, { bytes }).fotogrammi);
}
