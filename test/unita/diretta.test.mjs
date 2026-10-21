// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL TRAMITE DELLA DIRETTA (src/features/diretta.js, docs/DIRETTA.md «La beta»).
//
// Si prova da capo a fondo: pacchetti H.264 e AAC veri, un ricevitore RTMP
// locale, e un dispositivo che sparisce per tre secondi a meta' diretta. La
// diretta deve arrivare intera, senza buchi, col video copiato e mai
// ricodificato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { creaTramite, argomenti, indirizzoBuono } from '../../src/features/diretta.js';
import { scriviPacchi } from '../../src/features/diretta-mkv.js';
import { creaRisorse } from '../../src/risorse.js';
import { FFMPEG, materiale, pacchetti, sonda } from '../aiuto-diretta.mjs';

const calma = () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 });
const risorseCalme = () => creaRisorse({ misura: calma, cacheMs: 0 });
const DEST = [{ id: 'a', nome: 'Prova', url: 'rtmp://127.0.0.1:1935/live/chiave-segreta' }];
const CONF = { video: { codec: 'avc1', config: Buffer.from([1, 77, 0, 31, 255, 225, 0, 0, 1, 0, 0]), larghezza: 320, altezza: 180, fps: 30 }, audio: { codec: 'aac', config: Buffer.from([17, 144]), frequenza: 48000, canali: 2 } };

test('il video si copia e basta: nessun codificatore video, l\'audio si converte solo se e\' Opus', () => {
  const aac = argomenti(DEST, 'aac'), opus = argomenti(DEST, 'opus');
  assert.deepEqual(aac.slice(aac.indexOf('-c:v'), aac.indexOf('-c:v') + 2), ['-c:v', 'copy']);
  for (const a of [aac, opus]) assert.ok(!a.some((x) => /libx26|h264_|hevc_|libvpx|libaom|nvenc|vaapi|qsv/.test(x)), a.join(' '));
  assert.deepEqual(aac.slice(aac.indexOf('-c:a'), aac.indexOf('-c:a') + 2), ['-c:a', 'copy']);
  assert.deepEqual(opus.slice(opus.indexOf('-c:a'), opus.indexOf('-c:a') + 2), ['-c:a', 'aac']);
  assert.match(aac.at(-1), /^\[f=flv:onfail=ignore:flvflags=no_duration_filesize\]rtmp:\/\//, 'una destinazione che cade non ferma le altre');
});

test('solo indirizzi RTMP puliti: niente che possa rompere l\'elenco delle destinazioni', () => {
  assert.ok(indirizzoBuono('rtmp://live.twitch.tv/app/abc_123'));
  assert.ok(indirizzoBuono('rtmps://fa723fc1b171.global-contribute.live-video.net/app/sk_abc'));
  for (const no of ['http://x/y', 'rtmp://x', 'rtmp://x/a|rtmp://y/b', 'rtmp://x/[y]', 'rtmp://x/a b', 'rtmp://x/a\\b', 'file:///etc/passwd']) assert.ok(!indirizzoBuono(no), no);
});

test('chi entra passa dallo scudo, una diretta a testa, e la banda dichiarata ha un tetto', () => {
  const finti = [];
  const r = creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: () => { const p = { stdin: { write() {}, end() {}, on() {}, writable: true, writableLength: 0 }, stderr: { on() {} }, on() {}, exitCode: null, kill() {}, pid: 0 }; finti.push(p); return p; } });
  const t = creaTramite({ risorse: r, bandaMbps: 10, ogniMs: 0 });
  assert.equal(t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 4000 }).ok, true);
  assert.equal(t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 4000 }).motivo, 'gia');
  assert.equal(t.avvia('luigi', { destinazioni: [...DEST, { id: 'b', url: 'rtmp://x/y/z' }], ...CONF, kbps: 4000 }).motivo, 'banda', '4 + 8 Mbps oltre l\'80% di 10');
  assert.equal(t.avvia('anna', { destinazioni: [{ id: 'x', url: 'http://no/no' }], ...CONF, kbps: 1000 }).motivo, 'destinazioni');
  assert.equal(t.avvia('anna', { destinazioni: DEST, ...CONF, video: { ...CONF.video, codec: 'vp8' }, kbps: 1000 }).motivo, 'video', 'il video lo codifica il dispositivo in H.264');
  t.ferma('mario');
  assert.equal(r.stato().classi.diretta.inCorso, 0, 'finita la diretta il permesso torna');
});

