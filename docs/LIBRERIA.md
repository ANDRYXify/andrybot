# La libreria dei media

> © 2024–2026 Andrea Taliento (ANDRYXify)

## Cos'era rotto

Il magazzino c'era e funzionava. Tabella `effects`: un file su disco, un tipo
(`audio` | `immagine` | `video`), `pubblico`, `nome`, `autore`, `usi`. Sopra ci
stavano già tutte le rotte — elenco, condivisione, importazione, servizio del
media — e a livello di database passavano tutte le prove (16 su 16: filtri per
tipo, ricerca, il pubblico degli altri visibile, il privato no, l'autore mai
sovrascritto).

Quello che mancava non era il magazzino: erano **le porte**. La libreria esisteva
come una vetrina in fondo a «Effetti & suoni» che si poteva solo guardare, e
ogni singolo campo del prodotto che chiedeva una foto, un video o un suono
offriva una sola strada: «carica un file dal PC». Nessun campo sapeva
raggiungere il magazzino — né il proprio, né quello condiviso.

Da qui i tre difetti veri:

1. **Nessun campo raggiungeva la libreria.** 14 slot fra alert e widget, i premi
   a punti canale, le penitenze, i meme dai gesti webcam, lo sfondo delle
   grafiche: tutti con una porta sola.
2. **Caricare un media per un alert lo distruggeva.** Il comando era fisso
   (`alert_<evento>_<slot>`), quindi ogni nuovo caricamento sostituiva il
   precedente. Un media così non ha identità: non lo si può riusare altrove, e
   non lo si può condividere.
3. **Condividere una foto richiedeva di inventarsi un trigger di chat.** Il
   comando era obbligatorio anche per chi non voleva lanciare niente in chat.

E, in demo, la griglia stampava `Cannot read properties of undefined` invece
della libreria, perché `caricaLibreria()` leggeva `d.items.length` su una
risposta che in demo non esisteva.

## L'invariante

> Ogni campo che accetta un media offre le **stesse due porte**: *carica* (che
> deposita nel magazzino) e *scegli dalla libreria* (tua + condivisa). Il
> riferimento è sempre `effetto:<comando>`, quindi ciò che accetta un media li
> accetta tutti.

Da cui, per costruzione:

- **Un solo magazzino.** Un media caricato da un alert e uno caricato dalla
  pagina «Effetti» sono la stessa cosa e finiscono nello stesso posto.
- **Un solo riferimento.** `effetto:<comando>` era già la forma riconosciuta da
  `alerts.js`, `penitenze.js` e dalle validazioni del server: il selettore non
  ha inventato niente, scrive quello.
- **Un caricamento non ne cancella mai un altro.** Ogni media entra con una
  propria identità coniata dal nome del file (`effects.comandoLibero`), quindi
  resta riusabile e condivisibile. Ricaricare *lo stesso file nello stesso
  campo* lo sostituisce; un file diverso, o lo stesso file in un altro campo,
  conia una nuova identità.
- **Prendere è copiare.** Scegliere un elemento di un altro streamer lo importa
  prima nella propria libreria (i file vengono copiati, l'autore originale
  resta), poi restituisce il riferimento alla *propria* copia. Quello che si
  usa non dipende più da uno streamer che potrebbe rendere privato il suo media
  domani.

## Le porte, oggi

| Dove | Cosa accetta |
|---|---|
| Alert — icona, suono, immagine/video (4 eventi) | immagine · audio · immagine+video |
| Widget «ultimo follower» e «ultimo sub» — icona | immagine |
| Effetti sui punti canale | tutto |
| Penitenze — suono/effetto | tutto |
| Meme dai gesti webcam (6 espressioni) | immagine |
| Grafiche social — sfondo | immagine |

Per i meme e le grafiche il riferimento non è `effetto:<comando>` ma un URL,
perché quei due posti caricano il media da soli:

- i meme girano nel Browser Source di OBS, senza sessione → si usa l'URL
  pubblico con chiave (`/overlay/<login>/media/<file>?key=…`);
- le grafiche si disegnano su canvas nel browser e vanno esportate senza taint
  → si usa l'URL di stessa origine (`/api/streamer/libreria/media/<id>`), che il
  server accettava già nella sua whitelist ma che nessun pulsante sapeva
  produrre.

## I tuoi media stanno nella libreria

La pagina si chiamava «Libreria condivisa» e mostrava solo il pubblico degli
altri: i propri media vivevano in un'altra lista, più in basso, e condividerli
si poteva solo da lì. Ora è **una** libreria:

- il filtro «Solo i miei» mostra tutto ciò che hai caricato, anche il privato —
  è un secondo asse, quindi ha un aspetto diverso dai filtri per tipo (chiaro
  quando è acceso, non una seconda scheda selezionata);
- ogni carta tua porta l'interruttore **Condividi / Non condividere**, e
  l'etichetta dice sempre com'è messa (`tuo · condiviso`, `tuo · privato`);
- il titolo e il testo dicono la verità su cosa c'è dentro e dove lo ritrovi.

## Il cancello

`node scripts/verifica-libreria.mjs`

Verifica, leggendo il sorgente, che:

- ogni slot che si può caricare si possa anche scegliere dalla libreria (le due
  porte sono pari);
- gli altri campi media abbiano la loro porta;
- i tipi che il selettore chiede siano quelli che il server sa filtrare;
- il server riconosca il riferimento e dica il comando dei propri elementi;
- il caricamento di un alert non torni a sovrascrivere uno slot fisso;
- la demo mostri la libreria e non un errore, e la griglia regga una risposta
  malformata.

Il cancello è stato messo alla prova togliendo una porta: diventa rosso ed esce
con 1.

## Prove

- `effects` a livello di database: filtri, ricerca, visibilità, attribuzione.
- Coniatura dell'identità: nome file → comando, sostituzione contro accumulo,
  comandi sempre validi come trigger di chat.
- Nel browser: 14 porte negli alert, 6 nei meme, una per premi/penitenze/
  grafiche; il selettore si apre, mostra solo i tipi ammessi, filtra anche il
  caricamento, si chiude con Esc; nessun errore di pagina.
