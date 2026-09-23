// LA TUA SETTIMANA: i difetti che non devono esistere.
//
// Il ragionamento sta in docs/SETTIMANA.md. Qui le cose che devono restare
// vere:
//  · la settimana si legge da un posto solo, e i posti vecchi valgono finche'
//    non si salva;
//  · dal pannello non si puo' dire al server cosa e' «nostro» su Twitch;
//  · un segmento scritto a mano dallo streamer non si tocca mai;
//  · il cambio d'ora non lascia doppioni;
//  · un segmento che non si e' riusciti a togliere resta nostro, e si riprova.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../src/features/settimana.js';

const ROMA = 'Europe/Rome';
const giorni = (...righe) => S.normalizzaGiorni(righe);
const lun = (ora, att = '') => ({ ora, att });
const riposo = { off: true, ora: '21:00', att: 'niente' };

test('la settimana si legge da un posto solo, e i posti vecchi valgono finche\' non si salva', () => {
  const vecchia = { grafiche: { giorni: [lun('21:00', 'Diablo 4'), riposo] }, discordEventi: { dura: 180, fuso: 'Europe/London' } };
  const s = S.settimanaDi(vecchia);
  assert.equal(s.giorni[0].ora, '21:00');
  assert.equal(s.giorni[0].att, 'Diablo 4');
  assert.equal(s.giorni[1].off, true);
  assert.equal(s.giorni.length, 7, 'sette giorni sempre, anche se ne erano scritti due');
  assert.equal(s.dura, 180, 'la durata che c\'era sul calendario di Discord');
  assert.equal(s.fuso, 'Europe/London');

  const nuova = { ...vecchia, settimana: { giorni: [lun('18:30', 'Minecraft')], dura: 90, fuso: ROMA } };
  const t = S.settimanaDi(nuova);
  assert.equal(t.giorni[0].att, 'Minecraft', 'salvata una volta, vince la casa nuova');
  assert.equal(t.dura, 90);
  assert.equal(t.fuso, ROMA);

  assert.equal(S.settimanaDi({}).giorni.every((g) => !g.ora), true, 'niente scritto, niente orari: nessun 21:00 inventato');
});

test('la durata sta dentro quello che accettano tutti e due i calendari', () => {
  assert.equal(S.duraOk(15), 30, 'Twitch non accetta meno di mezz\'ora');
  assert.equal(S.duraOk(1440), 1380, 'ne\' piu\' di ventitre ore');
  assert.equal(S.duraOk('abc'), S.DURA_BASE);
  assert.equal(S.settimanaDi({ discordEventi: { dura: 15 } }).dura, 30, 'anche quella vecchia');
});

test('un\'ora scritta male non diventa un orario, e un fuso inventato non passa', () => {
  const g = giorni(lun('25:00'), lun('9:05'), lun('21:7'), lun(' 21:30 '));
  assert.deepEqual(g.slice(0, 4).map((x) => x.ora), ['', '09:05', '', '21:30']);
  assert.equal(S.normalizzaSettimana({ fuso: 'Luna/Base' }).fuso, S.FUSO_BASE);
});

test('dal pannello non si puo\' dire cosa e\' nostro su Twitch', () => {
  const prima = { twitch: { acceso: true, scritti: [{ g: 0, ora: '21:00', titolo: 'A' }], categorie: { a: { id: '1', name: 'A' } } } };
  const corpo = { twitch: { acceso: true, scritti: [{ g: 3, ora: '18:00', titolo: 'suo' }], categorie: { x: { id: '9' } } } };
  const s = S.normalizzaSettimana(corpo, prima);
  assert.deepEqual(s.twitch.scritti, prima.twitch.scritti, 'la memoria di cosa e\' nostro la tiene il server');
  assert.deepEqual(s.twitch.categorie, prima.twitch.categorie);
  assert.equal(s.twitch.acceso, true, 'l\'interruttore invece e\' dello streamer');
});

const sett = (righe, { acceso = true, scritti = [], categorie = {}, dura = 120 } = {}) => ({
  giorni: giorni(...righe), dura, fuso: ROMA, twitch: { acceso, scritti, categorie },
});
const pres = (id, g, ora, titolo, { ricorrente = true, categoria = '', dura = 120 } = {}) => ({ id, g, ora, titolo, ricorrente, categoria, dura });

