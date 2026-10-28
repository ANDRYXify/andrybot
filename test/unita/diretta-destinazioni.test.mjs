// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PARTIRE SENZA SORPRESE, E LE DESTINAZIONI IN UN GESTO (docs/DIRETTA.md).
// Le garanzie, ognuna rotta apposta:
//  · l'indirizzo intero si divide in server e chiave; il nome viene dall'host
//    solo dove e' sicuro;
//  · il server non si collega mai alla sua rete: niente loopback, privati,
//    link-local, CGNAT, ULA, ne' IPv4 travestiti da IPv6, ne' nomi senza punto;
//    e un nome che risolve anche a un indirizzo interno non passa;
//  · «Prova» fa la stretta di mano RTMP con un ricevitore vero (ffmpeg) e non
//    pubblica niente; dice il passo che non va;
//  · una destinazione caduta si dice, col motivo, e le altre continuano: da
//    capo a fondo con ffmpeg vero;
//  · il tramite sa cosa sa fare il suo ffmpeg, e senza RTMPS una destinazione
//    rtmps:// si rifiuta prima di partire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, connect } from 'node:net';
import { leggiIndirizzo, nomeDaHost, ipPubblico, controllaIndirizzo, provaRtmp, hostDi } from '../../src/features/diretta-destinazioni.js';
import { creaTramite, cadutaIn, motivoCaduta, capacitaDa } from '../../src/features/diretta.js';
import { scriviPacchi } from '../../src/features/diretta-mkv.js';
import { creaRisorse } from '../../src/risorse.js';
import { FFMPEG, materiale } from '../aiuto-diretta.mjs';

// ogni tramite e ricevitore si chiude alla fine, anche se una prova cade a meta'
const tramiti = [], ricevitori = [], serventi = [];
test.after(() => { for (const t of tramiti) t.chiudiTutto(); for (const r of ricevitori) if (r.exitCode === null) r.kill('SIGKILL'); for (const x of serventi) x.close(); });
const tramite = (o) => { const t = creaTramite(o); tramiti.push(t); return t; };
const ricevi = (args) => { const r = spawn(FFMPEG, args); ricevitori.push(r); return r; };
const risorseCalme = () => creaRisorse({ misura: () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 }), cacheMs: 0 });
const portaLibera = () => new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const pubblico = (ip = '93.184.216.34') => async () => [{ address: ip, family: 4 }];

test('l\'indirizzo intero si divide; il nome dall\'host solo dove e\' sicuro', () => {
  assert.deepEqual(leggiIndirizzo(' rtmps://live-api-s.facebook.com:443/rtmp/FB-123-0-Ab?s_bl=1&s_ps=1 '), { ok: true, server: 'rtmps://live-api-s.facebook.com:443/rtmp', chiave: 'FB-123-0-Ab?s_bl=1&s_ps=1' });
  assert.deepEqual(leggiIndirizzo('rtmp://a.rtmp.youtube.com/live2/', 'abcd-efgh'), { ok: true, server: 'rtmp://a.rtmp.youtube.com/live2', chiave: 'abcd-efgh' });
  assert.deepEqual(leggiIndirizzo('rtmp://app/app/x'), { ok: true, server: 'rtmp://app/app', chiave: 'x' }, 'il percorso si divide dal parser, non cercando nella stringa');
  assert.deepEqual(leggiIndirizzo('rtmp://h.example/app/sub/key'), { ok: true, server: 'rtmp://h.example/app', chiave: 'sub/key' });
  assert.deepEqual(leggiIndirizzo('rtmp://a.rtmp.youtube.com/live2'), { ok: false, motivo: 'chiave' }, 'senza chiave e senza niente da dividere');
  assert.deepEqual(leggiIndirizzo('http://x.y/app/k'), { ok: false, motivo: 'forma' });
  assert.deepEqual(leggiIndirizzo('rtmp://x.y:99999/app/k'), { ok: false, motivo: 'forma' });
  assert.equal(leggiIndirizzo('rtmp://x.y/app\n/k\t').chiave, 'k', 'gli a capo incollati non entrano');
  assert.deepEqual(['rtmp://a.rtmp.youtube.com/live2', 'rtmps://live-api-s.facebook.com:443/rtmp', 'rtmp://live.twitch.tv/app', 'rtmp://ingest.global-contribute.live-video.net/app', 'rtmps://abc.global-contribute.live-video.net/app', 'rtmp://mio.server.it/live', 'rtmp://youtube.com.cattivo.it/x'].map(nomeDaHost),
    ['YouTube', 'Facebook', 'Twitch', 'Twitch', '', '', '']);
  assert.deepEqual(hostDi('rtmps://[2606:4700::1]/app/k'), { origine: 'rtmps://[2606:4700::1]', sicuro: true, host: '2606:4700::1', porta: 443, percorso: '/app/k', ricerca: '' });
});

