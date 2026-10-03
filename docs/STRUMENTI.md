<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Strumenti

Il gruppo «Strumenti» del pannello tiene le cose che servono intorno alla
diretta e che non sono il bot:

- **QR su misura** (`qr`): un QR con forme, colori, logo e cornice scelti dallo
  streamer, che si scarica solo se riletto dai pixel torna identico;
- **Emote e badge** (`misure`): un'immagine sola, ferma o animata, o un pezzo
  di video, ridotta alle misure che chiedono Twitch, 7TV e Discord, con la
  media fatta sulla luce vera;
- **Media kit** (`kit`): il biglietto da visita per i marchi, come un
  curriculum: sezioni in ordine su una, due o tre pagine A4, coi numeri delle
  dirette misurati da noi, in PDF coi link cliccabili e il testo che si cerca,
  o in PNG;
- **Pannelli** (`pannelli`): i pannelli sotto il canale Twitch, tutti nello
  stesso stile, con link e descrizioni già scritti da quello che il canale ha;
  ognuno può aprire una pagina sua, con quello che nel pannello non ci sta.

Un gruppo con una scheda sola il cancello delle sorelle non lo accetta: per
questo si è partiti con due strumenti veri, non con uno e un segnaposto.

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

Chi riceve l'emote detta le regole (tabella `MISURE` in `app.js`):

| per | lati | peso ferma | animata |
| --- | --- | --- | --- |
| emote Twitch | 112, 56, 28 | 1 MB | GIF, 512 KB l'una, al massimo 60 fotogrammi |
| badge Twitch | 72, 36, 18 | 25 KB | non si muovono: PNG dal fotogramma fermo |
| emote 7TV | 128 | 7 MB | GIF, 7 MB, fino a 1000 fotogrammi |
| emoji Discord | 128 | 256 KB | GIF, 256 KB |

La scheda prende un'immagine, la mette in un quadrato («intera», col bordo
trasparente, o «riempi», tagliando i lati) e la riduce.

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

Il download è un file per misura o uno zip con tutte (zip senza compressione,
scritto nel pannello: PNG e GIF sono già compressi).

### Le animazioni

L'ingresso animato è un'immagine (GIF, WebP, APNG, AVIF) letta con
`ImageDecoder`, che dà ogni fotogramma già composto e la sua durata, o un pezzo
di video (al massimo 10 s) letto spostando il video a 20 fotogrammi al secondo.
Un WebM senza durata scritta (quelli di `MediaRecorder`) la rivela spostandosi
in fondo. Ogni fotogramma si mette in un quadrato di lavoro di 256 pixel (mai
meno della misura più grande); oltre 200 fotogrammi si ricampionano subito, nel
tempo.

Il modello sta in `emote-animate.js` (`SB_EMOTE`, con le sue prove in
`test/unita/emote-animate.test.mjs`):

- **ricampionare nel tempo**: se i fotogrammi sono più di quelli ammessi, se ne
  prendono `m` a istanti uguali, e per ogni istante quello che si vede in quel
  momento. I ritardi si arrotondano al centesimo **cumulando**, così il giro
  dura uguale al centesimo. Un tempo sotto i 2 centesimi vale 10, come lo
  mostrano i browser;
- **il fotogramma fermo è il primo**: Twitch, 7TV e Discord mostrano il primo
  fotogramma dove le animazioni sono spente. La barra sceglie il fermo e
  l'animazione si **ruota** perché parta da lì: il giro è lo stesso, cambia
  solo l'inizio;
- **stare nel peso**: per ogni misura si prova la scala `RIDUZIONI`, che scende
  sempre (prima i colori, 256, 128, 64, poi un fotogramma su 2, 3, 4,
  sommando i tempi), e ci si ferma al primo che sta nel peso. Senza dithering:
  a 28 pixel l'errore sparso cambia da un fotogramma all'altro e brulica;
