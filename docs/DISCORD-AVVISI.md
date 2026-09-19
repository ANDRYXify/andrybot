# Gli avvisi su Discord

## Il modello

Un avviso è il **prodotto di due cose indipendenti**:

- **CHI** va in diretta — il canale stesso, un altro streamer aggiunto a mano,
  un membro della community;
- **DOVE** deve arrivare — un gruppo o un topic Telegram, un canale Discord.

Le due cose non si conoscono. Chi scopre la notizia dice *cos'è successo* e *di
chi*; dove finisce lo decide la matrice delle destinazioni, e lo decide una
volta sola.

## Dove il prodotto era collassato

1. **Il giro degli amici era di proprietà di Telegram.** La prima riga diceva
   `if (!conf?.attivo || !conf.token) continue`: senza un bot Telegram non si
   guardava nessun amico. Chi ha solo Discord non aveva il giro spento — non ce
   l'aveva, e nessun errore glielo diceva.
2. **Discord aveva una destinazione sola** (`settings.discord`): un canale, un
   messaggio. Niente «quali eventi», niente «di chi», niente secondo canale.
3. **La levetta «anche la community» viveva dentro la configurazione di
   Telegram.** Per chi ha solo Discord non esisteva proprio.
4. **Il post nuovo su Instagram** e la **diretta su TikTok** parlavano solo a
   Telegram: sapevano arrivare a un topic e non a un canale.

## Come è fatto adesso

### Un giro solo, due sezioni distinte

`_giroAmici()` in `src/bot.js` gira ogni due minuti e chiede a Twitch come stanno
gli amici. È **uno** perché chiedere due volte come sta lo stesso canale sarebbe
il doppio delle chiamate per la stessa risposta. Parte se c'è **almeno una
destinazione**, di qualunque trasporto (`_haDoveAvvisare`).

Le **sezioni** invece sono due e restano due: Telegram ha le sue destinazioni
nella scheda Telegram, Discord ha le sue nella scheda «Avvisi» dentro Discord.
Spegnere una non tocca l'altra.

### Un punto solo di diffusione

`_diffondi(login, evento, chi, d, …)` è l'unico posto da cui parte un avviso.
Dentro, serve Telegram e Discord. Chi scopre la notizia — la propria diretta, la
diretta di un amico, un post nuovo — chiama lui e non i trasporti.

L'anti-doppione **non** sta qui: appartiene a chi scopre. La propria diretta usa
`dirette.gia(canale, piattaforma, id)`; quella di un amico usa
`amici.ultima_live`, che è per canale-che-guarda × amico-guardato. Due canali che
guardano lo stesso amico non si pestano i piedi.

### Le destinazioni Discord

Tabella `discord_dest`, gemella di `telegram_dest`. Per ogni riga:

