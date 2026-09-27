// UN POST NUOVO, SU DISCORD, NON DICE «È IN DIRETTA».
//
// Il testo di ogni canale degli Avvisi e' scritto per le dirette, e di serie
// dice «è in diretta». I post nuovi passavano dallo stesso testo: sopra il link
// di un video caricato ieri il canale leggeva «Andry è in diretta». Qui Discord
// e' finto (fetch sostituito) e si guarda cosa gli arriva davvero.
import test from 'node:test';
import assert from 'node:assert/strict';

const discord = await import('../../src/features/discord.js');

const arrivati = [];
const vero = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  arrivati.push({ url: String(url), corpo: opts.body ? JSON.parse(opts.body) : null });
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ id: '999' }), text: async () => '{"id":"999"}' };
};
test.after(() => { globalThis.fetch = vero; });

const CANALE = { id: 1, canale: '123456789012345678', messaggio: '🔴 {nome} è live! {link}', ruolo: '' };
const DI_SERIE = { id: 2, canale: '223456789012345678', messaggio: '', ruolo: '' };
const video = { piattaforma: 'youtube', login: 'andry', display: 'Andry', titolo: 'Il video nuovo', url: 'https://youtu.be/x' };

test('un post arriva col suo testo e senza riquadro, anche dove il canale ha scritto il suo per le dirette', async () => {
  arrivati.length = 0;
  const esiti = await discord.diffondi('tok', [CANALE, DI_SERIE], video, { post: true });
  assert.equal(esiti.filter((e) => e.ok).length, 2);
  for (const a of arrivati) {
    assert.ok(!/diretta|live/i.test(a.corpo.content), a.corpo.content);
    assert.match(a.corpo.content, /ha caricato un nuovo video su YouTube/);
    assert.match(a.corpo.content, /Il video nuovo/);
    assert.ok(a.corpo.content.endsWith('https://youtu.be/x'));
    assert.equal(a.corpo.embeds, undefined, 'niente riquadro «è in diretta»');
  }
});

test('ogni piattaforma ha il suo testo di serie, e il dato che manca non lascia righe vuote', () => {
  for (const p of ['youtube', 'instagram', 'tiktok']) {
    const t = discord.testoPost({ ...video, piattaforma: p, titolo: '' });
    assert.ok(!t.includes('\n\n'), p);
    assert.ok(!/diretta/.test(t), p);
  }
  assert.match(discord.testoPost({ ...video, piattaforma: 'instagram' }), /nuovo post su Instagram/);
  assert.match(discord.testoPost({ ...video, piattaforma: 'tiktok' }), /nuovo post su TikTok/);
});

test('una diretta invece usa il testo del canale, col riquadro', async () => {
  arrivati.length = 0;
  await discord.diffondi('tok', [CANALE], { ...video, piattaforma: 'twitch', url: 'https://twitch.tv/andry' });
  assert.equal(arrivati[0].corpo.content, '🔴 Andry è live! https://twitch.tv/andry');
  assert.equal(arrivati[0].corpo.embeds.length, 1);
});