- **lampi**: la luminanza relativa media di ogni fotogramma, sul fondo scuro e
  su quello chiaro di chi la riceve, con la trasparenza come la mostra la GIF
  (piena o vuota). Un lampo è una coppia di cambi opposti di almeno 0,1 col più
  scuro sotto 0,8 (WCAG 2.3.1, lampi generali); se in un secondo, contando
  anche a cavallo del giro, ce ne sono più di tre, la scheda lo dice in rosso.

La GIF esce da `graf-gif.js` (lo stesso delle Grafiche, che senza opzioni
scrive gli stessi byte di prima) con tre opzioni: il **trasparente** (un indice
della tavolozza, smaltimento 2: ogni fotogramma si ripulisce, niente scie), un
**ritardo per fotogramma** e un **tetto ai colori**. Le prove
(`test/unita/gif-emote.test.mjs`) rileggono la GIF con un decodificatore scritto
a parte.

Un browser senza `ImageDecoder` legge solo il primo fotogramma: la scheda lo
riconosce dai byte (più immagini nella GIF, `acTL` nel PNG, il segno di
animazione nel WebP) e lo dice, invece di dare un'emote ferma in silenzio.

Il cancello `scripts/verifica-emote.mjs` lo prova in un browser vero, su
telefono e computer, rileggendo ogni uscita col decodificatore del browser:
misure, fotogrammi, giro, peso, trasparenza, fermo scelto, badge, 7TV, Discord,
lampi, video e browser che legge solo il primo fotogramma. L'autoprova toglie a
Twitch il tetto dei 60 fotogrammi.

Le immagini di questa scheda non escono dal browser.

## Media kit

Quello che uno streamer manda a un marchio, fatto come un curriculum: chi è,
i suoi numeri, i lavori fatti, i marchi con cui ha lavorato, cosa offre, come
scrivergli. Il modello sta in `src/features/mediakit.js` (rotta
`GET /api/streamer/kit`), l'impaginazione e il disegno in
`src/web/public/kit.js` (`SB_KIT`), il PDF in `src/web/public/pdf.js`
(`SB_PDF`). I due file del pannello si caricano solo quando si apre la scheda.

Non è una pagina pubblica: esiste quando si scarica. Pubblicare numeri che
oggi sono privati, come la media degli spettatori, vorrebbe un consenso e
un'informativa a parte.

### Un documento di sezioni

Il kit è un elenco di sezioni in ordine, che scorre su pagine A4, fino a tre.
Ogni sezione ha un titolo (riscritto o quello di serie), si mostra o no, e dove
ha senso sta a tutta riga o a metà: due «a metà» di fila stanno affiancate.

| sezione | cosa c'è | da dove |
| --- | --- | --- |
| `testa` | foto, nome, una riga sotto il nome, canale, presentazione | l'account; riga e presentazione scritte (di partenza la frase della pagina link) |
| `numeri` | quali numeri mostrare, con periodo, fonte e data | i rapporti degli ultimi 30 giorni; il pannello sceglie, non scrive |
| `categorie` «Cosa trasmetto» | le categorie con la loro quota | i rapporti (`docs/RAPPORTO.md`) |
| `settimana` «Quando sono in onda» | i giorni e le ore | la settimana |
| `social` «Dove trovarmi» | i social, cliccabili | la pagina link |
| `lavori` «I miei lavori» | fino a 6 {titolo, due righe, link} | scritti |
| `collaborazioni` «Hanno lavorato con me» | fino a 12 marchi, col link se c'è | scritti |
| `offerte` «Cosa offro» | fino a 6 {proposta, due righe, prezzo} | scritte |
| `testo` | titolo e testo liberi, da zero a due sezioni | scritti |
| `link` «Link utili» | fino a 8 {etichetta, link} | scritti |
| `contatti` | l'email e un secondo contatto {etichetta, link} | scritti |

`normKit` tiene la forma per costruzione: la testa sempre prima e i contatti
sempre ultimi; le sezioni uniche ci sono sempre, al massimo spente, così il
pannello le può sempre riaccendere; ogni voce ha un tetto. Un kit salvato
prima delle sezioni non si migra: `sezioniDi` lo legge come le stesse sezioni
di allora (testa, numeri, poi categorie, social, settimana e marchi a metà, i
contatti), quindi chi l'aveva fatto lo ritrova uguale.

