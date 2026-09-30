// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE PREFERENZE DEL CANALE NEL PANNELLO E NEL BOT (docs/PREFERENZE.md).
//
// La lingua del canale su Twitch si legge e si scrive solo quando cambia; le
// preferenze si leggono e si salvano solo dal proprietario; la carta sta dove
// il moderatore non arriva; e la Settimana dice quando il Programma e' dello
// streamer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-prefcanale-');
const { streamers } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
test.after(() => usaEGetta.pulisci());
const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('la lingua del canale su Twitch si legge, e si scrive solo quando cambia', async () => {
  streamers.upsertApproved('lingtw', 'LingTw', '901');
  streamers.upsertApproved('kick.lingk', 'LingK', 'k9');
  let chiesti = 0;
  const b = Object.create(BotManager.prototype);
  b.helix = { getChannelInfo: async () => { chiesti++; return { broadcaster_language: 'es' }; } };
  let scritture = 0;
  const vero = streamers.setSettings.bind(streamers);
  streamers.setSettings = (l, v) => { scritture++; return vero(l, v); };
  try {
    await b._giroLingue();
    assert.equal(streamers.get('lingtw').settings.linguaTwitch, 'es');
    const dopoPrimo = scritture;
    await b._giroLingue();
    assert.equal(scritture, dopoPrimo, 'la seconda volta la lingua e\' la stessa: niente da scrivere');
    assert.equal(streamers.get('kick.lingk').settings?.linguaTwitch, undefined, 'su Kick non si chiede a Twitch');
    assert.ok(chiesti >= 2);
  } finally { streamers.setSettings = vero; }
});

test('le preferenze si leggono e si salvano solo dal proprietario, e salvare dimentica il Programma tenuto da parte', () => {
  const S = leggi('src/web/server.js');
  assert.match(S, /app\.get\('\/api\/streamer\/preferenze', requireOwner,/);
  assert.match(S, /app\.post\('\/api\/streamer\/preferenze', requireOwner,/);
  const post = S.slice(S.indexOf("app.post('/api/streamer/preferenze'"), S.indexOf("app.post('/api/streamer/preferenze'") + 500);
  assert.ok(post.includes('prossime.dimenticaProgramma(login)'), 'cambiata la fonte, !prossima non risponde col Programma di prima');
});

test('nel pannello la carta sta dove il moderatore non arriva, e scegliendo non si ridisegna', () => {
  const A = leggi('src/web/public/app.js');
  const conto = A.slice(A.indexOf('function pannelloAccount() {'), A.indexOf("<h2>${_hIco(ICO.cestino)}${L('Andarsene'"));
  const soloProprietario = conto.slice(conto.lastIndexOf("${stato.ruolo === 'moderatore' ? '' : `"));
  assert.ok(soloProprietario.includes('id="carta-preferenze"'), 'la carta delle preferenze e\' nel ramo del proprietario');
  const f = A.slice(A.indexOf('function _disegnaPreferenze('), A.indexOf('async function caricaCollegamenti('));
  const cambio = f.slice(f.indexOf("el.addEventListener('change'"), f.indexOf("document.getElementById('btn-salva-preferenze')"));
  assert.ok(!cambio.includes('innerHTML'), 'una tendina che resta non ricompare: a ogni scelta si aggiornano etichette ed esempio, non la carta');
});

test('la Settimana dice quando il Programma di Twitch e\' la fonte scelta, e non lo tocca', () => {
  const S = leggi('src/web/server.js');
  assert.match(S, /posti\.tw = \{ permesso: programmaOk\(login\), delloStreamer: prossime\.programmaDelloStreamer\(login\) \}/);
  const A = leggi('src/web/public/app.js');
  assert.ok(A.includes('if (p.tw && p.tw.delloStreamer) {'));
  assert.ok(A.includes('if (tw && tw.delloStreamer) t.push('));
});