test('un segmento per giorno, e i giorni di riposo non ci sono', () => {
  const v = S.slotVoluti(sett([lun('21:00', 'Diablo 4'), riposo, lun('', 'senza ora'), lun('18:00', 'Minecraft')],
    { categorie: { 'diablo 4': { id: '515024', name: 'Diablo IV' } } }));
  assert.deepEqual(v.map((x) => [x.g, x.ora, x.titolo, x.categoria]), [[0, '21:00', 'Diablo 4', '515024'], [3, '18:00', 'Minecraft', '']]);
});

test('sul Programma vuoto si scrive tutto', () => {
  const d = S.differenzaProgramma(sett([lun('21:00', 'A'), lun('21:00', 'B')]), []);
  assert.equal(d.crea.length, 2);
  assert.equal(d.togli.length + d.sistema.length, 0);
});

test('uno dei nostri si sistema, e solo in quello che e\' cambiato', () => {
  const s = sett([lun('21:00', 'Diablo 4')], { scritti: [{ g: 0, ora: '21:00', titolo: 'Minecraft' }], categorie: { 'diablo 4': { id: '7' } } });
  const d = S.differenzaProgramma(s, [pres('x', 0, '21:00', 'Minecraft', { categoria: '5' })]);
  assert.deepEqual(d.sistema, [{ id: 'x', g: 0, ora: '21:00', titolo: 'Diablo 4', categoria: '7' }]);
  assert.equal(d.crea.length + d.togli.length, 0);
  const uguale = S.differenzaProgramma(s, [pres('x', 0, '21:00', 'Diablo 4', { categoria: '7' })]);
  assert.equal(uguale.vuota, true, 'non si riscrive l\'uguale');
});

test('quello che non sappiamo dire non si cancella', () => {
  const s = sett([lun('21:00', '')], { scritti: [{ g: 0, ora: '21:00', titolo: 'Vecchio' }] });
  const d = S.differenzaProgramma(s, [pres('x', 0, '21:00', 'Vecchio', { categoria: '5' })]);
  assert.equal(d.vuota, true, 'senza attivita\' e senza categoria trovata, titolo e categoria restano come sono');
});

test('un segmento scritto a mano non si tocca, e se occupa il posto lo si dice', () => {
  const s = sett([lun('21:00', 'A')]);
  const d = S.differenzaProgramma(s, [pres('suo', 0, '21:00', 'Il mio torneo'), pres('altro', 4, '15:00', 'Suo anche questo')]);
  assert.deepEqual(d.occupati, [{ g: 0, ora: '21:00', titolo: 'Il mio torneo' }]);
  assert.equal(d.crea.length, 0, 'due dirette nello stesso posto non si scrivono');
  assert.equal(d.togli.length + d.sistema.length, 0, 'e quello che non e\' nostro non si tocca');
});

test('un segmento singolo non e\' mai nostro: scriviamo solo ricorrenti', () => {
  const s = sett([lun('21:00', 'A')], { scritti: [{ g: 0, ora: '21:00', titolo: 'A' }] });
  const d = S.differenzaProgramma(s, [pres('una-volta', 0, '21:00', 'A', { ricorrente: false })]);
  assert.equal(d.occupati.length, 1);
  assert.equal(d.togli.length, 0);
});

test('quello che non vuoi piu\' si toglie, e spegnere toglie tutto quello che era nostro', () => {
  const scritti = [{ g: 0, ora: '21:00', titolo: 'A' }, { g: 2, ora: '21:00', titolo: 'B' }];
  const presenti = [pres('a', 0, '21:00', 'A'), pres('b', 2, '21:00', 'B'), pres('suo', 5, '10:00', 'Suo')];
  const d = S.differenzaProgramma(sett([lun('21:00', 'A')], { scritti }), presenti);
  assert.deepEqual(d.togli.map((x) => x.id), ['b']);
  const spento = S.differenzaProgramma(sett([lun('21:00', 'A')], { scritti, acceso: false }), presenti);
  assert.deepEqual(spento.togli.map((x) => x.id).sort(), ['a', 'b'], 'e il suo resta');
});

