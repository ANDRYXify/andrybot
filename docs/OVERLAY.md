# I collegamenti dell'overlay

## Come si controlla, invece di guardare

L'overlay in OBS riceve tutto da un solo flusso SSE (`/overlay/:login/stream`).
Il controllo giusto non e aprire l'overlay e guardare se qualcosa si muove, ma
confrontare **due insiemi**: i tipi di evento che il server puo mandare e i tipi
che l'overlay sa gestire. Se non coincidono, c'e un collegamento rotto, e si sa
esattamente quale.

## La mappa, oggi

| tipo | lo manda | l'overlay |
| --- | --- | --- |
| `alert` | `alerts.js` (follow, sub, bit, raid) | `alert()` |
| `chat` | `alerts.js` — chat a schermo | `chat()` |
| `chat_raw` | `alerts.js` — **anteprima nella dashboard** | ignorato (vedi sotto) |
| `widget` | `alerts.js` — ultimo follower / ultimo sub | `widget()` |
| `contatore` | `server.js` — contatori tipo `!morti` | `contatore()` |
| `tema` | `server.js` — ricarica stile e posizioni | `caricaTema()` |
| `testo` | `modules.js` — testo a schermo da comando | `mostraTesto()` |
| `penitenza` | `penitenze.js` (`start` / `hit` / `end`) | `penitenza()` |
| `preset` | `effects.js` — suoni pronti | `suonaPreset()` |
| `audio` | `effects.js` | `suona()` |
| `immagine`, `video` | `effects.js` | coda visiva |

Verificati uno per uno con un `EventSource` finto: ognuno produce davvero il
nodo che deve produrre. `widget` e `penitenza` sembravano scollegati finche non
ho mandato il payload **vero**: il primo compare solo con `cfg.attivo` (giusto:
se il widget e spento non deve comparire), il secondo solo con `azione`.
Entrambi corretti: era la mia sonda a essere incompleta.

## Il difetto trovato

`chat_raw` esce da `alerts.js` a **ogni messaggio di chat**, ed e destinato
all'anteprima dal vivo dentro la dashboard (`app.js`). Ma il flusso e uno solo,
quindi arriva anche all'overlay di OBS — dove finiva nel ramo finale:

```js
else { if (mostra('effetti')) { codaVisiva.push(dati); mostraProssimo(); } }
```

cioe nella **coda degli effetti visivi**, come se fosse un'immagine o un video.

A chat ferma non si nota: ogni evento in arrivo chiama `mostraProssimo()`, che
scarta subito quello che non e immagine o video. Il guaio arriva **mentre un
effetto e a schermo**: li `occupato` e vero, la coda non si svuota, e i
messaggi di chat si accumulano. Quando l'effetto finisce, la coda li smaltisce
**uno ogni 120 ms** — e l'effetto successivo aspetta dietro tutti quanti.

Misurato: un effetto lanciato con 60 messaggi di chat in mezzo compariva dopo

| | secondo effetto |
| --- | ---: |
| prima | **8 401 ms** |
| dopo | **1 152 ms** |

Con una chat viva sono i «gli effetti a volte non partono» che sembrano
capricci e invece sono aritmetica: un posto in coda per ogni messaggio
arrivato mentre l'effetto precedente era a schermo.

## La correzione

Non si aggiunge un ramo per `chat_raw`: si toglie il ramo che accettava
**qualunque cosa**. Nella coda visiva entrano solo i due tipi che quella coda
sa disegnare:

```js
else if (dati.tipo === 'immagine' || dati.tipo === 'video') { … }
```

Cosi un evento sconosciuto — `chat_raw` oggi, qualunque cosa si aggiungera
domani per un altro consumatore — viene **ignorato**, non disegnato. Il difetto
non puo ripresentarsi, perche la condizione che lo generava non esiste piu.

## Collaudo

`scratchpad/t_overlay.mjs` monta l'overlay vero con un `EventSource` finto,
manda ogni tipo della tabella e verifica che compaia il nodo giusto; poi
verifica che un evento sconosciuto non tocchi la pagina, e **misura** il
ritardo del secondo effetto con 60 messaggi di chat in mezzo (soglia: 3
secondi). Sul codice vecchio il test fallisce con 9 357 ms; su quello corretto
passa con 2 012 ms.

## Tutto quello che compare è un elemento della scena

