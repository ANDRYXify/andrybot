// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL REGALO DELLE PRESENZE (docs/COLPI.md): dopo N presenze un colpo a caso
// nello zaino. Le garanzie, ognuna rotta apposta:
//  · spento di serie; N, il conto (tutte o di fila), il ripetersi, i colpi e la
//    frase sono dello streamer, e si ripuliscono;
//  · scatta solo alla prima presenza della diretta, al numero giusto;
//  · la stessa presenza non apre due regali, e pesca sempre lo stesso colpo;
//  · solo fra i colpi che si comprano per lo zaino (e fra quelli scelti);
//    nessuno cosi', Pew spenti o zaino pieno: niente regalo;
//  · il regalo e' nello zaino, si lancia, e alla scadenza non torna niente.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-presente-regalo-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit, pewZaino, pewSerie } = await import('../../src/db.js');
const { normPresente, presenteDaSalvare, regaloTocca, scegliRegalo, testoRegalo, contaSerie, REGALO } = await import('../../src/features/presente.js');
const { creaServizioColpi } = await import('../../src/features/colpi-servizio.js');

let n = 0;
const login = () => `regalo${++n}`;

function banco(cfgIn = {}) {
  const adesso = Date.parse('2026-11-04T09:00:00Z');
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 60, voci: [
    { comando: 'pomodoro', nome: 'Pomodoro', bit: 100 },
    { comando: 'torta', nome: 'Torta', bit: 200 },
    { comando: 'razzo', nome: 'Razzo', bit: 300, zaino: { modo: 'no' } },
  ], ...cfgIn };
  const s = creaServizioColpi({ registro: registroColpi, effects: { fireConOpzioni: () => true }, effettoDi: (l, k) => (k === 'torta' && cfg.senzaTorta ? null : { tipo: 'immagine' }),
    impostazioni: () => cfg, crediti: pewBit, zaino: pewZaino, ora: () => adesso, inOnda: () => true, overlay: () => true });
  return { s, cfg };
}

test('le regole: spento di serie, tutto dello streamer, ripulito', () => {
  assert.deepEqual(normPresente({}).regalo, { attivo: false, ogni: 5, conta: 'totale', ripeti: true, voci: [], rispondi: true, frase: '' });
  const r = normPresente({ regalo: { attivo: true, ogni: 500, conta: 'fila', ripeti: false, voci: ['a', 'a', ' b ', ''], rispondi: false, frase: 'x\u0007y' } }).regalo;
  assert.deepEqual(r, { attivo: true, ogni: REGALO.ogni[1], conta: 'fila', ripeti: false, voci: ['a', 'b'], rispondi: false, frase: 'x y' });
  assert.equal(normPresente({ regalo: { ogni: 1 } }).regalo.ogni, 2, 'ogni 1 sarebbe un regalo a ogni presenza: si parte da 2');
  assert.equal(normPresente({ regalo: { attivo: 'si' } }).regalo.attivo, false, 'acceso solo se lo dici tu');
  const salvata = presenteDaSalvare({ presente: { regalo: { attivo: true, ogni: 7 } } }, { presente: { regalo: { conta: 'fila' } } });
  assert.deepEqual([salvata.regalo.attivo, salvata.regalo.ogni, salvata.regalo.conta], [true, 7, 'fila'], 'un salvataggio parziale non riporta il resto ai valori di serie');
});

test('quando tocca: alla prima presenza della diretta, al numero giusto', () => {
  const pres = (r) => normPresente({ regalo: { attivo: true, ogni: 5, ...r } });
  const quando = (p, conto) => Array.from({ length: 16 }, (_, i) => i + 1).filter((k) => regaloTocca(p, { nuova: true, totale: k, serie: conto === 'fila' ? k : 1 }));
  assert.deepEqual(quando(pres()), [5, 10, 15]);
  assert.deepEqual(quando(pres({ ripeti: false })), [5], 'una volta sola');
  assert.deepEqual(quando(pres({ conta: 'fila' })), [], 'di fila: una serie che riparte sempre da 1 non arriva mai');
  assert.deepEqual(quando(pres({ conta: 'fila' }), 'fila'), [5, 10, 15]);
  assert.equal(regaloTocca(pres(), { nuova: false, totale: 5 }), false, 'la seconda volta nella stessa diretta no');
  assert.equal(regaloTocca(normPresente({ regalo: { ogni: 5 } }), { nuova: true, totale: 5 }), false, 'spento');
});

