// IL GIRO GUIDATO DEVE INSEGNARE, NON DESCRIVERE IL MOBILIO.
//
// Prima le tappe si leggevano dalla pagina: una per carta, col titolo della
// carta e la sua prima frase. Non poteva invecchiare — ma non insegnava
// niente: raccontava dov'erano le cose, non come si fanno. Era un giro
// panoramico.
//
// Ora ogni tappa e' un PASSO della ricetta della scheda (GUIDE[id].come) e
// porta con se' l'ancora del controllo che nomina: il faro si accende li',
// aprendo quel che e' chiuso. Il prezzo e' che un giro scritto puo'
// invecchiare, e il contrappeso e' `scripts/verifica-giro.mjs`, che apre ogni
// scheda in un browser vero e verifica che ogni ancora esista ancora.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const fn = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i > 0, `c'è ${nome}`);
  return APP.slice(i, APP.indexOf('\n}', i));
};
const GUIDA = (() => {
  const i = APP.indexOf('const GUIDE = {');
  return APP.slice(i, APP.indexOf('\n};', i));
})();
const schedeGuida = [...GUIDA.matchAll(/^ {2}([a-zA-Z0-9_]+): \{/gm)].map((m) => m[1]);

test('ogni tappa è un passo da fare, non una carta da guardare', () => {
  const t = fn('tappeDi');
  assert.ok(t.includes('g.come'), 'le tappe sono i passi della scheda');
  assert.ok(t.includes("sel: c[3]"), 'ognuno porta con sé il controllo di cui parla');
  assert.ok(!t.includes(':scope > .carta'), 'e non si fa più il giro delle carte');
  assert.ok(!APP.includes('function testoCarta'), 'né si pesca la prima frase che capita');
  assert.ok(t.includes('aiutoDi(id)'), 'l’ultima tappa porta alla guida o al manuale');
});

test('il faro apre quello che è chiuso, invece di puntare a un pannello richiuso', () => {
  const p = fn('_puntaTappa');
  assert.ok(p.includes("closest('details')") && p.includes('d.open = true'), 'apre i pieghevoli attorno al bersaglio');
  assert.ok(p.includes('offsetParent') && p.includes('getClientRects'), 'e non punta a ciò che non si vede');
  const d = fn('_dovePasso');
  assert.ok(d.includes("querySelector('h2, summary h3, h3')"), 'il titolo della tappa è il posto dove sei');
});

// Il difetto che questo impedisce: una scheda senza ricetta non aveva un giro
// da fare, e chi ci entrava per la prima volta restava a guardare.
test('ogni scheda del pannello ha la sua ricetta', () => {
  const schede = [...new Set([...APP.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]))]
    .filter((s) => s !== 'admin');
  const senza = schede.filter((s) => !schedeGuida.includes(s));
  assert.deepEqual(senza, [], 'nessuna scheda del prodotto resta senza passi');
});

test('ogni passo parla tre lingue e dice a cosa punta', () => {
  let totali = 0, conAncora = 0, corte = [];
  for (const scheda of schedeGuida) {
    const i = GUIDA.indexOf(`  ${scheda}: {`);
    const c = GUIDA.indexOf('come: [', i);
    const fine = GUIDA.indexOf(']] }', c);
    assert.ok(c > 0 && fine > c, `${scheda}: c'è la ricetta`);
    const dentro = GUIDA.slice(c + 'come: ['.length, fine + 1);
    const passi = [...dentro.matchAll(/\[((?:[^[\]\\]|\\.)*)\]/g)].map((m) => m[1]);
    assert.ok(passi.length >= 2, `${scheda}: almeno due passi`);
    for (const p of passi) {
      totali++;
      const pezzi = [...p.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
      const lingue = pezzi.slice(0, 3);
      const ancora = pezzi.length === 4 ? pezzi[3] : null;
      if (pezzi.length < 3 || pezzi.length > 4) corte.push(`${scheda}: «${pezzi[0] || p}» ha ${pezzi.length} pezzi`);
      else if (lingue.some((x) => x.startsWith('#'))) corte.push(`${scheda}: «${pezzi[0]}» ha perso una lingua`);
      else if (ancora !== null && ancora !== '' && !ancora.startsWith('#')) corte.push(`${scheda}: «${pezzi[0]}» ha un'ancora storta`);
      if (ancora && ancora.startsWith('#')) conAncora++;
    }
  }
  assert.deepEqual(corte, [], 'ogni passo dice la sua in italiano, inglese e spagnolo');
  assert.ok(totali >= 60, `i passi ci sono tutti: ${totali}`);
  assert.ok(conAncora >= totali * 0.8, `quasi tutti puntano a un controllo: ${conAncora} su ${totali}`);
});

test('si vede una volta, e si può rifare', () => {
  assert.match(APP, /const GIRO_MEMORIA = 'sb-giro'/, 'la memoria è locale');
  const p = fn('giroPossibile');
  assert.ok(p.includes('giroVisto(id)'), 'non ricomincia da solo');
  assert.ok(p.includes('_aiutoStriscia'), 'e non si accavalla con l’avviso della guida');
  assert.ok(p.includes('cookie-banner') && p.includes('benvenuto'), 'né col cookie o col benvenuto');
  assert.ok(APP.includes('data-rifai-giro'), 'dal «?» si rifà');
  assert.equal(APP.split('data-rifai-giro').length - 1, 3, 'in barra e nel cassetto, con un gestore solo');
});

test('non sopravvive a un cambio di scheda', () => {
  const r = fn('riavviaGiro');
  assert.ok(r.includes('if (_giro && _giro.id !== schedaAttiva) chiudiGiro(false)'),
    'le carte dell’altra scheda sono nascoste: la luce cadrebbe nel vuoto');
});

test('la luce insegue lo scorrimento invece di indovinare quando finisce', () => {
  assert.match(APP, /window\.addEventListener\('scroll', seguiGiro/, 'segue lo scorrimento');
  assert.ok(APP.includes('_giro.posiziona = posiziona'), 'riusando la stessa misura');
  assert.ok(!APP.includes('setTimeout(posiziona'), 'senza aspettare a occhio');
});

test('finire il giro conta come «so fare»', () => {
  const c = fn('chiudiGiro');
  assert.ok(c.includes("aiutoSegna(id, 'fatto', AIUTO_SA_FARE)"),
    'così l’avviso «c’è una guida» non arriva subito dopo');
});
