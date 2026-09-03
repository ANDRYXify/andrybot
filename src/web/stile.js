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

export const xyOk = (v) => (v && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y)))
  ? { x: clampPct(v.x, 0, 100, 50), y: clampPct(v.y, 0, 100, 50), s: clampInt(v.s, 30, 300, 100), r: clampInt(v.r, -180, 180, 0) } : null;

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
export const DIM_WIDGET = ['piccola', 'media', 'grande'];

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
    tipo: unoDi(g.tipo, ['follower', 'sub', 'bit'], 'follower'),
    obiettivo: clampInt(g.obiettivo, 1, 1000000, 100),
    // Da dove parte il conto. Un obiettivo «1000 follower» non e' «altri mille»:
    // se ne hai gia' 450, la barra deve partire da li'. Il conto vero resta
    // quello degli eventi; questo e' il gradino sotto.
    partenza: clampInt(g.partenza, 0, 1000000, 0),
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

// IL PLAYER. Quello che stai ascoltando, a schermo. E' un elemento della scena
// come gli altri — stessa veste, stesso angolo, stesso trascinamento — piu' le
// scelte che sono solo sue: che forma ha la copertina (anche un vinile che
// gira), dove sta l'avanzamento (una barra sotto o un anello attorno alla
// copertina), se il titolo lungo scorre, se le onde ballano a tempo, se lo
// sfondo prende la copertina sfocata, se l'accento se lo prende dai colori
// dell'artwork, come entra in scena, e cosa fa quando non suona niente.
export const COVER_MUS = ['quadrata', 'tonda', 'vinile', 'no'];
export const BARRA_MUS = ['sotto', 'anello', 'no'];
export const TEMPI_MUS = ['no', 'trascorso', 'restante', 'due'];
export const ENTRATA_MUS = ['dissolve', 'scivola', 'sale', 'niente'];
export const VERSO_MUS = ['riga', 'riga-inversa', 'colonna', 'solo-cover'];
export const RIGHE_MUS = ['una', 'due'];
export const RITMO_MUS = ['no', 'onde', 'tutto'];
export const SFONDO_MUS = ['no', 'copertina', 'colori'];

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
    onde: m.onde !== false,
    ritmo: unoDi(m.ritmo, RITMO_MUS, 'onde'),
    sfondo: unoDi(m.sfondo, SFONDO_MUS, 'no'),
    daCopertina: m.daCopertina === true,
    scorre: m.scorre !== false,
    entrata: unoDi(m.entrata, ENTRATA_MUS, 'dissolve'),
    cambio: m.cambio !== false,
    quandoFermo: unoDi(m.quandoFermo, ['sparisce', 'resta'], 'sparisce'),
    posizione: unoDi(m.posizione, POS_ANG, 'basso-sinistra'),
    xy: xyOk(m.xy),
    stile: normWidgetStile(m.stile),
  };
};

// IL CONTO ALLA ROVESCIA prima di cominciare. La configurazione sta qui;
// l'istante in cui scade sta nello STATO del canale (overlayStato.timer.fine),
// perche' e' un dato che deve sopravvivere a un riavvio: un conto alla rovescia
// che riparte da solo quando il bot si riavvia non e' un conto alla rovescia.
export const normTimer = (t) => {
  t = t || {};
  return {
    attivo: t.attivo === true,
    titolo: String(t.titolo == null ? 'Si comincia tra' : t.titolo).slice(0, 60),
    testoFine: String(t.testoFine == null ? 'Si comincia!' : t.testoFine).slice(0, 60),
    aFine: unoDi(t.aFine, ['resta', 'sparisce'], 'resta'),
    minuti: clampInt(t.minuti, 1, 600, 15),
    posizione: unoDi(t.posizione, POS_ANG, 'alto-destra'),
    xy: xyOk(t.xy),
    stile: normWidgetStile(t.stile),
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
