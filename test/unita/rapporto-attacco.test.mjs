// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL RAPPORTO DI UN ATTACCO E GLI AVVISI DELLO SCUDO (docs/INCIDENTI.md, «Il
// rapporto dell'attacco» e «Gli avvisi»).
//
// Le promesse:
//  · l'attacco ricorda come e' andato: la scala dei livelli, i follow minuto
//    per minuto, i raid, il picco coi suoi segnali — e il picco SOLO SALE;
//  · il tipo si legge dai segnali: il gocciolamento e' «onda lenta», non piu'
//    un'ondata di follow qualunque;
//  · ogni riga del registro sa di quale attacco e';
//  · il rapporto e' uno, e lo leggono pannello, Telegram e mail;
//  · lo streamer viene avvisato dal livello che sceglie, una volta per gradino
//    per attacco, solo dove ha chiesto; il rapporto parte a fine attacco solo
//    per gli attacchi arrivati alla soglia;
//  · gli attacchi e il registro entrano nell'esportazione e se ne vanno con
//    l'account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('rapporto-attacco-');
const { streamers, tgConf, statoVivo } = await import('../../src/db.js');
const inc = await import('../../src/features/incidenti.js');
const ab = await import('../../src/features/antibot.js');
const R = await import('../../src/features/rapporto-attacco.js');
const S = await import('../../src/features/simulatore.js');
const { normalizzaAntibot } = await import('../../src/web/impostazioni-moderazione.js');
const { esporta } = await import('../../src/features/esporta.js');
const { cancella, restiDi } = await import('../../src/features/cancella.js');
const { BotManager } = await import('../../src/bot.js');
test.after(async () => { await ab.spegniScudo(); casa.pulisci(); });

let giro = 0;
const canale = () => `att${++giro}`;

// ── La memoria dell'attacco ─────────────────────────────────────────────────
test('il picco solo sale: un attacco ripreso piu\' in basso non abbassa il picco', () => {
  const ch = canale();
  inc.apri(ch, { tipo: 'ondata-follow', motivo: 'm', livello: 'serrata' });
  inc.segnaPicco(ch, { livello: 'serrata', punti: 90, segnali: { follow: 40, artificiale: true } });
  inc.chiudi(ch, 'fine');
  const i = inc.apri(ch, { tipo: 'ondata-follow', motivo: 'riprende', livello: 'osservo' });
  inc.segnaPicco(ch, { livello: 'osservo', punti: 20, segnali: { follow: 5 } });
  assert.equal(i.riaperture, 1, 'e\' lo stesso attacco');
  assert.equal(i.picco.livello, 'serrata');
  assert.equal(i.picco.punti, 90);
  assert.deepEqual(i.picco.segnali, { follow: 40, artificiale: true }, 'i segnali sono quelli del momento piu\' grave');
  inc.segnaPicco(ch, { livello: 'attacco', punti: 95, segnali: { coro: true } });
  assert.equal(i.picco.livello, 'serrata', 'un livello sotto il picco non lo cambia');
  assert.equal(i.picco.punti, 95, 'ma i punti piu\' alti si', );
});

test('la scala: ogni cambio, salite e discese, senza doppioni', () => {
  const ch = canale();
  const i = inc.apri(ch, { livello: 'allerta' });
  for (const l of ['allerta', 'attacco', 'attacco', 'serrata', 'difesa', 'calma']) inc.segnaLivello(ch, l);
  assert.deepEqual(i.livelli.map((x) => x.livello), ['allerta', 'attacco', 'serrata', 'difesa', 'calma']);
});

test('la curva: follow e tolti minuto per minuto, il minuto e\' quello dell\'evento', () => {
  const ch = canale();
  const i = inc.apri(ch, { livello: 'attacco' });
  const t0 = Date.UTC(2026, 9, 1, 21, 0, 10);
  inc.segnaFollow(ch, t0);
  inc.segnaFollow(ch, t0 + 20_000);
  inc.segnaFollow(ch, t0 + 61_000);
  inc.segnaAzione(ch, { azione: 'blocca', esito: 'fatto' });
  inc.segnaAzione(ch, { azione: 'blocca', esito: 'fallito' });
  inc.segnaAzione(ch, { azione: 'cancella', esito: 'fatto' });
  const m = Math.floor(t0 / 60000);
  assert.deepEqual(i.curva[m], [2, 0]);
  assert.deepEqual(i.curva[m + 1], [1, 0]);
  const tolti = Object.values(i.curva).reduce((a, v) => a + v[1], 0);
  assert.equal(tolti, 1, 'conta chi e\' stato tolto davvero, non i tentativi e non i messaggi');
  const sn = inc.sintesi(i);
  assert.equal(sn.follow, 3);
  assert.equal(sn.tolti, 1);
});