Prima non era così. Alert, chat e i due widget erano **elementi** — si
accendevano, si spostavano, si vestivano dallo stesso posto — mentre i
**contatori** vivevano per conto loro (posizione e colori propri, nessun
interruttore nell'elenco) e l'**obiettivo** non esisteva. Due sistemi per mettere
roba sulla stessa tela.

Ora gli elementi sono sette: `alert`, `chat`, `wf`, `ws`, `goal`, `cont`,
`effetti`. Sono scritti **una volta sola** di qua (`ELEM_OVL` in `app.js`) e una
volta sola di là (`ELEM_OVERLAY` in `server.js`); l'elenco del pannello, i
valori di serie e la ripulitura di quel che arriva ne discendono tutti. Un test
confronta i tre insiemi: se ne nasce uno e lo si dimentica da una parte,
diventa rosso.

### Il difetto che quell'elenco ha scoperto

Chi ripuliva gli overlay in arrivo copiava a mano quattro chiavi su sette:

```js
mostra: { alert: m.alert !== false, chat: …, wf: …, ws: …, effetti: … },
```

`goal` e `cont` cadevano per strada. `_mostraDefault()` li dava accesi, quindi
l'occhio di «Obiettivo» e «Contatori» si poteva spegnere — ma al ricaricamento
tornava acceso, sempre, e nessun overlay poteva davvero farne a meno. Non era un
caso raro: era **impossibile** spegnerli. Ora quella riga è
`ELEM_OVERLAY.reduce(...)` e non può più perdere pezzi.

I contatori mantengono i loro colori e la loro posizione quando li imposti a
mano — quel che scrive il singolo contatore vince sempre — ma senza impostazioni
prendono la veste della scena, e si spengono tutti insieme dall'elenco.

## L'obiettivo

Una barra che si riempie mentre arrivano follower, sub o bit.

- **Il conto è quello vero**: lo tiene il motore contando gli eventi che già gli
  passano davanti (`GOAL_DI` dice quale evento fa crescere quale obiettivo — un
  elenco, non un caso particolare nel codice). Un cheer da 500 bit vale 500, non
  1.
- **Sopravvive a un riavvio**, perché sta nelle impostazioni del canale. Un
  obiettivo che si azzera da solo la notte non è un obiettivo.
- **Si riparte da zero solo se lo chiedi**, con un pulsante.

## Lo studio mostra la scena intera, e la mostra dov'è davvero

Due difetti diversi, la stessa radice: **la tela diceva una cosa e l'overlay ne
faceva un'altra**.

**Primo: mancavano dei pezzi.** Sulla tela dello studio c'erano quattro
elementi su sette. Gli obiettivi — che sono quanti ne vuoi, ognuno col suo posto
— si potevano piazzare solo scrivendo numeri in un modulo, e i contatori pure. Si
poteva personalizzare tutto tranne il dove, che è la cosa che si guarda.

La correzione non è «aggiungere gli obiettivi alla tela»: è **derivare la scena
dall'elenco**. `ELEMENTI()` mette in fila i quattro fissi, poi un elemento per
ogni obiettivo (`goal:<id>`) e uno per ogni contatore (`cont:<comando>`). Nodi,
livelli, selezione, frecce, aggancio, annulla/ripeti, ispettore e salvataggio
leggono tutti da lì: un elemento nuovo domani costa una riga, non nove.

**Secondo: gli angoli erano finti.** Lo studio metteva un elemento «in alto a
destra» al 87% della larghezza, col suo centro; l'overlay lo mette in una
scatola d'angolo con `top: 3vh; right: 2vw`, cioè col **bordo** a filo. Per una
pastiglia stretta la differenza non si vede; per una barra da 15rem sì, e infatti
l'obiettivo in alto a destra usciva dalla tela. Ora lo studio posa gli angoli
con lo stesso modello a scatola dell'overlay (`ANCORA`), misura dove l'elemento
è finito e usa quel centro per le guide. Un test confronta i due numeri: se
qualcuno cambia il margine da una parte sola, diventa rosso.

**I contatori si ancoravano a terzi.** `x <= 33 → 0`, `x >= 67 → -100%`,
altrimenti `-50%`: trascinandone uno attraverso il centro **saltava** di mezza
larghezza. Ora seguono la regola di tutti gli altri
(`translate(-x%, -y%)`), quindi la tela e l'overlay coincidono e il
trascinamento è continuo. In cambio hanno guadagnato la rotazione, che gli altri
elementi avevano già.

## Il banco: due sponde, non due cartelli sopra la tela

I pannelli «Livelli» e «Proprietà» galleggiavano **sopra** la tela, a sinistra e
a destra. Su 1440px coprivano 574px di 964: il 40% della scena, e per l'appunto
i due angoli alti, dove stanno gli obiettivi.

Da 1024px in su ora sono due sponde della griglia — `auto | 1fr | auto` — e la
tela sta nel mezzo, tutta visibile. Arrotolarne una le ridà la larghezza;
trascinarne una per la maniglia la stacca e la fa tornare a galleggiare (e la
colonna sparisce, quindi la tela cresce); un doppio clic sulla testa la
riaggancia. Sotto i 1024px galleggiano come prima: tre colonne in 800px
lascerebbero alla tela 200px, che è peggio del problema che risolvono.

## Il player e il conto alla rovescia

Due elementi che, a differenza di tutti gli altri, **cambiano da soli** mentre
nessuno tocca niente: la canzone avanza, i minuti scendono. Il tempo lo contano
nell'overlay, non sul server: il server dice *cosa* suona e *a che punto era*, e
*quando* il conto scade — il resto è una sottrazione. Così due sorgenti browser
aperte mostrano la stessa cosa senza mettersi d'accordo, e nessuna resta
indietro se un evento si perde per strada.

### Chi chiede a Spotify

Spotify non sa spingere: qualcuno deve chiedere. Chiede **l'overlay**
(`GET /overlay/:login/musica`, protetto dalla chiave), non il server a vuoto —
così quando nessuno guarda non parte una sola chiamata. E la risposta sta in
cache quattro secondi, quindi dieci sorgenti browser aperte valgono comunque una
chiamata sola: il numero di spettatori non deve pesare su Spotify.

Fra una lettura e l'altra la barra **avanza da sola**: il server ha detto a che
millisecondo era e quando l'ha detto. Senza, scatterebbe ogni cinque secondi.

### Va a tempo davvero

Le onde di un player qualunque ballano a una velocità decisa a tavolino. Le
nostre ballano sul **battito vero** del brano: Spotify dice quanti battiti al
minuto ha (`/audio-features`), e la **fase** si ricava da dove sei nella
canzone — un `animation-delay` negativo lungo quanto il resto della divisione
fra il tempo trascorso e la durata di una battuta. Senza quella fase sarebbero a
tempo per caso.

L'energia del brano modula quanto è ampio il battito, così un pezzo calmo non
pulsa come un pezzo tirato. Se Spotify non dà quel dato — l'endpoint non è
garantito a tutte le app — si torna alle animazioni di prima: **mai un errore a
schermo per un dettaglio estetico**.

### Quattro stati, non due

Il player spariva **mentre la canzone andava**. Spotify risponde `204` («niente
in riproduzione») anche per un attimo fra due tracce, e un `429`, un token in
rinnovo o la rete che sbatte davano lo stesso identico risultato di «non c'è
musica»: un intoppo di un secondo spegneva il player, che poi rientrava con
tanto di animazione d'entrata. Un lampeggio.

E il difetto opposto, che nessuno vedeva: **in pausa il player restava**, perché
«fermo» voleva dire soltanto «non c'è nessun brano».

Gli stati adesso sono quattro e vogliono dire cose diverse:

| stato | cosa vuol dire | cosa fa il player |
|---|---|---|
| `suona` | c'è un brano e va | resta, sempre |
| `pausa` | c'è un brano, fermo | sparisce o resta, come hai scelto |
| `niente` | non c'è nessun brano | sparisce o resta, ma **dopo una conferma** |
| `ignoto` | la lettura non è riuscita | non si decide: si tiene quel che c'è |

Su `ignoto` il server risponde con l'ultima lettura certa se ha meno di un
minuto, e non la mette in cache; l'overlay, dal canto suo, non tocca niente. Su
`niente` serve una seconda lettura concorde — il vuoto fra due tracce dura meno
di così. La tolleranza vale solo per **togliere** un player già a schermo: se non
c'è ancora, non c'è nessun lampeggio da evitare e si decide subito.

E se ne va con una dissolvenza, la simmetrica dell'entrata che hai scelto —
sparire di colpo è brutto quanto lampeggiare.

`scripts/verifica-player.mjs` misura quella tabella riga per riga, con un finto
Spotify che passa da «suona» a un intoppo, al vuoto fra due tracce, alla pausa.

### L'ombra sapeva solo fare rettangoli

Le forme spigolose — angolo tagliato, insegna, esagono, nastro, fumetto — non
sono un `border-radius`: sono un `clip-path` sugli pseudo-elementi che dipingono
il fondo. Un `box-shadow` sull'elemento non lo sa, e disegna l'ombra di un
rettangolo: negli angoli tagliati restava un triangolo con l'ombra ma senza il
widget, che su fondo chiaro sembrava un buco bianco.

L'ombra ora è un `filter: drop-shadow()` sull'elemento, che segue quello che
viene **effettivamente dipinto**, sagoma compresa. Un test rifiuta il ritorno di
qualunque ombra rettangolare sui widget.

### Il colore preso dalla copertina

Si legge l'artwork su una tela di 24 pixel per lato e si media quello che c'è,
scartando i pixel spenti — il nero delle bande e il bianco dei bordi non sono il
colore del disco — poi si alza la saturazione, perché una media tende sempre al
grigio. Se l'immagine non si lascia leggere, l'accento resta quello scelto a
mano: mai un player senza colore.

Il primo tentativo **mediava tutti i pixel**, e sbagliava per costruzione: la
media di viola e arancio è magenta, cioè un colore che nel disco non c'è. Ora è
un **istogramma di tonalità a dodici spicchi**: vince lo spicchio con più
colore, e si media solo dentro quello. Il secondo spicchio serve allo sfondo a
gradiente, che scorre piano fra i due colori del disco.

E le tinte si **ricordano per copertina**: al primo giro il calcolo si applicava
una volta sola e qualsiasi ridisegno la perdeva, riportando l'accento al colore
fisso.

### Il conto alla rovescia è un istante

Non si tiene un contatore che scorre: si scrive **quando scade**
(`overlayStato.timer.fine`). Non c'è niente che possa andare fuori sincrono, e
un riavvio del bot non lo azzera — un conto alla rovescia che riparte da solo
quando il bot si riavvia non è un conto alla rovescia.

## Un obiettivo può partire da dove sei

«1000 follower» non è «altri mille». Se ne hai già 450, la barra deve partire da
lì. Ogni obiettivo ha quindi una **partenza**: il conto degli eventi resta quello
vero (lo tiene il bot), la partenza è il gradino sotto, e il tasto «Quanti ne ho
adesso» va a chiederlo a Twitch (`/channels/followers` e `/subscriptions`, che
danno il `total`).

I **bit** non hanno un totale su Twitch — esiste solo la classifica di un
periodo — e allora il pannello lo dice, invece di inventare un numero: la
partenza la scrivi tu.

## Spostare le cose: cosa vuol dire davvero quella x

La x che si salva **non è il centro** dell'elemento: è la sua posizione lungo la
corsa disponibile. 0 = a filo a sinistra, 100 = a filo a destra, 50 = centrato.
È la regola che l'overlay applica da sempre (`left: x%` con `translate(-x%)`),
solo che non era scritta da nessuna parte: si deduceva a mente ogni volta.

Chi trascinava la trattava come se fosse il centro. L'errore è
`larghezza × (x − 50%)`: zero al centro, mezza larghezza ai bordi. Toccavi un
elemento vicino a un bordo e **saltava sotto il cursore** — misurato: 22 e 27
pixel su elementi normali, e cresce con la larghezza.

Ora la regola è due funzioni, `centroDa` e `xDaCentro`, e ci passano tutti:
trascinamento, frecce, allineamenti, aggancio, guide. Da cui, gratis:

- il limite diventa `0…100`, e **nessun elemento può uscire dallo schermo**;
- «allinea a sinistra» è `x = 0`, non `x = mezza larghezza`;
- l'aggancio ragiona sui centri in pixel di tela — quello che l'occhio confronta.

E si era portato dietro un secondo difetto: la posizione di un elemento posato
in un angolo veniva **misurata una volta e conservata**. Quella misura poteva
essere stata presa mentre la scheda non era ancora in pagina — e allora valeva
zero, e al primo trascinamento l'elemento partiva da un posto inventato. Ora non
si conserva più niente: si misura quando serve.

Il contrappeso è `scripts/verifica-studio.mjs`: prende ogni elemento della scena
in un punto qualunque (non al centro), lo trascina di una quantità nota verso il
centro della tela — via dai bordi, dove il limite entrerebbe in gioco per
davvero — e controlla che si sia spostato **di quella quantità**. Con Alt
premuto, così l'aggancio non falsa la misura.

### La corsa si misura su quello che si vede

La regola diceva «corsa = tela − lato». Restava da dire **quale lato**: quello
del riquadro di impaginazione, o quello che si vede dopo la Dimensione? Erano la
stessa cosa solo al 100%, e nessuno dei due file lo aveva mai deciso — usavano
entrambi il riquadro di impaginazione.

Misurato sulla tela vera, 1920×1080:

| Dimensione | `x = 0` → bordo sinistro | `x = 100` → bordo destro |
|---|---|---|
| 100% | 0 ✓ | 1920 ✓ |
| 200% | −412 (esce dalla tela) | 2332 (esce dalla tela) |
| 60% | +165 (**non ci arriva**) | 1756 (**non ci arriva**) |

Il secondo caso è quello che si vede lavorando: rimpicciolisci il player, lo
spingi verso il bordo, e quello **si pianta** — mentre l'inspector segna già 0.
Sembra un muro, ed è solo una corsa misurata sul riquadro sbagliato.

Il lato giusto è quello visibile, `w · f` con `f = Dimensione/100`: un elemento
al 60% occupa meno spazio, quindi ha **più** strada da fare. Da lì la posa si
ricava, non si cerca. Con `left: x%` e `transform: translate(t%) scale(f)` — le
percentuali di `translate` si risolvono sul riquadro di impaginazione e sono
immuni allo `scale` della stessa lista — imporre che il centro visibile cada su
`x/100 · (T − w·f) + w·f/2` dà

    t = 50·(f − 1) − x·f

che per `f = 1` torna esattamente il `−x` di prima: **dove era giusto non
cambia niente**, cambia solo il caso rotto. Ed è pura CSS, quindi si riaggiusta
da sé quando il titolo di una canzone allarga il player.

La stessa riga vale nel banco (`_tiraXY`) e nell'overlay vero (`tiraXY`), e la
corsa la calcola un solo posto per file (`_lati`, che è `offsetWidth · f`).
Ne beneficiano anche gli effetti `!comando`: l'editor li posava per centro e
l'overlay per corsa, quindi un'immagine rimpicciolita finiva in diretta in un
punto diverso da quello scelto. Ora parlano la stessa lingua.

Due contrappesi:

- `test/contratto/overlay-elementi.test.mjs` **esegue** le due funzioni prese
  dai file e verifica dove finisce il bordo, per ogni lato, Dimensione e x. Non
  riconosce una stringa: fa il conto.
- `scripts/verifica-posa.mjs` apre un browser vero e **misura i pixel resi**:
  ogni elemento della scena, a cinque Dimensioni, deve stare a filo dei bordi
  agli estremi e al centro in mezzo — nel banco e nella pagina dell'overlay. E
  trascinando con una Dimensione diversa da 100 l'elemento deve spostarsi
  esattamente di quanto lo sposti. Con la formula vecchia il cancello vede 176
  pose storte: `node scripts/verifica-posa.mjs --selftest`.

### Un fatto, una risposta: dov'è un elemento

Alla domanda «dove sta questo elemento» il banco sapeva dare **tre risposte
diverse**, e le dava tutte:

| chi rispondeva | per il player | scarto |
| --- | --- | --- |
| `ANCORA`, il CSS che lo disegna davvero | `left: 2%; bottom: 3%` | — |
| `_defPos`, che misurava il nodo in pagina | `2.88% · 96.54%` | mezzo punto |
| `_cornerXY`, una tabella scritta a mano | `13% · 85%` | **dieci punti**, 190 px |

La terza serviva solo da ripiego quando la misura non era possibile — cioè
esattamente quando nessuno se ne accorgeva. E la tela ne portava il segno: metà
degli elementi era disegnata con `left/top` in percentuale, metà con
`right/bottom` dal CSS d'angolo, **secondo se qualcuno li avesse già scelti o
no**. Due modi di disegnare la stessa cosa, decisi dalla cronologia dei clic.

Ora la tabella degli angoli è **una**, e tiene numeri, non CSS:
`'alto-destra': { x: 98, y: 3 }`. Il CSS lo genera `_posAncora` (`x > 50` →
`right: 100−x`), il ripiego lo legge `_cornerXY`. Un test controlla che i quattro
angoli dello studio siano gli stessi `2vw/3vh` dell'overlay in onda, confrontando
i numeri invece di cercare una stringa.

Sopra ci sono due sole porte, e la differenza fra loro è il punto:

- `_posDove(k)` **legge** — posizione salvata, altrimenti quella d'angolo. Non
  scrive niente, quindi la possono chiamare i disegnatori (livelli, proprietà,
  barra sotto la tela).
- `_statoXY(k)` **prende in mano** — fissa quel che `_posDove` dice e lo
  restituisce da modificare. La chiamano solo trascinamento, maniglie, frecce,
  allineamenti, rotella e caselle.

Prima leggere *creava*: bastava scegliere un elemento perché la sua posizione
venisse fissata. Da lì il difetto che si vedeva a schermo: nei Livelli l'elemento
appena scelto diceva ancora «in alto a sinistra» mentre le Proprietà accanto
dicevano già `2.29% · 3.17%` — perché i livelli si ridisegnavano *prima* che la
posizione venisse fissata. Ora nei Livelli si leggono percentuali sempre, la
stessa lingua delle Proprietà e della barra sotto la tela; il nome dell'angolo
resta dov'è utile, nella tendina «Dove».

Misurato dopo il cambio: leggere la posizione di tutti e dieci gli elementi
costa **0,07 ms**, una mossa di trascinamento **3,83 ms** — dentro il fotogramma.

### Una proprietà, un valore

Dimensione e Rotazione avevano **due comandi ciascuna**: una casella numerica in
alto e un cursore sotto, con due gestori distinti. Non erano d'accordo su nulla:

- il cursore scriveva il valore vero ma non aggiornava la casella, né i livelli,
  né la cronologia dell'annulla;
- la casella scriveva il valore vero ma non muoveva il cursore né la sua
  etichetta.

Misurato: cursore a 210, poi casella a 140 → sullo schermo **210, «210%» e 140**,
tre numeri per un valore che era 140.

Ora la proprietà ha una riga sola — etichetta, cursore, casella — e sotto una
strada sola: `_scriviProp(campo, v)` limita, scrive, posiziona, ridisegna le due
viste, aggiorna livelli e barra, registra l'annulla e salva. `_mostraProp()` è
l'unico che scrive nei comandi, e legge da `_posDove`: le viste non si copiano
fra loro, discendono entrambe dallo stato.

### L'annulla si era dimenticato una famiglia

L'istantanea per l'annulla elencava le famiglie a mano — i quattro fissi, gli
obiettivi, i contatori — e la famiglia di player e conto alla rovescia non
c'era. Li spostavi e Annulla li lasciava dov'erano.

Il rimedio non è aggiungerli all'elenco: è non avere un elenco. L'istantanea gira
su `ELEMENTI()` e per ogni chiave usa `_posCorrente`/`_scriviPos` e
`_accesoDi`/`_accendiDi` — due coppie lettore/scrittore in cui la famiglia è
scritta **una volta**. Un elemento nuovo entra nell'annulla senza che nessuno se
ne ricordi. `_azzeraPos` passa dallo stesso scrittore.

Il cancello prova tutti e dieci gli elementi: sposta, annulla, controlla che sia
tornato. Rotto di proposito (togliendo la famiglia `cfg` dall'istantanea) dice
`musica: annulla lo lascia a 40 invece di 10.74`.

### Le marce: perché spostare sembrava impreciso

Prima di toccare niente, la misura. L'errore del trascinamento — dove il
puntatore dice che deve andare l'elemento contro dove va davvero — su **81 casi**
(nove elementi × tre scale × tre rotazioni): **0,00 px**. Il trascinamento non ha
mai sbagliato un pixel. L'imprecisione era altrove, ed erano tre cose:

| misurato | numero |
| --- | --- |
| tela 1920 px disegnata larga 847 → **un pixel di schermo** | **2,26 px di overlay** |
| zoom massimo 200% → nel migliore dei casi | 1,13 px di overlay |
| aggancio: chiedendo 2, 5 o 9 px di spostamento l'elemento andava a | 9 px, sempre |

Cioè: **col mouse non si poteva essere precisi al pixel, mai**, nemmeno a zoom
pieno; e per i primi 8 px di trascinamento l'elemento restava incollato alla
linea d'aggancio, quindi muovevi il mouse e non ti seguiva. È quello che si sente
come «poco accurato»: non un errore, una **risoluzione** e un attrito.

Un attrezzo professionale risolve questo con le marce, e adesso ci sono:

- **Ctrl / ⌘ mentre trascini** — il puntatore vale un quinto. Misurato: da 2,26 a
  **0,40 px di overlay per pixel di schermo**, cioè sotto il pixel. La marcia fine
  toglie anche l'aggancio, perché chi lavora fine non vuole essere tirato.
- **Maiusc mentre trascini** — l'elemento resta dritto sull'asse in cui l'hai
  avviato. L'asse si decide al primo movimento e non cambia finché tieni premuto.
- **Alt** — niente aggancio, come prima. Soglia scesa da 8 a 6 px di schermo.
- **Zoom fino al 400%**, perché sotto il 227% un pixel di overlay non è
  rappresentabile sullo schermo.

E la **rotellina non ridimensiona più da sola**: scorrevi la pagina col puntatore
sopra la tela e cambiavi misura all'elemento, in silenzio. Ora la misura vuole
**Alt+rotellina**, la rotazione **Maiusc+rotellina** (con Ctrl il passo è di uno
invece di quattro), e una rotellina nuda scorre la pagina come ovunque.

Tutte e sei le affermazioni sono un cancello, e il cancello è stato provato rosso
disattivando la marcia fine e riaprendo la rotellina.

### Un overlay è una sessione di lavoro

Il prodotto lo dice da sempre: «ogni overlay ha il suo link e il suo layout, es.
un overlay "solo alert" in una scena e uno "solo chat" in un'altra». Ma il
layout era per metà:

| | per overlay | di canale |
| --- | --- | --- |
| `ov.mostra` — cosa compare | tutti e nove gli elementi | — |
| `ov.xy` — **dove sta** | alert, chat, wf, ws | obiettivi, contatori, player, conto alla rovescia |

Quindi il player stava dove l'avevi lasciato **l'ultima volta**, in qualunque
overlay lo guardassi. Misurato mettendo ogni elemento al 77% nel primo overlay e
rileggendolo nel secondo: i quattro fissi restavano ai loro posti, gli altri sei
erano tutti al 77%.

La causa era una copia: `posXY` era un duplicato a quattro chiavi di `ov.xy`,
copiato al cambio di overlay e ricopiato al salvataggio. Quattro chiavi scritte a
mano, e nessuno le ha aggiornate quando gli elementi sono diventati dieci.

Ora `ov.xy` **è** il negozio, indicizzato con la stessa chiave con cui `ov.mostra`
accende l'elemento — `alert`, `musica`, `goal:g1`, `cont:morti`. La copia non
c'è più: `_posCorrente` e `_scriviPos` parlano con l'overlay in cui stai
lavorando, quindi un elemento nuovo eredita la posizione per overlay senza che
nessuno se ne ricordi. La posizione di canale resta come **punto di partenza**
per un overlay che non ha ancora messo quell'elemento da nessuna parte — così
chi ha già i suoi overlay non se li vede saltare.

In diretta la regola è la stessa e la applica una funzione sola, `posaElemento`:
`MIO.xy[chiave] || cfg.xy`. Era già l'idioma per alert e chat
(`MIO.xy.alert || ev.xy`); ora vale per tutti. E la formula che posa un elemento,
che era scritta in **tre** punti, adesso è una: `trasformaXY`.

**E l'annulla è per sessione.** Con una cronologia sola, annullare in una scena
tirava indietro quel che avevi fatto in un'altra. Ora `_storie` tiene un
indietro/avanti per overlay: cambiare overlay cambia la cronologia, e i due tasti
si accendono su quella giusta.

### Due livelli, non uno: acceso e «compare qui»

Restava mezza sessione. Un alert aveva sempre avuto **due interruttori**: quello
del pannello (`al-attivo`, di canale: l'elemento funziona) e l'occhio dei Livelli
(`ov.mostra.alert`, di questo overlay: qui si vede). Obiettivi e contatori ne
avevano **uno solo**, di canale, e l'occhio toccava quello — quindi togliere un
obiettivo da una scena lo toglieva da tutte, e una scena «solo obiettivo A» più
una «solo obiettivo B» erano impossibili.

Ora `ov.mostra` porta anche le **singole voci**, con la stessa chiave con cui
`ov.xy` ne porta la posizione: `goal:g1`, `cont:morti`. L'occhio scrive lì per
tutti allo stesso modo, e l'interruttore del pannello resta di canale.

Si scrive **solo il «no»**: una chiave assente vale acceso. Così un obiettivo
nuovo compare in tutte le scene senza che nessuno debba accenderlo una per una, e
chi ha già i suoi overlay non vede cambiare niente.

Effetto collaterale che valeva la pena: l'avviso «!» dei Livelli — «l'elemento è
spento del tutto» — funzionava solo per i quattro fissi, perché `_elementoAcceso`
guardava una tabella che conteneva solo loro. Ora guarda l'interruttore di
ciascuna famiglia, quindi la spia vale per tutti.

### Una maniglia che non si poteva prendere

La maniglia per ruotare sporge **78 px sopra** l'elemento. Per chi sta in cima
alla tela — un obiettivo al 3%, il conto alla rovescia — il suo centro finiva
**7 px fuori dal riquadro**: tagliata, e con lei la rotazione col mouse. Erano
tre elementi su dieci nella scena di prova. L'alert aveva il problema gemello:
la maniglia era dentro, ma un contatore le stava sopra e **si prendeva il clic**,
perche' `z-index: 5` vale dentro l'elemento, non fra elementi diversi.

Una regola per entrambi: *l'elemento che stai modificando sta in cima alla pila,
e le sue maniglie stanno dentro la tela.* Da cui `.ap-el.sel { z-index: 20 }` —
quel che stai editando e' anche quel che risponde al mouse — e la maniglia che
**passa sotto** quando sopra non c'e' spazio (`.sotto`), scelta dove la posizione
si applica e non a occhio: `centroDa(y, h, OVL_H) − h·s/2 < 78`. Sotto lo spazio
c'e' per definizione, visto che l'elemento e' in alto.

Il cancello prova ogni maniglia di ogni elemento: il centro dentro il riquadro, e
`elementFromPoint` su quel centro deve restituire la maniglia stessa — cioe'
nessuno gliela copre.

### Un pixel che non arrivava al database

Lo studio muove le cose col pixel: le frecce spostano di **un pixel di tela**, che
su 1920 è lo 0,05%, e per questo la posizione si salva con **due decimali** — c'è
scritto nel codice, `0.01% = 0.19px su 1920`.

Solo che a pulire la posizione in arrivo c'erano **due funzioni diverse**, e chi
scriveva doveva ricordarsi quale toccava a lui:

| | decimali | scala |
| --- | --- | --- |
| `normXY`, usata dagli obiettivi | tenuti | 20…400 |
| `xyOk`, usata da player, conto alla rovescia, alert, chat e widget | **buttati** (`clampInt`) | 30…300 |

Quindi per tutto tranne gli obiettivi la regolazione fine **non arrivava al
database**: `{ x: 2.29, y: 3.17 }` diventava `{ x: 2, y: 3 }`. Ricaricavi e
l'elemento era tornato indietro — fino a 9,6 px in orizzontale e 5,4 in
verticale. Le frecce, che sono lo strumento di precisione del banco, non
lasciavano traccia: diciannove pressioni potevano valere zero.

Ora la pulizia è **una**, `xyOk`, con `clampPct` per x e y (due decimali) e la
scala del prodotto, 30…300, la stessa che dichiara `PROP` nello studio. Un test
lo dice nei termini di chi lo usa: «la regolazione fine sopravvive al
salvataggio».

### I contatori passano dalla stessa porta degli altri

Ogni famiglia di elementi entra da un `norm*` che tiene i valori nei limiti
dichiarati. I contatori ora fanno lo stesso, con una forma diversa, e la
differenza è il punto: salvare un contatore è un **merge**, apposta, così che
`{mostra: true}` da un comando in chat non azzeri posizione e colori. Un
riempitore di default romperebbe proprio quello. Quindi `puliConta` è un
**filtro**: pulisce solo le chiavi presenti e lascia assenti quelle assenti. Un
valore che non è un colore non diventa il bianco di default — semplicemente non
passa, e resta quello che c'era.

La posizione di un contatore passa da `clampPct` come tutte le altre, quindi
anche lui tiene il pixel.

Un cancello a parte tiene insieme i **tre elenchi** dei caratteri del contatore —
la chiave in `stile.js` che valida, la famiglia CSS in `presets.js` che disegna,
l'etichetta in `app.js` che si legge: parti diverse, ma le chiavi devono
coincidere, sennò si può scegliere un carattere che il server rifiuta.

## Un elemento si modifica in un posto solo

I comandi di un elemento stavano in **due posti**: posizione e aspetto nel
pannello accanto alla tela, tutto il resto — quando parte un alert, quante righe
tiene la chat, che copertina ha il player, di quanti minuti è il conto alla
rovescia — nelle carte **sotto**. Per una modifica precisa bisognava scendere, e
mentre modificavi non vedevi più l'anteprima: cambiavi, risalivi, guardavi,
riscendevi.

Il modello giusto c'era già, ma per due soli elementi: i widget «ultimo
follower» e «ultimo sub» vivono da sempre interi in un serbatoio nascosto, e
compaiono nel pannello quando li scegli. Ora **è la regola per tutti**:
`raccogliBlocchi()` prende, al montaggio del banco, il contenuto di ogni carta
per-elemento e lo porta nel blocco di quell'elemento; la carta rimasta vuota si
nasconde. Sotto la tela restano solo le cose che non sono elementi: il link per
OBS, gli overlay multipli, il CSS avanzato, i caratteri tuoi.

Gli **obiettivi** erano rimasti a metà: l'aspetto nel pannello, ma conta,
traguardo, partenza e angolo ancora nella carta sotto. Ora il blocco di un
obiettivo è completo e nell'elenco sotto resta quello che serve per gestire la
lista: nome, conteggio, «Modifica», «Togli».

I **contatori** non avevano proprio dei comandi lì: si vestivano dalla scheda
Comandi, un'altra scheda ancora. Ora hanno il loro blocco come tutti — cosa
scrivono, colori, carattere, con o senza sfondo — costruito dalla lista che il
banco già conosce.

I comandi di un elemento sono **raggruppati a fisarmonica**, e i gruppi non si
scrivono: si derivano da come il markup è già fatto — ogni `h4` apre un gruppo,
ogni riquadro con un titolo (i quattro eventi dell'alert, i due widget) diventa
un gruppo suo. Aperto ne resta uno. L'alert richiedeva **dodici schermate** di
scorrimento; ora ne basta una.

### Un `display` che batteva `[hidden]`

Scegliendo il player compariva **anche** l'aspetto di un obiettivo. La causa non
era nella logica — il blocco riceveva `hidden` come tutti — ma nel CSS:
`.goal-vesti { display: grid }` ha la stessa specificità della regola `[hidden]`
del browser ed è dichiarata dopo, quindi vince. Il blocco era nascosto secondo
il DOM e visibile sullo schermo.

E il collaudo non l'aveva visto perché guardava `b.hidden`, cioè **l'attributo**,
non quello che si vede. Ora misura la visibilità reale (`offsetParent`), che è
la cosa di cui si sta parlando. La regola per costruzione: chi può ricevere
`hidden` non prende un `display` senza `:not([hidden])`.

### Il difetto che si crea spostando il markup

Spostare un comando in un altro posto **scollega il gestore** che lo ascoltava:
il campo resta bello e non fa più niente, senza un errore da nessuna parte. È
successo due volte in questa sessione, e la seconda l'ha trovata il collaudo:
il listener degli obiettivi era agganciato a `#lista-goal`, e i campi si erano
spostati nel pannello.

Il collaudo ora tocca un comando per ogni tipo di elemento — player, conto alla
rovescia, chat, obiettivo, contatore — e verifica che **l'anteprima cambi
davvero**.

Il collaudo verifica la cosa per intero: per **ogni** elemento della scena, che
scegliendolo si vedano i suoi comandi e nient'altro (non due blocchi, non quello
di prima, non zero), che sia acceso solo lui sulla tela e nei livelli, che il
titolo sia il suo; che lasciandolo non resti niente acceso; e che sotto la tela
non sia rimasto **nessun** campo.

## Due cose piccole che rendevano il banco scomodo

**L'occhio di un livello non si vedeva cambiare.** Lo cliccavi, l'elemento
spariva dalla tela, ma l'icona restava un occhio aperto: l'unico modo di sapere
cosa avevi fatto era guardare la tela. Il pannello dei livelli si ridisegnava
solo passando dall'ispettore, e l'occhio non ci passa.

**Il puntino del cursore spariva quando l'anello si agganciava.** Con il cursore
di sistema nascosto, era l'unico modo di sapere dove si stava puntando: senza,
centrare un bersaglio piccolo — l'occhio di un livello è 22 pixel — diventava un
indovinello. Ora il puntino resta, e quando l'anello si aggancia si fa un po'
più grande con un alone, perché è lui il riferimento.

## Il difetto che rendeva l'overlay «meh»

`--op: 85`. Senza il `%`.

`background: color-mix(in srgb, var(--bg) var(--op), transparent)` con un'opacità
**senza unità** è una dichiarazione invalida: l'elemento resta trasparente. E il
valore c'era in tre punti — alert, chat e widget — quindi **fuori dalla scatola
l'overlay non aveva sfondi**: scritte bianche appoggiate sul gioco, senza
nessuna pastiglia dietro.

La riga scritta dal pannello ci metteva il `%` (`opacita + '%'`), quindi chi
aveva toccato l'impostazione non vedeva il problema e chi non l'aveva toccata
sì. Un test ora rifiuta qualsiasi `--op` senza unità nella pelle dell'overlay.

Insieme è sparito il **viola di Twitch** che l'overlay usava come accento di
serie (e la pastiglia degli effetti): l'accento di serie adesso è il nostro.

## Il flusso che sopravvive al riavvio

L'overlay in OBS riceve tutto da un `EventSource`. Misurato con Chromium vero
(`scripts/verifica-flusso.mjs`): se il server chiude il socket e basta, il
browser riapre da solo; se in mezzo c'è un reverse proxy, un riavvio del bot
risponde **502** per qualche secondo, e un `EventSource` che riceve uno stato
diverso da 200 **si chiude e non riprova mai più**. È la specifica, non un
difetto del browser.

| cosa succede | prima | ora |
|---|---|---|
| socket chiuso, server subito su | riapre (lo fa il browser) | riapre, e rilegge il tema |
| riavvio dietro Caddy, 502 per un po' | **morto fino al ricaricamento** | riapre con passi 1·2·4·8·15 s, rilegge il tema |
| linea aperta ma muta | morto senza saperlo | il battito del server è un evento; dopo 75 s di silenzio riapre |

Era la classe di `RIAVVIO.md` vista dall'altro capo del filo: ogni
`aggiorna.sh` lasciava la chat ferma e gli effetti e i tasti di CONSOLify senza
destinazione («nessun overlay collegato»), finché qualcuno non ricaricava la
sorgente. Con tre deploy in un giorno l'overlay «non funzionava più».

Un modo solo di aprire un flusso: `flusso.js` (`SB_FLUSSO.apri`), usato
dall'overlay, dai due overlay del tracking, dal ponte della regia e dallo Studio
nel pannello. Il battito (`effects.ping`, ogni 15 s) agli overlay arriva come
`{"tipo":"battito"}` e non come commento: un commento SSE la pagina non lo vede,
e senza vederlo non può distinguere una linea viva da una morta a metà. Al
ritorno la pagina rilegge il tema: gli eventi persi nel frattempo non tornano,
lo stato sì. Il guaio si racconta una volta per caduta (`flusso-caduto`) e una
al ritorno (`flusso-tornato`, con i tentativi), non a ogni prova.

Le sorgenti rimaste aperte da prima di questo cambiamento hanno la pagina
vecchia: vanno ricaricate una volta.

## Anteprima = diretta: cosa divergeva, e il cancello che lo misura

La tela dell'editor è 1920×1080 scalata, con lo stesso CSS dell'overlay. Ma
«stesso CSS» non basta se le due pagine partono da basi diverse o se chi veste
l'elemento di qua non fa quello che fa chi lo veste di là. Misurato con Chromium
(`scripts/verifica-anteprima.mjs`: editor demo e pagina vera dell'overlay, stesso
elemento, stessa configurazione, misure in pixel di tela):

| cosa | editor | diretta | causa | rimedio |
|---|---|---|---|---|
| player (cassetta, slim) | 739 px | 509 px | `.m-corpo` aveva solo un tetto: largo quanto il titolo del brano | `width: var(--m-testo, 13em)`: una larghezza, non un tetto; in diretta il player non cambia più col brano |
| player (cassetta) | 478 px | 511 px | il pannello ha `* { box-sizing: border-box }`, la pagina dell'overlay no | dentro la tela il modello di scatola è quello dell'overlay, con specificità zero (`:where`), così ogni regola della pelle continua a vincere |
| widget (media) | 38 px alti | 33 px | interlinea 1.6 e corpo 15 px del pannello, ereditati | la tela parte dalla base tipografica della pagina dell'overlay: `font: 16px/normal` e lo stesso carattere |
| chat, larghezza | ignorata | `max-width: N vw` | la larghezza scelta non arrivava sulla tela | `N/100 × 1920` px sulla tela |
| contatore | 305×115 | 326×83 | la veste (`padding`, `line-height`) stava nello `<style>` di `overlay.html`, che la tela non legge; e il corpo era scalato due volte (font × s e `scale(s)`) | la veste sta nella pelle, letta da tutte e due le pagine; il corpo è quello base e la scala la dà il contenitore, una volta |
| contatore, grassetto | 800 | 500 | ripiego al contrario quando non è mai stato scelto | lo stesso ripiego di `db.js` (`!!grassetto`) |

Due cose che non sono misure ma coerenza: le righe della chat sulla tela portano
la classe dell'animazione scelta, e un elemento **spento** resta sulla tela ma
sbiadito (in diretta non c'è; sulla tela serve trovarlo per riaccenderlo).

L'autoprova rompe quattro cose una per volta (il tetto al posto della larghezza,
la larghezza della chat, la doppia scala, il ripiego del grassetto) e pretende
che il cancello diventi rosso.

## Il banco: comodo e robusto per costruzione

Un inventario del banco, letto tutto con lo stesso occhio, ha dato sette cose che
si rompevano in silenzio e quattro che mancavano. Ognuna qui, con la struttura
che la rende impossibile, non la patch che la nasconde.

| cosa | prima | ora |
|---|---|---|
| l'aspetto non salvato | l'ispettore era escluso in blocco dal segnale «hai modifiche non salvate»: colori, font, forma e CSS cambiati e persi con un ricaricamento, senza un avviso | l'ispettore sporca la pagina, tranne le sue parti che si salvano da sole (posizione, obiettivi, contatori, player, conto alla rovescia). Cambiare scheda, overlay o pagina chiede prima; `ASP_SALVA_A_MANO` dice quali blocchi escono solo con «Salva overlay» |
| gli ascoltatori | ogni visita alla scheda li legava di nuovo: alla N-esima visita, N salvataggi per un clic | una guardia (`scheda.dataset.collegato`), e `rendiTrascinabile` non si ripete su un elemento gia' trascinabile |
| i salvataggi | quattro timer diversi e chiamate immediate: due richieste in volo con l'elenco completo degli overlay, l'ultima arrivata vinceva e poteva riportare indietro l'altra | una coda sola (`_spingiOverlays`): una richiesta in volo, le altre si fondono nella prossima, che parte con lo stato piu' recente; anche «Salva overlay» ci passa |
| la rete che cade | ingoiata (`.catch(() => {})`): l'editor sembrava salvato | un avviso, al piu' uno ogni dieci secondi, e la pagina resta sporca |
| l'annulla | riaccendeva gli interruttori prima di fermare la storia: una decina di richieste per un Ctrl+Z | la storia si ferma prima; e comunque c'e' la coda |
| il ripristino di un contatore | scriveva la sua scheda e salvava solo il layout: non restava | `_salvaPos` salva anche il contatore; la funzione morta che avrebbe dovuto farlo e' sparita |
| la griglia | la regola toglieva lo sfondo a un figlio che non lo aveva | la regola tocca chi ha lo sfondo |
| lo zoom | ancorato in alto a sinistra: l'elemento su cui lavoravi scappava | attorno al centro della finestra, o al puntatore con Ctrl+rotella |
| il trascinamento | a ogni pixel si rifaceva l'`innerHTML` del pannello dei livelli | si aggiorna la riga del livello; il pannello si ridisegna al rilascio |
| **blocco di un livello** | non c'era | un lucchetto per livello (`ov.blocchi`), salvato con l'overlay e ripulito dal server con le chiavi degli elementi: niente trascinamento, rotella, frecce, allineamento; maniglie nascoste |
| **aggancio** | sempre acceso, Alt per un attimo | una spunta che si ricorda (`banco:aggancia`) |

Prove: `test/contratto/banco-robusto.test.mjs`; il banco vero gira nei cancelli
dell'anteprima (`verifica-anteprima.mjs`), che lo usano come lo usa chi lavora.

Quello che manca ancora, e che si vede: elementi liberi (un testo, un'immagine)
da mettere in scena, e la selezione multipla. Sono una funzione nuova, non una
correzione: hanno bisogno del loro modello (dati per overlay, resa in diretta,
editor) e del loro piano.

## Il riquadro: la scatola dell'elemento

Chiesto così: «non allargo la chat, il player o l'alert: allargo il **perimetro**
dell'elemento, e lui si adatta». Prima il modello, poi il codice.

### Due modi di posare, non uno solo

Un elemento posato sulla tela oggi è un **punto**: `{x, y, s, r}`, dove `x` e `y`
sono la posizione lungo la corsa disponibile (0 a filo, 100 a filo dall'altra
parte), `s` una scala uniforme e `r` la rotazione. L'elemento tiene la sua
misura naturale: la chat è larga quanto la riga più lunga, l'alert quanto il
suo testo.

Un **riquadro** è l'altro modo: `{x, y, w, h, r}`, un rettangolo sulla tela in
centesimi (`x, y` l'angolo in alto a sinistra, `w, h` la misura), e l'elemento
**si adatta al rettangolo**. Il riquadro ha `w` e `h`; il punto ha `s`. La
presenza di `w` e `h` decide il modo, in un posto solo (`xyOk`, nel server, e
`riquadro.js`, letto da tutte e due le pagine). Nessuna migrazione: quello che
è posato oggi resta un punto e si disegna come prima.

### Cosa vuol dire «si adatta»: il riquadro è la scatola

Chiesto meglio, dopo la prima versione: «vorrei poter allargare il riquadro
come voglio: più grande, più stretto, rettangolare, quadrato». La prima
versione scalava l'elemento perché stesse nel riquadro e lo centrava: il
perimetro era un limite, non una forma, e attorno restava vuoto. Ora **il
riquadro è la scatola dell'elemento**, per tutti con la stessa regola:

1. l'elemento si impagina alla larghezza del riquadro e si misura (`W × H`,
   la sua misura minima);
2. un fattore solo, `k = min(w / W, h / H)`: niente deformazioni, il carattere
   e le proporzioni interne restano quelle;
3. la scatola dell'elemento diventa il riquadro (`w / k × h / k` prima della
   scala, cioè esattamente `w × h` dopo), e il contenuto si dispone dentro.

Quindi **l'altezza dà la grandezza, la larghezza dà lo spazio**. Nel player la
colonna del testo parte dalla sua misura minima (5 em) e cresce a riempire:
un riquadro largo è un player con tanto posto per il titolo, un riquadro quasi
quadrato è un player quasi quadrato con la colonna stretta e il titolo che
scorre, un riquadro basso e largo è una barra sottile. La copertina «sopra»
(poster) è limitata dall'altezza, così un riquadro largo non la fa esplodere.
Gli altri si centrano nella loro scatola: la pastiglia del widget, il conto, il
contatore, la carta dell'alert (che diventa una colonna centrata); le barre
degli obiettivi riempiono la larghezza; la chat e la sfida a tempo sono
contenitori, e la scatola è il contenitore, non le righe o le carte. La
«larghezza del testo» del player, nel riquadro, non conta più: la larghezza è
quella del riquadro.

Sulla tela dello Studio l'elemento sta in un involucro: è l'involucro a
diventare la scatola, l'elemento dentro la riempie (100% × 100%) e riceve la
stessa classe `riquadro`, così i selettori della pelle sono gli stessi di qua e
di là. La rotazione vale sempre, attorno al centro del riquadro.

**La misura è quella minima, non quella tappata.** Guardando la resa: il player
in un riquadro quasi quadrato usciva 403 px sulla tela e 288 in diretta. La
misura di `W` si fa con il tetto di larghezza del riquadro addosso (serve ai
blocchi di testo, che vanno a capo a quella larghezza); ma il player ha una
larghezza minima sotto cui non va (copertina, colonna da 5 em, onde), e in
diretta la sua `min-width` vince sul tetto, mentre sulla tela l'involucro si
tappa e l'elemento dentro sporge. Ora la misura è almeno quella dell'elemento
dentro l'involucro (`offsetWidth` di tutti e due, il maggiore); non
`scrollWidth`, che in diretta conta anche lo sfondo sfocato del player, che
sporge dalla carta apposta, e avrebbe dato una misura diversa di qua e di là (l'ha
detto il cancello: 374 contro 405). E il player nel riquadro dichiara
`min-width: max-content`, così sotto il suo minimo non si stringe mai: nel
quadrato la colonna resta 5 em e il titolo scorre, invece di ridursi a una
lettera. I tempi, in una colonna stretta, vanno a capo sotto la barra invece di
tagliarsi; nella copertina «sopra» la copertina tiene la sua misura (12 em per
il suo fattore) e il testo prende tutta la larghezza; nella cassetta l'etichetta
prende tutta la larghezza.

**Tirando i bordi si vede.** Sulla tela, mentre si tira un bordo, la chat
perdeva le righe: a ogni posa le righe che non ci stavano venivano tolte dal
DOM, e allargando non tornavano; e l'anteprima aveva due sole righe finte, così
la scatola restava vuota. Ora a ogni posa la chat finta si riscrive con quante
righe ne mostrerebbe la diretta (il «massimo righe» della scheda) e poi si
taglia: stringendo escono, allargando tornano, e la scatola si vede piena.

**Le maniglie non sono righe.** Sulla tela le maniglie di scala e rotazione
stanno dentro la scatola della chat, ultime fra i figli, nascoste quando c'è il
riquadro. Il trabocco guardava il primo e l'ultimo figlio: l'ultimo era una
maniglia nascosta (altezza zero, quindi mai «sotto il bordo»), e il taglio
poteva contare le maniglie fra le cose da togliere. Ora trabocco e taglio
guardano solo i figli disegnati, in `riquadro.js`, per tutte e due le pagine.

### Perché lo stesso codice da tutte e due le parti

Adattarsi richiede una **misura** (quanto è largo e alto l'elemento dopo essere
andato a capo) e la misura la sa solo il browser. Quindi il calcolo non può
stare nel CSS e non può stare in due posti: `riquadro.js` (`SB_RIQUADRO.posa`)
lo fa per la pagina dell'overlay e per la tela dell'editor, che gli passano lo
stesso rettangolo e la stessa tela di 1920×1080. È l'unico modo in cui
«anteprima = diretta» resta vero anche qui, e il cancello lo misura.

### Nell'editor

Un elemento selezionato mostra il suo riquadro: otto maniglie (quattro angoli,
quattro lati) sul rettangolo, non sul contenuto scalato. Tirare un lato o un
angolo di un elemento posato a punto lo **trasforma in riquadro** partendo dal
rettangolo che occupa in quel momento: niente salta. I bordi si agganciano alla
griglia della tela (dodici caselle per lato), ai terzi, al centro e ai bordi
degli altri riquadri. Nelle proprietà: X, Y, larghezza e altezza in centesimi,
e la spunta «riquadro» per tornare al punto (che riparte dal centro, a scala
100). Il resto (lucchetto, aggancio, annulla, salvataggi in coda) vale uguale.

### Il limite dichiarato

La misura si fa a ogni posa, non a ogni riga di chat che arriva: un alert
lunghissimo che va a capo si stringe per starci; una chat non si stringe mai,
taglia dall'alto. Il riquadro non può uscire dalla tela (`x + w ≤ 100`,
`y + h ≤ 100`) e non può essere più piccolo di due centesimi per lato.

### Misurato

Il cancello dell'anteprima ha i casi di riquadro, editor contro pagina vera
dell'overlay: la chat in un riquadro di due caselle per tre (320×270 px di
tela, otto righe lunghe: la scatola è il riquadro e nessuna riga è tagliata a
metà), un widget in 20×10, il player in 30×12, un alert senza icona in 40×15,
e il player in un 15×26 quasi quadrato. Per tutti **la scatola è il riquadro**,
su tutti e due i lati, di qua e di là; nel 30×12 la colonna del testo del
player è più larga dei suoi 13 em di serie, e uguale sulle due pagine.
L'autoprova toglie la riga che fa della scatola il riquadro e pretende il rosso. Il rosso trovato strada facendo: nell'editor gli elementi stanno in un
involucro, in diretta sono l'elemento stesso, e il tetto di larghezza del
riquadro stringeva scatole diverse (player 636 contro 404 px). Ora il tetto va
anche sull'elemento dentro l'involucro, ed è `riquadro.js` a metterlo prima di
misurare.

L'autoprova ha trovato anche un cieco: la chat impila le righe dal basso, quindi
ciò che non ci sta finisce **sopra** il bordo, e `scrollHeight` quel lato non lo
conta. Il taglio non tagliava e la misura diceva che andava tutto bene. Ora
tanto il taglio quanto la misura guardano la geometria delle righe (la prima
sopra il bordo, l'ultima sotto), in `riquadro.js`, in un posto solo.

## L'immagine di riferimento sotto la tela

Chiesto: «mettere un'immagine di riferimento come sfondo di tutto l'editor,
per gestire la personalizzazione con screenshot della scena, grafiche già
esistenti». Il modello: un **file del tuo computer** (scelto col tasto
«Riferimento», incollato con Ctrl+V sulla scheda, o trascinato sulla tela),
disegnato sotto la tela a coprirla (centrato), con un cursore di trasparenza e
un interruttore per nasconderlo, per overlay. Non è un elemento della scena:
non si salva col tema e non va in onda.

**Dove sta.** Nel browser, in IndexedDB (`socialbot-studio`, archivio
`riferimenti`, chiave = l'overlay), e da nessun'altra parte: uno screenshot
della scena può contenere di tutto, e caricarlo sul server sarebbe un dato in
più da custodire per una cosa che serve solo a chi sta componendo. Niente
indirizzo remoto da cui prendere l'immagine, per la stessa ragione (e per non
aprire una porta a richieste verso terzi). Il CSP del pannello ammetteva già
`blob:` fra le sorgenti delle immagini: non è cambiato niente lì. Solo
`image/*`, fino a 25 MB. Cambiando overlay si rilegge la sua immagine, se
c'è; ricaricando la pagina torna com'era, con la stessa trasparenza.

**Misurato.** `scripts/verifica-riferimento.mjs` apre lo Studio, mette un PNG
da un Blob (senza rete), guarda lo strato e la trasparenza, ricarica subito la
pagina e pretende che torni com'era (appena messa, prima di toccare altro: chi
la salvasse solo al primo ritocco della trasparenza qui sarebbe rosso), poi la
cambia, spegne e riaccende, ricarica e pretende che torni con la trasparenza
nuova, poi toglie e ricarica e pretende che non torni; e per tutto il giro nessuna richiesta al server porta
un corpo grande quanto un'immagine. L'autoprova toglie la scrittura in
IndexedDB (dopo la ricarica sparisce) e l'applicazione della trasparenza, e
pretende il rosso.

**La spunta che non reggeva al clic.** Messa in linea, «Mostra» non faceva
niente. Il cancello la provava con un evento `change` costruito a mano, e
passava; un clic vero no. Tracciando gli eventi di un clic: la spunta cambia,
parte `input`, e fra `input` e `change` un ascoltatore generico del pannello
rifà l'anteprima; l'anteprima ridisegna anche il riferimento, e il ridisegno
rimette la spunta com'è nello stato, che è ancora quello vecchio; quando arriva
`change`, il mio ascoltatore legge una spunta già tornata indietro. Lo stato
ora si aggiorna già all'`input` (che sul bersaglio arriva prima di chiunque
altro), e il cancello clicca davvero, sulla spunta e su «Togli»: un evento
finto prova solo che il codice risponde a un evento finto.

