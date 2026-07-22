// Ascolto live LATO SERVER di UN singolo canale — SOLO AUDIO.
// Tira l'audio della live da Twitch con `streamlink`, lo passa a `ffmpeg`
// con il filtro `ebur128` per misurare la loudness momentanea (LUFS) e,
// quando c'è un "picco" (urla, risate, hype), chiama onSpike() così il
// BotManager può creare una clip del momento saliente.
//
// Vincoli: nessuna analisi video, consumi ridotti (un canale = una coppia
// streamlink+ffmpeg che decodifica solo l'audio). Il pool nel BotManager
// impone un CAP globale di ascolti simultanei.
import { spawn } from 'node:child_process';
import readline from 'node:readline';

// --- parametri dell'algoritmo di rilevamento picco --------------------
const WARMUP_MS = 8_000;     // primi secondi ignorati: baseline che si assesta
const COOLDOWN_MS = 90_000;  // pausa minima tra due picchi (niente raffiche)
const ALPHA = 0.05;          // EMA della baseline: aggiornamento LENTO
const FLOOR_LU = -70;        // sotto questa loudness è "silenzio": si ignora
const SOGLIA_MAX_LU = 12;    // sensibilità 1  → serve uno stacco di ~12 LU
const SOGLIA_MIN_LU = 5;     // sensibilità 10 → basta uno stacco di ~5 LU

// Soglia (in LU) sopra la baseline per considerare un valore un "picco".
// Più sensibile (numero alto) = soglia più bassa = scatta più facilmente.
function sogliaDaSensibilita(sensibilita) {
  const s = Math.min(10, Math.max(1, Math.round(Number(sensibilita) || 5)));
  return SOGLIA_MAX_LU - ((s - 1) / 9) * (SOGLIA_MAX_LU - SOGLIA_MIN_LU);
}

export class LiveListener {
  constructor({ login, sensibilita = 5, onSpike, log }) {
    this.login = String(login || '').toLowerCase();
    this.sensibilita = sensibilita;
    this.soglia = sogliaDaSensibilita(sensibilita);
    this.onSpike = typeof onSpike === 'function' ? onSpike : () => {};
    this.log = log || { info() {}, warn() {}, error() {}, debug() {} };

    // stato pubblico letto dal pool
    this.attivo = false;   // start() chiamato e processi in piedi
    this.morto = false;    // terminato per errore/offline: il pool può ritentare

    // processi e lettore
    this._streamlink = null;
    this._ffmpeg = null;
    this._rl = null;

    // controllo del ciclo di vita
    this._fermato = false;          // stop() esplicito
    this._senzaMap = false;         // ffmpeg avviato SENZA -map 0:a (ripiego)
    this._senzaMapProvato = false;  // il ripiego è già stato tentato
    this._ricevutoQualcosa = false; // almeno una riga di loudness letta

    // stato dell'algoritmo
    this._startedAt = 0;
    this._baseline = null;   // EMA della loudness momentanea
    this._ultimoPicco = 0;   // timestamp dell'ultimo picco (per il cooldown)
  }

  // Avvia l'ascolto. Idempotente.
  start() {
    if (this.attivo || this._fermato) return;
    this.attivo = true;
    this.morto = false;
    this._startedAt = Date.now();
    this._spawn();
  }

  // Ferma l'ascolto: uccide i processi e rimuove i listener. Idempotente.
  stop() {
    this._fermato = true;
    this.attivo = false;
    this._pulisciProcessi();
  }

  // -------------------------------------------------------------- interni

