// LE MODALITA' DELLA CHAT A TEMPO: «solo emote per due minuti» vuol dire due
// minuti. Si prova con un Twitch finto (che ricorda com'e' la chat) e un
// orologio finto (che va avanti quando lo dice la prova). Il ragionamento sta
// in docs/MODALITA-CHAT.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('modalita-chat-');
const { streamers, points } = await import('../../src/db.js');
const M = await import('../../src/features/modalita-chat.js');
const games = await import('../../src/features/games.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');

function mondo({ chat = {}, falliscono = 0 } = {}) {
  const stato = { emote_mode: false, unique_chat_mode: false, subscriber_mode: false, ...chat };
  const cambi = [];
  const detti = [];
  let ora = T0;
  let seq = 0;
  const sveglie = new Map();
  let ko = falliscono;
  const helix = {
    leggiChat: async () => ({ ...stato }),
    impostaChat: async (_ch, campi) => {
      if (ko > 0 && Object.values(campi).includes(false)) { ko--; return { ok: false, motivo: 'errore Twitch' }; }
      Object.assign(stato, campi); cambi.push({ t: ora, ...campi }); return { ok: true };
    },
  };
  const orologio = () => ora;
  const timer = (fn, ms) => { const id = ++seq; sveglie.set(id, { fn, quando: ora + ms }); return id; };
  const annulla = (id) => sveglie.delete(id);
  const nuovo = () => new M.ModalitaChat({ helix, say: (_ch, t) => detti.push(t), orologio, timer, annulla });
  async function avanti(ms) {
    const fine = ora + ms;
    for (;;) {
      const prossima = [...sveglie.entries()].filter(([, s]) => s.quando <= fine).sort((a, b) => a[1].quando - b[1].quando)[0];
      if (!prossima) break;
      sveglie.delete(prossima[0]);
      ora = Math.max(ora, prossima[1].quando);
      await prossima[1].fn();
      await new Promise((r) => setImmediate(r));
    }
    ora = fine;
  }
  return { stato, cambi, detti, helix, nuovo, avanti, orologio, sveglie, dimentica: () => sveglie.clear() };
}

test('la durata si legge come la scrive una persona', () => {
  assert.equal(M.leggiDurata(''), 120, 'niente vuol dire due minuti');
  assert.equal(M.leggiDurata('5m'), 300);
  assert.equal(M.leggiDurata('90s'), 90);
  assert.equal(M.leggiDurata('10'), 600, 'un numero da solo sono minuti');
  assert.equal(M.leggiDurata('2 min'), 120);
  assert.equal(M.leggiDurata('30 secondi'), 30);
  assert.equal(M.leggiDurata('1h'), 3600);
  assert.equal(M.leggiDurata('1,5m'), 90);
  assert.equal(M.leggiDurata('boh'), null, 'una cosa che non e\' una durata si dice, non si indovina');
  assert.equal(M.leggiDurata('0'), M.DURATA_MIN);
  assert.equal(M.leggiDurata('5h'), M.DURATA_MAX);
  assert.equal(M.durataAParole(150), '2 minuti e 30 secondi');
  assert.equal(M.durataAParole(60), '1 minuto');
});

test('solo emote per due minuti: si accende, e dopo due minuti torna com\'era', async () => {
  const w = mondo();
  const m = w.nuovo();
  const r = await m.accendiPer('mizu1', 'emote');
  assert.equal(r.esito, 'acceso');
  assert.equal(w.stato.emote_mode, true);
  await w.avanti(119_000);
  assert.equal(w.stato.emote_mode, true, 'un secondo prima, ancora accesa');
  await w.avanti(1_000);
  assert.equal(w.stato.emote_mode, false);
  assert.deepEqual(w.cambi.map((c) => [c.t - T0, c.emote_mode]), [[0, true], [120_000, false]]);
  assert.match(w.detti[0], /solo emote per 2 minuti/);
  assert.match(w.detti[1], /chat di nuovo libera/);
  assert.deepEqual(m.attive('mizu1'), [], 'e non resta niente da fare');
});

