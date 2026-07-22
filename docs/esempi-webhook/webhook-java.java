// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — Java in un solo file, ZERO dipendenze
// (usa com.sun.net.httpserver.HttpServer, incluso nel JDK).
//
// COME SI AVVIA (serve JDK 11+, che sa eseguire un singolo .java senza compilare):
//     java webhook-java.java        (ascolta sulla porta 8099)
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
// Per non aggiungere librerie facciamo un mini parsing "a mano" del JSON:
// ci bastano i campi "display", "user" e "argsRaw". Per casi seri usa una
// libreria JSON (Jackson, Gson).
//
// NB: mettilo dietro un URL pubblico https. SocialBot non chiama localhost.
// ---------------------------------------------------------------------------

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class webhook_java {

    static final int PORT = 8099;

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 0);
        server.createContext("/", webhook_java::gestisci);
        server.start();
        System.out.println("Modulo esterno Java in ascolto sulla porta " + PORT);
    }

    static void gestisci(HttpExchange ex) throws IOException {
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(404, -1);
            return;
        }
        String corpo;
        try (InputStream in = ex.getRequestBody()) {
            corpo = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }

        String utente = valoreDi(corpo, "display");
        if (utente.isEmpty()) utente = valoreDi(corpo, "user");
        if (utente.isEmpty()) utente = "amico";
        String argsRaw = valoreDi(corpo, "argsRaw");

        // Qui la TUA logica.
        String reply;
        if (argsRaw.toLowerCase().matches(".*\\bping\\b.*")) {
            reply = "🏓 Pong! Ciao " + utente + ".";
        } else if (!argsRaw.isEmpty()) {
            reply = "@" + utente + " hai detto: " + argsRaw;
        } else {
            reply = "Ciao " + utente + "! Sono il tuo modulo esterno in Java ☕";
        }

        byte[] out = ("{\"reply\":\"" + escape(reply) + "\"}").getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.sendResponseHeaders(200, out.length);
        ex.getResponseBody().write(out);
        ex.close();
    }

    // Mini-estrattore: prende il valore stringa di "chiave" da un JSON piatto.
    static String valoreDi(String json, String chiave) {
        String ago = "\"" + chiave + "\"";
        int i = json.indexOf(ago);
        if (i < 0) return "";
        i = json.indexOf(':', i + ago.length());
        if (i < 0) return "";
        i++;
        while (i < json.length() && Character.isWhitespace(json.charAt(i))) i++;
        if (i >= json.length() || json.charAt(i) != '"') return ""; // null o non stringa
        i++;
        StringBuilder sb = new StringBuilder();
        while (i < json.length() && json.charAt(i) != '"') {
            char c = json.charAt(i);
            if (c == '\\' && i + 1 < json.length()) {
                i++;
                char e = json.charAt(i);
                switch (e) {
                    case 'n': sb.append('\n'); break;
                    case 't': sb.append('\t'); break;
                    default: sb.append(e);
                }
            } else {
                sb.append(c);
            }
            i++;
        }
        return sb.toString();
    }

    // Escape minimo per rimettere il testo dentro il JSON di risposta.
    static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\t", "\\t");
    }
}
