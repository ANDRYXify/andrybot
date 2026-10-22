// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I LANCI E GLI ADESIVI (docs/LANCI.md): il catalogo, e l'unica fonte di come
// si comportano. Il server risolve qui tutto quello che serve e lo manda nel
// payload; l'overlay (public/lanci.js) lo esegue senza un catalogo suo.
//
// Niente disegnato da noi: ogni immagine, animazione e suono viene da un
// artista (Fluent Emoji di Microsoft, Noto Emoji Animation di Google, Kenney,
// OpenGameArt), e sta in public/vendor/lanci con la sua licenza. Ogni voce ha
// il suo disegno salvato grande quanto si vede in un quadro 1920×1080 a
// grandezza 100 (`lato` px sul lato lungo): la misura sta nel file, e pagina
// dei colpi e overlay la leggono da li'.

export const BASE = '/vendor/lanci';

export const LIBRERIE = Object.freeze([
  { id: 'cibo', nome: ['Cibo', 'Food', 'Comida'] },
  { id: 'oggetti', nome: ['Oggetti', 'Objects', 'Objetos'] },
  { id: 'botti', nome: ['Botti e acqua', 'Bangs and water', 'Petardos y agua'] },
  { id: 'feste', nome: ['Feste e affetto', 'Party and love', 'Fiesta y cariño'] },
  { id: 'adesivi', nome: ['Adesivi animati', 'Animated stickers', 'Pegatinas animadas'] },
  { id: 'spaventi', nome: ['Spaventi', 'Jumpscares', 'Sustos'] },
]);

export const MATERIALI = Object.freeze(['spiaccica', 'spruzza', 'rimbalza', 'esplode', 'scoppia', 'stampa', 'appare']);

// Le animazioni Noto (Lottie, CC BY 4.0) che fanno da impatto: il codice
// dell'emoji e il tratto da suonare (fotogrammi, a 60 al secondo).
export const IMPATTI = Object.freeze({
  scoppio: { noto: '1f4a5', da: 0, a: 40 },
  splash: { noto: '1f4a7', da: 26, a: 72 },
  coriandoli: { noto: '1f38a', da: 44, a: 120 },
  bolle: { noto: '1fae7', da: 0, a: 140 },
});

// Le macchie (Kenney Splat Pack, CC0) e i fumi (Kenney Smoke Particles, CC0):
// tanti file, scelti dal seme del colpo.
export const MACCHIE = Object.freeze(['m00', 'm03', 'm06', 'm08', 'm10', 'm12', 'm15', 'm17', 'm19', 'm21', 'm24', 'm26', 'm28', 'm30', 'm32', 'm34']);
// la macchia tonda, per il tuorlo dell'uovo
export const TONDA = 'm12';
export const FUMI = Object.freeze(['f00', 'f04', 'f08', 'f12', 'f16', 'f20']);

// I suoni: Kenney Impact Sounds e OpenGameArt (CC0), in public/vendor/lanci/suoni.
export const SUONI = Object.freeze({
  tonfo: 'tonfo.ogg', morbido: 'morbido.ogg', schiaffo: 'schiaffo.ogg', legno: 'legno.ogg', vetro: 'vetro.ogg',
  metallo: 'metallo.ogg', piatto: 'piatto.ogg', splat: 'splat.ogg', squish: 'squish.ogg', pop: 'pop.ogg',
  botto: 'botto.ogg', petardo: 'petardo.ogg', boom: 'boom.ogg', urlo: 'urlo.ogg', strillo: 'strillo.ogg',
});

const L = (it, en, es) => [it, en, es];
// un lancio: un oggetto Fluent che vola e colpisce
const o = (id, libreria, nome, lato, materiale, suono, piu = {}) => Object.freeze({ id, libreria, nome, lato, materiale, suono, ...piu });
// un adesivo: un'animazione Noto che compare nel punto; uno spavento: grande, con l'urlo.
// `posa`: il punto dell'animazione (da 0 a 1) che fa da disegno fermo, nel
// pannello e nella pagina dei colpi; di serie il primo fotogramma, l'emoji com'e'.
const a = (id, noto, nome, piu = {}) => Object.freeze({ id, libreria: 'adesivi', nome, lato: 300, materiale: 'appare', suono: '', noto, posa: 0, ...piu });
const s = (id, noto, nome, suono, posa = 0) => Object.freeze({ id, libreria: 'spaventi', nome, lato: 820, materiale: 'appare', suono, noto, posa, spavento: true });

// l'acqua: una macchia azzurra trasparente sotto lo splash di Noto
const ACQUA = Object.freeze({ colori: ['#a6d8ff', '#5ea8e0'], velo: 0.5 });

