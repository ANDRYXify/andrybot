// Le guide: pagine di CONTENUTO, non l'applicazione.
//
// Perché esistono. Il sito aveva una sola pagina indicizzabile — la vetrina — e
// tre voci di sitemap che erano la stessa vetrina in tre lingue. Cercando "bot
// twitch" non compariva da nessuna parte, e non per un difetto tecnico: robots,
// sitemap, canonical, hreflang e dati strutturati erano già a posto. Mancava la
// cosa che i motori misurano davvero, cioè la sostanza: una pagina sola non ha
// niente da dire su un tema, e nel 2026 una pagina sottile resta non indicizzata
// anche quando la si sottopone a mano.
//
// C'è anche una ragione di forma. Quella query, in italiano, è occupata da
// guide e confronti, non da homepage di prodotto: chi cerca "bot twitch" vuole
// capire come si fa, non atterrare su una vetrina. Per comparire lì bisogna
// rispondere a quella domanda.
//
// Come sono fatte. HTML completo servito dal server, senza applicazione e senza
// JavaScript: quello che il crawler legge è quello che legge la persona, subito,
// senza aspettare un rendering. Il foglio di stile è dentro la pagina — sono
// tre chilobyte, una richiesta in meno vale più di una cache — e l'unica risorsa
// esterna è il font, già ospitato qui.
//
// Il contenuto sta in questa struttura di dati e non in file HTML sparsi: una
// guida in più è una voce in più in GUIDE, e da lì si aggiornano da sole la
// sitemap, l'indice e i collegamenti fra guide. Un fatto scritto in un posto solo.

const SITO = 'https://socialbot.live';

