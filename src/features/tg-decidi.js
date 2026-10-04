// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI ASPETTA CHE DECIDI TU (docs/TELEGRAM.md, «Decidi tu»).
//
// Ogni strada dello scudo che finisce «agli amministratori» lascia in Telegram
// una richiesta di ingresso in coda: chi l'ha fatta ha premuto il tasto di
// Telegram per chiedere di entrare, non e' nel gruppo, non legge niente e non
// puo' fare niente se non aspettare. Prima la vedeva solo chi apriva la lista
// delle richieste dentro Telegram, e lo streamer non sapeva che c'era. Adesso:
//  · il pannello la mostra, col si' e col no;
//  · al proprietario arriva un messaggio in privato, coi due tasti;
//  · decide chi arriva prima, una volta sola (tgScudo.decidi), e la decisione
//    si segna PRIMA di dirla a Telegram, come ogni esito dello scudo;
//  · se Telegram dice che la richiesta non c'e' piu' (ritirata, o decisa da un
//    amministratore dentro Telegram, che a noi non lo dice), la riga lo dice;
//  · se Telegram non risponde, la richiesta torna da decidere: non si perde.
//
// Il messaggio in privato si riscrive con l'esito da qualunque parte arrivi
// la decisione: un tasto che offre un si' gia' detto e' un tasto che mente.
import * as telegramVero from './telegram.js';
import { tgScudo as scudoDbVero } from '../db.js';
import { preferenzeDi } from './preferenze.js';
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { linguaDi } from './tg-scudo.js';

const log = makeLog('tg-decidi');

const _con = (d = {}) => ({
  telegram: d.telegram || telegramVero,
  db: d.db || scudoDbVero,
  ora: d.ora || Date.now,
  lingua: d.lingua || ((ch) => preferenzeDi(ch).lingua),
});

export const DECISIONI = ['approva', 'rifiuta'];
const STATO_DI = { approva: 'dentro', rifiuta: 'bocciata' };
// da dove e' arrivata la decisione: il pannello, o il messaggio in privato
export const DA_DOVE = ['pannello', 'messaggio'];

// Quello che Telegram risponde quando la richiesta non e' piu' quella di
// prima, detto in parole nostre. Ogni altro guasto e' un «riprova».
export function letturaErrore(errore) {
  const e = String(errore || '');
  if (/USER_ALREADY_PARTICIPANT/i.test(e)) return 'dentro';
  if (/HIDE_REQUESTER_MISSING/i.test(e)) return 'sparita';
  return 'riprova';
}

const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const pannello = () => `${String(config.baseUrl || '').replace(/\/$/, '')}/#telegram`;

