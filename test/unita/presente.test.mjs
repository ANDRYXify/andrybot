// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PRESENZA DEL CANALE (src/features/presente.js; docs/MENU.md, «Presenza,
// monete e giochi: una strada sola»).
//
// Il caso: «!presente» stava dentro i Pew, e la sua frase, la porta e la serie
// valevano solo con un effetto acceso. Adesso e' del canale. Qui si prova
// l'accessore puro: legge la forma nuova, legge quella di prima (chi l'aveva
// configurata nei Pew non perde niente), e non chiede mai un effetto; il
// salvataggio non perde la vecchia; la serie sul registro; una risposta sola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { presenteDi, normPresente, presenteDaSalvare, eFrasePresente, portaChiede, testoPorta, premioSerie, serieDopo, contaSerie, rispostaPresenza, PRESENTE } from '../../src/features/presente.js';

const DI_SERIE = { frase: '!presente', premi: [], dopo: 'resta', rispondi: true, risposta: '',
  porta: { attiva: true, monete: true, bit: true, giochi: 'blocca', ricorda: true, testoRicorda: '', conferma: true, testoConferma: '' } };

test('l\'accessore legge la forma nuova, settings.presente', () => {
  const p = presenteDi({ presente: { frase: '  Eccomi   QUI ', premi: '1, 5, 10', dopo: 'ricomincia', porta: { giochi: 'libero' } } });
  assert.equal(p.frase, 'eccomi qui');
  assert.deepEqual(p.premi, [1, 5, 10]);
  assert.equal(p.dopo, 'ricomincia');
  assert.equal(p.porta.giochi, 'libero');
  assert.deepEqual(presenteDi({}), DI_SERIE, 'niente salvato: quella di serie');
  assert.deepEqual(presenteDi(null), DI_SERIE);
});

test('l\'accessore legge la forma di prima, dentro i Pew, finche\' la nuova non c\'e\'', () => {
  const vecchia = { colpi: { attivo: true, presenza: { attiva: true, comando: 'pomodoro', frase: '!ci sono', monete: 20, rispondi: false, porta: { bit: false } } } };
  const p = presenteDi(vecchia);
  assert.equal(p.frase, '!ci sono', 'la frase scritta nei Pew resta');
  assert.deepEqual(p.premi, [20], 'il premio fisso di prima diventa un gradino');
  assert.equal(p.rispondi, false);
  assert.equal(p.porta.bit, false);
  assert.equal(presenteDi({ colpi: { presenza: { frase: '!pew presente' } } }).frase, '!presente', 'la vecchia di serie passa alla nuova');
  assert.equal(presenteDi({ ...vecchia, presente: { frase: '!qui' } }).frase, '!qui', 'salvata la nuova, vale la nuova');
});

test('la porta e la frase non chiedono un effetto: valgono coi Pew spenti', () => {
  for (const settings of [{}, { colpi: { attivo: false } }, { colpi: { attivo: true, presenza: { attiva: false } } }, { colpi: { presenza: { comando: '' } } }]) {
    const p = presenteDi(settings);
    assert.ok(eFrasePresente(p, '  !PRESENTE '), JSON.stringify(settings));
    assert.deepEqual(['monete', 'bit', 'giochi'].map((k) => portaChiede(p, k)), [true, true, true], 'la porta di serie chiede tutto');
  }
  assert.ok(!eFrasePresente(presenteDi({}), 'ciao !presente'), 'la frase vale da sola');
  assert.deepEqual(['monete', 'bit', 'giochi'].map((k) => portaChiede(normPresente({ porta: { attiva: false } }), k)), [false, false, false]);
  assert.deepEqual(['monete', 'bit', 'giochi'].map((k) => portaChiede(normPresente({ porta: { bit: false, giochi: 'libero' } }), k)), [true, false, false]);
});

test('il ricordo dice la frase del canale e solo quello che la porta chiede', () => {
  const p = normPresente({ frase: '!eccomi', porta: { bit: false } });
  assert.equal(testoPorta(p, 'ricorda', 'it', { nome: 'marta' }), '@marta prima scrivi !eccomi: da lì guadagni monete e puoi giocare.');
  assert.equal(testoPorta(normPresente({ porta: { monete: false, bit: false } }), 'ricorda', 'en', { nome: 'marta', frase: '!presente' }), '@marta first type !presente: from then on you can play.');
});

