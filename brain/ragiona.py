"""
ragiona.py — il "cervello ad hoc NON statistico" di lia: ragionamento SIMBOLICO.

Mentre l'LLM (genera.py) è statistico e serve per il LINGUAGGIO, questo è un
motore a REGOLE e FATTI: non stima probabilità, DEDUCE. È logica vera, tutta sua,
che cresce da ciò che impara — e sa spiegare PERCHÉ arriva a una conclusione.

Come funziona:
  • FATTI    — conoscenze come triple (soggetto, relazione, oggetto):
               (Genova, si-trova, Liguria) · (gatto, è, mammifero) · …
  • REGOLE   — inferenze deterministiche:
               transitività dell'«è»:   A è B, B è C  ⇒  A è C
               transitività del luogo:  A si-trova B, B si-trova C ⇒ A si-trova C
               ereditarietà:            A è B, B ha C  ⇒  A ha C
               simmetria:               A amico-di B  ⇒  B amico-di A
               contraddizione:          A è B  e  A non-è B  ⇒  incoerenza
  • DEDUCE   — a una domanda ("chi è X?", "dove si trova X?", "X è Y?") risponde
               SOLO se lo può dedurre dai fatti, e allega la CATENA del perché.

Zero dipendenze (pure stdlib), persistente per canale in data/ragiona/. Non è
"coscienza": è un motore inferenziale che affianca l'LLM e la memoria associativa.
"""
import os
import re
import json
import time
import threading

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
RAGIONA_DIR = os.path.join(DATA_DIR, "ragiona")
MAX_TRIPLE = 4000

_lock = threading.RLock()
_cache = {}
_ARTICOLI = r"(?:il|lo|la|i|gli|le|un|uno|una|l'|dei|degli|delle|della|del)\s+"


def _now():
    return int(time.time())


def _pulisci_canale(c):
    c = re.sub(r"[^a-z0-9_-]", "", str(c or "").lower().strip())
    return c or "_"


def _n(s):
    """Normalizza un'entità: minuscolo, senza articolo iniziale, spazi compatti."""
    t = re.sub(r"\s+", " ", str(s or "").strip().lower())
    t = re.sub(r"^" + _ARTICOLI, "", t)
    t = t.strip(" .,;:!?\"'«»")
    return t


# ───────────────────────────────────── estrazione (pattern, NON statistica)
# Da una frase dichiarativa ricava delle triple. Prudente: solo pattern chiari,
# niente domande. Meglio poche triple giuste che tante sbagliate.
_PAT = [
    ("si-chiama", re.compile(r"^\s*(?:" + _ARTICOLI + r")?(.+?)\s+si\s+chiama\s+(.+)$", re.I)),
    ("si-trova",  re.compile(r"^\s*(.+?)\s+si\s+trov\w+\s+(?:a|ad|in|nel|nella|nei|negli|sul|sulla)\s+(.+)$", re.I)),
    ("si-trova",  re.compile(r"^\s*(.+?)\s+è\s+(?:a|ad|in|nel|nella)\s+(.+)$", re.I)),
    ("amico-di",  re.compile(r"^\s*(.+?)\s+è\s+amic\w+\s+di\s+(.+)$", re.I)),
    ("piace",     re.compile(r"^\s*a\s+(.+?)\s+piac\w+\s+(.+)$", re.I)),
    ("non-è",     re.compile(r"^\s*(.+?)\s+non\s+è\s+(?:" + _ARTICOLI + r")?(.+)$", re.I)),
    ("ha",        re.compile(r"^\s*(.+?)\s+(?:ha|hanno)\s+(?:" + _ARTICOLI + r")?(.+)$", re.I)),
    ("è",         re.compile(r"^\s*(.+?)\s+(?:è|sono)\s+(?:" + _ARTICOLI + r")?(.+)$", re.I)),
]


def estrai(testo):
    t = re.sub(r"\s+", " ", str(testo or "").strip())
    if not t or "?" in t or len(t) > 160:
        return []
    # una frase alla volta: prendi la prima proposizione sensata
    for rel, pat in _PAT:
        m = pat.match(t)
        if not m:
            continue
        s, o = _n(m.group(1)), _n(m.group(2))
        if 1 <= len(s) <= 40 and 1 <= len(o) <= 60 and s != o:
            # scarta soggetti/oggetti che sono frasi intere (troppe parole)
            if len(s.split()) <= 4 and len(o.split()) <= 6:
                return [(s, rel, o)]
    return []


