// LA SCHEDA COMANDI DICE QUELLO CHE IL BOT FA.
//
// Qui stanno le prove della scheda Comandi (e di Comandi vocali) che si leggono
// dal pannello: un testo che promette una cosa che il bot non fa, un campo letto
// col nome sbagliato, un tasto che salva piu' di quello che si vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');

// Il corpo di una funzione del pannello, dalla firma alla graffa che la chiude.
function corpo(firma) {
  const i = APP.indexOf(firma);
  assert.ok(i >= 0, `manca ${firma}`);
  let d = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') d++;
    else if (APP[j] === '}') { d--; if (!d) return APP.slice(i, j + 1); }
  }
  return '';
}

test('accendere un contatore a schermo non lo azzera, e il pannello non lo dice', () => {
  const cont = leggi('src/features/contatori.js');
  assert.match(cont, /verbo === 'mostra'\) nuovo = store\.patchOverlay\(canale, primo, \{ mostra: true \}\)/, 'il verbo tocca solo lo schermo');
  const testi = corpo('function carteContatori()') + corpo('async function caricaContatori()');
  assert.doesNotMatch(testi, /da 0|from 0|desde 0|en 0 y/i, 'nessuna promessa di ripartire da zero');
});

// Il riassunto di un modulo («… → azzera "morti"») legge l'azione con i nomi
// dei campi che l'editor scrive e il motore esegue: `op`, non `operazione`.
function riassunto() {
  const fn = corpo('function riassuntoAzione(a)');
  return new Function('L', 'Lv', 'esc', 'nomeMonetaUI', `${fn}; return riassuntoAzione;`)(
    (it) => it, (v) => v[0], (x) => String(x), () => 'monete');
}

test('il riassunto dell\'azione contatore dice l\'operazione scelta nell\'editor', () => {
  const editor = corpo('function leggiAzioneRiga(riga)');
  assert.match(editor, /case 'contatore': return \{\s*tipo, nome: [^}]*op: v\('op'\)/, 'l\'editor salva `op`');
  assert.match(leggi('src/features/modules.js'), /azione\.op === 'azzera'/, 'il motore legge `op`');
  const r = riassunto();
  assert.match(r({ tipo: 'contatore', nome: 'morti', op: 'azzera' }), /azzera/i);
  assert.match(r({ tipo: 'contatore', nome: 'morti', op: 'imposta', valore: 7 }), /imposta[^\n]*7/i);
  assert.doesNotMatch(r({ tipo: 'contatore', nome: 'morti', op: 'incrementa' }), /azzera|imposta/i);
});

// «Salva i comandi» c'e' due volte: nella scheda Comandi (tutti i comandi) e in
// Giochi (i comandi dei giochi). Legge solo la lista della sua carta, e dice al
// server quali righe aveva davanti: una scelta riportata al valore di base in
// una lista non viene piu' coperta dalla riga dell'altra.
function rigaFinta(id, { on = true, nome = '', chi = 'tutti' } = {}) {
  const campi = { '[data-gc-on]': { checked: on }, '[data-gc-nome]': { value: nome }, '[data-gc-chi]': { value: chi } };
  return { dataset: { gc: id }, querySelector: (q) => campi[q] || null };
}
function listaFinta(righe) {
  return { querySelectorAll: (q) => (q === '.gc-riga' ? righe : []) };
}

test('«Salva i comandi» manda solo le righe della sua lista, e quali erano', async () => {
  const comandi = listaFinta([rigaFinta('slot'), rigaFinta('so', { nome: 'grida' })]);
  const giochi = listaFinta([rigaFinta('slot', { on: false })]);
  const carta = (ul) => ({ querySelector: (q) => (q === '.gc-lista' ? ul : null) });
  const tasto = (ul) => ({ closest: (q) => (q === '.carta' ? carta(ul) : null) });
  const mandati = [];
  const documento = { querySelectorAll: () => [...comandi.querySelectorAll('.gc-riga'), ...giochi.querySelectorAll('.gc-riga')] };
  const salva = new Function('document', 'api', 'toast', 'caricaGiochiComandi', 'L',
    `${corpo('async function salvaGiochiComandi(')}; return salvaGiochiComandi;`)(
    documento, async (url, o) => { mandati.push(o.body); return {}; }, () => {}, () => {}, (it) => it);

  await salva({ currentTarget: tasto(comandi) });
  assert.deepEqual(mandati[0].comandi, { so: { nome: 'grida' } }, 'lo slot riacceso non viene coperto dalla lista dei giochi');
  assert.deepEqual(mandati[0].ids, ['slot', 'so']);
  await salva({ currentTarget: tasto(giochi) });
  assert.deepEqual(mandati[1], { comandi: { slot: { off: true } }, ids: ['slot'] });

  const SRV = leggi('src/web/server.js');
  const rotta = SRV.slice(SRV.indexOf("app.post('/api/streamer/comandi-pronti'"), SRV.indexOf("app.get('/api/streamer/giochi'"));
  assert.match(rotta, /unisciComandi\(s\?\.settings\?\.comandi, req\.body\?\.comandi, req\.body\.ids\)/, 'il server cambia solo le righe mandate');
});

