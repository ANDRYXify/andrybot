<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Subathon

«La diretta dura quanto dice l'orologio, e chi si abbona la allunga.»

## Non e' un orologio nuovo

La tentazione e' fare un contatore a se': un tempo totale, un tic tac, un
elemento in overlay, un pannello. Sarebbero stati DUE orologi da tenere
d'accordo — quello del subathon e il conto alla rovescia che il prodotto ha
gia' — e due orologi che dicono cose diverse sono la faccia peggiore che una
diretta possa mostrare.

Il subathon e' invece una **regola del conto alla rovescia**: `overlayTimer`
guadagna un `subathon`, e il tempo che gli eventi aggiungono finisce nello
stesso istante di fine che l'overlay mostra gia'. Da qui discendono tre cose,
senza deciderle:

- l'istante di fine sta nelle impostazioni del canale, quindi sopravvive a un
  riavvio, a una ricarica dell'overlay e a dieci sorgenti aperte insieme;
- quel che si vede e' il timer che lo streamer ha gia' messo in scena, con la sua
  veste e il suo posto: non c'e' un secondo aggeggio da vestire;
- **non si puo' accendere un subathon senza un conto che lo faccia vedere.**

## Cosa NON fa: non resuscita una diretta finita

Se l'orologio e' arrivato a zero, la diretta e' finita. Un sub che arriva dopo
non fa ripartire il conto di soppiatto mezz'ora dopo che si e' spenta la
telecamera. Riaprirlo e' una scelta dello streamer, col tasto che ha gia'.

## Il tetto e' su quanto MANCA

Non sul totale aggiunto: **«non puo' mancare piu' di N ore»**. E' la forma che
serve davvero, perche' la domanda vera e' «a che ora vado a dormire». A zero non
c'e' tetto, ed e' una scelta che si prende scrivendo zero.

Il tetto ha un effetto che sembra un difetto e non lo e': arrivati al tetto, il
tempo scende, e un sub piu' tardi puo' rimettere dentro quel che e' sceso. E'
giusto — il tetto e' sul «quanto manca», non sul «quante volte». Quello che
sarebbe stato un difetto vero e' il caso limite: fra un sub e l'altro passano
millisecondi, e senza una soglia in chat sarebbe comparso un **«+0 secondi» a
ogni abbonamento**. Sotto il secondo, il conto non si muove e il bot tace.

## I sub regalati arrivano due volte

Twitch manda un `channel.subscribe` per **ogni** abbonamento regalato, piu' un
`channel.subscription.gift` per la raffica. Contarli tutti e due vuol dire
contare venti regali ventuno volte: per gli obiettivi era un numero gonfiato che
nessuno guardava da vicino, per il subathon sarebbe stato tempo regalato davanti
a tutti.

Adesso l'annuncio della raffica serve all'alert e basta: a contare — obiettivi e
subathon — sono i sub veri, uno per uno. Ed e' anche la correzione di un difetto
che gli obiettivi avevano da prima.

## Le unita' sono per UNITA'

Minuti per **un** sub, per **cento** bit, per **un** euro. Le frazioni le fa il
conto: cinquanta bit valgono mezza unita'. Cosi' nelle impostazioni non servono
numeri con la virgola, che sono il primo posto dove si sbaglia scrivendo in
fretta.

## Cosa vede la chat

Con l'avviso acceso, il bot dice quanto e' salito e per merito di chi
(`{chi}`, `{quanto}`). `!subathon` dice quanto manca, e risponde **solo** quando
un subathon e' acceso: un comando che risponde «non c'e' nessun subathon» a ogni
curioso e' un modo per far dire al bot cose che non servono a nessuno.

## L'overlay non aspetta

Quando il conto si allunga, all'overlay arriva l'istante nuovo (`{tipo:'timer',
fine}`) e lui aggiorna il numero. Non si rilegge tutto il tema: in una raffica di
venti regali sarebbero state venti riletture su ogni sorgente aperta.

## Collaudo

