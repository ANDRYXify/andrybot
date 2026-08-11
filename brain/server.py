"""
server.py — Il cervello come SERVIZIO separato.

Vive in un processo Python a sé (container 'brain'), così qualunque cosa faccia
— pensare, caricare il modello, generare — NON tocca il bot Node: i comandi
restano sempre istantanei. Il bot lo interroga via HTTP con un timeout corto;
se il cervello è lento o spento, il bot semplicemente non chiacchiera.

Endpoint:
  GET  /health           → stato del cervello (per il bot e per i log)
  POST /chat   {canale, login, nome, testo, tono}   → { risposta }
  POST /osserva {canale, login, nome, testo}         → impara dalla chat (best-effort)

Avvio: python3 server.py   (porta 8091, solo rete interna del compose)
"""
import os
import json
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import coscienza as C
import genera as G
import rete as R
import ragiona as RAG

PORT = int(os.environ.get("BRAIN_PORT", "8091"))
CONSOLIDA_OGNI = int(os.environ.get("BRAIN_CONSOLIDA_MIN", "30")) * 60

mente = C.Coscienza()


def _delta_umore(testo):
    t = (testo or "").lower()
    su = sum(1 for k in ("grazie", "bravo", "top", "grande", "bello", "ottimo", "❤", "😍", "🔥") if k in t)
    giu = sum(1 for k in ("scemo", "brutto", "odio", "noioso", "schifo", "🤮") if k in t)
    return 0.05 * su - 0.06 * giu


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        corpo = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _leggi(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        if n <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def log_message(self, *a):
        pass  # niente log di accesso rumorosi

    def do_GET(self):
        if self.path.startswith("/health") or self.path.startswith("/stato"):
            return self._json(200, {"ok": True, "genera": G.stato()})
        if self.path.startswith("/corpus"):
            return self._corpus()
        if self.path.startswith("/rete"):
            return self._rete()
        if self.path.startswith("/moduli"):
            return self._moduli()
        if self.path.startswith("/lacune"):
            return self._lacune()
        return self._json(404, {"errore": "non trovato"})

    def _moduli(self):
        # elenco del "manuale umano". Compatto di default (per il seeding); con
        # ?full=1 include anche i testi (per il grafo/cruscotto della mente).
        from urllib.parse import urlparse, parse_qs
        full = (parse_qs(urlparse(self.path).query).get("full", ["0"])[0] in ("1", "true", "si"))
        try:
            if full:
                out = mente.moduli()   # dict completi (situazione/come_rispondere/…)
            else:
                out = [{"nome": m["nome"], "dominio": m["dominio"], "stato": m["stato"],
                        "qualita": m["qualita"], "usi": m["usi"],
                        "successi": m["successi"], "fallimenti": m["fallimenti"]}
                       for m in mente.moduli()]
            return self._json(200, {"moduli": out})
        except Exception as e:
            return self._json(200, {"moduli": [], "errore": str(e)[:120]})

    def _lacune(self):
        # le lacune RICORRENTI dalla chat reale, da studiare (apprendimento autonomo).
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        try:
            minv = int(q.get("min", ["2"])[0])
        except Exception:
            minv = 2
        try:
            return self._json(200, {"lacune": mente.lacune_da_studiare(min_visto=minv, limit=8)})
        except Exception as e:
            return self._json(200, {"lacune": [], "errore": str(e)[:120]})

    def _corpus(self):
        # il dataset della sua mente (coppie domanda→risposta consolidate)
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        canale = (q.get("canale", [""])[0] or "").lower().strip()
        if not canale:
            return self._json(400, {"errore": "canale mancante"})
        try:
            return self._json(200, {"coppie": R.esporta(canale)})
        except Exception as e:
            return self._json(200, {"coppie": [], "errore": str(e)[:120]})

    def _rete(self):
        # stato della piccola rete PER CANALE (cruscotto in dashboard)
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        canale = (q.get("canale", [""])[0] or "").lower().strip()
        if not canale:
            return self._json(400, {"errore": "canale mancante"})
        try:
            st = R.stato(canale)
            try:
                st["ragiona"] = RAG.stato(canale)   # il cervello simbolico (fatti/dedotti)
            except Exception:
                st["ragiona"] = None
            return self._json(200, st)
        except Exception as e:
            return self._json(200, {"nodi": 0, "errore": str(e)[:120]})

    def do_POST(self):
        if self.path.startswith("/chat"):
            return self._chat()
        if self.path.startswith("/osserva"):
            return self._osserva()
        if self.path.startswith("/distilla"):
            return self._distilla()
        if self.path.startswith("/impara_modulo"):
            return self._impara_modulo()
        if self.path.startswith("/ricarica"):
            return self._ricarica()
        if self.path.startswith("/prova"):
            return self._prova()
        return self._json(404, {"errore": "non trovato"})

    def _prova(self):
        # verifica dal SERVER che un endpoint esterno (LM Studio/Ollama) risponda.
        # Se il corpo è vuoto, prova la configurazione salvata.
        d = self._leggi()
        cfg = None
        url = str(d.get("url") or "").strip()
        if url:
            cfg = {
                "url": url,
                "modello": (str(d.get("modello") or "").strip() or "local-model"),
                "chiave": str(d.get("chiave") or "").strip(),
                "solo": bool(d.get("solo")),
            }
        try:
            return self._json(200, G.prova_endpoint(cfg))
        except Exception as e:
            return self._json(200, {"ok": False, "motivo": str(e)[:160]})

    def _chat(self):
        d = self._leggi()
        canale = str(d.get("canale") or "").lower().strip()
        login = str(d.get("login") or "").lower().strip()
        nome = str(d.get("nome") or login)
        testo = str(d.get("testo") or "").strip()
        tono = str(d.get("tono") or "scherzoso")
        modo = str(d.get("modo") or "").strip()
        if modo not in ("allenamento", "proattivo", "studio"):
            modo = "live"
        if not canale or not login or not testo:
            return self._json(400, {"errore": "dati mancanti"})
        try:
            mente.incontra(canale, login, nome)
            mente.reagisci(canale, _delta_umore(testo), 0.02)
            # REVISIONE del manuale: questo messaggio è anche la reazione al turno
            # precedente del bot → giudica se i moduli usati allora hanno funzionato.
            try:
                mente.valuta_reazione(canale, login, testo)
            except Exception:
                pass
            ctx = mente.contesto(canale, login, testo, tono)
            # conoscenza curata passata dal bot (profilo del sito): la mettiamo
            # davanti ai fatti così il cervello sa social/info del canale.
            cur = d.get("conoscenza")
            if isinstance(cur, list) and cur:
                ctx["fatti"] = [str(x)[:200] for x in cur[:6]] + list(ctx.get("fatti", []))
            # stile: frasi vere dello streamer (la sua voce) → esempi da imitare
            sti = d.get("stile")
            if isinstance(sti, list) and sti:
                ctx["stile"] = [str(x)[:160] for x in sti[:8] if str(x).strip()]
            # STORIA: le ultime righe della chat del canale (memoria a breve termine).
            # Ogni voce: {nome, testo, io}. Serve a capire il discorso in corso.
            st_chat = d.get("storia")
            if isinstance(st_chat, list) and st_chat:
                righe = []
                for x in st_chat[-8:]:
                    if not isinstance(x, dict):
                        continue
                    testo_r = str(x.get("testo") or "").strip()
                    if not testo_r:
                        continue
                    righe.append({
                        "nome": (str(x.get("nome") or "").strip() or "utente")[:24],
                        "testo": testo_r[:160],
                        "io": bool(x.get("io")),
                    })
                if righe:
                    ctx["storia"] = righe
            # SITUAZIONE: com'è la diretta adesso (gioco/live/uptime). Coscienza del momento.
            situ = str(d.get("situazione") or "").strip()
            if situ:
                ctx["situazione"] = situ[:200]
            # MODULI del "manuale umano" pertinenti a QUESTO momento (max 2-3): il bot
            # applica ciò che ha imparato su come reagire alle emozioni/situazioni umane.
            # Solo in live (nei modi privati il ragionamento è già disteso).
            if modo == "live":
                try:
                    storia_txt = " ".join(r.get("testo", "") for r in ctx.get("storia", []))[:400]
                    scelti = mente.seleziona_moduli(testo, storia_txt, k=2)
                    if scelti:
                        ctx["moduli"] = scelti
                    elif len(str(testo).strip()) >= 12 and not str(testo).lstrip().startswith("!"):
                        # nessun modulo copriva questa situazione reale: se è
                        # sostanziosa (non un comando né due parole), segnala la
                        # LACUNA. Se ricorre, Lia la studierà da sola.
                        mente.registra_lacuna(testo)
                except Exception:
                    pass
            # personhood: nome della "persona" (dall'anima) e spunto per il proattivo
            nb = str(d.get("nome_bot") or "").strip()
            if nb:
                ctx["nome_bot"] = nb[:40]
            sp = str(d.get("spunto") or "").strip()
            if sp:
                ctx["spunto"] = sp[:200]
            # LINEE GUIDA: regole che lo streamer le ha dato → le rispetta SEMPRE
            lg = d.get("linee_guida")
            if isinstance(lg, list) and lg:
                ctx["linee_guida"] = [str(x)[:200] for x in lg[:12] if str(x).strip()]
            # WEB: informazione trovata online (da trattare come NON affidabile)
            wb = str(d.get("web") or "").strip()
            if wb:
                ctx["web"] = wb[:600]
            # in allenamento lascio più tempo (risposta più lunga e ragionata)
            timeout_s = 38 if modo == "allenamento" else 30
            risposta = G.genera(canale, ctx, testo, timeout_s=timeout_s, modo=modo)
            if risposta:
                mente.registra_scambio(canale, login, testo, risposta)
                # ricorda i moduli usati in questa risposta, per giudicarli quando
                # l'utente ribatte (revisione dell'auto-apprendimento).
                if ctx.get("moduli"):
                    try:
                        mente.ricorda_moduli_usati(
                            canale, login,
                            [m.get("id") for m in ctx["moduli"] if isinstance(m, dict) and m.get("id")])
                    except Exception:
                        pass
            return self._json(200, {"risposta": risposta})
        except Exception as e:
            return self._json(200, {"risposta": None, "errore": str(e)[:120]})

    def _impara_modulo(self):
        # AUTO-APPRENDIMENTO: studia una situazione umana e ne ricava un MODULO
        # operativo (non un riassunto), che salva nel "manuale" GLOBALE. La ricerca
        # web la fa il bot Node (dove vive l'accesso a internet) e passa qui lo
        # `web`; qui c'è la sintesi (il maestro) + il salvataggio in coscienza.
        d = self._leggi()
        nome = str(d.get("nome") or "").strip()
        dominio = (str(d.get("dominio") or "emozioni").strip() or "emozioni")
        web = str(d.get("web") or "").strip()
        if not nome:
            return self._json(400, {"errore": "nome mancante"})
        try:
            mod = G.sintetizza_modulo(nome, web, dominio=dominio)
            if not mod:
                return self._json(200, {"ok": False, "motivo": "sintesi non riuscita (cervello non pronto o output non valido)"})
            salvato = mente.salva_modulo(mod)
            # se veniva da una LACUNA reale, chiudila: è stata imparata.
            lac = str(d.get("lacuna") or "").strip()
            if salvato and lac:
                try:
                    mente.chiudi_lacuna(lac)
                except Exception:
                    pass
            return self._json(200, {"ok": bool(salvato), "modulo": salvato})
        except Exception as e:
            return self._json(200, {"ok": False, "errore": str(e)[:120]})

    def _ricarica(self):
        # cambia modello a caldo (in base a data/llm.json aggiornato dalla dashboard)
        threading.Thread(target=G.ricarica, daemon=True).start()
        return self._json(200, {"ok": True, "genera": G.stato()})

    def _distilla(self):
        # ALLENAMENTO: dai discorsi dello streamer ricava coppie domanda→risposta
        # riutilizzabili (nel suo stile) per il motore veloce. Best-effort.
        d = self._leggi()
        canale = str(d.get("canale") or "").lower().strip()
        frasi = d.get("frasi")
        if not canale or not isinstance(frasi, list):
            return self._json(400, {"errore": "dati mancanti"})
        try:
            coppie = G.distilla(canale, frasi)
            return self._json(200, {"coppie": coppie if isinstance(coppie, list) else [], "pronto": coppie is not None})
        except Exception as e:
            return self._json(200, {"coppie": [], "pronto": False, "errore": str(e)[:120]})

    def _osserva(self):
        d = self._leggi()
        canale = str(d.get("canale") or "").lower().strip()
        login = str(d.get("login") or "").lower().strip()
        nome = str(d.get("nome") or login)
        testo = str(d.get("testo") or "").strip()
        if canale and login:
            try:
                mente.incontra(canale, login, nome)
                # impara un "fatto" solo se sembra un'affermazione sostanziosa
                if testo and not testo.startswith("!") and 20 <= len(testo) <= 200 and "?" not in testo:
                    mente.impara_fatto(canale, testo, fonte="chat")
                    # e prova a ricavarne triple per il cervello SIMBOLICO
                    try:
                        RAG.impara_frase(canale, testo)
                    except Exception:
                        pass
            except Exception:
                pass
        return self._json(200, {"ok": True})


def _ciclo_consolida():
    """Il 'sonno' del bot: ogni tanto consolida la memoria e fa crescere la
    personalità. È qui che la coscienza matura nel tempo."""
    while True:
        time.sleep(CONSOLIDA_OGNI)
        try:
            for canale in mente.canali_attivi():
                mente.consolida(canale)
                try:
                    R.consolida(canale)   # il 'sonno' anche della piccola rete
                except Exception:
                    pass
                try:
                    RAG.inferisci(canale)   # ragiona sui fatti: deduce e trova incoerenze
                except Exception:
                    pass
            R.salva_tutto()
            print("[brain] coscienza, rete e ragionamento consolidati.", flush=True)
        except Exception as e:
            print(f"[brain] consolida errore: {e}", flush=True)


def main():
    # carica il modello in background (non blocca il server)
    threading.Thread(target=G.avvia, daemon=True).start()
    threading.Thread(target=_ciclo_consolida, daemon=True).start()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[brain] in ascolto su :{PORT}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