test('solo indirizzi pubblici: la rete del server non si raggiunge', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::a00:1', 'ff02::1', '2001:db8::1', 'boh'])
    assert.equal(ipPubblico(ip), false, ip);
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700::1111', '::ffff:8.8.8.8']) assert.equal(ipPubblico(ip), true, ip);
  assert.deepEqual(await controllaIndirizzo('rtmp://127.0.0.1:8090/x/y'), { ok: false, motivo: 'privato' });
  assert.deepEqual(await controllaIndirizzo('rtmp://[::1]/x/y'), { ok: false, motivo: 'privato' });
  for (const h of ['bot', 'localhost', 'caddy', 'nas.local', 'x.internal']) assert.equal((await controllaIndirizzo(`rtmp://${h}/x/y`, { risolvi: pubblico() })).motivo, 'interno', h);
  assert.equal((await controllaIndirizzo('rtmp://doppio.example/x/y', { risolvi: async () => [{ address: '93.184.216.34' }, { address: '10.0.0.7' }] })).motivo, 'privato', 'basta un indirizzo interno fra quelli del nome');
  assert.equal((await controllaIndirizzo('rtmp://non.esiste.example/x/y', { risolvi: async () => { throw new Error('ENOTFOUND'); } })).motivo, 'nome');
  assert.deepEqual(await controllaIndirizzo('rtmp://buono.example/x/y', { risolvi: pubblico() }), { ok: true, ip: '93.184.216.34', h: hostDi('rtmp://buono.example/x/y') });
});

