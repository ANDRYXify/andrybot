// DA EVENTO KICK A MESSAGGIO DEL BOT.
//
// L'idea che tiene in piedi tutto il multipiattaforma: il bot non deve sapere
// da dove arriva un messaggio. Comandi, moduli, antispam, punti, ore guardate,
// memoria — tutto legge la STESSA forma. Se un messaggio di Kick entra con
// quella forma, tutte le funzioni che già esistono funzionano il primo giorno,
// senza toccarle.
//
// Quindi qui non c'è logica di prodotto: c'è una traduzione, e basta. È pura,
// così si prova senza rete e senza Kick.

// I "badge" di Kick che contano per i permessi. Su Kick il proprietario del
// canale ha il badge `broadcaster`; i moderatori `moderator`; gli abbonati
// `subscriber`; `og` e `vip` sono i riconoscimenti del canale.
const distintivi = (sender) => new Set(
  (sender?.identity?.badges || []).map((b) => String(b?.type || b || '').toLowerCase()).filter(Boolean),
);

// `canale` è il login con cui lo streamer è registrato DA NOI: le funzioni del
// bot ragionano per canale nostro, non per id di piattaforma.
export function daChatMessage(payload, { canale, loginBot = '' } = {}) {
  const p = payload || {};
  const testo = String(p.content ?? '');
  const sender = p.sender || {};
  const utente = String(sender.username || '').toLowerCase();
  if (!canale || !utente || !testo) return null;

  const b = distintivi(sender);
  const isBroadcaster = b.has('broadcaster')
    || (p.broadcaster?.user_id != null && String(p.broadcaster.user_id) === String(sender.user_id ?? ''));

  return {
    piattaforma: 'kick',
    channel: String(canale).toLowerCase(),
    user: utente,
    display: String(sender.username || utente),
    text: testo,
    id: String(p.message_id || ''),
    userId: String(sender.user_id ?? ''),
    isMod: b.has('moderator') || isBroadcaster,
    isBroadcaster,
    isSub: b.has('subscriber') || b.has('founder'),
    isVip: b.has('vip') || b.has('og'),
    isSelf: !!loginBot && utente === String(loginBot).toLowerCase(),
    // Su Kick non ci sono i "tag" di Twitch: si tiene il grezzo utile, mai tutto
    // il payload (finirebbe nella memoria della chat e nei log).
    tags: {
      'kick-badges': [...b].join(','),
      'kick-colore': String(sender.identity?.username_color || ''),
      'kick-risposta-a': String(p.replies_to?.message_id || ''),
    },
  };
}

// Gli altri eventi diventano la stessa forma che il bot usa per gli eventi
// Twitch (seguito, abbonamento, regalo): così alert, moduli e notifiche non
// devono sapere da dove arrivano.
export function daEvento(tipo, payload, { canale } = {}) {
  const p = payload || {};
  const chi = String(p.follower?.username || p.subscriber?.username || p.gifter?.username || p.user?.username || '');
  const base = { piattaforma: 'kick', channel: String(canale || '').toLowerCase(), utente: chi };
  switch (tipo) {
    case 'channel.followed':
      return { ...base, tipo: 'seguito' };
    case 'channel.subscription.new':
      return { ...base, tipo: 'abbonamento', mesi: 1 };
    case 'channel.subscription.renewal':
      return { ...base, tipo: 'abbonamento', mesi: Math.max(1, Number(p.duration) || 1) };
    case 'channel.subscription.gifts':
      return { ...base, tipo: 'regali', quanti: Math.max(1, (p.giftees || []).length || Number(p.quantity) || 1) };
    case 'livestream.status.updated':
      return { ...base, tipo: p.is_live ? 'live' : 'fine-live', titolo: String(p.title || '') };
    default:
      return null;
  }
}
