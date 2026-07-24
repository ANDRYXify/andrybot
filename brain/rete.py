"""
rete.py — La "piccola rete" che si autoaddestra: memoria associativa che CRESCE.

Non è un transformer: è una rete di NODI che si organizza da sola (stile SOINN /
growing neural gas, ma minimale e in puro Python — nessuna dipendenza, come la
coscienza). Ogni nodo è una cosa imparata: una domanda-tipo → una risposta, con
un vettore (le sue "caratteristiche"), una forza e quante volte è servito.

Come impara:
  • RICHIAMO  — arriva un messaggio: cerco il nodo più simile. Se lo riconosco
                con sicurezza, rispondo SUBITO (motore veloce, niente LLM).
  • CRESCITA  — se un "maestro" (il modello locale o l'endpoint esterno, es. LM
                Studio) o lo streamer mi insegnano qualcosa di NUOVO, creo un
                nodo nuovo. Se somiglia a uno che ho già, lo RINFORZO invece.
  • SONNO     — ogni tanto (consolida): la forza dei nodi cala un po', quelli
                deboli e inutili si dimenticano, i quasi-doppioni si fondono.

Incipit di COSCIENZA (onesto, niente misticismo): la rete tiene un modello di SÉ
— sa quanto è sicura (fiducia) e quanto le manca (curiosità). Quando NON sa
rispondere se ne accorge (metacognizione), segna la lacuna e alza la curiosità:
è questo "sapere di non sapere" che la spinge a chiedere al maestro e a crescere.

Tutto persistente su file JSON nel volume data/ (uno per canale), così la rete
sopravvive ai riavvii e cresce nel tempo.
"""
import os
import re
import json
import math
import time
import threading

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
RETE_DIR = os.path.join(DATA_DIR, "rete")

# ── Parametri (scelti prudenti: la rete risponde da sola solo quando è sicura) ──
SOGLIA_RICONOSCE = 0.74   # somiglianza minima per rispondere da soli (richiamo)
SOGLIA_VICINO    = 0.86   # in apprendimento: sopra questa, RINFORZO invece di creare
SOGLIA_FONDI     = 0.93   # nel sonno: quasi-doppioni da fondere
FORZA_MAX        = 6.0
FORZA_MIN        = 0.5     # sotto questa (e se poco usato/vecchio) → si dimentica
DECADIMENTO      = 0.99    # quanto cala la forza a ogni "sonno"
MAX_NODI         = 2500    # tetto per canale (i più deboli cadono)
MAX_CARATT       = 40      # caratteristiche tenute per nodo (file compatto)
ETA              = 0.25    # quanto il vettore di un nodo si sposta quando lo rinforzo

# Fiducia nelle fonti: chi insegna può sovrascrivere una risposta di fonte "minore".
# streamer (la sua voce) > distillato (dai suoi discorsi) > maestro (LLM) > chat.
_PRIO = {"streamer": 4, "distillato": 3, "maestro": 2, "chat": 1}

_TOK = re.compile(r"[a-zà-ÿ0-9']+", re.IGNORECASE)
_lock = threading.RLock()
_cache = {}      # canale -> stato in memoria
_sporchi = {}    # canale -> quante modifiche non ancora salvate


def _now():
    return int(time.time())


def _pulisci_canale(canale):
    c = re.sub(r"[^a-z0-9_-]", "", str(canale or "").lower().strip())
    return c or "_"


# ── Caratteristiche di un testo → vettore sparso normalizzato (L2) ──────────────
# Parole + trigrammi di caratteri (robusti a refusi). Niente librerie: è un dict
# {caratteristica: peso}. La somiglianza tra due vettori normalizzati è il coseno,
# cioè il semplice prodotto scalare sulle chiavi in comune.
def _caratteristiche(testo):
    t = re.sub(r"\s+", " ", (testo or "").lower().strip())[:240]
    feats = {}
    for w in _TOK.findall(t):
        if len(w) >= 2:
            k = "w:" + w
            feats[k] = feats.get(k, 0.0) + 1.0
    s = " " + t + " "
    for i in range(len(s) - 2):
        k = "g:" + s[i:i + 3]
        feats[k] = feats.get(k, 0.0) + 0.5
    if not feats:
        return {}
    # tieni solo le caratteristiche più forti (file piccolo, richiamo più rapido)
    if len(feats) > MAX_CARATT:
        feats = dict(sorted(feats.items(), key=lambda kv: kv[1], reverse=True)[:MAX_CARATT])
    norma = math.sqrt(sum(v * v for v in feats.values())) or 1.0
    return {k: v / norma for k, v in feats.items()}


