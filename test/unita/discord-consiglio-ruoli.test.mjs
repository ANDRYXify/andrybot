// «SAREBBE COSI': IO LASCEREI SOLO QUESTI, CHIAMANDOLI IN QUESTO MODO».
//
// Il server che uno ha gia' e la traccia sono due elenchi di nomi senza niente
// in comune: «mod» da una parte, «Moderatori» dall'altra. Abbinarli e' un'
// IPOTESI, e in modalita' distruttiva un'ipotesi sbagliata non si vede — il
// ruolo cancellato lo perdono tutti quelli che ce l'avevano, in silenzio.
//
// Percio' qui si prova la forma che lo impedisce:
//
//  · si abbina SOLO da una tabella scritta a mano, mai per somiglianza;
//  · se i candidati sono due, non si sceglie: si crea quello che manca;
//  · un ruolo riconosciuto si RINOMINA, non si cancella e rifa — e' l'unico
//    modo che non spoglia nessuno;
//  · quello che lo streamer decide di tenere resta anche quando si fa piazza
//    pulita, e resta per ID: rinominarlo dopo non lo rimette in lista.
import test from 'node:test';
import assert from 'node:assert/strict';
import { consiglioRuoli, differenzaRuoli, improntaDi, ALTRI_NOMI } from '../../src/features/discord-preset.js';
import { normalizzaPreset } from '../../src/features/discord-catalogo.js';
import { PERMESSI_RUOLO } from '../../src/features/discord-catalogo.js';
import { PERMESSI_BOT } from '../../src/features/discord-api.js';

const GUILD = '900000000000000001';
const BOT = '700000000000000001';
const SUO = '800000000000000001';
const foto = (ruoli = [], { livello = 9, bits = PERMESSI_BOT } = {}) => ({
  guild: { id: GUILD },
  bot: { id: BOT, ruoli: [SUO], livello },
  bits,
  ruoli: [
    { id: GUILD, nome: '@everyone', position: 0, permessi: '0' },
    { id: SUO, nome: 'SocialBot', position: livello, permessi: bits, managed: true },
    ...ruoli,
  ],
});
const r = (id, nome, extra = {}) => ({ id, nome, position: 3, colore: 0, permessi: '0', ...extra });
const TRACCIA = { ruoli: [{ nome: 'Moderatori', privilegi: ['moderare'] }, { nome: 'Abbonati', privilegi: [] }] };

test('«mod» e «sub» li riconosce, e dice che li prenderebbe lui', () => {
  const c = consiglioRuoli(foto([r('810000000000000001', 'mod'), r('810000000000000002', 'sub')]), TRACCIA);
  assert.deepEqual(c.prendi.map((x) => [x.nome, x.diventa]), [['mod', 'Moderatori'], ['sub', 'Abbonati']]);
  assert.deepEqual(c.crea, [], 'e allora non c\'e\' niente da creare');
});

test('quello che in tabella non c\'e\' non si abbina, nemmeno se somiglia', () => {
  // «moderazione» somiglia a «Moderatori» quanto basta a convincere un
  // punteggio, e qui non deve succedere niente: la tabella non lo nomina.
  const c = consiglioRuoli(foto([r('810000000000000003', 'moderazione')]), TRACCIA);
  assert.deepEqual(c.prendi, []);
  assert.deepEqual(c.crea, ['Moderatori', 'Abbonati']);
  assert.ok(!ALTRI_NOMI.moderatori.includes('moderazione'), 'e in tabella non c\'e\' davvero');
});

test('due candidati fermano il consiglio invece di farlo tirare a indovinare', () => {
  const c = consiglioRuoli(foto([r('810000000000000004', 'mod'), r('810000000000000005', 'mods')]), TRACCIA);
  assert.deepEqual(c.prendi, [], 'quale dei due diventa «Moderatori» non lo sappiamo');
  assert.ok(c.crea.includes('Moderatori'));
});