Ogni indirizzo passa da `urlKit`: solo http(s) e un nome a dominio vero, e
«miosito.it» vuol dire https://miosito.it. Le email devono avere la forma di
un'email. Il pannello usa le stesse due regole (`SB_KIT.urlKit`,
`SB_KIT.emailKit`) per l'anteprima e il PDF, e
`test/unita/mediakit.test.mjs` tiene che rispondano come il server: il kit
scaricato e quello salvato non possono differire. Un indirizzo storto si
segna nel suo campo e non diventa un link.

### Onestà per costruzione

- **La media è pesata sul tempo**: Σ(media·giri) / Σ(giri). Una diretta di sei
  ore pesa sei volte una di un'ora; la media delle medie sarebbe un altro
  numero, e il test lo controlla.
- **Soglie**: i numeri del periodo escono solo con almeno 3 dirette concluse;
  la media anche solo se ci sono campioni; le categorie solo con almeno 3
  dirette che le hanno. Sotto soglia il blocco non c'è, e la scheda dice
  perché e quanto manca.
- **Le percentuali delle categorie sono intere e sommano sempre a 100**: si
  arrotonda per difetto e il resto va a chi ha perso di più
  nell'arrotondamento. Oltre la quarta categoria il resto va in «Altro».
- **Niente numeri scritti a mano**: la sezione dei numeri sceglie quali
  mostrare, non cosa dicono; un numero mandato dal pannello si perde.
- **Ogni numero porta periodo, fonte e data** nella nota sotto la griglia.
- **Niente dati di altre persone** (classifiche, nomi di chi guarda) e **niente
  soldi**.

### L'impaginazione

A4 a 150 punti per pollice (1240×1754). Misurare e disegnare sono la stessa
funzione (`penna`: a secco misura, sulla tela disegna), quindi l'altezza
misurata è per costruzione quella disegnata. `impagina` misura ogni sezione e
la mette nella pagina: una sezione non si spezza, se non ci sta va alla pagina
dopo. Le sezioni spente o vuote non occupano posto e non si prendono la
compagna di riga. I contatti vengono per ultimi, dopo tutto il resto, così il
bianco resta in fondo alla pagina come in qualunque documento. Oltre la terza
pagina quello che non entra non compare e la scheda lo dice: niente si taglia
in silenzio.

I tetti delle voci tengono ogni sezione più bassa di una pagina, piena o a
metà, coi titoli in maiuscolo o normali: `test/unita/kit.test.mjs` lo misura
con ogni sezione piena fino al tetto. Le stesse prove tengono che niente si
disegni fuori dal posto che l'impaginazione gli ha dato, che le sezioni non si
sovrappongano, che le metà si affianchino, che i numeri non lascino un
riquadro da solo nell'ultima riga, che ogni cosa con un indirizzo sia un link
e che lo strato di testo segua l'ordine di lettura.

Quello che non ci sta si accorcia coi puntini e la scheda lo dice; il nome e
l'email prima si rimpiccioliscono, perché un'email accorciata su un PNG non si
può ricopiare.

### La veste

I colori della pagina link, Carta, Notte o «I miei colori» (fondo, testo,
accento). Coi miei colori vale la stessa regola dei pannelli: il testo deve
avere contrasto almeno 4,5 col fondo, se no diventa nero o bianco; l'accento
almeno 3, se no prende il colore del testo; anche il grigio dei dettagli si
schiarisce o scurisce finché resta a 4,5 (`SB_KIT.veste`). La scheda dice
quando un colore è stato corretto. Il carattere: Archivo, con grazie o
monospaziato; i titoli delle sezioni in maiuscolo spaziato o normali.

### Il PDF