test('il cambio d\'ora non lascia doppioni: il nostro slittato si toglie e si rimette', () => {
  const s = sett([lun('21:00', 'A')], { scritti: [{ g: 0, ora: '21:00', titolo: 'A' }] });
  const d = S.differenzaProgramma(s, [pres('vecchio', 0, '20:00', 'A')]);
  assert.deepEqual(d.togli.map((x) => x.id), ['vecchio']);
  assert.equal(d.crea.length, 1);
  assert.equal(d.crea[0].ora, '21:00');
  const suo = S.differenzaProgramma(s, [pres('suo', 0, '20:00', 'Un\'altra cosa')]);
  assert.equal(suo.togli.length, 0, 'un\'ora prima con un altro titolo e\' una diretta sua, non la nostra spostata');
});

test('i segmenti di Twitch si leggono nel fuso', () => {
  const p = S.slotPresenti([
    { id: 'x', start_time: '2026-09-28T19:00:00Z', end_time: '2026-09-28T21:00:00Z', title: 'A', category: { id: '5' }, is_recurring: true },
    { id: 'y', start_time: '2026-11-02T20:00:00Z', end_time: '2026-11-02T22:30:00Z', title: 'B', category: null, is_recurring: true },
    { id: '', start_time: '2026-09-28T19:00:00Z' },
  ], ROMA);
  assert.deepEqual(p.map((x) => [x.id, x.g, x.ora, x.dura, x.categoria]), [['x', 0, '21:00', 120, '5'], ['y', 0, '21:00', 150, '']],
    'lunedi\' alle 21 a Roma, prima e dopo il cambio d\'ora');
});

function twitchFinto({ segmenti = [], rotti = new Set() } = {}) {
  const fatte = [];
  return {
    fatte,
    async programma() { return { ok: true, segmenti }; },
    async creaSegmento(login, x) { fatte.push(['crea', x]); return { ok: true, id: 'nuovo' }; },
    async sistemaSegmento(login, id, x) { fatte.push(['sistema', id, x]); return { ok: true }; },
    async togliSegmento(login, id) { fatte.push(['togli', id]); return rotti.has(id) ? { ok: false, errore: 'Twitch irraggiungibile' } : { ok: true }; },
  };
}

test('il giro scrive all\'ora giusta nel fuso, e ricorda cosa ha scritto', async () => {
  const tw = twitchFinto();
  const adesso = new Date('2026-09-23T10:00:00Z');
  const e = await S.sincronizzaProgramma(tw, 'io', sett([lun('21:00', 'A')]), { adesso });
  assert.equal(e.creati, 1);
  const [, x] = tw.fatte[0];
  assert.equal(x.inizio.toISOString(), '2026-09-28T19:00:00.000Z', 'il prossimo lunedi\' alle 21 di Roma');
  assert.equal(x.fuso, ROMA, 'col fuso, perche\' Twitch ripeta l\'ora del posto');
  assert.deepEqual(e.scritti, [{ g: 0, ora: '21:00', titolo: 'A' }]);
});

test('un segmento che non si riesce a togliere resta nostro, e il prossimo giro riprova', async () => {
  const scritti = [{ g: 2, ora: '21:00', titolo: 'B' }];
  const tw = twitchFinto({ segmenti: [
    { id: 'b', start_time: '2026-09-23T19:00:00Z', end_time: '2026-09-23T21:00:00Z', title: 'B', is_recurring: true },
  ], rotti: new Set(['b']) });
  const e = await S.sincronizzaProgramma(tw, 'io', sett([], { scritti }), { adesso: new Date('2026-09-23T10:00:00Z') });
  assert.equal(e.tolti, 0);
  assert.deepEqual(e.scritti, scritti, 'dimenticarlo vorrebbe dire lasciarlo li\' per sempre, scambiato per suo');
  assert.deepEqual(e.errori, ['Twitch irraggiungibile']);
});

test('le categorie si cercano una volta per attivita\', e quelle gia\' trovate non si ricercano', async () => {
  let cerche = 0;
  const helix = { async searchCategories(q) { cerche++; return q.includes('mine') ? [{ id: '27471', name: 'Minecraft' }] : []; } };
  const s = sett([lun('21:00', 'Minecraft'), lun('21:00', 'minecraft'), lun('18:00', 'Diablo 4')], { categorie: { 'diablo 4': { id: '515024', name: 'Diablo IV' } } });
  const c = await S.categorieDi(helix, s);
  assert.deepEqual(c, { minecraft: { id: '27471', name: 'Minecraft' }, 'diablo 4': { id: '515024', name: 'Diablo IV' } });
  const prima = cerche;
  await S.categorieDi(helix, { ...s, twitch: { ...s.twitch, categorie: c } });
  assert.equal(cerche, prima, 'la seconda volta, nessuna ricerca');
});

