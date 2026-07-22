#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# API IN INGRESSO — il TUO servizio comanda SocialBot (via curl).
#
# Con l'API in ingresso sei TU a far dire/fare cose al bot. SocialBot pubblica
# in chat con l'account dello streamer.
#
# Copia CHIAVE e CANALE dalla dashboard (Ascolto live / Moduli → Connettori).
# La chiave è privata: NON metterla in pagine pubbliche o repository.
# ---------------------------------------------------------------------------

CHIAVE="LA_TUA_CHIAVE"          # <-- incolla qui la tua chiave
CANALE="tuocanale"              # <-- il tuo canale
URL="https://bot.andryxify.it/api/ext/$CANALE"

# 1) MESSAGGIO — scrivi un testo in chat
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $CHIAVE" \
  -H "Content-Type: application/json" \
  -d '{"azione":"messaggio","testo":"Ciao dal mio servizio!"}'
echo

# 2) EFFETTO — lancia un effetto/comando (es. airhorn)
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $CHIAVE" \
  -H "Content-Type: application/json" \
  -d '{"azione":"effetto","comando":"airhorn"}'
echo

# 3) MODULO — fai partire un modulo per nome
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $CHIAVE" \
  -H "Content-Type: application/json" \
  -d '{"azione":"modulo","modulo":"NomeModulo"}'
echo

# 4) CLIP — crea una clip
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $CHIAVE" \
  -H "Content-Type: application/json" \
  -d '{"azione":"clip","motivo":"Momento epico!"}'
echo
