// LLM LOCALE: un piccolo modello linguistico che gira SUL SERVER del bot
// (llama.cpp via node-llama-cpp, modello GGUF quantizzato). Nessuna API,
// nessun costo, tutto in casa.
//
// REGOLA D'ORO: non deve MAI far crashare né bloccare il bot.
//   - node-llama-cpp è una dipendenza OPZIONALE: se non è installata (o il
//     modello non si carica) il bot prosegue senza, e il cervello ripiega.
//   - il caricamento avviene in BACKGROUND all'avvio; finché non è pronto,
//     rispondi() torna null e il cervello resta sui suoi binari sicuri.
//   - ogni generazione ha un TIMEOUT: una risposta lenta non blocca la chat.
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('llm');

const env = (k, d) => (process.env[k] ?? d);

// Modello di default: Qwen2.5-0.5B-Instruct (leggerissimo, adatto a server con
// poca RAM: ~0.5GB su disco, ~0,7-0,9GB in memoria con mmap). L'italiano su un
// modello così piccolo è essenziale ma dignitoso per la chat. Cambiabile via env:
// LLM_MODEL_URL per salire (1B/1.5B) se hai più RAM, o LLM=0 per spegnere.
const MODEL_URL = env('LLM_MODEL_URL',
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf');
// Modalità: 'auto' (default) accende l'LLM SOLO se il server ha abbastanza RAM
// (sotto soglia resta spento, così non rallenta il bot su macchine piccole);
// '1'/'on' forza l'accensione anche su server piccoli; '0'/'off' lo spegne.
const LLM_MODE = String(env('LLM', 'auto')).toLowerCase();
const RAM_MIN_GB = Number(env('LLM_RAM_MIN_GB', '3')) || 3;   // soglia auto
const MAX_TOKEN = Number(env('LLM_MAX_TOKEN', '80')) || 80;
const TIMEOUT_MS = Number(env('LLM_TIMEOUT_MS', '25000')) || 25000;
// contesto ridotto = meno RAM per la KV-cache (importante su server piccoli).
const CONTEXT_SIZE = Number(env('LLM_CONTEXT', '1024')) || 1024;

let stato = 'spento';       // 'spento' | 'carico' | 'pronto' | 'errore'
let motivo = null;          // messaggio d'errore/diagnostica
let llama = null, model = null;
let avvioPromise = null;
let nHf = null;             // riferimento al costruttore LlamaChatSession

export function pronto() { return stato === 'pronto'; }
export function statoLLM() { return { stato, modello: MODEL_URL, motivo }; }

// Scarica il modello (una volta) in data/models/, con file .part atomico e
// un po' di log di avanzamento. Se c'è già (dimensione plausibile) non riscarica.
async function scaricaSeManca(url) {
  const dir = join(config.dataDir, 'models');
  fs.mkdirSync(dir, { recursive: true });
  const nome = (url.split('/').pop() || 'modello.gguf').split('?')[0];
  const dest = join(dir, nome);
  try {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 50 * 1024 * 1024) return dest;
  } catch { /* stat fallita: riscarichiamo */ }

  log.info('LLM: scarico il modello (una sola volta): ' + nome);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error('download modello: HTTP ' + res.status);
  const totale = Number(res.headers.get('content-length')) || 0;
  let letti = 0, ultimaPerc = -1;
  const conteggio = new Transform({
    transform(chunk, _enc, cb) {
      letti += chunk.length;
      if (totale) {
        const perc = Math.floor((letti / totale) * 100);
        if (perc >= ultimaPerc + 10) { ultimaPerc = perc; log.info('LLM: download ' + perc + '%'); }
      }
      cb(null, chunk);
    },
  });
  const tmp = dest + '.part';
  await pipeline(Readable.fromWeb(res.body), conteggio, fs.createWriteStream(tmp));
  fs.renameSync(tmp, dest);
  log.info('LLM: modello scaricato.');
  return dest;
}

