// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello delle morti di Minecraft, nel browser vero.
//
// Le prove in Node (test/unita/morti-minecraft.test.mjs) usano cartelle finte.
// Qui gira il file che serve il sito, minificato, dentro Chromium, con le
// cose vere del browser: una cartella con le sue maniglie (lo spazio privato
// della pagina, OPFS, che si comporta come la cartella scelta dallo streamer),
// un jar compresso che si apre con DecompressionStream, e un registro che
// cresce mentre il lettore guarda.
//
// Le frasi sono inventate, nel formato del gioco: quelle vere sono di Mojang.
//
// Uso: node scripts/verifica-minecraft.mjs   (esce 1 se qualcosa non torna)

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';
import { minificaJs } from '../src/web/minifica.js';
import { apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

function zip(voci) {
  const locali = [];
  const centrali = [];
  let dove = 0;
  for (const { nome, dati } of voci) {
    const n = Buffer.from(nome);
    const piena = Buffer.from(dati);
    const corpo = deflateRawSync(piena);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(8, 8);
    l.writeUInt32LE(crc32(piena), 14); l.writeUInt32LE(corpo.length, 18); l.writeUInt32LE(piena.length, 22);
    l.writeUInt16LE(n.length, 26);
    locali.push(l, n, corpo);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc32(piena), 16); c.writeUInt32LE(corpo.length, 20); c.writeUInt32LE(piena.length, 24);
    c.writeUInt16LE(n.length, 28); c.writeUInt32LE(dove, 42);
    centrali.push(c, n);
    dove += 30 + n.length + corpo.length;
  }
  const cd = Buffer.concat(centrali);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(voci.length, 8); e.writeUInt16LE(voci.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(dove, 16);
  return Buffer.concat([...locali, cd, e]);
}

const EN = { 'death.prova.bonk': '%1$s was bonked by %2$s', 'death.prova.cavo': '%1$s tripped over a test cable', 'chat.type.text': '<%s> %s' };
const IT = { 'death.prova.bonk': '%2$s ha bonkato %1$s', 'death.prova.cavo': 'Un cavo di prova ha fatto inciampare %1$s' };
const HASH = 'cd'.repeat(20);
const SERVITI = {
  '/prova.html': ['<!doctype html><meta charset="utf-8"><title>minecraft</title><script src="/morti-minecraft.js"></script>', 'text/html'],
  '/morti-minecraft.js': [await minificaJs(readFileSync(join(RAD, 'src/web/public/morti-minecraft.js'), 'utf8')), 'text/javascript'],
  '/jar': [zip([{ nome: 'pack.png', dati: 'x'.repeat(2000) }, { nome: 'assets/minecraft/lang/en_us.json', dati: JSON.stringify(EN) }]), 'application/java-archive'],
  '/indice': [JSON.stringify({ objects: { 'minecraft/lang/it_it.json': { hash: HASH } } }), 'application/json'],
  '/it': [JSON.stringify(IT), 'application/json'],
};

const srv = http.createServer((q, r) => {
  const d = SERVITI[q.url.split('?')[0]];
  if (!d) { r.statusCode = 404; return r.end(); }
  r.setHeader('content-type', d[1]);
  r.end(d[0]);
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${srv.address().port}`;

const esiti = [];
const dice = (ok, msg) => esiti.push({ ok, msg });
const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); srv.close(); process.exit(0); }

try {
  const pagina = await browser.newPage();
  const errori = [];
  pagina.on('pageerror', (e) => errori.push(e.message));
  await pagina.goto(`${BASE}/prova.html`);
  const r = await pagina.evaluate(async (hash) => {
    const M = window.SB_MINECRAFT;
    const radice = await navigator.storage.getDirectory();
    const giu = async (dir, via) => { let d = dir; for (const p of via) d = await d.getDirectoryHandle(p, { create: true }); return d; };
    const scrivi = async (dir, via, dati, aggiungi = false) => {
      const d = await giu(dir, via.slice(0, -1));
      const f = await d.getFileHandle(via.at(-1), { create: true });
      const w = await f.createWritable({ keepExistingData: aggiungi });
      if (aggiungi) await w.seek((await f.getFile()).size);
      await w.write(dati);
      await w.close();
    };
    const porta = async (via) => new Uint8Array(await (await fetch(via)).arrayBuffer());
    const mc = await radice.getDirectoryHandle('.minecraft', { create: true });
    await scrivi(mc, ['options.txt'], 'version:3465\nlang:it_it\n');
    await scrivi(mc, ['versions', '1.0', '1.0.jar'], await porta('/jar'));
    await scrivi(mc, ['assets', 'indexes', '5.json'], await porta('/indice'));
    await scrivi(mc, ['assets', 'objects', hash.slice(0, 2), hash], await porta('/it'));
    const riga = (m) => `[12:00:00] [Render thread/INFO]: [System] [CHAT] ${m}\n`;
    await scrivi(mc, ['logs', 'latest.log'], '[11:59:00] [main/INFO]: Setting user: Steve\n' + riga('Zombie ha bonkato Steve'));

    const st = M.lettore();
    await M.prepara(st, mc, null);
    const fuori = { lingua: st.lingua, frasi: st.espressioni.length, sue: st.frasiSue, prima: await M.giro(st, mc), nome: st.nome, morti0: st.morti };
    await scrivi(mc, ['logs', 'latest.log'], riga('Zombie ha bonkato Steve') + riga('Steve ha bonkato Alex') + riga('Un cavo di prova ha fatto inciampare Steve'), true);
    await M.giro(st, mc);
    fuori.morti1 = st.morti;
    await scrivi(mc, ['logs', 'latest.log'], '[12:00:01] [Render thread/INFO]: [Not Secure] [CHAT] <Alex> Zombie ha bonkato Steve\n' + riga('Zombie ha bonkato Steve').slice(0, 25), true);
    await M.giro(st, mc);
    fuori.morti2 = st.morti;
    await scrivi(mc, ['logs', 'latest.log'], riga('Zombie ha bonkato Steve').slice(25), true);
    await M.giro(st, mc);
    fuori.morti3 = st.morti;
    await radice.removeEntry('.minecraft', { recursive: true });
    return fuori;
  }, HASH);
  dice(r.lingua === 'it_it' && r.sue === 2 && r.frasi === 4, `le frasi: dal jar compresso e dagli asset, nella lingua del gioco (${r.lingua}, ${r.frasi} frasi, ${r.sue} in italiano)`);
  dice(r.prima === 'legge' && r.nome === 'Steve' && r.morti0 === 0, `chi gioca si legge dal registro, e la morte gia' scritta non conta (${r.nome}, ${r.morti0})`);
  dice(r.morti1 === 2, `due morti nuove, e chi uccide non conta (${r.morti1})`);
  dice(r.morti2 === 2, `la chat dei giocatori non conta, e mezza riga aspetta (${r.morti2})`);
  dice(r.morti3 === 3, `la riga finita conta una volta (${r.morti3})`);
  dice(!errori.length, `nessun errore nella pagina${errori.length ? ': ' + errori.join(' | ') : ''}`);
} catch (err) {
  dice(false, `il banco si e' rotto: ${err?.message || err}`);
} finally {
  await browser.close();
  srv.close();
}

for (const x of esiti) console.log(`${x.ok ? '✓' : '✗'} ${x.msg}`);
const rotti = esiti.filter((x) => !x.ok).length;
console.log(rotti ? `\n${rotti} cose non tornano. ✗` : '\nLe morti di Minecraft si leggono nel browser vero. ✓');
process.exit(rotti ? 1 : 0);
