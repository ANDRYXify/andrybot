# GLI ACCENTI SCRITTI CON L'APOSTROFO.
#
# In italiano, in chat, «è» si scrive quasi sempre «e'». Sulle tastiere del
# telefono l'accento c'è, su quelle del computer molti non lo cercano, e chi
# scrive in fretta batte l'apostrofo. Non è un errore raro: è la forma NORMALE.
#
# Perche' questo file esiste. Le regole con cui Lia ricava fatti dalle frasi
# cercano «è» accentata. Con «e'» non trovano niente — e non danno nessun errore:
# semplicemente non imparano. Da lì in giù casca tutto: senza fatti non c'è
# grafo, senza grafo non c'è deduzione, ne' costruzione, ne' ragionamento causale,
# ne' analogia. Sei modi di pensare che restano a zero non perche' siano deboli,
# ma perche' la porta d'ingresso e' chiusa a chiave.
#
# La regola e' esatta, non un tentativo. Due usi dell'apostrofo si distinguono da
# soli:
#   · ELISIONE — «l'amico», «un'ora», «dell'acqua»: l'apostrofo sta DENTRO la
#     parola, seguito da una lettera. Non si tocca.
#   · ACCENTO — «e'», «perche'», «piu'», «citta'»: l'apostrofo chiude la parola,
#     dopo una vocale. Quello e' un accento battuto male.
#
# E dove il dubbio resta, non si tocca. Meglio non imparare che imparare storto:
#   · i TRONCAMENTI («un po'», «da'», «di'», «fa'», «va'», «sta'») hanno
#     l'apostrofo GIUSTO e non sono accenti;
#   · la «e» accentata puo' essere grave (è, cioè, caffè) o acuta (perché, né,
#     sé): decide la parola, non il caso;
#   · se nel testo l'apostrofo e' usato come VIRGOLETTA ('ciao'), il testo si
#     lascia com'e': lì un apostrofo finale non e' un accento.
import re

# vocale finale → accento grave. Per la «e» decide la parola (sotto).
GRAVI = {"a": "à", "i": "ì", "o": "ò", "u": "ù"}

# Parole in cui l'apostrofo e' GIUSTO: sono troncamenti, non accenti.
# «un po'» non diventa «un pò» — sarebbe un errore, non una correzione.
TRONCAMENTI = {"po", "mo", "be", "da", "di", "fa", "sta", "va", "to", "ca", "co", "bo"}

# La «e» acuta: le parole in -ché, e i monosillabi né / sé / -tré.
_ACUTA = re.compile(r"(?:^|\w)(?:ch|n|s|tr)e$", re.I)

# Una parola che finisce con vocale + apostrofo, e dopo l'apostrofo NON c'e' una
# lettera (quella sarebbe un'elisione).
_FINALE = re.compile(r"\b(\w*[aeiouAEIOU])'(?![\w'])")

# L'apostrofo usato come virgoletta d'apertura: 'ciao — se c'e', il testo si
# lascia stare.
_VIRGOLETTA = re.compile(r"(?:^|[\s(\[])'\w")


def accenta(testo):
    """Rende gli accenti battuti con l'apostrofo. Testo invariato se c'e' un
    dubbio: non imparare e' meglio che imparare storto."""
    t = str(testo or "")
    if "'" not in t or _VIRGOLETTA.search(t):
        return t

    def _una(m):
        parola = m.group(1)
        basso = parola.lower()
        if basso in TRONCAMENTI:
            return m.group(0)                       # «po'», «da'»: l'apostrofo e' suo
        ultima = basso[-1]
        if ultima == "e":
            return parola[:-1] + ("é" if _ACUTA.search(basso) else "è")
        acc = GRAVI.get(ultima)
        return parola[:-1] + acc if acc else m.group(0)

    return _FINALE.sub(_una, t)
