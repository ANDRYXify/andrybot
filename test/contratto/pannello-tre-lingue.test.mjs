// IL PANNELLO PARLA LA LINGUA DI CHI LO USA, anche quando conferma.
//
// Ogni testo del pannello passa da L(it, en, es). I messaggi che compaiono dopo
// un gesto (il «salvato», l'«acceso», le finestre che chiedono) scappavano:
// ventinove uscivano in italiano anche a chi aveva il pannello in inglese o in
// spagnolo, perche' si scrivevano al volo dentro la chiamata. Qui si leggono gli
// argomenti di quelle chiamate e non si accetta una parola scritta fuori da L().
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');

// Dove comincia e dove finisce una stringa o un gruppo di parentesi, tenendo
// conto delle stringhe dentro.
function fineStringa(s, i) {
  const q = s[i];
  for (let k = i + 1; k < s.length; k++) {
    if (s[k] === '\\') { k++; continue; }
    if (q === '`' && s[k] === '$' && s[k + 1] === '{') { k = fineGruppo(s, k + 1); continue; }
    if (s[k] === q) return k;
  }
  return s.length;
}
function fineGruppo(s, i) {
  let prof = 0;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === "'" || c === '"' || c === '`') { k = fineStringa(s, k); continue; }
    if (c === '(' || c === '[' || c === '{') prof++;
    else if (c === ')' || c === ']' || c === '}') { prof--; if (prof === 0) return k; }
  }
  return s.length;
}
function argomenti(s, i) {
  const out = []; let da = i;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === "'" || c === '"' || c === '`') { k = fineStringa(s, k); continue; }
    if (c === '(' || c === '[' || c === '{') { k = fineGruppo(s, k); continue; }
    if (c === ',' || c === ')') { out.push(s.slice(da, k).trim()); da = k + 1; if (c === ')') return out; }
  }
  return out;
}

