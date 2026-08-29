// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


'use strict';

const btn = document.getElementById('btn');
const statoBox = document.getElementById('stato');
const statoTesto = document.getElementById('statoTesto');
const frasiBox = document.getElementById('frasi');
const logBox = document.getElementById('log');
const noApi = document.getElementById('noApi');

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let rec = null;
let attivo = false;
let frasi = [];
let catCfg = { attivo: false, trigger: 'categoria' };
let titCfg = { attivo: false, trigger: 'titolo' };
let imparaCfg = { attivo: false };
let ultimoImpara = { t: '', ts: 0 };
let timerFrasi = null;
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ultimoScatto = new Map();
const COOLDOWN_MS = 4000;
let logVuoto = true;

let erroriRete = 0;
let backoffMs = 300;
const BACKOFF_MAX = 15000;
const MAX_ERRORI_RETE = 2;

let motore = 'nativo';
try { if (localStorage.getItem('voce_motore') === 'locale') motore = 'locale'; } catch (e) {  }

const WHISPER_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1';
const MODELLO_GPU = 'onnx-community/whisper-base';
const MODELLO_CPU = 'Xenova/whisper-tiny';
const DTYPE_GPU = { encoder_model: 'fp32', decoder_model_merged: 'fp16' };
const FINESTRA_SEC = 5;
const PASSO_MS = 1800;
const MAX_TOKEN = 64;
let motoreAttivo = null;
let asr = null;
let asrInCaricamento = null;
let micStream = null, audioCtx = null, procNode = null, srcNode = null;
let chunkAudio = [];
let campioniTot = 0;
let loopTimer = null;
let trascrivendo = false;

function logga(testo) {
  if (logVuoto) { logBox.innerHTML = ''; logVuoto = false; }
  const ora = new Date().toLocaleTimeString('it-IT');
  const riga = document.createElement('div');
  riga.className = 'riga';
  const spanOra = document.createElement('span');
  spanOra.className = 'ora';
  spanOra.textContent = ora;
  riga.appendChild(spanOra);
  riga.appendChild(document.createTextNode(testo));
  logBox.appendChild(riga);

  while (logBox.childElementCount > 200) logBox.removeChild(logBox.firstChild);
  logBox.scrollTop = logBox.scrollHeight;
}

function aggiornaStato() {
  if (attivo) {
    statoBox.classList.add('on');
    statoTesto.textContent = 'In ascolto…';
    btn.textContent = 'Ferma';
    btn.classList.add('attivo');
  } else {
    statoBox.classList.remove('on');
    statoTesto.textContent = 'Fermo';
    btn.textContent = 'Avvia ascolto';
    btn.classList.remove('attivo');
  }
}

function mostraFrasi() {
  frasiBox.innerHTML = '';
  if (!frasi.length) {
    const v = document.createElement('span');
    v.className = 'vuoto';
    v.textContent = 'Nessuna frase: crea un Modulo con innesco "voce" nella dashboard.';
    frasiBox.appendChild(v);
    return;
  }
  for (const f of frasi) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = f;
    frasiBox.appendChild(chip);
  }
}

async function caricaFrasi() {
  try {
    const res = await fetch('/api/streamer/voce', { headers: { 'Accept': 'application/json' } });
    if (res.status === 401 || res.status === 404) return sessioneScaduta();
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const dati = await res.json();
    frasi = Array.isArray(dati.frasi) ? dati.frasi.map((f) => String(f).toLowerCase()).filter(Boolean) : [];
    if (dati.cat && typeof dati.cat === 'object') {
      catCfg = { attivo: !!dati.cat.attivo, trigger: String(dati.cat.trigger || 'categoria').toLowerCase() };
    }
    if (dati.tit && typeof dati.tit === 'object') {
      titCfg = { attivo: !!dati.tit.attivo, trigger: String(dati.tit.trigger || 'titolo').toLowerCase() };
    }
    if (dati.impara && typeof dati.impara === 'object') {
      imparaCfg = { attivo: !!dati.impara.attivo };
    }
    mostraFrasi();
  } catch (e) {
    logga('non riesco a leggere le frasi: ' + (e && e.message ? e.message : e));
  }
}

