// DUE AVVISI CHE DICEVANO UNA COSA NON VERA.
//  · «Non hai ancora un comando tuo» non scattava mai per chi aveva il kit di
//    partenza: contava i suoi due moduli, che lo streamer non ha fatto;
//  · «Spotify non è collegato» arrivava a tutti, perche' le richieste musicali
//    sono nell'Essenziale: conta solo per chi le ha accese (il comando !sr).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-avvisi-account-');
const { streamers, modules } = await import('../../src/db.js');
const { seedStreamer, eDelKit } = await import('../../src/features/seed.js');
const { vivo } = await import('../../src/features/comandi-registro.js');
process.on('exit', () => usaEGetta.pulisci());

const SRV = readFileSync('src/web/server.js', 'utf8');

test('i moduli del kit lasciati com\'erano non sono «comandi tuoi»', () => {
  streamers.upsertApproved('nuovo', 'nuovo');
  assert.equal(seedStreamer('nuovo'), true);
  const kit = modules.list('nuovo');
  assert.equal(kit.length, 2, 'il kit semina due moduli');
  assert.ok(kit.every(eDelKit), 'salvati e riletti dal database, sono ancora quelli del kit');
  modules.setAttivo('nuovo', kit[0].id, false);
  assert.ok(eDelKit(modules.get('nuovo', kit[0].id)), 'spegnerlo non lo fa diventare suo');
  const cambiato = { ...kit[1], azioni: [{ tipo: 'messaggio', testo: 'Seguimi, dai!' }] };
  modules.save('nuovo', cambiato);
  assert.equal(eDelKit(modules.get('nuovo', kit[1].id)), false, 'cambiata una parola, e\' suo');
  const mio = modules.save('nuovo', { nome: 'Social', trigger: { tipo: 'comando', comando: 'social' }, azioni: [{ tipo: 'messaggio', testo: 'ciao' }] });
  assert.equal(eDelKit(modules.get('nuovo', mio)), false);
  assert.equal(modules.list('nuovo').filter((m) => !eDelKit(m)).length, 2, 'il server conta questi');
});

test('il server conta i moduli senza quelli del kit', () => {
  assert.ok(SRV.includes("prova('comandi', () => comandiDb.list(login).length + modulesDb.list(login).filter((m) => !eDelKit(m)).length);"));
});

test('Spotify manca solo a chi ha le richieste musicali accese', () => {
  streamers.upsertApproved('musicale', 'musicale');
  assert.equal(vivo('musicale', 'sr'), true, 'di serie !sr e\' acceso');
  streamers.setSettings('musicale', { comandi: { sr: { off: true } } });
  assert.equal(vivo('musicale', 'sr'), false, 'spento dallo streamer');
  assert.ok(SRV.includes("prova('musica', () => canaleHa(login, 'musica') && comandoVivo(login, 'sr'));"));
});
