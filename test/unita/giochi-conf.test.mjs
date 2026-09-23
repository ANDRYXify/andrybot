// LE REGOLE DEI GIOCHI: un catalogo solo, e un'economia che non stampa monete.
//
// Misurato prima: la pesca rendeva ventidue volte la presenza e la slot
// restituiva 114 monete ogni 100 giocate. Qui si prova che di serie il banco
// vince sempre un po', che la pesca rende quanto la presenza, che la resa
// mostrata nel pannello e' quella vera del motore, e che chi aveva scelto un
// valore lo tiene. Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('giochi-conf-');
const G = await import('../../src/features/giochi-conf.js');
const games = await import('../../src/features/games.js');
test.after(() => casa.pulisci());

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const di = (id) => G.giocoDi(id);
const resaDi = (id, settings = {}) => G.valutaResa(di(id).resa, G.valoriDi(settings, id), { mancheMinuti: 15 });

test('di serie il banco vince sempre un po\'', () => {
  for (const g of G.CATALOGO.filter((x) => x.resa?.tipo === 'puntata')) {
    const r = resaDi(g.id);
    assert.ok(r.perCento <= 100, `${g.id}: tornano ${r.perCento} su 100`);
  }
  assert.equal(resaDi('slot').perCento, 93.5);
  assert.equal(resaDi('roulette').perCento, 97.3);
});

test('la pesca, al ritmo massimo, non rende piu\' della presenza', () => {
  const r = resaDi('pesca');
  assert.ok(r.perOra <= G.presenzaOraria({}), `pesca ${r.perOra}/ora contro presenza ${G.presenzaOraria({})}/ora`);
  assert.equal(G.presenzaOraria({}), 120);
});

test('le sfide passano monete, non le creano: il duello senza posta e\' onore', () => {
  assert.equal(G.valoriDi({}, 'duello').premio, 0);
  assert.equal(resaDi('duello').perOra, 0);
  assert.equal(resaDi('furto').tipo, 'passa');
});

test('la resa della slot e\' quella del motore, su tutte le 216 tirate', () => {
  const S = games.SIMBOLI_SLOT;
  for (const c of [{ costo: 10, jackpot: 200, coppia: 15 }, { costo: 7, jackpot: 333, coppia: 4 }, { costo: 50, jackpot: 1, coppia: 0 }]) {
    let somma = 0;
    for (const a of S) for (const b of S) for (const d of S) somma += games.vincitaSlot([a, b, d], c).monete;
    const vera = Math.round((somma / 216 / c.costo) * 1000) / 10;
    assert.equal(G.valutaResa(di('slot').resa, c).perCento, vera, JSON.stringify(c));
  }
});

test('la pesca esce con la rarita\' scritta, e la resa e\' la sua media', () => {
  const t = G.valoriDi({}, 'pesca').pescato;
  const pesi = t.reduce((s, r) => s + r[2], 0);
  const visti = new Map();
  const passi = pesi * 10;
  for (let i = 0; i < passi; i++) {
    const [nome] = games.pescaPesata(t, () => (i + 0.5) / passi);
    visti.set(nome, (visti.get(nome) || 0) + 1);
  }
  for (const [nome, , peso] of t) assert.equal(visti.get(nome), peso * 10, nome);
  const media = t.reduce((s, r) => s + r[1] * r[2], 0) / pesi;
  assert.equal(resaDi('pesca').media, Math.round(media * 10) / 10);
});

test('chi aveva scelto un valore lo tiene; chi non l\'aveva mai toccato prende il nuovo', () => {
  assert.equal(G.valoriDi({ punti: { slotCoppia: 20 } }, 'slot').coppia, 15, 'uguale al vecchio predefinito: mai toccato');
  assert.equal(G.valoriDi({ punti: { slotCoppia: 30 } }, 'slot').coppia, 30, 'diverso: una scelta');
  assert.equal(G.valoriDi({ punti: { duello: 15 } }, 'duello').premio, 0);
  assert.equal(G.valoriDi({ punti: { duello: 40 } }, 'duello').premio, 40);
  assert.equal(G.valoriDi({ punti: { trivia: 60 } }, 'manche').premio, 60);
  assert.equal(G.valoriDi({ punti: { duello: 40 }, giochiConf: { duello: { premio: 5 } } }, 'duello').premio, 5, 'il pannello nuovo vince');
});