def _sim(a, b):
    if not a or not b:
        return 0.0
    if len(a) > len(b):
        a, b = b, a
    return sum(v * b.get(k, 0.0) for k, v in a.items())


def _fondi_vettori(vecchio, nuovo, eta=ETA):
    out = dict(vecchio)
    for k, v in nuovo.items():
        out[k] = out.get(k, 0.0) * (1 - eta) + v * eta
    for k in list(out.keys()):
        if k not in nuovo:
            out[k] *= (1 - eta)
    if len(out) > MAX_CARATT:
        out = dict(sorted(out.items(), key=lambda kv: kv[1], reverse=True)[:MAX_CARATT])
    norma = math.sqrt(sum(v * v for v in out.values())) or 1.0
    return {k: v / norma for k, v in out.items()}


# ── Persistenza ─────────────────────────────────────────────────────────────
def _percorso(canale):
    return os.path.join(RETE_DIR, _pulisci_canale(canale) + ".json")


def _nuovo_stato():
    return {
        "nodi": [],
        "meta": {
            "prossimo_id": 1,
            "curiosita": 0.2,   # 0..1: quanto "sente" di avere lacune
            "fiducia": 0.1,     # 0..1: quanto si fida di ciò che sa
            "lacune": 0,        # quante volte non ha saputo rispondere
            "imparati": 0,      # nodi creati in totale (storico)
            "campione_lacune": [],
            "nato": _now(),
        },
    }


def _carica(canale):
    canale = _pulisci_canale(canale)
    st = _cache.get(canale)
    if st is not None:
        return st
    try:
        with open(_percorso(canale), encoding="utf-8") as f:
            st = json.load(f)
        st.setdefault("nodi", [])
        st.setdefault("meta", {})
        base = _nuovo_stato()["meta"]
        for k, v in base.items():
            st["meta"].setdefault(k, v)
    except Exception:
        st = _nuovo_stato()
    _cache[canale] = st
    return st


def _sporca(canale, salva_ogni=15):
    canale = _pulisci_canale(canale)
    n = _sporchi.get(canale, 0) + 1
    if n >= salva_ogni:
        _salva(canale)
        _sporchi[canale] = 0
    else:
        _sporchi[canale] = n


def _salva(canale):
    canale = _pulisci_canale(canale)
    st = _cache.get(canale)
    if st is None:
        return
    try:
        os.makedirs(RETE_DIR, exist_ok=True)
        tmp = _percorso(canale) + ".part"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False)
        os.replace(tmp, _percorso(canale))
        _sporchi[canale] = 0
    except Exception:
        pass


# ── Richiamo: la rete sa già rispondere a questo? ───────────────────────────
def recall(canale, testo):
    """Ritorna {risposta, certezza, id} se riconosce il messaggio con sicurezza,
    altrimenti None. Non solleva mai."""
    vec = _caratteristiche(testo)
    if not vec:
        return None
    with _lock:
        st = _carica(canale)
        nn, best = None, 0.0
        for n in st["nodi"]:
            s = _sim(vec, n["vec"])
            if s > best:
                best, nn = s, n
        if not nn or best < SOGLIA_RICONOSCE:
            return None
        # fiducia nel nodo: una risposta del maestro (LLM) la ripeto da solo solo
        # dopo averla "sentita" un paio di volte; ciò che viene dallo streamer o
        # dai suoi discorsi mi fido subito.
        affidabile = (
            nn.get("usi", 0) >= 2
            or nn.get("forza", 0) >= 1.6
            or nn.get("fonte") in ("streamer", "distillato")
        )
        if not affidabile:
            return None
        nn["usi"] = nn.get("usi", 0) + 1
        nn["ultimo"] = _now()
        nn["forza"] = min(FORZA_MAX, nn.get("forza", 1.0) + 0.2)   # rinforzo hebbiano
        st["meta"]["fiducia"] = min(1.0, st["meta"].get("fiducia", 0.1) + 0.005)
        varianti = nn.get("risposte") or []
        if not varianti:
            return None
        giro = nn.get("giro", 0)
        nn["giro"] = giro + 1
        risposta = varianti[giro % len(varianti)]   # ruota le varianti = più naturale
        _sporca(canale)
        return {"risposta": risposta, "certezza": round(best, 3), "id": nn["id"]}


