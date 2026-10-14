// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO DELLE RISORSE (docs/RISORSE.md).
//
// Il lavoro vitale (chat, alert, storie, avvisi) non passa mai di qui. Il lavoro
// pesante passa di qui e solo di qui: una porta per classe, con un tetto che
// dipende da quanto è carica la macchina, uno solo a testa e una fila corta.
// Ogni processo figlio del bot nasce da avvia(), a priorità bassa: anche quando
// entra, il pesante cede la CPU al bot.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';

export const LIVELLI = ['verde', 'giallo', 'rosso'];
const GRADO = { verde: 0, giallo: 1, rosso: 2 };

// tetto: quanti lavori NUOVI possono girare insieme a ogni livello.
// aTesta: quanti per persona, in corso più in fila. coda/attesaMs: la fila.
// cede: in rosso chi gira si ferma (lo decide chi lo possiede, con deveCedere).
export const CLASSI = {
  media: { tetto: { verde: 2, giallo: 1, rosso: 0 }, aTesta: 1, coda: 6, attesaMs: 90_000 },
  video: { tetto: { verde: 1, giallo: 0, rosso: 0 }, aTesta: 1, coda: 0, attesaMs: 0 },
  ascolto: { tetto: { verde: Infinity, giallo: 0, rosso: 0 }, aTesta: 1, coda: 0, attesaMs: 0, cede: true },
  cervello: { tetto: { verde: 2, giallo: 1, rosso: 0 }, aTesta: 1, coda: 0, attesaMs: 0 },
  diretta: { tetto: { verde: 4, giallo: 0, rosso: 0 }, aTesta: 1, coda: 0, attesaMs: 0 },
};

// [giallo da, rosso da]. memLibera e' al contrario: sotto la soglia e' peggio.
export const SOGLIE = {
  ritardoMs: [100, 250],
  cpuPsi: [50, 80],
  memPsi: [10, 30],
  memLibera: [0.15, 0.07],
  caricoPerCore: [1.5, 3],
};
export const CALMA_MS = 30_000;
export const NICE_PESANTE = 15;

export const MOTIVI = {
  carico: 'Il server è sotto sforzo in questo momento: riprova fra un minuto. Chat, alert e storie intanto vanno come sempre.',
  tuo: 'Hai già un lavoro di questo tipo in corso: aspetta che finisca, poi manda il prossimo.',
  coda: 'Ci sono già troppi lavori in fila: riprova fra un minuto.',
};

export class Occupato extends Error {
  constructor(motivo, classe, riprovaFraS) {
    super(MOTIVI[motivo] || MOTIVI.carico);
    this.name = 'Occupato';
    this.occupato = true;
    this.motivo = motivo;
    this.classe = classe;
    this.riprovaFraS = riprovaFraS;
  }
}

// Il livello che una misura dice, senza memoria: il peggiore fra i segnali.
export function livelloDi(m = {}) {
  let g = 0;
  const su = (v, [a, b]) => { if (v == null || !Number.isFinite(v)) return; if (v >= b) g = Math.max(g, 2); else if (v >= a) g = Math.max(g, 1); };
  su(m.ritardoMs, SOGLIE.ritardoMs);
  su(m.cpuPsi, SOGLIE.cpuPsi);
  su(m.memPsi, SOGLIE.memPsi);
  if (m.cpuPsi == null) su(m.caricoPerCore, SOGLIE.caricoPerCore);
  if (m.memLibera != null && Number.isFinite(m.memLibera)) {
    const [a, b] = SOGLIE.memLibera;
    if (m.memLibera <= b) g = Math.max(g, 2); else if (m.memLibera <= a) g = Math.max(g, 1);
  }
  return LIVELLI[g];
}

function leggiPsi(quale) {
  try {
    const r = readFileSync(`/proc/pressure/${quale}`, 'utf8').match(/^some avg10=([\d.]+)/m);
    return r ? Number(r[1]) : null;
  } catch { return null; }
}