test('chi manda piu\' di quanto ha dichiarato viene fermato', () => {
  let adesso = 1_000_000;
  const r = creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: () => ({ stdin: { write() {}, end() {}, on() {}, writable: true, writableLength: 0 }, stderr: { on() {} }, on() {}, exitCode: null, kill() {} }) });
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const { turno } = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 1000 });
  const grosso = scriviPacchi([{ tipo: 'video', chiave: true, us: 0, dati: new Uint8Array(400_000) }]);
  for (let i = 0; i < 12; i++) { adesso += 1_000; t.pacchi('mario', i, grosso, turno); }
  assert.equal(t.attiva('mario'), false);
  assert.equal(t.stato('mario').ultimaFine.motivo, 'troppo');
});

function finto() {
  const scritto = [];
  const proc = { stdin: { write(b) { scritto.push(Buffer.from(b)); }, end() {}, on() {}, writable: true, writableLength: 0 }, stderr: { on() {} }, on() {}, exitCode: null, kill() {} };
  return { scritto, r: creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: () => proc }) };
}
const pacco = (tipo, us, chiave, segno) => ({ tipo, us, chiave, dati: Buffer.from(segno) });

test('dopo la riserva il video riprende solo da un fotogramma chiave', () => {
  let adesso = 1_000_000;
  const { scritto, r } = finto();
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const { turno } = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'RISERVA-K'), pacco('video', 33_333, false, 'RISERVA-P'), pacco('audio', 0, true, 'SILENZIO'), pacco('audio', 21_333, true, 'SILENZIO')]), turno);
  t.pacchi('mario', 0, scriviPacchi([pacco('video', 0, true, 'VIVO-K1'), pacco('audio', 0, true, 'VOCE')]), turno);
  adesso += 3_000;
  t.curaTempo('mario');
  assert.equal(t.stato('mario').inRiserva.video, true, 'col video fermo da tre secondi va la riserva');
  t.pacchi('mario', 1, scriviPacchi([pacco('video', 3_000_000, false, 'VIVO-P-ORFANO'), pacco('video', 3_033_333, true, 'VIVO-K2')]), turno);
  const tutto = Buffer.concat(scritto).toString('latin1');
  assert.ok(!tutto.includes('VIVO-P-ORFANO'), 'un fotogramma che dipende da quelli persi non va in onda');
  assert.ok(tutto.includes('VIVO-K2') && tutto.indexOf('RISERVA-K') < tutto.indexOf('VIVO-K2'), 'si riprende dal fotogramma chiave, dopo la riserva');
  assert.equal(t.stato('mario').inRiserva.video, false);
});

// Le tre cause della diretta «super in ritardo», a scatti, in «torno subito»
// (docs/DIRETTA.md, «Ritardo, scatti e riserva»), lato server.
test('aspettando il fotogramma chiave la riserva resta in onda, e il server lo chiede al dispositivo', () => {
  let adesso = 1_000_000;
  const { scritto, r } = finto();
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const { turno } = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'RISERVA-K'), pacco('video', 33_333, false, 'RISERVA-P'), pacco('audio', 0, true, 'SILENZIO'), pacco('audio', 21_333, true, 'SILENZIO')]), turno);
  assert.deepEqual(t.pacchi('mario', 0, scriviPacchi([pacco('video', 0, true, 'VIVO-K1'), pacco('audio', 0, true, 'VOCE')]), turno), { ok: true, chiave: false });
  adesso += 3_000;
  t.curaTempo('mario');
  const conta = () => (Buffer.concat(scritto).toString('latin1').match(/RISERVA-/g) || []).length;
  const prima = conta();
  const r1 = t.pacchi('mario', 1, scriviPacchi([pacco('video', 3_000_000, false, 'VIVO-P'), pacco('audio', 3_000_000, true, 'VOCE2')]), turno);
  assert.equal(r1.chiave, true, 'chi aspetta una chiave la chiede: il dispositivo la fa sul fotogramma dopo');
  adesso += 1_000;
  t.curaTempo('mario');
  assert.ok(conta() > prima, 'un fotogramma senza chiave non conta come arrivato: la riserva continua, niente fermo immagine');
  assert.equal(t.stato('mario').inRiserva.video, true);
  const r2 = t.pacchi('mario', 2, scriviPacchi([pacco('video', 4_000_000, true, 'VIVO-K2')]), turno);
  assert.equal(r2.chiave, false);
  assert.equal(t.stato('mario').inRiserva.video, false);
});

