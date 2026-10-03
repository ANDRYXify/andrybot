// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO, attaccato a Telegram e al database.
//
// La REGOLA sta in tg-scudo.js e si prova senza rete. Qui ci sono i gesti:
// ricevere una richiesta, aprire la pagina (subito col guardiano, in privato
// senza), giudicare quello che la pagina manda, dire a Telegram l'esito,
// chiudere le richieste scadute.
//
// L'ordine conta, e per tre ragioni:
//  · col guardiano Telegram da' dieci secondi: prima della chiamata che apre
//    la pagina c'e' solo la riga nel database (un istante, e la pagina che si
//    apre deve trovarla), nessuna altra attesa di rete;
//  · l'esito si SEGNA prima di dirlo a Telegram, con un cambio di stato che
//    riesce una volta sola (tgScudo.chiudi): due invii, o un invio e la
//    scadenza, non fanno due chiamate a Telegram;
//  · chi supera la prova entra solo con approve; ogni guasto lungo la strada
//    finisce in un rifiuto o in mano agli amministratori. Non c'e' un ramo che
//    apra la porta per errore.
import * as telegramVero from './telegram.js';
import { tgScudo as scudoDbVero } from '../db.js';
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { validaInitDataCon } from './tgapp.js';
import {
  normScudo, chiChiede, azioneRichiesta, codiceNuovo, esitoInvio, decisioneNo, domandePubbliche,
  firmaDomande, linguaDi, altraImmagine, IMMAGINI, TENTATIVI,
} from './tg-scudo.js';
import { testiScudo, testiPagina } from './tg-scudo-testi.js';
import * as provaVera from './tg-scudo-prova.js';

const log = makeLog('tg-scudo');

// Telegram, il database, la prova e l'orologio arrivano da fuori, con dentro i
// veri: e' l'unico modo per mettere alla prova l'ORDINE dei gesti senza un
// gruppo vero e senza rete.
const _con = (d = {}) => ({
  telegram: d.telegram || telegramVero,
  db: d.db || scudoDbVero,
  prova: d.prova || provaVera,
  ora: d.ora || Date.now,
  url: d.url || urlVerifica,
});

const leggi = (s) => { try { const p = JSON.parse(s || 'null'); return p && typeof p === 'object' ? p : null; } catch { return null; } };
export const scudoDi = (conf) => normScudo(leggi(conf?.scudo));
export const invitoDi = (conf) => leggi(conf?.scudo_invito);
export const acceso = (conf) => !!(conf?.token && conf?.interattivo && scudoDi(conf).attivo);

// L'indirizzo della pagina di verifica: sull'indirizzo corto se c'e'
// (telegram.<dominio>/<canale>/verifica), se no sul sito.
export function urlVerifica(canale) {
  const c = encodeURIComponent(String(canale || '').toLowerCase());
  return config.telegramHost ? `https://${config.telegramHost}/${c}/verifica` : `${String(config.baseUrl || '').replace(/\/$/, '')}/telegram/${c}/verifica`;
}
// La porta pubblica: telegram.<dominio>/<canale>, o /telegram/<canale>.
export function urlPorta(canale) {
  const c = encodeURIComponent(String(canale || '').toLowerCase());
  return config.telegramHost ? `https://${config.telegramHost}/${c}` : `${String(config.baseUrl || '').replace(/\/$/, '')}/telegram/${c}`;
}

const escHtml = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Dire a Telegram com'e' finita. Col guardiano si risponde alla sua domanda;
// se quella non vale piu' (troppo tardi, gia' risposta), per approvare e
// rifiutare c'e' la strada di sempre col gruppo e la persona. «Agli
// amministratori» senza guardiano vuol dire non fare niente: la richiesta resta
// nella loro lista, che e' esattamente il posto giusto.
async function risolvi(conf, riga, decisione, telegram) {
  const tok = conf.token;
  const q = riga.query_id;
  if (decisione === 'approva') {
    if (q) { const r = await telegram.rispondiRichiesta(tok, q, 'approve').catch(() => ({ ok: false })); if (r.ok) return r; }
    return telegram.approvaRichiesta(tok, riga.chat_id, riga.tg_user_id).catch((e) => ({ ok: false, errore: e?.message || '' }));
  }
  if (decisione === 'rifiuta') {
    if (q) { const r = await telegram.rispondiRichiesta(tok, q, 'decline').catch(() => ({ ok: false })); if (r.ok) return r; }
    return telegram.rifiutaRichiesta(tok, riga.chat_id, riga.tg_user_id).catch((e) => ({ ok: false, errore: e?.message || '' }));
  }
  if (q) return telegram.rispondiRichiesta(tok, q, 'queue').catch(() => ({ ok: false }));
  return { ok: true };
}