# ── Crescita: impara una coppia domanda→risposta (crea o rinforza un nodo) ──
def impara(canale, domanda, risposta, fonte="maestro", forza=1.0):
    """Insegna alla rete. Se somiglia a un nodo esistente lo rinforza, altrimenti
    ne fa crescere uno nuovo. Ritorna {nuovo, id} o None. Non solleva mai."""
    dom = re.sub(r"\s+", " ", str(domanda or "").strip())
    ris = re.sub(r"\s+", " ", str(risposta or "").strip())
    if len(dom) < 3 or len(ris) < 2:
        return None
    vec = _caratteristiche(dom)
    if not vec:
        return None
    with _lock:
        st = _carica(canale)
        nn, best = None, 0.0
        for n in st["nodi"]:
            s = _sim(vec, n["vec"])
            if s > best:
                best, nn = s, n
        if nn and best >= SOGLIA_VICINO:
            # RINFORZO un nodo esistente
            nn["vec"] = _fondi_vettori(nn["vec"], vec)
            nn["forza"] = min(FORZA_MAX, nn.get("forza", 1.0) + 0.6)
            nn["usi"] = nn.get("usi", 0) + 1
            nn["ultimo"] = _now()
            if _PRIO.get(fonte, 1) >= _PRIO.get(nn.get("fonte", "chat"), 1):
                nn["fonte"] = fonte
                varr = nn.get("risposte") or []
                if ris not in varr:
                    nn["risposte"] = ([ris[:300]] + varr)[:3]
            st["meta"]["fiducia"] = min(1.0, st["meta"].get("fiducia", 0.1) + 0.01)
            _sporca(canale)
            return {"nuovo": False, "id": nn["id"]}
        # CRESCITA: nodo nuovo
        nid = st["meta"].get("prossimo_id", 1)
        st["meta"]["prossimo_id"] = nid + 1
        st["meta"]["imparati"] = st["meta"].get("imparati", 0) + 1
        st["nodi"].append({
            "id": nid, "dom": dom[:200], "vec": vec,
            "risposte": [ris[:300]], "forza": float(forza), "usi": 1,
            "nasce": _now(), "ultimo": _now(), "fonte": fonte, "giro": 0,
        })
        # imparare qualcosa di nuovo sazia un filo la curiosità e alza la fiducia
        st["meta"]["curiosita"] = max(0.0, st["meta"].get("curiosita", 0.2) - 0.02)
        st["meta"]["fiducia"] = min(1.0, st["meta"].get("fiducia", 0.1) + 0.005)
        _pota_se_serve(st)
        _sporca(canale, salva_ogni=8)   # i nodi nuovi sono preziosi: salva più spesso
        return {"nuovo": True, "id": nid}


# ── Metacognizione: "so di non sapere". Segna una lacuna, alza la curiosità ──
def segna_lacuna(canale, testo):
    with _lock:
        st = _carica(canale)
        m = st["meta"]
        m["lacune"] = m.get("lacune", 0) + 1
        m["curiosita"] = min(1.0, m.get("curiosita", 0.2) + 0.03)
        m["fiducia"] = max(0.0, m.get("fiducia", 0.1) - 0.01)
        t = re.sub(r"\s+", " ", str(testo or "").strip())[:120]
        if t:
            camp = m.setdefault("campione_lacune", [])
            if t not in camp:
                camp.insert(0, t)
                del camp[8:]
        _sporca(canale)


# ── Sonno: decadimento, oblio, fusione dei doppioni ─────────────────────────
def _pota_se_serve(st):
    if len(st["nodi"]) <= MAX_NODI:
        return
    st["nodi"].sort(key=lambda n: (n.get("forza", 0), n.get("usi", 0)), reverse=True)
    del st["nodi"][MAX_NODI:]