test('al rientro un fotogramma rimasto in coda si scarta: l\'orologio della diretta non si sposta di tutto il buco', () => {
  let adesso = 1_000_000;
  const { scritto, r } = finto();
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const { turno } = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'RISERVA-K'), pacco('audio', 0, true, 'SILENZIO'), pacco('audio', 21_333, true, 'SILENZIO')]), turno);
  t.pacchi('mario', 0, scriviPacchi([pacco('video', 0, true, 'VIVO-K1'), pacco('audio', 0, true, 'VOCE')]), turno);
  adesso += 8_000;
  t.curaTempo('mario');
  t.pacchi('mario', 1, scriviPacchi([pacco('video', 500_000, true, 'VIVO-VECCHIO'), pacco('video', 7_800_000, true, 'VIVO-FRESCO'), pacco('video', 7_833_333, false, 'VIVO-DOPO')]), turno);
  const tutto = Buffer.concat(scritto).toString('latin1');
  assert.ok(!tutto.includes('VIVO-VECCHIO'), 'otto secondi indietro: quel pezzo l\'ha gia\' coperto la riserva');
  assert.ok(tutto.includes('VIVO-FRESCO') && tutto.includes('VIVO-DOPO'), 'si riprende dal primo fotogramma chiave fresco');
});

test('una riserva senza fotogramma chiave in testa, o senza audio, si rifiuta', () => {
  const { r } = finto();
  const t = creaTramite({ risorse: r, ogniMs: 0 });
  const { turno } = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  assert.equal(t.riserva('mario', scriviPacchi([pacco('video', 0, false, 'P'), pacco('audio', 0, true, 'A')]), turno).motivo, 'riserva');
  assert.equal(t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'K')]), turno).motivo, 'riserva');
  assert.equal(t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'K'), pacco('audio', 0, true, 'A')]), turno).ok, true);
});

test('senza segnale oltre il tempo scelto la diretta si chiude, e il permesso torna', () => {
  let adesso = 1_000_000;
  const { r } = finto();
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const { turno } = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000, assenzaMaxMs: 60_000 });
  t.pacchi('mario', 0, scriviPacchi([pacco('video', 0, true, 'K'), pacco('audio', 0, true, 'A')]), turno);
  adesso += 59_000; t.curaTempo('mario');
  assert.equal(t.attiva('mario'), true, 'prima del tempo resta in onda');
  adesso += 2_000; t.curaTempo('mario');
  assert.equal(t.attiva('mario'), false);
  assert.equal(t.stato('mario').ultimaFine.motivo, 'assente');
  assert.equal(r.stato().classi.diretta.inCorso, 0);
});

async function portaLibera() {
  return new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
}

async function inDiretta({ secondi, filtro, sposta = () => 0 }) {
  const m = materiale({ secondi, gop: 60 });
  const dir = mkdtempSync(join(tmpdir(), 'tramite-'));
  const uscita = join(dir, 'arrivato.flv');
  const porta = await portaLibera();
  const ricevitore = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porta}/live/prova`, '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  const t = creaTramite({ risorse: risorseCalme(), ffmpeg: FFMPEG, ogniMs: 50 });
  const esito = t.avvia('mario', { destinazioni: [{ id: 'x', nome: 'Locale', url: `rtmp://127.0.0.1:${porta}/live/prova` }], ...m.config, kbps: 3000 });
  assert.equal(esito.ok, true, JSON.stringify(esito));
  const { turno } = esito;
  assert.equal(t.riserva('mario', scriviPacchi([...m.video.slice(0, 60), ...m.audio.slice(0, 47)]), turno).ok, true);
  const tutti = [...m.video, ...m.audio].sort((a, b) => a.us - b.us).filter(filtro).map((p) => ({ ...p, us: p.us + sposta(p) }));
  const inizio = Date.now();
  let n = 0;
  for (let i = 0; i < tutti.length;) {
    const fino = tutti[i].us + 100_000;
    const lotto = [];
    while (i < tutti.length && tutti[i].us < fino) lotto.push(tutti[i++]);
    await new Promise((ok) => setTimeout(ok, Math.max(0, inizio + lotto[0].us / 1000 - Date.now())));
    t.pacchi('mario', n++, scriviPacchi(lotto), turno);
  }
  t.ferma('mario');
  await new Promise((ok) => ricevitore.on('exit', ok));
  return uscita;
}

