// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL GIRO DEI GIOCHI AUTOMATICI, LE REGOLE (docs/GIOCHI.md, «Il giro dei giochi
// automatici»). Qui solo conti: niente database, niente chat, niente orologio.
// Le usano il bot (giro-giochi.js), il catalogo dei giochi per la resa, il
// server per salvare e il pannello per mostrare le percentuali.
//
// Un orologio solo: quando scatta (ogni da `min` a `max` minuti) si sceglie
// UN gioco fra quelli che possono partire, ognuno col suo peso. Ogni voce ha
// due manopole: il peso (0 = mai da solo) e la distanza (al massimo uno ogni
// tanti minuti, 0 = nessuna).

const T = (it, en, es) => [it, en, es];

// Le manche: gli stessi tipi del catalogo (giochi-conf.js, MANCHE_TIPI), qui
// per nome perche' il catalogo legge questo file e non il contrario.
const MANCHE = [
  ['trivia', T('Quiz', 'Quiz', 'Quiz')],
  ['parola', T('Reflex', 'Reflex', 'Reflejo')],
  ['numero', T('Numero', 'Number', 'Número')],
  ['anagramma', T('Anagramma', 'Anagram', 'Anagrama')],
  ['sequenza', T('Sequenza', 'Sequence', 'Secuencia')],
  ['domanda', T('Domanda tua', 'Your question', 'Tu pregunta')],
  ['calcolo', T('Calcolo veloce', 'Quick maths', 'Cálculo rápido')],
  ['rebus', T('Rebus', 'Emoji rebus', 'Jeroglífico')],
  ['piuomeno', T('Più o meno', 'Higher or lower', 'Más o menos')],
  ['impiccato', T('Impiccato', 'Hangman', 'Ahorcado')],
  ['wordle', T('Wordle della chat', 'Chat Wordle', 'Wordle del chat')],
];
export const TIPI_MANCHE = MANCHE.map(([id]) => id);

// Le voci del giro. `soloLive`: vivono nell'overlay, e a canale spento non
// partono anche se il giro lo permette.
export const VOCI = Object.freeze([
  ...MANCHE.map(([id, nome]) => ({ id, gioco: 'manche', nome })),
  { id: 'boss', gioco: 'boss', nome: T('Il boss', 'The boss', 'El jefe'), soloLive: true },
  { id: 'arena', gioco: 'arena', nome: T('L’arena delle emote', 'The emote arena', 'La arena de emotes'), soloLive: true },
  { id: 'catena', gioco: 'catena', nome: T('Catena di parole', 'Word chain', 'Cadena de palabras') },
  { id: 'conta', gioco: 'conta', nome: T('Conta insieme', 'Count together', 'Contad juntos') },
  { id: 'corsa', gioco: 'corsa', nome: T('Corsa', 'Race', 'Carrera') },
]);
const PER_ID = new Map(VOCI.map((v) => [v.id, v]));
export const voceDi = (id) => PER_ID.get(id) || null;

export const LIMITI = Object.freeze({ min: [1, 360], chatMin: [0, 30], peso: [0, 100], distanza: [0, 1440] });
export const PESO_MANCHE = 10;
export const DEFAULT = Object.freeze({
  attivo: false, min: 15, max: 45, soloLive: false, chatMin: 1,
  voci: Object.freeze(Object.fromEntries(VOCI.map((v) => [v.id, Object.freeze({ peso: v.gioco === 'manche' ? PESO_MANCHE : 0, distanza: 0 })]))),
});

const intero = (x, def, lo, hi) => {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
};

// Il giro salvato, ripulito: ogni numero nei suoi limiti, ogni voce che c'e'
// (una voce che non si conosce non passa, una che manca prende il di serie).
export function normalizza(g = {}) {
  const q = g && typeof g === 'object' ? g : {};
  const min = intero(q.min, DEFAULT.min, ...LIMITI.min);
  return {
    attivo: q.attivo === true,
    min,
    max: Math.max(min, intero(q.max, DEFAULT.max, ...LIMITI.min)),
    soloLive: q.soloLive === true,
    chatMin: intero(q.chatMin, DEFAULT.chatMin, ...LIMITI.chatMin),
    voci: Object.fromEntries(VOCI.map((v) => {
      const s = q.voci && typeof q.voci === 'object' ? q.voci[v.id] : null;
      const d = DEFAULT.voci[v.id];
      return [v.id, {
        peso: intero(s?.peso, d.peso, ...LIMITI.peso),
        distanza: intero(s?.distanza, d.distanza, ...LIMITI.distanza),
      }];
    })),
  };
}

