// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL DISPOSITIVO DELLA DIRETTA (src/web/public/js/diretta-*.js, docs/DIRETTA.md).
//
// Le regole che il dispositivo segue quando la rete cambia, il formato dei
// pacchetti che condivide col server, e l'ordine dell'avvio: nessun pacchetto
// parte prima che la diretta esista sul server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decidi, SCALA, livelloH264, scriviPacchi, leggiPacchi } from '../../src/web/public/js/diretta-pacchi.js';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const COD = readFileSync(new URL('../../src/web/public/js/diretta-codifica.js', import.meta.url), 'utf8');
const base = { kbps: 6000, kbpsMeta: 6000, soloAudio: false, calmaMs: 0, dalCambioMs: 10_000 };

test('la rete rallenta: si scende di qualita\', mai sotto il minimo, e non a ogni secondo', () => {
  const d = decidi({ ...base, codaMs: 2500 });
  assert.deepEqual([d.kbps, d.soloAudio, d.cambio], [4200, false, true]);
  assert.equal(decidi({ ...base, codaMs: 2500, dalCambioMs: 1000 }).cambio, false, 'fra due cambi passa un respiro');
  assert.equal(decidi({ ...base, kbps: 900, codaMs: 2500 }).kbps, SCALA.minimoKbps);
  assert.equal(decidi({ ...base, kbps: SCALA.minimoKbps, codaMs: 2500 }).cambio, false, 'al minimo non si scende piu\'');
});

test('la rete quasi ferma: va solo l\'audio, e il video torna da un fotogramma chiave', () => {
  const giu = decidi({ ...base, codaMs: 7000 });
  assert.equal(giu.soloAudio, true);
  assert.equal(decidi({ ...base, soloAudio: true, codaMs: 1000 }).soloAudio, true, 'finche\' la coda non si svuota resta solo audio');
  const su = decidi({ ...base, soloAudio: true, codaMs: 200 });
  assert.deepEqual([su.soloAudio, su.chiave], [false, true]);
});

test('la rete torna buona: si risale piano, fino alla qualita\' scelta e non oltre', () => {
  assert.equal(decidi({ ...base, kbps: 3000, codaMs: 100, calmaMs: 25_000 }).kbps, 3450);
  assert.equal(decidi({ ...base, kbps: 3000, codaMs: 100, calmaMs: 5_000 }).cambio, false, 'serve calma vera prima di salire');
  assert.equal(decidi({ ...base, kbps: 5900, codaMs: 100, calmaMs: 25_000 }).kbps, 6000);
});

test('il livello H.264 regge la risoluzione e i fotogrammi scelti', () => {
  assert.equal(livelloH264(1280, 720, 30), '28');
  assert.equal(livelloH264(1920, 1080, 30), '28');
  assert.equal(livelloH264(1920, 1080, 60), '2a');
  assert.equal(livelloH264(2560, 1440, 30), '32');
  assert.equal(livelloH264(2560, 1440, 60), '33');
});

test('il formato dei pacchetti e\' uno solo: il dispositivo scrive, il server legge lo stesso', () => {
  const pacchi = [{ tipo: 'video', chiave: true, us: 2_000_001, dati: new Uint8Array([1, 2, 3]) }, { tipo: 'audio', chiave: true, us: 2_021_334.5, dati: new Uint8Array([9]) }];
  const letti = leggiPacchi(scriviPacchi(pacchi));
  assert.deepEqual(letti.map((p) => [p.tipo, p.chiave, p.us, [...p.dati]]), [['video', true, 2_000_001, [1, 2, 3]], ['audio', true, 2_021_334.5, [9]]]);
  assert.throws(() => leggiPacchi(scriviPacchi(pacchi).subarray(0, 20)), /pacco/);
});

