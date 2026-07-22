// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — SERVERLESS su Cloudflare Workers.
// NESSUN server da gestire. Cloudflare ha un piano gratuito generoso.
//
// COME SI USA:
//   1. Vai su dash.cloudflare.com → Workers & Pages → Create → Worker.
//   2. Sostituisci il codice di esempio con questo file e premi "Deploy".
//      (Oppure via CLI:  npm create cloudflare@latest  e incolla in src/index.js)
//   3. Otterrai un URL pubblico https tipo
//        https://tuo-worker.tuo-nome.workers.dev
//   4. Incolla quell'URL come "Chiama un webhook" nel modulo di SocialBot.
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

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('solo POST', { status: 405 });
    }

    let dati = {};
    try {
      dati = await request.json();
    } catch {
      /* corpo vuoto o non JSON */
    }

    // Qui la TUA logica.
    const utente = dati.display || dati.user || 'amico';
    const args = (dati.args || []).map((a) => String(a).toLowerCase());

    let reply;
    if (args.includes('ping')) {
      reply = `🏓 Pong! Ciao ${utente}.`;
    } else if (args.length) {
      reply = `@${utente} hai detto: ${dati.argsRaw || ''}`;
    } else {
      reply = `Ciao ${utente}! Sono il tuo modulo esterno su Cloudflare ☁️`;
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
