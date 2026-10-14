<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Le pubblicazioni automatiche

Tre momenti della settimana di uno streamer escono da soli, se li accende:

1. **Prima della diretta.** La storia «Stasera alle…» del giorno, un tempo
   scelto prima dell'inizio: 15 o 30 minuti, 1, 2, 3, 4, 6, 8 o 12 ore.
2. **Quando vai in diretta.** La storia «Live ora», su qualunque piattaforma
   apra la serata. C'è già (`features/storia-ig.js`, docs/GRAFICHE.md): qui si
   accende accanto alle altre, e si prepara con le stesse regole, con una
   differenza detta sotto (le grafiche salvate dopo la fanno solo rifare).
3. **La settimana.** La grafica della Settimana nei posti di «Manda» (Telegram,
   Discord, la storia di Instagram), il giorno e all'ora scelti; di serie la
   domenica alle 18. Con «Chiedimi prima» acceso (di serie), il giorno prima
   arriva una mail: «Va bene così» e la settimana esce; «La cambio» porta alla
   Settimana nel pannello. Senza conferma non esce niente.

Si accendono in un posto solo, la carta «In automatico» delle Grafiche, e ogni
riga dice quando uscirà la prossima e com'è andata l'ultima. La Settimana
rimanda lì, e mostra la richiesta di conferma quando c'è.

## Chi disegna

Il server non ha un browser, e le grafiche le disegna il motore del pannello
(`grafDisposizione` e compagnia, docs/GRAFICHE.md). Quindi le immagini delle
automatiche le prepara il pannello, con lo stesso motore dell'anteprima, e le
manda al server:

- quando accendi un'automatica;
- ogni volta che salvi le Grafiche;
- ogni volta che salvi la Settimana;
- ogni volta che salvi lo stile del QR;
- da sole, all'apertura del pannello, se qualcosa di acceso è rimasto
  indietro o è da rifare (sotto).

Per «Prima della diretta» sono una storia per ogni giorno in onda (al massimo
sette), ognuna col suo gioco, la sua copertina e il suo testo. Per «La
settimana» sono due: il post e la storia.

Ogni immagine esce dal pannello da `grafEsporta`, la stessa strada di PNG,
Condividi e «Manda»: il QR col tuo stile è pronto prima della foto (logo
compreso), e si rilegge nella JPEG vera prima di mandarla. Un'immagine il cui
QR non si rilegge non parte: il pannello dice cosa cambiare. Il perché e i
gradini del QR stanno in docs/GRAFICHE.md, capitolo 12.

Il pannello non disegna con quello che ha in memoria: la vista
(`GET /api/streamer/automatiche`) gli dà la versione delle Grafiche,
l'impronta della Settimana, lo stile del QR (`qr`) e la sua firma
(`firmaQr`). Se la versione o la settimana che ha non tornano con quelle del
server, rilegge le impostazioni prima di disegnare.

## Un'immagine vecchia non esce

Ogni immagine porta con sé da dove è nata: l'impronta della Settimana e la
versione delle Grafiche (un numero che il server alza a ogni salvataggio). Nel
momento di pubblicare il server le confronta con quelle di adesso: se non
combaciano, la grafica racconterebbe una settimana che non c'è più, e non
esce. Lo si dice nel pannello, e su Telegram se è collegato, con cosa fare
(aprire le Grafiche basta: si ripreparano da sole). La finestra è stretta per
costruzione: salvare le Grafiche o la Settimana le riprepara subito.

La storia «Live ora» fa eccezione: una versione delle Grafiche diversa la
rende «da rifare», non vecchia (sotto), e se vai in diretta parte. Lì non c'è
una settimana da raccontare, e una «Live ora» col titolo di ieri è meglio di
una diretta senza storia.

## Un QR di prima esce lo stesso

Ogni immagine porta anche la **firma del QR** con cui è nata
(`firmaStileQr`, docs/GRAFICHE.md): lo stile normalizzato, senza testo e
cornice, con la versione del disegno e, col logo «la tua foto», l'indirizzo
della foto. Qui la regola è l'opposto della versione:

