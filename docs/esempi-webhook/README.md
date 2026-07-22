# Esempi di modulo esterno (webhook)

Questi sono **punti di partenza** per collegare una tua logica custom ad SocialBot, in
**qualsiasi linguaggio** (qui Python e Node, ma vale uguale per Java, Go, PHP…): il tuo
servizio parla solo **HTTP + JSON**.

Ci sono due versi, indipendenti:

## 1. SocialBot → il tuo codice (azione "Webhook")

Nel modulo, aggiungi un'azione **Chiama un webhook** con l'URL del tuo servizio e spunta
"usa la risposta come messaggio in chat". Quando il modulo scatta, SocialBot manda una POST
JSON al tuo URL con il contesto:

```json
{ "channel": "tuocanale", "user": "spettatore", "args": ["ciao"],
  "argsRaw": "ciao", "evento": null }
```

Il tuo servizio risponde:

```json
{ "reply": "testo da scrivere in chat" }
```

e SocialBot lo pubblica. Esempi: [`webhook.py`](webhook.py), [`webhook.mjs`](webhook.mjs).

> Il servizio deve stare su un **URL pubblico https** (un tuo dominio/VPS/serverless).
> Per sicurezza SocialBot **non** chiama indirizzi interni (`localhost`, IP privati).

## 2. Il tuo codice → SocialBot (chiave API in ingresso)

Dalla dashboard, sezione **Moduli → Connettori**, copia la tua chiave e l'URL. Da qualunque
servizio puoi far dire/fare cose al bot:

```bash
curl -X POST https://bot.andryxify.it/api/ext/tuocanale \
  -H "Authorization: Bearer LA_TUA_CHIAVE" \
  -H "Content-Type: application/json" \
  -d '{"azione":"messaggio","testo":"Ciao dal mio servizio!"}'
```

Azioni possibili: `{"azione":"messaggio","testo":"..."}`,
`{"azione":"effetto","comando":"airhorn"}`,
`{"azione":"modulo","modulo":"NomeModulo"}`.
