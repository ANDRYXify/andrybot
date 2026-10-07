<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Telegram: dove arrivano gli avvisi

I file del sito non hanno commenti: quello che spiegherebbero sta qui.

## Il difetto: una sola destinazione

Il modello vecchio aveva **un solo posto** dove notificare — una colonna `chat_id` nella tabella
`telegram`. Niente topic, niente canali oltre al gruppo, nessun modo di dire «le dirette qui, i post
Instagram là», e nessun modo di annunciare la diretta di un amico.

## Il modello nuovo

**`telegram_dest`** — le destinazioni. Ognuna e una coppia *chat + topic*:

| campo | cosa dice |
| --- | --- |
| `chat_id` | il gruppo o il canale |
| `thread_id` | il topic, se il gruppo e in modalita forum (vuoto = «Generale») |
| `eventi` | quali avvisi accetta, in CSV — **vuoto = tutti** |
| `streamer` | di chi li accetta, in CSV di login — **vuoto = tutti** |
| `pin` | fissa qui l'avviso della diretta? (per destinazione, non piu globale) |
| `msg_id` | l'ultimo avviso mandato **qui**, per chiuderlo qui a diretta finita |

**`telegram_amico`** — gli altri streamer di cui annunciare la diretta, con `ultima_live` per non
ripetersi.

**Chiave unica `(channel, chat_id, thread_id)`**: lo stesso gruppo puo comparire piu volte, una per
topic, e non si duplica mai.

## L'instradamento

`tgDest.perEvento(canale, evento, streamer)` restituisce le destinazioni che accettano
quell'evento **e** quello streamer. Gli eventi sono `live`, `tiktok`, `yt`, `ig`, `tt`.

**Vuoto = tutto.** E la regola che tiene in piedi la retro-compatibilita: il vecchio gruppo unico
diventa una destinazione senza filtri e continua a ricevere esattamente cio che riceveva prima.

Ha pero una conseguenza da guardare in faccia: se aggiungi un topic «instagram» e lasci il gruppo
generale senza filtri, **i post Instagram arrivano in due posti**. Non l'ho nascosto dietro una
regola di precedenza implicita, che sarebbe magia: l'ho reso **visibile**. Nel pannello c'e
«**Dove finisce cosa**», che per ogni evento elenca dove andra a finire davvero. Se un evento
finisce in due posti lo vedi prima che succeda; se non finisce da nessuna parte, pure.

## La migrazione

`tgDest.migra(canale, conf)` gira a ogni lettura ed e **idempotente**: se il canale non ha ancora
destinazioni ma aveva un gruppo collegato, quel gruppo diventa la prima destinazione, con il suo
`pin_live`. Chiamarla mille volte non crea mille righe. Nessun passaggio manuale, nessuno perde
niente.

## I topic

Le Bot API di Telegram **non hanno un modo per elencare i topic** di un gruppo forum. L'unica
strada onesta e guardare cosa e passato: `rilevaDestinazioni` legge `getUpdates` e raccoglie ogni
chat e ogni `message_thread_id` visto, prendendo il nome del topic da
`reply_to_message.forum_topic_created.name`. Percio la procedura e: scrivi un messaggio **dentro il
topic** che vuoi collegare, poi premi «Aggiungi». Un giro di rilevamento trova tutto insieme —
gruppi, canali e topic — invece di una destinazione sola come prima.

L'invio usa `message_thread_id`: senza, il messaggio finisce nel «Generale» anche se hai scelto un
topic.

## Il webhook vieta getUpdates — e va bene cosi

Se il bot e in modalita **interattiva**, Telegram ha un webhook attivo e rifiuta `getUpdates` con
`Conflict: can't use getUpdates method while webhook is active`. Spegnere il webhook per rilevare
sarebbe una toppa: il bot smetterebbe di rispondere proprio mentre lo stai configurando.

