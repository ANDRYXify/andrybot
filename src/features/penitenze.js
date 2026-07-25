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
const titoloNorm = (s) => String(s || '').trim().toLowerCase();

// Penitenze pronte all'uso: chi non vuole scriverne una lista propria parte da qui
// (modalità "suggerite"). Roba leggera, da diretta, niente di offensivo.
const SUGGERITE = [
  '10 flessioni', 'canta il ritornello di una canzone a caso', 'racconta una barzelletta',
  'parla in inglese per 1 minuto', 'parla come un pirata per 1 minuto', 'balla per 20 secondi',
  'accento straniero fino al prossimo respawn', 'fai un complimento al primo in chat',
  'voce da cartone animato per 30 secondi', 'imita il tuo streamer preferito',
];

export class PenitenzeEngine {
  constructor({ say, effects } = {}) {
    this.say = say || (() => {});
    this.effects = effects || null;
    this.attive = new Map();   // channel → [{ tipo, valore, scadenza, chi, colpi, prossimo }]
    this._sweep = null;
  }

  cfg(channel) { return streamers.get(channel)?.settings?.penitenze || null; }

  // I due premi-trigger configurati (con retrocompatibilità sul vecchio campo
  // singolo `premio`+`modo`). premioTesto = lo spettatore scrive la parola;
  // premioRandom = parola/lettera a sorpresa scelta dal bot.
  _premi(c) {
    const testo = titoloNorm(c.premioTesto || (c.modo === 'parola' ? c.premio : ''));
    const random = titoloNorm(c.premioRandom || (['lettera', 'casuale'].includes(c.modo) ? c.premio : ''));
    return { testo, random };
  }

  // Sceglie una parola dal pool configurato, o ripiega su una lettera casuale
  // (così un riscatto non finisce mai "a vuoto").
  _parolaOLettera(c) {
    const pool = (c.parole || []).map(NORM).filter(Boolean);
    return pool.length ? { tipo: 'parola', valore: scegli(pool) } : { tipo: 'lettera', valore: scegli(LETTERE) };
  }

  // Riscatto del premio → attiva una penitenza. Ritorna true se gestito.
  daRiscatto(channel, data) {
    try {
      const c = this.cfg(channel);
      if (!c || c.attivo === false) return false;
      const { testo: pTesto, random: pRandom } = this._premi(c);
      if (!pTesto && !pRandom) return false;   // nessun premio configurato
      const titolo = titoloNorm(data?.reward?.title);
      const kind = titolo && titolo === pTesto ? 'testo' : (titolo && titolo === pRandom ? 'random' : null);
      if (!kind) return false;                 // non è uno dei nostri premi

      const chi = data?.user_name || data?.user_login || 'qualcuno';
      const testoRiscatto = String(data?.user_input || '').trim();
      const durata = Math.max(1, Math.min(15, Math.round(Number(c.durataMin)) || 2));

      let tipo, valore;
      if (kind === 'testo') {
        // lo spettatore scrive la parola; se lascia vuoto, ripiega su pool/lettera
        const dallaChat = NORM(testoRiscatto).split(' ')[0];
        if (dallaChat) { tipo = 'parola'; valore = dallaChat; }
        else ({ tipo, valore } = this._parolaOLettera(c));
      } else {
        // premio "a sorpresa": decide il bot secondo modoRandom
        const modoR = ['parola', 'lettera', 'casuale'].includes(c.modoRandom) ? c.modoRandom
          : (['parola', 'lettera', 'casuale'].includes(c.modo) ? c.modo : 'casuale');
        const scelto = modoR === 'casuale' ? scegli(['parola', 'lettera']) : modoR;
        if (scelto === 'lettera') { tipo = 'lettera'; valore = scegli(LETTERE); }
        else ({ tipo, valore } = this._parolaOLettera(c));
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
        const forfait = this._scegliPenitenza(c);
        const cosa = p.tipo === 'lettera' ? `la lettera "${p.valore.toUpperCase()}"` : `"${p.valore}"`;
        this.say(channel, `❌ Beccato! Lo streamer ha detto ${cosa} → PENITENZA: ${forfait} 😈`);
        if (c?.effetto && this.effects?.fire) { try { this.effects.fire(channel, c.effetto); } catch { /* niente */ } }
      }
    } catch (e) { log.debug(`controllaVoce #${channel}:`, e?.message || e); }
  }

  // Sceglie il forfait: dalla lista dello streamer, dalle suggerite, o entrambe.
  // Non resta mai a mani vuote (ripiega sulle suggerite).
  _scegliPenitenza(c) {
    const mie = (c?.penitenze || []).map((x) => String(x).trim()).filter(Boolean);
    const modo = ['lista', 'suggerite', 'entrambe'].includes(c?.penitenzeModo) ? c.penitenzeModo
      : (mie.length ? 'lista' : 'suggerite');
    let pool = modo === 'lista' ? mie : (modo === 'suggerite' ? SUGGERITE : mie.concat(SUGGERITE));
    if (!pool.length) pool = SUGGERITE;
    return scegli(pool) || 'una penitenza a scelta della chat';
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