// Chiude una richiesta in attesa con un esito, e lo dice a Telegram. Torna
// false se la riga era gia' chiusa (qualcun altro e' arrivato prima).
async function chiudiE(conf, riga, decisione, motivo, { telegram, db, ora }) {
  const stato = decisione === 'approva' ? 'passata' : decisione === 'rifiuta' ? 'bocciata' : 'admin';
  if (!db.chiudi(riga.channel, riga.chat_id, riga.tg_user_id, stato, motivo, ora())) return { chiusa: false };
  const r = await risolvi(conf, riga, decisione, telegram);
  if (!r?.ok && decisione === 'approva') {
    db.esito(riga.channel, riga.chat_id, riga.tg_user_id, 'errore', 'telegram');
    log.debug(`#${conf.channel}: approvazione rifiutata da Telegram (${r?.errore || ''})`);
    return { chiusa: true, stato: 'errore' };
  }
  return { chiusa: true, stato };
}

// ── la richiesta ────────────────────────────────────────────────────────────
export async function richiesta(conf, update, deps) {
  const d = _con(deps);
  const chi = chiChiede(update);
  if (!chi || !conf?.token) return { che: 'nessuno' };
  const s = scudoDi(conf);
  const prima = d.db.prendi(conf.channel, chi.chatId, chi.userId);
  const azione = azioneRichiesta({ acceso: acceso(conf), chi, prima, ora: d.ora() });
  if (azione === 'niente') return { che: 'niente' };
  if (azione === 'coda') {
    await d.telegram.rispondiRichiesta(conf.token, chi.queryId, 'queue').catch(() => {});
    return { che: 'coda' };
  }
  if (azione === 'rifiuta') {
    const finta = { channel: conf.channel, chat_id: chi.chatId, tg_user_id: chi.userId, query_id: chi.queryId };
    await risolvi(conf, finta, 'rifiuta', d.telegram);
    return { che: 'rifiutato' };
  }
  const lingua = chi.lingua;
  const riga = d.db.apri({
    channel: conf.channel, chatId: chi.chatId, userId: chi.userId, nome: chi.nome, titolo: chi.titolo, lingua,
    queryId: chi.queryId, scad: d.ora() + s.minuti * 60_000, ora: d.ora(),
  });
  const url = `${d.url(conf.channel)}?c=${encodeURIComponent(chi.chatId)}`;
  if (azione === 'guardiano') {
    const r = await d.telegram.mostraVerifica(conf.token, chi.queryId, url).catch((e) => ({ ok: false, errore: e?.message || '' }));
    if (r?.ok) return { che: 'guardiano' };
    // la pagina non si e' potuta aprire: decidono gli amministratori
    log.debug(`#${conf.channel}: il guardiano non apre la pagina (${r?.errore || ''})`);
    await chiudiE(conf, riga, 'admin', 'pagina', d);
    return { che: 'admin' };
  }
  // in privato: un messaggio col tasto che apre la pagina
  const t = testiScudo(linguaDi(lingua));
  const testo = escHtml(t.privato({ nome: chi.nome || '…', gruppo: chi.titolo || '…', minuti: s.minuti }));
  const msg = await d.telegram.inviaMessaggio(conf.token, chi.userChatId, testo, {
    anteprima: false, tastiera: { inline_keyboard: [[{ text: t.tasto, web_app: { url } }]] },
  }).catch((e) => ({ ok: false, errore: e?.message || '' }));
  if (msg?.ok) return { che: 'privato' };
  log.debug(`#${conf.channel}: non riesco a scrivere in privato (${msg?.errore || ''})`);
  await chiudiE(conf, riga, 'admin', 'privato', d);
  return { che: 'admin' };
}

// Qualcuno e' entrato nel gruppo mentre la sua richiesta era in attesa: lo ha
// fatto entrare un amministratore a mano. La richiesta e' finita, e la pagina,
// se si apre, lo dice.
export function entrato(conf, update, deps) {
  const d = _con(deps);
  const cm = update?.chat_member;
  const u = cm?.new_chat_member?.user;
  if (!cm?.chat?.id || !u?.id || cm.new_chat_member?.status !== 'member') return false;
  return d.db.chiudi(conf.channel, String(cm.chat.id), String(u.id), 'dentro', 'admin', d.ora());
}

