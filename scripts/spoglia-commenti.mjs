// Toglie (o verifica l'assenza di) i commenti nei file che il browser scarica.
//
// Regola di riservatezza: tutto ciò che si legge con F12 o scaricando i file
// del sito non deve contenere commenti. La sola eccezione sono le due righe di
// filigrana. Le spiegazioni stanno in docs/, non nel codice servito.
//
//   node scripts/spoglia-commenti.mjs --verifica   → elenca e esce 1 se trova
//   node scripts/spoglia-commenti.mjs              → toglie
//
// Come funziona: marca ogni carattere del file come commento o non-commento con
// un lexer vero (stringhe, template, regex, commenti) e poi elimina SOLO le
// righe che sono commento per intero. Così un errore del lexer non può tagliare
// codice a metà: o la riga è tutta commento, o resta com'è.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CARTELLA = 'src/web/public';
const FIRMA = ['ANDRYX-IP', 'Andrea Taliento', 'socialbot.live'];
const PRIMA_REGEX = new Set('(,=:[!&|?{};+-*%~^<>'.split(''));
const PAROLE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'yield', 'await', 'instanceof', 'throw']);
const parola = (c) => /[\w$]/.test(c);

function marcaJs(s) {
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

function marcaCss(s) {
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

function marcaHtml(s) {
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

const verifica = process.argv.includes('--verifica');
let trovati = 0;

for (const nome of readdirSync(CARTELLA).sort()) {
  if (!/\.(js|css|html)$/.test(nome)) continue;
  const via = join(CARTELLA, nome);
  const s = readFileSync(via, 'utf8');
  const marca = nome.endsWith('.js') ? marcaJs : nome.endsWith('.css') ? marcaCss : marcaHtml;
  const m = marca(s);
  const tenute = [];
  let inizio = 0, tolte = 0;
  for (const riga of s.split('\n')) {
    const fine = inizio + riga.length;
    let tutta = riga.trim().length > 0;
    for (let k = 0; k < riga.length && tutta; k++) if (!m[inizio + k] && !/\s/.test(riga[k])) tutta = false;
    if (tutta && !FIRMA.some((f) => riga.includes(f))) {
      tolte++; trovati++;
      if (verifica) console.log(`${nome}: ${riga.trim().slice(0, 120)}`);
    } else tenute.push(riga);
    inizio = fine + 1;
  }
  if (tolte && !verifica) {
    writeFileSync(via, tenute.join('\n').replace(/\n{3,}/g, '\n\n'));
    console.log(`${nome.padEnd(28)} -${tolte}`);
  }
  if (!s.includes('ANDRYX-IP') && nome !== 'index.html') console.log(`  ⚠ senza filigrana: ${nome}`);
}

if (verifica) {
  console.log(trovati ? `\n${trovati} righe di commento da togliere.` : 'Nessun commento nei file serviti. ✓');
  process.exit(trovati ? 1 : 0);
}
