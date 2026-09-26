# Il ponte: portare qui quello che hai già

> © 2024–2026 Andrea Taliento (ANDRYXify)

## Il problema

Il freno all'adozione non è il prezzo: è che uno streamer con quattrocento
comandi su Nightbot non li riscrive a mano. Finché non c'è un ponte, la riva
bella resta vuota. Prima di oggi il ponte non c'era affatto — gli altri bot
comparivano nel codice solo come domini in una allowlist e come «bot buoni»
nell'antibot.

E un trasloco non è finito coi comandi: restano i **timer** e i **punti** del
pubblico. La carta «Porta qui quello che hai già» nei Moduli prende tutte e tre
le cose dallo stesso posto e nello stesso modo: si incolla del testo, si guarda
l'anteprima, si importa. Il codice sta in `src/features/importacomandi.js`, la
rotta in `POST /api/streamer/comandi/importa`, il registro dei punti in
`points.importa` di `src/db.js`.

## Perché si importa del TESTO, non da un servizio

Leggere dall'API di Nightbot o StreamElements vorrebbe dire chiedere allo
streamer un altro OAuth verso un servizio terzo, e restare legati a un'API che
possono cambiare o chiudere domani. Qui si accetta **qualunque testo che lo
streamer riesca a copiare**: l'export del suo bot, un CSV, o un elenco scritto
a mano. Un formato nuovo è un lettore nuovo, non un'integrazione nuova — e
funziona anche con bot mai visti.

Tre lettori, riconosciuti da soli:

| Formato | Esempio |
|---|---|
| JSON | `{"commands":[{"name":"!x","message":"…"}]}` (Nightbot), `[{"command":"x","reply":"…"}]` (StreamElements), `{"timers":[…]}`, `{"users":[{"username":"x","points":10}]}` |
| CSV | con o senza intestazione, virgolette rispettate; a virgole, a punto e virgola (il CSV all'italiana) o a tabulazioni (quello che si copia da un foglio di calcolo) |
| elenco | `!nome risposta`, `nome: risposta`, `nome -> risposta`, `nome \| risposta`, `ogni 15 minuti: messaggio`, `nome 1200` |

## Cosa è cosa: lo dice la forma

Un file non si indovina a maggioranza. Ogni pezzo dichiara cosa è con la sua
forma, e la regola è una sola per tutti i lettori.

**JSON.** Si guardano l'elenco in cima, o gli elenchi dentro l'oggetto in cima
(`commands`, `timers`, `users`, qualunque nome). Ogni voce si classifica da sé:

| la voce ha | è |
|---|---|
| un intervallo (`interval`, `online`, `offline`, `chatLines`, `lines`, `minutes`…) e almeno un messaggio | un timer |
| un nome di persona e un numero di punti, e nessun messaggio | un saldo di punti |
| un nome e una risposta | un comando |

Il timer viene prima del comando perché un timer di Nightbot ha anche `name` e
`message`: senza quest'ordine diventerebbe un comando che si chiama come il
timer.

**CSV.** Decide l'intestazione. Una colonna di punti e una di nomi, senza
colonna di messaggi: punti. Una colonna di intervallo e una di messaggi: timer.
Nome e risposta: comandi. Senza intestazione, un file in cui **ogni** riga è
«nome valido, numero» è un elenco di punti; altrimenti vale la lettura di
sempre, comando e risposta.

**Elenco a mano.** Ogni riga si legge da sola, nell'ordine:

1. `!nome risposta`: un comando;
2. `ogni 15 minuti: messaggio` (anche `every`, `cada`): un timer;
3. `nome 1200` (o `nome: 1200`, `nome, 1200`): un saldo, se dopo il nome c'è
   **solo** un numero;
4. `nome: risposta`: un comando.

La terza viene prima della quarta: una risposta fatta di un solo numero non è
un comando plausibile, un saldo sì. L'anteprima mostra comunque come è stata
letta ogni riga prima di scrivere qualcosa.

## Perché le variabili si traducono davvero

Il dialetto dei Moduli è quasi uno a uno con quello di Nightbot, quindi quasi
tutto si traduce **per intero**, non per approssimazione:

| altrove | qui |
|---|---|
| `$(user)` `${user}` `$(sender)` | `$user` |
| `$(touser)` | `$touser` |
| `$(count)` | `$count(<nome del comando>)` |
| `$(query)` `${message}` | `$args` |
| `$(1)` `$(2)` | `$arg1` `$arg2` |
| `$(channel)` `$(game)` `$(title)` `$(uptime)` `$(viewers)` | `$canale` `$gioco` `$titolo` `$uptime` `$spettatori` |

Quello che resta fuori (`$(urlfetch)`, `$(customapi)`, `$(eval)`,
`$(twitch …)`) viene **dichiarato**, mai importato di nascosto — e dove qui si
può fare in un altro modo, l'anteprima dice quale: un `$(urlfetch)` diventa
un'azione «webhook» dei Moduli. Un comando che scrive «sei morto $(count)
volte» davanti a tutta la chat è peggio di un comando non importato.

## I timer

Un timer diventa un modulo con innesco «a tempo» e un'azione «messaggio».

**L'intervallo.** Si leggono minuti (`15`), forme brevi (`15m`, `1h`, `1h30`,
`2 ore`) e l'orario **cron** che usa Nightbot (`*/15 * * * *`). Il cron si legge
per intero: si calcolano i minuti del giorno in cui scatta e si guarda se sono
equidistanti, compreso il salto da un giorno al successivo. Se lo sono, quella
distanza è l'intervallo, esatto.

