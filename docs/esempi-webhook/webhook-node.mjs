// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — Node.js, ZERO dipendenze (http nativo).
//
// COME SI AVVIA:  node webhook-node.mjs        (ascolta sulla porta 8099)
//
// SocialBot chiama questo servizio (azione "Chiama un webhook" di un modulo)
// con una POST JSON; noi rispondiamo { reply: "..." } e SocialBot scrive il
// testo in chat con l'account dello streamer (solo se hai spuntato
// "usa la risposta"). Se non vuoi far dire niente, rispondi {} .
//
// Corpo che ricevi:
//   { "channel":"canale", "user":"spettatore", "display":"Spettatore",
//     "args":["ciao","mondo"], "argsRaw":"ciao mondo",
//     "evento":null, "variabili":{} }
//
// La logica qui dentro è TUA: database, altre API, calcoli...
//
// NB: mettilo dietro un URL pubblico https. SocialBot non chiama localhost.
// ---------------------------------------------------------------------------

import http from 'node:http';

const PORT = 8099;

// Qui la TUA logica. `dati` ha channel, user, display, args, argsRaw, ...
function calcolaRisposta(dati) {
  const utente = dati.display || dati.user || 'amico';
  const args = (dati.args || []).map((a) => String(a).toLowerCase());
  if (args.includes('ping')) return `🏓 Pong! Ciao ${utente}.`;
  if (args.length) return `@${utente} hai detto: ${dati.argsRaw || ''}`;
  return `Ciao ${utente}! Sono il tuo modulo esterno in Node 🟢`;
}

http.createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(404).end(); return; }
  let corpo = '';
  req.on('data', (c) => { corpo += c; if (corpo.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let dati = {};
    try { dati = JSON.parse(corpo || '{}'); } catch { /* body non JSON */ }
    const out = JSON.stringify({ reply: calcolaRisposta(dati) });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(out);
  });
}).listen(PORT, () => console.log(`Modulo esterno Node in ascolto sulla porta ${PORT}`));