test('da capo a fondo: la rete non regge il video, resta la voce e l\'immagine di riserva', { skip: !FFMPEG && 'serve ffmpeg (SB_FFMPEG)', timeout: 60_000 }, async () => {
  const uscita = await inDiretta({ secondi: 7, filtro: (p) => p.tipo === 'audio' || p.us < 2_000_000 || p.us >= 4_000_000 });
  const v = pacchetti(uscita, 'v'), a = pacchetti(uscita, 'a');
  const salti = (xs) => xs.slice(1).map((p, i) => p.t - xs[i].t);
  assert.ok(Math.max(...salti(v)) < 0.25, `il video non ha buchi: salto massimo ${Math.max(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.max(...salti(a)) < 0.25, `la voce non si e' mai fermata: salto massimo ${Math.max(...salti(a)).toFixed(3)} s`);
  const durataV = v.at(-1).t - v[0].t, durataA = a.at(-1).t - a[0].t;
  assert.ok(Math.abs(durataV - durataA) < 0.5, `video e voce restano insieme: ${durataV.toFixed(2)} s e ${durataA.toFixed(2)} s`);
});

test('da capo a fondo: il dispositivo sparisce tre secondi e la diretta arriva intera', { skip: !FFMPEG && 'serve ffmpeg (SB_FFMPEG)', timeout: 60_000 }, async () => {
  const m = materiale({ secondi: 6, gop: 60 });
  const dir = mkdtempSync(join(tmpdir(), 'tramite-'));
  const uscita = join(dir, 'arrivato.flv');
  const porta = await portaLibera();
  const ricevitore = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porta}/live/prova`, '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  const t = creaTramite({ risorse: risorseCalme(), ffmpeg: FFMPEG, ogniMs: 50 });
  const esito = t.avvia('mario', { destinazioni: [{ id: 'x', nome: 'Locale', url: `rtmp://127.0.0.1:${porta}/live/prova` }], ...m.config, kbps: 3000 });
  assert.equal(esito.ok, true, JSON.stringify(esito));
  const { turno } = esito;
  const riserva = [...m.video.slice(0, 60), ...m.audio.slice(0, 47)];
  assert.equal(t.riserva('mario', scriviPacchi(riserva), turno).ok, true);

  const BUCO_US = 3_000_000;
  const tutti = [...m.video, ...m.audio].sort((a, b) => a.us - b.us);
  const prima = tutti.filter((p) => p.us < 2_000_000);
  const dopo = tutti.filter((p) => p.us >= 2_000_000).map((p) => ({ ...p, us: p.us + BUCO_US }));
  const inizio = Date.now();
  let n = 0;
  async function manda(lista) {
    for (let i = 0; i < lista.length;) {
      const fino = lista[i].us + 100_000;
      const lotto = [];
      while (i < lista.length && lista[i].us < fino) lotto.push(lista[i++]);
      const quando = inizio + lotto[0].us / 1000;
      await new Promise((ok) => setTimeout(ok, Math.max(0, quando - Date.now())));
      t.pacchi('mario', n++, scriviPacchi(lotto), turno);
    }
  }
  await manda(prima);
  await manda(dopo);
  t.ferma('mario');
  await new Promise((ok) => ricevitore.on('exit', ok));
  assert.ok(existsSync(uscita) && statSync(uscita).size > 10_000, 'arrivato qualcosa');

  const s = sonda(uscita);
  assert.deepEqual(s.streams.map((x) => x.codec_name).sort(), ['aac', 'h264']);
  const v = pacchetti(uscita, 'v'), a = pacchetti(uscita, 'a');
  const salti = (xs) => xs.slice(1).map((p, i) => p.t - xs[i].t);
  assert.ok(Math.max(...salti(v)) < 0.25, `il video non ha buchi: salto massimo ${Math.max(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.min(...salti(v)) > 0, 'i tempi del video vanno sempre avanti');
  assert.ok(Math.max(...salti(a)) < 0.25, `l'audio non ha buchi: salto massimo ${Math.max(...salti(a)).toFixed(3)} s`);
  const durata = v.at(-1).t - v[0].t;
  assert.ok(durata > 8 && durata < 9.6, `la diretta dura quanto il tempo vero (circa 9 s): ${durata.toFixed(2)} s`);
  const chiaviDopoBuco = v.filter((p) => p.chiave && p.t > 2.5);
  assert.ok(chiaviDopoBuco.length >= 2, 'la riserva comincia da un fotogramma chiave, e la diretta riprende da uno');
});

test('una finestra nuova riprende la stessa diretta: la vecchia si ferma, e una codifica diversa ne apre una nuova', () => {
  let adesso = 1_000_000;
  const avviati = [];
  const r = creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: () => { const p = { stdin: { write() {}, end() {}, on() {}, writable: true, writableLength: 0 }, stderr: { on() {} }, on() {}, exitCode: null, kill() {} }; avviati.push(p); return p; } });
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const uno = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  for (let n = 0; n < 4; n++) assert.equal(t.pacchi('mario', n, scriviPacchi([pacco('audio', n * 21_333, true, 'A')]), uno.turno).ok, true);
  assert.equal(t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 }).motivo, 'gia', 'senza chiederlo non si prende la diretta di un altro');
  const due = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000, riprendi: true });
  assert.deepEqual([due.ok, due.ripresa, avviati.length], [true, true, 1], 'stessa codifica: stessa diretta, nessun ffmpeg nuovo');
  assert.notEqual(due.turno, uno.turno);
  assert.equal(t.pacchi('mario', 5, scriviPacchi([pacco('audio', 0, true, 'A')]), uno.turno).motivo, 'altrove', 'la finestra vecchia non manda piu\' niente');
  assert.equal(t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'K'), pacco('audio', 0, true, 'A')]), uno.turno).motivo, 'altrove');
  assert.equal(t.pacchi('mario', 0, scriviPacchi([pacco('video', 0, true, 'K')]), due.turno).doppio, undefined, 'la numerazione riparte con la finestra nuova');
  assert.equal(t.ferma('mario', 'fermata', uno.turno), false, 'la finestra vecchia non puo\' chiudere quella nuova');
  assert.equal(t.attiva('mario'), true);
  const tre = t.avvia('mario', { destinazioni: DEST, ...CONF, video: { ...CONF.video, larghezza: 640, altezza: 360 }, kbps: 3000, riprendi: true });
  assert.deepEqual([tre.ok, !!tre.ripresa, avviati.length], [true, false, 2], 'codifica diversa: la diretta di prima lascia il posto');
  assert.equal(r.stato().classi.diretta.inCorso, 1, 'un permesso solo, anche dopo il cambio');
  assert.equal(t.ferma('mario', 'fermata', tre.turno), true);
  assert.equal(r.stato().classi.diretta.inCorso, 0);
});

