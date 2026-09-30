<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# L'arena delle emote

Chi scrive in chat entra nell'arena con la sua emote. I combattenti si muovono
da soli, raccolgono oggetti, si scontrano; ogni eliminazione si conta, e vince
l'ultimo rimasto. Si vede sull'overlay come un pezzo dello Studio, si regola
tutto dal pannello, e con OBS collegato si accende o si ferma in base alla
scena.

Questo documento è il piano: il modello prima del codice.

## Il modello

### Una partita è una funzione, non un filmato

La partita la devono vedere uguale tutti gli overlay aperti (più scene, più
sorgenti browser), la deve conoscere il server (chi ha vinto, chi paga le
monete, cosa scrive il bot in chat) e deve ripartire giusta se una sorgente si
riapre a metà. Mandare la posizione di ogni combattente venti volte al secondo
a ogni overlay è fragile e pesante; e un overlay che simula per conto suo con
`Math.random` vedrebbe un'altra partita.

Quindi la partita è **deterministica**: un motore solo (`src/web/public/arena.js`,
servito al browser e importato dal server, come `pannelli.js`) che da

- un **seme**,
- l'**elenco dei combattenti** chiuso all'inizio della battaglia,
- le **regole** del canale,
- gli **ingressi a tempo** (le poche cose che la chat può fare durante la
  battaglia, ognuna col suo passo),

calcola passo dopo passo sempre la stessa partita. Il server la fa girare per
sapere l'esito; ogni overlay la fa girare per disegnarla. Si vedono la stessa
partita per costruzione, non perché si tengono allineati.

Il passo è fisso (30 al secondo). Il caso viene da un generatore con seme (lo
stesso schema di `penna.js`), mai da `Math.random`. Niente trigonometria nel
movimento: direzioni fatte di vettori normalizzati con `Math.sqrt`, che lo
standard vuole arrotondata sempre allo stesso modo, così Node e il browser di
OBS fanno gli stessi conti.

Un overlay che si apre a metà chiede al server seme, combattenti, regole,
ingressi e l'istante di partenza, fa correre il motore fino a «adesso» senza
disegnare, e da lì disegna. È anche il difetto che oggi ha il boss (un overlay
riaperto non sa che c'è una partita): qui non si pone.

### Le fasi

1. **Iscrizioni** (di base 60 s). In alto le due righe: «Scrivi in chat per
   entrare!» e «!emote nome per scegliere la tua». Chi entra compare nell'arena,
   fermo, col nome sopra.
2. **Battaglia**. I combattenti si muovono, gli oggetti cadono, gli scontri
   tolgono vita. Dopo un tempo scelto l'arena si stringe, così la partita finisce
   sempre. C'è comunque una durata massima: allo scadere vince chi ha più vita.
3. **Vittoria** (di base 10 s). Il vincitore al centro, grande; in chat il bot lo
   dice, con le eliminazioni e il premio.

### I combattenti

Un cerchio che porta l'emote, il nome sopra (col colore della chat, se lo si
vuole) e sotto una riga: gli oggetti che ha e il teschio con le eliminazioni.
Vita, velocità, danno e grandezza vengono dalle regole; gli oggetti li cambiano.

L'emote di un combattente, nell'ordine:

1. quella scelta con `!emote nome`, ricordata per il canale fra una partita e
   l'altra;
2. la prima emote del messaggio con cui è entrato;
3. una delle emote del canale, scelta dal seme.

Le emote sono quelle che il muro sa già leggere (Twitch nel messaggio, 7TV del
canale e globali).

### Gli oggetti

Cadono nell'arena a intervalli; il primo che li tocca li prende.

| oggetto | cosa fa (di base) |
|---|---|
| spada | danno ×1,5 |
| scudo | danno subito ×0,5 |
| cuore | +40% di vita, fino al massimo |
| stivali | velocità ×1,4 |
| corona | a chi ha più eliminazioni: si vede, e vale un premio in più |

Ognuno si accende o si spegne, e ogni numero si cambia.

### Entrare

Si sceglie come:

- **chi scrive**: ogni messaggio durante le iscrizioni fa entrare chi lo scrive
  (o gli dà una probabilità di entrare, da 1 a 100%, per le chat grandi);
- **col comando**: solo chi scrive il comando d'ingresso;
- per tutti, o solo follower, abbonati, VIP, moderatori;
- con un costo in monete, o gratis;
- fino a un numero massimo di combattenti.

Il bot, i bot noti e chi è escluso non entrano (le stesse regole del muro).

## Cosa si personalizza

Tutto quello che è un numero o una scelta sta nelle regole del gioco, nel
catalogo dei giochi (`giochi-conf.js`), con le attese e i premi come gli altri
giochi: così la scheda Giochi lo mostra e lo regola già.

- **Tempi**: iscrizioni, stretta dell'arena, durata massima, vittoria.
- **Combattimento**: vita, velocità, danno, grandezza, rinculo.
- **Oggetti**: quali, ogni quanto, quanto valgono.
- **Ingresso**: modo, probabilità, chi, costo, massimo.
- **Premi**: al vincitore, per ogni eliminazione, alla corona.
- **Testi**: le righe a schermo e le frasi del bot in chat, nelle tre lingue,
  con le variabili (`{vincitore}`, `{eliminazioni}`, `{premio}`...).

La **veste** è un pezzo dello Studio come il boss e il muro: posizione e
grandezza per overlay, e per canale carattere, colori, bordo dell'arena (a
penna, come il resto), sfondo (trasparente di base), nomi sì/no, colore della
chat sì/no, stemmi, barra della vita, teschio, e gli effetti dei colpi.