La strada giusta e l'opposta: **col webhook acceso ogni messaggio arriva gia a noi**, quindi i posti
li impariamo da li. Il gestore del webhook, come prima cosa e prima di ogni altro controllo, registra
in `telegram_visto` la coppia *chat + topic* di ogni messaggio che passa — anche di quelli senza
testo — insieme al nome del topic quando Telegram lo include. Poi «Aggiungi» unisce due fonti:
quello che il webhook ha visto e, **solo se il webhook e spento**, `getUpdates`.

**Serve un comando, non un messaggio qualsiasi.** Con la privacy del bot accesa (il default di
BotFather) un bot in gruppo riceve solo i comandi e le risposte dirette. Percio l'istruzione e:
scrivi `/collega` **dentro** il topic che vuoi collegare. Un messaggio normale potrebbe non
arrivargli mai, e resteresti a chiederti perche il topic non compare.

## Le dirette degli amici

Un amico non e un canale gestito dal bot, quindi **nessun evento arriva da solo**: c'e un giro ogni
2 minuti (`_giroAmici`) che chiede a Twitch se sono live, con anti-doppioni sull'id della
diretta. Prima di accettare un amico si controlla che il canale **esista davvero** su Twitch: meglio
dirlo subito che restare in silenzio per sempre.

## Le dirette della community

Ogni streamer decide **per il proprio gruppo** se annunciare anche le dirette dei membri della
community. Acceso l'interruttore, la lista si allinea da sola: chi entra compare, chi esce sparisce,
e chi hai aggiunto **a mano** non viene mai toccato (li distingue la colonna `fonte`). Non aggiunge
mai te stesso.

**Chi conta come membro.** Non basta avere un account: chi si iscrive gratis e chi compra un piano
NON entra in questa lista. Il criterio sta in un posto solo, `streamers.membriCommunity(escludi)`,
e chiede tutte queste cose insieme:

