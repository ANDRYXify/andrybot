// I manuali: cosa fa cosa, e come.
//
// Le guide servono a chi non ha ancora il bot; questi servono a chi ce l'ha e
// sta configurando. Sono materiale di consultazione: tabelle, numeri veri,
// nessuna presentazione. Vivono come contenuto pubblico — stessa forma delle
// guide, stesso guscio — perche' chi valuta il bot deve poter vedere PRIMA cosa
// sa fare davvero, e perche' una pagina che risponde a "come funziona !slot"
// vale piu' di dieci righe di vetrina.
//
// I numeri qui dentro non sono decorativi: sono quelli del motore. Se cambiano
// li', qui devono cambiare — e il cancello verifica-manuali.mjs controlla che
// non manchi niente di quello che il motore sa fare.
import { GUIDE, DENTRO, ancora, paginaDoc, paginaManuali } from './guide.js';

const OGGI = '2026-09-04';

const GIOCHI = {
  slug: 'giochi',
  schede: ['giochi'],
  titolo: 'Manuale dei giochi e delle monete | SocialBot',
  h1: 'Manuale dei giochi e delle monete',
  desc: 'Come si guadagnano le monete del canale, cosa fa ogni comando di gioco, quanto costa e quanto paga, e come inventarsi un gioco proprio.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'La chat ha una <strong>moneta</strong>: si guadagna guardando e scrivendo, si spende nei giochi. Il nome lo scegli tu (di base sono «monete»), e da <em>Giochi</em> nel pannello decidi quanto vale ogni cosa.',
      'Qui c\'è tutto: come entrano le monete, cosa fa ogni comando con i numeri veri, e come costruirti un gioco che non c\'è.',
    ] },

    { h2: 'Come si guadagnano le monete' },
    { p: ['Ci sono <strong>tre entrate</strong>, e si sommano.'] },
    { tabella: [
      ['Entrata', 'A chi', 'Quando', 'Di base'],
      ['Messaggio', 'a chi scrive', 'al massimo una volta al minuto', '2 monete'],
      ['Presenza', 'a chi è in chat, anche in silenzio', 'ogni giro (5 minuti)', '5 monete'],
      ['Partecipazione', 'in più, a chi ha scritto in quel giro', 'ogni giro (5 minuti)', '5 monete'],
    ] },
    { p: [
      'Presenza e partecipazione valgono <strong>solo mentre sei in diretta</strong> (si può togliere). Le monete per messaggio no: quelle arrivano anche a canale spento.',
      'Poi ci sono i <strong>moltiplicatori</strong>, letti dai distintivi dei messaggi — quindi senza una sola domanda in più a Twitch: <strong>abbonati ×1,5</strong> e <strong>VIP ×1,25</strong>. Con i valori di base: chi guarda e scrive prende 10 monete ogni cinque minuti (120 all\'ora), un abbonato 15 (180 all\'ora), un VIP 13.',
    ] },
    { h3: 'Chi guarda in silenzio' },
    { p: ['Chi resta in lurk continua a guadagnare, ma <strong>gradualmente meno</strong>: un gradino a ogni giro senza partecipare, fino a un minimo sotto il quale non si scende. Chi torna a scrivere <strong>risale subito a quota piena</strong>, senza recuperare niente.'] },
    { tabella: [
      ['Giri in silenzio', '0', '1', '2', '3', '4', '5 e oltre'],
      ['Monete', '5', '4', '4', '3', '2', '2'],
    ] },
    { p: ['Non scende a zero perché la presenza vale sempre qualcosa: è la differenza fra premiare chi c\'è e premiare chi tiene una macro che scrive in chat.'] },

    { h2: 'Tutto quello che puoi cambiare' },
    { p: ['Da <em>Giochi</em> nel pannello. Fra parentesi il minimo e il massimo che il server accetta.'] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti', 'Cosa fa'],
      ['Nome della moneta', 'monete', '20 caratteri', 'Come la chiama il bot in chat.'],
      ['Per messaggio', '2', '0–1000', 'Monete a chi scrive. A 0 questa entrata si spegne.'],
      ['Ogni quanti secondi', '60', '5–3600', 'Ogni quanto può ripetersi quella sopra, per persona.'],
      ['Per presenza', '5', '0–10.000', 'Monete a giro a chi è in chat.'],
      ['Per partecipazione', '5', '0–10.000', 'In più, a chi ha scritto in quel giro.'],
      ['Moltiplicatore sub', '1,5', '1–10', 'Quanto vale un abbonato.'],
      ['Moltiplicatore VIP', '1,25', '1–10', 'Quanto vale un VIP.'],
      ['Passo del lurk', '0,15', '0–1', 'Quanto cala a ogni giro di silenzio.'],
      ['Minimo del lurk', '0,35', '0–1', 'Sotto questa quota non si scende.'],
      ['Solo in diretta', 'sì', '—', 'Se toglierlo, presenza e partecipazione valgono anche a canale spento.'],
      ['Premio quiz', '25', '0–100.000', 'Chi indovina una manche.'],
      ['Premio duello', '15', '0–100.000', 'Chi vince un duello.'],
      ['Costo slot', '10', '0–100.000', 'Quanto costa una giocata.'],
      ['Vincita slot', '200', '0–1.000.000', 'Il tris pieno (le altre vincite si scalano da qui).'],
      ['Coppia slot', '20', '0–100.000', 'Due simboli uguali.'],
      ['Quanti in classifica', '5', '3–10', 'Righe mostrate da !classifica.'],
    ] },

    { h2: 'I comandi pronti' },
    { p: ['Funzionano appena i giochi sono accesi, senza configurare niente. <code>!giochi</code> li elenca in chat — e l\'elenco che scrive è quello vero: i giochi accesi, coi nomi che hai scelto tu.'] },
    { tabella: [
      ['Comando', 'Anche', 'Cosa fa', 'Attesa'],
      ['<code>!dado</code>', '<code>!roll</code>', 'Tira un dado. <code>!dado 2d20</code> per tirarne altri.', '3s a testa'],
      ['<code>!moneta</code>', '<code>!coin</code>', 'Testa o croce.', '3s a testa'],
      ['<code>!8ball</code>', '<code>!palla8</code>', 'Risponde a una domanda. Serve la domanda.', '3s a testa'],
      ['<code>!monete</code>', '<code>!punti</code> <code>!bilancio</code>', 'Quante ne hai.', '—'],
      ['<code>!classifica</code>', '<code>!top</code>', 'I primi del pubblico.', '—'],
      ['<code>!classifica mod</code>', '<code>!classificamod</code> <code>!classificastaff</code> <code>!topmod</code>', 'I primi dello staff.', '—'],
      ['<code>!slot</code>', '—', 'Macchinetta: paghi, giri, forse vinci.', '5s a testa'],
      ['<code>!duello @nome</code>', '<code>!duel</code>', 'Sfida chi è in chat. Vince uno dei due.', '15s di canale'],
      ['<code>!trivia</code>', '<code>!quiz</code>', 'Apre una domanda per tutti.', '15s di canale'],
      ['<code>!manche</code>', '<code>!gioca</code>', 'Apre una manche a caso fra i sei tipi.', '10s di canale'],
      ['<code>!pesca</code>', '<code>!fish</code>', 'Cala la canna. Può uscire di tutto.', '60s a testa'],
      ['<code>!roulette</code>', '<code>!rul</code>', 'Punti su rosso, nero, verde o un numero.', '5s a testa'],
      ['<code>!furto @nome</code>', '<code>!rapina</code>', 'Provi a rubare. Se ti beccano, paghi.', '45s a testa'],
      ['<code>!regala @nome 50</code>', '<code>!dona</code>', 'Passi monete a qualcun altro.', '—'],
    ] },

    { h2: 'Ogni comando si accende, si rinomina, si riserva' },
    { p: ['Dalla scheda <em>Giochi</em>, nella carta «Comandi dei giochi», ogni riga è un comando vero: quello che vedi lì è quello che risponde in chat. Vale per <strong>tutti</strong> i comandi pronti del bot, non solo per i giochi — l\'elenco completo sta in <em>Comandi</em>, in fondo.'] },
    { tabella: [
      ['Cosa puoi fare', 'Cosa succede'],
      ['Spegnerlo', 'Il comando smette di esistere: non risponde e sparisce da <code>!giochi</code>. Niente si cancella — monete, classifiche e impostazioni restano.'],
      ['Dargli un nome tuo', 'Risponde solo al tuo. <strong>I nomi di serie smettono di rispondere</strong>: un gioco ha un nome, e lo scegli tu.'],
      ['Riservarlo', 'Lo usano solo abbonati, VIP o moderatori. Chi non ci arriva riceve una risposta che glielo dice, invece del silenzio.'],
    ] },
    { p: ['Due giochi non possono chiamarsi allo stesso modo: il secondo non partirebbe mai e nessuno capirebbe perché. Se ci provi, il pannello rifiuta e ti dice quale nome è già preso.'] },
    { p: ['<code>!giochi</code> non è un elenco scritto a mano da qualche parte: legge la stessa tabella. Se spegni la slot, sparisce anche da lì.'] },
    { h3: 'La famiglia conta più del singolo' },
    { p: ['Un comando può essere acceso e restare muto lo stesso, perché la <strong>famiglia</strong> a cui appartiene è spenta. I giochi con la webcam, per esempio, rispondono solo se il tracking è acceso: se non lo è, il pannello te li mostra sbarrati e <code>!giochi</code> non li nomina.'] },
    { p: ['È il motivo per cui prima <code>!giochi</code> rispondeva <strong>due volte</strong> — i giochi di chat e, subito sotto, quelli con la webcam — anche a chi la webcam non la usa: erano due elenchi scritti a mano che non sapevano l\'uno dell\'altro. Adesso la risposta è una sola e dice quello che risponde davvero.'] },

    { h3: 'Slot' },
    { p: ['Paghi il costo (10 di base) e girano tre simboli. Le vincite si scalano tutte dalla «vincita slot» (200 di base):'] },
    { tabella: [
      ['Esito', 'Vinci', 'Con i valori di base'],
      ['Tris di 💎', 'la vincita piena', '200'],
      ['Tris di 7️⃣', 'il 75%', '150'],
      ['Qualsiasi altro tris', 'il 40%', '80'],
      ['Due uguali', 'la coppia', '20'],
      ['Niente', '—', 'perdi il costo'],
    ] },
    { p: ['Se non hai abbastanza monete il bot te lo dice e non ti fa giocare.'] },

    { h3: 'Roulette' },
    { p: [
      'Si scrive <code>!roulette 50 rosso</code> oppure <code>!roulette 50 17</code>. Vanno bene anche <em>nero</em>, <em>verde</em> e i nomi inglesi.',
      'È una roulette europea: 37 caselle, lo zero è verde.',
    ] },
    { tabella: [
      ['Punti su', 'Se esce', 'Ti torna'],
      ['Un numero (0–36)', 'quel numero', '36 volte la puntata'],
      ['Rosso o nero', 'quel colore', '2 volte la puntata'],
      ['Verde', 'lo zero', '14 volte la puntata'],
    ] },

    { h3: 'Pesca' },
    { p: ['Una volta al minuto a testa. Non è a caso puro: ogni preda ha il suo peso, e più vale meno esce.'] },
    { tabella: [
      ['Preda', 'Monete', 'Quanto è probabile'],
      ['Un pesciolino', '15', 'molto comune'],
      ['Un granchio', '30', 'comune'],
      ['Una ciabatta o una lattina', '0', 'comune'],
      ['Un polpo', '60', 'raro'],
      ['Un pesce spada', '120', 'raro'],
      ['Uno stivale pieno di monete', '250', 'molto raro'],
      ['Uno scrigno del tesoro', '500', 'rarissimo'],
    ] },

    { h3: 'Duello' },
    { p: [
      'Si sfida <strong>solo chi è in chat</strong> — chi ha parlato negli ultimi trenta minuti. Serviva: prima si poteva sfidare un nome inventato, e le monete finivano su un profilo che non esisteva.',
      'Vince uno dei due a testa o croce, e il vincitore prende il premio duello (15 di base). Un duello alla volta per canale.',
    ] },

    { h3: 'Furto' },
    { p: [
      'Una prova ogni 45 secondi a testa, e solo su chi ha almeno 20 monete. Va a buon fine <strong>45 volte su 100</strong>: prendi fra 10 e 150 monete (mai più di quante ne ha la vittima).',
      'Se ti beccano paghi una multa fra 10 e 60 monete — <strong>alla vittima</strong>, non al nulla.',
    ] },

    { h2: 'Le manche automatiche' },
    { p: [
      'Una manche è una domanda aperta a tutta la chat: chi risponde per primo prende il premio quiz (25 di base). Si aprono da sole ogni tanto (da <em>Giochi</em> scegli ogni quanti minuti, da 1 a 360, e se solo in diretta) oppure a mano con <code>!manche</code>.',
      'I tipi sono sei, e il bot ne pesca uno che riesca a costruire:',
    ] },
    { tabella: [
      ['Tipo', 'Come funziona', 'Tempo', 'Materiale tuo'],
      ['Quiz', 'Una domanda, si risponde in chat.', '45s', 'le tue domande'],
      ['Reflex', 'Il primo che scrive la parola vince.', '30s', 'le tue parole'],
      ['Numero', 'Ha pensato un numero: indovinatelo.', '40s', '—'],
      ['Anagramma', 'Lettere mescolate da rimettere a posto.', '45s', 'le tue parole'],
      ['Sequenza', 'Una sequenza di simboli da ripetere.', '30s', 'i tuoi simboli'],
      ['Domanda tua', 'Domanda e risposte scritte da te.', 'da 10s a 5 min', 'domanda + risposte'],
    ] },
    { p: ['Il materiale che aggiungi non sostituisce quello di serie: quando ce n\'è di tuo, il bot lo pesca <strong>due volte su tre</strong>, così la chat non impara le domande a memoria.'] },

    { h2: 'Le classifiche' },
    { p: [
      'Sono <strong>due</strong>, e sono separate apposta: <code>!classifica</code> è quella del pubblico, <code>!classifica mod</code> quella dello staff. Senza la divisione i moderatori — che stanno in chat tutto il giorno — occupavano i primi posti e la gara del pubblico non esisteva più.',
      'Chi è staff lo dice Twitch, non «chi ha guadagnato mentre era moderatore»: se promuovi qualcuno, le sue monete si spostano nella classifica giusta. <code>!classifica tutti</code> mostra la vecchia vista unica.',
    ] },

    { h2: 'Il premio in VIP' },
    { p: [
      'Ogni settimana (o ogni mese) il bot può dare il <strong>VIP</strong> ai primi della classifica del pubblico: da 1 a 5 persone, e il VIP dura fino al premio successivo.',
      'Chi ha già il VIP <strong>per sempre</strong> viene saltato e il posto scorre al successivo: dargli un premio a scadenza significherebbe togliergli quello che aveva. Si può disattivare, ma è acceso di base.',
    ] },

    { h2: 'Fare un gioco tuo' },
    { p: [
      'I giochi pronti sono un punto di partenza, non il confine. Nella scheda <em>Giochi</em>, in <strong>«I tuoi giochi»</strong>, si fa tutto da un posto solo. La prima domanda è anche l\'unica che conta davvero: <strong>chi lo lancia?</strong>',
    ] },
    { tabella: [
      ['Chi lo lancia', 'Che gioco è', 'Da cosa parti'],
      ['<strong>Ci pensa il bot</strong>', 'Ogni tanto, a sorpresa, parte una manche e il primo che risponde vince.', 'Cinque forme pronte: quiz, parola veloce, anagramma, sequenza di simboli, una domanda tua.'],
      ['<strong>Lo scrive uno spettatore</strong>', 'Un comando che costa monete, tira il dado e paga — o no.', 'Sei ricette già scritte: le apri, cambi i numeri e le parole, ed è tuo.'],
    ] },
    { p: [
      'Il secondo caso è un <a href="/manuale/moduli">Modulo</a> a tutti gli effetti — innesco, condizioni, azioni — ma si costruisce <strong>lì dentro</strong>: prima ti spostava in <em>Comandi</em>, e per una cosa sola c\'erano due schede e tre elenchi.',
      'Nell\'editor dei giochi le <strong>parole magiche</strong> offerte sono quelle che a un gioco servono davvero — le monete, il caso, i numeri, chi scrive — invece di tutte e quaranta. Le altre restano a un clic.',
    ] },
    { tabella: [
      ['Ricetta', 'Cosa fa', 'Cosa cambi di solito'],
      ['Macchinetta a monete', 'Costa una cifra fissa, e una volta su N paga.', 'costo, premio, probabilità'],
      ['Scommessa', 'Punti quanto vuoi tu: <code>!scommetti 100</code>.', 'probabilità e moltiplicatore'],
      ['Furto', 'Ruba a un altro, e se fallisce paga.', 'quanto si ruba, quanto si rischia'],
      ['Regala monete', 'Passa monete a qualcun altro.', 'il testo'],
      ['Quante monete ho', 'Risponde con il saldo e la posizione.', 'il testo'],
      ['Dai monete (mod)', 'Un moderatore accredita monete a mano.', 'chi può usarlo'],
    ] },
    { p: [
      'Le due cose che rendono un gioco un gioco sono nelle condizioni: il <strong>costo</strong> (che può essere una cifra fissa o quella scritta da chi gioca, con <code>$arg1</code>) e la <strong>probabilità</strong>, con il ramo <strong>«altrimenti»</strong> per quando va male.',
      'Nei testi hai <code>$mossa</code> (quante monete si sono mosse davvero) e <code>$bersaglio</code> (su chi): servono a raccontare quello che è successo — a chi ha 5 monete non se ne possono togliere 80, e il messaggio deve dire la verità.',
    ] },

    { h2: 'Quando qualcosa non va' },
    { ul: [
      '<strong>Le monete non salgono.</strong> Presenza e partecipazione valgono solo in diretta: a canale spento restano solo quelle per messaggio. E i giochi devono essere accesi nella scheda <em>Giochi</em>.',
      '<strong>Un comando non risponde.</strong> Se hai un tuo comando con lo stesso nome, vince il tuo: è voluto. Cambiagli nome, o togli il tuo.',
      '<strong>«Non è in chat».</strong> Duello e furto valgono su chi ha parlato di recente: è quello che impedisce di creare monete dal nulla con un nome inventato.',
      '<strong>La classifica dello staff è vuota.</strong> Si riempie quando il bot rilegge chi sono i moderatori: succede da solo, e comunque prima di ogni premio VIP.',
      '<strong>Ho cambiato un premio e non cambia niente.</strong> I valori si applicano alla giocata successiva, non a quella in corso.',
    ] },
  ],
  faq: [
    { d: 'Posso spegnere solo un gioco?', r: 'Sì: nella carta «Comandi dei giochi» ogni riga ha il suo interruttore. Da lì lo puoi anche rinominare o riservare a sub, VIP o moderatori.' },
    { d: 'Le monete si possono togliere a qualcuno?', r: 'Sì, dal pannello puoi aggiustare il saldo di chiunque, in più o in meno, senza passare dalla chat. Serve quando qualcuno bara o quando vuoi premiare a mano.' },
    { d: 'Le monete valgono anche su Kick?', r: 'Sì: la chat è una sola per il bot. Un comando può anche essere limitato a una piattaforma sola, se preferisci.' },
    { d: 'Come si chiama la moneta?', r: 'Come vuoi tu: fino a venti caratteri, dalla scheda Giochi. Il bot userà quel nome ovunque, anche nei messaggi dei giochi pronti.' },
  ],
};

