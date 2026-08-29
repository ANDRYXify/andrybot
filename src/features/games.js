// Minigiochi in chat + monete (punti fedeltà) + promo social proattiva.
// Tutto procedurale e leggero. Disattivabile per canale (settings.giochi).
//
// Comandi: !dado [NdM] · !moneta · !8ball <domanda> · !slot · !roulette <p> <scelta>
//          · !pesca · !duello @tizio · !furto @tizio · !regala @tizio N
//          · !trivia · !classifica [mod|tutti] · !monete · !giochi
import { points, streamers, giochi } from '../db.js';
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('giochi');

// --------------------------------------------------------- utilità
const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

// cooldown in memoria: chiave → ts di sblocco
const cooldowns = new Map();
function inCooldown(chiave, ms) {
  const ora = Date.now();
  if ((cooldowns.get(chiave) || 0) > ora) return true;
  cooldowns.set(chiave, ora + ms);
  return false;
}

// accredito passivo: throttle per (canale,utente)
const ultimoAccredito = new Map();

function attivi(channel) {
  const s = streamers.get(channel);
  return s?.settings?.giochi !== false;   // di default i giochi sono accesi
}
function nomeMoneta(channel) {
  const n = streamers.get(channel)?.settings?.nomeMonete;
  return (n && String(n).trim()) || 'monete';
}

// Configurazione punti/classifica per canale (personalizzabile dalla dashboard).
// Valori di default = quelli storici, così i canali esistenti non cambiano nulla.
// L'economia delle monete.
//
// Com'era: si guadagnava SOLO scrivendo, due monete al minuto. Chi guardava in
// silenzio per due ore prendeva zero; chi scriveva «ok» ogni minuto ne prendeva
// centoventi. Cosi si premia il rumore, non la presenza — ed e' un invito a
// tenere una macro che scrive in chat.
//
// Com'e' ora, sul modello dei sistemi fedelta' collaudati (StreamElements,
// Streamlabs): due flussi che si SOMMANO.
//
//   presenza   a chi c'e', anche in silenzio, a ogni giro
//   attivita'  in piu' a chi ha scritto in quel giro
//
// piu' i moltiplicatori per abbonati e VIP, e una regola che il direttore ha
// chiesto esplicitamente: chi resta in lurk a lungo continua a guadagnare, ma
// GRADUALMENTE MENO. Non a zero — la presenza vale sempre qualcosa — ma
// scendendo di un passo a ogni giro senza partecipare, fino a un minimo. Chi
// torna a parlare risale subito a quota piena.
//
// Tutto solo mentre il canale e' in diretta: a canale spento non c'e' niente da
// premiare, e il flusso continuo a bocce ferme e' proprio cio' che svaluta la
// moneta.
const PUNTI_DEFAULT = {
  perMessaggio: 2, ogniSecondi: 60,
  perPresenza: 5, perAttivita: 5,
  moltSub: 1.5, moltVip: 1.25,
  lurkPasso: 0.15, lurkMinimo: 0.35,
  soloLive: true,
  trivia: 25, duello: 15, slotCosto: 10, slotVinci: 200, slotCoppia: 20, topN: 5,
};
function numClamp(v, def, lo, hi) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; }
function cfgPunti(channel) {
  const p = streamers.get(channel)?.settings?.punti || {};
  return {
    perMessaggio: numClamp(p.perMessaggio, PUNTI_DEFAULT.perMessaggio, 0, 1000),
    ogniSecondi:  numClamp(p.ogniSecondi,  PUNTI_DEFAULT.ogniSecondi, 5, 3600),
    trivia:       numClamp(p.trivia,       PUNTI_DEFAULT.trivia, 0, 100000),
    duello:       numClamp(p.duello,       PUNTI_DEFAULT.duello, 0, 100000),
    slotCosto:    numClamp(p.slotCosto,    PUNTI_DEFAULT.slotCosto, 0, 100000),
    slotVinci:    numClamp(p.slotVinci,    PUNTI_DEFAULT.slotVinci, 0, 1000000),
    slotCoppia:   numClamp(p.slotCoppia,   PUNTI_DEFAULT.slotCoppia, 0, 100000),
    topN:         numClamp(p.topN,         PUNTI_DEFAULT.topN, 3, 10),
    perPresenza:  numClamp(p.perPresenza,  PUNTI_DEFAULT.perPresenza, 0, 10000),
    perAttivita:  numClamp(p.perAttivita,  PUNTI_DEFAULT.perAttivita, 0, 10000),
    moltSub:      numFra(p.moltSub,        PUNTI_DEFAULT.moltSub, 1, 10),
    moltVip:      numFra(p.moltVip,        PUNTI_DEFAULT.moltVip, 1, 10),
    lurkPasso:    numFra(p.lurkPasso,      PUNTI_DEFAULT.lurkPasso, 0, 1),
    lurkMinimo:   numFra(p.lurkMinimo,     PUNTI_DEFAULT.lurkMinimo, 0, 1),
    soloLive:     p.soloLive !== false,
  };
}
function numFra(v, def, lo, hi) { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; }

