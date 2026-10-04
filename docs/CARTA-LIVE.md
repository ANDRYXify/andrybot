<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
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

## I testi si misurano

Prima un testo si tagliava a un numero di segni («Segni al massimo»), perché
«senza un motore di caratteri il testo non si può misurare». Era una stima, e
sbagliava nei due versi: «Il negozio di andryxify» usciva «Il negozio di a…»
con mezzo spazio libero, e un nome di tutte M usciva dal bordo.

Ma i caratteri sono file nostri, e quanto è larga ogni lettera è scritto dentro
il file: la tabella `hmtx` dà l'avanzamento di ogni glifo, `cmap` dice quale
glifo fa quale lettera, `head` in che unità. `scripts/misura-caratteri.mjs` le
legge e scrive `LETTERE` in `carta-disegno.js` (fra due segni, mai a mano): per
ogni carattere, l'avanzamento delle lettere latine, del Latin Extended-A e della
punteggiatura tipografica, in millesimi di corpo, e il **peso** con cui il
carattere si disegna da solo. Una lettera che non c'è (cirillico, ideogrammi) la
disegna un carattere di riserva e si conta larga un corpo intero.

Misurato contro il browser e contro resvg, su frasi vere: Anton e Archivo Black
coincidono entro l'1%. Il crenamento sposta al più lo 0,8% *in più*, quindi la
misura si prende col 2% d'aria (`ARIA`).

**Il peso.** Archivo è un carattere variabile, e il suo peso di partenza è 600:
resvg disegna quello. Il browser invece, con l'`@font-face` dichiarato a 400,
lo stringeva al peso 400, e l'anteprima dell'editor era più sottile e più
stretta dell'immagine vera, fino al 10%. Ora l'editor dichiara ogni carattere
col peso che sta nella tabella (`LETTERE[nome].peso`, letto da `fvar` o da
`OS/2`): browser, server e tabella danno la stessa larghezza.

**Ogni testo ha la sua larghezza** (`larghezza`, nell'editor «Larghezza
massima», o la maniglia di destra), e ci sta sempre (`adatta`):

1. se ci sta al suo corpo, resta com'è;
2. sennò il corpo scende quanto serve, fino al suo minimo: il 55% del corpo
   scelto (oltre, il nome diventa piccolo come la riga sotto) e mai sotto i 22
   punti, che in un'anteprima di chat larga un terzo sono il testo più piccolo
   che si legge;
3. se nemmeno al minimo ci sta, a quel corpo si taglia coi puntini, misurati
   anche loro;
4. in un caso estremo (una larghezza minuscola, una spaziatura enorme) scende
   ancora: il testo non esce mai.

La larghezza non va mai oltre il bordo della carta (`larghezzaUtile`, la stessa
per il disegno e per il campo a puntini dell'editor). La targhetta prende la
larghezza esatta della sua parola, coi margini e lo spigolo tagliato contati
come una parte per ogni punto di corpo.

E ciò che scrive lo streamer non può rompere il disegno: nome e titolo vengono da
fuori, e un `"` o un `<` senza fuga chiuderebbero un attributo — da lì in poi la
carta non sarebbe più la nostra.

## L'editor, i gesti

Chiesto così: «sembra che non funzioni e non mi fa personalizzare niente in modo
comodo». Ogni pezzo funzionava, l'insieme no: il nome tagliato, un buco dove la
riga era vuota, si spostava solo coi cursori. Ora:

- **si trascina** un pezzo per spostarlo; quando si aggancia al centro o a un
  altro pezzo, la riga a cui si è agganciato si vede (Alt per non agganciare,
  Maiusc per restare in riga, Ctrl/Cmd per andare piano);
- **le maniglie** del pezzo scelto: a destra la larghezza (testo, riga,
  striscia), in basso lo spessore (riga), nell'angolo la grandezza. Un testo
  cresce tutto: corpo e larghezza insieme. La faccia cresce dal centro;
- **doppio clic** su un testo o una targhetta porta a scriverlo;
- sotto al testo, **«Si legge: …»** dice cosa diventa coi dati veri, e ogni
  segnaposto mostra il suo valore;
- un testo che i dati lasciano **vuoto** si vede in trasparenza, col suo
  segnaposto, e si prende come gli altri (nell'immagine non c'è);
- **al centro** in orizzontale e in verticale, misurando il pezzo com'è;
- **le vesti**: si riparte da un disegno di serie, e Annulla torna indietro.

Il collaudo è `scripts/verifica-editor-carta.mjs`: apre l'editor vero con la
carta vera del negozio e fa ogni gesto guardando il risultato, e pretende che
il browser disegni le lettere larghe come la tabella (cioè come il server).
L'autoprova rimette Archivo al peso 400 e blocca le maniglie, e li vuole rossi.

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


## La faccia di chi non è registrato qui

L'avatar veniva da `streamers.get(login)`, cioè dalla tabella di chi ha un
account su SocialBot. Ma la locandina vale anche per i canali che una streamer
**aggiunge alle sue notifiche**: quelli in tabella non ci sono, e usciva un
cerchio nero — che sembra un difetto della grafica, e invece è un dato che non
c'è.

Se manca, si chiede alla piattaforma: `helix.getUserByLogin(login)` dà
`profile_image_url`. Una volta sola per login, ricordata sei ore: un annuncio non
deve costare una chiamata in più ogni volta che qualcuno va in diretta. Su Kick
oggi non c'è una via per chiedere la faccia di un canale non collegato, quindi lì
resta vuota — e non lancia.

## Le emote diventavano quadratini

Il rasterizzatore ha i caratteri che gli diamo noi (Anton, Archivo), e nessuno
sa disegnare un pittogramma: al suo posto esce il quadratino vuoto. Un titolo di
Twitch ne è pieno, e usciva «▨▨Blind Run | ▨▨ !social».

Si tolgono **nel disegno**, non in chi prepara i dati. Se lo facesse solo il
server, l'editor mostrerebbe un'emoji che nella locandina poi non c'è — e
un'anteprima che mente è il difetto peggiore per un editor. Va anche nella
direzione giusta: nelle grafiche del sito le emoji non ci vanno, perché il
disegno è a china e un'emoji la disegna qualcun altro.

Cos'è un'emoji ha **una risposta sola** in tutto il progetto, e sta nel motore
che disegna, perché è l'unico posto che deve funzionare anche nel browser (e
quindi non può importare niente). I cancelli la prendono da lì. Non è «un
carattere di quel blocco Unicode»: è un carattere che il sistema disegna a
colori — `Emoji_Presentation` — più i pittogrammi che U+FE0F promuove. Le spunte
✓ ✗ e le stelline ★ ✦ sono segni tipografici e restano.

