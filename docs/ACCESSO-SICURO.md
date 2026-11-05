<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# L'accesso sicuro

Chiesto così: «il sito deve avere un "cloudflare like" per l'ingresso: deve
capire se il sito è utilizzato da bot o no; se fosse insicuro deve sloggare
l'utente e dare il messaggio "abbiamo notato un'anomalia, potrebbe non essere
nulla ma per sicurezza riesegui il login" e un prompt per attivare il 2FA. Potrà
da oggi registrarsi anche normalmente; con Kick e Twitch sarà più automatico,
con la registrazione normale dovrà anche rispondere a domande per dare
un'infarinatura iniziale al bot. Registrazione tramite social: richiesta 2FA e
login tramite passkey o codice mail (password si può fare, almeno 8 caratteri,
accettando i portachiavi Apple, Google, Samsung)». Decisioni dello
streamer-proprietario: chi si registra con la mail **entra come oggi**
(approvato: pass del sito madre o abbonamento); il secondo fattore è
**obbligatorio**, e una passkey vale; chi ha già una passkey non deve fare
niente (gli si dice solo che servirà); il codice per mail è la riserva quando la
passkey non c'è, proposto al prossimo ingresso, «a prova di scemo», con parole
semplici.

## Il modello

### 1. La porta d'ingresso: capire se è una persona

Niente servizi di altri e niente CAPTCHA da risolvere. Tre cose, in ordine:

- **Una prova di lavoro** nel browser prima di mandare un modulo di ingresso o
  di registrazione: il server dà una sfida firmata (HMAC, con scadenza, senza
  stato), il browser trova il numero che la risolve (qualche centinaio di
  millisecondi su un telefono), il server la verifica e la brucia (una volta
  sola). Uno script che prova mille ingressi paga mille volte; una persona non
  se ne accorge.
- **Segnali del browser** (`navigator.webdriver`, un browser senza testa, API
  che un browser vero ha), mandati con la prova: alzano la difficoltà della
  prova o chiedono una prova in più. Non bloccano da soli: un segnale non è una
  prova.
- **Il tetto di tentativi** per indirizzo e per conto, come le altre porte.

### 2. La sessione legata: capire se è ancora lei

A ogni ingresso la sessione si lega a un'impronta minima di chi è entrato: la
famiglia del browser e del sistema (non la versione), e la rete abbreviata (un
/16 su IPv4, un /48 su IPv6). Tenuta sul server, mai nel cookie.

- **Anomalia forte**: lo stesso cookie usato da una famiglia di browser o di
  sistema diversa (il segno di un cookie rubato), o usato insieme da due reti
  diverse con due browser diversi. Allora la sessione si chiude sul server,
  subito, e chi l'aveva in mano torna alla pagina d'ingresso con: «Abbiamo
  notato un'anomalia: potrebbe non essere niente, ma per sicurezza rifai
  l'accesso.» Dopo l'accesso, se non ha ancora il secondo fattore, gli si
  propone subito.
- **Non è un'anomalia** cambiare rete (il telefono passa dal Wi-Fi ai dati),
  aggiornare il browser, cambiare indirizzo IP nella stessa rete. Uscire
  qualcuno per niente è un difetto, non una prudenza.
- Ogni chiusura per anomalia resta nel registro degli accessi dello streamer
  (quando, da che famiglia di browser, perché), senza indirizzi interi.

### 3. I modi di entrare

