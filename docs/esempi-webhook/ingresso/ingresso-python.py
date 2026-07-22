#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# API IN INGRESSO — il TUO servizio comanda SocialBot (Python, solo stdlib).
#
# Con l'API in ingresso sei TU a far dire/fare cose al bot. SocialBot pubblica
# in chat con l'account dello streamer.
#
# Copia CHIAVE e CANALE dalla dashboard (Ascolto live / Moduli → Connettori).
# La chiave è privata: NON metterla in pagine pubbliche o repository.
#
# Avvio:  python3 ingresso-python.py
# ---------------------------------------------------------------------------

import json
import urllib.request

CHIAVE = "LA_TUA_CHIAVE"        # <-- incolla qui la tua chiave
CANALE = "tuocanale"            # <-- il tuo canale
URL = f"https://bot.andryxify.it/api/ext/{CANALE}"


def comanda(payload):
    """Manda una singola azione al bot e stampa la risposta."""
    dati = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        URL,
        data=dati,
        headers={
            "Authorization": f"Bearer {CHIAVE}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as risposta:
        print(risposta.status, risposta.read().decode("utf-8"))


if __name__ == "__main__":
    # 1) MESSAGGIO — scrivi un testo in chat
    comanda({"azione": "messaggio", "testo": "Ciao dal mio servizio!"})

    # 4) CLIP — crea una clip
    comanda({"azione": "clip", "motivo": "Momento epico!"})

    # Le altre azioni funzionano allo stesso modo:
    # comanda({"azione": "effetto", "comando": "airhorn"})
    # comanda({"azione": "modulo", "modulo": "NomeModulo"})