export const GUIDE = [
  {
    slug: 'bot-per-twitch-italiano',
    titolo: 'Bot per Twitch in italiano: come sceglierlo | SocialBot',
    h1: 'Bot per Twitch in italiano: come sceglierlo davvero',
    desc: 'Nightbot, StreamElements, Moobot, WizeBot: cosa cambia davvero fra i bot per Twitch, e la differenza di cui nessuno parla — chi scrive in chat.',
    aggiornata: '2026-08-27',
    tipo: 'articolo',
    corpo: [
      { p: [
        'Quasi tutti i bot per Twitch fanno le stesse cose: comandi personalizzati, timer, moderazione automatica dei link e delle parolacce, contatori, code di richieste. Se stai confrontando le liste di funzioni ti accorgerai che si somigliano tutte, ed è normale: quelle funzioni sono ormai un requisito minimo, non un vantaggio.',
        'La differenza vera sta in tre punti di cui si parla poco, e sono i tre che noterai davvero dopo la prima settimana.',
      ] },
      { h2: 'Primo: chi scrive in chat', p: [
        'Nightbot, StreamElements, Moobot, WizeBot e quasi tutti gli altri scrivono in chat con un <strong>account proprio</strong>. In chat compare "Nightbot" — un nome che appartiene a un servizio, non a te. Chi guarda vede un messaggio automatico e lo legge come tale.',
        'SocialBot scrive con <strong>il tuo account</strong>: i messaggi automatici escono a nome tuo, con il tuo colore e i tuoi badge. Non c\'è un account estraneo in chat e non devi dare la moderazione a un terzo. Tecnicamente è la differenza fra un bot che ti chiede di promuoverlo moderatore e uno che agisce con i permessi che gli hai concesso tu, revocabili in qualsiasi momento dalle impostazioni di Twitch.',
        'È un dettaglio estetico? Per molti sì. Per chi tiene a una chat che sembri sua, no.',
      ] },
      { h2: 'Secondo: dove gira', p: [
        'I bot in cloud (Nightbot, StreamElements) girano sui server di qualcun altro e non richiedono niente sul tuo computer: comodissimi, ma quello che possono fare è quello che quel servizio ha deciso di offrire.',
        'I bot locali (Streamlabs Chatbot, PhantomBot) girano sul tuo PC: fanno molto di più, ma rubano risorse proprio mentre stai trasmettendo, e se il PC si spegne il bot si spegne.',
        'La domanda giusta non è "quale è meglio" ma "quanto ti serve personalizzare". Se ti bastano comandi e timer, il cloud è la scelta ovvia e non c\'è motivo di complicarsi la vita.',
      ] },
      { h2: 'Terzo: cosa succede quando le cose vanno male', p: [
        'Questo è il punto che nessuna tabella comparativa mette in evidenza, e che scopri nel momento peggiore: quando arrivano cinquecento follow finti in due minuti, o quando venti account incollano lo stesso messaggio in chat.',
        'Quasi tutti i bot hanno una lista di parole vietate e un anti-spam sui link. Pochi hanno qualcosa di serio contro i <a href="/guide/follow-bot-e-hate-raid">follow-bot e gli hate-raid</a>, e quei pochi in genere chiedono di configurare a mano soglie che nessuno sa dove mettere.',
      ] },
      { h2: 'Le funzioni che contano, in pratica', ul: [
        '<strong>Comandi personalizzati</strong>: li hanno tutti. Guarda se supportano variabili (chi ha scritto, il conteggio, il tempo dall\'ultimo uso) e permessi per ruolo.',
        '<strong>Timer</strong>: messaggi ricorrenti. Verifica che si fermino quando la chat è morta, altrimenti parli da solo.',
        '<strong>Overlay per OBS</strong>: alert, chat a schermo, widget. Non tutti i bot li includono; alcuni li vendono a parte.',
        '<strong>Clip automatiche</strong>: utile se non hai un mod dedicato.',
        '<strong>Notifiche quando vai live</strong>: su Telegram, Discord, o dove sta il tuo pubblico.',
        '<strong>Ore guardate e fedeltà</strong>: se vuoi premiare chi c\'è sempre.',
        '<strong>Difesa dai bot</strong>: vedi sopra. Guarda che cosa fa <em>da sola</em>, non quante caselle ha.',
      ] },
      { h2: 'Quanto costa', p: [
        'Nightbot e StreamElements sono gratuiti e lo sono sempre stati. WizeBot ha un piano gratuito e uno a pagamento. Streamlabs offre il chatbot gratis insieme al resto della suite.',
        'SocialBot è gratuito nelle funzioni principali. Non ha senso pagare per comandi e timer: sono un requisito minimo, non un prodotto.',
      ] },
      { h2: 'Se stai partendo adesso', p: [
        'Non passare una serata a confrontare tabelle. Prendine uno, collegalo, crea tre comandi e un timer, e usalo per una settimana. Cambiarlo dopo costa mezz\'ora, e in mezz\'ora avrai imparato quali funzioni ti servono davvero — che non sono quelle che pensavi.',
        'Se vuoi partire da qui: <a href="/guide/come-mettere-un-bot-su-twitch">come si collega un bot a Twitch</a>, passo per passo.',
      ] },
    ],
    faq: [
      { d: 'Qual è il miglior bot per Twitch in italiano?', r: 'Non esiste un migliore in assoluto: fanno quasi tutti le stesse cose di base. Le differenze che conterranno per te sono chi scrive in chat (un account del servizio o il tuo), se gira in cloud o sul tuo PC, e quanto sa difenderti da follow-bot e hate-raid senza che tu debba configurare nulla.' },
      { d: 'I bot per Twitch sono gratis?', r: 'I principali sì, almeno nelle funzioni di base: comandi, timer, moderazione automatica. Alcuni fanno pagare le funzioni avanzate o gli overlay. SocialBot è gratuito nelle funzioni principali.' },
      { d: 'Un bot può farmi bannare da Twitch?', r: 'No, se usa le API ufficiali e i permessi che gli hai concesso. Sono vietati i bot che gonfiano spettatori o follower: quelli sì che portano alla sospensione del canale, ed è esattamente il contrario di quello che fa un chat bot.' },
      { d: 'Devo rendere il bot moderatore del mio canale?', r: 'Con i bot che scrivono con un account proprio, sì: senza il ruolo di moderatore non possono moderare né scrivere senza limiti. Con un bot che agisce con il tuo account non serve, perché i permessi sono già i tuoi.' },
    ],
  },

  {
    slug: 'come-mettere-un-bot-su-twitch',
    titolo: 'Come mettere un bot su Twitch: guida passo per passo',
    h1: 'Come mettere un bot su Twitch',
    desc: 'Collegare un bot al tuo canale Twitch richiede cinque minuti. Ecco i passaggi, i permessi da concedere e cosa fare se in chat non compare nulla.',
    aggiornata: '2026-08-27',
    tipo: 'howto',
    corpo: [
      { p: [
        'Collegare un bot al canale richiede cinque minuti e non tocca niente del tuo stream: il bot vive nella chat, non in OBS. Qui sotto i passaggi validi per qualunque bot in cloud, con le differenze dove ci sono.',
      ] },
      { h2: 'Prima di iniziare', ul: [
        'Serve il tuo account Twitch, quello del canale. Non serve un secondo account, a meno che il bot non ti chieda espressamente di crearne uno per lui.',
        'Non serve OBS. Serve solo se poi vuoi aggiungere gli overlay a schermo.',
        'Non serve essere Affiliato o Partner. I bot funzionano anche su un canale appena aperto.',
      ] },
      { h2: 'I passaggi', passi: [
        { t: 'Apri il sito del bot e accedi con Twitch', d: 'Il pulsante di accesso ti porta su una pagina di Twitch, non su un modulo dove scrivi la password altrove. Se un servizio ti chiede la password di Twitch dentro il suo sito, chiudi la pagina: nessun bot legittimo lo fa.' },
        { t: 'Leggi i permessi che chiede', d: 'Twitch ti mostra l\'elenco esatto: leggere la chat, scrivere in chat, moderare, creare clip, e così via. Sono i permessi che il bot userà, e li puoi revocare quando vuoi da Impostazioni → Connessioni sul tuo account Twitch. Se un permesso non ti torna, non autorizzare e chiedi perché serve.' },
        { t: 'Rendi il bot moderatore (solo se scrive con un account suo)', d: 'Scrivi in chat <code>/mod nomedelbot</code>. Senza questo, un bot con account proprio viene rallentato dai limiti anti-spam di Twitch e non può moderare. Se invece il bot agisce con il tuo account, questo passaggio non serve: i permessi sono già i tuoi.' },
        { t: 'Crea il primo comando', d: 'Parti da uno solo, per vedere che funzioni: per esempio un comando <code>!discord</code> che risponde col link del tuo server. Scrivilo in chat e controlla che risponda.' },
        { t: 'Aggiungi un timer', d: 'Un messaggio ogni venti o trenta minuti basta e avanza. Più spesso di così diventa rumore, e la chat impara a ignorarlo.' },
        { t: 'Accendi la difesa dai bot', d: 'Prima che serva, non dopo. Un attacco di follow-bot arriva senza preavviso e non si configura mentre sta succedendo.' },
      ] },
      { h2: 'Se in chat non compare niente', p: [
        'Nel novanta per cento dei casi è una di queste tre.',
      ], ul: [
        '<strong>Il bot non è moderatore</strong> (se scrive con un account suo). Twitch limita pesantemente chi non lo è: i messaggi partono ma arrivano a singhiozzo o non arrivano.',
        '<strong>I permessi sono stati revocati o sono scaduti.</strong> Succede se hai cambiato la password di Twitch: quella operazione invalida tutte le autorizzazioni. Ricollega il bot.',
        '<strong>Il comando ha un prefisso diverso.</strong> Alcuni bot usano <code>!</code>, altri accettano anche <code>?</code> o nessun prefisso. Controlla come l\'hai salvato.',
      ] },
      { h2: 'Due bot insieme si possono usare?', p: [
        'Sì, ed è comune: uno per i comandi e uno per gli overlay, per esempio. L\'unica accortezza è non far rispondere entrambi allo stesso comando, altrimenti in chat compaiono due risposte identiche. Se succede, cambia il nome del comando su uno dei due.',
      ] },
      { h2: 'Come si toglie un bot', p: [
        'Vai su Twitch in Impostazioni → Connessioni, trova il servizio e revoca l\'accesso. Da quel momento non può più fare niente sul tuo canale, indipendentemente da cosa sia rimasto configurato sul suo sito. Se era moderatore, togli anche quello con <code>/unmod nomedelbot</code>.',
      ] },
    ],
    faq: [
      { d: 'Quanto ci vuole a mettere un bot su Twitch?', r: 'Cinque minuti: accedi con Twitch, autorizzi i permessi, e se il bot usa un account proprio lo rendi moderatore con /mod nomedelbot. Configurare comandi e timer richiede altri dieci minuti.' },
      { d: 'Devo creare un secondo account Twitch per il bot?', r: 'Di solito no: i bot in cloud usano un proprio account condiviso, oppure agiscono con il tuo. Un secondo account serve solo se vuoi far girare un bot self-hosted con un\'identità dedicata.' },
      { d: 'Il bot funziona anche quando sono offline?', r: 'Sì, la chat di Twitch resta aperta anche a canale spento e il bot continua a rispondere ai comandi. Molti bot permettono di limitare i timer al solo periodo in diretta, ed è consigliabile farlo.' },
      { d: 'Perché il bot non risponde ai comandi?', r: 'Le tre cause più comuni: non è moderatore del canale (se scrive con un account suo), i permessi sono scaduti perché hai cambiato password su Twitch, oppure il comando è salvato con un prefisso diverso da quello che stai scrivendo.' },
    ],
  },

  {
    slug: 'follow-bot-e-hate-raid',
    titolo: 'Follow-bot e hate-raid su Twitch: come difendersi',
    h1: 'Follow-bot e hate-raid: come difendere il canale',
    desc: 'Come si riconosce un attacco da una clip andata bene, e quali difese funzionano: Shield Mode, chat ai soli follower e le soglie che nessuno sa dove mettere.',
    aggiornata: '2026-08-27',
    tipo: 'articolo',
    corpo: [
      { p: [
        'Un giorno apri le notifiche e trovi trecento follow nuovi in due minuti. Non è andata bene una clip: è un follow-bot. Oppure la chat si riempie dello stesso messaggio ripetuto da venti account diversi, ed è un hate-raid.',
        'Sono due attacchi diversi, con difese diverse, e vale la pena capire come funzionano prima di trovarsi a configurare qualcosa mentre sta succedendo.',
      ] },
      { h2: 'Che cos\'è un follow-bot', p: [
        'Un follow-bot è un insieme di account automatici che seguono il canale in blocco. A volte è un dispetto, a volte è la pubblicità di un servizio che vende follower — i nomi degli account contengono spesso l\'indirizzo del sito che li vende.',
        'Il danno non è il numero gonfiato in sé. È che il rapporto fra follower e spettatori reali si sballa, e quel rapporto conta: Twitch lo guarda per i requisiti di Affiliato e Partner, e chi arriva sul canale lo legge come segnale. Un canale con diecimila follower e quattro spettatori sembra morto, anche se quei quattro sono veri.',
      ] },
      { h2: 'Che cos\'è un hate-raid', p: [
        'Un hate-raid è un\'ondata coordinata di account che entrano in chat e incollano lo stesso messaggio — quasi sempre offensivo, spesso a sfondo razziale o omofobo. La ricerca accademica sul fenomeno ha documentato che colpisce in modo sproporzionato chi si identifica come nero o LGBTQ+.',
        'La firma tecnica di un hate-raid è precisa: <strong>lo stesso testo da molte bocche diverse in pochi secondi</strong>. Non conta chi scrive né da quanto esiste il suo account — gli attacchi ormai usano anche account vecchi e con nomi normali, proprio per aggirare i filtri che guardano solo quelli.',
      ] },
      { h2: 'Le difese native di Twitch', p: [
        'Prima di ogni bot, Twitch ha già degli strumenti, e vale la pena conoscerli perché sono immediati.',
      ], ul: [
        '<strong>Shield Mode</strong>: un interruttore che alza in un colpo tutte le restrizioni che hai configurato. È la cosa più veloce che puoi fare quando ti accorgi che sta succedendo qualcosa.',
        '<strong>Chat ai soli follower</strong>, con un tempo minimo: se imposti "follower da almeno dieci minuti", gli account creati per l\'occasione restano fuori. È la singola impostazione più efficace contro un hate-raid.',
        '<strong>Chat lenta</strong>: un messaggio ogni N secondi. Da sola non ferma niente, ma strozza il volume mentre il resto fa effetto.',
        '<strong>Modalità con restrizioni</strong>: i messaggi di chi scelgono i moderatori restano visibili solo a loro finché non li approvano.',
        '<strong>AutoMod</strong>: filtra automaticamente il linguaggio offensivo. Alzalo di livello quando sei sotto attacco.',
      ] },
      { h2: 'Il problema delle soglie', p: [
        'Quasi tutti gli strumenti anti-bot chiedono di impostare un numero: "avvisami se arrivano più di dieci follow in trenta secondi". Il problema è che quel numero non può essere lo stesso per tutti.',
        'Su un canale da dieci spettatori, dieci follow in mezzo minuto sono un attacco quasi certo. Su un canale da cinquemila sono un martedì qualunque, e quella soglia suona l\'allarme tutte le sere finché non la spegni — e a quel punto sei scoperto.',
        'La soglia giusta non è un numero: è uno <strong>scostamento dal ritmo abituale di quel canale</strong>. Un canale che riceve normalmente un follow ogni due minuti e all\'improvviso ne riceve uno al secondo sta subendo un attacco, qualunque sia il suo numero di spettatori.',
      ] },
      { h2: 'Come si distingue un attacco da una clip andata bene', p: [
        'Questa è la domanda che decide se bannare cento account o no, e sbagliarla costa più dell\'attacco stesso: bannare cento fan veri è un danno che non recuperi.',
        'Si può misurare, e senza chiedere niente a Twitch account per account.',
        '<strong>La cadenza.</strong> Le persone arrivano a caso. Gli intervalli fra un follow e l\'altro, quando sono persone, hanno una dispersione grande quanto la media: è la firma statistica di un evento casuale. Una macchina arriva a passo regolare, e quella dispersione crolla. Se i follow arrivano a intervalli quasi identici, non sono persone — nessun successo virale produce una cadenza regolare.',
        '<strong>I nomi.</strong> Se una fetta consistente dell\'ondata corrisponde già a pattern noti di follow-bot o compare negli elenchi pubblici di account automatici, il resto dell\'ondata viene dallo stesso posto.',
        'Se non c\'è nessuno dei due segni, l\'ondata ha l\'aria di essere genuina. In quel caso la cosa giusta è chiudere la chat e avvisare, non bannare.',
      ] },
      { h2: 'Che cosa fare mentre sta succedendo', passi: [
        { t: 'Alza lo Shield Mode', d: 'È un clic e vale più di qualunque configurazione fatta in fretta.' },
        { t: 'Chat ai soli follower da almeno dieci minuti', d: 'Taglia fuori gli account appena creati senza chiudere la chat a chi c\'è già.' },
        { t: 'Non rispondere e non leggere ad alta voce', d: 'Gli hate-raid cercano una reazione. Darla in diretta è il premio che aspettano.' },
        { t: 'Segnala gli account', d: 'Twitch agisce sui report, e i report su un\'ondata coordinata aiutano anche gli altri canali colpiti dallo stesso gruppo.' },
        { t: 'Non fare pulizia dei follower subito', d: 'Aspetta che sia finita: mentre l\'ondata è in corso ne arrivano altri, e ti ritrovi a rifare il lavoro.' },
      ] },
      { h2: 'Che cosa fa SocialBot', p: [
        'Lo scudo di SocialBot è costruito su questi principi invece che su una lista di caselle da spuntare. In breve: la soglia si tara da sola sul ritmo abituale del canale, imparato in tempo di pace; quando scatta un attacco alza da solo Shield Mode, chat ai soli follower e chat lenta, e li riabbassa quando è passata, rimettendo a posto solo quello che aveva mosso lui; riconosce il coro dello stesso messaggio da bocche diverse anche quando gli account sono vecchi e i nomi puliti; e banna l\'ondata di follow-bot per intero, compresi quelli arrivati prima dell\'allarme — ma solo dopo aver verificato che sia artificiale, con le misure descritte qui sopra.',
        'La documentazione tecnica completa, con le soglie e i motivi di ogni scelta, è pubblica.',
      ] },
    ],
    faq: [
      { d: 'Come faccio a sapere se ho subito un follow-bot?', r: 'Il segnale è un picco improvviso di follow che non corrisponde a nessun evento: nessuna clip virale, nessuna raid, nessun aumento di spettatori. Guardando i nomi si notano spesso schemi ripetuti o riferimenti a siti che vendono follower. Un indizio decisivo è la cadenza: se i follow arrivano a intervalli quasi identici non sono persone.' },
      { d: 'I follow-bot possono far bannare il mio canale?', r: 'Se li subisci e basta, no: Twitch sa che è un attacco che si riceve, non che si compra. Il rischio esiste se sei tu ad acquistarli. Il danno reale di un attacco è il rapporto sballato fra follower e spettatori, che conta per Affiliato e Partner.' },
      { d: 'Come si tolgono i follower finti da Twitch?', r: 'Twitch non offre una rimozione in blocco. Si possono bloccare gli account uno per uno, il che rimuove anche il follow, oppure usare uno strumento che lo fa via API rispettando i limiti di frequenza. Conviene farlo a ondata finita, non durante.' },
      { d: 'Che cos\'è la Shield Mode di Twitch?', r: 'È una modalità che attiva in un colpo solo tutte le restrizioni che hai preconfigurato: chat ai soli follower o abbonati, blocco dei messaggi da account nuovi, AutoMod al massimo. Si accende dalla dashboard o via API, ed è la risposta più rapida a un attacco in corso.' },
      { d: 'Chiudere la chat ai soli follower basta contro un hate-raid?', r: 'Da sola aiuta ma non basta, perché chi attacca può far seguire gli account prima di scrivere. Serve impostare anche un tempo minimo — per esempio follower da almeno dieci minuti — così gli account preparati per l\'occasione restano comunque fuori.' },
    ],
  },

  {
    slug: 'comandi-chat-twitch',
    titolo: 'Comandi per la chat di Twitch: quelli nativi e quelli da bot',
    h1: 'Comandi per la chat di Twitch',
    desc: 'I comandi nativi di Twitch per streamer e moderatori, e come creare comandi personalizzati con un bot: variabili, permessi, contatori e gli errori da evitare.',
    aggiornata: '2026-08-27',
    tipo: 'articolo',
    corpo: [
      { p: [
        'I comandi della chat di Twitch sono di due famiglie, e vale la pena non confonderle: quelli <strong>nativi</strong>, che funzionano su qualunque canale senza installare niente, e quelli <strong>personalizzati</strong>, che richiedono un bot.',
      ] },
      { h2: 'I comandi nativi che userai davvero', ul: [
        '<code>/mod nome</code> e <code>/unmod nome</code> — dà e toglie il ruolo di moderatore.',
        '<code>/vip nome</code> e <code>/unvip nome</code> — i VIP scrivono senza limiti di chat lenta o solo-follower.',
        '<code>/timeout nome secondi</code> — silenzia temporaneamente. Senza secondi vale dieci minuti.',
        '<code>/ban nome</code> e <code>/unban nome</code> — permanente, reversibile.',
        '<code>/clear</code> — svuota la chat per tutti. Utile dopo un attacco.',
        '<code>/slow 30</code> e <code>/slowoff</code> — un messaggio ogni trenta secondi.',
        '<code>/followers 10m</code> e <code>/followersoff</code> — chat ai soli follower da almeno dieci minuti. Il tempo minimo è la parte importante.',
        '<code>/subscribers</code> e <code>/subscribersoff</code> — chat ai soli abbonati.',
        '<code>/emoteonly</code> e <code>/emoteonlyoff</code> — solo emote. Ferma qualunque messaggio di testo, quindi anche un hate-raid.',
        '<code>/announce messaggio</code> — un annuncio evidenziato. Esistono anche <code>/announceblue</code>, <code>/announcegreen</code>, <code>/announceorange</code> e <code>/announcepurple</code>.',
        '<code>/shoutout nome</code> — lo shoutout ufficiale, che compare come elemento a schermo e non come semplice messaggio.',
        '<code>/raid nome</code> e <code>/unraid</code> — manda i tuoi spettatori su un altro canale a fine diretta.',
        '<code>/marker nota</code> — piazza un segnaposto nel VOD, per ritrovare il momento quando monti le clip.',
        '<code>/commercial 90</code> — lancia una pubblicità di novanta secondi.',
      ] },
      { h2: 'I comandi personalizzati', p: [
        'Sono quelli che crei tu con un bot: <code>!discord</code>, <code>!social</code>, <code>!pc</code>, <code>!comandi</code>. Il bot li riconosce in chat e risponde col testo che hai salvato.',
        'Quasi tutti i bot supportano delle <strong>variabili</strong> dentro la risposta, e sono la differenza fra un comando utile e un messaggio fisso.',
      ], ul: [
        '<strong>Chi ha scritto</strong>: per rispondere chiamando la persona per nome.',
        '<strong>Il bersaglio</strong>: quello che viene scritto dopo il comando, per cose come <code>!abbraccio @tizio</code>.',
        '<strong>Un contatore</strong>: quante volte è stato usato. È così che si fanno i classici <code>!morti</code> o <code>!cadute</code>.',
        '<strong>Data e ora</strong>: per i countdown e i "manca tanto a".',
      ] },
      { h2: 'Permessi e attesa: i due campi che nessuno compila', p: [
        'Ogni comando ha due impostazioni che quasi tutti lasciano al valore predefinito e poi rimpiangono.',
        'Il <strong>permesso</strong> decide chi può usarlo: tutti, solo i follower, solo gli abbonati, solo i moderatori. Un comando che lancia un effetto a schermo aperto a tutti diventa un giocattolo per chi passa a fare dispetti.',
        'L\'<strong>attesa</strong> (o cooldown) è quanti secondi devono passare prima che il comando si possa rifare. Senza, basta una persona annoiata per riempire la chat di risposte identiche. Trenta secondi vanno bene per quasi tutto.',
      ] },
      { h2: 'Tre errori comuni', ul: [
        '<strong>Troppi comandi.</strong> Se ne hai quaranta, nessuno li ricorda. Cinque o sei usati davvero valgono più di una lista che nessuno legge. Tienine uno, <code>!comandi</code>, che elenca gli altri.',
        '<strong>Timer troppo frequenti.</strong> Un messaggio automatico ogni cinque minuti insegna alla chat a ignorare il bot, e dopo un po\' anche te.',
        '<strong>Nomi lunghi.</strong> <code>!socialnetwork</code> non lo scrive nessuno. <code>!social</code> sì.',
      ] },
      { h2: 'Comandi a voce', p: [
        'Alcuni bot, SocialBot compreso, permettono di pilotare il canale parlando mentre giochi: cambiare titolo e categoria, lanciare un annuncio, fare uno shoutout, aprire un sondaggio. Il vantaggio non è la novità: è che non devi togliere le mani dal gioco per cambiare la categoria quando cambi gioco — cosa che, senza, ci si dimentica quasi sempre di fare.',
      ] },
    ],
    faq: [
      { d: 'Come si crea un comando personalizzato su Twitch?', r: 'I comandi personalizzati non esistono nativamente su Twitch: servono con un bot. Nel pannello del bot si aggiunge il nome del comando (per esempio !discord), il testo della risposta, chi può usarlo e ogni quanti secondi si può ripetere.' },
      { d: 'Qual è il comando per rendere qualcuno moderatore?', r: 'Si scrive /mod seguito dal nome utente, direttamente nella chat del proprio canale. Per togliere il ruolo si usa /unmod nome.' },
      { d: 'Come si blocca la chat a chi non segue il canale?', r: 'Con /followers, che si può accompagnare a un tempo minimo: /followers 10m ammette solo chi segue da almeno dieci minuti. Si riapre con /followersoff. Il tempo minimo è la parte che conta contro gli attacchi.' },
      { d: 'Quanti comandi conviene avere?', r: 'Pochi e usati. Cinque o sei comandi che la chat ricorda valgono più di quaranta che nessuno scrive. Conviene averne uno che elenca gli altri.' },
    ],
  },

  {
    slug: 'overlay-obs-per-twitch',
    titolo: 'Overlay per OBS su Twitch: alert, chat a schermo e widget',
    h1: 'Overlay per OBS: come si mettono e cosa serve davvero',
    desc: 'Alert, chat a schermo e widget in OBS con una sorgente browser: come si aggiungono, cosa serve davvero e cosa appesantisce e basta lo stream.',
    aggiornata: '2026-08-27',
    tipo: 'howto',
    corpo: [
      { p: [
        'Un overlay è una pagina web trasparente che OBS disegna sopra il gioco. Non è un file da scaricare né un plugin da installare: è un indirizzo che incolli in una sorgente browser. Capito questo, tutto il resto viene da sé.',
      ] },
      { h2: 'Come si aggiunge, in concreto', passi: [
        { t: 'Copia l\'indirizzo dell\'overlay', d: 'Il servizio che usi te ne dà uno, personale. Trattalo come una password: chi ce l\'ha può far comparire cose sul tuo stream.' },
        { t: 'In OBS aggiungi una sorgente "Browser"', d: 'Nel riquadro Sorgenti, il più (+), poi Browser. Dalle un nome che riconoscerai fra sei mesi.' },
        { t: 'Incolla l\'URL e imposta la dimensione', d: 'Larghezza e altezza vanno messe uguali alla risoluzione della scena, tipicamente 1920 per 1080. Se metti valori più piccoli e poi ingrandisci la sorgente trascinandola, l\'overlay diventa sfocato.' },
        { t: 'Lascia lo sfondo trasparente', d: 'Non aggiungere un colore di sfondo e non usare un filtro chroma key: gli overlay sono già trasparenti. Il chroma key serve solo per la webcam senza green screen fisico.' },
        { t: 'Spunta "Spegni la sorgente quando non è visibile"', d: 'Così l\'overlay non consuma risorse nelle scene dove non c\'è. Su un PC che fatica si sente.' },
        { t: 'Prova prima di andare live', d: 'Quasi tutti i pannelli hanno un pulsante per lanciare un alert di prova. Fallo, e guarda che non copra il mirino o la minimappa del gioco che stai giocando.' },
      ] },
      { h2: 'Gli overlay che servono davvero', ul: [
        '<strong>Alert di follow, sub, bit e raid.</strong> Il più utile: dice a chi arriva che qualcuno ha fatto qualcosa, e a te che devi ringraziare.',
        '<strong>Chat a schermo.</strong> Serve soprattutto per il VOD e per le clip: chi guarda la registrazione non vede la chat, e senza si perde metà di quello che succedeva.',
        '<strong>Obiettivi e contatori.</strong> Un obiettivo follower visibile funziona, se è realistico. Uno fermo a metà da tre mesi comunica il contrario di quello che vorresti.',
        '<strong>Segnaposto "torno subito"</strong> con un timer. Banale, ma trattiene la gente molto più di uno schermo nero.',
      ] },
      { h2: 'Quelli che appesantiscono e basta', p: [
        'Ogni sorgente browser è una pagina web che gira: costa CPU e memoria mentre stai codificando video. Cinque overlay animati che nessuno guarda sono cinque pagine che rubano risorse al gioco.',
        'La regola pratica: se una cosa a schermo non è cambiata nelle ultime due ore di diretta e nessuno l\'ha mai nominata in chat, toglila.',
      ] },
      { h2: 'Se l\'overlay non compare', ul: [
        '<strong>Schermo nero</strong>: quasi sempre l\'URL è sbagliato o scaduto. Aprilo nel browser: se non si vede niente nemmeno lì, il problema è l\'indirizzo.',
        '<strong>Si vede ma non parte mai un alert</strong>: controlla che il servizio sia ancora collegato al tuo account Twitch. I permessi scadono se cambi la password.',
        '<strong>Si vede sfocato</strong>: la sorgente è più piccola della scena ed è stata ingrandita trascinandola. Rimetti la dimensione giusta nelle proprietà e non ridimensionarla a mano.',
        '<strong>L\'audio degli alert non si sente in diretta</strong>: in OBS, nel mixer audio, l\'audio della sorgente browser va instradato allo stream. Se lo senti tu ma non chi guarda, è quello.',
      ] },
      { h2: 'Trasmettere senza OBS', p: [
        'Vale la pena saperlo: da qualche tempo si può andare in diretta direttamente dal browser, senza installare niente. Non sostituisce OBS per una configurazione seria con più scene e più fonti, ma per una diretta veloce — una chiacchierata, una prova, un rientro al volo da un altro computer — toglie di mezzo tutto il resto.',
      ] },
    ],
    faq: [
      { d: 'Come si aggiunge un overlay a OBS?', r: 'Si aggiunge una sorgente di tipo Browser, si incolla l\'indirizzo dell\'overlay e si impostano larghezza e altezza uguali alla risoluzione della scena, di solito 1920x1080. Lo sfondo resta trasparente: non serve alcun chroma key.' },
      { d: 'Gli overlay per Twitch sono gratis?', r: 'Molti sì. I servizi principali includono alert e widget di base senza costi; si paga in genere per i temi elaborati o per le funzioni avanzate. SocialBot include gli overlay nelle funzioni gratuite.' },
      { d: 'Perché il mio overlay è sfocato in OBS?', r: 'Perché la sorgente browser è stata creata più piccola della scena e poi ingrandita trascinandola. Va impostata alla risoluzione della scena nelle proprietà della sorgente, non ridimensionata a mano nell\'anteprima.' },
      { d: 'Gli overlay rallentano lo stream?', r: 'Ognuno è una pagina web che gira mentre codifichi video, quindi sì, un po\'. Su un PC al limite conviene tenere solo quelli che si usano davvero e spuntare l\'opzione che spegne la sorgente quando non è visibile.' },
    ],
  },
];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ESC[c]);