test('se l\'aveva accesa un mod, non si tocca: né adesso né alla fine', async () => {
  const w = mondo({ chat: { emote_mode: true } });
  const m = w.nuovo();
  const r = await m.accendiPer('mizu2', 'emote', 60);
  assert.equal(r.esito, 'gia');
  await w.avanti(10 * 60_000);
  assert.deepEqual(w.cambi, [], 'spegnerla alla fine vorrebbe dire disfare la scelta di un altro');
  assert.equal(w.stato.emote_mode, true);
});

test('due sblocchi non si sommano a caso: vince la fine piu\' lontana', async () => {
  const w = mondo();
  const m = w.nuovo();
  await m.accendiPer('mizu3', 'emote', 120);
  await w.avanti(30_000);
  assert.equal((await m.accendiPer('mizu3', 'emote', 60)).fino, T0 + 120_000, 'uno piu\' corto non accorcia');
  assert.equal((await m.accendiPer('mizu3', 'emote', 300)).fino, T0 + 30_000 + 300_000, 'uno piu\' lungo allunga, non raddoppia');
  await w.avanti(299_000);
  assert.equal(w.stato.emote_mode, true);
  await w.avanti(1_000);
  assert.equal(w.stato.emote_mode, false);
  assert.equal(w.cambi.filter((c) => c.emote_mode === false).length, 1, 'e si spegne una volta sola');
});

test('un riavvio in mezzo non lascia la chat in solo emote per sempre', async () => {
  const w = mondo();
  await w.nuovo().accendiPer('mizu4', 'emote', 120);
  w.dimentica();
  await w.avanti(60_000);
  const dopo = w.nuovo();
  dopo.riprendi();
  await w.avanti(59_000);
  assert.equal(w.stato.emote_mode, true, 'riprende da dove era');
  await w.avanti(1_000);
  assert.equal(w.stato.emote_mode, false);
  // E se il bot resta spento oltre la fine, all'avvio la spegne subito.
  await w.nuovo().accendiPer('mizu5', 'unici', 60);
  w.dimentica();
  await w.avanti(10 * 60_000);
  assert.equal(w.stato.unique_chat_mode, true);
  w.nuovo().riprendi();
  await w.avanti(0);
  assert.equal(w.stato.unique_chat_mode, false);
});

test('se Twitch non risponde alla fine, si riprova invece di dimenticarsene', async () => {
  const w = mondo({ falliscono: 2 });
  const m = w.nuovo();
  await m.accendiPer('mizu6', 'emote', 60);
  await w.avanti(60_000);
  assert.equal(w.stato.emote_mode, true, 'primo tentativo fallito');
  assert.equal(m.attive('mizu6').length, 1, 'la riga resta');
  await w.avanti(60_000);
  assert.equal(w.stato.emote_mode, false, 'al terzo tentativo e\' spenta');
  assert.equal(m.attive('mizu6').length, 0);
});

test('le modalita\' a tempo e quelle dello scudo non si toccano', () => {
  const nostri = Object.values(M.MODI).map((m) => m.campo);
  assert.deepEqual(nostri.filter((c) => M.CAMPI_DELLO_SCUDO.includes(c)), []);
  const HELIX = readFileSync(new URL('../../src/twitch/helix.js', import.meta.url), 'utf8');
  for (const [fn, campo] of [['chatLenta', 'slow_mode'], ['chatSoloFollower', 'follower_mode']]) {
    const i = HELIX.indexOf(`async ${fn}(`);
    assert.ok(HELIX.slice(i, HELIX.indexOf('\n  }\n', i)).includes(campo), `${fn} usa ${campo}`);
    assert.ok(M.CAMPI_DELLO_SCUDO.includes(campo));
  }
});

