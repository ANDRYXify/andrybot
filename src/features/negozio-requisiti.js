// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I REQUISITI DI UN ARTICOLO DEL NEGOZIO: si leggono da dove stanno davvero.
//
// Un requisito non e' un numero nostro accanto a quello vero. I mesi di
// abbonamento sono quelli che Twitch scrive nel messaggio (il badge), i Bit sono
// quelli della classifica di Twitch (lo stesso numero di «!bit sempre»), il tier
// e il follow li dice Twitch al momento; ore, serie e ruolo sono cose che il bot
// conta gia'. Nessuna seconda contabilita' che col tempo si scolla dalla prima.
//
// Il difetto che qui non deve poter esistere: UN FATTO CHE NON SAPPIAMO NON VALE
// «SI'» E NON VALE «NO». Se Twitch tace (un permesso mancante, una chiamata
// caduta) la lettura torna «non lo so», e un requisito che non si sa non fa
// comprare: meglio un «non riesco a verificarlo» che un acquisto dato a chi non
// doveva. Ma non si dice nemmeno «non hai abbastanza Bit» a chi magari ne ha:
// si dice che non si e' potuto guardare.
//
// Le letture che parlano con Twitch arrivano da fuori (`fonti`), cosi' la regola
// si prova senza rete e chi legge da Twitch sta in un posto solo (fontiTwitch).
import { watchtime, presenze } from '../db.js';
import * as bit from './bit.js';

export const TIPI = ['mesi', 'tier', 'bit', 'ore', 'serie', 'follower', 'ruolo'];

// Dove cade ogni soglia. Il follow puo' valere da zero giorni: «segue il canale».
// Il ruolo e' una scala corta: 1 = VIP (o moderatore), 2 = moderatore.
export const LIMITI = {
  mesi: [1, 120], tier: [1, 3], bit: [1, 10_000_000], ore: [1, 100_000],
  serie: [1, 1000], follower: [0, 10_000], ruolo: [1, 2],
};

// I requisiti come li salva il negozio: uno per tipo, soglia intera e dentro i
// limiti. Uno che non si capisce si scarta, non si indovina.
export function normRequisiti(lista) {
  const visti = new Map();
  for (const r of Array.isArray(lista) ? lista : []) {
    const tipo = String(r?.tipo || '');
    if (!TIPI.includes(tipo)) continue;
    const [lo, hi] = LIMITI[tipo];
    const n = Math.round(Number(r?.soglia));
    if (!Number.isFinite(n)) continue;
    visti.set(tipo, { tipo, soglia: Math.min(hi, Math.max(lo, n)) });
  }
  return TIPI.filter((t) => visti.has(t)).map((t) => visti.get(t));
}

const suTwitch = (msg) => !msg?.piattaforma || msg.piattaforma === 'twitch';
const NON_SO = Object.freeze({ sa: false });
const so = (valore) => ({ sa: true, valore: Math.max(0, Math.trunc(Number(valore) || 0)) });

// I mesi di abbonamento dal badge: Twitch li scrive in ogni messaggio
// («badge-info=subscriber/14»), e sono i mesi in tutto, anche non di fila. Chi
// non e' abbonato adesso non ha il badge, e per «abbonato da almeno N mesi»
// vale zero. Fuori da Twitch il badge non esiste: non lo sappiamo.
export function mesiDalBadge(msg) {
  if (!suTwitch(msg) || !msg?.tags || typeof msg.tags !== 'object') return NON_SO;
  const info = String(msg.tags['badge-info'] || '');
  const m = /(?:^|,)(?:subscriber|founder)\/(\d+)/.exec(info);
  if (m) return so(m[1]);
  const badge = String(msg.tags.badges || '');
  const abbonato = msg.tags.subscriber === '1' || /(?:^|,)(?:subscriber|founder)\//.test(badge);
  return abbonato ? NON_SO : so(0);
}

// A che gradino sta chi scrive: lo dice il messaggio stesso.
export const rangoDi = (msg) => (msg?.isBroadcaster || msg?.isMod ? 2 : msg?.isVip ? 1 : 0);

