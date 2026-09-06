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
