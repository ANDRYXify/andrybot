<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Più di una piattaforma

> © 2024–2026 Andrea Taliento (ANDRYXify)

## L'idea che tiene in piedi tutto

Il bot **non deve sapere da dove arriva un messaggio**. Comandi, moduli,
antispam, punti, ore guardate, memoria, minigiochi: tutto legge la stessa forma
e risponde attraverso la stessa interfaccia.

Due sole cose devono essere vere perché una piattaforma nuova funzioni il primo
giorno, senza toccare niente di quello che c'è:

1. un messaggio entra con la **forma di casa** — `channel, user, display, text,
   id, userId, isMod, isBroadcaster, isSub, isVip, isSelf, tags`;
2. la piattaforma espone **`say(canale, testo)`**, come fa la chat di Twitch.

Da lì in poi il gestore dei messaggi non cambia di una riga. E la risposta torna
**da dove è arrivata la domanda**: un `!comando` scritto su Kick si risponde su
Kick, non su Twitch — che è l'unica cosa che conta per chi ha scritto.

## Kick

OAuth 2.1 con **PKCE**: quando lo streamer preme «collega», nasce un segreto
usa-e-getta che resta nella *sua* sessione; a Kick va solo la sua impronta, e al
ritorno si mostra il segreto per intero. Un codice intercettato non serve a
nulla senza il verifier, che non è mai passato dalla rete.

I token finiscono nella **stessa tabella** di quelli Twitch (`kind='kick'`):
cifrati a riposo dalla strada già provata, ed esclusi dall'esportazione dei dati
senza doversene ricordare. Si rinnovano **prima** della scadenza, e una volta
sola anche se dieci messaggi partono insieme.

I messaggi non li chiediamo: Kick li **spinge** al nostro webhook. Che è
pubblico per forza — Kick deve raggiungerlo — quindi chiunque lo trovi potrebbe
mandarci finti eventi. L'unica cosa che distingue Kick da un impostore è la
firma RSA, e si verifica **prima di guardare qualunque altra cosa**.

Quello che si firma non è solo il corpo: è `id.timestamp.corpo`. Se si firmasse
solo il corpo passerebbe il **replay** — un evento vero, catturato e rispedito
mille volte. Il collaudo lo prova: stesso corpo e stessa firma con un altro id
non passa.

### Perché non funzionava: il webhook rispondeva 404

Il collegamento riusciva, l'iscrizione agli eventi pure, e poi non arrivava
niente. Nessun messaggio, nessun follow, nessun evento — e nessun errore da
nessuna parte, perché dal nostro lato non arrivava proprio una richiesta.

Il sito è un labirinto: senza sessione tutto risponde 404, e le eccezioni erano
un elenco scritto a mano. `/kick/webhook` non c'era. Kick bussava e trovava un
404 — che è esattamente la risposta che il cancello deve dare a uno sconosciuto,
e infatti la dava anche a Kick.

La cosa che rende il difetto istruttivo: **l'argine lo sapeva già**. Nel
limitatore di frequenza c'era scritto, nero su bianco, «i webhook delle
piattaforme non si limitano: scartarne uno significa perdere un messaggio in
chat o un evento» — e `/kick/webhook` era nella sua lista. Due elenchi per lo
stesso fatto, e non erano d'accordo.

Adesso il fatto sta in un posto solo (`INGRESSI_ESTERNI` in `web/vetrina.js`) e
lo leggono tutti e due: il cancello per lasciarli passare senza sessione, e
l'argine per non limitarli. `test/unita/kick-ingressi.test.mjs` tiene insieme le
due letture — provato rosso togliendo `/kick/webhook` dall'elenco.

### L'eco del bot

Su Twitch la chat dice chi ha scritto e un messaggio del bot arriva con
`isSelf`. Su Kick no: il bot scrive con l'account dell'app e l'evento torna
indietro come qualunque altro messaggio. Senza riconoscerlo il bot **si
ascolta**: impara le proprie frasi, si accredita monete, fa scattare i contatori
per parola, e una risposta che contenesse un comando riaccenderebbe il giro.

