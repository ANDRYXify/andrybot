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

## Lo Studio come OBS, il verticale e la memoria

Quello che lo streamer costruisce non si perde, lo Studio si usa come OBS, e
la stessa diretta esce orizzontale, verticale o in tutti e due i modi.

### Il modello (`src/web/public/js/studio-modello.js`)

Puro, senza DOM: lo usano il pannello e il server, e le prove lo fanno girare
in Node. Un posto solo, quindi pannello e server non possono capirlo diverso.

- **Due formati**: orizzontale 1280×720 (`o`) e verticale 720×1280 (`v`).
- **Una scena** ha un nome e delle fonti. **Ogni fonte ha sempre tutte e due
  le posizioni**, `pos.o` e `pos.v`, ognuna con la sua visibilità. È
  l'invariante che regge il resto: una fonte aggiunta in un formato nasce
  anche nell'altro, al posto giusto per quel formato. Così non esiste una
  scena «che in verticale non c'è».
- **Un media** (immagine, GIF, video) nella scena non è il file: è un
  **segnaposto** con l'impronta del contenuto (SHA-256), il nome, il tipo e le
  misure.
- **Il documento** che si salva tiene le scene, quale scena è in onda, i
  preset e le scelte (formati accesi, transizione, modalità studio).
  `normalizza()` lo rende sempre valido: tagli alle misure, numeri dentro la
  tela, tipi conosciuti. Il pannello lo usa leggendo, il server salvando: un
  documento storto non entra e non esce.
- **Migrazione**: i preset di prima (una posizione sola, media senza
  impronta) diventano orizzontali con la verticale calcolata. Un media senza
  impronta resta un segnaposto da ricollegare scegliendo il file.

### La memoria

- **Le scene stanno sull'account**, in `studio_scene`, **cifrate** come le
  chiavi: i nomi dei file e i testi possono dire cose della persona. Si
  salvano da sole, un secondo e mezzo dopo l'ultima modifica, e quando si
  chiude la pagina. Si ritrovano su ogni computer.
- **Ogni salvataggio porta la versione su cui è nato.** Se un'altra finestra
  ha salvato nel frattempo, il server dice di no (409) e la pagina chiede se
  ricaricare quelle nuove: due finestre non si cancellano il lavoro a
  vicenda in silenzio.
- **I file restano sul dispositivo** (IndexedDB del browser), per impronta: non
  passano dal server, non pesano sulla macchina e non vengono ricompressi. La
  pagina chiede al browser di tenerli (`storage.persist`), così non li butta
  quando lo spazio stringe.
- **Dove il file non c'è** (un altro computer, dati del browser cancellati),
  il segnaposto si vede **solo nell'interfaccia**, mai sulla tela, quindi mai
  in onda: un riquadro con il nome e «Ricarica questo file». Scegliendo lo
  stesso file l'impronta coincide e torna a posto in tutte le scene e i preset;
  un file diverso si può legare lo stesso, a mano.
- I file che nessuna scena e nessun preset usa più si tolgono dal dispositivo
  al salvataggio.
- Cancellare l'account cancella le scene (la tabella ha il login). Nei dati
  scaricati le scene escono in chiaro, perché sono della persona; le chiavi
  di trasmissione no, come ogni chiave.

### Come OBS, di serie

Sul computer lo Studio ha la disposizione di OBS:
- in alto la tela;
- sotto, i pannelli **Scene**, **Fonti**, **Mixer audio**, **Transizioni** e
  **Controlli**;
- più sotto le **Proprietà** della fonte scelta e la **Chat live**.

Le proprietà di una fonte si aprono dalla fonte. Le impostazioni (ingressi,
qualità, destinazioni, riserva, formati) stanno in **Impostazioni**, nei
Controlli. I nomi sono quelli di OBS, così chi viene da OBS si ritrova.

