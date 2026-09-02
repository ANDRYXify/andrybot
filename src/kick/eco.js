// L'ECO DEL BOT SU KICK.
//
// Su Twitch la chat dice chi ha scritto: un messaggio del bot arriva con
// `isSelf`, e il tubo lo lascia perdere. Su Kick no. Il bot scrive con l'account
// dell'app (`type: 'bot'`), l'evento `chat.message.sent` torna indietro come
// qualunque altro messaggio, e noi non abbiamo modo di sapere che quel mittente
// e' il nostro: l'id dell'app non lo dice nessuna chiamata.
//
// Senza riconoscerlo, il bot si ascolta: le sue frasi entrano nella memoria
// della chat (e quindi in quello che l'IA impara), accreditano monete a un
// account che non e' uno spettatore, fanno scattare i contatori per parola, e
// una risposta che contenesse un comando riaccenderebbe il giro.
//
// Non serve sapere CHI e' il bot: basta sapere COSA abbiamo appena detto. Si
// segna ogni frase mandata, e la si consuma quando torna indietro. Consumarla
// (invece di tenerla) fa si' che uno spettatore che ripete la stessa frase piu'
// tardi venga trattato come chiunque altro.
const FINESTRA_MS = 60_000;
const MAX_PER_CANALE = 40;

const detto = new Map();      // canale → [{ testo, quando }]

const chiave = (testo) => String(testo ?? '').trim();

export function segna(canale, testo) {
  const c = String(canale || '').toLowerCase();
  const t = chiave(testo);
  if (!c || !t) return;
  const ora = Date.now();
  const lista = (detto.get(c) || []).filter((x) => ora - x.quando < FINESTRA_MS);
  lista.push({ testo: t, quando: ora });
  detto.set(c, lista.slice(-MAX_PER_CANALE));
}

// Questa frase l'abbiamo detta noi poco fa? Se si', si consuma.
export function nostro(canale, testo) {
  const c = String(canale || '').toLowerCase();
  const t = chiave(testo);
  if (!c || !t) return false;
  const lista = detto.get(c);
  if (!lista?.length) return false;
  const ora = Date.now();
  const i = lista.findIndex((x) => x.testo === t && ora - x.quando < FINESTRA_MS);
  if (i < 0) return false;
  lista.splice(i, 1);
  return true;
}

// Solo per il collaudo.
export function _azzera() { detto.clear(); }