async function inviaFrase(frase) {
  logga('sentito "' + frase + '" → invio…');
  try {
    const res = await fetch('/api/streamer/voce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frase }),
    });
    if (res.status === 401 || res.status === 404) return sessioneScaduta();
    const dati = await res.json().catch(() => ({}));
    const cat = dati && dati.categoria;
    const tit = dati && dati.titolo;
    if (cat) {
      if (dati.eseguito && cat.nome) logga('categoria cambiata in "' + cat.nome + '"');
      else if (cat.riautorizza) logga('manca il permesso di gestione canale: riautorizza dalla dashboard (Panoramica → permessi)');
      else if (cat.trovato === false) logga('categoria non trovata per "' + (cat.query || '') + '"');
      else logga('non sono riuscito a cambiare categoria');
    } else if (tit) {
      if (dati.eseguito && tit.testo) logga('titolo cambiato in "' + tit.testo + '"');
      else if (tit.riautorizza) logga('manca il permesso di gestione canale: riautorizza dalla dashboard (Panoramica → permessi)');
      else logga('non sono riuscito a cambiare titolo');
    } else if (dati && dati.eseguito) logga('"' + frase + '" → modulo scattato');
    else logga('"' + frase + '" inviato (nessun modulo ha reagito)');
  } catch (e) {
    logga('invio non riuscito: ' + (e && e.message ? e.message : e));
  }
}

async function inviaImpara(frase) {
  try {
    await fetch('/api/streamer/ascolta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testo: frase }),
    });
  } catch (e) {  }
}

function sessioneScaduta() {
  logga('Sessione scaduta: rientra dalla dashboard e riapri questa pagina.');
  ferma();
}

function valuta(testo, finale) {
  const t = String(testo || '').toLowerCase();
  if (!t) return;
  const ora = Date.now();

  if (finale && /\bvip\b\s+\S/.test(t)) {
    if (ora - (ultimoScatto.get('__vip') || 0) >= COOLDOWN_MS) {
      ultimoScatto.set('__vip', ora);
      inviaFrase(t);
    }
  }

  if (finale && catCfg.attivo && catCfg.trigger &&
      new RegExp('(?:^|\\s)' + escRe(catCfg.trigger) + '\\s+\\S').test(t)) {
    if (ora - (ultimoScatto.get('__cat') || 0) >= COOLDOWN_MS) {
      ultimoScatto.set('__cat', ora);
      inviaFrase(t);
    }
  }

  if (finale && titCfg.attivo && titCfg.trigger &&
      new RegExp('(?:^|\\s)' + escRe(titCfg.trigger) + '\\s+\\S').test(t)) {
    if (ora - (ultimoScatto.get('__tit') || 0) >= COOLDOWN_MS) {
      ultimoScatto.set('__tit', ora);
      inviaFrase(String(testo || '').trim());
    }
  }

  if (finale && imparaCfg.attivo) {
    const frase = String(testo || '').replace(/\s+/g, ' ').trim();
    const low = frase.toLowerCase();
    const comando = /^[!/]/.test(frase)
      || (catCfg.attivo && new RegExp('^' + escRe(catCfg.trigger) + '\\b', 'i').test(frase))
      || (titCfg.attivo && new RegExp('^' + escRe(titCfg.trigger) + '\\b', 'i').test(frase));
    if (frase.length >= 12 && !comando && low !== ultimoImpara.t && ora - ultimoImpara.ts > 2500) {
      ultimoImpara = { t: low, ts: ora };
      inviaImpara(frase);
    }
  }

  for (const frase of frasi) {
    if (!frase || !t.includes(frase)) continue;
    if (ora - (ultimoScatto.get(frase) || 0) < COOLDOWN_MS) continue;
    ultimoScatto.set(frase, ora);
    inviaFrase(frase);
  }
}

