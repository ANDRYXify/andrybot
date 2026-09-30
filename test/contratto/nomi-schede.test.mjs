// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// OGNI SCHEDA DEL MENÙ HA IL SUO NOME NELLE TRE LINGUE.
// Il nome di una scheda passa da T_SCHEDA; se la voce manca, il menù mostra il
// nome italiano scritto accanto all'id, anche a chi usa il pannello in inglese
// o in spagnolo. Era successo alle Donazioni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');

test('ogni scheda del menù ha il nome in italiano, inglese e spagnolo', () => {
  const i = APP.indexOf('const T_SCHEDA = {');
  const nomi = new Map([...APP.slice(i, APP.indexOf('\n};', i)).matchAll(/^ {2}([a-z0-9]+): \[('[^']*'), ('[^']*'), ('[^']*')\]/gm)].map((m) => [m[1], m.slice(2)]));
  const a = APP.indexOf("{ id: 'inizio', nome: 'Stato', schede: [");
  const schede = [...APP.slice(a, APP.indexOf('\n];', a)).matchAll(/\['([a-z0-9]+)',\s*'[^']+'\]/g)].map((m) => m[1]);
  assert.ok(schede.length >= 20, `schede trovate: ${schede.length}`);
  for (const id of schede) assert.ok(nomi.has(id), `la scheda «${id}» non ha il nome tradotto: nel menù esce in italiano`);
});