# ───────────────────────────────────── persistenza
def _percorso(c):
    return os.path.join(RAGIONA_DIR, _pulisci_canale(c) + ".json")


def _carica(c):
    c = _pulisci_canale(c)
    st = _cache.get(c)
    if st is not None:
        return st
    try:
        with open(_percorso(c), encoding="utf-8") as f:
            st = json.load(f)
        st.setdefault("triple", [])
        st.setdefault("meta", {})
    except Exception:
        st = {"triple": [], "meta": {"contraddizioni": []}}
    _cache[c] = st
    return st


def _salva(c):
    c = _pulisci_canale(c)
    st = _cache.get(c)
    if st is None:
        return
    try:
        os.makedirs(RAGIONA_DIR, exist_ok=True)
        tmp = _percorso(c) + ".part"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False)
        os.replace(tmp, _percorso(c))
    except Exception:
        pass


def _esiste(triple, s, r, o):
    return any(t["s"] == s and t["r"] == r and t["o"] == o for t in triple)


def impara_triple(canale, s, r, o, fonte="detto", perche=""):
    s, o = _n(s), _n(o)
    if not s or not o or s == o:
        return False
    with _lock:
        st = _carica(canale)
        if _esiste(st["triple"], s, r, o):
            return False
        st["triple"].append({"s": s, "r": r, "o": o, "fonte": fonte, "perche": perche, "ts": _now()})
        if len(st["triple"]) > MAX_TRIPLE:
            st["triple"] = st["triple"][-MAX_TRIPLE:]
        _salva(canale)
        return True


def impara_frase(canale, testo):
    n = 0
    for (s, r, o) in estrai(testo):
        if impara_triple(canale, s, r, o, fonte="detto"):
            n += 1
    return n


# ───────────────────────────────────── inferenza (regole, deterministica)
def _indice(triple):
    idx = {}
    for t in triple:
        idx.setdefault((t["s"], t["r"]), []).append(t["o"])
    return idx


def inferisci(canale, max_nuovi=200):
    """Applica le regole e AGGIUNGE i fatti dedotti (con il perché). Ritorna
    quanti nuovi ne ha dedotti e le contraddizioni trovate."""
    with _lock:
        st = _carica(canale)
        triple = st["triple"]
        nuovi, contrad = 0, []
        for _ciclo in range(3):  # qualche passata: le deduzioni ne abilitano altre
            idx = _indice(triple)
            agg = []
            # transitività di 'è' e 'si-trova'
            for rel in ("è", "si-trova"):
                for t in list(triple):
                    if t["r"] != rel:
                        continue
                    for o2 in idx.get((t["o"], rel), []):
                        if t["s"] != o2 and not _esiste(triple, t["s"], rel, o2) and not _esiste(agg, t["s"], rel, o2):
                            agg.append({"s": t["s"], "r": rel, "o": o2, "fonte": "dedotto",
                                        "perche": f"{t['s']} {rel} {t['o']}, e {t['o']} {rel} {o2}", "ts": _now()})
            # ereditarietà: A è B, B ha C ⇒ A ha C
            for t in list(triple):
                if t["r"] != "è":
                    continue
                for c in idx.get((t["o"], "ha"), []):
                    if not _esiste(triple, t["s"], "ha", c) and not _esiste(agg, t["s"], "ha", c):
                        agg.append({"s": t["s"], "r": "ha", "o": c, "fonte": "dedotto",
                                    "perche": f"{t['s']} è {t['o']}, e {t['o']} ha {c}", "ts": _now()})
            # simmetria: amico-di
            for t in list(triple):
                if t["r"] == "amico-di" and not _esiste(triple, t["o"], "amico-di", t["s"]) and not _esiste(agg, t["o"], "amico-di", t["s"]):
                    agg.append({"s": t["o"], "r": "amico-di", "o": t["s"], "fonte": "dedotto",
                                "perche": f"{t['s']} è amico di {t['o']} (l'amicizia è reciproca)", "ts": _now()})
            if not agg:
                break
            for a in agg:
                if nuovi >= max_nuovi:
                    break
                triple.append(a)
                nuovi += 1
        # contraddizioni: A è B e A non-è B
        idx = _indice(triple)
        for t in triple:
            if t["r"] == "è" and t["o"] in idx.get((t["s"], "non-è"), []):
                frase = f"{t['s']} è {t['o']} ma anche NON {t['o']}"
                if frase not in contrad:
                    contrad.append(frase)
        st["meta"]["contraddizioni"] = contrad[:20]
        _salva(canale)
        return {"nuovi": nuovi, "contraddizioni": contrad}


