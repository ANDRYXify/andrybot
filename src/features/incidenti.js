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
import { streamers } from '../db.js';
import { N as LIVELLO_N } from './livelli.js';

const log = makeLog('incidenti');
const norm = (s) => String(s || '').toLowerCase().trim();

// Quanto silenzio serve prima che un attacco che riprende conti come nuovo.
export const RIAPRE_MS = 15 * 60 * 1000;
const TIMELINE_MAX = 300;
// Il rapporto di un attacco (docs/INCIDENTI.md, «Il rapporto dell'attacco»)
// vuole sapere anche COME e' andato, non solo come e' finito: la scala dei
// livelli, i follow minuto per minuto, i raid. Ognuno ha un tetto: un attacco
// di due giorni non deve diventare un file di dieci mega.
const LIVELLI_MAX = 100;
const CURVA_MAX = 2880;        // minuti: due giorni
const RAID_MAX = 50;
const PER_CANALE = 200;
const VECCHI_MS = 180 * 24 * 60 * 60 * 1000;
const FILE = () => join(config.dataDir, 'incidenti.json');

// Come si giudica chi c'era. Serve a non ripulire alla cieca dopo. Ogni
// giudizio ha chi lo assegna (antibot.js): uno che nessuno assegna sarebbe un
// conto sempre a zero nel registro. Un «probabile» fra sospetto e certo c'era,
// e non lo dava nessuno: tolto.
export const GIUDIZI = { CERTO: 'certo', SOSPETTO: 'sospetto', LEGITTIMO: 'legittimo' };
const PESO = { legittimo: 0, sospetto: 1, certo: 3 };

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
  // un attacco si apre solo su un canale che c'e' (come il registro dello scudo)
  if (!ch || !streamers.get(ch)) return null;
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
    id: nuovoId(), canale: ch, tipo, motivo: String(motivo || '').slice(0, 200),
    aperto: Date.now(), chiuso: null, riaperture: 0,
    picco: { livello: livello || '', ts: Date.now(), quanti: 0, punti: 0 },
    coinvolti: {},                         // login → { giudizio, punti, ts }
    azioni: {},                            // azione → { fatte, fallite, aVuoto }
    timeline: [],
    livelli: livello ? [{ ts: Date.now(), livello }] : [],   // la scala, salite e discese
    curva: {},                             // minuto → [follow, tolti]
    raid: [],                              // { ts, da, quanti }
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

// Quanto forte è andato. Il picco SOLO SALE: serve a dire quanto è stato grave,
// non com'è adesso. Il livello si confronta per gradino (livelli.js), non per
// nome: prima bastava un nome diverso, e un attacco in serrata che riprendeva in
// «osservo» si ritrovava col picco in «osservo». I punti e i segnali sono quelli
// del momento piu' grave, e stanno insieme al livello: dicono PERCHE' e' salito.
export function segnaPicco(canale, { livello = '', quanti = 0, punti = 0, segnali = null } = {}) {
  const inc = aperto(canale);
  if (!inc) return null;
  const p = inc.picco || (inc.picco = { livello: '', ts: inc.aperto, quanti: 0, punti: 0 });
  const piuAlto = livello && (LIVELLO_N[livello] ?? -1) > (LIVELLO_N[p.livello] ?? -1);
  if (piuAlto) { p.livello = livello; p.ts = Date.now(); }
  if (Number(quanti) > (Number(p.quanti) || 0)) p.quanti = Number(quanti);
  if (Number(punti) > (Number(p.punti) || 0) || (piuAlto && segnali)) {
    p.punti = Math.max(Number(p.punti) || 0, Number(punti) || 0);
    if (segnali && typeof segnali === 'object') p.segnali = { ...segnali };
  }
  programmaSalvataggio();
  return inc;
}

// LA SCALA: ogni cambio di livello, salita o discesa. Il picco dice fin dove si
// e' arrivati; la scala dice come, e quanto e' durato ogni gradino.
export function segnaLivello(canale, livello) {
  const inc = aperto(canale);
  if (!inc || !livello) return null;
  const s = inc.livelli || (inc.livelli = []);
  if (s.length && s[s.length - 1].livello === livello) return inc;
  s.push({ ts: Date.now(), livello });
  if (s.length > LIVELLI_MAX) s.splice(0, s.length - LIVELLI_MAX);
  programmaSalvataggio();
  return inc;
}

