// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// CHI ESEGUE. E non è chi decide.
//
// Fino a ieri il pezzo che giudicava chiamava anche Twitch: guardava un account,
// si convinceva, e bannava lì, nella stessa riga. Sembra comodo e costa quattro
// cose che si scoprono tutte insieme il giorno che servono:
//
//   · NON SI PUÒ PROVARE A VUOTO. Per vedere se una taratura è giusta bisogna
//     toccare persone vere. Il collaudo è la diretta di qualcuno.
//   · NON SI PUÒ DISFARE. Le azioni non sono oggetti da qualche parte: sono
//     chiamate già partite. Non c'è niente da riaprire.
//   · NON C'È UN VERO REGISTRO. Resta scritto «bannato», non cosa si è chiesto a
//     Twitch e cosa ha risposto. Il giorno che qualcuno contesta, non si sa.
//   · UN'AZIONE FALLITA SPARISCE. Finisce in una riga di log e nessuno la
//     riprende. Proprio durante un attacco, che è quando conta.
//
// Qui invece chi decide produce un VERDETTO — un oggetto, con dentro il perché —
// e questo modulo lo esegue. Sono due mestieri diversi e adesso stanno in due
// posti diversi.
//
// Il modello per esteso: docs/PIATTAFORMA.md.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeLog } from '../logger.js';
import { config } from '../config.js';

const log = makeLog('enforce');
const norm = (s) => String(s || '').toLowerCase().trim();

// Le azioni, dalla più leggera alla più pesante. `niente` e `osserva` non
// arrivano nemmeno in coda: sono decisioni di non fare, e vanno solo scritte.
export const AZIONI = {
  NIENTE: 'niente',
  OSSERVA: 'osserva',
  CANCELLA: 'cancella',      // togliere un messaggio
  LIMITA: 'limita',          // trattenere: il messaggio non passa, la persona resta
  TIMEOUT: 'timeout',
  BAN: 'ban',
  BLOCCA: 'blocca',          // l'unica che toglie il follow
};

// Quanto è urgente, non quanto è grave. Un messaggio di spam va tolto ADESSO,
// mentre lo si guarda; la pulizia di mille follow finti può aspettare tre
// minuti senza che nessuno se ne accorga. Con una coda sola e mille blocchi
// davanti, una cancellazione arriverebbe a cose fatte.
const URGENZA = { cancella: 0, limita: 0, timeout: 1, ban: 2, blocca: 3 };

const AL_SEC = 6;                       // il tetto è di Twitch, non nostro
const PAUSA_429_MS = 5000;
const TENTATIVI = 3;
const DOPPIONE_MS = 30_000;             // stessa azione sulla stessa persona: una volta
const FALLITI_MAX = 500;

let seq = 0;
const nuovoId = () => Date.now().toString(36) + '-' + (seq++).toString(36);

// Un verdetto è una decisione scritta, non una chiamata. Ci sta dentro il
// perché, così il registro e la dashboard non devono ricostruirlo dopo.
export function verdetto({ canale, login, userId, azione, motivi = [], punti = 0, confidenza = 1, origine = '', incidente = '', durata = 0, messaggio = '', aVuoto = false }) {
  return {
    id: nuovoId(), ts: Date.now(),
    canale: norm(canale), login: norm(login), userId: String(userId || ''),
    azione, motivi: [].concat(motivi).filter(Boolean),
    punti: Number(punti) || 0, confidenza: Number(confidenza) || 0,
    origine, incidente, durata: Number(durata) || 0, messaggio: String(messaggio || ''),
    aVuoto: !!aVuoto,
  };
}

export const daFare = (v) => !!v && v.azione !== AZIONI.NIENTE && v.azione !== AZIONI.OSSERVA;

export class Esecutore {
  // `annota(canale, riga)` è dove finisce il registro: l'esecutore non sa
  // niente dello scudo, gli passa quello che ha fatto e chi lo tiene se lo
  // tiene. Così i due moduli non si conoscono.
  constructor({ helix, annota } = {}) {
    this.helix = helix;
    this.annota = typeof annota === 'function' ? annota : () => {};
    this._coda = [];
    this._inCoda = new Map();          // 'canale|login|azione' → ts (doppioni)
    this._gira = false;
    this._pausaFino = 0;
    this._falliti = [];
    // DECISI e CHIESTI sono due momenti diversi: il primo è quando lo scudo ha
    // deciso, il secondo quando la coda ci è arrivata. Fra i due c'è il rate
    // limit di Twitch, che può essere minuti. Chi guarda deve poter distinguere
    // «non l'ha visto» da «non ha ancora fatto in tempo».
    this._conti = { decisi: 0, chiesti: 0, fatti: 0, falliti: 0, aVuoto: 0, doppioni: 0 };
  }