`test/unita/subathon.test.mjs` (riscritto con la subathon completa, sotto): i minuti che diventano secondi con le frazioni,
il sub che allunga il conto del canale, il conto finito che non riparte, il
subathon spento, il subathon senza conto, il tetto che taglia e che non lascia
crescere il «quanto manca», il tetto a zero, l'avviso in chat che si spegne,
l'istante che arriva all'overlay, `!subathon` che tace quando non c'e' niente da
dire, e i valori di fabbrica (che nascono spenti).

## Ottobre 2026: la subathon completa

Chiesto così: «una gestione anche più completa e robusta della subathon
(magari la creazione di pannelli custom, gestione di grafiche personalizzate,
insomma, un overlay ad hoc, gestione alert, utilizzo di comandi per aggiunte
manuali in caso di rottura etc etc)».

Il principio resta: **un orologio solo** (`overlayStato.timer.fine`). Tutto
quello che segue è un modo di muoverlo, di raccontarlo o di vederlo.

### Il libro della subathon

Ogni allungamento è una **riga** (`subathon_righe`): l'evento che lo ha fatto
(il suo id: il sub, il cheer, il riscatto, il comando), quando, la fonte, chi,
quanti, i secondi chiesti, quelli messi e quelli tagliati dal tetto, e per le
righe a mano chi le ha scritte e perché. Da qui, per costruzione:

- **lo stesso evento non allunga due volte** (l'id della riga è quello
  dell'evento): un EventSub che arriva due volte, un riavvio a metà, un
  comando ripetuto per sbaglio con lo stesso id;
- **niente si cancella**: «annulla» scrive una riga che storna (secondi
  negativi, mai sotto «adesso»), e il libro dice sempre com'è andata;
- il totale aggiunto, i migliori contributori e l'ultimo arrivato sono **conti
  sul libro**, non contatori a parte che possono andare d'accordo o no.

### Le fonti

Minuti per unità, ognuna sua, tutte dello streamer: sub per livello (1, 2, 3:
il 2 e il 3 sono moltiplicatori del primo, di serie 2 e 5), Bit per cento,
euro, Kicks per cento, follow, raid per spettatore, il premio a punti canale
collegato. L'**ora felice** moltiplica tutto per un tempo («!subathon felice
30m x2»), e si vede in scena. I sub regalati restano contati uno per uno.

### Pausa e fine

