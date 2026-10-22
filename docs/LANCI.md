<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# I lanci e gli adesivi

Chiesto così: «riusciamo a prendere qualche effetto ben fatto? magari simile a
quelli che sono già su viewer attack (quello tipo con l'icona del pomodoro),
prendiamo spunto da quello, inseriamo le varie librerie e una condivisa […]
vediamo se riusciamo a metterne una già cicciotta ma con cose non da IA». Poi:
«mi farebbe piacere tu li cercassi già fatti, creati da te fanno molto "AI
SLOP"», e: «un po' di tutto, prendi spunto da viewer attack […] video con
green screen dentro, jumpscare, insomma, cose per smuovere la live o strappare
un sorriso (ricorda di lasciare la possibilità di caricare video/gif con anche
audio custom […]), inserisci anche la possibilità di una libreria condivisa».

Viewer Attack fa due cose: **oggetti da tirare** contro la diretta e **oggetti
animati che compaiono** col loro suono; in più, i media caricati dallo
streamer. Qui sono la stessa cosa vista da tre parti:

- i **lanci**: un oggetto arriva da chi guarda, colpisce un punto e lascia il
  segno;
- gli **adesivi**: un'animazione compare nel punto e fa la sua scena (gli
  **spaventi** sono adesivi grandi, che partono già dalla faccia che urla, con
  un lampo bianco e l'urlo: l'overlay sta sopra la diretta e non può muoverla,
  quindi niente schermo che trema);
- i **media del canale**: immagini, GIF e video caricati dallo streamer, col
  loro audio e, per i video, lo scontorno del verde; si condividono con gli
  altri nella libreria condivisa.

## Niente disegnato da noi

Ogni immagine, animazione e suono viene da un artista, con una licenza che
lascia usarlo in un prodotto. Il codice muove, scala, ruota, tinge e mette in
fila quei pezzi: non disegna macchie, scintille o crepe sue.

| Cosa | Da dove | Licenza |
|---|---|---|
| gli oggetti dei lanci (3D) | Fluent Emoji di Microsoft | MIT |
| gli adesivi, lo scoppio 💥, lo splash 💧, la coriandolata 🎊 | Noto Emoji Animation di Google (Lottie) | CC BY 4.0: va citata |
| le macchie | Splat Pack di Kenney | CC0 |
| esplosione, lampo, fumo, sbuffi, puzzetta | Smoke Particles di Kenney | CC0 |
| bruciatura, fulmine | Particle Pack di Kenney | CC0 |
| i tonfi | Impact Sounds di Kenney | CC0 |
| spiaccicato, pop | «Squish Sounds Effects» di EZduzziteh (OpenGameArt) | CC0 |
| esplosioni | «Explosions» di EZduzziteh (OpenGameArt) | CC0 |
| urla | «Female high-pitched scream SFX» di WuxiaScrub (OpenGameArt) | CC0 |
| il lettore delle animazioni | lottie-web (Airbnb) | MIT |

Tutto sta in `public/vendor/` (il codice e le opere di altri, escluse dalla
firma), con il testo delle licenze accanto. I crediti per Noto (CC BY) si
leggono nel pannello, dove si scelgono.

## Il modello

Il catalogo (`src/features/lanci.js`) è l'unica fonte: ogni voce ha una
libreria, il nome nelle tre lingue, un **materiale** e i pezzi che usa. Il
server risolve tutto nel payload; l'overlay (`public/lanci.js`) esegue.

La misura sta nel file: il disegno di ogni voce (per gli adesivi, un
fotogramma della sua animazione) è salvato grande quanto si vede in un quadro
1920×1080 a grandezza 100. La pagina dei colpi ci misura l'ombra, e l'overlay
lo mostra a quella misura: le due cose coincidono per costruzione.

