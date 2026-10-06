// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


'use strict';

const LINGUE = ['it', 'en', 'es'];
const LINGUA = (() => {
  try { const q = new URLSearchParams(location.search).get('lang'); if (LINGUE.includes(q)) return q; } catch (e) {  }
  try { const s = localStorage.getItem('lingua'); if (LINGUE.includes(s)) return s; } catch (e) {  }
  const n = (navigator.language || 'it').slice(0, 2).toLowerCase();
  return LINGUE.includes(n) ? n : 'it';
})();
const L = (it, en, es) => (LINGUA === 'en' ? en : LINGUA === 'es' ? es : it);

const TESTI = {
  titolo: ['Ascolto vocale', 'Voice listening', 'Escucha por voz'],
  intro: ['Tieni questa scheda aperta mentre streammi: quando dici una parola chiave, il bot fa quello che hai impostato nei Moduli.',
    'Keep this tab open while you stream: when you say a keyword, the bot does what you set up in Modules. Recognition is in Italian.',
    'Mantén esta pestaña abierta mientras haces directo: cuando dices una palabra clave, el bot hace lo que configuraste en los Módulos. El reconocimiento es en italiano.'],
  noApi: ['Questo browser non ha il riconoscimento vocale nativo (come Dia, Arc, Brave). Nessun problema: userò il <strong>motore locale</strong>, che gira direttamente sul tuo dispositivo. La <strong>prima volta</strong> scarica un modello (qualche decina di MB), poi funziona anche offline.',
    'This browser has no built-in speech recognition (like Dia, Arc, Brave). No problem: I will use the <strong>local engine</strong>, which runs right on your device. The <strong>first time</strong> it downloads a model (a few tens of MB), then it works offline too.',
    'Este navegador no tiene reconocimiento de voz propio (como Dia, Arc, Brave). No pasa nada: usaré el <strong>motor local</strong>, que funciona directamente en tu dispositivo. La <strong>primera vez</strong> descarga un modelo (unas decenas de MB), luego funciona también sin conexión.'],
  frasi: ['Frasi che sta ascoltando', 'Phrases it is listening for', 'Frases que está escuchando'],
  frasiVuoto: ['Avvia l\'ascolto per caricarle…', 'Start listening to load them…', 'Inicia la escucha para cargarlas…'],
  registro: ['Registro', 'Log', 'Registro'],
  registroVuoto: ['Nessuna attività per ora.', 'No activity yet.', 'Todavía no hay actividad.'],
  privacy: ['<strong>Privacy:</strong> la trascrizione avviene sul tuo dispositivo (motore locale) oppure tramite il servizio del browser (Chrome/Edge). Al bot arriva solo una piccola chiamata quando scatta una parola chiave.',
    '<strong>Privacy:</strong> transcription happens on your device (local engine) or through the browser\'s service (Chrome/Edge). The bot only gets a small call when a keyword fires.',
    '<strong>Privacidad:</strong> la transcripción se hace en tu dispositivo (motor local) o a través del servicio del navegador (Chrome/Edge). Al bot solo le llega una pequeña llamada cuando salta una palabra clave.'],
};
try { document.documentElement.lang = LINGUA; } catch (e) {  }
document.title = L('Ascolto vocale | SocialBot', 'Voice listening | SocialBot', 'Escucha por voz | SocialBot');
for (const el of document.querySelectorAll('[data-t]')) {
  const t = TESTI[el.dataset.t];
  if (t) el.innerHTML = L(t[0], t[1], t[2]);
}

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
  const ora = new Date().toLocaleTimeString(L('it-IT', 'en-GB', 'es-ES'));
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
    statoTesto.textContent = L('In ascolto…', 'Listening…', 'Escuchando…');
    btn.textContent = L('Ferma', 'Stop', 'Detener');
    btn.classList.add('attivo');
  } else {
    statoBox.classList.remove('on');
    statoTesto.textContent = L('Fermo', 'Stopped', 'Parado');
    btn.textContent = L('Avvia ascolto', 'Start listening', 'Iniciar escucha');
    btn.classList.remove('attivo');
  }
}

