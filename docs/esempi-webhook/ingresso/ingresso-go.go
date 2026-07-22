// ---------------------------------------------------------------------------
// Comandare SocialBot da un tuo servizio — Go, solo libreria standard.
//
// COME SI AVVIA:  go run ingresso-go.go
//
// Fa dire/fare qualcosa al bot chiamando l'API in ingresso. La CHIAVE e il
// canale li copi dalla dashboard (scheda Ascolto live / Moduli → Connettori).
// ---------------------------------------------------------------------------

package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

const (
	canale = "IL_TUO_CANALE"                        // il tuo login Twitch (minuscolo)
	chiave = "INCOLLA_QUI_LA_TUA_CHIAVE"            // dalla dashboard
)

// invia una delle azioni: messaggio / effetto / modulo / clip
func invia(corpoJSON string) {
	url := "https://bot.andryxify.it/api/ext/" + canale
	req, _ := http.NewRequest("POST", url, bytes.NewBufferString(corpoJSON))
	req.Header.Set("Authorization", "Bearer "+chiave)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("errore di rete:", err)
		return
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	fmt.Printf("HTTP %d — %s\n", resp.StatusCode, string(b))
}

func main() {
	// scrivi un messaggio in chat
	invia(`{"azione":"messaggio","testo":"Ciao dal mio servizio Go!"}`)

	// altre azioni possibili:
	// invia(`{"azione":"clip","motivo":"momento top"}`)
	// invia(`{"azione":"effetto","comando":"airhorn"}`)
	// invia(`{"azione":"modulo","modulo":"NomeModulo"}`)
}
