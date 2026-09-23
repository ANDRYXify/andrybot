# Il telefono

I file del sito non hanno commenti: quello che spiegherebbero sta qui.

## Il difetto: la generosita del desktop diventa un muro

Il pannello su desktop e **una pagina** — c'e spazio per titolo grande, guida aperta e controlli
tutti insieme. Su un telefono da 844 px quella stessa generosita significava che, aprendo una
sezione, il **primo controllo toccabile stava a 870 px**: piu di una schermata intera di preambolo
(banner, occhiello, titolo, sottotitolo, «Come funziona» aperto, «Apri/Riduci tutto», suggerimento)
prima di vedere una sola cosa per cui eri entrato. Il tema non c'entrava: era la gerarchia.

Misurato: primo controllo da **870 px a 528 px**, altezza della sezione da **4062 px a 3708 px**.

## La postura mobile: un'app, non una pagina

Sotto i **720 px** e con `body.con-nav` (solo il pannello, mai la vetrina):

**Barra in basso** (`.barra-giu`, generata da `barraGiuHtml`). Cinque voci sotto il pollice:
Stato · Bot · Chat · Diretta · Altro. Le tre di mezzo sono i gruppi di `GRUPPI` e portano alla loro
prima scheda sbloccata; «Altro» apre il cassetto con tutto il resto e si accende quando la sezione
corrente non e in nessuna delle quattro — cosi sei **sempre** da qualche parte. Icone prese da
`ICONA` della prima scheda del gruppo: nessun set nuovo da mantenere. `env(safe-area-inset-bottom)`,
z-index 49 (sotto il velo del cassetto, che e 50: la barra si oscura col resto).

**Capo compatto.** `--top-h` scende da 60 a 54 px. Quando l'`h1` grande esce dallo schermo, un
`IntersectionObserver` mette `body.titolo-via`: il nome della sezione compare nella barra in alto e
la scritta del marchio si ritira. Un osservatore solo, nessun lavoro per fotogramma. L'hamburger
sparisce: la voce «Altro» fa gia quel lavoro.

**La guida chiusa di default.** `guidaSchedaHtml` apriva sempre. Su schermo stretto parte chiusa
(la scelta di chi la apre resta ricordata come prima). E il risparmio piu grande: ~600 px per
sezione, su ogni sezione.

**Chi possiede lo stato.** `aggiornaBarraGiu()` e `osservaTitolo()` si chiamano da dentro
`aggiornaTestataPagina()`, non da `render()`: `vaiAScheda` non passa da `render()`, e agganciandoli
li la barra e il capo non possono restare indietro rispetto al titolo — sono lo stesso stato.

**Densita e dettagli.** Carte piu strette, titolo a 1.42rem, «Apri/Riduci tutto» ridotti e allineati
a destra, il suggerimento nascosto. La coppia bottone + spiegazione (`p:has(> .btn):has(>
.suggerimento)`) si impila invece di far tracimare il testo fuori dalla carta. La riga
dell'interruttore manda le pillole a capo invece di spezzare «Bot acceso». Il banner dei cookie e la
lente si alzano sopra la barra. La plancia (`#plancia-lancia`) sparisce: e una modalita console, sul
telefono non ha senso.

**Copy che sa dov'e.** `tocco()` (`pointer: coarse`) trasforma «Clicca il titolo» in «Tocca il
titolo».

## Cosa NON e cambiato

Sopra i 720 px non c'e la barra in basso: la guida e aperta, la plancia c'e, e il menu e
l'hamburger o, dai 1024 px, il menu di lato (sotto).

## Il menu: uno solo, due modi di mostrarlo

Prima in alto c'era una barra a tendine, che si ritirava nel cassetto quando le
voci non ci stavano. Misurandolo su un computer vero, pero, non ci stavano quasi
mai: sotto i 1280 px il cassetto c'era per regola, a 1366 px perche le voci non
entravano, e con otto gruppi la barra si vedeva solo sugli schermi piu larghi.
Sul computer ogni scheda costava due clic, e dove eri lo diceva solo il titolo.

Adesso il menu e **uno**: l'elenco del cassetto (`navDrawerHtml`). Cambia solo
come si presenta:

| larghezza | il menu |
|---|---|
| fino a 720 px | la barra in basso, e «Altro» apre il cassetto |
| da 721 a 1023 px | l'hamburger apre il cassetto |
| da 1024 px (64rem) | il cassetto sta fermo a sinistra, sempre aperto; nello Studio torna cassetto |

I 1024 px non sono un numero a occhio: sono il menu (15rem) piu la colonna piu
stretta in cui le carte stanno ancora comode accanto a lui (49rem). Da li in su
c'e posto per tutti e due.

