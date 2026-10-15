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
import { creaTramite } from '../../src/features/diretta.js';
import { creaRisorse } from '../../src/risorse.js';
import { FFMPEG, FFPROBE } from '../aiuto-diretta.mjs';

const CHROME = process.env.SB_CHROME || ['/usr/bin/google-chrome', '/opt/google/chrome/chrome'].find((f) => existsSync(f)) || null;
const PUBBLICO = new URL('../../src/web/public', import.meta.url).pathname;
const SECONDI = 8;

test('da capo a fondo con Google Chrome: il dispositivo codifica, il tramite copia, arriva una diretta pulita', { skip: (!CHROME && 'serve Google Chrome (SB_CHROME)') || (!FFMPEG && 'serve ffmpeg (SB_FFMPEG)'), timeout: 90_000 }, async (t) => {
  let chromium;
  try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); } catch { t.skip('Playwright non c\'e\''); return; }
  const uscita = join(mkdtempSync(join(tmpdir(), 'diretta-chrome-')), 'arrivato.flv');
  const portaRtmp = await new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
  const ricevitore = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${portaRtmp}/live/prova`, '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  const tramite = creaTramite({ risorse: creaRisorse({ misura: () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 }), cacheMs: 0 }), ffmpeg: FFMPEG, ogniMs: 50 });
  const corpo = (q) => new Promise((ok) => { const c = []; q.on('data', (d) => c.push(d)); q.on('end', () => ok(Buffer.concat(c))); });
  const srv = createServer(async (q, r) => {
    const u = new URL(q.url, 'http://x');
    const rispondi = (e) => { r.statusCode = e.ok ? 200 : 409; r.end(JSON.stringify(e)); };
    if (u.pathname === '/') { r.setHeader('content-type', 'text/html'); return r.end('<!doctype html><title>prova</title>'); }
    if (u.pathname === '/avvio') {
      const { video: v, audio: a } = JSON.parse(await corpo(q));
      return rispondi(tramite.avvia('prova', { destinazioni: [{ id: 'x', nome: 'Locale', url: `rtmp://127.0.0.1:${portaRtmp}/live/prova` }],
        video: { ...v, config: Buffer.from(v.config, 'base64') }, audio: { ...a, config: a.config ? Buffer.from(a.config, 'base64') : null }, kbps: 1500 }));
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
    const esito = await pagina.evaluate(async (secondi) => {
      const D = await import('/js/diretta-codifica.js');
      const sup = await D.supporto({ larghezza: 640, altezza: 360, fps: 30, kbps: 1500 });
      if (!sup.ok) return { supporto: sup.motivo };
      const tela = document.createElement('canvas'); tela.width = 640; tela.height = 360;
      const g = tela.getContext('2d');
      let f = 0; setInterval(() => { g.fillStyle = `hsl(${(f++ * 7) % 360} 80% 50%)`; g.fillRect(0, 0, 640, 360); }, 33);
      const ac = new AudioContext({ sampleRate: 48000 }); await ac.resume();
      const suono = ac.createOscillator(), volume = ac.createGain(); suono.connect(volume); suono.start();
      const riserva = document.createElement('canvas'); riserva.width = 640; riserva.height = 360; riserva.getContext('2d').fillRect(0, 0, 640, 360);
      let finita = null;
      const sped = D.creaSpedizione({ quandoFinisce: (d) => { finita = d; } });
      const cod = await D.creaCodifica({ supporto: sup, canvas: tela, contestoAudio: ac, nodoAudio: volume, fps: 30, kbps: 1500, riserva, spedizione: sped });
      const avvio = await (await fetch('/avvio', { method: 'POST', body: JSON.stringify({ video: cod.config.video, audio: cod.config.audio }) })).json();
      if (!avvio.ok) return { avvio };
      sped.usaTurno(avvio.turno);
      const r = await fetch(`/api/diretta/riserva?t=${avvio.turno}`, { method: 'POST', body: cod.riserva });
      await cod.parti();
      await new Promise((ok) => setTimeout(ok, secondi * 1000));
      await cod.ferma(); await sped.ferma();
      return { ok: true, riserva: r.status, audio: cod.config.audio.codec, finita };
    }, SECONDI);
    assert.equal(esito.ok, true, JSON.stringify(esito));
    assert.equal(esito.riserva, 200, 'la riserva dello stesso codificatore e\' accettata');
    assert.equal(esito.finita, null, 'il server non ha mai chiuso la diretta');
    const st = tramite.stato('prova');
    assert.deepEqual(st.inRiserva, { video: false, audio: false }, 'alla fine va in onda il dispositivo, non la riserva');
    assert.equal(st.errore, '', `il tramite non si lamenta dei tempi: ${st.errore}`);
  } finally {
    await browser.close();
    tramite.ferma('prova');
    srv.close();
  }
  await new Promise((ok) => { ricevitore.on('exit', ok); setTimeout(ok, 10_000); });
  assert.ok(existsSync(uscita) && statSync(uscita).size > 50_000, 'arrivato qualcosa');

  const flussi = JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'json', uscita], { encoding: 'utf8' }).stdout).streams.map((s) => s.codec_name).sort();
  assert.deepEqual(flussi, ['aac', 'h264'], 'H.264 copiato com\'e\', l\'audio in AAC come vogliono le piattaforme');
  const pacchetti = (s) => spawnSync(FFPROBE, ['-v', 'error', '-select_streams', s, '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', uscita], { encoding: 'utf8' }).stdout.trim().split('\n').map(Number);
  const salti = (xs) => xs.slice(1).map((x, i) => x - xs[i]);
  const v = pacchetti('v'), a = pacchetti('a');
  assert.ok(Math.min(...salti(v)) >= 0.010, `due fotogrammi non stanno mai a meno di mezzo intervallo: salto minimo ${Math.min(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.max(...salti(v)) < 0.25, `il video non ha buchi: salto massimo ${Math.max(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.max(...salti(a)) < 0.1, `l'audio non ha buchi: salto massimo ${Math.max(...salti(a)).toFixed(3)} s`);
  const durata = v.at(-1) - v[0];
  assert.ok(durata > SECONDI - 1.5 && durata < SECONDI + 1, `la diretta dura il tempo vero: ${durata.toFixed(2)} s`);
  const decodifica = spawnSync(FFMPEG, ['-v', 'error', '-i', uscita, '-fps_mode', 'passthrough', '-enc_time_base', '1:1000', '-f', 'null', '-'], { encoding: 'utf8' });
  assert.equal(decodifica.stderr.trim(), '', 'si decodifica tutto, senza un errore');
});
