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

import { readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { minify } from 'terser';
import { makeLog } from '../logger.js';

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

export function creaMinifica(publicDir) {
  const cache = new Map();
  const spento = process.env.SB_SORGENTI === '1';

  async function servita(percorso) {
    const file = join(publicDir, percorso);
    if (!file.startsWith(publicDir)) return null;
    let st;
    try { st = statSync(file); } catch { return null; }
    if (!st.isFile()) return null;
    const chiave = percorso + '|' + st.mtimeMs + '|' + st.size;
    const avuta = cache.get(chiave);
    if (avuta) return avuta;
    const sorgente = readFileSync(file, 'utf8');
    let codice;
    try {
      codice = await minificaJs(sorgente);
    } catch (e) {
      log.warn(percorso + ':', e?.message || e);
      codice = sorgente;
    }
    const fuori = { codice, etag: 'W/"m' + st.mtimeMs.toString(36) + '-' + codice.length.toString(36) + '"' };
    cache.clear();
    cache.set(chiave, fuori);
    return fuori;
  }

  return function minificaMiddleware(req, res, next) {
    if (spento || req.method !== 'GET') return next();
    const percorso = decodeURIComponent(req.path);
    if (extname(percorso) !== '.js' || percorso.includes('..')) return next();
    servita(percorso).then((r) => {
      if (!r) return next();
      res.set('Content-Type', 'text/javascript; charset=utf-8');
      res.set('ETag', r.etag);
      res.set('Cache-Control', 'public, max-age=0');
      if (req.get('if-none-match') === r.etag) return res.status(304).end();
      res.send(r.codice);
    }).catch(() => next());
  };
}