// ── la pagina ───────────────────────────────────────────────────────────────
//
// Chi sei lo dice SOLO la firma di Telegram: initData validato col token del
// bot di questo canale, non piu' vecchio di un'ora. Il gruppo arriva dalla
// firma (guardiano) o dall'indirizzo (in privato); in tutti e due i casi la
// richiesta deve esistere per quel canale, quel gruppo e quella persona.
export const VITA_FIRMA_S = 3600;
export function identifica(conf, initData, c, deps) {
  const d = _con(deps);
  if (!conf?.token) return { ok: false, motivo: 'canale' };
  const v = validaInitDataCon(conf.token, String(initData || ''), VITA_FIRMA_S, d.ora());
  if (!v.ok || !v.authDate) return { ok: false, motivo: 'firma' };
  const chatId = v.chat?.id || String(c || '');
  if (!/^-?\d{1,20}$/.test(chatId)) return { ok: false, motivo: 'gruppo' };
  return { ok: true, userId: v.user.id, chatId, queryId: v.queryRichiesta || '', lingua: v.user.language_code || '' };
}

// La riga di chi ha aperto la pagina, se e' davvero la sua.
function rigaDi(conf, id, d) {
  const r = d.db.prendi(conf.channel, id.chatId, id.userId);
  if (!r) return null;
  // col guardiano, la domanda deve essere la stessa che Telegram ha firmato
  if (r.query_id && id.queryId && r.query_id !== id.queryId) return null;
  return r;
}

// Le richieste scadute si chiudono anche da qui, non solo dal giro: chi apre la
// pagina un attimo dopo la scadenza deve leggere com'e' finita.
async function seScaduta(conf, r, d) {
  if (r.stato !== 'attesa' || !(Number(r.scad) > 0) || d.ora() <= Number(r.scad)) return r;
  const dec = decisioneNo(scudoDi(conf), 'scaduta');
  await chiudiE(conf, r, dec, 'scaduta', d);
  return d.db.prendi(r.channel, r.chat_id, r.tg_user_id) || r;
}

// Come la pagina chiama l'esito di una riga chiusa.
const ESITO_DI = { passata: 'dentro', dentro: 'dentro', bocciata: 'no', admin: 'admin', errore: 'errore' };
const esitoRiga = (r) => (r.motivo === 'scaduta' && r.stato !== 'passata' ? 'scaduta' : ESITO_DI[r.stato] || 'chiusa');

export async function apri(conf, id, { colori = null } = {}, deps) {
  const d = _con(deps);
  const lingua = linguaDi(id.lingua);
  let r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa', lingua, t: testiPagina(lingua) };
  r = await seScaduta(conf, r, d);
  const l = linguaDi(id.lingua || r.lingua);
  const t = testiPagina(l, { gruppo: r.titolo });
  if (r.stato !== 'attesa') return { esito: esitoRiga(r), lingua: l, t };
  const s = scudoDi(conf);
  const ts = testiScudo(l);
  const prove = Math.max(0, IMMAGINI - (Number(r.immagini) || 0));
  const minuti = Math.max(1, Math.ceil(((Number(r.scad) || 0) - d.ora()) / 60_000));
  return {
    esito: 'attesa', lingua: l, t,
    regole: s.regole.attivo ? s.regole.testo : '',
    domande: domandePubbliche(s), firma: firmaDomande(s),
    scade: Number(r.scad) || 0, ora: d.ora(),
    // la prima prova la chiede la pagina appena aperta: le «altre» sono quelle dopo
    prove, altra: ts.altra(Math.max(0, prove - 1)), tempo: ts.tempo(minuti),
    disegnabile: d.prova.disegnabile(),
    colori,
  };
}

// Le parole di una prova nuova, per la risposta che porta i fotogrammi.
export const altraIn = (lingua, prove) => testiScudo(linguaDi(lingua)).altra(Math.max(0, prove));

