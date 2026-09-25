# Gli effetti a tutto schermo

Chiesto così: «sarebbe carino inserire anche "effetti" a tutto schermo,
attivabili che bypassano l'overlay studio (dove l'overlay ha comunque gli
effetti a schermo attivi ovviamente) tramite la sezione apposita». E poi:
«magari lo streamer inserisce un effetto con un video trasparente e ha piacere
di metterlo a tutto schermo, deve poterlo fare (video, immagine, gif, tiff,
insomma, quello che è), ma anche effetti nuovi già pronti disegnati da noi».

Due cose, quindi: **qualunque media può andare a tutto schermo**, e ci sono
**effetti disegnati da noi** che nascono a tutto schermo.

## Il modello

Un effetto è un **comando** del canale (la tabella degli effetti) che fa
partire qualcosa nell'overlay. Il comando è l'unico nome dell'effetto: chat,
premi a punti canale, moduli, gesti della webcam, livelli e tasti lo chiamano
per nome, e quindi un effetto nuovo funziona in tutti questi posti senza che
nessuno di loro lo sappia. Quello che parte può essere:

- un **media caricato**: immagine, video o audio (com'era);
- un **disegno**: un effetto disegnato dall'overlay, senza file.

I media caricati sono anche **la libreria** (alert, grafiche, premi, meme
pescano da lì). Un disegno non è un media: la libreria, per costruzione, è
fatta solo di righe con un file (`TIPI_MEDIA` in `db.js`), e quindi un
disegno non si condivide, non si importa e non compare fra i media.

### Dove appare un effetto visivo

È una proprietà dell'effetto (colonna `schermo`), non del modo in cui parte:

| `schermo` | dove | come si adatta |
|---|---|---|
| `''` | nella scena: l'area degli effetti dello Studio, o il suo posto libero | com'era |
| `riempi` | tutto lo schermo | copre tutto, taglia i bordi che avanzano (`object-fit: cover`) |
| `intero` | tutto lo schermo | si vede tutto, ai lati resta trasparente (`object-fit: contain`) |

Mai stirato: un media deformato è un difetto, non un'opzione.

Un effetto a tutto schermo **non ha posizione**: il server non la mette nel
messaggio (`payload`), e un premio a punti canale che ne sceglie una per sé
non la sovrascrive. L'overlay non riceve mai le due cose insieme, quindi non
deve scegliere.

Nell'overlay il tutto schermo ha il suo contenitore, `#palco-schermo`, grande
quanto la finestra e con `data-el="effetti"`: sta al livello degli effetti
nell'ordine dei livelli (docs/OVERLAY.md), e c'è solo dove l'overlay mostra
gli effetti. Lo Studio non lo disegna: l'area degli effetti resta quella dei
media nella scena.

I media visivi passano tutti dalla stessa coda: uno alla volta, a tutto
schermo o no, disegni compresi.

## I file: quello che è

La compressione dei caricamenti (`compress.js`) prima di questo lavoro, provata
con ffmpeg su un cerchio opaco in un fondo trasparente:

| file | com'era | perché |
|---|---|---|
| WebM VP9 trasparente | **fondo nero** | il decodificatore di ffmpeg per VP9 ignora il canale alfa: lo legge solo libvpx |
| MOV ProRes 4444 trasparente | trasparente | |
| GIF trasparente | trasparente | |
| PNG, TIFF trasparenti | trasparenti | |
| PNG animato (APNG) | **un fotogramma solo** | trattato da immagine ferma |
| WebP animato | **errore incomprensibile** | ffmpeg (fino alla 7) non legge i WebP animati |

Da qui:

- prima di comprimere, ffmpeg **guarda il file** (`sonda`): il codec del video
  e se dichiara un canale alfa. Un VP8/VP9 con `alpha_mode: 1` si legge con
  libvpx, così la trasparenza arriva al WebM che va in onda;
- un APNG va per la strada dei video, come le GIF;
- un WebP animato si tiene com'è (è già compresso, e un `<img>` lo anima da
  solo), dopo averne controllato l'intestazione;
- le immagini degli effetti si tengono fino a **1920 pixel** di lato invece di
  800: un effetto può andare a tutto schermo anche dopo, e un'immagine
  rimpicciolita non si ingrandisce più. Le immagini delle donazioni restano a
  800;