## Il conto che «parte da solo» non partiva, e la sfida che non si spostava

**Il conto alla rovescia.** La spunta «parte da solo quando l'overlay si apre»
faceva esattamente quello: partiva quando una sorgente ricaricava la pagina.
Chi la accendeva dal pannello, con l'overlay già aperto, non vedeva succedere
niente: la pagina veniva avvisata del nuovo tema e chiedeva al server di far
partire il conto, ma il pannello non lo veniva a sapere, la tela mostrava i
minuti fermi e la scritta «in corso» non compariva. E finché il flusso moriva a
ogni riavvio (sopra), spesso non partiva nemmeno in diretta. Ora il conto parte
nel momento in cui la spunta passa da spenta ad accesa (il **passaggio**, non lo
stato: salvare un titolo con la spunta già accesa non fa ripartire un conto
finito), con la stessa funzione che usa l'overlay, che non fa ripartire un conto
già in corso. La risposta del salvataggio porta l'istante di fine, il pannello
lo mostra contare, e aprendo lo Studio chiede dov'è il conto: può essere partito
da una sorgente mentre il pannello non guardava.

**La sfida a tempo.** La carta della penitenza riscattata coi punti canale
(parola vietata o obbligata, colpi) aveva un angolo scelto nella scheda delle
penitenze e nient'altro: non era un elemento della scena, non si spostava, non
aveva un riquadro, e la sua veste stava nell'HTML dell'overlay, dove la tela non
la vede. Ora è l'elemento «Sfida a tempo»: si accende per overlay, si sposta, ha
il riquadro, la veste sta nella pelle, e sulla carta si legge **quanto manca**
(la durata la manda il server con l'avvio; l'orologio si spegne con la carta).
La posa avviene dopo il contenuto, come per gli altri, e si rifà a ogni colpo,
perché il numero cambia larghezza. Il cancello dell'anteprima la misura come
gli altri elementi.