test('una categoria non trovata si ricerca al salvataggio dopo: «nessuna» puo\' essere Twitch che non rispondeva', async () => {
  let risponde = false;
  const helix = { async searchCategories() { return risponde ? [{ id: '490147', name: 'Hollow Knight' }] : []; } };
  const s = sett([lun('21:00', 'Hollow Knight')]);
  const prima = await S.categorieDi(helix, s);
  assert.deepEqual(prima, { 'hollow knight': null });
  risponde = true;
  const dopo = await S.categorieDi(helix, { ...s, twitch: { ...s.twitch, categorie: prima } });
  assert.deepEqual(dopo, { 'hollow knight': { id: '490147', name: 'Hollow Knight' } }, 'ricordare «nessuna» vorrebbe dire scriverla per sempre senza categoria');
});

// LA PROSSIMA DIRETTA, quella che la Home mostra quando non sei in onda.
test('la prossima diretta e\' il primo giorno in onda che deve ancora cominciare, nel fuso della settimana', () => {
  const sett = S.normalizzaSettimana({
    giorni: [lun('21:00', 'Diablo 4'), riposo, {}, lun('18:00', 'Minecraft'), {}, {}, lun('21:00', 'Chiacchiere')],
    fuso: ROMA,
  });
  sett.twitch.categorie = { minecraft: { id: '27471', name: 'Minecraft' } };
  const p = S.prossimaDiretta(sett, new Date('2026-09-22T08:00:00Z'));
  assert.equal(new Date(p.quando).toISOString(), '2026-09-24T16:00:00.000Z', 'martedi\' mattina: la prossima e\' giovedi\' alle 18 di Roma');
  assert.deepEqual([p.giorno, p.ora, p.att, p.categoria, p.fuso], [3, '18:00', 'Minecraft', 'Minecraft', ROMA]);

  const lunedi = S.prossimaDiretta(sett, new Date('2026-09-21T18:59:00Z'));
  assert.equal(new Date(lunedi.quando).toISOString(), '2026-09-21T19:00:00.000Z', 'un minuto prima: e\' stasera');
  const partita = S.prossimaDiretta(sett, new Date('2026-09-21T19:00:00Z'));
  assert.equal(partita.giorno, 3, 'all\'ora esatta non e\' piu\' «la prossima»');
  assert.equal(S.prossimaDiretta(sett, new Date('2026-09-21T19:00:00Z')).categoria, 'Minecraft');
});

test('la prossima diretta segue l\'ora scritta anche quando cambia l\'ora', () => {
  const sett = S.normalizzaSettimana({ giorni: [{}, {}, {}, {}, {}, lun('21:00'), lun('21:00')], fuso: ROMA });
  const sabato = S.prossimaDiretta(sett, new Date('2026-10-24T12:00:00Z'));
  assert.equal(new Date(sabato.quando).toISOString(), '2026-10-24T19:00:00.000Z', 'sabato alle 21, ora legale');
  const domenica = S.prossimaDiretta(sett, new Date('2026-10-24T19:30:00Z'));
  assert.equal(new Date(domenica.quando).toISOString(), '2026-10-25T20:00:00.000Z', 'domenica alle 21, ora solare: sempre le 21 di Roma');
});

test('senza giorni in onda non c\'e\' una prossima, e un fuso che non esiste non la sposta', () => {
  assert.equal(S.prossimaDiretta(S.settimanaDi({}), new Date('2026-09-22T08:00:00Z')), null, 'niente scritto: nessuna sera inventata');
  const solo = S.normalizzaSettimana({ giorni: [riposo, { ora: '', att: 'senza ora' }], fuso: ROMA });
  assert.equal(S.prossimaDiretta(solo, new Date('2026-09-22T08:00:00Z')), null, 'il riposo e un giorno senza ora non sono dirette');
  const storto = { giorni: S.normalizzaGiorni([lun('21:00')]), fuso: 'Luna/Base' };
  assert.equal(S.prossimaDiretta(storto, new Date('2026-09-22T08:00:00Z')).fuso, S.FUSO_BASE);
});
