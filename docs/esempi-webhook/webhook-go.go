// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — Go, solo libreria standard (net/http).
//
// COME SI AVVIA:  go run webhook-go.go        (ascolta sulla porta 8099)
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

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

const port = "8099"

// Dati in ingresso dal bot (solo i campi che ci servono).
type Dati struct {
	User    string   `json:"user"`
	Display string   `json:"display"`
	Args    []string `json:"args"`
	ArgsRaw string   `json:"argsRaw"`
}

// Qui la TUA logica.
func calcolaRisposta(d Dati) string {
	utente := d.Display
	if utente == "" {
		utente = d.User
	}
	if utente == "" {
		utente = "amico"
	}
	for _, a := range d.Args {
		if strings.EqualFold(a, "ping") {
			return fmt.Sprintf("🏓 Pong! Ciao %s.", utente)
		}
	}
	if len(d.Args) > 0 {
		return fmt.Sprintf("@%s hai detto: %s", utente, d.ArgsRaw)
	}
	return fmt.Sprintf("Ciao %s! Sono il tuo modulo esterno in Go 🐹", utente)
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "solo POST", http.StatusNotFound)
			return
		}
		var d Dati
		_ = json.NewDecoder(r.Body).Decode(&d) // corpo vuoto/non JSON => Dati zero
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"reply": calcolaRisposta(d)})
	})
	log.Printf("Modulo esterno Go in ascolto sulla porta %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
