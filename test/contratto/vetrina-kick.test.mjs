// L'INVITO IN FONDO ALLA PAGINA PUBBLICA DICE LE STESSE COSE DELL'APERTURA.
//
// In cima alla vetrina ci si registra con Twitch, con Kick quando la porta e'
// aperta, con YouTube quando lo sara'. L'invito in fondo era rimasto a «un
// click con Twitch» e un tasto solo: chi arrivava in fondo non sapeva di Kick.
// Le piattaforme sono una lista sola, e i due punti la leggono tutti e due.
import test from 'node:test';
import assert from 'node:assert/strict';
import { vetrinaHtml } from '../../src/web/vetrina-vista.js';

const fondo = (html) => html.slice(html.indexOf('class="vt-fine'));

test('senza Kick, in fondo c\'e\' solo Twitch, come prima', () => {
  const f = fondo(vetrinaHtml('it', { kick: false, youtube: false }));
  assert.ok(f.includes('con cui streammi, su Twitch.'), 'la frase');
  assert.ok(f.includes('Registrati con Twitch') && !f.includes('Registrati con Kick') && !f.includes('Registrati con YouTube'), 'i tasti');
});

test('con Kick aperto, in fondo ci si registra anche con Kick', () => {
  for (const [lingua, frase] of [['it', 'con cui streammi, su Twitch o Kick.'], ['en', 'you stream with, on Twitch or Kick.'], ['es', 'haces directo, en Twitch o Kick.']]) {
    const f = fondo(vetrinaHtml(lingua, { kick: true, youtube: false }));
    assert.ok(f.includes(frase), lingua + ': ' + frase);
    assert.ok(/href="\/accedi\/kick"/.test(f), lingua + ': il tasto di Kick porta alla sua porta');
  }
});

test('con YouTube aperto, la lista dice tutti e tre, e i tasti sono gli stessi dell\'apertura', () => {
  const html = vetrinaHtml('it', { kick: true, youtube: true });
  const f = fondo(html), cima = html.slice(0, html.indexOf('class="vt-fine'));
  assert.ok(f.includes('su Twitch, Kick o YouTube.'), 'la lista con la virgola e la «o»');
  for (const porta of ['/entra?nuovo=1', '/accedi/kick', '/accedi/youtube']) {
    assert.ok(f.includes(`href="${porta}"`) && cima.includes(`href="${porta}"`), porta + ': in fondo come in cima');
  }
});
