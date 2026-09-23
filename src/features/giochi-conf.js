// LE MANOPOLE DEI GIOCHI, IN UN POSTO SOLO.
//
// Ogni gioco dichiara qui cosa si puo' cambiare: costi, premi, attese,
// probabilita', testi. Da questa dichiarazione nascono tutte le altre cose, e
// per questo non possono dire cose diverse:
//
//  · il server normalizza quello che arriva dal pannello (`normalizzaConf`);
//  · il motore legge i valori del canale (`confGioco`);
//  · il pannello disegna i campi e la resa (riceve il catalogo, non lo copia);
//  · le prove girano su tutto il catalogo, gioco per gioco.
//
// LA RESA SI CALCOLA, NON SI DICHIARA A PAROLE. Per ogni gioco c'e' una
// descrizione dell'esito medio (`resa`) che una funzione sola valuta con i
// valori scelti: quante monete tornano ogni cento giocate, o quante ne rende
// in un'ora. Il pannello la mostra mentre si muovono le manopole, cosi' la
// scelta resta dello streamer ma e' informata. Il ragionamento e i numeri di
// partenza stanno in docs/GIOCHI.md.
//
// CHI AVEVA CAMBIATO UN VALORE LO TIENE. Alcune manopole esistevano gia' in
// settings.punti. Il pannello salvava sempre tutti i valori, quindi «salvato»
// non vuol dire «scelto»: un valore uguale al VECCHIO predefinito vale come mai
// toccato e prende il nuovo; uno diverso e' una scelta, e resta.

const T = (it, en, es) => [it, en, es];

export const PRESENZA_GIRI_ORA = 12;

// Il pescato di serie: nome | monete | rarita'. Tarato perche' la pesca, al
// ritmo massimo, renda quanto la presenza di serie (docs/GIOCHI.md).
const PESCATO = [
  ['una vecchia ciabatta 🥿', 0, 16],
  ['una lattina arrugginita 🥫', 0, 12],
  ['un pesciolino 🐟', 3, 30],
  ['un granchio 🦀', 8, 18],
  ['un polpo 🐙', 15, 10],
  ['un pesce spada 🗡️', 30, 6],
  ['uno stivale pieno di monete 👢', 50, 4],
  ['uno scrigno del tesoro 🧰', 100, 2],
];

const OTTO = [
  'Sì, senza dubbio.', 'Direi proprio di sì.', 'Ci puoi scommettere.', 'Assolutamente.',
  'Mmm… non ci conterei.', 'Meglio di no.', 'Direi di no.', 'Non è detto.',
  'Chiedimelo di nuovo più tardi.', 'Il futuro è nebbioso… riprova.', 'Le probabilità sono buone.',
  'Segui il tuo istinto.', 'Ho i miei dubbi…', 'Ovvio che sì!', 'Nemmeno per sogno 😄',
];

const DUELLO = [
  '{a} stende {b} con una mossa leggendaria! 🥊',
  '{b} inciampa e {a} vince senza fatica 😂',
  '{a} e {b} se le danno di santa ragione, e alla fine la spunta {a}! 🔥',
  '{a} sconfigge {b} e ruba pure la scena ✨',
];

// I tipi di manche: gli stessi del motore (games.js, COSTRUTTORI), e una prova
// controlla che i due elenchi siano uguali.
export const MANCHE_TIPI = [
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
];

const ATTESA = (def, eti = T('Attesa fra due volte, a testa', 'Wait between two goes, each', 'Espera entre dos veces, cada uno')) =>
  ({ k: 'attesa', tipo: 'secondi', def, min: 1, max: 3600, eti });

