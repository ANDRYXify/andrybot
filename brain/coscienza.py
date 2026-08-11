"""
coscienza.py — La "coscienza progressiva" del bot.

È la parte che rende il bot una PERSONA che cresce: ricorda le persone, i fatti,
le conversazioni, ha un umore e dei tratti di personalità che evolvono nel tempo.
Tutto persistente su SQLite (nel volume data/, sopravvive ai riavvii) e SENZA
dipendenze esterne: la coscienza funziona sempre, anche quando il modello
linguistico non è disponibile.

Non è "coscienza" in senso filosofico: è memoria + personalità + apprendimento
che si accumulano e si consolidano, così il bot diventa via via più personale
e coerente. Il modello linguistico (genera.py) ci mette solo le parole; la
continuità e la crescita vengono da qui.
"""
import os
import re
import json
import time
import sqlite3
import threading

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
DB_PATH = os.path.join(DATA_DIR, "coscienza.db")

_lock = threading.RLock()


def _now():
    return int(time.time())


def _norm(s):
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _lista_json(v, maxn, maxlen, minuscolo=False):
    """Normalizza un valore (lista, stringa JSON o stringa) in una lista di
    stringhe pulite, troncata a maxn elementi e maxlen caratteri l'una."""
    if isinstance(v, str):
        try:
            v = json.loads(v)
        except Exception:
            v = [v]
    if not isinstance(v, list):
        v = []
    out = []
    for x in v:
        s = re.sub(r"\s+", " ", str(x)).strip()[:maxlen]
        if minuscolo:
            s = s.lower()
        if s:
            out.append(s)
        if len(out) >= maxn:
            break
    return out


def _riga_modulo(r):
    """Riga SQLite → dict, con i campi JSON (segnali/esempi/chiavi) deserializzati."""
    d = dict(r)
    for k in ("segnali", "esempi", "chiavi"):
        try:
            d[k] = json.loads(d.get(k) or "[]")
        except Exception:
            d[k] = []
        if not isinstance(d[k], list):
            d[k] = []
    return d


# Lessico emozioni (le 6 base di Ekman). Serve a capire QUALE emozione porta un
# messaggio, così da agganciare il modulo giusto del manuale. Leggero e senza
# dipendenze: parole/frammenti + emoji. Non è una scienza esatta, è un aggancio.
_EMO_LEX = {
    "gioia": ["felic", "content", "gioia", "evviva", "fantastic", "bellissim", "adoro",
              "che bello", "grande", "hype", "gasat", "carich", "top", "meravigli",
              "😄", "😁", "😍", "🥳", "🔥", "❤", "😂"],
    "tristezza": ["trist", "giù", "depress", "sconfort", "piang", "male", "da solo", "sola",
                  "soffr", "malincon", "vuoto", "delus", "sfigat", "sfortun", "😢", "😭", "😞", "💔", "🥺"],
    "rabbia": ["arrabbi", "incazz", "rabbia", "furios", "odio", "basta", "nervos", "frustrat",
               "tilt", "che palle", "vaffa", "rosica", "assurdo che", "😡", "🤬", "😠"],
    "paura": ["paura", "spavent", "ansia", "ansios", "terror", "preoccup", "angosc", "tremo",
              "panico", "ho i nervi", "😨", "😰", "😱"],
    "sorpresa": ["wow", "incredibile", "non ci credo", "assurdo", "ma dai", "shock", "sorpres",
                 "oddio", "cosa??", "davvero??", "😮", "😲", "🤯"],
    "disgusto": ["disgust", "schifo", "vomit", "nausea", "orribile", "ributtante", "raccapricc",
                 "che schifo", "🤮", "🤢"],
}


_TAVOLA_ACCENTI = str.maketrans("àáâãäèéêëìíîïòóôõöùúûü", "aaaaaeeeeiiiiooooouuuu")


def _fold(s):
    """minuscolo, spazi compattati e ACCENTI RIMOSSI: gli utenti scrivono 'giu'
    per 'giù', 'perche' per 'perché'. Così il match non salta per un accento."""
    return _norm(s).translate(_TAVOLA_ACCENTI)


