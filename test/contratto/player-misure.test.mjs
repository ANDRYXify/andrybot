// IL PLAYER, PEZZO PER PEZZO.
//
// Il player e' uno scheletro in em: la Dimensione da' il corpo del carattere, il
// Corpo le proporzioni, e ogni parte e' un multiplo. La liberta' chiesta e' un
// fattore per parte sopra lo scheletro, e a scelta un colore per parte. La
// regola che regge tutto: UNA lista di pezzi, UN traduttore da configurazione a
// variabili CSS, letto da tutte e due le pagine. Qui si guarda che la lista sia
// una sola davvero, che il CSS usi solo variabili che il traduttore produce, e
// che a 100 il foglio risolva ai valori di prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const STILE = leggi('src/web/stile.js');
const PRESET = leggi('src/web/public/presets.js');
const SKIN = leggi('src/web/public/overlay-skin.css');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const GATE = leggi('scripts/verifica-anteprima.mjs');

const lista = (src, nome) => { const m = src.match(new RegExp(`const ${nome} = \\[([^\\]]*)\\]`)); return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : null; };

test('i pezzi del player sono una lista sola, uguale sul server e nel browser', () => {
  assert.deepEqual(lista(STILE, 'MISURE_MUS'), lista(PRESET, 'MISURE_MUS'));
  assert.deepEqual(lista(STILE, 'COLORI_MUS'), lista(PRESET, 'COLORI_MUS'));
  assert.deepEqual(lista(STILE, 'PARTI_MUS'), lista(PRESET, 'PARTI_MUS'));
  assert.deepEqual(lista(STILE, 'LARGHE_MUS'), lista(PRESET, 'LARGHE_MUS'));
  const def = (src) => (src.match(/const PARTI_DEF = (\{.*\});/) || [])[1];
  assert.ok(def(STILE) && def(STILE) === def(PRESET), 'i posti di serie delle parti sono scritti uguali sul server e nel browser');
  assert.ok(/parti: normPartiMusica\(m\.parti\),/.test(STILE) && /parti: _partiDef\(\)/.test(APP), 'il server pulisce le parti e il pannello parte dai posti di serie');
  assert.ok(/misure: normMisureMusica\(m\.misure\),\n    colori: normColoriMusica\(m\.colori\),/.test(STILE), 'il server pulisce misure e colori con la stessa lista');
  assert.ok(/misure: _misureDef\(\), colori: _coloriDef\(\)/.test(APP), 'il pannello parte con misure a 100 e colori spenti');
  assert.ok(/for \(const k of _PV\(\)\.misure\) o\[k\] = 100;/.test(APP) && /return _PV\(\)\.misure\.map\(/.test(APP) && /return _PV\(\)\.colori\.map\(/.test(APP), 'i campi del pannello nascono dalla lista, non da un secondo elenco');
});

test('un traduttore solo, letto dalla tela e dalla diretta', () => {
  assert.equal((APP.match(/window\.PLAYER_VARS\.applica\(box, cfg\)/g) || []).length, 1, 'la tela lo chiama');
  assert.equal((OVL.match(/window\.PLAYER_VARS\.applica\(el, cfg\)/g) || []).length, 1, 'la diretta lo chiama');
  const i = OVL.indexOf('window.PLAYER_VARS.applica(el, cfg)');
  assert.ok(i > 0 && i < OVL.indexOf('misuraScorrimento(el, cfg);', i), 'in diretta le misure vanno su prima di misurare lo scorrimento');
  assert.ok(/else el\.style\.removeProperty\(VAR_MIS\[k\]\);/.test(PRESET) && /else el\.style\.removeProperty\(VAR_COL\[k\]\);/.test(PRESET), 'una misura tornata a 100, o un colore spento, toglie la variabile: l\'elemento vive fra un disegno e l\'altro');
});

test('il CSS usa solo variabili che il traduttore produce, e le usa tutte', () => {
  const prodotte = new Set([...PRESET.matchAll(/'(--[kcp]-[a-z]+(?:-[a-z]+)*)'/g)].map((m) => m[1]));
  const usate = new Set([...SKIN.matchAll(/var\((--[kcp]-[a-z]+(?:-[a-z]+)*)/g)].map((m) => m[1]));
  for (const v of usate) assert.ok(prodotte.has(v), `il CSS legge ${v} che nessuno scrive`);
  for (const v of prodotte) assert.ok(usate.has(v), `${v} si scrive ma il CSS non la legge`);
  assert.equal((SKIN.match(/--cov: /g) || []).length, 1, 'la copertina ha una misura sola, derivata');
  assert.ok(/\.ovl-musica \{\n  --cov-base: 4\.5em;\n  --cov: calc\(var\(--cov-base\) \* var\(--k-cov, 1\)\);/.test(SKIN), 'ogni tema e corpo dice la base, il fattore si applica in un posto');
  for (const v of usate) assert.ok(new RegExp(`var\\(${v}, `).test(SKIN), `${v} ha sempre un ripiego: senza variabile il foglio vale come prima`);
  // il ripiego di ogni parte nel foglio e' il posto di serie: una verita' sola
  const PARTI_DEF = (0, eval)('(' + (STILE.match(/const PARTI_DEF = (\{.*\});/) || [])[1] + ')');
  const ALLINEA = { sinistra: 'left', centro: 'center', destra: 'right' };
  for (const [k, p] of Object.entries(PARTI_DEF)) for (const [a, d] of Object.entries(p)) {
    const ripieghi = [...new Set([...SKIN.matchAll(new RegExp(`var\\(--p-${k}-${a}, ([^)]+)\\)`, 'g'))].map((m) => m[1]))];
    assert.deepEqual(ripieghi, [String(a === 'a' ? ALLINEA[d] : d)], `--p-${k}-${a}: il foglio ripiega su ${ripieghi} e non su ${d}`);
  }
});

test('nella disposizione libera ogni pezzo e\' posato sulla corsa dello spazio interno, e le righe hanno una larghezza', () => {
  for (const p of ['.m-cover', '.m-riga', '.m-riga2', '.m-barra', '.m-tempi', '.m-onde']) {
    const r = SKIN.match(new RegExp(`^\\.ovl-musica\\.verso-libera ${p.replace('.', '\\.')} \\{([^}]*)\\}`, 'm'));
    assert.ok(r, p + ' ha la sua regola in libera');
    assert.match(r[1], /left: calc\(var\(--m-ipx\) \+ \(100% - 2 \* var\(--m-ipx\)\) \* var\(--p-[a-z]+-x, [\d.]+\) \/ 100\);/, p + ' corre dentro il padding in orizzontale');
    assert.match(r[1], /translate: calc\(var\(--p-[a-z]+-x, [\d.]+\) \* -1%\) calc\(var\(--p-[a-z]+-y, [\d.]+\) \* -1%\);/, p + ' sottrae la sua misura: 100 e\' a filo');
    if (['.m-riga', '.m-riga2', '.m-barra'].includes(p)) assert.match(r[1], /width: calc\(\(100% - 2 \* var\(--m-ipx\)\) \* var\(--p-[a-z]+-w, [\d.]+\) \/ 100\);/, p + ' ha una larghezza in centesimi dell\'interno');
  }
  assert.match(SKIN, /\.ovl-musica\.verso-libera \{[^}]*min-width: calc\(var\(--p-scatola-w, 22\) \* 1em\); min-height: calc\(var\(--p-scatola-h, 5\.5\) \* 1em\);/, 'la scatola naturale della libera e\' quella misurata al passaggio, in em');
  assert.match(SKIN, /\.ovl-musica\.verso-libera\.tema-cassetta \.m-cover \{ width: calc\(\(100% - 2 \* var\(--m-ipx\)\) \* var\(--p-cover-w, 100\) \/ 100\); \}/, 'nella cassetta il nastro ha una larghezza sua');
  assert.ok(APP.includes('out.scatola = _scatolaNaturale(box);'), 'il passaggio misura anche la scatola');
  assert.match(SKIN, /\.ovl-musica\.verso-libera \.m-corpo, \.ovl-musica\.verso-libera \.m-sotto \{ display: contents; \}/, 'colonna e riga di sotto spariscono come scatole: i pezzi corrono da soli');
  assert.match(SKIN, /\.ovl-musica\.verso-libera\.cambia \.m-riga/, 'il cambio brano anima i pezzi, non una scatola che non c\'e\' piu\'');
  assert.ok(/--m-ipx: calc\(var\(--m-px\) \* var\(--k-sfondo, 1\)\)/.test(SKIN) && (SKIN.match(/padding: calc\(var\(--m-py\) \* var\(--k-sfondo, 1\)\) calc\(var\(--m-px\) \* var\(--k-sfondo, 1\)\)/g) || []).length >= 4, 'lo spazio attorno e\' un valore solo per corpo, letto dal padding e dalla corsa');
  assert.ok(/verso: unoDi\(m\.verso, VERSO_MUS, 'riga'\)/.test(STILE) && /'libera'\]/.test(STILE.match(/export const VERSO_MUS = \[[^\]]*\]/)[0]), 'il server accetta «libera»');
  assert.ok(/\['libera', L\('libera: ogni pezzo dove vuoi'/.test(APP), 'la tendina la offre');
  for (const f of ['_liberaIlPlayer', '_partiMisurate', '_trascinaParte', '_tiraLarghezza', '_disegnaParti', '_mostraParti']) assert.ok(APP.includes('function ' + f + '('), f + ' esiste');
  assert.ok(/parti: ELEM\('musica'\) \? _cfgEl\('musica'\)\.parti \|\| null : null/.test(APP), 'annulla e ripeti ricordano le parti');
  assert.ok(/verso: 'libera', larghezza: 0 \}/.test(GATE) && /disposizione libera nel riquadro/.test(GATE) && /const libera = false;/.test(GATE), 'il cancello misura la libera, di qua e di la\' e contro il numero, e sa quando il traduttore la ignora');
});

test('una variabile non piu\' chiesta si toglie, di qua e di la\'', () => {
  assert.ok(/el\.style\.setProperty\(k, x\); else el\.style\.removeProperty\(k\); \} \}/.test(APP), 'la tela toglie la variabile quando il valore e\' nullo');
  assert.ok(/el\.style\.setProperty\(k, String\(vars\[k\]\)\); else el\.style\.removeProperty\(k\); \} \}/.test(OVL), 'la diretta pure');
  assert.ok(!/max-width: 27em/.test(SKIN) && !/max-width: 22em/.test(SKIN), 'la carta non ha un tetto che ruba spazio alla colonna del testo');
});

test('il cancello dell\'anteprima misura i pezzi e sa quando la diretta li ignora', () => {
  assert.ok(/in diretta il player ignora le misure scelte pezzo per pezzo/.test(GATE), 'l\'autoprova toglie la chiamata in diretta');
  assert.ok(/misure assenti = misure a 100/.test(GATE) && /ogni misura fa quello che dice/.test(GATE), 'e il cancello guarda che 100 sia come prima e che i fattori derivino');
});
