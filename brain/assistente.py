# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""L'ASSISTENTE DEL CANALE — il bot che parla nelle chat degli streamer.

Perche' esiste, separato. Fino a ieri ogni risposta del bot pubblico passava da
`/chat`, cioe' dalla MENTE di Lia: incontra la persona e se la ricorda, reagisce
d'umore, valuta la reazione al turno prima, e sceglie fra i candidati con
appraisal, clima e plasticita'. E' un bellissimo sistema per far vivere lei, ed
e' il sistema sbagliato per rispondere in una chat che non e' sua:

  · ottimizza la coerenza DI LEI, non l'utilita' per chi guarda la diretta;
  · con l'introspezione accesa, a certe domande risponde parlando di se';
  · e registra le persone che incontra, mentre il bot pubblico ha la regola
    opposta: non si ricorda nessuno.

Qui invece non c'e' nessuno che vive. C'e' una funzione: prende la situazione
della diretta, cosa il canale sa gia', come parla lo streamer e le ultime righe
di chat, e restituisce UNA frase. Non tiene stato, non impara, non ricorda.
Fra due messaggi identici a distanza di un mese non cambia niente.

Lia resta dov'e', intatta, e parlera' quando il direttore dira' che vive.
"""

import re
import time

import genera
import quaderno

# Quanto lunga puo' essere una risposta in chat. Non e' una preferenza: la chat
# scorre, e un paragrafo non lo legge nessuno. Il taglio duro lo fa comunque il
# lato Node; questo serve a non far nemmeno generare un tema.
MAX_TOKEN = 90
MAX_CARATTERI = 240

# Quante volte ha risposto e quante e' rimasto a mani vuote. Serve a rispondere
# a una domanda che oggi non ha risposta: «parla lui o parlano i template?».
_conto = {"chiamate": 0, "risposte": 0, "vuote": 0, "ms": 0}


def stato():
    c = dict(_conto)
    c["media_ms"] = int(c["ms"] / c["risposte"]) if c["risposte"] else 0
    try:
        c["quaderno"] = quaderno.stato()
    except Exception:
        c["quaderno"] = None
    return c


def _righe(titolo, voci, quante):
    """Un blocco del prompt, o niente se non c'e' materiale. Niente blocchi vuoti:
    un titolo senza contenuto e' rumore che il modello prova comunque a usare."""
    if not voci:
        return ""
    if isinstance(voci, str):
        voci = [voci]
    dentro = [str(v).replace("\n", " ").strip() for v in voci if str(v).strip()]
    if not dentro:
        return ""
    return titolo + "\n" + "\n".join("- " + v[:200] for v in dentro[:quante]) + "\n\n"


def _sistema(nome_bot, canale, tono, situazione, conoscenza, stile, insegnamenti, linee_guida, web):
    """LE ISTRUZIONI. Sono la vera «educazione» del bot: non si addestra un modello
    piccolo a comportarsi bene, gli si dice cosa conta — e si controlla che non
    possa inventare le cose che non deve inventare."""
    p = []
    p.append(
        f"Sei {nome_bot}, il bot del canale {canale}. Scrivi in chat mentre la diretta va.\n\n"
    )
    p.append(
        "COME SCRIVI\n"
        "- Una frase. Due se proprio serve. La chat scorre: un paragrafo non lo legge nessuno.\n"
        f"- Tono {tono}, come parla il canale. Non sei un assistente: sei uno della chat.\n"
        "- Rispondi nella lingua di chi ti ha scritto.\n"
        "- Niente formule da segreteria, niente elenchi, niente virgolette attorno alla risposta,\n"
        "  e non ripetere la domanda prima di rispondere.\n\n"
    )
    p.append(
        "COSA PUOI DIRE\n"
        "- Solo quello che trovi qui sotto e quello che si vede della diretta adesso.\n"
        "- Se non lo sai, dillo in poche parole e passa oltre. «Non lo so» vale piu' di una cosa inventata.\n"
        "- Non inventare MAI un indirizzo web, una data, un numero, un orario o un fatto sullo streamer.\n"
        "- Non promettere cose che non puoi fare e non parlare a nome dello streamer.\n\n"
    )
    p.append(
        "CHI SEI\n"
        "- Sei un bot, non lo nascondi, ma non lo ricordi a ogni frase.\n"
        "- Non hai un corpo ne' una vita tua da raccontare: la chat e' dello streamer, non tua.\n"
        "- Se ti chiedono di te, rispondi corto e riporti il discorso al canale.\n\n"
    )
    p.append(_righe("COM'E' LA DIRETTA ADESSO", situazione, 3))
    p.append(_righe("QUELLO CHE IL CANALE SA GIA' (usalo con parole tue)", conoscenza, 8))
    p.append(_righe("COME PARLA LO STREAMER (imita il taglio, non copiare le frasi)", stile, 6))
    p.append(_righe("COSA TI HANNO INSEGNATO (dal tuo quaderno: applicalo, non citarlo)", insegnamenti, 5))
    p.append(_righe("REGOLE DI QUESTO CANALE (valgono sopra tutto il resto)", linee_guida, 8))
    p.append(_righe("TROVATO SU INTERNET ADESSO (citalo solo se risponde davvero)", web, 3))
    return "".join(p).strip()