export const CATALOGO = Object.freeze([
  // ── cibo ──
  o('pomodoro', 'cibo', L('Pomodoro', 'Tomato', 'Tomate'), 170, 'spiaccica', 'splat', { colori: ['#d8231c', '#8f0f0b'], cocci: true }),
  o('uovo', 'cibo', L('Uovo', 'Egg', 'Huevo'), 140, 'spiaccica', 'splat', { colori: ['#f7f1e1', '#d8cdb1'], tuorlo: '#f6a313', cocci: true }),
  o('torta', 'cibo', L('Torta in faccia', 'Pie in the face', 'Tarta en la cara'), 220, 'spiaccica', 'squish', { colori: ['#fff7ea', '#e3cfae'], cocci: true }),
  o('compleanno', 'cibo', L('Torta di compleanno', 'Birthday cake', 'Pastel de cumpleaños'), 220, 'spiaccica', 'squish', { colori: ['#ffd3de', '#e597ae'], cocci: true }),
  o('fragole', 'cibo', L('Fragole e panna', 'Strawberry shortcake', 'Fresas con nata'), 180, 'spiaccica', 'squish', { colori: ['#fffaf1', '#e7d6bd'], cocci: true }),
  o('gelato', 'cibo', L('Gelato', 'Ice cream', 'Helado'), 190, 'spiaccica', 'squish', { colori: ['#fff4e2', '#e4cca6'], cocci: true }),
  o('anguria', 'cibo', L('Anguria', 'Watermelon', 'Sandía'), 210, 'spiaccica', 'splat', { colori: ['#f2445b', '#a8192c'], cocci: true }),
  o('spaghetti', 'cibo', L('Spaghetti al sugo', 'Spaghetti', 'Espaguetis'), 200, 'spiaccica', 'splat', { colori: ['#c9361c', '#7a1a0c'], cocci: true }),
  o('pizza', 'cibo', L('Pizza', 'Pizza', 'Pizza'), 200, 'spiaccica', 'splat', { colori: ['#d93a1f', '#8c1e0e'], cocci: true }),
  o('cupcake', 'cibo', L('Cupcake', 'Cupcake', 'Cupcake'), 170, 'spiaccica', 'squish', { colori: ['#ff9fc4', '#d6679a'], cocci: true }),
  o('cacca', 'cibo', L('Cacca', 'Poo', 'Caca'), 180, 'spiaccica', 'squish', { colori: ['#6b4226', '#3a2213'] }),
  o('limone', 'cibo', L('Limone', 'Lemon', 'Limón'), 150, 'spiaccica', 'splat', { colori: ['#f7e64a', '#e0c21f'], velo: 0.6, cocci: true }),
  o('latte', 'cibo', L('Bicchiere di latte', 'Glass of milk', 'Vaso de leche'), 180, 'spiaccica', 'vetro', { colori: ['#fbfbf6', '#dcdcd2'], velo: 0.85, cocci: true }),
  o('caffe', 'cibo', L('Caffè', 'Coffee', 'Café'), 170, 'spiaccica', 'piatto', { colori: ['#6b3e1f', '#3b200e'], velo: 0.8, cocci: true }),
  o('ciambella', 'cibo', L('Ciambella', 'Doughnut', 'Dónut'), 170, 'rimbalza', 'morbido'),
  o('formaggio', 'cibo', L('Formaggio', 'Cheese', 'Queso'), 170, 'rimbalza', 'morbido'),
  o('banana', 'cibo', L('Banana', 'Banana', 'Plátano'), 180, 'rimbalza', 'morbido'),
  o('croissant', 'cibo', L('Cornetto', 'Croissant', 'Cruasán'), 180, 'rimbalza', 'morbido'),
  o('hamburger', 'cibo', L('Hamburger', 'Burger', 'Hamburguesa'), 190, 'rimbalza', 'morbido'),
  o('melanzana', 'cibo', L('Melanzana', 'Eggplant', 'Berenjena'), 190, 'rimbalza', 'morbido'),
  o('biscotto', 'cibo', L('Biscotto', 'Cookie', 'Galleta'), 150, 'rimbalza', 'legno'),
  o('popcorn', 'cibo', L('Popcorn', 'Popcorn', 'Palomitas'), 180, 'scoppia', 'pop', { pezzi: 'popcorn' }),

  // ── oggetti ──
  o('ciabatta', 'oggetti', L('Ciabatta', 'Flip-flop', 'Chancla'), 190, 'rimbalza', 'schiaffo'),
  o('scarpa', 'oggetti', L('Scarpa', 'Shoe', 'Zapato'), 200, 'rimbalza', 'tonfo'),
  o('cartaigienica', 'oggetti', L('Carta igienica', 'Toilet paper', 'Papel higiénico'), 170, 'rimbalza', 'morbido'),
  o('pallone', 'oggetti', L('Pallone', 'Football', 'Balón'), 170, 'rimbalza', 'tonfo', { elastico: true }),
  o('basket', 'oggetti', L('Palla da basket', 'Basketball', 'Balón de básquet'), 170, 'rimbalza', 'tonfo', { elastico: true }),
  o('orsacchiotto', 'oggetti', L('Orsacchiotto', 'Teddy bear', 'Osito'), 210, 'rimbalza', 'morbido'),
  o('moneta', 'oggetti', L('Moneta', 'Coin', 'Moneda'), 120, 'rimbalza', 'metallo'),
  o('sasso', 'oggetti', L('Sasso', 'Rock', 'Piedra'), 160, 'rimbalza', 'tonfo'),
  o('mattone', 'oggetti', L('Mattone', 'Brick', 'Ladrillo'), 200, 'rimbalza', 'tonfo'),
  o('ghiaccio', 'oggetti', L('Cubetto di ghiaccio', 'Ice cube', 'Cubito de hielo'), 140, 'rimbalza', 'vetro'),
  o('spugna', 'oggetti', L('Spugna bagnata', 'Wet sponge', 'Esponja mojada'), 170, 'spruzza', 'squish', ACQUA),
  o('soldi', 'oggetti', L('Sacco di soldi', 'Money bag', 'Saco de dinero'), 210, 'scoppia', 'metallo', { pezzi: 'moneta' }),
  o('corona', 'oggetti', L('Corona', 'Crown', 'Corona'), 190, 'stampa', 'metallo'),
  o('pesce', 'oggetti', L('Pesce in faccia', 'Fish slap', 'Pescado en la cara'), 210, 'rimbalza', 'schiaffo'),
  o('polpo', 'oggetti', L('Polpo (inchiostro)', 'Octopus (ink)', 'Pulpo (tinta)'), 200, 'spiaccica', 'squish', { colori: ['#1d1730', '#05040a'] }),
  o('pollo', 'oggetti', L('Gallina', 'Chicken', 'Gallina'), 200, 'rimbalza', 'morbido'),

  // ── botti e acqua ──
  o('bomba', 'botti', L('Bomba', 'Bomb', 'Bomba'), 190, 'esplode', 'botto'),
  o('petardo', 'botti', L('Petardo', 'Firecracker', 'Petardo'), 170, 'esplode', 'petardo', { piccolo: true }),
  o('gavettone', 'botti', L('Gavettone', 'Water balloon', 'Globo de agua'), 190, 'spruzza', 'splat', { ...ACQUA, cocci: true }),
  o('secchiata', 'botti', L('Secchiata d\'acqua', 'Bucket of water', 'Cubo de agua'), 230, 'spruzza', 'squish', { ...ACQUA, grande: true }),
  o('bolle', 'botti', L('Bolle di sapone', 'Soap bubbles', 'Pompas de jabón'), 180, 'scoppia', 'pop', { impatto: 'bolle' }),

  // ── feste e affetto ──
  o('cuore', 'feste', L('Cuore', 'Heart', 'Corazón'), 170, 'scoppia', 'pop', { pezzi: 'cuore' }),
  o('bacio', 'feste', L('Bacio', 'Kiss', 'Beso'), 170, 'stampa', 'morbido'),
  o('rosa', 'feste', L('Rosa', 'Rose', 'Rosa'), 190, 'rimbalza', 'morbido'),
  o('fiori', 'feste', L('Mazzo di fiori', 'Bouquet', 'Ramo de flores'), 210, 'rimbalza', 'morbido'),
  o('regalo', 'feste', L('Regalo', 'Gift', 'Regalo'), 200, 'scoppia', 'pop', { impatto: 'coriandoli' }),
  o('coriandoli', 'feste', L('Coriandoli', 'Confetti', 'Confeti'), 180, 'scoppia', 'pop', { impatto: 'coriandoli' }),
  o('leccalecca', 'feste', L('Lecca-lecca', 'Lollipop', 'Piruleta'), 170, 'rimbalza', 'legno'),
  o('fantasma', 'feste', L('Fantasma', 'Ghost', 'Fantasma'), 200, 'stampa', 'morbido'),

  // ── adesivi animati ──
  a('risata', '1f602', L('Risata', 'Tears of joy', 'Risa')),
  a('rotolo', '1f923', L('Rotolo dal ridere', 'Rolling on the floor', 'Revolcándose de risa')),
  a('piango', '1f62d', L('Piango', 'Loudly crying', 'Llorando'), { posa: 0.5 }),
  a('clown', '1f921', L('Clown', 'Clown', 'Payaso')),
  a('teschio', '1f480', L('Morto dal ridere', 'I\'m dead', 'Me muero')),
  a('mente', '1f92f', L('Mente esplosa', 'Mind blown', 'Mente explotada'), { suono: 'boom', posa: 0.22 }),
  a('fuoco', '1f525', L('Fuoco', 'Fire', 'Fuego')),
  a('cento', '1f4af', L('Cento', 'One hundred', 'Cien')),
  a('applausi', '1f44f', L('Applausi', 'Clapping', 'Aplausos')),
  a('festa', '1f973', L('Festa', 'Party face', 'Fiesta')),
  a('saluto', '1fae1', L('Saluto', 'Salute', 'Saludo')),
  a('soldivolano', '1f4b8', L('Soldi che volano', 'Money flying away', 'Dinero volando')),
  a('popcornvisto', '1f37f', L('Popcorn', 'Popcorn time', 'Palomitas')),
  a('scimmietta', '1f648', L('Non guardo', 'See no evil', 'No veo nada')),
  a('cuorefuoco', '2764_fe0f_200d_1f525', L('Cuore in fiamme', 'Heart on fire', 'Corazón en llamas')),
  a('congelato', '1f976', L('Congelato', 'Freezing', 'Congelado')),
  a('sciolto', '1fae0', L('Mi sciolgo', 'Melting', 'Derritiéndome')),
  a('furioso', '1f92c', L('Furioso', 'Cursing', 'Furioso'), { posa: 0.45 }),
  a('diavoletto', '1f608', L('Diavoletto', 'Little devil', 'Diablillo'), { posa: 0.5 }),
  a('figo', '1f60e', L('Figo', 'Cool', 'Guay')),
  a('machevuoi', '1f90c', L('Ma che vuoi?', 'What do you want?', '¿Pero qué quieres?')),
  a('occhi', '1f440', L('Occhi', 'Eyes', 'Ojos')),
  a('moai', '1f5ff', L('Moai', 'Moai', 'Moái')),
  a('capra', '1f410', L('Il GOAT', 'The GOAT', 'El GOAT')),
  a('fulmine', '26a1', L('Fulmine', 'Lightning', 'Rayo'), { suono: 'boom' }),
  a('coppa', '1f3c6', L('Coppa', 'Trophy', 'Copa')),
  a('stelle', '1f929', L('Occhi a stella', 'Star-struck', 'Deslumbrado')),
  a('bacione', '1f618', L('Bacione', 'Blowing a kiss', 'Besito'), { posa: 0.55 }),
  a('cuorerotto', '1f494', L('Cuore spezzato', 'Broken heart', 'Corazón roto'), { posa: 0.18 }),
  a('sbadiglio', '1f971', L('Sbadiglio', 'Yawn', 'Bostezo'), { posa: 0.35 }),
  a('bombacoriandoli', '1f4a3', L('Bomba di coriandoli', 'Confetti bomb', 'Bomba de confeti'), { suono: 'petardo', posa: 0.2 }),

  // ── spaventi ──
  s('urlo', '1f631', L('Urlo', 'Scream', 'Grito'), 'urlo', 0.5),
  s('fantasmone', '1f47b', L('Fantasma', 'Ghost', 'Fantasma'), 'strillo'),
  s('teschione', '1f480', L('Teschio', 'Skull', 'Calavera'), 'urlo'),
  s('alieno', '1f47d', L('Alieno', 'Alien', 'Alienígena'), 'strillo'),
]);

