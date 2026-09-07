// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA RETE: quello che un canale riconosce diventa noto agli altri.
//
// Il punto dolente dello scudo non è mai stato il codice, è il carburante. La
// lista pubblica di bot noti che scarichiamo si è fermata: 6.590 nomi, uno solo
// aggiunto nell'ultimo anno, zero negli ultimi trenta giorni. Contro un
// follow-bot nato questo mese non ha niente da dire.
//
// Gli strumenti di riferimento questo problema non ce l'hanno perché guardano
// migliaia di canali insieme: vedono l'attacco sul canale A e lo riconoscono sul
// canale B un minuto dopo. Quella è scala, non codice — ma la scala in piccolo
// ce l'abbiamo anche noi, ed è fatta dei canali che il bot serve. Basta metterla
// in comune, e cresce da sola man mano che gli streamer arrivano.
//
// LE QUATTRO REGOLE, e sono tutte contro di noi. Una lista condivisa è anche il
// modo più veloce di propagare un errore a tutti i canali insieme, quindi la
// prudenza sta nella struttura e non nell'attenzione di chi scrive:
//
// 1. ENTRA SOLO QUELLO CHE UN CANALE HA MISURATO E SU CUI HA AGITO — un blocco
//    durante un'ondata giudicata artificiale, un account dentro a un coro. Mai
//    un giudizio sul profilo: «account nuovo e spoglio» è la descrizione di uno
//    spettatore appena arrivato, e non si spedisce agli altri canali.
// 2. SERVE LA CONFERMA DI TRE CANALI INDIPENDENTI. Un canale solo può
//    sbagliare, o essere in mano a qualcuno in malafede. Tre che misurano la
//    stessa cosa separatamente, molto più difficilmente.
// 3. SI ESCE. Ogni nome scade se nessuno lo riconferma, perché gli account
//    cambiano mano, e l'owner può toglierlo a mano.
// 4. FINCHÉ NON È CONFERMATO NON VALE NIENTE. Un nome visto da uno o due canali
//    compare in console come «visto altrove» e non tocca il punteggio: fa
//    guardare, non fa agire.
//
// E un tetto a quanto un singolo canale può aggiungere in un giorno, così un
// canale impazzito o compromesso non riempie la lista di tutti.
//
// Sulla privacy: l'elenco dei canali che hanno riconosciuto un account serve
// solo alla regola dei tre, e vive solo finché serve. Appena il nome è
// confermato l'elenco viene buttato e resta il conteggio.
//
// Il modello per esteso: docs/RETE.md.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeLog } from '../logger.js';
import { config } from '../config.js';
import { RETE_CONFERME_PIENE } from './punteggio.js';

const log = makeLog('rete');
const norm = (s) => String(s || '').toLowerCase().trim();

export const CONFERME = 3;                       // quanti canali indipendenti servono
const SCADE_MS = 90 * 24 * 60 * 60 * 1000;       // senza riconferme, un nome esce
const TETTO_GIORNO = 200;                        // quanto può aggiungere un canale in un giorno
const MAX_NOMI = 200000;
const FILE = () => join(config.dataDir, 'rete-bot.json');

// login → { canali:Set (finché non confermato) | null, quanti, motivo, ts }
const nomi = new Map();
// canale → { giorno, quanti }
const quote = new Map();
let daSalvare = false;
let timer = null;

const oggi = () => Math.floor(Date.now() / 86400000);

// I motivi ammessi, ed è una lista chiusa apposta: è la regola 1 scritta in una
// forma che non si può aggirare per distrazione. Un motivo nuovo va aggiunto
// qui, e chi lo aggiunge deve fermarsi a pensare se è una cosa MISURATA.
export const MOTIVI = new Set(['ondata', 'coro']);