// Il catalogo. `param` in ordine di pannello. `resa` e' la descrizione
// dell'esito medio: vedi `valutaResa`.
export const CATALOGO = [
  {
    id: 'slot', nome: T('Slot machine', 'Slot machine', 'Tragaperras'),
    param: [
      { k: 'costo', tipo: 'monete', def: 10, min: 1, max: 100000, eti: T('Costo di una giocata', 'Cost of a play', 'Coste de una tirada'), vecchio: { punti: 'slotCosto', era: 10 } },
      { k: 'jackpot', tipo: 'monete', def: 200, min: 0, max: 1000000, eti: T('Tris di 💎 (il 7 paga tre quarti, gli altri due quinti)', 'Three 💎 (7 pays three quarters, the others two fifths)', 'Trío de 💎 (el 7 paga tres cuartos, los demás dos quintos)'), vecchio: { punti: 'slotVinci', era: 200 } },
      { k: 'coppia', tipo: 'monete', def: 15, min: 0, max: 100000, eti: T('Una coppia', 'A pair', 'Una pareja'), vecchio: { punti: 'slotCoppia', era: 20 } },
      ATTESA(5),
    ],
    resa: { tipo: 'puntata', costo: 'costo', esiti: [[1 / 216, ['jackpot', 1]], [1 / 216, ['jackpot', 0.75]], [4 / 216, ['jackpot', 0.4]], [90 / 216, ['coppia', 1]]] },
  },
  {
    id: 'roulette', nome: T('Roulette', 'Roulette', 'Ruleta'),
    param: [
      { k: 'massimo', tipo: 'monete', def: 0, min: 0, max: 1000000, eti: T('Puntata massima (0 = nessun limite)', 'Maximum bet (0 = no limit)', 'Apuesta máxima (0 = sin límite)') },
      ATTESA(5),
    ],
    resa: { tipo: 'puntata', costo: 1, esiti: [[18 / 37, 2]] },
  },
  {
    id: 'pesca', nome: T('Pesca', 'Fishing', 'Pesca'),
    param: [
      ATTESA(300, T('Attesa fra due lanci, a testa', 'Wait between two casts, each', 'Espera entre dos lances, cada uno')),
      { k: 'pescato', tipo: 'tabella', def: PESCATO, max: 30, eti: T('Cosa si pesca: nome | monete | rarità', 'What can be caught: name | coins | rarity', 'Qué se pesca: nombre | monedas | rareza') },
    ],
    resa: { tipo: 'tabella', tabella: 'pescato', attesa: 'attesa' },
  },
  {
    id: 'duello', nome: T('Duello', 'Duel', 'Duelo'),
    param: [
      { k: 'premio', tipo: 'monete', def: 0, min: 0, max: 100000, eti: T('Premio del duello senza posta', 'Prize of a duel without stake', 'Premio del duelo sin apuesta'), vecchio: { punti: 'duello', era: 15 } },
      { k: 'attesa', tipo: 'secondi', def: 15, min: 1, max: 3600, eti: T('Attesa fra due duelli, in tutto il canale', 'Wait between two duels, channel-wide', 'Espera entre dos duelos, en todo el canal') },
      { k: 'postaMax', tipo: 'monete', def: 0, min: 0, max: 1000000, eti: T('Posta massima di un duello (0 = nessun limite)', 'Maximum duel stake (0 = no limit)', 'Apuesta máxima de un duelo (0 = sin límite)') },
      { k: 'scadenza', tipo: 'secondi', def: 60, min: 15, max: 600, eti: T('Tempo per accettare una sfida con posta', 'Time to accept a staked challenge', 'Tiempo para aceptar un reto con apuesta') },
      { k: 'esiti', tipo: 'elenco', def: DUELLO, max: 30, lungo: 200, segnaposto: ['a', 'b'], eti: T('Come va a finire: {a} vince, {b} perde', 'How it ends: {a} wins, {b} loses', 'Cómo termina: {a} gana, {b} pierde') },
    ],
    resa: { tipo: 'crea', premio: 'premio', attesa: 'attesa' },
  },
  {
    id: 'furto', nome: T('Furto', 'Heist', 'Robo'),
    param: [
      { k: 'riuscita', tipo: 'percento', def: 45, min: 0, max: 100, eti: T('Quante volte su cento riesce', 'How many times out of a hundred it works', 'Cuántas veces de cada cien sale bien') },
      { k: 'bottino', tipo: 'monete', def: 150, min: 10, max: 100000, eti: T('Bottino massimo', 'Maximum loot', 'Botín máximo') },
      { k: 'multa', tipo: 'monete', def: 60, min: 0, max: 100000, eti: T('Multa massima se ti beccano', 'Maximum fine if caught', 'Multa máxima si te pillan') },
      ATTESA(45),
    ],
    resa: { tipo: 'passa' },
  },
  {
    id: 'manche', nome: T('Manche', 'Rounds', 'Rondas'),
    param: [
      { k: 'premio', tipo: 'monete', def: 25, min: 0, max: 100000, eti: T('Premio a chi risponde per primo', 'Prize for the first right answer', 'Premio para quien responde primero'), vecchio: { punti: 'trivia', era: 25 } },
      { k: 'tipi', tipo: 'scelte', def: MANCHE_TIPI.map(([id]) => id), scelte: MANCHE_TIPI, eti: T('Nel giro delle manche automatiche', 'In the automatic rounds rotation', 'En la rotación de rondas automáticas') },
    ],
    resa: { tipo: 'manche', premio: 'premio' },
  },
  {
    id: '8ball', nome: T('Palla magica', 'Magic 8-ball', 'Bola mágica'),
    param: [
      ATTESA(3),
      { k: 'risposte', tipo: 'elenco', def: OTTO, max: 40, lungo: 120, segnaposto: [], eti: T('Le risposte', 'The answers', 'Las respuestas') },
    ],
    resa: null,
  },
  {
    id: 'sblocca', nome: T('Sblocca la chat', 'Unlock the chat', 'Desbloquea el chat'),
    param: [
      { k: 'modo', tipo: 'scelta', def: 'emote', scelte: [['emote', T('solo emote', 'emote-only', 'solo emotes')], ['unici', T('messaggi unici', 'unique chat', 'mensajes únicos')]], eti: T('Cosa si sblocca', 'What gets unlocked', 'Qué se desbloquea') },
      { k: 'costoMinuto', tipo: 'monete', def: 50, min: 1, max: 100000, eti: T('Costo di ogni minuto', 'Cost of each minute', 'Coste de cada minuto') },
      { k: 'minuti', tipo: 'numero', def: 2, min: 1, max: 60, eti: T('Minuti se non se ne dicono', 'Minutes if none are given', 'Minutos si no se dicen') },
      { k: 'massimo', tipo: 'numero', def: 10, min: 1, max: 60, eti: T('Minuti al massimo', 'Maximum minutes', 'Minutos como máximo') },
      { k: 'attesa', tipo: 'secondi', def: 600, min: 0, max: 86400, eti: T('Attesa fra due sblocchi, in tutto il canale', 'Wait between two unlocks, channel-wide', 'Espera entre dos desbloqueos, en todo el canal') },
    ],
    resa: { tipo: 'spesa' },
  },
  {
    id: 'morra', nome: T('Morra cinese', 'Rock paper scissors', 'Piedra, papel o tijera'),
    param: [
      { k: 'vincita', tipo: 'numero', def: 200, min: 100, max: 1000, eti: T('Se vinci, ogni 100 puntate ne tornano (200 = il doppio)', 'If you win, every 100 bet returns (200 = double)', 'Si ganas, por cada 100 apostadas vuelven (200 = el doble)') },
      { k: 'massimo', tipo: 'monete', def: 0, min: 0, max: 1000000, eti: T('Puntata massima (0 = nessun limite)', 'Maximum bet (0 = no limit)', 'Apuesta máxima (0 = sin límite)') },
      ATTESA(5),
    ],
    resa: { tipo: 'puntata', costo: 100, esiti: [[1 / 3, ['vincita', 1]], [1 / 3, 100]] },
  },
  { id: 'dado', nome: T('Dado', 'Dice', 'Dado'), param: [ATTESA(3)], resa: null },
  { id: 'moneta', nome: T('Testa o croce', 'Heads or tails', 'Cara o cruz'), param: [ATTESA(3)], resa: null },
];

