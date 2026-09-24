// Manuale: Manuale della moderazione: antispam e scudo anti-bot. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'moderazione',
  schede: ['regole', 'scudo', 'registro'],
  titolo: 'Manuale della moderazione: antispam e scudo anti-bot | SocialBot',
  h1: 'Manuale della moderazione: antispam e scudo anti-bot',
  desc: 'Parole vietate, antispam con le soglie vere, lo scudo anti-bot con i suoi sei livelli e il registro: cosa fa ogni controllo, di base e limiti.',
  aggiornata: '2026-09-24',
  corpo: [
    { p: [
      'La moderazione sta in <em>Chat e pubblico</em> → <em>Moderazione</em>. In cima trovi tre schede: <strong>Chat</strong>, <strong>Scudo</strong> e <strong>Registro</strong>.',
      '<em>Chat</em> pulisce i messaggi di tutti i giorni: parole vietate, spam, link. <em>Scudo</em> difende il canale da follow-bot e hate-raid. <em>Registro</em> ti racconta cosa ha fatto lo scudo e ti lascia decidere sui casi dubbi.',
      'Tutte e tre sono comprese nel pacchetto gratuito <strong>Essenziale</strong>. Lavorano sulla chat di <strong>Twitch</strong>: se il tuo canale è su Kick, YouTube o Discord, le tre schede mostrano «Solo su Twitch».',
      'Il bot agisce con i permessi di moderazione che hai concesso tu su Twitch. Non c\'è un account estraneo da promuovere a moderatore.',
    ] },

    { h2: 'Moderazione: parole vietate e antispam', scheda: 'regole', p: [
      'I filtri sui messaggi: le parole che il bot non dirà mai e l\'antispam che pulisce la chat da solo.',
      'Le impostazioni di questa scheda le cambi tu e anche i moderatori che hai invitato nel pannello.',
    ] },

    { h3: 'Parole vietate' },
    { p: [
      'Scrivi le parole in «Elenco parole vietate», una per riga, e premi «Salva». Tiene fino a <strong>100 parole</strong>, lunghe al massimo 100 caratteri ciascuna.',
      'Il bot <strong>non le dirà mai</strong>: una sua risposta che ne contiene una non parte.',
      'Se qualcuno le scrive in chat, il bot risponde «@nome evitiamo questo linguaggio qui 🙏». Lo dice al massimo una volta ogni 30 secondi. A quel messaggio non risponde e non esegue comandi.',
      'Il messaggio <strong>resta in chat</strong>: il richiamo non cancella niente. Per toglierlo serve un moderatore.',
      'Il confronto ignora maiuscole e accenti, e cerca la parola anche dentro altre parole. Una parola corta scatta più spesso di quanto pensi: «ora» ferma anche «allora». Scegli parole abbastanza lunghe da non comparire per caso.',
      'Tu e i moderatori della chat non venite richiamati. I VIP sì.',
      'Il richiamo vale anche nelle chat di Kick e YouTube che hai collegato al canale.',
    ] },

    { h3: 'Antispam automatico' },
    { p: [
      'Elimina da solo lo spam e, a chi insiste, dà un timeout crescente. Si accende con «Attiva l\'antispam», in cima alla carta. Di base è spento.',
      'Quando l\'interruttore è spento il resto della carta si attenua: le scelte restano, ma non lavorano.',
      'Per cancellare messaggi e dare timeout servono i permessi di moderazione. Se li hai, accanto all\'interruttore leggi «permessi attivi». Se mancano, leggi «Per eliminare i messaggi servono i permessi di moderazione.»: premi «Concedi i permessi» e autorizza su Twitch.',
      '<strong>Tu e i moderatori siete sempre esenti</strong> da tutti i filtri. I VIP da tutti tranne quello dei link, che ha una regola sua. Gli abbonati passano il filtro dei link solo se il livello scelto li comprende.',
      'L\'antispam lavora sempre, in diretta e fuori diretta. Guarda solo la chat di Twitch.',
      'Dopo ogni modifica premi «Salva antispam».',
    ] },

    { p: ['<strong>I link.</strong> «Blocca i link non autorizzati» è acceso di base. In «Possono postare link:» scegli chi può metterli:'] },
    { tabella: [
      ['Scelta', 'Chi può postare link'],
      ['«solo mod»', 'Tu e i moderatori. I VIP no.'],
      ['«VIP e mod»', 'Tu, i moderatori e i VIP.'],
      ['«sub, VIP e mod» (di base)', 'Tu, i moderatori, i VIP e gli abbonati.'],
      ['«tutti (non bloccare)»', 'Chiunque: il filtro dei link non ferma nessuno.'],
    ] },
    { p: [
      'In «Domini sempre permessi (uno per riga)» metti gli indirizzi che passano per chiunque: il tuo Discord, il tuo sito, i tuoi social. Tiene fino a <strong>30 righe</strong>. Puoi incollare anche l\'indirizzo intero: <code>https://</code> e <code>www.</code> vengono tolti da soli.',
      'Una riga con solo il dominio, come <code>youtube.com</code>, vale anche per i suoi sottodomini. Una riga con un percorso, come <code>instagram.com/tuonome</code>, fa passare solo quel percorso e quello che sta sotto.',
      'Senza scriverli sono già permessi il tuo canale Twitch, le clip di Twitch e andryxify.it. Il pannello lo ricorda sotto il campo.',
      'Il controllo guarda <strong>l\'indirizzo</strong>, non il testo intorno. Nominare un dominio permesso non fa passare un link diverso. Se un messaggio ha più link, ognuno deve essere permesso.',
      'Un indirizzo con <code>http</code>, con <code>www.</code> o con un percorso (<code>sito.it/pagina</code>) conta sempre come link. Un dominio nudo conta solo se finisce in un\'estensione che in chat non si scrive per caso, come <code>.com</code>, <code>.net</code>, <code>.org</code>, <code>.tv</code>, <code>.gg</code>. Così «lascia stare.io ci provo» resta una frase.',
    ] },

    { p: ['<strong>Cosa filtrare.</strong> Ogni voce ha il suo interruttore. Il motivo è quello che il bot scrive in chat quando interviene.'] },
    { tabella: [
      ['Voce nel pannello', 'Di base', 'Quando scatta', 'Motivo in chat'],
      ['«Copypasta e messaggi ripetuti»', 'acceso', 'La stessa persona manda lo stesso testo per la terza volta in 40 secondi. Contano i testi di almeno 6 caratteri.', 'messaggio ripetuto (spam)'],
      ['«Flood: troppi messaggi di fila»', 'acceso', 'La stessa persona manda 6 messaggi in 8 secondi.', 'flood (troppi messaggi)'],
      ['«Messaggi TUTTI MAIUSCOLI»', 'acceso', 'Almeno 12 lettere, e almeno l\'80% sono maiuscole.', 'troppe maiuscole'],
      ['«Valanghe di @menzioni»', 'acceso', 'Quattro o più <code>@nome</code> nello stesso messaggio.', 'troppe menzioni'],
      ['«ASCII-art, «zalgo» e muri di simboli»', 'spento', 'Testo pieno di segni sovrapposti, un blocco unico di 40 o più caratteri senza spazi, o un messaggio fatto quasi solo di simboli. I messaggi sotto gli 8 caratteri non contano.', 'troppi simboli / caratteri strani'],
      ['«Messaggi più lunghi di … caratteri»', 'spento, 350', 'Il messaggio supera il numero. Da 50 a 500.', 'messaggio troppo lungo'],
      ['«Raffiche di più di … emoji per messaggio»', 'spento, 8', 'Il messaggio ha più emoji del numero. Da 1 a 50.', 'troppe emoji'],
    ] },
    { p: [
      'Lo stesso messaggio copiato da persone diverse non è compito dell\'antispam: lo ferma lo scudo, col coro.',
      'Un blocco di 40 caratteri senza spazi può essere anche un indirizzo lungo. Se accendi i simboli, tienilo presente.',
      'Un messaggio con i <strong>Bit</strong> non conta mai fra ripetizioni e flood: cinque cheer uguali di fila sono qualcuno che paga. Il contenuto invece si controlla lo stesso: link, maiuscole, simboli, lunghezza.',
    ] },

    { p: ['<strong>Quando interviene.</strong> Con «Timeout crescente ai recidivi: la prima volta cancella e basta, poi 1 minuto, 5, 10» acceso (di base) succede questo alla stessa persona:'] },
    { tabella: [
      ['Volta', '1ª', '2ª', '3ª', '4ª e oltre'],
      ['Cosa succede', 'messaggio cancellato', 'cancellato e timeout 1 minuto', 'cancellato e timeout 5 minuti', 'cancellato e timeout 10 minuti'],
    ] },
    { p: [
      'Il conto si azzera dopo <strong>10 minuti</strong> senza messaggi filtrati. Se spegni il timeout crescente, il bot cancella e basta, sempre.',
      'Con «Avvisa in chat quando elimina» acceso (di base) il bot scrive «@nome occhio: <em>motivo</em> 🚫 (messaggio rimosso)». Quando c\'è anche il timeout scrive «@nome niente spam qui 🚫 (<em>motivo</em>)» con la durata della pausa. Spento, lavora in silenzio.',
    ] },

    { h2: 'Scudo anti-bot', scheda: 'scudo', p: [
      'La difesa dagli attacchi: le ondate di finti follower e gli account-bot che spammano in chat. In dubbio avvisa, non caccia le persone vere.',
      'Le scelte dello scudo le cambi tu e anche i moderatori del pannello. Lo stato dello scudo e «Le tue liste» li vede solo il proprietario del canale.',
    ] },

    { h3: 'Lo scudo' },
    { p: [
      '«Attiva la protezione anti-bot» accende tutto lo scudo. Di base è spento. Quando è spento, le carte sotto si attenuano.',
      'Sotto l\'interruttore c\'è lo stato di adesso:',
    ] },
    { ul: [
      '<strong>Acceso</strong> o <strong>Spento</strong>, sotto «protezione».',
      'Il livello, sotto «adesso»: «in pace», «sto guardando», «in allerta», «in difesa», «sotto attacco» o «serrata».',
      'Il numero sotto «follow per allarme». È la soglia che lo scudo usa davvero: parte da quella che imposti e, quando ha imparato il ritmo abituale del tuo canale, può salire. Non scende mai sotto la tua.',
      '«in fila»: le azioni del tuo canale che aspettano il loro turno con Twitch. Compare solo se ce ne sono.',
      '«sola osservazione», se l\'hai accesa.',
      '«Attacco in corso da …» con il collegamento «Guarda nel registro», durante un attacco.',
      '«Per bannare davvero servono i permessi di moderazione.» con «Concedi i permessi», se i permessi mancano.',
    ] },
    { p: [
      'Se lo stato non si carica leggi «Non disponibile ora.»: ricarica la pagina.',
      'Per chiudere la chat, attivare lo Shield Mode e togliere i follow finti servono tre permessi aggiunti col tempo. Se in <em>Stato</em> compare la carta «Nuovi permessi da concedere», premi «Aggiorna i permessi». Senza il permesso di blocco lo scudo banna al posto di bloccare, e il follow finto resta.',
    ] },

    { p: ['<strong>Come si comporta.</strong>'] },
    { tabella: [
      ['Controllo', 'Di base', 'Cosa fa'],
      ['«Quanto presto reagire:»', 'bilanciata', 'Quanto presto lo scudo sale di livello. «prudente» aspetta più prove, «aggressiva» sale prima.'],
      ['«Cosa fare quando è sicuro:»', 'bannare', '«bannare», «timeout 14 giorni» o «solo segnalare». Vale per i nomi da bot, per la lista «Blocca sempre», per il controllo dei nuovi follower e per «banna anche i follow sospetti».'],
      ['«Sola osservazione: decidi tutto tu, lo scudo non tocca nessuno»', 'spento', 'Lo scudo lavora come sempre e scrive nel registro cosa avrebbe fatto, senza bannare, bloccare, cancellare o trattenere niente.'],
      ['«Avvisa in chat quando interviene»', 'acceso', 'Il bot scrive in chat quando lo scudo agisce. I messaggi sono più sotto.'],
    ] },
    { p: [
      'Su un <strong>follow</strong>, «bannare» e «timeout 14 giorni» diventano un <strong>blocco</strong>. Il ban lascia l\'account fra i tuoi follower; il blocco toglie anche il follow, e il numero torna pulito. In chat vale quello che scegli.',
      'Con «solo segnalare» lo scudo non tocca nessuno: scrive «⚠️ Possibile bot: @nome (<em>motivo</em>)» e mette il caso in «Da rivedere» nel registro.',
      'La <strong>sola osservazione</strong> serve a vederlo lavorare sul tuo canale prima di lasciarlo agire. Quando ti fidi, spegnila e premi «Salva lo scudo».',
    ] },

    { p: ['<strong>I sei livelli.</strong> Lo scudo sale da solo quando arrivano prove di un attacco, e scende da solo quando è passato. Non devi essere davanti al computer.'] },
    { tabella: [
      ['Livello nel pannello', 'Cosa succede'],
      ['«in pace»', 'Il canale normale. Lavorano le difese che hai acceso.'],
      ['«sto guardando»', 'Lo scudo guarda di più e non tocca nessuno. Controlla i nomi da bot e chi guarda molti canali anche se hai spento quelle voci.'],
      ['«in allerta»', 'Gli account appena creati che scrivono vengono segnalati ai moderatori, anche se il trattenimento è spento.'],
      ['«in difesa»', 'Chat lenta, un messaggio ogni 10 secondi. I messaggi degli account nati da poco vengono trattenuti.'],
      ['«sotto attacco»', 'Chat ai soli follower (chi segue da almeno 10 minuti) e Shield Mode di Twitch. Un\'ondata di follow riconosciuta come finta viene bloccata tutta insieme.'],
      ['«serrata»', 'Come «sotto attacco», con la porta più stretta: chat lenta a 30 secondi e solo chi segue da almeno 60 minuti.'],
    ] },
    { p: [
      'Più il livello sale, più si allunga l\'età minima di un account per scrivere senza essere trattenuto. Non scende mai sotto le ore che hai scelto tu.',
      'Si sale in fretta e si scende piano: dopo <strong>5 minuti</strong> di calma lo scudo scende di un gradino, e spegne subito quello che il livello più basso non prevede. Se la calma continua, continua a scendere fino a «in pace».',
      'Lo scudo spegne solo quello che ha acceso lui. Se la chat ai soli follower l\'avevi messa tu prima dell\'attacco, resta com\'è.',
      'Se il bot si riavvia durante un attacco, alla ripartenza riapre quello che aveva chiuso.',
      'Un\'ondata di follow che sembra gente vera, per esempio dopo una clip che gira o un raid, alza l\'attenzione ma da sola non chiude la chat. Per arrivare a «sotto attacco» serve la prova che è una macchina: follow a passo regolare, nomi usciti dalla stessa fabbrica, oppure un coro in chat.',
      'Il <strong>coro</strong> è lo stesso messaggio scritto da più account diversi nel giro di mezzo minuto: è la firma dell\'hate-raid. Lo scudo cancella quei messaggi e sale a «sotto attacco». I messaggi corti, come un saluto o un\'emote, non contano. Nei dieci minuti dopo un raid vero servono molti più account, perché chi arriva saluta tutto insieme.',
      'Quando arriva un raid da almeno 50 spettatori, con «Avvisa in chat quando interviene» acceso, l\'overlay ti chiede di controllare che sia genuino e il registro lo annota.',
    ] },

    { p: ['<strong>Cosa scrive in chat</strong>, con «Avvisa in chat quando interviene» acceso:'] },
    { tabella: [
      ['Quando', 'Messaggio'],
      ['Lo scudo arriva a «sotto attacco»', '«🛡️ Scudo alzato: <em>motivo</em>. Chat ai soli follower finché non passa.»'],
      ['Torna in pace dopo un attacco', '«🛡️ Passata. Chat riaperta.»'],
      ['Blocca un\'ondata finta', '«🛡️ Ondata artificiale: sto ripulendo N account finti.»'],
      ['«solo segnalare» su un possibile bot', '«⚠️ Possibile bot: @nome (<em>motivo</em>)»'],
      ['Trattiene il messaggio di un account nuovo', '«🛡️ @nome, il tuo messaggio aspetta un mod: l\'account è nuovo. Mod, se va bene: !permetti nome»'],
      ['Segnala un account nuovo senza trattenerlo', '«👀 @nome ha un account nuovo di zecca (N h): occhio, mod.»'],
    ] },
    { p: ['I due avvisi sugli account nuovi si dicono una volta per persona, non a ogni messaggio.'] },

    { h3: 'Le regole dello scudo' },
    { p: ['<strong>Le ondate di follow.</strong> Un attacco follow-bot sono tanti follow in pochi secondi.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Rileva le ondate di follow (attacco follow-bot)»', 'acceso', '', 'Conta i follow e fa scattare l\'allarme.'],
      ['«Allarme oltre … follow in … secondi»', '10 follow in 30 secondi', 'da 3 a 100 follow, da 5 a 300 secondi', 'Con 10 e 30, il decimo follow nel giro di mezzo minuto fa scattare l\'allarme.'],
      ['«Durante un\'ondata, banna anche i follow sospetti (aggressivo)»', 'spento', '', 'Finché dura l\'allarme, ogni nuovo follow riceve l\'azione di «Cosa fare quando è sicuro», cioè il blocco. Colpisce anche le persone vere arrivate in quel momento.'],
    ] },
    { p: [
      'L\'allarme finisce nel registro e alza il livello dello scudo. Da solo non banna e non blocca nessuno.',
      'Quando lo scudo arriva a «sotto attacco» e l\'ondata è riconosciuta come finta, la blocca <strong>tutta insieme</strong>, compresi i primi follow che hanno fatto scattare l\'allarme. Chi scrive nel tuo canale da tempo viene lasciato stare.',
    ] },

    { p: ['<strong>Chi fermare.</strong>'] },
    { tabella: [
      ['Controllo', 'Di base', 'Cosa fa'],
      ['«Account con nomi da follow-bot noti»', 'acceso', 'Chi ha il nome di un follow-bot conosciuto, o la forma tipica dei nomi dei bot che vendono follower, riceve l\'azione scelta. Vale sui follow e in chat.'],
      ['«Usa la lista di bot noti che si aggiorna da sola»', 'acceso', 'Aggiunge ai nomi una lista pubblica di account-bot. Si aggiorna da sola ogni 12 ore. Sotto le voci leggi «Lista aggiornata: N bot noti» con la data.'],
      ['«Chi guarda molti canali insieme senza scrivere mai»', 'acceso', 'Nota chi risulta presente in molti canali nello stesso momento e da te non ha mai scritto. Non tocca nessuno: il caso finisce in «Da rivedere».'],
      ['«Controlla ogni nuovo follower: appena creato, senza foto, bio vuota»', 'spento', 'Guarda il profilo di ogni nuovo follower. Fa una richiesta a Twitch per ogni follow, e durante un\'ondata non lavora.'],
    ] },
    { p: [
      'Il controllo dei nuovi follower da solo non fa agire lo scudo: un account nuovo, senza foto e senza bio è anche la descrizione di uno spettatore appena arrivato. Lo scudo agisce solo se c\'è anche un indizio forte, come il nome da bot o la presenza in molti canali. Senza, mette il caso in «Da rivedere».',
      'I <strong>bot di servizio</strong> non si toccano mai: Nightbot, StreamElements, Streamlabs, Moobot, Fossabot, Sery_Bot, Sound Alerts e gli altri noti, una ventina in tutto.',
    ] },

    { p: ['<strong>Gli account appena creati.</strong> Twitch ha una modalità «Restricted» che mostra i messaggi sospetti solo ai moderatori, ma un bot non può accenderla. Questa è la cosa più vicina.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Trattieni i messaggi degli account appena creati»', 'spento', '', 'Accende il controllo.'],
      ['«Account più giovane di … ore →»', '24 ore', 'da 1 a 720', 'Sotto questa età un account è «appena creato».'],
      ['«trattieni il messaggio»', 'scelto', '', 'Il messaggio viene cancellato prima che la chat lo legga. La persona resta in chat.'],
      ['«lascialo, avvisa i mod»', '', '', 'Il messaggio resta. Il bot avvisa i moderatori e il caso va in «Da rivedere».'],
    ] },
    { p: [
      'Non vengono mai toccati tu, i moderatori, i VIP e gli abbonati, i messaggi con i Bit e i nomi in «Non toccare mai». Seguire il canale non basta: il follow è un clic, e i follow-bot lo fanno.',
      'Se Twitch non dice quando è nato l\'account, il messaggio passa.',
      'Per far scrivere una persona trattenuta, tu o un moderatore della chat scrivete <code>!permetti nome</code>. Il bot risponde «✓ @nome ora può scrivere.» e il nome entra in «Non toccare mai». Il comando funziona solo con lo scudo acceso. Se l\'hai rinominato in <a href="/manuale/moduli">Comandi</a>, vale il nome nuovo, anche nell\'avviso in chat.',
      'Sotto attacco lo scudo accende questo controllo da solo, anche se l\'hai lasciato spento: «in allerta» segnala, da «in difesa» trattiene.',
      'Dopo ogni modifica a questa carta e a quella sopra premi «Salva lo scudo».',
    ] },

    { h3: 'Le tue liste' },
    { p: [
      'Due liste di nomi Twitch. <strong>Si salvano da sole</strong> appena aggiungi o togli un nome: scrivi il nome e premi «Aggiungi», oppure premi × accanto a un nome per toglierlo. Una lista senza nomi dice «Vuota.».',
      '«Blocca sempre»: questi nomi vengono fermati con l\'azione di «Cosa fare quando è sicuro», sui follow e in chat.',
      '«Non toccare mai»: lo scudo non li ferma mai, come moderatori, VIP e abbonati. L\'antispam invece li controlla come tutti gli altri.',
      'Ogni lista tiene fino a <strong>200 nomi</strong>. Ci entrano anche le decisioni prese in «Da rivedere» e le persone fatte scrivere con <code>!permetti</code>. Quando una lista è piena, il pannello lo dice con «La lista è piena (200 nomi): togline qualcuno, poi aggiungi.», e un caso di «Da rivedere» resta lì da decidere. Nella chat, <code>!permetti</code> risponde che la lista è piena e chiede di togliere qualcuno dal pannello.',
      'Questa carta la vede solo il proprietario del canale.',
    ] },

    { h2: 'Registro dello scudo', scheda: 'registro', p: [
      'Cosa ha fatto lo scudo, i casi su cui decidi tu e la pulizia dopo un attacco. Non ci sono impostazioni.',
      'Il registro lo vede solo il proprietario del canale. I moderatori del pannello non lo vedono.',
      'Le carte compaiono solo quando hanno qualcosa da mostrare. Se non si carica leggi «Non disponibile ora.»: ricarica la pagina.',
    ] },

    { h3: 'Come è andata' },
    { tabella: [
      ['Numero', 'Cosa conta'],
      ['«oggi»', 'Le righe del registro delle ultime 24 ore, compresi i cambi di livello.'],
      ['«7 giorni»', 'Le stesse righe, negli ultimi sette giorni.'],
      ['«da rivedere»', 'I casi che aspettano una tua decisione.'],
      ['«in sospeso»', 'Le azioni del tuo canale che Twitch non ha eseguito.'],
      ['«bot noti»', 'Quanti nomi ha la lista pubblica di bot, con la data dell\'ultimo aggiornamento.'],
    ] },
    { p: ['Sotto può comparire «Segnalati e poi rivelatisi persone vere: X su Y.». Sono gli account che lo scudo aveva giudicato macchine e che poi hanno scritto in chat. Se il numero cresce, porta «Quanto presto reagire:» su «prudente».'] },

    { h3: 'Da rivedere' },
    { p: ['I casi in cui lo scudo ha avvisato senza agire: «solo segnalare», gli account nuovi lasciati passare, i profili sospetti senza indizio forte, chi guarda molti canali. Per ognuno vedi il nome, il tipo di caso, il motivo e l\'ora.'] },
    { tabella: [
      ['Pulsante', 'Cosa fa'],
      ['«Blocca sempre»', 'Mette il nome in «Blocca sempre» e lo banna subito, se hai concesso i permessi. Leggi «Bloccato e bannato ✓», oppure «Messo in blocklist ✓» se il ban non si poteva fare.'],
      ['«Permetti»', 'Mette il nome in «Non toccare mai».'],
      ['«Ignora»', 'Chiude il caso. Non cambia nessuna lista.'],
    ] },
    { p: ['Dopo la scelta il caso sparisce dall\'elenco.'] },

    { h3: 'Gli attacchi' },
    { p: [
      'Un attacco per volta, non trecento righe. Ogni riga dice quando è cominciato, che tipo di attacco era, il livello più alto raggiunto e quanto è durato, oppure «in corso». Vedi gli ultimi 20.',
      'Un attacco che riprende entro 15 minuti dalla fine continua nella stessa riga. Gli attacchi restano nel registro per 180 giorni.',
      'Premi una riga per aprirla. Dentro trovi chi c\'era, contato per giudizio, e gli ultimi fatti in ordine di tempo.',
    ] },
    { tabella: [
      ['Giudizio', 'Chi è'],
      ['«certi»', 'Riconosciuti come parte dell\'attacco: lo scudo li ha fermati.'],
      ['«sospetti»', 'Arrivati durante l\'ondata finta, senza prove che vengano dalla stessa fabbrica. Lo scudo non li ha toccati.'],
      ['«legittimi»', 'Arrivati durante l\'attacco senza niente contro. Restano dove sono.'],
    ] },
    { p: [
      '<strong>La pulizia.</strong> Se ci sono follower giudicati bot, leggi «Si possono togliere N follower giudicati bot.». Si tolgono i <strong>certi</strong> di cui Twitch ha dato l\'id, con il blocco, così sparisce anche il follow. I legittimi non compaiono nemmeno. I nomi in «Non toccare mai» e i bot di servizio restano fuori.',
      'Per confermare riscrivi quel numero in «Riscrivi il numero per confermare:» e premi «Togli i follower finti». Il messaggio che compare ti dice quanti account toglie. Le singole azioni le ritrovi in «Interventi recenti».',
      'Se nel frattempo il numero è cambiato, la conferma non vale: il pannello ti dice il numero nuovo, e lo riscrivi.',
      'In sola osservazione la pulizia scrive cosa farebbe e non toglie nessuno.',
      'Se non c\'è niente da togliere leggi «Niente da ripulire: nessun account giudicato bot con l\'id di Twitch a disposizione.».',
    ] },

    { h3: 'Rimaste in sospeso' },
    { p: [
      'Le azioni del tuo canale che non sono riuscite, quasi sempre perché Twitch non ha risposto. Prima di finire qui ognuna è già stata riprovata 3 volte, con una pausa che cresce.',
      'Non si perdono, nemmeno se il bot si riavvia. Premi «Riprova quelle in sospeso»: leggi «Riprese: N» e le azioni tornano in fila.',
    ] },

    { h3: 'Interventi recenti' },
    { p: [
      'Le ultime 120 righe del registro. Ogni riga dice cosa è stato fatto, a chi, perché, com\'è andata e quando.',
      'L\'esito è «fatto», «non riuscito», «avviso» o «in attesa». «in attesa» vuol dire che l\'azione è in fila per Twitch. Le righe della sola osservazione dicono che l\'azione non è stata eseguita.',
      'Se non c\'è ancora niente leggi «Ancora nessun intervento registrato.».',
    ] },

    { h3: 'Pulizia follower' },
    { p: [
      '«Scansiona i follower recenti» controlla i tuoi <strong>ultimi 100 follower</strong> contro la lista dei bot noti, la forma dei nomi e il profilo. Non fa niente da solo: ti mostra i sospetti e decidi tu.',
      'Il risultato dice «Controllati N · M sospetti». Per ogni sospetto vedi il rischio e i motivi, e un pulsante «Blocca». Il blocco toglie il follow, e il numero dei follower torna pulito: leggi «Bloccato ✓: il follow non c\'è più.».',
      'Se il blocco non si può fare, perché manca il permesso di blocco o Twitch dice di no, il bot banna al suo posto e lo dice: «Bannato: il blocco non si poteva fare, e il follow resta.». Il ban impedisce di scrivere nel tuo canale, ma l\'account resta fra i follower.',
      'Se non trova nessuno leggi «Nessun follower sospetto tra i recenti. Pulito.». Se ripremi entro 30 secondi ti mostra lo stesso risultato.',
      'Se mancano i permessi leggi «Per bloccare servono i permessi di moderazione.»: premi «Concedi». Se Twitch non risponde leggi «Scansione non riuscita.».',
    ] },

    { h2: 'Come tararlo' },
    { ul: [
      '<strong>Canale piccolo.</strong> Antispam acceso con le voci di base, link a «sub, VIP e mod», il tuo Discord in «Domini sempre permessi». Scudo acceso con le voci di base: 10 follow in 30 secondi va già bene.',
      '<strong>Prima settimana con lo scudo.</strong> Accendi «Sola osservazione» e guarda il registro per qualche diretta. Quando le righe ti tornano, spegnila.',
      '<strong>Canale che cresce in fretta.</strong> Alza l\'allarme, per esempio a 20 follow in 30 secondi, o scegli «prudente».',
      '<strong>Sotto attacco adesso.</strong> Accendi «Durante un\'ondata, banna anche i follow sospetti (aggressivo)» e «Trattieni i messaggi degli account appena creati». Sono le due scelte aggressive: spegnile quando è passata.',
      '<strong>Chat rumorosa ma amichevole.</strong> Spegni i maiuscoli e lascia ripetizioni, flood e link.',
    ] },
  ],
  faq: [
    { d: 'L\'antispam non cancella niente. Perché?', r: 'Controlla che «Attiva l\'antispam» sia acceso e che tu abbia premuto «Salva antispam». Se nella carta leggi «Per eliminare i messaggi servono i permessi di moderazione.», premi «Concedi i permessi». Tu e i moderatori siete esenti da tutto, i VIP da tutto tranne i link, e l\'antispam guarda solo la chat di Twitch.' },
    { d: 'Il link del mio Discord viene cancellato.', r: 'Aggiungi il dominio in «Domini sempre permessi (uno per riga)», per esempio <code>discord.gg</code>, e premi «Salva antispam». Da lì passa per chiunque.' },
    { d: 'Un VIP non riesce a postare un link.', r: 'In «Possono postare link:» hai scelto «solo mod». Scegli «VIP e mod» o un livello più largo e premi «Salva antispam».' },
    { d: 'Ha cancellato un messaggio che andava bene.', r: 'Con «Avvisa in chat quando elimina» acceso il motivo è scritto nel messaggio del bot. Il caso più comune sono le maiuscole: «AHAHAH SIIIII» supera l\'80%. Spegni la voce che scatta troppo e premi «Salva antispam».' },
    { d: 'Qualcuno ha scritto una parola vietata e il messaggio è ancora lì.', r: 'Le parole vietate richiamano, non cancellano. Il messaggio lo toglie un moderatore.' },
    { d: 'Lo scudo scatta a ogni clip che gira.', r: 'Alza «Allarme oltre … follow in … secondi» o scegli «prudente» in «Quanto presto reagire:», poi premi «Salva lo scudo». Un\'ondata di persone vere da sola non chiude la chat: la chiude solo la prova che è una macchina.' },
    { d: 'Uno spettatore nuovo non riesce a scrivere.', r: 'Il suo account è più giovane delle ore impostate e il messaggio viene trattenuto. Scrivi <code>!permetti nome</code> in chat, oppure aggiungilo in «Non toccare mai».' },
    { d: 'La chat è rimasta ai soli follower.', r: 'Lo scudo scende di un gradino ogni 5 minuti di calma e riapre da solo quello che aveva chiuso. Se la chat ai soli follower l\'avevi messa tu prima dell\'attacco, la togli tu da Twitch.' },
    { d: 'Lo scudo non chiude la chat e non attiva lo Shield Mode.', r: 'Mancano i permessi aggiunti per lo scudo. In <em>Stato</em> cerca la carta «Nuovi permessi da concedere» e premi «Aggiorna i permessi».' },
    { d: 'Il mio moderatore non vede lo stato dello scudo e il registro.', r: 'Sono del proprietario del canale. Un moderatore del pannello può cambiare i filtri e le scelte dello scudo; il registro e le liste no. Come si invita un moderatore lo trovi nel <a href="/manuale/account">manuale dell\'account</a>.' },
    { d: '«Togli i follower finti» non accetta il numero.', r: 'Il numero è cambiato mentre guardavi: sono arrivati altri giudizi. Riscrivi il numero nuovo che ti mostra il pannello.' },
    { d: 'Che differenza c\'è fra ban e blocco?', r: 'Il ban impedisce di scrivere, e l\'account resta fra i tuoi follower. Il blocco toglie anche il follow. Sui follow finti lo scudo usa il blocco, così il conto dei follower torna pulito.' },
    { d: 'Posso far moderare solo durante la diretta?', r: 'No. Antispam e scudo lavorano sempre, perché una chat sporca a canale spento resta sporca. Se non li vuoi, spegni i loro interruttori.' },
  ],
};