test('«Prova»: la stretta di mano con un ricevitore RTMP vero, senza pubblicare; e il passo che non va', { skip: !FFMPEG && 'serve ffmpeg (SB_FFMPEG)', timeout: 30_000 }, async () => {
  const porta = await portaLibera();
  const dir = mkdtempSync(join(tmpdir(), 'prova-rtmp-'));
  const uscita = join(dir, 'niente.flv');
  const ricevitore = ricevi(['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porta}/live/k`, '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  // l'host dice un nome pubblico; la prova si collega all'indirizzo controllato (qui, finto pubblico, il ricevitore locale)
  const connetti = (o) => { assert.equal(o.ip, '93.184.216.34', 'si collega all\'indirizzo che ha controllato'); return createConnection(porta); };
  let r;
  try { r = await provaRtmp(`rtmp://ricevitore.example:${porta}/live/k`, { risolvi: pubblico(), connetti }); }
  finally { await new Promise((ok) => { if (ricevitore.exitCode !== null) ok(); ricevitore.on('exit', ok); setTimeout(() => ricevitore.kill('SIGKILL'), 1500); }); }
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(!existsSync(uscita) || statSync(uscita).size === 0, 'niente e\' stato pubblicato');
  const chiusa = await portaLibera();
  assert.deepEqual(await provaRtmp(`rtmp://chiuso.example:${chiusa}/live/k`, { risolvi: pubblico(), connetti: () => createConnection(chiusa) }), { ok: false, passo: 'irraggiungibile' });
  assert.deepEqual(await provaRtmp('rtmp://127.0.0.1/live/k'), { ok: false, passo: 'privato' }, 'e la prova non si collega mai alla rete del server');
  // una risposta lunga quanto una stretta di mano, ma che non e' RTMP
  const nonRtmp = createServer((c) => c.end('HTTP/1.1 400 Bad Request\r\n\r\n' + 'x'.repeat(2000))).listen(0, '127.0.0.1');
  serventi.push(nonRtmp);
  await new Promise((ok) => nonRtmp.on('listening', ok));
  assert.deepEqual(await provaRtmp('rtmp://http.example/live/k', { risolvi: pubblico(), connetti: () => createConnection(nonRtmp.address().port) }), { ok: false, passo: 'rtmp' }, 'risponde, ma non e\' RTMP');
});
const createConnection = (porta) => connect({ host: '127.0.0.1', port: porta });

test('le righe di ffmpeg: quale destinazione e\' caduta, e perche\'', () => {
  assert.deepEqual(cadutaIn('[tee @ 0x55] Slave muxer #1 failed: Connection refused, continuing with 1/2 slaves.'), { i: 1, motivo: 'irraggiungibile' });
  assert.deepEqual(cadutaIn('[tee @ 0x1] Slave muxer #0 failed: Input/output error, continuing with 2/3 slaves.'), { i: 0, motivo: 'rifiutata' });
  assert.equal(cadutaIn('[rtmp @ 0x1] Cannot open connection tcp://127.0.0.1:19399'), null);
  assert.deepEqual(['Protocol not found', 'Failed to resolve hostname x: Name or service not known', 'error:0A000086:SSL routines', 'Broken pipe', 'Connection timed out', 'Boh'].map(motivoCaduta),
    ['protocollo', 'nome', 'tls', 'rifiutata', 'irraggiungibile', 'altro']);
});

test('cosa sa fare ffmpeg: le sue liste vere, e quello che manca', { skip: !FFMPEG && 'serve ffmpeg (SB_FFMPEG)' }, async () => {
  const { execFileSync } = await import('node:child_process');
  const leggi = (a) => execFileSync(FFMPEG, ['-hide_banner', a], { encoding: 'utf8' });
  const c = capacitaDa({ protocolli: leggi('-protocols'), muxer: leggi('-muxers'), demuxer: leggi('-demuxers'), encoder: leggi('-encoders') });
  assert.equal(c.pronta, true, JSON.stringify(c));
  const senzaTls = capacitaDa({ protocolli: leggi('-protocols').replace(/^\s*rtmps\s*$/gm, ''), muxer: leggi('-muxers'), demuxer: leggi('-demuxers'), encoder: leggi('-encoders') });
  assert.deepEqual([senzaTls.pronta, senzaTls.rtmps], [true, false]);
  assert.deepEqual(capacitaDa({}).manca, ['rtmp', 'tee', 'flv', 'matroska', 'aac']);
  const t = tramite({ risorse: risorseCalme(), ffmpeg: FFMPEG, ogniMs: 0, sondaVod: async () => false, sondaCapacita: async () => senzaTls });
  await new Promise((ok) => setTimeout(ok, 20));
  const m = materiale({ secondi: 1, gop: 30 });
  assert.deepEqual(t.avvia('luigi', { destinazioni: [{ id: 'k', nome: 'Kick', url: 'rtmps://x.example/app/k' }, { id: 'y', nome: 'YouTube', url: 'rtmp://y.example/live2/k' }], ...m.config, kbps: 2000 }),
    { ok: false, motivo: 'rtmps', quali: ['Kick'] }, 'si dice prima, col nome di quella che non va');
  const rotto = tramite({ risorse: risorseCalme(), ffmpeg: FFMPEG, ogniMs: 0, sondaVod: async () => false, sondaCapacita: async () => capacitaDa({}) });
  await new Promise((ok) => setTimeout(ok, 20));
  assert.equal(rotto.avvia('luigi', { destinazioni: [{ id: 'y', nome: 'YouTube', url: 'rtmp://y.example/live2/k' }], ...m.config, kbps: 2000 }).motivo, 'ffmpeg');
});

test('da capo a fondo: una destinazione cade e lo stato lo dice, l\'altra riceve tutto', { skip: !FFMPEG && 'serve ffmpeg (SB_FFMPEG)', timeout: 60_000 }, async () => {
  const m = materiale({ secondi: 4, gop: 60 });
  const dir = mkdtempSync(join(tmpdir(), 'caduta-'));
  const uscita = join(dir, 'arrivato.flv');
  const porta = await portaLibera(), morta = await portaLibera();
  const ricevitore = ricevi(['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porta}/live/prova`, '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  const t = tramite({ risorse: risorseCalme(), ffmpeg: FFMPEG, ogniMs: 50, sondaVod: async () => false });
  const e = t.avvia('mario', { destinazioni: [{ id: 'buona', nome: 'Buona', url: `rtmp://127.0.0.1:${porta}/live/prova` }, { id: 'morta', nome: 'Morta', url: `rtmp://127.0.0.1:${morta}/live/no` }], ...m.config, kbps: 3000 });
  assert.equal(e.ok, true, JSON.stringify(e));
  t.riserva('mario', scriviPacchi([...m.video.slice(0, 60), ...m.audio.slice(0, 47)]), e.turno);
  const tutti = [...m.video, ...m.audio].sort((a, b) => a.us - b.us);
  const inizio = Date.now();
  let n = 0;
  for (let i = 0; i < tutti.length;) {
    const fino = tutti[i].us + 100_000, lotto = [];
    while (i < tutti.length && tutti[i].us < fino) lotto.push(tutti[i++]);
    await new Promise((ok) => setTimeout(ok, Math.max(0, inizio + lotto[0].us / 1000 - Date.now())));
    t.pacchi('mario', n++, scriviPacchi(lotto), e.turno);
  }
  const st = t.stato('mario');
  assert.deepEqual(st.stati, [{ id: 'buona', nome: 'Buona', ok: true, motivo: '' }, { id: 'morta', nome: 'Morta', ok: false, motivo: 'irraggiungibile' }]);
  assert.equal(st.live, true, 'le altre continuano');
  t.ferma('mario');
  await new Promise((ok) => ricevitore.on('exit', ok));
  assert.ok(statSync(uscita).size > 20_000, 'la buona ha ricevuto la diretta');
});
