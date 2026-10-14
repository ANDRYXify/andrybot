<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# La diretta dal dispositivo: il server fa solo da tramite

Piano, non ancora codice. Prende il posto dello Studio Web spento
(docs/STUDIO.md), che non si riaccende: il suo difetto era nel disegno.

## Perché lo Studio laggava

1. Il video si codificava **due volte**: nel browser (`MediaRecorder`, quasi
   sempre senza la scheda video) e di nuovo sul server (`libx264`).
2. La seconda codifica girava **sul server del bot**: 2–4 core per uno streamer
   in 1080p60, rubati alla chat, agli alert e al cervello.
3. Il trasporto non si adattava: bitrate fisso, tempi ricostruiti, ritardo che
   si accumulava fino agli scatti.
4. La scena si disegnava sul filo principale della pagina, che il browser
   rallenta appena la scheda non è davanti.

## L'invariante

**Tutto il lavoro sul video lo fa il dispositivo. Il server non decodifica e non
codifica mai: riceve pacchetti già pronti, li tiene pochi secondi e ne manda
una copia a ogni piattaforma.** L'unica cosa che il server tocca sono i tempi
dei pacchetti, per cucire la diretta quando il dispositivo sparisce.

| sul dispositivo | sul server |
|---|---|
| cattura (schermo, camera, microfono, audio di sistema dove si può) | autentica la diretta |
| composizione della scena con i nostri overlay, fuori dal filo della pagina | tiene un buffer di 2–4 secondi |
| codifica H.264 con la scheda video (WebCodecs), AAC per l'audio | copia i pacchetti verso Twitch, Kick, YouTube |
| scelta della qualità secondo la rete | riscrive i tempi quando cuce |
| il fermo immagine e il silenzio, codificati prima di partire | conta la banda e la fa rispettare |

## Le disconnessioni

Il dispositivo, **prima di andare in onda**, codifica con lo stesso codificatore
della diretta un giro breve dell'immagine scelta dallo streamer (o l'ultimo
fotogramma, per il fermo immagine) e qualche secondo di silenzio, e li manda al
server. Stesso codificatore vuol dire stessi parametri: il server li può
alternare alla diretta senza ricodificare niente.

- **La rete cala:** il dispositivo scende di qualità da solo (4K, 1440p, 1080p,
  720p) e risale quando la rete torna; ogni cambio parte da un fotogramma chiave.
- **La rete è quasi ferma:** il dispositivo manda solo l'audio; il server lo
  cuce al giro dell'immagine. In onda: l'immagine e la voce dello streamer.
- **Il dispositivo sparisce:** il server manda il giro dell'immagine e il
  silenzio (o la scritta «torno subito»). La diretta non cade, i follower non
  ricevono un secondo «è in diretta», il VOD resta uno.
- **Torna:** riprende dal primo fotogramma chiave nuovo.
- **Non torna:** dopo il tempo scelto dallo streamer (per esempio 10 minuti) la
  diretta si chiude davvero.

## Quanto pesa sul server (16 GB)

Per ogni streamer in diretta: un buffer di qualche MB, il giro dell'immagine
(pochi MB), e una copia verso ogni piattaforma (`ffmpeg -c copy`, che non
decodifica: circa 30 MB e una frazione di core ciascuna). Tre piattaforme fanno
circa 120 MB a streamer. La memoria non è il limite.

**Il limite è la banda in uscita**: ogni piattaforma è una copia intera del
flusso. Tre piattaforme a 8 Mbps sono 24 Mbps per streamer, circa 11 GB l'ora.
Per questo la classe `diretta` dello scudo delle risorse (docs/RISORSE.md) non
conta i lavori ma la banda: entra una diretta nuova solo se la banda dichiarata
del server, meno una riserva per sito e bot, la regge. Una diretta già in onda
non si taglia mai: tagliarla è il danno peggiore che si possa fare.

## Le strade

1. **Dal browser, tramite SocialBot.** Nessuna installazione. Il browser non può
   aprire un RTMP verso le piattaforme, quindi passa sempre dal server.
2. **Da OBS o da OSify, diretto alle piattaforme.** Il server non c'entra; il
   multistream lo fa il dispositivo, ma la banda in uscita da casa è una copia
   per piattaforma: va bene con un upload grande e stabile.
3. **Da OBS o da OSify, tramite SocialBot.** Una sola copia in uscita da casa,
   multistream e immagine di riserva dal server. Richiede di aprire una porta
   in più (RTMP o SRT) accanto a Caddy: è una decisione di esposizione da
   prendere apposta, non un dettaglio.

## Le scene sono quelle dell'Overlay Studio

Lo Studio della diretta non ha un editor suo: parte dalle scene che lo
streamer ha già fatto. Una scena è l'overlay di sempre più le sorgenti
(schermo, camera, immagini) messe sotto o sopra i suoi elementi, con lo stesso
ordine dei livelli. Una scena, un posto dove si modifica: quello che va in OBS
come sorgente browser e quello che va in onda dallo Studio sono la stessa cosa.

