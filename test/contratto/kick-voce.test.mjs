// CON QUALE VOCE SCRIVE IL BOT SU KICK.
//
// Kick offre due modi: `user` scrive con l'account di chi ha autorizzato (e
// vuole l'id del canale), `bot` scrive con l'identità dell'app. Partivamo da
// `bot` e Kick rispondeva «Internal server error»: silenzio totale — e per
// giunta con la voce sbagliata, perché la promessa del prodotto è che il bot
// scriva CON IL TUO ACCOUNT.
//
// Se una porta non si apre si passa all'altra dal messaggio DOPO, non
// riprovando subito lo stesso: una risposta d'errore non vuol dire che il
// messaggio non sia partito, e riprovarlo lo farebbe uscire due volte in chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-kickvoce-');
const { scrivi, salvaToken, vocePreferita, _azzeraVoce } = await import('../../src/kick/api.js');
test.after(() => usaEGetta.pulisci());

const CH = 'tizio';
salvaToken(CH, { accessToken: 'tok', refreshToken: '', scopes: ['chat:write'], expiresAt: Date.now() + 3600_000 }, '1373506');

// Kick sostituito: si tiene traccia di cosa gli mandiamo e si decide chi accetta.
function finto(accetta) {
  const visti = [];
  const impl = async (url, opt) => {
    const corpo = JSON.parse(opt.body);
    visti.push(corpo);
    if (accetta(corpo)) {
      return new Response(JSON.stringify({ data: { is_sent: true, message_id: 'm1' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  };
  return { impl, visti };
}

test('il bot scrive con il TUO account, e manda l’id del canale', async () => {
  _azzeraVoce();
  const k = finto(() => true);
  const r = await scrivi(CH, 'ciao a tutti', { fetchImpl: k.impl });
  assert.equal(r.ok, true);
  assert.equal(r.come, 'user');
  assert.equal(k.visti[0].type, 'user');
  assert.equal(k.visti[0].broadcaster_user_id, 1373506, 'come vuole Kick per il modo "user"');
  assert.equal(k.visti[0].content, 'ciao a tutti');
});

test('se Kick rifiuta, il messaggio NON esce due volte', async () => {
  _azzeraVoce();
  const k = finto(() => false);
  const r = await scrivi(CH, 'una risposta', { fetchImpl: k.impl });
  assert.equal(r.ok, false);
  assert.equal(k.visti.length, 1, 'un tentativo solo: riprovarlo lo farebbe uscire due volte');
  assert.match(r.errore, /Internal server error/);
  assert.equal(r.prossima, 'bot', 'ma la prossima volta si prova dall’altra porta');
});

test('e dal messaggio dopo passa davvero all’altra porta', async () => {
  _azzeraVoce();
  const solobot = finto((c) => c.type === 'bot');
  await scrivi(CH, 'prima', { fetchImpl: solobot.impl });      // come user → rifiutata
  assert.equal(vocePreferita(CH), 'bot');
  const r = await scrivi(CH, 'seconda', { fetchImpl: solobot.impl });
  assert.equal(r.ok, true);
  assert.equal(r.come, 'bot');
  assert.equal(solobot.visti.length, 2);
  assert.equal(solobot.visti[1].type, 'bot');
  assert.equal(solobot.visti[1].broadcaster_user_id, undefined, 'come bot l’id non si manda');
});

test('e poi ci resta, finché funziona', async () => {
  const solobot = finto((c) => c.type === 'bot');
  const r = await scrivi(CH, 'terza', { fetchImpl: solobot.impl });
  assert.equal(r.come, 'bot');
  assert.equal(solobot.visti.length, 1, 'nessun tentativo sprecato');
});

test('senza l’id del canale si parte dall’account del bot', async () => {
  _azzeraVoce();
  salvaToken('senzaid', { accessToken: 'tok', refreshToken: '', scopes: [], expiresAt: Date.now() + 3600_000 }, '');
  assert.equal(vocePreferita('senzaid'), 'bot');
  const k = finto(() => true);
  const r = await scrivi('senzaid', 'ciao', { fetchImpl: k.impl });
  assert.equal(r.come, 'bot');
  assert.equal(k.visti[0].type, 'bot');
});

test('un messaggio vuoto non parte e non consuma tentativi', async () => {
  _azzeraVoce();
  const k = finto(() => true);
  const r = await scrivi(CH, '   ', { fetchImpl: k.impl });
  assert.equal(r.ok, false);
  assert.equal(k.visti.length, 0);
});