const PER_ID = new Map(CATALOGO.map((x) => [x.id, x]));
export const oggettoDi = (id) => PER_ID.get(String(id || '')) || null;

// Quanto resta il segno, per materiale (secondi).
export const RESTA = Object.freeze({ spiaccica: 6, spruzza: 2.5, rimbalza: 0, esplode: 4, scoppia: 0, stampa: 4, appare: 0 });
// il volo e quello che succede dopo l'impatto, prima che la coda passi oltre
export const VOLO_MS = 650;
export const DOPO_MS = 450;
export const PASSO_RAFFICA_MS = 140;
// quanto tiene la coda un adesivo (uno spavento un po' di piu')
export const SCENA_MS = 2200;
export const SPAVENTO_MS = 2600;

// Dove sta il disegno di una voce, e la sua animazione Noto se ne ha una.
export const disegnoDi = (x) => `${BASE}/${x.materiale === 'appare' ? 'noto' : 'oggetti'}/${x.id}.webp`;
export const animazioneDi = (noto) => `${BASE}/noto/${noto}.json`;

// I parametri di un effetto salvato (colonna `disegno` di un effetto di tipo
// 'lancio'): quale voce, quanti in raffica, quanto resta il segno, il suono
// (quello di serie, nessuno, o `audio`: il comando di un suono caricato dallo
// streamer, che il server risolve nel suo indirizzo).
export function normLancio(grezzo) {
  const g = grezzo && typeof grezzo === 'object' ? grezzo : {};
  const ogg = oggettoDi(g.oggetto) || CATALOGO[0];
  const quanti = ogg.materiale === 'appare' ? 1 : Math.max(1, Math.min(5, Math.round(Number(g.quanti)) || 1));
  const r = Number(g.resta);
  const resta = Number.isFinite(r) ? Math.max(0, Math.min(15, Math.round(r * 2) / 2)) : RESTA[ogg.materiale];
  const audio = /^[a-z0-9_]{1,32}$/.test(String(g.audio || '')) ? String(g.audio) : '';
  return { oggetto: ogg.id, quanti, resta, suono: g.suono !== false, audio };
}

