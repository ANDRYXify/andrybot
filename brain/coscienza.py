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


class Coscienza:
    def __init__(self, db_path=DB_PATH):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self._schema()
        self._assicura_stato()

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
                CREATE INDEX IF NOT EXISTS i_ricordi ON ricordi(canale, login, ts);
                CREATE INDEX IF NOT EXISTS i_scambi ON scambi(canale, login, ts);
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
