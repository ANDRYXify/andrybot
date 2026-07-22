// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — Bun, poche righe, ZERO dipendenze.
//
// COME SI AVVIA:  bun run webhook-bun.ts        (porta 8099)
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
// NB: mettilo dietro un URL pubblico https. SocialBot non chiama localhost.
// ---------------------------------------------------------------------------

const PORT = 8099;

// Qui la TUA logica. `dati` ha channel, user, display, args, argsRaw, ...
function calcolaRisposta(dati: any): string {
  const utente = dati.display || dati.user || "amico";
  const args: string[] = (dati.args || []).map((a: unknown) => String(a).toLowerCase());
  if (args.includes("ping")) return `🏓 Pong! Ciao ${utente}.`;
  if (args.length) return `@${utente} hai detto: ${dati.argsRaw || ""}`;
  return `Ciao ${utente}! Sono il tuo modulo esterno in Bun 🥟`;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method !== "POST") return new Response("solo POST", { status: 404 });
    let dati: any = {};
    try {
      dati = await req.json();
    } catch {
      /* corpo vuoto o non JSON */
    }
    return Response.json({ reply: calcolaRisposta(dati) });
  },
});

console.log(`Modulo esterno Bun in ascolto sulla porta ${PORT}`);
