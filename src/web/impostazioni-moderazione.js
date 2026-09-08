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

const AZIONI = ['ban', 'timeout', 'segnala'];
const LIVELLI_LINK = ['tutti', 'sub', 'vip', 'mod'];
const CHAT_AZIONI = ['elimina', 'segnala'];

const num = (v, min, max, def) => Math.min(max, Math.max(min, Math.round(Number(v)) || def));

// I nomi degli account: minuscoli, senza chiocciola, solo quelli che Twitch
// potrebbe davvero avere, al massimo duecento.
const nomi = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/))
  .map((x) => String(x).toLowerCase().replace(/^@/, '').trim())
  .filter((x) => /^[a-z0-9_]{2,30}$/.test(x))
  .slice(0, 200);

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

export function normalizzaAntibot(vecchio = {}, arrivato = {}) {
  const a = { ...(vecchio || {}), ...(arrivato || {}) };
  return {
    attivo: !!a.attivo,
    raffica: a.raffica !== false,
    rafficaQuanti: num(a.rafficaQuanti, 3, 100, 10),
    rafficaSecondi: num(a.rafficaSecondi, 5, 300, 30),
    rafficaChiudiChat: a.rafficaChiudiChat !== false,
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
    aVuoto: a.aVuoto === true,
    modo: ['prudente', 'bilanciata', 'aggressiva'].includes(a.modo) ? a.modo : 'bilanciata',
    presenze: a.presenze !== false,
  };
}