test('i raid, l\'avviso dato e il rapporto mandato restano nell\'attacco', () => {
  const ch = canale();
  const i = inc.apri(ch, { livello: 'attacco', motivo: 'perche\'' });
  inc.segnaRaid(ch, { da: 'Amica', quanti: 70 });
  inc.segnaAvvisato(ch, 'attacco');
  inc.segnaRapporto(i.id, 'telegram');
  assert.deepEqual(i.raid.map((r) => [r.da, r.quanti]), [['amica', 70]]);
  assert.equal(i.avvisato, 'attacco');
  assert.ok(i.rapporto.telegram > 0);
  assert.equal(inc.sintesi(i).motivo, 'perche\'');
  assert.equal(inc.sintesi(i).raid, 1);
});

test('il tipo si legge dai segnali, e il gocciolamento e\' un\'onda lenta', () => {
  assert.equal(ab.tipoDi('12/100 · 14 follow (soglia 20) · gocciolamento su dieci minuti', { follow: 14, ondaLenta: true, gruppo: true }), 'onda-lenta');
  assert.equal(ab.tipoDi('', { coro: true, follow: 3 }), 'coro');
  assert.equal(ab.tipoDi('', { follow: 30 }), 'ondata-follow');
  assert.equal(ab.tipoDi('44/100 · gocciolamento su dieci minuti'), 'onda-lenta', 'anche dal solo testo');
  assert.equal(ab.tipoDi('stesso messaggio da 6 account'), 'coro');
  assert.equal(ab.tipoDi(''), 'ignoto');
});

test('ogni riga del registro sa di quale attacco e\'', () => {
  const ch = canale();
  const fuori = ab.registra(ch, { azione: 'segnala', motivo: 'prima' });
  const i = inc.apri(ch, { livello: 'attacco' });
  const dentro = ab.registra(ch, { azione: 'blocca', login: 'x', motivo: 'm' });
  const detto = ab.registra(ch, { azione: 'blocca', login: 'y', motivo: 'm', incidente: 'INC-ALTRO' });
  assert.equal(fuori.incidente, undefined);
  assert.equal(dentro.incidente, i.id);
  assert.equal(detto.incidente, 'INC-ALTRO', 'chi lo sa (l\'esecutore) lo dice, e vale il suo');
  assert.deepEqual(ab.registroDi(ch, i.id).map((v) => v.login), ['x']);
});

// ── Tre attacchi veri, giocati dal simulatore ───────────────────────────────
for (const [nome, tipo] of [['ondata-veloce', 'ondata-follow'], ['ondata-lenta', 'onda-lenta'], ['coro', 'coro']]) {
  test(`un attacco intero (${nome}): tipo, scala, picco coi segnali, curva`, async () => {
    const ch = `sim-${nome}`;
    streamers.upsertApproved(ch, ch, '1');
    streamers.setEnabled(ch, true);
    streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
    await S.gioca(S.scenario(nome), { canale: ch });
    const i = inc.aperto(ch) || inc.ultimoDi(ch);
    assert.ok(i, 'l\'attacco c\'e\'');
    assert.equal(i.tipo, tipo);
    assert.ok(i.livelli.length >= 1 && i.livelli[0].livello === i.livelli[0].livello);
    assert.ok(i.picco.punti > 0 && i.picco.segnali, 'il picco sa perche\'');
    if (tipo !== 'coro') assert.ok(Object.keys(i.curva).length >= 1, 'i follow sono nella curva');
    const r = R.rapportoAttacco(i, { registro: ab.registroDi(ch, i.id) });
    assert.ok(r.numeri.righe > 0, 'le righe del registro sono sue');
    assert.ok(R.racconto(r, 'it').length >= 1);
  });
}

