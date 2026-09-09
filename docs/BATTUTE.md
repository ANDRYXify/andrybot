# Le battute

Una battuta non ha una risposta giusta, quindi il modello va benissimo per
inventarne. Ma un 7B su CPU ne inventa una decente ogni tanto, ci mette quindici
secondi, e spento non ne inventa nessuna. E le battute che funzionano in **quel**
canale le conosce lo streamer, non il modello.

Da qui la forma: **prima il serbatoio**, che è istantaneo, sicuro e suo. Il
cervello solo quando il serbatoio è vuoto.

## In chat

```
!battuta                       ne dice una
!battuta 7                     dice la numero 7
!battuta aggiungi <testo>      mod e streamer
!battuta togli 7               mod e streamer
!battuta quante
```

Il comando sta nel registro come tutti gli altri: si spegne, si rinomina, si
riserva a sub o mod. Risponde anche a `!battute` e `!joke`.

## Non si pesca a caso

Si prende la **meno detta di recente**, non una a caso. È la differenza fra un
serbatoio e un sacchetto in cui si rimette dentro il biglietto appena pescato:
pescando a caso, in una serata la stessa battuta esce tre volte e sembra che il
bot ne sappia una sola.

La stessa battuta non entra due volte. Il confronto ignora spazi, maiuscole e
punteggiatura, così «Il POMODORO è sempre in salsa!» non si aggiunge accanto a
«il pomodoro è sempre in salsa».

I numeri sono stabili: togliere la #2 non rinumera la #1. `!battuta 7` punta
sempre a quella.

## Quando il serbatoio è vuoto

Se il cervello risponde, gliene chiede una — con il **carattere e le regole del
canale** attaccati alla richiesta, quindi la inventa come parla lui e non come
parla un manuale. Sei secondi di attesa: una battuta che arriva dopo quindici
non fa ridere nessuno.

Se il cervello non risponde, lo dice: «il serbatoio è vuoto, aggiungine con
!battuta aggiungi». Un bot che promette e non consegna è peggio di uno che
ammette.

## L'accordo di genere vale anche qui

Il testo esce dalla voce del bot come tutto il resto, quindi una battuta può
contenere `{o/a}` e viene detta nel genere impostato. Vedi `docs/GENERE.md`.

## Il collaudo

`test/contratto/battute.test.mjs`, nove prove. Le due che contano più delle altre:
che con tre tiri escano tre battute diverse (il serbatoio non è un sacchetto), e
che **il cervello venga chiamato solo col serbatoio vuoto** — se lo si disturba
quando non serve, si paga un'attesa per niente.

## Quello che manca

L'elenco delle battute non c'è ancora nella dashboard: si aggiungono e si tolgono
dalla chat. Le citazioni hanno il loro riquadro con la lista e l'import, e questo
è il modello da copiare quando si farà.
