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

// ─────────────────────────────────────────── sola osservazione e «Blocca sempre»

test('in sola osservazione lo scudo scrive cosa farebbe, e la chat non la tocca', async () => {
  // Le modalita' della chat valgono per tutti quelli che scrivono: in sola
  // osservazione lo scudo non ne cambia nessuna, nemmeno salendo a «serrata».
  const ch = 'osserva1';
  streamers.upsertApproved(ch, 'Osserva', '95');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, aVuoto: true } });
  ab.azzeraStati();
  const toccato = [];
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async () => { toccato.push('follower'); return { ok: true }; },
    chatLenta: async () => { toccato.push('lenta'); return { ok: true }; },
    shieldMode: async () => { toccato.push('shield'); return { ok: true }; },
  } });
  await scudo._alza(ch, 'serrata', 'prova', scudo.cfg(ch));
  assert.deepEqual(toccato, [], 'nessuna modalita\' cambiata');
  const riga = ab.registro(ch).find((r) => r.azione === 'assetto');
  assert.ok(riga && riga.esito === 'a-vuoto', 'e nel registro c\'e\' cosa avrebbe fatto');
  assert.match(riga.motivo, /soli follower/);
});

test('«Blocca sempre» vale sempre con lo scudo acceso, anche con l\'elenco dei nomi da bot spento', async () => {
  const ch = 'sempre1';
  streamers.upsertApproved(ch, 'Sempre', '96');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, nomiBot: false, extra: ['disturbo_99'] } });
  ab.azzeraStati();
  const presi = [];
  const scudo = new ab.AntiBot({ helix: {
    bloccaUtente: async (_c, uid) => { presi.push(String(uid)); return { ok: true }; },
    timeoutUser: async (_c, uid) => { presi.push('ban:' + uid); return { ok: true }; },
    deleteMessage: async () => ({ ok: true }),
  } });
  await scudo.onFollow({ channel: ch, ts: Date.now(), data: { user_id: '777', user_login: 'disturbo_99' } });
  await scudo.onFollow({ channel: ch, ts: Date.now(), data: { user_id: '778', user_login: 'andrea_tv' } });
  for (let i = 0; i < 100 && ab.codaBan(ch).in_attesa; i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(presi.some((p) => p.endsWith('777')), 'chi e\' nella lista viene tolto');
  assert.ok(!presi.some((p) => p.endsWith('778')), 'chi non c\'e\' resta');
  assert.equal(ab.inBloccaSempre('Disturbo_99', { extra: ['disturbo_99'] }), true);
  assert.equal(ab.inBloccaSempre('disturbo_99', { extra: ['disturbo_99'], esenti: ['disturbo_99'] }), false, 'chi e\' fra gli esenti non si tocca');
  assert.equal(ab.inBloccaSempre('nightbot', { extra: ['nightbot'] }), false, 'i bot di servizio nemmeno');
});

test('l\'interruttore che nessuno leggeva non c\'e\' piu\'', () => {
  assert.equal('rafficaChiudiChat' in ab.ANTIBOT_DEFAULT, false, 'durante un\'ondata decide il livello, non un interruttore a parte');
});

