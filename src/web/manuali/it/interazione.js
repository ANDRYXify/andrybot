// Manuale: Manuale di sondaggi, giveaway e penitenze. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'interazione',
  schede: ['sondaggi', 'giveaway', 'penitenze'],
  titolo: 'Manuale di sondaggi, giveaway e penitenze | SocialBot',
  h1: 'Manuale di sondaggi, giveaway e penitenze',
  desc: 'Sondaggi e predizioni di Twitch, il giveaway con le probabilità che scegli tu, le penitenze a punti canale contate a voce: ogni carta e ogni comando.',
  aggiornata: '2026-09-27',
  corpo: [
    { p: [
      'Tre schede che servono <strong>mentre trasmetti</strong>. Stanno in «Chat e pubblico», voce «Giochi», accanto a «Giochi & classifiche».',
      'Il bot apre e chiude i voti di Twitch, pesa i biglietti del giveaway ed estrae, ascolta quello che dici durante una penitenza e tiene il conto.',
    ] },

    { h2: 'Sondaggi & predizioni', scheda: 'sondaggi', p: [
      'Apri sondaggi e predizioni <strong>veri di Twitch</strong>, quelli che compaiono sopra il player, senza passare dalla dashboard di Twitch.',
      'Funzionano solo sui canali Twitch. Twitch dà sondaggi e predizioni ai canali Affiliate e Partner. Sono nel piano Essenziale, quello gratuito.',
      'Dal pannello li apre solo il proprietario del canale. I moderatori li aprono dalla chat, con i comandi spiegati più sotto.',
      'Servono i permessi di Twitch per sondaggi e predizioni. Se il pannello ti dice di concederli, vai nella scheda «Stato» e premi «Aggiorna i permessi».',
    ] },

    { h3: 'Sondaggi' },
    { p: ['Gli spettatori votano dall\'app di Twitch, e il risultato appare sul canale.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Domanda»', 'vuota', 'Twitch ne tiene 60 caratteri', 'La domanda del sondaggio.'],
      ['«Opzioni»', 'quattro campi vuoti', 'almeno 2; 25 caratteri ciascuna', 'Le risposte fra cui si vota. I campi vuoti non contano.'],
      ['«Durata (secondi)»', '120', '15–1800', 'Quanto resta aperto il voto.'],
    ] },
    { p: [
      'Premi «Lancia sondaggio». Il pannello scrive «Sondaggio lanciato» e il bot annuncia il sondaggio in chat, invitando a votare su Twitch.',
      'Mentre è aperto, in cima alla carta vedi «Sondaggio in corso:» con la domanda, e il tasto «Chiudi ora». Chiudere prima del tempo ferma il voto e mostra il risultato su Twitch.',
    ] },

    { h3: 'Predizioni' },
    { p: ['Gli spettatori scommettono i punti canale sull\'esito. Alla fine decidi tu chi vince.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Titolo»', 'vuoto', 'Twitch ne tiene 45 caratteri', 'La domanda su cui si punta.'],
      ['«Esiti»', 'quattro campi vuoti', 'almeno 2; 25 caratteri ciascuno', 'I risultati possibili. I campi vuoti non contano.'],
      ['«Finestra puntate (secondi)»', '120', '30–1800', 'Per quanto si può puntare.'],
    ] },
    { p: [
      'Premi «Apri predizione». Il pannello scrive «Predizione aperta» e il bot invita la chat a puntare.',
      'Finita la finestra le puntate si chiudono, e la predizione resta lì finché non la risolvi. In cima alla carta vedi «Predizione in corso:» con il titolo, e sotto «Fai vincere:» un tasto per ogni esito. Premi quello giusto: Twitch paga chi ha indovinato e il bot scrive in chat chi ha vinto.',
      'Se l\'esito non è più decidibile, premi «Annulla e rimborsa»: Twitch restituisce i punti a tutti. Una predizione va sempre chiusa, perché finché resta aperta i punti di chi ha puntato restano bloccati.',
      'Twitch tiene un sondaggio e una predizione alla volta: se ce n\'è già uno aperto, il pannello dice che Twitch l\'ha rifiutato.',
    ] },

    { h3: 'I comandi in chat' },
    { p: ['Li usano i moderatori e tu. Dalla chat la durata è sempre di due minuti.'] },
    { tabella: [
      ['Comando', 'Cosa fa'],
      ['<code>!sondaggio Domanda | opzione | opzione</code>', 'Apre un sondaggio. Da 2 a 5 opzioni, separate da <code>|</code>. <code>!poll</code> fa lo stesso.'],
      ['<code>!sondaggio chiudi</code>', 'Chiude quello aperto e mostra il risultato. Valgono anche <code>stop</code>, <code>fine</code> e <code>termina</code>.'],
      ['<code>!predizione Titolo | esito | esito</code>', 'Apre una predizione, da 2 a 10 esiti. Il bot scrive gli esiti numerati. <code>!prediction</code> e <code>!pronostico</code> fanno lo stesso.'],
      ['<code>!predizione vince 2</code>', 'Risolve sull\'esito indicato, per numero o per nome, anche solo con l\'inizio del nome. Valgono anche <code>risolvi</code>, <code>esito</code> e <code>win</code>.'],
      ['<code>!predizione annulla</code>', 'Annulla e <strong>rimborsa</strong> i punti a tutti. Valgono anche <code>cancella</code> e <code>rimborsa</code>.'],
    ] },
    { p: [
      'Scritto male, il comando risponde con un esempio di come si apre. Se il nome dell\'esito non torna, il bot risponde con l\'elenco numerato degli esiti. Se manca un permesso, il bot lo dice in chat.',
      'Questi comandi li spegni, li rinomini o li riservi nella scheda «Comandi», come gli altri comandi pronti.',
    ] },

    { h2: 'Giveaway', scheda: 'giveaway', p: [
      'Un\'estrazione a premi: la community entra scrivendo una parola in chat, e tu estrai il vincitore. L\'estrazione è pesata: puoi dare più possibilità ad abbonati e VIP, ma nessuno vince di sicuro.',
      'È nel piano Essenziale, quello gratuito, e vuole «Attiva i minigiochi in chat» acceso nella scheda «Giochi & classifiche». Con i minigiochi spenti il giveaway non si apre, né dal pannello né dalla chat.',
      'Dal pannello lo gestisce solo il proprietario del canale. I moderatori lo gestiscono dalla chat.',
    ] },

    { h3: 'La carta Giveaway' },
    { p: ['Senza giveaway aperto la carta dice «Nessun giveaway in corso.» e mostra i campi per aprirne uno.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Premio in palio»', 'vuoto: «un premio a sorpresa»', 'fino a 120 caratteri', 'Cosa si vince. Il bot lo annuncia in chat.'],
      ['«Parola per entrare»', 'join', 'fino a 20 caratteri: lettere senza accenti, cifre e trattino basso', 'La parola che si scrive in chat per entrare, dopo il «!».'],
      ['«Vincitori (predefinito)»', '1', '1–50', 'Quanti vincitori estrae «Estrai» se non cambi il numero.'],
      ['«Sub» in «Probabilità (biglietti a testa)»', '2', '1–20', 'Biglietti di chi è abbonato.'],
      ['«VIP»', '2', '1–20', 'Biglietti di un VIP.'],
      ['«Mod»', '1', '1–20', 'Biglietti di un moderatore e tuoi.'],
      ['«Riservato agli abbonati (sub)»', 'spento', 'acceso o spento', 'Entrano solo abbonati, moderatori e tu.'],
    ] },
    { p: [
      'Premi «Apri il giveaway». Il pannello scrive «Giveaway aperto!» e il bot lo annuncia in chat, con la parola per entrare e le probabilità di abbonati e VIP.',
      'Con il giveaway aperto la carta mostra «Giveaway in corso:» con il premio, l\'etichetta «solo sub» se è riservato, quanti partecipanti ci sono, la parola con cui entrano e quanti biglietti ci sono in tutto.',
      'Nel campo «Quanti» scegli quanti vincitori estrarre, da 1 a 50: parte dal numero di «Vincitori (predefinito)». Premi «Estrai». Sotto compare «Ha vinto:» o «Hanno vinto:» con i nomi di chi ha vinto finora in questo giveaway, e il bot li annuncia in chat. Se non è entrato nessuno, la carta scrive «Nessun partecipante ancora.»; se hanno già vinto tutti quelli entrati, «Non resta nessuno da estrarre.».',
      'Chi vince esce dall\'estrazione: puoi premere «Estrai» di nuovo per altri vincitori, sempre persone diverse.',
      '«Annulla» chiude il giveaway, e il bot scrive in chat che è annullato. Premilo anche quando hai finito di estrarre, per chiuderlo.',
    ] },
    { esempio: '🎁 GIVEAWAY APERTO: una gift card! Scrivete !join per partecipare. 🎫 sub ×2 · vip ×2 (più possibilità!) In bocca al lupo! 🍀' },

    { h3: 'Le probabilità' },
    { p: ['Ogni partecipante ha dei <strong>biglietti</strong>, e l\'estrazione è pesata: più biglietti, più probabilità. «2» vuol dire il doppio delle possibilità, «1» come tutti.'] },
    { tabella: [
      ['Chi', 'Biglietti di base', 'Limiti'],
      ['Tutti', '1', 'fisso'],
      ['Abbonati', '2', 'da 1 a 20'],
      ['VIP', '2', 'da 1 a 20'],
      ['Moderatori e tu', '1', 'da 1 a 20'],
      ['Biglietti in più, dati a mano', '0', 'fino a 100 a persona, con <code>!biglietti</code>'],
    ] },
    { p: [
      'Chi è sia abbonato sia VIP prende il valore più alto, non la somma. I biglietti in più si aggiungono sopra.',
      'I moderatori partono da 1 perché di solito gestiscono il giveaway invece di giocarlo. Se nel tuo canale giocano anche loro, alza il numero.',
      'Anche con «Riservato agli abbonati (sub)» l\'estrazione resta pesata: fra gli abbonati, chi è anche VIP o moderatore prende il suo valore.',
      'Le probabilità si scelgono solo dal pannello. Un giveaway aperto dalla chat usa quelle di base: 2 per abbonati e VIP, 1 per i moderatori.',
    ] },

    { h3: 'Entrare e gestire dalla chat' },
    { tabella: [
      ['Comando', 'Chi', 'Cosa fa'],
      ['<code>!join</code>', 'tutti', 'Entra nel giveaway. Valgono anche <code>!partecipa</code> e <code>!entra</code>. Con una parola tua si entra solo con quella, anche senza «!» se il messaggio è solo quella parola.'],
      ['<code>!giveaway premio</code>', 'mod e streamer', 'Apre il giveaway. <code>!giveaway sub premio</code> lo riserva agli abbonati, <code>!giveaway parola=vinci premio</code> sceglie la parola per entrare. Valgono anche <code>!sorteggio</code> e <code>!gw</code>.'],
      ['<code>!giveaway stato</code>', 'mod e streamer', 'Dice premio, partecipanti e biglietti, e con quale parola si entra.'],
      ['<code>!biglietti @nome 3</code>', 'mod e streamer', 'Dà 3 biglietti in più a chi è già entrato. Senza numero ne dà uno, con un numero negativo li toglie. <code>!ticket</code> fa lo stesso.'],
      ['<code>!estrai</code>', 'mod e streamer', 'Estrae un vincitore. <code>!estrai 3</code> ne estrae tre, fino a 50. Il bot dice anche quanti restano in gara. <code>!draw</code> e <code>!vincitore</code> fanno lo stesso.'],
      ['<code>!giveaway annulla</code>', 'mod e streamer', 'Chiude il giveaway. Valgono anche <code>stop</code>, <code>cancella</code> e <code>chiudi</code>.'],
    ] },
    { p: [
      'Chi entra non riceve una risposta a testa: con cento persone sarebbero cento messaggi. Lo vedi dal numero dei partecipanti nella carta, o con <code>!giveaway stato</code>.',
      'Con il giveaway riservato, chi non è abbonato scrive la parola e non succede niente.',
      'Un giveaway alla volta per canale. Se ce n\'è uno aperto senza nessuno dentro, aprirne un altro lo sostituisce. Se qualcuno è già entrato, il pannello dice «C\'è già un giveaway aperto.».',
      'Il giveaway resta aperto anche se il bot si riavvia, con i partecipanti e i loro biglietti. Uno dimenticato aperto per più di sette giorni non viene più ripreso.',
      'I comandi del giveaway stanno nella famiglia «Sorteggi» della carta «Comandi dei giochi», dove li spegni, li rinomini o li riservi: vedi il <a href="/manuale/giochi">manuale dei giochi</a>.',
    ] },

    { h2: 'Penitenze', scheda: 'penitenze', p: [
      'Uno spettatore riscatta un premio a punti canale e sceglie una parola. Per qualche minuto il bot <strong>ti ascolta</strong> e tiene un <strong>contatore</strong>, con dei «+1» rossi a schermo. Alla fine, se ci sei cascato, parte <strong>una</strong> penitenza.',
      'Ci sono due modi, ognuno col suo premio. <strong>Vieta la parola</strong>: non devi dirla, e ogni volta che la dici è +1. <strong>Usa solo la parola</strong>: puoi dire solo quella, e ogni frase con un\'altra parola è +1.',
    ] },
    { p: [
      'Cosa serve:',
    ] },
    { ul: [
      'un canale Twitch con i <strong>punti canale</strong>, che Twitch dà ai canali Affiliate e Partner, e il permesso dei punti canale;',
      'l\'extra <strong>«Comandi Vocali»</strong>, da solo o nel pacchetto «Tutto»: lo trovi nella scheda «Abbonamento», spiegata nel <a href="/manuale/account">manuale dell\'account</a>;',
      'la <strong>pagina di ascolto</strong> aperta mentre sei in diretta: la apri dalla scheda «Comandi vocali» con «Apri l\'ascolto vocale», spiegata nel <a href="/manuale/moduli">manuale dei comandi</a>.',
    ] },
    { p: [
      'Le impostazioni le cambiano il proprietario e i moderatori del pannello. I premi a punti canale li sceglie e li crea solo il proprietario, e solo lui prova il contatore nell\'overlay.',
    ] },

    { h3: 'Penitenze a punti canale' },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['Interruttore «Penitenze attive» / «Penitenze spente»', 'spento', 'acceso o spento', 'Accende le penitenze. Da spente, i riscatti dei due premi non fanno partire niente.'],
      ['«Durata (minuti)»', '2', '1–15', 'Per quanto il bot ascolta e conta dopo un riscatto.'],
      ['«La penitenza…»', '«La scelgo dalla mia lista»', '«La scelgo dalla mia lista» o «La inventa l\'IA»', 'Da dove arriva la penitenza finale.'],
      ['«La mia lista di penitenze (una per riga: ne parte una a caso)»', 'vuota', 'fino a 60 righe da 120 caratteri', 'Le tue penitenze. Alla fine ne esce una a caso.'],
      ['«Tolleranza al riconoscimento vocale:»', '80', '50–100, a passi di 5', 'Più alta: conta solo parole quasi identiche. Più bassa: perdona di più gli errori di trascrizione.'],
      ['«Suono/effetto quando scatta la penitenza (facoltativo)»', 'niente', 'un suono pronto o un tuo effetto', 'Parte quando scatta la penitenza. Il menù ha «Suoni pronti», «I miei suoni caricati» e «Immagini / Video».'],
    ] },
    { p: [
      'Premi «Salva»: il pannello scrive «Penitenze salvate». Anche l\'interruttore vale solo dopo «Salva».',
      'Con «La inventa l\'IA» non serve scrivere una lista: se l\'IA non risponde, il bot pesca dalla tua lista, e se è vuota da una lista pronta. Con «La scelgo dalla mia lista» e la lista vuota, la penitenza la inventa l\'IA.',
      'Accanto al menù dell\'effetto, il tasto «Dalla libreria» ti fa scegliere un effetto dalla libreria e lo salva subito: «Effetto impostato ✓». Il tasto «Prova» fa sentire un suono pronto nel tuo browser, e manda un tuo effetto all\'overlay. Gli effetti si caricano nella scheda «Effetti & suoni», spiegata nel <a href="/manuale/effetti">manuale degli effetti</a>.',
      'I controlli che si salvano da soli, come l\'effetto dalla libreria, la posizione del contatore e il premio di un modo, salvano insieme tutta la scheda così com\'è in quel momento, interruttore compreso.',
    ] },

    { h3: 'Contatore a schermo (overlay)' },
    { p: ['Il «+1» e il contatore compaiono nell\'overlay per la diretta, lo stesso degli effetti.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Posizione»', '«In alto a destra»', 'in alto o in basso, a sinistra, al centro o a destra', 'Dove sta il contatore. Si salva appena la cambi: «Overlay salvato ✓».'],
      ['«Colore»', 'rosso', 'qualsiasi colore', 'Il colore del contatore e dei «+1». Si salva appena lo cambi.'],
    ] },
    { p: ['Apri l\'overlay nel tuo programma di diretta, o nel browser, e premi «Prova il contatore nell\'overlay»: parte una prova con la parola «esempio», due «+1» e la penitenza «10 flessioni». Le penitenze vere non vengono toccate.'] },

    { h3: 'I premi a punti canale' },
    { p: [
      'Servono premi <strong>con richiesta di testo</strong>, così lo spettatore scrive la parola. Ce ne vuole uno per modo: uno sotto «Vieta la parola», uno sotto «Usa solo la parola».',
      'Il menù di ogni modo elenca solo i tuoi premi con richiesta di testo, con il loro costo. Sceglierne uno lo salva subito: «Premio impostato ✓».',
      'Se non ne hai, la carta scrive «Non hai premi con la richiesta di testo» e ti propone di crearne uno. Se ne hai, gli stessi campi stanno in «Oppure crea un premio pronto all\'uso».',
    ] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Nome»', '«Vietami una parola» o «Dì solo questa parola»', 'fino a 45 caratteri', 'Il nome del premio su Twitch.'],
      ['«Costo (punti canale)»', '500', 'almeno 1', 'Quanti punti canale costa riscattarlo.'],
    ] },
    { p: [
      'Premi «Crea il premio su Twitch». Il premio nasce su Twitch con la richiesta di testo già pronta, diventa il premio di quel modo e accende le penitenze: l\'interruttore passa a «Penitenze attive». Il pannello scrive «Premio creato su Twitch!».',
      'Se Twitch rifiuta, di solito esiste già un premio con quel nome: cambia «Nome» e riprova.',
      'Il bot riconosce il premio dal nome. Se lo rinomini su Twitch, torna qui e sceglilo di nuovo nel menù.',
      'Se manca il permesso dei punti canale, la carta te lo dice: nella scheda «Stato» premi «Aggiorna i permessi», poi torna qui.',
    ] },

    { h3: 'Come va una penitenza' },
    { passi: [
      { t: 'Il riscatto. ', d: 'Uno spettatore riscatta il premio e scrive una parola. Conta la prima parola che scrive, senza accenti né punteggiatura. Se scrive un solo carattere, la sfida è su quella lettera.' },
      { t: 'L\'annuncio. ', d: 'Il bot scrive in chat chi ha vietato o imposto cosa, e per quanti minuti. Nell\'overlay parte il contatore.' },
      { t: 'L\'ascolto. ', d: 'La pagina di ascolto si accorge della penitenza in pochi secondi e, finché dura, manda al bot tutto quello che dici, non solo le frasi dei comandi. A ogni errore il contatore sale e a schermo compare un «+1».' },
      { t: 'La fine. ', d: 'Scaduto il tempo, se il contatore è sopra zero il bot scrive la penitenza, moltiplicata per le volte che ci sei cascato, e parte l\'effetto se l\'hai scelto. Se il contatore è a zero, il bot scrive che sei salvo.' },
    ] },
    { esempio: '🔒 Luca ti ha VIETATO la parola "praticamente" per 2 minuti! Se la dici… si conta. 😈\n⏱️ Tempo scaduto! La parola "praticamente": beccato 3 volte → PENITENZA: 10 flessioni ×3 😈' },
    { p: [
      'Una penitenza sola, non tre: il «×3» dice quanto pesa. Se due spettatori riscattano insieme, corrono due penitenze, ognuna col suo contatore.',
      'Se il bot si riavvia durante una penitenza, la riprende da dove era. Una penitenza scaduta da più di un\'ora non viene più ripresa.',
    ] },

    { h3: 'Come conta' },
    { tabella: [
      ['Sfida', 'Cosa fa +1'],
      ['Vieta una parola', 'Ogni volta che la dici, anche più volte nella stessa frase.'],
      ['Usa solo una parola', 'Ogni frase in cui dici un\'altra parola. Le parole di una lettera sola, come «e» o «a», non contano.'],
      ['Vieta una lettera', 'Ogni volta che quella lettera compare in quello che dici.'],
      ['Usa solo una lettera', 'Ogni frase in cui quella lettera non c\'è.'],
    ] },
    { p: [
      'Il riconoscimento vocale sente male, quindi il confronto è <strong>tollerante</strong>: una parola capita a metà ma sostanzialmente giusta conta, una parola diversa che ci somiglia per caso no. Quanto è tollerante lo decide «Tolleranza al riconoscimento vocale:». Le parole di tre lettere o meno devono combaciare esatte.',
      'La stessa frase sentita due volte in tre secondi conta una volta sola.',
      'L\'audio resta sul tuo computer: la pagina di ascolto trasforma la voce in testo e al bot arriva solo il testo. Tutto quello che dici va al conteggio solo mentre una penitenza è in corso.',
    ] },

    { h2: 'Quando qualcosa non va' },
    { ul: [
      '<strong>Il sondaggio non si apre.</strong> Se il pannello chiede un permesso, nella scheda «Stato» premi «Aggiorna i permessi». Se dice che Twitch l\'ha rifiutato, forse ce n\'è già uno aperto: chiudilo. Servono almeno due opzioni, e il canale deve essere Affiliate o Partner.',
      '<strong>Il pannello dice «solo il proprietario del canale può farlo».</strong> Sondaggi, predizioni e giveaway dal pannello sono del proprietario. Da moderatore usa i comandi in chat.',
      '<strong>Il giveaway non si apre.</strong> Accendi «Attiva i minigiochi in chat» nella scheda «Giochi & classifiche». Se c\'è già un giveaway con qualcuno dentro, chiudilo prima con «Annulla».',
      '<strong>Nessuno entra nel giveaway.</strong> Controlla la parola d\'ingresso: se l\'hai cambiata, in chat va scritta quella, non <code>!join</code>. Con «Riservato agli abbonati (sub)» acceso, chi non è abbonato non entra.',
      '<strong>Vincono sempre gli stessi.</strong> Guarda le probabilità: con numeri alti un gruppo piccolo di abbonati domina. Metti tutto a 1 e diventa un\'estrazione alla pari.',
      '<strong>Il riscatto non fa partire la penitenza.</strong> Controlla che le penitenze siano accese e salvate, e che nel menù di quel modo ci sia il premio giusto. Se hai rinominato il premio su Twitch, sceglilo di nuovo.',
      '<strong>La penitenza non conta.</strong> La pagina di ascolto deve essere aperta e avviata con «Avvia ascolto», col microfono concesso, in Chrome o Edge. Serve l\'extra «Comandi Vocali». Dopo il riscatto aspetta qualche secondo: la pagina se ne accorge da sola.',
      '<strong>Conta parole che non ho detto.</strong> Alza «Tolleranza al riconoscimento vocale:». Le lettere sono più fragili delle parole: per le sfide lunghe conviene una parola intera.',
    ] },
  ],
  faq: [
    { d: 'I sondaggi sono quelli di Twitch o una cosa vostra?', r: 'Quelli di Twitch: compaiono sopra il player come se li avessi aperti dalla dashboard di Twitch. Il bot li apre e li chiude al posto tuo, dal pannello o dalla chat.' },
    { d: 'Un moderatore può aprire un sondaggio o un giveaway?', r: 'Sì, dalla chat, con i comandi di questa pagina. Dal pannello solo il proprietario del canale.' },
    { d: 'Il giveaway resta se il bot si riavvia?', r: 'Sì: resta aperto con i partecipanti e i loro biglietti. Uno dimenticato aperto per più di sette giorni non viene più ripreso.' },
    { d: 'Posso estrarre più vincitori insieme?', r: 'Sì: dal pannello con «Quanti», dalla chat con !estrai 3. Escono sempre persone diverse.' },
    { d: 'Le penitenze funzionano senza punti canale?', r: 'No: parte tutto dal riscatto di un premio a punti canale. Il tasto «Prova il contatore nell\'overlay» serve solo a vedere come appare.' },
    { d: 'Il bot mi ascolta sempre?', r: 'Ascolta la pagina di ascolto, finché la tieni aperta e avviata. Durante una penitenza manda al bot tutto quello che dici, finché non finisce. Il resto del tempo manda le frasi dei comandi vocali, e quello che dici solo se hai acceso «Impara mentre parlo» (vedi il <a href="/manuale/moduli">manuale dei comandi</a>). L\'audio non esce dal tuo computer: arriva solo il testo.' },
  ],
};
