// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — Google Apps Script.
// GRATIS e SENZA server: gira sull'infrastruttura di Google.
//
// COME SI USA:
//   1. Vai su https://script.google.com → Nuovo progetto.
//   2. Incolla questo codice.
//   3. Menu "Distribuisci" → "Nuova distribuzione" → tipo "App web".
//        - Esegui come:  Me stesso
//        - Chi può accedere:  Chiunque
//      Premi "Distribuisci" e copia l'URL dell'app web (finisce con /exec):
//        https://script.google.com/macros/s/XXXXXXXX/exec
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
//
// NB: da Apps Script puoi anche leggere/scrivere un Foglio Google, mandare
//     email, ecc. — perfetto per contatori, classifiche, ecc.
// ---------------------------------------------------------------------------

function doPost(e) {
  var dati = {};
  try {
    dati = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    dati = {};
  }

  // Qui la TUA logica.
  var utente = dati.display || dati.user || 'amico';
  var args = (dati.args || []).map(function (a) {
    return String(a).toLowerCase();
  });

  var reply;
  if (args.indexOf('ping') !== -1) {
    reply = '🏓 Pong! Ciao ' + utente + '.';
  } else if (args.length) {
    reply = '@' + utente + ' hai detto: ' + (dati.argsRaw || '');
  } else {
    reply = 'Ciao ' + utente + '! Sono il tuo modulo esterno su Apps Script 📄';
  }

  return ContentService
    .createTextOutput(JSON.stringify({ reply: reply }))
    .setMimeType(ContentService.MimeType.JSON);
}
