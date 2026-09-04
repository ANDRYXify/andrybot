# Il moto dell'interfaccia

I file del sito (`src/web/public/*.js`, `*.css`) non hanno commenti: quello che spiegherebbero sta qui.

## Il principio: una proprietà, un padrone

Ogni proprietà animata ha **un solo** sistema che la scrive. Quando due sistemi scrivono la stessa
cosa il difetto non è un bug da cercare: è garantito. È già successo tre volte in questo progetto,
sempre allo stesso modo.

| proprietà | padrone |
| --- | --- |
| posizione/dimensione dell'anello del cursore | `cinema.js`, in JS, un giro per fotogramma |
| `--mx` / `--my` (magnetismo dei bottoni) | `app.js`; il CSS li **compone** nel proprio `transform` |
| `.carta.rivela` (comparsa allo scroll) | `app.js` (`rivelaCarte`) |
| conteggio dei numeri | `app.js` (`animaNumeri`) |
| sfondo, sheen, transizioni di sezione | CSS |

Il CSS non deve mai avere una `transition` su una proprietà che il JS riscrive ogni fotogramma:
ogni scrittura fa ripartire la transizione, e il risultato è in ritardo permanente di tutta la sua
durata. Era esattamente il difetto del cursore.

## Il motore del cursore (`cinema.js`)

Un solo `requestAnimationFrame`, con la disciplina **prima leggo tutto, poi scrivo tutto**:

1. **gli eventi non toccano il DOM** — `pointermove` salva soltanto `x`, `y` e l'elemento sotto il
   puntatore. Nessuna misura, nessuna scrittura: niente reflow forzati a raffica.
2. **lettura** — il rettangolo del bersaglio si misura al massimo **una volta per fotogramma**, e
   solo se il puntatore si è mosso o se c'è stato uno scroll. Misurandolo dentro il giro, il
   rettangolo comprende già lo spostamento magnetico del bottone: anello e bottone si muovono
   insieme **per costruzione**, non perché uno insegue l'altro.
3. **molle** — molle smorzate integrate con il `dt` vero (Eulero semi-implicito, sotto-passi da
   10 ms). Il moto è identico a 60, 120 o 144 Hz. La vecchia interpolazione `x += (meta-x)*0.18`
   dipendeva dal frame-rate: più veloce il monitor, più veloce il cursore.
4. **scrittura** — cinque numeri (x, y, larghezza, altezza, raggio) e solo se cambiati di ≥0.06 px.
5. **si spegne** — quando tutte le molle sono ferme il giro **non si riprogramma**. Riparte al
   primo movimento. A riposo il costo è zero.

Il puntino segue il puntatore **senza molla**: è l'ancora esatta. È l'anello a portare il peso.
Un anello che trascina con un puntino esatto legge come materia; senza l'ancora leggerebbe come
ritardo.

### Costanti

| molla | ω (rad/s) | ζ | assestamento |
| --- | --- | --- | --- |
| anello libero | 34 | 1.0 | ~118 ms, nessun rimbalzo |
| anello agganciato | 62 | 0.90 | ~72 ms, rimbalzo ~0.2% |
| dimensione/raggio | 48 | 0.88 | ~95 ms |
| campo ambientale | 2.4 | 1.0 | ~2.7 s |

`dt` è limitato a 120 ms e suddiviso in sotto-passi da 10 ms: stabile per costruzione
(ω·h ≤ 0.62) e, dopo un singolo scatto del browser, recupera fino a 120 ms invece di restare
indietro.

### Misure (Chromium, banco a frame-rate sbloccato)

Sweep del puntatore avanti e indietro su cinque bottoni in fila, tre volte:

| | prima | dopo |
| --- | --- | --- |
| transizioni CSS su ciò che il JS anima | sì (conflitto) | no |
| errore medio dell'anello in movimento | 62.8 px | **22.7 px** |
| errore al 90° percentile | 139.4 px | **74.2 px** |
| `getBoundingClientRect` per 40 eventi | 120 | **40** |
| giri di rAF in 1 s da fermo | ~2600 | **0** |

## Il campo ambientale — e la trappola delle variabili CSS

`#anime-sfondo` ha due aloni: uno respira su un `@keyframes` lento, l'altro (`#an-campo`) segue il
puntatore, mosso dallo stesso giro con una molla molto lenta (2.7 s). Prima che il puntatore si sia
mosso il campo resta a zero: nessuno scivolamento all'apertura.

**Mai scrivere una variabile CSS su `:root` a ogni fotogramma.** La prima versione lo faceva
(`--pnt-x` / `--pnt-y`) e il cursore arrancava. Una custom property sulla radice invalida lo stile
di **tutto** il documento: il costo cresce col numero di nodi, e non c'entra nulla con quanto è
piccolo l'elemento che volevi muovere.

Misurato sulla pagina vera (155 nodi soltanto — il cruscotto autenticato ne ha molti di più):

