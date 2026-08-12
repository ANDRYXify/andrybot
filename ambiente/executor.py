#!/usr/bin/env python3
"""
Esecutore dell'AMBIENTE di Lia — il suo "computer" personale, sandboxato.

Gira DENTRO il container `ambiente`, che è isolato dal resto (niente rete verso
il bot/Caddy, niente segreti, niente disco dell'host, utente non privilegiato,
root in sola lettura, RAM/CPU/processi limitati). Qui Lia ha mano libera: shell,
Python, file, curl… ma solo nel suo mondo.

Espone UN endpoint minimale che il cervello (brain) chiama sulla rete privata
`sandbox`. Protetto da una chiave condivisa (AMBIENTE_KEY): senza la chiave
giusta non esegue nulla. Nessuna dipendenza esterna: solo la libreria standard.
"""
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(os.environ.get("AMBIENTE_PORT", "8099"))
CHIAVE = os.environ.get("AMBIENTE_KEY", "")
CASA = os.environ.get("AMBIENTE_HOME", "/home/lia")
TIMEOUT_MAX = 30          # secondi: un comando non può bloccare la sandbox all'infinito
# caratteri di output restituiti (oltre → troncato). Ampio, così Lia può LEGGERE per
# intero la sua mente (~/mente) mentre cresce, non solo un pezzetto. Rete interna,
# nessun segreto: una risposta grande non è un rischio.
OUT_MAX = int(os.environ.get("AMBIENTE_OUT_MAX", "60000"))


def _esegui(cmd, timeout):
    """Esegue `cmd` in una shell dentro la casa di Lia. Ritorna stdout+stderr uniti
    (troncati), il codice d'uscita e se è andato in timeout. Non solleva mai."""
    timeout = max(1, min(TIMEOUT_MAX, int(timeout or 20)))
    try:
        p = subprocess.run(
            ["bash", "-lc", cmd],
            cwd=CASA,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "HOME": CASA, "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin")},
        )
        out = (p.stdout or "") + (("\n" + p.stderr) if p.stderr else "")
        troncato = len(out) > OUT_MAX
        return {"ok": True, "codice": p.returncode, "output": out[:OUT_MAX], "troncato": troncato, "timeout": False}
    except subprocess.TimeoutExpired as e:
        parz = ((e.stdout or "") + (e.stderr or "")) if isinstance(e.stdout, str) else ""
        return {"ok": True, "codice": 124, "output": (parz or "")[:OUT_MAX], "troncato": False, "timeout": True}
    except Exception as e:
        return {"ok": False, "errore": str(e)[:200]}


class H(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass  # niente rumore nei log

    def do_GET(self):
        if self.path.startswith("/health"):
            return self._json(200, {"ok": True, "casa": CASA})
        return self._json(404, {"errore": "not found"})

    def do_POST(self):
        if not self.path.startswith("/esegui"):
            return self._json(404, {"errore": "not found"})
        # autenticazione: solo chi ha la chiave condivisa (il cervello) può eseguire
        if not CHIAVE or self.headers.get("X-Ambiente-Key", "") != CHIAVE:
            return self._json(403, {"errore": "chiave non valida"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            d = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"errore": "corpo non valido"})
        cmd = str(d.get("cmd") or "").strip()
        if not cmd:
            return self._json(400, {"errore": "comando mancante"})
        return self._json(200, _esegui(cmd, d.get("timeout")))


def main():
    os.makedirs(CASA, exist_ok=True)
    srv = ThreadingHTTPServer(("0.0.0.0", PORTA), H)
    print(f"[ambiente] pronto su :{PORTA} — casa {CASA}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
