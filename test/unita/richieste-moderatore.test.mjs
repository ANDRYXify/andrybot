// LA PORTA CHE SI APRE DALL'ALTRO LATO.
//
// Finora moderatore si diventava solo se lo streamer si ricordava di invitarti.
// Adesso si può chiedere. Le due cose che questo collaudo tiene ferme sono
// quelle che, se cedono, trasformano una porta in una casella per chiunque:
//
//  1. una richiesta NON è un moderatore: non dà accesso e non occupa un posto
//     del piano finché non c'è un sì;
//  2. la prova è un FATTO. Dove la piattaforma sa rispondere si chiede a lei;
//     dove non sa, la richiesta arriva marcata «non verificata» — e «non lo so»
//     non diventa mai «sì», né «no».
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('richieste-mod-');
const { managers } = await import('../../src/db.js');
const { provaModerazione, verificabile } = await import('../../src/moderatori/prova.js');
test.after(() => casa.pulisci());

// --- la prova ---------------------------------------------------------------

const helixCon = (mods) => ({ getModerators: async () => mods });

test('su Twitch la prova la dà Twitch, non chi chiede', async () => {
  const si = await provaModerazione('andryx', 'tizio', { helix: helixCon([{ user_login: 'Tizio' }]) });
  assert.equal(si.verificata, true, 'maiuscole e minuscole non contano');

  const no = await provaModerazione('andryx', 'tizio', { helix: helixCon([{ user_login: 'altro' }]) });
  assert.equal(no.verificata, false);
  assert.equal(no.negata, true, 'Twitch ha risposto, e ha detto di no');
});

test('«non lo so» non diventa mai «no»', async () => {
  // Twitch non ha risposto (permesso mancante, rete, quel che sia): l'elenco è
  // null. Trattarlo come "non è moderatore" direbbe a un moderatore vero che non
  // lo è, e la richiesta legittima verrebbe sbattuta fuori.
  const r = await provaModerazione('andryx', 'tizio', { helix: helixCon(null) });
  assert.equal(r.verificata, false);
  assert.notEqual(r.negata, true, 'non è un no: è un non lo so');
});

test('dove la piattaforma non sa rispondere, non si finge di saperlo', async () => {
  for (const canale of ['kick.marta', 'yt.marta']) {
    const r = await provaModerazione(canale, canale.split('.')[0] + '.tizio', { helix: helixCon([]) });
    assert.equal(r.verificata, false);
    assert.notEqual(r.negata, true);
    assert.ok(r.motivo, 'e si dice perché');
  }
});

test('due piattaforme diverse non si possono confrontare', () => {
  // L'elenco dei moderatori di un canale Twitch contiene login Twitch: un
  // account Kick non ci comparirà mai, nemmeno se quella persona modera davvero.
  assert.equal(verificabile('andryx', 'kick.tizio'), false);
  assert.equal(verificabile('kick.andryx', 'tizio'), false);
  assert.equal(verificabile('andryx', 'tizio'), true);
});

// --- la richiesta -----------------------------------------------------------

test('una richiesta non occupa un posto del piano', () => {
  const ch = 'canale1';
  managers.invita(ch, 'mod1', { token: 't1', expires: 0 });
  assert.equal(managers.contaPosti(ch), 1);
  managers.chiedi(ch, 'chiedente1', { display: 'Chiedente' });
  assert.equal(managers.contaPosti(ch), 1, 'chi ha solo chiesto non toglie il posto a nessuno');
  assert.equal(managers.listByChannel(ch).length, 1, 'e non compare fra i moderatori');
  assert.equal(managers.richiesteByChannel(ch).length, 1);
});

test('una richiesta non dà accesso finché non c’è un sì', () => {
  const ch = 'canale2';
  managers.chiedi(ch, 'chiedente2', {});
  assert.equal(managers.attiviByLogin('chiedente2').length, 0, 'niente accesso');
  managers.attiva(ch, 'chiedente2', 'Chiedente');
  assert.equal(managers.attiviByLogin('chiedente2').length, 1, 'dopo il sì, sì');
  assert.equal(managers.contaPosti(ch), 1, 'e adesso il posto lo occupa');
});

test('dopo un no si aspetta, e chi ritira no', () => {
  const ch = 'canale3';
  const r = managers.chiedi(ch, 'chiedente3', {});
  managers.rifiuta(ch, r.id);
  assert.match(managers.perchePuoiNo(ch, 'chiedente3'), /no/, 'non si può richiedere subito');
  // passata l'attesa, si può riprovare
  assert.equal(managers.perchePuoiNo(ch, 'chiedente3', Date.now() + managers.ATTESA_DOPO_RIFIUTO + 1000), '');

  const ch2 = 'canale4';
  managers.chiedi(ch2, 'chiedente3', {});
  managers.ritira(ch2, 'chiedente3');
  assert.equal(managers.perchePuoiNo(ch2, 'chiedente3'), '', 'chi ritira può richiedere quando vuole');
});

test('chi ha già l’accesso non lo richiede', () => {
  const ch = 'canale5';
  managers.invita(ch, 'mod5', { token: 't5', expires: 0 });
  managers.attiva(ch, 'mod5', '');
  assert.match(managers.perchePuoiNo(ch, 'mod5'), /gestisci già/);
});

test('chi ha chiesto vede anche il no', () => {
  const ch = 'canale6';
  const r = managers.chiedi(ch, 'chiedente6', {});
  assert.equal(managers.richiesteByLogin('chiedente6').length, 1);
  managers.rifiuta(ch, r.id);
  const mie = managers.richiesteByLogin('chiedente6');
  assert.equal(mie.length, 1, 'la risposta resta visibile: non sparisce lasciando ad aspettare');
  assert.equal(mie[0].status, 'rifiutato');
});

test('una richiesta non può cancellare un accesso che c’è già', () => {
  const ch = 'canale7';
  managers.invita(ch, 'mod7', { token: 't7', expires: 0 });
  managers.attiva(ch, 'mod7', '');
  // Si chiama chiedi() SALTANDO il controllo della rotta: è il caso che conta,
  // perché il controllo lo si può dimenticare in una strada nuova. La riga deve
  // restare com'era comunque.
  managers.chiedi(ch, 'mod7', { nota: 'fammi entrare' });
  assert.equal(managers.get(ch, 'mod7').status, 'attivo', 'chi era dentro resta dentro');
  assert.equal(managers.attiviByLogin('mod7').length, 1);
  assert.equal(managers.richiesteByChannel(ch).length, 0, 'e non compare come richiesta');

  // e lo stesso per un invito ancora da aprire
  const ch2 = 'canale8';
  managers.invita(ch2, 'mod8', { token: 't8', expires: 0 });
  managers.chiedi(ch2, 'mod8', {});
  assert.equal(managers.get(ch2, 'mod8').status, 'invitato', 'l’invito non si perde');
  assert.ok(managers.get(ch2, 'mod8').invite_token, 'e il link continua a valere');
});