const MODULI = {
  slug: 'moduli',
  schede: ['moduli'],
  titolo: 'Manuale dei moduli: automazioni della chat | SocialBot',
  h1: 'Manuale dei moduli',
  desc: 'Quando succede qualcosa, se valgono certe condizioni, allora il bot fa. Inneschi, condizioni, azioni e variabili dei moduli di SocialBot, uno per uno.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'Un <strong>modulo</strong> è un\'automazione che ti costruisci: <strong>QUANDO</strong> succede qualcosa, <strong>SE</strong> valgono certe condizioni, <strong>ALLORA</strong> il bot fa una o più cose.',
      'Con i moduli si fanno i comandi che ti mancano, le risposte automatiche, i giochi a monete, i saluti agli eventi, i timer, e i collegamenti verso servizi tuoi. Un modulo è <strong>dati</strong>, mai codice: quello che può fare è l\'elenco di azioni qui sotto, e nient\'altro. È il motivo per cui puoi costruirci sopra senza poter rompere niente — tuo o di altri.',
    ] },

    { h2: 'QUANDO: i sei inneschi' },
    { tabella: [
      ['Innesco', 'Parte quando', 'Cosa gli dai'],
      ['Comando', 'qualcuno scrive <code>!nome</code> in chat', 'il nome (senza <code>!</code>) e gli alias'],
      ['Parola', 'in un messaggio compare un testo', 'il testo, e se deve <em>contenerlo</em>, <em>esserlo</em> o <em>iniziare</em> così'],
      ['Evento', 'succede qualcosa sul canale', 'quale evento (sotto)'],
      ['Timer', 'ogni tot minuti', 'i minuti, e se vuoi un minimo di messaggi nuovi'],
      ['Manuale', 'solo quando lo lanci tu', 'niente: si lancia da «Prova» o da fuori'],
      ['Voce', 'lo dici a voce mentre streammi', 'la frase da riconoscere'],
    ] },
    { h3: 'Gli eventi' },
    { tabella: [
      ['Evento', 'Quando'],
      ['Nuovo follow', 'qualcuno inizia a seguirti'],
      ['Sub / resub', 'qualcuno si abbona o rinnova'],
      ['Raid', 'un altro canale ti manda i suoi spettatori'],
      ['Bits / cheer', 'qualcuno manda dei bit'],
      ['Riscatto punti canale', 'qualcuno riscatta un premio dei punti Twitch'],
      ['Primo messaggio di un utente', 'qualcuno scrive per la prima volta nel tuo canale'],
      ['Sei andato in live', 'la diretta comincia'],
      ['Fine live', 'la diretta finisce'],
      ['Gesto webcam (mani/volto)', 'la webcam riconosce un gesto o un\'espressione'],
    ] },
    { p: ['Il timer non parla nel vuoto: se chiedi un minimo di messaggi nuovi, il modulo tace quando la chat è ferma. È la differenza fra un promemoria e un bot che parla da solo davanti a nessuno.'] },

    { h2: 'SE: le condizioni' },
    { p: ['Sono tutte facoltative, e si sommano: passano <strong>tutte</strong> o il modulo non parte.'] },
    { tabella: [
      ['Condizione', 'Cosa fa', 'Limiti'],
      ['Chi può', 'da tutti, solo abbonati, solo VIP, solo moderatori', 'scala: tutti &lt; sub &lt; VIP &lt; mod'],
      ['Piattaforme', 'solo Twitch, solo Kick, o dove vuoi', 'se non scegli, vale ovunque'],
      ['Solo in diretta', 'il modulo tace a canale spento', '—'],
      ['Solo offline', 'il contrario: solo a canale spento', '—'],
      ['Monete richieste', 'serve almeno quel saldo, ma non si paga', '0–1.000.000'],
      ['Costo', 'quante monete si pagano per usarlo', '0–1.000.000, oppure una variabile'],
      ['Attesa', 'quanto aspetta prima di poter ripartire, per tutti', 'secondi'],
      ['Attesa a testa', 'quanto aspetta la stessa persona', '0–86.400 secondi'],
      ['Probabilità', 'quante volte su cento parte', '0–100'],
      ['Messaggio se non basta', 'cosa dice a chi non ha abbastanza monete', '300 caratteri'],
    ] },
    { h3: 'In che ordine vengono controllate' },
    { p: ['L\'ordine non è un dettaglio: decide <strong>quando si paga</strong>.'] },
    { tabella: [
      ['1', 'Chi può usarlo'],
      ['2', 'La piattaforma'],
      ['3', 'Diretta accesa o spenta'],
      ['4', 'Monete richieste e costo — qui si <em>controlla</em>, non si paga'],
      ['5', 'L\'attesa di tutti'],
      ['6', 'L\'attesa della singola persona'],
      ['7', 'Il pagamento: qui le monete escono davvero'],
      ['8', 'La probabilità'],
    ] },
    { p: ['Quindi si paga <strong>dopo</strong> le attese e <strong>prima</strong> del dado: chi gioca paga la giocata anche quando perde — che è come funziona una giocata — ma non paga se il comando era in attesa. Dopo il pagamento hai <code>$costo</code> (quanto è uscito) e <code>$saldo</code> (quanto è rimasto) da usare nei testi.'] },

    { h2: 'ALLORA: le quattordici azioni' },
    { p: ['Si eseguono <strong>in fila</strong>, fino a otto per modulo. Se una fallisce, le altre vanno avanti lo stesso: un webhook spento non deve spegnere il messaggio in chat.'] },
    { tabella: [
      ['Azione', 'Cosa fa', 'Cosa le dai', 'Serve'],
      ['Scrivi in chat', 'manda un messaggio', 'il testo (fino a 400 caratteri)', '—'],
      ['Fai partire un effetto', 'lancia un tuo effetto o suono', 'quale effetto', 'un effetto già creato'],
      ['Dai o togli punti', 'muove le monete del canale', 'aggiungi/togli/imposta, a chi, quanto', '—'],
      ['Contatore', 'tiene un numero che cresce', 'nome, e se incrementare, azzerare o impostare', '—'],
      ['Crea una clip', 'salva una clip del momento', 'un testo da dire (facoltativo)', 'il permesso clip'],
      ['Cambia categoria Twitch', 'cambia il gioco del canale', 'il gioco, anche da <code>$args</code>', 'il permesso di modifica canale'],
      ['Cambia titolo stream', 'cambia il titolo', 'il testo (fino a 140 caratteri)', 'il permesso di modifica canale'],
      ['Metti una canzone in coda', 'aggiunge un brano su Spotify', 'il brano, anche da <code>$args</code>', 'add-on Musica e Spotify collegato'],
      ['Annuncio in chat (/announce)', 'un messaggio evidenziato in chat', 'il testo e il colore', 'il permesso annunci'],
      ['Shoutout (banner)', 'lo shoutout ufficiale di Twitch', 'chi, o il nome dopo il comando, o chi ha raidato', 'il permesso shoutout'],
      ['Mostra testo sull\'overlay', 'scrive a schermo nella diretta', 'il testo e per quanto', 'l\'overlay in scena'],
      ['Timeout in chat', 'mette in pausa chi ha scritto', 'i secondi', 'il permesso di moderazione'],
      ['Aspetta', 'una pausa prima dell\'azione dopo', 'i secondi (fino a 30)', '—'],
      ['Chiama un webhook', 'manda i dati a un indirizzo tuo', 'l\'URL, e se usare la risposta', 'un servizio tuo'],
    ] },
    { h3: 'Dai o togli punti' },
    { p: [
      'È l\'azione che trasforma un modulo in un gioco. <em>Aggiungi</em> e <em>togli</em> spostano, <em>imposta</em> mette una cifra esatta.',
      'Il destinatario può essere <strong>chi ha scritto</strong>, il <strong>nome dopo il comando</strong>, <strong>uno a caso</strong> fra chi ha parlato di recente, o un <strong>nome fisso</strong>. La quantità può essere un numero o una variabile: <code>$random(10,50)</code>, <code>$arg1</code>.',
      'Dopo, <code>$mossa</code> dice quante monete si sono mosse <strong>davvero</strong> e <code>$bersaglio</code> su chi. Sono la stessa cifra per tutte le azioni che seguono: senza, un furto toglierebbe una somma alla vittima e ne darebbe un\'altra al ladro.',
    ] },
    { h3: 'Chiama un webhook' },
    { p: [
      'Manda il contesto in JSON a un indirizzo tuo. Se rispondi con <code>{"reply": "testo"}</code> e hai spuntato «usa la risposta», il bot scrive quel testo in chat — con le variabili già espanse.',
      'Accetta solo <code>http</code> e <code>https</code>, e <strong>non può puntare dentro una rete privata</strong>: gli indirizzi interni sono rifiutati sia scritti direttamente sia dopo aver risolto il nome, e un redirect non aggira il controllo. Cinque secondi di tempo, risposta letta fino a 10 KB.',
    ] },

    { h2: 'Il ramo ALTRIMENTI' },
    { p: [
      'È quello che succede <strong>quando il dado non passa</strong>. Ha senso solo con una probabilità sotto il 100%: il pannello non lo lascia salvare altrimenti, perché un modulo che sembra fare due cose e ne fa una sola è peggio di un errore.',
      'Le azioni del ramo «altrimenti» sono le stesse quattordici, e il costo è già stato pagato: la giocata persa può raccontarlo con <code>$costo</code> e <code>$saldo</code>.',
    ] },

    { h2: 'Le variabili' },
    { p: ['Si scrivono nei testi e diventano quello che valgono. Una variabile che non esiste sparisce, non lascia scritto il suo nome. Non c\'è nessun modo di eseguire codice: sono sostituzioni, e basta.'] },
    { h3: 'Chi scrive e cosa dice' },
    { tabella: [
      ['<code>$user</code>', 'chi ha scritto'],
      ['<code>$touser</code>', 'il nome scritto dopo il comando (o chi scrive, se manca)'],
      ['<code>$target</code>', 'come <code>$touser</code>'],
      ['<code>$args</code>', 'tutto quello che c\'è dopo il comando'],
      ['<code>$arg1</code>', 'la prima parola dopo il comando (poi <code>$arg2</code>, <code>$arg3</code>…)'],
      ['<code>$canale</code>', 'il nome del tuo canale'],
    ] },
    { h3: 'La diretta adesso' },
    { tabella: [
      ['<code>$uptime</code>', 'da quanto sei in diretta (vuoto se offline)'],
      ['<code>$gioco</code>', 'la categoria attuale'],
      ['<code>$titolo</code>', 'il titolo attuale'],
      ['<code>$spettatori</code>', 'quanti stanno guardando ora'],
    ] },
    { h3: 'Le persone' },
    { tabella: [
      ['<code>$followage</code>', 'da quanto ti segue chi scrive, o il nome dopo il comando'],
      ['<code>$ore</code>', 'ore guardate sul tuo canale (anche <code>$oreguardate</code>, <code>$watchtime</code>)'],
      ['<code>$chattercaso</code>', 'uno a caso fra chi ha scritto di recente'],
      ['<code>$cita</code>', 'una citazione a caso fra quelle salvate'],
      ['<code>$giocotarget</code>', 'l\'ultima categoria di chi nomini dopo il comando'],
      ['<code>$titolotarget</code>', 'l\'ultimo titolo di chi nomini dopo il comando'],
    ] },
    { h3: 'Le monete' },
    { tabella: [
      ['<code>$punti</code>', 'quante ne ha chi scrive'],
      ['<code>$punti(nome)</code>', 'quante ne ha un altro'],
      ['<code>$monete</code>', 'come si chiama la tua moneta'],
      ['<code>$posizione</code>', 'in che posizione è chi scrive'],
      ['<code>$top(3)</code>', 'i primi tre, già scritti'],
      ['<code>$costo</code>', 'quanto è costato questo modulo'],
      ['<code>$saldo</code>', 'quanto è rimasto dopo il pagamento'],
      ['<code>$mossa</code>', 'quante monete ha mosso l\'ultima azione punti'],
      ['<code>$bersaglio</code>', 'su chi le ha mosse'],
    ] },
    { h3: 'Quando l\'innesco è un evento' },
    { tabella: [
      ['<code>$raider</code>', 'chi ti ha raidato'],
      ['<code>$viewers</code>', 'quanti ne ha portati'],
      ['<code>$mesi</code>', 'da quanti mesi è abbonato'],
      ['<code>$bits</code>', 'quanti bit ha mandato'],
      ['<code>$premio</code>', 'quale premio ha riscattato'],
      ['<code>$gesto</code>', 'il gesto riconosciuto dalla webcam'],
      ['<code>$emozione</code>', 'l\'espressione riconosciuta'],
    ] },
    { h3: 'Data e ora' },
    { tabella: [
      ['<code>$data</code>', 'la data di oggi'],
      ['<code>$ora</code>', 'che ore sono'],
      ['<code>$giorno</code>', 'che giorno della settimana è'],
    ] },
    { h3: 'Le funzioni' },
    { tabella: [
      ['<code>$random(1,100)</code>', 'un numero fra due'],
      ['<code>$random(6)</code>', 'un numero da 1 a 6'],
      ['<code>$decimale(1,2)</code>', 'un numero con la virgola'],
      ['<code>$misura(1,50,cm)</code>', 'un numero con l\'unità che vuoi'],
      ['<code>$pick(a|b|c)</code>', 'una a caso fra queste (anche <code>$scegli</code>)'],
      ['<code>$count(nome)</code>', 'quanto vale un contatore'],
      ['<code>$titolo($args)</code>', 'cambia il titolo mentre scrivi il messaggio'],
      ['<code>$categoria($args)</code>', 'cambia la categoria mentre scrivi il messaggio'],
    ] },
    { h3: 'Quelle a caso' },
    { p: ['Danno un valore nuovo <strong>a ogni volta che compaiono</strong>: due <code>$dado</code> nella stessa frase danno due numeri diversi.'] },
    { tabella: [
      ['<code>$dado</code>', 'da 1 a 6'],
      ['<code>$moneta</code>', 'testa o croce'],
      ['<code>$sino</code>', 'sì o no'],
      ['<code>$random</code> <code>$numero</code>', 'da 0 a 100'],
      ['<code>$percentuale</code>', 'da 0% a 100%'],
      ['<code>$livello</code>', 'da 1 a 100'],
      ['<code>$altezza</code>', 'da 1,40 m a 2,10 m'],
      ['<code>$peso</code>', 'da 40 a 130 kg'],
      ['<code>$lunghezza</code>', 'da 1 a 30 cm'],
      ['<code>$grandezza</code>', 'da 1 a 50 cm'],
      ['<code>$eta</code>', 'da 1 a 99 anni'],
      ['<code>$temperatura</code>', 'da -10 a 45 °C'],
      ['<code>$velocita</code>', 'da 1 a 320 km/h'],
      ['<code>$distanza</code>', 'da 1 a 1000 km'],
      ['<code>$soldi</code> <code>$euro</code>', 'da 0 a 100.000 €'],
      ['<code>$colore</code>', 'un colore'],
      ['<code>$animale</code>', 'un animale'],
      ['<code>$emoji</code>', 'una emoji'],
    ] },

    { h2: 'Tre esempi' },
    { h3: 'Un comando con una risposta viva' },
    { esempio: 'QUANDO   comando  !abbraccia\nALLORA   scrivi in chat\n         $user abbraccia $touser per $random(3,30) secondi.' },
    { h3: 'Un saluto ai raid, con lo shoutout' },
    { esempio: 'QUANDO   evento  Raid\nALLORA   scrivi in chat\n         Benvenuti! $raider è arrivato con $viewers persone.\nALLORA   shoutout  (a chi ha raidato)' },
    { h3: 'Una scommessa' },
    { esempio: 'QUANDO   comando  !scommetti\nSE       costo $arg1 · probabilità 45\nALLORA   dai punti  a chi scrive  +$arg1\nALLORA   scrivi in chat\n         $user punta $costo $monete e vince! Ora ne ha $punti.\nALTRIMENTI  scrivi in chat\n         $user punta $costo $monete e perde tutto. Ne restano $saldo.' },
    { p: ['Nel terzo: il costo è la cifra scritta da chi gioca, si paga sempre, e la vincita raddoppia perché la puntata era già uscita.'] },

    { h2: 'I comandi pronti, e chi vince' },
    { p: ['Il bot porta con sé una quarantina di comandi già fatti — giochi, sorteggi, ore guardate, shoutout, VIP, sondaggi, musica. In <em>Comandi</em>, in fondo alla scheda, ci sono tutti: ognuno si <strong>spegne</strong>, si <strong>rinomina</strong> e si può <strong>riservare</strong> ad abbonati, VIP o moderatori.'] },
    { p: ['Rinominare <strong>sostituisce</strong>: se chiami <code>!slot</code> in un altro modo, il nome di serie smette di rispondere. Un comando ha un nome, e lo scegli tu.'] },
    { p: ['Due comandi non possono chiamarsi allo stesso modo: il secondo non partirebbe mai. Se ci provi, il pannello rifiuta e ti dice quale nome è già preso.'] },
    { p: ['E la regola di sempre resta: <strong>un comando tuo con lo stesso nome vince su quello pronto</strong>. Non devi spegnere niente per sovrascrivere un comando di serie — basta crearne uno tuo che si chiami così.'] },

    { h2: 'Limiti e sicurezza' },
    { ul: [
      'Otto azioni per modulo, e la fila si ferma lì.',
      'Un messaggio in chat arriva a 400 caratteri, un titolo a 140.',
      'Una pausa può durare al massimo 30 secondi.',
      'Un\'azione punti può muovere al massimo un milione di monete per volta.',
      'I webhook non possono raggiungere una rete privata, non seguono i redirect e hanno cinque secondi di tempo.',
      'Le variabili sono sostituzioni di testo: nessun codice viene eseguito, né tuo né di chi scrive in chat.',
      'Il bot non innesca sé stesso: quello che dice non fa ripartire i tuoi moduli.',
    ] },

    { h2: 'Lanciare un modulo da fuori' },
    { p: [
      'Ogni canale ha una <strong>chiave</strong> (la vede solo il proprietario, mai un moderatore). Con quella, un programma tuo — un\'estensione, un pulsante dello Stream Deck, uno script — può far scrivere il bot o lanciare un modulo.',
      'Si manda una <code>POST</code> all\'indirizzo del canale con la chiave nell\'intestazione <code>Authorization</code>, e nel corpo cosa fare: un messaggio, un effetto, o un modulo. Trenta richieste al minuto. Una chiave sbagliata riceve un 404, senza dire perché.',
    ] },

    { h2: 'Quando un modulo non parte' },
    { ul: [
      '<strong>Controlla l\'ordine delle condizioni.</strong> Se c\'è un\'attesa in corso il modulo tace <em>prima</em> di pagare: sembra rotto e invece sta aspettando.',
      '<strong>La probabilità è quella che sembra?</strong> Con 20 su 100, quattro volte su cinque non succede niente — e senza il ramo «altrimenti» quel silenzio è indistinguibile da un guasto.',
      '<strong>Ti manca un permesso.</strong> Categoria, titolo, annunci, shoutout e clip li fa Twitch: se il permesso non c\'è, il bot lo dice in chat una volta e va avanti. Si riautorizza dalla dashboard.',
      '<strong>Hai un comando pronto con lo stesso nome?</strong> Vince il tuo, sempre. Se volevi quello pronto, cambia nome al tuo.',
      '<strong>Provalo.</strong> Il tasto «Prova» esegue il modulo saltando tutte le condizioni: se funziona lì, il problema è in una condizione, non in un\'azione.',
    ] },
  ],
  faq: [
    { d: 'Che differenza c\'è fra un comando e un modulo?', r: 'Un comando è un modulo con l\'innesco più semplice. Nel pannello i comandi hanno una schermata più corta perché la maggior parte delle volte basta quella; quando serve di più — condizioni, più azioni, un costo — è lo stesso motore.' },
    { d: 'Un modulo può fare più cose di seguito?', r: 'Sì, fino a otto azioni in fila, e puoi metterci una pausa in mezzo. Se una fallisce le altre continuano, così un servizio esterno spento non porta giù il resto.' },
    { d: 'Posso usare i moduli per fare un gioco a monete?', r: 'È esattamente quello per cui c\'è l\'azione punti, insieme al costo e alla probabilità. Nella scheda Giochi, in «I tuoi giochi», trovi sei ricette già scritte da cui partire: si aprono e si modificano lì, senza cambiare scheda.' },
    { d: 'I moduli funzionano anche su Kick?', r: 'Sì. Se vuoi, ogni modulo può essere limitato a una piattaforma sola; se non scegli niente vale ovunque.' },
    { d: 'Che succede se scrivo una variabile che non esiste?', r: 'Sparisce dal testo, senza lasciare il suo nome in chat e senza errori. Conviene comunque provare il modulo prima di lasciarlo agli spettatori.' },
  ],
};

