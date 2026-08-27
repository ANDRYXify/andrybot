# Moto e suono

## Cosa dice la ricerca, e cosa ne abbiamo fatto

Le fonti sono concordi su quattro cose, e tutte e quattro erano disattese qui.

**1. La pressione va asimmetrica: veloce giu, elastica su.** E l'asimmetria a
dare la sensazione fisica. Qui la discesa e la risalita usavano **la stessa
curva da 414 ms**: premere un bottone durava quanto lasciarlo, e il risultato
era molle. Ora sono due tempi diversi: **90 ms secchi in discesa**, **340 ms di
molla in risalita**.

**2. Le micro-interazioni stanno fra 100 e 200 ms**, le transizioni di pannello
fra 200 e 400. I nostri tempi ora ci stanno dentro.

**3. Solo `transform` e `opacity`.** Gia rispettato.

**4. `linear()` per le molle.** Una molla vera si puo esprimere come funzione di
temporizzazione CSS, e allora gira **sul compositor**: fisica senza un byte di
JavaScript. Qui c'erano gia (`--molla-lieve/medio/pieno/scena`, 65 punti, con
sovraelongazione reale), ma vedi sotto.

## Il difetto vero non era la mancanza di animazione

Era che **cinque regole diverse si contendevano la pressione di un bottone**:

| dove | cosa diceva |
| --- | --- |
| `style.css` | `.btn:active { scale(.97); transition-duration: .07s }` |
| `anime.css` (in alto) | `transition: transform .18s var(--an-morbido)` |
| `anime.css` (in alto) | `.btn:active { transform: translateY(1px) }` |
| `anime.css` (a meta) | la mia, con i tempi asimmetrici |
| `anime.css` (in fondo) | la magnetica, `transform .16s var(--molla-lieve)`, `:active .08s` |

Vinceva l'ultima, e nessuna delle altre serviva a niente. Non e un problema di
gusto: e **una cosa detta cinque volte in cinque modi diversi**, ed e per questo
che il moto non si sentiva coeso.

Adesso ce n'e **una** per lo stato a riposo e **una** per la pressione. Stessa
cosa per le transizioni di pagina: `::view-transition-old/new(contenuto)` era
definita **tre volte** (due in `style.css`, una in `anime.css`); ora sta solo in
`anime.css`.

Misurato dopo: `transition-duration` del bottone = `0.34s` sul transform (la
molla di risalita) e `var(--t-molla-giu)` in `:active`.

## Transizioni fra pagine

`@view-transition { navigation: auto }` piu i nomi persistenti (`testata`,
`marchio`, `piede`) sulla barra in alto, sul logo e sul piede: navigando fra
pagine che condividono il foglio di stile, quegli elementi **restano** e il
resto si scambia, invece del lampo bianco. Verificato che ogni nome sia **unico
nella sua pagina** — se e duplicato il browser annulla tutta la transizione.

Nota onesta: `/privacy` e `/termini` oggi sono pagine **autonome**, con un
design viola scuro che non c'entra col resto del sito, e non caricano
`style.css`. Fino a quando restano cosi, fra loro e la home la transizione non
puo esserci (servono entrambe le sponde). Non e un difetto della transizione: e
che quelle due pagine vanno ridisegnate.

## Il suono

L'unico suono che c'era era un **oscillatore sinusoidale nudo** attaccato
direttamente all'uscita: nessun filtro, nessun transiente, nessuno spazio. E il
«bip da MIDI» che non vogliamo.

La ricerca sul suono d'interfaccia dice tre cose:

- **il transiente e tutto**: e l'attacco a far sentire un suono «pieno», non il
  volume;
- **si stratifica**: un clic secco piu un soffio sotto;
- **la sintesi FM** con inviluppi percussivi rapidi su altezza e ampiezza da
  pop, clic e campanelli;
- per l'interfaccia, **piu corto e meglio**.

`suono.js` e costruito cosi:

- **catena**: `bus → passa-basso 9,2 kHz → compressore → uscita`, con una
  mandata al 16% verso un **riverbero da stanza generato** (0,19 s, non una
  cattedrale: serve spazio, non coda);
- **transiente**: raffica di rumore attraverso un passa-banda che scende, e
  l'attacco;
- **corpo**: FM (portante + modulante) con inviluppo di altezza;
- **soffio**: rumore con passa-banda che spazza, per aperture e chiusure;
- **otto voci**: `tocco`, `passa`, `premi`, `commuta`, `conferma`, `errore`,
  `apri`, `chiudi`.

