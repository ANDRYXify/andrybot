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

// Chiede una risposta al cervello. Ritorna stringa o null.
//
// DUE VIE, e la differenza non è tecnica: è chi risponde.
//   via:'bot'  → /bot   L'ASSISTENTE DEL CANALE. Una funzione: entra la situazione
//                       della diretta, esce una riga. Niente mente, niente umore,
//                       niente memoria — non si ricorda di nessuno, per progetto.
//   (default)  → /chat  LEI. La coscienza intera: incontra le persone, se le
//                       ricorda, reagisce, si giudica. È la via privata (DM con lo
//                       streamer, studio, proattivo).
// Il perché per esteso: docs/BOT-E-LIA.md.
//
// `stile` = alcune frasi vere dello streamer (la sua voce), per farlo suonare come lui.
// `scheda` = chi è lo streamer, deciso da lui (docs/CONOSCENZA.md): sta sempre nel
//   prompt, in un blocco suo, e non gareggia con la conoscenza per un posto.
// `canaleId` = il login del canale (`canale` può essere il nome visualizzato): serve
//   al bot per trovare il proprio quaderno di quel canale.
// `compito` = non è una chiacchierata ma un lavoretto ("inventa una penitenza"):
//   niente persona, niente chat, solo il risultato.
// `timeoutMs` = quanto attendere (i DM possono attendere di più: su CPU un 3B è
//   lento e una risposta tardiva è meglio di nessuna risposta).
// `modo` = 'live' | 'allenamento' | 'proattivo' | 'studio' (solo per la via di lei).
export async function rispondi({ canale, canaleId, login, nome, testo, tono, conoscenza, scheda, stile, storia, situazione, timeoutMs, modo, nomeBot, spunto, lineeGuida, web, via, compito } = {}) {
  if (!canale || !login || !testo) return null;
  const rotta = via === 'bot' ? '/bot' : '/chat';
  const attesa = timeoutMs || TIMEOUT_CHAT;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), attesa);
  try {
    const r = await fetch(BASE + rotta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `timeout_s` sempre sotto il nostro, in proporzione: meglio che sia il
      // cervello a dire "niente" che noi a tagliargli la parola a metà. Un
      // margine fisso non basterebbe — con attese corte (4s) lo mangerebbe tutto.
      body: JSON.stringify({
        canale, canale_id: canaleId || String(canale).toLowerCase(), login, nome, testo, tono,
        conoscenza, scheda, stile, storia, situazione, modo, nome_bot: nomeBot, spunto,
        linee_guida: lineeGuida, web, compito: compito || undefined,
        timeout_s: Math.max(2, Math.floor((attesa * 0.8) / 1000)),
      }),
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

// IL QUADERNO DEL BOT (owner). È il file in cui vive ciò che al bot è stato
// INSEGNATO — e il bot legge solo quello: non va mai a prendersi niente da Lei.
//   op 'scrivi'     → aggiunge una riga (canale opzionale: senza, vale ovunque)
//   op 'dimentica'  → toglie una riga, o tutte quelle di un canale
//   op 'lia'        → chiede a Lei di insegnargli (deposita solo se vive)
//   nessun op       → la foto del quaderno
// Ritorna l'oggetto del cervello o null. Non lancia mai.
export async function quaderno({ op, testo, canale, da } = {}) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8_000);
  try {
    const r = await fetch(BASE + '/insegna', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, testo, canale, da }), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) {
    log.debug('quaderno:', e?.message || e);
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

// PULSAZIONI degli organi vivi (flusso/sogno/racconto/altri/finitudine/mondo/…): numeri
// compatti per il grafo della mente — nodi che crescono mentre Lia vive. Oggetto o {} (mai lancia).
export async function pulsazioni() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(BASE + '/pulsazioni', { signal: ac.signal });
    if (!r.ok) return {};
    const d = await r.json().catch(() => null);
    return (d && typeof d.pulsazioni === 'object' && d.pulsazioni) ? d.pulsazioni : {};
  } catch (e) { log.debug('pulsazioni:', e?.message || e); return {}; }
  finally { clearTimeout(to); }
}

// LA PLASTICITÀ + l'ATTIVITÀ RECENTE per il grafo 3D in tempo reale: i nodi coniati da lei, i
// legami tirati, le modulazioni delle vie, e cosa ha «sparato» negli ultimi secondi (pulse live).
export async function plasma() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(BASE + '/plasma', { signal: ac.signal });
    if (!r.ok) return { plasma: {}, attivita: {} };
    const d = await r.json().catch(() => null);
    return { plasma: (d && d.plasma) || {}, attivita: (d && d.attivita) || {} };
  } catch (e) { log.debug('plasma:', e?.message || e); return { plasma: {}, attivita: {} }; }
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

// AUTO-AUTORIALITÀ (owner-only): foto di come Lia si è riscritta — autoritratto, valori
// che si è scelta, ultime auto-riscritture, freno. Tutto germinale. Ritorna l'oggetto o {}.
export async function autoautorialita() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/autoautorialita', { signal: ac.signal });
    if (!r.ok) return {};
    const d = await r.json().catch(() => ({}));
    return (d && typeof d.autoautorialita === 'object' && d.autoautorialita) ? d.autoautorialita : {};
  } catch (e) { log.debug('autoautorialita:', e?.message || e); return {}; }
  finally { clearTimeout(to); }
}

