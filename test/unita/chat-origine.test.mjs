// DA DOVE ARRIVA UN MESSAGGIO DI CHAT.
//
// Chi trasmette su due piattaforme ha due chat che finiscono nello stesso
// riquadro. Se l'origine non viaggia CON il messaggio, dentro al riquadro le
// due chat diventano la stessa cosa, e da li' in poi non c'e' impostazione che
// possa dividerle: e' un dato perso, non una funzione mancante. Percio' qui si
// fissa che l'origine sia un campo dell'evento, e che un messaggio che non la
// dichiara valga «twitch» — i canali nati quando Twitch era l'unica non devono
// cambiare comportamento di una virgola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-chat-origine-');
const { streamers } = await import('../../src/db.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const { normChatStile } = await import('../../src/web/stile.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');
streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), chatOverlay: { attivo: true, max: 8 } });

const mandati = [];
const motore = new AlertsEngine({ effects: { emit: (ch, p) => mandati.push(p), hasClients: () => true } });
const ultimo = (tipo) => [...mandati].reverse().find((x) => x.tipo === tipo);

test('la riga che va in overlay dice da dove viene', () => {
  motore.onChat(CH, { piattaforma: 'kick', user: 'giada', display: 'giada', text: 'ciao' });
  assert.equal(ultimo('chat').piattaforma, 'kick');
});

test('un messaggio senza origine e\' di casa', () => {
  motore.onChat(CH, { user: 'luca', display: 'luca', text: 'ciao' });
  assert.equal(ultimo('chat').piattaforma, 'twitch', 'i canali di prima non devono cambiare');
});

test('l\'origine non dipende da come e\' scritta', () => {
  motore.onChat(CH, { piattaforma: 'KICK', user: 'giada', display: 'giada', text: 'ciao' });
  assert.equal(ultimo('chat').piattaforma, 'kick');
});

test('anche la chat dello Studio sa da dove arriva', () => {
  motore.onChatRaw(CH, { piattaforma: 'kick', user: 'giada', display: 'giada', text: '!comando' });
  assert.equal(ultimo('chat_raw').piattaforma, 'kick');
});

test('il segno dell\'origine e\' una scelta, e da spento', () => {
  assert.equal(normChatStile({}).segnaDaDove, false, 'chi non lo chiede non se lo ritrova');
  assert.equal(normChatStile({ segnaDaDove: true }).segnaDaDove, true);
  assert.equal(normChatStile({ segnaDaDove: 'si' }).segnaDaDove, false, 'solo il vero vale vero');
});