function mostraFrasi() {
  frasiBox.innerHTML = '';
  if (!frasi.length) {
    const v = document.createElement('span');
    v.className = 'vuoto';
    v.textContent = L('Nessuna frase: crea un Modulo con innesco "voce" nella dashboard.', 'No phrases: create a Module with the "voice" trigger in the dashboard.', 'Ninguna frase: crea un Módulo con el disparador "voz" en el panel.');
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
    logga(L('non riesco a leggere le frasi: ', 'I cannot read the phrases: ', 'no consigo leer las frases: ') + (e && e.message ? e.message : e));
  }
}

async function inviaFrase(frase) {
  logga(L('sentito "', 'heard "', 'oído "') + frase + L('" → invio…', '" → sending…', '" → envío…'));
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
      if (dati.eseguito && cat.nome) logga(L('categoria cambiata in "', 'category changed to "', 'categoría cambiada a "') + cat.nome + '"');
      else if (cat.riautorizza) logga(permessoMancante(cat));
      else if (cat.errore === 'piattaforma') logga(piattaformaAssente());
      else if (cat.trovato === false) logga(L('categoria non trovata per "', 'no category found for "', 'categoría no encontrada para "') + (cat.query || '') + '"');
      else logga(L('non sono riuscito a cambiare categoria', 'I could not change the category', 'no he podido cambiar la categoría'));
    } else if (tit) {
      if (dati.eseguito && tit.testo) logga(L('titolo cambiato in "', 'title changed to "', 'título cambiado a "') + tit.testo + '"');
      else if (tit.riautorizza) logga(permessoMancante(tit));
      else if (tit.errore === 'piattaforma') logga(piattaformaAssente());
      else logga(L('non sono riuscito a cambiare titolo', 'I could not change the title', 'no he podido cambiar el título'));
    } else if (dati && dati.eseguito) logga('"' + frase + L('" → modulo scattato', '" → module fired', '" → módulo disparado'));
    else logga('"' + frase + L('" inviato (nessun modulo ha reagito)', '" sent (no module reacted)', '" enviado (ningún módulo ha reaccionado)'));
  } catch (e) {
    logga(L('invio non riuscito: ', 'sending failed: ', 'envío fallido: ') + (e && e.message ? e.message : e));
  }
}

function permessoMancante(esito) {
  if (esito.piattaforma === 'kick') return L('manca il permesso di Kick per cambiare titolo e categoria: nel pannello, da Account → Il tuo account → Le tue piattaforme, premi «Aggiorna i permessi di Kick» sulla riga di Kick', 'Kick’s permission to change title and category is missing: in the panel, from Account → Your account → Your platforms, press “Update Kick permissions” on the Kick row', 'falta el permiso de Kick para cambiar título y categoría: en el panel, desde Cuenta → Tu cuenta → Tus plataformas, pulsa «Actualiza los permisos de Kick» en la fila de Kick');
  return L('manca il permesso di gestione canale: concedilo nel pannello, da Chat e pubblico → Comandi → Comandi vocali', 'the manage channel permission is missing: grant it in the panel, from Chat & audience → Commands → Voice commands', 'falta el permiso de gestión del canal: concédelo en el panel, desde Chat y público → Comandos → Comandos de voz');
}

function piattaformaAssente() {
  return L('su questa piattaforma titolo e categoria non si cambiano ancora: si cambiano su Twitch e su Kick', 'title and category can’t be changed on this platform yet: they can on Twitch and Kick', 'en esta plataforma el título y la categoría todavía no se cambian: se cambian en Twitch y en Kick');
}

