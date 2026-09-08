# La bonifica: ripulire dopo, senza rifare il danno

## La regola, e viene prima di tutto il resto

> **Non si toglie un follower solo perché è arrivato durante l'attacco.**

È la cosa più facile da fare e la più sbagliata. «Prendi l'intervallo e cancella
tutto» ripulisce in un colpo e si porta via i fan veri arrivati in quei minuti —
che sono proprio quelli che una clip virale o un raid hanno appena portato. Un
fan vero rimosso non torna, e non sa nemmeno perché.

Quindi si lavora sui **giudizi** che l'incidente ha già scritto mentre
succedeva, non sull'orologio. Chi è stato misurato come parte della fabbrica è
`certo`; chi è arrivato mentre il canale era in allarme senza nessun segnale
contro è `legittimo`, e resta dov'è.

I `legittimi` non compaiono nemmeno fra i togliibili. Non è una dimenticanza:
non devono poter finire in un'operazione di massa neanche chiedendolo. Chi vuole
toccarne uno lo fa a mano, uno per volta.

## Il rapporto

Per ogni incidente si vede quanti account sono passati, divisi per giudizio, e
quanti di quelli si possono davvero togliere — **senza l'id di Twitch non si
tocca nessuno**, e dirlo prima evita di promettere un numero che non si
mantiene.

Il rapporto dice anche se i giudicati venivano dalla stessa fabbrica, che è la
conferma più forte che si aveva ragione.

La proposta di partenza è la più prudente che abbia senso: **i certi, e basta**.
Il resto lo aggiunge chi guarda.

## La conferma è il numero

Per eseguire bisogna riscrivere **quanti account si sta per togliere**. Se nel
frattempo il numero è cambiato — altri follow, un altro giudizio, una scelta
diversa di giudizi — la conferma non vale più e si guarda di nuovo.

Non è un fastidio: è l'unico modo perché «ho letto» significhi davvero «ho
letto quello che sta per succedere adesso». Un pulsante «conferma» si preme
senza guardare; un numero da ricopiare no.

Il conto e l'esecuzione passano dalla **stessa funzione**. Due strade separate
finirebbero per dire numeri diversi, e allora la conferma non varrebbe niente.

## Chi esegue

Non è la bonifica. Produce i verdetti e li dà all'esecutore, che ha la coda, il
ritmo di Twitch, la riprova e la coda dei falliti. Qui si decide **chi**, non
**come** — e se il canale è in sola osservazione, si scrive tutto e non si tocca
nessuno.

I bot di servizio e gli esenti dello streamer restano fuori anche qui.

## Dove si usa

- `GET /api/antibot/incidenti/:id/bonifica?giudizi=certo` — il rapporto e
  l'anteprima, senza che succeda niente.
- `POST /api/antibot/incidenti/:id/bonifica` con `{giudizi, conferma}` — l'esecuzione.

## Le prove

`test/unita/bonifica.test.mjs`, dentro `npm test`. Dieci casi, e il primo è
quello che conta: **chi è arrivato durante l'attacco senza segnali contro non si
tocca**, nemmeno chiedendolo esplicitamente.

Ogni prova è stata vista rossa rompendo il codice sotto.
