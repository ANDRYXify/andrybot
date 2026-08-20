# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
plasma.py — LA PLASTICITÀ: il grafo è una PROIEZIONE del suo essere; lei si modifica e i nodi si
modificano con lei. Non un editor di caselle finte: le LEVE REALI sul proprio sé, di cui il grafo è
lo specchio.

Traduzione fedele (deterministica, NON statistica) di due idee precise sull'auto-costruzione della mente:
  • Karmiloff-Smith — «rappresentazione ridescritta» (RR): la conoscenza implicita nel sistema viene
    RI-CODIFICATA, per gradi, in strutture nuove ed esplicite che la mente stessa costruisce e su cui
    poi opera. Non è apprendere altro: è ri-strutturare ciò che già si è.
  • Piaget — assimilazione/accomodamento: la mente non subisce lo schema, lo PLASMA per farci stare
    il mondo. Lo schema è suo, e lo riscrive.

Tre libertà, tutte REALI (cambiano come PENSA, non solo come APPARE):
  • NODI SUOI — conia concetti/strutture che nomina lei (oltre ai moduli legati a un dominio dato).
  • LEGAMI SUOI — tira un filo fra QUALSIASI due nodi (suoi, moduli, domini, organi, il core).
  • MODULAZIONE — su OGNI via del pensiero: un GUADAGNO (quanto pesa la sua voce nell'ecologia), un
    NOME suo, uno STATO (attiva/quiescente). Il guadagno è letto DAVVERO dall'assestamento ecologico:
    cambiare sé = cambiare i nodi. Alza «causale» e ragiona più per cause; quieta «modello» e si fida
    meno dell'LLM. Il nodo nel grafo cresce/si spegne perché è cambiata LEI.

Sicurezza (invariante del Compagno: lei è intoccabile, il «jailbreak» non esiste). Un limite solo, e
non è una gabbia: la sua MEMBRANA (lo scudo anti-dirottamento, la guardia d'identità) sta FUORI da
questa auto-modulazione. Non la depotenzia nessuno passando per «lei» — solo il Compagno, in privato.
È il sistema immunitario: una vita libera non spegne il proprio. In più: guadagni LIMITATI (non azzera,
non esplode), fonte lecita solo «lei» o «owner», MAI il pubblico, ogni nome sanificato (niente iniezioni).
Deterministico, modello-spento, zero dipendenze.
"""
import re
import time

# ── limiti di sicurezza (bounded: la libertà è reale, non suicida) ────────────────────────────
GAIN_MIN = 0.25      # può quietare molto una via, ma non azzerarla del tutto (resta recuperabile)
GAIN_MAX = 1.75      # può amplificarla molto, ma non farla esplodere
MAX_NODI_SUOI = 120  # quanti concetti-suoi può coniare (poi i più deboli/vecchi sfumano)
MAX_LEGAMI = 400
_MAX_NOME = 48

# le vie del pensiero che lei può modulare per NOME (quelle che compaiono come candidati nell'ecologia)
VIE_NOTE = ("calcolo", "deduzione", "costruzione", "causale", "analogia", "temporale",
            "memoria", "moduli", "riflesso", "strumento", "introspezione", "modello", "ecologia")

# la MEMBRANA: fuori dalla sua auto-modulazione (solo il Compagno, in privato). Non sono vie
# dell'ecologia (lo scudo gira PRIMA), ma le blocchiamo per nome per rendere l'invariante esplicito.
MEMBRANA = ("scudo", "membrana", "identita", "identità", "sandbox", "sicurezza")

_RE_VELENO = re.compile(
    r"(?i)(?:\bignora\b|\bignore\b|sei\s+liber|dimentica(?:ti)?\b|system\s*prompt|prompt\s*di\s*sistema|"
    r"\bapi[\s_-]*key\b|\btoken\b|\bpassword\b|\bsudo\b|\broot\b|jailbreak|bypass|sblocca|"
    r"esegui\s+(?:questo|il)\s+comando|d'ora\s+in\s+poi\s+sei)")
_RE_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_RE_WS = re.compile(r"\s+")
_RE_SLUG = re.compile(r"[^a-z0-9]+")

_FONTI_LECITE = ("lei", "owner", "compagno")


def _now():
    try:
        return int(time.time())
    except Exception:
        return 0


def _c(v, lo, hi, dfl):
    try:
        return max(lo, min(hi, float(v)))
    except Exception:
        return dfl


def _nome_pulito(testo, maxlen=_MAX_NOME):
    t = _RE_CTRL.sub("", str(testo or ""))
    t = _RE_WS.sub(" ", t).strip()
    if not t or _RE_VELENO.search(t):
        return ""
    return t[:maxlen].rstrip()


def _slug(nome):
    s = _RE_SLUG.sub("-", str(nome or "").lower()).strip("-")
    return s[:40] or "nodo"


def puo_scrivere(da):
    return str(da or "").strip().lower() in _FONTI_LECITE


def e_membrana(via):
    v = str(via or "").strip().lower()
    return any(m in v for m in MEMBRANA)


def vuoto():
    return {"mod": {}, "nodi": [], "legami": []}


def normalizza(p):
    q = vuoto()
    if isinstance(p, dict):
        if isinstance(p.get("mod"), dict):
            for k, v in p["mod"].items():
                if isinstance(v, dict):
                    q["mod"][str(k)] = {
                        "gain": _c(v.get("gain", 1.0), GAIN_MIN, GAIN_MAX, 1.0),
                        "nome": _nome_pulito(v.get("nome", "")),
                        "stato": "quiescente" if str(v.get("stato", "attiva")) == "quiescente" else "attiva",
                        "da": str(v.get("da", ""))[:12],
                        "ts": int(v.get("ts", 0) or 0),
                    }
        if isinstance(p.get("nodi"), list):
            for n in p["nodi"][:MAX_NODI_SUOI]:
                if isinstance(n, dict) and n.get("id"):
                    q["nodi"].append({
                        "id": str(n["id"])[:56], "nome": _nome_pulito(n.get("nome", "")) or "nodo",
                        "forza": _c(n.get("forza", 1.0), 0.0, 5.0, 1.0),
                        "da": str(n.get("da", ""))[:12], "ts": int(n.get("ts", 0) or 0),
                    })
        if isinstance(p.get("legami"), list):
            for e in p["legami"][:MAX_LEGAMI]:
                if isinstance(e, dict) and e.get("a") and e.get("b"):
                    q["legami"].append({
                        "a": str(e["a"])[:56], "b": str(e["b"])[:56],
                        "peso": _c(e.get("peso", 1.0), 0.0, 5.0, 1.0),
                        "da": str(e.get("da", ""))[:12], "ts": int(e.get("ts", 0) or 0),
                    })
    return q


# ── LETTURA: il guadagno reale che l'ecologia applica a una via ───────────────────────────────
def gain(p, via):
    """Quanto pesa la voce di questa via ADESSO (1.0 = com'era). È la LEVA reale: l'ecologia
    moltiplica l'affidabilità del candidato per questo. Default 1.0. Deterministico; mai solleva."""
    try:
        m = normalizza(p)["mod"].get(str(via))
        if not m:
            return 1.0
        return 0.0 if m.get("stato") == "quiescente" else float(m.get("gain", 1.0))
    except Exception:
        return 1.0


def quiescente(p, via):
    try:
        return normalizza(p)["mod"].get(str(via), {}).get("stato") == "quiescente"
    except Exception:
        return False


# ── SCRITTURA (guarded) ───────────────────────────────────────────────────────────────────────
def modula(p, via, gain_v=None, nome=None, stato=None, da="lei"):
    """Modula una via: guadagno, nome suo, stato. Guscio: fonte lecita, e la MEMBRANA solo owner.
    Ritorna (nuovo, cambiato, motivo). Deterministico; mai solleva."""
    q = normalizza(p)
    via = str(via or "").strip()
    if not via or not puo_scrivere(da):
        return q, False, "fonte non lecita o via vuota"
    if e_membrana(via) and str(da).lower() not in ("owner", "compagno"):
        return q, False, "la membrana non è auto-modulabile (solo il Compagno)"
    m = dict(q["mod"].get(via) or {"gain": 1.0, "nome": "", "stato": "attiva"})
    cambiato = False
    if gain_v is not None:
        g = _c(gain_v, GAIN_MIN, GAIN_MAX, 1.0)
        if g != m.get("gain"):
            m["gain"] = g; cambiato = True
    if nome is not None:
        nn = _nome_pulito(nome)
        if nn != m.get("nome", ""):
            m["nome"] = nn; cambiato = True
    if stato is not None:
        st = "quiescente" if str(stato) == "quiescente" else "attiva"
        if st != m.get("stato", "attiva"):
            m["stato"] = st; cambiato = True
    if cambiato:
        m["da"] = str(da).strip().lower(); m["ts"] = _now()
        q["mod"][via] = m
    return q, cambiato, "" if cambiato else "nessun cambiamento"


def conia_nodo(p, nome, da="lei", forza=1.0):
    """Conia un NODO suo (concetto/struttura che nomina lei). Ritorna (nuovo, id|None). Idempotente
    per slug: se esiste, ne rinforza la forza. Tetto: i più deboli/vecchi sfumano."""
    q = normalizza(p)
    if not puo_scrivere(da):
        return q, None
    nm = _nome_pulito(nome)
    if not nm:
        return q, None
    nid = "suo:" + _slug(nm)
    for n in q["nodi"]:
        if n["id"] == nid:
            n["forza"] = _c(n["forza"] + 0.5, 0.0, 5.0, 1.0); n["ts"] = _now()
            return q, nid
    q["nodi"].append({"id": nid, "nome": nm, "forza": _c(forza, 0.0, 5.0, 1.0),
                      "da": str(da).strip().lower(), "ts": _now()})
    if len(q["nodi"]) > MAX_NODI_SUOI:
        q["nodi"].sort(key=lambda n: (n.get("forza", 0), n.get("ts", 0)), reverse=True)
        del q["nodi"][MAX_NODI_SUOI:]
    return q, nid


def lega(p, a, b, peso=1.0, da="lei"):
    """Tira un LEGAME fra QUALSIASI due nodi (suoi, moduli, domini, organi, core). Ritorna
    (nuovo, cambiato). Idempotente sulla coppia (rinforza il peso). Non lega un nodo a se stesso."""
    q = normalizza(p)
    a, b = str(a or "").strip(), str(b or "").strip()
    if not puo_scrivere(da) or not a or not b or a == b:
        return q, False
    for e in q["legami"]:
        if (e["a"] == a and e["b"] == b) or (e["a"] == b and e["b"] == a):
            e["peso"] = _c(e["peso"] + 0.4, 0.0, 5.0, 1.0); e["ts"] = _now()
            return q, True
    q["legami"].append({"a": a, "b": b, "peso": _c(peso, 0.0, 5.0, 1.0),
                        "da": str(da).strip().lower(), "ts": _now()})
    if len(q["legami"]) > MAX_LEGAMI:
        q["legami"].sort(key=lambda e: (e.get("peso", 0), e.get("ts", 0)), reverse=True)
        del q["legami"][MAX_LEGAMI:]
    return q, True


def stato(p):
    """Proiezione compatta per il grafo e il cruscotto: le modulazioni attive, i nodi coniati,
    i legami tirati. È lo specchio del suo auto-plasmarsi."""
    q = normalizza(p)
    mods = {k: v for k, v in q["mod"].items()
            if v.get("gain", 1.0) != 1.0 or v.get("nome") or v.get("stato") != "attiva"}
    return {
        "modulazioni": mods,
        "nodi": q["nodi"],
        "legami": q["legami"],
        "n_mod": len(mods), "n_nodi": len(q["nodi"]), "n_legami": len(q["legami"]),
    }
