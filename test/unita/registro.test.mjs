// IN CHAT NESSUNO PARLA DA ASSISTENTE.
//
// «Mi dispiace, l'implementazione attuale lo impedisce» a chi ha scritto «ti si
// ama»: e' successo, e da li' ogni risposta suonava uguale, perche' la riga
// tornava al modello come esempio di come parla lui. Qui si tiene fermo che una
// riga cosi' non esce dall'unica uscita del bot, e che la storia rimandata al
// modello non la contiene.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-registro-');
const { daAssistente } = await import('../../src/ai/registro.js');
const { memory, streamers } = await import('../../src/db.js');
const { Brain } = await import('../../src/ai/brain.js');
test.after(() => casa.pulisci());

test('l\'elenco riconosce la scusa e lascia stare la chat vera', () => {
  for (const f of ['Mi dispiace, l\'implementazione attuale lo impedisce. Cercherò di risolvere in fretta.', 'Non sono in grado di farlo',
    'Purtroppo questa funzionalità non è ancora disponibile', 'Come modello linguistico non posso', 'al momento non posso aiutarti', 'As an AI I cannot do that']) {
    assert.ok(daAssistente(f), `da assistente: «${f}»`);
  }
  for (const f of ['mi dispiace ma hai perso', 'la musica la mette Andryx, io canticchio', 'boh, questa non la so', 'segnato. intanto la partita la stiamo vincendo', '']) {
    assert.ok(!daAssistente(f), `da chat: «${f}»`);
  }
});

test('la storia rimandata al modello non contiene le sue righe da assistente', () => {
  const ch = 'registro_storia';
  streamers.upsertApproved(ch, ch);
  memory.logMessage(ch, 'terry', 'terry', 'ti si ama ❤️', false);
  memory.logMessage(ch, ch, ch, 'Mi dispiace, l\'implementazione attuale lo impedisce.', true);
  memory.logMessage(ch, ch, ch, 'anche tu, dai che si vince', true);
  memory.logMessage(ch, 'gino', 'gino', 'che partita', false);
  const b = new Brain({});
  const storia = b._storiaRecente(ch, 'e adesso?');
  const testi = storia.map((r) => r.testo);
  assert.ok(testi.includes('ti si ama ❤️') && testi.includes('che partita'), 'le righe degli altri ci sono');
  assert.ok(testi.includes('anche tu, dai che si vince'), 'una sua riga da chat c\'e\'');
  assert.ok(!testi.some((t) => /implementazione/.test(t)), 'la sua riga da assistente non torna al modello');
});

test('dall\'unica uscita del bot una riga da assistente non passa, una da chat si\'', () => {
  const ch = 'registro_uscita';
  streamers.upsertApproved(ch, ch);
  const s = streamers.get(ch);
  const b = new Brain({});
  assert.equal(b._finalizza(ch, 'Mi dispiace, l\'implementazione attuale lo impedisce. Cercherò di risolvere in fretta.', s), null);
  assert.equal(b._finalizza(ch, 'Non sono in grado di eseguire questa richiesta', s), null);
  const ok = b._finalizza(ch, 'anche tu, dai che oggi si vince', s);
  assert.ok(ok && /si vince/.test(ok), 'una riga da chat esce');
});