Di lato, il cassetto perde quello che serviva solo al cassetto: la testata con
la X, il velo dietro, l'hamburger. Gli strumenti (lingua, suono, tema, aiuto,
cambio canale, esci) tornano nella barra in alto, dove adesso c'e spazio.

**Nello Studio il menu torna cassetto.** Lì la larghezza serve alla tela: di
lato il menu si prendeva 240 px e a 1440 la tela era larga 491. Col banco
aperto (`body.banco-on`) il menu si apre dall'hamburger, che sta accanto agli
strumenti in alto; uscendo dallo Studio torna di lato. Gli strumenti restano
nella barra in alto, quindi nel cassetto non si ripetono. Le misure e il resto
dello spazio della tela stanno in `docs/BANCO.md`.

Tre cose che valgono per come e fatto, non per un controllo in piu:

- **Nessun secondo elenco da tenere allineato.** Le tendine in alto avevano il
  loro HTML, i loro tasti e la loro misura: sono sparite, insieme a
  `misuraBarraTop` e `barra-stretta`.
- **La voce accesa ha una regola sola**, `voceAttiva`. La usano il disegno del
  menu e il cambio di scheda, e accende la voce anche quando sei in una scheda
  sorella della stessa famiglia. La voce accesa ha `aria-current="page"`, cosi
  anche chi usa un lettore di schermo sa dove si trova.
- **Di lato il cassetto non si apre.** Se la finestra si allarga col cassetto
  aperto, si chiude da solo (`matchMedia`), e di lato il velo non esiste. Uno
  stato che li non ha senso non puo restare acceso.

Con trenta voci a sinistra, arrivare al contenuto con la tastiera voleva dire
premere Tab trenta volte: il primo Tab della pagina fa comparire «Vai al
contenuto».

### I gruppi si chiudono, come vignette

Trenta voci aperte erano un elenco da scorrere ogni volta. Adesso ogni gruppo è
una vignetta, col bordo a mano e la didascalia nera come le carte della pagina,
e la didascalia è un bottone (`aria-expanded`) che apre e chiude il gruppo.
Resta aperto **il gruppo della scheda in cui sei**: cambiando scheda si apre
il suo e si chiudono gli altri (`apriGruppiDi`), e quelli aperti a mano restano
aperti finché non cambi scheda. Un gruppo di una voce sola col nome del gruppo
(«Stato») non ha didascalia e non si chiude.

Due cose tenute per costruzione:

- **La voce accesa non sta mai in un gruppo chiuso**: il cambio di scheda apre
  il suo gruppo nello stesso passo in cui accende la voce (`aggiornaStatoNav`).
- **Una novità non si perde in un gruppo chiuso**: la didascalia mostra lo
  scoppio «!» finché il gruppo è chiuso, e lo nasconde quando lo apri, perché
  allora si vede sulla voce. Le voci di un gruppo chiuso sono `hidden`: non si
  raggiungono col Tab e il lettore di schermo non le legge.

La voce accesa è un timbro: fondo del colore del marchio, bordo e ombra
d'inchiostro, un filo storta. Il nome più lungo dei gruppi («Durante la
diretta», «Durante el directo») con lo scoppio accanto sta su una riga sola di
lato: misurato, 127 px di testo in 129 di posto.

### Le colonne si scelgono sullo spazio che c'è, non sulla finestra

Il menu fermo di lato si prende 15rem (240 px): da 1024 px in su la finestra
non è più lo spazio del contenuto. Una soglia scritta sulla finestra prima del
menu di lato mente di 240 px, e l'editor della pagina link e delle donazioni ci
è cascato: sceglieva tre colonne da 1380 px di finestra, ma a 1440 la sua carta
è larga 946 px, comandi (21rem) e ispettore (26rem) se ne prendevano 752 e
all'anteprima restavano 159. Il telefono schiacciato, una parola per riga.

Adesso l'editor è un contenitore (`#lp-box`, `#lp-box-dona`, `container: lp`)
e le colonne le sceglie sulla propria larghezza. Le soglie sono la somma delle
colonne con l'anteprima al suo minimo, cioè il telefono (24rem) con la sua
cornice (0,8rem per lato), 26rem:

| colonne | soglia | conto |
|---|---|---|
| una | sotto 51,1rem | comandi, ispettore e anteprima uno sotto l'altro |
| due | da 51,1rem | 24 + 1,1 + 26 |
| tre | da 75,2rem | 21 + 1,1 + 26 + 1,1 + 26 |

`test/contratto/editor-colonne.test.mjs` legge i numeri dal foglio di stile e
rifà i conti: una colonna cambiata senza la sua soglia è rossa.

### Il collaudo

```
node scripts/verifica-barra.mjs
```

Apre un browser vero e prova quattordici larghezze da 390 a 2560 px, tre lingue,
con e senza i poteri da amministratore. A ogni combinazione pretende che:

- il menu si raggiunga in **un modo solo** (la barra in basso, l'hamburger o il
  menu di lato: mai nessuno, mai due);
