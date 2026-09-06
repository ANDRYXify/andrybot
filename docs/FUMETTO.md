# Il motore dei fumetti

`src/web/public/fumetto.js` disegna i balloon del sito: nuvolette di aiuto,
e — man mano — tutto il resto. Nessun PNG, nessuna immagine: un tracciato SVG
calcolato al momento, qualche riga di codice.

## La regola che tiene in piedi tutto: un tracciato solo

Corpo e coda sono **un tracciato solo**. Il bordo del balloon, arrivato al punto
d'attacco, DIVENTA la coda e poi torna sul bordo.

Non è un vezzo. Disegnare la coda come un pezzo attaccato è la strada che sembra
più semplice, e non funziona: la giuntura si vede sempre. Ci ho provato in
quattro modi diversi e si vedeva in tutti e quattro.

- **Due elementi CSS** (bolla + triangolo di bordi): il triangolo non si può
  curvare, e ruotandolo per farlo puntare si stacca.
- **Due tracciati SVG** (riempimento e contorno insieme): il riempimento copre
  metà del contorno, e su una forma stretta ne mangia un lato.
- **Due tracciati separati** (macchia + linea): meglio, ma il bordo del balloon
  passa dritto sopra la bocca della coda — si vede che è incollata.
- **Coda affondata nel corpo**: ruotando, un angolo della base esce dal corpo e
  apre un buco.

Con un tracciato solo nessuno di questi problemi può esistere, perché non ci
sono due pezzi.

### Il verso conta

Il fondo del balloon si percorre da destra a sinistra. Quindi si entra nella
coda dalla base **destra** e si esce dalla sinistra. Entrando dalla parte
sbagliata il bordo attraversa la bocca due volte e disegna la riga che si voleva
evitare — sintomo identico a «la coda è appiccicata».

## Le forme, e da dove vengono

Non sono di fantasia. Nel lettering a fumetti la forma dice il tono:

| forma | quando | com'è fatta |
|---|---|---|
| `tondo` | una voce normale | rettangolo a raggi grandi, coda a falce |
| `grido` | qualcosa che fa danni | stella a tredici punte, coda innestata fra le punte |
| `pensiero` | un valore, una parola da spiegare | corpo tondo senza coda, e una scia di bollicine che rimpiccioliscono |

E due regole che ho sbagliato prima di andarle a leggere:

- **La coda non tocca chi parla.** «A tail should terminate at roughly 50-60% of
  the distance between the balloon and the character's head». Arrivandoci sopra,
  su un tasto, gli copre il testo.
- **E non è più lunga di mezza bolla.** La regola scritta parla solo di distanza,
  e da sola su una nuvoletta di una parola dava una coda lunga due terzi del
  corpo: la bolla sembrava appesa a un filo. `misuraCoda(stacco, altezza)` prende
  il minore fra il 55% della distanza e il 50% dell'altezza, e sta nel motore
  perché la proporzione è della forma, non di chi la posa.
- **Il corpo è più largo che alto**, con l'aria attorno al testo pari a circa una
  riga, e l'interlinea larga perché il lettering è tutto maiuscolo.