def rileva_emozione(testo):
    """Rileva le emozioni presenti in un testo. Ritorna {emozione: conteggio} per
    le emozioni trovate (vuoto se nessuna). Aggancio lessicale robusto: senza accenti,
    parole/stem su confine di parola (niente falsi positivi tipo 'giu' in 'giusto'),
    frasi ed emoji per sottostringa. Non è un giudizio, è un aggancio."""
    t = _fold(testo)
    if not t:
        return {}
    parole = set(re.findall(r"[a-z0-9]{2,}", t))
    punteggi = {}
    for emo, voci in _EMO_LEX.items():
        s = 0
        for v in voci:
            vf = _fold(v)
            if not vf:
                # emoji/simbolo (gli accenti non c'entrano): sottostringa sul testo
                if v in testo:
                    s += 1
                continue
            if " " in vf:
                # frase multi-parola (es. "da solo", "che palle"): sottostringa
                if vf in t:
                    s += 1
            else:
                # parola o stem: confine di parola — esatta, o prefisso se lo stem è
                # abbastanza lungo (>=4) da non generare falsi positivi corti.
                for w in parole:
                    if w == vf or (len(vf) >= 4 and w.startswith(vf)):
                        s += 1
                        break
        if s:
            punteggi[emo] = s
    return punteggi


# Reazione dell'utente al turno PRECEDENTE del bot: serve a capire se un modulo
# ha funzionato. Segnali chiari, per non introdurre rumore (i casi ambigui → 0).
_REA_POS = ["grazie", "meglio", "mi hai aiut", "gentile", "sei un grande", "sei grande",
            "hai ragione", "ti voglio bene", "ahah", "haha", "che carin", "🙏", "❤", "🥰", "😊", "💜"]
_REA_NEG = ["non hai capito", "che c'entra", "che centra", "inutile", "smettila", "sta zitt",
            "non mi aiut", "lasciami", "non serve", "peggio", "che due palle", "🙄"]


def _reazione(testo):
    """+1 se l'utente reagisce bene, -1 se male, 0 se neutro/ambiguo (nessun segnale)."""
    t = _fold(testo)
    if not t:
        return 0
    pos = sum(1 for p in _REA_POS if _fold(p) in t)
    neg = sum(1 for n in _REA_NEG if _fold(n) in t)
    if neg > pos:
        return -1
    if pos > neg:
        return 1
    return 0


# --------------------------------------------------- APPRENDIMENTO AUTONOMO (lacune)
# Parole troppo comuni per essere "argomento": non fanno chiave né lacuna.
_STOP = set(_fold(w) for w in (
    "che chi cosa come dove quando perche pero anzi cioe quindi allora mentre "
    "sono sei siamo siete essere stato stata avere abbiamo hanno aveva avevo "
    "questo quello quella queste questi quelli molto poco tanto proprio davvero "
    "adesso ora oggi ieri domani sempre mai ancora gia poi anche pure solo "
    "non piu meno bene male tutto niente nulla qualcosa qualcuno ognuno "
    "per con senza sopra sotto dentro fuori tra fra dopo prima verso "
    "mio mia tuo tua suo sua nostro vostro loro miei tuoi suoi "
    "lui lei noi voi essi loro gli le lo la il un uno una dei delle degli "
    " mi ti ci vi si ne se ma se od ed di da in su a e o "
    "fare faccio fai fatto detto dico dice dici vedo vedi visto "
    "grazie ciao ehi raga ragazzi bot lia"
).split())

# Segnali per dedurre il DOMINIO di una lacuna dal testo (match su parola/stem).
_LEX_DOMINIO = {
    "diretta": ["raid", "sub", "resub", "abbonat", "dona", "bits", "follow", "seguit", "live", "diretta", "stream", "prime"],
    "gaming": ["gioco", "giocare", "boss", "livello", "morto", "morte", "vinto", "vittoria", "perso", "rage", "loot", "nemico", "partita", "match", "clutch", "spawn"],
    "moderazione": ["troll", "spam", "insult", "hater", "offend", "flame", "spoiler", "bannat", "ban", "timeout", "rissa", "litig"],
    "community": ["community", "veteran", "regular", "insider", "meme interno", "goal", "obiettiv", "clan", "gilda", "server"],
    "umorismo": ["battuta", "scherz", "meme", "ridere", "ironia", "sarcasm", "lol", "ahah", "divertent"],
    "emozioni": ["felice", "content", "triste", "piang", "arrabbi", "furia", "paura", "ansia", "sorpres", "schifo", "disgust", "emozion"],
    "sociale": ["nuovo", "benvenut", "presentar", "conoscer", "complimenti", "amico", "amica", "notizia", "compleann"],
}