test('da capo a fondo: la pagina si ricarica, il dispositivo riparte col suo orologio da zero e la diretta continua intera', { skip: !FFMPEG && 'serve ffmpeg (SB_FFMPEG)', timeout: 60_000 }, async () => {
  const m = materiale({ secondi: 6, gop: 60 });
  const dir = mkdtempSync(join(tmpdir(), 'tramite-'));
  const uscita = join(dir, 'arrivato.flv');
  const porta = await portaLibera();
  const ricevitore = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${porta}/live/prova`, '-c', 'copy', '-y', uscita]);
  await new Promise((ok) => setTimeout(ok, 800));
  const t = creaTramite({ risorse: risorseCalme(), ffmpeg: FFMPEG, ogniMs: 50 });
  const dest = [{ id: 'x', nome: 'Locale', url: `rtmp://127.0.0.1:${porta}/live/prova` }];
  const uno = t.avvia('mario', { destinazioni: dest, ...m.config, kbps: 3000 });
  assert.equal(uno.ok, true, JSON.stringify(uno));
  const riserva = scriviPacchi([...m.video.slice(0, 60), ...m.audio.slice(0, 47)]);
  assert.equal(t.riserva('mario', riserva, uno.turno).ok, true);

  const BUCO_MS = 3_000, RIPARTE_US = 2_000_001;
  const tutti = [...m.video, ...m.audio].sort((a, b) => a.us - b.us);
  const prima = tutti.filter((p) => p.us < 2_000_000).map((p) => ({ ...p, quando: p.us / 1000 }));
  const dopo = tutti.filter((p) => p.us >= 2_000_000).map((p) => ({ ...p, us: p.us - 2_000_000 + RIPARTE_US, quando: p.us / 1000 + BUCO_MS }));
  const inizio = Date.now();
  async function manda(lista, turno) {
    let n = 0;
    for (let i = 0; i < lista.length;) {
      const fino = lista[i].quando + 100;
      const lotto = [];
      while (i < lista.length && lista[i].quando < fino) lotto.push(lista[i++]);
      await new Promise((ok) => setTimeout(ok, Math.max(0, inizio + lotto[0].quando - Date.now())));
      assert.equal(t.pacchi('mario', n++, scriviPacchi(lotto.map(({ quando, ...p }) => p)), turno).ok, true);
    }
  }
  await manda(prima, uno.turno);
  await new Promise((ok) => setTimeout(ok, Math.max(0, inizio + 2_000 + BUCO_MS - 300 - Date.now())));
  const due = t.avvia('mario', { destinazioni: dest, ...m.config, kbps: 3000, riprendi: true });
  assert.deepEqual([due.ok, due.ripresa], [true, true], JSON.stringify(due));
  assert.equal(t.riserva('mario', riserva, due.turno).ok, true);
  await manda(dopo, due.turno);
  assert.deepEqual(t.stato('mario').inRiserva, { video: false, audio: false }, 'alla fine va in onda la finestra nuova, non la riserva');
  t.ferma('mario');
  await new Promise((ok) => ricevitore.on('exit', ok));
  assert.ok(existsSync(uscita) && statSync(uscita).size > 10_000, 'arrivato qualcosa');

  const v = pacchetti(uscita, 'v'), a = pacchetti(uscita, 'a');
  const salti = (xs) => xs.slice(1).map((p, i) => p.t - xs[i].t);
  assert.ok(Math.max(...salti(v)) < 0.25, `il video non ha buchi: salto massimo ${Math.max(...salti(v)).toFixed(3)} s`);
  assert.ok(Math.min(...salti(v)) > 0, 'i tempi del video vanno sempre avanti');
  assert.ok(Math.max(...salti(a)) < 0.25, `l'audio non ha buchi: salto massimo ${Math.max(...salti(a)).toFixed(3)} s`);
  const durata = v.at(-1).t - v[0].t;
  assert.ok(durata > 8 && durata < 9.6, `la diretta dura quanto il tempo vero (circa 9 s): ${durata.toFixed(2)} s`);
});