  // Due numeri diversi, due nomi diversi. `inSospeso` è quanto c'è ancora da
  // riprendere; `falliti` è quante volte in tutto una chiamata è andata male.
  // Chiamarli tutti e due «falliti» non è ambiguo: è che uno dei due sparisce, e
  // chi legge la console vede il numero sbagliato senza accorgersene.
  stato() {
    return { inCoda: this._coda.length, inSospeso: this._falliti.length, ...this._conti };
  }

  fallitiInSospeso({ limite = 100 } = {}) { return this._falliti.slice(-limite).reverse(); }

  // Esegue un verdetto e ASPETTA il suo esito. La coda resta una sola — stesso
  // ritmo, stessa deduplica, stesso registro — ma chi ha bisogno di sapere
  // com'è andata può attendere il proprio pezzo invece che tutta la fila.
  esegui(v) {
    if (!daFare(v)) { this.annota(v?.canale, rigaDi(v, { ok: true, motivo: 'nessuna azione' })); return Promise.resolve({ ok: true, saltato: true }); }
    const chiave = `${v.canale}|${v.login || v.userId}|${v.azione}`;
    const visto = this._inCoda.get(chiave);
    if (visto && Date.now() - visto < DOPPIONE_MS) {
      // IDEMPOTENZA. Lo stesso evento consegnato due volte da Twitch, o due
      // rilevatori che si accorgono della stessa cosa, non devono produrre due
      // ban. Si conta e si lascia perdere.
      this._conti.doppioni++;
      return Promise.resolve({ ok: true, doppione: true });
    }
    this._inCoda.set(chiave, Date.now());
    this._conti.decisi++;
    return new Promise((risolvi) => {
      this._coda.push({ v, risolvi, tentativi: 0 });
      this._coda.sort((a, b) => (URGENZA[a.v.azione] ?? 9) - (URGENZA[b.v.azione] ?? 9) || a.v.ts - b.v.ts);
      this._svuota().catch((e) => log.error('coda:', e?.message || e));
    });
  }

  // Tanti verdetti insieme (l'ondata). Non si attende: sono minuti.
  accoda(elenco = []) {
    let presi = 0;
    for (const v of elenco) { if (daFare(v)) { presi++; this.esegui(v).catch(() => {}); } }
    return presi;
  }

  async _svuota() {
    if (this._gira) return;
    this._gira = true;
    try {
      while (this._coda.length) {
        const attesa = this._pausaFino - Date.now();
        if (attesa > 0) { await dormi(attesa); continue; }
        const voce = this._coda.shift();
        const esito = await this._fai(voce);
        // «Rimandato» vuol dire che la voce è tornata in fila per un rientro:
        // non è un esito, e chi aspetta deve continuare ad aspettare. Prima qui
        // si restituiva una promessa che non si risolveva mai, e ad aspettare
        // restava tutta la coda — cioè il rientro sul rate limit spegneva
        // l'esecutore invece di rallentarlo.
        if (!esito?.rimandato) voce.risolvi(esito);
        await dormi(Math.round(1000 / AL_SEC));
      }
    } finally { this._gira = false; }
  }

  async _fai(voce) {
    const { v } = voce;
    this._conti.chiesti++;

    // A VUOTO: si calcola tutto, si scrive tutto, non si tocca nessuno. È il
    // modo di tarare le soglie senza che il collaudo sia la diretta di
    // qualcuno.
    if (v.aVuoto) {
      this._conti.aVuoto++;
      this.annota(v.canale, rigaDi(v, { ok: true, motivo: 'a vuoto: non eseguito' }, 'a-vuoto'));
      return { ok: true, aVuoto: true };
    }

    const r = await this._chiama(v);
    if (r?.ok) {
      this._conti.fatti++;
      this.annota(v.canale, rigaDi(v, r));
      return r;
    }

    // Un 429 non è un fallimento: è «più piano». Si rientra e si riprova.
    if (r?.motivo === 'errore Twitch' || r?.motivo === 'troppe richieste') {
      voce.tentativi++;
      if (voce.tentativi < TENTATIVI) {
        this._pausaFino = Date.now() + PAUSA_429_MS * voce.tentativi;   // rientro che cresce
        this._coda.unshift(voce);
        return { rimandato: true };
      }
    }

    // NIENTE SI PERDE IN SILENZIO. Un'azione che non è riuscita resta scritta e
    // si può riprendere: è durante un attacco che una chiamata cade, ed è
    // durante un attacco che serve.
    this._conti.falliti++;
    this._falliti.push({ ...v, motivo: r?.motivo || 'sconosciuto', tentativi: voce.tentativi + 1, quando: Date.now() });
    if (this._falliti.length > FALLITI_MAX) this._falliti.splice(0, this._falliti.length - FALLITI_MAX);
    this.annota(v.canale, rigaDi(v, r || { ok: false, motivo: 'nessuna risposta' }));
    this.salvaFalliti().catch(() => {});
    return r || { ok: false };
  }

