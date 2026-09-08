# I sei livelli: quanto è grave adesso

## Il difetto dei tre livelli

C'erano `calma`, `sospetto`, `attacco`. Il problema non era il numero: era che
**«sospetto» non faceva niente**. Si alzava, si scriveva nel registro, e il
canale restava esattamente com'era. Un livello che non cambia niente non è un
livello, è un'etichetta.

E dall'altra parte il salto era brutale: da «non faccio niente» a «chiudo la
chat ai soli follower, alzo lo Shield Mode e blocco l'ondata». Fra il nulla e la
serranda ci sono almeno tre cose sensate da fare, e non farle vuol dire che il
bot o dorme o esagera.

Il caso che lo mostrava meglio: **un picco di gente vera alzava la serranda**.
Una clip andata bene, centoventi persone che seguono in un minuto — e il bot
chiudeva la chat ai soli follower. Fare male allo streamer nel suo momento
migliore, «per prudenza».

## I sei, e ognuno fa una cosa che gli altri non fanno

| | livello | cosa cambia |
|---|---|---|
| 0 | **calma** | il canale normale |
| 1 | **osservo** | i controlli sui nomi e sulle presenze si accendono; niente si tocca |
| 2 | **allerta** | gli account appena nati che scrivono vengono **segnalati** ai mod |
| 3 | **difesa** | chat lenta, e i messaggi degli account nati da poche ore vengono **trattenuti**: si tocca il messaggio, non la persona |
| 4 | **attacco** | la serranda — chat ai soli follower, Shield Mode — e l'ondata artificiale viene bloccata |
| 5 | **serrata** | la porta è più stretta: follower da un'ora, chat lenta a trenta secondi, account da una settimana |

Non sono sei nomi per tre comportamenti. Una prova confronta ogni scalino col
precedente e **pretende che qualcosa cambi**: se due livelli facessero lo stesso,
sarebbero un livello con un sinonimo.

Un'altra pretende che **salendo non si spenga mai una difesa**. Una difesa che
si spegne quando le cose peggiorano è il difetto peggiore possibile, e va
escluso per costruzione, non per attenzione.

## Il punteggio d'attacco

Continuo, da 0 a 100, e non a scalini — perché a scalini si perde tutto quello
che sta in mezzo: «nove follow quando la soglia è dieci» e «zero follow» non
sono la stessa cosa, e col booleano lo diventavano.

| segnale | peso | perché |
|---|---|---|
| raffica | 45 | in proporzione alla soglia **di questo canale**, satura al doppio |
| ondata misurata come macchina | 50 | non è un indizio, è una certezza |
| nomi dalla stessa fabbrica | 10 | conferma, non decide |
| coro | 70 | un coro confermato è già un attacco in corso |
| gocciolamento | 45 | lento, ma non meno vero |
| quanti scrivono con l'account di ieri | 20 | |

**I pesi non sono opinioni: si tarano su cosa deve succedere.** Quattro cose
devono succedere, e una prova le verifica una per una:

- un'ondata misurata come macchina → **attacco**;
- un coro confermato → **attacco**;
- il gocciolamento con la fabbrica riconosciuta → **attacco**;
- tanti follow di cui non si sa niente → **allerta**, non serranda.

Il primo giro dei pesi ne aveva sbagliati due — l'ondata artificiale finiva
dritta in serrata, il coro si fermava a «osservo» — e i conti lo hanno mostrato
prima del codice.

## Le tre modalità

`prudente`, `bilanciata`, `aggressiva` spostano **le soglie**, non la scala: lo
stesso punteggio porta a un livello diverso. Venti follow di cui non si sa
niente sono `allerta` in prudente e `difesa` in aggressiva.

Si sceglie dal pannello, sotto Scudo anti-bot.

## Si sale in fretta e si scende piano

È la forma giusta per una difesa: alzare un livello di troppo per qualche minuto
costa poco, restare indietro durante un'ondata costa molto.

- **Salire** è un gesto: appena il punteggio lo dice.
- **Scendere** è il tempo che passa: dopo la quiete si scende di **un gradino**,
  e se la quiete continua si continua a scendere.
- Un allarme più lieve mentre ce n'è uno grave in corso **rimanda** il rientro,
  non lo anticipa.

E scendendo si riapre subito quello che il livello nuovo non prevede più.
Restare chiusi «per sicurezza» a livello basso vuol dire lasciare un canale
strozzato senza che nessuno se ne accorga.

## Le prove

`test/unita/livelli.test.mjs`, dentro `npm test`. Dodici casi, e i due
strutturali — «nessun livello fa quello che fa il precedente» e «salendo non si
toglie mai una difesa» — valgono per tutti i livelli che ci saranno, non solo
per questi sei.

Ogni prova è stata vista rossa rompendo il codice sotto: tredici rotture,
tredici rossi. E i sette scenari del simulatore sono rimasti tutti al 100% dopo
il passaggio da tre livelli a sei: è quello che ha reso il cambio sicuro.
