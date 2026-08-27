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
