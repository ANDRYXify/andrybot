// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Manuale: CONSOLify, i tasti del canale sul telefono o su una tastiera fisica. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'consolify',
  schede: ['consolify'],
  titolo: 'Manuale di CONSOLify: i tasti del tuo canale | SocialBot',
  h1: 'CONSOLify: i tasti del tuo canale, sul telefono o su una tastiera fisica',
  desc: 'Contatori, effetti, frasi, suoni e cambi di scena a un tocco: dal telefono mentre trasmetti, da un secondo schermo o dai tasti di una tastiera fisica.',
  aggiornata: '2026-09-27',
  corpo: [
    { h2: 'CONSOLify: la plancia dei tasti', scheda: 'consolify', p: [
      'CONSOLify è una griglia di tasti grandi. La apri sul telefono, sul tablet o su un secondo schermo, e con un tocco fai partire una cosa. Sta nel gruppo «Durante la diretta» del menù.',
      'Ogni tasto <strong>dice com\'è andata</strong>: sotto compare la risposta, per esempio il numero nuovo del contatore. Se qualcosa non riesce, il tasto si colora e dice perché.',
      'Non serve nessun piano: CONSOLify c\'è anche nell\'Essenziale. I moderatori che hai fatto entrare nel pannello premono e modificano i tasti come te, e possono rigenerare la chiave.',
      'Sul telefono in verticale la plancia non si vede e compare «Gira il telefono». In orizzontale i tasti stanno larghi e li prendi al primo colpo.',
    ] },

    { h3: 'CONSOLify: premere e costruire i tasti' },
    { p: [
      'In alto ci sono «Modifica i tasti», «Aggiorna» e la spia dell\'overlay: dice «overlay collegato», oppure che nessun overlay è collegato. Senza overlay, effetti, suoni, immagini e video non hanno dove andare e i loro tasti rispondono «nessun overlay collegato». L\'overlay lo aggiungi al programma con cui mandi in onda: <a href="/manuale/overlay">manuale dell\'overlay</a>.',
      'Premi un tasto: sotto compare «…», poi il passo a cui è arrivato (per esempio 2/3) e alla fine la risposta. Con un passo solo, il tasto dice quello che ha fatto. Con più passi dice l\'ultima risposta, oppure quanti passi sono riusciti e il primo errore, per esempio «2/3 · nessun overlay collegato».',
      'Se al tasto hai messo «Chiedi conferma prima di premerlo», prima compare «Faccio partire «…»?» con «Fallo partire». La conferma la chiede il pannello: dalla tastiera fisica il tasto parte subito.',
      'Le pagine sono linguette in alto: premi il nome per cambiare pagina. Se i tasti non si caricano leggi «non riesco a leggere i tasti»: premi «Aggiorna».',
      '<strong>Le azioni sono già le tue.</strong> Nascono da quello che hai configurato. Aggiungi un contatore e le sue azioni compaiono da sole; cancellalo e spariscono, insieme ai passi che le usavano.',
    ] },
    { tabella: [
      ['Azione', 'Cosa fa', 'Da dove nasce'],
      ['Per un contatore «Morti»: «Morti +1» e «Morti −1», col passo del contatore', 'Cambia il numero, lo scrive in chat e aggiorna il contatore a schermo, se lo mostri.', 'Da ogni contatore della scheda «Comandi».'],
      ['«Morti a zero»', 'Riporta il contatore a zero, lo scrive in chat e aggiorna lo schermo.', 'Da ogni contatore.'],
      ['«!nome» dell\'effetto', 'Fa partire l\'effetto nell\'overlay, come quando lo chiama la chat.', 'Da ogni effetto della scheda «Effetti & suoni».'],
      ['«Racconta una battuta»', 'Il bot ne dice una: prima dalle battute del canale, se sono finite ne costruisce una.', 'C\'è sempre.'],
      ['«Fai dire una frase»', 'Il bot scrive in chat la frase che metti nel passo, fino a 200 caratteri.', 'C\'è sempre.'],
    ] },
    { p: [
      '<strong>Costruire la plancia.</strong> Premi «Modifica i tasti»: il tasto diventa «Fatto» e compaiono gli strumenti. In modifica i tasti non partono, quindi sistemi tutto senza mandare niente in chat. Premi «Fatto» per tornare a usarli.',
    ] },
    { tabella: [
      ['Strumento', 'Cosa fa', 'Limiti'],
      ['Linguetta «+»', 'Aggiunge una pagina. La prima si chiama «Principale», le nuove «#2», «#3» e così via.', 'fino a 8 pagine'],
      ['«Rinomina pagina»', 'Cambia il nome della pagina che hai davanti.', '24 caratteri'],
      ['«Elimina pagina»', 'Toglie la pagina con i suoi tasti, dopo la conferma «Elimino questa pagina?».', 'c\'è solo con almeno due pagine'],
      ['S, M, L', 'La misura dei tasti.', 'di base M'],
      ['«Formato»', 'La griglia: 3×3, 3×4, 3×5, 4×4, 4×6, 5×8 o «libero», che si allarga con i tasti e li raggruppa per tipo.', 'di base 3×4'],
      ['Posto libero «+»', 'Crea un tasto vuoto e apre la sua scheda. C\'è in ogni formato.', 'fino a 48 tasti per pagina'],
      ['Matita e × sul tasto', 'La matita apre la scheda del tasto, la × lo toglie.', ''],
      ['‹ › e trascinamento', 'Spostano il tasto dentro la pagina.', ''],
    ] },
    { p: [
      'Nei formati a griglia il «+» sta nel primo posto dopo i tasti; nel formato libero sta in fondo, dopo tutti i gruppi. Quando i posti sono pieni, scegli un formato più grande o apri un\'altra pagina. Una pagina tiene al massimo 48 tasti: se ne aggiungi, duplichi o sposti uno in una pagina piena leggi «La pagina «…» è piena: tiene al massimo 48 tasti.»',
      '<strong>La scheda di un tasto.</strong> Si apre quando crei un tasto o premi la matita. Ogni campo che cambi si salva da solo, senza un tasto per salvare. Se il salvataggio non riesce, in alto leggi «non salvato».',
    ] },
    { tabella: [
      ['Campo', 'Cosa fa', 'Limiti'],
      ['«Nome sul tasto»', 'Il nome che vedi sul tasto. Vuoto, prende il nome dell\'azione o del primo passo.', '24 caratteri'],
      ['«Sposta nella pagina»', 'Porta il tasto in fondo a un\'altra pagina.', 'solo in una pagina con meno di 48 tasti'],
      ['«Cosa fa, in fila»', 'I passi del tasto, in ordine. Vedi la tabella dei passi.', 'fino a 8 passi'],
      ['«Icona»', 'Una delle nostre icone, oppure «nessuna».', ''],
      ['Un\'immagine tua', 'Un\'immagine al posto dell\'icona. Ha un indirizzo pubblico, così la stessa faccia la metti anche sul tasto della tastiera fisica. Un SVG diventa PNG.', 'PNG, JPG, WEBP, GIF o SVG, fino a 2 MB'],
      ['«Oppure un carattere tuo»', 'Un carattere o un\'emoji al posto dell\'icona. Vuoto, resta quella scelta sopra.', '4 caratteri'],
      ['«Colore»', 'Nessuno, uno dei 7 proposti o uno qualunque dal selettore.', ''],
      ['«Chiedi conferma prima di premerlo»', 'Prima di partire il tasto chiede conferma, nel pannello.', 'spento di base'],
      ['«Indirizzo di questo tasto»', 'L\'indirizzo per la tastiera fisica, con la chiave coperta. «mostra» la scopre, «copia» la copia.', ''],
      ['«Duplica»', 'Crea una copia subito dopo, con un indirizzo suo.', 'solo se la pagina ha meno di 48 tasti'],
      ['«Togli il tasto»', 'Cancella il tasto. «Chiudi» chiude la scheda.', ''],
    ] },
    { p: [
      '<strong>I passi.</strong> Un tasto può fare più cose di seguito. Scegli il tipo accanto a «Aggiungi passo» e premilo: il passo si salva subito. I passi vanno in ordine, e se uno non riesce gli altri succedono lo stesso: chi ti guarda ha già visto i primi.',
      '<strong>Da completare.</strong> Un passo a cui manca ancora quello che lo fa agire (la frase, il file, la scena, la fonte, la transizione o il nome del comando) resta nel tasto con il segno «da completare». Premendo il tasto quel passo si salta e gli altri partono. Se il tasto ha solo passi da completare non fa niente, e sotto il tasto leggi «da completare».',
    ] },
    { tabella: [
      ['Passo', 'Cosa fa', 'Limiti'],
      ['«Fai una cosa che hai già»', 'Una delle tue azioni, dalla tabella sopra. Per «Fai dire una frase» scrivi il testo nel campo «cosa deve dire».', '200 caratteri di testo'],
      ['«Dì una frase in chat»', 'Il bot scrive la frase in chat.', '400 caratteri'],
      ['«Manda questo (immagine, video o suono)»', 'Premi «Scegli il file» e lo carichi lì, sul tasto. Poi regoli «dura» e «vol». Con «cambia» lo sostituisci, e il file vecchio viene cancellato.', 'durata da 0,5 a 30 secondi, volume da 0 a 100'],
      ['«Cambia scena in regia»', 'Cambia la scena del programma con cui mandi in onda.', 'scegli fra le scene lette dal programma'],
      ['«Muta o smuta una fonte»', 'Su una fonte fa «inverti», «muta» o «smuta».', 'scegli fra le fonti lette'],
      ['«Fai partire una transizione»', 'Sceglie la transizione del programma: il cambio di scena successivo usa quella.', 'scegli fra le transizioni lette'],
      ['«Manda il risultato di un comando»', 'Esegue un tuo comando di chat come se lo scrivessi tu. In chat esce quello che il comando produce, non la scritta del comando.', 'nome senza «!», fino a 40 caratteri'],
      ['«Aspetta»', 'Una pausa fra due passi.', 'da 0,1 a 30 secondi'],
    ] },
    { p: [
      'I passi di regia propongono le scene, le fonti e le transizioni che il pannello ha letto dal programma. Se il programma non è collegato leggi, per esempio, «nessuna scena: collega la regia qui sotto».',
      'Il file di «Manda questo» passa dalla stessa compressione degli effetti e occupa lo spazio del canale. Se lo spazio è finito leggi «spazio del canale esaurito: togli qualche media, effetto o font e riprova».',
      'Accanto a ogni passo ci sono ‹ › per spostarlo e × per toglierlo. Un tasto deve fare almeno una cosa: se provi a togliere l\'ultimo passo leggi «Un tasto deve fare almeno una cosa. Cambiala, oppure togli il tasto.». Al nono passo leggi «Un tasto fa al massimo 8 passi: oltre, non si capisce più.»',
      '<strong>Le idee pronte.</strong> Un tasto appena creato non fa ancora niente e propone sei idee: «Manda un link», «Manda un suono», «Manda un\'immagine», «Racconta una battuta», «Cambia scena» e «Vado in pausa». Scegline una: mette i passi, il nome e l\'icona, e poi cambi quello che vuoi. I passi che aspettano qualcosa da te nascono «da completare»: il link da scrivere, il file da scegliere. «Cambia scena» e «Vado in pausa» prendono la prima scena e la prima fonte lette dal programma; se il programma non è collegato, anche quei passi restano da completare.',
    ] },

    { h3: 'Il programma con cui mandi in onda' },
    { p: [
      'Collega il programma con cui trasmetti e i tasti cambiano scena, mutano una fonte, scelgono la transizione. Funziona con OBS Studio: il collegamento è il suo server WebSocket, che accendi nelle sue impostazioni.',
    ] },
    { passi: [
      { t: 'Premi «Collega»', d: 'Non devi compilare niente: il pannello prova da solo il tuo computer sulle porte 4455 e 4444, con e senza password.' },
      { t: 'Se chiede una password', d: 'La spia dice «Ci sono, ma chiede una password: incollala qui sotto.» e compare un campo solo, «La password che vedi nelle impostazioni del programma». Incollala lì e premi Invio o «Collega»: il pannello riprova da solo.' },
      { t: 'Collegato', d: 'La spia dice che è collegato, e sotto compaiono «Le tue scene». Premi una scena e il programma la cambia. La scena in onda è evidenziata e segue anche i cambi fatti dal programma.' },
    ] },
    { p: [
      'Se il programma non chiede una password, basta un clic. Se preferisci così, nel programma togli la spunta all\'autenticazione. Sotto le scene leggi quante scene, fonti e transizioni il pannello ha letto: quando costruisci un tasto te le propone, e non devi ricopiare niente.',
      'Il pannello si ricorda il collegamento <strong>in questo browser</strong>. Da lì in poi si ricollega da solo appena apri il pannello, in qualunque scheda, e se il programma si chiude riprova ogni 30 secondi. «Stacca» lo ferma finché non premi di nuovo «Collega» o non riapri il pannello. «Scorda tutto» cancella indirizzo e password da questo computer, dopo la conferma «Scordo indirizzo e password?».',
      'Se il programma usa un\'altra porta, apri «Oppure a mano» e scrivi «Indirizzo» (di base 127.0.0.1), «Porta» (di base 4455) e, se serve, «Password del collegamento». Poi premi «Collega».',
      'Il collegamento arriva solo al programma che gira <strong>sullo stesso computer</strong> del pannello: un indirizzo di rete lo blocca il browser. Se in «Oppure a mano» scrivi un indirizzo di rete e il programma non risponde sul tuo computer, leggi «Solo il tuo computer: un indirizzo di rete lo blocca il browser, non noi.»',
      'Se il programma non risponde leggi «Non risponde: controlla che il programma sia aperto e che il collegamento sia acceso nelle sue impostazioni.» Se la password è sbagliata leggi «Ci sono, ma la password non è quella giusta: ricopiala dalle impostazioni del programma e incollala qui sotto.», e ricompare il campo della password.',
      '<strong>La password non passa da noi.</strong> Indirizzo, porta e password restano nel browser del tuo computer: non arrivano al nostro server e non finiscono nel database.',
      '<strong>Dal telefono le scene funzionano lo stesso.</strong> Il telefono non raggiunge il programma: passa dal pannello aperto e collegato sul computer della regia, che esegue. Tienilo aperto lì mentre trasmetti, anche su un\'altra scheda. Se nessun pannello è collegato, il tasto risponde «nessuna pagina di regia aperta». Se il pannello non risponde entro 6 secondi: «la pagina non ha risposto».',
      '<strong>Anche dai Moduli.</strong> Un comando in chat, la voce o un evento come un raid possono cambiare scena, mutare una fonte o scegliere la transizione, con l\'azione «Regia: scena, muto o transizione». Passa dalla stessa strada, quindi serve lo stesso pannello aperto: <a href="/manuale/moduli">manuale dei moduli</a>.',
    ] },

    { h3: 'Su una tastiera fisica' },
    { p: [
      'Non devi installare niente di nostro. Sulla tastiera aggiungi un tasto con un componente che fa <strong>chiamate web</strong> e ci incolli l\'indirizzo del tasto. Icona e nome li scegli lì.',
      'Questa carta elenca gli indirizzi di tutti i tasti, con il nome, la pagina e «copia» accanto a ciascuno. La chiave dentro l\'indirizzo parte sempre coperta, anche dopo aver ricaricato la pagina: «Mostra la chiave» la scopre, «Nascondi la chiave» la copre.',
    ] },
    { esempio: 'https://socialbot.live/api/console/<canale>/tasto/<tasto>?key=<chiave>' },
    { p: [
      'L\'indirizzo punta al <strong>tasto</strong>, non all\'azione: se domani gli cambi passi, nome o icona, sulla tastiera non rifai niente. Funziona con una chiamata GET o POST.',
      'La risposta contiene <code>ok</code> e <code>mostra</code>, la stessa riga che compare sotto il tasto nel pannello. Il componente la stampa, quindi dopo la pressione leggi il numero nuovo. Lo stesso indirizzo funziona con qualunque programma che sappia fare una chiamata web, e dal browser di un telefono.',
      'Quando qualcosa non va, la risposta lo dice:',
    ] },
    { ul: [
      '«chiave non valida»: la chiave è sbagliata o è stata rigenerata. Ricopia l\'indirizzo.',
      '«troppo in fretta»: più di 40 richieste in un minuto sul canale. Dal pannello un tasto con più passi può contare una richiesta per passo.',
      '«tasto non trovato»: quel tasto non c\'è più.',
      '«da completare»: il tasto ha solo passi da completare. Riempili nella sua scheda.',
      '«nessun overlay collegato» e «nessuna pagina di regia aperta»: vedi sopra.',
      '«!nome non c\'è»: il comando del passo non esiste più.',
      '«manca il testo»: «Fai dire una frase» non ha niente da dire.',
      '«niente da dire»: non c\'è nessuna battuta da raccontare.',
    ] },
    { p: [
      '<strong>La chiave.</strong> È quella che fa agire il tasto senza entrare nel pannello: trattala come una password. Non mostrarla in diretta e non metterla in uno screenshot.',
      'Se ti scappa, premi «Rigenera la chiave» e conferma con «Fai la chiave nuova». Gli indirizzi vecchi smettono di funzionare subito e leggi «chiave nuova: reincolla gli indirizzi». Sulla tastiera fisica li devi rincollare tutti.',
    ] },
  ],
  faq: [
    { d: 'Serve una tastiera fisica?', r: 'No. CONSOLify funziona da sola sul telefono, sul tablet o su un secondo schermo. La tastiera fisica è in più e usa gli stessi tasti.' },
    { d: 'Posso usarla sul telefono mentre trasmetto dal computer?', r: 'Sì, è pensata per questo. Entra nel pannello dal telefono e apri «CONSOLify».' },
    { d: 'Perché nell\'elenco non trovo un\'azione?', r: 'Le azioni nascono dai contatori e dagli effetti. Crea il contatore in «Comandi» o l\'effetto in «Effetti & suoni» e l\'azione compare da sola. Se avevi già CONSOLify aperta, premi «Aggiorna».' },
    { d: 'Premo un effetto e dice «nessun overlay collegato».', r: 'L\'overlay non è aperto nel programma con cui trasmetti. Aggiungilo come sorgente e riprova: la spia in alto diventa «overlay collegato».' },
    { d: 'Dal telefono il cambio scena dice «nessuna pagina di regia aperta».', r: 'Sul computer della regia il pannello deve essere aperto e collegato al programma. Aprilo lì, premi «Collega» la prima volta e lascialo aperto: dalle volte dopo si ricollega da solo.' },
    { d: '«Collega» dice che il programma non risponde.', r: 'Controlla che il programma sia aperto sullo stesso computer e che il suo server WebSocket sia acceso. Se usa una porta diversa da 4455 o 4444, scrivila in «Oppure a mano».' },
    { d: 'Non trovo più il «+» per aggiungere un tasto.', r: 'I posti del formato sono pieni. Scegli un formato più grande in «Formato» o apri un\'altra pagina con la linguetta «+».' },
    { d: 'Se premo due volte succede due volte?', r: 'Sì: un tasto fa quello che dice, ogni volta. Oltre 40 richieste in un minuto il canale risponde «troppo in fretta».' },
    { d: 'Sul telefono vedo solo «Gira il telefono».', r: 'La plancia lavora in orizzontale: gira il telefono e i tasti compaiono.' },
    { d: 'Ho mostrato l\'indirizzo di un tasto in diretta.', r: 'Premi «Rigenera la chiave». Gli indirizzi vecchi smettono subito di funzionare: rincolla quelli nuovi sulla tastiera.' },
  ],
};