function creaRiconoscitore() {
  const r = new SR();
  r.lang = 'it-IT';
  r.continuous = true;
  r.interimResults = true;

  r.onresult = (ev) => {

    erroriRete = 0; backoffMs = 300;
    for (let i = ev.resultIndex; i < ev.results.length; i++) {

      valuta(ev.results[i][0].transcript, ev.results[i].isFinal);
    }
  };

  r.onerror = (ev) => {
    const err = ev && ev.error;
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      logga('Permesso microfono negato. Consenti il microfono per questo sito (icona nella barra) e riprova.');
      ferma();
    } else if (err === 'no-speech' || err === 'aborted') {

    } else if (err === 'network') {

      erroriRete++;
      if (erroriRete === 1) {
        logga('Il riconoscimento nativo non è disponibile in questo browser. Preparo il motore locale…');
      }
      if (erroriRete >= MAX_ERRORI_RETE) {
        passaALocale('(il nativo dà errore di rete)');
      }
    } else {
      logga('Errore riconoscimento: ' + err);
    }
  };

  r.onend = () => {
    if (!attivo) { aggiornaStato(); return; }
    setTimeout(() => {
      if (!attivo) return;
      try { r.start(); } catch (e) {  }
    }, backoffMs);
  };

  return r;
}

function avvia() {
  attivo = true;
  aggiornaStato();
  caricaFrasi();
  if (!timerFrasi) timerFrasi = setInterval(caricaFrasi, 60000);
  if (motore === 'locale' || !SR) avviaLocale();
  else avviaNativo();
}

function ferma() {
  const eraAttivo = attivo;
  attivo = false;
  fermaNativo(true);
  fermaLocale(true);
  if (timerFrasi) { clearInterval(timerFrasi); timerFrasi = null; }
  aggiornaStato();
  if (eraAttivo) logga('Ascolto fermato.');
}

function avviaNativo() {
  if (!SR) { passaALocale('(niente riconoscimento nativo in questo browser)'); return; }
  erroriRete = 0; backoffMs = 300;
  if (!rec) rec = creaRiconoscitore();
  try { rec.start(); } catch (e) {  }
  logga('Ascolto avviato (motore del browser).');
}
function fermaNativo(silenzioso) {
  if (rec) { try { rec.stop(); } catch (e) {  } }
  if (!silenzioso) logga('Motore browser fermato.');
}

function passaALocale(motivo) {
  if (motore !== 'locale') {
    motore = 'locale';
    try { localStorage.setItem('voce_motore', 'locale'); } catch (e) {  }
    logga('Passo al motore LOCALE (funziona anche su Dia/Arc/Brave). ' + (motivo || ''));
  }
  fermaNativo(true);
  if (attivo) avviaLocale();
}

async function ensureWhisper() {
  if (asr) return asr;
  if (asrInCaricamento) return asrInCaricamento;
  asrInCaricamento = (async () => {
    logga('Preparo il motore vocale…');
    const mod = await import(WHISPER_CDN);
    const pipeline = mod.pipeline;
    try { if (mod.env) mod.env.allowLocalModels = false; } catch (e) {  }

    const haGPU = (typeof navigator !== 'undefined' && !!navigator.gpu);
    const tentativi = [];
    if (haGPU) tentativi.push({ device: 'webgpu', model: MODELLO_GPU, dtype: DTYPE_GPU, nome: 'GPU' });
    tentativi.push({ device: 'wasm', model: MODELLO_CPU, dtype: 'q8', nome: 'CPU' });

    let ultimoErrore = null;
    for (const cfg of tentativi) {
      try {
        logga(`Motore vocale su ${cfg.nome} (${cfg.model})…`);
        let ultima = -1;
        const p = await pipeline('automatic-speech-recognition', cfg.model, {
          device: cfg.device,
          dtype: cfg.dtype,
          progress_callback: (info) => {
            if (info && info.status === 'progress' && typeof info.progress === 'number') {
              const perc = Math.floor(info.progress);
              if (perc >= ultima + 15) { ultima = perc; logga('Scarico il modello: ' + perc + '% (solo la prima volta)'); }
            }
          },
        });

        await p(new Float32Array(8000), { language: 'italian', task: 'transcribe' });
        motoreAttivo = cfg.nome;
        logga(`Motore vocale pronto (${cfg.nome}).`);
        return p;
      } catch (e) {
        ultimoErrore = e;
        logga(`${cfg.nome} non disponibile, provo altro… (${(e && e.message ? e.message : e).toString().slice(0, 70)})`);
      }
    }
    throw ultimoErrore || new Error('nessun backend vocale');
  })();
  try { asr = await asrInCaricamento; return asr; }
  finally { asrInCaricamento = null; }
}