const PER_ID = new Map(CATALOGO.map((g) => [g.id, g]));
export const giocoDi = (id) => PER_ID.get(id) || null;

// ── normalizzazione ──────────────────────────────────────────────────────

const intero = (v, p) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(p.max, Math.max(p.min, n));
};

// Un segnaposto che il gioco non riempie lascerebbe «{c}» in chat: una riga
// cosi' non passa (il motore, con `riempi`, lancerebbe).
export function segnapostoIgnoti(riga, ammessi = []) {
  return [...String(riga).matchAll(/\{([a-z0-9_]+)\}/gi)].map((m) => m[1]).filter((x) => !ammessi.includes(x));
}

function elenco(v, p) {
  const righe = (Array.isArray(v) ? v : String(v || '').split('\n'))
    .map((r) => String(r).trim().slice(0, p.lungo || 200))
    .filter((r) => r && !segnapostoIgnoti(r, p.segnaposto).length);
  return righe.length ? righe.slice(0, p.max) : null;
}

// Una riga del pescato: «nome | monete | rarita'». Le monete da 0, la rarita'
// da 1: una rarita' 0 sarebbe un pesce che non esce mai, cioe' una riga finta.
export function rigaTabella(r) {
  const [nome, monete, peso] = Array.isArray(r) ? r : String(r).split('|').map((x) => x.trim());
  const n = String(nome || '').trim().slice(0, 80);
  const v = Math.round(Number(monete));
  const w = Math.round(Number(peso));
  if (!n || !Number.isFinite(v) || v < 0 || v > 1000000 || !Number.isFinite(w) || w < 1 || w > 1000) return null;
  return [n, v, w];
}

