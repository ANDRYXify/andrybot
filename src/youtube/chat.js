// LEGGERE LA CHAT DI YOUTUBE.
//
// Twitch e Kick arrivano da soli: uno con una connessione sempre aperta,
// l'altro con un webhook. YouTube no — la sua chat si CHIEDE, e la si chiede
// a intervalli che decide lui: ogni risposta porta un `pollingIntervalMillis`,
// che e' YouTube che dice quanto e' carica la chat in questo momento. Non lo si
// sceglie da soli, e non e' cortesia: la quota giornaliera di un progetto e'
// 10.000 unita' (fonte: developers.google.com/youtube/v3/determine_quota_cost),
// e chiedere piu' spesso del dovuto la finisce prima della diretta.
//
// Il segnalibro. Ogni risposta porta anche un `nextPageToken`: senza, si
// ricomincia da capo ogni volta e ogni messaggio viene processato due volte —
// due comandi eseguiti, due volte le monete. Il segnalibro non e' una
// ottimizzazione: e' la correttezza.
//
// Quando la diretta finisce. La chat muore con lei: YouTube risponde 403/404 e
// il giro si ferma da solo. Poi si torna a chiedere ogni tanto «c'e' una
// diretta?», con calma, perche' quella domanda costa quota anche quando la
// risposta e' no.
import * as vero from './api.js';
import * as quota from './quota.js';
import { daMessaggioChat, canaliDi } from './messaggio.js';
import { makeLog } from '../logger.js';

const log = makeLog('youtube');

const CERCA_DIRETTA_MS = 3 * 60_000;   // ogni quanto si chiede «stai trasmettendo?»
const RIPOSO_ERRORE_MS = 60_000;       // dopo un errore non si martella
const ATTESA_MIN_MS = 3_000;

export class ChatYoutube {
  // `suMessaggio` riceve la forma comune del bot; `quandoCambia` serve solo a
  // farlo sapere a chi mostra lo stato.
  // `api` esiste per il collaudo: le chiamate vere stanno in api.js, e qui si
  // possono sostituire con delle finte per provare il giro senza rete e senza
  // YouTube. Il difetto che conta — riprocessare due volte gli stessi messaggi
  // perche' il segnalibro non si tiene — si vede solo provando il GIRO, non le
  // singole chiamate.
  constructor({ suMessaggio, quandoCambia, api, attesaMinMs, borsa } = {}) {
    this.api = { ...vero, ...(api || {}) };
    this.borsa = { ...quota, ...(borsa || {}) };
    this.attesaMinMs = Number.isFinite(attesaMinMs) ? attesaMinMs : ATTESA_MIN_MS;
    this.suMessaggio = typeof suMessaggio === 'function' ? suMessaggio : () => {};
    this.quandoCambia = typeof quandoCambia === 'function' ? quandoCambia : () => {};
    this.giri = new Map();               // login → { chatId, pagina, timer, acceso, video, errori }
  }

  // L'indirizzo della chat aperta adesso, per chi deve parlarci.
  chatDi(login) { return this.giri.get(String(login).toLowerCase())?.chatId || ''; }
  stato(login) {
    const g = this.giri.get(String(login).toLowerCase());
    if (!g) return { acceso: false, inDiretta: false, quota: this.borsa.stato() };
    return { acceso: true, inDiretta: !!g.chatId, video: g.video || '', errori: g.errori || 0,
      senzaQuota: !!g.senzaQuota, quota: this.borsa.stato() };
  }

  accendi(login) {
    const chi = String(login || '').toLowerCase();
    if (!chi || this.giri.has(chi)) return;
    this.giri.set(chi, { chatId: '', pagina: '', timer: null, acceso: true, video: '', errori: 0 });
    log.info(`@${chi}: leggo la chat di YouTube`);
    this._prossimo(chi, 0);
  }

  spegni(login) {
    const chi = String(login || '').toLowerCase();
    const g = this.giri.get(chi);
    if (!g) return;
    if (g.timer) clearTimeout(g.timer);
    this.giri.delete(chi);
    log.info(`@${chi}: smetto di leggere la chat di YouTube`);
    this.quandoCambia(chi, { acceso: false, inDiretta: false });
  }

