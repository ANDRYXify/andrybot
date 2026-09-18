// IL CANCELLO, attaccato a Telegram e al database.
//
// La REGOLA sta in tg-ingresso.js e si prova senza rete. Qui ci sono i gesti:
// silenziare, scrivere il messaggio col tasto, ridare i permessi, cacciare chi
// non risponde.
//
// La cosa importante e' l'ORDINE, ed e' quello che rende impossibile il difetto
// peggiore — qualcuno muto per sempre senza un modo per dimostrare niente:
//
//   1. si leggono i permessi del gruppo. Se non si leggono, non si tocca nessuno.
//   2. si silenzia.
//   3. si scrive il messaggio col tasto. SE QUESTO FALLISCE si ridanno subito i
//      permessi: aver tolto la parola senza aver dato il modo di riprendersela
//      non e' uno stato in cui questo codice puo' lasciare qualcuno.
//   4. solo adesso si segna l'attesa.
import * as telegramVero from './telegram.js';
import { tgAttesa as attesaVera } from '../db.js';
import { makeLog } from '../logger.js';
import {
  chiEntra, tastiera, testoBenvenuto, permessiDi, MUTO, inMinuti,
  modoScaduto, esitoTasto, leggiTasto, TASTO_DEF,
} from './tg-ingresso.js';

const log = makeLog('tg-cancello');
const ora = () => Date.now();

// Telegram e il database arrivano da fuori, con dentro i veri. Non e' un vezzo:
// e' l'unico modo per mettere alla prova l'ORDINE dei gesti — che e' la cosa che
// qui conta piu' di ogni altra — senza un gruppo vero e senza rete.
const _con = (d = {}) => ({ telegram: d.telegram || telegramVero, attesa: d.attesa || attesaVera });

export const acceso = (conf) => !!(conf && conf.ingresso && conf.token && conf.interattivo);

// Qualcuno e' entrato. Torna cosa e' successo, cosi' chi chiama puo' dirlo (e il
// collaudo puo' guardarlo) invece di doverlo indovinare dagli effetti.
export async function entrato(conf, update, deps) {
  const { telegram, attesa } = _con(deps);
  if (!acceso(conf)) return { che: 'spento' };
  const e = chiEntra(update);
  if (!e) return { che: 'nessuno' };

  const info = await telegram.infoChat(conf.token, e.chatId);
  const permessi = permessiDi(info.chat);
  if (!permessi) {
    log.debug(`#${conf.channel}: niente permessi del gruppo, non silenzio nessuno`);
    return { che: 'senzaPermessi' };
  }

  const muto = await telegram.limitaMembro(conf.token, e.chatId, e.userId, MUTO);
  if (!muto.ok) {
    log.debug(`#${conf.channel}: non posso limitare (${muto.errore || ''})`);
    return { che: 'nonPosso', errore: muto.errore || '' };
  }

  const minuti = inMinuti(conf.ingresso_minuti);
  const testo = testoBenvenuto({ nome: e.nome, minuti, template: conf.ingresso_testo });
  const msg = await telegram.inviaMessaggio(conf.token, e.chatId, testo, {
    anteprima: false,
    tastiera: tastiera(e.userId, conf.ingresso_tasto || TASTO_DEF),
  });
  if (!msg.ok) {
    // passo 3 fallito: si disfa il passo 2, subito.
    await telegram.limitaMembro(conf.token, e.chatId, e.userId, permessi).catch(() => {});
    log.debug(`#${conf.channel}: non riesco a scrivere il benvenuto, ridati i permessi`);
    return { che: 'nonScrivo', errore: msg.errore || '' };
  }

  attesa.metti({
    channel: conf.channel,
    chatId: e.chatId,
    userId: e.userId,
    nome: e.nome,
    msgId: String(msg.result?.message_id || ''),
    scad: ora() + minuti * 60_000,
  });
  return { che: 'inAttesa', userId: e.userId, minuti };
}

// Qualcuno ha premuto. Si risponde SEMPRE, qualunque cosa sia successa: la
// risposta non e' una conseguenza dell'esito, e' un dovere a parte.
export async function premuto(conf, cq, deps) {
  const { telegram, attesa } = _con(deps);
  const chiPreme = String(cq?.from?.id || '');
  const chatId = String(cq?.message?.chat?.id || '');
  const dato = String(cq?.data || '');
  const id = String(cq?.id || '');
  if (!leggiTasto(dato)) return { che: 'altrui' };   // un tasto di qualcun altro, non nostro

  const riga = chatId ? attesa.prendi(conf.channel, chatId, chiPreme) : null;
  const esito = esitoTasto({ dato, chiPreme, inAttesa: !!riga });
  if (id) await telegram.rispondiTasto(conf.token, id, esito.risposta).catch(() => {});
  if (!esito.apri) return { che: esito.che };

  const info = await telegram.infoChat(conf.token, chatId);
  const permessi = permessiDi(info.chat);
  if (!permessi) {
    log.debug(`#${conf.channel}: non leggo i permessi del gruppo, non riapro`);
    return { che: 'senzaPermessi' };
  }
  const r = await telegram.limitaMembro(conf.token, chatId, chiPreme, permessi);
  if (!r.ok) return { che: 'nonPosso', errore: r.errore || '' };
  if (riga?.msg_id) await telegram.eliminaMessaggio(conf.token, chatId, riga.msg_id).catch(() => {});
  attesa.togli(conf.channel, chatId, chiPreme);
  return { che: 'aperto', userId: chiPreme };
}

// Il giro delle scadenze. `confDi` prende un canale e restituisce la sua
// configurazione: cosi' questo pezzo non sa da dove arriva, e nel collaudo la
// configurazione la si passa a mano.
export async function giroScadenze(confDi, adesso = ora(), deps) {
  const { telegram, attesa } = _con(deps);
  const righe = attesa.scaduti(adesso);
  let fatti = 0;
  for (const r of righe) {
    const conf = confDi(r.channel);
    // la riga si toglie comunque: se il cancello e' stato spento o il bot
    // staccato, tenerla vuol dire riprovarci per sempre
    attesa.togli(r.channel, r.chat_id, r.tg_user_id);
    if (!conf || !conf.token) continue;
    try {
      if (r.msg_id) await telegram.eliminaMessaggio(conf.token, r.chat_id, r.msg_id).catch(() => {});
      if (modoScaduto(conf.ingresso_scaduto) === 'caccia') {
        await telegram.cacciaMembro(conf.token, r.chat_id, r.tg_user_id);
      }
      // 'muto': non si fa niente. E' gia' muto, e ci resta.
      fatti++;
    } catch (e) { log.debug(`scadenza #${r.channel}:`, e?.message || e); }
  }
  return fatti;
}
