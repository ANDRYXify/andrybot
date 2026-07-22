// ======================================================================
// IA LOCALE di SocialBot — un piccolo "modello" che gira TUTTO in casa,
// senza API a pagamento, e si ADDESTRA DA SOLO sulla chat del canale e
// sulla conoscenza (sito + lezioni). Non è una rete neurale gigante: è un
// modello statistico/associativo, ma capisce le parafrasi e genera frasi
// molto più naturali dei semplici bigrammi. Due motori:
//
//  1) SEMANTICA (Random Indexing): ogni parola accumula un "vettore di
//     contesto" sommando i vettori-indice casuali delle parole vicine.
//     Parole usate in contesti simili → vettori simili → il bot "capisce"
//     che "dove ti seguo" e "i tuoi social" parlano della stessa cosa,
//     anche senza parole in comune. Incrementale, niente addestramento
//     pesante, memoria minima. È la parte che si auto-addestra.
//
//  2) FLUENZA (n-grammi di ordine 3 con backoff): dà frasi che "suonano"
//     come la chat del canale. Ricostruito dal corpus, non a mano.
//
// La pipeline di risposta genera più candidati (conoscenza semantica, frase
// pertinente ripescata dalla chat, frase generata) e sceglie il migliore per
// pertinenza + fluenza. Se niente convince, ritorna null e il cervello
// ripiega sui template di sempre: non peggiora MAI rispetto a prima.
import { makeLog } from '../logger.js';
import { memory, knowledge, streamers, models } from '../db.js';
import { normalizza } from './learn.js';

const log = makeLog('model');

// -------- parametri (piccoli: gira bene anche su un VPS modesto) --------
const DIM = 96;              // dimensioni del vettore semantico
const WINDOW = 3;            // finestra di contesto (parole a sinistra/destra)
const K_INDEX = 6;           // entrate non-zero nel vettore-indice di una parola
const MAX_VOCAB = 6000;      // tetto di parole nel vocabolario semantico
const CORPUS_MAX = 2500;     // messaggi letti per ricostruire n-grammi/semantica
const NGRAM_MIN_CORPUS = 60; // sotto tanti messaggi "buoni" niente generazione
const RICOSTR_MS = 5 * 60_000; // n-grammi ricostruiti al massimo ogni 5 minuti
const SALVA_MS = 3 * 60_000;   // salvataggio su DB al massimo ogni 3 minuti

const BOS = '';        // inizio frase
const EOS = '';        // fine frase
const SEP = '';        // separatore di contesto negli n-grammi

// primi diversi per generare K posizioni indipendenti dal nome della parola
const SEMI = [2166136261, 40503, 2654435761, 3266489917, 668265263, 374761393, 1274126177, 2246822519];

