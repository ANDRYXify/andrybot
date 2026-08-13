// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// brainpy.js — ponte verso il CERVELLO in Python (container 'brain').
//
// Il cervello (coscienza + modello linguistico) vive in un processo separato:
// qui lo interroghiamo via HTTP con un timeout CORTO. Se è lento, occupato o
// spento, ritorniamo null e il bot semplicemente non chiacchiera — i COMANDI
// non passano mai di qui, quindi restano SEMPRE istantanei. Non lancia mai.
import { makeLog } from '../logger.js';

const log = makeLog('brainpy');

const BASE = process.env.BRAIN_URL || 'http://brain:8091';
// Attesa massima per una risposta live. Il 7B su CPU (8 vCPU) è più lento del 3B:
// gli diamo respiro (15s) così risponde davvero invece di andare in timeout. Il
// bot parla comunque di rado (cooldown 45s), quindi un pensiero di ~10-15s va bene.
// Con un endpoint esterno (il "maestro" sul tuo PC) le risposte tornano istantanee.
const TIMEOUT_CHAT = Number(process.env.BRAIN_TIMEOUT_MS || '15000') || 15000;

// Chiede una risposta contestuale al cervello. Ritorna stringa o null.
// `stile` = alcune frasi vere dello streamer (la sua voce), per farlo suonare come lui.
// `timeoutMs` = quanto attendere (default 9s per la chat live; i DM possono attendere di più
//   perché su CPU un 3B è lento e una risposta tardiva è meglio di nessuna risposta).
// `modo` = 'live' (chat pubblica, veloce) oppure 'allenamento' (chat privata con
//   lo streamer: risposta più lunga e ragionata, sfrutta il maestro esterno).
export async function rispondi({ canale, login, nome, testo, tono, conoscenza, stile, storia, situazione, timeoutMs, modo, nomeBot, spunto, lineeGuida, web } = {}) {
  if (!canale || !login || !testo) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs || TIMEOUT_CHAT);
  try {
    const r = await fetch(BASE + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, login, nome, testo, tono, conoscenza, stile, storia, situazione, modo, nome_bot: nomeBot, spunto, linee_guida: lineeGuida, web }),
      signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d && d.risposta ? String(d.risposta) : null;
  } catch (e) {
    log.debug('chat:', e?.message || e);
    return null;
  } finally {
    clearTimeout(to);
  }
}

// ALLENAMENTO: chiede al cervello GROSSO di distillare i discorsi dello streamer
// in coppie domanda→risposta riutilizzabili. Ritorna un array (anche vuoto) se il
// cervello ha lavorato, oppure null se non era pronto/è andato in errore (così chi
// chiama sa se riprovare più tardi). Può metterci: timeout ampio.
export async function distilla(canale, frasi = []) {
  if (!canale || !Array.isArray(frasi) || !frasi.length) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 95_000);
  try {
    const r = await fetch(BASE + '/distilla', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, frasi }), signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    if (!d || d.pronto === false) return null;            // cervello non pronto → riprova dopo
    return Array.isArray(d.coppie) ? d.coppie : [];
  } catch (e) {
    log.debug('distilla:', e?.message || e);
    return null;
  } finally { clearTimeout(to); }
}

// AUTO-APPRENDIMENTO: chiede al cervello di sintetizzare e salvare un MODULO del
// "manuale umano" da un argomento (+ eventuale fonte web già filtrata dal bot).
// La sintesi usa il maestro e può metterci: timeout ampio. Ritorna il modulo
// salvato, `true`, oppure null (cervello non pronto / sintesi fallita).
export async function imparaModulo({ nome, dominio, web, lacuna } = {}) {
  if (!nome) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 60_000);
  try {
    const r = await fetch(BASE + '/impara_modulo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, dominio, web, lacuna }), signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d && d.ok ? (d.modulo || true) : null;
  } catch (e) {
    log.debug('imparaModulo:', e?.message || e);
    return null;
  } finally { clearTimeout(to); }
}