test('nessun pacchetto parte prima che la diretta esista sul server, e la riserva arriva prima del via', () => {
  const avvio = APP.slice(APP.indexOf('async function avviaLive() {'), APP.indexOf('async function studioControllaStato() {'));
  const i = avvio.indexOf("await api('/api/diretta/avvio'"), j = avvio.indexOf('fetch(`/api/diretta/riserva?t=${encodeURIComponent(turno)}`'), k = avvio.indexOf('await cod.parti();');
  assert.ok(i > 0 && j > i && k > j, `avvio ${i}, riserva ${j}, partenza ${k}`);
  assert.match(avvio, /riprendi: true \} \}\);\n\s+turno = r\.turno; ripresa = r\.ripresa;\n\s+sped\.usaTurno\(turno\);/, 'ogni avvio e\' un turno: i pacchetti partono col turno che il server ha dato');
  const ferma = APP.slice(APP.indexOf('async function fermaLive('), APP.indexOf('function aggiornaTimerStudio()'));
  assert.match(ferma, /if \(!dalServer\) \{ try \{ await api\('\/api\/diretta\/fine', \{ method: 'POST', body: \{ turno: d\?\.turno \} \}\);/, '«Ferma» chiude solo se questa finestra e\' ancora quella che trasmette');
  assert.match(avvio, /catch \(e\) \{\n\s+await cod\.ferma\(\); sped\.ferma\(\);/, 'se il server dice no, il dispositivo si ferma e non manda niente');
});

test('il video lo codifica il dispositivo in H.264, e la riserva nasce dallo stesso codificatore', () => {
  assert.match(COD, /codec: `avc1\.\$\{profilo\}\$\{vincoli\}\$\{livello\}`/);
  assert.match(COD, /hardwareAcceleration: hw/);
  const riserva = COD.indexOf('new VideoFrame(riserva'), parti = COD.indexOf('async function parti()');
  assert.ok(riserva > 0 && riserva < parti, 'la riserva si codifica col codificatore della diretta, prima di partire');
  assert.match(COD, /if \(contestoAudio\.sampleRate !== 48000\) throw/);
});

test('OSify: i suoi canali si riconoscono dal nome e vanno nel mixer, il mix finale no', () => {
  assert.match(APP, /STUDIO\.dev\.osify = STUDIO\.dev\.mics\.filter\(\(d\) => \/osify\/i\.test\(d\.label \|\| ''\) && !\/stream\.\?mix\|master\/i\.test\(d\.label \|\| ''\)\);/);
  assert.match(APP, /ruolo: \/music\|musica\/i\.test\(d\.label\) \? 'media' : 'desk'/);
  assert.match(APP, /echoCancellation: false, noiseSuppression: false, autoGainControl: false/, 'l\'audio del gioco arriva com\'e\', non trattato come una voce');
});

const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function finche(cond, ms = 3000) { for (const fine = Date.now() + ms; Date.now() < fine; await attendi(5)) if (cond()) return; throw new Error('non e\' successo in tempo'); }

test('la spedizione ritenta lo stesso lotto col suo numero, e si ferma quando il server dice che la diretta e\' finita', async () => {
  const { creaSpedizione } = await import('../../src/web/public/js/diretta-codifica.js');
  const vero = globalThis.fetch, chiamate = [], risposte = [{ status: 500 }, { status: 200 }, { status: 409, corpo: { motivo: 'assente' } }];
  globalThis.fetch = async (url, o) => { chiamate.push({ url, corpo: o.body }); const r = risposte.shift() || { status: 200 }; return { ok: r.status < 300, status: r.status, json: async () => r.corpo }; };
  let sped;
  try {
    let finita = null; const tentativi = [];
    sped = creaSpedizione({ ogniMs: 5, quandoFinisce: (d) => { finita = d; }, quandoRitenta: (t) => tentativi.push(t) });
    sped.usaTurno('ab12');
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 1, dati: new Uint8Array([7]) });
    await finche(() => chiamate.length === 2);
    assert.deepEqual(chiamate.map((c) => c.url), ['/api/diretta/pacchi?t=ab12&n=0', '/api/diretta/pacchi?t=ab12&n=0'], 'il ritentativo porta lo stesso numero: il server scarta i doppioni');
    assert.deepEqual(chiamate[0].corpo, chiamate[1].corpo);
    assert.deepEqual(tentativi, [1]);
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 2, dati: new Uint8Array([8]) });
    await finche(() => finita);
    assert.deepEqual(finita, { motivo: 'assente' });
    assert.equal(chiamate[2].url, '/api/diretta/pacchi?t=ab12&n=1');
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 3, dati: new Uint8Array([9]) });
    await attendi(40);
    assert.equal(chiamate.length, 3, 'a diretta finita non parte piu\' niente');
  } finally { sped?.ferma(); globalThis.fetch = vero; }
});

test('la riserva nasce dal codificatore della diretta: due secondi che cominciano da un fotogramma chiave, e il silenzio', async () => {
  const { creaCodifica } = await import('../../src/web/public/js/diretta-codifica.js');
  const finto = (descrizione) => class {
    // come i veri, danno i pacchetti piu' tardi: senza flush la riserva resterebbe vuota
    constructor({ output }) { this.output = output; this.encodeQueueSize = 0; this.primo = true; }
    configure(c) { this.cfg = c; }
    encode(x, o = {}) {
      const chiave = descrizione.length === 2 ? true : !!o.keyFrame;
      const meta = this.primo ? { decoderConfig: { description: descrizione } } : undefined;
      this.primo = false;
      const ts = x.timestamp;
      this.coda = (this.coda || Promise.resolve()).then(() => attendi(1)).then(() => this.output({ type: chiave ? 'key' : 'delta', timestamp: ts, byteLength: 1, copyTo: (d) => d.set([chiave ? 1 : 0]) }, meta));
    }
    async flush() { await this.coda; } close() { }
  };
  const nomi = ['VideoEncoder', 'AudioEncoder', 'VideoFrame', 'AudioData'], prima = nomi.map((n) => globalThis[n]);
  Object.assign(globalThis, {
    VideoEncoder: finto(new Uint8Array([1, 100, 0, 40])), AudioEncoder: finto(new Uint8Array([17, 144])),
    VideoFrame: class { constructor(_s, { timestamp }) { this.timestamp = timestamp; } close() { } },
    AudioData: class { constructor({ timestamp }) { this.timestamp = timestamp; } close() { } },
  });
  try {
    const sup = { video: { cfg: { width: 1280, height: 720 } }, audio: { cfg: { codec: 'mp4a.40.2' }, nome: 'aac' } };
    const cod = await creaCodifica({ supporto: sup, fps: 30, kbps: 3000, riserva: {}, spedizione: { aggiungi() { throw new Error('la riserva non si spedisce come diretta'); } } });
    const pacchi = leggiPacchi(cod.riserva);
    const video = pacchi.filter((p) => p.tipo === 'video'), audio = pacchi.filter((p) => p.tipo === 'audio');
    assert.equal(video.length, 60);
    assert.equal(video[0].chiave, true, 'il server riparte dalla riserva: deve cominciare da un fotogramma chiave');
    assert.equal(audio.length, 47);
    assert.ok(audio.at(-1).us + 1024 * 1e6 / 48000 >= 1_000_000, 'un secondo di silenzio, che il server ripete in giro');
    assert.deepEqual([cod.config.video.config, cod.config.audio.config, cod.config.audio.codec], ['AWQAKA==', 'EZA=', 'aac']);
  } finally { nomi.forEach((n, i) => { globalThis[n] = prima[i]; }); }
});
