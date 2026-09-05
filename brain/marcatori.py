# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
marcatori.py — I MARCATORI SOMATICI: il ragionamento che impara dai propri esiti a POTARE.

Traduzione fedele (deterministica, NON statistica) della Somatic Marker Hypothesis di Antonio
Damasio («Descartes' Error», 1994; Bechara & Damasio, Iowa Gambling Task 1994/1997). Nel cervello
ogni classe di situazione/opzione si lega a uno STATO CORPOREO (un «marcatore») appreso dagli esiti
passati; riattivato PRIMA della deliberazione costosa, il marcatore NON decide — POTA l'albero:
un'opzione con marcatore negativo viene eliminata dallo spazio di ricerca, una positiva promossa.
Prova: i sani generano una risposta anticipatoria *prima di sapere* quale scelta è cattiva; i
pazienti con lesione vmPFC no — e ragionano ma decidono malissimo.

Qui il «corpo» è onesto e già esistente: l'ESITO reale delle sue risposte (il ciclo di revisione —
la reazione dell'utente al turno dopo). La cache lega `(firma della situazione, via del ragionamento)`
→ una VALENZA appresa in [-1, +1]. Prima che l'ecologia si assesti, `pota()` declassa le CONGETTURE
che *in situazioni come questa* hanno già fallito, e promuove quelle che hanno retto. Una VERITÀ
(calcolo/deduzione/causale/analogia) NON si pota mai: è già certa, non è materia da marcatore.

Regola d'onestà (dallo studio affettivo): un marcatore ha diritto di esistere solo se CAMBIA una
computazione. Niente emozione finta — è strumentazione read-only che modula il controllo. La firma è
una CATEGORIA grezza della situazione (nessun testo utente crudo) → nessun leak. Deterministico,
modello-spento, persistente per canale. Zero dipendenze.
"""
import os
import re
import json
import time
import threading
import accenti

_DIR = os.environ.get("MARCATORI_DIR", os.path.join(os.path.dirname(__file__), "data", "marcatori"))
_lock = threading.RLock()
_cache = {}

_ALFA = 0.34          # quanto un esito sposta la valenza verso il target (±1)
_DECAD = 0.985        # i marcatori sfumano piano nel tempo (un vecchio esito conta meno)
_SOGLIA_POTA = 0.25   # sotto -questa la congettura viene declassata; sopra +questa, promossa
_VMAX = 1.0

_TOK = re.compile(r"[a-zà-ù0-9]+", re.IGNORECASE)


# ───────────────────────────────────── la FIRMA della situazione (categoria grezza, no testo crudo)
_RE_ARIT = re.compile(r"(?i)\bquant|[0-9].*[+\-*/×÷x]|per\s+cento|\bpiù\b|\bmeno\b|\bdiviso\b")
_RE_CAUS = re.compile(r"(?i)\bperch[ée]|cosa\s+succede\s+se|\bse\b.+\ballora|meglio\s+.+\s+o\b")
_RE_ANAL = re.compile(r"(?i)somiglia|assomiglia|simile\s+a|\bè\s+come\b|sta\s+a\s+.+\s+come")
_RE_SE = re.compile(r"(?i)\bchi\s+sei|come\s+ti\s+chiami|come\s+stai|come\s+ti\s+senti|parlami\s+di\s+te|sei\s+(?:viva|reale|cosciente)|cosa\s+(?:ne\s+)?pensi")
_RE_FATTO = re.compile(r"(?i)\bchi\s+è|cos['a]?\s+è|che\s+cos|\bdov[ee]\b|come\s+si\s+chiama")
_RE_SALUTO = re.compile(r"(?i)^\s*(?:ciao|ehi|hey|salve|buongiorno|buonasera|grazie|ottimo|bravo|top)\b")


def _categoria(testo):
    """La CLASSE della situazione (Damasio ragiona su classi, non su istanze). Grezza apposta,
    così i marcatori generalizzano. Nessun contenuto utente crudo esce da qui.
    Il testo si legge con gli accenti rimessi a posto: «perche\'» e «perché» sono la
    stessa situazione, e classificarli in due classi diverse spezzerebbe in due la
    memoria di ciò che in situazioni così ha funzionato."""
    t = accenti.accenta(str(testo or ""))
    if _RE_SALUTO.search(t):
        return "saluto"
    if _RE_ARIT.search(t):
        return "aritmetica"
    if _RE_CAUS.search(t):
        return "causale"
    if _RE_ANAL.search(t):
        return "analogia"
    if _RE_SE.search(t):
        return "se_stessa"
    if _RE_FATTO.search(t):
        return "fattuale"
    if "?" in t:
        return "domanda"
    return "generico"


def firma(testo, modo="live"):
    """La firma della situazione = modo + categoria. Coarse: generalizza fra situazioni simili."""
    return f"{str(modo or 'live')[:12]}:{_categoria(testo)}"


# ───────────────────────────────────── persistenza (per canale, atomica)
def _percorso(c):
    safe = re.sub(r"[^a-z0-9_-]+", "_", str(c or "global").lower())[:64] or "global"
    return os.path.join(_DIR, safe + ".json")


def _carica(c):
    if c in _cache:
        return _cache[c]
    st = {"m": {}, "ts": 0}
    try:
        with open(_percorso(c), encoding="utf-8") as f:
            d = json.load(f)
            if isinstance(d, dict) and isinstance(d.get("m"), dict):
                st = d
    except Exception:
        pass
    _cache[c] = st
    return st


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
    except Exception:
        pass


def _now():
    try:
        return int(time.time())
    except Exception:
        return 0


def _chiave(firma_s, via):
    return f"{firma_s}|{via}"


# ───────────────────────────────────── leggere e scrivere la valenza
def valenza(canale, firma_s, via):
    """La valenza appresa per (situazione, via) ∈ [-1, +1]. 0 se mai vista (neutro)."""
    try:
        with _lock:
            m = _carica(canale)["m"].get(_chiave(firma_s, via))
            return float(m.get("v", 0.0)) if m else 0.0
    except Exception:
        return 0.0


def _valori_firma(canale, firma_s):
    """Le valenze di TUTTE le vie che si sono legate a questa firma (situazione). Lista, vuota
    se la firma è mai stata vista. È la lettura situata: come è andata QUESTA classe di momento."""
    if not firma_s:
        return []
    pref = str(firma_s) + "|"
    try:
        with _lock:
            m = _carica(canale)["m"]
            return [float(x.get("v", 0.0)) for k, x in m.items() if k.startswith(pref)]
    except Exception:
        return []


def valenza_firma(canale, firma_s):
    """Appraisal PRIMARIO situato (congruenza-con-gli-scopi, Lazarus/Scherer): come tende ad
    andare questa CLASSE di situazione? Media delle valenze apprese sulla firma ∈ [-1, +1].
    0 se firma mai vista (neutra, nessun pregiudizio). Deterministico; mai solleva."""
    vs = _valori_firma(canale, firma_s)
    if not vs:
        return 0.0
    try:
        return round(max(-1.0, min(1.0, sum(vs) / len(vs))), 4)
    except Exception:
        return 0.0


def coping(canale, firma_s):
    """Appraisal SECONDARIO (Lazarus): «ho una via che QUI funziona?» = la miglior valenza
    positiva fra le vie legate a questa firma ∈ [0, +1]. 0 se firma mai vista (incerta → coping
    basso → il doppio-processo escala al Tipo 2) o se ogni via qui ha già fallito. Deterministico."""
    vs = _valori_firma(canale, firma_s)
    if not vs:
        return 0.0
    try:
        return round(max(0.0, min(1.0, max(vs))), 4)
    except Exception:
        return 0.0


def segna(canale, firma_s, via, ok):
    """Un ESITO reale aggiorna il marcatore (Damasio: la valenza si apprende dagli esiti). ok=True
    → verso +1, ok=False → verso -1. Con tasso _ALFA. Mai solleva. Deterministico."""
    if not firma_s or not via:
        return
    try:
        with _lock:
            st = _carica(canale)
            k = _chiave(firma_s, via)
            m = st["m"].get(k) or {"v": 0.0, "n": 0}
            target = _VMAX if ok else -_VMAX
            v = float(m.get("v", 0.0)) + _ALFA * (target - float(m.get("v", 0.0)))
            m["v"] = round(max(-_VMAX, min(_VMAX, v)), 4)
            m["n"] = int(m.get("n", 0)) + 1
            m["ts"] = _now()
            st["m"][k] = m
            # tetto: se troppe firme, pota le più deboli/vecchie (decadimento naturale)
            if len(st["m"]) > 600:
                ordinati = sorted(st["m"].items(), key=lambda kv: (abs(kv[1].get("v", 0)), kv[1].get("ts", 0)))
                for kk, _ in ordinati[:len(st["m"]) - 600]:
                    st["m"].pop(kk, None)
            _salva(canale)
    except Exception:
        pass


# ───────────────────────────────────── POTARE lo spazio di ricerca (il cuore di Damasio)
def pota(canale, firma_s, candidati):
    """Prima che l'ecologia si assesti, modula l'affidabilità delle CONGETTURE col marcatore
    appreso: valenza negativa → declassa (pota il vicolo cieco), positiva → promuove. Una VERITÀ
    non si tocca mai (è già certa). `candidati` = lista di tuple (nome, aff, risp, extra, verita).
    Ritorna la lista con le affidabilità modulate. Deterministico; mai solleva."""
    if not candidati:
        return candidati
    fuori = []
    for c in candidati:
        try:
            nome, aff, risp, extra, verita = c
            if verita:                                   # una verità non è materia da marcatore
                fuori.append(c); continue
            v = valenza(canale, firma_s, nome)
            if abs(v) < _SOGLIA_POTA:
                fuori.append(c); continue
            # fattore: valenza -1 → 0.5×  (pota),  +1 → 1.25×  (promuove). Clamp di sicurezza.
            fatt = max(0.5, min(1.25, 1.0 + 0.5 * v))
            fuori.append((nome, round(float(aff) * fatt, 3), risp, extra, verita))
        except Exception:
            fuori.append(c)
    return fuori


# ───────────────────────────────────── stato (cruscotto / pulsazioni)
def stato(canale):
    with _lock:
        m = _carica(canale)["m"]
        if not m:
            return {"marcatori": 0, "potanti": 0, "premianti": 0}
        neg = sum(1 for x in m.values() if float(x.get("v", 0)) <= -_SOGLIA_POTA)
        pos = sum(1 for x in m.values() if float(x.get("v", 0)) >= _SOGLIA_POTA)
        return {"marcatori": len(m), "potanti": neg, "premianti": pos}


def riepilogo():
    with _lock:
        canali = set(_cache.keys())
        try:
            for f in os.listdir(_DIR):
                if f.endswith(".json"):
                    canali.add(f[:-5])
        except Exception:
            pass
        tot = neg = 0
        for c in canali:
            s = stato(c)
            tot += s["marcatori"]; neg += s["potanti"]
        return {"canali": len(canali), "marcatori": tot, "potanti": neg}