// Quanto tiene la coda degli effetti: un lancio fino a poco dopo l'impatto
// dell'ultimo della raffica (il segno sfuma per conto suo); un adesivo il
// tempo della sua scena.
export function durataLancio(l) {
  const x = oggettoDi(l.oggetto);
  if (x?.materiale === 'appare') return x.spavento ? SPAVENTO_MS : SCENA_MS;
  return VOLO_MS + (l.quanti - 1) * PASSO_RAFFICA_MS + DOPO_MS;
}

// Il payload per l'overlay: la voce risolta per intero.
export function payloadLancio(grezzo) {
  const l = normLancio(grezzo);
  const x = oggettoDi(l.oggetto);
  const suono = (k) => (k && SUONI[k] ? `${BASE}/suoni/${SUONI[k]}` : '');
  const imp = x.impatto ? IMPATTI[x.impatto]
    : x.materiale === 'rimbalza' || x.materiale === 'esplode' ? IMPATTI.scoppio
      : x.materiale === 'spruzza' ? IMPATTI.splash : null;
  return {
    oggetto: x.id, nome: x.nome[0], materiale: x.materiale, sprite: disegnoDi(x),
    animazione: x.noto ? animazioneDi(x.noto) : '',
    impatto: imp ? { url: animazioneDi(imp.noto), da: imp.da, a: imp.a } : null,
    colori: x.colori || [], tuorlo: x.tuorlo ? { colore: x.tuorlo, macchia: `${BASE}/macchie/${TONDA}.webp` } : null, velo: Number(x.velo) || 1, cocci: !!x.cocci,
    pezzi: x.pezzi ? `${BASE}/oggetti/${x.pezzi}.webp` : '', elastico: !!x.elastico, piccolo: !!x.piccolo, grande: !!x.grande,
    spavento: !!x.spavento, posa: x.spavento ? x.posa || 0 : 0,
    macchie: x.materiale === 'spiaccica' || x.materiale === 'spruzza' ? MACCHIE.map((m) => `${BASE}/macchie/${m}.webp`) : [],
    fumi: x.materiale === 'esplode' ? FUMI.map((m) => `${BASE}/fumo/${m}.webp`) : [],
    bruciatura: x.materiale === 'esplode' ? `${BASE}/fumo/bruciatura.webp` : '',
    quanti: l.quanti, resta: l.resta,
    suono: l.suono ? suono(x.suono) : '', audio: l.suono ? l.audio : '',
  };
}

export const CREDITI = 'Fluent Emoji © Microsoft (MIT) · Noto Emoji Animation © Google (CC BY 4.0) · Kenney (CC0) · OpenGameArt: EZduzziteh, WuxiaScrub (CC0) · lottie-web (MIT)';

// Il catalogo come lo legge il pannello (GET /api/lanci): le librerie, e per
// ogni voce i nomi nelle tre lingue, il disegno e il payload completo, cosi'
// l'anteprima anima esattamente quello che vedra' l'overlay. Lo servono il
// server e il sito dei collaudi, dalla stessa funzione.
export function catalogoPubblico() {
  return {
    librerie: LIBRERIE.map((b) => ({ id: b.id, nome: b.nome })),
    oggetti: CATALOGO.map((x) => ({ id: x.id, libreria: x.libreria, nome: x.nome, materiale: x.materiale, sprite: disegnoDi(x), lancio: payloadLancio({ oggetto: x.id }) })),
    crediti: CREDITI,
  };
}