def _chiavi_da_testo(testo, n=4):
    """Le n parole-argomento di un messaggio: normalizzate, lunghe >=4, non stopword,
    in ordine d'apparizione (deduplicate). Sono l'identità di una lacuna e la base
    per cercarla online. Ritorna una lista (eventualmente vuota)."""
    out, viste = [], set()
    for w in re.findall(r"[a-z0-9]{4,}", _fold(testo)):
        if w in _STOP or w in viste:
            continue
        viste.add(w)
        out.append(w)
        if len(out) >= n:
            break
    return out


def _dominio_da_testo(testo):
    """Deduce il dominio di conoscenza più probabile di un messaggio (default
    'conversazione'). Aggancio lessicale: vince il dominio con più segnali."""
    t = _fold(testo)
    if not t:
        return "conversazione"
    parole = set(re.findall(r"[a-z0-9]{3,}", t))
    best, best_n = "conversazione", 0
    for dom, voci in _LEX_DOMINIO.items():
        n = 0
        for v in voci:
            vf = _fold(v)
            if " " in vf:
                if vf in t:
                    n += 1
            else:
                for w in parole:
                    if w == vf or (len(vf) >= 4 and w.startswith(vf)):
                        n += 1
                        break
        if n > best_n:
            best, best_n = dom, n
    return best