  spegniTutti() { for (const chi of [...this.giri.keys()]) this.spegni(chi); }

  _prossimo(chi, fraMs) {
    const g = this.giri.get(chi);
    if (!g || !g.acceso) return;
    if (g.timer) clearTimeout(g.timer);
    g.timer = setTimeout(() => { this._giro(chi).catch((e) => log.debug('giro:', e?.message || e)); }, Math.max(0, fraMs));
    g.timer.unref?.();
  }

  async _giro(chi) {
    const g = this.giri.get(chi);
    if (!g || !g.acceso) return;

    // La borsa e' una sola per tutti i canali: quando e' vuota si smette di
    // bussare fino a domani, invece di consumare il margine che serve al resto
    // del bot (l'avviso del video nuovo passa dalla stessa quota).
    if (!this.borsa.chiedi(1)) {
      if (!g.senzaQuota) {
        g.senzaQuota = true;
        log.warn(`@${chi}: quota YouTube finita per oggi, la chat riprende al rinnovo`);
        this.quandoCambia(chi, { acceso: true, inDiretta: false, senzaQuota: true });
      }
      return this._prossimo(chi, this.borsa.fraQuantoRinnova());
    }
    g.senzaQuota = false;

    // Non c'e' ancora una chat: si chiede se sta trasmettendo.
    if (!g.chatId) {
      const d = await this.api.direttaInCorso(chi);
      if (!d.ok) {
        g.errori += 1;
        log.debug(`@${chi}: non riesco a sapere se e' in diretta — ${d.errore}`);
        return this._prossimo(chi, RIPOSO_ERRORE_MS);
      }
      g.errori = 0;
      if (!d.inDiretta || !d.chatId) return this._prossimo(chi, CERCA_DIRETTA_MS);
      g.chatId = d.chatId;
      g.video = d.videoId;
      // Si riparte dalla FINE, non dall'inizio: senza segnalibro la prima
      // risposta porta la storia recente della chat, e il bot risponderebbe a
      // messaggi di mezz'ora fa come se fossero appena arrivati.
      g.pagina = '';
      g.primaVolta = true;
      log.info(`@${chi}: chat YouTube aperta (${d.titolo || d.videoId})`);
      this.quandoCambia(chi, { acceso: true, inDiretta: true, video: d.videoId });
      return this._prossimo(chi, 0);
    }

    const r = await this.api.messaggiChat(chi, { chatId: g.chatId, pagina: g.pagina });
    if (!r.ok) {
      // 403/404 su una chat che c'era vuol dire che la diretta e' finita.
      if (r.stato === 403 || r.stato === 404) {
        log.info(`@${chi}: la chat YouTube si e' chiusa (diretta finita)`);
        g.chatId = ''; g.pagina = ''; g.video = '';
        this.quandoCambia(chi, { acceso: true, inDiretta: false });
        return this._prossimo(chi, CERCA_DIRETTA_MS);
      }
      g.errori += 1;
      log.debug(`@${chi}: chat YouTube — ${r.errore}`);
      return this._prossimo(chi, RIPOSO_ERRORE_MS);
    }

    g.errori = 0;
    g.pagina = r.pagina;
    const attesa = Math.max(this.attesaMinMs, r.attesaMs);

    // Il primo giro serve solo a prendere il segnalibro: quello che c'era prima
    // che il bot arrivasse non e' roba a cui rispondere.
    if (g.primaVolta) {
      g.primaVolta = false;
      return this._prossimo(chi, attesa);
    }

    if (r.voci.length) {
      try { await this.api.risolviManiglie(chi, canaliDi(r.voci)); } catch (e) { /* si va avanti col nome visibile */ }
      for (const v of r.voci) {
        const canaleId = String(v?.authorDetails?.channelId || '');
        const msg = daMessaggioChat(v, { canale: chi, maniglia: this.api.manigliaNota(canaleId) });
        if (!msg) continue;
        try { this.suMessaggio(msg); } catch (e) { log.debug('messaggio:', e?.message || e); }
      }
    }
    this._prossimo(chi, attesa);
  }
}
