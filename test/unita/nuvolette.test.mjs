// IL MOTORE DEI FUMETTI: corpo e coda in UN tracciato solo.
//
// Perché è la cosa che conta. Disegnare la coda come un pezzo attaccato al
// balloon è la strada che sembra più semplice, e non funziona: la giuntura si
// vede sempre. Il riempimento di uno taglia il contorno dell'altro, il bordo del
// balloon passa dritto sopra la bocca della coda, e ruotando la coda la sua base
// esce dal corpo e lascia un buco. Ci ho provato in quattro modi diversi, e si
// vedeva in tutti e quattro.
//
// Con un tracciato solo la giuntura non esiste, perché non ci sono due pezzi: il
// bordo del balloon, arrivato al punto d'attacco, DIVENTA la coda e poi torna.
//
// Le forme non sono di fantasia: nel lettering il tondo è la voce normale, il
// bordo a zig-zag è un grido, e il pensiero è una nuvola con una scia di
// bollicine (Blambot, «Comic Book Grammar & Tradition»).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { guscio, bollicine, misuraCoda, MARGINE, CODA_LUNGA, CODA_LARGA } from '../../src/web/public/fumetto.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const JS = leggi('src/web/public/aiuto.js');
const CSS = leggi('src/web/public/style.css');
const MOTORE = leggi('src/web/public/fumetto.js');

const MISURA = { larghezza: 300, altezza: 100 };
const pezzi = (d) => (d.match(/M/g) || []).length;

test('corpo e coda sono un tracciato solo, non due pezzi', () => {
  const d = guscio({ ...MISURA, becco: 0.3, giro: 0 });
  assert.equal(pezzi(d), 1, 'il tracciato comincia più di una volta: sono due pezzi, e la giuntura si vedrà');
  assert.match(d, /Q /, 'la coda non è curva');
  assert.match(d, /Z$/, 'il tracciato non si chiude: il riempimento sarebbe indefinito');
  // e senza coda il tracciato è più corto: la coda è DENTRO al bordo, non sopra
  const senza = guscio({ ...MISURA, coda: false });
  assert.ok(d.length > senza.length, 'con la coda il tracciato non cambia: allora la coda non è nel bordo');
  assert.doesNotMatch(senza, /Q /, 'senza coda restano le curve della coda');
});

// Entrando nella coda dalla parte sbagliata il bordo attraversa la sua bocca DUE
// volte, e disegna la riga che si voleva evitare: la coda sembra un pezzo
// incollato. Il tracciato resta uno solo, quindi il conto dei pezzi non se ne
// accorge — e infatti me l'ha dovuto dire il direttore, guardando.
//
// La misura giusta: lungo il bordo di sotto le x devono solo CALARE. Se
// risalgono, il bordo è tornato indietro.
function bordoRegolare(d) {
  const dopoArco = d.slice(d.indexOf(' Q ') - 200, d.indexOf(' Q '));
  const entra = Number((dopoArco.match(/H (-?[\d.]+)\s*$/) || [])[1]);
  const q = [...d.matchAll(/Q ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)/g)];
  if (!q.length || !Number.isFinite(entra)) return { ok: false, perche: 'non trovo la coda nel tracciato' };
  const esce = Number(q[q.length - 1][3]);
  const dopo = Number((d.slice(d.lastIndexOf(' Q ')).match(/H (-?[\d.]+)/) || [])[1]);
  if (!(entra > esce)) return { ok: false, perche: `entra a x=${entra} ed esce a x=${esce}: il bordo torna indietro sulla bocca` };
  if (Number.isFinite(dopo) && !(esce > dopo)) return { ok: false, perche: `esce a x=${esce} e riprende a x=${dopo}: il bordo torna indietro` };
  return { ok: true };
}

test('il bordo non torna indietro sulla bocca della coda', () => {
  for (const sotto of [false, true]) {
    for (const becco of [0.2, 0.5, 0.8]) {
      for (const giro of [-24, 0, 24]) {
        const r = bordoRegolare(guscio({ ...MISURA, becco, giro, sotto }));
        assert.ok(r.ok, `${sotto ? 'sotto' : 'sopra'}, becco ${becco}, ${giro}°: ${r.perche}`);
      }
    }
  }
});

test('la coda punta dove le si dice, e resta attaccata', () => {
  const dritta = guscio({ ...MISURA, becco: 0.5, giro: 0 });
  const storta = guscio({ ...MISURA, becco: 0.5, giro: 24 });
  assert.notEqual(dritta, storta, 'l’angolo non cambia niente: la coda punta sempre in giù');
  assert.equal(pezzi(storta), 1, 'ruotando la coda si stacca in un pezzo suo');
  // e da qualunque parte la si attacchi, resta un tracciato solo e chiuso
  for (const becco of [0, 0.15, 0.5, 0.85, 1]) {
    const d = guscio({ ...MISURA, becco, giro: 0 });
    assert.equal(pezzi(d), 1, `becco a ${becco}: la coda si stacca`);
    assert.match(d, /Z$/, `becco a ${becco}: il tracciato non si chiude`);
  }
});