| Materiale | Cosa succede | Pezzi |
|---|---|---|
| `spiaccica` | l'oggetto si rompe nei suoi cocci e resta una macchia, che dopo un po' scivola e sfuma | Kenney splat (tinta) + i cocci ritagliati dal disegno |
| `spruzza` | si apre in uno splash d'acqua | Noto 💧, dallo schizzo in poi |
| `rimbalza` | 💥 dietro l'oggetto, che rimbalza e cade | Noto 💥 + sbuffo Kenney |
| `esplode` | esplosione, fumo nero, bruciatura | Kenney Explosion + Black smoke + scorch |
| `fulmina` | lampo e fulmini | Kenney Flash + spark |
| `scoppia` | l'oggetto scoppia in tanti pezzi | Noto 🎊 o pezzetti presi dai disegni Fluent |
| `stampa` | si attacca allo schermo come un timbro | il disegno |
| `appare` | l'animazione compare nel punto e fa la sua scena | Noto Lottie |

Il volo è uguale per tutti i lanci: da sotto il bordo (dalla parte di chi
guarda), grande come se fosse vicino, verso il punto con un arco e un giro,
finché arriva grande come il suo file col centro nel punto. Da lì il colpo è
«visto» (docs/COLPI.md). Un adesivo è «visto» quando compare.

Il caso (un seme dall'id del colpo) sceglie quale macchia e quanto ruota: serve
a variare, mai a decidere se una cosa è giusta. Il centro è il punto, sempre.

## Il green screen dei media

Un video caricato può avere il suo **verde da togliere** (colore e soglia),
salvato sull'effetto: vale dalla chat, dai premi, dagli eventi e dalla pagina
dei colpi. Prima esisteva solo nelle opzioni di un premio a punti canale.

## L'audio dello streamer

Ogni lancio o adesivo può suonare quello di serie, niente, o **uno dei suoni
caricati dallo streamer** (`audio` nei parametri: il comando di un effetto
audio del canale, risolto dal server nel suo indirizzo; uno che non c'è più
lascia quello di serie). Per i media caricati resta la «combo»: un suono
abbinato a un'immagine, a una GIF o a un video.

## Dove si sceglie

- **Effetti e suoni → Lanci, adesivi e spaventi**: «Scegli» apre le librerie;
  toccando una voce la si vede all'opera, «Prendila» la fa diventare un
  effetto. Nell'elenco un lancio ha la sua miniatura, la **raffica** (da uno a
  cinque) e il **suono**; un video ha il suo **green screen** (spunta, colore,
  quanto largo).
- **Colpi degli spettatori → Il listino**: «Lanci e adesivi», «Un tuo
  effetto», «Dalla libreria condivisa». Prendere due volte la stessa voce riusa
  l'effetto che c'è già.
- **Premi a punti canale**: i lanci stanno con le immagini e i video.

Il catalogo è pubblico (`GET /api/lanci`, `catalogoPubblico()`): è il
prodotto, senza dati di nessuno, e la demo lo legge da lì. Ogni voce porta il
suo payload completo, quindi l'anteprima del pannello anima esattamente quello
che vedrà l'overlay.

## Come si rifanno i materiali

Uno strumento usa e getta, descritto qui per poterlo rifare uguale:

- Fluent: i PNG 256×256 (`assets/<Nome>/3D/<nome>_3d.png`), ritagliati
  sull'alfa e scalati perché il lato lungo sia `lato`, in WebP 0,9.
- Noto: `fonts.gstatic.com/s/e/notoemoji/latest/<codice>/lottie.json`, così
  com'è; la miniatura è il fotogramma della `posa`, reso a `lato` px.
- Kenney: le macchie a 256 px, i fumi e la bruciatura scalati a 256 px.
- I suoni: tagliati (le urla dal file unico di WuxiaScrub), portati a -1 dBFS
  di picco, Ogg Vorbis mono.

## Collaudo

- `test/unita/lanci.test.mjs`: ogni voce è completa; ogni disegno c'è ed è
  grande quanto il suo `lato` (letto dall'intestazione del WebP); ogni pezzo
  che il payload nomina esiste, e il tratto di ogni impatto sta dentro la sua
  animazione; in `vendor/lanci` non c'è niente che il catalogo non conosca, e
  ogni fonte è nelle licenze; il suono caricato e il green screen del video
  arrivano nel payload.
- `scripts/verifica-colpi.mjs`: un lancio mirato dalla pagina arriva
  nell'overlay col centro nel punto, grande quanto l'ombra della pagina, e il
  «visto» parte all'impatto; un adesivo animato compare col centro nel punto,
  grande quanto il suo disegno, e dice «visto» appena compare.
