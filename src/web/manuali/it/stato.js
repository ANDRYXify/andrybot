// Manuale: la scheda Stato. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'stato',
  schede: ['stato'],
  titolo: 'Manuale della scheda Stato: diretta, bot e permessi | SocialBot',
  h1: 'Manuale della scheda Stato',
  desc: 'Cosa dice la scheda Stato: la diretta in corso o la prossima, l\'interruttore del bot, quando entra in chat, i permessi Twitch e cosa fare se si scollega.',
  aggiornata: '2026-09-27',
  corpo: [
    { h2: 'Stato', scheda: 'stato', p: [
      'È la scheda che si apre quando entri nel pannello, la prima del menù. Risponde a una domanda: <strong>come va adesso?</strong> Sei in onda, il bot è in chat, c\'è qualcosa da sistemare.',
      'Le carte compaiono in quest\'ordine. Quelle che segnalano un problema ci sono solo quando il problema c\'è: se è tutto a posto, la scheda comincia da «La tua diretta».',
      'Quando mancano dei permessi o il bot è spento, al proprietario può comparire anche un avviso in basso a destra, «Mancano dei permessi» o «Il bot è spento», con «Fammi vedere» che porta qui. Come funzionano gli avvisi sta nel <a href="/manuale/account">manuale di account e abbonamento</a>.',
    ] },

    { h3: 'Stai gestendo il canale di @…' },
    { p: [
      'La vede solo chi è entrato come <strong>moderatore</strong> di un canale altrui, ed è sempre la prima carta. Ti ricorda di chi è il canale che stai toccando.',
      'Un moderatore si occupa di comandi, moduli, effetti, giochi, notifiche, regole e memoria. I permessi Twitch e l\'elenco dei moderatori restano al proprietario.',
      'Come si diventa moderatore di un canale sta nel <a href="/manuale/account">manuale di account e abbonamento</a>.',
    ] },

    { h3: 'Il bot è scollegato dalla chat' },
    { p: [
      'Carta rossa, solo per il proprietario di un canale Twitch. Compare quando Twitch rifiuta la chiave con cui il bot entra in chat: il permesso è <strong>scaduto o è stato revocato</strong>. Succede se togli SocialBot dalle app collegate del tuo account Twitch, o se Twitch invalida le autorizzazioni, per esempio dopo un cambio di password.',
      'Il bot continua a riprovare da solo, e al tentativo dopo prova anche a rinnovare il permesso. Se ci riesce, rientra in chat e la carta sparisce. Se non ci riesce, premi «Ricollega i permessi»: si apre Twitch, confermi, e torni al pannello.',
      'Se hai collegato Telegram e il bot ti scrive in privato, ti arriva anche un messaggio lì, così lo sai anche col pannello chiuso. Al massimo uno ogni 6 ore.',
    ] },

    { h3: 'Attiva il bot: concedi i permessi' },
    { p: [
      'Solo per il proprietario di un canale Twitch che non ha ancora dato i permessi. Senza, il bot non può scrivere nella tua chat. Il tasto è «Concedi i permessi su Twitch».',
      'Il bot scrive in chat <strong>con il tuo account</strong>, non con un account suo. Per questo chiede a Twitch i permessi del canale, uno per ogni funzione che li usa:',
    ] },
    { tabella: [
      ['Cosa fa il bot', 'Permessi che servono'],
      ['Leggere e scrivere in chat', 'Chat, col tuo account.'],
      ['Seguire la diretta', 'Follow, sub, Bit, hype train e riscatti a punti canale.'],
      ['Clip', 'Creare clip, a mano e automatiche.'],
      ['Moderare', 'Cancellare messaggi, timeout antispam, chat ai soli follower o lenta, Shield Mode di Twitch, bloccare i follower finti.'],
      ['Comandi ufficiali', 'Shoutout e annunci in chat.'],
      ['Monete e classifiche', 'Chi è in chat (per le ore guardate) e chi sono i tuoi moderatori (per separare le due classifiche).'],
      ['Canale e regia', 'VIP, categoria e titolo, sondaggi, predizioni, premi a punti canale, raid, pubblicità e la loro programmazione, il Programma del canale.'],
      ['Studio Web', 'La stream key, chiesta solo quando lo Studio Web è acceso.'],
    ] },

    { h3: 'Nuovi permessi da concedere' },
    { p: [
      'Carta gialla, solo per il proprietario di un canale Twitch. Compare quando sono arrivate funzioni nuove dopo che avevi collegato il canale: servono permessi che non avevi dato, e finché non li dai quelle funzioni restano spente.',
      'Fra parentesi vedi a cosa servono, fino a otto funzioni. Premi «Aggiorna i permessi»: Twitch ti chiede di confermare l\'elenco intero, e si aggiornano tutti insieme.',
    ] },

    { h3: 'La tua diretta' },
    { p: [
      'La carta dice se sei in onda. Si aggiorna da sola <strong>ogni minuto</strong> mentre la scheda è aperta, e subito quando torni sulla finestra. Non c\'è se il tuo canale è solo su Discord.',
    ] },
    { p: ['<strong>Quando sei in onda</strong> vedi «In diretta», da quanto tempo (ore, minuti e secondi, che scorrono), il titolo, la categoria e questi numeri:'] },
    { tabella: [
      ['Numero', 'Cosa conta', 'Quando c\'è'],
      ['«ti guardano adesso»', 'Gli spettatori in questo momento.', 'Solo su Twitch.'],
      ['«il picco di stasera»', 'Il massimo di spettatori della diretta.', 'Da quando c\'è un dato di spettatori.'],
      ['«messaggi»', 'I messaggi in chat da inizio diretta.', 'Sempre.'],
      ['«persone in chat»', 'Quanti diversi hanno scritto.', 'Sempre.'],
      ['«nuovi follower»', 'I follow arrivati durante la diretta.', 'Sempre.'],
      ['sub, raid, bit, clip', 'Quelli della serata.', 'Solo se ce n\'è almeno uno.'],
    ] },
    { p: [
      'Sotto ci sono «Apri la Regia», solo per i canali Twitch, e «Guarda il canale», che apre la tua pagina sulla piattaforma dove trasmetti.',
      'Su Twitch vale quello che dice Twitch: a diretta appena chiusa, la carta passa subito a «Non sei in diretta». Su Kick e YouTube titolo, categoria e spettatori non arrivano: la carta mostra da quanto sei in onda e i numeri della chat.',
      'I numeri della serata sono gli stessi che finiscono nel rapporto della diretta: la carta e la scheda «Dirette» non possono dire due cose diverse. Il rapporto è spiegato nel <a href="/manuale/diretta">manuale della diretta</a>.',
    ] },
    { p: ['<strong>Quando non sei in onda</strong> vedi «Non sei in diretta» e due blocchi:'] },
    { ul: [
      '«La prossima»: il giorno e l\'ora della prossima diretta, presi da «La tua settimana». Se è oggi, vedi anche quanti minuti o ore mancano. Sotto c\'è cosa fai e la categoria. Se la settimana è vuota, il proprietario vede un invito a scriverla e il tasto «La tua settimana». Come si compila sta nel <a href="/manuale/vetrina">manuale della vetrina</a>.',
      '«L\'ultima»: quando è finita la diretta precedente, quanto è durata, il «picco spettatori» se c\'era un dato, i «nuovi follower» e i «messaggi». Il tasto «Tutte le dirette» porta alla scheda con tutti i rapporti.',
    ] },
    { p: ['Se il pannello non riesce a sapere se sei in onda, la carta dice «Adesso non riesco a sapere se sei in onda. Riprovo fra un minuto.» e riprova da sola.'] },

    { h3: 'Il tuo bot' },
    { p: ['La carta per accendere il bot e decidere quando sta in chat.'] },
    { tabella: [
      ['Controllo', 'Cosa fa', 'Di base'],
      ['Interruttore «Bot acceso» / «Bot spento»', 'Accende o spegne il bot sul canale. Il cambio vale subito, e lo conferma «Bot acceso!» o «Bot spento.».', 'Acceso.'],
      ['«in chat adesso» / «non connesso»', 'Dice se il bot è dentro la tua chat di Twitch. Si legge quando apri il pannello.', 'Solo lettura.'],
      ['«Quando dev\'essere attivo»', '«Sempre (24/7)» oppure «Solo quando sei in diretta».', '«Sempre (24/7)».'],
      ['«Salva modalità»', 'Salva la scelta del menù qui sopra. Risponde «Modalità salvata ✓».', ''],
    ] },
    { p: [
      'Con <strong>«Sempre (24/7)»</strong> il bot sta in chat giorno e notte, finché l\'interruttore è acceso.',
      'Con <strong>«Solo quando sei in diretta»</strong> entra nella tua chat di Twitch da solo quando parte la diretta ed esce quando finisce. Di solito se ne accorge subito, al massimo in un paio di minuti. Fuori onda, in questa modalità, il badge dice «non connesso» ed è normale.',
      'L\'interruttore vale sopra la modalità: da spento, il bot non risponde in nessun caso.',
      '<strong>Spegnerlo non cancella nulla.</strong> Comandi, monete, memoria e impostazioni restano, e quando lo riaccendi riparte da dove era rimasto.',
      'L\'interruttore e la modalità li usa anche un moderatore.',
      'Se trasmetti su Kick o su YouTube, lo stato del collegamento con quelle chat sta nella carta «Le tue piattaforme» della scheda «Il tuo account».',
    ] },
    { p: ['Il proprietario di un canale Twitch vede anche la riga «Permessi:» con sei badge. Verde con la spunta vuol dire dato, giallo con «da concedere» vuol dire che manca.'] },
    { tabella: [
      ['Badge', 'Cosa accende'],
      ['chat', 'Il bot che parla nella tua chat.'],
      ['VIP', 'Il premio VIP e i VIP dati dal bot.'],
      ['moderazione', 'Cancellare messaggi e dare timeout.'],
      ['shoutout', 'Lo shoutout ufficiale di Twitch dai comandi.'],
      ['annunci', 'Gli annunci evidenziati in chat.'],
      ['ore guardate', 'Il comando <code>!ore</code> e la fedeltà di chi guarda.'],
    ] },
    { p: [
      'Sotto c\'è «Aggiorna i permessi»: apre Twitch, confermi, e si aggiornano tutti, anche quelli nuovi. Se qualcosa non funziona, è il primo tasto da premere.',
      'Un moderatore al posto della riga vede «Permessi del bot:» con «chat attiva» o «chat non attiva». I permessi li dà solo il proprietario.',
    ] },

    { h3: 'Stai provando … gratis' },
    { p: [
      'Compare solo durante una <strong>prova gratuita</strong>. Il titolo dice cosa stai provando («Base» o «tutto») e un badge dice quanto manca: «ancora 5 giorni», «scade domani», «scade oggi». Sotto c\'è la data in cui finisce.',
      'La prova non chiede una carta e non addebita niente. Quando finisce torni all\'Essenziale: quello che hai configurato resta, le funzioni in più si spengono. Il tasto «Vedi i pacchetti» porta alla scheda «Abbonamento».',
    ] },
  ],
  faq: [
    { d: 'Il bot non risponde in chat. Da dove comincio?', r: 'Da questa scheda. Guarda l\'interruttore: deve dire «Bot acceso». Guarda la modalità: con «Solo quando sei in diretta» il bot fuori onda non c\'è. Se in alto c\'è la carta rossa «Il bot è scollegato dalla chat», premi «Ricollega i permessi».' },
    { d: 'Ho cambiato la password di Twitch e il bot è sparito.', r: 'Twitch ha invalidato il permesso. Il bot prova a rinnovarlo da solo. Se non ci riesce compare la carta «Il bot è scollegato dalla chat»: premi «Ricollega i permessi», confermi su Twitch e il bot rientra.' },
    { d: 'Lo shoutout o <code>!ore</code> non funzionano.', r: 'Guarda la riga «Permessi:» nella carta «Il tuo bot». Se il badge è giallo con «da concedere», premi «Aggiorna i permessi».' },
    { d: 'Sono in onda ma la carta dice «Non sei in diretta».', r: 'La carta si aggiorna una volta al minuto. Aspetta un minuto, oppure passa a un\'altra finestra e torna: si aggiorna anche così.' },
    { d: '«La prossima» non compare.', r: 'Viene da «La tua settimana». Se non hai scritto i giorni in cui vai in onda, il proprietario vede il tasto «La tua settimana» per compilarla.' },
    { d: 'Perché non vedo quanti spettatori ho?', r: 'Il numero degli spettatori lo dà solo Twitch. Su Kick e YouTube la carta mostra la durata e i numeri della chat.' },
    { d: 'Spegnere il bot cancella qualcosa?', r: 'No. Il bot esce dalla chat e basta: quando lo riaccendi ritrovi tutto.' },
    { d: 'Un moderatore può spegnere il bot?', r: 'Sì: l\'interruttore e la modalità li usa anche un moderatore. I permessi Twitch invece li dà solo il proprietario.' },
    { d: 'In basso a destra compare «Mancano dei permessi». Cosa faccio?', r: 'Premi «Fammi vedere»: ti porta qui, alla carta «Nuovi permessi da concedere». Premi «Aggiorna i permessi» e conferma su Twitch. Quando i permessi ci sono, l\'avviso non torna più.' },
    { d: 'Il pannello resta fermo sulla copertina.', r: 'Succede con una connessione lenta, o al primo caricamento dopo un aggiornamento. Dopo 6 secondi la copertina dice «ci vuole ancora un attimo…». Dopo 25 secondi dice «ci sta mettendo più del solito» e compare «Riprova», che ricarica la pagina.' },
  ],
};