// Quanto vale la presenza di chi non partecipa da `giri` giri: piena finche'
// partecipa, poi scende di un passo per volta e si ferma al minimo.
export function fattoreLurk(giri, cfg) {
  const passo = cfg.lurkPasso ?? PUNTI_DEFAULT.lurkPasso;
  const minimo = cfg.lurkMinimo ?? PUNTI_DEFAULT.lurkMinimo;
  return Math.max(minimo, 1 - Math.max(0, giri) * passo);
}

// Quante monete spettano a una persona in questo giro.
export function quotaGiro({ attivo, giriFermo, sub, vip }, cfg) {
  const base = (cfg.perPresenza || 0) * fattoreLurk(attivo ? 0 : giriFermo, cfg);
  const extra = attivo ? (cfg.perAttivita || 0) : 0;
  const molt = sub ? (cfg.moltSub || 1) : (vip ? (cfg.moltVip || 1) : 1);
  return Math.round((base + extra) * molt);
}

// Chi ha scritto dall'ultimo giro, e da quanti giri uno sta zitto.
const attiviGiro = new Map();     // canale → Set(utente)
const fermiDa = new Map();        // canale → Map(utente → giri)

// I ruoli non costano una chiamata: ogni messaggio in chat porta con se' i
// distintivi di chi scrive, quindi basta ricordarli. Chi non ha mai parlato
// resta senza moltiplicatore, che e' il comportamento prudente.
//
// `mod` non serve ai moltiplicatori ma alle DUE CLASSIFICHE: dice in quale
// delle due gareggia chi guadagna. Viene passato al magazzino delle monete
// solo quando lo sappiamo davvero — di chi non ha mai parlato non sappiamo
// niente, e in quel caso non tocchiamo il ruolo gia' registrato.
const ruoliVisti = new Map();     // canale → Map(utente → { sub, vip })

function segnaAttivita(channel, utente, msg) {
  const ch = String(channel || '').toLowerCase();
  const u = String(utente || '').toLowerCase();
  let s2 = attiviGiro.get(ch);
  if (!s2) { s2 = new Set(); attiviGiro.set(ch, s2); }
  s2.add(u);
  if (msg) {
    let r = ruoliVisti.get(ch);
    if (!r) { r = new Map(); ruoliVisti.set(ch, r); }
    r.set(u, { sub: !!msg.isSub, vip: !!msg.isVip, mod: !!(msg.isMod || msg.isBroadcaster) });
    if (r.size > 5000) { let n = 0; for (const k of r.keys()) { r.delete(k); if (++n >= 2000) break; } }
  }
}

// Da cosa sappiamo di una persona alla gara in cui corre. `undefined` (non
// `''`) quando non lo sappiamo: e' la differenza fra "e' pubblico" e "non lo so".
export function ruoloDa(r) {
  if (!r || r.mod === undefined) return null;
  return r.mod ? 'staff' : '';
}

export function ruoliDi(channel) {
  const r = ruoliVisti.get(String(channel || '').toLowerCase());
  if (!r) return {};
  const out = {};
  for (const [k, v] of r) out[k] = v;
  return out;
}

