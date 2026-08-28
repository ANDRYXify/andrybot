// LA SALUTE dell'istanza. Prima /health rispondeva `ok: true` e basta: diceva
// «il processo risponde», non «il prodotto funziona». Se cadeva la chat di
// tutti restava verde. Qui si controlla che ora dica la verità — e che non
// gridi al lupo, perché un monitor che sveglia per niente si impara a ignorare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('salute-');
const { db } = await import('../../src/db.js');
const { salute, contaRifiuto } = await import('../../src/salute.js');
test.after(() => casa.pulisci());

const finto = (st) => ({ status: () => st });
const SPENTO = { running: false, channels: [], connessi: [], chatKO: [] };
const SANO = { running: true, channels: ['alfa', 'beta'], connessi: ['alfa', 'beta'], chatKO: [] };

test('senza manager non inventa niente sulla chat', () => {
  const s = salute({ forza: true });
  assert.equal(s.dettaglio.chat.noto, false);
  assert.equal(s.ok, true);
});

test('con tutto a posto è sano', () => {
  const s = salute({ manager: finto(SANO), forza: true });
  assert.equal(s.dettaglio.chat.connesse, 2);
  assert.deepEqual(s.motivi.filter((m) => m.includes('chat')), []);
});

test('nessuna chat connessa: degradato, ma non guasto', () => {
  const s = salute({ manager: finto({ ...SANO, connessi: [] }), forza: true });
  assert.equal(s.ok, true, 'resta 200: non si sveglia nessuno per una riconnessione');
  assert.ok(s.motivi.some((m) => m.includes('nessuna chat connessa')));
});

test('bot spento: non è un degrado, è una scelta', () => {
  const s = salute({ manager: finto(SPENTO), forza: true });
  assert.equal(s.motivi.filter((m) => m.includes('chat')).length, 0);
});

test('un canale da ricollegare si vede', () => {
  const s = salute({ manager: finto({ ...SANO, chatKO: ['beta'] }), forza: true });
  assert.ok(s.motivi.some((m) => m.includes('ricollegare')));
  assert.equal(s.dettaglio.chat.daRicollegare, 1);
  assert.equal(s.ok, true, 'uno streamer da ricollegare non è un guasto dell’istanza');
});

test('i rifiuti non gestiti si contano', () => {
  const prima = salute({ forza: true }).dettaglio.rifiutiNonGestiti;
  contaRifiuto(); contaRifiuto();
  assert.equal(salute({ forza: true }).dettaglio.rifiutiNonGestiti, prima + 2);
});

test('il dettaglio non esce mai da /health', () => {
  // la forma che l'endpoint pubblico manda fuori: tre campi, nessun nome
  const s = salute({ manager: finto({ ...SANO, chatKO: ['beta'] }), forza: true });
  const pubblico = JSON.stringify({ ok: s.ok, stato: s.stato, uptime: s.uptime });
  assert.doesNotMatch(pubblico, /alfa|beta|motivi|chat/, 'niente nomi, niente conteggi, niente motivi');
});

test('database non scrivibile: guasto, e /health risponde 503', () => {
  db.close();
  const s = salute({ manager: finto(SANO), forza: true });
  assert.equal(s.stato, 'guasto');
  assert.equal(s.ok, false, 'questo sì che deve diventare rosso');
  assert.ok(s.motivi.some((m) => m.includes('database')));
});

// --- la vigilanza: non al primo inciampo, ma senza restare mezzi vivi -------
const { creaVigilanza } = await import('../../src/salute.js');

test('un guasto passeggero non butta giù niente', () => {
  let uscito = 0;
  const v = creaVigilanza({ soglia: 3, esci: () => uscito++ });
  v.giro('guasto');
  v.giro('sano');
  v.giro('guasto');
  v.giro('degradato');
  assert.equal(uscito, 0, 'due inciampi separati non bastano');
  assert.equal(v.diFila, 0, 'il contatore si azzera appena torna a posto');
});

test('un guasto che persiste fa uscire il processo', () => {
  let uscito = 0;
  const v = creaVigilanza({ soglia: 3, esci: () => uscito++ });
  v.giro('guasto'); assert.equal(uscito, 0);
  v.giro('guasto'); assert.equal(uscito, 0);
  v.giro('guasto'); assert.equal(uscito, 1, 'alla terza di fila se ne va');
});

test('degradato non fa mai uscire', () => {
  let uscito = 0;
  const v = creaVigilanza({ soglia: 2, esci: () => uscito++ });
  for (let i = 0; i < 10; i++) v.giro('degradato');
  assert.equal(uscito, 0);
});

test('il rientro si annuncia una volta sola', () => {
  const detto = [];
  const v = creaVigilanza({ soglia: 5, esci: () => {}, avvisa: (m) => detto.push(m) });
  v.giro('guasto'); v.giro('sano'); v.giro('sano'); v.giro('sano');
  assert.equal(detto.filter((m) => m.includes('rientrato')).length, 1);
});
