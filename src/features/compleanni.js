// Auguri di compleanno: nel gruppo Telegram e in chat.
//
// Un compleanno e' di una PERSONA su un canale, non di un membro di un gruppo:
// il gruppo e' solo uno dei posti da cui quella persona ci parla. Percio' la
// chiave della tabella `compleanni` (db.js) dice CHI, e ha tre forme che non si
// possono confondere: l'id Telegram (cifre), `man_...` per chi lo streamer
// aggiunge a mano, e `chat:<login nostro>` per chi se lo segna dalla chat.
//
// In chat non esiste «a mezzanotte»: esiste «quando c'e'». Gli auguri nel gruppo
// partono a mezzanotte italiana, in chat al PRIMO messaggio della persona nel
// giorno del suo compleanno — una volta l'anno, come nel gruppo. Chi quel giorno
// non passa non riceve niente, ed e' giusto: gli auguri si fanno a chi c'e'.
//
// Il parsing della data, il testo e il giorno di oggi restano funzioni pure, e
// si provano senza rete e senza database.
import { streamers, compleanni } from '../db.js';
import { loginSu } from '../identita.js';

const MESI = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};
const GIORNI_MAX = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const AUGURI_DEFAULT = '🎂 Tanti auguri {menzione}! 🎉 Buon compleanno da tutta la community!';

const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function valida(giorno, mese) {
  if (!(mese >= 1 && mese <= 12)) return null;
  if (!(giorno >= 1 && giorno <= GIORNI_MAX[mese - 1])) return null;
  return { giorno, mese };
}

// Parsa una data di compleanno: "25/12", "25-12", "25.12", "25 12", "25 dicembre".
export function parseData(s) {
  const t = String(s || '').toLowerCase().trim();
  let m = t.match(/^(\d{1,2})\s*[\/\-. ]\s*(\d{1,2})$/);
  if (m) return valida(+m[1], +m[2]);
  m = t.match(/^(\d{1,2})\s+([a-zàèéìòù]+)$/);
  if (m && MESI[m[2]] !== undefined) return valida(+m[1], MESI[m[2]]);
  return null;
}

export const fmtData = (giorno, mese) => String(giorno).padStart(2, '0') + '/' + String(mese).padStart(2, '0');

// Costruisce il testo degli auguri. {menzione} = tag cliccabile (se abbiamo lo
// user id Telegram), altrimenti il nome; {nome} = solo il nome. Template grezzo
// (l'utente può usare <b>…), valori con escape HTML.
export function costruisciAuguri(template, { nome, tgUserId } = {}) {
  const nomeEsc = esc(nome || 'amico');
  const menzione = tgUserId && /^\d+$/.test(String(tgUserId))
    ? `<a href="tg://user?id=${tgUserId}">${nomeEsc}</a>`
    : nomeEsc;
  const t = (template && String(template).trim()) || AUGURI_DEFAULT;
  return t.replace(/\{(menzione|nome)\}/g, (_, k) => (k === 'menzione' ? menzione : nomeEsc));
}

// Giorno/mese/anno di OGGI nel fuso Europe/Rome (così gli auguri partono a
// mezzanotte italiana, non UTC).
export function oggiRoma() {
  const parti = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', day: 'numeric', month: 'numeric', year: 'numeric',
  }).formatToParts(new Date());
  const val = (t) => +(parti.find((p) => p.type === t)?.value || 0);
  return { giorno: val('day'), mese: val('month'), anno: val('year') };
}

// ── Il comando, uno solo per due posti ──────────────────────────────────────
// «/compleanno» nel gruppo e «!compleanno» in chat chiedono le stesse tre cose.
// Qui si decide COSA vuole chi scrive; come gli si risponde lo decide chi
// chiama, perche' il gruppo parla in HTML e la chat in testo semplice.
export function leggiArgomento(arg) {
  const a = String(arg || '').trim().toLowerCase();
  if (!a) return { azione: 'mostra' };
  if (/^(rimuovi|cancella|togli|via)$/.test(a)) return { azione: 'togli' };
  const d = parseData(a);
  return d ? { azione: 'imposta', giorno: d.giorno, mese: d.mese } : { azione: 'boh' };
}

// Nel gruppo il comando arriva intero, e li' il nome e' fisso.
export function leggiComando(testo) {
  const m = String(testo || '').trim().toLowerCase().match(/^[/!]?compleanno(?:@\S+)?(?:\s+(.*))?$/);
  return m ? leggiArgomento(m[1]) : null;
}

