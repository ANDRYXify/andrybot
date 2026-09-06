# La carta della diretta

L'immagine che annuncia «sono live», mandata su Telegram come **foto** e non come
anteprima del link. L'anteprima la disegna la piattaforma ed è uguale per tutti;
questa è dello streamer: il suo nome, la sua faccia, i suoi colori.

## Perché è fatta di dati e non di disegno

La strada corta era scrivere due SVG a mano, uno per Twitch e uno per Kick, coi
buchi da riempire. Sarebbe stata più veloce oggi e un vicolo cieco domani: un
disegno scritto a mano non si **edita**, si riscrive — e l'editor è la cosa che
viene dopo.

Quindi una carta è un **fondo** più un **elenco di elementi**, ognuno con la sua
posizione, la sua misura e il suo stile. I due temi standard sono due
preselezioni di quegli stessi dati, non due casi speciali del codice: quello che
l'editor cambierà è esattamente ciò che il disegnatore legge.

I tipi sono pochi di proposito — testo, targhetta, avatar, riga, striscia — e
ognuno è una cosa che una persona sa afferrare e spostare. Un tipo «forma
libera» avrebbe reso l'editor un editor di SVG, cioè inutilizzabile.

## I due temi, e perché sono diversi davvero

Le due marche stanno esattamente sopra due luoghi comuni: viola su nero e verde
acido su nero. Se la differenza fosse solo il colore, sarebbero lo stesso
disegno ricolorato. Quindi la differenza sta nella **tradizione visiva**.

**Twitch — notte viola.** Il viola è *luce*, non vernice: un alone dietro la
faccia, non un rettangolo pieno. Cerchio, grottesca larga, angoli morbidi. Colori
della marca: `#9146FF`, `#772CE8`.

**Kick — taglio verde.** Nero pieno e un taglio. Nessun arrotondamento, carattere
condensato da manifesto, e il verde `#53FC18` usato **una volta sola** come
segnale — mai come fascione. L'avatar è quadrato con l'angolo tagliato: geometria
opposta a Twitch, di proposito.

Il collaudo pretende che restino diverse: forma dell'avatar e voce tipografica
non possono coincidere fra i due temi.

## Due inganni che costano cari

Tutti e due danno lo **stesso sintomo — nessun errore** — e si vedono solo
guardando l'immagine.

1. **I `.woff2` del sito qui non funzionano.** Il rasterizzatore li accetta senza
   protestare e rende un'immagine **vuota**. Servono i TTF.
2. **`font-weight` alto su un carattere variabile viene ignorato.** Il testo esce
   nel peso di default e sembra soltanto «un po' magro». Perciò i pesi sono
   **famiglie diverse** (Archivo, Archivo Black, Anton), mai un numero su una
   famiglia sola.

## Come si verifica

`test/contratto/carta-live.test.mjs` non legge il codice: **rende l'immagine e
la guarda**. La misura non fa supposizioni sul fondo — contare «i pixel diversi
dal colore di sfondo» non funziona, perché il fondo è una sfumatura e quasi ogni
pixel è diverso da quello prima. Invece si toglie una cosa dalla carta e si conta
**quanto cambia l'immagine**: se togliendo tutti i testi cambiano meno di
quattromila pixel, il carattere non stava disegnando.

Provato mettendo un `.woff2` al posto dei TTF: diventa rosso.

## I caratteri

Viaggiano con noi in `assets/font`, con le loro licenze (tutte OFL):

- **Anton** — condensato, da manifesto. Il nome su Kick e la sua targhetta.
- **Archivo Black** — grottesca nera. Il nome su Twitch.
- **Archivo** — la voce normale, per titolo, categoria e indirizzo.

Non si usano i caratteri di sistema: l'immagine di produzione non ne ha quasi
nessuno, e fidarsi vorrebbe dire una carta diversa a ogni macchina — su alcune,
nessun testo.

## Cosa c'è dentro la carta

I segnaposto che si possono scrivere in un testo: `{nome}`, `{titolo}`,
`{gioco}`, `{login}`, `{link}`, `{spettatori}`, `{piattaforma}`. Titolo e
categoria arrivano dalla piattaforma — gli stessi dati che il messaggio Telegram
usa già.

Un titolo lunghissimo viene **tagliato coi puntini**, non lasciato uscire dal
bordo: senza un motore di caratteri il testo non si può misurare, e non fare
niente vuol dire farlo uscire dalla carta.

E ciò che scrive lo streamer non può rompere il disegno: nome e titolo vengono da
fuori, e un `"` o un `<` senza fuga chiuderebbero un attributo — da lì in poi la
carta non sarebbe più la nostra.

