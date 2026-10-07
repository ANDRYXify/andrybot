// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE LETTURE DEL PROGRAMMA: quello che il bot sa della prossima pausa, e
// quello che non sa (docs/PUBBLICITA.md, «Quello che il bot sa del programma»).
//
// Il conto sull'overlay e' vero solo quanto e' vera l'ultima lettura. Qui si
// prova che, per costruzione:
//
//  · non so non vuol dire nessuna: una lettura fallita lascia la pausa che si
//    sapeva, e si rifa' al giro dopo, poi sempre piu' piano, mai oltre la
//    rilettura dei cinque minuti;
//  · dopo una pausa la prossima non si sa finche' Twitch non la dice: si
//    rilegge a ogni giro, non una volta sola;
//  · uno snooze si vede entro un giro in tutti i cinque minuti che puo'
//    spostare, e il preavviso che lo legge lo dice subito anche alla scena;
//  · lo stato di un canale e' uno solo, e una lettura chiesta prima di una
//    pausa, o piu' vecchia di quella che si ha, non ci scrive sopra.
//
// Il bot e' quello vero (i metodi di BotManager), Twitch e' finto ma risponde
// come quello vero: secondi Unix, e `null` per qualunque errore, come
// helix.getAdSchedule. L'orologio e' finto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pub-letture-');
const { streamers, statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const P = await import('../../src/features/pubblicita.js');
process.on('exit', () => usaEGetta.pulisci());

const ORA = Date.parse('2026-10-07T20:00:00.000Z');
const MIN = 60_000;
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
const secondiUnix = (ms) => String(ms / 1000);

function canale(login, { chat = false, overlay = true, frasi = null } = {}) {
  streamers.upsertApproved(login, login);
  const voce = frasi ? { voce: { momenti: Object.fromEntries(Object.entries(frasi).map(([k, f]) => [k, { modo: 'sue', frasi: f }])) } } : {};
  streamers.setSettings(login, { pubblicita: { acceso: chat }, overlayPubblicita: { attivo: overlay }, ...voce });
  statoVivo.togli(login, 'pubblicita');
}

// Un bot senza costruttore: lo stato e i metodi della pubblicita'. `programma`
// riceve l'istante della domanda e risponde come Twitch: una riga, `null`
// (niente), un errore, o una promessa che si scioglie quando vuole il test.
function bot(login, programma = () => null) {
  const emessi = [];
  const letture = [];
  const detti = [];
  const io = Object.create(BotManager.prototype);
  io._pub = new Map();
  io._pubSveglie = new Map();
  io._liveState = new Map([[login, true]]);
  io.effects = { emit: (ch, d) => { if (d?.tipo === 'pubblicita') emessi.push({ t: Date.now(), prossima: d.prossima, pausaFino: d.pausaFino }); } };
  io.helix = {
    announce: async (ch, testo) => { detti.push({ t: Date.now(), testo }); return { ok: true }; },
    getAdSchedule: async () => {
      letture.push(Date.now());
      try { const r = await programma(Date.now()); return r ? P.programmaDa(r) : null; } catch { return null; }
    },
  };
  return { io, emessi, letture, detti };
}

// ── Non so non vuol dire nessuna ─────────────────────────────────────────

test('una lettura fallita non vuol dire «nessuna pausa»: resta quella che si sapeva', () => {
  const stato = { prossima: ORA + 40 * MIN, letto: ORA - P.RILETTURA_MS };
  const { applicata, ...campi } = P.dopoLettura(stato, null, { chiesto: ORA });
  assert.equal(applicata, false);
  assert.ok(!('prossima' in campi), 'la pausa che si sapeva resta: e\' la cosa piu\' vera che abbiamo');
  assert.ok(!('letto' in campi), '«letto» resta l\'ultima lettura riuscita');
  assert.deepEqual(campi, { falliti: 1, fallitoA: ORA }, 'cambia solo il conto degli errori');
  const dopo = { ...stato, ...campi };
  assert.equal(P.vaGuardatoPerOverlay(dopo, ORA + P.GIRO_MS / 2 - 1), false, 'non si richiede nello stesso giro');
  assert.equal(P.vaGuardatoPerOverlay(dopo, ORA + P.GIRO_MS), true, 'si riprova al giro dopo: la ragione per leggere c\'e\' ancora');
  const ok = P.dopoLettura(dopo, P.programmaDa({ next_ad_at: secondiUnix(ORA + 39 * MIN) }), { chiesto: ORA + P.GIRO_MS });
  assert.deepEqual(ok, { applicata: true, prossima: ORA + 39 * MIN, letto: ORA + P.GIRO_MS, falliti: 0, fallitoA: 0 }, 'una lettura riuscita azzera gli errori');
  const nessuna = P.dopoLettura(dopo, P.programmaDa({ next_ad_at: 0 }), { chiesto: ORA + P.GIRO_MS });
  assert.equal(nessuna.prossima, 0, 'e «nessuna» lo dice solo Twitch');
});

test('dopo un errore si riprova al giro dopo, poi sempre piu\' piano, mai oltre la rilettura', () => {
  // L'attesa scende dal passo del giro e dalla rilettura, non e' scelta a occhio.
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 40].map(P.attesaDopoErrori),
    [0, P.GIRO_MS, 2 * P.GIRO_MS, 4 * P.GIRO_MS, 8 * P.GIRO_MS, P.RILETTURA_MS, P.RILETTURA_MS, P.RILETTURA_MS]);
  // Twitch che non risponde mai (un permesso tolto): si simula il giro per
  // un'ora, con un giro puntuale, uno che arriva un millisecondo prima
  // (setInterval non e' un metronomo) e uno che tarda.
  for (const passo of [P.GIRO_MS, P.GIRO_MS - 1, P.GIRO_MS + 250]) {
    const c = P.normalizzaPubblicita({ acceso: true, quanto: 60 });
    const stato = { prossima: ORA + 40 * MIN, letto: ORA - P.RILETTURA_MS };
    const tentativi = [];
    for (let t = ORA; t < ORA + 60 * MIN; t += passo) {
      const scena = P.vaGuardatoPerOverlay(stato, t);
      assert.equal(P.vaGuardato(c, stato, t), scena, `giro ${passo}ms a ${t - ORA}ms: la chiamata e' una, la chat aspetta come la scena`);
      if (!scena) continue;
      tentativi.push(t);
      const { applicata, ...campi } = P.dopoLettura(stato, null, { chiesto: t });
      Object.assign(stato, campi);
    }
    assert.equal(tentativi[1] - tentativi[0], passo, `giro ${passo}ms: il primo errore si riprova al giro dopo`);
    for (let i = 1; i < tentativi.length; i++) {
      const attesa = P.attesaDopoErrori(i);
      const passato = tentativi[i] - tentativi[i - 1];
      assert.ok(Math.abs(passato - attesa) < passo / 2,
        `giro ${passo}ms, errore ${i}: si riprova al giro piu' vicino all'attesa (${attesa}ms), non ${passato}ms dopo`);
    }
    assert.ok(tentativi.length <= 16, `giro ${passo}ms: ${tentativi.length} chiamate in un'ora, non centoventi`);
    assert.equal(stato.prossima, ORA + 40 * MIN, 'e per tutta l\'ora la pausa che si sapeva e\' rimasta');
  }
});