- **Twitch, Kick, Discord**: come oggi.
- **La mail** (nuovo): ci si registra con un indirizzo, che si conferma col
  link o col codice della posta del bot (`posta.attiva()`, docs/POSTA.md;
  senza posta, la registrazione con la mail non si offre: non si promette
  quello che non si può dare). Poi si entra con:
  - una **passkey** (Face ID, impronta, Google, Samsung, iCloud, un
    portachiavi qualunque: WebAuthn, `webauthn.js` c'è già);
  - un **codice per mail** (6 cifre, 10 minuti, una volta sola);
  - una **password**, se la vuole: almeno 8 caratteri, nessun massimo
    sotto i 128, nessuna regola su maiuscole e simboli, e il modulo scritto
    perché i portachiavi la propongano e la salvino da soli
    (`autocomplete="username"` e `"new-password"`/`"current-password"`).
    Si salva con un hash lento (scrypt di Node, con sale), mai in chiaro.
- **Le domande del primo ingresso**, per chi si registra con la mail (chi
  arriva da Twitch o Kick le trova facoltative: il bot impara dal canale): come
  si chiama il canale, di cosa parla, che tono deve avere il bot, come
  chiamare la community, la lingua della chat, cosa non deve dire mai. Ogni
  risposta va nell'impostazione che c'è già (identità, tono, genere,
  community, lingua), non in un posto nuovo; si possono cambiare tutte dopo.
  Il conto poi aspetta l'approvazione, come oggi.

### 4. Il secondo fattore: obbligatorio

Valgono: una **passkey**; il **codice per mail** (se la posta è accesa);
l'**app dei codici** (TOTP, 6 cifre, 30 secondi: Google Authenticator, Authy,
quello dei portachiavi). Più i **codici di riserva**: dieci, da salvare, ognuno
vale una volta; senza, un telefono perso chiude fuori.

- Chi ha già una passkey ha già il secondo fattore: non deve fare niente. Gli
  si dice, una volta: «Da oggi per entrare serve una seconda prova che sei tu.
  Tu hai già la passkey: sei a posto.»
- Chi non ha niente, al prossimo ingresso trova una pagina sola, a prova di
  distrazione: «Per entrare d'ora in poi ti chiediamo una seconda prova che sei
  proprio tu. Scegli come, ci vuole un minuto:» e tre tasti grandi: «Con questo
  telefono o computer (passkey)», «Con un codice per mail», «Con l'app dei
  codici». Un passo alla volta, col perché scritto sotto ogni tasto, e i
  codici di riserva alla fine. Non si entra senza averne uno: è la regola.
- Chi ha la passkey ma non un'altra via, al prossimo ingresso si sente
  proporre il codice per mail come riserva («se un giorno non hai il telefono
  con te»), saltabile.
- Vale per chi entra nel pannello: streamer e moderatori delegati.

### 5. Riservatezza

Le impronte della sessione e i segnali del browser servono alla sicurezza e
basta: rete abbreviata, nessuna impronta del dispositivo oltre la famiglia di
browser e sistema, tenute finché la sessione vive (e il registro degli accessi
per 90 giorni). L'informativa lo dice.

### 6. Quando non si riesce a entrare

Chiesto così: «se la persona si dimenticasse password o altro, diamo la
possibilità di chiedere aiuto tramite Discord, Telegram o altro mio: l'utente mi
manda una richiesta con le info che mi servono per contattarlo (nick di Discord,
Instagram o Telegram, in modo che possa essere sicuro che sia lui) e io lo
sblocco. Se no un altro modo, magari automatico (tipo codice via mail)».

Prima da soli, poi con il proprietario; mai una porta che salti il secondo
fattore senza che qualcuno l'abbia guardata.