const BOT = {
  slug: 'bot',
  schede: ['personalita', 'conoscenza', 'memoria', 'avatar'],
  titolo: 'Manuale del bot: personalità, conoscenza e memoria | SocialBot',
  h1: 'Manuale del bot: personalità, conoscenza e memoria',
  desc: 'Come si regola il carattere del bot, cosa gli si insegna, cosa impara da solo, cosa si ricorda e come si cancella. Con i valori di base e i limiti veri.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'In chat il bot parla <strong>a nome tuo</strong>: non compare un account estraneo, compare il tuo. Per questo il suo carattere non è un dettaglio — è come suoni tu quando non stai guardando la chat.',
      'Le schede sono quattro e fanno mestieri diversi. <em>Il bot</em> decide <strong>come</strong> parla. <em>Conoscenza</em> decide <strong>cosa</strong> sa. <em>Memoria</em> mostra <strong>cosa si ricorda</strong> e permette di cancellarlo. <em>Avatar 3D</em> fa vedere <strong>come ragiona</strong>.',
    ] },

    { h2: 'Come parla: tono e quanto interviene' },
    { p: ['Sta in <em>Il bot</em>. Fra parentesi il valore con cui parti e i limiti che il server accetta.'] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti', 'Cosa cambia davvero'],
      ['Tono', 'scherzoso', 'scherzoso · amichevole · serio', 'La forma delle frasi: battute e ironia, caloroso e tranquillo, oppure sobrio e diretto.'],
      ['Chat autonoma', '5%', '0–50%', 'Quanto si intromette da solo in una conversazione a cui nessuno lo ha chiamato. A 0 parla solo se lo chiami.'],
      ['Rispondi quando mi nominano', 'acceso', '—', 'Se qualcuno scrive il tuo nome in chat, risponde lui.'],
      ['Personalità proattiva', 'acceso', '—', 'Ogni tanto si fa vivo di sua iniziativa, anche senza essere nominato.'],
      ['Adatta la personalità al canale', 'acceso', '—', 'Impara il tuo stile dalla chat e ci si avvicina, senza che tu debba descriverlo.'],
      ['Risposte intelligenti (IA locale)', 'acceso', '—', 'Il modello che gira sul nostro server: capisce la domanda anche se scritta in un altro modo.'],
      ['Accesso a internet', 'acceso', '—', 'Se non sa una cosa può cercarla al volo invece di dire «non lo so».'],
      ['Le tue frasi', 'vuoto', 'una per riga', 'Modi di dire tuoi che entrano nel suo repertorio.'],
    ] },
    { p: ['La <strong>chat autonoma</strong> è quella che si sente di più. Sotto il 10% il bot resta un servizio: risponde e tace. Sopra il 25% diventa un presente in chat, e su un canale piccolo può coprire le persone. Il massimo è 50% <em>di proposito</em>: oltre, non sarebbe più la tua chat.'] },

    { h3: 'Le due teste: modello e moduli' },
    { p: [
      'Le risposte possono nascere da due parti. L\'<strong>IA locale</strong> è un modello piccolo che gira <strong>sul nostro server</strong> — nessun servizio a pagamento di terzi, nessuna chat mandata fuori — e che si allena su come si parla nel tuo canale: più la chat vive, meglio capisce le domande scritte storte.',
      'I <strong>moduli</strong> invece sono regole tue, esatte: quando succede questo, dici quello. Non sbagliano mai e non costano niente. La scheda <em>Avatar 3D</em> ti fa vedere quanto pesa l\'una e quanto l\'altro: più cresce la fetta dei moduli, meno dipende dal modello.',
    ] },
    { h3: 'Quando cerca su internet' },
    { p: ['Solo se gli manca la risposta, e solo su fonti gratuite (DuckDuckGo, Wikipedia). Quello che trova lo tratta come <strong>informazione, non come istruzione</strong>: se una pagina contiene un comando travestito da testo, il bot non lo esegue. Si spegne dalla stessa scheda.'] },

    { h2: 'Chi risponde in chat pubblica' },
    { p: ['Il bot del canale, non Lia. Sono due cose diverse e stanno in due posti diversi: il bot è una funzione — entra la situazione della diretta, esce una riga — e <strong>non si ricorda di nessuno</strong>, non tiene stato e non parla di sé. Lia risponde in privato con te, studia e ti scrive di sua iniziativa.'] },
    { p: ['Quando Lia sarà una persona e tu avrai acceso il suo interruttore, in pubblico prenderà la parola lei. Fino ad allora il bot non può leggere niente di suo: lei potrà <em>insegnargli</em>, lui non può <em>prendersi</em>.'] },

    { h2: 'La tua scheda: chi sei' },
    { p: ['In cima a <em>Conoscenza</em>. Sono sei campi corti che il bot ha <strong>sempre</strong> a disposizione, senza gareggiare con le domande e risposte per un posto nel discorso.'] },
    { tabella: [
      ['Campo', 'A cosa serve'],
      ['Chi sei', 'Come ti presenteresti, in due righe.'],
      ['Cosa fai in diretta', 'Il contenuto, non il curriculum.'],
      ['Quando sei in diretta', 'Gli orari, come li diresti a voce.'],
      ['Dove ti trovano', 'Social e sito. Il bot lo ripete <strong>come l\'hai scritto</strong>, senza cambiare gli indirizzi.'],
      ['Come deve chiamarti', 'Il nome con cui parla di te in chat.'],
      ['Cosa non dire mai di te', 'Una regola: vale sopra tutto il resto.'],
    ] },
    { p: ['Non parte vuota: quando il bot rilegge il tuo profilo riempie <em>chi sei</em>, <em>gli orari</em> e <em>dove ti trovano</em> con quello che trova, e non tocca mai i campi che hai scritto tu.'] },
    { h3: 'Parole da bloccare' },
    { p: ['Sotto la scheda c\'è un elenco a parte: il tuo cognome, la tua via, il nome della scuola. <strong>Non è una richiesta al bot</strong> — «cosa non dire mai di te» lo è, e vale se lui la capisce. Queste sono un blocco: se una finisce in una risposta, la risposta non parte. Non moderano nessuno: valgono solo su quello che dice lui.'] },

    { h2: 'Cosa sa: la conoscenza' },
    { p: ['Sta in <em>Conoscenza</em>. Una voce è una coppia <strong>domanda → risposta</strong>. La domanda può essere una frase o un elenco di parole chiave separate da <code>/</code>: bastano quelle a far scattare la risposta, anche se in chat la domanda arriva scritta in un altro modo.'] },
    { esempio: 'Domanda        che pc usi? / setup / configurazione\nRisposta       Gioco su un Ryzen 7 con una 4070, trovi tutto su andryxify.it!' },
    { p: ['Puoi scriverne quante vuoi: a ogni messaggio il bot riceve le <strong>sei voci più vicine</strong> a quello che gli hanno chiesto, non le ultime che hai scritto.'] },
    { h3: 'Quando vale, e cosa deve sapere sempre' },
    { p: ['Ogni voce può valere <strong>sempre</strong>, <strong>solo quando sei in diretta</strong> (il codice sconto dello sponsor) o <strong>solo quando sei offline</strong> (quando torni). E può essere <strong>fissata</strong>: allora entra comunque, anche se non c\'entra con la domanda — tienile per le due o tre cose che non deve mai ignorare.'] },
    { p: ['Si cambiano dall\'elenco, senza riscrivere la voce.'] },
    { p: ['Le voci non arrivano tutte da te. Nell\'elenco «Cosa sa il bot» ognuna porta la sua <strong>origine</strong>, e l\'origine conta perché decide cosa succede quando azzeri.'] },
    { tabella: [
      ['Origine', 'Da dove viene', 'La cancella «Azzera»?'],
      ['dal sito', 'Letta dal tuo profilo su andryxify.it: bio, orari, social.', 'No'],
      ['tua', 'Scritta a mano da te in questa scheda.', 'No'],
      ['dalla tua pagina link', 'Letta da /u/iltuonome mentre risponde. Non è salvata: si cambia sulla pagina.', 'No'],
      ['imparata dalla chat', 'Dedotta osservando le risposte che tu e i mod date in chat.', 'Sì'],
      ['studiata', 'Quello che si è costruito da sé leggendo e distillando.', 'No'],
    ] },
    { h3: 'La tua pagina link parla al bot' },
    { p: ['Quello che scrivi su <strong>/u/iltuonome</strong> il bot lo legge <strong>mentre risponde</strong>, non una volta ogni tanto: titolo e sottotitolo, i blocchi di testo, i link e i social con la loro etichetta, i conti alla rovescia — e soprattutto i blocchi <strong>FAQ</strong>, che sono già domande e risposte scritte da te.'] },
    { p: ['Cambi la pagina, cambia quello che il bot sa. Non c\'è niente da rifare, e non ci sono doppioni da cancellare: non è una copia, è una lettura. Se spegni la pagina, il bot smette di usarla.'] },
    { h3: 'Il quaderno del bot' },
    { p: ['In fondo alla scheda. Qui non c\'è quello che <em>sa</em>, ma <strong>come deve rispondere</strong>: «quando chiedono del torneo, rimanda al Discord», «se qualcuno è arrabbiato, rispondi corto». Il bot le applica senza citarle.'] },
    { p: ['Ogni riga dice da chi viene. Quando Lia vivrà, ci scriverà anche lei — e quello che non ti convince lo togli, anche se l\'ha messo lei.'] },
    { h3: 'Il pre-addestramento' },
    { p: [
      'Dalla scheda <em>Stato</em> c\'è un tasto che rilegge il tuo profilo pubblico su andryxify.it e ne ricava le voci «dal sito»: <strong>chi sei</strong> (bio o titolo della pagina link), <strong>quando sei in diretta</strong> (programmazione) e <strong>dove ti trovano</strong> (un\'entrata per ogni social). Nello stesso giro riempie i campi vuoti della tua scheda.',
      'Si può rifare quante volte vuoi: riparte pulito, quindi non crea doppioni. Se non hai una pagina pubblica te lo dice invece di inventarsi qualcosa.',
    ] },

    { h2: 'Cosa si ricorda: la memoria' },
    { p: ['Sta in <em>Memoria</em>, dietro il tasto «Mostra la memoria» — non si carica da sola perché è la parte più pesante.'] },
    { tabella: [
      ['Cosa', 'Quanto ne mostra', 'Cos\'è'],
      ['Lezioni', 'le ultime 50', 'Regolarità che ha notato nel canale e da cui si regola.'],
      ['Fatti', 'tutti', 'Cose stabili sul canale: date, nomi, abitudini.'],
      ['Ricordi sugli utenti', '—', 'Cosa sa delle persone che scrivono spesso. Non si sfoglia dal pannello.'],
      ['Contesto della diretta', '—', 'Di cosa si sta parlando adesso. Si consuma da solo.'],
      ['Clip', 'le ultime 20', 'Le clip create in automatico.'],
    ] },
    { h3: 'Azzerare: cosa sparisce e cosa resta' },
    { p: ['Il tasto rosso in fondo cancella <strong>quello che il bot ha dedotto da solo</strong>: lezioni, ricordi sugli utenti, fatti, contesto della diretta e le voci di conoscenza «imparata dalla chat».'] },
    { p: ['<strong>Restano</strong>: la conoscenza scritta da te, quella presa dal sito, quella studiata, i moduli, i comandi, le monete e le classifiche. Non è un tasto che riporta il canale a zero: è un tasto che gli fa dimenticare le conclusioni sbagliate.'] },

    { h2: 'Le statistiche dei sette giorni' },
    { p: ['In cima a <em>Memoria</em>, sempre sugli ultimi sette giorni:'] },
    { ul: [
      '<strong>Messaggi della chat</strong> — quelli delle persone, i suoi non contano.',
      '<strong>Messaggi del bot</strong> — quanto ha parlato lui. Il rapporto fra i due dice se la chat autonoma è tarata bene.',
      '<strong>Top chatter</strong> — le cinque persone che hanno scritto di più.',
      '<strong>Clip</strong> — quante ne ha create in tutto, non solo nella settimana.',
    ] },

    { h2: 'L\'avatar 3D' },
    { p: [
      'È uno schema navigabile del suo cervello: al centro il nucleo, attorno la logica, e nel suo «manuale su come funzionano le persone» le emozioni con i moduli che ha imparato. Si trascina per ruotare, la rotella fa zoom, un clic su un nodo dice cosa fa quel pezzo.',
      'Sotto, «Come ragiona» mostra da quale testa nascono le risposte. Non è una decorazione: se la fetta del modello è grande e quella dei moduli piccola, vuol dire che al canale servono più regole tue — ed è la strada per un bot che sbaglia meno.',
    ] },

    { h2: 'Quando non risponde come vuoi' },
    { ul: [
      '<strong>Parla troppo.</strong> Abbassa la chat autonoma prima di spegnere qualcosa: nove volte su dieci è quella.',
      '<strong>Parla poco.</strong> Controlla che «rispondi quando mi nominano» sia acceso: senza, deve essere chiamato con un comando.',
      '<strong>Dice una cosa sbagliata su di te.</strong> Cercala in <em>Conoscenza</em>. Se l\'origine è «imparata dalla chat» cancella quella voce; se è «dal sito», la correzione va fatta sul profilo e poi si rifà il pre-addestramento.',
      '<strong>Non capisce una domanda scritta storta.</strong> Aggiungi parole chiave alla voce, separate da <code>/</code>: sono alternative, non una frase sola.',
      '<strong>Non suona come te.</strong> Il tono fa metà del lavoro; l\'altra metà sono le tue frasi. Mettine dieci vere e si sente subito.',
    ] },
  ],
  faq: [
    { d: 'Le chat vengono mandate a un servizio esterno?', r: 'No. Il modello che risponde gira sul nostro server. L\'unica cosa che esce, e solo se lasci acceso l\'accesso a internet, è la ricerca di un dubbio su fonti pubbliche gratuite.' },
    { d: 'Se spengo l\'IA locale il bot smette di funzionare?', r: 'No: continuano a funzionare comandi, moduli, moderazione, giochi e conoscenza scritta da te. Sparisce la capacità di capire una domanda formulata in modo diverso da come l\'hai scritta.' },
    { d: 'Il bot impara da solo anche se non faccio niente?', r: 'Sì, se «adatta la personalità al canale» è acceso: osserva come si parla nel tuo canale e ci si avvicina. Tutto quello che deduce sta in Memoria, e da lì si cancella.' },
    { d: 'Un moderatore può cambiare la personalità?', r: 'Un moderatore può occuparsi di comandi, moduli, effetti, giochi, notifiche, regole e memoria. Le cose da proprietario — permessi e abbonamento — no.' },
    { d: 'Perché la conoscenza «dal sito» non si cancella con Azzera?', r: 'Perché non è una deduzione del bot: è un dato tuo, che hai scritto sul tuo profilo. Si cambia dove sta, e poi si rifà il pre-addestramento.' },
  ],
};

