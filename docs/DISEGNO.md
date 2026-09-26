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

Il codice sta in due file. `src/web/public/disegno.js` (`SB_DISEGNO`) lo portano
tutte le pagine, vetrina compresa; `src/web/public/disegno-pannello.js` lo porta
solo il pannello, subito dopo: il menù, la scena delle sezioni, l'urlo e le
cornici. Il secondo si aggancia al primo con `SB_DISEGNO.estendi`, e il primo lo
avvisa quando la pagina cambia senza sapere chi ascolta: così la vetrina non paga
il peso di quello che non usa (`scripts/verifica-dieta.mjs`). Più il blocco
`.dg-*` in `anime.css`.

**Tutto quello che compare si disegna, tutto quello che se ne va si disfa. In
ogni caso.** Chiesto così: «che sia quando compare o quando scompare il menu
deve venire disegnato in ogni caso. Tutto deve essere disegnato, non tralasciamo
nulla, i dettagli sono vitalmente importanti». Non ci sono strade di serie B né
eccezioni: né per la finestra che cambia misura, né per la pagina che si carica,
né per chi chiede meno movimento.

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
| cambi **sezione** (da scena a scena) | ogni vignetta della scheda vecchia si disegna all'indietro, testata compresa, poi la nuova si disegna |
| cambi **sottosezione** (da azione ad azione, `stessaFamiglia()`) | lo stesso: la scheda vecchia si disfa, poi la sorella si disegna |
| scorri e arriva una carta | la carta si disegna quando entra |
| un avviso | si disegna veloce, con le scintille o la vena di rabbia; se ne va disegnandosi all'indietro |
| una finestra, la ricerca, la visita guidata | la loro carta si disegna sopra al velo, e chiudendola si disegna all'indietro |
| una finestra ti chiede un gesto di cui potresti pentirti | la carta è una nuvoletta spigolosa rossa, come un urlo |
| premi un tasto che ha un contorno, e il gesto non fa partire altri disegni | il tasto si ripassa a china dal punto toccato, poi l'inchiostro in più sfuma |
| il menù compare o cambia forma, in qualunque modo (lo apri, la pagina si carica, la finestra si allarga o si stringe, il tablet gira, togli il tutto schermo) | il cassetto si disegna nella forma che ha lì, poi i gruppi uno dopo l'altro |
| il menù se ne va, in qualunque modo (la X, il velo, Esc, una voce, il tasto della barra, il tutto schermo, la finestra che si stringe) | il cassetto e i gruppi si disegnano all'indietro dove sono, e il velo sfuma insieme |
| una cosa nascosta compare (una tendina, un menu a discesa, un riquadro che dipende da una scelta) | si disegna: il suo contorno, o il solo retino se non ne ha, più i riquadri che ha dentro |
| si nasconde | resta dov'è finché si è disegnata all'indietro, poi se ne va |
| apri una tendina (`<details>`) | il contenuto si scopre col retino, e i suoi riquadri si tracciano |
| la chiudi | il contenuto si ricopre, poi la tendina si chiude |
| una finestra di sistema (le novità, un invito) | si disegna sopra al suo velo, e chiudendola, da qualunque parte e anche con Esc, si disfa prima di chiudersi |
| la ricerca cambia risultati mentre scrivi | i risultati nuovi si scoprono col retino |
| ripieghi una carta | il suo corpo si ricopre col retino, poi la carta si chiude e il riassunto si scopre |
| la riapri | il corpo si scopre, e il riassunto se ne va disfacendosi |
| un gruppo del menù si apre o si chiude | le sue voci si scoprono o si ricoprono col retino |
| la barra delle modifiche non salvate arriva o se ne va | si disegna e si disfa dov'è, non scivola |
| la pagina si carica | i disegni aspettano che la copertina cominci ad andarsene: sotto la copertina non li vedrebbe nessuno |
| arriva dopo una carta, o una riga col suo contorno (i dati caricati, una riga che aggiungi) | si disegna quando arriva; se arriva fuori schermo, al suo primo pixel |
| togli una riga (un'azione, una frase, un'offerta, un premio) | si disfa, poi se ne va; chi salva il modulo non la conta già più |
| la pagina si rifà tutta dopo un gesto (un salvataggio, un altro canale, un'altra lingua) | si disfa tutta, menù e barra in alto compresi, poi si ridisegna |
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
3. **La china ricalca il bordo vero, lato per lato e angolo per angolo.**
   Spessore, colore e raggio vengono dall'elemento, e il tratto sta al centro del
   bordo (`sp/2`), dove il bordo è. Quando il disegno finisce e torna il bordo del
   CSS non c'è nessuno scatto: le carte del pannello hanno il tratto spesso,
   quelle della vetrina un pixel. Sulla nuvoletta il bordo è la sagoma a punte, e
   la china ricalca quella. Si traccia solo il lato che c'è, e un angolo si
   arrotonda solo fra due lati veri, col suo raggio in orizzontale e in
   verticale; i raggi che si sovrappongono si riducono tutti insieme, come fa il
   CSS. Prima la misura leggeva un lato solo e ne tracciava sempre quattro: il
   cassetto del telefono, che ha tre lati perché il destro sta sul bordo dello
   schermo, avrebbe avuto un quarto lato di china che spariva a disegno finito.
   Per un elemento a quattro lati col raggio uguale il tracciato è lo stesso di
   prima, al decimo di pixel (provato su 108 forme). La matita abbozza solo i
   lati che ci sono.
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
7. **In ordine di lettura.** Quando una scena si apre, la testata (il riquadro
   «Come funziona», la barra delle sorelle, la descrizione, i tasti) e le carte
   a schermo si ordinano dall'alto e da sinistra, 70 ms l'una dall'altra. Il
   titolo entra parola per parola, è il lettering, e non si ridisegna; uscendo
   si ricopre come il resto. Nel prototipo si disegnava prima la carta in basso e poi il
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
    vedersi.
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
19. **Si disegna solo quello che si vede.** Un gruppo dentro un cassetto
    chiuso (nascosto, `visibility: hidden`) ha una scatola sullo schermo, e il
    disegno la troverebbe: lascerebbe inchiostro sopra alla pagina, attorno a una
    cosa che non c'è. La misura dice se l'elemento si vede, e chi non si vede non
    si disegna.
20. **Il menu si chiude al gesto.** Scegliendo una voce che cambia sezione, la
    scena vecchia si disfa e il menu si chiude nello stesso momento. Prima il
    menu aspettava che la scena finisse di disfarsi, e se ne andava dopo: quando
    spariva di colpo non si notava, disegnandosi sarebbe rimasto fermo, aperto,
    dopo che avevi già scelto.
21. **Meno movimento non spegne il disegno.** Il disegno è il modo in cui le
    cose compaiono e se ne vanno, non un movimento in più: non sposta niente,
    non ingrandisce, non scorre. «Riduci movimento» ferma lo scorrere morbido,
    le cose che volano, le pulsazioni, i numeri che contano; i tratti e il
    retino no. La regola che riduce ogni animazione a niente li lascia fuori
    (`:not(.dg-in, .dg-out, .dg-tela, .dg-tela *)`), le carte aspettano il loro
    disegno come per tutti, e cambiando sezione la scena vecchia si disfa
    sempre. Prima il modulo aveva un interruttore che spegneva tutto, e con
    «meno movimento» il menù compariva e spariva di colpo.
22. **Uscire dura quanto il disegno all'indietro, sempre.** `--t-uscita` è il
    tempo che l'app aspetta prima di togliere una cosa, e non si accorcia con
    meno movimento. Scendeva a un centesimo di millisecondo: la scena, gli
    avvisi e le finestre sparivano mentre cominciavano a disfarsi.

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

## Tutto si disegna: le strade

Il disegno non ha una lista di cose da disegnare: guarda le strade da cui una
cosa compare o se ne va, e ognuna passa di lì. Una cosa aggiunta domani, da
chiunque, si disegna senza che nessuno se ne ricordi.

- **Le classi del ciclo di vita.** `visibile` ed `esce` per le schede, `dentro`
  per le carte, le finestre e chi entra da sé (la barra delle modifiche),
  `menu-aperto` per il menù. E `esce` vale per chiunque: chi la prende si
  disfa, e chi la toglie dalla pagina aspetta `--t-uscita`. Se la classe se ne
  va prima (ci hai ripensato), si ridisegna.
- **L'attributo `hidden`.** Tolto: la cosa compare, e si disegna. Messo: l'app
  ha finito, e per lei la cosa è nascosta (lo stato dice `hidden`); la vista la
  tiene dov'era (`dg-resta`, col `display` che aveva) finché si è disegnata
  all'indietro, e intanto non si tocca e col Tab non ci si arriva. Per leggere
  come si vedeva, il modulo toglie un istante l'attributo, misura e lo rimette,
  senza che il browser dipinga in mezzo, e dimentica le mosse fatte da sé
  (`takeRecords`) per non scambiarle per mosse dell'app.
- **Le tendine (`<details>`).** Aprendosi, il contenuto si scopre; chiudendosi
  resta aperto alla vista (`::details-content` visibile) finché si è ricoperto.
- **Le finestre di sistema (`<dialog>`).** Stanno nel livello più alto della
  pagina, sopra a tutto: una tela appesa al corpo della pagina starebbe sotto.
  La loro tela sta in uno strato suo, un popover aperto dopo la finestra. E si
  chiudono solo dopo essersi disfatte, da qualunque codice le chiuda e anche
  con Esc: `close()` passa dal disegno.
- **Chi si aggiunge sopra a tutto** (un figlio diretto della pagina: una
  tendina volante, una striscia, un pulsante che galleggia) si disegna quando
  arriva.
- **Chi arriva dentro alla scheda aperta.** Una riga aggiunta senza togliere
  niente compare, col contorno o col solo retino. In una lista riscritta
  compare solo il riquadro col contorno che prima non c'era: uno rifatto uguale
  al suo posto (la stessa etichetta, le stesse classi, lo stesso testo) lo
  vedevi già. Una riga che togli passa da `togli`: prende `esce`, si disfa, e
  poi se ne va; chi legge il modulo per salvarlo salta le righe con `esce`.
- **La pagina che si rifà.** Dopo un gesto che cambia i dati (un salvataggio,
  un altro canale, un'altra lingua) il pannello si riscrive tutto: prima la
  scena si disfa, il menù si disfa (`menu-via`) e la barra in alto si ricopre,
  poi `render()`, poi tutto si ridisegna (`ridisegna`).
- **Chi compare fuori schermo** aspetta invisibile il suo primo pixel, come le
  carte e le vignette della vetrina.
- **Chi dichiara le sue parti** (`data-dg-parti="selettore"`). Il disegno da sé
  salta i tasti: in una scheda un tasto non è una vignetta. Una scena fatta di
  tasti, come la plancia (le tessere sono tasti), gli dice quali parti sono le
  sue: si disegnano quelle che si vedono a schermo, una dopo l'altra
  nell'ordine in cui sono scritte nella pagina (che per la plancia è l'ordine
  di lettura: i tasti in alto, l'etichetta del gruppo, le tessere da sinistra, i
  tasti della guida in fondo),
  e all'uscita si disfano le stesse.

Cosa si disegna di una cosa che compare: il suo contorno, se ce l'ha; se non ce
l'ha, il retino la scopre, e i riquadri col contorno che ha dentro si tracciano
insieme. Chi sta dentro a una cosa che si sta già disegnando lo scopre il retino
di chi lo contiene, e non si disegna due volte.

Non si disegna il contenuto dello streamer (`data-dg-no`): la tela dello
Studio, l'anteprima di un effetto, quella del file che carichi. Mostrano
l'overlay com'è in onda, con le entrate e le uscite che ha scelto lo streamer.

Il velo di una finestra sfuma il suo colore e la sfocatura, non l'opacità:
sfumando il velo intero si sfumava anche la carta, che spariva mentre si
disfaceva (e con meno movimento spariva di colpo). La carta prima di entrare
non si vede, e mentre si disfa sì.

## Lo Studio: le regole per chi scrive

Nello Studio si vedevano modi di comparire e sparire che il disegno non poteva
vedere, o che vedeva male. Da lì vengono queste regole, e valgono per tutto il
pannello.

- **Si nasconde con `hidden`, mai con una classe che nasconde i figli.** Un
  pannello arrotolato, l'inspector senza niente di scelto e la guida del banco
  li nascondeva il CSS: `display: none` appeso a una classe del contenitore.
  Per il disegno era un contenitore che cambiava classe, non un corpo che se ne
  andava, e il corpo spariva di colpo e tornava senza disegnarsi. Adesso
  `arrotola` mette `hidden` sul corpo del pannello, e nell'inspector il pieno e
  il vuoto si danno il cambio con `hidden`. La guida del banco nasce `hidden`
  se il tasto è spento, e il tasto la mostra e la nasconde. Sul telefono di
  lato c'era anche una regola che la nascondeva sempre: il tasto non faceva
  niente, ed è uscita.
- **Una lista si riconcilia per chiave, non si riscrive.** I livelli si rifacevano
  con `innerHTML` a ogni giro. Una riga che si stava disegnando veniva buttata
  e ne nasceva un'altra uguale, senza disegno, e una riga tolta spariva di
  colpo. Adesso `_riconciliaLivelli` ritrova le righe per chiave, cambia solo
  quello che è cambiato, mette in ordine spostando, e manda via con `togli`
  quelle che non ci sono più. La coda della lista (il vuoto, «Aggiungi») si
  scrive una volta sola.
- **Le classi `dg-*` sono del disegno.** Chi riconcilia una riga le lascia
  com'erano: toglierle a metà disegno lasciava una riga non disegnata.
- **Nello stesso posto, prima si disfa chi va e poi arriva chi viene.**
  Scegliendo un altro elemento, il blocco dei comandi di prima si disfaceva
  mentre quello nuovo compariva: per un attimo due blocchi uno sopra l'altro,
  e il nuovo saltava su quando il vecchio se ne andava. Adesso fa come la carta
  che si ripiega: `_cambiaDiMano` fa disfare chi va (`SB_DISEGNO.via`), che dice
  quanto ci mette, e a disegno finito, nello stesso istante, chi va prende
  `hidden` e chi viene lo perde. L'orologio è uno solo. Con due (l'app che
  aspettava `--t-uscita`, il disegno che partiva quando la pagina glielo
  lasciava fare) su una pagina lenta il nuovo arrivava mentre il vecchio si
  disfaceva ancora. Se nel frattempo lo si richiede, l'uscita in corso non si
  salta; se ci si ripensa, chi stava andando si ridisegna. Vale anche fra il
  pieno e il vuoto dell'inspector, per il contenitore dei blocchi e per il
  rimando di chi si modifica in un'altra scheda. Il contenitore lo spegneva il
  CSS quando non aveva blocchi in vista (`:has(... :not([hidden]))`): fra
  l'uscita e l'arrivo si spegneva e si portava via di colpo chi si disfaceva.

