// IMPORTARE DA UN ALTRO BOT: COMANDI, TIMER E PUNTI.
//
// Il freno all'adozione non è il prezzo: è che uno streamer con quattrocento
// comandi su Nightbot non li riscrive a mano. Finché non c'è un ponte, la riva
// bella resta vuota. E un trasloco non è finito finché non arrivano anche i
// timer e i punti del suo pubblico.
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
//
// Il modello intero (come si riconosce cosa è cosa, i timer, il registro dei
// punti) è in docs/PONTE.md.

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

// ---------------------------------------------------------------- i numeri dei punti
// Un saldo scritto come lo scrive la gente: 1200, 1.200, 1,200, 1 200, 1'200
// sono milleduecento; 12,5 è dodici e 1.200,50 milleduecento (le monete sono
// intere). Tre cifre dopo il
// separatore sono sempre migliaia: nessun bot dà punti con i millesimi. Oltre
// il miliardo non è un saldo, è quasi sempre la colonna sbagliata (un codice).
export const TETTO_PUNTI = 1_000_000_000;
export const MAX_PUNTI = 50_000;
export const MAX_TIMER = 100;
const NOME_UTENTE = /^[a-z0-9_]{2,30}$/;
const pulisciUtente = (x) => String(x ?? '').trim().replace(/^@/, '').toLowerCase();