// -------------------------------------------------------- hashing (FNV-1a)
function fnv1a(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Vettore-indice sparso e DETERMINISTICO di una parola (non va salvato: si
// ricava dal nome). K posizioni con segno ±1. Deterministico = stabile tra
// riavvii, così i vettori di contesto salvati restano validi.
function indexVec(word) {
  const out = [];
  for (let k = 0; k < K_INDEX; k++) {
    const h = fnv1a(word, SEMI[k]);
    out.push([h % DIM, (h & 1) ? 1 : -1]);
  }
  return out;
}

// -------------------------------------------------------- modello per canale
const cache = new Map();   // channel → modello

function nuovoModello(channel) {
  return {
    channel,
    ctx: new Map(),        // parola → Float32Array(DIM) vettore di contesto
    freq: new Map(),       // parola → quante volte vista (per potare il vocabolario)
    // n-grammi (superficie: token com'è, così emote e maiuscole sopravvivono)
    uni: null, bi: null, tri: null,   // Map<ctx, {tot, m:Map<next,count>}>
    ngramTs: 0,            // ultima ricostruzione n-grammi
    dirty: false,          // ci sono messaggi nuovi da quando abbiamo ricostruito
    salvatoTs: 0,          // ultimo salvataggio su DB
    _osservati: 0,         // contatore osservazioni (per potare ogni tanto)
  };
}

export function getModel(channel) {
  const ch = String(channel || '').toLowerCase();
  let m = cache.get(ch);
  if (m) return m;
  m = nuovoModello(ch);
  try { carica(m); } catch (e) { log.debug(`carica #${ch}:`, e?.message || e); }
  cache.set(ch, m);
  return m;
}

// -------------------------------------------------------- semantica (RI)
function assicuraParola(m, w) {
  let cv = m.ctx.get(w);
  if (!cv) { cv = new Float32Array(DIM); m.ctx.set(w, cv); }
  return cv;
}

// Aggiorna la semantica con un testo: ogni parola "assorbe" i vettori-indice
// delle vicine. È il cuore auto-addestrante, chiamato per ogni messaggio.
function assorbi(m, text) {
  const words = normalizza(text);
  if (words.length < 2) return;
  for (const w of words) { m.freq.set(w, (m.freq.get(w) || 0) + 1); assicuraParola(m, w); }
  for (let i = 0; i < words.length; i++) {
    const cv = m.ctx.get(words[i]);
    const da = Math.max(0, i - WINDOW), a = Math.min(words.length - 1, i + WINDOW);
    for (let j = da; j <= a; j++) {
      if (j === i) continue;
      const peso = 1 / Math.abs(i - j);
      for (const [pos, sign] of indexVec(words[j])) cv[pos] += sign * peso;
    }
  }
}

// potatura del vocabolario: se cresce troppo, tieni le parole più frequenti
function potaVocab(m) {
  if (m.ctx.size <= MAX_VOCAB * 1.15) return;
  const ordine = [...m.freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_VOCAB);
  const tieni = new Set(ordine.map(([w]) => w));
  for (const w of [...m.ctx.keys()]) if (!tieni.has(w)) { m.ctx.delete(w); m.freq.delete(w); }
}

// vettore-frase = somma normalizzata dei vettori di contesto delle parole-contenuto
export function embed(channel, text) {
  const m = getModel(channel);
  return embedM(m, text);
}
function embedM(m, text) {
  const words = normalizza(text);
  if (!words.length) return null;
  const v = new Float32Array(DIM);
  let n = 0;
  for (const w of words) {
    const cv = m.ctx.get(w);
    if (!cv) continue;
    // magnitudo del vettore-parola (le parole frequenti ce l'hanno più grande)
    let norm = 0; for (let i = 0; i < DIM; i++) norm += cv[i] * cv[i];
    norm = Math.sqrt(norm);
    if (norm < 1e-6) continue;
    // peso stile-IDF: le parole rare/distintive contano più di quelle ubique
    // (es. "zelda" pesa più di "gioco"). Si somma la DIREZIONE (vettore
    // normalizzato), non la magnitudo, così non vince chi appare di più.
    const peso = 1 / (1 + Math.log(1 + (m.freq.get(w) || 1)));
    for (let i = 0; i < DIM; i++) v[i] += (cv[i] / norm) * peso;
    n++;
  }
  if (!n) return null;
  let norm = 0; for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-6) return null;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}
function coseno(a, b) {
  if (!a || !b) return 0;
  let d = 0; for (let i = 0; i < DIM; i++) d += a[i] * b[i];
  return d;
}

// -------------------------------------------------------- n-grammi
const tokenizza = (t) => String(t || '').trim().split(/\s+/).filter(Boolean);

function rigaBuona(r) {
  return r && !r.from_bot
    && typeof r.text === 'string'
    && !r.text.startsWith('!')
    && !/https?:\/\/|www\./i.test(r.text)
    && !String(r.user).includes('[')
    && r.text.trim().split(/\s+/).length >= 3;
}

function conta(mapa, ctx, next) {
  let e = mapa.get(ctx);
  if (!e) { e = { tot: 0, m: new Map() }; mapa.set(ctx, e); }
  e.tot++; e.m.set(next, (e.m.get(next) || 0) + 1);
}

// Ricostruisce gli n-grammi dal corpus recente del canale. Riempie anche la
// semantica dei messaggi non ancora "assorbiti" (primo giro dopo il caricamento).
function costruisciNgrammi(m) {
  const righe = memory.recentMessages(m.channel, CORPUS_MAX).filter(rigaBuona);
  m.ngramTs = Date.now();
  m.dirty = false;
  if (righe.length < NGRAM_MIN_CORPUS) { m.uni = m.bi = m.tri = null; return false; }

  const uni = new Map(), bi = new Map(), tri = new Map();
  for (const r of righe) {
    const tk = [BOS, BOS, ...tokenizza(r.text), EOS];
    for (let i = 2; i < tk.length; i++) {
      conta(uni, '', tk[i]);
      conta(bi, tk[i - 1], tk[i]);
      conta(tri, tk[i - 2] + SEP + tk[i - 1], tk[i]);
    }
  }
  m.uni = uni; m.bi = bi; m.tri = tri;
  return true;
}

// ricostruisce se serve (mai più spesso di RICOSTR_MS, solo se ci sono novità)
function assicuraNgrammi(m) {
  if (!m.tri || (m.dirty && Date.now() - m.ngramTs > RICOSTR_MS)) costruisciNgrammi(m);
  return !!m.tri;
}

function pescaPesato(mapEntry, escludi) {
  if (!mapEntry) return null;
  let tot = mapEntry.tot;
  if (escludi && mapEntry.m.has(escludi)) tot -= mapEntry.m.get(escludi);
  if (tot <= 0) return null;
  let r = Math.random() * tot;
  for (const [k, v] of mapEntry.m) {
    if (k === escludi) continue;
    r -= v; if (r <= 0) return k;
  }
  return null;
}

// prossimo token con backoff: trigramma → bigramma → unigramma
function prossimo(m, w1, w2, primo) {
  const escl = primo ? EOS : null;   // non finire subito la frase
  let n = pescaPesato(m.tri.get(w1 + SEP + w2), escl);
  if (n == null) n = pescaPesato(m.bi.get(w2), escl);
  if (n == null) n = pescaPesato(m.uni.get(''), escl);
  return n;
}

// log-probabilità di un token (stupid backoff) — serve al ranking di fluenza
function logProb(m, w1, w2, w3) {
  const tri = m.tri.get(w1 + SEP + w2);
  if (tri && tri.m.has(w3)) return Math.log(tri.m.get(w3) / tri.tot);
  const bi = m.bi.get(w2);
  if (bi && bi.m.has(w3)) return Math.log(0.4 * bi.m.get(w3) / bi.tot);
  const uni = m.uni.get('');
  const V = uni ? uni.m.size : 1;
  const c = uni && uni.m.has(w3) ? uni.m.get(w3) : 0;
  const tot = uni ? uni.tot : 1;
  return Math.log(0.16 * (c + 1) / (tot + V));
}
function fluenza(m, tokens) {
  if (!m.tri || tokens.length === 0) return -99;
  const tk = [BOS, BOS, ...tokens, EOS];
  let somma = 0, n = 0;
  for (let i = 2; i < tk.length; i++) { somma += logProb(m, tk[i - 2], tk[i - 1], tk[i]); n++; }
  return somma / Math.max(1, n);
}

// genera una frase nuova "nello stile della chat", o null
export function genera(channel, { maxParole = 18, tentativi = 6 } = {}) {
  const m = getModel(channel);
  if (!assicuraNgrammi(m)) return null;
  const vietate = paroleVietate(m.channel);
  let migliore = null, migliorScore = -Infinity;
  for (let t = 0; t < tentativi; t++) {
    const parole = [];
    let w1 = BOS, w2 = BOS;
    for (let i = 0; i < maxParole; i++) {
      const n = prossimo(m, w1, w2, i === 0);
      if (n == null || n === EOS) break;
      parole.push(n); w1 = w2; w2 = n;
    }
    if (parole.length < 4) continue;
    const testo = parole.join(' ');
    if (contieneVietate(testo, vietate)) continue;
    const score = fluenza(m, parole) + Math.min(0, (parole.length - 6) * -0.02);
    if (score > migliorScore) { migliorScore = score; migliore = testo; }
  }
  if (!migliore) return null;
  return migliore.charAt(0).toUpperCase() + migliore.slice(1);
}

// -------------------------------------------------------- parole vietate
function paroleVietate(channel) {
  return (streamers.get(channel)?.settings?.paroleVietate || [])
    .map((p) => String(p || '').trim().toLowerCase()).filter(Boolean);
}
function contieneVietate(testo, vietate) {
  const t = String(testo).toLowerCase();
  return vietate.some((p) => t.includes(p));
}

// -------------------------------------------------------- conoscenza semantica
// Trova la voce di conoscenza più pertinente unendo due segnali: parole in
// comune (lessicale, robusto anche a semantica "fredda") + similarità
// semantica (capisce le parafrasi). Ritorna { risposta, score } o null.
export function bestKnowledge(channel, text) {
  const m = getModel(channel);
  const voci = knowledge.list(channel);
  if (!voci.length) return null;
  const paroleUtente = new Set(normalizza(text));
  if (!paroleUtente.size) return null;
  const vUtente = embedM(m, text);

  let migliore = null, migliorScore = 0;
  for (const voce of voci) {
    // niente risposte "imparate dalla chat": sono messaggi veri degli utenti e
    // ripeterli è sgradevole. Solo conoscenza curata (profilo del sito/dashboard).
    if (voce.fonte === 'chat') continue;
    const paroleVoce = new Set(normalizza(voce.domanda));
    if (!paroleVoce.size) continue;
    // lessicale (come prima): parole in comune / parole della voce, con bonus lunghe
    let comuni = 0, bonus = 0;
    for (const w of paroleVoce) { if (paroleUtente.has(w)) { comuni++; if (w.length >= 5) bonus += 0.05; } }
    const lessicale = comuni / paroleVoce.size + Math.min(0.25, bonus);
    // semantico: coseno tra le due frasi
    const semantico = coseno(vUtente, embedM(m, voce.domanda));
    // fusione: il semantico aiuta ma non deve "sparare" da solo su match deboli
    const score = Math.max(lessicale, 0.35 * lessicale + 0.9 * semantico);
    // serve comunque un minimo di aggancio reale (una parola o forte semantica)
    if (comuni < 1 && semantico < 0.55) continue;
    if (score > migliorScore) { migliorScore = score; migliore = voce; }
  }
  return migliorScore >= 0.5 ? { risposta: migliore.risposta, score: migliorScore } : null;
}

// -------------------------------------------------------- ripesca dalla chat
// Cerca tra i messaggi recenti (umani, "da risposta") quello più pertinente al
// testo in arrivo: una frase vera della community, spesso più naturale di
// qualsiasi template. Filtri severi per non ripetere domande o robaccia.
function ripescaPertinente(m, text, vietate) {
  const vIn = embedM(m, text);
  if (!vIn) return null;
  const inLower = String(text).toLowerCase();
  const righe = memory.recentMessages(m.channel, 800);
  let best = null, bestSim = 0;
  for (const r of righe) {
    if (!rigaBuona(r)) continue;
    const t = r.text.trim();
    const nparole = t.split(/\s+/).length;
    if (nparole < 4 || nparole > 20) continue;
    if (t.includes('?')) continue;                 // non rispondere con un'altra domanda
    if (/@/.test(t)) continue;                      // niente menzioni ad altri
    if (t.toLowerCase() === inLower) continue;       // non l'eco dell'input
    if (contieneVietate(t, vietate)) continue;
    const sim = coseno(vIn, embedM(m, t));
    if (sim > bestSim) { bestSim = sim; best = t; }
  }
  return bestSim >= 0.62 ? { testo: best, sim: bestSim } : null;
}

// -------------------------------------------------------- risposta conversazionale
// Compone la risposta "libera" (chiacchiera) scegliendo il candidato migliore
// tra: frase ripescata pertinente e frase generata. Ranking = pertinenza al
// messaggio + fluenza. Ritorna una stringa o null (→ il cervello usa i template).
export function componiRisposta(channel, text, { minScore = 0.5 } = {}) {
  try {
    const m = getModel(channel);
    if (!assicuraNgrammi(m)) return null;
    const vietate = paroleVietate(channel);
    const vIn = embedM(m, text);
    const candidati = [];

    const rip = ripescaPertinente(m, text, vietate);
    if (rip) candidati.push({ testo: rip.testo, rel: rip.sim, flu: fluenza(m, tokenizza(rip.testo)) });

    for (let i = 0; i < 3; i++) {
      const g = genera(channel, { tentativi: 3 });
      if (g && !contieneVietate(g, vietate)) {
        const rel = coseno(vIn, embedM(m, g));
        candidati.push({ testo: g, rel, flu: fluenza(m, tokenizza(g)) });
      }
    }
    if (!candidati.length) return null;

    // fluenza in [~-8..0] → portala in [0..1]; pertinenza già in [0..1]
    for (const c of candidati) {
      const fluN = Math.max(0, Math.min(1, (c.flu + 8) / 8));
      c.score = 0.6 * c.rel + 0.4 * fluN;
    }
    candidati.sort((a, b) => b.score - a.score);
    const top = candidati[0];
    return top.score >= minScore ? top.testo : null;
  } catch (e) {
    log.error(`componiRisposta #${channel}:`, e?.message || e);
    return null;
  }
}

// -------------------------------------------------------- osservazione (auto-addestramento)
export function observe(channel, text, { fromBot = false } = {}) {
  try {
    if (fromBot || !text) return;
    const m = getModel(channel);
    assorbi(m, text);
    m.dirty = true;
    if ((++m._osservati % 200) === 0) potaVocab(m);
    // salvataggio "pigro": non a ogni messaggio, ma ogni tanto
    if (Date.now() - m.salvatoTs > SALVA_MS) salva(m);
  } catch (e) { log.debug('observe:', e?.message || e); }
}

// addestramento "pieno": ricostruisce gli n-grammi e, la prima volta, scalda
// la semantica leggendo il corpus. Chiamato dalla riflessione periodica.
export function train(channel) {
  try {
    const m = getModel(channel);
    // scalda la semantica dal corpus se è ancora povera (es. dopo un riavvio pulito)
    if (m.ctx.size < 50) {
      for (const r of memory.recentMessages(channel, CORPUS_MAX)) if (rigaBuona(r)) assorbi(m, r.text);
      potaVocab(m);
    }
    // fai anche imparare le domande della conoscenza (così le parafrasi agganciano)
    for (const k of knowledge.list(channel)) { assorbi(m, k.domanda); }
    costruisciNgrammi(m);
    salva(m);
    log.debug(`addestrato #${channel}: vocab ${m.ctx.size}, n-grammi ${m.tri ? m.tri.size : 0}`);
  } catch (e) { log.error(`train #${channel}:`, e?.message || e); }
}

// -------------------------------------------------------- persistenza (DB)
// Salviamo SOLO la semantica (costosa da imparare) + le frequenze. Gli
// n-grammi si ricostruiscono al volo dal corpus, quindi non li serializziamo.
function salva(m) {
  try {
    const words = [...m.ctx.keys()];
    const buf = new Float32Array(words.length * DIM);
    for (let i = 0; i < words.length; i++) buf.set(m.ctx.get(words[i]), i * DIM);
    const freq = words.map((w) => m.freq.get(w) || 0);
    const dati = JSON.stringify({
      v: 1, dim: DIM,
      words,
      freq,
      ctx: Buffer.from(buf.buffer).toString('base64'),
    });
    models.set(m.channel, dati);
    m.salvatoTs = Date.now();
  } catch (e) { log.debug(`salva #${m.channel}:`, e?.message || e); }
}

function carica(m) {
  const dati = models.get(m.channel);
  if (!dati) return;
  const o = JSON.parse(dati);
  if (!o || o.dim !== DIM || !Array.isArray(o.words)) return;
  const buf = new Float32Array(new Uint8Array(Buffer.from(o.ctx, 'base64')).buffer);
  for (let i = 0; i < o.words.length; i++) {
    const cv = new Float32Array(DIM);
    cv.set(buf.subarray(i * DIM, i * DIM + DIM));
    m.ctx.set(o.words[i], cv);
    m.freq.set(o.words[i], (o.freq && o.freq[i]) || 1);
  }
  log.debug(`caricato modello #${m.channel}: vocab ${m.ctx.size}`);
}

// salva tutti i modelli in cache (chiamato allo spegnimento)
export function salvaTutto() {
  for (const m of cache.values()) salva(m);
}