// Il testo delle guide contiene marcatura voluta (<strong>, <code>, <a href>),
// quindi non si sfugge: si controlla invece che non entri niente di eseguibile.
const SICURI = /<\/?(strong|em|code|a|br)\b[^>]*>/gi;
function testo(s) {
  const senzaBuoni = String(s).replace(SICURI, '');
  if (/<|javascript:/i.test(senzaBuoni)) throw new Error('guida: marcatura non prevista nel testo');
  return String(s);
}

const CSS = `
:root{color-scheme:light;--bg:#fafafa;--surface:#fff;--surface-2:#f4f4f5;--border:#ececee;--border-2:#dedee2;--testo:#18181b;--testo-2:#55555f;--testo-3:#9a9aa4;--acc:#6d3bef;--acc-soft:#f2eefe;--acc-bordo:#ddd2fb}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#0d0d0f;--surface:#151518;--surface-2:#1c1c20;--border:#26262b;--border-2:#34343a;--testo:#f4f4f5;--testo-2:#a8a8b3;--testo-3:#71717a;--acc:#a78bfa;--acc-soft:#1e1730;--acc-bordo:#3b2f66}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--testo);font:16px/1.7 Archivo,system-ui,-apple-system,'Segoe UI',sans-serif;font-synthesis-weight:none}
.g-testata{border-bottom:1px solid var(--border);background:var(--surface)}
.g-testata div{max-width:760px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.g-marchio{display:flex;align-items:center;text-decoration:none}
.g-marchio img{display:block;height:30px;width:auto}
.g-testata nav{margin-left:auto;display:flex;gap:16px;font-size:.9rem}
.g-testata nav a{color:var(--testo-2);text-decoration:none}
.g-testata nav a:hover{color:var(--acc)}
.g-tab{overflow-x:auto;margin:14px 0}
.g-tab table{border-collapse:collapse;width:100%;font-size:.92rem}
.g-tab th,.g-tab td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);vertical-align:top}
.g-tab th{color:var(--testo-2);font-weight:600;white-space:nowrap;border-bottom-color:var(--border-2)}
.g-tab td:first-child{white-space:nowrap;color:var(--testo)}
.g-esempio{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;overflow-x:auto;font:.88rem/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;margin:14px 0}
.g-indice{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin:22px 0}
.g-indice b{display:block;font-size:.82rem;text-transform:uppercase;letter-spacing:.06em;color:var(--testo-3);margin-bottom:8px}
.g-indice ol{margin:0;padding-left:20px;columns:2;column-gap:26px}
.g-indice li{margin:3px 0;break-inside:avoid}
.g-indice a{color:var(--testo-2);text-decoration:none}
.g-indice a:hover{color:var(--acc)}
@media(max-width:620px){.g-indice ol{columns:1}}
h3{font-size:1rem;margin:20px 0 6px}
.g-novita{margin:26px 0}
.g-novita h2{font-size:1.05rem;color:var(--testo-2);font-weight:600;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.g-novita ul{margin:0;padding-left:20px}
.g-novita li{margin:7px 0}
main{max-width:760px;margin:0 auto;padding:34px 20px 60px}
.g-briciole{font-size:.84rem;color:var(--testo-3);margin:0 0 18px}
.g-briciole a{color:var(--testo-3)}
h1{font-size:clamp(1.75rem,4.4vw,2.5rem);line-height:1.18;letter-spacing:-.025em;margin:0 0 12px;text-wrap:balance}
h2{font-size:1.32rem;line-height:1.3;letter-spacing:-.015em;margin:38px 0 12px;text-wrap:balance}
h3{font-size:1.06rem;margin:26px 0 8px}
p{margin:0 0 15px;color:var(--testo-2)}
main>article>p:first-of-type{font-size:1.09rem;color:var(--testo)}
strong{color:var(--testo);font-weight:700}
a{color:var(--acc)}
code{background:var(--surface-2);border:1px solid var(--border);border-radius:5px;padding:.1em .38em;font-size:.88em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
ul,ol{margin:0 0 16px;padding-left:1.3em;color:var(--testo-2)}
li{margin:0 0 9px}
ol.g-passi{list-style:none;counter-reset:p;padding:0}
ol.g-passi li{counter-increment:p;position:relative;padding:0 0 0 44px;margin:0 0 20px}
ol.g-passi li::before{content:counter(p);position:absolute;left:0;top:1px;width:29px;height:29px;border-radius:50%;background:var(--acc-soft);border:1px solid var(--acc-bordo);color:var(--acc);font-weight:700;font-size:.88rem;display:grid;place-items:center}
ol.g-passi b{display:block;color:var(--testo);margin-bottom:3px}
.g-data{font-size:.84rem;color:var(--testo-3);margin:0 0 26px}
.g-faq{margin-top:44px;border-top:1px solid var(--border);padding-top:8px}
.g-faq details{border-bottom:1px solid var(--border);padding:14px 0}
.g-faq summary{cursor:pointer;font-weight:600;color:var(--testo);list-style:none}
.g-faq summary::-webkit-details-marker{display:none}
.g-faq summary::after{content:'+';float:right;color:var(--testo-3);font-weight:400}
.g-faq details[open] summary::after{content:'−'}
.g-faq p{margin:10px 0 0}
.g-altre{margin-top:44px;border-top:1px solid var(--border);padding-top:24px}
.g-altre ul{list-style:none;padding:0}
.g-altre a{font-weight:600;text-decoration:none}
.g-altre a:hover{text-decoration:underline}
.g-altre small{display:block;color:var(--testo-3);font-weight:400}
.g-invito{margin-top:44px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px 24px}
.g-invito h2{margin-top:0}
.g-cta{display:inline-block;margin-top:6px;background:var(--acc);color:#fff;text-decoration:none;font-weight:600;padding:.62rem 1.15rem;border-radius:999px}
.g-piede{border-top:1px solid var(--border);margin-top:50px;background:var(--surface)}
.g-piede div{max-width:760px;margin:0 auto;padding:20px;font-size:.85rem;color:var(--testo-3);display:flex;gap:16px;flex-wrap:wrap}
.g-piede a{color:var(--testo-3)}
.g-elenco{list-style:none;padding:0}
.g-elenco li{border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:18px 20px;margin:0 0 12px}
.g-elenco h2{margin:0 0 6px;font-size:1.14rem}
.g-elenco h2 a{text-decoration:none}
.g-elenco p{margin:0}
`.replace(/\n/g, '');

