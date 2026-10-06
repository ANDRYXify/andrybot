// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL PLAYER DELL'OVERLAY NON SI BLOCCA (features/musica-overlay.js,
// features/spotify.js; docs/OVERLAY.md, «Il player non si blocca»).
//
//  · quello che si risponde vale per adesso: la barra non torna indietro, ne'
//    dalla cache ne' quando Spotify non risponde;
//  · una lettura alla volta, e a canzone finita si chiede subito la prossima;
//  · il battito non ritarda il brano;
//  · verso Spotify niente aspetta per sempre e niente insiste: tempo limite,
//    pausa sui 429 per app, un rinnovo del token alla volta, il battito non
//    richiesto a un'app che non puo' leggerlo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('musica-overlay-');
const { spotifyTokens } = await import('../../src/db.js');
const MO = await import('../../src/features/musica-overlay.js');
const S = await import('../../src/features/spotify.js');
test.after(() => casa.pulisci());

const T0 = 1_800_000_000_000;
const BRANO = { stato: 'suona', suona: true, id: 'b1', nome: 'Uno', ms: 60_000, durata: 200_000 };

function mondo({ battito = async () => null } = {}) {
  let ora = T0;
  const chiamate = [];
  let risposta = BRANO;
  let attese = [];
  const spotify = {
    collegato: () => true,
    oraSuona: async () => { chiamate.push(ora); const r = typeof risposta === 'function' ? risposta() : risposta; return r instanceof Promise ? r : { ...r }; },
    battito,
  };
  const attesa = (ms) => new Promise((r) => attese.push({ fino: ora + ms, r }));
  const l = MO.lettore({ spotify, orologio: () => ora, attesa });
  return {
    l, chiamate,
    dici: (r) => { risposta = r; },
    avanti: async (ms) => { ora += ms; for (const a of attese.filter((x) => x.fino <= ora)) a.r(); attese = attese.filter((x) => x.fino > ora); await new Promise((r) => setImmediate(r)); },
  };
}

test('dalla cache la barra va avanti, non torna indietro', async () => {
  const w = mondo();
  assert.equal((await w.l.musica('a')).ms, 60_000);
  await w.avanti(3000);
  const d = await w.l.musica('a');
  assert.equal(d.ms, 63_000, 'tre secondi dopo, tre secondi piu\' avanti');
  assert.equal(w.chiamate.length, 1, 'e senza chiedere di nuovo a Spotify');
});

test('quando Spotify non risponde, l\'ultima lettura buona vale per adesso, fino alla fine del brano', async () => {
  const w = mondo();
  await w.l.musica('a');
  w.dici({ stato: 'ignoto', suona: false });
  await w.avanti(30_000);
  assert.equal((await w.l.musica('a')).ms, 90_000, 'trenta secondi dopo: 1:30, non di nuovo 1:00');
  await w.avanti(29_000);
  const d = await w.l.musica('a');
  assert.equal(d.nome, 'Uno');
  assert.ok(d.ms <= BRANO.durata, 'mai oltre la sua fine');
  await w.avanti(60_000);
  assert.equal((await w.l.musica('a')).stato, 'ignoto', 'dopo un minuto senza letture buone non lo sappiamo: lo dice');
});

test('una lettura alla volta: dieci sorgenti che chiedono insieme fanno una chiamata', async () => {
  let libera;
  const w = mondo();
  w.dici(() => new Promise((r) => { libera = () => r({ ...BRANO }); }));
  const tutte = Promise.all(Array.from({ length: 10 }, () => w.l.musica('a')));
  await new Promise((r) => setImmediate(r));
  libera();
  const r = await tutte;
  assert.equal(w.chiamate.length, 1);
  assert.ok(r.every((x) => x.nome === 'Uno'));
});

test('a canzone finita si chiede subito la prossima, senza aspettare la cache', async () => {
  const w = mondo();
  w.dici({ ...BRANO, ms: 198_500 });
  await w.l.musica('a');
  w.dici({ ...BRANO, id: 'b2', nome: 'Due', ms: 500 });
  await w.avanti(2000);
  assert.equal((await w.l.musica('a')).nome, 'Due', 'la cache diceva un brano finito: non vale');
  assert.equal(w.chiamate.length, 2);
});

test('il battito non ritarda il brano: si aspetta un attimo, poi si risponde senza', async () => {
  let dai;
  const w = mondo({ battito: () => new Promise((r) => { dai = r; }) });
  const p = w.l.musica('a');
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  await w.avanti(MO.BATTITO_MS);
  const d = await p;
  assert.equal(d.nome, 'Uno');
  assert.equal(d.bpm, undefined);
  dai({ bpm: 120, energia: 0.6 });
  const v = mondo({ battito: async () => ({ bpm: 128, energia: 0.8 }) });
  assert.equal((await v.l.musica('a')).bpm, 128, 'se arriva in tempo, c\'e\'');
});

// ── verso Spotify ─────────────────────────────────────────────────────────