test('un errore di Twitch non toglie il conto dalla scena, e la lettura si rifa\' al giro dopo', async (t) => {
  for (const chat of [false, true]) {
    const ch = chat ? 'letture-a-chat' : 'letture-a';
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
    canale(ch, { chat });
    const prossima = ORA + 40 * MIN;
    const male = new Set([ORA + P.RILETTURA_MS]);
    const { io, emessi, letture } = bot(ch, (q) => { if (male.has(q)) throw new Error('Helix 503'); return { next_ad_at: secondiUnix(prossima), duration: 90 }; });
    await io._giroPubblicita();
    assert.deepEqual(emessi.map((e) => e.prossima), [prossima]);
    t.mock.timers.setTime(ORA + P.RILETTURA_MS);
    await io._giroPubblicita();
    assert.equal(letture.length, 2, 'la rilettura dei cinque minuti e\' partita, ed e\' andata male');
    assert.deepEqual(emessi.map((e) => e.prossima), [prossima], `chat ${chat}: alla scena non e' arrivato nessun «nessuna pausa»`);
    assert.deepEqual(statoVivo.leggi(ch, 'pubblicita'), { prossima, pausaFino: 0 }, 'e un overlay che si apre adesso trova la pausa');
    assert.equal(io._pub.get(ch).letto, ORA, '«letto» e\' ancora l\'ultima lettura riuscita');
    t.mock.timers.setTime(ORA + P.RILETTURA_MS + P.GIRO_MS);
    await io._giroPubblicita();
    assert.equal(letture.length, 3, `chat ${chat}: al giro dopo si rilegge`);
    assert.equal(io._pub.get(ch).falliti, 0);
    t.mock.timers.reset();
  }
});

