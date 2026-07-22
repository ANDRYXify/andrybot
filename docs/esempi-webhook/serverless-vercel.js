// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — funzione SERVERLESS su Vercel.
// NESSUN server da gestire: è la via più facile. Vercel ha un piano gratuito.
//
// COME SI USA:
//   1. In una qualunque app Vercel, crea il file  api/socialbot.js
//      e incollaci questo codice (oppure usa il template "Other" di Vercel).
//   2. Fai il deploy (git push o `vercel`). Otterrai un URL pubblico https tipo
//        https://tuo-progetto.vercel.app/api/socialbot
//   3. Incolla quell'URL come "Chiama un webhook" nel modulo di SocialBot.
//
// SocialBot manda una POST JSON; noi rispondiamo { reply: "..." } e SocialBot
// scrive il testo in chat con l'account dello streamer (solo se hai spuntato
// "usa la risposta"). Se non vuoi far dire niente, rispondi {} .
//
// Corpo che ricevi:
//   { "channel":"canale", "user":"spettatore", "display":"Spettatore",
//     "args":["ciao","mondo"], "argsRaw":"ciao mondo",
//     "evento":null, "variabili":{} }
// ---------------------------------------------------------------------------

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({});
    return;
  }

  // Su Vercel req.body è già l'oggetto JSON.
  const dati = req.body || {};

  // Qui la TUA logica.
  const utente = dati.display || dati.user || 'amico';
  const args = (dati.args || []).map((a) => String(a).toLowerCase());

  let reply;
  if (args.includes('ping')) {
    reply = `🏓 Pong! Ciao ${utente}.`;
  } else if (args.length) {
    reply = `@${utente} hai detto: ${dati.argsRaw || ''}`;
  } else {
    reply = `Ciao ${utente}! Sono il tuo modulo esterno su Vercel ▲`;
  }

  res.status(200).json({ reply });
}
