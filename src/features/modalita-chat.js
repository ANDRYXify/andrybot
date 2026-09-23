// LE MODALITA' DELLA CHAT A TEMPO: «solo emote per due minuti».
//
// Twitch ha le modalita' (solo emote, messaggi unici, solo abbonati) ma non il
// tempo: si accendono e restano accese finche' qualcuno si ricorda di
// spegnerle. Qui si accendono PER un tempo, e si spengono da sole. Le accendono
// un mod col comando, un Modulo (un premio a punti canale, un evento, un
// comando tuo) o la chat che la sblocca con le monete.
//
// Quattro regole, e nessuna e' prudenza: sono quello che serve perche' «per
// due minuti» voglia dire due minuti.
//
//  · SI RIMETTE COM'ERA, NON «SPENTO». Se la modalita' era gia' accesa (l'ha
//    messa un mod), non la si tocca e non si programma niente: spegnerla alla
//    fine vorrebbe dire disfare la scelta di un altro.
//  · SOPRAVVIVE A UN RIAVVIO. Quello che il bot accende su Twitch resta acceso
//    anche se il bot muore: la fine sta nel database, e all'avvio si spegne
//    cio' che e' scaduto e si ripunta il resto. Come la serranda dello scudo.
//  · DUE SBLOCCHI NON SI SOMMANO A CASO: se arriva un secondo sblocco mentre il
//    primo corre, la fine diventa la piu' lontana delle due. Non si raddoppia,
//    non si accorcia.
//  · LE MODALITA' DELLO SCUDO NON SONO QUI. Chat lenta e soli follower le usa lo
//    scudo contro gli attacchi: se uno sblocco per gioco le spegnesse alla sua
//    fine, riaprirebbe la serranda in mezzo a un raid. Questo elenco e quello
//    dello scudo non si toccano, e una prova lo controlla.
//
// Il ragionamento sta in docs/MODALITA-CHAT.md.
import { statoVivo } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('modalita-chat');

export const MODI = Object.freeze({
  emote: { campo: 'emote_mode', nome: 'solo emote' },
  unici: { campo: 'unique_chat_mode', nome: 'messaggi unici' },
  sub: { campo: 'subscriber_mode', nome: 'solo abbonati' },
});

// Quello che lo scudo accende e spegne da se': qui non ci si entra.
export const CAMPI_DELLO_SCUDO = Object.freeze(['slow_mode', 'follower_mode', 'shield_mode']);

export const DURATA_DI_SERIE = 120;
export const DURATA_MIN = 10;
export const DURATA_MAX = 3600;
const RIPROVA_MS = 30_000;
const chiave = (modo) => `modalita:${modo}`;

// «2m», «90s», «5» (minuti), «1h», «2 min», «30 secondi». Vuoto vuol dire di
// serie; una cosa che non e' una durata vuol dire null, e chi chiama lo dice.
export function leggiDurata(testo, difetto = DURATA_DI_SERIE) {
  const t = String(testo ?? '').trim().toLowerCase().replace(',', '.');
  if (!t) return difetto;
  const m = /^(\d+(?:\.\d+)?)\s*(s|sec|secondi?|m|min|minuti?|h|ora|ore)?$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2] || 'm';
  const s = u.startsWith('s') ? n : u.startsWith('h') || u.startsWith('o') ? n * 3600 : n * 60;
  return Math.min(DURATA_MAX, Math.max(DURATA_MIN, Math.round(s)));
}

export function durataAParole(s) {
  const m = Math.floor(s / 60), r = s % 60;
  const min = m ? `${m} minut${m === 1 ? 'o' : 'i'}` : '';
  const sec = r ? `${r} second${r === 1 ? 'o' : 'i'}` : '';
  return [min, sec].filter(Boolean).join(' e ');
}

export class ModalitaChat {
  constructor({ helix, say = null, orologio = () => Date.now(), timer = setTimeout, annulla = clearTimeout } = {}) {
    this.helix = helix;
    this.say = say;
    this.orologio = orologio;
    this.timer = timer;
    this.annulla = annulla;
    this.sveglie = new Map();
  }

  // Accende `modo` per `secondi`. Ritorna cosa e' successo, perche' chi chiama
  // sappia cosa dire (o tacere).
  async accendiPer(channel, modo, secondi = DURATA_DI_SERIE, { annuncia = true } = {}) {
    const ch = String(channel || '').toLowerCase();
    const def = MODI[modo];
    if (!ch || !def) return { ok: false, esito: 'errore', motivo: 'modalità sconosciuta' };
    const durata = Math.min(DURATA_MAX, Math.max(DURATA_MIN, Math.round(Number(secondi) || DURATA_DI_SERIE)));
    const adesso = this.orologio();
    const gia = statoVivo.leggi(ch, chiave(modo));
    if (gia?.fino) {
      // Un mod puo' averla spenta a mano nel frattempo: lo sblocco nuovo la
      // riaccende, perche' e' quello che e' stato chiesto adesso.
      const ora = await this.helix?.leggiChat?.(ch).catch(() => null);
      if (ora && !ora[def.campo]) await this.helix?.impostaChat?.(ch, { [def.campo]: true }).catch(() => null);
      const fino = Math.max(gia.fino, adesso + durata * 1000);
      statoVivo.scrivi(ch, chiave(modo), { ...gia, fino });
      this._punta(ch, modo, fino);
      if (annuncia) this.say?.(ch, `⏳ Modalità ${def.nome} allungata: fino a fra ${durataAParole(Math.round((fino - adesso) / 1000))}.`);
      return { ok: true, esito: 'esteso', fino };
    }
    const ora = await this.helix?.leggiChat?.(ch).catch(() => null);
    if (ora?.[def.campo]) return { ok: true, esito: 'gia' };
    const r = await this.helix?.impostaChat?.(ch, { [def.campo]: true }).catch(() => null);
    if (!r?.ok) return { ok: false, esito: 'errore', motivo: r?.motivo || 'errore Twitch' };
    const fino = adesso + durata * 1000;
    statoVivo.scrivi(ch, chiave(modo), { fino, da: adesso });
    this._punta(ch, modo, fino);
    if (annuncia) this.say?.(ch, `🎉 Chat in modalità ${def.nome} per ${durataAParole(durata)}!`);
    return { ok: true, esito: 'acceso', fino };
  }

