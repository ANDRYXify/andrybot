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

`test/unita/subathon.test.mjs`: i minuti che diventano secondi con le frazioni,
il sub che allunga il conto del canale, il conto finito che non riparte, il
subathon spento, il subathon senza conto, il tetto che taglia e che non lascia
crescere il «quanto manca», il tetto a zero, l'avviso in chat che si spegne,
l'istante che arriva all'overlay, `!subathon` che tace quando non c'e' niente da
dire, e i valori di fabbrica (che nascono spenti).