**Modalità studio.** A sinistra l'**anteprima**, dove si lavora; a destra il
**programma**, cioè quello che è in onda e che il codificatore manda.
- Un clic su una scena la porta in anteprima; un doppio clic la manda in onda.
- «Transizione» manda in onda l'anteprima con un **taglio** o una
  **dissolvenza** della durata scelta. Durante la dissolvenza il programma
  disegna le due scene mescolate, quindi la transizione va in onda davvero.
- Dopo la transizione anteprima e programma si scambiano, come in OBS.

Fuori dalla modalità studio c'è una tela sola, il programma, e si lavora
direttamente su quella. La scelta si ricorda sull'account.

**Il verticale.** Sopra la tela c'è «Orizzontale / Verticale» per lavorare
sulla posizione delle fonti in ogni formato. La scena è una sola, le posizioni
sono due. Se il verticale non è acceso, non compare da nessuna parte: chi non
lo vuole non lo vede.

### Gli overlay: i tuoi, uno per scena

La fonte **Overlay** prende uno degli overlay creati nell'Overlay Studio, e
ogni scena ha il suo: la scena «Gioco» può usare un overlay e «Chiacchiere»
un altro. La scelta sta nel pannello Fonti, nelle proprietà della fonte e,
sul telefono, in «Altro».
- Una fonte senza scelta segue **quello di serie** (`scelte.overlay`), che si
  fissa al primo caricamento e non si sposta quando si sceglie per una scena:
  scegliere l'overlay di una scena non cambia mai le altre.
- Un overlay cancellato non rompe niente: la fonte passa a quello di serie, e
  poi al primo che c'è (`overlayDi` nel modello).
- Una scena nuova nasce con l'overlay, così passando a quella scena gli alert
  non spariscono dalla diretta. Una scena con solo l'overlay conta come vuota:
  le scene pronte del telefono ci entrano al suo posto.
- In onda il flusso degli eventi è quello dell'overlay della scena in onda;
  cambiando scena si ricollega da sé, se l'overlay è un altro.
- Oggi dalla fonte Overlay arrivano **alert, chat ed effetti**, alle posizioni
  di quell'overlay. Gli altri pezzi dell'Overlay Studio (obiettivi, timer,
  player e il resto) non si disegnano ancora sulla tela: vedi «Dopo: le scene
  dell'Overlay Studio».

### Il peso: lo Studio lavora solo quando serve

Misurato in Chromium sulla demo: prima lo Studio consumava il 10% del
processore da fermo e il 7,6% anche su un'altra scheda; con una fonte video il
31%. Le regole che lo tengono leggero (ognuna con la sua prova nel collaudo):
- il disegno gira solo con la scheda Studio aperta, la regia del telefono
  aperta o in diretta; fuori, si ferma;
- a riposo (scena ferma, niente diretta) non si disegna e il ciclo dorme: lo
  risveglia un cambiamento (una fonte che si muove, un evento dell'overlay, una
  modifica);
- fuori diretta al massimo 30 disegni al secondo; in diretta quanti ne chiede
  il codificatore;
- fuori diretta si disegna solo il formato che si guarda, e la tela ha la
  misura dello schermo; la risoluzione piena torna al via, perché è lei che va
  al codificatore;
- la tela scorsa fuori dallo schermo non si disegna;
- nello Studio e in diretta lo sfondo animato del sito si ferma.

Dopo: 0% da fermo, 0,5% su un'altra scheda, circa la metà con una fonte video.

### Le dirette, una per formato

- **Ogni destinazione ha il suo formato.**
  - Twitch è solo orizzontale: il doppio formato di Twitch passa da un canale
    che dal browser non c'è.
  - Kick, YouTube e gli altri RTMP si scelgono orizzontali o verticali.
  - TikTok ha il suo tipo di destinazione; Instagram passa da «Altro servizio
    RTMP».
- **Due formati accesi sono due dirette vere**: due tele, due codificatori
  video sul dispositivo, due sessioni del tramite (`login` e `login#v`),
  ognuna col suo turno, la sua riserva e il suo permesso dello scudo. La banda
  si conta per tutte e due. L'audio è lo stesso mix, codificato per ognuna.
- Partono e si fermano insieme. Se una cade, l'altra continua, e il pannello
  dice quale.

