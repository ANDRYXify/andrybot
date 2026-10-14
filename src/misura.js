// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA MISURA DEL SERVER VERO (docs/RISORSE.md, «Alleggerimento»).
//
// Alleggerire senza misurare e' tirare a indovinare. Qui l'amministratore fa
// partire una misura di N secondi sul server in esercizio: il profilo della
// CPU del bot (a campioni, dal suo stesso inspector), i fermi del ciclo, il
// lavoro della raccolta della memoria. Ne esce un riassunto per FILE e per
// FUNZIONE del nostro codice: solo nomi e righe del sorgente, mai argomenti,
// messaggi o dati di chi usa il bot. Niente fotografie della memoria: dentro
// ci sarebbero i dati delle persone.
import { Session } from 'node:inspector/promises';
import { monitorEventLoopDelay, PerformanceObserver, constants } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const SPECIALI = { '(idle)': 'inattivo', '(garbage collector)': 'memoria', '(program)': 'motore', '(root)': 'motore' };

// Il posto di una funzione, detto senza percorsi della macchina.
export function areaDi(url, radice = RADICE) {
  const u = String(url || '');
  if (!u) return '(nativo)';
  if (u.startsWith('node:')) return 'node';
  let p = u.startsWith('file://') ? decodeURIComponent(u.slice(7)) : u;
  if (p.startsWith(radice)) p = p.slice(radice.length);
  const nm = p.lastIndexOf('node_modules/');
  if (nm >= 0) {
    const resto = p.slice(nm + 13).split('/');
    return 'node_modules/' + (resto[0].startsWith('@') ? resto.slice(0, 2).join('/') : resto[0]);
  }
  if (p.startsWith('/')) return '(altro)';
  return p;
}

// Dal profilo grezzo dell'inspector al riassunto: tempo proprio per file e per
// funzione, in millisecondi, i piu' pesanti in cima.
export function riassumiProfilo(profilo, { quanti = 20, radice = RADICE } = {}) {
  const nodi = new Map((profilo?.nodes || []).map((n) => [n.id, n]));
  const proprio = new Map();
  const campioni = profilo?.samples || [], passi = profilo?.timeDeltas || [];
  for (let i = 0; i < campioni.length; i++) proprio.set(campioni[i], (proprio.get(campioni[i]) || 0) + Math.max(0, passi[i] || 0));
  const categorie = { inattivo: 0, memoria: 0, motore: 0, codice: 0 };
  const perArea = new Map(), perFunzione = new Map();
  for (const [id, us] of proprio) {
    const cf = nodi.get(id)?.callFrame || {};
    const speciale = SPECIALI[cf.functionName];
    if (speciale && !cf.url) { categorie[speciale] += us; continue; }
    categorie.codice += us;
    const area = areaDi(cf.url, radice);
    perArea.set(area, (perArea.get(area) || 0) + us);
    const chiave = `${cf.functionName || '(anonima)'}|${area}|${(cf.lineNumber ?? -1) + 1}`;
    perFunzione.set(chiave, (perFunzione.get(chiave) || 0) + us);
  }
  const totale = Object.values(categorie).reduce((a, b) => a + b, 0) || 1;
  const ms = (us) => Math.round(us / 100) / 10;
  const quota = (us) => Math.round((us / totale) * 1000) / 10;
  return {
    totaleMs: ms(totale),
    categorie: Object.fromEntries(Object.entries(categorie).map(([k, v]) => [k, { ms: ms(v), quota: quota(v) }])),
    perArea: [...perArea].sort((a, b) => b[1] - a[1]).slice(0, quanti).map(([area, us]) => ({ area, ms: ms(us), quota: quota(us) })),
    perFunzione: [...perFunzione].sort((a, b) => b[1] - a[1]).slice(0, quanti).map(([k, us]) => {
      const [funzione, area, riga] = k.split('|');
      return { funzione, area, riga: Number(riga), ms: ms(us), quota: quota(us) };
    }),
  };
}

let _inCorso = false;
export const misuraInCorso = () => _inCorso;

export async function misura({ secondi = 60 } = {}) {
  if (_inCorso) throw Object.assign(new Error('Una misura e\' gia\' in corso: aspetta che finisca.'), { inCorso: true });
  const durata = Math.min(120, Math.max(10, Math.round(Number(secondi) || 60)));
  _inCorso = true;
  const sessione = new Session();
  const ciclo = monitorEventLoopDelay({ resolution: 10 });
  const gc = { volte: 0, ms: 0, grandi: 0 };
  const osservatore = new PerformanceObserver((lista) => {
    for (const e of lista.getEntries()) { gc.volte++; gc.ms += e.duration; if (e.detail?.kind === constants.NODE_PERFORMANCE_GC_MAJOR) gc.grandi++; }
  });
  const memPrima = process.memoryUsage();
  try {
    sessione.connect();
    await sessione.post('Profiler.enable');
    await sessione.post('Profiler.setSamplingInterval', { interval: 1000 });
    await sessione.post('Profiler.start');
    ciclo.enable();
    osservatore.observe({ entryTypes: ['gc'] });
    await new Promise((ok) => setTimeout(ok, durata * 1000));
    const { profile } = await sessione.post('Profiler.stop');
    const memDopo = process.memoryUsage();
    const mb = (b) => Math.round(b / 1048576);
    return {
      secondi: durata,
      ciclo: { p50: Math.round(ciclo.percentile(50) / 1e5) / 10, p99: Math.round(ciclo.percentile(99) / 1e5) / 10, max: Math.round(ciclo.max / 1e5) / 10 },
      gc: { volte: gc.volte, ms: Math.round(gc.ms), grandi: gc.grandi },
      memoria: { rssPrima: mb(memPrima.rss), rssDopo: mb(memDopo.rss), heapPrima: mb(memPrima.heapUsed), heapDopo: mb(memDopo.heapUsed), esterna: mb(memDopo.external) },
      risorseAttive: Object.entries(process.getActiveResourcesInfo().reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]),
      profilo: riassumiProfilo(profile),
    };
  } finally {
    ciclo.disable();
    osservatore.disconnect();
    try { await sessione.post('Profiler.disable'); } catch { /* gia' chiusa */ }
    sessione.disconnect();
    _inCorso = false;
  }
}
