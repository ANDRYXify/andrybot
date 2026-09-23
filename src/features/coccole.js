// ABBRACCI, BACINI E IL BATTI IL CINQUE.
//
// Gesti fra persone in chat, senza monete: non si vince niente, si sta
// insieme. Tre regole.
//
//  · SOLO CON CHI C'E'. Come il duello: si abbraccia chi ha parlato di recente,
//    non un nome inventato.
//  · CHI NON NE VUOLE, NON NE RICEVE. `!nococcole` e da li' niente abbracci,
//    bacini o cinque verso di te, finche' non lo riscrivi. Un bacio in chat da
//    uno sconosciuto non e' per tutti, e dirlo deve costare una parola.
//  · IL CINQUE PERFETTO E' UNA QUESTIONE DI TEMPO. Lo schiocco vero nasce quando
//    i palmi arrivano insieme, a circa 45 gradi e sovrapposti a meta': l'aria
//    esce cosi' in fretta da fare un'onda d'urto. Il trucco per non mancarlo e'
//    guardare il gomito dell'altro, cioe' anticipare. In chat l'equivalente e'
//    la prontezza: chi risponde al volo fa il cinque perfetto, e l'overlay lo
//    fa vedere e sentire. Chi risponde tardi fa un cinque moscio, e chi non
//    risponde lascia l'altro con la mano alzata.
//
// Il ragionamento sta in docs/COCCOLE.md.
import { statoVivo, streamers } from '../db.js';
import { valoriDi } from './giochi-conf.js';

const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel, id) => valoriDi(streamers.get(channel)?.settings, id);

function riempi(modello, valori) {
  let t = String(modello);
  for (const [k, v] of Object.entries(valori)) t = t.split('{' + k + '}').join(String(v));
  return t;
}

// L'overlay lo da' il bot all'avvio: qui arriva gia' fatto.
let spinta = null;
export function impostaSpinta(fn) { spinta = typeof fn === 'function' ? fn : null; }

// ── chi non ne vuole ──────────────────────────────────────────────────────
const CHIAVE_NO = 'coccole-no';
const NO_MAX = 5000;
export function nonNeVuole(channel, chi) {
  const d = statoVivo.leggi(channel, CHIAVE_NO);
  return Array.isArray(d?.chi) && d.chi.includes(pulito(chi));
}
export function cambiaNo(channel, chi) {
  const d = statoVivo.leggi(channel, CHIAVE_NO);
  const lista = Array.isArray(d?.chi) ? d.chi : [];
  const io = pulito(chi);
  const prima = lista.includes(io);
  const dopo = prima ? lista.filter((x) => x !== io) : [...lista, io].slice(-NO_MAX);
  statoVivo.scrivi(channel, CHIAVE_NO, { chi: dopo });
  return !prima;
}

// ── attese per persona ────────────────────────────────────────────────────
const attese = new Map();
function inAttesa(chiave, secondi) {
  const ora = Date.now();
  if ((attese.get(chiave) || 0) > ora) return true;
  attese.set(chiave, ora + secondi * 1000);
  if (attese.size > 5000) for (const [k, t] of attese) if (t < ora) attese.delete(k);
  return false;
}

// ── abbracci e bacini ─────────────────────────────────────────────────────
const DA_SOLI = {
  abbraccio: '🤗 {a} si abbraccia da sé: anche questo è volersi bene.',
  bacio: '😘 {a} si manda un bacio allo specchio.',
};

export function gesto(tipo, channel, msg, args, say, { inChat }) {
  const c = conf(channel, tipo);
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  const chi = pulito(args[0]);
  if (inAttesa(`${channel}|${tipo}|${io}`, c.attesa)) return;
  if (!chi) { say(riempi(scegli(c.tutti), { a: nome })); return; }
  if (!/^[a-z0-9_]{2,25}$/.test(chi)) { say(`«${chi}» non è un nome valido.`); return; }
  if (chi === io) { say(riempi(DA_SOLI[tipo], { a: nome })); return; }
  if (!inChat(channel, chi)) { say(`@${chi} non è in chat adesso.`); return; }
  if (nonNeVuole(channel, chi)) { say(`@${chi} preferisce niente coccole, ma apprezza il pensiero.`); return; }
  say(riempi(scegli(c.frasi), { a: nome, b: chi }));
}