### Sul telefono: la regia a portata di pollice

Dal telefono si va in diretta con le mani e basta, spesso con una mano
sola, camminando, col sole sullo schermo. Lo Studio del computer, stretto,
sarebbe scomodo e pericoloso: un tocco sbagliato chiude la diretta. Per
questo sul telefono lo Studio apre una **regia** sua, a schermo intero.

**Le regole che la reggono** (ognuna ha la sua prova in
`scripts/verifica-studio-diretta.mjs`):
1. **Lo schermo è il programma.** Si vede quello che va in onda, non
   un'altra cosa.
2. **Il pollice arriva a tutto.** Quello che serve in diretta sta nella metà
   bassa dello schermo, e ogni tasto è largo almeno 48 punti.
3. **Niente di grave con un tocco.** Per chiudere la diretta si tiene premuto
   il tasto per un secondo e mezzo. Il tasto «indietro» del telefono chiude i
   pannelli, mai la diretta. «Blocca i tocchi» rende lo schermo sordo (in tasca,
   su un supporto) e si sblocca solo tenendo premuto.
4. **Le interruzioni sono normali.** Pagina in secondo piano, una chiamata,
   la rete che cambia: va in onda la riserva, e al ritorno la regia riprende da
   sola fotocamera e microfono, senza tasti.
5. **La seconda volta è un tocco.** Scenario, formato e destinazioni si
   ricordano: si apre, si preme «Vai live», tre secondi per mettersi in posa.
6. **Si dice quello che il telefono non sa fare**, invece di provarci male.

**Gli scenari** (`SCENARI` in `studio-modello.js`). Si sceglie cosa si fa, e
la regia si prepara di conseguenza:

| scenario | fotocamera | audio | scene pronte | chat |
|---|---|---|---|---|
| In giro (IRL) | dietro | voce: riduzione del rumore ed eco | In giro, Pausa, Privacy | sullo schermo, e a voce in cuffia se la si accende |
| In camera (chiacchiere) | davanti | voce | In camera, Torno subito | grande sullo schermo |
| Mani al lavoro (cucina, disegno, creazioni) | dietro | voce | Il lavoro, Io, Pausa | a voce di serie: le mani sono occupate |
| Musica dal vivo | davanti | **senza filtri**: niente riduzione del rumore, niente eco, niente guadagno automatico, che rovinano strumenti e voce cantata | Sul palco, Pausa | sullo schermo |
| Gioco sul telefono | — | — | — | — |

**Il gioco sul telefono non si può fare dal browser**, e la regia lo dice
invece di far finta: il browser del telefono non condivide lo schermo
(Android non in modo affidabile, iPhone mai), e appena si passa al gioco il
telefono ferma la pagina. Le strade vere: giocare sul computer e andare in
diretta dallo Studio lì; collegare il telefono al computer con una scheda di
acquisizione o la sua app di mirroring, e lo Studio lo vede come una
fonte; oppure l'app ufficiale della piattaforma, sapendo che lì l'overlay non
c'è (chat, comandi e alert del bot invece sì).

**Le scene pronte.** Se le scene sono ancora vuote, scegliere uno scenario le
crea. Se lo streamer le ha già fatte (anche dal computer) restano le sue: le
pronte si aggiungono solo se le chiede. Dal computer si aggiungono con «Scene
pronte» nel pannello Scene, così le prepara con calma prima di uscire. Ogni
scena pronta ha le posizioni giuste in tutti e due i formati: la fotocamera
riempie la tela, le scritte stanno al centro, l'overlay sopra. Una scena può
**spegnere il microfono** finché è in onda (Pausa, Torno subito): lo spegne la
scena, non un tasto da ricordare, e si riaccende tornando alla scena di
prima.

**La regia, dall'alto in basso.**
- In alto, piccolo: lo stato (pronto, o in diretta col tempo), gli spettatori,
  la rete in tre tacche (rossa quando va in onda la riserva), la batteria.
