// IMPORTARE I COMANDI DA UN ALTRO BOT.
//
// Il freno all'adozione non è il prezzo: è che uno streamer con quattrocento
// comandi su Nightbot non li riscrive a mano. Finché non c'è un ponte, la riva
// bella resta vuota.
//
// PERCHÉ SI IMPORTA DEL TESTO, NON DA UN SERVIZIO.
// Leggere dall'API di Nightbot o StreamElements vorrebbe dire chiedere allo
// streamer un altro OAuth verso un servizio terzo, e restare legati a un'API
// che possono cambiare o chiudere domani. Qui si accetta QUALUNQUE testo che lo
// streamer riesca a copiare: l'export del suo bot, un CSV, o un elenco scritto
// a mano. Un formato nuovo è un lettore nuovo, non un'integrazione nuova — e
// funziona anche con bot mai visti.
//
// PERCHÉ LE VARIABILI SI TRADUCONO DAVVERO.
// Il dialetto dei Moduli ($user, $touser, $args, $arg1, $count(...)) è quasi
// uno a uno con quello di Nightbot: quasi tutto si traduce per intero, non per
// approssimazione. Quel che resta fuori viene DICHIARATO, mai importato di
// nascosto: un comando che scrive «sei morto $(count) volte» davanti a tutta la
// chat è peggio di un comando non importato.

// Traduzioni fedeli: a sinistra come lo scrivono gli altri, a destra come lo
// scriviamo noi. `$(...)` è Nightbot/Fossabot, `${...}` è StreamElements.
const VAR = [
  [['user', 'sender', 'displayname', 'display_name', 'username'], '$user'],
  [['touser', 'target'], '$touser'],
  [['query', 'querystring', 'message', 'args', 'msg'], '$args'],
  [['channel', 'channelname', 'channel_name', 'broadcaster'], '$canale'],
  [['uptime'], '$uptime'],
  [['game', 'category'], '$gioco'],
  [['title'], '$titolo'],
  [['viewers', 'viewercount', 'viewer_count'], '$spettatori'],
  [['followage'], '$followage'],
  [['watchtime'], '$oreguardate'],
];

// Quello che non sappiamo fare, con il motivo detto in chiaro e — dove c'è —
// dove si fa qui.
const NON_TRADUCIBILI = [
  [/\$\(\s*urlfetch\b[^)]*\)/i, 'una chiamata a un indirizzo esterno', 'le azioni «webhook» dei Moduli'],
  [/\$\(\s*customapi[^)]*\)/i, 'una chiamata a un indirizzo esterno', 'le azioni «webhook» dei Moduli'],
  [/\$\(\s*eval\b[^)]*\)/i, 'del codice JavaScript da eseguire', null],
  [/\$\(\s*twitch\b[^)]*\)/i, 'dati di un altro canale presi al volo', null],
  [/\$\(\s*weather\b[^)]*\)/i, 'il meteo', null],
  [/\$\(\s*(?:youtube|spotify|song|currentsong)\b[^)]*\)/i, 'il brano in ascolto', 'l’add-on Musica'],
  [/\$\{\s*[a-z][\w.]*[^}]*\}/i, 'una variabile del bot di prima', null],
  [/\$\(\s*[a-z][\w.]*[^)]*\)/i, 'una variabile del bot di prima', null],
];

