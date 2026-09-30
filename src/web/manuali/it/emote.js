// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Manuale: Manuale delle emote 7TV. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'emote',
  schede: ['emote'],
  titolo: 'Manuale delle emote 7TV: gestirle dal pannello | SocialBot',
  h1: 'Manuale delle emote 7TV',
  desc: 'Collegare l\'account 7TV, aggiungere, togliere e rinominare le emote del canale, e trasformare un\'immagine, una GIF o un video in un\'emote animata.',
  aggiornata: '2026-09-27',
  corpo: [
    { h2: 'Emote (7TV)', scheda: 'emote', p: [
      'Le emote 7TV del tuo canale si gestiscono da qui: le aggiungi, le togli, le rinomini e ne crei di nuove da un\'immagine, una GIF o un video, senza aprire 7tv.app.',
      'Le emote del canale e quelle globali di 7TV compaiono anche nella chat a schermo dell\'overlay, e quelle del canale volano nel muro delle emote (<a href="/manuale/overlay">manuale dell\'Overlay Studio</a>). Dopo ogni modifica fatta da qui l\'overlay le rilegge subito. Se 7TV risponde lento, l\'overlay tiene l\'ultima lista buona e riprova entro un minuto.',
      'La scheda sta nel gruppo «Scena & overlay» ed è compresa anche nel piano gratuito. È solo per Twitch: con un canale su Kick leggi «Solo su Twitch». Se trasmetti anche su Twitch, collega quell\'account e la scheda si accende.',
    ] },
    { tabella: [
      ['Cosa', 'Proprietario del canale', 'Moderatore'],
      ['Vedere il set', 'sì', 'sì'],
      ['Collegare e scollegare 7TV', 'sì', 'no'],
      ['Aggiungere, caricare, rinominare e togliere emote', 'sì, con 7TV collegato', 'sì, dopo che il proprietario ha collegato 7TV'],
    ] },

    { h3: 'Il tuo account 7TV' },
    { p: [
      'Il set di emote del canale appartiene al <strong>tuo account 7TV</strong>, e solo lui può modificarlo. Per questo serve il suo <em>token</em>, che incolli qui una volta sola. Un tasto per entrare con 7TV non c\'è: l\'accesso di 7TV riporta solo su 7tv.app, e il token non lo consegna a un altro sito.',
      'Il token resta sul server e non torna mai al browser. Il bot lo usa solo verso gli indirizzi ufficiali di 7TV.',
    ] },
    { passi: [
      { t: 'Entra in 7TV', d: 'Vai su <a href="https://7tv.app">7tv.app</a> da un computer e accedi con Twitch: in alto a destra deve comparire il tuo nome. Senza accesso il token non c\'è.' },
      { t: 'Apri gli strumenti per sviluppatori', d: 'Premi F12, o sul Mac ⌘⌥I. Su Chrome ed Edge apri la scheda «Application», su Firefox «Archiviazione». Se non la vedi, è dietro le frecce » in alto.' },
      { t: 'Copia il token', d: 'A sinistra apri «Local storage» e scegli https://7tv.app. Nel filtro scrivi 7tv-token e copia tutto il valore, senza virgolette.' },
      { t: 'Collega', d: 'Incollalo in «Token del tuo account 7TV» e premi «Collega 7TV».' },
    ] },
    { p: [
      'I passi li trovi anche nel pannello, sotto «Come trovo il mio token 7TV?». Va bene anche la scheda «Rete» (Network): in una richiesta verso api.7tv.app è quello che segue «Bearer» nell\'intestazione «authorization». Se incolli anche «Bearer» o le virgolette non importa: si tolgono da sole.',
      'Prima di collegarlo, il bot chiede a 7TV <strong>di chi è quel token</strong> e se può cambiare il set del tuo canale. Va bene il tuo account, o quello di un editor del tuo canale su 7TV. Se 7TV dice di no, il token non si salva.',
      'Collegato, la carta mostra «7TV collegato» col tuo nome su 7TV e il pulsante «Scollega». «Scollega» chiede conferma e cancella il token: da qui non cambi più le emote finché non lo ricolleghi.',
      'Un moderatore legge «Solo il proprietario del canale può collegare o scollegare 7TV.», oppure, se 7TV non è ancora collegato, «7TV non è ancora collegato. Solo il proprietario del canale può collegarlo.»',
    ] },
    { tabella: [
      ['Messaggio', 'Cosa fare'],
      ['«Incolla il token del tuo account 7TV.»', 'Il campo è vuoto.'],
      ['«Il token non ha la forma giusta, o è scaduto»', 'Hai copiato un pezzo sbagliato, oppure il token è scaduto: ricopialo da 7tv.app.'],
      ['«7TV non riconosce questo token: rientra su 7tv.app e copialo di nuovo»', 'La forma è giusta ma 7TV non lo accetta: di solito è di una sessione chiusa. Esci e rientra su 7tv.app, poi ricopialo.'],
      ['«Questo token è dell\'account 7TV @…, che non può cambiare le emote del tuo canale»', 'Hai copiato il token mentre eri dentro 7TV con un altro account. Entra con il tuo, o fatti mettere fra gli editor del canale su 7TV.'],
      ['«Non trovo il tuo account 7TV: collega prima 7TV al tuo Twitch»', 'Su 7tv.app il tuo account non è legato al canale Twitch: collegalo lì, poi riprova.'],
      ['«Sul tuo canale 7TV non c\'è un set di emote attivo»', 'Su 7tv.app attiva un set di emote per il canale, poi riprova.'],
      ['«7TV non risponde adesso: riprova fra un momento»', '7TV non ha risposto: il token non si è salvato. Riprova fra poco.'],
    ] },

    { h3: 'Le tue emote' },
    { p: [
      'Il set attivo del canale, come lo vede la chat. In testa ci sono il nome del set e quanti posti usi su quanti ne hai. Ogni emote mostra l\'immagine e il nome. Le animate hanno l\'etichetta «GIF».',
      'Il set si legge anche senza collegare 7TV. In quel caso il proprietario legge «Queste sono le emote del tuo canale (sola lettura).» e le emote non hanno pulsanti.',
      'Con 7TV collegato ogni emote ha due pulsanti. La matita la <strong>rinomina</strong> nel tuo canale: si apre «Come chiamo questa emote?», fino a 100 caratteri. L\'emote resta quella dell\'autore, ma da te si scrive come vuoi. Fatto, leggi «Emote rinominata ✓».',
      'La ✕ la <strong>toglie</strong> dal set, dopo una conferma: «Puoi rimetterla da 7TV quando vuoi.» Fatto, leggi «Emote rimossa.»',
      'Con il set vuoto leggi «Nessuna emote nel set. Aggiungine qui sotto!». Se 7TV non risponde leggi «Non riesco a leggere il tuo emote-set.»',
    ] },

    { h3: 'Aggiungi emote' },
    { tabella: [
      ['Come', 'Quando serve', 'Cosa fai'],
      ['«Cerca un\'emote…»', 'Vuoi un\'emote che esiste già.', 'Scrivi e premi «Cerca» o Invio. Arrivano fino a 36 risultati dalla directory pubblica di 7TV, i più popolari prima, ognuno col nome del suo autore. «Aggiungi» sotto un risultato la mette nel set col suo nome.'],
      ['«…oppure aggiungi da link / ID»', 'L\'hai vista in un altro canale e vuoi darle un alias.', 'Incolla l\'indirizzo <code>https://7tv.app/emotes/…</code> o solo l\'ID. L\'alias è facoltativo, fino a 40 caratteri. Premi «Aggiungi».'],
      ['«Carica una tua emote»', 'L\'emote non esiste: la fai tu.', 'Vedi la carta qui sotto.'],
    ] },
    { p: [
      'Dai risultati della ricerca l\'emote entra senza alias. Per aggiungerla con un alias copia il suo link e usa «…oppure aggiungi da link / ID», oppure rinominala dopo.',
      'Quando va a buon fine leggi «Emote aggiunta ✓». Altri messaggi: «Nessuna emote trovata.», «Ricerca non disponibile ora.», «Incolla il link o l\'ID di un\'emote 7TV.», «Non riconosco questa emote: incolla il link o l\'id di 7TV», «Collega prima il tuo account 7TV.».',
    ] },

    { h3: 'Carica una tua emote' },
    { p: ['Scegli il file, scrivi il nome dell\'emote e, se vuoi, l\'alias nel canale. Premi «Carica su 7TV»: mentre lavora il pulsante dice «Converto e carico…». Il bot converte il file nel formato che vuole 7TV e lo aggiunge subito al set.'] },
    { tabella: [
      ['Campo', 'Limiti', 'Note'],
      ['«File (immagine / GIF / video)»', 'fino a 60 MB', 'un file audio non va bene'],
      ['«nome dell\'emote (senza spazi)»', 'da 2 a 60 caratteri; gli spazi si tolgono', 'il nome con cui l\'emote nasce su 7TV'],
      ['«alias nel canale (facoltativo)»', '60 caratteri', 'come si scrive nel tuo canale; vuoto vale il nome'],
    ] },
    { ul: [
      'Un\'immagine diventa un\'emote ferma, in WebP.',
      'GIF e video diventano un\'emote animata in WebP, in loop, con la trasparenza dov\'era. Le GIF trasparenti restano trasparenti.',
      'Di un video si tengono i <strong>primi 6 secondi</strong>, senza audio.',
      'Il lato più lungo arriva a 384 pixel, a 20 fotogrammi al secondo.',
      'L\'emote convertita deve pesare meno di <strong>7 MB</strong>, il limite di 7TV.',
    ] },
    { p: [
      'Se tutto va bene leggi «Emote caricata e aggiunta al canale ✓». Se 7TV prende l\'emote ma non la aggiunge al set, per esempio perché il set è pieno o l\'alias è già usato, leggi «Emote caricata su 7TV ✓» e sotto una nota col motivo. L\'emote resta sul tuo account 7TV e la aggiungi quando hai sistemato.',
      'Su 7TV le emote le vede solo chi ha la loro estensione.',
    ] },
    { tabella: [
      ['Messaggio', 'Cosa fare'],
      ['«Scegli un file da caricare.»', 'Manca il file.'],
      ['«Dai un nome all\'emote (min 2 caratteri, niente spazi).»', 'Scrivi un nome di almeno due caratteri.'],
      ['«un\'emote non può essere un audio»', 'Scegli un\'immagine, una GIF o un video.'],
      ['«animazione troppo pesante: prova un video più corto o più piccolo»', 'Taglia il video o riducine le dimensioni prima di caricarlo.'],
      ['«immagine troppo pesante anche dopo la conversione»', 'Usa un\'immagine più piccola o con meno dettagli.'],
      ['«file troppo grande (max 60MB)»', 'Il file supera 60 MB: accorcialo o rimpiccioliscilo prima.'],
    ] },

    { h3: 'Quando non funziona' },
    { ul: [
      '<strong>«7TV non accetta più il token collegato: scollega 7TV e ricollegalo con un token nuovo».</strong> Il token di 7TV scade, o è stato revocato. Il proprietario preme «Scollega» e incolla un token nuovo. Un moderatore legge invece «7TV non accetta più il token del canale: chiedi al proprietario di ricollegare 7TV».',
      '<strong>«7TV dice: …».</strong> È 7TV che ha rifiutato la modifica, e il motivo è il suo, in inglese. Per esempio quando un\'emote con lo stesso nome c\'è già nel set.',
      '<strong>«Emote aggiunta» vuol dire aggiunta davvero.</strong> Il pannello lo dice solo quando 7TV risponde col set su cui ha lavorato. Se 7TV non conferma leggi «7TV non ha fatto la modifica».',
      '<strong>Aggiungo un\'emote e in chat non si vede.</strong> Twitch e 7TV tengono la loro copia per qualche minuto. Nella chat a schermo dell\'overlay si vede prima.',
      '<strong>L\'alias non si applica.</strong> Un alias già usato da un\'altra emote del set non si può ripetere: due emote con lo stesso nome in chat sarebbero indistinguibili.',
      '<strong>Il set è pieno.</strong> Quanti posti hai lo decide 7TV in base al tuo livello lì. Si libera togliendo un\'emote.',
      '<strong>Non vedo matita e ✕.</strong> Compaiono solo con 7TV collegato: senza, il set è in sola lettura.',
    ] },
  ],
  faq: [
    { d: 'Serve un abbonamento a 7TV?', r: 'No per collegare l\'account. Quanti posti ha il tuo set lo decide 7TV in base al tuo livello lì.' },
    { d: 'Il mio token 7TV è al sicuro?', r: 'Resta sul server, non passa mai dal browser, e il bot lo usa solo verso gli indirizzi ufficiali di 7TV. Da 7tv.app puoi revocarlo quando vuoi.' },
    { d: 'Se tolgo un\'emote la perdo?', r: 'No: esce dal tuo set, ma resta su 7TV e la puoi rimettere.' },
    { d: 'Posso trasformare una clip in emote?', r: 'Sì: carichi il video e lo convertiamo noi. Si tengono i primi 6 secondi, senza audio. Se è troppo pesante, accorcialo prima.' },
    { d: 'I miei moderatori possono gestire le emote?', r: 'Sì, dopo che hai collegato 7TV: aggiungono, caricano, rinominano e tolgono. Collegare e scollegare 7TV resta a te.' },
    { d: 'Le emote si vedono anche nell\'overlay?', r: 'Sì: nella chat a schermo quelle del canale e quelle globali di 7TV, nel muro delle emote quelle del canale.' },
  ],
};
