// LE MORTI CONTATE DA SOLE: la configurazione, ripulita.
//
// Il riconoscimento sta nel browser (src/web/public/morti.js), sul computer che
// manda in onda: lo screenshot non esce di li'. Qui c'e' solo COSA si puo'
// salvare, perche' quello che arriva da fuori non lo decide chi lo manda.
//
// Una firma e' un'impronta di 64 bit in esadecimale, sedici cifre. Non e'
// un'immagine: da una firma non si torna indietro a quello che c'era sullo
// schermo, ed e' per questo che si puo' tenere qui senza tenere niente di tuo.
import { normComando } from '../db.js';
import { GIOCHI } from './gsi.js';

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
    attivo: !!o.attivo && schermate.length > 0,
    fonte: String(o.fonte || '').slice(0, 120),
    ogniMs: tra(o.ogniMs, OGNI_MIN_MS, OGNI_MAX_MS, OGNI_DEF_MS),
    soglia: tra(o.soglia, 0, SOGLIA_MAX, SOGLIA_DEF),
    riarmoMs: tra(o.riarmoMs, 0, RIARMO_MAX_MS, RIARMO_DEF_MS),
    schermate,
  };
}

export const DEFAULT = normalizza({});
