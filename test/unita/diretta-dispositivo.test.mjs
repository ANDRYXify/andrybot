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
  const avvio = APP.slice(APP.indexOf('async function studioAvviaFormato('), APP.indexOf('async function studioControllaStato() {'));
  const i = avvio.indexOf("await studioAvvioPaziente(() => api('/api/diretta/avvio', { method: 'POST', body: { formato: f,"), j = avvio.indexOf('fetch(`/api/diretta/riserva?f=${f}&t=${encodeURIComponent(turno)}`'), k = avvio.indexOf('await cod.parti();');
  assert.ok(i > 0 && j > i && k > j, `avvio ${i}, riserva ${j}, partenza ${k}`);
  assert.match(avvio, /riprendi: true, vod: !!cod\.vod \} \}\)\);\n\s+turno = r\.turno; ripresa = r\.ripresa; vodPartito = !!r\.vod;\n\s+sped\.usaTurno\(turno\);/, 'ogni avvio e\' un turno: i pacchetti partono col turno che il server ha dato');
  // Mentre il bot si aggiorna (docs/AGGIORNARE.md) l'avvio si riprova da solo:
  // solo per quello o per il server giu', e non per sempre.
  const paziente = APP.slice(APP.indexOf('async function studioAvvioPaziente('), APP.indexOf('async function avviaLive() {'));
  assert.match(paziente, /const fino = Date\.now\(\) \+ 3 \* 60_000;/);
  assert.match(paziente, /const aggiorna = e\?\.dati\?\.motivo === 'aggiornamento';\n\s+const giu = !e\?\.dati && \(e instanceof TypeError \|\| \/\^errore 50\[234\]\$\/\.test\(e\?\.message \|\| ''\)\);\n\s+if \(!\(aggiorna \|\| giu\) \|\| Date\.now\(\) > fino\) throw e;/, 'ogni altro rifiuto si dice subito');
  const ferma = APP.slice(APP.indexOf('async function fermaLive('), APP.indexOf('function aggiornaTimerStudio()'));
  assert.match(ferma, /if \(!dalServer\) \{ try \{ await api\('\/api\/diretta\/fine', \{ method: 'POST', body: \{ turno: d\.turno, formato: f \} \}\);/, '«Ferma» chiude solo se questa finestra e\' ancora quella che trasmette, formato per formato');
  assert.match(avvio, /for \(const f of formati\) \{[\s\S]*?partite\.push\(await studioAvviaFormato\(D, f, sup, q, kbps, per\[f\], testo, assenzaMin, margine\)\)/, 'una diretta per ogni formato acceso, ognuna con le sue destinazioni (e il margine scelto)');
  assert.match(avvio, /creaCodifica\(\{\s*supporto: sup, canvas: studioTela\(f\)/, 'ogni formato codifica la sua tela');
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
    assert.deepEqual(chiamate.map((c) => c.url), ['/api/diretta/pacchi?f=o&t=ab12&n=0', '/api/diretta/pacchi?f=o&t=ab12&n=0'], 'il ritentativo porta lo stesso numero: il server scarta i doppioni');
    assert.deepEqual(chiamate[0].corpo, chiamate[1].corpo);
    assert.deepEqual(tentativi, [1]);
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 2, dati: new Uint8Array([8]) });
    await finche(() => finita);
    assert.deepEqual(finita, { motivo: 'assente' });
    assert.equal(chiamate[2].url, '/api/diretta/pacchi?f=o&t=ab12&n=1');
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

// Lato dispositivo (docs/DIRETTA.md, «Ritardo, scatti e riserva»).
test('la spedizione batte sull\'orologio della diretta, anche coi timer del browser strozzati, e fa la chiave che il server chiede', async () => {
  const { creaSpedizione } = await import('../../src/web/public/js/diretta-codifica.js');
  const chiamate = [];
  let chiavi = 0;
  const sped = creaSpedizione({ ogniMs: 200, quandoChiave: () => { chiavi++; }, fetch: async (url) => { chiamate.push(Date.now()); return { ok: true, status: 200, json: async () => ({ ok: true, chiave: chiamate.length === 1 }) }; } });
  try {
    sped.usaTurno('t1');
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 1, dati: new Uint8Array([1]) });
    await attendi(20);
    const t0 = Date.now();
    sped.batti(10_000);
    await finche(() => chiamate.length === 1, 500);
    assert.ok(chiamate[0] - t0 < 150, 'col battito parte subito, senza aspettare il timer (che a scheda nascosta si strozza)');
    await finche(() => chiavi === 1, 500);
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 2, dati: new Uint8Array([2]) });
    await attendi(20);
    sped.batti(10_100);
    await attendi(60);
    assert.equal(chiamate.length, 1, 'non piu\' di un lotto ogni 200 ms di diretta');
    sped.batti(10_200);
    await finche(() => chiamate.length === 2, 500);
    assert.equal(chiavi, 1, 'la chiave si fa solo quando il server la chiede');
    const t1 = Date.now();
    await sped.ferma();
    assert.ok(Date.now() - t1 < 150, 'fermata si ferma subito: un formato che chiude non resta muto ad aspettare un timer');
  } finally { sped.ferma(); }
});