test('i comandi dei mod: due minuti di serie, il tempo detto se c\'e\', off per finire', async () => {
  const w = mondo();
  const m = w.nuovo();
  const r = [];
  const say = (t) => r.push(t);
  assert.equal(await M.tryComando(m, { channel: 'mizu7', text: '!soloemote', isMod: false }, say), true);
  assert.equal(w.stato.emote_mode, false, 'chi non e\' mod non cambia la chat');
  await M.tryComando(m, { channel: 'mizu7', text: '!soloemote 5m', isMod: true }, say);
  assert.equal(m.attive('mizu7')[0].fino, T0 + 300_000);
  await M.tryComando(m, { channel: 'mizu7', text: '!soloemote boh', isMod: true }, say);
  assert.match(r.at(-1), /Si usa così/);
  await M.tryComando(m, { channel: 'mizu7', text: '!soloemote off', isMod: true }, say);
  assert.equal(w.stato.emote_mode, false);
  await M.tryComando(m, { channel: 'mizu7', text: '!messaggiunici', isBroadcaster: true }, say);
  assert.equal(m.attive('mizu7')[0].fino, T0 + 120_000);
  assert.equal(await M.tryComando(m, { channel: 'mizu7', text: '!dado' }, say), false, 'gli altri comandi non sono suoi');
});

test('un Modulo accende la modalita\' per il tempo che gli si dice, anche da $arg1', async () => {
  const w = mondo();
  const m = w.nuovo();
  const mod = new ModulesEngine({});
  mod.modalita = m;
  const ctx = { channel: 'mizu8', user: 'tizio', args: ['3m'], text: '!festa 3m' };
  await mod._eseguiAzione({ tipo: 'modalita', modo: 'emote', durata: '$arg1', annuncia: true }, ctx, () => {});
  assert.equal(m.attive('mizu8')[0].fino, T0 + 180_000);
  await mod._eseguiAzione({ tipo: 'modalita', modo: 'unici', durata: '' }, { ...ctx, args: [] }, () => {});
  assert.equal(m.attive('mizu8').find((x) => x.modo === 'unici').fino, T0 + 120_000, 'vuota: due minuti');
});

test('!sblocca: si paga solo se la chat cambia davvero', async () => {
  const w = mondo();
  const m = w.nuovo();
  games.impostaModalita(m);
  const ch = 'mizu9';
  streamers.upsertApproved(ch, ch);
  points.add(ch, 'ricco', 1000);
  const r = [];
  const scrivi = async (testo, user = 'ricco') => { games.tryGame({ channel: ch, user, text: testo }, (t) => r.push(t)); await new Promise((x) => setImmediate(x)); await new Promise((x) => setImmediate(x)); };
  await scrivi('!sblocca 3');
  assert.equal(points.get(ch, 'ricco'), 1000 - 3 * 50, 'tre minuti a cinquanta');
  assert.equal(m.attive(ch)[0].fino, T0 + 180_000);
  assert.match(r.at(-1), /ha sbloccato la chat solo emote per 3 minuti/);
  await scrivi('!sblocca');
  assert.match(r.at(-1), /si potrà sbloccare di nuovo/, 'il canale aspetta');
  assert.equal(points.get(ch, 'ricco'), 850);

  const w2 = mondo({ chat: { emote_mode: true } });
  games.impostaModalita(w2.nuovo());
  const ch2 = 'mizu10';
  streamers.upsertApproved(ch2, ch2);
  points.add(ch2, 'ricco', 1000);
  games.tryGame({ channel: ch2, user: 'ricco', text: '!sblocca 99' }, (t) => r.push(t));
  await new Promise((x) => setImmediate(x)); await new Promise((x) => setImmediate(x));
  assert.equal(points.get(ch2, 'ricco'), 1000, 'gia\' accesa da un mod: non costa niente');
  assert.match(r.at(-1), /già così/);
});