- **Da soli, sempre offerto per primo** (un link «Non riesci a entrare?»
  sotto ogni modo di entrare, e sulla pagina della seconda prova):
  - *password dimenticata*: si entra col codice per mail (che c'è già) e se ne
    mette una nuova dal pannello; la password non si «recupera», si cambia;
  - *passkey o telefono persi*: un codice di riserva vale come seconda prova, e
    dopo si attiva il nuovo fattore;
  - *mail non più raggiungibile*, *niente codici di riserva*: si passa alla
    richiesta di aiuto. Ogni strada dice in una riga cosa serve, con parole
    semplici.
- **La richiesta di aiuto** (`/aiuto-accesso`): chi chiede scrive quale conto
  è (il nome del canale o la mail con cui entra), cosa non va (password,
  secondo fattore, mail persa, altro: una scelta e una riga), e **come
  raggiungerlo**: uno o più fra Discord, Telegram, Instagram, mail, col suo
  nome lì. Prova di lavoro e tetti come le altre porte; una richiesta aperta
  per conto alla volta. La risposta è la stessa per un conto che c'è e per uno
  che non c'è (niente oracolo). Chi chiede riceve un numero di pratica.
- **Il proprietario la vede** in un elenco suo (pannello, solo amministratore)
  e ne è avvisato dove già riceve gli avvisi del sito (Telegram o Discord del
  proprietario). Accanto a ogni richiesta, per decidere senza fidarsi a
  occhio: **i contatti che quel conto ha già collegato** (Discord collegato, il
  Telegram collegato, i social della pagina link e del canale), segnati
  «combacia» o «non combacia» con quelli scritti nella richiesta; da quanto
  esiste il conto; gli ultimi accessi riusciti (registro, senza indirizzi
  interi). Il proprietario non vede mai password, codici, segreti.
- **Sbloccare** è un tasto del proprietario, con una nota obbligatoria (come
  ha verificato). Genera un **link monouso** (24 ore, una volta sola, legato
  a quel conto) che il proprietario manda lui, in privato, sul contatto
  verificato. Il link fa entrare **una volta** senza il secondo fattore,
  dritto alla pagina che ne fa attivare uno nuovo (e nuovi codici di
  riserva); tutte le altre sessioni di quel conto si chiudono, e i fattori che
  il proprietario segna come persi si tolgono. Se il conto ha una mail, parte
  una mail che dice «il tuo accesso è stato sbloccato su richiesta: se non sei
  stato tu, scrivici». **Rifiutare** chiude la richiesta con una riga per chi
  ha chiesto.
- **Tutto resta nel registro**: chi ha chiesto (i contatti scritti), chi ha
  sbloccato, con quale nota, quando è stato usato il link.

## Garanzie

- Una sfida di ingresso vale una volta, e scade.
- Una sessione chiusa per anomalia non si riapre col cookie vecchio.
- Cambiare rete non chiude una sessione; cambiare famiglia di browser sì.
- Non si entra nel pannello senza un secondo fattore; una passkey basta.
- Una password non si salva mai in chiaro; un codice per mail vale una volta e
  scade.
- La registrazione con la mail non apre il pannello senza approvazione.
- Una richiesta di aiuto non apre niente da sola: sblocca solo il proprietario,
  e il link vale una volta, per un conto, per 24 ore.
- Il proprietario non vede mai password, codici o segreti, e una richiesta per
  un conto che non c'è risponde come una per un conto che c'è.

## Le scelte fatte costruendolo

Quello che il modello non diceva, deciso prima del codice. Ogni scelta tiene
la stessa riga: corretto per costruzione, e nessuno chiuso fuori per errore.

### La porta d'ingresso

- **La sfida** è `<dati>.<firma>`: i dati dicono un numero casuale, la
  scadenza (2 minuti) e la difficoltà; la firma è un HMAC col segno del
  server per questo scopo (`segno('ingresso-prova', …)`, src/segreti.js). Il
  server non tiene niente finché la sfida non torna. La prova è un numero `n`
  tale che SHA-256(`sfida:n`) cominci con tanti bit a zero quanti dice la
  difficoltà. **Si brucia nello schema**: la tabella `ingresso_sfide` ha la
  sfida come chiave primaria, e la seconda volta l'INSERT non passa. Le righe
  scadute si tolgono da sole.
- **La difficoltà** di partenza è misurata, non scelta a occhio: col browser
  vero (Web Crypto, `crypto.subtle.digest`, a gruppi da 64) sul banco fa
  circa 19 mila digest al secondo, un telefono un quarto. Con 13 bit la media
  era quasi mezzo secondo sul banco e due su un telefono, con code di cinque:
  troppo. Con **11 bit** (2048 tentativi in media) è un decimo di secondo sul
  banco e qualche centinaio di millisecondi su un telefono, come chiede il
  modello. Il conto sta in `ingresso-prova.js`. I **segnali** (`navigator.webdriver`,
  «Headless» nel nome del browser, nessuna lingua, nessun `chrome`/`safari`
  dove il browser dice di esserlo) li manda il browser quando chiede la
  sfida: ognuno aggiunge 2 bit (quattro volte il lavoro), fino a +6. Non
  bloccano mai: chi mente sui segnali paga la difficoltà di partenza, chi è
  un browser vero pilotato paga di più.
- **Dove serve**: prima di mandare un modulo di ingresso o di registrazione
  che parte dal sito (chiedere il codice per mail, entrare con la password,
  registrarsi). Oggi il modulo che c'è è **entrare con un codice per mail**:
  vale per chi nel pannello ha confermato la mail **e** ha un'altra prova
  (passkey o app), perché la mail è la prima prova e la seconda deve essere
  un'altra. La porta risponde allo stesso modo per una mail che c'è e per una
  che non c'è. Una mail per entrare è di una persona sola (un indice unico). **Non** serve sui tasti di Twitch, Kick, Discord e YouTube
  (sono link: la porta che si bussa è la loro) né sulla passkey (la firma del
  dispositivo è già una prova che non si fabbrica). Non serve sui codici del
  secondo fattore: lì il tetto sta nello schema (ogni codice per mail regge
  5 tentativi, poi è bruciato; il TOTP accetta un passo una volta sola).
- **I tetti**: per indirizzo (10 richieste di sfida, 10 moduli al minuto) e
  per conto (5 codici per mail all'ora, 10 tentativi di password all'ora).
  Stanno in memoria (`features/ingresso.js`, `finestre`): un riavvio li
  azzera, e al peggio regala un minuto a chi stava per essere fermato; la
  difesa vera sta nello schema e nella prova di lavoro.

### La sessione legata

- La sessione del sito resta il cookie firmato (cookie-session), ma dentro ora
  c'è solo un **numero di sessione** (`sid`, 128 bit casuali) che punta a una
  riga di `ingresso_sessioni` sul server. **Vale solo una riga che c'è, è
  aperta e non è scaduta**: una riga chiusa, scaduta o che non c'è più chiude
  il cookie. Così un cookie vecchio non riapre niente, per costruzione.
- **La famiglia** è il **motore** del browser (chromium, gecko, webkit) e il
  **sistema** raggruppato (windows, apple, linux-android, chromeos). Non il
  nome commerciale del browser: chi su iPhone tocca «versione desktop» o chi
  su Android chiede il sito per computer cambia il nome che il browser dice di
  sé (Safari per Mac, Linux), non il motore né il gruppo di sistema. Uscire
  qualcuno per un tasto del suo browser sarebbe il difetto che il modello
  vieta. Un programma (curl, uno script) è famiglia «altro», e con un cookie
  nato in un browser è un'anomalia.
- **Le due anomalie del modello sono una**: con solo la famiglia (il modello
  vieta impronte più fini), «due reti con due browser diversi» vuol dire due
  famiglie, e cambiare famiglia chiude già da solo. La rete abbreviata si
  tiene per il registro e per l'elenco delle sessioni, e cambiarla non chiude
  mai niente.
- **Chiusa**, la riga perde subito famiglia e rete: resta solo «di chi,
  quando, perché», finché sarebbe scaduta, e poi va via. Serve a dire a chi
  aveva il cookie che c'è stata un'anomalia, e a non riaprire.
- **La durata** di una sessione la sceglie la persona nel pannello: 1, 7, 14
  o 30 giorni (di serie 30, come il cookie di oggi). Vale per le sessioni che
  apre da lì in poi.
- **I cookie di prima** (senza `sid`) valgono ancora per 30 giorni dal primo
  avvio di questa versione, e solo come un ingresso nuovo: si legano al primo
  passaggio e chiedono il secondo fattore. Dopo quei 30 giorni un cookie senza
  `sid` è un cookie vecchio, e non apre più.
- **Cambiare persona** nello stesso browser (entrare come un altro) chiude la
  riga di prima e ne apre una nuova: una prova data da uno non vale per
  l'altro.
- **Il messaggio** dell'anomalia lo vede chi aveva il cookie, alla pagina
  d'ingresso (`/ingresso`), una volta. Le chiamate del pannello rispondono 401
  con l'indirizzo dove andare, e il pannello ci va.

### Il secondo fattore

- **Una sessione nasce «in attesa»** da qualunque porta (Twitch, Kick,
  YouTube, Discord, Telegram, il pass del sito, un cookie di prima): finché la
  riga non dice che la prova è stata data, il pannello non esiste
  (`currentUser` è vuoto, tutte le guardie dicono 401) e la pagina porta a
  `/seconda-prova`. Una porta nuova che si dimenticasse del secondo fattore
  non lo salta: nasce in attesa lo stesso. **Solo l'ingresso con la passkey**
  apre la sessione già provata, perché la passkey è essa stessa il secondo
  fattore.
- **Chi non ha niente** trova a `/seconda-prova` la pagina a prova di
  distrazione e lo attiva lì, in quel momento: è l'unico modo di non chiudere
  fuori nessuno il giorno in cui la regola parte. Chi ne ha almeno uno deve
  usarlo (o un codice di riserva): attivarne uno nuovo da lì non si può,
  sennò il secondo fattore non proverebbe niente.
- **TOTP**: SHA-1, 6 cifre, 30 secondi (quello che Google Authenticator,
  Authy e i portachiavi leggono dal QR `otpauth://`), un passo prima o dopo
  per l'orologio storto. Il segreto si salva nella busta (`CAMPI_SEGRETI`), e
  l'ultimo passo usato sta nella riga: lo stesso codice non vale due volte
  (`UPDATE … WHERE passo < ?`).
- **Codice per mail**: 6 cifre, 10 minuti, una volta (`UPDATE … WHERE usato=0
  AND scade > ora`), 5 tentativi, e chiederne uno nuovo brucia il vecchio.
  L'indirizzo per la prova si conferma col codice stesso, sta nella busta, e
  accanto ne resta l'impronta per cercarlo. Senza posta accesa il codice per
  mail non si offre.
- **Codici di riserva**: dieci, di 8 segni (alfabeto di 31, senza 0/O e 1/I/L
  che si confondono: quasi 40 bit l'uno), mostrati una volta sola, salvati come impronta. Uno vale una
  volta (`UPDATE … WHERE usato=0`); rifarli butta i vecchi.
- **L'ultimo fattore non si toglie** (passkey, app, mail): prima se ne
  aggiunge un altro. I codici di riserva non contano come fattore: sono la
  riserva.
- **I due avvisi** del modello («Tu hai già la passkey: sei a posto» e la
  proposta del codice per mail a chi ha solo la passkey) si mostrano nel
  pannello, una volta, e la risposta si ricorda per persona
  (`ingresso_persone`). La proposta si può saltare e non torna.
- I confronti di codici e impronte sono a tempo costante
  (`crypto.timingSafeEqual`), e si guardano tutte le righe candidate senza
  fermarsi alla prima.

### Il registro e le pagine

- **Il registro degli accessi** è della persona (non del canale): ingressi,
  chiusure per anomalia, fattori aggiunti e tolti, codici di riserva usati;
  con motore, sistema e rete abbreviata, mai l'indirizzo intero. Si tiene 90
  giorni e il pannello mostra gli ultimi.
- **La carta del pannello** è «Accesso e sicurezza», nella scheda Account (era
  la carta della passkey): passkey, app dei codici, codice per mail, codici di
  riserva, dove sei dentro (e «chiudi tutte le altre»), quanto dura un
  accesso, il registro. È della persona: un moderatore vede la sua.
- **Le pagine** `/ingresso` e `/seconda-prova` sono file statici col loro
  script: le parole sono negli script, in tre lingue, e la lingua la dice
  `?lang`, poi quella del browser. Il «Accedi» della vetrina e l'uscita portano
  a `/ingresso`, dove ci sono tutti i modi di entrare.

### La registrazione con la mail (passo 4)

- **Il conto è uno spazio senza diretta**, come chi entra solo con Discord: un
  canale `ml.<8 segni a caso>` (una piattaforma in più in `src/identita.js`,
  senza diretta e senza indirizzo pubblico). Il nome che la persona dà al
  canale diventa il nome da mostrare, non il login: così nessuno si prende il
  nome di un altro scrivendolo, e Twitch, Kick e YouTube si collegano dopo
  dal pannello, come oggi. I moderatori non si invitano «per mail»: la mail
  non sta fra le piattaforme dei moderatori.
- **Il pannello non c'è finché il conto non è approvato**, per costruzione:
  `haAccesso` (la sola fonte dei contesti del pannello) dice di no a un conto
  `ml.` che non è `approved`. Approva **come oggi**: l'amministratore
  dall'elenco degli streamer, un abbonamento pagato (il ritorno da Stripe
  approva), o il pass del sito madre portato **dallo stesso browser** mentre
  il conto aspetta (il pass dice che è uno streamer di andryxify.it; da lì si
  entra col suo account, e il conto con la mail resta approvato).
- **La registrazione** chiede solo la mail e, se la vuole, la password (8–128
  caratteri, nessuna regola di forma, `autocomplete="username"` e
  `"new-password"`), dopo la prova di lavoro (scopo «registra»). Finché la
  mail non è confermata non nasce niente: la richiesta sta in
  `ingresso_iscrizioni` (mail e impronta della password nella busta), scade
  in un'ora, e il codice (6 cifre, 10 minuti, una volta) sta in
  `ingresso_codici` come tutti gli altri. Una mail che è già di qualcuno
  riceve una mail che glielo dice, e la porta risponde allo stesso modo: non
  dice chi è di casa. Senza posta accesa la registrazione non si offre.
- **La password** si salva come `scrypt:<N>:<r>:<p>:<sale>:<calco>` (sale di
  16 byte, N=2^15, r=8, p=1, calco di 64 byte), e quella stringa sta a sua
  volta nella busta. Si confronta a tempo costante. Mai in chiaro, né nel
  database né nei log né nelle risposte.
- **Entrare**: con la passkey (vale per due), con la password o con il codice
  per mail. **Il secondo fattore vale anche qui, e dev'essere di un altro
  tipo dal primo**: password e codice per mail sono due prove diverse
  (sapere e avere), quindi chi ha tutte e due entra con l'una e conferma con
  l'altra. Chi è entrato con la sola prova che ha (la mail, senza password)
  trova a `/seconda-prova` il modo di attivarne un'altra (passkey o app),
  come chi arriva da Twitch senza niente. Per un account dei social la mail
  resta com'era: vale per entrare solo se accanto c'è un'altra prova.
- **Le domande del primo ingresso** (`/primo-ingresso`) vanno nelle
  impostazioni che ci sono: il nome del canale nel nome da mostrare, di cosa
  parla in `scheda.faccio`, cosa non deve dire mai in `scheda.evita`, il tono
  in `tono`, come parla di sé in `genere`, la community in `voce.community`,
  la lingua della chat in `preferenze.lingua`, ripulite dagli stessi pulitori
  del pannello. Sono tutte facoltative e si cambiano dopo. Le vede chi ha il
  conto in attesa, nella stessa sessione in cui ha confermato la mail o è
  entrato, e da lì può anche abbonarsi (il giro dell'abbonamento di oggi, per
  chi non ha ancora un pannello).

### Quando non si riesce a entrare (passo 5)

- **La pagina** è `/aiuto-accesso`, e «Non riesci a entrare?» porta lì dalla
  porta d'ingresso e dalla seconda prova. Prima le strade da soli, una riga
  ciascuna: la password dimenticata (si entra col codice per mail e la si
  cambia dal pannello), la passkey o il telefono persi (un codice di
  riserva), poi la richiesta.
- **La richiesta** passa dalla prova di lavoro (scopo «aiuto»), ha un tetto
  per indirizzo (3 all'ora) e uno in tutto (30 all'ora: sono messaggi che
  arrivano al proprietario). Il conto si cerca da quello che è scritto: una
  mail fra le mail per entrare; un nome fra i login delle piattaforme (twitch,
  `kick.`, `yt.`, `dc.`) e il nome da mostrare, solo se ne esce uno. Si
  conserva anche quando il conto non si trova (il proprietario la vede
  «nessun conto»), e chi chiede ha la stessa risposta e un numero di pratica
  in tutti e due i casi.
- **Una richiesta aperta per conto alla volta**, nello schema (indice unico
  sul conto fra le aperte). Una seconda richiesta per lo stesso conto si
  conserva come **doppione** (non si può sbloccare, il proprietario la vede
  accanto a quella aperta), con la stessa risposta: la porta non dice se per
  quel conto c'è già una pratica.
- **Il numero di pratica** (8 segni, quasi 40 bit) serve a chi ha chiesto per
  sapere com'è andata («ricevuta», «sbloccata: ti abbiamo scritto», «non
  sbloccata» con la riga del proprietario), col tetto per indirizzo. Il link
  non passa mai di lì.
