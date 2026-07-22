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

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
MODELS_DIR = os.path.join(DATA_DIR, "models")

# Scaletta modelli per fascia di RAM (Qwen2.5 Instruct, GGUF Q4). Più RAM, più
# grande il modello, migliore la chiacchiera. Override con LLM_MODEL_URL.
_TIERS = [
    (6.0, "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"),
    (3.0, "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"),
    (0.0, "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"),
]

MAX_TOKEN = int(os.environ.get("LLM_MAX_TOKEN", "80"))
CONTEXT = int(os.environ.get("LLM_CONTEXT", "1024"))

_lock = threading.Lock()
_stato = {"stato": "spento", "modello": None, "motivo": None}
_llm = None


def stato():
    return dict(_stato)


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


def _scegli_modello():
    url = os.environ.get("LLM_MODEL_URL")
    if url:
        return url
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
    with urllib.request.urlopen(url, timeout=60) as r, open(tmp, "wb") as out:
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
        url = _scegli_modello()
        _stato["modello"] = url.split("/")[-1]
        path = _scarica(url)
        cpu = os.cpu_count() or 2
        print("[genera] carico il modello in memoria…", flush=True)
        model = Llama(
            model_path=path,
            n_ctx=CONTEXT,
            n_threads=max(1, cpu - 1),   # lascia un core al resto del sistema
            verbose=False,
        )
        with _lock:
            _llm = model
            _stato.update(stato="pronto", motivo=None)
        print(f"[genera] pronto (modello {_stato['modello']}, RAM {_ram_gb():.1f}GB).", flush=True)
    except Exception as e:
        _stato.update(stato="errore", motivo=str(e))
        print(f"[genera] modello non caricato: {e}", flush=True)


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


def genera(canale, ctx, testo, timeout_s=25):
    """Genera una risposta o None. Non solleva mai."""
    if _stato["stato"] != "pronto" or _llm is None:
        return None
    try:
        messaggi = [{"role": "system", "content": _system_prompt(canale, ctx)}]
        for m_utente, m_bot in ctx.get("scambi", [])[-3:]:
            if m_utente:
                messaggi.append({"role": "user", "content": m_utente[:200]})
            if m_bot:
                messaggi.append({"role": "assistant", "content": m_bot[:200]})
        messaggi.append({"role": "user", "content": testo[:300]})

        risultato = {}
        def _lavoro():
            try:
                with _lock:
                    out = _llm.create_chat_completion(
                        messages=messaggi, max_tokens=MAX_TOKEN, temperature=0.7, top_p=0.9,
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


def _pulisci(s):
    import re
    t = re.sub(r"\s+", " ", (s or "").strip())
    t = re.sub(r'^(bot|assistant|risposta|streamer)\s*[:>\-]\s*', "", t, flags=re.I)
    t = t.strip('"\'«»').strip()
    if len(t) > 350:
        t = t[:349].rstrip() + "…"
    return t or None
