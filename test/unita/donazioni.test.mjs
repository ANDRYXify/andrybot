// LE DONAZIONI, pezzo per pezzo: la configurazione ripulita (del token resta
// l'impronta; come si dona, gli importi, il minimo), il modulo della pagina
// letto, il corpo di Ko-fi letto, l'importo scritto come si scrive, i dati
// per il blocco «Sostieni» con e senza conto.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as dn from '../../src/features/donazioni.js';
import { combacia, eImpronta } from '../../src/segreti.js';

test('la configurazione si ripulisce, e del token resta solo l\'impronta', () => {
  const d = dn.normDonazioni({ attivo: true, link: 'ko-fi.com/andry', etichetta: 'Offrimi un caffè', messaggio: 'grazie', valuta: 'USD', annunciaChat: true, testoChat: 'Grazie {user}', kofiToken: 'tok-123' }, {}, 'andry');
  assert.equal(d.attivo, true);
  assert.equal(d.modo, 'conto', 'di serie si dona sul conto');
  assert.equal(d.link, 'https://ko-fi.com/andry', 'senza schema si mette https');
  assert.equal(d.valuta, 'USD');
  assert.deepEqual(d.importi, [2, 5, 10, 20], 'gli importi di serie');
  assert.equal(d.minimo, 1);
  assert.equal(d.conMessaggio, true);
  assert.ok(eImpronta(d.kofiImp), 'il token non si conserva: si conserva l\'impronta');
  assert.ok(!JSON.stringify(d).includes('tok-123'));
  assert.ok(combacia('tok-123', d.kofiImp, 'andry'));
  assert.ok(!combacia('tok-123', d.kofiImp, 'altro'), 'l\'impronta e\' salata col canale');
  // senza un token nuovo resta quella di prima; kofiTokenClear la toglie
  assert.equal(dn.normDonazioni({ attivo: true }, d, 'andry').kofiImp, d.kofiImp);
  assert.equal(dn.normDonazioni({ attivo: true, kofiTokenClear: true }, d, 'andry').kofiImp, '');
  // il modo, gli importi e il minimo
  assert.equal(dn.normDonazioni({ modo: 'link' }).modo, 'link');
  assert.equal(dn.normDonazioni({ modo: 'boh' }).modo, 'conto');
  assert.deepEqual(dn.normDonazioni({ importi: '5, 2, 5, 1000, x, 0.5' }).importi, [2, 5], 'in ordine, senza doppioni, solo fra 1 e 500');
  assert.deepEqual(dn.normDonazioni({ importi: [1, 2, 3, 4, 5, 6, 7, 8] }).importi, [1, 2, 3, 4, 5, 6], 'al massimo sei');
  assert.deepEqual(dn.normDonazioni({ importi: [] }).importi, [2, 5, 10, 20], 'vuoti: quelli di serie');
  assert.equal(dn.normDonazioni({ minimo: 0 }).minimo, 1);
  assert.equal(dn.normDonazioni({ minimo: '2,5' }).minimo, 2.5);
  assert.equal(dn.normDonazioni({ minimo: 500 }).minimo, 100);
  assert.equal(dn.normDonazioni({ conMessaggio: false }).conMessaggio, false);
  // cose che non passano
  assert.equal(dn.normDonazioni({ link: 'http://insicuro.example' }).link, '', 'solo https');
  assert.equal(dn.normDonazioni({ link: 'javascript:alert(1)' }).link, '');
  assert.equal(dn.normDonazioni({ valuta: 'BTC' }).valuta, 'EUR');
  assert.equal(dn.normDonazioni({ etichetta: 'x'.repeat(100) }).etichetta.length, 40);
});

