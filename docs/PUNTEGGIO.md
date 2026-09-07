# Il punteggio: quanto un account somiglia a una macchina

Non c'è magia neanche negli strumenti di riferimento: è uno scoring su segnali
che l'API di Twitch espone. La differenza fra farlo bene e farlo male non sta
nei pesi. Sta in due cose: quali segnali sono davvero ottenibili, e come si
sommano.

## Il difetto dello schema ovvio

Lo schema che viene in mente per primo è un punto per ogni indizio, e sopra una
soglia è un bot. Applicato a chi vogliamo proteggere dà questo:

| chi | punti | esito |
|---|---|---|
| spettatore nuovo e timido (10 giorni, guarda e non scrive) | 7 | probabile bot |
| lurker vecchio senza foto | 5 | probabile bot |
| **follow-bot vero** | **7** | probabile bot |

Lo spettatore nuovo e il follow-bot prendono **lo stesso numero**. Non è un
problema di taratura: è che età, avatar di default e bio vuota **non sono tre
prove, sono una sola**. Un account creato ieri ha per forza l'avatar di default
e la bio vuota. Sommarli è contare tre volte lo stesso fatto, e il conto lo paga
il pubblico nuovo — cioè proprio chi uno streamer non può permettersi di
perdere.

## Quattro famiglie, ognuna col suo tetto

| famiglia | tetto | cosa dice |
|---|---|---|
| **A · profilo** | 3 | l'anagrafica: età, avatar, bio |
| **B · nome** | 5 | in lista (5), pattern promozionale (4), aria di nome generato (2) |
| **C · presenza** | 6 | in quanti canali nostri sta nello stesso momento |
| **D · comportamento** | 3 | entrato in un'ondata (2), non ha mai scritto (1), non segue (1) |

Il tetto è quello che chiude il difetto: un account nuovissimo e spoglio vale 3,
non 5, perché è la stessa notizia detta tre volte.

## La regola che sta sopra al numero

**Si agisce solo con una famiglia forte.** Le famiglie forti sono il nome
riconosciuto (B) e la presenza in molti canali (C): sono fatti che una persona
non può produrre. Profilo e comportamento descrivono benissimo uno spettatore
appena arrivato, e da soli possono far **guardare**, mai **agire**.

L'aria di nome generato non dà forza, pur stando nella famiglia B: è
un'euristica sulla forma delle lettere, non un fatto. Fra le persone vere ci
sono nomi strani.

### La soglia non si sceglie, si deriva

`SOGLIA_AGISCI = tetto profilo + tetto comportamento + 1 = 7`.

È il punto esatto in cui le famiglie deboli, tutte al massimo, non bastano più:
sette vuol dire che almeno un punto arriva per forza da un nome o dalla
presenza. Così «serve una famiglia forte» non è una regola appoggiata sopra al
numero — è il numero. E se domani qualcuno alza un tetto, la soglia si alza da
sola con lui.

### Come cambiano i conti

| chi | punti | esito |
|---|---|---|
| persona vera con profilo | 0 | niente |
| lurker vecchio senza foto | 4 | niente |
| spettatore nuovo e timido | 5 | segnalato, **mai toccato** |
| nuovo, timido, e col nome strano | 8 | segnalato, **mai toccato** (nessuna famiglia forte) |
| bot promozionale nuovo | 7 | si agisce |
| follow-bot in lista | 8 | si agisce |
| lurker-bot in 12 canali | 9 | si agisce |
| lurker-bot in 3 canali | 5 | segnalato (tre schede aperte le ha chiunque) |

## I segnali che si possono avere davvero

Due della lista che viene naturale scrivere non si possono usare, ed è meglio
saperlo prima di costruirci sopra.

**«Segue oltre mille canali» non è ottenibile.** `GET /helix/channels/followed`
richiede il token dell'utente stesso e lo `user_id` deve corrispondere a quello
del token: un canale non può chiedere chi segue un altro account. Era il segnale
col peso più alto.

**«Non ha mai streammato» non è un segnale.** `broadcaster_type` è vuoto per
chiunque non sia affiliato o partner, cioè per la stragrande maggioranza degli
spettatori normali. Darebbe punti a tutti: è rumore.