// Avvio LAZY in background: importa node-llama-cpp (opzionale), scarica e
// carica il modello. Non lancia mai: in caso di problema resta 'errore'.
export async function avvia() {
  if (LLM_MODE === '0' || LLM_MODE === 'off' || LLM_MODE === 'false') {
    stato = 'spento'; motivo = 'disattivato (LLM=0)'; return;
  }
  // Auto-protezione RAM: su server piccoli l'LLM locale, mentre genera, si
  // mangia CPU/RAM e RALLENTA il resto del bot (i comandi si fanno attendere).
  // Quindi in 'auto' lo accendiamo solo con RAM sufficiente. Con LLM=1 si forza.
  const forza = LLM_MODE === '1' || LLM_MODE === 'on' || LLM_MODE === 'true' || LLM_MODE === 'force';
  const gb = os.totalmem() / (1024 ** 3);
  if (!forza && gb < RAM_MIN_GB) {
    stato = 'spento';
    motivo = `RAM totale ${gb.toFixed(1)}GB < ${RAM_MIN_GB}GB: LLM locale SPENTO per non rallentare il bot (comandi reattivi). Aumenta la RAM (4GB+) e si riaccende da solo, oppure forza con LLM=1.`;
    log.warn('LLM: ' + motivo);
    return;
  }
  if (avvioPromise) return avvioPromise;
  avvioPromise = (async () => {
    stato = 'carico';
    try {
      const mod = await import('node-llama-cpp');   // dipendenza OPZIONALE
      const { getLlama, LlamaChatSession } = mod;
      nHf = LlamaChatSession;
      const modelPath = await scaricaSeManca(MODEL_URL);
      log.info('LLM: carico il modello in memoria…');
      llama = await getLlama();
      model = await llama.loadModel({ modelPath });
      stato = 'pronto';
      motivo = null;
      log.info('LLM pronto (parla il bot, in locale).');
    } catch (e) {
      stato = 'errore';
      motivo = e?.message || String(e);
      // il messaggio tipico quando manca la dipendenza opzionale
      if (/Cannot find package|ERR_MODULE_NOT_FOUND|node-llama-cpp/i.test(motivo)) {
        log.warn('LLM non installato (dipendenza opzionale assente): il bot prosegue senza. Per attivarlo: npm i node-llama-cpp e riavvia.');
      } else {
        log.warn('LLM non disponibile (si prosegue senza): ' + motivo);
      }
    }
  })();
  return avvioPromise;
}

// Compila il "carattere" del bot: parla in prima persona come lo streamer.
function systemPrompt({ canale, tono, conoscenza }) {
  const stile = tono === 'serio'
    ? 'Tono pacato e cortese.'
    : tono === 'amichevole'
      ? 'Tono caldo e amichevole.'
      : 'Tono scherzoso e vivace, ma mai cafone.';
  const righe = [
    `Sei il bot ufficiale del canale Twitch "${canale}" e parli in PRIMA PERSONA, come se fossi lo streamer.`,
    'Rispondi in ITALIANO, in modo naturale e BREVE: 1 frase, al massimo 2, come in una chat Twitch.',
    stile,
    'Non ripetere la domanda, non elencare, non spiegare di essere un\'IA. Al massimo una emoji.',
    'Se non sai qualcosa, ammettilo in modo simpatico invece di inventare.',
  ];
  const fatti = (Array.isArray(conoscenza) ? conoscenza : []).filter(Boolean).slice(0, 6);
  if (fatti.length) {
    righe.push('Cose vere sul canale (usale solo se pertinenti, non elencarle a caso):');
    for (const f of fatti) righe.push('- ' + String(f).slice(0, 200));
  }
  return righe.join('\n');
}

// pulizia della risposta: una riga, niente prefissi tipo "Bot:", lunghezza sana
function pulisci(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(bot|assistant|risposta|streamer)\s*[:>-]\s*/i, '');
  t = t.replace(/^["'«]+|["'»]+$/g, '').trim();
  if (t.length > 350) t = t.slice(0, 349).trimEnd() + '…';
  return t;
}

function conTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(to); resolve(v); },
      (e) => { clearTimeout(to); reject(e); });
  });
}

// Genera una risposta CONTESTUALE. Ritorna una stringa o null (→ il cervello
// ripiega). Non lancia mai. `storia` = ultime righe di chat (per il contesto).
export async function rispondi({ canale, tono, conoscenza, storia, testo } = {}) {
  if (stato !== 'pronto' || !model || !nHf) return null;
  const msg = String(testo || '').trim();
  if (!msg) return null;
  let context = null;
  try {
    context = await model.createContext({ contextSize: CONTEXT_SIZE });
    const session = new nHf({
      contextSequence: context.getSequence(),
      systemPrompt: systemPrompt({ canale, tono, conoscenza }),
    });
    let richiesta = msg;
    const righeStoria = (Array.isArray(storia) ? storia : []).filter(Boolean).slice(-6);
    if (righeStoria.length) {
      richiesta = 'Contesto della chat (ultimi messaggi):\n' + righeStoria.join('\n')
        + '\n\nRispondi a questo messaggio: ' + msg;
    }
    const risposta = await conTimeout(
      session.prompt(richiesta, { maxTokens: MAX_TOKEN, temperature: 0.7, topP: 0.9 }),
      TIMEOUT_MS,
    );
    return pulisci(risposta) || null;
  } catch (e) {
    log.debug('LLM rispondi:', e?.message || e);
    return null;
  } finally {
    try { if (context) await context.dispose(); } catch { /* niente */ }
  }
}
