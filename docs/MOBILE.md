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
