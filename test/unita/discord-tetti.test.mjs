// I TETTI DI DISCORD NON TAGLIANO IN SILENZIO.
//
// La traccia del server tiene 20 categorie, 60 canali, 15 ruoli, 10 righe di
// permessi per canale, 20 canali di partenza; i Ruoli tengono 20 regole. Oltre,
// la normalizzazione tagliava e nessuno lo diceva: un canale scritto nel
// pannello spariva al salvataggio, un server letto con «Leggi il mio server»
// entrava a meta'. Qui: ogni tetto e' uno solo, lo leggono server e pannello,
// e quello che resta fuori si conta per dirlo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cat = await import('../../src/features/discord-catalogo.js');
const reg = await import('../../src/features/discord-ruoli.js');
const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

const tanti = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const riga = (i) => ({ chi: 'tutti', da: [], nega: [i % 2 ? 'scrivere' : 'vedere'] });

test('ogni taglio si conta, e si tiene esattamente il tetto', () => {
  const s = {};
  const p = cat.normalizzaPreset({
    ruoli: [...tanti(17, (i) => ({ nome: 'r' + i })), { nome: '' }],
    canali: [{ nome: 'cima', permessi: tanti(12, riga) }],
    categorie: tanti(22, (i) => ({ nome: 'c' + i, canali: [{ nome: 'a' + i }, { nome: 'b' + i }, { nome: 'd' + i }] })),
    ingresso: { canaliDiPartenza: tanti(25, (i) => 'a' + i),
      domande: [{ titolo: 'Cosa?', risposte: [{ titolo: 'Tutto', canali: tanti(23, (i) => 'a' + i), ruoli: tanti(12, (i) => 'r' + i) }] }] },
    filtro: [{ tipo: 'parole', parole: [] }, { tipo: 'liste', liste: [] }, { tipo: 'spam' }],
  }, s);
  assert.equal(p.ruoli.length, cat.MAX_RUOLI, 'un ruolo senza nome non occupa un posto');
  assert.equal(p.categorie.length, cat.MAX_CATEGORIE);
  assert.equal(p.canali.length + p.categorie.reduce((t, c) => t + c.canali.length, 0), cat.MAX_CANALI);
  assert.equal(p.canali[0].permessi.length, cat.MAX_RIGHE);
  assert.equal(p.ingresso.canaliDiPartenza.length, cat.MAX_PARTENZA);
  assert.equal(p.ingresso.domande[0].risposte[0].canali.length, cat.MAX_RISP_CANALI);
  assert.equal(p.ingresso.domande[0].risposte[0].ruoli.length, cat.MAX_RISP_RUOLI);
  assert.deepEqual(s, {
    ruoli: 2, righe: 2,
    // 1 in cima + 20 categorie da 3 = 61: il sessantunesimo resta fuori, e
    // con le due categorie di troppo anche i loro sei canali
    canali: 7, categorie: 2,
    partenza: 5, rispCanali: 3, rispRuoli: 2, senzaParole: 1, senzaListe: 1,
  });
});

test('senza chi conta, la normalizzazione e\' quella di sempre', () => {
  const x = { categorie: [{ nome: 'uno', canali: [{ nome: 'a' }] }] };
  assert.deepEqual(cat.normalizzaPreset(x), cat.normalizzaPreset(x, {}));
});

test('le regole dei Ruoli: si contano quelle vere, e il tetto e\' uno', () => {
  const r = (i) => ({ tipo: 'monete', ruolo: String(100000 + i), soglia: 5 });
  const lista = [{ tipo: 'sub', ruolo: '' }, ...tanti(22, r), r(0)];
  const tenute = reg.normRegole(lista);
  assert.equal(tenute.length, reg.MAX_REGOLE, 'una riga vuota e un doppione non rubano posti');
  assert.equal(reg.regoleFuori(lista), 2);
  assert.equal(reg.regoleFuori(tanti(20, r)), 0);
});

test('server e pannello leggono gli stessi tetti, e quello che resta fuori si dice', () => {
  const SRV = leggi('src/web/server.js');
  const APP = leggi('src/web/public/app.js');
  const max = /max: \{ categorie: dcCatalogo\.MAX_CATEGORIE[^}]*\}/s.exec(SRV)?.[0] || '';
  const chiavi = [...max.matchAll(/(\w+): dcCatalogo\.MAX_/g)].map((m) => m[1]);
  const tetti = APP.slice(APP.indexOf('const DCS_TETTO = () => ({'), APP.indexOf('});', APP.indexOf('const DCS_TETTO = () => ({')));
  for (const k of chiavi.filter((k) => !['domande', 'risposte'].includes(k))) {
    assert.ok(new RegExp(`\\b${k}: \\[`).test(tetti), `il pannello sa dire il tetto «${k}»`);
  }
  assert.match(SRV, /maxRegole: MAX_REGOLE,/);
  assert.match(SRV, /if \(regoleFuori\(b\.regole\)\) return res\.status\(400\)/, 'oltre il tetto i Ruoli non si salvano tagliati');
  assert.match(SRV, /const preset = dcCatalogo\.normalizzaPreset\(req\.body\?\.preset, scarti\);/, 'l\'anteprima conta');
  assert.match(SRV, /distruttivo: togliere, scarti,/, 'e lo manda');
  assert.match(SRV, /dallaFotografia\(foto, \{ porta, regole: rr\?\.ok \? rr\.regole : null, scarti \}\)/, 'e cosi\' la lettura del server');
  assert.match(SRV, /e\.regoleFuori = regoleFuori\(unite\);/, 'e le regole che la traccia porta nei Ruoli');
  for (const [dove, k] of [["_g('dcs-catpiu')", 'categorie'], ["azione === 'ch-piu'", 'canali'], ["azione === 'p-piu'", 'righe'], ["_g('dcs-ruolopiu')", 'ruoli']]) {
    const i = APP.indexOf(dove);
    assert.ok(APP.slice(i, i + 400).includes(`_dcsAlTetto('${k}',`), `il tasto «${k}» si ferma al tetto`);
  }
  assert.ok(APP.includes("{ partenza: 'partenza', 'r-canale': 'rispCanali', 'r-ruolo': 'rispRuoli' }"), 'e le spunte della porta');
  assert.ok(APP.includes('const scarti = _dcsScartiTesto(d.scarti);'), 'l\'anteprima scrive cosa resta fuori');
  assert.ok(APP.includes('const fuori = _dcsScartiTesto(r.scarti);'), 'anche appena letto il server');
  assert.ok(APP.includes('if (_dc.maxRegole && ora.length >= _dc.maxRegole)'), '«Aggiungi una regola» si ferma al tetto');
  assert.ok(APP.includes('${_dcfVuotaHtml(r)}'), 'e una regola del filtro vuota lo dice');
});
