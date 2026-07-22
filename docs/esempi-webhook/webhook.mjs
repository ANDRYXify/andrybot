// Esempio di modulo esterno per AndryBot — in Node.js, ZERO dipendenze.
//
// AndryBot chiama questo servizio (azione "Webhook" di un modulo) con una POST
// JSON; noi rispondiamo { reply: "..." } e AndryBot lo scrive in chat.
//
// Avvio:   node webhook.mjs
// Poi esponilo su un URL pubblico https e mettilo come URL del webhook nel modulo.
//
// La logica qui dentro è tua: database, altre API, calcoli... è "il tuo bot
// custom" che vive a casa tua e parla attraverso AndryBot.

import http from 'node:http';

const PORT = 8099;

// Qui la TUA logica. `dati` contiene channel, user, args, argsRaw, evento.
function calcolaRisposta(dati) {
  const utente = dati.user || 'amico';
  const args = dati.args || [];
  if (args.length) return `@${utente} hai detto: ${args.join(' ')}`;
  return `Ciao ${utente}! Sono il modulo esterno in Node 🟢`;
}

http.createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(404).end(); return; }
  let corpo = '';
  req.on('data', (c) => { corpo += c; if (corpo.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let dati = {};
    try { dati = JSON.parse(corpo || '{}'); } catch { /* body non JSON */ }
    const reply = calcolaRisposta(dati);
    const out = JSON.stringify({ reply });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(out);
  });
}).listen(PORT, () => console.log(`Modulo esterno Node in ascolto sulla porta ${PORT}`));