# ───────────────────────────────────── deduzione (risposta + perché)
_Q_CHI = re.compile(r"^\s*(?:chi|cosa|cos'|che cos'?a?)\s+(?:è|sono)\s+(?:" + _ARTICOLI + r")?(.+?)\s*\??$", re.I)
_Q_DOVE = re.compile(r"^\s*dov\w*\s+(?:si\s+trov\w+|è|sta)\s+(?:" + _ARTICOLI + r")?(.+?)\s*\??$", re.I)
_Q_NOME = re.compile(r"^\s*come\s+si\s+chiam\w+\s+(?:" + _ARTICOLI + r")?(.+?)\s*\??$", re.I)
_Q_HA = re.compile(r"^\s*(?:cosa|che\s+cosa)\s+(?:ha|hanno)\s+(?:" + _ARTICOLI + r")?(.+?)\s*\??$", re.I)
_Q_SINO = re.compile(r"^\s*(?:" + _ARTICOLI + r")?(.+?)\s+è\s+(?:" + _ARTICOLI + r")?(.+?)\s*\?\s*$", re.I)


def _cerca(triple, s, r):
    s = _n(s)
    return [(t["o"], t.get("perche", "")) for t in triple if t["s"] == s and t["r"] == r]


def deduci(canale, domanda):
    """Prova a rispondere RAGIONANDO sui fatti. Ritorna {risposta, catena, sicura}
    oppure None se non lo può dedurre. Non inventa mai."""
    d = re.sub(r"\s+", " ", str(domanda or "").strip())
    if not d:
        return None
    with _lock:
        st = _carica(canale)
        triple = st["triple"]
        if not triple:
            return None

        m = _Q_SINO.match(d)      # "X è Y?" → sì/no con motivo
        if m:
            s, o = _n(m.group(1)), _n(m.group(2))
            for (val, perche) in _cerca(triple, s, "è"):
                if val == o:
                    return {"risposta": f"Sì, {s} è {o}.", "catena": perche or f"{s} è {o}", "sicura": True}
            for (val, _p) in _cerca(triple, s, "non-è"):
                if val == o:
                    return {"risposta": f"No, {s} non è {o}.", "catena": f"{s} non è {o}", "sicura": True}
            return None

        for (pat, rel, verbo) in ((_Q_DOVE, "si-trova", "si trova a"), (_Q_NOME, "si-chiama", "si chiama"),
                                  (_Q_CHI, "è", "è"), (_Q_HA, "ha", "ha")):
            m = pat.match(d)
            if not m:
                continue
            s = _n(m.group(1))
            trovati = _cerca(triple, s, rel)
            if trovati:
                o, perche = trovati[0]
                return {"risposta": f"{s.capitalize()} {verbo} {o}.", "catena": perche or f"{s} {rel} {o}", "sicura": True}
            return None
        return None


# ───────────────────────────────────── stato / manutenzione
def stato(canale):
    with _lock:
        st = _carica(canale)
        triple = st["triple"]
        detti = sum(1 for t in triple if t.get("fonte") != "dedotto")
        dedotti = sum(1 for t in triple if t.get("fonte") == "dedotto")
        return {
            "fatti": detti,
            "dedotti": dedotti,
            "contraddizioni": list(st["meta"].get("contraddizioni", []))[:5],
        }


def riepilogo():
    with _lock:
        canali = set(_cache.keys())
        try:
            for f in os.listdir(RAGIONA_DIR):
                if f.endswith(".json"):
                    canali.add(f[:-5])
        except Exception:
            pass
        fatti = dedotti = 0
        for c in canali:
            s = stato(c)
            fatti += s["fatti"]
            dedotti += s["dedotti"]
        return {"canali": len(canali), "fatti": fatti, "dedotti": dedotti}
