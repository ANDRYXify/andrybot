// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Manuale: Le tue community, Telegram e Discord. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'community',
  schede: ['telegram', 'ruoli', 'dcavvisi', 'dcserver', 'dcentra', 'dcfiltro'],
  titolo: 'Le tue community: Telegram e Discord | SocialBot',
  h1: 'Le tue community: il manuale di Telegram e Discord',
  desc: 'Telegram e Discord dal pannello: avvisi in gruppi e topic, cancello e scudo all\'ingresso, porta del gruppo, compleanni, chat privata, ruoli, calendario e filtro.',
  aggiornata: '2026-10-04',
  corpo: [
    { p: [
      'Nel menù, il gruppo «Le tue community» ha due voci: «Telegram» e «Discord». Telegram è una scheda sola. Discord ne ha cinque, in fila in cima alla pagina: «Ruoli», «Avvisi», «Il server», «Chi entra», «Il filtro».',
      'Su Telegram il bot è <strong>tuo</strong>: lo crei tu con @BotFather e ci dai la sua chiave. Su Discord porti nel tuo server il nostro bot, con un tasto.',
    ] },
    { tabella: [
      ['Scheda', 'A cosa serve', 'Chi la usa', 'Cosa serve'],
      ['Telegram', 'Avvisi nei tuoi gruppi, canali e topic, comandi nel gruppo, cancello per chi entra, scudo con una prova per chi chiede di entrare, la porta del gruppo, compleanni, chat privata col bot.', 'Proprietario e moderatori. La chat privata e la Mini App le collega solo il proprietario.', 'Il piano Base.'],
      ['Ruoli', 'Il collegamento col server e i ruoli dati in base a Twitch e ai dati del tuo canale.', 'Solo il proprietario.', 'Niente: c\'è in tutti i piani.'],
      ['Avvisi', 'In quali canali del server arrivano gli avvisi, di chi e con che testo. Il calendario del server.', 'Solo il proprietario.', 'Il bot nel server. Gli avvisi partono col piano Base.'],
      ['Il server', 'Categorie, canali, ruoli e impostazioni del server, costruiti da qui.', 'Solo il proprietario.', 'Il bot nel server.'],
      ['Chi entra', 'Il livello di verifica, la prima schermata e le domande per chi entra.', 'Solo il proprietario.', 'Una traccia scelta in «Il server». Un server di tipo Community per la prima schermata e le domande.'],
      ['Il filtro', 'Le regole di moderazione automatica di Discord.', 'Solo il proprietario.', 'Una traccia scelta in «Il server».'],
    ] },
    { p: [
      'Le schede Discord sono del proprietario del canale. Un moderatore del pannello le vede nel menù ma non le può usare.',
      'Se sei entrato in SocialBot solo con Discord, nel gruppo «Le tue community» trovi solo Discord: la scheda Telegram non c\'è.',
      'I piani e cosa comprendono stanno nella scheda «Abbonamento» (<a href="/manuale/account">manuale dell\'account</a>).',
    ] },

    // ─────────────────────────────────────────────────────────── TELEGRAM
    { h2: 'Telegram', scheda: 'telegram', p: [
      'Il tuo bot Telegram dentro i tuoi gruppi e canali: avvisa quando vai in diretta, risponde ai comandi, controlla chi entra, fa gli auguri e ti scrive in privato.',
      'La scheda fa parte del piano Base. Senza, ti mostra cosa fa, il tasto «Guarda la demo» e come sbloccarla.',
      'Finché non incolli il token del bot vedi la carta dell\'avviso, quella degli auguri di compleanno e, se c\'è, quella della Mini App. Le altre compaiono appena il bot è collegato.',
    ] },

    { h3: 'Accedi e gestisci da Telegram' },
    { p: [
      'Questa carta c\'è solo quando la Mini App di SocialBot è disponibile. Collega il tuo account Telegram al canale: poi rientri con un tocco, e dalla Mini App accendi o spegni il bot e apri il pannello.',
      'Apri la Mini App su Telegram, copia il codice che ti mostra, incollalo nel campo «codice (6 caratteri)» e premi «Collega». Se sotto c\'è il link «collega con «Accedi con Telegram»», puoi collegarti anche da lì, dal browser, senza codice.',
      'Da collegato vedi «Telegram collegato» con il tuo nome utente, il link alla Mini App e «Scollega», che chiede conferma. Lo collega e lo scollega solo il proprietario: un moderatore legge «Solo il proprietario del canale può collegare Telegram.».',
      'Se leggi «Codice non valido o scaduto.», riapri la Mini App e usa il codice nuovo.',
    ] },

    { h3: 'Avviso "sono in diretta" su Telegram' },
    { p: ['Quattro passi, e l\'ultimo è quello che si dimentica.'] },
    { passi: [
      { t: 'Crea il bot. ', d: 'Su Telegram apri <a href="https://t.me/BotFather">@BotFather</a>, scrivi <code>/newbot</code>, segui le istruzioni e copia il token che ti dà.' },
      { t: 'Incolla il token. ', d: 'Mettilo in «Token del bot Telegram» e premi «Collega». Il tasto diventa «Collegato ✓» e sotto leggi «Bot collegato:» col nome del tuo bot.' },
      { t: 'Collega il gruppo. ', d: 'Aggiungi il bot al tuo gruppo, scrivi <code>/collega</code> lì dentro e premi «Rileva gruppo». Funziona col bot interattivo spento e acceso. Nel gruppo il bot scrive «✅ Collegato! Vi avviserò qui quando parte la diretta.» e nel pannello leggi «Gruppo collegato:».' },
      { t: 'Accendi l\'avviso. ', d: 'Spunta «Avvisa il gruppo quando vado in diretta» e premi «Salva».' },
    ] },
    { p: [
      'Senza quella spunta, su Telegram non partono gli avvisi delle dirette su Twitch, Kick e YouTube, né le tue né quelle degli altri streamer. La diretta su TikTok e i post nuovi hanno la loro levetta nella scheda «I tuoi social», e su Telegram arrivano anche senza.',
    ] },
    { tabella: [
      ['Cosa leggi', 'Cosa fare'],
      ['«Incolla il token del bot (te lo dà @BotFather).»', 'Il campo è vuoto: incolla il token.'],
      ['«token non valido (copialo esatto da @BotFather)»', 'Il token è incompleto. Ricopialo intero: numeri, due punti e il resto.'],
      ['«token rifiutato da Telegram»', 'Il token è stato revocato o rigenerato. Prendi quello nuovo da @BotFather.'],
      ['«nessun gruppo trovato…» oppure «non ho ancora visto nessun gruppo…»', 'Scrivi <code>/collega</code> dentro il gruppo e riprova. Un comando arriva sempre al bot. Un messaggio normale no, se la privacy del bot è accesa.'],
      ['«il bot ha un webhook attivo verso un altro indirizzo…» oppure «Il bot ha un collegamento attivo verso un altro indirizzo…»', 'Il tuo bot è collegato anche a un altro servizio, e i suoi messaggi non arrivano qui. Spegni e riaccendi «Bot interattivo nel gruppo», poi riprova.'],
    ] },

    { p: ['<strong>Dove arrivano gli avvisi.</strong> Sotto il gruppo c\'è l\'elenco dei posti dove il bot scrive. Un posto è un gruppo, un canale Telegram o un singolo topic di un gruppo con gli argomenti. Il primo gruppo collegato con «Rileva gruppo» ci entra da solo. Ne tieni fino a 20.'] },
    { p: [
      'Per aggiungere un posto metti il bot lì dentro, scrivi <code>/collega</code> (nel topic giusto, se usi gli argomenti) e premi «Aggiungi gruppo, canale o topic». Compaiono i posti che il bot ha visto: tocchi quello che vuoi e leggi «Destinazione collegata ✓». Nel posto il bot scrive «✅ Collegato! Da qui in poi vi avviserò in questo posto.».',
      'Col bot interattivo acceso, appena scrivi <code>/collega</code> il bot risponde sul posto «✅ Ti vedo» e ti ricorda di premere il tasto. Se nel pannello leggi «Niente di nuovo», il comando non gli è arrivato: riscrivilo dentro il posto e riprova.',
      'In un canale Telegram il bot scrive solo se ne è amministratore.',
    ] },
    { p: ['Ogni posto si apre e ha questi controlli. Le modifiche si salvano da sole.'] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base'],
      ['«Quali avvisi arrivano qui»', 'Sette voci: «Diretta su Twitch», «Diretta su Kick», «Diretta su YouTube», «Diretta su TikTok», «Nuovo video su YouTube», «Nuovo post su Instagram», «Nuovo post su TikTok».', 'Tutte'],
      ['«Di chi»', '«Io» e gli altri streamer che annunci.', 'Tutti'],
      ['«Fissa l’avviso qui»', 'Fissa in cima l\'avviso della diretta finché sei in onda, e lo toglie quando finisci.', 'Come la spunta «Fissa l\'avviso in cima durante la live e rimuovilo quando stacco» al momento in cui aggiungi il posto'],
      ['«Attiva»', 'Spenta, il posto resta in elenco ma non riceve niente.', 'Accesa'],
      ['«Prova»', 'Manda qui un\'anteprima dell\'avviso, con la locandina se è accesa. Leggi «Anteprima mandata: guarda su Telegram.».', ''],
      ['«Togli»', 'Toglie il posto, dopo la conferma. Lo rimetti quando vuoi.', ''],
    ] },
    { p: [
      'La spunta «Fissa l\'avviso in cima durante la live e rimuovilo quando stacco», sotto il messaggio, è il valore di base dei posti che aggiungi. Poi decide la «Fissa l’avviso qui» di ogni posto, anche per la diretta su TikTok.',
      'Per fissare l\'avviso il bot dev\'essere amministratore con il permesso di fissare i messaggi. Senza quel permesso l\'avviso non resta in cima, ma a fine diretta viene tolto lo stesso. Telegram lascia cancellare a un bot i suoi messaggi solo entro 48 ore.',
      '<strong>«Quale avviso va dove»</strong> mette tutto in una tabella: ogni riga è un avviso, ogni colonna è un posto. Spunti l\'incrocio e si salva da solo. Se una riga dice «non arriva da nessuna parte», quell\'avviso oggi non va da nessuna parte. Un avviso spuntato su due posti arriva in tutti e due. Le colonne dei posti spenti non si toccano.',
    ] },
    { p: [
      '<strong>«Altri streamer da annunciare».</strong> Le dirette di altri canali Twitch, annunciate insieme alle tue. Scrivi il nome in «nome canale Twitch (es. pincopallo)» e premi «Aggiungi». Ne tieni fino a 10. Il canale deve esistere su Twitch, e il tuo non serve aggiungerlo. Il bot controlla ogni due minuti chi è in onda, e per ogni posto scegli in «Di chi» di chi vuoi gli avvisi. La × accanto al nome lo toglie.',
      '«Annuncia anche le dirette della community» aggiunge da solo i canali dei membri verificati e confermati da andryxify.it. Chi ha solo un account gratuito o un piano a pagamento non c\'è. La lista si aggiorna da sé, e questo interruttore vale solo per Telegram.',
      'La lista degli streamer è una sola, la stessa della scheda «Avvisi» di Discord: uno aggiunto qui compare anche lì. Cosa annunciare lo decide ogni scheda per conto suo.',
    ] },
    { p: [
      '<strong>«Messaggio dell\'avviso».</strong> Il testo che parte. Segnaposto: <code>{nome}</code>, <code>{titolo}</code>, <code>{gioco}</code>, <code>{spettatori}</code>, <code>{link}</code>. Al massimo 800 caratteri. Una riga che resta vuota perché manca il dato sparisce.',
      'Lasciato vuoto, la prima riga la sceglie il bot fra le sue frasi, nella lingua della chat del canale: cambia a ogni diretta, e la stessa riga va a Telegram e a Discord. Sotto vengono il titolo, il gioco e il link. Le frasi le trovi nella scheda «Personalità», carta «Le frasi del bot» (vedi il <a href="/manuale/bot">manuale del bot</a>).',
      'Il tuo testo vale per le dirette su Twitch, tue e degli altri streamer. Le dirette su Kick, YouTube e TikTok partono con la riga del bot e l\'icona di quel servizio. Con la locandina accesa il testo di casa si accorcia alla riga del bot e al link: titolo e gioco sono già disegnati nell\'immagine.',
    ] },
    { esempio: '🔴 Andry è in diretta su Twitch, passate a salutare!\n\nUn titolo\n🎮 Un gioco\n\n👉 https://twitch.tv/andry' },
    { p: [
      '«Salva» registra il messaggio e le spunte. La spunta «Avvisa il gruppo quando vado in diretta» si accende appena c\'è un posto dove mandare l\'avviso: il gruppo di «Rileva gruppo» oppure un posto qualsiasi dell\'elenco. Senza posti leggi «collega prima un gruppo o un canale».',
      '«Manda una prova» manda nel gruppo collegato lo stesso avviso che partirà davvero, locandina compresa. Si usa quando c\'è un gruppo.',
      '«Scollega», dopo la conferma, stacca il bot: con lui se ne vanno il gruppo collegato, l\'avviso acceso, il bot interattivo e la chat privata. Per riaccenderlo incolli di nuovo il token.',
      'Gli avvisi dei post nuovi si accendono nella scheda «I tuoi social» (<a href="/manuale/vetrina">manuale della vetrina</a>). Qui scegli dove arrivano.',
    ] },

    { h3: 'La locandina della diretta' },
    { p: [
      'Con «Manda la locandina insieme all\'avviso» l\'avviso di diretta porta un\'immagine: il tuo nome, il titolo, il gioco e la tua faccia. Di base è spenta.',
      'L\'anteprima è l\'immagine vera, disegnata dal server coi dati di adesso. Ci sono due temi pronti, uno per Twitch e uno per Kick: un tocco e lo usi. «Apri l\'editor» ti fa comporre la tua, fino a 24 elementi. «Torna a uno standard» butta la tua e torna al tema. Sotto l\'anteprima leggi quale stai usando.',
      'Se la carta dice «Adesso non riesco a disegnarla: mancano i caratteri sul server.», la locandina non parte e l\'avviso esce solo col testo.',
    ] },

    { h3: 'Bot interattivo su Telegram' },
    { p: [
      '<strong>«Bot interattivo nel gruppo».</strong> Acceso, il bot legge i messaggi del gruppo e risponde ai comandi. Rispondono i comandi e le frasi che crei in «Chat e pubblico» → «Comandi» con la spunta «Abilita anche su Telegram» (<a href="/manuale/moduli">manuale dei comandi</a>). Su Telegram il <code>!</code> non serve.',
      'Il bot dev\'essere nel gruppo. Da acceso, se non hai ancora un gruppo collegato, il primo messaggio scritto in un gruppo lo aggancia da solo.',
      '@BotFather tiene accesa la privacy dei bot: in un gruppo il tuo bot riceve solo i comandi con la <code>/</code>. Per fargli leggere tutto, anche i comandi senza <code>/</code> e chi scrive per l\'elenco dei membri, scrivi a @BotFather <code>/setprivacy</code> e scegli Disable.',
    ] },
    { p: [
      '<strong>«Rispondimi in chat privata (solo a me)».</strong> Di base acceso. In privato il bot risponde solo a te, mai ad altri. Prima deve sapere chi sei: premi «genera un codice» e il pannello ti dice di scrivere al tuo bot, in privato, <code>/collega</code> seguito da un codice di 6 cifre. Il codice scade in 10 minuti e serve il bot interattivo acceso. Il bot risponde «✅ Collegato! Da ora ti risponderò qui in privato.» e nel pannello compare il tuo account, con «Scollega».',
      'Finché non colleghi, in privato non risponde a nessuno. Spegnendo l\'interruttore la chat privata tace, e non ti arriva più niente di quello che segue. Il codice lo genera e lo scollega solo il proprietario.',
      'Con la chat privata collegata, in privato ti arrivano:',
    ] },
    { ul: [
      'il rapporto della serata, se nella scheda «Dirette» è accesa «Su Telegram, in privato» (<a href="/manuale/diretta">manuale della diretta</a>);',
      'il giorno prima che la tua settimana esca da sola, la richiesta di confermarla, con «Conferma», «Cambiala» e «Non pubblicare». «Conferma» e «Non pubblicare» aprono una pagina col tasto da premere: vale l\'ultimo tasto premuto, fino al momento dell\'uscita, anche dopo aver confermato (<a href="/manuale/vetrina">manuale della vetrina</a>);',
      'un messaggio quando una pubblicazione automatica non è uscita, col perché: la storia prima della diretta, la storia della diretta su Instagram, la settimana;',
      'un avviso se il permesso di Twitch è scaduto e il bot non entra più nella tua chat.',
    ] },
    { p: [
      'In privato, solo a te, il bot accetta anche <code>/categoria</code> seguito da un gioco, che cambia la categoria su Twitch, e <code>/titolo</code> seguito dal testo, che cambia il titolo della diretta. Se manca il permesso di Twitch te lo scrive.',
    ] },
    { p: [
      '<strong>«Ti scrive per prima (proattiva e curiosa)».</strong> Di base acceso. Ogni tanto il bot ti scrive in privato di sua iniziativa: una domanda, una cosa che non sa ancora, un commento, due parole quando cominci o finisci una diretta. Non a orari fissi e mai di notte. Servono la chat privata collegata e «Rispondimi in chat privata» acceso.',
      'Nel gruppo invece il bot risponde a tutti. Il privato resta solo tuo.',
    ] },

    { h3: 'Chi entra nel gruppo' },
    { p: [
      'Il cancello: chi entra nel gruppo non può scrivere finché non preme un tasto. Un bot il tasto non lo preme, perché non sa che c\'è.',
      'Servono il bot interattivo acceso e il bot amministratore del gruppo con il permesso «Blocca utenti». Senza, il cancello non si accende e il pannello ti dice cosa manca. Vale per il gruppo collegato con «Rileva gruppo».',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base e limiti'],
      ['«Chiedi una prova a chi entra»', 'Accende il cancello. Accanto leggi «attivo» e quante persone sono «in attesa».', 'Spento'],
      ['«Quanto tempo ha per rispondere»', 'I minuti per premere il tasto.', '5, da 1 a 60'],
      ['«Se non risponde»', '«Lo tolgo dal gruppo (può rientrare e riprovare)» oppure «Resta dentro, ma muto». Togliere non è un bando.', 'Lo toglie'],
      ['«Cosa gli scrivo»', 'Il benvenuto con il tasto. Segnaposto <code>{nome}</code> e <code>{minuti}</code>.', 'Vuoto: «Ciao {nome}, benvenuto. Premi qui sotto entro {minuti} e potrai scrivere.» Al massimo 400 caratteri.'],
      ['«Cosa c\'è scritto sul tasto»', 'La scritta del tasto.', 'Vuoto: «Non sono un bot». Al massimo 64 caratteri.'],
      ['«Salva il cancello»', 'Salva, e se l\'hai acceso controlla subito che il bot possa fare il portiere.', ''],
    ] },
    { p: [
      'Chi preme il tasto riprende i permessi del gruppo, quelli che hanno tutti gli altri. Se i permessi del gruppo non si riescono a leggere, il cancello non silenzia nessuno. Gli amministratori e gli altri bot non passano dal cancello, e chi era già dentro non viene toccato.',
    ] },
    { tabella: [
      ['Cosa leggi', 'Cosa fare'],
      ['«prima accendi la chat interattiva…»', 'Accendi «Bot interattivo nel gruppo».'],
      ['«collega prima il gruppo»', 'Usa «Rileva gruppo».'],
      ['«il bot deve essere amministratore del gruppo»', 'Su Telegram, nelle impostazioni del gruppo, fai il bot amministratore.'],
      ['«…dagli il permesso «Blocca utenti»»', 'Il bot è amministratore ma non può limitare i membri: dagli quel permesso.'],
      ['«non riesco a leggere i permessi del gruppo…»', 'Riprova fra poco, e controlla che il bot sia ancora nel gruppo.'],
      ['«non riesco a chiedere a Telegram cosa posso fare in quel gruppo…»', 'Controlla che il bot sia ancora nel gruppo.'],
    ] },

    { h3: 'Lo scudo all\'ingresso' },
    { p: [
      'Il cancello lavora su chi è già entrato. Lo scudo lavora un passo prima: chi vuole entrare nel gruppo fa una prova, ed entra solo se la prova va bene. Dalla porta del gruppo la fa lì, appena preme «Entra»; chi chiede di entrare da un altro link la fa dentro Telegram, sulla stessa pagina. Lo trovi nella carta «Scudo all\'ingresso».',
      'La prova è un codice di cinque caratteri che si vede <strong>solo mentre i puntini si muovono</strong>: le lettere scorrono da una parte, il fondo dall\'altra. Una persona lo legge in un paio di secondi. Uno screenshot, una foto o un programma che legge le immagini vedono solo puntini a caso, perché in ogni singolo fotogramma le lettere non ci sono.',
      'In cima alla carta c\'è l\'elenco di cosa serve, letto dal vivo da Telegram. Quando è tutto a posto si raccoglie in «Tutto pronto: ogni controllo è a posto». Lo scudo non si accende finché manca una cosa segnata in rosso.',
    ] },
    { tabella: [
      ['Cosa serve', 'Come si sistema'],
      ['«Il sito risponde in HTTPS»', 'Telegram apre solo pagine sicure. Sul nostro sito c\'è già.'],
      ['«Il bot interattivo è acceso»', 'Accendi «Bot interattivo su Telegram»: le richieste di ingresso arrivano da lì.'],
      ['«Il gruppo è collegato»', 'Usa «Rileva gruppo».'],
      ['«Il bot è amministratore del gruppo»', 'In Telegram: impostazioni del gruppo, Amministratori, aggiungi il tuo bot.'],
      ['«Il bot può invitare utenti»', 'Fra i permessi del bot amministratore accendi «Invita utenti tramite link». Serve ad approvare e rifiutare le richieste, e a fare il link della porta.'],
      ['«Il bot è il guardiano del gruppo»', 'Facoltativo. Con il guardiano la prova si apre subito, dentro Telegram. Senza, arriva in privato con un messaggio del bot. Per averlo, nelle impostazioni del gruppo scegli il tuo bot come guardiano delle richieste di ingresso; se Telegram non te lo propone, accendi le richieste di ingresso per il bot da @BotFather.'],
      ['«Per entrare bisogna chiedere»', 'Avviso, non blocco. Se il gruppo è pubblico e si entra senza chiedere, chi lo trova per nome salta lo scudo: in Telegram accendi «Approva nuovi membri», oppure tieni acceso anche il cancello.'],
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base e limiti'],
      ['«Chiedi la prova a chi chiede di entrare»', 'Accende lo scudo. Accanto leggi «attivo» e quante richieste sono «in attesa».', 'Spento'],
      ['«Quanto tempo ha per farla»', 'I minuti per finire la prova. Allo scadere la richiesta si chiude da sola, come se non l\'avesse superata.', '10, da 2 a 60'],
      ['«Chi non la supera»', '«La rifiuto» oppure «Decido io». Con «Decido io» la richiesta aspetta fuori dal gruppo che tu dica sì o no. Chi è rifiutato può chiedere di nuovo fra mezz\'ora.', 'La rifiuto'],
      ['«Le regole»', 'Con «Chiedi di accettarle prima di entrare» la pagina mostra le regole e una spunta da mettere. Le stesse regole compaiono sulla porta del gruppo.', 'Spento, al massimo 1500 caratteri'],
      ['«Qualche domanda»', 'Fino a tre domande, ognuna con una risposta giusta: una cosa che sa chi ti segue davvero. Una risposta sbagliata vale come una prova non superata.', 'Nessuna, fino a quattro risposte per domanda'],
      ['«Salva lo scudo»', 'Salva, e se l\'hai acceso controlla subito con Telegram che il bot possa farlo.', ''],
      ['«Guarda e vesti la prova nella porta»', 'Porta all\'editor della porta, apre il pezzo «Il gruppo e il tasto per entrare» e fa partire la prova nell\'anteprima. Le regole e le domande la prova le legge salvate.', ''],
    ] },
    { p: [
      'Per ogni prova ci sono tre tentativi; dopo il terzo sbagliato arriva da sola una prova nuova, e le prove sono tre in tutto. «Un\'altra prova» ne chiede una nuova prima.',
      'Chi non riesce a vedere la prova (per la vista, o perché ha chiesto al telefono meno movimento) preme «Non riesco a vederla»: la richiesta aspetta sempre la tua decisione, mai rifiutata.',
      'Chi supera lo scudo non passa anche dal cancello: una prova sola per persona.',
      'In «Le ultime richieste» vedi chi ha chiesto di entrare, com\'è andata e perché. Chi aspetta che decidi tu non è lì: sta nel suo elenco, qui sotto. Le prove fatte sulla porta si leggono «Dalla porta»: chi le fa non ha ancora un nome Telegram. Quelle lasciate a metà non ci sono, perché nessuno ha chiesto niente. Si tengono una settimana.',
    ] },

    { h3: 'Chi aspetta che decidi tu' },
    { p: [
      'Con «Decido io», con «Non riesco a vederla», e quando la prova non si apre o il messaggio in privato non parte, la richiesta resta in coda in Telegram: chi l\'ha fatta ha premuto il tasto di Telegram per chiedere di entrare, ed è lì che aspetta. Non è nel gruppo, non legge niente e non può fare altro che aspettare.',
      'Il pannello te lo dice in tre modi: un puntino sulla voce «Telegram» del menù, un avviso quando apri il pannello («Qualcuno chiede di entrare nel tuo gruppo Telegram: decidi tu, nella scheda Telegram.»), e in cima alla scheda la carta «Qualcuno chiede di entrare» con «Vai all\'elenco». Il pannello lo ricontrolla ogni minuto, finché la finestra è davanti.',
      'L\'elenco «Chi aspetta che decidi tu» sta in cima alla carta dello scudo: il nome, quando ha chiesto e perché decidi tu (per esempio «non riusciva a vedere la prova» o «dalla porta del gruppo»). <strong>«Fai entrare»</strong> lo fa entrare subito; <strong>«Rifiuta»</strong> chiude la richiesta, e quella persona può chiedere di nuovo fra mezz\'ora. Con più di una richiesta c\'è anche «Rifiuta tutte», che chiede conferma: serve quando arriva un\'ondata di account finti.',
      'Se hai collegato la chat privata del bot, ogni richiesta ti arriva anche lì, coi due tasti «Fai entrare» e «Rifiuta» e il nome che si tocca per vedere il profilo. I tasti valgono solo per te, nella tua chat col bot. Decidi dove ti è più comodo: vale la prima decisione, e il messaggio si riscrive con l\'esito anche se hai deciso dal pannello. Se arrivano più di cinque richieste in dieci minuti, ti arriva un messaggio solo che dice dove trovare le altre.',
      'Decidono anche i moderatori che hai fatto entrare nel pannello. Un amministratore del gruppo può decidere anche dentro Telegram: se la fa entrare, la richiesta sparisce da qui; se la rifiuta, Telegram non ce lo dice, e quando premi un tasto leggi «Questa richiesta non c\'è più in Telegram». Se Telegram non risponde, la richiesta resta da decidere e puoi riprovare. Una richiesta che nessuno decide esce dall\'elenco dopo un mese.',
    ] },

    { h3: 'La porta del gruppo' },
    { p: [
      'La porta è l\'unica pagina del tuo gruppo, a un indirizzo come <code>telegram.socialbot.live/il-tuo-canale</code>. La fai nella carta «La porta del gruppo», con lo stesso editor e gli stessi stili della pagina link. La modifica solo il proprietario.',
      'I pezzi suoi sono «Il gruppo e il tasto per entrare», «Come si entra (lo scudo)», che si vede solo con lo scudo acceso, e «Le regole del gruppo», con il testo scritto nello scudo. Poi ci sono quelli di sempre: titoli, testi, link, immagini, separatori.',
      'Dove porta «Entra» lo decide lo scudo. <strong>Scudo spento</strong> (niente, o solo il cancello): il tasto è il link del gruppo, e si entra subito. <strong>Scudo acceso</strong>: il tasto apre la prova lì, nella carta del gruppo, con i caratteri, i colori e lo sfondo della porta. Chi la supera riceve un link tutto suo, che vale per una persona e per mezz\'ora, ed entra senza chiedere. Chi chiede di entrare da un altro link vede, dentro Telegram, questa stessa pagina con la prova già aperta.',
      'La prova si veste nel pezzo «Il gruppo e il tasto per entrare», in «La prova, con lo scudo acceso»: il titolo, la spiegazione, il tasto per entrare, cosa si legge quando la si supera, quando non va e quando decidi tu, il tasto che apre Telegram, la grandezza del riquadro e i colori dei puntini. Una parola lasciata vuota è quella di serie, nella lingua della porta. Per i colori serve un contrasto di almeno 3 a 1: sotto, il pannello lo dice e la prova usa i colori della pagina, così non esce mai illeggibile.',
      'Tu sei già nel gruppo, quindi dal vero la prova non la vedi. Falla nell\'anteprima: <strong>«Fai la prova nell\'anteprima»</strong> nella carta della porta, oppure «Fai la prova» nel pezzo del gruppo. È la prova vera, da lì non parte niente verso Telegram. «Superata», «Non superata» e «Decidi tu» mostrano gli esiti; «Torna alla pagina» la richiude.',
      'Nella carta dello scudo trovi l\'indirizzo della porta con «Copia»: mettilo nella bio, nei pannelli di Twitch, in chat.',
      'Quando incolli l\'indirizzo della porta su Telegram, WhatsApp o Discord, esce un\'immagine sua: la tua foto, «Il gruppo Telegram», il tuo nome e il sottotitolo della porta, coi colori della porta. La vedi e la rifai in «Quando condividi il link», nell\'editor della porta, con lo stesso editor delle locandine, come per la pagina link. C\'è solo finché la porta è pubblicata. Incolla l\'indirizzo col tuo canale: <code>telegram.socialbot.live</code> da solo porta al sito, e mostra l\'immagine di SocialBot.',
    ] },

    { h3: 'Auguri di compleanno' },
    { p: [
      'La carta ha due parti separate, perché i posti e i momenti sono diversi: gli auguri nella chat della diretta e quelli nel gruppo Telegram.',
      'Gli auguri in chat non hanno bisogno di Telegram, e la carta c\'è anche senza il bot. Finché il bot non è collegato, al posto della parte del gruppo leggi che per gli auguri nel gruppo va collegato; «Membri del gruppo» e «Aggiungi un compleanno a mano» compaiono col bot, perché servono solo al gruppo.',
      'Nel gruppo gli auguri partono nella prima ora del giorno, ora italiana. In chat la mezzanotte non esiste: partono al primo messaggio che il festeggiato scrive quel giorno, una volta l\'anno. Chi quel giorno non passa in chat non riceve auguri in chat. Con tutte e due le parti accese, gli auguri del gruppo non tolgono quelli in chat: ogni posto fa i suoi.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base e limiti'],
      ['«Auguri in chat accesi» / «spenti»', 'Accende gli auguri nella chat della diretta e il comando <code>!compleanno</code>.', 'Spenti'],
      ['«Messaggio in chat»', 'Il testo in chat. Segnaposto <code>{nome}</code>.', 'Vuoto: «Tanti auguri {nome}! Buon compleanno da tutta la chat.» Al massimo 400 caratteri.'],
      ['«Effetto in sovraimpressione»', 'Un effetto acceso della tua libreria, che parte insieme agli auguri.', 'Nessuno'],
      ['«Salva auguri in chat»', 'Salva le tre righe qui sopra.', ''],
      ['«Auguri nel gruppo Telegram accesi» / «spenti»', 'Accende gli auguri nel gruppo collegato e il comando <code>/compleanno</code> nel gruppo.', 'Spenti'],
      ['«Messaggio di auguri»', 'Il testo nel gruppo. <code>{menzione}</code> tagga il festeggiato, <code>{nome}</code> scrive il nome.', 'Vuoto: «🎂 Tanti auguri {menzione}! 🎉 Buon compleanno da tutta la community!» Al massimo 600 caratteri.'],
      ['«Salva impostazioni»', 'Salva le due righe del gruppo.', ''],
    ] },
    { p: [
      'Chi ti guarda si segna da solo. In chat scrive <code>!compleanno 25/12</code>; <code>!compleanno</code> da solo rilegge la data, <code>!compleanno via</code> la toglie. Nel gruppo scrive <code>/compleanno 25/12</code>, e lì serve anche il bot interattivo acceso.',
      '«Compleanni registrati» è l\'elenco unico, con il numero accanto. Accanto a ogni nome leggi «dalla chat» o «aggiunto a mano»; quelli senza nota arrivano dal gruppo. «Rimuovi» toglie una data.',
      '«Membri del gruppo» elenca chi ha scritto nel gruppo e non ha ancora una data. Telegram non lascia leggere l\'intera lista dei membri: «Carica amministratori» aggiunge gli amministratori, che sono l\'unico elenco che concede. Per vedere tutti quelli che scrivono, togli la privacy del bot su @BotFather. Per ogni membro scrivi giorno e mese e premi «Aggiungi»: il giorno del compleanno viene taggato.',
      '«Aggiungi un compleanno a mano (senza tag)» vuole nome, giorno e mese. Quel nome viene scritto negli auguri ma non taggato.',
      'Se leggi «metti un nome» o «data non valida (giorno/mese)», manca il nome o la data non esiste. «collega prima il bot e il gruppo» vuol dire che serve un gruppo collegato. Gli effetti si preparano nella scheda «Effetti & suoni» (<a href="/manuale/effetti">manuale degli effetti</a>).',
    ] },

    // ─────────────────────────────────────────────────────────── DISCORD · RUOLI
    { h2: 'Discord: Ruoli', scheda: 'ruoli', p: [
      'La prima scheda di Discord. Il collegamento col tuo server, e i ruoli dati in base a quello che succede su Twitch e nel tuo canale: chi ti segue, chi è abbonato, chi è VIP o moderatore, quante monete ha, quante ore ti ha guardato, da quante dirette c\'è.',
      'La usa solo il proprietario del canale, e non serve un piano.',
    ] },

    { h3: 'Il collegamento' },
    { passi: [
      { t: 'Premi «Porta il bot nel tuo server». ', d: 'Ti porta su Discord, che ti fa scegliere il server da un elenco: ci sono quelli dove puoi aggiungere un bot.' },
      { t: 'Conferma i permessi. ', d: 'Discord ti mostra l\'elenco dei permessi che il bot chiede. Sono quelli della tabella qui sotto.' },
      { t: 'Torna al pannello. ', d: 'Leggi «Bot nel tuo server ✓». L\'id del server non lo copi: lo dice Discord. Se leggi «Non è andata: riprova da qui.», ripremi il tasto.' },
    ] },
    { tabella: [
      ['Permesso chiesto', 'A cosa serve'],
      ['Gestire i ruoli', 'Dare e togliere i ruoli, creare quelli della traccia.'],
      ['Gestire i canali', 'Creare e sistemare categorie e canali.'],
      ['Gestire il server', 'Le impostazioni del server, la porta d\'ingresso e il filtro.'],
      ['Creare inviti', 'Far entrare nel server chi si collega con <code>!discord</code>.'],
      ['Vedere i canali, inviare messaggi, incorporare link, allegare file', 'Scrivere gli avvisi col loro riquadro e mandare l\'immagine della settimana.'],
      ['Creare eventi', 'Mettere gli appuntamenti sul calendario del server.'],
      ['Mettere in pausa, cacciare, bandire, cancellare i messaggi, cambiare i soprannomi, zittire e spostare nei vocali, vedere il registro, gestire gli eventi, chiamare tutti, usare emoji di altri server, trasmettere, parlare con priorità', 'Il bot non li usa. Li tiene per poterli passare ai ruoli che gli chiedi di creare, come «Moderatori»: Discord non lascia dare un privilegio che non si ha.'],
    ] },
    { p: [
      'Da collegato, il tasto diventa «Cambia server» e compare «Scollega tutto». La riga di stato mostra il nome del server e del bot, e sotto leggi «Il bot è «…» e il suo ruolo più alto è «…»: tocca solo i ruoli che stanno sotto questo.».',
      'Su Discord conta la <strong>posizione</strong> dei ruoli, non il nome del permesso: un ruolo che sta sopra quello del bot il bot non lo può dare, cambiare o cancellare. I ruoli degli altri bot non contano: stanno dove vogliono e il bot non li tocca comunque.',
    ] },
    { tabella: [
      ['Cosa vedi', 'Cosa vuol dire', 'Come si sistema'],
      ['«Al bot manca «Gestire i canali»»', 'Il costruttore non crea e non sistema i canali.', '«Aggiorna i suoi permessi»: reinviti il bot, e Discord gli aggiorna i permessi.'],
      ['«Al bot manca il permesso di far entrare la gente»', 'Chi si collega arriva al server ma non entra.', '«Aggiorna i suoi permessi».'],
      ['«Il bot non ha ancora un ruolo sul server»', 'Senza un ruolo non può dare niente.', '«Aggiorna i suoi permessi».'],
      ['«Un ruolo sta sopra il bot» o «Alcuni ruoli stanno sopra il bot»', 'Quei ruoli, elencati per nome, restano fuori portata.', 'Su Discord, in Impostazioni server → Ruoli, trascina il ruolo del bot sopra di loro. La carta ti dice il nome esatto da trascinare.'],
    ] },
    { p: [
      '<strong>«Dagli i pieni poteri».</strong> Compare da collegato, finché il bot non li ha. «Portalo con i pieni poteri» reinvita il bot come amministratore: da qui muovi canali, ruoli e permessi senza tornare su Discord. In cambio vede anche i canali privati. I ruoli più in alto del suo restano fuori portata, e il proprietario del server non lo tocca nessuno. Quando li ha, la carta dice «Ha i pieni poteri su questo server: da qui puoi muovere tutto.». Per tornare indietro lo reinviti con il tasto di sopra.',
      '<strong>«Usa un bot tuo invece del nostro».</strong> Se hai già un bot tuo su Discord, incolla il suo «Token del bot» e l\'«Id del server», poi premi «Prova e salva». La riga di stato dice quanti ruoli può muovere, e da lì è lui a dare i ruoli. Il token resta cifrato e non si rilegge. Solo col bot tuo l\'id del server si scrive a mano: col nostro il server si sceglie su Discord, e altrimenti leggi «Il server lo scegli dalla schermata di Discord, col tasto qui sopra.». Se sul server che usi non c\'è il nostro bot, questo riquadro si apre da solo.',
      '<strong>«Scollega tutto».</strong> Dopo la conferma toglie il collegamento, le regole, le frasi, la traccia del server e i collegamenti di chi si era collegato. I ruoli già dati restano dove sono. Il bot resta nel server finché non lo togli tu da Discord.',
    ] },

    { h3: 'Chi prende quale ruolo' },
    { p: ['Ogni regola è una condizione e il ruolo che le corrisponde. «Aggiungi una regola» ne mette una nuova, che parte da «Scegli il ruolo»; «Togli» la toglie. Senza regole il bot non tocca niente.'] },
    { tabella: [
      ['Condizione', 'Da dove viene', 'Quanto'],
      ['«Ti segue»', 'Twitch', ''],
      ['«È abbonato»', 'Twitch', ''],
      ['«È VIP»', 'Twitch', ''],
      ['«È moderatore»', 'Twitch', ''],
      ['«Ha almeno tante monete»', 'Le monete del tuo canale', 'da 1 a 100000'],
      ['«Ti ha guardato almeno tante ore»', 'Le ore guardate', 'da 1 a 100000'],
      ['«È di fila da tante dirette»', 'La serie di presenze', 'da 1 a 100000'],
      ['«C’è stato ad almeno tante dirette»', 'Le dirette a cui è stato', 'da 1 a 100000'],
    ] },
    { p: [
      'Nell\'elenco dei ruoli trovi quelli che il bot può dare. Quelli che stanno sopra il suo ruolo più alto compaiono spenti, con «sta sopra il bot». Il ruolo che hanno tutti, quelli del bot e quelli di altri bot non si offrono: se una regola vecchia ne nomina uno, lo vedi spento col motivo («ce l’hanno tutti», «è del bot», «è di un altro bot»). Una regola che nomina un ruolo cancellato mostra «un ruolo che non c’è più», e il giro la scarta.',
      'Il bot tocca solo chi si è collegato, e solo i ruoli che le tue regole nominano: li dà a chi rientra nella condizione e li toglie a chi non ci rientra più. I ruoli dati a mano, o da un altro bot, non li guarda. Se Twitch per un momento non risponde, le condizioni che vengono da Twitch per quel giro non valgono: il ruolo non viene né dato né tolto. Ogni ruolo dato o tolto lascia scritto il perché nel registro del tuo server, su Discord.',
      'Tieni fino a 20 regole: arrivato lì, «Aggiungi una regola» ti dice di toglierne una. Due regole identiche diventano una. Se «Costruisci» porta regole nuove oltre il tetto, l\'esito dice quante restano fuori.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa'],
      ['«Tieni i ruoli aggiornati»', 'Acceso, il bot ripassa da solo ogni 15 minuti e <code>!discord</code> risponde in chat.'],
      ['«Salva»', 'Salva regole e interruttore.'],
      ['«Fammi vedere cosa faresti»', 'Salva le regole e dice cosa farebbe, senza toccare niente. Funziona anche a interruttore spento.'],
      ['«Passa adesso»', 'Salva le regole e fa il giro subito. Con «Tieni i ruoli aggiornati» spento non parte, e ti dice di accenderlo prima.'],
    ] },
    { p: [
      'L\'esito si legge in una riga: «Farebbe:» o «Fatto:», poi quanti ruoli dati, quanti tolti, quanti collegati non sono nel server, quanti ruoli stanno più in alto del bot, quante regole scartate. Se non c\'è niente da fare leggi «niente da cambiare». Sotto, «Ultimo giro:» dice quando è passato l\'ultima volta e come è andata.',
      'Se accendi l\'interruttore senza un server collegato, il pannello non lo accende e ti dice di portare prima il bot nel tuo server.',
      'Anche la scheda «Il server» scrive regole qui: un ruolo della traccia con «A chi va» su moderatori, VIP, abbonati o follower diventa una regola, che si aggiunge alle tue e si cambia da qui.',
    ] },

    { h3: 'La porta d’ingresso' },
    { p: [
      'L\'indirizzo da dare a chi ti guarda, con «Copia» e «Aprila». Sotto leggi quante persone si sono collegate.',
      'Chi ti guarda si collega da solo, in quattro passi:',
    ] },
    { passi: [
      { t: 'Scrive !discord in chat. ', d: 'Il bot risponde con l\'indirizzo.' },
      { t: 'Apre l\'indirizzo. ', d: 'Dice a Discord chi è, e nello stesso momento entra nel tuo server. Niente link d\'invito da cercare.' },
      { t: 'Riscrive il codice in chat. ', d: 'La pagina gli mostra un codice di 6 caratteri, valido 10 minuti. Lo scrive in chat dopo <code>!discord</code> e il bot risponde che è collegato.' },
      { t: 'Riceve i ruoli. ', d: 'Al giro successivo, o subito con «Passa adesso».' },
    ] },
    { p: [
      'Il codice va in questo verso perché la chat è pubblica: un link personale scritto in chat lo potrebbe aprire chiunque prima di lui. Il codice invece nasce sul suo schermo e vale una volta sola.',
      '<code>!discord via</code> scollega: i ruoli che ha restano suoi e il bot non li tocca più. Un account Discord sta con una persona sola per canale: se un altro lo collega, il primo lo perde.',
      'Se <code>!discord</code> non risponde, la carta lo dice e dice perché: non c\'è ancora un server collegato, non c\'è un bot che possa rispondere, oppure «Tieni i ruoli aggiornati» è spento.',
      'Il nome del comando si cambia nella scheda «Comandi», come quello degli altri comandi pronti.',
    ] },
    { p: ['<strong>«Cambia le parole che dice in chat».</strong> Le cinque risposte del bot le scrivi tu. Segnaposto <code>{nome}</code>, <code>{link}</code> e <code>{codice}</code>, al massimo 300 caratteri l\'una. Un campo vuoto usa la frase di serie, che vedi in grigio. «Salva le frasi» le registra.'] },
    { tabella: [
      ['Campo', 'Frase di serie'],
      ['«Quando chiedono come si fa»', '@{nome} ti faccio entrare nel Discord e ti do un codice da riscrivere qui, così ti sistemo i ruoli. Si comincia qui {link}'],
      ['«Quando si sono collegati»', '@{nome} collegato ✓ Al prossimo giro ti metto a posto i ruoli su Discord.'],
      ['«Quando il codice non vale più»', '@{nome} quel codice non vale più. Si riparte da qui {link}'],
      ['«Quando si staccano»', '@{nome} scollegato. I ruoli che hai adesso restano tuoi: non tocco più niente.'],
      ['«Quando si staccano senza esserci mai stati»', '@{nome} non risulti collegato.'],
    ] },

    // ─────────────────────────────────────────────────────────── DISCORD · AVVISI
    { h2: 'Avvisi su Discord', scheda: 'dcavvisi', p: [
      'La scheda «Avvisi» di Discord: in quali canali del tuo server arrivano gli avvisi, di chi e con che parole, e gli appuntamenti sul calendario del server.',
      'La usa solo il proprietario. Gli avvisi partono col piano Base, come su Telegram; il calendario c\'è in tutti i piani. Telegram e Discord hanno ognuno i suoi posti: spegnere uno non tocca l\'altro.',
    ] },

    { h3: 'In quali canali arrivano' },
    { p: [
      'Serve il bot nel server. Se non c\'è leggi «Il bot non è ancora nel tuo server: per scegliere un canale portacelo dalla scheda «Ruoli».» e il tasto «Vai».',
      'Scegli un canale dall\'elenco e premi «Aggiungi». Ci sono i canali di testo e di annunci. Quelli dove il bot non può scrivere compaiono con «qui non può scrivere» e non si scelgono: su Discord dai al ruolo del bot l\'accesso a quel canale. Tieni fino a 20 canali.',
      'Ogni canale si apre e ha questi controlli. Le modifiche si salvano da sole.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base e limiti'],
      ['«Quali avvisi arrivano qui»', 'Le stesse sette voci di Telegram: le dirette su Twitch, Kick, YouTube e TikTok, e i post nuovi su YouTube, Instagram e TikTok.', 'Tutti'],
      ['«Di chi»', '«Io» e gli altri streamer che annunci. Se sei entrato solo con Discord, «Io» non c\'è: annunci gli altri.', 'Tutti'],
      ['«Il testo»', 'Le parole sopra il riquadro, per le dirette. Segnaposto <code>{nome}</code>, <code>{titolo}</code>, <code>{gioco}</code>, <code>{spettatori}</code>, <code>{link}</code>, <code>{piattaforma}</code>.', 'Vuoto: l\'icona, una riga delle frasi del bot nella lingua del canale e il link. Al massimo 1800 caratteri.'],
      ['«Chiama un ruolo»', 'Menziona quel ruolo, e nessun altro.', '«nessuno»'],
      ['«Chiudi l\'avviso a diretta finita»', 'A diretta finita riscrive l\'avviso con «⚫», il nome e una riga delle frasi del bot, nella lingua del canale.', 'Spento'],
      ['«Acceso»', 'Spento, il canale resta in elenco ma non riceve niente.', 'Acceso'],
      ['«Prova»', 'Manda l\'avviso esattamente dove finirebbe, col tuo testo e la tua menzione. Leggi «Mandato ✓ guarda nel canale.». Come gli avvisi veri chiede il piano Base: senza, leggi «Mandare gli avvisi su Discord non è nel tuo piano…», la stessa frase che la carta ti mostra in cima.', ''],
      ['«Togli»', 'Toglie il canale, dopo la conferma.', ''],
    ] },
    { p: [
      'Titolo, gioco e spettatori stanno già nel riquadro sotto il messaggio: nel testo di solito bastano nome e link. Un post nuovo non è una diretta: arriva senza riquadro e con parole sue, come «📺 {nome} ha caricato un nuovo video su YouTube» col titolo e il link. Il testo del canale non lo usa.',
      'Scrivere <code>@everyone</code> nel testo non serve e non funziona: il bot non lo lascia passare. Per chiamare qualcuno usa «Chiama un ruolo».',
      'L\'avviso chiuso non sparisce, diventa «ha finito la diretta»: il bot riscrive solo i suoi messaggi e non ne cancella nessuno.',
      'Se costruisci la traccia «Intorno alle dirette» in «Il server» e qui non hai ancora nessun canale, il canale <code>sono-in-onda</code> diventa il posto delle tue dirette.',
      'Se avevi collegato gli avvisi di Discord con un webhook, quel posto compare in elenco come «webhook» e continua a ricevere.',
    ] },

    { h3: 'Chi annunciare' },
    { p: [
      'Oltre a te, altri streamer. Scrivi il nome del canale Twitch e premi «Aggiungi»: al massimo 10, e il canale deve esistere su Twitch. La lista è la stessa della scheda Telegram: uno aggiunto lì compare qui.',
      '«Annuncia anche le dirette della community» vale per questo server e basta: accenderlo qui non accende niente su Telegram. Entrano solo i membri verificati e confermati da andryxify.it, e la lista si aggiorna da sé.',
      'I canali aggiunti a mano hanno la ×; quelli della community entrano ed escono da soli. Poi, per ogni canale del server, scegli in «Di chi» di chi vuoi gli avvisi.',
    ] },

    { h3: 'Gli appuntamenti sul calendario' },
    { p: [
      'L\'avviso dice che sei partito. Questo dice quando torni: la tua settimana finisce sul calendario del server come appuntamenti, e chi ti segue mette il promemoria. Le serate con la stessa ora e la stessa cosa diventano un appuntamento solo, che si ripete ogni settimana.',
      'Giorni, orari e quanto dura una diretta vengono dalla scheda «La tua settimana» (<a href="/manuale/vetrina">manuale della vetrina</a>). Se è vuota leggi «La tua settimana è vuota…» e il tasto «Vai a scriverla»; se è piena vedi gli appuntamenti che ne uscirebbero e «Cambiali».',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Limiti'],
      ['«Metti la mia settimana sul calendario del server»', 'Accende gli appuntamenti. Per togliere quelli messi dal bot, spegnilo e premi «Mettili adesso».', ''],
      ['«Come si chiamano»', 'Il titolo. <code>{cosa}</code> diventa quello che fai quel giorno. Vuoto, il titolo è quello che fai, o «Diretta» se quel giorno non c\'è scritto niente.', '100 caratteri'],
      ['«Dove succede»', 'Il link del tuo canale: Discord lo mette nel tasto dell\'appuntamento. Senza questo link gli appuntamenti non si mettono.', '100 caratteri'],
      ['«Due righe di descrizione, se ti va»', 'La descrizione.', '1000 caratteri'],
      ['«Salva»', 'Salva.', ''],
      ['«Mettili adesso»', 'Salva e allinea subito il calendario. Leggi quanti ne ha messi, rimessi a posto o tolti, oppure «Erano già a posto.».', ''],
    ] },
    { p: [
      'Da acceso ci pensa il bot: quando salvi la settimana, e ogni sei ore, rimette a posto gli appuntamenti, anche col cambio dell\'ora. Sotto leggi quanti ce ne sono sul server messi da lui. Quelli che hai scritto a mano su Discord non li tocca: Discord non glielo lascia fare.',
      'Il calendario ha il suo interruttore: non dipende da «Tieni i ruoli aggiornati».',
      'Se leggi «al bot manca «Creare eventi»», il bot è entrato nel server prima che il calendario esistesse: in «Ruoli» premi «Cambia server» e riscegli lo stesso server, così Discord gli aggiorna i permessi.',
    ] },

    // ─────────────────────────────────────────────────────────── DISCORD · IL SERVER
    { h2: 'Il server Discord', scheda: 'dcserver', p: [
      'La scheda «Il server» di Discord. Descrivi com\'è fatto il tuo server: categorie, canali, di cosa si parla in ognuno, chi può fare cosa, i ruoli e le impostazioni. Guardi cosa cambierebbe, e se ti convince lo fa il bot.',
      'Questa descrizione si chiama <strong>traccia</strong>. È una sola, e la usano anche «Chi entra» e «Il filtro»: un «Costruisci» fa tutto insieme, in un giro solo. Niente di quello che scegli tocca il server finché non premi «Costruisci».',
      'La usa solo il proprietario, e serve il bot nel server. Senza leggi «Prima porta il bot nel tuo server, nella scheda Ruoli.».',
    ] },

    { h3: 'Da dove parti' },
    { p: ['Scegli una traccia con «Parti da qui» e cambiala come vuoi. Ognuna dice quante categorie e quanti canali ha.'] },
    { tabella: [
      ['Traccia', 'Per chi', 'Cosa c\'è'],
      ['Si comincia', 'Un server nuovo, quando non sai da dove partire.', 'Benvenuto (regole, annunci), Chiacchiere (generale, fuori-tema, Salotto, Angolo AFK). Ruoli Moderatori, VIP, Abbonati.'],
      ['Intorno alle dirette', 'Chi trasmette e vuole un posto dove ritrovarsi anche quando non è in onda.', 'Benvenuto (regole, annunci, presentati), Diretta (sono-in-onda, clip, richieste), Chiacchiere (generale, immagini, Salotto, In diretta, Angolo AFK). Ruoli Streamer, Moderatori, VIP, Abbonati.'],
      ['Si gioca insieme', 'Un server dove ci si organizza per giocare, non solo per parlarne.', 'Benvenuto, Si gioca (cerchiamo-gente, clip-e-schermate, consigli), Vocali (tre squadre, Due chiacchiere, Angolo AFK). Ruoli Moderatori, VIP, Abbonati.'],
      ['Siamo in tanti', 'Quando un canale solo non basta più e serve un po\' di ordine.', 'Benvenuto, Chiacchiere, Aiuto (domande, segnalazioni), Vocali, Staff riservato. Ruoli Moderatori, VIP, Abbonati.'],
    ] },
    { p: [
      'In tutte le tracce <code>regole</code> e <code>annunci</code> si leggono e basta. In «Intorno alle dirette» anche <code>sono-in-onda</code>, dove scrive il bot, e il vocale «In diretta» è una stanza dove si ascolta: parlano gli Streamer e i Moderatori, gli altri sentono. Ogni traccia crea il suo Angolo AFK e lo imposta, se il tuo server non ne ha già uno.',
      'Ogni traccia porta con sé anche una porta d\'ingresso già scritta e il filtro di base, che trovi nelle schede «Chi entra» e «Il filtro».',
      'Se il server ce l\'hai già, «Il server che ho già» → «Leggi il mio server» prende com\'è adesso e lo usa come punto di partenza: canali, permessi, ruoli, impostazioni, la porta d\'ingresso e le regole del filtro che ci sono. I permessi che ci sono restano come sono. Legge e basta: non scrive niente.',
      'Con una traccia in mano, la carta dice «Stai lavorando su una traccia tua.».',
    ] },

    { h3: 'Come lo vuoi' },
    { p: [
      'Le categorie stanno in ordine, i canali dentro. Ogni categoria ha il nome, «Togli», le sue righe di permessi e «Aggiungi un canale». «Aggiungi una categoria» ne mette una nuova in fondo. «Riparti da un’altra traccia» butta la traccia, dopo la conferma, e torna alla scelta: il server non lo tocca.',
      'Apri un canale per cambiare il nome, il tipo («Testo», «Vocale», «Annunci», «Forum»), «Di cosa si parla qui» (fino a 1024 caratteri) e chi può fare cosa.',
      '<strong>«Chi può fare cosa»</strong> aggiunge una riga: chi («Tutti» o un ruolo), «può» o «non può», e cosa. La traccia tocca solo i permessi che nomini: tutti gli altri, messi a mano o da un altro bot, restano dove sono. Una riga che nomina un ruolo che nel server non c\'è più viene saltata, e l\'anteprima lo dice.',
    ] },
    { tabella: [
      ['Permessi di un canale'],
      ['«Vedere il canale», «Scrivere», «Leggere i messaggi di prima», «Mettere reazioni», «Allegare file», «Far vedere l’anteprima dei link», «Aprire discussioni», «Entrare nel vocale», «Parlare nel vocale», «Chiamare tutti»'],
    ] },
    { p: ['La traccia tiene al massimo 20 categorie, 60 canali e 10 righe di «Chi può fare cosa» per canale o categoria. Arrivato al tetto, il tasto si ferma e ti dice quanti ne tiene. Se il server che leggi con «Leggi il mio server» è più grande, quello che resta fuori lo leggi subito e poi nell\'anteprima, in «Restano fuori dalla traccia».'] },

    { h3: 'Chi è chi' },
    { p: [
      'I ruoli del server: come si vedono e cosa possono fare. «Aggiungi un ruolo» ne mette uno nuovo, fino a 15. Oltre leggi «La traccia ne tiene al massimo 15 ruoli.». Una traccia letta dal tuo server tiene anche lei 15 ruoli al massimo, e gli altri li trovi in «Restano fuori dalla traccia».',
      '«Streamer» è solo un colore e un posto a parte, senza privilegi: su Discord un bot non può creare niente più in alto di sé. «Moderatori» invece ha i poteri veri, come mettere in pausa, cacciare e cancellare i messaggi degli altri.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa'],
      ['Nome e «Togli»', 'Il nome del ruolo, fino a 100 caratteri. «Togli» lo toglie dalla traccia.'],
      ['«Mostralo a parte nell’elenco delle persone»', 'Chi lo ha compare in un gruppo suo nella colonna delle persone.'],
      ['«Si può chiamare con @»', 'Chiunque può menzionarlo.'],
      ['«A chi va»', '«A nessuno in automatico: lo dai tu», «A te, che hai il server», «A chi è moderatore su Twitch», «A chi è VIP su Twitch», «A chi è abbonato su Twitch», «A chi ti segue su Twitch». Le ultime quattro diventano regole nella scheda «Ruoli» e valgono per chi ha collegato il suo Discord. «A te» lo può avere un ruolo solo: sceglierlo su un altro toglie la scelta dal primo.'],
      ['«Tinta»', '«Un colore», «Sfumatura» o «Olografico». Sfumatura e olografico Discord li dà ai server saliti di livello: altrove la scelta è spenta. Con l\'olografico i colori li decide Discord.'],
      ['«Segno accanto al nome»', '«Niente», «Un’emoji» o «Un’immagine» (PNG, JPEG o GIF, ridotta a 64 pixel). Anche il segno Discord lo dà ai server saliti di livello. L\'immagine parte quando costruisci, e noi non la teniamo.'],
      ['Privilegi', '«Mettere in pausa qualcuno», «Cacciare dal server», «Bandire dal server», «Cancellare i messaggi degli altri», «Cambiare i soprannomi», «Zittire nel vocale», «Spostare fra i vocali», «Vedere il registro del server», «Organizzare eventi», «Chiamare tutti», «Usare le emoji di altri server», «Trasmettere nel vocale», «Farsi sentire sopra gli altri».'],
    ] },
    { p: [
      'Il ruolo «A te» il bot te lo dà quando costruisci, e nell\'esito leggi «il tuo ruolo adesso ce l’hai». Se sul server quel ruolo sta più in alto del bot, l\'anteprima dice che non può dartelo e che va trascinato sopra il ruolo del bot su Discord.',
      'Dopo «Fammi vedere cosa faresti», in questa carta compare il confronto: «Sul tuo server» a sinistra, «Nella traccia» a destra. Per ogni tuo ruolo dice se diventerebbe un ruolo della traccia, se lo terrebbe o se lo toglierebbe. Rinominare tiene dentro chi quel ruolo ce l\'aveva; cancellare e rifare lo toglie a tutti.',
      '«Fai come dici tu» scrive i rinomini nella traccia. «Tieni quelli che terresti» aggiunge alla traccia i ruoli che terrebbe. Di qua non si cancella niente: il confronto è da guardare, e vale da quando premi uno dei due tasti.',
      'Se sul server c\'è già un ruolo che fa lo stesso mestiere di uno della traccia, come un tuo «moderatore» accanto a «Moderatori», e il bot non arriva a toccarlo, il costruttore non ne crea un doppione: te lo dice.',
    ] },

    { h3: 'Le impostazioni del server' },
    { p: ['Quello che su Discord sta in «Impostazioni server». Fanno parte della traccia come i canali: le vedi nell\'anteprima e partono col resto. Ogni scelta parte da «lascia com’è», e quello che resta così non viene toccato. Senza traccia leggi «Scegli prima da dove parti, qui sopra».'] },
    { tabella: [
      ['Impostazione', 'Scelte'],
      ['«Immagini da controllare»', '«non guardare niente», «guarda chi non ha ruoli», «guarda tutti». Lo fa Discord.'],
      ['«Di serie, le notifiche arrivano per»', '«tutti i messaggi», «solo quando ti nominano».'],
      ['«Dopo quanto sposta nell’angolo AFK»', '«un minuto», «cinque minuti», «un quarto d’ora», «mezz’ora», «un’ora».'],
      ['«Canale dei messaggi di Discord», «Canale delle regole», «Dove Discord avvisa lo staff», «Dove arrivano gli avvisi di sicurezza»', '«nessuno» o un canale di testo del server.'],
      ['«Angolo AFK»', '«nessuno» o un canale vocale. Se la traccia ha un Angolo AFK e il server non ne ha uno, compare anche quello.'],
      ['«Nel canale dei messaggi di Discord, non scrivere»', '«è entrato qualcuno», i boost, i consigli di Discord, gli adesivi di benvenuto, gli abbonamenti ai ruoli, gli adesivi degli abbonamenti.'],
      ['«Mostra la barra dei boost»', 'Acceso o spento.'],
      ['«Metti in pausa tutti gli inviti»', 'Il freno d\'emergenza: chi ha già il link non entra più, finché non la togli.'],
    ] },

    { h3: 'Cosa succede' },
    { p: [
      'Prima si guarda, poi si fa. «Fammi vedere cosa faresti» salva la traccia e mostra l\'elenco esatto di quello che il bot farebbe. «Costruisci» compare solo dopo, e ogni modifica lo nasconde di nuovo: si riguarda, poi si costruisce. «Salva e basta» salva la traccia senza guardare né costruire.',
      'Lo stesso tasto c\'è anche in «Chi entra» e in «Il filtro», e costruisce tutto: canali, ruoli, impostazioni, porta d\'ingresso e filtro.',
    ] },
    { tabella: [
      ['Nell\'anteprima', 'Cosa vuol dire'],
      ['«Crea»', 'Categorie e canali che nascono, le categorie prima dei canali.'],
      ['«Sistema»', 'Canali da rimettere nella loro categoria, o con l\'argomento o i permessi cambiati. Un canale spostato viene rimesso a posto, non rifatto.'],
      ['«Non è in questa traccia»', 'Quello che il server ha e la traccia no. Resta dov\'è. Accanto leggi quanti canali ha dentro e da quanto tempo è fermo, senza che il bot legga i messaggi.'],
      ['«Crea i ruoli», «Sistema i ruoli»', 'I ruoli che nascono e quelli che cambiano, con cosa cambia.'],
      ['«A chi vanno»', 'Il ruolo che va a te e le regole che la traccia scriverà nei «Ruoli».'],
      ['«Il filtro», «La porta d’ingresso»', 'Cosa nasce, cambia o sparisce nel filtro, e cosa cambia nella porta.'],
    ] },
    { p: [
      'L\'anteprima dice anche quello che il bot non può fare: i canali che non vede, i ruoli sopra il suo, quelli di altri bot, due ruoli con lo stesso nome, i privilegi che non ha (la cura è «Aggiorna i suoi permessi» nei «Ruoli»), le tinte e i segni che il server non ha ancora. Lo dice prima, e quelle cose restano fuori.',
      'Il bot fa fino a 80 mosse per giro. Se si ferma leggi «mi sono fermata al limite delle mosse: premi di nuovo per il resto». Se Discord chiede di aspettare leggi «mi sono fermata: Discord chiede di aspettare, riprova fra poco».',
      'Se fra il guardare e il fare qualcuno ha cambiato il server, il bot si ferma e ti chiede di guardare di nuovo. Alla fine l\'esito dice cosa ha creato, sistemato e cancellato, se il tuo ruolo adesso ce l\'hai, e se ci sono regole nuove nei «Ruoli»: partono quando accendi «Tieni i ruoli aggiornati». Quando qualcosa non riesce, l\'esito dice su cosa: quale canale, quale regola, quale porta.',
    ] },

    { h3: 'Fare piazza pulita' },
    { p: [
      'Di suo il costruttore va solo in avanti: crea quello che manca e sistema quello che è fuori posto. Con «Entra in modalità distruttiva» il server diventa esattamente la traccia, e quello che non c\'è dentro sparisce, ruoli compresi.',
      'La modalità dura 10 minuti e si chiude da sola. Finché è aperta, in cima a «Il server», «Chi entra» e «Il filtro» c\'è una fascia che lo dice, col tempo che resta e il tasto «Esci».',
      'Lì dentro l\'anteprima mette quello che sparisce sotto «Cancella» e «Cancella i ruoli», e il tasto diventa «Fai piazza pulita». I ruoli si cancellano per ultimi, dopo i canali. I ruoli sopra il bot e quelli di altri bot restano, e l\'anteprima li elenca col perché.',
      'Se fra le cose da cancellare c\'è un canale dove si è scritto nell\'ultimo mese, un ruolo con dei privilegi, o se sono più di 10, devi scrivere il nome del server. Su Discord un canale cancellato non torna.',
    ] },

    { h3: 'Cosa è stato fatto' },
    { p: ['Gli ultimi 20 giri del costruttore: quando, chi, se era piazza pulita, quanto ha creato, sistemato e cancellato. «Cosa non c’è più» apre i nomi di quello che è stato cancellato: sul server non ci sono più, qui sì.'] },

    // ─────────────────────────────────────────────────────────── DISCORD · CHI ENTRA
    { h2: 'Chi entra nel server', scheda: 'dcentra', p: [
      'La scheda «Chi entra» di Discord: la porta del tuo server. Chi può scrivere appena entra, cosa legge per primo e le domande che gli aprono i canali giusti.',
      'Fa parte della traccia scelta in «Il server». Senza, ogni carta dice «Scegli prima una traccia, nella scheda «Il server»».',
      'La prima schermata e le domande Discord le accende solo sui server di tipo Community. Se il tuo non lo è, nella carta delle domande leggi «Questo server non è di tipo Community…»: si cambia su Discord, nelle impostazioni del server.',
    ] },

    { h3: 'Chi può scrivere appena entra' },
    { p: ['Il livello di verifica di Discord, contro chi entra, spamma e sparisce. Le scelte: «lascia com’è», «nessuna: entra chiunque», «email verificata», «email + cinque minuti su Discord», «e dieci minuti dentro al server», «telefono verificato». «email + cinque minuti su Discord» ferma quasi tutto senza disturbare nessuno.'] },

    { h3: 'La prima schermata' },
    { p: [
      'Quello che legge chi apre il tuo server la prima volta. Se non c\'è leggi «Adesso chi arriva non legge niente.» e il tasto «Scrivi la schermata», che la prepara già scritta: la presentazione e i primi tre canali in mostra, ognuno con la sua faccina e la sua riga.',
      '«La riga che legge chi arriva» è la presentazione, fino a 140 caratteri. In «I canali da mettere in mostra» metti fino a 5 canali, che è il massimo che Discord mostra: per ognuno scegli il canale, un\'emoji e una descrizione di 50 caratteri.',
      'Faccina e riga si scrivono da sole, nella lingua del nome del canale, partendo dal nome, dal tipo e da cosa si parla lì dentro. Succede quando aggiungi un canale con «Aggiungi un canale», che propone il primo non ancora in mostra, e quando cambi canale su una riga. Quelle che hai scritto tu restano tue. «Scrivimi le descrizioni» riempie quelle vuote; per un canale di cui non si sa cosa dire leggi «Per questi canali non so cosa dire, la riga scrivila tu», e la scrivi tu. «Lascia stare la schermata» la toglie dalla traccia.',
      'I canali si scelgono per nome, anche quelli che la traccia deve ancora creare.',
    ] },

    { h3: 'Non da zero' },
    { p: ['«Scrivimi una porta di partenza» scrive una porta sui canali della traccia: i canali di partenza, la prima schermata coi primi tre canali e una domanda con una risposta per categoria. La porta nasce accesa solo se Discord la prenderebbe. Poi la cambi come vuoi. Se la traccia non ha canali leggi «Non ci sono canali da cui partire.».'] },

    { h3: 'Le domande' },
    { p: [
      'Chi entra risponde, e ogni risposta gli apre i canali che gli interessano e gli dà un ruolo. Trova solo quello che ha chiesto, invece di tutti i canali insieme.',
      '«Accendi la porta d’ingresso» la accende. In «I canali che vede chi entra, prima di rispondere» spunti i canali di partenza, fino a 20: oltre, la spunta non si mette e leggi il tetto. Discord accende la porta solo con almeno 7 canali fra quelli che chi entra si può aprire, contando anche quelli delle risposte, e con almeno 5 dove tutti possono scrivere: la carta tiene il conto mentre spunti, e se non bastano l\'anteprima lo dice.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Limiti'],
      ['La domanda', 'Il testo della domanda.', '100 caratteri'],
      ['«a tasti» / «a tendina»', 'Come si risponde.', ''],
      ['«una risposta sola»', 'Si può scegliere una sola risposta.', ''],
      ['«si deve rispondere»', 'Senza risposta non si entra.', ''],
      ['«chiedila appena entra»', 'La domanda compare all\'ingresso. Spenta, si trova dopo.', 'Accesa'],
      ['La risposta', 'Emoji, titolo e una riga di spiegazione.', 'Titolo 50, spiegazione 100 caratteri'],
      ['«Apre questi canali»', 'I canali che la risposta apre.', 'Fino a 20'],
      ['«E dà questi ruoli»', 'I ruoli che la risposta dà.', 'Fino a 10'],
      ['«Aggiungi una risposta»', 'Una risposta in più.', 'Fino a 20 per domanda'],
      ['«Aggiungi una domanda» / «Togli la domanda»', 'Una domanda in più o in meno.', 'Fino a 8 domande'],
    ] },
    { p: [
      'Una domanda senza titolo o senza risposte non si costruisce, e nemmeno una risposta senza titolo. Chi ha già risposto dovrà rispondere di nuovo solo alle domande che cambiano.',
      'Se Discord direbbe di no alla porta, l\'anteprima dice perché e il resto parte lo stesso. Se una risposta nomina un canale che al momento di costruire non c\'è, l\'esito lo dice.',
    ] },

    { h3: 'Cosa succede' },
    { p: ['Gli stessi tre tasti de «Il server»: «Fammi vedere cosa faresti», «Costruisci», «Salva e basta». La porta parte insieme ai canali, in un giro solo. Passare fra «Il server», «Chi entra» e «Il filtro» non chiede di salvare: sono parti della stessa traccia.'] },

    // ─────────────────────────────────────────────────────────── DISCORD · IL FILTRO
    { h2: 'Il filtro del server', scheda: 'dcfiltro', p: [
      'La scheda «Il filtro» di Discord: cosa sul tuo server non si scrive. È la moderazione automatica di Discord e gira dentro Discord: ferma il messaggio prima che esista. Tu scrivi le regole qui, poi fa tutto Discord.',
      'Fa parte della traccia scelta in «Il server», e non chiede un server di tipo Community.',
    ] },

    { h3: 'Cosa non si scrive' },
    { p: [
      'La carta conta le regole della traccia. «Mettimi le regole di base» mette le tre cose che si accendono su qualunque server: le liste di Discord (parolacce e insulti pesanti), lo spam e le raffiche di menzioni, fino a 5 per messaggio. Passano i ruoli della traccia che si chiamano come lo staff (moderatori, staff, admin). I tipi che hai già non li tocca.',
      'Le parole tue le scrivi tu, perché dipendono dal tuo server. Sotto ci sono cinque carte, una per tipo di regola. Ogni carta ha «Aggiungi» finché c\'è posto; una carta vuota dice «Non c’è, e va benissimo così finché non serve.».',
      'In tutte le carte ogni regola si apre e ha questi controlli.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base e limiti'],
      ['Nome', 'Solo per le parole: come si chiama la lista.', '100 caratteri'],
      ['«accesa»', 'Spenta, la regola resta scritta ma non ferma niente.', 'Accesa'],
      ['«ferma il messaggio»', 'Il messaggio non esce.', 'Acceso'],
      ['Messaggio', 'Cosa compare a chi viene fermato.', '150 caratteri'],
      ['«Avvisa in»', 'Un canale dove Discord scrive cosa è successo.', '«da nessuna parte»'],
      ['«E mette in pausa per»', 'Solo parole e menzioni: «un minuto», «dieci minuti», «un’ora», «un giorno», «una settimana».', '«niente pausa»'],
      ['«Chi e dove non lo tocca»', '«Questi ruoli passano» e «E in questi canali non guarda».', 'Fino a 20 ruoli e 50 canali'],
      ['«Togli la regola»', 'La toglie dalla traccia.', ''],
    ] },
    { p: ['Una regola che non fa niente ferma almeno il messaggio. Con la traccia letta dal tuo server, le regole che hai già su Discord entrano nella traccia. Quelle che ci sono e la traccia non prevede restano dove sono, e l\'anteprima le elenca.'] },

    { h3: 'Parole da non scrivere' },
    { p: [
      'Le tue liste, una per ogni cosa che vuoi fermare. Fino a 6 regole.',
      '«Le parole, una per riga»: fino a 1000, di 60 caratteri l\'una. «insult*» prende tutto quello che comincia così; «*truffa*» la prende anche dentro altre parole. «E queste passano lo stesso»: le eccezioni, fino a 100. Una regola di parole senza parole non si salva e non si costruisce, e finché è vuota la carta lo dice.',
    ] },

    { h3: 'Le liste già pronte di Discord' },
    { p: ['Una regola sola. Spunti quali accendere: «parolacce», «roba sessuale», «insulti pesanti». Le aggiorna Discord in tutte le lingue. «Queste passano lo stesso» tiene fino a 1000 eccezioni. Una regola di liste senza nessuna lista spuntata non si salva e non si costruisce, e la carta lo dice.'] },

    { h3: 'Spam' },
    { p: ['Una regola sola. Lo riconosce Discord: link ripetuti, messaggi in serie, roba mandata a tutti in privato.'] },

    { h3: 'Raffiche di menzioni' },
    { p: ['Una regola sola, contro chi entra e sveglia mezzo server. «Al massimo, in un messaggio» dice quante persone si possono nominare: di base 5, da 1 a 50. «E ferma le raffiche automatiche di Discord» accende la difesa di Discord contro chi nomina troppa gente; di base è accesa.'] },

    { h3: 'Nomi e profili' },
    { p: ['Una regola sola. Le stesse parole, cercate nel nome e nel profilo di chi entra, con gli stessi limiti di «Parole da non scrivere». In più c\'è «e lo tiene fuori finché non cambia nome», di base spento.'] },

    { h3: 'Cosa succede' },
    { p: ['Gli stessi tre tasti de «Il server». Il filtro parte insieme ai canali, in un giro solo.'] },
  ],
  faq: [
    { d: 'Ho collegato il bot Telegram ma quando vado in diretta non arriva niente.', r: 'Controlla in ordine. Serve il piano Base. «Avvisa il gruppo quando vado in diretta» dev\'essere spuntato e salvato. Il posto dev\'essere «Attiva». In «Quale avviso va dove» la riga della tua diretta non deve dire «non arriva da nessuna parte».' },
    { d: '«Rileva gruppo» dice che non trova nessun gruppo.', r: 'Scrivi <code>/collega</code> dentro il gruppo, poi riprova. Un comando arriva sempre al bot. Un messaggio normale no, se la privacy del bot è accesa.' },
    { d: 'L\'avviso arriva nel «Generale» e non nel topic che voglio.', r: 'Scrivi <code>/collega</code> dentro quel topic e premi «Aggiungi gruppo, canale o topic»: il topic diventa un posto suo. Poi togli la spunta dal gruppo generale in «Quale avviso va dove».' },
    { d: 'Lo scudo non si accende.', r: 'Guarda l\'elenco in cima alla carta «Scudo all\'ingresso»: la riga rossa dice cosa manca e come sistemarlo. Di solito è il permesso «Invita utenti tramite link» del bot amministratore.' },
    { d: 'Chi chiede di entrare non riceve la prova.', r: 'Senza guardiano la prova arriva in privato, e il bot può scrivere solo nei primi cinque minuti dopo la richiesta. Se il messaggio non parte la richiesta aspetta che decidi tu, e nell\'elenco «Chi aspetta che decidi tu» leggi «il messaggio in privato non è partito». Con il bot come guardiano la prova si apre subito, dentro Telegram.' },
    { d: 'Premo «Entra» sulla porta ed entro senza prova.', r: 'Succede con lo scudo spento: allora il tasto porta dritto nel gruppo. Con lo scudo acceso apre la prova lì. Se sei già nel gruppo Telegram ti porta dentro e basta: la prova la vedi nell\'anteprima della porta, con «Fai la prova nell\'anteprima».' },
    { d: 'Qualcuno è entrato senza fare la prova.', r: 'Lo scudo vede solo chi chiede di entrare. Se il gruppo è pubblico e si entra senza chiedere, nell\'elenco in cima alla carta leggi «Per entrare bisogna chiedere»: in Telegram accendi «Approva nuovi membri», oppure tieni acceso anche il cancello. Chi lo fai entrare tu a mano non fa la prova.' },
    { d: 'Qualcuno chiede di entrare e non so come farlo entrare.', r: 'Nella scheda «Telegram», carta «Scudo all\'ingresso», elenco «Chi aspetta che decidi tu»: premi «Fai entrare». Se hai collegato la chat privata del bot puoi farlo anche dal messaggio che ti arriva lì.' },
    { d: 'Ho premuto «Fai entrare» e leggo che la richiesta non c\'è più.', r: 'L\'ha ritirata chi l\'aveva fatta, oppure l\'ha già decisa un amministratore dentro Telegram: un rifiuto deciso lì Telegram non ce lo dice. Se quella persona chiede di nuovo, la ritrovi nell\'elenco.' },
    { d: 'Il cancello non si accende.', r: 'Servono «Bot interattivo nel gruppo» acceso e il bot amministratore del gruppo con il permesso «Blocca utenti». Il pannello ti dice quale delle due manca.' },
    { d: 'Ho confermato la settimana ma ho visto un errore. Posso fermarla?', r: 'Sì, fino al momento dell\'uscita. Nel messaggio che il bot ti ha mandato in privato su Telegram premi «Non pubblicare», e nella pagina che si apre premi il tasto. Lo stesso si fa dalla mail e dal pannello.' },
    { d: 'Il bot non dà un ruolo su Discord.', r: 'Quasi sempre il ruolo sta sopra quello del bot. Su Discord, in Impostazioni server → Ruoli, trascina il ruolo del bot sopra. La carta «Il collegamento» elenca i ruoli che stanno sopra.' },
    { d: '!discord non risponde in chat.', r: 'La carta «La porta d’ingresso» dice perché. Di solito «Tieni i ruoli aggiornati» è spento.' },
    { d: 'Negli Avvisi non posso scegliere un canale.', r: 'Il bot lì non può scrivere. Su Discord dai al suo ruolo il permesso di vedere il canale e scriverci, poi riapri la scheda.' },
    { d: 'Gli avvisi su Discord non partono.', r: 'Servono il piano Base, il bot nel server e un canale «Acceso» con quell\'avviso spuntato. «Prova» ti fa vedere dove finisce.' },
    { d: 'Sul calendario del server non compare niente.', r: 'In «Gli appuntamenti sul calendario» controlla che «Metti la mia settimana sul calendario del server» sia acceso, che «Dove succede» abbia il link del tuo canale e che la tua settimana non sia vuota. Poi premi «Mettili adesso»: se leggi che al bot manca «Creare eventi», riscegli il server da «Cambia server» nei «Ruoli».' },
    { d: 'La porta d\'ingresso non si accende.', r: 'Discord la accende solo sui server di tipo Community, con almeno 7 canali fra quelli che chi entra si può aprire e almeno 5 dove tutti possono scrivere. L\'anteprima dice cosa manca.' },
    { d: 'Sono moderatore del canale e nelle schede Discord non posso fare niente.', r: 'Le schede Discord le usa solo il proprietario del canale. Da moderatore le apri, e ognuna te lo dice al posto dei suoi controlli.' },
    { d: 'Ho cancellato un canale con la piazza pulita. Lo recupero?', r: 'No: su Discord un canale cancellato non torna. In «Cosa è stato fatto» restano i nomi di quello che è stato tolto.' },
  ],
};
