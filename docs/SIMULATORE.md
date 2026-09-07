# Il simulatore: smettere di tarare a naso

## Perché

Ogni soglia dello scudo è stata scelta guardando un conto e ragionandoci sopra.
Va bene per una soglia. Per dieci, che si influenzano a vicenda, non basta più:
cambiarne una e vedere se «va meglio» richiede di sapere cosa vuol dire meglio,
e cioè un numero.

Il numero si ottiene in un modo solo: **un attacco di cui si conosce già la
risposta**. Uno scenario porta con sé la verità — questo è un bot, questo è una
persona — e alla fine si confronta quello che lo scudo ha fatto con quello che
c'era davvero.

## I tre numeri

| | cosa dice | cosa costa sbagliarlo |
|---|---|---|
| **precisione** | quanti di quelli colpiti erano bot | un fan vero cacciato dal canale non torna |
| **richiamo** | quanti dei bot presenti sono stati colpiti | un bot scappato è un bot |
| **quanto ci ha messo** | dal primo evento al primo allarme | tardi è quasi come niente |

I due errori **non costano uguale**, e il collaudo lo rispetta: nessuno scenario
è verde se colpisce delle persone.

## Rilevare non è eseguire

Sono due cose diverse e confonderle fa misurare quella sbagliata. Il rilevamento
è il giudizio: quanti ha capito che erano bot. Quanti sono poi arrivati davvero
a Twitch dipende dal suo rate limit — sei al secondo — e mille blocchi ci mettono
tre minuti comunque. Misurare gli eseguiti vorrebbe dire dare allo scudo la
colpa del tetto di Twitch.

Il simulatore misura i **decisi**, e riporta a parte quanti ne sono stati
eseguiti.

## Gli scenari

Sono deterministici: nessun dado vero, solo una sequenza che si ripete identica.
Cambiando un algoritmo si rigioca lo stesso attacco e si confrontano i numeri,
invece di ricordarsi com'era prima.

| scenario | cos'è |
|---|---|
| `ondata-veloce` | 500 follow-bot in dieci secondi, a passo di macchina |
| `ondata-lenta` | 150 follow-bot in dieci minuti: il gocciolamento |
| `clip-virale` | 120 persone vere in un minuto |
| `ondata-mista` | 200 bot e 40 persone insieme |
| `coro` | 40 account, lo stesso messaggio in dodici secondi |
| `chat-viva` | 30 persone che chiacchierano forte |
| `raid-vero` | 300 persone arrivate da un raid annunciato da Twitch |

Il tempo è dentro gli eventi, non nell'orologio: dieci minuti di attacco si
giocano in un istante. È anche più corretto in produzione — Twitch ci dice
**quando** è successo, e se il bot è indietro di due secondi misurare sull'ora
di adesso schiaccia tutti gli eventi insieme.

## Le attese

Ogni scenario porta la riga da cui si riparte. Non sono voti: se un numero
scende è una regressione e si vede il giorno che succede, invece che dopo. Dove
l'attesa è bassa c'è **un pezzo di lavoro dichiarato**, non un difetto
dimenticato.

Oggi:

| scenario | precisione | richiamo | note |
|---|---|---|---|
| ondata-veloce | 100% | 100% | |
| clip-virale | 100% | — | nessuno toccato |
| chat-viva | 100% | — | nessuno toccato |
| raid-vero | 100% | — | nessuno toccato |
| coro | 100% | 92% | |
| ondata-mista | **83%** | 100% | le persone in mezzo all'ondata si salvano solo in parte: serve il riconoscimento dei gruppi |
| ondata-lenta | 100% | **0%** | il gocciolamento alza il sospetto ma non fa agire: manca il pezzo |

## Cosa ha trovato appena acceso

Cinque difetti veri, in un pomeriggio, e nessuno si vedeva da fuori.

1. **Media degli intervalli negativa.** Da quando si misura sull'istante
   dell'evento, due righe fuori ordine davano intervalli negativi: la media
   crollava sotto zero e il giudizio diceva qualunque cosa. Ora si ordina prima
   di guardare.
2. **L'istante zero scambiato per «non me l'hanno detto».** `Number(ts) || ora`
   trattava lo zero come assente e metteva in fila un tempo assoluto insieme a
   quelli relativi.
3. **Sette persone su trenta prese per un coro** in una chat viva: «io stavo per
   morire» ha diciannove caratteri, e la soglia era quattordici. Ora servono
   trenta caratteri e cinque parole.
4. **Novanta persone su trecento prese in un raid legittimo.** Twitch dice che è
   un raid; da lì il coro si giudica sulla cadenza — le persone scrivono a caso,
   le macchine a passo — come già si fa per i follow.
5. **Il problema del test ripetuto.** Rifacendo il giudizio a ogni bocca nuova
   lo si fa cento volte, e a furia di riprovare il caso finisce per dare ragione
   all'accusa: otto persone su trecento venivano prese così, una alla volta. Ora
   si guarda quando il numero raddoppia.

E una lezione sul simulatore stesso: nel primo scenario del raid faceva scrivere
«uno ogni tre», e così gli intervalli fra i messaggi diventavano molto più
regolari di come sono davvero. Lo scenario si metteva a somigliare a una
macchina da solo — **un simulatore che simula male misura sé stesso.**

## Come si usa

```
node scripts/simula.mjs                    tutti gli scenari
node scripts/simula.mjs coro raid-vero     solo questi
```

Gli scenari veloci girano anche dentro `npm test`
(`test/unita/simulatore.test.mjs`); quelli lenti e quelli dichiaratamente
incompleti restano allo script.
