// IL RIMEDIO A CHI LO PUO' FARE (docs/RIMEDI.md).
//
// Il bot scrive in chat con l'account dello streamer. A uno spettatore che aveva
// chiesto una cosa allo streamer ha risposto, con quel nome, «Su questa passo. Ma
// se me la insegni dalla dashboard non me la scordo più»: una frase falsa detta
// al posto suo, e una cosa da fare che lo spettatore non puo' fare.
//
// Qui si controlla la risposta vera, non il testo delle frasi (quello lo tiene
// scripts/verifica-rimedi.mjs): una domanda allo streamer che il bot non sa
// resta allo streamer; una domanda al bot che il bot non sa riceve un «non lo
// so» e basta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta();
test.after(() => casa.pulisci());

const { Brain } = await import('../../src/ai/brain.js');
const { aChiPuo, eStaff } = await import('../../src/features/risposte.js');

const CANALE = 'mizu__gamer';
const streamer = { login: CANALE, display: 'mizu__gamer', settings: { iaLocale: false } };

// Il bot senza nessuna risposta in mano: niente conoscenza, niente modello, e la
// ricerca in rete che non trova niente (qui non si esce dalla macchina).
function chiedi(text, botLogin = CANALE) {
  const b = new Brain({});
  b._cercaWeb = async () => null;
  return b._rispostaGrezza({ channel: CANALE, user: 'kevin_feriani', display: 'Kevin_Feriani', text, streamer, botLogin });
}

const RIMEDIO = /dashboard|pannell|insegn/i;

test('una domanda allo streamer che il bot non sa resta allo streamer', async () => {
  for (const text of [
    '@mizu__gamer e un gioco come pico park? E\' nel tuo dna?',
    'mizu__gamer ci giochi stasera a peak?',
    '@MIZU__GAMER sei mai stato in Giappone?',
  ]) {
    assert.equal(await chiedi(text), null, `«${text}»: il bot scrive col nome dello streamer e non sa, quindi tace`);
  }
});

test('una domanda al bot che il bot non sa: lo dice, e non manda nessuno al pannello', async () => {
  const viste = new Set();
  for (let i = 0; i < 40; i++) {
    const r = await chiedi('bot quanti anni ha la luna?');
    assert.ok(r, 'chi chiama «bot» riceve una risposta');
    assert.doesNotMatch(r, RIMEDIO, `«${r}» chiede a uno spettatore una cosa del proprietario`);
    viste.add(r);
  }
  assert.ok(viste.size > 1, 'le frasi del «non lo so» sono piu\' d\'una e girano');
});

test('se il bot ha un account suo, chiamarlo per nome e\' chiamare il bot', async () => {
  const r = await chiedi('@socialbot quanti anni ha la luna?', 'socialbot');
  assert.ok(r, 'la domanda era al bot: risponde');
  assert.doesNotMatch(r, RIMEDIO);
});

test('chiamato per nome senza una domanda, lo streamer saluta come prima', async () => {
  const r = await chiedi('@mizu__gamer ciao!');
  assert.ok(r && !RIMEDIO.test(r), 'il cenno resta, e non rimanda a niente');
});

test('il rimedio va allo staff, a tutti gli altri solo cosa e\' successo', () => {
  const testi = { staff: 'ricollegalo dal pannello', pubblico: 'adesso non risponde' };
  assert.equal(aChiPuo(eStaff({ isBroadcaster: true }), testi), testi.staff);
  assert.equal(aChiPuo(eStaff({ isMod: true }), testi), testi.staff);
  assert.equal(aChiPuo(eStaff({ isSelf: true }), testi), testi.staff, 'lo streamer scrive col suo account, che e\' quello del bot');
  assert.equal(aChiPuo(eStaff({ isSub: true, isVip: true }), testi), testi.pubblico);
  assert.equal(aChiPuo(eStaff(null), testi), testi.pubblico, 'un evento senza nessuno davanti non e\' lo staff');
});
