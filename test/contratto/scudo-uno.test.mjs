// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO E' UNO PER PROCESSO, E SI SPEGNE TUTTO.
//
// Il server ne accendeva un secondo per la pulizia dei follower: una seconda
// fila che gareggiava con la difesa per il rate limit, falliti scritti sopra
// quelli dell'altra nello stesso file, una seconda riapertura delle serrande a
// ogni avvio. E allo spegnimento la fila si perdeva, e incidenti e rete non
// andavano su disco. Qui si fissa:
//  · nel prodotto un solo `new AntiBot(`, quello del bot (il simulatore ha il
//    suo, che e' un gioco e si ferma da se');
//  · il server usa lo scudo vivo, e senza bot lo dice;
//  · il bot si spegne con spegniScudo, e spegniScudo ferma ogni fila e ogni
//    orologio e scrive quello che aspettava di essere scritto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-uno-');
const ab = await import('../../src/features/antibot.js');
test.after(async () => { await ab.spegniScudo(); casa.pulisci(); });

const RAD = new URL('../../', import.meta.url).pathname;
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
function sorgenti(dir, fuori = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'public') sorgenti(p, fuori); } else if (/\.m?js$/.test(n)) fuori.push(p);
  }
  return fuori;
}

test('nel prodotto c\'e\' un solo scudo: quello del bot', () => {
  const dove = sorgenti(join(RAD, 'src'))
    .filter((f) => /new AntiBot\(/.test(senzaCommenti(readFileSync(f, 'utf8'))))
    .map((f) => f.slice(RAD.length));
  assert.deepEqual(dove.sort(), ['src/bot.js', 'src/features/simulatore.js']);
  const SIM = senzaCommenti(readFileSync(join(RAD, 'src/features/simulatore.js'), 'utf8'));
  assert.match(SIM, /await scudo\.ferma\(\{ conserva: false \}\);/, 'e quello del simulatore si ferma a fine scenario');
});

test('il server usa lo scudo vivo, e senza bot lo dice', () => {
  const SRV = senzaCommenti(readFileSync(join(RAD, 'src/web/server.js'), 'utf8'));
  assert.match(SRV, /const scudoVivo = \(\) => manager\?\.antibot \|\| null;/);
  const i = SRV.indexOf("app.post('/api/antibot/pulizia'");
  const pulizia = SRV.slice(i, SRV.indexOf("app.post('/api/antibot/azione'", i));
  assert.match(pulizia, /const scudo = scudoVivo\(\);\n\s*if \(!scudo\) return res\.status\(503\)/);
  assert.equal((pulizia.match(/scudo\.pulisciFollower\(/g) || []).length, 2, 'la prova e la pulizia vera');
});

test('il bot si spegne con spegniScudo', () => {
  const BOT = senzaCommenti(readFileSync(join(RAD, 'src/bot.js'), 'utf8'));
  const i = BOT.indexOf('  async stop() {');
  assert.ok(i > 0);
  assert.match(BOT.slice(i, BOT.indexOf('\n  }\n', i)), /await spegniScudo\(\);/);
});

test('spegniScudo ferma ogni fila e ogni orologio, e scrive quello che aspettava', async () => {
  let chiamate = 0;
  const lento = { timeoutUser: async () => ({ ok: true }), bloccaUtente: async () => { chiamate++; return { ok: true }; } };
  const uno = new ab.AntiBot({ helix: lento });
  const due = new ab.AntiBot({ helix: lento });
  const verdetti = (s, pre) => Array.from({ length: 20 }, (_, i) => s.esecutore.esegui({
    id: pre + i, ts: Date.now(), canale: 'unocanale', login: pre + i, userId: pre + i, azione: 'blocca', motivi: ['prova'], punti: 0, confidenza: 1, origine: 'prova', incidente: '', durata: 0, messaggio: '', aVuoto: false,
  }));
  const fila = [...verdetti(uno, 'a'), ...verdetti(due, 'b')];
  ab.registra('unocanale', { azione: 'segnala', motivo: 'da scrivere', esito: 'in-attesa' });
  while (chiamate < 2) await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  const prima = process.getActiveResourcesInfo().filter((t) => t === 'Timeout').length;
  assert.ok(prima >= 2, 'due file stanno dormendo il loro ritmo');
  await ab.spegniScudo();
  const esiti = await Promise.all(fila);
  assert.ok(esiti.filter((x) => x.motivo === 'il bot si è fermato prima di farla').length >= 36, 'quasi tutte erano ancora in fila');
  assert.equal(process.getActiveResourcesInfo().filter((t) => t === 'Timeout').length, 0, 'nessun orologio tiene vivo il processo');
  const falliti = JSON.parse(readFileSync(join(casa.dir, 'azioni-fallite.json'), 'utf8')).righe;
  assert.ok(falliti.some((f) => f.login.startsWith('a')) || falliti.some((f) => f.login.startsWith('b')), 'quello che restava e\' in sospeso, su disco');
  assert.ok(existsSync(join(casa.dir, 'registro-antibot.json')), 'e il registro e\' scritto, senza aspettare il suo orologio');
});

test('uno scudo spento non riapre le serrande dopo', async () => {
  // La riapertura parte quattro secondi dopo l'avvio. Spento prima, non deve
  // partire: sarebbe uno scudo fermo che parla con Twitch.
  const { statoVivo } = await import('../../src/db.js');
  statoVivo.scrivi('serrandacanale', 'serranda', { ripristino: { follower: true }, da: Date.now() });
  const chiamate = [];
  new ab.AntiBot({ helix: { chatSoloFollower: async (ch, on) => { chiamate.push([ch, on]); return { ok: true }; } } });
  await ab.spegniScudo();
  await new Promise((r) => setTimeout(r, 4300));
  assert.deepEqual(chiamate, []);
  assert.ok(statoVivo.leggi('serrandacanale', 'serranda'), 'la serranda resta segnata: la riapre il prossimo avvio');
});
