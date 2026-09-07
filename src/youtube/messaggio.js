// DA MESSAGGIO YOUTUBE A MESSAGGIO DEL BOT.
//
// La stessa idea di Kick: il bot non deve sapere da dove arriva un messaggio.
// Comandi, moduli, antispam, monete, ore guardate, memoria leggono tutti la
// STESSA forma, quindi tradurre qui basta a far funzionare tutto il resto il
// primo giorno, senza toccarlo.
//
// Qui non c'e' logica di prodotto: c'e' una traduzione, ed e' pura — si prova
// senza rete e senza YouTube.
//
// LA COSA CHE SU YOUTUBE E' DIVERSA. Twitch e Kick mandano un login: una parola
// unica, minuscola, che e' la persona. YouTube manda due cose e nessuna delle
// due lo e': un NOME VISIBILE, che due spettatori diversi possono avere
// identico, e un ID opaco (UC...), unico ma illeggibile. L'economia del bot e'
// fatta di nomi leggibili — le monete stanno in una riga (canale, utente), la
// classifica stampa quella parola — quindi col solo nome visibile due persone
// diverse finirebbero nello stesso portafoglio, e con l'id la classifica
// sarebbe un elenco di codici.
//
// La maniglia (@nome) e' l'unica cosa che e' insieme unica e leggibile, ma non
// arriva nel messaggio: si chiede a parte e si tiene (vedi `risolviManiglie` in
// api.js). Quando c'e', e' lei l'identita'. Quando non c'e' — un canale senza
// maniglia — si ripiega sul nome visibile ripulito, e si accetta che due
// omonimi si confondano: e' il massimo che YouTube lascia sapere.

const pulito = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);

// `canale` e' il login con cui lo streamer e' registrato DA NOI: le funzioni del
// bot ragionano per canale nostro, non per id di piattaforma.
export function daMessaggioChat(voce, { canale, maniglia = '', canaleBotId = '' } = {}) {
  const v = voce || {};
  const s = v.snippet || {};
  const a = v.authorDetails || {};
  // Nella chat passano anche cose che non sono messaggi: iscrizioni, Super Chat,
  // messaggi cancellati. Qui entra solo chi ha scritto qualcosa.
  if (s.type && s.type !== 'textMessageEvent') return null;
  const testo = String(s.displayMessage || s.textMessageDetails?.messageText || '');
  const canaleId = String(a.channelId || s.authorChannelId || '');
  const nome = String(a.displayName || '');
  const utente = pulito(maniglia) || pulito(nome) || pulito(canaleId);
  if (!canale || !utente || !testo) return null;

  const padrone = !!a.isChatOwner;
  return {
    piattaforma: 'youtube',
    channel: String(canale).toLowerCase(),
    user: utente,
    display: nome || utente,
    text: testo,
    id: String(v.id || ''),
    userId: canaleId,
    isMod: !!a.isChatModerator || padrone,
    isBroadcaster: padrone,
    isSub: !!a.isChatSponsor,
    isVip: false,                                   // su YouTube i VIP non esistono
    isSelf: !!canaleBotId && canaleId === String(canaleBotId),
    tags: {
      'yt-canale': canaleId,
      'yt-maniglia': pulito(maniglia),
      'yt-verificato': a.isVerified ? '1' : '',
      'yt-quando': String(s.publishedAt || ''),
    },
  };
}

// Gli id dei canali di chi ha scritto, per andarsi a prendere le maniglie in un
// colpo solo invece che uno per messaggio.
export function canaliDi(voci) {
  const out = [];
  for (const v of voci || []) {
    const id = String(v?.authorDetails?.channelId || v?.snippet?.authorChannelId || '');
    if (id) out.push(id);
  }
  return [...new Set(out)];
}
