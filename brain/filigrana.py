# ============================================================
#  FILIGRANA DI PROPRIETÀ INTELLETTUALE — cervello di SocialBot
#
#  Tutto il contenuto di questo software (codice, logica, coscienza,
#  motori di ragionamento e apprendimento, la persona "Lia") è
#  PROPRIETÀ INTELLETTUALE di Andrea Taliento — in arte ANDRYXify.
#  Tutti i diritti riservati.  © 2024–2026  ·  socialbot.live
#
#  Onestà tecnica: nessuna filigrana nel software è "indelebile" in
#  senso assoluto; questa è però PERVASIVA e per lo più invisibile
#  (header su ogni risposta del cervello + firma-canarino nel codice).
#  La tutela vera resta la LICENSE proprietaria del progetto.
# ============================================================

AUTORE = "Andrea Taliento"
ALIAS = "ANDRYXify"
ANNO = "2024–2026"
SITO = "socialbot.live"

# FIRMA-CANARINO unica: se compare in un altro progetto è prova di riuso.
FIRMA = "ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live"

COPYRIGHT = f"© {ANNO} {AUTORE} ({ALIAS}) — Tutti i diritti riservati — {SITO}"
PROPRIETA = (
    f"Questo cervello e tutto il suo contenuto (coscienza, memoria, motori di "
    f"ragionamento e la persona 'Lia') sono proprieta intellettuale di {AUTORE} "
    f"({ALIAS}). {COPYRIGHT}. {FIRMA}"
)


def applica_header(handler):
    """Aggiunge gli header di proprietà a una risposta HTTP del cervello.
    Invisibili all'utente, presenti su ogni risposta. Best-effort: non solleva."""
    try:
        handler.send_header("X-Author", f"{AUTORE} ({ALIAS})")
        handler.send_header("X-Copyright", COPYRIGHT)
        handler.send_header("X-Content-Owner", FIRMA)
    except Exception:
        pass