test('un fotogramma chiave ogni due secondi, e ogni fotogramma codificato e\' un fotogramma appena disegnato', async () => {
  const { creaCodifica } = await import('../../src/web/public/js/diretta-codifica.js');
  const codificati = [];
  const finto = (video) => class {
    constructor({ output }) { this.output = output; this.encodeQueueSize = 0; this.primo = true; }
    configure() { } close() { }
    encode(x, o = {}) {
      if (video && this.inDiretta) codificati.push({ ts: x.timestamp, chiave: !!o.keyFrame, disegno: x.disegno });
      const meta = this.primo ? { decoderConfig: { description: new Uint8Array([1, 2]) } } : undefined;
      this.primo = false;
      this.output({ type: o.keyFrame ? 'key' : 'delta', timestamp: x.timestamp, byteLength: 1, copyTo: (d) => d.set([1]) }, meta);
    }
    async flush() { }
  };
  let disegni = 0, tempo = 0;
  const nomi = ['VideoEncoder', 'AudioEncoder', 'VideoFrame', 'AudioData', 'AudioWorkletNode'], prima = nomi.map((n) => globalThis[n]);
  const oraVera = performance.now;
  let nodo = null;
  Object.assign(globalThis, {
    VideoEncoder: finto(true), AudioEncoder: finto(false),
    VideoFrame: class { constructor(_s, { timestamp }) { this.timestamp = timestamp; this.disegno = disegni; } close() { } },
    AudioData: class { constructor({ timestamp }) { this.timestamp = timestamp; } close() { } },
    AudioWorkletNode: class { constructor() { nodo = this; this.port = {}; } connect() { } disconnect() { } },
  });
  const nodoAudio = { connect() { }, disconnect() { } };
  const contestoAudio = { sampleRate: 48000, audioWorklet: { addModule: async () => { } }, createGain: () => ({ gain: {}, connect() { }, disconnect() { } }), destination: {} };
  try {
    const sup = { video: { cfg: { width: 1280, height: 720 } }, audio: { cfg: { codec: 'mp4a.40.2' }, nome: 'aac' } };
    const sped = { aggiungi() { }, batti() { }, ritardoMs: () => 0, togliVideo() { } };
    const cod = await creaCodifica({ supporto: sup, fps: 30, kbps: 3000, riserva: {}, spedizione: sped, contestoAudio, nodoAudio, canvas: {}, disegna: () => { disegni++; } });
    VideoEncoder.prototype.inDiretta = true;
    performance.now = () => tempo;
    await cod.parti();
    for (let i = 0; i < 48000 * 5 / 128; i++) { tempo += 128 / 48; nodo.port.onmessage({ data: [new Float32Array(128), new Float32Array(128)] }); }
    const chiavi = codificati.map((c, i) => (c.chiave ? i : -1)).filter((i) => i >= 0);
    assert.ok(codificati.length >= 148 && codificati.length <= 151, `cinque secondi a 30 fotogrammi: ${codificati.length}`);
    assert.deepEqual(chiavi, [0, 60, 120], 'una chiave ogni 60 fotogrammi: le piattaforme tagliano i segmenti li\', e lo spettatore entra subito');
    assert.equal(disegni, codificati.length, 'tanti disegni quanti fotogrammi: niente doppioni ne\' salti');
    assert.ok(codificati.every((c, i) => c.disegno === i + 1), 'ogni fotogramma si prende subito dopo il suo disegno');
    cod.forzaChiave();
    tempo += 34; nodo.port.onmessage({ data: [new Float32Array(128), new Float32Array(128)] });
    assert.equal(codificati.at(-1).chiave, true, 'la chiave chiesta dal server arriva sul fotogramma dopo');
    await cod.ferma();
  } finally { performance.now = oraVera; nomi.forEach((n, i) => { globalThis[n] = prima[i]; }); }
});