// Una prova nuova. Torna i byte dei fotogrammi, o perche' non si puo'.
export async function immagine(conf, id, deps) {
  const d = _con(deps);
  let r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa' };
  await seScaduta(conf, r, d);
  r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa' };
  if (r.stato !== 'attesa') return { esito: esitoRiga(r) };
  if (!altraImmagine(r)) return { esito: 'finite' };
  if (!d.prova.disegnabile()) return { esito: 'disegno' };
  const codice = codiceNuovo();
  if (!d.db.nuovaProva(r.channel, r.chat_id, r.tg_user_id, codice)) return { esito: 'finite' };
  const bin = await d.prova.provaInMovimento(codice);
  if (!bin) return { esito: 'disegno' };
  return { esito: 'ok', bin, prove: Math.max(0, IMMAGINI - (Number(r.immagini) || 0) - 1) };
}

// Quello che la pagina manda: regole, codice, risposte, l'impronta delle
// domande che ha mostrato. La lettura della riga, il giudizio e la scrittura
// stanno insieme senza attese in mezzo: due invii non si mescolano.
export async function invia(conf, id, corpo = {}, deps) {
  const d = _con(deps);
  let r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa' };
  await seScaduta(conf, r, d);
  // Da qui alla scrittura dei tentativi non c'e' nessuna attesa: la riga si
  // rilegge DOPO l'ultima, cosi' cento invii in parallelo si mettono in fila
  // e ognuno vede i tentativi lasciati dal precedente. Con la riga letta prima
  // dell'attesa, tutti avrebbero contato dallo stesso numero, e i tentativi
  // sarebbero stati quanti se ne mandano insieme.
  r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa' };
  const l = linguaDi(id.lingua || r.lingua);
  const t = testiScudo(l);
  const s = scudoDi(conf);
  const e = esitoInvio({
    riga: r, scudo: s, regoleOk: corpo.regole === true, codice: String(corpo.codice || '').slice(0, 32),
    risposte: Array.isArray(corpo.risposte) ? corpo.risposte.slice(0, 8) : [], firma: String(corpo.firma || ''), ora: d.ora(),
  });
  switch (e.esito) {
    case 'riprova':
      d.db.sbagliato(r.channel, r.chat_id, r.tg_user_id, e.tentativi, false);
      return { esito: 'riprova', msg: t.errori.riprova(e.restano) };
    case 'nuova':
      d.db.sbagliato(r.channel, r.chat_id, r.tg_user_id, e.tentativi, true);
      return { esito: 'nuova', msg: t.errori.nuova };
    case 'regole': return { esito: 'regole', msg: t.errori.regole };
    case 'immagine': return { esito: 'nuova', msg: t.errori.nuova };
    case 'cambiato': return { esito: 'cambiato', msg: t.errori.cambiato };
    case 'chiusa': return { esito: esitoRiga(r) };
    case 'scaduta': return { esito: 'scaduta' };
    case 'no': {
      const dec = decisioneNo(s, e.motivo);
      const fatto = await chiudiE(conf, r, dec, e.motivo, d);
      if (!fatto.chiusa) return { esito: esitoRiga(d.db.prendi(r.channel, r.chat_id, r.tg_user_id) || r) };
      return { esito: dec === 'admin' ? 'admin' : 'no' };
    }
    case 'passa': {
      const fatto = await chiudiE(conf, r, 'approva', 'prova', d);
      if (!fatto.chiusa) return { esito: esitoRiga(d.db.prendi(r.channel, r.chat_id, r.tg_user_id) || r) };
      return { esito: fatto.stato === 'errore' ? 'errore' : 'dentro' };
    }
    default: return { esito: 'chiusa' };
  }
}

// «Non riesco a vederla»: agli amministratori, sempre.
export async function aiuto(conf, id, deps) {
  const d = _con(deps);
  let r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa' };
  await seScaduta(conf, r, d);
  r = rigaDi(conf, id, d);
  if (!r) return { esito: 'chiusa' };
  if (r.stato !== 'attesa') return { esito: esitoRiga(r) };
  const fatto = await chiudiE(conf, r, 'admin', 'aiuto', d);
  return { esito: fatto.chiusa ? 'admin' : esitoRiga(d.db.prendi(r.channel, r.chat_id, r.tg_user_id) || r) };
}