function conta(scritto, segno) { return Buffer.concat(scritto).toString('latin1').split(segno).length - 1; }

test('dopo la ripresa, finche\' non arriva il fotogramma chiave della finestra nuova, la riserva resta in onda anche per l\'audio', () => {
  let adesso = 1_000_000;
  const { scritto, r } = finto();
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const uno = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  t.riserva('mario', scriviPacchi([pacco('video', 0, true, 'RISERVA-K'), pacco('audio', 0, true, 'SILENZIO'), pacco('audio', 21_333, true, 'SILENZIO')]), uno.turno);
  for (let i = 0; i <= 60; i++) { t.pacchi('mario', i, scriviPacchi([pacco('video', i * 1_000_000, true, 'VIVO'), pacco('audio', i * 1_000_000, true, 'VOCE')]), uno.turno); adesso += 1_000; }
  adesso += 2_000; t.curaTempo('mario');
  const due = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000, riprendi: true });
  const prima = conta(scritto, 'SILENZIO');
  for (let i = 0; i < 20; i++) { adesso += 100; t.pacchi('mario', i, scriviPacchi([pacco('audio', 2_000_001 + i * 100_000, true, 'VOCE-SENZA-CHIAVE')]), due.turno); }
  assert.ok(conta(scritto, 'SILENZIO') - prima >= 80, `in due secondi la riserva copre l'audio: ${conta(scritto, 'SILENZIO') - prima} pacchetti di silenzio`);
  assert.equal(conta(scritto, 'VOCE-SENZA-CHIAVE'), 0, 'l\'audio prima dell\'aggancio non va in onda fuori tempo');
});