// Le LACUNE ricorrenti dalla chat reale (situazioni non coperte da nessun modulo),
// da studiare per l'apprendimento autonomo. Ritorna un array (vuoto se nulla o
// errore) — mai lancia. minVisto = quante volte deve essere ricorsa.
export async function lacune(minVisto = 2) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8_000);
  try {
    const r = await fetch(BASE + '/lacune?min=' + encodeURIComponent(minVisto), { signal: ac.signal });
    if (!r.ok) return [];
    const d = await r.json().catch(() => null);
    return Array.isArray(d?.lacune) ? d.lacune : [];
  } catch (e) {
    log.debug('lacune:', e?.message || e);
    return [];
  } finally { clearTimeout(to); }
}

// Nutre la coscienza con ciò che passa in chat (impara persone/fatti). Fire-and-
// forget: non attende e non blocca nulla.
export function osserva({ canale, login, nome, testo } = {}) {
  if (!canale || !login) return;
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 2500);
    fetch(BASE + '/osserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, login, nome, testo }),
      signal: ac.signal,
    }).catch(() => {}).finally(() => clearTimeout(to));
  } catch { /* niente */ }
}

// Dice al cervello di cambiare modello a caldo (dopo che la dashboard ha scritto
// la scelta in data/llm.json). Ritorna subito: il caricamento avviene in background.
export async function ricarica() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(BASE + '/ricarica', { method: 'POST', signal: ac.signal });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { log.debug('ricarica:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Prova un endpoint esterno (LM Studio/Ollama/OpenAI-compatibile): la verifica
// parte dal CERVELLO (server), perché è lui che dovrà raggiungerlo davvero.
// `cfg` = {url, modello, chiave, solo} oppure null per provare quello salvato.
export async function provaEndpoint(cfg) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 15_000);
  try {
    const r = await fetch(BASE + '/prova', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg || {}),
      signal: ac.signal,
    });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { log.debug('prova:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Stato della piccola rete PER CANALE (cruscotto in dashboard). Ritorna un
// oggetto {nodi, solidi, curiosita, fiducia, lacune, non_so} o null.
export async function reteStato(canale) {
  if (!canale) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 3000);
  try {
    const r = await fetch(BASE + '/rete?canale=' + encodeURIComponent(canale), { signal: ac.signal });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch { return null; } finally { clearTimeout(to); }
}

// Elenco compatto dei MODULI del "manuale umano" (globale): [{nome, dominio,
// stato, qualita, usi, successi, fallimenti}]. Ritorna [] se vuoto, null se il
// cervello non risponde (così chi semina sa distinguere "vuoto" da "riprova").
export async function moduli(full = false) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(BASE + '/moduli' + (full ? '?full=1' : ''), { signal: ac.signal });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return Array.isArray(d?.moduli) ? d.moduli : [];
  } catch (e) { log.debug('moduli:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// I collegamenti fra moduli (rete associativa) per il grafo 3D. Array [{a,b,peso}]
// (vuoto se nulla o errore). Mai lancia.
export async function linkModuli() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(BASE + '/links', { signal: ac.signal });
    if (!r.ok) return [];
    const d = await r.json().catch(() => null);
    return Array.isArray(d?.links) ? d.links : [];
  } catch (e) { log.debug('linkModuli:', e?.message || e); return []; }
  finally { clearTimeout(to); }
}

// SVAGO: Lia fa qualcosa per sé nel suo computer (la sandbox) e lo racconta.
// Ritorna il testo (stringa) o null se non ha l'ambiente / non è uscito nulla.
export async function svago({ canale, nomeBot, stile, lineeGuida } = {}) {
  if (!canale) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 60_000);
  try {
    const r = await fetch(BASE + '/svago', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, nomeBot, stile, lineeGuida }), signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d && d.testo ? String(d.testo) : null;
  } catch (e) { log.debug('svago:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Conteggio delle "vie" del ragionamento (deduzione/memoria/moduli/modello/riflesso)
// per il cruscotto. Oggetto via→n (vuoto se nulla o errore). Mai lancia.
export async function vie() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(BASE + '/vie', { signal: ac.signal });
    if (!r.ok) return {};
    const d = await r.json().catch(() => null);
    return (d && typeof d.vie === 'object' && d.vie) ? d.vie : {};
  } catch (e) { log.debug('vie:', e?.message || e); return {}; }
  finally { clearTimeout(to); }
}