## La carta dell'anteprima del link

La stessa famiglia serve anche l'anteprima che le chat mostrano quando
qualcuno incolla una pagina pubblica: la pagina link, quella delle donazioni,
il negozio e la porta del gruppo Telegram. Un preset per pagina in
`TEMI_PAGINA` (`link`, `dona`, `negozio`, `telegram`), misura `MISURA_PAGINA`
(1200×630), un impianto diverso dalla locandina perché qui non c'è una diretta
da annunciare ma una persona da riconoscere: la faccia, il nome grande, il
sottotitolo, l'indirizzo.

**Un elenco solo.** Le pagine con un'anteprima sono le chiavi di `TEMI_PAGINA`
(`NOMI_TEMI_PAGINA`), e da lì vengono tutte le altre: il database
(`QUALI_CARTA_PAGINA`), la tabella del server (`PAGINE_CARTA`: se la pagina è
aperta, com'è fatta, il suo indirizzo, le righe della carta), le rotte
dell'immagine, le porte dichiarate e il pannello. Il contratto
(`test/contratto/anteprima-link.test.mjs`) le vuole uguali, una per una. Prima
l'elenco era scritto a mano in sei posti, ed è così che la porta del gruppo era
rimasta senza la sua.

**La targhetta parla la lingua del canale**, in ogni pagina: «I MIEI LINK»,
«MY LINKS», «MIS ENLACES»; «SOSTIENIMI», «SUPPORT ME», «APÓYAME»; e così il
negozio e il gruppo. È la sola parola della carta di partenza che non scrive lo
streamer, e prima un canale inglese la trovava in italiano. Il preset tiene
quella italiana.

**Standard ma non fissa.** Ogni preset ha un **segnale** (`SEGNALE_PAGINA`), il
colore che nel disegno fa da accento; `tintaCarta(carta, segnale, accento)` lo
sostituisce ovunque compaia con l'accento della pagina, ricava da quello le
sfumature del fondo e tiene leggibile il testo delle targhette. Col segnale
stesso torna il preset identico, e il collaudo lo pretende. `cartaPaginaDi`
sceglie: la carta rifatta dallo streamer (`carte_pagina`, una per pagina),
altrimenti il preset tinto.

Il pannello la mostra nel riquadro «Quando condividi il link» dell'editor della
pagina e apre lo stesso `carta-editor.js` (titolo suo, misura sua). Le **vesti**
sono i disegni delle pagine (`vestiPagina`: «Alone», «Striscia», «Cornice»,
«Angolo»), ognuno col colore della pagina e con la targhetta della pagina che
si sta vestendo, nella lingua del canale.

**La carta della porta del gruppo.** Alone in alto a destra, la faccia con
l'angolo tagliato, la targhetta del gruppo, il nome di chi fa la diretta; sotto
il sottotitolo della porta, o il titolo se l'ha cambiato, o la riga di partenza
(`righeCarta` in `src/features/tg-porta.js`, come quella del negozio). C'è solo
se la porta è aperta (pubblicata, col bot nel gruppo), come le altre pagine.

**La carta del negozio.** La targhetta dice già «il negozio»: il nome grande è
quello del canale, non «Il negozio di …», che la ripeteva. Sotto va la riga
dello streamer, se l'ha scritta; poi il titolo della pagina, se l'ha cambiato;
sennò una riga che dice cosa ci si trova («Cosa si compra in chat, e quanto
costa»). Mai vuota: una riga vuota lasciava un buco nella carta
(`righeCarta`, in `src/features/negozio-pagina.js`). Le rotte:
`GET/PUT/DELETE /api/paginacarta?quale=link|dona|negozio|telegram`,
`GET /api/paginacarta.png` per il proprietario; `GET /u/<login>/anteprima.png`,
`anteprima-dona.png`, `anteprima-negozio.png` e `anteprima-telegram.png`
pubbliche, con cache di un'ora rifatta quando cambiano pagina, carta o faccia.