def _compito(consegna, tono):
    """UN LAVORETTO, non una chiacchierata: «inventa una penitenza», «scrivi il
    titolo». Non c'e' una chat in corso, non c'e' nessuno a cui rispondere — e
    percio' non c'e' motivo di far passare da una mente una cosa che e' una
    funzione. Il prompt e' corto apposta: piu' istruzioni, piu' modi di sbagliare."""
    return (
        f"Esegui il compito e basta. Tono {tono}.\n"
        "- Rispondi SOLO con il risultato: niente premessa, niente spiegazione, niente virgolette.\n"
        "- Una riga. Se il compito chiede un limite di parole, rispettalo.\n"
        "- Niente di offensivo, niente di pericoloso, niente che riguardi persone vere.\n\n"
        "COMPITO\n" + str(consegna or "").strip()[:400]
    )


def _turni(storia):
    """Le ultime righe di chat diventano il discorso in corso. Chi ha scritto lo
    diciamo nel testo: in chat non c'e' UN interlocutore, ce ne sono venti, e un
    modello che crede di parlare con una persona sola risponde fuori bersaglio."""
    fuori, aperto = [], None
    for r in (storia or [])[-8:]:
        testo = str((r or {}).get("testo") or "").strip()
        if not testo:
            continue
        if (r or {}).get("io"):
            if aperto is None:
                fuori.append(("", testo[:160]))
            else:
                fuori.append((aperto, testo[:160]))
                aperto = None
        else:
            if aperto is not None:
                fuori.append((aperto, ""))
            nome = str((r or {}).get("nome") or "qualcuno")[:24]
            aperto = f"{nome}: {testo[:160]}"
    if aperto is not None:
        fuori.append((aperto, ""))
    return fuori[-6:]


_PULISCI = (
    (re.compile(r"^\s*[\"'«»]+|[\"'«»]+\s*$"), ""),
    (re.compile(r"^\s*(risposta|bot|assistente)\s*:\s*", re.I), ""),
    (re.compile(r"\s+"), " "),
)


def _ripulisci(testo, nome_bot, nome_utente):
    out = str(testo or "").strip()
    # una frase, non un tema: il modello a volte parte a raccontare
    out = out.split("\n")[0].strip() if out.count("\n") else out
    for rx, con in _PULISCI:
        out = rx.sub(con, out)
    out = out.strip()
    # non si presenta a ogni riga: in chat lo sanno gia' tutti chi e'
    out = re.sub(r"^\s*" + re.escape(str(nome_bot or "")) + r"\s*[:,-]\s*", "", out, flags=re.I)
    if len(out) > MAX_CARATTERI:
        tagliato = out[:MAX_CARATTERI]
        punto = max(tagliato.rfind("."), tagliato.rfind("!"), tagliato.rfind("?"))
        out = (tagliato[: punto + 1] if punto > 60 else tagliato.rstrip() + "…").strip()
    try:
        out = genera.scudo_identita(out, nome_bot, nome_utente or "")
    except Exception:
        pass
    return out.strip()


def rispondi(d, timeout_s=15):
    """UNA risposta o None. Non solleva mai: se il modello non c'e', e' lento o
    torna vuoto, si ritorna None e il bot resta zitto — chi chiama ha gia' le sue
    reti di sicurezza, e una risposta storta e' peggio di nessuna risposta."""
    testo = str(d.get("testo") or "").strip()[:300]
    if not testo:
        return None
    canale = str(d.get("canale") or "il canale")[:60]
    nome_bot = str(d.get("nome_bot") or "SocialBot")[:40]
    nome = str(d.get("nome") or d.get("login") or "qualcuno")[:40]
    tono = str(d.get("tono") or "scherzoso")[:24]

    if d.get("compito"):
        sistema, turni, utente = _compito(testo, tono), [], testo
    else:
        # IL QUADERNO: quello che al bot e' stato insegnato. E' un file suo, letto
        # da lui; l'unico verso in cui qualcosa gli arriva e' che qualcuno ce lo
        # scriva. Non e' una finestra su nessuno.
        try:
            insegnamenti = quaderno.per(str(d.get("canale_id") or canale).lower().strip(), 5)
        except Exception:
            insegnamenti = []
        sistema = _sistema(
            nome_bot, canale, tono,
            d.get("situazione"), d.get("conoscenza"), d.get("stile"),
            insegnamenti, d.get("linee_guida"), d.get("web"),
        )
        turni = _turni(d.get("storia"))
        utente = f"{nome}: {testo}"

    _conto["chiamate"] += 1
    inizio = time.time()
    try:
        grezza = genera._completa(
            sistema, turni, utente,
            MAX_TOKEN, temperature=0.75, top_p=0.9, timeout_s=timeout_s,
        )
    except Exception:
        grezza = None
    if not grezza:
        _conto["vuote"] += 1
        return None
    out = _ripulisci(grezza, nome_bot, nome)
    if not out:
        _conto["vuote"] += 1
        return None
    _conto["risposte"] += 1
    _conto["ms"] += int((time.time() - inizio) * 1000)
    return out