def _fondi_doppioni(st):
    # bucket per la caratteristica-parola più forte → confronti pochi vicini (quasi
    # lineare), poi fondo i nodi davvero quasi-uguali (coseno alto).
    bucket = {}
    for n in st["nodi"]:
        chiave = None
        top = 0.0
        for k, v in n["vec"].items():
            if k.startswith("w:") and v > top:
                top, chiave = v, k
        bucket.setdefault(chiave, []).append(n)
    tieni = []
    fusi = set()
    for gruppo in bucket.values():
        for i, a in enumerate(gruppo):
            if id(a) in fusi:
                continue
            for b in gruppo[i + 1:]:
                if id(b) in fusi:
                    continue
                if _sim(a["vec"], b["vec"]) >= SOGLIA_FONDI:
                    # fondi b dentro a: forza e usi si sommano, tieni le risposte migliori
                    a["forza"] = min(FORZA_MAX, a.get("forza", 1.0) + b.get("forza", 1.0))
                    a["usi"] = a.get("usi", 0) + b.get("usi", 0)
                    a["ultimo"] = max(a.get("ultimo", 0), b.get("ultimo", 0))
                    if _PRIO.get(b.get("fonte", "chat"), 1) > _PRIO.get(a.get("fonte", "chat"), 1):
                        a["fonte"] = b.get("fonte")
                    for r in (b.get("risposte") or []):
                        if r not in a.get("risposte", []):
                            a.setdefault("risposte", []).append(r)
                    a["risposte"] = a["risposte"][:3]
                    fusi.add(id(b))
    for n in st["nodi"]:
        if id(n) not in fusi:
            tieni.append(n)
    st["nodi"] = tieni


def consolida(canale):
    """Il 'sonno' della rete: la forza cala, i nodi deboli/inutili si dimenticano,
    i doppioni si fondono, la curiosità si placa. Da chiamare ogni tanto."""
    with _lock:
        st = _carica(canale)
        limite_eta = _now() - 3 * 86400
        for n in st["nodi"]:
            n["forza"] = n.get("forza", 1.0) * DECADIMENTO
        st["nodi"] = [
            n for n in st["nodi"]
            if n.get("forza", 0) >= FORZA_MIN or n.get("usi", 0) >= 3 or n.get("nasce", 0) >= limite_eta
        ]
        _fondi_doppioni(st)
        _pota_se_serve(st)
        st["meta"]["curiosita"] = st["meta"].get("curiosita", 0.2) * 0.9
        _salva(canale)


# ── Stato per la dashboard / diagnostica ────────────────────────────────────
def stato(canale):
    with _lock:
        st = _carica(canale)
        m = st["meta"]
        nodi = st["nodi"]
        solidi = sum(1 for n in nodi if n.get("usi", 0) >= 2 or n.get("forza", 0) >= 1.6)
        return {
            "nodi": len(nodi),
            "solidi": solidi,               # a quanti sa rispondere da solo, con sicurezza
            "imparati": m.get("imparati", 0),
            "curiosita": round(m.get("curiosita", 0.2), 3),
            "fiducia": round(m.get("fiducia", 0.1), 3),
            "lacune": m.get("lacune", 0),
            "non_so": list(m.get("campione_lacune", []))[:6],
        }


def riepilogo():
    """Sommario globale (tutti i canali visti finora) per /health."""
    with _lock:
        canali = set(_cache.keys())
        try:
            for f in os.listdir(RETE_DIR):
                if f.endswith(".json"):
                    canali.add(f[:-5])
        except Exception:
            pass
        nodi = solidi = 0
        cur = fid = 0.0
        n_canali = 0
        for c in canali:
            s = stato(c)
            nodi += s["nodi"]
            solidi += s["solidi"]
            cur += s["curiosita"]
            fid += s["fiducia"]
            n_canali += 1
        return {
            "canali": n_canali,
            "nodi": nodi,
            "solidi": solidi,
            "curiosita": round(cur / n_canali, 3) if n_canali else 0.0,
            "fiducia": round(fid / n_canali, 3) if n_canali else 0.0,
        }


def salva_tutto():
    with _lock:
        for c in list(_cache.keys()):
            _salva(c)
