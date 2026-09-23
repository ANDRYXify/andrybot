# Le grafiche social

Due grafiche da pubblicare: la settimana (1080×1350) e «Live ora» (1080×1080),
ognuna anche in formato storia (1080×1920).
Si disegnano nel browser, con lo stesso disegno per l'anteprima, il PNG, la GIF,
il video e l'immagine che «Manda» spedisce dalla scheda Settimana.

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
  sopra la fascia.

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
contro il doppio clic.

### La storia che parte da sola quando vai in diretta

Nello stesso riquadro, quando Instagram è pronto, c'è una spunta: quando vai in
diretta su Twitch, la storia «Live ora» parte da sola. È spenta di serie.

- **Chi disegna.** Il server non ha un browser, e la grafica si disegna solo
  nel browser. Quindi la prepara il pannello: quando accendi la spunta, e ogni
  volta che salvi le impostazioni delle grafiche. Il server la tiene
  (`storie-live/<nome>.jpg`, accanto a un file con lo stato) fino al momento
  giusto. Accendere senza mandare la grafica non si può: sarebbe un
  interruttore acceso su niente.
- **Quando parte.** Al passaggio in diretta, lo stesso momento dell'avviso «sono
  live». Non al primo sguardo dopo un riavvio del bot a diretta già in corso:
  quello non è un inizio. E al più una ogni tre ore: se la diretta cade e
  riparte, la storia c'è già.
- **Cosa c'è sopra.** La grafica «Live ora» com'era quando l'hai preparata. Il
  gioco scritto resta quello (il server non può ridisegnarlo): chi cambia gioco
  ogni volta lo lascia vuoto, e il pannello lo dice accanto alla spunta.
- **Se non parte.** L'esito dell'ultima resta accanto alla spunta, col rimedio;
  e se Telegram è collegato, arriva anche un messaggio in privato. Una storia
  automatica che non esce, e nessuno lo sa, è peggio di nessuna storia. Un
  fallimento non conta come storia fatta: alla diretta dopo si riprova.
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
visite. Le esportazioni (PNG, Condividi, Manda) restano a 2160 e si compongono
anche loro su una tela da rileggere.

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
dicano la stessa cosa.
