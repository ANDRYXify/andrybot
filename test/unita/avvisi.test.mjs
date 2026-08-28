// GLI AVVISI «È LIVE» PER QUALUNQUE PIATTAFORMA.
//
// Prima una notifica di diretta ERA Twitch. Aggiungere Kick voleva dire
// riscrivere lo stesso giro una seconda volta, e YouTube una terza: tre posti
// dove ricordarsi le stesse cose, due dove dimenticarsele.
//
// La cosa più delicata è la COMPATIBILITÀ: gli streamer hanno già scelto a mano
// quali eventi vanno in quale gruppo e in quale topic. Cambiare il significato
// di una chiave già salvata cambierebbe il comportamento sotto i piedi a tutti,
// in silenzio. Qui si fissa che non succeda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diretta, messaggio, eventoDi, PIATTAFORME, CHIAVI } from '../../src/features/avvisi.js';

test('le chiavi già salvate NON cambiano significato', () => {
  assert.equal(eventoDi('twitch'), 'live', '«live» ha sempre voluto dire Twitch: deve continuare');
  assert.equal(eventoDi('tiktok'), 'tiktok');
});

test('le piattaforme nuove portano chiavi nuove, non rubano le vecchie', () => {
  assert.equal(eventoDi('kick'), 'kick');
  assert.equal(eventoDi('youtube'), 'ytlive');
  const chiavi = CHIAVI.map(eventoDi);
  assert.equal(new Set(chiavi).size, chiavi.length, 'due piattaforme non possono condividere una chiave');
});

test('ogni piattaforma è completa: nome, evento, link e messaggio', () => {
  for (const [k, p] of Object.entries(PIATTAFORME)) {
    assert.ok(p.nome, `${k}: manca il nome`);
    assert.ok(p.evento, `${k}: manca la chiave evento`);
    assert.match(p.url('tizio'), /^https:\/\//, `${k}: il link non è un indirizzo`);
    assert.match(p.predefinito, /\{link\}/, `${k}: il messaggio non porta il link`);
    assert.match(p.predefinito, /\{nome\}/, `${k}: il messaggio non dice chi`);
  }
});

test('una diretta senza piattaforma nota non esiste', () => {
  assert.equal(diretta({ piattaforma: 'myspace', login: 'a' }), null);
  assert.equal(diretta({ piattaforma: 'kick' }), null, 'senza streamer non è una diretta');
  assert.equal(diretta({}), null);
});

test('il link si costruisce da sé, ma quello vero vince', () => {
  assert.equal(diretta({ piattaforma: 'kick', login: 'Tizio' }).url, 'https://kick.com/tizio');
  assert.equal(diretta({ piattaforma: 'twitch', login: 'tizio' }).url, 'https://twitch.tv/tizio');
  assert.equal(diretta({ piattaforma: 'youtube', login: 'x', url: 'https://youtu.be/abc' }).url, 'https://youtu.be/abc');
});

test('un dato che non c’è non diventa un buco nel messaggio', () => {
  // Kick non ci dice il gioco: «🎮 » da solo è peggio che niente.
  const t = messaggio(diretta({ piattaforma: 'kick', login: 'andry', display: 'Andry', titolo: 'si gioca' }));
  assert.match(t, /Andry/);
  assert.match(t, /si gioca/);
  assert.match(t, /kick\.com\/andry/);
  assert.doesNotMatch(t, /\{/, 'nessun segnaposto rimasto scoperto');
  assert.doesNotMatch(t, /🎮\s*$/m, 'nessuna riga con solo un’emoji');
});

test('su Twitch il messaggio dice ancora tutto quello che diceva', () => {
  const d = diretta({ piattaforma: 'twitch', login: 'andry', display: 'Andry', titolo: 'Ciao', gioco: 'Elden Ring', spettatori: 42 });
  const t = messaggio(d);
  assert.match(t, /Andry/); assert.match(t, /Ciao/); assert.match(t, /Elden Ring/);
  assert.match(t, /twitch\.tv\/andry/);
});

test('il messaggio personalizzato dello streamer vince', () => {
  const d = diretta({ piattaforma: 'kick', login: 'a', display: 'A', titolo: 'T' });
  assert.equal(messaggio(d, 'venite: {link}'), 'venite: https://kick.com/a');
  assert.equal(messaggio(d, '   '), messaggio(d), 'un template vuoto non conta');
});

test('il testo di chi scrive non può iniettare HTML', () => {
  const d = diretta({ piattaforma: 'kick', login: 'a', display: '<b>cattivo</b>', titolo: '<script>x</script>' });
  const t = messaggio(d);
  assert.doesNotMatch(t, /<script>/);
  assert.match(t, /&lt;script&gt;/);
  assert.match(t, /&lt;b&gt;cattivo/);
});

test('senza titolo il messaggio resta sensato', () => {
  const t = messaggio(diretta({ piattaforma: 'kick', login: 'a', display: 'A' }));
  assert.ok(t.length > 10);
  assert.doesNotMatch(t, /undefined|null/);
});
