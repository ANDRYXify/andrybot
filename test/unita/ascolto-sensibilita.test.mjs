// MOMENTI SALIENTI: LA SENSIBILITA' VALE ANCHE A ASCOLTO PARTITO.
//
// La sensibilita' si leggeva una volta sola, quando l'ascolto partiva: salvata
// dopo, restava quella di prima fino alla diretta seguente. Il giro che ogni
// minuto rimette in fila gli ascolti ora la passa anche a quelli gia' in piedi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-ascolto-');
test.after(() => usaEGetta.pulisci());
const { streamers, accessi } = await import('../../src/db.js');
const { LiveListener } = await import('../../src/stream/listener.js');
const { BotManager } = await import('../../src/bot.js');

// Un ascolto finto che ha gia' imparato il volume normale, e un salto di 8 LU:
// abbastanza con la sensibilita' 10, poco con la 1.
function scatta(l) {
  let scatti = 0;
  l.onSpike = () => { scatti++; };
  l._startedAt = Date.now() - 60_000;
  l._baseline = -30;
  l._ultimoPicco = 0;
  l._onLoudness(-22);
  return scatti;
}

test('cambiare sensibilita\' a un ascolto in corso cambia quello che prende', () => {
  const l = new LiveListener({ login: 'canale', sensibilita: 1 });
  assert.equal(scatta(l), 0, 'con 1 un salto di 8 LU non basta');
  assert.equal(l.impostaSensibilita(10), true);
  assert.equal(scatta(l), 1, 'con 10 si');
  assert.equal(l.impostaSensibilita(10), false, 'la stessa non cambia niente');
});

test('il giro degli ascolti passa la sensibilita\' salvata a quello gia\' partito', async () => {
  streamers.request('canale', 'Canale', '1');
  streamers.setStatus('canale', 'approved');
  accessi.set('canale', { modo: 'tutto' });
  streamers.setSettings('canale', { ascoltoLive: true, ascoltoSensibilita: 9 });
  const inPiedi = new LiveListener({ login: 'canale', sensibilita: 3 });
  const finto = { running: true, listeners: new Map([['canale', inPiedi]]), helix: { getStream: async () => { throw new Error('non serve'); } } };
  await BotManager.prototype.reconcileListeners.call(finto);
  assert.equal(finto.listeners.get('canale'), inPiedi, 'non lo riavvia');
  assert.equal(inPiedi.sensibilita, 9, 'ma gli passa la sensibilita\' nuova');
});