// I PERCORSI CHE IL PANNELLO INDICA ESISTONO. L'editor dei moduli e la pagina di
// ascolto mandavano in schede che non ci sono piu' («Diretta → Comandi a voce»,
// «Panoramica → permessi»). Ogni pezzo di un percorso deve essere il nome di un
// gruppo, di una famiglia o di una scheda del menu di oggi, e il primo un gruppo.
function oggetto(nome) {
  const i = APP.indexOf(`const ${nome} = {`);
  assert.ok(i >= 0, `manca ${nome}`);
  let d = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') d++;
    else if (APP[j] === '}') { d--; if (!d) return new Function(`return (${APP.slice(APP.indexOf('{', i), j + 1)})`)(); }
  }
  return {};
}

test('i percorsi dell\'editor dei moduli e della pagina di ascolto sono quelli del menu', () => {
  const gruppi = new Set(Object.values(oggetto('T_GRUPPO')).map((v) => v[0]));
  const nomi = new Set([...gruppi, ...Object.values(oggetto('T_SCHEDA')).map((v) => v[0]),
    ...[...APP.matchAll(/\{ id: '[a-z]+', nome: '([^']+)', parti: \[/g)].map((m) => m[1])]);
  const pulito = (x) => x.replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
  const percorsi = [];
  const dove = corpo('function disegnaCampiQuando(t)') + corpo('function disegnaCampiAzione(a)');
  for (const m of dove.matchAll(/<strong>([^<]*→[^<]*)<\/strong>/g)) percorsi.push(m[1]);
  const VOCE = leggi('src/web/public/voce.js');
  for (const m of VOCE.matchAll(/([A-Za-zÀ-ÿ&; ]+(?: → [A-Za-zÀ-ÿ&; ]+)+)/g)) percorsi.push(m[1]);
  assert.ok(percorsi.length >= 6, `i percorsi si leggono (${percorsi.length})`);
  for (const p of percorsi) {
    const pezzi = p.split('→').map(pulito);
    // il primo pezzo e' la fine della frase che lo porta («… da Chat e pubblico»)
    pezzi[0] = [...gruppi].find((g) => pezzi[0].endsWith(g)) || pezzi[0];
    assert.ok(gruppi.has(pezzi[0]), `«${p}»: «${pezzi[0]}» non e' un gruppo del menu`);
    for (const x of pezzi) assert.ok(nomi.has(x), `«${p}»: «${x}» non e' nel menu`);
  }
});

// Il giro della scheda Comandi vocali: il passo sul microfono punta al tasto che
// apre la pagina di ascolto, non all'interruttore dei momenti salienti (che e'
// l'ascolto del server e col microfono non c'entra).
test('il passo sul microfono punta al tasto che apre l\'ascolto vocale', () => {
  const i = APP.indexOf('const GUIDE = {');
  const guida = APP.slice(APP.indexOf('  ascolto: {', i), APP.indexOf(']] },', APP.indexOf('  ascolto: {', i)));
  const passo = [...guida.matchAll(/\['([^']*microfono[^']*)', '[^']*', '[^']*', '(#[a-z0-9-]+)'\]/gi)][0];
  assert.ok(passo, 'c\'e\' un passo che parla del microfono');
  const id = passo[2].slice(1);
  assert.match(APP, new RegExp(`<a [^>]*id="${id}"[^>]*href="/voce\\.html"`), `#${id} e' il tasto che apre la pagina di ascolto`);
});
