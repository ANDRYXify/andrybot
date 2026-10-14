<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Le grafiche social

Tre grafiche da pubblicare: la settimana (1080×1350), «Live ora» (1080×1080) e
«Stasera alle…» (1080×1350, capitolo 11), ognuna anche in formato storia
(1080×1920). Si disegnano nel browser, con lo stesso disegno per l'anteprima,
il PNG, la GIF, il video, l'immagine che «Manda» spedisce dalla scheda
Settimana e quelle che escono da sole (`docs/AUTOMATICHE.md`).

Il disegno sta in due posti: `app.js` compone la grafica (disposizione, testi,
righe, logo, QR), `graf-scene.js` disegna gli sfondi animati.

## 1. Una scena è una funzione del tempo che torna su se stessa

La GIF va a 12,5 fotogrammi al secondo. Perché giri senza uno scatto, il
fotogramma dopo l'ultimo deve essere il primo. Quindi ogni scena è
`disegna(ctx, W, H, fase, p)` con `fase` fra 0 e 1, e tutto quello che si muove
fa un numero **intero** di giri in un periodo.

La velocità non rompe questa regola, perché non è mai una frazione di giro:

| velocità | durata del giro | giri |
|---|---|---|
| lenta | 8 secondi | ×1 |
| normale | 4 secondi | ×1 |
| veloce | 4 secondi | ×2 |

La GIF fa un giro intero (50 fotogrammi, o 100 se è lenta), il video registra un
giro intero.

Niente `Math.random` nelle scene: stelle, gocce e petali nascono da un hash del
loro indice, e anche la grana dello sfondo. Ogni fotogramma si può rifare
identico, e il collaudo misura quello che vede chi guarda.

## 2. Il synthwave: una camera che guarda un pavimento finito

Il difetto di prima: le linee del pavimento partivano tutte dallo stesso punto,
la base del sole, e sembravano raggi. Le orizzontali erano equidistanti.

Il modello è una camera sopra un pavimento **finito**. Il bordo lontano del
pavimento è l'orizzonte che si vede, alla base del sole (`yOr`). Il punto di
fuga vero sta più su, nascosto dentro il sole (`yV`). Una linea del pavimento a
profondità `z` (1 sul bordo vicino) sta sullo schermo a

    y(z) = yV + (H − yV) / z

e un punto che sul bordo vicino sta in `xv` va a `W/2 + (xv − W/2) / z`. Il
bordo lontano è `z = zLon = (H − yV) / (yOr − yV)`. I numeri stanno in un posto
solo, `geometriaSynth`, che usano la scena, i test e il collaudo.

Da qui, senza aggiustamenti:

- le linee longitudinali, all'orizzonte, sono ancora distanziate: escono da
  sotto il sole lungo tutto l'orizzonte;
- le trasversali sono equidistanti **nel mondo**, quindi sullo schermo si
  infittiscono verso l'orizzonte;
- scorrendo verso chi guarda, avanzano di un passo intero per giro: vicino
  corrono, lontano quasi stanno ferme.

Il sole è tagliato dall'orizzonte e ha le sue strisce, che si allargano verso il
basso, solo dentro il disco. Davanti al sole le montagne, col bordo nella
seconda tinta.

## 3. La composizione viene dai testi

`grafDisposizione` decide dove sta ogni cosa, e il resto la legge.

- **L'orizzonte.** Il synthwave «poster», quello di serie, mette l'orizzonte
  subito sopra la prima riga (nel «Live ora», sotto il titolo): il sole sorge
  dietro il titolo, e sotto le righe c'è il pavimento. «In basso» tiene
  l'orizzonte in basso. Il vaporwave fa lo stesso, e le palme non salgono oltre
  la testa della grafica.
