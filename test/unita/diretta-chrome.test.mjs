// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA DIRETTA DA CAPO A FONDO CON UN BROWSER VERO (docs/DIRETTA.md, «La beta»).
//
// Il codice del dispositivo gira in Google Chrome: disegna su una tela, suona,
// codifica con WebCodecs e spedisce. Il server vero lo riceve, il tramite lo
// copia verso un ricevitore RTMP locale, e ffprobe guarda quello che arriva.
// Serve Google Chrome (il Chromium di collaudo non ha H.264) e ffmpeg: senza,
// la prova si salta e lo dice. Su Linux Chrome codifica l'audio in Opus, e cosi'
// passa anche la strada in cui il server lo converte in AAC.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdtempSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { creaTramite, ffmpegMultitraccia } from '../../src/features/diretta.js';
import { creaRisorse } from '../../src/risorse.js';
import { FFMPEG, FFPROBE } from '../aiuto-diretta.mjs';

const CHROME = process.env.SB_CHROME || ['/usr/bin/google-chrome', '/opt/google/chrome/chrome'].find((f) => existsSync(f)) || null;
const PUBBLICO = new URL('../../src/web/public', import.meta.url).pathname;
const SECONDI = 8;

const SALTA = { skip: (!CHROME && 'serve Google Chrome (SB_CHROME)') || (!FFMPEG && 'serve ffmpeg (SB_FFMPEG)'), timeout: 120_000 };
const MISURE = { o: [640, 360], v: [360, 640] };
const sessione = (f) => (f === 'v' ? 'prova#v' : 'prova');
const portaLibera = () => new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });

// Una o piu' dirette dallo stesso dispositivo, una per formato, come le fa lo
// Studio: ogni formato ha la sua tela, il suo codificatore, la sua spedizione
// e la sua sessione sul server; l'audio e' uno solo, condiviso.
async function daCapoAFondo(t, formati) {
  let chromium;
  try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); } catch { t.skip('Playwright non c\'e\''); return null; }
  const cartella = mkdtempSync(join(tmpdir(), 'diretta-chrome-'));
  const uscite = {}, porte = {}, ricevitori = {};
  for (const f of formati) {
    uscite[f] = join(cartella, `arrivato-${f}.flv`);
    porte[f] = await portaLibera();
    ricevitori[f] = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porte[f]}/live/prova`, '-c', 'copy', '-y', uscite[f]]);
  }
  await new Promise((ok) => setTimeout(ok, 800));
  const tramite = creaTramite({ risorse: creaRisorse({ misura: () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 }), cacheMs: 0 }), ffmpeg: FFMPEG, ogniMs: 50 });
  const corpo = (q) => new Promise((ok) => { const c = []; q.on('data', (d) => c.push(d)); q.on('end', () => ok(Buffer.concat(c))); });
  const srv = createServer(async (q, r) => {
    const u = new URL(q.url, 'http://x');
    const f = u.searchParams.get('f') === 'v' ? 'v' : 'o';
    const rispondi = (e) => { r.statusCode = e.ok ? 200 : 409; r.end(JSON.stringify(e)); };
    if (u.pathname === '/') { r.setHeader('content-type', 'text/html'); return r.end('<!doctype html><title>prova</title>'); }
    if (u.pathname === '/avvio') {
      const { video: v, audio: a } = JSON.parse(await corpo(q));
      return rispondi(tramite.avvia(sessione(f), { destinazioni: [{ id: 'x' + f, nome: 'Locale', url: `rtmp://127.0.0.1:${porte[f]}/live/prova` }],
        video: { ...v, config: Buffer.from(v.config, 'base64') }, audio: { ...a, config: a.config ? Buffer.from(a.config, 'base64') : null }, kbps: 1500 }));
    }
    if (u.pathname === '/api/diretta/riserva') return rispondi(tramite.riserva(sessione(f), await corpo(q), u.searchParams.get('t')));
    if (u.pathname === '/api/diretta/pacchi') return rispondi(tramite.pacchi(sessione(f), Number(u.searchParams.get('n')), await corpo(q), u.searchParams.get('t')));
    try { r.setHeader('content-type', 'text/javascript'); r.end(readFileSync(join(PUBBLICO, u.pathname))); } catch { r.statusCode = 404; r.end(); }
  }).listen(0, '127.0.0.1');
  await new Promise((ok) => srv.on('listening', ok));
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const pagina = await browser.newPage();
    await pagina.goto(`http://127.0.0.1:${srv.address().port}/`);
    const esiti = await pagina.evaluate(async ({ secondi, formati, misure }) => {
      const D = await import('/js/diretta-codifica.js');
      const ac = new AudioContext({ sampleRate: 48000 }); await ac.resume();
      const suono = ac.createOscillator(), volume = ac.createGain(); suono.connect(volume); suono.start();
      const dirette = {};
      for (const f of formati) {
        const [w, h] = misure[f];
        const sup = await D.supporto({ larghezza: w, altezza: h, fps: 30, kbps: 1500 });
        if (!sup.ok) return { [f]: { supporto: sup.motivo } };
        const tela = document.createElement('canvas'); tela.width = w; tela.height = h;
        const g = tela.getContext('2d');
        let n = 0; setInterval(() => { g.fillStyle = `hsl(${(n++ * 7) % 360} 80% 50%)`; g.fillRect(0, 0, w, h); }, 33);
        const riserva = document.createElement('canvas'); riserva.width = w; riserva.height = h; riserva.getContext('2d').fillRect(0, 0, w, h);
        const d = { finita: null };
        d.sped = D.creaSpedizione({ formato: f, quandoFinisce: (x) => { d.finita = x; } });
        d.cod = await D.creaCodifica({ supporto: sup, canvas: tela, contestoAudio: ac, nodoAudio: volume, fps: 30, kbps: 1500, riserva, spedizione: d.sped });
        const avvio = await (await fetch(`/avvio?f=${f}`, { method: 'POST', body: JSON.stringify({ video: d.cod.config.video, audio: d.cod.config.audio }) })).json();
        if (!avvio.ok) return { [f]: { avvio } };
        d.sped.usaTurno(avvio.turno);
        d.riserva = (await fetch(`/api/diretta/riserva?f=${f}&t=${avvio.turno}`, { method: 'POST', body: d.cod.riserva })).status;
        dirette[f] = d;
      }
      for (const f of formati) await dirette[f].cod.parti();
      await new Promise((ok) => setTimeout(ok, secondi * 1000));
      const esiti = {};
      for (const f of formati) { const d = dirette[f]; await d.cod.ferma(); await d.sped.ferma(); esiti[f] = { ok: true, riserva: d.riserva, audio: d.cod.config.audio.codec, finita: d.finita }; }
      return esiti;
    }, { secondi: SECONDI, formati, misure: MISURE });
    for (const f of formati) {
      const e = esiti[f] || {};
      assert.equal(e.ok, true, `${f}: ${JSON.stringify(esiti)}`);
      assert.equal(e.riserva, 200, `${f}: la riserva dello stesso codificatore e' accettata`);
      assert.equal(e.finita, null, `${f}: il server non ha mai chiuso la diretta`);
      const st = tramite.stato(sessione(f));
      assert.deepEqual(st.inRiserva, { video: false, audio: false }, `${f}: alla fine va in onda il dispositivo, non la riserva`);
      assert.equal(st.errore, '', `${f}: il tramite non si lamenta dei tempi: ${st.errore}`);
    }
  } finally {
    await browser.close();
    for (const f of formati) tramite.ferma(sessione(f));
    srv.close();
    // Un ricevitore a cui non e' arrivato niente resterebbe in ascolto per
    // sempre, e terrebbe appesa la prova: chi non ha chiuso in tempo si spegne.
    for (const f of formati) await new Promise((ok) => { if (ricevitori[f].exitCode !== null) return ok(); ricevitori[f].on('exit', ok); setTimeout(ok, 10_000); });
    for (const f of formati) if (ricevitori[f].exitCode === null) ricevitori[f].kill('SIGKILL');
  }
  return uscite;
}

