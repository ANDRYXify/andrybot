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

test('il blocco «Chi ha donato» si ripulisce: quanti fra 3 e 20, modo e periodo fra quelli noti', () => {
  const p = paginaDona.salva('andry', { headline: 'x', blocchi: [
    { tipo: 'donatori', titolo: 'Grazie a', quanti: 50, modo: 'top', periodo: 'mese' },
    { tipo: 'donatori', quanti: '4', modo: 'boh', periodo: 'anno' },
  ] });
  assert.deepEqual(p.blocchi.map((b) => [b.quanti, b.modo, b.periodo, b.titolo]), [[5, 'top', 'mese', 'Grazie a'], [4, 'ultimi', 'sempre', '']]);
  paginaDona.rimuovi('andry');
});

// L'ASPETTO DELLA PAGINA LINK (docs/DONAZIONI.md): la pagina delle donazioni
// puo' seguire stile e tema della pagina link invece di tenerne una copia.
test('l\'aspetto: una pagina nuova segue la pagina link, una gia\' salvata tiene il suo', async () => {
  const { db } = await import('../../src/db.js');
  assert.equal(paginaDona.conDefault('nuovo', 'Nuovo').aspetto, 'link', 'chi parte da zero parte dalla pagina link');
  assert.equal(linkPage.conDefault('nuovo', 'Nuovo').aspetto, undefined, 'la pagina link non ha niente da seguire');
  const p = paginaDona.salva('vecchio', { headline: 'x', template: 'neon', tema: { accent: '#00ff00' } });
  assert.equal(p.aspetto, 'suo', 'senza dirlo, il suo');
  db.prepare("UPDATE pagina_dona SET aspetto='' WHERE channel='vecchio'").run();
  assert.equal(paginaDona.get('vecchio').aspetto, 'suo', 'salvata prima della scelta: il suo aspetto l\'ha scelto qualcuno');
  assert.equal(paginaDona.salva('vecchio', { ...paginaDona.get('vecchio'), aspetto: 'link' }).aspetto, 'link');
  assert.equal(paginaDona.salva('vecchio', { ...paginaDona.get('vecchio'), attiva: false }).aspetto, 'link', 'spegnerla non cambia la scelta');
  assert.equal(paginaDona.salva('vecchio', { ...paginaDona.get('vecchio'), aspetto: 'boh' }).aspetto, 'suo', 'solo i due valori noti');
  assert.equal(linkPage.salva('vecchio', { headline: 'l', aspetto: 'link' }).aspetto, undefined, 'e la pagina link non la prende');
  paginaDona.rimuovi('vecchio'); linkPage.rimuovi('vecchio');
});

test('una funzione sola decide l\'aspetto: stile e tema dalla pagina link, il resto suo', async () => {
  const { aspettoDi, accentoDi } = await import('../../src/features/linkpagina.js');
  const link = linkPage.salva('segue', { headline: 'I miei link', template: 'neon', avatar: 'no',
    tema: { accent: '#123456', sfondoTipo: 'gradiente', bg: '#000000', bg2: '#ffffff', consenso: 'chiedi' }, blocchi: [{ tipo: 'titolo', testo: 'link' }] });
  const dona = paginaDona.salva('segue', { headline: 'Sostienimi', tagline: 'un caffè', template: 'retro', avatar: '',
    tema: { accent: '#abcdef' }, blocchi: [{ tipo: 'sostieni', titolo: 'Caffè' }], aspetto: 'link' });
  const vista = aspettoDi(dona, link);
  assert.equal(vista.template, 'neon'); assert.deepEqual(vista.tema, link.tema, 'tutto il tema, anche come si caricano i contenuti di altri siti');
  assert.deepEqual([vista.headline, vista.tagline, vista.avatar, vista.blocchi], [dona.headline, dona.tagline, dona.avatar, dona.blocchi], 'i contenuti restano suoi');
  assert.equal(accentoDi(vista), '#123456', 'e la carta dell\'anteprima prende il colore che si vede');
  assert.equal(dona.tema.accent, '#abcdef', 'il suo aspetto resta salvato, per quando torna «tutto suo»');
  assert.equal(aspettoDi({ ...dona, aspetto: 'suo' }, link).tema.accent, '#abcdef', 'tutto suo: il suo');
  assert.equal(aspettoDi(dona, null), dona, 'senza pagina link non c\'e\' niente da seguire');
  paginaDona.rimuovi('segue'); linkPage.rimuovi('segue');
});
