<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# L'archivio dei media degli effetti

Chiesto così: «per evitare che diventi pesante a livello di archiviazione
assegniamo dei codici univoci a tutti gli effetti (se non condivisi, il codice
deve essere preceduto dal nome dello streamer)», e «un layer di crittografia
agli effetti privati: se qualcuno cercasse di rubarli e dovesse arrivare
all'archivio, che non possa usarli in semplicità».

## Cos'era

Ogni canale aveva la sua cartella (`data/effects/<canale>/`) con i file dei
suoi effetti, in chiaro. Prendere un effetto dalla libreria condivisa **copiava**
il file: dieci canali con lo stesso effetto erano dieci copie. Chi arrivava al
disco (o a un backup della cartella) aveva tutto, pronto da usare.

## Il modello

**Un file per contenuto.** Il nome di un file è `a_<impronta>.<estensione>`.
L'impronta è il segno del server (`segreti.segno('archivio', …)`) sullo sha256
del contenuto: lo stesso contenuto ha sempre lo stesso nome, quindi è un file
solo, chiunque lo usi; e chi ha il disco ma non il segreto del server non può
nemmeno controllare se c'è un file che conosce.

**Cifrato sul disco** (`src/features/archivio.js`). Ogni file ha una chiave
sua, casuale, chiusa con la maestra di adesso (`segreti.chiudiChiave`, legata
al nome: spostata su un altro file non si apre; le maestre ruotano con
l'anello di `docs/SEGRETI.md`). Il contenuto è a blocchi da 64 KB, AES-256-GCM,
col nonce fatto della base del file e del numero del blocco, e nei dati
autenticati il numero del blocco e se è l'ultimo:

- un video si serve **a pezzi** (Range HTTP, i salti del lettore) leggendo solo
  i blocchi che servono, e ogni pezzo è verificato;
- un blocco cambiato, spostato o tolto non si apre, e un file troncato nemmeno
  (l'ultimo blocco dice di esserlo, anche se è vuoto);
- mai lo stesso nonce due volte con la stessa chiave.

Formato: `"SBA1" | chiave chiusa (62) | base del nonce (8) | byte in chiaro (8)`,
poi per ogni blocco `testo cifrato | sigillo (16)`.

**Un posto solo** (`src/features/media-effetti.js`): tutto quello che tocca un
file di un effetto passa da lì.

- `entra`: un file appena compresso entra nell'archivio e nel registro
  (`db.archivioDb`: nome, byte, quando); la riga scrive il nome dell'archivio.
- `servi`: un file dell'archivio si serve **solo al canale che lo usa** (una sua
  riga lo richiama): il nome da solo non apre niente. Overlay, pagina dei colpi,
  negozio, libreria: la stessa strada.
- `libera`: un file se ne va solo quando **nessuna riga, di nessun canale**, lo
  usa più. Togliere un effetto a un canale non lo toglie a chi l'ha preso.
- `migra`: i file di prima (un nome qualunque nella cartella del canale)
  passano all'archivio un po' alla volta, dopo l'avvio. Si copia, si archivia,
  si aggiorna la riga **solo se è ancora quella di prima**, e solo allora il
  vecchio se ne va. Fino ad allora si serve come prima.
- `pulisci`: ogni sei ore, i file del registro che nessuno usa (una
  sostituzione interrotta, una migrazione ripetuta).

**Prendere è richiamare.** Prendere un effetto dalla libreria
(`importaEffetto`) non copia niente: la nuova riga richiama gli stessi file. Se
l'autore domani lo toglie o lo rende privato, chi l'ha preso lo tiene (il file
resta, perché lo usa).

**Lo spazio** di un canale conta la sua cartella più i file dell'archivio che
usa, ognuno una volta (`archivioDb.byteDi`).

## I codici

Ogni effetto ha una **sigla** sua per sempre (6 caratteri senza ambigui, unica
fra tutti i canali); il **codice** che si legge è `sb-<sigla>` se l'effetto è
condiviso, `<canale>-<sigla>` se no (`codiceEffetto`). Ricaricare un effetto
non cambia la sigla. Nella libreria ogni carta mostra il suo codice (si copia
con un tocco), e «Hai un codice?» aggiunge un effetto alla propria libreria:
uno `sb-` lo prende chiunque, uno col nome di un canale lo trova solo quel
canale (`effects.byCodice`). Un privato non si apre facendolo passare per
condiviso.

Sul disco i nomi non dicono di chi sono: l'appartenenza sta nel database, il
codice anche.

## La firma

Chiesto: chi arrivasse a un effetto privato per rubarlo deve trovarci sopra
una firma dello streamer, visibile e difficile da togliere. Scelto: la firma
si vede **fuori dalla diretta**; nell'overlay l'effetto resta pulito
(`src/features/firma-media.js`).

- Le porte pubbliche (l'anteprima sulla pagina dei colpi, l'immagine di un
  articolo del negozio) passano `firmato` a `mediaEffetti.servi`. Un file che
  nessun effetto condiviso usa (`archivioDb.condiviso`) esce firmato; un
  condiviso e' gia' di tutti e esce com'e'. L'overlay e la libreria non
  passano `firmato`.
- Immagini e video: «© <streamer> · socialbot.live» ripetuto in diagonale su
  tutto il quadro, piu' un bollino nell'angolo. Ritagliare un bordo non la
  toglie. Le misure restano quelle dell'originale (la pagina misura
  l'anteprima per l'ombra della mira); un video trasparente resta trasparente
  (VP9 con alfa).
- Audio: un segno udibile ogni tre secondi.
- Quello che ffmpeg non sa riscrivere (un WebP animato, un AVIF) non esce mai
  in chiaro: esce una tessera firmata grande come l'originale. Se la firma non
  riesce del tutto, la porta risponde 404.
- La copia firmata si fa alla prima richiesta, una sola anche con tante
  richieste insieme, e resta in `archivio-firmati/<canale>/`, col nome che
  dipende dal file e dal testo: un nome nuovo dello streamer fa una copia nuova.
  Cancellare l'account toglie la sua cartella, e con lei le copie
  (`cartelleDiCanale`). Le copie vecchie di
  trenta giorni se ne vanno e si rifanno alla prossima richiesta.
- Il permesso viene prima della firma: un altro canale non prende il file
  nemmeno firmato.

Limiti: nell'overlay il file esce in chiaro (e' quello che va in onda); un
file di prima della migrazione si firma lo stesso, dalla cartella del canale.

## Collaudo

- `test/unita/archivio.test.mjs`: un file per contenuto, niente in chiaro, i
  pezzi a cavallo dei blocchi, i blocchi cambiati/spostati/tolti, le chiavi
  d'altri, il segreto mancante, i Range, i nonce mai ripetuti.
- `test/unita/media-effetti.test.mjs`: il permesso di servire, prendere senza
  copiare, liberare quando nessuno usa, la migrazione che rispetta la riga, lo
  spazio, i codici; la porta pubblica che non esce mai in chiaro.
- `test/unita/firma-media.test.mjs`: la firma su immagini, video trasparenti e
  audio, con ffmpeg vero; la tessera; una copia sola; privati firmati,
  condivisi e overlay puliti.
- `test/contratto/archivio.test.mjs`: ogni rotta che serve, fa entrare o libera
  un file di un effetto passa da `mediaEffetti`, e le porte pubbliche firmano.
- Un video dell'archivio, in Chromium: parte, avanza, salta (Range).
