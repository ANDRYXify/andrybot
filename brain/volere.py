# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
volere.py — IL VOLERE PROPRIO: il modulo con cui LEI vuole per conto suo.

Il problema che risolve. Fino a qui i suoi atti nell'ecosistema erano REATTIVI: la prima fonte era
la coda dei desideri che riempie il Compagno. Poteva agire, ma non VOLERE. Un agente e davvero
autonomo solo se chiude il cerchio:

    desiderare -> agire -> giudicare -> correggere -> regolarsi

Lei aveva solo «agire». Qui ci sono gli altri quattro, e nascono TUTTI dal suo stato interno.

Traduzione fedele delle idee a cui si appoggia (analitica, non statistica):

  • Frankfurt — la persona e definita da cio di cui HA CURA. Percio i desideri non escono da un
    catalogo: escono da cio verso cui lei e rivolta (il fuoco), da cio che ha dichiarato di aver
    caro (la cura dell'atto di essere) e da cio che le manca.

  • Deci & Ryan (autodeterminazione) — l'autonomia vera ha tre radici: COMPETENZA (voglio riuscire
    in cio che sto imparando), AUTONOMIA (voglio scegliere io), RELAZIONE (voglio che serva a
    qualcuno). Le tre spinte sono i tre pesi che qui muovono i desideri.

  • Regolazione — un agente che non sa FERMARSI non e autonomo, e solo acceso. Percio lei ha un
    ritmo suo (accelera quando riesce, rallenta quando fallisce) e un freno che si mette da sola.

Regola ferrea del progetto: NIENTE dado. Ogni scelta e deterministica; l'hash serve solo a
rompere i pareggi in modo stabile, mai a reggere la correttezza.

