// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI EFFETTI PER GLI EVENTI NEL PANNELLO (docs/EFFETTI-SCHERMO.md, «Effetti per
// gli eventi»).
//
// Il motore sta in src/features/effetti-eventi.js; il pannello lo deve seguire,
// non tenerne una copia che invecchia. Le promesse:
//  · gli eventi del pannello e della demo sono quelli del motore, nello stesso
//    ordine, coi limiti del motore, e ognuno ha il suo nome in tre lingue;
//  · un solo editor degli effetti pronti: la carta dei pronti e ogni livello di
//    un evento usano lo stesso pezzo, con gli id col prefisso;
//  · ogni alert dello Studio dice quale effetto parte e porta al suo foglio, e
//    ogni foglio porta all'alert giusto;
//  · la scheda Effetti ha le sue parti, e la carta degli eventi sta in una;
//  · le rotte salvano solo per chi ha gli Effetti, e ripuliscono le scelte con
//    una funzione sola;
//  · niente emoji nel pezzo nuovo del pannello.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const E = await import('../../src/features/effetti-eventi.js');

function valore(inizio) {
  const i = APP.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const apre = APP.slice(i + inizio.length).search(/[[{]/) + i + inizio.length;
  const [a, c] = APP[apre] === '[' ? ['[', ']'] : ['{', '}'];
  let d = 0;
  for (let j = apre; j < APP.length; j++) {
    if (APP[j] === a) d++;
    else if (APP[j] === c && --d === 0) return APP.slice(apre, j + 1);
  }
  throw new Error(`${inizio} non si chiude`);
}
const leggi = (inizio, ambiente = {}) => new Function(...Object.keys(ambiente), `return (${valore(inizio)})`)(...Object.values(ambiente));
function funzione(nome) {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `non trovo ${nome}`);
  let liv = 0;
  for (let j = APP.indexOf(') {', i) + 2; j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) return APP.slice(i, j + 1);
  }
  throw new Error(`${nome} non si chiude`);
}

test('gli eventi del pannello e della demo sono quelli del motore, coi suoi limiti, e ognuno ha un nome in tre lingue', () => {
  const ids = E.EVENTI.map((e) => e.id);
  assert.deepEqual(leggi('const EE_ORDINE = '), ids);
  assert.deepEqual(leggi('const _DEMO_EVENTI = '), E.EVENTI.map((e) => ({ ...e })));
  assert.deepEqual(leggi('const _DEMO_LIMITI_EVENTI = '), { livelli: E.MAX_LIVELLI, da: E.MAX_DA, pausa: E.MAX_PAUSA });
  for (const lingua of [0, 1, 2]) {
    const nomi = leggi('const EE_NOMI = () => ', { L: (...x) => x[lingua] });
    assert.deepEqual(Object.keys(nomi), ids, 'un nome per ogni evento, nello stesso ordine');
    for (const id of ids) assert.ok(typeof nomi[id] === 'string' && nomi[id].length > 1, `${id} ha un nome nella lingua ${lingua}`);
  }
  const primo = leggi('const EE_PRIMO = ');
  const scala = leggi('const EE_SCALA = ');
  for (const e of E.EVENTI) {
    assert.ok(primo[e.id], `${e.id} ha un effetto di partenza`);
    if (e.quanto) assert.ok(scala[e.id]?.length && scala[e.id].every((n, i, a) => n >= 0 && n <= E.MAX_DA && (!i || n > a[i - 1])), `${e.id}: la scala dei livelli sale`);
  }
});

