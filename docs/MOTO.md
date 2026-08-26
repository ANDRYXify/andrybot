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

## Il campo ambientale

`#anime-sfondo` ha due aloni: uno respira su un `@keyframes` lento, l'altro segue il puntatore
tramite `--pnt-x` / `--pnt-y`, scritte dallo stesso giro con una molla molto lenta (2.7 s). Prima
che il puntatore si sia mosso il campo resta a zero: nessuno scivolamento all'apertura.

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