test('il modulo della pagina: un importo scelto o scritto, il nome, il messaggio, e il campo che una persona non vede', () => {
  assert.deepEqual(dn.leggiModulo({ importo: '5' }), { importoCent: 500, nome: '', messaggio: '' });
  assert.equal(dn.leggiModulo({ importo: '5', altro: '7,5' }).importoCent, 750, 'l\'importo scritto a mano vince su quello scelto');
  assert.equal(dn.leggiModulo({ importo: 'altro', altro: '3' }).importoCent, 300);
  assert.equal(dn.leggiModulo({ importo: 'altro', altro: '' }), null, '«altro» senza un numero non e\' un importo');
  assert.equal(dn.leggiModulo({ importo: '0.5' }), null, 'sotto il minimo');
  assert.equal(dn.leggiModulo({ importo: '600' }), null, 'sopra il massimo');
  assert.equal(dn.leggiModulo({ importo: '2' }, { minimo: 5 }), null, 'sotto il minimo dello streamer');
  assert.equal(dn.leggiModulo({ importo: '5', sito: 'http://spam.example' }), null, 'il campo trappola pieno: era un programma');
  assert.equal(dn.leggiModulo({ importo: '5', nome: '  Luca  ', messaggio: 'grande   live\n\n!' }).nome, 'Luca');
  assert.equal(dn.leggiModulo({ importo: '5', messaggio: 'grande   live\n\n!' }).messaggio, 'grande live !', 'gli spazi si ripiegano');
  assert.equal(dn.leggiModulo({ importo: '5', messaggio: 'ciao' }, { conMessaggio: false }).messaggio, '', 'se lo streamer non vuole messaggi, non ce ne sono');
  assert.equal(dn.leggiModulo({ importo: '5', nome: 'x'.repeat(80) }).nome.length, 40);
  assert.equal(dn.leggiModulo(null), null);
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

test('l\'importo si scrive come si scrive', () => {
  assert.equal(dn.formattaImporto(5), '5 €');
  assert.equal(dn.formattaImporto(12.5), '12,50 €');
  assert.equal(dn.formattaImporto(3.456), '3,46 €');
  assert.equal(dn.formattaImporto(5, 'USD'), '$5');
  assert.equal(dn.formattaImporto(12.5, 'GBP'), '£12.50');
  assert.equal(dn.formattaImporto('boh'), '0 €');
});

test('i dati per il blocco «Sostieni»: come si dona, gli importi, il tasto, la frase e l\'obiettivo in euro se c\'e\'', () => {
  const s = { donazioni: { attivo: true, modo: 'link', link: 'https://ko-fi.com/a', etichetta: '', messaggio: 'un caffè', valuta: 'EUR' },
    overlayGoals: [{ id: 'g1', tipo: 'follower', obiettivo: 100 }, { id: 'g2', tipo: 'euro', obiettivo: 200, partenza: 20, titolo: 'Nuovo microfono' }],
    overlayStato: { goals: { g1: 5, g2: 12.5 } } };
  const d = dn.datiSostieni(s);
  assert.equal(d.modo, 'link');
  assert.equal(d.link, 'https://ko-fi.com/a');
  assert.equal(d.etichetta, 'Sostieni', 'un tasto senza testo si chiama Sostieni');
  assert.deepEqual(d.goal, { ora: 32.5, meta: 200, titolo: 'Nuovo microfono' });
  assert.equal(dn.datiSostieni({ ...s, overlayGoals: [{ id: 'g2', tipo: 'euro', attivo: false }] }).goal, null, 'un obiettivo spento non si mostra');
  assert.equal(dn.datiSostieni({ donazioni: { attivo: false, link: 'https://x.example' } }), null, 'spente: niente tasto');
  assert.equal(dn.datiSostieni({ donazioni: { attivo: true, modo: 'link', link: '' } }), null, 'senza link: niente tasto');
  assert.equal(dn.datiSostieni(null), null);
  // sul conto: serve un conto pronto a incassare; il link non c'entra
  const conto = { donazioni: { attivo: true, modo: 'conto', link: 'https://ko-fi.com/a', importi: [3, 9], minimo: 2, conMessaggio: false, valuta: 'USD' } };
  assert.equal(dn.datiSostieni(conto), null, 'senza conto niente modulo');
  assert.equal(dn.datiSostieni(conto, { stripe_account: 'acct_1', pronto: 0 }), null, 'un conto non pronto non incassa');
  const c = dn.datiSostieni(conto, { stripe_account: 'acct_1', pronto: 1 });
  assert.equal(c.modo, 'conto');
  assert.equal(c.link, '', 'sul conto il link non si usa');
  assert.deepEqual(c.importi, [3, 9]);
  assert.equal(c.minimo, 2);
  assert.equal(c.conMessaggio, false);
  assert.equal(c.valuta, 'USD');
  // cosa manca, detto in una parola
  assert.equal(dn.cosaManca(null), 'spente');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true, modo: 'link' } }), 'link');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true } }), 'conto');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true } }, { pronto: 1 }), '');
});