Quello che resta, e come costa:

| segnale | dove | costo |
|---|---|---|
| età, avatar, bio | `Get Users`, cento login per chiamata | una chiamata ogni cento |
| nome nella lista / pattern | file locale, regex | zero |
| **presenza in più canali nostri** | le liste dei presenti che chiediamo già | **zero** |
| non ha mai scritto qui | la nostra memoria della chat | zero |
| guarda ma non segue | `Get Channel Followers` con `user_id` | una chiamata per account |

Il secchio del rate limit è **per client e per utente**, quindi il costo si
distribuisce fra i canali invece di accumularsi su uno solo.

## La presenza: il segnale forte, e non serve crawlare Twitch

Un lurker-bot esiste per gonfiare i numeri, quindi deve stare in molti canali
insieme. È l'unica cosa che una persona non può produrre.

Per vederlo non serve crawlare tutto Twitch: bastano i canali che il bot già
serve. E la lista di chi c'è la chiediamo **già ogni cinque minuti** per contare
le ore guardate — il segnale costa zero chiamate nuove.

Degrada da solo. Con pochi canali serviti lo scalino alto non scatta mai e la
famiglia vale zero: quando non ha dati resta zitto, non inventa.

**Del censimento si tiene solo il conteggio, mai l'elenco dei canali.** Quello
sarebbe un registro di chi guarda cosa, e non è roba nostra. Vive in memoria e
non ha bisogno di una casa: dopo un riavvio si ricostruisce da solo al primo
giro, cioè in cinque minuti.

## Il giro delle presenze

Il lurker-bot non si incontra nel percorso dei messaggi, perché non scrive: è
tutto il suo mestiere. Lo si incontra guardando chi c'è in chat. Ogni giro si
prendono i presenti che stanno in almeno tre canali nostri e non hanno mai
scritto lì, si chiedono i loro profili in un colpo solo, e chi supera la soglia
di segnalazione finisce fra le segnalazioni aperte.

**L'azione è sempre e solo segnalare.** Un lurker silenzioso non fa danno mentre
lo si guarda, e il costo di sbagliare è una persona vera cacciata dal canale.
Si spegne dal pannello, sotto Scudo anti-bot.

## Misurare i propri errori

«I pesi li tari sui tuoi falsi positivi» è giusto, ma i falsi positivi bisogna
poterli **contare**, sennò tarare vuol dire indovinare con più passaggi.

Qui il conto si fa da solo, e senza etichettare niente a mano. Ogni giudizio
abbastanza alto viene segnato con la data. Poi si guarda una cosa sola: quel
tale, **dopo**, ha parlato in chat? Una macchina che gonfia i numeri non scrive;
una persona prima o poi dice qualcosa. Chi parla dopo essere stato segnato è un
errore nostro.

La console riporta due percentuali, e la seconda è quella che conta: sbagliare
un «guarda questo» costa uno sguardo, sbagliare un «togli questo» costa una
persona.

Non intercetta niente nel percorso dei messaggi: la domanda si fa al momento del
rapporto, sulla memoria della chat che c'è già.

## Cosa questo non è

Non è la rete di Sery_Bot. Loro stanno su oltre 250.000 canali e vedono l'attacco
sul canale A per riconoscerlo sul canale B: quella è scala, non codice. La
nostra presenza cross-canale vale quanto sono i canali che serviamo, e cresce
con loro.

E la lista pubblica che usiamo come base è ferma: 6.590 nomi, uno solo aggiunto
nell'ultimo anno, zero negli ultimi trenta giorni. Serve come verità nota sui
bot vecchi, non come difesa contro quelli di questo mese. Il resto lo fanno la
cadenza, la velocità, il coro e — da adesso — la presenza.

## Le prove

`test/unita/punteggio.test.mjs`, dentro `npm test`. Sedici casi, e i due che
contano davvero sono il primo (lo spettatore nuovo non prende il punteggio di un
bot) e il terzo (senza famiglia forte non si agisce, per quanto sia alto il
numero). Ogni prova è stata vista rossa rompendo il codice sotto: dodici
rotture, dodici rossi.