test('il totale: una volta per diretta, e la serie che salta non lo azzera', () => {
  const c = login();
  let adesso = 1_000_000;
  const pres = normPresente({});
  const conta = (occ) => { adesso += 1000; pewSerie.segnaDiretta(c, occ, adesso); return contaSerie(pewSerie, { canale: c, chiave: 'twitch:9', occasione: occ, ora: adesso, pres }); };
  assert.equal(conta('d1').totale, 1);
  assert.equal(conta('d1').totale, 1, 'rifatta nella stessa diretta: non conta');
  pewSerie.segnaDiretta(c, 'd2', adesso += 1000);
  const r = conta('d3');
  assert.deepEqual([r.serie, r.totale], [1, 2], 'saltata la d2: la serie riparte, il totale no');
  assert.equal(pewSerie.get(c, 'twitch:9').totale, 2, 'il totale e\' scritto nel registro, non solo detto');
  assert.equal(conta('d4').totale, 3);
});

test('il regalo nello zaino: una volta per presenza, fra quelli che si comprano per lo zaino', () => {
  const b = banco();
  const c = login();
  const scegli = (k) => (lista) => scegliRegalo(lista, k);
  const r = b.s.regaloPresenza(c, { persona: '21', nome: 'Marta', occasione: 'd5', scegli: scegli('d5:21') });
  assert.equal(r.esito, 'dato');
  assert.ok(['pomodoro', 'torta'].includes(r.voce), 'mai il razzo: non si compra per lo zaino');
  assert.equal(b.s.regaloPresenza(c, { persona: '21', nome: 'Marta', occasione: 'd5', scegli: scegli('d5:21') }).esito, 'doppio', 'la stessa presenza non apre due regali');
  assert.deepEqual(b.s.zainoDi(c, '21').map((x) => [x.voce, x.quanti]), [[r.voce, 1]]);
  assert.equal(b.s.regaloPresenza(c, { persona: '21', nome: 'Marta', occasione: 'd6', voci: ['razzo'] }).motivo, 'nessuno', 'scelto solo un colpo che non va nello zaino: niente regalo');
  assert.equal(b.s.regaloPresenza(c, { persona: '21', nome: 'Marta', occasione: 'd7', voci: ['torta'] }).voce, 'torta', 'fra quelli scelti');
  b.cfg.senzaTorta = true;
  assert.equal(b.s.regaloPresenza(c, { persona: '21', nome: 'Marta', occasione: 'd8', voci: ['torta'] }).motivo, 'nessuno', 'un colpo senza il suo effetto non si regala');
  b.cfg.attivo = false;
  assert.equal(b.s.regaloPresenza(c, { persona: '21', nome: 'Marta', occasione: 'd9' }).motivo, 'spento');
  const pieno = banco({ zaino: { massimo: 1 } });
  const c2 = login();
  assert.equal(pieno.s.regaloPresenza(c2, { persona: '5', occasione: 'a' }).esito, 'dato');
  assert.equal(pieno.s.regaloPresenza(c2, { persona: '5', occasione: 'b' }).motivo, 'zaino-pieno', 'lo zaino pieno vale anche per i regali');
  assert.equal(b.s.regaloPresenza(c, { persona: '', occasione: 'x' }).motivo, 'zaino', 'senza un account non c\'e\' uno zaino');
});

test('a caso, ma la stessa presenza pesca lo stesso; e la frase', () => {
  const lista = ['a', 'b', 'c', 'd'];
  assert.equal(scegliRegalo(lista, 'd1:5'), scegliRegalo(lista, 'd1:5'));
  assert.ok(new Set(Array.from({ length: 40 }, (_, i) => scegliRegalo(lista, 'd' + i + ':5'))).size >= 3, 'presenze diverse pescano colpi diversi');
  assert.equal(scegliRegalo([], 'x'), null);
  const pres = normPresente({ regalo: { attivo: true } });
  for (const l of ['it', 'en', 'es']) {
    const t = testoRegalo(pres, l, { nome: 'Marta', n: 5, colpo: 'Torta', link: 'pew.live/luna' });
    assert.ok(t.includes('@Marta') && t.includes('5') && t.includes('Torta') && t.includes('pew.live/luna') && !/[{}]/.test(t), l + ': ' + t);
  }
  assert.equal(testoRegalo(normPresente({ regalo: { attivo: true, frase: '{nome} ha vinto {colpo}' } }), 'it', { nome: 'Marta', colpo: 'Torta' }), 'Marta ha vinto Torta');
  assert.equal(testoRegalo(normPresente({ regalo: { attivo: true, rispondi: false } }), 'it', { nome: 'Marta' }), '', 'spenta, silenzio');
});
