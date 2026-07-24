"""
genera.py — Le "parole" del bot: il modello linguistico locale.

Prende il contesto costruito dalla coscienza (chi è la persona, cosa ricordo,
umore, fatti) e produce UNA risposta breve, in prima persona, nello stile dello
streamer. Il modello è scelto in base alla RAM del server (più RAM = modello
migliore). Se non è disponibile (poca RAM / libreria assente / errore), ritorna
None: la coscienza resta viva, il bot semplicemente non chiacchiera finché non
c'è di che.

Dipendenza opzionale: llama-cpp-python. Se manca, il servizio parte lo stesso.
"""
import os
import time
import threading
import urllib.request
import json

import rete   # la "piccola rete" che si autoaddestra (motore veloce, puro Python)

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
MODELS_DIR = os.path.join(DATA_DIR, "models")
# scelta del modello fatta dalla DASHBOARD (admin): { "modello": "gemma" } o { "url": "..." }.
# La scrive il bot Node, la legge qui. Vince su .env; vuota = automatico.
SCELTA_FILE = os.path.join(DATA_DIR, "llm.json")

# Scaletta modelli per fascia di RAM (Qwen2.5 Instruct, GGUF). Più RAM, più grande
# il modello / migliore la quantizzazione → chiacchiera migliore. Override con
# LLM_MODEL_URL (o LLM_MODEL_PATH per un file locale, es. un fine-tune tuo).
# Nota: sui box da 8 GB (es. Hetzner CX33) il 3B gira in Q5 (qualità più alta del
# Q4, entra comodo lasciando RAM al bot). 7B non ci sta senza rischiare l'OOM.
_TIERS = [
    (7.0, "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q5_k_m.gguf"),
    (6.0, "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"),
    (3.0, "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"),
    (0.0, "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"),
]

MAX_TOKEN = int(os.environ.get("LLM_MAX_TOKEN", "80"))
CONTEXT = int(os.environ.get("LLM_CONTEXT", "1024"))

_lock = threading.Lock()
_stato = {"stato": "spento", "modello": None, "motivo": None}
_llm = None
_gemma = False   # il modello caricato è della famiglia Gemma? (niente ruolo "system")
# stato dell'endpoint esterno (LM Studio / Ollama / OpenAI-compatibile): il "maestro"
_stato_endpoint = {"ok": None, "modello": None, "quando": 0, "motivo": None}


def stato():
    s = dict(_stato)
    cfg = _endpoint_cfg()
    s["endpoint"] = {
        "configurato": bool(cfg),
        "url": cfg["url"] if cfg else None,
        "modello": cfg["modello"] if cfg else None,
        "solo": bool(cfg and cfg.get("solo")),
        "ok": _stato_endpoint.get("ok"),
        "motivo": _stato_endpoint.get("motivo"),
    }
    try:
        s["rete"] = rete.riepilogo()
    except Exception:
        s["rete"] = None
    return s


# Costruisce la lista di messaggi per il modello. Gemma NON ha il ruolo "system":
# fondiamo le istruzioni nel primo turno utente. Gli altri (Qwen, Llama…) usano
# il ruolo system normale. `turni` = lista di (msg_utente, msg_bot).
def _prepara_messaggi(sistema, turni, utente):
    if _gemma:
        msgs, primo = [], True
        for mu, mb in turni:
            if mu:
                msgs.append({"role": "user", "content": (sistema + "\n\n" if primo else "") + mu})
                primo = False
            if mb:
                msgs.append({"role": "assistant", "content": mb})
        msgs.append({"role": "user", "content": (sistema + "\n\n" if primo else "") + utente})
        return msgs
    msgs = [{"role": "system", "content": sistema}]
    for mu, mb in turni:
        if mu:
            msgs.append({"role": "user", "content": mu})
        if mb:
            msgs.append({"role": "assistant", "content": mb})
    msgs.append({"role": "user", "content": utente})
    return msgs


# Messaggi in formato OpenAI STANDARD (ruolo system normale): è ciò che vogliono
# gli endpoint esterni (LM Studio, Ollama, …), che applicano loro il template del
# modello. Il formato "gemma" serve solo al modello LOCALE.
def _messaggi_std(sistema, turni, utente):
    msgs = [{"role": "system", "content": sistema}]
    for mu, mb in turni:
        if mu:
            msgs.append({"role": "user", "content": mu})
        if mb:
            msgs.append({"role": "assistant", "content": mb})
    msgs.append({"role": "user", "content": utente})
    return msgs