const T = {
  it: {
    perche: { aiuto: 'non riusciva a vedere la prova', porta: 'dalla porta del gruppo', prova: 'non ha superato la prova', domande: 'ha sbagliato le domande', scaduta: 'non ha fatto la prova in tempo', pagina: 'la prova non si è aperta', privato: 'il messaggio con la prova non è partito' },
    chiede: ({ nome, gruppo, perche }) => `${nome} chiede di entrare in «${gruppo}»${perche ? ` (${perche})` : ''}. Aspetta fuori dal gruppo finché non decidi: puoi farlo qui o nella <a href="${pannello()}">scheda Telegram</a> del pannello.`,
    si: 'Fai entrare',
    no: 'Rifiuta',
    troppe: (gruppo) => `Stanno arrivando molte richieste per entrare in «${gruppo}»: le altre le trovi nella <a href="${pannello()}">scheda Telegram</a> del pannello, dove puoi anche rifiutarle tutte insieme.`,
    esito: {
      dentro: (n) => `${n}: richiesta accettata, adesso è nel gruppo.`,
      bocciata: (n) => `${n}: richiesta rifiutata.`,
      sparita: (n) => `${n}: la richiesta non c'è più in Telegram. È stata ritirata, o l'ha già decisa un amministratore dentro Telegram.`,
    },
    risposta: {
      dentro: 'Fatto: è nel gruppo.', bocciata: 'Fatto: richiesta rifiutata.', sparita: 'La richiesta non c’è più in Telegram.',
      gia: 'Questa richiesta è già stata decisa.', nessuna: 'Questa richiesta non c’è più.', riprova: 'Telegram non ha risposto: riprova fra poco.',
      nonTuo: 'Questo tasto è per chi gestisce il gruppo.',
    },
    senzaNome: 'Qualcuno',
  },
  en: {
    perche: { aiuto: 'could not see the check', porta: 'from the group door', prova: 'did not pass the check', domande: 'got the questions wrong', scaduta: 'did not take the check in time', pagina: 'the check did not open', privato: 'the message with the check did not go out' },
    chiede: ({ nome, gruppo, perche }) => `${nome} is asking to join «${gruppo}»${perche ? ` (${perche})` : ''}. They wait outside the group until you decide: you can do it here or in the <a href="${pannello()}">Telegram tab</a> of the panel.`,
    si: 'Let in',
    no: 'Decline',
    troppe: (gruppo) => `Lots of requests to join «${gruppo}» are coming in: you will find the others in the <a href="${pannello()}">Telegram tab</a> of the panel, where you can also decline them all at once.`,
    esito: {
      dentro: (n) => `${n}: request accepted, they are in the group now.`,
      bocciata: (n) => `${n}: request declined.`,
      sparita: (n) => `${n}: the request is no longer in Telegram. It was withdrawn, or an admin already decided it inside Telegram.`,
    },
    risposta: {
      dentro: 'Done: they are in the group.', bocciata: 'Done: request declined.', sparita: 'The request is no longer in Telegram.',
      gia: 'This request has already been decided.', nessuna: 'This request is gone.', riprova: 'Telegram did not answer: try again shortly.',
      nonTuo: 'This button is for whoever runs the group.',
    },
    senzaNome: 'Someone',
  },
  es: {
    perche: { aiuto: 'no conseguía ver la prueba', porta: 'desde la puerta del grupo', prova: 'no superó la prueba', domande: 'falló las preguntas', scaduta: 'no hizo la prueba a tiempo', pagina: 'la prueba no se abrió', privato: 'el mensaje con la prueba no salió' },
    chiede: ({ nome, gruppo, perche }) => `${nome} pide entrar en «${gruppo}»${perche ? ` (${perche})` : ''}. Espera fuera del grupo hasta que decidas: puedes hacerlo aquí o en la <a href="${pannello()}">pestaña Telegram</a> del panel.`,
    si: 'Dejar entrar',
    no: 'Rechazar',
    troppe: (gruppo) => `Están llegando muchas solicitudes para entrar en «${gruppo}»: las demás las encuentras en la <a href="${pannello()}">pestaña Telegram</a> del panel, donde también puedes rechazarlas todas a la vez.`,
    esito: {
      dentro: (n) => `${n}: solicitud aceptada, ahora está en el grupo.`,
      bocciata: (n) => `${n}: solicitud rechazada.`,
      sparita: (n) => `${n}: la solicitud ya no está en Telegram. La retiraron, o ya la decidió un administrador dentro de Telegram.`,
    },
    risposta: {
      dentro: 'Hecho: está en el grupo.', bocciata: 'Hecho: solicitud rechazada.', sparita: 'La solicitud ya no está en Telegram.',
      gia: 'Esta solicitud ya está decidida.', nessuna: 'Esta solicitud ya no existe.', riprova: 'Telegram no respondió: inténtalo de nuevo en un momento.',
      nonTuo: 'Este botón es para quien gestiona el grupo.',
    },
    senzaNome: 'Alguien',
  },
};
export const testiDecidi = (lingua) => T[linguaDi(lingua)];

// Il nome si tocca e apre il profilo: e' l'unico modo, da fuori, di vedere chi
// sta chiedendo prima di dire si'.
const nomeCliccabile = (riga, t) => `<a href="tg://user?id=${encodeURIComponent(String(riga.tg_user_id))}">${esc(riga.nome || t.senzaNome)}</a>`;

