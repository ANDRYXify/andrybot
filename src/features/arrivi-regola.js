// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI ARRIVA IN CHAT, LA REGOLA (docs/moduli.md, «Quando arriva in chat»).
//
// Un'accoglienza e' un Modulo con l'innesco `arrivo`: quando una persona scelta
// arriva in chat, il bot fa quello che il Modulo dice. Qui sta solo il
// ragionamento, senza rete e senza database: cosa vuol dire «arrivare», chi
// riguarda una regola, quale regola vince, come si riconosce una persona anche
// dopo un cambio di nome. I gesti stanno in arrivi.js.
//
// Niente import: lo legge anche db.js, per ripulire quello che si salva.

export const QUANDO = ['diretta', 'giorno', 'assenza'];
export const GRUPPI = ['tutti', 'sub', 'vip', 'mod'];
export const PIATTAFORME = ['twitch', 'kick', 'youtube'];
export const LIMITI = Object.freeze({
  persone: 50,          // persone per nome in una regola
  giorniMin: 1, giorniMax: 365, giorniDef: 21,
  pausaMin: 0, pausaMax: 60, pausaDef: 5,   // secondi fra due accoglienze
  fila: 25,             // accoglienze in attesa per canale
  attesaMaxMs: 3 * 60_000,
  ritardoMs: 1200,      // dopo il messaggio: prima risponde a quello che ha scritto
});
const GIORNO_MS = 86_400_000;

const testo = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

// ── la persona ─────────────────────────────────────────────────────────────
//
// Una persona e' una piattaforma, un id (se lo conosciamo) e un login. L'id e'
// quello che resta quando si cambia nome: Twitch e Kick ne danno uno numerico,
// YouTube l'id del canale (UC…). Il login e' come la si scrive, ed e' l'unica
// cosa che c'e' quando la si sceglie per nome prima che abbia scritto.
const RE_LOGIN = /^[a-z0-9_][a-z0-9_.-]{0,39}$/;
const RE_ID = /^[A-Za-z0-9_-]{1,40}$/;
export function normPersona(x) {
  if (!x || typeof x !== 'object') return null;
  const p = PIATTAFORME.includes(String(x.p)) ? String(x.p) : 'twitch';
  const login = String(x.login || '').trim().replace(/^@/, '').toLowerCase();
  const id = String(x.id || '').trim();
  if (!RE_LOGIN.test(login) && !RE_ID.test(id)) return null;
  return {
    p,
    id: RE_ID.test(id) ? id : '',
    login: RE_LOGIN.test(login) ? login : '',
    nome: testo(x.nome, 40),
  };
}

// La condizione «Per chi». Vale per ogni innesco, non solo per gli arrivi:
// un comando puo' rispondere in un modo a Tizio e in un altro a tutti gli altri.
// Assente = per tutti, ed e' come si comportano tutti i moduli fatti finora.
export function normChi(c) {
  if (!c || typeof c !== 'object') return null;
  const modo = c.modo === 'tranne' ? 'tranne' : 'solo';
  const visti = new Set();
  const persone = [];
  for (const grezza of Array.isArray(c.persone) ? c.persone : []) {
    const q = normPersona(grezza);
    if (!q) continue;
    const k = q.p + ':' + (q.id || q.login);
    if (visti.has(k)) continue;
    visti.add(k);
    persone.push(q);
    if (persone.length >= LIMITI.persone) break;
  }
  // «Tutti» in un «tranne» escluderebbe chiunque: un modulo che non scatta mai
  // senza che si capisca perche'. Li' non si tiene.
  const gruppi = [...new Set((Array.isArray(c.gruppi) ? c.gruppi : []).map(String)
    .filter((g) => GRUPPI.includes(g) && !(modo === 'tranne' && g === 'tutti')))];
  // «solo tutti» e «tranne nessuno» non dicono niente: la forma piu' semplice e' nessuna condizione
  if (!persone.length && !gruppi.length) return null;
  if (modo === 'solo' && gruppi.includes('tutti')) return null;
  return { modo, persone, gruppi };
}

export function normTriggerArrivo(t) {
  const q = t && typeof t === 'object' ? t : {};
  const quando = QUANDO.includes(q.quando) ? q.quando : 'diretta';
  const g = Math.round(Number(q.giorni));
  return {
    tipo: 'arrivo',
    quando,
    ...(quando === 'assenza' ? { giorni: Number.isFinite(g) ? Math.min(LIMITI.giorniMax, Math.max(LIMITI.giorniMin, g)) : LIMITI.giorniDef } : {}),
    // anche chi entra senza scrivere: solo Twitch, e solo per le persone scritte per nome
    ...(q.zitti === true ? { zitti: true } : {}),
  };
}

export const pausaDi = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(LIMITI.pausaMax, Math.max(LIMITI.pausaMin, n)) : LIMITI.pausaDef;
};