// ── il giro delle scadenze ──────────────────────────────────────────────────
// `confDi` da' la configurazione di un canale: cosi' questo pezzo non sa da
// dove arriva, e nel collaudo la si passa a mano. Una riga di un canale senza
// bot si chiude lo stesso: tenerla vorrebbe dire riprovarci per sempre.
export async function giroScadenze(confDi, deps) {
  const d = _con(deps);
  const righe = d.db.scaduti(d.ora());
  let fatte = 0;
  for (const r of righe) {
    const conf = confDi(r.channel);
    if (!conf?.token) {
      d.db.chiudi(r.channel, r.chat_id, r.tg_user_id, 'admin', 'scaduta', d.ora());
      continue;
    }
    try {
      const fatto = await chiudiE(conf, r, decisioneNo(scudoDi(conf), 'scaduta'), 'scaduta', d);
      if (fatto.chiusa) fatte++;
    } catch (e) { log.debug(`scadenza #${r.channel}:`, e?.message || e); }
  }
  return fatte;
}

// ── la porta: il link d'invito del bot ──────────────────────────────────────
//
// Uno per gruppo. Con lo scudo acceso chiede l'approvazione (e quindi passa
// dalla pagina); spento, no. Si cambia lo stesso link invece di farne uno
// nuovo: chi l'ha gia' preso dalla porta non si ritrova un link morto, e non
// resta in giro un nostro link libero quando lo scudo e' acceso.
export async function invito(conf, { salva } = {}, deps) {
  const d = _con(deps);
  const chat = String(conf?.chat_id || '');
  if (!conf?.token || !chat) return { ok: false, motivo: 'gruppo' };
  const richiesta = scudoDi(conf).attivo;
  const cur = invitoDi(conf);
  if (cur?.url && cur.chat === chat) {
    if (cur.richiesta === richiesta) return { ok: true, url: cur.url, richiesta };
    const r = await d.telegram.cambiaInvito(conf.token, chat, cur.url, { richiesta }).catch(() => ({ ok: false }));
    if (r?.ok && !r.revocato) {
      salva?.({ chat, url: r.url, richiesta: r.richiesta });
      return { ok: true, url: r.url, richiesta: r.richiesta };
    }
  }
  const r = await d.telegram.creaInvito(conf.token, chat, { richiesta }).catch(() => ({ ok: false }));
  if (!r?.ok || !r.url) return { ok: false, motivo: 'invito', errore: r?.errore || '' };
  salva?.({ chat, url: r.url, richiesta: r.richiesta });
  return { ok: true, url: r.url, richiesta: r.richiesta };
}

// ── l'anteprima del pannello ────────────────────────────────────────────────
//
// Lo streamer prova la sua pagina dal pannello. Passa dagli STESSI gesti
// (apri, immagine, invia, aiuto) di chi chiede davvero, con una richiesta finta
// tenuta in memoria e un Telegram che non chiama nessuno: l'anteprima non puo'
// comportarsi in un modo diverso dalla pagina vera, perche' e' la stessa strada.
// La memoria ha le stesse regole del database: la chiusura riesce una volta
// sola, le prove sono contate.
export function memoria() {
  let r = null;
  return {
    apri({ channel, chatId, userId, titolo = '', lingua = '', scad = 0, ora = Date.now() }) {
      r = { channel, chat_id: String(chatId), tg_user_id: String(userId), nome: '', titolo, lingua, query_id: '',
        stato: 'attesa', motivo: '', codice: '', tentativi: 0, immagini: 0, scad, ts: ora, fine: 0 };
      return { ...r };
    },
    prendi() { return r ? { ...r } : null; },
    nuovaProva(_c, _g, _u, codice) {
      if (!r || r.stato !== 'attesa' || r.immagini >= IMMAGINI) return false;
      r.codice = codice; r.tentativi = 0; r.immagini++;
      return true;
    },
    sbagliato(_c, _g, _u, tentativi, spento) {
      if (r?.stato !== 'attesa') return;
      r.tentativi = tentativi;
      if (spento) r.codice = '';
    },
    chiudi(_c, _g, _u, stato, motivo = '', ora = Date.now()) {
      if (!r || r.stato !== 'attesa') return false;
      Object.assign(r, { stato, motivo, codice: '', fine: ora });
      return true;
    },
    esito(_c, _g, _u, stato, motivo = '') { if (r) Object.assign(r, { stato, motivo }); },
    scaduti() { return []; },
  };
}
const fatto = async () => ({ ok: true });
export const telegramMuto = {
  rispondiRichiesta: fatto, approvaRichiesta: fatto, rifiutaRichiesta: fatto, mostraVerifica: fatto, inviaMessaggio: fatto,
};

export { TENTATIVI, IMMAGINI };
