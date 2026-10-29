// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SLOGAN DELLA PAGINA PEW (docs/COLPI.md, «Lo slogan»): il gioco delle due
// lingue nelle tre lingue, acceso di serie, dello streamer da cambiare o spegnere.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const casa = cartellaUsaEGetta('colpi-slogan-');
process.on('exit', () => casa.pulisci());
const { htmlPaginaColpo } = await import('../../src/features/colpi-pagina.js');
const { normalizza } = await import('../../src/features/colpi.js');

const base = { login: 'andry', display: 'Andry', pagina: { blocchi: [{ tipo: 'colpo' }] }, baseUrl: 'https://socialbot.live' };
const riga = (html) => (/<p class="cp-slogan">([^<]*)<\/p>/.exec(html) || [])[1] ?? null;

test('di serie, nelle tre lingue: la prima parte nella lingua di chi legge', () => {
  assert.equal(riga(htmlPaginaColpo({ ...base, lingua: 'it' })), 'Perché pewpew is the new ka-chow');
  assert.equal(riga(htmlPaginaColpo({ ...base, lingua: 'en' })), 'Because pewpew è il nuovo ka-chow');
  assert.equal(riga(htmlPaginaColpo({ ...base, lingua: 'es' })), 'Porque pewpew is the new ka-chow');
});

test('dello streamer: il suo testo, o spento', () => {
  assert.equal(riga(htmlPaginaColpo({ ...base, testi: { slogan: 'Tira <forte>' } })), 'Tira &lt;forte&gt;', 'il testo dello streamer, mai come HTML');
  assert.equal(riga(htmlPaginaColpo({ ...base, testi: { sloganAcceso: false } })), null, 'spento: niente riga');
  const n = normalizza({ slogan: '  ciao  ', sloganAcceso: false });
  assert.deepEqual([n.slogan, n.sloganAcceso, normalizza({}).sloganAcceso], ['ciao', false, true]);
});