test('a diretta accesa la tela in onda la disegna solo l\'orologio della diretta', () => {
  assert.match(APP, /for \(const f of \['o', 'v'\]\) if \(studioFormatoServe\(f\) && !STUDIO\.dirette\[f\]\?\.cod\) studioDisegnaProgramma\(f, ora\);/, 'il ciclo dello schermo non ridisegna una tela che si sta codificando');
  assert.match(APP, /disegna: \(\) => studioDisegnaUnaVolta\(f\)/);
  assert.match(APP, /quandoChiave: \(\) => cod\?\.forzaChiave\(\)/);
});

// La traccia del VOD (docs/DIRETTA.md, «Tracce audio e VOD»): il pacco ha il
// suo tipo, e il dispositivo lo mette in coda subito dopo il suo audio, anche
// quando i due codificatori finiscono in ordine diverso.
test('il pacco del VOD ha il suo tipo, e il formato lo porta intatto', () => {
  const ritorno = leggiPacchi(scriviPacchi([{ tipo: 'audio', us: 10, chiave: true, dati: new Uint8Array([1]) }, { tipo: 'vod', us: 10, chiave: true, dati: new Uint8Array([2]) }]));
  assert.deepEqual(ritorno.map((p) => [p.tipo, p.us, p.dati[0]]), [['audio', 10, 1], ['vod', 10, 2]]);
  const storto = scriviPacchi([{ tipo: 'audio', us: 1, chiave: true, dati: new Uint8Array([1]) }]); storto[0] = 4;
  assert.throws(() => leggiPacchi(storto), /pacco storto/);
});

test('audio e VOD escono a coppie, prima il live e poi il suo gemello, in qualunque ordine finiscano i codificatori', async () => {
  const { creaCoppie, ATTESA_GEMELLI } = await import('../../src/web/public/js/diretta-codifica.js');
  const usciti = [], accoppia = creaCoppie((p) => usciti.push(`${p.tipo}@${p.us}`));
  accoppia({ tipo: 'vod', us: 0 }); accoppia({ tipo: 'audio', us: 0 });
  accoppia({ tipo: 'audio', us: 21 }); accoppia({ tipo: 'audio', us: 42 }); accoppia({ tipo: 'vod', us: 21 }); accoppia({ tipo: 'vod', us: 42 });
  assert.deepEqual(usciti, ['audio@0', 'vod@0', 'audio@21', 'vod@21', 'audio@42', 'vod@42']);
  usciti.length = 0;
  for (let i = 0; i <= ATTESA_GEMELLI; i++) accoppia({ tipo: 'audio', us: 1000 + i });
  assert.equal(usciti.length, ATTESA_GEMELLI + 1, 'se il codificatore del VOD si ferma, il live non aspetta');
  assert.ok(usciti.every((x) => x.startsWith('audio@')));
});

