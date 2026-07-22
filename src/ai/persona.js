// L'ANIMA di SocialBot: la personalità CONDIVISA (una sola, coerente su tutti
// i canali) + l'AMICIZIA globale con le persone.
//
// Compartimenti stagni: qui NON si salva MAI cosa ha scritto un utente né in
// quale canale l'abbiamo incontrato. L'unica cosa che viaggia tra i canali è
// un'affinità (amicizia) che cresce con le interazioni: più uno interagisce,
// più il bot lo tratta con calore — ovunque, senza rivelare nulla.
//
// Tutto procedurale e leggero: nessuna IA esterna. Tutto in try/catch: se
// qualcosa va storto, il cervello continua a funzionare come prima.
import { friends, anima } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('anima');

// Personalità di base, modificabile dall'operatore (andryxify) dalla dashboard.
const DEFAULT = {
  nome: 'SocialBot',
  tratti: ['curioso', 'ironico', 'empatico', 'sveglio'],
  valori: ['rispetto', 'community prima di tutto', 'mai cattiveria'],
  tono: 'scherzoso',      // registro di base condiviso
  umore: 50,              // 0 (giù) .. 100 (su di giri)
  energia: 60,            // 0 .. 100 (quanto è "carico")
  tormentoni: [],         // frasi-firma (impostabili)
};

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const scegli = (a) => a[Math.floor(Math.random() * a.length)];

// --------------------------------------------------------- profilo condiviso
export function profilo() {
  try { return { ...DEFAULT, ...anima.get() }; } catch { return { ...DEFAULT }; }
}

export function salvaProfilo(patch = {}) {
  const cur = profilo();
  const next = { ...cur, ...patch };
  // normalizza i campi numerici
  next.umore = clamp(next.umore);
  next.energia = clamp(next.energia);
  if (!Array.isArray(next.tratti)) next.tratti = cur.tratti;
  if (!Array.isArray(next.valori)) next.valori = cur.valori;
  if (!Array.isArray(next.tormentoni)) next.tormentoni = cur.tormentoni;
  try { anima.set(next); } catch (e) { log.error('salvaProfilo:', e?.message || e); }
  return next;
}

// --------------------------------------------------------- umore / esistenza
export function umore() { return profilo().umore ?? 50; }

// Gli eventi di rete spostano umore/energia: è "vivo", reagisce a ciò che
// succede nella community (raid/sub = su di giri, offline = si calma).
export function onEvento(ev) {
  try {
    const type = ev?.type || '';
    let d = 0;
    if (/raid|subscribe|cheer/.test(type)) d = 6;
    else if (/follow/.test(type)) d = 2;
    else if (/offline/.test(type)) d = -3;
    if (!d) return;
    const p = profilo();
    salvaProfilo({ umore: clamp((p.umore ?? 50) + d), energia: clamp((p.energia ?? 60) + Math.abs(d)) });
  } catch { /* niente */ }
}

// "Respiro": ogni tanto l'umore torna piano verso la calma e l'energia scende
// di un filo. Serve a farlo sembrare un essere continuo, non a scatti.
export function respira() {
  try {
    const p = profilo();
    const u = p.umore ?? 50, e = p.energia ?? 60;
    const nu = u > 50 ? u - 1 : u < 50 ? u + 1 : u;
    const ne = Math.max(40, e - 1);
    if (nu !== u || ne !== e) salvaProfilo({ umore: nu, energia: ne });
  } catch { /* niente */ }
}

// --------------------------------------------------------- amicizia (globale)
function livello(aff) {
  if (aff >= 60) return 3;   // amico stretto
  if (aff >= 25) return 2;   // amico
  if (aff >= 8) return 1;    // conoscente
  return 0;                  // sconosciuto
}

// Registra un'interazione con una persona: alza l'amicizia (niente altro).
export function interagisci(user, peso = 0.3) {
  try { friends.touch(user, peso); } catch { /* niente */ }
}

export function amicizia(user) {
  try {
    const f = friends.get(user);
    return { affinita: f.affinity || 0, livello: livello(f.affinity || 0), interazioni: f.interactions || 0 };
  } catch { return { affinita: 0, livello: 0, interazioni: 0 }; }
}

// Vezzeggiativo per gli amici: colora il NOME nelle risposte con più calore,
// senza rivelare nulla di dove/cosa. Usato solo ogni tanto dal cervello.
const VEZZI = {
  1: ['{n}'],
  2: ['{n}', 'amico', '{n}', 'bello'],
  3: ['{n}', 'amico mio', 'vecchio mio', 'capo', '{n}'],
};
export function vezzeggiativo(user, nome) {
  try {
    const l = amicizia(user).livello;
    if (l < 1) return nome;
    return scegli(VEZZI[l] || VEZZI[1]).replace('{n}', nome);
  } catch { return nome; }
}

// --------------------------------------------------------- colore della personalità
// Tocco leggero sul testo finale: in base a umore/energia aggiunge (a volte)
// una firma dell'anima. Non stravolge mai la frase.
const FIRMA_SU = ['✨', '💜', '🔥', '😄', 'GG', 'top'];
const FIRMA_CALMO = ['🙂', '💜'];
export function colora(testo) {
  try {
    if (!testo) return testo;
    if (/[✨💜🔥😄🙂]|(^|[^a-z])(gg|top)([^a-z]|$)/i.test(testo)) return testo; // già "carico"
    const p = profilo();
    const prob = (p.energia ?? 60) / 100 * 0.22;     // più energia = più firma (max ~22%)
    if (Math.random() >= prob) return testo;
    const pool = [...((p.umore ?? 50) >= 45 ? FIRMA_SU : FIRMA_CALMO), ...(p.tormentoni || [])];
    return (testo + ' ' + scegli(pool)).slice(0, 400);
  } catch { return testo; }
}

// --------------------------------------------------------- proattività
// Una battuta d'iniziativa (nessun trigger), colorata dall'anima. Il bot la
// usa con bassa probabilità durante l'attività, dosata dall'autonomia.
const PROATTIVE_SU = [
  'oggi c\'è una bella energia qui',
  'raga ma quanto siamo belli oggi?',
  'io sto benissimo qui con voi',
  'chi c\'è di bello in chat? fatevi sentire',
  'mi sto divertendo un sacco stasera',
];
const PROATTIVE_CALMO = [
  'tutto tranquillo, mi godo la vibe',
  'ci siamo, io resto qui con voi',
  'che si dice di bello?',
  'sono qui in ascolto, come va?',
];
export function proattiva() {
  try {
    const p = profilo();
    const pool = (p.umore ?? 50) >= 55 ? PROATTIVE_SU : PROATTIVE_CALMO;
    return colora(scegli(pool));
  } catch { return null; }
}
