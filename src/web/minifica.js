// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Quello che il browser scarica non deve regalare la mappa.
//
// Non e' sicurezza — la sicurezza sta ai guardiani delle rotte, e chi ha il
// browser puo' sempre leggere quel che il browser legge. E' costo: `function
// salvaGoalDaScena()` diventa `function a()`, e chi vuole capire come e' fatto
// il pannello deve rileggerselo invece di trovarselo commentato in bella
// grafia. Insieme alla regola «niente commenti nei file serviti», toglie il
// regalo senza togliere niente a noi: nel repository i sorgenti restano com'e'.
//
// COME, e perche' cosi':
//
// - Si minifica al momento di SERVIRE, non in un passo di build. Cosi' non
//   nasce una cartella `dist` che puo' andare fuori sincrono con i sorgenti,
//   non cambia come si consegna il sito, e non c'e' un secondo posto dove
//   guardare quando qualcosa non torna.
// - I nomi di PRIMO LIVELLO restano. app.js e compagni sono script classici,
//   non moduli: le loro funzioni di primo livello sono globali della pagina, e
//   un file le chiama dall'altro. Accorciarle romperebbe tutto. Si accorcia
//   quello che sta DENTRO le funzioni, che e' la quasi totalita' del codice.
// - La filigrana di proprieta' intellettuale sopravvive: e' l'unica cosa che
//   deve restare leggibile.
// - Se la minificazione fallisce su un file, si serve il sorgente. Un sito che
//   funziona e si legge e' meglio di un sito illeggibile e rotto.
//
// Si spegne con SB_SORGENTI=1, per quando serve leggere quel che gira.

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Worker } from 'node:worker_threads';
import { minify } from 'terser';
import { makeLog } from '../logger.js';
import { CACHE_ETERNA, CACHE_FRESCA } from './impronte.js';

const log = makeLog('minifica');

const FIRMA = /ANDRYX-IP|Andrea Taliento|socialbot\.live/;

const OPZIONI = {
  compress: { passes: 2 },
  // niente toplevel: quei nomi sono l'interfaccia fra un file e l'altro
  mangle: { toplevel: false },
  format: { comments: (nodo, commento) => FIRMA.test(commento.value) },
};

export async function minificaJs(sorgente) {
  const r = await minify(sorgente, OPZIONI);
  if (!r || typeof r.code !== 'string') throw new Error('nessun risultato');
  return r.code;
}

// QUELLO CHE SI MINIFICA: i nostri script, quelli in cima alla cartella
// pubblica, gli stessi che guarda il cancello. `vendor/` no: sono librerie di
// altri, gia' minificate da chi le ha scritte, e non c'e' nessuna mappa nostra
// da non regalare. Rifarle costava secondi per niente (human.js e' un 1,5 MB).
export const eNostro = (percorso) => /^\/[^/]+\.js$/.test(String(percorso || ''));

// IL LAVORO SI FA FUORI DAL FILO PRINCIPALE.
//
// Misurato: minificare app.js richiede circa dieci secondi, e in quei dieci
// secondi il server non fa un giro, nemmeno uno. Non il pannello: TUTTO, gli
// overlay in onda, il bot in chat, gli eventi di Twitch. E la cache di prima
// teneva un file solo (ogni file nuovo la svuotava), quindi aprire il pannello,
// che chiede venticinque script, rifaceva app.js quasi ogni volta: la copertina
// restava li' e dopo venticinque secondi diceva «ci sta mettendo piu' del
// solito». Il difetto non era lento: era un server fermo.
//
// Quindi la minificazione ha un filo suo (minifica-lavoro.js), e un file alla
// volta: il filo principale manda il sorgente e riceve il risultato, senza mai
// fermarsi. Un lavoratore che cade si rifa' alla prossima richiesta.
export function creaLavoratore() {
  let w = null;
  let n = 0;
  const attese = new Map();
  // Un lavoratore che cade non dice niente sul file: e' un guasto di passaggio,
  // e chi aspettava lo sa, cosi' non tiene il sorgente come versione finale.
  const tutteFallite = (e) => {
    const guasto = Object.assign(e instanceof Error ? e : new Error(String(e)), { passeggero: true });
    for (const a of attese.values()) a.no(guasto);
    attese.clear();
    w = null;
  };
  const avvia = () => {
    w = new Worker(new URL('./minifica-lavoro.js', import.meta.url));
    w.unref();
    w.on('message', ({ id, codice, errore }) => {
      const a = attese.get(id);
      if (!a) return;
      attese.delete(id);
      if (errore) a.no(new Error(errore)); else a.si(codice);
    });
    w.on('error', tutteFallite);
    w.on('exit', () => tutteFallite(new Error('il lavoratore si e\' fermato')));
  };
  const lavora = (sorgente) => new Promise((si, no) => {
    if (!w) avvia();
    const id = ++n;
    attese.set(id, { si, no });
    w.postMessage({ id, sorgente });
  });
  lavora.chiudi = () => { const x = w; w = null; return x ? x.terminate() : Promise.resolve(); };
  return lavora;
}