// La lettura di UN requisito per chi ha scritto `msg`. Torna { sa, valore }.
export async function leggi(tipo, { canale, msg, fonti = {}, ora = Date.now() } = {}) {
  const ch = String(canale || '').toLowerCase();
  const login = String(msg?.user || '').toLowerCase();
  const id = String(msg?.userId || '');
  try {
    switch (tipo) {
      case 'mesi': return mesiDalBadge(msg);
      case 'ruolo': return so(rangoDi(msg));
      case 'ore': return so(Math.floor((Number(watchtime.get(ch, login)) || 0) / 3600));
      case 'serie': return so(Number(presenze.get(ch, login)?.serie) || 0);
      case 'tier': {
        if (!suTwitch(msg) || !id || !fonti.tier) return NON_SO;
        const t = await fonti.tier(ch, id);
        return t === null || t === undefined ? NON_SO : so(t);
      }
      case 'bit': {
        if (!suTwitch(msg) || !fonti.bit) return NON_SO;
        const b = await fonti.bit(ch, login, id);
        return b === null || b === undefined ? NON_SO : so(b);
      }
      case 'follower': {
        if (!suTwitch(msg) || !id || !fonti.followerDal) return NON_SO;
        const dal = await fonti.followerDal(ch, id);
        if (dal === null || dal === undefined) return NON_SO;
        // -1 vuol dire «non segue»: e' diverso da «segue da oggi», che vale 0.
        return Number(dal) > 0 ? so(Math.floor((ora - Number(dal)) / 86400_000)) : { sa: true, valore: -1 };
      }
      default: return NON_SO;
    }
  } catch { return NON_SO; }
}

// 'ok' | 'no' | 'nonSo'.
export function esito(req, lettura) {
  if (!lettura?.sa) return 'nonSo';
  if (req.tipo === 'follower') return lettura.valore >= 0 && lettura.valore >= req.soglia ? 'ok' : 'no';
  return lettura.valore >= req.soglia ? 'ok' : 'no';
}

// Prima quelli che si leggono in casa (il messaggio, le ore, la serie), poi
// quelli che chiedono a Twitch: se uno di casa manca, Twitch non si disturba.
const DI_CASA = new Set(['mesi', 'ruolo', 'ore', 'serie']);
const inOrdine = (lista) => [...(lista || [])].sort((a, b) => (DI_CASA.has(b.tipo) ? 1 : 0) - (DI_CASA.has(a.tipo) ? 1 : 0));

// Tutti i requisiti di un articolo, letti adesso. Torna il primo che non vale
// («no» prima di «nonSo»: se uno manca di sicuro, e' quello da dire), o null se
// valgono tutti.
export async function verifica(requisiti, ambiente) {
  let dubbio = null;
  for (const req of inOrdine(requisiti)) {
    const l = await leggi(req.tipo, ambiente);
    const e = esito(req, l);
    if (e === 'no') return { esito: 'no', req, valore: l.valore };
    if (e === 'nonSo' && !dubbio) dubbio = { esito: 'nonSo', req };
  }
  return dubbio;
}

// LE LETTURE CHE PARLANO CON TWITCH, in un posto solo.
//
// I Bit sono quelli della classifica di Twitch «da sempre», la stessa che
// risponde a «!bit sempre» (bit.classifica, con la sua memoria di pochi minuti).
// Se la persona c'e', il numero e' quello. Se non c'e' e la classifica e' tutta
// (meno righe di quante se ne chiedono), non ha mai cheerato: zero. Se non c'e' e
// la classifica e' piena, si chiede a Twitch quella persona sola.
export function fontiTwitch(helix) {
  return {
    tier: async (canale, userId) => (helix?.tierDi ? helix.tierDi(canale, userId) : null),
    followerDal: async (canale, userId) => (helix?.seguitoDal ? helix.seguitoDal(canale, userId) : null),
    bit: async (canale, login, userId) => {
      const righe = await bit.classifica(helix, canale, { periodo: 'all' });
      if (Array.isArray(righe)) {
        const mia = righe.find((r) => r.login === login);
        if (mia) return mia.bit;
        if (righe.length < bit.QUANTI) return 0;
      }
      if (!userId || !helix?.bitDi) return null;
      return helix.bitDi(canale, userId);
    },
  };
}
