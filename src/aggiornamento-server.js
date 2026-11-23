// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// L'ULTIMO AGGIORNAMENTO DEL SERVER (docs/AGGIORNARE.md, «Il server si aggiorna
// da solo»).
//
// server/aggiorna.sh scrive in data/aggiorna.json l'esito di ogni giro che ha
// fatto qualcosa: quando, chi l'ha lanciato (a mano o il timer), da quale
// commit a quale per il bot e per il cervello, e l'esito col motivo. Qui lo si
// legge per il pannello dell'amministratore (/api/admin/salute). Il file lo
// scrive uno script di shell: si prende solo la forma nota, e un file guasto o
// assente vale «niente da dire», mai un errore.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ESITI = ['aggiornato', 'tornato indietro', 'aspetta una diretta', 'fermo'];
const sha = (x) => (typeof x === 'string' && /^[0-9a-f]{7,40}$/.test(x) ? x : '');
const coppia = (c) => (c && typeof c === 'object' && !Array.isArray(c) ? { da: sha(c.da), a: sha(c.a) } : null);

// L'ultimo controllo lo lascia ogni giro che arriva a guardare su GitHub,
// anche quello che non trova niente di nuovo (e che percio' non scrive l'esito).
function controllato(cartella) {
  try { const t = Date.parse(readFileSync(join(cartella, '.aggiorna-controllato'), 'utf8').trim()); return Number.isFinite(t) ? t : null; } catch { return null; }
}

export function esitoAggiornamento(cartella) {
  let d;
  try { d = JSON.parse(readFileSync(join(cartella, 'aggiorna.json'), 'utf8')); } catch { d = null; }
  const visto = controllato(cartella);
  if (!d || typeof d !== 'object' || !ESITI.includes(d.esito)) return visto ? { esito: null, controllato: visto } : null;
  const quando = Date.parse(d.quando);
  return {
    controllato: visto,
    quando: Number.isFinite(quando) ? quando : null,
    come: d.come === 'da solo' ? 'da solo' : 'a mano',
    esito: d.esito,
    motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 400) : '',
    bot: coppia(d.bot) || { da: '', a: '' },
    cervello: coppia(d.cervello),
  };
}