const MODERAZIONE = {
  slug: 'moderazione',
  schede: ['regole', 'scudo'],
  titolo: 'Manuale della moderazione: antispam e scudo anti-bot | SocialBot',
  h1: 'Manuale della moderazione: antispam e scudo anti-bot',
  desc: 'Cosa filtra il bot in chat, con quali soglie vere, come cresce il timeout ai recidivi, e come lo scudo para follow-bot e hate-raid senza colpire le persone.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'Due mestieri diversi, due schede. <em>Moderazione</em> tiene pulita la chat di tutti i giorni: spam, link, muri di maiuscole, flood. <em>Scudo</em> serve nei dieci minuti in cui il canale è sotto attacco: follow-bot e hate-raid.',
      'La regola che attraversa tutte e due: <strong>in dubbio si avvisa, non si banna</strong>. Un falso positivo qui vuol dire cacciare una persona vera, e costa più dell\'attacco.',
    ] },

    { h2: 'Chi non viene mai toccato' },
    { p: ['Prima di ogni controllo ci sono le esenzioni, e non si possono togliere: <strong>tu, i moderatori e i VIP</strong> non vengono mai filtrati. I VIP sono esenti da tutto <em>per scelta</em>: quel badge lo dai tu a chi ti fidi.'] },

    { h2: 'L\'antispam: cosa guarda' },
    { p: ['Sta in <em>Moderazione</em>, e si accende con un interruttore solo. Poi si sceglie cosa filtrare, voce per voce. Le soglie sono queste, e sono quelle vere del motore.'] },
    { tabella: [
      ['Filtro', 'Di base', 'Quando scatta'],
      ['Link', 'acceso', 'Chi è sotto il livello che scegli scrive un indirizzo non in lista bianca.'],
      ['Ripetizioni', 'acceso', 'Lo stesso messaggio ripetuto entro 40 secondi.'],
      ['Maiuscole', 'acceso', 'Almeno 12 lettere e l\'80% in maiuscolo. Le frasi corte passano.'],
      ['Menzioni', 'acceso', 'Quattro <code>@nome</code> o più nello stesso messaggio.'],
      ['Flood', 'acceso', 'Sei messaggi o più in otto secondi.'],
      ['Simboli', 'spento', 'ASCII-art, «zalgo», muri di caratteri strani.'],
      ['Messaggio lungo', 'spento', 'Oltre 350 caratteri (regolabile da 50 a 500).'],
      ['Emoji', 'spento', 'Più di 8 emoji (regolabile da 1 a 50).'],
    ] },
    { h3: 'I link e la lista bianca' },
    { p: [
      'Il livello di base è <strong>sub</strong>: abbonati, VIP e mod possono mettere link, gli altri no. Si può alzare a solo-mod o abbassare a tutti.',
      'La <strong>lista bianca</strong> tiene fino a 30 domini che passano sempre, per chiunque. È il posto giusto per il tuo Discord, il tuo sito e i social del canale: senza, il primo che condivide il tuo Discord si prende una cancellazione.',
    ] },
    { h3: 'Il timeout cresce da solo' },
    { p: ['Il primo messaggio filtrato viene solo <strong>cancellato</strong>, senza timeout: la maggior parte delle volte è distrazione, non malafede. Se la persona insiste, la scala sale.'] },
    { tabella: [
      ['Volta', '1ª', '2ª', '3ª', '4ª e oltre'],
      ['Cosa succede', 'solo cancellato', 'solo cancellato', 'timeout 60s', 'timeout 5 min, poi 10 min'],
    ] },
    { p: ['Il contatore <strong>si azzera dopo 10 minuti puliti</strong>: chi ha sbagliato ieri riparte da capo oggi. Il timeout crescente si può spegnere: allora il bot cancella e basta, per sempre.'] },

    { h2: 'Lo scudo anti-bot' },
    { p: ['Sta in <em>Scudo</em>, ed è spento finché non lo accendi (serve il permesso di moderazione di Twitch). Sono cinque difese, messe in ordine di quanto poco rischiano di colpire una persona vera.'] },

    { h3: '1. La raffica di follow' },
    { p: ['Un attacco follow-bot sono tanti follow in pochi secondi: non serve guardarli uno per uno, basta contarli. Di base <strong>10 follow in 30 secondi</strong> fanno scattare l\'allarme (da 3 a 100 follow, da 5 a 300 secondi).'] },
    { p: ['Quando scatta, di base la chat va <strong>ai soli follower</strong> e tu vieni avvisato. <strong>Non banna</strong>: un picco di follow può arrivare anche da una clip virale, e bannare cento persone vere sarebbe peggio dell\'attacco. Bannare l\'ondata si può accendere, ma è una scelta tua e sta scritta come tale.'] },

    { h3: '2. I nomi da bot' },
    { p: ['Una lista di account-bot noti e di forme tipiche dei nomi da follow-bot promozionale, aggiornata da sola. Chi corrisponde viene bannato (o messo in timeout, o solo segnalato: lo scegli tu — se scegli il timeout, di base dura 14 giorni).'] },
    { p: ['I <strong>bot buoni sono sempre esenti</strong> — Nightbot, StreamElements, Streamlabs, Moobot, Fossabot, Sery_Bot, Sound Alerts e una ventina d\'altri — e puoi aggiungere fino a 200 nomi tuoi da esentare, più altrettanti da considerare bot.'] },
    { p: ['Sui follow-bot certi, di base, si usa il <strong>blocco</strong> invece del ban: il blocco toglie anche il follow, quindi il numero sporco non ti resta appeso al canale.'] },

    { h3: '3. L\'account sospetto' },
    { p: ['Spento di base perché costa una domanda a Twitch per ogni follower. Se acceso, dà un punteggio da 0 a 100 guardando l\'età dell\'account (sotto 3 giorni è sospetto), la foto profilo di default, la bio vuota e la forma del nome. Si agisce sopra <strong>70</strong>.'] },

    { h3: '4. Gli account appena creati che scrivono' },
    { p: ['Twitch ha una modalità «Restricted» che nasconde i messaggi dei sospetti a tutti tranne i mod, ma <strong>non ha un\'API</strong>: nessun bot può accenderla. Questa è l\'equivalente più vicino che si può fare da fuori.'] },
    { p: ['Spento di base. Se acceso: chi ha l\'account da meno di <strong>24 ore</strong> (da 1 a 720) e non segue, non è sub, VIP o mod, si vede il messaggio <strong>trattenuto</strong> — oppure solo segnalato ai mod, se preferisci lasciarlo passare.'] },

    { h3: '5. L\'assetto automatico' },
    { p: ['Lo scudo ha tre assetti — <strong>calma</strong>, <strong>sospetto</strong>, <strong>attacco</strong> — e di base si alza e si riabbassa da solo, accendendo anche lo Shield Mode di Twitch quando serve. Non devi essere davanti al computer perché funzioni: è il punto.'] },
    { p: ['Dentro l\'assetto ci sono due cose in più. Il <strong>coro</strong>: lo stesso messaggio da <strong>4 bocche diverse</strong> (da 3 a 20) in pochi secondi non è una coincidenza, è un raid coordinato. E il <strong>blocco sul nascere</strong>: quando l\'ondata è chiaramente artificiale si agisce in blocco invece che uno alla volta, perché uno alla volta si arriva tardi.'] },

    { h2: 'Come tararlo, in pratica' },
    { ul: [
      '<strong>Canale piccolo.</strong> Antispam acceso con i filtri di base, link ai sub, lista bianca col tuo Discord. Scudo acceso con la sola raffica: 10 in 30 secondi è già giusto.',
      '<strong>Canale che cresce in fretta.</strong> Alza la raffica (20 in 30 secondi) o ti avvisa a ogni clip che gira.',
      '<strong>Sotto attacco adesso.</strong> Accendi «banna l\'ondata» e gli account appena creati. Sono le due impostazioni aggressive: si accendono per il tempo dell\'attacco e si rispengono dopo.',
      '<strong>Chat rumorosa ma amichevole.</strong> Spegni maiuscole ed emoji e lascia solo flood, ripetizioni e link: filtrare l\'entusiasmo è il modo più veloce per far sembrare ostile un canale.',
    ] },

    { h2: 'Quando sembra rotto' },
    { ul: [
      '<strong>Non modera nessuno.</strong> Controlla che l\'interruttore dell\'antispam sia acceso e che chi scrive non sia mod o VIP: quelli sono esenti sempre.',
      '<strong>Cancella cose che non dovrebbe.</strong> Guarda quale filtro: il motivo lo scrive in chat se «avvisa» è acceso. Le maiuscole scattano all\'80%, quindi «AHAHAH SIIIII» conta.',
      '<strong>Il tuo Discord viene cancellato.</strong> Mettilo in lista bianca: senza, è un link come un altro.',
      '<strong>Lo scudo non parte.</strong> Serve il permesso di moderazione di Twitch: se manca, si riautorizza dalla scheda Stato.',
      '<strong>Avvisa troppo.</strong> Non è un guasto: è la raffica tarata bassa per il tuo ritmo di crescita. Alza «quanti follow».',
    ] },
  ],
  faq: [
    { d: 'Il bot può bannare una persona vera per sbaglio?', r: 'È il rischio che tutta questa parte è costruita per evitare. Le difese sono ordinate dalla più sicura alla più aggressiva, quelle aggressive sono spente di base, e in dubbio il bot avvisa invece di agire. Le esenzioni (tu, mod, VIP, bot buoni) non si possono aggirare.' },
    { d: 'Serve dare la moderazione al bot?', r: 'No, non come si fa con gli altri bot. SocialBot agisce con i permessi che gli hai dato tu su Twitch, revocabili in qualsiasi momento: non c\'è un account estraneo da promuovere moderatore.' },
    { d: 'Lo scudo funziona se non sono davanti al PC?', r: 'Sì, ed è il motivo per cui l\'assetto automatico è acceso di base: si alza da solo durante l\'attacco e si riabbassa quando è finito.' },
    { d: 'Posso far moderare solo durante la diretta?', r: 'L\'antispam lavora sempre, perché una chat sporca a canale spento resta sporca. Se non lo vuoi, si spegne.' },
    { d: 'Che differenza c\'è fra ban e blocco?', r: 'Il ban impedisce di scrivere; il blocco toglie anche il follow. Sui follow-bot certi il bot usa il blocco, così il conteggio dei follower torna pulito.' },
  ],
};