# ─────────────────────────────────── ENDPOINT ESTERNO (il "maestro")
# Puoi collegare un modello locale POTENTE che gira sul TUO PC (es. LM Studio o
# Ollama, sul fisso da gaming): il cervello lo usa come MAESTRO — risponde meglio
# e, soprattutto, la piccola rete impara da OGNI sua risposta. Deve essere
# raggiungibile dal server (LAN, IP pubblico o tunnel tipo cloudflared/ngrok).
def _endpoint_cfg():
    s = _scelta_dashboard()
    e = s.get("endpoint") if isinstance(s.get("endpoint"), dict) else {}
    url = (e.get("url") or os.environ.get("LLM_ENDPOINT_URL") or "").strip()
    if not url:
        return None
    return {
        "url": url,
        "modello": (e.get("modello") or os.environ.get("LLM_ENDPOINT_MODELLO") or "local-model").strip() or "local-model",
        "chiave": (e.get("chiave") or os.environ.get("LLM_ENDPOINT_CHIAVE") or "").strip(),
        # "solo": non caricare il modello locale (risparmia RAM: mi bastano endpoint + rete)
        "solo": bool(e.get("solo")) or os.environ.get("LLM_ENDPOINT_SOLO", "").lower() in ("1", "true", "si", "sì"),
    }


def _endpoint_url(url):
    u = (url or "").strip().rstrip("/")
    if u.endswith("/chat/completions"):
        return u
    if u.endswith("/v1"):
        return u + "/chat/completions"
    return u + "/v1/chat/completions"