| condizione | perche |
| --- | --- |
| `user_id <> ''` | registrato e riconosciuto su Twitch, non un nome scritto a mano |
| `status = 'approved'` | non in attesa, non disabilitato |
| `community = 1` | verificato dal pass di andryxify.it — lo mette solo `markCommunity()`, mai Stripe ne l'iscrizione gratuita |
| `manuale = 1` **oppure** `grazia_fino <= 0` | ancora confermato dal sito adesso; chi e in **periodo di grazia** e sparito dalla lista del sito, quindi non conta piu (gli account gestiti a mano li decide l'admin) |
| `login <> ` il tuo | non annunci te stesso |

Chi perde una di queste condizioni esce dalla lista al giro successivo (due minuti) senza che
nessuno debba fare niente; se rientra, ci ritorna allo stesso modo. Il predicato e **uno solo** ed e
usato da tutti e tre i posti che ne hanno bisogno (l'interruttore, il conteggio mostrato nella
scheda e il giro periodico del bot), cosi la regola non puo divergere.

Dove finiscono lo decide la **matrice**, come tutto il resto: sono streamer come gli altri, quindi
il filtro «di chi» di ogni destinazione vale anche per loro.

**Il punto delicato: fissare e togliere.** Con piu dirette annunciate insieme, un solo `msg_id` per
destinazione non basta — la fine della diretta di uno cancellerebbe l'avviso di un altro. Percio
c'e `telegram_msg`, con chiave `(canale, destinazione, streamer)`: ogni avviso ricorda il proprio
messaggio, e quando quella diretta finisce si toglie **solo il suo**. La fine si rileva nel giro dei
due minuti: se Twitch dice che non e piu live e avevamo annunciato, si chiude.

## La tua diretta in primo piano

Dove arrivano anche le dirette di casa, quelle degli altri arrivano **in sordina**:
senza suono (`disable_notification`), senza locandina, mai fissate, con l'anteprima
del link piccola (`link_preview_options.prefer_small_media`). La diretta di casa
ha la locandina, suona, si fissa dove il posto fissa, e senza locandina chiede
l'anteprima grande. Dove arrivano solo gli altri, i loro avvisi restano pieni.

Il motivo e il fissato: Telegram mostra in cima al gruppo l'**ultimo** messaggio
fissato, quindi l'amico che andava in diretta dopo di te si prendeva la cima
mentre eri in onda, e ogni fissato con notifica faceva suonare il gruppo una
seconda volta.

`_diffondiTelegram` raggruppa i posti per rilievo e manda ogni gruppo con la sua
foto (o senza), il suo testo e il suo suono. L'avviso in sordina si ricorda in
`telegram_msg` come gli altri: non si fissa, ma a diretta finita si toglie dove il
posto fissa. La prova dal pannello è un avviso di casa e parte col suo rilievo,
come quello vero: anche lì, senza locandina, l'anteprima grande. La regola, i tre
rilievi e la levetta (accesa di serie, una per sezione) sono in
docs/DISCORD-AVVISI.md, «La tua diretta in primo piano».

## Collaudo

Verificato su un database isolato, scenario per scenario: migrazione idempotente, gruppo + canale +
due topic insieme, instradamento per evento (`live` a tre posti, `ig` al solo topic dopo aver
ristretto il generale), amici fusi senza badare a maiuscole, filtro per streamer (il canale annuncia
solo l'amico e non me), spegnimento e rimozione, e **nessuna perdita fra canali diversi**.

Per la lista community, undici account costruiti apposta: membro confermato, membro gestito a mano,
iscritto gratis, cliente pagante, membro in grazia, disabilitato, in attesa, senza `user_id`, grazia
gia consumata, se stesso. Passano solo i confermati e quello a mano; togliendo la conferma a uno
esce da solo al giro dopo e rientra quando la riprende, mentre l'amico aggiunto a mano non viene
mai sfiorato.

## «Conflict: can't use getUpdates while webhook is active»

Il difetto e la sua radice, perché è una classe intera e non un caso.

Telegram ha **due modi** di consegnare i messaggi a un bot, e sono esclusivi: o
il bot li chiede lui (`getUpdates`), o Telegram li spinge a un indirizzo
(webhook). Con il webhook acceso, `getUpdates` non risponde: dice `Conflict`.

Il bot interattivo — quello che legge e risponde nel gruppo, e la chat privata —
funziona **a webhook**. Quindi il webhook è acceso ogni volta che le cose vanno
bene. Il pulsante **«Rileva gruppo»**, però, chiamava `getUpdates` senza
guardare: falliva sempre, proprio quando il resto funzionava.

Il gemello «rileva destinazioni» il controllo ce l'aveva. **Lo stesso fatto
scritto in due posti, e uno se n'era dimenticato**: è così che nascono questi
difetti, non per distrazione di un momento.

### Come è stato chiuso

- Una funzione sola risponde a «cosa ha visto il bot» (`chatViste`): legge le
  chat che il **webhook** ha registrato, e interroga `getUpdates` **soltanto**
  se il webhook è spento. Lo stato lo chiede a Telegram, non al nostro flag, che
  può essere disallineato.
- `rilevaGruppo` — la seconda porta su `getUpdates`, quella che si era
  dimenticata — **non esiste più**. Una porta sola non si può dimenticare.
- La regola di *quale* chat collegare è una funzione pura (`scegliGruppo`):
  vince il gruppo più recente, la chat privata è il ripiego, un topic non è un
  gruppo. Si prova senza Telegram, e vale per ogni pulsante che collega qualcosa.
- Il collaudo lo tiene fermo: conta che la porta su `getUpdates` sia **una**, e
  che il controllo del webhook venga **prima** della chiamata. Messo alla prova
  togliendo il controllo: rosso.

### Se lo rivedi

Vuol dire che qualcosa parla con `getUpdates` senza passare da `chatViste`.
Il collaudo dovrebbe averlo già fermato; se è successo lo stesso, il messaggio
in dashboard ti dice cosa fare: scrivere `/collega` **dentro** il gruppo (un
comando arriva sempre al bot, un messaggio normale no se la privacy del bot è
accesa) e riprovare — così il webhook lo registra e il rilevamento lo trova.

## Il cancello: chi entra e' muto finche' non fa vedere che c'e'

Un gruppo aperto si riempie di account che entrano, spammano e spariscono. La
cura e' vecchia e funziona: chi entra non puo' scrivere finche' non preme un
tasto. Un bot il tasto non lo preme, perche' non sa che c'e'.

Il ragionamento sta in `src/features/tg-ingresso.js` e si prova senza rete e
senza gruppo; i gesti (silenziare, scrivere, riaprire, cacciare) stanno in
`src/features/tg-cancello.js`, che prende Telegram e il database **da fuori** —
non per vezzo: e' l'unico modo per mettere alla prova l'ordine dei gesti, che
qui e' la cosa che conta di piu'.

### Quattro difetti che non possono esistere

**Si guarda la TRANSIZIONE, non lo stato.** Passa dal cancello solo chi va da
`left`/`kicked` a `member`. Guardando lo stato, ogni cambio di permessi —
compreso quello che il cancello stesso fa un istante dopo — rimuterebbe chi era
gia' dentro, in un giro che non finisce.

**I permessi da ridare sono QUELLI DEL GRUPPO.** Si leggono con `getChat` e si
rimettono quelli. Una lista scritta nel nostro codice darebbe a chi passa
diritti diversi da quelli di tutti gli altri: piu' o meno, e nessuno dei due e'
giusto. E se i permessi del gruppo non si riescono a leggere, il cancello **non
silenzia nessuno**: non si toglie la parola a qualcuno se non si sa come
ridargliela.

**L'ordine dei gesti, e il passo indietro.**

1. si leggono i permessi del gruppo. Se non si leggono, non si tocca nessuno;
2. si silenzia;
3. si scrive il messaggio col tasto. **Se questo fallisce si ridanno subito i
   permessi**: aver tolto la parola senza aver dato il modo di riprendersela non
   e' uno stato in cui quel codice puo' lasciare qualcuno;
4. solo adesso si segna l'attesa.

**A ogni pressione si risponde.** Telegram tiene la rotellina sul tasto finche'
non arriva `answerCallbackQuery`: non rispondere e' un tasto che sembra rotto
anche quando ha funzionato. `esitoTasto` non ha un ramo che esca senza una
frase, compreso quello di chi preme un tasto che non e' suo.

### Le due cose che potevano rompersi in silenzio

`allowed_updates` **sostituisce** la lista precedente, e Telegram manda solo
cio' che gli si chiede: un tipo di update non elencato non arriva mai, e non
arriva nemmeno un errore. Per questo la lista e' una costante sola
(`UPDATE_VOLUTI`) ed e' fissata da una prova. Il webhook viene ri-registrato a
ogni avvio, quindi la lista nuova arriva da se' a chi il bot ce l'aveva gia'.

Chi e' in attesa sta nel **database** (`tg_attesa`), non in memoria: un riavvio
non deve lasciare della gente muta per sempre. La ronda delle scadenze toglie la
riga **comunque**, anche quando il canale o il bot non ci sono piu': tenerla
vorrebbe dire riprovarci per sempre.

### Cosa serve, e cosa si dice quando manca

Il bot dev'essere amministratore del gruppo con il permesso di limitare i
membri. Accendendo il cancello il pannello lo **chiede a Telegram** e, se manca
qualcosa, non accende niente e dice cosa manca: un interruttore che si accende e
poi non fa nulla e' peggio di un interruttore che rifiuta.

Nel pannello, se il server rifiuta di accendere il cancello l'interruttore torna
com'era: non deve restare acceso a schermo qualcosa che acceso non e'.

Prove: `test/unita/tg-ingresso.test.mjs` (la regola) e
`test/contratto/tg-cancello.test.mjs` (l'ordine dei gesti, con un Telegram
finto: il passo indietro dopo un messaggio che non parte e' una prova che gira,
non una buona intenzione in un commento).

## Lo scudo all'ingresso: una prova prima di entrare

Il cancello qui sopra lavora su chi e' GIA' entrato. Lo scudo lavora un passo
prima, sulla **richiesta di ingresso**: chi chiede di entrare fa una prova su
una pagina, e Telegram lo fa entrare solo se la pagina dice «passato».

### Quattro strade, una porta ciascuna

0. **Dalla porta del gruppo** (la strada di casa, vedi «Una porta sola» qui
   sotto): chi preme «Entra» fa la prova sulla pagina stessa, e chi la supera
   riceve un link personale. Nessuna richiesta, nessuna attesa.
1. **Richiesta con il guardiano.** Se nelle impostazioni del gruppo il nostro
   bot e' il guardiano delle richieste, Telegram ci da' dieci secondi per
   aprire la pagina dentro Telegram (`sendChatJoinRequestWebApp`). E' la prima
   cosa che fa il webhook, prima del database e di ogni altra chiamata.
2. **Richiesta senza guardiano** (gruppo con «Approva nuovi membri», o il link
   fisso del bot): il bot scrive in privato a chi ha chiesto
   (`user_chat_id`, cinque minuti per farlo) un messaggio con un tasto che apre
   la stessa pagina.
3. **Ingresso diretto** (gruppo pubblico senza approvazione): non c'e' una
   richiesta, quindi niente scudo. C'e' il cancello, e il pannello lo dice.

Chi entra da una richiesta (`via_join_request`, o un link con
`creates_join_request`) o e' gia' passato dallo scudo **non** passa dal
cancello: una porta sola per persona (`tg-ingresso.daRichiesta`,
`tg-cancello`).

### Invarianti

- **Nessuno entra senza «passa».** L'unica approvazione sta dopo
  `esitoInvio(...) === 'passa'` (`src/features/tg-scudo.js`). Ogni errore porta
  a un rifiuto o agli amministratori, mai a un'approvazione.
- **Un esito per richiesta.** Il passaggio da `attesa` e' un compare-and-set nel
  database (`tgScudo.chiudi`, `WHERE stato='attesa'`), e la riga si segna PRIMA
  di dirlo a Telegram: due invii, la scadenza e un amministratore non danno due
  esiti. Dopo ogni attesa la riga si rilegge.
- **Nessuna richiesta resta appesa.** Il giro ogni 30 secondi chiude le
  scadute con l'esito scelto nel pannello. A un guardiano con lo scudo spento si
  risponde subito `queue`: decidono gli amministratori, come senza bot.
- **Chi sei lo dice solo la firma.** Persona, gruppo e richiesta vengono
  dall'`initData` di Telegram, validato con l'HMAC del token del bot di quel
  canale e vecchio al massimo un'ora (`tgapp.validaInitDataCon`). Dal corpo
  delle chiamate arrivano ai gesti solo i quattro campi della pagina.
- **Chi non riesce a vedere la prova non viene rifiutato.** «Non riesco a
  vederla» lascia sempre la richiesta a chi gestisce il gruppo («Decidi tu»,
  qui sotto).
- **Chi e' rifiutato aspetta mezz'ora** prima di poter riprovare.
- **Dati minimi.** Id Telegram, nome, esito e ora; la bio non si legge. Le righe
  si potano dopo sette giorni (quelle che aspettano una decisione dopo un
  mese, «Decidi tu»), e lo scarico dei dati non le porta (`esporta.NEGATE`).
  La privacy lo dice, nelle tre lingue.

### Decidi tu: il si' e il no dal pannello

Ogni strada che finisce «agli amministratori» (la scelta «Decido io», «Non
riesco a vederla», la pagina che non si apre, il privato che non parte, il
link «decidi tu» della porta) lascia in Telegram una **richiesta di ingresso
in coda**: chi l'ha fatta ha premuto il tasto di Telegram per chiedere di
entrare, non e' nel gruppo, non legge niente e non puo' fare niente se non
aspettare. Prima la vedeva solo chi apriva la lista delle richieste dentro
Telegram, e lo streamer non sapeva che c'era (`src/features/tg-decidi.js`).

Scartato: farla entrare muta, col cancello. Un membro muto **legge** il
gruppo, quindi «aspetta senza poter fare niente» non sarebbe vero, e cadrebbe
«nessuno entra senza passa».

- **Cos'e' una richiesta da decidere.** Una riga dello scudo con
  `stato='admin'` e `via=''`: una persona vera con la sua richiesta in coda.
  Le prove della porta (`via='web'`) non lo sono mai.
- **Una decisione sola.** `tgScudo.decidi` passa da `admin` a un esito nella
  stessa istruzione: pannello, messaggio in privato e un amministratore in
  Telegram che arrivano insieme non danno due esiti. La riga si segna PRIMA
  di dirlo a Telegram, come ogni esito dello scudo.
- **Telegram che non risponde non perde niente.** La riga torna `admin` com'era
  (`riapri`): la decisione non c'e' stata, si puo' rifare.
- **Telegram che non ha piu' la richiesta lo dice.** `HIDE_REQUESTER_MISSING`
  (ritirata, o rifiutata da un amministratore dentro Telegram, che a noi non
  arriva) diventa `sparita`; `USER_ALREADY_PARTICIPANT` diventa `dentro`.
  Un amministratore che la fa entrare in Telegram chiude la riga col
  `chat_member` (`entrataDaTelegram`), subito.
- **Chi e' rifiutato aspetta mezz'ora**, contata dalla decisione (`fine`), come
  dopo una prova non superata.
- **Dove lo si sa.** Nel pannello: `tgDaDecidere` nello stato (il puntino sulla
  voce «Telegram» e un avviso all'apertura), la carta in cima alla scheda,
  l'elenco nella carta dello scudo con «Fai entrare», «Rifiuta» e «Rifiuta
  tutte», e un giro ogni minuto (`/api/streamer/telegram/da-decidere`) che
  legge solo il database. In privato su Telegram, se il proprietario ha
  collegato la chat e non l'ha spenta: un messaggio coi due tasti, il nome che
  apre il profilo, riscritto con l'esito da qualunque parte arrivi la
  decisione.
- **I tasti in privato valgono solo per il proprietario**, nella sua chat col
  bot (`owner_tg_id`, sia chi preme sia la chat). A ogni pressione si risponde.
- **Un tetto ai messaggi.** Al massimo cinque in dieci minuti per canale, poi
  uno solo che dice dove sono le altre. Si tiene in memoria: dopo un riavvio si
  riparte da zero, e il peggio e' qualche messaggio in piu'.
- **Chi decide nel pannello** e' chi gestisce lo scudo (`requireLogin`, come le
  sue rotte): il proprietario e i moderatori del pannello.
- **Dati.** Niente di nuovo da chi chiede. Le righe che aspettano non si
  potano dopo una settimana come le altre: restano finche' qualcuno decide, al
  massimo un mese.

Prove: `test/unita/tg-decidi.test.mjs` (le decisioni, le gare, Telegram che
non risponde o non ha piu' la richiesta, i tasti in privato, il tetto, dove
nascono le richieste, la potatura) e `test/contratto/tg-scudo-cablaggio.test.mjs`
(il tasto in privato prima del cancello, le rotte, il numero nello stato).

### La prova: il codice sta solo nel movimento

Un'immagine con delle lettere storte la legge qualunque programma che legge
le immagini. Qui non c'e' un'immagine con le lettere: c'e' un campo di
puntini (160 × 56) che cambia trenta volte al secondo per tre secondi. In
ogni fotogramma i puntini dentro e fuori dalle lettere sono accesi a caso,
con la stessa densita': un fotogramma solo, uno screenshot o una foto non
mostrano niente. Le lettere esistono solo nel **moto**: i puntini delle
lettere scorrono tutti insieme in una direzione, quelli del fondo in quella
opposta, e la direzione cambia ogni dieci fotogrammi. L'occhio lo vede subito;
la media dei fotogrammi (una posa lunga, una foto mossa) no, e le prove lo
misurano (`test/unita/tg-scudo-prova.test.mjs`).

- Alla pagina arriva un pacchetto di bit (`SBM1`: larghezza, altezza,
  fotogrammi, fotogrammi al secondo, poi un bit per puntino), mai il codice. I
  colori li mette la pagina (quelli della porta, o quelli scelti, con un
  contrasto di almeno 3:1).
- Tre tentativi per prova, tre prove: poi «non passa».
- Il confronto e' a tempo costante; maiuscole e spazi non contano.

Onestamente: impossibile in assoluto no. Chi scrive un programma apposta per
questa prova, confrontando i fotogrammi fra loro, la puo' leggere. Nessuno
strumento comune lo fa, e ogni tentativo costa: un account Telegram, tre
prove da tre tentativi, mezz'ora di attesa dopo un no.

### Una porta sola

`telegram.<dominio>/<canale>` (sempre anche `/telegram/<canale>`) e' la porta
pubblica del gruppo, ed e' **l'unica pagina** del gruppo: una pagina come la
pagina link, con lo stesso editor e la stessa veste
(`src/features/tg-porta.js`, store `pagina_telegram`). Prima c'erano due
pagine, la porta e quella della prova, con due vesti e due posti dove
cambiarle; chi premeva «Entra» finiva in Telegram e la prova arrivava dopo,
altrove. Adesso dove porta «Entra» **lo decide lo scudo**, non
un'impostazione:

- **scudo spento** (niente, o solo il cancello): il tasto e' il link fisso del
  bot (`scudoTg.invito`), e si entra subito. Il cancello lavora dopo, se
  acceso;
- **scudo acceso**: il tasto apre la prova **li'**, nella carta del gruppo
  (`/telegram-porta.js`). La prova e' un pezzo della porta: prende i suoi
  caratteri, i colori dei tasti, lo sfondo; le sue parole (titolo,
  spiegazione, tasto, gli esiti), i colori dei puntini e la grandezza si
  scelgono nel pezzo «Il gruppo e il tasto per entrare» (`prova`, pulito da
  `paginaTelegram`). Le regole e le domande restano nello scudo. Senza
  JavaScript il tasto resta il link fisso, che con lo scudo acceso chiede
  l'approvazione: si passa dalla prova dentro Telegram.

Chi chiede di entrare da un altro link vede, dentro Telegram
(`/<canale>/verifica`), **la stessa porta** con la prova gia' aperta: una
pagina, due strade. Parla la lingua del canale, come la porta. Non resta in
cache, non si indicizza, non manda referrer.

#### La prova sulla porta, per costruzione

- **Chi sei e' il codice della pagina.** «Entra» chiede una prova nuova
  (`POST /api/tg-porta/<canale>/nuova`); il server da' alla pagina un codice a
  caso e tiene solo la sua **impronta** (`w:` + sha256, riga dello scudo con
  `via='web'`). La pagina lo tiene in memoria (niente cookie, niente
  indirizzo) e lo rimanda a ogni passo. Le due strade non si scambiano le
  righe: una prova della porta si apre solo col codice della porta, una
  richiesta di Telegram solo con la firma di Telegram.
- **Gli stessi gesti.** La prova si giudica con `apri`, `immagine`, `invia`,
  `aiuto` di sempre (tre tentativi, tre prove, il codice che non esce, le
  domande con la loro impronta). Cambia solo come si dice l'esito:
  - **superata**: un link personale (`creaInvito`, `member_limit` 1,
    mezz'ora). Si entra senza chiedere. Il link si fa **una volta sola** per
    prova, anche se la pagina lo chiede dieci volte insieme (`linkPorta`, una
    fila per prova): una prova superata fa entrare al massimo una persona. Se
    Telegram non lo da', la prova resta superata e la pagina lo richiede
    («link»); un link scaduto non si rifa', si rifa' la prova;
  - **decidi tu** (la scelta «Decido io», o «Non riesco a vederla»): un link
    che chiede l'approvazione. La richiesta che ne arriva va in coda, senza
    pagina, e aspetta il si' o il no («Decidi tu», qui sopra);
  - **no**, o **pagina lasciata scadere**: nessuna chiamata a Telegram. Una
    pagina dimenticata aperta non manda nessuno dagli amministratori.
- **Il bot riconosce i suoi link.** Chi entra dal link personale lo consuma
  (`entrato`): la prova diventa «usata», la persona e' segnata come passata
  da una porta e il cancello non la ferma una seconda volta. Se il gruppo
  chiede l'approvazione a tutti, la richiesta da quel link si approva una
  volta sola; una seconda dallo stesso link fa la strada di tutte.
- **Tetti.** Lo stesso tetto al minuto per indirizzo delle chiamate dentro
  Telegram, prima di tutto; con lo scudo spento non si apre niente (e non
  conta); poi al massimo dodici prove nuove l'ora da uno stesso indirizzo. La
  porta dev'essere pubblicata.
- **Nel pannello** si vedono le prove che hanno detto qualcosa (superate, no,
  agli amministratori), con «Dalla porta» al posto del nome; quelle lasciate a
  meta' non sono richieste e non si contano.
- **L'anteprima** dell'editor della porta fa la prova vera, con una prova in
  memoria e un Telegram che non chiama nessuno: gli stessi gesti, quindi lo
  stesso comportamento. I tasti del pezzo mostrano anche ogni esito. Nella
  demo la prova non si apre (non c'e' un bot): lo dice, e gli esiti si
  guardano lo stesso.

- **L'anteprima del link** della porta e' una carta come quella della pagina
  link (docs/CARTA-LIVE.md, «La carta dell'anteprima del link»): la sua
  (`TEMI_PAGINA.telegram`), rifatta nell'editor della porta in «Quando
  condividi il link», servita a `/u/<canale>/anteprima-telegram.png` solo
  finche' la porta e' aperta, e scritta nella pagina come `og:image`. Chi
  incolla `telegram.<dominio>` senza canale finisce sul sito, e vede la sua.

### Cosa serve

HTTPS, il bot interattivo acceso, il gruppo collegato, il bot amministratore
con «Invita utenti tramite link», i caratteri della prova sul server. Il
guardiano e' facoltativo: senza, la prova arriva in privato. Il pannello legge
tutto dal vivo da Telegram e non accende lo scudo finche' manca una cosa
grave.

Prove: `test/unita/tg-scudo.test.mjs` (la regola),
`test/unita/tg-scudo-prova.test.mjs` (la prova in movimento),
`test/unita/tg-scudo-gesti.test.mjs` (i gesti, con un Telegram finto, gare
comprese), `test/unita/tg-porta-prova.test.mjs` (la prova sulla porta: un link
per prova anche chiesto dieci volte insieme, le due strade separate, gli
amministratori, la scadenza, il link consumato e il cancello),
`test/contratto/tg-scudo-cablaggio.test.mjs` (i fili col server) e
`scripts/verifica-scudo-tg.mjs` (la porta vera in un browser, al computer e
al telefono: «Entra» che apre la prova li', i colori e le parole scelte, il
link personale, il no, gli amministratori, la stessa pagina dentro Telegram;
con `--selftest`, un difetto alla volta).
