// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I TESTI DELLA CARTA SI MISURANO (docs/CARTA-LIVE.md, «I testi si misurano»).
//
// La carta non taglia piu' i testi a un numero di segni: li misura con le
// larghezze delle lettere scritte nei file dei caratteri, e li fa stare nella
// loro larghezza. Le promesse:
//  · la tabella delle lettere e' quella dei file (nessuno la scrive a mano);
//  · un testo sta sempre nella sua larghezza, qualunque cosa ci sia scritto;
//  · prima si rimpicciolisce, e si taglia solo se nemmeno al suo minimo ci sta,
//    e quel minimo resta leggibile;
//  · nelle carte di serie, coi dati piu' lunghi, nessun testo esce dalla carta;
//  · un testo non va mai oltre il bordo, qualunque larghezza gli si dia;
//  · le vesti dell'anteprima di una pagina tengono la targhetta della pagina.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const C = await import('../../src/features/carta-disegno.js');
const { larghezzaTesto, adatta, larghezzaUtile, svgCarta, normCarta, TEMI, TEMI_PAGINA, CARATTERI, vestiPagina } = C;
const RAD = fileURLToPath(new URL('../..', import.meta.url));

// un generatore col suo seme: i casi sono sempre gli stessi
let h = 1234567;
const caso = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return h / 4294967296; };
const fra = (a, b) => a + (b - a) * caso();
const LETTERE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;!?-_/@#àèéìòùÀÈÉ€ÆøŁżЖ漢';
const parola = (n) => Array.from({ length: n }, () => LETTERE[Math.floor(caso() * LETTERE.length)]).join('');
const NOMI = CARATTERI.map(([n]) => n);

test('la tabella delle lettere e\' quella dei file dei caratteri', () => {
  const r = spawnSync(process.execPath, ['scripts/misura-caratteri.mjs', '--verifica'], { cwd: RAD, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('un testo sta sempre nella sua larghezza', () => {
  for (let i = 0; i < 600; i++) {
    const t = parola(Math.floor(fra(1, 160)));
    const car = NOMI[i % NOMI.length], corpo = Math.round(fra(8, 200)), sp = Math.round(fra(-10, 40)), largo = Math.round(fra(40, 1200));
    const r = adatta(t, car, corpo, sp, largo);
    assert.ok(larghezzaTesto(r.testo, car, r.corpo, sp) <= largo + 0.5, `«${t}» in ${car} a ${corpo} dentro ${largo}: ${larghezzaTesto(r.testo, car, r.corpo, sp).toFixed(1)}`);
    assert.ok(r.corpo <= corpo, 'il corpo non cresce mai');
  }
});

test('prima si rimpicciolisce; taglia solo sotto il suo minimo, che resta leggibile', () => {
  // ci sta piu' piccolo: niente puntini
  const largo = larghezzaTesto('Il negozio di andryxify', 'Archivo Black', 50, 0) + 1;
  const a = adatta('Il negozio di andryxify', 'Archivo Black', 74, 0, largo);
  assert.equal(a.testo, 'Il negozio di andryxify');
  assert.ok(a.corpo < 74 && a.corpo >= 49, `si e' rimpicciolito a ${a.corpo}`);
  // non ci sta nemmeno al minimo: si taglia, al minimo, coi puntini
  const b = adatta('x'.repeat(300), 'Archivo', 31, 0, 620);
  assert.ok(b.testo.endsWith('…'), 'i puntini dicono che continua');
  assert.equal(b.corpo, 22, 'un testo piccolo non scende sotto i 22 punti');
  const c = adatta('y'.repeat(300), 'Anton', 88, 0, 520);
  assert.equal(c.corpo, Math.round(88 * 0.55), 'un titolo grande non scende sotto il 55% del suo corpo');
  // un testo corto non si tocca
  assert.deepEqual(adatta('ciao', 'Anton', 40, 0, 600), { corpo: 40, testo: 'ciao' });
});

test('nelle carte di serie, coi dati piu\' lunghi, nessun testo esce dalla carta', () => {
  const lungo = { nome: 'UnNomeUtenteMoltoLungoSenzaSpazi_DaVedere', titolo: 'Un titolo lunghissimo, scritto per vedere fin dove arriva questa riga della carta e oltre',
    gioco: 'Un gioco dal nome lunghissimo: edizione definitiva', login: 'unnomeutentemoltolungo', link: 'negozio.socialbot.live/unnomeutentemoltolungosenzaspazi',
    piattaforma: 'twitch', spettatori: '12345', avatar: '' };
  const decodifica = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  for (const [nome, tema] of [...Object.entries(TEMI), ...Object.entries(TEMI_PAGINA)]) {
    const carta = normCarta(tema);
    const svg = svgCarta(carta, lungo);
    for (const m of svg.matchAll(/<text x="(-?[\d.]+)" y="[^"]*" font-family="([^"]+)" font-size="([\d.]+)"[^>]*?(?: letter-spacing="(-?[\d.]+)")?>([^<]*)<\/text>/g)) {
      const fine = Number(m[1]) + larghezzaTesto(decodifica(m[5]), m[2], Number(m[3]), Number(m[4] || 0));
      assert.ok(fine <= carta.larghezza, `${nome}: «${decodifica(m[5])}» arriva a ${fine.toFixed(0)} su ${carta.larghezza}`);
    }
  }
});

test('un testo non va mai oltre il bordo, qualunque larghezza gli si dia', () => {
  for (const x of [0, 300, 900, 1150]) {
    assert.ok(x + larghezzaUtile({ x, larghezza: 5000 }, 1200) <= 1200, `da ${x}`);
  }
  assert.equal(larghezzaUtile({ x: 100, larghezza: 300 }, 1200), 300, 'una larghezza che ci sta resta quella');
});

test('le vesti dell\'anteprima di una pagina tengono la targhetta della pagina', () => {
  for (const quale of Object.keys(TEMI_PAGINA)) {
    const vesti = vestiPagina({ quale, accento: '#C2185B' });
    assert.equal(vesti.length, Object.keys(TEMI_PAGINA).length, 'una veste per ogni disegno');
    const targa = TEMI_PAGINA[quale].elementi.find((e) => e.tipo === 'targhetta').testo;
    for (const v of vesti) {
      assert.equal(v.carta.elementi.find((e) => e.tipo === 'targhetta').testo, targa, `${quale} vestita «${v.nome}»`);
      assert.equal(v.nomi.length, 3, 'il nome nelle tre lingue');
    }
  }
});