### Come si evitano le sporcizie

Le «sporcizie» di un suono sintetico sono quasi sempre **scalini**: un guadagno
che cambia di colpo produce un clic che non c'entra col suono. Quindi:

- ogni guadagno parte da `0.0001` e sale con una rampa, mai un salto;
- le rampe esponenziali non arrivano mai a zero esatto (impossibile), si
  fermano a `0.0001` e poi si azzera **dopo** la fine;
- i nodi si fermano **dopo** che l'inviluppo e finito;
- un **compressore** in fondo impedisce la saturazione quando due suoni si
  sovrappongono;
- **passa-basso a 9,2 kHz** sul bus: via il frizzio digitale;
- **limite di frequenza**: niente piu di un suono ogni 24 ms, niente lo stesso
  suono due volte entro 55 ms, niente oltre 6 in volo.

### Come si verifica che siano puliti

`scratchpad/t_suono.mjs` rende ogni voce **fuori tempo reale** con
`OfflineAudioContext` e la analizza campione per campione.

La misura interessante e come si riconosce un clic sporco. Un primo tentativo
guardava il **salto massimo fra due campioni**, e bocciava `chiudi`: sbagliato,
perche il rumore filtrato ha per natura salti grandi quanto se stesso. Un clic
vero e un salto **isolato**, quindi si confronta il massimo col **99,9-esimo
percentile** della stessa forma d'onda. Sotto 3,5× e texture; sopra e un
artefatto.

| voce | picco | isolamento | durata | RMS |
| --- | ---: | ---: | ---: | ---: |
| tocco | 0,065 | 2,05 | 23 ms | −58 dB |
| passa | 0,056 | 1,68 | 24 ms | −59 dB |
| premi | 0,143 | 1,67 | 137 ms | −41 dB |
| commuta | 0,099 | 1,53 | 95 ms | −48 dB |
| conferma | 0,199 | 1,02 | 250 ms | −32 dB |
| errore | 0,213 | 1,10 | 251 ms | −32 dB |
| apri | 0,447 | 1,26 | 170 ms | −36 dB |
| chiudi | 0,337 | 1,40 | 154 ms | −37 dB |

Nessuna satura, nessuna ha uno scalino isolato, **tutte nascono e muoiono nel
silenzio**, e le durate stanno nella finestra dell'interfaccia.

Alla prima taratura due voci risultavano **mute** (picco 0,001): un passa-banda
con Q alto su rumore butta via quasi tutta l'energia, e i guadagni non lo
compensavano. Senza la misura non me ne sarei accorto: a orecchio «non si sente
niente» si sarebbe confuso con «il volume e basso».

### Il consenso

Il suono e **spento** finche non lo accendi, e finche e spento **non viene
nemmeno creato l'AudioContext** — verificato. L'interruttore sta nella barra in
alto (e nel cassetto su schermo stretto), ricorda la scelta, e alla prima
accensione suona `conferma` cosi senti subito com'e. Il motore audio si sveglia
al primo gesto, come richiedono i browser.

## Prestazioni

Niente e peggiorato: FCP 176 ms, LCP 868 ms, CLS 0,0029, blocco 149 ms.

---

## Revisione: il suono per significato, il puntatore per proprietario

### Perché i primi suoni suonavano male

Erano costruiti con oscillatori a frequenze definite. `conferma` faceva 660 Hz poi
990 Hz: una quinta giusta ascendente. `errore` faceva 220 → 176: una terza minore
discendente. La Plancia aveva per conto suo un secondo motore audio che emetteva
sinusoidi pure a 330, 430, 480, 520, 620, 700 e 760 Hz, collegate direttamente
all'uscita senza filtro né compressore.

Un oscillatore a frequenza fissa produce **una nota**. Un'interfaccia che canta
note è una musichetta, e suona come un giocattolo. Il difetto non era nella
taratura: era nel metodo di sintesi.

### Cosa suona invece un'interfaccia di qualità

Un buon suono d'interfaccia è l'impronta acustica di **un oggetto piccolo e
smorzato che viene toccato**: un impulso eccita alcune risonanze del materiale,
che decadono in poche decine di millisecondi. Non c'è una portante e non c'è
un'altezza — perché i modi di una barra non stanno in rapporto armonico.

