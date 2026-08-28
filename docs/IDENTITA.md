# L'identità di un overlay

> «Per ora sembra tutto fatto da IA, non va bene… non possiamo renderlo con lo
> stampino per tutti.»

Questo documento dice **perché** era con lo stampino — è una proprietà
strutturale, misurabile, non una questione di gusto — e cosa si è fatto.

## Il difetto, dimostrato

Un alert, oggi, è **un solo oggetto**. Il codice che lo costruisce è una riga:

```js
card.className = 'alert-card anim-' + animazione + (glow ? ' glow' : '') + …
card.innerHTML  = media + '<div class="alert-ico">…</div><div class="alert-testo">…</div>';
```

Sempre: media in alto, icona al centro, testo sotto. Sempre dentro un
rettangolo arrotondato con un bordo uniforme e un fondo a tinta piatta.

Quello che lo streamer può cambiare sono **valori dentro quella forma**:

| dimensione dell'identità | scelte oggi |
|---|---|
| colore | infinite ✓ |
| carattere | tutto Google Fonts ✓ |
| **forma** (la sagoma) | **1** |
| **composizione** (dove stanno le parti) | **1** |
| **materia** (com'è riempita la superficie) | **1** |
| **cornice** (cosa la delimita) | **1** |
| coreografia | 5 entrate, nessuna uscita |
| decoro | 0 |

Due streamer che scelgono colori diversi ottengono **lo stesso oggetto in un
altro colore**. Ecco l'origine dello stampino: non manca la personalizzazione,
manca la **varietà di forma**. Il colore è l'unica cosa che varia, e il colore
da solo non fa un'identità.

Vale identico per la chat a schermo e per i widget: una riga arrotondata e
basta, con `--bg/--op/--fg/--radius`.

## Cosa fa davvero la differenza (ricerca)

Nei pacchetti venduti dagli studi di grafica per streamer, le famiglie di stile
si chiamano per **forma**, non per colore: *Glitch Code Box*, *Pastel Dream*,
*Celebration Full Screen*. Il nome dice la sagoma e la materia.

Gli strumenti concorrenti danno da anni una leva che qui mancava: la
**composizione** — «testo sopra l'immagine, in riga, in colonna» — con margini
per element, entrata **e uscita** separate, e varianti per livello di sub o
soglia di bit.

E la personalità vera, quella che nessun preset può dare, viene da **materiale
dello streamer**: la sua cornice, la sua mascotte, il suo font.

Fonti: [Nerd or Die](https://nerdordie.com/resources/twitch-overlay-templates/) ·
[AnimArts, guida 2026](https://animarts.studio/blog/stream-overlay-design-guide) ·
[StreamElements, layout degli alert](https://support.streamelements.com/hc/en-us/articles/16789217829778-Setting-Up-Twitch-Alerts-with-StreamElements-Overlays) ·
[DexPixel, posizione del testo negli alert](https://support.dexpixel.com/knowledgebase/how-to-change-alert-text-position-in-streamlabs-and-streamelements/)

## Il modello

Un elemento dell'overlay è la composizione di **assi indipendenti**. È
l'indipendenza a togliere lo stampino: le combinazioni si **moltiplicano**, non
si sommano.

1. **Forma** — la sagoma. Non il raggio degli angoli: il profilo.
2. **Materia** — come è riempita la superficie.
3. **Cornice** — cosa la delimita.
4. **Composizione** — dove stanno media, icona, nome e testo l'uno rispetto
   all'altro.
5. **Voce** — i caratteri. *(c'era già)*
6. **Colore** — accento, fondo, testo. *(c'era già)*
7. **Coreografia** — come entra, come sta, come esce.
8. **Decoro** — quello che aggiunge lo streamer.

## Le scelte, per asse

Ogni voce è una classe CSS: nessun `<img>` da scaricare, niente peso in più
sull'overlay in diretta, e tutto funziona identico nell'anteprima dell'editor
perché è lo stesso foglio di stile.

**Forma** — `carta` (rettangolo arrotondato) · `pillola` · `squadrata` ·
`taglio` (un angolo tagliato) · `insegna` (estremità a freccia, da banner) ·
`esagono` · `nastro` (fascia con un lato inclinato) · `fumetto` (con la codina)

**Materia** — `piatta` · `sfumata` (gradiente verso l'accento) · `vetro`
(sfocatura e trasparenza) · `carta` (grana) · `neon` (corpo scuro, tubo
luminoso) · `crt` (righe di scansione) · `griglia` (reticolo tecnico)

**Cornice** — `nessuna` · `linea` · `spessa` · `angoli` (solo le squadre) ·
`barra` (una fascia su un lato solo)

**Composizione** (alert) — `colonna` (media sopra, testo sotto: com'era) ·
`riga` (media a sinistra, testo a destra) · `riga-invertita` ·
`sovrapposta` (testo sopra il media)

## Quante identità distinte

8 forme × 7 materie × 5 cornici × 4 composizioni = **1120 combinazioni**, prima
ancora di scegliere un colore o un carattere. Con i colori e i font l'incontro
fra due overlay identici smette di essere una cosa che può capitare.

## Come è fatto, in pratica

Gli assi sono **classi**, non proprietà sparse: `forma-esagono`,
`materia-neon`, `cornice-angoli`, `comp-riga`. Il motivo è che una sagoma non
si esprime con un valore — serve un `clip-path`, o uno pseudo-elemento, o
entrambi — e perché l'insieme delle scelte resta enumerabile e collaudabile:
il gate le rende tutte e verifica che nessuna produca un oggetto rotto.

Le stesse classi valgono per `.alert-card`, `.chat-riga` e `.ovl-widget`, così
un overlay è **coerente con sé stesso**: se scegli l'esagono al neon, tutto
l'overlay è esagonale al neon, non solo l'alert.

## I preset pronti diventano davvero diversi

Prima i cinque preset differivano per colore e raggio degli angoli. Adesso
ognuno prende una posizione su tutti gli assi — è la dimostrazione che il
modello funziona, e il punto di partenza per chi non vuole scegliere:

| preset | forma | materia | cornice | composizione |
|---|---|---|---|---|
| Viola classico | carta | sfumata | linea | colonna |
| Neon | insegna | neon | nessuna | riga |
| Minimal chiaro | squadrata | piatta | barra | riga |
| Retro arcade | squadrata | crt | spessa | colonna |
| Manga | fumetto | carta | linea | sovrapposta |
| Vetro | pillola | vetro | linea | riga |
| Terminale | taglio | griglia | angoli | riga |
| Nastro | nastro | sfumata | barra | riga |
| Esagoni | esagono | griglia | linea | colonna |

## Il collaudo

`t_identita.mjs` monta **ogni** valore di ogni asse nell'anteprima e verifica
che: l'oggetto abbia area non nulla, non sfori la tela, il testo resti dentro
la sagoma, e che due preset qualsiasi diano un risultato **visivamente
diverso** (differenza di pixel sopra una soglia). Un asse che non cambia niente
è un asse che non esiste, e il gate lo dice.

## Il vincolo che ha deciso l'impianto

Il primo tentativo disegnava la cornice con un bordo, e il bagliore con
un'ombra. Reso a schermo grande, il difetto era netto: **sulle forme tagliate
la cornice spariva lungo i lati diagonali** e restava solo sopra e sotto. Un
esagono con una riga in cima e una in fondo, e i fianchi nudi.

La causa è una regola del disegno nel browser: **`clip-path` si applica DOPO i
filtri e i bordi.** Qualunque cosa un elemento dipinga fuori dalla propria
scatola — un bordo, un'ombra, un contorno — viene poi tagliata via dalla sua
stessa sagoma. Provato con `box-shadow` interno: segue il rettangolo, non il
poligono. Provato con `drop-shadow`: viene generato e subito cancellato dal
taglio.

Non è un dettaglio da aggirare con un ritocco: è il motivo per cui **forma e
cornice non possono essere due cose che si dipingono a vicenda addosso**.

Quindi ogni elemento è **tre strati, tutti tagliati dalla stessa sagoma**:

```
::before   il profilo    — tinta d'accento, sagoma intera
::after    la materia    — rientrato di «spessore», stessa sagoma
> *        il contenuto  — icona, testo, immagine
```

La cornice non è più un bordo: è **quanto rientra il riempimento**. `nessuna` è
rientro zero — il profilo c'è ma non si vede. `linea` è un rientro di un bordo.
`spessa` di tre. `angoli` e `barra` sono lo stesso profilo con una **maschera**
che ne lascia vedere solo le squadre o una fascia.

Ne segue, per costruzione, che **nessuna combinazione può risultare rotta**: il
profilo non può contraddire la forma, perché è la forma.

E la coda del fumetto non è più uno pseudo-elemento appiccicato sotto: è dentro
il poligono della sagoma, come tutto il resto.

## Il collaudo, e i tre errori che ha trovato in sé stesso

`t_identita.mjs` monta ogni valore di ogni asse e verifica area, contenimento
del testo, non-sforamento della tela, e che l'aspetto **cambi davvero**.

Quest'ultimo controllo è passato per tre versioni, e le prime due erano
sbagliate:

1. **Confronto a pixel dello scatto.** Diceva che `griglia` era uguale a
   `piatta`. Falso allarme *e* difetto vero insieme: l'anteprima dell'editor è
   ridotta in scala, e una riga da un pixel al 16% lì sparisce davvero. La
   materia è stata rinforzata perché si legga anche in anteprima, ma il metodo
   di misura restava inaffidabile.
2. **Impronta dello stile calcolato dell'elemento.** Diceva che `fumetto` era
   uguale a `carta` e `angoli` a `nessuna` — perché quelle due disegnano con gli
   pseudo-elementi, che l'impronta non guardava.
3. **Impronta dell'elemento più `::before` più `::after`**, maschere e sagome
   comprese. Questa vede quello che c'è.

Il gate ha anche detto «la superficie non è dipinta» su mezza tabella quando il
riempimento è passato a `::after`: guardava ancora lo sfondo dell'elemento, che
adesso è trasparente per costruzione. Corretta la misura, non il prodotto.

## Il difetto che ha reso inutile tutto quanto

> «L'overlay non sembra salvarsi, in nessun modo, e poi non cambia il tema,
> colori, niente, solo la forma cambia.»

Il server **ricostruisce lo stile campo per campo**: prende l'oggetto che
arriva, ne estrae i campi che conosce e restituisce un oggetto nuovo. Un campo
che non è in quell'elenco **viene buttato via in silenzio** — nessun errore,
nessun log, il salvataggio «riesce» e la modifica sparisce al primo
ricaricamento.

I quattro assi nuovi non erano in quell'elenco. Li ho aggiunti al browser senza
verificare che il server li accettasse: è un difetto mio, e i collaudi non lo
hanno visto perché **giravano tutti dentro il browser**.

`scripts/verifica-stile.mjs` è il cancello che chiude la classe intera: legge
dai sorgenti i campi che il browser scrive e i campi che il server conserva, e
li mette a confronto. Confronta anche gli elenchi dei valori ammessi, e che
ogni valore abbia una regola nel foglio di stile servito. Provato a togliere un
campo dal server: il cancello lo dice.

```
alert  browser 15 campi · server 15 campi  ✓
chat   browser 15 campi · server 15 campi  ✓
```

## Due nomi uguali per due cose diverse

Nell'anteprima le righe di chat uscivano come **barre colorate senza testo**.

Due difetti sovrapposti:

1. Gli strati `::before`/`::after` stavano **davanti** al testo. Nell'alert non
   si vedeva, perché lì il contenuto è tutto dentro dei `<div>`; nella chat il
   messaggio è un **nodo di testo nudo**, che non si può sollevare con
   `z-index`. Risolto mandando gli strati dietro (`z-index: -1`) e facendo
   dell'elemento un contesto di impilamento (`isolation: isolate`): così il
   contenuto sta sopra **per costruzione**, qualunque cosa sia.

2. `--border` nello skin dell'overlay era uno **spessore**; nella dashboard è un
   **colore**. Nell'overlay vero non si vedeva — quel nome lì non esiste. Ma
   l'anteprima vive dentro la dashboard, e la chat, che non lo imposta, si
   ritrovava `--spessore: #e5ded1`. Rinominato in `--bordo-px`: un nome che dice
   cosa contiene e che non può collidere con i colori del tema.

## L'anteprima si guarda mentre si lavora

Due cambiamenti, una ragione sola: **non si modifica quello che non si vede.**

**I comandi dell'aspetto sono nel pannello.** Stavano nelle carte sotto la tela:
per cambiare un colore bisognava scorrere finché la tela usciva dallo schermo, e
poi si modificava alla cieca. Adesso `montaBanco()` li **sposta fisicamente**
dentro il pannello «Proprietà» — non copie, gli stessi nodi — e l'ispettore
mostra il blocco dell'elemento selezionato. Le carte sotto tengono quello che un
elemento **dice e fa** (i testi degli alert, i suoni, le posizioni); il pannello
tiene come **appare**.

**L'anteprima dal vivo.** Un interruttore «Dal vivo» nella barra fa arrivare
messaggi in chat ogni due secondi, fa partire un alert diverso ogni sette, e
cambia i nomi nei widget. Serve a capire dove mettere le cose **vedendole in
uso**: una chat ferma su due righe non dice se il blocco cresce sopra la webcam.

Vive solo nello studio: il motore sta in `app.js`, che l'overlay di OBS non
carica. Il collaudo lo verifica aprendo davvero la pagina dell'overlay e
controllando che di quel motore non ci sia traccia.