function leggiMemLibera() {
  try {
    const t = readFileSync('/proc/meminfo', 'utf8');
    const tot = Number(t.match(/^MemTotal:\s+(\d+)/m)?.[1]);
    const lib = Number(t.match(/^MemAvailable:\s+(\d+)/m)?.[1]);
    if (tot > 0 && lib >= 0) return lib / tot;
  } catch { /* niente /proc */ }
  const tot = os.totalmem();
  return tot > 0 ? os.freemem() / tot : null;
}

// La misura vera della macchina. Il ritardo del ciclo si legge su finestre di
// FINESTRA_MS: il p99 dell'ultima finestra chiusa.
const FINESTRA_MS = 5_000;
export function creaMisuraVera() {
  const h = monitorEventLoopDelay({ resolution: 20 });
  h.enable();
  let ultimo = 0;
  let ultimaLettura = Date.now();
  return () => {
    const ora = Date.now();
    if (ora - ultimaLettura >= FINESTRA_MS) {
      ultimo = h.percentile(99) / 1e6;
      h.reset();
      ultimaLettura = ora;
    }
    const cpuPsi = leggiPsi('cpu');
    return {
      ritardoMs: Math.round(ultimo),
      cpuPsi,
      memPsi: leggiPsi('memory'),
      memLibera: leggiMemLibera(),
      caricoPerCore: os.loadavg()[0] / Math.max(1, os.cpus().length),
    };
  };
}

const misuraCalma = () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 1, caricoPerCore: 0 });

