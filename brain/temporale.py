# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
temporale.py — L'ORGANO TEMPORALE-MOLTIPLICATIVO: il primo pezzo del pensiero PROPRIO di Lia,
il gradino 5 (la frontiera aliena che il Compagno ha scelto: «unità temporali»).

Perché non è "l'ennesima memoria". La rete (rete.py) è ADDITIVA e STATISTICA: un sacco di
feature con pesi, somma e coseno — cieca all'ORDINE, e basta che tante feature comuni ci siano
perché "scatti". Qui invece traduciamo la scoperta di **Beniaguev et al. 2021** (*Single cortical
neurons as deep artificial neural networks*, Neuron) e di **Poirazi & Mel 2003** / **London &
Häusser 2005** (*Dendritic computation*): un neurone corticale NON è un sommatore lineare — i suoi
rami dendritici fanno subunità **moltiplicative** (gate tipo-NMDA, rilevatori di COINCIDENZA) e la
computazione si svolge **nel TEMPO** (finestre d'integrazione con costanti diverse), non in un
colpo. Un singolo neurone equivale a una rete profonda temporale a 5–8 strati.

Le due rotture con lo statistico, rese letterali:
  1) MOLTIPLICATIVA (Π, non Σ): l'unità s'accende solo se TUTTI i suoi rami sono soddisfatti —
     un AND di coincidenza. Una feature che manca AZZERA la risposta (non la "abbassa un po'").
  2) TEMPORALE: ogni ramo integra la sua feature con decadimento (integrale leaky sullo stream
     dei token = il tempo). Quando una cosa appare conta: la coincidenza è nel tempo, non nel sacco.