I rapporti dei primi tre modi flessionali di una barra libera-libera sono
**1 : 2.756 : 5.404**. Sono numeri reali della fisica delle barre, ed è
esattamente il motivo per cui una barra colpita non ha un'altezza definita:
nessuna fondamentale comune da cui l'orecchio possa estrarre una nota.

Il motore ora fa questo (`suono.js`):

- un **mazzuolo**: rumore passa-basso di 3,8 ms, il contatto;
- tre **modi**: passa-banda a `f0`, `f0·2.756`, `f0·5.404`, con pesi 1 / 0,42 / 0,19
  e decadimenti decrescenti;
- inviluppi sempre esponenziali da 0,0001, mai un valore imposto di colpo;
- bus passa-basso a 5,4 kHz e compressore: niente frizzi, niente stanza.

Il riverbero a convoluzione è stato tolto: un oggetto che tocchi non sta in una
sala. La differenza fra "va bene" e "è andata male" la fanno **registro e durata**
(132 Hz per 150 ms contro 296 Hz per 85 ms), non un intervallo musicale.

C'è ora **un solo motore audio**: la Plancia e il pilota non sintetizzano più
niente per conto proprio, chiedono una voce a `SB_SUONO`.

### La misura che tiene onesto il risultato

`t_suono.mjs` misura, oltre a picco e sporcizia, l'**altezza percepibile**:
autocorrelazione normalizzata del segmento sostenuto, cercando il massimo fra
60 e 1200 Hz. Una nota pura vale ~0,99. Le otto voci attuali stanno fra 0,12 e
0,45, con la soglia di allarme a 0,72.

| voce | picco | durata | tonalità |
|---|---|---|---|
| tocco | 0,089 | 19 ms | 0,28 |
| premi | 0,144 | 29 ms | 0,36 |
| commuta | 0,118 | 22 ms | 0,21 |
| conferma | 0,161 | 88 ms | 0,45 |
| errore | 0,157 | 93 ms | 0,45 |
| apri | 0,088 | 85 ms | 0,25 |
| chiudi | 0,089 | 68 ms | 0,25 |
| passa | 0,050 | 16 ms | 0,12 |

### Quando si sente qualcosa

La regola vecchia legava il suono al **tipo di elemento**: qualunque bottone o
link faceva `premi`, e ogni `pointerover` faceva `passa`. Così lo stesso suono
usciva per cose che significano cose diverse, e il mouse che passeggiava sulla
pagina produceva rumore continuo. Un checkbox ne faceva due (uno al `pointerdown`,
uno al `change`).

La regola nuova lega il suono a **ciò che è accaduto**:

- il passaggio del mouse non fa niente — sfiorare non è un fatto;
- `premi` sulla pressione di un comando che agisce, esclusi i commutabili;
- `commuta` solo su `change`, l'unico evento che dice davvero che lo stato è cambiato;
- `apri` / `chiudi` osservando le classi di stato del corpo pagina — ma **solo se
  nessuna pressione le ha precedute entro 220 ms**: se hai cliccato, il clic ha già
  parlato, e il pannello che aggiunge la sua voce sarebbe un doppione. Parla il
  pannello quando si apre da solo (scorciatoia da tastiera, Esc, gesto del pad);
- `conferma` / `errore` osservando i messaggi che compaiono, che sono l'esito vero.

Un fatto, un suono. `t_agganci.mjs` lo verifica caso per caso, incluso il silenzio
totale a suoni spenti.

L'interruttore sta nella barra in alto accanto a tema e lingua, e nel cassetto su
mobile. I suoni sono **spenti finché non li accendi**. Fino a ora quel bottone era
invisibile: `.suono-toggle` non aveva **nessuna regola CSS** e collassava a 0×0
fra il selettore di lingua e la luna. Ora condivide la regola di `.tema-toggle`
invece di averne una gemella — così i due interruttori non possono più divergere.

### Di chi è il puntatore

C'era una classe sola, `pad-vivo`, che diceva due cose diverse: "esiste un pad
collegato" (che governa il layout e la legenda) e "il pad sta guidando adesso"
(che governa il cursore). Non veniva mai tolta quando l'utente tornava al mouse,
e una regola nascondeva il cursore nella Plancia **sempre** — quindi col mouse la
Plancia diventava inusabile.

Ora i due fatti sono due classi:

- `pad-vivo` — un pad è collegato. Durevole: legenda, spazi, scorciatoie.
- `pad-guida` — il pad è il dispositivo che comanda ora. Volatile: si accende
  quando il pad produce input, si spegne al primo `pointermove` **fidato**
  (`isTrusted`, così gli eventi che il pad stesso sintetizza non se la tolgono
  da sola).

