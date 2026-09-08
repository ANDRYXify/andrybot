// I SEI LIVELLI: quanto è grave adesso, e cosa cambia a ogni scalino.
//
// Prima erano tre — calma, sospetto, attacco — e il difetto non era il numero:
// era che «sospetto» NON FACEVA NIENTE. Si alzava, si scriveva nel registro, e
// il canale restava com'era. Dall'altra parte il salto era brutale: dal nulla a
// «chiudo la chat, alzo lo Shield Mode e blocco l'ondata».
//
// Il modello sta in docs/LIVELLI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('livelli-');
const { streamers } = await import('../../src/db.js');
const L = await import('../../src/features/livelli.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

// ─────────────────────────────────────────── ogni livello fa una cosa sua

test('nessun livello fa quello che fa il precedente', () => {
  // Sei nomi per tre comportamenti sarebbero tre livelli con dei sinonimi. Si
  // confronta ogni scalino col precedente e si pretende che qualcosa cambi.
  const visti = L.LIVELLI.map((l) => JSON.stringify(L.assettoDi(l)));
  for (let i = 1; i < visti.length; i++) {
    assert.notEqual(visti[i], visti[i - 1], `«${L.LIVELLI[i]}» non aggiunge niente a «${L.LIVELLI[i - 1]}»`);
  }
});

test('e salendo non si toglie mai una difesa', () => {
  // Una difesa che si spegne quando le cose peggiorano è il difetto peggiore
  // possibile, e va escluso per costruzione.
  const cresce = ['guardaNomi', 'segnalaNuovi', 'trattieniNuovi', 'serranda', 'shieldMode', 'bloccaOndata'];
  for (let i = 1; i < L.LIVELLI.length; i++) {
    const a = L.assettoDi(L.LIVELLI[i - 1]);
    const b = L.assettoDi(L.LIVELLI[i]);
    for (const c of cresce) assert.ok(!a[c] || b[c], `«${c}» si spegne salendo a ${L.LIVELLI[i]}`);
    assert.ok(b.chatLenta >= a.chatLenta, 'la chat lenta non si allarga salendo');
    assert.ok(b.oreMinime >= a.oreMinime, 'la porta non si allarga salendo');
  }
});

test('la serranda arriva solo ad attacco, la chat lenta prima', () => {
  assert.equal(L.assettoDi('allerta').serranda, false, 'a due terzi di strada non si chiude la chat');
  assert.equal(L.assettoDi('difesa').serranda, false);
  assert.ok(L.assettoDi('difesa').chatLenta > 0, 'ma si rallenta: è il passo che prima mancava');
  assert.equal(L.assettoDi('attacco').serranda, true);
  assert.ok(L.assettoDi('serrata').followerDaMinuti > L.assettoDi('attacco').followerDaMinuti);
  // E la porta si stringe DAVVERO almeno una volta: «non si allarga mai» è
  // vero anche se non cambia mai, e allora la stretta non c'è.
  assert.ok(L.assettoDi('difesa').oreMinime > L.assettoDi('allerta').oreMinime, 'a «difesa» la porta si stringe');
  assert.ok(L.assettoDi('serrata').oreMinime > L.assettoDi('difesa').oreMinime, 'e a «serrata» ancora');
});

test('«osservo» guarda e non tocca, «difesa» tocca il messaggio e non la persona', () => {
  assert.equal(L.assettoDi('osservo').trattieniNuovi, false);
  assert.equal(L.assettoDi('osservo').segnalaNuovi, false);
  assert.equal(L.assettoDi('allerta').segnalaNuovi, true, 'si avvisano i mod');
  assert.equal(L.assettoDi('allerta').trattieniNuovi, false, 'ma non si trattiene niente');
  assert.equal(L.assettoDi('difesa').trattieniNuovi, true);
  assert.equal(L.assettoDi('difesa').bloccaOndata, false, 'il messaggio sì, la persona no');
});

// ─────────────────────────────────────────── il punteggio

test('il punteggio è continuo: nove su dieci non è come zero', () => {
  // Col booleano lo era, e tutto quello che stava in mezzo si perdeva.
  assert.equal(L.punteggioAttacco({}), 0);
  const nove = L.punteggioAttacco({ follow: 9, soglia: 10 });
  const venti = L.punteggioAttacco({ follow: 20, soglia: 10 });
  assert.ok(nove > 0 && nove < venti, `nove: ${nove}, venti: ${venti}`);
});

test('e satura: molto piu\' del normale non aggiunge informazione', () => {
  const a = L.punteggioAttacco({ follow: 20, soglia: 10 });
  const b = L.punteggioAttacco({ follow: 2000, soglia: 10 });
  assert.equal(a, b, 'oltre il doppio della soglia non si impara piu\' niente');
  assert.ok(L.punteggioAttacco({ follow: 9999, soglia: 1, coro: true, coroBocche: 99, artificiale: true, gruppo: true, ondaLenta: true, frazioneNuovi: 1 }) <= 100);
});

test('i pesi portano dove devono portare', () => {
  // I pesi non sono opinioni: si tarano su cosa deve succedere. Queste sono le
  // quattro cose che devono succedere, e se un peso cambia si vede qui.
  const liv = (s) => L.livelloDa(L.punteggioAttacco(s));
  assert.equal(liv({ follow: 16, soglia: 10, artificiale: true }), 'attacco',
    'un\'ondata misurata come macchina si tratta da attacco');
  assert.equal(liv({ coro: true, coroBocche: 4 }), 'attacco',
    'un coro confermato è già un attacco in corso');
  assert.equal(liv({ follow: 8, soglia: 10, ondaLenta: true, gruppo: true }), 'attacco',
    'il gocciolamento con la fabbrica riconosciuta pure');
  assert.equal(liv({ follow: 20, soglia: 10 }), 'allerta',
    'ma tanti follow di cui non si sa niente restano un\'allerta, non una serranda');
});

test('le tre modalita\' spostano le soglie, non la scala', () => {
  const p = L.punteggioAttacco({ follow: 20, soglia: 10 });
  assert.equal(L.livelloDa(p, 'prudente'), 'allerta');
  assert.equal(L.livelloDa(p, 'aggressiva'), 'difesa');
  for (const m of Object.keys(L.MODI)) {
    const s = L.MODI[m];
    let prima = 0;
    for (const l of L.LIVELLI.slice(1)) { assert.ok(s[l] > prima, `${m}: le soglie devono salire`); prima = s[l]; }
  }
  assert.equal(L.livelloDa(999, 'prudente'), 'serrata');
  assert.equal(L.livelloDa(-5), 'calma');
});

// ─────────────────────────────────────────── dentro lo scudo

test('un picco di gente vera non chiude piu\' la chat', async () => {
  // Prima si alzava la serranda «per prudenza»: chat ai soli follower durante
  // una clip andata bene, cioè fare male allo streamer nel suo momento migliore.
  const ch = 'clip1';
  streamers.upsertApproved(ch, 'Clip', '91');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
  ab.azzeraStati();
  const chiuso = {};
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async (_c, on) => { chiuso.follower = on; return { ok: true }; },
    chatLenta: async (_c, on) => { chiuso.lenta = on; return { ok: true }; },
    shieldMode: async (_c, on) => { chiuso.shield = on; return { ok: true }; },
  } });
  let t = 0;
  const r = (() => { let x = 7; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; })();
  for (let i = 0; i < 16; i++) {
    await scudo.onFollow({ channel: ch, ts: Math.round(t), data: { user_id: 'p' + i, user_login: `andre${i}_tv` } });
    t += -Math.log(1 - r()) * 900;
  }
  assert.ok(['osservo', 'allerta'].includes(ab.assetto(ch).livello), `livello ${ab.assetto(ch).livello}`);
  assert.ok(!chiuso.follower, 'la chat resta aperta');
});