**E la carta non compariva mai.** Misurandola in diretta il cancello non l'ha
trovata: l'evento di avvio parte dal server come `{ tipo: 'penitenza',
...contenuto }`, e il contenuto porta a sua volta un `tipo` (parola o lettera,
ciò che la sfida vieta o impone) che, scritto dopo, **sovrascriveva la busta**.
L'overlay riceveva un evento di tipo «parola» e lo lasciava cadere: dal giorno
in cui la sfida è nata, la sua carta non è mai andata in onda; i colpi e la
fine, che non hanno quel campo, arrivavano a una carta che non c'era. Non è un
caso da coprire: due cose diverse non possono avere lo stesso nome. La busta si
scrive per ultima, così il contenuto non può toccarla, e ciò che la sfida vieta
viaggia come `cosa`. Il cancello dell'anteprima manda l'evento com'è davvero,
e la prova di contratto lo guarda uscire dal server.

## Il player, pezzo per pezzo

**La domanda.** «Più libertà con il player: la grandezza dello sfondo, la
copertina, il vinile, il titolo, gli artisti, insomma tutto.»

**Il modello.** Il player è uno **scheletro in em**: la Dimensione (piccola,
media, grande, enorme) dà il corpo del carattere, il Corpo (slim, normale,
cicciotto) dà le proporzioni, e ogni pezzo è un multiplo del corpo: la
copertina 4,5 em, la seconda riga 0,84 em, i tempi 0,68 em, la barra 0,26 em,
le onde 1,1 em, lo spazio attorno 0,5 × 0,74 em. Tutto scala insieme, ed è
giusto così: cambiare Dimensione non deve sfasare le parti. La libertà chiesta
non è un secondo scheletro: è **un fattore per pezzo, sopra lo scheletro**.
Otto misure (spazio attorno, copertina, vinile, prima riga, seconda riga,
tempi, barra, onde), da 40 a 250 per cento, con 100 = come il corpo. E, a
scelta, **colori a parte**: acceso l'interruttore, prima riga, seconda riga,
tempi, barra e onde hanno ognuno il suo colore; spento, seguono testo e accento
come prima.

**L'invariante che regge tutto: a 100 non cambia niente.** Nel foglio ogni
misura è `calc(<valore di prima> * var(--k-…, 1))`: senza variabile, o con la
variabile a 1, il foglio risolve esattamente ai valori di ieri. Chi non tocca i
cursori vede il player di sempre, e i dodici casi del cancello dell'anteprima
che già misuravano il player continuano a misurare le stesse cose. La copertina
aveva otto definizioni di `--cov` (una per corpo e per tema): ora ognuna dice
la **base** (`--cov-base`) e il fattore si applica in un posto solo.

**Una lista, un traduttore.** I pezzi sono una lista sola, scritta in
`stile.js` (per il server, che pulisce) e in `presets.js` (per il browser), e
una prova le confronta. La traduzione da configurazione a variabili CSS è una
funzione sola, `PLAYER_VARS.applica`, che la tela dello Studio e la pagina
dell'overlay chiamano allo stesso modo: è per questo che l'anteprima resta la
diretta anche qui. La funzione **toglie** la variabile quando una misura torna a
100 o un colore si spegne: l'elemento vive fra un disegno e l'altro, e una
variabile lasciata lì sarebbe una scelta che nessuno ha più fatto. I campi del
pannello nascono dalla stessa lista: aggiungere un pezzo è aggiungerlo lì.

**Il vinile.** Nel tema vinile il disco sporge da dietro la copertina; farlo
più grande vuol dire farlo sporgere di più, senza che la scatola lo tagli: la
scatola della copertina si allarga con lui (`.62 + fattore` copertine) e si
alza quando il disco supera la copertina (`max(1, fattore)`), e la copertina
resta centrata in altezza invece di stirarsi.

**Le animazioni sono del tema.** Un tema del player è tre cose, tutte nel
foglio, dentro il suo blocco `.tema-X`: la texture della carta (`--velo`), la
figura dietro o attorno alla copertina (uno pseudo-elemento di `.m-cover`) e
il suo moto (una `@keyframes mus-*`). Il codice non sa niente: mette la classe.
Vinile e CD sporgono da dietro e girano, la cassetta gira le bobine, l'esagono
taglia la copertina a sei lati e le mette attorno un anello che ruota piano.
Tre regole rendono sicuro aggiungerne uno: quello che si muove vive in uno
pseudo-elemento o nel velo, mai in un nodo che l'anteprima misura (una
rotazione cambia il rettangolo che `getBoundingClientRect` legge, e il
cancello dell'anteprima non sarebbe più vero); ciò che gira parte in pausa e
si accende con `.suona`; e la scatola della copertina contiene la figura per
costruzione, così il riquadro non la taglia. La misura «Figura dietro» (la
chiave resta `vinile`) scala il disco o l'anello in ogni tema che ne ha uno.
`test/contratto/player-temi.test.mjs` fissa le tre regole.

**Entrata e uscita del tema.** Il gesto con cui la figura arriva e se ne va è
del tema, e imita come si ripone l'oggetto vero. Il vinile: la custodia entra,
il disco scivola fuori e prende giri (una rampa d'avvio, poi il giro costante);
all'uscita frena fino a fermarsi, rientra nella custodia, e solo allora la
custodia se ne va. Il CD: la custodia si apre (un coperchio trasparente ruota
sul cardine sinistro, `.m-cover::before` con `perspective`), il disco esce e
gira; all'uscita si ferma, rientra, il coperchio si chiude, la custodia va via.
La cassetta: le bobine prendono giri; all'uscita si fermano e la cassetta viene
espulsa (si inclina e scende). Il terminale si accende come un tubo catodico
(una riga luminosa che si apre in schermo, poi le righe di testo una alla volta)
e si spegne come i televisori di una volta: l'immagine si schiaccia in una riga
orizzontale e poi in un punto, perché la deflessione verticale cade prima di
quella orizzontale. Il manga è una pagina: si volta per entrare e si volta per
uscire, sul cardine sinistro. L'esagono si dispiega da una linea a sei lati
mentre l'anello scende ruotando, e si ripiega al contrario.

Come sono fatti. Le rampe di avvio e di frenata sono `@keyframes` sulla
proprietà `rotate` (`mus-avvia`, `mus-frena`), con l'angolo di frenata in
`--frenata` = ω·T/2 per ogni tema, mentre il giro costante resta su
`transform`: le due si sommano, e il giro di base parte con un ritardo pari
alla fine della rampa, così la velocità è continua. Alla frenata il giro di
base si mette in pausa e la rampa lo porta a zero. Tutto il resto sono
`transition` su `translate`, `scale`, `rotate`, `opacity` e `clip-path`, che
partono solo al cambio di stato (`dentro`, `esce`): nell'editor `dentro` c'è
dalla nascita, quindi niente riavvii a ogni ritocco, e il tasto «Rivedi
l'entrata» le fa vedere apposta. Un giradischi a trazione diretta frena in una
frazione di secondo, uno a cinghia scivola per qualche secondo: qui la frenata
dura mezzo secondo, perché l'uscita intera deve finire prima degli 880 ms dopo
cui il nodo sparisce (`togliMusica`), e il test lo confronta con il numero nel
codice. Con «riduci animazioni» la figura è al suo posto e basta. Il cancello
dell'anteprima misura a riposo: aspetta che ogni transizione e animazione
finita sia conclusa, perché un rettangolo letto a metà corsa non è una misura.

**In colonna.** In diretta il player è largo `max-content` e la carta ha un
tetto di dodici copertine: il corpo del testo (13 em di serie) superava il tetto
e i tempi uscivano dal bordo, mentre l'editor, che non usa `max-content`, li
teneva dentro. Ora il corpo non supera la carta (`max-width: 100%`), la copertina
sta al centro e la riga dei tempi pure: editor e diretta danno la stessa misura
anche qui (caso «colonna» del cancello).

**Il cancello.** Lo stesso player (tema vinile, due righe, tempi) si misura tre
volte, pezzo per pezzo (copertina, disco, righe, tempi, barra, onde, spazio
attorno, colori): senza misure, con le misure a 100, con misure e colori
propri. Le prime due devono essere identiche, in editor e in diretta; la terza
deve coincidere fra editor e diretta **e derivare dalla seconda coi fattori
scelti** (copertina ×1,5, vinile ×1,3, prima riga ×1,3, seconda ×0,8, tempi
×1,2, barra ×2, onde ×1,6, spazio ×1,4, e i colori sul testo). Non basta che
le due pagine siano d'accordo: devono essere d'accordo sulla cosa giusta.
L'autoprova toglie la chiamata al traduttore in diretta e pretende il rosso.

**Il tetto che rubava spazio al testo.** Guardando la resa con la copertina a
150 e il disco a 130, il titolo usciva tagliato. La carta aveva un tetto fisso
(27 em; 22 em la cassetta) che non c'entrava con niente di scelto: la colonna
del testo ha già una larghezza esplicita (11, 13 o 15 em per corpo, o quella
scritta in «Larghezza del testo»), e quando copertina più colonna superavano il
tetto era la colonna a cedere, in silenzio. Lo stesso succedeva già a chi
scriveva una larghezza del testo sopra i 20 em: la scelta veniva ignorata senza
dirlo. Il tetto non c'è più: la carta è larga quanto i suoi pezzi, il titolo
troppo lungo scorre come sempre, e chi vuole contenere il player usa il
riquadro, che è fatto per quello. Il cancello ora guarda anche che la colonna
del testo non perda un pixel quando la copertina cresce, e l'autoprova rimette
il tetto per vedere il rosso. Nel tema vinile, poi, la copertina è sempre
quadrata: il foro da disco che le veniva disegnato al centro era di un'altra
forma, e non c'è più.

**La variabile che restava.** Il cancello, che apre l'editor una volta e ci fa
passare tutti i casi come farebbe una persona in una sessione, ha visto la tela
più larga della diretta di 94 px: un caso precedente aveva scritto «Larghezza
del testo 20» e la tela se l'era tenuta anche dopo lo zero. Chi mette le
variabili sulla tela saltava i valori nulli invece di toglierli, e l'elemento
vive fra un disegno e l'altro. Ora un valore nullo **toglie** la variabile, in
editor e in diretta allo stesso modo: nullo vuol dire «come dice la pelle», non
«come l'ultima volta». L'autoprova rimette il salto e pretende il rosso.

L'autoprova del cancello ora si può mirare: `node scripts/verifica-anteprima.mjs
--selftest=player` prova solo le rotture la cui descrizione contiene «player»;
ogni rottura costa un giro intero delle due pagine, e chi ne aggiunge una la
prova da sola senza aspettare le altre.


## Le parti del player si mettono dove vuoi

Chiesto: «più spazio di manovra, anche la posizione delle varie parti del
player vorrei poterle spostare dove e come voglio». La quinta **Disposizione**
del player è **libera**: la carta è una scatola e ogni pezzo — copertina, prima
riga, seconda riga, barra, tempi, onde — ha una posizione sua dentro la scatola.

Il modello, da cui viene tutto il resto:

1. **La misura di un pezzo la danno le Misure**, come prima. La disposizione
   libera dà la posizione, non la misura: i due comandi non si sovrappongono.
   Fanno eccezione i pezzi che hanno una *lunghezza*, le due righe e la barra:
   per loro c'è anche una larghezza in centesimi della carta, e per le righe
   l'allineamento del testo (a sinistra, al centro, a destra), perché la
   lunghezza di una riga non è una misura del carattere.
2. **La posizione è la corsa**, la stessa idea degli elementi sulla tela: `x = 0`
   a filo a sinistra dello spazio interno, `100` a filo a destra, `50` al centro;
   così `y`. Lo spazio interno è la carta meno lo «spazio attorno», quindi un
   pezzo a 0 resta dentro il bordo e il cursore «spazio attorno» continua a
   valere. In CSS: `left = pad + (100% − 2·pad) · x/100` e `translate: −x%`,
   che sottrae x% della larghezza del pezzo stesso; il pezzo tiene la sua misura
   e la formula non ha bisogno di conoscerla. Il padding è un valore solo per
   corpo (`--m-px`, `--m-py`), letto dal `padding` e dalla corsa.
3. **La scatola è il riquadro.** Quando scegli «libera» lo Studio accende il
   riquadro, se non c'è, sul rettangolo che il player occupa in quel momento.
   La misura *naturale* della carta (quella che decide la scala dentro il
   riquadro, e la grandezza senza) si misura al passaggio e si salva in em
   (`parti.scatola`): è la stessa che aveva prima, quindi la scala non salta.
   Un dato salvato a mano senza scatola ha quella di serie, 22 × 5,5 em.
4. **Si parte da dove sono.** Nel passaggio a «libera» lo Studio misura i pezzi
   nella disposizione che c'era (`offsetLeft`/`offsetTop`, che non risentono
   delle trasformazioni) e li converte in corsa: il player non cambia di un
   pixel nel momento in cui diventa libero, poi si trascina. «Come in riga»
   rifà la stessa misura sulla riga. Il server ha comunque una tabella di serie
   che somiglia alla riga, scritta uguale nel browser (test).
5. **Un traduttore solo.** `PLAYER_VARS.applica` scrive anche
   `--p-<pezzo>-x/y` (e `-w`, `-a` dove servono) quando la disposizione è
   libera, e le toglie sennò; tela e diretta lo chiamavano già.
6. **I temi non cambiano.** Le figure vivono negli pseudo-elementi della
   copertina e nel velo: spostare la copertina sposta la figura; entrate e
   uscite stanno sulla carta e sugli pseudo-elementi. Il «cambio brano», che
   animava la colonna del testo (in libera non è più una scatola), anima i
   pezzi. Nella cassetta l'etichetta color carta passa sulle righe.

Sulla tela: con il player selezionato, trascinare un pezzo lo sposta (il
delta del puntatore torna in coordinate locali con la scala e la rotazione
dell'involucro, poi in corsa); righe e barra hanno una maniglia sul bordo
destro per la larghezza, che tiene fermo il bordo sinistro. Esc annulla il
gesto, annulla e ripeti ricordano anche le parti. Nell'ispettore, «Le parti»:
pezzo, X, Y, larghezza, testo.

Il cancello dell'anteprima ha due misure nuove: la libera in un riquadro con
una tabella nota, ogni pezzo nello stesso posto sulla tela e in diretta; e
**contro il numero**, 0 a filo del padding, 100 a filo dall'altra parte, 50 al
centro, la larghezza in centesimi dell'interno, il testo allineato come chiesto.
La seconda esiste perché un difetto nel traduttore lo condividerebbero le due
pagine, e il confronto fra loro non lo vedrebbe. L'autoprova lo spegne
(`const libera = false`) e guarda che il cancello diventi rosso.


## Un video nel player

Chiesto: «mettere come sfondo anche il video (se presente) al posto della
copertina sfocata; il video può andare anche in chiaro sulla copertina, ma non
su CD e vinile». Prima la verità sul «se presente»: Spotify **non dà un video
del brano**. I brevi loop che si vedono nell'app (Canvas) non stanno nell'API
pubblica, e leggerli da dove non si dovrebbe è contro le sue condizioni. Quindi
il video è **dello streamer**: un loop corto caricato fra gli Effetti, muto,
scelto nel player con «Il mio video».

Il modello, in tre righe:

1. Il dato è un riferimento a un effetto (`video: 'effetto:<comando>'`), come il
   suono o l'immagine di un alert. Il server lo risolve in indirizzo quando
   consegna il tema all'overlay (`_musicaConVideo`), e solo se l'effetto è
   davvero un video.
2. Dove va lo dicono due scelte già esistenti: **Sfondo → il mio video,
   sfocato** (stesso velo e stessa sfocatura della copertina) e **Copertina → il
   mio video, in chiaro** (riempie la copertina, `object-fit: cover`). Con i
   temi vinile e CD la copertina resta quella del disco, per costruzione: la
   lista dei temi senza video sta nel traduttore, in un posto solo.
3. **Un traduttore solo**, `PLAYER_VARS.video`, letto dalla tela e dalla
   diretta: crea il `<video>` una volta, cambia l'indirizzo solo se è cambiato
   (il player si ridisegna a ogni lettura di Spotify, il video non deve
   ricominciare), e con «riduci animazioni» lo lascia fermo al primo fotogramma.

## Due chat nello stesso overlay: unite, divise, o una sola

Chi trasmette su due piattaforme ha due chat che finiscono nello stesso riquadro.
Prima ci finivano davvero, ma **senza dire da dove venivano**: l'evento che parte
verso l'overlay portava nome, colore, stemmi ed emote, non l'origine. A schermo
una riga di Kick e una di Twitch erano la stessa cosa, e nessuna impostazione
messa a valle avrebbe potuto separarle: il dato non c'era più.

Per questo la correzione non comincia da un'opzione, ma dal messaggio.

### L'origine è un dato del messaggio

`alerts.onChat` mette `piattaforma` nell'evento, accanto al nome di chi scrive.
Un messaggio che non la dichiara vale `twitch`, perché quando il bot è nato
Twitch era l'unica: i canali di prima non cambiano di una virgola. Lo stesso
campo viaggia anche negli eventi `chat_raw`, quelli che alimentano il pannello
chat dello Studio, dove infatti il segno compare appena ci sono due piattaforme
collegate.

### La scelta è una riga di `mostra`, non una struttura nuova

Un overlay **è** un layout: `mostra` dice cosa ci compare, e si scrive solo il
«no» (quel che non c'è, compare). Obiettivi e contatori, che sono tanti, portano
l'id nella chiave: `goal:<id>`, `cont:<id>`. Le sorgenti della chat seguono la
stessa regola:

    mostra['chat:twitch'] === false   → in QUESTO overlay le righe di Twitch non entrano
    mostra['chat:kick']   === false   → e lo stesso per Kick
    mostra.chat           === false   → la chat non c'è affatto, e la scelta di sopra non conta

Da qui discendono tutti e tre i casi, senza aggiungere niente:

- **unite**: tutte e due accese nello stesso overlay, un riquadro solo;
- **divise**: un secondo overlay con l'altra accesa. Ha un link suo, quindi in
  regia sono due fonti, ognuna dove si vuole. Questo è anche il motivo per cui
  non serve un secondo riquadro dentro allo stesso overlay: la posizione la dà
  la fonte in regia, non noi;
- **una sola a schermo**: si spegne l'altra. La chat **resta accesa**: il bot
  continua a leggerla, a rispondere, a contare monete e ore. Togliere dallo
  schermo non è spegnere.

Chi non è nell'elenco delle sorgenti (oggi YouTube) non si può spegnere, quindi
si vede: è la stessa regola del resto, e domani basta aggiungerlo alla lista.

### Il segno: i nostri disegni, non i loro marchi

Quando due chat stanno insieme, una riga non dice più da sola da dove viene.
`segnaDaDove` (nello stile della chat, quindi **per overlay**) mette davanti a
ogni riga un segno piccolo, nel colore del testo. Sono le nostre icone, non i
marchi di chi ospita la chat: un marchio altrui in sovraimpressione non è nostro
da mettere, e cambierebbe forma ogni volta che lo cambiano loro. È spento di
base: chi trasmette su una sola piattaforma non deve ritrovarsi un simbolo che
non gli serve.

### Il cancello

`node scripts/verifica-chat-divise.mjs` apre una pagina overlay **vera** con un
finto bot, le manda una riga per sorgente e guarda cosa resta a schermo: unite,
spenta una, spenta l'altra, il messaggio senza origine, il segno quando serve e
due segni diversi per due sorgenti diverse. L'autoprova rompe quattro cose una
per volta — il filtro, l'origine, il segno, e i due segni resi uguali — e
pretende il rosso da tutte.

Nell'editor la stessa scelta si vede sulla tela: l'anteprima disegna le righe
delle sole sorgenti accese, col segno se è acceso. Anteprima uguale alla diretta,
come per tutto il resto.

## Un elenco solo: la colonna dei livelli

Il difetto: lo STESSO elenco dei livelli stava due volte nella stessa pagina.
Una accanto alla tela (nome, percentuali, lucchetto, occhio) e una
millecinquecento pixel piu' sotto, fuori schermo, in righe con «Modifica» e un
interruttore. Quattordici righe, una per livello. E l'interruttore della seconda
voleva dire esattamente la stessa cosa dell'occhio della prima.

Peggio: l'occhio della colonna **accendeva la casella della seconda lista**. La
lista non era decorativa, era il posto dove quello stato viveva. Meta' dello
stato stava nei dati dell'overlay (i singoli obiettivi, contatori, cartelli) e
meta' in quelle caselle.

**Adesso la verita' e' una sola: i dati dell'overlay.** `mostraChk(k)` legge
`_quiDentro(k)`, l'occhio scrive nei dati e basta, e quello che si salva si
RICAVA dallo stato invece di enumerare le famiglie a mano. L'elenco scritto a
mano si era gia' dimenticato i cartelli: nascondere un cartello in un overlay
non restava nascosto dopo il salvataggio.

## Il livello e' l'unita'

Il giro era: scegli il livello accanto alla tela, a destra si accende
«Proprieta'» e ti fa cambiare SOLO il vestito; per cambiare cosa quel livello
FA devi scorrere via dalla tela, trovare la seconda lista, premere «Modifica» e
aprire una sezione ancora piu' giu'. Si cambiava alla cieca.

Il meccanismo per farlo bene c'era gia' — `raccogliBlocchi()` prende le sezioni
e le trasporta dentro l'ispettore come fisarmoniche — ma copriva **cinque
livelli su tredici**. Gli altri erano rimasti indietro, e quei rimasugli erano
il mappazzone.

Adesso ogni livello risponde alla domanda «dove si cambia?», e ci sono solo tre
risposte possibili:

- **qui accanto alla tela**: alert, chat, obiettivi, cartelli, player, timer,
  treno — la sezione vive dentro «Proprieta'»;
- **in un'altra scheda, e ti ci porto**: i contatori stanno in Comandi, la
  sfida a tempo in Penitenze, gli effetti e CONSOLify nelle loro
  (`ALTROVE` in `app.js`), con un tasto che ci va;
- **si veste e basta**: ultimo follower, ultimo sub — il vestito e' gia' li'.

Il cartellino «spento» nella colonna adesso e' premibile: prima era un punto
esclamativo che diceva il problema, e il tasto per accenderlo stava nella
seconda lista, cioe' fuori schermo.

Misurato col browser: la scheda e' passata da **2079 a 1289 pixel** di altezza,
e la tela resta in vista qualunque livello si scelga.

## L'hype train: rispecchiato, non ricalcolato

Il treno lo potevamo contare da soli — i sub e i bit ci passano davanti uno per
uno, bastava sommarli. Sarebbe stata una SECONDA verita' che con la prima non
torna, e nessuno se ne sarebbe accorto se non mettendo Twitch e l'overlay uno
accanto all'altro: le soglie cambiano da canale a canale e nel tempo, esistono i
treni CONDIVISI fra piu' canali, ed esistono i treni speciali (tesoro, golden
kappa) che non seguono la regola normale.

Quindi si rispecchia. Twitch manda `channel.hype_train.begin/progress/end` —
nella **versione 2**, perche' la 1 e' deprecata e non sa dei treni condivisi —
e `src/features/treno.js` li trasforma in uno stato:

    { id, livello, quanto, meta, totale, tipo, condiviso, inizio, scade, finito, record, chi[] }

Da qui scendono tre cose che se no sarebbero state tre decisioni da prendere:

- **Un treno solo.** Lo stato porta l'`id` del treno di Twitch: un evento con un
  id diverso SOSTITUISCE, non somma. Due treni in memoria non possono esistere
  perche' non c'e' posto dove metterli.
- **Non conta niente.** I sub e i bit che fanno crescere il treno sono gia'
  passati dagli obiettivi e dal subathon, uno per uno. Contarli qui sarebbe
  contarli due volte: lo stesso difetto delle raffiche di sub regalati, con la
  stessa cura.
- **La scadenza la dice Twitch.** Si salva l'ISTANTE e chi lo mostra fa la
  sottrazione, come il conto alla rovescia. Nessun secondo orologio da tenere
  d'accordo, e un riavvio non sposta niente.

Lo stato sta in `settings.overlayStato.treno`, come gli obiettivi: un OBS
riaperto a meta' treno lo ritrova nel `tema`, e il bot riavviato pure. Mentre il
treno corre arriva anche via SSE (`{ tipo: 'treno', treno }`), quindi la scena
segue i livelli senza ricaricare niente.

**Due interruttori, non uno.** `attivo` governa l'elemento in scena, `annuncia`
le righe in chat, e sono separati di proposito: c'e' chi il treno ce l'ha gia'
a schermo dal pannello di Twitch e vuole solo le righe, e chi il contrario. Se
sono spenti tutti e due lo stato non si scrive nemmeno: un canale che il treno
non lo usa non paga una riga.

In chat si parla in quattro momenti — parte, manca poco al livello dopo, ci
arriva, finisce — e basta. `progress` arriva a OGNI contributo: annunciarli
tutti vorrebbe dire cento righe del bot su un treno da cento sub.

**Il richiamo dell'ultimo quarto** (`testoQuasi`) e' l'unico che aggiunge un
invito invece di raccontare un fatto: quando la salita e' oltre i tre quarti
(`QUASI = 0.75`) il bot dice quanti punti mancano al livello dopo. La frazione,
e non un numero fisso, perche' il traguardo cresce a ogni livello e un «mancano
100» che al livello 1 e' molto al livello 5 non e' niente.

Si dice **una volta per livello**: lo stato del treno si porta dietro
`avvisato`, il livello dal quale il richiamo e' gia' uscito. E si segna speso
SOLO quando c'e' davvero da dirlo — non quando il treno parte gia' oltre i tre
quarti, ne' quando sale di livello nello stesso evento, perche' in quei due casi
la frase che va detta e' un'altra e il richiamo resterebbe bruciato senza essere
mai uscito. E' un difetto che si vede solo mettendo in fila le frasi di una
serata intera, quindi la porta e' chiusa per costruzione, non per correzione.

Attenzione a `{prossimo}`: `quanto` e `meta` Twitch li manda verso il livello
DOPO, quindi i punti che mancano sono per quello. Il richiamo scrive
`{prossimo}` (= `livello + 1`); `{livello}` resta il livello in cui si e', come
in tutte le altre frasi. Svuotando la casella la frase non si dice piu'.

Serve lo scope `channel:read:hype_train`. Chi aveva gia' collegato il canale se
lo vede chiedere dal pannello con la strada dei permessi mancanti che c'e' gia'.

Cancelli: `node scripts/verifica-treno.mjs` (`--selftest`) apre un overlay vero
e guarda che un treno scaduto se ne vada, che un elemento spento resti spento,
che la scena segua i livelli e che le due scelte (chi spinge, il record) contino
davvero. `verifica-anteprima` misura che il treno dello Studio e quello in onda
siano lo stesso oggetto. `test/unita/treno.test.mjs` tiene ferme le regole.

## I cartelli: una scritta o un'immagine, e sono la stessa cosa

Erano due voci separate nella lista delle cose da fare — «testo libero» e
«immagine» — e per un pezzo sono sembrate due lavori. Non lo sono: un cartello
e' un pezzo di scena che NON lo muove nessun evento. Lo scrivi o lo scegli tu,
e sta li'. Quel che cambia fra i due tipi e' solo da dove viene il contenuto —
dalle parole o dalla libreria Effetti — mentre posto, veste, riquadro,
interruttore per overlay e trascinamento sono quelli di tutti gli altri
elementi.

Quindi una lista sola (`settings.overlayCartelli`), un editor solo, un disegno
solo con due rami, una famiglia di chiavi sola (`cart:<id>`, come `goal:<id>`).
Due elenchi separati avrebbero voluto dire la stessa cosa detta due volte, e
due occasioni di dirla diversa.

L'immagine **non si carica qui**: si sceglie fra quelle che stanno gia' nella
libreria Effetti, che ha gia' i suoi limiti, il suo spazio e il suo modo di
servirle — e arriva all'overlay gia' risolta in indirizzo, come le icone dei
widget. Un secondo posto dove caricare file sarebbe stato un secondo posto dove
dimenticarsi di cancellarli.

### Il difetto che si vedeva solo guardando

Un cartello nasce **senza scatola**: sono parole posate sulla scena, non un
pannello. Messo a schermo la prima volta, invece, era una lastra rosa piena.

Il riquadro di ogni elemento si disegna a due strati: sotto la cornice, dipinta
col colore d'accento, sopra il riempimento, rientrato dello spessore della
cornice. Con la cornice a «nessuna» lo spessore va a zero e il riempimento la
copre tutta: invisibile, ma **dipinta**. Bastava portare l'opacita' del
riempimento a zero — cioe' chiedere «nessuno sfondo» — per ritrovarsi la
cornice al posto dell'elemento. Non era un difetto dei cartelli: valeva per
obiettivi, conto alla rovescia, treno, chiunque. Un cartello e' solo il primo
che nasce con lo sfondo a zero, e quindi il primo a inciamparci.

La cura sta dove sta il difetto, una riga in `overlay-skin.css`:
`.cornice-nessuna::before { background: none; }`. Per tutti gli altri elementi
non cambia niente — la cornice era gia' invisibile, coperta.

Cancelli: `node scripts/verifica-cartelli.mjs` (`--selftest`) apre un overlay
vero e guarda che «nessuno sfondo» voglia dire nessuno sfondo cornice compresa,
che un cartello vuoto non lasci una scatola in scena, che gli interruttori
contino uno per uno, e che la larghezza mandi a capo. `verifica-anteprima`
misura che il cartello dello Studio e quello in onda siano lo stesso oggetto.
`test/unita/cartelli.test.mjs` tiene ferma la porta d'ingresso.

## Le occasioni: un secondo strato, non una seconda copia

«I miei overlay ce li ho, ma stasera e' subathon e voglio anche questo.»

Un'occasione e' un pacchetto di **differenze** sopra la base di un overlay:
cosa compare in piu', cosa sparisce, cosa sta da un'altra parte. Si accende e
compare, si spegne e torna tutto com'era. Il modello sta in
`src/features/occasioni.js`; nel pannello vive accanto alla tendina
dell'overlay, e la fascia sopra la tela dice sempre su cosa stai lavorando.

Tre difetti non possono esistere, e non perche' qualcuno si ricordi di evitarli:

- **Spegnere non perde niente.** L'occasione non tocca mai la base: e' un
  secondo strato. Quando la spegni non c'e' niente da ripristinare, perche' non
  c'era niente da rovinare.
- **Le differenze sono sparse.** Ci stanno solo le chiavi che l'occasione nomina
  davvero — e solo quelle che **differiscono**: se accendi una cosa che la base
  gia' mostra, la chiave sparisce invece di restare li' a dire una cosa ovvia.
  Riempirle tutte, come si riempie una base, farebbe smettere l'occasione di
  essere un secondo strato: diventerebbe una copia che sovrascrive tutto, e
  cambiare la base domani non si vedrebbe piu' sotto l'occasione.
- **Una sola accesa** per overlay. Due pacchetti sovrapposti e la domanda «cosa
  sto vedendo?» non ha piu' una risposta sola.

### Dove sta la cucitura, nel pannello

Il banco leggeva e scriveva le visibilita' e le posizioni dalla stessa funzione.
Sono due gesti diversi, e adesso sono due funzioni diverse:

- `_baseMostra()` / `_baseXY()` — l'overlay di tutti i giorni;
- `_ovMostra()` / `_ovXY()` — **dove finiscono le scritture**: la base, oppure le
  differenze dell'occasione aperta;
- `_vedoMostra()` / `_vedoXY()` — **cosa si vede**: la base con sopra le
  differenze. Tutte le letture passano di qui.

Da questa separazione discende che il difetto «modifico l'occasione e mi ritrovo
cambiata la base» non si puo' scrivere: la scrittura non ha un modo per
arrivarci. Per lo stesso motivo `salvaLayoutOverlay` normalizza `ov.mostra` in
mappa completa **solo** quando non c'e' un'occasione aperta.

### Chi possiede l'interruttore

Accendere un'occasione e' un gesto da diretta e passa da una porta sua,
`POST /api/streamer/occasione`, che emette `{tipo:'tema'}`: la fonte in OBS si
riprende il tema da sola e nessuno tocca niente di la'. Il salvataggio normale
degli overlay porta il **disegno** delle occasioni ma non il loro interruttore:
lo stato `attiva` lo riprende sempre da quello memorizzato. Cosi' un salvataggio
partito un istante prima non puo' rimettere indietro l'interruttore, perche'
non lo tocca proprio.

### I modelli si guardano

`Nuova…` apre i modelli con l'anteprima di **questo** overlay con l'aggiunta gia'
accesa, nelle posizioni vere (lo stesso `_posDove` della tela), piu' la riga di
cosa cambierebbe davvero. Anteprima e creazione passano dalla stessa funzione
(`_occDiff`), quindi la scheda non puo' promettere una cosa e il tasto «Crea»
farne un'altra. Se un modello dice «queste cose ce le hai gia' cosi'» non e'
rotto: su quell'overlay quella roba e' gia' accesa.

La riga di un livello si aggiorna da sola anche quando cambia solo il segno:
`_aggiornaRigaLivello(k, st)` riscrive la posizione E la targhetta
dell'occasione, perche' sono la stessa riga e dipendono dallo stesso fatto.

Cancello: `node scripts/verifica-occasioni.mjs` (`--selftest`) prende l'impronta
della scena di tutti i giorni, fa tutto il giro — crea, togli, rimetti, sposta,
accendi, spegni, elimina — e pretende la stessa impronta identica alla fine. Lo
spostamento lo fa dal campo X delle Proprieta' dopo aver scelto il livello **dal
nome**: al centro della riga c'e' il lucchetto, e premere li' non seleziona
niente (non e' un difetto, e' dove sta il lucchetto).
`test/unita/occasioni.test.mjs` tiene ferme le regole del modello.

### La posizione scritta nei livelli

La riga di un livello dice dove sta quell'elemento, e quel numero si calcola
dalla **misura** dell'elemento. Gli elementi che la scena ricostruisce a ogni
giro (obiettivi, player, timer, treno, sfida) nascono vuoti e si riempiono un
istante dopo: chiederne la posizione prima non da' un errore, da' un numero
finto — l'angolo di partenza — e la colonna dei livelli restava li' a
raccontare una posizione che non era quella vera (91% invece di 98%, per un
elemento appoggiato al bordo destro).

Non c'e' un istante buono da indovinare: il numero dipende dalla misura, quindi
si rifa' **quando la misura cambia**. Un `ResizeObserver` sugli elementi della
scena (presi con `_nodo`, la stessa regola di tutto il resto) riscrive le righe
appena qualcosa si ridimensiona.

## Lo Studio che non si impunta

Il banco era pesante, e non per una ragione sola. Misurato con il profilo del
browser, il tempo non stava quasi mai nel codice: stava nel DISEGNO.

### Un gradiente non si sfoca

Sotto tutto c'e' un campo decorativo (`#an-campo`, e il gemello
`#anime-sfondo::after`): una sfumatura radiale che finisce in trasparente, con
sopra `filter: blur(64px)`. La sfocatura non aggiunge niente che si veda — una
sfumatura e' gia' morbida — e costringe il browser a disegnare mezzo schermo in
un foglio a parte e a sfocarlo da capo a ogni ridisegno, cioe' a ogni movimento
dentro lo Studio.

