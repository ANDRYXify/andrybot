# Il sito si disegna

Le schede, le carte, gli avvisi e le finestre non entrano più con
un'animazione: **si disegnano**. Cambiando sezione la vignetta vecchia si
disegna all'indietro e la nuova si disegna come una tavola di manga: prima lo
schizzo a matita, poi il contorno a china, poi il retino che scopre il
contenuto, e la matita che si pulisce. Un'animazione sposta una cosa già fatta;
un processo di disegno la fa sotto gli occhi.

Il sito è una **tela in lavorazione**: risponde a quello che fai. Il tasto che
premi si ripassa a china; quando stai per fare qualcosa di cui potresti
pentirti, la finestra che te lo chiede è una nuvoletta spigolosa rossa; quello
che se ne va si disfa con gli stessi tratti con cui si era fatto.

Il codice è uno solo: `src/web/public/disegno.js` (`SB_DISEGNO`), più il blocco
`.dg-*` in `anime.css`.

## Da dove viene: come si disegna davvero

Una tavola di manga si fa in quattro passaggi, sempre gli stessi
([come si disegna una tavola](https://www.sketchflix.com/articles/how-to-make-a-manga-step-by-step)):

1. **lo schizzo** (*shitagaki*): tratti a matita leggeri, che sbordano e si
   correggono;
2. **la china** (*pen-ire*): il contorno definitivo, un tratto solo, deciso;
3. **i toni**: il retino, righe o punti, che riempiono;
4. **la pulizia**: la matita si cancella, le sbavature si coprono di bianchetto.

Da lì le scelte:

- **Il tratto che si traccia.** Un contorno SVG con `pathLength="1"`, una
  tratteggiatura lunga quanto tutto il tratto e `stroke-dashoffset` che va da 1 a
  0: il tratto cresce dal suo inizio
  ([il metodo](https://jakearchibald.com/2013/animated-line-drawing-svg/)).
- **Il tratto fatto a mano.** La matita non è una riga: segue il principio di
  Rough.js ([gli algoritmi](https://shihn.ca/posts/2020/roughjs-algorithms/)). Il
  tratto sborda oltre gli spigoli, e si piega un poco perché i due punti di
  controllo, a metà e a tre quarti, sono spostati di poco a caso. Il caso è un
  seme per elemento, quindi la stessa carta ha sempre la stessa mano.
- **A dodici disegni al secondo.** L'animazione a mano lavora «a due», un
  disegno ogni due fotogrammi del film: dodici al secondo
  ([perché](https://www.linkedin.com/advice/0/what-benefits-challenges-animating-twos-threes)).
  Ogni tratto avanza a scatti (`steps()`), mai liscio: è quello che lo fa
  sembrare disegnato e non interpolato. Le azioni svelte si animano «a uno», un
  disegno per fotogramma: è il caso del disegno all'indietro.
- **I segni del manga** ([iconografia](https://en.wikipedia.org/wiki/Manga_iconography)):
  sull'avviso che va bene le scintille, su quello d'errore la vena di rabbia;
  attorno a chi urla, la nuvoletta a punte. I «!» invece no: sono la sorpresa
  di un personaggio, e premere un tasto non è una sorpresa.

## La grammatica

| cosa succede | cosa si vede |
| --- | --- |
| cambi **sezione** (da scena a scena) | ogni vignetta della scheda vecchia si disegna all'indietro, poi la nuova si disegna |
| cambi **sottosezione** (da azione ad azione, `stessaFamiglia()`) | niente si disfa: la scheda nuova si disegna e basta |
| scorri e arriva una carta | la carta si disegna quando entra |
| un avviso | si disegna veloce, con le scintille o la vena di rabbia; se ne va disegnandosi all'indietro |
| una finestra, la ricerca, la visita guidata | la loro carta si disegna sopra al velo, e chiudendola si disegna all'indietro |
| una finestra ti chiede un gesto di cui potresti pentirti | la carta è una nuvoletta spigolosa rossa, come un urlo |
| premi un tasto che ha un contorno, e il gesto non fa partire altri disegni | il tasto si ripassa a china dal punto toccato, poi l'inchiostro in più sfuma |
| apri il menù sul telefono | i gruppi si disegnano uno dopo l'altro |
| la vetrina | ogni vignetta (un riquadro chiuso) si disegna quando entra nello schermo |

Una carta dura circa 560 ms dall'inizio alla pulizia, ma il contenuto si legge
da 390 ms. Il disegno all'indietro dura 252 ms, dentro i 260 di `--t-uscita`.
Dal clic alla prima carta pulita, cambiando sezione, passano circa 600 ms: gli
stessi dello scivolo di prima.

## Le regole, giuste per costruzione

Ognuna di queste regole c'è perché, senza, il prototipo ha mostrato un difetto
vero. Non si correggono i casi: si scrive il disegno in modo che il caso non
possa esistere.

1. **Il disegno è una vista del ciclo di vita, non un'aggiunta.** L'app dice già
   cosa succede con le classi: la scheda diventa `visibile` o `esce`, la carta
   diventa `dentro`, la finestra `dentro`, il corpo `menu-aperto`, un avviso
   entra in `#toast-box`. Il modulo guarda quelle classi e disegna.
   `app.js` non sa niente del disegno: una finestra aggiunta domani si disegna
   senza che nessuno se ne ricordi. Anche l'urlo si ricava: la finestra che ha
   un tasto `pericolo` chiede un gesto di cui pentirsi, e l'app lo scrive già.
2. **Si disegna solo quello che ha un contorno.** La china ripassa un bordo; un
   blocco di solo testo non ne ha, e un contorno che compare e poi sparisce
   sarebbe un errore. Senza bordo (stile `none`, spessore sotto mezzo pixel o
   colore trasparente) non si disegna niente.
3. **La china ricalca il bordo vero.** Spessore, colore e raggio vengono
   dall'elemento, e il tratto sta al centro del bordo (`sp/2`), dove il bordo è.
   Quando il disegno finisce e torna il bordo del CSS non c'è nessuno scatto: le
   carte del pannello hanno il tratto spesso, quelle della vetrina un pixel.
   Sulla nuvoletta il bordo è la sagoma a punte, e la china ricalca quella.
4. **La tela ha la scatola dell'elemento.** L'SVG è grande esattamente quanto
   l'elemento; i tratti che sbordano sono inchiostro fuori scatola
   (`overflow: visible`) e non allargano la pagina. Sul telefono una tela con un
   margine intorno avrebbe fatto scorrere la pagina di lato.
5. **La tela segue l'elemento, e si rifà sulla misura nuova.** Un avviso si
   allarga quando ne arriva un altro; una carta cresce quando arrivano i dati.
   Ogni tratto è una funzione della misura: se la misura cambia, i tratti si
   ricalcolano e la china, che avanza in frazione della sua lunghezza, continua
   da dove era. Nel prototipo il disegno di un avviso restava fermo sulla misura
   vecchia, e la carta grande della Pagina link compariva già fatta.
6. **Il livello si ricava.** La tela sta un gradino sopra l'antenato fisso del
   suo elemento: un avviso sopra gli avvisi, una finestra sopra il suo velo. Il
   contenuto sta a 10, sotto la barra in alto, la barra in basso e il menù. Nel
   prototipo il disegno di chi usciva passava sopra al menù che si stava
   chiudendo.
7. **In ordine di lettura.** Quando una scena si apre, il riquadro «Come
   funziona» e le carte a schermo si ordinano dall'alto e da sinistra, 70 ms
   l'una dall'altra. Nel prototipo si disegnava prima la carta in basso e poi il
   riquadro in alto, perché arrivavano in quell'ordine.
8. **Prima si misura tutto, poi si scrive.** Una misura chiesta dopo una
   scrittura costringe il browser a rifare l'impaginazione. Le richieste vanno in
   coda: si misurano tutte, poi si disegnano tutte. Le tele le muove un giro solo
   per fotogramma, che legge tutte le posizioni e poi le applica.
9. **Disegnare una carta la rivela.** Una carta che aspetta (`rivela`) è
   trasparente finché non diventa `dentro`. Il disegno, quando comincia, la mette
   `dentro`: una carta disegnata in fondo allo schermo, dove l'osservatore delle
   carte non è ancora arrivato, altrimenti sparirebbe a disegno finito.
10. **Il contenuto non dipende dal disegno.** Il retino finisce opaco (l'ultima
    riga piena è larga quanto il passo), resta così (`both`) e la classe se ne va
    a tempo. La rete di sicurezza mostra comunque le carte che nessuno ha
    rivelato, e una carta che si è disfatta ma non è stata tolta torna a
    vedersi. Chi chiede meno movimento non vede disegnare niente e trova tutto
    già al suo posto.
11. **Uscire dura quanto il disegno all'indietro.** Schede, avvisi e finestre se
    ne vanno dopo `--t-uscita`, lo stesso tempo dappertutto, e il disegno
    all'indietro ci sta dentro per costruzione: è la linea del tempo
    dell'andata, ribaltata e compressa (`RITORNO`).
12. **Si disfa ogni vignetta, per conto suo.** Nella prima versione un colpo di
    bianchetto attraversava il pannello: cancellava una macchia a caso in mezzo
    e lasciava intatti i riquadri. Chi se ne va sono le vignette, e ognuna si
    disegna all'indietro sul suo contorno: le stesse che si erano disegnate
    entrando, riquadro «Come funziona» compreso.
13. **All'indietro, gli stessi disegni.** Il ritorno non è un'animazione nuova:
    torna la matita, il retino ricopre il contenuto, la china si ritira, poi la
    matita, in ordine inverso. Quanti disegni fa ogni tratto lo dice il tratto
    d'andata, non la durata compressa del ritorno: se lo dicesse il ritorno, la
    china passerebbe da intera a sparita in un disegno solo, e sembrerebbe un
    colpo di gomma.
14. **Una carta, una mano.** Il seme del caso si prende la prima volta che la
    carta si vede e poi non cambia. Prima si ricavava dalle classi, che cambiano
    mentre la carta vive (`dentro`, `dg-urlo`...): il ritorno poteva non
    ripassare i tratti dell'andata, e le punte della china non coincidevano con
    quelle della nuvoletta.
15. **L'orologio è quello del gesto.** Un'animazione CSS parte al primo
    fotogramma dopo che nasce; il tempo con cui l'app toglie una finestra parte
    dal clic. Su un telefono che perde fotogrammi erano due orologi, e il
    disegno all'indietro veniva tagliato a metà. Ogni disegno si aggancia
    all'istante in cui è chiesto (`startTime`): se un fotogramma salta si perde
    un disegno, come in un film, ma la fine non si sposta.
16. **Le tele non si fanno stringere.** Il sito stringe ogni svg dentro al suo
    contenitore (`max-width: 100%`). La tela e la nuvoletta sbordano per
    natura, e stringerle rimpicciolisce i tratti: la nuvoletta usciva più
    stretta della sua china. Tutte e due dichiarano `max-width: none`.

17. **Si misura il contorno vero.** Mentre un elemento si disegna o si disfa,
    il suo contorno è coperto (`dg-in`, `dg-out`: `border-color: transparent`).
    La misura toglie per un istante quelle due classi, legge il contorno e le
    rimette, senza che il browser dipinga in mezzo. Prima leggeva il contorno
    coperto, concludeva «non c'è niente da disegnare» e il menu che tornava di
    lato mentre si stava disfacendo ricompariva di colpo. Un elemento ha una
    tela sola: se ricomincia a disegnarsi, il tratto di quando si disfaceva se
    ne va.
18. **Il menu segue lo stato della pagina, non il tasto.** Il tutto schermo è
    una scelta che resta, e a cambiarlo è anche la scheda: da una scheda larga a
    una stretta il menu torna di lato, e al contrario se ne va. Quando la pagina
    perde `tutto-schermo` il menu si disegna, qualunque sia la strada (il tasto,
    una voce del menu, un collegamento); prima che la prenda, se il menu è di
    lato, si disfa e solo dopo lascia il posto (`applicaSchermo`).

## La tela viva

### Il tasto che premi si ripassa

La prima versione faceva uscire tre «!» sul punto del clic. Era carina e
stancava subito: sempre uguale, sempre puntata sul dito, e diceva la cosa
sbagliata, perché nel manga i «!» sono la reazione di un personaggio sorpreso.

Adesso un gesto ha **una risposta sola**. Se il clic fa partire un disegno (una
scheda nuova, una finestra che si apre), la risposta è quel disegno e non si
aggiunge niente: il modulo conta i disegni partiti (`avviati`) e, due fotogrammi
dopo il clic, se il conto è cambiato lascia stare. Altrimenti il tasto premuto
**si ripassa a china**: l'inchiostro parte dal punto del contorno più vicino a
dove hai toccato, gira nei due versi e si chiude dalla parte opposta, in 150 ms;
poi l'inchiostro in più sfuma e resta il bordo di sempre. È del colore del
bordo vero e un filo più spesso, sul centro del bordo come la china.

Non è mai uguale: ogni tasto ha la sua forma, e ogni pressione ha la sua mano
(il seme è quello del tasto più il numero della pressione). Si ripassa solo
quello che ha un contorno: un collegamento nel testo o una voce di menù senza
bordo non ha niente da ripassare. Da tastiera parte dall'alto al centro. Chi
preme a raffica non riempie lo schermo: sullo stesso tasto, un ripasso ogni
600 ms. Contano solo i clic veri col tasto principale, e chi chiede meno
movimento non vede niente.

### La nuvoletta spigolosa

Una finestra che chiede un gesto di cui potresti pentirti (togliere una regola,
cancellare qualcosa) ha il tasto `pericolo`, e la sua carta diventa una
nuvoletta a punte rossa: nel manga è la nuvoletta di chi urla. La sagoma è un
svg dentro la carta, sotto il contenuto (`z-index: -1` in una carta che fa da
contesto a sé), con il fondo della carta, il bordo rosso e un'ombra d'inchiostro
spostata in basso a destra. Si adatta alla carta se la carta cambia misura. La
china del disegno ripassa la stessa forma, calcolata dalla stessa funzione con
lo stesso seme: quando il disegno finisce resta la sagoma, senza scatti. La
sagoma è la forma della carta, non un movimento: resta anche per chi chiede
meno movimento.

## Cosa resta animato, e perché

Il disegno è per le **vignette**: le cose che entrano ed escono dalla pagina.
Resta com'era quello che non è una vignetta:

- le **micro-interazioni**: tendine, pressione e sollevamento dei tasti, hover;
- lo stato **vivo**: le pulsazioni del «in diretta», i caricamenti, i contatori;
- il **titolo** della scheda, che entra parola per parola: è il lettering;
- il **cassetto** del menù, che scorre: è un cassetto;
- tra una pagina e l'altra (`@view-transition`) la barra, il marchio e il piede
  stanno fermi, e il contenuto si cambia senza animazione: poi si disegna.

Il «morph» che trasformava la voce di menù nella pagina non c'è più, e con lui
la View Transition interna, la direzione (`data-verso`), lo scivolo delle carte
(`--rev-x`) e i rientri sfalsati delle sottosezioni. Erano animazioni, e tutte
insieme dicevano un'altra lingua.

## La vetrina

La vetrina è una pagina a sé, a dieta: carica solo `RISORSE_VETRINA` e le regole
di `anime.css` che usa, copiate parola per parola in `anime-vetrina.css`.
`disegno.js` è fra le sue risorse e il blocco `.dg-*` sta, identico, in tutti e
due i fogli (lo sorveglia `scripts/verifica-dieta.mjs`). La nuvoletta no: nella
vetrina non ci sono finestre che chiedono gesti pericolosi.

Quali sono le vignette della vetrina non lo dice un elenco di classi: un elenco
scritto a mano prendeva carte che la pagina non mostrava più e lasciava fuori
il riquadro grande. Lo dice una regola. Una vignetta è un riquadro **chiuso**
(bordo su tutti e quattro i lati), che non è un comando (tasti, collegamenti,
campi) e non è fisso; e si prende la **più esterna**, perché le voci dentro
arrivano col retino della loro vignetta. Cercarle costa 6 ms su un telefono
rallentato quattro volte, e si fa nel tempo morto dopo il caricamento. Quelle
già a schermo in quel momento le hai viste, e non si ridisegnano. Le altre
aspettano invisibili (`dg-attesa`), come le carte del pannello, e al **primo
pixel** che entra si scoprono e si disegnano nello stesso momento. Nella prima
versione l'osservatore aspettava di vederne il 12%: su un riquadro alto 1546 px
erano 185 px già visti, poi il riquadro spariva e si ridisegnava. Chi chiede
meno movimento non aspetta niente, e in stampa si vede tutto. I loro bordi sono
di un pixel o due, e la china ne ricalca uno o due. I blocchi di solo testo non
si disegnano più né scivolano: ci sono.

## Come si controlla

- `test/contratto/disegno.test.mjs` legge nel codice le regole qui sopra.
  Ognuna è controllata per mutazione: rotta la regola, la prova diventa rossa.
- `scripts/verifica-stacco.mjs` apre il pannello in un browser vero e osserva
  ogni tela che nasce, per tutti i passaggi fra schede vicine. Controlla:
  - cambiando sezione, che si disfino tutte le vignette a schermo della scena
    vecchia, una per una; e che dentro la stessa sezione non se ne disfi
    nessuna;
  - disegno ogni volta, in ordine di lettura;
  - nessuna tela rimasta nel documento;
  - avvisi con le scintille o la vena di rabbia, che se ne vanno disegnandosi
    all'indietro;
  - la finestra disegnata sopra il suo velo, che chiudendosi si disfa e se ne
    va;
  - la finestra di un gesto pericoloso: la sagoma a punte è grande quanto la
    carta più il suo margine, e la china ripassa esattamente la sua forma;
  - il tasto premuto si ripassa sopra al tasto stesso, solo per un clic vero,
    e se ne va; se il gesto apre una finestra (un tasto di prova col bordo che
    apre una conferma) non si ripassa niente;
  - la modalità leggera che disegna, e «meno movimento» che non disegna.

  L'autoprova toglie l'uscita e pretende il rosso.
- `scripts/verifica-larghezza.mjs` gira a 360 px col disegno acceso: nessuna
  tela allarga la pagina.