async function avviaLocale() {
  try {
    logga('Ascolto avviato (motore locale, sul tuo dispositivo).');
    await ensureWhisper();
    if (!attivo) return;
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    if (!attivo) { fermaLocale(true); return; }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = audioCtx.createMediaStreamSource(micStream);
    procNode = audioCtx.createScriptProcessor(4096, 1, 1);
    chunkAudio = []; campioniTot = 0;
    const maxCampioni = Math.round(FINESTRA_SEC * audioCtx.sampleRate);
    procNode.onaudioprocess = (e) => {
      const ch = e.inputBuffer.getChannelData(0);
      chunkAudio.push(new Float32Array(ch));
      campioniTot += ch.length;
      while (campioniTot > maxCampioni && chunkAudio.length > 1) {
        campioniTot -= chunkAudio[0].length;
        chunkAudio.shift();
      }
    };
    srcNode.connect(procNode);
    procNode.connect(audioCtx.destination);
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(cicloTrascrizione, PASSO_MS);
    logga('Sto ascoltando (locale). La prima trascrizione può metterci qualche secondo.');
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (/Permission|NotAllowed|denied|NotFound|NotReadable/i.test(msg)) {
      logga('Permesso microfono negato o microfono non disponibile. Consenti il microfono per questo sito e premi Avvia.');
      ferma();
      return;
    }
    fermaLocale(true);
    logga('Motore locale non disponibile (' + msg.slice(0, 80) + ').');
    if (SR) {
      motore = 'nativo';
      try { localStorage.setItem('voce_motore', 'nativo'); } catch (er) {  }
      logga('Passo al motore del browser, che non ha bisogno di scaricare nulla.');
      avviaNativo();
      return;
    }
    logga('Nessun motore vocale disponibile in questo browser: prova con Chrome.');
    ferma();
  }
}

function fermaLocale(silenzioso) {
  if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  try { if (procNode) procNode.disconnect(); } catch (e) {  }
  try { if (srcNode) srcNode.disconnect(); } catch (e) {  }
  try { if (audioCtx) audioCtx.close(); } catch (e) {  }
  try { if (micStream) micStream.getTracks().forEach((t) => t.stop()); } catch (e) {  }
  procNode = srcNode = audioCtx = micStream = null;
  chunkAudio = []; campioniTot = 0;
  if (!silenzioso) logga('Motore locale fermato.');
}

async function cicloTrascrizione() {
  if (!attivo || !asr || trascrivendo || !chunkAudio.length) return;
  trascrivendo = true;
  try {
    let tot = 0; for (const c of chunkAudio) tot += c.length;
    const unito = new Float32Array(tot);
    let off = 0; for (const c of chunkAudio) { unito.set(c, off); off += c.length; }
    const a16 = resample16k(unito, audioCtx ? audioCtx.sampleRate : 16000);
    if (a16.length < 16000 * 0.6) { trascrivendo = false; return; }

    let energia = 0;
    for (let i = 0; i < a16.length; i++) energia += a16[i] * a16[i];
    energia = Math.sqrt(energia / a16.length);
    if (energia < 0.008) { trascrivendo = false; return; }
    const out = await asr(a16, { language: 'italian', task: 'transcribe', max_new_tokens: MAX_TOKEN });
    const testo = (out && out.text ? String(out.text) : '').trim();
    if (testo) valuta(testo, true);
  } catch (e) {

  } finally {
    trascrivendo = false;
  }
}

function resample16k(float32, fromRate) {
  if (!fromRate || fromRate === 16000) return float32;
  const ratio = fromRate / 16000;
  const n = Math.max(1, Math.round(float32.length / ratio));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, float32.length - 1);
    const f = idx - i0;
    out[i] = float32[i0] * (1 - f) + float32[i1] * f;
  }
  return out;
}

btn.addEventListener('click', () => { if (attivo) ferma(); else avvia(); });
if (!SR) {
  motore = 'locale';
  noApi.hidden = false;
}