let penitenzaInCorso = false;
let timerPenitenza = null;
async function guardaPenitenza() {
  try {
    const res = await fetch('/api/streamer/voce/penitenza', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return;
    const dati = await res.json();
    const ora = Number(dati.inCorso) > 0;
    if (ora && !penitenzaInCorso) logga(L('Penitenza in corso: conto quello che dici finché non finisce.', 'Forfeit running: I count what you say until it ends.', 'Penitencia en curso: cuento lo que dices hasta que termine.'));
    if (!ora && penitenzaInCorso) logga(L('Penitenza finita: torno ad ascoltare solo le frasi dei comandi.', 'Forfeit over: I go back to listening only for the command phrases.', 'Penitencia terminada: vuelvo a escuchar solo las frases de los comandos.'));
    penitenzaInCorso = ora;
  } catch (e) {  }
}

async function inviaPenitenza(frase) {
  try {
    await fetch('/api/streamer/voce/penitenza', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frase }),
    });
  } catch (e) {  }
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
  logga(L('Sessione scaduta: rientra dalla dashboard e riapri questa pagina.', 'Session expired: sign in to the dashboard again and reopen this page.', 'Sesión caducada: vuelve a entrar en el panel y abre de nuevo esta página.'));
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

  if (finale && penitenzaInCorso) {
    const intera = String(testo || '').replace(/\s+/g, ' ').trim();
    if (intera) inviaPenitenza(intera.slice(0, 500));
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
      logga(L('Permesso microfono negato. Consenti il microfono per questo sito (icona nella barra) e riprova.', 'Microphone permission denied. Allow the microphone for this site (icon in the address bar) and try again.', 'Permiso de micrófono denegado. Permite el micrófono para este sitio (icono en la barra) y vuelve a intentarlo.'));
      ferma();
    } else if (err === 'no-speech' || err === 'aborted') {

    } else if (err === 'network') {

      erroriRete++;
      if (erroriRete === 1) {
        logga(L('Il riconoscimento nativo non è disponibile in questo browser. Preparo il motore locale…', 'Built-in recognition is not available in this browser. Getting the local engine ready…', 'El reconocimiento propio no está disponible en este navegador. Preparo el motor local…'));
      }
      if (erroriRete >= MAX_ERRORI_RETE) {
        passaALocale(L('(il nativo dà errore di rete)', '(the built-in one gives a network error)', '(el propio da error de red)'));
      }
    } else {
      logga(L('Errore riconoscimento: ', 'Recognition error: ', 'Error de reconocimiento: ') + err);
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
  guardaPenitenza();
  if (!timerPenitenza) timerPenitenza = setInterval(guardaPenitenza, 4000);
  if (motore === 'locale' || !SR) avviaLocale();
  else avviaNativo();
}

function ferma() {
  const eraAttivo = attivo;
  attivo = false;
  fermaNativo(true);
  fermaLocale(true);
  if (timerFrasi) { clearInterval(timerFrasi); timerFrasi = null; }
  if (timerPenitenza) { clearInterval(timerPenitenza); timerPenitenza = null; }
  penitenzaInCorso = false;
  aggiornaStato();
  if (eraAttivo) logga(L('Ascolto fermato.', 'Listening stopped.', 'Escucha detenida.'));
}

function avviaNativo() {
  if (!SR) { passaALocale(L('(niente riconoscimento nativo in questo browser)', '(no built-in recognition in this browser)', '(no hay reconocimiento propio en este navegador)')); return; }
  erroriRete = 0; backoffMs = 300;
  if (!rec) rec = creaRiconoscitore();
  try { rec.start(); } catch (e) {  }
  logga(L('Ascolto avviato (motore del browser).', 'Listening started (browser engine).', 'Escucha iniciada (motor del navegador).'));
}
function fermaNativo(silenzioso) {
  if (rec) { try { rec.stop(); } catch (e) {  } }
  if (!silenzioso) logga(L('Motore browser fermato.', 'Browser engine stopped.', 'Motor del navegador detenido.'));
}

function passaALocale(motivo) {
  if (motore !== 'locale') {
    motore = 'locale';
    try { localStorage.setItem('voce_motore', 'locale'); } catch (e) {  }
    logga(L('Passo al motore LOCALE (funziona anche su Dia/Arc/Brave). ', 'Switching to the LOCAL engine (it also works on Dia/Arc/Brave). ', 'Paso al motor LOCAL (funciona también en Dia/Arc/Brave). ') + (motivo || ''));
  }
  fermaNativo(true);
  if (attivo) avviaLocale();
}