Il disegno del cursore rappresenta **il puntatore, chiunque lo muova**: col mouse
sempre, col pad quando il pad muove il puntatore. Sparisce in un caso solo — nella
Plancia guidata dal pad, dove la navigazione è a fuoco e il puntatore non
rappresenta niente.

Il riconoscimento del pad è stato spostato **fuori** da chi lo consuma: prima
stava dentro il ramo "la Plancia non è aperta", quindi mentre la Plancia era
aperta nessuno si accorgeva che il pad stesse guidando.

### Il tasto mangiato

Lo stesso errore, in forma peggiore, stava nei tasti. I flag di fronte
(`st.a`, `st.b`, …) venivano aggiornati **dentro** il gate `!plancia aperta`.
Premendo A per aprire la Plancia, `st.a` restava bloccato a `true`: alla chiusura,
la prima pressione di A veniva mangiata e il pad sembrava rotto a intermittenza.

Lo stato dei tasti descrive **il pad**, non il contesto: ora si legge e si aggiorna
sempre, e solo l'**azione** resta dentro il gate. Una pressione fatta mentre
comanda la Plancia viene consumata da lei, e nessuna pressione va persa.

---

## Il morph: il bottone diventa la sezione

Premi una voce del menu e quella voce **si allarga fino a diventare la sezione**,
invece di sparire mentre la pagina fa una dissolvenza.

### Non serviva un meccanismo nuovo

`#app` — il contenitore del contenuto — ha già `view-transition-name: contenuto`.
Finora quel gruppo andava da `#app` a `#app`: stesso rettangolo, nessun movimento,
solo la dissolvenza incrociata.

Per avere un morph servono **due elementi diversi che condividono il nome**: il
bottone nello scatto "prima", la sezione in quello "dopo". Quindi il nome non è
un attributo fisso: è un **prestito**.

```
prima:  #app cede il nome  →  il bottone premuto lo tiene
dopo:   il bottone lo restituisce  →  #app lo riprende
```

Il browser fa il resto: interpola posizione e dimensione fra i due rettangoli.
Nella prova: da 219×39 (la voce di menu) a 1003×2113 (la sezione).

### La regola che rende impossibile romperlo

Se **due** elementi portano lo stesso `view-transition-name` nello stesso scatto,
il browser annulla l'intera transizione — non solo quel gruppo. È l'errore in cui
si cade sempre, ed è invisibile finché non si guarda.

Qui non può succedere: il prestito passa da una sola funzione che tiene **una sola
variabile**. Dare il nome a qualcuno significa toglierlo a chi ce l'aveva, nella
stessa istruzione. Non esistono due portatori perché non c'è un modo di scriverli.

### Da dove viene il bottone

L'origine si cattura in **un punto solo**: un ascoltatore in fase di cattura sul
`click` che ricorda l'ultimo `[data-scheda]` premuto. Serve perché la navigazione
è chiamata da tre gestori diversi (menu, barra, cassetto) e passare l'origine a
ognuno avrebbe voluto dire scrivere la stessa cosa in tre posti.

Se la navigazione **non** viene da un clic — un link con hash, una chiamata da
codice, un comando vocale — l'origine non c'è e la transizione resta quella
normale. Corretto: non c'è nessun bottone da cui espandersi.

### Il menu si chiude dopo lo scatto

`chiudiMenuTop()` stava **prima** della transizione. Così, quando il browser
scattava la foto del "prima", la voce era già stata nascosta: niente rettangolo di
partenza, niente morph. Ora la chiusura avviene **dentro** il callback, cioè dopo
lo scatto. In più è anche più bello: la voce non sparisce di colpo, vola via a
diventare la sezione.

### Il ritorno

Il nome prestato torna a `#app` in tre modi indipendenti: nel callback, quando la
transizione finisce (sia che riesca sia che venga interrotta), e con una rete di
sicurezza a 1,6 secondi. In più `vaiAScheda` ripulisce all'ingresso. Se il nome
restasse appeso, `#app` resterebbe con `view-transition-name: none` e **tutte** le
transizioni successive perderebbero il gruppo del contenuto: vale tre righe.

### I tempi

