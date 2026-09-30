// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE MORTI CONTATE DA SOLE: la configurazione, ripulita.
//
// Il riconoscimento sta nel browser (src/web/public/morti.js), sul computer che
// manda in onda: lo screenshot non esce di li'. Qui c'e' solo COSA si puo'
// salvare, perche' quello che arriva da fuori non lo decide chi lo manda.
//
// Una firma e' un'impronta di 64 bit in esadecimale, sedici cifre. Non e'
// un'immagine: da una firma non si torna indietro a quello che c'era sullo
// schermo, ed e' per questo che si puo' tenere qui senza tenere niente di tuo.
import { normComando, statoVivo } from '../db.js';
import { GIOCHI, salto } from './gsi.js';

export const MAX_SCHERMATE = 8;
// Una schermata di morte quasi mai e' un fotogramma solo: entra in dissolvenza,
// e in certi giochi lo sfondo dietro cambia. Percio' una schermata tiene PIU'
// impronte, e migliorarla vuol dire quasi sempre aggiungerne una — non rifarla.
export const MAX_FIRME = 12;
export const OGNI_MIN_MS = 1000;
export const OGNI_DEF_MS = 2000;
export const OGNI_MAX_MS = 30_000;
export const SOGLIA_DEF = 8;
export const SOGLIA_MAX = 20;
export const RIARMO_DEF_MS = 4000;
export const RIARMO_MAX_MS = 120_000;

const FIRMA = /^[0-9a-f]{16}$/;
const tra = (v, lo, hi, def) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
};

export function normalizza(b) {
  const o = (b && typeof b === 'object') ? b : {};
  const viste = new Set();
  const schermate = (Array.isArray(o.schermate) ? o.schermate : [])
    .map((s) => ({
      nome: String(s?.nome || '').trim().slice(0, 40) || 'Schermata',
      firme: [...new Set((Array.isArray(s?.firme) ? s.firme : [])
        .map((f) => String(f || '').toLowerCase())
        .filter((f) => FIRMA.test(f)))].slice(0, MAX_FIRME),
      contatore: normComando(String(s?.contatore || '')),
      // Da quale scheda della libreria viene, se viene da li'. Le IMPRONTE sono
      // gia' copiate qui sopra: questi tre campi non servono a farla funzionare,
      // servono solo a poterle dire «ne e' uscita una versione nuova». Se la
      // libreria sparisse domani, questa schermata conterebbe come oggi.
      scheda: String(s?.scheda || '').slice(0, 32),
      radice: String(s?.radice || '').slice(0, 32),
      versione: Math.max(0, Math.round(Number(s?.versione) || 0)),
    }))
    // Una schermata senza nemmeno un'impronta valida, o senza un contatore da
    // far salire, non e' una schermata: e' una riga che non potra' mai fare
    // niente.
    .filter((s) => s.firme.length && s.contatore)
    .filter((s) => { const k = s.firme.join(',') + '|' + s.contatore; if (viste.has(k)) return false; viste.add(k); return true; })
    .slice(0, MAX_SCHERMATE);
  // I giochi che lo dicono da soli: per ognuno, quale contatore far salire.
  // Nessun contatore vuol dire spento per quel gioco — non c'e' un interruttore
  // a parte che possa dire il contrario di quello che c'e' scritto qui.
  const gsi = {};
  const dentro = (o.gsi && typeof o.gsi === 'object') ? o.gsi : {};
  for (const g of GIOCHI) {
    const c = normComando(String(dentro[g.id] || ''));
    if (c) gsi[g.id] = c;
  }
  return {
    gsi,
    // Il programma che tiene il conto in un file (DSDeaths per i souls, o un
    // altro): quale contatore far salire. Vuoto vuol dire spento.
    file: normComando(String(o.file || '')),
    attivo: !!o.attivo && schermate.length > 0,
    fonte: String(o.fonte || '').slice(0, 120),
    ogniMs: tra(o.ogniMs, OGNI_MIN_MS, OGNI_MAX_MS, OGNI_DEF_MS),
    soglia: tra(o.soglia, 0, SOGLIA_MAX, SOGLIA_DEF),
    riarmoMs: tra(o.riarmoMs, 0, RIARMO_MAX_MS, RIARMO_DEF_MS),
    schermate,
  };
}

export const DEFAULT = normalizza({});

// ── LE MORTI DA UN FILE ─────────────────────────────────────────────────────
//
// Per i souls il conto esatto sta nella memoria del gioco, e c'e' chi lo legge
// gia': DSDeaths (github.com/Quidrex/DSDeaths) lo scrive in un file di testo,
// un numero e basta, e lo riscrive a ogni morte. Il pannello aperto sul
// computer della regia legge quel file e manda qui il NUMERO: il file resta
// dov'e'.
//
// E' lo stesso problema dei giochi che parlano da soli, e la stessa regola
// (gsi.salto), non una copia: il numero e' un totale, conta il salto in su, e
// ogni altra cosa ribasa. Fra due letture passano due secondi, e in due
// secondi non si muore piu' di MAX_SALTO volte: un salto piu' grosso e' un
// altro personaggio caricato, non una serie di morti.
//
// LA PRIMA LETTURA DI CHI GUARDA NON CONTA MAI. Il pannello, ogni volta che
// comincia a guardare (pagina aperta, file scelto, permesso ridato), si da' un
// giro nuovo, e il giro entra nella partita. Cosi' il numero che trova non si
// confronta con quello lasciato ieri: le morti fatte a pannello chiuso, magari
// fuori diretta, non sono successe adesso. Il prezzo e' quello di sempre: una
// morte fatta nei secondi di una pagina ricaricata si perde, e nessuna si conta
// due volte.
export const MAX_TOTALE = 10_000_000;
const GIRO = /^[a-z0-9-]{8,40}$/;

export function daFile(corpo) {
  const totale = corpo?.totale;
  if (typeof totale !== 'number' || !Number.isInteger(totale) || totale < 0 || totale > MAX_TOTALE) return null;
  const giro = String(corpo?.giro || '');
  if (!GIRO.test(giro)) return null;
  const nome = String(corpo?.nome || '').trim().slice(0, 80);
  return { tuo: true, morti: totale, partita: ['file', giro, nome].join('|') };
}

// Fuori diretta si legge ma non si conta, e senza un contatore scelto pure: il
// ricordo pero' si aggiorna sempre, se no la prima lettura in diretta
// confronterebbe con un numero vecchio.
export function contaDaFile(login, corpo, { contatore = '', inOnda = false, esegui = () => {} } = {}) {
  const ora = daFile(corpo);
  if (!ora) return { ok: false };
  const r = salto(statoVivo.leggi(login, 'morti:file'), ora);
  statoVivo.scrivi(login, 'morti:file', { ...r.stato, quando: Date.now() });
  const contate = r.morti && inOnda && contatore ? r.morti : 0;
  for (let i = 0; i < contate; i++) esegui('contatore:piu:' + contatore);
  return { ok: true, contate, inOnda: !!inOnda };
}
