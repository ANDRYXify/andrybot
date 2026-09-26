// IL RIMEDIO DI 7TV LO LEGGE CHI LO PUO' FARE.
//
// Aggiungere, togliere e rinominare le emote lo possono fare anche i
// moderatori; collegare e scollegare 7TV solo il proprietario. Quando 7TV non
// accetta piu' il token, la frase «scollega 7TV e ricollegalo» detta a un
// moderatore gli chiede una cosa che non puo' fare: a lui si dice di chiederlo
// al proprietario. Lo sceglie la rotta, che sa chi e' entrato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
const SV = readFileSync(new URL('../../src/features/seventv.js', import.meta.url), 'utf8');

test('le frasi sono due, e una sola chiede di ricollegare', () => {
  assert.match(SV, /proprietario: '7TV non accetta più il token collegato: scollega 7TV e ricollegalo con un token nuovo',/);
  assert.match(SV, /moderatore: '7TV non accetta più il token del canale: chiedi al proprietario di ricollegare 7TV',/);
});

test('la rotta sceglie la frase da chi e\' entrato', () => {
  assert.match(SRV, /const ricollega7tv = \(req, r\) => \(r\.scaduto \? seventv\.RICOLLEGA\[isOwner\(req\) \? 'proprietario' : 'moderatore'\] : r\.motivo\);/);
  for (const [rotta, n] of [["'/api/seventv/aggiungi'", 900], ["'/api/seventv/rimuovi'", 900], ["'/api/seventv/rinomina'", 900]]) {
    const i = SRV.indexOf(`app.post(${rotta}`);
    assert.ok(i > 0, rotta);
    assert.match(SRV.slice(i, i + n), /errore: ricollega7tv\(req, r\)/, `${rotta} passa da ricollega7tv`);
  }
  const car = SRV.slice(SRV.indexOf('async function caricaEmote7TV('), SRV.indexOf('async function caricaEmote7TV(') + 2600);
  assert.match(car, /errore: ricollega7tv\(req, up\)/, 'anche il caricamento');
  assert.match(car, /avviso = ricollega7tv\(req, add\)/, 'e l\'aggiunta subito dopo');
  assert.doesNotMatch(SRV, /errore: r\.motivo \|\| 'Non (aggiunta|rimossa|rinominata)\.'/, 'nessuna rotta 7TV rimanda il rimedio senza guardare chi legge');
});