// La calma si conta dal primo campione che la vede: per questo la misura vera si
// campiona di continuo (campionaMs), non solo quando qualcuno chiede il livello.
// Altrimenti dieci minuti di calma senza richieste varrebbero zero.
export function creaRisorse({ misura, ora = () => Date.now(), classi = CLASSI, cacheMs = 1_000, campionaMs, avviaProcesso = spawn, abbassa = (pid) => os.setPriority(pid, NICE_PESANTE) } = {}) {
  const vera = !misura && !(process.env.SB_COLLAUDO === '1' && process.env.SB_RISORSE_VERE !== '1');
  const leggi = misura || (vera ? creaMisuraVera() : misuraCalma);
  let livello = 'verde';
  let ultimaMisura = misuraCalma();
  let letto = -Infinity;
  let calmaDa = null;
  let cambiato = ora();
  const st = {};
  for (const k of Object.keys(classi)) st[k] = { inCorso: 0, fila: [], perChi: new Map(), entrati: 0, rifiutati: { carico: 0, tuo: 0, coda: 0 } };
  let giro = null;

  function aggiorna() {
    const adesso = ora();
    if (adesso - letto < cacheMs) return livello;
    letto = adesso;
    try { ultimaMisura = leggi() || ultimaMisura; } catch { /* misura fallita: resta l'ultima */ }
    const grezzo = livelloDi(ultimaMisura);
    if (GRADO[grezzo] > GRADO[livello]) { livello = grezzo; calmaDa = null; cambiato = adesso; }
    else if (GRADO[grezzo] < GRADO[livello]) {
      if (calmaDa == null) calmaDa = adesso;
      if (adesso - calmaDa >= CALMA_MS) { livello = LIVELLI[GRADO[livello] - 1]; calmaDa = GRADO[grezzo] < GRADO[livello] ? adesso : null; cambiato = adesso; }
    } else calmaDa = null;
    return livello;
  }

  const def = (classe) => {
    const d = classi[classe];
    if (!d) throw new Error(`classe di lavoro sconosciuta: ${classe}`);
    return d;
  };
  const tettoOra = (classe) => def(classe).tetto[aggiorna()];
  const chiDi = (chi) => String(chi || 'sistema');
  const piu = (s, chi) => s.perChi.set(chi, (s.perChi.get(chi) || 0) + 1);
  const meno = (s, chi) => { const n = (s.perChi.get(chi) || 0) - 1; if (n > 0) s.perChi.set(chi, n); else s.perChi.delete(chi); };
  const riprova = (classe) => Math.max(15, Math.ceil((def(classe).attesaMs || 60_000) / 1000));

  function permesso(classe, chi) {
    const s = st[classe];
    s.inCorso++; s.entrati++;
    let reso = false;
    return () => {
      if (reso) return;
      reso = true;
      s.inCorso--;
      meno(s, chi);
      smaltisci(classe);
    };
  }

  function smaltisci(classe) {
    const s = st[classe];
    const adesso = ora();
    while (s.fila.length) {
      const primo = s.fila[0];
      if (adesso >= primo.scade) { s.fila.shift(); s.rifiutati.coda++; meno(s, primo.chi); primo.ko(new Occupato('coda', classe, riprova(classe))); continue; }
      if (s.inCorso >= tettoOra(classe)) break;
      s.fila.shift();
      primo.ok(permesso(classe, primo.chi));
    }
    accendiGiro();
  }

  function accendiGiro() {
    const qualcuno = Object.values(st).some((s) => s.fila.length);
    if (qualcuno && !giro) { giro = setInterval(() => { for (const k of Object.keys(st)) if (st[k].fila.length) smaltisci(k); }, 1_000); giro.unref?.(); }
    if (!qualcuno && giro) { clearInterval(giro); giro = null; }
  }

  function rifiuta(classe, motivo) {
    st[classe].rifiutati[motivo]++;
    return new Occupato(motivo, classe, riprova(classe));
  }

  // Entra o aspetta in fila. Torna la funzione che rende il permesso.
  function entra(classe, chi) {
    const d = def(classe);
    const s = st[classe];
    const c = chiDi(chi);
    if ((s.perChi.get(c) || 0) >= d.aTesta) return Promise.reject(rifiuta(classe, 'tuo'));
    const tetto = tettoOra(classe);
    if (s.inCorso < tetto && !s.fila.length) { piu(s, c); return Promise.resolve(permesso(classe, c)); }
    if (tetto === 0) return Promise.reject(rifiuta(classe, 'carico'));
    if (s.fila.length >= d.coda) return Promise.reject(rifiuta(classe, d.coda ? 'coda' : 'carico'));
    piu(s, c);
    return new Promise((ok, ko) => { s.fila.push({ chi: c, ok, ko, scade: ora() + d.attesaMs }); accendiGiro(); });
  }

  // Senza fila: il permesso subito, o null. Per il lavoro di fondo che si salta.
  function prova(classe, chi) {
    const d = def(classe);
    const s = st[classe];
    const c = chiDi(chi);
    if ((s.perChi.get(c) || 0) >= d.aTesta) { s.rifiutati.tuo++; return null; }
    if (s.inCorso >= tettoOra(classe) || s.fila.length) { s.rifiutati.carico++; return null; }
    piu(s, c);
    return permesso(classe, c);
  }

  async function con(classe, chi, fn) {
    const esci = await entra(classe, chi);
    try { return await fn(); } finally { esci(); }
  }

  // L'unico posto da cui nasce un processo figlio del bot: a priorità bassa.
  function avvia(comando, args, opzioni) {
    const p = avviaProcesso(comando, args, opzioni);
    if (p?.pid > 0) { try { abbassa(p.pid); } catch { /* processo gia' uscito */ } }
    return p;
  }

  const deveCedere = (classe) => !!def(classe).cede && aggiorna() === 'rosso';
  const puoIniziare = (classe) => tettoOra(classe) > st[classe].inCorso;

  function stato() {
    const lv = aggiorna();
    const classiSt = {};
    for (const [k, s] of Object.entries(st)) {
      const t = classi[k].tetto[lv];
      classiSt[k] = { inCorso: s.inCorso, inFila: s.fila.length, tetto: Number.isFinite(t) ? t : null, entrati: s.entrati, rifiutati: { ...s.rifiutati } };
    }
    return { livello: lv, da: cambiato, misura: { ...ultimaMisura }, classi: classiSt };
  }

  const ogni = campionaMs ?? (vera ? 2_000 : 0);
  if (ogni > 0) setInterval(aggiorna, ogni).unref?.();

  return { livello: aggiorna, entra, prova, con, avvia, deveCedere, puoIniziare, stato };
}

export const risorse = creaRisorse();
