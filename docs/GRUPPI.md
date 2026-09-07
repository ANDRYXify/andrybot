# I gruppi: chi è arrivato insieme, e chi c'era per caso

## Il difetto, misurato

Quando un'ondata viene giudicata artificiale, lo scudo prende tutta la
finestra — e dentro la finestra ci sono anche le persone vere capitate in mezzo.
Sullo scenario «duecento bot e quaranta persone insieme»: **quaranta persone su
quaranta bloccate**, precisione 83%.

Non è una svista: il giudizio sulla cadenza vale sull'**insieme** e non dice
niente sul singolo. Interlacciati, gli intervalli di una persona e di un bot
sono identici — sono i bot a riempire lo spazio fra un arrivo e l'altro.

Serve un segnale sul singolo, e deve essere **gratis**: durante un'ondata ogni
chiamata a Twitch per account amplificherebbe l'attacco invece di fermarlo.
Quello che abbiamo in mano senza chiedere niente a nessuno è il **nome**.

## Due chiavi

I follow-bot si generano in blocco, quindi i nomi escono dalla stessa fabbrica.
Le persone no: «pierpa_gaming», «martuxx1», «elezz22832» non si somigliano fra
loro più di quanto somiglino a chiunque.

| chiave | cosa fa | esempio |
|---|---|---|
| **la forma** | ogni lettera diventa `a`, ogni gruppo di cifre `#` | `zzq0x0` e `zzq12x7` → `aaa#a#` |
| **l'inizio** | i primi tre caratteri | una fabbrica parte quasi sempre dallo stesso pezzo |

Collassare le cifre è il punto: è quello che fa convergere i nomi di una stessa
infornata, che si distinguono solo per il contatore. Si prova con tutte e due e
si tiene quella che raggruppa meglio.

## La regola è prudente da una parte sola

- Se un gruppo copre **la maggioranza** dell'ondata, si tocca solo quel gruppo:
  chi non ci sta è probabilmente passato di lì per caso, e resta segnato come
  *sospetto* nell'incidente invece che tolto.
- Se **non** si riconosce nessun gruppo — un attaccante che usa nomi tutti
  diversi — non si finge di saperlo: si torna a trattare l'ondata come una cosa
  sola, perché lì l'errore da evitare è lasciarla passare.
- Sotto otto account non si parla di gruppi: tre nomi che si somigliano sono un
  caso, non una fabbrica.

Il gruppo riconosciuto **resta**, e serve ai follow che arrivano dopo: uno per
volta non si raggruppa niente, ma si può chiedere se somiglia a quelli di prima.

## Il gocciolamento

Centocinquanta follow in dieci minuti — uno ogni quattro secondi — non hanno
nessuna cadenza da macchina: sono troppo lenti. Finora alzavano solo il
sospetto, che vuol dire non fare niente: **passavano indisturbati**, e lo
scenario lo diceva con un richiamo dello 0%.

Ma se i nomi vengono tutti dalla stessa fabbrica, la fabbrica c'è lo stesso, e
si vede senza guardare l'orologio. Ora l'onda lenta con un gruppo riconosciuto
alza l'assetto e blocca il gruppo.

## Il ritmo si impara con calma

Un difetto trovato qui, e ne valeva la pena. La soglia della finestra lunga si
tara sul **ritmo abituale** del canale — ma quel ritmo si imparava dal
gocciolamento stesso: dopo trenta follow il canale «sapeva» che uno ogni quattro
secondi era la sua normalità, e la soglia passava da quaranta a
**settecentocinquanta**. L'attacco insegnava al canale che era normale.

Non basta il numero di follow: serve che siano stati raccolti in **tempo lungo**.
Trenta follow in due minuti sono un episodio; trenta follow in sei ore sono
un'abitudine. Sotto quel tempo si usa il valore dichiarato dallo streamer.

E il confronto si fa sul tempo **degli eventi**, non su quello dell'orologio:
tutto il resto dello scudo ormai misura così, e mescolare le due scale fa dire
al confronto qualunque cosa.

## Cosa è cambiato nei numeri

| scenario | prima | dopo |
|---|---|---|
| ondata mista (200 bot + 40 persone) | precisione **83%** | **100%** |
| ondata lenta (150 bot in dieci minuti) | richiamo **0%** | **100%**, vista in 155s |

## Le prove

`test/unita/gruppi.test.mjs`, dentro `npm test`. Nove casi, e quelli che contano
sono «in un'ondata mista le persone in mezzo non si toccano» e «senza un gruppo
riconoscibile non si finge di saperlo» — la prudenza da una parte sola.

Ogni prova è stata vista rossa rompendo il codice sotto: otto rotture, otto
rossi.