// ── Il rapporto ─────────────────────────────────────────────────────────────
function attaccoFinto() {
  const a = Date.UTC(2026, 9, 1, 21, 0, 0);
  const m = a / 60000;
  return {
    id: 'INC-2026-000777', canale: 'casa', tipo: 'ondata-follow', motivo: '80/100 · 50 follow',
    aperto: a, chiuso: a + 10 * 60000, riaperture: 0,
    picco: { livello: 'serrata', ts: a + 60000, quanti: 0, punti: 80, segnali: { follow: 50 } },
    livelli: [{ ts: a, livello: 'allerta' }, { ts: a + 60000, livello: 'serrata' }, { ts: a + 8 * 60000, livello: 'calma' }],
    curva: { [m]: [10, 0], [m + 3]: [5, 4] },
    raid: [{ ts: a + 5 * 60000, da: 'amica', quanti: 70 }],
    coinvolti: {
      bot1: { giudizio: 'certo', punti: 8, ts: a + 1000, userId: '1' },
      vera: { giudizio: 'legittimo', punti: 0, ts: a + 500, userId: '2' },
      forse: { giudizio: 'sospetto', punti: 5, ts: a + 700, userId: '3' },
      '=cmd': { giudizio: 'certo', punti: 9, ts: a + 2000, userId: '4' },
    },
    azioni: { blocca: { fatte: 4, fallite: 1, aVuoto: 0 }, cancella: { fatte: 2, fallite: 0, aVuoto: 0 } },
    timeline: [{ ts: a, cosa: 'aperto: 80/100' }], taciuti: 7,
  };
}

test('la curva e\' continua: i minuti vuoti valgono zero, e oltre le dodici ore si raggruppa', () => {
  const i = attaccoFinto();
  const c = R.curvaDi(i);
  assert.equal(c.passo, 1);
  assert.equal(c.punti.length, 11, 'dall\'apertura alla chiusura, minuto per minuto');
  assert.deepEqual(c.punti.slice(0, 4).map((p) => [p.follow, p.tolti]), [[10, 0], [0, 0], [0, 0], [5, 4]]);
  const lungo = { ...i, chiuso: i.aperto + 24 * 3600_000 };
  const cl = R.curvaDi(lungo);
  assert.ok(cl.passo > 1 && cl.punti.length <= 720, 'un attacco di un giorno non diventa 1440 barre');
  assert.equal(cl.punti.reduce((a, p) => a + p.follow, 0), 15, 'raggruppando non si perde niente');
});

test('il rapporto: scala con le durate, coinvolti in ordine con quello che gli e\' stato fatto, numeri', () => {
  const i = attaccoFinto();
  const reg = [
    { login: 'bot1', azione: 'blocca', esito: 'fallito', ts: i.aperto + 2000 },
    { login: 'bot1', azione: 'blocca', esito: 'fatto', ts: i.aperto + 3000 },
    { login: 'bot1', azione: 'cancella', esito: 'fatto', ts: i.aperto + 4000 },
    { login: 'forse', azione: 'segnala', esito: 'avviso', ts: i.aperto + 4000 },
  ];
  const r = R.rapportoAttacco(i, { registro: reg });
  assert.deepEqual(r.scala.map((g) => [g.livello, g.durata]), [['allerta', 60], ['serrata', 420], ['calma', 120]]);
  assert.deepEqual(r.coinvolti.map((c) => c.login), ['bot1', '=cmd', 'forse', 'vera'], 'certi, sospetti, persone vere; dentro, prima chi e\' arrivato prima');
  assert.deepEqual(r.coinvolti[0].fatto, { azione: 'blocca', esito: 'fatto', ts: i.aperto + 3000 }, 'conta l\'azione piu\' forte, e l\'ultima');
  assert.equal(r.coinvolti[2].fatto, null, 'una segnalazione non e\' un\'azione');
  assert.equal(r.numeri.follow, 15);
  assert.equal(r.numeri.tolti, 4);
  assert.equal(r.numeri.falliti, 1);
  assert.equal(r.numeri.certo, 2);
  assert.equal(r.numeri.taciuti, 7);
  assert.equal(r.inCorso, false);
  assert.equal(r.durata, 600);
});

test('il racconto c\'e\' nelle tre lingue, senza HTML, e l\'avviso disinnesca il motivo', () => {
  const r = R.rapportoAttacco(attaccoFinto());
  for (const l of ['it', 'en', 'es']) {
    const f = R.racconto(r, l);
    assert.ok(f.length >= 4, l);
    assert.ok(f.every((x) => !/[<>]/.test(x)), `${l}: niente HTML nelle frasi`);
  }
  assert.match(R.racconto(r, 'en')[0], /Follow wave: it lasted 10 minutes, up to “shuttered”\./);
  const t = R.testoAvviso({ livello: 'attacco', motivo: '<script>x</script>' }, { lingua: 'it', link: 'https://s/#attacchi' });
  assert.ok(!t.includes('<script>') && t.includes('&lt;script&gt;'));
  assert.match(t, /Scudo alzato: sotto attacco/);
  assert.match(R.testoAvviso({ tipo: 'raid', quanti: 80, da: 'a<b' }, { lingua: 'es' }), /Raid de 80 espectadores<\/b> de a&lt;b/);
  assert.match(R.testoRapporto(r, { lingua: 'it', link: 'L' }), /^🛡️ <b>Rapporto dell’attacco<\/b>\n/);
});

