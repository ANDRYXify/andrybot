#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# Modulo esterno per SocialBot — Python, ZERO dipendenze (solo stdlib).
#
# COME SI AVVIA:  python3 webhook-python.py      (ascolta sulla porta 8099)
#
# SocialBot chiama questo servizio (azione "Chiama un webhook" di un modulo)
# con una POST JSON; noi rispondiamo { "reply": "..." } e SocialBot scrive il
# testo in chat con l'account dello streamer (solo se hai spuntato
# "usa la risposta"). Se non vuoi far dire niente, rispondi {} .
#
# Corpo che ricevi:
#   { "channel":"canale", "user":"spettatore", "display":"Spettatore",
#     "args":["ciao","mondo"], "argsRaw":"ciao mondo",
#     "evento":null, "variabili":{} }
#
# La logica qui dentro è TUA: database, altre API, calcoli... è il tuo bot
# custom che vive a casa tua e parla attraverso SocialBot.
#
# NB: mettilo dietro un URL pubblico https (dominio/VPS/serverless).
#     SocialBot non chiama localhost o indirizzi privati.
# ---------------------------------------------------------------------------

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8099


def calcola_risposta(dati):
    """Qui la TUA logica. `dati` ha channel, user, display, args, argsRaw, ..."""
    utente = dati.get("display") or dati.get("user") or "amico"
    args = [a.lower() for a in dati.get("args", [])]
    if "ping" in args:
        return f"🏓 Pong! Ciao {utente}."
    if args:
        return f"@{utente} hai detto: {dati.get('argsRaw', '')}"
    return f"Ciao {utente}! Sono il tuo modulo esterno in Python 🐍"


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            dati = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            dati = {}
        corpo = json.dumps({"reply": calcola_risposta(dati)}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def log_message(self, *_):
        pass  # silenzio


if __name__ == "__main__":
    print(f"Modulo esterno Python in ascolto sulla porta {PORT}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
