// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// CHI TI SEGUE, E CHI SEMBRA UNA MACCHINA. Il giudizio sulla lista dei
// follower: una funzione pura, che non chiede niente a Twitch e non scrive
// niente. Riceve le righe della lista e i fatti del canale, e dice per ognuno
// un livello e i motivi. Il modello per esteso: docs/FOLLOWER.md.
//
// I LIVELLI, dal piu' forte. Il primo che vale decide.
//
//   protetto   non si tocca in massa, mai: l'hai detto tu, sei tu, un bot di
//              servizio, in «Non toccare mai», moderatore, VIP, abbonato, di
//              casa (chi scrive qui da mesi)
//   noto       il nome e' in «Blocca sempre», nella lista pubblica dei bot, o
//              ha la forma dei bot promozionali
//   probabile  nato insieme ad altri e arrivato insieme ad altri (la
//              fabbrica), riconosciuto da piu' canali, fermato dallo scudo qui,
//              o il punteggio dello scudo direbbe di agire
//   dubbio     uno solo di quei segnali di lista, sospettato in un attacco, o il
//              punteggio direbbe di guardare
//   pulito     il resto
//
// PERCHE' «NATI INSIEME E ARRIVATI INSIEME». Un follow-bot di fabbrica e' un
// account creato in serie con altri, minuti l'uno dall'altro, e usato in serie
// con loro. Le due cose prese da sole capitano anche alle persone: un raid
// porta dieci follow in un minuto, e in una lista grande qualche account e'
// nato lo stesso giorno di un altro. Prese insieme sono due fatti indipendenti,
// e per le persone il caso le mette insieme quasi mai. Per questo una sola fa
// «dubbio», tutte e due fanno «probabile».
//
// LE SOGLIE NON SONO NUMERI SCELTI: si ricavano dalla lista. Se le date fossero
// sparse a caso, in una finestra larga W ci aspetteremmo lambda = (N-1)·W/arco
// altri account. La soglia e' il numero piu' piccolo k per cui, su tutta la
// lista, il caso ne produrrebbe meno di uno: N·P(Poisson(lambda) >= k-1) < 1.
// Una lista piccola ha soglie basse, una grande le alza da sola. L'arco e' il
// doppio dello scarto interquartile (la meta' centrale della lista), cosi' i
// bot stessi, finche' non sono la maggioranza, non lo stringono. Due tetti
// tengono la soglia dentro il buon senso: venticinque account nati negli
// stessi dieci minuti, o trenta follow nello stesso minuto, non li fa il caso.
import { punteggio, nomeGenerato, SOGLIA_SEGNALA } from './punteggio.js';

export const LIVELLI_FOLLOWER = ['protetto', 'noto', 'probabile', 'dubbio', 'pulito'];
const MIN = 60_000;
const GIORNO = 86_400_000;
export const FINESTRA_GEMELLI = 10 * MIN;      // nati entro cinque minuti l'uno dall'altro
export const FINESTRA_ONDATA = MIN;            // arrivati entro trenta secondi
export const GEMELLI_MIN = 4, GEMELLI_TETTO = 25;
export const ONDATA_MIN = 5, ONDATA_TETTO = 30;
export const ONDATA_STACCO = MIN;              // due follow piu' lontani di cosi' sono due ondate

// P(X >= m) per X di Poisson(lambda), sommando i termini fino a m-1.
export function codaPoisson(lambda, m) {
  if (m <= 0) return 1;
  if (!(lambda > 0)) return 0;
  let termine = Math.exp(-lambda), somma = termine;
  for (let j = 1; j < m; j++) { termine *= lambda / j; somma += termine; }
  return Math.max(0, 1 - somma);
}

// La soglia per una lista di n valori (millisecondi) e una finestra larga w.
export function sogliaDi(valori, w, { minimo, tetto }) {
  const v = valori.filter((x) => x > 0).sort((a, b) => a - b);
  const n = v.length;
  if (n < 2) return minimo;
  const q = (p) => v[Math.min(n - 1, Math.floor(p * (n - 1)))];
  const arco = 2 * (q(0.75) - q(0.25));
  if (!(arco > 0)) return tetto;
  const lambda = ((n - 1) * w) / arco;
  for (let k = minimo; k < tetto; k++) if (n * codaPoisson(lambda, k - 1) < 1) return k;
  return tetto;
}

