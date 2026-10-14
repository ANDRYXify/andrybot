// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE IMPOSTAZIONI DI MODERAZIONE, normalizzate in un posto solo.
//
// Perché stanno qui e non dentro la rotta. Le due sezioni — antispam e anti-bot
// — non si aggiornano campo per campo: si RICOSTRUISCONO da capo a ogni
// salvataggio. Va benissimo finché chi salva manda tutto; il giorno che un
// pannello ne manda dieci su ventisei, gli altri sedici tornano al valore di
// partenza senza che nessuno lo dica.
//
// È successo davvero: il pannello mandava diciotto campi su ventisei, e ogni
// «Salva anti-bot» riportava ai valori di fabbrica la soglia, il timeout, l'età
// minima e altri quattro. Nessuno se ne accorgeva perché i valori di fabbrica
// erano quelli che quasi tutti avevano.
//
// La regola, in una riga: **il salvato sta sotto, quello che arriva sta sopra**.
// Un salvataggio parziale resta parziale. Un campo si cambia solo nominandolo,
// e una lista si svuota mandandola vuota — non dimenticandola.
//
// Sono funzioni pure: prendono il vecchio e il nuovo, ritornano l'oggetto
// completo. Così la regola si può provare senza accendere un server.

import { LIVELLI } from '../features/livelli.js';

const AZIONI = ['ban', 'timeout', 'segnala'];
const LIVELLI_LINK = ['tutti', 'sub', 'vip', 'mod'];
const CHAT_AZIONI = ['elimina', 'segnala'];

const num = (v, min, max, def) => Math.min(max, Math.max(min, Math.round(Number(v)) || def));

// I nomi degli account: minuscoli, senza chiocciola, solo quelli che Twitch
// potrebbe davvero avere, al massimo NOMI_MAX. Lo stesso tetto vale quando un
// nome si aggiunge da solo (conNome in src/features/antibot.js), cosi' il
// salvataggio non taglia mai un nome che l'aggiunta aveva accettato.
// Un nome di Kick si scrive «kick:nome» (docs/SCUDO.md, «Su Kick»): lo stesso
// nome sulle due piattaforme e' di due persone diverse.
export const NOMI_MAX = 200;
export const nomeAccount = (x) => {
  const n = String(x ?? '').toLowerCase().trim().replace(/^@/, '').replace(/^kick:\s*@?/, 'kick:');
  return /^(kick:)?[a-z0-9_]{2,30}$/.test(n) ? n : '';
};
const nomi = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/))
  .map(nomeAccount).filter(Boolean)
  .slice(0, NOMI_MAX);

export function normalizzaAntispam(vecchio = {}, arrivato = {}) {
  const a = { ...(vecchio || {}), ...(arrivato || {}) };
  return {
    attivo: !!a.attivo,
    link: a.link !== false,
    linkTier: LIVELLI_LINK.includes(a.linkTier) ? a.linkTier : 'sub',
    whitelist: Array.isArray(a.whitelist)
      ? a.whitelist.map((d) => String(d).trim().toLowerCase().slice(0, 100)).filter(Boolean).slice(0, 30)
      : [],
    ripetizioni: a.ripetizioni !== false,
    maiuscole: a.maiuscole !== false,
    menzioni: a.menzioni !== false,
    flood: a.flood !== false,
    simboli: !!a.simboli,
    lungo: !!a.lungo,
    lungoMax: num(a.lungoMax, 50, 500, 350),
    emoji: !!a.emoji,
    emojiMax: num(a.emojiMax, 1, 50, 8),
    timeoutRecidivi: a.timeoutRecidivi !== false,
    avvisa: a.avvisa !== false,
  };
}

// GLI AVVISI DELLO SCUDO allo streamer (docs/INCIDENTI.md, «Gli avvisi»): da
// che livello, e dove. Telegram in privato si', la mail per il rapporto, che si
// legge con calma. «Calma» non e' una soglia: vorrebbe dire avvisare sempre.
export const SOGLIA_DI_SERIE = 'attacco';
export const LIVELLI_AVVISO = LIVELLI.filter((l) => l !== 'calma');
export const AVVISI_DI_SERIE = Object.freeze({ soglia: SOGLIA_DI_SERIE, telegram: true, mail: false, rapportoTelegram: true, rapportoMail: true, raid: true });

export function avvisiDi(cfg = {}) {
  const a = cfg && typeof cfg.avvisiScudo === 'object' && cfg.avvisiScudo ? cfg.avvisiScudo : {};
  const si = (k) => (a[k] === undefined ? AVVISI_DI_SERIE[k] : a[k] === true);
  return {
    soglia: LIVELLI_AVVISO.includes(a.soglia) ? a.soglia : SOGLIA_DI_SERIE,
    telegram: si('telegram'), mail: si('mail'),
    rapportoTelegram: si('rapportoTelegram'), rapportoMail: si('rapportoMail'), raid: si('raid'),
  };
}

export function normalizzaAntibot(vecchio = {}, arrivato = {}) {
  const a = { ...(vecchio || {}), ...(arrivato || {}) };
  return {
    attivo: !!a.attivo,
    raffica: a.raffica !== false,
    rafficaQuanti: num(a.rafficaQuanti, 3, 100, 10),
    rafficaSecondi: num(a.rafficaSecondi, 5, 300, 30),
    rafficaBanna: !!a.rafficaBanna,
    nomiBot: a.nomiBot !== false,
    listaAuto: a.listaAuto !== false,
    azione: AZIONI.includes(a.azione) ? a.azione : 'ban',
    timeoutSec: num(a.timeoutSec, 60, 1209600, 1209600),
    esenti: nomi(a.esenti),
    extra: nomi(a.extra),
    controllaAccount: !!a.controllaAccount,
    soglia: num(a.soglia, 30, 100, 70),
    etaMinGiorni: num(a.etaMinGiorni, 0, 90, 3),
    chatNuovi: !!a.chatNuovi,
    chatMinOre: num(a.chatMinOre, 1, 720, 24),
    chatNuoviAzione: CHAT_AZIONI.includes(a.chatNuoviAzione) ? a.chatNuoviAzione : 'elimina',
    avvisa: a.avvisa !== false,
    assettoAuto: a.assettoAuto !== false,
    bloccoSulNascere: a.bloccoSulNascere !== false,
    coroQuanti: num(a.coroQuanti, 3, 20, 4),
    togliFollow: a.togliFollow !== false,
    taciFollow: a.taciFollow !== false,
    aVuoto: a.aVuoto === true,
    modo: ['prudente', 'bilanciata', 'aggressiva'].includes(a.modo) ? a.modo : 'bilanciata',
    presenze: a.presenze !== false,
    // un oggetto arrivato a meta' si completa con quello che c'era
    avvisiScudo: avvisiDi({ avvisiScudo: { ...(vecchio?.avvisiScudo || {}), ...(arrivato?.avvisiScudo || {}) } }),
  };
}