Scritto da noi (`daPagine`, `daTele`): una pagina A4 per ogni foglio, ognuna
con la sua immagine RGB compressa con `CompressionStream('deflate')` (zlib,
quello che `FlateDecode` vuole), le sue annotazioni `/Link` sugli stessi
rettangoli che il disegno ha registrato, e sotto l'immagine uno strato di
testo invisibile (`3 Tr`) con Helvetica di serie in WinAnsi: ogni scritta sta
sulla sua riga di base, stirata con `Tz` alla larghezza misurata sulla tela.
Così l'email si copia, un marchio si cerca, e un lettore legge il kit anche
senza guardarlo. Le lettere fuori da WinAnsi diventano «?» solo lì; frecce ed
emoji si saltano. Gli indirizzi vanno in stringa esadecimale, il titolo in
UTF-16.

`test/unita/pdf.test.mjs` controlla l'indice, l'albero delle pagine, le
immagini identiche, i link pagina per pagina e lo strato di testo (posizione,
larghezza, codifica). Il cancello `scripts/verifica-kit.mjs` lo prova nel
browser, sulla demo, al telefono e al computer, col PDF vero: tante pagine
quante l'anteprima, ogni link sul suo rettangolo, l'email e un marchio che si
trovano come testo, un indirizzo storto che non diventa un link, una sezione
nascosta che sparisce, una spostata che cambia posto, i miei colori corretti.
Con `--selftest` rimette quattro difetti e li vuole tutti rossi. Il kit della
demo, letto anche da pypdf: due pagine, i link di ognuna, il testo estratto
nell'ordine in cui si legge.

## Pannelli

Sotto il canale Twitch, in «Informazioni», ci sono i pannelli: ognuno ha
un'immagine, un link e una descrizione. Le misure le dice Twitch: l'immagine
larga al massimo 320 pixel e alta al massimo 600, altrimenti la ridimensiona;
la descrizione in Markdown, senza HTML. Qui l'immagine si disegna a 320 esatti:
più larga Twitch la stringerebbe lui, e la stringerebbe peggio.

Un'immagine è la parte facile. Quello che costa tempo a uno streamer sono il
link giusto e la descrizione di ogni pannello, e sono cose che il canale sa
già. Per questo i pannelli nascono pieni:

| pannello | link | descrizione |
|---|---|---|
| Chi sono | la pagina link | la frase della pagina link |
| Social | la pagina link | i social della pagina link, uno per riga, coi link |
| Discord | la porta d'ingresso del server, se è aperta; se no il Discord della pagina link | |
| Sostienimi | la pagina delle donazioni, se le donazioni sono pronte | |
| Programma | la pagina link | i giorni e le ore della settimana, e il fuso |
| Comandi | | i comandi del canale, fino a dodici |
| Regole | | da scrivere |

Si parte coi pannelli per cui c'è qualcosa da dire: senza donazioni pronte il
pannello «Sostienimi» non compare da solo, senza settimana non compare
«Programma» (il nome che Twitch stesso dà a quella funzione, e corto). Si aggiungono, si tolgono, si riordinano, e ogni
campo si riscrive a mano; un pannello libero ha solo quello che ci si scrive.

### Uno stile per tutta la serie

I pannelli stanno in fila sulla stessa pagina: uno diverso dagli altri si nota
subito. Per questo lo stile è della serie, non del pannello: tema, forma,
carattere, icone sì o no, altezza, freccina sì o no. Il pannello sceglie titolo,
sottotitolo, icona e dove porta.

