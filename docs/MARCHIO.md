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
serve per forza, ed è la **superficie del prodotto**, la stessa delle schede,
così l'icona sembra parte dell'app invece di un adesivo appiccicato sopra. Il
valore non è scritto qui dentro: `scripts/marchio.mjs` lo legge dalla tavolozza
(vedi [TAVOLOZZA.md](TAVOLOZZA.md)).

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
prodotto era passato da un pezzo ad altro: il `theme_color` del manifest,
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

Un accenno dello stesso bagliore, molto più leggero, sta su **ogni** immagine
del marchio quando il tema è scuro — barra, vetrina, pagine di servizio, guide.
La regola si aggancia all'immagine e non a chi la mostra, perché legandola a una
classe la vetrina se l'era persa: vedi [TAVOLOZZA.md](TAVOLOZZA.md).

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

**3. E non tutte le pagine sono file.** Guardando solo i `.html` erano rimaste
fuori le pagine che il server *compone*: le **guide** chiedevano un
`/favicon.svg` che non è mai esistito (icona assente, e sono le pagine
indicizzabili), e la **link-page pubblica** di ogni streamer — quella che vedono
gli spettatori, `socialbot.live/u/<login>` — chiedeva l'icona senza timbro,
cioè finiva dritta nel ramo "prima la cache". Ora il cancello legge anche i
sorgenti che compongono pagine, e l'icona è la stessa ovunque.

## Il tema esce dal marchio, non gli sta accanto

Il segno era coerente con sé stesso e basta: il resto del sito parlava un'altra
lingua, e il marchio in alto a sinistra sembrava un adesivo incollato su un altro
prodotto. Prima di ridipingere, la struttura del logo letta **dai pixel**, non a
occhio:

| cosa dice il segno | misura |
|---|---|
| il **contorno nero** attorno a ogni forma | **47,5%** dei pixel opachi — quasi metà del disegno |
| non un colore ma una **rampa di tinta**, da sinistra a destra | 294° → 348°, cioè magenta della «S» → vino della «t» |
| saturazione piena, luce media | tutte le fermate fra il 31% e il 42% di luce |
| tratto disegnato a mano, estremi tondi | niente è dritto, niente è un cerchio perfetto |

Quindi il tema ha preso da lì tre cose, e nient'altro:

**La rampa.** `--acc-vivo` `--acc` `--acc-caldo` `--acc-vino` sono le quattro
fermate misurate, e `--rampa` le mette in fila con lo stesso verso del logo. Dove
il prodotto accentava con un magenta piatto — le parole in risalto del titolo, il
bottone principale — adesso passa la sfumatura. Non è decorazione: è la stessa
struttura del segno, applicata alla pagina.

**Il contorno.** `--contorno` più `--contorno-sp` sulle superfici che portano il
colore del prodotto: bottoni, pastiglia dell'occhiello, pastiglie di marca. Non su
ogni carta — nel logo il nero tiene le *lettere*, non la pagina, e metterlo
ovunque lo renderebbe rumore invece che firma.

**L'alone, perché il fondo scuro spegne il nero.** È lo stesso problema che il
marchio aveva già, e la stessa cura: `--alone-contorno` è un filo di accento
appena fuori dal nero, così il bordo si legge anche sul buio. Chiaro e scuro
tengono lo stesso disegno invece di essere due prodotti.

E gli angoli passano da 4/6/8/10 a 6/10/14/18, perché il tratto del segno è tondo
e un angolo secco accanto a lui stona.

Il cancello della tavolozza controlla tutte e tre: che le fermate della rampa e i
token del contorno esistano nei due temi, che l'alone sia **diverso** fra chiaro e
scuro (sennò sul buio il bordo sparisce), e che le superfici di marca lo portino
davvero. È stato provato rosso togliendo il bordo al bottone e spegnendo l'alone.

## La mano: il sito è disegnato, non composto