- se ffmpeg non sa leggere un file, l'errore lo dice con parole sue e dice
  quali formati vanno.

Il pannello avvisa quando un media già caricato, a tutto schermo, si
ingrandirebbe più di una volta e mezza: si vedrebbe sgranato, e si può
ricaricare dall'originale.

### Ogni video trasparente

Chiesto così: «inseriamo anche il supporto ad ogni formato video trasparente».

Il server usava l'ffmpeg di Debian 12, la 5.1, che non legge l'HEVC
trasparente (quello che esportano iPhone, Final Cut e Motion): il livello alfa
dell'HEVC lo decodifica ffmpeg dalla 8. Il Dockerfile ora prende ffmpeg e
ffprobe 9.0.2 statici da static-ffmpeg, **fissati per impronta**: lo stesso
file, byte per byte, su cui sono state fatte le prove qui sotto (scaricato dal
registro con l'impronta controllata). Il build ha tutto quello che il bot già
usava altrove: x264 e AAC per lo Studio in diretta, ebur128 per l'ascolto, opus,
webp, rtmp.

Provando ogni formato con ffmpeg 9 sono venuti fuori due difetti, e nessuno dei
due si vedeva guardando solo se il video «ha l'alfa dentro»:

1. **Il codificatore VP9 si sceglieva il formato dei pixel da solo** e prendeva
   un 4:4:4 a 12 bit (quello del ProRes), che poi rifiutava: ProRes, GIF,
   APNG, PNG in MOV, Animation e Ut Video fallivano tutti. Ora la scelta è
   esplicita, `format=pix_fmts=yuva420p|yuv420p`, e la fa il grafo dei filtri
   guardando i fotogrammi veri: con l'alfa solo se l'alfa c'è. Un video opaco
   resta opaco (un'alfa inutile raddoppierebbe il lavoro di OBS).
2. **I metadati d'origine cancellavano il segno della trasparenza.** Il tag
   `alpha_mode` copiato dal WebM d'ingresso toglieva all'uscita l'elemento
   AlphaMode, che è quello che Chrome e OBS leggono per sapere che il video è
   trasparente: dentro l'alfa c'era, in onda sarebbe uscito nero. Ogni uscita
   ora parte senza i metadati del file (`-map_metadata -1`), e dai media
   caricati spariscono anche posizione, dispositivo e autore.

E una regola che vale per costruzione, qualunque ffmpeg ci sia: **se il file
dichiara la trasparenza, anche quello che va in onda ce l'ha**, letto con la
stessa sonda (l'AlphaMode del WebM d'uscita). Se no il caricamento si ferma e
dice come esportarlo, invece di mettere in onda un riquadro nero.

| formato trasparente | come arriva in onda |
|---|---|
| WebM e MKV, VP8 o VP9 con l'alfa | WebM trasparente |
| MOV ProRes 4444, Animation (QuickTime RLE), PNG in MOV | WebM trasparente |
| MOV e MP4 HEVC con l'alfa (iPhone, Final Cut, Motion) | WebM trasparente, con ffmpeg 9* |
| AVI Ut Video, MKV FFV1 | WebM trasparente |
| GIF, APNG | WebM trasparente |
| WebP animato, AVIF (fermo o animato) | tenuto com'è, lo mostra il browser |
| PNG, TIFF, WebP fermi | WebP trasparente |

Tutti provati con ffmpeg 9.0.2: il file uscito, caricato in Chromium (lo
stesso motore di OBS), ha l'angolo trasparente e il soggetto pieno.
\* L'HEVC trasparente non si può fabbricare qui (nessun x265 disponibile sa
scriverlo): il decodificatore è nella libreria di ffmpeg 9, e se l'alfa si
perdesse lo direbbe la regola qui sopra.

Un file che il browser non sa nominare (arriva come
`application/octet-stream`) si riconosce da quello che c'è dentro: si muove, è
un video; un fotogramma solo, un'immagine; solo suono, un audio.

## I disegni

Otto effetti: **coriandoli, fuochi d'artificio, cuori, neve, palloncini,
bolle, stelle, lampo**. Ognuno ha i suoi colori (fino a cinque), quanti
(pochi, normale, tanti; il lampo no), la durata e, se vuoi, un suono: uno dei
suoni pronti o uno dei tuoi.

Stanno in `disegnati.js`, lo stesso file nell'overlay e nel pannello (come il
muro): l'anteprima nel pannello è l'effetto vero, non una sua imitazione.

