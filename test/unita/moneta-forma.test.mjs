// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// COME SI PARLA DELLA MONETA (src/features/moneta.js).
//
// In chat usciva «Le tue Semi di girasole»: le frasi erano scritte per
// «monete», femminile plurale, e il nome scelto dallo streamer ci veniva
// incollato dentro. Qui si prova che:
//  · la forma scelta vince, e senza una scelta vale una base visibile;
//  · un accordo si scioglie nei quattro modi, e uno scritto storto si vede;
//  · !giochi e le sue spiegazioni si accordano col nome del canale;
//  · nessuna frase lascia un segno d'accordo in chat, con nessuna forma;
//  · il nome della moneta si legge da un posto solo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-moneta-');
const { streamers } = await import('../../src/db.js');
const M = await import('../../src/features/moneta.js');
const T = await import('../../src/features/comandi-registro.js');
process.on('exit', () => usaEGetta.pulisci());

const CH = 'girasoli';
streamers.request(CH, 'Girasoli', '7');
const moneta = (nomeMonete, formaMonete) => {
  const s = { ...(streamers.get(CH)?.settings || {}) };
  delete s.nomeMonete; delete s.formaMonete;
  if (nomeMonete !== undefined) s.nomeMonete = nomeMonete;
  if (formaMonete !== undefined) s.formaMonete = formaMonete;
  streamers.setSettings(CH, s);
};

test('senza una scelta vale la base: il nome di serie e la fine della prima parola', () => {
  const casi = { '': 'fp', monete: 'fp', 'Semi di girasole': 'mp', Gemme: 'fp', Punti: 'mp', Coins: 'mp', Energia: 'fp', Stelline: 'fp', Crediti: 'mp' };
  for (const [nome, forma] of Object.entries(casi)) assert.equal(M.formaBase(nome), forma, `«${nome}»`);
});

test('la forma scelta dallo streamer vince sempre, e una storta non conta', () => {
  moneta('Semi di girasole');
  assert.deepEqual(M.monetaDi(CH), { nome: 'Semi di girasole', forma: 'mp', scelta: false });
  moneta('Oro', 'ms');
  assert.deepEqual(M.monetaDi(CH), { nome: 'Oro', forma: 'ms', scelta: true });
  moneta('Oro', 'neutro');
  assert.deepEqual(M.monetaDi(CH), { nome: 'Oro', forma: 'mp', scelta: false }, 'una forma che non esiste vale come non scelta');
  moneta(undefined);
  assert.deepEqual(M.monetaDi(CH), { nome: 'monete', forma: 'fp', scelta: false });
});

test('un accordo si scioglie nei quattro modi, e uno scritto storto resta visibile', () => {
  const t = '%[Le tue|I tuoi|La tua|Il tuo]% X';
  assert.deepEqual(M.FORME_MONETA.map((f) => M.accordaMoneta(t, f)), ['Le tue X', 'I tuoi X', 'La tua X', 'Il tuo X']);
  assert.equal(M.accordaMoneta(t, 'boh'), 'Le tue X', 'una forma sconosciuta e\' quella di serie');
  assert.equal(M.accordaMoneta('%[a|b|c]% X', 'mp'), '%[a|b|c]% X', 'tre modi non sono un accordo: meglio vederlo che indovinarlo');
});

test('!giochi parla dei Semi di girasole al maschile', () => {
  moneta('Semi di girasole');
  const chat = T.giochiInChat(CH, {}).join(' ');
  assert.match(chat, /💰 I tuoi Semi di girasole:/);
  assert.ok(!/Le tue Semi/.test(chat));
  moneta('Oro', 'ms');
  assert.match(T.giochiInChat(CH, {}).join(' '), /💰 Il tuo Oro:/);
  moneta(undefined);
  assert.match(T.giochiInChat(CH, {}).join(' '), /💰 Le tue monete:/, 'e di serie resta com\'era');
});

test('le regole dei giochi si accordano anche loro', () => {
  moneta('Semi di girasole');
  const spiega = (id) => T.riempiSpiega(CH, T.IN_CHAT[id].spiega);
  assert.match(spiega('monete'), /^Ti dice quanti Semi di girasole hai\. Si guadagnano /);
  assert.match(spiega('furto'), /Se va bene sono tuoi,/);
  assert.match(spiega('regala'), /^Regali un po' dei tuoi Semi di girasole a qualcuno/);
  moneta('Oro', 'ms');
  assert.match(spiega('monete'), /^Ti dice quanto Oro hai\. Si guadagna /);
  assert.match(spiega('furto'), /Se va bene è tuo,/);
});

test('nessuna frase lascia un segno d\'accordo in chat, con nessuna forma', () => {
  const testi = [...T.GRUPPI.map((g) => g.nome), ...Object.values(T.IN_CHAT).map((r) => r.spiega || '')];
  for (const f of M.FORME_MONETA) {
    for (const t of testi) {
      const fuori = M.accordaMoneta(t, f);
      assert.ok(!/%\[/.test(fuori), `resta un segno con ${f}: ${fuori}`);
    }
  }
});

test('il nome della moneta si legge da un posto solo', () => {
  const cartella = new URL('../../src/features/', import.meta.url);
  const copie = readdirSync(cartella).filter((f) => f.endsWith('.js') && f !== 'moneta.js')
    .filter((f) => /settings\??\.nomeMonete/.test(readFileSync(new URL(f, cartella), 'utf8')));
  assert.deepEqual(copie, [], 'chi legge il nome da solo si porta dietro la sua base, e le basi si scollano');
});