// Quanti valori stanno entro w/2 da ciascuno (lui compreso). Due puntatori su
// una copia ordinata: lineare dopo l'ordinamento, anche con centomila righe.
function vicini(righe, campo, w) {
  const fuori = new Map();
  const v = righe.filter((r) => Number(r[campo]) > 0).map((r) => ({ id: r.user_id, t: Number(r[campo]) })).sort((a, b) => a.t - b.t);
  let da = 0, a = 0;
  for (let i = 0; i < v.length; i++) {
    while (v[da].t < v[i].t - w / 2) da++;
    if (a < i) a = i;
    while (a + 1 < v.length && v[a + 1].t <= v[i].t + w / 2) a++;
    fuori.set(v[i].id, a - da + 1);
  }
  return fuori;
}

// I segnali che si vedono solo guardando la lista intera. Si contano anche
// quelli che non seguono piu': nato insieme e arrivato insieme resta un fatto
// quando i fratelli se ne vanno, o quando li hai tolti tu. Contati solo fra
// chi resta, dopo aver tolto undici bot di una fabbrica il dodicesimo
// tornerebbe pulito.
export function segnaliLista(righe) {
  const gemelli = vicini(righe.filter((r) => Number(r.creato) > 0), 'creato', FINESTRA_GEMELLI);
  const ondata = vicini(righe, 'seguito', FINESTRA_ONDATA);
  const soglie = {
    gemelli: sogliaDi(righe.map((r) => Number(r.creato)), FINESTRA_GEMELLI, { minimo: GEMELLI_MIN, tetto: GEMELLI_TETTO }),
    ondata: sogliaDi(righe.map((r) => Number(r.seguito)), FINESTRA_ONDATA, { minimo: ONDATA_MIN, tetto: ONDATA_TETTO }),
  };
  return { gemelli, ondata, soglie };
}

// Il profilo come lo vuole il motore del punteggio, dai fatti che teniamo
// (la data di nascita, e se foto e bio sono quelle di base: mai la foto o la bio).
const utenteDa = (r) => (Number(r.creato) > 0 ? {
  created_at: new Date(Number(r.creato)).toISOString(),
  profile_image_url: r.foto_base ? 'user-default-pictures' : 'foto',
  description: r.bio_vuota ? '' : 'bio',
} : null);