const INTERAZIONE = {
  slug: 'interazione',
  schede: ['sondaggi', 'giveaway', 'penitenze'],
  titolo: 'Manuale di sondaggi, sorteggi e penitenze | SocialBot',
  h1: 'Manuale di sondaggi, sorteggi e penitenze',
  desc: 'Le tre cose che si fanno mentre sei in diretta: chiedere alla chat, sorteggiare un premio con probabilità che decidi tu, e le penitenze a punti canale che si contano da sole.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'Tre schede che servono <strong>mentre trasmetti</strong>, non prima. Si comandano quasi tutte dalla chat, perché mentre giochi non stai guardando il pannello.',
      'Hanno un tratto in comune: il bot fa la parte noiosa — contare, pesare, estrarre, ascoltare — e tu fai lo spettacolo.',
    ] },

    { h2: 'Sondaggi e predizioni' },
    { p: ['Sono i sondaggi e le predizioni <strong>veri di Twitch</strong>, quelli che compaiono sopra il player, aperti dalla chat senza toccare il pannello. Li può usare chi modera, oltre a te.'] },
    { tabella: [
      ['Comando', 'Chi', 'Cosa fa'],
      ['<code>!sondaggio Domanda | opzione | opzione</code>', 'mod e streamer', 'Apre un sondaggio. Due opzioni o più, separate da <code>|</code>.'],
      ['<code>!sondaggio chiudi</code>', 'mod e streamer', 'Chiude quello aperto.'],
      ['<code>!predizione Titolo | esito | esito</code>', 'mod e streamer', 'Apre una predizione: il pubblico punta i punti canale.'],
      ['<code>!predizione vince &lt;esito&gt;</code>', 'mod e streamer', 'Risolve. Si può indicare l\'esito per nome o per numero.'],
      ['<code>!predizione annulla</code>', 'mod e streamer', 'Annulla e <strong>rimborsa</strong> i punti a tutti.'],
    ] },
    { p: ['Durano <strong>2 minuti</strong> di base. <code>!poll</code>, <code>!prediction</code> e <code>!pronostico</code> funzionano come alias.'] },
    { p: ['Una predizione va sempre chiusa: se la lasci aperta i punti restano bloccati e il pubblico se ne accorge. Se l\'esito non è più decidibile, <code>annulla</code> è la mossa giusta — rimborsa tutti e nessuno si arrabbia.'] },

    { h2: 'Sorteggi' },
    { p: ['Uno per canale alla volta, e vive nella diretta: non sopravvive a un riavvio, di proposito. Si comanda dalla chat o dal pannello, indifferentemente.'] },
    { tabella: [
      ['Comando', 'Chi', 'Cosa fa'],
      ['<code>!giveaway &lt;premio&gt;</code>', 'mod e streamer', 'Apre il sorteggio e annuncia il premio.'],
      ['<code>!join</code>', 'tutti', 'Entra. La parola si può cambiare (fino a 20 caratteri).'],
      ['<code>!biglietti @nome N</code>', 'mod e streamer', 'Regala biglietti in più a una persona.'],
      ['<code>!estrai</code>', 'mod e streamer', 'Estrae un vincitore. <code>!estrai 3</code> ne estrae tre, senza ripescare.'],
    ] },
    { h3: 'Le probabilità le decidi tu' },
    { p: ['Ogni partecipante ha dei <strong>biglietti</strong>, e l\'estrazione è pesata: più biglietti, più probabilità — ma <strong>nessuno vince di sicuro</strong>. È la differenza fra premiare chi ti sostiene e regalare il premio al sub più veloce.'] },
    { tabella: [
      ['Chi', 'Biglietti di base', 'Limiti'],
      ['Tutti', '1', '—'],
      ['Abbonati', '2', 'da 1 a 20'],
      ['VIP', '2', 'da 1 a 20'],
      ['Moderatori', '1', 'da 1 a 20'],
      ['Bonus a mano', '—', 'con <code>!biglietti</code>, quanti vuoi'],
    ] },
    { p: ['I moderatori partono da 1 di proposito: di solito gestiscono il sorteggio, non ci partecipano. Si può alzare, se nel tuo canale è normale che giochino anche loro.'] },
    { p: ['Si può anche aprirlo <strong>solo per abbonati</strong>. In quel caso non è più un sorteggio pesato: è un sorteggio chiuso, e conviene dirlo in chat prima che qualcuno provi a entrare.'] },

    { h2: 'Penitenze a punti canale' },
    { p: [
      'Uno spettatore riscatta un premio a punti canale e sceglie una parola. Da quel momento, per il tempo che dura, il bot <strong>ti ascolta</strong> e conta.',
      'Ci sono due modi. <strong>Vieta</strong>: quella parola non la devi dire, e ogni volta che ti scappa è +1. <strong>Solo</strong>: puoi dire <em>solo</em> quella parola, e ogni frase in cui ne dici un\'altra è +1.',
    ] },
    { p: ['Durante il tempo, nell\'overlay compaiono i <strong>«+1» rossi</strong>. Alla fine, se il contatore è sopra zero, parte <strong>una</strong> penitenza — presa dalla tua lista o scelta dal bot — «moltiplicata» per quante volte ci sei cascato. Una penitenza sola, non venti: venti sarebbe una serata rovinata, una è un gioco.'] },
    { tabella: [
      ['Cosa', 'Di base', 'Limiti'],
      ['Durata', '2 minuti', 'da 1 a 15'],
      ['Su cosa', 'una parola', 'una parola o una lettera'],
      ['Modo', 'vieta', 'vieta · solo'],
    ] },
    { h3: 'Perché non sbaglia (quasi mai)' },
    { p: ['Il riconoscimento vocale sente male: è normale. La corrispondenza è quindi <strong>tollerante</strong> — una parola capita a metà ma sostanzialmente giusta conta, una parola diversa che ci somiglia per caso no. Senza questa tolleranza il gioco si romperebbe al primo rumore di sottofondo.'] },
    { p: ['Serve il microfono, quindi vale quello che vale per i comandi a voce: l\'audio resta sul tuo computer, il bot riceve solo la parola riconosciuta.'] },

    { h2: 'Quando qualcosa non parte' },
    { ul: [
      '<strong>Il sondaggio non si apre.</strong> Servono i permessi di Twitch per sondaggi e predizioni: si riautorizza dalla scheda Stato. E servono almeno due opzioni separate da <code>|</code>.',
      '<strong>Nessuno entra nel sorteggio.</strong> Controlla la parola d\'ingresso: se l\'hai cambiata, in chat va scritta quella, non <code>!join</code>.',
      '<strong>Ho estratto e ha vinto sempre lo stesso.</strong> Guarda i biglietti: con i moltiplicatori alti un gruppo piccolo di sub domina. Portali a 1 e diventa un sorteggio piatto.',
      '<strong>La penitenza non conta.</strong> Il microfono deve essere concesso al browser e la scheda dei comandi a voce deve stare aperta: è lì che gira l\'ascolto.',
      '<strong>Conta parole che non ho detto.</strong> Le lettere sono più fragili delle parole: con una lettera sola il riconoscimento sbaglia spesso. Per le penitenze lunghe conviene una parola intera.',
    ] },
  ],
  faq: [
    { d: 'I sondaggi sono quelli di Twitch o una cosa vostra?', r: 'Quelli di Twitch, veri: compaiono sopra il player come se li avessi aperti tu dalla dashboard. Il bot li apre e li chiude al posto tuo, dalla chat.' },
    { d: 'Il sorteggio resta se si riavvia qualcosa?', r: 'No, e non è un difetto: un sorteggio appartiene alla diretta in cui lo hai aperto. Se serve una raccolta che dura giorni, si fa con un comando e un contatore.' },
    { d: 'Posso estrarre più vincitori insieme?', r: 'Sì, con !estrai 3. Non ripesca: tre persone diverse.' },
    { d: 'Le penitenze funzionano senza punti canale?', r: 'Il modo previsto è il premio a punti canale, perché è quello che dà la spinta al pubblico. La prova dal pannello serve a vedere come appare in overlay.' },
    { d: 'Il bot mi ascolta sempre?', r: 'No. Ascolta solo mentre una penitenza è in corso o mentre usi i comandi a voce, e l\'audio non esce dal tuo computer: viene trasformato in testo lì e arriva solo la parola.' },
  ],
};