Misura, sullo stesso computer, trascinando un elemento: **171,8 ms per
movimento con la sfocatura, 94,5 ms senza** — togliendo solo quella riga e
allargando l'ultima tappa della sfumatura, che costa zero. A occhio la pagina e'
la stessa (confrontate due schermate, home e pannello).

### Un movimento non e' un fotogramma

Il puntatore manda eventi piu' spesso di quanto lo schermo disegni. A ogni
evento il trascinamento rifaceva tutto il giro: scrivere lo stile dell'elemento,
poi RILEGGERE le misure dalla pagina — che obbliga il browser a rifare i conti
del layout li' per li' — e poi riscrivere. Due o tre volte dentro lo stesso
fotogramma, per un disegno solo.

`aFotogramma(fn)` fa il lavoro una volta per fotogramma, con l'ultima posizione
arrivata: quelle in mezzo non le avrebbe viste nessuno. La corrispondenza fra la
funzione vera e quella a fotogrammi sta in una `WeakMap`, cosi' `addEventListener`
e `removeEventListener` parlano dello stesso oggetto senza che ogni punto di
trascinamento debba ricordarsene; `_stacca(fn)` toglie l'ascoltatore e annulla
il fotogramma gia' in coda, cosi' finito il trascinamento non arriva un ultimo
movimento in ritardo.

