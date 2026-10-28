// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL BOT DEI CONSIGLI (docs/SCUDO.md, «Il bot dei consigli»): il modello puro.
//
// Due elenchi fissi, scritti a mano: i messaggi dei bot che vendono viewer e
// follower, nelle forme che girano davvero (dominio travestito, lettere di
// altri alfabeti, lettere staccate, tre lingue), e le frasi di una chat vera
// che toccano le stesse parole. Il primo elenco va preso tutto, il secondo
// non va toccato mai: un fan accusato di vendere davanti a tutti e' il danno
// peggiore che questa difesa puo' fare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { giudicaVendita, senzaTravestimento, nomeServizio } from '../../src/features/vendita.js';

const CERTI = [
  'Hello! I noticed your channel and you have great potential. Wanna become famous? Buy viewers, followers and primes on streamboo .com',
  'Wanna become famous? Buy followers, primes and viewers on dogehype (.) com',
  'cheap viewers on ezfollows dot com',
  'Best viewers on bigfollows . com',
  'Buy vіewers on streаmboo .com',                                  // і ucraina, а cirillica
  'b i g f o l l o w s . com cheap followers',
  'real followers and viewers, remove the spaces: grow fast . xyz',
  'Compra seguidores y espectadores baratos en dogehype punto com',
  'Ciao! ho visto il tuo canale, spettatori reali e follower a prezzi bassi, scrivimi su telegram',
  'Hey, I just came across your stream! I can help you grow your viewers, DM me on discord',
  'ｂｕｙ ｆｏｌｌｏｗｅｒｓ ｏｎ ｓｔｒｅａｍｂｏｏ ｃｏｍ',                // a larghezza piena
  'buy followers on stream​boo .com',                             // invisibile in mezzo
];
const PROBABILI = [
  'streamboo . com',
  'compra follower e viewer, scrivimi su discord',
];
const NORMALI = [
  "finito. com'è andata?",
  'basta. io vado',
  'che partita. gg',
  'lol. com si fa?',
  'come faccio a crescere di follower?',
  'le prime partite servono a crescere',
  'quanti viewer fai di solito?',
  'ho comprato il gioco in sconto',
  'scrivimi su discord dopo la live',
  'grazie per il follow!',
  'il livello sale tanto',
  'che prezzi assurdi su steam',
  'anche io cerco di crescere coi follower, scrivimi su discord',
  'comprare follower è da sfigati',
  'vai su twitch.tv/andryxify',
  'sei uno small streamer ma bravissimo',
  'how many viewers do you usually get?',
  'gg wp, see you tomorrow',
  'cuántos espectadores tienes?',
  // una parola del discorso vicino alla punteggiatura o a una parola doppia:
  // e' qui che un filtro di parole sbaglia
  'che partita. gg, quanti viewer oggi!',
  "bella live. com'è che hai così tanti viewer?",
  'ciao! sono alle prime armi e voglio crescere, scrivimi su discord',
  'il conteggio dei follower sale! ci vediamo su discord',
];

test('i bot dei consigli si prendono tutti, travestiti o no, in tre lingue', () => {
  for (const t of CERTI) assert.equal(giudicaVendita(t).livello, 'certo', t + ' → ' + JSON.stringify(giudicaVendita(t)));
});

test('a meta\' strada si toglie senza castigo', () => {
  for (const t of PROBABILI) assert.equal(giudicaVendita(t).livello, 'probabile', t + ' → ' + JSON.stringify(giudicaVendita(t)));
});

test('la chat vera non si tocca, nemmeno al primo messaggio', () => {
  for (const t of NORMALI) for (const primo of [false, true]) {
    if (primo && t === 'anche io cerco di crescere coi follower, scrivimi su discord') continue;
    assert.equal(giudicaVendita(t, { primo }).livello, '', `${t} (primo: ${primo}) → ${JSON.stringify(giudicaVendita(t, { primo }))}`);
  }
});

test('il primo messaggio pesa: chi spinge a crescere e lascia il contatto, appena arrivato', () => {
  const t = 'anche io cerco di crescere coi follower, scrivimi su discord';
  assert.equal(giudicaVendita(t).livello, '', 'chi e\' di casa no');
  assert.equal(giudicaVendita(t, { primo: true }).livello, 'probabile', 'appena arrivato si toglie, senza castigo');
  assert.equal(giudicaVendita('compra follower e viewer, scrivimi su discord', { primo: true }).livello, 'certo');
});

test('il travestimento si toglie prima di leggere', () => {
  assert.equal(senzaTravestimento('Vіеwеrѕ'), 'viewers');
  assert.equal(senzaTravestimento('s t r e a m b o o'), 'streamboo');
  assert.equal(senzaTravestimento('a b c'), 'a b c', 'tre lettere staccate sono parole, non un nome');
  assert.equal(senzaTravestimento('pe​rò'), 'pero');
});

test('i motivi dicono perche\', per il registro', () => {
  const g = giudicaVendita(CERTI[0], { primo: true });
  for (const m of ['indirizzo travestito', 'servizio che vende viewer', 'complimenti da copione', 'primo messaggio nel canale']) assert.ok(g.motivi.includes(m), m);
  assert.ok(g.motivi.some((m) => m.startsWith('discorso di vendita')));
  assert.ok(g.punti > 0);
  assert.deepEqual(giudicaVendita('ciao a tutti'), { punti: 0, motivi: [], livello: '' });
});

test('i nomi dello streamer valgono come quelli noti, travestiti compresi, e solo interi', () => {
  const servizi = ['growpanda', 'Ｖｉｅｗ-Ｎｅｓｔ'];
  assert.equal(giudicaVendita('cheap followers on g r o w p a n d a', { servizi }).livello, 'certo');
  assert.equal(giudicaVendita('buy viewers at view-nest', { servizi }).livello, 'certo');
  assert.equal(giudicaVendita('cheap followers on growpanda').livello, '', 'senza il nome, e\' una frase con un nome qualsiasi');
  assert.equal(giudicaVendita('cheap followers on growpandas', { servizi }).livello, '', 'solo il nome intero');
  assert.equal(giudicaVendita('compra follower', { servizi: ['ab', 'x'.repeat(41), '.*'] }).livello, '', 'i nomi impossibili non entrano');
  assert.equal(nomeServizio(' Stream.Boo! '), 'streamboo');
});