Non serve sapere *chi* è il bot su Kick (nessuna chiamata lo dice): basta sapere
*cosa* abbiamo appena detto. `kick/eco.js` segna ogni frase mandata — prima di
mandarla, perché l'evento può tornare prima della risposta — e la consuma quando
torna. Consumarla, e non tenerla, fa sì che uno spettatore che ripete la stessa
frase più tardi venga trattato come chiunque altro.

### Quando non arriva niente: il diario

Un webhook che non funziona non ha niente da guardare. Il collegamento dice
«collegato», la chat va avanti, il bot tace — e da fuori quattro cause diverse
hanno la stessa faccia:

1. non c'è nessuna **iscrizione** agli eventi;
2. l'iscrizione c'è ma **Kick non bussa** (webhook spento nell'app, o punta altrove);
3. Kick bussa ma l'evento viene **rifiutato** (firma, orologio, corpo);
4. l'evento arriva ma **non si attribuisce** a un canale nostro;
5. arriva tutto, ma la **risposta non parte** (permesso mancante, token da rifare,
   Kick che rifiuta la scrittura).

`kick/diario.js` tiene il minimo che le distingue: quando è arrivato l'ultimo
evento buono e di che tipo, quando è stato rifiutato l'ultimo e perché, e a quale
canale, e com'è andato l'ultimo tentativo di **scrivere**. Niente contenuti dei
messaggi: tipo, canale e motivo. La riga di Kick nel pannello dice **quale delle
cinque**, e quando serve mostra «Riprova gli
eventi» — che rifà l'iscrizione senza dover scollegare e rifare tutto il giro
OAuth (dopo un periodo in cui il webhook rispondeva 404, Kick smette di provarci).

### La firma si verifica sui byte, comunque siano etichettati

Il lettore JSON del server prende una sola etichetta (`application/json`). Se il
corpo arrivasse con un'altra, `req.rawBody` resterebbe vuoto e la firma — che si
calcola **sui byte** — non tornerebbe mai più: un difetto muto per una virgola in
un'intestazione. Ora la rotta prende i byte da sé con `express.raw({ type: () =>
true })`, e il collaudo firma davvero e bussa con tre etichette diverse (provato
rosso togliendo la lettura grezza).

### Lo stesso evento due volte

Kick dice che `Kick-Event-Message-Id` è la chiave di idempotenza: lo stesso
evento può arrivare di nuovo. Senza ricordarlo, un abbonamento o dei Kicks
contavano due volte e il bot rispondeva due volte. Il webhook ricorda gli id per
due finestre della firma (`FINESTRA_MS`, prima e dopo l'ora dell'evento): oltre,
la firma rifiuta l'evento come vecchio, quindi un doppio non passa mai. Il
diario segna lo stesso ogni arrivo, perché dice se Kick bussa. La memoria è
quella del processo: un riavvio proprio fra i due arrivi è l'unico buco, e il
bot risponde a Kick prima di lavorare, quindi Kick non ha motivo di riprovare.
Collaudo: `test/contratto/kick-webhook.test.mjs`.

### Con quale voce scrive il bot

Kick offre due modi per mandare un messaggio: `user` scrive con l'account di chi
ha autorizzato (e vuole l'id del canale), `bot` scrive con l'identità dell'app.

Partivamo da `bot`, e Kick rispondeva **«Internal server error»**: silenzio
totale — e per giunta con la voce sbagliata. La promessa del prodotto è che il
bot scriva **con il tuo account**, niente account anonimi: su Twitch è così da
sempre, e non c'è ragione perché su Kick sia diverso. Ora si parte da `user`, e
non è un ripiego: è la stessa cosa che il sito promette in prima pagina.

Se una porta non si apre si passa all'altra **dal messaggio dopo**, non
riprovando subito lo stesso: una risposta d'errore non vuol dire che il messaggio
non sia partito, e riprovarlo lo farebbe uscire **due volte** in chat. Si perde
una risposta, una volta, e da lì in poi si parla dalla porta buona — che resta
scelta finché funziona. Il pannello dice con quale voce sta scrivendo.

### Cosa deve fare l'operatore, una volta sola

Le credenziali Kick sono dell'app, non dello streamer. Su
[kick.com/settings/developer](https://kick.com/settings/developer), nell'app:

| Campo | Valore |
|---|---|
| Redirect URL | `https://socialbot.live/auth/kick/callback` |
| Enable Webhooks | acceso |
| Webhook URL | `https://socialbot.live/kick/webhook` |