async function ensureWhisper() {
  if (asr) return asr;
  if (asrInCaricamento) return asrInCaricamento;
  asrInCaricamento = (async () => {
    logga(L('Preparo il motore vocale…', 'Getting the voice engine ready…', 'Preparo el motor de voz…'));
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
        logga(L(`Motore vocale su ${cfg.nome} (${cfg.model})…`, `Voice engine on ${cfg.nome} (${cfg.model})…`, `Motor de voz en ${cfg.nome} (${cfg.model})…`));
        let ultima = -1;
        const p = await pipeline('automatic-speech-recognition', cfg.model, {
          device: cfg.device,
          dtype: cfg.dtype,
          progress_callback: (info) => {
            if (info && info.status === 'progress' && typeof info.progress === 'number') {
              const perc = Math.floor(info.progress);
              if (perc >= ultima + 15) { ultima = perc; logga(L(`Scarico il modello: ${perc}% (solo la prima volta)`, `Downloading the model: ${perc}% (first time only)`, `Descargo el modelo: ${perc}% (solo la primera vez)`)); }
            }
          },
        });

        await p(new Float32Array(8000), { language: 'italian', task: 'transcribe' });
        motoreAttivo = cfg.nome;
        logga(L(`Motore vocale pronto (${cfg.nome}).`, `Voice engine ready (${cfg.nome}).`, `Motor de voz listo (${cfg.nome}).`));
        return p;
      } catch (e) {
        ultimoErrore = e;
        const perche = (e && e.message ? e.message : e).toString().slice(0, 70);
        logga(L(`${cfg.nome} non disponibile, provo altro… (${perche})`, `${cfg.nome} not available, trying something else… (${perche})`, `${cfg.nome} no disponible, pruebo otra cosa… (${perche})`));
      }
    }
    throw ultimoErrore || new Error('nessun backend vocale');
  })();
  try { asr = await asrInCaricamento; return asr; }
  finally { asrInCaricamento = null; }
}

async function avviaLocale() {
  try {
    logga(L('Ascolto avviato (motore locale, sul tuo dispositivo).', 'Listening started (local engine, on your device).', 'Escucha iniciada (motor local, en tu dispositivo).'));
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
    logga(L('Sto ascoltando (locale). La prima trascrizione può metterci qualche secondo.', 'Listening (local). The first transcription can take a few seconds.', 'Escuchando (local). La primera transcripción puede tardar unos segundos.'));
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (/Permission|NotAllowed|denied|NotFound|NotReadable/i.test(msg)) {
      logga(L('Permesso microfono negato o microfono non disponibile. Consenti il microfono per questo sito e premi Avvia.', 'Microphone permission denied or microphone not available. Allow the microphone for this site and press Start.', 'Permiso de micrófono denegado o micrófono no disponible. Permite el micrófono para este sitio y pulsa Iniciar.'));
      ferma();
      return;
    }
    fermaLocale(true);
    logga(L('Motore locale non disponibile (', 'Local engine not available (', 'Motor local no disponible (') + msg.slice(0, 80) + ').');
    if (SR) {
      motore = 'nativo';
      try { localStorage.setItem('voce_motore', 'nativo'); } catch (er) {  }
      logga(L('Passo al motore del browser, che non ha bisogno di scaricare nulla.', 'Switching to the browser engine, which needs no download.', 'Paso al motor del navegador, que no necesita descargar nada.'));
      avviaNativo();
      return;
    }
    logga(L('Nessun motore vocale disponibile in questo browser: prova con Chrome.', 'No voice engine available in this browser: try Chrome.', 'Ningún motor de voz disponible en este navegador: prueba con Chrome.'));
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
  if (!silenzioso) logga(L('Motore locale fermato.', 'Local engine stopped.', 'Motor local detenido.'));
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
aggiornaStato();
if (!SR) {
  motore = 'locale';
  noApi.hidden = false;
}