// LA CURVA: i follow arrivati e quelli tolti, minuto per minuto. E' il grafico
// del rapporto, e il numero piu' onesto su quanto e' stato grosso l'attacco.
// Il minuto e' quello dell'evento (`ts`), non quello in cui ci arriva.
function segnaCurva(inc, ts, colonna, n = 1) {
  const m = Math.floor((Number(ts) || Date.now()) / 60000);
  const c = inc.curva || (inc.curva = {});
  const v = c[m] || (c[m] = [0, 0]);
  v[colonna] += n;
  const chiavi = Object.keys(c);
  if (chiavi.length > CURVA_MAX) {
    chiavi.map(Number).sort((a, b) => a - b).slice(0, chiavi.length - CURVA_MAX).forEach((k) => { delete c[k]; });
  }
  programmaSalvataggio();
}

export function segnaFollow(canale, ts = Date.now()) {
  const inc = aperto(canale);
  if (!inc) return null;
  segnaCurva(inc, ts, 0);
  return inc;
}

// FIN DOVE SI E' AVVISATO lo streamer per questo attacco: il gradino piu' alto
// di cui ha gia' ricevuto il messaggio (rapporto-attacco.js, devoAvvisare). Sta
// nell'incidente, e quindi resiste a un riavvio: un riavvio non deve fargli
// arrivare lo stesso avviso due volte.
export function segnaAvvisato(canale, livello) {
  const inc = aperto(canale);
  if (!inc || !livello) return null;
  inc.avvisato = livello;
  programmaSalvataggio();
  return inc;
}

// Il rapporto e' partito, e da dove: il pannello lo dice, e non si manda due volte.
export function segnaRapporto(id, dove) {
  const inc = uno(id);
  if (!inc || !dove) return null;
  const r = inc.rapporto || (inc.rapporto = {});
  r[dove] = Date.now();
  programmaSalvataggio();
  return inc;
}

// I raid arrivati mentre l'attacco era in corso: un raid vero in mezzo a
// un'ondata cambia la lettura del grafico, e va detto.
export function segnaRaid(canale, { da = '', quanti = 0 } = {}) {
  const inc = aperto(canale);
  if (!inc) return null;
  const r = inc.raid || (inc.raid = []);
  r.push({ ts: Date.now(), da: norm(da), quanti: Number(quanti) || 0 });
  if (r.length > RAID_MAX) r.splice(0, r.length - RAID_MAX);
  programmaSalvataggio();
  return inc;
}

// Chi c'era, e come lo giudichiamo. Un giudizio più grave sostituisce uno più
// lieve, mai il contrario: durante un attacco si scopre, non si dimentica.
// Una persona e' (piattaforma, nome): la chiave e' il nome per Twitch, come e'
// sempre stato, e «kick:nome» per Kick, con il nome e la piattaforma anche
// dentro la riga. Due «mario» sulle due piattaforme sono due righe.
export const chiaveCoinvolto = (login, piattaforma = 'twitch') => (piattaforma === 'kick' ? 'kick:' : '') + norm(login);
export function coinvolto(canale, login, giudizio = GIUDIZI.SOSPETTO, punti = 0, userId = '', piattaforma = 'twitch') {
  const inc = aperto(canale);
  const nome = norm(login);
  if (!inc || !nome) return null;
  const kick = piattaforma === 'kick';
  const l = chiaveCoinvolto(nome, piattaforma);
  const gia = inc.coinvolti[l];
  // L'id si tiene anche quando il giudizio non cambia: senza, dopo l'attacco
  // non si può fare niente a nessuno — Twitch vuole l'id, non il nome.
  const id = String(userId || gia?.userId || '');
  if (gia && (PESO[gia.giudizio] ?? 0) >= (PESO[giudizio] ?? 0)) {
    if (id && !gia.userId) { gia.userId = id; programmaSalvataggio(); }
    return inc;
  }
  inc.coinvolti[l] = { giudizio, punti: Number(punti) || 0, ts: Date.now(), userId: id, ...(kick ? { piattaforma: 'kick', login: nome } : {}) };
  programmaSalvataggio();
  return inc;
}

// Un follow arrivato a scudo alzato, e non festeggiato (antibot.taciFollow).
// Si conta e basta: chi era lo sa gia' `coinvolti`, se lo scudo l'ha giudicato.
export function segnaTaciuto(canale) {
  const inc = aperto(canale);
  if (!inc) return null;
  inc.taciuti = (Number(inc.taciuti) || 0) + 1;
  programmaSalvataggio();
  return inc;
}

