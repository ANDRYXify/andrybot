#!/usr/bin/env python3
# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
IL BROWSER DI LIA — uno vero, aperto, che resta aperto.

Prima navigava così: `chromium --headless --dump-dom | sed 's/<[^>]*>/ /g' | head -c 6000`.
Un colpo solo, senza schermo, senza memoria: ogni pagina nasceva e moriva dentro un
comando. Non poteva cliccare, non poteva scorrere, non poteva restare loggata da
nessuna parte, non poteva seguire un percorso di due passi. Le pagine fatte in
JavaScript le vedeva vuote, perché prendeva il DOM prima che il sito si
disegnasse. Non era un browser: era una fotocopia sbiadita di una pagina.

Qui invece c'è un browser VERO, con la finestra su uno schermo vero (Xvfb), che
VIVE fra un gesto e l'altro. Il profilo sta su disco, nella sua casa: i cookie e
le sessioni restano; se ieri è entrata da qualche parte, oggi è ancora dentro.

═══ IL BROWSER HA UN PADRONE SOLO, ed è la cosa che tiene in piedi questo file ═══

L'API sincrona di Playwright è legata AL THREAD CHE L'HA CREATA: gli oggetti
nascono dentro un dispatcher suo, e usarli da un altro thread non dà un errore —
si pianta, e resta piantato. Un server HTTP a thread (uno nuovo per ogni
richiesta) è la ricetta esatta per quel guaio: il primo gesto costruisce il
browser nel thread A e funziona, il secondo arriva sul thread B e muore in
silenzio. Da fuori si vede «sta caricando», per sempre.

Quindi il browser vive in UN THREAD SOLO — il lavoratore — che se lo costruisce,
lo usa e lo chiude. Le richieste HTTP non lo toccano mai: mettono un gesto in
coda e aspettano la risposta, con una scadenza. Nessuno aspetta per sempre:
scaduto il tempo, chi ha chiesto riceve un errore che DICE cos'è successo, e il
browser viene rifatto da capo al gesto dopo — una pagina rimasta a metà non deve
avvelenare i gesti successivi.

Il confine è quello di sempre e non si tocca: questo processo ascolta SOLO su
127.0.0.1, dentro il container. Non è una porta in più sul mondo — ci arriva
l'esecutore, che a sua volta risponde solo a chi ha la chiave del cervello. E
tutto il traffico in uscita passa comunque dal `guardiano`, che le lascia
internet pubblico e le sbarra l'infrastruttura di casa.
"""
import base64
import json
import os
import queue
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(os.environ.get("BROWSER_PORT", "8100"))
CASA = os.environ.get("AMBIENTE_HOME", "/home/lia")
PROFILO = os.path.join(CASA, ".browser", "profilo")
SCATTI = os.path.join(CASA, "progetti", "scatti")
# Quanto testo torna indietro da una pagina. Ampio: leggere mezza frase e poi
# doverne chiedere un'altra non è leggere.
TESTO_MAX = int(os.environ.get("BROWSER_TESTO_MAX", "40000"))

# LE SCADENZE. Ogni gesto ha un tempo, e scaduto quello chi ha chiesto riceve una
# risposta — mai il silenzio. Devono stare DENTRO l'attesa di chi ci chiama
# (l'esecutore aspetta di più di noi, il cervello più dell'esecutore): se noi
# aspettassimo più a lungo di lui, lui direbbe «non risponde» a un gesto che stava
# per riuscire.
GESTO_S = float(os.environ.get("BROWSER_GESTO_S", "35"))     # quanto vale un gesto
LANCIO_S = float(os.environ.get("BROWSER_LANCIO_S", "40"))   # quanto vale accendere il browser
AZIONE_MS = int(os.environ.get("BROWSER_AZIONE_MS", "20000"))  # quanto Playwright aspetta un elemento
CODA_MAX = int(os.environ.get("BROWSER_CODA_MAX", "4"))      # gesti in attesa oltre i quali si dice no

_coda = queue.Queue()
_ctx = {"pw": None, "browser": None, "pagina": None}
_rifare = threading.Event()      # il prossimo gesto ricostruisce il browser da capo
_diario = {"acceso": False, "finestra": None, "ultimo": "", "errore": "", "quando": 0}


def _log(*a):
    print("[browser]", *a, flush=True)


# ─────────────────────────── il browser (SOLO dal lavoratore) ───────────────

def _chiudi():
    """Butta giù tutto. Chiamata solo dal lavoratore: è lui il padrone."""
    for chi, chiudi in (("browser", lambda: _ctx["browser"] and _ctx["browser"].close()),
                        ("playwright", lambda: _ctx["pw"] and _ctx["pw"].stop())):
        try:
            chiudi()
        except Exception as e:
            _log(f"chiusura {chi}: {e}")
    _ctx.update(pw=None, browser=None, pagina=None)
    _diario.update(acceso=False, finestra=None)


def _c_e_schermo():
    """C'è davvero uno schermo su cui aprire una finestra? Si guarda PRIMA di
    provarci: provare e aspettare che scada è il modo più lento di scoprirlo."""
    d = os.environ.get("DISPLAY", "")
    if not d:
        return False
    # Xvfb crea il suo socket qui: se non c'è, non c'è schermo.
    n = d.split(":")[-1].split(".")[0]
    return os.path.exists(f"/tmp/.X11-unix/X{n}")


def _avvia():
    """Apre il browser la prima volta che serve, e lo tiene aperto. Con la finestra
    sullo schermo vero se lo schermo c'è; cieco se non c'è — navigare male è meglio
    che non navigare, e il perché finisce nel diario invece che nel silenzio."""
    if _rifare.is_set():
        _chiudi()
        _rifare.clear()
    if _ctx["pagina"] is not None:
        return _ctx["pagina"]

    from playwright.sync_api import sync_playwright
    os.makedirs(PROFILO, exist_ok=True)
    os.makedirs(SCATTI, exist_ok=True)
    finestra = _c_e_schermo()
    if not finestra:
        _log("nessuno schermo (DISPLAY=%r): apro cieco" % os.environ.get("DISPLAY", ""))

    pw = sync_playwright().start()
    try:
        ctx = pw.chromium.launch_persistent_context(
            PROFILO,
            headless=not finestra,
            viewport={"width": 1280, "height": 800},
            timeout=int(LANCIO_S * 1000),      # accendere ha una scadenza anche lui
            args=["--no-sandbox", "--disable-dev-shm-usage", "--start-maximized"],
        )
    except Exception:
        try:
            pw.stop()
        except Exception:
            pass
        raise

    pagina = ctx.pages[0] if ctx.pages else ctx.new_page()
    pagina.set_default_timeout(AZIONE_MS)
    pagina.set_default_navigation_timeout(AZIONE_MS)
    _ctx.update(pw=pw, browser=ctx, pagina=pagina)
    _diario.update(acceso=True, finestra=finestra, errore="")
    _log("acceso", "con la finestra" if finestra else "cieco")
    return pagina


def _testo(p, quanto=None):
    try:
        t = p.inner_text("body")
    except Exception:
        t = p.content()
    return t[: int(quanto or TESTO_MAX)]


def _dove(p):
    try:
        return {"url": p.url, "titolo": p.title()}
    except Exception:
        return {"url": "", "titolo": ""}


def _posa(p):
    """Aspetta che la pagina si assesti, ma senza farne un dramma: se la rete non
    tace mai (pubblicità, sondaggi, socket aperti) la pagina c'è lo stesso."""
    try:
        p.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass


def _azione(d):
    """Un gesto sul browser. Ogni gesto lascia la pagina dov'è: il prossimo riparte
    da lì. È questa continuità a fare la differenza fra navigare e fotocopiare.
    Gira SEMPRE e SOLO nel thread del lavoratore."""
    az = str(d.get("azione") or "apri").strip().lower()

    if az == "chiudi":
        _chiudi()
        return {"ok": True, "chiuso": True}

    p = _avvia()

    if az == "apri":
        u = str(d.get("url") or "").strip()
        if not (u.startswith("http://") or u.startswith("https://")):
            return {"ok": False, "errore": "url non valido (solo http/https)"}
        p.goto(u, wait_until="domcontentloaded")
        _posa(p)
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "leggi":
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "html":
        return {"ok": True, **_dove(p), "html": p.content()[: int(d.get("quanto") or TESTO_MAX)]}

    if az == "clicca":
        sel = str(d.get("cosa") or "").strip()
        if not sel:
            return {"ok": False, "errore": "cosa cliccare?"}
        # prima per TESTO (come farebbe una persona: clicca «Accedi»), poi per selettore
        try:
            p.get_by_text(sel, exact=False).first.click()
        except Exception:
            p.click(sel)
        _posa(p)
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "scrivi":
        sel = str(d.get("dove") or "").strip()
        if not sel:
            return {"ok": False, "errore": "dove scrivere?"}
        p.fill(sel, str(d.get("testo") or ""))
        if d.get("invio"):
            p.press(sel, "Enter")
            _posa(p)
        return {"ok": True, **_dove(p)}

    if az == "premi":
        p.keyboard.press(str(d.get("tasto") or "Enter"))
        return {"ok": True, **_dove(p)}

    if az == "scorri":
        p.mouse.wheel(0, int(d.get("pixel") or 800))
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az in ("indietro", "avanti"):
        (p.go_back if az == "indietro" else p.go_forward)()
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "schermata":
        os.makedirs(SCATTI, exist_ok=True)
        f = os.path.join(SCATTI, (str(d.get("nome") or "") or f"scatto_{int(time.time())}") + ".png")
        p.screenshot(path=f)
        return {"ok": True, "file": f, **_dove(p)}

    if az == "immagine":
        # la schermata COME IMMAGINE, non come percorso: serve a farla vedere fuori
        b = p.screenshot()
        return {"ok": True, "png_b64": base64.b64encode(b).decode("ascii"), **_dove(p)}

    if az == "pdf":
        os.makedirs(SCATTI, exist_ok=True)
        f = os.path.join(SCATTI, f"pagina_{int(time.time())}.pdf")
        p.pdf(path=f)
        return {"ok": True, "file": f, **_dove(p)}

    if az == "link":
        fuori = p.eval_on_selector_all(
            "a[href]", "els => els.map(e => [e.innerText.trim().slice(0,80), e.href])")
        return {"ok": True, **_dove(p), "link": [x for x in fuori if x[1]][: int(d.get("quanti") or 40)]}

    if az == "dove":
        return {"ok": True, **_dove(p)}

    return {"ok": False, "errore": "azione sconosciuta: " + az}