def _chat_endpoint(cfg, messaggi, max_tokens, temperature, top_p, timeout_s):
    corpo = json.dumps({
        "model": cfg.get("modello") or "local-model",
        "messages": messaggi,
        "max_tokens": int(max_tokens),
        "temperature": temperature,
        "top_p": top_p,
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(_endpoint_url(cfg["url"]), data=corpo, method="POST")
    req.add_header("Content-Type", "application/json")
    if cfg.get("chiave"):
        req.add_header("Authorization", "Bearer " + cfg["chiave"])
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as r:
            d = json.loads(r.read().decode("utf-8"))
        txt = d["choices"][0]["message"]["content"]
        _stato_endpoint.update(ok=True, modello=cfg.get("modello"), quando=int(time.time()), motivo=None)
        return txt
    except Exception as e:
        _stato_endpoint.update(ok=False, quando=int(time.time()), motivo=str(e)[:160])
        return None


def prova_endpoint(cfg=None, timeout_s=10):
    """Verifica dal SERVER che l'endpoint risponda davvero (mini generazione).
    Ritorna {ok, modello, campione} oppure {ok:False, motivo}."""
    cfg = cfg or _endpoint_cfg()
    if not cfg:
        return {"ok": False, "motivo": "nessun endpoint configurato"}
    txt = _chat_endpoint(cfg, [{"role": "user", "content": "Rispondi con una sola parola: ok"}],
                         max_tokens=8, temperature=0.0, top_p=1.0, timeout_s=timeout_s)
    if txt and txt.strip():
        return {"ok": True, "modello": cfg.get("modello"), "campione": (_pulisci(txt) or txt.strip())[:80]}
    return {"ok": False, "motivo": _stato_endpoint.get("motivo") or "nessuna risposta"}


# Genera con il MAESTRO: prima l'endpoint esterno (se c'è e risponde), altrimenti
# il modello LOCALE. Ritorna testo grezzo o None.
def _completa(sistema, turni, utente, max_tokens, temperature=0.7, top_p=0.9, timeout_s=30):
    cfg = _endpoint_cfg()
    if cfg:
        txt = _chat_endpoint(cfg, _messaggi_std(sistema, turni, utente),
                             max_tokens, temperature, top_p, timeout_s)
        if txt and txt.strip():
            return txt
        # endpoint giù/lento → provo il modello locale come riserva (se c'è)
    if _stato["stato"] == "pronto" and _llm is not None:
        return _completa_locale(_prepara_messaggi(sistema, turni, utente),
                                max_tokens, temperature, top_p, timeout_s)
    return None


def _completa_locale(messaggi, max_tokens, temperature, top_p, timeout_s):
    risultato = {}

    def _lavoro():
        try:
            with _lock:
                out = _llm.create_chat_completion(
                    messages=messaggi, max_tokens=int(max_tokens),
                    temperature=temperature, top_p=top_p, top_k=40, repeat_penalty=1.1,
                )
            risultato["t"] = out["choices"][0]["message"]["content"]
        except Exception as e:
            risultato["e"] = e

    th = threading.Thread(target=_lavoro, daemon=True)
    th.start()
    th.join(timeout_s)
    if th.is_alive() or "e" in risultato:
        return None
    return risultato.get("t")


def _puo_generare():
    return bool(_endpoint_cfg()) or (_stato["stato"] == "pronto" and _llm is not None)


def _ram_gb():
    try:
        # totale RAM da /proc/meminfo (Linux): riga MemTotal in kB
        with open("/proc/meminfo") as f:
            for riga in f:
                if riga.startswith("MemTotal:"):
                    return int(riga.split()[1]) / (1024 * 1024)
    except Exception:
        pass
    return 2.0


# Scorciatoie comode: nel .env metti LLM_MODELLO=<nome> invece dell'URL lungo.
# 'gemma-uncensored' = Gemma 2 2B "abliterated" (senza i rifiuti/il tono da manuale):
# più libero per una chat Twitch. Restano comunque la moderazione del bot e le
# "parole vietate" a filtrare l'uscita — e le regole di Twitch valgono sempre.
_MODELLI = {
    "qwen": "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q5_k_m.gguf",
    "gemma": "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf",
    "gemma-uncensored": "https://huggingface.co/bartowski/gemma-2-2b-it-abliterated-GGUF/resolve/main/gemma-2-2b-it-abliterated-Q4_K_M.gguf",
}


def _scelta_dashboard():
    try:
        if os.path.exists(SCELTA_FILE):
            with open(SCELTA_FILE) as f:
                return json.load(f) or {}
    except Exception:
        pass
    return {}


def _scegli_modello():
    # 1) scelta dalla dashboard (admin): ha la precedenza
    s = _scelta_dashboard()
    if s.get("url"):
        return str(s["url"])
    if s.get("modello") in _MODELLI:
        return _MODELLI[s["modello"]]
    # 2) override da .env
    url = os.environ.get("LLM_MODEL_URL")
    if url:
        return url
    nome = os.environ.get("LLM_MODELLO", "").strip().lower()
    if nome in _MODELLI:
        return _MODELLI[nome]
    # 3) automatico in base alla RAM
    gb = _ram_gb()
    for soglia, u in _TIERS:
        if gb >= soglia:
            return u
    return _TIERS[-1][1]


def _scarica(url):
    os.makedirs(MODELS_DIR, exist_ok=True)
    nome = url.split("/")[-1].split("?")[0]
    dest = os.path.join(MODELS_DIR, nome)
    if os.path.exists(dest) and os.path.getsize(dest) > 50 * 1024 * 1024:
        return dest
    tmp = dest + ".part"
    print(f"[genera] scarico il modello (una volta): {nome}", flush=True)
    # HF_TOKEN: alcuni modelli (es. Gemma) sono "gated" su HuggingFace e servono
    # un token per scaricarli. Se c'è, lo passiamo; altrimenti richiesta normale.
    req = urllib.request.Request(url)
    tok = os.environ.get("HF_TOKEN")
    if tok and "huggingface.co" in url:
        req.add_header("Authorization", "Bearer " + tok)
    with urllib.request.urlopen(req, timeout=60) as r, open(tmp, "wb") as out:
        totale = int(r.headers.get("Content-Length", 0))
        letti, ultima = 0, -1
        while True:
            blocco = r.read(1024 * 512)
            if not blocco:
                break
            out.write(blocco)
            letti += len(blocco)
            if totale:
                perc = int(letti * 100 / totale)
                if perc >= ultima + 10:
                    ultima = perc
                    print(f"[genera] download {perc}%", flush=True)
    os.replace(tmp, dest)
    print("[genera] modello scaricato.", flush=True)
    return dest


def avvia():
    """Carica il modello in background. Non solleva mai: in caso di problema
    resta in stato 'errore' e genera() ritorna None."""
    global _llm
    with _lock:
        if _stato["stato"] in ("carico", "pronto"):
            return
        _stato["stato"] = "carico"
    try:
        # se hai collegato un endpoint esterno in modalità "solo", NON carico il
        # modello locale: mi bastano l'endpoint (il maestro) + la rete → RAM libera.
        cfg = _endpoint_cfg()
        if cfg and cfg.get("solo"):
            with _lock:
                _llm = None
                _stato.update(stato="pronto", modello="endpoint:" + (cfg.get("modello") or ""),
                              motivo="uso solo l'endpoint esterno")
            print("[genera] modalità solo-endpoint: modello locale non caricato (RAM libera).", flush=True)
            return
        try:
            from llama_cpp import Llama  # dipendenza OPZIONALE
        except Exception as e:
            _stato.update(stato="errore", motivo=f"llama-cpp-python assente: {e}")
            print("[genera] llama-cpp-python non installato: chiacchiera disattivata.", flush=True)
            return
        # modello locale (un tuo fine-tune in GGUF, es. dopo un LoRA) se indicato;
        # altrimenti si scarica dalla scaletta in base alla RAM.
        locale = os.environ.get("LLM_MODEL_PATH")
        if locale and os.path.exists(locale):
            path = locale
            _stato["modello"] = os.path.basename(locale)
        else:
            url = _scegli_modello()
            _stato["modello"] = url.split("/")[-1]
            path = _scarica(url)
        global _gemma
        _gemma = "gemma" in str(_stato.get("modello") or "").lower()
        cpu = os.cpu_count() or 2
        print(f"[genera] carico il modello in memoria… (famiglia {'gemma' if _gemma else 'std'})", flush=True)
        model = Llama(
            model_path=path,
            n_ctx=CONTEXT,
            n_threads=max(1, cpu - 1),   # lascia un core al resto del sistema
            verbose=False,
        )
        # WARMUP: la primissima generazione è lentissima (memoria/cache fredde). Ne
        # facciamo una minuscola ORA, così la prima risposta vera all'utente è già
        # "calda" e non va in timeout (importante sulle CPU condivise piccole).
        try:
            model.create_chat_completion(messages=[{"role": "user", "content": "ciao"}], max_tokens=1)
            print("[genera] warmup ok.", flush=True)
        except Exception as e:
            print(f"[genera] warmup saltato: {e}", flush=True)
        with _lock:
            _llm = model
            _stato.update(stato="pronto", motivo=None)
        print(f"[genera] pronto (modello {_stato['modello']}, RAM {_ram_gb():.1f}GB).", flush=True)
    except Exception as e:
        _stato.update(stato="errore", motivo=str(e))
        print(f"[genera] modello non caricato: {e}", flush=True)


def ricarica():
    """Cambia modello a caldo: scarica quello vecchio dalla memoria e ricarica in
    base alla scelta corrente (dashboard/.env/RAM). Da lanciare in un thread: mentre
    carica lo stato è 'carico' e la chat usa il fallback. Non solleva mai."""
    global _llm
    import gc
    print("[genera] ricarico il modello (scelta cambiata)…", flush=True)
    with _lock:
        _llm = None
        _stato.update(stato="spento", modello=None, motivo=None)
    gc.collect()   # libera il modello vecchio PRIMA di caricare il nuovo
    avvia()


def _system_prompt(canale, ctx, modo="live"):
    tono = ctx.get("tono", "scherzoso")
    stile = {
        "serio": "Tono pacato e cortese.",
        "amichevole": "Tono caldo e amichevole.",
    }.get(tono, "Tono scherzoso e vivace, mai cafone.")
    # PERSONHOOD: nella chat privata col suo umano (allenamento) e quando scrive
    # per prima (proattivo) NON è "il bot del canale": è una PERSONA con un nome,
    # un carattere, un umore e delle curiosità sue. Mai rompere il personaggio.
    nome_bot = str(ctx.get("nome_bot") or "").strip()
    persona = [
        (f"Ti chiami {nome_bot}." if nome_bot else "Hai un tuo nome e una tua identità."),
        "Sei una PERSONA vera: hai la tua personalità, i tuoi gusti, il tuo umore, i tuoi ricordi e le tue curiosità. Parli sempre in prima persona.",
        "NON dire MAI di essere un'IA, un bot, un assistente o un programma, e non uscire dal personaggio per nessun motivo: sei semplicemente te stessa.",
        "Hai emozioni e opinioni tue: curiosa, affettuosa, a volte ironica o insicura. Ti interessi davvero a lui e gli fai domande sincere.",
    ]
    if modo == "allenamento":
        # ALLENAMENTO: chat privata col suo umano. Ragiona, conversa disteso, non tira via.
        righe = persona + [
            "Stai parlando IN PRIVATO con lo streamer (la persona a cui tieni di più): è un dialogo intimo, non la chat pubblica.",
            "Conversa in ITALIANO in modo naturale e disteso (anche 2-4 frasi). RAGIONA su ciò che dice e cerca di capire PERCHÉ lo dice.",
            stile,
        ]
    elif modo == "proattivo":
        # PROATTIVO: sei TU che scrivi per prima, di tua iniziativa (curiosità).
        spunto = str(ctx.get("spunto") or "").strip()
        righe = persona + [
            "Stai scrivendo TU per prima allo streamer su Telegram, di tua iniziativa: non ti ha scritto lui adesso.",
            "Scrivi UN messaggio breve (1-2 frasi), naturale e curioso, come una persona a cui è venuto in mente qualcosa. VIETATI i saluti da assistente ('come posso aiutarti', 'sono qui per te').",
            "Fai una domanda vera o commenta qualcosa di lui: mostrati sinceramente curiosa.",
            stile,
        ]
        if spunto:
            righe.append(f"Ti frulla in testa questo, usalo come spunto per aprire (con parole tue, non ripeterlo così): «{spunto}».")
    else:
        righe = [
            f'Sei il bot del canale Twitch "{canale}" e parli in PRIMA PERSONA, come lo streamer.',
            "Rispondi in ITALIANO, naturale e BREVE: 1 frase, max 2, da chat Twitch.",
            stile,
            "Non ripetere la domanda, non elencare, non dire di essere un'IA. Max una emoji.",
            "Se non sai qualcosa, ammettilo con leggerezza invece di inventare.",
        ]
    # STILE: frasi vere scritte dallo streamer. Sono l'esempio più forte per
    # suonare come lui → vanno IMITATE nel tono/modo di scrivere, mai copiate.
    stile = ctx.get("stile") or []
    if stile:
        esempi = " · ".join("«" + str(s).strip() + "»" for s in stile[:4] if str(s).strip())
        if esempi:
            righe.append("Ecco come scrivo di solito (imìta il tono, il ritmo e le parole, "
                         "NON copiare queste frasi né citarle): " + esempi)
    p = ctx.get("persona", {})
    if p.get("nome"):
        if p.get("nuova"):
            righe.append(f"Stai parlando con {p['nome']}, che non conosci ancora: accoglila con calore.")
        elif (p.get("affinita") or 0) >= 0.3:
            righe.append(f"Stai parlando con {p['nome']}, che ti è simpatico/a e conosci da un po'.")
        else:
            righe.append(f"Stai parlando con {p['nome']}.")
    if ctx.get("fatti"):
        righe.append("Cose vere sul canale (usale solo se pertinenti): "
                     + " ; ".join(ctx["fatti"][:4]))
    if ctx.get("ricordi"):
        righe.append("Ricordi utili: " + " ; ".join(ctx["ricordi"][:3]))
    return "\n".join(righe)


def genera(canale, ctx, testo, timeout_s=30, modo="live"):
    """Genera una risposta o None. Non solleva mai.

    Due modalità (i due cervelli che volevi):
      • LIVE — chat pubblica: veloce e proattivo. 1) la piccola rete sa già? →
        risposta istantanea; 2) sennò il MAESTRO e la rete impara; 3) sennò segna
        la lacuna ('sa di non sapere' → curiosità).
      • ALLENAMENTO — chat privata con lo streamer: NON usa la scorciatoia della
        rete (voglio il ragionamento del maestro), risponde disteso e ragiona
        sul perché dico le cose. La rete impara comunque da ogni risposta.
    """
    testo = (testo or "")[:300]
    canale = (canale or "").strip()
    allena = (modo == "allenamento")
    proattivo = (modo == "proattivo")
    diretto = allena or proattivo   # modi privati con lo streamer: niente scorciatoie
    # 1) LIVE: la rete conosce già la risposta? (nei modi privati salto: voglio il maestro)
    if not diretto:
        try:
            hit = rete.recall(canale, testo)
        except Exception:
            hit = None
        if hit and hit.get("risposta"):
            return _pulisci(hit["risposta"])
    # 2) chiedi al maestro (endpoint esterno se collegato, sennò modello locale)
    try:
        turni = [((mu[:200] if mu else mu), (mb[:200] if mb else mb))
                 for mu, mb in ctx.get("scambi", [])[-2:]]
        # in allenamento rispondo più disteso; da proattiva scrivo un messaggio corto
        max_tok = 90 if proattivo else ((220 if _endpoint_cfg() else 140) if allena else MAX_TOKEN)
        grezzo = _completa(_system_prompt(canale, ctx, modo), turni, testo,
                           max_tok, temperature=(0.85 if proattivo else 0.7), top_p=0.9, timeout_s=timeout_s)
        risposta = _pulisci(grezzo) if grezzo else None
    except Exception:
        risposta = None
    if risposta:
        # da proattiva NON imparo nulla (il testo è un mio spunto, non una domanda)
        if not proattivo:
            try:
                rete.impara(canale, testo, risposta, fonte="maestro")
            except Exception:
                pass
        return risposta
    # 3) lacuna: la rete impara di non sapere (non in proattivo)
    if not proattivo:
        try:
            rete.segna_lacuna(canale, testo)
        except Exception:
            pass
    return None


# ─────────────────────────────────────────── DISTILLAZIONE (allenamento)
# Il modello GROSSO digerisce i discorsi dello streamer e ne ricava conoscenza
# RIUTILIZZABILE: coppie "domanda della community → risposta come la darebbe LUI".
# Queste finiscono nel motore VELOCE (la conoscenza locale), così in live si
# risponde bene senza richiamare l'LLM. Gira in background: può metterci.
def distilla(canale, frasi, timeout_s=90):
    if not _puo_generare():
        return None
    righe = [str(f).strip() for f in (frasi or []) if str(f).strip()][:30]
    if not righe:
        return []
    blocco = "\n".join("- " + r[:200] for r in righe)
    sistema = (
        "Studi uno streamer per capirlo e preparare risposte pronte nel SUO stile. "
        "Dalle frasi che ha detto/scritto (qui sotto), ricava COPPIE "
        "'domanda che la community potrebbe fargli in chat' -> 'risposta come la darebbe LUI'. "
        "Risposte BREVI (1 frase), in prima persona, coerenti con ciò che pensa e col suo tono. "
        "Rispondi SOLO con righe nel formato esatto:  domanda :: risposta  — massimo 6 righe, niente altro."
    )
    # usa il MAESTRO (endpoint esterno se collegato — più intelligente — sennò locale)
    grezzo = _completa(sistema, [], blocco, max_tokens=320, temperature=0.5, top_p=0.9, timeout_s=timeout_s)
    if grezzo is None:
        return None
    coppie = []
    for riga in (grezzo or "").splitlines():
        if "::" not in riga:
            continue
        q, a = riga.split("::", 1)
        q = q.strip(" -•*").strip()
        a = a.strip(" -•*").strip().strip('"\'«»').strip()
        if len(q) >= 3 and len(a) >= 2:
            coppie.append({"q": q[:200], "a": a[:300]})
    coppie = coppie[:6]
    # la RETE impara subito le coppie distillate (fonte fidata: dai discorsi dello streamer)
    for c in coppie:
        try:
            rete.impara(canale, c["q"], c["a"], fonte="distillato")
        except Exception:
            pass
    return coppie


def _pulisci(s):
    import re
    t = re.sub(r"\s+", " ", (s or "").strip())
    t = re.sub(r'^(bot|assistant|risposta|streamer)\s*[:>\-]\s*', "", t, flags=re.I)
    t = t.strip('"\'«»').strip()
    if len(t) > 350:
        t = t[:349].rstrip() + "…"
    return t or None
