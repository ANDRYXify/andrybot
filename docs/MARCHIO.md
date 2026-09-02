# Il marchio

Due disegni, non uno.

| | cos'è | dove va |
|---|---|---|
| **Sbot** | il **segno**: la S e «bot», compatto | icona dell'app, favicon, bollo nella barra, splash |
| **Socialbot** | il **logo esteso**: la parola per intero | dove c'è larghezza — l'anteprima social |

Gli originali stanno in `assets/marchio/`, a sfondo trasparente. **Non** in
`src/web/public/`, e non è pignoleria: quella cartella la serve il browser, e lì
dentro devono stare i file *da scaricare*, non quelli *da cui si generano* gli
altri.

## Perché il fondo è chiaro

Il disegno ha i **contorni neri**. Su fondo scuro spariscono e il segno diventa
una macchia colorata senza forma. Quindi il fondo dev'essere chiaro — e quello
giusto ce l'aveva già il prodotto: la sua **carta calda `#faf7f1`**, la stessa
superficie delle sue schede. Così l'icona sembra parte dell'app invece di un
adesivo appiccicato sopra.

Ne segue una cosa che vale la pena dire: nella barra in alto il segno resta
**sul suo bollo di carta anche in tema scuro**. Metterlo trasparente sarebbe
stato più elegante di giorno e illeggibile di notte.

## Le misure si generano, non si disegnano

```
npm run marchio
```

`scripts/marchio.mjs` ritaglia il margine trasparente (cercando i pixel
davvero opachi) e compone ogni misura. Se il disegno cambia, si sostituisce il
PNG in `assets/marchio/` e si rilancia: **nessuna misura resta indietro**, che è
esattamente il modo in cui i loghi si sfaldano — una favicon vecchia qui, una
icona di due versioni fa là.

| file | a cosa serve |
|---|---|
| `icon-192` · `icon-512` | l'icona normale: il segno sta largo (86%), perché a 32px in una scheda del browser deve leggersi |
| `icon-maskable-512` | quella che il sistema operativo **ritaglia** a cerchio o a goccia: il segno sta dentro il 66%, così nessun taglio lo tocca |
| `marchio-barra` | il bollo della barra, **della forma del segno** |
| `marchio` · `logo-esteso` | trasparenti, per quando il fondo ce lo mette la pagina |

**`any` e `maskable` sono due file diversi.** Prima il manifest dichiarava
`"any maskable"` sullo stesso file: sono due esigenze opposte — una vuole il
segno grande, l'altra lo vuole piccolo e al centro — e dichiararle insieme vuol
dire sbagliarne per forza una.

## La forma conta

Il segno è largo **una volta e mezza** la sua altezza. Infilarlo in un quadrato
da 30px buttava via un terzo della larghezza in aria, e a quella misura la
parola non si leggeva più. Il bollo della barra ha quindi la forma del segno,
non un quadrato: alla stessa altezza, il disegno è **1,6 volte più grande**.

Lo stesso vale nelle altre pagine (moderatori, sblocca, privacy, termini, Mini
App) e nello splash — dove l'anello è stato allargato da 124 a 140px, perché il
segno largo ci passava dentro per un pelo e i suoi angoli toccavano il cerchio.

Resta un limite onesto: a **16px** un marchio che contiene una parola è una
macchia. Da 32px in su si legge. Se un giorno servisse anche il francobollo,
la strada è un dettaglio del disegno (il robottino della «o») — ma è una scelta
sul marchio, non una cosa da decidere di nascosto.

## Cosa si è tirato dietro

Il logo vecchio era viola, e il viola era rimasto sparso in giro anche dove il
prodotto era passato da un pezzo alla carta calda: il `theme_color` del manifest,
il colore della barra del browser in cinque pagine, l'anello dello splash,
l'anteprima social. Sono stati riportati alla tavolozza vera — non per
completezza, ma perché una barra viola sopra una pagina color carta è una
giuntura che si vede.

L'anteprima social (`scripts/og.mjs`) ora prende **il logo vero** invece di un
robot ridisegnato a mano nel codice: quella era una copia, e una copia resta
indietro il giorno che l'originale cambia.

## Il cancello

`scripts/verifica-risorse.mjs` controlla che ogni file chiesto dalle pagine e
dal manifest **esista davvero**, e che le due sorgenti del marchio siano al loro
posto. Un `src` sbagliato di una lettera non dà errore da nessuna parte: dà
un'immagine che non compare, e se ne accorge chi guarda il sito. Provato rosso
togliendo una lettera a un percorso e togliendo di mezzo una sorgente.