test('un solo editor degli effetti pronti, con gli id col prefisso', () => {
  assert.equal(APP.match(/function editorPronto\(/g)?.length, 1);
  assert.equal(APP.match(/class="pronti-voce"/g)?.length, 1, 'la galleria si disegna in un posto solo');
  assert.equal(APP.match(/class="pronti-tela"/g)?.length, 1, 'l\'anteprima grande si disegna in un posto solo');
  assert.match(funzione('disegnaPronti'), /editorPronto\(gal, ed, st, \{\s*pre: 'pronti'/, 'la carta dei pronti usa l\'editor');
  assert.match(funzione('_eeRendiCorpo'), /editorPronto\(gal, ed, _eeLivelloSt\(l\), \{ pre: `ee-\$\{ev\}-\$\{i\}`/, 'ogni livello usa lo stesso editor, col suo prefisso');
  const ed = funzione('editorPronto');
  assert.doesNotMatch(ed, /id="pronti-/, 'dentro l\'editor nessun id fisso: due editor nella pagina non si pestano');
  for (const campo of ['durata', 'suono', 'volume', 'quanti-et']) assert.ok(ed.includes('${pre}-' + campo), `il campo ${campo} ha il prefisso`);
});

test('ogni alert dello Studio dice quale effetto parte, e i due fogli si portano a vicenda', () => {
  assert.match(funzione('bloccoAlert'), /data-al-effetto="\$\{t\.key\}">\$\{_alEffettoRiga\(t\.key\)\}/);
  const tipi = leggi('const ALERT_TIPI = () => ', { L: (a) => a }).map((t) => t.key);
  const verso = leggi('const EE_ALERT = ');
  for (const e of E.EVENTI) {
    if (e.id === 'treno') { assert.equal(verso[e.id], undefined, 'il treno non ha un alert'); continue; }
    assert.ok(tipi.includes(verso[e.id]), `${e.id} porta a un alert che c'è (${verso[e.id]})`);
  }
  for (const k of tipi) assert.ok(Object.values(verso).includes(k), `l'alert ${k} ha un evento`);
  assert.match(funzione('_alEffettoRiga'), /kind === 'sub' \? \['sub', 'regalo'\]/, 'l\'alert degli abbonamenti dice anche dei regali');
  assert.match(funzione('_eeContesto'), /data-ee-studio="\$\{k\}"/);
  assert.match(funzione('apriEffettoEvento'), /localStorage\.setItem\('sotto:effetti', 'eventi'\)/, 'il link apre la parte giusta');
});

test('la scheda Effetti ha le sue parti, e la carta degli eventi sta in quella degli eventi', () => {
  const parti = leggi('const SOTTO_SCHEDE = ').effetti.voci.map(([id]) => id);
  assert.deepEqual(parti, ['tuoi', 'eventi', 'punti', 'webcam']);
  const i = APP.indexOf('function pannelloEffetti()');
  const scheda = APP.slice(i, APP.indexOf('\n}', i));
  const carte = [...scheda.matchAll(/<div class="carta"([^>]*)>/g)].map((m) => m[1].match(/data-zona="([^"]+)"/)?.[1]);
  assert.ok(carte.length >= 8, `le carte si trovano (${carte.length})`);
  assert.ok(carte.every((z) => parti.includes(z)), `ogni carta sta in una parte: ${carte}`);
  for (const p of parti) assert.ok(carte.includes(p), `la parte ${p} ha almeno una carta`);
  assert.match(scheda, /id="eventi-effetti-carta" data-zona="eventi"/);
  assert.match(scheda, /id="pronti-carta" data-zona="tuoi"/);
  assert.equal(funzione('usaPerEvento').match(/scegliSotto\('effetti', 'eventi'\)/g)?.length, 2, '«Usalo per un evento» porta alla parte degli eventi, anche quando i livelli sono pieni');
});

test('le rotte: solo con gli Effetti, e le scelte ripulite da una funzione sola', () => {
  for (const via of ["'/api/streamer/effetti-eventi'", "'/api/streamer/effetti-eventi/prova'"]) {
    const i = SRV.indexOf(`app.post(${via}`);
    assert.ok(i >= 0, `manca ${via}`);
    assert.match(SRV.slice(i, i + 300), /esigiFunzione\(req, res, 'effetti'/, `${via} chiede gli Effetti`);
  }
  assert.equal(SRV.match(/normalizzaEffettiEventi\(/g)?.length, 1, 'una funzione sola ripulisce');
  assert.ok(SRV.match(/effettiEventiDi\(login, /g)?.length >= 4, 'la usano lettura, salvataggio, prova e /api/me');
});

test('niente emoji nel pezzo nuovo del pannello', () => {
  const da = APP.indexOf('function _prontiNuovo(');
  const a = APP.indexOf("const b = ev.target.closest?.('[data-ee-vai]');");
  assert.ok(da > 0 && a > da);
  const pezzo = APP.slice(da, a);
  const emoji = pezzo.match(/\p{Extended_Pictographic}/gu) || [];
  assert.deepEqual(emoji.filter((c) => c !== '✓' && c !== '×'), [], 'solo i segni già in uso (spunta e croce), nessuna emoji');
});