E la lettura che obbligava a rimisurare e' sparita alla radice:
`_aggiornaRigaLivello(k, st)` prende la posizione da chi ce l'ha gia' in mano.
Rimisurarla dalla pagina serviva solo a riottenere lo stesso numero.

Stessa ragione per il controllo delle misure della scena: rifa' **solo** la riga
di chi e' cambiato davvero, e mai durante un trascinamento.

## L'elenco dei livelli e' quello che c'e'

La colonna mostrava TUTTO quello che potrebbe stare in un overlay, comprese le
dodici cose che in quell'overlay non c'erano: un elenco lungo in cui il proprio
overlay era la minoranza, e in cui per capire cosa c'era davvero bisognava
leggere riga per riga.

Adesso i livelli sono i livelli. Quello che non c'e' sta dietro **«Aggiungi»**,
che e' anche il posto dove si scopre cosa si puo' mettere — cartelli e immagini
compresi, che e' la voce che nessuno trovava. Creare un cartello, un obiettivo o
un contatore si fa dove si e' sempre fatto: li' c'e' solo la strada, non una
seconda copia del gesto.

Un'eccezione, e ha una ragione: una cosa **tolta da un'occasione** resta
nell'elenco, segnata «via». E' un cambiamento che l'occasione fa, e va visto e
disfatto dov'e' successo. Una cosa che non c'e' e basta, invece, non e' un
cambiamento di nessuno.