## Come parte

- `!arena` (moderatori e streamer);
- da sola ogni tot minuti, se lo si vuole;
- da un Modulo, da un tasto di CONSOLify, da un premio a punti canale, da un
  raid: una nuova azione «Apri l'arena»;
- dal pannello, col tasto «Apri le iscrizioni».

## Le scene di OBS

Si sceglie in quali scene l'arena vive, e cosa succede entrando e uscendo:

- entrando in una di quelle scene: **apre le iscrizioni** (se non c'è una partita)
  oppure **solo si mostra**;
- uscendo: la partita **si ferma e riprende** al ritorno, oppure **va avanti**
  senza vedersi e il vincitore si dice in chat.

La scena attiva arriva al server da due strade, e basta una:

1. **dalla sorgente stessa**: l'overlay dentro OBS la legge da
   `window.obsstudio` (serve dare alla sorgente browser il permesso di leggere lo
   stato di OBS, nelle sue proprietà) e la manda al server con la chiave
   dell'overlay;
2. **dal pannello**, quando la regia è collegata: oggi il pannello riceve già il
   cambio di scena da OBS (`CurrentProgramSceneChanged`) e lo usa solo per
   colorare il tasto; lo inoltra al server.

Il server tiene la scena attiva del canale (solo il nome, niente altro) e la
usa per le regole dell'arena. È un pezzo utile anche fuori dall'arena: lo
stesso segnale potrà accendere le occasioni in base alla scena.

## Come si costruisce

1. `arena.js`, il motore: `nuova(seme, combattenti, regole)`, `passo(stato)`,
   `ingresso(stato, azione)`, `esito(stato)`. Prove: stessa partita da Node due
   volte e da un browser (un collaudo che confronta l'esito); nessuna partita
   senza fine; oggetti, stretta, vittoria ai punti.
2. Il gioco lato server (`src/features/arena.js`): fasi, iscrizioni, emote
   scelte, premi con `points`, frasi in chat, stato per chi si collega a metà,
   voce nel catalogo dei giochi, comandi `!arena` ed `!emote` nel registro.
3. L'overlay: il pezzo `arena` (contenitore, disegno su tela, veste).
4. Il pannello: la carta nello Studio (veste) e nella scheda Giochi (regole),
   la scelta delle scene.
5. La scena attiva: dalla sorgente e dal pannello.
6. Manuale (overlay e giochi), novità, nelle tre lingue.

## Com'è fatta

Fatti i punti 1, 2, 3 e 6 (parte italiana); le scene di OBS e la scena
attiva (punti 4 e 5, la scelta delle scene) sono il passo dopo. Le decisioni
prese costruendo, con il loro perché.

- **Il seme nasce alla chiusura delle iscrizioni**, non all'apertura. Prima
  dell'ultimo ingresso non esiste: nessuno può calcolare l'esito ed entrare
  solo se vince. L'overlay, durante le iscrizioni, mette i combattenti ai
  posti di `nuova('anteprima', elenco, regole)` schiacciati sotto le due righe,
  e alla partenza li porta in 450 ms ai posti veri della battaglia: è solo
  disegno, la partita non ne sa niente.
- **Il vincitore si dice quando si vede**: la vittoria scatta a
  `t0 + ceil(passi × 1000 / PASSO)` ms, mai prima che l'overlay possa esserci
  arrivato.
- **Le regole si fermano all'apertura**: il server le legge una volta, le
  normalizza col motore e le manda negli eventi; cambiarle a partita aperta
  non cambia la partita.
- **Gli istanti del server si traducono con lo scarto misurato all'arrivo**
  (`Date.now() − ora` di ogni evento), non con l'ora del computer della
  diretta: due orologi che non vanno d'accordo non spostano la partita.
- **L'ingresso si paga entrando**, una volta, ed è scritto in `stato_vivo`
  (`arena-quote`): se l'arena si annulla, con `!arena ferma` o perché i
  combattenti sono meno di due, torna indietro; se il bot si riavvia, torna
  all'avvio e il bot lo dice quando il canale rientra in chat.
- **La probabilità delle chat grandi è una estrazione a persona**, al primo
  messaggio: a messaggio entrerebbe chi scrive di più, e la probabilità non
  sfoltirebbe niente.
- **L'emote è una funzione** (`emoteDi`): la scelta con `!emote` (tabella
  `arena_emote`), poi la prima emote del messaggio per posizione (Twitch dal
  tag, letto sul testo scritto davvero, poi 7TV), poi una delle emote del
  canale scelta da un'impronta della persona, sempre la stessa per lei. Non
  dal seme: il seme durante le iscrizioni non c'è ancora. Le emote 7TV
  arrivano quando arrivano: chi è già entrato si riveste e il suo `entra`
  riparte.
- **Il disegno è uno** (`src/web/public/arena-tela.js`, `SB_ARENA_TELA`), per
  l'overlay e per lo Studio. La tela ha un margine attorno all'arena del
  motore, così nomi, corona e bordo a penna non escono mai dal disegno.
- **Tre difetti del motore**, visti disegnando: un oggetto rimasto fuori dai
  muri che si stringono ora sparisce (evento `perso`) invece di far spingere i
  combattenti contro il muro; dopo gli urti ogni cerchio torna dentro i muri;
  la misura minima dell'arena non scende sotto due combattenti affiancati
  (`strettaMin ≥ 4 × raggio / W`).
