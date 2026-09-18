// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LO STILE DELL'OVERLAY — la sola porta da cui passa.
//
// Qui vivono gli elenchi dei valori ammessi e le normalizzazioni che il server
// applica prima di salvare. Stanno in un modulo a parte per una ragione precisa:
// un campo che il browser scrive ma che qui non è elencato viene buttato via IN
// SILENZIO — e il difetto si vede solo come «l'overlay non salva niente». Da
// modulo, il contratto browser↔server si può provare per davvero (test/contratto),
// non solo confrontando testo.

// Id dei suoni PRESET sintetizzati (deve combaciare con public/presets.js).
export const SUONI_PRESET = new Set(['campanello', 'campana', 'acqua', 'moneta', 'tamburo',
  'trombetta', 'errore', 'tada', 'pop', 'whoosh', 'applausi', 'laser', 'salita']);
// Font disponibili per l'overlay (deve combaciare con overlay-skin.css/overlay.html).
export const FONT_OVL = ['sistema', 'rotondo', 'condensato', 'mono', 'serif', 'manga'];
export const MIO_FONT = /^mio:[a-z0-9_-]{1,32}$/;
export const fontOvlOk = (x, def) => {
  const v = String(x || '');
  if (FONT_OVL.includes(v)) return v;
  return MIO_FONT.test(v) ? v : def;
};
// helper di validazione riusati dal "gestionale overlay"
export const clampInt = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
export const hexOk = (v, def) => (/^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : def);
export const unoDi = (v, lista, def) => (lista.includes(v) ? v : def);
// posizione libera (drag): coordinate in % del canvas + dimensione (s = scala %,
// 30–300) e rotazione (r = gradi, -180…180). null → si usa l'angolo predefinito.
// x e y tengono due decimali perche' un pixel su 1920 e' 0,05%: arrotondandoli a
// numeri interi le frecce dello studio, che spostano di un pixel, non
// sopravvivevano al salvataggio. Questa e' l'unica funzione che pulisce una
// posizione: valeva sia per gli obiettivi sia per tutto il resto, ed erano due
// con limiti diversi.
export const clampPct = (v, lo, hi, def) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
};
// I caratteri del contatore. La chiave sta qui; le famiglie CSS stanno in
// presets.js e le etichette in app.js, e un cancello controlla che i tre elenchi
// abbiano le stesse chiavi.
export const CONT_FONT = ['system', 'inter', 'spaceGrotesk', 'jetBrainsMono', 'fraunces', 'bricolage'];

// Lo sfondo di un contatore puo' essere un colore, una tinta con trasparenza o
// niente: fuori da questi tre casi si lascia stare quello che c'era.
const contSfondo = (v) => {
  const t = String(v).trim();
  if (t === 'transparent') return t;
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  return /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/.test(t) ? t : null;
};

// La config overlay di un contatore era l'unica che finiva nel database senza
// passare da nessuna pulizia. Questo e' un FILTRO, non un riempitore: pulisce
// solo le chiavi che ci sono, perche' il salvataggio e' un merge e un aggiorno
// parziale (es. {mostra:true} da un comando in chat) non deve azzerare il resto.
export const puliConta = (o) => {
  if (!o || typeof o !== 'object') return undefined;
  const q = {};
  const c = (k, fn) => { if (k in o) { const v = fn(o[k]); if (v !== null) q[k] = v; } };
  c('mostra', (v) => !!v);
  c('grassetto', (v) => !!v);
  c('x', (v) => clampPct(v, 0, 100, 4));
  c('y', (v) => clampPct(v, 0, 100, 94));
  c('r', (v) => clampInt(v, -180, 180, 0));
  c('dim', (v) => clampInt(v, 8, 200, 40));
  c('colore', (v) => hexOk(v, '#ffffff'));
  c('sfondo', contSfondo);
  c('font', (v) => unoDi(String(v), CONT_FONT, 'system'));
  c('formato', (v) => String(v).slice(0, 120));
  c('parolaOn', (v) => String(v).toLowerCase().slice(0, 40));
  c('parolaOff', (v) => String(v).toLowerCase().slice(0, 40));
  return q;
};

