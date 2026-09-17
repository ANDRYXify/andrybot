// I Moduli e la regia.
//
// Un'azione «regia» di un Modulo e' un passo di regia con la stessa forma di
// quelli dei tasti di CONSOLify. Il motore non conosce il ponte: riceve una
// funzione all'avvio, e le passa il passo. I nomi passano dall'espansione, cosi'
// «!scena $arg1» cambia scena a comando. Un passo che non riesce non ferma le
// azioni che seguono: e' la regola di tutte le azioni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-modregia-');
const { ModulesEngine } = await import('../../src/features/modules.js');

const CH = 'canale';
const base = { channel: CH, user: 'tizio', display: 'Tizio', args: ['Pausa', 'x'], argsRaw: 'Pausa x', _livello: 0 };
const ctx = (extra = {}) => ({ ...base, ...extra });

let id = 100;
const modulo = (azioni) => ({ id: ++id, nome: 'prova', attivo: true, condizioni: {}, azioni });

function finto(esito = { ok: true, mostra: '' }) {
  const passi = [];
  const regia = async (channel, passo) => { passi.push({ channel, passo }); return esito; };
  return { passi, regia };
}

function raccogli() {
  const dette = [];
  return { dette, dire: (t) => dette.push(t) };
}

test('la scena arriva al ponte come passo, col nome espanso dal comando', async () => {
  const f = finto();
  const motore = new ModulesEngine({ regia: f.regia });
  const a = raccogli();
  await motore.esegui(modulo([{ tipo: 'regia', cosa: 'scena', scena: '$arg1' }]), ctx(), a.dire);
  assert.deepEqual(f.passi, [{ channel: CH, passo: { tipo: 'scena', scena: 'Pausa' } }]);
});

test('muto e transizione hanno la forma dei passi dei tasti', async () => {
  const f = finto();
  const motore = new ModulesEngine({ regia: f.regia });
  await motore.esegui(modulo([
    { tipo: 'regia', cosa: 'muto', fonte: ' Mic/Aux ', come: 'muta' },
    { tipo: 'regia', cosa: 'transizione', transizione: 'Dissolvenza' },
  ]), ctx(), () => {});
  assert.deepEqual(f.passi.map((p) => p.passo), [
    { tipo: 'muto', fonte: 'Mic/Aux', come: 'muta' },
    { tipo: 'transizione', transizione: 'Dissolvenza' },
  ]);
});

test('un nome vuoto o una cosa sconosciuta non partono, e il nome non supera gli ottanta', async () => {
  const f = finto();
  const motore = new ModulesEngine({ regia: f.regia });
  await motore.esegui(modulo([
    { tipo: 'regia', cosa: 'scena', scena: '   ' },
    { tipo: 'regia', cosa: 'scena', scena: '$arg3' },
    { tipo: 'regia', cosa: 'registra' },
    { tipo: 'regia', cosa: 'scena', scena: 'x'.repeat(120) },
  ]), ctx(), () => {});
  assert.equal(f.passi.length, 1, 'solo il nome lungo parte, gli altri no');
  assert.equal(f.passi[0].passo.scena.length, 80);
});

test('se il ponte non risponde le azioni dopo vanno avanti, e senza ponte il passo salta in silenzio', async () => {
  const f = finto({ ok: false, mostra: 'nessuna pagina di regia aperta' });
  const conPonte = new ModulesEngine({ regia: f.regia });
  const a = raccogli();
  await conPonte.esegui(modulo([
    { tipo: 'regia', cosa: 'scena', scena: 'Pausa' },
    { tipo: 'messaggio', testo: 'Torno subito' },
  ]), ctx(), a.dire);
  assert.deepEqual(a.dette, ['Torno subito'], 'il messaggio si dice lo stesso');
  assert.equal(f.passi.length, 1, 'il passo e\' stato chiesto');

  const senzaPonte = new ModulesEngine({});
  const b = raccogli();
  await senzaPonte.esegui(modulo([
    { tipo: 'regia', cosa: 'scena', scena: 'Pausa' },
    { tipo: 'messaggio', testo: 'ci sono' },
  ]), ctx(), b.dire);
  assert.deepEqual(b.dette, ['ci sono']);
});

test('il ponte si riceve solo se e\' una funzione', () => {
  assert.equal(new ModulesEngine({ regia: 'no' }).regia, null);
  assert.equal(new ModulesEngine({}).regia, null);
});
