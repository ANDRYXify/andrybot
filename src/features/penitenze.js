// Penitenze a PUNTI CANALE (versione a CONTATORE).
//
// Uno spettatore riscatta un premio a punti canale e imposta una parola (o una
// lettera). Due modalità:
//   • VIETA  — lo streamer NON deve dirla: ogni volta che la dice → +1.
//   • SOLO   — lo streamer può dire SOLO quella parola: ogni frase in cui ne dice
//              un'altra → +1.
// Per tutta la durata (default 2 min) il bot ascolta (riconoscimento vocale) e
// tiene un CONTATORE, mostrando "+1" rossi nell'overlay. Alla FINE del tempo,
// se il contatore è > 0, parte UNA penitenza (dalla lista dello streamer o scelta
// dall'IA) "moltiplicata" per il numero di volte.
//
// La corrispondenza è FUZZY (tollera i piccoli errori del riconoscimento vocale)
// così una parola sentita male ma sostanzialmente corretta non fa scattare falsi
// positivi.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('penitenze');

// normalizza: minuscolo, senza accenti/punteggiatura, spazi compattati
const NORM = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const LETTERE = 'abcdefgilmnoprstuv'.split('');
const scegli = (a) => a[Math.floor(Math.random() * a.length)];

// Penitenze pronte all'uso: usate come rete di sicurezza quando l'IA non è
// disponibile e lo streamer non ha scritto una lista.
const SUGGERITE = [
  '10 flessioni', 'canta il ritornello di una canzone a caso', 'racconta una barzelletta',
  'parla in inglese per 1 minuto', 'parla come un pirata per 1 minuto', 'balla per 20 secondi',
  'accento straniero fino al prossimo respawn', 'fai un complimento al primo in chat',
  'voce da cartone animato per 30 secondi', 'imita il tuo streamer preferito',
];

