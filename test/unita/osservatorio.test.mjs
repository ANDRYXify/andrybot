// L'OSSERVATORIO. Il registro era console.log con un timestamp: buono per
// leggere una riga, inutile per rispondere alla domanda che conta su un
// prodotto in abbonamento — «cosa sta fallendo, da quando, quanto spesso?».
// Senza quella risposta un difetto non diventa una segnalazione: diventa uno
// che smette di pagare senza dire niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creaOsservatorio } from '../../src/osservatorio.js';

const orologio = () => { let t = 1_000_000_000; return { ora: () => t, avanti: (ms) => { t += ms; } }; };

test('conta per area e ricorda l’ultimo messaggio', () => {
  const o = creaOsservatorio();
  o.annota('alerts', 'overlay non raggiungibile');
  o.annota('alerts', 'token scaduto');
  o.annota('telegram', 'webhook 502');
  const r = o.riepilogo();
  assert.equal(r.totale, 3);
  const alerts = r.aree.find((a) => a.area === 'alerts');
  assert.equal(alerts.totale, 2);
  assert.equal(alerts.ultimoTesto, 'token scaduto');
});

test('le aree più calde vengono prima', () => {
  const o = creaOsservatorio();
  o.annota('telegram', 'x');
  for (let i = 0; i < 5; i++) o.annota('alerts', 'y');
  assert.equal(o.riepilogo().aree[0].area, 'alerts');
});

test('ciò che è vecchio non sembra rotto adesso', () => {
  const c = orologio();
  const o = creaOsservatorio({ ora: c.ora });
  for (let i = 0; i < 10; i++) o.annota('spotify', 'ieri');
  c.avanti(25 * 3600_000);
  o.annota('alerts', 'adesso');
  const r = o.riepilogo({ finestraMs: 3600_000 });
  assert.equal(r.aree.find((a) => a.area === 'spotify').recenti, 0, "l'area di ieri non conta come recente");
  assert.equal(r.aree.find((a) => a.area === 'spotify').totale, 10, 'ma lo storico resta');
  assert.equal(r.aree.find((a) => a.area === 'alerts').recenti, 1);
});

test('«in sofferenza» sono le aree che sbagliano adesso e ripetutamente', () => {
  const c = orologio();
  const o = creaOsservatorio({ ora: c.ora });
  o.annota('telegram', 'un errore isolato');
  for (let i = 0; i < 8; i++) o.annota('alerts', 'ripetuto');
  const s = o.inSofferenza({ almeno: 5 });
  assert.deepEqual(s.map((a) => a.area), ['alerts']);
  assert.equal(o.inSofferenza({ almeno: 20 }).length, 0, 'la soglia si rispetta');
});

test('la memoria non cresce senza fine', () => {
  const o = creaOsservatorio({ tieni: 10, maxAree: 3 });
  for (let i = 0; i < 100; i++) o.annota('alerts', 'errore ' + i);
  assert.equal(o.riepilogo().ultimi.length <= 10, true, 'gli ultimi sono un anello');
  for (let i = 0; i < 50; i++) o.annota('area' + i, 'x');
  assert.ok(o.riepilogo().aree.length <= 3, 'e le aree hanno un tetto');
});

test('un messaggio lunghissimo viene tagliato', () => {
  const o = creaOsservatorio();
  o.annota('web', 'x'.repeat(5000));
  assert.ok(o.riepilogo().aree[0].ultimoTesto.length <= 300);
});

test('niente area, niente messaggio: non cade', () => {
  const o = creaOsservatorio();
  assert.doesNotThrow(() => { o.annota(); o.annota(null, null); o.annota('', undefined); });
  assert.equal(o.riepilogo().aree[0].area, 'generale');
});