- **Tema.** «Pagina»: lo sfondo è l'accento della pagina link. «Carta» e
  «Notte»: chiaro e scuro, con l'accento sulle icone e sul bordo. «I miei
  colori»: sfondo, testo e accento scelti dallo streamer, con la stessa regola
  di contrasto qui sotto (il testo che non si legge diventa bianco o nero,
  l'accento che non si vede prende il colore del testo). La prova li prova
  tutti su una griglia di colori, testo uguale allo sfondo compreso.
- **Forma.** «A penna»: il bordo disegnato dalla penna di casa (quella del QR
  e delle carte del pannello), con un seme per pannello, così ogni bordo è un
  po' diverso come quelli fatti a mano, ma sempre lo stesso a ogni disegno.
  «Netta»: angoli tondi. «Piena»: tutta l'immagine.
- **Carattere.** Gli stessi delle Grafiche social.
- **Altezza.** 80, 100 o 160 pixel.

- **Freccina.** Una punta a destra, del colore dell'accento, sui pannelli che
  portano da qualche parte. La decide chi disegna, col link VERO del pannello
  (`_panLink`): un pannello senza link, o con la sua pagina non pubblicata, non
  la ha. Il titolo le lascia posto e, se serve, si rimpicciolisce.

Fuori dalla forma lo sfondo è trasparente: sulla pagina di Twitch, chiara o
scura, si vede solo il pannello.

Il **sottotitolo** è una riga piccola sotto il titolo. Con il sottotitolo il
titolo parte da 0,32 dell'altezza invece di 0,4, e il sottotitolo da metà del
titolo (mai sotto 11 pixel): così le due righe stanno anche nei pannelli bassi
(80), con aria sopra e sotto. Anche il sottotitolo ha una misura sola per la
serie (`misuraSotto`), quella che fa stare il più lungo; solo sotto gli 11 pixel
si accorcia, e la scheda lo dice.

### Si legge per costruzione

Il titolo parte grande (poco meno di metà dell'altezza) e si rimpicciolisce
finché ci sta, fino a 14 pixel; solo sotto si accorcia coi puntini, e la scheda
lo dice. La misura è una sola per tutta la serie: quella che fa stare il titolo
più lungo. La prima versione adattava ogni pannello per conto suo, e in fila
«Quando sono in diretta» veniva la metà degli altri: una cosa che si nota
subito, su una pagina dove i pannelli stanno uno sotto l'altro. Il testo sul pannello ha contrasto di almeno 4,5 con il suo sfondo
(WCAG, anche per il testo piccolo): se il colore scelto non ci arriva, prende il
bianco o il nero, quello che contrasta di più. L'accento colora icona e bordo
solo se contrasta almeno 3 con lo sfondo, altrimenti prendono il colore del
testo. Lo stesso criterio del media kit, con la stessa funzione (`inchiostro`
in `kit.js`).

Il nero dev'essere nero puro. Fra bianco e `#000000` quello migliore arriva
sempre ad almeno 4,58, qualunque sia lo sfondo (il caso peggiore è uno sfondo di
luminanza 0,18, dove i due si equivalgono). Con un nero morbido, `#111111`, non
è più vero: su `#6666ff` nessuno dei due arriva a 4,5. Il media kit usava
proprio quel nero sulla fascia del contatto; il collaudo dei pannelli, che
prova tutti i colori di una griglia 6×6×6, l'ha trovato, e adesso la regola
sta in un posto solo.

### La pagina dietro il pannello

Su Twitch un pannello è un'immagine, un link e una descrizione in Markdown:
quello che non ci sta non può stare nel pannello, sta dietro il clic. Ogni
pannello (tranne «Sostienimi», che ha già la pagina delle donazioni) può
aprire **la sua pagina**, `/u/<login>/p/<id>`, con l'id del pannello.

- È fatta con lo **stesso editor a blocchi** della pagina link, delle donazioni
  e del negozio: il quarto tavolo (`LP.quale = 'pannello'`, `LP.pannello` =
  id), con l'aspetto della pagina link di serie (come le donazioni).
- **Il link del pannello non si scrive**: con «Apre la sua pagina» è
  l'indirizzo della pagina, calcolato, e resta vuoto finché la pagina non è
  pubblicata (la scheda lo dice). Non può puntare altrove per sbaglio.
- **Nasce piena di quello che il pannello promette** (`_panPaginaDiPartenza`):
  Programma il pezzo `programma`, Comandi il pezzo `comandi`, Chi sono la frase
  e i social, Social i social, Discord il tasto per entrare, gli altri la
  descrizione del pannello riga per riga.
- **Due pezzi vivi**, nuovi e validi su tutte le pagine (anche la pagina link e
  quella delle donazioni): `programma` (i giorni in onda della settimana, con
  la prossima segnata e il fuso detto per nome) e `comandi` (i comandi che può
  usare chiunque, `comandiPubblici` in `src/features/pannelli.js`: moduli
  accesi, col comando, senza ruolo minimo; la risposta si mostra solo se è una
  frase fissa, perché con una variabile dentro si leggerebbe il segnaposto). Si
  leggono quando la pagina si apre (`viviDi` in `server.js`), mai da una copia
  salvata: cambi la settimana e la pagina è già giusta, senza ricaricare
  niente su Twitch.
- **Si apre solo se un pannello salvato ci porta** (`portaAllaPagina`): esiste
  ed è su «Apre la sua pagina». Un pannello tolto, o che porta a un indirizzo,
  si porta via la sua pagina senza cancellarla: se torna, torna com'era.
  Nessuna pagina pubblica senza il pannello che ci porta, per costruzione e
  non per una pulizia che qualcuno deve ricordarsi di fare.
- **Non si offre ai motori di ricerca** (`noindex, follow`): è una porta da
  Twitch, non una pagina da trovare. Non conta visite. Il piede porta alla
  pagina link, se è pubblicata, e alla **sua informativa**
  (`/u/<login>/p/<id>/privacy`, `quale: 'dietro'` in `renderInformativa`),
  aperta alla stessa condizione della pagina e che dice il vero: niente
  contatore. Quella della pagina link non andava: può essere spenta, e parla
  di un'altra pagina e di un contatore che qui non c'è. L'anteprima nelle chat
  è quella della pagina link.
- **Dove sta**: la tabella `pagina_pannello` ha la colonna `channel` sua
  (chiave: canale e pannello), così esportazione e cancellazione dell'account
  (`src/features/esporta.js`) la trovano come trovano tutto il resto.
  `GET/POST/DELETE /api/paginapannello/:id` e `/anteprima` per l'editor, `GET
  /u/:user/p/:id` e `/privacy` per chi la apre. La demo la tiene in memoria.

Le prove: `test/unita/pagine-pannelli.test.mjs` (una pagina per pannello, id
ammessi, esportazione e cancellazione, comandi pubblici, i due pezzi vivi,
indirizzo e noindex, quando si apre, l'informativa sua),
`test/contratto/pagine-pannelli.test.mjs` (le porte del server: il canale
dall'indirizzo o dalla sessione, la stessa regola per pagina, informativa e
«pubblicata», i pezzi vivi letti adesso), `test/unita/pannelli.test.mjs`
(sottotitolo, misura unica, freccina, miei colori) e il cancello da browser
`scripts/verifica-pannelli-pagina.mjs`, al telefono e al computer: il link
calcolato (niente da copiare finché la pagina non c'è, poi il suo indirizzo),
la freccina solo dove il pannello porta, la pagina che nasce piena, «Sostienimi»
senza la scelta, niente che scorre di lato. Con `--selftest` rimette tre
difetti (freccina su ogni pannello, pagina che nasce vuota, link scritto a mano
anche con la pagina) e li vuole rossi.

### Il Markdown

Le descrizioni si scrivono in Markdown perché Twitch le legge così. Quello che
arriva da fuori (il nome di un social, una categoria) si scrive con i segni del
Markdown disattivati, e un link entra solo se è un indirizzo web: una parentesi
o uno spazio nell'indirizzo si codificano, così non rompono la riga.

### Scaricare

Ogni pannello si scarica da solo in PNG. «Scarica tutti» fa un file ZIP con
tutte le immagini, in ordine, e un `testi.txt` con titolo, link e descrizione
di ognuno, da copiare dentro Twitch. Lo ZIP lo scriviamo noi (`zip.js`): le
immagini sono già compresse, quindi si mettono dentro così come sono, con il
loro CRC-32. `test/unita/zip.test.mjs` lo fa leggere anche a un lettore che non
è il nostro.

### Dove sta

`src/web/public/pannelli.js` disegna e prepara i testi (`SB_PANNELLI`),
`src/web/public/zip.js` scrive lo ZIP, `src/features/pannelli.js` ripulisce
quello che si salva (`settings.pannelli`), sceglie i comandi pubblici e dice
quando una pagina si apre, `GET /api/streamer/pannelli` dà i dati del canale e
le pagine accese. Si caricano solo quando si apre la scheda.

