<?php
// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — PHP puro, ZERO dipendenze.
//
// COME SI AVVIA (server di sviluppo integrato in PHP):
//     php -S 0.0.0.0:8099 webhook-php.php
//
// SocialBot chiama questo servizio (azione "Chiama un webhook" di un modulo)
// con una POST JSON; noi rispondiamo { "reply": "..." } e SocialBot scrive il
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

// Leggiamo il corpo grezzo della POST e lo decodifichiamo in array.
$dati = json_decode(file_get_contents('php://input'), true);
if (!is_array($dati)) {
    $dati = [];
}

// Qui la TUA logica: $dati ha channel, user, display, args, argsRaw, ...
function calcola_risposta(array $dati): string
{
    $utente = $dati['display'] ?? $dati['user'] ?? 'amico';
    $args = array_map('strtolower', $dati['args'] ?? []);
    if (in_array('ping', $args, true)) {
        return "🏓 Pong! Ciao $utente.";
    }
    if (!empty($args)) {
        return "@$utente hai detto: " . ($dati['argsRaw'] ?? '');
    }
    return "Ciao $utente! Sono il tuo modulo esterno in PHP 🐘";
}

header('Content-Type: application/json');
echo json_encode(['reply' => calcola_risposta($dati)], JSON_UNESCAPED_UNICODE);