test('quello che arriva dal pannello si normalizza, e un valore storto non azzera niente', () => {
  const prima = { slot: { costo: 12 }, furto: { riuscita: 30 } };
  const n = G.normalizzaConf(prima, {
    slot: { costo: 'tanto', jackpot: 99999999, coppia: -5 },
    duello: { esiti: ['{a} vince', '{c} rompe tutto', '  ', '{b} perde contro {a}'] },
    pesca: { pescato: ['una trota | 12 | 5', 'rotta | x | 1', 'fantasma | 10 | 0'] },
    inesistente: { x: 1 },
  });
  assert.equal(n.slot.costo, 12, 'un numero storto tiene quello di prima');
  assert.equal(n.slot.jackpot, 1000000, 'oltre il tetto si ferma al tetto');
  assert.equal(n.slot.coppia, 0);
  assert.deepEqual(n.duello.esiti, ['{a} vince', '{b} perde contro {a}'], 'un segnaposto che il gioco non riempie non passa');
  assert.deepEqual(n.pesca.pescato, [['una trota', 12, 5]], 'rarita\' 0 e monete non numeriche non sono righe vere');
  assert.deepEqual(n.furto, { riuscita: 30 }, 'un gioco che non arriva non si tocca');
  assert.ok(!('inesistente' in n));
});

test('ogni gioco e ogni manopola hanno un nome solo: due uguali, e una sparirebbe dal pannello', () => {
  const ids = G.CATALOGO.map((g) => g.id);
  assert.deepEqual(ids, [...new Set(ids)]);
  for (const g of G.CATALOGO) {
    const chiavi = g.param.map((p) => p.k);
    assert.deepEqual(chiavi, [...new Set(chiavi)], g.id);
  }
});

test('ogni testo di serie si riempie senza lasciare segnaposto', () => {
  for (const g of G.CATALOGO) {
    for (const p of g.param.filter((x) => x.tipo === 'elenco')) {
      const valori = Object.fromEntries((p.segnaposto || []).map((k) => [k, 'X']));
      for (const riga of p.def) assert.doesNotThrow(() => games.riempi(riga, valori), `${g.id}.${p.k}: ${riga}`);
    }
  }
});

test('il pannello calcola la resa con la stessa regola del server', () => {
  const i = APP.indexOf('function valutaResaGioco(');
  let liv = 0, fine = -1;
  for (let j = APP.indexOf(') {', i) + 2; j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) { fine = j + 1; break; }
  }
  const pannello = new Function(`${APP.slice(i, fine)}; return valutaResaGioco;`)();
  let x = 7;
  const caso = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let giro = 0; giro < 50; giro++) {
    for (const g of G.CATALOGO) {
      const v = G.valoriDi({}, g.id);
      for (const p of g.param) {
        if (p.tipo === 'tabella') v[p.k] = v[p.k].map(([n, , w]) => [n, Math.floor(caso() * 500), 1 + Math.floor(caso() * 50)]);
        else if (p.tipo !== 'elenco') v[p.k] = p.min + Math.floor(caso() * Math.min(p.max - p.min + 1, 5000));
      }
      const ctx = { mancheMinuti: 1 + Math.floor(caso() * 60) };
      assert.deepEqual(pannello(g.resa, v, ctx), G.valutaResa(g.resa, v, ctx), `${g.id} ${JSON.stringify(v)}`);
    }
  }
});

test('la demo mostra lo stesso catalogo, coi valori di serie', () => {
  const i = APP.indexOf("'/api/streamer/giochi/regole': ");
  assert.ok(i > 0, 'la demo ha la sua copia');
  const inizio = APP.indexOf('{', i);
  const fine = APP.indexOf(",\n    '/api/streamer/comandi-pronti'", inizio);
  assert.deepEqual(JSON.parse(APP.slice(inizio, fine)), JSON.parse(JSON.stringify(G.catalogoPerPannello({}))));
});

test('salvare la carta dei punti non riscrive i valori vecchi dei giochi col predefinito', () => {
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const i = SRV.indexOf('if (b.punti !== undefined) {');
  const blocco = SRV.slice(i, SRV.indexOf('if (b.musica !== undefined)', i));
  assert.ok(!/trivia:\s+c\(p\.trivia/.test(blocco) && !/slotCoppia:\s+c\(/.test(blocco), 'nessun predefinito scritto sopra una scelta');
  assert.match(blocco, /else if \(giaQui\[k\] !== undefined\) vecchi\[k\] = giaQui\[k\];/, 'il valore salvato passa com\'e\'');
  assert.match(SRV, /out\.giochiConf = giochiConf\.normalizzaConf\(s\.settings\?\.giochiConf, b\.giochiConf\)/);
});