function controllaArrivato(uscita, f) {
  assert.ok(existsSync(uscita) && statSync(uscita).size > 50_000, `${f}: arrivato qualcosa`);
  const info = JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', uscita], { encoding: 'utf8' }).stdout).streams;
  assert.deepEqual(info.map((s) => s.codec_name).sort(), ['aac', 'h264'], `${f}: H.264 copiato com'e', l'audio in AAC come vogliono le piattaforme`);
  const video = info.find((s) => s.codec_name === 'h264');
  assert.deepEqual([video.width, video.height], MISURE[f], `${f}: arriva nel suo formato`);
  const pacchetti = (s) => spawnSync(FFPROBE, ['-v', 'error', '-select_streams', s, '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', uscita], { encoding: 'utf8' }).stdout.trim().split('\n').map(Number);
  const salti = (xs) => xs.slice(1).map((x, i) => x - xs[i]);
  const v = pacchetti('v'), a = pacchetti('a');
  assert.ok(Math.min(...salti(v)) >= 0.010, `${f}: due fotogrammi non stanno mai a meno di mezzo intervallo: salto minimo ${Math.min(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.max(...salti(v)) < 0.25, `${f}: il video non ha buchi: salto massimo ${Math.max(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.max(...salti(a)) < 0.1, `${f}: l'audio non ha buchi: salto massimo ${Math.max(...salti(a)).toFixed(3)} s`);
  // Le piattaforme tagliano i segmenti solo su un fotogramma chiave: senza,
  // chi guarda aspetta e la diretta parte «super in ritardo».
  const chiavi = spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', uscita], { encoding: 'utf8' }).stdout.trim().split('\n')
    .map((r) => r.split(',')).filter(([, fl]) => String(fl).includes('K')).map(([t]) => Number(t));
  assert.ok(chiavi.length >= Math.floor(SECONDI / 2) && Math.max(...salti(chiavi)) <= 2.1, `${f}: un fotogramma chiave ogni due secondi: ${chiavi.map((x) => x.toFixed(2)).join(' ')}`);
  const durata = v.at(-1) - v[0];
  assert.ok(durata > SECONDI - 1.5 && durata < SECONDI + 1, `${f}: la diretta dura il tempo vero: ${durata.toFixed(2)} s`);
  const decodifica = spawnSync(FFMPEG, ['-v', 'error', '-i', uscita, '-fps_mode', 'passthrough', '-enc_time_base', '1:1000', '-f', 'null', '-'], { encoding: 'utf8' });
  assert.equal(decodifica.stderr.trim(), '', `${f}: si decodifica tutto, senza un errore`);
}

test('da capo a fondo con Google Chrome: il dispositivo codifica, il tramite copia, arriva una diretta pulita', SALTA, async (t) => {
  const uscite = await daCapoAFondo(t, ['o']);
  if (uscite) controllaArrivato(uscite.o, 'o');
});

test('orizzontale e verticale insieme: due dirette pulite dallo stesso dispositivo, ognuna nel suo formato', SALTA, async (t) => {
  const uscite = await daCapoAFondo(t, ['o', 'v']);
  if (uscite) { controllaArrivato(uscite.o, 'o'); controllaArrivato(uscite.v, 'v'); }
});

// LA TRACCIA DEL VOD con il codice vero del dispositivo (docs/DIRETTA.md,
// «Tracce audio e VOD»): il live porta la voce (440 Hz) e la musica (880 Hz),
// il VOD solo la voce. A Twitch arrivano due tracce allineate pacchetto per
// pacchetto: nella prima c'e' la musica, nella seconda no. Serve anche un
// ffmpeg che scriva la seconda traccia (dalla 7.1, SB_FFMPEG_MULTI).
const MULTI = [process.env.SB_FFMPEG_MULTI, FFMPEG].filter(Boolean).find((f) => ffmpegMultitraccia(spawnSync(f, ['-version'], { encoding: 'utf8' }).stdout)) || null;
const energia = (pcm, hz) => { let re = 0, im = 0; for (let i = 0; i < pcm.length; i++) { const a = 2 * Math.PI * hz * i / 48000; re += pcm[i] * Math.cos(a); im += pcm[i] * Math.sin(a); } return Math.hypot(re, im) / pcm.length; };

test('da capo a fondo con Google Chrome: la musica va in diretta ma non nel VOD di Twitch', { skip: SALTA.skip || (!MULTI && 'serve un ffmpeg dalla 7.1 (SB_FFMPEG_MULTI)'), timeout: 120_000 }, async (t) => {
  let chromium;
  try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); } catch { t.skip('Playwright non c\'e\''); return; }
  const cartella = mkdtempSync(join(tmpdir(), 'diretta-vod-'));
  const uscita = join(cartella, 'twitch.mkv'), porta = await portaLibera();
  const ricevitore = spawn(MULTI, ['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porta}/app/prova`, '-map', '0', '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  const tramite = creaTramite({ risorse: creaRisorse({ misura: () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 }), cacheMs: 0 }), ffmpeg: MULTI, ogniMs: 50 });
  await new Promise((ok) => setTimeout(ok, 500));
  const corpo = (q) => new Promise((ok) => { const c = []; q.on('data', (d) => c.push(d)); q.on('end', () => ok(Buffer.concat(c))); });
  const srv = createServer(async (q, r) => {
    const u = new URL(q.url, 'http://x');
    const rispondi = (e) => { r.statusCode = e.ok ? 200 : 409; r.end(JSON.stringify(e)); };
    if (u.pathname === '/') { r.setHeader('content-type', 'text/html'); return r.end('<!doctype html><title>prova</title>'); }
    if (u.pathname === '/avvio') {
      const { video: v, audio: a, vod } = JSON.parse(await corpo(q));
      return rispondi(tramite.avvia('prova', { destinazioni: [{ id: 'twitch', nome: 'Twitch', url: `rtmp://127.0.0.1:${porta}/app/prova` }],
        video: { ...v, config: Buffer.from(v.config, 'base64') }, audio: { ...a, config: a.config ? Buffer.from(a.config, 'base64') : null }, kbps: 1500, vod }));
    }
    if (u.pathname === '/api/diretta/riserva') return rispondi(tramite.riserva('prova', await corpo(q), u.searchParams.get('t')));
    if (u.pathname === '/api/diretta/pacchi') return rispondi(tramite.pacchi('prova', Number(u.searchParams.get('n')), await corpo(q), u.searchParams.get('t')));
    try { r.setHeader('content-type', 'text/javascript'); r.end(readFileSync(join(PUBBLICO, u.pathname))); } catch { r.statusCode = 404; r.end(); }
  }).listen(0, '127.0.0.1');
  await new Promise((ok) => srv.on('listening', ok));
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const pagina = await browser.newPage();
    await pagina.goto(`http://127.0.0.1:${srv.address().port}/`);
    const esito = await pagina.evaluate(async ({ secondi }) => {
      const D = await import('/js/diretta-codifica.js');
      const ac = new AudioContext({ sampleRate: 48000 }); await ac.resume();
      const voce = ac.createOscillator(), musica = ac.createOscillator(); voce.frequency.value = 440; musica.frequency.value = 880;
      const gv = ac.createGain(), gm = ac.createGain(); gv.gain.value = 0.3; gm.gain.value = 0.3;
      voce.connect(gv); musica.connect(gm); voce.start(); musica.start();
      const live = ac.createGain(), vod = ac.createGain();
      gv.connect(live); gm.connect(live); gv.connect(vod);
      const sup = await D.supporto({ larghezza: 640, altezza: 360, fps: 30, kbps: 1500 });
      if (!sup.ok) return { supporto: sup.motivo };
      const tela = document.createElement('canvas'); tela.width = 640; tela.height = 360;
      const g = tela.getContext('2d'); let n = 0; setInterval(() => { g.fillStyle = `hsl(${(n++ * 7) % 360} 80% 50%)`; g.fillRect(0, 0, 640, 360); }, 33);
      const riserva = document.createElement('canvas'); riserva.width = 640; riserva.height = 360; riserva.getContext('2d').fillRect(0, 0, 640, 360);
      let finita = null;
      const sped = D.creaSpedizione({ formato: 'o', quandoFinisce: (x) => { finita = x; } });
      const cod = await D.creaCodifica({ supporto: sup, canvas: tela, contestoAudio: ac, nodoAudio: live, nodoVod: vod, fps: 30, kbps: 1500, riserva, spedizione: sped });
      const avvio = await (await fetch('/avvio?f=o', { method: 'POST', body: JSON.stringify({ video: cod.config.video, audio: cod.config.audio, vod: cod.vod }) })).json();
      if (!avvio.ok) return { avvio };
      sped.usaTurno(avvio.turno);
      await fetch(`/api/diretta/riserva?f=o&t=${avvio.turno}`, { method: 'POST', body: cod.riserva });
      await cod.parti();
      await new Promise((ok) => setTimeout(ok, secondi * 1000));
      await cod.ferma(); await sped.ferma();
      return { ok: true, vod: avvio.vod, chiesto: cod.vod, finita };
    }, { secondi: SECONDI });
    assert.equal(esito.ok, true, JSON.stringify(esito));
    assert.equal(esito.chiesto && esito.vod, true, 'il dispositivo chiede la traccia del VOD e il server la apre');
    assert.equal(esito.finita, null);
  } finally {
    await browser.close();
    tramite.ferma('prova');
    srv.close();
    await new Promise((ok) => { if (ricevitore.exitCode !== null) return ok(); ricevitore.on('exit', ok); setTimeout(ok, 10_000); });
    if (ricevitore.exitCode === null) ricevitore.kill('SIGKILL');
  }
  const pts = (k) => spawnSync(FFPROBE, ['-v', 'error', '-select_streams', `a:${k}`, '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', uscita], { encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
  const [p0, p1] = [pts(0), pts(1)];
  assert.ok(p0.length > SECONDI * 40, `arriva il live: ${p0.length} pacchetti`);
  assert.deepEqual(p1, p0, 'il VOD ha gli stessi istanti del live, pacchetto per pacchetto');
  const pcm = (k) => { const b = spawnSync(FFMPEG, ['-v', 'error', '-i', uscita, '-map', `0:a:${k}`, '-ac', '1', '-ss', '2', '-t', '3', '-f', 's16le', '-'], { maxBuffer: 1 << 26 }).stdout; return new Int16Array(b.buffer, b.byteOffset, b.length >> 1); };
  const [live, vod] = [pcm(0), pcm(1)];
  const e = { live440: energia(live, 440), live880: energia(live, 880), vod440: energia(vod, 440), vod880: energia(vod, 880) };
  assert.ok(e.live440 > 500 && e.live880 > 500, `in diretta voce e musica: ${JSON.stringify(e)}`);
  assert.ok(e.vod440 > 500 && e.vod880 < e.vod440 / 50, `nel VOD la voce sì, la musica no: ${JSON.stringify(e)}`);
});