| campo | cosa dice |
|---|---|
| `canale` | il canale del server (o l'impronta del webhook) |
| `webhook` | la strada vecchia: un indirizzo invece di un canale |
| `eventi` | CSV degli avvisi ammessi; vuoto = tutti |
| `streamer` | CSV di chi è ammesso; vuoto = tutti |
| `messaggio` | il testo di QUESTA destinazione; vuoto = quello di casa |
| `ruolo` | l'id del ruolo da chiamare; vuoto = nessuno |
| `chiudi` | togli l'avviso quando la diretta finisce |
| `msg_id` | l'ultimo avviso mandato qui, per poterlo togliere |

`dcMsg` ricorda gli avvisi **per destinazione e per streamer**: senza, la diretta
di un amico che finisce cancellerebbe l'avviso della mia.

### Chiudere un avviso è riscriverlo, non cancellarlo

Cancellare un messaggio passa da `DELETE /channels/{c}/messages/{id}`. Quella
porta, con **«pulire»** (MANAGE_MESSAGES) in mano, cancella il messaggio di
*chiunque* — e il bot quel privilegio **ce l'ha**: lo tiene per poterlo passare
al ruolo «Moderatori» che il costruttore crea, perché Discord permette a un bot
di dare a un ruolo solo i privilegi che ha lui. Una porta che esiste è una porta
che un giorno qualcuno punta altrove, magari in buona fede.

Quindi l'avviso non si cancella: si **riscrive**. A diretta chiusa diventa
«ha finito la diretta» e perde l'incorniciato. È sicuro **per costruzione, non
per promessa**: Discord rifiuta sempre la modifica di un messaggio scritto da un
altro, qualunque permesso si abbia — la stessa chiamata puntata su un messaggio
altrui non fa niente. Vedi `scripts/verifica-poteri.mjs`: *si distribuiscono, non
si usano.*

Per un webhook vale lo stesso, con `PATCH {webhook}/messages/{id}`: un webhook
può riscrivere solo ciò che ha scritto lui.

### Un webhook è un posto

Chi aveva la strada vecchia continua a ricevere senza aver fatto niente: `migra`
trasforma il webhook in una destinazione come le altre, e `diffondi` gli bussa
con un POST invece che con l'API del bot. Toglierla avrebbe voluto dire spegnere
gli avvisi a qualcuno in cambio di un miglioramento che non ha chiesto.

Il POST va con `?wait=true`: senza, Discord risponde «204, fatto» e l'id del
messaggio non torna indietro — e senza id la levetta «togli quando finisce» ci
sarebbe e non farebbe niente.

### La menzione non sveglia più di quanto si è scelto

`allowed_mentions` elenca **solo** il ruolo scelto per quella destinazione.
Prima era `parse: ['roles', 'everyone']` per tutti: un `@everyone` scritto per
sbaglio nel testo svegliava l'intero server.

### «Anche la community» è per trasporto

`avvisiConf` tiene `settings.avvisi.community = { telegram, discord }`. La lista
di chi guardare è condivisa — si sincronizza se la vuole **almeno una** sezione —
ma al momento dell'avviso ogni trasporto controlla la sua levetta: chi arriva
dalla community entra solo dove è stato chiesto. Chi è stato aggiunto a mano
entra sempre, perché l'ha scelto lo streamer.

La migrazione si fa **leggendo**: finché nessuno salva in `settings.avvisi`, per
Telegram vale la vecchia `telegram.community_live`. Nessun dato si sposta.

### La lista degli amici ha un nome onesto

La tabella si chiama ancora `telegram_amico` — i dati stanno lì da sempre e
spostarli non aggiungerebbe niente — ma l'export si chiama `amici` e le porte
stanno sotto `/api/streamer/amici`. Il nome vecchio faceva dire una bugia a ogni
richiamo.

## Il testo

Discord tiene il suo compositore (`testoDiretta`) perché ha l'**incorniciato**,
che Telegram non ha: lì dentro titolo, gioco e spettatori sono già disegnati, e
ripeterli sotto vuol dire mandare due volte la stessa cosa.

I **segnaposto sono gli stessi** di Telegram — `{nome} {titolo} {gioco}
{spettatori} {link} {login} {piattaforma}` — così chi scrive un messaggio non
deve imparare due lingue perché lo manda in due posti. I valori si sfuggono per
il markdown e non per l'HTML: un titolo con un asterisco dentro, su Discord, si
porterebbe via mezzo messaggio in corsivo.

## Il link non si mangia la punteggiatura

`riempi` in `discord-collega.js` mette **sempre uno spazio dopo `{link}`**.
«apri {link}: ti faccio entrare» diventava «…/andryxify: ti» e i due punti
finivano *dentro* l'indirizzo: il tasto c'era, la pagina no. Non era un errore di
quella frase — era un errore possibile in ogni frase, comprese quelle scritte
dallo streamer, che non rilegge nessuno. Brutto e funzionante batte elegante e
rotto; le frasi di casa non ci arrivano mai, perché il link sta in fondo.

## Il pannello

La scheda «Avvisi» sta dentro la famiglia Discord, accanto a «Ruoli» e «Il
server». Ogni destinazione è una scheda che si apre: quali avvisi, di chi, il
testo, il ruolo da chiamare, «togli quando finisce», «acceso», «Prova», «Togli».
Si salva da sola appena cambi qualcosa: un tasto «Salva» in fondo a una scheda
aperta è un tasto che ci si dimentica di premere.

Nell'elenco dei canali quelli **muti** sono segnati: offrirne uno vorrebbe dire
far scegliere un posto che poi non funziona, senza dire perché. Il conto lo fa
`permessiNelCanale`, a cui vanno passati i permessi di partenza del bot — senza,
tornerebbe zero e l'elenco sarebbe tutto muto.

Chi ha **solo Discord** non ha una diretta sua (`conDiretta('discord')` è falso):
fra le persone non compare «Io», perché sarebbe offrirgli un avviso che non
arriverà mai. Gli eventi diretta restano, perché i suoi amici streammano.

La carta «Discord — avviso sei in diretta» con il tutorial del webhook è sparita
dalla scheda Avvisi: non serve più da quando il bot sta dentro il server, e al
suo posto c'è una riga che porta alla sezione giusta.
