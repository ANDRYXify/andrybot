<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
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

`avvisiConf` tiene `settings.avvisiConf.community = { telegram, discord }`. La lista
di chi guardare è condivisa — si sincronizza se la vuole **almeno una** sezione —
ma al momento dell'avviso ogni trasporto controlla la sua levetta: chi arriva
dalla community entra solo dove è stato chiesto. Chi è stato aggiunto a mano
entra sempre, perché l'ha scelto lo streamer.

La migrazione si fa **leggendo**: finché nessuno salva le levette, per Telegram
vale la vecchia `telegram.community_live`. Nessun dato si sposta.

**Il cassetto è suo (ottobre 2026).** Le levette stavano in `settings.avvisi`, lo
stesso cassetto dove i piccoli avvisi su cosa manca (docs/AVVISI.md) tengono le
risposte, e ognuno dei due, salvando, buttava via l'altro: un «non mostrare più»
spegneva in silenzio gli annunci della community su Discord, e una levetta della
community faceva tornare gli avvisi già chiusi. Adesso le levette stanno in
`settings.avvisiConf`; `separaLevetteAvvisiUnaTantum` (in `db.js`) le trasloca
una volta all'avvio, lasciando le risposte dove sono, e chi aveva già il cassetto
nuovo non si tocca. La lettura del posto vecchio resta solo come rete.

**Le porte scrivono dove il bot legge.** La levetta della community di Telegram
(`POST /api/streamer/telegram/community`) scriveva solo nella colonna vecchia,
mentre il bot leggeva `avvisiConf`: chi aveva già toccato la levetta di Discord
spegneva Telegram, vedeva la levetta spenta, e il bot continuava ad annunciare.
Adesso scrive in `avvisiConf` (e tiene allineata la colonna vecchia), il pannello
legge da lì, e la lista condivisa si svuota solo se non la vuole più nessuna
sezione. `test/contratto/rilievo-porte.test.mjs` lo fissa.

### La tua diretta in primo piano

Il gruppo e il server sono di chi li ha collegati; le dirette degli amici e della
community ci passano come **ospiti**. Prima arrivavano identiche a quelle di casa:
la locandina, il suono, il messaggio fissato, il ruolo chiamato. Con cinque amici
in diretta il gruppo suonava cinque volte, e su Telegram l'ultimo fissato si
prendeva la cima del gruppo anche mentre il padrone di casa era in onda.

La regola sta in un posto solo, `features/rilievo.js`, e vale per tutti e due i
trasporti. `rilievo({ casa, chi, posto, risalto })` dà uno di tre rilievi:

| rilievo | quando | Telegram | Discord |
| --- | --- | --- | --- |
| **casa** | la diretta è dello streamer del canale, su qualunque piattaforma | locandina, suono, fissato dove il posto fissa, anteprima grande se la locandina non c'è | ruolo chiamato, immagine larga |
| **ospite** | la diretta è di un altro, in un posto che riceve anche la casa (filtro «di chi» vuoto o con lo streamer dentro) | niente locandina, senza suono, mai fissato, anteprima piccola | nessun ruolo, senza notifica (`flags: 1 << 12`, il «@silent»), immagine nell'angolo |
| **pari** | la diretta è di un altro, in un posto che riceve solo gli altri; oppure levetta spenta | come è sempre stato | come è sempre stato |

Il rilievo non sceglie **dove** va un avviso (lo decidono la matrice e la lista
degli altri), sceglie **come** arriva dove va già. Con la levetta spenta tutto
torna com'era, casa compresa: «spento» vuol dire «come prima».

La levetta è **per trasporto** (`settings.avvisiConf.risalto = { telegram, discord }`)
e accesa di serie. Le porte: `POST /api/streamer/telegram/risalto` e
`POST /api/streamer/discord/avvisi/risalto`, ognuna tocca solo la sua.

Cosa non si rompe nel tempo:

- **Su Discord il rilievo sta nel recapito** (`dati.ospite`), non si ricalcola: un
  ritentativo o una riscrittura coi dati di adesso arrivano come il primo invio,
  anche se nel frattempo qualcuno ha toccato la levetta. Senza, il primo
  aggiornamento avrebbe rimesso l'immagine larga all'ospite.
