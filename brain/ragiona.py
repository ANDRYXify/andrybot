# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
import ast
import json
import time
import operator
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
    # CAUSALITÀ (cause→effetto): verbi non ambigui + «se … allora …». La scala di Pearl parte
    # da qui — un ARCO causale, non una correlazione. (Escludo «porta a»: ambiguo col moto.)
    ("causa",     re.compile(r"^\s*(?:" + _ARTICOLI + r")?(.+?)\s+(?:caus(?:a|ano)|provoc(?:a|ano)|produc(?:e|ono)|gener(?:a|ano)|comport(?:a|ano)|fa\s+venire|porta\s+alla?)\s+(?:" + _ARTICOLI + r")?(.+)$", re.I)),
    ("causa",     re.compile(r"^\s*se\s+(.+?)\s+(?:allora\s+|,\s*)(.+)$", re.I)),
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
        # NEGAZIONE CAUSALE: «X non/mai causa Y» NON è un arco causale positivo (Pearl: la
        # negazione va gestita, non trasformata in causa — sarebbe l'OPPOSTO del vero). Meglio
        # non imparare nulla che imparare una causa sbagliata. Vale anche per l'oggetto negato.
        if rel == "causa" and re.search(r"(?:^|\s)(?:non|mai|senza)(?:\s|$)", m.group(1) + " " + m.group(2), re.I):
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


def deduci_costruendo(canale, domanda):
    """«Non so → COSTRUISCO». Se non lo può dedurre dai fatti che HA, non tira a
    indovinare: DERIVA fatti nuovi dalle sue regole (inferisci) — cioè estende la sua
    conoscenza finché la domanda ha un posto dove trovare risposta — e RIPROVA. Se la
    costruzione la porta a saperlo, risponde da lì (non dalla statistica, non dall'LLM).
    Ritorna {risposta, catena, sicura, costruito} o None. Non solleva mai."""
    try:
        d = deduci(canale, domanda)
        if d and d.get("risposta"):
            return d
        r = inferisci(canale)                     # COSTRUISCE: deriva fatti nuovi dalle regole
        if not r or not r.get("nuovi"):
            return None                            # non c'era nulla da costruire: onesto, tace
        d = deduci(canale, domanda)                # riprova sulla conoscenza appena estesa
        if d and d.get("risposta"):
            d["costruito"] = int(r.get("nuovi", 0))
            return d
        return None
    except Exception:
        return None


# ══════════════════════════ RAGIONARE SULLE CAUSE (la scala di Pearl) ══════════
# Judea Pearl, «The Book of Why» / «Causality»: la SCALA della causalità — vedere (associazione),
# FARE (intervento), immaginare (controfattuale). La correlazione NON è causa: serve un GRAFO
# causale, non una distribuzione. Qui lo percorriamo a mano (ragionamento qualitativo, Forbus;
# modelli mentali, Johnson-Laird):
#   • «perché X?»          → cerca le CAUSE a monte (chi porta a X);
#   • «cosa succede se X?»  → propaga gli EFFETTI a valle (l'intervento, il «fare» di Pearl);
#   • «X o Y?»             → CONFRONTA due cose sulle loro relazioni note.
# Deterministico, SOLO sui fatti che Lei ha imparato (mai inventa: se non sa, tace). Non statistico.
_Q_SESUCC = re.compile(r"(?i)^\s*(?:cosa|che\s+cosa|che|cosa\s+mi)\s+(?:succede|comporta|provoca|causa|"
                       r"comporterebbe|succederebbe)\s+se\s+(?:" + _ARTICOLI + r")?(.+?)\s*\??$")
_Q_PERCHE = re.compile(r"(?i)^\s*perch[ée']+\s+(?:c'?è\s+|ci\s+sono\s+|si\s+|" + _ARTICOLI + r")?(.+?)\s*\??$")
_Q_OPPURE = re.compile(r"(?i)^\s*(?:è\s+meglio\s+|meglio\s+|preferisci\s+|scegli\s+|cosa\s+scegli,?\s+)?"
                       r"(?:" + _ARTICOLI + r")?(.+?)\s+o(?:ppure)?\s+(?:" + _ARTICOLI + r")?(.+?)\s*\??$")


def _match_nodo(triple, ent, campo):
    """Il nodo REALE (fra i valori del campo 's' o 'o') che combacia con l'entità chiesta:
    uguaglianza normalizzata, poi contenimento. None se non c'è — onesto: non inventa un nodo."""
    e = _n(ent)
    if not e or len(e) < 2:
        return None
    valori = [t[campo] for t in triple]
    if e in valori:
        return e
    for v in valori:
        if len(v) >= 3 and (e in v or v in e):
            return v
    return None