test('la bolla sotto ha la coda in alto, e resta un pezzo solo', () => {
  const d = guscio({ ...MISURA, becco: 0.4, giro: 0, sotto: true });
  assert.equal(pezzi(d), 1);
  assert.match(d, /Q /, 'sotto la coda sparisce');
});

// Le misure vere che una nuvoletta assume: una parola sola, due parole, una
// frase. Provare solo la grande è come non provare: il difetto delle piccole
// esiste PROPRIO perche' sono piccole, e non si vede mai su una larga.
const MISURE = [
  { larghezza: 63, altezza: 49, lungo: 34, che: 'una parola' },
  { larghezza: 122, altezza: 49, lungo: 34, che: 'due parole' },
  { larghezza: 322, altezza: 71, lungo: 46, che: 'una frase' },
  { larghezza: 44, altezza: 44, lungo: 24, che: 'la piu\' piccola possibile' },
];

test('la coda rispetta due proporzioni, non una', () => {
  // 1. Sulla DISTANZA: «a tail should terminate at roughly 50-60% of the
  //    distance between the balloon and the character's head» (Blambot). Punta
  //    verso, non tocca.
  // 2. Sulla BOLLA: una coda più lunga del corpo si vede che è sbagliata. Sulle
  //    nuvolette di una parola la prima regola da sola dava una coda lunga
  //    quanto due terzi della bolla.
  const dentro = (v, a2, z) => Math.max(a2, Math.min(v, z));
  for (const [w, h] of [[63, 49], [122, 49], [322, 71], [280, 120], [44, 44]]) {
    const stacco = dentro(Math.round(Math.max(h * 0.82, w * 0.16)), 34, 92);
    const coda = misuraCoda(stacco, h);
    const suDistanza = coda / stacco;
    const suBolla = coda / h;
    assert.ok(suDistanza >= 0.45 && suDistanza <= 0.62,
      `${w}x${h}: la coda copre il ${(suDistanza * 100).toFixed(0)}% della distanza, fuori dal 50-60%`);
    assert.ok(suBolla <= 0.55, `${w}x${h}: la coda è il ${(suBolla * 100).toFixed(0)}% dell'altezza della bolla: troppo`);
  }
  // e la regola sta in UN posto solo: chi posa la bolla la chiede al motore
  assert.match(JS, /misuraCoda\(stacco, m\.height\)/,
    'la nuvoletta non chiede la coda al motore: il numero vive in due posti e uno prima o poi cambia da solo');
});

test('anche sulle bolle piccole la coda resta attaccata al fondo', () => {
  // Il difetto: su una bolla stretta il bordo tondo si mangia quasi tutto il
  // fondo — su 63px ne restavano SETTE piatti per una base di ventuno. Il
  // vincolo diventava impossibile, e la coda finiva fuori, appesa allo spigolo.
  // Non si vedeva sulla bolla larga, che è l'unica su cui provavo.
  for (const m of MISURE) {
    for (const becco of [0, 0.5, 1]) {
      const d = guscio({ ...m, becco, giro: 0 });
      const entra = Number((d.slice(0, d.indexOf(' Q ')).match(/H (-?[\d.]+)\s*$/) || [])[1]);
      const q = [...d.matchAll(/Q [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)/g)];
      const esce = Number(q[q.length - 1][1]);
      for (const [nome, v] of [['entra', entra], ['esce', esce]]) {
        assert.ok(Number.isFinite(v), `${m.che}, becco ${becco}: non trovo dove la coda ${nome} nel bordo`);
        assert.ok(v >= MARGINE && v <= MARGINE + m.larghezza,
          `${m.che}, becco ${becco}: la coda ${nome} a x=${v}, fuori dalla bolla (${MARGINE}…${MARGINE + m.larghezza})`);
      }
      assert.ok(entra > esce, `${m.che}, becco ${becco}: il bordo torna indietro sulla bocca`);
    }
  }
});

test('la coda è lunga quanto lo spazio che le si lascia', () => {
  // Il difetto: il motore si calcolava la lunghezza per conto suo, e chi
  // posiziona la bolla ne calcolava un'altra per lo stacco dal bersaglio. Due
  // numeri per lo stesso fatto — e su una bolla piccola la coda usciva enorme,
  // o cortissima, senza che niente si lamentasse.
  for (const lungo of [24, 40, 54]) {
    const d = guscio({ ...MISURA, becco: 0.5, giro: 0, lungo });
    const q = [...d.matchAll(/Q [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)/g)];
    const puntaY = Math.max(...q.map((m) => Number(m[2])));
    const atteso = MARGINE + MISURA.altezza + lungo;
    assert.ok(Math.abs(puntaY - atteso) < 1.5,
      `chiesta una coda di ${lungo}: la punta arriva a ${puntaY} invece che a ${atteso}`);
  }
  assert.match(JS, /guscio\(\{[^}]*lungo\b/, 'chi posiziona la bolla non dice al motore quanto dev’essere lunga la coda');
  assert.match(JS, /disegna\(m\.width, m\.height,[^)]*codaH\)/, 'il disegno non riceve la lunghezza che lo stacco ha lasciato');
});