// distanza di Levenshtein (per la tolleranza agli errori del riconoscimento)
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let riga = new Array(n + 1);
  for (let j = 0; j <= n; j++) riga[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = riga[0]; riga[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = riga[j];
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return riga[n];
}

// due parole sono "la stessa" se la similarità ≥ soglia (0..1). Parole cortissime
// (≤3) devono combaciare esatte: lì un errore singolo cambia tutto.
function simile(a, b, soglia) {
  if (a === b) return true;
  const L = Math.max(a.length, b.length);
  if (L <= 3) return a === b;
  return 1 - levenshtein(a, b) / L >= soglia;
}

export class PenitenzeEngine {
  // ia: funzione async (channel) → Promise<string|null> per far scegliere la
  // penitenza dall'IA. effects: EffectsEngine (per gli eventi overlay + effetto).
  constructor({ say, effects, ia } = {}) {
    this.say = say || (() => {});
    this.effects = effects || null;
    this.ia = typeof ia === 'function' ? ia : null;
    this.attive = new Map();   // channel → [penitenza attiva]
    this._sweep = null;
    this._nextId = 1;
  }

  cfg(channel) { return streamers.get(channel)?.settings?.penitenze || null; }

  _soglia(c) {
    const f = Number(c?.fuzzy);
    return Number.isFinite(f) ? Math.min(1, Math.max(0.5, f / 100)) : 0.8;
  }

  _overlayOpts(c) {
    const o = (c && typeof c.overlay === 'object') ? c.overlay : {};
    return { posizione: o.posizione || 'alto-destra', colore: o.colore || '#ff2d2d' };
  }

  // I due premi-trigger (con retrocompatibilità sui vecchi campi).
  _premi(c) {
    const vieta = String(c?.premioVieta || c?.premioTesto || (c?.modo === 'parola' ? c?.premio : '') || '').trim().toLowerCase();
    const solo = String(c?.premioSolo || '').trim().toLowerCase();
    return { vieta, solo };
  }

  // Riscatto → avvia una penitenza a contatore. Ritorna true se gestito.
  daRiscatto(channel, data) {
    try {
      const c = this.cfg(channel);
      if (!c || c.attivo === false) return false;
      const { vieta, solo } = this._premi(c);
      if (!vieta && !solo) return false;
      const titolo = String(data?.reward?.title || '').trim().toLowerCase();
      const modo = titolo && titolo === vieta ? 'vieta' : (titolo && titolo === solo ? 'solo' : null);
      if (!modo) return false;

      // la parola la scrive lo spettatore; se lascia vuoto, pesca dal pool o una lettera
      const chi = data?.user_name || data?.user_login || 'qualcuno';
      let valore = NORM(data?.user_input).split(' ')[0];
      let tipo = 'parola';
      if (!valore) {
        const pool = (c.parole || []).map(NORM).filter(Boolean);
        if (pool.length) valore = scegli(pool);
        else { valore = scegli(LETTERE); tipo = 'lettera'; }
      } else if (valore.length === 1) tipo = 'lettera';

      const durata = Math.max(1, Math.min(15, Math.round(Number(c.durataMin)) || 2));
      const id = this._nextId++;
      const pen = { id, modo, tipo, valore, chi, count: 0, scadenza: Date.now() + durata * 60_000, ultimaFrase: '', ultimaTs: 0 };
      const lista = this.attive.get(channel) || [];
      lista.push(pen);
      this.attive.set(channel, lista);
      this._avviaSweep();

      const cosa = tipo === 'lettera' ? `la lettera "${valore.toUpperCase()}"` : `la parola "${valore}"`;
      const regola = modo === 'vieta'
        ? `${chi} ti ha VIETATO ${cosa} per ${durata} ${durata === 1 ? 'minuto' : 'minuti'}! Se la dici… si conta. 😈`
        : `${chi} ti obbliga a dire SOLO ${cosa} per ${durata} ${durata === 1 ? 'minuto' : 'minuti'}! Ogni altra frase… si conta. 😈`;
      this.say(channel, `🔒 ${regola}`);
      this._overlay(channel, { azione: 'start', id, modo, tipo, valore, durata, ...this._overlayOpts(c) });
      log.info(`penitenza #${id} su #${channel}: ${modo} "${valore}" ${durata}m (da ${chi})`);
      return true;
    } catch (e) { log.error(`daRiscatto #${channel}:`, e?.message || e); return false; }
  }

  // Frase sentita dallo streamer → aggiorna i contatori (niente penitenza qui:
  // scatta alla fine del tempo).
  controllaVoce(channel, frase) {
    try {
      const lista = this.attive.get(channel);
      if (!lista || !lista.length) return;
      const norm = NORM(frase);
      if (!norm) return;
      const parole = norm.split(' ');
      const senzaSpazi = norm.replace(/\s/g, '');
      const c = this.cfg(channel);
      const soglia = this._soglia(c);
      const ora = Date.now();
      for (const p of lista) {
        if (p.scadenza <= ora) continue;
        // dedup: ignora la stessa identica frase ripetuta entro 3s (interim doppi)
        if (norm === p.ultimaFrase && ora - p.ultimaTs < 3000) continue;
        p.ultimaFrase = norm; p.ultimaTs = ora;

        let hit = 0;
        if (p.tipo === 'lettera') {
          if (p.modo === 'vieta') hit = (senzaSpazi.match(new RegExp(p.valore, 'g')) || []).length;
          else hit = senzaSpazi.includes(p.valore) ? 0 : 1;   // "solo": se NON c'è la lettera → strike
        } else if (p.modo === 'vieta') {
          hit = parole.filter((w) => simile(w, p.valore, soglia)).length;   // ogni occorrenza
        } else {
          // "solo": +1 se la frase contiene una parola diversa dal bersaglio
          const deviata = parole.some((w) => w.length > 1 && !simile(w, p.valore, soglia));
          hit = deviata ? 1 : 0;
        }
        if (!hit) continue;
        p.count += hit;
        this._overlay(channel, { azione: 'hit', id: p.id, count: p.count, inc: hit });
        log.debug(`#${channel} penitenza #${p.id}: +${hit} (tot ${p.count})`);
      }
    } catch (e) { log.debug(`controllaVoce #${channel}:`, e?.message || e); }
  }

  // Sceglie la penitenza: dalla lista dello streamer, oppure dall'IA, con rete di
  // sicurezza sulle suggerite.
  async _scegliPenitenza(channel, c) {
    const mie = (c?.penitenze || []).map((x) => String(x).trim()).filter(Boolean);
    const modo = c?.penitenzeModo === 'ia' ? 'ia' : (mie.length ? 'lista' : 'ia');
    if (modo === 'lista' && mie.length) return scegli(mie);
    if (this.ia) {
      try {
        const r = await this.ia(channel);
        const t = String(r || '').trim();
        if (t) return t.slice(0, 160);
      } catch { /* IA non disponibile: rete di sicurezza */ }
    }
    return scegli(mie.length ? mie : SUGGERITE) || 'una penitenza a scelta della chat';
  }

  async _concludi(channel, p) {
    const c = this.cfg(channel);
    const cosa = p.tipo === 'lettera' ? `La lettera "${p.valore.toUpperCase()}"` : `La parola "${p.valore}"`;
    if (p.count > 0) {
      const pen = await this._scegliPenitenza(channel, c);
      const volte = p.count === 1 ? '1 volta' : `${p.count} volte`;
      this.say(channel, `⏱️ Tempo scaduto! ${cosa}: beccato ${volte} → PENITENZA: ${pen}${p.count > 1 ? ` ×${p.count}` : ''} 😈`);
      this._overlay(channel, { azione: 'end', id: p.id, count: p.count, penitenza: pen });
      if (c?.effetto && this.effects?.fire) { try { this.effects.fire(channel, c.effetto); } catch { /* niente */ } }
    } else {
      this.say(channel, `✅ Tempo scaduto! ${cosa}: 0 penitenze — salvo! 🎉`);
      this._overlay(channel, { azione: 'end', id: p.id, count: 0, penitenza: '' });
    }
  }

  // Penitenze attive del canale (per overlay/pannello).
  stato(channel) {
    const ora = Date.now();
    return (this.attive.get(channel) || []).filter((p) => p.scadenza > ora)
      .map((p) => ({ id: p.id, modo: p.modo, tipo: p.tipo, valore: p.valore, count: p.count, restano: Math.max(0, Math.round((p.scadenza - ora) / 1000)) }));
  }

  _overlay(channel, payload) {
    if (this.effects?.emit) { try { this.effects.emit(channel, { tipo: 'penitenza', ...payload }); } catch { /* niente */ } }
  }

  // Prova dal pannello: mostra un contatore d'esempio nell'overlay (start → +1 →
  // +1 → fine) senza toccare le penitenze reali.
  prova(channel) {
    const c = this.cfg(channel);
    const id = `prova-${this._nextId++}`;
    this._overlay(channel, { azione: 'start', id, modo: 'vieta', tipo: 'parola', valore: 'esempio', durata: 1, ...this._overlayOpts(c) });
    setTimeout(() => this._overlay(channel, { azione: 'hit', id, count: 1, inc: 1 }), 700);
    setTimeout(() => this._overlay(channel, { azione: 'hit', id, count: 2, inc: 1 }), 1500);
    setTimeout(() => this._overlay(channel, { azione: 'end', id, count: 2, penitenza: '10 flessioni' }), 2600);
    return true;
  }

  // Sweep periodico: conclude le penitenze scadute. Si spegne da solo.
  _avviaSweep() {
    if (this._sweep) return;
    this._sweep = setInterval(() => {
      const ora = Date.now();
      let restaQualcosa = false;
      for (const [ch, lista] of this.attive) {
        const vive = [];
        for (const p of lista) {
          if (p.scadenza > ora) { vive.push(p); }
          else { Promise.resolve(this._concludi(ch, p)).catch(() => {}); }
        }
        if (vive.length) { this.attive.set(ch, vive); restaQualcosa = true; } else this.attive.delete(ch);
      }
      if (!restaQualcosa) { clearInterval(this._sweep); this._sweep = null; }
    }, 3000);
    this._sweep.unref?.();
  }
}
