// LA PORTA D'INGRESSO: le regole che non devono poter saltare.
//
// Chi arriva su un server incontra tre cose — quando potra' scrivere, cosa
// legge aprendolo, e le domande che gli aprono i canali. Il ragionamento che
// tiene insieme il pezzo sta in docs/DISCORD-INGRESSO.md; qui ci sono i difetti
// che non devono poter esistere:
//
//  · nella traccia canali e ruoli si chiamano per NOME, perche' la traccia li
//    sta creando: un id scritto li' sarebbe l'id di un canale che non c'e';
//  · il modo (0/1) si deriva dalle domande, non si chiede: chiederlo vorrebbe
//    dire far indovinare una regola di Discord, e scoprire lo sbaglio da un
//    rifiuto;
//  · quello che Discord pretende si CONTA prima, sul mondo che ci sara' — non
//    su quello di adesso, che non ha ancora i canali della traccia;
//  · non si riscrive l'uguale, perche' riscrivere cancella le risposte che le
//    persone hanno gia' dato;
//  · quando il titolo coincide, l'id di prima si porta avanti: cambiare una
//    risposta non deve smemorare le altre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaPreset, dallaFotografia, MAX_DOMANDE, MAX_RISPOSTE } from '../../src/features/discord-catalogo.js';
import { differenzaIngresso, canaliDelDopo, vuota, improntaDi, MIN_PARTENZA, MIN_APERTI } from '../../src/features/discord-preset.js';
import { VIEW_CHANNEL, SEND_MESSAGES } from '../../src/features/discord-api.js';

const TUTTO = String(VIEW_CHANNEL | SEND_MESSAGES);
const canale = (id, nome, opz = {}) => ({ id, nome, tipo: 0, overwrites: [], ...opz });
const foto = (opz = {}) => ({
  guild: { id: '100' },
  caratteristiche: ['COMMUNITY'],
  ruoli: [{ id: '100', nome: '@everyone', permessi: TUTTO }, { id: '300', nome: 'Giocatori', permessi: '0' }],
  canali: [canale('1', 'generale'), canale('2', 'annunci')],
  ...opz,
});

const setteCanali = ['generale', 'annunci', 'giochi', 'musica', 'foto', 'aiuto', 'off-topic'];
const tracciaCompleta = (ing = {}) => normalizzaPreset({
  categorie: [{ nome: 'Chiacchiere', canali: ['giochi', 'musica', 'foto', 'aiuto', 'off-topic'].map((n) => ({ nome: n, tipo: 'testo' })) }],
  ruoli: [{ nome: 'Giocatori' }],
  ingresso: { acceso: true, canaliDiPartenza: setteCanali, domande: [], ...ing },
});

test('canali e ruoli si nominano per nome, e un id non passa per nome', () => {
  const p = normalizzaPreset({ ingresso: { acceso: true, canaliDiPartenza: ['generale'],
    domande: [{ titolo: 'Cosa ti interessa?', risposte: [{ titolo: 'I giochi', canali: ['giochi'], ruoli: ['Giocatori'] }] }] } });
  assert.deepEqual(p.ingresso.canaliDiPartenza, ['generale']);
  assert.deepEqual(p.ingresso.domande[0].risposte[0].canali, ['giochi']);
  assert.deepEqual(p.ingresso.domande[0].risposte[0].ruoli, ['Giocatori']);
});

test('una domanda senza risposte non e\' una domanda', () => {
  const p = normalizzaPreset({ ingresso: { domande: [
    { titolo: 'Vuota', risposte: [] },
    { titolo: 'Piena', risposte: [{ titolo: 'Sì' }] },
  ] } });
  assert.deepEqual(p.ingresso.domande.map((d) => d.titolo), ['Piena']);
});

test('quante domande e quante risposte ci stanno', () => {
  const tante = Array.from({ length: MAX_DOMANDE + 4 }, (_, i) => ({ titolo: 'D' + i, risposte: [{ titolo: 'x' }] }));
  const molte = Array.from({ length: MAX_RISPOSTE + 5 }, (_, i) => ({ titolo: 'R' + i }));
  const p = normalizzaPreset({ ingresso: { domande: [...tante.slice(0, 1), ...tante.slice(1)] } });
  assert.equal(p.ingresso.domande.length, MAX_DOMANDE);
  const q = normalizzaPreset({ ingresso: { domande: [{ titolo: 'D', risposte: molte }] } });
  assert.equal(q.ingresso.domande[0].risposte.length, MAX_RISPOSTE);
});