- **La porta dei segni del bot** (`discord-api.mandaMessaggio`) lascia passare
  solo «senza notifica»: una porta che lascia passare tutto lascia passare anche
  quello che nessuno ha voluto. Il webhook manda il messaggio così com'è.
- **Su Telegram l'avviso in sordina si ricorda lo stesso** (`telegram_msg`): non
  si fissa, ma a diretta finita si toglie dove il posto fissa, come gli altri.
- **La locandina si disegna solo se qualche posto la riceve**: per un ospite che
  arriva solo in sordina sarebbe lavoro buttato (e chiamate a Twitch).
- **Le due strade dell'anteprima non si mescolano**: chi chiede una misura passa
  tutto da `link_preview_options`, chi non la chiede usa ancora
  `disable_web_page_preview`, come prima.

Il pannello dice, in ogni posto, cosa ci succede alle dirette degli altri («qui
arrivano anche le tue: quelle degli altri arrivano in sordina» oppure «qui
arrivano solo gli altri»), e solo dove arrivano davvero: il server dice con quale
avviso arrivano gli altri (`ospitiSu`), e un posto che riceve solo i post o solo
la casa non ha la riga. La riga segue la stessa regola del bot:
`test/unita/rilievo.test.mjs` la confronta con `rilievo()` su 240 casi.

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

## Ottobre 2026: «alcuni avvisi non funzionano benissimo»

Letti dal codice, non indovinati. Sette difetti, e ognuno spiega un «a volte»:

1. **A fine diretta l'avviso non si chiudeva per chi non ha Telegram.** `_chiudiAvvisi`
   cominciava da Telegram con `if (!conf?.token) return;` dentro la funzione: senza Telegram si
   usciva prima di arrivare a Discord. L'avviso restava «è in diretta» per sempre.
2. **Si chiudevano solo le dirette di Twitch, e un avviso solo per posto.** Kick e YouTube
   finivano senza chiudere niente (`fine-live` dimenticava la diretta e basta), TikTok non
   ricordava nemmeno il messaggio. E il ricordo era uno per posto (`discord_dest.msg_id`): in
   diretta su Twitch e su Kick insieme, il secondo avviso cancellava il ricordo del primo.
3. **La diretta finiva da sola appena cominciata.** Lo stato ha due fonti: l'evento di Twitch,
   istantaneo, e il giro ogni due minuti, che chiede a `/streams` di Helix. Quel servizio vede
   una diretta nuova con un minuto e più di ritardo. Se il giro passava in quel minuto, diceva
   «non c'è», ed era una transizione vera per `_setLive`: avviso chiuso con «ha finito la
   diretta», rapporto di una serata vuota, un turno tolto ai premi VIP. Al giro dopo la diretta
   ricompariva e partiva un secondo avviso.
4. **L'avviso usciva vuoto quando la diretta la vedeva prima l'evento.** `_annunciaTwitch`
   chiedeva titolo e gioco a `/streams` nello stesso istante, cioè nel minuto in cui non li
   sa. Senza titolo, senza gioco, e senza l'id della diretta: l'anti-doppione saltava. Se la
   vedeva prima il giro, l'avviso era completo. Da qui il «alcuni sì, alcuni no».
5. **L'immagine all'inizio non c'è ancora.** Twitch fa l'anteprima di una diretta dopo
   qualche minuto: prima, l'indirizzo dà l'immagine grigia di ripiego, e Discord la tiene. E
   «Spettatori 0» non dice niente a nessuno.
6. **Un errore di Discord perdeva l'avviso.** Un «troppe richieste» o un Discord che non
   risponde non si ritentava: se intanto Telegram era andato, la diretta risultava annunciata e
   Discord restava senza. La strada del webhook non aspettava nemmeno il tempo che Discord chiede.
7. **I post nuovi su Discord erano sempre in italiano**, con un testo fisso, e ignoravano il
   messaggio che lo streamer aveva scritto per i post (Telegram lo usava).

### Quando una diretta comincia e quando finisce

Le due fonti non sono uguali, e la regola lo dice:

- **comincia** al primo segnale «c'è», da qualunque fonte;
- **finisce** con l'evento di fine di Twitch, subito; oppure col giro, solo se il giro non la
  vede **due volte di fila** e l'ultimo segnale «c'è» ha più di **cinque minuti**.