let n = 0;
function canale() {
  const login = 'spot' + (++n);
  S.salvaConfig(login, 'app-' + n, 'segreto');
  spotifyTokens.set(login, { access: 'tok', refresh: 'rin', scadenza: Date.now() + 3_600_000 });
  return login;
}
const brano = { item: { id: 'x', name: 'Uno', artists: [{ name: 'A' }], album: { name: 'B', images: [] }, duration_ms: 200_000 }, progress_ms: 1000, is_playing: true };
const risposta = (status, corpo, testate = {}) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => testate[k.toLowerCase()] ?? null }, json: async () => corpo });
const fetchVero = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = fetchVero; S._prove({ tempoMax: 6000, orologio: () => Date.now(), azzera: true }); });

test('un 429 si rispetta: per il tempo che dice Spotify non si chiama piu\', per tutti i canali di quell\'app', async () => {
  let ora = Date.now();
  S._prove({ orologio: () => ora, azzera: true });
  const login = canale();
  const chiamate = [];
  globalThis.fetch = async (url) => { chiamate.push(url); return risposta(429, {}, { 'retry-after': '20' }); };
  assert.equal((await S.oraSuona(login)).stato, 'ignoto', 'un 429 non vuol dire «non c\'e\' musica»');
  ora += 19_000;
  assert.equal((await S.oraSuona(login)).stato, 'ignoto');
  assert.equal(chiamate.length, 1, 'durante la pausa Spotify non si chiama');
  globalThis.fetch = async (url) => { chiamate.push(url); return risposta(200, brano); };
  ora += 2000;
  assert.equal((await S.oraSuona(login)).stato, 'suona', 'finita la pausa si torna a chiedere');
});

test('una risposta appesa scade: niente aspetta per sempre', async () => {
  S._prove({ tempoMax: 80, azzera: true });
  const login = canale();
  globalThis.fetch = (_url, o) => new Promise((_, rifiuta) => o?.signal?.addEventListener('abort', () => rifiuta(new Error('scaduta'))));
  // il tempo limite di AbortSignal non tiene vivo il processo (nel server lo
  // tiene vivo il server): qui lo tiene vivo la prova
  const vivo = setTimeout(() => {}, 5000);
  const t = Date.now();
  assert.equal((await S.oraSuona(login)).stato, 'ignoto');
  clearTimeout(vivo);
  assert.ok(Date.now() - t < 2000, `tornata in ${Date.now() - t} ms`);
});

test('anche un rinnovo del token appeso scade', async () => {
  S._prove({ tempoMax: 80, azzera: true });
  const login = canale();
  spotifyTokens.set(login, { access: 'vecchio', refresh: 'rin', scadenza: Date.now() - 1000 });
  globalThis.fetch = (_url, o) => new Promise((_, rifiuta) => o?.signal?.addEventListener('abort', () => rifiuta(new Error('scaduta'))));
  const vivo = setTimeout(() => {}, 5000);
  const t = Date.now();
  assert.equal((await S.oraSuona(login)).stato, 'ignoto');
  clearTimeout(vivo);
  assert.ok(Date.now() - t < 2000, `tornata in ${Date.now() - t} ms`);
});

test('il token si rinnova una volta: due letture insieme non fanno due rinnovi', async () => {
  S._prove({ azzera: true });
  const login = canale();
  spotifyTokens.set(login, { access: 'vecchio', refresh: 'rin', scadenza: Date.now() - 1000 });
  let rinnovi = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/token')) { rinnovi++; await new Promise((r) => setTimeout(r, 20)); return risposta(200, { access_token: 'nuovo', expires_in: 3600, refresh_token: 'rin2' }); }
    return risposta(200, brano);
  };
  const [a, b] = await Promise.all([S.oraSuona(login), S.oraSuona(login)]);
  assert.equal(rinnovi, 1);
  assert.equal(a.stato, 'suona');
  assert.equal(b.stato, 'suona');
  assert.equal(spotifyTokens.get(login).refresh, 'rin2', 'e il token di rinnovo nuovo si tiene');
});

test('il battito: un 403 vale per l\'app e non si richiede; un intoppo non toglie il battito per sempre', async () => {
  S._prove({ azzera: true });
  const login = canale();
  const chiamate = [];
  globalThis.fetch = async (url) => { chiamate.push(url); return risposta(403, { error: 'no' }); };
  assert.equal(await S.battito(login, 'x1'), null);
  assert.equal(await S.battito(login, 'x2'), null);
  assert.equal(chiamate.length, 1, 'un\'app che non puo\' leggere il battito non lo chiede a ogni canzone');
  const altro = canale();
  globalThis.fetch = async () => { throw new Error('rete'); };
  assert.equal(await S.battito(altro, 'y'), null);
  globalThis.fetch = async () => risposta(200, { tempo: 121.4, energy: 0.7 });
  assert.deepEqual(await S.battito(altro, 'y'), { bpm: 121, energia: 0.7 }, 'dopo l\'intoppo il battito arriva');
});
