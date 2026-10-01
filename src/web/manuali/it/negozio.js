// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Manuale: Manuale del negozio. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.
import { MAX_ARTICOLI, MAX_PREZZO, MAX_ATTESA_S } from '../../../features/negozio.js';
import { MAX_DIRETTE_VIP } from '../../../features/negozio-tipi.js';
import { LIMITI } from '../../../features/negozio-requisiti.js';

const cifra = (n) => new Intl.NumberFormat('it-IT').format(n);

export default {
  slug: 'negozio',
  schede: ['negozio'],
  titolo: 'Manuale del negozio | SocialBot',
  h1: 'Manuale del negozio',
  desc: 'Il negozio del canale: cosa si compra con le monete, i requisiti, le scorte, la coda da consegnare, lo storico, la pagina del negozio e i comandi in chat.',
  aggiornata: '2026-10-01',
  corpo: [
    { p: [
      'Il negozio è un posto in cui si paga solo con le <strong>monete del canale</strong>, cioè con il tempo passato in chat e in diretta. Le monete non si comprano e non diventano soldi. Tu decidi cosa c\'è, quanto costa e chi lo può comprare; chi guarda compra dalla chat.',
      'La scheda sta in «Chat e pubblico», voce «Negozio». Le monete, le regole per guadagnarle e la classifica restano nella scheda «Giochi & classifiche» (vedi il <a href="/manuale/giochi">manuale dei giochi</a>): il negozio le spende soltanto.',
    ] },

    { h2: 'Negozio', scheda: 'negozio', p: [
      'Il negozio è nel piano Essenziale, quello gratuito. La scheda la usano il proprietario del canale e i moderatori del pannello.',
      'In alto scegli fra quattro parti: «Articoli», «Da consegnare», «Storico» e «La pagina del negozio».',
    ] },

    { h3: 'Il negozio del canale' },
    { p: [
      '«Negozio aperto» è spento di base. Da spento, in chat i comandi del negozio non rispondono; gli articoli, le borse e lo storico restano salvati.',
      'Da acceso, sotto la spunta il pannello ti ricorda i comandi con i nomi che hanno nel tuo canale: se li rinomini, scrive quelli nuovi.',
      'La spunta si salva da sola quando la tocchi, e il pannello scrive «Negozio aperto.» o «Negozio chiuso.».',
      'Sotto c\'è l\'indirizzo della pagina del negozio, con «Copia» e «Apri»: è quello da mettere nella bio o nei pannelli di Twitch.',
    ] },

    { h3: 'Articoli' },
    { p: [
      `L'elenco mostra ogni articolo con il comando per comprarlo, il prezzo, cosa fa, le scorte, quante volte è stato comprato e i requisiti. Puoi averne fino a ${MAX_ARTICOLI}.`,
      'Le etichette accanto al nome dicono «non in vendita», «si vede a chi può», «solo in diretta», le due date, oppure «finito» quando le scorte in tutto sono a zero. Un oggetto della borsa dice anche in quante borse sta.',
      '«Nuovo articolo» apre l\'editor vuoto. I modelli lo aprono già compilato, e lo sistemi prima di salvare: «Un effetto», «Un VIP per una diretta», «Scegli il prossimo gioco» e «Un oggetto della borsa».',
      '«Modifica» apre l\'articolo nell\'editor. «Togli» chiede conferma e lo toglie dal negozio; lo storico resta com\'è, con il nome di allora. Un oggetto della borsa sparisce anche dalle borse di chi l\'aveva comprato, e la conferma dice da quante.',
    ] },

    { h3: 'L\'editor di un articolo' },
    { p: ['A destra c\'è «Come si vede nella pagina del negozio»: l\'anteprima cambia mentre scrivi. Premi «Salva l’articolo»; «Annulla» chiude senza salvare.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Nome»', 'vuoto', 'fino a 60 caratteri, obbligatorio', 'Come si chiama nel negozio e nelle frasi del bot.'],
      ['«La parola per comprarlo»', 'la prima parola del nome con almeno tre lettere, senza accenti', 'da 1 a 20 lettere senza accenti e cifre', 'Si compra con <code>!compra</code> e questa parola. Due articoli non possono avere la stessa.'],
      ['«Descrizione»', 'vuota', 'fino a 300 caratteri', 'Cosa riceve chi lo compra. La dice anche <code>!negozio</code> e la parola.'],
      ['«Scegli un’immagine»', 'nessuna', 'un\'immagine della tua libreria', 'Apre la libreria dei media: scegli un\'immagine tua o condivisa, oppure la carichi «Dal mio computer». «Togli l’immagine» la toglie.'],
      ['«Prezzo»', '100', `da 0 a ${cifra(MAX_PREZZO)}`, 'In monete. Zero vuol dire gratis: conta lo stesso per scorte e attese.'],
      ['«Cosa fa»', '«Un oggetto della borsa»', 'otto tipi, spiegati più sotto', 'Sotto compaiono i campi di quel tipo.'],
      ['«Scorte»', '«Illimitate»', '«Illimitate», «Tot in tutto», «Tot a persona»', 'Una scelta sola. Con «Tot in tutto» scrivi in «Quante ne restano» quante ne restano; con «Tot a persona» scrivi in «Quante a persona» quante volte può prenderlo ognuno, almeno una.'],
      ['«Attesa a persona (secondi)»', '0', `da 0 a ${cifra(MAX_ATTESA_S)} (sette giorni)`, 'Dopo un acquisto, quanto aspetta chi l\'ha comprato prima di ricomprarlo.'],
      ['«Attesa per tutti (secondi)»', '0', `da 0 a ${cifra(MAX_ATTESA_S)}`, 'Dopo un acquisto, quanto aspetta tutto il canale.'],
      ['«Si vede»', '«Sempre»', '«Sempre», «Solo a chi lo può comprare»', 'Con la seconda l\'articolo non esce nella risposta di <code>!negozio</code>, che legge tutta la chat. Chi conosce la parola lo può comprare lo stesso, se ha i requisiti.'],
      ['«Quando si compra»', '«Sempre»', '«Sempre», «Solo in diretta», «Fra due date»', 'Con «Fra due date» scegli «Dal» e «Al»: vale dal primo giorno a mezzanotte fino alla fine dell\'ultimo.'],
      ['«In vendita»', 'acceso', 'acceso o spento', 'Spento, l\'articolo resta nel pannello e in chat non si trova.'],
    ] },
    { p: [
      'Le scorte si contano dagli acquisti veri. Un acquisto rimborsato non conta: la scorta torna, e chi l\'aveva comprato può ricomprarlo senza aspettare.',
      'Le scorte «a persona» e le attese si leggono dallo storico, che si tiene un anno: un acquisto più vecchio di un anno non conta più.',
    ] },

    { h3: 'Cosa fa un articolo' },
    { tabella: [
      ['«Cosa fa»', 'Cosa succede', 'Cosa serve', 'Quando le monete tornano'],
      ['«Un oggetto della borsa»', 'Va nella borsa di chi lo compra e ci resta. Lo vede con <code>!borsa</code>.', 'niente', 'mai: l\'acquisto è tutto qui'],
      ['«Un effetto a schermo»', 'Parte sull\'overlay l\'effetto scelto in «L’effetto»: un tuo effetto (suono, immagine, video, disegnato) o un suono pronto. «Dalla libreria» prende un media dalla libreria.', 'l\'overlay aperto in OBS', 'se l\'overlay si chiude proprio mentre compra; con l\'overlay spento, o l\'effetto tolto, non si compra proprio'],
      ['«Un Modulo»', 'Parte il modulo scelto in «Il modulo», come se l\'avesse fatto partire chi compra. Quello che scrive dopo la parola arriva al modulo come <code>$args</code>.', 'un modulo acceso', 'se le condizioni del modulo lo fermano (ruolo, piattaforma, diretta, pausa)'],
      ['«Da consegnare a mano»', 'Finisce in «Da consegnare». Con «Cosa chiedi a chi compra (facoltativo)» chi compra deve scrivere la risposta dopo la parola.', 'niente', 'quando premi «Rifiuta e rimborsa»'],
      ['«Il VIP su Twitch»', `Il VIP per le dirette di «Per quante dirette», da 1 a ${MAX_DIRETTE_VIP}.`, 'Twitch', 'se Twitch non lo dà: posti VIP pieni, permesso mancante'],
      ['«Un ruolo su Discord»', 'Il bot dà il ruolo scelto in «Il ruolo» sul tuo server.', 'il server collegato nella scheda Discord, e chi compra collegato con <code>!discord</code>', 'se chi compra non è nel server, o Discord non dà il ruolo'],
      ['«Una canzone in coda»', 'La canzone scritta dopo la parola entra nella coda di Spotify.', 'Spotify collegato nella scheda Musica', 'se la canzone non si trova o Spotify è fermo'],
      ['«Un messaggio in evidenza»', 'Il messaggio scritto dopo la parola esce in chat come annuncio di Twitch, col nome di chi l\'ha comprato davanti, nel colore scelto in «Il colore dell’annuncio».', 'Twitch', 'se Twitch non lo pubblica'],
    ] },
    { p: [
      '<strong>Il VIP.</strong> Dura come il premio della classifica: il conto scende quando una diretta finisce. Comprato durante una diretta con una diretta sola, dura fino alla fine di quella. Chi ha già un VIP a dirette lo allunga: tre dirette comprate sopra due che restavano fanno cinque. Chi ha già il VIP per sempre, o fino a una data perché gliel\'hai dato a mano, non lo può comprare, e nemmeno un moderatore: Twitch non glielo dà.',
      '<strong>Il ruolo su Discord.</strong> L\'elenco mostra i ruoli che il bot può dare, cioè quelli sotto di lui. Quelli che una regola della scheda Discord nomina ci sono ma non si scelgono, con scritto «(lo danno le regole dei Ruoli)»: il giro dei ruoli li toglierebbe a chi non soddisfa la regola, e l\'acquisto sparirebbe da solo. Il ruolo comprato resta finché non lo togli tu.',
      '<strong>La canzone.</strong> Entra nella coda di Spotify come con <code>!sr</code>, ma senza le regole di <code>!sr</code> (solo abbonati, costo, punti canale): è già pagata qui. Spotify lascia solo aggiungere in fondo alla coda: la canzone suona dopo quella di adesso e dopo le richieste già in coda, prima della playlist.',
      '<strong>Il Modulo.</strong> Il suo «Costa» non si paga una seconda volta, e il suo «Serve almeno» non si guarda: si è già pagato nel negozio. Se il modulo ha una probabilità e il dado dice di no, l\'acquisto vale lo stesso, come in una macchinetta.',
    ] },

    { h3: 'Chi lo può comprare' },
    { p: ['Accendi i requisiti che vuoi: devono valere tutti. Si leggono al momento dell\'acquisto, da dove stanno davvero.'] },
    { tabella: [
      ['Requisito', 'Da dove si legge', 'Limiti'],
      ['«Abbonato da almeno (mesi)»', 'i mesi scritti nel badge del messaggio, anche non di fila. Chi non è abbonato adesso ha zero mesi.', `da ${LIMITI.mesi[0]} a ${LIMITI.mesi[1]}`],
      ['«Abbonato almeno di tier»', 'Twitch, al momento', '1, 2 o 3'],
      ['«Bit messi nel canale, da sempre»', 'la classifica dei Bit di Twitch, la stessa di <code>!bit sempre</code>', `da 1 a ${cifra(LIMITI.bit[1])}`],
      ['«Ore guardate»', 'le ore che il bot conta già', `da 1 a ${cifra(LIMITI.ore[1])}`],
      ['«Dirette di fila»', 'la serie di presenze di adesso', `da 1 a ${cifra(LIMITI.serie[1])}`],
      ['«Follower da almeno (giorni)»', 'Twitch, al momento. Zero vuol dire «segue il canale».', `da 0 a ${cifra(LIMITI.follower[1])}`],
      ['«Ruolo»', 'il messaggio: «VIP o moderatore», oppure «Moderatore». Il proprietario del canale conta come moderatore.', 'una delle due'],
    ] },
    { p: [
      'Un requisito che non si può leggere non fa comprare, e il bot lo dice: «adesso non riesco a verificarlo». Succede se manca un permesso di Twitch, se Twitch non risponde, o con un requisito di Twitch scritto da Kick o YouTube. Meglio così che un acquisto dato a chi non doveva.',
      'Se un requisito manca di sicuro, il bot dice quello, anche se un altro non si è potuto leggere.',
    ] },

    { h3: 'Da consegnare' },
    { p: [
      'Gli acquisti «Da consegnare a mano», dal più vecchio, con chi li ha comprati, cosa ha scritto, quando e quanto ha pagato.',
      '«Fatto» li chiude. «Rifiuta e rimborsa» chiede conferma, rende le monete e la scorta, e il bot scrive in chat a chi aveva comprato che non è stato accettato e quanto gli è tornato.',
      'Un acquisto deciso non si decide due volte: se due persone del pannello premono insieme, la seconda legge «Questo acquisto è già stato deciso.».',
      'Quello che c\'è da consegnare resta qui finché non decidi, anche dopo un anno.',
    ] },

    { h3: 'Storico' },
    { p: [
      'In alto quattro numeri: gli acquisti, le monete spese in tutto, quante persone hanno comprato e gli acquisti rimborsati. I rimborsati non contano negli altri tre.',
      'Sotto, gli ultimi duecento acquisti: quando, chi, cosa (con quello che ha scritto), il prezzo e «Com’è andata»: «fatto», «da consegnare», «consegnato» o «rimborsato» con il perché, per esempio «i posti VIP erano pieni» o «l\'hai rifiutato tu».',
      'Lo storico si tiene un anno, poi si cancella da solo.',
    ] },

    { h3: 'La pagina del negozio' },
    { p: [
      'Il negozio ha una pagina sua, come la pagina link: <strong>negozio.socialbot.live/</strong> e il nome del tuo canale. Funziona sempre anche l\'indirizzo lungo, socialbot.live/u/ e il nome del canale seguito da /negozio. È la pagina del tuo negozio e di nessun altro: mostra solo i tuoi articoli, la tua moneta e il tuo aspetto, e da lì non si arriva ai negozi di altri canali.',
      'Si vede quando il negozio è aperto. Da chiuso, chi apre l\'indirizzo legge che qui non c\'è un negozio, senza altro.',
      'La costruisci con lo stesso editor della pagina link: in «Contenuti» i pezzi, in «Aspetto» temi, sfondo, caratteri, colori ed effetti. «Uguale alla pagina link» prende lo stile della tua pagina link e lo segue quando la cambi; «Tutto suo» le dà un aspetto proprio. L\'anteprima si guarda come «Telefono» o come «Schermo», e quello che vedi è quello che vede chi la apre. Quando ti piace, premi «Salva e pubblica».',
    ] },
    { tabella: [
      ['Pezzo', 'Cosa mostra'],
      ['«Intestazione»', 'La foto, il titolo e il sottotitolo che scrivi in alto, in «Intestazione». Qui è un pezzo come gli altri: lo sposti dove vuoi, o lo togli.'],
      ['«Articolo in vetrina»', 'Un articolo in grande: quello che scegli, oppure «Il più comprato (cambia da solo)».'],
      ['«Griglia degli articoli»', 'Tutti gli articoli in vendita a tutti, su una, due o tre colonne, con le immagini quadrate, larghe, alte o come sono. Prezzo, scorte e requisiti li mostri o li nascondi.'],
      ['«Come si compra»', 'Il comando per comprare col nome che ha nel tuo canale, e una frase sulla tua moneta accordata come hai scelto in «Come se ne parla in chat».'],
      ['«Piede coi link»', 'Il link alla tua pagina link, se è pubblicata, e quello al tuo canale.'],
    ] },
    { p: [
      'Ci puoi mettere anche titoli, testi, immagini, righe divisorie e spazi. Ogni pezzo si allarga, si allinea ed entra come vuoi, dai comandi sotto i suoi campi.',
      'Ogni articolo ha la sua immagine (quella scelta nell\'editor dell\'articolo), il nome, la descrizione, il prezzo col nome della tua moneta, le scorte, i requisiti scritti in chiaro e un tasto «Copia» che copia il comando per comprarlo. Gli articoli che si vedono solo a chi li può comprare non ci sono.',
      'Le parole della pagina, quelle che non scrivi tu, sono nella lingua della chat scelta nelle preferenze.',
      'In «Quando condividi il link» c\'è l\'immagine che Telegram, WhatsApp e Discord mostrano quando qualcuno incolla l\'indirizzo: la puoi rifare come quella della pagina link.',
    ] },

    { h2: 'In chat' },
    { tabella: [
      ['Comando', 'Cosa fa'],
      ['<code>!negozio</code>', 'Dice i tre articoli più comprati, con la parola per comprarli e il prezzo, e l\'indirizzo della pagina del negozio. Quelli che si vedono solo a chi li può comprare non escono. <code>!shop</code> fa lo stesso.'],
      ['<code>!negozio spada</code>', 'Racconta quell\'articolo: prezzo, descrizione, requisiti e scorte.'],
      ['<code>!compra spada</code>', 'Compra l\'articolo. Per una canzone, un messaggio in evidenza o una domanda si scrive dopo la parola: <code>!compra canzone Bohemian Rhapsody</code>. <code>!buy</code> fa lo stesso.'],
      ['<code>!borsa</code>', 'Dice a chi lo scrive cosa ha nella borsa, con quante volte l\'ha preso. <code>!bag</code> fa lo stesso.'],
    ] },
    { p: [
      'Questi comandi li spegni, li rinomini o li riservi nella scheda «Comandi», come gli altri comandi pronti. Rispondono solo col negozio aperto.',
      'Il bot risponde a chi ha scritto, nella lingua della chat scelta nelle preferenze, con i numeri e le date nel formato del canale.',
      'Le monete le chiama col nome scritto in «Come si chiamano le monete», nella scheda «Giochi & classifiche», e le parole intorno le accorda come hai scelto in «Come se ne parla in chat». Con dei Semi di girasole, dopo un acquisto il bot scrive «I tuoi Semi di girasole: 450».',
    ] },
    { h3: 'Come va un acquisto' },
    { passi: [
      { t: 'Prima si guarda, senza toccare niente', d: 'Che l\'articolo ci sia e sia in vendita, che sia il suo momento, le scorte, le attese, i requisiti, le monete, e se quello che fa adesso può partire (l\'overlay aperto, Spotify collegato, il VIP che Twitch può dare). Se qualcosa manca, il bot lo dice e le monete restano dove sono.' },
      { t: 'Poi si paga, tutto insieme', d: 'Le monete escono, la scorta scende e l\'acquisto entra nello storico in un passo solo. Due persone che comprano l\'ultima scorta nello stesso istante non la prendono tutte e due: la seconda si sente dire che è finita, e non paga.' },
      { t: 'Poi parte', d: 'Se quello che si è comprato non parte, le monete e la scorta tornano, e lo storico scrive il perché. Se il bot si riavvia proprio in quel momento, all\'avvio rende le monete di quell\'acquisto.' },
    ] },
    { esempio: '🛒 Luna_Gamer, Scegli il prossimo gioco è in coda: alla consegna ci pensa andryxify in diretta. Le tue monete: 1250.' },
    { esempio: '🛒 Luna_Gamer, l\'acquisto di VIP per una diretta non è andato a buon fine: i posti VIP del canale sono pieni. Ti ho reso 5000 monete.' },

    { h2: 'Quando qualcosa non va' },
    { ul: [
      '<strong>In chat <code>!negozio</code> non risponde.</strong> Accendi «Negozio aperto». Se hai spento o rinominato il comando nella scheda «Comandi», in chat vale il nome nuovo.',
      '<strong>«Nel negozio non c\'è».</strong> La parola non è quella dell\'articolo, oppure l\'articolo non è «In vendita».',
      '<strong>Un effetto non si può comprare.</strong> L\'overlay non è aperto: il bot dice «l\'overlay in questo momento è spento» e non prende le monete. Apri la scena con l\'overlay in OBS.',
      '<strong>Il VIP torna indietro.</strong> Twitch ha pochi posti VIP per canale: quando sono pieni lo rifiuta, e le monete tornano. Se manca il permesso, nella scheda «Stato» premi «Aggiorna i permessi».',
      '<strong>«Non riesco a verificarlo» su tier, Bit o follow.</strong> Manca un permesso di Twitch: nella scheda «Stato» premi «Aggiorna i permessi». Da Kick e YouTube questi requisiti non si leggono.',
      '<strong>Il ruolo di Discord non si può scegliere.</strong> Lo nomina una regola nella scheda Discord. Toglilo dalle regole, oppure vendi un altro ruolo. Se l\'elenco è vuoto, il ruolo sta sopra al bot: su Discord trascina il ruolo del bot più in alto.',
      '<strong>Chi compra un ruolo si sente dire di collegare il suo Discord.</strong> Deve scrivere <code>!discord</code> in chat e seguire i passi. Solo dopo il ruolo si può comprare.',
      '<strong>«Quella parola la usa già un altro articolo».</strong> Ogni articolo ha la sua parola: cambiane una.',
    ] },
  ],
  faq: [
    { d: 'Le monete del negozio sono quelle dei giochi?', r: 'Sì, le stesse: si guadagnano stando in chat e in diretta, e si spendono nei giochi e nel negozio. Il nome è quello scelto in «Come si chiamano le monete».' },
    { d: 'Si può comprare con i soldi o con i punti canale di Twitch?', r: 'No. Il negozio vende solo per monete del canale, e le monete non si comprano. I punti canale sono un\'altra cosa, di Twitch.' },
    { d: 'Cosa succede se il bot si riavvia mentre qualcuno compra?', r: 'Se le monete erano già uscite e non si sa se l\'effetto è partito, all\'avvio tornano a chi le aveva spese, e lo storico scrive «il bot si è riavviato a metà».' },
    { d: 'Chi vede cosa ho comprato?', r: 'Lo streamer e i moderatori del pannello, nello storico. In chat solo la risposta del bot a chi compra.' },
    { d: 'Posso rimettere le scorte?', r: 'Sì: apri l\'articolo con «Modifica» e scrivi in «Quante ne restano» il numero nuovo.' },
    { d: 'La pagina del negozio mostra anche i negozi di altri streamer?', r: 'No. Ogni indirizzo è il negozio di un canale solo, e la pagina non porta ad altri negozi. Senza il nome di un canale, negozio.socialbot.live porta alla home di SocialBot.' },
    { d: 'Si può comprare dalla pagina?', r: 'No: la pagina mostra cosa c\'è e come si compra. Si compra in chat, con il comando che la pagina copia per te.' },
  ],
};
