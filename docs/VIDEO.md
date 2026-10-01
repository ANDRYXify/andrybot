<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# I video tutorial

Chiesto così: «dei mini video tutorial su tutto da pubblicare su YouTube e TikTok: orizzontali con
la vista computer e telefono, verticali col solo telefono. Il più naturali possibile, senza voce:
la musica la metto io».

## Il modello

**Un video non si registra: si rigenera.** Ogni tutorial è un elenco di passi scritto come dati
(`scripts/video/scene.mjs`): vai in questa scheda, clicca qui, scrivi questo, scorri fin lì, una
didascalia. Uno script (`scripts/video/regia.mjs`) apre il pannello demo vero in un browser, fa i
passi e registra. Quando una scheda cambia, il video si rifà da capo con un comando e mostra il
prodotto com'è adesso: un tutorial che mostra un pulsante che non c'è più non può esistere.

**La regia è una pagina**, nello stile del sito: la carta col retino, le didascalie a pennarello.
Dentro ci sono due finestre sul pannello demo, che è lo stesso sito che gira davvero:

| formato | misura | cosa si vede |
|---|---|---|
| orizzontale | 1920×1080 | il computer (1440×900) e accanto il telefono (390×844), che fanno la stessa cosa insieme |
| verticale | 1080×1920 | solo il telefono, grande, con le didascalie sopra |

**Naturale vuol dire come una mano**, non come un robot:

- il cursore va al punto con una curva e rallenta arrivando, poi clicca (sul telefono, un tocco
  che si allarga);
- si scrive una lettera per volta, con un ritmo che cambia un po' da lettera a lettera;
- si scorre in modo morbido, e ci si ferma un attimo a guardare quello che è cambiato;
- le pause sono quelle di chi legge: più lunghe dopo un cambiamento grande.

Le variazioni (il ritmo delle lettere, la curva del cursore) vengono da un hash del passo, non dal
caso: lo stesso tutorial esce uguale ogni volta.

**Niente voce, le didascalie parlano.** Una riga breve per passo, nello stile del sito, che dice
cosa si sta facendo e perché («Il nome che vede la chat»). In apertura il titolo, in chiusura
l'indirizzo del sito. Niente musica: la mette lo streamer.

**Quello che non si vede.** Il banner della demo, l'avviso dei cookie e il giro guidato non entrano
nei video: sono cose della demo, non del prodotto.

## L'uscita

MP4 H.264, 30 fotogrammi al secondo, senza traccia audio, pronti da caricare:
`video/<tutorial>-orizzontale.mp4` e `video/<tutorial>-verticale.mp4`. I fotogrammi si prendono
dal browser uno per uno (screencast), e ffmpeg li mette in fila al ritmo giusto: il testo resta
nitido.

## Il piano

1. La regia, il cursore, la scrittura e lo scorrimento; tre tutorial pilota, da guardare insieme
   prima di fare gli altri.
2. Poi uno per scheda del pannello, dai più usati: pagina link, negozio, giochi e monete, overlay,
   comandi, moderazione, Discord, Telegram, grafiche social.