e nell'ambiente `KICK_CLIENT_ID` e `KICK_CLIENT_SECRET`. Se gli eventi non
arrivano, il pannello lo dice con l'indirizzo giusto sotto la riga di Kick,
invece di un generico «da sistemare».

### Entrare con Kick

Chi trasmette **solo** su Kick non ha un account Twitch da usare, e chiedergliene
uno per usare il bot sarebbe chiedergli di iscriversi a un servizio che non gli
serve. Dalla vetrina c'è una seconda porta, `/accedi/kick`: la stessa
autorizzazione dice **chi è** e dà al bot il permesso di **parlare** — un giro
solo invece di due.

**Il nome del canale è la cosa che regge tutto.** Su Twitch e su Kick esiste lo
stesso nome, spessissimo di persone diverse: se il canale Kick «pippo» prendesse
la riga `pippo`, il giorno che il `pippo` di Twitch entra si ritroverebbe il
canale di un altro — comandi, monete, memoria, tutto. La soluzione non è un
controllo: è una **forma**. Un login Twitch è fatto solo di lettere, cifre e
trattini bassi, quindi un canale Kick si chiama **`kick.<nome>`** e non può
collidere. Non per fortuna: per costruzione (`src/identita.js`).

La stessa forma difende i percorsi su disco (`/u/<login>/img/...`): `..` non è un
canale, e non lo diventa.

Chi torna si riconosce dall'**id di Kick**, non dal nome: chi cambia nome su Kick
ritrova il suo canale.

### Il carrello non è di Twitch

Chi preme «Attiva» sulla vetrina sceglie i pacchetti **prima** di dire chi è: in
mezzo c'è un giro dal fornitore, e quello che aveva scelto deve ritrovarselo
dall'altra parte. Finché quel ricordo viveva dentro il flusso di Twitch, la
scelta era di Twitch: chi trasmette solo su Kick veniva spedito a un login che
non ha.

Ora i gesti sono due e stanno fuori da ogni porta. `ricordaAcquisto()` scrive la
scelta in un posto solo (`req.session.compra`); `doveDopoAcquisto()` la riscuote
dove la persona ha finalmente un nome — il ritorno di Twitch e le registrazioni
di Kick e YouTube chiamano tutte quella. È usa-e-getta come il giro OAuth: si
spende una volta, così un checkout abbandonato non riparte da solo al prossimo
accesso.

`/accedi?come=kick|youtube` dice da quale porta si entra. Sulla vetrina la scelta
sta **accanto al tasto**, non in un pannello che si apre dopo il clic: chi arriva
da Twitch — quasi tutti — non paga un passo in più per dire una cosa sola. Dove
la porta è una sola il selettore non si disegna. I nomi sono gli
stessi da una parte e dall'altra (`twitch`, `kick`, `youtube`, quelli di
`PIATTAFORME`): un tasto che la vetrina offre e il server non riconosce
porterebbe a Twitch in silenzio, e il collaudo `test/contratto/carrello-porte`
confronta le due liste apposta.

Cosa cambia nel prodotto: niente, tranne le cose che parlano davvero con Twitch.
Il bot non entra in una chat Twitch senza un token Twitch, quindi il giro delle
connessioni si esclude da sé; e il pannello **spegne** le schede che su Kick non
avrebbero con cosa lavorare (scudo anti-bot, registro, regia, emote 7TV)
dicendo perché, invece di mostrare pulsanti che non fanno niente. La scheda
*Chat* della moderazione resta: su Kick ha con cosa lavorare (sotto, «La
moderazione su Kick»). Le monete su Kick arrivano dai
messaggi: l'elenco di chi guarda in silenzio Kick non lo dà.

Il collaudo (`test/contratto/kick-accesso.test.mjs`) monta le rotte vere su
un'app Express e segue il giro con i cookie come farebbe un browser: PKCE con il
verifier che non passa mai dalla rete, uno `state` estraneo che non entra, un
ritorno senza giro in corso che non entra, lo stesso codice che non entra due
volte, e chi è già dentro che non passa dalla porta della registrazione.

### La diretta su Kick