## L'anteprima di un modello mostra la differenza

Una miniatura fedele di una scena piena, larga un dito, e' una pila di
rettangoli sovrapposti: e' illeggibile per come e' fatta, non per come e'
disegnata. E quello che uno vuole sapere guardando un modello e' una cosa sola:
**cosa cambierebbe da me**.

Quindi la scena che hai gia' fa da ombra (`.occ-o`), e le cose che il modello
nomina vengono avanti come targhette (`.occ-c`) grandi abbastanza da vedersi
anche quando in scena sono un filo di testo, in tre stati: `piu` (entra), `via`
(esce), `gia` (ce l'hai gia' cosi'). Due targhette che si coprirebbero si
scostano per regola, non per caso. Una famiglia che il modello nomina ma di cui
non hai ancora nessun pezzo — nessun cartello, nessun obiettivo — sta in fondo:
l'anteprima non fa finta che quella riga del modello non ci sia.

## Un contatore si fa dove si mette

Nell'«Aggiungi» del banco ci sono tre cose da creare: un cartello, un obiettivo,
un contatore. Le prime due nascono li' e restano li'. La terza no: premere «Un
contatore» apriva un'altra scheda. Il motivo c'era, ed e' vero: un cartello e un
obiettivo vivono **nella bozza dell'overlay**, mentre un contatore e' roba del
**canale** — ha un comando, lo muovono i moderatori in chat, esiste anche con
l'overlay spento. Quindi, per farlo, ti si mandava a casa sua.

Il difetto non e' dove vive il contatore: e' che per crearlo si perdeva la tela,
la selezione e il filo del discorso. E il pezzo che mancava sono quattro campi.
Quindi il banco li chiede li' dov'e', e poi bussa alla **stessa porta di
sempre** (`POST /api/contatori`): non esiste una seconda strada per far nascere
un contatore, e quindi non c'e' una seconda regola da tenere allineata. Nasce
con `overlay: {mostra: true}`, perche' chi lo crea da qui lo sta mettendo sulla
tela, e poi entra nella scena da `_mettiDentro`, come qualunque altro elemento.

Le uscite sono tre, e la seconda e' quella che serve davvero:

- **Crea e mettilo qui** — l'overlay che stai modificando prende il contatore.
- **Crea in una copia dell'overlay** — la scena che hai viene duplicata (stesso
  layout, stesso aspetto, link suo) e il contatore si accende **solo li'**.
  Serve a provare una cosa senza toccare l'overlay che in questo momento e'
  dentro OBS, e senza rifare la scena da capo.
