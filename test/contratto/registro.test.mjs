// Il gancio fra il registro e l'osservatorio. È il punto che rende inutile
// ricordarsene: se un modulo scrive un errore, quell'errore È già annotato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLog } from '../../src/logger.js';
import { osservatorio } from '../../src/osservatorio.js';

test('ogni log.error finisce nell’osservatorio, con la sua area', () => {
  osservatorio.azzera();
  const vero = console.error;
  console.error = () => {};
  try {
    makeLog('alerts').error('overlay non raggiungibile');
    makeLog('telegram').error('webhook', new Error('502 dal server'));
  } finally { console.error = vero; }

  const r = osservatorio.riepilogo();
  assert.equal(r.totale, 2);
  assert.ok(r.aree.some((a) => a.area === 'alerts'));
  const tg = r.aree.find((a) => a.area === 'telegram');
  assert.match(tg.ultimoTesto, /502 dal server/, "il messaggio dell'Error viene letto, non «[object Object]»");
});

test('info e warn non sporcano il registro degli errori', () => {
  osservatorio.azzera();
  const vLog = console.log;
  console.log = () => {};
  try { makeLog('bot').info('tutto bene'); makeLog('bot').warn('attenzione'); } finally { console.log = vLog; }
  assert.equal(osservatorio.riepilogo().totale, 0);
});

test('un oggetto non serializzabile non fa cadere il bot', () => {
  osservatorio.azzera();
  const ciclico = {}; ciclico.se = ciclico;
  const vero = console.error;
  console.error = () => {};
  try { assert.doesNotThrow(() => makeLog('web').error('rotto', ciclico)); } finally { console.error = vero; }
  assert.equal(osservatorio.riepilogo().totale, 1);
});
