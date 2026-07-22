// ---------------------------------------------------------------------------
// API IN INGRESSO — il TUO servizio comanda SocialBot (Node.js, fetch nativo).
//
// Con l'API in ingresso sei TU a far dire/fare cose al bot. SocialBot pubblica
// in chat con l'account dello streamer.
//
// Copia CHIAVE e CANALE dalla dashboard (Ascolto live / Moduli → Connettori).
// La chiave è privata: NON metterla in pagine pubbliche o repository.
//
// Avvio:  node ingresso-node.mjs        (serve Node 18+ per fetch integrato)
// ---------------------------------------------------------------------------

const CHIAVE = 'LA_TUA_CHIAVE';   // <-- incolla qui la tua chiave
const CANALE = 'tuocanale';       // <-- il tuo canale
const URL = `https://bot.andryxify.it/api/ext/${CANALE}`;

async function comanda(payload) {
  const risposta = await fetch(URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHIAVE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  console.log(risposta.status, await risposta.text());
}

// 1) MESSAGGIO — scrivi un testo in chat
await comanda({ azione: 'messaggio', testo: 'Ciao dal mio servizio!' });

// 4) CLIP — crea una clip
await comanda({ azione: 'clip', motivo: 'Momento epico!' });

// Le altre azioni funzionano allo stesso modo:
// await comanda({ azione: 'effetto', comando: 'airhorn' });
// await comanda({ azione: 'modulo', modulo: 'NomeModulo' });
