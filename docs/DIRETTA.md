<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# La diretta dal dispositivo: il server fa solo da tramite

Prende il posto dello Studio Web spento (docs/STUDIO.md), che non si riaccende:
il suo difetto era nel disegno. Le sezioni che seguono sono il piano intero;
«La beta» dice cosa ne è già codice e in uso.

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

## La beta: la prima versione che si usa

**Chi entra.** Chi preme «Voglio provarlo per primo» entra subito: lo Studio si
apre per lui e solo per lui (`STUDIO_BETA=0` nell'ambiente chiude la beta a
tutti). Durante la beta non serve un piano a pagamento. Il permesso di Twitch
per la chiave di trasmissione si chiede solo a chi è nella beta.

**Il banco resta quello che c'è.** Scene, sorgenti, mixer e misuratori dello
Studio esistono già: cambia solo la parte che faceva laggare, cioè la codifica e
il trasporto.

**Il dispositivo** prende la tela della scena e l'uscita del mixer e le codifica
con WebCodecs: H.264 con la scheda video, un fotogramma chiave ogni 2 secondi;
AAC dove il browser lo sa fare (Chrome ed Edge su Windows e macOS), Opus dove no
(Linux, Firefox). Manda i pacchetti già pronti a lotti, in ordine, e se una
richiesta fallisce la ripete senza perdere il posto.

**Il server** scrive i pacchetti in un flusso Matroska e lo passa a un ffmpeg
che copia il video così com'è (`-c:v copy`) verso tutte le destinazioni insieme
(`-f tee`): non decodifica e non ricodifica mai il video. L'unica eccezione è
l'audio Opus, che le piattaforme non accettano: lo converte in AAC, e costa
pochi punti di un core. Il video lo deve codificare il dispositivo: un browser
che non sa fare H.264 (per esempio Chromium senza codec proprietari) se lo sente
dire prima di partire, non dopo.

**La riserva.** Prima di andare in onda il dispositivo codifica, con lo stesso
codificatore, due secondi dell'immagine «torno subito» e un secondo di silenzio,
e li consegna al server. Se il video si ferma ma l'audio no, il server mette in
onda l'immagine con la voce; se si ferma tutto, l'immagine e il silenzio,
ricuciti nel tempo così che la diretta non cada. Al ritorno riprende dal primo
fotogramma chiave. Dopo il tempo scelto dallo streamer senza segnale (10 minuti
di serie) la diretta si chiude.

**Un mittente alla volta, e la ripresa.** Ogni avvio dà un *turno*: i
pacchetti e la riserva viaggiano col loro turno, e quelli di un turno vecchio
ricevono «altrove» (409). Così una pagina ricaricata, o aperta in un'altra
finestra, non si mescola mai con quella di prima: l'ultima che parte è l'unica
che trasmette, e la vecchia si ferma da sé e lo dice. Se la codifica è la
stessa (stessa avcC, stesso audio, stesse misure e fotogrammi) la finestra
nuova **riprende la stessa diretta**: nessun ffmpeg nuovo, le piattaforme non
vedono interruzioni. Il dispositivo nuovo ha un orologio che riparte da capo,
quindi il server lo aggancia di nuovo all'orologio d'uscita sul suo primo
fotogramma chiave; fino ad allora va in onda la riserva, anche per l'audio. Se
la codifica è diversa, il flusso già annunciato alle piattaforme non la
potrebbe portare: la diretta di prima si chiude e ne parte una nuova. «Ferma»
chiude solo se la finestra è ancora quella che trasmette; dal pannello si può
chiudere anche una diretta rimasta in onda senza nessuno.

**Le destinazioni.** Twitch e Kick con la chiave presa dalle loro API al
momento di partire (resta sul server e non si salva): su Kick col permesso
`streamkey:read`, chiesto solo a chi ha lo Studio e tenuto quando ricollega.
YouTube e ogni altro servizio RTMP con l'indirizzo e la chiave che lo
streamer incolla una volta: salvati cifrati, mai rimandati al browser, si
cambiano o si tolgono. Ogni destinazione si accende o si spegne prima di
partire; se una cade, le altre continuano.

**Lo scudo.** La diretta è la classe `diretta` dello scudo delle risorse: entra
solo col verde e solo se la banda dichiarata del server la regge
(`DIRETTA_BANDA_MBPS`, di serie 300); una diretta in onda non si taglia mai.
Il server controlla anche che il dispositivo non mandi più di quanto ha
dichiarato: chi supera il tetto viene fermato, perché la banda è di tutti.

**OSify.** Se fra i dispositivi audio compaiono i canali di OSify (Gioco, Voce,
Musica), lo Studio lo riconosce e li mette da sé nel mixer: l'audio del gioco
arriva dal suo canale anche su Linux, dove il browser da solo non lo prende.

**Cosa NON c'è ancora nella beta:** la cattura della scena dall'Overlay Studio
come pagina (si usa il banco dello Studio con l'overlay come sorgente), più
qualità diverse per piattaforma, la traccia audio separata per i VOD di Twitch,
OBS comandato da SocialBot.

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

## Più potenza dall'hardware: tre livelli, non uno

Il browser ha un tetto (sopra). Per chi vuole tutto l'hardware ci sono tre
strade, in ordine di costo:

1. **OBS come motore, comandato da SocialBot.** Il ponte della regia
   (docs/REGIA-PONTE.md) parla già con OBS dal websocket pubblico, stabile fra
   le versioni. Da lì SocialBot può creare e tenere allineate le scene (le
   stesse dell'Overlay Studio, con l'overlay come sorgente browser), i filtri
   audio e l'uscita verso il tramite con un gettone della sessione: la chiave
   della piattaforma resta sul server. OBS porta tutto quello che il browser
   non ha (audio di una sola applicazione su Windows, NVENC/QSV/AMF/VideoToolbox,
   VST, NDI, camera virtuale, scorciatoie globali) e lo streamer non configura
   niente a mano. Costo basso: nessun binario nostro da firmare e mantenere.
2. **Un'applicazione nostra sul dispositivo** («il ponte di SocialBot»), solo
   se le misure diranno che serve: per esempio l'unione di più connessioni
   (wifi e telefono insieme) per le dirette in giro, o l'audio di una sola
   applicazione su macOS senza OBS. Regole se si fa: si collega lei al server
   (nessuna porta aperta sul pc), si abbina con una passkey o un codice breve,
   esegue solo un elenco chiuso di comandi, si aggiorna da sola con firma
   verificata. Costo vero: tre sistemi, firma su Windows e notarizzazione su
   macOS, manutenzione a ogni sistema nuovo.
3. **OSify**, dove tutto questo è già di casa (PipeWire, codificatori, QoS).

In tutti e tre i casi il dispositivo dice al pannello cosa sa fare (scheda
video, codificatori, audio per applicazione, camere) e lo Studio sceglie da
sé: lo streamer non deve sapere cos'è NVENC. E il server resta un tramite:
nessuna di queste strade gli aggiunge lavoro.

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
