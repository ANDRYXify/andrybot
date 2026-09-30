// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Manuale: la diretta (Regia, Clip, Musica, Dirette, Statistiche). La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'diretta',
  schede: ['regia', 'clip', 'musica', 'dirette', 'statistiche'],
  titolo: 'Manuale della diretta: regia, clip, musica, rapporti | SocialBot',
  h1: 'Manuale della diretta: regia, clip, musica, rapporti e statistiche',
  desc: 'Titolo, categoria, pubblicità e raid dal pannello, le clip che nascono da sole, le richieste su Spotify, il rapporto di ogni diretta e i numeri del canale.',
  aggiornata: '2026-09-27',
  corpo: [
    { p: [
      'Queste schede servono <strong>mentre trasmetti</strong> e subito dopo. Stanno nel gruppo «Durante la diretta» del menù: «Regia» apre una barra con tre voci, «Regia», «Clip» e «Musica». Accanto ci sono «Dirette» e «CONSOLify». «Statistiche» sta nel gruppo «Chat e pubblico».',
      'Clip automatiche, richieste musicali, messaggi della pubblicità e rapporti girano sul server: vanno avanti anche se chiudi il pannello. I tasti a portata di dito hanno il loro manuale: <a href="/manuale/consolify">CONSOLify</a>.',
      'I moderatori che hai fatto entrare nel pannello usano queste schede come te. Restano a te, proprietario del canale, i permessi di Twitch, il collegamento con Spotify, i premi a punti canale della musica e l\'indirizzo mail dei rapporti.',
      'Se usi SocialBot solo per Discord, queste schede non compaiono.',
    ] },

    // ------------------------------------------------------------------ REGIA
    { h2: 'Regia: il canale senza aprire Twitch', scheda: 'regia', p: [
      'Da qui cambi titolo, categoria e tag, metti un marker, fai una clip, mandi la pubblicità o un raid, e decidi cosa dice il bot quando parte la pubblicità. Tutto parla con Twitch: su un canale di Kick o di YouTube la scheda mostra «Solo su Twitch» e nient\'altro.',
      'Twitch chiede un permesso per ogni cosa. Se ne manca qualcuno, in cima alla scheda compare un riquadro che elenca quali («gestione canale (titolo/categoria/marker)», «raid», «pubblicità») con il tasto «Concedi i permessi». Ti porta su Twitch, dai il permesso e torni nel pannello. I permessi li concede solo il proprietario del canale.',
    ] },

    { h3: 'Stato diretta' },
    { p: [
      'Fuori onda leggi «OFFLINE» e la frase «Non sei in diretta adesso. Titolo, categoria e tag puoi impostarli lo stesso.»',
      'In onda leggi «LIVE», gli «Spettatori» e da quanto sei in diretta («Da»), che avanza da solo ogni secondo.',
      'Se Twitch ha già in programma la prossima pubblicità, compaiono anche «Prossima pubblicità», con il conto alla rovescia, e «Durerà». Servono il permesso della programmazione pubblicità e la diretta accesa.',
      'Il numero degli spettatori non si aggiorna da solo: premi «Aggiorna» per rileggerlo.',
    ] },

    { h3: 'Info del canale' },
    { p: ['Titolo, categoria e tag si cambiano anche fuori onda, quindi puoi preparare la diretta prima di accendere. Premi «Salva info canale»: Twitch li aggiorna subito e leggi «Info canale aggiornate ✓».'] },
    { tabella: [
      ['Campo', 'Limite', 'Come si usa'],
      ['«Titolo della diretta»', '140 caratteri', 'Parte con il titolo che hai adesso su Twitch.'],
      ['«Categoria / gioco»', '8 risultati per ricerca', 'Accanto a «Ora:» vedi quella attuale. In «Cerca un gioco/categoria…» scrivi almeno 2 lettere e scegli dall\'elenco di Twitch, col mouse o con le frecce e Invio. Se non trova niente leggi «Nessun risultato». Se non scegli niente resta quella di prima.'],
      ['«Tag»', '10 tag', 'Separali con una virgola: oltre il decimo non si salvano. Twitch accetta tag fino a 25 caratteri, senza spazi né simboli.'],
    ] },
    { p: ['Serve il permesso gestione canale. Senza, al salvataggio leggi «Concedi il permesso "gestione canale" da /auth/permessi». Se Twitch rifiuta qualcosa, per esempio un tag, vedi il suo messaggio d\'errore.'] },

    { h3: 'Azioni rapide' },
    { p: ['Funzionano solo <strong>mentre sei in diretta</strong>: fuori onda Twitch le rifiuta e il pannello te lo dice.'] },
    { tabella: [
      ['Azione', 'Cosa fa', 'Cosa vedi'],
      ['«Crea clip»', 'Fa una clip del momento su Twitch e la apre in una nuova scheda. La clip finisce in «Ultime clip», nel rapporto della serata e nelle statistiche, come quelle automatiche.', '«Clip creata!». Fuori onda: «Nessuna clip: devi essere in diretta.»'],
      ['«Marker»', 'Mette un segno in quel punto della registrazione, con la nota che scrivi in «Nota del marker (facoltativa)», fino a 140 caratteri. Quando monti il video lo ritrovi lì.', '«Marker messo nel VOD». Fuori onda: «devi essere in diretta per mettere un marker».'],
      ['«Manda pubblicità»', 'Fa partire subito la pubblicità, per la durata scelta accanto: 30, 60, 90, 120, 150 o 180 secondi. Di base 60.', '«Pubblicità di 60s avviata». Fuori onda: «devi essere in diretta per lanciare una pubblicità». Se ne hai appena mandata una: «troppo presto per un\'altra pubblicità».'],
      ['«Avvia raid»', 'Manda i tuoi spettatori sul canale che scrivi in «canale da raidare», fino a 30 caratteri. La @ davanti puoi lasciarla.', '«Raid verso … avviata». Se qualcosa non va: «scrivi il canale da raidare», «canale di destinazione non trovato», «non puoi raidare te stesso», «c\'è già una raid in corso», «devi essere in diretta per fare una raid».'],
      ['«Annulla»', 'Ferma il raid in preparazione.', '«Raid annullata».'],
    ] },
    { p: ['La riga della pubblicità compare solo se hai concesso il permesso della pubblicità, quella del raid solo con il permesso dei raid. Il marker usa il permesso gestione canale.'] },

    { h3: 'Quando parte la pubblicità' },
    { p: [
      'Durante la pausa la chat resta sola, e chi arriva vede uno schermo che non sei tu. Qui scrivi tre righe che il bot manda in chat come <strong>annuncio evidenziato</strong>: prima della pausa, quando parte e quando torni. Ogni pausa si annuncia una volta sola.',
      'Accendi «Parla quando c’è la pubblicità», che di base è spento: sotto compaiono le impostazioni. Premi «Salva» e leggi «Salvato ✓».',
    ] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Colore dell’annuncio»', 'come sempre', 'come sempre, blu, verde, arancione, viola', 'Il colore della riga evidenziata.'],
      ['«Quanto prima avviso»', '60 secondi', 'da 15 a 300 secondi', 'Quanto prima della pausa esce «Prima che parta».'],
      ['Testo di ogni momento', 'vedi sotto', '480 caratteri', 'Ogni momento ha la sua levetta. Un testo vuoto vuol dire che quel momento non dice niente.'],
      ['«Quanto ritardo accetto»', '120 secondi', 'da 0 a 600 secondi', 'Se la fine della pausa è passata da più di così, «Quando torni» non esce più.'],
    ] },
    { tabella: [
      ['Momento', 'Testo di base', 'Quando esce'],
      ['«Prima che parta»', 'Fra poco parte la pubblicità: restate qui, torno subito.', 'A «Quanto prima avviso» secondi dalla pausa. Il bot lo ricava dalla programmazione di Twitch, che esiste solo mentre sei in onda. Se rimandi la pausa, l\'avviso segue la nuova ora.'],
      ['«Appena parte»', 'Pubblicità per {secondi} secondi. Non andate via, ci vediamo fra poco.', 'Quando Twitch dice che la pausa è partita, con la sua durata. Vale per quella che mandi tu e per quella automatica di Twitch.'],
      ['«Quando torni»', 'Eccomi, sono tornato.', 'A fine pausa, se sei ancora in onda. Twitch non avvisa quando finisce: il bot conta i secondi che gli ha detto alla partenza. Se Twitch non ha detto quanto dura, non esce. Se il bot si riavvia nel mezzo, il conto si perde e sta zitto invece di salutare in ritardo.'],
    ] },
    { p: [
      'In tutte e tre puoi usare <code>{secondi}</code> (quanto dura la pausa, per esempio 90), <code>{durata}</code> (la stessa cosa in minuti, 1:30) e <code>{canale}</code> (il nome del canale). La durata è sempre quella che dice Twitch: per «Prima che parta» quella in programma, per le altre due quella della pausa partita. Se Twitch non dice quanto dura, una riga che usa <code>{secondi}</code> o <code>{durata}</code> non esce.',
      'Servono due permessi di Twitch: la programmazione pubblicità e gli annunci in chat. Se ne manca uno, in cima alla carta leggi «Senza questi permessi non esce niente» con il collegamento «Concedili e torna qui».',
    ] },

    // ------------------------------------------------------------------- CLIP
    { h2: 'Clip: i momenti migliori, da soli', scheda: 'clip', p: [
      'Il bot fa le clip su Twitch nei momenti di hype e tiene l\'elenco delle ultime.',
    ] },

    { h3: 'Clip automatiche' },
    { p: [
      'Sono nell\'extra «Clip Automatiche» e nel pacchetto «Tutto»: l\'Essenziale e il Base non le comprendono. Senza l\'extra la levetta resta spenta e la carta ti dice che non sono nel tuo piano, con il tasto «Sblocca con «Clip Automatiche»» o il collegamento «Vedi i piani». Piani e prezzi: <a href="/manuale/account">manuale dell\'abbonamento</a>.',
    ] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti', 'Cosa cambia'],
      ['Levetta «Clip automatiche accese»', 'accesa, se il piano le comprende', '', 'Spenta, restano solo le clip che fai tu.'],
      ['«Sensibilità»', '5', 'da 1 a 10', 'Più alta: più clip, anche i momenti tiepidi. Più bassa: solo i picchi veri.'],
    ] },
    { p: [
      'Premi «Salva» e leggi «Impostazioni delle clip salvate ✓». Le cambiano anche i moderatori.',
      '<strong>Come decide.</strong> Il bot non conta solo i messaggi. Guarda gli ultimi dodici secondi di chat e li confronta con il ritmo normale del tuo canale nei due minuti e mezzo prima. Conta le reazioni (risate, «pog», «gg», «clip», «pazzesco», i messaggi TUTTO MAIUSCOLO, i «!!!») e quante persone diverse reagiscono. Per questo la stessa sensibilità funziona su un canale da dieci persone e su uno da mille.',
    ] },
    { ul: [
      'La clip si fa solo in diretta, con il bot in chat.',
      'Dall\'ultima clip alla prossima automatica passano almeno <strong>4 minuti</strong>. Dopo un evento forte, cioè un raid da almeno 5 persone o un cheer da almeno 300 bit, bastano <strong>90 secondi</strong>.',
      'Un sub, un cheer o un raid scaldano il canale per 20 secondi: in quel momento basta meno chat per fare la clip.',
      'Un raid da almeno 20 persone o un cheer da almeno 1.000 bit fanno partire la clip subito.',
      'Appena la clip è fatta, il bot la annuncia in chat con il link, per esempio «Momento da clip!».',
      'Se Twitch rifiuta la clip, il bot non scrive niente in chat.',
    ] },

    { h3: 'Ultime clip' },
    { p: [
      'Le ultime 20 clip del canale, dalla più recente: il collegamento, il motivo e quando è nata. Ci sono le automatiche, quelle di «Crea clip» in «Regia», quelle dei momenti salienti, quelle chieste in chat e quelle fatte da un modulo o da un comando vocale.',
      'Il motivo dice cosa l\'ha fatta nascere, per esempio «momento hype: la chat esplode di reazioni», «momento hype: la chat è impazzita all’improvviso», «momento hype: raid di …», «momento hype: valanga di bit», «momento hype: nuovo sub», «momento saliente (audio della live)», «richiesta in chat da …», «dalla Regia» (il tasto «Crea clip»), «modulo», «comando vocale».',
      'Se l\'elenco è vuoto leggi «Nessuna clip ancora: arriveranno nei momenti di hype!». Se dopo una serata trovi troppe clip da scartare, abbassa la sensibilità.',
    ] },

    // ----------------------------------------------------------------- MUSICA
    { h2: 'Musica: le richieste degli spettatori su Spotify', scheda: 'musica', p: [
      'Gli spettatori mettono canzoni nella coda del <strong>tuo</strong> Spotify con <code>!sr</code>. È nell\'Essenziale, quindi gratis.',
      'Servono Spotify <strong>Premium</strong> e un dispositivo attivo, cioè l\'app aperta e in riproduzione. La coda è quella vera del tuo account, non una playlist nostra.',
    ] },

    { h3: 'Richieste musicali' },
    { p: ['Il riquadro di Spotify cambia secondo com\'è il collegamento. Collega e scollega solo il proprietario del canale: un moderatore legge «Solo il proprietario del canale può collegare Spotify.»'] },
    { ul: [
      '<strong>Da collegare.</strong> Premi «Connetti Spotify»: vai su Spotify, dai il permesso e torni qui con «Spotify collegato!». Usi l\'app di andryxify.it e non compili niente.',
      '<strong>Collegato.</strong> Vedi «Spotify collegato» e il tasto «Scollega». Sotto c\'è scritto se usi la tua app Spotify o quella condivisa.',
      '<strong>Con la tua app.</strong> Se preferisci, apri «Usa una mia app Spotify (avanzato)» e metti le credenziali della tua app. Se sul server non c\'è un\'app condivisa, questo modulo compare da solo.',
      '<strong>Non riuscito.</strong> Al ritorno leggi «Collegamento Spotify non riuscito.»: riprova da «Connetti Spotify».',
    ] },
    { passi: [
      { t: 'Apri la dashboard di Spotify', d: 'Vai su <a href="https://developer.spotify.com/dashboard">developer.spotify.com/dashboard</a> e accedi.' },
      { t: 'Crea l\'app', d: 'Premi <strong>Create app</strong> e dagli un nome qualsiasi.' },
      { t: 'Incolla il Redirect URI', d: 'In <strong>Redirect URIs</strong> incolla esattamente l\'indirizzo che il pannello ti mostra dentro «Come ottenere le credenziali Spotify (2 min)».' },
      { t: 'Copia le due chiavi', d: 'Salva, apri le <strong>Settings</strong> dell\'app e copia <strong>Client ID</strong> e <strong>Client Secret</strong> nei due campi. Premi «Salva credenziali»: leggi «Credenziali salvate! Ora connetti Spotify.» e poi premi «Connetti Spotify».' },
    ] },

    { h3: 'Come si richiede una canzone' },
    { p: ['In «Modalità» scegli come si paga una richiesta. Premi «Salva» e leggi «Impostazioni musica salvate». Queste impostazioni le cambiano anche i moderatori.'] },
    { tabella: [
      ['Modalità', 'Chi può chiedere', 'Cosa succede'],
      ['«Libere (tutti, gratis)» (di base)', 'tutti', 'Gratis.'],
      ['«Solo abbonati (sub)»', 'abbonati, moderatori e tu', 'Gli altri leggono che le richieste sono riservate ai sub.'],
      ['«A monete del bot»', 'chi ha abbastanza monete', 'Costa le monete che metti in «Costo». Si scalano solo se il brano entra davvero in coda.'],
      ['«A bit (Cheer nel messaggio)»', 'chi fa un Cheer', 'Il Cheer va nello stesso messaggio di <code>!sr</code>, di almeno i bit che metti in «Costo».'],
      ['«A punti canale (premio)»', 'chi riscatta il premio', 'Niente <code>!sr</code>: lo spettatore scrive la canzone nel riscatto del premio.'],
    ] },
    { p: [
      '«Costo» va da 0 a 1.000.000 e compare solo per monete e bit.',
      '<strong>A punti canale.</strong> Serve un premio di Twitch con la <strong>richiesta di testo</strong> attiva. In «Premio usato per le richieste» trovi solo quelli adatti: sceglilo e si salva da solo con «Premio impostato ✓». Se non ne hai, apri «Crea un premio pronto all\'uso» (se hai già premi adatti si chiama «Oppure crea un premio pronto all\'uso»).',
      'Lì scrivi «Nome» (di base «Richiesta musicale», fino a 45 caratteri) e «Costo (punti canale)» (di base 500). Premi «Crea il premio su Twitch»: il premio nasce con la richiesta di testo accesa, viene scelto qui e la modalità passa ai punti canale. Leggi «Premio creato su Twitch!».',
      'Con un premio creato da qui, se nel riscatto manca la canzone, se la canzone non si trova o non entra in coda, i punti tornano allo spettatore e il bot aggiunge in chat «Punti rimborsati.». Con un premio creato a mano su Twitch il rimborso non si può fare.',
      'I premi li legge e li crea solo il proprietario, e serve il permesso Punti canale di Twitch. Se manca, il riquadro te lo dice con il collegamento «Concedi il permesso», che ti riporta qui. Se Twitch rifiuta il premio leggi «Twitch ha rifiutato il premio: forse esiste già un premio con questo nome.»',
      '<strong>Quale canzone?</strong> La spunta «Se ci sono più canzoni con lo stesso titolo, chiedi in chat quale ("intendi 1, 2 o 3?")» è accesa di base. Quando la ricerca trova almeno due brani con lo stesso titolo e artisti diversi, il bot ne propone fino a tre e aspetta <strong>90 secondi</strong>. Lo spettatore risponde col numero, per esempio <code>!sr 2</code>. Se la richiesta nomina già l\'artista giusto, non chiede niente. Con la spunta spenta il bot mette in coda il primo risultato di Spotify.',
    ] },
    { tabella: [
      ['Comando', 'Si può scrivere anche', 'Cosa fa'],
      ['<code>!sr &lt;canzone o artista&gt;</code>', '<code>!songrequest</code>, <code>!richiedi</code>, <code>!canzone</code>', 'Mette il brano in coda, secondo la modalità.'],
      ['<code>!song</code>', '<code>!brano</code>, <code>!nowplaying</code>, <code>!np</code>', 'Dice cosa sta suonando. Vale per tutti.'],
    ] },
    { p: ['Quando qualcosa non va, il bot risponde in chat. Il rimedio lo leggete tu e i moderatori; chi guarda legge solo che la canzone non è entrata.'] },
    { tabella: [
      ['Tu e i moderatori leggete', 'Chi guarda legge', 'Cosa fare'],
      ['«Nessun dispositivo Spotify attivo: apri Spotify e avvia la riproduzione.»', '«Spotify del canale adesso è fermo: la canzone non è entrata in coda.»', 'Apri l\'app e fai partire una canzone.'],
      ['«Collegamento Spotify scaduto: ricollegalo dal pannello.»', '«Spotify del canale adesso non risponde: la canzone non è entrata in coda.»', 'Premi «Scollega» e poi «Connetti Spotify».'],
      ['«Richieste musicali non attive: Spotify non è collegato, si collega dal pannello.»', '«Le richieste musicali qui non sono attive.»', 'Collega Spotify in questa scheda.'],
    ] },
    { ul: [
      '«Non ho trovato "…" su Spotify.»: la ricerca non ha dato niente.',
      '«la scelta è scaduta»: sono passati i 90 secondi per rispondere col numero.',
      '«ti servono … monete»: nella modalità a monete, chi chiede non ne ha abbastanza.',
      '«servono almeno … bit (un Cheer nel messaggio)»: nella modalità a bit, il Cheer manca o è troppo piccolo.',
      '«Si chiede così: …»: dopo <code>!sr</code> non c\'era il titolo.',
    ] },

    // ---------------------------------------------------------------- DIRETTE
    { h2: 'Dirette: il rapporto di ogni serata', scheda: 'dirette', p: [
      'Quando chiudi la diretta, il bot scrive il rapporto della serata con i numeri veri, raccolti mentre trasmettevi. Resta sempre in questa scheda. Se vuoi, ti arriva anche su Telegram o via mail.',
      'Un puntino sulla voce «Dirette» del menù ti dice che c\'è un rapporto nuovo. Al proprietario compare anche «C’è il rapporto dell’ultima diretta: lo trovi in Dirette.». Aprire la scheda lo segna come letto.',
    ] },

    { h3: 'Le tue dirette' },
    { p: ['Ogni diretta finita è una carta, dalla più recente, fino alle ultime 30. In testa ci sono la data, la durata, il segno «nuovo» se non l\'hai ancora aperta e dove è stata mandata (Telegram, mail).'] },
    { tabella: [
      ['Numero', 'Quando compare'],
      ['picco spettatori e spettatori in media', 'Se il bot ha contato gli spettatori almeno una volta. Li conta ogni cinque minuti, mentre è nel canale.'],
      ['messaggi e persone in chat', 'Sempre. I messaggi del bot non contano.'],
      ['nuovi follower e sub, con i regalati', 'Sempre.'],
      ['raid, con gli spettatori portati', 'Se ce n\'è almeno uno.'],
      ['presenti e prime volte', 'Se ci sono. Presente è chi resta in chat almeno dieci minuti, anche senza scrivere. Prima volta è chi non era mai stato presente.'],
      ['clip', 'Se ce n\'è almeno una.'],
      ['donazioni, in euro con quante sono', 'Se ce n\'è almeno una.'],
      ['«Più attivi»', 'I tre che hanno scritto di più, tu escluso.'],
    ] },
    { p: [
      'Sotto ci sono le clip della serata, fino a otto: titolo di Twitch, anteprima, durata e ora. Si aprono con un clic. Se Twitch non ha dato il titolo, al suo posto c\'è il motivo per cui la clip è nata.',
      'Il rapporto tiene anche in che categorie hai trasmesso e per quanto, contate insieme agli spettatori ogni cinque minuti. Nella carta non le vedi: le usa il «Media kit» di «Strumenti» (<a href="/manuale/strumenti">manuale degli strumenti</a>).',
      'Senza nessun rapporto leggi «Ancora nessuna diretta finita da quando SocialBot le conta: la prossima lascerà qui il suo rapporto.»',
      'Un riavvio del bot a metà serata non perde il rapporto: riparte dall\'inizio della diretta. Al massimo manca il picco di prima del riavvio.',
    ] },

    { h3: 'Dove ricevere il rapporto' },
    { p: [
      'Il rapporto resta sempre nella scheda. In più può arrivarti appena chiudi la diretta.',
      '<strong>«Su Telegram, in privato»</strong> è acceso di base. Il rapporto arriva nella chat privata del tuo bot Telegram, che si collega nella scheda «Telegram» del gruppo «Le tue community» (piano Base). Quando è collegata vedi «pronto». Se non lo è, la carta te lo dice con il collegamento alla scheda.',
      '<strong>Via mail.</strong> La mail la manda il nostro server. Se sul server la posta non è configurata, i campi sono spenti e la carta dice che il rapporto arriva su Telegram. L\'indirizzo lo mette e lo toglie solo il proprietario.',
    ] },
    { passi: [
      { t: 'Scrivi l\'indirizzo', d: 'In «Indirizzo», fino a 254 caratteri, poi premi «Conferma l’indirizzo».' },
      { t: 'Apri la mail', d: 'Ti arriva «Conferma l\'indirizzo per i rapporti di SocialBot» con un tasto. Guarda anche nello spam. Il collegamento vale 24 ore.' },
      { t: 'Premi il tasto', d: 'Torni nel pannello con «Indirizzo confermato: il rapporto ti arriva anche via mail.». La levetta «Mandami il rapporto via mail» si accende da sola.' },
    ] },
    { p: [
      'Finché non confermi vedi «in attesa» e il tasto diventa «Rimanda la conferma». Una nuova conferma si chiede dopo 10 minuti: prima leggi «Hai già chiesto una conferma da poco». Se il collegamento è scaduto leggi «Il collegamento non vale più: chiedi una nuova conferma dalla scheda Dirette.». Con «Togli» cancelli l\'indirizzo e la mail si spegne.',
      'La prima volta che entri, se la posta c\'è e non hai ancora un indirizzo, una finestra ti chiede «Vuoi il riepilogo di ogni diretta per mail?». Scrivi l\'indirizzo in «Il tuo indirizzo» e premi «Sì, mandameli»: parte la mail di conferma. Con «No, grazie» la chiudi. In tutti e due i casi non te lo chiede più, da nessun computer. La vede solo il proprietario.',
      '<strong>Cosa c\'è dentro.</strong> I numeri sono gli stessi dappertutto. Telegram e mail ne aggiungono qualcuno.',
    ] },
    { tabella: [
      ['Cosa', 'Pannello', 'Telegram', 'Mail'],
      ['Durata, messaggi e persone in chat, più attivi', 'sì', 'sì', 'sì'],
      ['Picco e media degli spettatori', 'sì', 'sì', 'sì'],
      ['Follower, sub, raid, presenti, donazioni', 'sì', 'sì', 'sì'],
      ['Le clip, con il link', 'sì', 'sì', 'sì'],
      ['I bit della serata e chi ne ha messi di più', 'no', 'sì', 'sì'],
      ['L\'hype train', 'no', 'sì, con il livello e chi l\'ha spinto', 'sì, con il livello'],
      ['La riga d\'apertura con la cosa più notevole', 'no', 'sì', 'sì, anche nell\'oggetto'],
    ] },
    { p: [
      'La riga d\'apertura segue un ordine fisso: un record di spettatori, i raid, almeno 1.000 bit, almeno 5 € di donazioni, almeno 3 facce nuove, almeno 10 follower, i sub, almeno 200 messaggi, infine quanti messaggi ci sono stati. Senza nemmeno un messaggio: «Serata tranquilla.». Chi fa un cheer anonimo conta nel totale dei bit e resta senza nome.',
      'La mail apre con quella riga, poi i tre numeri grossi (picco, messaggi, follower), chi ha scritto di più, il resto della serata e le clip. In fondo c\'è il tasto «Apri le tue dirette».',
      '<strong>Come sai che una mail è nostra.</strong> In fondo a ogni mail c\'è un codice di verifica. Lo trovi solo nella scheda «Il tuo account», carta «Le mail che ti mandiamo», che vede solo il proprietario. Cambia ogni lunedì ed è diverso per ogni canale. Lì ci sono anche quelli delle settimane passate del mese, per le mail che apri in ritardo. Se il codice non combacia, quella mail non l\'abbiamo scritta noi: non aprire i collegamenti.',
    ] },

    // ------------------------------------------------------------ STATISTICHE
    { h2: 'Statistiche: il canale in numeri', scheda: 'statistiche', p: [
      'Come sta andando il canale, in un posto solo: i numeri del periodo che scegli, le classifiche e le ultime dirette.',
    ] },

    { h3: 'Il canale in numeri' },
    { p: ['In alto scegli il periodo: «Ultimi 7 giorni» (di base), «Ultimi 30 giorni» o «Da sempre».'] },
    { tabella: [
      ['Riquadro', 'Da dove viene'],
      ['dirette, in onda, picco di spettatori', 'Dai rapporti delle dirette finite, più quella in corso.'],
      ['messaggi in chat, persone che hanno scritto', 'Dalla chat del periodo. I messaggi del bot non contano.'],
      ['interventi del bot', 'I messaggi scritti dal bot nel periodo.'],
      ['nuovi follower, sub', 'Dai rapporti, più la diretta in corso.'],
      ['raid', 'Dai rapporti, più la diretta in corso. Compare solo se ce n\'è almeno uno.'],
      ['clip', 'Le clip del periodo, comprese quelle di «Crea clip».'],
      ['donazioni', 'Dai rapporti, in euro con quante sono. Compare solo se ce n\'è almeno una.'],
    ] },
    { p: [
      'Sono gli stessi numeri della scheda «Dirette», non un secondo conto. Una diretta finita conta nel periodo in cui è finita. Di quella in corso conta solo la parte dentro il periodo.',
      'Mentre sei in onda, i riquadri dirette, in onda e picco portano la scritta «adesso» e la scheda si rilegge da sola ogni 30 secondi, finché la finestra è davanti.',
    ] },

    { h3: 'Le classifiche' },
    { p: ['Cinque classifiche, dieci nomi ciascuna. In nessuna ci sei tu: contano chi ti guarda. Solo «Chi scrive di più» segue il periodo scelto: le altre contano da sempre.'] },
    { tabella: [
      ['Classifica', 'Cosa conta', 'Se è vuota'],
      ['«Monete del pubblico»', 'Le monete di chi guarda.', 'Dice che nessuno le ha ancora e che si guadagnano chiacchierando e giocando.'],
      ['«Monete dello staff»', 'Le monete dei tuoi moderatori, separate dal pubblico.', '«Nessuno del tuo staff ha monete: è normale, moderi invece di giocare.» Se manca il permesso per leggere i moderatori, restano nel pubblico e la carta ha il tasto «Concedi i permessi».'],
      ['«Chi c’è sempre»', 'Le dirette di fila, e quante in tutto. Una presenza conta dopo dieci minuti in chat, anche senza scrivere.', '«Ancora nessuna serie: la presenza si conta dopo dieci minuti in chat.»'],
      ['«Chi scrive di più»', 'I messaggi nel periodo.', '«Ancora nessuno ha scritto in questo periodo.»'],
      ['«Chi guarda di più»', 'Le ore guardate: cinque minuti a ogni giro, a chi è in chat mentre sei in diretta, anche senza scrivere. I bot più noti non contano.', '«Ancora nessuna ora contata: si contano mentre sei in diretta, a chi resta in chat anche senza scrivere.» Se hai spento il conteggio: «Il conteggio delle ore è spento: lo riaccendi nella scheda Comandi, carta «Comodità in chat».»'],
    ] },
    { p: [
      'Il conteggio delle ore è acceso di base. La spunta è «Conta le ore guardate in chat», nella carta «Comodità in chat» della scheda «Comandi».',
      'Le monete si regolano nella scheda «Giochi & classifiche»: <a href="/manuale/giochi">manuale dei giochi</a>.',
    ] },

    { h3: 'Le ultime dirette' },
    { p: [
      'Le ultime 10 dirette, una riga ciascuna: «Quando», «Durata», «Picco», «Media», «Messaggi», «Persone», «Follower», «clip». Non seguono il periodo: dopo una pausa lunga le vedi lo stesso.',
      'Il tasto «Apri i rapporti» porta alla scheda «Dirette». Senza dirette leggi «Nessuna diretta ancora: il rapporto nasce quando chiudi.»',
    ] },
  ],
  faq: [
    { d: 'Cambio il titolo e su Twitch non cambia.', r: 'Manca il permesso gestione canale. In cima a «Regia» c\'è il riquadro con «Concedi i permessi»: lo preme il proprietario del canale.' },
    { d: 'Non vedo «Manda pubblicità» o «Avvia raid».', r: 'Quelle righe compaiono solo con i permessi della pubblicità e dei raid. Concedili dal riquadro in cima a «Regia».' },
    { d: '«Prima che parta» non esce mai.', r: 'Serve il permesso della programmazione pubblicità, e Twitch dà la programmazione solo mentre sei in onda. Controlla che la levetta del momento sia accesa e che il testo non sia vuoto. Se il testo usa {secondi} e Twitch non dice la durata, la riga non esce.' },
    { d: '«Quando torni» non è uscito.', r: 'Esce solo se Twitch ha detto quanto dura la pausa, se sei ancora in onda e se il bot non si è riavviato nel mezzo. Se la fine è passata da più di «Quanto ritardo accetto», il bot sta zitto apposta.' },
    { d: 'Non nasce nessuna clip automatica.', r: 'Controlla che l\'extra «Clip Automatiche» sia nel tuo piano, che la levetta sia accesa e che tu sia in diretta con il bot in chat. Dall\'ultima clip passano almeno 4 minuti, e con la sensibilità bassa servono picchi forti. Se Twitch rifiuta la clip, il bot non lo scrive in chat.' },
    { d: '!sr non risponde.', r: 'Servono tutte e tre le cose: Spotify collegato in «Musica», Premium attivo, app aperta e in riproduzione. In modalità «A punti canale (premio)» <code>!sr</code> non mette in coda: risponde di riscattare il premio.' },
    { d: 'Il rapporto non mi arriva su Telegram.', r: 'Serve la chat privata del bot, collegata nella scheda «Telegram». In «Dirette» la levetta «Su Telegram, in privato» deve essere accesa. Il rapporto resta comunque nella scheda «Dirette».' },
    { d: 'Il rapporto non ha picco e media.', r: 'Gli spettatori si contano ogni cinque minuti mentre il bot è nel canale. Se il bot era spento, o la diretta è finita prima del primo conteggio, quei due numeri non ci sono.' },
    { d: '«Chi guarda di più» è vuota.', r: 'Le ore si contano solo in diretta: prima della prima diretta la classifica è vuota. Se resta vuota dopo, controlla nella scheda «Comandi» che la spunta «Conta le ore guardate in chat» sia accesa.' },
    { d: 'Mi è arrivata una mail di SocialBot che non mi convince.', r: 'Guarda il codice in fondo e confrontalo con quello della scheda «Il tuo account», carta «Le mail che ti mandiamo». Se non combacia, non aprire i collegamenti.' },
    { d: 'Se chiudo il pannello si ferma qualcosa?', r: 'Clip automatiche, richieste musicali, messaggi della pubblicità e rapporti girano sul server e vanno avanti. Si fermano i tasti che premi tu e il conto di «Stato diretta». Per le scene comandate dal telefono vedi il <a href="/manuale/consolify">manuale di CONSOLify</a>.' },
  ],
};