function testata(attiva) {
  return `<header class="g-testata"><div>
<a class="g-marchio" href="/"><img src="/icons/logo-barra.png?v=5" alt="SocialBot" width="80" height="30"></a>
<nav><a href="/guide"${attiva === 'indice' ? ' aria-current="page"' : ''}>Guide</a><a href="/manuale"${attiva === 'manuali' ? ' aria-current="page"' : ''}>Manuali</a><a href="/novita"${attiva === 'novita' ? ' aria-current="page"' : ''}>Novità</a><a href="/">Il bot</a></nav>
</div></header>`;
}

function piede() {
  return `<footer class="g-piede"><div>
<span>© 2024–2026 Andrea Taliento (ANDRYXify)</span>
<a href="/">socialbot.live</a><a href="/privacy">Privacy</a><a href="/termini">Termini</a>
</div></footer>`;
}

// L'ancora di una sezione: si ricava dal titolo, così l'indice e i titoli non
// possono divergere (e un collegamento a una sezione resta valido).
function ancora(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function corpoHtml(corpo) {
  let h = '';
  for (const b of corpo) {
    if (b.h2) h += `<h2 id="${ancora(b.h2)}">${esc(b.h2)}</h2>`;
    if (b.h3) h += `<h3>${esc(b.h3)}</h3>`;
    if (b.p) for (const p of b.p) h += `<p>${testo(p)}</p>`;
    if (b.ul) h += `<ul>${b.ul.map((x) => `<li>${testo(x)}</li>`).join('')}</ul>`;
    if (b.passi) h += `<ol class="g-passi">${b.passi.map((s) => `<li><b>${esc(s.t)}</b>${testo(s.d)}</li>`).join('')}</ol>`;
    if (b.tabella) {
      const [testa, ...righe] = b.tabella;
      h += `<div class="g-tab"><table><thead><tr>${testa.map((c) => `<th>${testo(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${righe.map((r) => `<tr>${r.map((c) => `<td>${testo(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (b.esempio) h += `<pre class="g-esempio">${esc(b.esempio)}</pre>`;
  }
  return h;
}

// L'indice si ricava dai titoli del corpo: una sezione nuova ci finisce da sé.
function indiceHtml(corpo) {
  const voci = corpo.filter((b) => b.h2).map((b) => b.h2);
  if (voci.length < 4) return '';
  return `<nav class="g-indice"><b>In questa pagina</b><ol>${voci.map((v) =>
    `<li><a href="#${ancora(v)}">${esc(v)}</a></li>`).join('')}</ol></nav>`;
}

function faqHtml(faq) {
  if (!faq?.length) return '';
  return `<section class="g-faq"><h2>Domande frequenti</h2>${faq.map((f) =>
    `<details><summary>${esc(f.d)}</summary><p>${testo(f.r)}</p></details>`).join('')}</section>`;
}

function altreHtml(slug) {
  const altre = GUIDE.filter((g) => g.slug !== slug).slice(0, 4);
  if (!altre.length) return '';
  return `<section class="g-altre"><h2>Altre guide</h2><ul>${altre.map((g) =>
    `<li><a href="/guide/${g.slug}">${esc(g.h1)}</a><small>${esc(g.desc.slice(0, 110))}…</small></li>`).join('')}</ul></section>`;
}

function datiStrutturati(g) {
  const url = `${SITO}/guide/${g.slug}`;
  const blocchi = [{
    '@context': 'https://schema.org',
    '@type': g.tipo === 'howto' ? 'HowTo' : 'Article',
    headline: g.h1,
    name: g.h1,
    description: g.desc,
    inLanguage: 'it-IT',
    datePublished: g.aggiornata,
    dateModified: g.aggiornata,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: 'Andrea Taliento' },
    publisher: { '@type': 'Organization', name: 'SocialBot', url: SITO },
  }];
  if (g.tipo === 'howto') {
    const passi = g.corpo.flatMap((b) => b.passi || []);
    if (passi.length) blocchi[0].step = passi.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1, name: s.t,
      text: String(s.d).replace(/<[^>]*>/g, ''),
    }));
  }
  blocchi.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SocialBot', item: SITO },
      { '@type': 'ListItem', position: 2, name: 'Guide', item: `${SITO}/guide` },
      { '@type': 'ListItem', position: 3, name: g.h1, item: url },
    ],
  });
  if (g.faq?.length) blocchi.push({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: g.faq.map((f) => ({
      '@type': 'Question', name: f.d,
      acceptedAnswer: { '@type': 'Answer', text: String(f.r).replace(/<[^>]*>/g, '') },
    })),
  });
  return blocchi.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('');
}

function scheletro({ titolo, desc, url, corpo, ld }) {
  return `<!doctype html><html lang="it"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="article"><meta property="og:site_name" content="SocialBot">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(titolo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITO}/icons/og-guide.png?v=5">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="Guide di SocialBot su Twitch, bot e overlay">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(titolo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITO}/icons/og-guide.png?v=5">
<link rel="icon" href="/icons/icon-192.png?v=5">
<link rel="stylesheet" href="/font.css">
<style>${CSS}</style>
${ld}
</head><body>${corpo}</body></html>`;
}

export function paginaGuida(slug) {
  const g = GUIDE.find((x) => x.slug === slug);
  if (!g) return null;
  const url = `${SITO}/guide/${g.slug}`;
  const corpo = `${testata()}
<main><p class="g-briciole"><a href="/">SocialBot</a> › <a href="/guide">Guide</a> › ${esc(g.h1)}</p>
<article><h1>${esc(g.h1)}</h1>
<p class="g-data">Aggiornata il ${new Date(g.aggiornata).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
${corpoHtml(g.corpo)}</article>
${faqHtml(g.faq)}
<section class="g-invito"><h2>Il bot di cui parla questa guida</h2>
<p>SocialBot scrive in chat con il tuo account: comandi su misura, overlay per OBS, clip, notifiche live e uno scudo anti-bot che si alza da solo quando serve. Gratis, con una demo da provare senza collegare niente.</p>
<a class="g-cta" href="/">Provalo</a></section>
${altreHtml(g.slug)}
</main>${piede()}`;
  return scheletro({ titolo: g.titolo, desc: g.desc, url, corpo, ld: datiStrutturati(g) });
}

// Il guscio di una pagina di documentazione: la stessa forma delle guide, ma con
// l'indice ricavato dai titoli. Serve ai manuali, che vivono in manuali.js.
export function paginaDoc(d) {
  const url = `${SITO}/manuale/${d.slug}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'TechArticle',
    headline: d.h1, name: d.h1, description: d.desc, inLanguage: 'it-IT',
    datePublished: d.aggiornata, dateModified: d.aggiornata,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: 'Andrea Taliento' },
    publisher: { '@type': 'Organization', name: 'SocialBot', url: SITO },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SocialBot', item: SITO },
      { '@type': 'ListItem', position: 2, name: 'Manuali', item: `${SITO}/manuale` },
      { '@type': 'ListItem', position: 3, name: d.h1, item: url },
    ],
  }];
  const corpo = `${testata('manuali')}
<main><p class="g-briciole"><a href="/">SocialBot</a> › <a href="/manuale">Manuali</a> › ${esc(d.h1)}</p>
<article><h1>${esc(d.h1)}</h1>
<p class="g-data">Aggiornato il ${new Date(d.aggiornata).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
${indiceHtml(d.corpo)}
${corpoHtml(d.corpo)}</article>
${faqHtml(d.faq)}
</main>${piede()}`;
  return scheletro({ titolo: d.titolo, desc: d.desc, url, corpo,
    ld: ld.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('') });
}

// L'indice dei manuali.
export function paginaManuali(manuali) {
  const url = `${SITO}/manuale`;
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Manuali di SocialBot', url, inLanguage: 'it-IT',
    hasPart: manuali.map((m) => ({ '@type': 'TechArticle', headline: m.h1, url: `${SITO}/manuale/${m.slug}` })),
  })}</script>`;
  const corpo = `${testata('manuali')}
<main><p class="g-briciole"><a href="/">SocialBot</a> › Manuali</p>
<h1>Manuali</h1>
<p>Cosa fa cosa, e come. Non è una presentazione: è il materiale da tenere aperto accanto mentre configuri.</p>
<ul class="g-elenco">${manuali.map((m) =>
    `<li><h2><a href="/manuale/${m.slug}">${esc(m.h1)}</a></h2><p>${esc(m.desc)}</p></li>`).join('')}</ul>
</main>${piede()}`;
  return scheletro({ titolo: 'Manuali di SocialBot: giochi, monete e moduli | SocialBot',
    desc: 'I manuali di SocialBot: le monete e i giochi della chat, e i moduli — inneschi, condizioni, azioni e variabili, uno per uno.',
    url, corpo, ld });
}

export function paginaNovita(gruppi) {
  const url = `${SITO}/novita`;
  const ultima = gruppi[0]?.data || new Date().toISOString().slice(0, 10);
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Novità di SocialBot', url, inLanguage: 'it-IT', dateModified: ultima,
    description: 'Cosa è cambiato nel bot, in ordine di tempo.',
    publisher: { '@type': 'Organization', name: 'SocialBot', url: SITO },
  })}</script>`;
  const corpo = `${testata('novita')}