test('il CSV dei coinvolti non diventa un comando aprendolo', () => {
  const csv = R.csvCoinvolti(R.rapportoAttacco(attaccoFinto()));
  assert.ok(csv.startsWith('login,user_id,giudizio,punti,quando,azione,esito\n'));
  assert.ok(csv.includes("\n'=cmd,4,certo,"), 'il segno di formula si disinnesca');
});

// ── Quando avvisare ─────────────────────────────────────────────────────────
test('si avvisa dalla soglia in su, una volta per gradino, e il rapporto solo per gli attacchi alla soglia', () => {
  assert.equal(R.devoAvvisare({ livello: 'allerta' }), false, 'di serie da «sotto attacco»');
  assert.equal(R.devoAvvisare({ livello: 'attacco' }), true);
  assert.equal(R.devoAvvisare({ livello: 'attacco', giaAvvisato: 'attacco' }), false, 'stesso gradino: gia\' detto');
  assert.equal(R.devoAvvisare({ livello: 'serrata', giaAvvisato: 'attacco' }), true, 'gradino piu\' alto: si dice');
  assert.equal(R.devoAvvisare({ livello: 'attacco', giaAvvisato: 'serrata' }), false, 'riscendere non e\' una notizia');
  assert.equal(R.devoAvvisare({ livello: 'allerta', soglia: 'osservo' }), true);
  assert.equal(R.meritaRapporto({ picco: { livello: 'difesa' } }), false);
  assert.equal(R.meritaRapporto({ picco: { livello: 'serrata' } }), true);
  assert.equal(R.meritaRapporto({ picco: { livello: 'difesa' } }, 'difesa'), true);
});

test('le scelte di avviso: di serie, una soglia storta non passa, e un salvataggio a meta\' non cancella il resto', () => {
  assert.deepEqual(R.avvisiDi({}), { soglia: 'attacco', telegram: true, mail: false, rapportoTelegram: true, rapportoMail: true, raid: true });
  assert.equal(R.avvisiDi({ avvisiScudo: { soglia: 'calma' } }).soglia, 'attacco', '«calma» vorrebbe dire avvisare sempre');
  assert.equal(R.avvisiDi({ avvisiScudo: { soglia: 'boh' } }).soglia, 'attacco');
  assert.equal(R.avvisiDi({ avvisiScudo: { telegram: 'false', raid: 1 } }).telegram, false, 'si accende solo con un si\' vero, non con una parola');
  assert.equal(R.avvisiDi({ avvisiScudo: { raid: 1 } }).raid, false);
  const n = normalizzaAntibot({ attivo: true, avvisiScudo: { mail: true, soglia: 'serrata' } }, { avvisiScudo: { telegram: false } });
  assert.deepEqual(n.avvisiScudo, { soglia: 'serrata', telegram: false, mail: true, rapportoTelegram: true, rapportoMail: true, raid: true });
  assert.equal(normalizzaAntibot({ avvisiScudo: { raid: false } }, { modo: 'prudente' }).avvisiScudo.raid, false, 'salvare lo scudo non tocca gli avvisi');
});