test('il modo lo decidono le domande, non chi scrive la traccia', () => {
  const senza = differenzaIngresso(tracciaCompleta(), foto(), {});
  assert.equal(senza.cambia.modo, 0, 'senza domande contano solo i canali di partenza');
  const con = differenzaIngresso(tracciaCompleta({
    domande: [{ titolo: 'Cosa ti interessa?', risposte: [{ titolo: 'I giochi', canali: ['giochi'] }] }],
  }), foto(), {});
  assert.equal(con.cambia.modo, 1, 'con le domande contano anche i canali che aprono');
});

test('i canali del dopo comprendono quelli che la traccia sta creando', () => {
  const m = canaliDelDopo(tracciaCompleta(), foto());
  for (const n of setteCanali) assert.ok(m.has(n), `${n} deve essere nel mondo che ci sara'`);
  assert.equal(m.get('giochi').apre, true, 'un canale nuovo senza regole e\' aperto a tutti');
});

test('un canale chiuso a tutti non conta fra quelli aperti', () => {
  const p = normalizzaPreset({
    categorie: [{ nome: 'Chiacchiere', canali: [
      { nome: 'regole', tipo: 'testo', permessi: [{ chi: 'tutti', nega: ['scrivere'] }] },
      { nome: 'segreta', tipo: 'testo', permessi: [{ chi: 'tutti', nega: ['vedere'] }] },
      { nome: 'libero', tipo: 'testo' },
    ] }],
  });
  const m = canaliDelDopo(p, foto());
  assert.equal(m.get('regole').apre, false);
  assert.equal(m.get('segreta').apre, false);
  assert.equal(m.get('libero').apre, true);
});

test('un canale chiuso sul server resta chiuso, anche se la traccia non ne parla', () => {
  const chiuso = canale('9', 'privato', { overwrites: [{ id: '100', tipo: 0, allow: '0', deny: String(VIEW_CHANNEL) }] });
  const m = canaliDelDopo(tracciaCompleta(), foto({ canali: [canale('1', 'generale'), chiuso] }));
  assert.equal(m.get('privato').apre, false);
});

test('un canale nuovo senza regole sue eredita dalla sua categoria', () => {
  const p = normalizzaPreset({ categorie: [
    { nome: 'Riservata', permessi: [{ chi: 'tutti', nega: ['vedere'] }], canali: [{ nome: 'dentro', tipo: 'testo' }] },
  ] });
  assert.equal(canaliDelDopo(p, foto()).get('dentro').apre, false);
});

test('senza Community non si prova nemmeno, e lo si dice', () => {
  const d = differenzaIngresso(tracciaCompleta(), foto({ caratteristiche: [] }), {});
  assert.match(d.blocco, /Community/);
});

test('sotto i canali che Discord pretende si dice quanti sono, non si prova', () => {
  const p = normalizzaPreset({ ingresso: { acceso: true, canaliDiPartenza: ['generale'] } });
  const d = differenzaIngresso(p, foto(), {});
  assert.ok(d.blocco.includes(String(MIN_PARTENZA)) && d.blocco.includes(String(MIN_APERTI)));
  assert.match(d.blocco, /qui sono 1 e 1/);
});

test('con la porta spenta le condizioni non si applicano', () => {
  const p = normalizzaPreset({ ingresso: { acceso: false, canaliDiPartenza: ['generale'] } });
  assert.equal(differenzaIngresso(p, foto(), {}).blocco, '');
});

test('la sola schermata di benvenuto non passa dalle condizioni delle domande', () => {
  const p = normalizzaPreset({ ingresso: { acceso: true, benvenuto: { testo: 'Ciao', canali: [{ canale: 'generale', testo: 'qui' }] } } });
  const d = differenzaIngresso(p, foto(), {});
  assert.equal(d.cambia.porta, false, 'non c\'e\' nessuna porta da scrivere');
  assert.equal(d.blocco, '', 'i sette canali valgono per le domande, non per la schermata');
  assert.deepEqual(d.dice.map((x) => x.campo), ['benvenuto']);
});

