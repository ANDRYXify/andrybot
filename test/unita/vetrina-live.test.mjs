// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI COMPARE SULLA HOME, E CHI NO.
//
// La fascia delle dirette mostra canali di altre persone su una pagina nostra.
// Le due cose che qui si tengono ferme non sono dettagli di resa: sono il
// permesso e il vuoto.
//
//  · Nessuno entra senza averlo detto. Se un giorno il filtro dell'interruttore
//    saltasse, ci ritroveremmo in vetrina i canali di tutti i clienti senza che
//    nessuno lo abbia chiesto, e non e' un difetto che si vede da fuori.
//  · Se non c'e' nessuno in onda la lista e' VUOTA, e la fascia non si disegna.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-vetrina-live-');
const { streamers } = await import('../../src/db.js');
const vetrina = await import('../../src/features/vetrina-live.js');

const crea = (login, { vetrinaLive = false, stato = 'approved', display = null } = {}) => {
  streamers.request(login, display || login, login);
  streamers.setStatus(login, stato);
  streamers.setSettings(login, { ...(streamers.get(login)?.settings || {}), vetrinaLive });
};

crea('andryxify', { vetrinaLive: true, display: 'ANDRYXify' });
crea('lucaplays', { vetrinaLive: true });
crea('zitto', { vetrinaLive: false });        // in onda ma non ha detto si'
crea('kick.giada', { vetrinaLive: true });

const LIVE = new Set(['andryxify', 'lucaplays', 'zitto', 'kick.giada']);
const inDiretta = (l) => LIVE.has(l);
const helixFinto = (streams) => ({ getStreams: async (logins) => streams.filter((s) => logins.includes(s.user_login)) });
const STREAMS = [
  { user_login: 'andryxify', title: 'Si costruisce il bot', game_name: 'Software and Game Development', viewer_count: 1312 },
  { user_login: 'lucaplays', title: 'Ranked', game_name: 'League of Legends', viewer_count: 87 },
  { user_login: 'zitto', title: 'Non dovrei essere qui', game_name: 'Just Chatting', viewer_count: 9000 },
];

let t = 1_000_000;
const giro = (opts = {}) => { t += vetrina.FRESCHEZZA_MS + 1; vetrina.scorda(); return vetrina.elenco({ ora: t, inDiretta, ...opts }); };

test('in vetrina ci va solo chi ha acceso l\'interruttore', async () => {
  const lista = await giro({ helix: helixFinto(STREAMS) });
  const logins = lista.map((d) => d.login);
  assert.ok(!logins.includes('zitto'), 'chi non ha detto si\' non compare, nemmeno se e\' il piu\' visto');
  assert.deepEqual(logins.sort(), ['andryxify', 'kick.giada', 'lucaplays']);
});

test('e solo chi e\' in onda adesso', async () => {
  LIVE.delete('lucaplays');
  const lista = await giro({ helix: helixFinto(STREAMS) });
  assert.ok(!lista.some((d) => d.login === 'lucaplays'));
  LIVE.add('lucaplays');
});

test('se non c\'e\' nessuno in onda la lista e\' vuota', async () => {
  const vuoti = await vetrina.elenco({ ora: (t += vetrina.FRESCHEZZA_MS + 1), inDiretta: () => false, helix: helixFinto(STREAMS) });
  assert.deepEqual(vuoti, [], 'e chi disegna la home non trova niente da disegnare');
});

test('davanti chi ha piu\' gente', async () => {
  const lista = await giro({ helix: helixFinto(STREAMS) });
  assert.equal(lista[0].login, 'andryxify');
  assert.equal(lista[0].spettatori, 1312);
  assert.equal(lista[0].categoria, 'Software and Game Development');
});

test('l\'indirizzo del canale segue la piattaforma', async () => {
  const lista = await giro({ helix: helixFinto(STREAMS) });
  const kick = lista.find((d) => d.login === 'kick.giada');
  assert.equal(kick.url, 'https://kick.com/giada');
  assert.equal(kick.piattaforma, 'kick');
  assert.equal(lista.find((d) => d.login === 'andryxify').url, 'https://www.twitch.tv/andryxify');
});

test('se la piattaforma non risponde le carte restano, senza contorno', async () => {
  const rotto = { getStreams: async () => { throw new Error('giu\''); } };
  const lista = await giro({ helix: rotto });
  assert.equal(lista.length, 3, 'la vetrina non sparisce perche\' un\'altra casa non risponde');
  assert.equal(lista[0].spettatori, 0);
  assert.equal(lista[0].titolo, '');
});

test('non si chiede il contorno a ogni visita', async () => {
  let chiamate = 0;
  const contato = { getStreams: async (l) => { chiamate++; return helixFinto(STREAMS).getStreams(l); } };
  await giro({ helix: contato });
  await vetrina.elenco({ ora: t + 1000, inDiretta, helix: contato });
  await vetrina.elenco({ ora: t + 2000, inDiretta, helix: contato });
  assert.equal(chiamate, 1, 'dentro al minuto vale la fotografia di prima');
});

// Kick nella vetrina: il contorno arriva dal giro di Kick (bot.js, kickVisto).
test('un canale in onda solo su Kick porta a Kick, col titolo e la categoria di li\'', async () => {
  const altrove = (l) => (l === 'lucaplays' ? { live: true, slug: 'luca_kick', titolo: 'Su Kick stasera', categoria: 'Fortnite', spettatori: 40 } : null);
  const senzaTwitch = STREAMS.filter((s) => s.user_login !== 'lucaplays');
  const luca = (await giro({ helix: helixFinto(senzaTwitch), altrove })).find((d) => d.login === 'lucaplays');
  assert.deepEqual([luca.piattaforma, luca.url, luca.titolo, luca.categoria, luca.spettatori], ['kick', 'https://kick.com/luca_kick', 'Su Kick stasera', 'Fortnite', 40]);
});

test('in onda su Twitch e su Kick: si va su Twitch, e chi guarda e\' la somma', async () => {
  const altrove = (l) => (l === 'lucaplays' ? { live: true, slug: 'luca_kick', titolo: 'Su Kick', categoria: 'Fortnite', spettatori: 40 } : null);
  const luca = (await giro({ helix: helixFinto(STREAMS), altrove })).find((d) => d.login === 'lucaplays');
  assert.deepEqual([luca.piattaforma, luca.url, luca.titolo, luca.spettatori], ['twitch', 'https://www.twitch.tv/lucaplays', 'Ranked', 127]);
});

test('quello che Kick ha visto fuori onda non entra nella carta', async () => {
  const altrove = () => ({ live: false, slug: 'x', titolo: 'vecchio', categoria: 'vecchia', spettatori: 999 });
  const luca = (await giro({ helix: helixFinto(STREAMS), altrove })).find((d) => d.login === 'lucaplays');
  assert.equal(luca.spettatori, 87);
});
