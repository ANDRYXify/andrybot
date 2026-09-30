// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Manuale: account e abbonamento. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.
// I prezzi vengono dal listino che vende (numeri.js → features/abbonamenti.js).
import { PREZZO_BASE, PREZZO_ADDON, PREZZO_BUNDLE } from '../numeri.js';

const TUTTO = PREZZO_BUNDLE('tutto');

export default {
  slug: 'account',
  schede: ['account', 'sottoscrizione'],
  titolo: 'Account e abbonamento: moderatori, dati, piani | SocialBot',
  h1: 'Manuale di account e abbonamento',
  desc: 'Collegare Twitch, Kick e YouTube, entrare con una passkey, far entrare i moderatori, scaricare o cancellare i dati, scegliere piano ed extra.',
  aggiornata: '2026-09-30',
  corpo: [
    { p: [
      'Le due schede stanno nel gruppo «Account» del menù. «Il tuo account» riguarda chi entra e dove lavora il bot. «Abbonamento» riguarda cosa hai acceso e quanto paghi.',
    ] },

    { h2: 'Il tuo account', scheda: 'account', p: [
      'Qui colleghi le piattaforme dove trasmetti, crei una passkey, fai entrare i moderatori, scegli gli avvisi e decidi dei tuoi dati.',
      'Un moderatore non vede le carte «Moderatori», «Le mail che ti mandiamo», «La tua recensione» e «Avvisi e cose da provare», e non può scaricare né cancellare i dati del canale.',
    ] },

    { h3: 'Il tuo canale è su Kick' },
    { p: [
      'Compare solo se il canale che stai gestendo è su Kick. Il bot legge la tua chat di Kick e risponde lì.',
      'Su Kick funzionano comandi, moduli, giochi e monete, gli avvisi di follow e abbonamento, l\'overlay della diretta e le notifiche social.',
      'Restano fuori le cose che esistono solo su Twitch: la moderazione automatica, le clip, il cambio di categoria e titolo, i VIP, i punti canale e le emote 7TV. Le monete su Kick arrivano solo da chi scrive, perché Kick non dà l\'elenco di chi guarda in silenzio.',
    ] },

    { h3: 'Le tue piattaforme' },
    { p: [
      'Una riga per Twitch, Kick e YouTube. Comandi, moduli, punti e memoria funzionano allo stesso modo su tutte, e il bot risponde sempre dove è arrivata la domanda.',
      'Il badge di ogni riga dice a che punto sei:',
    ] },
    { tabella: [
      ['Badge', 'Cosa vuol dire'],
      ['«non disponibile»', 'Questa piattaforma non è ancora aperta su SocialBot. Per YouTube la nota dice «in arrivo».'],
      ['«non collegata»', 'Non l\'hai collegata. Premi «Collega». Su un canale Kick, YouTube o Discord la riga di Twitch resta così, senza tasto: Twitch non si aggiunge a un canale di un\'altra piattaforma. Se trasmetti anche su Twitch, entri con il tuo account Twitch e hai un canale a sé, con il suo pannello.'],
      ['«collegata»', 'Collegata, ma il bot adesso non ci lavora: per esempio su Twitch è spento, o su YouTube non sei in diretta.'],
      ['«attiva»', 'Il bot ci lavora adesso.'],
      ['«da sistemare»', 'Qualcosa non va. La nota accanto dice cosa, e il tasto accanto lo sistema.'],
    ] },
    { p: ['I tasti che puoi trovare in una riga:'] },
    { tabella: [
      ['Tasto', 'Dove', 'Cosa fa'],
      ['«Collega»', 'Kick, YouTube', 'Apre la piattaforma: accedi, autorizzi e torni qui.'],
      ['«Sistema»', 'Twitch, Kick, YouTube', 'Rifà il collegamento. Su Twitch rinnova i permessi, come «Ricollega i permessi» della scheda «Stato». Su YouTube dà il permesso nuovo per la chat.'],
      ['«Riprova gli eventi»', 'Kick', 'Rifà l\'iscrizione agli eventi di Kick. Risponde «Iscritto a N eventi. Scrivi qualcosa nella tua chat Kick e ricarica.»'],
      ['Interruttore della chat', 'YouTube', 'Accende o spegne il bot nella chat delle tue dirette YouTube. Risponde «Chat YouTube accesa» o «Chat YouTube spenta». Lo usa solo il proprietario.'],
      ['«Scollega»', 'Kick, YouTube', 'Chiede «Scollego Kick?» e ricorda che il bot smette di lavorare lì finché non lo ricolleghi. Twitch non si scollega da qui.'],
    ] },
    { p: [
      'Su Kick, quando non arriva niente, la nota dice perché. Le cause sono diverse: non risulti iscritto agli eventi, Kick non ha ancora mandato niente, gli eventi arrivano ma vengono rifiutati, oppure arrivano ma il bot non riesce a scrivere. Quando è tutto a posto la nota dice «tutto a posto» e con quale account scrive il bot.',
      'Su YouTube la nota segue la chat: «collega il canale…», poi «canale collegato. Accendi la chat…», poi «chat accesa: aspetto la tua prossima diretta» e, in onda, «sto leggendo la chat della diretta». Se hai collegato YouTube prima che arrivasse la chat, la nota chiede di ricollegare il canale: il permesso per leggerla e scriverci è nuovo. Se la quota giornaliera di YouTube è finita, la chat riprende da sola quando si rinnova.',
      'Se la carta dice «Non disponibile ora.», il pannello non è riuscito a leggere lo stato: ricarica la pagina.',
    ] },

    { h3: 'Passkey' },
    { p: [
      'Una passkey ti fa rientrare con l\'impronta, il volto o il PIN del dispositivo, senza ripassare dal sito ogni volta. La chiave resta sul tuo dispositivo.',
      'Premi «Crea una passkey» e conferma con il dispositivo entro un minuto. Come nome prende il sistema del dispositivo, per esempio macOS o Android.',
      'La passkey è <strong>tua come persona</strong>, non del canale: ti riporta al tuo canale e a tutti i canali che moderi.',
      'In «Le tue passkey» vedi quando ognuna è stata creata e usata l\'ultima volta. «Rimuovi» la toglie subito, senza chiedere conferma.',
    ] },
    { tabella: [
      ['Messaggio', 'Cosa vuol dire'],
      ['«Passkey creata! Ora puoi rientrare senza pass»', 'Fatto.'],
      ['«Operazione annullata.»', 'Hai chiuso la richiesta del dispositivo, o è passato il minuto a disposizione.'],
      ['«Questo dispositivo non supporta le passkey.»', 'Il browser non le gestisce. Prova da un altro dispositivo o aggiorna il browser.'],
      ['«Passkey non creata: …»', 'Il dispositivo l\'ha rifiutata, per esempio perché su quel dispositivo ce n\'è già una. Il motivo segue i due punti.'],
    ] },

    { h3: 'Moderatori' },
    { p: [
      'Solo il proprietario vede questa carta. Qui fai entrare nel pannello chi ti aiuta a gestire il canale.',
      'Un moderatore si occupa di comandi, moduli, effetti, giochi, notifiche, regole e memoria. Non vede e non tocca le cose da proprietario: i permessi Twitch, questo elenco, i codici delle mail, la recensione, gli avvisi, i tuoi dati e i pagamenti.',
      'Quanti moderatori puoi avere dipende dal piano: nessuno con l\'Essenziale, uno con il Base, fino a 10 con l\'extra «Squadra», fino a 20 con il piano Community.',
      'Se il piano non li comprende, in cima alla carta leggi «Avere dei moderatori sul pannello non è nel tuo piano.». Quando i pagamenti dal pannello sono aperti accanto c\'è il tasto «Sblocca con «Base»», altrimenti il collegamento «Vedi i piani». Con un posto solo e i pagamenti aperti, la carta dice «Il tuo piano ha un posto. Con «Squadra» arrivi a dieci.» e propone «Aggiungi «Squadra»».',
      'I posti li occupano i moderatori attivi e gli inviti in attesa, anche quelli scaduti, finché non li annulli. Le richieste non occupano posti finché non le accetti.',
    ] },
    { p: ['Le strade per far entrare qualcuno sono due, e vanno in versi opposti.'] },
    { passi: [
      { t: 'L\'invito. ', d: 'In «Dove sta il moderatore» scegli Twitch, Kick o YouTube, scrivi il suo nome utente dopo la @ e premi «Crea invito». Sotto compare il link con la scadenza e il tasto «Copia». Mandaglielo come vuoi.' },
      { t: 'La richiesta. ', d: 'Chi ti modera già sul canale può chiedere lui l\'accesso dal suo pannello. La richiesta compare in «Chi ha chiesto di aiutarti», e decidi tu.' },
    ] },
    { p: [
      'L\'invito <strong>vale 72 ore</strong> e si usa una volta. Chi lo apre entra con <strong>il suo account su quella piattaforma</strong>, lo stesso che hai scritto tu. Con un altro account l\'invito non vale, e su Twitch la pagina dell\'invito glielo dice.',
      'Il link non è nemmeno indispensabile: se quella persona entra nel pannello con quell\'account prima della scadenza, l\'invito si abbina da solo.',
      'Scrivi il nome com\'è sulla piattaforma, con o senza la @. Maiuscole, punti, trattini e spazi non contano: il nome si legge come quando quella persona entra, e restano lettere, numeri e trattino basso. Se non resta niente, leggi «nome utente non valido».',
    ] },
    { p: ['In «Chi ha chiesto di aiutarti» ogni richiesta porta un segno:'] },
    { ul: [
      '«confermato da Twitch»: abbiamo chiesto a Twitch chi modera il tuo canale, e quella persona c\'è.',
      '«da controllare tu»: la conferma automatica non è stata possibile. Succede sempre su Kick, che non pubblica l\'elenco dei moderatori, e su YouTube, che lo mostra solo durante una diretta. Succede anche quando chi chiede ha un account su una piattaforma diversa dalla tua, o quando Twitch in quel momento non risponde. Guarda il nome e la nota prima di accettare.',
    ] },
    { p: [
      '«Accetta» lo fa entrare: da quel momento vede il tuo canale dal suo pannello, e leggi «Adesso può gestire SocialBot con te.». Il posto si controlla quando premi: se sono tutti occupati, leggi «hai raggiunto il massimo di moderatori del tuo piano.».',
      '«Rifiuta» chiede conferma. Chi riceve un no non può richiederti di nuovo per 30 giorni.',
      'Una richiesta in attesa <strong>non è un moderatore</strong>: non vede niente e non tocca niente finché non dici di sì.',
    ] },
    { p: ['In «I tuoi moderatori» vedi chi c\'è e chi è stato invitato:'] },
    { tabella: [
      ['Stato', 'Cosa vedi', 'Tasti'],
      ['«attivo»', '«ultimo accesso …», oppure «mai entrato».', '«Rimuovi»: chiede «Tolgo questo moderatore?», e da lì non entra più nel pannello.'],
      ['«invito in attesa»', '«invito valido fino al …» con la data di scadenza.', '«Copia link», «Rigenera» per un link nuovo di 72 ore, «Annulla», che chiede conferma come «Rimuovi».'],
      ['«invito scaduto»', 'Sono passate le 72 ore: «il link non vale più: rigeneralo».', '«Rigenera» e «Annulla». Il vecchio link non si copia più.'],
    ] },
    { p: ['Messaggi che puoi incontrare creando un invito: «Scrivi il nome utente del moderatore.», «nome utente non valido», «sei già il proprietario del canale», «Il tuo piano non include i moderatori.», «hai raggiunto il massimo di moderatori del tuo piano.».'] },

    { h3: 'Moderi il canale di qualcun altro?' },
    { p: [
      'La carta per chi modera un canale che usa già SocialBot e vuole entrare nel suo pannello senza aspettare un link. La vedono tutti.',
      'In «Il canale che moderi» scegli la piattaforma e scrivi il nome del canale. In «Due righe per farti riconoscere (facoltative)» puoi scrivere fino a 300 caratteri. Premi «Manda la richiesta».',
      'Se chiedi con un account Twitch per un canale Twitch, chiediamo a Twitch se lo moderi. Quando Twitch conferma leggi «Richiesta mandata, già confermata da Twitch.». Negli altri casi leggi «Richiesta mandata. Ora decide chi ha il canale.».',
      'Puoi avere al massimo <strong>3 richieste in attesa</strong> in tutto.',
    ] },
    { tabella: [
      ['Messaggio', 'Perché'],
      ['«questo canale non usa SocialBot»', 'Il nome è sbagliato, o quel canale non ha il bot.'],
      ['«Twitch non ti elenca fra i moderatori di quel canale»', 'Twitch ha risposto, e tu non sei fra i suoi moderatori.'],
      ['«gestisci già questo canale»', 'Sei già dentro.'],
      ['«hai già un invito per questo canale: aprilo dal link che ti ha mandato»', 'Lo streamer ti ha già invitato.'],
      ['«la tua richiesta è già in attesa»', 'L\'hai già mandata.'],
      ['«questo canale ha già risposto di no: puoi richiedere più avanti»', 'Ti ha detto di no da meno di 30 giorni.'],
      ['«hai già 3 richieste in attesa: aspetta una risposta»', 'Hai raggiunto il massimo.'],
      ['«quello sei tu»', 'Hai scritto il tuo canale.'],
    ] },
    { p: ['In «Le tue richieste» vedi quelle mandate. Una richiesta «in attesa» si ritira con «Ritira», e dopo puoi rimandarla subito. Una che ha avuto un no dice «ha risposto di no» e «puoi richiedere fra qualche settimana».'] },

    { h3: 'Installa l\'app' },
    { p: [
      'Installa il pannello come app sul telefono o sul computer: si apre a tutto schermo, senza cercarlo nel browser.',
      'Su Android e sul computer con Chrome premi «Installa l\'app». Se il browser non lo permette da qui, il pannello ti dice di usare il menù del browser. Su iPhone e iPad apri il pannello in Safari, premi Condividi e poi «Aggiungi a Home».',
    ] },

    { h3: 'Le mail che ti mandiamo' },
    { p: [
      'Solo per il proprietario. In fondo a ogni mail di SocialBot c\'è un codice, e qui trovi quello giusto. Chi imita una nostra mail non può conoscerlo, perché sta solo dentro il tuo pannello.',
      'Il codice cambia <strong>ogni lunedì</strong>. Trovi quello di «questa settimana» e quelli delle settimane passate del mese, per le mail che apri in ritardo.',
      'Se il codice in fondo a una mail non combacia, quella mail non l\'abbiamo scritta noi: non aprire i collegamenti e scrivicelo.',
    ] },

    { h3: 'La tua recensione' },
    { p: [
      'Solo per il proprietario. Dai un voto a SocialBot, da una a cinque stelle, e se vuoi due righe. Le recensioni pubblicate compaiono nella pagina iniziale, sotto l\'anteprima dell\'Overlay Studio.',
      'Puoi recensire dopo <strong>7 giorni</strong> dall\'attivazione del canale e dopo <strong>2 dirette</strong> con il bot acceso. Se usi solo Discord, basta che il bot abbia già lavorato sul tuo server. Prima di allora la carta dice cosa manca: «Potrai lasciarla dopo la prima settimana con SocialBot.», «Potrai lasciarla dopo un paio di dirette col bot acceso.» oppure «Potrai lasciarla dopo che il bot ha lavorato sul tuo server.».',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa'],
      ['Stelle, da 1 a 5', 'Il voto. È l\'unica cosa obbligatoria. Scelte le stelle, compaiono gli altri campi.'],
      ['«Due righe, se ti va»', 'Il testo, fino a 400 caratteri e senza link.'],
      ['«Fai vedere il nome del tuo canale»', 'Mostra il nome del canale accanto alla recensione. Di base è spenta, e la recensione dice «uno streamer su Twitch» (o su Kick, YouTube, Discord).'],
      ['«Pubblica» / «Aggiorna»', 'Salva la recensione. Risponde «Grazie! È nella pagina iniziale.» oppure, se c\'è un testo da leggere, «Grazie! La leggo e poi la metto nella pagina iniziale.».'],
      ['«Togli la recensione»', 'Chiede «Tolgo la tua recensione?» e la toglie dalla pagina iniziale. Puoi scriverne un\'altra quando vuoi.'],
    ] },
    { p: [
      'Le stelle da sole si pubblicano subito. Un testo lo leggiamo prima di pubblicarlo, e lo nascondiamo solo per insulti, spam o dati personali, mai per il voto. Finché lo leggiamo il badge dice «la sto leggendo», poi «nella pagina iniziale» oppure «non pubblicata». Se cambi il testo, torna in lettura. Se cambi solo le stelle, resta com\'era.',
      'Nella pagina iniziale la fascia delle recensioni compare quando ce ne sono almeno 3 con testo. In testa c\'è la media di tutti i voti pubblicati, sotto scorrono le ultime 12 con testo.',
      'Messaggi che puoi incontrare: «Scegli da una a cinque stelle.», «Senza link, per favore.», «Al massimo 400 caratteri.».',
      'Quando puoi recensire e non l\'hai ancora fatto, dopo 45 secondi di pannello aperto compare anche una carta in basso a destra: «Come ti trovi con SocialBot?». È la stessa cosa in piccolo: scegli le stelle, scrivi se vuoi e premi «Pubblica». «Più tardi» la rimanda di 30 giorni, «Non chiedermelo più» la spegne. Non compare mai sopra una finestra aperta o sopra un avviso. Dopo averla spenta, la recensione la lasci sempre da qui.',
    ] },

    { h3: 'Avvisi e cose da provare' },
    { p: [
      'Solo per il proprietario. Ogni tanto, in basso a destra, un piccolo avviso ti dice cosa manca al canale per usare quello che hai. Ne compare uno per volta, dopo 12 secondi di pannello aperto, e mai sopra una finestra, la ricerca o la carta delle recensioni. Se sei già nella scheda dove si sistema, non compare.',
      'Un avviso esiste finché la cosa manca: quando la fai, sparisce da solo.',
    ] },
    { tabella: [
      ['Avviso', 'Quando compare', 'Dove porta «Fammi vedere»'],
      ['«Mancano dei permessi»', 'Twitch ha permessi nuovi che non hai ancora dato.', '«Stato»'],
      ['«Il bot è spento»', 'L\'interruttore del bot è spento.', '«Stato»'],
      ['«Spotify non è collegato»', 'Le richieste musicali sono accese, cioè il comando <code>!sr</code> è acceso, ma Spotify non è collegato. Se non le usi, spegni <code>!sr</code> e l\'avviso sparisce.', '«Musica»'],
      ['«Il tuo overlay non l’hai ancora aperto»', 'Il link del tuo overlay non è mai stato aperto nel programma con cui trasmetti.', '«Overlay Studio»'],
      ['«Non hai ancora un comando tuo»', 'Nel canale non c\'è nessun comando e nessun modulo fatto da te. I due moduli del kit di partenza, «Benvenuto ai nuovi» e «Promemoria follow», finché restano com\'erano non contano.', '«Comandi»'],
      ['«La tua pagina link non è pubblicata»', 'La pagina link non è accesa.', '«Pagina link»'],
      ['«La tua settimana è vuota»', 'In «La tua settimana» non c\'è nessun giorno con un\'ora.', '«La tua settimana»'],
    ] },
    { p: [
      'Sotto ogni avviso ci sono quattro tasti. «Fammi vedere» ti porta dove si sistema e lo rimanda a domani. «Domani» e «Fra una settimana» lo rimandano. «Non mostrarlo più» lo toglie per sempre. Esc vale come «Domani».',
      'Quando al canale non manca niente, gli avvisi lasciano il posto agli inviti «Hai già provato…?»: una funzione che il canale non ha mai usato, detta con una domanda e due righe su cosa fa. Arrivano solo dopo la prima settimana del canale, non prima di 3 giorni dall\'ultima risposta a un invito, e solo per le funzioni che il tuo piano comprende.',
    ] },
    { tabella: [
      ['Invito', 'Dove porta «Fammi vedere»'],
      ['«Hai già provato le Grafiche social?»', '«Grafiche social»'],
      ['«Hai già provato gli Effetti?»', '«Effetti & suoni»'],
      ['«Hai mai visto il muro delle emote?»', '«Overlay Studio»'],
      ['«Hai già provato CONSOLify?»', '«CONSOLify»'],
      ['«Hai un server Discord?»', '«Discord»'],
      ['«Hai un gruppo Telegram?»', '«Telegram»'],
      ['«Hai già una pagina per le donazioni?»', '«Donazioni»'],
      ['«Hai già fatto un gioco tuo?»', '«Giochi & classifiche»'],
      ['«Il bot sa già chi sei?»', '«Conoscenza»'],
      ['«Usi le emote 7TV?»', '«Emote (7TV)», solo per i canali Twitch'],
      ['«Hai già un QR che porta al tuo canale?»', '«QR su misura»'],
    ] },
    { p: [
      'Ogni invito compare una volta sola. «Fammi vedere» ti porta lì e lo chiude, «Non mi interessa» lo chiude, «Più avanti» (o Esc) lo rimanda di una settimana.',
      'L\'interruttore «Mostrameli» accende e spegne tutto, avvisi e inviti. Di base è acceso, e risponde «Avvisi accesi ✓» o «Avvisi spenti».',
      'Le risposte restano salvate col canale: valgono anche sul telefono e sugli altri computer. Chi modera il canale non riceve gli avvisi e non li può togliere.',
    ] },

    { h3: 'I tuoi dati sono tuoi' },
    { p: [
      'Il proprietario preme «Scarica i miei dati» e riceve un file solo, leggibile, con quello che è suo: comandi, moduli, effetti, punti, ore guardate, citazioni, contatori, pagina pubblica, impostazioni.',
      'Il file non contiene le chiavi di accesso ai tuoi account né le passkey. Dei messaggi della chat contiene solo i tuoi, perché quelli degli spettatori sono di chi li ha scritti.',
      'Il file è in formato JSON. Porta fino a 20.000 righe per ogni tipo di dato, e fino a 5.000 dei tuoi messaggi. Le immagini, i video e i suoni che hai caricato non sono dentro al file.',
      'Un moderatore vede la carta, ma il file lo scarica solo il proprietario: i dati sono suoi.',
    ] },

    { h3: 'I tuoi collegamenti' },
    { p: [
      'Qui trovi, tutti insieme, gli account che hai collegato oltre a quello con cui entri: Spotify, TikTok, Instagram, gli avvisi di Discord col webhook, 7TV, l\'accesso con Telegram e l\'account Telegram a cui il bot scrive in privato. Accanto a ognuno c\'è il nome dell\'account, quando lo conosciamo.',
      '«Scollega» ti chiede conferma e poi toglie il collegamento: il bot smette di usarlo e dimentica le sue chiavi, e lo ricolleghi quando vuoi dalla sua scheda. La carta si apre con <strong>qualunque piano</strong>: se torni all\'Essenziale e una scheda si chiude, quello che ci avevi collegato lo togli comunque da qui.',
      'Twitch, Kick e YouTube stanno in «Le tue piattaforme»; i conti delle donazioni (Stripe, Satispay, Ko-fi) nella scheda Donazioni. La carta la vede solo il proprietario.',
    ] },

    { h3: 'Andarsene' },
    { p: [
      'Solo il proprietario può cancellare. Se te ne vai non resta niente di tuo: comandi, moduli, effetti, punti, ore guardate, memoria della chat, pagina link, file caricati, collegamenti ai tuoi account, recensione. Il bot esce dal tuo canale.',
      'Non si annulla e non c\'è un cestino. Se vuoi tenerti qualcosa, scarica prima i tuoi dati.',
    ] },
    { passi: [
      { t: 'Apri «Voglio cancellare tutto». ', d: 'Il pannello guarda cosa c\'è e te lo elenca in «Adesso qui c\'è: …». Se non c\'è ancora niente, dice «Non c\'è ancora niente da cancellare.».' },
      { t: 'Scrivi il nome del canale. ', d: 'La carta te lo mostra: «Scrivi «nome» per confermare». È il nome come lo vedi sulla tua piattaforma. Vale per i canali Twitch, Kick, YouTube e Discord.' },
      { t: 'Premi «Cancella tutto per sempre». ', d: 'Il tasto si accende solo quando il nome combacia.' },
    ] },
    { p: [
      'Se hai un abbonamento a pagamento, prima di cancellare i dati lo disdiciamo su Stripe: non ci saranno altri addebiti. Se Stripe non risponde, <strong>non cancelliamo niente</strong> e leggi «Non riesco a disdire il tuo abbonamento su Stripe: non ho cancellato niente. Riprova fra poco.». Se in quel momento i pagamenti sono chiusi, leggi «Hai un abbonamento attivo e adesso non riesco a disdirlo: scrivi ad andryxify prima di cancellare.».',
      'Quando ha finito, il pannello dice «Fatto: non è rimasto niente di tuo. Adesso esci.» e il tasto «Esci» chiude la sessione.',
    ] },

    { h2: 'Abbonamento', scheda: 'sottoscrizione', p: [
      'Qui vedi cosa hai attivo, cosa comprende, e come cambiarlo o annullarlo. Nessun vincolo: si disdice quando vuoi.',
      'La regola: <strong>l\'Essenziale è gratis e resta gratis</strong>, senza carta. Il resto si aggiunge uno per uno e si toglie quando non serve più.',
      'La scheda è una carta sola, «La tua sottoscrizione», divisa nelle parti qui sotto.',
      'Un moderatore vede il piano del canale e cosa è acceso. Pagare, aggiungere un extra e disdire sono cose del proprietario: al moderatore la scheda non mostra i tasti per farlo, e al posto della gestione dice «Pagare, aggiungere un extra e disdire sono cose del proprietario del canale.».',
    ] },

    { h3: 'Piano attuale' },
    { p: ['In cima c\'è il nome del piano e una riga che dice in che situazione sei.'] },
    { tabella: [
      ['Piano attuale', 'Cosa dice la riga', 'Cosa fare'],
      ['Essenziale', 'Gratuito, senza scadenza e senza carta.', 'Niente. Se ti serve un extra, lo aggiungi sotto.'],
      ['Base', '«rinnovo il …» con la data.', 'Niente.'],
      ['Base, badge «prova gratuita»', 'Una prova fino al giorno indicato, senza carta collegata.', 'Alla fine torni all\'Essenziale senza addebiti. Per continuare, scegli sotto.'],
      ['Essenziale, badge «pagamento non riuscito»', 'L\'ultimo pagamento non è passato: per ora sei sull\'Essenziale.', 'Premi «Aggiorna la carta». Appena il pagamento passa, le funzioni tornano da sole.'],
      ['Essenziale, abbonamento in pausa', 'Sei sull\'Essenziale finché non lo riprendi.', 'Riprendilo dal portale con «Apri il portale dei pagamenti».'],
      ['Essenziale, abbonamento finito', 'Finito il giorno indicato. Niente di tuo è stato cancellato.', 'Scegli sotto cosa riaccendere.'],
      ['Essenziale, prova finita', 'La prova è finita, senza addebiti.', 'Scegli sotto cosa riaccendere.'],
      ['Community', 'Membro abilitato della community di andryxify.it: tutto, gratis, senza scadenza.', 'Niente da gestire né da pagare.'],
      ['Pro (storico)', 'Il vecchio piano con tutto dentro, per chi lo aveva già.', 'Niente.'],
    ] },
    { p: ['Se andryxify ti ha aperto o chiuso qualcosa a mano, sotto la riga compare anche questo, con l\'eventuale data di fine e la nota.'] },

    { h3: 'Cosa hai acceso' },
    { p: [
      'Le funzioni del piano, con la spunta su quelle accese: «Comandi e automazioni», «Overlay per la diretta», «Effetti e punti canale», «Giochi e classifiche», «Richieste musicali», «Clip automatiche», «Comandi a voce», «Avvisi live e nuovi post», «Bot su Telegram», «Studio Web».',
      'Sotto, «Moderatori che puoi invitare:» dice quanti posti hai in tutto.',
    ] },

    { h3: 'I tuoi pacchetti' },
    { p: ['Compare se hai degli extra a pagamento. Per ognuno vedi nome, prezzo, cosa fa e il badge «attivo».'] },

    { h3: 'Puoi aggiungere' },
    { p: ['Cosa comprende ogni piano e ogni extra. Il prezzo che paghi è quello che vedi nella scheda prima di premere «Attiva».'] },
    { tabella: [
      ['Piano o extra', 'Prezzo al mese', 'Cosa accende', 'Se lo spegni'],
      ['Essenziale', 'Gratis', 'Il bot in chat col tuo account, comandi e moduli illimitati, moderazione e scudo anti-bot, overlay, alert e contatori, giochi e monete, sondaggi, effetti anche a punti canale, richieste musicali.', 'Non si spegne.'],
      ['Base', PREZZO_BASE(), 'Tutto l\'Essenziale, più gli avvisi quando vai in diretta su Telegram e Discord, gli avvisi dei nuovi post su TikTok, YouTube e Instagram, il bot su Telegram, lo Studio Web e un moderatore.', 'Gli avvisi non partono più e non puoi invitare né accettare moderatori. Le impostazioni restano.'],
      ['Clip Automatiche', PREZZO_ADDON('clip'), 'I momenti migliori clippati e salvati da soli mentre trasmetti su Twitch.', 'Le clip già fatte restano. Non ne nascono di nuove.'],
      ['Comandi Vocali', PREZZO_ADDON('voce'), 'Guidi il bot con la voce: cambi titolo e categoria e dai VIP mentre trasmetti.', 'L\'ascolto si ferma. I moduli con innesco vocale restano scritti, ma non scattano.'],
      ['Squadra', PREZZO_ADDON('squadra'), 'Fino a 10 moderatori sul pannello.', 'Non puoi invitarne né accettarne oltre il posto del Base.'],
      ['Tutto', `${TUTTO.prezzo} invece di ${TUTTO.pieno}`, 'I tre extra insieme.', 'Come spegnere i tre extra.'],
    ] },
    { p: [
      'Gli extra si aggiungono sopra il Base: dall\'Essenziale, scegliere un extra vuol dire prendere anche il Base.',
      'Giochi, effetti e richieste musicali erano extra a pagamento: ora stanno nell\'Essenziale. Chi li aveva comprati non deve fare niente, e può disdirli dal portale quando vuole.',
      '<strong>Spegnere un extra non cancella niente di tuo.</strong> Comandi, monete, effetti caricati, classifiche e impostazioni restano, e riaccendendo l\'extra ritrovi tutto com\'era.',
    ] },
    { p: ['Quando i pagamenti dal pannello sono aperti, qui c\'è il riquadro per aggiungere. Il suo titolo dice da dove parti: «Il Base, più quello che vuoi» dall\'Essenziale, «Per continuare dopo la prova» durante una prova, «Gli extra che ti mancano» se hai già un abbonamento.'] },
    { passi: [
      { t: 'Spunta cosa ti serve. ', d: 'Accanto a ogni extra c\'è quanto aggiunge al mese. Il totale si aggiorna mentre spunti.' },
      { t: 'Guarda il totale. ', d: `Se sei sull'Essenziale comprende il Base, e con niente spuntato dice «solo il canone Base». Se hai già il Base conta solo gli extra che aggiungi. Se scegli tutti e tre gli extra e non ne hai ancora nessuno, lo sconto di «Tutto» si applica da solo: «Col pacchetto «Tutto» paghi ${TUTTO.prezzo} invece di ${TUTTO.pieno}: applicato.».` },
      { t: 'Premi «Attiva». ', d: 'Se non hai un abbonamento, si apre la pagina di pagamento di Stripe. Se ce l\'hai, gli extra entrano in quello e il Base non si ripaga.' },
    ] },
    { p: [
      'Quando gli extra entrano nell\'abbonamento che hai, leggi «Aggiunto: … È già tuo; i giorni che restano del mese li trovi nella prossima fattura.». Se avevi già tutto, leggi «Ce l’hai già: non c’era niente da aggiungere.».',
      'Quando torni dalla pagina di pagamento, il pannello ti riporta qui e dice com\'è andata: «Pagamento ricevuto: il tuo piano è attivo.», «Pagamento in corso: appena Stripe conferma, il piano si accende da solo.», «Pagamento annullato: nessun addebito.» oppure «Non risulta nessun pagamento. Se hai pagato, scrivi ad andryxify.».',
      'Se hai già tutti gli extra, il riquadro dice «Hai già tutti gli extra. Non c’è altro da aggiungere.».',
    ] },
    { p: ['Quando non si può comprare dal pannello:'] },
    { ul: [
      'Se un pagamento non è andato a buon fine o l\'abbonamento è in pausa, vedi gli extra senza caselle e «Prima sistema il pagamento dal portale qui sotto: poi aggiungi quello che vuoi.».',
      'Se i pagamenti non sono aperti, vedi gli extra con il prezzo e «I pagamenti dal pannello non sono ancora aperti: per un extra chiedi ad andryxify.».',
      'Un extra compare solo quando il suo prezzo è pronto per la vendita. Se ne manca uno, riprova più tardi.',
      'Se Stripe in quel momento non risponde, leggi «In questo momento non riesco a parlare con Stripe: riprova fra poco.». Se il piano scelto non si può vendere adesso, leggi «Piano non disponibile.».',
    ] },
    { p: ['Nelle altre schede, una funzione fuori dal tuo piano mostra «Non nel tuo piano», con «Guarda la demo» e il tasto «Sblocca con «…»», che la aggiunge da lì. Sotto c\'è «Vedi tutti i piani e i pacchetti», che porta qui. Se i pagamenti dal pannello non sono aperti, al posto del tasto leggi quale pacchetto la comprende e «Chiedi ad andryxify di abilitarla.». Un moderatore il tasto non lo vede: legge quale pacchetto la comprende e «Può aggiungerla il proprietario del canale.».'] },

    { h3: 'Gestione e disdetta' },
    { p: ['Il tasto apre il <strong>portale sicuro dei pagamenti</strong> di Stripe. Il nome del tasto cambia con la situazione:'] },
    { tabella: [
      ['Tasto', 'Quando', 'Cosa trovi nel portale'],
      ['«Gestisci, cambia carta o annulla»', 'Abbonamento attivo.', 'Le fatture, la carta e la disdetta.'],
      ['«Aggiorna la carta»', 'Pagamento non riuscito.', 'La carta da aggiornare e la fattura rimasta in sospeso. Il resto si riaccende da solo.'],
      ['«Apri il portale dei pagamenti»', 'Abbonamento finito o in pausa.', 'Le fatture di prima, e la ripresa.'],
    ] },
    { p: [
      'Se annulli, resti attivo <strong>fino alla fine del periodo già pagato</strong>, poi torni all\'Essenziale. Niente di quello che hai configurato viene cancellato: le funzioni in più si spengono.',
      'Senza pagamenti attivi non c\'è nulla da annullare, e la scheda lo dice. Una prova gratuita scade da sola, senza addebiti. Con il piano Community l\'accesso viene dalla community, e non c\'è niente da gestire.',
      'Se il portale non si apre, leggi «Gestione abbonamento non disponibile.»: scrivi ad andryxify.',
    ] },
  ],
  faq: [
    { d: 'Il bot smette se non pago?', r: 'No. L\'Essenziale non scade, e il bot resta in chat anche se un abbonamento finisce o un rinnovo non passa.' },
    { d: 'Serve la carta per registrarsi?', r: 'No, e nemmeno per usare l\'Essenziale.' },
    { d: 'Che succede ai miei comandi se torno all\'Essenziale?', r: 'Restano tutti. Quelli che dipendono da un extra spento non scattano, ma non vengono cancellati: riaccendendo l\'extra ripartono da soli.' },
    { d: 'Le monete degli spettatori si perdono?', r: 'No. La classifica si ferma dov\'è e riprende da lì.' },
    { d: 'Ho già il Base e voglio un extra: pago di nuovo il Base?', r: 'No. L\'extra entra nell\'abbonamento che hai e il totale conta solo lui. La parte di mese che resta la trovi nella prossima fattura.' },
    { d: 'Dove vedo quanto pago davvero?', r: 'Nel portale dei pagamenti, con le fatture: premi «Gestisci, cambia carta o annulla». Nella scheda vedi il piano, la data di rinnovo e il prezzo di ogni extra che hai.' },
    { d: 'Ho pagato ma il pannello non lo vede ancora.', r: 'Il piano si accende appena Stripe conferma l\'incasso: con la carta è subito, con un bonifico può volerci qualche giorno. Se dopo «Pagamento in corso: appena Stripe conferma, il piano si accende da solo.» non cambia niente, scrivi ad andryxify.' },
    { d: 'Un rinnovo non è passato. Cosa succede?', r: 'Sei sull\'Essenziale finché il pagamento non passa, e non perdi niente. Premi «Aggiorna la carta» nella scheda «Abbonamento»: appena il pagamento passa, le funzioni tornano da sole.' },
    { d: 'Un moderatore vede i miei dati di pagamento?', r: 'No. Vede il piano del canale e cosa è acceso. La carta e le fatture stanno nel portale dei pagamenti, che è del proprietario.' },
    { d: 'Uno sconosciuto può chiedermi di moderare il mio canale?', r: 'Su Twitch, se Twitch dice che quella persona non ti modera, la richiesta non parte. Negli altri casi, e su Kick e YouTube sempre, ti arriva marcata «da controllare tu». Finché non dici di sì quella persona non vede niente, e ognuno può avere al massimo 3 richieste in attesa.' },
    { d: 'Il mio moderatore dice che il link non funziona.', r: 'L\'invito dura 72 ore e si usa una volta. In «I tuoi moderatori» premi «Rigenera» e mandagli il link nuovo. Deve entrare con lo stesso account che hai scritto nell\'invito, sulla stessa piattaforma.' },
    { d: 'Moderavo già un canale: devo aspettare che mi mandi il link?', r: 'No. Nella scheda «Il tuo account», carta «Moderi il canale di qualcun altro?», scrivi il nome del canale e premi «Manda la richiesta».' },
    { d: 'Ho perso il telefono con la passkey.', r: 'Entra nel pannello con il tuo account di Twitch, Kick o YouTube, poi togli quella passkey da «Le tue passkey» con «Rimuovi».' },
    { d: 'Posso avere il bot su due canali?', r: 'Ogni canale ha il suo abbonamento, perché ogni canale ha la sua chat, le sue monete e i suoi comandi.' },
    { d: 'Voglio cancellare tutto ma ho un abbonamento.', r: 'Non serve disdirlo prima: la cancellazione lo disdice su Stripe, e se Stripe non risponde non cancella niente. Dopo non ci sono altri addebiti.' },
    { d: 'Mi è arrivata una mail di SocialBot e ho dei dubbi.', r: 'Guarda il codice in fondo alla mail e confrontalo con «Le mail che ti mandiamo» nella scheda «Il tuo account». Se non combacia, non aprire i collegamenti e scrivicelo.' },
    { d: 'Come tolgo gli avvisi in basso a destra?', r: 'Uno alla volta con «Non mostrarlo più», o con «Non mi interessa» per gli inviti «Hai già provato…?». Tutti insieme spegnendo «Mostrameli» nella carta «Avvisi e cose da provare» della scheda «Il tuo account».' },
    { d: 'Non riesco ancora a lasciare una recensione.', r: 'Servono 7 giorni dall\'attivazione del canale e 2 dirette col bot acceso, oppure, se usi solo Discord, il bot al lavoro sul tuo server. La carta «La tua recensione» dice cosa manca.' },
  ],
};