test('e si scende un gradino per volta, non di colpo', async () => {
  const ch = 'scala1';
  streamers.upsertApproved(ch, 'Scala', '92');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  ab.azzeraStati();
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  await scudo._alza(ch, 'serrata', 'prova', scudo.cfg(ch));
  const scesi = [];
  for (let i = 0; i < 8 && ab.assetto(ch).livello !== 'calma'; i++) {
    await scudo._abbassa(ch);
    scesi.push(ab.assetto(ch).livello);
  }
  assert.deepEqual(scesi, ['attacco', 'difesa', 'allerta', 'osservo', 'calma'],
    'alzare è un gesto, abbassare è il tempo che passa');
});

test('e scendendo si riapre subito quello che il livello non prevede piu\'', async () => {
  // Restare chiusi «per sicurezza» a livello basso vuol dire lasciare un canale
  // strozzato senza che nessuno se ne accorga: la serranda deve riaprirsi al
  // primo gradino che non la prevede, non alla fine della discesa.
  const ch = 'scala2';
  streamers.upsertApproved(ch, 'Scala2', '94');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  ab.azzeraStati();
  const chiuso = {};
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async (_c, on) => { chiuso.follower = on; return { ok: true }; },
    chatLenta: async (_c, on) => { chiuso.lenta = on; return { ok: true }; },
    shieldMode: async (_c, on) => { chiuso.shield = on; return { ok: true }; },
  } });
  await scudo._alza(ch, 'attacco', 'ondata', scudo.cfg(ch));
  assert.equal(chiuso.follower, true);
  await scudo._abbassa(ch);
  assert.equal(ab.assetto(ch).livello, 'difesa');
  assert.equal(chiuso.follower, false, 'la serranda si riapre al primo gradino che non la prevede');
  assert.equal(chiuso.shield, false, 'e lo Shield Mode con lei');
  assert.equal(chiuso.lenta, true, 'la chat lenta invece resta: «difesa» la prevede ancora');
});

test('un allarme piu\' lieve non fa scendere il livello', async () => {
  const ch = 'giu1';
  streamers.upsertApproved(ch, 'Giu', '93');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  ab.azzeraStati();
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  await scudo._alza(ch, 'attacco', 'ondata', scudo.cfg(ch));
  await scudo._alza(ch, 'osservo', 'una sciocchezza', scudo.cfg(ch));
  assert.equal(ab.assetto(ch).livello, 'attacco', 'una difesa che si abbassa da sola mentre l\'attacco continua non è una difesa');
});
