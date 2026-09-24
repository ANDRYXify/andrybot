// Manuale: CONSOLify: i tasti del tuo canale, sul telefono o su una tastiera fisica. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'consolify',
  schede: ['consolify'],
  titolo: 'CONSOLify: i tasti del tuo canale, sul telefono o su una tastiera fisica | SocialBot',
  h1: 'CONSOLify: i tasti del tuo canale, sul telefono o su una tastiera fisica',
  desc: 'Contatori, effetti, una battuta o una frase a un tocco: dal telefono mentre streami, o dai tasti di una tastiera fisica.',
  aggiornata: '2026-09-04',
  corpo: [
    { p: [
      'Mentre trasmetti non puoi cercare un bottone in una pagina piena di roba. CONSOLify è una <strong>griglia di tasti grandi</strong>: la apri sul telefono o su un secondo schermo, e con un tocco fai partire una cosa.',
      'E ogni tasto <strong>dice com\'è andata</strong>: sotto compare la risposta — per esempio il numero nuovo del contatore. È la differenza fra un deck e una pulsantiera: sai sempre se ha preso.',
    ] },

    { h2: 'I tasti sono già i tuoi' },
    { p: [
      'Nell\'elenco non trovi azioni generiche: trovi <strong>le tue</strong>. Nascono da quello che hai già configurato, quindi <strong>aggiungi un contatore e i suoi tasti compaiono da soli</strong>, con la sua emoji e il suo passo. Cancelli un contatore e i suoi tasti se ne vanno: niente bottoni che sembrano fare qualcosa e non fanno niente.',
    ] },
    { tabella: [
      ['Tasto', 'Cosa fa', 'Da dove nasce'],
      ['Contatore +, −, a zero', 'Cambia il numero, lo dice in chat e aggiorna il widget a schermo', 'Da ogni contatore che hai'],
      ['Effetto', 'Spara un tuo effetto sull\'overlay', 'Da ogni effetto che hai'],
      ['Battuta', 'Ne dice una: prima dal serbatoio, se è vuoto la costruisce', 'C\'è sempre'],
      ['Dì una frase', 'Il bot dice la frase che gli hai scritto', 'C\'è sempre'],
    ] },

    { h2: 'Come si costruisce la plancia' },
    { lista: [
      'Premi <strong>Modifica i tasti</strong>: compare l\'elenco delle tue azioni.',
      'Scegli l\'azione e premi <strong>Aggiungi tasto</strong>. Per «Dì una frase» ti chiede cosa deve dire.',
      'Puoi fare più <strong>pagine</strong>: una per il gioco, una per il momento chiacchiere, come preferisci.',
      'Premi <strong>Fatto</strong> e la plancia torna operativa. In modifica i tasti non sparano: sistemi in pace senza mandare niente in chat.',
    ] },
    { p: ['Sul telefono la plancia si apre <strong>di lato</strong>: in verticale i tasti sarebbero francobolli, e te lo dice invece di darteli schiacciati.'] },

    { h2: 'Un tasto può fare più cose, in fila' },
    { p: [
      'Un tasto non è per forza una cosa sola. Apri la sua scheda e sotto <strong>Cosa fa, in fila</strong> aggiungi i passi che vuoi: vanno in ordine, e se uno non riesce gli altri succedono lo stesso — chi ti guarda ha già visto i primi.',
    ] },
    { tabella: [
      ['Passo', 'Cosa fa'],
      ['Fai una cosa che hai già', 'Un contatore, un effetto, una battuta: quello che nasce dai tuoi contatori e dai tuoi effetti'],
      ['Dì una frase in chat', 'Il bot scrive quello che gli hai messo lì'],
      ['Manda questo', 'Un\'immagine, un video o un suono che carichi <strong>lì sul tasto</strong> — durata e volume li scegli lì'],
      ['Manda il risultato di un comando', 'Non la scritta «!comando»: quello che quel comando produce'],
      ['Cambia scena in regia', 'La scena del programma con cui mandi in onda'],
      ['Muta o smuta una fonte', 'Il microfono, la musica, quello che vuoi'],
      ['Aspetta', 'Da un decimo di secondo a trenta: serve a far respirare la fila'],
    ] },
    { p: [
      'Sotto ogni passo ci sono le frecce per spostarlo e la <strong>×</strong> per toglierlo. Un tasto deve fare almeno una cosa: se togli l\'ultimo passo te lo dice, invece di lasciarti un tasto che non fa niente.',
      'Un media sostituito porta via il file vecchio: non resta niente sul disco che non guardi più.',
    ] },

    { h2: 'Collegare il programma con cui mandi in onda' },
    { p: [
      'Premi <strong>Collega</strong>. Non devi compilare niente: indirizzo e porta sono quelli soliti e li provo io, comprese le porte più usate.',
      'Se il programma <strong>non chiede una password</strong> — cioè se nelle sue impostazioni l\'autenticazione è spenta — hai finito lì: un clic, e sei collegato. È il modo più comodo, e sul tuo computer non toglie niente a nessuno: quel collegamento lo può aprire solo chi è già seduto davanti a quella macchina.',
      'Se invece la chiede, te lo dico e compare un campo solo: incolla la <strong>password</strong> che vedi nelle sue impostazioni, e basta. Indirizzo e porta restano affar mio.',
      '<strong>Una volta sola.</strong> Dalla volta dopo mi collego da solo appena apri il pannello, senza che tu prema niente, e se il programma si chiude e riapre ci riprovo da me ogni mezzo minuto. Con <strong>Stacca</strong> smetto finché non premi di nuovo Collega.',
      'Appena collegato compaiono le tue scene: premi una scena e cambia, come dal programma. Da lì in poi i passi «cambia scena» e «muta una fonte» funzionano dentro i tasti, insieme a tutto il resto.',
    ] },
    { p: [
      '<strong>Dove funziona.</strong> Il collegamento parte da questa pagina e arriva al programma che gira sullo <strong>stesso computer</strong>. Un browser non può cercare i dispositivi della rete né parlare con un altro computer: lo impedisce il browser stesso, e non è una regola che vogliamo aggirare.',
      '<strong>Dal telefono però le scene funzionano.</strong> Non perché il telefono raggiunga il programma — non può — ma perché passa da questo pannello: tu premi sul telefono, il pannello aperto sul computer della regia esegue. Basta tenerlo aperto lì mentre streami. Se non c\'è nessun pannello aperto, il tasto te lo dice invece di rispondere «fatto».',
      '<strong>Anche dai Moduli.</strong> Un comando in chat, la voce o un evento come un raid possono cambiare scena, mutare una fonte o la transizione: è la stessa strada, e la esegue lo stesso pannello.',
      '<strong>La password non passa da noi.</strong> Indirizzo, porta e password restano nel tuo browser, sul tuo computer: non arrivano al nostro server, non entrano nel database e non finiscono nei backup. Con <strong>Scorda tutto</strong> spariscono anche da lì.',
    ] },

    { h2: 'Sulla tastiera fisica vera' },
    { p: [
      'Non devi installare niente di nostro. Sulla tua tastiera aggiungi un tasto con un componente che fa <strong>chiamate web</strong>, e ci incolli l\'indirizzo che trovi nella scheda: ce n\'è uno per ogni tasto della plancia, con il bottone per copiarlo.',
      'L\'indirizzo punta al <strong>tasto</strong>, non all\'azione. Se domani a quel tasto cambi azione, nome o icona, sulla tastiera fisica non devi rifare niente: continua a premere il tasto giusto.',
      'Se vuoi, <strong>icona e nome li puoi scegliere anche lì</strong>, sulla tastiera. E se la tua immagine la carichi da noi, ha un indirizzo pubblico: la stessa faccia la metti anche su quel tasto. Il componente stampa la risposta, quindi dopo la pressione leggi il numero nuovo.',
      'Lo stesso indirizzo funziona con qualunque programma sappia fare una chiamata web, e dal browser di un telefono.',
    ] },

    { h2: 'La chiave, e quando rigenerarla' },
    { p: [
      'L\'indirizzo contiene una <strong>chiave del tuo canale</strong>: è quella che permette al tasto di agire senza fare il login. Trattala come una password — non mostrarla in diretta e non metterla in uno screenshot.',
      'Se ti scappa, premi <strong>Rigenera la chiave</strong>: gli indirizzi vecchi smettono di funzionare all\'istante. Dovrai rifare i tasti sulla tastiera fisica, ed è il prezzo giusto.',
    ] },
  ],
  faq: [
    { d: 'Serve una tastiera fisica?', r: 'No. CONSOLify funziona da sola sul telefono, sul tablet o su un secondo monitor. La tastiera fisica è in più, e usa gli stessi tasti.' },
    { d: 'Perché nell\'elenco non trovo un\'azione?', r: 'Perché le azioni nascono da quello che hai configurato. Se manca un effetto, aggiungilo nella sua scheda: il tasto compare da solo.' },
    { d: 'Posso aprirla sul telefono mentre streamo dal PC?', r: 'Sì, ed è il modo per cui è pensata. È la stessa dashboard: entra dal telefono e vai su CONSOLify.' },
    { d: 'Se premo due volte succede due volte?', r: 'Sì: un tasto fa quello che dice, ogni volta. C\'è solo un tetto di sicurezza se si preme moltissimo in un minuto.' },
  ],
};
