// LA SALUTE DELL'ISTANZA — una risposta onesta a una domanda sola:
// «questa istanza è in grado di fare il suo mestiere, adesso?»
//
// Prima /health rispondeva solo `ok: true` più l'uptime: diceva «il processo
// risponde», non «il prodotto funziona». Se la chat di TUTTI gli streamer
// cadeva, restava verde — e nessuno lo sapeva finché non scriveva qualcuno.
//
// Tre stati, non due:
//   sano      — tutto a posto
//   degradato — il prodotto gira ma qualcosa non fa il suo lavoro (nessuna chat
//               connessa, backup vecchio). Resta 200: un monitor non deve
//               svegliare nessuno alle 3 per una chat che si riconnette da sola.
//   guasto    — non può funzionare (database non scrivibile). 503.
//
// Il dettaglio (quante chat, che backup) NON esce da /health, che è pubblico e
// deve restare muto: sta dietro l'endpoint da proprietario.
import { db } from './db.js';
import { missingConfig } from './config.js';
import { statoBackup } from './backup.js';
import { osservatorio } from './osservatorio.js';

let _rifiuti = 0;
export function contaRifiuto() { _rifiuti++; }
export function rifiuti() { return _rifiuti; }

// Il database è scrivibile DAVVERO? Leggere non basta: un disco pieno o un file
// in sola lettura si vedono solo scrivendo. La prova costa una riga in una
// tabella sua, e si ripete al massimo ogni SCADENZA_MS.
const SCADENZA_MS = 20_000;
let _ultimaProva = { ts: 0, ok: false, errore: '' };

db.exec('CREATE TABLE IF NOT EXISTS salute (id INTEGER PRIMARY KEY CHECK (id = 1), ts INTEGER NOT NULL)');

export function dbScrivibile(forza = false) {
  const ora = Date.now();
  if (!forza && ora - _ultimaProva.ts < SCADENZA_MS) return _ultimaProva;
  try {
    db.prepare('INSERT INTO salute (id, ts) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET ts=excluded.ts').run(ora);
    const r = db.prepare('SELECT ts FROM salute WHERE id=1').get();
    _ultimaProva = { ts: ora, ok: r?.ts === ora, errore: r?.ts === ora ? '' : 'la scrittura non si rilegge' };
  } catch (e) {
    _ultimaProva = { ts: ora, ok: false, errore: e?.message || 'scrittura fallita' };
  }
  return _ultimaProva;
}

// Quante chat dovrebbero essere connesse e quante lo sono. Passa dal status()
// del manager: una sola fonte, la stessa che vede il pannello da proprietario.
function statoChat(manager) {
  let st = null;
  try { st = manager?.status?.(); } catch { st = null; }
  if (!st) return { attese: 0, connesse: 0, daRicollegare: 0, acceso: false, noto: false };
  return {
    attese: (st.channels || []).length,
    connesse: (st.connessi || []).length,
    daRicollegare: (st.chatKO || []).length,
    acceso: !!st.running,
    noto: true,
  };
}

