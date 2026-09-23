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

const ABBRACCI = [
  '🤗 {a} abbraccia forte {b}!',
  '🤗 {a} stritola {b} in un abbraccio da orso!',
  '🤗 {a} corre ad abbracciare {b}!',
  '🤗 {a} e {b}, stretti stretti.',
];
const ABBRACCI_TUTTI = ['🤗 {a} abbraccia tutta la chat!', '🤗 {a} apre le braccia: abbraccio collettivo!'];
const BACI = [
  '😘 {a} manda un bacino a {b}!',
  '😘 {a} schiocca un bacio sulla guancia di {b}!',
  '💋 Bacino volante da {a} per {b}!',
];
const BACI_TUTTI = ['😘 {a} manda baci a tutta la chat!'];
const CINQUE_PERFETTO = [
  '💥 CIAK! {a} e {b}: cinque perfetto, schiocco da manuale!',
  '💥 {a} e {b} si guardano il gomito e... SCHIOCCO PERFETTO!',
  '💥 Tempismo perfetto: il cinque di {a} e {b} si sente fino in fondo alla chat!',
];
const CINQUE_NORMALE = ['🙌 {a} e {b} battono il cinque!', '🙌 Cinque fra {a} e {b}!'];
const CINQUE_MOSCIO = ['🫳 {a} e {b} battono un cinque un po\' moscio... ma vale lo stesso.', '🫳 Cinque in ritardo fra {a} e {b}: meglio tardi che mai.'];
const CINQUE_SOSPESO = ['🙋 {a} resta con la mano alzata... nessuno batte il cinque.', '🙋 La mano di {a} resta a mezz\'aria. Che freddo.'];

