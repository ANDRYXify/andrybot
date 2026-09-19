// IL PREMIO IN VIP: DUE GARE, E UNA DURATA CHE SI MISURA IN DIRETTE.
//
// Le prove che contano sono tre, e nascono tutte da un fatto:
//
//  · un premio che scade a calendario evapora mentre lo streamer sta fermo. Il
//    conto scende alla FINE di una diretta — non all'inizio, sennò un premio da
//    una diretta sparirebbe prima di essere goduto;
//  · le due gare hanno due giri separati: se si segnassero sullo stesso numero
//    si spegnerebbero a vicenda;
//  · chi aveva le impostazioni di prima non deve trovarsi il premio spento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-premio-');
const premio = await import('../../src/features/premio.js');
const { vips } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

test('senza niente scritto, due gare spente e dei posti sensati', () => {
  const p = premio.normalizza(undefined);
  assert.deepEqual(Object.keys(p).sort(), ['bit', 'monete']);
  assert.equal(p.monete.attivo, false);
  assert.equal(p.bit.attivo, false);
  assert.ok(p.bit.posti.length >= 3, 'i Bit hanno un podio di serie');
  assert.equal(p.bit.posti[0].titolo, 're');
  assert.ok(p.bit.posti[0].dirette > p.bit.posti[2].dirette, 'il primo posto vale piu\' del terzo');
});

test('i posti si contano da soli: quanti sono lo dice l\'elenco', () => {
  const p = premio.normalizza({ bit: { posti: [{ dirette: 5, titolo: 'RE' }, { dirette: 2, titolo: '' }] } });
  assert.equal(p.bit.posti.length, 2);
  assert.deepEqual(p.bit.posti, [{ dirette: 5, titolo: 'RE' }, { dirette: 2, titolo: '' }]);
  assert.equal(premio.titoloDi(p.bit, 1), '2° posto', 'un posto senza nome si chiama col suo numero');
  assert.equal(premio.titoloDi(p.bit, 0), 'RE');
});

test('numeri impossibili non passano, e un elenco vuoto torna a quello di serie', () => {
  const p = premio.normalizza({ monete: { posti: [{ dirette: 0 }, { dirette: 999 }, { dirette: 'boh' }] } });
  assert.equal(p.monete.posti[0].dirette, 1, 'zero dirette sarebbe un premio che non esiste');
  assert.equal(p.monete.posti[1].dirette, 60);
  assert.ok(p.monete.posti[2].dirette >= 1);
  assert.deepEqual(premio.normalizza({ monete: { posti: [] } }).monete.posti, premio.DEF.monete.posti.map((x) => ({ ...x })));
  assert.equal(premio.normalizza({ bit: { posti: Array(20).fill({ dirette: 1 }) } }).bit.posti.length, 5, 'cinque posti sono il tetto');
});

test('quello che non arriva resta com\'era', () => {
  const prima = premio.normalizza({ bit: { attivo: true, periodo: 'mese', posti: [{ dirette: 9, titolo: 'boss' }] } });
  const dopo = premio.normalizza({ bit: { attivo: false } }, prima);
  assert.equal(dopo.bit.attivo, false);
  assert.deepEqual(dopo.bit.posti, [{ dirette: 9, titolo: 'boss' }], 'i posti non si sono persi per strada');
  assert.equal(dopo.bit.periodo, 'mese');
});

// Chi aveva il premio acceso col formato di prima — `{ attivo, periodo, quanti }`
// — non deve trovarselo spento dopo un aggiornamento.
test('le impostazioni di prima si leggono ancora, e diventano la gara giusta', () => {
  const v = premio.normalizza({ attivo: true, periodo: 'mese', quanti: 3, saltaPerenni: false });
  assert.equal(v.monete.attivo, true, 'il premio di prima era sulle monete');
  assert.equal(v.monete.periodo, 'mese');
  assert.equal(v.monete.posti.length, 3, 'tre posti come i tre premiati di prima');
  assert.equal(v.monete.saltaPerenni, false);
  assert.equal(v.bit.attivo, false, 'e la gara che non c\'era resta spenta');

  const b = premio.normalizza({ attivo: true, da: 'bit', periodo: 'settimana', quanti: 2 });
  assert.equal(b.bit.attivo, true);
  assert.equal(b.monete.attivo, false);
  assert.equal(b.bit.posti[0].titolo, 're', 'e i posti dei Bit un nome ce l\'hanno');
});

