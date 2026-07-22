# Ascolto live e clip sui momenti salienti

SocialBot può creare clip in automatico quando durante la live succede
qualcosa di "saliente" (urla, risate, hype). Ci sono **due lati**, indipendenti
tra loro: puoi usarne uno, l'altro o entrambi.

## 1) Lato SERVER — momenti salienti dall'audio

Per gli streamer che lo attivano, il server "ascolta" la live (**solo audio**,
niente video) e crea una clip quando il volume ha un **picco** rispetto al suo
andamento normale.

Come funziona sotto il cofano:

- `streamlink` tira **solo l'audio** della live da Twitch;
- `ffmpeg` con il filtro `ebur128` ne misura la **loudness momentanea** (LUFS);
- il bot tiene una *baseline* che si adatta lentamente al volume della live;
  quando la loudness stacca dalla baseline oltre una soglia (derivata dalla
  **sensibilità**), è un picco → parte una clip;
- c'è un **cooldown interno** (90s) tra un picco e l'altro, così niente raffiche.

Si attiva dalla dashboard con due impostazioni:

- **`ascoltoLive`** (on/off): opt-in, di default **spento**;
- **`ascoltoSensibilita`** (1..10): più alto = più sensibile (basta uno stacco
  più piccolo per far scattare la clip). Default **5**.

### Cap globale: `MAX_LISTENERS`

Il server è piccolo (CPX12, 2 vCPU), quindi l'ascolto è **solo audio** e c'è un
**tetto globale** di ascolti simultanei impostato con la variabile d'ambiente
`MAX_LISTENERS` (default `2`). Se sono già attivi tanti ascolti quanti il cap,
gli altri canali restano in attesa finché non si libera uno slot. `MAX_LISTENERS=0`
disattiva del tutto la funzione.

Ogni ascolto è una coppia `streamlink`+`ffmpeg` che decodifica **solo l'audio**:
il consumo CPU è contenuto, ma non trascurabile — per questo il cap.

### Ritardo HLS di Twitch (~15-30s): va bene per le clip

Twitch consegna la live in HLS con un ritardo di circa **15-30 secondi**: il
server "sente" un momento con qualche decina di secondi di ritardo rispetto a
quando è accaduto in diretta. **Non è un problema** per le clip, perché Twitch
clippa comunque **gli ultimi ~30 secondi** già trasmessi: quando rileviamo il
picco, quel momento è ancora dentro la finestra clippabile.

### Robustezza

L'ascolto **non deve mai** compromettere il resto del bot:

- se `streamlink` o `ffmpeg` mancano, o lo stream è offline, l'ascolto si
  spegne in silenzio (log a `debug`) e viene segnato come "morto";
- il pool nel `BotManager` rimuove gli ascolti morti e può **ritentare** più
  tardi (al prossimo giro di riconciliazione, ~60s);
- tutta la riconciliazione gira in `try/catch` isolato.

Lo stato è visibile in `status()` (campo **`ascoltando: [login]`**).

## 2) Lato PC — clip a comando vocale (companion)

L'app **companion** (che gira sul PC dello streamer) può far partire una clip
**a voce**. Chiama l'ingresso esterno del canale con l'azione `clip`:

```
POST /api/ext/<login>
Authorization: Bearer <API KEY del canale>
Content-Type: application/json

{ "azione": "clip", "motivo": "comando vocale" }
```

Il server risponde `{ "ok": true }` e crea la clip sul canale.

> Per la parte vocale (riconoscimento del comando, hotword, ecc.) vedi la
> cartella [`companion/`](../companion/).