const COLPO_RIUSCITO = ['💰 Colpo riuscito! La banda scappa col bottino.', '💰 Il caveau si apre e la banda è già lontana.'];
const COLPO_FALLITO = ['🚨 Sirene! La banda finisce dentro al completo.', '🚨 L\'allarme suona subito: presi tutti.'];
const COLPO_META = ['💰 Colpo a metà: qualcuno scappa, qualcuno no.', '🚨 La banda si divide nella fuga: non tutti ce la fanno.'];
const BOSS = ['il Drago del Lag 🐉', 'la Piovra dello Spam 🐙', 'il Golem del Buffering 🗿', 'lo Scheletro del Ping Alto 💀', 'il Troll del Ritardo 👹', 'il Boss Finale 👾'];

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
    id: 'colpo', nome: T('Colpo di gruppo', 'Group heist', 'Golpe en grupo'),
    param: [
      { k: 'posta', tipo: 'monete', def: 50, min: 1, max: 100000, eti: T('Posta di chi entra senza dire quanto', 'Stake for whoever joins without saying how much', 'Apuesta de quien entra sin decir cuánto') },
      { k: 'massimo', tipo: 'monete', def: 0, min: 0, max: 1000000, eti: T('Posta massima (0 = nessun limite)', 'Maximum stake (0 = no limit)', 'Apuesta máxima (0 = sin límite)') },
      { k: 'raccolta', tipo: 'secondi', def: 60, min: 15, max: 600, eti: T('Tempo per entrare nella banda', 'Time to join the crew', 'Tiempo para entrar en la banda') },
      { k: 'minimo', tipo: 'numero', def: 2, min: 1, max: 50, eti: T('Persone che servono perché parta', 'People needed for it to start', 'Personas necesarias para que empiece') },
      { k: 'riuscita', tipo: 'percento', def: 35, min: 0, max: 100, eti: T('Quante volte su cento scappa chi lo fa da solo', 'How many times out of a hundred a lone robber escapes', 'Cuántas veces de cada cien escapa quien lo hace solo') },
      { k: 'perPersona', tipo: 'percento', def: 5, min: 0, max: 50, eti: T('Quanto aggiunge ogni persona in più', 'How much each extra person adds', 'Cuánto añade cada persona más') },
      { k: 'riuscitaMax', tipo: 'percento', def: 60, min: 0, max: 100, eti: T('Mai più di tante volte su cento', 'Never more than this many times out of a hundred', 'Nunca más de tantas veces de cada cien') },
      { k: 'vincita', tipo: 'numero', def: 160, min: 100, max: 1000, eti: T('Chi scappa, ogni 100 di posta ne riprende (160 = +60%)', 'Whoever escapes gets back, for every 100 staked (160 = +60%)', 'Quien escapa recupera, por cada 100 apostadas (160 = +60%)') },
      { k: 'attesa', tipo: 'secondi', def: 300, min: 1, max: 86400, eti: T('Attesa fra due colpi, in tutto il canale', 'Wait between two heists, channel-wide', 'Espera entre dos golpes, en todo el canal') },
      { k: 'riuscito', tipo: 'elenco', def: COLPO_RIUSCITO, max: 20, lungo: 200, segnaposto: [], eti: T('Se scappano tutti', 'If everyone escapes', 'Si escapan todos') },
      { k: 'fallito', tipo: 'elenco', def: COLPO_FALLITO, max: 20, lungo: 200, segnaposto: [], eti: T('Se li prendono tutti', 'If everyone is caught', 'Si los pillan a todos') },
      { k: 'meta', tipo: 'elenco', def: COLPO_META, max: 20, lungo: 200, segnaposto: [], eti: T('Se va a metà', 'If it goes halfway', 'Si sale a medias') },
    ],
    resa: { tipo: 'colpo' },
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
    id: 'boss', nome: T('Boss da battere insieme', 'Boss to beat together', 'Jefe para vencer juntos'),
    param: [
      { k: 'vitaPerPersona', tipo: 'numero', def: 60, min: 10, max: 10000, eti: T('Punti vita per ogni persona che scrive in chat', 'Health points for each person writing in chat', 'Puntos de vida por cada persona que escribe en el chat') },
      { k: 'minimo', tipo: 'numero', def: 3, min: 1, max: 100, eti: T('Contando almeno tante persone', 'Counting at least this many people', 'Contando al menos tantas personas') },
      { k: 'dannoMin', tipo: 'numero', def: 5, min: 1, max: 10000, eti: T('Danno di un colpo, da', 'Damage of a hit, from', 'Daño de un golpe, desde') },
      { k: 'dannoMax', tipo: 'numero', def: 15, min: 1, max: 10000, eti: T('Danno di un colpo, fino a', 'Damage of a hit, up to', 'Daño de un golpe, hasta') },
      ATTESA(5, T('Attesa fra due colpi, a testa', 'Wait between two hits, each', 'Espera entre dos golpes, cada uno')),
      { k: 'durata', tipo: 'secondi', def: 90, min: 20, max: 600, eti: T('Tempo per batterlo', 'Time to beat it', 'Tiempo para vencerlo') },
      { k: 'bottino', tipo: 'monete', def: 20, min: 0, max: 100000, eti: T('Bottino a testa se cade: chi colpisce di più prende di più', 'Loot per person if it falls: whoever hits more gets more', 'Botín por cabeza si cae: quien golpea más se lleva más') },
      { k: 'ogni', tipo: 'numero', def: 0, min: 0, max: 360, eti: T('Arriva da solo in diretta ogni tanti minuti (0 = solo con !boss)', 'Comes on its own while live every this many minutes (0 = only with !boss)', 'Llega solo en directo cada tantos minutos (0 = solo con !boss)') },
      { k: 'dopoRaid', tipo: 'numero', def: 10, min: 0, max: 100000, eti: T('Arriva con un raid di almeno tante persone (0 = mai)', 'Comes with a raid of at least this many people (0 = never)', 'Llega con un raid de al menos tantas personas (0 = nunca)') },
      { k: 'festa', tipo: 'numero', def: 0, min: 0, max: 10, eti: T('Se cade, minuti di festa in solo emote (0 = niente festa)', 'If it falls, minutes of emote-only party (0 = no party)', 'Si cae, minutos de fiesta en solo emotes (0 = sin fiesta)') },
      { k: 'nomi', tipo: 'elenco', def: BOSS, max: 30, lungo: 80, segnaposto: [], eti: T('I boss', 'The bosses', 'Los jefes') },
    ],
    resa: { tipo: 'boss' },
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
  {
    id: 'abbraccio', nome: T('Abbracci', 'Hugs', 'Abrazos'),
    param: [
      ATTESA(10),
      { k: 'frasi', tipo: 'elenco', def: ABBRACCI, max: 30, lungo: 200, segnaposto: ['a', 'b'], eti: T('Come si abbraccia: {a} abbraccia {b}', 'How a hug goes: {a} hugs {b}', 'Cómo se abraza: {a} abraza a {b}') },
      { k: 'tutti', tipo: 'elenco', def: ABBRACCI_TUTTI, max: 20, lungo: 200, segnaposto: ['a'], eti: T('Senza nome, a tutta la chat: {a} abbraccia', 'With no name, the whole chat: {a} hugs', 'Sin nombre, a todo el chat: {a} abraza') },
    ],
    resa: null,
  },
  {
    id: 'bacio', nome: T('Bacini', 'Kisses', 'Besitos'),
    param: [
      ATTESA(10),
      { k: 'frasi', tipo: 'elenco', def: BACI, max: 30, lungo: 200, segnaposto: ['a', 'b'], eti: T('Come si bacia: {a} manda un bacio a {b}', 'How a kiss goes: {a} kisses {b}', 'Cómo se besa: {a} besa a {b}') },
      { k: 'tutti', tipo: 'elenco', def: BACI_TUTTI, max: 20, lungo: 200, segnaposto: ['a'], eti: T('Senza nome, a tutta la chat: {a} manda baci', 'With no name, the whole chat: {a} sends kisses', 'Sin nombre, a todo el chat: {a} manda besos') },
    ],
    resa: null,
  },
  {
    id: 'cinque', nome: T('Batti il cinque', 'High five', 'Choca esos cinco'),
    param: [
      { k: 'perfetto', tipo: 'secondi', def: 4, min: 1, max: 15, eti: T('Chi risponde entro questi secondi fa il cinque perfetto', 'Answering within these seconds makes a perfect high five', 'Quien responde en estos segundos hace el cinco perfecto') },
      { k: 'pronto', tipo: 'secondi', def: 15, min: 1, max: 120, eti: T('Entro questi è un cinque normale; dopo, moscio', 'Within these it is a normal high five; after, a limp one', 'En estos es un cinco normal; después, flojo') },
      { k: 'scadenza', tipo: 'secondi', def: 30, min: 5, max: 300, eti: T('Dopo questi la mano resta alzata', 'After these the hand is left hanging', 'Tras estos la mano se queda en el aire') },
      ATTESA(5),
      { k: 'frasiPerfetto', tipo: 'elenco', def: CINQUE_PERFETTO, max: 20, lungo: 200, segnaposto: ['a', 'b'], eti: T('Il cinque perfetto: {a} alza, {b} batte', 'The perfect high five: {a} raises, {b} hits', 'El cinco perfecto: {a} levanta, {b} choca') },
      { k: 'frasiNormale', tipo: 'elenco', def: CINQUE_NORMALE, max: 20, lungo: 200, segnaposto: ['a', 'b'], eti: T('Il cinque normale', 'The normal high five', 'El cinco normal') },
      { k: 'frasiMoscio', tipo: 'elenco', def: CINQUE_MOSCIO, max: 20, lungo: 200, segnaposto: ['a', 'b'], eti: T('Il cinque moscio', 'The limp high five', 'El cinco flojo') },
      { k: 'frasiSospeso', tipo: 'elenco', def: CINQUE_SOSPESO, max: 20, lungo: 200, segnaposto: ['a'], eti: T('La mano rimasta alzata: {a}', 'The hand left hanging: {a}', 'La mano en el aire: {a}') },
    ],
    resa: null,
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
  if (resa.tipo === 'colpo') {
    // La banda piu' grande e' quella che rende di piu': con chi aggiunge
    // qualcosa la riuscita sale fino al tetto, senza resta quella di partenza.
    const p = Math.min(Number(v.riuscitaMax) || 0, Number(v.perPersona) > 0 ? 100 : Number(v.riuscita) || 0);
    return { tipo: 'colpo', perCento: Math.round(p * (Number(v.vincita) || 0) / 10) / 10 };
  }
  if (resa.tipo === 'boss') {
    // Il massimo di una persona sola: un colpo appena puo', per tutto il
    // tempo, sempre col danno piu' alto. Il bottino va a danno fatto.
    const colpi = Math.floor((Number(v.durata) || 0) / Math.max(1, Number(v.attesa) || 1)) + 1;
    const danno = Math.max(Number(v.dannoMin) || 0, Number(v.dannoMax) || 0);
    const massimo = Math.round((Number(v.bottino) || 0) * colpi * danno / Math.max(1, Number(v.vitaPerPersona) || 1));
    const ogni = Number(v.ogni) || 0;
    return { tipo: 'boss', massimo, ogni, perOra: ogni ? Math.round(massimo * 60 / ogni) : 0 };
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
