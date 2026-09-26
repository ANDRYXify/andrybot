// IL PROMEMORIA DELLA LICENZA (docs/LICENZA-FIRMATA.md): quando parte, una volta per
// soglia, e cosa dice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-licenza-');
const p = await import('../../src/features/licenza-promemoria.js');
const GIORNO = 86_400_000;
const SCADE = '2027-08-29T00:00:00.000Z';
const prima = (g) => Date.parse(SCADE) - g * GIORNO;

test('le soglie: 60, 30, 14, 7, 3 e 1 giorno, poi una volta a scaduta', () => {
  assert.deepEqual(p.SOGLIE, [60, 30, 14, 7, 3, 1]);
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(61) }), null, 'troppo presto');
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(60) }), 60);
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(45), mandate: [60] }), null, 'una volta per soglia');
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(30), mandate: [60] }), 30);
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(0.5), mandate: p.dopo([], 3) }), 1, 'domani');
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(-2), mandate: p.dopo([], 1) }), 0, 'scaduta');
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(-9), mandate: p.dopo(p.dopo([], 1), 0) }), null, 'e scaduta si dice una volta');
  assert.equal(p.daMandare({ scade: '', adesso: prima(5) }), null, 'senza scadenza non c\'e\' niente da ricordare');
});

test('server spento a lungo: parte solo la soglia piu\' urgente, niente raffica', () => {
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(5), mandate: [60] }), 7);
  assert.deepEqual(p.dopo([60], 7), [60, 30, 14, 7], 'e quelle piu\' larghe non partono piu\'');
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(4), mandate: p.dopo([60], 7) }), null);
  assert.equal(p.daMandare({ scade: SCADE, adesso: prima(2), mandate: p.dopo([60], 7) }), 3);
});

test('con una licenza nuova il conto riparte da solo', () => {
  const memoria = { scade: SCADE, mandate: [60, 30, 14] };
  assert.deepEqual(p.mandateDi(memoria, SCADE), [60, 30, 14]);
  assert.deepEqual(p.mandateDi(memoria, '2028-08-29T00:00:00.000Z'), [], 'un\'altra scadenza, un altro conto');
  assert.deepEqual(p.mandateDi(null, SCADE), []);
  assert.deepEqual(p.mandateDi({ scade: SCADE, mandate: 'tutte' }, SCADE), [], 'una memoria storta non ferma i promemoria');
});

test('la mail dice quando succede e come si rinnova', () => {
  const m = p.mail({ scade: SCADE, adesso: prima(14), dominio: 'socialbot.live', macchina: 'casa' });
  assert.equal(m.oggetto, 'La licenza di socialbot.live scade fra 14 giorni');
  assert.match(m.testo, /scade il 29 agosto 2027, fra 14 giorni/);
  assert.match(m.testo, /al primo riavvio .* non riparte più/);
  assert.match(m.testo, /node scripts\/licenza\.mjs --firma --dominio socialbot\.live --mesi 12 --macchina casa/, 'il comando con dominio e macchina di adesso');
  assert.match(m.testo, /LICENZA=/);
  assert.match(m.testo, /cd \/opt\/andrybot && bash server\/aggiorna\.sh/);
  assert.match(m.html, /<ol/);
  assert.equal(p.mail({ scade: SCADE, adesso: prima(0.5) }).oggetto, 'La licenza di socialbot.live scade domani');
  assert.equal(p.mail({ scade: SCADE, adesso: prima(-1) }).oggetto, 'La licenza di socialbot.live è scaduta');
  assert.doesNotMatch(p.mail({ scade: SCADE, adesso: prima(3) }).testo, /--macchina/, 'senza macchina, niente macchina');
  for (const g of [60, 7, 1, -1]) {
    const t = p.mail({ scade: SCADE, adesso: prima(g) }).testo;
    assert.doesNotMatch(t, /—/, 'niente lineette lunghe');
    assert.doesNotMatch(t, /[:;=][ \t]?['-]?[ \t]?[)(|\[\]DPpOo0l1I\\/](?![A-Za-z0-9])/, 'niente faccine involontarie sulla stessa riga');
  }
});

test.after(() => usaEGetta.pulisci());
