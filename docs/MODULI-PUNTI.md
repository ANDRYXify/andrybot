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
| `$mossa` · `$bersaglio` | quante monete ha mosso l'ultima azione «punti», e su chi |

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

### `$mossa` non è la cifra chiesta, è quella riuscita

Serve a due cose che senza di lei non si possono fare.

**Riusare la stessa cifra.** Un furto scritto come «togli `$random(20,80)` a uno
a caso, dai `$random(20,80)` a chi scrive» è sbagliato: sono due tiri diversi, la
vittima perde 40 e il ladro guadagna 70. Con `$mossa` la seconda azione muove
esattamente quello che ha mosso la prima.

**Raccontare cosa è successo.** L'azione «a uno a caso» pesca il nome dentro di
sé: senza `$bersaglio` il messaggio non potrebbe dire chi è stato derubato.

E vale «quella riuscita» perché a chi ha 30 monete non se ne possono togliere 80:
il messaggio deve dire 30, non 80.

## Il costo può essere un'espressione

`costa 100` è un numero. `costa $arg1` è ciò che uno scrive: senza,
`!scommetti 100` non si può fare — ed è metà dei giochi a punti.

Vale la stessa aritmetica di sempre: espansione, poi un intero fra 0 e un
milione. Un `$arg1` che non è un numero (`!scommetti pippo`) vale zero — il
comando passa senza addebitare — e un `-500` non regala monete.

## Aggiustare le monete a mano

Dal pannello, sotto la classifica: nome e quante monete (con il meno si
tolgono). Serve per riparare un errore — un gioco andato storto, un premio non
arrivato.

Sta **solo al proprietario**, e non per gerarchia: la ricetta «Dai monete» fa la
stessa cosa in chat, la possono usare i moderatori, e soprattutto **si vede**
mentre accade. Questa è silenziosa. Le due strade non sono ridondanti: sono la
stessa azione con due livelli di visibilità, e chi può fare la cosa silenziosa è
chi risponde del canale.

## Dove uno li cerca

Il motore c'era, ma nella scheda **Comandi**. Chi voleva inventare un gioco
andava in **Giochi**, trovava cinque forme già pronte — quiz, parola veloce,
anagramma, sequenza, domanda — dove si mettono le proprie domande e le proprie
parole, e concludeva, giustamente, che non si potevano fare giochi propri.

Una capacità che vive dove nessuno la cerca **non esiste**. Per questo la scheda
Giochi ora ha la carta «Inventa un gioco tuo», che dice in una riga cos'è un
gioco — *un comando che costa, un tiro di dado, e cosa succede se vinci o se
perdi* — e porta alle ricette.

Le ricette **aprono l'editor dei Comandi**, non un secondo editor: c'è un posto
solo in cui si costruisce, e due porte per entrarci. Sotto, l'elenco dei giochi
che ti sei costruito — che non è una lista nuova da tenere aggiornata, ma i
Moduli che **toccano la moneta del canale**: un'azione «punti», un costo o un
patrimonio minimo. Chi ne ha uno lo vede lì e lo apre da lì.

Anche l'elenco delle ricette è **uno solo** (`RICETTE_PUNTI`): le due schede lo
disegnano, nessuna delle due può dimenticarsene una per strada, e il cancello
verifica che ogni ricetta offerta abbia davvero il suo modello.

## Le ricette

Un motore senza ricette è una pagina bianca. Le sei nuove usano il meccanismo
dei modelli che c'era già, non un secondo sistema: **Macchinetta**,
**Scommessa**, **Regala monete**, **Furto**, **Quante monete ho**, **Dai monete
(mod)**. Si aprono nell'editor già compilate, e da lì si cambia tutto.

## Chi vince fra il tuo `!slot` e quello pronto

Aprire il motore sull'economia ha fatto emergere un difetto che prima non
poteva esistere: i comandi **pronti** (i minigiochi, le ore guardate, i
sorteggi, `!uptime`, `!cita`, i contatori) giravano *prima* del motore dei
Moduli. Un `!slot` costruito dallo streamer rispondeva quindi **due volte**, e
toccava la moneta due volte.

La regola giusta esisteva già — «quello che ti sei costruito vince» — ma viveva
dentro un file solo: i comandi base la rispettavano, i giochi no. Ora è **una
sola**, in `features/personalizzati.js`, e sta **prima dello smistamento**: se
il messaggio è un comando che lo streamer ha già suo (comando semplice o Modulo
attivo, alias compresi), i comandi pronti non lo vedono nemmeno. Vale per quelli
di oggi e per quelli che verranno, perché è un vaglio solo e non una guardia
dentro ogni famiglia.

Restano **fuori** dal vaglio due cose, e non per distrazione:

- il **conteggio automatico delle parole** e l'**accredito delle monete di
  presenza**, che non sono comandi;
- gli **effetti** (`!airhorn`): sono roba sua, non un comando pronto.

### La copia in memoria non ha una scadenza

Controllare a ogni riga di chat se un comando è «suo» significherebbe leggere il
database a ogni messaggio. Ma una copia **a scadenza** lascerebbe una finestra —
salvi un Modulo, e per qualche secondo risponde ancora la versione pronta.

Quindi non c'è una scadenza: c'è un **numero di revisione**, che il database
alza dentro le uniche funzioni capaci di cambiare i comandi (`commands.set/remove`,
`modules.save/remove/setAttivo`). Chi tiene la copia confronta quel numero. Vive
lì, accanto alle mutazioni, così non esiste un punto di aggiornamento che ci si
possa dimenticare di chiamare — che è precisamente il modo in cui queste cose si
rompono.

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
