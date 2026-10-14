// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA TABELLA STREAMER DELL'ADMIN: ogni piattaforma per conto suo. Chi sta solo
// su Kick non deve sembrare spento perche' Twitch non c'e'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { piattaformeDi } from '../../src/features/piattaforme-admin.js';

const SCOPE = ['chat:read', 'chat:edit', 'moderator:manage:chat_messages'];
const tutto = { kick: { pronto: true }, youtube: { aperto: true } };

test('chi e\' solo su Kick e\' collegato su Kick, non spento', () => {
  const p = piattaformeDi({ scopeTwitch: SCOPE, kick: { pronto: true, token: { accessToken: 'k' }, puoModerare: true, mancano: [] }, youtube: { aperto: true } });
  assert.deepEqual(p.twitch, { disponibile: true, collegato: false, chat: false, mancano: [] });
  assert.deepEqual(p.kick, { disponibile: true, collegato: true, chat: true, moderazione: true, mancano: [] });
  assert.equal(p.youtube.collegato, false);
});

test('Twitch: la chat e\' chat:edit, e mancano gli scope non concessi', () => {
  const p = piattaformeDi({ ...tutto, twitch: { accessToken: 't', scopes: ['chat:read'] }, scopeTwitch: SCOPE });
  assert.equal(p.twitch.collegato, true);
  assert.equal(p.twitch.chat, false);
  assert.deepEqual(p.twitch.mancano, ['chat:edit', 'moderator:manage:chat_messages']);
  const ok = piattaformeDi({ ...tutto, twitch: { accessToken: 't', scopes: SCOPE }, scopeTwitch: SCOPE });
  assert.deepEqual(ok.twitch, { disponibile: true, collegato: true, chat: true, mancano: [] });
});

test('Kick: senza moderazione e coi permessi nuovi mancanti li dice tutti', () => {
  const p = piattaformeDi({ ...tutto, kick: { pronto: true, token: { accessToken: 'k' }, puoModerare: false, mancano: ['canale', 'premi'] } });
  assert.deepEqual(p.kick.mancano, ['moderazione', 'canale', 'premi']);
  assert.equal(p.kick.moderazione, false);
});

test('una piattaforma spenta sul server non e\' «non collegato», e un token vecchio non la riaccende', () => {
  const p = piattaformeDi({ kick: { pronto: false, token: { accessToken: 'k' }, puoModerare: true }, youtube: { aperto: false, token: { accessToken: 'y' } } });
  assert.deepEqual([p.kick.disponibile, p.kick.collegato, p.kick.mancano], [false, false, []]);
  assert.deepEqual([p.youtube.disponibile, p.youtube.collegato], [false, false]);
});

test('YouTube: collegato senza il permesso della chat chiede «chat»', () => {
  const senza = piattaformeDi({ ...tutto, youtube: { aperto: true, token: { accessToken: 'y', scopes: ['https://www.googleapis.com/auth/youtube.readonly'] } } });
  assert.deepEqual([senza.youtube.chat, senza.youtube.mancano], [false, ['chat']]);
  const con = piattaformeDi({ ...tutto, youtube: { aperto: true, token: { accessToken: 'y', scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'] } } });
  assert.deepEqual([con.youtube.chat, con.youtube.mancano], [true, []]);
});

test('il server e il pannello usano questa tabella, e «Rimuovi» sa togliere tutto', () => {
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  assert.ok(SRV.includes('piattaforme: piattaformeAdmin(s.login),') && SRV.includes('diCollaudo: diCollaudo.has(s.login),'));
  const rimuovi = SRV.slice(SRV.indexOf("app.post('/api/admin/rimuovi'"), SRV.indexOf("app.post('/api/admin/rimuovi'") + 1400);
  const passi = ["if (!confermaCancellazione(login, req.body?.conferma)) return res.status(400)", 'await abbonamenti.disdiciPerSempre(', "if (!disdetta.ok) return res.status(409)", 'cancellaDati(login, { conferma: req.body?.conferma })'].map((x) => rimuovi.indexOf(x));
  assert.ok(passi.every((i, k) => i > 0 && (k === 0 || i > passi[k - 1])), 'conferma, poi disdetta, poi dati: ' + passi);
  for (const id of ['twitch', 'kick', 'youtube']) assert.ok(APP.includes(`'${id}'`) && APP.includes('_PIATTAFORME_ADMIN.map((id) => `<td>${_cellaPiattaforma(s.piattaforme?.[id])}</td>`)'));
  assert.ok(APP.includes("body: { login, tutto: true, conferma: String(scritto).trim() }"));
  const testa = APP.slice(APP.indexOf('<th>Streamer</th>'), APP.indexOf('</tr></thead>', APP.indexOf('<th>Streamer</th>')));
  assert.equal((testa.match(/<th>/g) || []).length, 7);
  assert.ok(!/colspan="6"/.test(APP.slice(APP.indexOf('async function caricaTabellaAdmin'), APP.indexOf("document.addEventListener('error'", APP.indexOf('async function caricaTabellaAdmin')))));
});
