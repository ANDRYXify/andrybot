// ---------------------------------------------------------------------------
// Comandare SocialBot da un tuo servizio — Java in un solo file, ZERO dipendenze
// (usa java.net.http.HttpClient, incluso nel JDK 11+).
//
// COME SI AVVIA (JDK 11+):  java ingresso-java.java
//
// Fa dire/fare qualcosa al bot chiamando l'API in ingresso. La CHIAVE e il
// canale li copi dalla dashboard (scheda Ascolto live / Moduli → Connettori).
// ---------------------------------------------------------------------------

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ingresso {

    static final String CANALE = "IL_TUO_CANALE";              // login Twitch (minuscolo)
    static final String CHIAVE = "INCOLLA_QUI_LA_TUA_CHIAVE";  // dalla dashboard

    // invia una delle azioni: messaggio / effetto / modulo / clip
    static void invia(String corpoJSON) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://bot.andryxify.it/api/ext/" + CANALE))
                .header("Authorization", "Bearer " + CHIAVE)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(corpoJSON))
                .build();
        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        System.out.println("HTTP " + resp.statusCode() + " — " + resp.body());
    }

    public static void main(String[] args) throws Exception {
        // scrivi un messaggio in chat
        invia("{\"azione\":\"messaggio\",\"testo\":\"Ciao dal mio servizio Java!\"}");

        // altre azioni possibili:
        // invia("{\"azione\":\"clip\",\"motivo\":\"momento top\"}");
        // invia("{\"azione\":\"effetto\",\"comando\":\"airhorn\"}");
        // invia("{\"azione\":\"modulo\",\"modulo\":\"NomeModulo\"}");
    }
}
