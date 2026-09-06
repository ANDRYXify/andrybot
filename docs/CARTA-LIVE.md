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