def _percorri(triple, x, avanti, prof=3):
    """Percorre il grafo causale da x: avanti=True → effetti (a valle), False → cause (a monte).
    Ritorna [(nodo, catena)] in ampiezza, fino a prof livelli. Evita i cicli (visti)."""
    fuori, visti, frontiera = [], {x}, [(x, [])]
    for _ in range(prof):
        nuova = []
        for nodo, cat in frontiera:
            for t in triple:
                if t["r"] != "causa":
                    continue
                da, a = (nodo, t["o"]) if (avanti and t["s"] == nodo) else \
                        (t["s"], nodo) if (not avanti and t["o"] == nodo) else (None, None)
                if da is None:
                    continue
                prossimo = t["o"] if avanti else t["s"]
                if prossimo in visti:
                    continue
                visti.add(prossimo)
                c = cat + [f"{t['s']} causa {t['o']}"]
                fuori.append((prossimo, c))
                nuova.append((prossimo, c))
        frontiera = nuova
        if not frontiera:
            break
    return fuori


def perche(canale, x):
    """Le CAUSE a monte di x (Pearl: la spiegazione). Ritorna {risposta, catena, sicura} o None."""
    with _lock:
        triple = list(_carica(canale)["triple"])
    nodo = _match_nodo(triple, x, "o")
    if not nodo:
        return None
    cause = _percorri(triple, nodo, avanti=False)
    if not cause:
        return None
    dirette = [c for c, cat in cause if len(cat) == 1][:3] or [cause[0][0]]
    return {"risposta": f"{nodo.capitalize()} perché {' e '.join(dirette)}.",
            "catena": " ; ".join(cause[0][1]), "sicura": True}


def cosa_succede_se(canale, x):
    """Gli EFFETTI a valle di x (Pearl: l'intervento). Ritorna {risposta, catena, sicura} o None."""
    with _lock:
        triple = list(_carica(canale)["triple"])
    nodo = _match_nodo(triple, x, "s")
    if not nodo:
        return None
    eff = _percorri(triple, nodo, avanti=True)
    if not eff:
        return None
    passi = [e for e, cat in eff][:3]
    lunga = max(eff, key=lambda ec: len(ec[1]))[1]
    return {"risposta": f"Se {nodo}, allora {', e poi '.join(passi)}.",
            "catena": " ; ".join(lunga), "sicura": True}


def confronta(canale, a, b):
    """CONFRONTO relazionale: cosa distingue a da b nelle loro proprietà note. Non un giudizio
    di gusto — una differenza STRUTTURALE, dai fatti. Ritorna {risposta, sicura} o None."""
    with _lock:
        triple = list(_carica(canale)["triple"])
    na, nb = _match_nodo(triple, a, "s"), _match_nodo(triple, b, "s")
    if not na or not nb or na == nb:
        return None

    def attr(n):
        return {(t["r"], t["o"]) for t in triple if t["s"] == n and t["r"] in ("è", "ha")}
    aa, ab = attr(na), attr(nb)
    solo_a, solo_b = aa - ab, ab - aa
    pezzi = []
    if solo_a:
        r, o = sorted(solo_a)[0]; pezzi.append(f"{na} {r} {o}")
    if solo_b:
        r, o = sorted(solo_b)[0]; pezzi.append(f"{nb} invece {r} {o}")
    if not pezzi:
        return None
    return {"risposta": "; ".join(pezzi) + ".", "catena": "", "sicura": True}


def ragiona_causale(canale, domanda):
    """Dispatcher: riconosce «cosa succede se / perché / X o Y» e risponde dal grafo causale.
    Ritorna {risposta, catena, sicura, via} o None (se non è una di queste, o se non sa)."""
    d = str(domanda or "").strip()
    if not d:
        return None
    try:
        m = _Q_SESUCC.match(d)
        if m:
            r = cosa_succede_se(canale, m.group(1))
            if r:
                r["via"] = "causale"; return r
        m = _Q_PERCHE.match(d)
        if m:
            r = perche(canale, m.group(1))
            if r:
                r["via"] = "causale"; return r
        m = _Q_OPPURE.match(d)
        if m:
            r = confronta(canale, m.group(1), m.group(2))
            if r:
                r["via"] = "causale"; return r
    except Exception:
        return None
    return None


# ══════════════════════════ RAGIONARE CALCOLANDO (non statistico) ══════════════
# Il primo gradino dell'organo del ragionamento: quando una domanda è CALCOLABILE,
# lei non «ricorda» una risposta plausibile — la CALCOLA. 17×23 non lo pesca da un
# pattern: lo esegue. È il contrario della statistica. Sicuro: niente eval, solo un
# valutatore su AST con una whitelist di operazioni aritmetiche (nessun nome, nessuna
# chiamata, nessun attributo), input filtrato, e tetti anti-abuso.
_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod,
    ast.Pow: operator.pow, ast.USub: operator.neg, ast.UAdd: operator.pos,
}


