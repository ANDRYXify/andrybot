// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
import { diretta, messaggio, eventoDi, PIATTAFORME, CHIAVI, SEGNO_NOME, stendiRiga } from '../../src/features/avvisi.js';
import { testoDiretta, testoFinita, incornicia } from '../../src/features/discord.js';

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

test('ogni piattaforma è completa: nome, evento, link e icona', () => {
  for (const [k, p] of Object.entries(PIATTAFORME)) {
    assert.ok(p.nome, `${k}: manca il nome`);
    assert.ok(p.evento, `${k}: manca la chiave evento`);
    assert.match(p.url('tizio'), /^https:\/\//, `${k}: il link non è un indirizzo`);
    assert.ok(p.icona, `${k}: manca l'icona`);
    const t = messaggio(diretta({ piattaforma: k, login: 'tizio', display: 'Tizio' }));
    assert.match(t, /Tizio/, `${k}: il messaggio non dice chi`);
    assert.ok(t.includes(p.url('tizio')), `${k}: il messaggio non porta il link`);
  }
});

test('la prima riga e\' quella della voce del canale, col nome in grassetto e il resto sfuggito', () => {
  const d = { ...diretta({ piattaforma: 'twitch', login: 'andry', display: 'Andry', titolo: 'Ciao' }), voce: `${SEGNO_NOME} is live on Twitch & friends` };
  const t = messaggio(d);
  assert.equal(t.split('\n')[0], '🔴 <b>Andry</b> is live on Twitch &amp; friends');
  const dc = testoDiretta(d);
  assert.equal(dc, '🔴 **Andry** is live on Twitch & friends · https://twitch.tv/andry', 'su Discord la stessa riga, in markdown');
  assert.equal(stendiRiga('', (x) => x, '**A**', 'Kick'), '**A** · Kick', 'senza riga della voce: il nome e la piattaforma, nessuna parola');
});

test('senza la riga della voce nessuna parola scritta a mano', () => {
  const t = messaggio(diretta({ piattaforma: 'kick', login: 'a', display: 'A', titolo: 'T', gioco: 'G' }));
  assert.doesNotMatch(t, /diretta|live|vivo/i, t);
  assert.doesNotMatch(testoDiretta(diretta({ piattaforma: 'kick', login: 'a', display: 'A' })), /diretta|live|vivo/i);
});

test('a diretta finita la riga viene dalla voce, e senza resta il nome', () => {
  assert.equal(testoFinita({ display: 'Luna' }, null, `${SEGNO_NOME} ended the stream`), '⚫ **Luna** ended the stream');
  assert.equal(testoFinita({ display: 'Lu_na' }), '⚫ **Lu\\_na**', 'il nome si sfugge per il markdown');
});

test('il riquadro di Discord parla la lingua del canale', () => {
  const d = diretta({ piattaforma: 'kick', login: 'a', display: 'A', gioco: 'Chess', spettatori: 3 });
  const en = incornicia({ ...d, lingua: 'en' });
  assert.equal(en.title, '🟢 A is live on Kick');
  assert.deepEqual(en.fields.map((f) => f.name), ['🎮 Game', '👥 Viewers']);
  assert.equal(incornicia({ ...d, lingua: 'es' }).title, '🟢 A está en vivo en Kick');
  assert.equal(incornicia(d).fields[0].name, '🎮 Gioco', 'senza lingua, l\'italiano');
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