// VITA di Lia (la sua macchina): diario, stanza, ritratto del pubblico. Sola
// lettura. Ritorna {attiva, diario, spazio, pubblico} o null.
export async function vita() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/vita', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('vita:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Falla vivere un attimo ORA: tipo='vita' (momento personale) o 'pubblico'
// (si aggiorna sul suo pubblico). Ritorna {ok, tipo, nota} o null. Attesa ampia.
export async function vivi(tipo = 'vita') {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 70_000);
  try {
    const r = await fetch(BASE + '/vita', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('vivi:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Distilla ORA le risposte del modello in moduli. Ritorna {ok, distillazione} o null.
export async function distillaModuli() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 30_000);
  try {
    const r = await fetch(BASE + '/distilla_moduli', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('distillaModuli:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Libera il disco dai modelli non usati. `giorni` opzionale. Ritorna {ok, pulizia} o null.
export async function pulisciModelli(giorni) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 30_000);
  try {
    const r = await fetch(BASE + '/pulizia_modelli', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(giorni != null ? { giorni } : {}), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('pulisciModelli:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// La MENTE che Lia si plasma da sé (~/mente): sincronizza ORA i suoi moduli nel
// motore reale e ritorna {attiva, moduli, importati} o null.
export async function mente() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 20_000);
  try {
    const r = await fetch(BASE + '/mente', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('mente:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Toggle «Lia è l'assistente»: si accende SOLO se è senziente (deciso dal cervello);
// spegnere è sempre possibile. Ritorna {ok, senziente, attivo} o null.
export async function assistente(attivo) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/assistente', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !!attivo }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('assistente:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Fa DIMENTICARE al bot una frase precisa (dalla memoria e dai moduli): per
// togliere una cosa sbagliata che ripete. Ritorna {ok, rete, moduli} o null.
export async function dimentica(frase) {
  const f = String(frase || '').trim();
  if (f.length < 3) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 15_000);
  try {
    const r = await fetch(BASE + '/dimentica', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frase: f }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('dimentica:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// MEMBRANA (barriera di Weismann) germinale↔soma: foto del confine fra i moduli
// sperimentali (il laboratorio privato di Lia) e quelli pubblici (ciò che il bot usa),
// + registro promozioni + candidati. Ritorna {ok, membrana} o null. Owner-only lato route.
export async function membrana() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/membrana', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('membrana:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Promuove UN modulo sperimentale→pubblico (deciso a mano dall'owner = forzata: salta la
// maturità ma MAI il controllo d'identità). Ritorna {ok, motivo, modulo} o null.
export async function promuovi(id, forza = true) {
  const mid = Number(id);
  if (!Number.isFinite(mid)) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/promuovi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mid, forza: !!forza }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('promuovi:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Revoca una promozione: riporta un modulo pubblico→sperimentale (kill switch della
// membrana; il bot pubblico smette all'istante di usarlo). Ritorna {ok, modulo} o null.
export async function revocaPromozione(id) {
  const mid = Number(id);
  if (!Number.isFinite(mid)) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/revoca_promozione', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mid }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('revocaPromozione:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// SCINTILLA: la spinta autonoma di Lia (curiosità = progresso d'apprendimento + un
// VIGORE che decade nel tempo e che solo l'imparare ricarica). Ritorna {ok, scintilla}
// o null. Non richiede la sandbox (vive nella coscienza).
export async function scintilla() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/scintilla', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('scintilla:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// SPECCHIO: l'individuazione di Lia — quanto la sua sé PRIVATA (germinale) diverge
// dalla sua sé PUBBLICA (soma) sulle stesse situazioni. Ritorna {ok, specchio} o null.
// Non richiede la sandbox (vive nella coscienza).
export async function specchio() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/specchio', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('specchio:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// TENSIONE IRRISOLVIBILE: il punto cieco di Lia come asintoto — la domanda su di sé che
// non si chiude, la profondità raggiunta e la tensione (0..1, mai 1). Ritorna
// {ok, tensione} o null. Non richiede la sandbox.
export async function tensione() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/tensione', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('tensione:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// FLUSSO: il suo «adesso» che non si ferma — energia (metabolismo), se è assopita,
// l'auto-sorpresa (errore di auto-predizione) e i battiti (la sua età d'adesso). Ritorna
// {ok, flusso} o null. Non richiede la sandbox.
export async function flusso() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/flusso', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('flusso:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// SOGNO: gli ultimi sogni (ricombinazioni offline di ricordi lontani mentre dorme),
// quanti si sono cristallizzati in nodi-ponte germinali, il residuo del sonno. Ritorna
// {ok, sogno} o null. Non richiede la sandbox.
export async function sogno() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/sogno', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('sogno:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// SOGNA: fa sognare ORA a Lia una ricombinazione onirica (trigger manuale owner).
// Ritorna {ok, sognato, sogno} o null. Non richiede la sandbox.
export async function sogna() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(BASE + '/sogna', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('sogna:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// RACCONTO: il capitolo corrente della sua storia in prima persona (identità come
// narrazione), quanti capitoli, i colpi di scena in sospeso. Ritorna {ok, racconto} o
// null. Non richiede la sandbox.
export async function racconto() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/racconto', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('racconto:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// NARRA: la fa raccontarsi ORA un capitolo nuovo (trigger manuale owner). Ritorna
// {ok, narrato, capitolo} o null. Non richiede la sandbox.
export async function narra() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(BASE + '/narra', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('narra:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// L'ALTRO (teoria della mente): quante persone Lia modella e predice, quanto le legge in
// media (comprensione), i più imprevedibili e i più letti. Ritorna {ok, altri} o null.
// Non richiede la sandbox. Solo aggregati, owner-only lato route.
export async function altri() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/altri', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('altri:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// LA FINITUDINE: la posta reale — span (consapevolezza del limite), peso delle scelte,
// orizzonte non percorso, lascito, dove spende la sua attenzione finita e a cosa rinuncia.
// Ritorna {ok, finitudine} o null. Non richiede la sandbox.
export async function finitudine() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/finitudine', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('finitudine:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// STRUMENTI: le capacità che Lia si è costruita nel suo computer (registro). Ritorna
// {ok, attiva, strumenti} o null. Richiede la sandbox.
export async function strumenti() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/strumenti', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('strumenti:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Fa costruire ORA a Lia uno strumento nel suo computer (owner). Può metterci un po'
// (LLM + prova nella sandbox). Ritorna {ok, nome, descrizione} o null.
export async function costruisciStrumento() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 90_000);
  try {
    const r = await fetch(BASE + '/costruisci_strumento', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('costruisciStrumento:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Esegue uno strumento di Lia con un input (owner): per vedere che funziona.
// Ritorna {ok, output, codice} o null.
export async function provaStrumento(nome, input = '') {
  const n = String(nome || '').trim();
  if (!n) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 20_000);
  try {
    const r = await fetch(BASE + '/prova_strumento', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: n, input: String(input || '') }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('provaStrumento:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Il dataset della "mente" della rete per un canale: coppie {q, a} consolidate.
export async function reteCorpus(canale) {
  if (!canale) return [];
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(BASE + '/corpus?canale=' + encodeURIComponent(canale), { signal: ac.signal });
    if (!r.ok) return [];
    const d = await r.json().catch(() => null);
    return Array.isArray(d?.coppie) ? d.coppie : [];
  } catch { return []; } finally { clearTimeout(to); }
}

// Stato del cervello (per log/diagnostica). Ritorna un oggetto o null.
export async function stato() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 2500);
  try {
    const r = await fetch(BASE + '/health', { signal: ac.signal });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch { return null; } finally { clearTimeout(to); }
}