- nella barra in alto il logo e gli strumenti non si tocchino;
- il menu di lato non copra il contenuto, niente esca dai suoi bordi, e l'ultima
  voce si raggiunga scorrendo, **coi gruppi tutti aperti** (il caso più lungo;
  li apre e li richiude col clic vero sulle didascalie). E che il menu scorra
  davvero: `scrollTop` sposta anche un elemento con `overflow: hidden`, che la
  persona invece non può scorrere, e prima il collaudo non se ne accorgeva;
- una voce sola sia quella accesa, ed e quella della scheda in cui sei, in un
  gruppo aperto;
- un gruppo chiuso con dentro una novità mostri lo scoppio sulla didascalia.

Dove c'e il cassetto lo apre, controlla che niente ne esca e che si chiuda
cliccando fuori. E allarga la finestra col cassetto aperto, per vedere che si
chiuda da solo.

## Il cassetto si chiude cliccando fuori

Un menu che copre mezzo schermo e si chiude solo con la X è una trappola. Il
velo dietro il cassetto (`.backdrop`) è quello che intercetta il clic fuori —
c'era, ma **acceso da una media query a 1280px**.

Nel frattempo la barra ha smesso di ritirarsi «sotto una larghezza decisa» ed è
passata a ritirarsi **quando non ci sta** (`body.barra-stretta`, misurata). Le
due regole decidevano la stessa cosa — «adesso il menu è un cassetto» — in due
modi diversi, e sopra i 1280px non erano d'accordo: compariva l'hamburger, si
apriva il cassetto, e il velo non c'era. Cliccare fuori non faceva niente.

Ora il velo segue **lo stesso stato che apre il cassetto** (`body.menu-aperto`),
non la larghezza della finestra: una regola sola, e non possono più divergere.

`scripts/verifica-barra.mjs` lo prova in un browser vero a ogni larghezza,
lingua e ruolo: dove c'è il cassetto, lo apre, clicca fuori e pretende che si
chiuda. Oggi la barra a tendine non c'è più e di lato il cassetto non si apre,
ma la regola resta quella: il velo segue `body.menu-aperto`, e nient'altro.

## Nel cassetto non ci vanno tendine

Il cassetto scorre (`overflow-y: auto`), quindi **ritaglia**: una tendina aperta
lì dentro viene tagliata. Succedeva col «?» — si apriva un menu più largo del
cassetto e sul telefono si leggeva mezza parola: «de», «nuali», «vità» al posto
di Guide, Manuali, Novità.

La cura non è spostare la tendina di qualche pixel, è che **dentro un elenco non
ci vanno tendine**: il cassetto è già un elenco, e l'aiuto e il cambio canale ci
stanno come righe. Stesso contenuto della barra, stessa fonte (`vociAiuto()`),
nessun secondo posto da tenere allineato.

`scripts/verifica-barra.mjs` lo misura: a cassetto aperto, **nessun elemento
esce dal riquadro del cassetto**, a ogni larghezza, lingua e ruolo.

E lo misura **a cassetto fermo**: l'animazione ha un rimbalzo, quindi si aspetta
che la trasformazione sia tornata l'identità invece di contare i millisecondi.
Mentre scivola, il riquadro del cassetto e quelli dei figli si arrotondano in
modo diverso e si leggono due pixel di troppo che non esistono — la prima
versione del controllo segnalava ventiquattro difetti immaginari per questo.

## Quello che si tocca si prende col dito

Una «×» di 19 per 16 pixel accanto al nome che toglie è un tasto che si
sbaglia: col dito si prende il nome, o il vicino, o niente. Stava negli amici di
Telegram e di Discord e nelle fonti dei post nuovi.

La regola è quella delle WCAG (2.5.8, livello AA): un bersaglio è grande almeno
24 per 24 pixel, oppure ha spazio intorno, cioè un cerchio da 24 centrato su di
lui non tocca un altro bersaglio. Le «×» adesso sono almeno 24 pixel, e 30 dove
c'è il dito (`pointer: coarse`), come quelle dello scudo.

`scripts/verifica-bersagli.mjs` apre il pannello a 390 px col dito e misura
ogni scheda. Due precisazioni che vengono dalla regola, non da comodità: il
bersaglio di una casella comprende la sua etichetta (toccando la scritta si
spunta), e un collegamento dentro una frase non conta, perché è testo. La prima
misura non lo sapeva e segnalava ventotto caselle che si prendevano benissimo:
una misura sbagliata non si corregge spostando le caselle. `--selftest` mette una
«×» da 16 pixel accanto a un tasto e pretende che si veda.

Il controllo della larghezza gira a 360 px, non più a 390: è la larghezza più
comune fra i telefoni Android, e chi ci sta a 360 ci sta anche a 390.