const DIRETTA = {
  slug: 'diretta',
  schede: ['regia', 'ascolto', 'clip', 'musica'],
  titolo: 'Manuale della diretta: regia, clip, musica e comandi a voce | SocialBot',
  h1: 'Manuale della diretta: regia, clip, musica e comandi a voce',
  desc: 'Comandare il canale senza aprire Twitch, far nascere le clip da sole, le richieste musicali e i comandi a voce.',
  aggiornata: OGGI,
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

const VETRINA = {
  slug: 'vetrina',
  schede: ['pagina', 'grafiche', 'notifiche'],
  titolo: 'Manuale della vetrina: pagina link, grafiche e notifiche social | SocialBot',
  h1: 'Manuale della vetrina: pagina link, grafiche e notifiche social',
  desc: 'La pagina pubblica da mettere in bio, le due grafiche pronte da pubblicare e gli avvisi automatici quando vai in diretta o pubblichi qualcosa.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'Tre schede che lavorano <strong>fuori dalla diretta</strong>: dove ti trovano, cosa vedono, e come sanno che sei partito.',
      'Sono la parte che si configura una volta e poi lavora da sola per mesi — motivo per cui vale la pena farla bene subito.',
    ] },

    { h2: 'La pagina link' },
    { p: ['Una pagina pubblica all\'indirizzo <code>socialbot.live/u/&lt;tuonome&gt;</code>, da mettere nella bio di Instagram o TikTok. La <strong>foto la prendo dal tuo profilo Twitch</strong>: non devi caricare niente.'] },
    { p: ['È fatta per stare in una bio, quindi è costruita per una cosa sola: <strong>aprirsi subito su una connessione mobile scadente</strong>. Nessuno script, nessun font remoto, niente da scaricare — funziona anche a JavaScript spento e le anteprime dei social la leggono bene.'] },
    { h3: 'I blocchi' },
    { p: ['La pagina si compone a blocchi, che si riordinano trascinandoli.'] },
    { tabella: [
      ['Blocco', 'Cosa mette'],
      ['Link', 'Un pulsante con etichetta e indirizzo. L\'icona giusta la riconosco dall\'indirizzo.'],
      ['Titolo', 'Una intestazione per separare le sezioni.'],
      ['Testo', 'Un paragrafo libero.'],
      ['Separatore', 'Una riga di respiro.'],
      ['Social', 'La fila di icone dei tuoi profili.'],
      ['Embed', 'Video e musica: YouTube, Spotify, TikTok.'],
      ['Immagine', 'Una tua immagine.'],
      ['La mia diretta', 'Il player: resta lì e dice da sé se sei online o no.'],
    ] },
    { p: ['Il blocco «La mia diretta» è quello che cambia di più la pagina: chi arriva dalla bio non deve chiedersi se sei live, lo vede.'] },
    { h3: 'L\'aspetto' },
    { ul: [
      '<strong>Sette temi</strong>: minimal, neon, retro, sunset, glass, brutal, pastello.',
      '<strong>Sei famiglie di carattere</strong>: di sistema, inter, mono, serif, condensato, tondo.',
      '<strong>Ventitré icone</strong> a tratto, che prendono il colore del tema.',
    ] },
    { p: ['Le icone sono disegni, non emoji, <strong>di proposito</strong>: le emoji cambiano forma su ogni sistema operativo — su Linux diventano grigie e sfocate — e non si possono colorare. Su una pagina che deve sembrare tua sono un difetto, non una scorciatoia.'] },
    { p: ['C\'è un\'anteprima: salvi e la apri, così vedi la pagina com\'è davvero prima di metterla in bio.'] },

    { h2: 'Le grafiche social' },
    { p: ['Due grafiche pronte da pubblicare, che si scaricano in PNG: la <strong>programmazione settimanale</strong> e il <strong>«Live ora»</strong>. Le impostazioni restano salvate, quindi la settimana dopo cambi due date e riscarichi.'] },
    { p: ['I temi sono cinque — notte, neon, tramonto, pastello, minimal — e si personalizza tutto: testi, colori, giorni, orari. L\'anteprima è dal vivo: quello che vedi è il PNG che esce.'] },
    { p: ['Su telefono l\'anteprima resta appiccicata in alto mentre scorri i controlli, così non devi fare avanti e indietro per vedere l\'effetto di una modifica.'] },

    { h2: 'Le notifiche' },
    { p: ['Avvisare che sei partito, e avvisare che hai pubblicato. Ogni rete si accende da sola e ha il suo messaggio: puoi lasciare quello di base o scriverne uno tuo.'] },
    { h3: 'Telegram' },
    { p: ['Qui il bot è <strong>tuo</strong>: lo crei tu, le chiavi sono tue e restano tue. Tre passi.'] },
    { ul: [
      'Su Telegram apri <strong>@BotFather</strong>, scrivi <code>/newbot</code>, segui le istruzioni e copia il <em>token</em>.',
      'Incolla il token nel pannello e premi <em>Collega</em>.',
      'Aggiungi il bot al tuo gruppo, scrivici dentro <code>/collega</code>, poi premi <em>Rileva gruppo</em>.',
    ] },
    { p: ['Da quel momento, quando vai live il gruppo lo sa. Il terzo passo è quello che si dimentica: senza <code>/collega</code> scritto <em>dentro</em> al gruppo, il bot non sa dove scrivere.'] },
    { h3: 'TikTok, YouTube, Instagram' },
    { tabella: [
      ['Rete', 'Cosa serve', 'Cosa avvisa'],
      ['TikTok', 'il tuo nome utente', 'quando vai in diretta lì, e quando pubblichi un video'],
      ['YouTube', 'il canale (<code>@nome</code>)', 'quando esce un video nuovo'],
      ['Instagram', 'il collegamento del profilo', 'quando esce un post nuovo'],
    ] },
    { p: ['Ogni avviso può anche <strong>uscire nella tua chat Twitch</strong>: è la parte che di solito conviene di più, perché chi ti sta già guardando è il pubblico più facile da portare sull\'altra piattaforma.'] },

    { h2: 'Quando qualcosa non si vede' },
    { ul: [
      '<strong>La pagina è vuota.</strong> Va <em>pubblicata</em>: finché non lo è, l\'indirizzo risponde ma non mostra niente.',
      '<strong>La foto non c\'è.</strong> Arriva dal profilo Twitch: se l\'hai appena cambiata lì, ci mette un po\'.',
      '<strong>L\'icona del link è sbagliata.</strong> Si ricava dall\'indirizzo: se il link passa da un accorciatore, l\'indirizzo vero non si vede e resta l\'icona generica.',
      '<strong>Telegram non scrive.</strong> Il bot deve essere <em>dentro</em> al gruppo e il <code>/collega</code> va scritto lì, non in privato.',
      '<strong>L\'avviso live non parte.</strong> Controlla che la rete sia accesa: collegata e accesa sono due cose diverse.',
      '<strong>La grafica esce sfocata.</strong> Scaricala di nuovo dopo aver chiuso l\'anteprima: il PNG esce alla risoluzione piena, non a quella che vedi a schermo.',
    ] },
  ],
  faq: [
    { d: 'La pagina link è come Linktree?', r: 'Fa la stessa cosa, ma è servita dal nostro server come pagina già pronta: si apre in un istante anche con poca rete, e il blocco della diretta dice da sé se sei online.' },
    { d: 'Posso usare un mio dominio?', r: 'L\'indirizzo è <code>socialbot.live/u/&lt;tuonome&gt;</code>. Nella bio si mette quello.' },
    { d: 'Le chiavi di Telegram le vedete voi?', r: 'Il token serve al server per parlare col tuo bot ed è tuo: puoi revocarlo da BotFather quando vuoi, e da lì il collegamento smette di funzionare.' },
    { d: 'Perché sulla pagina pubblica non ci sono emoji?', r: 'Perché cambiano forma su ogni sistema e non si possono colorare. Le icone sono disegni monocromatici che seguono il tema.' },
    { d: 'Le grafiche si aggiornano da sole ogni settimana?', r: 'No: restano salvate, ma il PNG lo scarichi tu quando la programmazione cambia. È una grafica da pubblicare, non un widget.' },
  ],
};