// La posa di un elemento sulla tela: un PUNTO ({x, y, s, r}: posizione lungo la
// corsa, scala, rotazione) oppure un RIQUADRO ({x, y, w, h, r}: l'angolo in alto
// a sinistra e la misura, in centesimi; l'elemento si adatta al rettangolo). La
// presenza di w e h decide il modo; un riquadro non esce mai dalla tela e non e'
// mai piu' piccolo di due centesimi per lato (docs/OVERLAY.md, «Il riquadro»).
export const xyOk = (v) => {
  if (!v || !Number.isFinite(Number(v.x)) || !Number.isFinite(Number(v.y))) return null;
  const riq = Number(v.w) > 0 && Number(v.h) > 0;
  const w = riq ? clampPct(v.w, 2, 100, 20) : 0, h = riq ? clampPct(v.h, 2, 100, 20) : 0;
  const q = { x: clampPct(v.x, 0, 100 - w, riq ? 0 : 50), y: clampPct(v.y, 0, 100 - h, riq ? 0 : 50), r: clampInt(v.r, -180, 180, 0) };
  if (riq) { q.w = w; q.h = h; } else q.s = clampInt(v.s, 30, 300, 100);
  return q;
};

// STILE dell'overlay (alert / chat / widget). Estratti in funzioni riusabili: gli
// STESSI campi valgono sia per lo stile di CANALE sia per lo stile PER-OVERLAY
// (Opzione B: ogni overlay può avere il suo aspetto, non solo il layout).
// Assi dell'identita' dell'overlay: forma, materia, cornice, composizione.
// Devono stare qui, non solo nel browser: lo stile si salva passando da questa
// normalizzazione, e un campo che non e' elencato viene buttato via in silenzio.
export const ICONE_OVL_K = ['stella', 'cuore', 'fulmine', 'megafono', 'corona', 'fuoco', 'diamante', 'trofeo', 'regalo', 'razzo',
  'scudo', 'cuffie', 'gamepad', 'nota', 'chat', 'campana', 'scintille', 'mano', 'occhio', 'moneta'];
export const icoOk = (x) => {
  const v = String(x || '');
  if (ICONE_OVL_K.includes(v)) return v;
  return /^effetto:[a-z0-9_]{1,30}$/i.test(v) ? v.toLowerCase() : '';
};
export const PESO_OVL = ['400', '700', '800', '900'];
export const MAIUSC_OVL = ['no', 'maiuscolo', 'capo'];
export const USCITA_OVL = ['come', 'slide', 'pop', 'zoom', 'fade', 'flip', 'bounce'];

export const FORME_OVL = ['carta', 'pillola', 'squadrata', 'taglio', 'insegna', 'esagono', 'nastro', 'fumetto'];
export const MATERIE_OVL = ['piatta', 'sfumata', 'vetro', 'carta', 'neon', 'crt', 'griglia'];
export const CORNICI_OVL = ['linea', 'nessuna', 'spessa', 'angoli', 'barra'];
export const COMP_OVL = ['colonna', 'riga', 'riga-inv', 'sovrapposta'];
// Assi enumerati che prima stavano scritti a mano dentro le normalizzazioni.
// Un asse senza nome non si può controllare: il collaudo del contratto prova
// OGNI valore di OGNI asse, e può farlo solo se l'elenco ha un nome.
export const ANIM_ALERT = ['slide', 'pop', 'zoom', 'fade', 'flip', 'bounce'];
export const ANIM_CHAT = ['slide', 'fade', 'nessuna'];
export const DIM_CHAT = ['piccola', 'media', 'grande', 'enorme'];
export const DIM_WIDGET = ['piccola', 'media', 'grande', 'enorme'];

