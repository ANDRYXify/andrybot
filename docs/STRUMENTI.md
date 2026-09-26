# Strumenti

Il gruppo «Strumenti» del pannello tiene le cose che servono intorno alla
diretta e che non sono il bot. Si apre con due schede:

- **QR su misura** (`qr`): un QR con forme, colori, logo e cornice scelti dallo
  streamer, che si scarica solo se riletto dai pixel torna identico;
- **Emote e badge** (`misure`): un'immagine sola, ridotta alle tre misure che
  chiede Twitch, con la media fatta sulla luce vera.

Un gruppo con una scheda sola il cancello delle sorelle non lo accetta: per
questo si parte con due strumenti veri, non con uno e un segnaposto. Il media
kit e l'importazione dagli altri bot vengono dopo.

Il manuale per chi lo usa è `src/web/manuali/it/strumenti.js`
(`/manuale/strumenti`); qui c'è come è fatto.

## Il QR è nostro

`src/web/public/qr.js` (`SB_QR`) codifica e legge i QR secondo la norma
ISO/IEC 18004, senza librerie. Prima usavamo `vendor/qrcode.js`: faceva il
codice, ma non sapeva rileggerlo, non sapeva dire quanto di un logo il codice
sopporta, e la geometria dei moduli la dava solo come «acceso o spento». Per
disegnare un QR personalizzato e sapere che si legge servono tutte e tre le
cose, quindi il codificatore l'abbiamo scritto noi, e la libreria è uscita.

### Codifica

- Modo byte, testo in UTF-8, versioni da 1 a 40, livelli L, M, Q, H.
- Reed–Solomon su GF(256) col polinomio 0x11d; blocchi e codici di correzione
  dalla tabella della norma (`BLOCCHI`), intercalati come la norma chiede.
