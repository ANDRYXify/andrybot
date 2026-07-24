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


def stato():
    return dict(_stato)


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


def _system_prompt(canale, ctx):
    tono = ctx.get("tono", "scherzoso")
    stile = {
        "serio": "Tono pacato e cortese.",
        "amichevole": "Tono caldo e amichevole.",
    }.get(tono, "Tono scherzoso e vivace, mai cafone.")
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


def genera(canale, ctx, testo, timeout_s=30):
    """Genera una risposta o None. Non solleva mai."""
    if _stato["stato"] != "pronto" or _llm is None:
        return None
    try:
        turni = [((mu[:200] if mu else mu), (mb[:200] if mb else mb))
                 for mu, mb in ctx.get("scambi", [])[-2:]]
        messaggi = _prepara_messaggi(_system_prompt(canale, ctx), turni, testo[:300])

        risultato = {}
        def _lavoro():
            try:
                with _lock:
                    out = _llm.create_chat_completion(
                        messages=messaggi, max_tokens=MAX_TOKEN,
                        temperature=0.7, top_p=0.9, top_k=40, repeat_penalty=1.1,
                    )
                risultato["t"] = out["choices"][0]["message"]["content"]
            except Exception as e:
                risultato["e"] = e

        th = threading.Thread(target=_lavoro, daemon=True)
        th.start()
        th.join(timeout_s)
        if th.is_alive():
            return None  # troppo lento: meglio niente
        if "e" in risultato:
            return None
        return _pulisci(risultato.get("t"))
    except Exception:
        return None


# ─────────────────────────────────────────── DISTILLAZIONE (allenamento)
# Il modello GROSSO digerisce i discorsi dello streamer e ne ricava conoscenza
# RIUTILIZZABILE: coppie "domanda della community → risposta come la darebbe LUI".
# Queste finiscono nel motore VELOCE (la conoscenza locale), così in live si
# risponde bene senza richiamare l'LLM. Gira in background: può metterci.
def distilla(canale, frasi, timeout_s=90):
    if _stato["stato"] != "pronto" or _llm is None:
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
    messaggi = _prepara_messaggi(sistema, [], blocco)
    risultato = {}

    def _lavoro():
        try:
            with _lock:
                out = _llm.create_chat_completion(
                    messages=messaggi, max_tokens=320,
                    temperature=0.5, top_p=0.9, repeat_penalty=1.1,
                )
            risultato["t"] = out["choices"][0]["message"]["content"]
        except Exception as e:
            risultato["e"] = e

    th = threading.Thread(target=_lavoro, daemon=True)
    th.start()
    th.join(timeout_s)
    if th.is_alive() or "e" in risultato:
        return None
    testo = risultato.get("t") or ""
    coppie = []
    for riga in testo.splitlines():
        if "::" not in riga:
            continue
        q, a = riga.split("::", 1)
        q = q.strip(" -•*").strip()
        a = a.strip(" -•*").strip().strip('"\'«»').strip()
        if len(q) >= 3 and len(a) >= 2:
            coppie.append({"q": q[:200], "a": a[:300]})
    return coppie[:6]


def _pulisci(s):
    import re
    t = re.sub(r"\s+", " ", (s or "").strip())
    t = re.sub(r'^(bot|assistant|risposta|streamer)\s*[:>\-]\s*', "", t, flags=re.I)
    t = t.strip('"\'«»').strip()
    if len(t) > 350:
        t = t[:349].rstrip() + "…"
    return t or None