# ─────────────────────────── il lavoratore: l'unico padrone ─────────────────

def _lavoratore():
    """Il thread che POSSIEDE il browser. Prende un gesto per volta dalla coda, lo
    esegue e lo consegna a chi lo aspetta — se c'è ancora qualcuno ad aspettarlo."""
    # Si accende SUBITO, senza aspettare che qualcuno chieda: un browser che deve
    # svegliarsi al primo gesto fa pagare a quel gesto mezzo minuto di attesa, e da
    # fuori sembra che non funzioni. Se non riesce, pazienza: si riproverà al primo
    # gesto vero, e intanto il motivo è nel diario.
    try:
        _avvia()
    except Exception as e:
        _diario["errore"] = str(e)[:300]
        _log("non sono riuscito ad accendere il browser all'avvio:", str(e)[:200])
        _rifare.set()

    while True:
        d, esito, abbandonato = _coda.get()
        az = str(d.get("azione") or "?")
        _diario.update(ultimo=az, quando=int(time.time()))
        try:
            r = _azione(d)
        except Exception as e:
            r = {"ok": False, "errore": f"{az}: {str(e)[:300]}"}
            _diario["errore"] = r["errore"]
            _log("gesto fallito:", az, "→", str(e)[:200])
            _log(traceback.format_exc()[-800:])
            _rifare.set()          # il prossimo gesto riparte da un browser nuovo
        if abbandonato.is_set():
            # Nessuno aspetta più: quel gesto ha sforato, e la pagina è rimasta in
            # uno stato che non conosciamo. Si riparte puliti.
            _log("gesto arrivato tardi:", az, "— rifaccio il browser")
            _rifare.set()
            continue
        esito.put(r)


def _chiedi(d, attesa=None):
    """Mette un gesto in coda e aspetta la risposta, con una scadenza. Chi chiama non
    tocca MAI il browser: solo la coda."""
    if _coda.qsize() >= CODA_MAX:
        return {"ok": False, "errore": "il browser è occupato: troppi gesti in attesa"}
    esito = queue.Queue(maxsize=1)
    abbandonato = threading.Event()
    _coda.put((d, esito, abbandonato))
    limite = float(attesa or GESTO_S)
    # accendere il browser costa: al primo gesto si concede il tempo del lancio
    if not _diario["acceso"]:
        limite += LANCIO_S
    try:
        return esito.get(timeout=limite)
    except queue.Empty:
        abbandonato.set()
        return {"ok": False, "errore": f"il gesto non è finito entro {int(limite)}s",
                "scaduto": True, "gesto": str(d.get("azione") or "?")}


class H(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/health"):
            return self._json(200, {"ok": True, "aperto": _diario["acceso"]})
        # LO STATO: a che punto è, e cosa è andato storto l'ultima volta. Serve a
        # dire «non funziona PERCHÉ», invece di lasciare girare una rotellina.
        if self.path.startswith("/stato"):
            return self._json(200, {"ok": True, **_diario, "in_coda": _coda.qsize(),
                                    "schermo": os.environ.get("DISPLAY", ""),
                                    "finestra_possibile": _c_e_schermo()})
        return self._json(404, {"errore": "not found"})

    def do_POST(self):
        if not self.path.startswith("/azione"):
            return self._json(404, {"errore": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            d = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"errore": "json non valido"})
        return self._json(200, _chiedi(d, d.get("attesa")))


if __name__ == "__main__":
    threading.Thread(target=_lavoratore, name="browser", daemon=True).start()
    # Solo 127.0.0.1: dentro il container. Non è una porta in più sul mondo.
    _log("in ascolto su 127.0.0.1:%d — schermo %r" % (PORTA, os.environ.get("DISPLAY", "")))
    ThreadingHTTPServer(("127.0.0.1", PORTA), H).serve_forever()