// Il giudizio di una riga. `ctx` porta i fatti del canale, tutti gia' letti:
//   canale, esenti (Set), extra (Set), servizio (Set), diCasa (soglia),
//   conferme (soglia della rete), nomeNoto(login), nomePattern(login),
//   rete(login), precedenti (Map login -> {colpito, sospettato}),
//   segnali (da segnaliLista), ora.
// Torna { livello, motivi: [{k, ...}], chiuso }. I motivi sono codici: il
// pannello e il CSV li dicono nella lingua di chi legge.
export function giudizioFollower(r, ctx) {
  const login = String(r.login || '').toLowerCase();
  const chiuso = Number(r.creato) === -1;
  const fuori = (livello, motivi) => ({ livello, motivi, chiuso });

  if (r.stato === 'apposto') return fuori('protetto', [{ k: 'apposto' }]);
  if (login && login === ctx.canale) return fuori('protetto', [{ k: 'tu' }]);
  if (ctx.servizio?.has(login)) return fuori('protetto', [{ k: 'servizio' }]);
  if (ctx.esenti?.has(login)) return fuori('protetto', [{ k: 'esente' }]);
  if (r.ruolo === 'mod' || r.ruolo === 'vip' || r.ruolo === 'sub') return fuori('protetto', [{ k: r.ruolo }]);
  if ((Number(r.fiducia) || 0) >= ctx.diCasa) return fuori('protetto', [{ k: 'casa' }]);

  if (ctx.extra?.has(login)) return fuori('noto', [{ k: 'bloccasempre' }]);
  if (ctx.nomeNoto?.(login)) return fuori('noto', [{ k: 'lista' }]);
  if (ctx.nomePattern?.(login)) return fuori('noto', [{ k: 'nomebot' }]);

  const motivi = [];
  const s = ctx.segnali || { gemelli: new Map(), ondata: new Map(), soglie: { gemelli: GEMELLI_TETTO, ondata: ONDATA_TETTO } };
  const g = s.gemelli.get(r.user_id) || 0;
  const o = s.ondata.get(r.user_id) || 0;
  const nati = g >= s.soglie.gemelli, arrivati = o >= s.soglie.ondata;
  const reteN = Number(ctx.rete?.(login)) || 0;
  const pr = ctx.precedenti?.get(login) || { colpito: 0, sospettato: 0 };
  const p = punteggio({
    utente: utenteDa(r),
    nomeGenerato: nomeGenerato(login),
    reteCanali: reteN,
    sconto: Number(r.fiducia) || 0,
  });

  if (nati && arrivati) motivi.push({ k: 'fabbrica', gemelli: g, ondata: o });
  else if (nati) motivi.push({ k: 'gemelli', gemelli: g });
  else if (arrivati) motivi.push({ k: 'ondata', ondata: o });
  if (reteN >= ctx.conferme) motivi.push({ k: 'rete', n: reteN });
  if (pr.colpito) motivi.push({ k: 'fermato' });
  else if (pr.sospettato) motivi.push({ k: 'sospettato' });
  const ora = Number(ctx.ora) || Date.now();
  if (Number(r.creato) > 0) {
    const giorni = (ora - Number(r.creato)) / GIORNO;
    if (giorni < 1) motivi.push({ k: 'oggi' });
    else if (giorni < 14) motivi.push({ k: 'giovane', giorni: Math.floor(giorni) });
  }
  if (r.foto_base) motivi.push({ k: 'foto' });
  if (r.bio_vuota) motivi.push({ k: 'bio' });
  if (nomeGenerato(login)) motivi.push({ k: 'nomegenerato' });
  if (chiuso) motivi.push({ k: 'chiuso' });

  const forte = (nati && arrivati) || reteN >= ctx.conferme || !!pr.colpito || p.agisci;
  const debole = nati || arrivati || !!pr.sospettato || p.punti >= SOGLIA_SEGNALA;
  // Chi trasmette ed e' affiliato o partner ha passato le soglie di Twitch
  // (follower, ore, giorni, spettatori): una fabbrica non ci arriva. Puo'
  // essere guardato, non messo fra i probabili.
  const streamer = r.tipo === 'affiliate' || r.tipo === 'partner';
  if (streamer) motivi.push({ k: 'streamer' });
  if (forte && !streamer) return fuori('probabile', motivi);
  if (forte || debole) return fuori('dubbio', motivi);
  return fuori('pulito', chiuso ? [{ k: 'chiuso' }] : []);
}

// Le ondate trovate nella lista, fatte SOLO di chi ha il motivo «ondata»: un
// gruppo mostrato e' fatto di account che, aperti uno per uno, dicono di essere
// arrivati in un'ondata, e viceversa. Si raggruppano quelli a meno di un minuto
// l'uno dall'altro. Per ognuna quanti erano, quanti nati insieme, quanti
// protetti; chi se n'e' gia' andato non si conta (un'ondata ripulita sparisce).
// Le piu' grandi venti, dalla piu' recente.
export function ondateDi(viste, segnali, { quante = 20 } = {}) {
  const v = viste
    .filter((x) => !x.uscito && Number(x.seguito) > 0 && (segnali.ondata.get(x.user_id) || 0) >= segnali.soglie.ondata)
    .sort((a, b) => a.seguito - b.seguito);
  const gruppi = [];
  let g = null;
  for (const x of v) {
    if (g && x.seguito - g.fine <= ONDATA_STACCO) { g.fine = x.seguito; g.chi.push(x); }
    else { g = { inizio: x.seguito, fine: x.seguito, chi: [x] }; gruppi.push(g); }
  }
  return gruppi
    .filter((x) => x.chi.length >= segnali.soglie.ondata)
    .map((x) => ({
      inizio: x.inizio, fine: x.fine, quanti: x.chi.length,
      nati: x.chi.filter((c) => (segnali.gemelli.get(c.user_id) || 0) >= segnali.soglie.gemelli).length,
      protetti: x.chi.filter((c) => c.livello === 'protetto').length,
    }))
    .sort((a, b) => b.quanti - a.quanti)
    .slice(0, quante)
    .sort((a, b) => b.inizio - a.inizio);
}