// Il tasto porta dentro di se' cosa decide e per chi: chi lo preme non deve
// andare a cercare niente, e un tasto di un'altra richiesta non tocca questa.
const PREFISSO = 'sbd:';
export const datoTasto = (decisione, chatId, userId) => `${PREFISSO}${decisione === 'approva' ? 'a' : 'r'}:${chatId}:${userId}`;
export function leggiTasto(dato) {
  const m = /^sbd:([ar]):(-?\d{1,20}):(\d{1,20})$/.exec(String(dato || ''));
  return m ? { decisione: m[1] === 'a' ? 'approva' : 'rifiuta', chatId: m[2], userId: m[3] } : null;
}
const tastiera = (riga, t) => ({ inline_keyboard: [[
  { text: t.si, callback_data: datoTasto('approva', riga.chat_id, riga.tg_user_id) },
  { text: t.no, callback_data: datoTasto('rifiuta', riga.chat_id, riga.tg_user_id) },
]] });

// Il messaggio in privato va solo a chi il bot conosce come proprietario, e
// solo se la chat privata non e' spenta.
const privatoDi = (conf) => (conf?.token && conf.owner_tg_id && (conf.dm_modo || 'me') !== 'off' ? String(conf.owner_tg_id) : '');

// UN TETTO AI MESSAGGI. Cento account che premono insieme «Non riesco a
// vederla» non devono diventare cento messaggi sul telefono di qualcuno: al
// massimo TETTO_AVVISI in FINESTRA_AVVISI_MS per canale, poi uno solo che dice
// dove sono le altre. Si tiene in memoria: dopo un riavvio si riparte da zero,
// e il peggio che succede e' qualche messaggio in piu'.
export const TETTO_AVVISI = 5;
export const FINESTRA_AVVISI_MS = 10 * 60_000;
const _finestre = new Map();

// Una richiesta e' appena passata a te: lo si dice al proprietario.
export async function avvisa(conf, riga, deps) {
  const d = _con(deps);
  const a = privatoDi(conf);
  if (!a || !riga || riga.via || riga.stato !== 'admin') return { che: 'niente' };
  const t = testiDecidi(d.lingua(conf.channel));
  const ora = d.ora();
  const prima = _finestre.get(conf.channel);
  const f = prima && ora - prima.da < FINESTRA_AVVISI_MS ? prima : { da: ora, n: 0, riassunto: false };
  _finestre.set(conf.channel, f);
  const gruppo = esc(riga.titolo || '…');
  if (f.n >= TETTO_AVVISI) {
    if (f.riassunto) return { che: 'tetto' };
    f.riassunto = true;
    await d.telegram.inviaMessaggio(conf.token, a, t.troppe(gruppo), { anteprima: false }).catch(() => null);
    return { che: 'riassunto' };
  }
  f.n++;
  const testo = t.chiede({ nome: nomeCliccabile(riga, t), gruppo, perche: t.perche[riga.motivo] || '' });
  const m = await d.telegram.inviaMessaggio(conf.token, a, testo, { anteprima: false, tastiera: tastiera(riga, t) })
    .catch((e) => ({ ok: false, errore: e?.message || '' }));
  if (!m?.ok) { log.debug(`#${conf.channel}: il messaggio «decidi tu» non parte (${m?.errore || ''})`); return { che: 'nonParte' }; }
  d.db.segnaAvviso(conf.channel, riga.chat_id, riga.tg_user_id, `${a}:${m.result?.message_id || ''}`);
  return { che: 'mandato' };
}

// Il messaggio in privato, riscritto con l'esito e senza tasti.
async function riscriviAvviso(conf, riga, esito, d) {
  const [chat, msg] = String(riga?.avviso || '').split(':');
  if (!chat || !msg || !conf?.token || !T.it.esito[esito]) return;
  const t = testiDecidi(d.lingua(conf.channel));
  await d.telegram.modificaMessaggio(conf.token, chat, msg, t.esito[esito](nomeCliccabile(riga, t))).catch(() => null);
}

