// LE DONAZIONI, pezzo per pezzo: la configurazione ripulita (del token resta
// l'impronta), il corpo di Ko-fi letto, i doppioni scartati, l'importo scritto
// come si scrive, i dati per il tasto «Sostieni».
import test from 'node:test';
import assert from 'node:assert/strict';
import * as dn from '../../src/features/donazioni.js';
import { combacia, eImpronta } from '../../src/segreti.js';

test('la configurazione si ripulisce, e del token resta solo l\'impronta', () => {
  const d = dn.normDonazioni({ attivo: true, link: 'ko-fi.com/andry', etichetta: 'Offrimi un caffè', messaggio: 'grazie', valuta: 'USD', annunciaChat: true, testoChat: 'Grazie {user}!', kofiToken: 'tok-123' }, {}, 'andry');
  assert.equal(d.attivo, true);
  assert.equal(d.link, 'https://ko-fi.com/andry', 'senza schema si mette https');
  assert.equal(d.valuta, 'USD');
  assert.ok(eImpronta(d.kofiImp), 'il token non si conserva: si conserva l\'impronta');
  assert.ok(!JSON.stringify(d).includes('tok-123'));
  assert.ok(combacia('tok-123', d.kofiImp, 'andry'));
  assert.ok(!combacia('tok-123', d.kofiImp, 'altro'), 'l\'impronta e\' salata col canale');
  // senza un token nuovo resta quella di prima; kofiTokenClear la toglie
  assert.equal(dn.normDonazioni({ attivo: true }, d, 'andry').kofiImp, d.kofiImp);
  assert.equal(dn.normDonazioni({ attivo: true, kofiTokenClear: true }, d, 'andry').kofiImp, '');
  // cose che non passano
  assert.equal(dn.normDonazioni({ link: 'http://insicuro.example' }).link, '', 'solo https');
  assert.equal(dn.normDonazioni({ link: 'javascript:alert(1)' }).link, '');
  assert.equal(dn.normDonazioni({ valuta: 'BTC' }).valuta, 'EUR');
  assert.equal(dn.normDonazioni({ etichetta: 'x'.repeat(100) }).etichetta.length, 40);
});

test('il corpo di Ko-fi si legge: modulo con `data`, dentro il JSON', () => {
  const dati = { verification_token: 'abc', message_id: 'm-1', type: 'Donation', from_name: 'Luca', amount: '3.00', currency: 'EUR', message: 'grande live', is_public: true };
  const d = dn.leggiKofi({ data: JSON.stringify(dati) });
  assert.deepEqual(d, { token: 'abc', id: 'm-1', tipo: 'Donation', user: 'Luca', importo: 3, valuta: 'EUR', messaggio: 'grande live' });
  assert.equal(dn.leggiKofi({ data: JSON.stringify({ ...dati, is_public: false }) }).messaggio, '', 'un messaggio privato non si mostra');
  assert.equal(dn.leggiKofi({ data: JSON.stringify({ ...dati, amount: '0' }) }), null, 'senza importo non e\' una donazione');
  assert.equal(dn.leggiKofi({ data: 'non json' }), null);
  assert.equal(dn.leggiKofi({}), null);
  assert.equal(dn.leggiKofi({ data: JSON.stringify({ ...dati, from_name: '' }) }).user, 'qualcuno');
});

test('una mancia dalla chiave API: basta l\'importo, il resto ha un ripiego', () => {
  assert.deepEqual(dn.leggiEsterna({ importo: '2.5', user: 'Giada', messaggio: 'ciao' }), { id: '', user: 'Giada', importo: 2.5, valuta: '', messaggio: 'ciao' });
  assert.equal(dn.leggiEsterna({ amount: 4, currency: 'usd', id: 'x1' }).valuta, 'USD');
  assert.equal(dn.leggiEsterna({ amount: 4, currency: 'btc' }).valuta, '', 'una valuta sconosciuta lascia quella del canale');
  assert.equal(dn.leggiEsterna({ user: 'x' }), null);
  assert.equal(dn.leggiEsterna({ importo: -3 }), null);
});

test('lo stesso avviso non si conta due volte, e la memoria dura un\'ora', () => {
  const t0 = 1_000_000;
  assert.equal(dn.nuova('k:1', t0), true);
  assert.equal(dn.nuova('k:1', t0 + 1000), false, 'il ritentativo di Ko-fi si scarta');
  assert.equal(dn.nuova('k:2', t0 + 2000), true);
  assert.equal(dn.nuova('k:1', t0 + 3600_001 + 1000), true, 'dopo un\'ora quell\'id e\' dimenticato');
  assert.equal(dn.nuova('', t0), true, 'senza id non si puo\' dire che sia un doppione');
});

test('l\'importo si scrive come si scrive', () => {
  assert.equal(dn.formattaImporto(5), '5 €');
  assert.equal(dn.formattaImporto(12.5), '12,50 €');
  assert.equal(dn.formattaImporto(3.456), '3,46 €');
  assert.equal(dn.formattaImporto(5, 'USD'), '$5');
  assert.equal(dn.formattaImporto(12.5, 'GBP'), '£12.50');
  assert.equal(dn.formattaImporto('boh'), '0 €');
});

test('i dati per il tasto «Sostieni»: link, tasto, frase e l\'obiettivo in euro se c\'e\'', () => {
  const s = { donazioni: { attivo: true, link: 'https://ko-fi.com/a', etichetta: '', messaggio: 'un caffè', valuta: 'EUR' },
    overlayGoals: [{ id: 'g1', tipo: 'follower', obiettivo: 100 }, { id: 'g2', tipo: 'euro', obiettivo: 200, partenza: 20, titolo: 'Nuovo microfono' }],
    overlayStato: { goals: { g1: 5, g2: 12.5 } } };
  const d = dn.datiSostieni(s);
  assert.equal(d.link, 'https://ko-fi.com/a');
  assert.equal(d.etichetta, 'Sostieni', 'un tasto senza testo si chiama Sostieni');
  assert.deepEqual(d.goal, { ora: 32.5, meta: 200, titolo: 'Nuovo microfono' });
  assert.equal(dn.datiSostieni({ ...s, overlayGoals: [{ id: 'g2', tipo: 'euro', attivo: false }] }).goal, null, 'un obiettivo spento non si mostra');
  assert.equal(dn.datiSostieni({ donazioni: { attivo: false, link: 'https://x.example' } }), null, 'spente: niente tasto');
  assert.equal(dn.datiSostieni({ donazioni: { attivo: true, link: '' } }), null, 'senza link: niente tasto');
  assert.equal(dn.datiSostieni(null), null);
});