- **una firma diversa o assente non ferma niente.** L'immagine è «da rifare»
  (`daRifare` nella vista, per nome), ma se è il momento esce: il QR funziona
  e porta allo stesso posto, cambia solo l'aspetto. Una storia mancata per un
  colore del QR sarebbe un danno più grande del colore;
- l'ultima uscita lo ricorda (`qrVecchio: true`) se è partita con un'immagine
  da rifare;
- un'immagine che non c'è non è «da rifare», è da fare: lo dice `pronte`. Il
  pannello prepara quello che ha `!pronte[n] || daRifare[n]`.

Quando il pannello manda un'immagine rimanda la firma che la vista gli ha dato.
Se intanto lo stile è cambiato, il server risponde 409 col codice
`qr-cambiato` e la firma di adesso, e tiene l'immagine di prima: quella nuova
nascerebbe già vecchia. Il pannello rilegge e ridisegna, una volta. Una firma
assente (un pannello di prima) si accetta, e l'immagine si salva da rifare.

## Il testo del giorno

La storia automatica non usa il «Quando» scritto a mano, che vale per un
giorno solo: usa il testo del giorno come lo calcola la Home
(`_quandoProssima`), riferito al momento in cui la storia esce. Esce lo
stesso giorno: «Stasera alle 21:00», o «Oggi alle 15:00». Con un anticipo che
scavalca la mezzanotte (diretta alle 00:30, storia due ore prima) esce
«Domani alle 00:30»: è vero nel momento in cui la si legge.

## Quando esce, e una volta sola

- **Prima della diretta.** Per il prossimo giorno in onda (`prossimaVolta`,
  nel fuso della Settimana, anche a cavallo del cambio d'ora) la storia esce
  quando mancano l'anticipo o meno, e prima dell'inizio. Se sei già in
  diretta non esce: tocca a «Live ora». Se il server era fermo nel momento
  giusto e riparte dopo l'inizio, non la recupera fuori tempo.
- **La settimana.** Esce nell'ora scelta, entro un'ora; dopo, per quella
  settimana, non più.
- Lo stato ricorda cosa è uscito, per chiave: l'istante d'inizio della
  diretta, il lunedì della settimana. Un giro che ripassa non pubblica due
  volte.

## La conferma della settimana

- La richiesta parte 24 ore prima dell'uscita (subito, se l'uscita è più
  vicina di così quando accendi). Arriva alla mail dei rapporti, se è
  confermata, e su Telegram, se è collegato.
- «Va bene così» apre una pagina con il riassunto della settimana e un tasto:
  conferma chi preme, non chi apre il link (i programmi che controllano la
  posta aprono i link da soli). Il link è personale e scade con l'uscita.
- Si conferma anche dal pannello, con lo stesso effetto.
- Salvare la Settimana non conferma da solo: la conferma è una scelta, non un
  effetto collaterale. Dopo un salvataggio il pannello la chiede.
- Senza mail e senza Telegram la richiesta sta solo nel pannello, e la carta
  lo dice. Con «Chiedimi prima» spento la settimana esce ogni volta.

## «Non pubblicare»

Chi conferma e poi si accorge di un errore, o legge tardi e non vuole che
esca, deve poterla fermare senza cercare dove. Quindi la mail, il messaggio su
Telegram, la pagina del link e il pannello hanno tutti «Non pubblicare».

- **Confermata e fermata sono due risposte alla stessa domanda**, e per
  un'uscita ne vale una sola, l'ultima data: fermare toglie la conferma,
  confermare toglie il fermo. Fino all'uscita si può passare dall'una
  all'altra quante volte si vuole.
- Il link di «Non pubblicare» è quello della conferma con `fai=ferma`: stessa
  chiave, stessa scadenza, e una pagina che chiede di premere, per la stessa
  ragione della conferma. Una volta ferma, la pagina offre «Pubblicala lo
  stesso»; una volta confermata, «Non pubblicare».
- Il fermo vale anche con «Chiedimi prima» spento: dal pannello si ferma
  l'uscita che arriva, e quella dopo esce come sempre.
- Il giro salta un'uscita fermata con il suo motivo (`fermata`, «l'hai fermata
  tu»), diverso da una non confermata: sono due storie diverse, e il pannello le
  racconta diverse.

## Dove sta lo stato