- **Pausa**: l'orologio si ferma con quello che manca (`timer.pausa = { resta
  }`, `fine` vuota). Gli eventi in pausa si segnano lo stesso e il tempo si
  aggiunge a quello che resta: si riprende da lì.
- **Fine**: a zero la subathon è finita e non riparte da sola (come prima).
  Lo streamer sceglie cosa succede: niente, un messaggio in chat, l'alert di
  fine in scena.

### I comandi, per quando qualcosa si rompe

Solo streamer e moderatori (lo streamer sceglie chi): `!subathon +10m
[perché]`, `!subathon -5m`, `!subathon sub 3 [livello]`, `!subathon bit
500`, `!subathon euro 10`, `!subathon kicks 200`, `!subathon resta 3h`,
`!subathon pausa`, `!subathon riprendi`, `!subathon annulla` (l'ultima riga
a mano), `!subathon felice 30m x2`. Ognuno scrive una riga nel libro e
risponde in chat cosa ha fatto. Le stesse azioni stanno nel pannello come
tasti. Chiunque altro scrive `!subathon` e sa quanto manca.

### In scena

- **L'elemento `subathon`** (overlay, veste di tutti, posto suo): il conto
  grande, il «+5:00» che sale a ogni allungamento, gli ultimi che hanno
  allungato, il totale aggiunto, da quanto dura, l'ora felice e la pausa, e
  una barra verso il prossimo traguardo. Ogni pezzo si accende e si spegne, e
  ha i suoi testi.
- **Le grafiche dello streamer**: immagini dalla libreria Effetti come fondo,
  cornice o icona dell'elemento, come i cartelli.
- **Le regole in scena**: un riquadro «1 sub = 5 minuti…» costruito dalle
  fonti accese: cambi un numero e il riquadro cambia.
- **Gli alert**: «+10:00 grazie Luna» per ogni allungamento (raffiche
  raggruppate), il traguardo raggiunto, la pausa, la fine; con suono e
  immagine scelti dalla libreria.

### Pannelli per Twitch

Le stesse regole diventano **immagini da caricare nei pannelli sotto la
diretta** (Grafiche): «Come funziona la subathon», con i colori del canale.

### Robustezza

Un orologio solo; righe idempotenti; storni invece di cancellazioni;
pausa che sopravvive a un riavvio (sta nelle impostazioni); comandi e tasti
per rimettere a posto quello che un evento perso non ha fatto; all'overlay
arriva l'istante, mai un conto da rifare.

## Le scelte fatte costruendola

Quello che il modello sopra non diceva, deciso prima di scriverlo.

### Dove stanno le regole

Le regole escono dal conto alla rovescia e vanno in una chiave loro,
`settings.subathon` (`normSubathon` in `web/stile.js`). Restavano dentro
`overlayTimer` finché c'era una carta sola; con una scheda sua, il «Salva» del
conto alla rovescia avrebbe riscritto la copia di regole che aveva in mano,
magari vecchia di un minuto. Una cosa, un posto.

Chi le aveva dentro il timer non perde niente: `regoleDi(settings)` legge la
chiave nuova e, se non c'è ancora, quella di prima; e salvare il conto alla
rovescia prima di aver mai salvato la scheda Subathon le **ferma** nella chiave
nuova (`subathonDaSalvare`), come la presenza coi Pew. `normTimer` non porta più
`subathon`.

### Acceso vuol dire: regole accese e un conto che la fa vedere

`accesa = regole.attivo && (overlayTimer.attivo || overlaySubathon.attivo)`.
È la stessa regola di prima («non si accende senza un conto che la faccia
vedere») con un conto in più: l'elemento `subathon` mostra lo stesso orologio.

### La sessione

Ogni volta che l'orologio **parte** (il tasto «Fai partire» del conto alla
rovescia o della scheda Subathon) comincia una sessione:
`overlayStato.subathon = { inizio, felice, finita }`. Le righe del libro
portano la sessione (`sessione = inizio`): totale, contributori, ultimi e
traguardi sono conti sulle righe della sessione in corso. «Da quanto dura» è
`adesso - inizio`. Fermare il conto non cancella la sessione: si può ancora
leggere.

### Il libro

`subathon_righe (channel, id, sessione, ts, fonte, chi, quanti, livello, per,
chiesti, messi, tagliati, mano, perche, storno)`, chiave `(channel, id)`, in
`db.js` come `subathonLibro`.
`chiesti`, `messi` e `tagliati` sono in **millisecondi** con segno; `per` è il
moltiplicatore dell'ora felice applicato. Una riga si scrive **prima** di
muovere l'orologio, dentro la stessa transazione: se l'id c'era già
(`INSERT OR IGNORE` senza cambi) l'orologio non si tocca. Ogni evento che
arriva con la subathon accesa scrive la sua riga anche se il tetto lo taglia
tutto (`messi` 0): il libro dice che è arrivato.

Gli id: un evento di Twitch porta il suo `message_id`, un riscatto il suo id,
i Kicks il loro, una donazione il suo; un comando l'id del messaggio in chat;
un tasto del pannello un id che il pannello genera una volta e rimanda uguale
se riprova. Chi non ha un id (i follow e gli abbonamenti di Kick) ne riceve uno
nuovo: lì il doppione non si può riconoscere, ed è scritto qui.

**Lo storno** porta in `storno` l'id della riga stornata, e il database ha un
indice unico su `(channel, storno)`: la stessa riga non si storna due volte, chi
che sia a chiederlo, per costruzione. L'id della riga di storno è quello del
comando o del tasto (`annulla:<id>`): lo stesso «annulla» ripetuto non storna
la riga dopo. Copia `chi` e `fonte` della riga stornata (così il contributo di
quella persona torna a quanto era) e vale `-messi`. Si stornano
solo righe che hanno mosso l'orologio (`messi ≠ 0`) e che non sono storni.
«!subathon annulla» storna l'ultima riga **a mano** della sessione non ancora
stornata; il pannello può stornare qualunque riga del libro.

I conti (`conti(righe)`, in `web/public/subathon.js`, la stessa funzione per il
server e per la demo del pannello): `totale` = somma di `messi`; contributori =
somma di `messi` per `chi` (le righe a mano non hanno `chi`: chi le ha scritte
sta in `mano`); ultimi = le ultime righe con `messi > 0`, `chi` e non stornate.

### L'orologio, in una funzione sola

`applica(timer, ms, { ora, tetto })` (pura, condivisa) è l'unico posto dove il
tempo si muove: in corsa sposta `fine`, in pausa sposta `pausa.resta`. Le
regole sono quelle di prima, scritte una volta:

- un conto finito o mai partito non si muove (torna `null`);
- in su, il tetto è su quanto manca: `nuovo = min(resta + ms, max(resta,
  tetto))`, e sotto il secondo non si muove niente;
- in giù non va mai sotto adesso: a zero la subathon è finita.

### Le fonti

Minuti per unità, interi: `perSub` (livello 1), `molt2` e `molt3` (di serie 2
e 5), `perBit100`, `perEuro`, `perKicks100`, `perFollow`, `perRaid10` (ogni
dieci spettatori: lo spettatore singolo avrebbe voluto la virgola), `perPremio`
col premio a punti `premio` (id). Contano gli abbonamenti uno per uno (anche i
regalati, col nome di chi lo riceve: Twitch non dice chi l'ha regalato sul
singolo abbonamento), i cheer, le donazioni nella valuta del canale, i Kicks, i
follow nuovi (non chi torna, non quelli fermati dallo scudo), i raid, i
riscatti del premio scelto (Twitch e Kick).

**L'ora felice** sta nello stato (`overlayStato.subathon.felice = { fino, per
}`, per da 2 a 5): moltiplica le righe delle fonti, eventi e unità scritte a
mano («sub 3»), non il tempo scritto a mano («+10m»), che è già il numero
voluto.

### Pausa, ripresa, fine

`timer = { fine: 0, pausa: { resta } }`. Riprendere rimette `fine = adesso +
resta`. Fare ripartire il conto toglie la pausa. Il conto che «parte da solo»
all'apertura dell'overlay **non** riparte un conto in pausa: era il difetto
pronto a succedere (in pausa `fine` è 0, e «0 è passato» lo avrebbe fatto
ripartire dai minuti di serie).

**La fine** la vede il server, non l'overlay: un timer per canale armato a ogni
mossa dell'orologio e riarmato all'avvio leggendo le impostazioni. Arrivato,
controlla che il conto sia davvero finito e che quell'istante non sia già stato
festeggiato (`finita = fine`): una volta sola, anche con due timer o un
riavvio. Una fine passata mentre il bot era spento si festeggia solo se è di
meno di dieci minuti fa; più vecchia si segna e basta. Lo streamer sceglie:
niente, una riga in chat (`fineChat`), l'alert di fine (`alert.fine`).

### I comandi

`!subathon` da solo: per tutti, come prima (tace a subathon spenta). Il resto
solo per chi lo streamer sceglie (`comandi`: `mod` = streamer e moderatori, di
serie; `streamer` = solo lui). Chi non può scrive un comando con un argomento e
riceve quello che riceve chiunque: quanto manca. A chi può, a subathon spenta,
si risponde che è spenta.

`+10m [perché]`, `-5m [perché]` (durate: `90`, `90m`, `1h30m`, `45s`, `1:30`),
`sub N [livello]`, `bit N`, `euro N`, `kicks N`, `follow N`, `raid N`
(spettatori), `resta 3h`, `pausa`, `riprendi`, `annulla`, `felice 30m x2`,
`felice stop`. Ognuno scrive una riga (anche pausa, ripresa e ora felice, con
`messi` 0) e risponde.

### I testi

Ogni frase che la subathon dice in chat o in scena ha un testo di serie in
italiano, inglese e spagnolo (`TESTI` in `web/public/subathon.js`), scelto con
la lingua della chat del canale (`linguaChat`); lo streamer ne scrive uno suo
per ognuna (`testi`), che vince. Il testo di prima (`testoChat`) diventa il
testo dell'allungamento. Le parole del tempo («2 ore e 10 minuti») sono nella
stessa lingua.

### In scena: due elementi, un modello

`subathon` (`overlaySubathon`) e `subathonRegole` (`overlaySubathonRegole`) sono
elementi posizionati come gli altri (docs/OVERLAY.md, «Un elemento è sempre
fatto nello stesso modo») e **nascono spenti** negli overlay esistenti
(`SPENTI_DI_SERIE`). Il disegno dei pezzi è una funzione sola,
`SB_SUBATHON.disegna`, che usano la tela dello Studio e la diretta: la veste è
la stessa per costruzione. Il tema porta la configurazione con le immagini già
risolte in indirizzo, la lingua della chat, le regole accese e la **vista**
(orologio, pausa, inizio, totale, ultimi, migliori, ora felice, traguardi);
quando il libro cambia arriva `{tipo:'subathon', vista, sale}` e l'overlay
ridisegna, con il «+5:00» che sale.

I traguardi (`traguardi = [{ minuti, testo }]`) sono sul **totale aggiunto**
della sessione: un conto sul libro. Uno è raggiunto quando una riga porta il
totale da sotto a sopra la sua soglia (uno storno che lo riporta sotto e un
sub che lo ripassa lo raggiungono di nuovo, come gli obiettivi).

### Gli alert

`alert.allunga`, `alert.traguardo`, `alert.pausa`, `alert.fine`: ognuno acceso
o no, col suo testo, il suo suono (pronto o dalla libreria) e la sua immagine
dalla libreria; partono come gli alert degli eventi (stessa veste, stessa
coda). Gli allungamenti arrivati entro `raffica` secondi dal primo diventano
**un** alert e **una** riga in chat («+25:00 grazie Luna, Marco e altri 3»):
venti regali non sono venti alert. Il tempo, intanto, è già nell'orologio.

### Dove si gestisce

Una scheda sua, **Subathon**, nel gruppo «In diretta»: fonti, tetto, ora
felice, traguardi, fine, chi usa i comandi, testi, alert, il libro con
«annulla», i tasti delle azioni a mano e le immagini per i pannelli di Twitch
(disegnate con lo stesso motore della scheda Pannelli). La veste e il posto
dei due elementi restano nello Studio, come per ogni elemento.

### Collaudo

`test/unita/subathon.test.mjs`: unità e frazioni, livelli, raid ogni dieci,
premio scelto; gli eventi che diventano fonti (la raffica dei regali no, chi
torna no); idempotenza per id; conto finito che non riparte e non scrive; senza
un conto che la faccia vedere non esiste; tetto su quanto manca (e la riga
tagliata); `applica` mai sotto adesso e in pausa; pausa, eventi in pausa e
ripresa; il conto che parte da solo non riparte una pausa; annulla una volta
sola (stesso comando, stessa riga); conti sul libro con lo storno; la fine una
volta per istante, vecchia segnata e basta; permessi dei comandi; stesso
messaggio una volta; lettura dei comandi; ora felice; «resta»; lingue e testi
dello streamer; valori di fabbrica e regole di prima; in diretta l'istante,
la vista col «+», la raffica in una riga, la pausa all'overlay; traguardi una
volta; la riga di fine una volta.
`test/contratto/subathon-scena.test.mjs`: i due elementi fatti come gli altri
(chiavi, spenti di serie nelle basi e solo lì, stessa configurazione di serie
nel pannello e nel server, stesso disegno sulla tela e in diretta), le rotte con
il loro guardiano, la scheda registrata in ogni elenco.