Una diretta su Kick e' una diretta come quella di Twitch, con le stesse due
fonti e la stessa regola (`stream/stato-diretta.js`):

- **l'evento** `livestream.status.updated` conta subito, in tutti e due i
  sensi, e porta l'inizio vero (`started_at`);
- **il giro**, ogni due minuti (`bot.js`, `_giroKick`), legge il canale
  (`GET /channels`, `kick/api.js`, `statoCanale`): in onda o no, quanti
  guardano, da quando, il titolo, la categoria. Copre gli eventi che si
  perdono, e da' gli spettatori, che negli eventi non ci sono. Un suo «non
  c'e'» chiude solo se ripetuto e lontano dall'ultimo «c'e'».

Tutte e due passano da `_setLiveAltrove`. Lo stato si tiene fra gli stati vivi
del canale (`diretta:kick`, con l'inizio): un riavvio a diretta in corso non la
ricomincia e non la riannuncia, perche' il «prima» e' quello sul disco. L'id
della diretta per gli avvisi e' il suo inizio: evento e giro dicono lo stesso,
e l'avviso parte una volta.

Il canale e' **in onda** se lo e' su una piattaforma qualunque (`inOnda`): lo
leggono la vetrina, il negozio, le presenze. Prima un messaggio da Kick contava
«in diretta» sempre, anche a canale spento; ora conta lo stato vero. La chat di
YouTube invece esiste solo durante una diretta, quindi da li' e' in diretta per
costruzione. La serata, il rapporto e le statistiche sono di tutte le
piattaforme insieme (docs/STATISTICHE.md, «Una serata, piu' piattaforme»).

Il giro da' anche al cervello la vista della diretta (titolo, categoria,
spettatori) quando Twitch non gliela da' gia', e alla vetrina della home il
contorno di chi e' in onda solo su Kick, con l'indirizzo di Kick.

Collaudi: `test/unita/diretta-kick.test.mjs` (un avviso solo fra evento e
giro, nessun avviso dopo un riavvio, la serata che si chiude con l'ultima
piattaforma, un giro a vuoto che non chiude), `test/unita/vetrina-live.test.mjs`
(Kick nella vetrina), `test/unita/kick-canale.test.mjs` (la lettura del
canale).

### Gli eventi di Kick

Follow, abbonamenti e regali di Kick (`kick/messaggio.js`, `daEvento`) si
traducono nel vocabolario di Twitch (`channel.follow`, `channel.subscribe`,
`channel.subscription.gift`) ed entrano dalla **stessa porta** degli eventi di
Twitch: `bot.js`, `eventoEsterno` → `_dispatchEvent`, con `ev.piattaforma`.
Prima andavano solo agli alert: il rapporto della serata e le statistiche
(che contano le righe `[evento]` scritte da `_dispatchEvent`) non li vedevano, e
i moduli «su evento», il cervello e il muro delle emote nemmeno.

Dalla stessa porta valgono le stesse regole, con la piattaforma dell'evento:

- **si risponde dove e' successo**: cervello e moduli parlano con
  `vocePer({ channel, piattaforma })`, la stessa voce dei messaggi;
- **quello che parla solo con Twitch ascolta solo Twitch**: le clip (tagliano
  la diretta di Twitch) e l'anti-bot dei follow;
- **i moduli sanno la piattaforma** (`_ctxDaEvento`: `piattaforma`, `userId`):
  un timeout da un modulo su un follow di Kick va a chi modera su Kick, con
  l'id di Kick che arriva nell'evento; senza id (un regalo anonimo) non si
  ferma nessuno, e su Twitch non si cerca per nome, perche' li' sarebbe
  un'altra persona;
- **un follow ripetuto si ferma, chi torna dopo mesi e' un ritorno**
  (`channel.follow.ritorno`), con `features/seguiti.js` come su Twitch; su Kick
  la persona si riconosce dal nome, come da sempre.

**I regali si contano una volta** (`features/regali.js`, usato da rapporto e
statistiche). Twitch manda un `channel.subscribe` per ogni abbonamento regalato
(`is_gift`) e in piu' la raffica (`channel.subscription.gift`), che li annuncia:
si contano i singoli, e la raffica no. Prima si sommavano tutti e due, e un
regalo da tre diceva sei. Kick manda solo la raffica (`giftees`), e li' e'
l'unico conto che c'e': la riga `[evento]` porta `piattaforma`, ed e' quella a
decidere.

`livestream.metadata.updated` porta titolo e categoria appena lo streamer li
cambia. Va nella stessa vista del giro (`_vistaKick`, una sola: la aggiornano
il giro e l'evento), che si fonde con quello che si sapeva. Al rapporto va un
giro solo quando c'e' il numero degli spettatori, che l'evento non porta: un
giro in piu' peserebbe due volte la categoria, e uno a zero abbasserebbe la
media. Per lo stesso motivo `rapporto.osservaGiro` legge `null` come «non lo
so», non come zero.

Un canale collegato prima che l'elenco degli eventi crescesse e' iscritto
all'elenco di allora. Il giro di Kick, una volta per canale da quando il bot e'
partito, chiede a Kick a cosa e' iscritto e aggiunge **solo quello che manca**
(`allineaIscrizioni`): rifare tutto vorrebbe dire iscrizioni doppie. Se non
riesce si riprova fra un'ora, e un evento rifiutato da Kick si dice per nome.

Non agganciati, e perche': `moderation.banned` (su Twitch nessuno usa il bando
come evento, e un consumatore solo per Kick sarebbe una cosa diversa);
`channel.reward.redemption.updated` ha un passo suo, perche' i premi di Kick non
sono i punti canale.

Collaudi: `test/unita/kick-eventi.test.mjs`.

### I Kicks

I Kicks sono il sostegno di Kick: gli spettatori li regalano al canale, e con
quelli possono anche fissare un messaggio in chat. Somigliano ai Bit, ma **non
sono Bit**: valgono un'altra cifra e si chiamano in un altro modo. Sommarli ai
Bit vorrebbe dire scrivere nel rapporto un numero che non e' ne' l'uno ne'
l'altro. Percio' hanno un tipo loro dappertutto, col nome di Kick:

- l'evento `kicks.gifted` v1 (`sender`, `gift.amount`, `gift.message`) diventa
  `{ tipo: 'kicks', quanti, messaggio }` (`kick/messaggio.js`) ed entra dalla
  porta di tutti come `kicks.gifted`, con `data.kicks`; chi li manda senza nome
  e' anonimo (`is_anonymous`), come un cheer anonimo;
- il **rapporto** li conta a parte (`kicks`, e chi ne ha regalati di piu',
  `kicksChi`, con la regola dei Bit: l'anonimo conta nel totale e non nel
  nome), con la sua riga nella mail, su Telegram e nella carta del pannello;
- i **moduli** hanno l'evento «Kicks (Kick)», la variabile `$kicks` e la soglia
  «Da quanti Kicks in su» (`QUANTITA_EVENTO`, tenuta uguale alla scala del
  pannello da `test/contratto/moduli-scala.test.mjs`);
- il **cervello** ringrazia coi momenti `kicks` e `kicks-anonimo` del frasario,
  nelle tre lingue e nei tre toni;
- l'**avviso** ha il suo tipo, «Kicks (Kick)» (`alerts.js`, `MAPPA`;
  `ALERT_TIPI` nel pannello; `ALERT_KINDS` nel server), con «Kicks minimi»
  (`minKicks`), suono Moneta e il verde di Kick. Non ha «Chi lo mostra»: Twitch
  non mostra i Kicks, e `chiAlertOk` lo riporta sempre a SocialBot;