Il tema aveva preso i colori e il contorno, ma i titoli parlavano ancora
geometrico — e finché il **lettering** non è quello del marchio, il logo resta
un adesivo su un altro prodotto. Il marchio è disegnato con un pennarello: tratto
disuguale, estremi tondi, niente dritto e niente cerchi perfetti.

Quindi tre cose, tutte dichiarate una volta in `tema.css`:

- **`--mano`** — la voce disegnata, su titoli e voci di marca. Body e comandi
  restano nel sans di prima: si legge quello che c'è da leggere, e la mano fa il
  suo lavoro dove il marchio parla.
- **`--ang-mano` e `--tratto-mano`** — angoli asimmetrici e spessore di bordo
  disuguale. Un rettangolo con quattro raggi diversi e il bordo di 2 px su un
  lato e 2,5 sull'altro *legge* come tirato a mano, e non costa niente.
- **`--ombra-ink`** — l'ombra piena, senza sfocatura, spostata di 4 px. È la
  differenza fra un'interfaccia e una vignetta: la sfocatura è fotografica,
  l'ombra piena è inchiostro. Sul fondo scuro il nero su nero sparirebbe, quindi
  lì l'ombra prende l'accento, con la stessa logica dell'alone.

Da cui l'interazione: un pulsante **non si illumina, si timbra**. Passandoci
sopra l'ombra cresce e il pulsante si alza di 2 px; premendolo l'ombra si
schiaccia a 1 px e il pulsante scende dentro di 3. È il gesto del timbro sulla
carta, ed è il motivo per cui sembra disegnato anche quando si muove.

**Il carattere sta in casa.** `Shantell Sans` (SIL OFL) è ospitato in
`vendor/font/` come Archivo e Instrument Serif, per le due ragioni che quella
cartella dichiara da sempre: il primo disegno della pagina non deve dipendere da
un server esterno, e l'indirizzo di chi visita non deve finire a un terzo senza
consenso. Il cancello controlla che `--mano` esista, che il carattere che nomina
abbia il suo `@font-face`, che **nessun** `src:` punti fuori dal dominio, che la
licenza lo citi, e che titoli e carte lo usino davvero.

Nel provarlo rosso ho scoperto che la mia prima sonda non mordeva: cercava
`body.vetrina h1` e trovava la regola dell'`em`, che sta sotto e comincia uguale.
Un cancello che non morde è peggio di nessun cancello, quindi ho corretto la
misura prima di fidarmi del verde.

## La tavola: carta, retino, linee cinetiche

La mano da sola non bastava — il direttore l'ha detto secco: «non è per nulla
ancora manga». Aveva ragione, e la differenza è strutturale. Una pagina di manga
non è «disegnata a mano»: è **carta**, con sopra **retino** e **linee cinetiche**,
e il colore è l'eccezione, non l'aria.

- **Carta.** Il fondo smette di essere una foschia rosa e diventa carta
  (`#f2efe8` chiaro, `#0c0b0c` scuro). Il magenta torna a essere quello che è nel
  marchio: il colore che spicca. Cambiare il fondo ha fatto scattare il cancello
  della tavolozza su otto copie da allineare e su un contrasto sceso sotto la
  soglia — che è esattamente il suo mestiere.
- **Retino** (`--retino`): la trama di puntini, la texture più riconoscibile del
  mezzo. Era già un token e non era applicata da nessuna parte: valeva zero.
- **Linee cinetiche** (`--cinetiche`): il fascio che converge sul titolo. Sono un
  `repeating-conic-gradient` con una maschera radiale che le apre al centro.

Sfondo e texture **non hanno bordi**: coprono `-50vw` per lato e sfumano con una
maschera radiale. La prima versione le teneva dentro la colonna del contenuto e
si fermavano di netto in una riga dritta — un rettangolo, non una texture. E
`overflow: clip` sulla scena, che avevo aggiunto «per sicurezza», le ritagliava
di nuovo: la sicurezza era il difetto.

## Un effetto non può nascondere il contenuto