// ---- non si riscrive l'uguale -------------------------------------------
const fotoPiena = () => foto({
  canali: [canale('1', 'generale'), canale('2', 'annunci'), canale('3', 'giochi'), canale('4', 'musica'),
    canale('5', 'foto'), canale('6', 'aiuto'), canale('7', 'off-topic')],
});
const statoUguale = () => ({
  benvenuto: { ok: true, testo: 'Ciao', canali: [{ canale: '1', testo: 'si parla qui', emoji: '' }] },
  ingresso: { ok: true, acceso: true, modo: 1, canaliDiPartenza: ['1', '2', '3', '4', '5', '6', '7'],
    domande: [{ id: 'p1', titolo: 'Cosa ti interessa?', tipo: 0, unaSola: false, obbligatoria: false, allIngresso: true,
      risposte: [
        { id: 'o1', titolo: 'I giochi', testo: '', emoji: '', canali: ['3'], ruoli: ['300'] },
        { id: 'o2', titolo: 'La musica', testo: '', emoji: '', canali: ['4'], ruoli: [] },
      ] }] },
});
const tracciaUguale = (risposteInPiu = []) => tracciaCompleta({
  benvenuto: { testo: 'Ciao', canali: [{ canale: 'generale', testo: 'si parla qui' }] },
  domande: [{ titolo: 'Cosa ti interessa?', risposte: [
    { titolo: 'I giochi', canali: ['giochi'], ruoli: ['Giocatori'] },
    { titolo: 'La musica', canali: ['musica'] },
    ...risposteInPiu,
  ] }],
});

test('una porta gia\' cosi\' non si riscrive', () => {
  assert.equal(differenzaIngresso(tracciaUguale(), fotoPiena(), statoUguale()), null);
});

test('il nome storpiato da Discord e\' lo stesso nome', () => {
  const p = tracciaCompleta({ canaliDiPartenza: ['Generale', 'annunci', 'giochi', 'musica', 'foto', 'aiuto', 'off topic'],
    benvenuto: { testo: 'Ciao', canali: [{ canale: 'Generale', testo: 'si parla qui' }] },
    domande: tracciaUguale().ingresso.domande });
  assert.equal(differenzaIngresso(p, fotoPiena(), statoUguale()), null,
    '«Generale» e «generale» sono lo stesso canale, e «off topic» e «off-topic» pure');
});

test('cambiare una risposta non smemora le altre', () => {
  const d = differenzaIngresso(tracciaUguale([{ titolo: 'Le foto', canali: ['foto'] }]), fotoPiena(), statoUguale());
  assert.deepEqual(d.dice.map((x) => x.campo), ['domande']);
  assert.equal(d.cambia.domande[0].id, 'p1', 'la domanda resta la stessa');
  assert.deepEqual(d.cambia.domande[0].risposte.map((r) => r.id || ''), ['o1', 'o2', ''],
    'le due di prima tengono il loro id, la nuova non ne ha');
});

test('la porta entra nell\'impronta, e col suo valore', () => {
  const d = differenzaIngresso(tracciaUguale([{ titolo: 'Le foto', canali: ['foto'] }]), fotoPiena(), statoUguale());
  assert.equal(vuota({ ingresso: d }), false, '«niente da fare» non vale se la porta cambia');
  const una = improntaDi({ ingresso: d });
  const altra = improntaDi({ ingresso: { ...d, dice: [{ campo: 'domande', a: 99 }] } });
  assert.notEqual(una, altra, 'due porte diverse non possono avere la stessa firma');
});

test('«leggi il mio server» si porta dietro anche la porta', () => {
  const p = dallaFotografia(fotoPiena(), { porta: {
    benvenuto: { ok: true, testo: 'Ciao', canali: [{ canale: '1', testo: 'si parla qui', emoji: '' }] },
    ingresso: statoUguale().ingresso,
  } });
  assert.equal(p.ingresso.acceso, true);
  assert.deepEqual(p.ingresso.canaliDiPartenza, ['generale', 'annunci', 'giochi', 'musica', 'foto', 'aiuto', 'off-topic']);
  assert.deepEqual(p.ingresso.domande[0].risposte[0].canali, ['giochi'], 'gli id tornano nomi');
  assert.deepEqual(p.ingresso.domande[0].risposte[0].ruoli, ['Giocatori']);
  assert.equal(p.ingresso.benvenuto.canali[0].canale, 'generale');
  assert.equal(differenzaIngresso(p, fotoPiena(), statoUguale()), null,
    'quello che si e\' letto, riscritto, non cambia niente');
});