// ── Il filtro ───────────────────────────────────────────────────────────────
// Una lista sola di regole, per il pannello, il CSV e il lavoro in massa: chi
// vedi filtrato e' chi viene toccato, per costruzione.
export const LIVELLI_FILTRO = ['tutti', ...LIVELLI_FOLLOWER, 'chiusi', 'usciti', 'tolti'];
export const ORDINI = ['recenti', 'vecchi', 'nati', 'nome'];

export function filtroDa(q = {}) {
  const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const ondata = String(q.ondata || '').match(/^(\d+)-(\d+)$/);
  return {
    livello: LIVELLI_FILTRO.includes(q.livello) ? q.livello : 'tutti',
    cerca: String(q.cerca || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30),
    eta: [1, 7, 30, 365].includes(num(q.eta)) ? num(q.eta) : 0,
    dal: num(q.dal), al: num(q.al),
    foto: q.foto === true || q.foto === '1' || q.foto === 'true',
    ondata: ondata ? { da: Number(ondata[1]), a: Number(ondata[2]) } : null,
    ordine: ORDINI.includes(q.ordine) ? q.ordine : 'recenti',
  };
}

export function passaFiltro(x, f, ora = Date.now()) {
  // Usciti e tolti sono chi non segue piu': gli unici filtri che li mostrano.
  // Chi e' stato tolto da qui e' uscito nel momento stesso (follower.js).
  const fuori = f.livello === 'usciti' || f.livello === 'tolti';
  if (fuori !== !!x.uscito) return false;
  if (f.livello === 'tolti' && x.stato !== 'tolto' && x.stato !== 'bloccato') return false;
  if (f.livello === 'chiusi' && !x.chiuso) return false;
  if (LIVELLI_FOLLOWER.includes(f.livello) && x.livello !== f.livello) return false;
  if (f.cerca && !String(x.login || '').includes(f.cerca)) return false;
  if (f.eta && !(Number(x.creato) > 0 && ora - Number(x.creato) < f.eta * GIORNO)) return false;
  if (f.dal && !(Number(x.seguito) >= f.dal)) return false;
  if (f.al && !(Number(x.seguito) <= f.al)) return false;
  if (f.foto && !x.foto_base) return false;
  if (f.ondata && !(x.seguito >= f.ondata.da && x.seguito <= f.ondata.a)) return false;
  return true;
}

const ORDINA = {
  recenti: (a, b) => b.seguito - a.seguito,
  vecchi: (a, b) => a.seguito - b.seguito,
  nati: (a, b) => (Number(b.creato) || 0) - (Number(a.creato) || 0),
  nome: (a, b) => String(a.login).localeCompare(String(b.login)),
};
export const filtra = (viste, f, ora) => viste.filter((x) => passaFiltro(x, f, ora)).sort(ORDINA[f.ordine] || ORDINA.recenti);

// I conti per livello, su chi segue adesso; usciti e tolti a parte.
export function contiDi(viste) {
  const c = { tutti: 0, protetto: 0, noto: 0, probabile: 0, dubbio: 0, pulito: 0, chiusi: 0, usciti: 0, tolti: 0 };
  for (const x of viste) {
    if (x.uscito) { c.usciti++; if (x.stato === 'tolto' || x.stato === 'bloccato') c.tolti++; continue; }
    c.tutti++;
    c[x.livello]++;
    if (x.chiuso) c.chiusi++;
  }
  return c;
}