export const normAlertStile = (st) => {
  st = st || {};
  return {
    animazione: unoDi(st.animazione, ANIM_ALERT, 'slide'),
    dimTesto: clampInt(st.dimTesto, 14, 56, 27),
    sfondo: hexOk(st.sfondo, '#0f0f14'),
    opacita: clampInt(st.opacita, 0, 100, 88),
    testo: hexOk(st.testo, '#ffffff'),
    bordoRaggio: clampInt(st.bordoRaggio, 0, 40, 18),
    bordoSpessore: clampInt(st.bordoSpessore, 0, 10, 2),
    glow: st.glow !== false,
    icona: st.icona !== false,
    font: fontOvlOk(st.font, 'sistema'),
    googleFont: String(st.googleFont || '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50),
    forma: unoDi(st.forma, FORME_OVL, 'carta'),
    materia: unoDi(st.materia, MATERIE_OVL, 'piatta'),
    cornice: unoDi(st.cornice, CORNICI_OVL, 'linea'),
    composizione: unoDi(st.composizione, COMP_OVL, 'colonna'),
    dimIcona: clampInt(st.dimIcona, 0, 120, 46),
    uscita: unoDi(st.uscita, USCITA_OVL, 'come'),
    peso: unoDi(String(st.peso), PESO_OVL, '700'),
    spaziatura: clampInt(st.spaziatura, -2, 12, 0),
    maiuscolo: unoDi(st.maiuscolo, MAIUSC_OVL, 'no'),
    ombraTesto: st.ombraTesto !== false,
    evidenziaNome: st.evidenziaNome !== false,
  };
};
export const normChatStile = (st) => {
  st = st || {};
  return {
    dim: unoDi(st.dim, DIM_CHAT, 'media'),
    sfondo: hexOk(st.sfondo, '#0f0f14'),
    opacita: clampInt(st.opacita, 0, 100, 78),
    testo: hexOk(st.testo, '#f2f2f5'),
    username: (st.username === 'twitch' || /^#[0-9a-fA-F]{6}$/.test(String(st.username))) ? st.username : 'twitch',
    bordoRaggio: clampInt(st.bordoRaggio, 0, 30, 10),
    ombra: st.ombra !== false,
    font: fontOvlOk(st.font, 'sistema'),
    googleFont: String(st.googleFont || '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50),
    larghezza: clampInt(st.larghezza, 18, 60, 30),
    animazione: unoDi(st.animazione, ANIM_CHAT, 'slide'),
    grassettoUser: st.grassettoUser !== false,
    forma: unoDi(st.forma, FORME_OVL, 'carta'),
    materia: unoDi(st.materia, MATERIE_OVL, 'piatta'),
    cornice: unoDi(st.cornice, CORNICI_OVL, 'nessuna'),
    peso: unoDi(String(st.peso), PESO_OVL, '700'),
    spaziatura: clampInt(st.spaziatura, -2, 8, 0),
    maiuscolo: unoDi(st.maiuscolo, MAIUSC_OVL, 'no'),
    ombraTesto: st.ombraTesto === true,
    // Quando in un riquadro finiscono piu' chat, una riga non dice piu' da sola
    // da dove viene. Il segno e' spento di default: chi trasmette su una sola
    // piattaforma non deve vedersi comparire un simbolo che non gli serve.
    segnaDaDove: st.segnaDaDove === true,
  };
};
export const normWidgetStile = (st) => {
  st = st || {};
  return {
    dim: unoDi(st.dim, DIM_WIDGET, 'media'),
    sfondo: hexOk(st.sfondo, '#0f0f14'),
    opacita: clampInt(st.opacita, 0, 100, 85),
    testo: hexOk(st.testo, '#ffffff'),
    accento: hexOk(st.accento, '#f72fa7'),
    bordoRaggio: clampInt(st.bordoRaggio, 0, 30, 12),
    font: fontOvlOk(st.font, 'sistema'),
    forma: unoDi(st.forma, FORME_OVL, 'carta'),
    materia: unoDi(st.materia, MATERIE_OVL, 'piatta'),
    cornice: unoDi(st.cornice, CORNICI_OVL, 'nessuna'),
    icona: st.icona === '' ? '' : (icoOk(st.icona) || 'stella'),
    dimIcona: clampInt(st.dimIcona, 0, 80, 20),
  };
};
// GLI OBIETTIVI. Sono una lista, non un campo solo: chi ne vuole tre ne fa tre,
// e ognuno ha il suo traguardo, il suo titolo, il suo posto e la sua veste —
// stessa veste degli altri elementi, quindi niente scelte obbligate.
const POS_ANG = ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra'];
export const MAX_GOAL = 6;

export const normGoal = (g, i = 0) => {
  g = g || {};
  const id = String(g.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || ('g' + (i + 1));
  return {
    id,
    attivo: g.attivo !== false,
    tipo: unoDi(g.tipo, ['follower', 'sub', 'bit', 'euro'], 'follower'),
    obiettivo: clampInt(g.obiettivo, 1, 1000000, 100),
    // Da dove parte il conto. Un obiettivo «1000 follower» non e' «altri mille»:
    // se ne hai gia' 450, la barra deve partire da li'. Il conto vero resta
    // quello degli eventi; questo e' il gradino sotto.
    partenza: clampInt(g.partenza, 0, 1000000, 0),
    // Con questo acceso la partenza non e' una fotografia che invecchia: il
    // server la riallinea al numero vero di Twitch, e il conto degli eventi
    // continua a muovere la barra fra un riallineamento e l'altro.
    daVivo: g.daVivo === true,
    titolo: String(g.titolo || '').slice(0, 60),
    posizione: unoDi(g.posizione, POS_ANG, 'alto-sinistra'),
    xy: xyOk(g.xy),
    stile: normWidgetStile(g.stile),
  };
};

export const normGoals = (lista) => {
  const dentro = Array.isArray(lista) ? lista : [];
  const visti = new Set();
  const fuori = [];
  for (const [i, g] of dentro.slice(0, MAX_GOAL).entries()) {
    const n = normGoal(g, i);
    // due obiettivi con lo stesso nome interno si sovrascriverebbero il conto
    let k = 2;
    while (visti.has(n.id)) n.id = n.id.replace(/\d+$/, '') + (k++);
    visti.add(n.id);
    fuori.push(n);
  }
  return fuori;
};

// I CARTELLI: una scritta o un'immagine tua, ferma in scena.
//
// Sono la stessa cosa, e per questo stanno in una lista sola invece che in due.
// Un cartello e' un pezzo di scena che NON lo muove nessun evento: lo scrivi o
// lo scegli tu, e sta li'. Quel che cambia fra i due tipi e' solo da dove viene
// il contenuto — dalle parole o dalla libreria Effetti — mentre posto, veste,
// riquadro, interruttore per overlay e trascinamento sono quelli di tutti gli
// altri elementi. Due elenchi separati avrebbero voluto dire due editor, due
// disegni e due porte: la stessa cosa detta due volte, e due occasioni di
// dirla diversa.
//
// L'immagine non si carica qui: si sceglie fra quelle che stanno gia' nella
// libreria Effetti, che ha gia' i suoi limiti, il suo spazio e il suo modo di
// servirle. Un secondo posto dove caricare file sarebbe un secondo posto dove
// dimenticarsi di cancellarli.
export const MAX_CARTELLI = 8;
export const TIPI_CARTELLO = ['scritta', 'immagine'];

// UN CARTELLO NON E' UN PANNELLO. Gli altri elementi sono riquadri che
// raccontano qualcosa — un obiettivo, una chat, un orologio — e una scatola
// dietro ci sta bene. Un cartello e' una scritta o un'immagine posata sulla
// scena: la scatola, di suo, non ce l'ha. Quindi la veste e' quella di tutti,
// ma due valori di partenza cambiano: niente sfondo e niente cornice, e chi
// li vuole se li accende. Si guarda se il valore E' STATO SCRITTO, non se e'
// zero: cosi' chi mette lo sfondo a zero apposta non se lo ritrova rimesso.
const stileCartello = (st) => {
  const base = normWidgetStile(st);
  st = st || {};
  if (st.opacita == null) base.opacita = 0;
  if (st.cornice == null) base.cornice = 'nessuna';
  return base;
};

export const normCartello = (c, i = 0) => {
  c = c || {};
  const id = String(c.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || ('c' + (i + 1));
  return {
    id,
    attivo: c.attivo !== false,
    tipo: unoDi(c.tipo, TIPI_CARTELLO, 'scritta'),
    nome: String(c.nome || '').slice(0, 40),
    // La scritta puo' andare a capo: e' un cartello, non un'etichetta.
    testo: String(c.testo || '').slice(0, 300),
    // Il riferimento alla libreria Effetti, nella forma che usano gia' le
    // icone degli alert. Chi lo mostra riceve l'indirizzo gia' risolto.
    effetto: /^effetto:[a-z0-9_-]{1,40}$/i.test(String(c.effetto || '')) ? String(c.effetto) : '',
    // Quanto sta stretto il testo prima di andare a capo da solo. A zero
    // nessun limite: il cartello e' largo quanto la sua riga piu' lunga.
    larghezza: clampInt(c.larghezza, 0, 100, 0),
    allinea: unoDi(c.allinea, ['sinistra', 'centro', 'destra'], 'sinistra'),
    posizione: unoDi(c.posizione, POS_ANG, 'basso-sinistra'),
    xy: xyOk(c.xy),
    stile: stileCartello(c.stile),
  };
};

export const normCartelli = (lista) => {
  const dentro = Array.isArray(lista) ? lista : [];
  const visti = new Set();
  const fuori = [];
  for (const [i, c] of dentro.slice(0, MAX_CARTELLI).entries()) {
    const n = normCartello(c, i);
    // due cartelli con lo stesso nome interno si ruberebbero il posto a vicenda
    let k = 2;
    while (visti.has(n.id)) n.id = n.id.replace(/\d+$/, '') + (k++);
    visti.add(n.id);
    fuori.push(n);
  }
  return fuori;
};

// IL PLAYER. Quello che stai ascoltando, a schermo. E' un elemento della scena
// come gli altri — stessa veste, stesso angolo, stesso trascinamento — piu' le
// scelte che sono solo sue: che forma ha la copertina (anche un vinile che
// gira), dove sta l'avanzamento (una barra sotto o un anello attorno alla
// copertina), se il titolo lungo scorre, se le onde ballano a tempo, se lo
// sfondo prende la copertina sfocata, se l'accento se lo prende dai colori
// dell'artwork, come entra in scena, e cosa fa quando non suona niente.
// Il player, pezzo per pezzo. Ogni parte ha un FATTORE (percentuale, 100 = come
// il corpo) e, se «propri» è acceso, un COLORE. Le chiavi sono la stessa lista
// che il pannello e le due pagine leggono da presets.js (PLAYER_VARS): una prova
// di contratto le confronta.
export const MISURE_MUS = ['sfondo', 'cover', 'vinile', 'titolo', 'artista', 'tempi', 'barra', 'onde'];
export const COLORI_MUS = ['titolo', 'artista', 'tempi', 'barra', 'onde'];
export const normMisureMusica = (m) => {
  m = m || {};
  const o = {};
  for (const k of MISURE_MUS) o[k] = clampInt(m[k], 40, 250, 100);
  return o;
};
export const normColoriMusica = (c) => {
  c = c || {};
  const o = { propri: c.propri === true };
  for (const k of COLORI_MUS) o[k] = hexOk(c[k], k === 'barra' || k === 'onde' ? '#f72fa7' : '#ffffff');
  return o;
};
// LE PARTI, nella disposizione «libera»: ogni pezzo ha una posizione lungo la
// corsa dello spazio interno della carta (0 a filo, 100 a filo dall'altra
// parte), le righe e la barra anche una larghezza in centesimi della carta, le
// righe un allineamento del testo. La misura di ogni pezzo la danno le Misure.
// `scatola` e' la misura naturale della carta in em (quella che aveva al
// momento del passaggio a «libera»): senza riquadro e' la sua grandezza, nel
// riquadro decide la scala, cosi' il passaggio non cambia niente di un pixel.
// La copertina ha una larghezza solo nella cassetta, dove e' il nastro.
export const PARTI_MUS = ['cover', 'titolo', 'artista', 'barra', 'tempi', 'onde'];
export const LARGHE_MUS = ['titolo', 'artista', 'barra'];
export const ALLINEA_MUS = ['sinistra', 'centro', 'destra'];
export const PARTI_DEF = { cover: { x: 0, y: 50, w: 100 }, titolo: { x: 67.5, y: 24, w: 60, a: 'sinistra' }, artista: { x: 67.5, y: 50, w: 60, a: 'sinistra' }, barra: { x: 56, y: 78, w: 52 }, tempi: { x: 91, y: 78 }, onde: { x: 96, y: 50 }, scatola: { w: 22, h: 5.5 } };
export const normPartiMusica = (p) => {
  p = p || {};
  const o = {};
  for (const k of PARTI_MUS) {
    const d = PARTI_DEF[k], v = (p[k] && typeof p[k] === 'object') ? p[k] : {};
    // non e' una posizione sulla tela (quella passa da xyOk): e' il posto del pezzo
    // lungo la corsa interna della carta, in centesimi
    const corsa = (a, lo, hi) => clampPct(v[a], lo, hi, d[a]);
    o[k] = { x: corsa('x', 0, 100), y: corsa('y', 0, 100) };
    if (d.w != null) o[k].w = corsa('w', 5, 100);
    if (d.a) o[k].a = unoDi(v.a, ALLINEA_MUS, d.a);
  }
  const s = (p.scatola && typeof p.scatola === 'object') ? p.scatola : {};
  o.scatola = { w: clampPct(s.w, 5, 80, PARTI_DEF.scatola.w), h: clampPct(s.h, 2, 60, PARTI_DEF.scatola.h) };
  return o;
};
export const COVER_MUS = ['quadrata', 'tonda', 'vinile', 'video', 'no'];
export const BARRA_MUS = ['sotto', 'anello', 'no'];
export const TEMPI_MUS = ['no', 'trascorso', 'restante', 'due'];
export const ENTRATA_MUS = ['dissolve', 'scivola', 'sale', 'niente'];
export const VERSO_MUS = ['riga', 'riga-inversa', 'colonna', 'solo-cover', 'libera'];
export const RIGHE_MUS = ['una', 'due'];
export const RITMO_MUS = ['no', 'onde', 'tutto'];
export const SFONDO_MUS = ['no', 'copertina', 'colori', 'video'];
export const CORPO_MUS = ['slim', 'normale', 'cicciotto'];
export const TEMA_MUS = ['nessuno', 'vinile', 'cd', 'cassetta', 'terminale', 'manga', 'esagono'];

export const normMusica = (m) => {
  m = m || {};
  return {
    attivo: m.attivo === true,
    verso: unoDi(m.verso, VERSO_MUS, 'riga'),
    righe: unoDi(m.righe, RIGHE_MUS, 'una'),
    testo: String(m.testo == null ? '{titolo} — {artista}' : m.testo).slice(0, 80),
    testo2: String(m.testo2 == null ? '{artista}' : m.testo2).slice(0, 80),
    cover: unoDi(m.cover, COVER_MUS, 'quadrata'),
    barra: unoDi(m.barra, BARRA_MUS, 'sotto'),
    tempi: unoDi(m.tempi, TEMPI_MUS, 'no'),
    // LE ONDE: una domanda sola, con tre risposte oneste.
    //
    // Prima erano due controlli sovrapposti: una spunta «mostra le onde» e un
    // «cosa balla a tempo» il cui «niente» le lasciava lì, ferme. Un
    // equalizzatore che non si muove non è spento: è finto, e occupa posto per
    // fingere. Adesso il ritmo dice tutto: `no` vuol dire che le onde non ci
    // sono.
    //
    // `onde` resta nella configurazione perché la leggono i disegni, ma non è
    // più una scelta a parte: è una CONSEGUENZA del ritmo, quindi i due non
    // possono più dire cose diverse. E chi aveva tolto le onde con la vecchia
    // spunta se le ritrova tolte: la sua scelta vince sul ritmo salvato.
    ...(() => {
      const r = m.onde === false ? 'no' : unoDi(m.ritmo, RITMO_MUS, 'onde');
      return { onde: r !== 'no', ritmo: r };
    })(),
    sfondo: unoDi(m.sfondo, SFONDO_MUS, 'no'),
    // Un video TUO, caricato fra gli Effetti ("effetto:<comando>"): Spotify non
    // da' un video del brano, quindi il video e' dello streamer, e gira in loop
    // sfocato sullo sfondo o in chiaro al posto della copertina.
    video: /^effetto:[a-z0-9_]{1,30}$/i.test(String(m.video || '')) ? String(m.video).toLowerCase() : '',
    corpo: unoDi(m.corpo, CORPO_MUS, 'normale'),
    // Quanto si allarga la colonna del testo prima che il titolo cominci a
    // scorrere. In «em», quindi vale uguale a ogni Dimensione. 0 = decide il
    // corpo (slim stretto, cicciotto largo).
    larghezza: clampInt(m.larghezza, 0, 30, 0),
    tema: unoDi(m.tema, TEMA_MUS, 'nessuno'),
    daCopertina: m.daCopertina === true,
    scorre: m.scorre !== false,
    entrata: unoDi(m.entrata, ENTRATA_MUS, 'dissolve'),
    cambio: m.cambio !== false,
    quandoFermo: unoDi(m.quandoFermo, ['sparisce', 'resta'], 'sparisce'),
    posizione: unoDi(m.posizione, POS_ANG, 'basso-sinistra'),
    xy: xyOk(m.xy),
    misure: normMisureMusica(m.misure),
    colori: normColoriMusica(m.colori),
    parti: normPartiMusica(m.parti),
    stile: normWidgetStile(m.stile),
  };
};

// IL CONTO ALLA ROVESCIA prima di cominciare. La configurazione sta qui;
// l'istante in cui scade sta nello STATO del canale (overlayStato.timer.fine),
// perche' e' un dato che deve sopravvivere a un riavvio: un conto alla rovescia
// che riparte da solo quando il bot si riavvia non e' un conto alla rovescia.
// IL SUBATHON: non un orologio nuovo, una REGOLA del conto alla rovescia. Il
// tempo che aggiunge finisce nello stesso istante di fine che l'overlay mostra
// gia', quindi non ci sono due orologi da tenere d'accordo — e non si puo'
// accendere un subathon senza un conto che lo faccia vedere.
export const normSubathon = (x) => {
  x = x || {};
  return {
    attivo: x.attivo === true,
    // I minuti sono per UNITA': un sub, cento bit, un euro. Le frazioni le fa il
    // conto (cinquanta bit valgono mezza unita'), cosi' nessuno deve scrivere
    // numeri con la virgola.
    perSub: clampInt(x.perSub, 0, 120, 5),
    perBit100: clampInt(x.perBit100, 0, 120, 1),
    perEuro: clampInt(x.perEuro, 0, 120, 2),
    // Il tetto e' su QUANTO MANCA, non su quanto si e' aggiunto in tutto: una
    // serata fortunata non deve trasformare la diretta in tre giorni. A zero
    // non c'e' tetto, ed e' una scelta che si prende scrivendo zero.
    tettoOre: clampInt(x.tettoOre, 0, 72, 12),
    annuncia: x.annuncia !== false,
    testoChat: String(x.testoChat == null ? 'Grazie {chi}! Il conto sale di {quanto}.' : x.testoChat).slice(0, 200),
  };
};

export const normTimer = (t) => {
  t = t || {};
  return {
    subathon: normSubathon(t.subathon),
    attivo: t.attivo === true,
    titolo: String(t.titolo == null ? 'Si comincia tra' : t.titolo).slice(0, 60),
    testoFine: String(t.testoFine == null ? 'Si comincia!' : t.testoFine).slice(0, 60),
    aFine: unoDi(t.aFine, ['resta', 'sparisce'], 'resta'),
    minuti: clampInt(t.minuti, 1, 600, 15),
    partiDaSolo: t.partiDaSolo === true,
    posizione: unoDi(t.posizione, POS_ANG, 'alto-destra'),
    xy: xyOk(t.xy),
    stile: normWidgetStile(t.stile),
  };
};

// IL TRENO. E' un elemento della scena come gli altri — stessa veste, stesso
// angolo, stesso trascinamento — piu' le due scelte che sono solo sue: se
// mostrare chi ha spinto di piu', e cosa dire in chat. La chat e la scena sono
// due interruttori separati di proposito: c'e' chi il treno lo vuole solo a
// schermo, e chi solo in chat perche' a schermo ce l'ha gia' da Twitch.
export const normTreno = (x) => {
  x = x || {};
  return {
    attivo: x.attivo === true,
    titolo: String(x.titolo == null ? 'Hype train' : x.titolo).slice(0, 60),
    mostraChi: x.mostraChi !== false,
    // Il record storico del canale, quando Twitch lo manda: e' la riga che fa
    // spingere ancora un po'. Spento di suo, perche' su un canale che il record
    // non l'ha mai sfiorato e' solo un numero che sta li'.
    mostraRecord: x.mostraRecord === true,
    annuncia: x.annuncia === true,
    testoParte: String(x.testoParte == null ? 'Hype train partito! Spingiamo.' : x.testoParte).slice(0, 200),
    testoLivello: String(x.testoLivello == null ? 'Hype train al livello {livello}!' : x.testoLivello).slice(0, 200),
    testoFine: String(x.testoFine == null ? 'Treno finito al livello {livello}. Grazie {chi}!' : x.testoFine).slice(0, 200),
    posizione: unoDi(x.posizione, POS_ANG, 'alto-destra'),
    xy: xyOk(x.xy),
    stile: normWidgetStile(x.stile),
  };
};

// Stile PER-OVERLAY completo (tutti i campi opzionali): { alerts, chat, widget }.
// Ritorna null se non c'è nulla di valido → l'overlay eredita lo stile di canale.
export const normOverlayWidgetCfg = (w) => {
  const posW = ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra'];
  const wid = (x, testoDef) => {
    x = x || {};
    return {
      attivo: !!x.attivo,
      posizione: posW.includes(x.posizione) ? x.posizione : 'basso-destra',
      xy: xyOk(x.xy),
      testo: String(x.testo || testoDef).slice(0, 80),
      stile: normWidgetStile(x.stile),
    };
  };
  return { ultimoFollower: wid(w?.ultimoFollower, 'Ultimo follower: {nome}'), ultimoSub: wid(w?.ultimoSub, 'Ultimo sub: {nome}') };
};
export const normOverlayStile = (s) => {
  if (!s || typeof s !== 'object') return null;
  const out = {};
  if (s.alerts) out.alerts = normAlertStile(s.alerts);
  if (s.chat) out.chat = normChatStile(s.chat);
  if (s.widget) out.widget = normOverlayWidgetCfg(s.widget);
  return Object.keys(out).length ? out : null;
};
