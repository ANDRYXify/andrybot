// Manuale: Manuale del bot: personalità, conoscenza e memoria. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'bot',
  schede: ['personalita', 'conoscenza', 'memoria', 'avatar'],
  titolo: 'Manuale del bot: personalità, conoscenza e memoria | SocialBot',
  h1: 'Manuale del bot: personalità, conoscenza e memoria',
  desc: 'Come regoli tono, carattere e interventi del bot in chat, cosa gli insegni su di te, cosa si ricorda del canale e come azzeri quello che ha imparato.',
  aggiornata: '2026-09-24',
  corpo: [
    { p: [
      'In chat il bot scrive <strong>a nome tuo</strong>: chi guarda vede il tuo account, non uno estraneo. Qui decidi come parla, cosa sa e cosa si ricorda.',
      'Nel menù, sotto «Il tuo bot», trovi la pagina «Il bot» con tre schede in alto: «Personalità», «Conoscenza» e «Memoria».',
      'Sono comprese in Essenziale, il pacchetto gratuito. Valgono nella chat della diretta di ogni canale collegato. Un canale solo Discord non le ha. Perché il bot parli in chat deve essere acceso nella scheda «Stato».',
      'Tu e i moderatori del pannello potete cambiare tutto quello che c\'è in queste tre schede, tranne «Azzera ciò che ha imparato», che vede e usa solo il proprietario del canale. I moderatori si invitano da «Il tuo account» e servono almeno il piano Base: vedi il <a href="/manuale/account">manuale dell\'account</a>.',
    ] },

    // ------------------------------------------------------------ PERSONALITÀ
    { h2: 'Personalità', scheda: 'personalita', p: [
      'Decide come parla il bot: il tono, il carattere, quanto interviene da solo e le regole che rispetta sempre. Ci sono due carte: «Personalità» e «Linee guida».',
    ] },

    { h3: 'Personalità' },
    { p: [
      'Tutti i controlli di questa carta si salvano insieme con «Salva», in fondo. Compare «Personalità salvata ✓» e il nuovo stile vale da subito. Senza «Salva» non cambia niente.',
      'I valori di base sono quelli con cui parte un canale nuovo.',
    ] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Tono»', '«Scherzoso»', '«Scherzoso», «Amichevole», «Serio»', 'La forma delle frasi: battute e ironia, caloroso e tranquillo, oppure sobrio e diretto.'],
      ['«Carattere»', 'vuoto', '300 caratteri', 'Com\'è fatto il bot, con parole tue: «tagliente e sarcastica, ma mai cattiva». Descrivi com\'è, non cosa deve fare. Vale ovunque parli, prima di ogni regola.'],
      ['«Come parla di sé»', '«Non lo dice»', '«Non lo dice», «Femminile», «Maschile»', 'Il genere con cui parla di sé: «sono apparsa» o «sono apparso». Con «Non lo dice» gira la frase per non doverlo dire.'],
      ['«Chat autonoma»', '5%', 'da 0 a 50%', 'Quanto partecipa da solo alla conversazione. A 0% parla solo se lo chiamano.'],
      ['«Rispondi quando mi nominano in chat»', 'acceso', '', 'Risponde a chi lo chiama.'],
      ['«Personalità proattiva»', 'acceso', '', 'Ogni tanto si fa vivo da solo, quando c\'è un motivo.'],
      ['«Solo mentre sono in diretta»', 'spento', '', 'Con la spunta parla di sua iniziativa solo a diretta accesa.'],
      ['«Ricorda i tuoi social in chat, nei momenti giusti»', 'acceso', 'al più ogni 45 minuti', 'In diretta ricorda l\'indirizzo della tua pagina link.'],
      ['«Adatta la personalità al mio canale (in automatico)»', 'acceso', '', 'Il bot impara come parli dalla tua voce in diretta e dai tuoi messaggi in chat. Spento, lo stile lo decidi solo tu, col tono e con le tue frasi.'],
      ['«Risposte intelligenti (IA locale auto-addestrata)»', 'acceso', '', 'Scrive le risposte con parole sue e capisce le domande anche scritte in un altro modo.'],
      ['«Accesso a internet»', 'acceso', '', 'Quando non sa una cosa, può cercarla online.'],
      ['«Le tue frasi / battute (una per riga)»', 'vuoto', '50 frasi da 200 caratteri', 'Esempi del tuo modo di scrivere, per suonare come te.'],
    ] },

    { p: [
      '<strong>Chiamarlo per nome.</strong> Con «Rispondi quando mi nominano in chat» acceso, il bot risponde quando in un messaggio compare la parola «bot» o il nome del tuo canale, con o senza @. La stessa persona lo può richiamare dopo 10 secondi. Non risponde mai agli altri bot noti: Nightbot, StreamElements, Moobot, Streamlabs, Fossabot e Wizebot. Da spento, chi lo nomina non riceve risposta.',
    ] },

    { p: [
      '<strong>La chat autonoma.</strong> Il cursore decide due cose. La prima è quanto spesso il bot risponde a un messaggio che non lo chiama: più è alto, più spesso, e alle domande risponde più volentieri. Fra due risposte di questo tipo passano almeno 45 secondi, 15 se sta continuando a parlare con la stessa persona.',
      'La seconda è ogni quanto, al massimo, dice una cosa sua mentre il discorso scorre:',
    ] },
    { tabella: [
      ['«Chat autonoma»', 'Al massimo una cosa sua ogni'],
      ['50%', '15 minuti'],
      ['25%', '30 minuti'],
      ['10%', 'un\'ora e un quarto'],
      ['5%', 'due ore e mezza'],
      ['sotto il 3,3%', '3 ore'],
      ['0%', 'mai: parla solo se lo chiamano'],
    ] },
    { p: ['Il cursore si ferma a 50% di proposito. Oltre, la chat non sarebbe più la tua.'] },

    { p: [
      '<strong>Quando parla da solo.</strong> Con «Personalità proattiva» accesa e la chat autonoma sopra lo 0%, il bot guarda la chat ogni 15 secondi. Parla solo quando riconosce uno di questi momenti.',
    ] },
    { tabella: [
      ['Momento', 'Quando', 'Cosa fa'],
      ['Domanda rimasta sola', 'Qualcuno fa una domanda a tutti e per 75 secondi nessuno risponde. Vale solo se il bot sa la risposta. Dopo 4 minuti la lascia perdere.', 'Risponde, agganciato a quel messaggio.'],
      ['Chat esplosa', 'Almeno 8 messaggi di almeno 4 persone in mezzo minuto, tre volte il ritmo dei minuti prima.', 'Una riga sull\'onda. Al più ogni 15 minuti.'],
      ['Chat ferma', 'Solo in diretta. 4 minuti di silenzio dopo un momento vivo, cioè almeno 4 messaggi di 3 persone nei 15 minuti prima.', 'Una domanda leggera su quello di cui si parlava. Una volta per ogni silenzio.'],
      ['Discorso che scorre', 'Almeno 2 messaggi di 2 persone diverse negli ultimi 2 minuti, rivolti a tutti.', 'Una cosa sua, una delle tue battute oppure il promemoria dei social.'],
    ] },
    { p: [
      'Un messaggio è rivolto a tutti quando non è un comando, non contiene una @ e non risponde a qualcun altro. Il bot non si infila nei discorsi fra due persone.',
      'Ci sono dei freni che valgono sempre:',
    ] },
    { ul: [
      'Mai due volte in 6 minuti. Per rispondere a una domanda rimasta sola bastano 2 minuti.',
      'Se può scegliere, non fa due volte di fila la stessa cosa.',
      'Se hai scritto tu negli ultimi 45 secondi, la chat è tua e il bot aspetta.',
      'Una battuta al più ogni 20 minuti. Le battute le scrivi in «Giochi & classifiche», carta «Battute», dove c\'è anche l\'interruttore «Ogni tanto ne dice una da solo» (vedi il <a href="/manuale/giochi">manuale dei giochi</a>).',
      'Il promemoria dei social al più ogni 45 minuti, e solo in diretta.',
      'Con «Solo mentre sono in diretta» spuntato, a diretta spenta non dice niente di sua iniziativa.',
      'Le cose sue, le righe sull\'onda e i rilanci li scrive il modello. Con «Risposte intelligenti» spento, da solo dice solo le battute e il promemoria dei social.',
    ] },

    { p: [
      '<strong>Ricorda i tuoi social in chat.</strong> Il promemoria parte solo durante una diretta, quando la chat sta parlando, al più ogni 45 minuti. È una frase breve con l\'indirizzo della tua pagina link, socialbot.live/u/iltuonome. Conviene averla pronta nella scheda «Pagina link» (vedi il <a href="/manuale/vetrina">manuale della vetrina</a>).',
      'Non è un timer: se la chat tace, non parte. Fa parte degli interventi da solo, quindi servono anche «Personalità proattiva» accesa e la chat autonoma sopra lo 0%.',
      'Con la pagina link spenta, o mai creata, il promemoria non parte: manderebbe la chat su una pagina che non c\'è.',
    ] },

    { p: [
      '<strong>Cosa ha detto da solo.</strong> A metà della carta c\'è l\'elenco delle ultime volte che il bot ha parlato senza che nessuno lo chiamasse, con l\'ora, il motivo e il testo. Qui vedi se la dose è giusta senza stare in chat a guardare.',
      'I motivi sono «risposta a una domanda rimasta sola», «sull\'onda della chat», «rilancio a chat ferma», «una cosa sua», «battuta» e «promemoria dei link». Dai giochi arrivano anche «manche» e «boss arrivato da solo».',
      'L\'elenco tiene le ultime 30 righe da quando il bot è acceso. A ogni riavvio del bot ricomincia vuoto, e si aggiorna quando riapri la scheda. Se è vuoto leggi «Niente, finora: da quando è acceso non ha ancora parlato di sua iniziativa.».',
    ] },

    { p: [
      '<strong>Risposte intelligenti.</strong> Un modello che gira sul server, senza servizi a pagamento: scrive le risposte con parole sue, nel tono e nel carattere che hai scelto, e riconosce una domanda anche se è scritta diversamente da come l\'hai insegnata.',
      'Da spento il bot non fa conversazione. Risponde con le voci della «Conoscenza» che corrispondono bene al messaggio, con il testo che hai scritto tu. Comandi, moduli, giochi e moderazione funzionano uguale.',
    ] },

    { p: [
      '<strong>Accesso a internet.</strong> Se non sa una cosa, il bot può fare una ricerca veloce su fonti gratuite, DuckDuckGo e Wikipedia, invece di dire «non lo so». In chat lo fa solo quando qualcuno lo nomina con una domanda, e aspetta al massimo 3 secondi. Lo fa anche quando gli scrivi in privato.',
      'Tratta quello che trova come informazione, mai come istruzione. Una risposta nata da una ricerca il bot se la segna fra le cose che sa: la ritrovi in «Cosa sa il bot», nella scheda «Conoscenza», e da lì la togli se è sbagliata.',
    ] },

    { p: [
      '<strong>Le tue frasi.</strong> Una per riga, fino a 50 frasi da 200 caratteri: le frasi e i caratteri in più non vengono salvati. Non sono frasi da ripetere. Il bot le legge prima di rispondere come esempi di come scrivi, per suonare come te, e per questo servono «Risposte intelligenti» accese.',
      '<strong>Adatta la personalità al mio canale.</strong> Acceso, agli esempi delle tue frasi il bot aggiunge da solo le cose che dici in diretta, se usi l\'ascolto, e i tuoi messaggi in chat: così suona come te anche senza che tu scriva niente. Spento, usa solo le frasi che hai scritto tu. Il cambio vale dalla risposta dopo.',
      'Le battute da dire in chat sono un\'altra cosa e stanno in «Giochi & classifiche».',
    ] },

    { h3: 'Linee guida' },
    { p: [
      'Sono i limiti e le regole che dai al bot. Le salva e le rispetta sempre, in ogni chat: pubblica, privata e quando scrive per primo. Per esempio «non essere mai volgare», «non parlare di politica», «dai del tu a tutti».',
    ] },
    { ul: [
      '«Nuova linea guida»: scrivi la regola, da 3 a 300 caratteri.',
      'Il primo menù dice con chi vale: «con tutti», «solo con me», «con tutti tranne me».',
      'Il secondo menù dice dove: «ovunque», «in chat Twitch», «su Telegram», «in privato su Telegram».',
      '«Aggiungi», oppure Invio, la salva. Compare «Regola aggiunta ✓».',
      'Sotto c\'è l\'elenco, e accanto a ogni regola vedi con chi e dove vale. La ✕ la toglie subito, senza chiedere conferma.',
    ] },
    { p: [
      'Così puoi dire «con tutti tranne me non parlare di politica», oppure «solo con me, in privato su Telegram, dammi del tu».',
      'Le regole sono al massimo <strong>12</strong>, e ogni volta che risponde il bot le ha davanti tutte, quelle che valgono in quel posto e con quella persona. Con 12 regole il pannello non ne aggiunge un\'altra e lo dice: «Le regole sono già 12, e il bot le rispetta tutte: per aggiungerne una, togline prima una.». Niente sparisce da solo.',
      'Se scrivi di nuovo una regola che c\'è già, cambia solo con chi e dove vale.',
      'Una regola è una richiesta: vale se il bot la capisce. Per una parola che non deve uscire mai, usa «Parole da bloccare» nella scheda «Conoscenza».',
    ] },
    { p: [
      '<strong>Da Telegram.</strong> Puoi dettarle anche nella chat privata col tuo bot su Telegram, che colleghi nella scheda «Telegram» (piano Base, vedi il <a href="/manuale/vetrina">manuale della vetrina</a>). Funziona solo dal tuo account Telegram, non da quello di un moderatore. Scrivi a parole tue, per esempio «d\'ora in poi non essere troppo formale», oppure usa i comandi.',
    ] },
    { tabella: [
      ['Comando', 'Cosa fa'],
      ['<code>/regola testo</code>', 'Aggiunge una regola.'],
      ['<code>/regole</code>', 'Elenca le regole, ognuna con il suo numero.'],
      ['<code>/scorda n</code>', 'Toglie la regola con quel numero.'],
    ] },
    { p: [
      'Da Telegram il bot capisce da solo con chi e dove vale la regola, dalle parole che usi: «tranne me», «solo con me», «in privato», «in diretta». Ti risponde ripetendo la regola e dove vale. Se ha capito male, la togli con il <code>/scorda</code> che ti suggerisce. Con 12 regole ti risponde che ne ha già 12 e ti dice come toglierne una.',
      'Senza regole l\'elenco dice «Nessuna regola ancora. Aggiungine una qui sopra o da Telegram.». Se compare «Non disponibile ora.», il pannello non riesce a leggerle: ricarica la pagina.',
    ] },

    { h3: 'Chi risponde in chat pubblica' },
    { p: [
      'In chat risponde il bot del tuo canale, sempre con le scelte di questa scheda: il tono e il carattere, le tue frasi, le regole che valgono in chat. Quello che sa lo prende dalla scheda «Conoscenza» e dalla tua pagina link.',
      'In privato su Telegram le scelte sono le stesse, e valgono le regole che hai detto per quel posto: una regola «solo con me, in privato su Telegram» in chat non conta.',
    ] },

    // ------------------------------------------------------------ CONOSCENZA
    { h2: 'Conoscenza', scheda: 'conoscenza', p: [
      'Decide cosa sa il bot di te e come deve rispondere. Le carte sono sei, in quest\'ordine: «La tua scheda», «Insegnagli qualcosa», «Cosa sa il bot», «Il quaderno del bot», «Pre-addestramento» e «La piccola rete che impara».',
      'In alto ci sono «Apri tutto» e «Riduci tutto». Ogni carta si apre e si riduce anche cliccando il suo titolo.',
    ] },

    { h3: 'La tua scheda' },
    { p: [
      'Chi sei, con parole tue. Il bot ce l\'ha sempre davanti quando risponde, insieme alle domande e risposte. Lascia vuoto quello che non vuoi far dire.',
    ] },
    { tabella: [
      ['Campo', 'Fino a', 'A cosa serve'],
      ['«Chi sei»', '240 caratteri', 'Come ti presenteresti, in due righe.'],
      ['«Cosa fai in diretta»', '240 caratteri', 'Il contenuto delle tue dirette.'],
      ['«Quando sei in diretta»', '160 caratteri', 'Gli orari, come li diresti a voce.'],
      ['«Dove ti trovano»', '240 caratteri', 'Social e sito. Il bot lo ripete come l\'hai scritto, senza cambiare gli indirizzi. Se chiedono dei tuoi social e non c\'è una voce apposta, risponde con questo.'],
      ['«Come deve chiamarti»', '40 caratteri', 'Il nome con cui parla di te in chat.'],
      ['«Cosa non dire mai di te»', '240 caratteri', 'Una regola che vale sopra tutto il resto. È una richiesta: vale se il bot la capisce.'],
    ] },
    { p: [
      '<strong>Parole da bloccare.</strong> Un elenco a parte, una parola per riga: il cognome, la via, il nome della scuola. Non è una richiesta. Se una di queste parole finisce in una risposta, la risposta non parte.',
      'Il confronto non guarda maiuscole e accenti, e trova la parola anche attaccata ad altro testo. Puoi metterne fino a 40, da 2 a 60 caratteri. Non moderano nessuno: valgono solo su quello che dice il bot. Allo stesso modo il bot non dice mai le «Parole vietate» della scheda «Moderazione» (vedi il <a href="/manuale/moderazione">manuale della moderazione</a>).',
      '«Salva la scheda» salva i campi e le parole insieme. Compare «Scheda salvata: il bot sa chi sei».',
      'Il pre-addestramento riempie da solo «Chi sei», «Quando sei in diretta» e «Dove ti trovano» se sono vuoti. Non tocca mai quello che hai scritto tu.',
    ] },

    { h3: 'Insegnagli qualcosa' },
    { p: ['Una voce è una coppia domanda e risposta. Quando l\'argomento compare in chat, il bot sa cosa dire.'] },
    { ul: [
      '«Domanda / parole chiave»: la domanda come la farebbe uno spettatore, oppure alcune parole chiave separate da <code>/</code>. Fino a 300 caratteri.',
      '«Risposta»: quello che deve dire. Fino a 450 caratteri.',
      'Il menù dice quando vale: «vale sempre», «solo quando sei in diretta» (il codice sconto dello sponsor), «solo quando sei offline» (quando torni).',
      '«fissata» fa passare la voce davanti alle altre.',
      '«Aggiungi» la salva. Compare «Il bot ha imparato qualcosa di nuovo». Se manca la domanda o la risposta leggi «Compila domanda e risposta.».',
    ] },
    { esempio: 'Domanda     che pc usi? / setup / configurazione\nRisposta    Gioco su un Ryzen 7 con una 4070, trovi tutto sul sito!' },
    { p: [
      'Puoi scriverne fino a 500. Oltre, spariscono prima le più vecchie fra quelle non scritte da te. A ogni messaggio il bot usa le <strong>sei voci più vicine</strong> a quello che gli hanno chiesto, non le ultime che hai scritto.',
      'Le fissate entrano per prime, ma dentro quelle sei. Se ne fissi più di sei, entrano solo le sei più vicine alla domanda. Tienile per le cose che non deve mai ignorare.',
      'Quando una voce risponde proprio alla domanda, il bot la usa come risposta e la dice con parole sue. Se la risposta contiene un indirizzo, esce identica. Con «Risposte intelligenti» spento esce sempre come l\'hai scritta.',
    ] },

    { h3: 'Cosa sa il bot' },
    { p: ['L\'elenco di tutto quello che il bot sa, dalla voce più recente. Ogni voce mostra la domanda, la risposta, l\'origine, quando vale e la data.'] },
    { tabella: [
      ['Origine', 'Da dove viene', 'Come si cambia'],
      ['«tua»', 'Scritta da te in «Insegnagli qualcosa».', 'Dall\'elenco.'],
      ['«dal sito»', 'Letta dal tuo profilo su andryxify.it e dalla tua bio di Twitch, con il pre-addestramento.', 'Correggi il profilo e premi «Ri-leggi il mio profilo andryxify.it».'],
      ['«dalla tua pagina link»', 'Letta dalla tua pagina link: titolo e sottotitolo, testi, link, social, griglie, conti alla rovescia e FAQ. Fino a 24 voci.', 'Solo sulla pagina. Accanto alla voce leggi «si cambia sulla pagina».'],
    ] },
    { h3: 'La tua pagina link parla al bot' },
    { p: [
      'Le voci della pagina link non sono copie: il bot legge la pagina mentre risponde. Cambi la pagina e al più entro un minuto il bot sa la cosa nuova. Se spegni la pagina, smette di usarla.',
      'Ci sono anche voci che il bot aggiunge da solo: le risposte trovate con una ricerca online e quelle che ricava da quello che scrivi tu in chat. Si trattano come le altre. Se una è sbagliata, la togli con «Elimina».',
      'Per ogni voce, tranne quelle della pagina link, hai tre controlli:',
    ] },
    { ul: [
      'il menù accanto cambia quando vale: «sempre», «solo in diretta», «solo offline». Si salva appena scegli;',
      '«Fissa» e «Libera» mettono e tolgono la fissata;',
      '«Elimina» toglie la voce subito, senza conferma. Compare «Voce dimenticata.».',
    ] },
    { p: [
      'Il testo di una voce non si modifica: per correggerlo la elimini e la riscrivi. Se l\'elenco è vuoto leggi «Il bot non sa ancora niente: insegnagli qualcosa qui sopra!».',
    ] },

    { h3: 'Il quaderno del bot' },
    { p: [
      'Qui scrivi <strong>come deve rispondere</strong>, non cosa sa. Per esempio «quando chiedono del torneo, rimanda al Discord» o «se qualcuno è arrabbiato, rispondi corto». Il bot le applica senza citarle.',
    ] },
    { ul: [
      'Scrivi una frase intera, da 12 a 220 caratteri, e premi «Insegna». Compare «Insegnato.». Una frase più corta non passa: leggi «Scrivi una frase intera.».',
      'Nell\'elenco ogni riga dice da chi viene: «tua», «dal sito» o «insegnata dal cervello».',
      '«Togli» toglie una riga del tuo canale. Compare «Tolta dal quaderno.».',
      'Le righe con «vale ovunque» valgono per tutti i canali: le vedi, ma non si tolgono da qui.',
    ] },
    { p: [
      'Se l\'elenco è vuoto leggi «Niente ancora. Scrivigli qui sopra come vuoi che risponda.». Se dice «Il cervello non risponde adesso.», il quaderno non è raggiungibile in quel momento e non puoi aggiungere né togliere righe: riprova più tardi.',
    ] },

    { h3: 'Pre-addestramento' },
    { p: [
      'Il bot legge il tuo profilo su andryxify.it per conoscerti prima ancora di entrare in chat. La carta mostra «Ultima lettura:» con data e ora, e «voci di conoscenza:», cioè quante voci ha salvato in tutto. Le voci della pagina link non si contano. Sotto c\'è l\'esito dell\'ultima lettura: quante voci ha creato e cosa ha letto.',
      '«Ri-leggi il mio profilo andryxify.it» rilegge adesso. Mentre lavora il tasto dice «Sto leggendo il tuo profilo…». Alla fine leggi quante cose nuove ha trovato, per esempio «Fatto: 6 cose nuove sul tuo canale.», compare «Profilo riletto: conoscenza aggiornata e scheda riempita dove era vuota ✓» e la pagina si aggiorna.',
      'Se non trova niente da leggere lo dice: «Non ho trovato niente da leggere sul tuo profilo. Riprova fra poco, oppure scrivi tu le risposte qui sotto.», e non tocca la scheda.',
    ] },
    { ul: [
      'Cancella le voci «dal sito» e le rifà da capo, quindi non crea doppioni.',
      'Crea una voce per la tua bio, una per la programmazione, una per ogni social del profilo e una per la bio di Twitch.',
      'Riempie i campi vuoti della tua scheda: «Chi sei», «Quando sei in diretta», «Dove ti trovano».',
      'Se non hai un profilo pubblico, l\'esito lo dice e non inventa niente.',
    ] },
    { p: [
      'Parte anche da solo quando il canale viene attivato, quando concedi di nuovo i permessi di Twitch e, al più una volta a settimana, quando entri dal sito andryxify.it. Se non riesce compare «Pre-addestramento fallito:» con il motivo: riprova più tardi.',
    ] },

    { h3: 'La piccola rete che impara' },
    { p: [
      'Il motore veloce del bot: risponde subito a quello che ha già imparato e cresce da solo. La carta mostra cinque numeri, aggiornati ogni 5 secondi mentre la tieni aperta: «nodi appresi», «sa rispondere», «nella sua mente», «fiducia» e «curiosità». «nella sua mente» conta le voci che il bot si è costruito da solo. Su un canale nuovo partono da zero.',
      'Sotto, a volte, c\'è una riga in corsivo con quello a cui sta pensando, e una riga con quanti fatti conosce, quanti ne ha dedotti ragionando e quante incoerenze ha notato.',
      '«Ultime cose che non sapeva» elenca fino a quattro domande a cui non ha saputo rispondere. Se una riguarda te, insegnagliela in «Insegnagli qualcosa». Se non ce ne sono leggi «Nessuna lacuna recente: sta rispondendo bene.».',
    ] },
    { ul: [
      '«Studia ora» aggiorna subito quello che il bot sa di te, invece di aspettare il giro automatico. Cerca online le cose che non sapeva, se «Accesso a internet» è acceso, e rilegge quello che hai scritto. Il tasto risponde subito con un avviso: il lavoro continua in sottofondo e i risultati arrivano in «Cosa sa il bot» nei minuti dopo.',
      '«Scarica il dataset della sua mente» scarica un file con le coppie domanda e risposta che il bot ha imparato, insieme alle voci scritte da te, una per riga.',
    ] },
    { p: ['Se al posto dei numeri leggi «Non disponibile ora.», il pannello non riesce a leggerli: riprova più tardi.'] },

    // ------------------------------------------------------------ MEMORIA
    { h2: 'Memoria', scheda: 'memoria', p: [
      'Mostra cosa il bot si ricorda del canale e ti permette di azzerarlo. C\'è una carta sola, «La memoria del bot».',
    ] },

    { h3: 'La memoria del bot' },
    { p: ['La memoria non si carica da sola: premi «Mostra la memoria». Compare «Memoria caricata ✓» e sotto vedi due elenchi.'] },
    { tabella: [
      ['Elenco', 'Quanti', 'Cosa c\'è'],
      ['«Lezioni imparate»', 'le ultime 50', 'Quello che nota del canale: quando la chat è più viva, le emote del momento, chi scrive di più. Ne scrive una nuova solo quando ci sono almeno 50 messaggi in 6 ore.'],
      ['«Fatti sul canale»', 'tutti', 'Cose stabili: «Chi scrive di più» negli ultimi 7 giorni, «Emote preferite», «La chat in settimana» e «Gioco recente».'],
    ] },
    { p: [
      'Il bot si ricorda anche qualcosa delle persone che scrivono spesso, e di cosa si parla adesso in diretta. Queste cose non si sfogliano dal pannello.',
      'Accanto a ogni lezione e a ogni fatto c\'è «Togli»: toglie solo quello, subito, e compare «Dimenticato ✓». Lo possono fare anche i moderatori del pannello. Se non c\'è ancora niente leggi «Nessuna lezione ancora: il bot impara osservando la chat.» e «Nessun fatto ricordato.».',
    ] },
    { p: [
      '<strong>Azzera ciò che ha imparato.</strong> Butta via tutto in un colpo, e per questo lo vede solo il proprietario del canale. Il tasto rosso sotto «Zona pericolosa.» chiede conferma: «Azzero la memoria del bot?», poi «Azzera la memoria». Non si torna indietro. Alla fine compare «Memoria azzerata. Il bot riparte da zero (ma la tua conoscenza resta).».',
    ] },
    { tabella: [
      ['Sparisce', 'Resta'],
      ['Le lezioni, i fatti sul canale, i ricordi sulle persone, il contesto della diretta e le voci di conoscenza con origine «dalla chat».', 'La tua scheda, le tue voci, quelle «dal sito» e della pagina link, quelle che il bot ha aggiunto da solo, il quaderno, le linee guida, le impostazioni, i moduli, i comandi, le monete e le classifiche.'],
    ] },
    { p: [
      'Le voci che il bot ha aggiunto da solo restano: se una è sbagliata, toglila da «Cosa sa il bot».',
      'Dopo l\'azzeramento «Ultima lettura», nella carta «Pre-addestramento», resta senza data. Premi «Ri-leggi il mio profilo andryxify.it» se vuoi che si aggiorni subito.',
    ] },
  ],
  faq: [
    { d: 'Il bot parla troppo in chat. Cosa abbasso?', r: 'Prima di tutto «Chat autonoma», nella scheda «Personalità»: decide sia quanto risponde a chi non lo chiama sia ogni quanto dice una cosa sua. In «Cosa ha detto da solo» vedi cosa ha detto e perché. Se vuoi che di sua iniziativa parli solo mentre sei live, spunta «Solo mentre sono in diretta».' },
    { d: 'Lo nomino e non risponde.', r: 'Controlla che il bot sia acceso nella scheda «Stato» e che «Rispondi quando mi nominano in chat» sia spuntato. Conta come chiamata la parola «bot» o il nome del canale. La stessa persona lo può richiamare dopo 10 secondi. Con «Risposte intelligenti» spento risponde solo se una voce della «Conoscenza» corrisponde alla domanda.' },
    { d: 'Il promemoria dei social non parte mai.', r: 'Parte solo in diretta, quando la chat sta parlando, al più ogni 45 minuti. Servono «Ricorda i tuoi social in chat, nei momenti giusti» spuntato, «Personalità proattiva» accesa, «Chat autonoma» sopra lo 0% e la pagina link accesa.' },
    { d: 'Ha detto una cosa sbagliata su di me. Dove la correggo?', r: 'Cercala in «Cosa sa il bot», nella scheda «Conoscenza». Se è «tua» o l\'ha aggiunta lui, premi «Elimina» e riscrivila giusta. Se è «dal sito», correggi il profilo su andryxify.it e premi «Ri-leggi il mio profilo andryxify.it». Se è «dalla tua pagina link», cambiala sulla pagina. Se sta in «La tua scheda», correggi il campo e premi «Salva la scheda».' },
    { d: 'Come faccio a essere sicuro che non dica il mio cognome?', r: 'Scrivilo in «Parole da bloccare», nella carta «La tua scheda». Una risposta che lo contiene non parte, anche con maiuscole o accenti diversi. «Cosa non dire mai di te» è una richiesta, le parole bloccate sono un blocco.' },
    { d: 'Ho scritto una linea guida e non la rispetta.', r: 'Controlla con chi e dove vale: una regola «su Telegram» in chat non conta. Una regola è una richiesta, e vale se il bot la capisce: scrivila corta e chiara. Per una parola che non deve uscire mai usa «Parole da bloccare».' },
    { d: 'Un moderatore può cambiare la personalità o azzerare la memoria?', r: 'Può cambiare tutto in «Personalità» e «Conoscenza», e togliere un ricordo sbagliato in «Memoria». Azzerare tutta la memoria no: lo può fare solo il proprietario del canale. Le linee guida dettate da Telegram arrivano solo dal tuo account.' },
    { d: 'Se spengo «Risposte intelligenti» il bot smette di funzionare?', r: 'No. Comandi, moduli, giochi e moderazione restano uguali. Il bot risponde con le voci della «Conoscenza» che corrispondono bene alla domanda, con il testo che hai scritto tu, e non fa conversazione. Da solo dice solo le battute e il promemoria dei social.' },
    { d: 'Le chat finiscono a un servizio esterno?', r: 'Le risposte le scrive un modello che gira sul server, senza servizi a pagamento di terzi. Con «Accesso a internet» acceso, quando il bot cerca un dubbio la domanda va a DuckDuckGo o Wikipedia. Se non vuoi, spegni «Accesso a internet».' },
    { d: 'Perché «Azzera ciò che ha imparato» non cancella le voci «dal sito»?', r: 'Perché le hai scritte tu sul tuo profilo: non sono conclusioni del bot. Si cambiano sul profilo, poi premi «Ri-leggi il mio profilo andryxify.it».' },
  ],
};
