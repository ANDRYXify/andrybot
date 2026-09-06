// SPOGLIARE UN FILE DEI SUOI COMMENTI.
//
// Regola di riservatezza: tutto quello che si legge con F12, o scaricando i
// file del sito, non deve contenere commenti — le sole eccezioni sono le due
// righe di filigrana. Le spiegazioni stanno in `docs/` e nei file che restano
// sul server.
//
// Questo modulo è il MOTORE di quella regola, e sta qui e non dentro allo
// script perché ha due lettori: il cancello, che verifica i file su disco, e il
// server, che spoglia al volo un modulo condiviso col browser. Scritto due
// volte, sarebbe la solita cosa che dice sì da una parte e no dall'altra.
//
// Come funziona: si marca ogni carattere come commento o non-commento con un
// lexer vero (stringhe, template, espressioni regolari, commenti), e poi si
// tolgono SOLO le righe che sono commento per intero. Un errore del lexer non
// può quindi tagliare codice a metà: o la riga è tutta commento, o resta.

export const FIRMA = ['ANDRYX-IP', 'Andrea Taliento', 'socialbot.live'];

const PRIMA_REGEX = new Set('(,=:[!&|?{};+-*%~^<>'.split(''));
const PAROLE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'yield', 'await', 'instanceof', 'throw']);
const parola = (c) => /[\w$]/.test(c);

export function marcaJs(s) {
  const m = new Uint8Array(s.length);
  const pila = [];
  let i = 0, ultimo = '', ultimaParola = '';
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (pila.length && pila[pila.length - 1] === '`') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { pila.pop(); ultimo = '`'; i++; continue; }
      if (c === '$' && s[i + 1] === '{') { pila.push('{'); i += 2; ultimo = '{'; continue; }
      i++; continue;
    }
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < n) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === q) { i++; break; }
        if (s[i] === '\n') break;
        i++;
      }
      ultimo = q; ultimaParola = ''; continue;
    }
    if (c === '`') { pila.push('`'); i++; continue; }
    if (c === '{') { i++; ultimo = '{'; ultimaParola = ''; continue; }
    if (c === '}') { if (pila[pila.length - 1] === '{') pila.pop(); i++; ultimo = '}'; ultimaParola = ''; continue; }
    if (c === '/' && s[i + 1] === '/') {
      let j = s.indexOf('\n', i); if (j < 0) j = n;
      m.fill(1, i, j); i = j; continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      let j = s.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      m.fill(1, i, j); i = j; continue;
    }
    if (c === '/') {
      if (PRIMA_REGEX.has(ultimo) || PAROLE_REGEX.has(ultimaParola) || ultimo === '') {
        i++; let classe = false;
        while (i < n) {
          if (s[i] === '\\') { i += 2; continue; }
          if (s[i] === '[') classe = true;
          else if (s[i] === ']') classe = false;
          else if (s[i] === '/' && !classe) { i++; break; }
          else if (s[i] === '\n') break;
          i++;
        }
        while (i < n && /[a-z]/i.test(s[i])) i++;
      } else i++;
      ultimo = '/'; ultimaParola = ''; continue;
    }
    if (parola(c)) {
      let j = i; while (j < n && parola(s[j])) j++;
      ultimaParola = s.slice(i, j); ultimo = s[j - 1]; i = j; continue;
    }
    if (!/\s/.test(c)) { ultimo = c; ultimaParola = ''; }
    i++;
  }
  return m;
}

export function marcaCss(s) {
  const m = new Uint8Array(s.length);
  let i = 0; const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < n) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === q) { i++; break; }
        if (s[i] === '\n') break;
        i++;
      }
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      let j = s.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      m.fill(1, i, j); i = j; continue;
    }
    i++;
  }
  return m;
}

export function marcaHtml(s) {
  const m = new Uint8Array(s.length);
  let i = 0; const n = s.length;
  while (i < n) {
    if (s.startsWith('<!--', i)) {
      let j = s.indexOf('-->', i + 4); j = j < 0 ? n : j + 3;
      m.fill(1, i, j); i = j; continue;
    }
    i++;
  }
  return m;
}

export function marcaPer(tipo) {
  return tipo === 'css' ? marcaCss : tipo === 'html' ? marcaHtml : marcaJs;
}

// Le righe di commento del testo, con il numero di riga. Serve sia a toglierle
// sia a elencarle: chi verifica e chi spoglia guardano la stessa cosa.
export function righeCommento(testo, tipo = 'js') {
  const m = marcaPer(tipo)(testo);
  const fuori = [];
  let inizio = 0, n = 0;
  for (const riga of testo.split('\n')) {
    n += 1;
    let tutta = riga.trim().length > 0;
    for (let k = 0; k < riga.length && tutta; k++) if (!m[inizio + k] && !/\s/.test(riga[k])) tutta = false;
    if (tutta && !FIRMA.some((f) => riga.includes(f))) fuori.push({ n, riga });
    inizio += riga.length + 1;
  }
  return fuori;
}

// Il testo senza le sue righe di commento.
export function spoglia(testo, tipo = 'js') {
  const via = new Set(righeCommento(testo, tipo).map((r) => r.n));
  return testo.split('\n').filter((_, i) => !via.has(i + 1)).join('\n').replace(/\n{3,}/g, '\n\n');
}