- **Cosa si conserva**: quello che è scritto (il conto, la riga, i contatti)
  sta nella busta; si tiene 90 giorni, come il registro. Nell'esportazione dei
  dati non esce: i contatti sono di chi ha chiesto, che può non essere lo
  streamer.
- **L'avviso al proprietario** va dove riceve già gli avvisi del sito: il suo
  Telegram privato e la sua mail confermata (quelli dell'amministratore,
  `ADMIN_LOGINS`), con il numero di pratica e niente di quello che è scritto.
  Il resto lo legge nel pannello.
- **L'elenco** è una carta della scheda Admin, solo `requireAdmin`. Per ogni
  richiesta: il conto trovato (nome, piattaforma, da quando esiste, i fattori
  che ha **come conteggio**), gli ultimi accessi del registro, e i contatti
  scritti confrontati con quelli collegati al conto: Discord (l'accesso con
  Discord), Telegram (l'accesso con Telegram), Instagram, Discord e Telegram
  della pagina link, la mail per entrare e quella dei rapporti. Ognuno esce
  «combacia», «non combacia» o «niente da confrontare». Il confronto lo fa il
  server: il pannello non riceve mai la mail del conto, password, codici o
  segreti.
- **Sbloccare** si fa con una nota obbligatoria (almeno 10 caratteri) e con i
  fattori persi da togliere (passkey, app, password). Una volta sola:
  `UPDATE … WHERE stato='aperta'`. Il link è
  `/sblocca-accesso?t=<32 byte>`, del token si tiene l'impronta, vale 24 ore e
  si usa una volta (`UPDATE … WHERE usato=0 AND scade > ora`). Allo sblocco si
  chiudono tutte le sessioni del conto, si tolgono i fattori segnati persi, e
  parte la mail «il tuo accesso è stato sbloccato su richiesta» se il conto ha
  una mail. Il link lo vede solo il proprietario, una volta, nella risposta.
- **Il link non si consuma aprendolo.** Telegram e Discord aprono da soli i
  link per farne l'anteprima: la pagina chiede un tocco, ed è il tocco
  (`POST`) che usa il link. Usato, apre una sessione **in attesa** con
  «sblocco» come prima prova: nessun fattore vale come seconda, quindi la
  pagina della seconda prova fa attivare un fattore nuovo, con codici di
  riserva nuovi, e solo dopo si entra nel pannello.
- **Rifiutare** chiude la richiesta con una riga per chi ha chiesto (che la
  legge col numero di pratica).
- **Il registro** del conto annota la richiesta (il numero di pratica), lo
  sblocco (chi e la nota) e l'uso del link.

## Dove sta, e cosa manca

- **Lo schema**: `src/db.js` (`ingresso_sfide`, `ingresso_sessioni`,
  `ingresso_registro`, `ingresso_fattori`, `ingresso_codici`,
  `ingresso_persone`, e `ingressoDb`). **Le decisioni**:
  `src/features/ingresso.js` (legare e leggere la sessione, i fattori, i
  codici), `ingresso-impronta.js` (famiglia e rete), `ingresso-prova.js` (la
  prova di lavoro), `ingresso-totp.js` (l'app dei codici). **Le rotte**:
  `src/web/rotte-ingresso.js` (`legaLeSessioni` prima di ogni rotta,
  `utenteAperto` che è il `currentUser` del server, `montaIngresso`). **Le
  pagine**: `public/ingresso.html`, `public/seconda-prova.html` coi loro
  script; la carta del pannello in `app.js` (`caricaSicurezza`).
- **Le prove**: `test/unita/ingresso.test.mjs` e
  `test/contratto/ingresso-rotte.test.mjs`, che monta le rotte vere con
  cookie-session e porte finte che fanno quello che fanno le vere (mettono la
  persona in sessione e basta).
- **Il passo 4**: `src/features/ingresso-password.js` (scrypt),
  `ingresso-domande.js` (le risposte nelle impostazioni), `ingresso_iscrizioni`
  in `src/db.js`, le rotte `/api/ingresso/registra`, `/registra/conferma`,
  `/password`, `/prova/password`, `/conto`, `/domande`, `/abbonati` e la
  pagina `/primo-ingresso`; la regola del pannello è `contoApribile`
  (`features/ingresso.js`), usata da `haAccesso`. Le prove stanno in
  `test/contratto/ingresso-registra.test.mjs`.
- **Il passo 5**: `src/features/ingresso-aiuto.js` (i contatti in una forma
  sola e il confronto), `ingresso_aiuti` in `src/db.js`, le rotte in
  `src/web/rotte-aiuto-accesso.js` (`/aiuto-accesso`, `/sblocca-accesso`,
  `/api/aiuto-accesso…`, `/api/admin/aiuti…`), le pagine
  `public/aiuto-accesso.html` e `public/sblocca-accesso.html`, la carta «Chi
  non riesce a entrare» nella scheda Admin. Le prove stanno in
  `test/contratto/ingresso-aiuto.test.mjs`.
