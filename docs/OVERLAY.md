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

I **contatori** non avevano proprio dei comandi lì: si vestivano dalla scheda
Comandi, un'altra scheda ancora. Ora hanno il loro blocco come tutti — cosa
scrivono, colori, carattere, con o senza sfondo — costruito dalla lista che il
banco già conosce.

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