L'espansione dura `--t-medio` (414 ms) con la molla — l'overshoot fa la differenza
fra "si ingrandisce" e "scatta al suo posto". Lo scatto del bottone svanisce in
120 ms, così non lo si vede stirato; il contenuto nuovo entra con 60 ms di ritardo,
mentre il rettangolo si sta ancora aprendo. Entrambi con `object-fit: cover`
ancorato in alto a sinistra: senza, lo snapshot del bottone si deformerebbe
allungandosi.

Sotto i 1200 px di larghezza le transizioni erano già disattivate (là c'è il
cassetto, non il menu): il morph segue quella scelta.

### Il collaudo

`t_morph.mjs` verifica quello che a occhio non si vede: che nello scatto "prima"
il portatore sia **esattamente uno** e sia il bottone premuto, che `#app` abbia
ceduto il nome, che il portatore sia più piccolo della sezione (altrimenti non c'è
espansione), che dopo non resti nessun nome appeso, che il secondo morph funzioni
come il primo, e che una navigazione senza clic **non** rubi il nome.

Che il browser non stia scartando tutto in silenzio si controlla su
`transition.ready`, e che stia davvero interpolando dalla presenza di
`::view-transition-group(contenuto)` fra le animazioni vive.

---

## L'anello che restava appeso

Passando il mouse su una voce di menu il cursore ci morfa sopra: diventa un
rettangolo grande quanto la voce. Cliccando, la sezione cambiava e il menu si
chiudeva — ma **il rettangolo restava lì**, sospeso in alto sopra il titolo della
pagina nuova, 231×50, per sempre.

### Perché

Il motore del cursore si **addormenta quando tutto è fermo**: quando posizione,
dimensione e raggio hanno raggiunto il bersaglio, il ciclo si ferma per non
bruciare un frame al secondo per niente. È giusto così.

Il problema è la sequenza. Al clic il motore era già addormentato da un pezzo (il
mouse era fermo sulla voce). Il clic chiude il menu e cambia sezione: la voce
smette di esistere. Ma il motore dorme, e i suoi risvegli erano legati a
`pointermove`, `scroll`, `resize` e `keydown` — nessuno dei quali accade se il
mouse resta fermo dopo aver cliccato. Nessuno gli diceva che il mondo sotto era
cambiato, e continuava a disegnare l'ultimo rettangolo che aveva calcolato.

Il codice per accorgersene c'era già ed era corretto (`morfabile()` scarta un
elemento scollegato o largo zero): semplicemente non veniva mai eseguito.

### La correzione

Un clic è **l'evento che cambia il DOM**. Da ora apre una finestra di vigilanza:
il motore si sveglia e per 800 ms rimisura la mira a ogni frame, senza potersi
riaddormentare. Dentro quella finestra la voce sparisce, `morfabile()` la scarta,
e il cursore torna libero. `pointerdown` ne apre una più corta.

La finestra dura più delle transizioni di chiusura del menu di proposito: se
durasse meno, il motore si riaddormenterebbe mentre la voce è ancora lì — visibile
e valida — e si ritroverebbe nello stesso stato di prima.

`t_anello3.mjs` riproduce il caso esatto col mouse — morph sulla voce, clic,
attesa — e verifica che l'anello torni piccolo e ci resti.

---

## Le sezioni: una colonna sola e un ordine di comparsa

### Tre larghezze nella stessa vista

La scheda "Come funziona" era larga 720 px, i controlli sotto 1003, le carte 1003:
tre bordi destri diversi allineati a niente, nella stessa colonna. Si vede subito
e non si sa dire cosa non va — che è il modo in cui una pagina diventa "meh".

Il 720 non era arbitrario: una riga di testo larga 1003 px è scomoda da leggere.
Ma quella misura era applicata alla cosa sbagliata. **La larghezza del contenitore
la decide la griglia, quella della riga di testo la leggibilità**: erano confuse
in una. Ora la scheda occupa la colonna come tutto il resto e il testo dentro ha
la sua misura (68 caratteri), quindi si ottengono entrambe le cose invece di
sacrificarne una.

### La guida non ricordava di essere stata chiusa

Il pannello "Come funziona" occupa un quarto di schermo in ogni sezione. È
richiudibile, e il codice **leggeva** lo stato salvato — ma nessuno lo
**scriveva**: chiudevi, cambiavi sezione, tornavi, ed era di nuovo aperto. Ora un
ascoltatore su `toggle` lo registra.

### La sezione entrava al contrario

L'occhiello partiva a 20 ms, il sottotitolo a 340 e finiva a 940. Le carte
partivano a 0 e finivano a 180. **Il contenuto arrivava prima del suo titolo**, e
non per una scelta: erano due animazioni scritte in momenti diversi che non si
conoscevano.

