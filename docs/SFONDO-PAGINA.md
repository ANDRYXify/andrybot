# L'immagine di sfondo della pagina link e delle donazioni

Lo sfondo a immagine si sposta e si scala, e dove l'immagine non arriva lo
spazio continua i colori dei suoi bordi invece di restare vuoto. Vale per le
due pagine pubbliche, che hanno lo stesso motore (`renderLinkPage`) e la
stessa regola di salvataggio (`pulisci` in `db.js`).

## I valori

- `sfondoX`, `sfondoY` (0–100, di serie 50): **il punto fermo.** Il punto
  dell'immagine a X% della sua larghezza e Y% della sua altezza sta sul punto
  a X% e Y% dello schermo.
- `sfondoScala` (40–200, di serie 100): **la grandezza**, rispetto a «copre lo
  schermo». Al 100% l'immagine copre esattamente lo schermo; sopra si
  ingrandisce, sotto si rimpicciolisce e scopre dei bordi.
- `sfondoRapporto`: larghezza su altezza dell'immagine. Lo misura il pannello
  quando la scegli; senza, la grandezza non si può calcolare.
- `sfondoRiempi` (`bordi` o `tema`): cosa c'è dove l'immagine non arriva.
- `sfondoBordi`: sei colori per lato e i quattro angoli, letti dal pannello
  lungo i bordi dell'immagine.

## La geometria

Con lo schermo largo L e alto A, e l'immagine di forma r:

- la grandezza che copre: `Lc = max(L, A·r)`, `Ac = Lc / r`;
- quella mostrata: `Li = Lc·s`, `Ai = Ac·s`;
- il posto: `sinistra = X·(L − Li)`, `cima = Y·(A − Ai)`.

È una regola sola per tutti i casi. Con l'immagine più grande dello schermo X
e Y scelgono che parte se ne vede; con l'immagine più piccola scelgono dove
sta, e non la portano mai fuori dallo schermo. Il punto fermo resta fermo
anche cambiando grandezza, quindi rimpicciolire non la fa scappare.

La pagina lo scrive in CSS, senza JavaScript: uno strato fisso dietro tutto
(`.sf`, un contenitore delle misure dello schermo, `container-type: size`), e
dentro l'immagine con larghezza, altezza e posto calcolati da quelle formule
(unità `cqw`/`cqh`). Il punto, la grandezza e la forma sono variabili
(`--sf-x`, `--sf-y`, `--sf-s`, `--sf-r`): l'anteprima del pannello le cambia
mentre trascini, e al rilascio la pagina si rifà dal server.

## Il riempimento

Attorno all'immagine ci sono quattro fasce: sopra (dal bordo dello schermo
all'immagine), sotto, a sinistra e a destra. Ognuna continua il bordo che
tocca: la fascia sopra è una sfumatura che comincia col colore dell'angolo in
alto a sinistra, passa per i sei colori letti lungo il bordo alto (ognuno
esattamente sopra il sesto da cui è stato letto) e finisce col colore
dell'angolo in alto a destra. Oltre la larghezza dell'immagine resta il colore
dell'angolo.

Negli angoli dello schermo due fasce si sovrappongono, e per costruzione lì
hanno lo stesso colore: quello dell'angolo, che entrambe usano come primo o
ultimo. Per questo le fasce non sfumano verso un colore medio allontanandosi
dall'immagine: ogni fascia sfumerebbe verso la media del suo lato, e dove due
fasce si toccano resterebbe una riga. Il cancello lo guarda sui pixel veri,
un pixel di qua e uno di là dai confini.

Quando l'immagine è più piccola dello schermo i suoi bordi sfumano (3%) nelle
fasce, e non resta una riga dura. Quando copre lo schermo non sfumano: sarebbero
i bordi dello schermo.

I colori li legge il pannello, disegnando l'immagine piccola su una tela: sei
per lato, ognuno la media di un sesto del bordo profondo il 4%, e i quattro
angoli, ognuno la media del suo quadratino. Da un'immagine caricata qui si può
sempre, da un indirizzo di un altro sito solo se quel sito lo permette. Se non
si può, dove l'immagine non arriva resta il colore dello sfondo del tema, e il
pannello lo dice.

## Il foglio sopra la copertina fissa

Con una copertina fissa il resto della pagina è un foglio che le scorre
sopra, e deve avere lo sfondo della pagina per coprirla. Il foglio ha una copia
dello stesso strato, ritagliata sulla sua forma (`clip-path`, che ritaglia
anche ciò che è fisso): mostra esattamente quello che mostra la pagina, al
millimetro, invece di un'altra versione dello sfondo.

## Le immagini di prima

Una pagina salvata prima di questa regola non ha la forma dell'immagine:
copre lo schermo come prima, col punto fermo già rispettato. Aprendo
l'editor il pannello la misura, e alla prossima pubblicazione la pagina passa
allo strato nuovo.

## Nel pannello

- «Carica un'immagine» accanto all'indirizzo; un'immagine nuova parte dal
  centro, al 100%.
- «Spostala sull'anteprima»: sull'anteprima del telefono si trascina
  l'immagine, la rotella o due dita cambiano la grandezza, Esc chiude.
- I cursori «Grandezza», «Posizione orizzontale» e «Posizione verticale» fanno
  lo stesso, anche da tastiera; «Rimetti al centro» torna a 50, 50, 100.
- «Dove l'immagine non arriva»: i colori dei suoi bordi, o il colore dello
  sfondo.

`test/unita/sfondo-pagina.test.mjs` prova la regola scritta;
`scripts/verifica-pagina-link.mjs` la misura sui pixel di un browser vero.
