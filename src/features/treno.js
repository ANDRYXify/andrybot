// L'HYPE TRAIN: non e' nostro, e' di Twitch. Noi lo RISPECCHIAMO.
//
// Sembra una sfumatura e invece decide tutto il resto. Il treno lo potremmo
// ricalcolare da soli: i sub e i bit ci passano davanti uno per uno, bastava
// sommarli. Sarebbe stata una SECONDA verita' che con la prima non torna, e
// nessuno se ne sarebbe accorto se non mettendo Twitch e l'overlay uno accanto
// all'altro — perche' le soglie cambiano da canale a canale e nel tempo,
// perche' esistono i treni CONDIVISI fra piu' canali, e perche' esistono i
// treni speciali (tesoro, golden kappa) che non seguono la regola normale.
//
// Twitch dice livello, punti, traguardo, scadenza e chi ha spinto di piu'.
// Quello mostriamo. Da qui scendono tre cose che se no sarebbero state tre
// decisioni da prendere (e da sbagliare):
//
//  · UN TRENO SOLO. Lo stato si porta dietro l'id del treno di Twitch: un
//    evento con un id diverso SOSTITUISCE, non somma. Due treni in memoria non
//    possono esistere perche' non c'e' posto dove metterli.
//  · NON TOCCA NE' IL SUBATHON NE' GLI OBIETTIVI. I sub e i bit che fanno il
//    treno sono passati gia' di la', uno per uno. Contarli di nuovo qui e'
//    contarli due volte: e' lo stesso difetto delle raffiche di sub regalati, e
//    la cura e' la stessa — si conta dove si conta, e basta.
//  · LA SCADENZA LA DICE TWITCH. Si salva l'ISTANTE, e chi lo mostra fa la
//    sottrazione: come il conto alla rovescia. Non c'e' un secondo orologio da
//    tenere d'accordo, e un riavvio non sposta niente.
//
// Lo stato sta nelle impostazioni del canale, come gli obiettivi: un OBS
// riaperto a meta' treno lo ritrova, e il bot riavviato pure.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('treno');

// Gli eventi di Twitch, nella VERSIONE 2: la 1 e' deprecata, e la 2 e' l'unica
// che sa dei treni condivisi e di quelli speciali.
export const EVENTI = {
  'channel.hype_train.begin': 'parte',
  'channel.hype_train.progress': 'cresce',
  'channel.hype_train.end': 'finisce',
};

// Quanto resta in scena il cartello di fine. Non e' un'attesa: e' il momento in
// cui la gente guarda il livello raggiunto, e toglierlo nell'istante esatto in
// cui il treno finisce vorrebbe dire non farlo vedere a nessuno.
const CODA_MS = 20_000;

export const regoleDi = (settings) => settings?.overlayTreno || null;
export const inScena = (settings) => regoleDi(settings)?.attivo === true;
export const annuncia = (settings) => regoleDi(settings)?.annuncia === true;
// Se non e' ne' in scena ne' in chat, non c'e' niente da tenere: non si scrive
// nemmeno lo stato. Un canale che il treno non lo usa non paga una riga.
export const serve = (settings) => inScena(settings) || annuncia(settings);

const quando = (s) => { const t = Date.parse(String(s || '')); return Number.isFinite(t) ? t : 0; };
const COME = { bits: 'bit', subscription: 'sub' };

// Da un evento di Twitch allo stato del treno. PURA: si prova senza database e
// senza orologio. Quel che Twitch non manda non si inventa — `progress` non
// porta il record storico, e infatti qui non compare: lo tiene chi aggiorna.
export function daEvento(tipo, d, { ora = Date.now() } = {}) {
  const che = EVENTI[tipo];
  if (!che || !d || typeof d !== 'object') return null;
  const chi = (Array.isArray(d.top_contributions) ? d.top_contributions : []).slice(0, 3).map((c) => ({
    nome: String(c?.user_name || c?.user_login || '').slice(0, 40),
    quanti: Math.max(0, Number(c?.total) || 0),
    come: COME[String(c?.type || '')] || 'altro',
  })).filter((c) => c.nome);
  const base = {
    id: String(d.id || '').slice(0, 64),
    livello: Math.max(1, Math.round(Number(d.level) || 1)),
    totale: Math.max(0, Math.round(Number(d.total) || 0)),
    tipo: ['treasure', 'golden_kappa'].includes(String(d.type || '')) ? String(d.type) : 'normale',
    condiviso: d.is_shared_train === true,
    inizio: quando(d.started_at) || ora,
    chi,
  };
  if (che === 'finisce') {
    return { ...base, che, quanto: 0, meta: 0, finito: true, scade: ora + CODA_MS, record: 0 };
  }
  return {
    ...base,
    che,
    quanto: Math.max(0, Math.round(Number(d.progress) || 0)),
    meta: Math.max(1, Math.round(Number(d.goal) || 1)),
    finito: false,
    scade: quando(d.expires_at) || 0,
    record: Math.max(0, Math.round(Number(d.all_time_high_level) || 0)),
  };
}