test('senza il permesso, a Twitch non si telefona ogni mezzo minuto per tutta la sera', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('letture-b');
  const { io, emessi, letture } = bot('letture-b', () => { throw new Error('Helix 401'); });
  for (let q = ORA; q < ORA + 60 * MIN; q += P.GIRO_MS) { t.mock.timers.setTime(q); await io._giroPubblicita(); }
  assert.deepEqual(letture.slice(0, 5).map((q) => (q - ORA) / 1000), [0, 30, 90, 210, 450], 'trenta secondi, uno, due, quattro minuti');
  for (let i = 5; i < letture.length; i++) assert.equal(letture[i] - letture[i - 1], P.RILETTURA_MS, 'poi ogni cinque minuti, non oltre');
  assert.equal(letture.length, 15, 'quindici chiamate in un\'ora, non centoventi');
  assert.ok(emessi.every((e) => !e.prossima && !e.pausaFino), 'e in scena non si e\' inventato niente');
  // Fuori diretta si dimentica tutto, anche gli errori: la diretta dopo
  // comincia leggendo, e un permesso concesso nel frattempo si vede subito.
  const ultime = letture.length;
  io._liveState.set('letture-b', false);
  t.mock.timers.setTime(ORA + 60 * MIN); await io._giroPubblicita();
  io._liveState.set('letture-b', true);
  t.mock.timers.setTime(ORA + 60 * MIN + P.GIRO_MS); await io._giroPubblicita();
  assert.equal(letture.length, ultime + 1, 'alla diretta dopo si legge al primo giro');
  t.mock.timers.reset();
});

// ── Dopo la pausa la prossima non si sa ──────────────────────────────────

test('dopo una pausa la prossima non si sa finche\' Twitch non la dice', () => {
  const inizio = ORA - 2 * MIN;
  const fine = inizio + 60_000;
  const pausa = { ultimaPausa: String(inizio), secondi: 60, finisceA: fine };
  const g = (stato, a = ORA) => P.vaGuardatoPerOverlay({ ...pausa, ...stato }, a);
  assert.equal(g({ prossima: 0, letto: fine + 1000 }), true, 'letta dopo la fine, Twitch dice ancora «nessuna»: non si sa');
  assert.equal(g({ prossima: inizio, letto: fine + 1000 }), true, 'ridice la pausa appena finita: non si sa');
  assert.equal(g({ prossima: ORA + 30 * MIN, letto: fine - 1000 }), true, 'una lettura chiesta prima della fine non conta');
  assert.equal(g({ prossima: ORA + 30 * MIN, letto: fine + 1000 }), false, 'ha detto la prossima: si sa');
  assert.equal(g({ prossima: 0, letto: fine + 1000, finisceA: 0 }), true, 'anche dopo il «sono tornato», che consuma la fine contata');
  // Non per sempre: un canale senza piu' pause in programma non si richiede
  // ogni mezzo minuto per tutta la sera.
  assert.equal(g({ prossima: 0, letto: fine + P.RILETTURA_MS - P.GIRO_MS }, fine + P.RILETTURA_MS - 1), true, 'un attimo prima dei cinque minuti, ancora a ogni giro');
  assert.equal(g({ prossima: 0, letto: fine + P.RILETTURA_MS - P.GIRO_MS }, fine + P.RILETTURA_MS), false, 'dopo, il passo di sempre');
  assert.equal(g({ prossima: 0, letto: fine + 1000 }, inizio + 30_000), false, 'a pausa in corso no: il conto e\' quello della fine');
});

test('dopo la pausa il conto torna appena Twitch dice la prossima, anche se la prima lettura va male', async (t) => {
  for (const caso of ['errore', 'nessuna', 'quella finita']) {
    const ch = 'letture-c-' + caso.replace(' ', '-');
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
    canale(ch);
    const inizio = ORA + 2 * MIN + 5000;
    const dura = 90;
    const fine = inizio + dura * 1000;
    const nuova = fine + 60 * MIN;
    let primaDopo = true;
    const { io, emessi } = bot(ch, (q) => {
      if (q < inizio) return { next_ad_at: secondiUnix(inizio), duration: dura };
      if (q >= fine && primaDopo) {
        // La prima lettura dopo la fine: Twitch non ha ancora la prossima.
        primaDopo = false;
        if (caso === 'errore') throw new Error('Helix 500');
        return { next_ad_at: caso === 'nessuna' ? 0 : secondiUnix(inizio), duration: 0 };
      }
      return { next_ad_at: secondiUnix(nuova), duration: dura };
    });
    for (let q = ORA; q <= ORA + 12 * MIN; q += P.GIRO_MS) {
      if (q > inizio && !io._pub.get(ch)?.ultimaPausa) {
        t.mock.timers.setTime(inizio + 500);
        await io._pubblicitaPartita(ch, { started_at: new Date(inizio).toISOString(), duration_seconds: dura });
      }
      t.mock.timers.setTime(q);
      await io._giroPubblicita();
    }
    const torna = emessi.find((e) => e.prossima === nuova);
    assert.ok(torna, `${caso}: il conto della prossima e' arrivato in scena`);
    assert.ok(torna.t - fine <= 2 * P.GIRO_MS, `${caso}: entro due giri dalla fine, non ${(torna.t - fine) / 1000}s dopo`);
    t.mock.timers.reset();
  }
});

