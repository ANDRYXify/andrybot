# I giochi non sono una lista: sono un motore

## Il difetto di partenza

I Moduli sanno fare **QUANDO → SE → ALLORA** su quasi tutto: comandi, parole,
eventi, timer, gesti alla webcam; e in risposta messaggi, effetti, clip, titolo,
categoria, canzoni, annunci, webhook. Su una cosa sola non potevano niente: la
**moneta del canale**.

Così i giochi erano una lista fissa scritta nel codice — `!slot`, `!duello`,
`!roulette`, `!furto`, `!regala` — e allo streamer restava solo cambiarne i
numeri. Poteva inventare qualunque automazione **tranne** quelle che riguardano
la sua economia, cioè proprio quelle che rendono un canale suo.

La risposta giusta non era aggiungere altri giochi fissi. Era **aprire il motore
sull'economia** e lasciare che i giochi se li costruisca lui.

## Tre pezzi, non venti impostazioni

| pezzo | dove sta | cosa apre |
|---|---|---|
| **costa** | condizione | il comando si paga in monete |
| **serve almeno** | condizione | il comando è riservato a chi ha accumulato (senza spendere) |
| **cooldown per persona** | condizione | ferma *te*, non tutti — senza, un gioco lo si spamma |
| **dai / togli punti** | azione | muove monete: a chi scrive, a chi è taggato, a uno a caso, a un nome fisso |
| **altrimenti** | blocco | cosa fare quando la probabilità non passa: il ramo del gioco perso |

Sono ortogonali: combinandoli escono i giochi di prima e infiniti altri.

```
!slot      costa 100 · probabilità 20% · ogni 30s a testa
           → dai 500 monete a chi scrive, "hai vinto!"
           ALTRIMENTI "perso, ti restano $saldo"

!regala    costa 50 → dai 50 monete a chi è taggato

!furto     serve almeno 200 → togli $random(1,50) monete a uno a caso
```

## L'ordine delle condizioni è il progetto

Non è estetica: è ciò che garantisce che nessuno paghi per niente.

1. ruolo, piattaforma, live/offline — **rifiutano senza consumare**
2. patrimonio minimo, monete sufficienti — **verificano, non addebitano**
3. cooldown del modulo, cooldown per persona — **consumano**
4. **il pagamento**
5. la probabilità — **l'ultima**

Da qui, due proprietà che valgono più di qualunque impostazione:

- **Nessuno paga per un comando che sarebbe stato rifiutato comunque.** Se non
  sei mod e il comando è per i mod, le tue monete non le tocca nessuno.
- **Nessuno brucia un cooldown per un comando che non può permettersi.**
- **Si paga per giocare, non per vincere.** Il costo è tolto *prima* del tiro di
  dado, quindi il ramo «altrimenti» parte già pagato, come in una macchinetta.

Il perché del punto 5: la probabilità è l'unica condizione che ha un
«altrimenti». Metterla per ultima è ciò che rende quel ramo raggiungibile
sempre nello stesso stato — pagato.

## Le variabili per raccontarlo

Un modulo che muove le monete e non sa dirlo è mezzo modulo.

| | |
|---|---|
| `$punti` | quante monete ha chi scrive |
| `$punti(nome)` | quante ne ha un altro — anche `$punti($touser)` |
| `$monete` | come hai chiamato la tua moneta |
| `$posizione` | a che posto sta chi scrive **nella sua gara** (vuoto se non è in classifica) |
| `$top(3)` | i primi tre, già formattati |
| `$costo` · `$saldo` | quanto è costato, e quanto resta dopo aver pagato |

Si pagano solo se citate: una lettura in più su ogni messaggio di chat non si
giustifica per una variabile che quasi nessuno usa.

## Sicurezza

Un Modulo resta **dati, mai codice**. `quanto` passa dall'espansione (così
`$random(1,50)` è un premio variabile) e poi da un `Number`: se non è un numero
non succede niente, e comunque non si superano il milione per azione.

Il destinatario passa sempre da `loginBuono`: `$touser` arriva da ciò che uno
scrive in chat, quindi un nome che non è un nome utente — `[bot]`, una frase,
trenta caratteri — non riceve niente. Un costo negativo, che *regalerebbe*
monete a ogni uso, viene azzerato al salvataggio; i cooldown assurdi si fermano
a un giorno.

## Il cancello

Un Modulo attraversa quattro posti: il motore che lo esegue, il server che lo
valida, l'editor che lo disegna e rilegge, il riassunto che lo racconta in una
frase. Aggiungere un pezzo in tre posti su quattro **non dà errore**: dà una
funzione che c'è a metà.

`scripts/verifica-moduli.mjs` non ha elenchi scritti a mano: ricava le liste dai
file e pretende che combacino. Ha trovato subito due incoerenze vere — una mia,
appena fatta (le variabili delle monete avevano la pillola da cliccare ma nessuna
spiegazione nella legenda), e una che c'era da sempre (`$decimale` e `$misura`,
offerte e mai spiegate).

Provato rosso su tre difetti veri: un'azione che l'editor non sa disegnare, una
che il server rifiuterebbe, una variabile offerta senza spiegazione.