// ── Il bot che avvisa, su un Telegram finto ─────────────────────────────────
const mandati = [];
const vero = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.telegram.org/')) {
    let campi = {};
    try { campi = JSON.parse(opts.body); } catch { /* */ }
    mandati.push({ metodo: u.split('/').pop(), campi });
    return new Response(JSON.stringify({ ok: true, result: { message_id: mandati.length } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('', { status: 404 });
};
test.after(() => { globalThis.fetch = vero; });

function botCon(ch, avvisiScudo = {}, { privato = true } = {}) {
  streamers.upsertApproved(ch, ch.toUpperCase());
  streamers.setSettings(ch, { antibot: { attivo: true, avvisiScudo } });
  tgConf.set(ch, { token: '1:tok', attivo: true });
  if (privato) tgConf.setOwnerTg(ch, '555', 'Io');
  const b = Object.create(BotManager.prototype);
  b.antibot = { cfg: (c) => ({ ...ab.ANTIBOT_DEFAULT, ...(streamers.get(c)?.settings?.antibot || {}) }) };
  return b;
}
const privatoDi = (ch) => !!tgConf.get(ch)?.owner_tg_id;

test('il bot avvisa in privato dalla soglia, una volta per gradino, e il raid a parte', async (t) => {
  const ch = canale();
  const b = botCon(ch);
  assert.ok(privatoDi(ch), 'la chat privata del proprietario e\' collegata');
  inc.apri(ch, { livello: 'allerta' });
  mandati.length = 0;
  await b._avvisoScudo(ch, { tipo: 'antibot', livello: 'allerta', motivo: 'm' });
  assert.equal(mandati.length, 0, 'sotto la soglia non si bussa');
  await b._avvisoScudo(ch, { tipo: 'antibot', livello: 'attacco', motivo: 'ondata' });
  await b._avvisoScudo(ch, { tipo: 'antibot', livello: 'attacco', motivo: 'ondata' });
  assert.equal(mandati.length, 1, 'una volta sola per gradino');
  assert.equal(mandati[0].campi.chat_id, '555');
  assert.match(mandati[0].campi.text, /Scudo alzato/);
  assert.match(mandati[0].campi.text, /#attacchi/);
  await b._avvisoScudo(ch, { tipo: 'antibot', livello: 'serrata', motivo: 'ondata' });
  assert.equal(mandati.length, 2, 'il gradino sopra si dice');
  await b._avvisoScudo(ch, { tipo: 'raid', quanti: 90, da: 'amica' });
  assert.equal(mandati.length, 3, 'il raid grande si dice');
  streamers.setSettings(ch, { antibot: { attivo: true, avvisiScudo: { raid: false } } });
  await b._avvisoScudo(ch, { tipo: 'raid', quanti: 90, da: 'amica' });
  assert.equal(mandati.length, 3, 'il raid spento non si dice, anche con Telegram acceso');
  streamers.setSettings(ch, { antibot: { attivo: true, avvisiScudo: { telegram: false } } });
  inc.chiudi(ch); inc.apri(ch, { livello: 'serrata' });
  await b._avvisoScudo(ch, { tipo: 'antibot', livello: 'serrata' });
  assert.equal(mandati.length, 3, 'spento, non parte niente');
});

test('il rapporto parte a fine attacco solo se l\'attacco e\' arrivato alla soglia, e si segna', async (t) => {
  const ch = canale();
  const b = botCon(ch);
  assert.ok(privatoDi(ch), 'la chat privata del proprietario e\' collegata');
  const piccolo = inc.apri(ch, { livello: 'osservo' }); inc.segnaPicco(ch, { livello: 'osservo' }); inc.chiudi(ch);
  mandati.length = 0;
  await b._rapportoAttacco(ch, piccolo.id);
  assert.equal(mandati.length, 0, 'un «sto guardando» non merita un messaggio');
  const ch2 = canale();
  const b2 = botCon(ch2);
  const grande = inc.apri(ch2, { livello: 'attacco' }); inc.segnaPicco(ch2, { livello: 'serrata' }); inc.chiudi(ch2);
  await b2._rapportoAttacco(ch2, grande.id);
  assert.equal(mandati.length, 1);
  assert.match(mandati[0].campi.text, /Rapporto dell’attacco/);
  assert.ok(inc.uno(grande.id).rapporto?.telegram > 0, 'il pannello sa che e\' partito');
});

// ── I dati del canale ───────────────────────────────────────────────────────
test('gli attacchi e il registro si esportano, e se ne vanno con l\'account', () => {
  const ch = canale();
  streamers.upsertApproved(ch, ch.toUpperCase());
  inc.apri(ch, { livello: 'attacco' });
  ab.registra(ch, { azione: 'blocca', login: 'bot', motivo: 'm' });
  inc.chiudi(ch);
  const e = esporta(ch);
  assert.equal(e.dati.attacchi?.length, 1);
  assert.equal(e.dati.registro_scudo?.length, 1);
  assert.equal(restiDi(ch).righe.attacchi, 1);
  const c = cancella(ch, { conferma: ch });
  assert.equal(c.righe.attacchi, 1);
  assert.equal(c.righe.registro_scudo, 1);
  assert.equal(inc.diCanale(ch).length, 0);
  assert.equal(ab.registro(ch).length, 0);
  assert.equal(restiDi(ch).righe.attacchi, undefined);
  assert.ok(statoVivo, 'il resto del canale lo prova cancella.test.mjs');
});
