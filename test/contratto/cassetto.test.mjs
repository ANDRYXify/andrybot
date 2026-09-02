// NEL CASSETTO NON CI VANNO TENDINE.
//
// Il cassetto del telefono scorre (overflow-y: auto), quindi RITAGLIA: un menu a
// tendina aperto li' dentro viene tagliato. Succedeva col «?»: si apriva una
// tendina piu' larga del cassetto, e sul telefono si leggeva mezza parola —
// «de», «nuali», «vità» al posto di Guide, Manuali, Novità.
//
// La cura non e' spostare la tendina di qualche pixel: e' che dentro un elenco
// non ci vanno tendine. Il cassetto E' gia' un elenco, e le voci ci stanno
// dentro come righe.
//
// Il collaudo che misura davvero (a cassetto fermo, in un browser vero) sta in
// scripts/verifica-barra.mjs. Questo qui e' il controllo statico che costa
// nulla: nella composizione del cassetto non deve comparire una tendina.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const composizione = () => {
  const i = APP.indexOf('if (areaMob) areaMob.innerHTML = `<span class="chip-utente">');
  assert.ok(i > 0, 'la composizione del cassetto si trova');
  return APP.slice(i, APP.indexOf('\n', i));
};

test('la composizione del cassetto non monta tendine', () => {
  const riga = composizione();
  for (const tendina of ['switch-canale-menu', 'aiuto-menu', 'grp-menu', 'switch-canale-box']) {
    assert.ok(!riga.includes(tendina), `nel cassetto non c'è «${tendina}»`);
  }
});

test('e l\'aiuto ci sta come elenco, con le sue voci', () => {
  const riga = composizione();
  assert.ok(riga.includes('aiutoNelCassetto()'), 'l\'aiuto è quello del cassetto');
  const i = APP.indexOf('function aiutoNelCassetto()');
  const corpo = APP.slice(i, APP.indexOf('\n}', i));
  assert.ok(corpo.includes('drawer-voce'), 'le voci sono righe del cassetto');
  assert.ok(corpo.includes('vociAiuto()'), 'e vengono dallo stesso elenco della barra');
  assert.ok(corpo.includes('aiutoDi(schedaAttiva)'), 'con in cima quella della scheda che stai guardando');
});

test('le voci dell\'aiuto sono le stesse in barra e nel cassetto', () => {
  const i = APP.indexOf('function vociAiuto()');
  const corpo = APP.slice(i, APP.indexOf('\n}', i));
  for (const via of ['/guide', '/manuale', '/novita']) {
    assert.ok(corpo.includes(`'${via}'`), `l'elenco porta a ${via}`);
  }
  assert.equal(APP.split('vociAiuto()').length - 1, 3, 'un elenco solo, usato da tutti e due');
});

test('cambiare canale dal cassetto funziona come dalla barra', () => {
  assert.ok(APP.includes("document.querySelectorAll('[data-canale]')"),
    'il clic si lega al dato, non alla forma della tendina');
});