// LA DECISIONE. Torna l'esito: 'dentro', 'bocciata', 'sparita' (Telegram non
// ha piu' la richiesta), 'gia' (qualcuno ha deciso prima), 'nessuna' (non e'
// una richiesta da decidere), 'riprova' (Telegram non ha risposto: torna da
// decidere com'era).
export async function decidi(conf, { chatId, userId, decisione, da = 'pannello' } = {}, deps) {
  const d = _con(deps);
  if (!conf?.token || !DECISIONI.includes(decisione)) return { esito: 'nessuna' };
  const ch = conf.channel, c = String(chatId || ''), u = String(userId || '');
  const prima = d.db.prendi(ch, c, u);
  if (!prima || prima.via) return { esito: 'nessuna' };
  if (prima.stato !== 'admin') return { esito: 'gia', stato: prima.stato };
  const stato = STATO_DI[decisione];
  if (!d.db.decidi(ch, c, u, stato, DA_DOVE.includes(da) ? da : 'pannello', d.ora())) {
    return { esito: 'gia', stato: d.db.prendi(ch, c, u)?.stato || '' };
  }
  const gesto = decisione === 'approva' ? d.telegram.approvaRichiesta : d.telegram.rifiutaRichiesta;
  const r = await gesto(conf.token, c, u).catch((e) => ({ ok: false, errore: e?.message || '' }));
  let esito = stato;
  if (!r?.ok) {
    const l = letturaErrore(r?.errore);
    if (l === 'riprova') {
      d.db.riapri(ch, c, u, stato, prima.motivo, prima.fine);
      log.debug(`#${ch}: Telegram non ha preso la decisione (${r?.errore || ''})`);
      return { esito: 'riprova' };
    }
    esito = l;
    d.db.esito(ch, c, u, l, l === 'dentro' ? 'admin' : '');
  }
  await riscriviAvviso(conf, prima, esito, d);
  return { esito };
}

// Un amministratore l'ha fatta entrare dentro Telegram: la richiesta e' decisa,
// e il messaggio in privato lo dice.
export async function entrataDaTelegram(conf, chatId, userId, deps) {
  const d = _con(deps);
  const prima = d.db.prendi(conf.channel, String(chatId), String(userId));
  if (!prima || prima.via || !d.db.decidi(conf.channel, String(chatId), String(userId), 'dentro', 'admin', d.ora())) return false;
  await riscriviAvviso(conf, prima, 'dentro', d);
  return true;
}

// Il tasto del messaggio in privato. A ogni pressione si risponde, e vale solo
// se la preme il proprietario, nella sua chat privata col bot.
export async function premuto(conf, cq, deps) {
  const k = leggiTasto(cq?.data);
  if (!k) return { che: 'altrui' };
  const d = _con(deps);
  const t = testiDecidi(d.lingua(conf.channel));
  const id = String(cq?.id || '');
  const rispondi = (testo) => (id ? d.telegram.rispondiTasto(conf.token, id, testo).catch(() => null) : null);
  const a = privatoDi(conf);
  if (!a || String(cq?.from?.id || '') !== a || String(cq?.message?.chat?.id || '') !== a) {
    await rispondi(t.risposta.nonTuo);
    return { che: 'nonTuo' };
  }
  const r = await decidi(conf, { ...k, da: 'messaggio' }, deps);
  await rispondi(t.risposta[r.esito] || t.risposta.gia);
  if (r.esito === 'gia' || r.esito === 'nessuna') {
    const riga = d.db.prendi(conf.channel, k.chatId, k.userId);
    const scritto = riga && T.it.esito[riga.stato] ? t.esito[riga.stato](nomeCliccabile(riga, t)) : t.risposta.nessuna;
    if (cq?.message?.message_id) await d.telegram.modificaMessaggio(conf.token, a, cq.message.message_id, scritto).catch(() => null);
  }
  return { che: r.esito };
}
