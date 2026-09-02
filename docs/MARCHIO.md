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

## Il fondo: dipende da chi guarda

Il disegno ha i **contorni neri**, e la prima conclusione — «serve un fondo
chiaro, sempre» — era **sbagliata**. L'ho scoperto mettendo le tre varianti una
accanto all'altra invece di ragionarci sopra:

- su fondo scuro i contorni neri effettivamente spariscono, ma **i pieni magenta
  portano la forma da soli**: le lettere restano perfettamente leggibili, e anzi
  guadagnano un'aria da insegna al neon;
- una **targa di carta** dietro le lettere, in tema scuro, è invece un mattone
  bianco piantato in mezzo alla barra.

Quindi la regola è: **nelle pagine il marchio è trasparente**, e il fondo ce lo
mette la pagina. Nelle **icone del sistema operativo** no — lì un fondo opaco
serve per forza, ed è la carta calda `#faf7f1`, la stessa superficie delle
schede, così l'icona sembra parte dell'app invece di un adesivo appiccicato
sopra.

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
| `marchio-barra` | il segno per le pagine, **della forma sua** e trasparente |
| `logo-barra` | il logo esteso per la barra in alto, trasparente |
| `marchio` · `logo-esteso` | trasparenti, per quando il fondo ce lo mette la pagina |

**`any` e `maskable` sono due file diversi.** Prima il manifest dichiarava
`"any maskable"` sullo stesso file: sono due esigenze opposte — una vuole il
segno grande, l'altra lo vuole piccolo e al centro — e dichiararle insieme vuol
dire sbagliarne per forza una.

## Nella barra: il logo, non il nome scritto

Nella barra in alto c'erano il segno **e** la parola «SocialBot» scritta col
font dell'interfaccia: due volte la stessa cosa, e la seconda non era nemmeno il
marchio. Ora c'è il **logo esteso** e basta.

Sta dappertutto, e non per fortuna: il logo esteso è largo 2,65 volte la sua
altezza, quindi a 30px di altezza occupa **80px** — su un telefono da 390 ne
restano 310 per il resto. Non serve una soglia, non serve una variante piccola:
misurato, ci sta sempre.

L'attribuzione «andryxify.it», che stava sotto il nome, è finita **in fondo alla
pagina** insieme a privacy e termini. È il posto suo: un piè di pagina è
esattamente dove si dice di chi è un progetto.

## La forma conta

Il segno è largo **una volta e mezza** la sua altezza. Infilarlo in un quadrato
da 30px buttava via un terzo della larghezza in aria, e a quella misura la
parola non si leggeva più. Il bollo della barra ha quindi la forma del segno,
non un quadrato: alla stessa altezza, il disegno è **1,6 volte più grande**.

Lo stesso vale nelle altre pagine: moderatori, sblocca, privacy, termini, Mini
App e splash mostrano il segno con la sua forma, senza targa.

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

## La schermata di caricamento

Girava un **anello** e il logo pulsava dentro: l'animazione era della cornice,
non del marchio. Ora l'anello non c'è più e si muove **il logo** — respira
piano, salendo di sette pixel e tornando giù.

Sul **tema scuro** il logo prende un **bagliore** magenta, che pulsa con lo
stesso respiro. Non è una decorazione presa a caso: il marchio è trasparente e
un `drop-shadow` segue la forma delle lettere, quindi su fondo scuro diventa
un'insegna al neon — che è esattamente come quel disegno vuole leggersi. Sul
chiaro il bagliore non c'è: su carta sarebbe una sbavatura.

Un accenno dello stesso bagliore, molto più leggero, sta anche sul logo della
barra in alto quando il tema è scuro.

Chi ha chiesto **meno animazioni** (`prefers-reduced-motion`) vede il logo
fermo, col bagliore statico: l'informazione resta, il movimento no.

## Perché il logo vecchio restava nella linguetta

Il marchio nuovo era generato, servito e identico sul server — e nella linguetta
del browser compariva ancora il robottino viola di prima. Non era la cache del
browser: gli header dicono `max-age=0` con ETag, quindi ogni richiesta viene
rivalidata. Erano due cose insieme, e nessuna delle due dava un errore.

**1. Il service worker serviva il guscio "prima dalla cache".** `icon-192.png`,
`icon-512.png`, `marchio-barra.png` e `manifest.webmanifest` erano precaricati
all'installazione e poi restituiti dalla copia locale senza mai chiedere niente
alla rete. Il nome della cache (`socialbot-v1`) non cambiava mai e l'`activate`
cancella solo le cache con un nome diverso: quella copia era **eterna**. Chi era
già passato dal sito aveva il logo vecchio incastrato dentro, e nemmeno un
ricaricamento lo toglieva.

Ora c'è una strada sola: si parte **sempre** da `fetch()`, e la copia locale
serve solo quando la rete non c'è — aggiornandosi con quello che la rete ha
appena dato. Una copia che può vincere sulla rete è una copia che invecchia e
non muore più; il costo della rete qui è una rivalidazione, non un download.

**2. `privacy.html` e `termini.html` chiedevano l'icona senza timbro.** Il
timbro (`?v=5`) è quello che dice al browser «è un'altra cosa, riscaricala», e
proprio le due pagine rimaste senza finivano nel ramo "prima la cache". Le altre
pagine avevano `?v=5` e infatti mostravano il logo giusto: per questo sembrava
casuale, dipendeva da dove si era. `tgapp.html` non aveva alcuna icona.

La regola non è «ricordarsi di aggiornarle tutte»: è che il timbro sia **uno
solo**. `verifica-risorse.mjs` legge tutte le pagine e il manifest e pretende un
unico `?v=` — se una resta indietro, indica quale.

## Il cancello

`scripts/verifica-risorse.mjs` controlla che ogni file chiesto dalle pagine e
dal manifest **esista davvero**, e che le due sorgenti del marchio siano al loro
posto. Un `src` sbagliato di una lettera non dà errore da nessuna parte: dà
un'immagine che non compare, e se ne accorge chi guarda il sito. Provato rosso
togliendo una lettera a un percorso e togliendo di mezzo una sorgente.

Sul timbro e sul service worker vigilano `verifica-risorse.mjs` (un `?v=` solo
ovunque, provato rosso togliendolo a `privacy.html`) e
`verifica-service-worker.mjs` (nessuna risposta può partire dalla cache). E
`scripts/verifica-sw.mjs` lo mette alla prova in Chromium: alza un server, apre
la pagina, aspetta il worker, **cambia l'icona sul server** e ricontrolla cosa
vede il browser. Col worker vecchio dà `VECCHIA` — cioè il difetto, riprodotto.