- gli **effetti degli eventi** hanno «Kicks (Kick)» con i suoi livelli
  (`effetti-eventi.js`, `EVENTI`), il **muro delle emote** la sua esplosione
  (`EVENTI_MURO.kicks`, di serie una fontana da 100), e la carta «Adesso» del
  pannello i Kicks della serata.

Non fanno crescere gli obiettivi dello Studio e non allungano il subathon:
quelli contano follower, abbonamenti, Bit ed euro, e un obiettivo «Bit» che
salisse coi Kicks direbbe un numero falso. Se servira', sara' un obiettivo suo.

Le statistiche non contano i Kicks, come non contano i Bit: contano follow, sub
e raid.

Chi era gia' collegato riceve `kicks.gifted` senza fare niente: il giro di Kick
aggiunge le iscrizioni che mancano.

### La moderazione su Kick

Kick ha le sue rotte di moderazione, documentate: `DELETE /chat/{id}` toglie un
messaggio (permesso `moderation:chat_message:manage`), `POST /moderation/bans`
mette in pausa o bandisce e `DELETE /moderation/bans` toglie il bando
(permesso `moderation:ban`). I due permessi non sono nel collegamento normale:
lo streamer li concede con «Concedi la moderazione», che ricollega Kick con
`?mod=1` (`kick/auth.js`, `SCOPE_MOD`). Chi li ha dati li tiene anche quando
ricollega: «Sistema» porta a `?mod=1` se i permessi ci sono già.

