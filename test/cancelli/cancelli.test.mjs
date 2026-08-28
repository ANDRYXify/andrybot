// I CANCELLI come prove: quello che prima si lanciava a mano (e quindi ogni
// tanto non si lanciava) qui gira a ogni `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lanciaScript } from '../aiuto.mjs';

test('niente che si dichiari privato finisce su git', async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-riservati.mjs');
  assert.equal(codice, 0, uscita);
});

test('nessun commento nei file che arrivano al browser', async () => {
  const { codice, uscita } = await lanciaScript('scripts/spoglia-commenti.mjs', ['--verifica']);
  assert.equal(codice, 0, uscita);
});

test("browser e server sono d'accordo sui campi dello stile", async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-stile.mjs');
  assert.equal(codice, 0, uscita);
});

test('la libreria ha una porta in ogni campo media', async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-libreria.mjs');
  assert.equal(codice, 0, uscita);
});