- Al centro il programma, a tutto schermo. Scorrendo col dito a destra o a
  sinistra si cambia scena; con due dita si fa lo zoom e, spostandole insieme,
  si sposta l'inquadratura; due tocchi girano la fotocamera.
- A destra, sopra le scene, due tasti tondi: lo zoom a tocchi (1×, 2×, 3× e di
  nuovo 1×) e il foglio «Fotocamera».
- In basso a sinistra la chat, con le scritte grandi e un fondo che si legge
  anche al sole; la si ingrandisce con un tocco, e può leggerla una voce in
  cuffia. Gli alert compaiono in alto e il telefono vibra, dove si può.
- Sopra la barra, le scene come pulsanti grandi.
- La barra del pollice: microfono, gira la fotocamera, **Vai live** (in
  diretta diventa ■, da tenere premuto), chat, «Altro».
- «Chat»: la chat intera, la grandezza delle scritte, la voce che la legge,
  e se tenerla sullo schermo.
- «Fotocamera»: gira, specchia, l'obiettivo, lo zoom, l'inquadratura, la luce
  e la torcia (vedi sotto).
- «Altro»: la fotocamera, blocca i tocchi, clip (Twitch), vibrazione agli
  alert, quale formato guardare (con tutti e due accesi), scenario e
  destinazioni (prima di partire), lo Studio completo, l'overlay della scena,
  il microfono (quello del telefono, le cuffie col filo, gli AirPods, uno
  esterno), e «Chiudi la diretta…» con la conferma, per chi non può tenere
  premuto.
- I messaggi della regia passano da un posto solo, sotto la riga in alto:
  sopra ai fogli aperti, mai sopra ai tasti.
- La pressione lunga non apre il menù del telefono, e il clic che certi
  browser mandano al rilascio non fa ripartire niente.

**Prima di partire** la regia chiede, una volta: cosa fai (lo scenario), il
formato, dove va la diretta, e titolo e categoria (con le categorie giuste
dello scenario a portata di tocco: IRL, Just Chatting, Music, Food & Drink,
Art). Poi controlla quello che può: fotocamera e microfono, codifica del
telefono, batteria. Twitch non riceve il verticale: se il formato è solo
verticale e Twitch è fra le destinazioni, lo dice.

**Cosa legge e cosa no.** Batteria e tipo di rete li legge il telefono, dove
il browser li dà (Android sì, iPhone no), e non lasciano il dispositivo. La
voce che legge la chat è quella del telefono, non passa da noi; va usata
con le cuffie, perché dall'altoparlante finirebbe nel microfono.

**Cose del telefono da sapere.**
- Schermo intero e orientamento bloccato ci sono su Android; sull'iPhone
  il browser non li concede, e l'aiuto suggerisce «Aggiungi alla schermata
  Home», che apre il sito senza barre.
- Sull'iPhone serve iOS 26 o più recente: prima Safari non codificava l'audio.
- Lo schermo non si spegne durante la diretta (Wake Lock). Se si passa a
  un'altra app il telefono ferma la pagina: va in onda la riserva fino al
  ritorno, entro i minuti scelti, e la regia lo dice prima di partire.

### La fotocamera del telefono

**Il difetto da cui si parte.** Andando in verticale dal telefono la
fotocamera usciva ingrandita tre volte. Lo Studio chiedeva l'immagine coi
numeri del verticale (720×1280). Ma i browser applicano i vincoli sempre come
il sensore, in orizzontale: Safari su iOS 26, chiesto il verticale, rende il
formato orizzontale del sensore senza girarlo (WebKit 323550). E lo Studio
disegnava ogni fotocamera «a riempire»: un 16:9 dentro un 9:16 lascia vedere
il 32% della larghezza, cioè uno zoom di 3,16 volte.

**Corretto per costruzione.**
- La fotocamera si chiede sempre coi numeri orizzontali: è il telefono a
  girarla come lo si tiene. Non ci si fida di quello che la traccia dice di
  sé: si disegna dal frame vero, a ogni fotogramma, e quando il frame cambia
  forma (si gira il telefono) il `<video>` lo dice e la tela si ridisegna.