Ora c'è una scala sola, dall'alto in basso come si legge: occhiello 0, titolo 40,
sottotitolo 120, guida 180, controlli 200, prima carta 230, poi 55 ms per carta.
Tutto finisce entro 640 ms. Le carte che entrano dopo, scorrendo, non hanno
ritardo: aspetterebbero due volte.

Traslazione da 14 a 22 px — 14 px non si leggono come movimento, si leggono come
sfarfallio — e la molla del resto del sito al posto della curva che aveva solo
questa animazione.

### Perché l'orchestrazione partiva invisibile

Il primo tentativo non si vedeva affatto, e la ragione vale la pena scriverla:
**durante una transizione di vista il browser mostra uno scatto fermo del nuovo
stato**. Qualunque animazione dei figli gira sotto quello scatto — invisibile — e
quando la transizione finisce è già conclusa.

Quindi la comparsa non parte più alla creazione degli elementi, ma quando il
contenitore ha **finito di aprirsi** (`transition.finished`). Le carte vengono
messe allo stato iniziale prima dello scatto, così lo scatto le cattura
invisibili: il rettangolo del morph si apre vuoto e poi la sezione si popola.
Che è la cosa giusta anche a raccontarla.

Un dettaglio necessario: la classe che avvia la comparsa si toglie, si forza il
ricalcolo e si rimette. Senza quel passaggio il browser non vede un cambiamento e
alla seconda visita della stessa sezione non ripartirebbe niente.

E gli elementi partono invisibili solo dove il movimento è gradito: con "riduci
animazioni" attivo non si nasconde nulla, così non esiste un percorso in cui la
pagina resti vuota.

---

## La barra «modifiche non salvate»: una trappola in tre punti

Tocchi un campo e compare in basso una barra che dice «Hai modifiche non
salvate». Fin qui giusto. Il problema è che da lì **non si usciva**: la barra
offriva solo pulsanti di salvataggio. Niente annulla, niente chiusura. L'unico
modo per liberarsene era salvare — cioè fare la cosa che forse non volevi fare.

Tre difetti distinti, tutti verificati nel codice.

### Nessuna via d'uscita

La barra costruiva i suoi pulsanti copiando quelli di salvataggio del pannello.
Solo quelli. Ora ce ne sono due tipi:

- **Annulla**, che ricarica la sezione dai dati salvati — le modifiche non
  salvate spariscono per davvero, invece di restare in giro con l'avviso
  nascosto;
- la **X**, che mette via l'avviso senza toccare niente: le modifiche restano
  dove sono e la barra torna alla prossima che fai. Anche Esc fa questo, perché
  è quello che si prova per primo.

La X è 28×28 px: sotto i 24 sarebbe fuori norma (WCAG 2.5.8) e soprattutto
difficile da centrare col pollice, che è dove serve di più.

### Copriva il contenuto

Il codice metteva `body.con-salva` quando la barra compariva, e **nessuna regola
CSS usava quella classe**. Una classe scritta per riservare lo spazio, che non
riservava niente: la barra galleggiava sopra l'ultima carta della pagina, cioè
proprio sui comandi che stavi per usare. Ora `con-salva` aggiunge il margine in
fondo, 92 px su desktop e 168 su mobile con la barra di navigazione.

### Tre pulsanti e un indovinello

La barra proponeva **tutti** i salvataggi del pannello: nella sezione Giochi
uscivano «Salva», «Salva punti» e «Salva manche» insieme, e sceglierne uno era
un indovinello — due su tre riguardavano roba che non avevi toccato.

Ora la barra ricorda **in quale carta** stavi scrivendo e propone il salvataggio
di quella. Toccando un campo dei punti escono due pulsanti, non tre: «Annulla» e
«Salva punti».

### Su schermo stretto

La barra va su due righe, quindi il tondo da 999 px non andava più bene e
soprattutto la X, lasciata al flusso naturale, andava a capo da sola finendo
staccata sopra il campo sottostante. Ora l'ordine è esplicito: prima riga testo e
X, seconda riga i pulsanti a piena larghezza, e la barra occupa la larghezza
dello schermo meno i margini.

`t_salva.mjs` prova entrambe le larghezze e verifica che ci sia una via d'uscita,
che la X chiuda davvero e liberi lo spazio, che nessun comando resti coperto e
che i pulsanti proposti non siano più di tre.