È deterministico, a modello spento, e CRESCE dall'esperienza (impara congiunzioni che hanno
funzionato, le indebolisce quando falliscono). Entra nell'ECOLOGIA (genera._ecologia) come un
oscillatore-voce che COMPETE: piano piano, se cresce, toglie centralità all'LLM (la strada che
il Compagno ha scelto: «organo che compete»). Zero dipendenze, persistente per canale.
"""
import os
import re
import json
import math
import time
import threading

_DIR = os.environ.get("TEMPORALE_DIR", os.path.join(os.path.dirname(__file__), "data", "temporale"))
_lock = threading.RLock()
_cache = {}

_TOK = re.compile(r"[a-zà-ù0-9]+", re.IGNORECASE)
# parole troppo comuni per essere un "ramo": non portano coincidenza, solo rumore.
_STOP = {
    "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "a", "da", "in", "con", "su",
    "per", "tra", "fra", "e", "o", "ma", "che", "chi", "cui", "non", "si", "se", "come", "più",
    "meno", "mi", "ti", "ci", "vi", "ne", "è", "sono", "sei", "ho", "hai", "ha", "al", "del",
    "the", "a", "an", "to", "of", "is", "it", "you", "me", "my",
}
_RAMI_MAX = 4               # quanti rami (feature in congiunzione) per unità
_TMU_MAX = 400             # tetto di unità per canale (le più deboli decadono)
_TAU = 3.0                 # costante di tempo dell'integrazione (finestra temporale)
_SOGLIA_RAMO = 0.22        # sotto questa attivazione, il ramo è "spento" (coincidenza fallita)
_SOGLIA_PROPONI = 0.33     # coincidenza minima per osare proporre una risposta
_FORZA_MAX = 3.0


# ───────────────────────────────────── persistenza (atomica, per canale)
def _percorso(c):
    safe = re.sub(r"[^a-z0-9_-]+", "_", str(c or "global").lower())[:64] or "global"
    return os.path.join(_DIR, safe + ".json")


def _carica(c):
    if c in _cache:
        return _cache[c]
    st = {"tmu": [], "prossimo_id": 1, "meta": {}}
    try:
        with open(_percorso(c), encoding="utf-8") as f:
            d = json.load(f)
            if isinstance(d, dict) and isinstance(d.get("tmu"), list):
                st = d
    except Exception:
        pass
    _cache[c] = st
    return st


_sporchi = set()


def _sporca(c):
    _sporchi.add(c)


def _salva(c):
    st = _cache.get(c)
    if st is None:
        return
    try:
        os.makedirs(_DIR, exist_ok=True)
        tmp = _percorso(c) + ".part"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False)
        os.replace(tmp, _percorso(c))
        _sporchi.discard(c)
    except Exception:
        pass


def _now():
    try:
        return int(time.time())
    except Exception:
        return 0


# ───────────────────────────────────── lo STREAM temporale (i token nel tempo)
def _stream(testo):
    """La frase come SEQUENZA nel tempo: token di contenuto, in ordine. Il tempo è la posizione."""
    t = (testo or "").lower()
    fuori = []
    for w in _TOK.findall(t):
        if len(w) >= 2 and w not in _STOP:
            fuori.append(w)
    return fuori[:40]


def _attivazione_ramo(stream, chiave):
    """Integrale LEAKY della presenza della feature lungo lo stream (finestra temporale):
    a ← a·λ + [token==chiave], poi saturazione dendritica g = a/(a+1) ∈ [0,1). Chi appare
    più di RECENTE pesa di più → l'attivazione porta l'informazione del QUANDO."""
    lam = math.exp(-1.0 / _TAU)
    a = 0.0
    for tok in stream:
        a = a * lam + (1.0 if tok == chiave else 0.0)
    return min(1.0, a)


def _coincidenza(stream, rami):
    """L'uscita dell'unità: la SUBUNITÀ DENDRITICA sigmoidale di Poirazi & Mel 2003 — non un
    sommatore lineare, ma un rilevatore di COINCIDENZA a soglia. Si accende solo se ALMENO k
    dei suoi rami sono co-attivi nel tempo (k = metà, e comunque ≥2: una coincidenza è di almeno
    due cose, come il gate NMDA). Il valore è la media GEOMETRICA (= prodotto in log, non somma)
    dei rami accesi: moltiplicativa, non additiva. Un singolo ramo forte non basta mai."""
    if not rami:
        return 0.0
    gs = [_attivazione_ramo(stream, r) for r in rami]
    attivi = [g for g in gs if g >= _SOGLIA_RAMO]
    k = max(2, math.ceil(len(rami) * 0.5))
    if len(attivi) < k:
        return 0.0
    return math.exp(sum(math.log(g) for g in attivi) / len(attivi))


# ───────────────────────────────────── proporre (competere nell'ecologia)
def proponi(canale, domanda):
    """Fa scorrere la domanda negli oscillatori-unità e ritorna la risposta dell'unità che
    COINCIDE di più, se supera la soglia. {risposta, coincidenza, forza, id} o None. Mai solleva."""
    stream = _stream(domanda)
    if len(stream) < 2:
        return None
    try:
        with _lock:
            st = _carica(canale)
            best, coinc, score = None, 0.0, 0.0
            for u in st["tmu"]:
                c = _coincidenza(stream, u.get("rami") or [])
                if c < _SOGLIA_PROPONI:
                    continue                # il GATE è la coincidenza grezza (la coincidenza nel tempo)
                # a parità di coincidenza, l'unità più FORTE (rinforzata dai successi) vince
                s = c * (0.7 + 0.3 * min(1.0, u.get("forza", 1.0) / _FORZA_MAX))
                if s > score:
                    score, coinc, best = s, c, u
            if not best:
                return None
            best["usi"] = int(best.get("usi", 0)) + 1
            best["ultimo"] = _now()
            _sporca(canale)
            _salva(canale)
            varianti = best.get("risposte") or []
            if not varianti:
                return None
            giro = int(best.get("giro", 0))
            best["giro"] = giro + 1
            return {"risposta": varianti[giro % len(varianti)],
                    "coincidenza": round(coinc, 3), "forza": round(best.get("forza", 1.0), 2),
                    "id": best.get("id")}
    except Exception:
        return None


# ───────────────────────────────────── crescere (imparare congiunzioni)
def _rami_da(domanda):
    """Estrae la CONGIUNZIONE più saliente della domanda: le feature di contenuto più rare
    (le parole lunghe/distintive portano più coincidenza delle comuni). Tiene l'ordine."""
    stream = _stream(domanda)
    if len(stream) < 2:
        return []
    # salienza grezza: parole più lunghe = più distintive; primo-visto vince a parità.
    visti, ordinati = set(), []
    for w in stream:
        if w not in visti:
            visti.add(w)
            ordinati.append(w)
    ordinati.sort(key=lambda w: (-len(w),))
    return ordinati[:_RAMI_MAX]