- Una geometria sola, pura, nel modello: `inquadra(frame, riquadro,
  inquadratura, {zoom, specchio})`. Garantisce, e il collaudo lo prova su
  migliaia di casi: la parte presa sta dentro il frame, il disegno sta dentro
  il riquadro, le proporzioni restano quelle vere (niente stirato).
- Tre modi, per ogni fonte e per ogni formato, salvati con la scena:
  **Automatica** (di serie) riempie il riquadro, ma se per riempirlo dovesse
  tagliare più di un terzo dell'immagine la mostra intera; **Riempi** taglia i
  bordi sempre; **Intera** non taglia mai. Le bande che restano sono lo stesso
  video, sfumato e scurito, come fanno le app dei social; per le immagini
  restano trasparenti (un logo PNG non prende un fondo).
- Dove l'immagine è tagliata o ingrandita si sceglie quale parte si vede: con
  due dita sulla regia, coi cursori nelle Proprietà sul computer. Il centro non
  esce mai dal frame, e dove non c'è margine non si muove (uno zoom dopo non
  salta al bordo).

**Lo zoom è della fotocamera, come nell'app Fotocamera:** vale in tutte le
scene e in tutti e due i formati. Se la fotocamera ha uno zoom suo (molti
Android, alcuni iPhone) lo Studio usa quello, e l'immagine resta nitida; se
non ce l'ha, o lo rifiuta, ingrandisce lo Studio, fino a 3×, e lo dice (oltre
2× si sgrana). Lo zoom non resta mai senza effetto. Torna a 1× quando si
cambia fotocamera, come nel telefono.

**L'obiettivo.** Il foglio «Fotocamera» elenca le fotocamere coi nomi che dà
il telefono, già nella sua lingua (grandangolo, ultra grandangolo,
teleobiettivo, frontale); quelli di Android («camera2 0, facing back») si
leggono «Dietro 1», «Davanti 2». L'obiettivo scelto si ricorda per il suo lato:
girando e tornando dietro torna quello. Se un obiettivo ricordato non c'è più
(un altro telefono, un permesso tolto) si apre quello di serie, senza errori,
e lo si dimentica. Scelte e specchio stanno nel browser del dispositivo, non
sul server.

**Specchia** vale per la fotocamera davanti: anche il pubblico vede come allo
specchio, e le scritte escono al contrario; di serie è spento.

**Luce e torcia** compaiono solo dove la fotocamera le sa fare (la luce è la
compensazione dell'esposizione di Chrome su Android).

**Il telefono storto.** Se la diretta è verticale e il telefono è tenuto di
lato (o il contrario), l'immagine si vede intera con le bande sfumate e la
regia dice come tenerlo; raddrizzato, l'avviso sparisce da solo.

**Sul computer** le Proprietà di ogni webcam, schermo, video o immagine
hanno «L'immagine nel riquadro» e i due cursori per spostarla; sotto la
scelta della fotocamera, lo zoom e lo specchio. Un microfono o una fotocamera
attaccati dopo compaiono da soli.

### Più dispositivi, una regia

Chi fa IRL, o vuole cambiare stanza senza portarsi dietro il computer, collega
alla regia il telefono: anche più di uno, un tablet, un altro computer. Il
computer con lo Studio aperto fa il lavoro pesante: compone le scene, codifica,
manda alle piattaforme. I dispositivi mandano solo il loro video e la loro
voce, e diventano:

- **un'inquadratura in più**: la fonte «Telefono o altro dispositivo», in
  qualunque scena, che si sposta, si inquadra e si zooma come una webcam;
- **il protagonista**: «Fallo protagonista» crea (o ritrova) la sua scena, col
  suo video a tutta tela sotto l'overlay e la sua voce, e la manda in onda. In
  quella scena il microfono del computer tace. È una scena come le altre: lo
  streamer la cambia come vuole, e i microfoni di ogni scena si scelgono.

Il controllo resta alla regia del computer, in tutti e due i casi.

**Il modello.** Tre ruoli. La REGIA è una finestra dello Studio del
proprietario, una per canale. Il DISPOSITIVO manda video e audio alla regia e
non codifica niente per le piattaforme. COMANDA è un diritto in più: dal
dispositivo si cambia anche scena, si prende la scena, si legge la chat, si
chiude la diretta tenendo premuto. Ce l'ha di serie il telefono dello
streamer entrato col suo account; non ce l'ha chi entra col QR (un amico che
fa da operatore); si cambia dalla regia, dispositivo per dispositivo.