// LE TRE REGOLE DEL SERVIRE, che non dipendono da quanto e' veloce la macchina:
//
//  · UNA RICHIESTA NON ASPETTA MAI LA MINIFICAZIONE. Se la versione minificata
//    di quel contenuto e' pronta esce lei; se no esce il sorgente, che fa la
//    stessa cosa, e intanto la minificazione parte (una volta sola, anche se lo
//    chiedono in dieci). Il sorgente esce senza `immutable`: la prossima volta
//    il browser prende la versione finale.
//  · UN POSTO PER FILE. La versione pronta vale per quel contenuto (data e
//    grandezza del file); cambia il file, si rifa' solo lui.
//  · CHI DECIDE `immutable` E' UNO SOLO: l'impronta giusta nell'indirizzo
//    (impronte.js, `res.locals.eterno`). Qui prima si scriveva `max-age=0` a
//    mano, e nessuno script era mai eterno mentre i fogli di stile si'.
//
// All'avvio si preparano tutti, uno dopo l'altro: dopo una pubblicazione il
// primo che apre il pannello trova gia' tutto pronto, o quasi.
export function creaMinifica(publicDir, { lavora = null, scalda = true } = {}) {
  const pronti = new Map();    // percorso -> { chiave, codice, etag }
  const inCorso = new Map();   // percorso -> chiave in lavorazione
  const spento = process.env.SB_SORGENTI === '1';
  let lavoratore = lavora;
  const lavoro = (sorgente) => { if (!lavoratore) lavoratore = creaLavoratore(); return lavoratore(sorgente); };

  const statDi = (percorso) => {
    const file = join(publicDir, percorso);
    if (!file.startsWith(publicDir)) return null;
    try { const st = statSync(file); return st.isFile() ? { file, st, chiave: st.mtimeMs + '|' + st.size } : null; } catch { return null; }
  };

  function prepara(percorso) {
    const f = statDi(percorso);
    if (!f) return Promise.resolve(null);
    const gia = pronti.get(percorso);
    if (gia && gia.chiave === f.chiave) return Promise.resolve(gia);
    if (inCorso.get(percorso)?.chiave === f.chiave) return inCorso.get(percorso).promessa;
    const promessa = (async () => {
      const sorgente = readFileSync(f.file, 'utf8');
      let codice;
      try { codice = await lavoro(sorgente); } catch (e) {
        log.warn(percorso + ':', e?.message || e);
        // Il lavoratore caduto non e' un verdetto sul file: si riprova alla
        // prossima richiesta. Un file che terser non capisce, invece, si serve
        // com'e' (un sito che funziona e si legge batte un sito rotto).
        if (e?.passeggero) return null;
        codice = sorgente;
      }
      const fuori = { chiave: f.chiave, codice, etag: 'W/"m' + f.st.mtimeMs.toString(36) + '-' + codice.length.toString(36) + '"' };
      if (statDi(percorso)?.chiave === f.chiave) pronti.set(percorso, fuori);
      return fuori;
    })().finally(() => { if (inCorso.get(percorso)?.chiave === f.chiave) inCorso.delete(percorso); });
    inCorso.set(percorso, { chiave: f.chiave, promessa });
    return promessa;
  }

  async function scaldaTutti() {
    let nomi = [];
    try { nomi = readdirSync(publicDir).filter((n) => extname(n) === '.js').sort(); } catch { return; }
    for (const n of nomi) await prepara('/' + n).catch(() => null);
  }

  const mw = function minificaMiddleware(req, res, next) {
    if (spento || req.method !== 'GET') return next();
    let percorso;
    try { percorso = decodeURIComponent(req.path); } catch { return next(); }
    if (!eNostro(percorso) || percorso.includes('..')) return next();
    const f = statDi(percorso);
    if (!f) return next();
    const r = pronti.get(percorso);
    if (!r || r.chiave !== f.chiave) {
      prepara(percorso).catch(() => null);
      res.locals.eterno = false;
      return next();
    }
    res.set('Content-Type', 'text/javascript; charset=utf-8');
    res.set('ETag', r.etag);
    res.set('Cache-Control', res.locals?.eterno ? CACHE_ETERNA : CACHE_FRESCA);
    if (req.get('if-none-match') === r.etag) return res.status(304).end();
    res.send(r.codice);
  };
  mw.prepara = prepara;
  mw.pronto = (percorso) => { const r = pronti.get(percorso); return !!r && r.chiave === statDi(percorso)?.chiave; };
  mw.scaldato = (!spento && scalda) ? new Promise((r) => setImmediate(() => scaldaTutti().then(r, r))) : Promise.resolve();
  return mw;
}