test('salvare: la scheda Presenza scrive sopra il salvato; i Pew salvati prima non perdono la vecchia', () => {
  const prima = { colpi: { presenza: { attiva: true, comando: 'pomodoro', frase: '!ci sono', premi: [1, 5], porta: { giochi: 'libero' } } } };
  // i Pew adesso mandano solo l'effetto: la presenza di prima si ferma in settings.presente
  const daiPew = presenteDaSalvare(prima, { colpi: { presenza: { attiva: true, comando: 'pomodoro', x: 10, y: 10 } } });
  assert.equal(daiPew.frase, '!ci sono');
  assert.deepEqual(daiPew.premi, [1, 5]);
  assert.equal(daiPew.porta.giochi, 'libero');
  assert.equal(presenteDaSalvare({ ...prima, presente: daiPew }, { colpi: {} }), undefined, 'gia\' ferma: i Pew non la toccano piu\'');
  assert.equal(presenteDaSalvare(prima, { tono: 'serio' }), undefined, 'chi non tocca ne\' Pew ne\' presenza la lascia stare');
  // la scheda Presenza: un salvataggio parziale non riporta il resto ai valori di serie
  const parziale = presenteDaSalvare({ presente: daiPew }, { presente: { premi: '2, 4', porta: { bit: false } } });
  assert.deepEqual([parziale.frase, parziale.premi, parziale.porta.giochi, parziale.porta.bit], ['!ci sono', [2, 4], 'libero', false]);
});

test('la serie: i gradini, poi resta o ricomincia; di fila vuol dire la diretta subito prima', () => {
  const p = normPresente({ premi: '1, 5, 10, 15' });
  assert.deepEqual([1, 2, 3, 4, 5, 9].map((n) => premioSerie(p, n)), [1, 5, 10, 15, 15, 15]);
  assert.deepEqual([4, 5, 6].map((n) => premioSerie({ ...p, dopo: 'ricomincia' }, n)), [15, 1, 5]);
  assert.deepEqual(normPresente({ premi: [0, 0] }).premi, [], 'tutti zero vuol dire nessun premio');
  assert.equal(normPresente({ premi: Array.from({ length: 50 }, () => 1) }).premi.length, PRESENTE.gradini);
  assert.equal(serieDopo(null, 'd2', 'd1'), 1);
  assert.equal(serieDopo({ ultima: 'd1', serie: 3 }, 'd2', 'd1'), 4, 'alla diretta subito prima: di fila');
  assert.equal(serieDopo({ ultima: 'd0', serie: 3 }, 'd2', 'd1'), 1, 'ne ha saltata una: si riparte');
  assert.equal(serieDopo({ ultima: 'd2', serie: 4 }, 'd2', 'd1'), 4, 'la stessa diretta non conta due volte');
});

test('contaSerie sul registro: sale diretta dopo diretta, una saltata la azzera, le monete una volta per diretta', () => {
  const righe = new Map(), dirette = [];
  const serie = {
    segnaDiretta: (c, occ) => { if (!dirette.includes(occ)) dirette.push(occ); },
    get: (c, k) => righe.get(k) || null,
    precedente: (c, occ) => dirette[dirette.indexOf(occ) - 1] || '',
    metti: (c, k, v) => righe.set(k, v),
  };
  const pres = normPresente({ premi: [1, 5, 10] });
  const conta = (occ) => contaSerie(serie, { canale: 'c', chiave: 'twitch:1', occasione: occ, ora: 1, pres });
  assert.deepEqual(conta('d1'), { serie: 1, gradino: 1, monete: 1, nuova: true });
  assert.deepEqual(conta('d1'), { serie: 1, gradino: 1, monete: 0, nuova: false }, 'rifatta nella stessa diretta: niente monete');
  assert.deepEqual(conta('d2'), { serie: 2, gradino: 5, monete: 5, nuova: true });
  serie.segnaDiretta('c', 'd3');
  assert.deepEqual(conta('d4'), { serie: 1, gradino: 1, monete: 1, nuova: true }, 'la d3 l\'ha saltata');
  assert.equal(righe.get('twitch:1').record, 2);
  assert.deepEqual(contaSerie(null, { canale: 'c', chiave: 'k', occasione: 'o', pres }).nuova, false, 'senza registro non conta niente');
});

test('una risposta sola: la serie quando ha qualcosa da dire, se no la conferma', () => {
  const r = (pres, monete = 0) => rispostaPresenza(normPresente(pres), 'Marta', 'it', { serie: 3, monete, moneta: 'gemme' });
  assert.equal(r({ premi: [5] }, 5), '@Marta, presente! 3ª di fila: +5 gemme.', 'con le monete parla la serie');
  assert.equal(r({}), '✓ @Marta presente!', 'senza monete, la conferma');
  assert.equal(r({ risposta: 'Ciao {nome} ({serie})' }), 'Ciao @Marta (3)', 'il testo dello streamer parla anche senza monete');
  assert.equal(r({ porta: { conferma: false } }), '@Marta, presente! 3ª di fila.', 'conferma spenta: la serie, senza monete');
  assert.equal(r({ rispondi: false }, 5), '✓ @Marta presente!', 'serie spenta: la conferma anche con le monete');
  assert.equal(r({ rispondi: false, porta: { conferma: false } }, 5), '', 'tutte e due spente: silenzio');
  assert.equal(r({ porta: { attiva: false } }), '@Marta, presente! 3ª di fila.', 'porta spenta: la conferma e\' della porta');
  assert.equal(rispostaPresenza(normPresente({}), 'Marta', 'en', { serie: 2, monete: 0 }), '✓ @Marta is here!');
  assert.equal(rispostaPresenza(normPresente({}), '   '), '', 'senza nome niente');
});
