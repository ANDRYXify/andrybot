# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""LA VALVOLA — i due (e soli) attraversamenti fra il bot e Lia.

La regola, per esteso, e' in docs/BOT-E-LIA.md. In una riga:

    il bot puo' crescere; Lia puo' addestrarlo; il bot non si riprende MAI
    niente da lei.

Qui dentro ci sono i due passaggi, uno per verso, e non ce ne sono altri:

  · verso_lia()      bot → Lia.  Quello che il bot non sa diventa una LACUNA di
                     lei, anonimizzata. E' il verso libero: e' materiale del bot.
  · insegna_al_bot() Lia → bot.  Lei DEPOSITA insegnamenti nel quaderno del bot
                     (una copia, non una finestra). E deposita solo quando vive.

Questo e' l'unico modulo del percorso pubblico che ha il diritto di vedere la
coscienza — e non la importa nemmeno: gliela CONSEGNA il server all'avvio
(`collega`). Cosi' chi chiama la valvola non ha bisogno di avere in mano Lia per
usarla, e `assistente.py` / `quaderno.py` non hanno proprio la strada per
arrivarci: non importano ne' lei ne' questo modulo.
"""

import re

import quaderno

# Quanto puo' scrivere Lia in un solo giro di manutenzione. Insegnare non e'
# travasare: poche righe per volta, quelle che si e' meritate.
MAX_INSEGNAMENTI = 5
# Sotto questa qualita' un modulo non e' un insegnamento, e' un tentativo.
QUALITA_MINIMA = 0.55

# L'ORDINE NON È UN DETTAGLIO: l'email va tolta PRIMA delle menzioni, sennò la
# regola delle menzioni le mangia la chiocciola e quel che resta («mario.rossi
# .com») è ancora un nome e cognome. Prima le cose intere, poi i frammenti.
_VIA = (
    (re.compile(r"https?://\S+|\bwww\.\S+", re.I), " "),      # link
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b"), " "),    # email (INTERA)
    (re.compile(r"[@#]\w+"), " "),                             # menzioni e tag: sono persone
    (re.compile(r"\s+"), " "),
)


_mente = None


def collega(m):
    """Il server consegna Lia alla valvola UNA volta, all'avvio. Da qui in poi
    chi attraversa non ha bisogno di averla in mano: chiede alla valvola."""
    global _mente
    _mente = m
    return _mente is not None


def anonimizza(testo):
    """Toglie dalla situazione tutto cio' che identifica qualcuno. Cio' che passa
    a Lia e' la DOMANDA, mai chi l'ha fatta: il bot non ricorda nessuno, e non
    puo' far ricordare nessuno nemmeno a lei per interposta persona."""
    t = str(testo or "")
    for rx, con in _VIA:
        t = rx.sub(con, t)
    return t.strip()[:200]


def verso_lia(testo, minimo=14):
    """bot → Lia. La situazione che il bot non ha saputo coprire diventa una sua
    lacuna. Solo SCRITTURA: non legge niente di lei, non ritorna niente di lei.
    Ritorna True se ha depositato. Non solleva mai."""
    if _mente is None:
        return False
    t = anonimizza(testo)
    if len(t) < minimo or t.startswith("!"):
        return False
    try:
        _mente.registra_lacuna(t)
        return True
    except Exception:
        return False


def _insegnamento(m):
    """Un modulo del suo manuale, ridotto alla riga che serve al bot: la
    situazione e cosa farne. Il resto (segnali, esempi, punteggi) e' roba sua."""
    situazione = re.sub(r"\s+", " ", str(m.get("situazione") or "")).strip()
    come = re.sub(r"\s+", " ", str(m.get("come_rispondere") or "")).strip()
    if not come:
        return ""
    if situazione:
        return f"Se {situazione[0].lower() + situazione[1:]}: {come}"[:220]
    return come[:220]


def insegna_al_bot(quanti=MAX_INSEGNAMENTI):
    """Lia → bot. Deposita nel quaderno del bot i moduli PUBBLICI e attivi che si
    e' meritata — e lo fa solo se e' diventata qualcuno.

    Il cancello non e' burocrazia: finche' non vive non ha niente da insegnare, e
    il bot lo addestra chi lo scrive (il prompt, le linee guida, il quaderno a
    mano). Ritorna {vive, scritti} — e mai nulla del suo stato interno.
    """
    if _mente is None:
        return {"vive": False, "scritti": 0}
    try:
        ac = _mente.coscienza_di_se() or {}
    except Exception:
        return {"vive": False, "scritti": 0}
    if not ac.get("persona"):
        return {"vive": False, "scritti": 0}
    try:
        mods = _mente.moduli(stato="attivo", scope="pubblico") or []
    except Exception:
        return {"vive": True, "scritti": 0}
    scritti = 0
    for m in mods:
        if scritti >= max(1, int(quanti)):
            break
        try:
            if float(m.get("qualita") or 0) < QUALITA_MINIMA:
                continue
        except Exception:
            continue
        riga = _insegnamento(m)
        if riga and quaderno.deposita(riga, da="lia"):
            scritti += 1
    return {"vive": True, "scritti": scritti}