test('le due gare hanno due giri separati', () => {
  const s = { premioVip: { monete: { attivo: true, periodo: 'settimana' }, bit: { attivo: true, periodo: 'settimana' } } };
  const ora = 1_700_000_000_000;
  assert.equal(premio.tocca(s, 'monete', ora), true);
  assert.equal(premio.tocca(s, 'bit', ora), true);
  const dopo = { ...s, premioVipUltimo: premio.segnaGiro(s, 'monete', ora) };
  assert.equal(premio.tocca(dopo, 'monete', ora + 60_000), false, 'quella appena fatta aspetta');
  assert.equal(premio.tocca(dopo, 'bit', ora + 60_000), true, 'l\'altra no: e\' un\'altra gara');
  assert.equal(premio.tocca(dopo, 'monete', ora + 8 * 86_400_000), true, 'passata la settimana si rifa\'');
});

test('una gara spenta non tocca mai', () => {
  const s = { premioVip: { monete: { attivo: false, periodo: 'settimana' } } };
  assert.equal(premio.tocca(s, 'monete', 1_700_000_000_000), false);
});

test('il segno di prima, uno solo per tutti, vale come partenza per tutt\'e due', () => {
  const ora = 1_700_000_000_000;
  const s = { premioVip: { monete: { attivo: true, periodo: 'settimana' }, bit: { attivo: true, periodo: 'settimana' } },
    premioVipUltimo: ora - 1000 };
  assert.equal(premio.tocca(s, 'monete', ora), false, 'il numero solo vale per tutt\'e due finche\' non si separano');
  const dopo = { ...s, premioVipUltimo: premio.segnaGiro(s, 'bit', ora) };
  assert.equal(dopo.premioVipUltimo.monete, ora - 1000, 'e separandosi non si perde');
  assert.equal(dopo.premioVipUltimo.bit, ora);
});

// ---- il conto alla rovescia in dirette --------------------------------
test('il conto scende a diretta FINITA, e chi arriva a zero diventa scaduto', () => {
  const ch = 'conta';
  vips.set(ch, { user: 'anna', userId: 'a', display: 'Anna', dirette: 2, motivo: 'premio' });
  vips.set(ch, { user: 'bruno', userId: 'b', display: 'Bruno', dirette: 1, motivo: 'premio' });
  vips.set(ch, { user: 'sempre', userId: 's', display: 'Sempre', motivo: 'comando' });
  const scadenza = Date.now() + 3600_000;
  vips.set(ch, { user: 'tempo', userId: 't', display: 'Tempo', until: scadenza, motivo: 'comando' });

  assert.equal(vips.scalaDiretta(ch), 1, 'uno solo era all\'ultima diretta');
  assert.equal(vips.get(ch, 'anna').dirette, 1, 'ad Anna ne resta una');
  assert.equal(vips.get(ch, 'anna').until, 0, 'e non le e\' comparsa una scadenza addosso');
  assert.equal(vips.get(ch, 'bruno').dirette, 0);
  assert.ok(vips.get(ch, 'bruno').until > 0 && vips.get(ch, 'bruno').until < Date.now(), 'Bruno e\' scaduto adesso');
  assert.ok(vips.scaduti().some((v) => v.user === 'bruno'), 'e la ronda delle scadenze lo trova');

  assert.equal(vips.get(ch, 'sempre').until, 0, 'un VIP per sempre non viene toccato');
  assert.equal(vips.get(ch, 'sempre').dirette, 0);
  assert.equal(vips.get(ch, 'tempo').until, scadenza, 'e nemmeno uno a tempo');

  assert.equal(vips.scalaDiretta(ch), 1, 'la diretta dopo tocca ad Anna');
  assert.equal(vips.scalaDiretta(ch), 0, 'e poi non resta nessuno da scalare');
});

test('un VIP da una diretta sopravvive alla sera in cui lo ha vinto', () => {
  // Il difetto che questa prova impedisce: scalando all'INIZIO di una diretta,
  // chi vince un premio da una diretta se lo vedrebbe togliere all'apertura
  // della sera dopo — cioe' senza averlo mai avuto addosso per una serata.
  const ch = 'unasola';
  vips.set(ch, { user: 'anna', userId: 'a', display: 'Anna', dirette: 1, motivo: 'premio' });
  assert.equal(vips.get(ch, 'anna').dirette, 1, 'la sera del premio e\' ancora suo');
  vips.scalaDiretta(ch);
  assert.ok(vips.get(ch, 'anna').until > 0, 'finita quella diretta, ha finito');
});