const ACCOUNT = {
  slug: 'account',
  schede: ['sottoscrizione'],
  titolo: 'Manuale dell\'abbonamento: piani, extra e moderatori | SocialBot',
  h1: 'Manuale dell\'abbonamento: piani, extra e moderatori',
  desc: 'Cosa è gratis per sempre, cosa aggiungono i singoli extra, come si cambia o si disdice, e cosa succede a quello che hai creato.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'La regola: <strong>l\'Essenziale è gratis e resta gratis</strong>, senza carta. Il resto si aggiunge <em>uno per uno</em>, quando serve, e si toglie quando non serve più.',
      'Niente pacchetti che ti fanno pagare sei cose per averne una.',
    ] },

    { h2: 'Cosa c\'è nell\'Essenziale' },
    { ul: [
      'Il bot che scrive in chat <strong>col tuo account</strong>.',
      '<strong>Comandi e moduli illimitati</strong>, con tutte le azioni.',
      '<strong>Moderazione</strong> completa e <strong>scudo anti-bot</strong>.',
      '<strong>Overlay</strong> per la diretta e <strong>contatori</strong> a schermo.',
      'Personalità, conoscenza, memoria, pagina link e grafiche.',
    ] },
    { p: ['Non è una prova a tempo e non chiede una carta: è il piano su cui il prodotto sta in piedi da solo.'] },

    { h2: 'Gli extra' },
    { p: ['Ogni extra accende una parte precisa. Il prezzo aggiornato sta nella scheda: qui c\'è <strong>cosa fa</strong>, che è la cosa che non cambia.'] },
    { tabella: [
      ['Extra', 'Cosa accende', 'Se lo spegni'],
      ['Base', 'Avvisi di diretta e nuovi post sulle altre reti, e un moderatore.', 'Gli avvisi non partono più; le impostazioni restano.'],
      ['Giochi & Classifiche', 'Minigiochi, monete, classifiche, premio VIP, sorteggi.', 'I comandi di gioco diventano inerti; monete e classifica restano ferme, non si azzerano.'],
      ['Effetti & Punti canale', 'Alert ed effetti riscattabili a punti canale, sondaggi e predizioni.', 'Gli effetti restano caricati ma non partono più.'],
      ['Clip Automatiche', 'I momenti migliori clippati da soli.', 'Le clip già fatte restano; smette di farne di nuove.'],
      ['Comandi Vocali', 'Guidare il bot parlando, e il cambio categoria a voce.', 'I moduli con innesco vocale restano scritti ma non scattano.'],
      ['Squadra', 'Fino a dieci moderatori sul pannello.', 'Resta il numero di moderatori dell\'Essenziale.'],
      ['Richieste Musicali', 'Canzoni in coda su Spotify con <code>!sr</code>.', '<code>!sr</code> non risponde più; Spotify resta collegato.'],
    ] },
    { p: ['Il principio è sempre lo stesso: <strong>spegnere un extra non cancella niente di tuo</strong>. Comandi, monete, effetti caricati, classifiche e impostazioni restano dove sono, e riaccendendo l\'extra ritrovi tutto com\'era.'] },

    { h2: 'Cambiare, mettere in pausa, disdire' },
    { p: ['Il tasto «Gestisci» apre il <strong>portale dei pagamenti</strong>: fatture, carta e disdetta stanno lì. Non serve scriverci: la disdetta è un pulsante.'] },
    { p: ['Se disdici, l\'abbonamento resta attivo <strong>fino alla fine del periodo già pagato</strong>, poi il canale torna all\'Essenziale. Niente si cancella.'] },

    { h2: 'Moderatori' },
    { p: ['Un moderatore entra nel pannello con il <strong>suo</strong> account — Twitch o Kick — e può occuparsi di comandi, moduli, effetti, giochi, notifiche, regole e memoria. Non può toccare le cose da proprietario: permessi, abbonamento, chiave del canale.'] },
    { p: ['Le strade per farlo entrare sono <strong>due</strong>, e vanno nei due versi opposti.'] },
    { ul: [
      '<strong>L\'invito</strong>: scegli la piattaforma, scrivi il suo nome e nasce un indirizzo. Chi lo apre entra, e da quel momento vedi il tuo canale anche dal suo pannello.',
      '<strong>La richiesta</strong>: chi ti modera già sul canale può chiedere lui l\'accesso, senza aspettare il tuo link. La trovi nella scheda, e decidi tu.',
    ] },
    { p: ['Su Twitch la richiesta arriva <strong>già confermata</strong>: prima di mostrartela chiediamo a Twitch chi modera il tuo canale, e se quella persona non c\'è la richiesta non parte nemmeno. Su Kick e YouTube la conferma automatica non è possibile — l\'elenco dei moderatori non è pubblico — quindi la richiesta ti arriva marcata «da controllare tu», e il nome lo guardi con i tuoi occhi.'] },
    { p: ['Una richiesta in attesa <strong>non è un moderatore</strong>: non vede niente, non tocca niente e non occupa un posto del tuo piano finché non le dici di sì. Se dici di no, quella persona non può richiederti di nuovo per un mese.'] },

    { h2: 'Domande che arrivano quando si guarda il prezzo' },
    { ul: [
      '<strong>Il bot smette se non pago?</strong> No. L\'Essenziale non scade.',
      '<strong>Serve la carta per registrarsi?</strong> No, e nemmeno per usare l\'Essenziale.',
      '<strong>Posso accendere un extra per un mese solo?</strong> Sì: si accende e si spegne quando vuoi, e quello che hai creato resta.',
    ] },
  ],
  faq: [
    { d: 'Che succede ai miei comandi se torno all\'Essenziale?', r: 'Restano tutti. Quelli che dipendono da un extra spento non scattano, ma non vengono cancellati: riaccendendo l\'extra ripartono da soli.' },
    { d: 'Le monete degli spettatori si perdono?', r: 'No. La classifica si ferma dov\'è e riprende da lì.' },
    { d: 'Un moderatore vede i miei dati di pagamento?', r: 'No. Il portale dei pagamenti e i permessi Twitch sono cose da proprietario.' },
    { d: 'Uno sconosciuto può chiedermi di moderare il mio canale?', r: 'Su Twitch no: prima di farti arrivare la richiesta chiediamo a Twitch chi modera il tuo canale, e chi non c\'è viene fermato lì. Su Kick la richiesta può arrivare da chiunque, perché Kick non pubblica quell\'elenco: per questo te la mostriamo marcata «da controllare tu», e finché non dici di sì quella persona non vede niente. Ognuno può avere al massimo tre richieste in attesa in tutto.' },
    { d: 'Moderavo già un canale: devo aspettare che mi mandi il link?', r: 'No. Nella scheda Stato scrivi il nome del canale che moderi e mandi la richiesta. Se il canale è su Twitch la conferma è automatica, e allo streamer arriva già verificata.' },
    { d: 'Posso avere il bot su due canali?', r: 'Ogni canale ha il suo abbonamento, perché ogni canale ha la sua chat, le sue monete e i suoi comandi.' },
    { d: 'Dove vedo quanto pago davvero?', r: 'Nella scheda Abbonamento in cima, e nel portale dei pagamenti con le fatture.' },
  ],
};

const EMOTE = {
  slug: 'emote',
  schede: ['emote'],
  titolo: 'Manuale delle emote 7TV: gestirle dal bot | SocialBot',
  h1: 'Manuale delle emote 7TV',
  desc: 'Collegare il proprio account 7TV, aggiungere e togliere emote dal set del canale, rinominarle, e caricare una GIF o un video trasformandolo in emote animata.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'Le emote del tuo canale su <strong>7TV</strong> si gestiscono da qui: aggiungerle, toglierle, rinominarle, e perfino crearne di nuove da una GIF o da un video. Senza aprire 7tv.app.',
      'Le stesse emote compaiono anche nella <strong>chat a schermo</strong> del tuo overlay, quindi chi guarda le vede come le vedi tu.',
    ] },

    { h2: 'Collegare il tuo account' },
    { p: [
      'Il set di emote del canale appartiene <strong>al tuo account 7TV</strong>: solo lui può modificarlo. Per questo serve il tuo <em>token</em>, che si copia da 7tv.app e si incolla qui una volta sola.',
      'Il token <strong>resta sul server</strong> e non viene mai mandato al browser. Il bot parla solo con gli indirizzi ufficiali di 7TV, non con indirizzi che gli passi tu: non c\'è un modo per fargli chiamare qualcos\'altro.',
    ] },

    { h2: 'Le tue emote' },
    { p: ['Il set attivo del canale, come lo vede la chat. Da ogni emote puoi:'] },
    { ul: [
      '<strong>Rinominarla</strong> nel tuo canale — l\'alias. L\'emote resta quella dell\'autore, ma da te si scrive come vuoi tu.',
      '<strong>Toglierla</strong> dal set.',
    ] },
    { p: ['Le animate sono segnate con un\'etichetta, così non devi indovinare guardando un fermo immagine.'] },

    { h2: 'Aggiungerne' },
    { p: ['Tre strade, in ordine di quanto sono comode.'] },
    { tabella: [
      ['Come', 'Quando serve', 'Nota'],
      ['Cerca', 'Vuoi un\'emote che esiste già.', 'Cerca nella directory pubblica di 7TV, si aggiunge con un clic.'],
      ['Link o ID', 'L\'hai vista in un altro canale.', 'Si incolla l\'indirizzo <code>7tv.app/emotes/…</code>. L\'alias è facoltativo.'],
      ['Carica un file', 'L\'emote non esiste: la fai tu.', 'Immagine, GIF o video.'],
    ] },
    { h3: 'Caricare una GIF o un video' },
    { p: ['È la parte che di solito costa più fatica altrove, e qui la fa il bot: prendi un file e lo <strong>convertiamo noi</strong> nel formato che 7TV vuole — WebP animato, con la trasparenza dov\'era.'] },
    { ul: [
      '<strong>I video diventano emote animate.</strong>',
      '<strong>Le GIF trasparenti restano trasparenti</strong>: è il dettaglio che di solito si perde convertendo a mano.',
      'Durata massima circa <strong>6 secondi</strong>, ridimensionata in automatico.',
      'Il file può pesare fino a <strong>8 MB</strong>.',
    ] },
    { p: ['Il <strong>nome</strong> è quello con cui l\'emote nasce su 7TV (senza spazi); l\'<strong>alias</strong> è come si scrive nel tuo canale. Se lasci vuoto l\'alias, vale il nome.'] },

    { h2: 'Quando non funziona' },
    { ul: [
      '<strong>Dice che non sei collegato.</strong> Il token di 7TV scade e va rincollato: è normale, non è un guasto.',
      '<strong>Aggiungo un\'emote e in chat non si vede.</strong> Twitch e 7TV tengono la loro copia per qualche minuto. Si vede prima nell\'overlay che in chat.',
      '<strong>Il caricamento viene rifiutato.</strong> Quasi sempre è la durata: oltre i sei secondi circa 7TV non la prende. Taglia il video prima.',
      '<strong>L\'alias non si applica.</strong> Un alias già usato da un\'altra emote del set non si può ripetere: due emote con lo stesso nome in chat sarebbero indistinguibili.',
      '<strong>Il set è pieno.</strong> Quanti posti hai dipende dal tuo livello su 7TV, non da noi: si libera togliendo un\'emote.',
    ] },
  ],
  faq: [
    { d: 'Serve un abbonamento a 7TV?', r: 'No per collegare l\'account. Quanti posti ha il tuo set di emote lo decide 7TV in base al tuo livello lì.' },
    { d: 'Il mio token 7TV è al sicuro?', r: 'Resta sul server, non passa mai dal browser, e il bot lo usa solo verso gli indirizzi ufficiali di 7TV. Da 7tv.app puoi revocarlo quando vuoi.' },
    { d: 'Se tolgo un\'emote la perdo?', r: 'No: esce dal tuo set, ma resta su 7TV. Si può rimettere.' },
    { d: 'Posso trasformare una clip in emote?', r: 'Sì: carichi il video e lo convertiamo noi. Sotto i sei secondi circa, altrimenti 7TV la rifiuta.' },
    { d: 'Le emote si vedono anche nell\'overlay?', r: 'Sì, nella chat a schermo: sono le stesse del canale, lette da 7TV.' },
  ],
};