**Come si collega.**
- Dalla regia, «Collega un telefono» mostra un QR, un link e un codice di sei
  cifre: valgono una volta e per dieci minuti. Il telefono inquadra il QR (o
  apre `socialbot.live/cam` e scrive il codice), si dà un nome e si collega.
  Da quel momento si ricorda: torna con un tocco, senza codice.
- Il telefono dello streamer, già entrato col suo account: lo Studio aperto
  sul telefono, se la regia è sul computer, propone «Collega come
  fotocamera». Niente codice, e riusa la sua chiave: ricollegarlo non crea un
  dispositivo nuovo.

**Cosa vede chi è inquadrato.** Bordo rosso e «IN ONDA» quando la sua
immagine è nella scena in onda (in uno dei formati che vanno in diretta),
verde e «IN ANTEPRIMA» nella modalità studio, niente altrimenti; il telefono
vibra quando entra in onda. Poi la qualità della rete, la batteria, lo
schermo che resta acceso, e i tasti: microfono, gira, zoom (il suo, o quello
della regia se la fotocamera non ne ha uno), obiettivo, torcia. Il foglio
«Altro» stacca la fotocamera (con «Ricollega» per tornare) o la dimentica.

**I microfoni della scena.** Ogni scena dice quali microfoni vanno in onda:
quello del computer (di serie), quelli dei dispositivi che si vedono nella
scena, tutti e due, o nessuno (pausa). Un dispositivo che non si vede in
scena non parla. Il mixer ha un canale per dispositivo, col suo volume.

**Se il protagonista si perde.** Resta l'ultimo fotogramma; dopo 5 secondi
senza segnale si torna alla scena di prima (o alla prima scena senza di lui),
e la regia lo dice. Quando torna, e in onda c'è ancora la scena di ripiego,
dopo 2 secondi di segnale buono si torna a lui da soli. Se intanto lo
streamer ha scelto un'altra scena, vale la sua scelta.

**La tenuta, corretta per costruzione.** Il video va da pari a pari; il
server passa solo i segnali per trovarsi. Da qui gli invarianti:
- un buco dei segnali (il server che si riavvia, un proxy, il telefono che
  cambia antenna per un attimo) non tocca un collegamento vivo. Il telefono,
  se la regia sparisce dai segnali ma il video passa, aspetta 10 secondi
  prima di chiudere; la regia non chiude un collegamento vivo perché il
  telefono è sparito dai segnali;
- ogni regia ha un suo «giro»: la stessa finestra che si ricollega tiene il
  suo, una finestra nuova (pagina ricaricata, altra scheda) ne ha uno nuovo,
  e i dispositivi rifanno il collegamento da capo. Un riavvio del
  collegamento (ICE restart) verso una regia che quella sessione non l'ha
  mai vista girerebbe a vuoto: non si fa;
- una regia in diretta non si ruba: un'altra finestra aspetta. Ferma, la
  regia passa all'ultima finestra aperta, e la vecchia lo dice col tasto
  «Fai la regia da qui»;
- un collegamento che cade con la stessa regia si riprende da solo (ICE
  restart dopo 4 secondi di silenzio); se in 20 secondi non riparte, si
  rifà da capo e il telefono dice di provare la stessa Wi-Fi del computer;
- i segnali arrivano per il flusso di sempre del sito (`flusso.js`: riapre
  dopo un 502, sente il battito ogni 25 secondi e si accorge di un
  collegamento rimasto appeso); il telefono a ogni apertura chiede un
  biglietto nuovo, monouso, perché la sua chiave non stia in un indirizzo.