// CHI, per chi si segna dalla chat. Il prefisso non e' un vezzo: senza, un nome
// fatto di sole cifre finirebbe sulla riga di un id Telegram.
export const CHI_CHAT = 'chat:';
export function chiDiChat(piattaforma, nome) {
  const login = loginSu(piattaforma || 'twitch', nome);
  return login ? CHI_CHAT + login : '';
}

export const AUGURI_CHAT_DEFAULT = 'Tanti auguri {nome}! Buon compleanno da tutta la chat.';

// Il testo per la chat: niente HTML e niente tag cliccabili, che in chat non
// esistono. Solo {nome}.
export function augurioChat(template, { nome } = {}) {
  const n = String(nome || 'amico').slice(0, 40);
  const t = (template && String(template).trim()) || AUGURI_CHAT_DEFAULT;
  return t.replace(/\{nome\}/g, n).slice(0, 400);
}

const cfgChat = (channel) => streamers.get(channel)?.settings?.chatAuguri || null;

// «!compleanno [GG/MM | via]» in chat. Si accende con gli auguri in chat: senza
// quelli, segnarsi non servirebbe a niente, e un comando che non fa niente e'
// peggio di un comando che non c'e'.
export function tryComando(msg, parla) {
  if (!msg) return false;   // lo streamer scrive col NOSTRO account: scartarlo scarta lui (docs/COMANDI.md)
  const testo = String(msg.text || '').trim();
  if (!testo.startsWith('!')) return false;
  // In chat il nome del comando arriva gia' riportato a quello canonico dal
  // vaglio: i soprannomi li scioglie il registro, qui si guarda solo l'id.
  const parti = testo.slice(1).split(/\s+/);
  if ((parti.shift() || '').toLowerCase() !== 'compleanno') return false;
  const cmd = leggiArgomento(parti.join(' '));
  const ch = msg.channel;
  if (!cfgChat(ch)?.attivo) return false;
  const chi = chiDiChat(msg.piattaforma, msg.user);
  if (!chi) return false;
  const nome = String(msg.display || msg.user || '').slice(0, 60);
  if (cmd.azione === 'mostra') {
    const cur = compleanni.get(ch, chi);
    parla(cur
      ? `@${nome} il tuo compleanno e' segnato per il ${fmtData(cur.giorno, cur.mese)}. Per cambiarlo: !compleanno GG/MM`
      : `@${nome} scrivi !compleanno GG/MM (per esempio !compleanno 25/12) e ti faccio gli auguri il giorno giusto.`);
    return true;
  }
  if (cmd.azione === 'togli') {
    compleanni.remove(ch, chi);
    parla(`@${nome} fatto, ho tolto il tuo compleanno.`);
    return true;
  }
  if (cmd.azione === 'boh') {
    parla(`@${nome} non ho capito la data. Si scrive !compleanno GG/MM, per esempio !compleanno 25/12`);
    return true;
  }
  compleanni.set(ch, chi, nome, cmd.giorno, cmd.mese);
  parla(`@${nome} segnato: ti faccio gli auguri il ${fmtData(cmd.giorno, cmd.mese)}.`);
  return true;
}

// Gli auguri in chat, al primo messaggio di chi compie gli anni oggi. Si segna
// PRIMA di parlare: se il messaggio non partisse, un ritentativo a ogni riga
// della chat diventerebbe una filastrocca di auguri.
export function auguriInChat(msg, parla, fuoco) {
  if (!msg) return false;   // lo streamer scrive col NOSTRO account: scartarlo scarta lui (docs/COMANDI.md)
  const ch = msg.channel;
  const cfg = cfgChat(ch);
  if (!cfg?.attivo) return false;
  const chi = chiDiChat(msg.piattaforma, msg.user);
  if (!chi) return false;
  const r = compleanni.get(ch, chi);
  if (!r) return false;
  const { giorno, mese, anno } = oggiRoma();
  if (r.giorno !== giorno || r.mese !== mese || r.last_auguri === anno) return false;
  compleanni.markAuguri(ch, chi, anno);
  parla(augurioChat(cfg.messaggio, { nome: msg.display || msg.user }));
  if (cfg.effetto) { try { fuoco?.(ch, cfg.effetto); } catch { /* l'effetto e' un di piu' */ } }
  return true;
}