- **Esci** — non nasce niente.

Il punto delicato della copia e' cosa si scrive **nell'originale**. La mappa
`mostra` di un overlay e' un elenco di eccezioni: una chiave assente vuol dire
«c'e'». Un contatore appena nato non e' in nessuna mappa, quindi comparirebbe in
tutti gli overlay. Percio' la copia si prende prima (senza la chiave, cioe' col
contatore acceso) e nell'originale si scrive `mostra['cont:<comando>'] = false`.
L'originale resta esattamente com'era anche da dentro: non «per come lo
guardiamo», ma per quello che c'e' scritto.

Un'ultima cosa, e vale per costruzione: passare a un altro overlay con modifiche
non salvate le perde, e la domanda «salvo?» esiste gia' in `scegliOverlay`.
Anche questa strada ci passa (`_chiediPrimaDiUscire`), invece di saltarla o di
rifarne una sua.

## Il cancello del banco era fermo al primo controllo

Il collaudo del banco (`scripts/verifica-studio.mjs`) gira in un browser vero, e
si e' scoperto che **moriva alla prima verifica**: l'occhio di un livello. Non
era un guasto del prodotto — era il collaudo rimasto indietro. Da quando i
livelli sono l'elenco di **chi c'e'**, togliere una cosa non la lascia spenta in
fondo alla lista: la riga se ne va e ricompare tra quelle da rimettere. Il
collaudo cercava ancora la riga spenta, non la trovava, e scoppiava.

Un cancello che scoppia alla prima riga e' peggio di un cancello assente: tutto
quello che veniva dopo non era mai stato guardato. Sotto c'erano cinque
semafori rossi, e vale la pena tenere separato cosa era misura e cosa era
prodotto.

**Misura** (lo strumento sporcava e poi si stupiva):

- Il collaudo scrive nei campi dello stile per provare l'anteprima, e cosi'
  accende la barra «hai modifiche non salvate». Da li' in poi ogni cambio di
  overlay apriva — giustamente — la domanda «salvo?», e il velo fermava tutto
  quello che veniva dopo. Da qui il finto «gli overlay si copiano il layout» e
  il trascinamento che non si muoveva.
- Il trascinamento si applica **a fotogramma**, e chi molla il tasto annulla la
  coda: il collaudo mandava movimento e rilascio nello stesso istante, quindi
  misurava la coda buttata via, non il trascinamento. Un dito vero un fotogramma
  ce lo mette sempre.
- «Ogni elemento mostra i suoi comandi» pretendeva un blocco anche dalla sfida a
  tempo, che si veste nella sua scheda e al suo posto mostra il rimando. La
  regola giusta e': o i comandi sono qui, o c'e' scritto dove sono.

**Prodotto** (difetti veri, che nessuno vedeva perche' il cancello era fermo):

- L'annulla di un elemento ne riportava indietro un altro. Le modifiche vicine
  nel tempo si **fondono** in un solo passo di annulla, e la chiave della
  fusione era solo `prop:x` — senza l'elemento. Muovere la x di A e poi quella
  di B entro 700 ms diventava un passo solo. La rotella la chiave giusta ce
  l'aveva gia' (`rotella:<elemento>`): stessa regola scritta in due posti, e in
  uno dei due mancava un pezzo.
- Le maniglie di un elemento **bloccato** o **nel riquadro** erano dichiarate
  nascoste, ma due righe piu' sotto `.ap-el.sel .ap-handle { display: flex }`
  aveva la stessa specificita' e veniva dopo. Le due eccezioni erano morte da
  quando esistevano: l'eccezione va dopo la regola, non prima.
- Su un elemento piccolo la maniglia «ridimensiona» finisce **sotto** la
  maniglia del lato del riquadro, che sta piu' in alto e prende il clic: ci
  cliccavi sopra e invece di ingrandirlo gli davi un perimetro. Un tasto che
  mente e' peggio di un tasto che non c'e', quindi sotto la misura in cui i due
  cerchi si toccano (`SCALA_SPAZIO`) la maniglia propria non si disegna — la
  dimensione resta nel pannello, con Alt+rotella e col perimetro.