  // L'unico punto che tocca Twitch. Tutto il resto di questo file non sa
  // nemmeno che Twitch esista.
  async _chiama(v) {
    const h = this.helix;
    try {
      switch (v.azione) {
        case AZIONI.CANCELLA:
        case AZIONI.LIMITA:
          if (!v.messaggio) return { ok: false, motivo: 'manca l\'id del messaggio' };
          await h?.deleteMessage?.(v.canale, v.messaggio);
          return { ok: true };
        case AZIONI.TIMEOUT:
          return (await h?.timeoutUser?.(v.canale, v.userId, v.durata || 600, motivoCorto(v))) || { ok: false, motivo: 'non disponibile' };
        case AZIONI.BAN:
          return (await h?.timeoutUser?.(v.canale, v.userId, 0, motivoCorto(v))) || { ok: false, motivo: 'non disponibile' };
        case AZIONI.BLOCCA: {
          const r = await h?.bloccaUtente?.(v.canale, v.userId, motivoCorto(v));
          if (r?.ok) return r;
          // Il blocco è l'unica azione che toglie il follow. Se non si può —
          // manca il permesso, o Twitch dice di no — si ripiega sul ban, che
          // almeno impedisce di scrivere. Meglio metà difesa che nessuna.
          const b = await h?.timeoutUser?.(v.canale, v.userId, 0, motivoCorto(v));
          return b?.ok ? { ...b, ripiego: 'ban' } : (r || { ok: false, motivo: 'non disponibile' });
        }
        default:
          return { ok: false, motivo: 'azione sconosciuta: ' + v.azione };
      }
    } catch (e) {
      return { ok: false, motivo: String(e?.message || e).slice(0, 120) };
    }
  }

  // Riprende quello che era caduto. Torna quanti ne ha rimessi in fila.
  riprovaFalliti(canale = '') {
    const ch = norm(canale);
    const tenuti = [], ripresi = [];
    for (const f of this._falliti) (!ch || f.canale === ch ? ripresi : tenuti).push(f);
    this._falliti = tenuti;
    for (const f of ripresi) {
      this._inCoda.delete(`${f.canale}|${f.login || f.userId}|${f.azione}`);
      this.esegui({ ...f, id: nuovoId(), ts: Date.now() }).catch(() => {});
    }
    this.salvaFalliti().catch(() => {});
    return ripresi.length;
  }

  // ── La coda dei falliti sopravvive al riavvio ────────────────────────────
  // Un'azione che non è riuscita è un debito, non una finestra di trenta
  // secondi: se il processo muore mentre Twitch è giù, al ritorno il debito
  // deve essere ancora lì.
  // I salvataggi si mettono in fila. Due scritture ravvicinate sullo stesso file
  // finiscono in ordine di completamento, non di partenza: l'ultima a partire
  // può essere sovrascritta da una più vecchia, e allora un debito già scritto
  // sparisce.
  salvaFalliti() {
    this._scrittura = (this._scrittura || Promise.resolve()).then(
      () => writeFile(FILE(), JSON.stringify({ v: 1, righe: this._falliti }))
        .catch((e) => log.warn('coda dei falliti non salvata:', e?.message || e)),
    );
    return this._scrittura;
  }

  async caricaFalliti() {
    try {
      const j = JSON.parse(await readFile(FILE(), 'utf8'));
      this._falliti = (j?.righe || []).filter((f) => f && f.canale && f.azione).slice(-FALLITI_MAX);
      if (this._falliti.length) log.info(`coda dei falliti: ${this._falliti.length} azioni ancora in sospeso`);
    } catch (e) { /* prima volta: nessun file */ }
  }
}

const FILE = () => join(config.dataDir, 'azioni-fallite.json');
const dormi = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const motivoCorto = (v) => (v.motivi.join(', ') || v.origine || 'scudo').slice(0, 200);

// La riga del registro. Ci sta quello che si è CHIESTO e quello che è tornato,
// non solo l'esito: il giorno che qualcuno contesta un ban, «bannato» non
// risponde a niente.
function rigaDi(v, r, esito) {
  return {
    login: v?.login || '', userId: v?.userId || '',
    azione: v?.azione || 'niente',
    motivo: (v?.motivi || []).join(', ') || v?.origine || '',
    esito: esito || (r?.ok ? 'fatto' : 'fallito'),
    verdetto: v?.id || '', punti: v?.punti || 0, incidente: v?.incidente || '',
    risposta: r?.ok ? (r.ripiego ? 'ok (ripiego: ' + r.ripiego + ')' : 'ok') : String(r?.motivo || '').slice(0, 120),
  };
}