test('chi ha poteri o si fa vedere lo risparmierei; il resto lo toglierei', () => {
  const c = consiglioRuoli(foto([
    r('810000000000000006', 'Aiutanti', { permessi: String(PERMESSI_RUOLO.pulire) }),
    r('810000000000000007', 'Fondatori', { separato: true }),
    r('810000000000000008', 'rosso'),
  ]), TRACCIA);
  assert.deepEqual(c.risparmia.map((x) => x.nome), ['Aiutanti', 'Fondatori']);
  assert.deepEqual(c.togli.map((x) => x.nome), ['rosso']);
  assert.equal(c.risparmia[0].conPotere, true, 'e si dice PERCHE\' lo risparmierei');
});

test('un ruolo che si chiama gia\' come la traccia non finisce nel consiglio', () => {
  const c = consiglioRuoli(foto([r('810000000000000009', 'Moderatori')]), TRACCIA);
  assert.deepEqual(c.prendi, []);
  assert.deepEqual(c.togli, []);
  assert.deepEqual(c.crea, ['Abbonati'], 'manca solo l\'altro');
});

test('accettato il consiglio, il ruolo si RINOMINA: non si cancella e rifa', () => {
  const vecchio = foto([r('810000000000000010', 'mod', { permessi: String(PERMESSI_RUOLO.moderare) })]);
  const preso = normalizzaPreset({ categorie: [{ nome: 'x', canali: [] }],
    ruoli: [{ nome: 'Moderatori', privilegi: ['moderare'], da: '810000000000000010' }] });
  const d = differenzaRuoli(vecchio, preso, { togliere: true });
  assert.deepEqual(d.crea, [], 'niente nasce');
  assert.deepEqual(d.togli, [], 'e niente muore: chi aveva «mod» tiene il ruolo');
  assert.equal(d.sistema.length, 1);
  assert.equal(d.sistema[0].id, '810000000000000010');
  assert.equal(d.sistema[0].rinomina, 'Moderatori');
  assert.equal(d.sistema[0].nome, 'mod', 'e si continua a raccontarlo col nome che ha adesso');
});

test('senza il consiglio, la stessa piazza pulita lo avrebbe cancellato', () => {
  const vecchio = foto([r('810000000000000010', 'mod', { permessi: String(PERMESSI_RUOLO.moderare) })]);
  const d = differenzaRuoli(vecchio, normalizzaPreset({ categorie: [{ nome: 'x', canali: [] }], ruoli: TRACCIA.ruoli }), { togliere: true });
  assert.deepEqual(d.togli.map((x) => x.nome), ['mod'], 'ecco la differenza che fa il rinomina');
});

test('un id che non c\'e\' piu\' fa nascere il ruolo, non ripiega sul nome', () => {
  const preso = normalizzaPreset({ categorie: [{ nome: 'x', canali: [] }],
    ruoli: [{ nome: 'Moderatori', da: '810000000000000099' }] });
  const d = differenzaRuoli(foto([r('810000000000000011', 'Moderatori')]), preso, { togliere: true });
  assert.equal(d.crea.length, 1, 'il nome stava cambiando: ripiegarci sopra sarebbe un\'altra cosa');
  assert.deepEqual(d.togli.map((x) => x.nome), ['Moderatori']);
});

test('quello che risparmio resta anche facendo piazza pulita, e resta per id', () => {
  const dentro = foto([r('810000000000000012', 'Fondatori', { separato: true }), r('810000000000000013', 'rosso')]);
  const preset = normalizzaPreset({ categorie: [{ nome: 'x', canali: [] }], ruoli: TRACCIA.ruoli, risparmia: ['810000000000000012'] });
  assert.deepEqual(preset.risparmia, ['810000000000000012'], 'e nel preset ci arriva pulito');
  const d = differenzaRuoli(dentro, preset, { togliere: true });
  assert.deepEqual(d.togli.map((x) => x.nome), ['rosso']);
});

test('due rinomini diversi non hanno la stessa firma', () => {
  const uno = { ruoli: { crea: [], sistema: [{ id: '1', nome: 'mod', rinomina: 'Moderatori' }], togli: [] } };
  const due = { ruoli: { crea: [], sistema: [{ id: '1', nome: 'mod', rinomina: 'Staff' }], togli: [] } };
  assert.notEqual(improntaDi(uno), improntaDi(due),
    'sennò un «sì, fallo» dato su uno varrebbe per l\'altro');
});
