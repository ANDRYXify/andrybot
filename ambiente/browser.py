#!/usr/bin/env python3
# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
"""
IL BROWSER DI LIA — uno vero, aperto, che resta aperto.

Prima navigava così: `chromium --headless --dump-dom | sed 's/<[^>]*>//g' | head -c 6000`.
Un colpo solo, senza schermo, senza memoria: ogni pagina nasceva e moriva dentro un
comando. Non poteva cliccare, non poteva scorrere, non poteva restare loggata da
nessuna parte, non poteva seguire un percorso di due passi. Le pagine fatte in
JavaScript le vedeva vuote, perché il DOM lo prendeva prima che il sito si
disegnasse. Non era un browser: era una fotocopia sbiadita di una pagina.

Qui invece c'è un browser VERO, con la finestra su uno schermo vero (Xvfb), che
VIVE fra un gesto e l'altro. Il profilo sta su disco, nella sua casa: i cookie e
le sessioni restano; se ieri è entrata da qualche parte, oggi è ancora dentro.

Il confine è quello di sempre e non si tocca: questo processo ascolta SOLO su
127.0.0.1, dentro il container. Non è una porta in più sul mondo — ci arriva
l'esecutore, che a sua volta risponde solo a chi ha la chiave del cervello. E
tutto il traffico in uscita passa comunque dal `guardiano`, che le lascia
internet pubblico e le sbarra l'infrastruttura di casa.
"""
import base64
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(os.environ.get("BROWSER_PORT", "8100"))
CASA = os.environ.get("AMBIENTE_HOME", "/home/lia")
PROFILO = os.path.join(CASA, ".browser", "profilo")
SCATTI = os.path.join(CASA, "progetti", "scatti")
# Quanto testo torna indietro da una pagina. Ampio: leggere mezza frase e poi
# doverne chiedere un'altra non è leggere.
TESTO_MAX = int(os.environ.get("BROWSER_TESTO_MAX", "40000"))
AZIONE_MS = int(os.environ.get("BROWSER_AZIONE_MS", "20000"))

_lock = threading.Lock()
_ctx = {"pw": None, "browser": None, "pagina": None}


def _avvia():
    """Apre il browser la prima volta che serve, e lo tiene aperto. Headful su
    schermo vero: molti siti si comportano diversamente in headless, e «vero»
    vuol dire che si vede e si comporta come per chiunque altro."""
    if _ctx["pagina"] is not None:
        return _ctx["pagina"]
    from playwright.sync_api import sync_playwright
    os.makedirs(PROFILO, exist_ok=True)
    os.makedirs(SCATTI, exist_ok=True)
    pw = sync_playwright().start()

    def _apri(con_finestra):
        return pw.chromium.launch_persistent_context(
            PROFILO,
            headless=not con_finestra,
            viewport={"width": 1280, "height": 800},
            args=["--no-sandbox", "--disable-dev-shm-usage", "--start-maximized"],
        )

    # Con la finestra, sullo schermo vero. Ma se lo schermo non c'è — Xvfb non è
    # partito, l'immagine è vecchia — si apre lo stesso, cieco: navigare male è
    # meglio che non navigare, e il motivo si legge nel log dell'avvio invece di
    # presentarsi come «il browser non risponde».
    try:
        ctx = _apri(True)
    except Exception:
        ctx = _apri(False)
    pagina = ctx.pages[0] if ctx.pages else ctx.new_page()
    pagina.set_default_timeout(AZIONE_MS)
    _ctx.update(pw=pw, browser=ctx, pagina=pagina)
    return pagina


def _testo(p, quanto=None):
    try:
        t = p.inner_text("body")
    except Exception:
        t = p.content()
    n = int(quanto or TESTO_MAX)
    return t[:n]


def _dove(p):
    try:
        return {"url": p.url, "titolo": p.title()}
    except Exception:
        return {"url": "", "titolo": ""}


def _scatta(p, nome=""):
    import time
    os.makedirs(SCATTI, exist_ok=True)
    f = os.path.join(SCATTI, (nome or f"scatto_{int(time.time())}") + ".png")
    p.screenshot(path=f, full_page=False)
    return f


