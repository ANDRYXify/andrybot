// Manuale: La tua vetrina (pagina link, donazioni, settimana, grafiche, i tuoi social).
// La forma dei manuali e il perche' stanno in src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'vetrina',
  schede: ['pagina', 'donazioni', 'settimana', 'grafiche', 'notifiche'],
  titolo: 'La tua vetrina: pagina link, donazioni e social | SocialBot',
  h1: 'La tua vetrina: pagina link, donazioni, settimana, grafiche e i tuoi social',
  desc: 'La pagina da mettere in bio, le donazioni sul tuo conto, i giorni in cui vai in onda, le grafiche da pubblicare e gli avvisi quando pubblichi sui social.',
  aggiornata: '2026-09-27',
  corpo: [
    { p: [
      'Cinque schede che lavorano anche quando non sei in onda: la pagina da mettere in bio, le donazioni, i giorni in cui vai in diretta, le grafiche da pubblicare e gli avvisi quando esce qualcosa di tuo sulle altre reti.',
      'Telegram e Discord hanno un manuale a parte: <a href="/manuale/community">Le tue community</a>.',
    ] },

    // ── PAGINA LINK ─────────────────────────────────────────────────────────
    { h2: 'Pagina link', scheda: 'pagina', p: [
      'Una pagina pubblica con tutti i tuoi link, all\'indirizzo <code>socialbot.live/u/tuonome</code>, da mettere nella bio di Instagram o TikTok. C\'è in tutti i piani, anche nell\'Essenziale gratuito, e per ogni canale: Twitch, Kick, YouTube o un server Discord. Chi usa SocialBot solo per un server Discord ha questa scheda, e non le altre quattro di «La tua vetrina».',
      'La costruisce e la pubblica solo chi ha il canale. Un moderatore apre la scheda, ma l\'editor gli risponde «solo il proprietario del canale può farlo».',
      'La pagina si apre e si legge anche con JavaScript spento. Gli script aggiungono solo qualche comodità: il conto alla rovescia, gli effetti di sfondo che si muovono, il modulo delle donazioni senza cambiare pagina e la scelta sui contenuti di altri siti. La pagina non usa cookie e non sa chi la apre: conta solo quante volte viene aperta.',
      'Nella scheda del browser la pagina ha come icona la foto che mostra in alto, la tua o quella che hai caricato. Se la foto non la mostri, resta l\'icona di SocialBot.',
    ] },

    { h3: 'La tua pagina link' },
    { p: [
      'In cima all\'editor leggi lo stato: «Online:» con l\'indirizzo cliccabile, oppure «Non ancora pubblicata: compila e salva.». Finché non la pubblichi, chi apre l\'indirizzo trova una pagina che non c\'è.',
      'Sotto c\'è il contatore delle aperture: il numero grande, «aperture questa settimana», conta gli ultimi sette giorni; accanto leggi oggi, il mese (gli ultimi trenta giorni) e da sempre, con una barra per ognuno degli ultimi quattordici giorni. I programmi automatici, come i motori di ricerca e le anteprime delle chat, non contano.',
      'L\'editor ha tre colonne: i comandi, con le due linguette «Contenuti» e «Aspetto», l\'«Anteprima dal vivo» e il riquadro coi comandi del pezzo che hai scelto. L\'anteprima resta ferma a metà schermo mentre scorri i campi. Sul telefono resta in cima, con «Salva e pubblica» sempre a portata.',
    ] },
    { passi: [
      { t: 'Riempi «Contenuti»', d: 'L\'intestazione, poi i pezzi della pagina: link, social, video, la tua diretta e gli altri. La prima volta trovi già pronto un link al tuo canale.' },
      { t: 'Scegli l\'«Aspetto»', d: 'Parti da un tema pronto, che cambia tutto in un colpo, e ritocca quello che vuoi.' },
      { t: 'Guarda l\'anteprima', d: 'Si aggiorna mentre scrivi, senza salvare, ed è la pagina vera. Con «Telefono» e «Schermo» la vedi nelle due misure. Cliccando un pezzo nell\'anteprima apri i suoi comandi.' },
      { t: 'Premi «Salva e pubblica»', d: 'La pagina va online subito. L\'indirizzo non cambia mai: chi ce l\'ha vede sempre la versione aggiornata.' },
    ] },
    { p: ['Sotto l\'anteprima ci sono i tasti della pagina.'] },
    { ul: [
      '«Salva e pubblica» salva e mette online, e la rimette online se l\'avevi tolta dal web. Leggi «Pubblicata ✓ è già online.».',
      '«Apri» apre la pagina vera in una scheda nuova.',
      '«Togli dal web» compare solo quando la pagina è online. Chiede conferma con «Tolgo la pagina dal web?». Chi apre l\'indirizzo non la trova più, e quello che c\'è dentro resta salvato per quando la rimetti.',
    ] },
    { p: [
      'Un pezzo lasciato a metà, come un link senza indirizzo o un titolo vuoto, non si perde quando salvi. Nell\'anteprima porta la scritta «da completare», e sulla pagina pubblica non compare finché non lo finisci.',
      'Un indirizzo scritto senza <code>https://</code> va bene: lo aggiungo io. Una cosa che non è un indirizzo, invece, al salvataggio si svuota.',
      'In fondo ai comandi rileggi l\'indirizzo della pagina e trovi «Tutorial: come si costruisce», gli stessi tre passi in breve.',
    ] },

    { h3: 'Intestazione' },
    { tabella: [
      ['Comando', 'Cosa fa', 'Limite'],
      ['«Titolo»', 'Il nome grande in cima. Vuoto, va il nome del tuo canale.', '80 caratteri'],
      ['«Sottotitolo»', 'La riga sotto il nome. La leggono anche i motori di ricerca.', '200 caratteri'],
      ['«Immagine del profilo»', '«Quella di Twitch» usa la foto del profilo con cui entri (anche Kick, YouTube o Discord): la prende da sola e si aggiorna quando la cambi là. «Un\'immagine mia (carica o incolla)» apre «Carica una foto» e un campo per l\'indirizzo. «Nessuna» la toglie.', 'PNG, JPG, WEBP o GIF'],
    ] },
    { p: ['Se in quel momento la tua foto non si legge, l\'editor te lo dice e riprova da solo. Intanto puoi scegliere «Un\'immagine mia».'] },

    { h3: 'Quando condividi il link' },
    { p: [
      'Su Telegram, WhatsApp e Discord il link della pagina mostra un\'immagine disegnata coi colori della tua pagina, con nome, sottotitolo, foto e indirizzo. In questa sezione la vedi.',
      '«Apri l\'editor» apre lo stesso editor delle locandine. Scegli un pezzo e lo cambi, lo trascini sulla tela, lo accendi o lo spegni, lo porti più avanti o più indietro, lo duplichi o lo elimini. Hai «Annulla» e «Rifai». «Salva» mette la tua al posto di quella standard, e se chiudi senza salvare te lo chiede prima.',
      '«Torna a quella standard» compare quando ne hai una tua, e la cancella.',
      'Telegram e WhatsApp tengono in memoria l\'immagine per un po\'. Se l\'hai cambiata e vedi ancora la vecchia, aspetta o rimanda il link.',
      'Se leggi «Sul server mancano i caratteri per disegnarla», il tasto è spento e l\'anteprima usa la copertina o la foto profilo.',
    ] },

    { h3: 'Contenuti: i pezzi della pagina' },
    { p: [
      'In fondo alla sezione «Contenuti» ci sono sedici tasti, uno per ogni tipo di pezzo. Ne metti fino a 40: oltre leggi «Hai raggiunto il massimo di blocchi.».',
      'Per cambiare un pezzo lo scegli nell\'elenco, o lo clicchi nell\'anteprima: i suoi comandi compaiono nel riquadro a lato. Lo sposti con le frecce su e giù, oppure trascinandolo per la testa.',
      'In fondo ai comandi di ogni pezzo trovi quattro cose che valgono per tutti.',
    ] },
    { ul: [
      '«Largo»: tutta la riga, tre quarti, due terzi, metà, un terzo o un quarto. Così metti due pezzi uno accanto all\'altro.',
      '«Allinea»: come la pagina, a sinistra, al centro o a destra.',
      '«Entra»: come la pagina, ferma, sfumando, dal basso, ingrandendosi, da sinistra, da destra o ruotando.',
      '«Duplica» e «Togli».',
    ] },
    { tabella: [
      ['Pezzo', 'Cosa metti', 'Limiti'],
      ['«Link»', 'Etichetta, indirizzo e «Riga sotto (facoltativa)». L\'icona la riconosco dall\'indirizzo; se ne scegli una dalla griglia, resta quella. «Carica una miniatura» mette una foto al posto dell\'icona. «Colore del bottone» e «Colore del testo» valgono solo per quel bottone, e «Rimetti come il tema» li toglie. «In evidenza (bottone pieno, colore principale)» lo fa risaltare.', 'etichetta 60, riga sotto 90, indirizzo 500 caratteri'],
      ['«Riga di social»', 'Una fila di icone piccole: un indirizzo per voce, e l\'icona si riconosce da sola. «Aggiungi social» ne mette un\'altra.', 'fino a 12'],
      ['«Titolo di sezione»', 'Un titolo che divide la pagina.', '60 caratteri'],
      ['«Testo»', 'Un paragrafo libero.', '500 caratteri'],
      ['«Immagine»', '«Carica un\'immagine» o incolla un indirizzo, più una descrizione per chi non la vede.', 'descrizione 140 caratteri'],
      ['«Video, musica o pagina»', 'Un titolo sopra, se vuoi, e l\'indirizzo normale di un video, un brano, un album, una playlist, un podcast, una clip o una pagina intera. «Come si vede» ne sceglie la forma, «Altezza del riquadro» l\'altezza, «Colore dietro al riquadro» riempie gli angoli.', 'altezza da 0 a 900 px; 0 = decide il sito'],
      ['«La mia diretta»', 'Il player del tuo canale, sempre sulla pagina: quando sei in onda si vede la diretta, quando non lo sei lo dice da sé. «Piattaforma» Twitch, Kick o YouTube. Il canale vuoto vuol dire il tuo; per YouTube serve l\'ID del canale, quello che comincia con UC. «Mostra anche la chat sotto al player» (solo Twitch), «Parte senza audio» (acceso di base), «Parte da sola».', 'titolo 60, canale 60 caratteri'],
      ['«Copertina»', 'L\'apertura della pagina: titolo grande, sottotitolo, «Immagine di sfondo» (caricata o incollata) e un bottone con testo e indirizzo. «Altezza» Bassa, Media o Quasi a tutto schermo. «Resta ferma: il resto della pagina le scorre sopra».', 'titolo 80, sottotitolo 200, testo del bottone 60 caratteri'],
      ['«Griglia di tessere»', 'Tessere affiancate: per ognuna titolo, riga sotto, indirizzo e «Immagine». «Aggiungi tessera» ne mette un\'altra.', 'fino a 12 tessere'],
      ['«Scritta che scorre»', 'Una riga di testo grande che scorre di continuo. «Velocità» Lenta, Media o Veloce. Chiudila con un simbolo (·, ★): il giro non si vede.', '60 caratteri'],
      ['«Numeri»', 'Numeri grandi con la loro etichetta: follower, anni di dirette, ore in onda. «Aggiungi numero» ne mette un altro.', 'fino a 6; numero 16, etichetta 40 caratteri'],
      ['«Domande frequenti»', 'Domanda e risposta, che si aprono e si chiudono da sole. «Aggiungi domanda» ne mette un\'altra.', 'fino a 12; domanda 60, risposta 500 caratteri'],
      ['«Conto alla rovescia»', 'Un titolo, «Quando» (data e ora) e cosa scrivere quando è ora. L\'ora la scrivi nel tuo fuso: chi guarda la vede nel suo.', 'titolo e testo finale 60 caratteri'],
      ['«Sostieni (donazioni)»', 'Il tasto delle donazioni. Titolo, frase e testo del tasto: vuoti, usano quelli della scheda Donazioni. «Icona del tasto» (di base il cuore). «Porta alla mia pagina delle donazioni, invece del modulo qui». «Mostra l\'obiettivo in euro, se ne hai uno acceso» (acceso di base).', 'titolo e tasto 60, frase 90 caratteri'],
      ['«Chi ha donato»', 'I nomi di chi ha donato: «Gli ultimi che hanno donato» o «I primi per somma», e «Di sempre» o «Degli ultimi 30 giorni». Chi non scrive un nome compare come «Qualcuno» fra gli ultimi e non entra fra i primi. Le donazioni rimborsate non contano. Nel modulo, chi dona legge che il suo nome può comparire qui.', '«Quanti nomi (da 3 a 20)», 5 di base'],
      ['«Riga divisoria»', 'Una linea che separa le sezioni.', ''],
    ] },
    { p: [
      'Per «Video, musica o pagina» va bene l\'indirizzo che copi dal browser. Riconosco YouTube (anche un canale intero), TikTok, Facebook, Spotify, SoundCloud, Twitch, Kick, Apple Music, Deezer, Vimeo, e i post e i reel di Instagram. Il profilo Instagram e la timeline di X non si possono incorporare: Instagram e X non lo permettono.',
      '«Come si vede» ha otto forme: «Come decide il sito (consigliato)», 16:9, quadrato, verticale, alto, medio, barra bassa e vetrina alta. I siti non dicono quanto è alto il loro contenuto: se sotto avanza spazio vuoto, o il contenuto è tagliato, sistema «Altezza del riquadro» guardando l\'anteprima.',
      'Il pezzo «Sostieni (donazioni)» compare sulla pagina solo se le donazioni sono accese e pronte, cioè con un conto collegato o con un link esterno. Finché manca qualcosa, nell\'anteprima leggi cosa manca e in quale scheda sistemarlo.',
      'Le immagini che carichi (PNG, JPG, WEBP o GIF) contano nello spazio del tuo canale. Caricata, leggi «Immagine caricata ✓».',
    ] },

    { h3: 'Aspetto' },
    { p: ['«Aspetto» ha sette linguette. Ogni cambio si vede subito nell\'anteprima. I colori che non tocchi restano quelli dello stile di partenza o del tema.'] },
    { tabella: [
      ['Linguetta', 'Comandi', 'Di base e limiti'],
      ['«Temi»', '21 temi pronti, da «Notte al neon» a «Scintille». Uno cambia in un colpo colori, sfondo, carattere, forma dei bottoni, animazione e disposizione. Appena tocchi un altro comando, il tema non è più segnato come scelto.', ''],
      ['«Impianto»', '«Disposizione»: Colonna, Rivista (i link affiancati su due o tre colonne) o Sezioni (pagina lunga da scorrere). «Movimento»: Fermo, Dolce, Cinema o Star Wars. «Stile di partenza»: la base dei colori, 15 in tutto. «Allineamento»: «Al centro» o «A sinistra». «Larghezza della colonna». «Aria fra un pezzo e l\'altro».', 'Colonna, Dolce, Minimal, Al centro; larghezza da 20 a 46 rem (30); aria dal 40 al 220% (100)'],
      ['«Scrittura»', '«Carattere»: Sistema, Inter, Monospaziato, Con grazie, Condensato, Tondo, Manga (a pennarello). «Spessore»: «Leggero», «Medio», «Marcato». «Carattere dei titoli»: «Come il testo» o un altro. «Maiuscolo»: «Come l\'hai scritto», «Solo i titoli», «Solo i bottoni», «Tutta la pagina». «Interlinea». «Grandezza del testo».', 'Sistema, Marcato; interlinea dal 120 al 200% (150); grandezza dall\'80 al 130% (100)'],
      ['«Colori»', '«Sfondo»: «Tinta unita», «Sfumatura fra due colori» con la sua «Direzione della sfumatura», o «Immagine». «Effetto sopra lo sfondo»: sedici effetti, da aurora a pioggia digitale, o nessuno. «Colore testo», «Colore evidenza», «Colore bottoni», «Colore bordi», «Testo dei bottoni».', 'Tinta unita, nessun effetto; direzione da 0 a 360° (160)'],
      ['«Bottoni»', '«Stile dei bottoni»: «Pieni», «Solo contorno», «Vetro (sfocato)», «Inchiostro (contorno e timbro)». «Ombra dei bottoni»: «Nessuna», «Morbida (sfumata sotto)», «Dura (blocco di colore spostato)», con «Colore dell\'ombra dura». «Immagine profilo»: «Cerchio», «Quadrato stondato», «Non mostrarla». «Angoli dei bottoni». «Spessore del bordo».', 'Pieni, Morbida, Cerchio; angoli da 0 a 999 px (14), 999 fa la pillola; bordo da 0 a 8 px, 0 = quello dello stile'],
      ['«Modi»', '«Animazione d\'ingresso»: «Nessuna», «Dissolvenza», «Dal basso», «Pop». «Puntatore del mouse»: «Quello di sistema» o «Disegnato, coi colori del tema». «Video, musica e pagine di altri siti»: «Caricali subito (consigliato)» o «Caricali solo se il visitatore lo chiede».', 'Dal basso, di sistema, subito'],
      ['«CSS»', '«CSS tuo», per quello che non trovi altrove. Arriva per ultimo e vince su tutto. Hai i colori del tema come <code>var(--acc)</code>, <code>var(--testo)</code> e <code>var(--tenue)</code>, gli angoli <code>var(--r)</code>, la larghezza <code>var(--w)</code>, e le classi <code>.voce</code> (un bottone), <code>.et</code> (la sua etichetta), <code>.tit</code> (un titolo), <code>.par</code> (un testo), <code>.telo</code> (la colonna).', '8000 caratteri'],
    ] },
    { p: ['<strong>L\'immagine di sfondo.</strong> Con «Sfondo» su «Immagine» incolli l\'indirizzo in «Indirizzo dell\'immagine di sfondo», oppure premi «Carica un\'immagine». Poi la metti dove vuoi.'] },
    { ul: [
      '«Spostala sull\'anteprima»: trascini l\'immagine sul telefono dell\'anteprima; con la rotella del mouse, o con due dita, cambi la grandezza. Esc, o di nuovo il tasto, per finire.',
      '«Grandezza»: al 100% l\'immagine copre lo schermo; sotto si rimpicciolisce, sopra si ingrandisce. Va dal 40 al 200%.',
      '«Posizione orizzontale» e «Posizione verticale»: dallo 0 al 100%, di base 50, cioè al centro. Un punto dell\'immagine sta sullo stesso punto dello schermo, sul telefono come sul computer.',
      '«Rimetti al centro» riporta posizione e grandezza di partenza. Un\'immagine nuova riparte sempre da lì.',
      '«Dove l\'immagine non arriva»: quando è più piccola dello schermo, attorno «Continuano i colori dei suoi bordi» (di base), oppure resta «Il colore dello sfondo».',
    ] },
    { p: [
      'Se leggi «L\'immagine non si apre da questo indirizzo: controlla che sia giusto.», l\'indirizzo è sbagliato o il sito non la dà. Se leggi che da questo indirizzo i colori dei bordi non si possono leggere, attorno resta il colore dello sfondo: caricala con «Carica un\'immagine» e i bordi tornano.',
      'Gli angoli dei bottoni non valgono per video e musica: lì un arrotondamento esagerato mangerebbe l\'immagine. Il movimento è tutto in CSS, e chi ha «riduci animazioni» nel sistema non ne vede nessuno. Sul telefono il puntatore non c\'è.',
      'Nel CSS non passano <code>@import</code> e niente che diventi esecuzione di codice, perché la pagina la aprono degli sconosciuti. Gli indirizzi <code>https</code> dentro <code>url()</code> vanno bene.',
      'I contenuti di altri siti (YouTube, Spotify, Twitch e simili) non partono mai senza il permesso del visitatore. Con «Caricali subito (consigliato)» la prima volta gli compare una fascia con «Va bene, carica tutto» e «Solo l\'essenziale», e la sua scelta resta ricordata nel suo browser; in fondo alla pagina «Contenuti di altri siti» gliela fa cambiare. Con «Caricali solo se il visitatore lo chiede» la fascia non c\'è: al posto di ogni video c\'è un cartello con un bottone. In fondo alla pagina c\'è sempre «Privacy», che spiega cosa succede nei due casi.',
    ] },

    { h3: 'La tua diretta in prima pagina' },
    { p: [
      'Questa carta la vede solo chi ha il canale. Quando sei in onda, il tuo canale può comparire fra le dirette sulla prima pagina di SocialBot: il nome, cosa stai giocando, il titolo della diretta e un collegamento al tuo canale.',
      '«Fammi comparire quando sono in diretta» è spento di base. Acceso, leggi «Comparirai fra le dirette quando sei in onda ✓»; spento, leggi «Non comparirai più in prima pagina ✓» e sparisci subito. Non mostriamo niente dei tuoi spettatori, e niente di tuo che non sia già pubblico sul tuo canale.',
      'La fascia delle dirette si aggiorna ogni minuto e mostra fino a dodici canali. Se nessuno è in onda non compare.',
    ] },

    { h3: 'Se la pagina non va' },
    { ul: [
      '<strong>L\'indirizzo dice che la pagina non c\'è.</strong> Non l\'hai ancora pubblicata, o l\'hai tolta dal web: premi «Salva e pubblica».',
      '<strong>La pagina è online ma vuota.</strong> Leggi «Questa pagina non ha ancora contenuti.»: aggiungi almeno un pezzo completo.',
      '<strong>Un link non compare.</strong> Gli manca l\'etichetta o l\'indirizzo: nell\'anteprima è segnato «da completare».',
      '<strong>La foto non c\'è.</strong> Controlla «Immagine del profilo» nell\'intestazione, e in «Aspetto», linguetta «Bottoni», che «Immagine profilo» non sia «Non mostrarla». Se usi quella del tuo profilo e l\'hai appena cambiata, ci mette un po\'.',
      '<strong>L\'icona di un link è sbagliata.</strong> Sceglila dalla griglia del link: da lì l\'indirizzo non la cambia più. Un link accorciato nasconde il sito vero, e resta l\'icona generica.',
      '<strong>Lo sfondo ha una fascia di colore attorno.</strong> L\'immagine è sotto il 100% di «Grandezza»: portala a 100, o scegli come riempire in «Dove l\'immagine non arriva».',
      '<strong>Un video non parte da solo.</strong> È voluto: i contenuti di altri siti aspettano il permesso del visitatore.',
      '<strong>Il tasto delle donazioni non c\'è.</strong> Guarda la scheda Donazioni: servono «Donazioni accese» e un conto collegato, o il link esterno.',
    ] },

    // ── DONAZIONI ───────────────────────────────────────────────────────────
    { h2: 'Donazioni', scheda: 'donazioni', p: [
      'Chi ti segue ti dona dalla pagina link o dalla tua pagina delle donazioni. I soldi arrivano dove li ricevi già: sul tuo conto Stripe, sul tuo negozio Satispay o sulla tua pagina Ko-fi, aperti e gestiti da te. SocialBot non trattiene niente: le commissioni sono quelle del servizio che usi.',
      'A ogni donazione partono l\'avviso in overlay e, se lo accendi, il grazie in chat, e sale l\'obiettivo. Una donazione in un\'altra valuta fa partire l\'avviso e il grazie, ma non conta per l\'obiettivo e per le offerte, che restano nella tua valuta.',
      'C\'è in tutti i piani. I conti, la pagina delle donazioni e il registro li gestisce solo chi ha il canale.',
    ] },

    { h3: 'I conti: Stripe, Satispay e Ko-fi' },
    { p: [
      'La prima carta, «Donazioni», collega i conti. Puoi averne uno, due o tutti e tre: con più di uno, chi dona sceglie con cosa pagare.',
      '<strong>Stripe</strong> (carte, Apple Pay, Google Pay). A SocialBot dai solo una chiave con permessi ridotti: apre il pagamento sul tuo conto e legge se è andato a buon fine. Niente altro.',
    ] },
    { passi: [
      { t: 'Crea la chiave', d: 'Nel Dashboard di Stripe: Sviluppatori → Chiavi API → «Crea chiave restricted».' },
      { t: 'Scegli l\'uso', d: 'Alla domanda «Come utilizzerai questa chiave?» scegli «Fornire questa chiave a una richiesta di registrazione di terze parti».' },
      { t: 'Dalle un nome', d: 'Nome SocialBot, URL <code>https://socialbot.live</code>, e spunta «Personalizza le autorizzazioni per questa chiave».' },
      { t: 'Dai i permessi', d: 'In scrittura solo «Checkout Sessions» e «Products», più «Refunds» se vuoi rimborsare dal pannello. Tutto il resto resta su «Nessuno».' },
      { t: 'Incollala', d: 'Premi «Crea chiave», copia la chiave, che comincia con <code>rk_live_</code>, incollala in «Chiave con restrizioni» e premi «Collega Stripe».' },
    ] },
    { p: ['Collegato, leggi «Conto collegato» con le ultime cifre della chiave, poi «Apri Stripe» e «Scollega». La chiave resta cifrata sul server e non torna mai nel browser. Quando apri la scheda la ricontrollo, al massimo una volta al minuto.'] },
    { ul: [
      'Se incolli la chiave segreta, quella che comincia con <code>sk_</code>, la rifiuto: può fare tutto e non va data a nessuno. Crea una chiave con restrizioni.',
      '«La chiave non ha la forma giusta»: comincia con <code>rk_live_</code> o <code>rk_test_</code> e va copiata intera.',
      '«Stripe non riconosce questa chiave»: l\'hai copiata a metà, o è stata cancellata.',
      '«La chiave non funziona più: forse l\'hai revocata.»: incollane una nuova, oppure premi «Scollega».',
    ] },
    { p: ['<strong>Satispay</strong>, per chi ha l\'app: in Italia è la via più comoda per le mance piccole. Funziona solo in euro: con un\'altra valuta il tasto di Satispay non compare nel modulo.'] },
    { passi: [
      { t: 'Apri il negozio online', d: 'Nel pannello Satispay Business: «Negozi online» → «Aggiungi negozio online», tipo «API».' },
      { t: 'Dagli un nome', d: 'Per esempio SocialBot, e premi «Crea negozio online».' },
      { t: 'Genera il codice', d: 'Premi «Genera codice di attivazione»: vale una volta sola. Incollalo in «Codice di attivazione» e premi «Collega Satispay».' },
    ] },
    { p: ['Collegato, leggi «Negozio online collegato», poi «Apri Satispay Business» e «Scollega».'] },
    { ul: [
      '«Il codice di attivazione ha un\'altra forma»: sono poche lettere e cifre, per esempio 6N3ECU.',
      '«Satispay non accetta questo codice»: è già stato usato o è scaduto. Generane uno nuovo.',
      '«La chiave è registrata ma Satispay non accetta ancora la firma»: riprova fra un minuto.',
      '«La firma non viene più accettata»: genera un codice nuovo e ricollega.',
    ] },
    { p: ['<strong>Ko-fi</strong>, per chi ha già una pagina lì. Chi dona paga su Ko-fi, e qui partono l\'avviso, il grazie e l\'obiettivo come per gli altri conti. SocialBot non tocca i soldi: da Ko-fi riceve solo l\'avviso di ogni donazione.'] },
    { passi: [
      { t: 'Scrivi la tua pagina', d: 'In «La tua pagina Ko-fi» scrivi il suo indirizzo, per esempio <code>ko-fi.com/tuonome</code>.' },
      { t: 'Incolla il tuo indirizzo su Ko-fi', d: 'Su Ko-fi apri «Settings» → «API», incolla in «Webhook URL» l\'indirizzo che ti mostra la carta, <code>socialbot.live/dona/kofi/tuonome</code>, e premi «Update».' },
      { t: 'Porta qui il token', d: 'Nella stessa pagina di Ko-fi apri «Advanced», copia il «Verification Token», incollalo nel campo «Verification Token» e premi «Collega Ko-fi».' },
    ] },
    { p: ['Collegato, leggi «Ko-fi collegato» con l\'indirizzo della tua pagina, poi «Apri Ko-fi» e «Scollega». Da quel momento ogni mancia su Ko-fi fa partire l\'avviso «Donazione» e il grazie in chat se è acceso, fa salire l\'obiettivo e finisce nel registro. Chi dona dalle tue pagine trova il tasto di Ko-fi fra i modi per donare.'] },
    { ul: [
      'I soldi restano su Ko-fi, con le sue regole e le sue commissioni. Contano le mance e gli abbonamenti, non gli acquisti del negozio. Un messaggio che chi dona tiene privato resta privato.',
      'Il token non lo conserviamo: ne teniamo l\'impronta, che basta a riconoscere gli avvisi di Ko-fi. Per cambiarlo incollane uno nuovo; col campo vuoto resta quello di prima.',
      'Con una cosa sola delle due leggi cosa manca: «Manca l\'indirizzo della tua pagina Ko-fi: senza, il tasto Ko-fi non compare fra i modi per donare.», oppure «Manca il token: le donazioni su Ko-fi arrivano a te, ma qui non parte niente.».',
      'Se da Ko-fi arrivano donazioni in un\'altra valuta, la carta te lo dice: l\'avviso e il grazie partono, l\'obiettivo e le offerte no. Usa la stessa valuta qui e su Ko-fi.',
      '«Collega Ko-fi» salva anche la carta «Il tasto e le offerte».',
    ] },
    { p: ['«Scollega» chiede conferma. Il conto resta tuo: qui le donazioni con quel servizio si fermano finché non lo ricolleghi. Per Ko-fi, sul suo sito puoi togliere anche l\'indirizzo del webhook.'] },

    { h3: 'Il tasto e le offerte' },
    { p: [
      '«Donazioni accese» accende tutto, ed è spento di base. Sotto scegli come si dona. «Dalla pagina, con i conti collegati qui sopra» usa Stripe, Satispay e Ko-fi. «Con un link esterno: PayPal, Streamlabs…» porta chi dona al tuo indirizzo.',
    ] },
    { tabella: [
      ['Comando', 'Cosa fa', 'Di base e limiti'],
      ['«Importi suggeriti»', 'Le cifre fra cui scegliere, separate da virgola. Doppioni e cifre fuori dal minimo e dal massimo spariscono.', '2, 5, 10, 20; fino a 6'],
      ['«Importo minimo»', 'La donazione più piccola.', '1; da 1 a 100'],
      ['«Importo massimo»', 'La donazione più grande.', '500; fino a 5.000, mai sotto il minimo'],
      ['«Chi dona può lasciare un messaggio»', 'Mostra il campo del messaggio nel modulo.', 'acceso'],
      ['«Dove si dona»', 'Solo col link esterno: l\'indirizzo della pagina dove si dona. Deve essere <code>https</code>.', '400 caratteri'],
      ['«Testo del tasto»', 'La scritta sul tasto.', 'vuoto = «Sostieni»; 40 caratteri'],
      ['«Valuta»', 'Euro, dollari o sterline.', 'euro'],
      ['«Una frase sotto il titolo»', 'Una riga sopra il tasto.', '160 caratteri'],
      ['«Ringrazia in chat a ogni donazione»', 'Il bot scrive in chat la frase del campo sotto. Segnaposto <code>{user}</code>, <code>{importo}</code> e <code>{messaggio}</code>.', 'spento; vuoto = «Grazie {user} per {importo}!»; 200 caratteri'],
    ] },
    { p: [
      '«Salva» salva tutta la carta, e leggi «Donazioni salvate ✓». «Prova l\'avviso» manda in overlay un avviso di donazione di prova.',
      'Col link esterno l\'avviso non parte da solo. Se quel servizio sa mandare un avviso, fallo arrivare con la chiave API del canale: <code>POST socialbot.live/api/ext/tuonome</code> con l\'intestazione <code>Authorization: Bearer LA-TUA-CHIAVE-API</code> e il corpo <code>{"azione":"donazione","importo":5,"user":"nome"}</code>. Puoi aggiungere <code>valuta</code> e <code>messaggio</code>. La chiave API sta nella scheda «Comandi», carta «Connettori avanzati»: è nel <a href="/manuale/moduli">manuale dei comandi</a>.',
      'L\'avviso si veste nella scheda «Overlay Studio» come gli altri, voce «Donazione», con il suo «Importo minimo». L\'obiettivo lo aggiungi fra gli obiettivi, con «Conta» su «euro donati». Tutto è nel <a href="/manuale/overlay">manuale dell\'overlay</a>.',
    ] },
    { p: [
      '<strong>Le offerte.</strong> Ogni offerta ha un importo «Da», un «Nome» e un «Effetto» della tua libreria di effetti. Chi dona vede le offerte al posto degli importi suggeriti, per esempio «5 € · Applauso». Quando la donazione arriva, dopo l\'avviso parte l\'effetto dell\'offerta più alta raggiunta. Conta l\'importo pagato, non il tasto premuto.',
      '«Aggiungi un\'offerta» ne mette una nuova, fino a otto: oltre leggi «Al massimo otto offerte.». L\'importo va da 1 a 5.000, con una sola offerta per importo, e il nome arriva a 30 caratteri. Un\'offerta fuori dal minimo e dal massimo non compare nel modulo. Senza offerte leggi «Nessuna offerta: chi dona vede gli importi suggeriti.». Le offerte valgono nel modulo, non col link esterno.',
    ] },
    { p: ['<strong>L\'immagine di chi dona.</strong> Con «Chi dona può allegare un\'immagine» acceso, chi dona abbastanza può allegare un\'immagine o una GIF, che va in onda in overlay come un effetto. Vale solo per i pagamenti con Stripe o Satispay dal modulo, non col link esterno e non su Ko-fi.'] },
    { ul: [
      '«Da questo importo in su»: 20 di base, da 1 a 5.000.',
      '«Secondi a schermo (le GIF durano quanto sono lunghe)»: 6 di base, da 2 a 15.',
      '«Va in onda da sola, senza aspettare il mio ok»: spento di base. Spento, l\'immagine ti aspetta nel registro, sotto «Da mandare in onda».',
    ] },
    { p: [
      'Chi dona può allegare PNG, JPG, WEBP o GIF fino a 8 MB. Il file viene ricompresso come gli effetti. Se il pagamento non arriva, il file si cancella da solo. In attesa possono stare al massimo 30 immagini: oltre, chi dona legge che per ora non si allegano, e può donare senza.',
      '<strong>Cosa vede chi dona.</strong> Sceglie un importo, o ne scrive un altro dal minimo in su. Scrive il nome se vuole (40 caratteri) e un messaggio (200 caratteri). Il primo tasto paga con carta, Apple Pay o Google Pay; se hai collegato anche Satispay trova «Oppure con Satispay», e con Ko-fi «Oppure su Ko-fi», che apre la tua pagina Ko-fi. Con Satispay da solo il primo tasto paga con Satispay; con Ko-fi da solo il tasto porta dritto a Ko-fi. Finito il pagamento torna sulla pagina e legge il grazie con l\'importo arrivato.',
    ] },

    { h3: 'La tua pagina delle donazioni' },
    { p: [
      'Una pagina tutta per le donazioni, all\'indirizzo <code>dona.socialbot.live/tuonome</code> (va anche <code>socialbot.live/dona/tuonome</code>). Si costruisce con lo stesso editor della pagina link, qui nella scheda: stessi pezzi, stesso «Aspetto», stessi «Salva e pubblica» e «Togli dal web». Finché non la pubblichi, l\'indirizzo dà una pagina che non c\'è.',
      'Funziona da sola: si dona anche quando la pagina link è spenta.',
    ] },
    { ul: [
      'La prima volta parte col titolo «Sostieni» seguito dal tuo nome e con un pezzo «Sostieni (donazioni)» già pronto.',
      'Non ha il contatore delle aperture.',
      'Qui il pezzo «Sostieni (donazioni)» mostra il modulo, e non ha la casella che porta alla pagina delle donazioni.',
      'Ha la sua immagine in «Quando condividi il link».',
      'In fondo porta un collegamento alla tua pagina link, quando quella è online.',
    ] },
    { p: [
      'Può avere <strong>lo stesso aspetto della pagina link</strong>. Nell\'editor, in «Aspetto», scegli «Uguale alla pagina link»: le sette linguette spariscono, e leggi «Stile, colori, sfondo, caratteri e bottoni sono quelli della tua pagina link: li cambi là, e cambiano anche qui.», con «Apri la pagina link». Titolo, foto e pezzi restano suoi.',
      'Una pagina delle donazioni nuova parte così. Con «Tutto suo» ha un aspetto suo, e «Parti da quello della pagina link» lo copia per cominciare da lì. Se la pagina link non l\'hai ancora, leggi che finché non c\'è questa pagina tiene il suo aspetto.',
      'Sulla pagina link, il pezzo «Sostieni (donazioni)» con «Porta alla mia pagina delle donazioni, invece del modulo qui» manda qui chi vuole donare.',
    ] },

    { h3: 'Il registro delle donazioni' },
    { p: [
      'In cima i totali: «Oggi», «Ultimi 30 giorni», «Ultimo anno» e «Da sempre», con quante donazioni in tutto. Valute diverse restano in somme separate.',
      '<strong>Da mandare in onda</strong>: le immagini allegate che aspettano il tuo ok, con anteprima, importo, nome e messaggio. Le vedi solo tu. «Manda in onda» le fa partire in overlay. «Scarta» chiede conferma e cancella l\'immagine dal server; la donazione resta.',
      'Sotto c\'è l\'elenco: importo, nome (o «qualcuno»), messaggio, data, da dove è arrivata (Stripe, Satispay, Ko-fi o chiave API) e «rimborsata» quando lo è. Ne vedi 50 alla volta, e «Mostra altre» carica le successive. «Cerca per nome o messaggio» filtra l\'elenco mentre scrivi. «Scarica il registro (CSV)» scarica tutto, da aprire in un foglio di calcolo.',
    ] },
    { tabella: [
      ['Tasto sulla riga', 'Cosa fa'],
      ['«Rimanda l\'avviso»', 'Rifà l\'avviso in overlay. Non conta di nuovo l\'obiettivo e non ringrazia di nuovo in chat.'],
      ['«Rimanda l\'immagine»', 'Rimanda in onda l\'immagine allegata, se è già andata in onda una volta.'],
      ['«Rimborsa»', 'Solo per le donazioni arrivate dal tuo conto Stripe o da Satispay, non ancora rimborsate. Chiede conferma nominando il servizio: i soldi tornano a chi li ha mandati, e non si può annullare. Per Stripe serve il permesso «Refunds» sulla chiave.'],
      ['«Elimina»', 'Chiede conferma e toglie la riga, con nome, messaggio e immagine. L\'obiettivo in euro non cambia.'],
    ] },
    { p: [
      'Il registro tiene un anno. Finché non arriva niente leggi «Ancora nessuna. Quando arriva la prima la vedi qui, con nome e messaggio.».',
      'Se Stripe rifiuta un rimborso perché alla chiave manca «Refunds», aggiungi il permesso nel Dashboard di Stripe (Sviluppatori → Chiavi API), o rimborsa da lì. Un rimborso Satispay che non passa si fa anche dal tuo pannello Business. Le donazioni da Ko-fi si rimborsano su Ko-fi.',
    ] },

    { h3: 'Se le donazioni non vanno' },
    { ul: [
      '<strong>Il tasto non compare sulla pagina.</strong> Servono «Donazioni accese» e un conto collegato, o «Dove si dona» se usi il link esterno. Nell\'anteprima dell\'editor il pezzo ti dice cosa manca.',
      '<strong>Chi dona legge «Le donazioni non sono aperte su questa pagina.».</strong> La pagina da cui dona è spenta, le donazioni sono spente, nessun conto è pronto, o sei passato al link esterno.',
      '<strong>Satispay non compare nel modulo.</strong> La valuta non è l\'euro.',
      '<strong>Il tasto Ko-fi non compare.</strong> Ko-fi è collegato a metà: la carta ti dice se manca la pagina o il token.',
      '<strong>Le donazioni da Ko-fi non fanno salire l\'obiettivo.</strong> Su Ko-fi hai un\'altra valuta: mettila uguale a quella della scheda.',
      '<strong>Chi dona legge «Controlla l\'importo».</strong> Ha scritto una cifra fuori dal minimo e dal massimo.',
      '<strong>Chi dona legge «Il pagamento non si apre in questo momento».</strong> Guarda lo stato del conto in cima alla scheda: se la chiave non va più, ricollegala.',
      '<strong>L\'avviso non parte.</strong> Nella scheda «Overlay Studio» l\'avviso «Donazione» deve essere acceso, con un importo minimo non più alto della donazione. «Prova l\'avviso» ti dice se l\'overlay risponde.',
      '<strong>L\'immagine non va in onda.</strong> Con «Va in onda da sola» spento, aspetta te in «Da mandare in onda».',
    ] },

    // ── LA TUA SETTIMANA ────────────────────────────────────────────────────
    { h2: 'La tua settimana', scheda: 'settimana', p: [
      'I giorni in cui vai in onda, scritti una volta sola. Da qui li prendono la grafica della settimana, «Stasera alle…», il Programma del tuo canale Twitch e il calendario del tuo server Discord. Da qui mandi anche l\'immagine della settimana dove vuoi.',
      'C\'è in tutti i piani e la usa chi ha il canale. I posti dove mandarla compaiono solo se li hai collegati: Telegram e Discord nel manuale <a href="/manuale/community">Le tue community</a>, Instagram nella scheda «I tuoi social», che chiede il piano Base.',
    ] },

    { h3: 'I tuoi giorni' },
    { p: [
      'Una riga per ogni giorno, da lunedì a domenica: l\'ora, cosa fai e «riposo». Con «riposo» spuntato l\'ora e il testo si spengono, e quel giorno non va da nessuna parte. Un giorno senza ora non conta come diretta.',
      'In «un gioco o un titolo» va bene tutti e due, fino a 40 caratteri. Mentre scrivi compaiono le categorie di Twitch da scegliere. Quando salvi cerco la categoria di ogni giorno: col gioco giusto «Stasera alle…» ha la sua copertina, e il Programma di Twitch la sua categoria. Un titolo che non è un gioco resta solo testo, senza copertina.',
      'Col Programma di Twitch acceso, sotto il giorno leggi cosa finirà lì: «su Twitch: cerco la categoria…», «su Twitch:» con la categoria trovata, oppure «su Twitch: nessuna categoria, solo il titolo».',
      '«Di solito una diretta dura»: da un\'ora a sei ore, di base due. Vale per il Programma e per il calendario di Discord. Gli orari sono quelli del tuo computer, e sotto leggi il fuso che uso.',
    ] },
    { p: ['<strong>I calendari.</strong> Questa parte compare solo se ne hai almeno uno.'] },
    { ul: [
      '«Scrivila nel Programma del mio canale Twitch»: ogni giorno diventa una diretta che si ripete, col gioco trovato su Twitch. Quelle che scrivi a mano sul Programma restano tue. Se lo spegni, tolgo dal Programma quelle che avevo scritto io. Serve un permesso in più: se manca, premi «Concedilo».',
      'Il calendario del tuo server Discord: col bot Discord nel tuo server trovi «Accendilo», o «Guardalo» se è già acceso. Ti porta alla parte «Avvisi» della scheda «Discord».',
    ] },
    { p: ['Premi «Salva la settimana». I calendari si aggiornano subito, e poi da soli ogni sei ore, anche al cambio dell\'ora. Leggi «Settimana salvata.» con l\'esito.'] },
    { ul: [
      '«Programma di Twitch aggiornato.» o «Il Programma di Twitch era già a posto.».',
      'Un orario già occupato da una diretta scritta a mano te lo segnalo, e lo lascio stare.',
      '«Per il Programma di Twitch manca il permesso.»: premi «Concedilo».',
      '«Calendario di Discord a posto.», o l\'errore che ha dato Discord.',
    ] },
    { p: ['Salvare la settimana ripara anche le grafiche delle uscite automatiche, ma non conferma l\'uscita della settimana: quella si conferma a parte.'] },

    { h3: 'Mandala' },
    { p: [
      'L\'immagine è la grafica della settimana delle «Grafiche social», con i tuoi giorni dentro. «Cambiane l’aspetto» ti porta lì. Parte solo quando premi «Manda», nei posti che spunti: a Telegram e Discord va il post, 1080×1350, a Instagram la versione verticale.',
    ] },
    { ul: [
      '<strong>Telegram</strong>: i gruppi e i canali collegati, con l\'argomento quando c\'è.',
      '<strong>Discord</strong>: i canali degli avvisi. Un canale che non può ricevere l\'immagine è spento e dice perché: «Il bot non è più nel server.», «Questo canale non c’è più.», «Il bot qui non può scrivere.» o «Al bot manca «Allegare file».», con «Aggiorna i suoi permessi».',
      '<strong>Instagram</strong>: «Storia», in verticale, resta 24 ore, senza testo. Serve un account professionale col permesso di pubblicare. Se manca, leggi «La storia di Instagram non può partire» con «Vai a Instagram».',
    ] },
    { p: [
      'Senza posti collegati leggi «Qui compaiono i posti dove mandarla appena colleghi Telegram, Discord o Instagram.», e «Manda» resta spento.',
      '«Le parole che la accompagnano» sono già scritte per te. Se le cambi, restano le tue finché hai la scheda aperta; non si salvano. Su Telegram, un testo più lungo della didascalia di una foto (1024 caratteri) parte subito dopo la foto.',
      'Dopo «Manda» leggi, posto per posto, «arrivata» o «non è partita:» col motivo. Senza spunte leggi «Spunta almeno un posto.». Un secondo clic mentre sta partendo non la manda due volte. I posti che spunti si salvano con «Salva la settimana» e quando premi «Manda»: restano ricordati per la volta dopo, e sono gli stessi dove esce la settimana automatica.',
      'Sotto «Manda» c\'è la riga delle uscite automatiche. Spenta, leggi che la settimana può anche uscire da sola, con «Apri «In automatico»». Accesa, leggi quando esce e se l\'hai confermata, con «Va bene così» per confermarla, «Non pubblicare» per fermarla e «Pubblicala lo stesso» per ripensarci. Come funziona è nella sezione «In automatico» delle Grafiche social, qui sotto.',
      'Le storie di Twitch e di YouTube non ci sono: Twitch non le apre a nessuna app, e YouTube le ha chiuse nel 2023.',
    ] },

    // ── GRAFICHE SOCIAL ─────────────────────────────────────────────────────
    { h2: 'Grafiche social', scheda: 'grafiche', p: [
      'Tre grafiche pronte da pubblicare: la <strong>programmazione settimanale</strong>, il <strong>«Live ora»</strong> e <strong>«Stasera alle…»</strong>, che annuncia la prossima diretta della tua settimana con la copertina del gioco. Parti da uno stile pronto o da un tema, cambi quello che vuoi, sposti i pezzi sull\'anteprima, e la scarichi, la condividi o la metti nella storia di Instagram. Alcune possono anche uscire da sole.',
      'C\'è in tutti i piani. La storia di Instagram chiede Instagram collegato nella scheda «I tuoi social», che è del piano Base. La storia e le uscite automatiche le gestisce chi ha il canale.',
    ] },

    { h3: 'La storia di Instagram' },
    { p: ['Il riquadro in cima alla carta cambia con lo stato di Instagram.'] },
    { ul: [
      'Instagram non collegato: «Collega Instagram» ti porta a «I tuoi social».',
      'Collegato ma senza il permesso di pubblicare: «La storia di Instagram non può partire», con «Vai a Instagram».',
      'Collegato: «Metti nella storia» manda la grafica che vedi, in formato storia, e resta 24 ore. Leggi «Fatto: è nella tua storia.» o «Non è partita:» col motivo.',
    ] },

    { h3: 'In automatico' },
    { p: [
      'Tre uscite che partono da sole, ognuna col suo interruttore. Le grafiche sono quelle che hai fatto qui, e si preparano quando accendi un\'uscita, ogni volta che salvi le Grafiche o la Settimana, e quando apri le Grafiche se sono rimaste indietro. Ogni cambio si salva subito: leggi «Pubblicazioni automatiche salvate ✓», e per «Live ora» «Storia automatica accesa ✓».',
    ] },
    { tabella: [
      ['Uscita', 'Cosa esce e quando', 'Di base'],
      ['«Prima della diretta»', 'La storia «Stasera alle…» di ogni giorno in onda della tua settimana, con «Esce … prima dell’inizio»: 15 o 30 minuti, un\'ora, 2, 3, 4, 6, 8 o 12 ore. Il testo è quello del momento in cui esce: «Stasera alle 21:00», «Oggi alle 15:00» per una diretta prima delle 17, o «Domani alle 00:30» se l\'anticipo scavalca la mezzanotte. Se sei già in diretta non esce: tocca a «Live ora». Serve Instagram collegato.', 'spenta; 2 ore'],
      ['«Quando vai in diretta»', '«Quando vai in diretta su Twitch, la storia «Live ora» parte da sola»: la tua grafica «Live ora» in verticale, com\'era quando hai acceso la casella o premuto «Salva impostazioni». Al massimo una per diretta. Il gioco scritto resta quello: se cambi gioco ogni volta, lascia vuoto «Gioco / categoria». Serve Instagram collegato.', 'spenta'],
      ['«La settimana»', 'La grafica della Settimana nei posti spuntati in «Mandala», nel giorno e all\'ora che scegli in «Ogni … alle …», entro un\'ora da quell\'ora. Esce con le parole di base, quelle che trovi in «Mandala» prima di cambiarle.', 'spenta; domenica alle 18:00'],
    ] },
    { p: [
      '<strong>La conferma della settimana.</strong> Con «Chiedimi prima se va bene, il giorno prima» acceso (lo è di base), 24 ore prima arriva una mail alla mail dei rapporti, se l\'hai confermata nella scheda «Dirette», e un messaggio nella chat privata del tuo bot Telegram, se l\'hai collegata. La mail mostra la settimana com\'è, con «Va bene così» e «Non pubblicare»; il messaggio su Telegram ha «Conferma», «Cambiala» e «Non pubblicare». I link aprono una pagina dove premi il tasto: aprirli soltanto non decide niente. Senza conferma non esce.',
      'La confermi anche da qui e da «La tua settimana», con «Va bene così». Salvare la settimana non la conferma. Se dopo aver confermato vedi un errore, «Non pubblicare» la ferma fino al momento dell\'uscita, dalla mail, da Telegram o dal pannello; «Pubblicala lo stesso» la rimette in uscita.',
      'Senza una mail confermata e senza Telegram leggi «Non ho una mail confermata né Telegram per chiedertelo: la richiesta la trovi qui e nella Settimana.». Con la conferma spenta la settimana esce da sola, e «Non pubblicare» resta per fermarla.',
    ] },
    { p: ['Sotto ogni uscita leggi quando esce la prossima e com\'è andata l\'ultima. Se qualcosa non va, leggi cosa.'] },
    { ul: [
      'La grafica non era pronta, oppure la settimana, le grafiche o l\'anticipo erano cambiati dopo che l\'immagine era stata preparata: un\'immagine vecchia non esce. Aprire le Grafiche basta a ripreparare tutto.',
      'Eri già in diretta: è uscita «Live ora», se l\'hai accesa.',
      'Non l\'avevi confermata, o l\'avevi fermata tu.',
      'Nella Settimana non c\'era nessun posto dove mandarla: leggi «Nella Settimana non hai scelto dove mandarla: spunta i posti in «Mandala».», con «Apri la Settimana».',
      'Nella tua Settimana non c\'è nessun giorno in onda: la storia prima della diretta non ha niente da annunciare.',
    ] },
    { p: ['Quando un\'uscita non riesce, te lo scrivo anche nella chat privata del tuo bot Telegram, se l\'hai collegata. Per la storia «Live ora», se leggi «La storia automatica è accesa, ma la grafica non è pronta», spegnila e riaccendila: la grafica si prepara di nuovo.'] },

    { h3: 'Tipo e formato' },
    { ul: [
      '«Programmazione»: i sette giorni con orari e attività, presi dalla tua settimana. «Cambiali» ti porta lì. Come post è 1080×1350.',
      '«Live ora»: il titolo, il gioco e un sottotitolo per dire che sei in onda. Come post è 1080×1080.',
      '«Stasera alle…»: la prossima diretta della tua settimana, con l\'ora, il tuo indirizzo e la copertina del gioco. Come post è 1080×1350.',
      '«Post» e «Storia»: la storia è la stessa grafica in verticale, 1080×1920, con le scritte lontane dalle barre di Instagram.',
    ] },

    { h3: 'Stili, temi e scena' },
    { p: [
      '«Stili pronti»: 13 combinazioni già fatte, ognuna con la sua miniatura disegnata coi tuoi testi. Scelta una, leggi che adesso la puoi cambiare come vuoi.',
      '«Tema»: 21 temi, sette fermi e quattordici animati (quelli col segno del movimento), fra cui Synthwave, Vaporwave, Pioggia al neon, Notte di stelle, Sakura e Lo-fi. Cambiando tema, «Accento» e «Seconda tinta» tornano quelli del tema.',
      '«La scena» compare coi temi animati quando lo sfondo è «Dal tema». Hai le opzioni della scena (cosa si vede), «Velocità» Lenta, Normale o Veloce, e «Quanto si vede la scena» dal 30 al 100%.',
    ] },

    { h3: 'Sfondo, testi e colori' },
    { tabella: [
      ['Comando', 'Cosa fa', 'Di base e limiti'],
      ['«Sfondo»', '«Dal tema», «Tinta unita» col suo «Colore», o «Immagine».', 'Dal tema'],
      ['«Carica dal PC»', 'Salva l\'immagine nella tua libreria sfondi, da riusare. Se la libreria non la prende, la uso lo stesso per questa grafica e te lo dico.', ''],
      ['«La tua libreria sfondi», «Dai tuoi media»', 'Scegli un\'immagine già caricata. Nella libreria la × la elimina. «togli immagine» la toglie dalla grafica.', ''],
      ['«Velo sull’immagine»', 'Scurisce o schiarisce l\'immagine, per far leggere le scritte.', '45%; da 0 a 85%'],
      ['«Titolo»', 'La riga grande. Programmazione e Live ora hanno ognuna il suo. «Stasera alle…» non ce l\'ha.', '30 caratteri'],
      ['«Accento», «Seconda tinta»', 'I due colori della grafica.', 'quelli del tema'],
      ['«Carattere del titolo»', 'Moderno, Elegante, Pennarello, Pulito.', 'Moderno'],
      ['«Stile del titolo»', 'Sfumato, Pieno, Neon.', 'Sfumato'],
      ['«Le righe dei giorni»', 'Schede, Pillole, Linee. Solo nella programmazione.', 'Schede'],
      ['«Colore del testo»', 'Il colore delle scritte. «Auto (contrasto)» lo fa scegliere allo sfondo.', 'automatico'],
      ['«Handle / nome»', 'In alto a destra.', 'il tuo @canale; 30 caratteri'],
      ['«Logo (testo)», «…oppure logo immagine»', 'In alto a sinistra: fino a 4 caratteri, o un\'immagine tua, ridotta a 256 px.', 'la tua iniziale'],
      ['«Gioco / categoria», «Sottotitolo»', 'Solo nel Live ora.', '34 e 48 caratteri'],
    ] },
    { p: ['Le scritte si leggono sempre, anche sopra le scene che si muovono: dove sotto passa qualcosa di chiaro compare un contorno, e dove non serve il colore resta il tuo.'] },

    { h3: '«Stasera alle…»: quando e il gioco' },
    { p: [
      'Il giorno, l\'ora e il gioco arrivano dalla tua settimana: sotto «Quando» leggi «Dalla tua Settimana:» con quello che ho trovato. Lascia vuoto «Quando» e il testo si aggiorna da solo; se scrivi tu (fino a 40 caratteri), resta il tuo. Se nella settimana non c\'è una diretta in programma, leggi di scrivere tu quando.',
      '«L’immagine del gioco» è la copertina della categoria di Twitch trovata per quel giorno, e ha tre modi.',
    ] },
    { ul: [
      '«A tutto schermo»: la copertina fa da sfondo, con «Velo sull’immagine» (da 0 a 85%) e «Sfocatura» (da 0 a 30), tutti e due a 0 di base.',
      '«In un riquadro»: la copertina sta in un riquadro che trascini sull\'anteprima come gli altri pezzi, e ingrandisci con «Grandezza», dal 40 al 160% (100).',
      '«Niente, si vede il tema»: resta lo sfondo della grafica, e il nome del gioco va in una pillola. Lo stesso succede quando per quel giorno non c\'è una categoria.',
    ] },
    { p: ['Nella storia l\'indirizzo non si tocca da solo: per renderlo toccabile, in Instagram mettici sopra l\'adesivo «Link».'] },

    { h3: 'Link, QR e didascalia' },
    { p: [
      '«Condivisione & link al canale»: scegli se la grafica porta a <code>socialbot.live/u/…</code>, la tua pagina link, o a <code>twitch.tv/…</code>.',
      '«Stampa un QR + il link del canale sull\'immagine» mette in basso un QR con l\'indirizzo scritto accanto. Su Instagram l\'immagine del feed non è cliccabile: col QR chi la vede arriva lo stesso al canale. Le righe dei giorni gli fanno posto.',
      'Il QR prende lo stile che hai salvato in «QR su misura», nel gruppo «Strumenti»: forme, colori e logo, senza la frase della cornice. Se con quello stile non si rileggerebbe, esce il QR di base. Come si prepara lo stile è nel <a href="/manuale/strumenti">manuale degli strumenti</a>.',
      '«Didascalia pronta (modificabile)» è il testo da mettere sotto il post, già scritto col link e diverso per ogni tipo. Se lo cambi, resta il tuo finché hai la scheda aperta; non si salva. «Copia didascalia» lo copia.',
    ] },

    { h3: 'Scaricare, condividere, salvare' },
    { tabella: [
      ['Tasto', 'Cosa esce'],
      ['«Condividi»', 'Sul telefono apre la condivisione del sistema, con l\'immagine e la didascalia. Dove non c\'è, scarica l\'immagine e copia la didascalia.'],
      ['«Scarica PNG»', 'L\'immagine a doppia risoluzione, 2160 px di larghezza: più nitida, e Instagram la rimpicciolisce invece di sgranarla.'],
      ['«Scarica GIF animata»', 'Un giro intero dell\'animazione, 4 secondi (8 con velocità lenta), fino a 600 px di lato. Ricomincia senza scatti. Con un tema fermo è un\'immagine sola.'],
      ['«Scarica video»', 'Un video WebM dello stesso giro, più pesante e di qualità più alta.'],
      ['«Salva impostazioni»', 'Ricorda tutto per la prossima volta, anche i pezzi spostati. Leggi «Grafica salvata ✓». Con «Live ora» automatica accesa aggiorna la grafica che parte in diretta, e ripara le grafiche delle altre uscite automatiche.'],
    ] },
    { p: [
      'Le modifiche non si salvano da sole: senza «Salva impostazioni», alla prossima apertura ritrovi quelle di prima.',
      'Se leggi «Export GIF non disponibile su questo browser.» o «Il tuo browser non supporta l\'export video.», usa un browser aggiornato sul computer.',
    ] },

    { h3: 'L\'anteprima e i pezzi da spostare' },
    { p: [
      'L\'anteprima è quella vera: quello che vedi è quello che esce. Resta tutta visibile mentre scorri i comandi, sotto la barra in cima.',
      'Ogni pezzo della grafica si sposta: il logo, il nome, il titolo, le righe dei giorni, la copertina, la pillola, il QR e gli altri. Lo trascini col mouse o col dito. Con le frecce lo sposti di poco, e tenendo premuto Maiusc di più.',
    ] },
    { ul: [
      'Mentre trascini, le guide mostrano i margini e i centri, e il pezzo ci si aggancia quando ci passa vicino.',
      'Dove il pezzo non può andare la tela si vela di rosso. Nella storia leggi «Qui Instagram copre la storia», sulle fasce in alto e in basso.',
      'Se un pezzo ne copre un altro, tutti e due si contornano d\'ambra e leggi «Copre un altro pezzo».',
      '«Sposta insieme post e storia» è acceso di base: lo stesso spostamento va a tutti e due i formati. Il pezzo si ferma dove uscirebbe dall\'altro formato, e leggi «Qui uscirebbe dal post» o «Qui nella storia finirebbe sotto Instagram».',
      '«Rimetti a posto» compare quando hai spostato qualcosa, e rimette i pezzi al loro posto; con «Sposta insieme post e storia» acceso, in tutti e due i formati.',
      'Ogni tipo di grafica ha i suoi spostamenti. Per tenerli premi «Salva impostazioni».',
    ] },

    // ── I TUOI SOCIAL ───────────────────────────────────────────────────────
    { h2: 'I tuoi social', scheda: 'notifiche', p: [
      'Avvisare chi ti segue quando pubblichi sulle altre reti: il post nuovo su Instagram, il video e la diretta su TikTok, il video su YouTube, e gli altri siti che hanno un feed. Qui colleghi anche Instagram per le storie delle Grafiche.',
      '<strong>Serve il piano Base.</strong> Senza, la scheda mostra «Non nel tuo piano», con «Guarda la demo» e il tasto per sbloccarla. I piani sono nel <a href="/manuale/account">manuale dell\'abbonamento</a>.',
      'Gli avvisi partono nei gruppi e nei canali Telegram dove hai acceso quell\'avviso e nei canali Discord che lo ricevono. Se spunti «Annuncia anche nella chat Twitch», nella tua chat esce anche una riga col link. Dove va cosa su Telegram e Discord lo trovi nel manuale <a href="/manuale/community">Le tue community</a>. Il messaggio che scrivi qui è quello di Telegram; su Discord ogni canale ha il suo testo.',
      'Gli account li collega solo chi ha il canale: un moderatore legge «Instagram lo collega chi ha il canale.» e, per TikTok, «Lo collega chi ha il canale.».',
    ] },

    { h3: 'I tuoi account' },
    { p: ['<strong>Instagram.</strong> «Collega Instagram» ti manda su Instagram per due permessi: leggere i tuoi post e pubblicare le storie. Serve un account professionale, azienda o creator. Il collegamento si rinnova da solo prima di scadere, e se togli l\'app dal tuo Instagram lo cancello subito.'] },
    { tabella: [
      ['Cosa leggi', 'Cosa vuol dire', 'Cosa fai'],
      ['«Instagram collegato» col tuo @nome', 'Tutto a posto.', '«Prova» legge il tuo ultimo post. «Scollega» lo stacca.'],
      ['«Manca un permesso su Instagram» o «Mancano due permessi su Instagram»', 'Senza pubblicare non partono le storie; senza leggere non partono gli avvisi dei post.', '«Ricollega Instagram» e lascia acceso tutto quello che chiede.'],
      ['«Instagram non riconosce più il collegamento», con «Instagram da ricollegare» in rosso', 'Hai tolto l\'app da Instagram o cambiato la password. Avvisi e storie sono fermi.', '«Ricollega Instagram».'],
      ['«Instagram dice che manca un permesso»', 'Instagram ha rifiutato una richiesta.', '«Ricollega Instagram» e lascia acceso tutto.'],
      ['«L’ultima volta Instagram ha risposto con un errore»', 'Un errore passeggero, col testo di Instagram.', '«Riprova adesso». Se torna, ricollegalo.'],
      ['«Il collegamento con Instagram è scaduto»', 'Avvisi e storie sono fermi.', '«Ricollega Instagram».'],
    ] },
    { p: [
      'Tornando da Instagram leggi l\'esito. Se leggi «Su Instagram non hai dato il permesso: non ho collegato niente.», riprova e accetta. Se leggi che il collegamento va fatto da qui, hai aperto un collegamento preso altrove: usa il tasto della scheda. Se è rimasto a metà troppo a lungo, riprova.',
      'Se il tasto «Collega Instagram» non c\'è, Instagram si collega col token, dalla carta «Nuovo post su Instagram».',
      '<strong>TikTok.</strong> «Collega TikTok» ti manda su TikTok per un permesso solo: leggere i tuoi video. Collegato, leggi «TikTok collegato» col tuo @nome, con «Prova» e «Scollega». «Prova» risponde «Funziona: leggo il tuo ultimo video.», o che non trova ancora video sul tuo profilo. Se leggi «Il collegamento con TikTok non è ancora attivo su SocialBot.», per ora il tasto non c\'è.',
      '<strong>YouTube.</strong> In «Il tuo canale YouTube» scrivi l\'@handle, l\'indirizzo del canale o l\'ID che comincia con UC: lo risolvo io. «La tua chiave API di YouTube (facoltativa)» è una chiave YouTube Data API v3 tua: senza, uso il feed pubblico, che va benissimo; con la chiave la rilevazione è ancora più affidabile. «Rimuovi la chiave» la toglie. «Salva il canale» salva canale e chiave.',
      'In fondo alla carta, «Vai agli avvisi di Discord» ti porta dove scegli gli annunci del tuo server.',
    ] },

    { h3: 'Nuovo post su Instagram' },
    { ul: [
      '«Messaggio dell\'avviso»: segnaposto <code>{nome}</code>, <code>{titolo}</code> (la didascalia del post) e <code>{link}</code>. Vuoto, usa quello di base. Fino a 800 caratteri.',
      '«Avvisami quando pubblico un nuovo post»: serve Instagram collegato.',
      '«Annuncia anche nella chat Twitch».',
      '«Salva».',
    ] },
    { p: [
      'Controllo ogni dieci minuti circa. Il primo giro dopo che lo accendi memorizza l\'ultimo post e non avvisa: l\'avviso parte dal post dopo.',
      '«Uso un token mio (avanzato)» è per chi ha un\'app sua su Meta for Developers, con un account professionale collegato a una Pagina Facebook. Metti «ID account Instagram» e «Token di accesso (Graph API)», poi premi «Prova le credenziali». «Rimuovi il token» lo toglie. Quando colleghi Instagram col tasto questa parte sparisce, e il collegamento si rinnova da solo.',
    ] },

    { h3: 'Nuovo video su TikTok' },
    { ul: [
      '«Messaggio dell\'avviso»: segnaposto <code>{nome}</code>, <code>{titolo}</code> e <code>{link}</code>. Vuoto, usa quello di base. Fino a 800 caratteri.',
      '«Avvisami quando pubblico un nuovo video»: serve TikTok collegato in cima alla scheda.',
      '«Annuncia anche nella chat Twitch».',
      '«Salva».',
    ] },
    { p: ['Controllo ogni dieci minuti circa. Il primo giro dopo il collegamento memorizza l\'ultimo video e non avvisa.'] },

    { h3: 'Diretta su TikTok' },
    { p: ['Per avvisare quando vai in diretta su TikTok. Qui non serve il collegamento: basta il nome utente.'] },
    { ul: [
      '«Il tuo username TikTok»: senza @, fino a 40 caratteri.',
      '«Messaggio dell\'avviso TikTok»: segnaposto <code>{nome}</code>, <code>{link}</code> e <code>{username}</code>. Vuoto, usa quello di base. Fino a 800 caratteri.',
      '«Rileva in automatico quando vado live su TikTok»: si accende solo con lo username. TikTok non ha un\'API ufficiale per le dirette, e l\'avviso può arrivare in ritardo.',
      '«Annuncia anche nella chat Twitch».',
      '«Salva» e «Manda una prova», che manda un avviso di prova nel gruppo Telegram. Servono lo username salvato e il gruppo Telegram collegato.',
    ] },
    { p: [
      'Se nella scheda Telegram hai acceso l\'avviso fissato, l\'avviso di TikTok resta fissato finché sei in diretta e sparisce quando stacchi.',
      '<strong>La via affidabile.</strong> Un\'automazione tua (IFTTT, Zapier, Comandi rapidi) sull\'evento «vado live su TikTok» chiama <code>POST socialbot.live/api/ext/tuonome</code> con l\'intestazione <code>Authorization: Bearer LA-TUA-CHIAVE-API</code> e il corpo <code>{"azione":"tiktok-live"}</code>. La chiave API sta in «Chat e pubblico» → «Comandi».',
    ] },

    { h3: 'Nuovo video su YouTube' },
    { ul: [
      '«Messaggio dell\'avviso»: segnaposto <code>{nome}</code>, <code>{titolo}</code> e <code>{link}</code>. Vuoto, usa quello di base. Fino a 800 caratteri.',
      '«Avvisami quando esce un nuovo video»: serve il canale scritto in cima alla scheda.',
      '«Annuncia anche nella chat Twitch».',
      '«Salva».',
    ] },
    { p: ['Controllo ogni dieci minuti circa. Il primo giro memorizza l\'ultimo video e non avvisa.'] },

    { h3: 'Altri siti' },
    { p: ['Per un sito senza un tasto per collegarlo: un blog, un podcast, un notiziario. Incolli l\'indirizzo del suo feed (RSS, Atom o JSON; spesso finisce con <code>/feed</code> o <code>/rss</code>), scegli che avviso fa partire e premi «Aggiungi».'] },
    { ul: [
      'Il menù sceglie l\'avviso: «Nuovo video su YouTube», «Nuovo post su Instagram» o «Nuovo post su TikTok». Arriva dove hai acceso quell\'avviso.',
      'Il feed lo leggo subito: se non risponde non lo aggiungo, e ti dico perché. Se va, leggi quante voci ho letto e che avviserò dalla prossima.',
      'Fino a 10 sorgenti.',
      'Per ogni sorgente vedi l\'ultimo titolo e quando l\'ho controllata, con «Prova», l\'interruttore per spegnerla e la × per toglierla, che chiede conferma.',
      '«Prova» ti dice cosa vedo e dove finirebbe. Se leggi che non arriverebbe da nessuna parte, spunta una destinazione per quell\'avviso nella scheda Telegram.',
    ] },
    { p: ['Guardo ogni feed ogni dieci minuti. Se uno smette di rispondere, lo leggi scritto sulla sua riga.'] },

    { h3: 'Se gli avvisi non partono' },
    { ul: [
      '<strong>La carta è a posto ma non arriva niente.</strong> Collegato e acceso sono due cose diverse: controlla la casella «Avvisami…» della carta. Poi controlla che su Telegram o Discord quell\'avviso abbia una destinazione.',
      '<strong>Il primo post non è stato annunciato.</strong> Il primo giro memorizza e basta: l\'avviso parte dal prossimo.',
      '<strong>La diretta su TikTok arriva tardi.</strong> Il rilevamento automatico è a tentativi: usa la via affidabile con l\'automazione.',
      '<strong>La scheda ha il lucchetto.</strong> Serve il piano Base.',
    ] },
  ],
  faq: [
    { d: 'La pagina link è come Linktree?', r: 'Fa la stessa cosa, e la pagina arriva già pronta dal server: si apre subito anche con poca rete e funziona senza JavaScript. In più ha il player della tua diretta, le donazioni sul tuo conto e il contatore delle aperture, senza cookie.' },
    { d: 'Posso usare un mio dominio?', r: 'No. L\'indirizzo è <code>socialbot.live/u/tuonome</code> e non cambia mai: chi ce l\'ha vede sempre la versione aggiornata.' },
    { d: 'Perché le icone della pagina non sono emoji?', r: 'Le emoji cambiano forma su ogni sistema e non si possono colorare. Le icone sono 28 disegni che prendono i colori del tema. Per un link puoi anche mettere una miniatura al posto dell\'icona.' },
    { d: 'La mia foto di sfondo è tagliata sul telefono. Come la sistemo?', r: 'In «Aspetto», linguetta «Colori», premi «Spostala sull\'anteprima» e trascinala finché si vede la parte giusta; con la rotella o con due dita la rimpicciolisci. Attorno continuano i colori dei suoi bordi.' },
    { d: 'SocialBot trattiene qualcosa sulle donazioni?', r: 'No. I soldi vanno sul tuo conto Stripe, Satispay o Ko-fi, e paghi solo le commissioni del servizio. La chiave di Stripe che ci dai ha permessi ridotti, e la revochi quando vuoi dal tuo pannello.' },
    { d: 'Posso ricevere donazioni senza la pagina link?', r: 'Sì. La pagina delle donazioni funziona da sola, anche con la pagina link spenta.' },
    { d: 'Ho già Ko-fi: devo cambiarlo?', r: 'No. Lo colleghi nella prima carta delle Donazioni con l\'indirizzo della tua pagina e il token: chi dona trova il tasto Ko-fi, e ogni mancia fa partire l\'avviso e sale l\'obiettivo.' },
    { d: 'Chi dona può mandare un\'immagine qualsiasi in diretta?', r: 'No. Solo da un importo che scegli tu, e di base l\'immagine aspetta il tuo ok in «Da mandare in onda». «Scarta» la cancella dal server.' },
    { d: 'Le grafiche escono da sole?', r: 'Solo quelle che accendi in «In automatico», nelle Grafiche social: la storia prima di ogni diretta, la storia «Live ora» quando vai in diretta, e la settimana il giorno che scegli, dopo che l\'hai confermata. Il resto lo scarichi o lo mandi tu.' },
    { d: 'Ho confermato la settimana ma c\'è un errore. Come la fermo?', r: 'Premi «Non pubblicare» nella mail, nel messaggio su Telegram, nelle Grafiche social o nella tua settimana. Vale fino al momento dell\'uscita. Se ci ripensi, «Pubblicala lo stesso».' },
    { d: 'Perché non posso mandare la settimana nelle storie di Twitch o YouTube?', r: 'Twitch non apre le storie a nessuna app, e YouTube le ha chiuse nel 2023.' },
    { d: 'Ho acceso l\'avviso ma il primo video non è stato annunciato.', r: 'Il primo giro dopo che lo accendi memorizza l\'ultimo video e non avvisa, per non annunciare una cosa vecchia. L\'avviso parte dal video dopo.' },
    { d: 'Perché la scheda I tuoi social ha il lucchetto?', r: 'Gli avvisi sui social sono del piano Base. Le altre schede di questa pagina sono in tutti i piani.' },
  ],
};