test('una ricarica veloce con l\'orologio del vecchio dispositivo avanti: il fotogramma chiave nuovo va in onda lo stesso', () => {
  let adesso = 1_000_000;
  const { scritto, r } = finto();
  const t = creaTramite({ risorse: r, ora: () => adesso, ogniMs: 0 });
  const uno = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  t.pacchi('mario', 0, scriviPacchi([pacco('video', 0, true, 'K0'), pacco('audio', 0, true, 'A')]), uno.turno);
  adesso += 2_500;
  t.pacchi('mario', 1, scriviPacchi([pacco('video', 3_000_000, false, 'P-AVANTI'), pacco('audio', 3_000_000, true, 'A')]), uno.turno);
  adesso += 200;
  const due = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000, riprendi: true });
  t.pacchi('mario', 0, scriviPacchi([pacco('video', 2_000_001, true, 'K-NUOVO'), pacco('video', 2_033_334, false, 'P-NUOVO')]), due.turno);
  assert.equal(conta(scritto, 'K-NUOVO'), 1, 'il fotogramma chiave nuovo non si perde dietro a quelli vecchi');
  assert.equal(conta(scritto, 'P-NUOVO'), 1);
});

test('orizzontale e verticale sono due dirette vere: due permessi, la banda di tutte e due, e chi si ferma non ferma l\'altra', () => {
  const avviati = [];
  const r = creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: () => { const p = { stdin: { write() {}, end() {}, on() {}, writable: true, writableLength: 0 }, stderr: { on() {} }, on() {}, exitCode: null, kill() {} }; avviati.push(p); return p; } });
  const t = creaTramite({ risorse: r, bandaMbps: 10, ogniMs: 0 });
  const o = t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 3000 });
  const v = t.avvia('mario#v', { destinazioni: [{ id: 'tt', nome: 'TikTok', url: 'rtmp://127.0.0.1/live/tt' }], ...CONF, video: { ...CONF.video, larghezza: 180, altezza: 320 }, kbps: 3000 });
  assert.deepEqual([o.ok, v.ok, avviati.length], [true, true, 2], 'il tetto «a testa» vale per sessione: una per formato');
  assert.notEqual(o.turno, v.turno);
  assert.equal(t.avvia('luigi', { destinazioni: DEST, ...CONF, kbps: 3000 }).motivo, 'banda', 'la banda conta le due dirette di mario: 6 di 8 Mbps');
  assert.deepEqual(t.stato('mario#v').ids, ['tt']);
  t.ferma('mario#v');
  assert.deepEqual([t.attiva('mario'), t.attiva('mario#v')], [true, false]);
  assert.equal(r.stato().classi.diretta.inCorso, 1);
  t.ferma('mario');
});

test('le rotte scelgono la sessione dal formato, Twitch resta orizzontale, e una destinazione non riceve due formati', () => {
  const srv = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.match(srv, /const sessioneDi = \(login, f\) => String\(login \|\| ''\)\.toLowerCase\(\) \+ \(f === 'v' \? '#v' : ''\);/);
  for (const r of ['tramite.avvia(sessioneDi(login, f)', 'tramite.riserva(sessioneDi(currentUser(req).login, req.query.f)', 'tramite.pacchi(sessioneDi(currentUser(req).login, req.query.f)', "tramite.ferma(sessioneDi(currentUser(req).login, req.body?.formato)", 'tramite.stato(sessioneDi(currentUser(req).login, req.query.f))']) {
    assert.ok(srv.includes(r), r);
  }
  assert.match(srv, /if \(f === 'v' && scelte\.includes\('twitch'\)\) return res\.status\(400\)/);
  assert.match(srv, /if \(altra\.live && \(altra\.ids \|\| \[\]\)\.some\(\(id\) => scelte\.includes\(id\)\)\) return res\.status\(409\)/);
});