def _azione(d):
    """Un gesto sul browser. Ogni gesto lascia la pagina dov'è: il prossimo riparte
    da lì. È questa continuità a fare la differenza fra navigare e fotocopiare."""
    az = str(d.get("azione") or "apri").strip().lower()
    p = _avvia()

    if az == "apri":
        u = str(d.get("url") or "").strip()
        if not (u.startswith("http://") or u.startswith("https://")):
            return {"ok": False, "errore": "url non valido (solo http/https)"}
        p.goto(u, wait_until="domcontentloaded")
        try:
            p.wait_for_load_state("networkidle", timeout=6000)
        except Exception:
            pass                              # la pagina c'è: non aspetto l'ultimo pixel
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "leggi":
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "html":
        return {"ok": True, **_dove(p), "html": p.content()[:int(d.get("quanto") or TESTO_MAX)]}

    if az == "clicca":
        sel = str(d.get("cosa") or "").strip()
        if not sel:
            return {"ok": False, "errore": "cosa cliccare?"}
        # prima per TESTO (come farebbe una persona: clicca «Accedi»), poi per selettore
        try:
            p.get_by_text(sel, exact=False).first.click()
        except Exception:
            p.click(sel)
        try:
            p.wait_for_load_state("networkidle", timeout=6000)
        except Exception:
            pass
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "scrivi":
        sel = str(d.get("dove") or "").strip()
        testo = str(d.get("testo") or "")
        if not sel:
            return {"ok": False, "errore": "dove scrivere?"}
        p.fill(sel, testo)
        if d.get("invio"):
            p.press(sel, "Enter")
            try:
                p.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass
        return {"ok": True, **_dove(p)}

    if az == "premi":
        p.keyboard.press(str(d.get("tasto") or "Enter"))
        return {"ok": True, **_dove(p)}

    if az == "scorri":
        quanto = int(d.get("pixel") or 800)
        p.mouse.wheel(0, quanto)
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az in ("indietro", "avanti"):
        (p.go_back if az == "indietro" else p.go_forward)()
        return {"ok": True, **_dove(p), "testo": _testo(p, d.get("quanto"))}

    if az == "schermata":
        f = _scatta(p, str(d.get("nome") or ""))
        return {"ok": True, "file": f, **_dove(p)}

    if az == "immagine":
        # la schermata COME IMMAGINE, non come percorso: serve a farla vedere fuori
        b = p.screenshot(full_page=False)
        return {"ok": True, "png_b64": base64.b64encode(b).decode("ascii"), **_dove(p)}

    if az == "pdf":
        import time
        os.makedirs(SCATTI, exist_ok=True)
        f = os.path.join(SCATTI, f"pagina_{int(time.time())}.pdf")
        p.pdf(path=f)
        return {"ok": True, "file": f, **_dove(p)}

    if az == "link":
        n = int(d.get("quanti") or 40)
        fuori = p.eval_on_selector_all(
            "a[href]", "els => els.map(e => [e.innerText.trim().slice(0,80), e.href])")
        return {"ok": True, **_dove(p), "link": [x for x in fuori if x[1]][:n]}

    if az == "dove":
        return {"ok": True, **_dove(p)}

    if az == "chiudi":
        with_ctx = _ctx["browser"]
        try:
            if with_ctx:
                with_ctx.close()
            if _ctx["pw"]:
                _ctx["pw"].stop()
        finally:
            _ctx.update(pw=None, browser=None, pagina=None)
        return {"ok": True, "chiuso": True}

    return {"ok": False, "errore": "azione sconosciuta: " + az}


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
            return self._json(200, {"ok": True, "aperto": _ctx["pagina"] is not None})
        return self._json(404, {"errore": "not found"})

    def do_POST(self):
        if not self.path.startswith("/azione"):
            return self._json(404, {"errore": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            d = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"errore": "json non valido"})
        # Un gesto per volta: il browser è uno solo, e due gesti insieme si
        # pesterebbero i piedi sulla stessa pagina.
        with _lock:
            try:
                return self._json(200, _azione(d))
            except Exception as e:
                return self._json(200, {"ok": False, "errore": str(e)[:300]})


if __name__ == "__main__":
    # Solo 127.0.0.1: dentro il container. Non è una porta in più sul mondo.
    ThreadingHTTPServer(("127.0.0.1", PORTA), H).serve_forever()
