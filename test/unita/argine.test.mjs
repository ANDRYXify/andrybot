// L'ARGINE. Due errori possibili e opposti: lasciar passare l'abuso, oppure
// fermare l'uso vero. Il secondo è peggio — un limite che scatta addosso a uno
// streamer che sta lavorando è un difetto, non una difesa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creaArgine, classifica, CLASSI } from '../../src/web/argine.js';

// orologio finto: il comportamento nel tempo si prova, non si aspetta
const orologio = () => { let t = 1_000_000; return { ora: () => t, avanti: (ms) => { t += ms; } }; };

test('entro il limite passa, oltre no', () => {
  const o = orologio();
  const a = creaArgine({ finestraMs: 60_000, max: 3, ora: o.ora });
  assert.equal(a.permetti('x').ok, true);
  assert.equal(a.permetti('x').ok, true);
  assert.equal(a.permetti('x').ok, true);
  assert.equal(a.permetti('x').ok, false, 'la quarta no');
});

test('dice quanto manca alla riapertura', () => {
  const o = orologio();
  const a = creaArgine({ finestraMs: 60_000, max: 1, ora: o.ora });
  a.permetti('x');
  const r = a.permetti('x');
  assert.equal(r.ok, false);
  assert.ok(r.fraMs > 0 && r.fraMs <= 60_000);
  o.avanti(30_000);
  assert.ok(a.permetti('x').fraMs <= 30_000, "l'attesa cala col tempo");
});

test('passata la finestra si riparte', () => {
  const o = orologio();
  const a = creaArgine({ finestraMs: 60_000, max: 2, ora: o.ora });
  a.permetti('x'); a.permetti('x');
  assert.equal(a.permetti('x').ok, false);
  o.avanti(60_001);
  assert.equal(a.permetti('x').ok, true, 'finestra nuova, conto azzerato');
});

test('un utente non consuma il limite di un altro', () => {
  const o = orologio();
  const a = creaArgine({ finestraMs: 60_000, max: 1, ora: o.ora });
  assert.equal(a.permetti('alfa').ok, true);
  assert.equal(a.permetti('beta').ok, true, 'beta non paga per alfa');
  assert.equal(a.permetti('alfa').ok, false);
});

test('sotto un flood da mille chiavi la mappa non diventa il problema', () => {
  const o = orologio();
  const a = creaArgine({ finestraMs: 60_000, max: 5, ora: o.ora, tetto: 100 });
  for (let i = 0; i < 500; i++) a.permetti('chiave' + i);
  assert.ok(a.dimensione <= 100, `la mappa resta al tetto (${a.dimensione})`);
  assert.equal(a.permetti('nuova').ok, true, 'e al peggio lascia passare, non blocca tutti');
});

test('la pulizia toglie solo le finestre finite', () => {
  const o = orologio();
  const a = creaArgine({ finestraMs: 60_000, max: 5, ora: o.ora });
  a.permetti('vecchia');
  o.avanti(60_001);
  a.permetti('nuova');
  a.pulisci();
  assert.equal(a.dimensione, 1);
});

// --- la classificazione: cosa si limita e cosa non si tocca mai ------------
test('quello che non va mai fermato non viene fermato', () => {
  assert.equal(classifica('GET', '/health'), null, 'il controllo di salute di Docker');
  assert.equal(classifica('POST', '/stripe/webhook'), null, 'scartarlo = perdere un pagamento');
  assert.equal(classifica('GET', '/overlay/alfa/stream'), null, 'un overlay resta collegato per ore');
  assert.equal(classifica('GET', '/tracking/alfa/stream'), null);
  assert.equal(classifica('GET', '/app.js'), null, 'i file statici');
  assert.equal(classifica('GET', '/'), null);
  assert.equal(classifica('GET', '/u/andryxify'), null, 'la pagina pubblica di uno streamer');
  assert.equal(classifica('POST', '/api/ext/alfa'), null, 'ha già il suo limite');
});

test('login e OAuth stanno nella classe più stretta', () => {
  for (const p of ['/accedi', '/auth/twitch', '/auth/callback', '/sblocca', '/api/passkey/login/inizio', '/mod']) {
    assert.equal(classifica('GET', p), 'autenticazione', p);
  }
  assert.ok(CLASSI.autenticazione.max < CLASSI.scrittura.max, 'ed è più stretta della scrittura');
});

test('i caricamenti sono la classe più cara', () => {
  assert.equal(classifica('POST', '/api/streamer/effetti'), 'caricamento');
  assert.equal(classifica('POST', '/api/streamer/font'), 'caricamento');
  assert.equal(classifica('POST', '/api/alert/media'), 'caricamento');
  assert.equal(classifica('POST', '/api/streamer/qualunque', true), 'caricamento', 'anche solo per il tipo multipart');
  assert.ok(CLASSI.caricamento.max < CLASSI.scrittura.max);
});

test('leggere costa meno che scrivere', () => {
  assert.equal(classifica('GET', '/api/streamer/impostazioni'), 'lettura');
  assert.equal(classifica('POST', '/api/streamer/impostazioni'), 'scrittura');
  assert.equal(classifica('DELETE', '/api/streamer/effetti/3'), 'scrittura');
  assert.equal(classifica('PATCH', '/api/streamer/effetti/3/pubblico'), 'scrittura');
  assert.equal(classifica('POST', '/api/streamer/effetti'), 'caricamento', 'ma inviarne uno sì');
  assert.ok(CLASSI.lettura.max > CLASSI.scrittura.max);
});

test('i limiti sono larghi: fermano l’abuso, non l’uso', () => {
  // uno streamer che lavora di gusto nello studio: molte letture e parecchi
  // salvataggi in un minuto. Non deve mai incontrare l'argine.
  const o = orologio();
  const lettura = creaArgine({ ...CLASSI.lettura, ora: o.ora });
  const scrittura = creaArgine({ ...CLASSI.scrittura, ora: o.ora });
  for (let i = 0; i < 300; i++) assert.equal(lettura.permetti('u:andry').ok, true, `lettura ${i}`);
  for (let i = 0; i < 120; i++) assert.equal(scrittura.permetti('u:andry').ok, true, `salvataggio ${i}`);
});