// Le parole scritte fuori da L(). Non contano i valori che non si leggono come
// frasi: le stringhe confrontate (r.esito === 'ban'), quelle date a un metodo
// (classList.contains('con-nav'), toLocaleString(...)), e i pochi valori qui
// sotto, ciascuno col suo perche'.
const LETTERE = /[A-Za-zÀ-ÿ]{2,}/;
const NON_TESTO = [
  /^Europe\/Rome$/, // il nome di un fuso orario, uguale in ogni lingua
  /^px$/, // l'unita' di una misura CSS
  /^@font-face\{/, // una regola CSS scritta in un <style>
];
function fuoriDaL(s) {
  const trovate = [];
  for (let k = 0; k < s.length; k++) {
    if (/\bL\($/.test(s.slice(Math.max(0, k - 1), k + 1)) && !/[\w$.]/.test(s[k - 2] || '')) { k = fineGruppo(s, k); continue; }
    if (s[k] === '(' && /\.[A-Za-z_$][\w$]*$/.test(s.slice(0, k))) { k = fineGruppo(s, k); continue; }
    const c = s[k];
    if (c !== "'" && c !== '"' && c !== '`') continue;
    const fine = fineStringa(s, k);
    const prima = s.slice(0, k).trimEnd();
    const dopo = s.slice(fine + 1).trimStart();
    const confronto = /(===|!==|==|!=|\bcase)$/.test(prima) || /^(===|!==|==|!=)/.test(dopo);
    const corpo = s.slice(k + 1, fine);
    if (c === '`') {
      // il testo fisso del modello conta, e dentro ${...} si guarda di nuovo
      let fisso = '';
      for (let j = 0; j < corpo.length; j++) {
        if (corpo[j] === '\\') { j++; continue; }
        if (corpo[j] === '$' && corpo[j + 1] === '{') {
          const f = fineGruppo(corpo, j + 1);
          trovate.push(...fuoriDaL(corpo.slice(j + 2, f)));
          j = f;
          continue;
        }
        fisso += corpo[j];
      }
      if (LETTERE.test(fisso) && !NON_TESTO.some((r) => r.test(corpo))) trovate.push(corpo);
    } else if (!confronto && LETTERE.test(corpo) && !NON_TESTO.some((r) => r.test(corpo))) trovate.push(corpo);
    k = fine;
  }
  return trovate;
}

function chiamate(nome) {
  const out = [];
  for (const m of APP.matchAll(new RegExp(`\\b${nome}\\(`, 'g'))) {
    if (/function\s+$/.test(APP.slice(Math.max(0, m.index - 20), m.index))) continue;
    out.push({ riga: APP.slice(0, m.index).split('\n').length, a: argomenti(APP, m.index + m[0].length) });
  }
  return out;
}

test('i messaggi dopo un gesto passano tutti da L()', () => {
  const fuori = [];
  for (const [nome, quale] of [['toast', 0], ['salvaImpostazioni', 1]]) {
    const tutte = chiamate(nome);
    assert.ok(tutte.length > (nome === 'toast' ? 200 : 40), `${nome}: le chiamate si leggono`);
    for (const c of tutte) for (const p of fuoriDaL(c.a[quale] || '')) fuori.push(`${nome}, riga ${c.riga}: «${p.slice(0, 60)}»`);
  }
  assert.deepEqual(fuori, [], 'testi scritti fuori da L()');
});

test('e cosi\' le finestre che chiedono, e il «salvato» di base', () => {
  const fuori = [];
  const TESTI = /\b(titolo|testo|si|no|ok|spiega|msgOk|etichetta)\s*:\s*/g;
  for (const nome of ['chiediSe', 'chiediCopia', 'chiediScelta', 'chiediTesto']) {
    for (const c of chiamate(nome)) {
      const tutto = c.a.join(',');
      for (const m of tutto.matchAll(TESTI)) {
        const da = m.index + m[0].length;
        const valore = argomenti(tutto + ')', da)[0] || '';
        for (const p of fuoriDaL(valore)) fuori.push(`${nome}, riga ${c.riga}: «${p.slice(0, 60)}»`);
      }
    }
  }
  assert.deepEqual(fuori, [], 'testi delle finestre fuori da L()');
  const firma = APP.slice(APP.indexOf('async function salvaImpostazioni('), APP.indexOf('{', APP.indexOf('async function salvaImpostazioni(')));
  assert.deepEqual(fuoriDaL(firma), [], 'il messaggio di base del salvataggio');
});

// Quello che si scrive dentro un elemento, mentre si aspetta o dopo: «Provo…»,
// «Fatto». L'espressione finisce al punto e virgola, o a capo.
function assegnazioni() {
  const out = [];
  for (const m of APP.matchAll(/\.(textContent|innerText|placeholder|title)\s*=(?!=)\s*/g)) {
    const da = m.index + m[0].length;
    let k = da;
    for (; k < APP.length; k++) {
      const c = APP[k];
      if (c === "'" || c === '"' || c === '`') { k = fineStringa(APP, k); continue; }
      if (c === '(' || c === '[' || c === '{') { k = fineGruppo(APP, k); continue; }
      if (c === ';' || c === '\n' || c === ')' || c === '}') break;
    }
    out.push({ riga: APP.slice(0, m.index).split('\n').length, prima: APP.slice(APP.lastIndexOf('\n', m.index) + 1, m.index), a: APP.slice(da, k) });
  }
  return out;
}

test('e anche quello che il pannello scrive dentro un tasto o una riga', () => {
  // L'anteprima di un pezzo dell'overlay dice quello che dice l'overlay, che
  // ha la sua lingua: non e' testo del pannello.
  const OVERLAY = /\.tr-liv'\)$/;
  const tutte = assegnazioni();
  assert.ok(tutte.length > 100, 'le assegnazioni si leggono');
  const fuori = [];
  for (const x of tutte) {
    if (OVERLAY.test(x.prima.trim())) continue;
    for (const p of fuoriDaL(x.a)) fuori.push(`riga ${x.riga}: «${p.slice(0, 60)}»`);
  }
  assert.deepEqual(fuori, [], 'testi scritti fuori da L()');
});

test('il cancello vede quello che deve vedere', () => {
  assert.deepEqual(fuoriDaL("'Regole salvate'"), ['Regole salvate']);
  assert.deepEqual(fuoriDaL("acceso ? L('Acceso', 'On', 'Encendido') : 'Spento.'"), ['Spento.']);
  assert.deepEqual(fuoriDaL('`${r.utente}: ${r.saldo} ${nome || \'monete\'}`'), ['monete']);
  assert.deepEqual(fuoriDaL('`Salvato ${n}`'), ['Salvato ${n}']);
  assert.deepEqual(fuoriDaL("r.ripiego === 'ban' ? L('Bannato', 'Banned', 'Baneado') : L('Bloccato', 'Blocked', 'Bloqueado')"), []);
  assert.deepEqual(fuoriDaL("L('Non riuscito', 'Failed', 'Falló') + (r.motivo ? ': ' + r.motivo : '')"), []);
  assert.deepEqual(fuoriDaL('`${t.quale.nome}: ${d.mostra || \'\'}`.trim()'), []);
  assert.deepEqual(fuoriDaL("testoListaPiena(e.dati.massimo)"), []);
  assert.deepEqual(fuoriDaL("document.body.classList.contains('con-nav') ? a : ''"), [], 'una classe data a un metodo non e\' testo');
  assert.deepEqual(fuoriDaL("n.toLocaleString('it-IT')"), []);
  assert.deepEqual(fuoriDaL("esc((r && r.motivo) || 'errore')"), ['errore'], 'una funzione qualunque non nasconde il testo');
});