export function normalizzaNome(x) {
  return String(x || '').trim().replace(/^!+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

// Traduce le variabili e dice cosa resta fuori. Non cambia mai niente in silenzio.
// `nome` serve a $(count): da noi un contatore ha un nome, e il suo è il comando.
export function traduci(testo, { nome = '' } = {}) {
  let t = String(testo == null ? '' : testo);

  // $(count) → $count(<nome del comando>): da noi i contatori hanno un nome.
  if (nome) t = t.replace(/\$[({]\s*count\s*[)}]/gi, `$count(${nome})`);
  // $(1) $(2) … → $arg1 $arg2 …
  t = t.replace(/\$[({]\s*(\d{1,2})\s*[)}]/g, (_, n) => '$arg' + n);
  // le variabili con un equivalente vero
  for (const [alias, nostro] of VAR) {
    const re = new RegExp(`\\$[({]\\s*(?:${alias.join('|')})\\s*[)}]`, 'gi');
    t = t.replace(re, nostro);
  }
  // random: da noi è dinamica e si scrive $random
  t = t.replace(/\$\{\s*random\.?\w*\s*\}/gi, '$random').replace(/\$\(\s*random\s*\)/gi, '$random');

  const avvisi = [];
  for (const [re, cosa, dove] of NON_TRADUCIBILI) {
    const m = re.exec(t);
    if (m) { avvisi.push({ tipo: 'non-tradotto', pezzo: m[0].slice(0, 60), cosa, dove }); break; }
  }
  return { testo: t.trim(), avvisi };
}

// ---------------------------------------------------------------- i formati
// Ogni lettore ritorna [{nome, risposta}] oppure null se non è il suo formato.

function daJson(grezzo) {
  let d;
  try { d = JSON.parse(grezzo); } catch { return null; }
  const lista = Array.isArray(d) ? d
    : (Array.isArray(d?.commands) ? d.commands
      : (Array.isArray(d?.data) ? d.data : (Array.isArray(d?.items) ? d.items : null)));
  if (!lista) return null;
  const out = [];
  for (const c of lista) {
    if (!c || typeof c !== 'object') continue;
    // Nightbot {name, message} · StreamElements {command, reply} · altri {cmd, response, text}
    const nome = c.name ?? c.command ?? c.cmd ?? c.trigger ?? c.alias;
    const risposta = c.message ?? c.reply ?? c.response ?? c.text ?? c.value;
    if (nome == null || risposta == null) continue;
    out.push({ nome: String(nome), risposta: String(risposta), attivo: c.enabled !== false && c.active !== false });
  }
  return out.length ? out : null;
}

function campiCsv(r) {
  const out = []; let cur = ''; let virg = false;
  for (let i = 0; i < r.length; i++) {
    const ch = r[i];
    if (virg) {
      if (ch === '"' && r[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') virg = false;
      else cur += ch;
    } else if (ch === '"') virg = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function daCsv(grezzo) {
  const righe = String(grezzo).split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (righe.length < 2) return null;
  if (righe.filter((r) => r.includes(',')).length < righe.length * 0.8) return null;
  const testa = campiCsv(righe[0]).map((x) => x.toLowerCase());
  const iNome = testa.findIndex((x) => /^(command|comando|name|nome|trigger|alias)$/.test(x));
  const iRisp = testa.findIndex((x) => /^(response|risposta|message|reply|text|testo)$/.test(x));
  if (iNome >= 0 && iRisp >= 0) {
    return righe.slice(1).map((r) => { const c = campiCsv(r); return { nome: c[iNome] || '', risposta: c[iRisp] || '' }; })
      .filter((x) => x.nome && x.risposta);
  }
  return righe.map((r) => { const c = campiCsv(r); return { nome: c[0] || '', risposta: c.slice(1).join(', ') }; })
    .filter((x) => x.nome && x.risposta);
}

function daRighe(grezzo) {
  const out = [];
  for (const riga of String(grezzo).split(/\r?\n/)) {
    const r = riga.trim();
    if (!r || r.startsWith('#') || r.startsWith('//')) continue;
    // Una riga è un comando solo se lo DICHIARA. Due forme oneste:
    //   «!nome risposta» — la "!" attaccata al nome, come in ogni bot;
    //   «nome: risposta» / «nome -> risposta» / «nome | risposta» — separatore esplicito.
    // Uno spazio nudo NON basta: accettarlo faceva diventare comando qualunque
    // frase incollata per sbaglio («solo una frase senza struttura» → !solo).
    const m = /^!([a-zA-Z0-9_]{1,24})\s*(?:[:|]|->|=>)?\s+(.+)$/.exec(r)
      || /^([a-zA-Z0-9_]{1,24})\s*(?:[:|]|->|=>|\t)\s*(.+)$/.exec(r);
    if (m) out.push({ nome: m[1], risposta: m[2] });
  }
  return out.length ? out : null;
}

export const FORMATI = [
  { id: 'json', nome: 'export JSON (Nightbot, StreamElements, Fossabot…)', leggi: daJson },
  { id: 'csv', nome: 'CSV / foglio di calcolo', leggi: daCsv },
  { id: 'righe', nome: 'elenco «!comando risposta»', leggi: daRighe },
];

// Il modulo corrispondente a un comando importato: un trigger «comando» e una
// sola azione «messaggio». È esattamente ciò che un comando di Nightbot è.
export function moduloDa({ nome, risposta, attivo = true }) {
  return {
    nome: '!' + nome,
    attivo: attivo !== false,
    trigger: { tipo: 'comando', comando: nome },
    condizioni: {},
    azioni: [{ tipo: 'messaggio', testo: risposta }],
  };
}

// ---------------------------------------------------------------- anteprima
// Dice ESATTAMENTE cosa succederebbe: cosa entra, cosa sovrascrive, cosa va
// rivisto e perché, e quanti ce ne stanno. Non tocca niente.
export function anteprima(grezzo, { esistenti = [], max = 500, posti = Infinity } = {}) {
  const gia = new Map();
  for (const m of esistenti || []) {
    const c = m?.trigger?.comando ?? m?.comando ?? m?.name ?? m?.nome;
    if (c) gia.set(normalizzaNome(c), String(m?.azioni?.[0]?.testo ?? m?.risposta ?? m?.response ?? ''));
  }

  let formato = null, letti = null;
  for (const f of FORMATI) { const r = f.leggi(grezzo); if (r) { formato = f.id; letti = r; break; } }
  if (!letti) return { formato: null, buoni: [], daRivedere: [], scartati: [], totale: 0, posti };

  const buoni = [], daRivedere = [], scartati = [];
  const visti = new Set();
  for (const c of letti.slice(0, max)) {
    const nome = normalizzaNome(c.nome);
    if (!nome) { scartati.push({ nome: String(c.nome).slice(0, 40), perche: 'nome non utilizzabile' }); continue; }
    if (visti.has(nome)) { scartati.push({ nome, perche: 'ripetuto nel file' }); continue; }
    visti.add(nome);
    const { testo, avvisi } = traduci(c.risposta, { nome });
    if (!testo) { scartati.push({ nome, perche: 'risposta vuota' }); continue; }
    const voce = {
      nome,
      risposta: testo.slice(0, 400),
      originale: String(c.risposta).slice(0, 400),
      attivo: c.attivo !== false,
      sovrascrive: gia.has(nome) && gia.get(nome) !== testo,
      uguale: gia.has(nome) && gia.get(nome) === testo,
      avvisi,
    };
    (avvisi.length ? daRivedere : buoni).push(voce);
  }
  return { formato, buoni, daRivedere, scartati, totale: letti.length, troncato: letti.length > max, posti };
}
