// Manuale: Manuale dei giochi e delle monete. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.
import { DI_SERIE, RESA, CIFRA, ATTESE, ATTESA, righeRegole, righePesca, presenzaOraria, MANCHE_TIPI } from '../numeri.js';

// Le attese di un gioco dentro le tabelle: «nessuna» al posto del trattino.
const ATT = (id) => { const t = ATTESE(id); return t === '\u2014' ? 'nessuna' : t; };

export default {
  slug: 'giochi',
  schede: ['giochi'],
  titolo: 'Manuale dei giochi e delle monete | SocialBot',
  h1: 'Manuale dei giochi e delle monete',
  desc: 'Le monete della chat, ogni carta della scheda Giochi & classifiche, i comandi di gioco con costi e premi veri, le manche e i giochi da creare.',
  aggiornata: '2026-09-27',
  corpo: [
    { p: [
      'La chat ha una <strong>moneta</strong>: si guadagna guardando e scrivendo, si spende nei giochi. Il nome lo scegli tu, di base sono «monete».',
      'Tutto si regola da «Chat e pubblico», voce «Giochi», nella scheda «Giochi & classifiche». Qui trovi prima ogni carta della scheda, poi i comandi in chat, come funziona ogni gioco e le manche.',
    ] },

    { h2: 'Giochi & classifiche', scheda: 'giochi', p: [
      'Minigiochi, monete e classifiche per la chat. Giochi, monete, classifiche e premio in VIP sono nel piano Essenziale, quello gratuito.',
      'La scheda la usano il proprietario del canale e i moderatori del pannello. Solo il proprietario vede la riga per aggiustare le monete a mano e il rimando per portare qui i punti da un altro bot.',
      'Ogni carta ha il suo tasto per salvare. Se cambi qualcosa e il tasto non è in vista, in basso compare la barra «Hai modifiche non salvate»: da lì salvi o annulli.',
    ] },

    { h3: 'Minigiochi' },
    { p: [
      'È l\'interruttore generale. La spunta «Attiva i minigiochi in chat» è accesa di base.',
      'Da spenta, i comandi dei giochi e dei giveaway non rispondono, le monete per messaggio, presenza e partecipazione non arrivano, le manche e il boss non partono e un giveaway non si apre. Monete, classifiche e regole restano salvate.',
      'In «Come si chiamano le monete» scrivi il nome della moneta, fino a 20 caratteri. Il bot lo usa in tutti i messaggi dei giochi. Premi «Salva».',
      'Il link «Manuale dei giochi e delle monete» apre questa pagina.',
    ] },

    { h3: 'Comandi dei giochi' },
    { p: [
      'L\'elenco dei comandi che rispondono in chat, raggruppati per famiglia: «Giochi in chat», «Giochi con la webcam», «Puzzle con le mani», «Sorteggi» e «Giochi del sito». Quello che vedi qui è quello che risponde, con i nomi che hai scelto tu.',
      'Ogni riga mostra il nome del gioco, cosa fa, i comandi che lo chiamano e le sue attese, «a testa» o «per tutti»: sono quelle che hai scelto nelle regole di quel gioco. L\'etichetta «costa monete» segna i comandi che fanno spendere monete.',
    ] },
    { tabella: [
      ['Controllo', 'Cosa fa'],
      ['Interruttore', 'Spegne il comando: non risponde più e sparisce da <code>!giochi</code>. Monete, classifiche e regole restano. <code>!giochi</code> e <code>!nococcole</code> sono sempre accesi: al posto dell\'interruttore hanno un punto.'],
      ['«nome tuo»', 'Il nome con cui lo chiami tu, fino a 20 caratteri fra lettere senza accenti e cifre. Con un nome tuo <strong>i nomi di serie smettono di rispondere</strong>, alias compresi. <code>!join</code> mostra «non si rinomina»: la parola d\'ingresso del giveaway si sceglie quando lo apri.'],
      ['«chi può»', '«tutti», «abbonati», «VIP» o «moderatori». Chi non ci arriva riceve una risposta che glielo dice, per esempio «!slot qui è riservato ai VIP.». Vale a salire: «abbonati» fa entrare anche VIP e moderatori, «VIP» anche i moderatori.'],
    ] },
    { p: [
      'Un comando che di serie è dei moderatori, come <code>!boss</code> o <code>!estrai</code>, resta dei moderatori: puoi solo restringere un comando, mai aprirlo a più persone.',
      'Premi «Salva i comandi». Due comandi non possono avere lo stesso nome: il pannello rifiuta e ti dice quale nome è già preso.',
      'Una famiglia spenta zittisce tutti i suoi comandi, anche quelli accesi. La sua riga lo scrive: «famiglia spenta: questi comandi non rispondono». «Giochi in chat» e «Sorteggi» si accendono con «Attiva i minigiochi in chat», i giochi con la webcam e il puzzle nella scheda «Effetti & suoni», i giochi del sito nella carta «Giochi del sito andryxify.it» più sotto.',
      'Lo stesso elenco, insieme a tutti gli altri comandi pronti del bot, sta anche nella scheda «Comandi».',
    ] },

    { h3: 'Le regole di ogni gioco' },
    { p: [
      'Costi, premi, attese, probabilità e testi, gioco per gioco. Ogni gioco è una riga che si apre con un clic: dentro trovi i numeri, le scelte e gli elenchi di frasi.',
      'Accanto al nome vedi quanto rende il gioco con i valori che hai scelto, e cambia mentre li muovi. La scritta diventa rossa quando un gioco a puntata comincia a creare monete, cioè ne restituisce più di 100 ogni 100 giocate, o quando la pesca o il boss automatico rendono più della presenza.',
      `Di serie nessun gioco a puntata crea monete: contro il banco il banco vince un po', la morra è alla pari. Un gioco gratis non rende più della presenza: in un'ora di presenza e partecipazione si prendono ${CIFRA(presenzaOraria({}))} monete, e la pesca al ritmo massimo ne dà ${CIFRA(RESA('pesca').perOra)}.`,
      'Ogni gioco ha due attese. <strong>A testa</strong>: dopo che una persona ha giocato, aspetta lei. <strong>Per tutti</strong>: dopo che qualcuno ha giocato, aspetta tutto il canale. Zero vuol dire nessuna attesa. L\'attesa parte quando si gioca davvero: un comando scritto male non la consuma. Chi la trova se lo sente dire una volta, con quanto manca, poi il bot tace fino alla fine. Per <code>!colpisci</code> tace sempre, perché si scrive a raffica.',
      'Negli elenchi va una frase per riga. Sotto ogni elenco il pannello scrive quali segnaposto puoi usare, per esempio <code>{a}</code> e <code>{b}</code>. Una riga con un segnaposto che quel gioco non conosce non si salva: dopo il salvataggio sparisce. Nella tabella della pesca ogni riga è <code>nome | monete | rarità</code>. La rarità è un peso da 1 a 1000: 30 esce il doppio di 15.',
      'Un numero fuori dai limiti viene portato al limite più vicino. Un elenco che resterebbe vuoto non si salva: resta quello di prima. Lo stesso per «Nel giro delle manche automatiche»: se togli tutti i tipi, resta la scelta di prima.',
      'Premi «Salva le regole». I valori nuovi valgono dalla giocata successiva, non da quella in corso.',
      'Tutte le impostazioni, con il valore di base e i limiti:',
    ] },
    { tabella: righeRegole() },

    { h3: 'Punti & classifica' },
    { p: ['Qui decidi quante monete si guadagnano. Ci sono tre entrate, e si sommano.'] },
    { tabella: [
      ['Entrata', 'A chi', 'Quando', 'Di base'],
      ['Messaggio', 'a chi scrive', 'al massimo una volta ogni 60 secondi a testa', '2 monete'],
      ['Presenza', 'a chi è in chat, anche in silenzio', 'ogni giro di cinque minuti, solo in diretta', '5 monete'],
      ['Partecipazione', 'in più, a chi ha scritto in quel giro', 'ogni giro di cinque minuti, solo in diretta', '5 monete'],
    ] },
    { p: ['Presenza, partecipazione, moltiplicatori e le due quote del silenzio stanno sotto «Guadagno mentre guardano».'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Punti per messaggio»', '2', '0–1000', 'Monete a chi scrive. A 0 questa entrata si spegne.'],
      ['«…ogni quanti secondi»', '60', '5–3600', 'Ogni quanto una persona può riprendere le monete per messaggio.'],
      ['«Quanti in classifica»', '5', '3–10', 'Quante righe mostra <code>!classifica</code>.'],
      ['«Presenza (per giro)»', '5', '0–10.000', 'Monete a ogni giro a chi è in chat.'],
      ['«Partecipazione (in più)»', '5', '0–10.000', 'In più, a chi ha scritto in quel giro.'],
      ['«Moltiplicatore abbonati»', '1,5', '1–10', 'Moltiplica presenza e partecipazione di un abbonato.'],
      ['«Moltiplicatore VIP»', '1,25', '1–10', 'Moltiplica presenza e partecipazione di un VIP.'],
      ['«Quanto cala per giro in silenzio»', '0,15', '0–1', 'Quanta presenza perde a ogni giro chi resta zitto.'],
      ['«Non scende sotto»', '0,35', '0–1', 'La quota minima della presenza di chi resta zitto.'],
    ] },
    { p: [
      'Premi «Salva punti».',
      `I moltiplicatori si leggono dai distintivi dei messaggi: chi non ha mai scritto non li ha. Chi è abbonato e VIP prende quello degli abbonati. Con i valori di base, presenza e partecipazione danno 10 monete ogni cinque minuti a chi guarda e scrive (${CIFRA(presenzaOraria({}))} all'ora), 15 a un abbonato, 13 a un VIP.`,
      'Chi resta in silenzio continua a guadagnare, ma <strong>gradualmente meno</strong>: un gradino a ogni giro senza scrivere, fino alla quota minima. Chi torna a scrivere <strong>risale subito a quota piena</strong>. Con i valori di base:',
    ] },
    { tabella: [
      ['Giri in silenzio', '0', '1', '2', '3', '4', '5 e oltre'],
      ['Monete di presenza', '5', '4', '4', '3', '2', '2'],
    ] },
    { p: [
      'La lista di chi è in chat la dà Twitch a ogni giro: serve il permesso «ore guardate», che vedi nella scheda «Stato».',
    ] },

    { h3: 'Presenze e saluti' },
    { p: [
      'Chi resta in chat almeno dieci minuti è <strong>presente</strong> a quella diretta, anche in silenzio. Presente anche alla diretta dopo, la sua <strong>serie</strong> sale a due. Chi ne salta una riparte da uno, e il record resta.',
      'A ogni diretta contata arriva un bonus: <strong>bonus × serie</strong>, fino al tetto. Con i valori di base sono 10 monete alla prima diretta, 30 alla terza di fila, 100 dalla decima in poi.',
      'Una diretta è una sessione: se il bot o Twitch cadono e tornano entro mezz\'ora, è ancora la stessa. Ognuno vede la sua serie con <code>!serie</code>, e la classifica con <code>!classificaserie</code>, che in fondo dice anche a che punto è chi l\'ha chiesta.',
    ] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Conta le presenze e le serie»', 'acceso', 'acceso o spento', 'Spento: niente serie, niente bonus, niente saluti, e <code>!serie</code> non risponde.'],
      ['«Bonus per diretta di fila»', '10', '0–100.000', 'Il bonus base, moltiplicato per la serie.'],
      ['«Il bonus smette di crescere a»', '10', '1–365', 'Oltre questa serie il bonus resta fermo.'],
      ['«Ai traguardi il bot lo dice in chat»', 'acceso', 'acceso o spento', 'A 3, 5, 10, 25, 50 e 100 dirette di fila il bot lo annuncia, al massimo una volta al minuto.'],
    ] },
    { p: ['Sotto «Il bot che ti riconosce» ci sono i saluti. Al primo messaggio di una persona nuova, e a chi torna dopo un po\', il bot scrive una frase.'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Saluta chi arriva e chi torna»', 'acceso', 'acceso o spento', 'Accende i saluti. Funziona solo con «Conta le presenze e le serie» acceso.'],
      ['«Alla prima volta»', '«Ciao {user}, è la tua prima volta qui: fai come a casa tua.»', 'fino a 200 caratteri', 'Il saluto a chi scrive per la prima volta. Vuoto: nessun saluto.'],
      ['«A chi torna»', '«Ehi {user}, sono passati {giorni} giorni: che bello rivederti.»', 'fino a 200 caratteri', 'Il saluto a chi torna dopo un\'assenza. Vuoto: nessun saluto.'],
      ['«Dopo quanti giorni di assenza»', '21', '2–365', 'Dopo quanti giorni senza farsi vedere una persona «torna».'],
      ['«Solo mentre sei in diretta»', 'acceso', 'acceso o spento', 'Spento: il bot saluta anche a canale spento.'],
    ] },
    { p: [
      'Nei testi puoi usare <code>{user}</code>, <code>{giorni}</code>, <code>{serie}</code> e <code>{dirette}</code>.',
      'Su Twitch la prima volta la segnala Twitch stesso. Se il primo messaggio di una persona è un comando, il saluto non parte. Il bot non saluta a raffica: al massimo un saluto ogni 45 secondi e sei ogni dieci minuti, così un raid non diventa una pioggia di benvenuti.',
      'Se ti sei costruito un Modulo sul primo messaggio, vince il tuo e il bot non dice il saluto della prima volta.',
      'Premi «Salva presenze e saluti».',
    ] },

    { h3: 'Manche automatiche' },
    { p: ['Il bot lancia da solo, ogni tanto, una manche: una domanda aperta a tutta la chat, e il primo che risponde giusto vince il premio della manche. I tipi sono spiegati più sotto, in «Le manche».'] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['«Attiva le manche automatiche»', 'spento', 'acceso o spento', 'Accende le manche a sorpresa.'],
      ['«Ogni almeno (minuti)»', '15', '1–360', 'Il tempo minimo fra due manche.'],
      ['«…al massimo (minuti)»', '45', '1–360', 'Il tempo massimo. Se lo metti sotto il minimo, vale il minimo.'],
      ['«Solo mentre sono in diretta»', 'spento', 'acceso o spento', 'Acceso: a canale spento non parte nessuna manche.'],
    ] },
    { p: [
      'Fra una manche e l\'altra il bot sceglie un tempo a caso fra il minimo e il massimo. Non ne lancia mai una con la chat ferma, cioè con meno di un messaggio al minuto.',
      'Quali tipi girano lo scegli nelle regole della «Manche», alla voce «Nel giro delle manche automatiche». Lì c\'è anche il premio.',
      'In chat <code>!manche</code> ne lancia una al volo. Premi «Salva manche».',
    ] },

    { h3: 'I tuoi giochi' },
    { p: [
      'Qui crei un gioco tuo. Prima scegli <strong>chi lo lancia</strong>, con uno dei due tasti: «Ci pensa il bot» o «Lo scrive uno spettatore».',
      '<strong>«Ci pensa il bot»</strong> fa una manche con il tuo materiale. Scegli il tipo nel menù a tendina, dai un nome nel campo «Nome del gioco» (fino a 60 caratteri) e riempi il riquadro che compare.',
    ] },
    { tabella: [
      ['Tipo nel menù', 'Cosa scrivi', 'Limiti'],
      ['«Quiz (domande & risposte)»', 'Nel riquadro delle domande, una per riga: <code>domanda | risposta1, risposta2</code>.', 'fino a 200 domande, 10 risposte ciascuna'],
      ['«Parola veloce (reflex)»', 'Nel riquadro delle parole, una per riga.', 'fino a 300 parole'],
      ['«Anagramma (lettere mescolate)»', 'Parole di almeno quattro lettere, una per riga.', 'fino a 300 parole'],
      ['«Sequenza di simboli»', 'I simboli, separati da uno spazio, e «Quanti simboli per sequenza».', 'da 3 a 24 simboli; sequenze da 3 a 8, di base 4'],
      ['«Domanda tua (una sola)»', '«La domanda», le risposte accettate separate da virgola e i «Secondi per rispondere».', 'domanda fino a 240 caratteri, 10 risposte, da 10 a 300 secondi, di base 45'],
      ['«Rebus con le emoji»', 'Un rebus per riga: <code>emoji | risposta1, risposta2</code>.', 'fino a 200 rebus'],
      ['«Impiccato (parole da scoprire)»', 'Parole sole, senza spazi, fra 4 e 20 lettere.', 'fino a 300 parole'],
      ['«Wordle (parole di cinque lettere)»', 'Parole di cinque lettere, senza spazi.', 'fino a 300 parole'],
    ] },
    { p: [
      'Premi «Crea gioco»: il pannello scrive «Gioco creato!». Puoi avere fino a 50 giochi così. Se manca il materiale, o per anagramma, impiccato e wordle non c\'è nemmeno una parola della misura giusta, il gioco non si crea e il pannello dice cosa manca.',
      'Il gioco nuovo entra nelle manche del suo tipo: parte a sorpresa se le manche automatiche sono accese e quel tipo è nel giro, e con <code>!manche</code> seguito dal tipo ne apri una quando vuoi. Come il tuo materiale si mescola con quello di serie è spiegato più sotto, in «Le manche».',
      '<strong>«Lo scrive uno spettatore»</strong> fa un comando che costa monete, tira il dado e paga, o no. In «Da cosa parti» scegli una delle sei ricette, o «Parti da zero». Si apre l\'editor dei Moduli dentro questa scheda: inneschi, condizioni e azioni sono quelli del <a href="/manuale/moduli">manuale dei comandi</a>.',
    ] },
    { tabella: [
      ['Ricetta', 'Cosa fa', 'Cosa cambi di solito'],
      ['Macchinetta a monete', 'Costa una cifra fissa, e una volta su N paga. Parte col nome <code>!slot</code>.', 'costo, premio, probabilità'],
      ['Scommessa', 'Punti quanto vuoi tu: <code>!scommetti 100</code>. Se va bene raddoppi.', 'probabilità e vincita'],
      ['Furto', 'Ruba qualche moneta a qualcuno a caso. Se va male, torni a mani vuote. Parte col nome <code>!furto</code>.', 'quanto si ruba, la probabilità'],
      ['Regala monete', 'Passa monete a qualcun altro. Parte col nome <code>!regala</code>.', 'il testo'],
      ['Quante monete ho', 'Risponde con il saldo e la posizione. Parte col nome <code>!monete</code>.', 'il testo'],
      ['Dai monete (mod)', 'Un moderatore accredita monete a mano, davanti a tutta la chat: <code>!dai</code>.', 'chi può usarlo'],
    ] },
    { p: [
      'Quattro ricette partono col nome di un gioco di serie. Un comando tuo con lo stesso nome vince sempre su quello pronto: se vuoi tenerli tutti e due, cambia il nome nell\'editor.',
      'Le due cose che fanno un gioco stanno nelle condizioni: il <strong>costo</strong>, fisso o quello scritto da chi gioca con <code>$arg1</code>, e la <strong>probabilità</strong>, con il ramo <strong>«altrimenti»</strong> per quando va male.',
      'Il link «parole magiche dei giochi» apre le variabili utili a un gioco: le monete, il caso, i numeri, chi scrive. Con <code>$mossa</code> (quante monete si sono mosse davvero) e <code>$bersaglio</code> (su chi) il messaggio dice la verità anche quando a qualcuno restano meno monete di quelle in palio.',
      'Sotto, in «I giochi che hai fatto», ci sono tutti e due i tipi. Le manche hanno l\'etichetta «a sorpresa» e i tasti «Pausa», poi «Riattiva», ed «Elimina»: una manche in pausa porta l\'etichetta «in pausa» e non esce finché non la riattivi. I comandi hanno l\'etichetta «su comando» e il tasto «Modifica». Una manche non si modifica: la elimini e la rifai. «Elimina» chiede conferma, e non si torna indietro.',
    ] },

    { h3: 'Classifica & VIP' },
    { p: [
      'Il premio in VIP. Sono <strong>due gare</strong> indipendenti: «Chi ti segue sempre», cioè chi ha più monete nella classifica del pubblico, e «Chi mette i Bit», cioè la classifica dei Bit di Twitch. Puoi accenderne una, l\'altra o tutt\'e due.',
      'Se in cima alla carta vedi «Per assegnare i VIP serve un permesso in più», premi «Concedi i permessi»: senza, il bot non può dare il VIP.',
    ] },
    { tabella: [
      ['Controllo', 'Di base', 'Limiti', 'Cosa fa'],
      ['Interruttore della gara', 'spento', 'acceso o spento', 'Accende la gara.'],
      ['«Si premia ogni»', 'settimana per le monete, mese per i Bit', 'settimana o mese', 'Il premio si assegna sette o trenta giorni dopo il precedente.'],
      ['Posizioni', 'monete: una da 3 dirette; Bit: re 4, principe 2, cavaliere 1', 'da 1 a 5', '«Aggiungi una posizione» ne aggiunge una, «Togli» la toglie.'],
      ['Nome della posizione («come lo chiami»)', 'vuoto per le monete', 'fino a 24 caratteri', 'La parola che esce in chat. Vuoto: «1° posto», «2° posto».'],
      ['«VIP per» … «dirette»', 'vedi le posizioni', '1–60', 'Quante dirette dura il VIP di quella posizione.'],
      ['«Salta chi ha già il VIP per sempre (il premio scorre al successivo)»', 'acceso', 'acceso o spento', 'Chi ha già il VIP per sempre non viene premiato: il posto va al successivo.'],
      ['«Quando il re torna a scrivere» (solo Bit)', '«{user} è il re dei Bit, con {bit} Bit. Bentornato.»', 'fino a 200 caratteri', 'La frase per il primo dei Bit quando torna a scrivere. Segnaposto <code>{user}</code>, <code>{bit}</code> e <code>{titolo}</code>. Vuoto: il bot non dice niente.'],
    ] },
    { p: [
      'Premi «Salva premio». Il bot controlla ogni ora se è passato il periodo, e allora dà il VIP ai primi della gara.',
      '<strong>Dirette, non giorni.</strong> Il conto scende quando una diretta <em>finisce</em>: se salti una settimana, il premio ti aspetta. Se il bot è giù proprio alla fine di una diretta, quel giro non si conta e il premio dura una sera in più.',
      'Né il tuo staff né tu entrate fra i candidati: Twitch non dà il VIP a un moderatore, quindi il posto scorre a chi può riceverlo. Chi vince il primo posto dei Bit porta una corona accanto al nome nella chat a schermo fino al premio dopo. Se Twitch non risponde con la classifica dei Bit, il premio non salta: il bot riprova più tardi.',
      'Il VIP si dà anche a voce («vip a nome», scheda «Comandi vocali») o in chat con <code>!vip @nome</code>: quelli durano un tempo, di base una settimana, non delle dirette.',
      'Solo il proprietario vede la riga per aggiustare le monete. Scrivi il «nome utente» e quante monete, col meno per toglierle («es. 100 o -50»), poi premi «Aggiusta» seguito dal nome della moneta. Il pannello mostra il saldo nuovo. Il saldo non scende mai sotto zero, e ogni volta si muovono al massimo un milione di monete. Serve a riparare un errore senza farlo vedere in chat; la ricetta «Dai monete (mod)» invece la vedono tutti.',
      'Se manca il nome o il numero, il pannello scrive «Scrivi il nome e quante monete (con il meno per toglierle).». Il nome va scritto come su Twitch, da 2 a 30 caratteri fra lettere, cifre e trattino basso.',
      'Sotto, il proprietario trova anche il rimando per chi arriva da un altro bot: i punti che il tuo pubblico ha là si portano qui dalla scheda «Comandi», carta «Porta qui quello che hai già». Il tasto «Vai a Moduli» ti porta lì. I punti si sommano alle monete una volta sola: importare di nuovo lo stesso elenco non li raddoppia. Come si fa è spiegato nel <a href="/manuale/moduli">manuale dei comandi</a>.',
      'Le classifiche delle monete stanno nella scheda «Statistiche»: ci arrivi con «Vedi le classifiche».',
      'In fondo, «VIP a tempo attivi» elenca i VIP dati dal bot: per quelli del premio vedi quante dirette restano, per gli altri fino a quando durano, o «per sempre».',
    ] },

    { h3: 'Giochi del sito andryxify.it' },
    { p: [
      'I giochi di andryxify.it, come AGENTify, girano anche nella tua chat: gli spettatori scrivono <code>!ag</code> (o <code>!agentify</code>) seguito dal comando del gioco, e il bot risponde. Non c\'è niente da installare.',
      'Il collegamento si attiva da solo quando entri nel pannello passando da andryxify.it. Finché non è attivo vedi «non ancora collegato» e la spunta è bloccata. Da collegato vedi «✓ collegato al sito».',
      'Accendi «Fai giocare la chat ai giochi del sito» e premi «Salva».',
    ] },

    { h3: 'Citazioni' },
    { p: [
      'Le frasi memorabili della chat, numerate. Scrivi la frase nel campo (fino a 400 caratteri) e premi «Aggiungi»: il pannello ti dice il numero che ha preso.',
      'Nell\'elenco ogni citazione ha il numero, il testo e il tasto «Rimuovi». Quelle importate con autore e data li mostrano accanto al testo.',
    ] },
    { tabella: [
      ['In chat', 'Chi', 'Cosa fa'],
      ['<code>!cita</code>', 'tutti', 'Una citazione a caso.'],
      ['<code>!cita 12</code>', 'tutti', 'La citazione numero 12.'],
      ['<code>!cita aggiungi testo</code>', 'mod e streamer', 'Salva una citazione nuova.'],
      ['<code>!cita rimuovi 12</code>', 'mod e streamer', 'Toglie la numero 12.'],
    ] },
    { p: ['Per portarle da x.la apri «Importa citazioni (da x.la)». x.la disegna le frasi con JavaScript, e copiare la pagina alla cieca prende solo il guscio vuoto. Ci sono due modi che funzionano.'] },
    { passi: [
      { t: 'Bottone magico. ', d: 'Trascina «Prendi le quote da x.la» nella barra dei preferiti del browser, o premi «copia il codice» e incollalo come indirizzo di un preferito. Apri la tua pagina x.la, aspetta che compaiano le frasi scorrendo fino in fondo, e clicca il preferito: copia tutto da solo. Torna qui e incolla nel riquadro.' },
      { t: 'A mano. ', d: 'Sulla pagina x.la già caricata seleziona le frasi col mouse e incollale nel riquadro. Il pannello riconosce nome utente e data, nel formato frase, a capo, <code>autore | data</code>.' },
    ] },
    { p: [
      'Premi «Riconosci e importa»: il pannello dice quante citazioni ha importato, quante con autore e quante con data, e salta i doppioni. Se incolli il guscio di x.la al posto delle frasi, lo riconosce e ti spiega cosa fare.',
      'Per altri siti incolla il link nel campo «…oppure incolla un link (per altre fonti)» e premi «Estrai dal link». Le frasi trovate finiscono nel riquadro: controllale, poi importale.',
    ] },

    { h3: 'Battute' },
    { p: [
      'Le battute che funzionano nel tuo canale. Scrivi la battuta (fino a 300 caratteri) e premi «Aggiungi». Una battuta già presente, o più corta di tre caratteri, non entra.',
      'Il bot le dice con <code>!battuta</code>, e <code>!battuta 3</code> dice la numero 3. Con «Ogni tanto ne dice una da solo» acceso le dice anche di sua iniziativa. Serve la chat autonoma accesa nella scheda «Personalità» (vedi il <a href="/manuale/bot">manuale del bot</a>): senza, la spunta è bloccata e il pannello lo spiega.',
      'Esce sempre la battuta meno detta di recente, e quelle che fanno ridere escono più spesso: dopo ogni battuta il bot conta quante persone ridono davvero in chat. Nell\'elenco vedi «risate» (risate su volte detta), «mai detta» per quelle nuove, «inventata» per quelle che il bot si è inventato con l\'IA, e il tasto «Rimuovi».',
      'In chat <code>!battuta aggiungi testo</code> e <code>!battuta togli 3</code> li usano mod e streamer.',
    ] },

    { h2: 'I comandi dei giochi in chat' },
    { p: [
      'Funzionano appena i minigiochi sono accesi, senza configurare niente. <code>!giochi</code> risponde a chi lo chiede con i giochi accesi che <strong>lui</strong> può usare, coi nomi che hai scelto tu: un gioco riservato ai moderatori non compare a chi non lo è.',
      'L\'elenco è diviso per come si gioca: «Da solo», «Contro qualcuno», «Tutti insieme», «Coccole», «Le tue monete» (col nome della tua moneta) e «Con la webcam». Accanto a ogni gioco c\'è cosa scrivere dopo il nome, per esempio <code>!duello @nome posta</code>, e in fondo come chiedere le regole di un gioco.',
      'Con <code>!giochi</code> e il nome di un gioco, per esempio <code>!giochi slot</code>, il bot spiega come si gioca, coi nomi e i numeri del tuo canale: per esempio quanto costa una giocata della slot o quanti secondi ha la chat per battere il boss. Funziona anche con una mossa: <code>!giochi carta</code> spiega il blackjack. Se il gioco è riservato a qualcuno lo aggiunge, e se è spento o non esiste lo dice e rimanda a <code>!giochi</code>.',
      'Le risposte a chi chiede qualcosa, come l\'elenco, il saldo, la classifica o quanto aspettare, su Twitch e Kick si agganciano al suo messaggio. Su YouTube cominciano col suo nome.',
    ] },
    { tabella: [
      ['Comando', 'Anche', 'Cosa fa', 'Attesa'],
      ['<code>!giochi</code>', 'nessuno', 'Elenca i giochi accesi che può usare chi lo chiede. <code>!giochi slot</code> spiega quel gioco.', 'nessuna'],
      ['<code>!dado</code>', '<code>!roll</code>', 'Tira un dado. <code>!dado 2d20</code> per tirarne altri.', ATT('dado')],
      ['<code>!moneta</code>', '<code>!coin</code>', 'Testa o croce.', ATT('moneta')],
      ['<code>!8ball</code>', '<code>!palla8</code>', 'Risponde a una domanda. Serve la domanda.', ATT('8ball')],
      ['<code>!monete</code>', '<code>!punti</code> <code>!bilancio</code>', 'Quante ne hai.', 'nessuna'],
      ['<code>!classifica</code>', '<code>!top</code>', 'I primi del pubblico, e dove sei tu.', 'nessuna'],
      ['<code>!classifica mod</code>', '<code>!classificamod</code> <code>!classificastaff</code> <code>!topmod</code>', 'I primi dello staff.', 'nessuna'],
      ['<code>!slot</code>', 'nessuno', 'Macchinetta: paghi, giri, forse vinci.', ATT('slot')],
      ['<code>!duello @nome</code>', '<code>!duel</code>', 'Sfida chi è in chat. Vince uno dei due.', ATT('duello')],
      ['<code>!trivia</code>', '<code>!quiz</code>', 'Apre una domanda per tutti.', ATT('manche')],
      ['<code>!manche</code>', '<code>!gioca</code>', 'Apre una manche a caso fra quelle del giro. <code>!manche impiccato</code> per sceglierla.', ATT('manche')],
      ['<code>!pesca</code>', '<code>!fish</code>', 'Cala la canna. Può uscire di tutto.', ATT('pesca')],
      ['<code>!roulette</code>', '<code>!rul</code>', 'Punti su rosso, nero, verde o un numero.', ATT('roulette')],
      ['<code>!furto @nome</code>', '<code>!rapina</code>', 'Provi a rubare. Se ti beccano, paghi.', ATT('furto')],
      ['<code>!conta</code>', '<code>!count</code>', 'Apre la conta: la chat scrive 1, 2, 3, un numero a testa e mai due di fila.', ATT('conta')],
      ['<code>!catena</code>', '<code>!parole</code>', 'Apre la catena di parole: ogni parola comincia con le ultime due lettere della precedente.', ATT('catena')],
      ['<code>!colpo</code>', '<code>!heist</code>', 'Organizzi un colpo, o entri nella banda. <code>!colpo 100</code> per scegliere la posta.', ATT('colpo')],
      ['<code>!boss</code>', 'nessuno', 'Fa arrivare un boss da battere insieme. Solo mod e streamer.', 'nessuna'],
      ['<code>!colpisci</code>', '<code>!attacca</code> <code>!hit</code>', 'Colpisci il boss di turno.', ATT('boss')],
      ['<code>!blackjack 50</code>', '<code>!bj</code> <code>!21</code>', 'Una mano contro il banco: due carte a te e due a lui, una coperta.', ATT('blackjack')],
      ['<code>!carta</code>', 'nessuno', 'Un\'altra carta nella tua mano di blackjack.', 'nessuna'],
      ['<code>!stai</code>', '<code>!stand</code>', 'Ti fermi: gioca il banco, e si vede chi vince.', 'nessuna'],
      ['<code>!corsa 2 50</code>', '<code>!race</code>', 'Punti su un corridore, col numero o col nome. <code>!corsa</code> da solo apre le puntate.', ATT('corsa')],
      ['<code>!patata</code>', '<code>!potato</code>', 'Lanci la patata bollente: ce l\'hai in mano tu.', ATT('patata')],
      ['<code>!passa @nome</code>', '<code>!pass</code>', 'Passi la patata a chi è in chat. Senza nome va a qualcuno a caso.', 'nessuna'],
      ['<code>!regala @nome 50</code>', '<code>!dona</code>', 'Passi monete a qualcun altro.', 'nessuna'],
      ['<code>!duello @nome 50</code>', 'nessuno', 'Un duello con la posta: l\'altro accetta o rifiuta, e chi vince prende la posta dell\'altro.', `${ATTESA(DI_SERIE('duello').scadenza)} per rispondere`],
      ['<code>!accetta</code>', 'nessuno', 'Accetti la sfida con posta che ti hanno fatto.', 'nessuna'],
      ['<code>!rifiuta</code>', 'nessuno', 'Dici di no, e nessuno perde niente.', 'nessuna'],
      ['<code>!morra carta</code>', '<code>!rps</code>', 'Sasso, carta o forbice contro il bot. <code>!morra carta 20</code> per giocarci delle monete.', ATT('morra')],
      ['<code>!sblocca</code>', 'nessuno', `Spendi monete per mettere la chat in solo emote per ${DI_SERIE('sblocca').minuti} minuti. <code>!sblocca 5</code> per cinque.`, ATT('sblocca')],
      ['<code>!abbraccio @nome</code>', '<code>!abbraccia</code> <code>!hug</code>', 'Abbracci chi è in chat. Senza nome, tutta la chat.', ATT('abbraccio')],
      ['<code>!bacio @nome</code>', '<code>!bacino</code> <code>!kiss</code>', 'Un bacino a chi è in chat. Senza nome, a tutta la chat.', ATT('bacio')],
      ['<code>!cinque @nome</code>', '<code>!highfive</code> <code>!hi5</code>', 'Alzi la mano per qualcuno, o per chiunque senza nome. Chi risponde con <code>!cinque</code> la batte.', ATT('cinque')],
      ['<code>!nococcole</code>', 'nessuno', 'Niente abbracci, bacini e cinque verso di te. Riscrivilo per tornare.', 'nessuna'],
      ['<code>!serie</code>', '<code>!presenze</code> <code>!streak</code>', 'A quante dirette di fila sei stato presente, e a quante in tutto. Con un nome, di quella persona.', 'nessuna'],
      ['<code>!classificaserie</code>', '<code>!serietop</code> <code>!topserie</code>', 'Chi è venuto a più dirette di fila.', 'nessuna'],
    ] },
    { h3: 'Webcam, puzzle, giveaway e giochi del sito' },
    { p: ['Stanno nella stessa carta «Comandi dei giochi», ognuno nella sua famiglia.'] },
    { tabella: [
      ['Comando', 'Anche', 'Chi', 'Cosa fa'],
      ['<code>!mima</code>', '<code>!mimo</code>', 'mod e streamer', 'Avvia il gioco della mimica nell\'overlay della webcam.'],
      ['<code>!nonridere</code>', '<code>!nonrido</code>', 'mod e streamer', 'Avvia la sfida «non ridere» nell\'overlay della webcam.'],
      ['<code>!reaction</code>', '<code>!reactionrush</code> <code>!rush</code>', 'mod e streamer', 'Avvia la prova di reazione nell\'overlay della webcam.'],
      ['<code>!battaglia</code>', '<code>!battle</code>', 'mod e streamer', 'Avvia la battaglia: la chat ti sfida con i gesti.'],
      ['<code>!sfida</code>', 'nessuno', 'tutti', 'Durante la battaglia manda un gesto da imitare.'],
      ['<code>!puzzle</code>', 'nessuno', 'mod e streamer', 'Avvia il puzzle nell\'overlay della webcam.'],
      ['<code>!puzzlestop</code>', 'nessuno', 'mod e streamer', 'Ferma il puzzle in corso.'],
      ['<code>!giveaway</code> <code>!join</code> <code>!biglietti</code> <code>!estrai</code>', 'vedi il manuale', 'vedi il manuale', 'I comandi del giveaway.'],
      ['<code>!ag</code>', '<code>!agentify</code>', 'tutti', 'Manda il comando ai giochi di andryxify.it.'],
    ] },
    { p: [
      'I giochi con la webcam vogliono il tracking: nella scheda «Effetti & suoni», carta «Effetti dai gesti (webcam)», accendi «Attiva il tracking webcam» e «Minigiochi con la webcam (gesti ed espressioni)». Il puzzle vuole anche «Puzzle con le mani (pizzica e trascina)». Il tracking è spiegato nel <a href="/manuale/effetti">manuale di Effetti & suoni</a>.',
      'I comandi del giveaway sono spiegati nel <a href="/manuale/interazione">manuale di sondaggi, giveaway e penitenze</a>.',
    ] },

    { h2: 'Come funziona ogni gioco' },
    { h3: 'Slot' },
    { p: [`Paghi il costo (${CIFRA(DI_SERIE('slot').costo)} di base) e girano tre simboli. I tris si scalano tutti dal tris di 💎 (${CIFRA(DI_SERIE('slot').jackpot)} di base):`] },
    { tabella: [
      ['Esito', 'Vinci', 'Con i valori di base'],
      ['Tris di 💎', 'il tris pieno', CIFRA(DI_SERIE('slot').jackpot)],
      ['Tris di 7️⃣', 'tre quarti', CIFRA(Math.round(DI_SERIE('slot').jackpot * 0.75))],
      ['Qualsiasi altro tris', 'due quinti', CIFRA(Math.round(DI_SERIE('slot').jackpot * 0.4))],
      ['Due uguali', 'la coppia', CIFRA(DI_SERIE('slot').coppia)],
      ['Niente', 'niente', 'perdi il costo'],
    ] },
    { p: [`Su 100 monete giocate, di serie, ne tornano in media ${CIFRA(RESA('slot').perCento)}: il banco vince un po', come deve. Se non hai abbastanza monete il bot te lo dice e non ti fa giocare.`] },

    { h3: 'Roulette' },
    { p: [
      'Si scrive <code>!roulette 50 rosso</code> o <code>!roulette 50 17</code>. Vanno bene anche <em>nero</em>, <em>verde</em> e i nomi inglesi.',
      `È una roulette europea: 37 caselle, lo zero è verde. Su rosso, nero o un numero tornano in media ${CIFRA(RESA('roulette').perCento)} monete ogni 100 puntate. Il verde paga tanto ma esce una volta su 37: è la puntata che rende meno.`,
    ] },
    { tabella: [
      ['Punti su', 'Se esce', 'Ti torna'],
      ['Un numero (0–36)', 'quel numero', '36 volte la puntata'],
      ['Rosso o nero', 'quel colore', '2 volte la puntata'],
      ['Verde', 'lo zero', '14 volte la puntata'],
    ] },

    { h3: 'Pesca' },
    { p: [`Una volta ogni ${ATTESA(DI_SERIE('pesca').attesaTesta)} a testa. Non è a caso puro: ogni preda ha il suo peso, e più vale meno esce. In media un lancio vale ${CIFRA(RESA('pesca').media)} monete, cioè fino a ${CIFRA(RESA('pesca').perOra)} in un'ora: quanto la presenza, non di più. Cosa si pesca lo scrivi tu, nelle regole della pesca.`] },
    { tabella: righePesca() },

    { h3: 'Duello' },
    { p: [
      'Si sfida <strong>solo chi è in chat</strong>: chi ha scritto negli ultimi trenta minuti o risulta fra chi sta guardando. Un nome inventato non si può sfidare.',
      `Vince uno dei due a testa o croce. Di serie il duello senza posta si gioca per l'onore e non dà monete: un premio che nasce dal nulla a ogni sfida gonfierebbe l'economia. Se vuoi, glielo dai nelle regole del duello. Un duello alla volta per canale, uno ogni ${ATTESA(DI_SERIE('duello').attesaTutti)}.`,
    ] },

    { h3: 'Duello con la posta' },
    { p: [
      `Con <code>!duello @nome 50</code> la sfida vale delle monete: l'altro ha ${ATTESA(DI_SERIE('duello').scadenza)} per scrivere <code>!accetta</code> o <code>!rifiuta</code>. Se accetta, chi vince prende la posta dell'altro: le monete passano di tasca, non se ne creano.`,
      'Le monete non si mettono da parte mentre si aspetta: si controlla chi le ha nel momento in cui l\'altro accetta. Se il bot si riavvia nel mezzo la sfida salta, e nessuno perde niente. Una sfida alla volta a testa.',
    ] },

    { h3: 'Morra cinese' },
    { p: [
      `<code>!morra sasso</code>, <code>carta</code> o <code>forbice</code> contro il bot. Senza puntata è solo per ridere. Con la puntata (<code>!morra carta 20</code>) se vinci ti torna ${CIFRA(DI_SERIE('morra').vincita / 100)} volte la puntata, se fai pari ti torna la puntata, se perdi la perdi. Di serie su 100 monete giocate ne tornano in media ${CIFRA(RESA('morra').perCento)}: è una sfida alla pari. Nelle regole decidi quanto paga la vittoria.`,
    ] },

    { h3: 'Conta insieme' },
    { p: [
      'Con <code>!conta</code> la chat conta insieme: 1, poi 2, poi 3, un numero a messaggio e mai due di fila la stessa persona. Chi scrive il numero sbagliato, o conta due volte di fila, fa ricominciare tutti da uno. Mentre si conta giusto il bot tace: il gioco è la chat.',
      `Non si vincono monete: si batte il record del canale, che resta anche quando il bot si riavvia, e quando lo si supera il bot lo dice. Ogni ${DI_SERIE('conta').traguardo} numeri applaude, e se per ${ATTESA(DI_SERIE('conta').pausa)} nessuno conta la conta si chiude da sola.`,
    ] },

    { h3: 'La catena di parole' },
    { p: [
      'Con <code>!catena</code> il bot dice una parola, e la chat continua: ogni parola comincia con le ultime due lettere della precedente, casa, sasso, sole, leone. Conta solo un messaggio fatto di una parola che comincia con le due lettere giuste: il resto è chiacchiera e non tocca niente. Gli accenti non contano.',
      `La catena si rompe se una parola era già stata detta o se la stessa persona ne scrive due di fila: il bot dice perché e riparte da una parola nuova. Si batte il record del canale, che resta anche quando il bot si riavvia. Ogni ${DI_SERIE('catena').traguardo} parole il bot applaude, e se per ${ATTESA(DI_SERIE('catena').pausa)} nessuno trova la parola la catena si chiude. Le parole da cui si parte le scegli tu, nelle regole.`,
      'Manche, conta e catena leggono tutte la chat, quindi ne gira una alla volta: finché una è aperta, le altre aspettano, e il bot lo dice.',
    ] },

    { h3: 'Colpo di gruppo' },
    { p: [
      `Chi scrive <code>!colpo</code> organizza un colpo con ${CIFRA(DI_SERIE('colpo').posta)} monete di posta, o quante ne scrive (<code>!colpo 100</code>). Per ${ATTESA(DI_SERIE('colpo').raccolta)} chiunque può entrare nella banda allo stesso modo. Gli ingressi il bot li dice insieme, una riga ogni tanto, non uno per uno.`,
      `Si parte se la banda è di almeno ${DI_SERIE('colpo').minimo} persone. Da soli si scappa ${DI_SERIE('colpo').riuscita} volte su 100, e ogni persona in più ne aggiunge ${DI_SERIE('colpo').perPersona}, fino a ${DI_SERIE('colpo').riuscitaMax}. Ognuno tira per sé: chi scappa riprende la posta e ${DI_SERIE('colpo').vincita - 100} su 100 in più, chi è preso la perde. Con la banda più grande, su 100 monete di posta ne tornano in media ${CIFRA(RESA('colpo').perCento)}.`,
      'Le monete si muovono solo alla fine: entrare non toglie niente, e chi alla partenza non ha più la sua posta resta fuori senza perdere niente. Se il bot si riavvia nel mezzo il colpo salta, e nessuno ci rimette.',
    ] },

    { h3: 'Il boss da battere insieme' },
    { p: [
      `Un boss arriva quando un mod scrive <code>!boss</code>, con un raid di almeno ${DI_SERIE('boss').dopoRaid} persone, e se vuoi da solo ogni tanto mentre sei in diretta, con la chat viva. Ha ${DI_SERIE('boss').vitaPerPersona} punti vita per ogni persona che ha scritto in chat negli ultimi dieci minuti, contando almeno ${DI_SERIE('boss').minimo} persone: chi guarda in silenzio non conta, così il boss è alla portata di chi c'è davvero.`,
      `La chat lo colpisce con <code>!colpisci</code>, un colpo ogni ${ATTESA(DI_SERIE('boss').attesaTesta)} a testa, da ${DI_SERIE('boss').dannoMin} a ${DI_SERIE('boss').dannoMax} di danno. Ha ${ATTESA(DI_SERIE('boss').durata)} prima di scappare. Se cade, il bottino va a chi l'ha colpito in proporzione al danno: se tutti colpiscono uguale ognuno prende ${CIFRA(DI_SERIE('boss').bottino)}, e chi colpisce di più prende di più, fino a ${CIFRA(RESA('boss').massimo)} a testa. Se scappa non prende niente nessuno, e nessuno perde niente.`,
      'Il bot non risponde a ogni colpo: poco dopo il primo, e poi al massimo ogni venti secondi, scrive chi ha colpito e quanto, la vita che resta e i secondi che mancano. Quando il boss arriva a metà vita e a un quarto lo dice subito.',
      'Nell\'overlay, con gli effetti accesi, compare la carta del boss: nome, vita che scende a ogni colpo, tempo che resta, chi colpisce e quanto. È un elemento dello Studio: la sposti, la ingrandisci e la vesti lì, e la spegni per overlay. Nelle regole scegli anche una festa: se il boss cade, la chat va in solo emote per qualche minuto e poi torna com\'era.',
    ] },

    { h3: 'Blackjack' },
    { p: [
      `Con <code>!bj 50</code> punti 50 monete: due carte a te e due al banco, di cui una coperta. Poi <code>!carta</code> per un'altra o <code>!stai</code> per fermarti. Arrivato a 21 stai da solo, e se per ${ATTESA(DI_SERIE('blackjack').tempo)} non scrivi niente, stai lo stesso. Il banco gioca dopo di te e sta su ogni 17. Una mano alla volta a testa.`,
      `Vince chi va più vicino a 21 senza passarlo: la vittoria ti rende il doppio della puntata, il pari te la rende, e il blackjack servito (asso e una figura o un dieci) ne rende ${CIFRA(DI_SERIE('blackjack').vincitaBJ / 100)} volte, cioè 3 a 2. Se il banco ha blackjack lo dice subito, e la mano finisce lì.`,
      'Alla fine il bot dice il conto per intero: quanto ti torna, cosa c\'è dentro e quante monete hai adesso. Per esempio «Ti tornano 100 monete: la puntata più 50. Ora ne hai 420.», oppure «Ti torna la puntata.», oppure «La puntata va al banco.».',
      `Di serie, giocando al meglio, su 100 monete puntate ne tornano in media ${CIFRA(RESA('blackjack').perCento)}: il banco vince un po', come al tavolo vero, e chi gioca a caso perde di più. Nelle regole scegli quanto paga il blackjack, la puntata massima e il tempo per decidere.`,
      'La puntata esce appena si aprono le carte. Se il bot si riavvia con una mano aperta, la puntata torna a chi l\'aveva messa, e quando il bot rientra in chat glielo dice con quante monete gli ha reso.',
    ] },

    { h3: 'La corsa' },
    { p: [
      `Con <code>!corsa</code> si aprono le puntate per ${ATTESA(DI_SERIE('corsa').raccolta)}: il bot scrive i corridori, dal favorito al più lento, ognuno con quanto paga. Si punta con <code>!corsa 2 50</code> (il secondo corridore, 50 monete) o col nome, <code>!corsa lepre 50</code>; senza cifra la puntata è di ${CIFRA(DI_SERIE('corsa').posta)}. Una puntata a testa. Poi si parte, e qualche secondo dopo il bot dice il podio e chi ha vinto quanto.`,
      `Il favorito vince spesso e paga poco, l'ultimo vince di rado e paga tanto, e le quote sono fatte perché ogni corridore renda uguale: di serie, su 100 monete puntate ne tornano in media ${CIFRA(RESA('corsa').perCento)}, qualunque corridore si scelga. Nelle regole scegli quanto rende, i nomi dei corridori (da 2 a 8) e la puntata massima.`,
      'Le monete si muovono solo all\'arrivo, e fra la partenza e l\'arrivo il bot non dice come va. Se il bot si riavvia nel mezzo la corsa salta, e nessuno perde niente.',
    ] },

    { h3: 'La patata bollente' },
    { p: [
      `Con <code>!patata</code> la lanci, e ce l'hai in mano tu. Chi ce l'ha la passa con <code>!passa @nome</code>, o con <code>!passa</code> e va a qualcuno a caso fra chi è in chat. Scoppia dopo un tempo che nessuno conosce, di serie fra ${ATTESA(DI_SERIE('patata').miccia)} e ${ATTESA(DI_SERIE('patata').micciaMax)}, deciso quando la lanci: passarla non lo cambia.`,
      'Si passa solo a una persona in chat: non a te, non a chi non c\'è, non a un bot, che non potrebbe ripassarla. Di serie non costa niente a nessuno. Se vuoi, nelle regole metti una multa: chi resta con la patata ne dà tante a chi gliel\'ha passata, ma solo se aveva già giocato, cioè l\'aveva lanciata o passata. Chi la riceve senza averla mai toccata si brucia e basta.',
    ] },

    { h3: 'Abbracci, bacini e il cinque perfetto' },
    { p: [
      'Non costano e non fanno vincere niente: servono a stare insieme. Si abbraccia e si bacia solo chi è in chat adesso, e chi scrive <code>!nococcole</code> non ne riceve più finché non lo riscrive.',
      `Il cinque vuole due persone. <code>!cinque @nome</code> alza la mano per qualcuno, <code>!cinque</code> da solo per chiunque; chi risponde con <code>!cinque</code> la batte. Ogni tanto, a sorpresa, viene un <strong>cinque perfetto</strong> (di serie ${DI_SERIE('cinque').perfetti} volte su 100). Se nessuno risponde in ${ATTESA(DI_SERIE('cinque').scadenza)} la mano resta a mezz'aria.`,
      'Nelle regole cambi quanto spesso viene perfetto, i tempi e tutte le frasi.',
    ] },

    { h3: 'Furto' },
    { p: [
      `Una prova ogni ${ATTESA(DI_SERIE('furto').attesaTesta)} a testa, e solo su chi ha almeno 20 monete. Va a buon fine <strong>${DI_SERIE('furto').riuscita} volte su 100</strong>: prendi fra 10 e ${CIFRA(DI_SERIE('furto').bottino)} monete, mai più di quante ne ha la vittima.`,
      `Se ti beccano paghi una multa fino a ${CIFRA(DI_SERIE('furto').multa)} monete, <strong>alla vittima</strong>: il furto passa monete di tasca, non ne crea.`,
    ] },

    { h3: 'Sbloccare la chat' },
    { p: [
      `Con <code>!sblocca</code> chi ha le monete mette la chat in solo emote per ${DI_SERIE('sblocca').minuti} minuti, o per quanti ne scrive (<code>!sblocca 5</code>, fino a ${DI_SERIE('sblocca').massimo}). Costa ${CIFRA(DI_SERIE('sblocca').costoMinuto)} monete al minuto, e dopo uno sblocco il canale aspetta ${ATTESA(DI_SERIE('sblocca').attesaTutti)} prima del prossimo. Nelle regole scegli cosa si sblocca (solo emote o messaggi unici), il costo e i tempi.`,
      'Si paga solo se la chat cambia davvero: se la modalità è già accesa da un mod non costa niente, e se Twitch dice di no le monete restano tue. Alla fine la chat torna com\'era da sola, anche se nel frattempo il bot si riavvia. Le monete spese così escono dall\'economia invece di girare.',
    ] },

    { h2: 'Le manche' },
    { p: [
      `Una manche è una domanda aperta a tutta la chat: chi risponde giusto per primo prende il premio della manche (${CIFRA(DI_SERIE('manche').premio)} di base). Partono da sole con le manche automatiche, o a mano con <code>!manche</code>, che ne apre una a caso fra quelle del giro.`,
      'Per sceglierne una scrivi anche il tipo: <code>!manche impiccato</code>, <code>!manche più o meno</code>, <code>!manche quiz</code>. Spazi e accenti non contano, quindi va bene anche <code>!manche piuomeno</code>. Se il tipo non esiste, il bot li elenca. <code>!trivia</code> apre sempre un Quiz.',
      `I tipi sono ${MANCHE_TIPI.length}. Nelle regole della «Manche» scegli quali stanno nel giro di quelle automatiche, e il bot pesca un tipo che riesca a costruire:`,
    ] },
    { tabella: [
      ['Tipo', 'Come funziona', 'Tempo', 'Materiale tuo'],
      ['Quiz', 'Una domanda, si risponde in chat.', '45s', 'le tue domande'],
      ['Reflex', 'Il primo che scrive la parola vince.', '30s', 'le tue parole'],
      ['Numero', 'Il bot ha pensato un numero da 1 a 50: indovinatelo.', '40s', 'nessuno'],
      ['Anagramma', 'Lettere mescolate da rimettere a posto.', '45s', 'le tue parole'],
      ['Sequenza', 'Una sequenza di simboli da ricopiare esatta.', '30s', 'i tuoi simboli'],
      ['Domanda tua', 'Domanda e risposte scritte da te.', 'da 10s a 5 min', 'domanda e risposte'],
      ['Calcolo veloce', 'Un conto da fare di corsa, nuovo ogni volta: 7 × 8 + 3.', '30s', 'nessuno'],
      ['Rebus', 'Emoji da leggere: 🕷️🧑 è Spiderman. Film, giochi e cartoni di serie.', '45s', 'i tuoi rebus'],
      ['Più o meno', 'Un numero da 1 a 100. Chi scrive un numero stringe l\'intervallo per tutti, e il bot lo dice ogni pochi secondi.', '90s', 'nessuno'],
      ['Impiccato', 'Una parola da scoprire una lettera alla volta, o tutta insieme. Sei lettere sbagliate e vince l\'impiccato.', '2 min', 'le tue parole'],
      ['Wordle', 'Una parola di cinque lettere. Ogni parola di cinque lettere scritta in chat è un tentativo, e il bot risponde coi quadratini: 🟩 al posto giusto, 🟨 c\'è ma altrove, ⬛ non c\'è. Venti tentativi per tutta la chat.', '3 min', 'le tue parole'],
    ] },
    { p: [
      'Nel più o meno, nell\'impiccato e nel wordle il bot non risponde a ogni messaggio: raccoglie i tentativi e dice come sta la partita al massimo ogni quattro secondi.',
      'Il materiale tuo lo aggiungi nella carta «I tuoi giochi». Nel Quiz e nel Rebus si mescola con quello di serie: quando ce n\'è di tuo, il bot lo pesca circa due volte su tre. Nel Reflex, nell\'Anagramma, nell\'Impiccato e nel Wordle le tue parole prendono il posto di quelle di serie. La Sequenza usa i tuoi simboli e la tua lunghezza. La Domanda tua esce solo se ne hai creata una.',
      'Un gioco messo in pausa non esce finché non lo riattivi.',
    ] },

    { h2: 'Le modalità della chat a tempo' },
    { p: [
      'Twitch ha le modalità della chat ma non il tempo: si accendono e restano lì finché qualcuno si ricorda di spegnerle. Qui si accendono <strong>per un tempo</strong>, e si spengono da sole. Funzionano sui canali Twitch.',
      'I mod le accendono in chat. Senza durata sono due minuti, con una durata è quella, da 10 secondi a un\'ora: <code>5m</code>, <code>90s</code>, <code>10</code> (minuti), <code>1h</code>. Con <code>off</code> finiscono subito.',
    ] },
    { tabella: [
      ['Comando', 'Cosa fa'],
      ['<code>!soloemote</code>', 'Solo emote. <code>!soloemote 5m</code> per cinque minuti.'],
      ['<code>!messaggiunici</code>', 'Nessuno può ripetere un messaggio già scritto.'],
      ['<code>!soloabbonati</code>', 'Scrivono solo gli abbonati.'],
    ] },
    { p: [
      'Le stesse modalità le accende un Modulo, con l\'azione «Modalità della chat a tempo»: un premio a punti canale, un evento come un hype train o un raid, un comando tuo come <code>!festa $arg1</code>. La chat ci arriva da sola con <code>!sblocca</code>, pagando in monete.',
      'Se la modalità era già accesa da un mod, il bot non la tocca e alla fine non la spegne; con <code>off</code> ti dice che si spegne dalle impostazioni della chat di Twitch. Se la accendi di nuovo mentre corre, dura fino alla fine più lontana delle due. La fine resta segnata anche se il bot si riavvia.',
      'Chat lenta e soli follower non ci sono: le usa lo scudo, e uno sblocco per gioco non deve riaprirle in mezzo a un raid.',
      'I tre comandi stanno nella scheda «Comandi», nella famiglia «Modalità della chat a tempo»: lì li spegni, li rinomini o li riservi.',
    ] },

    { h2: 'Le classifiche' },
    { p: [
      'Sono <strong>due</strong>, separate: <code>!classifica</code> è quella del pubblico, <code>!classifica mod</code> quella dello staff. Senza la divisione i moderatori, che stanno in chat tutto il giorno, occuperebbero i primi posti. <code>!classifica tutti</code> le mostra insieme.',
      'In fondo alla classifica il bot dice dove sei tu: il tuo posto, o quante monete hai se sei fuori dai primi.',
      'Chi è staff lo dice Twitch: se promuovi qualcuno, le sue monete passano nella classifica giusta. Nel pannello le classifiche stanno nella scheda «Statistiche», spiegata nel <a href="/manuale/diretta">manuale della diretta</a>.',
      'Se la classifica dello staff è vuota e il pannello chiede un permesso in più, concedilo: finché manca, i moderatori restano nella classifica del pubblico.',
    ] },

    { h2: 'Quando qualcosa non va' },
    { ul: [
      '<strong>Le monete non salgono.</strong> Controlla «Attiva i minigiochi in chat». Presenza e partecipazione arrivano solo in diretta e vogliono il permesso «ore guardate»: se nella scheda «Stato» è rosso, premi «Aggiorna i permessi».',
      '<strong>Un comando non risponde.</strong> Guarda la sua riga in «Comandi dei giochi»: può essere spento o la sua famiglia può essere spenta. Se hai un comando tuo con lo stesso nome nella scheda «Comandi», risponde il tuo.',
      '<strong>Il bot risponde «qui è riservato…».</strong> Quel comando ha un livello in «chi può»: abbassalo a «tutti», se il comando di serie lo permette.',
      '<strong>Il bot risponde «non è in chat».</strong> Duello, patata, abbracci, bacini e cinque valgono solo su chi è in chat adesso: un nome inventato non passa.',
      '<strong>Ho cambiato un premio e non cambia niente.</strong> Controlla di aver premuto «Salva le regole». I valori nuovi valgono dalla giocata successiva, non da quella in corso.',
      '<strong>Una frase delle regole è sparita dopo il salvataggio.</strong> Aveva un segnaposto che quel gioco non conosce. Usa quelli scritti sotto l\'elenco.',
      '<strong>Il premio in VIP non arriva.</strong> Serve il permesso VIP: se la carta «Classifica & VIP» lo chiede, premi «Concedi i permessi». Staff, proprietario e chi ha già il VIP per sempre vengono saltati.',
      '<strong>Una manche non parte mai.</strong> Controlla che le manche automatiche siano accese, che il tipo sia nel giro e che la chat scriva almeno un messaggio al minuto. Con «Solo mentre sono in diretta» acceso, a canale spento non ne parte nessuna.',
    ] },
  ],
  faq: [
    { d: 'Posso spegnere solo un gioco?', r: 'Sì: nella carta «Comandi dei giochi» ogni riga ha il suo interruttore. Da lì lo puoi anche rinominare o riservare ad abbonati, VIP o moderatori. Premi «Salva i comandi».' },
    { d: 'Come tolgo monete a qualcuno?', r: 'Nella carta «Classifica & VIP» scrivi il nome e un numero col meno, per esempio -50, e premi «Aggiusta». Lo può fare solo il proprietario del canale, e in chat non si vede.' },
    { d: 'Come si chiama la moneta?', r: 'Come vuoi tu: fino a venti caratteri, in «Come si chiamano le monete» nella carta «Minigiochi». Il bot usa quel nome ovunque, anche nei messaggi dei giochi pronti.' },
    { d: 'Un gioco regala troppe monete. Cosa faccio?', r: 'Apri il gioco in «Le regole di ogni gioco»: se la scritta accanto al nome è rossa, crea monete. Abbassa il premio o alza il costo finché torna normale, poi premi «Salva le regole».' },
    { d: 'Perché il bot dice che devo aspettare?', r: 'Ogni gioco ha un\'attesa a testa e una per tutti. Le cambi nelle regole di quel gioco: zero vuol dire nessuna attesa.' },
    { d: 'Gli spettatori non sanno a cosa giocare.', r: 'Diglielo con <code>!giochi</code>: il bot risponde a ognuno con i giochi che può usare e cosa scrivere. Con <code>!giochi</code> e il nome di un gioco spiega le regole del tuo canale.' },
    { d: 'Posso portare qui i punti che il pubblico ha su un altro bot?', r: 'Sì, dalla scheda «Comandi», carta «Porta qui quello che hai già»: i punti diventano monete e si sommano a quelle che ognuno ha già, una volta sola. Lo fa solo il proprietario del canale.' },
    { d: 'I moderatori del pannello possono cambiare i giochi?', r: 'Sì, tutta la scheda. Solo la riga per aggiustare le monete a mano, e l\'importazione dei punti, restano al proprietario.' },
  ],
};