  // Avvia streamlink (audio della live) in pipe verso ffmpeg (misura loudness).
  _spawn() {
    if (this._fermato) return;

    // streamlink: preferisce lo stream "audio_only", ripiega su "worst".
    let streamlink;
    try {
      streamlink = spawn('streamlink', [
        '--twitch-disable-ads',
        '--default-stream', 'audio_only,worst',
        '--stdout',
        `https://twitch.tv/${this.login}`,
      ], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
      this.log.debug(`ascolto #${this.login}: streamlink non avviabile:`, e?.message || e);
      this._muori();
      return;
    }

    // ffmpeg: legge dallo stdin, prende SOLO l'audio (-map 0:a) e ne stampa
    // la loudness momentanea su STDERR grazie a ebur128=metadata=1.
    // Se il ripiego è attivo, si omette -map (ffmpeg sceglie da sé lo stream).
    const argsFfmpeg = ['-hide_banner', '-nostats', '-i', 'pipe:0'];
    if (!this._senzaMap) argsFfmpeg.push('-map', '0:a');
    argsFfmpeg.push('-af', 'ebur128=metadata=1', '-f', 'null', '-');

    let ffmpeg;
    try {
      ffmpeg = spawn('ffmpeg', argsFfmpeg, { stdio: ['pipe', 'ignore', 'pipe'] });
    } catch (e) {
      this.log.debug(`ascolto #${this.login}: ffmpeg non avviabile:`, e?.message || e);
      this._uccidi(streamlink);
      this._muori();
      return;
    }

    this._streamlink = streamlink;
    this._ffmpeg = ffmpeg;

    // pipe audio: streamlink STDOUT → ffmpeg STDIN. Gli errori EPIPE (quando
    // uno dei due muore prima dell'altro) vanno assorbiti, non devono crashare.
    streamlink.stdout.on('error', () => {});
    ffmpeg.stdin.on('error', () => {});
    streamlink.stdout.pipe(ffmpeg.stdin);

    // lettura di ffmpeg STDERR riga per riga (le metriche ebur128)
    this._rl = readline.createInterface({ input: ffmpeg.stderr });
    this._rl.on('line', (riga) => this._leggiRiga(riga));
    this._rl.on('error', () => {});

    // gestione errori/chiusure: mai crashare, segnare "morto" per il pool.
    streamlink.on('error', (e) => {
      this.log.debug(`ascolto #${this.login}: errore streamlink:`, e?.message || e);
      this._muori();
    });
    streamlink.on('close', (code) => {
      if (this._fermato || this._streamlink !== streamlink) return;
      // streamlink finito = niente più audio (stream offline o terminato)
      this.log.debug(`ascolto #${this.login}: streamlink uscito (code ${code})`);
      this._muori();
    });

    ffmpeg.on('error', (e) => {
      this.log.debug(`ascolto #${this.login}: errore ffmpeg:`, e?.message || e);
      this._muori();
    });
    ffmpeg.on('close', (code) => {
      if (this._fermato || this._ffmpeg !== ffmpeg) return;
      // Ripiego: se avevamo -map e non abbiamo mai letto una loudness, forse
      // lo stream non espone l'audio come ce lo aspettavamo → riprova SENZA -map.
      if (!this._senzaMap && !this._senzaMapProvato && !this._ricevutoQualcosa) {
        this._senzaMap = true;
        this._senzaMapProvato = true;
        this.log.debug(`ascolto #${this.login}: ffmpeg uscito con -map (code ${code}), riprovo senza -map`);
        this._pulisciProcessi();
        this._spawn();
        return;
      }
      this.log.debug(`ascolto #${this.login}: ffmpeg uscito (code ${code})`);
      this._muori();
    });
  }

  // Una riga di ffmpeg: estrae la loudness momentanea M: (LUFS).
  _leggiRiga(riga) {
    const m = /M:\s*(-?\d+(\.\d+)?)/.exec(riga);
    if (!m) return;
    this._ricevutoQualcosa = true;   // ebur128 sta producendo output: -map ok
    this._onLoudness(parseFloat(m[1]));
  }

  // Cuore del rilevamento picco.
  // - baseline = EMA lenta della loudness momentanea
  // - un valore che stacca dalla baseline di più della soglia = picco
  // - warm-up iniziale e silenzi (-inf/valori bassissimi) esclusi
  // - cooldown interno tra un picco e l'altro
  _onLoudness(mNow) {
    if (!Number.isFinite(mNow) || mNow <= FLOOR_LU) return;  // silenzio: si ignora

    const ora = Date.now();
    const inWarmup = (ora - this._startedAt) < WARMUP_MS;

    // prima misura utile: inizializza la baseline e basta
    if (this._baseline === null) {
      this._baseline = mNow;
      return;
    }

    const stacco = mNow - this._baseline;

    // picco: solo dopo il warm-up e fuori dal cooldown
    if (!inWarmup && stacco >= this.soglia && (ora - this._ultimoPicco) >= COOLDOWN_MS) {
      this._ultimoPicco = ora;
      this.log.debug(`ascolto #${this.login}: PICCO (+${stacco.toFixed(1)} LU sopra baseline)`);
      try { this.onSpike(); } catch (e) { this.log.debug(`ascolto #${this.login}: onSpike:`, e?.message || e); }
    }

    // baseline aggiornata LENTAMENTE: un singolo picco non la sposta molto
    this._baseline = this._baseline * (1 - ALPHA) + mNow * ALPHA;
  }

  // Segna l'ascolto come "morto" (offline o binario assente): il pool lo
  // rimuoverà e potrà ritentare più tardi. Non fa nulla se già fermato/morto.
  _muori() {
    if (this._fermato || this.morto) return;
    this.morto = true;
    this.attivo = false;
    this._pulisciProcessi();
  }

  // Uccide processi e lettore rimuovendo i listener. Sicuro da chiamare più volte.
  // Dopo aver tolto i nostri handler ne rimettiamo uno NO-OP su 'error': un
  // binario assente (ENOENT) o una pipe rotta (EPIPE) possono emettere 'error'
  // in ritardo, e un 'error' senza ascoltatori farebbe crashare il processo.
  _pulisciProcessi() {
    try { this._rl?.removeAllListeners(); this._rl?.close(); } catch { /* niente */ }
    this._rl = null;
    for (const p of [this._ffmpeg, this._streamlink]) {
      if (!p) continue;
      for (const s of [p.stdout, p.stderr, p.stdin]) {
        if (!s) continue;
        try { s.removeAllListeners(); s.on('error', () => {}); } catch { /* niente */ }
      }
      try { p.removeAllListeners(); p.on('error', () => {}); } catch { /* niente */ }
      this._uccidi(p);
    }
    this._ffmpeg = null;
    this._streamlink = null;
  }

  // Uccide UN processo figlio in modo sicuro. IMPORTANTE: mai chiamare kill()
  // senza un pid valido e positivo — un pid 0/-1 (spawn fallito, ENOENT)
  // verrebbe interpretato da POSIX come "segnala l'intero gruppo di processi",
  // uccidendo anche noi stessi. Salta anche i processi già usciti.
  _uccidi(p) {
    if (!p) return;
    if (typeof p.pid !== 'number' || p.pid <= 0) return;
    if (p.exitCode !== null || p.signalCode !== null) return;
    try { p.kill('SIGKILL'); } catch { /* già morto */ }
  }
}