// IL MARGINE, DAL BROWSER (docs/DIRETTA.md, «Il margine: un intoppo non e' un
// "torno subito"»): una spedizione non resta appesa, un lotto troppo grande si
// divide, un accesso scaduto ferma e lo dice.
const risposta = (status, corpo = null) => ({ ok: status < 300, status, json: async () => corpo });
const appesa = (o) => new Promise((_, no) => { o.signal?.addEventListener('abort', () => no(new DOMException('fermato', 'AbortError'))); });

test('un invio appeso si riprova dopo il suo tempo massimo, con lo stesso numero; e il battito dell\'audio lo sblocca anche col timer strozzato', async () => {
  const { creaSpedizione, TEMPO_INVIO_MS } = await import('../../src/web/public/js/diretta-codifica.js');
  assert.equal(TEMPO_INVIO_MS, 5000);
  const chiamate = [], tentativi = [];
  const sped = creaSpedizione({ ogniMs: 5, tempoMaxMs: 40, quandoRitenta: (t) => tentativi.push(t), fetch: (url, o) => { chiamate.push({ url, corpo: o.body }); return chiamate.length === 1 ? appesa(o) : Promise.resolve(risposta(200, { ok: true })); } });
  try {
    sped.usaTurno('t1');
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 1, dati: new Uint8Array([1]) });
    await finche(() => chiamate.length === 2, 3000);
    assert.deepEqual(chiamate.map((c) => c.url), ['/api/diretta/pacchi?f=o&t=t1&n=0', '/api/diretta/pacchi?f=o&t=t1&n=0'], 'lo stesso lotto, lo stesso numero: il server scarta i doppioni');
    assert.deepEqual(chiamate[0].corpo, chiamate[1].corpo);
    assert.deepEqual(tentativi, [1]);
  } finally { sped.ferma(); }
  // a scheda nascosta il timer si strozza: il battito dell'audio basta da solo
  const altre = [];
  const due = creaSpedizione({ ogniMs: 5, tempoMaxMs: 60_000, fetch: (url, o) => { altre.push(url); return altre.length === 1 ? appesa(o) : Promise.resolve(risposta(200, { ok: true })); } });
  try {
    due.usaTurno('t2');
    due.aggiungi({ tipo: 'audio', chiave: true, us: 1, dati: new Uint8Array([1]) });
    await finche(() => altre.length === 1, 3000);
    due.batti(performance.now() + 61_000);
    await finche(() => altre.length === 2, 3000);
    assert.equal(altre[1], '/api/diretta/pacchi?f=o&t=t2&n=0');
  } finally { due.ferma(); }
});

test('un lotto troppo grande per il server (413) si divide in due, senza separare un audio dal suo gemello del VOD, e i numeri restano in fila', async () => {
  const { creaSpedizione, tagliaLotto } = await import('../../src/web/public/js/diretta-codifica.js');
  const { leggiPacchi: leggi } = await import('../../src/web/public/js/diretta-pacchi.js');
  const chiamate = [];
  const sped = creaSpedizione({ ogniMs: 5, fetch: async (url, o) => { chiamate.push({ url, pacchi: leggi(o.body).map((p) => `${p.tipo}@${p.us}`) }); return risposta(chiamate.length === 1 ? 413 : 200, { ok: true }); } });
  try {
    sped.usaTurno('t1');
    for (const [tipo, us] of [['video', 0], ['audio', 10], ['vod', 10], ['video', 33]]) sped.aggiungi({ tipo, chiave: true, us, dati: new Uint8Array([1]) });
    await finche(() => chiamate.length === 3, 3000);
    assert.deepEqual(chiamate.map((c) => c.url.split('&n=')[1]), ['0', '0', '1'], 'la prima meta\' tiene il numero che il server non ha mai preso');
    assert.deepEqual(chiamate[1].pacchi.concat(chiamate[2].pacchi), chiamate[0].pacchi, 'le due meta\' sono il lotto intero, nell\'ordine');
    assert.deepEqual([chiamate[1].pacchi, chiamate[2].pacchi], [['video@0', 'audio@10', 'vod@10'], ['video@33']], 'il gemello del VOD resta col suo audio');
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 50, dati: new Uint8Array([1]) });
    await finche(() => chiamate.length === 4, 3000);
    assert.match(chiamate[3].url, /&n=2$/);
  } finally { sped.ferma(); }
  assert.deepEqual(tagliaLotto([{ tipo: 'audio' }, { tipo: 'vod' }]).map((x) => x.length), [1, 1]);
});