// Chi ha scritto, come persona.
export function chiDi(msg) {
  const p = PIATTAFORME.includes(msg?.piattaforma) ? msg.piattaforma : 'twitch';
  const id = String(msg?.userId || msg?.tags?.['user-id'] || '').trim();
  return { p, id: RE_ID.test(id) ? id : '', login: String(msg?.user || '').toLowerCase() };
}

// La chiave di una persona nei segni degli arrivi: l'id quando c'e', cosi' un
// cambio di nome non la fa «arrivare» di nuovo.
export const chiaveDi = (chi) => chi.p + ':' + (chi.id || chi.login);

// E' lei? Sulla stessa piattaforma, per id se tutti e due ce l'hanno, per
// login altrimenti. Un id diverso vince su un login uguale: il nome e' passato
// a un'altra persona.
export function stessa(scelta, chi) {
  if (!scelta || !chi || scelta.p !== chi.p) return false;
  if (scelta.id && chi.id) return scelta.id === chi.id;
  return !!scelta.login && scelta.login === chi.login;
}

// I gruppi di chi ha scritto, da quello che la piattaforma dice del messaggio.
export function gruppiDi(msg) {
  const g = new Set(['tutti']);
  const badges = String(msg?.tags?.badges || '');
  if (msg?.isMod || msg?.isBroadcaster) g.add('mod');
  if (msg?.isVip || badges.includes('vip/') || msg?.tags?.vip === '1') g.add('vip');
  if (msg?.isSub) g.add('sub');
  return g;
}

// QUANTO RIGUARDA questa persona una condizione «Per chi»:
//   -1 non la riguarda;  0 vale per tutti;  1 per un suo gruppo;  2 per nome.
// «Tranne» non nomina mai nessuno a cui si rivolge: chi passa, passa come
// «tutti gli altri» (0).
export function livello(chiCond, chi, gruppi = new Set(['tutti'])) {
  const c = chiCond || null;
  if (!c) return 0;
  const perNome = c.persone.some((q) => stessa(q, chi));
  const perGruppo = c.gruppi.some((g) => gruppi.has(g));
  if (c.modo === 'tranne') return perNome || perGruppo ? -1 : 0;
  if (perNome) return 2;
  if (perGruppo) return c.gruppi.includes('tutti') ? 0 : 1;
  return -1;
}

// LA PERSONA BATTE IL GRUPPO. Fra le accoglienze che riguardano qualcuno,
// restano quelle del livello piu' alto: chi ha la sua non riceve anche quella
// dei VIP o di tutti. Torna { livello, moduli } (livello -1 = nessuna).
export function chiVince(moduli, chi, gruppi) {
  let max = -1;
  const per = [];
  for (const m of moduli || []) {
    const lv = livello(m.condizioni?.chi || null, chi, gruppi);
    if (lv < 0) continue;
    if (lv > max) { max = lv; per.length = 0; }
    if (lv === max) per.push(m);
  }
  return { livello: max, moduli: per };
}

// ── l'occasione ────────────────────────────────────────────────────────────
//
// «Arrivare» vuol dire scrivere per la prima volta in un'OCCASIONE. Per la
// diretta e' la diretta in corso, riconosciuta da quando e' cominciata (Twitch
// lo dice e non cambia con un riavvio; per Kick lo segniamo noi all'inizio);
// fuori diretta e' il giorno, nel fuso del canale. «Giorno» e' sempre il
// giorno. Un'accoglienza scatta una volta per occasione: due messaggi di fila
// non sono due arrivi.
export function occasione(quando, { twitchInizio = 0, kickDa = 0, giorno = '' } = {}) {
  if (quando === 'giorno') return 'g:' + giorno;
  if (Number(twitchInizio) > 0) return 'd:tw:' + Number(twitchInizio);
  if (Number(kickDa) > 0) return 'd:kick:' + Number(kickDa);
  return 'g:' + giorno;
}

// «Chi manca da N giorni»: serve un messaggio di prima, e abbastanza lontano.
// Chi non ha mai scritto non «torna»: arriva (per quello c'e' il primo
// messaggio in assoluto, fra gli eventi).
export function assenteDa(prima, ora) {
  const t = Number(prima) || 0;
  return t > 0 ? Math.floor((ora - t) / GIORNO_MS) : -1;
}
export function eAssente(trigger, prima, ora) {
  if (trigger?.quando !== 'assenza') return true;
  const g = assenteDa(prima, ora);
  return g >= 0 && g >= (Number(trigger.giorni) || LIMITI.giorniDef);
}

// ── la fila ────────────────────────────────────────────────────────────────
//
// Un raid di trenta persone scelte non fa trenta accoglienze in un secondo: si
// mettono in fila, una alla volta con la pausa scelta. Chi aspetta troppo si
// salta (e' passato il momento), e oltre un tetto non si entra in fila.
export function inFila(fila, voce, { ora, max = LIMITI.fila } = {}) {
  const viva = (fila || []).filter((v) => ora - v.ts <= LIMITI.attesaMaxMs);
  const saltate = (fila || []).length - viva.length;
  if (viva.length >= max) return { fila: viva, entrata: false, saltate };
  return { fila: [...viva, voce], entrata: true, saltate };
}
