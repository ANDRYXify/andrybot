// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PRENDERE DA STREAMELEMENTS SENZA CHIAVI (src/features/streamelements.js,
// docs/PONTE.md «Da StreamElements»), con uno StreamElements finto.
//
// Le promesse:
//  · il canale è quello della sessione: un canale omonimo legato a un altro
//    account Twitch non si legge, e dopo il no non parte nient'altro;
//  · i contatori che i comandi usano arrivano col loro numero;
//  · la classifica dei punti la chiede solo il proprietario, a pagine, una
//    chiamata per volta, e si ferma all'ultima pagina o al tetto;
//  · una pagina che non arriva ferma tutto e lo dice: mai mezza classifica;
//  · nessuna chiamata porta chiavi o cookie: solo indirizzi pubblici;
//  · quello che esce lo legge lo stesso lettore di un export incollato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { leggi, contatoriCitati, BASE } from '../../src/features/streamelements.js';
import { anteprima } from '../../src/features/importacomandi.js';

const ID = 'a'.repeat(24);
const CANALE = { _id: ID, username: 'canalese', displayName: 'CanaleSE', provider: 'twitch', providerId: '901' };
const COMANDI = [
  { command: 'morti', reply: 'morto ${count deaths} volte', accessLevel: 100, enabled: true },
  { command: 'conta', reply: 'siamo a ${count}', accessLevel: 500, enabled: true },
  { command: 'bin', reply: '${getcount binned}', accessLevel: 100, enabled: true },
];

// Uno StreamElements finto: risponde agli indirizzi pubblici, conta le
// chiamate e quante sono in volo insieme.
function finto({ canale = CANALE, utenti = 1500, rotta = null } = {}) {
  const chiamate = [];
  let inVolo = 0, maxInVolo = 0;
  const risposte = {
    [`/channels/canalese`]: canale,
    [`/bot/commands/${ID}/public`]: COMANDI,
    [`/bot/${ID}/counters/deaths`]: { id: 'deaths', count: 61 },
    [`/bot/${ID}/counters/conta`]: { id: 'conta', count: 3 },
    [`/bot/${ID}/counters/binned`]: { id: 'binned', count: 4 },
    [`/loyalty/${ID}`]: { loyalty: { name: 'gemme', enabled: true } },
  };
  const fetch = async (url, opz = {}) => {
    inVolo++; maxInVolo = Math.max(maxInVolo, inVolo);
    chiamate.push({ url, opz });
    await new Promise((ok) => setImmediate(ok));
    inVolo--;
    const via = url.slice(BASE.length);
    const json = (stato, dati) => ({ ok: stato < 300, status: stato, json: async () => dati });
    if (rotta && via.startsWith(rotta.via)) return json(rotta.stato, {});
    const p = /^\/points\/[a-f0-9]{24}\/top\?limit=(\d+)&offset=(\d+)$/.exec(via);
    if (p) {
      const [limite, da] = [Number(p[1]), Number(p[2])];
      const users = [];
      for (let i = da; i < Math.min(utenti, da + limite); i++) users.push({ username: `u${i}`, points: 10_000 - i });
      return json(200, { _total: utenti, users });
    }
    return via in risposte ? json(200, risposte[via]) : json(404, { statusCode: 404 });
  };
  return { fetch, chiamate, maxInVolo: () => maxInVolo };
}
const opz = (f, altro = {}) => ({ login: 'CanaleSE', twitchId: '901', fetch: f.fetch, dormi: async () => {}, ...altro });

