// I RUOLI DAL COSTRUTTORE, e le tre regole di Discord che decidono tutto.
//
//  · sopra il bot non si arriva;
//  · si puo' dare solo quello che si ha;
//  · cancellare un ruolo lo toglie a tutti, in silenzio.
//
// Non sono prudenze nostre: sono come e' fatto Discord. Qui si prova che il
// costruttore le rispetta PRIMA di chiamare, invece di scoprirle da un errore
// a meta' strada — con il ruolo gia' creato e i permessi a meta'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { differenzaRuoli, improntaDi, vuota } from '../../src/features/discord-preset.js';
import { PERMESSI_RUOLO, nonPuoDare } from '../../src/features/discord-catalogo.js';
import { PERMESSI_BOT } from '../../src/features/discord-api.js';

const GUILD = '900000000000000001';
const BOT = '700000000000000001';
const SUO = '800000000000000001';

// Una fotografia finta: il bot sta al livello 9, e quello che gli sta sopra
// non e' roba sua da toccare.
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
const tuttoTranne = (nome) => String(BigInt(PERMESSI_BOT) & ~PERMESSI_RUOLO[nome]);

test('un ruolo che non c\'e\' si crea, e uno che c\'e\' non si rifa\'', () => {
  const voluto = { ruoli: [{ nome: 'Moderatori', colore: 0x3aa76d, separato: true, privilegi: ['moderare'] }] };
  const d = differenzaRuoli(foto(), voluto);
  assert.equal(d.crea.length, 1);
  assert.equal(d.crea[0].nome, 'Moderatori');

  // e con quel ruolo gia' a posto, la seconda volta non c'e' niente da fare:
  // e' la stessa proprieta' dei canali, e vale per lo stesso motivo — la
  // differenza e' vuota, non perche' ci ricordiamo di aver gia' applicato.
  const gia = foto([{ id: '810000000000000005', nome: 'Moderatori', position: 3,
    colore: 0x3aa76d, separato: true, citabile: false, permessi: String(PERMESSI_RUOLO.moderare) }]);
  const d2 = differenzaRuoli(gia, voluto);
  assert.deepEqual([d2.crea.length, d2.sistema.length], [0, 0]);
});

test('sopra il bot non si arriva, e lo si dice invece di provarci', () => {
  const alto = foto([{ id: '810000000000000009', nome: 'Moderatori', position: 20, permessi: '0' }]);
  const d = differenzaRuoli(alto, { ruoli: [{ nome: 'Moderatori', privilegi: ['moderare'] }] });
  assert.deepEqual(d.crea, [], 'non se ne crea un secondo con lo stesso nome');
  assert.deepEqual(d.sistema, [], 'e non si prova a cambiarlo');
  assert.deepEqual(d.fuoriPortata, ['Moderatori'], 'si dice, perche' + '’' + ' altrimenti sembrerebbe fatto');
});

test('un ruolo di un\'integrazione non si tocca, nemmeno se la traccia lo nomina', () => {
  // E' il caso vero: il ruolo dei sub di Twitch e' `managed`, e Discord non lo
  // lascia muovere a nessuno.
  const sub = foto([{ id: '810000000000000007', nome: 'Abbonati', position: 2, managed: true, permessi: '0' }]);
  const d = differenzaRuoli(sub, { ruoli: [{ nome: 'Abbonati', privilegi: ['emojiAltrui'] }] });
  assert.deepEqual(d.sistema, []);
  assert.deepEqual(d.fuoriPortata, ['Abbonati']);
});

test('si puo\' dare solo quello che si ha, e il ruolo nasce lo stesso', () => {
  // Senza questa regola il costruttore chiamerebbe Discord con un privilegio
  // che non possiede: la chiamata fallisce, e resta un ruolo a meta'. Qui il
  // privilegio si toglie PRIMA e si dice quale.
  const senzaCacciare = foto([], { bits: tuttoTranne('cacciare') });
  const puoiDare = (p) => !nonPuoDare([p], senzaCacciare.bits).length;
  const d = differenzaRuoli(senzaCacciare, {
    ruoli: [{ nome: 'Moderatori', privilegi: ['moderare', 'cacciare'] }],
  }, { puoiDare });
  assert.deepEqual(d.nonPosso, ['cacciare']);
  const bits = BigInt(d.crea[0].permessi);
  assert.equal((bits & PERMESSI_RUOLO.moderare) === PERMESSI_RUOLO.moderare, true, 'il resto arriva');
  assert.equal((bits & PERMESSI_RUOLO.cacciare), 0n, 'e quello che non si puo\' dare non si manda');
});

test('chi e\' amministratore puo\' passare tutto', () => {
  const capo = foto([], { bits: String(1n << 3n) });
  const puoiDare = (p) => !nonPuoDare([p], capo.bits).length;
  const d = differenzaRuoli(capo, { ruoli: [{ nome: 'Moderatori', privilegi: ['bannare'] }] }, { puoiDare });
  assert.deepEqual(d.nonPosso, []);
});