## L'editor, e le tre cose che lo tengono onesto

L'editor sta in `src/web/public/carta-editor.js`, caricato solo da chi lo apre.
Modifica esattamente i dati di `normCarta`: niente stato suo, niente formato
intermedio.

**Un disegnatore solo.** L'anteprima è `svgCarta`, la stessa funzione che
disegna il PNG che parte. Il browser riceve `carta-disegno.js` — quel file, non
una copia — spogliato dei commenti da `disegnoPerIlBrowser()`
(`src/features/carta-servita.js`). Lo spoglio sta in una funzione sola perché
chi serve il modulo e chi lo verifica chiamino la stessa cosa: non c'è un posto
dove ci si possa dimenticare di spogliare.

Con due disegnatori, anteprima e immagine divergono in silenzio: sullo schermo
il nome è al centro, nel gruppo arriva spostato, e nessuna delle due parti si
lamenta. È il difetto peggiore che un editor possa avere.

**La geometria non si rifà.** Ogni elemento esce dentro al suo
`<g data-el="id">`. Un `<g>` non disegna niente, ma è quello che permette
all'editor di chiedere all'SVG cosa c'è sotto al dito (`closest('g[data-el]')`)
e dove disegnare la cornice (`getBBox()`). Calcolarselo sarebbe la stessa
geometria scritta due volte: il giorno che una delle due cambia, si seleziona un
pezzo e se ne sposta un altro.

**I caratteri hanno un nome privato.** `font.css` dichiara già un «Archivo» suo,
che è un altro file. Dichiarando la stessa famiglia, il browser può scegliere
quella del sito e l'anteprima disegna con un carattere diverso dal
rasterizzatore — largo diverso, e nessun errore. Quindi l'editor dichiara
`carta-anton`, `carta-archivo-black`, `carta-archivo`, e riscrive il disegno su
quei nomi. I file però sono gli stessi: `/font/<file>.ttf` serve quello che
carica resvg.

## Il vocabolario

Tipi, forme, fondi, segnaposto, caratteri, temi e il massimo di elementi escono
dagli elenchi veri, dalla rotta `GET /api/streamer/telegram/carta`. L'editor non
ne tiene una copia: non può offrire una scelta che il server poi scarta in
silenzio.

Quale tema standard sia attivo lo dice il **server**. Calcolarlo dal client
sembra naturale ed è sbagliato: la carta salvata passa dalla normalizzazione, e
un confronto fra la carta ripulita e il tema grezzo non torna più — premi
«Twitch», ricarichi, e il pannello ti dice che stai usando una grafica tua.

## Il messaggio che l'accompagna

Con la locandina, il testo di casa si accorcia: titolo e categoria sono già
disegnati dentro, e ripeterli è mandare due volte la stessa cosa. Restano le due
cose che l'immagine non sa fare — dire **chi** nella notifica del telefono, che
dell'immagine non vede niente, e dare un **link** da premere, perché una foto
non è cliccabile. È `PIATTAFORME[p].conLocandina` in `avvisi.js`, e ce n'è uno
per piattaforma: il collaudo verifica che nessuna resti indietro.

Il testo scritto dallo streamer vince comunque. Accendere la locandina non gli
cancella il messaggio.

## Dove arriva

`fotoPerEvento(login, evento, { chi, info, helix })` è l'unico posto che decide
se allegarla. La usano l'annuncio vero, le dirette degli streamer aggiunti alle
notifiche, e tutte e due le prove del pannello. Con due decisioni separate, la
prova proverebbe qualcosa di diverso da quello che parte — e il sintomo non si
vede, perché il messaggio arriva lo stesso.

`login` è chi possiede il gruppo: sua la levetta e suo il disegno. `chi` è chi
sta andando in diretta, e da lui vengono nome, faccia e titolo. Quando un canale
annuncia le dirette degli amici, la grafica resta la sua e cambia il contenuto.

Se `info` non porta il titolo — alla prova il canale è spento, e all'annuncio
vero Twitch a volte dice «è partita» prima di avere il titolo — si prende quello
del **canale**, che resta scritto anche a diretta finita.

## Il cancello

`node scripts/verifica-carta.mjs` (con `--selftest`). Tiene fermo che il modulo
del disegno resti puro, che quello servito al browser disegni identico al
server, che il vocabolario esca dagli elenchi veri, che i caratteri ci siano e
siano TTF, che l'editor non si riscriva i nomi dei file né le famiglie, e che
nessuno scavalchi `fotoPerEvento`.