- **La luna** della notte di stelle sta all'altezza del titolo.
- **Il QR** ha una fascia sua, in basso: il riquadro a destra, l'indirizzo a
  sinistra. Prima il riquadro stava sopra le ultime righe della settimana e
  l'indirizzo, centrato sotto, usciva dalla tela quando era lungo. Adesso le
  righe si stringono per fargli posto, e il sottotitolo del «Live ora» sta
  sopra la fascia. Il QR ha lo stile che lo streamer ha salvato in «QR su
  misura» (forme, colori, logo; la cornice no, qui c'è già il riquadro), e
  porta all'indirizzo scritto accanto, quello scelto in «Condivisione & link
  al canale». Come si arriva a quel QR prima che la grafica esca, e cosa
  resta quando non si può, è il capitolo 12.

## 4. Il testo si legge per costruzione

La soglia di contrasto è quella WCAG, e dipende da quanto è grande il testo
**per chi lo guarda**. Una grafica da 1080 px si guarda sul telefono a circa
390 px: ogni misura va moltiplicata per 0,36. Un testo che lì resta sotto i
24 px (o sotto i 18,66 in grassetto) è testo normale e vuole 4,5:1; sopra è
testo grande, e basta 3:1.

- **Sulle scene animate ogni scritta ha il suo contorno.** Quello che passa
  sotto una lettera cambia a ogni fotogramma: una stella, una goccia, una linea
  del pavimento. Non si può sapere prima, e campionare qualche fotogramma
  sarebbe tirare a indovinare. Il contorno è il fondo vero delle lettere, e il
  colore della scritta regge contro il contorno: la scena può fare quello che
  vuole. Dove la scena è scura il contorno scuro non si vede, dove è chiara sì.
- **Sugli sfondi fermi** si guardano i pixel veri sotto la scritta, dopo le
  righe e prima dei testi. Se il colore regge, si lascia com'è. Se non regge,
  prima si schiarisce (o si scurisce) quanto basta: su un fondo uniforme è la
  cosa giusta, e un alone attorno alle lettere sarebbe solo peso. Il contorno
  arriva solo quando neanche così basta, cioè quando sotto passa qualcosa di
  chiaro. Le scritte dello stesso tipo nelle righe (i giorni, gli orari, le
  attività) si decidono insieme, così hanno lo stesso colore in tutte le righe.
- **L'iniziale, la pillola del gioco** hanno un fondo pieno: la scritta è
  bianca o nera, quella che contrasta di più. Se nessuna delle due basta, si
  sposta il fondo, e la pillola si controlla lungo tutta la sua sfumatura.
- **L'ombra del titolo** è l'ombra vera della scritta, nel colore del
  contorno, e il bagliore del neon passa sotto il contorno: né l'una né l'altro
  toccano il bordo delle lettere.

## 5. Niente emoji di serie

Il logo di serie non è più 🎮: è l'iniziale del canale in un cerchio del colore
d'accento. Chi vuole scrivere un testo nel logo lo scrive lui, e chi aveva il
🎮 di serie adesso ha l'iniziale. Anche la pillola del gioco non ha più
l'emoji davanti.

## 6. Temi, stili pronti, opzioni

- **Un tema** è una tavolozza (fondo, testo, testo tenue, accento, seconda
  tinta) più, se è animato, una scena. I temi animati sono quattordici: i sei
  di prima, fatti girare senza scatti, e otto nuovi (vaporwave, pioggia al
  neon, cromo, notte di stelle, sakura, lo-fi, sala giochi, iperspazio).
- **Le opzioni della scena** le dichiara la scena stessa (`SCENE[id].opzioni`:
  interruttori e scelte, nelle tre lingue) e il pannello le disegna da lì.
  Sotto: velocità e quanto si vede la scena.
- **Il carattere del titolo** è uno dei quattro che il sito serve già
  (Archivo, Instrument Serif, Permanent Marker, Zen Kaku Gothic New): la
  grafica esce uguale su ogni computer, e si disegna solo dopo che i caratteri
  sono arrivati (`grafFontPronti`). Il resto è Archivo.
- **Lo stile del titolo** (sfumato, pieno, neon) e **quello delle righe**
  (schede, pillole, linee).
- **Uno stile pronto** è una combinazione di tutto questo con un nome suo, che
  non è mai il nome di un tema. Nel pannello si vedono con l'anteprima vera, fatta
  coi tuoi testi. Si sceglie con un tocco e poi si cambia come si vuole.

Il server salva tutto, e accetta solo le scelte che il pannello offre (lo
controlla un test): un campo che il server scartasse in silenzio sarebbe una
scelta che si fa e non succede niente.

## 7. Il post e la storia

- **Il post** è la grafica di sempre: 1080×1350 la settimana, 1080×1080 «Live
  ora».
- **La storia** è 1080×1920, la misura di una storia di Instagram. Una grafica
  di un'altra forma Instagram la ingrandisce fino a riempire lo schermo e ne
  taglia i lati: la settimana usciva con «LINSESTO» e il nome a metà.
- La storia è composta per il verticale, con le regole del post e non con
  una seconda disposizione da tenere allineata a mano (`grafDisposizione`):
  - Instagram mette le sue scritte in due fasce di 250 pixel: in alto la barra
    dei secondi e il nome, in basso la risposta. Quello che resta, da 250 a
    1670, è la cornice della grafica;
  - il post si compone su un'altezza tale che il logo stia 30 pixel sotto la
    fascia di sopra e il QR finisca 30 pixel sopra quella di sotto, e poi si
    abbassa tutto di quanto serve (`_grafTrasla` sposta ogni quota: `y`,
    `base`, l'orizzonte della scena). Le regole del post fanno il resto: le
    righe della settimana si allungano fino al QR o al fondo, il QR sta in
    basso;
  - in «Live ora» il blocco con «In diretta ora», il titolo, il gioco e il
    sottotitolo sta **in mezzo allo spazio libero** fra l'intestazione e il QR
    (o il fondo), e l'orizzonte della scena lo segue, come nel post. La barra
    colorata resta sul bordo di sotto, che è il suo posto;
  - sfondo, scena e sfumature si disegnano sull'altezza della tela, quindi la
    coprono tutta: Instagram non aggiunge colore sopra e sotto.
- Il collaudo misura ogni scritta di ogni tema anche nella storia: si legge,
  non tocca le altre, e non finisce nelle fasce di Instagram.
- Nel pannello si sceglie con **Post / Storia**, e PNG, Condividi, GIF e video
  escono nel formato scelto; le miniature degli stili pronti restano post,
  perché mostrano lo stile e non la forma. «Manda» della Settimana ne fa due:
  il post per Telegram e Discord, la storia per Instagram.
- Dall'API non si mettono adesivi, quindi la storia pubblicata dal pannello non
  ha un link da toccare: per quello c'è il QR, o l'adesivo che metti tu
  dall'app.

### «Metti nella storia»

In cima alla scheda c'è il riquadro della storia di Instagram. Sta in cima
perché è la novità e perché è l'uscita più breve: un tasto, e la grafica è
pubblicata. Dice sempre come stanno le cose, in uno di tre modi:

- **pronto**: il tasto «Metti nella storia», e accanto l'esito, che si legge
  anche con un lettore di schermo. Parte la grafica che vedi, sempre in formato
  storia, anche se stai guardando il post: nella storia il post verrebbe
  tagliato;
- **Instagram non collegato**: l'invito a collegarlo, col tasto che porta dove
  si collega. Non è un errore: è una cosa che non hai ancora fatto;
- **collegato, ma senza il permesso di pubblicare** (serve un account
  professionale): il blocco giallo col rimedio, lo stesso della Settimana.

Lo stato si chiede al server come per la Settimana (`storiaIgPossibile`: la
porta che conta le pubblicazioni vuole lo stesso permesso e non pubblica
niente), e si richiede ogni volta che torni nella scheda: magari Instagram
l'hai appena collegato. La pubblicazione passa dallo stesso posto di «Manda»
(`features/storia-ig.js`), con lo stesso JPEG controllato e la stessa guardia
contro il doppio clic. L'immagine esce da `grafEsporta` come tutte le altre: il
QR è quello pronto, e riletto nella JPEG vera (capitolo 12).

### La storia che parte da sola quando vai in diretta

Una spunta: quando vai in diretta, la storia «Live ora» parte da sola. È spenta
di serie. Nacque nel riquadro di Instagram; oggi sta con le altre uscite
automatiche, nella carta «In automatico» (`docs/AUTOMATICHE.md`).

- **Chi disegna.** Il server non ha un browser, e la grafica si disegna solo
  nel browser. Quindi la prepara il pannello: quando accendi la spunta, ogni
  volta che salvi le impostazioni delle grafiche o lo stile del QR, e da solo
  all'apertura del pannello se la trova non pronta o da rifare (capitolo 12).
  Il server la tiene (`storie-live/<nome>.jpg`, accanto a un file con lo stato,
  la firma del QR e la versione delle grafiche da cui è nata) fino al momento
  giusto. Accendere senza mandare la grafica non si può: sarebbe un
  interruttore acceso su niente.
- **Quando parte.** Al passaggio in diretta, lo stesso momento dell'avviso «sono
  live», su qualunque piattaforma apra la serata: Twitch, Kick o YouTube. Se
  sei già in onda su una e parti anche sull'altra, la serata è la stessa e la
  storia non riparte. Non al primo sguardo dopo un riavvio del bot a diretta già
  in corso: quello non è un inizio. E al più una ogni tre ore: se la diretta
  cade e riparte, la storia c'è già.
- **Cosa c'è sopra.** La grafica «Live ora» come l'hai salvata, col QR del tuo
  stile. Si disegna dalle impostazioni salvate, non da quello che c'è a
  schermo: le modifiche non salvate non partono, perché versione delle
  grafiche e firma del QR devono essere quelle che il server conosce. Il gioco
  scritto resta quello (il server non può ridisegnarlo): chi cambia gioco ogni
  volta lo lascia vuoto, e il pannello lo dice accanto alla spunta.
- **Se non parte.** L'esito dell'ultima resta accanto alla spunta, col rimedio;
  e se Telegram è collegato, arriva anche un messaggio in privato. Una storia
  automatica che non esce, e nessuno lo sa, è peggio di nessuna storia. Un
  fallimento non conta come storia fatta: alla diretta dopo si riprova. Per una
  grafica che manca il rimedio è «apri le Grafiche, si prepara da sola». Prima
  diceva di spegnerla e riaccenderla: riaccenderla rifaceva la stessa foto col
  QR senza logo, cioè ripeteva il difetto.
- **Da rifare.** Una grafica pronta ma nata da uno stile del QR di prima, o
  da grafiche salvate dopo, è «da rifare»: se vai in diretta parte lei (il QR
  funziona e porta allo stesso posto), e intanto il pannello la rifà. Accanto
  alla spunta lo si legge, e «Guarda cosa partirà» apre l'immagine che c'è.
- **Lo stato non sta nelle impostazioni**, che si riscrivono da altre strade:
  un salvataggio fatto altrove potrebbe spegnerla in silenzio.

`test/unita/storia-ig.test.mjs` prova il modulo senza Instagram: il file
pubblico che c'è solo mentre Meta lo scarica, la storia spenta, una per diretta,
il fallimento che si riprova, la grafica che manca, il nome storto che non esce
dalla cartella.

### Due titoli, uno per grafica

La settimana e «Live ora» avevano un titolo solo: chi scriveva «LA MIA
SETTIMANA» se lo ritrovava sulla grafica della diretta, e sarebbe finito anche
sulla storia che parte da sola. Adesso sono due (`titolo` e `titoloLive`), e il
campo scrive quello della grafica che hai davanti.

## 8. L'anteprima non rallenta chi scrive

Scrivendo nella scheda tutto andava a scatti, e peggiorava a ogni visita. Le
cause erano tre, e nessuna era la grafica in sé.

- **La scheda si agganciava a ogni ingresso.** `initGrafiche` gira ogni volta
  che si apre la scheda, e ogni volta aggiungeva di nuovo i suoi ascoltatori
  agli stessi campi. Alla quarta visita una lettera ridisegnava la grafica
  quattro volte, e «Salva», «Scarica» e «Condividi» partivano quattro volte.
  Adesso la tela porta il segno dell'aggancio (`data-collegato`, come le altre
  schede): la seconda volta la scheda riprende da dov'era, rilegge solo i
  giorni della settimana (che si scrivono altrove) e ridisegna.
- **Ogni lettera ridisegnava subito.** Adesso un cambiamento chiede un disegno,
  e il disegno si fa al fotogramma dopo: dieci lettere nello stesso fotogramma
  fanno un disegno solo. Con una scena animata non si chiede niente, perché
  l'animazione disegna già a ogni fotogramma e prende il testo nuovo da sola.
  E si ferma quando esci dalla scheda: una tela che nessuno vede non si disegna.
- **L'anteprima ferma costava come un'esportazione.** Si disegnava a 2160 pixel
  (il doppio di quello che si vede) sulla tela in pagina. Su uno sfondo fermo
  ogni scritta rilegge i pixel che ha sotto (capitolo 4), e rileggere da una
  tela disegnata dalla scheda video costa un'attesa ogni volta, una trentina di volte
  per disegno. Adesso l'anteprima ferma si compone a 1080 su una tela fatta
  per essere riletta (`grafTelaNuova`, con `willReadFrequently`) e si copia in
  pagina in un colpo solo (`grafMostra`). Le scene animate non rileggono
  niente e restano sulla tela in pagina, dove girano più veloci.

Misurato sullo stesso browser, un ridisegno dell'anteprima ferma: da 132 a 25
ms per «Live ora», da 192 a 40 per la settimana. E non si moltiplica più per le
visite. Le esportazioni si compongono anche loro su una tela da rileggere: PNG
e Condividi a 2160, le immagini che vanno sui social dal server («Manda»,
«Metti nella storia», le uscite automatiche) a 1080, in JPEG: la qualità
scende a gradini, da 0,9 a 0,5, finché il file sta nei 760 KB.

La scheda Settimana ha la stessa anteprima e la stessa regola: un disegno per
fotogramma, qualunque cosa si scriva nei giorni.

## 9. Il collaudo

`scripts/verifica-grafiche.mjs`, in un browser vero, per ogni tema nei due tipi
in post e in storia, ogni stile pronto e gli sfondi fuori tema, in quattro
fotogrammi del giro:

- misura il contrasto vero di ogni scritta: i pixel delle lettere contro quelli
  che le toccano da fuori;
- controlla che nessuna scritta ne tocchi un'altra, finisca sotto il QR o esca
  dalla tela, e nella storia che nessuna finisca nelle fasce di Instagram;
- per ogni scena e ogni velocità, che il fotogramma a fine giro sia il primo e
  che il passo che chiude il giro non sia più grande dei passi normali;
- per il synthwave, che le linee escano da tutto l'orizzonte e vadano al punto
  di fuga dentro il sole;
- entrando tre volte nella scheda e scrivendo una lettera ogni 150 ms, che ogni
  lettera faccia al più un disegno e l'ultimo abbia il testo scritto; e che
  uscendo dalla scheda la tela non si disegni più.

`--selftest` mette le rotture e controlla che si vedano: i contorni tolti, un
grigio lasciato com'è, un giro che non torna, una scritta sotto il QR, le linee
a raggiera, una storia col post in cima (sotto la barra di Instagram),
un'animazione che gira fuori dalla scheda, una scheda che si riaggancia a ogni
ingresso. `test/unita/graf-scene.test.mjs` prova la geometria senza browser,
`test/contratto/grafiche.test.mjs` che temi, stili pronti, motore e server
dicano la stessa cosa. Il QR delle grafiche ha le sue prove, nel capitolo 12.

## 10. I pezzi si spostano a mano

Sull'anteprima si prende un pezzo e lo si porta dove si vuole: il logo, il
nome, «In diretta ora», il titolo, il gioco, il sottotitolo, il QR col suo
indirizzo; nella settimana l'occhiello e il blocco delle righe. Il filo sotto
l'intestazione e la barra in fondo restano dove sono: sono la cornice, non un
contenuto.

- **Dove vive lo spostamento.** In `grafDisposizione`, dopo la composizione di
  serie: ogni pezzo spostato si trasla (`_grafSposta` muove `x`, `y` e `base`,
  anche dentro il QR e nelle righe, e lascia stare l'orizzonte della scena).
  Tutto quello che disegna passa da lì, quindi anteprima, PNG, GIF, video,
  «Manda» e la storia che parte da sola escono uguali senza ripeterlo.
- **Per formato, o insieme.** Post e storia hanno forme diverse, e ognuno
  tiene i suoi spostamenti (`spostati[tipo][formato]`). Con «Sposta insieme
  post e storia» (acceso di serie, `spostaInsieme`) lo stesso spostamento va
  a tutti e due, ognuno partendo dalla sua posizione: si sistema una volta
  sola e le due grafiche restano composte allo stesso modo. Spento, si sposta
  solo il formato che hai davanti.
- **Si prende quello che è disegnato.** Mentre disegna, ogni pezzo scrive il
  suo rettangolo vero (`_grafSegna`: il testo misurato, il riquadro del QR, le
  righe), e il puntatore cerca lì. Non c'è una seconda geometria da tenere
  allineata a mano.
- **Dove non si può.** `grafLimiti` dà, per un pezzo, quanto può andare a
  destra, a sinistra, su e giù: dentro la tela, e nella storia fuori dalle
  fasce dove Instagram mette le sue scritte. Spostando insieme si prendono i
  limiti di tutti e due i formati e se ne tiene la parte comune
  (`grafIncrocia`); il rettangolo del pezzo nell'altro formato si misura
  disegnandolo su una tela di lavoro, con la stessa funzione dell'anteprima.
  Il contrasto non si rompe spostando, perché ogni scritta decide il suo colore
  guardando i pixel che ha sotto (capitolo 4).
- **Le guide.** Mentre trascini compaiono i margini, i centri e, velato, lo
  spazio dove il pezzo non può andare, con scritto perché: «Qui Instagram
  copre la storia», oppure, spostando insieme, «Qui uscirebbe dal post» o «Qui
  nella storia finirebbe sotto Instagram». Il perché viene dal limite che
  ferma davvero il pezzo da quella parte.
- **Agganci.** Ogni lato si aggancia alla sua guida, entro 14 px: il bordo
  sinistro al margine sinistro, il destro al destro, il centro al centro (e
  così in verticale). Un centro agganciato a un margine lascerebbe mezzo pezzo
  fuori dall'area buona. Un aggancio che porterebbe il pezzo oltre i limiti non
  si prende.
- **Un pezzo sopra un altro.** Se il pezzo preso copre un altro pezzo, tutti e
  due si contornano in ambra e compare «Copre un altro pezzo». Si misura sulle
  parti vere, non sull'ingombro: il QR e il suo indirizzo sono un pezzo solo
  con uno spazio vuoto in mezzo, e lì si può stare (`grafCoperti`).
- **Tastiera.** L'anteprima prende il fuoco: le frecce spostano il pezzo scelto
  di 4 px, con Maiusc di 20, senza agganci, così ogni pressione sposta
  davvero.
- **Col dito.** Il tocco si prende solo se parte da un pezzo: altrove si
  scorre la pagina, anche sull'anteprima che sul telefono resta in cima.
- **Rimetti a posto** toglie gli spostamenti del formato che hai davanti, e
  spostando insieme anche quelli dell'altro. Uno spostamento accende
  «modifiche da salvare», come un campo scritto.

Il server tiene solo i pezzi che il pannello sa spostare, con numeri interi
dentro la tela, e uno spostamento nullo non si salva. La lista è la stessa da
tutte e due le parti, e `test/contratto/grafiche.test.mjs` lo controlla.

## 11. «Stasera alle…»

La terza grafica annuncia la prossima diretta: «Stasera alle 21:00», l'indirizzo
dove trovarti, e dietro la copertina del gioco.

- **Da dove arriva.** Dalla Settimana, con la regola che usa già la Home
  (`prossimaDiretta` in `features/settimana.js`): il primo giorno in onda che
  deve ancora cominciare, nel fuso della settimana. La regola restituisce anche
  l'id della categoria Twitch legata a quell'attività, ed è quello che porta la
  copertina. Il testo del giorno è quello della Home (`_quandoProssima`): oggi
  di sera «Stasera», oggi di giorno «Oggi», poi «Domani» e il nome del giorno.
  Si può scrivere a mano; vuoto, si aggiorna da solo.
- **La copertina** passa dal nostro indirizzo
  (`/api/streamer/grafiche/copertina/<id>`): una tela che disegna un'immagine
  d'altra origine non si esporta più. L'indirizzo vero lo dà Twitch per quella
  categoria (`box_art_url`): per i giochi più nuovi il file non si chiama come
  l'id, e l'indirizzo «indovinato» rimanda a un'immagine vuota. Si accetta solo
  un file sul posto delle copertine di Twitch, JPEG o PNG, senza rimandi e
  sotto i 3 MB: da lì non si scarica altro. Sopra la
  copertina una sfumatura scura in cima e in fondo tiene leggibili il nome e il
  logo. Senza copertina resta lo sfondo del tema, e il gioco va nella pillola.
- **Gli adesivi.** Quando e dove stanno su due adesivi bianchi, testo nero: il
  contrasto regge per costruzione, su qualunque copertina. Un testo lungo va su
  due righe, spezzato dove le due righe vengono più pari; se una riga ancora
  non ci sta (un indirizzo è una parola sola) il carattere scende fino a farla
  stare intera, e solo sotto il minimo si taglia. Un indirizzo tagliato non
  porta da nessuna parte. La misura dell'adesivo la calcola una funzione sola
  (`grafAdesivoForma`), che usano sia la disposizione sia il disegno: il
  rettangolo che si prende col mouse è quello disegnato.
- **Dove stanno.** Con la copertina il blocco (pillola, quando, dove) sta in
  basso, e l'immagine fa da soggetto; senza, sta al centro dello spazio
  libero sotto l'intestazione, con la pillola del gioco centrata come gli
  adesivi.
- **Il link.** L'adesivo «Link» di Instagram non si può mettere da fuori: la
  grafica scrive l'indirizzo, e il pannello dice di metterci sopra l'adesivo
  dall'app.
- Si sposta come le altre (capitolo 10): i pezzi sono il logo, il nome, i due
  adesivi, la pillola, il QR e, in un riquadro, la copertina.

### L'immagine del gioco: tre modi

Chiesto così: «diamo più libertà, qua se no c'è solo l'immagine a tutto schermo
della categoria». La copertina ha un modo (`copertina`), e ogni modo ha le sue
regole:

| modo | l'immagine | lo sfondo | la pillola del gioco |
|---|---|---|---|
| `schermo` | copre tutta la grafica, con velo e sfocatura a scelta | l'immagine | no: il gioco lo dice l'immagine |
| `riquadro` | una carta con gli angoli tondi, che si sposta e si ingrandisce | quello del tema | no |
| `no` | niente | quello del tema | sì |

- **Il tema si vede dove l'immagine non copre.** In `riquadro` e in `no` lo
  sfondo è quello scelto nelle Grafiche (tema, tinta o immagine), animato se
  il tema lo è; in `schermo` l'immagine è lo sfondo. Finché la copertina non
  c'è (nessuna categoria, o non ancora arrivata) vale lo sfondo del tema in
  ogni modo: la regola è una, `grafCopertinaModo`, e la usano disposizione e
  disegno.
- **Velo e sfocatura** valgono solo a tutto schermo. Il velo è un nero uniforme
  dallo 0 all'85%, sopra la sfumatura in cima e in fondo che c'era già; la
  sfocatura va da 0 a 30 pixel sulla grafica a grandezza vera, e per non
  scurire i bordi l'immagine si disegna più grande di quanto sfoca. Col
  browser che non sa sfocare una tela (`ctx.filter`), l'immagine passa da una
  tela più piccola e torna grande: lo stesso effetto per un'altra strada. Di
  serie tutti e due a zero: la grafica di chi non tocca niente resta quella di
  prima.
- **La carta** è alta quanto serve alla sua forma (le copertine di Twitch sono
  3:4, ma vale la misura vera del file), centrata nello spazio libero sotto
  l'intestazione insieme ai due adesivi, e non esce mai da quello spazio:
  «Grandezza» va dal 40 al 160% della misura di serie, fino allo spazio che
  c'è. Si sposta come gli altri pezzi, per formato o insieme, dentro i limiti
  della tela e fuori dalle fasce di Instagram.
- Le storie che partono da sole usano le stesse impostazioni con lo stesso
  disegno: non c'è una seconda strada.
- Chi aveva salvato `copertina: true` o `false` (il vecchio interruttore) li
  ritrova come `schermo` e `no`.

## 12. Il QR esce pronto, o non esce

Il difetto, verificato: la storia «Live ora» automatica e ogni storia «prima
della diretta» uscivano senza logo, sempre; con lo stile «di serie + la mia
foto» erano, pixel per pixel, il QR di serie. Il disegno del QR era giusto. Era
sbagliato il momento della foto: le immagini che escono si fotografavano in un
colpo solo, sincrono, e il QR aveva una cache di una voce sola. A chiave nuova
si disegnava subito senza logo (e con le forme morbide al posto della penna, se
`penna.js` non c'era ancora), e il logo arrivava dopo, a foto già partita. La
Settimana e la Live hanno il QR di misure diverse (190 e 180 px), quindi per la
Live e per ogni «prima della diretta» la chiave era sempre nuova.

Intorno c'erano gli stessi errori di forma:

- salvare lo stile del QR non ripreparava niente, e il server non sapeva con
  che stile erano nate le immagini che teneva;
- la Live era «pronta» appena il file c'era;
- il ripiego era uno solo, «tutto o di serie», e muto: un logo che non ci
  stava buttava via anche forme e colori, e nessuno lo diceva;
- PNG e Condividi, a doppia misura, ingrandivano la bitmap del QR, che usciva
  sfocata;
- nessuno rileggeva il QR nella JPEG finale, che per stare nel peso scende fino
  a qualità 0,5;
- il rimedio scritto per la Live, «spegnila e riaccendila», rifaceva la stessa
  foto.

Il modello qui sotto toglie al difetto il posto dove stare: ogni punto è un
invariante, e le prove lo rompono apposta.

### Una funzione decide il QR

`qrPronto(full, P, scala, stile)` restituisce la promessa di una voce: la tela
del QR, il colore del fondo, il gradino, il motivo, la geometria. È
deterministica (stesso indirizzo, misura, scala e stile danno lo stesso QR) e
aspetta quello che serve, con un tempo massimo:

- **il motore della penna** (`caricaMotoreQr`): una promessa sola e un solo
  `<script>`, qualunque sia il numero di chi lo chiede. Dopo 15 secondi si
  arrende, e il fallimento vale per un minuto: un pannello senza rete non
  riprova a ogni fotogramma. Se `penna.js` arriva tardi, i QR fatti senza
  penna si dimenticano e si rifanno;
- **il logo** (`_qrLogo`): al massimo 8 secondi, e un fallimento vale 30
  secondi. Un logo che arriva tardi si tiene, e i QR fatti senza si rifanno.
  Per le immagini che il server tiene, disegnate col suo stile, la foto del
  canale si chiede con la firma nell'indirizzo (`/u/<login>/avatar?v=<firma>`):
  la porta dice al browser di tenerla un'ora, e senza la firma una foto nuova
  arriverebbe dalla cache vecchia. Le anteprime e le uscite a mano la chiedono
  senza firma (sotto, «Quello che resta fuori»).

Una voce nata da un guasto (penna o logo mancanti) scade, e la richiesta dopo
riprova: un guasto di rete non diventa lo stile della sessione.

### I gradini

Quando il QR dello stile intero non si può fare, si scende di un gradino alla
volta, e ogni gradino perde solo quello che deve. `SB_QR.gradini(testo, stile,
{ logo, penna, seme })` dà la lista in ordine; il pannello disegna ogni gradino
alla misura vera, lo rilegge, e tiene il primo che torna.

| gradino | cosa resta | quando | motivo |
|---|---|---|---|
| `tuo` | tutto lo stile, logo compreso | si può | |
| `senza-logo` | forme e colori, senza logo | il logo non ci sta; non si è caricato; o col logo il QR non si rilegge | `logo-grande`, `logo-assente`, `rilettura` |
| `morbido` | lo stile, con le forme morbide al posto della penna | `penna.js` non si è caricato | `penna` |
| `serie` | il QR di serie | i colori non hanno il contrasto per leggersi, o niente sopra si rilegge | `colori`, `rilettura` |

- **Il logo che non ci sta.** Dalla versione 7 in su il codice ha un
  allineamento proprio al centro, e la targa del logo non può coprire un segno
  fisso (`docs/STRUMENTI.md`). Col livello H succede da 59 caratteri in su.
  L'indirizzo delle grafiche (`https://socialbot.live/u/<nome>`, o quello
  del canale) resta sotto anche col nome più lungo che Twitch permette, ma il
  gradino c'è lo stesso: la correttezza non deve dipendere da quanto è lungo
  un nome. Senza logo il QR torna al livello M, più rado.
- **Il contrasto** è l'unico motivo per cui si va dritti al QR di serie: con
  colori che un telefono non distingue, togliere il logo non serve a niente.
- I gradini sono tutti misurati in `test/unita/qr.test.mjs`, anche due guai
  insieme (senza penna e col logo che non ci sta: `morbido`, con i due
  motivi).

Il pannello dice sempre in che gradino è il QR, con le parole di chi legge
(`_qrGradinoDetto`), in due posti:

- nelle Grafiche, sotto «Stampa un QR + il link del canale sull'immagine»
  (`#gr-qr-gradino`): «Il QR di questa grafica esce col tuo stile ✓», o
  «…col tuo stile ma senza logo:», «…con forme morbide al posto della
  penna:», «…quello di serie:», ognuna col suo perché e il tasto «QR su
  misura». Senza uno stile salvato dice che è quello di serie, con «Fallo su
  misura»; mentre la voce vera arriva, «Sto preparando il QR col tuo stile…»;
- nella scheda QR, sotto «Salva lo stile» (`#qr-grafiche`): «Nelle Grafiche il
  QR esce…», o «Nelle Grafiche, quando salvi, il QR esce…» se lo stile a
  schermo non è ancora salvato. Lì si provano le due misure delle grafiche,
  180 e 190, e si dice la peggiore: lo streamer sa cosa succederà prima di
  salvare.

Un QR che scende di gradino in silenzio sarebbe lo stesso difetto di prima,
solo più educato.

### La cache e le anteprime

Le voci stanno in una mappa di al più otto (`_qrVoci`), con una chiave leggera:
indirizzo, misura, scala e una firma locale dello stile, calcolata una volta per
oggetto (`qrStileDi`, con una `WeakMap`). Prima la chiave conteneva il logo
caricato intero, fino a 190 KB di testo a ogni fotogramma.

Le anteprime restano sincrone, perché si disegnano a ogni fotogramma: prendono
la voce pronta se c'è, se no una provvisoria fatta con quello che c'è già, e
intanto chiedono `qrPronto`. Quando la voce vera arriva, parte l'evento
`sb-qr-pronto` e ogni anteprima che mostra un QR (Grafiche, Settimana,
miniature degli stili pronti) si ridisegna. La provvisoria non esce mai.

### Un'immagine esce solo da grafEsporta

`grafEsporta(c, { scala, formato })` è l'unica strada da cui un'immagine lascia
il pannello: storia «Live ora» e storie automatiche, «Manda» della Settimana,
«Metti nella storia», Scarica PNG, Condividi. Fa sempre le stesse cose,
nell'ordine:

1. aspetta i caratteri e `qrPronto` della **sua** chiave;
2. disegna passando la voce pronta (`c._qr`) e `c._esporta`;
3. codifica (PNG, o JPEG che scende di qualità finché sta nel peso);
4. decodifica l'immagine codificata e **rilegge il QR lì**, JPEG compresa;
5. se non torna, rifiuta l'uscita con una frase per lo streamer: «non la faccio
   uscire», e cosa cambiare in «QR su misura».

`grafQr`, con `c._esporta` e senza la voce pronta per quella chiave (o con una
provvisoria, o di un'altra scala), lancia un errore invece di disegnare: non
esiste più un modo di fotografare un QR a metà. GIF e video non passano da
`grafEsporta` perché non sono una foto, ma il QR è pronto (`qrPronto`) prima
del primo fotogramma anche lì. Il video, senza un QR che si legge, non si
registra. La GIF parte lo stesso, per la ragione detta qui sotto.

### La misura logica resta la stessa

Il modulo del QR si sceglie a scala 1 (`SB_QR.geometria(p, P)`); a scala `s`
si disegna con `SB_QR.misura(p, P, s)`, cioè con il modulo esatto `m1·s`, e si
posa a trasformazione azzerata, al pixel intero. Il PNG a 2160 ha quindi lo
stesso QR della grafica a 1080, con ogni modulo il doppio dei pixel, nitido:
prima era la bitmap a 1080 ingrandita.

La GIF è larga al massimo 600 pixel, e lì il modulo scende verso i 2 pixel. Il
QR si fissa prima del primo fotogramma e il primo fotogramma, già ridotto, si
rilegge: se non torna, la GIF esce lo stesso (è un'animazione, non un
biglietto da visita) ma il pannello lo dice: «Nella GIF, larga al massimo 600
px, il QR viene troppo piccolo per essere letto da un telefono: se serve il
QR, usa il PNG o il video.».

### La firma: con che stile è nata un'immagine

Il server calcola `firmaQr`, 16 cifre esadecimali: lo sha256 dello stile
normalizzato (`firmaStileQr` in `features/qr-stile.js`), con dentro:

- forme, colori, logo e grandezza del logo, l'immagine del logo se è
  «immagine», l'indirizzo della foto se è «la tua foto»;
- `DISEGNO_QR`, il numero di versione del disegno del QR nelle grafiche. Si
  alza quando il disegno cambia in un modo che deve far rifare le immagini già
  salvate, non per un ritocco che il telefono non vede.

Non ci sono il testo («Dove porta») e la cornice, che nelle grafiche non si
usano: cambiarli non deve far rifare niente. Due stili che si disegnano uguali
hanno la stessa firma: l'ordine delle chiavi non conta, la grandezza del logo
non conta senza logo, gli occhi del colore dei quadratini valgono come «nessun
colore per gli occhi».

Ogni immagine che il server tiene (`prima-N`, `settimana-post`,
`settimana-storia`, la Live) porta la firma e la versione delle grafiche da cui
è nata. Una firma diversa, o assente (un'immagine di prima della firma), vuol
dire **da rifare**, ed è un caso morbido: l'immagine esce lo stesso, perché il
QR funziona e porta allo stesso posto, e il pannello del proprietario la
riprepara appena può. Una storia col QR di ieri è meglio di nessuna storia.
Una versione delle grafiche diversa resta invece un blocco per le automatiche
(`grafiche-cambiate`, `docs/AUTOMATICHE.md`): lì il disegno racconta un'altra
grafica. Per la Live anche la versione diversa è «da rifare»: se vai in
diretta parte quella che c'è.

### Si disegna dallo stato del server

Il pannello non disegna le immagini salvate con lo stile che ha in memoria: lo
chiede al server. `GET /api/streamer/automatiche` dà anche `qr` (lo stile
normalizzato) e `firmaQr`; `autoPrepara` e `livePrepara` disegnano con quel
`qr` e rimandano quella firma (la Live anche la versione delle grafiche). Se
nel frattempo lo stile è cambiato (salvato da un'altra scheda, da un
moderatore, o è cambiata la foto del canale), il server risponde 409
`{ errore, codice: 'qr-cambiato', firmaQr }` e lascia com'era l'immagine di
prima. Il pannello rilegge le impostazioni e ridisegna, una volta sola. Una
firma assente si accetta e si salva vuota: un pannello di prima non si rompe,
e la sua immagine nasce già «da rifare».

### Salvare lo stile è salvare e ripreparare

«Salva lo stile» nella scheda QR salva, poi riprepara la Live (se è accesa) e
le uscite automatiche accese, e il messaggio dice cosa ha rifatto: «Rifatte col
QR nuovo: la storia «Live ora», le storie prima della diretta e la settimana.».
Se non c'è niente di acceso, dice che lo usano da adesso le Grafiche; se il
giro non riesce, lo stile resta salvato e il messaggio dice perché le storie
non si sono preparate. «Salva impostazioni» delle Grafiche fa lo stesso giro,
con «Rifatte con le grafiche nuove:». Un giro alla volta: ogni giro ha il suo
numero, e uno nuovo ferma quello vecchio anche a metà disegno, prima che mandi
qualcosa. Cambiando canale i giri in corso si fermano.

Si disegna sempre la grafica salvata, non quella a schermo: versione delle
grafiche e firma del QR devono essere quelle che il server conosce. Chi
accende la Live con modifiche non salvate fa partire la grafica com'è salvata,
e il pannello lo dice accanto alla spunta («come l'hai salvata»).

### All'avvio del pannello

Le immagini da fare o da rifare non aspettano che lo streamer apra le Grafiche.
All'avvio del pannello (solo il proprietario, non nella demo), se qualcosa è
acceso e non pronto o da rifare, il pannello lo riprepara in un momento di
quiete, otto secondi dopo e quando il browser è libero, una volta per sessione e
per canale. Contano solo i giorni in onda: un'immagine di un giorno senza
diretta non si rifà.

### Cosa vale nelle grafiche, e cosa no

- **Vale:** forme, colori, logo e la sua grandezza, come in «QR su misura».
- **Non vale «Dove porta».** Il QR di una grafica porta dove porta la grafica:
  all'indirizzo scritto accanto, scelto in «Condivisione & link al canale» (la
  pagina link o il canale). Un QR che porta altrove rispetto alla scritta che
  ha accanto sarebbe una trappola.
- **Non vale la cornice con la frase:** nella grafica il QR ha già il suo
  riquadro, e la frase lo farebbe uscire dalla sua fascia.
- La scheda QR lo dice accanto a «Salva lo stile», e il manuale anche.

### Chi può

I permessi non cambiano: le porte delle immagini sono del solo proprietario.
Un moderatore può preparare, scaricare e condividere le grafiche, e salvare lo
stile del QR; il suo pannello dice che le storie automatiche le gestisce chi ha
il canale, non che «non riesce». Se è un moderatore a salvare lo stile, le
immagini del proprietario diventano «da rifare» e si ripreparano quando lui
apre il pannello: fino ad allora escono col QR di prima. Il messaggio del
moderatore lo dice: «Le storie che escono da sole le prepara di nuovo il
pannello di chi ha il canale.».

### Quello che resta fuori

Detto qui perché un buco deciso e un buco dimenticato si somigliano troppo:

- **La lingua delle scritte** nelle immagini salvate è quella del pannello di
  chi le prepara. La firma non la contiene: è un altro lavoro.
- **La foto nelle uscite a mano.** Anteprime, PNG, Condividi, «Manda» e
  «Metti nella storia» disegnano con lo stile salvato in memoria, che non ha
  la firma: la foto del canale si chiede senza `?v=`, e per un'ora dopo un
  cambio di foto il browser può ancora darne la copia vecchia. Le immagini
  che il server tiene non hanno questo problema.
- **La GIF** non garantisce un QR leggibile: lo dice, e indica PNG e video.
- **Una piattaforma** che cambiasse l'indirizzo della foto senza cambiare la
  foto farebbe rifare le immagini più spesso del necessario: è il caso
  morbido, costa solo lavoro.

### Le prove

- `test/unita/qr.test.mjs`: i gradini nei casi veri (versione 7 col logo,
  colori illeggibili, senza penna, due guai insieme), i ripieghi in ordine e
  deterministici, la misura logica costante da scala 1 a 3, e la rilettura
  dal disegno vero, con un rasterizzatore dei tracciati e il logo come caso
  peggiore, per la pagina link con nomi da 3 a 30 caratteri e per gli
  indirizzi di Twitch, Kick e YouTube, a 180 e 190 pixel, anche a scala 2.
- `test/contratto/qr-grafiche.test.mjs`: fa girare i pezzi veri di `app.js`
  col motore QR vero. Nessuna grafica si codifica fuori da `grafEsporta`, ogni
  uscita la aspetta, un solo `<script>` per la penna, i tempi massimi,
  la cache di otto, `grafQr` che rifiuta la voce mancante o provvisoria, la
  firma rimandata, il 409 ripreso una volta, il giro vecchio che si ferma.
- `test/contratto/qr-firma.test.mjs`: le rotte vere del server su una cartella
  usa e getta: la vista con `qr`, `firmaQr` e `daRifare`, il 409 che lascia
  intatta l'immagine di prima, la firma assente salvata vuota, la foto nuova
  che fa rifare, le due porte per guardare le immagini, e il 403 per chi non
  è il proprietario.
- `test/unita/qr-stile.test.mjs`, `automatiche.test.mjs`,
  `storia-ig.test.mjs`: la firma (cosa la cambia e cosa no), «da rifare» che
  non ferma nessuna uscita, la Live da rifare che parte lo stesso.
- `scripts/verifica-qr-grafiche.mjs`, col browser: la demo con lo stile finto
  (penna, occhi tondi, colore suo, logo), la cache fredda e `penna.js` e il
  logo in ritardo, l'anteprima sulla Settimana (190) mentre la Live ne vuole
  180, cioè proprio il caso del difetto. Prende quello che il pannello manda
  alle porte e quello che scarica, lo decodifica in una pagina che del
  pannello non sa niente, e guarda nel riquadro del QR: che si rilegga
  all'indirizzo giusto e alla misura del modello, che colore, occhi, logo e
  forme siano quelli dello stile (il ridisegno «tuo» deve essere il più vicino
  ai pixel, fra i ripieghi), e che le immagini automatiche portino la firma.
  `--selftest` rompe il pannello in sei modi e pretende il rosso giusto.

Ogni garanzia è stata rotta apposta, e ogni rottura ha fatto diventare rossa
almeno una prova.