`kick/api.js` espone `moderatoreKick`, con la **stessa forma di helix**
(`deleteMessage`, `timeoutUser`, `unbanUser`, risposta `{ ok }` o
`{ ok: false, motivo }` con le stesse parole). L'antispam e il timeout dei
moduli non sanno con chi parlano: il bot sceglie chi modera dalla piattaforma
del messaggio (`bot.js`, `moderatoreDi`; `modules.js`, `_timeout`):

- **Twitch**: helix;
- **Kick**: `moderatoreKick`, ma solo se i permessi ci sono (`puoModerare`).
  Senza, nessuno: non si fa una chiamata che sappiamo già rifiutata;
- **YouTube**: nessuno, per ora.

Le regole che non si nascondono:

- **l'id è della piattaforma del messaggio**. L'id di chi scrive su Kick, su
  Twitch è un'altra persona o nessuno: mandarlo all'altra piattaforma vorrebbe
  dire fermare uno sconosciuto. Cercare per nome si fa solo su Twitch, perché
  su Kick l'id arriva col messaggio;
- **la pausa su Kick è in minuti** (da 1 a 10080), su Twitch in secondi. Si
  arrotonda in su, così una pausa chiesta non diventa mai più corta, e in chat
  si dice quella data davvero (`minuti` nella risposta). Zero vuol dire bando
  in tutte e due: per questo antispam e moduli non chiedono mai zero;
- **si dice solo quello che è successo**. Un messaggio che non si è potuto
  togliere non si annuncia «rimosso» e il bot non ci risponde; una pausa
  rifiutata non si annuncia. Un permesso mancante sul timeout di un modulo si
  dice allo staff con il rimedio di Kick, al pubblico senza dashboard;
- **un messaggio già sparito** (404) è fatto, come su Twitch;
- **la casa del canale non è spam**: nella chat di Kick passa il link al
  proprio canale su Kick (lo slug visto dal giro, o il nome per un canale nato
  su Kick), e il link al canale Twitch passa solo per un canale di Twitch.

Nel pannello: la riga di Kick in «Le tue piattaforme» dice se la moderazione è
attiva e ha il tasto per concederla; la scheda *Chat* della moderazione su un
canale di Kick legge i permessi di Kick (`/api/me`, `kick.moderazione`), e su
un canale di Twitch con Kick collegato dice se l'antispam vale anche lì.

Collaudi: `test/unita/kick-moderazione.test.mjs` (le rotte vere di Kick, i
minuti, il permesso, il 404), `test/unita/kick-antispam.test.mjs` (chi modera
per piattaforma, la casa, quello che si dice in chat),
`test/unita/moduli-timeout.test.mjs` (il timeout di un modulo va alla
piattaforma del messaggio).

### Il bot parla anche da solo, su Kick

Fuori da Twitch non c'è un'unità di chat: le unità sono le connessioni alla chat
di Twitch, e un canale nato su Kick non ne ha una. `manager.say` le usava sole,
quindi su Kick restava muto tutto quello che il bot dice di sua iniziativa: i
timer dei moduli, le penitenze, i contatori, i rimborsi di blackjack e arena,
i moduli partiti da voce, API o Telegram. Le risposte funzionavano perché
passano da `vocePer`.

La regola adesso è una (`bot.js`, `say` e `puoParlare`): il bot parla di sua
iniziativa **nella chat della piattaforma del canale, se lì è al lavoro**. Su
Twitch è la sua unità, come prima; su Kick il collegamento e l'orario di lavoro
del bot (`inChat`). YouTube no, per scelta (`PARLA_DA_SOLO`): la quota per
scrivere nella chat delle dirette è una sola per tutto il servizio, e i messaggi
detti da solo la finirebbero per tutti. Lì il bot risponde a chi scrive, e basta.