// Un giro dell'economia. `presenti` e' la lista di chi e' in chat (anche in
// silenzio); `ruoli` dice chi e' sub o VIP. Ritorna quanto e' stato dato, per
// i collaudi e per la console.
export function giroMonete(channel, presenti, { ruoli = null, live = true } = {}) {
  const ch = String(channel || '').toLowerCase();
  if (!ruoli) ruoli = ruoliDi(ch);
  const esito = { accreditati: 0, monete: 0, saltati: 0 };
  if (!attivi(ch)) return esito;
  const cfg = cfgPunti(ch);
  if (cfg.soloLive && !live) { attiviGiro.delete(ch); return esito; }
  if (!(cfg.perPresenza > 0 || cfg.perAttivita > 0)) return esito;

  const parlanti = attiviGiro.get(ch) || new Set();
  let fermi = fermiDa.get(ch);
  if (!fermi) { fermi = new Map(); fermiDa.set(ch, fermi); }

  for (const grezzo of presenti || []) {
    const u = String(grezzo || '').toLowerCase();
    if (!u || u.startsWith('[')) { esito.saltati++; continue; }
    const attivo = parlanti.has(u);
    const giri = attivo ? 0 : (fermi.get(u) || 0) + 1;
    fermi.set(u, giri);
    const r = ruoli[u] || {};
    const q = quotaGiro({ attivo, giriFermo: giri, sub: !!r.sub, vip: !!r.vip }, cfg);
    if (q > 0) { points.add(ch, u, q, ruoloDa(ruoli[u])); esito.accreditati++; esito.monete += q; }
  }
  // chi non c'e' piu' non deve restare in memoria a crescere all'infinito
  const presenti2 = new Set((presenti || []).map((x) => String(x).toLowerCase()));
  for (const k of fermi.keys()) if (!presenti2.has(k)) fermi.delete(k);
  attiviGiro.delete(ch);
  return esito;
}
const medaglia = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}°`;

// Le due gare, dette a parole. `!classifica` da sola e' quella del pubblico:
// e' la gara che riguarda chi guarda. `!classifica mod` e `!classificamod`
// mostrano lo staff, `!classifica tutti` la vecchia vista unica.
const ETICHETTA_GARA = { pubblico: '🏆 Classifica', staff: '🛡️ Classifica staff', tutti: '🏆 Classifica generale' };
const PAROLE_GARA = {
  staff: ['mod', 'mods', 'moderatori', 'staff'],
  tutti: ['tutti', 'tutto', 'generale', 'insieme', 'all'],
};
function gara(parola) {
  const p = String(parola || '').toLowerCase().replace(/^@/, '');
  for (const [k, parole] of Object.entries(PAROLE_GARA)) if (parole.includes(p)) return k;
  return 'pubblico';
}
function vuotaPer(quale, moneta) {
  if (quale === 'staff') return `Nessuno dello staff ha ancora ${moneta}. 🛡️`;
  return `Nessuno ha ancora ${moneta}: chattate e giocate! 🎮`;
}

// Riempie i segnaposto di un modello. Nasce da un difetto vero: un esito del
// duello conteneva {a} due volte e la sostituzione ne cambiava una sola, quindi
// in chat compariva «vince {a}!». Qui si sostituiscono TUTTE le occorrenze e,
// se resta un segnaposto non risolto, si lancia: un modello scritto male viene
// scoperto dai collaudi invece che dagli spettatori.
export function riempi(modello, valori) {
  let t = String(modello);
  for (const [k, v] of Object.entries(valori)) t = t.split('{' + k + '}').join(String(v));
  const resto = t.match(/\{[a-z0-9_]+\}/i);
  if (resto) throw new Error(`modello con segnaposto non risolto: ${resto[0]} in "${modello}"`);
  return t;
}

// Chi ha parlato di recente, per canale. Serve per non far sfidare fantasmi:
// prima bastava scrivere !duello @chiunque perche' il bot annunciasse un duello
// con un nome inventato e gli accreditasse pure le monete.
const VISTI_MS = 30 * 60 * 1000;
const visti = new Map();

export function segnaPresenza(channel, utente) {
  const ch = String(channel || '').toLowerCase();
  const u = String(utente || '').toLowerCase();
  if (!ch || !u) return;
  let m = visti.get(ch);
  if (!m) { m = new Map(); visti.set(ch, m); }
  m.set(u, Date.now());
  if (m.size > 3000) {
    const limite = Date.now() - VISTI_MS;
    for (const [k, t] of m) if (t < limite) m.delete(k);
  }
}

export function inChat(channel, utente) {
  const m = visti.get(String(channel || '').toLowerCase());
  if (!m) return false;
  const t = m.get(String(utente || '').toLowerCase());
  return !!t && Date.now() - t < VISTI_MS;
}

// --------------------------------------------------------- monete: accredito passivo
// Chi chatta guadagna qualche moneta (throttle 60s per persona).
export function accredita(msg) {
  try {
    if (!msg) return;
    const u = String(msg.user || '').toLowerCase();
    if (!u || u.startsWith('[')) return;
    segnaPresenza(msg.channel, u);
    segnaAttivita(msg.channel, u, msg);
    if (!attivi(msg.channel)) return;
    const c = cfgPunti(msg.channel);
    if (c.perMessaggio <= 0) return;
    const k = msg.channel + '|' + u;
    if (Date.now() - (ultimoAccredito.get(k) || 0) < c.ogniSecondi * 1000) return;
    ultimoAccredito.set(k, Date.now());
    points.add(msg.channel, u, c.perMessaggio, msg.isMod || msg.isBroadcaster ? 'staff' : '');
  } catch { /* niente */ }
}

// --------------------------------------------------------- trivia (round in memoria)
const BANCA_TRIVIA = [
  { q: 'Qual è il pianeta più grande del Sistema Solare?', a: ['giove'] },
  { q: 'Quanti lati ha un esagono?', a: ['6', 'sei'] },
  { q: 'In che continente si trova l\'Egitto?', a: ['africa'] },
  { q: 'Qual è il fiume più lungo d\'Italia?', a: ['po'] },
  { q: 'Chi ha dipinto la Gioconda?', a: ['leonardo', 'leonardo da vinci', 'da vinci'] },
  { q: 'Quante corde ha una chitarra classica?', a: ['6', 'sei'] },
  { q: 'Qual è la capitale del Giappone?', a: ['tokyo'] },
  { q: 'In quale anno è caduto il muro di Berlino?', a: ['1989'] },
  { q: 'Qual è l\'elemento chimico con simbolo O?', a: ['ossigeno'] },
  { q: 'Quanti giocatori ci sono in una squadra di calcio in campo?', a: ['11', 'undici'] },
  { q: 'Come si chiama il papà di Super Mario (il creatore)?', a: ['miyamoto', 'shigeru miyamoto'] },
  { q: 'Qual è il mammifero più grande del mondo?', a: ['balena', 'balenottera', 'balenottera azzurra'] },
  { q: 'Quanti minuti ci sono in un\'ora?', a: ['60', 'sessanta'] },
  { q: 'Di che colore diventa la cartina di tornasole in un acido?', a: ['rosso'] },
  { q: 'Qual è la capitale della Francia?', a: ['parigi'] },
  { q: 'In che gioco esiste la "creeper"?', a: ['minecraft'] },
  { q: 'Quante zampe ha un ragno?', a: ['8', 'otto'] },
  { q: 'Qual è il numero romano per 50?', a: ['l'] },
  { q: 'Come si chiama la nostra galassia?', a: ['via lattea'] },
  { q: 'Quanti colori ha l\'arcobaleno?', a: ['7', 'sette'] },
];
// parole "reflex" di riserva se il canale non ha un gioco-parola personalizzato
const BANCA_PAROLE = ['pizza', 'gg', 'hype', 'clip', 'combo', 'boss', 'jump', 'loot', 'respawn', 'buff', 'nerf', 'poggers', 'raid', 'sub', 'lag'];

// ─────────────────────────────────────────────────── motore delle "manche"
// Una manche è un ROUND a tempo: il bot lancia un gioco in chat, il primo che
// risponde giusto vince i punti. I round sono generalizzati (trivia, parola,
// numero) con una funzione `controlla(testo)` uniforme.
const roundAttivo = new Map();   // channel → { tipo, controlla, premio, soluzione, scadenza, durata }

function giochiCustom(channel, tipo) {
  try { return giochi.listAttivi(channel).filter((g) => g.tipo === tipo); } catch { return []; }
}

// Costruttori di round. Ognuno ritorna un descrittore (o null se non fattibile).
function roundTrivia(channel) {
  const custom = giochiCustom(channel, 'trivia').flatMap((g) => Array.isArray(g.config?.domande) ? g.config.domande : []);
  const banca = custom.length ? (Math.random() < 0.65 ? custom : BANCA_TRIVIA) : BANCA_TRIVIA;
  const d = scegli(banca);
  if (!d?.q || !Array.isArray(d.a) || !d.a.length) return null;
  const ans = d.a.map(norm).filter(Boolean);
  return { tipo: 'trivia', annuncio: `🧠 TRIVIA: ${d.q}`, controlla: (t) => ans.some((a) => t === a || t.split(' ').includes(a)), soluzione: d.a[0], durata: 45000 };
}
function roundParola(channel) {
  const custom = giochiCustom(channel, 'parola').flatMap((g) => Array.isArray(g.config?.parole) ? g.config.parole : []);
  const pool = custom.length ? custom : BANCA_PAROLE;
  const p = String(scegli(pool) || '').trim();
  if (!p) return null;
  const target = norm(p);
  return { tipo: 'parola', annuncio: `⚡ REFLEX: il primo che scrive "${p}" vince!`, controlla: (t) => t === target, soluzione: p, durata: 30000 };
}
function roundNumero() {
  const max = 50;
  const n = rnd(1, max);
  return { tipo: 'numero', annuncio: `🔢 Ho pensato un numero da 1 a ${max}: indovinatelo!`, controlla: (t) => parseInt(t, 10) === n, soluzione: String(n), durata: 40000 };
}

function avviaRound(channel, round, say) {
  if (!round || roundAttivo.has(channel)) return false;
  round.premio = round.premio || cfgPunti(channel).trivia;
  round.scadenza = Date.now() + round.durata;
  roundAttivo.set(channel, round);
  try { say(`${round.annuncio} — rispondete in chat! (${Math.round(round.durata / 1000)}s, +${round.premio} ${nomeMoneta(channel)})`); } catch { /* niente */ }
  setTimeout(() => {
    const r = roundAttivo.get(channel);
    if (r === round) { roundAttivo.delete(channel); try { say(`⏰ Tempo scaduto! La risposta era "${round.soluzione}".`); } catch { /* niente */ } }
  }, round.durata + 1000).unref?.();
  return true;
}

// Lancia una manche a caso (gioco scelto a caso tra trivia/parola/numero, con i
// giochi personalizzati mescolati). Chiamata dallo scheduler del bot.
// --- altri tipi di manche, tutti sullo stesso schema -----------------------
// Un round e' { tipo, annuncio, controlla(testo), soluzione, durata }: aggiungerne
// uno vuol dire scrivere una funzione che lo costruisce, e ognuno accetta il suo
// materiale dai giochi personalizzati del canale invece di un elenco fisso.

// Mescola le lettere di una parola, garantendo che il risultato sia diverso
// dall'originale: un anagramma uguale alla parola non e' un gioco.
function mescola(parola) {
  const car = [...String(parola)];
  if (car.length < 3) return null;
  for (let tent = 0; tent < 12; tent++) {
    for (let i = car.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [car[i], car[j]] = [car[j], car[i]];
    }
    const fatto = car.join('');
    if (norm(fatto) !== norm(parola)) return fatto;
  }
  return null;
}

function roundAnagramma(channel) {
  const custom = giochiCustom(channel, 'anagramma').flatMap((g) => Array.isArray(g.config?.parole) ? g.config.parole : []);
  const pool = (custom.length ? custom : BANCA_PAROLE).filter((p) => String(p).trim().length >= 4);
  if (!pool.length) return null;
  const p = String(scegli(pool)).trim();
  const mischiata = mescola(p);
  if (!mischiata) return null;
  const target = norm(p);
  return {
    tipo: 'anagramma',
    annuncio: `🔤 ANAGRAMMA: rimetti in ordine «${mischiata.toUpperCase()}»`,
    controlla: (t) => t === target, soluzione: p, durata: 45000,
  };
}

const EMOJI_SEQ = ['🍒', '⭐', '💎', '🔥', '🎲', '🎯', '🍋', '🔔', '⚡', '🌙'];
function roundSequenza(channel) {
  const custom = giochiCustom(channel, 'sequenza');
  const quanti = numClamp(custom[0]?.config?.lunghezza, 4, 3, 8);
  const tavolozza = (Array.isArray(custom[0]?.config?.simboli) && custom[0].config.simboli.length >= 3)
    ? custom[0].config.simboli : EMOJI_SEQ;
  const seq = Array.from({ length: quanti }, () => scegli(tavolozza));
  const testo = seq.join('');
  return {
    tipo: 'sequenza',
    annuncio: `🧩 SEQUENZA: ricopiala esattamente → ${seq.join(' ')}`,
    controlla: (t, grezzo) => String(grezzo || '').replace(/\s+/g, '') === testo,
    soluzione: testo, durata: 30000,
  };
}

function roundDomandaCustom(channel) {
  // Un tipo libero: lo streamer scrive annuncio e risposte accettate. E' il piu'
  // versatile — ci si fa un indovinello, una citazione, un «quale gioco e'?».
  const g = scegli(giochiCustom(channel, 'domanda'));
  if (!g) return null;
  const testo = String(g.config?.domanda || g.nome || '').trim();
  const risposte = (Array.isArray(g.config?.risposte) ? g.config.risposte : []).map(norm).filter(Boolean);
  if (!testo || !risposte.length) return null;
  return {
    tipo: 'domanda',
    annuncio: `❓ ${testo}`,
    controlla: (t) => risposte.includes(t),
    soluzione: g.config.risposte[0], durata: numClamp(g.config?.durataSec, 45, 10, 300) * 1000,
  };
}

// I tipi di manche esistenti, con il nome da mostrare e se accettano materiale
// dallo streamer. Un posto solo: da qui si servono la dashboard, il collaudo e
// il sorteggio, invece di tre elenchi che possono divergere.
const COSTRUTTORI = {
  trivia:    { fai: (c) => roundTrivia(c),    nome: 'Quiz',      materiale: 'domande' },
  parola:    { fai: (c) => roundParola(c),    nome: 'Reflex',    materiale: 'parole' },
  numero:    { fai: (c) => roundNumero(c),    nome: 'Numero',    materiale: null },
  anagramma: { fai: (c) => roundAnagramma(c), nome: 'Anagramma', materiale: 'parole' },
  sequenza:  { fai: (c) => roundSequenza(c),  nome: 'Sequenza',  materiale: 'simboli' },
  domanda:   { fai: (c) => roundDomandaCustom(c), nome: 'Domanda tua', materiale: 'domanda+risposte' },
};

export function tipiManche() {
  return Object.entries(COSTRUTTORI).map(([id, v]) => ({ id, nome: v.nome, materiale: v.materiale }));
}

// Costruisce una manche senza avviarla: serve a provarla dalla dashboard e a
// collaudare che ogni tipo produca davvero qualcosa di giocabile.
export function costruisciManche(channel, tipo) {
  const c = COSTRUTTORI[tipo];
  if (!c) return null;
  try { return c.fai(channel); } catch { return null; }
}

export function avviaManche(channel, say) {
  if (!attivi(channel) || roundAttivo.has(channel)) return false;
  const builders = Object.values(COSTRUTTORI).map((c) => c.fai);
  // prova qualche costruttore finché uno produce un round valido
  for (const b of builders.sort(() => Math.random() - 0.5)) {
    const r = b(channel);
    if (r) return avviaRound(channel, r, say);
  }
  return false;
}

// --------------------------------------------------------- 8ball
const OTTO = [
  'Sì, senza dubbio.', 'Direi proprio di sì.', 'Ci puoi scommettere.', 'Assolutamente.',
  'Mmm… non ci conterei.', 'Meglio di no.', 'Direi di no.', 'Non è detto.',
  'Chiedimelo di nuovo più tardi.', 'Il futuro è nebbioso… riprova.', 'Le probabilità sono buone.',
  'Segui il tuo istinto.', 'Ho i miei dubbi…', 'Ovvio che sì!', 'Nemmeno per sogno 😄',
];
const SLOT_SIMBOLI = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
// Esposti per il collaudo: ogni modello viene riempito con valori finti e deve
// uscirne senza segnaposto residui. Cosi un {a} scritto due volte, o un {c} che
// nessuno riempie, si scopre prima di finire in chat.
export const MODELLI = {
  duello: () => ({ elenco: DUELLO_ESITI, valori: { a: 'Tizio', b: 'Caio' } }),
};

const DUELLO_ESITI = [
  '{a} stende {b} con una mossa leggendaria! 🥊',
  '{b} inciampa e {a} vince senza fatica 😂',
  '{a} e {b} se le danno di santa ragione, e alla fine la spunta {a}! 🔥',
  '{a} sconfigge {b} e ruba pure la scena ✨',
];
// pesca: tabella del pescato (peso = probabilità relativa, v = monete vinte)
const PESCA = [
  { n: 'una vecchia ciabatta 🥿', v: 0, peso: 16 },
  { n: 'una lattina arrugginita 🥫', v: 0, peso: 12 },
  { n: 'un pesciolino 🐟', v: 15, peso: 30 },
  { n: 'un granchio 🦀', v: 30, peso: 18 },
  { n: 'un polpo 🐙', v: 60, peso: 10 },
  { n: 'un pesce spada 🗡️', v: 120, peso: 6 },
  { n: 'uno stivale pieno di monete 👢', v: 250, peso: 4 },
  { n: 'uno scrigno del tesoro 🧰', v: 500, peso: 2 },
];
// roulette europea: lo 0 è verde, gli altri numeri sono rossi o neri
const ROULETTE_ROSSI = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// pesca pesata da una tabella con campo `peso`
function pescaPesata(tab) {
  const tot = tab.reduce((s, x) => s + (x.peso || 0), 0);
  let r = Math.random() * tot;
  for (const x of tab) { if ((r -= (x.peso || 0)) < 0) return x; }
  return tab[tab.length - 1];
}

// --------------------------------------------------------- comando principale
// Ritorna true se il messaggio era un comando/azione di gioco (gestito).
export function tryGame(msg, say) {
  try {
    // Niente skip su isSelf: lo streamer (che il bot impersona) può giocare/
    // testare i minigiochi dal suo account. Nessun loop: gli echi non tornano.
    if (!msg) return false;
    const channel = msg.channel;
    if (!attivi(channel)) return false;
    const nome = msg.display || msg.user;
    const moneta = () => nomeMoneta(channel);

    // risposta a una manche (round) in corso: messaggio normale, non comando
    const round = roundAttivo.get(channel);
    if (round) {
      if (Date.now() > round.scadenza) { roundAttivo.delete(channel); }
      // Il testo arriva sia normalizzato sia grezzo: le manche a parole usano il
      // primo, quelle a simboli il secondo (norm() toglie le emoji).
      else if (!String(msg.text).startsWith('!') && round.controlla(norm(msg.text), msg.text)) {
        roundAttivo.delete(channel);
        points.add(channel, msg.user, round.premio);
        say(`🎉 Esatto ${nome}! (${round.soluzione}) +${round.premio} ${moneta()}!`);
        return true;
      }
    }

    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    const args = parti;

    switch (cmd) {
      case 'giochi':
        say('🎮 Giochi: !dado, !moneta, !8ball, !slot, !roulette, !pesca, !duello @nome, !furto @nome, !regala @nome N, !trivia, !classifica (o !classifica mod), !monete');
        return true;

      case 'dado':
      case 'roll': {
        if (inCooldown(channel + '|dado|' + msg.user, 3000)) return true;
        let n = 1, facce = 6;
        const m = /^(\d{0,2})d(\d{1,3})$/i.exec(args[0] || '');
        if (m) { n = Math.min(10, Math.max(1, parseInt(m[1] || '1', 10))); facce = Math.min(1000, Math.max(2, parseInt(m[2], 10))); }
        const tiri = Array.from({ length: n }, () => rnd(1, facce));
        const tot = tiri.reduce((a, b) => a + b, 0);
        say(`🎲 ${nome} tira ${n}d${facce}: ${tiri.join(' + ')}${n > 1 ? ' = ' + tot : ''}`);
        return true;
      }

      case 'moneta':
      case 'coin': {
        if (inCooldown(channel + '|coin|' + msg.user, 3000)) return true;
        say(`🪙 ${nome}: è uscito ${Math.random() < 0.5 ? 'TESTA' : 'CROCE'}!`);
        return true;
      }

      case '8ball':
      case 'palla8': {
        if (inCooldown(channel + '|8ball|' + msg.user, 3000)) return true;
        if (!args.length) { say(`🎱 Fammi una domanda, ${nome}! (es. !8ball vinco stasera?)`); return true; }
        say(`🎱 ${scegli(OTTO)}`);
        return true;
      }

      case 'monete':
      case 'punti':
      case 'bilancio': {
        say(`💰 ${nome}, hai ${points.get(channel, msg.user)} ${moneta()}.`);
        return true;
      }

      case 'classifica':
      case 'top':
      case 'classificamod':
      case 'classificastaff':
      case 'topmod': {
        const quale = /mod|staff/.test(cmd) ? 'staff' : gara(args[0]);
        const top = points.top(channel, cfgPunti(channel).topN, quale);
        if (!top.length) { say(vuotaPer(quale, moneta())); return true; }
        const riga = top.map((r, i) => `${medaglia(i)} ${r.user} (${r.monete})`).join('  ');
        say(`${ETICHETTA_GARA[quale]} ${moneta()}: ${riga}`);
        return true;
      }

      case 'slot': {
        if (inCooldown(channel + '|slot|' + msg.user, 5000)) return true;
        const cp = cfgPunti(channel);
        const costo = cp.slotCosto;
        if (points.get(channel, msg.user) < costo) { say(`🎰 Ti servono ${costo} ${moneta()} per giocare, ${nome}. Chatta un po' e torna!`); return true; }
        points.add(channel, msg.user, -costo);
        const r = [scegli(SLOT_SIMBOLI), scegli(SLOT_SIMBOLI), scegli(SLOT_SIMBOLI)];
        let vincita = 0, msgWin = '';
        // tris: 💎 = vincita piena, 7️⃣ = 75%, altro = 40% (scala su slotVinci)
        if (r[0] === r[1] && r[1] === r[2]) { vincita = r[0] === '💎' ? cp.slotVinci : r[0] === '7️⃣' ? Math.round(cp.slotVinci * 0.75) : Math.round(cp.slotVinci * 0.4); msgWin = ' JACKPOT!! 🎉'; }
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { vincita = cp.slotCoppia; msgWin = ' bella coppia!'; }
        if (vincita) points.add(channel, msg.user, vincita);
        say(`🎰 [ ${r.join(' | ')} ] ${vincita ? `${nome} vince ${vincita} ${moneta()}!${msgWin}` : `niente, ritenta ${nome}!`}`);
        return true;
      }

      case 'duello':
      case 'duel': {
        const sfidato = (args[0] || '').replace(/^@/, '').toLowerCase();
        if (!sfidato) { say(`⚔️ Sfida qualcuno: !duello @nome`); return true; }
        if (sfidato === msg.user.toLowerCase()) { say(`${nome}, non puoi sfidare te stesso 😄`); return true; }
        if (!/^[a-z0-9_]{3,25}$/.test(sfidato)) { say(`⚔️ «${sfidato}» non è un nome valido.`); return true; }
        // Nessun duello con i fantasmi: si sfida chi è in chat, non un nome
        // qualsiasi. Senza questo, le monete finivano su profili inesistenti.
        if (!inChat(channel, sfidato)) { say(`⚔️ @${sfidato} non è in chat: puoi sfidare solo chi c'è.`); return true; }
        if (inCooldown(channel + '|duello', 15000)) { say('⚔️ Un duello alla volta, aspettate un attimo!'); return true; }
        const vince = Math.random() < 0.5;
        const a = vince ? nome : sfidato, b = vince ? sfidato : nome;
        const premio = cfgPunti(channel).duello;
        points.add(channel, vince ? msg.user : sfidato, premio);
        say('⚔️ ' + riempi(scegli(DUELLO_ESITI), { a, b }) + ` (+${premio} ${moneta()})`);
        return true;
      }

      case 'trivia':
      case 'quiz': {
        if (roundAttivo.has(channel)) { say('🧠 C\'è già una manche in corso, rispondete!'); return true; }
        if (inCooldown(channel + '|trivia', 15000)) return true;
        avviaRound(channel, roundTrivia(channel), say);
        return true;
      }

      case 'manche':
      case 'gioca': {
        // avvia una manche a caso al volo (utile per provare / mod)
        if (roundAttivo.has(channel)) { say('🎮 C\'è già una manche in corso!'); return true; }
        if (inCooldown(channel + '|manche', 10000)) return true;
        if (!avviaManche(channel, say)) say('🎮 Nessuna manche disponibile al momento.');
        return true;
      }

      case 'pesca':
      case 'fish': {
        if (inCooldown(channel + '|pesca|' + msg.user, 60000)) { say(`🎣 ${nome}, la canna è ancora in acqua… riprova tra poco.`); return true; }
        const c = pescaPesata(PESCA);
        if (c.v > 0) { points.add(channel, msg.user, c.v); say(`🎣 ${nome} pesca ${c.n} e guadagna ${c.v} ${moneta()}!`); }
        else say(`🎣 ${nome} pesca ${c.n}… niente ${moneta()}, ritenta!`);
        return true;
      }

      case 'roulette':
      case 'rul': {
        if (inCooldown(channel + '|roulette|' + msg.user, 5000)) return true;
        const punta = Math.round(Number(args[0]));
        const scelta = (args[1] || '').toLowerCase();
        if (!Number.isFinite(punta) || punta <= 0 || !scelta) { say(`🎡 Uso: !roulette <puntata> <rosso|nero|verde|numero 0-36>`); return true; }
        const saldo = points.get(channel, msg.user);
        if (saldo < punta) { say(`🎡 ${nome}, non hai abbastanza ${moneta()} (${saldo}).`); return true; }
        const numScelto = /^\d{1,2}$/.test(scelta) ? parseInt(scelta, 10) : null;
        if (numScelto === null && !['rosso', 'nero', 'verde', 'red', 'black', 'green'].includes(scelta)) { say(`🎡 Punta su rosso, nero, verde o un numero da 0 a 36.`); return true; }
        if (numScelto !== null && (numScelto < 0 || numScelto > 36)) { say(`🎡 Il numero va da 0 a 36, ${nome}.`); return true; }
        points.add(channel, msg.user, -punta);
        const uscito = rnd(0, 36);
        const colore = uscito === 0 ? 'verde' : (ROULETTE_ROSSI.has(uscito) ? 'rosso' : 'nero');
        let vincita = 0;
        if (numScelto !== null) { if (numScelto === uscito) vincita = punta * 36; }         // pieno: 35x + puntata
        else { const s = { red: 'rosso', black: 'nero', green: 'verde' }[scelta] || scelta;
          if (s === colore) vincita = colore === 'verde' ? punta * 14 : punta * 2; }
        const pallina = `${uscito} ${colore === 'rosso' ? '🔴' : colore === 'nero' ? '⚫' : '🟢'}`;
        if (vincita) { points.add(channel, msg.user, vincita); say(`🎡 La pallina cade sul ${pallina} — ${nome} vince ${vincita} ${moneta()}! 🎉`); }
        else say(`🎡 La pallina cade sul ${pallina} — niente da fare, ${nome}.`);
        return true;
      }

      case 'furto':
      case 'rapina': {
        const vittima = (args[0] || '').replace(/^@/, '').toLowerCase();
        if (!vittima) { say(`🦝 Uso: !furto @nome`); return true; }
        if (vittima === msg.user.toLowerCase()) { say(`${nome}, non puoi derubare te stesso 😄`); return true; }
        if (inCooldown(channel + '|furto|' + msg.user, 45000)) { say(`🦝 ${nome}, aspetta prima di tentare un altro colpo.`); return true; }
        const gruzzolo = points.get(channel, vittima);
        if (gruzzolo < 20) { say(`🦝 ${vittima} ha le tasche vuote, niente da rubare.`); return true; }
        if (Math.random() < 0.45) {                                   // colpo riuscito
          const bottino = rnd(10, Math.min(gruzzolo, 150));
          points.add(channel, vittima, -bottino); points.add(channel, msg.user, bottino);
          say(`🦝 Colpo riuscito! ${nome} sgraffigna ${bottino} ${moneta()} a ${vittima}! 😈`);
        } else {                                                       // beccato: multa
          const multa = Math.min(points.get(channel, msg.user), rnd(10, 60));
          if (multa > 0) { points.add(channel, msg.user, -multa); points.add(channel, vittima, multa); }
          say(`🚓 ${nome} viene beccato e paga ${multa} ${moneta()} di multa a ${vittima}! 😂`);
        }
        return true;
      }

      case 'regala':
      case 'dona': {
        const dest = (args[0] || '').replace(/^@/, '').toLowerCase();
        const q = Math.round(Number(args[1]));
        if (!dest || !Number.isFinite(q) || q <= 0) { say(`💝 Uso: !regala @nome quantità`); return true; }
        if (dest === msg.user.toLowerCase()) { say(`${nome}, non puoi regalarti ${moneta()} da solo 😄`); return true; }
        if (points.get(channel, msg.user) < q) { say(`${nome}, non hai abbastanza ${moneta()} (ne hai ${points.get(channel, msg.user)}).`); return true; }
        points.add(channel, msg.user, -q); points.add(channel, dest, q);
        say(`💝 ${nome} ha regalato ${q} ${moneta()} a ${dest}! Che generosità ✨`);
        return true;
      }

      default:
        return false;   // non è un comando di gioco
    }
  } catch (e) {
    log.error('tryGame:', e?.message || e);
    return false;
  }
}

// --------------------------------------------------------- promo social proattiva
// Invita a seguire lo streamer rimandando alla SUA pagina hub sul sito
// (siteUrl/u/<canale>): una destinazione sempre corretta e sotto il suo
// controllo. NON pesca più link dalla "conoscenza" auto-appresa, che poteva
// contenere social non impostati dallo streamer (rischio di promuovere i link
// sbagliati). Se non c'è un sito configurato, non propone nulla.
const APERTURE = [
  'Se ti va, mi trovi con tutti i miei social qui:', 'Piccolo promemoria — tutti i miei link:',
  'Passa a trovarmi, trovi tutto qui:', 'Per non perderti nulla, i miei link:', 'Ci trovi qui:',
];
export function promoSociale(channel) {
  try {
    const canale = String(channel || '').toLowerCase().trim();
    const base = config.hubUrl || config.siteUrl;   // dominio PUBBLICO (socialbot.live)
    if (!canale || !base) return null;
    return `${scegli(APERTURE)} ${base}/u/${canale} ✨`;
  } catch { return null; }
}