- Posa a zig-zag, otto maschere, e la maschera scelta col punteggio di penalità
  della norma: righe lunghe (N1), blocchi 2×2 (N2), sequenze che somigliano a
  un occhio (N3, contate sulle corse: quattro moduli chiari da un lato e almeno
  uno dall'altro), proporzione di scuri (N4).
- Formato con BCH 0x537 e maschera 0x5412; versione con BCH 0x1f25.

`codifica(testo, { livello, versione, maschera })` restituisce, oltre alla
matrice (`scuro`), la mappa `parola` (modulo → indice del codice) e `blocco`
(codice → blocco). Servono al conto del danno qui sotto.

### Lettura

`leggi(scuro, n)` fa il giro al contrario: formato letto per distanza di
Hamming (fino a 3 bit sbagliati), maschera tolta, codici raccolti, blocchi
corretti con Berlekamp–Massey, Chien e Forney, dati decodificati. Restituisce
`{ testo, versione, livello, maschera, errori }`, o `null` se non si legge.

### Collaudo

`test/unita/qr.test.mjs`:

- **Le matrici sono quelle della norma.** Cinque casi (livelli diversi, accenti
  e simboli, 300 byte, un link lungo in H) confrontati per impronta con un
  codificatore di riferimento che segue la norma alla lettera: stessa
  versione, stessa maschera, stessa matrice modulo per modulo. Prima di
  fissare le impronte il confronto è stato fatto su 1612 casi (testi e livelli
  diversi), tutti identici; e su 1216 casi con la libreria che usavamo prima,
  identici a parità di maschera.
- **La penalità non dipende dal verso:** la stessa matrice specchiata o
  trasposta costa uguale, perché le quattro regole della norma sono
  simmetriche. Le impronte da sole non bastavano: contare N3 da un lato solo
  lasciava verdi tutti e cinque i casi.
- **Le capacità** in byte per versione e livello sono quelle della norma.
- **La tabella dei blocchi torna con la geometria:** per ogni versione, i
  moduli liberi divisi per otto sono esattamente i codici della tabella.
- **Quello che si scrive si rilegge,** in ogni livello, con accenti ed emoji.
- **Gli errori si correggono fino a metà dei codici di correzione di ogni
  blocco, non oltre:** oltre il limite il lettore non inventa il testo giusto.
- **Gli anelli degli occhi e degli allineamenti sono copie in scala:** il test
  spezza i percorsi SVG in segmenti, lancia 72 raggi dal centro di ogni occhio
  e allineamento, e controlla che i tre anelli stiano 7:5:3 (5:3:1) in ogni
  direzione, per ogni forma di occhio.
- **Nessun puntino negli allineamenti:** con i quadratini a puntini, gli
  allineamenti hanno la forma degli occhi.

I test sono stati provati guastando il codice: N2 spenta, N3 contata da un
lato solo (da ognuno dei due), le colonne saltate nella penalità, una riga
della tabella dei blocchi, la maschera del formato, gli allineamenti coi
puntini, i raggi dei morbidi non in proporzione, i tre anelli della penna con
semi diversi o col raggio fisso. Ogni guasto fa diventare rosso almeno un test.

### Con lettori che non sono il nostro

Il nostro rilettore campiona sulla griglia che conosce: dice se il disegno
porta il testo giusto, non se un telefono lo trova. Per questo, una volta, i
QR sono stati letti anche da due lettori indipendenti, in un browser vero.

- **jsQR**, che trova il codice come fa ZXing (proporzioni degli occhi,
  allineamenti, poi campionamento). All'inizio i puntini non si leggevano
  (l'allineamento a puntini, vedi sopra), e con un logo pieno di segni gli
  occhi morbidi e a penna perdevano contro i falsi candidati a 2048 e 4096
  pixel: 38 casi su 48. Con occhi e allineamenti in scala, tutte le forme di
  quadratini e di occhi, con e senza logo (anche grafiche piene di testo), a
  1024, 2048 e 4096 pixel, nitide e rimpicciolite con sfocatura come in una
  foto: tutto letto (48 su 48, 72 su 72, 96 su 96 nelle tre prove, e ogni
  immagine scaricata dal pannello, SVG compreso).
- **OpenCV** (`QRCodeDetector`) cerca gli occhi come contorni quadrati: legge
  sempre gli occhi quadrati, quasi mai quelli tondi, a volte i morbidi e quelli
  a penna. È un limite di quel rilevatore, non della norma, che definisce
  l'occhio per le sue proporzioni. Chi vuole la massima compatibilità con
  qualunque lettore sceglie gli occhi quadrati, che sono quelli di serie.

## Si legge per costruzione

Un QR personalizzato di solito si prova col telefono e si spera. Qui le
condizioni che lo rendono leggibile sono dentro `progetto(testo, stile)`, e se
una non è rispettata il progetto lo dice in `problemi` prima di disegnare.

- **Contrasto.** Luce relativa (sRGB linearizzato, pesi BT.709) del fondo meno
  quella dei moduli, almeno **0,55**: è la soglia del voto B per il contrasto
  nella norma sulla qualità di stampa dei codici (ISO/IEC 15415). Vale anche per
  gli occhi, che possono avere un colore loro. Il fondo deve essere il più
  chiaro: i QR in negativo molti lettori non li leggono.
- **Margine.** Quattro moduli vuoti intorno (`QUIETE`), sempre. La cornice, se
  c'è, sta fuori dal margine.
- **Forme.** Ogni forma di modulo (quadrati, morbidi, puntini, a penna) copre
  il centro della sua cella, che è dove un lettore campiona. I morbidi
  arrotondano solo gli angoli che non toccano un vicino scuro, così i gruppi
  restano pieni. La penna ha un seme per canale: lo stesso canale ha sempre lo
  stesso tratto.
- **Occhi.** Prima di campionare, un lettore deve *trovare* il codice: cerca
  gli occhi misurando scuro, chiaro, scuro, chiaro, scuro in proporzione
  1:1:3:1:1, in orizzontale, in verticale e in diagonale. Le proporzioni
  tengono in ogni direzione solo se i tre anelli sono la **stessa forma in
  scala** 7:5:3 attorno al centro. Quadrati e cerchi lo sono da sé; per i
  morbidi il raggio dell'angolo è un quarto del lato, per la penna un quinto,
  e i tre anelli hanno lo stesso seme e gli stessi parametri relativi (la
  penna sposta angoli e fianchi in proporzione al lato), quindi escono uno la
  copia in scala dell'altro.
- **Allineamenti.** I quadri piccoli (dalla versione 2 in su) sono «occhi
  piccoli»: stessa forma degli occhi, in scala 5:3:1, mai quella dei
  quadratini. Un lettore li cerca come un anello continuo; fatto a puntini
  l'anello è poroso e a immagine nitida non si trova.
- **Logo.** Con un logo il livello è H. La targa del logo è un quadrato di
  celle intere, di lato dispari, al centro; `danno(qr, celle)` conta per ogni
  blocco quanti codici la targa tocca, e la targa più grande ammessa
  (`targaMassima`) è quella che non tocca nessun segno fisso (occhi,
  allineamenti, temporizzazione, formato, versione) e non prende più di **metà**
  della capacità di correzione di nessun blocco. L'altra metà resta per il
  mondo: graffi, riflessi, pieghe. Se la targa più grande è sotto i 5 moduli,
  il logo non si mette e il progetto lo dice. Il cursore dello streamer sceglie
  fra il 20% e il 100% di quella targa, mai oltre.

### La rilettura

Le regole sopra sono il modello; la rilettura lo conferma sul disegno vero.
`rileggi(pixel, progetto, geometria)` prende i pixel della tela, fa la media
della luce in un quadratino al centro di ogni cella, separa scuro e chiaro a
metà fra la luce dei due colori, e passa la matrice a `leggi`. Il QR è buono
solo se il testo che torna è **identico** a quello scritto.

Nel pannello la rilettura si fa sull'anteprima a ogni modifica, e di nuovo
sull'immagine alla misura scelta prima di scaricarla. Se non torna, i tasti
per scaricare restano spenti e sotto l'anteprima c'è scritto cosa cambiare.

Quello che la rilettura non vede: la stampa, la prospettiva, la sfocatura. Per
questo il margine di correzione resta metà libero, e il manuale dice la misura
minima di stampa.

### Dove si usa

- **Scheda QR su misura.** PNG a 1024, 2048 o 4096 pixel, o SVG con il logo e
  il carattere della frase dentro il file (niente riferimenti esterni: l'SVG
  scaricato si apre ovunque uguale).
- **Grafiche social.** Lo stile salvato (`impostazioni.qr`, normalizzato da
  `src/features/qr-stile.js`) disegna il QR delle grafiche, senza cornice. Anche
  lì il QR si rilegge: se con lo stile dello streamer non tornasse, si usa
  quello di serie.
- **Promo.** Le grafiche delle campagne prendono la matrice da
  `SB_QR.codifica(…, { livello: 'M' })` e la disegnano a modo loro
  (`docs/PROMO.md`).

### Lo stile salvato

`normStileQr` tiene solo scelte conosciute: forme fra quelle elencate, colori
`#rrggbb`, frase fino a 40 caratteri, grandezza del logo fra 20 e 100. Il logo
caricato è accettato solo come immagine vera e piccola (PNG, JPEG o WebP in
base64, al massimo 200 000 caratteri): niente SVG, che può portare script,
niente indirizzi di fuori, che sporcherebbero la tela e non si potrebbero più
leggere i pixel. Il pannello riduce l'immagine prima di mandarla (384, 256 o
192 pixel di lato, finché ci sta).

## Emote e badge

Twitch chiede le emote a 112, 56 e 28 pixel (fino a 1 MB) e i badge a 72, 36 e
18 (fino a 25 KB). La scheda prende un'immagine, la mette in un quadrato
(«intera», col bordo trasparente, o «riempi», tagliando i lati) e la riduce.

### Perché la riduzione è nostra

Ridurre vuol dire fare la media dei pixel che cadono in ogni pixel nuovo. Il
browser, e molti programmi, la fanno sui valori sRGB, che non sono
proporzionali alla luce: la media di un bianco e di un nero viene più scura del
grigio vero, e i contorni sottili chiari su fondo scuro (il caso tipico di
un'emote) si perdono. E chi non tiene conto della trasparenza conta un pixel
trasparente come nero, e i bordi si sporcano.

`riduciLineare` fa la media ad area (ogni pixel di partenza pesa per quanto
cade nel pixel nuovo), sui valori **linearizzati**, con l'alfa
**premoltiplicato**, e riporta in sRGB alla fine. Il quadrato di lavoro è al
massimo 16 volte la misura grande, così un'immagine enorme non blocca la
pagina.

### L'anteprima

Le tre misure si vedono una accanto all'altra, e poi come in chat, sul fondo
scuro e su quello chiaro di Twitch: l'emote a 28 pixel accanto al testo, il
badge a 18 prima del nome, con `srcset` per gli schermi fitti, come fa Twitch.
Se una misura supera il peso ammesso, o l'immagine di partenza è più piccola
della misura grande, sotto c'è scritto.

Il download è un PNG per misura o uno zip con tutte (zip senza compressione,
scritto nel pannello: i PNG sono già compressi).

Le immagini di questa scheda non escono dal browser.