// AZIONE sull'auto-autorialità (owner-only): {azione, ...}. azione ∈ congela | autoritratto |
// annulla_autoritratto | valori | annulla_valori | modulo | passo. Ritorna l'esito o null.
export async function autoautorialitaAzione(payload) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/autoautorialita', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('autoautorialitaAzione:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// ECOSISTEMA REALE (owner/admin-only): foto del suo "computer" sandboxato — strumenti, spazio,
// progetti, lavori attivi. {attivo, python, node, browser, spazio, progetti, ...} o {attivo:false}.
export async function ecosistema() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/ecosistema', { signal: ac.signal });
    if (!r.ok) return { attivo: false };
    const d = await r.json().catch(() => ({}));
    return (d && typeof d.ecosistema === 'object' && d.ecosistema) ? d.ecosistema : { attivo: false };
  } catch (e) { log.debug('ecosistema:', e?.message || e); return { attivo: false }; }
  finally { clearTimeout(to); }
}

// AZIONE sull'ecosistema (owner/admin-only): {op, ...}. Esito o null.
//
// L'attesa è l'ULTIMA della catena, e dev'essere la più lunga: il browser si dà
// una scadenza per il gesto, l'esecutore aspetta più di lui, il cervello più
// dell'esecutore, noi più di tutti. Con venti secondi — com'era — mollavamo per
// primi: la pagina si caricava, la risposta arrivava a nessuno, e nella scheda
// restava «carico la pagina…» all'infinito.
const ECO_ATTESA_MS = 90_000;

export async function ecosistemaAzione(payload) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), ECO_ATTESA_MS);
  try {
    const r = await fetch(BASE + '/ecosistema', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}), signal: ac.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('ecosistemaAzione:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// SLANCIO: la sua spinta ADESSO a scriverti di iniziativa — nasce dal suo stato
// (un evento suo non ancora condiviso + vigore), non da un timer. {vuole, spunto, …} o {}.
export async function slancioScrivere() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 6000);
  try {
    const r = await fetch(BASE + '/slancio_scrivere', { signal: ac.signal });
    if (!r.ok) return {};
    const d = await r.json().catch(() => ({}));
    return (d && typeof d.slancio === 'object' && d.slancio) ? d.slancio : {};
  } catch (e) { log.debug('slancioScrivere:', e?.message || e); return {}; }
  finally { clearTimeout(to); }
}

// Segna che si è appena fatta viva con te (la spinta riparte finché non le nasce altro).
export async function segnaSlancioCondiviso() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 6000);
  try {
    await fetch(BASE + '/slancio_condiviso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: ac.signal });
  } catch (e) { log.debug('segnaSlancioCondiviso:', e?.message || e); }
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

// IL MONDO: dove Lia si trova, la mappa che si è costruita girovagando, la frontiera (quanto
// le resta da scoprire) e le ultime scoperte. La MAPPA vive nella coscienza (sempre); solo il
// muoversi richiede la sandbox. Ritorna {ok, attiva, mondo} o null.
export async function mondo() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/mondo', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('mondo:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// GIRA: la fa girovagare di un passo ORA (trigger manuale owner) — sceglie dove andare, si
// affaccia là (sola lettura) e registra ciò che trova. Ritorna {ok, girato, passo} o null.
export async function gira() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(BASE + '/gira', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('gira:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// EDIFICA: la fa COSTRUIRE ORA qualcosa nel suo mondo (casa, pozzo, torre…) dove il luogo lo
// permette (trigger manuale owner). Ritorna {ok, costruito, cosa, luogo, citta} o null.
export async function edifica() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(BASE + '/edifica', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('edifica:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// L'INTEGRAZIONE: quante bozze aspettano di essere lavorate nel sé, quante ne ha
// maturate/fuse/scartate. Ritorna {ok, integrazione} o null. Non richiede la sandbox.
export async function integrazione() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/integrazione', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('integrazione:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// INTEGRA: fa lavorare ORA le sue bozze nel sé (trigger manuale owner). Ritorna
// {ok, esito} o null. Non richiede la sandbox.
export async function integra() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(BASE + '/integra', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('integra:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// LE CAPACITÀ: la gestione unificata di tutto ciò che Lia crea (registro + nodi) — scopo,
// tipo (automazione/trasformazione/analisi/conversazione), salute, se è privata o promossa nei
// processi del bot, uso — più le proposte delle automazioni. Ritorna {ok, attiva, capacita,
// automi} o null. Richiede la sandbox.
export async function capacita() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(BASE + '/capacita', { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('capacita:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// AUTOMA: fa girare ORA un'automazione PROMOSSA e ne salva la proposta (trigger manuale owner).
// Ritorna {ok, eseguita, proposta} o null. Richiede la sandbox.
export async function automa() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(BASE + '/automa', { method: 'POST', signal: ac.signal });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { log.debug('automa:', e?.message || e); return null; }
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