In un file per streamer, accanto alle immagini, come la storia della diretta:
cosa è acceso, l'anticipo, il giorno e l'ora della settimana, le conferme,
l'ultima uscita di ognuna e perché, e per ogni immagine da dove è nata
(impronta, versione, firma del QR, anticipo). Non nelle impostazioni, che si
riscrivono da altre strade: un interruttore che un salvataggio altrui potesse
spegnere in silenzio sarebbe peggio di nessun interruttore.

## I perché, nella lingua di chi legge

Quando un'uscita non parte per una ragione nostra, lo stato tiene un codice
(`non-pronta`, `settimana-cambiata`, `grafiche-cambiate`, `anticipo-cambiato`,
`in-diretta`, `non-confermata`, `fermata`, `nessun-posto`): il pannello lo dice nella
lingua di chi lo usa, e su Telegram va la frase in italiano. Un rifiuto di
Instagram, di Telegram o di Discord arriva com'è. Lo stesso vale per il 409 di
una firma superata: la frase del server è in italiano, il pannello parte dal
codice (`qr-cambiato`).

## Nel pannello

- **Grafiche, «In automatico»**: tre righe, «Prima della diretta» (con
  l'anticipo), «Quando vai in diretta» (l'interruttore di «Live ora», che
  prima stava nel riquadro di Instagram: ora le automatiche stanno tutte
  qui) e «La settimana» (giorno, ora, «Chiedimi prima se va bene»). Sotto
  ognuna, quando esce la prossima e com'è andata l'ultima; per la settimana,
  il tasto «Va bene così» finché non è confermata, «Non pubblicare» quando
  sta per uscire, «Pubblicala lo stesso» quando l'hai fermata.
- **All'apertura del pannello**, non solo delle Grafiche, il pannello del
  proprietario guarda se qualche immagine accesa è rimasta indietro o è da
  rifare (`pronte`, `daRifare` e `live` nella vista, solo per i giorni in
  onda) e la riprepara da solo, in un momento di quiete: otto secondi dopo e
  quando il browser è libero, una volta per sessione e per canale. È quello che
  promettono i messaggi di errore, e non dipende dal ricordarsi di aprire una
  scheda.
- **Salvare** le Grafiche o lo stile del QR riprepara la Live (se accesa) e le
  automatiche accese, e il messaggio dice cosa è stato rifatto. Un giro alla
  volta: uno nuovo ferma quello vecchio prima che mandi qualcosa.
- **Da rifare.** Sotto le uscite con un'immagine da rifare si legge «Sono di
  prima che cambiassi…»: se è il momento escono così, e intanto si rifanno da
  sole. Per «Prima della diretta» e «La settimana» vuol dire solo il QR (lo
  stile, o la foto col logo «la tua foto»): con le Grafiche cambiate
  l'immagine è vecchia, non da rifare, e non esce (sopra). Per la Live vale
  per tutte e due, e la riga accanto alla spunta lo dice.
- **Guardare cosa uscirà.** «Guarda cosa uscirà» (la prossima storia prima della
  diretta), «Guarda il post che uscirà» e «e la storia» (la settimana), «Guarda
  cosa partirà» (la Live) aprono l'immagine che il server tiene, così com'è:
  `GET /api/streamer/automatiche/immagine/:nome` e
  `GET /api/streamer/grafiche/storia-live.jpg`, solo per il proprietario, mai in
  cache (`private, no-store`), 404 se non c'è. Servono anche ai collaudi: è
  l'immagine vera che partirà, non una copia ridisegnata.
- **I moderatori** non vedono la carta: le porte delle immagini sono del solo
  proprietario, e il loro pannello dice che le storie automatiche le gestisce
  chi ha il canale. Uno stile del QR salvato da un moderatore rende «da
  rifare» le immagini, che si ripreparano quando il proprietario apre il
  pannello.
- **Settimana, «Mandala»**: una riga dice se la settimana esce da sola e
  quando, con «Va bene così»; se è spenta, porta alla carta.
- **Il motore delle grafiche** riceve la diretta da disegnare nella
  configurazione (`_prossima`, `_copertina`, `_rif`) invece di leggerla da
  una variabile globale: così la storia del mercoledì si prepara mentre
  l'anteprima mostra quella di stasera, senza toccarla.
