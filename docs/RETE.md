# La rete: quello che un canale riconosce diventa noto agli altri

## Il problema che risolve

Il punto debole dello scudo non è mai stato il codice, è il carburante. La lista
pubblica di bot noti che scarichiamo si è fermata: **6.590 nomi, uno solo
aggiunto nell'ultimo anno, zero negli ultimi trenta giorni**, e l'endpoint dei
bot online oggi torna vuoto. Contro un follow-bot nato questo mese non ha niente
da dire.

Gli strumenti di riferimento questo problema non ce l'hanno perché guardano
migliaia di canali insieme: vedono l'attacco sul canale A e lo riconoscono sul
canale B un minuto dopo. Quella è scala, non codice.

Ma la scala in piccolo ce l'abbiamo anche noi, ed è fatta dei canali che il bot
serve. Basta metterla in comune, e cresce da sola man mano che gli streamer
arrivano.

## Le quattro regole, e sono tutte contro di noi

Una lista condivisa è anche il modo più veloce di propagare un errore a tutti i
canali insieme. Quindi la prudenza sta nella struttura, non nell'attenzione di
chi scrive.

**1 · Entra solo quello che un canale ha misurato e su cui ha agito.** Due
motivi soli, e sono una lista chiusa nel codice: un **blocco riuscito** durante
un'ondata giudicata artificiale, e un account dentro a un **coro**. Mai un
giudizio sul profilo — «account nuovo e spoglio» è la descrizione di uno
spettatore appena arrivato, e non si spedisce agli altri canali. Un blocco
*fallito* non entra: è un tentativo, non un fatto.

**2 · Servono tre canali indipendenti.** Uno solo può sbagliare, o essere in
mano a qualcuno in malafede. Lo stesso canale che insiste conta una volta: si
conta chi lo dice, non quante volte lo dice.

**3 · Si esce.** Un nome scade dopo novanta giorni senza riconferme, perché gli
account cambiano mano. E l'owner può toglierlo subito
(`POST /api/antibot/rete/dimentica`): se abbiamo sbagliato, si deve poter
disfare adesso e non fra tre mesi.

**4 · Finché non è confermato non vale niente.** Un nome visto da uno o due
canali non tocca il punteggio. Compare in console come «visto altrove»: fa
guardare, non fa agire.

E un **tetto di 200 nomi al giorno per canale**, così un canale impazzito o
compromesso non riempie la lista di tutti. Il tetto è suo: non tocca gli altri.

## Quanto pesa nel punteggio

La rete è la quinta famiglia del punteggio (`docs/PUNTEGGIO.md`), ed è una
famiglia **forte**. Due scalini, che dicono due cose diverse:

| conferme | punti | cosa vuol dire |
|---|---|---|
| 1–2 | 0 | niente: fa guardare |
| 3–5 | 4 | **conferma**: sommata a un altro indizio basta, da sola no |
| 6+ | 7 | **basta da sola** |

Sei conferme indipendenti sono una prova più solida di quella su cui un singolo
canale agisce in tempo reale: sei posti diversi che hanno misurato un'ondata o
un coro con dentro quel nome. Se la rete non potesse mai far agire da sola,
metterla in comune non avrebbe cambiato niente.

## L'indipendenza vale fino in fondo

Il conteggio decide anche lo scalino alto, quello che da solo fa condannare in
tutti i canali. Se dopo la terza conferma un canale potesse continuare a contare
per sé stesso, **uno solo** — sbagliato o compromesso — porterebbe un nome da
tre a sei.

Quindi l'elenco dei canali che hanno segnalato si tiene finché il numero può
ancora salire, e non un momento di più: arrivati a sei, il numero si ferma e
l'elenco sparisce. Anche dal file su disco.

Questo è il compromesso sulla riservatezza: l'elenco esiste solo per la regola
dell'indipendenza, dura solo finché serve, e non esce mai dal modulo — né dalla
console, né dall'API. Fuori va soltanto il conteggio.

## Cosa questo non è

Non è la rete di Sery_Bot. Loro stanno su oltre 250.000 canali. La nostra vale
quanto sono i canali che serviamo, e all'inizio varrà poco: con pochi canali le
tre conferme arrivano di rado e la famiglia resta a zero. Quando non ha dati
resta zitta invece di inventare — ma non si può cominciare dopo, perché la
conoscenza si accumula solo se qualcuno la accumula.

**Il limite dichiarato:** chi controllasse tre canali serviti dal bot potrebbe
far entrare un nome nella lista comune. Le difese sono che i canali devono
essere approvati e attivi, che i motivi ammessi sono solo fatti misurati e non
opinioni, che il tetto giornaliero limita il danno, e che l'owner può togliere
un nome in qualunque momento. Non è una difesa assoluta, ed è giusto saperlo.

## Dove vive

`data/rete-bot.json`, riletto all'avvio. È conoscenza guadagnata: perderla vuol
dire ricominciare da capo a imparare chi sono i bot.

## Le prove

`test/unita/rete.test.mjs`, dentro `npm test`. Sedici casi, quasi tutti contro
di noi: un canale solo non fa una verità, lo stesso canale che insiste non conta
per tre — né prima né dopo la conferma —, un giudizio sul profilo non si
spedisce, un canale impazzito non riempie la lista di tutti, un blocco fallito
non è un fatto, di chi ha segnalato chi non esce niente nemmeno dal file.

Ogni prova è stata vista rossa rompendo il codice sotto: tredici rotture,
tredici rossi. Due mutazioni erano cieche alla prima stesura, e una delle due ha
scoperto un difetto vero — dopo la conferma un canale poteva gonfiare il
conteggio da solo fino allo scalino che fa agire tutti.
