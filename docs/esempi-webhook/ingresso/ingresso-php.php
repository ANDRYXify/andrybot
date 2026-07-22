<?php
// ---------------------------------------------------------------------------
// API IN INGRESSO — il TUO servizio comanda SocialBot (PHP puro, cURL).
//
// Con l'API in ingresso sei TU a far dire/fare cose al bot. SocialBot pubblica
// in chat con l'account dello streamer.
//
// Copia CHIAVE e CANALE dalla dashboard (Ascolto live / Moduli → Connettori).
// La chiave è privata: NON metterla in pagine pubbliche o repository.
//
// Avvio:  php ingresso-php.php
// ---------------------------------------------------------------------------

$CHIAVE = 'LA_TUA_CHIAVE';       // <-- incolla qui la tua chiave
$CANALE = 'tuocanale';           // <-- il tuo canale
$URL = "https://bot.andryxify.it/api/ext/$CANALE";

function comanda(string $url, string $chiave, array $payload): void
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $chiave",
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);
    $risposta = curl_exec($ch);
    $stato = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "$stato $risposta\n";
}

// 1) MESSAGGIO — scrivi un testo in chat
comanda($URL, $CHIAVE, ['azione' => 'messaggio', 'testo' => 'Ciao dal mio servizio!']);

// 4) CLIP — crea una clip
comanda($URL, $CHIAVE, ['azione' => 'clip', 'motivo' => 'Momento epico!']);

// Le altre azioni funzionano allo stesso modo:
// comanda($URL, $CHIAVE, ['azione' => 'effetto', 'comando' => 'airhorn']);
// comanda($URL, $CHIAVE, ['azione' => 'modulo', 'modulo' => 'NomeModulo']);
