// SU QUALI PIATTAFORME GIRA UN COMANDO.
//
// La cosa da non sbagliare è la RETROCOMPATIBILITÀ: esistono già moduli creati
// quando le piattaforme erano una sola, e non hanno questo campo. Devono
// continuare a funzionare esattamente come prima — cioè ovunque — senza che
// nessuno debba aprirli e risalvarli uno per uno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('modpiatt-');
const { modules, PIATTAFORME_MODULO } = await import('../../src/db.js');
test.after(() => casa.pulisci());

const salva = (condizioni) => {
  const id = modules.save('alfa', { nome: 'x', trigger: { tipo: 'comando', comando: 'x' }, condizioni, azioni: [] });
  return modules.get('alfa', id).condizioni;
};

test('un modulo senza il campo resta senza: vale ovunque', () => {
  assert.equal(salva({ tier: 'tutti' }).piattaforme, undefined);
  assert.equal(salva({}).piattaforme, undefined);
});

test('sceglierle TUTTE è come non sceglierne nessuna', () => {
  assert.equal(salva({ piattaforme: [...PIATTAFORME_MODULO] }).piattaforme, undefined,
    'si tiene la forma più semplice: nessun elenco da mantenere allineato');
});

test('una scelta vera si conserva', () => {
  assert.deepEqual(salva({ piattaforme: ['kick'] }).piattaforme, ['kick']);
  assert.deepEqual(salva({ piattaforme: ['twitch', 'kick'] }).piattaforme, ['twitch', 'kick']);
});

test('piattaforme inventate non entrano nel database', () => {
  assert.equal(salva({ piattaforme: ['myspace'] }).piattaforme, undefined, 'niente di valido = vale ovunque');
  assert.deepEqual(salva({ piattaforme: ['kick', 'myspace', 'KICK'] }).piattaforme, ['kick'],
    'i doppioni e le invenzioni si tolgono');
});

test('un valore che non è un elenco non fa danni', () => {
  for (const brutto of ['kick', 42, {}, null]) {
    assert.doesNotThrow(() => salva({ piattaforme: brutto }));
  }
  assert.equal(salva({ piattaforme: 'kick' }).piattaforme, undefined, 'una stringa non è un elenco: vale ovunque');
});

test('le altre condizioni non vengono toccate', () => {
  const c = salva({ tier: 'mod', cooldown: 30, soloLive: true, probabilita: 50, piattaforme: ['kick'] });
  assert.equal(c.tier, 'mod'); assert.equal(c.cooldown, 30);
  assert.equal(c.soloLive, true); assert.equal(c.probabilita, 50);
});

// --- la regola vera, letta dal motore --------------------------------------
const mot = await import('../../src/features/modules.js');
const src = (await import('node:fs')).readFileSync('src/features/modules.js', 'utf8');

test('il contesto porta sempre una piattaforma, e senza è Twitch', () => {
  assert.match(src, /piattaforma: msg\.piattaforma \|\| 'twitch'/,
    'un messaggio senza piattaforma è Twitch: i moduli vecchi non hanno quel campo');
});

test('la condizione ferma il modulo solo se l’elenco c’è ed esclude la piattaforma', () => {
  const blocco = src.slice(src.indexOf('SU QUALI PIATTAFORME'), src.indexOf('// probabilità'));
  assert.match(blocco, /Array\.isArray\(c\.piattaforme\) && c\.piattaforme\.length/,
    'assente o vuoto deve voler dire TUTTE, non NESSUNA');
  assert.match(blocco, /ctx\.piattaforma \|\| 'twitch'/);
});
