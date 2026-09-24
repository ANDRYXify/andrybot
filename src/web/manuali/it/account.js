// Manuale: Manuale dell'abbonamento: piani, extra e moderatori. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'account',
  schede: ['stato', 'account', 'sottoscrizione'],
  titolo: 'Manuale dell\'abbonamento: piani, extra e moderatori | SocialBot',
  h1: 'Manuale dell\'abbonamento: piani, extra e moderatori',
  desc: 'Cosa è gratis per sempre, cosa aggiungono i singoli extra, come si cambia o si disdice, e cosa succede a quello che hai creato.',
  aggiornata: '2026-09-04',
  corpo: [
    { p: [
      'La regola: <strong>l\'Essenziale è gratis e resta gratis</strong>, senza carta. Il resto si aggiunge <em>uno per uno</em>, quando serve, e si toglie quando non serve più.',
      'Niente pacchetti che ti fanno pagare sei cose per averne una.',
    ] },

    { h2: 'Cosa c\'è nell\'Essenziale' },
    { ul: [
      'Il bot che scrive in chat <strong>col tuo account</strong>.',
      '<strong>Comandi e moduli illimitati</strong>, con tutte le azioni.',
      '<strong>Moderazione</strong> completa e <strong>scudo anti-bot</strong>.',
      '<strong>Overlay</strong> per la diretta, <strong>alert</strong> con immagini, video e suoni, e <strong>contatori</strong> a schermo.',
      '<strong>Giochi e monete</strong>, classifiche, premio VIP, giveaway, sondaggi e predizioni.',
      '<strong>Effetti</strong> in overlay, anche a punti canale, e le penitenze.',
      '<strong>Richieste musicali</strong> su Spotify e il player a schermo.',
      'Personalità, conoscenza, memoria, pagina link e grafiche.',
    ] },
    { p: ['La regola è semplice: <strong>quello che gli altri bot danno gratis, qui è gratis</strong>. Si paga solo ciò che altrove non c\'è.'] },
    { p: ['Non è una prova a tempo e non chiede una carta: è il piano su cui il prodotto sta in piedi da solo.'] },

    { h2: 'Gli extra' },
    { p: ['Ogni extra accende una parte precisa. Il prezzo aggiornato sta nella scheda: qui c\'è <strong>cosa fa</strong>, che è la cosa che non cambia.'] },
    { tabella: [
      ['Extra', 'Cosa accende', 'Se lo spegni'],
      ['Base', 'Avvisi di diretta e nuovi post sulle altre reti, il bot su Telegram, lo Studio Web, e un moderatore.', 'Gli avvisi non partono più e il moderatore non entra; le impostazioni restano.'],
      ['Clip Automatiche', 'I momenti migliori clippati da soli.', 'Le clip già fatte restano; smette di farne di nuove.'],
      ['Comandi Vocali', 'Guidare il bot parlando, e il cambio categoria a voce.', 'L\'ascolto si ferma; i moduli con innesco vocale restano scritti ma non scattano.'],
      ['Squadra', 'Fino a dieci moderatori sul pannello.', 'Resta il posto del Base.'],
      ['Tutto', 'Clip, voce e squadra insieme, a meno della somma.', 'Come spegnere i tre extra uno per uno.'],
    ] },
    { p: ['Giochi, effetti e richieste musicali erano extra a pagamento: ora stanno nell\'Essenziale. Chi li aveva comprati non deve fare niente, e può disdirli dal portale quando vuole.'] },
    { p: ['Il principio è sempre lo stesso: <strong>spegnere un extra non cancella niente di tuo</strong>. Comandi, monete, effetti caricati, classifiche e impostazioni restano dove sono, e riaccendendo l\'extra ritrovi tutto com\'era.'] },

    { h2: 'Aggiungere un extra' },
    { p: ['Si fa dalla scheda stessa, sotto «Puoi aggiungere»: spunti quello che manca, il totale è quello che pagherai in più al mese, e il tasto lo attiva. Sull\'Essenziale il totale comprende il Base.'] },
    { p: ['Chi ha già il Base <strong>non lo ripaga</strong>: l\'extra entra nell\'abbonamento che c\'è, e i giorni che restano del mese vanno nella prossima fattura, in proporzione.'] },

    { h2: 'Cambiare, mettere in pausa, disdire' },
    { p: ['Il tasto «Gestisci» apre il <strong>portale dei pagamenti</strong>: fatture, carta e disdetta stanno lì. Non serve scriverci: la disdetta è un pulsante.'] },
    { p: ['Se un rinnovo non passa, la scheda lo dice e il tasto porta al portale per aggiornare la carta. Nel frattempo sei sull\'Essenziale; appena il pagamento passa, le funzioni tornano da sole.'] },
    { p: ['Se disdici, l\'abbonamento resta attivo <strong>fino alla fine del periodo già pagato</strong>, poi il canale torna all\'Essenziale. Niente si cancella.'] },

    { h2: 'Moderatori' },
    { p: ['Un moderatore entra nel pannello con il <strong>suo</strong> account — Twitch o Kick — e può occuparsi di comandi, moduli, effetti, giochi, notifiche, regole e memoria. Non può toccare le cose da proprietario: permessi, abbonamento, chiave del canale.'] },
    { p: ['Le strade per farlo entrare sono <strong>due</strong>, e vanno nei due versi opposti.'] },
    { ul: [
      '<strong>L\'invito</strong>: scegli la piattaforma, scrivi il suo nome e nasce un indirizzo. Chi lo apre entra, e da quel momento vedi il tuo canale anche dal suo pannello.',
      '<strong>La richiesta</strong>: chi ti modera già sul canale può chiedere lui l\'accesso, senza aspettare il tuo link. La trovi nella scheda, e decidi tu.',
    ] },
    { p: ['Su Twitch la richiesta arriva <strong>già confermata</strong>: prima di mostrartela chiediamo a Twitch chi modera il tuo canale, e se quella persona non c\'è la richiesta non parte nemmeno. Su Kick e YouTube la conferma automatica non è possibile — l\'elenco dei moderatori non è pubblico — quindi la richiesta ti arriva marcata «da controllare tu», e il nome lo guardi con i tuoi occhi.'] },
    { p: ['Una richiesta in attesa <strong>non è un moderatore</strong>: non vede niente, non tocca niente e non occupa un posto del tuo piano finché non le dici di sì. Se dici di no, quella persona non può richiederti di nuovo per un mese.'] },

    { h2: 'Domande che arrivano quando si guarda il prezzo' },
    { ul: [
      '<strong>Il bot smette se non pago?</strong> No. L\'Essenziale non scade, e il bot resta in chat anche se un abbonamento finisce o un rinnovo non passa.',
      '<strong>Serve la carta per registrarsi?</strong> No, e nemmeno per usare l\'Essenziale.',
      '<strong>Posso accendere un extra per un mese solo?</strong> Sì: si accende e si spegne quando vuoi, e quello che hai creato resta.',
    ] },
  ],
  faq: [
    { d: 'Che succede ai miei comandi se torno all\'Essenziale?', r: 'Restano tutti. Quelli che dipendono da un extra spento non scattano, ma non vengono cancellati: riaccendendo l\'extra ripartono da soli.' },
    { d: 'Le monete degli spettatori si perdono?', r: 'No. La classifica si ferma dov\'è e riprende da lì.' },
    { d: 'Un moderatore vede i miei dati di pagamento?', r: 'No. Il portale dei pagamenti e i permessi Twitch sono cose da proprietario.' },
    { d: 'Uno sconosciuto può chiedermi di moderare il mio canale?', r: 'Su Twitch no: prima di farti arrivare la richiesta chiediamo a Twitch chi modera il tuo canale, e chi non c\'è viene fermato lì. Su Kick la richiesta può arrivare da chiunque, perché Kick non pubblica quell\'elenco: per questo te la mostriamo marcata «da controllare tu», e finché non dici di sì quella persona non vede niente. Ognuno può avere al massimo tre richieste in attesa in tutto.' },
    { d: 'Moderavo già un canale: devo aspettare che mi mandi il link?', r: 'No. Nella scheda «Il tuo account» scrivi il nome del canale che moderi e mandi la richiesta. Se il canale è su Twitch la conferma è automatica, e allo streamer arriva già verificata.' },
    { d: 'Posso avere il bot su due canali?', r: 'Ogni canale ha il suo abbonamento, perché ogni canale ha la sua chat, le sue monete e i suoi comandi.' },
    { d: 'Dove vedo quanto pago davvero?', r: 'Nella scheda Abbonamento in cima, e nel portale dei pagamenti con le fatture.' },
    { d: 'Ho già il Base e voglio un extra: pago di nuovo il Base?', r: 'No. L\'extra entra nell\'abbonamento che hai, e paghi solo lui: la parte di mese che resta la trovi nella prossima fattura.' },
    { d: 'Ho pagato ma il pannello non lo vede ancora.', r: 'Al ritorno dal pagamento il piano si accende appena Stripe conferma l\'incasso: con la carta è subito, con un bonifico può volerci qualche giorno. Se dopo il messaggio «pagamento in corso» non cambia niente, scrivi ad andryxify.' },
  ],
};
