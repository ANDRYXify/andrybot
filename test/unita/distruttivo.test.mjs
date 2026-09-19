// LA CHIAVE CHE SCADE, e il peso di quello che stai per cancellare.
//
// Qui si prova la cosa che rende innocuo il resto: che senza la chiave la
// porta che cancella non risponda, che una chiave non apra la casa di un
// altro, e che dimenticarla accesa non sia possibile.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creaChiavi, DURATA_MS } from '../../src/web/chiave-breve.js';
import { peso, VIVO_MS, TANTI } from '../../src/features/discord-peso.js';

const conOrologio = () => {
  let adesso = 1_000_000;
  const k = creaChiavi({ ora: () => adesso });
  return { k, avanti: (ms) => { adesso += ms; }, quando: () => adesso };
};

test('una chiave vale per chi l\'ha chiesta, e per quello che ha chiesto', () => {
  const { k } = conOrologio();
  const a = k.conia('tizio', 'canali');
  assert.ok(a.chiave);
  assert.equal(k.vale(a.chiave, 'tizio', 'canali'), true);
  assert.equal(k.vale(a.chiave, 'caio', 'canali'), false, 'la chiave di Tizio non apre casa di Caio');
  assert.equal(k.vale(a.chiave, 'tizio', 'ruoli'), false, 'e quella per i canali non vale per i ruoli');
  assert.equal(k.vale('inventata', 'tizio', 'canali'), false);
  assert.equal(k.vale('', 'tizio', 'canali'), false, 'nemmeno una chiave vuota');
});

test('dimenticarla accesa non e\' possibile: scade da sola', () => {
  const { k, avanti } = conOrologio();
  const a = k.conia('tizio', 'canali');
  avanti(DURATA_MS - 1000);
  assert.equal(k.vale(a.chiave, 'tizio', 'canali'), true, 'poco prima vale ancora');
  avanti(2000);
  assert.equal(k.vale(a.chiave, 'tizio', 'canali'), false, 'poco dopo non vale piu\'');
  assert.equal(k.quante(), 0, 'e non resta nemmeno in memoria');
});

test('guardare non la consuma: fra il «vedi» e il «fai» passano piu\' chiamate', () => {
  const { k } = conOrologio();
  const a = k.conia('tizio', 'canali');
  for (let i = 0; i < 5; i++) assert.equal(k.vale(a.chiave, 'tizio', 'canali'), true);
});

test('due schede non tengono aperta la porta il doppio del tempo', () => {
  const { k } = conOrologio();
  const a = k.conia('tizio', 'canali');
  const b = k.conia('tizio', 'canali');
  assert.equal(k.vale(a.chiave, 'tizio', 'canali'), false, 'la prima si brucia');
  assert.equal(k.vale(b.chiave, 'tizio', 'canali'), true);
  assert.equal(k.quante(), 1);
});

test('uscire dalla modalita\' chiude la porta subito, senza aspettare la scadenza', () => {
  const { k } = conOrologio();
  const a = k.conia('tizio', 'canali');
  assert.equal(k.brucia(a.chiave), true);
  assert.equal(k.vale(a.chiave, 'tizio', 'canali'), false);
});

test('la fascia sa quanto manca, e dice zero quando non vale piu\'', () => {
  const { k, avanti } = conOrologio();
  const a = k.conia('tizio', 'canali');
  assert.equal(k.restano(a.chiave), DURATA_MS);
  avanti(60_000);
  assert.equal(k.restano(a.chiave), DURATA_MS - 60_000);
  avanti(DURATA_MS);
  assert.equal(k.restano(a.chiave), 0);
});

// ---- il peso ------------------------------------------------------------
const ORA = 1_700_000_000_000;
const morto = (nome) => ({ nome, tipo: 0, ultimoMessaggio: ORA - VIVO_MS - 86400000 });
const vivo = (nome) => ({ nome, tipo: 0, ultimoMessaggio: ORA - 86400000 });

test('la domanda cambia forma quando c\'e\' qualcosa di vivo da perdere', () => {
  const zitti = peso([morto('a'), morto('b')], { ora: ORA });
  assert.equal(zitti.quanti, 2);
  assert.deepEqual(zitti.vivi, []);
  assert.equal(zitti.scriviIlNome, false, 'roba ferma da un pezzo: basta confermare');

  const con = peso([morto('a'), vivo('generale')], { ora: ORA });
  assert.deepEqual(con.vivi, ['generale']);
  assert.equal(con.scriviIlNome, true, 'un canale che ha parlato la settimana scorsa cambia la domanda');
});

test('e cambia anche quando e\' tanta roba insieme, viva o no', () => {
  const tanti = Array.from({ length: TANTI + 1 }, (_, i) => morto('c' + i));
  const p = peso(tanti, { ora: ORA });
  assert.deepEqual(p.vivi, []);
  assert.equal(p.scriviIlNome, true, 'undici cose in un colpo non si confermano a occhio');
  assert.equal(peso(tanti.slice(0, TANTI), { ora: ORA }).scriviIlNome, false);
});

test('le categorie si contano a parte: pesano diverso', () => {
  const p = peso([morto('a'), { nome: 'Roba', tipo: 4, ultimoMessaggio: 0 }], { ora: ORA });
  assert.equal(p.quanti, 2);
  assert.equal(p.categorie, 1);
});

test('niente da togliere non chiede niente', () => {
  const p = peso([], { ora: ORA });
  assert.deepEqual([p.quanti, p.vivi.length, p.scriviIlNome], [0, 0, false]);
  assert.equal(peso(null).quanti, 0, 'e nemmeno un elenco che non c\'e\'');
});

test('un ruolo pesa per il potere che porta, non per l\'eta\'', () => {
  // Un ruolo non riceve messaggi, quindi «ha parlato di recente» non gli si
  // puo' chiedere. La domanda vera e' la stessa dei canali — «se sparisce,
  // qualcuno se ne accorge?» — e per un ruolo la risposta la da' il potere:
  // sparendo, cambia chi puo' fare cosa, e non lo vede nessuno finche' non
  // serve.
  const decorativo = { nome: 'Vecchi', conPotere: false };
  const conPotere = { nome: 'Moderatori', conPotere: true };
  assert.equal(peso([decorativo], { ora: ORA }).scriviIlNome, false,
    'un ruolo che era solo un colore si conferma come tutto il resto');
  const p = peso([decorativo, conPotere], { ora: ORA });
  assert.deepEqual(p.vivi, ['Moderatori']);
  assert.equal(p.scriviIlNome, true, 'ma uno che porta privilegi cambia la domanda');
  assert.equal(p.ruoli, 2, 'e i ruoli si contano a parte, come le categorie');
});

test('canali e ruoli si pesano INSIEME, non a due domande piu\' leggere', () => {
  const canali = Array.from({ length: 6 }, (_, i) => morto('c' + i));
  const ruoli = Array.from({ length: 6 }, (_, i) => ({ nome: 'r' + i, conPotere: false }));
  assert.equal(peso(canali, { ora: ORA }).scriviIlNome, false);
  assert.equal(peso(ruoli, { ora: ORA }).scriviIlNome, false);
  assert.equal(peso([...canali, ...ruoli], { ora: ORA }).scriviIlNome, true,
    'dodici cose in un colpo sono dodici, comunque si chiamino');
});
