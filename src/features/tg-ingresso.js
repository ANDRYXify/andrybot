// IL CANCELLO DEL GRUPPO: chi entra e' muto finche' non fa vedere che c'e'.
//
// Un gruppo aperto si riempie di account che entrano, spammano e spariscono. La
// cura e' vecchia e funziona: chi entra non puo' scrivere finche' non preme un
// tasto. Un bot il tasto non lo preme, perche' non sa che c'e'.
//
// Qui sta solo il RAGIONAMENTO — chi e' entrato davvero, cosa scrivergli, quale
// tasto, quali permessi ridargli, cosa fare con chi non risponde. Le chiamate a
// Telegram e il database stanno fuori: cosi' questo si puo' provare senza rete e
// senza un gruppo vero.
//
// Tre difetti non possono esistere, e non perche' qualcuno si ricordi di
// evitarli:
//
//  · SI GUARDA LA TRANSIZIONE, NON LO STATO. Passa dal cancello solo chi va da
//    fuori a dentro. Guardando lo stato, ogni cambio di permessi — compreso
//    quello che fa il cancello stesso un istante dopo — rimuterebbe chi era
//    gia' dentro, in un giro che non finisce.
//  · I PERMESSI DA RIDARE SONO QUELLI DEL GRUPPO. Una lista scritta qui darebbe
//    a chi passa diritti diversi da quelli di tutti gli altri: piu' o meno, e
//    nessuno dei due e' giusto. E se i permessi del gruppo non si riescono a
//    leggere, il cancello NON silenzia nessuno: non si mette muto qualcuno che
//    poi non si saprebbe come far tornare a parlare.
//  · A OGNI PRESSIONE SI RISPONDE. Telegram tiene la rotellina sul tasto finche'
//    non arriva la risposta: non rispondere e' un tasto che sembra rotto anche
//    quando ha funzionato. Qui ogni strada porta a una frase, compresa quella
//    di chi preme un tasto che non e' suo.

export const MINUTI_DEF = 5;
export const MINUTI_MIN = 1;
export const MINUTI_MAX = 60;

export const TESTO_DEF = 'Ciao {nome}, benvenuto. Premi qui sotto entro {minuti} e potrai scrivere.';
export const TASTO_DEF = 'Non sono un bot';

// Muto: tutti i permessi a no, scritti uno per uno. Telegram tratta come negato
// cio' che non gli dici, ma un elenco esplicito e' l'unica forma in cui «muto»
// si legge senza dover sapere cosa fa Telegram con i campi che mancano.
export const MUTO = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

const FUORI = new Set(['left', 'kicked']);
const DENTRO = new Set(['member']);
const GRUPPI = new Set(['group', 'supergroup']);

// Chi e' ENTRATO adesso, o null. Un amministratore aggiunto direttamente come
// amministratore non passa dal cancello: non e' uno che entra, e' uno che gia'
// comanda.
export function chiEntra(update) {
  const cm = update?.chat_member;
  const chat = cm?.chat;
  if (!chat || !GRUPPI.has(String(chat.type || ''))) return null;
  if (!FUORI.has(String(cm.old_chat_member?.status || ''))) return null;
  if (!DENTRO.has(String(cm.new_chat_member?.status || ''))) return null;
  const u = cm.new_chat_member?.user;
  if (!u || !u.id || u.is_bot) return null;
  return {
    chatId: String(chat.id),
    userId: String(u.id),
    nome: String(u.first_name || u.username || '').slice(0, 64),
    username: String(u.username || ''),
    titolo: String(chat.title || ''),
  };
}

// Il tasto porta dentro di se' l'id di chi deve premerlo: cosi' «e' il tuo
// tasto?» e' una domanda che si risponde da sola, senza andare a cercare.
const PREFISSO = 'sbin:';
export const datoTasto = (userId) => PREFISSO + String(userId);
export function leggiTasto(dato) {
  const s = String(dato || '');
  return s.startsWith(PREFISSO) ? s.slice(PREFISSO.length) : '';
}
export const tastiera = (userId, etichetta) => ({
  inline_keyboard: [[{ text: String(etichetta || TASTO_DEF).slice(0, 64), callback_data: datoTasto(userId) }]],
});

const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function inMinuti(n) {
  const m = Math.round(Number(n) || 0);
  return Math.max(MINUTI_MIN, Math.min(MINUTI_MAX, m || MINUTI_DEF));
}
const quanto = (m) => (m === 1 ? 'un minuto' : `${m} minuti`);

export function testoBenvenuto({ nome, minuti, template } = {}) {
  const t = String(template || '').trim() || TESTO_DEF;
  return t
    .replaceAll('{nome}', `<b>${esc(nome || 'ciao')}</b>`)
    .replaceAll('{minuti}', quanto(inMinuti(minuti)))
    .slice(0, 900);
}

// I permessi del gruppo, o null se Telegram non li ha detti. Null vuol dire
// «non silenziare nessuno»: vedi sopra.
export function permessiDi(chat) {
  const p = chat?.permissions;
  if (!p || typeof p !== 'object') return null;
  const q = {};
  for (const k of Object.keys(MUTO)) if (k in p) q[k] = !!p[k];
  return Object.keys(q).length ? q : null;
}

// Cosa serve perche' il cancello possa funzionare davvero. Se manca qualcosa il
// cancello resta spento e il pannello dice cosa: promettere e non fare e' peggio
// che non promettere.
export function guai({ ioSonoAdmin, possoLimitare, permessi } = {}) {
  if (!ioSonoAdmin) return 'admin';
  if (!possoLimitare) return 'limitare';
  if (!permessi) return 'permessi';
  return '';
}

export const MODI_SCADUTO = ['caccia', 'muto'];
export const modoScaduto = (m) => (MODI_SCADUTO.includes(String(m)) ? String(m) : 'caccia');

// Cosa dire a chi preme. Ogni strada finisce con una frase: non c'e' un ramo che
// esca di qui senza qualcosa da rispondere.
export function esitoTasto({ dato, chiPreme, inAttesa } = {}) {
  const atteso = leggiTasto(dato);
  if (!atteso) return { che: 'ignoto', apri: false, risposta: 'Questo tasto non vale più.' };
  if (atteso !== String(chiPreme || '')) return { che: 'nonTuo', apri: false, risposta: 'Questo tasto non è per te.' };
  if (!inAttesa) return { che: 'giaDentro', apri: false, risposta: 'Sei già dentro: scrivi pure.' };
  return { che: 'apri', apri: true, risposta: 'Fatto. Benvenuto, adesso puoi scrivere.' };
}