// Cosa abbiamo fatto, e come è andata. La riga arriva dall'esecutore: qui si
// conta e basta. Quelle che tolgono qualcuno dal canale vanno anche nella curva.
const TOGLIE = new Set(['blocca', 'ban', 'timeout']);
export function segnaAzione(canale, { azione, esito }) {
  const inc = aperto(canale);
  if (!inc || !azione) return null;
  const c = inc.azioni[azione] || { fatte: 0, fallite: 0, aVuoto: 0 };
  if (esito === 'fatto' && TOGLIE.has(azione)) segnaCurva(inc, Date.now(), 1);
  if (esito === 'fatto') c.fatte++;
  else if (esito === 'a-vuoto') c.aVuoto++;
  else if (esito === 'fallito') c.fallite++;
  inc.azioni[azione] = c;
  programmaSalvataggio();
  return inc;
}

// ── Leggerli ────────────────────────────────────────────────────────────────

// I PRECEDENTI di una persona in questo canale. Li chiede la reputazione, che è
// l'unica ad averne bisogno: qui non si giudica niente di nuovo, si rilegge
// quello che è già scritto negli incidenti.
//
// Due classi, e sono la stessa distinzione dei giudizi già registrati.
// CERTO vuol dire che lo scudo ha agito su quel nome; SOSPETTO vuol dire che
// c'era durante un attacco e non l'abbiamo toccato.
// LEGITTIMO non lascia traccia: essere stati assolti non è un precedente.
//
// Di ogni classe torna solo la data PIÙ RECENTE, perché è quella che la
// reputazione fa decadere. Contare quante volte è successo trasformerebbe una
// serie di incidenti ravvicinati in una condanna che non scade più.
export function precedenti(canale, logins = []) {
  const ch = norm(canale);
  const fuori = new Map();
  if (!ch || !logins.length) return fuori;
  const cercati = new Map();
  for (const l0 of logins) {
    const l = norm(l0);
    if (l && !cercati.has(l)) { cercati.set(l, { colpito: 0, sospettato: 0 }); fuori.set(l, cercati.get(l)); }
  }
  // Si scorrono i coinvolti di ogni attacco, non i nomi cercati: la lista dei
  // follower ne chiede decine di migliaia alla volta, e gli attacchi hanno
  // pochi coinvolti ciascuno.
  for (const inc of tutti.values()) {
    if (inc.canale !== ch) continue;
    for (const [l, c] of Object.entries(inc.coinvolti || {})) {
      const v = cercati.get(l);
      if (!v || !c) continue;
      const quando = Number(c.ts) || 0;
      if (!quando) continue;
      if (c.giudizio === GIUDIZI.CERTO) { if (quando > v.colpito) v.colpito = quando; }
      else if (c.giudizio === GIUDIZI.SOSPETTO) { if (quando > v.sospettato) v.sospettato = quando; }
    }
  }
  return fuori;
}

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
  const per = Object.fromEntries(Object.values(GIUDIZI).map((g) => [g, 0]));
  for (const v of Object.values(inc.coinvolti)) per[v.giudizio] = (per[v.giudizio] || 0) + 1;
  let follow = 0, tolti = 0;
  for (const v of Object.values(inc.curva || {})) { follow += Number(v?.[0]) || 0; tolti += Number(v?.[1]) || 0; }
  return {
    id: inc.id, canale: inc.canale, tipo: inc.tipo, motivo: inc.motivo || '',
    aperto: inc.aperto, chiuso: inc.chiuso, riaperture: inc.riaperture,
    durata: Math.round(((inc.chiuso || Date.now()) - inc.aperto) / 1000),
    picco: inc.picco, azioni: inc.azioni,
    coinvolti: Object.keys(inc.coinvolti).length, per,
    taciuti: Number(inc.taciuti) || 0,
    follow, tolti, raid: (inc.raid || []).length,
    righe: inc.timeline.length,
  };
}

// I DATI DI UN CANALE, per la sua esportazione e per la sua cancellazione. Gli
// attacchi stanno in un file solo per tutti: senza queste due, chi scaricava i
// suoi dati non ci trovava i suoi attacchi, e chi cancellava l'account se li
// lasciava dietro, coi nomi di chi c'era dentro.
export function diCanale(canale) {
  const ch = norm(canale);
  return [...tutti.values()].filter((i) => i.canale === ch).sort((a, b) => a.aperto - b.aperto);
}

export function dimenticaCanale(canale) {
  const ch = norm(canale);
  let n = 0;
  for (const [id, inc] of tutti) if (inc.canale === ch) { tutti.delete(id); n++; }
  apertiPerCanale.delete(ch);
  if (n) { daSalvare = true; salva().catch(() => {}); }
  return n;
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