def _eval_ast(node):
    if isinstance(node, ast.Expression):
        return _eval_ast(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        a, b = _eval_ast(node.left), _eval_ast(node.right)
        if isinstance(node.op, ast.Pow) and (abs(a) > 1e6 or abs(b) > 64):
            raise ValueError("troppo grande")   # niente 9**9**9 che fa esplodere tutto
        return _OPS[type(node.op)](a, b)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_ast(node.operand))
    raise ValueError("non consentito")


def _calcola_sicuro(espr):
    espr = str(espr or "").strip().replace("^", "**").replace("×", "*").replace("÷", "/").replace(",", ".")
    if not re.fullmatch(r"[0-9+\-*/%.() ]{1,80}", espr) or not re.search(r"\d", espr):
        return None
    if "**" in espr and espr.count("*") > 8:
        return None
    try:
        val = _eval_ast(ast.parse(espr, mode="eval"))
    except Exception:
        return None
    if isinstance(val, complex):
        return None
    if isinstance(val, float):
        if val != val or val in (float("inf"), float("-inf")):
            return None
        if float(val).is_integer():
            val = int(val)
        else:
            val = round(val, 6)
    return val


_RE_PERC = re.compile(r"(?i)([\d.,]+)\s*(?:%|per\s*cento)\s+(?:di|su)\s+([\d.,]+)")
_RE_ESPR = re.compile(r"(?i)(?:quanto\s+(?:fa|è|e')|quant['\s]*(?:è|e')|calcola|risultato\s+di|=)\s*([0-9+\-*/%.()^×÷,\s]{2,60})")
_RE_ESPR_NUDA = re.compile(r"^\s*([0-9]+(?:[.,]\d+)?(?:\s*[+\-*/^×÷]\s*[0-9]+(?:[.,]\d+)?){1,20})\s*[=?]?\s*$")

# PAROLE-OPERATORE: lei ragiona NELLA SUA LINGUA, non solo coi simboli. «17 per 23» è una
# moltiplicazione tanto quanto «17×23». Sostituiamo le parole coi simboli SOLO fra due numeri
# (cifra prima, cifra subito dopo via lookahead) — così i chain funzionano («2 per 3 per 4»)
# e le parole in contesto NON matematico («grazie per te») restano intatte. Direttiva 4.
_PAROLE_OP = [
    (re.compile(r"(?i)(\d)\s*(?:\bper\b|\bx\b|\bvolte\b|\bmoltiplicato(?:\s+per)?\b)\s*(?=\d)"), r"\1*"),
    (re.compile(r"(?i)(\d)\s*(?:\bdiviso(?:\s+per)?\b|\bfratto\b|\bsu\b)\s*(?=\d)"), r"\1/"),
    (re.compile(r"(?i)(\d)\s*(?:\bpiù\b|\bpiu\b|\bsommato(?:\s+a)?\b)\s*(?=\d)"), r"\1+"),
    (re.compile(r"(?i)(\d)\s*(?:\bmeno\b|\bsottratto(?:\s+da)?\b|\btolto\b)\s*(?=\d)"), r"\1-"),
    (re.compile(r"(?i)(\d)\s*(?:\belevato\s+a(?:lla)?\b|\balla\b)\s*(?=\d)"), r"\1**"),
    (re.compile(r"(?i)(\d)\s*al\s+quadrato\b"), r"\1**2"),
    (re.compile(r"(?i)(\d)\s*al\s+cubo\b"), r"\1**3"),
]


def _normalizza_operatori(d):
    """Traduce le parole-operatore in simboli, solo in contesto numerico. Idempotente."""
    for rx, sub in _PAROLE_OP:
        # ripete finché stabile: catene lunghe con lookahead sovrapposti
        for _ in range(24):
            nuovo = rx.sub(sub, d)
            if nuovo == d:
                break
            d = nuovo
    return d


def calcola(domanda):
    """Risponde CALCOLANDO (non ricordando) quando la domanda è aritmetica, anche se scritta
    a PAROLE nella sua lingua («17 per 23»). Ritorna {risposta, catena, sicura} o None.
    Deterministico, senza modello, senza eval."""
    d = _normalizza_operatori(str(domanda or ""))
    m = _RE_PERC.search(d)
    if m:
        try:
            x = float(m.group(1).replace(",", ".")); y = float(m.group(2).replace(",", "."))
            r = x / 100.0 * y
            r = int(r) if float(r).is_integer() else round(r, 4)
            return {"risposta": f"{m.group(1)}% di {m.group(2)} fa {r}.",
                    "catena": f"{m.group(1)} ÷ 100 × {m.group(2)} = {r}", "sicura": True}
        except Exception:
            pass
    m = _RE_ESPR.search(d) or _RE_ESPR_NUDA.match(d)
    if m:
        espr = m.group(1)
        r = _calcola_sicuro(espr)
        if r is not None:
            return {"risposta": f"Fa {r}.", "catena": f"{espr.strip()} = {r}", "sicura": True}
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