test('ogni riga del registro dello scudo ha un nome nel pannello, nelle tre lingue', async () => {
  // Il registro scrive azioni ed esiti da piu' posti: lo scudo, l'esecutore,
  // la console. Il pannello li traduce con due elenchi: un'azione nuova senza
  // nome usciva come codice grezzo («limita», «a-vuoto»). Qui si prendono dal
  // codice tutte le azioni e gli esiti che finiscono nel registro, e si
  // pretende un nome per ciascuno.
  const { readFileSync } = await import('node:fs');
  const leggi = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
  const AB = leggi('src/features/antibot.js'), SRV = leggi('src/web/server.js'), APP = leggi('src/web/public/app.js');
  const { AZIONI } = await import('../../src/features/enforcement.js');
  const azioni = new Set(Object.values(AZIONI));
  for (const t of [AB, SRV]) {
    for (const m of t.matchAll(/registra(?:Antibot)?\([^)]*?azione: '([a-z-]+)'/g)) azioni.add(m[1]);
  }
  azioni.add('sbanna');
  const esiti = new Set(['fatto', 'fallito', 'a-vuoto']);
  for (const m of AB.matchAll(/registra\([^)]*?esito: '([a-z-]+)'/g)) esiti.add(m[1]);
  const corpo = (nome) => { const i = APP.indexOf(`function ${nome}(`); return APP.slice(i, APP.indexOf('\n}\n', i)); };
  const nomiAzioni = corpo('scudoAzioneTesto'), nomiEsiti = corpo('scudoEsito');
  const stringa = "'(?:[^'\\\\]|\\\\.)+'";
  for (const a of azioni) assert.match(nomiAzioni, new RegExp(`(^|\\s)'?${a}'?: L\\(${stringa}, ${stringa}, ${stringa}\\)`, 'm'), `l'azione «${a}» non ha un nome`);
  for (const e of esiti) assert.match(nomiEsiti, new RegExp(`'?${e}'?: \\['[a-z]*', L\\(`), `l'esito «${e}» non ha un nome`);
  assert.ok(!nomiAzioni.includes('chat-trattieni'), 'niente nomi per azioni che nessuno scrive');
});

test('dal registro si ricarica il registro, e un tasto rifiutato dice perche\'', async () => {
  const { readFileSync } = await import('node:fs');
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.ok(APP.includes("if (ris.closest('#scheda-registro')) caricaRegistro(); else caricaScudo();"), 'la lista che si aggiorna e\' quella dove hai premuto');
  assert.ok(SRV.includes("codice: 'permessi'") && APP.includes("e.dati?.codice === 'permessi'"), 'senza permessi lo dice, e dice dove riconcederli');
});

test('la pulizia dei follower blocca come lo scudo, e se ripiega sul ban lo dice', async () => {
  // «Banna» lasciava il follow: il numero restava gonfiato e la persona non
  // spariva dalla lista. Il tasto adesso passa dall'esecutore dello scudo: la
  // stessa fila, lo stesso registro, lo stesso ripiego sul ban.
  const { Esecutore, verdetto, AZIONI } = await import('../../src/features/enforcement.js');
  const fatte = [];
  const righe = [];
  const prova = async (blocco, ban) => {
    const e = new Esecutore({
      helix: {
        bloccaUtente: async () => { fatte.push('blocca'); return blocco; },
        timeoutUser: async (_c, _u, durata) => { fatte.push('ban' + durata); return ban; },
      },
      annota: (_c, riga) => righe.push(riga),
    });
    return e.esegui(verdetto({ canale: 'c', login: 'x', userId: '1', azione: AZIONI.BLOCCA, motivi: ['dalla console'], origine: 'console' }));
  };
  assert.equal((await prova({ ok: true }, { ok: true })).ok, true);
  assert.deepEqual(fatte.splice(0), ['blocca'], 'bloccato: niente ban in piu\'');
  const r = await prova({ ok: false, motivo: 'permesso mancante' }, { ok: true });
  assert.equal(r.ripiego, 'ban');
  assert.deepEqual(fatte.splice(0), ['blocca', 'ban0'], 'senza blocco un ban per sempre, non un timeout');
  assert.ok(righe.some((x) => x.motivo === 'dalla console' && /ripiego: ban/.test(x.risposta)), 'e il registro lo scrive');

  const { readFileSync } = await import('node:fs');
  const leggi = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
  const APP = leggi('src/web/public/app.js'), SRV = leggi('src/web/server.js'), AB = leggi('src/features/antibot.js');
  assert.match(AB, /export function bloccaDaConsole\([\s\S]*?esecutore\.esegui\(verdetto\(\{[^}]*azione: AZIONI\.BLOCCA/, 'la console chiede un blocco all\'esecutore');
  assert.ok(SRV.includes('await bloccaDaConsole(login, { login: nome, userId })'), 'e il tasto passa da li\'');
  assert.ok(APP.includes("data-scudo-blocca data-userid=") && APP.includes("azione: 'blocca' }"), 'il tasto chiede il blocco');
  assert.ok(!APP.includes('data-scudo-ban'), 'nessun tasto «Banna» rimasto');
  assert.ok(APP.includes("toast(r.ripiego === 'ban'"), 'il pannello dice se e\' stato un ban');
});
