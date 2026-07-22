#!/usr/bin/env python3
# Esempio di modulo esterno per AndryBot — in Python, ZERO dipendenze.
#
# AndryBot chiama questo servizio (azione "Webhook" di un modulo) con una POST
# JSON; noi rispondiamo { "reply": "..." } e AndryBot lo scrive in chat.
#
# Avvio:   python3 webhook.py
# Poi esponilo su un URL pubblico https (dominio/VPS/serverless) e mettilo
# come URL del webhook nel modulo.
#
# La logica qui dentro è tua: puoi chiamare un database, un'altra API,
# calcolare qualcosa... è "il tuo bot custom" che vive a casa tua.

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8099


def calcola_risposta(dati):
    """Qui la TUA logica. `dati` contiene channel, user, args, argsRaw, evento."""
    utente = dati.get("user", "amico")
    args = dati.get("args", [])
    if args:
        return f"@{utente} hai detto: {' '.join(args)}"
    return f"Ciao {utente}! Sono il modulo esterno in Python 🐍"


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            dati = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            dati = {}
        reply = calcola_risposta(dati)
        corpo = json.dumps({"reply": reply}).encode("utf-8")
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