Lo stesso per la diretta: il motore dei moduli la chiedeva solo a Twitch, e per
un canale nato su Kick era «mai in diretta». I timer «solo in diretta» non
partivano, e `$titolo`, `$gioco`, `$uptime` e `$spettatori` restavano vuoti.
Adesso la legge dalla vista che il bot tiene della diretta su Kick (il giro e gli
eventi di Kick: `kickVisto`, `inDirettaSu`), con la forma di quella di Twitch
(`modules.js`, `_direttaKick`). Senza il numero degli spettatori,
`$spettatori` resta vuoto: zero direbbe una cosa falsa.

Collaudi: `test/unita/kick-da-solo.test.mjs`.

### Titolo e categoria su Kick

Kick ha la sua rotta, documentata: `PATCH /public/v1/channels` con
`stream_title` e `category_id` (un intero), permesso `channel:write`, risposta
204. Le categorie si cercano con `GET /public/v1/categories?q=`, che Kick dà per
deprecata; se non risponde si prova `GET /public/v2/categories?name=`, che
filtra per nome e vuole almeno tre lettere.

`channel:write` adesso è nel collegamento normale (`kick/auth.js`, `SCOPE`). Chi
ha collegato Kick prima non ce l'ha, e Kick non aggiunge permessi a un token già
dato: la riga di Kick in «Le tue piattaforme» dice quali permessi arrivati dopo
mancano e ha il tasto «Aggiorna i permessi di Kick», che ricollega Kick con la
stessa azione di «Sistema», quindi la moderazione, se c'era, resta. La lista è
una sola (`kick/auth.js`, `PERMESSI_NUOVI`): da lì si ricavano sia i controlli
(`haPermesso`) sia quello che la riga dice che manca (`permessiMancanti`).
Senza il permesso non si chiama Kick: si sa già che rifiuterebbe.
I permessi restano anche quando il token si rinnova: nel rinnovo lo `scope` è
facoltativo, e quando manca vuol dire «gli stessi di prima» (RFC 6749, §6).
Leggerlo come «nessuno» spegnerebbe da solo, al primo rinnovo, questo e la
moderazione (`kick/api.js`, `tokenBuono`; `test/unita/kick-rinnovo.test.mjs`).

`kick/api.js` espone `canaleKick(login)`, con la **stessa forma di helix**
(`searchCategories`, `setChannelInfo`; l'errore ha `.status`, 403 per il
permesso). Così `risolviCategoria` (`docs/CATEGORIA.md`) sceglie fra i nomi di
Kick con le stesse regole, e chi cambia il canale non sa con chi parla.

**Chi cambia il canale** lo decide un posto solo, il motore dei moduli
(`modules.js`, `_canaleDi` e `canalePer`):

- un comando scritto in chat, o un modulo partito da un evento: la piattaforma
  da cui arriva. `!titolo` nella chat di Kick cambia Kick, nella chat di Twitch
  cambia Twitch, anche sullo stesso canale;
- timer, voce, API, privato Telegram e prova non arrivano da una chat: valgono
  per la piattaforma del canale. Un canale nato su Kick non chiede mai a Twitch;
  un canale di Twitch con Kick collegato cambia Twitch;
- YouTube: nessuno, per ora. Allo staff si dice dove si può, al pubblico niente.

La voce e il privato Telegram (`web/server.js`) chiedono al motore
(`canaleDa`), con il permesso della stessa piattaforma (`puoCambiareCanale`), e
annunciano con la voce della piattaforma (`vocePer`). Il rimedio detto è quello
della piattaforma: su Kick «ricollega Kick», su Twitch «riautorizza».

Collaudi: `test/unita/kick-titolo-categoria.test.mjs` (le chiamate vere di
Kick, la v2, il permesso, chi cambia per piattaforma, le azioni inline),
`test/contratto/kick-titolo-categoria.test.mjs` (voce, Telegram, avvio,
pannello e pagina della voce passano di lì).

### I premi del canale su Kick