export const trenoDi = (settings) => settings?.overlayStato?.treno || null;

// IN SCENA C'E' ANCORA? Un treno scaduto non e' un treno: la domanda si fa
// sempre col confronto sull'istante, mai con un contatore che scorre.
export const vivo = (t, ora = Date.now()) => !!(t && t.scade > ora);

// Il treno in parole, per la chat e per i test: «livello 3».
export const inParole = (t) => (t ? `livello ${t.livello}` : '');

const riempi = (tpl, vars) => String(tpl || '')
  .replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
  .slice(0, 300);

// Chi ha spinto di piu', in una parola sola per la chat.
export const primo = (t) => (t && t.chi && t.chi.length ? t.chi[0].nome : '');

// L'AGGIORNAMENTO. Torna { treno, saltato } oppure null se non c'era niente da
// fare. `saltato` e' il livello nuovo quando il treno e' salito di livello:
// e' l'unico momento in cui vale la pena aprire bocca in chat, perche'
// `progress` arriva a OGNI contributo e annunciarli tutti sarebbe spam.
export function aggiorna(channel, nuovo, { ora = Date.now() } = {}) {
  if (!nuovo) return null;
  const s = streamers.get(channel);
  if (!s || !serve(s.settings)) return null;
  const vecchio = trenoDi(s.settings);
  // Stesso treno o treno nuovo: lo dice l'id. Il record storico Twitch lo manda
  // solo quando il treno parte, quindi se ora non c'e' si tiene quello di prima.
  const stesso = !!(vecchio && nuovo.id && vecchio.id === nuovo.id);
  const treno = { ...nuovo, record: nuovo.record || (stesso ? (vecchio.record || 0) : 0) };
  const saltato = (stesso && !treno.finito && treno.livello > vecchio.livello) ? treno.livello : 0;
  const stato = { ...(s.settings?.overlayStato || {}), treno };
  streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
  return { treno, saltato };
}

// Da un evento del bot allo stato scritto, all'avviso in chat e alla spinta
// all'overlay. Chi chiama non deve sapere niente di livelli e di scadenze.
export function suEvento(channel, tipo, dati, { say, spingi, ora = Date.now() } = {}) {
  try {
    const nuovo = daEvento(tipo, dati, { ora });
    if (!nuovo) return null;
    const esito = aggiorna(channel, nuovo, { ora });
    if (!esito) return null;
    const s = streamers.get(channel);
    if (inScena(s?.settings)) {
      try { spingi?.(channel, esito.treno); } catch (e) { log.debug('spinta:', e?.message || e); }
    }
    if (say && annuncia(s?.settings)) {
      const r = regoleDi(s.settings);
      const vars = { livello: esito.treno.livello, chi: primo(esito.treno) || 'voi', punti: esito.treno.totale };
      const testo = nuovo.che === 'parte' ? riempi(r.testoParte, vars)
        : nuovo.che === 'finisce' ? riempi(r.testoFine, vars)
          : esito.saltato ? riempi(r.testoLivello, vars) : '';
      if (testo.trim()) say(channel, testo);
    }
    return esito;
  } catch (e) { log.debug('suEvento:', e?.message || e); return null; }
}

// «!treno»: a che punto siamo. Risponde solo se c'e' un treno in corso: un
// comando che dice «non c'e' nessun treno» a ogni curioso e' un modo per far
// dire al bot cose che non servono a nessuno.
export function tryComando(msg, parla, { ora = Date.now() } = {}) {
  if (!msg || msg.isSelf) return false;
  const testo = String(msg.text || '').trim();
  if (!testo.startsWith('!')) return false;
  if ((testo.slice(1).split(/\s+/)[0] || '').toLowerCase() !== 'treno') return false;
  const s = streamers.get(msg.channel);
  if (!s || !serve(s.settings)) return false;
  const t = trenoDi(s.settings);
  if (!vivo(t, ora) || t.finito) return false;
  const manca = Math.max(0, Math.round((t.scade - ora) / 1000));
  parla(`Hype train al ${inParole(t)}: ${t.quanto} punti su ${t.meta} per il prossimo, e restano ${manca} secondi.`);
  return true;
}