function tabella(v, p) {
  const righe = (Array.isArray(v) ? v : String(v || '').split('\n')).map(rigaTabella).filter(Boolean);
  return righe.length ? righe.slice(0, p.max) : null;
}

function valore(p, v) {
  if (v === undefined || v === null) return null;
  if (p.tipo === 'elenco') return elenco(v, p);
  if (p.tipo === 'tabella') return tabella(v, p);
  if (p.tipo === 'scelta') return p.scelte.some(([id]) => id === v) ? v : null;
  if (p.tipo === 'scelte') {
    // Almeno una: un giro senza manche e' un interruttore spento travestito,
    // e l'interruttore c'e' gia'.
    const ok = (Array.isArray(v) ? v : []).filter((x) => p.scelte.some(([id]) => id === x));
    return ok.length ? [...new Set(ok)] : null;
  }
  return intero(v, p);
}

// Quello che arriva dal pannello, gioco per gioco. Un valore storto non
// azzera il gioco: si tiene quello di prima. Un gioco che non arriva non si
// tocca.
export function normalizzaConf(prima = {}, arrivato = {}) {
  const out = { ...(prima && typeof prima === 'object' ? prima : {}) };
  for (const g of CATALOGO) {
    const a = arrivato?.[g.id];
    if (!a || typeof a !== 'object') continue;
    const cur = { ...(out[g.id] || {}) };
    for (const p of g.param) {
      if (!(p.k in a)) continue;
      const v = valore(p, a[p.k]);
      if (v !== null) cur[p.k] = v;
    }
    out[g.id] = cur;
  }
  return out;
}

// ── lettura ──────────────────────────────────────────────────────────────

function vecchioDi(p, settings) {
  if (!p.vecchio) return undefined;
  const v = settings?.punti?.[p.vecchio.punti];
  if (v === undefined || v === null || Number(v) === p.vecchio.era) return undefined;
  return v;
}