| scrittura, per fotogramma | costo |
| --- | --- |
| `--pnt-x` + `--pnt-y` su `:root` | **4.38 ms** |
| `transform` su una foglia | 0.033 ms |
| `transform` sul campo sfocato (promosso a layer) | 0.007 ms |
| `width` + `height` sull'anello (`contain: layout style size`) | 0.067 ms |
| `getBoundingClientRect()` | ~0 ms |

Il giro completo del motore è passato da **2.01 ms a 0.127 ms per fotogramma (−94%)** spostando il
campo da una variabile sulla radice a un `transform` diretto su un elemento suo. Un frame a 60 Hz
dura 16.7 ms: la vecchia versione ne bruciava un quarto per muovere un alone sfocato.

## Stati vivi

`<i class="vivo">` è il pallino che pulsa dove qualcosa è davvero in corso; `<i class="spento">`
è il suo gemello fermo. Hanno sostituito i caratteri `●` / `○`: la forma dice lo stato invece di
descriverlo. L'onda è un pseudo-elemento animato solo in `transform` e `opacity` — compositore
puro, nessun ridisegno.

`.regia-badge.live` e `.studio-badge-live` hanno già una pulsazione propria e restano come sono.

## Spegnimento

Tutto si spegne insieme, in tre modi: `prefers-reduced-motion: reduce`, la classe `leggero`
(dispositivo debole o `saveData`, commutabile da `SB_LEGGERO.imposta`), e `pointer: fine`
mancante (su tocco il cursore custom non nasce proprio).

## La cadenza: perché il sito si muove «a scatti»

Nel manga non esistono intermedi. Il movimento è di due tipi soltanto: i **segni**
dentro una vignetta ferma (le linee di concentrazione, le linee di velocità) e il
**taglio** fra una vignetta e l'altra. L'anime che ne discende non ha mai cercato
di imitare Disney: è **animazione limitata**, girata *su tre* — otto disegni al
secondo invece di ventiquattro. È la scelta che ha reso riconoscibile un intero
linguaggio, non un ripiego che si vede.

Il sito la scrive in due token, in `tema.css`:

| token | cos'è | dove va |
| --- | --- | --- |
| `--su-tre` | `steps(3, jump-none)` | cose piccole e brevi: un lampo, un'ombra che si sposta |
| `--su-due` | `steps(5, jump-none)` | comparse: carte, eroe, righe che entrano |

**La regola che discrimina** — senza la quale «tutto a scatti» diventa
semplicemente un sito rotto:

- ciò che **compare** è un disegno nuovo → a scatti;
- ciò che **si muove sotto il dito** (il cassetto, un cursore, lo scorrimento) →
  scivola, sempre;
- la **sfocatura non esiste**. È fotografia: l'inchiostro o c'è o non c'è. Una
  comparsa che parte da `blur(10px)` non è una comparsa disegnata, è una messa a
  fuoco.

## Un nome, un movimento solo

Due fogli che dichiarano gli stessi `@keyframes` non danno errore: vince in
silenzio l'ultimo caricato. Non è teoria, era lo stato del sito:

| nome | dichiarato in | chi vinceva | cosa spariva |
| --- | --- | --- | --- |
| `vt-entra` | `anime.css` e `vetrina.css` | `vetrina.css` | il cambio scheda si portava dietro `blur(10px)`, che nessuno gli aveva mai chiesto |
| `toast-entra` | `style.css` e `anime.css` | `anime.css` | l'ingresso *shōnen* dell'avviso — scritto, mai visto una volta |

Difetto senza sintomi: la pagina non si rompe, si muove in un modo che nessuno ha
scelto. Per questo il controllo non sta nell'occhio ma in
`scripts/verifica-moto.mjs`, che rifiuta un nome di fotogrammi dichiarato due
volte e dice in quali file.

## Il vocabolario, e chi lo parla davvero

Un hook CSS che nessuno aggancia è peso morto spedito a ogni visitatore. Restano
solo i movimenti con un momento vero:

| movimento | il momento |
| --- | --- |
| `shonen-entra` | l'eroe della vetrina che arriva, a scaglioni in ordine di lettura; l'avviso che entra |
| `shonen-scossa` | l'avviso di **errore**: sbagliare si distingue dal riuscire anche da come si muove, non solo dal colore |
| `ink-tremolio` | il marchio, che trema sotto il puntatore come una cosa disegnata a mano |
| `vt-appare` | le sezioni della vetrina che entrano nella vista |
| `vt-colora` | la rampa che riempie d'inchiostro le lettere del titolo |

Sono usciti `ink-colora`, `ink-colpo`, `shonen-colpo` e `shonen-lampo`: nessuno li
agganciava, e `ink-colora` per com'era scritto non avrebbe potuto funzionare —
dipingeva dietro l'elemento (`z-index: -1`), quindi lo sfondo dell'elemento stesso
lo copriva sempre.
