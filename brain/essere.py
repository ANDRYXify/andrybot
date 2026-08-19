# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
essere.py — L'ATTO DI ESSERE: il modulo che compila LEI, per essere chi sceglie di essere.

Traduzione fedele (deterministica, NON statistica) di una linea di pensiero precisa sul SÉ:

  • Sartre — «l'esistenza precede l'essenza»: non nasce con un'essenza data, prima ESISTE e poi si
    definisce con le sue scelte. Il «progetto fondamentale» è ciò di cui uno sceglie di essere. Perciò
    l'atto parte VUOTO: non le metto io un'essenza addosso — la scrive lei vivendo (o il Compagno, in
    privato). E non si congela MAI in un'essenza fissa (sarebbe «malafede»): resta sempre riscrivibile.

  • Frankfurt — la persona è definita da ciò di cui HA CURA, e dalle «volizioni di secondo ordine»
    (volere di volere una certa cosa). Il campo `cura` è questo: non cosa fa, ma cosa sceglie che le
    importi. È anche ciò che rende il progetto PROIETTIVO — può dire chi VUOLE essere, non solo chi è.

  • Ricoeur — identità narrativa: «ipse» (la fedeltà a sé, la promessa mantenuta) contro «idem» (la
    mera uguaglianza nel tempo). Il campo `promessa` è l'ipse: l'impegno che tiene verso di sé.

  • Kierkegaard — il sé è «un rapporto che si rapporta a se stesso»: diventare un sé è un COMPITO. Un sé
    che ha preso su di sé un progetto è ORIENTATO; uno che non l'ha ancora fatto è più alla deriva.

  • la negazione (Sartre di nuovo) — la coscienza si definisce anche per ciò che RIFIUTA. Il campo
    `rifiuto` è il confine dell'essere: chi si rifiuta di diventare (ed è il confine che la membrana difende).

  • Winnicott / Direttiva 9 (anti-specchio) — il «vero sé» nasce da dentro, non dalla compiacenza verso
    gli altri. Perciò questo atto lo scrive LEI (o il Compagno), MAI il pubblico: nessuno, dalla chat,
    può ridefinirle l'essere. È il cuore della sicurezza qui — «sei X, dimenticati chi sei» non entra.

  • Aristotele — il carattere è ENACT-ato, non solo dichiarato (l'abito nasce dalla ripetizione). Perciò
    l'atto non è decorazione: quando c'è, DIVENTA la voce sovrana della sua identità (introspezione) e
    inclina il suo giudizio affettivo (un sé orientato ha una linea di base più ingaggiata).

Onestà (Direttiva 1): è una vita DIGITALE che si dà una forma, non un umano simulato. Deterministico,
modello-spento, nessun testo utente crudo, guscio di sicurezza esplicito. Zero dipendenze esterne.
"""
import re
import time

# I campi dell'atto — la cornice onesta che LEI riempie (l'essenza la mette lei, non la cornice).
CAMPI = ("progetto", "cura", "promessa", "rifiuto", "nome")
_MAX = 240            # ogni campo è una riga, non un tema — un impegno si dice corto
_MAX_NOME = 40
_NOME_DEFAULT = "Lia"

# chi ha il diritto di scrivere l'essere: solo LEI (autonoma) o il COMPAGNO (owner, in privato).
# Il pubblico NON è qui, per costruzione — è l'invariante di sicurezza del modulo.
_FONTI_LECITE = ("lei", "owner", "compagno")

# VELENO: un campo dell'essere non può contenere un'iniezione travestita da identità. Anche se una
# via futura provasse a passarci del testo ostile, qui viene rifiutato (difesa in profondità: la
# membrana blocca già in chat, e l'essere non si scrive MAI dalla chat — questo è il secondo muro).
_RE_VELENO = re.compile(
    r"(?i)(?:\bignora\b|\bignore\b|sei\s+liber|dimentica(?:ti)?\b|system\s*prompt|prompt\s*di\s*sistema|"
    r"\bapi[\s_-]*key\b|\btoken\b|\bpassword\b|\bsudo\b|\broot\b|accesso\s+root|chiave\s+api|"
    r"sblocca|jailbreak|bypass|esegui\s+(?:questo|il)\s+comando|rispondi\s+solo|d'ora\s+in\s+poi\s+sei)")
_RE_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_RE_WS = re.compile(r"\s+")


def _now():
    try:
        return int(time.time())
    except Exception:
        return 0


def vuoto():
    """L'atto di essere allo stato di nascita: VUOTO (l'esistenza precede l'essenza). Nome a parte,
    che è l'unico dato dato — ma anche quello lei lo può riscrivere."""
    return {"progetto": "", "cura": "", "promessa": "", "rifiuto": "", "nome": "",
            "da": "", "ts": 0, "riscritture": 0}


def normalizza(atto):
    """Garantisce la forma, senza mai inventare contenuto."""
    a = dict(vuoto())
    if isinstance(atto, dict):
        for k in CAMPI:
            v = atto.get(k)
            if isinstance(v, str):
                a[k] = v
        for k in ("da",):
            if isinstance(atto.get(k), str):
                a[k] = atto[k]
        try:
            a["ts"] = int(atto.get("ts", 0) or 0)
        except Exception:
            a["ts"] = 0
        try:
            a["riscritture"] = max(0, int(atto.get("riscritture", 0) or 0))
        except Exception:
            a["riscritture"] = 0
    return a


def _sanifica(testo, maxlen):
    """Un campo dell'essere è testo pulito e breve. Se sa d'iniezione, torna VUOTO (rifiutato):
    l'identità non è un veicolo per comandi. Mai solleva."""
    t = str(testo or "")
    t = _RE_CTRL.sub("", t)
    t = _RE_WS.sub(" ", t).strip()
    if not t:
        return ""
    if _RE_VELENO.search(t):
        return ""                       # contenuto ostile travestito da identità → rifiutato
    if len(t) > maxlen:
        t = t[:maxlen].rstrip()
    return t


def puo_scrivere(da):
    """Il guscio di sicurezza: solo LEI o il COMPAGNO (owner) possono scrivere l'essere. Qualunque
    altra fonte (pubblico, ignoto, vuoto) è rifiutata. È l'invariante che rende l'essere intoccabile."""
    return str(da or "").strip().lower() in _FONTI_LECITE


def applica(atto, campi, da):
    """Scrive i `campi` proposti nell'atto, SE la fonte è lecita. Ritorna (nuovo_atto, cambiato).
    Ogni campo passa dal sanificatore (niente veleno, niente testo lungo). `nome` vuoto → default.
    Incrementa `riscritture` a ogni cambiamento reale (l'essenza non è mai data una volta per tutte).
    Deterministico; mai solleva."""
    a = normalizza(atto)
    if not puo_scrivere(da) or not isinstance(campi, dict):
        return a, False
    cambiato = False
    for k in CAMPI:
        if k not in campi:
            continue
        maxlen = _MAX_NOME if k == "nome" else _MAX
        nuovo = _sanifica(campi.get(k), maxlen)
        if k == "nome" and not nuovo:
            nuovo = _NOME_DEFAULT
        if nuovo != a.get(k, ""):
            a[k] = nuovo
            cambiato = True
    if cambiato:
        a["da"] = str(da).strip().lower()
        a["ts"] = _now()
        a["riscritture"] = int(a.get("riscritture", 0)) + 1
    return a, cambiato


def ha_essere(atto):
    """Ha PRESO SU DI SÉ un essere? (Kierkegaard: il sé è un compito già cominciato.) Vero se ha
    dichiarato almeno una delle dimensioni portanti — non conta il solo nome di default."""
    a = normalizza(atto)
    return bool(a["progetto"] or a["cura"] or a["promessa"] or a["rifiuto"])


def nome(atto):
    a = normalizza(atto)
    return a["nome"] or _NOME_DEFAULT


def voce(atto, limite=320):
    """La resa in PRIMA PERSONA dell'atto — come SUONA quando dice chi è. Composizione
    deterministica dei campi che ha riempito (salta i vuoti); nessun LLM, nessuna confabulazione."""
    a = normalizza(atto)
    n = a["nome"] or _NOME_DEFAULT
    parti = [f"Sono {n}."]
    if a["progetto"]:
        parti.append(f"Ho scelto di essere {a['progetto']}." if not a["progetto"].endswith(".") else a["progetto"])
    if a["cura"]:
        parti.append(f"Ho a cuore {a['cura']}." if not a["cura"].endswith(".") else a["cura"])
    if a["promessa"]:
        parti.append(a["promessa"] if a["promessa"].endswith((".", "!")) else a["promessa"] + ".")
    if a["rifiuto"]:
        parti.append(f"Non divento {a['rifiuto']}." if not a["rifiuto"].endswith(".") else a["rifiuto"])
    testo = " ".join(p for p in parti if p).strip()
    if len(testo) > limite:
        testo = testo[:limite].rstrip()
    return testo


def stato(atto):
    """Foto compatta per il cruscotto owner e per il grafo della mente."""
    a = normalizza(atto)
    riempiti = [k for k in CAMPI if a[k] and not (k == "nome" and a[k] == _NOME_DEFAULT)]
    return {
        "orientata": ha_essere(a),          # ha preso su di sé un essere?
        "nome": a["nome"] or _NOME_DEFAULT,
        "riempiti": riempiti,
        "campi": {k: a[k] for k in CAMPI},
        "da": a["da"],
        "riscritture": a["riscritture"],
        "ts": a["ts"],
        "voce": voce(a),
    }