Se non lo sono, nessun intervallo lo rappresenta. `0 */5 * * *` sembra «ogni
cinque ore», ma scatta a 0, 5, 10, 15, 20 e di nuovo a 0: a mezzanotte ne
passano quattro. Scartarlo non servirebbe a nessuno, inventare «ogni 300 minuti»
sarebbe una bugia. Si tiene quello che conta per chi guarda, **lo stesso numero
di messaggi al giorno** (1440 diviso gli scatti: qui 288 minuti), e il timer
entra da rivedere con il motivo accanto. Lo stesso per un timer che parlava
solo in certi giorni o mesi: entra, da rivedere, e c'è scritto che qui parla
tutti i giorni. Una volta al giorno a un'ora fissa entra anche lui da rivedere:
qui un timer si ripete ogni 24 ore da quando lo importi, non a quell'ora.

Resta fuori solo un orario che non si sa leggere, e un intervallo oltre le 24
ore, che è il massimo anche nell'editor dei moduli.

**Le righe di chat.** Nightbot e StreamElements chiedono un minimo di righe
negli ultimi 5 minuti; qui il minimo si conta fra un annuncio e l'altro. Si
porta lo **stesso numero**: con intervalli da 5 minuti in su (i loro minimi) la
finestra di qui contiene sempre gli ultimi 5 minuti, quindi ogni volta che il
timer parlava prima, parla anche qui. Non è mai più severo di prima, ed è la
cosa che conta dopo un trasloco («i miei timer non vanno più» è il guaio da
evitare). Oltre i 1000 messaggi, il massimo dell'editor, si dice.

**In diretta o anche fuori.** Qui un timer parla solo in diretta, a meno di
dirlo. Nightbot invece parla anche a canale spento, e il timer lo porta con sé
(«anche a canale spento» si legge nell'anteprima). StreamElements ha un
intervallo per la diretta e uno per fuori:

| diretta | fuori | qui |
|---|---|---|
| sì | no | un modulo, solo in diretta |
| no | sì | un modulo, solo fuori diretta |
| sì, ogni N | sì, ogni N | un modulo, anche a canale spento |
| sì, ogni N | sì, ogni M | **due** moduli: «(in diretta)» ogni N, «(fuori diretta)» ogni M |

Due moduli non sono un'approssimazione: sono esattamente il comportamento di
prima, e costano due posti, che l'anteprima conta.

**Più messaggi.** StreamElements può alternare più messaggi nello stesso
timer. Qui diventano un solo messaggio `$scegli(uno|due|tre)`: lo stesso ritmo,
un messaggio per volta, ma scelto a caso e non in fila, e l'anteprima lo scrive
accanto al timer. Se un messaggio contiene `|` o `)` non si può mettere dentro
`$scegli` senza romperlo: allora entra solo il primo, da rivedere, e lo si dice.

**Un timer che lancia un comando.** Negli altri bot un timer che scrive
`!social` fa partire il comando. Qui un timer scrive e basta, quindi se il
comando c'è (nello stesso file o fra i moduli, fatto di un solo messaggio) il
timer prende la sua risposta, e lo dice. Se non c'è, resta da rivedere.

**Chi è chi.** Un timer si riconosce dal nome. Chi arriva con un nome (Nightbot,
StreamElements) lo tiene; chi non ce l'ha (una riga a mano) lo prende dalle
prime parole del messaggio, sempre allo stesso modo, così importare due volte
lo stesso elenco non raddoppia niente. Stesso nome e stesse regole: «identico».
Stesso nome e regole diverse: «sostituisce quello che hai».

Le variabili si traducono come nei comandi, con gli stessi avvisi.

## I punti

I punti del bot di prima diventano **monete** del canale, quelle dei giochi e
dei premi.

**Si sommano, una volta sola.** Chi ha già monete qui non le perde: i punti
importati si aggiungono. Ma importare due volte lo stesso file non deve
regalare due volte gli stessi punti, e chi importa un export aggiornato dopo
una settimana di convivenza fra i due bot deve ritrovarsi il saldo nuovo, non
la somma dei due. Per questo ogni riga della tabella `points` tiene in
`importate` quanto è arrivato dall'ultima importazione, e una nuova importazione
aggiunge solo la **differenza**:

```
monete  = max(0, monete + nuovo − importate)
importate = nuovo
```

Per costruzione: lo stesso file due volte cambia zero, un file aggiornato
cambia solo quello che è cambiato, le monete guadagnate qui restano. Vale per
chi è nel file; chi non c'è non viene toccato, perché un export parziale (i
primi mille, per esempio) non deve azzerare gli altri. Un nome presente con
zero punti invece toglie quanto era arrivato dall'importazione di prima.

