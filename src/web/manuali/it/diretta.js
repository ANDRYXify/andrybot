// Manuale: Manuale della diretta: regia, clip, musica e comandi a voce. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'diretta',
  schede: ['regia', 'dirette', 'statistiche', 'ascolto', 'clip', 'musica'],
  titolo: 'Manuale della diretta: regia, clip e comandi a voce | SocialBot',
  h1: 'Manuale della diretta: regia, clip, musica e comandi a voce',
  desc: 'Comandare il canale senza aprire Twitch, far nascere le clip da sole, le richieste musicali e i comandi a voce.',
  aggiornata: '2026-09-04',
  corpo: [
    { p: [
      'Queste schede servono <strong>mentre trasmetti</strong>. Il filo che le tiene insieme: mentre giochi non puoi guardare il pannello, quindi tutto quello che sta qui o si fa da solo, o si fa a voce, o si fa con un clic.',
      'Conviene tenere il pannello aperto su un secondo schermo: è pensato per stare lì.',
    ] },

    { h2: 'Regia: il canale senza aprire Twitch' },
    { p: ['Titolo, categoria e tag si cambiano da qui e si aggiornano su Twitch subito. <strong>Vale anche da offline</strong>, quindi puoi preparare la diretta prima di accendere.'] },
    { tabella: [
      ['Campo', 'Limite', 'Nota'],
      ['Titolo', '140 caratteri', 'Lo stesso limite di Twitch.'],
      ['Categoria', '—', 'Si cerca scrivendo: l\'elenco è quello vero di Twitch.'],
      ['Tag', 'massimo 10', 'Separati da virgola.'],
    ] },
    { p: ['Sopra c\'è lo <strong>stato della diretta</strong> (online, spettatori, da quanto), e sotto le <strong>azioni rapide</strong>: marker, clip, annuncio. Il marker è il più sottovalutato: costa un clic e ti risparmia mezz\'ora di scrubbing quando monti il VOD.'] },
    { p: ['Titolo, categoria, annunci e clip li fa <strong>Twitch</strong> per conto tuo: se un permesso manca, il bot te lo dice invece di fallire in silenzio, e si riautorizza dalla scheda Stato.'] },

    { h2: 'Il rapporto di ogni diretta' },
    { p: ['Quando chiudi, la scheda <em>Dirette</em> riceve una carta con i numeri della serata: durata, picco di spettatori e media, messaggi e chi ha scritto di più, nuovi follower e sub (con i regali), raid con gli spettatori portati, i Bit della serata con chi ne ha messi di più (chi ha cheerato in anonimo conta nel totale e resta senza nome), presenti e prime volte, l’hype train con il livello a cui è arrivato e chi l’ha spinto, clip, donazioni. Numeri, non aggettivi: sono quelli veri del canale, raccolti da SocialBot mentre trasmettevi. Un puntino sulla voce di menù ti dice che ce n\'è uno nuovo.'] },
    { p: ['Da lì scegli anche dove riceverlo appena chiudi: su <strong>Telegram</strong>, nella chat privata del tuo bot (va collegata in <em>Notifiche</em>), oppure <strong>via mail</strong>. Per la mail scrivi l\'indirizzo e premi <em>Conferma</em>: ti arriva un messaggio con un tasto, e l\'indirizzo vale solo dopo il clic. La mail la manda il nostro server, non un servizio esterno; se sul server la posta non è configurata, la scheda lo dice e resta Telegram.'] },
    { p: ['La mail non è un tabulato: apre con la cosa che è saltata all\'occhio quella sera (un record di spettatori, un raid, le facce nuove), poi i tre numeri grossi, chi ha scritto di più e il resto. In fondo ci sono <strong>le clip della serata</strong>, una per una, da riaprire quando vuoi: è il pezzo che si riguarda. Ha i colori del sito e si adatta al fondo chiaro o scuro del tuo programma di posta.'] },
    { h2: 'Le statistiche e le classifiche' },
    { p: [
      'Erano sparse in tre schede con tre facce diverse: i numeri della settimana in <em>Memoria</em>, le classifiche delle monete dentro la carta del premio VIP in <em>Giochi</em>, le serie di presenze ancora in Memoria. Ora stanno tutte nella scheda <em>Statistiche</em>, e sopra c\'è una cosa che prima non c\'era: il <strong>periodo</strong>. Sette giorni, trenta, oppure da sempre.',
      'I numeri sono dirette fatte, ore in onda, picco di spettatori, messaggi della chat e quante persone li hanno scritti, interventi del bot, nuovi follower, sub, raid, clip e donazioni. Dirette, ore, picco, follower e sub vengono <strong>dai rapporti di fine diretta</strong>, cioè dagli stessi numeri che leggi nella scheda Dirette: non è un secondo conto che col tempo si scolla dal primo.',
      'Le classifiche sono cinque e dicono cose diverse: le <strong>monete</strong> del pubblico e dello staff, <strong>chi c\'è sempre</strong> (le serie di presenze), <strong>chi scrive di più</strong> nel periodo scelto, e <strong>chi guarda di più</strong>, che ha bisogno del conteggio delle ore acceso in <em>Comandi</em>.',
      'In fondo, le ultime dirette una sotto l\'altra con durata, picco, media, chat e clip: è il modo per accorgersi se una serata è andata diversamente dalle altre. Da lì un tasto porta ai rapporti per intero.',
    ] },

    { p: ['La prima volta che entri dopo l\'attivazione te lo chiedo io, con una finestra: scrivi l\'indirizzo e ti mando la conferma. Se rispondi no, non te lo chiedo più, da nessun computer.'] },
    { p: [
      '<strong>Come sai che una mail è davvero nostra.</strong> In fondo a ogni messaggio che ti mandiamo c\'è un <strong>codice di verifica</strong>, e lo trovi nel pannello alla scheda <em>Stato</em>: lì e da nessun\'altra parte. Chi imita una nostra mail non può saperlo, perché per saperlo dovrebbe entrare nel tuo pannello.',
      'Cambia ogni lunedì, ed è diverso per ogni canale. Nella scheda trovi anche quelli delle settimane scorse del mese, per le mail che apri in ritardo. Se il codice non combacia, quella mail non l\'abbiamo scritta noi: non aprire i collegamenti.',
    ] },
    { p: ['Un riavvio del bot a metà serata non perde il rapporto: riparte dall\'inizio che le presenze ricordano, e al più manca il picco di prima.'] },

    { h2: 'Clip automatiche' },
    { p: ['Accese di base. Il bot non conta i messaggi: guarda quando la chat <strong>esplode di reazioni</strong>, ride tutta insieme, o quando arrivano sub, bit e raid. E si adatta al ritmo del tuo canale, quindi la stessa sensibilità significa cose diverse su un canale da 10 e su uno da 1000.'] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti', 'Cosa cambia'],
      ['Clip automatiche', 'accese', '—', 'Se spente, restano solo quelle fatte a mano.'],
      ['Sensibilità', '5', '1–10', 'Alta = più clip, anche i momenti tiepidi. Bassa = solo i picchi veri.'],
    ] },
    { p: ['Le clip create finiscono in <em>Memoria</em>, dove trovi le ultime venti. Se dopo una serata ne trovi trenta, la sensibilità è troppo alta: due o tre buone valgono più di trenta da scartare.'] },

    { h2: 'Momenti salienti: il bot ascolta la diretta' },
    { p: ['Sta in <em>Comandi a voce</em>, ed è una cosa diversa dai comandi vocali. Qui è <strong>il server</strong> che ascolta l\'audio della tua diretta e riconosce i momenti forti — quindi funziona anche se il tuo computer è occupato a giocare.'] },
    { ul: [
      '<strong>Sensibilità 1–10</strong>: stessa logica delle clip automatiche.',
      '<strong>Consuma risorse del server</strong>: è limitato a pochi canali in diretta insieme.',
      '<strong>C\'è un ritardo di 15-30 secondi</strong>, dovuto a come Twitch distribuisce il video. Le clip prendono comunque il momento giusto, perché guardano indietro.',
    ] },

    { h2: 'Comandi a voce' },
    { p: ['Questi girano <strong>nel tuo browser</strong>, non sul server: apri la pagina di ascolto, premi Avvia, e quando dici una parola chiave il bot fa quello che hai impostato. <strong>L\'audio non esce dal tuo computer</strong>: viene trasformato in testo lì, e al bot arriva solo la parola.'] },
    { ul: [
      'Serve <strong>Chrome o Edge</strong> (Mac o Windows). Tieni la pagina aperta mentre streami.',
      'I comandi vocali si creano e si modificano in <strong>Comandi</strong>, con l\'innesco «Comando vocale»: è lo stesso motore dei comandi di chat, non un secondo pannello.',
    ] },
    { h3: 'Cambiare categoria dicendola' },
    { p: ['Un caso a parte, perché è quello che serve più spesso. Dici la parola chiave seguita dal gioco — «<strong>categoria</strong> Fortnite» — e il canale cambia categoria su Twitch. Se ti sente male <strong>prova comunque a indovinare</strong> la categoria più somigliante invece di rinunciare.'] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti'],
      ['Parola chiave', 'categoria', '30 caratteri — «gioco», «passa a», quel che vuoi'],
      ['Annuncia il cambio in chat', 'acceso', '—'],
    ] },
    { p: ['Serve il permesso <strong>Gestione canale</strong> di Twitch. Se manca, il pannello lo dice e ti riporta qui dopo l\'autorizzazione.'] },

    { h2: 'Richieste musicali' },
    { p: ['Gli spettatori mettono canzoni nella <strong>tua</strong> coda di Spotify. Serve Spotify <strong>Premium</strong> e l\'app aperta: la coda è quella vera del tuo account, non una playlist nostra.'] },
    { tabella: [
      ['Comando', 'Chi', 'Cosa fa'],
      ['<code>!sr &lt;canzone o artista&gt;</code>', 'secondo come la fai pagare', 'Aggiunge un brano alla coda.'],
      ['<code>!song</code>', 'tutti', 'Dice cosa sta suonando. <code>!brano</code> è lo stesso.'],
    ] },
    { p: ['Se la ricerca trova più brani plausibili, il bot <strong>chiede quale</strong> («intendi 1, 2 o 3?») e aspetta <strong>90 secondi</strong> la risposta. Meglio una domanda che la canzone sbagliata in coda.'] },
    { p: ['La richiesta si può far pagare in cinque modi: <strong>libera</strong>, solo <strong>abbonati</strong>, con le <strong>monete</strong> del canale, con i <strong>bit</strong> o con i <strong>punti canale</strong>. Su un canale vivace «libera» dura poco: le monete sono il freno più naturale, perché chi chiede ha già dovuto esserci.'] },

    { h2: 'Quando qualcosa non parte' },
    { ul: [
      '<strong>Cambio titolo e non cambia.</strong> Manca il permesso Gestione canale: si riautorizza dalla scheda Stato.',
      '<strong>Non nasce nessuna clip.</strong> Guarda se sei davvero in diretta e se la sensibilità non è a 1. Le clip le crea Twitch: senza il permesso, il bot lo dice in chat.',
      '<strong>!sr non risponde.</strong> Spotify collegato, Premium attivo, app aperta: servono tutte e tre. Con l\'app chiusa non esiste una coda in cui mettere il brano.',
      '<strong>La voce non sente.</strong> Il microfono va concesso al browser, la pagina di ascolto deve restare aperta e serve Chrome o Edge.',
      '<strong>«Categoria» non cambia il gioco.</strong> La parola chiave va detta <em>prima</em> del nome: «categoria Fortnite», non «metti Fortnite».',
    ] },
  ],
  faq: [
    { d: 'Serve OBS per usare gli overlay?', r: 'Serve OBS o un qualunque programma che sappia aprire una pagina web come sorgente: l\'overlay è una pagina, non un plugin da installare.' },
    { d: 'Il bot registra la mia voce?', r: 'No. I comandi a voce diventano testo nel tuo browser e il bot riceve solo la parola. L\'ascolto dei momenti salienti lavora sull\'audio pubblico della diretta, quello che già sentono tutti.' },
    { d: 'Posso usare le clip automatiche e fare clip a mano?', r: 'Sì, non si escludono. Le azioni rapide della Regia hanno un tasto clip che funziona sempre.' },
    { d: 'Perché la coda musicale va sul mio Spotify e non su una lista vostra?', r: 'Perché la musica la senti tu e la sentono i tuoi spettatori dallo stesso posto, con i tuoi diritti d\'ascolto. Una lista nostra sarebbe un\'altra riproduzione, con altri problemi.' },
    { d: 'Se chiudo il pannello si ferma tutto?', r: 'No: regia, clip, musica e moderazione girano sul server. Si fermano solo i comandi a voce, che vivono nel browser.' },
  ],
};
