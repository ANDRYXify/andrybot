// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// GLI INCIDENTI: un attacco è una cosa sola, non trecento righe di registro.
//
// Il registro c'era già, e non bastava. Dopo un'ondata restavano quattrocento
// righe in fila — «bloccato», «bloccato», «assetto», «bloccato» — e per capire
// cos'era successo bisognava rimetterle insieme a mano ogni volta: quando è
// cominciato, quanto è durato, quanto forte è andato, chi c'era dentro, cosa
// abbiamo fatto, quanto ha funzionato. Le domande sono sempre quelle sei, e la
// risposta va costruita mentre succede, non ricostruita dopo.
//
// Quindi un attacco diventa un OGGETTO: si apre quando l'assetto sale, si
// chiude quando si torna in pace, e nel mezzo si riempie da solo.
//
// SI RIAPRE. Un attacco che riprende sette minuti dopo non è un attacco nuovo,
// è lo stesso che respira. Se aprissimo un incidente ogni volta, un'ondata a
// ondate diventerebbe dieci incidenti da niente invece di uno grosso, e il
// conto dei danni sarebbe sbagliato in tutti e dieci.
//
// I COINVOLTI HANNO UN GIUDIZIO, e non è un dettaglio: serve alla bonifica. Chi
// è arrivato durante un attacco non è per ciò stesso un bot — dentro
// un'ondata ci finisce anche gente vera, ed è quella che non si deve toccare
// dopo, quando si ripulisce.
//
// Il modello per esteso: docs/INCIDENTI.md.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeLog } from '../logger.js';
import { config } from '../config.js';

const log = makeLog('incidenti');
const norm = (s) => String(s || '').toLowerCase().trim();

// Quanto silenzio serve prima che un attacco che riprende conti come nuovo.
export const RIAPRE_MS = 15 * 60 * 1000;
const TIMELINE_MAX = 300;
const PER_CANALE = 200;
const VECCHI_MS = 180 * 24 * 60 * 60 * 1000;
const FILE = () => join(config.dataDir, 'incidenti.json');

// Come si giudica chi c'era. Serve a non ripulire alla cieca dopo.
export const GIUDIZI = { CERTO: 'certo', PROBABILE: 'probabile', SOSPETTO: 'sospetto', LEGITTIMO: 'legittimo' };
const PESO = { legittimo: 0, sospetto: 1, probabile: 2, certo: 3 };

const tutti = new Map();         // id → incidente
const apertiPerCanale = new Map();  // canale → id
let contatore = 0;
let daSalvare = false;
let timer = null;

function nuovoId() {
  contatore++;
  return `INC-${new Date().getFullYear()}-${String(contatore).padStart(6, '0')}`;
}

// Apre un incidente, oppure RIAPRE l'ultimo se si è chiuso da poco.
export function apri(canale, { tipo = 'ignoto', motivo = '', livello = '' } = {}) {
  const ch = norm(canale);
  if (!ch) return null;
  const gia = aperto(ch);
  if (gia) return gia;

  const ultimo = ultimoDi(ch);
  if (ultimo && ultimo.chiuso && Date.now() - ultimo.chiuso < RIAPRE_MS) {
    ultimo.chiuso = null;
    ultimo.riaperture++;
    if (ultimo.tipo !== tipo) ultimo.tipo = 'misto';
    apertiPerCanale.set(ch, ultimo.id);
    riga(ultimo, `riprende: ${motivo || tipo}`);
    log.warn(`#${ch} ${ultimo.id} riaperto (${ultimo.riaperture}ª volta)`);
    programmaSalvataggio();
    return ultimo;
  }

  const inc = {
    id: nuovoId(), canale: ch, tipo,
    aperto: Date.now(), chiuso: null, riaperture: 0,
    picco: { livello: livello || '', ts: Date.now(), quanti: 0 },
    coinvolti: {},                         // login → { giudizio, punti, ts }
    azioni: {},                            // azione → { fatte, fallite, aVuoto }
    timeline: [],
  };
  tutti.set(inc.id, inc);
  apertiPerCanale.set(ch, inc.id);
  riga(inc, `aperto: ${motivo || tipo}`);
  log.warn(`#${ch} ${inc.id} aperto — ${motivo || tipo}`);
  pota();
  programmaSalvataggio();
  return inc;
}

export function aperto(canale) {
  const id = apertiPerCanale.get(norm(canale));
  const inc = id ? tutti.get(id) : null;
  return inc && !inc.chiuso ? inc : null;
}

export function chiudi(canale, motivo = '') {
  const inc = aperto(canale);
  if (!inc) return null;
  inc.chiuso = Date.now();
  apertiPerCanale.delete(norm(canale));
  riga(inc, `chiuso: ${motivo || 'rientro in calma'}`);
  log.info(`#${inc.canale} ${inc.id} chiuso dopo ${Math.round((inc.chiuso - inc.aperto) / 1000)}s`);
  programmaSalvataggio();
  return inc;
}

// Una riga di racconto. Sono queste a rispondere a «cos'è successo, e quando».
export function riga(inc, cosa) {
  if (!inc || !cosa) return;
  inc.timeline.push({ ts: Date.now(), cosa: String(cosa).slice(0, 200) });
  if (inc.timeline.length > TIMELINE_MAX) inc.timeline.splice(0, inc.timeline.length - TIMELINE_MAX);
  programmaSalvataggio();
}

export function racconta(canale, cosa) {
  const inc = aperto(canale);
  if (inc) riga(inc, cosa);
  return inc;
}