**Il cambio.** «Ogni quanti punti di prima, una moneta»: di serie uno. Chi aveva
un'economia molto più generosa può dividerla, e l'anteprima mostra i saldi già
convertiti. Il registro conta le monete, non i punti, quindi cambiare il cambio
fra due importazioni si corregge da solo.

**Cosa resta fuori, e lo si dice:**

- i bot noti (quelli che non contano nelle ore guardate e nel muro delle
  emote): il loro saldo non è di una persona;
- i nomi che non sono un nome utente (lettere, numeri e trattino basso, da 2 a
  30), lo stesso controllo delle monete aggiustate a mano;
- i numeri che non sono un saldo: sotto zero, oltre un miliardo (di solito è la
  colonna sbagliata, per esempio un codice), o non numeri;
- i nomi ripetuti nel file, dopo il primo;
- le ore guardate: se il file ha quella colonna, l'anteprima dice che resta
  fuori.

I numeri si leggono come li scrive la gente: `1200`, `1.200`, `1,200`, `1 200`,
`1'200` sono milleduecento; `12,5` è dodici e `1.200,50` milleduecento (le
monete sono intere). Tre cifre dopo il separatore sono sempre migliaia: nessun
bot dà punti con i millesimi.

**Solo il proprietario.** Le monete aggiustate a mano sono del proprietario del
canale, non dei moderatori delegati, perché non si vedono in chat mentre
accadono. L'importazione è la stessa cosa in grande: un moderatore vede
l'anteprima dei punti ma non li importa, e il pannello glielo dice.

**Quanti.** Fino a 50.000 persone per file; oltre si dice quante sono rimaste
fuori. Il testo può arrivare a 1,5 MB.

## Due passi, mai uno

Prima l'**anteprima** — che non tocca niente e dice esattamente cosa
succederebbe: cosa entra, cosa sostituisce ciò che hai già, cosa è identico e
quindi si salta, cosa va rivisto e perché, cosa viene scartato e per quale
motivo, e quanti posti restano. Per i punti: quante persone, quante monete
entrano in tutto, chi è nuovo, e i primi saldi come saranno dopo. Comandi e
timer si dividono i posti dei moduli, e l'anteprima li conta insieme. Poi
l'**applicazione**, solo di ciò che è stato mostrato. Non si scrive mai niente
che lo streamer non abbia visto prima.

Questo vale anche nei dettagli: «Importa» manda il testo e il cambio
dell'anteprima che si ha davanti, non quello che c'è nella casella in quel
momento, e toccare il testo cancella l'anteprima. Cambiare il cambio rifà
l'anteprima prima di poter importare.

I comandi importati diventano **Moduli** (trigger «comando» + azione
«messaggio»): è esattamente ciò che un comando di Nightbot è, e lo streamer li
ritrova dove cercherà, insieme agli altri.

## Un difetto trovato scrivendo le prove

La prima versione accettava uno spazio nudo come separatore: incollare una frase
qualunque **inventava comandi** («solo una frase senza struttura» diventava
`!solo`). Ora una riga è un comando solo se lo *dichiara* — la `!` attaccata al
nome, o un separatore esplicito.

## Collaudi

`test/unita/importacomandi.test.mjs` (lettura, traduzione, anteprima di tutti e
tre) e `test/unita/importapunti.test.mjs` (il registro nel database: due volte
lo stesso file, file aggiornato, monete guadagnate nel mezzo, zero, cambio).
