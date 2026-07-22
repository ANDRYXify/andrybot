# SocialBot 🤖💜

Il bot Twitch della community di **[andryxify.it](https://andryxify.it)**: un bot che
**parla nella chat dello streamer con il suo stesso account**, **impara** dalla sua
community e dal suo profilo sul sito, crea clip nei momenti migliori e può far partire
**suoni ed effetti a schermo** su overlay OBS.

Niente intelligenze artificiali a pagamento: il "cervello" è **procedurale e
progressivo**. Parte con delle basi, si pre-addestra da solo leggendo il profilo dello
streamer su andryxify.it, e poi **cresce** ascoltando la chat — sempre dentro le regole
di comportamento decise dallo streamer.

> **Costo di gestione:** solo il server. Nessun costo per messaggio, nessuna API a consumo.

---

## Come funziona il "cervello" (procedurale e progressivo)

SocialBot non usa modelli linguistici esterni. Ragiona così, in ordine:

1. **Intenti** — riconosce a parole chiave le situazioni tipiche della chat (saluti,
   "come va", "chi sei", "che gioco è", "da quanto sei live", richieste di clip, richieste
   dei social…) e risponde con frasi naturali, variate e calibrate sul **tono** scelto
   (scherzoso / amichevole / serio).
2. **Conoscenza** — cerca tra le cose che *sa* su quel canale (vedi sotto) e, se trova una
   corrispondenza, risponde con quella.
3. **Apprendimento dalla chat** — quando un utente fa una domanda e poco dopo lo streamer
   o un moderatore risponde, SocialBot **impara** quella coppia domanda→risposta.
4. **Catene di Markov** — costruisce frasi "nello stile" della chat a partire dai messaggi
   realmente scritti nel canale (dichiarandole per quello che sono: battute improvvisate).
5. **Interventi spontanei** — ogni tanto (con una probabilità regolabile dallo streamer)
   dice la sua, magari con un'emote fra le più usate del canale.

Da dove impara:

| Fonte | Cosa impara |
|---|---|
| **Profilo su andryxify.it** (`/u/<streamer>`) | bio, social/link, gioco recente — *pre-addestramento automatico al primo accesso* |
| **Chat del canale** | vocabolario, emote del momento, coppie domanda→risposta, top chatter |
| **Conoscenza manuale** | regole e nozioni che lo streamer aggiunge dalla dashboard |
| **Riflessione periodica** | ogni 6 ore consolida statistiche e "lezioni" sul canale |

Tutto questo resta **per singolo canale**: ogni streamer ha il suo SocialBot che cresce
con lui.

---

## Accesso: solo dal sito, solo per streamer abilitati

La dashboard vive su **bot.andryxify.it** (sul server Hetzner, fuori da Vercel) ma **non è
esplorabile**: chi ci arriva senza passare da andryxify.it vede solo un `Not Found`.

Il meccanismo (**zero segreti condivisi**):

1. Lo streamer **verificato e abilitato** su andryxify.it apre le impostazioni del suo
   account e trova la card **"🤖 Gestisci il tuo SocialBot"** (invisibile a tutti gli altri).
2. Al clic, il sito conia un **pass usa-e-getta** (256 bit, valido 2 minuti, una volta sola)
   e reindirizza a `bot.andryxify.it/entra?pass=…`.
3. Il bot "brucia" il pass richiamando il sito: se il sito conferma un login abilitato,
   crea la sessione. L'ancora di fiducia è l'HTTPS di andryxify.it — **niente chiavi da
   incollare in `.env` o nelle variabili d'ambiente**.

Se il sito revoca l'abilitazione, il bot **esce dal canale da solo** (controllo periodico).

---

## Il bot parla con l'account dello streamer

Non esiste un "account bot" separato. Dentro la dashboard, lo streamer concede i permessi
Twitch (OAuth) e da quel momento SocialBot scrive in chat **come lui**. È trasparente e
sotto il suo pieno controllo: si spegne con un clic e i permessi si revocano quando vuole.

---

## Comandi in chat (integrati)

| Comando | Cosa fa |
|---|---|
| `!comandi` | elenca i comandi disponibili |
| `!ciao` | saluto del bot |
| `!uptime` | da quanto è iniziata la live |
| `!clip` | crea una clip del momento |
| `!so <utente>` | shoutout a un altro canale |
| `!addcmd <nome> <testo>` | crea un comando personalizzato (mod) |
| `!delcmd <nome>` | rimuove un comando personalizzato (mod) |

In più, ogni streamer può creare **comandi personalizzati** e **effetti/suoni** con un
comando a piacere (es. `!airhorn`).

---

## Effetti & Suoni (overlay OBS)

Lo streamer carica dalla dashboard suoni, immagini o video corti e li lega a un comando di
chat. Gli spettatori li attivano scrivendo il comando, con **limiti per ruolo**
(tutti / sub / vip / mod) e **cooldown**. Ogni file viene **super-compresso** con ffmpeg
(audio → Opus, immagini → WebP, video → WebM/VP9) per restare leggero.

La resa a schermo avviene in un **overlay trasparente** da aggiungere in OBS come *Browser
Source*: l'URL (con la sua chiave) si copia dalla sezione "Effetti & Suoni" della dashboard.

---

## Moduli (automazioni componibili)

Ogni streamer può creare automazioni **QUANDO → SE → ALLORA** dalla dashboard: *quando*
succede qualcosa (un comando, una parola, un evento, un timer), *se* valgono certe condizioni
(ruolo, cooldown, probabilità, solo in live…), *allora* il bot esegue una o più azioni
(scrivi in chat, fai partire un effetto, contatore, chiama un webhook, mostra testo
sull'overlay…). **Libertà totale ma sicura**: un modulo è **solo dati** (JSON), mai codice —
sul server condiviso non gira nulla di arbitrario. L'azione **webhook** apre a logiche
esterne (con guardia anti-SSRF) e la **chiave API in ingresso** (`/api/ext/<login>`) lascia
che un servizio dello streamer faccia dire/fare cose al bot. Dettagli in
[`docs/moduli.md`](docs/moduli.md).

> **Plugin operatore** (`plugins/`): estensioni **server-side** in JavaScript, riservate
> **solo all'operatore** (andryxify). A differenza dei Moduli, girano sul server con pieni
> privilegi: non sono per gli streamer. Vedi [`plugins/README.md`](plugins/README.md).

---

## Moduli

| Percorso | Ruolo |
|---|---|
| `src/index.js` | avvio: dashboard + bot + sincronizzazioni |
| `src/config.js` | configurazione (`.env`, segreto di sessione auto-generato) |
| `src/db.js` | database SQLite (token, streamer, memoria, conoscenza, effetti) |
| `src/twitch/auth.js` | OAuth e refresh dei token Twitch |
| `src/twitch/helix.js` | API Helix (utenti, stream, clip) |
| `src/twitch/chat.js` | client chat IRC (parla con l'account dello streamer) |
| `src/twitch/events.js` | EventSub (follow, sub, raid, live on/off, punti canale) |
| `src/ai/brain.js` | il cervello: decide se e cosa rispondere |
| `src/ai/learn.js` | apprendimento dalla chat (Markov, domanda→risposta, emote) |
| `src/ai/pretrain.js` | pre-addestramento dal profilo su andryxify.it |
| `src/ai/reflection.js` | riflessione/consolidamento periodico |
| `src/stream/watcher.js` | "osserva" la live (gioco, titolo, spettatori) |
| `src/features/handler.js` | gestione messaggi: memoria → moderazione → comandi → IA |
| `src/features/clips.js` | clip manuali e automatiche nei momenti "hype" |
| `src/features/moderation.js` | filtri e regole di comportamento |
| `src/features/effects.js` | motore effetti/suoni + registro overlay (SSE) |
| `src/features/modules.js` | motore "Moduli": automazioni QUANDO→SE→ALLORA (vedi `docs/moduli.md`) |
| `src/features/plugins.js` | caricatore plugin operatore + event-bus (vedi `plugins/README.md`) |
| `src/features/compress.js` | super-compressione dei media con ffmpeg |
| `src/web/server.js` | dashboard, API e rotte overlay |
| `src/web/gate.js` | il "cancello": pass monouso + revoca automatica |
| `src/web/public/` | la dashboard (single-page) e la pagina overlay |

---

## Sviluppo in locale

```bash
npm install
cp .env.example .env      # inserisci le credenziali dell'app Twitch
npm start                 # dashboard su http://localhost:8090
```

Il bot parte anche a configurazione incompleta ("modalità setup"): la dashboard indica cosa
manca. Il database e la memoria vivono nella cartella `data/` (ignorata da git).

> In locale l'ingresso col pass del sito non è disponibile (serve andryxify.it); per lo
> sviluppo dell'interfaccia si può lavorare direttamente sui file in `src/web/public/`.

---

## Deploy sul server

Tutto il necessario è in **[`server/README.md`](server/README.md)**: una guida passo-passo
(DNS, chiave SSH e FileZilla dal tuo PC, app Twitch, un solo comando sul server con Docker +
HTTPS automatico).

---

## Trasparenza

SocialBot scrive **con l'account dello streamer**, **solo** dopo il suo consenso esplicito
(OAuth), ed è **disattivabile in un clic**. Impara solo dalla chat pubblica del canale e dal
profilo pubblico su andryxify.it. Nessun dato viene condiviso con terzi.