**Quanti.** Ricordati fino a 8 per canale, collegati insieme fino a 4; il
nono prende il posto di quello visto meno di recente e non collegato. Il
computer decodifica un video per dispositivo: quattro 720p a 30 fotogrammi
stanno in un portatile recente. La qualità (720p o 1080p) si sceglie dalla
regia, dispositivo per dispositivo.

**Sicurezza e dati.**
- La chiave del dispositivo sta solo nel suo browser: il server ne tiene
  l'impronta (sha256), il nome dato al dispositivo (cifrato), se comanda, e
  quando è stato creato e visto. Togliere un dispositivo spegne subito la sua
  chiave, e il telefono lo dice.
- Il video è cifrato da un capo all'altro (DTLS-SRTP) e non passa dal server;
  con il ponte TURN passa dal ponte, sempre cifrato, senza essere registrato.
- I segnali passano solo fra la regia di un canale e i dispositivi di quel
  canale; messaggi piccoli (24 KB), a numero limitato.
- Inviti e biglietti per ascoltare stanno solo in memoria: monouso, dieci
  minuti e un minuto. I codici sbagliati hanno un tetto per indirizzo (10 al
  minuto) e in tutto (200 al minuto): chi prova da mille indirizzi non
  indovina un codice di sei cifre nei dieci minuti in cui vale.
- Batteria e rete del telefono vanno alla regia per il canale diretto, non al
  server. Cancellare l'account dimentica dispositivi, inviti e collegamenti.

**Quando le reti non si parlano.** Quasi sempre telefono e computer si
trovano da soli, coi server STUN pubblici (Google, Cloudflare). Alcune reti
mobili o aziendali non lo permettono: serve un ponte TURN. È facoltativo, e
si fa con coturn:

```
# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535
use-auth-secret
static-auth-secret=<una parola lunga e casuale>
realm=socialbot.live
cert=/etc/letsencrypt/live/turn.socialbot.live/fullchain.pem
pkey=/etc/letsencrypt/live/turn.socialbot.live/privkey.pem
no-cli
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
```

Nel firewall: 3478 (UDP e TCP), 5349 (TCP), e 49152-65535 UDP. Nel `.env`:
`TURN_URL=turn:turn.socialbot.live:3478,turns:turn.socialbot.live:5349` e
`TURN_SEGRETO=` la stessa parola. Ai browser escono solo credenziali a tempo
(sei ore), firmate con quella parola: la parola non esce mai. Il video che
passa dal ponte conta nella banda del server. Senza ponte, la regia dice di
mettere il telefono sulla stessa Wi-Fi del computer.

**Dove sta.** Il salotto dei segnali in `src/features/studio-dispositivi.js`
(puro, provato in `test/unita/studio-dispositivi.test.mjs`); le rotte in
`src/web/rotte-dispositivi.js`; la pagina del telefono `cam.html`, `cam.js`
e `js/studio-camera-remota.js`; la regia in `js/studio-remoti.js` e nello
Studio. Il modello (fonte `remota`, microfoni della scena, protagonista,
tally, ripiego) in `studio-modello.js`.

**Il collaudo** (`scripts/verifica-studio-dispositivi.mjs`): una regia e dei
telefoni veri, con la fotocamera finta di Chromium, in WebRTC attraverso le
rotte vere e l'archivio cifrato. Misura il video che arriva e si disegna,
il bordo rosso, il protagonista con la sua voce e il computer muto, chi
comanda, la caduta e il ritorno, i buchi dei segnali (si tagliano dal
server) che non staccano il video, la regia che passa a un'altra finestra,
il telefono dello streamer che non si moltiplica, la revoca, e la pagina del
telefono in verticale e di lato. Con `--selftest` rimette un difetto per
promessa e li vuole rossi tutti.

## Dopo: le scene dell'Overlay Studio

Il passo dopo: lo Studio della diretta parte anche dalle scene che lo
streamer ha già fatto nell'Overlay Studio, oltre alle sue. Una scena è l'overlay di sempre più le sorgenti
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