test('il modo normale aggiunge, il distruttivo fa diventare esattamente la traccia', () => {
  const con = foto([{ id: '810000000000000004', nome: 'Moderatori', position: 3,
    permessi: String(PERMESSI_RUOLO.bannare) }]);
  const voluto = { ruoli: [{ nome: 'Moderatori', privilegi: ['moderare'] }] };

  const avanti = differenzaRuoli(con, voluto);
  const dopoAvanti = BigInt(avanti.sistema[0].permessi);
  assert.equal((dopoAvanti & PERMESSI_RUOLO.bannare) === PERMESSI_RUOLO.bannare, true,
    'andando avanti non si spegne niente: quello che aveva resta');
  assert.equal((dopoAvanti & PERMESSI_RUOLO.moderare) === PERMESSI_RUOLO.moderare, true);

  const pulizia = differenzaRuoli(con, voluto, { togliere: true });
  const dopoPulizia = BigInt(pulizia.sistema[0].permessi);
  assert.equal((dopoPulizia & PERMESSI_RUOLO.bannare), 0n,
    'di la\' il ruolo diventa esattamente quello che dice la traccia');
  assert.equal((dopoPulizia & PERMESSI_RUOLO.moderare) === PERMESSI_RUOLO.moderare, true);
});

test('un privilegio che non sappiamo nominare non si spegne nemmeno nel distruttivo', () => {
  // Perche' non potremmo mostrarlo nell'anteprima: cambiare il server in un
  // modo che non si puo' far vedere e' esattamente quello che il costruttore
  // non deve fare. Qui si usa un bit fuori dalla nostra tabella.
  const ignoto = 1n << 30n;   // MANAGE_WEBHOOKS: vero, e non nel nostro vocabolario
  const con = foto([{ id: '810000000000000006', nome: 'Moderatori', position: 3, permessi: String(ignoto) }]);
  const d = differenzaRuoli(con, { ruoli: [{ nome: 'Moderatori', privilegi: ['moderare'] }] }, { togliere: true });
  assert.equal((BigInt(d.sistema[0].permessi) & ignoto) === ignoto, true);
});

test('due ruoli con lo stesso nome non si indovinano', () => {
  const doppio = foto([
    { id: '810000000000000011', nome: 'Moderatori', position: 3, permessi: '0' },
    { id: '810000000000000012', nome: 'moderatori', position: 4, permessi: '0' },
  ]);
  const d = differenzaRuoli(doppio, { ruoli: [{ nome: 'Moderatori', privilegi: ['moderare'] }] });
  assert.deepEqual([d.crea.length, d.sistema.length], [0, 0], 'quale dei due avremmo dovuto cambiare?');
  assert.deepEqual(d.ambigui, ['Moderatori']);
});

test('nel distruttivo si toglie quello che la traccia non prevede, e mai quello che non e\' nostro', () => {
  const server = foto([
    { id: '810000000000000021', nome: 'Vecchio', position: 2, permessi: String(PERMESSI_RUOLO.pulire) },
    { id: '810000000000000022', nome: 'Decorativo', position: 1, permessi: '0' },
    { id: '810000000000000023', nome: 'Padrone', position: 30, permessi: '8' },
    { id: '810000000000000024', nome: 'Sub Twitch', position: 2, managed: true, permessi: '0' },
  ]);
  const d = differenzaRuoli(server, { ruoli: [{ nome: 'Moderatori' }] }, { togliere: true });
  assert.deepEqual(d.togli.map((x) => x.nome).sort(), ['Decorativo', 'Vecchio'],
    '@everyone, il bot, chi sta sopra e le integrazioni non entrano proprio nell\'elenco');
  // e il peso lo da' il potere, non l'eta': un ruolo con dei privilegi, se
  // sparisce, cambia chi puo' fare cosa — e nessuno se ne accorge subito.
  assert.equal(d.togli.find((x) => x.nome === 'Vecchio').conPotere, true);
  assert.equal(d.togli.find((x) => x.nome === 'Decorativo').conPotere, false);
});

test('l\'impronta cambia se cambiano i ruoli, sennò il «sì» sarebbe una firma in bianco', () => {
  const base = { crea: [], sistema: [], togli: [] };
  const senza = improntaDi({ ...base, ruoli: { crea: [], sistema: [], togli: [] } });
  const con = improntaDi({ ...base, ruoli: { crea: [{ nome: 'Moderatori', permessi: '8' }], sistema: [], togli: [] } });
  assert.notEqual(senza, con);
  assert.equal(vuota({ ...base, ruoli: { crea: [], sistema: [], togli: [] } }), true);
  assert.equal(vuota({ ...base, ruoli: { crea: [{ nome: 'X' }], sistema: [], togli: [] } }), false,
    '«non c\'è niente da fare» non può essere vero mentre nasce un ruolo');
});