// ── Lo snooze ────────────────────────────────────────────────────────────

test('uno snooze si vede entro un giro, in tutti i cinque minuti che puo\' spostare', async (t) => {
  // Lo snooze sposta la pausa di cinque minuti senza nessun evento: lo dice
  // solo una lettura. Per ogni momento in cui lo si preme e ogni fase del giro.
  const P0 = ORA + 15 * MIN;
  for (const anticipo of [10, 7, 6, 5, 4, 3, 2, 1.5, 1, 0.5]) {
    for (let fase = 0; fase < P.GIRO_MS; fase += 5000) {
      const ch = `letture-d-${String(anticipo).replace('.', '_')}-${fase}`;
      t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
      canale(ch);
      const snooze = P0 - anticipo * MIN;
      const { io, emessi } = bot(ch, (q) => ({ next_ad_at: secondiUnix(q >= snooze ? P0 + P.SNOOZE_MS : P0), duration: 90 }));
      for (let q = ORA + fase; q < P0; q += P.GIRO_MS) { t.mock.timers.setTime(q); await io._giroPubblicita(); }
      const visto = emessi.find((e) => e.prossima === P0 + P.SNOOZE_MS);
      assert.ok(visto, `snooze ${anticipo} min prima, fase ${fase}: la scena non l'ha mai saputo`);
      if (anticipo * MIN <= P.SNOOZE_MS) {
        assert.ok(visto.t - snooze < P.GIRO_MS, `snooze ${anticipo} min prima, fase ${fase}: visto ${(visto.t - snooze) / 1000}s dopo, non entro un giro`);
      } else {
        // Piu' in la' lo corregge al piu' tardi la prima lettura nella finestra:
        // il conto sbagliato non entra mai negli ultimi cinque minuti.
        assert.ok(P0 - visto.t >= P.SNOOZE_MS + P.GIRO_MS, `snooze ${anticipo} min prima, fase ${fase}: il conto vecchio e' arrivato a ${(P0 - visto.t) / 1000}s`);
      }
      t.mock.timers.reset();
    }
  }
});

test('il preavviso che rilegge e trova lo snooze lo dice subito anche alla scena', async (t) => {
  for (const overlay of [true, false]) {
    const ch = overlay ? 'letture-e' : 'letture-e-spento';
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
    canale(ch, { chat: true, overlay });
    const P0 = ORA + 10 * MIN;
    let snooze = false;
    const { io, emessi, detti } = bot(ch, () => ({ next_ad_at: secondiUnix(snooze ? P0 + P.SNOOZE_MS : P0), duration: 90 }));
    await io._giroPubblicita();
    snooze = true;
    t.mock.timers.setTime(P0 - 60_000);
    await io._preavviso(ch);
    assert.deepEqual(detti, [], 'la pausa non e\' piu\' fra un minuto: in chat niente');
    if (overlay) {
      assert.deepEqual(emessi.at(-1), { t: P0 - 60_000, prossima: P0 + P.SNOOZE_MS, pausaFino: 0 }, 'e la scena lo sa adesso, non al giro dopo');
    } else {
      assert.deepEqual(emessi, [], 'col conto spento in scena non si manda niente');
    }
    t.mock.timers.reset();
  }
});

// ── Uno stato per canale ─────────────────────────────────────────────────

test('una lettura chiesta prima di una pausa, o piu\' vecchia di quella che si ha, non ci scrive sopra', () => {
  const programma = P.programmaDa({ next_ad_at: secondiUnix(ORA), duration: 90 });
  const inPausa = { ultimaPausa: String(ORA), finisceA: ORA + 90_000, prossima: 0, letto: ORA - 10_000 };
  assert.deepEqual(P.dopoLettura(inPausa, programma, { chiesto: ORA - 200, pausa: '' }), { applicata: false, falliti: 0, fallitoA: 0 },
    'chiesta prima della pausa: racconta il programma di prima, e la chiamata pero\' e\' andata');
  assert.equal(P.dopoLettura(inPausa, programma, { chiesto: ORA + 1000, pausa: String(ORA) }).applicata, true, 'chiesta durante la stessa pausa si');
  const letto = { prossima: ORA + 20 * MIN, letto: ORA };
  assert.equal(P.dopoLettura(letto, programma, { chiesto: ORA - 30_000 }).applicata, false, 'piu\' vecchia di quella che si ha: no');
  assert.equal(P.dopoLettura(letto, programma, { chiesto: ORA }).applicata, true, 'dello stesso istante si');
});

