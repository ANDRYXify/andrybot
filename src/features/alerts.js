// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// AlertsEngine: il "regista" dell'overlay in tempo reale.
// - ALERT animati per gli eventi (follow, sub, cheer, raid) con stile completo;
// - CHAT a schermo;
// - WIDGET persistenti (ultimo follower, ultimo sub) aggiornati dagli eventi.
// Riusa il canale SSE degli effetti (EffectsEngine.emit) e i suoni PRESET.
// Tutta la configurazione (e lo stato dei widget) vive in streamers.settings.
import { streamers, effects as effectsDb, statoVivo } from '../db.js';
import { linguaChat } from './lingua-canale.js';

// I titoli di base del conto alla pubblicita', nella lingua della chat: li
// legge chi guarda la diretta.
const TITOLI_PUBBLICITA = { it: ['Pubblicità fra', 'Torno fra'], en: ['Ads in', 'Back in'], es: ['Anuncios en', 'Vuelvo en'] };
import * as subathon from './subathon.js';
import * as treno from './treno.js';
import { comeSiChiama, portaCorona } from './bit.js';
import * as stemmi from './badges.js';
import * as emote from './emotes.js';
import { makeLog } from '../logger.js';
import { formattaImporto, livelloPer } from './donazioni.js';
import { chiAlertOk, SUONI_PRESET } from '../web/stile.js';
import * as effettiEventi from './effetti-eventi.js';
import { canaleHa } from './accesso.js';

const log = makeLog('alerts');

const MAPPA = {
  'channel.follow': 'follow',
  'channel.subscribe': 'sub',
  'channel.subscription.message': 'sub',
  'channel.subscription.gift': 'sub',
  'channel.cheer': 'cheer',
  'channel.raid': 'raid',
  // i Kicks di Kick: un avviso loro (non sono Bit), che mostra solo SocialBot
  'kicks.gifted': 'kicks',
};

const DEFAULT_TESTO = {
  follow: '{user} ha seguito il canale!',
  sub: '{user} si è abbonato! ({mesi} mesi)',
  cheer: '{user} ha lanciato {bits} bit!',
  kicks: '{user} ha regalato {kicks} Kicks!',
  raid: '{user} è arrivato in raid con {viewers} spettatori!',
  donazione: '{user} ha offerto {importo}! {messaggio}',
};
// Il suono di un alert che non ne ha scelto uno. «nessuno» e' il silenzio,
// scelto: il vuoto vuol dire «di serie», com'e' sempre stato, e nessuno si
// ritrova un alert muto. Lo Studio mostra questo stesso suono (un test li tiene
// uguali).
export const DEFAULT_SUONO = { follow: 'campanello', sub: 'tada', cheer: 'moneta', kicks: 'moneta', raid: 'trombetta', donazione: 'moneta' };
export const SUONO_MUTO = 'nessuno';
// L'avviso suona davvero? Un suono vero (caricato o pronto) e il volume sopra zero.
const suonaAvviso = (p) => !!p && Number(p.volume) > 0 && (!!p.suonoUrl || SUONI_PRESET.has(p.suono));
// Quando l'avviso parte anche lui, l'effetto dell'evento arriva un attimo dopo:
// prima si legge chi e' stato, poi si festeggia (come l'effetto di un'offerta).
const DOPO_AVVISO_MS = 1200;
const DEFAULT_ACC = { follow: '#f72fa7', sub: '#ffb020', cheer: '#38d39f', kicks: '#53fc18', raid: '#ff4d4d', donazione: '#1d9e5e' };