// Il quadro completo. `manager` è facoltativo: senza, la parte chat resta ignota.
export function salute({ manager, forza = false, effects = null } = {}) {
  const scrittura = dbScrivibile(forza);
  const mancanti = missingConfig();
  const chat = statoChat(manager);
  const bck = (() => { try { return statoBackup(); } catch { return null; } })();
  const oreBackup = bck?.ultimo ? (Date.now() - bck.ultimo) / 3600_000 : null;

  const motivi = [];
  if (!scrittura.ok) motivi.push('database non scrivibile: ' + (scrittura.errore || 'ignoto'));
  // Degrado: il bot dice di essere acceso, ha dei canali, e non è connesso a
  // nessuno. `acceso` implica già la configurazione completa (senza, il manager
  // non parte): aggiungere anche quel controllo rendeva la regola cieca proprio
  // sull'istanza mezza configurata, dove serve di più.
  if (chat.noto && chat.acceso && chat.attese > 0 && chat.connesse === 0) {
    motivi.push('nessuna chat connessa su ' + chat.attese);
  }
  // Un token da rifare non è un guasto dell'istanza, ma è uno streamer che paga
  // e non ha il bot: deve vedersi.
  if (chat.noto && chat.daRicollegare > 0) motivi.push(chat.daRicollegare + ' canali da ricollegare');
  // Un backup che non gira più è un guasto silenzioso: si scopre il giorno del
  // disastro. Soglia larga (il doppio del periodo) per non gridare al lupo.
  if (bck?.attivo && oreBackup != null && oreBackup > bck.ogniOre * 2 + 1) {
    motivi.push('ultimo backup ' + Math.round(oreBackup) + 'h fa');
  }
  if (bck?.attivo && bck.conteggio === 0 && process.uptime() > 3600) motivi.push('nessun backup presente');
  // Aree che stanno sbagliando ADESSO e ripetutamente. Un errore isolato di
  // tre giorni fa non è un degrado; venti nell'ultima ora sì.
  const soffrono = (() => { try { return osservatorio.inSofferenza(); } catch { return []; } })();
  for (const a of soffrono.slice(0, 3)) motivi.push(`${a.area}: ${a.recenti} errori nell'ultima ora`);

  const stato = !scrittura.ok ? 'guasto' : (motivi.length ? 'degradato' : 'sano');
  return {
    stato,
    ok: stato !== 'guasto',
    uptime: Math.floor(process.uptime()),
    motivi,
    // dettaglio: solo per il proprietario
    dettaglio: {
      db: { scrivibile: scrittura.ok, errore: scrittura.errore },
      configurazione: { completa: !mancanti.length, mancanti },
      chat,
      backup: bck ? { attivo: bck.attivo, quanti: bck.conteggio, oreDaUltimo: oreBackup == null ? null : Math.round(oreBackup * 10) / 10, ogniOre: bck.ogniOre } : null,
      rifiutiNonGestiti: _rifiuti,
      errori: (() => { try { return osservatorio.riepilogo(); } catch { return null; } })(),
      overlayCollegati: (() => { try { return effects?.quantiClient?.() ?? null; } catch { return null; } })(),
      memoriaMB: Math.round(process.memoryUsage().rss / 1048576),
      nodo: process.version,
    },
  };
}

// LA VIGILANZA. Un'istanza che non riesce più a scrivere il database non può
// fare niente di utile: resta in piedi a servire errori, e il controllo di
// salute di Docker la segna "unhealthy" senza riavviarla (Compose non lo fa).
// Quindi se ne va da sola — ma non al primo inciampo: un disco pieno per un
// attimo non deve buttare giù gli overlay di tutti. Serve che il guasto
// PERSISTA per `soglia` controlli di fila.
export function creaVigilanza({ soglia = 3, esci, avvisa } = {}) {
  let diFila = 0;
  return {
    get diFila() { return diFila; },
    // Un giro di controllo. Ritorna lo stato visto.
    giro(stato) {
      if (stato === 'guasto') {
        diFila++;
        avvisa?.(`database non scrivibile (${diFila}/${soglia})`);
        if (diFila >= soglia) esci?.(diFila);
      } else if (diFila) {
        avvisa?.('database di nuovo scrivibile, allarme rientrato');
        diFila = 0;
      }
      return stato;
    },
  };
}

export function avviaVigilanza({ manager, ogniMs = 60_000, soglia = 3, log } = {}) {
  const v = creaVigilanza({
    soglia,
    avvisa: (m) => log?.error?.('vigilanza:', m),
    esci: () => {
      log?.error?.('vigilanza: il database non è scrivibile da troppo tempo. Esco, il supervisore mi riavvia.');
      process.exit(1);
    },
  });
  const t = setInterval(() => { try { v.giro(salute({ manager, forza: true }).stato); } catch { /* niente */ } }, ogniMs);
  t.unref();
  return { fermati: () => clearInterval(t), vigilanza: v };
}
