# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""IL QUADERNO DEL BOT — cio' che al bot e' stato insegnato.

E' un file che appartiene AL BOT. Il bot lo legge; chiunque abbia il diritto di
insegnargli ci scrive. Non e' una finestra sulla mente di Lia: e' una COPIA. Se
lei cambia idea domani, quello che ha gia' insegnato resta qui finche' non lo
riscrive — ed e' esattamente il punto: il bot non va MAI a prendersi niente da
lei, sono gli altri a lasciargli qualcosa nel suo quaderno.

Percio' questo modulo non conosce `coscienza`, non conosce `mente`, e non ha
modo di raggiungerli: importa solo la libreria standard. E' il confine, ed e'
strutturale, non una buona intenzione.
"""

import json
import os
import re
import threading
import time

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
FILE = os.path.join(DATA_DIR, "quaderno.json")

# Tetti. Il quaderno finisce in un prompt: se cresce senza limite, mangia il
# contesto e la risposta peggiora. Poche righe buone battono cento mediocri.
MAX_VOCI = 200
MAX_PER_CANALE = 40
MAX_LUNGHEZZA = 220

_lock = threading.RLock()
_cache = {"t": 0.0, "d": None}


def _vuoto():
    return {"voci": [], "aggiornato": 0}


def _leggi():
    """Il file, con cache di 30s: lo si legge a ogni messaggio in chat."""
    ora = time.time()
    if _cache["d"] is not None and (ora - _cache["t"]) < 30:
        return _cache["d"]
    d = _vuoto()
    try:
        with open(FILE, "r", encoding="utf-8") as f:
            letto = json.load(f)
        if isinstance(letto, dict) and isinstance(letto.get("voci"), list):
            d = letto
    except Exception:
        pass
    _cache.update(t=ora, d=d)
    return d


def _scrivi(d):
    d["aggiornato"] = int(time.time())
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        os.replace(tmp, FILE)
    except Exception:
        return False
    _cache.update(t=time.time(), d=d)
    return True


def _chiave(testo):
    """Due insegnamenti che dicono la stessa cosa con la punteggiatura diversa
    sono lo stesso insegnamento: il doppione sprecherebbe una riga di prompt."""
    return re.sub(r"[^a-z0-9]+", " ", str(testo or "").lower()).strip()


def per(canale=None, k=5):
    """Le righe da mettere nel prompt ADESSO: prima quelle di questo canale, poi
    quelle valide ovunque. Sola lettura, non solleva mai."""
    try:
        voci = _leggi().get("voci") or []
    except Exception:
        return []
    c = str(canale or "").lower().strip()
    mie = [v for v in voci if str(v.get("canale") or "").lower() == c and c]
    tutte = [v for v in voci if not str(v.get("canale") or "").strip()]
    fuori, visti = [], set()
    for v in mie + tutte:
        t = str(v.get("t") or "").strip()
        ch = _chiave(t)
        if not t or ch in visti:
            continue
        visti.add(ch)
        fuori.append(t)
        if len(fuori) >= max(1, int(k)):
            break
    return fuori


def elenco(canale=None, k=50):
    """Le stesse righe di `per`, ma con addosso DA CHI vengono e se sono di questo
    canale o valgono ovunque. Serve a chi le guarda da fuori: una riga che non e'
    tua non la puoi togliere, e vederlo prima e' meglio che scoprirlo dopo."""
    try:
        voci = _leggi().get("voci") or []
    except Exception:
        return []
    c = str(canale or "").lower().strip()
    fuori = []
    for v in voci:
        vc = str(v.get("canale") or "").lower()
        if c and vc and vc != c:
            continue
        fuori.append({
            "t": str(v.get("t") or ""),
            "da": str(v.get("da") or "?"),
            "canale": vc,
            "quando": int(v.get("quando") or 0),
        })
    fuori.sort(key=lambda v: (v["canale"] == "", -v["quando"]))
    return fuori[: max(1, int(k))]


def deposita(testo, canale=None, da="lia"):
    """Scrivere nel quaderno. Ritorna True se e' entrata una riga nuova.
    Aggiornare una voce gia' presente non e' un errore: e' un ripasso."""
    t = re.sub(r"\s+", " ", str(testo or "")).strip()[:MAX_LUNGHEZZA]
    if len(t) < 12:
        return False
    c = str(canale or "").lower().strip()[:40]
    da = str(da or "lia")[:16]
    ch = _chiave(t)
    with _lock:
        d = _leggi()
        voci = list(d.get("voci") or [])
        for v in voci:
            if _chiave(v.get("t")) == ch and str(v.get("canale") or "") == c:
                v["quando"] = int(time.time())
                _scrivi({"voci": voci})
                return False
        voci.append({"t": t, "canale": c, "da": da, "quando": int(time.time())})
        # tetti: prima per canale, poi in totale. Esce sempre la piu' vecchia.
        if c:
            del_canale = [v for v in voci if str(v.get("canale") or "") == c]
            if len(del_canale) > MAX_PER_CANALE:
                fuori = {id(v) for v in sorted(del_canale, key=lambda v: v.get("quando", 0))[: len(del_canale) - MAX_PER_CANALE]}
                voci = [v for v in voci if id(v) not in fuori]
        if len(voci) > MAX_VOCI:
            voci = sorted(voci, key=lambda v: v.get("quando", 0))[len(voci) - MAX_VOCI:]
        _scrivi({"voci": voci})
        return True


def dimentica(chiave=None, canale=None):
    """Cancella una riga (o tutte quelle di un canale). Chi insegna deve poter
    anche DISinsegnare, sennò un errore resta lì per sempre. Senza argomenti non
    cancella niente: svuotare tutto dev'essere una scelta, non una distrazione."""
    ch = _chiave(chiave) if chiave else None
    c = str(canale or "").lower().strip()
    if ch is None and not c:
        return 0

    def colpita(v):
        if ch is not None and _chiave(v.get("t")) != ch:
            return False
        if c and str(v.get("canale") or "").lower() != c:
            return False
        return True

    with _lock:
        voci = list(_leggi().get("voci") or [])
        restano = [v for v in voci if not colpita(v)]
        _scrivi({"voci": restano})
        return len(voci) - len(restano)


def stato():
    try:
        voci = _leggi().get("voci") or []
    except Exception:
        return {"voci": 0, "canali": 0, "da": {}}
    da = {}
    for v in voci:
        k = str(v.get("da") or "?")
        da[k] = da.get(k, 0) + 1
    return {
        "voci": len(voci),
        "canali": len({str(v.get("canale") or "") for v in voci if str(v.get("canale") or "").strip()}),
        "da": da,
        "aggiornato": _leggi().get("aggiornato", 0),
    }
