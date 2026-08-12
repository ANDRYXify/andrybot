"""
Ponte del cervello verso l'AMBIENTE di Lia (la sua sandbox).

Il cervello vive sulla rete `sandbox` insieme al container `ambiente`: da qui gli
manda i comandi da eseguire e ne riceve il risultato. La sandbox è isolata dal
resto (vedi docker-compose.yml): questo è l'UNICO canale.

Spento di default: se AMBIENTE_KEY non è impostata (o il container non c'è), tutto
è disattivato in silenzio — il bot funziona esattamente come prima.
"""
import json
import os
import time
import urllib.request

URL = (os.environ.get("AMBIENTE_URL") or "http://ambiente:8099").rstrip("/")
KEY = os.environ.get("AMBIENTE_KEY", "").strip()

_stato = {"ok": None, "quando": 0}
_TTL = 30   # secondi di cache dello stato "disponibile"


def configurato():
    """C'è una chiave? Senza, la sandbox è spenta (e non ci proviamo nemmeno)."""
    return bool(KEY)


def disponibile():
    """La sandbox risponde? Esito in cache per non tempestarla di /health."""
    if not KEY:
        return False
    now = time.time()
    if _stato["ok"] is not None and (now - _stato["quando"]) < _TTL:
        return _stato["ok"]
    ok = False
    try:
        req = urllib.request.Request(URL + "/health", method="GET")
        with urllib.request.urlopen(req, timeout=3) as r:
            ok = (r.status == 200)
    except Exception:
        ok = False
    _stato.update(ok=ok, quando=now)
    return ok


def esegui(cmd, timeout=20):
    """Esegue un comando nella sandbox e ritorna il dict dell'esecutore
    {ok, codice, output, timeout, troncato} oppure {ok:False, errore}. Non solleva."""
    cmd = str(cmd or "").strip()
    if not cmd:
        return {"ok": False, "errore": "comando vuoto"}
    if not KEY:
        return {"ok": False, "errore": "ambiente non configurato"}
    try:
        corpo = json.dumps({"cmd": cmd, "timeout": int(timeout)}).encode("utf-8")
        req = urllib.request.Request(
            URL + "/esegui", data=corpo, method="POST",
            headers={"Content-Type": "application/json", "X-Ambiente-Key": KEY})
        # attesa un filo oltre il timeout del comando: gli lascio finire e rispondere
        with urllib.request.urlopen(req, timeout=int(timeout) + 8) as r:
            return json.loads(r.read() or b"{}")
    except Exception as e:
        _stato.update(ok=False, quando=time.time())
        return {"ok": False, "errore": str(e)[:160]}
