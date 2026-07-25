// Penitenze a PUNTI CANALE: uno spettatore riscatta un premio e "vieta" allo
// streamer una PAROLA (scelta dallo spettatore o casuale) o una LETTERA per
// qualche minuto. Se il bot SENTE lo streamer dirla (via il riconoscimento
// vocale già esistente), scatta una penitenza casuale scelta dallo streamer.
//
// Lo stato è in memoria (legato alla diretta). Il bot "sente" lo streamer solo
// se il riconoscimento vocale è attivo (add-on Voce) e la creazione/redemption
// del premio vive nell'ecosistema Punti canale (add-on Effetti).
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('penitenze');

// normalizza: minuscolo, senza accenti/punteggiatura, spazi compattati
const NORM = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
// lettere "giocabili" per l'italiano (niente k/j/x/y/w/q/h rare o quasi impossibili)
const LETTERE = 'abcdefgilmnoprstuv'.split('');
const scegli = (a) => a[Math.floor(Math.random() * a.length)];

export class PenitenzeEngine {
  constructor({ say, effects } = {}) {
    this.say = say || (() => {});
    this.effects = effects || null;
    this.attive = new Map();   // channel → [{ tipo, valore, scadenza, chi, colpi, prossimo }]
    this._sweep = null;
  }

  cfg(channel) { return streamers.get(channel)?.settings?.penitenze || null; }

  // Riscatto del premio → attiva una penitenza. Ritorna true se gestito.
  daRiscatto(channel, data) {
    try {
      const c = this.cfg(channel);
      if (!c || c.attivo === false || !c.premio) return false;
      const titolo = String(data?.reward?.title || '').trim().toLowerCase();
      if (titolo !== String(c.premio).trim().toLowerCase()) return false;   // non è il nostro premio

      const chi = data?.user_name || data?.user_login || 'qualcuno';
      const testo = String(data?.user_input || '').trim();
      const durata = Math.max(1, Math.min(15, Math.round(Number(c.durataMin)) || 2));
      const modo = ['parola', 'lettera', 'casuale'].includes(c.modo) ? c.modo : 'parola';
      const scelto = modo === 'casuale' ? scegli(['parola', 'lettera']) : modo;

      let tipo, valore;
      if (scelto === 'lettera') {
        tipo = 'lettera'; valore = scegli(LETTERE);
      } else {
        tipo = 'parola';
        const dallaChat = NORM(testo).split(' ')[0];
        if (dallaChat) valore = dallaChat;
        else {
          const pool = (c.parole || []).map(NORM).filter(Boolean);
          if (!pool.length) return false;   // niente parole configurate e nessun testo
          valore = scegli(pool);
        }
      }

      const lista = this.attive.get(channel) || [];
      lista.push({ tipo, valore, scadenza: Date.now() + durata * 60_000, chi, colpi: 0, prossimo: 0 });
      this.attive.set(channel, lista);
      this._avviaSweep();
      const cosa = tipo === 'lettera' ? `la lettera "${valore.toUpperCase()}"` : `la parola "${valore}"`;
      this.say(channel, `🔒 ${chi} ha vietato ${cosa} per ${durata} ${durata === 1 ? 'minuto' : 'minuti'}! Se lo streamer la dice… penitenza! 😈`);
      log.info(`penitenza su #${channel}: ${tipo} "${valore}" ${durata}m (da ${chi})`);
      return true;
    } catch (e) { log.error(`daRiscatto #${channel}:`, e?.message || e); return false; }
  }

  // Frase sentita dallo streamer → controlla le penitenze attive.
  controllaVoce(channel, frase) {
    try {
      const lista = this.attive.get(channel);
      if (!lista || !lista.length) return;
      const norm = NORM(frase);
      if (!norm) return;
      const parole = norm.split(' ');
      const senzaSpazi = norm.replace(/\s/g, '');
      const c = this.cfg(channel);
      const ora = Date.now();
      for (const p of lista) {
        if (p.scadenza <= ora || ora < p.prossimo) continue;
        const beccato = p.tipo === 'lettera' ? senzaSpazi.includes(p.valore) : parole.includes(p.valore);
        if (!beccato) continue;
        p.colpi++; p.prossimo = ora + 8000;   // 8s di respiro: niente raffica sulla stessa frase
        const forfait = scegli((c?.penitenze || []).map((x) => String(x).trim()).filter(Boolean)) || 'una penitenza a scelta della chat';
        const cosa = p.tipo === 'lettera' ? `la lettera "${p.valore.toUpperCase()}"` : `"${p.valore}"`;
        this.say(channel, `❌ Beccato! Lo streamer ha detto ${cosa} → PENITENZA: ${forfait} 😈`);
        if (c?.effetto && this.effects?.fire) { try { this.effects.fire(channel, c.effetto); } catch { /* niente */ } }
      }
    } catch (e) { log.debug(`controllaVoce #${channel}:`, e?.message || e); }
  }

  // Penitenze attive del canale (per overlay/pannello).
  stato(channel) {
    const ora = Date.now();
    return (this.attive.get(channel) || []).filter((p) => p.scadenza > ora)
      .map((p) => ({ tipo: p.tipo, valore: p.valore, restano: Math.max(0, Math.round((p.scadenza - ora) / 1000)), colpi: p.colpi }));
  }

  // Sweep periodico: scade le penitenze e annuncia la fine. Si spegne da solo.
  _avviaSweep() {
    if (this._sweep) return;
    this._sweep = setInterval(() => {
      const ora = Date.now();
      let restaQualcosa = false;
      for (const [ch, lista] of this.attive) {
        const vive = [];
        for (const p of lista) {
          if (p.scadenza > ora) vive.push(p);
          else {
            const cosa = p.tipo === 'lettera' ? `La lettera "${p.valore.toUpperCase()}"` : `La parola "${p.valore}"`;
            this.say(ch, `✅ Tempo scaduto! ${cosa} è di nuovo libera${p.colpi ? ` (beccato ${p.colpi} ${p.colpi === 1 ? 'volta' : 'volte'} 😂)` : ' — salvo!'}.`);
          }
        }
        if (vive.length) { this.attive.set(ch, vive); restaQualcosa = true; } else this.attive.delete(ch);
      }
      if (!restaQualcosa) { clearInterval(this._sweep); this._sweep = null; }
    }, 5000);
    this._sweep.unref?.();
  }
}