La colorazione del titolo — le parole in risalto che si tingono da sinistra a
destra, come le colorerebbe un disegnatore — era fatta con una **maschera** che
partiva a larghezza zero. Se l'animazione non parte, il testo resta invisibile
**per sempre**: «con la tua voce» era sparito dalla pagina.

Da cui la regola: **un effetto può solo aggiungere, mai sottrarre.** Ora la
colorazione sposta la `background-position` della sfumatura già applicata al
testo: se l'animazione non parte, il testo c'è comunque, colorato. E il cancello
del contrasto misura anche le parole in risalto, perché un testo invisibile ha
contrasto uno.

## Il contrasto si misura sui pixel, non sui token

Il cancello della tavolozza confronta i token a due a due. Non vede cosa succede
davvero a schermo: un fondo a sfumatura, un velo sopra, un lampo che attraversa
il bottone. Il direttore ha fotografato un bottone con la scritta illeggibile
mentre tutti i cancelli erano verdi.

`scripts/verifica-contrasto.mjs` rende la pagina in un browser, ritaglia i
comandi e misura il rapporto WCAG fra la scritta e i pixel che le stanno dietro,
in chiaro e scuro, **fermo e col mouse sopra**. Ha trovato subito il difetto
vero: `.vt-btn:hover` (specificità 0,2,0) sovrascriveva il fondo di
`.vt-btn-primo` (0,1,0), quindi al passaggio del mouse il bottone perdeva la sua
rampa e restava una scatola pallida con la scritta bianca sopra. Contrasto
misurato: **1,3**.

Ci sono volute tre correzioni alla MISURA prima di fidarsi di lei:

1. prendeva il colore **più frequente** del ritaglio — ma su un fondo a sfumatura
   il più frequente è il bordo, che non sta dietro a nessuna lettera;
2. contava anche i pixel **delle lettere stesse**, che per definizione non sono il
   loro fondo, e facevano fallire ogni bottone scritto scuro;
3. raggruppava i colori troppo fine, così una sfumatura non aveva nessun colore
   dominante e la misura si arrendeva.

Ora guarda dentro il comando, esclude il colore della scritta, raggruppa largo e
prende il **fondo peggiore fra quelli che coprono almeno il 4%**.

## Il puntatore: un cursore, non un inseguitore

Il puntatore personalizzato era un motore in `cinema.js`: tre elementi creati a
mano, un ciclo a ogni fotogramma, e una logica che li faceva «morfare» sopra il
bottone sotto il mouse. Da qui le due cose che il direttore ha visto insieme —
**ritardo** («lagga molto») e **incoerenza** («bruttino»): un oggetto che insegue
il mouse è sempre indietro di qualche fotogramma, per costruzione.

La risposta non è addobbarlo: è che il puntatore torni a essere un **cursore**.
Un `cursor: url(...)` disegnato è renderizzato dal sistema, quindi sta esattamente
sotto il dito e non può restare indietro; ed è disegnato per davvero — una
freccia con il contorno d'inchiostro e la punta magenta, più una versione tonda
per ciò che si clicca. Sono **165 righe in meno**, non di più.

Il disegno è stato rifatto una volta: alla prima prova il contorno da 2,6 px su
un'icona da 28 px si mangiava il colore e il cursore era un blob nero. Guardarlo
ingrandito prima di dichiararlo fatto è costato un minuto.

## Le pagine che nessuno guarda mai

Le guide leggono la tavolozza dalla stessa fonte, quindi la carta l'avevano già
presa da sola. Mancavano l'inchiostro e la voce: ora l'elenco dei token che si
portano via include contorno, tratto, angoli, ombra e `--mano`, e i numeri dei
passi sono pastiglie inchiostrate con la rampa.

L'anteprima dei link (`scripts/og.mjs`) si genera dallo stesso posto: aloni
sfocati e griglia quadrata erano l'idioma fotografico di prima, ora sono linee
cinetiche e retino, con il titolo nel lettering e le pastiglie con l'ombra piena.

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