export function numeroPunti(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return { perche: 'non è un numero' };
    if (v < 0) return { perche: 'saldo sotto zero' };
    if (v > TETTO_PUNTI) return { perche: 'troppo grande per essere un saldo' };
    return { n: Math.floor(v) };
  }
  const s = String(v ?? '').trim().replace(/^\+/, '');
  if (/^-\s*\d/.test(s)) return { perche: 'saldo sotto zero' };
  let n = null;
  if (/^\d+$/.test(s)) n = Number(s);
  else if (/^\d{1,3}([.,'   ])\d{3}(?:\1\d{3})*$/.test(s)) n = Number(s.replace(/\D/g, ''));
  else if (/^\d+[.,]\d{1,2}$/.test(s)) n = Math.floor(Number(s.replace(',', '.')));
  else {
    // migliaia e decimali insieme (1.200,50 o 1,200.50): i due separatori sono diversi
    const m = /^(\d{1,3}(?:([.,'\u00a0\u202f ])\d{3})(?:\2\d{3})*)([.,])\d{1,2}$/.exec(s);
    if (m && m[2] !== m[3]) n = Number(m[1].replace(/\D/g, ''));
  }
  if (n === null || !Number.isFinite(n)) return { perche: 'non è un numero' };
  if (n > TETTO_PUNTI) return { perche: 'troppo grande per essere un saldo' };
  return { n };
}

// ---------------------------------------------------------------- gli intervalli dei timer
// Minuti (15), forme brevi (15m, 1h, 1h30, 2 ore) e l'orario cron di Nightbot.
// Il cron si legge per intero: si calcolano i minuti del giorno in cui scatta e
// si guarda se sono equidistanti. Se lo sono, quella distanza è l'intervallo.
// Se non lo sono (o se scatta solo in certi giorni) nessun intervallo lo
// rappresenta: entra con lo stesso numero di messaggi al giorno, da rivedere,
// e con il motivo scritto accanto.
const UNITA_MIN = '(?:minuti|minuto|minutes|minute|minutos|mins|min|m)';
const UNITA_ORA = '(?:ore|ora|hours|hour|horas|hora|hrs|hr|h)';
const RE_MINUTI = new RegExp(`^(\\d+)\\s*${UNITA_MIN}?\\.?$`);
const RE_ORE = new RegExp(`^(?:(\\d+)\\s*)?${UNITA_ORA}\\.?(?:\\s*(?:e|and|y)?\\s*(\\d+)\\s*${UNITA_MIN}?\\.?)?$`);
const CRON = /^[\d*?/,-]+(?:\s+[\d*?/,-]+){4}$/;
const UN_GIORNO = 1440;

function valoriCron(campo, lo, hi) {
  const out = new Set();
  for (const parte of String(campo).split(',')) {
    const m = /^(\*|\?|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(parte);
    if (!m) return null;
    let a = lo, b = hi;
    if (m[1] !== '*' && m[1] !== '?') {
      const [x, y] = m[1].split('-').map(Number);
      a = x;
      b = y !== undefined ? y : (m[2] ? hi : x);
    }
    const passo = m[2] ? Number(m[2]) : 1;
    if (!(passo >= 1) || a < lo || b > hi || a > b) return null;
    for (let v = a; v <= b; v += passo) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

function minutiDaCron(s) {
  const [mi, or, gm, me, gs] = s.split(/\s+/);
  const minuti = valoriCron(mi, 0, 59), ore = valoriCron(or, 0, 23);
  const giorni = valoriCron(gm, 1, 31), mesi = valoriCron(me, 1, 12), sett = valoriCron(gs, 0, 7);
  if (!minuti || !ore || !giorni || !mesi || !sett) return { perche: 'un orario che non so leggere' };
  const avvisi = [];
  if (giorni.length < 31 || mesi.length < 12 || new Set(sett.map((x) => x % 7)).size < 7) {
    avvisi.push({ tipo: 'giorni', cosa: 'partiva solo in certi giorni: qui parla tutti i giorni', dove: null });
  }
  const scatti = [];
  for (const h of ore) for (const m of minuti) scatti.push(h * 60 + m);
  if (scatti.length === 1) {
    avvisi.push({ tipo: 'orario', cosa: 'partiva a un’ora fissa del giorno: qui si ripete ogni 24 ore da quando lo importi', dove: null });
    return { minuti: UN_GIORNO, avvisi };
  }
  const passo = scatti[1] - scatti[0];
  for (let i = 1; i <= scatti.length; i++) {
    const d = i < scatti.length ? scatti[i] - scatti[i - 1] : scatti[0] + UN_GIORNO - scatti[scatti.length - 1];
    if (d !== passo) {
      // Distanze diverse: nessun intervallo lo rappresenta. Si tiene quello che
      // conta per chi guarda, lo stesso numero di messaggi al giorno, e lo si dice.
      const media = Math.round(UN_GIORNO / scatti.length);
      avvisi.push({ tipo: 'irregolare', cosa: `partiva a orari non regolari: qui ogni ${media} minuti, lo stesso numero di volte al giorno`, dove: null });
      return { minuti: media, avvisi };
    }
  }
  return avvisi.length ? { minuti: passo, avvisi } : { minuti: passo };
}

function entroUnGiorno(n) {
  if (!(n >= 1)) return { perche: 'un intervallo sotto il minuto' };
  if (n > UN_GIORNO) return { perche: 'più di un giorno: qui un timer arriva al massimo a 24 ore' };
  return { minuti: n };
}

// Ritorna { minuti } (a volte con degli `avvisi`) oppure { perche }.
export function minutiDa(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? entroUnGiorno(Math.round(v)) : { perche: 'un intervallo che non so leggere' };
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return { perche: 'manca ogni quanto' };
  if (CRON.test(s)) return minutiDaCron(s);
  let m = RE_MINUTI.exec(s);
  if (m) return entroUnGiorno(Number(m[1]));
  m = RE_ORE.exec(s);
  if (m) return entroUnGiorno((m[1] ? Number(m[1]) : 1) * 60 + (m[2] ? Number(m[2]) : 0));
  return { perche: 'un intervallo che non so leggere' };
}

// La frase di un timer scritto a mano, quella dopo «ogni»: «15 minuti, almeno
// 5 messaggi, anche offline». Quello che resta dopo aver tolto le parti note e
// le parole di contorno non si butta: torna indietro, e il timer va rivisto.
const RE_RIGHE_FRASE = /(\d+)\s*(?:messaggi|messaggio|righe|riga|messages|message|lines|line|mensajes|mensaje|l[ií]neas|l[ií]nea|msg)(?![a-z])/i;
const RE_FUORI_FRASE = /anche\s+(?:offline|fuori\s+diretta|a\s+canale\s+spento)|also\s+offline|offline\s+too|even\s+offline|tambi[eé]n\s+offline/i;
const RE_INTERVALLO_FRASE = new RegExp(`^\\s*((?:\\d+\\s*)?${UNITA_ORA}\\.?(?:\\s*(?:e|and|y)?\\s*\\d+\\s*${UNITA_MIN}?\\.?)?|\\d+\\s*${UNITA_MIN}\\.?)(?![a-z])`, 'i');
const RIEMPITIVI = new Set(['se', 'ci', 'sono', 'almeno', 'con', 'e', 'di', 'in', 'chat', 'at', 'least', 'if', 'with', 'there', 'are', 'and', 'al', 'menos', 'si', 'hay', 'y', 'en', 'el', 'minimo', 'minimum', 'min']);

function leggiFrase(frase) {
  let resto = String(frase).toLowerCase();
  let righe = 0, fuori = false;
  resto = resto.replace(RE_RIGHE_FRASE, (_, n) => { righe = Number(n); return ' '; });
  resto = resto.replace(RE_FUORI_FRASE, () => { fuori = true; return ' '; });
  const m = RE_INTERVALLO_FRASE.exec(resto);
  if (!m) return null;
  const avanzo = resto.slice(m[0].length).replace(/[,;()]/g, ' ').split(/\s+/).filter((w) => w && !RIEMPITIVI.has(w));
  return { intervallo: m[1].trim(), righe, fuori, avanzo: avanzo.join(' ') };
}

// ---------------------------------------------------------------- cosa è cosa
// Ogni voce dichiara cosa è con la sua forma. Il timer viene prima del comando
// perché un timer di Nightbot ha anche `name` e `message`: senza quest'ordine
// diventerebbe un comando che si chiama come il timer.
const primo = (c, chiavi) => { for (const k of chiavi) if (c[k] !== undefined && c[k] !== null) return c[k]; return undefined; };
const CH_NOME_CMD = ['name', 'command', 'cmd', 'trigger', 'alias'];
const CH_RISPOSTA = ['message', 'reply', 'response', 'text', 'value'];
const CH_TESTO_TIMER = ['message', 'response', 'text', 'reply', 'messaggio', 'testo'];
const CH_INTERVALLO = ['interval', 'intervallo', 'minuti', 'minutes', 'every'];
const CH_RIGHE = ['chatLines', 'chatlines', 'lines', 'righe', 'minMessaggi', 'minLines'];
const CH_UTENTE = ['username', 'user', 'login', 'utente', 'name', 'nome', 'displayName', 'display_name'];
const CH_PUNTI = ['points', 'punti', 'monete', 'coins', 'currency', 'balance', 'saldo', 'amount'];
const CH_ORE = ['hours', 'ore', 'watchtime', 'watch_time', 'minutesWatched', 'minutes', 'time'];

function testiTimer(c) {
  if (Array.isArray(c.messages)) {
    return c.messages.map((x) => (typeof x === 'string' ? x : String(x?.message ?? x?.text ?? '')))
      .filter((x) => x.trim());
  }
  const t = primo(c, CH_TESTO_TIMER);
  return typeof t === 'string' && t.trim() ? [t] : [];
}

function specie(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const testi = testiTimer(c);
  if (testi.length && (primo(c, CH_INTERVALLO) !== undefined || primo(c, CH_RIGHE) !== undefined
    || c.online != null || c.offline != null)) return 'timer';
  if (!testi.length && typeof primo(c, CH_UTENTE) === 'string' && primo(c, CH_PUNTI) !== undefined) return 'punti';
  if (primo(c, CH_NOME_CMD) != null && primo(c, CH_RISPOSTA) != null) return 'comando';
  return null;
}

// Un timer letto, nella forma comune a tutti i lettori:
//   { nome, testi, righe, attivo, diretta, fuori, avanzo?, errore? }
// `diretta` e `fuori` sono l'intervallo con cui parla in diretta e fuori
// diretta, null dove non parla. Nightbot (l'unico che scrive l'intervallo in
// cron) parla anche a canale spento; StreamElements lo dice con `online` e
// `offline`; un file qualunque, senza dirlo, segue la regola di qui: in diretta.
function timerDaVoce(c) {
  const iv = primo(c, CH_INTERVALLO);
  let attivo = c.enabled !== false && c.active !== false && c.attivo !== false;
  const parte = (x) => {
    if (x === undefined || x === null) return undefined;
    if (typeof x === 'object') return x.enabled === false ? null : (primo(x, CH_INTERVALLO) ?? iv ?? null);
    if (x === false) return null;
    if (x === true) return iv ?? null;
    return x;
  };
  const cron = typeof iv === 'string' && CRON.test(iv.trim());
  let diretta = parte(c.online);
  if (diretta === undefined) diretta = iv ?? null;
  let fuori = parte(c.offline);
  if (fuori === undefined) fuori = (cron || c.ancheOffline === true) ? (iv ?? null) : null;
  if (diretta == null && fuori == null) {
    // spento dappertutto: entra spento, col ritmo che aveva
    const r = (c.online && typeof c.online === 'object' ? primo(c.online, CH_INTERVALLO) : undefined)
      ?? (c.offline && typeof c.offline === 'object' ? primo(c.offline, CH_INTERVALLO) : undefined) ?? iv;
    if (r != null) { diretta = r; attivo = false; }
  }
  return {
    nome: typeof c.name === 'string' ? c.name : (typeof c.nome === 'string' ? c.nome : ''),
    testi: testiTimer(c),
    righe: primo(c, CH_RIGHE) ?? 0,
    attivo,
    diretta: diretta ?? null,
    fuori: fuori ?? null,
  };
}

// ---------------------------------------------------------------- i formati
// Ogni lettore ritorna { comandi, timer, punti, oreFuori } oppure null se nel
// testo non trova niente di suo.
const vuoto = () => ({ comandi: [], timer: [], punti: [], oreFuori: false });
const pieno = (o) => (o.comandi.length || o.timer.length || o.punti.length ? o : null);

function daJson(grezzo) {
  let d;
  try { d = JSON.parse(grezzo); } catch { return null; }
  const liste = Array.isArray(d) ? [d]
    : (d && typeof d === 'object' ? Object.values(d).filter(Array.isArray) : []);
  const out = vuoto();
  for (const lista of liste) {
    for (const c of lista) {
      switch (specie(c)) {
        case 'timer': out.timer.push(timerDaVoce(c)); break;
        case 'punti':
          out.punti.push({ utente: primo(c, CH_UTENTE), valore: primo(c, CH_PUNTI) });
          if (primo(c, CH_ORE) !== undefined) out.oreFuori = true;
          break;
        case 'comando':
          // Nightbot {name, message} · StreamElements {command, reply} · altri {cmd, response, text}
          out.comandi.push({ nome: String(primo(c, CH_NOME_CMD)), risposta: String(primo(c, CH_RISPOSTA)), attivo: c.enabled !== false && c.active !== false });
          break;
        default: break;
      }
    }
  }
  return pieno(out);
}

function campi(r, sep) {
  const out = []; let cur = ''; let virg = false;
  for (let i = 0; i < r.length; i++) {
    const ch = r[i];
    if (virg) {
      if (ch === '"' && r[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') virg = false;
      else cur += ch;
    } else if (ch === '"') virg = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

// Il separatore è quello con cui OGNI riga ha lo stesso numero di colonne: la
// tabulazione di chi copia da un foglio di calcolo, il punto e virgola del CSV
// all'italiana, la virgola. Se nessuno torna, resta la lettura di prima, a
// virgole, per i comandi con le virgole nelle risposte.
function separatore(righe) {
  for (const sep of ['\t', ';', ',']) {
    const n = campi(righe[0], sep).length;
    if (n >= 2 && righe.every((r) => campi(r, sep).length === n)) return sep;
  }
  return righe.filter((r) => r.includes(',')).length >= righe.length * 0.8 ? ',' : null;
}

const chiaveColonna = (x) => String(x).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const colonne = (xs) => new Set(xs);
const COL_NOME = colonne(['command', 'comando', 'name', 'nome', 'trigger', 'alias']);
const COL_RISPOSTA = colonne(['response', 'risposta', 'message', 'messaggio', 'reply', 'text', 'testo', 'messages']);
const COL_INTERVALLO = colonne(['interval', 'intervallo', 'minuti', 'minutes', 'every', 'ogni', 'frequenza', 'frequency', 'onlineinterval', 'intervalminutes']);
const COL_RIGHE = colonne(['lines', 'chatlines', 'righe', 'minlines', 'lineminimum', 'minimumlines', 'minmessaggi', 'righechat']);
const COL_UTENTE = colonne(['username', 'user', 'utente', 'login', 'viewer', 'spettatore', 'name', 'nome', 'nomeutente', 'displayname']);
const COL_PUNTI = colonne(['points', 'punti', 'monete', 'coins', 'currency', 'balance', 'saldo', 'amount', 'puntitotali', 'totalpoints']);
const COL_ORE = colonne(['hours', 'ore', 'minuteswatched', 'watchtime', 'oreguardate', 'minutiguardati', 'time', 'tempo']);
const indice = (testa, col) => testa.findIndex((x) => col.has(x));
const NOME_COMANDO = /^!?[a-zA-Z0-9_]{1,24}$/;
// «Dopo il nome c'è solo un numero»: la stessa regola per il CSV e per
// l'elenco a mano. Se il numero è buono lo decide dopo numeroPunti, che scarta
// dicendo perché: una riga così è un saldo anche quando è un saldo sbagliato.
const SOLO_NUMERO = /^[+-]?\d[\d.,'\u00a0\u202f ]*$/;
const eSaldo = (nome, valore) => /^@?[a-zA-Z0-9_]{2,30}$/.test(String(nome)) && SOLO_NUMERO.test(String(valore).trim());

function daCsv(grezzo) {
  const righe = String(grezzo).split(/\r?\n/).filter((r) => r.trim());
  if (righe.length < 2) return null;
  const sep = separatore(righe);
  if (!sep) return null;
  const tab = righe.map((r) => campi(r, sep));
  const testa = tab[0].map(chiaveColonna);
  const corpo = tab.slice(1);
  const out = vuoto();

  // Decide l'intestazione. Punti e nomi senza messaggi: punti. Intervallo e
  // messaggi: timer. Nome e risposta: comandi.
  const iU = indice(testa, COL_UTENTE), iP = indice(testa, COL_PUNTI), iR = indice(testa, COL_RISPOSTA);
  if (iP >= 0 && iU >= 0 && iR < 0) {
    out.punti = corpo.map((c) => ({ utente: c[iU], valore: c[iP] }));
    out.oreFuori = testa.some((x) => COL_ORE.has(x));
    return pieno(out);
  }
  const iI = indice(testa, COL_INTERVALLO), iL = indice(testa, COL_RIGHE), iN = indice(testa, COL_NOME);
  if (iI >= 0 && iR >= 0) {
    out.timer = corpo.filter((c) => (c[iR] || '').trim())
      .map((c) => ({ nome: iN >= 0 ? (c[iN] || '') : '', testi: [c[iR]], righe: iL >= 0 ? c[iL] : 0, attivo: true, diretta: c[iI] || null, fuori: null }));
    return pieno(out);
  }
  if (iN >= 0 && iR >= 0) {
    out.comandi = corpo.map((c) => ({ nome: c[iN] || '', risposta: c[iR] || '' })).filter((x) => x.nome && x.risposta);
    return pieno(out);
  }

  // Senza intestazione ogni riga si legge da sola: nome e solo un numero è un
  // saldo, nome e testo è un comando. Se la prima colonna non è un nome, non
  // è un CSV: è un elenco a mano con qualche virgola, e lo legge chi sa farlo.
  if (!tab.every((c) => NOME_COMANDO.test(c[0] || '') || /^@?[a-zA-Z0-9_]{2,30}$/.test(c[0] || ''))) return null;
  for (const c of tab) {
    if (c.length === 2 && !String(c[0]).startsWith('!') && eSaldo(c[0], c[1])) out.punti.push({ utente: c[0], valore: c[1] });
    else if (c[0] && c.slice(1).join('').trim()) out.comandi.push({ nome: c[0], risposta: c.slice(1).join(sep === ',' ? ', ' : ' ') });
  }
  return pieno(out);
}

// Una riga è qualcosa solo se lo DICHIARA:
//   «!nome risposta» — un comando, la "!" attaccata al nome come in ogni bot;
//   «ogni 15 minuti: messaggio» — un timer (anche every, cada);
//   «nome 1200» — un saldo, se dopo il nome c'è SOLO un numero;
//   «nome: risposta» / «nome -> risposta» / «nome | risposta» — un comando.
// Uno spazio nudo fra nome e testo NON basta: accettarlo faceva diventare
// comando qualunque frase incollata per sbaglio («solo una frase senza
// struttura» → !solo).
const RE_CMD = /^!([a-zA-Z0-9_]{1,24})\s*(?:[:|]|->|=>)?\s+(.+)$/;
const RE_TIMER = /^(?:ogni|every|cada)\s+(.+?)\s*(?::|\||->|=>)\s*(.+)$/i;
const RE_SALDO = /^(@?[a-zA-Z0-9_]{2,30})(?:\s*(?:[:;,=|\t]|->|=>)\s*|\s+)([+-]?\d[\d.,'   ]*)$/;
const RE_CMD2 = /^([a-zA-Z0-9_]{1,24})\s*(?:[:|]|->|=>|\t)\s*(.+)$/;

function daRighe(grezzo) {
  const out = vuoto();
  for (const riga of String(grezzo).split(/\r?\n/)) {
    const r = riga.trim();
    if (!r || r.startsWith('#') || r.startsWith('//')) continue;
    let m = RE_CMD.exec(r);
    if (m) { out.comandi.push({ nome: m[1], risposta: m[2] }); continue; }
    m = RE_TIMER.exec(r);
    if (m) {
      const f = leggiFrase(m[1]);
      if (!f) { out.timer.push({ nome: '', testi: [m[2]], errore: 'non ho capito ogni quanto' }); continue; }
      out.timer.push({ nome: '', testi: [m[2]], righe: f.righe, attivo: true, diretta: f.intervallo, fuori: f.fuori ? f.intervallo : null, avanzo: f.avanzo });
      continue;
    }
    m = RE_SALDO.exec(r);
    if (m && eSaldo(m[1], m[2])) { out.punti.push({ utente: m[1], valore: m[2].trim() }); continue; }
    m = RE_CMD2.exec(r);
    if (m) out.comandi.push({ nome: m[1], risposta: m[2] });
  }
  return pieno(out);
}

export const FORMATI = [
  { id: 'json', nome: 'export JSON (Nightbot, StreamElements, Fossabot…)', leggi: daJson },
  { id: 'csv', nome: 'CSV / foglio di calcolo', leggi: daCsv },
  { id: 'righe', nome: 'elenco scritto a mano', leggi: daRighe },
];

// ---------------------------------------------------------------- i moduli che ne escono
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

// Il modulo di un timer: innesco «a tempo», un messaggio. «Solo fuori diretta»
// è una condizione del modulo, come nell'editor.
export function moduloTimerDa(v) {
  return {
    nome: v.nome,
    attivo: v.attivo !== false,
    trigger: { tipo: 'timer', minuti: v.minuti, minMessaggi: v.minMessaggi, ancheOffline: !!v.ancheOffline },
    condizioni: v.soloOffline ? { soloOffline: true } : {},
    azioni: [{ tipo: 'messaggio', testo: v.testo }],
  };
}

// ---------------------------------------------------------------- anteprima dei comandi
function anteprimaComandi(letti, { esistenti, max }) {
  // Solo i moduli-comando: un modulo a tempo o «parola» con lo stesso nome non
  // è il comando che l'import andrebbe a sostituire.
  const gia = new Map();
  for (const m of esistenti || []) {
    if (m?.trigger?.tipo && m.trigger.tipo !== 'comando') continue;
    const c = m?.trigger?.comando ?? m?.comando ?? m?.name ?? m?.nome;
    if (c) gia.set(normalizzaNome(c), String(m?.azioni?.[0]?.testo ?? m?.risposta ?? m?.response ?? ''));
  }

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
  return { buoni, daRivedere, scartati, totale: letti.length, troncato: letti.length > max };
}

// ---------------------------------------------------------------- anteprima dei timer
function breve(t, n = 40) {
  const s = String(t).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const taglio = s.slice(0, n);
  const sp = taglio.lastIndexOf(' ');
  return (sp > n / 2 ? taglio.slice(0, sp) : taglio) + '…';
}

// Da un timer letto ai moduli (uno, o due quando diretta e fuori diretta hanno
// ritmi diversi: due moduli sono esattamente il comportamento di prima).
function unTimer(l, { risposte }) {
  if (l.errore) return { perche: l.errore };
  const md = l.diretta != null ? minutiDa(l.diretta) : null;
  const mf = l.fuori != null ? minutiDa(l.fuori) : null;
  if (md?.perche) return { perche: md.perche };
  if (mf?.perche) return { perche: mf.perche };
  if (!md && !mf) return { perche: 'manca ogni quanto' };

  const avvisi = [], note = new Set();
  const avvisa = (a) => { if (!avvisi.some((x) => x.cosa === a.cosa)) avvisi.push(a); };
  for (const x of [md, mf]) for (const a of x?.avvisi || []) avvisa(a);
  if (l.avanzo) avvisa({ tipo: 'non-capito', cosa: `non ho capito «${l.avanzo.slice(0, 40)}»`, dove: null });

  const originali = (l.testi || []).map((x) => String(x).trim()).filter(Boolean);
  if (!originali.length) return { perche: 'nessun messaggio' };
  if (originali.length > 20) avvisa({ tipo: 'messaggi', cosa: `aveva ${originali.length} messaggi: entrano i primi 20`, dove: null });

  // Negli altri bot un timer che scrive «!social» fa partire il comando. Qui un
  // timer scrive e basta: prende la risposta del comando, se c'è, e lo dice.
  const testi = [];
  for (const o of originali.slice(0, 20)) {
    let grezzo = o, nomeCont = normalizzaNome(l.nome);
    const lancia = /^!([a-zA-Z0-9_]{1,24})$/.exec(o);
    if (lancia) {
      const c = normalizzaNome(lancia[1]);
      if (risposte.has(c)) { grezzo = risposte.get(c); nomeCont = c; note.add(`scrive la risposta di !${c}`); }
      else avvisa({ tipo: 'comando', cosa: `lancia !${c}, che qui non c’è: un timer scrive e basta`, dove: null });
    }
    const { testo, avvisi: a } = traduci(grezzo, { nome: nomeCont });
    for (const x of a) avvisa(x);
    if (testo) testi.push(testo.slice(0, 400));
  }
  if (!testi.length) return { perche: 'nessun messaggio' };

  // Più messaggi: un solo $scegli, stesso ritmo, uno per volta ma a caso.
  // `|` e `)` dentro un messaggio romperebbero $scegli: allora entra il primo.
  let testo = testi[0];
  if (testi.length > 1) {
    if (testi.every((t) => !/[|)]/.test(t))) {
      testo = `$scegli(${testi.join('|')})`;
      note.add(`${testi.length} messaggi: ne esce uno per volta, a caso e non in fila`);
    } else {
      avvisa({ tipo: 'messaggi', cosa: `alterna ${testi.length} messaggi che qui non stanno in uno solo: entra il primo`, dove: null });
    }
  }

  // Le righe di chat: stesso numero. Qui si contano fra un annuncio e l'altro,
  // una finestra che contiene sempre gli ultimi 5 minuti in cui contavano gli
  // altri: ogni volta che il timer parlava prima, parla anche qui.
  let righe = Math.max(0, Math.floor(Number(l.righe) || 0));
  if (righe > 1000) { avvisa({ tipo: 'righe', cosa: `chiedeva ${righe} messaggi in chat: qui al massimo 1000`, dove: null }); righe = 1000; }

  const nome = String(l.nome || '').trim().slice(0, 60) || `Timer: ${breve(originali[0])}`;
  const base = {
    attivo: l.attivo !== false, testo, minMessaggi: righe,
    originale: originali.join(' / ').slice(0, 400), avvisi, note: [...note],
  };
  if (md && mf && md.minuti !== mf.minuti) {
    return { voci: [
      { ...base, nome: `${nome} (in diretta)`, minuti: md.minuti, ancheOffline: false, soloOffline: false },
      { ...base, nome: `${nome} (fuori diretta)`, minuti: mf.minuti, ancheOffline: true, soloOffline: true },
    ] };
  }
  if (md && mf) return { voci: [{ ...base, nome, minuti: md.minuti, ancheOffline: true, soloOffline: false }] };
  if (md) return { voci: [{ ...base, nome, minuti: md.minuti, ancheOffline: false, soloOffline: false }] };
  return { voci: [{ ...base, nome, minuti: mf.minuti, ancheOffline: true, soloOffline: true }] };
}

function ugualeTimer(m, v) {
  const t = m.trigger || {};
  const az = Array.isArray(m.azioni) ? m.azioni : [];
  return az.length === 1 && az[0]?.tipo === 'messaggio' && az[0].testo === v.testo
    && Number(t.minuti) === v.minuti && (Number(t.minMessaggi) || 0) === v.minMessaggi
    && !!t.ancheOffline === v.ancheOffline && !!m.condizioni?.soloOffline === v.soloOffline;
}

function anteprimaTimer(letti, { esistenti, risposte, max = MAX_TIMER }) {
  // Un timer si riconosce dal nome: chi non ce l'ha lo prende dalle prime
  // parole del messaggio, sempre allo stesso modo, così lo stesso elenco
  // importato due volte non raddoppia niente.
  const gia = new Map();
  for (const m of esistenti || []) {
    if (m?.trigger?.tipo !== 'timer') continue;
    const k = String(m.nome || '').trim().toLowerCase();
    if (k) gia.set(k, m);
  }
  const buoni = [], daRivedere = [], scartati = [];
  const visti = new Set();
  for (const l of letti.slice(0, max)) {
    const r = unTimer(l, { risposte });
    if (r.perche) { scartati.push({ nome: String(l.nome || breve(l.testi?.[0] || '')).slice(0, 40), perche: r.perche }); continue; }
    for (const v of r.voci) {
      const k = v.nome.toLowerCase();
      if (visti.has(k)) { scartati.push({ nome: v.nome.slice(0, 40), perche: 'ripetuto nel file' }); continue; }
      visti.add(k);
      const e = gia.get(k);
      const uguale = !!e && ugualeTimer(e, v);
      (v.avvisi.length ? daRivedere : buoni).push({ ...v, sovrascrive: !!e && !uguale, uguale });
    }
  }
  return { buoni, daRivedere, scartati, totale: letti.length, troncato: letti.length > max };
}

// Le risposte dei comandi a cui un timer può rimandare: quelle del file prima
// (sono la verità nuova), poi i comandi che ci sono già, se sono un messaggio e
// basta. Il testo è quello grezzo: la traduzione la fa il timer, col suo nome.
function risposteDi(letti, esistenti) {
  const r = new Map();
  for (const m of esistenti || []) {
    if (m?.trigger?.tipo && m.trigger.tipo !== 'comando') continue;
    const az = Array.isArray(m?.azioni) ? m.azioni : [];
    const c = normalizzaNome(m?.trigger?.comando);
    if (c && az.length === 1 && az[0]?.tipo === 'messaggio' && az[0].testo) r.set(c, String(az[0].testo));
  }
  const dalFile = new Map();
  for (const c of letti) {
    const n = normalizzaNome(c.nome);
    if (n && !dalFile.has(n) && String(c.risposta || '').trim()) dalFile.set(n, String(c.risposta));
  }
  for (const [n, t] of dalFile) r.set(n, t);
  return r;
}

// ---------------------------------------------------------------- anteprima dei punti
// I punti diventano monete e si SOMMANO a quelle di qui, una volta sola: il
// registro `importate` (in points) tiene quanto è arrivato dall'ultima
// importazione, e una nuova porta solo la differenza. `saldi` è la mappa
// utente → { monete, importate } del canale (o una funzione che la dà: si
// legge solo se nel testo ci sono punti).
export function anteprimaPunti(letti, { saldi = new Map(), tasso = 1, escludi = new Set(), max = MAX_PUNTI, oreFuori = false } = {}) {
  const t = Math.max(1, Math.min(1_000_000, Math.floor(Number(tasso)) || 1));
  const mappa = typeof saldi === 'function' ? saldi() : (saldi || new Map());
  const voci = [], scartati = [];
  const visti = new Set();
  let scartatiTotale = 0, invariati = 0, zero = 0;
  const scarta = (nome, perche) => {
    scartatiTotale++;
    if (scartati.length < 50) scartati.push({ nome: String(nome ?? '').slice(0, 40), perche });
  };
  for (const r of letti.slice(0, max)) {
    const u = pulisciUtente(r.utente);
    if (!NOME_UTENTE.test(u)) { scarta(r.utente, 'non è un nome utente'); continue; }
    if (escludi.has(u)) { scarta(u, 'è un bot'); continue; }
    if (visti.has(u)) { scarta(u, 'ripetuto nel file'); continue; }
    visti.add(u);
    const p = numeroPunti(r.valore);
    if (p.perche) { scarta(u, p.perche); continue; }
    const monete = Math.floor(p.n / t);
    const s = mappa.get(u);
    const prima = s?.monete || 0, importate = s?.importate || 0;
    if (monete === importate) { if (monete) invariati++; else zero++; continue; }
    voci.push({ utente: u, punti: p.n, monete, prima, dopo: Math.max(0, prima + monete - importate), nuovo: !s });
  }
  voci.sort((a, b) => b.monete - a.monete || (a.utente < b.utente ? -1 : a.utente > b.utente ? 1 : 0));
  return {
    letti: letti.length,
    tasso: t,
    cambiano: voci.length,
    nuovi: voci.filter((v) => v.nuovo).length,
    invariati,
    zero,
    entrano: voci.reduce((a, v) => a + (v.dopo - v.prima), 0),
    top: voci.slice(0, 10),
    scartati,
    scartatiTotale,
    troncato: letti.length > max,
    oreFuori: !!oreFuori,
    voci,
  };
}

// ---------------------------------------------------------------- anteprima
// Dice ESATTAMENTE cosa succederebbe: cosa entra, cosa sovrascrive, cosa va
// rivisto e perché, e quanti ce ne stanno. Non tocca niente.
// I campi dei comandi restano in cima (è la forma di sempre); timer e punti
// hanno i loro.
export function anteprima(grezzo, { esistenti = [], max = 500, posti = Infinity, saldi, tasso, escludi } = {}) {
  let formato = null, letto = null;
  for (const f of FORMATI) { const r = f.leggi(grezzo); if (r) { formato = f.id; letto = r; break; } }
  if (!letto) {
    return { formato: null, buoni: [], daRivedere: [], scartati: [], totale: 0, posti,
      timer: { buoni: [], daRivedere: [], scartati: [], totale: 0, troncato: false }, punti: null };
  }
  const comandi = anteprimaComandi(letto.comandi, { esistenti, max });
  const timer = anteprimaTimer(letto.timer, { esistenti, risposte: risposteDi(letto.comandi, esistenti) });
  const punti = letto.punti.length ? anteprimaPunti(letto.punti, { saldi, tasso, escludi, oreFuori: letto.oreFuori }) : null;
  return { formato, ...comandi, posti, timer, punti };
}
