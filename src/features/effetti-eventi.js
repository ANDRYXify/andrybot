// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// GLI EFFETTI PER GLI EVENTI (docs/EFFETTI-SCHERMO.md, «Effetti per gli
// eventi»). Qui solo conti: niente database, niente overlay. Li usano il motore
// degli alert, che fa partire l'effetto, e il server, che salva le scelte.
//
// Un evento (un follow, un abbonamento, dei bit, un raid, un obiettivo
// raggiunto...) puo' far partire
// un effetto a tutto schermo: uno pronto, coi suoi colori e il suo suono, o uno
// degli effetti del canale. Gli eventi che portano un numero (i bit, gli
// spettatori di un raid, l'importo di una donazione) hanno dei LIVELLI: parte
// quello col «da» piu' alto che il numero raggiunge, e sotto il primo niente.
// La pausa dice quanto deve passare fra due effetti dello stesso evento: un
// arrivo di cento follow non riempie lo schermo di cento coriandoli.

// L'ordine e' quello del pannello. `quanto` e' il numero che l'evento porta
// (null: nessuno, e allora c'e' un livello solo).
export const EVENTI = Object.freeze([
  { id: 'follow', quanto: null, pausa: 10 },
  { id: 'sub', quanto: 'mesi', pausa: 0 },
  { id: 'regalo', quanto: 'quanti', pausa: 0 },
  { id: 'cheer', quanto: 'bit', pausa: 0 },
  { id: 'raid', quanto: 'spettatori', pausa: 0 },
  { id: 'donazione', quanto: 'importo', pausa: 0 },
  { id: 'treno', quanto: 'livello', pausa: 0 },
  // un obiettivo dello Studio che arriva al traguardo
  { id: 'obiettivo', quanto: null, pausa: 0 },
]);
const PER_ID = new Map(EVENTI.map((e) => [e.id, e]));
export const eventoDi = (id) => PER_ID.get(id) || null;

export const MAX_LIVELLI = 5;
export const MAX_DA = 1_000_000;
export const MAX_PAUSA = 600;
export const VOLUME = 80;
const COMANDO = /^[a-z0-9_]{1,24}$/;

const intero = (v, lo, hi, base) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : base;
};

// Un effetto: uno pronto (il disegno lo ripulisce chi chiama, con la stessa
// funzione degli effetti a comando) o uno del canale, per comando.
function effettoPulito(e, { disegno, comandoOk }) {
  if (!e || typeof e !== 'object') return null;
  if (e.tipo === 'pronto') return { tipo: 'pronto', disegno: disegno(e.disegno || {}), volume: intero(e.volume, 0, 100, VOLUME) };
  if (e.tipo === 'mio') {
    const c = String(e.comando || '').toLowerCase();
    return COMANDO.test(c) && comandoOk(c) ? { tipo: 'mio', comando: c } : null;
  }
  return null;
}

export function vocePulita(ev, x, opz) {
  const q = x && typeof x === 'object' ? x : {};
  const livelli = new Map();
  for (const l of Array.isArray(q.livelli) ? q.livelli : []) {
    const effetto = effettoPulito(l?.effetto, opz);
    if (!effetto) continue;
    const da = ev.quanto ? intero(l.da, 0, MAX_DA, 1) : 0;
    livelli.set(da, { da, effetto });
  }
  const ordinati = [...livelli.values()].sort((a, b) => a.da - b.da).slice(0, ev.quanto ? MAX_LIVELLI : 1);
  // muto: se l'avviso suona gia', l'effetto parte senza suono
  return { attivo: q.attivo === true, pausa: intero(q.pausa, 0, MAX_PAUSA, ev.pausa), muto: q.muto === true, livelli: ordinati };
}

// Le scelte del canale, ripulite: ogni evento c'e', spento finche' non lo si
// accende. `disegno` e' normDisegno (src/web/stile.js), `comandoOk` dice se un
// effetto del canale esiste: uno cancellato non resta appeso a un evento.
export function normalizza(x, { disegno = (d) => d, comandoOk = () => true } = {}) {
  const voci = x && typeof x === 'object' && x.voci && typeof x.voci === 'object' ? x.voci : {};
  return { voci: Object.fromEntries(EVENTI.map((ev) => [ev.id, vocePulita(ev, voci[ev.id], { disegno, comandoOk })])) };
}

// La voce di un evento come sta nelle impostazioni (gia' ripulite al
// salvataggio). Un evento mai toccato e' spento.
export function voceDi(settings, id) {
  const ev = eventoDi(id);
  if (!ev) return null;
  const v = settings?.effettiEventi?.voci?.[id];
  return v && typeof v === 'object' ? v : { attivo: false, pausa: ev.pausa, muto: false, livelli: [] };
}

// Il livello che parte per questo numero: quello col «da» piu' alto che il
// numero raggiunge. Un evento senza numero ha un livello solo. Un numero che
// non si sa (null) fa partire il primo livello: un evento c'e' stato, e a
// quanto valeva non si risponde inventando.
export function livelloPer(voce, quanto = null) {
  if (!voce || voce.attivo !== true || !Array.isArray(voce.livelli) || !voce.livelli.length) return null;
  if (quanto === null || quanto === undefined) return voce.livelli[0];
  const n = Number(quanto);
  if (!Number.isFinite(n)) return voce.livelli[0];
  let scelto = null;
  for (const l of voce.livelli) if (n >= l.da) scelto = l;
  return scelto;
}