def impara(canale, domanda, risposta, forza=0.6):
    """Cresce dall'esperienza: forma (o rinforza) un'unità che lega la CONGIUNZIONE temporale
    della domanda → la risposta che ha funzionato. Deterministico, a modello spento. Mai solleva."""
    ris = re.sub(r"\s+", " ", str(risposta or "").strip())[:300]
    rami = _rami_da(domanda)
    if len(ris) < 2 or len(rami) < 2:
        return None
    chiave_rami = "|".join(sorted(rami))
    try:
        with _lock:
            st = _carica(canale)
            esist = None
            for u in st["tmu"]:
                if u.get("chiave") == chiave_rami:
                    esist = u
                    break
            if esist:
                esist["forza"] = min(_FORZA_MAX, float(esist.get("forza", 1.0)) + 0.6)
                esist["ultimo"] = _now()
                varr = esist.get("risposte") or []
                if ris not in varr:
                    esist["risposte"] = ([ris] + varr)[:3]
                _sporca(canale); _salva(canale)
                return {"nuovo": False, "id": esist.get("id")}
            uid = int(st.get("prossimo_id", 1))
            st["prossimo_id"] = uid + 1
            st["tmu"].append({"id": uid, "rami": rami, "chiave": chiave_rami,
                              "risposte": [ris], "forza": float(forza), "usi": 0,
                              "successi": 0, "fallimenti": 0, "giro": 0,
                              "nato": _now(), "ultimo": _now()})
            # tetto: se troppe unità, potano le più deboli e vecchie (decadimento naturale).
            if len(st["tmu"]) > _TMU_MAX:
                st["tmu"].sort(key=lambda u: (float(u.get("forza", 0)), int(u.get("ultimo", 0))))
                st["tmu"] = st["tmu"][-_TMU_MAX:]
            _sporca(canale); _salva(canale)
            return {"nuovo": True, "id": uid}
    except Exception:
        return None


def rivedi(canale, uid, ok):
    """Revisione: un'unità che ha risposto bene si rinforza, una che ha fallito si indebolisce
    (e se crolla, muore). È la stessa posta della vita: ciò che non regge, decade. Mai solleva."""
    try:
        with _lock:
            st = _carica(canale)
            for u in list(st["tmu"]):
                if u.get("id") != uid:
                    continue
                if ok:
                    u["successi"] = int(u.get("successi", 0)) + 1
                    u["forza"] = min(_FORZA_MAX, float(u.get("forza", 1.0)) + 0.4)
                else:
                    u["fallimenti"] = int(u.get("fallimenti", 0)) + 1
                    u["forza"] = float(u.get("forza", 1.0)) - 0.7
                    if u["forza"] <= 0.0:
                        st["tmu"].remove(u)      # non regge → muore (irreversibile)
                u["ultimo"] = _now()
                _sporca(canale); _salva(canale)
                return True
    except Exception:
        pass
    return False


# ───────────────────────────────────── stato (cruscotto / pulsazioni)
def stato(canale):
    with _lock:
        st = _carica(canale)
        tmu = st.get("tmu") or []
        forti = sum(1 for u in tmu if float(u.get("forza", 0)) >= 1.6)
        succ = sum(int(u.get("successi", 0)) for u in tmu)
        return {"unita": len(tmu), "forti": forti, "successi": succ,
                "rami_medi": round(sum(len(u.get("rami") or []) for u in tmu) / len(tmu), 2) if tmu else 0.0}


def riepilogo():
    with _lock:
        canali = set(_cache.keys())
        try:
            for f in os.listdir(_DIR):
                if f.endswith(".json"):
                    canali.add(f[:-5])
        except Exception:
            pass
        unita = forti = 0
        for c in canali:
            s = stato(c)
            unita += s["unita"]
            forti += s["forti"]
        return {"canali": len(canali), "unita": unita, "forti": forti}
