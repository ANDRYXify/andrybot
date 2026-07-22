# Esempi per collegare SocialBot

Raccolta di esempi **pronti** per unire una tua logica a SocialBot, in tanti linguaggi.
Il tuo codice parla solo **HTTP + JSON**, quindi va bene qualunque linguaggio o servizio.

> **SocialBot** è il nome del prodotto. In chat il bot scrive con l'account (e il nome)
> dello streamer: "SocialBot" si vede solo sul sito.

Ci sono **due versi**, indipendenti:

---

## Verso A — SocialBot chiama il TUO servizio (azione "Webhook")

Nel modulo aggiungi un'azione **Chiama un webhook** con l'URL del tuo servizio e spunta
"usa la risposta come messaggio in chat". Quando il modulo scatta, SocialBot manda una
**POST** con questo corpo JSON:

```json
{
  "channel": "canale",
  "user": "spettatore",
  "display": "Spettatore",
  "args": ["ciao", "mondo"],
  "argsRaw": "ciao mondo",
  "evento": null,
  "variabili": {}
}
```

Il tuo servizio risponde JSON:

```json
{ "reply": "testo da scrivere in chat" }
```

Se non vuoi far dire niente, rispondi `{}` (o ometti `reply`).

### 🟢 Il modo più facile: serverless (nessun server da gestire, gratis)

| Dove | File | Note |
|---|---|---|
| **Google Apps Script** | [`serverless-google-apps-script.gs`](serverless-google-apps-script.gs) | Zero server, gratis. Incolla, "Distribuisci → App web", copia l'URL. |
| **Vercel** | [`serverless-vercel.js`](serverless-vercel.js) | Metti il file in `api/` di un qualsiasi progetto Vercel (anche il tuo sito). |
| **Cloudflare Workers** | [`serverless-cloudflare.js`](serverless-cloudflare.js) | Incolla in un Worker, pubblica. |

### Oppure un mini-server tuo (self-hosted)

| Linguaggio | File | Come si avvia |
|---|---|---|
| Python | [`webhook-python.py`](webhook-python.py) | `python3 webhook-python.py` |
| Node.js | [`webhook-node.mjs`](webhook-node.mjs) | `node webhook-node.mjs` |
| PHP | [`webhook-php.php`](webhook-php.php) | `php -S 0.0.0.0:8099 webhook-php.php` |
| Go | [`webhook-go.go`](webhook-go.go) | `go run webhook-go.go` |
| Java | [`webhook-java.java`](webhook-java.java) | `java webhook-java.java` (JDK 11+) |
| Ruby | [`webhook-ruby.rb`](webhook-ruby.rb) | `ruby webhook-ruby.rb` |
| C# / .NET | [`webhook-csharp.cs`](webhook-csharp.cs) | vedi commento in cima al file |
| Deno | [`webhook-deno.ts`](webhook-deno.ts) | `deno run --allow-net webhook-deno.ts` |
| Bun | [`webhook-bun.ts`](webhook-bun.ts) | `bun webhook-bun.ts` |

Tutti ascoltano sulla porta **8099** e vanno esposti su un **URL pubblico https**
(un tuo dominio/VPS/serverless). Per sicurezza SocialBot **non** chiama indirizzi
interni (`localhost`, IP privati).

---

## Verso B — il TUO servizio comanda SocialBot (API in ingresso)

Dalla dashboard (scheda **Ascolto live** o **Moduli → Connettori**) copia la tua
**chiave** e l'**URL**. Poi da qualsiasi servizio:

```
POST https://bot.andryxify.it/api/ext/<tuo-canale>
Authorization: Bearer <LA_TUA_CHIAVE>
Content-Type: application/json
```

Corpo JSON, una tra queste azioni:

| Azione | Corpo | Cosa fa |
|---|---|---|
| messaggio | `{"azione":"messaggio","testo":"..."}` | scrive in chat |
| clip | `{"azione":"clip","motivo":"..."}` | crea una clip del momento |
| effetto | `{"azione":"effetto","comando":"airhorn"}` | fa partire un effetto |
| modulo | `{"azione":"modulo","modulo":"NomeModulo"}` | esegue un tuo modulo |

Snippet pronti nella cartella [`ingresso/`](ingresso/):

| Linguaggio | File |
|---|---|
| curl (terminale) | [`ingresso/ingresso-curl.sh`](ingresso/ingresso-curl.sh) |
| Python | [`ingresso/ingresso-python.py`](ingresso/ingresso-python.py) |
| Node.js | [`ingresso/ingresso-node.mjs`](ingresso/ingresso-node.mjs) |
| PHP | [`ingresso/ingresso-php.php`](ingresso/ingresso-php.php) |
| JavaScript (browser) | [`ingresso/ingresso-javascript-browser.html`](ingresso/ingresso-javascript-browser.html) |
| Go | [`ingresso/ingresso-go.go`](ingresso/ingresso-go.go) |
| Java | [`ingresso/ingresso-java.java`](ingresso/ingresso-java.java) |

---

## Sicurezza in due righe

- Il **webhook** (verso A) deve stare su un **URL pubblico https**; SocialBot non
  raggiunge `localhost` né IP privati (protezione anti-SSRF).
- La **chiave** dell'API in ingresso (verso B) va tenuta **privata**: chi ce l'ha può
  far scrivere il bot nel tuo canale. Se la perdi, rigenerala dalla dashboard.