test('una pausa cominciata mentre si aspettava Twitch resta: in scena e in chat', async (t) => {
  // Il primo giro dopo un riavvio: lo stato del canale nasce in quel giro.
  const ch = 'letture-f';
  const inizio = ORA + 20 * MIN;
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: inizio - 200 });
  canale(ch, { chat: true, overlay: true, frasi: { 'pubblicita-parte': ['Pausa.'], 'pubblicita-dopo': ['Eccomi.'] } });
  let sblocca;
  const { io, detti } = bot(ch, () => new Promise((r) => { sblocca = () => r({ next_ad_at: secondiUnix(inizio), duration: 60 }); }));
  const giro = io._giroPubblicita();
  await flush();
  const stato = io._pub.get(ch);
  assert.ok(stato, 'lo stato e\' in memoria prima di aspettare Twitch');
  t.mock.timers.tick(500);
  await io._pubblicitaPartita(ch, { started_at: new Date(inizio).toISOString(), duration_seconds: 60 });
  sblocca();
  await giro;
  await flush();
  assert.equal(io._pub.get(ch), stato, 'il giro e l\'evento hanno toccato lo stesso stato');
  assert.equal(stato.ultimaPausa, String(inizio), 'la pausa c\'e\' ancora');
  assert.equal(stato.prossima, 0, 'la lettura chiesta prima della pausa non rimette in programma la pausa gia\' partita');
  assert.deepEqual(statoVivo.leggi(ch, 'pubblicita'), { prossima: 0, pausaFino: inizio + 60_000 }, 'la scena conta ancora il ritorno');
  // L'orologio finto si porta esattamente alla fine (adesso e' inizio + 300).
  t.mock.timers.tick(59_700);
  await flush();
  t.mock.timers.tick(30_000);
  await flush();
  assert.deepEqual(detti.map((d) => [d.t - inizio, d.testo]), [[300, 'Pausa.'], [60_000, 'Eccomi.']], 'e in chat il ritorno si dice, alla fine vera');
  // Chi cambia lo stato lo manda: la fine della pausa la scena la sa adesso,
  // senza aspettare un giro (nessun giro e' passato).
  assert.deepEqual(statoVivo.leggi(ch, 'pubblicita'), { prossima: 0, pausaFino: 0 }, 'e alla fine la scena lo sa senza aspettare il giro');
  t.mock.timers.reset();
});

test('due giri sovrapposti: la lettura piu\' vecchia non scrive sopra la piu\' nuova', async (t) => {
  const ch = 'letture-g';
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale(ch);
  const P0 = ORA + 3 * MIN;
  const lente = [];
  const { io, emessi } = bot(ch, (q) => (q === ORA
    ? new Promise((r) => lente.push(() => r({ next_ad_at: secondiUnix(P0), duration: 90 })))
    : { next_ad_at: secondiUnix(P0 + P.SNOOZE_MS), duration: 90 }));
  const primo = io._giroPubblicita();
  await flush();
  t.mock.timers.setTime(ORA + P.GIRO_MS);
  await io._giroPubblicita();
  lente.forEach((f) => f());
  await primo;
  assert.equal(io._pub.get(ch).prossima, P0 + P.SNOOZE_MS, 'resta lo snooze letto per ultimo');
  assert.equal(emessi.at(-1).prossima, P0 + P.SNOOZE_MS, 'e in scena pure');
  t.mock.timers.reset();
});

test('spento mentre si aspettava Twitch: lo stato non torna, e nessuna sveglia', async (t) => {
  const ch = 'letture-h';
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale(ch, { chat: true, overlay: false });
  let sblocca;
  const { io } = bot(ch, () => new Promise((r) => { sblocca = () => r({ next_ad_at: secondiUnix(ORA + 90_000), duration: 90 }); }));
  const giro = io._giroPubblicita();
  await flush();
  canale(ch, { chat: false, overlay: false });
  t.mock.timers.setTime(ORA + 1000);
  await io._giroPubblicita();
  sblocca();
  await giro;
  assert.equal(io._pub.has(ch), false, 'spento tutto, non resta niente');
  assert.equal(io._pubSveglie.size, 0, 'e la lettura arrivata dopo non punta un preavviso per una chat spenta');
  t.mock.timers.reset();
});