Ogni disegno è una **funzione pura del tempo**: da un seme e dai parametri,
ogni particella ha la sua nascita, la sua vita e la sua posizione in ogni
istante, calcolate e non accumulate fotogramma per fotogramma. Ne segue:

- lo stesso seme dà lo stesso disegno (si prova senza browser);
- ogni particella **finisce entro la durata**, per costruzione: la vita si
  sceglie prima della nascita, e la nascita cade in `[0, durata - vita]`. Per
  quello che sale (cuori, palloncini, bolle) il moto è deciso da noi: dove
  chiederebbe più tempo della durata scelta, si alza la velocità, non si taglia
  il volo;
- **nessuna particella compare o sparisce di colpo**: nasce fuori dallo
  schermo o trasparente, e finisce fuori dallo schermo o trasparente. Le sole
  eccezioni sono di costruzione: il razzo finisce dove nasce il suo scoppio, e
  le scintille nascono lì. Il test (`test/unita/disegnati.test.mjs`) lo prova
  per ogni pezzo, con ogni quantità, durate agli estremi, tre schermi e molti
  semi;
- tutto è in frazioni dello schermo, quindi l'anteprima piccola e la diretta a
  1920×1080 sono lo stesso disegno in scala.

Il lampo è uno solo per effetto: più lampi di fila in un secondo possono far
male a chi soffre di epilessia fotosensibile, e l'overlay non li fa.

Quello che cade segue la fisica, e la fisica non si accorcia: neve e
coriandoli smettono di arrivare, e quelli ancora in aria si sciolgono alla fine
(la neve nell'ultimo secondo e mezzo, i coriandoli nell'ultimo mezzo secondo).

### Come sono fatti

- **Coriandoli**: due cannoni negli angoli in basso. Ogni pezzo parte veloce e
  rallenta nell'aria (attrito lineare, in forma chiusa), poi scende alla sua
  velocità limite, da carta, ondeggiando e girando su se stesso: un rettangolo
  che si schiaccia mostra il dritto e il rovescio, più scuro.
- **Fuochi d'artificio**: razzi che salgono rallentando e scoppiano. Le
  scintille partono da una sfera: la loro velocità sullo schermo è quella della
  sfera vista di fronte, e quindi lo scoppio è un disco pieno col bordo più
  fitto, come quelli veri, non un anello. Un terzo degli scoppi è a due colori.
- **Cuori, palloncini, bolle**: salgono ondeggiando; i cuori battono piano e si
  dissolvono in alto, i palloncini escono dallo schermo col filo, le bolle
  scoppiano in un anello con sei gocce.
- **Neve**: fiocchi a profondità diverse, più grandi e più veloci i vicini, con
  un alone; i più vicini sono cristalli a sei punte.
- **Stelle**: scintillii a quattro punte che si accendono e si spengono, e
  qualche stella cadente.
- **Lampo**: uno, che sale in sessanta millesimi e si spegne entro la durata.

## Chi fa cosa

- `compress.js`: la sonda, l'alfa di VP8/VP9, APNG, WebP animato, il lato
  delle immagini per chi lo chiede.
- `db.js`: colonne `schermo` e `disegno`, `TIPI_MEDIA` per la libreria,
  `setSchermo`, `addDisegno`.
- `stile.js`: `DISEGNI` (nomi e valori di serie) e `normDisegno`, lo stesso
  catalogo di `disegnati.js` (un test li tiene uguali).
- `effects.js`: nel messaggio all'overlay `schermo` per i media, e per un
  disegno i suoi parametri e il suo suono.
- `server.js`: crea e modifica un disegno, cambia dove appare un media.
- `overlay-app.js` e `overlay.html`: `#palco-schermo`, i media a tutto
  schermo, i disegni in coda con gli altri.
- `app.js`: «Dove appare» al caricamento e nella lista, gli effetti pronti con
  l'anteprima, i premi a punti canale che sanno cosa è a tutto schermo.
