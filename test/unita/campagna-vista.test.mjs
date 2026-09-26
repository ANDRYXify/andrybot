// LA PAGINA DEL QR: ogni caso detto per quello che e', nella lingua della pubblicita'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { paginaCampagna, COPERTINA } from '../../src/web/campagna-vista.js';
import { CAMPAGNE, ID, finestra } from '../../src/features/campagne.js';

const pag = (id, x = {}) => paginaCampagna(id, { campagna: CAMPAGNE[id], stato: 'aperta', finestra: finestra(id, '2026-11-02'), presi: 120, ...x });
const testo = (h) => h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('fuori dai motori, con la sua anteprima e nella lingua della citta\'', () => {
  const nyc = pag('nyc'), mi = pag('milano');
  assert.match(nyc, /<html lang="en">/); assert.match(mi, /<html lang="it">/);
  for (const [id, h] of [['nyc', nyc], ['milano', mi]]) {
    assert.match(h, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(h, new RegExp(`<meta property="og:image" content="https://socialbot.live/icons/campagna-${id}.png\\?v=8">`));
    assert.match(h, new RegExp(`<link rel="canonical" href="https://socialbot.live/${id}">`));
  }
  assert.deepEqual(Object.keys(COPERTINA), ID, 'ogni citta\' ha la sua anteprima, e nessun\'altra');
  for (const id of ID) assert.equal(COPERTINA[id], `/icons/campagna-${id}.png?v=8`, 'il file della citta\', col timbro di tutte le icone');
  assert.match(testo(nyc), /One year of everything, free/);
  assert.match(testo(mi), /Un anno di tutto, gratis.*per strada a Milano/);
});

test('chi arriva da fuori entra con Twitch o Kick, e torna qui', () => {
  const h = pag('napoli', { kick: true });
  assert.match(h, /href="\/entra\?nuovo=1&amp;campagna=napoli"/);
  assert.match(h, /href="\/accedi\/kick\?campagna=napoli"/);
  assert.doesNotMatch(h, /<form/, 'e non vede il tasto per prenderlo: non ha ancora un canale');
  assert.match(testo(h), /Ne restano 380 su 500/);
});

test('il proprietario lo prende con un POST, il moderatore no', () => {
  const p = pag('nyc', { persona: { chi: 'proprietario', no: null } });
  assert.match(p, /<form method="post" action="\/nyc\/prendi"><button type="submit">Claim my year<\/button><\/form>/);
  const m = pag('nyc', { persona: { chi: 'moderatore' } });
  assert.doesNotMatch(m, /<form/);
  assert.match(testo(m), /Only the owner of the channel can claim it/);
});

test('ogni altro caso ha la sua frase', () => {
  const t = (x) => testo(pag('milano', x));
  assert.match(t({ stato: 'prima' }), /Si apre il giorno in cui esce la pubblicità/);
  assert.match(t({ stato: 'piena' }), /Sono stati presi tutti e 500/);
  assert.match(t({ stato: 'chiusa' }), /L'offerta si è chiusa il 1 dicembre 2026/, 'l\'ultimo giorno, non quello dopo');
  assert.match(t({ persona: { chi: 'proprietario', no: 'gia', fino: Date.parse('2027-11-05T12:00:00Z') } }), /È tuo: hai tutto sbloccato fino al 5 novembre 2027/);
  assert.match(t({ esito: 'presa', persona: { chi: 'proprietario', no: 'gia', fino: Date.parse('2027-11-05T12:00:00Z') } }), /Fatto: hai tutto sbloccato fino al 5 novembre 2027/);
  assert.match(t({ persona: { chi: 'proprietario', no: 'abbonato' } }), /prima disdici il piano da Abbonamento/);
  assert.match(t({ persona: { chi: 'proprietario', no: 'tutto' } }), /ha già tutto sbloccato/);
  assert.match(t({}), /entro il 1 dicembre 2026/, 'e le regole dicono fino a quando');
});

test('niente lineette lunghe e niente faccine involontarie nei testi', () => {
  for (const id of ['nyc', 'milano', 'napoli']) {
    const x = testo(pag(id));
    assert.doesNotMatch(x, /—/);
    assert.doesNotMatch(x, /[:;=]\s?['-]?\s?[)(|\[\]DPpOo0l1I\\/](?![A-Za-z0-9])/, 'due punti seguiti da un segno che sembra una bocca');
  }
});