test('il proprietario: comandi, contatori citati e la classifica a pagine, una chiamata per volta', async () => {
  const f = finto();
  const r = await leggi(opz(f, { punti: true }));
  assert.equal(r.errore, undefined);
  assert.deepEqual(r.conti, { comandi: 3, contatori: 3, punti: 1500, puntiTotali: 1500, nomePunti: 'gemme', puntiSpenti: false, puntiChiesti: true });
  assert.deepEqual(f.chiamate.filter((c) => c.url.includes('/points/')).map((c) => c.url.split('?')[1]), ['limit=1000&offset=0', 'limit=1000&offset=1000']);
  assert.equal(f.maxInVolo(), 1, 'mai due chiamate insieme');
  for (const c of f.chiamate) {
    assert.ok(c.url.startsWith(BASE + '/'), c.url);
    assert.deepEqual(Object.keys(c.opz.headers || {}), ['accept'], 'nessuna chiave, nessun cookie');
    assert.equal(c.opz.credentials, undefined);
  }
  // lo stesso lettore di un export incollato
  const a = anteprima(r.testo, { proprietario: { p: 'twitch', id: '901', login: 'canalese' } });
  assert.equal(a.formato, 'json');
  assert.deepEqual(a.contatori.voci.map((x) => [x.nome, x.valore]), [['deaths', 61], ['conta', 3], ['binned', 4]]);
  assert.equal(a.punti.letti, 1500);
  assert.deepEqual(a.buoni.find((x) => x.nome === 'conta').condizioni, { tier: 'mod' });
});

test('il tetto dei punti: si ferma lì, e dice quanti ce n\'erano', async () => {
  const f = finto({ utenti: 5000 });
  const r = await leggi(opz(f, { punti: true, maxPunti: 2000 }));
  assert.equal(r.conti.punti, 2000);
  assert.equal(r.conti.puntiTotali, 5000);
  assert.equal(f.chiamate.filter((c) => c.url.includes('/points/')).length, 2);
});

test('un moderatore: niente classifica, nemmeno chiesta', async () => {
  const f = finto();
  const r = await leggi(opz(f, { punti: false }));
  assert.equal(r.conti.punti, 0);
  assert.ok(!f.chiamate.some((c) => /\/points\/|\/loyalty\//.test(c.url)));
});

test('un canale omonimo di un altro account Twitch non si legge, e dopo il no non parte niente', async () => {
  for (const canale of [{ ...CANALE, providerId: '999' }, { ...CANALE, provider: 'youtube' }, { ...CANALE, _id: 'non-un-id' }]) {
    const f = finto({ canale });
    const r = await leggi(opz(f, { punti: true }));
    assert.equal(r.stato, 403);
    assert.match(r.errore, /non è legato al tuo account Twitch/);
    assert.equal(f.chiamate.length, 1);
  }
  const senzaId = finto();
  const r = await leggi(opz(senzaId, { twitchId: '' }));
  assert.equal(r.stato, 409, 'senza sapere chi sei, nessun canale è il tuo');
  assert.match(r.errore, /rientra con Twitch/, 'e si dice come rimediare');
  assert.equal(senzaId.chiamate.length, 0, 'senza chiedere niente a StreamElements');
});

test('canale che non c\'è, StreamElements giù, una pagina che manca: si dice, e niente a metà', async () => {
  const f = finto({ canale: null });
  const nessuno = await leggi({ ...opz(f), fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }) });
  assert.equal(nessuno.stato, 404);
  assert.match(nessuno.errore, /non c'è un canale «canalese»/);

  const lento = await leggi(opz(finto({ rotta: { via: `/bot/commands/`, stato: 429 } })));
  assert.match(lento.errore, /rallentare/);

  const meta = await leggi(opz(finto({ utenti: 5000, rotta: { via: `/points/${ID}/top?limit=1000&offset=2000`, stato: 500 } }), { punti: true }));
  assert.equal(meta.testo, undefined, 'mezza classifica non esce');
  assert.equal(meta.stato, 502);

  const giu = await leggi({ ...opz(finto()), fetch: async () => { throw new Error('rete'); } });
  assert.equal(giu.stato, 502);
  assert.equal((await leggi(opz(finto(), { login: 'no spazi!' }))).stato, 400);
});

test('i contatori citati: con nome, col punto, da soli (quello del comando), senza doppioni', () => {
  assert.deepEqual(contatoriCitati([
    { command: 'a', reply: '${count Deaths} ${getcount deaths} $(count.wins)' },
    { command: 'b', reply: 'siamo a ${count}' },
    { command: 'c d', reply: '${count}' },
    null, { reply: 7 },
  ]), ['Deaths', 'wins', 'b']);
});