// ── Chi si puo' toccare ─────────────────────────────────────────────────────
// La regola del lavoro in massa, una sola per il conto che vede lo streamer e
// per il lavoro che parte: i protetti mai, gli account chiusi no (Twitch non
// li trova), chi non segue piu' no (non c'e' niente da togliere), e ogni
// azione solo su chi e' nello stato giusto per lei. E chi e' PULITO non si
// toglie e non si blocca in massa: un filtro «tutti» con un numero scritto
// sarebbe un clic per togliere il follow a persone vere. Uno per uno si puo'.
// Allo stesso modo «a posto» in massa e' la risposta a «da guardare», e solo
// a quello: sul filtro «tutti» proteggerebbe con un numero anche i bot noti.
export const AZIONI_FOLLOWER = ['togli', 'blocca', 'sblocca', 'apposto'];
export function azionabile(x, azione) {
  if (azione === 'sblocca') return x.stato === 'bloccato';
  if (x.livello === 'protetto' || x.chiuso) return false;
  if (azione === 'apposto') return !x.uscito && x.livello === 'dubbio';
  if (azione === 'togli' || azione === 'blocca') return x.livello !== 'pulito' && !x.uscito && x.stato !== 'bloccato' && x.stato !== 'tolto';
  return false;
}

// I motivi, detti nelle tre lingue (lo stesso elenco sta nel pannello, e una
// prova pretende che coincidano).
export const TESTI_MOTIVO = {
  apposto: ['l’hai segnato come a posto', 'you marked them as fine', 'lo marcaste como correcto'],
  tu: ['sei tu', 'it’s you', 'eres tú'],
  servizio: ['bot di servizio', 'service bot', 'bot de servicio'],
  esente: ['in «Non toccare mai»', 'in «Never touch»', 'en «Nunca tocar»'],
  mod: ['moderatore', 'moderator', 'moderador'],
  vip: ['VIP', 'VIP', 'VIP'],
  sub: ['abbonato', 'subscriber', 'suscriptor'],
  casa: ['di casa: scrive qui da tempo', 'a regular: chats here for a long time', 'de la casa: escribe aquí desde hace tiempo'],
  bloccasempre: ['in «Blocca sempre»', 'in «Always block»', 'en «Bloquear siempre»'],
  lista: ['nella lista pubblica dei bot', 'in the public bot list', 'en la lista pública de bots'],
  nomebot: ['nome da bot promozionale', 'promo bot name', 'nombre de bot promocional'],
  fabbrica: ['nato insieme ad altri e arrivato insieme a loro', 'created together with others and arrived with them', 'creado junto a otros y llegado con ellos'],
  gemelli: ['nato negli stessi minuti di altri follower', 'created in the same minutes as other followers', 'creado en los mismos minutos que otros seguidores'],
  ondata: ['arrivato in un’ondata di follow', 'arrived in a follow wave', 'llegó en una oleada de follows'],
  rete: ['riconosciuto da altri canali', 'recognized by other channels', 'reconocido por otros canales'],
  fermato: ['fermato dallo scudo in un attacco', 'stopped by the shield in an attack', 'detenido por el escudo en un ataque'],
  sospettato: ['sospettato durante un attacco', 'suspected during an attack', 'sospechoso durante un ataque'],
  oggi: ['account di oggi', 'account from today', 'cuenta de hoy'],
  giovane: ['account recente', 'recent account', 'cuenta reciente'],
  foto: ['foto di base', 'default picture', 'foto por defecto'],
  bio: ['bio vuota', 'empty bio', 'bio vacía'],
  nomegenerato: ['nome che sembra generato', 'name that looks generated', 'nombre que parece generado'],
  chiuso: ['account chiuso o sospeso', 'account closed or suspended', 'cuenta cerrada o suspendida'],
  streamer: ['affiliato o partner su Twitch', 'Twitch affiliate or partner', 'afiliado o partner en Twitch'],
};
export const testoMotivo = (m, lingua = 'it') => (TESTI_MOTIVO[m?.k] || [m?.k, m?.k, m?.k])[{ it: 0, en: 1, es: 2 }[lingua] ?? 0];
