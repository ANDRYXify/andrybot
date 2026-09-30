// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUELLO CHE IL BOT SCRIVE DA TELEGRAM E DISCORD HA GLI ACCENTI VERI.
//
// Le frasi di !discord in chat, gli errori che il pannello mostra, i motivi che
// finiscono nel registro del server Discord: erano scritti con l'apostrofo al
// posto dell'accento («cosi'», «piu'», «e'»), che si legge come un errore di
// battitura. Il cancello degli accenti guarda il pannello e i manuali, non questi
// moduli: qui si guardano le loro stringhe, commenti tolti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { senzaCommentiJs } from '../../scripts/_codice.mjs';

const RAD = new URL('../../', import.meta.url);
const leggi = (p) => readFileSync(new URL(p, RAD), 'utf8');

const FILE = [
  ...readdirSync(new URL('src/features/', RAD)).filter((f) => /^(discord-.*|telegram|tg-.*|tgapp|compleanni|carta-disegno)\.js$/.test(f)).map((f) => 'src/features/' + f),
];

// le parole che con l'apostrofo al posto dell'accento sono per forza sbagliate
const FINTO = /\b(piu|gia|cosi|puo|perche|pero|finche|modalita|c'e|e|li)\\?'(?=[\s.,:;!?)»`]|$)/g;

// le stringhe di un file, commenti tolti, con la barra dell'apostrofo tolta
const stringhe = (src) => (senzaCommentiJs(src).match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || [])
  .map((s) => s.slice(1, -1).replace(/\\(['"`])/g, '$1'));

test('nessuna stringa di Telegram e Discord scrive l\'accento con l\'apostrofo', () => {
  assert.ok(FILE.length >= 10, `guardo ${FILE.length} file`);
  const trovate = [];
  for (const f of FILE) {
    for (const s of stringhe(leggi(f))) {
      for (const m of s.matchAll(FINTO)) trovate.push(`${f}: «${m[0]}» in «${s.slice(0, 80)}»`);
    }
  }
  assert.deepEqual(trovate, []);
});

test('e nemmeno i messaggi di Telegram e Discord che il server manda al pannello', () => {
  const SRV = leggi('src/web/server.js');
  const pezzi = [
    SRV.slice(SRV.indexOf("app.post('/api/streamer/ruoli', requireOwner"), SRV.indexOf("app.post('/api/streamer/ruoli/prova'")),
    SRV.slice(SRV.indexOf("app.post('/api/streamer/telegram/ingresso'"), SRV.indexOf("app.post('/api/streamer/telegram/impostazioni'")),
  ];
  for (const p of pezzi) {
    assert.ok(p.length > 200);
    const brutte = stringhe(p).flatMap((s) => [...s.matchAll(FINTO)].map((m) => `«${m[0]}» in «${s.slice(0, 80)}»`));
    assert.deepEqual(brutte, []);
  }
});