// ── il batti il cinque ────────────────────────────────────────────────────
//
// `!cinque @nome` alza la mano per qualcuno, `!cinque` da solo per chiunque.
// Chi risponde con `!cinque` (o `!cinque @chi-ha-alzato`) la batte. Il tempo
// fra la mano alzata e la risposta decide lo schiocco.
const mani = new Map();              // canale → Map(chi-alza → { nome, per, ts, timer })

const FRASI = { perfetto: 'frasiPerfetto', normale: 'frasiNormale', moscio: 'frasiMoscio' };

// Le soglie non si raddrizzano: con `pronto` sotto `perfetto` il cinque
// normale semplicemente non c'e', e oltre la scadenza la mano e' gia' giu'.
export function livelloCinque(secondi, c) {
  if (secondi <= c.perfetto) return 'perfetto';
  if (secondi <= c.pronto) return 'normale';
  return 'moscio';
}

export const maniAlzate = (channel) => [...(mani.get(channel) || new Map()).entries()].map(([chi, m]) => ({ chi, per: m.per }));

function abbassa(channel, chi) {
  const aperte = mani.get(channel);
  const m = aperte?.get(chi);
  if (!m) return null;
  clearTimeout(m.timer);
  aperte.delete(chi);
  return m;
}

export function cinque(channel, msg, args, say, { inChat }) {
  const c = conf(channel, 'cinque');
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  const bersaglio = pulito(args[0]);
  let aperte = mani.get(channel);
  if (!aperte) { aperte = new Map(); mani.set(channel, aperte); }

  // Prima si guarda se c'e' una mano da battere: una alzata per me, poi una
  // alzata per chiunque. `!cinque @nome` batte quella di nome, se c'e'. Una
  // mano alzata per se stessi non esiste: la si rifiuta prima di alzarla.
  let chi = null;
  if (bersaglio && bersaglio !== io && aperte.has(bersaglio)) {
    const m = aperte.get(bersaglio);
    if (!m.per || m.per === io) chi = bersaglio;
  } else if (!bersaglio) {
    for (const [k, m] of aperte) if (m.per === io) { chi = k; break; }
    if (!chi) for (const [k, m] of aperte) if (k !== io && !m.per) { chi = k; break; }
  }
  if (chi) {
    const m = abbassa(channel, chi);
    const livello = livelloCinque((Date.now() - m.ts) / 1000, c);
    say(riempi(scegli(c[FRASI[livello]]), { a: m.nome, b: nome }));
    try { spinta?.(channel, { tipo: 'cinque', a: m.nome, b: nome, livello }); } catch { /* l'overlay e' un di piu' */ }
    return;
  }

  // Altrimenti si alza la mano.
  if (bersaglio === io) { say(`👏 ${nome} si applaude da sé.`); return; }
  if (bersaglio && !/^[a-z0-9_]{2,25}$/.test(bersaglio)) { say(`«${bersaglio}» non è un nome valido.`); return; }
  if (bersaglio && !inChat(channel, bersaglio)) { say(`@${bersaglio} non è in chat adesso.`); return; }
  if (bersaglio && nonNeVuole(channel, bersaglio)) { say(`@${bersaglio} preferisce niente coccole, ma apprezza il pensiero.`); return; }
  if (aperte.has(io)) { say(`✋ ${nome}, hai già la mano alzata.`); return; }
  if (inAttesa(`${channel}|cinque|${io}`, c.attesa)) return;
  const timer = setTimeout(() => {
    const m = abbassa(channel, io);
    if (m) { try { say(riempi(scegli(c.frasiSospeso), { a: m.nome })); } catch { /* niente */ } }
  }, c.scadenza * 1000);
  timer.unref?.();
  aperte.set(io, { nome, per: bersaglio || '', ts: Date.now(), timer });
  say(bersaglio
    ? `✋ ${nome} alza la mano per @${bersaglio}: !cinque per batterla!`
    : `✋ ${nome} alza la mano: chi batte il cinque? !cinque`);
}

export function tryNoCoccole(channel, msg, say) {
  const ora = cambiaNo(channel, msg.user);
  const nome = msg.display || msg.user;
  say(ora
    ? `✓ ${nome}: niente abbracci, bacini e cinque verso di te. Riscrivi !nococcole quando vuoi tornare.`
    : `✓ ${nome}: coccole di nuovo accese.`);
}
