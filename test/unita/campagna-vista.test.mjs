// LA PAGINA DEL QR: ogni caso detto per quello che e', nella lingua della pubblicita'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { paginaCampagna, titoloDi, ANTEPRIMA_SITO } from '../../src/web/campagna-vista.js';
import { norm, SEME } from '../../src/features/campagne.js';

const campagna = (id, x = {}) => { const s = SEME.find((q) => q.id === id) || {}; return { id, ...norm({ ...s, dal: '2026-11-02', ...x }).campagna }; };
const pag = (id, x = {}, c = {}) => paginaCampagna(campagna(id, c), { stato: 'aperta', presi: 120, ...x });
const testo = (h) => h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('fuori dai motori, con la sua anteprima e nella lingua della campagna', () => {
  const nyc = pag('nyc'), mi = pag('milano');
  assert.match(nyc, /<html lang="en">/); assert.match(mi, /<html lang="it">/);
  for (const [id, h] of [['nyc', nyc], ['milano', mi]]) {
    assert.match(h, /<meta name="robots" content="noindex,nofollow">/);
    const img = SEME.find((q) => q.id === id).anteprima;
    assert.match(img, new RegExp(`^/icons/campagna-${id}\\.png\\?v=\\d+$`), 'la sua, con la versione');
    assert.ok(h.includes(`<meta property="og:image" content="https://socialbot.live${img}">`), img);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://socialbot.live/${id}">`));
  }
  assert.match(testo(nyc), /One year of everything, free/);
  assert.match(testo(mi), /Un anno di tutto, gratis.*per strada a Milano/);
  const nuova = paginaCampagna({ id: 'roma', ...norm({ lingua: 'es' }).campagna }, { stato: 'prima' });
  assert.match(nuova, new RegExp(`content="https://socialbot.live${ANTEPRIMA_SITO.es.replace('?', '\\?')}"`), 'senza anteprima sua, quella del sito nella sua lingua');
  assert.match(testo(nuova), /Lo viste en un anuncio/, 'e senza luogo, una pubblicita\' qualunque');
});

test('le parole nascono dalle regole della campagna', () => {
  const corta = campagna('milano', { giorni: 30, tetto: 50, finestra: 7, pacchetti: ['giochi', 'musica'] });
  assert.equal(titoloDi(corta), '30 giorni di Giochi & Classifiche e Richieste Musicali, gratis');
  const t = testo(paginaCampagna(corta, { stato: 'aperta', presi: 10, persona: { chi: 'proprietario', no: null } }));
  assert.match(t, /Giochi & Classifiche e Richieste Musicali sbloccati per 30 giorni, per i primi 50 canali/);
  assert.match(t, /Ne restano 40 su 50/);
  assert.match(t, /Prendo i miei 30 giorni/);
  assert.match(t, /entro il 8 novembre 2026/, 'sette giorni di finestra: l\'ultimo e\' l\'8');
  const scritta = campagna('napoli', { testi: { titolo: 'Napoli, un anno per te', frase: 'Dal lungomare dritto in chat.' } });
  assert.equal(titoloDi(scritta), 'Napoli, un anno per te', 'il titolo scritto dall\'admin vince');
  assert.match(testo(paginaCampagna(scritta, { stato: 'aperta' })), /Dal lungomare dritto in chat\./);
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
  assert.match(t({ stato: 'spenta' }), /L'offerta si è chiusa\. /, 'spenta dall\'admin: chiusa, senza una data finta');
  assert.match(t({ persona: { chi: 'proprietario', no: 'gia', fino: Date.parse('2027-11-05T12:00:00Z') } }), /È tuo: hai tutto sbloccato fino al 5 novembre 2027/);
  assert.match(t({ esito: 'presa', persona: { chi: 'proprietario', no: 'gia', fino: Date.parse('2027-11-05T12:00:00Z') } }), /Fatto: hai tutto sbloccato fino al 5 novembre 2027/);
  assert.match(t({ persona: { chi: 'proprietario', no: 'abbonato' } }), /prima disdici il piano da Abbonamento/);
  assert.match(t({ persona: { chi: 'proprietario', no: 'tutto' } }), /ha già tutto sbloccato/);
  assert.match(t({}), /entro il 1 dicembre 2026/, 'e le regole dicono fino a quando');
});

test('niente lineette lunghe e niente faccine involontarie nei testi', () => {
  for (const id of ['nyc', 'milano', 'napoli']) {
    for (const c of [{}, { giorni: 30, pacchetti: ['giochi'] }]) {
      const x = testo(pag(id, {}, c));
      assert.doesNotMatch(x, /—/);
      assert.doesNotMatch(x, /[:;=]\s?['-]?\s?[)(|\[\]DPpOo0l1I\\/](?![A-Za-z0-9])/, 'due punti seguiti da un segno che sembra una bocca');
    }
  }
});