test('le tre forme sono quelle che il fumetto assegna', () => {
  const grido = guscio({ ...MISURA, tipo: 'grido', coda: false });
  const punte = (grido.match(/L /g) || []).length;
  assert.ok(punte >= 20, `il grido ha ${punte} lati: troppo pochi per leggersi come uno strillo`);
  // e anche il grido ha la coda DENTRO al bordo, non appiccicata
  const conCoda = guscio({ ...MISURA, tipo: 'grido', becco: 0.4, giro: 10 });
  assert.equal(pezzi(conCoda), 1, 'la coda del grido è un pezzo a parte: il bordo le passa sopra la bocca');
  assert.ok((conCoda.match(/L /g) || []).length > punte, 'la coda non entra nel bordo della stella');
  const pensiero = guscio({ ...MISURA, tipo: 'pensiero' });
  assert.doesNotMatch(pensiero, /Q /, 'il pensiero ha il cuneo: allora non è un pensiero');
  const scia = bollicine({ ...MISURA, becco: 0.3 });
  assert.ok(scia.length >= 3, `le bollicine sono ${scia.length}: una scia ne vuole almeno tre`);
  assert.ok(scia[0].r > scia[scia.length - 1].r, 'le bollicine non rimpiccioliscono verso chi pensa');
});

test('la tela è abbastanza grande per la coda più lunga che il motore sa fare', () => {
  // MARGINE è il bordo di tela attorno alla bolla. Se la coda esce di lì viene
  // tagliata — ed è esattamente il difetto che avevo: il riempimento tagliato al
  // bordo e il contorno no, perché il taglio prende solo il primo.
  //
  // Il numero non si sceglie a occhio: si RICAVA dalla coda più lunga possibile,
  // più mezza base, perché ruotando è quella che arriva più in là. Così il
  // giorno che la coda si allunga, la tela cresce da sola.
  const arrivo = CODA_LUNGA * (1 + CODA_LARGA / 2);
  assert.ok(MARGINE >= arrivo, `la coda arriva a ${arrivo.toFixed(1)} e la tela ne lascia ${MARGINE}`);
  assert.ok(MARGINE < arrivo + 20, `la tela è ${MARGINE} per una coda di ${arrivo.toFixed(1)}: sprecata`);
});

test('il tipo si ricava da quello che si punta, non da un’etichetta a mano', () => {
  assert.match(JS, /function tipoDi\(el\)/, 'manca chi decide la forma');
  assert.match(JS, /PERICOLO/, 'niente riconosce le cose che fanno danni');
  assert.match(JS, /TOCCABILE/, 'niente distingue un comando da una spiegazione');
  assert.doesNotMatch(JS, /data-aiuto-tipo/, 'il tipo dipende da un attributo da ricordarsi');
});

test('la bolla si spegne quando serve, e non quando capita', () => {
  assert.match(JS, /function ancoraSopra\(\)/, 'niente controlla se il puntatore è ancora lì');
  assert.match(JS, /elementFromPoint/, 'lo deduce invece di chiederlo al browser');
  assert.match(JS, /Math\.abs\(window\.scrollY - dovEra\) > SCORRE_MIN/, 'basta un pixel di assestamento per spegnerla');
  assert.match(JS, /function quantoDura\(t\)/, 'la bolla non se ne va mai da sola');
  assert.match(MOTORE, /QUOTA_CODA = 0\.5[0-9]?/, 'la coda arriva fino al bersaglio invece di fermarsi a metà');
});

test('il disegno non lo schiaccia il foglio di stile del sito', () => {
  // Il sito ha un `max-width: 100%` su tutte le immagini. Sul guscio del fumetto
  // schiacciava il disegno al 63% della sua larghezza: la forma usciva più
  // piccola del testo e la coda sembrava un fuscello. Nessun errore, ovviamente.
  assert.match(CSS, /\.aiuto-guscio \{[^}]*max-width: none/, 'il guscio può essere schiacciato dal reset del sito');
  assert.match(JS, /guscioSvg\.style\.width/, 'la misura del guscio la decide il foglio di stile invece del codice');
});

test('col dito non compare, e non ruba i clic', () => {
  assert.match(JS, /pointerType === 'touch'/, 'col dito la nuvoletta non deve comparire');
  assert.match(CSS, /\.aiuto-bolla \{[\s\S]{0,900}pointer-events: none/, 'la bolla intercetta i clic');
});