// stile alert di default (usato se lo streamer non lo tocca)
const STILE_ALERT = { animazione: 'slide', dimTesto: 27, sfondo: '#0f0f14', opacita: 88, testo: '#ffffff', bordoRaggio: 18, bordoSpessore: 2, glow: true, icona: true, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea', composizione: 'colonna', dimIcona: 46, uscita: 'come', peso: '700', spaziatura: 0, maiuscolo: 'no', ombraTesto: true, evidenziaNome: true };
const STILE_CHAT = { dim: 'media', sfondo: '#0f0f14', opacita: 78, testo: '#f2f2f5', username: 'twitch', bordoRaggio: 10, ombra: true, font: 'sistema', larghezza: 30, animazione: 'slide', grassettoUser: true, forma: 'carta', materia: 'piatta', cornice: 'nessuna', peso: '700', spaziatura: 0, maiuscolo: 'no', ombraTesto: false };

const esc = (s) => String(s ?? '');
function riempi(tpl, vars) {
  return esc(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).slice(0, 200);
}

// Quale evento fa crescere quale obiettivo. Un evento che non compare qui non
// ne fa crescere nessuno: e' l'elenco, non un caso particolare nel codice.
const GOAL_DI = { follow: 'follower', sub: 'sub', cheer: 'bit', donazione: 'euro' };

// Gli obiettivi del canale. Chi aveva l'obiettivo singolo di prima se lo ritrova
// come primo della lista, col suo conto: nessuno perde niente cambiando forma.
export function goalDi(settings) {
  const s = settings || {};
  if (Array.isArray(s.overlayGoals)) return s.overlayGoals;
  const vecchio = s.overlayGoal;
  if (!vecchio || typeof vecchio !== 'object') return [];
  return [{ id: 'g1', attivo: !!vecchio.attivo, tipo: vecchio.tipo || 'follower',
    obiettivo: Number(vecchio.obiettivo) || 100, titolo: vecchio.titolo || '',
    posizione: 'alto-sinistra', xy: null, stile: {} }];
}

export function contiGoal(settings) {
  const st = settings?.overlayStato || {};
  if (st.goals && typeof st.goals === 'object') return st.goals;
  const vecchio = st.goal;
  const lista = goalDi(settings);
  if (!vecchio || !lista.length) return {};
  return { [lista[0].id]: Number(vecchio[lista[0].tipo]) || 0 };
}

// Da dove arriva un messaggio. Chi legge da Twitch non scrive la piattaforma
// (era l'unica quando il bot e' nato), quindi l'assenza vale 'twitch': cosi' i
// canali che non hanno mai collegato altro non cambiano di una virgola.
const piattaformaDi = (msg) => String(msg?.piattaforma || 'twitch').toLowerCase();

export class AlertsEngine {
  constructor({ effects, say, muro } = {}) {
    this.effects = effects || null;
    this.say = say || null;
    this.muro = muro || null;
    this._pausaEventi = new Map(); // 'canale|evento' → epoch ms prima del quale quell'effetto tace
    this._treni = new Map();       // canale → { id, livello } dell'ultimo treno visto
  }

  cfg(channel) { return streamers.get(channel)?.settings || null; }

  _stileAlert(s) { return { ...STILE_ALERT, ...((s?.alerts?.stile && typeof s.alerts.stile === 'object') ? s.alerts.stile : {}) }; }
  _stileChat(s) { return { ...STILE_CHAT, ...((s?.chatOverlay?.stile && typeof s.chatOverlay.stile === 'object') ? s.chatOverlay.stile : {}) }; }

  _vars(d = {}) {
    const raider = d.from_broadcaster_user_name || '';
    return {
      user: comeSiChiama(d, raider || 'qualcuno'),
      mesi: d.cumulative_months ?? d.duration_months ?? 1,
      bits: d.bits ?? 0,
      kicks: d.kicks ?? 0,
      viewers: d.viewers ?? 0,
    };
  }

  // Evento Twitch → aggiorna i widget (ultimo follower/sub) e, se abilitato, spara l'alert.
  onEvent(ev) {
    try {
      const { channel, type, data } = ev || {};
      // IL TRENO PASSA PRIMA, E DA SOLO. Non e' un alert: non ha un suo suono,
      // non ha un suo testo da sparare in scena, e soprattutto NON conta — i
      // sub e i bit che lo fanno crescere sono gia' passati di qui uno per uno.
      // Vedi features/treno.js.
      if (treno.EVENTI[type]) {
        treno.suEvento(channel, type, data, {
          say: this.say,
          spingi: (ch, t) => this.effects?.emit?.(ch, { tipo: 'treno', treno: t }),
        });
        this._effettoTreno(channel, type, data);
        return;
      }
      const sc = this._scenaEvento(this.cfg(channel), type, data);
      if (!sc) return;
      const { kind, vars, regalo } = sc;
      // widget persistenti: si aggiornano a prescindere dall'alert
      if (kind === 'follow') this._aggiornaWidget(channel, 'ultimoFollower', vars.user);
      if (kind === 'sub') this._aggiornaWidget(channel, 'ultimoSub', vars.user);
      // l'obiettivo conta gli eventi veri, non una stima: passano tutti di qui.
      // La raffica dei regali no (vedi _scenaEvento): ogni regalo e' gia' un sub.
      if (!regalo) sc.obiettivo = this._contaGoal(channel, kind, kind === 'cheer' ? Number(vars.bits) || 0 : 1);
      // il subathon allunga il conto alla rovescia, se lo streamer lo ha acceso
      if (!regalo && (kind === 'sub' || kind === 'cheer')) {
        subathon.suEvento(channel, {
          tipo: kind === 'cheer' ? 'bit' : 'sub',
          quanti: kind === 'cheer' ? Number(vars.bits) || 0 : 1,
          chi: vars.user,
        }, { say: this.say, spingi: (ch, fine) => this.effects?.emit?.(ch, { tipo: 'timer', fine }) });
      }
      this._vaInOnda(channel, sc);
    } catch (e) { log.debug('onEvent:', e?.message || e); }
  }

  // LA SCENA DI UN EVENTO: chi e', quale effetto lo festeggia e se parte il
  // nostro avviso. Non tocca niente: la usano l'evento vero e la prova, che
  // cosi' e' l'evento vero meno i conti.
  _scenaEvento(s, type, data) {
    const kind = MAPPA[type];
    if (!kind) return null;
    const vars = this._vars(data);
    // I SUB REGALATI ARRIVANO DUE VOLTE. Twitch manda un `channel.subscribe`
    // per OGNI abbonamento regalato, piu' un `channel.subscription.gift` per
    // la raffica: contarli tutti e due vuol dire contare venti regali
    // ventuno volte. L'annuncio della raffica serve all'alert, non al conto;
    // e il regalo si festeggia una volta, con la raffica.
    const regalo = type === 'channel.subscription.gift';
    const a = s?.alerts;
    const conf = a && a.attivo !== false ? a[kind] : null;
    // lo streamer ha scelto l'alert di Twitch: il nostro non parte, ma i
    // widget, gli obiettivi e la maratona hanno contato lo stesso
    const avviso = !!conf && conf.attivo !== false && chiAlertOk(kind, conf.chi) !== 'twitch'
      && !(kind === 'cheer' && Number(vars.bits) < (Number(conf.minBits) || 0))
      && !(kind === 'kicks' && Number(vars.kicks) < (Number(conf.minKicks) || 0))
      && !(kind === 'raid' && Number(vars.viewers) < (Number(conf.minViewers) || 0));
    const evento = type === 'channel.subscribe' && data?.is_gift === true ? null : (regalo ? 'regalo' : kind);
    const quanto = evento ? { follow: null, sub: Number(vars.mesi) || 1, regalo: Number(data?.total) || 1, cheer: Number(vars.bits) || 0, kicks: Number(vars.kicks) || 0, raid: Number(vars.viewers) || 0 }[evento] : null;
    return { kind, vars, regalo, evento, quanto, avviso: avviso ? { a, conf } : null };
  }

  // LA MESSA IN ONDA: prima l'avviso, poi l'effetto dell'offerta o quello
  // dell'evento, poi quello dell'obiettivo raggiunto. L'EFFETTO DELL'EVENTO non
  // dipende dall'alert: parte anche quando l'alert lo mostra Twitch, o e'
  // spento. Se l'avviso parte, l'effetto arriva un attimo dopo; se l'avviso
  // suona e lo streamer l'ha chiesto, l'effetto parte senza suono.
  // `voce` e `prova` li passa solo la prova (le scelte non salvate, senza pausa).
  _vaInOnda(channel, sc, { voce = null, prova = false } = {}) {
    const pa = sc.avviso ? this._spara(channel, sc.avviso.a, sc.kind, sc.avviso.conf, sc.vars) : null;
    const dopo = pa ? DOPO_AVVISO_MS : 0;
    const offerta = sc.offerta ? this._sparaEffetto(channel, sc.offerta, DOPO_AVVISO_MS) : false;
    const effetto = sc.evento && !offerta ? this._effettoEvento(channel, sc.evento, sc.quanto, dopo, { voce, prova, alertSuona: suonaAvviso(pa) }) : null;
    const obiettivo = sc.obiettivo ? this._effettoEvento(channel, 'obiettivo', null, dopo) : null;
    return { avviso: !!pa, offerta, effetto, obiettivo };
  }

  // LA PROVA DI UN EVENTO: una scena finta, messa in onda come quella vera, con
  // le scelte che lo streamer ha davanti, anche non salvate. Niente conti e
  // niente pausa. Ritorna quello che e' partito, per dirlo nel pannello.
  provaEvento(channel, evento, quanto, voce = null) {
    const s = this.cfg(channel) || {};
    const n = Number(quanto) || 0;
    const chi = 'MarioRossi';
    const finto = {
      follow: ['channel.follow', { user_name: chi }],
      sub: ['channel.subscription.message', { user_name: chi, cumulative_months: n || 1 }],
      regalo: ['channel.subscription.gift', { user_name: chi, total: n || 1 }],
      cheer: ['channel.cheer', { user_name: chi, bits: n }],
      kicks: ['kicks.gifted', { user_name: chi, kicks: n, piattaforma: 'kick' }],
      raid: ['channel.raid', { from_broadcaster_user_name: chi, viewers: n }],
    }[evento];
    let sc = null;
    if (finto) sc = this._scenaEvento(s, finto[0], finto[1]);
    else if (evento === 'donazione') sc = this._scenaDonazione(s, { importo: n || 1, user: chi, messaggio: 'grande live!' });
    else if (evento === 'treno') sc = { evento, quanto: n || 1, avviso: null };
    else if (evento === 'obiettivo') sc = { evento, quanto: null, avviso: null };
    if (!sc) return null;
    return this._vaInOnda(channel, sc, { voce, prova: true });
  }

  // L'EFFETTO DI UN EVENTO (docs/EFFETTI-SCHERMO.md, «Effetti per gli eventi»):
  // il livello che il numero raggiunge, se l'evento e' acceso e la sua pausa e'
  // passata. Il nome del comando non viaggia: sopra un effetto partito da un
  // follow, «!coriandoli» non vuol dire niente a chi guarda. E' una funzione
  // degli Effetti: un canale che non li ha piu' nel piano non la usa, anche se
  // le scelte salvate sono rimaste.
  // Ritorna cosa e' successo: { parte, da } o { parte: false, perche }, con
  // perche' fra piano, spento, vuoto, sotto, pausa, manca e muto.
  _effettoEvento(channel, evento, quanto, ritardoMs = 0, { voce = null, prova = false, alertSuona = false } = {}) {
    try {
      if (!this.effects?.emit) return { parte: false, perche: 'manca' };
      if (!canaleHa(channel, 'effetti')) return { parte: false, perche: 'piano' };
      const v = voce || effettiEventi.voceDi(this.cfg(channel), evento);
      if (!v || v.attivo !== true) return { parte: false, perche: 'spento' };
      const livello = effettiEventi.livelloPer(v, quanto);
      if (!livello) return { parte: false, perche: v.livelli?.length ? 'sotto' : 'vuoto' };
      const chiave = channel + '|' + evento;
      const ora = Date.now();
      if (!prova && ora < (this._pausaEventi.get(chiave) || 0)) return { parte: false, perche: 'pausa', da: livello.da };
      const e = livello.effetto;
      let p = null, soloSuono = false;
      if (e?.tipo === 'pronto') p = this.effects.payloadDisegno?.(channel, e.disegno, e.volume);
      else if (e?.tipo === 'mio') {
        const eff = effectsDb.get(channel, e.comando);
        if (eff) { p = this.effects.payload(channel, eff); soloSuono = eff.tipo === 'audio'; }
      }
      if (!p) return { parte: false, perche: 'manca', da: livello.da };
      // senza suono, se l'avviso suona gia': un effetto che e' solo un suono, allora, non parte
      const muto = alertSuona && v.muto === true;
      if (muto && soloSuono) return { parte: false, perche: 'muto', da: livello.da };
      if (!prova) this._pausaEventi.set(chiave, ora + (Number(v.pausa) || 0) * 1000);
      const q = { ...p, comando: '', da: 'evento', evento, ...(muto ? { volume: 0 } : {}) };
      const manda = () => { try { this.effects.emit(channel, q); } catch (x) { log.debug('effetto evento:', x?.message || x); } };
      if (ritardoMs > 0) setTimeout(manda, ritardoMs).unref?.(); else manda();
      return { parte: true, da: livello.da, muto };
    } catch (x) { log.debug('effetto evento:', x?.message || x); return { parte: false, perche: 'manca' }; }
  }

  // Il treno festeggia quando parte e ogni volta che sale di livello. Il
  // livello di prima lo tiene il motore: il treno nelle impostazioni c'e' solo
  // se lo streamer lo mostra o lo annuncia, e l'effetto non deve dipendere da
  // quello. Un treno visto per la prima volta a meta' (il bot e' ripartito)
  // si ricorda senza festeggiare: il livello in cui e' non e' una salita.
  _effettoTreno(channel, type, data) {
    const t = treno.daEvento(type, data);
    if (!t) return;
    const prima = this._treni.get(channel);
    if (t.che === 'finisce') { this._treni.delete(channel); return; }
    const sale = t.che === 'parte' || (prima && prima.id === t.id && t.livello > prima.livello);
    if (t.che === 'parte' || !prima || prima.id !== t.id || t.livello > prima.livello) this._treni.set(channel, { id: t.id, livello: t.livello });
    if (sale) this._effettoEvento(channel, 'treno', t.livello);
  }

  // UNA DONAZIONE. Non viene da Twitch: la porta un pagamento sul conto dello
  // streamer, il webhook di Ko-fi o una sua automazione. Spara l'alert
  // (dall'importo minimo in su) e, se acceso, ringrazia in chat. L'obiettivo,
  // la maratona e le offerte contano nella valuta delle donazioni dello
  // streamer: un importo in un'altra valuta (una pagina Ko-fi in dollari) non si
  // somma e non si confronta, perche' un cambio non lo inventiamo. L'avviso e il
  // grazie partono lo stesso, con la valuta di chi ha donato.
  // `soloAvviso`: l'avviso si rimanda in overlay dal registro, ma l'obiettivo
  // e la chat non si toccano: quella donazione e' gia' stata contata e ringraziata.
  donazione(channel, d, { soloAvviso = false } = {}) {
    try {
      const s = this.cfg(channel);
      if (!s || !d) return false;
      const sc = this._scenaDonazione(s, d, { soloAvviso });
      if (!sc) return false;
      const { importo, stessa, vars } = sc;
      if (!soloAvviso && stessa) {
        sc.obiettivo = this._contaGoal(channel, 'donazione', importo);
        subathon.suEvento(channel, { tipo: 'euro', quanti: importo, chi: vars.user },
          { say: this.say, spingi: (ch, fine) => this.effects?.emit?.(ch, { tipo: 'timer', fine }) });
      }
      this._vaInOnda(channel, sc);
      const cfgD = s.donazioni || {};
      if (!soloAvviso && cfgD.annunciaChat && this.say) this.say(channel, riempi(cfgD.testoChat || 'Grazie {user} per {importo}!', vars));
      // il muro delle emote, dalla soglia in su: nella valuta del canale, come l'obiettivo
      if (!soloAvviso && stessa) { try { this.muro?.suDono(channel, importo); } catch { /* il muro e' un di piu' */ } }
      log.info(`donazione su #${channel}: ${vars.importo} da ${vars.user}`);
      return true;
    } catch (e) { log.debug('donazione:', e?.message || e); return false; }
  }

  // La scena di una donazione, come _scenaEvento. L'offerta raggiunta accende
  // il suo effetto, un attimo dopo l'avviso, e allora quello dell'evento no.
  // In un'altra valuta l'importo non si confronta coi livelli: parte il primo.
  // `soloAvviso`: si rimanda solo l'avviso, niente effetti.
  _scenaDonazione(s, d, { soloAvviso = false } = {}) {
    const importo = Math.round((Number(d.importo) || 0) * 100) / 100;
    if (importo <= 0) return null;
    const cfgD = s.donazioni || {};
    const valutaCanale = cfgD.valuta || 'EUR';
    const valuta = d.valuta || valutaCanale;
    const stessa = valuta === valutaCanale;
    const vars = { user: d.user || 'qualcuno', importo: formattaImporto(importo, valuta), messaggio: d.messaggio || '' };
    const a = s.alerts;
    const conf = a && a.attivo !== false ? a.donazione : null;
    const avviso = !!conf && conf.attivo !== false && (soloAvviso || !stessa || importo >= (Number(conf.minImporto) || 0));
    const liv = !soloAvviso && stessa ? livelloPer(cfgD.livelli, importo) : null;
    return { kind: 'donazione', vars, importo, stessa,
      evento: soloAvviso ? null : 'donazione', quanto: stessa ? importo : null,
      offerta: liv?.effetto || null, avviso: avviso ? { a, conf } : null };
  }

  // L'OBIETTIVO. Conta gli eventi che lo riguardano e li rende disponibili
  // all'overlay. Il conto sta nelle impostazioni del canale, quindi sopravvive a
  // un riavvio: un obiettivo che si azzera da solo la notte non e' un obiettivo.
  // Ritorna quanti obiettivi questo evento ha portato al traguardo: il
  // totale che si vede (partenza + eventi contati) passa l'obiettivo adesso.
  // Uno raggiunto e poi azzerato, raggiunto di nuovo, conta di nuovo.
  _contaGoal(channel, kind, quanti = 1) {
    try {
      const g = GOAL_DI[kind];
      if (!g || quanti <= 0) return 0;
      const s = streamers.get(channel);
      const lista = goalDi(s?.settings);
      const tocca = lista.filter((x) => x.attivo !== false && x.tipo === g);
      if (!tocca.length) return 0;
      const stato = { ...(s.settings?.overlayStato || {}) };
      const conti = { ...(stato.goals || {}) };
      let raggiunti = 0;
      for (const x of tocca) {
        const prima = Number(conti[x.id]) || 0;
        conti[x.id] = Math.round((prima + quanti) * 100) / 100;
        const base = Number(x.partenza) || 0, meta = Number(x.obiettivo) || 0;
        if (meta > 0 && base + prima < meta && base + conti[x.id] >= meta) raggiunti++;
      }
      stato.goals = conti;
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'goal', goals: lista, conti });
      return raggiunti;
    } catch (e) { log.debug('goal:', e?.message || e); return 0; }
  }

  // IL CONTO ALLA ROVESCIA. Non si tiene un contatore che scorre: si scrive
  // l'ISTANTE in cui scade, e chi lo mostra fa la sottrazione. Cosi' non c'e'
  // niente che possa andare fuori sincrono — ne' fra il server e l'overlay, ne'
  // fra due sorgenti aperte — e un riavvio del bot non lo azzera.
  // minuti = 0 lo spegne.
  impostaTimer(channel, minuti) {
    try {
      const s = streamers.get(channel);
      if (!s) return 0;
      const m = Math.max(0, Math.min(600, Math.round(Number(minuti) || 0)));
      const fine = m > 0 ? Date.now() + m * 60000 : 0;
      const stato = { ...(s.settings?.overlayStato || {}) };
      stato.timer = { fine };
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'timer', fine });
      return fine;
    } catch (e) { log.debug('timer:', e?.message || e); return 0; }
  }

  // L'OVERLAY DELL'ATTESA FA PARTIRE IL CONTO DA SE' (e lo stesso fa il pannello
  // nel momento in cui si accende «parte da solo»). Ma solo se non sta gia'
  // andando: due sorgenti aperte insieme chiederebbero tutte e due, e la seconda
  // farebbe ripartire da capo un conto gia' avviato — proprio mentre chi guarda
  // lo sta leggendo. Chi arriva secondo non trova niente da fare, ed e' giusto.
  avviaTimerSePronto(channel) {
    try {
      const s = streamers.get(channel);
      if (!s) return 0;
      const cfg = s.settings?.overlayTimer;
      if (!cfg || cfg.attivo !== true || cfg.partiDaSolo !== true) return 0;
      const fine = Number(s.settings?.overlayStato?.timer?.fine) || 0;
      if (fine > Date.now()) return fine;
      return this.impostaTimer(channel, cfg.minuti);
    } catch (e) { log.debug('timer da solo:', e?.message || e); return 0; }
  }

  // Riporta un obiettivo a zero — o tutti. E' un'azione dello streamer, non del
  // tempo: un obiettivo che si azzera da solo la notte non e' un obiettivo.
  azzeraGoal(channel, id = '') {
    try {
      const s = streamers.get(channel);
      if (!s) return 0;
      const stato = { ...(s.settings?.overlayStato || {}) };
      const conti = { ...(stato.goals || {}) };
      if (id) conti[id] = 0; else for (const k of Object.keys(conti)) conti[k] = 0;
      stato.goals = conti;
      streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      this.effects?.emit?.(channel, { tipo: 'goal', goals: goalDi(s.settings), conti });
      return 0;
    } catch (e) { return 0; }
  }

  // Risolve "effetto:<comando>" in { url, tipo } usando la libreria Effetti &
  // suoni del canale (così un alert può usare un suono/immagine/video caricati).
  // Il player: la configurazione com'e', piu' l'indirizzo del video scelto fra
  // gli Effetti, risolto qui come le icone. Solo se e' davvero un video.
  _musicaConVideo(channel, m) {
    if (!m || typeof m !== 'object') return null;
    const v = m.video ? this._risolviEffetto(channel, m.video) : null;
    return { ...m, videoUrl: v && v.tipo === 'video' ? v.url : '' };
  }

  // Un effetto della libreria, mandato in overlay come lo manda il tasto
  // «Prova» del pannello: stesso payload (media, volume, durata, posizione).
  _sparaEffetto(channel, ref, ritardoMs = 0) {
    const m = /^effetto:(.+)$/i.exec(String(ref || ''));
    if (!m || !this.effects?.emit || !this.effects?.payload) return false;
    let eff = null;
    try { eff = effectsDb.get(channel, m[1]); } catch { eff = null; }
    if (!eff) return false;
    const manda = () => { try { this.effects.emit(channel, this.effects.payload(channel, eff)); } catch (e) { log.debug('effetto donazione:', e?.message || e); } };
    if (ritardoMs > 0) setTimeout(manda, ritardoMs).unref?.(); else manda();
    return true;
  }

  // L'immagine di chi dona, gia' pronta come payload dell'overlay (donazioni-media):
  // parte un attimo dopo l'avviso, come l'effetto di un'offerta.
  effettoDono(channel, p, ritardoMs = 0) {
    if (!p || !p.url || !this.effects?.emit) return false;
    const manda = () => { try { this.effects.emit(channel, p); } catch (e) { log.debug('effetto di chi dona:', e?.message || e); } };
    if (ritardoMs > 0) setTimeout(manda, ritardoMs).unref?.(); else manda();
    return true;
  }

  _risolviEffetto(channel, ref) {
    const m = /^effetto:(.+)$/i.exec(String(ref || ''));
    if (!m) return null;
    try {
      const eff = effectsDb.get(channel, m[1]);
      if (!eff || !eff.file || !this.effects?.mediaUrl) return null;
      return { url: this.effects.mediaUrl(channel, eff.file), tipo: eff.tipo };
    } catch { return null; }
  }

  _spara(channel, a, kind, conf, vars) {
    const s = this.cfg(channel);
    // font per-alert: se impostato, sovrascrive quello condiviso dello stile
    const stileBase = this._stileAlert(s);
    const stile = conf.font ? { ...stileBase, font: conf.font } : stileBase;
    const payload = {
      tipo: 'alert', kind,
      testo: riempi(conf.testo || DEFAULT_TESTO[kind] || '{user}', vars),
      colore: conf.accento || conf.colore || DEFAULT_ACC[kind],
      volume: conf.volume != null ? Math.max(0, Math.min(100, Number(conf.volume))) : 100,
      durata: Math.max(2000, Math.min(20000, Number(a.durata) || 6000)),
      posizione: a.posizione || 'alto-centro',
      xy: a.xy || null,
      stile,
    };
    // SUONO: un effetto audio caricato (suonoUrl) oppure un preset sintetizzato.
    if (String(conf.suono || '').toLowerCase().startsWith('effetto:')) {
      const sfx = this._risolviEffetto(channel, conf.suono);
      if (sfx && sfx.tipo === 'audio') payload.suonoUrl = sfx.url;    // altrimenti: niente suono
    } else {
      payload.suono = conf.suono === SUONO_MUTO ? '' : (conf.suono || DEFAULT_SUONO[kind] || '');
    }
    // ICONA: la chiave di una icona della libreria, oppure un'immagine caricata.
    payload.icona = conf.icona != null ? String(conf.icona) : undefined;
    if (String(conf.icona || '').toLowerCase().startsWith('effetto:')) {
      const ico = this._risolviEffetto(channel, conf.icona);
      if (ico && ico.tipo === 'immagine') payload.iconaUrl = ico.url;
    }
    // MEDIA: un'immagine o un video caricato, mostrato insieme all'alert.
    const media = this._risolviEffetto(channel, conf.media);
    if (media && (media.tipo === 'immagine' || media.tipo === 'video')) {
      payload.mediaUrl = media.url; payload.mediaTipo = media.tipo;
    }
    this.effects?.emit?.(channel, payload);
    log.debug(`alert ${kind} su #${channel}`);
    return payload;
  }

  // Registra lo stato del widget e lo spinge subito nell'overlay.
  // persisti=false → mostra il valore SENZA salvarlo: serve alla "Prova", così i
  // nomi finti (MarioRossi/GiadaTTV) NON restano nell'overlay dal vivo.
  _aggiornaWidget(channel, id, valore, persisti = true) {
    try {
      const s = streamers.get(channel);
      if (!s) return;
      const val = String(valore || '').slice(0, 40);
      if (persisti) {
        const stato = { ...(s.settings?.overlayStato || {}), [id]: val };
        streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
      }
      const cfg = s.settings?.overlayWidget?.[id];
      this.effects?.emit?.(channel, { tipo: 'widget', id, cfg: cfg || {}, valore: val });
    } catch (e) { log.debug('widget:', e?.message || e); }
  }

  // Messaggio di chat → overlay "chat a schermo".
  onChat(channel, msg) {
    try {
      const s = this.cfg(channel);
      const c = s?.chatOverlay;
      if (!c || !c.attivo) return;
      const testo = String(msg?.text || '').trim();
      if (!testo || testo.startsWith('!')) return;
      this.effects?.emit?.(channel, {
        tipo: 'chat',
        // DA DOVE ARRIVA. E' un dato del messaggio, non un'impostazione: se non
        // viaggia con lui, a schermo una riga di Kick e una di Twitch sono la
        // stessa cosa, e nessuna scelta a valle puo' piu' distinguerle.
        piattaforma: piattaformaDi(msg),
        // la corona del re dei Bit: anche questa e' del messaggio, perche' chi
        // regna puo' cambiare mentre l'overlay e' aperto.
        corona: portaCorona(channel, msg.user, piattaformaDi(msg)),
        user: msg.display || msg.user || '',
        colore: msg?.tags?.color || '',
        testo: testo.slice(0, 200),
        // stemmi: Twitch (stringa "setId/version,…" risolta nell'overlay) + 7TV (url già risolto)
        badges: msg?.tags?.badges || '',
        badge7tv: stemmi.badge7tv(msg?.userId || msg?.tags?.['user-id']),
        // emote NATIVE di Twitch presenti in QUESTO messaggio: nome→url (dal tag "emotes")
        emotiTwitch: emote.twitchInMessaggio(msg?.tags?.emotes, msg?.text),
        posizione: c.posizione || 'basso-sinistra',
        xy: c.xy || null,
        max: Math.max(1, Math.min(20, Number(c.max) || 8)),
        fadeSec: Math.max(0, Math.min(120, Number(c.fadeSec) || 0)),
        stile: this._stileChat(s),
      });
    } catch (e) { log.debug('onChat:', e?.message || e); }
  }

  // Come onChat, ma SENZA il gate "chat overlay attiva" e senza scartare i
  // comandi: serve al PANNELLO CHAT dello Studio Web, che vuole vedere TUTTA la
  // chat in tempo reale (con emote e badge) a prescindere dall'overlay a
  // schermo. L'overlay OBS ignora gli eventi 'chat_raw'. Emette solo se c'è
  // qualcuno collegato via SSE (Studio/overlay aperto), così non risolviamo
  // emote a ogni messaggio quando nessuno ascolta.
  onChatRaw(channel, msg) {
    try {
      if (!this.effects?.hasClients?.(channel)) return;
      const testo = String(msg?.text || '').trim();
      if (!testo) return;
      this.effects.emit(channel, {
        tipo: 'chat_raw',
        piattaforma: piattaformaDi(msg),
        corona: portaCorona(channel, msg.user, piattaformaDi(msg)),
        user: msg.display || msg.user || '',
        colore: msg?.tags?.color || '',
        testo: testo.slice(0, 300),
        badges: msg?.tags?.badges || '',
        badge7tv: stemmi.badge7tv(msg?.userId || msg?.tags?.['user-id']),
        emotiTwitch: emote.twitchInMessaggio(msg?.tags?.emotes, msg?.text),
      });
    } catch (e) { log.debug('onChatRaw:', e?.message || e); }
  }

  // Il TEMA globale letto dall'overlay al caricamento: CSS avanzato, config e
  // stato dei widget persistenti.
  tema(channel) {
    const s = this.cfg(channel) || {};
    const w = (s.overlayWidget && typeof s.overlayWidget === 'object') ? s.overlayWidget : {};
    // le icone caricate arrivano all'overlay gia' risolte in indirizzo: la
    // pagina non sa niente della libreria Effetti, e non deve saperlo
    const conIcone = {};
    for (const [k, cfg] of Object.entries(w)) {
      if (!cfg || typeof cfg !== 'object') { conIcone[k] = cfg; continue; }
      const rif = cfg.stile && cfg.stile.icona;
      const ico = String(rif || '').toLowerCase().startsWith('effetto:') ? this._risolviEffetto(channel, rif) : null;
      conIcone[k] = (ico && ico.tipo === 'immagine') ? { ...cfg, iconaUrl: ico.url } : cfg;
    }
    const fontMiei = (Array.isArray(s.fontPersonali) ? s.fontPersonali : [])
      .filter((f) => f && f.nome && f.file)
      .map((f) => ({ nome: f.nome, url: this.effects?.mediaUrl ? this.effects.mediaUrl(channel, f.file) : '' }))
      .filter((f) => f.url);
    return {
      css: String(s.overlayCss || '').slice(0, 8000),
      fontPersonali: fontMiei,
      widget: conIcone,
      goals: goalDi(s),
      conti: contiGoal(s),
      musica: this._musicaConVideo(channel, s.overlayMusica),
      timer: (s.overlayTimer && typeof s.overlayTimer === 'object') ? s.overlayTimer : null,
      pubblicita: this._pubblicitaInScena(channel, s),
      treno: (s.overlayTreno && typeof s.overlayTreno === 'object') ? s.overlayTreno : null,
      bit: (s.overlayBit && typeof s.overlayBit === 'object') ? s.overlayBit : null,
      boss: (s.overlayBoss && typeof s.overlayBoss === 'object') ? s.overlayBoss : null,
      arena: (s.overlayArena && typeof s.overlayArena === 'object') ? s.overlayArena : null,
      scritta: (s.overlayScritta && typeof s.overlayScritta === 'object') ? s.overlayScritta : null,
      etichetta: (s.overlayEtichetta && typeof s.overlayEtichetta === 'object') ? s.overlayEtichetta : null,
      muro: (s.overlayMuro && typeof s.overlayMuro === 'object') ? s.overlayMuro : null,
      // I CARTELLI arrivano all'overlay con l'immagine gia' risolta in
      // indirizzo, come le icone dei widget: la pagina non sa niente della
      // libreria Effetti, e non deve saperlo.
      cartelli: (Array.isArray(s.overlayCartelli) ? s.overlayCartelli : []).map((c) => {
        if (!c || c.tipo !== 'immagine' || !c.effetto) return c;
        const eff = this._risolviEffetto(channel, c.effetto);
        return (eff && eff.tipo === 'immagine') ? { ...c, url: eff.url } : c;
      }),
      stato: (s.overlayStato && typeof s.overlayStato === 'object') ? s.overlayStato : {},
    };
  }

  // Il conto alla pubblicita' come lo legge l'overlay: la sua configurazione,
  // coi titoli di base nella lingua della chat se lo streamer non li ha
  // scritti, e lo stato di adesso (lo scrive il bot, vedi _pubInScena). Uno
  // stato con i tempi gia' passati vale come niente.
  _pubblicitaInScena(channel, s) {
    const c = s.overlayPubblicita;
    if (!c || typeof c !== 'object') return null;
    const [t, tp] = TITOLI_PUBBLICITA[linguaChat(channel)] || TITOLI_PUBBLICITA.it;
    const st = statoVivo.leggi(channel, 'pubblicita') || {};
    const ora = Date.now();
    return {
      ...c,
      titolo: c.titolo || t,
      titoloPausa: c.titoloPausa || tp,
      stato: { prossima: Number(st.prossima) > ora ? Number(st.prossima) : 0, pausaFino: Number(st.pausaFino) > ora ? Number(st.pausaFino) : 0 },
    };
  }

  // Prova dal pannello.
  prova(channel, kind = 'follow') {
    const s = this.cfg(channel) || {};
    if (kind === 'chat') {
      const c = s.chatOverlay || {};
      const st = this._stileChat(s);
      [{ user: 'lucaplays', colore: '#ff4d4d', testo: 'ciao a tutti! 👋' },
       { user: 'giada_ttv', colore: '#48b0ff', testo: 'che bella live oggi' },
       { user: 'marco99', colore: '#38d39f', testo: 'GG! 🔥' }].forEach((f, i) => setTimeout(() =>
        this.effects?.emit?.(channel, { tipo: 'chat', ...f, posizione: c.posizione || 'basso-sinistra', xy: c.xy || null,
          max: Math.max(1, Math.min(20, Number(c.max) || 8)), fadeSec: Math.max(0, Math.min(120, Number(c.fadeSec) || 0)), stile: st }), i * 500));
      return true;
    }
    if (kind === 'ultimoFollower' || kind === 'ultimoSub') {
      // Prova: mostra un nome finto SENZA salvarlo (niente placeholder nel live)
      this._aggiornaWidget(channel, kind, kind === 'ultimoSub' ? 'GiadaTTV' : 'MarioRossi', false);
      return true;
    }
    const a = s.alerts || {};
    const conf = a[kind] || {};
    this._spara(channel, a, kind, conf, { user: 'MarioRossi', mesi: 3, bits: 500, kicks: 500, viewers: 42, importo: formattaImporto(5, s.donazioni?.valuta || 'EUR'), messaggio: 'grande live!' });
    return true;
  }
}