E il disegno stesso ha imparato una cosa. Chi prende `hidden` resta in vista
finché si è disfatto, ma solo se prima si vedeva. Per saperlo il disegno
guardava la pagina *dopo* il giro di modifiche: se nello stesso giro compariva
il suo contenitore, un blocco mai visto sembrava visibile e si disfaceva (alla
prima scelta si disfacevano tutti i blocchi dello Studio). Al contrario, un
blocco che se ne andava insieme al suo contenitore sembrava già nascosto e
spariva di colpo. Adesso `trattieniChiSiVedeva` rimette la pagina com'era prima
del giro, misura e la riporta com'è. Chi sta dentro a uno che si disfa resta in
vista con lui, senza un secondo disegno. Chi si è già disfatto (lo ha fatto
disfare l'app) prendendo `hidden` non si disfa una seconda volta. Chi ricompare
prima di essersi disfatto torna subito toccabile.

E una tendina che si chiude resta dov'è finché si è disfatta. Prima tornava
subito nel suo guscio, e si disfaceva in un posto diverso da quello in cui la
si vedeva.

`scripts/verifica-comparse.mjs` fa questi gesti nello Studio, sul computer e
sul telefono di lato. L'autoprova ha una rottura in più: il pannello che si
arrotola di colpo, con `display` al posto di `hidden`. `scripts/verifica-studio.mjs`
sceglie ogni elemento e guarda che, mentre il blocco cambia, due blocchi non
si vedano mai insieme.

## Il cassetto del telefono

Scorreva, ed era scritto qui fra le cose che restano animate: «è un
cassetto». Chiesto così, con la foto del menu aperto: «quando schiaccio la x
qui deve fare la solita animazione disegnata, non la transizione». Adesso il
cassetto del telefono fa come quello del tutto schermo: non si sposta, compare
dove sta e si disegna, e se ne va da lì disegnandosi all'indietro, qualunque
strada lo chiuda. Chiuso è nascosto (`visibility: hidden`), non spostato fuori
dallo schermo: così col tasto Tab non ci si arriva più, cosa che prima
succedeva. Il velo dietro sfuma mentre il cassetto si disfa (`menu-via`), non
dopo. Tutte le strade passano da due funzioni, `apriMenu` e `chiudiMenuMobile`:
prima il tasto «Altro» della barra in basso e l'hamburger accendevano e
spegnevano la classe per conto loro, e avrebbero saltato il disegno.

## Il menù in ogni caso

Le strade che fanno comparire o sparire il menù sono tante: il tasto, il velo,
Esc, una voce, il tutto schermo che arriva o se ne va, la finestra che si
allarga o si stringe (ed è anche il tablet che gira), la pagina che si carica.
Una regola per strada vuol dire dimenticarne una, ed era successo: con la
finestra che cambiava misura il menù compariva già fatto e spariva di colpo, e
il menu di lato, che si disfaceva entrando nel tutto schermo, tornava senza
disegnarsi. Adesso le regole sono due, e non nominano nessuna strada.

- **Compare: lo guarda il modulo.** Il menù ha una forma, che è il suo contorno:
  il cassetto del telefono ha tre lati, quello posato del tutto schermo quattro,
  quello di lato uno solo (il bordo destro). A ogni classe che cambia sulla
  pagina, a ogni cambio di misura della finestra e appena parte, il modulo
  guarda se il menù si vede e in che forma (`formaMenu`); se si vede in una forma
  nuova, lo disegna (`sulMenu`). Così si disegna quando lo apri, quando la
  pagina si carica, quando la finestra si allarga e il cassetto chiuso diventa il
  menu di lato, quando il cassetto aperto diventa il menu di lato, e quando togli
  il tutto schermo.
- **Se ne va: chi lo nasconde lo dice prima.** Chi sta per nasconderlo mette
  `menu-via`, lo disfa (`viaMenu`) e solo dopo cambia la pagina: la X e le altre
  strade del cassetto, il tasto del tutto schermo, la scheda larga che lo
  accende. Un menù con `menu-via` se ne sta andando, e per il modulo non sta
  comparendo. Chiudere è disfare solo se il menù sparisce davvero: il cassetto
  che diventa il menu di lato resta, e si ridisegna nella forma nuova
  (`menuFisso`).
- **La finestra che si stringe.** Il menu di lato non ha più posto: resta in
  vista come cassetto, con `menu-aperto` e `menu-via` insieme, quanto basta per
  disfarsi, poi se ne va. Il velo resta spento e l'hamburger non diventa una X.

## Cosa resta animato, e perché

Tutto quello che entra ed esce dalla pagina si disegna: le tendine e i menu a
discesa comprese, che prima entravano sfumando. Resta com'era quello che non
entra e non esce:

- le **micro-interazioni**: pressione e sollevamento dei tasti, hover, la
  freccia di una tendina che gira;
- lo stato **vivo**: le pulsazioni del «in diretta», i caricamenti, i contatori;
- il **titolo** della scheda, che entra parola per parola: è il lettering. Lo
  stesso per il nome della voce scelta nella plancia, ogni volta che cambia.
  Lì il carattere è a pennarello, e i suoi accenti (la «à» di «Personalità»)
  salgono sopra la riga: la parola parte più in basso (`pl-parola-su`, 140%
  invece di 110%), così l'accento non spunta dal bordo prima della lettera;
- la **rotaia della plancia**, che scorre per portare la tessera scelta al suo
  posto: è il gesto stesso, non un'entrata. La plancia prima entrava sfumando
  e il suo titolo scivolava di lato: a opacità zero il disegno non vedeva
  niente da disegnare, e restava un'animazione qualunque;
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
erano 185 px già visti, poi il riquadro spariva e si ridisegnava. In stampa si
vede tutto. I loro bordi sono
di un pixel o due, e la china ne ricalca uno o due. I blocchi di solo testo non
si disegnano più né scivolano: ci sono.

## Come si controlla

- `scripts/verifica-comparse.mjs` non conosce le strade: guarda la pagina a
  ogni giro di fotogramma e registra ogni riquadro col contorno che diventa
  visibile o smette di esserlo, e per ognuno controlla la regola sola. Chi
  compare a schermo si sta scoprendo (lui o chi lo contiene ha preso `dg-in`,
  con un'animazione vera); chi sparisce a schermo si stava ricoprendo. Quando un
  disegno comincia lo si annota subito dall'osservatore delle classi: il giro
  sulla pagina può essere lento (lo Studio ha migliaia di pezzi) e un disegno
  all'indietro dura 250 ms. Non è una comparsa un riquadro che prende un bordo
  restando dov'era, né uno rifatto uguale al suo posto. Il contenuto di una
  tendina chiusa non si vede, anche se il browser, se glielo chiedi, ne calcola
  le misure. Fa i gesti sul pannello (computer e telefono), col banner dei
  cookie e nella vetrina, e pretende che ognuno faccia davvero comparire o
  sparire qualcosa. L'autoprova toglie l'attributo `hidden` dal disegno,
  riporta la chiusura delle finestre di sistema a quella del browser, e toglie
  al disegno la classe `esce`.

- `test/contratto/disegno.test.mjs` legge nel codice le regole qui sopra.
  Ognuna è controllata per mutazione: rotta la regola, la prova diventa rossa.
- `scripts/verifica-stacco.mjs` apre il pannello in un browser vero e osserva
  ogni tela che nasce, per tutti i passaggi fra schede vicine. Controlla:
  - cambiando scheda, sezione o sorella, che si disfino tutte le vignette a
    schermo della scena vecchia, testata compresa, una per una;
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
  - la modalità leggera che disegna, e «meno movimento» che disegna lo stesso:
    cambiando sezione si vede la china della scena vecchia ritirarsi e quella
    della nuova tracciarsi.

  - il cassetto del telefono, aperto e chiuso per ognuna delle cinque strade
    (la X, il velo, Esc, una voce, il tasto della barra in basso): non si sposta
    mai; aprendolo si disegna, con la china sui suoi tre lati; chiudendolo, a
    ogni fotogramma finché si vede, si disfa lui coi suoi gruppi, e il velo è
    già sfumato prima che sparisca; non lascia niente.
  - il menù a ogni fotogramma, dal caricamento alla fine, sul telefono e sul
    computer: ogni volta che si vede in una forma nuova la sua china non ha
    ancora finito di tracciarsi, ogni volta che sparisce si stava ritirando
    mentre si vedeva. Si leggono i tempi veri delle animazioni, non il tratto a
    un istante: la china del cassetto si ritira in 80 ms a due disegni, e un
    fotogramma perso mentre la finestra cambia misura bastava a non vederla. Le
    strade provate: la pagina che si carica, la finestra che si stringe e si
    allarga, col cassetto chiuso e aperto, il tutto schermo avanti e indietro,
    il menù posato aperto e chiuso, e poi con meno movimento; ognuna deve fare
    davvero quello che si guarda.

  L'autoprova rompe sette cose, ognuna in un processo suo, e pretende il
  rosso per la ragione giusta: la scheda vecchia che non si disfa, il cassetto
  che si chiude senza disfarsi, il cassetto che torna a scivolare, il velo che
  aspetta la fine del disegno, il menù che al cambio di misura compare già
  fatto, il menu di lato che stringendo la finestra sparisce di colpo, i
  disegni che con meno movimento tornano istantanei. Una misura a un istante
  fisso non basta: il disegno all'indietro del cassetto dura circa 200 ms, e la
  prima versione lo guardava quando era già finito.
- `test/contratto/disegno.test.mjs` prova anche il contorno con un lato
  mancante: il cassetto ha due angoli, parte e finisce sul bordo destro, e
  nessun tratto corre lungo il lato che non c'è.
- `scripts/verifica-larghezza.mjs` gira a 360 px col disegno acceso: nessuna
  tela allarga la pagina.