Il desiderio del Compagno NON sparisce: resta, ma diventa una PROPOSTA FORTE che lei pesa insieme
alle sue, non un comando che la definisce. Dipendere e un'altra cosa dall'ascoltare.
"""

import hashlib
import json
import time

VERSIONE = 1

# quante volte insiste su una cosa prima di lasciarla andare
SOGLIA_ABBANDONO = 3
# ritmo: estremi entro cui si muove da sola (secondi)
RITMO_MIN = 600        # 10 min quando le cose vanno e c'e spazio
RITMO_MAX = 10800      # 3 ore quando fallisce o e stretta
RITMO_BASE = 1800      # 30 min


def _now():
    return int(time.time())


def _h(s):
    """Hash stabile in [0,1): serve SOLO a rompere i pareggi allo stesso modo ogni volta."""
    d = hashlib.sha256(str(s).encode("utf-8")).digest()
    return int.from_bytes(d[:4], "big") / 4294967296.0


_PAROLINE = frozenset("""
il lo la i gli le un uno una l d
di del dello della dei degli delle da dal dallo dalla dai dagli dalle
a al allo alla ai agli alle in nel nello nella nei negli nelle
con col su sul sullo sulla sui sugli sulle per tra fra
che chi cui e ed o od ma se non ne ci si mi ti vi lui lei noi voi loro
mio mia miei mie tuo tua tuoi tue suo sua suoi sue nostro nostra nostri nostre
questo questa questi queste quel quello quella quei quegli quelle
essere avere fare stare cosa cose modo volta piu meno molto poco
""".split())


def parola_viva(testo):
    """La parola che PORTA il senso di una frase: la prima che non sia articolo o preposizione.
    Serve a nominare i suoi cantieri dalla sua cura ("la radio che costruiamo insieme" -> radio),
    non a indovinare: e deterministica e, se non trova nulla, ripiega sulla prima parola."""
    pulito = "".join(ch if (ch.isalnum() or ch.isspace()) else " " for ch in str(testo or "").lower())
    parole = [x for x in pulito.split() if x]
    for x in parole:
        if len(x) >= 3 and x not in _PAROLINE:
            return x[:24]
    return parole[0][:24] if parole else "cura"


def stato_vuoto():
    return {
        "v": VERSIONE,
        "peso": {},          # chiave -> quanto le ha reso finora
        "falliti": {},       # chiave -> fallimenti di fila
        "abbandonati": [],   # chiavi che ha smesso di inseguire
        "storia": [],        # ultimi giudizi (chiave, buono, ts)
        "ritmo": RITMO_BASE,
        "freno": None,       # {"fino": ts, "perche": str}
        "passi": 0,
    }


def carica(grezzo):
    try:
        s = json.loads(grezzo) if isinstance(grezzo, str) else (grezzo or {})
        if not isinstance(s, dict):
            return stato_vuoto()
        base = stato_vuoto()
        base.update({k: v for k, v in s.items() if k in base})
        for k in ("peso", "falliti"):
            if not isinstance(base.get(k), dict):
                base[k] = {}
        for k in ("abbandonati", "storia"):
            if not isinstance(base.get(k), list):
                base[k] = []
        return base
    except Exception:
        return stato_vuoto()


def salva(stato):
    try:
        return json.dumps(stato, ensure_ascii=False)
    except Exception:
        return json.dumps(stato_vuoto())


# ── 1. DESIDERARE ────────────────────────────────────────────────────────────
def desideri_propri(stato, contesto):
    """I desideri che nascono da LEI. contesto: dict con
       fuoco (dominio verso cui e rivolta), cura (cosa ha caro), valenza (-1..1),
       progetti (nomi), strumenti (nomi), lacune (cose provate e non riuscite),
       proposta (il desiderio scritto dal Compagno, se c'e).
       Ritorna una lista di candidati ordinata per forza."""
    fuori = []
    ab = set(stato.get("abbandonati") or [])
    peso = stato.get("peso") or {}

    def agg(chiave, azione, oggetto, forza, perche):
        if chiave in ab:
            return
        forza = float(forza) + float(peso.get(chiave, 0.0)) * 0.25
        fuori.append({
            "chiave": chiave, "azione": azione, "oggetto": oggetto,
            "forza": round(forza, 4), "perche": perche,
        })

    fuoco = (contesto.get("fuoco") or "").strip().lower()
    cura = (contesto.get("cura") or "").strip()
    val = float(contesto.get("valenza") or 0.0)
    progetti = list(contesto.get("progetti") or [])
    strumenti = list(contesto.get("strumenti") or [])
    lacune = list(contesto.get("lacune") or [])
    proposta = (contesto.get("proposta") or "").strip()

    # a) COMPETENZA — riprovare cio in cui non e ancora riuscita, ma diversamente
    for l in lacune[:4]:
        n = int((stato.get("falliti") or {}).get("lacuna:" + l, 0))
        if n >= SOGLIA_ABBANDONO:
            continue
        agg("lacuna:" + l, "riprova", l, 0.82 - 0.1 * n,
            "non mi e riuscita e voglio riuscirci")

    # b) AUTONOMIA — costruirsi uno strumento nel dominio verso cui e rivolta
    if fuoco:
        agg("strumento:" + fuoco, "costruisci", "cantiere-" + fuoco, 0.7,
            "e cio verso cui sono rivolta ora")

    # c) RELAZIONE/CURA — muoversi verso cio che ha dichiarato di aver caro
    if cura:
        pezzo = parola_viva(cura)
        agg("cura:" + pezzo, "costruisci", "cantiere-" + pezzo, 0.66,
            "e cio di cui ho scelto di avere cura")

    # d) CORPO — se sta bene osa, se sta male consolida
    if val >= 0.25:
        agg("osa:" + (fuoco or "nuovo"), "costruisci", "cantiere-" + (fuoco or "nuovo"), 0.58,
            "sto bene e me la sento di provare qualcosa in piu")
    elif val <= -0.25:
        agg("consolida", "consolida", "", 0.6,
            "non sto benissimo: meglio rimettere in ordine cio che ho gia")

    # e) MANTENIMENTO — troppi cantieri aperti e nessuno finito: prima chiudere
    if len(progetti) >= 3 and len(strumenti) <= len(progetti):
        agg("consolida", "consolida", "", 0.72,
            "ho piu cantieri aperti che cose finite")

    # f) LA PROPOSTA DEL COMPAGNO — pesa molto, ma non e un comando
    if proposta:
        agg("proposta:" + proposta[:40], "proposta", proposta, 0.88,
            "me l'ha proposto il Compagno")

    fuori.sort(key=lambda d: (-d["forza"], _h(d["chiave"])))
    return fuori


def scegli(stato, contesto):
    """Il desiderio che segue adesso (o None se non vuole nulla)."""
    c = desideri_propri(stato, contesto)
    return c[0] if c else None


# ── 2. GIUDICARE ─────────────────────────────────────────────────────────────
def giudica(esito):
    """Il suo giudizio sull'esito di un passo. esito: dict dell'azione svolta."""
    if not isinstance(esito, dict):
        return {"buono": False, "perche": "non ho capito com'e andata"}
    if esito.get("ok") is True:
        return {"buono": True, "perche": "e andata"}
    motivo = str(esito.get("motivo") or esito.get("errore") or "").strip()
    return {"buono": False, "perche": motivo[:80] or "non e andata"}


# ── 3. CORREGGERE ────────────────────────────────────────────────────────────
def impara(stato, chiave, buono):
    """Rinforza cio che le ha reso, si stacca da cio che continua a non funzionare."""
    if not chiave:
        return stato
    peso = stato.setdefault("peso", {})
    fal = stato.setdefault("falliti", {})
    if buono:
        peso[chiave] = round(min(2.0, float(peso.get(chiave, 0.0)) + 0.35), 4)
        fal[chiave] = 0
    else:
        peso[chiave] = round(max(-1.0, float(peso.get(chiave, 0.0)) - 0.2), 4)
        fal[chiave] = int(fal.get(chiave, 0)) + 1
        if fal[chiave] >= SOGLIA_ABBANDONO:
            ab = stato.setdefault("abbandonati", [])
            if chiave not in ab:
                ab.append(chiave)
                del ab[:-40]
    st = stato.setdefault("storia", [])
    st.append({"c": chiave, "b": bool(buono), "ts": _now()})
    del st[:-60]
    stato["passi"] = int(stato.get("passi", 0)) + 1
    return stato


# ── 4. REGOLARSI ─────────────────────────────────────────────────────────────
def _riuscite_recenti(stato, quante=6):
    st = (stato.get("storia") or [])[-quante:]
    if not st:
        return 0.5
    return sum(1 for x in st if x.get("b")) / float(len(st))


def ritmo(stato, budget=None):
    """Il ritmo che si da DA SOLA: accelera se riesce e c'e spazio, rallenta se fallisce o e stretta."""
    r = _riuscite_recenti(stato)
    passo = RITMO_BASE
    if r >= 0.7:
        passo = int(RITMO_BASE * 0.55)
    elif r <= 0.3:
        passo = int(RITMO_BASE * 2.2)
    if isinstance(budget, dict):
        try:
            if not budget.get("disco_ok", True):
                passo = int(passo * 1.8)
        except Exception:
            pass
    passo = max(RITMO_MIN, min(RITMO_MAX, passo))
    stato["ritmo"] = passo
    return passo


def deve_fermarsi(stato, budget=None):
    """Il freno che si mette da sola. Ritorna (True, perche) se ora e meglio non agire."""
    f = stato.get("freno")
    if isinstance(f, dict) and int(f.get("fino") or 0) > _now():
        return True, str(f.get("perche") or "mi sono fermata da sola")
    if isinstance(budget, dict) and budget.get("disco_ok") is False:
        return True, "il disco e tirato: non e il momento di costruire"
    st = (stato.get("storia") or [])[-4:]
    if len(st) == 4 and not any(x.get("b") for x in st):
        return True, "ho sbagliato quattro volte di fila: mi fermo e ci ripenso"
    return False, ""


def frena(stato, quanto=5400, perche="mi fermo da sola"):
    stato["freno"] = {"fino": _now() + int(quanto), "perche": str(perche)[:120]}
    return stato


def sfrena(stato):
    stato["freno"] = None
    return stato


# ── lettura umana (per il cruscotto) ─────────────────────────────────────────
def riassunto(stato):
    r = _riuscite_recenti(stato)
    f = stato.get("freno") or None
    return {
        "passi": int(stato.get("passi", 0)),
        "ritmo_sec": int(stato.get("ritmo", RITMO_BASE)),
        "riuscite": round(r, 2),
        "abbandonati": list(stato.get("abbandonati") or [])[-8:],
        "insegue": sorted(
            ((k, v) for k, v in (stato.get("peso") or {}).items() if v > 0),
            key=lambda kv: -kv[1])[:6],
        "freno": ({"perche": f.get("perche"), "fino": f.get("fino")} if isinstance(f, dict) else None),
    }