**Come si compone senza pesare.** La scena è una pagina: le sorgenti sono
elementi video, l'overlay è quello che è già. A comporla è il browser stesso,
con la scheda video, come fa con qualunque pagina; poi si cattura l'elemento
della scena già composto (Element Capture o Region Capture di Chrome) e si
codifica. Nessun fotogramma passa dal JavaScript, e la trasparenza non serve
perché la composizione è già fatta.

Scene speciali, fatte nello stesso editor: «sta per iniziare», «pausa»,
«torno subito», «fine». La scena «torno subito» è anche quella che va in onda
quando il dispositivo sparisce: si codifica prima di partire (vedi sopra).

Cambio di scena: a mano, con un tasto, dal telefono (regia), o da solo con gli
automatismi della regia che ci sono già (eventi, pubblicità, raid). Transizioni
a taglio, dissolvenza o con un video.

## Le sorgenti

| sorgente | come | limiti veri |
|---|---|---|
| schermo, finestra, scheda | `getDisplayMedia` | il browser chiede ogni volta quale |
| camera, schede di acquisizione (Elgato e simili) | `getUserMedia`: le schede di acquisizione si vedono come camere | |
| microfoni | `getUserMedia`, con riduzione del rumore ed eco | |
| il telefono come camera | il telefono entra da un QR e manda il video al pc da pari a pari (WebRTC); il server fa solo da tramite per presentarli | |
| immagini, video, testi, widget | elementi della scena | |
| pagine web | iframe nella scena | i siti che vietano di farsi incorniciare non si vedono |
| audio del gioco | audio di sistema da `getDisplayMedia` | intero sistema solo su Windows e ChromeOS; su macOS solo l'audio di una scheda; mai di una sola applicazione (lo fa OSify con PipeWire) |

## L'audio: un mixer vero

Ogni sorgente audio è un canale del mixer (Web Audio): volume, muto, misuratore,
ascolto in cuffia. Per canale: porta del rumore, compressore, equalizzatore,
limitatore (AudioWorklet, sul dispositivo). Abbassamento automatico della musica
quando lo streamer parla. Premi-per-parlare. I suoni degli alert e degli
effetti passano dal mixer come un canale, non da un'uscita a parte.

Mix diversi per uscite diverse: per esempio la traccia per i VOD di Twitch
senza musica (il problema dei diritti), e la diretta con. Il dispositivo
codifica due tracce audio, che costano poco.

## Le uscite

Per ogni piattaforma: accesa o spenta anche a diretta in corso, la qualità
(una versione per piattaforma se serve), il mix audio. In più la registrazione
sul dispositivo, a qualità piena, mai sul server.

## Prima di andare in onda

Un controllo che dice in un colpo d'occhio: permessi di camera, microfono e
schermo; codifica con la scheda video sì o no; prova della banda in uscita e
qualità consigliata; scena e sorgenti pronte. Una tenda per la privacy: si
cattura una finestra e non lo schermo intero, e una scena «coperta» con un
tasto, per le notifiche e le password.

## Quello che resta a OBS

Il browser non sa: plugin VST, NDI, audio di una sola applicazione,
scorciatoie globali quando il browser non è davanti (si usano il telefono come
regia o una Stream Deck tramite la regia), camera virtuale. Per chi gioca su
un pc solo con giochi pesanti OBS resta una strada buona, e con la strada 3
prende comunque multistream e immagine di riserva da SocialBot. Lo Studio non
promette di sostituire OBS per tutti: promette di non servire per la maggior
parte.

## Cose da verificare prima del codice (fase 0)

- che cosa accettano davvero le tre piattaforme: codec (H.264, HEVC, AV1),
  1440p e 4K, bitrate massimi, RTMPS, un header di sequenza nuovo a metà
  diretta (serve per cucire il giro dell'immagine);
- WebCodecs sui dispositivi veri: codifica con la scheda video, AAC (su Linux
  Chromium non c'è: serve un codificatore AAC in WebAssembly sul dispositivo);
- Element Capture / Region Capture: su quali Chrome, e se la scheda catturata
  continua a disegnare quando lo streamer è nella finestra del gioco (una
  finestra a parte o il Picture-in-Picture del documento la tengono viva);
- tracce audio multiple attraverso il tramite (la traccia VOD di Twitch);
- WebTransport: Caddy oggi non lo inoltra. Si parte da WebSocket con controllo
  del flusso fatto da noi; QUIC dopo;
- la chiave di trasmissione: Twitch la dà col permesso già previsto, YouTube
  dalle sue API, Kick da verificare (altrimenti la incolla lo streamer). Resta
  cifrata sul server e non arriva mai al browser.

## Le prove

Un browser senza schermo trasmette a un ricevitore RTMP locale, con la rete
sporcata apposta (`tc netem`: perdite, cali, interruzioni). Si misura:
- che il server non decodifichi mai (nessun `-c:v` che non sia `copy`, CPU
  piatta);
- audio e video allineati, fotogramma chiave ogni 2 secondi;
- il giro dell'immagine entra entro N secondi e la diretta non cade;
- la diretta riprende al ritorno del dispositivo;
- la banda rispetta il tetto del piano.

Ogni garanzia si prova rompendola.