Così il ritardo dell'inizio e un giro andato a vuoto a metà serata non chiudono niente, e se
l'evento di fine non arriva (una sottoscrizione caduta) la diretta si chiude lo stesso, qualche
minuto dopo. La decisione è una funzione pura (`src/stream/stato-diretta.js`): la usa
`_setLive`, e le prove la provano da sola.

### Cosa dice l'avviso all'inizio

Solo quello che è vero in quel momento:

- l'id della diretta viene dall'evento (`data.id`), che ce l'ha sempre;
- titolo e gioco vengono da `/channels` di Helix, che li sa subito perché li scrive lo
  streamer prima di partire; `/streams` serve solo se ha già la diretta;
- gli spettatori compaiono solo se sono più di zero;
- l'immagine compare solo se la diretta è partita da almeno cinque minuti (`miniaturaPronta`).

Poi **l'avviso si aggiorna**: ogni dieci minuti, finché la diretta c'è, si riscrive con titolo,
gioco, spettatori e l'immagine appena c'è. Riscrivere un messaggio non chiama di nuovo nessuno.

### Il recapito

Un avviso è un fatto (chi, su quale piattaforma, quale diretta o quale post). Un **recapito** è
quel fatto in **un** posto. La tabella `avvisi_recapiti` ne tiene uno per riga, con lo stato:

| stato | vuol dire |
|---|---|
| `attesa` | da mandare: al primo tentativo o dopo un errore che passa |
| `mandato` | arrivato, con l'id del messaggio |
| `chiuso` | riscritto a diretta finita |
| `perso` | non arriverà: un errore che non passa (il bot non può scrivere lì, il canale non c'è più, il webhook è stato tolto), o troppo tardi |

Le regole, che stanno nella forma della tabella e non nella buona volontà di chi la usa:

- **uno per posto e per fatto**: la chiave è (canale, trasporto, posto, streamer, piattaforma,
  diretta), quindi lo stesso avviso non arriva due volte nello stesso posto, nemmeno dopo un
  riavvio. Senza un id della diretta (TikTok) la chiave è l'istante dell'avviso: meglio
  avvisare che tacere, come prima;
- **un errore che passa si ritenta**: dopo 30 secondi, poi il doppio, fino a cinque minuti fra
  un tentativo e l'altro, per un quarto d'ora. Un posto che ha già ricevuto non riceve di nuovo;
- **chiudere è per streamer e per piattaforma**: la fine della diretta di Kick chiude gli
  avvisi di Kick, non quelli di Twitch, e la fine della diretta di un amico chiude i suoi;
- un recapito ancora in `attesa` quando la diretta finisce diventa `perso`: un «è in diretta»
  dopo la fine sarebbe falso.

Il giro dei recapiti passa ogni 30 secondi: ritenta quelli in attesa, aggiorna quelli mandati,
e una volta all'ora toglie quelli più vecchi di una settimana.

Telegram non cambia, salvo una cosa: la sua chiusura e quella di Discord sono indipendenti, e
nessuna delle due può più impedire l'altra. Il recapito vale anche per lui, ed è il passo
dopo: ha le stesse due mancanze (un avviso perso a un errore, un ricordo per posto).

### I post nuovi nella lingua del canale

La riga di un post nuovo viene dal frasario (momento `avviso-post`, con `{nome}` e
`{piattaforma}`), nella lingua e nel tono del canale, a Telegram e a Discord. Sotto, il titolo e
il link. Se lo streamer ha scritto il suo messaggio per i post, vale il suo, in tutti e due i
posti.

### Le prove

- `stato-diretta`: l'inizio da qualunque fonte; il giro che non vede la diretta nei primi
  cinque minuti non la chiude; un giro a vuoto a metà serata non la chiude; due giri a vuoto
  dopo cinque minuti la chiudono; l'evento di fine la chiude subito.
- Il recapito: un posto che rifiuta per un errore che passa riceve al tentativo dopo, gli altri
  una volta sola; un errore che non passa non si ritenta; la fine di Kick chiude Kick e non
  Twitch; la fine dell'amico chiude solo i suoi; senza Telegram la chiusura arriva lo stesso.
- L'avviso all'inizio: niente «Spettatori 0», niente immagine prima dei cinque minuti, titolo e
  gioco anche quando `/streams` non sa ancora niente.
- Il post: inglese e spagnolo per un canale inglese e spagnolo, il messaggio dello streamer
  quando c'è.