Le fonti (docs.kick.com): l'evento `channel.reward.redemption.updated` v1, con
`id`, `user_input`, `status` (`pending`, `accepted`, `rejected`), `reward`
(`id`, `title`, `cost`, `description`) e `redeemer`; le rotte
`/public/v1/channels/rewards` (elenco, crea, cambia, togli: cambiare e togliere
solo all'app che ha creato il premio) e `.../redemptions/accept` e `reject`
(fino a 25 id), con i permessi `channel:rewards:read` e `:write`, ora nel
collegamento normale. Sul rimborso dei punti quando si rifiuta i documenti non
dicono niente: su Kick il bot non promette mai «punti rimborsati».

**Un riscatto nasce una volta.** Kick manda lo stesso evento quando il riscatto
nasce (in attesa, o già accettato se il premio salta la coda) e a ogni cambio di
stato, quando lo streamer lo accetta o lo rifiuta. La nascita è la prima volta che
si vede quell'id con uno stato che non sia «rifiutato» (`kick/riscatti.js`); gli
id visti stanno nel database, gli ultimi 500 per canale, così un riavvio fra la
nascita e l'accettazione non lo fa rinascere.

**Una porta sola.** Il riscatto di Kick si traduce nella forma di quello di
Twitch (`channel.channel_points_custom_reward_redemption.add`, con `reward`,
`user_input` e `piattaforma: 'kick'`) e passa da `_riscatto` (`bot.js`), la
stessa porta dei riscatti di Twitch: avviso del premio, richiesta musicale,
penitenza, contatore, muro delle emote; poi moduli e memoria, con la
piattaforma. Si risponde nella chat di Kick, e il riscatto si chiude con chi
premia su Kick: `premiKick` ha la forma di helix (`aggiornaRedemption`:
completato → accetta, annullato → rifiuta). La penitenza ricorda dove è stata
riscattata (`dove`), e parla lì anche alla fine.

Chi riconosce il premio per **nome** (richiesta musicale, penitenze) lo riconosce
anche su Kick, se il premio ha lo stesso nome. Chi lo riconosce per **id** (avvisi
dei premi, contatori, muro) vuole il premio di Kick scelto o creato dal pannello.

**Nel pannello**, chi premia per il canale lo decide un posto solo
(`web/server.js`, `premiDi`): la piattaforma del canale, col suo permesso e il
suo rimedio. Le rotte dei premi (avvisi, suoni, richiesta musicale, penitenze,
contatori) chiedono a lui e creano il premio lì; un premio si toglie da chi l'ha
dato, riconosciuto dalla forma dell'id (ULID per Kick). Su un canale di Twitch
con Kick collegato l'elenco ha anche i premi di Kick (`tuttiIPremi`), e quando
ce ne sono di tutte e due accanto al nome si legge dove sta. I cinque riquadri
dei premi, senza permesso, dicono il rimedio della piattaforma
(`_premiFuoriDaTwitch`): a chi è su Kick «Aggiorna i permessi di Kick», mai i
permessi di Twitch. La scheda delle penitenze si apre anche su Kick
(`ANCHE_SU`).

Collaudi: `test/unita/kick-premi.test.mjs` (l'esempio di docs.kick.com, la
nascita, la porta, chi premia, le penitenze, il rimborso, la lista dei
permessi), `test/contratto/kick-premi-pannello.test.mjs` (le rotte, la lista
mista, i riquadri).

### Cosa NON fa ancora, e perché è detto qui

Lo scudo anti-bot lavora solo su Twitch: legge eventi (follow a ondate, raid,
account nuovi) e usa leve (Shield Mode, solo follower) che Kick non espone allo
stesso modo. Su Kick non lo fingiamo — **meglio nessuna moderazione che una
moderazione che finge di esserci**. La chat di YouTube non ha ancora chi
modera: lì valgono solo le parole vietate (il richiamo).

## YouTube

Le credenziali ci sono. Il lavoro vero non è l'OAuth: è il **quota** e la
**verifica Google** (lo scope `youtube.force-ssl` è sensibile; prima della
verifica il progetto ha un tetto di 100 utenti che vale per tutta la sua vita).
Il modo giusto di leggere la chat è `liveChatMessages.streamList`, che tiene una
connessione aperta invece di interrogare in continuazione.