Fonti: [Blambot, *Comic Book Grammar & Tradition*](https://blambot.com/pages/comic-book-grammar-tradition) ·
[The Comicraft Glossary of Lettering Terms](https://balloontales.com/the-comicraft-glossary-of-lettering-terms/).

## La tela

Il disegno sta su una tela più grande della bolla di `MARGINE` per lato. Quel
numero non è scelto a occhio: si ricava dalla coda più lunga che il motore sa
fare, più mezza base — perché ruotando è quella che arriva più in là. Se la coda
un giorno si allunga, la tela cresce da sola.

Serve perché una coda che esce dalla tela viene **tagliata**, e il taglio prende
il riempimento e non il contorno: si vede una coda vuota. È successo.

## Il foglio di stile del sito

`.aiuto-guscio` dichiara `max-width: none`. Il sito ha un `max-width: 100%` su
tutte le immagini, e sul guscio schiacciava il disegno al 63% della sua
larghezza: la forma usciva più piccola del testo e la coda sembrava un fuscello.
Nessun errore, ovviamente.

## Chi lo usa

Oggi le nuvolette di aiuto (`src/web/public/aiuto.js`). I toast sono
**didascalie** e non hanno coda di proposito: nessuno le sta dicendo, sono la
voce narrante, e nei fumetti quella sta in un riquadro.

`node --test test/unita/nuvolette.test.mjs` tiene fermo che corpo e coda restino
un pezzo solo, in ogni posizione della coda e in tutte e due le direzioni.

## I riquadri che si aprono, e la freccia che spariva

Le guide, le legende e i riquadri richiudibili erano quattro componenti con
quattro copie delle stesse regole: bordo sottile, angoli tondi, fondo tinto di
accento. Erano rimasti al tema di prima, e ognuno era rimasto indietro a modo
suo. Adesso sono un solo device — la **didascalia**: carta pulita, contorno
d'inchiostro, la barra spessa a sinistra, il titolo in lettering a mano. Chi
racconta sta in un riquadro; è la stessa regola dei toast e della prima riga
delle schede.

La freccia sta su `::before`, e non è un dettaglio. Su questo sito `::after` di
tutto ciò che si preme — `summary` compreso — è **l'alone del contorno** che
compare col mouse sopra. Disegnare la freccia sullo stesso `::after` non dà
errore: vince l'ultima regola del foglio, e sparisce l'alone oppure sparisce la
freccia. Era successo a otto riquadri: nel CSS si leggeva una freccia, a schermo
non c'era niente.

Il difetto non si vede leggendo il codice, quindi lo misura il browser:
`scripts/verifica-contorni.mjs` apre e chiude ogni `details` del pannello e
chiede se quella freccia, adesso, si vede — opacità e larghezza vere. Se non si
vede, il cancello è rosso.

## Il 404 e la manutenzione sono una vignetta

Le due pagine che si vedono quando qualcosa non c'è erano un foglio col titolo
in mezzo. Adesso sono **una vignetta**: la pagina attorno è il margine fra le
vignette (carta e retino), il riquadro ha il contorno d'inchiostro con gli
angoli disuguali e l'ombra, e chi racconta parla da **didascalie** — una in alto
a sinistra, una in basso. Nessuna delle due ha la coda: non le sta dicendo
nessuno, sono la voce narrante.

Il numero della vignetta è **404**. Non è una decorazione: i fumetti numerano le
pagine, e il codice HTTP è già un numero. Sta nell'angolo in basso a destra, a
cavallo del bordo, come sta un numero di pagina.

Il retino era un velo `fixed` disegnato **sopra** al contenuto: i puntini
passavano attraverso il testo, e le righe piccole in fondo erano quasi
illeggibili. Nella stampa il retino sta sotto l'inchiostro, e adesso anche qui.

La manutenzione si porta il **lettering dentro la pagina**, in base64. È l'unica
che può: la serve l'edge quando il bot è spento, e chi servirebbe il file del
carattere è proprio la cosa che non risponde. Trenta kilobyte una volta sola,
per non presentarsi vestita da un altro prodotto nel momento peggiore. Il 404 no:
lo serve il bot, che è in piedi, e se lo prende con un link.

## Due bordi che non esistevano

`--tratto-mano` vale `2px 2.5px 2.5px 2px`: quattro larghezze, perché il bordo
del sito non è uguale sui quattro lati. La scorciatoia
`border: <larghezza> <stile> <colore>` ne accetta **una sola**: con quattro la
dichiarazione è invalida e il browser la butta via intera. Niente bordo, nessun
errore, nessun avviso in console. Ce n'erano nove in giro — le pagine di
servizio, il tasto della lente, i campi file, le righe della veste — e nessuna
aveva il contorno. La forma giusta è in due tempi:
`border: 2px solid …; border-width: var(--tratto-mano)`.

L'altro: `dichiarazioni()` copiava il testo del token così com'era, e un token
può essere scritto in funzione di un altro. Chi chiedeva `--tratto-mano` senza
sapere di `--tratto-2` si portava via una regola che punta nel vuoto. Adesso le
dipendenze si seguono da sole.

`node --test test/unita/inchiostro-css.test.mjs` tiene fermi tutti e due, e
l'elenco dei token con più larghezze lo ricava dalla tavolozza invece di
elencarlo: la prima volta che l'ho scritto a mano mi ero scordato `--tratto-1`,
che era proprio quello con più bordi morti.