// CHI AVEVA SCELTO QUALCOSA LO RITROVA. Un canale senza giro salvato ha il giro
// ricavato dai tre orologi di prima (le manche, boss.ogni, arena.ogni), con le
// stesse frequenze in media: le frequenze si sommano, il giro scatta con la
// somma, ogni voce ha il peso della sua parte, e la distanza del boss e
// dell'arena e' il loro vecchio `ogni` (non arrivano piu' spesso di prima).
export function daiVecchi(settings = {}) {
  const m = settings?.manche && typeof settings.manche === 'object' ? settings.manche : {};
  const conf = settings?.giochiConf && typeof settings.giochiConf === 'object' ? settings.giochiConf : {};
  const minM = intero(m.minMin, 15, 1, 360);
  const maxM = Math.max(minM, intero(m.maxMin, 45, 1, 360));
  const tipi = Array.isArray(conf.manche?.tipi) && conf.manche.tipi.some((t) => TIPI_MANCHE.includes(t)) ? conf.manche.tipi.filter((t) => TIPI_MANCHE.includes(t)) : TIPI_MANCHE;
  const boss = intero(conf.boss?.ogni, 0, 0, 360);
  const arena = intero(conf.arena?.ogni, 0, 0, 360);
  const g = normalizza({});
  for (const t of TIPI_MANCHE) g.voci[t].peso = tipi.includes(t) ? PESO_MANCHE : 0;
  const fonti = [];
  if (m.attivo) fonti.push({ ids: tipi, frequenza: 2 / (minM + maxM) });
  if (boss) fonti.push({ ids: ['boss'], frequenza: 1 / boss });
  if (arena) fonti.push({ ids: ['arena'], frequenza: 1 / arena });
  if (!fonti.length) return g;
  g.attivo = true;
  g.soloLive = m.attivo ? m.soloLive === true : true;
  const somma = fonti.reduce((t, f) => t + f.frequenza, 0);
  if (fonti.length === 1 && m.attivo) { g.min = minM; g.max = maxM; }
  else if (fonti.length === 1) { g.min = g.max = Math.max(1, Math.round(1 / somma)); }
  else {
    // in media ogni 1/somma minuti; se ci sono le manche, col loro stesso respiro
    const media = 1 / somma;
    const largo = m.attivo ? (maxM - minM) / (minM + maxM) : 0;
    g.min = Math.max(1, Math.round(media * (1 - largo)));
    g.max = Math.max(g.min, Math.round(media * (1 + largo)));
  }
  // i pesi: la parte di ogni fonte divisa fra le sue voci, scalata perche' la
  // piu' grande valga 100. Quote uguali danno pesi uguali, per costruzione.
  if (fonti.length > 1) {
    const parti = [];
    for (const f of fonti) for (const id of f.ids) parti.push({ id, quota: f.frequenza / f.ids.length });
    const scala = 100 / Math.max(...parti.map((p) => p.quota));
    for (const t of TIPI_MANCHE) g.voci[t].peso = 0;
    for (const p of parti) g.voci[p.id].peso = Math.max(1, Math.round(p.quota * scala));
  } else if (boss || arena) g.voci[boss ? 'boss' : 'arena'].peso = 100;
  if (boss) g.voci.boss.distanza = boss;
  if (arena) g.voci.arena.distanza = arena;
  return g;
}

// Il giro di un canale: quello salvato, o quello ricavato da prima.
export const giroDi = (settings = {}) => (settings?.giro ? normalizza(settings.giro) : daiVecchi(settings));

// LA SCELTA PESATA: le voci in fila coi loro pesi, un numero `u` in [0, 1)
// dice dove si cade. Ogni voce esce esattamente con peso / somma. Torna l'id,
// o null se nessuna ha peso.
export function pesca(candidati, u) {
  const pesati = candidati.filter((c) => c.peso > 0);
  const somma = pesati.reduce((t, c) => t + c.peso, 0);
  if (!somma) return null;
  let x = Math.min(Math.max(Number(u) || 0, 0), 1 - Number.EPSILON) * somma;
  for (const c of pesati) {
    if (x < c.peso) return c.id;
    x -= c.peso;
  }
  return pesati.at(-1).id;
}

// Quando scatta il prossimo giro, con `u` in [0, 1).
export const prossimo = (g, ora, u) => ora + (g.min + (Number(u) || 0) * (g.max - g.min)) * 60_000;

// Su 100 giochi automatici, quanti di ognuno (le voci con un peso), a un
// decimale: pesi uguali danno numeri uguali.
export function percentuali(g) {
  const accese = VOCI.filter((v) => g.voci[v.id]?.peso > 0);
  const somma = accese.reduce((t, v) => t + g.voci[v.id].peso, 0);
  return Object.fromEntries(accese.map((v) => [v.id, Math.round((g.voci[v.id].peso / somma) * 1000) / 10]));
}

// IL RITMO, detto come si capisce: quanti giochi in un'ora (in media, per
// arrotondamento) se il giro scatta almeno una volta all'ora; se no i minuti
// fra uno e l'altro, perche' «da 1 a 1 in un'ora» per un gioco ogni novanta
// minuti sarebbe falso.
export function ritmo(g) {
  if (g.max <= 60) return { perOra: [Math.round(60 / g.max), Math.round(60 / g.min)] };
  return { minuti: [g.min, g.max] };
}

// LA DISTANZA VERA fra due partenze della stessa voce, in minuti: il giro non
// scatta prima di `min`, e la voce non riparte prima della sua distanza. Zero
// se non parte mai da sola. Per le manche, la piu' corta fra i tipi col peso.
export function minuti(g, id) {
  if (!g.attivo || !(g.voci[id]?.peso > 0)) return 0;
  return Math.max(g.min, g.voci[id].distanza);
}
export function minutiManche(g) {
  const m = TIPI_MANCHE.map((t) => minuti(g, t)).filter((x) => x > 0);
  return m.length ? Math.min(...m) : 0;
}