// I valori di un gioco per un canale: quello scelto nel pannello, poi quello
// scelto nel vecchio pannello dei punti, poi il predefinito.
export function valoriDi(settings, id) {
  const g = giocoDi(id);
  if (!g) return {};
  const scelto = settings?.giochiConf?.[id] || {};
  const out = {};
  for (const p of g.param) {
    const v = valore(p, scelto[p.k]) ?? valore(p, vecchioDi(p, settings));
    out[p.k] = v ?? (Array.isArray(p.def) ? p.def.map((x) => (Array.isArray(x) ? [...x] : x)) : p.def);
  }
  return out;
}

// ── la resa ──────────────────────────────────────────────────────────────
//
// Una funzione sola, per tutti i giochi. Le forme:
//   puntata  su 100 monete giocate, quante ne tornano in media
//   tabella  quante ne rende in media un lancio, e in un'ora al ritmo massimo
//   crea     quante ne crea al massimo in un'ora, nel canale
//   manche   quante ne crea al massimo in un'ora, al ritmo delle manche
//   passa    le monete passano di tasca, non se ne creano
//   spesa    le monete escono dall'economia: e' un modo di spenderle
// `contesto` porta quello che non sta nel gioco: la presenza oraria e ogni
// quanti minuti al minimo parte una manche.
function importo(expr, v) {
  if (typeof expr === 'number') return expr;
  const [k, f] = expr;
  const base = Number(v[k]) || 0;
  return f === 1 ? base : Math.round(base * f);
}

export function valutaResa(resa, v, contesto = {}) {
  if (!resa) return null;
  if (resa.tipo === 'puntata') {
    const costo = typeof resa.costo === 'number' ? resa.costo : Number(v[resa.costo]) || 0;
    if (!costo) return { tipo: 'puntata', perCento: 0 };
    const media = resa.esiti.reduce((s, [p, e]) => s + p * importo(e, v), 0);
    return { tipo: 'puntata', perCento: Math.round((media / costo) * 1000) / 10 };
  }
  if (resa.tipo === 'tabella') {
    const t = v[resa.tabella] || [];
    const pesi = t.reduce((s, r) => s + r[2], 0);
    const media = pesi ? t.reduce((s, r) => s + r[1] * r[2], 0) / pesi : 0;
    const attesa = Number(v[resa.attesa]) || 1;
    return { tipo: 'tabella', media: Math.round(media * 10) / 10, perOra: Math.round(media * 3600 / attesa) };
  }
  if (resa.tipo === 'crea') {
    const attesa = Number(v[resa.attesa]) || 1;
    return { tipo: 'crea', perOra: Math.round((Number(v[resa.premio]) || 0) * 3600 / attesa) };
  }
  if (resa.tipo === 'manche') {
    const ogni = Number(contesto.mancheMinuti) || 0;
    return { tipo: 'manche', perOra: ogni ? Math.round((Number(v[resa.premio]) || 0) * 60 / ogni) : 0 };
  }
  return { tipo: resa.tipo };
}

export function presenzaOraria(punti = {}) {
  const pres = Number(punti.perPresenza ?? 5) || 0;
  const att = Number(punti.perAttivita ?? 5) || 0;
  return (pres + att) * PRESENZA_GIRI_ORA;
}

// Il catalogo come lo riceve il pannello: niente funzioni, solo dati.
export function catalogoPerPannello(settings = {}) {
  const contesto = { mancheMinuti: settings?.manche?.minMin || 15, presenzaOraria: presenzaOraria(settings?.punti) };
  return {
    contesto,
    giochi: CATALOGO.map((g) => {
      const valori = valoriDi(settings, g.id);
      return {
        id: g.id, nome: g.nome, resa: g.resa,
        param: g.param.map(({ vecchio, ...p }) => p),
        valori,
        resaOra: valutaResa(g.resa, valori, contesto),
      };
    }),
  };
}
