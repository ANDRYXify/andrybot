// CHI TOGLIE E RIMETTE IL FOLLOW NON E' UN FOLLOWER NUOVO.
//
// Il registro ricorda chi ha gia' seguito il canale. Qui si prova la regola
// (nuovo, ripetuto, ritorno), la semina da Twitch, e che nel bot il ripetuto si
// fermi prima di tutti mentre il ritorno cambia tipo prima di tutti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('seguiti-');
const { statoVivo, seguiti: store } = await import('../../src/db.js');
const S = await import('../../src/features/seguiti.js');
test.after(() => casa.pulisci());

const GIORNO = 24 * 3600 * 1000;
const T0 = Date.parse('2026-09-25T20:00:00Z');

test('il primo follow e\' nuovo, il secondo no, e dopo mesi e\' un ritorno', () => {
  assert.equal(S.classifica('c1', 'twitch', '111', T0), 'nuovo');
  assert.equal(S.classifica('c1', 'twitch', '111', T0 + 60_000), 'ripetuto', 'tolto e rimesso dopo un minuto');
  assert.equal(S.classifica('c1', 'twitch', '111', T0 + 30 * GIORNO), 'ripetuto', 'e dopo un mese');
  const lontano = T0 + 30 * GIORNO + S.RITORNO_GIORNI * GIORNO;
  assert.equal(S.classifica('c1', 'twitch', '111', lontano), 'ritorno', `dopo ${S.RITORNO_GIORNI} giorni senza follow e' un ritorno`);
  assert.equal(S.classifica('c1', 'twitch', '111', lontano + 60_000), 'ripetuto', 'e un minuto dopo di nuovo ripetuto: il ritorno si dice una volta');
  assert.equal(store.get('c1', 'twitch:111').volte, 5);
});

test('il registro e\' per canale e per piattaforma', () => {
  assert.equal(S.classifica('c2', 'twitch', '222', T0), 'nuovo');
  assert.equal(S.classifica('c3', 'twitch', '222', T0), 'nuovo', 'seguire un altro canale non conta');
  assert.equal(S.classifica('c2', 'kick', '222', T0), 'nuovo', 'ne\' seguire su un\'altra piattaforma');
  assert.equal(S.classifica('c2', 'twitch', '', T0), 'nuovo', 'senza chi, non c\'e\' niente da confrontare');
  assert.equal(S.classifica('c2', 'twitch', '', T0), 'nuovo');
});

test('la semina ricorda chi segue gia\', una volta, e riprova se Twitch non risponde', async () => {
  const pagine = [
    Object.assign([{ user_id: '301' }, { user_id: '302' }], { cursore: 'a', totale: 3 }),
    Object.assign([{ user_id: '303' }], { cursore: '', totale: 3 }),
  ];
  let chiamate = 0;
  const muto = { getRecentFollowers: async () => { chiamate++; return []; } };
  assert.deepEqual(await S.semina(muto, 'c4', { ora: T0, pausa: 0 }), { fatta: false, quanti: 0 }, 'un permesso che manca non e\' un canale senza follower');
  assert.equal(statoVivo.leggi('c4', 'seguiti-semina'), null, 'e non si segna fatta');

  const helix = { getRecentFollowers: async (_c, { dopo }) => { chiamate++; return dopo === 'a' ? pagine[1] : pagine[0]; } };
  assert.deepEqual(await S.semina(helix, 'c4', { ora: T0, pausa: 0 }), { fatta: true, quanti: 3 });
  assert.equal(S.classifica('c4', 'twitch', '302', T0 + GIORNO), 'ripetuto', 'chi seguiva gia\' non e\' nuovo');
  assert.equal(S.classifica('c4', 'twitch', '999', T0 + GIORNO), 'nuovo');
  const prima = chiamate;
  assert.deepEqual(await S.semina(helix, 'c4', { ora: T0, pausa: 0 }), { gia: true });
  assert.equal(chiamate, prima, 'fatta una volta, non si richiede');
});

test('nel bot il ripetuto si ferma prima di tutti, il ritorno cambia tipo prima di tutti', () => {
  // La regola sta all'ingresso degli eventi Twitch: avvisi, cervello, moduli,
  // muro, scudo e conti ascoltano 'channel.follow', e cosi' non vedono il
  // ripetuto senza doverlo sapere.
  const BOT = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  const i = BOT.indexOf('  _onTwitchEvent(ev) {');
  const corpo = BOT.slice(i, BOT.indexOf('\n  }\n', i));
  const regola = corpo.indexOf("if (type === 'channel.follow') {");
  assert.ok(regola > 0 && regola < corpo.lastIndexOf('this._dispatchEvent(ev);'), 'la regola viene prima della consegna');
  assert.match(corpo, /if \(come === 'ripetuto'\) \{ log\.debug\(.*\); return; \}/, 'il ripetuto non arriva a nessuno');
  assert.match(corpo, /if \(come === 'ritorno'\) \{ this\._dispatchEvent\(\{ \.\.\.ev, type: 'channel\.follow\.ritorno' \}\); return; \}/);
  const BRAIN = readFileSync(new URL('../../src/ai/brain.js', import.meta.url), 'utf8');
  assert.ok(BRAIN.includes("case 'channel.follow.ritorno': {"), 'il cervello dice bentornato');
  assert.ok(BOT.includes("if (ev.tipo === 'seguito' && seguitiFeat.classifica(ev.channel, ev.piattaforma || 'kick', ev.utente) !== 'nuovo') return;"), 'anche su Kick');
});

test('il rapporto della serata conta solo i follower nuovi', () => {
  const R = readFileSync(new URL('../../src/features/rapporto.js', import.meta.url), 'utf8');
  assert.ok(R.includes("if (tipo === 'channel.follow') out.follow++;"), 'un ritorno ha un altro tipo, e non entra nel conto');
});
