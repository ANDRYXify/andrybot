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

Sopra i 720 px non si muove niente: nessuna barra in basso, guida aperta, hamburger e plancia come
prima. Verificato a 1440 px e a 900 px, zero pageerror.

## La barra in alto: quando si ritira nel cassetto

Su un iPad in orizzontale, con un account amministratore, la barra in alto era
**rotta**: il logo finiva sotto la prima voce del menu e «Admin» sopra il
selettore della lingua.

La causa non era una regola sbagliata, era una **domanda sbagliata**. La barra si
ritirava nel cassetto sotto una larghezza decisa a tavolino — 1280 px — ma
quanto spazio serve non è un numero fisso:

- un **amministratore** ha una voce in più (7 invece di 6);
- le etichette **spagnole** sono più lunghe di quelle italiane;
- e domani un piano diverso, o un ruolo diverso, cambieranno ancora il conto.

Sopra la soglia le voci venivano disegnate anche quando non ci stavano. E
siccome la barra le **centra**, l'eccedenza traboccava da tutte e due le parti:
metà sul logo, metà sugli strumenti. Misurato: un amministratore in italiano
chiede 1377 px, e un iPad Pro in orizzontale ne offre 1366.

Ora la domanda è quella giusta: **ci sta?** `misuraBarraTop()` confronta lo
spazio che le voci chiedono con quello che rimane davvero fra il logo e gli
strumenti, e accende `body.barra-stretta` quando non basta. Gira al `render()`
(le voci cambiano con il ruolo e col piano) e a ogni ridimensionamento.

Due dettagli che sembrano pignoleria e non lo sono:

- **Lo spazio disponibile non è `clientWidth`.** Bisogna togliere il padding
  della barra e le spaziature fra i suoi tre blocchi — una settantina di pixel.
  Ignorarli è esattamente l'errore che ho fatto alla prima stesura, e riappariva
  solo in spagnolo con un account amministratore a 1400 px.
- **Per misurare bisogna essere aperti.** Se la barra è già ritirata le voci
  hanno larghezza zero, quindi la classe si toglie, si misura e si rimette nello
  stesso istante: il browser non disegna mai lo stato intermedio, e non si vede
  nessun lampeggio.

La media query a 1280 px resta, ma con un compito preciso e più modesto: è il
fondo per gli schermi piccoli, dove non ci sta mai e vale anche **prima** che il
codice giri.

### Il collaudo

```
node scripts/verifica-barra.mjs
```

Apre un browser vero, si tira su un server statico da solo e prova **84
combinazioni** — quattordici larghezze da 390 a 2560 px, tre lingue, con e senza
i poteri da amministratore — controllando che non ci sia una sola sovrapposizione
fra i riquadri e che il menu resti sempre raggiungibile.

«Raggiungibile» sono tre cose, non una: la barra aperta, l'hamburger, oppure la
**barra in basso** — sotto i 720 px il menu vive lì, e pretendere l'hamburger
sarebbe stato un difetto della prova, non del prodotto.

Vive fuori da `npm run cancelli` perché serve un browser, come la sonda 7TV.
Provato rosso su entrambi i difetti veri: tornando a decidere con un numero fisso
(14 combinazioni rotte) e ignorando padding e spaziature nella misura (4).

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
lingua e ruolo: dove compare l'hamburger, apre il cassetto, clicca fuori e
pretende che si chiuda. Rimettendo il velo dentro la media query diventa rosso
in 15 combinazioni — tutte sopra i 1280px, che è esattamente la banda del
difetto.

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
