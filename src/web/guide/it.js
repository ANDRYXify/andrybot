// Le guide in italiano. La forma di ogni voce e il perche' delle guide stanno
// in src/web/guide.js; il modello delle lingue in docs/LINGUE.md.
import { DENTRO } from './comune.js';

export const GUIDE_IT = [
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
    schede: ['stato'],
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
      { h2: DENTRO.it, p: [
        'Qui il collegamento è già fatto: sei entrato con Twitch, quindi il bot ha i tuoi permessi e scrive col tuo account. Quello che resta è nella scheda <strong>Stato</strong>.',
      ], passi: [
        { t: 'Accendi il bot. ', d: 'L\'interruttore <em>Il tuo bot</em> è quello che lo fa entrare in chat. Spegnendolo resta tutto configurato: smette solo di parlare.' },
        { t: 'Guarda i permessi. ', d: 'Se ne manca uno — moderazione, clip, VIP, categoria — la scheda te lo dice e ti dà il pulsante per concederlo. Nessun errore silenzioso: o c\'è o te lo scrive.' },
        { t: 'Scegli quando sta in chat. ', d: 'Sempre, oppure solo mentre sei in diretta. Se trasmetti a orari fissi, «solo in diretta» tiene la chat pulita quando non ci sei.' },
        { t: 'Poi vai su Comandi. ', d: 'Il primo comando si scrive in due campi: nome e risposta. Da lì in poi c\'è il <a href="/manuale/moduli">manuale dei moduli</a>.' },
      ] },
    ],
    faq: [
      { d: 'Quanto ci vuole a mettere un bot su Twitch?', r: 'Cinque minuti: accedi con Twitch, autorizzi i permessi, e se il bot usa un account proprio lo rendi moderatore con /mod nomedelbot. Configurare comandi e timer richiede altri dieci minuti.' },
      { d: 'Devo creare un secondo account Twitch per il bot?', r: 'Di solito no: i bot in cloud usano un proprio account condiviso, oppure agiscono con il tuo. Un secondo account serve solo se vuoi far girare un bot self-hosted con un\'identità dedicata.' },
      { d: 'Il bot funziona anche quando sono offline?', r: 'Sì, la chat di Twitch resta aperta anche a canale spento e il bot continua a rispondere ai comandi. I messaggi a tempo invece è meglio tenerli in diretta: su SocialBot un modulo a tempo parla solo mentre trasmetti, a meno che tu non gli dica il contrario.' },
      { d: 'Perché il bot non risponde ai comandi?', r: 'Le tre cause più comuni: non è moderatore del canale (se scrive con un account suo), i permessi sono scaduti perché hai cambiato password su Twitch, oppure il comando è salvato con un prefisso diverso da quello che stai scrivendo.' },
    ],
  },

  {
    slug: 'follow-bot-e-hate-raid',
    schede: ['regole'],
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
      { h2: DENTRO.it, p: [
        'Lo scudo non si configura a soglie: sta nella scheda <strong>Moderazione</strong> e o è acceso o non lo è.',
      ], passi: [
        { t: 'Accendi lo scudo anti-bot. ', d: 'Riconosce i nomi dei follow-bot noti da una lista che si aggiorna da sola, e ferma le raffiche di follow senza che tu debba dire quante al minuto sono troppe.' },
        { t: 'Metti in attesa gli account appena creati. ', d: 'I loro messaggi li vedete solo tu e i moderatori finché non è tutto in chiaro. È la misura che spegne una hate-raid prima che si veda in chat.' },
        { t: 'Lascia che avvisi invece di cacciare. ', d: 'Nel dubbio segnala a te e ai mod, non butta fuori: un fan vero che si è appena iscritto non deve pagare per un attacco.' },
        { t: 'Guarda il registro. ', d: 'Nella stessa scheda trovi cosa ha fermato e perché, e puoi ribaltare una decisione con un clic.' },
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
    schede: ['moduli'],
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
      { h2: DENTRO.it, p: [
        'I comandi stanno nella scheda <strong>Comandi</strong>, e ci sono due modi a seconda di quanto ti serve.',
      ], passi: [
        { t: 'Il modo veloce. ', d: '<em>Comando rapido</em>: scrivi il nome e cosa deve rispondere. Fatto — niente altro da compilare.' },
        { t: 'Il modo completo. ', d: 'QUANDO succede qualcosa, SE valgono certe condizioni, ALLORA il bot fa: comando, parola, evento, timer, o la tua voce. Tutto spiegato nel <a href="/manuale/moduli">manuale dei moduli</a>.' },
        { t: 'Le variabili. ', d: 'Nei testi puoi usare chi ha scritto, il nome dopo il comando, l\'uptime, la categoria, le monete, un numero a caso: si scrivono con il dollaro e il pannello te le elenca tutte.' },
        { t: 'Quello che ti sei costruito vince. ', d: 'Se fai un comando con lo stesso nome di uno pronto, il tuo ha la precedenza. Non devi disattivare niente.' },
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
    schede: ['alert', 'effetti'],
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
      { h2: DENTRO.it, p: [
        'L\'overlay si prepara nella scheda <strong>Overlay Studio</strong> e si vede subito mentre lo cambi: non serve ricaricare OBS a ogni ritocco.',
      'Gli elementi che puoi mettere sono sette: alert degli eventi, chat a schermo, ultimo follower, ultimo sub, <strong>obiettivo</strong> (una barra che si riempie da sola mentre arrivano follower, sub o bit), <strong>contatori</strong> (morti, tentativi, quello che vuoi) ed effetti. Ognuno si accende, si sposta e si veste dallo stesso posto.',
      ], passi: [
        { t: 'Copia il link e mettilo in OBS. ', d: 'Sorgente <em>Browser</em>, incolli il link, 1920×1080. È l\'unica cosa che si fa dentro OBS.' },
        { t: 'Componi quello che si vede. ', d: 'Alert di follow, sub, bit e raid — con immagini, video, suoni e green screen — chat a schermo, widget ed emote 7TV. Posizione, dimensione e rotazione si trascinano.' },
        { t: 'Più overlay, più link. ', d: 'Puoi averne più di uno, ognuno col suo link: uno per la scena «gioco», uno per la pausa, uno per il talk.' },
        { t: 'Gli effetti sono un\'altra scheda. ', d: 'In <strong>Effetti &amp; suoni</strong> costruisci i comandi che fanno partire qualcosa a schermo, e li leghi ai punti canale o alle monete.' },
      ] },
    ],
    faq: [
      { d: 'Come si aggiunge un overlay a OBS?', r: 'Si aggiunge una sorgente di tipo Browser, si incolla l\'indirizzo dell\'overlay e si impostano larghezza e altezza uguali alla risoluzione della scena, di solito 1920x1080. Lo sfondo resta trasparente: non serve alcun chroma key.' },
      { d: 'Gli overlay per Twitch sono gratis?', r: 'Molti sì. I servizi principali includono alert e widget di base senza costi; si paga in genere per i temi elaborati o per le funzioni avanzate. SocialBot include gli overlay nelle funzioni gratuite.' },
      { d: 'Perché il mio overlay è sfocato in OBS?', r: 'Perché la sorgente browser è stata creata più piccola della scena e poi ingrandita trascinandola. Va impostata alla risoluzione della scena nelle proprietà della sorgente, non ridimensionata a mano nell\'anteprima.' },
      { d: 'Gli overlay rallentano lo stream?', r: 'Ognuno è una pagina web che gira mentre codifichi video, quindi sì, un po\'. Su un PC al limite conviene tenere solo quelli che si usano davvero e spuntare l\'opzione che spegne la sorgente quando non è visibile.' },
    ],
  },

  {
    slug: 'bot-per-kick-italiano',
    schede: ['stato'],
    titolo: 'Bot per Kick in italiano: cosa c\'è e cosa cambia da Twitch',
    h1: 'Bot per Kick: cosa c\'è, e cosa cambia da Twitch',
    desc: 'Su Kick l\'API ufficiale c\'è, ma funziona in modo diverso da quella di Twitch — e si vede. Quali bot ci sono davvero, cosa sanno fare e cosa no.',
    aggiornata: '2026-09-06',
    tipo: 'articolo',
    corpo: [
      { p: [
        'Se arrivi da Twitch e cerchi il tuo bot su Kick, la prima cosa che noti è che non c\'è. Nightbot su Kick non esiste. StreamElements sì, ma non è lo stesso prodotto. Non è pigrizia di chi li fa: è che Kick, tecnicamente, funziona in un altro modo.',
        'Vale la pena capire quale, perché spiega quasi tutte le differenze che troverai.',
      ] },
      { h2: 'L\'API ufficiale c\'è', p: [
        'Kick ha una API pubblica documentata e un accesso con OAuth: si autorizza un\'applicazione dal proprio account, si concedono permessi precisi, e li si può revocare. Da lì si legge il canale, si scrive in chat, si ricevono gli eventi e — con un permesso a parte — si modera.',
        'Quindi la domanda «i bot su Kick sono sicuri?» ha la stessa risposta che su Twitch: dipende da cosa chiedono. Un servizio che ti chiede la password di Kick dentro il suo sito non sta usando l\'API ufficiale, e va chiuso.',
      ] },
      { h2: 'La differenza che si sente: i messaggi arrivano al contrario', p: [
        'Su Twitch un bot si collega alla chat e resta in ascolto: è il bot che va a prendersi i messaggi. Su Kick la strada ufficiale è rovesciata — è Kick che li manda, con un <strong>webhook</strong>: il bot deve avere un indirizzo pubblico raggiungibile da internet, dichiararlo nell\'account sviluppatore, e chiedere il permesso di iscriversi agli eventi.',
        'Da qui discendono quasi tutte le differenze pratiche. Un bot che gira sul tuo computer su Twitch funziona; su Kick, con la strada ufficiale, non basta più, perché il tuo computer non ha un indirizzo pubblico. Per questo su Kick trovi quasi solo servizi in cloud.',
        'E per questo un bot su Kick va sempre collegato dal sito del servizio: non c\'è un equivalente del «rendilo moderatore e sei a posto».',
      ] },
      { h2: 'Quali bot ci sono davvero', ul: [
        '<strong>Nightbot</strong>: non c\'è. Non è annunciato.',
        '<strong>StreamElements</strong>: c\'è, con comandi e alert. La parte di moderazione è più magra di quella su Twitch. Se ti aspetti la parità, resterai deluso.',
        '<strong>Fossabot</strong>: supporta Kick, e la sua forza — la moderazione — si porta dietro.',
        '<strong>Botrix</strong> e <strong>Botisimo</strong>: nati o cresciuti su Kick, sono la cosa più vicina a un Nightbot per quella piattaforma.',
        '<strong>SocialBot</strong>: scrive con il tuo account, come su Twitch.',
      ] },
      { h2: 'Cosa non aspettarti', p: [
        'La parità con Twitch, oggi, non c\'è per nessuno. Twitch ha quindici anni di API e un ecosistema che ci si è appoggiato sopra; l\'API pubblica di Kick è recente, e alcune cose che su Twitch dai per scontate lì non ci sono ancora o funzionano in modo diverso.',
        'La conseguenza pratica: se stai su tutte e due, tieni le aspettative sul minimo comune. Comandi, timer e avvisi funzionano bene ovunque. Le difese automatiche più fini, no — e non perché il bot sia peggiore, ma perché la piattaforma espone meno.',
      ] },
      { h2: 'Se stai su Twitch e Kick insieme', p: [
        'Il caso più comune è trasmettere su entrambe, o spostarsi. Due consigli che valgono a prescindere dal bot che scegli.',
      ], ul: [
        '<strong>Tieni i comandi in un posto solo.</strong> Due elenchi separati divergono in una settimana, e poi non sai più quale è quello buono.',
        '<strong>Non dare per scontato che la moderazione si comporti uguale.</strong> Prova un messaggio che dovrebbe essere bloccato, su entrambe, prima di fidarti.',
      ] },
      { h2: DENTRO.it, p: [
        'Kick si collega dalla scheda <a href="/#account">Il tuo account</a>, con lo stesso pulsante di Twitch.',
      ], passi: [
        { t: 'Apri la scheda «Il tuo account» e premi «Registrati con Kick»', d: 'Ti porta su Kick, non su un modulo dove scrivi la password qui. Se un servizio ti chiede la password di Kick dentro il suo sito, chiudi la pagina.' },
        { t: 'Leggi i quattro permessi di base', d: 'Sapere chi ha autorizzato, leggere titolo e stato della diretta, scrivere in chat, ricevere gli eventi. Sono il minimo perché il bot funzioni: con meno, ammutolisce.' },
        { t: 'Decidi se vuoi anche la moderazione', d: 'Bannare e cancellare messaggi sono <strong>due permessi a parte</strong>, chiesti solo se accendi la moderazione. Se non ti serve, il bot non li ha proprio — e lo puoi verificare tu dalle connessioni del tuo account Kick, invece di fidarti.' },
        { t: 'Controlla che gli eventi arrivino', d: 'Dopo il collegamento la scheda dice se l\'iscrizione agli eventi è riuscita. Da Kick riceviamo i messaggi di chat, i follow, gli abbonamenti (nuovi, rinnovi e regalati) e il cambio di stato della diretta.' },
        { t: 'Usa il bot come su Twitch', d: 'Comandi, avvisi e <a href="/guide/overlay-obs-per-twitch">overlay</a> funzionano allo stesso modo: quello che cambia è sotto, non nel pannello.' },
      ] },
    ],
    faq: [
      { d: 'Nightbot funziona su Kick?', r: 'No. Nightbot non è disponibile su Kick e non è stato annunciato. Su Kick trovi StreamElements, Fossabot, Botrix, Botisimo e SocialBot.' },
      { d: 'Perché su Kick ci sono meno bot che su Twitch?', r: 'Perché la strada ufficiale per ricevere i messaggi è a webhook: il bot deve avere un indirizzo pubblico raggiungibile da internet. Questo esclude quasi tutti i bot che girano sul computer dello streamer e lascia il campo ai servizi in cloud.' },
      { d: 'Un bot su Kick può bannare e mettere in timeout?', r: 'Sì, ma serve un permesso di moderazione concesso a parte, oltre a quelli di base. Se non lo concedi, il bot può scrivere e leggere ma non moderare.' },
      { d: 'Posso usare lo stesso bot su Twitch e Kick?', r: 'Sì, alcuni servizi coprono entrambe. Tieni conto che le funzioni non sono identiche: la moderazione automatica su Kick è in genere più semplice, perché la piattaforma espone meno.' },
      { d: 'Devo rendere il bot moderatore anche su Kick?', r: 'Dipende dal bot. Quelli che scrivono con un account proprio in genere sì. Un bot che agisce con il tuo account no, perché usa i permessi che gli hai concesso tu.' },
    ],
  },

  {
    slug: 'bot-moderazione-twitch',
    schede: ['regole'],
    titolo: 'Bot per moderare la chat di Twitch: cosa fa davvero | SocialBot',
    h1: 'Bot per moderare la chat di Twitch',
    desc: 'Twitch ha già AutoMod, chat solo follower e parole vietate. Cosa aggiunge davvero un bot, cosa conviene lasciare a Twitch, e come non cacciare le persone vere.',
    aggiornata: '2026-09-06',
    tipo: 'articolo',
    corpo: [
      { p: [
        'Prima di cercare un bot per moderare, vale la pena sapere cosa fa già Twitch da solo: parecchio. AutoMod filtra il linguaggio per categorie e livelli, puoi mettere una lista di termini bloccati, la chat solo per follower con un\'attesa minima, la modalità lenta, la chat solo per abbonati, e il blocco dei link.',
        'Se non hai acceso queste, accendile prima: sono gratis, non richiedono permessi a nessuno e coprono la maggior parte del rumore.',
        'Un bot serve per quello che rimane. Ed è meno di quello che pensi, ma è la parte che fa più male.',
      ] },
      { h2: 'Cosa aggiunge un bot, in concreto', ul: [
        '<strong>Regole che Twitch non ha</strong>: lo stesso messaggio ripetuto, i muri di TUTTO MAIUSCOLO, le raffiche di menzioni, il flood, i muri di simboli, i messaggi lunghissimi, le raffiche di emoji.',
        '<strong>Permessi per ruolo</strong>: i link li possono postare tutti, solo gli abbonati, solo i VIP, solo i mod. Twitch è più binario.',
        '<strong>Punizioni crescenti</strong>: il primo messaggio si cancella, al terzo scatta un timeout, e il timeout si allunga a chi insiste. Twitch non lo fa da solo.',
        '<strong>Difesa dai follow-bot e dagli hate-raid</strong>: è la cosa per cui un bot serve davvero, e ha una <a href="/guide/follow-bot-e-hate-raid">guida sua</a>.',
      ] },
      { h2: 'Cosa conviene lasciare a Twitch', p: [
        'AutoMod. È integrato, è addestrato sul linguaggio di Twitch e non consuma un permesso in più. Un bot che rifà AutoMod peggio non ti serve.',
        'Anche la chat solo per follower conviene lasciarla a Twitch: è istantanea e non dipende da nessun servizio esterno che potrebbe essere giù proprio mentre serve.',
      ] },
      { h2: 'L\'errore che fanno tutti: stringere troppo', p: [
        'La tentazione, dopo una brutta serata, è accendere tutto al massimo. È l\'errore più comune e il più costoso, perché i falsi positivi non li vedi: chi viene zittito per sbaglio non scrive «ehi, mi hai zittito». Se ne va e basta.',
        'La regola che funziona è al contrario: <strong>parti largo e stringi solo dove ti hanno fatto male</strong>. Se la tua chat non ha mai avuto un problema di link, non bloccare i link.',
        'E una cosa da tenere ferma sempre: moderatori e streamer non devono mai essere toccati dalle regole automatiche. Se un giorno un mod viene messo in timeout dal bot, quella è una regola scritta male, non un caso.',
      ] },
      { h2: 'Un bot può bannare per sbaglio?', p: [
        'Sì, e succede. Per questo la differenza fra un bot serio e uno approssimativo non sta in quante regole ha, ma in cosa fa <em>quando è in dubbio</em>. La scelta giusta, nel dubbio, è avvisare e non punire: un falso positivo caccia un fan vero, e costa più dell\'attacco che volevi fermare.',
        'Quando valuti un bot per la moderazione, guarda proprio questo: cosa fa da solo, e cosa fa quando non è sicuro.',
      ] },
      { h2: DENTRO.it, p: [
        'La moderazione sta nella scheda <a href="/#regole">Moderazione</a>, e si accende un pezzo per volta.',
      ], passi: [
        { t: 'Accendi solo la regola che ti serve', d: 'Link (scegliendo chi può postarli: tutti, abbonati, VIP, mod), ripetizioni, maiuscole, menzioni, flood, simboli, messaggi troppo lunghi, raffiche di emoji. Ognuno è un interruttore suo, perché ogni chat ha il suo problema — accenderli tutti insieme è l\'errore di cui sopra.' },
        { t: 'Scrivi le parole vietate, una per riga', d: 'Il bot non le dirà mai e richiama chi le usa. Tienile poche e precise: un elenco lungo colpisce parole innocenti dentro altre parole.' },
        { t: 'Lascia acceso il timeout crescente', d: 'Prima si cancella, poi si zittisce per poco, poi per di più. Streamer e moderatori sono <strong>sempre</strong> esenti: non è una casella che puoi sbagliare, è una regola del codice.' },
        { t: 'Accendi lo scudo nella scheda Scudo', d: 'Tre difese in ordine di prudenza: la raffica di follow — che di suo <em>avvisa</em> e non banna, perché un picco può venire anche da una clip virale — i nomi di bot noti (quelli buoni come Nightbot e StreamElements sono sempre esenti), e, solo se lo chiedi, il controllo degli account appena creati.' },
        { t: 'Provala prima che serva', d: 'Scrivi tu un messaggio che dovrebbe essere bloccato e guarda cosa succede. Una difesa non provata è una difesa che scopri rotta nel momento peggiore.' },
      ] },
    ],
    faq: [
      { d: 'Serve un bot se ho già AutoMod?', r: 'Per il linguaggio, no: AutoMod fa bene il suo lavoro ed è integrato. Un bot serve per quello che AutoMod non copre — copypasta, flood, raffiche di menzioni, permessi sui link per ruolo, timeout crescenti — e soprattutto per la difesa dai follow-bot e dagli hate-raid.' },
      { d: 'Un bot di moderazione può mettere in timeout al posto mio?', r: 'Sì, se gli concedi il permesso di moderazione. Senza quel permesso può leggere e scrivere ma non punire. È un permesso che puoi revocare in qualsiasi momento dalle impostazioni di Twitch.' },
      { d: 'Il bot può zittire un moderatore per sbaglio?', r: 'Non dovrebbe mai: streamer e moderatori vanno esentati dalle regole automatiche per costruzione. Se succede, è una regola scritta male.' },
      { d: 'Meglio accendere tutte le regole subito?', r: 'No. I falsi positivi non si vedono, perché chi viene zittito per sbaglio non protesta: se ne va. Conviene partire larghi e stringere solo dove hai avuto un problema vero.' },
      { d: 'La moderazione automatica funziona anche su Kick?', r: 'In parte. Kick espone meno della API di Twitch, quindi le difese più fini sono più semplici. I controlli sui messaggi funzionano; alcune protezioni legate ai follow no.' },
    ],
  },

];