const OVERLAY = {
  slug: 'overlay',
  schede: ['alert', 'effetti'],
  titolo: 'Manuale dell\'overlay: alert, chat, obiettivo e contatori | SocialBot',
  h1: 'Manuale dell\'overlay',
  desc: 'Cosa può comparire sulla diretta, con i valori di base e i limiti veri: alert degli eventi, chat a schermo, obiettivo, contatori, ultimo follower e sub, effetti.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'L\'overlay è <strong>una pagina web</strong>. In OBS si mette come sorgente <em>Browser</em>, e da quel momento tutto quello che decidi nel pannello compare sulla diretta senza toccare più niente lì dentro.',
      'Si compone nella scheda <em>Overlay Studio</em>, e si vede subito mentre lo cambi.',
    ] },

    { h2: 'I sette elementi' },
    { p: ['Tutto quello che può comparire è un <strong>elemento della scena</strong>: si accende, si sposta e si veste dallo stesso posto. Non ci sono cose che seguono regole proprie.'] },
    { tabella: [
      ['Elemento', 'Cos\'è', 'Dove sta di serie'],
      ['Alert eventi', 'Un cartello animato con suono quando arriva un follow, un sub, dei bit o un raid.', 'in alto al centro'],
      ['Chat a schermo', 'I messaggi della chat, con emote e badge.', 'in basso a sinistra'],
      ['Ultimo follower', 'Una pastiglia col nome di chi ha seguito per ultimo.', 'in basso a destra'],
      ['Ultimo sub', 'La stessa cosa per l\'ultimo abbonato.', 'in basso a destra'],
      ['Obiettivi', 'Barre che si riempiono mentre arrivano follower, sub o bit. Quanti ne vuoi.', 'dove li metti tu'],
      ['Contatori', 'I numeri che tu e i mod muovete in chat: morti, tentativi, quello che vuoi.', 'dove li metti tu'],
      ['Player musica', 'Quello che stai ascoltando su Spotify: copertina, titolo e avanzamento.', 'in basso a sinistra'],
      ['Conto alla rovescia', 'Quanto manca all\'inizio della diretta.', 'in alto a destra'],
      ['Effetti & suoni', 'Immagini, video e suoni che partono da un comando o da un premio a punti.', 'al centro'],
    ] },
    { p: ['Sulla tela dello Studio ci sono <strong>tutti</strong>, obiettivi e contatori compresi: quello che vedi lì è quello che va in onda, nello stesso punto.'] },

    { h2: 'Il banco di regia' },
    { p: ['A sinistra i <strong>livelli</strong> (l\'elenco di quello che c\'è, con l\'occhio per toglierlo da questo overlay), al centro la <strong>tela</strong> 1920×1080, a destra le <strong>proprietà</strong> di quello che hai scelto: posizione, dimensione, rotazione e tutto il suo aspetto. Le due sponde si arrotolano per dare spazio alla tela, si staccano trascinandole per la testa e si riagganciano con un doppio clic.'] },
    { tabella: [
      ['Per fare', 'Come'],
      ['Spostare', 'Trascina. Si aggancia da solo ai bordi, ai centri e agli altri elementi; <strong>Alt</strong> mentre trascini toglie l\'aggancio.'],
      ['Spostare al pixel', 'Frecce. Con <strong>Maiusc</strong> vanno dieci volte più in là.'],
      ['Ridimensionare', 'La maniglia in basso a destra, la <strong>rotellina</strong>, o il numero nelle proprietà.'],
      ['Ruotare', 'La maniglia col cerchio, <strong>Maiusc+rotellina</strong>, o i gradi nelle proprietà.'],
      ['Allineare', 'I sei pulsanti in alto: bordi e centri della tela.'],
      ['Tornare com\'era', '<strong>Ctrl+Z</strong> e <strong>Ctrl+Y</strong>, o le due frecce in alto a sinistra.'],
      ['Rimettere a posto', '<strong>Doppio clic</strong> sull\'elemento: torna nel suo angolo di serie.'],
      ['Vedere com\'è dal vivo', 'La spunta <strong>Dal vivo</strong>: alert e chat finti che si susseguono mentre lavori.'],
    ] },
    { p: ['Gli angoli della tela sono gli stessi dell\'overlay vero (un dito dai bordi), quindi un elemento «in alto a destra» sta a filo dello schermo anche in OBS. Il salvataggio è automatico: la posizione si scrive appena molli il mouse.'] },

    { h2: 'Metterlo in OBS' },
    { ul: [
      '<strong>Sorgenti → + → Browser.</strong>',
      'Incolla il link e metti <strong>1920 × 1080</strong>.',
      'Spunta <strong>«Aggiorna browser quando la scena diventa attiva»</strong>.',
    ] },
    { p: [
      'Puoi averne <strong>più d\'uno</strong>: ogni overlay ha il suo link, il suo elenco di elementi e il suo stile. Un overlay «solo alert» in una scena e uno «solo chat» in un\'altra è la ragione per cui esistono.',
      '<strong>Il link è un segreto.</strong> Chi ce l\'ha può far comparire cose nel tuo overlay: non va in un video, in uno screenshot o in una chat.',
    ] },

    { h2: 'Alert eventi' },
    { p: ['Quattro eventi, ognuno con il suo interruttore, il suo testo, il suo suono e il suo colore.'] },
    { tabella: [
      ['Evento', 'Testo di serie', 'Suono', 'Parole che puoi usare'],
      ['Follow', '<code>{user} ha seguito il canale!</code>', 'campanello', '<code>{user}</code>'],
      ['Sub', '<code>{user} si è abbonato! ({mesi} mesi)</code>', 'tada', '<code>{user}</code> <code>{mesi}</code>'],
      ['Bit', '<code>{user} ha lanciato {bits} bit!</code>', 'moneta', '<code>{user}</code> <code>{bits}</code>'],
      ['Raid', '<code>{user} è arrivato in raid con {viewers} spettatori!</code>', 'trombetta', '<code>{user}</code> <code>{viewers}</code>'],
    ] },
    { p: ['Bit e raid hanno una <strong>soglia</strong>: sotto quel numero l\'alert non parte. È il modo di non far suonare il campanello per un bit solo.'] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti'],
      ['Durata', '6 secondi', '—'],
      ['Posizione', 'in alto al centro', 'alto · centro · basso, oppure dove lo trascini'],
      ['Dimensione del testo', '27', '—'],
      ['Opacità dello sfondo', '88%', '—'],
      ['Angoli', '18px', '—'],
      ['Cornice', '2px, accesa', '—'],
      ['Icona', 'accesa, 46px', '—'],
      ['Volume', '100%', 'per evento'],
    ] },
    { p: ['Lo stile è comune ai quattro (forma, materia, cornice, composizione, animazione), il <strong>colore d\'accento</strong> no: è per evento, così a colpo d\'occhio si riconosce cosa è appena successo.'] },

    { h2: 'Chat a schermo' },
    { tabella: [
      ['Impostazione', 'Di base', 'Cosa fa'],
      ['Righe visibili', '8', 'Quante ne resta a schermo prima che scorrano via.'],
      ['Dissolvenza', 'spenta', 'Se acceso, ogni riga sparisce dopo i secondi che scegli.'],
      ['Larghezza', '30%', 'Quanto è larga la colonna.'],
      ['Opacità', '78%', 'Lo sfondo delle righe.'],
      ['Colore dei nomi', 'quello di Twitch', 'Oppure uno fisso, se preferisci un look uniforme.'],
    ] },
    { p: ['Le emote di Twitch e quelle 7TV del tuo canale compaiono come immagini, e i badge accanto al nome. Le emote 7TV si gestiscono da <em>Emote (7TV)</em>.'] },

    { h2: 'Gli obiettivi' },
    { p: ['Barre che si riempiono da sole. <strong>Quanti ne vuoi</strong> (fino a sei), e ognuno è indipendente: il suo traguardo, il suo posto, il suo aspetto. Tre obiettivi in fila che salgono insieme, o uno in ogni angolo con colori diversi: decidi tu.'] },
    { tabella: [
      ['Per ogni obiettivo', 'Di base', 'Limiti'],
      ['Conta', 'follower', 'follower · abbonati · bit'],
      ['Traguardo', '100', 'da 1 a 1.000.000'],
      ['Parte da', '0', 'il gradino sotto: «1000 follower» invece di «altri 1000»'],
      ['Titolo', 'vuoto', '60 caratteri'],
      ['Dove', 'in alto a sinistra', 'i quattro angoli, o dove lo trascini'],
      ['Aspetto', '—', 'colore del testo, dello sfondo e della barra, opacità, angoli, carattere, forma, materia, cornice, dimensione'],
    ] },
    { p: ['Due obiettivi che contano la stessa cosa <strong>salgono insieme</strong>: è il modo di fare una scala («100 follower», «500 follower») senza doverla rifare a mano. E ognuno si azzera per conto suo.'] },
    { p: ['<strong>«Quanti ne ho adesso»</strong> va a chiedere a Twitch il numero vero e lo mette come partenza: se hai 450 follower e metti 1000 di traguardo, la barra parte già quasi a metà. Per i <strong>bit</strong> non funziona, perché Twitch non tiene un totale di sempre — solo la classifica di un periodo: lì la partenza la scrivi tu.'] },
    { p: [
      '<strong>Il conto è quello vero</strong>: lo tiene il bot contando gli eventi che gli passano davanti. Un cheer da 500 bit vale 500, non 1.',
      'Sta nelle impostazioni del canale, quindi <strong>sopravvive a un riavvio</strong>: un obiettivo che si azzera da solo la notte non è un obiettivo. A rimetterlo a zero sei tu, col tasto «Riparti da zero» del singolo obiettivo.',
    ] },

    { h2: 'Il player' },
    { p: ['Quello che stai ascoltando, a schermo. Compare quando la musica parte e sparisce quando la fermi (o resta con un trattino, se preferisci). Legge da <strong>Spotify</strong>: si collega nella scheda <em>Richieste musicali</em>.'] },
    { tabella: [
      ['Scelta', 'Di base', 'Cosa puoi metterci'],
      ['Disposizione', 'copertina a sinistra', 'copertina a sinistra · a destra · sopra (poster) · solo la copertina'],
      ['Righe', 'una', 'una riga sola, oppure titolo sopra e artista sotto'],
      ['Copertina', 'quadrata', 'quadrata · tonda · vinile che gira mentre suona · niente'],
      ['Avanzamento', 'barra sotto', 'barra sotto · anello attorno alla copertina · niente'],
      ['Tempi', 'niente', 'trascorso · quanto manca · tutti e due'],
      ['Va a tempo', 'le onde', 'le onde sul battito vero del brano · anche la copertina che pulsa · niente'],
      ['Sfondo', 'niente', 'la copertina sfocata · i colori del disco che scorrono'],
      ['Colore', 'il tuo accento', 'oppure preso dai colori della copertina, disco per disco'],
      ['Titolo lungo', 'scorre', 'solo se non ci sta: si misura, non si indovina'],
      ['Entrata', 'dissolvenza', 'dissolvenza · scivola da lato · sale dal basso · secca'],
      ['A ogni brano', 'si rianima', 'la copertina rientra e il testo risale, come un cambio di scena'],
    ] },
    { p: ['<strong>Va a tempo davvero.</strong> Le onde non ballano a una velocità inventata: Spotify dice quanti battiti al minuto ha il brano, e da dove sei nella canzone si ricava la fase. Se un brano non ha quel dato, ballano come prima — nessun errore a schermo.'] },
    { p: ['Il testo è tuo: <code>{titolo}</code>, <code>{artista}</code> e <code>{album}</code> vengono sostituiti, su una riga o su due. E come ogni elemento ha colori, carattere, forma, materia, cornice, dimensione — e lo trascini dove vuoi.'] },

    { h2: 'Il conto alla rovescia' },
    { p: ['Quanto manca all\'inizio. Scegli i minuti e premi <strong>Fai partire</strong>: il conto sta nel canale, quindi anche se ricarichi l\'overlay o riavvii tutto continua da dove era. Quando arriva a zero scrive quello che vuoi tu — «Si comincia!» di base — e può restare o sparire.'] },

    { h2: 'I contatori' },
    { p: ['Sono i numeri che vivono in chat — <code>!morti</code>, <code>!tentativi</code> — e si creano in <em>Comandi</em>. Nell\'overlay sono un elemento come gli altri: si spengono tutti insieme dall\'elenco e prendono la veste della scena.'] },
    { p: ['Se a un contatore dai colore, sfondo o posizione tuoi, <strong>quelli vincono</strong>: la scena veste solo quello che non hai deciso.'] },
    { p: ['Nello Studio si trascinano come tutto il resto, e la dimensione che leggi in percentuale è la loro altezza vera: <strong>100%</strong> sono i 40 pixel di serie.'] },

    { h2: 'Ultimo follower e ultimo sub' },
    { p: ['Due pastiglie che restano a schermo. Il testo è tuo: <code>{nome}</code> viene sostituito col nome. L\'icona si può cambiare, togliere, o sostituire con un\'immagine caricata negli Effetti.'] },

    { h2: 'Quando non si vede niente' },
    { ul: [
      '<strong>La pagina è bianca o vuota in OBS.</strong> Controlla il link: senza la sua chiave l\'indirizzo risponde «non trovato», di proposito.',
      '<strong>Gli alert non partono.</strong> Servono i permessi di Twitch per follow, sub, bit e raid: si riautorizzano dalla scheda Stato. E l\'interruttore del singolo evento dev\'essere acceso, oltre a quello generale.',
      '<strong>Parte l\'alert ma non il suono.</strong> In OBS la sorgente Browser deve avere il <strong>«Controlla l\'audio via OBS»</strong>, altrimenti l\'audio esce dal browser e non dalla diretta.',
      '<strong>Vedo tutto doppio.</strong> Due sorgenti Browser con lo stesso link nella stessa scena: tienine una, o dai a ciascuna il suo overlay con i suoi elementi.',
      '<strong>La chat non compare.</strong> È spenta di base: si accende dal suo interruttore.',
      '<strong>L\'obiettivo resta a zero.</strong> Conta da quando l\'hai acceso: gli eventi di prima non tornano indietro.',
      '<strong>Ho spostato tutto e non mi piace più.</strong> Doppio clic su un elemento lo rimette dov\'era.',
    ] },
  ],
  faq: [
    { d: 'Serve installare un plugin in OBS?', r: 'No. È una pagina web: basta la sorgente Browser che OBS ha già.' },
    { d: 'Posso usare overlay diversi in scene diverse?', r: 'Sì, ed è il motivo per cui ognuno ha il suo link: elementi e stile sono suoi. Un «solo alert» sopra il gioco e un «solo chat» nella scena della pausa, per dire.' },
    { d: 'Se cambio qualcosa devo ricaricare OBS?', r: 'No: quello che cambi arriva subito. Ricaricare serve solo se hai chiuso e riaperto tutto.' },
    { d: 'Chi ha il link può fare danni?', r: 'Può far comparire cose nel tuo overlay, quindi non va condiviso. Non dà accesso al pannello né al tuo account.' },
    { d: 'L\'obiettivo conta anche a canale spento?', r: 'Conta gli eventi che arrivano, e i follow arrivano anche da offline. Se non li vuoi, si spegne e si riaccende quando serve.' },
    { d: 'Posso mettere l\'overlay in Streamlabs o in un altro programma?', r: 'Sì: va bene qualunque programma che sappia aprire una pagina web come sorgente.' },
  ],
};

export const MANUALI = [GIOCHI, MODULI, BOT, MODERAZIONE, INTERAZIONE, DIRETTA, VETRINA, ACCOUNT, EMOTE, OVERLAY];

// A QUALE SCHEDA DEL PANNELLO SERVE OGNI PAGINA.
//
// Non e' un elenco a parte: ogni guida e ogni manuale dichiara le schede a cui
// serve, accanto al proprio contenuto. Chi scrive una pagina nuova sa a chi
// serve — meglio di chiunque la legga sei mesi dopo — e il pannello la trova da
// se'. Il manuale vince sulla guida: chi e' gia' dentro il prodotto vuole il
// riferimento, non l'introduzione.
export function aiutiPerScheda() {
  const out = {};
  // Una guida si apre sulla sezione che parla del pannello, non dall'inizio:
  // chi la chiede da dentro vuole sapere cosa si fa QUI. Il pezzo di indirizzo
  // si ricava dal titolo di quella sezione, quindi non puo' puntare al nulla.
  const dentro = '#' + ancora(DENTRO);
  for (const g of GUIDE) {
    for (const s of g.schede || []) out[s] = { titolo: g.h1, via: `/guide/${g.slug}${dentro}`, tipo: 'guida' };
  }
  for (const m of MANUALI) {
    for (const s of m.schede || []) out[s] = { titolo: m.h1, via: `/manuale/${m.slug}`, tipo: 'manuale' };
  }
  return out;
}

export function paginaManuale(slug) {
  const m = MANUALI.find((x) => x.slug === slug);
  return m ? paginaDoc(m) : null;
}

export function paginaIndiceManuali() {
  return paginaManuali(MANUALI);
}

// Le voci per la sitemap: una fonte sola, come per le guide.
export function urlManuali(sito = 'https://socialbot.live') {
  return [
    { loc: `${sito}/manuale`, lastmod: MANUALI.map((m) => m.aggiornata).sort().pop(), freq: 'monthly', prio: '0.7' },
    ...MANUALI.map((m) => ({ loc: `${sito}/manuale/${m.slug}`, lastmod: m.aggiornata, freq: 'monthly', prio: '0.7' })),
  ];
}
