// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MODULO DI UN ARTICOLO, la parte pura (docs/NEGOZIO.md, «Il modulo»):
//  · i campi si salvano puliti, e quelli che non si possono compilare no;
//  · la domanda di un «da consegnare a mano» di prima e' un modulo di un campo;
//  · la riga basta solo quando non serve ad altro;
//  · le risposte si controllano campo per campo, e si salvano come istantanea;
//  · la pagina parla la lingua del canale e funziona senza JavaScript.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normCampi, campiDi, rigaBasta, usaNota, valoreDi, vaglia, risposteDa, htmlModulo, CODICE, MAX_CAMPI, LIMITI,
} from '../../src/features/negozio-moduli.js';

const testo = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('i campi si salvano puliti, con l\'id della loro posizione', () => {
  const r = normCampi([
    { etichetta: '  Il tuo   nome Discord ', obbligatorio: true, aiuto: 'come appare nel server' },
    { etichetta: '', tipo: 'testo' },
    { etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', ' oro ', 'Platino', '', 'Diamante'], obbligatorio: false },
    { etichetta: 'Quante partite', tipo: 'numero' },
    { etichetta: 'Due righe', tipo: 'lungo' },
    { etichetta: 'Tipo strano', tipo: 'password' },
  ]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.campi.map((c) => c.id), ['c1', 'c2', 'c3', 'c4', 'c5'], 'un campo senza etichetta non e\' una domanda');
  assert.equal(r.campi[0].etichetta, 'Il tuo nome Discord');
  assert.equal(r.campi[0].aiuto, 'come appare nel server');
  assert.deepEqual(r.campi[1].opzioni, ['Oro', 'Platino', 'Diamante'], 'opzioni uniche, senza vuote');
  assert.equal(r.campi[1].obbligatorio, false);
  assert.equal(r.campi[4].tipo, 'testo', 'un tipo che non c\'e\' diventa testo');
  assert.equal(r.campi[0].etichetta.length <= LIMITI.etichetta, true);
});

test('un modulo che non si potrebbe compilare non si salva', () => {
  assert.equal(normCampi([{ etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', 'oro'] }]).errore, 'sceltaCorta', 'una scelta vuole due opzioni diverse');
  assert.equal(normCampi([{ etichetta: 'Nome' }, { etichetta: 'nome' }]).errore, 'campoDoppio', 'due risposte con la stessa etichetta non si distinguerebbero');
  assert.equal(normCampi(Array.from({ length: MAX_CAMPI + 1 }, (_, i) => ({ etichetta: `D${i}` }))).errore, 'campiTroppi');
  assert.deepEqual(normCampi(null), { ok: true, campi: [] });
});

test('la domanda di un «da consegnare a mano» di prima e\' un modulo di un campo obbligatorio', () => {
  assert.deepEqual(campiDi({ tipo: 'mano', dati: { domanda: 'Quale gioco?' } }).map((c) => [c.etichetta, c.obbligatorio, c.tipo]), [['Quale gioco?', true, 'testo']]);
  assert.deepEqual(campiDi({ tipo: 'mano', dati: { domanda: '' } }), []);
  assert.deepEqual(campiDi({ tipo: 'effetto', dati: { domanda: 'non conta' } }), [], 'solo il «da consegnare a mano» aveva la domanda');
  const nuovi = [{ id: 'c1', etichetta: 'Nome Discord', tipo: 'testo', obbligatorio: true, opzioni: [], aiuto: '' }];
  assert.equal(campiDi({ tipo: 'mano', dati: { domanda: 'vecchia' }, campi: nuovi }), nuovi, 'il modulo, se c\'e\', vince sulla domanda');
});

test('la riga basta solo con un campo, e solo se non e\' gia\' il contenuto dell\'acquisto', () => {
  const uno = [{ id: 'c1', etichetta: 'Nome', tipo: 'testo', obbligatorio: true, opzioni: [] }];
  const due = [...uno, { id: 'c2', etichetta: 'Rank', tipo: 'testo', obbligatorio: true, opzioni: [] }];
  assert.equal(rigaBasta({ tipo: 'mano', campi: uno }), true);
  assert.equal(rigaBasta({ tipo: 'mano', campi: due }), false);
  assert.equal(rigaBasta({ tipo: 'oggetto', campi: [] }), false, 'senza modulo non c\'e\' niente a cui rispondere');
  for (const tipo of ['musica', 'evidenza', 'modulo']) {
    assert.equal(usaNota(tipo), true);
    assert.equal(rigaBasta({ tipo, campi: uno }), false, `${tipo}: la riga e' la canzone, il messaggio o gli argomenti, mai una risposta`);
  }
});

test('ogni risposta si controlla per quello che e\'', () => {
  const t = { id: 'c1', etichetta: 'Nome', tipo: 'testo', obbligatorio: true, opzioni: [] };
  assert.deepEqual(valoreDi(t, '  andry   _x \u0007'), { ok: true, valore: 'andry _x' });
  assert.deepEqual(valoreDi(t, '   '), { ok: false, errore: 'obbligatorio' });
  assert.deepEqual(valoreDi({ ...t, obbligatorio: false }, ''), { ok: true, valore: '' });
  assert.equal(valoreDi(t, 'x'.repeat(500)).valore.length, LIMITI.testo);
  assert.deepEqual(valoreDi({ ...t, tipo: 'numero' }, '3,5'), { ok: true, valore: '3,5' });
  assert.deepEqual(valoreDi({ ...t, tipo: 'numero' }, 'tre'), { ok: false, errore: 'numero' });
  const s = { ...t, tipo: 'scelta', opzioni: ['Oro', 'Platino'] };
  assert.deepEqual(valoreDi(s, ' platino '), { ok: true, valore: 'Platino' }, 'la scelta torna scritta come l\'opzione');
  assert.deepEqual(valoreDi(s, 'Bronzo'), { ok: false, errore: 'scelta' });
  const l = valoreDi({ ...t, tipo: 'lungo' }, 'riga uno\r\n\r\n\r\n\r\nriga  due');
  assert.equal(l.valore, 'riga uno\n\nriga due', 'il testo lungo tiene gli a capo, non i vuoti');
});

test('il modulo inviato: errori campo per campo, e le risposte come istantanea delle etichette', () => {
  const campi = normCampi([
    { etichetta: 'Nome Discord' },
    { etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', 'Platino'], obbligatorio: false },
    { etichetta: 'Note', tipo: 'lungo', obbligatorio: false },
  ]).campi;
  const male = vaglia(campi, { c1: '', c2: 'Bronzo' });
  assert.equal(male.ok, false);
  assert.deepEqual(male.errori, { c1: 'obbligatorio', c2: 'scelta' });
  assert.equal(male.valori.c2, 'Bronzo', 'quello che ha scritto torna nel campo, da correggere');
  const bene = vaglia(campi, { c1: 'andry_x', c2: 'oro', c3: '' });
  assert.equal(bene.ok, true);
  assert.deepEqual(bene.risposte, [{ etichetta: 'Nome Discord', valore: 'andry_x' }, { etichetta: 'Rank', valore: 'Oro' }], 'solo le risposte date');
  assert.deepEqual(risposteDa(JSON.stringify(bene.risposte)), bene.risposte);
  assert.deepEqual(risposteDa('rotto{'), []);
  assert.deepEqual(risposteDa(JSON.stringify([{ etichetta: '', valore: 'x' }, 7, { etichetta: 'A', valore: '' }])), [], 'solo coppie vere');
});

test('il codice si scrive con #, che nessuna parola d\'articolo puo\' avere', () => {
  assert.equal(CODICE.test('#1234'), true);
  for (const x of ['1234', '#123', '#12345', '#abcd', 'compra']) assert.equal(CODICE.test(x), false, x);
});

test('la pagina: la lingua del canale, gli errori accanto al campo, e il codice da scrivere', () => {
  const campi = normCampi([{ etichetta: 'Nome Discord', aiuto: 'come appare' }, { etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', 'Platino'], obbligatorio: false }]).campi;
  const art = { nome: 'Torneo <b>', prezzo: '500', moneta: 'Semi', descrizione: 'Una partita con me' };
  const h = htmlModulo({ lingua: 'it', articolo: art, chi: 'Andry', dove: 'Twitch', campi, valori: { c2: 'Platino' }, errori: { c1: 'obbligatorio' }, azione: '/m/abc' });
  assert.match(h, /<html lang="it">/);
  assert.match(h, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(h, /<form method="post" action="\/m\/abc" novalidate>/, 'un form vero: funziona senza JavaScript');
  assert.ok(!/<script/.test(h), 'nel modulo non c\'e\' nessuno script');
  assert.ok(h.includes('Torneo &lt;b&gt;') && !h.includes('Torneo <b>'), 'tutto passa da esc');
  assert.match(h, /<input id="m-c1" name="c1" required aria-required="true" aria-invalid="true" aria-describedby="m-c1-a m-c1-e"/, 'l\'errore e l\'aiuto sono legati al campo');
  assert.match(testo(h), /Una risposta va sistemata: la trovi segnata qui sotto\./);
  assert.match(testo(h), /Compri come Andry su Twitch\./);
  assert.match(h, /<option selected>Platino<\/option>/, 'quello che aveva scelto resta scelto');
  assert.match(testo(h), /Rank \(facoltativo\)/);
  const cod = htmlModulo({ lingua: 'en', stato: 'codice', articolo: art, codice: '4821', cmd: '!buy', azione: '/m/abc', script: '/modulo.js' });
  assert.match(testo(cod), /Type in chat: !buy #4821/);
  assert.match(cod, /<script src="\/modulo\.js" defer><\/script>/, 'nell\'ultimo passo, solo lo script del «Copia», esterno');
  const fine = htmlModulo({ lingua: 'es', stato: 'fine', cmd: '!comprar' });
  assert.match(testo(fine), /Este formulario ya no está/);
  assert.match(testo(fine), /!comprar/);
  assert.ok(!/<form/.test(fine), 'un modulo scaduto non si compila');
});