// Un canale riconosce un account. Ritorna com'è messo adesso quel nome, oppure
// null se la segnalazione non è stata presa (motivo non ammesso, quota finita,
// doppione dello stesso canale).
export function segnala(canale, login, motivo) {
  const ch = norm(canale);
  const l = norm(login);
  if (!ch || !l || !MOTIVI.has(motivo)) return null;

  const g = oggi();
  const q = quote.get(ch);
  const usate = q && q.giorno === g ? q.quanti : 0;
  if (usate >= TETTO_GIORNO) return null;

  const ora = Date.now();
  let v = nomi.get(l);
  if (v && ora - v.ts > SCADE_MS) v = undefined;      // scaduto: si riparte
  if (!v) v = { canali: new Set(), quanti: 0, motivo, ts: ora };

  // L'INDIPENDENZA VALE FINO IN FONDO, non solo fino alla terza conferma. Il
  // conteggio decide anche lo scalino alto, quello che da solo fa agire tutti i
  // canali: se dopo la conferma un canale potesse continuare a contare per se'
  // stesso, uno solo — sbagliato o compromesso — porterebbe un nome da tre a
  // sei e lo farebbe condannare ovunque. Quindi l'elenco si tiene finche' il
  // numero puo' ancora salire, e non un momento di piu': arrivati al massimo,
  // il numero non cresce e l'elenco sparisce.
  if (!v.canali) return statoDi(l, v);                // al massimo: non si conta oltre
  if (v.canali.has(ch)) return statoDi(l, v);         // già suo: non conta due volte
  v.canali.add(ch);
  v.quanti = v.canali.size;
  if (v.quanti >= RETE_CONFERME_PIENE) v.canali = null;
  v.ts = ora;
  v.motivo = motivo;
  nomi.set(l, v);
  quote.set(ch, { giorno: g, quanti: usate + 1 });
  if (nomi.size > MAX_NOMI) pota();
  programmaSalvataggio();
  if (v.quanti === CONFERME) log.info(`rete: «${l}» confermato da ${CONFERME} canali (${motivo})`);
  return statoDi(l, v);
}

function statoDi(login, v) {
  return { login, canali: v.quanti, confermato: v.quanti >= CONFERME, motivo: v.motivo };
}

// Quanti canali indipendenti hanno riconosciuto questo account. Zero se non lo
// conosce nessuno o se il nome è scaduto.
export function quantiLoSegnalano(login) {
  const v = nomi.get(norm(login));
  if (!v || Date.now() - v.ts > SCADE_MS) return 0;
  return v.quanti;
}

export const confermato = (login) => quantiLoSegnalano(login) >= CONFERME;

// L'owner toglie un nome: la regola 3 non è solo la scadenza. Se abbiamo
// sbagliato, si deve poter disfare adesso e non fra novanta giorni.
export function dimentica(login) {
  const l = norm(login);
  if (!nomi.has(l)) return false;
  nomi.delete(l);
  programmaSalvataggio();
  log.info(`rete: «${l}» tolto a mano`);
  return true;
}

export function pota(ora = Date.now()) {
  for (const [k, v] of nomi) if (ora - v.ts > SCADE_MS) nomi.delete(k);
  return nomi.size;
}

export function stato() {
  let confermati = 0;
  for (const v of nomi.values()) if (v.quanti >= CONFERME) confermati++;
  return { nomi: nomi.size, confermati, conferme: CONFERME, tettoGiorno: TETTO_GIORNO };
}

// I confermati, per chi vuole guardarli (console dell'owner). Mai i canali che
// li hanno segnalati: quelli non escono di qui.
export function elenco({ limite = 200, soloConfermati = true } = {}) {
  const out = [];
  for (const [login, v] of nomi) {
    if (soloConfermati && v.quanti < CONFERME) continue;
    out.push({ login, canali: v.quanti, motivo: v.motivo, ts: v.ts });
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, limite);
}

// Solo per le prove: la rete è stato di modulo, e una prova non deve ereditare
// quella di un'altra.
export function azzera() { nomi.clear(); quote.clear(); }

// ── La casa su disco ────────────────────────────────────────────────────────
// Questa è conoscenza guadagnata, non una finestra di trenta secondi: perderla
// vuol dire ricominciare da capo a imparare chi sono i bot.
function programmaSalvataggio() {
  daSalvare = true;
  if (timer) return;
  timer = setTimeout(() => { salva().catch(() => {}); }, 5000);
  if (timer.unref) timer.unref();
}

export async function salva() {
  timer = null;
  if (!daSalvare) return;
  daSalvare = false;
  pota();
  const righe = [];
  for (const [login, v] of nomi) righe.push([login, v.quanti, v.motivo, v.ts, v.canali ? [...v.canali] : null]);
  await writeFile(FILE(), JSON.stringify({ v: 1, righe }))
    .catch((e) => log.warn('rete non salvata su disco:', e?.message || e));
}

export async function carica() {
  try {
    const j = JSON.parse(await readFile(FILE(), 'utf8'));
    const ora = Date.now();
    for (const r of (j?.righe || [])) {
      if (!Array.isArray(r) || !r[0]) continue;
      const [login, quanti, motivo, ts, canali] = r;
      if (!MOTIVI.has(motivo) || ora - (ts || 0) > SCADE_MS) continue;
      nomi.set(norm(login), {
        canali: Array.isArray(canali) ? new Set(canali.map(norm)) : null,
        quanti: Number(quanti) || 0, motivo, ts: Number(ts) || 0,
      });
    }
    log.info(`rete: ${nomi.size} nomi ripresi dal disco (${stato().confermati} confermati)`);
  } catch (e) { /* prima volta: nessun file */ }
}