  _punta(ch, modo, fino) {
    const k = `${ch}:${modo}`;
    this.annulla(this.sveglie.get(k));
    const t = this.timer(() => { this.sveglie.delete(k); this._spegni(ch, modo).catch(() => {}); }, Math.max(0, fino - this.orologio()));
    t?.unref?.();
    this.sveglie.set(k, t);
  }

  // Alla fine si spegne solo quello che si era acceso. Se Twitch non risponde
  // la riga resta e si riprova: una chat rimasta in solo emote per sempre e'
  // esattamente il difetto che questo modulo esiste per non avere.
  async _spegni(ch, modo) {
    const st = statoVivo.leggi(ch, chiave(modo));
    if (!st?.fino) return;
    if (st.fino > this.orologio()) { this._punta(ch, modo, st.fino); return; }
    const r = await this.helix?.impostaChat?.(ch, { [MODI[modo].campo]: false }).catch(() => null);
    if (!r?.ok) {
      log.warn(`#${ch} modalità ${modo} non spenta: si riprova`);
      this._punta(ch, modo, this.orologio() + RIPROVA_MS);
      statoVivo.scrivi(ch, chiave(modo), { ...st, fino: this.orologio() + RIPROVA_MS });
      return;
    }
    statoVivo.togli(ch, chiave(modo));
    this.say?.(ch, `✓ Fine della modalità ${MODI[modo].nome}: chat di nuovo libera.`);
  }

  // Finire prima: solo quello che si era acceso noi.
  async spegniOra(channel, modo) {
    const ch = String(channel || '').toLowerCase();
    const st = statoVivo.leggi(ch, chiave(modo));
    if (!st?.fino) return { nostra: false };
    statoVivo.scrivi(ch, chiave(modo), { ...st, fino: this.orologio() });
    this.annulla(this.sveglie.get(`${ch}:${modo}`));
    this.sveglie.delete(`${ch}:${modo}`);
    await this._spegni(ch, modo);
    return { nostra: true };
  }

  // All'avvio: quello che era acceso per tempo si riprende da dove era.
  riprendi() {
    for (const modo of Object.keys(MODI)) {
      let righe = [];
      try { righe = statoVivo.tutti(chiave(modo)); } catch { righe = []; }
      for (const r of righe) if (r.dato?.fino) this._punta(r.channel, modo, r.dato.fino);
    }
  }

  attive(channel) {
    const ch = String(channel || '').toLowerCase();
    return Object.keys(MODI).map((modo) => ({ modo, ...(statoVivo.leggi(ch, chiave(modo)) || {}) })).filter((x) => x.fino);
  }

  ferma() {
    for (const t of this.sveglie.values()) this.annulla(t);
    this.sveglie.clear();
  }
}

// ── i comandi dei mod ─────────────────────────────────────────────────────
//
// !soloemote [durata|off], !messaggiunici, !soloabbonati. Il nome arriva gia'
// tradotto dal vaglio dei comandi, che risponde lui a chi non e' mod. Senza
// durata sono due minuti; con una durata («5m», «90s», «10») e' quella.
export const COMANDI_MODO = Object.freeze({ 'soloemote': 'emote', 'messaggiunici': 'unici', 'soloabbonati': 'sub' });

export async function tryComando(istanza, msg, say) {
  const testo = String(msg?.text || '').trim();
  const m = /^!([a-z]+)(?:\s+(.+))?$/i.exec(testo);
  const modo = m && COMANDI_MODO[m[1].toLowerCase()];
  if (!modo) return false;
  if (!(msg.isMod || msg.isBroadcaster)) return true;
  const arg = String(m[2] || '').trim().toLowerCase();
  const ch = String(msg.channel || '').toLowerCase();
  if (arg === 'off' || arg === 'stop' || arg === 'basta') {
    const r = await istanza.spegniOra(ch, modo);
    if (!r.nostra) say(`La modalità ${MODI[modo].nome} non l'ho accesa io: si spegne dalle impostazioni della chat di Twitch.`);
    return true;
  }
  const secondi = leggiDurata(arg);
  if (secondi === null) { say(`⏳ Si usa così: !${m[1].toLowerCase()} 5m (oppure 90s, o niente per ${durataAParole(DURATA_DI_SERIE)}).`); return true; }
  const r = await istanza.accendiPer(ch, modo, secondi);
  if (r.esito === 'gia') say(`La modalità ${MODI[modo].nome} è già accesa, e non l'ho accesa io: la lascio com'è.`);
  else if (!r.ok) say(/permesso/.test(r.motivo || '') ? '🔒 Mi manca il permesso per cambiare le impostazioni della chat: riautorizza dalla dashboard.' : `Non sono riuscita a cambiare la chat: ${r.motivo}.`);
  return true;
}
