// LE DONAZIONI, pezzo per pezzo: la configurazione ripulita (del token resta
// l'impronta; come si dona, gli importi, il minimo), il modulo della pagina
// letto, il corpo di Ko-fi letto, l'importo scritto come si scrive, i dati
// per il blocco «Sostieni» con e senza conto.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as dn from '../../src/features/donazioni.js';
import { combacia, eImpronta } from '../../src/segreti.js';
import { config } from '../../src/config.js';

test('la configurazione si ripulisce, e del token resta solo l\'impronta', () => {
  const d = dn.normDonazioni({ attivo: true, link: 'ko-fi.com/andry', etichetta: 'Offrimi un caffè', messaggio: 'grazie', valuta: 'USD', annunciaChat: true, testoChat: 'Grazie {user}', kofiToken: 'tok-123' }, {}, 'andry');
  assert.equal(d.attivo, true);
  assert.equal(d.modo, 'conto', 'di serie si dona sul conto');
  assert.equal(d.link, 'https://ko-fi.com/andry', 'senza schema si mette https');
  assert.equal(d.valuta, 'USD');
  assert.deepEqual(d.importi, [2, 5, 10, 20], 'gli importi di serie');
  assert.equal(d.minimo, 1);
  assert.equal(d.massimo, 500, 'il massimo di serie');
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
  // le offerte: importo, nome, effetto della libreria; in ordine, senza doppioni, al massimo otto
  const liv = dn.normDonazioni({ livelli: [{ da: '10', nome: 'Fuochi', effetto: 'effetto:Fuochi_1' }, { da: 5, nome: 'x'.repeat(50), effetto: 'https://altrove.example/x.gif' }, { da: 5 }, { da: 0 }, { da: 9999 }, null] }).livelli;
  assert.deepEqual(liv, [{ da: 5, nome: 'x'.repeat(30), effetto: '' }, { da: 10, nome: 'Fuochi', effetto: 'effetto:fuochi_1' }]);
  assert.equal(dn.normDonazioni({ livelli: Array.from({ length: 12 }, (_, i) => ({ da: i + 1 })) }).livelli.length, 8);
  assert.deepEqual(dn.normDonazioni({}).livelli, []);
  // l'offerta che vale e' la piu' alta raggiunta dall'importo pagato
  assert.equal(dn.livelloPer(liv, 4), null);
  assert.equal(dn.livelloPer(liv, 5).nome, 'x'.repeat(30));
  assert.equal(dn.livelloPer(liv, 12).effetto, 'effetto:fuochi_1');
  assert.equal(dn.livelloPer(null, 12), null);
  // il massimo lo sceglie lo streamer, mai sotto il minimo e mai oltre 5.000; gli importi suggeriti ci stanno dentro
  assert.equal(dn.normDonazioni({ massimo: 2000 }).massimo, 2000);
  assert.equal(dn.normDonazioni({ massimo: 99999 }).massimo, 5000);
  assert.equal(dn.normDonazioni({ massimo: 0 }).massimo, 500);
  assert.equal(dn.normDonazioni({ minimo: 50, massimo: 10 }).massimo, 50, 'un massimo sotto il minimo sale al minimo');
  assert.deepEqual(dn.normDonazioni({ massimo: 8 }).importi, [2, 5], 'di serie, solo quelli che ci stanno');
  assert.deepEqual(dn.normDonazioni({ minimo: 30, massimo: 40 }).importi, [30], 'se non ce ne sta nessuno, il minimo');
  assert.deepEqual(dn.normDonazioni({ importi: '5, 50, 500, 5000', massimo: 100 }).importi, [5, 50]);
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
  assert.equal(dn.leggiModulo({ importo: '600' }), null, 'sopra il massimo di serie');
  assert.equal(dn.leggiModulo({ importo: '600' }, { massimo: 1000 }).importoCent, 60000, 'entro il massimo dello streamer');
  assert.equal(dn.leggiModulo({ importo: '6000' }, { massimo: 99999 }), null, 'oltre 5.000 mai');
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

test('l\'indirizzo della pagina delle donazioni: sotto la pagina link, o corto se c\'e\' il sottodominio', () => {
  const salva = { base: config.baseUrl, host: config.donaHost };
  config.baseUrl = 'https://prova.example'; config.donaHost = '';
  assert.equal(dn.urlPaginaDona('Andry'), 'https://prova.example/u/andry/dona');
  config.donaHost = 'dona.prova.example';
  assert.equal(dn.urlPaginaDona('andry'), 'https://dona.prova.example/andry');
  config.baseUrl = salva.base; config.donaHost = salva.host;
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
  assert.equal(dn.datiSostieni(conto, { stripe: { pronto: 0 } }), null, 'un conto non pronto non incassa');
  const c = dn.datiSostieni(conto, { stripe: { pronto: 1 } });
  assert.equal(c.modo, 'conto');
  assert.deepEqual(c.mezzi, ['stripe']);
  assert.equal(c.link, '', 'sul conto il link non si usa');
  assert.deepEqual(c.importi, [3, 9]);
  assert.equal(c.minimo, 2);
  assert.equal(c.massimo, 500);
  assert.deepEqual(dn.datiSostieni({ donazioni: { attivo: true, minimo: 5, massimo: 50, livelli: [{ da: 2, nome: 'a' }, { da: 10, nome: 'b' }, { da: 100, nome: 'c' }] } }, { stripe: { pronto: 1 } }).livelli.map((l) => l.nome), ['b'], 'sulla pagina solo le offerte fra minimo e massimo');
  assert.equal(dn.datiSostieni({ donazioni: { ...conto.donazioni, massimo: 1500 } }, { stripe: { pronto: 1 } }).massimo, 1500);
  // Satispay conta solo in euro; con tutti e due, Stripe viene prima
  assert.deepEqual(dn.mezziDi({ valuta: 'EUR' }, { stripe: { pronto: 1 }, satispay: { pronto: 1 } }), ['stripe', 'satispay']);
  assert.deepEqual(dn.mezziDi({ valuta: 'USD' }, { satispay: { pronto: 1 } }), [], 'Satispay non conosce i dollari');
  assert.deepEqual(dn.mezziDi({ valuta: 'EUR' }, { satispay: { pronto: 1 } }), ['satispay']);
  assert.deepEqual(dn.datiSostieni({ donazioni: { attivo: true } }, { satispay: { pronto: 1 } }).mezzi, ['satispay']);
  assert.equal(c.conMessaggio, false);
  assert.equal(c.valuta, 'USD');
  // cosa manca, detto in una parola
  assert.equal(dn.cosaManca(null), 'spente');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true, modo: 'link' } }), 'link');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true } }), 'conto');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true } }, { stripe: { pronto: 1 } }), '');
  assert.equal(dn.cosaManca({ donazioni: { attivo: true, valuta: 'USD' } }, { satispay: { pronto: 1 } }), 'conto', 'Satispay da solo, in dollari, non basta');
});
