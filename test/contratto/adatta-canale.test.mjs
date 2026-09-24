// «ADATTA LA PERSONALITA' AL MIO CANALE»: l'interruttore c'era, si salvava, e
// nessuno lo leggeva. Il cervello imparava lo stile dalla voce e dai messaggi
// dello streamer sempre, acceso o spento. Adesso spento vuol dire quello che
// dice il pannello: lo stile si sceglie a mano, col tono e con le frasi scritte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('adatta-');
const { streamers, voceStreamer, db } = await import('../../src/db.js');
const { Brain } = await import('../../src/ai/brain.js');
test.after(() => casa.pulisci());

const CH = 'lucetta';
function canale(settings) {
  streamers.upsertApproved(CH, CH, '1');
  streamers.setSettings(CH, { frasi: ['questa la dico sempre io, parola mia'], ...settings });
}

test('acceso impara dalla voce e dalla chat, spento tiene solo le frasi scritte', () => {
  canale({ adattaCanale: true });
  voceStreamer.add(CH, 'ragazzi oggi si fa la run lunga fino a tardi');
  db.prepare('INSERT INTO messages (channel, user, display, text, from_bot, ts) VALUES (?,?,?,?,?,?)')
    .run(CH, CH, CH, 'raga stasera boss finale, preparate i popcorn', 0, Date.now());
  const b = new Brain({});
  const acceso = b._stileStreamer(CH);
  assert.ok(acceso.includes('questa la dico sempre io, parola mia'));
  assert.ok(acceso.some((f) => f.includes('run lunga')), 'la voce in diretta');
  assert.ok(acceso.some((f) => f.includes('popcorn')), 'i messaggi in chat');

  canale({ adattaCanale: false });
  const spento = b._stileStreamer(CH);
  assert.deepEqual(spento, ['questa la dico sempre io, parola mia'], 'spento: solo le frasi scelte, e subito, senza aspettare la cache');
});

test('mai salvato vuol dire acceso, come lo mostra il pannello', async () => {
  const { readFileSync } = await import('node:fs');
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  assert.match(APP, /adattaCanale: s\.adattaCanale !== false,/);
  const { SETTINGS_DEFAULT } = await import('../../src/features/seed.js');
  assert.equal(SETTINGS_DEFAULT.adattaCanale, true, 'e il kit di partenza lo accende');
});