<main><p class="g-briciole"><a href="/">SocialBot</a> › Novità</p>
<h1>Novità</h1>
<p>Cosa è cambiato nel bot, in ordine di tempo. Una riga per cosa: se non si vede da fuori, qui non c'è.</p>
${gruppi.map((g) => `<section class="g-novita"><h2>${esc(dataItaliana(g.data))}</h2><ul>${
    g.voci.map((v) => `<li>${testo(v)}</li>`).join('')}</ul></section>`).join('')}
</main>${piede()}`;
  return scheletro({
    titolo: 'Novità di SocialBot: cosa è cambiato | SocialBot',
    desc: 'Le novità del bot per Twitch e Kick, in ordine di tempo: comandi, giochi a punti, overlay, moderazione e correzioni.',
    url, corpo, ld,
  });
}

function dataItaliana(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString('it-IT',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function paginaIndice() {
  const url = `${SITO}/guide`;
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Guide su Twitch, bot e overlay', url, inLanguage: 'it-IT',
    hasPart: GUIDE.map((g) => ({ '@type': 'Article', headline: g.h1, url: `${SITO}/guide/${g.slug}` })),
  })}</script>`;
  const corpo = `${testata('indice')}
<main><h1>Guide</h1>
<p>Come si usa Twitch dal lato di chi trasmette: bot, comandi, overlay e difesa del canale. Scritte per essere lette una volta e risolvere la cosa, senza giri.</p>
<ul class="g-elenco">${GUIDE.map((g) =>
    `<li><h2><a href="/guide/${g.slug}">${esc(g.h1)}</a></h2><p>${esc(g.desc)}</p></li>`).join('')}</ul>
</main>${piede()}`;
  return scheletro({ titolo: 'Guide su Twitch: bot, comandi, overlay e difesa del canale | SocialBot', desc: 'Guide pratiche per chi trasmette su Twitch: scegliere un bot, collegarlo, creare comandi, mettere gli overlay in OBS e difendersi da follow-bot e hate-raid.', url, corpo, ld });
}

// Le voci per la sitemap: una sola fonte, così una guida nuova ci finisce da sé.
export function urlGuide(novita = []) {
  return [
    { loc: `${SITO}/guide`, lastmod: GUIDE.map((g) => g.aggiornata).sort().pop(), freq: 'weekly', prio: '0.8' },
    ...GUIDE.map((g) => ({ loc: `${SITO}/guide/${g.slug}`, lastmod: g.aggiornata, freq: 'monthly', prio: '0.7' })),
    ...(novita.length ? [{ loc: `${SITO}/novita`, lastmod: novita[0].data, freq: 'weekly', prio: '0.6' }] : []),
  ];
}
