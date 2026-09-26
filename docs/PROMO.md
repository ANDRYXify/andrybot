# Le grafiche delle promo

La scheda «Promo» dell'admin disegna le pubblicità delle campagne (schermi in
strada, storie, anteprime dei link) e le esporta in immagine o in video. Il
motore è `src/web/public/promo.js` (`SB_PROMO`), su canvas, fotogramma per
fotogramma: la stessa scena dà l'anteprima nel pannello, il PNG e il video.
Tutto quello che traccia una linea passa dalla penna (`docs/PENNA.md`).

## La scena

`SB_PROMO.crea({ w, h, versione, lingua, testi, tempi, qr, indirizzo, logo, seme })`
restituisce `{ w, h, durata, fine, problemi, disegna(ctx, t) }`.

- **Versioni.** `piena`: logo, titolo, chat con la risposta, nota a mano con la
  freccia, piattaforme cerchiate, carta del QR, indirizzo sottolineato.
  `essenziale`: logo, titolo, indirizzo (per chi non vuole il QR).
  `anteprima`: l'immagine 1200x630 del link di una campagna.
- **Impaginazione dalla misura.** Orizzontale o verticale lo dice il rapporto
  fra i lati; l'unità `U` è la misura divisa per quella di riferimento
  (1920x1080, 1080x1920). I blocchi si impilano: il titolo prende lo spazio che
  resta fra la nota e le piattaforme, non una posizione fissa.
- **Il titolo.** Gli a capo li decide il motore: fra tutti i modi di andare a
  capo sceglie quello con le righe più pari (minimo scarto quadratico), e fra
  tutti i corpi il più grande che ci sta. `|` forza un a capo, `~` tiene
  insieme due parole (un a capo non le separa: «in~chat»), le parole fra
  `*asterischi*` vanno in colore. La didascalia del QR va a capo allo stesso
  modo.
- **Le parole corte.** Una parola di una o due lettere non resta mai in fondo
  alla riga: va a capo con quella che segue («of everything», «di tutto»),
  come in tipografia. Non se chiude con una virgola o i due punti («it:»), e
  non fra due colori diversi.
- **I tempi.** Ogni pezzo ha il secondo in cui comincia a disegnarsi, più la
  durata totale. Il disegno va a scatti di dodicesimi di secondo, come a mano.

## I problemi

`problemi` elenca, in parole, quello che non va, e l'admin lo vede sotto
l'anteprima prima di esportare:

- due blocchi che si sovrappongono, o un blocco che esce dalla grafica;
- il titolo che non ci sta, anche al corpo più piccolo;
- il QR con meno di 4 moduli di margine, o la didascalia dentro il margine;
- un testo con una faccina involontaria (due punti seguiti da un segno che
  sembra una bocca: «: 1» si legge «:)» rotto);
- la grafica che finisce di comporsi a meno di 3 secondi dalla fine: su uno
  schermo per strada la composizione intera deve restare ferma abbastanza da
  leggerla e inquadrare il QR.

## La faccina del logo

Il logo è un disegno fisso, e la testa del robot ha una finestra: lo schermo
con la faccia. Nel disegno lo schermo è trasparente e occhi e bocca sono
attaccati al bordo: in grande, su uno sfondo con raggi e retino, la faccia si
vede attraversata dallo sfondo e storta. `SB_PROMO.prepara(logo)` la ripara
per costruzione, senza indovinare:

1. fra i buchi chiusi del logo (trasparenti e non raggiungibili dal bordo)
   la finestra è l'unico fortemente concavo, perché occhi e bocca lo mordono
   (area su inviluppo 0,58; le lettere stanno sopra 0,9). Se non è così il
   motore si ferma con un errore invece di scegliere a caso;
2. lo schermo è il rettangolo di area minima che contiene quel buco;
3. la cornice si misura (lo spessore del nero intorno), il magenta che
   sbordava nella cornice torna nero, lo schermo si riempie di carta e la
   china ripassa il bordo;
4. dentro si disegnano con la penna due occhi e un sorriso, centrati e con i
   margini presi dallo schermo, negli stessi colori del disegno.

## Il disegno vero

Le carte (chat, QR) non sono rettangoli con un contorno sopra: sono forme a
mano (`SB_PENNA.forma`), con gli angoli spostati ognuno per conto suo, i lati
appena curvi e raggi diversi. Il foglio segue quella forma; l'ombra è un
secondo foglio tagliato a mano, spostato sotto; la china gira la forma e
chiude oltre l'inizio. Le piattaforme (Twitch, Kick) sono scritte a pennarello
e cerchiate a mano (`SB_PENNA.ovale`), non bottoni. Il testo sta nel
rettangolo interno della forma, con un margine più grande dello spostamento
massimo degli angoli: dentro per costruzione.

## Il video

Il browser disegna i fotogrammi e li comprime con `VideoEncoder` (VP9, o VP8 se
manca) dentro un IVF, un contenitore di 32 byte di testa e 12 per fotogramma
che scriviamo noi (`SB_PROMO.ivf`). Il server lo riceve su disco a pezzi
(`POST /api/admin/promo/video`, solo admin, uno alla volta) e ffmpeg ne fa un
MP4 H.264 (high, yuv420p, crf 14, faststart), il formato che chiedono gli
schermi. I colori escono in BT.709, convertiti e scritti nel file: il browser
consegna i fotogrammi in BT.601, e un lettore che ignora l'etichetta legge un
video HD in BT.709. Letto con la matrice sbagliata il magenta del marchio si
sposta di una quarantina di livelli; convertito, resta dov'è. Il PNG invece esce dal canvas, firmato come le altre immagini.

## Dove si salva

La grafica di una campagna (misura, versione, lingua, testi, tempi, indirizzo)
si salva nella campagna (`dati.grafica`): riaprendo la scheda la si ritrova
com'era. L'anteprima del link si rifà da sola ogni volta che si salva la
campagna, e si può sostituire con una disegnata a mano nella versione
«Anteprima del link».