test('un accesso scaduto o da riconfermare (401) ferma la spedizione e lo dice: niente ritentativi all\'infinito', async () => {
  const { creaSpedizione } = await import('../../src/web/public/js/diretta-codifica.js');
  const chiamate = [];
  let finita = null;
  const sped = creaSpedizione({ ogniMs: 5, quandoFinisce: (d) => { finita = d; }, quandoRitenta: () => { throw new Error('un 401 non si riprova'); }, fetch: async (url) => { chiamate.push(url); return risposta(401, { errore: 'seconda-prova', vai: '/seconda-prova' }); } });
  try {
    sped.usaTurno('t1');
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 1, dati: new Uint8Array([1]) });
    await finche(() => finita, 3000);
    assert.deepEqual(finita, { errore: 'seconda-prova', vai: '/seconda-prova', motivo: 'accesso' });
    sped.aggiungi({ tipo: 'audio', chiave: true, us: 2, dati: new Uint8Array([2]) });
    await attendi(60);
    assert.equal(chiamate.length, 1, 'dopo il 401 non parte piu\' niente');
  } finally { sped.ferma(); }
  // lo Studio lo dice, la diretta sul server resta con la riserva, e la pagina
  // in diretta non si sposta da sola sull'ingresso
  assert.match(APP, /accesso: \(\) => L\('Il tuo accesso è scaduto o va riconfermato: la diretta continua con la riserva\. Rientra e premi «Riprendi la diretta»\.'/);
  assert.match(APP, /\/\^\\\/\(ingresso\|seconda-prova\)\$\/\.test\(dati\.vai\) && !_nonSpostare\) \{ location\.href = dati\.vai; \}/);
  const ferma = APP.slice(APP.indexOf('async function fermaLive('), APP.indexOf('function aggiornaTimerStudio()'));
  assert.match(ferma, /const accesso = dalServer\?\.motivo === 'accesso';\n\s+_nonSpostare = accesso;\n\s+if \(accesso\) studioRenderRientra\(dalServer\.vai\);\n\s+else caricaDiretta\(\)/);
  assert.match(ferma, /if \(!dalServer\) \{ try \{ await api\('\/api\/diretta\/fine'/, 'con l\'accesso scaduto non si chiude la diretta sul server');
});

test('il margine si sceglie nello Studio (di serie 3 secondi, da 1 a 8) e va all\'avvio; la barra della salute conta le riserve con la causa', () => {
  assert.match(APP, /<select id="studio-margine"[^>]*>\n\s+\$\{\[1, 2, 3, 4, 5, 6, 7, 8\]\.map\(\(n\) => `<option value="\$\{n\}"\$\{n === 3 \? ' selected' : ''\}>/);
  assert.match(APP, /const margine = Number\(document\.getElementById\('studio-margine'\)\?\.value\) \|\| 3;/);
  assert.match(APP, /kbps, assenzaMin, margine, riprendi: true/);
  assert.match(APP, /margine: Number\(st\.margine\) \|\| 0, scorta: Number\(st\.scorta\) \|\| 0, riserve: st\.riserve \|\| null,/);
  assert.match(APP, /voci\.push\(\{ k: 'riserve',/);
});
