// LA PAGINA DELLE DONAZIONI HA LA STESSA FORMA DELLA PAGINA LINK: stesso store,
// costruito su un altro tavolo. Quello che si salva su una non tocca l'altra,
// la pulizia e' la stessa, e la pagina vuota ha un suo punto di partenza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pagina-dona-');
const { linkPage, paginaDona } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

test('due tavoli, uno store: salvare la pagina delle donazioni non tocca la pagina link', () => {
  assert.equal(paginaDona.tabella, 'pagina_dona'); assert.equal(linkPage.tabella, 'link_page');
  assert.equal(paginaDona.get('andry'), null);
  assert.ok(paginaDona.conDefault('andry', 'Andry').vuota, 'senza niente di salvato, la pagina e\' vuota');
  const p = paginaDona.salva('andry', { headline: 'Sostieni Andry', template: 'neon', tema: { accent: '#ff0000', cursore: 'disegnato' },
    blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè', icona: 'stella' }, { tipo: 'link', label: 'Twitch', url: 'twitch.tv/andry' }] });
  assert.equal(p.headline, 'Sostieni Andry'); assert.equal(p.template, 'neon'); assert.equal(p.tema.accent, '#ff0000'); assert.equal(p.tema.cursore, 'disegnato');
  assert.equal(p.blocchi.length, 2); assert.equal(p.blocchi[0].icona, 'stella'); assert.equal(p.blocchi[1].url, 'https://twitch.tv/andry');
  assert.equal(linkPage.get('andry'), null, 'la pagina link resta com\'era: niente');
  assert.equal(paginaDona.esiste('andry'), true);
  linkPage.salva('andry', { headline: 'I miei link', blocchi: [] });
  assert.equal(paginaDona.get('andry').headline, 'Sostieni Andry', 'e salvare la pagina link non tocca quella delle donazioni');
  paginaDona.salva('andry', { ...paginaDona.get('andry'), attiva: false });
  assert.equal(paginaDona.get('andry').attiva, false, 'si spegne senza perdere i contenuti');
  assert.equal(paginaDona.get('andry').blocchi.length, 2);
  paginaDona.rimuovi('andry');
  assert.equal(paginaDona.get('andry'), null); assert.equal(linkPage.get('andry').headline, 'I miei link');
});