// Quanto forte è andato. Il picco si aggiorna solo se si sale: serve a dire
// quanto è stato grave, non com'è adesso.
export function segnaPicco(canale, { livello = '', quanti = 0 } = {}) {
  const inc = aperto(canale);
  if (!inc) return null;
  if (quanti > (inc.picco.quanti || 0)) inc.picco = { livello: livello || inc.picco.livello, ts: Date.now(), quanti };
  else if (livello && livello !== inc.picco.livello && !inc.picco.quanti) inc.picco = { livello, ts: Date.now(), quanti: 0 };
  programmaSalvataggio();
  return inc;
}

// Chi c'era, e come lo giudichiamo. Un giudizio più grave sostituisce uno più
// lieve, mai il contrario: durante un attacco si scopre, non si dimentica.
export function coinvolto(canale, login, giudizio = GIUDIZI.SOSPETTO, punti = 0) {
  const inc = aperto(canale);
  const l = norm(login);
  if (!inc || !l) return null;
  const gia = inc.coinvolti[l];
  if (gia && (PESO[gia.giudizio] ?? 0) >= (PESO[giudizio] ?? 0)) return inc;
  inc.coinvolti[l] = { giudizio, punti: Number(punti) || 0, ts: Date.now() };
  programmaSalvataggio();
  return inc;
}

// Cosa abbiamo fatto, e come è andata. La riga arriva dall'esecutore: qui si
// conta e basta.
export function segnaAzione(canale, { azione, esito }) {
  const inc = aperto(canale);
  if (!inc || !azione) return null;
  const c = inc.azioni[azione] || { fatte: 0, fallite: 0, aVuoto: 0 };
  if (esito === 'fatto') c.fatte++;
  else if (esito === 'a-vuoto') c.aVuoto++;
  else if (esito === 'fallito') c.fallite++;
  inc.azioni[azione] = c;
  programmaSalvataggio();
  return inc;
}

// ── Leggerli ────────────────────────────────────────────────────────────────
export function uno(id) { return tutti.get(String(id || '')) || null; }

export function ultimoDi(canale) {
  const ch = norm(canale);
  let migliore = null;
  for (const inc of tutti.values()) {
    if (inc.canale !== ch) continue;
    if (!migliore || inc.aperto > migliore.aperto) migliore = inc;
  }
  return migliore;
}

export function elenco(canale, { limite = 50 } = {}) {
  const ch = norm(canale);
  return [...tutti.values()].filter((i) => i.canale === ch)
    .sort((a, b) => b.aperto - a.aperto).slice(0, limite).map(sintesi);
}

// La sintesi è quello che serve a chi guarda: le sei domande, e i coinvolti
// contati per giudizio invece che elencati tutti.
export function sintesi(inc) {
  if (!inc) return null;
  const per = { certo: 0, probabile: 0, sospetto: 0, legittimo: 0 };
  for (const v of Object.values(inc.coinvolti)) per[v.giudizio] = (per[v.giudizio] || 0) + 1;
  return {
    id: inc.id, canale: inc.canale, tipo: inc.tipo,
    aperto: inc.aperto, chiuso: inc.chiuso, riaperture: inc.riaperture,
    durata: Math.round(((inc.chiuso || Date.now()) - inc.aperto) / 1000),
    picco: inc.picco, azioni: inc.azioni,
    coinvolti: Object.keys(inc.coinvolti).length, per,
    righe: inc.timeline.length,
  };
}

export function stato() {
  let apertiOra = 0;
  for (const inc of tutti.values()) if (!inc.chiuso) apertiOra++;
  return { totali: tutti.size, aperti: apertiOra };
}

export function azzera() { tutti.clear(); apertiPerCanale.clear(); contatore = 0; }

function pota() {
  const ora = Date.now();
  for (const [id, inc] of tutti) if (inc.chiuso && ora - inc.chiuso > VECCHI_MS) tutti.delete(id);
  const perCanale = new Map();
  for (const inc of [...tutti.values()].sort((a, b) => b.aperto - a.aperto)) {
    const n = (perCanale.get(inc.canale) || 0) + 1;
    perCanale.set(inc.canale, n);
    if (n > PER_CANALE && inc.chiuso) tutti.delete(inc.id);
  }
}

// ── La casa su disco ────────────────────────────────────────────────────────
function programmaSalvataggio() {
  daSalvare = true;
  if (timer) return;
  timer = setTimeout(() => { salva().catch(() => {}); }, 3000);
  if (timer.unref) timer.unref();
}

export function salva() {
  timer = null;
  if (!daSalvare) return Promise.resolve();
  daSalvare = false;
  _scrittura = (_scrittura || Promise.resolve()).then(
    () => writeFile(FILE(), JSON.stringify({ v: 1, contatore, righe: [...tutti.values()] }))
      .catch((e) => log.warn('incidenti non salvati:', e?.message || e)),
  );
  return _scrittura;
}
let _scrittura = null;

// Al riavvio un incidente rimasto aperto si CHIUDE, e non si cancella. Il bot
// non ha nessuna prova che l'attacco sia ancora in corso — la stessa ragione per
// cui l'assetto torna in pace — ma quello che è successo è successo, e resta
// scritto. Se l'attacco continua davvero, il prossimo allarme lo riapre.
export async function carica() {
  try {
    const j = JSON.parse(await readFile(FILE(), 'utf8'));
    contatore = Number(j?.contatore) || 0;
    let riaperti = 0;
    for (const inc of (j?.righe || [])) {
      if (!inc?.id || !inc.canale) continue;
      if (!inc.chiuso) { inc.chiuso = Date.now(); riga(inc, 'chiuso: il bot è ripartito'); riaperti++; }
      tutti.set(inc.id, inc);
    }
    pota();
    if (tutti.size) log.info(`incidenti: ${tutti.size} ripresi dal disco${riaperti ? `, ${riaperti} chiusi al riavvio` : ''}`);
  } catch (e) { /* prima volta: nessun file */ }
}