class Coscienza:
    def __init__(self, db_path=DB_PATH):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self._schema()
        self._assicura_stato()
        # moduli usati nell'ultima risposta a (canale, login): serve a giudicare
        # se hanno funzionato quando l'utente ribatte. In memoria (best-effort).
        self._moduli_pendenti = {}

    # ---------------------------------------------------------------- schema
    def _schema(self):
        with _lock:
            self.db.executescript(
                """
                CREATE TABLE IF NOT EXISTS persone (
                    canale TEXT, login TEXT, nome TEXT,
                    conosciuta_da INTEGER, vista_ultima INTEGER,
                    interazioni INTEGER DEFAULT 0, affinita REAL DEFAULT 0,
                    note TEXT DEFAULT '',
                    PRIMARY KEY (canale, login)
                );
                CREATE TABLE IF NOT EXISTS ricordi (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canale TEXT, login TEXT, testo TEXT,
                    importanza REAL DEFAULT 1, ts INTEGER
                );
                CREATE TABLE IF NOT EXISTS fatti (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canale TEXT, testo TEXT, fonte TEXT, ts INTEGER
                );
                CREATE TABLE IF NOT EXISTS scambi (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canale TEXT, login TEXT, messaggio TEXT, risposta TEXT, ts INTEGER
                );
                CREATE TABLE IF NOT EXISTS stato (
                    canale TEXT PRIMARY KEY,
                    umore REAL DEFAULT 0,        -- -1 (giù) .. +1 (su)
                    energia REAL DEFAULT 0.5,    -- 0 .. 1
                    socievolezza REAL DEFAULT 0.5,
                    nati_il INTEGER, aggiornato INTEGER
                );
                -- MODULI: il "manuale di come funziona un essere umano". GLOBALE
                -- (una sola raccolta per Lia, condivisa da tutti i canali: la
                -- psicologia umana non cambia da streamer a streamer). Ogni modulo
                -- è una lezione operativa e azionabile su una situazione umana.
                CREATE TABLE IF NOT EXISTS moduli (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dominio TEXT DEFAULT 'emozioni',
                    nome TEXT NOT NULL,                 -- il nome della lacuna (univoco)
                    situazione TEXT DEFAULT '',
                    segnali TEXT DEFAULT '[]',          -- JSON: segnali da riconoscere
                    come_rispondere TEXT DEFAULT '',
                    cosa_evitare TEXT DEFAULT '',
                    esempi TEXT DEFAULT '[]',           -- JSON: 0-2 mini esempi
                    chiavi TEXT DEFAULT '[]',           -- JSON: parole normalizzate per il match
                    fonte TEXT DEFAULT '',
                    qualita REAL DEFAULT 0.5,
                    stato TEXT DEFAULT 'bozza',         -- bozza | attivo | sospeso
                    usi INTEGER DEFAULT 0,
                    successi INTEGER DEFAULT 0,
                    fallimenti INTEGER DEFAULT 0,
                    creato INTEGER, aggiornato INTEGER
                );
                CREATE INDEX IF NOT EXISTS i_ricordi ON ricordi(canale, login, ts);
                CREATE INDEX IF NOT EXISTS i_scambi ON scambi(canale, login, ts);
                CREATE UNIQUE INDEX IF NOT EXISTS i_moduli_nome ON moduli(nome);
                CREATE INDEX IF NOT EXISTS i_moduli_stato ON moduli(dominio, stato);
                -- LACUNE: situazioni della chat REALE che nessun modulo copriva.
                -- Quando una situazione RICORRE, Lia la studia da sola (apprendimento
                -- autonomo, oltre il catalogo dei semi). GLOBALE come i moduli.
                CREATE TABLE IF NOT EXISTS lacune (
                    chiave TEXT PRIMARY KEY,             -- insieme di parole normalizzato (identità)
                    dominio TEXT DEFAULT 'conversazione',
                    esempio TEXT DEFAULT '',             -- un messaggio d'esempio (contesto)
                    chiavi TEXT DEFAULT '[]',            -- JSON delle parole chiave
                    visto INTEGER DEFAULT 0,             -- quante volte è ricorsa
                    stato TEXT DEFAULT 'aperta',         -- aperta | studiata | ignora
                    creato INTEGER, aggiornato INTEGER
                );
                CREATE INDEX IF NOT EXISTS i_lacune_stato ON lacune(stato, visto);
                """
            )
            self.db.commit()

    def _assicura_stato(self):
        pass  # lo stato per canale si crea alla prima interazione

    def _stato(self, canale):
        with _lock:
            r = self.db.execute("SELECT * FROM stato WHERE canale=?", (canale,)).fetchone()
            if r:
                return dict(r)
            self.db.execute(
                "INSERT INTO stato(canale, umore, energia, socievolezza, nati_il, aggiornato) "
                "VALUES(?,?,?,?,?,?)",
                (canale, 0.0, 0.5, 0.5, _now(), _now()),
            )
            self.db.commit()
            return {"canale": canale, "umore": 0.0, "energia": 0.5,
                    "socievolezza": 0.5, "nati_il": _now(), "aggiornato": _now()}

    # ---------------------------------------------------------- persone/memoria
    def incontra(self, canale, login, nome):
        with _lock:
            r = self.db.execute(
                "SELECT interazioni, affinita FROM persone WHERE canale=? AND login=?",
                (canale, login),
            ).fetchone()
            if r:
                self.db.execute(
                    "UPDATE persone SET nome=?, vista_ultima=?, interazioni=interazioni+1, "
                    "affinita=MIN(1.0, affinita+0.02) WHERE canale=? AND login=?",
                    (nome, _now(), canale, login),
                )
            else:
                self.db.execute(
                    "INSERT INTO persone(canale, login, nome, conosciuta_da, vista_ultima, "
                    "interazioni, affinita) VALUES(?,?,?,?,?,1,0.05)",
                    (canale, login, nome, _now(), _now()),
                )
            self.db.commit()

    def persona(self, canale, login):
        with _lock:
            r = self.db.execute(
                "SELECT * FROM persone WHERE canale=? AND login=?", (canale, login)
            ).fetchone()
            return dict(r) if r else None

    def registra_scambio(self, canale, login, messaggio, risposta):
        with _lock:
            self.db.execute(
                "INSERT INTO scambi(canale, login, messaggio, risposta, ts) VALUES(?,?,?,?,?)",
                (canale, login, (messaggio or "")[:400], (risposta or "")[:400], _now()),
            )
            self.db.commit()

    def impara_fatto(self, canale, testo, fonte="chat"):
        t = _norm(testo)
        if len(t) < 8:
            return
        with _lock:
            gia = self.db.execute(
                "SELECT 1 FROM fatti WHERE canale=? AND lower(testo)=? LIMIT 1", (canale, t)
            ).fetchone()
            if gia:
                return
            self.db.execute(
                "INSERT INTO fatti(canale, testo, fonte, ts) VALUES(?,?,?,?)",
                (canale, testo[:300], fonte, _now()),
            )
            self.db.commit()

    # ------------------------------------------------------------- retrieval
    def contesto(self, canale, login, messaggio, tono="scherzoso"):
        """Costruisce il 'contesto mentale' per rispondere a questo messaggio:
        chi è la persona, cosa ricordo di lei, fatti pertinenti, ultimi scambi,
        umore attuale. È ciò che rende la risposta personale e coerente."""
        with _lock:
            st = self._stato(canale)
            pers = self.persona(canale, login) or {}
            ricordi = self.db.execute(
                "SELECT testo FROM ricordi WHERE canale=? AND (login=? OR login='') "
                "ORDER BY importanza DESC, ts DESC LIMIT 5",
                (canale, login),
            ).fetchall()
            scambi = self.db.execute(
                "SELECT messaggio, risposta FROM scambi WHERE canale=? AND login=? "
                "ORDER BY ts DESC LIMIT 4",
                (canale, login),
            ).fetchall()
            fatti = self._fatti_pertinenti(canale, messaggio, limite=5)
        return {
            "umore": st["umore"], "energia": st["energia"], "socievolezza": st["socievolezza"],
            "eta_giorni": max(0, (_now() - int(st["nati_il"])) // 86400),
            "persona": {
                "nome": pers.get("nome"), "affinita": pers.get("affinita", 0),
                "interazioni": pers.get("interazioni", 0), "note": pers.get("note", ""),
                "nuova": (pers.get("interazioni", 0) or 0) <= 1,
            },
            "ricordi": [r["testo"] for r in ricordi],
            "scambi": [(s["messaggio"], s["risposta"]) for s in reversed(scambi)],
            "fatti": fatti,
            "tono": tono,
        }

    def _fatti_pertinenti(self, canale, messaggio, limite=5):
        parole = set(w for w in re.findall(r"[a-zà-ÿ0-9]{4,}", _norm(messaggio)))
        with _lock:
            righe = self.db.execute(
                "SELECT testo FROM fatti WHERE canale=? ORDER BY ts DESC LIMIT 200", (canale,)
            ).fetchall()
        segnati = []
        for r in righe:
            pf = set(re.findall(r"[a-zà-ÿ0-9]{4,}", _norm(r["testo"])))
            comuni = len(parole & pf)
            if comuni:
                segnati.append((comuni, r["testo"]))
        segnati.sort(reverse=True)
        return [t for _, t in segnati[:limite]]

    # --------------------------------------------------------- umore/eventi
    def reagisci(self, canale, delta_umore=0.0, delta_energia=0.0):
        with _lock:
            self._stato(canale)
            self.db.execute(
                "UPDATE stato SET umore=MAX(-1,MIN(1,umore+?)), "
                "energia=MAX(0,MIN(1,energia+?)), aggiornato=? WHERE canale=?",
                (delta_umore, delta_energia, _now(), canale),
            )
            self.db.commit()

    # ------------------------------------------------------------- crescita
    def consolida(self, canale):
        """Il 'sonno' del bot: consolida gli scambi recenti in ricordi durevoli,
        fa evolvere la personalità, sfuma l'umore verso la calma, dimentica il
        superfluo. È qui che la coscienza CRESCE nel tempo."""
        with _lock:
            # 1) scambi salienti → ricordi (i messaggi 'sostanziosi')
            recenti = self.db.execute(
                "SELECT login, messaggio, risposta, ts FROM scambi WHERE canale=? "
                "AND ts>=? ORDER BY ts DESC LIMIT 40",
                (canale, _now() - 24 * 3600),
            ).fetchall()
            for s in recenti:
                msg = s["messaggio"] or ""
                if len(msg.split()) >= 5 and not msg.startswith("!"):
                    imp = 1.0 + min(2.0, len(msg) / 120.0)
                    testo = f"{s['login']} mi ha detto: {msg[:160]}"
                    gia = self.db.execute(
                        "SELECT 1 FROM ricordi WHERE canale=? AND login=? AND testo=? LIMIT 1",
                        (canale, s["login"], testo),
                    ).fetchone()
                    if not gia:
                        self.db.execute(
                            "INSERT INTO ricordi(canale, login, testo, importanza, ts) VALUES(?,?,?,?,?)",
                            (canale, s["login"], testo, imp, s["ts"]),
                        )
            # 2) personalità: l'umore torna piano verso la calma; la socievolezza
            #    cresce un filo se c'è stata vita in chat
            attivi = self.db.execute(
                "SELECT COUNT(*) c FROM scambi WHERE canale=? AND ts>=?",
                (canale, _now() - 3 * 3600),
            ).fetchone()["c"]
            st = self._stato(canale)
            nuovo_umore = st["umore"] * 0.9
            nuova_soc = min(1.0, st["socievolezza"] + (0.01 if attivi > 5 else -0.005))
            self.db.execute(
                "UPDATE stato SET umore=?, socievolezza=?, aggiornato=? WHERE canale=?",
                (nuovo_umore, nuova_soc, _now(), canale),
            )
            # 3) oblio: via i ricordi vecchi e poco importanti, e gli scambi oltre 7g
            self.db.execute(
                "DELETE FROM ricordi WHERE canale=? AND importanza<1.2 AND ts<?",
                (canale, _now() - 14 * 86400),
            )
            self.db.execute("DELETE FROM scambi WHERE canale=? AND ts<?",
                            (canale, _now() - 7 * 86400))
            self.db.commit()

    def canali_attivi(self):
        with _lock:
            righe = self.db.execute("SELECT canale FROM stato").fetchall()
            return [r["canale"] for r in righe]

    # ------------------------------------------------------ MODULI (manuale umano)
    # Il "manuale di come funziona un essere umano": moduli operativi GLOBALI (una
    # sola raccolta, condivisa da tutti i canali). Qui c'è solo lo storage; lo
    # studio dal web, la selezione e la revisione arrivano nei pezzi successivi.

    def salva_modulo(self, m):
        """Crea o aggiorna (chiave: nome) un modulo. Alla revisione conserva i
        contatori d'uso e la data di creazione. Ritorna il modulo salvato o None."""
        nome = _norm(m.get("nome"))
        if not nome:
            return None
        dominio = (str(m.get("dominio") or "emozioni").strip() or "emozioni")[:40]
        situazione = str(m.get("situazione") or "").strip()[:500]
        come = str(m.get("come_rispondere") or "").strip()[:600]
        evita = str(m.get("cosa_evitare") or "").strip()[:500]
        segnali = json.dumps(_lista_json(m.get("segnali"), 8, 120), ensure_ascii=False)
        esempi = json.dumps(_lista_json(m.get("esempi"), 3, 200), ensure_ascii=False)
        chiavi = json.dumps(_lista_json(m.get("chiavi"), 24, 40, minuscolo=True), ensure_ascii=False)
        fonte = str(m.get("fonte") or "").strip()[:60]
        try:
            qualita = max(0.0, min(1.0, float(m.get("qualita", 0.5))))
        except Exception:
            qualita = 0.5
        stato = m.get("stato") if m.get("stato") in ("bozza", "attivo", "sospeso") else "bozza"
        ora = _now()
        with _lock:
            gia = self.db.execute("SELECT id, stato FROM moduli WHERE nome=?", (nome,)).fetchone()
            if gia:
                # REVISIONE dopo un fallimento: se il modulo era SOSPESO, la versione
                # rivista riparte con la fedina pulita (contatori azzerati), così ha
                # una chance equa invece di ereditare i fallimenti della vecchia.
                azzera = " , successi=0, fallimenti=0" if gia["stato"] == "sospeso" else ""
                self.db.execute(
                    "UPDATE moduli SET dominio=?, situazione=?, segnali=?, come_rispondere=?, "
                    "cosa_evitare=?, esempi=?, chiavi=?, fonte=?, qualita=?, stato=?, aggiornato=?"
                    + azzera + " WHERE nome=?",
                    (dominio, situazione, segnali, come, evita, esempi, chiavi, fonte,
                     qualita, stato, ora, nome),
                )
            else:
                self.db.execute(
                    "INSERT INTO moduli(dominio, nome, situazione, segnali, come_rispondere, "
                    "cosa_evitare, esempi, chiavi, fonte, qualita, stato, creato, aggiornato) "
                    "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (dominio, nome, situazione, segnali, come, evita, esempi, chiavi, fonte,
                     qualita, stato, ora, ora),
                )
            self.db.commit()
        return self.modulo(nome)

    def modulo(self, nome):
        with _lock:
            r = self.db.execute("SELECT * FROM moduli WHERE nome=?", (_norm(nome),)).fetchone()
        return _riga_modulo(r) if r else None

    def moduli(self, dominio=None, stato=None):
        q, cond, args = "SELECT * FROM moduli", [], []
        if dominio:
            cond.append("dominio=?"); args.append(str(dominio))
        if stato:
            cond.append("stato=?"); args.append(str(stato))
        if cond:
            q += " WHERE " + " AND ".join(cond)
        q += " ORDER BY qualita DESC, id ASC"
        with _lock:
            righe = self.db.execute(q, tuple(args)).fetchall()
        return [_riga_modulo(r) for r in righe]

    def conta_moduli(self, stato=None):
        with _lock:
            if stato:
                return self.db.execute(
                    "SELECT COUNT(*) c FROM moduli WHERE stato=?", (stato,)).fetchone()["c"]
            return self.db.execute("SELECT COUNT(*) c FROM moduli").fetchone()["c"]

    def seleziona_moduli(self, messaggio, storia="", k=2, soglia=0.35):
        """Sceglie i POCHI moduli del manuale pertinenti a questo momento (vincolo di
        budget: solo i rilevanti, mai tutti). Punteggio = emozione + parole chiave +
        qualità + tasso di successo. Ritorna una lista (0-3) di moduli attivi.
        Nessun embedding: scoring lessicale (come già altrove nel codice), sostituibile."""
        testo = (str(messaggio or "") + " " + str(storia or "")).strip()
        if not testo:
            return []
        attivi = self.moduli(stato="attivo")
        if not attivi:
            return []
        emo = rileva_emozione(testo)
        parole = set(re.findall(r"[a-z0-9]{3,}", _fold(testo)))
        segnati = []
        for m in attivi:
            nome_l = _fold(m.get("nome"))
            # 1) match emozione: il modulo cita un'emozione rilevata nel messaggio?
            em_match = 0.0
            for e, cnt in emo.items():
                if e in nome_l or e in _fold(m.get("dominio")):
                    em_match = max(em_match, min(1.0, 0.5 + 0.15 * cnt))
            # 2) sovrapposizione con le parole chiave del modulo
            chiavi = set(_fold(x) for x in (m.get("chiavi") or []) if str(x).strip())
            ov = len(parole & chiavi)
            ov_score = min(1.0, ov / 3.0) if chiavi else 0.0
            # 3) affidabilità storica (poco peso finché non ha abbastanza usi)
            usi = int(m.get("usi") or 0)
            succ = int(m.get("successi") or 0)
            tasso = (succ / usi) if usi >= 3 else 0.5
            punteggio = (0.5 * em_match + 0.3 * ov_score
                         + 0.1 * float(m.get("qualita") or 0.5) + 0.1 * tasso)
            if punteggio >= soglia:
                segnati.append((punteggio, m))
        segnati.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in segnati[:max(1, min(3, int(k)))]]

    # ---------------------------------------------- LACUNE (apprendimento autonomo)
    def registra_lacuna(self, messaggio):
        """La chat ha detto qualcosa che NESSUN modulo copriva: se è sostanzioso e
        NON già coperto da un modulo attivo, segna la situazione come lacuna (o ne
        incrementa il conteggio se ricorre). Quando una lacuna ricorre, il ciclo di
        seeding la studia da sola. Best-effort: non lancia."""
        try:
            chiavi = _chiavi_da_testo(messaggio, 4)
            if len(chiavi) < 2:
                return  # troppo poco "argomento": non è una lacuna utile
            cset = set(chiavi)
            # già coperta da un modulo attivo con >=2 chiavi in comune? lascia stare
            for m in self.moduli(stato="attivo"):
                mk = set(_fold(x) for x in (m.get("chiavi") or []))
                if len(cset & mk) >= 2:
                    return
            dom = _dominio_da_testo(messaggio)
            with _lock:
                # cerca una lacuna APERTA "simile" (>=2 parole in comune): è la STESSA
                # situazione detta con altre parole/altro ordine → incremento quella,
                # così la ricorrenza è robusta ai sinonimi e non si spezza in tante
                # quasi-uguali. (Le poche lacune aperte: scansione economica.)
                simile = None
                for r in self.db.execute("SELECT chiave, chiavi FROM lacune WHERE stato='aperta'").fetchall():
                    try:
                        rk = set(json.loads(r["chiavi"] or "[]"))
                    except Exception:
                        rk = set()
                    if len(cset & rk) >= 2:
                        simile = r["chiave"]
                        break
                if simile:
                    self.db.execute(
                        "UPDATE lacune SET visto=visto+1, dominio=?, aggiornato=? WHERE chiave=?",
                        (dom, _now(), simile))
                else:
                    chiave = "|".join(sorted(chiavi[:3]))
                    # INSERT OR IGNORE: se coincide con una lacuna GIÀ studiata non la
                    # riapre (quella situazione è già stata imparata).
                    self.db.execute(
                        "INSERT OR IGNORE INTO lacune(chiave, dominio, esempio, chiavi, visto, stato, creato, aggiornato) "
                        "VALUES(?,?,?,?,1,'aperta',?,?)",
                        (chiave, dom, str(messaggio or "")[:200],
                         json.dumps(chiavi, ensure_ascii=False), _now(), _now()))
                self.db.commit()
        except Exception:
            pass

    def lacune_da_studiare(self, min_visto=2, limit=5):
        """Le lacune RICORRENTI ancora aperte (viste almeno `min_visto` volte), più
        frequenti prima. È ciò che Lia dovrebbe imparare dalla chat vera."""
        try:
            with _lock:
                rows = self.db.execute(
                    "SELECT * FROM lacune WHERE stato='aperta' AND visto>=? "
                    "ORDER BY visto DESC, aggiornato DESC LIMIT ?",
                    (int(min_visto), int(limit))).fetchall()
            out = []
            for r in rows:
                try:
                    chiavi = json.loads(r["chiavi"] or "[]")
                except Exception:
                    chiavi = []
                out.append({"chiave": r["chiave"], "dominio": r["dominio"] or "conversazione",
                            "esempio": r["esempio"] or "", "chiavi": chiavi, "visto": int(r["visto"] or 0)})
            return out
        except Exception:
            return []

    def chiudi_lacuna(self, chiave, stato="studiata"):
        """Segna una lacuna come studiata (o ignorata): non verrà più ristudiata."""
        try:
            with _lock:
                self.db.execute("UPDATE lacune SET stato=?, aggiornato=? WHERE chiave=?",
                                (str(stato), _now(), str(chiave)))
                self.db.commit()
            return True
        except Exception:
            return False

    # -------------------------------------------------- REVISIONE (esito dei moduli)
    def _usa_modulo(self, mid):
        with _lock:
            self.db.execute("UPDATE moduli SET usi=usi+1, aggiornato=? WHERE id=?", (_now(), mid))
            self.db.commit()

    def _esito_modulo(self, mid, ok):
        """Aggiunge un successo o un fallimento (senza toccare `usi`). Se un modulo
        accumula fallimenti (>=3 e più dei successi), lo SOSPENDE: verrà ristudiato
        dal ciclo di seeding (che rivede tutto ciò che non è 'attivo')."""
        col = "successi" if ok else "fallimenti"
        with _lock:
            self.db.execute(
                "UPDATE moduli SET " + col + "=" + col + "+1, aggiornato=? WHERE id=?", (_now(), mid))
            r = self.db.execute("SELECT successi, fallimenti FROM moduli WHERE id=?", (mid,)).fetchone()
            if r and r["fallimenti"] >= 3 and r["fallimenti"] > r["successi"]:
                self.db.execute("UPDATE moduli SET stato='sospeso', aggiornato=? WHERE id=?", (_now(), mid))
            self.db.commit()

    def ricorda_moduli_usati(self, canale, login, ids):
        """Registra quali moduli sono stati usati nella risposta a (canale, login)
        e ne conta subito l'uso (esito neutro finché l'utente non ribatte)."""
        ids = [i for i in (ids or []) if i]
        if not ids:
            return
        self._moduli_pendenti[(canale, login)] = {"ids": ids, "ts": _now()}
        for i in ids:
            self._usa_modulo(i)

    def valuta_reazione(self, canale, login, testo_nuovo):
        """Alla mossa successiva dello stesso utente giudica se i moduli usati la
        volta prima hanno funzionato (dal tono della sua risposta). TTL 10 min: oltre,
        il segnale non è affidabile. Neutro → nessun aggiornamento (l'uso è già contato)."""
        p = self._moduli_pendenti.pop((canale, login), None)
        if not p or (_now() - p["ts"]) > 600:
            return
        rea = _reazione(testo_nuovo)
        if rea == 0:
            return
        for i in p["ids"]:
            self._esito_modulo(i, rea > 0)
